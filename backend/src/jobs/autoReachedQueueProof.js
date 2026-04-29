import { ENV } from "../env.js";
import { buildQueueIncidentRecommendations } from "./autoReachedQueueNotification.js";

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
