// backend/src/jobs/index.js
// server.js'i şişirmeden tüm background job'ları tek yerden başlat.

import { startGpsStaleMonitor } from "./gpsStaleMonitor.js";
import { startMaintenanceMonitor } from "./maintenanceMonitor.js";

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
