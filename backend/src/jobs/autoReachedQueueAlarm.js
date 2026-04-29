import { prisma } from "../prisma.js";
import { createAndEmitNotification, createNotification } from "../notifications/service.js";
import {
  buildAutoReachedQueueIncidentSnapshot,
  evaluateAutoReachedQueueHealthThresholds,
} from "./autoReachedQueueProof.js";

export const AUTO_REACHED_QUEUE_THRESHOLD_WARN_NOTIFICATION_TYPE = "AUTO_REACHED_QUEUE_THRESHOLD_WARN";
export const AUTO_REACHED_QUEUE_THRESHOLD_CRITICAL_NOTIFICATION_TYPE = "AUTO_REACHED_QUEUE_THRESHOLD_CRITICAL";
export const AUTO_REACHED_QUEUE_RECOVERY_NOTIFICATION_TYPE = "AUTO_REACHED_QUEUE_RECOVERY";

function buildAlarmFingerprint(health = {}, threshold = {}) {
  const queue = health?.queue || {};
  const warnings = Array.isArray(threshold?.warnings) ? threshold.warnings : [];
  const warningCodes = warnings.map((item) => String(item?.code || "")).filter(Boolean).join(",");
  return [
    health?.redisConnected === false ? "REDIS_DOWN" : "REDIS_UP",
    Number(queue.queueDepth || 0),
    Number(queue.processingDepth || 0),
    Number(queue.claimsDepth || 0),
    Number(queue.deadLetterDepth || 0),
    Number(queue.oldestClaimAgeMs || 0),
    warningCodes || "NO_WARNINGS",
  ].join(":");
}

function buildQueueAlarmMessage({ severity, incident, threshold }) {
  const warningCodes = new Set((threshold?.warnings || []).map((item) => String(item?.code || "")));
  if (severity === "CRITICAL" && warningCodes.has("REDIS_NOT_CONNECTED")) {
    return "Redis bağlantısı yok veya sağlıklı değil.";
  }
  if (warningCodes.has("DEAD_LETTER_DEPTH_HIGH")) {
    return "Dead-letter kayıtları eşiği aştı.";
  }
  if (warningCodes.has("OLDEST_CLAIM_STALE")) {
    return "İşlenen kayıtlar beklenenden uzun süredir tamamlanmadı.";
  }
  if (warningCodes.has("QUEUE_DEPTH_HIGH") || warningCodes.has("PROCESSING_DEPTH_HIGH") || warningCodes.has("CLAIMS_DEPTH_HIGH")) {
    return "Auto-reached kuyruğunda uyarı var.";
  }
  return String(incident?.title || "Kuyruk sağlıklı");
}

export function buildAutoReachedQueueAlarmSnapshot(snapshot = {}, opts = {}) {
  const threshold = evaluateAutoReachedQueueHealthThresholds(snapshot, opts);
  const incident = buildAutoReachedQueueIncidentSnapshot(snapshot, opts);
  const severity = String(incident?.severity || threshold?.status || "OK").toUpperCase();
  const alarmLevel = severity === "CRITICAL" ? "CRITICAL" : severity === "OK" ? "OK" : "WARN";
  const notificationType =
    alarmLevel === "CRITICAL"
      ? AUTO_REACHED_QUEUE_THRESHOLD_CRITICAL_NOTIFICATION_TYPE
      : alarmLevel === "WARN"
        ? AUTO_REACHED_QUEUE_THRESHOLD_WARN_NOTIFICATION_TYPE
        : AUTO_REACHED_QUEUE_RECOVERY_NOTIFICATION_TYPE;
  const dedupeKey = `AUTO_REACHED_QUEUE_ALARM:${notificationType}:${buildAlarmFingerprint(snapshot, threshold)}`;

  return {
    ok: alarmLevel === "OK",
    alarmLevel,
    severity,
    notificationType,
    title:
      alarmLevel === "OK"
        ? "Auto-reached kuyruğu sağlıklı"
        : incident?.title || "Auto-reached kuyruğunda uyarı var",
    message: buildQueueAlarmMessage({ severity: alarmLevel, incident, threshold }),
    dedupeKey,
    warningCodes: (threshold?.warnings || []).map((item) => String(item?.code || "")).filter(Boolean),
    threshold,
    incident,
    fingerprint: buildAlarmFingerprint(snapshot, threshold),
    createdAtIso: new Date().toISOString(),
  };
}

export async function getAutoReachedQueueAlarmProofSnapshot(opts = {}) {
  const { getAutoReachedDeadLetterSnapshot, getAutoReachedQueueHealthSnapshot } = await import("./autoReachedQueue.js");
  const health = await getAutoReachedQueueHealthSnapshot(opts);
  const threshold = evaluateAutoReachedQueueHealthThresholds(health, opts);
  const incident = buildAutoReachedQueueIncidentSnapshot(health, opts);
  const deadLetter = await getAutoReachedDeadLetterSnapshot(opts);
  const alarm = buildAutoReachedQueueAlarmSnapshot(health, opts);
  return {
    ok: true,
    health,
    threshold,
    incident,
    deadLetter,
    alarm,
  };
}

export function buildAutoReachedQueueAlarmNotificationPayload({ proof, incident, alarm, phase, createdAtIso }) {
  const health = proof?.health ?? {};
  const queue = health?.queue ?? {};
  const threshold = proof?.threshold ?? alarm?.threshold ?? {};
  return {
    kind: "auto-reached-queue-alarm",
    phase,
    severity: alarm?.alarmLevel || incident?.severity || "OK",
    title: alarm?.title || incident?.title || "Auto-reached kuyruğu sağlıklı",
    message: alarm?.message || incident?.title || "Auto-reached kuyruğunda alarm sinyali yok.",
    notificationType: alarm?.notificationType || AUTO_REACHED_QUEUE_RECOVERY_NOTIFICATION_TYPE,
    dedupeKey: alarm?.dedupeKey || null,
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
    alarm,
    proof,
    createdAtIso,
  };
}

export async function syncAutoReachedQueueAlarmNotifications({ io = null, prismaClient = prisma, includeRecovery = true } = {}) {
  const proof = await getAutoReachedQueueAlarmProofSnapshot();
  const alarm = proof?.alarm || buildAutoReachedQueueAlarmSnapshot(proof?.health || {});
  const incident = proof?.incident || alarm?.incident || buildAutoReachedQueueIncidentSnapshot(proof?.health || {});
  const severity = String(alarm?.alarmLevel || incident?.severity || "OK").toUpperCase();
  const phase = severity === "OK" ? "RECOVERY" : "ALARM";
  if (phase === "RECOVERY" && includeRecovery !== true) {
    return {
      ok: true,
      synced: 0,
      phase,
      severity,
      proof,
      incident,
      alarm,
    };
  }

  const users = await prismaClient.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, fullName: true },
    orderBy: [{ id: "asc" }],
  });

  const payload = buildAutoReachedQueueAlarmNotificationPayload({
    proof,
    incident,
    alarm,
    phase,
    createdAtIso: new Date().toISOString(),
  });

  const created = [];
  for (const user of users) {
    const notificationType = phase === "RECOVERY" ? AUTO_REACHED_QUEUE_RECOVERY_NOTIFICATION_TYPE : alarm.notificationType;
    const dedupeKey = `AUTO_REACHED_QUEUE_STATE:${user.id}:${notificationType}:${alarm.fingerprint}`;
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
    notificationType: phase === "RECOVERY" ? AUTO_REACHED_QUEUE_RECOVERY_NOTIFICATION_TYPE : alarm.notificationType,
    users: users.map((u) => ({ id: u.id, email: u.email, fullName: u.fullName })),
    proof,
    incident,
    alarm,
  };
}
