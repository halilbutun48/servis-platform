// backend/src/jobs/index.js
// server.js'i şişirmeden tüm background job'ları tek yerden başlat.

import { startGpsStaleMonitor } from "./gpsStaleMonitor.js";
import { startMaintenanceMonitor } from "./maintenanceMonitor.js";
import { startRetentionCleanup } from "./retentionCleanup.js";

import { startAgreementMonitor } from "./agreementMonitor.js";
import { startAgreementShiftGenerator } from "./agreementShiftGenerator.js";
import { startRouteLearnMonitor } from "./routeLearnMonitor.js";
import { startShiftCompletionMonitor } from "./shiftCompletionMonitor.js";

/**
 * @param {import('socket.io').Server} io
 * @param {object} opts
 */
export function startMonitors(io, opts = {}) {
  const stopFns = [];

  // ✅ M17: agreement lifecycle monitor (AUTO DONE)
  stopFns.push(startAgreementMonitor(io, { intervalMs: opts.agreementIntervalMs }));

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