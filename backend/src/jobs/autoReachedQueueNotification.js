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
  return ["Kuyruk sağlıklı; gözlemlemeye devam et."];
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

export {
  buildAutoReachedQueueNotificationPayload,
  buildQueueIncidentRecommendations,
};
