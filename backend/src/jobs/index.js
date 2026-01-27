// backend/src/jobs/index.js
// server.js'i şişirmeden tüm background job'ları tek yerden başlat.

import { startGpsStaleMonitor } from "./gpsStaleMonitor.js";
import { startMaintenanceMonitor } from "./maintenanceMonitor.js";
import { startRetentionCleanup } from "./retentionCleanup.js";

/**
 * @param {import('socket.io').Server} io
 * @param {object} opts
 */
export function startMonitors(io, opts = {}) {
  const stopFns = [];

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
