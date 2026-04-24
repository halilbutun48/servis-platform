// backend/src/jobs/autoReachedQueue.js
// Auto-reached queue: keep /api/gps hot path thin, do the heavy stop-progress work off the request path.

import { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { getRedis } from "../redis/index.js";
import { createMiniRedisClient } from "../redis/miniRedis.js";
import { emitStopProgressNotifs } from "../notifications/stopProgressNotifs.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { buildRegionRoutingKey } from "../region/index.js";

const AUTO_REACHED_QUEUE_KEY = "gps:auto-reached:v1";
const AUTO_REACHED_LOCK_PREFIX = "gps:auto-reached:lock:v1";
const DEFAULT_LOCK_TTL_MS = 2 * 60 * 60 * 1000;

function buildWorkerDatabaseUrl() {
  const base = String(process.env.DATABASE_URL || ENV.DATABASE_URL || "").trim();
  if (!base) return null;

  try {
    const u = new URL(base);
    u.searchParams.set("connection_limit", "1");
    u.searchParams.set("pool_timeout", "5");
    return u.toString();
  } catch {
    return base;
  }
}

const workerDatabaseUrl = buildWorkerDatabaseUrl();
const workerPrisma =
  workerDatabaseUrl && workerDatabaseUrl !== String(process.env.DATABASE_URL || ENV.DATABASE_URL || "").trim()
    ? new PrismaClient({ datasources: { db: { url: workerDatabaseUrl } } })
    : prisma;

function toInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function makeLockKey(shiftId, stopId) {
  return `${AUTO_REACHED_LOCK_PREFIX}:shift:${shiftId}:stop:${stopId}`;
}

async function audit(prismaClient, { actorUserId, actorRole, action, entity, entityId, meta }) {
  try {
    await prismaClient.auditLog.create({
      data: {
        actorUserId,
        actorRole,
        action,
        entity,
        entityId,
        meta: meta ?? undefined,
      },
    });
  } catch {
    // never block the queue on audit failures
  }
}

export async function enqueueAutoReachedTask(task, opts = {}) {
  const redis = getRedis();
  if (!redis?.send) return { ok: false, reason: "REDIS_UNAVAILABLE" };

  const lockTtlMs = Math.max(60_000, Number(opts.lockTtlMs ?? ENV.AUTO_REACHED_LOCK_TTL_MS ?? DEFAULT_LOCK_TTL_MS));
  const lockKey = makeLockKey(task.shiftId, task.stopId);
  const lockToken = `${task.shiftId}:${task.stopId}:${task.atIso ?? Date.now()}`;

  try {
    const acquired = await redis.send("SET", lockKey, lockToken, "NX", "PX", String(lockTtlMs));
    if (String(acquired || "").toUpperCase() !== "OK") {
      return { ok: true, queued: false, deduped: true };
    }

    await redis.send("LPUSH", AUTO_REACHED_QUEUE_KEY, JSON.stringify({ ...task, lockKey, lockToken, lockTtlMs }));
    return { ok: true, queued: true };
  } catch (e) {
    try {
      await redis.send("DEL", lockKey);
    } catch {
      // ignore
    }
    return { ok: false, error: e };
  }
}

export async function processAutoReachedTask(io, task) {
  const shiftId = toInt(task?.shiftId);
  const stopId = toInt(task?.stopId);
  const vehicleId = toInt(task?.vehicleId);
  if (!shiftId || !stopId || !vehicleId) return false;

  const stopOrder = Number(task?.stopOrder ?? task?.stop?.order ?? 0);
  const lastReachedOrder = Math.max(0, Number(task?.lastReachedOrder ?? stopOrder));
  const shiftSnapshot = task?.shiftSnapshot ?? null;
  const stopsSnapshot = Array.isArray(task?.stopsSnapshot) ? task.stopsSnapshot : null;
  const vehicleSnapshot = task?.vehicleSnapshot ?? null;
  const gpsLastSnapshot = task?.gpsLastSnapshot ?? null;
  const regionRoutingKey =
    task?.regionRoutingKey ??
    buildRegionRoutingKey(shiftSnapshot ?? {}) ??
    buildRegionRoutingKey(vehicleSnapshot ?? {}) ??
    null;
  const regionContext = task?.regionContext ?? null;
  const completed = task?.completed === true;
  const now2 = task?.atIso ? new Date(task.atIso) : new Date();

  const currentStop = await workerPrisma.stop.findUnique({
    where: { id: stopId },
    select: { id: true, state: true, order: true, name: true, lat: true, lng: true },
  });
  if (!currentStop || currentStop.state !== "PENDING") {
    return false;
  }

  const stopForNotif = {
    id: currentStop.id,
    order: Number.isFinite(stopOrder) && stopOrder > 0 ? stopOrder : currentStop.order,
    state: "REACHED",
  };

  const nextPending = Array.isArray(stopsSnapshot)
    ? stopsSnapshot.find((s) => Number(s?.id) !== stopId && String(s?.state ?? "") === "PENDING") ?? null
    : null;

  await Promise.all([
    workerPrisma.shift.updateMany({ where: { id: shiftId, status: "APPROVED" }, data: { status: "ACTIVE" } }),
    workerPrisma.stop.update({
      where: { id: stopId },
      data: { state: "REACHED", reachedAt: now2, skippedAt: null },
    }),
    audit(prisma, {
      actorUserId: null,
      actorRole: "SYSTEM",
      action: "AUTO_STOP_REACHED",
      entity: "Shift",
      entityId: shiftId,
      meta: { stopId, vehicleId, source: "AUTO_GEOFENCE" },
    }),
    workerPrisma.shiftProgress.upsert({
      where: { shiftId },
      update: { pausedAt: null, startedAt: now2, lastReachedOrder },
      create: { shiftId, lastReachedOrder, startedAt: now2, pausedAt: null },
    }),
  ]);

  const payload = {
    shiftId,
    vehicleId,
    nextStop: nextPending,
    completed,
    changed: { stopId, state: "REACHED", reachedAt: now2 },
    source: "AUTO_GEOFENCE",
    regionRoutingKey,
    regionContext,
  };

  io.to(`shift:${shiftId}`).emit("route:progress", payload);
  if (shiftSnapshot?.roomId) io.to(`room:${shiftSnapshot.roomId}`).emit("route:progress", payload);
  if (shiftSnapshot?.companyId) io.to(`company:${shiftSnapshot.companyId}`).emit("route:progress", payload);
  io.to(`vehicle:${vehicleId}`).emit("route:progress", payload);

  await emitStopProgressNotifs({
    io,
    shiftId,
    stop: stopForNotif,
    state: "REACHED",
    source: "AUTO_GEOFENCE",
    prismaClient: workerPrisma,
    shiftSnapshot: shiftSnapshot
      ? {
          id: shiftId,
          companyId: shiftSnapshot.companyId ?? null,
          roomId: shiftSnapshot.roomId ?? null,
          vehicleId: shiftSnapshot.vehicleId ?? vehicleId,
          startAt: shiftSnapshot.startAt ?? null,
        }
      : null,
    stopsSnapshot,
    vehicleSnapshot,
    gpsLastSnapshot,
  });

  if (completed) {
    const donePayload = { shiftId, vehicleId, completed: true, nextStop: null, source: "AUTO_GEOFENCE" };
    donePayload.regionRoutingKey = regionRoutingKey;
    donePayload.regionContext = regionContext;
    await Promise.all([
      workerPrisma.shiftProgress.upsert({
        where: { shiftId },
        update: { completedAt: now2, lastReachedOrder },
        create: { shiftId, lastReachedOrder, completedAt: now2 },
      }),
      workerPrisma.shift.update({ where: { id: shiftId }, data: { status: "DONE" } }),
      audit(prisma, {
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "AUTO_SHIFT_COMPLETE",
        entity: "Shift",
        entityId: shiftId,
        meta: { vehicleId, source: "AUTO_GEOFENCE" },
      }),
    ]);

    io.to(`shift:${shiftId}`).emit("route:progress", donePayload);
    if (shiftSnapshot?.roomId) io.to(`room:${shiftSnapshot.roomId}`).emit("route:progress", donePayload);
    if (shiftSnapshot?.companyId) io.to(`company:${shiftSnapshot.companyId}`).emit("route:progress", donePayload);
    io.to(`vehicle:${vehicleId}`).emit("route:progress", donePayload);
  }

  // ETA is intentionally off the hot request path. It is still emitted, but after the stop-progress work.
  const shifts = await workerPrisma.shift.findMany({
    where: { vehicleId, status: { in: ["APPROVED", "ACTIVE"] } },
    include: {
      progress: { select: { pausedAt: true } },
      stops: { orderBy: { order: "asc" } },
    },
  });

  const speedKmh = typeof task?.speed === "number" ? task.speed : 30;
  const gpsAt = gpsLastSnapshot?.at ?? now2;

  for (const sh of shifts) {
    if (sh.progress?.pausedAt) continue;
    if (!sh.stops?.length) continue;

    const remainingStops = sh.stops.filter((s) => s.state === "PENDING");
    if (!remainingStops.length) continue;

    const items = remainingStops.map((s) => {
      const km = haversineKm(Number(task?.lat ?? gpsLastSnapshot?.lat ?? 0), Number(task?.lng ?? gpsLastSnapshot?.lng ?? 0), s.lat, s.lng);
      return {
        id: s.id,
        name: s.name,
        order: s.order,
        remainingKm: Number(km.toFixed(2)),
        etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
      };
    });

    const etaPayload = { shiftId: sh.id, vehicleId, at: gpsAt, stops: items };
    io.to(`vehicle:${vehicleId}`).emit("eta:update", etaPayload);
    if (sh.roomId) io.to(`room:${sh.roomId}`).emit("eta:update", etaPayload);
    if (sh.companyId) io.to(`company:${sh.companyId}`).emit("eta:update", etaPayload);
  }

  return true;
}

export function startAutoReachedQueueWorker(io, opts = {}) {
  const redisUrl = String(opts.redisUrl || ENV.REDIS_URL || "").trim();
  if (!redisUrl) return () => {};

  const queueRedis = createMiniRedisClient(redisUrl);
  let closed = false;
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const loop = async () => {
    while (!closed) {
      let item = null;
      try {
        item = await queueRedis.send("BRPOP", AUTO_REACHED_QUEUE_KEY, "1");
      } catch (e) {
        if (!closed) {
          console.error("autoReachedQueue BRPOP error:", e);
        }
        await pause(1000);
        continue;
      }

      if (closed) break;
      if (!item) continue;

      const raw = Array.isArray(item) ? item[1] : null;
      if (!raw) continue;

      let task = null;
      try {
        task = JSON.parse(raw);
      } catch (e) {
        console.error("autoReachedQueue parse error:", e);
        continue;
      }

      try {
        await processAutoReachedTask(io, task);
        if (task?.lockKey) {
          try {
            await queueRedis.send("DEL", task.lockKey);
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.error("autoReachedQueue task error:", e);
        try {
          await queueRedis.send("LPUSH", AUTO_REACHED_QUEUE_KEY, raw);
        } catch {
          // ignore
        }
      }
    }
  };

  void loop();

  return () => {
    closed = true;
    try {
      queueRedis.quit();
    } catch {
      // ignore
    }
    if (workerPrisma !== prisma) {
      void workerPrisma.$disconnect().catch(() => {});
    }
  };
}
