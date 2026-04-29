#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAutoReachedQueueAlarmNotificationPayload,
  buildAutoReachedQueueAlarmSnapshot,
  getAutoReachedQueueAlarmProofSnapshot,
} from "../src/jobs/autoReachedQueueAlarm.js";
import { requeueAutoReachedDeadLetter, resolveAutoReachedDeadLetter } from "../src/jobs/autoReachedQueue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function makeMockRedis({
  queueDepth = 0,
  processingDepth = 0,
  claimsDepth = 0,
  deadLetterDepth = 0,
  oldestClaimAgeMs = 0,
  deadLetterItems = [],
} = {}) {
  const oldestClaimAtMs = Math.max(1, Date.now() - Math.max(0, Number(oldestClaimAgeMs || 0)));
  const serialisedDeadLetterItems = deadLetterItems.map((item) => JSON.stringify(item));

  return {
    connected: true,
    async send(cmd, ...args) {
      const verb = String(cmd || "").toUpperCase();
      const key = String(args[0] || "");
      if (verb === "LLEN") {
        if (key.includes(":processing:")) return processingDepth;
        if (key.includes(":dead:")) return deadLetterDepth;
        return queueDepth;
      }
      if (verb === "HLEN") return claimsDepth;
      if (verb === "ZCARD") return claimsDepth;
      if (verb === "ZRANGE") {
        if (oldestClaimAgeMs <= 0 || claimsDepth <= 0) return [];
        return ["stale-task", String(oldestClaimAtMs)];
      }
      if (verb === "LRANGE") {
        return serialisedDeadLetterItems;
      }
      return 0;
    },
  };
}

function summariseProof(proof) {
  const deadLetterItems = Array.isArray(proof?.deadLetter?.items) ? proof.deadLetter.items : [];
  return {
    ok: Boolean(proof?.ok),
    alarmLevel: proof?.alarm?.alarmLevel || null,
    severity: proof?.incident?.severity || null,
    notificationType: proof?.alarm?.notificationType || null,
    warningCodes: Array.isArray(proof?.alarm?.warningCodes) ? proof.alarm.warningCodes : [],
    deadLetterDepth: deadLetterItems.length,
  };
}

async function captureProof(redis, phase = "ALARM") {
  const proof = await getAutoReachedQueueAlarmProofSnapshot({ redis });
  const alarm = proof?.alarm || buildAutoReachedQueueAlarmSnapshot(proof?.health || {});
  const payload = buildAutoReachedQueueAlarmNotificationPayload({
    proof,
    incident: proof?.incident || alarm?.incident || null,
    alarm,
    phase,
    createdAtIso: new Date().toISOString(),
  });
  return { proof, alarm, payload };
}

async function main() {
  const redisUnavailable = await captureProof({ connected: false }, "ALARM");
  const staleClaim = await captureProof(
    makeMockRedis({
      queueDepth: 4,
      processingDepth: 1,
      claimsDepth: 1,
      deadLetterDepth: 0,
      oldestClaimAgeMs: 180_000,
    }),
    "ALARM",
  );
  const poisonDeadLetter = await captureProof(
    makeMockRedis({
      queueDepth: 1,
      processingDepth: 0,
      claimsDepth: 0,
      deadLetterDepth: 2,
      deadLetterItems: [
        {
          queueTaskId: "DLQ-1",
          deadLetterReason: "MAX_ATTEMPTS",
          replayable: true,
          attemptCount: 5,
          queuedAtIso: new Date().toISOString(),
        },
      ],
    }),
    "ALARM",
  );
  const thresholdWarn = await captureProof(
    makeMockRedis({
      queueDepth: 650,
      processingDepth: 5,
      claimsDepth: 3,
      deadLetterDepth: 1,
      oldestClaimAgeMs: 0,
    }),
    "ALARM",
  );

  const adminJs = read("backend/src/routes/admin.js");
  const deadLetterRequeueResolveProof =
    typeof requeueAutoReachedDeadLetter === "function" &&
    typeof resolveAutoReachedDeadLetter === "function" &&
    adminJs.includes("AUTO_REACHED_QUEUE_DEAD_LETTER_REQUEUE") &&
    adminJs.includes("AUTO_REACHED_QUEUE_DEAD_LETTER_RESOLVE") &&
    adminJs.includes('/queues/auto-reached/dead-letter/:taskId/requeue') &&
    adminJs.includes('/queues/auto-reached/dead-letter/:taskId/resolve');

  const redisUnavailableProof =
    redisUnavailable.proof?.threshold?.warnings?.some((item) => String(item?.code || "") === "REDIS_NOT_CONNECTED") &&
    redisUnavailable.alarm?.alarmLevel === "CRITICAL" &&
    redisUnavailable.alarm?.notificationType === "AUTO_REACHED_QUEUE_THRESHOLD_CRITICAL";

  const staleClaimProof =
    staleClaim.proof?.threshold?.warnings?.some((item) => String(item?.code || "") === "OLDEST_CLAIM_STALE") &&
    staleClaim.alarm?.alarmLevel === "WARN" &&
    staleClaim.alarm?.notificationType === "AUTO_REACHED_QUEUE_THRESHOLD_WARN";

  const poisonDeadLetterProof =
    poisonDeadLetter.proof?.threshold?.warnings?.some((item) => String(item?.code || "") === "DEAD_LETTER_DEPTH_HIGH") &&
    Array.isArray(poisonDeadLetter.proof?.deadLetter?.items) &&
    poisonDeadLetter.proof.deadLetter.items.length >= 1 &&
    poisonDeadLetter.alarm?.alarmLevel === "WARN";

  const thresholdAlarmProof =
    thresholdWarn.proof?.threshold?.warnings?.some((item) => String(item?.code || "") === "QUEUE_DEPTH_HIGH") &&
    Boolean(thresholdWarn.payload?.dedupeKey) &&
    thresholdWarn.payload?.notificationType === "AUTO_REACHED_QUEUE_THRESHOLD_WARN";

  const summary = {
    ok: Boolean(redisUnavailableProof && staleClaimProof && poisonDeadLetterProof && deadLetterRequeueResolveProof && thresholdAlarmProof),
    simulated: true,
    proofSource: "synthetic-mock-redis",
    redisUnavailableProof,
    staleClaimProof,
    poisonDeadLetterProof,
    deadLetterRequeueResolveProof,
    thresholdAlarmProof,
    snapshots: {
      redisUnavailable: summariseProof(redisUnavailable),
      staleClaim: summariseProof(staleClaim),
      poisonDeadLetter: summariseProof(poisonDeadLetter),
      thresholdWarn: summariseProof(thresholdWarn),
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
