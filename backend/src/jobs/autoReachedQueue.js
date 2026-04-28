// backend/src/jobs/autoReachedQueue.js
// Auto-reached queue: keep /api/gps hot path thin, do the heavy stop-progress work off the request path.

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { getRedis } from "../redis/index.js";
import { createMiniRedisClient } from "../redis/miniRedis.js";
import { createAndEmitNotification, createNotification } from "../notifications/service.js";
import { emitStopProgressNotifs } from "../notifications/stopProgressNotifs.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { buildRegionRoutingKey } from "../region/index.js";
import logger from "../lib/logger.js";

const AUTO_REACHED_QUEUE_KEY = "gps:auto-reached:v1";
const AUTO_REACHED_PROCESSING_KEY = "gps:auto-reached:processing:v1";
const AUTO_REACHED_CLAIMS_HASH = "gps:auto-reached:claims:v1";
const AUTO_REACHED_CLAIMS_INDEX = "gps:auto-reached:claims:index:v1";
const AUTO_REACHED_DEAD_LETTER_KEY = "gps:auto-reached:dead:v1";
const AUTO_REACHED_LOCK_PREFIX = "gps:auto-reached:lock:v1";
const AUTO_REACHED_INCIDENT_NOTIFICATION_TYPE = "AUTO_REACHED_QUEUE_INCIDENT";
const AUTO_REACHED_RECOVERY_NOTIFICATION_TYPE = "AUTO_REACHED_QUEUE_RECOVERY";
const DEFAULT_LOCK_TTL_MS = 2 * 60 * 60 * 1000;
const DEFAULT_PROCESSING_TTL_MS = 15 * 60 * 1000;
const DEFAULT_RECLAIM_SWEEP_MS = 30 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

const queueRuntime = {
  startedAtIso: new Date().toISOString(),
  workerPid: process.pid,
  closed: true,
  activeTasks: 0,
  peakActiveTasks: 0,
  totalDequeued: 0,
  totalHandled: 0,
  totalRequeued: 0,
  totalDeadLettered: 0,
  totalParseErrors: 0,
  totalClaimRecordErrors: 0,
  totalTaskErrors: 0,
  lastDequeuedAtIso: null,
  lastHandledAtIso: null,
  lastReclaimAtIso: null,
  lastRequeuedAtIso: null,
  lastDeadLetteredAtIso: null,
  lastErrorAtIso: null,
  lastErrorMessage: null,
  lastDequeuedTaskId: null,
  lastHandledTaskId: null,
  lastRequeuedTaskId: null,
  lastDeadLetteredTaskId: null,
};

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

function buildQueueIncidentRecommendations(codes = []) {
  const codeSet = new Set((Array.isArray(codes) ? codes : []).map((code) => String(code || "")));
  if (codeSet.has("REDIS_NOT_CONNECTED")) {
    return [
      "Redis bağlantısını ve worker sürecini kontrol et.",
      "GPS ingest tarafında queue fallback davranışını izle.",
      "Gerekirse dead-letter/reclaim sweep sonrasında worker restart uygula.",
    ];
  }
  if (codeSet.has("DEAD_LETTER_DEPTH_HIGH")) {
    return [
      "Dead-letter kayıtlarını incele.",
      "Uygun kayıtları kontrollü requeue et veya resolve et.",
      "Poison job tekrarı varsa attempt limitini ve iş verisini kontrol et.",
    ];
  }
  if (codeSet.has("OLDEST_CLAIM_STALE")) {
    return [
      "Worker reclaim sweep gecikmesini kontrol et.",
      "Aynı task için processing listesi ve claims index uyumunu doğrula.",
      "Stale claim varsa worker restart / reclaim drill notla.",
    ];
  }
  if (codeSet.has("QUEUE_DEPTH_HIGH") || codeSet.has("PROCESSING_DEPTH_HIGH") || codeSet.has("CLAIMS_DEPTH_HIGH")) {
    return [
      "Backlog ve processing yükünü izle.",
      "Worker kapasitesi ile ingest hızı arasındaki farkı ölç.",
      "Alarm seviyesini gerekiyorsa operasyon ekibine ilet.",
    ];
  }
  return ["Queue sağlıklı; gözlemlemeye devam et."];
}

function extractDeadLetterTaskId(parsed = {}) {
  const candidate = parsed?.queueTaskId ?? parsed?.taskId ?? parsed?.id ?? null;
  const normalized = String(candidate || "").trim();
  return normalized || null;
}

function buildDeadLetterReplayEnvelope(parsed = {}) {
  const nowIso = new Date().toISOString();
  const next = normalizeQueueTask({
    ...parsed,
    attemptCount: clampQueueAttempts(parsed?.attemptCount) + 1,
    queuedAtIso: nowIso,
    requeuedAtIso: nowIso,
    lastRequeueReason: "DEAD_LETTER_REPLAY",
  });
  delete next.deadLetteredAtIso;
  delete next.deadLetterReason;
  return next;
}

function buildParseDeadLetterEnvelope(raw = "") {
  const nowIso = new Date().toISOString();
  const rawText = String(raw || "");
  const rawHash = crypto.createHash("sha256").update(rawText).digest("hex").slice(0, 16);
  return {
    queueTaskId: `PARSE:${rawHash}`,
    attemptCount: 0,
    queuedAtIso: nowIso,
    deadLetteredAtIso: nowIso,
    deadLetterReason: "PARSE_INVALID_JSON",
    replayable: false,
    rawPreview: rawText.slice(0, 500),
    rawLength: rawText.length,
  };
}

function isAutoReachedInvalidTaskError(error) {
  const code = String(error?.code || error?.message || "").trim();
  return code === "AUTO_REACHED_INVALID_TASK";
}

function buildAutoReachedQueueNotificationPayload({ proof, incident, phase, createdAtIso }) {
  const health = proof?.health ?? {};
  const queue = health?.queue ?? {};
  const deadLetter = proof?.deadLetter ?? {};
  const threshold = proof?.threshold ?? {};
  return {
    kind: "auto-reached-queue",
    phase,
    severity: incident?.severity || "OK",
    title: incident?.title || "Queue sağlıklı",
    warnings: Array.isArray(threshold?.warnings) ? threshold.warnings : [],
    recommendedActions: Array.isArray(incident?.recommendedActions) ? incident.recommendedActions : [],
    chaosDrills: Array.isArray(incident?.chaosDrills) ? incident.chaosDrills : [],
    health: {
      redisConnected: Boolean(health.redisConnected),
      queueDepth: Number(queue.queueDepth ?? 0),
      processingDepth: Number(queue.processingDepth ?? 0),
      claimsDepth: Number(queue.claimsDepth ?? 0),
      deadLetterDepth: Number(queue.deadLetterDepth ?? 0),
      oldestClaimAgeMs: queue.oldestClaimAgeMs ?? null,
    },
    threshold,
    deadLetter: {
      depth: Number(deadLetter.depth ?? 0),
      total: Number(deadLetter.total ?? 0),
      items: Array.isArray(deadLetter.items) ? deadLetter.items.slice(0, 5) : [],
    },
    proof,
    createdAtIso,
  };
}

export async function syncAutoReachedQueueIncidentNotifications({ io = null, prismaClient = prisma, includeRecovery = true } = {}) {
  const proof = await getAutoReachedQueueProofSnapshot();
  const incident = proof?.incident || buildAutoReachedQueueIncidentSnapshot(proof?.health || {});
  const severity = String(incident?.severity || "OK").toUpperCase();
  const phase = severity === "OK" ? "RECOVERY" : "INCIDENT";
  if (phase === "RECOVERY" && includeRecovery !== true) {
    return {
      ok: true,
      synced: 0,
      phase,
      severity,
      proof,
      incident,
    };
  }

  const users = await prismaClient.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, fullName: true },
    orderBy: [{ id: "asc" }],
  });

  const payload = buildAutoReachedQueueNotificationPayload({
    proof,
    incident,
    phase,
    createdAtIso: new Date().toISOString(),
  });

  const notificationType = phase === "RECOVERY" ? AUTO_REACHED_RECOVERY_NOTIFICATION_TYPE : AUTO_REACHED_INCIDENT_NOTIFICATION_TYPE;
  const created = [];
  for (const user of users) {
    const dedupeKey = `AUTO_REACHED_QUEUE_STATE:${user.id}:${notificationType}`;
    const createdRow = io
      ? await createAndEmitNotification({
          io,
          type: notificationType,
          scope: "USER",
          userId: user.id,
          payload,
          dedupeKey,
          prismaClient,
        })
      : await createNotification({
          type: notificationType,
          scope: "USER",
          userId: user.id,
          payload,
          dedupeKey,
          prismaClient,
        });
    created.push(createdRow);
  }

  return {
    ok: true,
    synced: created.length,
    phase,
    severity,
    notificationType,
    users: users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName })),
    proof,
    incident,
  };
}

function syncActiveTasks(activeTasks) {
  queueRuntime.activeTasks = Math.max(0, Number(activeTasks?.size || 0));
  if (queueRuntime.activeTasks > queueRuntime.peakActiveTasks) {
    queueRuntime.peakActiveTasks = queueRuntime.activeTasks;
  }
}

function noteQueueError(error) {
  queueRuntime.lastErrorAtIso = new Date().toISOString();
  queueRuntime.lastErrorMessage = String(error?.message || error || "UNKNOWN_ERROR");
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
  queueRuntime.totalDeadLettered += 1;
  queueRuntime.lastDeadLetteredAtIso = new Date().toISOString();
  queueRuntime.lastDeadLetteredTaskId = String(envelope.queueTaskId || "");
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
  queueRuntime.totalRequeued += 1;
  queueRuntime.lastRequeuedAtIso = nowIso;
  queueRuntime.lastRequeuedTaskId = String(envelope.queueTaskId || "");
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

export function getAutoReachedQueueRuntimeSnapshot() {
  return {
    startedAtIso: queueRuntime.startedAtIso,
    workerPid: queueRuntime.workerPid,
    closed: queueRuntime.closed,
    activeTasks: queueRuntime.activeTasks,
    peakActiveTasks: queueRuntime.peakActiveTasks,
    totalDequeued: queueRuntime.totalDequeued,
    totalHandled: queueRuntime.totalHandled,
    totalRequeued: queueRuntime.totalRequeued,
    totalDeadLettered: queueRuntime.totalDeadLettered,
    totalParseErrors: queueRuntime.totalParseErrors,
    totalClaimRecordErrors: queueRuntime.totalClaimRecordErrors,
    totalTaskErrors: queueRuntime.totalTaskErrors,
    lastDequeuedAtIso: queueRuntime.lastDequeuedAtIso,
    lastHandledAtIso: queueRuntime.lastHandledAtIso,
    lastReclaimAtIso: queueRuntime.lastReclaimAtIso,
    lastRequeuedAtIso: queueRuntime.lastRequeuedAtIso,
    lastDeadLetteredAtIso: queueRuntime.lastDeadLetteredAtIso,
    lastErrorAtIso: queueRuntime.lastErrorAtIso,
    lastErrorMessage: queueRuntime.lastErrorMessage,
    lastDequeuedTaskId: queueRuntime.lastDequeuedTaskId,
    lastHandledTaskId: queueRuntime.lastHandledTaskId,
    lastRequeuedTaskId: queueRuntime.lastRequeuedTaskId,
    lastDeadLetteredTaskId: queueRuntime.lastDeadLetteredTaskId,
  };
}

export async function getAutoReachedQueueHealthSnapshot(opts = {}) {
  const redis = opts.redis || getRedis();
  const connected = Boolean(redis?.connected);
  const config = {
    lockTtlMs: Math.max(60_000, Number(opts.lockTtlMs ?? ENV.AUTO_REACHED_LOCK_TTL_MS ?? DEFAULT_LOCK_TTL_MS)),
    processingTtlMs: Math.max(60_000, Number(opts.processingTtlMs ?? ENV.AUTO_REACHED_PROCESSING_TTL_MS ?? DEFAULT_PROCESSING_TTL_MS)),
    reclaimSweepMs: Math.max(10_000, Number(opts.reclaimSweepMs ?? ENV.AUTO_REACHED_RECLAIM_SWEEP_MS ?? DEFAULT_RECLAIM_SWEEP_MS)),
    maxAttempts: Math.max(1, Math.trunc(Number(opts.maxAttempts ?? ENV.AUTO_REACHED_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS)) || DEFAULT_MAX_ATTEMPTS),
  };

  const snapshot = {
    ok: true,
    capturedAt: new Date().toISOString(),
    redisAvailable: Boolean(redis?.send),
    redisConnected: connected,
    config,
    runtime: getAutoReachedQueueRuntimeSnapshot(),
    queue: {
      key: AUTO_REACHED_QUEUE_KEY,
      processingKey: AUTO_REACHED_PROCESSING_KEY,
      claimsHashKey: AUTO_REACHED_CLAIMS_HASH,
      claimsIndexKey: AUTO_REACHED_CLAIMS_INDEX,
      deadLetterKey: AUTO_REACHED_DEAD_LETTER_KEY,
      queueDepth: null,
      processingDepth: null,
      claimsDepth: null,
      claimsIndexDepth: null,
      deadLetterDepth: null,
      oldestClaimTaskId: null,
      oldestClaimAtMs: null,
      oldestClaimAgeMs: null,
    },
    notes: [
      "queueDepth backlog'u gösterir; processingDepth claim altında çalışan işleri gösterir.",
      "claimsDepth ve claimsIndexDepth stale reclaim/gözetim sınırını izlemek içindir.",
      "deadLetterDepth poison job birikimini, oldestClaimAgeMs ise reclaim gecikmesini gösterir.",
    ],
  };

  if (!redis?.send) return snapshot;

  try {
    const [queueDepth, processingDepth, claimsDepth, claimsIndexDepth, deadLetterDepth, oldestClaim] = await Promise.all([
      redis.send("LLEN", AUTO_REACHED_QUEUE_KEY),
      redis.send("LLEN", AUTO_REACHED_PROCESSING_KEY),
      redis.send("HLEN", AUTO_REACHED_CLAIMS_HASH),
      redis.send("ZCARD", AUTO_REACHED_CLAIMS_INDEX),
      redis.send("LLEN", AUTO_REACHED_DEAD_LETTER_KEY),
      redis.send("ZRANGE", AUTO_REACHED_CLAIMS_INDEX, "0", "0", "WITHSCORES"),
    ]);

    snapshot.queue.queueDepth = Number(queueDepth || 0);
    snapshot.queue.processingDepth = Number(processingDepth || 0);
    snapshot.queue.claimsDepth = Number(claimsDepth || 0);
    snapshot.queue.claimsIndexDepth = Number(claimsIndexDepth || 0);
    snapshot.queue.deadLetterDepth = Number(deadLetterDepth || 0);

    const oldest = Array.isArray(oldestClaim) ? oldestClaim : [];
    if (oldest.length >= 2) {
      const taskId = String(oldest[0] || "");
      const atMs = Number(oldest[1] || 0);
      if (taskId) snapshot.queue.oldestClaimTaskId = taskId;
      if (Number.isFinite(atMs) && atMs > 0) {
        snapshot.queue.oldestClaimAtMs = atMs;
        snapshot.queue.oldestClaimAgeMs = Math.max(0, Date.now() - atMs);
      }
    }
  } catch (error) {
    snapshot.ok = false;
    snapshot.redisAvailable = Boolean(redis?.send);
    snapshot.error = String(error?.message || error || "QUEUE_HEALTH_UNAVAILABLE");
  }

  return snapshot;
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
  if (!shiftId || !stopId || !vehicleId) {
    const err = new Error("AUTO_REACHED_INVALID_TASK");
    err.code = "AUTO_REACHED_INVALID_TASK";
    err.details = {
      shiftId,
      stopId,
      vehicleId,
      queueTaskId: String(task?.queueTaskId || ""),
    };
    throw err;
  }

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
  queueRuntime.closed = false;
  queueRuntime.workerPid = process.pid;
  queueRuntime.startedAtIso = queueRuntime.startedAtIso || new Date().toISOString();

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
      if (ids.length) {
        queueRuntime.lastReclaimAtIso = new Date().toISOString();
      }
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
        logger.error("autoReachedQueue reclaim error:", e);
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
          logger.error("autoReachedQueue BRPOPLPUSH error:", e);
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
        logger.error("autoReachedQueue parse error:", raw.slice(0, 200));
        queueRuntime.totalParseErrors += 1;
        noteQueueError("autoReachedQueue parse error");
        try {
          const parseDeadLetter = buildParseDeadLetterEnvelope(raw);
          await moveToDeadLetter(controlRedis, parseDeadLetter, raw, "PARSE_INVALID_JSON");
        } catch {
          // ignore
        }
        activeTasks.delete(String(item?.queueTaskId || ""));
        syncActiveTasks(activeTasks);
        continue;
      }

      task = normalizeQueueTask(task);
      activeTasks.add(task.queueTaskId);
      queueRuntime.totalDequeued += 1;
      queueRuntime.lastDequeuedAtIso = new Date().toISOString();
      queueRuntime.lastDequeuedTaskId = task.queueTaskId;
      syncActiveTasks(activeTasks);

      try {
        await rememberClaimState(controlRedis, task, raw, Date.now());
      } catch (e) {
        logger.error("autoReachedQueue claim record error:", e);
        queueRuntime.totalClaimRecordErrors += 1;
        noteQueueError(e);
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
        syncActiveTasks(activeTasks);
        continue;
      }

      try {
        await processAutoReachedTask(io, task);
        await clearProcessingState(controlRedis, task, raw);
        queueRuntime.totalHandled += 1;
        queueRuntime.lastHandledAtIso = new Date().toISOString();
        queueRuntime.lastHandledTaskId = task.queueTaskId;
      } catch (e) {
        logger.error("autoReachedQueue task error:", e);
        queueRuntime.totalTaskErrors += 1;
        noteQueueError(e);
        if (isAutoReachedInvalidTaskError(e)) {
          try {
            await moveToDeadLetter(controlRedis, task, raw, "INVALID_TASK");
          } catch {
            // ignore
          }
          activeTasks.delete(task.queueTaskId);
          syncActiveTasks(activeTasks);
          continue;
        }
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
      syncActiveTasks(activeTasks);
    }
  };

  void loop();

  return () => {
    closed = true;
    queueRuntime.closed = true;
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

/**
 * M93 queue durability proof helpers.
 * Read-only helpers: expose bounded dead-letter visibility and threshold classification
 * without changing enqueue/worker processing semantics.
 */
export function evaluateAutoReachedQueueHealthThresholds(snapshot = {}, opts = {}) {
  const queue = snapshot?.queue || {};
  const thresholds = {
    queueDepthWarn: Number(opts.queueDepthWarn ?? ENV.AUTO_REACHED_QUEUE_DEPTH_WARN ?? 500),
    processingDepthWarn: Number(opts.processingDepthWarn ?? ENV.AUTO_REACHED_PROCESSING_DEPTH_WARN ?? 50),
    claimsDepthWarn: Number(opts.claimsDepthWarn ?? ENV.AUTO_REACHED_CLAIMS_DEPTH_WARN ?? 50),
    deadLetterDepthWarn: Number(opts.deadLetterDepthWarn ?? ENV.AUTO_REACHED_DEAD_LETTER_DEPTH_WARN ?? 1),
    oldestClaimAgeMsWarn: Number(opts.oldestClaimAgeMsWarn ?? ENV.AUTO_REACHED_OLDEST_CLAIM_AGE_MS_WARN ?? 120000),
  };

  const warnings = [];
  const pushIf = (condition, code, message, value, threshold) => {
    if (condition) warnings.push({ code, message, value, threshold });
  };

  pushIf(Number(queue.queueDepth || 0) > thresholds.queueDepthWarn, "QUEUE_DEPTH_HIGH", "Auto-reached kuyruk derinliği eşiği aştı.", Number(queue.queueDepth || 0), thresholds.queueDepthWarn);
  pushIf(Number(queue.processingDepth || 0) > thresholds.processingDepthWarn, "PROCESSING_DEPTH_HIGH", "Processing kuyruğu eşiği aştı.", Number(queue.processingDepth || 0), thresholds.processingDepthWarn);
  pushIf(Number(queue.claimsDepth || 0) > thresholds.claimsDepthWarn, "CLAIMS_DEPTH_HIGH", "Claim kayıtları eşiği aştı.", Number(queue.claimsDepth || 0), thresholds.claimsDepthWarn);
  pushIf(Number(queue.deadLetterDepth || 0) > thresholds.deadLetterDepthWarn, "DEAD_LETTER_DEPTH_HIGH", "Dead-letter kayıtları eşiği aştı.", Number(queue.deadLetterDepth || 0), thresholds.deadLetterDepthWarn);
  pushIf(Number(queue.oldestClaimAgeMs || 0) > thresholds.oldestClaimAgeMsWarn, "OLDEST_CLAIM_STALE", "En eski claim reclaim eşiğini aştı.", Number(queue.oldestClaimAgeMs || 0), thresholds.oldestClaimAgeMsWarn);
  pushIf(snapshot?.redisAvailable === false || snapshot?.redisConnected === false, "REDIS_NOT_CONNECTED", "Redis bağlantısı yok veya bağlı değil.", snapshot?.redisConnected === true ? 1 : 0, 1);

  return {
    ok: warnings.length === 0,
    status: warnings.length === 0 ? "OK" : "WARN",
    thresholds,
    warnings,
    checkedAtIso: new Date().toISOString(),
  };
}

export function buildAutoReachedQueueIncidentSnapshot(snapshot = {}, opts = {}) {
  const threshold = evaluateAutoReachedQueueHealthThresholds(snapshot, opts);
  const warnings = Array.isArray(threshold.warnings) ? threshold.warnings : [];
  const codeList = warnings.map((item) => String(item?.code || "")).filter(Boolean);
  const codeSet = new Set(codeList);

  let severity = "OK";
  let title = "Queue sağlıklı";
  if (codeSet.has("REDIS_NOT_CONNECTED")) {
    severity = "CRITICAL";
    title = "Redis bağlantısı yok";
  } else if (codeSet.has("DEAD_LETTER_DEPTH_HIGH")) {
    severity = "HIGH";
    title = "Dead-letter birikimi yükseldi";
  } else if (codeSet.has("OLDEST_CLAIM_STALE")) {
    severity = "HIGH";
    title = "Claim reclaim gecikiyor";
  } else if (codeSet.has("QUEUE_DEPTH_HIGH") || codeSet.has("PROCESSING_DEPTH_HIGH") || codeSet.has("CLAIMS_DEPTH_HIGH")) {
    severity = "WARN";
    title = "Queue yükü yükseliyor";
  }

  return {
    ok: severity === "OK",
    severity,
    title,
    recommendedActions: buildQueueIncidentRecommendations(codeList),
    chaosDrills: [
      "Redis down/up: enqueue ve proof yüzeyi davranışını gözle.",
      "Worker restart: reclaim ve dead-letter geçişini doğrula.",
      "Poison job: attempt limiti ve dead-letter akışını kontrol et.",
    ],
    threshold,
  };
}

export async function getAutoReachedDeadLetterSnapshot(opts = {}) {
  const redis = opts.redis || getRedis();
  const limit = Math.min(200, Math.max(1, Number(opts.limit ?? 50)));
  const out = {
    ok: Boolean(redis?.send),
    redisAvailable: Boolean(redis?.send),
    key: AUTO_REACHED_DEAD_LETTER_KEY,
    limit,
    items: [],
    error: null,
  };
  if (!redis?.send) {
    out.error = "REDIS_UNAVAILABLE";
    return out;
  }
  try {
    const rows = await redis.send("LRANGE", AUTO_REACHED_DEAD_LETTER_KEY, "0", String(limit - 1));
    out.items = Array.isArray(rows)
      ? rows.map((raw) => {
          try {
            return { ok: true, raw, parsed: JSON.parse(raw) };
          } catch (e) {
            return { ok: false, raw, parseError: String(e?.message || e) };
          }
        })
      : [];
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = String(e?.message || e);
  }
  return out;
}

async function findDeadLetterEntry(redis, taskId, limit = 200) {
  const rows = await redis.send("LRANGE", AUTO_REACHED_DEAD_LETTER_KEY, "0", String(Math.max(1, Math.min(200, limit)) - 1));
  const items = Array.isArray(rows) ? rows : [];
  for (let idx = 0; idx < items.length; idx += 1) {
    const raw = items[idx];
    if (!raw) continue;
    const parsed = safeParseTask(raw);
    const parsedTaskId = extractDeadLetterTaskId(parsed || {});
    if (parsedTaskId && String(parsedTaskId) === String(taskId)) {
      return { index: idx, raw, parsed };
    }
  }
  return null;
}

export async function requeueAutoReachedDeadLetter(taskId, opts = {}) {
  const redis = opts.redis || getRedis();
  if (!redis?.send) return { ok: false, reason: "REDIS_UNAVAILABLE" };

  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) return { ok: false, reason: "TASK_ID_REQUIRED" };

  try {
    const entry = await findDeadLetterEntry(redis, normalizedTaskId, opts.limit ?? 200);
    if (!entry) return { ok: false, reason: "NOT_FOUND" };
    if (entry.parsed?.replayable === false || String(entry.parsed?.deadLetterReason || "") === "PARSE_INVALID_JSON") {
      return { ok: false, reason: "NOT_REPLAYABLE", error: "PARSE_INVALID_JSON" };
    }

    const nextEnvelope = buildDeadLetterReplayEnvelope(entry.parsed || {});
    if (!nextEnvelope.queueTaskId) nextEnvelope.queueTaskId = normalizedTaskId;

    await redis.send("LREM", AUTO_REACHED_DEAD_LETTER_KEY, "1", entry.raw);
    await redis.send("LPUSH", AUTO_REACHED_QUEUE_KEY, JSON.stringify(nextEnvelope));

    return {
      ok: true,
      action: "requeued",
      taskId: String(nextEnvelope.queueTaskId || normalizedTaskId),
      attemptCount: clampQueueAttempts(nextEnvelope.attemptCount),
      queuedAtIso: nextEnvelope.queuedAtIso,
    };
  } catch (e) {
    return { ok: false, reason: "REQUEUE_FAILED", error: String(e?.message || e || "REQUEUE_FAILED") };
  }
}

export async function resolveAutoReachedDeadLetter(taskId, opts = {}) {
  const redis = opts.redis || getRedis();
  if (!redis?.send) return { ok: false, reason: "REDIS_UNAVAILABLE" };

  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) return { ok: false, reason: "TASK_ID_REQUIRED" };

  try {
    const entry = await findDeadLetterEntry(redis, normalizedTaskId, opts.limit ?? 200);
    if (!entry) return { ok: false, reason: "NOT_FOUND" };

    await redis.send("LREM", AUTO_REACHED_DEAD_LETTER_KEY, "1", entry.raw);
    return {
      ok: true,
      action: "resolved",
      taskId: normalizedTaskId,
    };
  } catch (e) {
    return { ok: false, reason: "RESOLVE_FAILED", error: String(e?.message || e || "RESOLVE_FAILED") };
  }
}

export async function getAutoReachedQueueProofSnapshot(opts = {}) {
  const health = await getAutoReachedQueueHealthSnapshot(opts);
  return {
    ok: true,
    health,
    threshold: evaluateAutoReachedQueueHealthThresholds(health, opts),
    incident: buildAutoReachedQueueIncidentSnapshot(health, opts),
    deadLetter: await getAutoReachedDeadLetterSnapshot(opts),
  };
}

