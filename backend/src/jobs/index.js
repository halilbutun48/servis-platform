// backend/src/jobs/index.js
// server.js'i şişirmeden tüm background job'ları tek yerden başlat.

import crypto from "node:crypto";

import { startGpsStaleMonitor } from "./gpsStaleMonitor.js";
import { startMaintenanceMonitor } from "./maintenanceMonitor.js";
import { startRetentionCleanup } from "./retentionCleanup.js";
import { startAutoReachedQueueWorker } from "./autoReachedQueue.js";

import { startAgreementMonitor } from "./agreementMonitor.js";
import { startAgreementShiftGenerator } from "./agreementShiftGenerator.js";
import { startRouteLearnMonitor } from "./routeLearnMonitor.js";
import { startShiftCompletionMonitor } from "./shiftCompletionMonitor.js";
import { getRedis } from "../redis/index.js";

const JOB_LEADER_KEY = "jobs:leader:v1";
const JOB_LEASE_MS = 30_000;
const JOB_RENEW_MS = 10_000;
const JOB_RETRY_MS = 5_000;

function newLeaderId() {
  return `${process.pid}:${crypto.randomBytes(8).toString("hex")}`;
}

async function acquireLeader(redis, leaderId) {
  try {
    const ok = await redis.send("SET", JOB_LEADER_KEY, leaderId, "NX", "PX", String(JOB_LEASE_MS));
    return String(ok || "").toUpperCase() === "OK";
  } catch {
    return false;
  }
}

async function renewLeader(redis, leaderId) {
  try {
    const script = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) else return 0 end";
    const out = await redis.send("EVAL", script, "1", JOB_LEADER_KEY, leaderId, String(JOB_LEASE_MS));
    return Number(out || 0) === 1;
  } catch {
    return false;
  }
}

async function releaseLeader(redis, leaderId) {
  try {
    const script = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
    await redis.send("EVAL", script, "1", JOB_LEADER_KEY, leaderId);
  } catch {}
}

function startLocalMonitors(io, opts = {}) {
  const stopFns = [];

  // ✅ M17: agreement lifecycle monitor (AUTO DONE)
  stopFns.push(startAgreementMonitor(io, { intervalMs: opts.agreementIntervalMs }));

  // ✅ AUTO-REACHED queue worker: keep GPS ingest thin, process stop progress out of band.
  stopFns.push(startAutoReachedQueueWorker(io, { redisUrl: opts.redisUrl }));

  // ✅ M52: agreement -> rolling 7-day shift generator
  // ✅ M19: learned route monitor (optional)
  stopFns.push(startRouteLearnMonitor(io, { intervalMs: opts.routeLearnIntervalMs }));

  // ✅ M58.5: reconcile shifts that are completed (progress.completedAt) but still not DONE
  stopFns.push(startShiftCompletionMonitor(io, { intervalMs: opts.shiftCompletionIntervalMs }));

  stopFns.push(
    startAgreementShiftGenerator(io, {
      intervalMs: opts.agreementShiftGenIntervalMs,
    })
  );

  stopFns.push(
    startGpsStaleMonitor(io, {
      intervalMs: opts.gpsIntervalMs,
      batchSize: opts.gpsBatchSize,
    })
  );

  stopFns.push(
    startMaintenanceMonitor(io, {
      intervalMs: opts.maintenanceIntervalMs,
      windowDays: opts.maintenanceWindowDays,
      dedupeHours: opts.maintenanceDedupeHours,
    })
  );

  // M10+ops: log retention / cleanup (ApiRequest, AuditLog)
  stopFns.push(
    startRetentionCleanup(io, {
      intervalMs: opts.retentionIntervalMs,
      batchSize: opts.retentionBatchSize,
      runOnStart: opts.retentionRunOnStart,
    })
  );

  return () => {
    for (const stop of stopFns) {
      try {
        stop?.();
      } catch {
        // ignore
      }
    }
  };
}

/**
 * @param {import('socket.io').Server} io
 * @param {object} opts
 */
export function startMonitors(io, opts = {}) {
  const redis = getRedis();
  if (!redis?.send) {
    return startLocalMonitors(io, opts);
  }

  const leaderId = newLeaderId();
  let localStop = null;
  let closed = false;
  let isLeader = false;
  let acquireTimer = null;
  let renewTimer = null;

  const clearTimers = () => {
    if (acquireTimer) {
      clearTimeout(acquireTimer);
      acquireTimer = null;
    }
    if (renewTimer) {
      clearTimeout(renewTimer);
      renewTimer = null;
    }
  };

  const stopLocal = async () => {
    if (localStop) {
      try {
        localStop();
      } catch {}
      localStop = null;
    }
  };

  const scheduleAcquire = (delayMs = JOB_RETRY_MS) => {
    if (closed) return;
    if (acquireTimer) return;
    acquireTimer = setTimeout(async () => {
      acquireTimer = null;
      if (closed || isLeader) return;
      const ok = await acquireLeader(redis, leaderId);
      if (!ok) {
        scheduleAcquire(JOB_RETRY_MS);
        return;
      }
      isLeader = true;
      localStop = startLocalMonitors(io, opts);
      scheduleRenew();
    }, delayMs);
  };

  const scheduleRenew = () => {
    if (closed || !isLeader) return;
    if (renewTimer) return;
    renewTimer = setTimeout(async () => {
      renewTimer = null;
      if (closed || !isLeader) return;
      const ok = await renewLeader(redis, leaderId);
      if (!ok) {
        isLeader = false;
        await stopLocal();
        scheduleAcquire(JOB_RETRY_MS);
        return;
      }
      scheduleRenew();
    }, JOB_RENEW_MS);
  };

  (async () => {
    const ok = await acquireLeader(redis, leaderId);
    if (!ok) {
      scheduleAcquire(JOB_RETRY_MS);
      return;
    }
    isLeader = true;
    localStop = startLocalMonitors(io, opts);
    scheduleRenew();
  })().catch(() => {
    scheduleAcquire(JOB_RETRY_MS);
  });

  return () => {
    if (closed) return;
    closed = true;
    clearTimers();
    isLeader = false;
    return (async () => {
      try {
        await stopLocal();
      } catch {}
      try {
        await releaseLeader(redis, leaderId);
      } catch {}
    })();
  };
}
