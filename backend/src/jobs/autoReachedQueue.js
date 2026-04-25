// backend/src/jobs/autoReachedQueue.js
// Auto-reached queue: keep /api/gps hot path thin, do the heavy stop-progress work off the request path.

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { getRedis } from "../redis/index.js";
import { createMiniRedisClient } from "../redis/miniRedis.js";
import { emitStopProgressNotifs } from "../notifications/stopProgressNotifs.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { buildRegionRoutingKey } from "../region/index.js";

const AUTO_REACHED_QUEUE_KEY = "gps:auto-reached:v1";
const AUTO_REACHED_PROCESSING_KEY = "gps:auto-reached:processing:v1";
const AUTO_REACHED_CLAIMS_HASH = "gps:auto-reached:claims:v1";
const AUTO_REACHED_CLAIMS_INDEX = "gps:auto-reached:claims:index:v1";
const AUTO_REACHED_DEAD_LETTER_KEY = "gps:auto-reached:dead:v1";
const AUTO_REACHED_LOCK_PREFIX = "gps:auto-reached:lock:v1";
const DEFAULT_LOCK_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_PROCESSING_TTL_MS = 15 * 60 * 1000;
const DEFAULT_RECLAIM_SWEEP_MS = 30 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

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

function makeQueueTaskId(task = {}) {
  if (task?.queueTaskId) return String(task.queueTaskId);
  if (task?.taskId) return String(task.taskId);
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${crypto.randomBytes(8).toString("hex")}`;
}

function normalizeQueueTask(task = {}) {
  const nowIso = new Date().toISOString();
  return {
    ...task,
    queueTaskId: makeQueueTaskId(task),
    queuedAtIso: String(task?.queuedAtIso || nowIso),
    attemptCount: Math.max(0, Math.trunc(Number(task?.attemptCount || 0)) || 0),
  };
}

function safeParseTask(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function clampQueueAttempts(value) {
  const n = Math.trunc(Number(value || 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function removeClaimState(redis, taskId) {
  try {
    await redis.send("HDEL", AUTO_REACHED_CLAIMS_HASH, String(taskId));
  } catch {
    // ignore
  }
  try {
    await redis.send("ZREM", AUTO_REACHED_CLAIMS_INDEX, String(taskId));
  } catch {
    // ignore
  }
}

async function rememberClaimState(redis, envelope, raw, claimedAtMs) {
  const record = {
    raw,
    claimedAtMs,
    queueTaskId: envelope.queueTaskId,
    attemptCount: clampQueueAttempts(envelope.attemptCount),
    lockKey: envelope.lockKey || null,
    lockToken: envelope.lockToken || null,
    lockTtlMs: Number(envelope.lockTtlMs || 0) || null,
  };
  await redis.send("HSET", AUTO_REACHED_CLAIMS_HASH, String(envelope.queueTaskId), JSON.stringify(record));
  await redis.send("ZADD", AUTO_REACHED_CLAIMS_INDEX, String(claimedAtMs), String(envelope.queueTaskId));
}

async function clearProcessingState(redis, envelope, raw) {
  if (raw) {
    try {
      await redis.send("LREM", AUTO_REACHED_PROCESSING_KEY, "1", raw);
    } catch {
      // ignore
    }
  }
  await removeClaimState(redis, envelope.queueTaskId);
  if (envelope.lockKey) {
    try {
      await redis.send("DEL", envelope.lockKey);
    } catch {
      // ignore
    }
  }
}

async function removeProcessingState(redis, envelope, raw) {
  if (raw) {
    try {
      await redis.send("LREM", AUTO_REACHED_PROCESSING_KEY, "1", raw);
    } catch {
      // ignore
    }
  }
  await removeClaimState(redis, envelope.queueTaskId);
}

async function moveToDeadLetter(redis, envelope, raw, reason) {
  const payload = {
    ...envelope,
    deadLetteredAtIso: new Date().toISOString(),
    deadLetterReason: String(reason || "UNKNOWN"),
  };
  try {
    await redis.send("LPUSH", AUTO_REACHED_DEAD_LETTER_KEY, JSON.stringify(payload));
    await redis.send("LTRIM", AUTO_REACHED_DEAD_LETTER_KEY, "0", "199");
  } catch {
    // ignore
  }
  await clearProcessingState(redis, envelope, raw);
}

async function requeueFromProcessing(redis, envelope, raw, reason, maxAttempts) {
  const currentAttempts = clampQueueAttempts(envelope.attemptCount);
  const nextAttempts = currentAttempts + 1;
  if (nextAttempts >= maxAttempts) {
    await moveToDeadLetter(redis, { ...envelope, attemptCount: nextAttempts }, raw, reason || "MAX_ATTEMPTS");
    return { action: "dead-letter" };
  }

  const nowIso = new Date().toISOString();
  const nextEnvelope = normalizeQueueTask({
    ...envelope,
    attemptCount: nextAttempts,
    queuedAtIso: nowIso,
    requeuedAtIso: nowIso,
    lastRequeueReason: String(reason || "RECLAIM"),
  });

  try {
    await redis.send("LPUSH", AUTO_REACHED_QUEUE_KEY, JSON.stringify(nextEnvelope));
  } catch (e) {
    throw e;
  }

  await removeProcessingState(redis, envelope, raw);
  return { action: "requeued" };
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

  const envelope = normalizeQueueTask(task);
  const lockTtlMs = Math.max(60_000, Number(opts.lockTtlMs ?? ENV.AUTO_REACHED_LOCK_TTL_MS ?? DEFAULT_LOCK_TTL_MS));
  const lockKey = makeLockKey(envelope.shiftId, envelope.stopId);
  const lockToken = `${envelope.shiftId}:${envelope.stopId}:${envelope.queueTaskId}:${envelope.atIso ?? Date.now()}`;

  try {
    const acquired = await redis.send("SET", lockKey, lockToken, "NX", "PX", String(lockTtlMs));
    if (String(acquired || "").toUpperCase() !== "OK") {
      return { ok: true, queued: false, deduped: true };
    }

    const payload = {
      ...envelope,
      lockKey,
      lockToken,
      lockTtlMs,
    };

    await redis.send("LPUSH", AUTO_REACHED_QUEUE_KEY, JSON.stringify(payload));
    return { ok: true, queued: true, taskId: envelope.queueTaskId };
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
  const controlRedis = createMiniRedisClient(redisUrl);
  const processingTtlMs = Math.max(60_000, Number(opts.processingTtlMs ?? ENV.AUTO_REACHED_PROCESSING_TTL_MS ?? DEFAULT_PROCESSING_TTL_MS));
  const reclaimSweepMs = Math.max(10_000, Number(opts.reclaimSweepMs ?? ENV.AUTO_REACHED_RECLAIM_SWEEP_MS ?? DEFAULT_RECLAIM_SWEEP_MS));
  const maxAttempts = Math.max(1, Math.trunc(Number(opts.maxAttempts ?? ENV.AUTO_REACHED_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS)) || DEFAULT_MAX_ATTEMPTS);
  let closed = false;
  let reclaimTimer = null;
  let reclaimBusy = false;
  const activeTasks = new Set();
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const reclaimStaleClaims = async () => {
    if (closed || reclaimBusy) return;
    reclaimBusy = true;
    try {
      const cutoff = Date.now() - processingTtlMs;
      const staleIds = await controlRedis.send(
        "ZRANGEBYSCORE",
        AUTO_REACHED_CLAIMS_INDEX,
        "-inf",
        String(cutoff),
        "LIMIT",
        "0",
        "25"
      );
      const ids = Array.isArray(staleIds) ? staleIds : [];
      for (const taskId of ids) {
        if (closed) break;
        const raw = await controlRedis.send("HGET", AUTO_REACHED_CLAIMS_HASH, String(taskId));
        if (!raw) {
          await removeClaimState(controlRedis, taskId);
          continue;
        }

        const envelope = safeParseTask(raw);
        if (!envelope) {
          await moveToDeadLetter(controlRedis, normalizeQueueTask({ queueTaskId: taskId }), raw, "PARSE_STALE_CLAIM");
          continue;
        }

        await requeueFromProcessing(controlRedis, normalizeQueueTask(envelope), raw, "STALE_CLAIM", maxAttempts);
      }
    } catch (e) {
      if (!closed) {
        console.error("autoReachedQueue reclaim error:", e);
      }
    } finally {
      reclaimBusy = false;
    }
  };

  const scheduleReclaim = () => {
    if (closed) return;
    if (reclaimTimer) return;
    reclaimTimer = setTimeout(async () => {
      reclaimTimer = null;
      await reclaimStaleClaims();
      scheduleReclaim();
    }, reclaimSweepMs);
    reclaimTimer.unref?.();
  };

  const loop = async () => {
    scheduleReclaim();
    while (!closed) {
      let item = null;
      try {
        item = await queueRedis.send("BRPOPLPUSH", AUTO_REACHED_QUEUE_KEY, AUTO_REACHED_PROCESSING_KEY, "1");
      } catch (e) {
        if (!closed) {
          console.error("autoReachedQueue BRPOPLPUSH error:", e);
        }
        await pause(1000);
        continue;
      }

      if (closed) break;
      if (!item) continue;

      const raw = typeof item === "string" ? item : Array.isArray(item) ? item[item.length - 1] : null;
      if (!raw) continue;

      let task = null;
      try {
        task = safeParseTask(raw);
      } catch (_e) {
        task = null;
      }

      if (!task) {
        console.error("autoReachedQueue parse error:", raw.slice(0, 200));
        try {
          await controlRedis.send("LREM", AUTO_REACHED_PROCESSING_KEY, "1", raw);
        } catch {
          // ignore
        }
        continue;
      }

      task = normalizeQueueTask(task);
      activeTasks.add(task.queueTaskId);

      try {
        await rememberClaimState(controlRedis, task, raw, Date.now());
      } catch (e) {
        console.error("autoReachedQueue claim record error:", e);
        try {
          await controlRedis.send("LREM", AUTO_REACHED_PROCESSING_KEY, "1", raw);
        } catch {
          // ignore
        }
        try {
          await controlRedis.send("LPUSH", AUTO_REACHED_QUEUE_KEY, raw);
        } catch {
          // ignore
        }
        activeTasks.delete(task.queueTaskId);
        continue;
      }

      try {
        await processAutoReachedTask(io, task);
        await clearProcessingState(controlRedis, task, raw);
      } catch (e) {
        console.error("autoReachedQueue task error:", e);
        try {
          await controlRedis.send("HSET", AUTO_REACHED_CLAIMS_HASH, String(task.queueTaskId), JSON.stringify({
            raw,
            claimedAtMs: Date.now() - processingTtlMs - 1,
            queueTaskId: task.queueTaskId,
            attemptCount: clampQueueAttempts(task.attemptCount),
            lockKey: task.lockKey || null,
            lockToken: task.lockToken || null,
            lockTtlMs: Number(task.lockTtlMs || 0) || null,
          }));
          await controlRedis.send("ZADD", AUTO_REACHED_CLAIMS_INDEX, String(Date.now() - processingTtlMs - 1), String(task.queueTaskId));
        } catch {
          // ignore
        }
      }

      activeTasks.delete(task.queueTaskId);
    }
  };

  void loop();

  return () => {
    closed = true;
    if (reclaimTimer) {
      clearTimeout(reclaimTimer);
      reclaimTimer = null;
    }
    try {
      queueRedis.quit();
    } catch {
      // ignore
    }
    try {
      controlRedis.quit();
    } catch {
      // ignore
    }
    if (workerPrisma !== prisma) {
      void workerPrisma.$disconnect().catch(() => {});
    }
  };
}
