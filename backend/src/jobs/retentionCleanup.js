// backend/src/jobs/retentionCleanup.js
// Log retention / cleanup job (M10+ops)
// - ApiRequest + AuditLog + Notification + CheckinEvent + GpsPoint can grow unbounded.
// - This job deletes old rows in small batches to avoid long locks.
//
// Defaults (see env.js): keep 2 years for ApiRequest + AuditLog.

import { workerPrisma } from "../prisma.js";
import { ENV } from "../env.js";
import logger from "../lib/logger.js";

function msFromHours(h) {
  const v = Number(h || 0);
  // allow fractional hours for testing; clamp to >= 1 minute
  return Math.max(1 / 60, Number.isFinite(v) ? v : 0) * 60 * 60 * 1000;
}

function cutoffFromDays(days) {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return null;
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

async function isDbReadyOnce(db) {
  try {
    await db.$queryRaw`SELECT 1`;
    globalThis.__retentionDbWarned = false;
    return true;
  } catch {
    if (!globalThis.__retentionDbWarned) {
      globalThis.__retentionDbWarned = true;
      logger.warn("retentionCleanup: DB not ready, skipping run.");
    }
    return false;
  }
}

/**
 * Delete rows older than cutoff in batches.
 * Prisma's deleteMany has no LIMIT, so we fetch ids with take=batchSize.
 */
async function deleteOldBatched({ model, label, cutoff, batchSize, field = "createdAt", maxBatches = 200, dryRun = false, db }) {
  if (!cutoff) return { deleted: 0, batches: 0 };

  let deleted = 0;
  let batches = 0;

   
  while (true) {
    const rows = await db[model].findMany({
      where: { [field]: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
      orderBy: { id: "asc" },
    });

    if (!rows.length) break;

    const ids = rows.map((r) => r.id);
    if (dryRun) {
      deleted += ids.length;
    } else {
      const r = await db[model].deleteMany({ where: { id: { in: ids } } });
      deleted += r.count;
    }
    batches += 1;

    if (batches >= maxBatches) {
      logger.warn(
        `retentionCleanup: maxBatches reached for ${label} (deleted=${deleted}). Will continue next run.`
      );
      break;
    }
  }

  return { deleted, batches };
}

/**
 * Run retention cleanup once (can be used by admin endpoint).
 * Returns counts for each model. If dryRun=true, no deletes are executed.
 */
export async function runRetentionCleanupOnce(opts = {}) {
  const db = opts.prismaClient || workerPrisma;
  if (!db) return { ok: false, error: "WORKER_DATABASE_URL_REQUIRED" };
  const dryRun = opts.dryRun === true;
  const batchSize = opts.batchSize ?? ENV.LOG_RETENTION_BATCH_SIZE;
  const maxBatches = opts.maxBatches ?? 200;

  if (!(await isDbReadyOnce(db))) {
    return { ok: false, error: "DB_NOT_READY" };
  }

  const apiCutoff = cutoffFromDays(ENV.API_REQUEST_RETENTION_DAYS);
  const auditCutoff = cutoffFromDays(ENV.AUDIT_LOG_RETENTION_DAYS);
  const notifCutoff = cutoffFromDays(ENV.NOTIFICATION_RETENTION_DAYS);
  const checkinCutoff = cutoffFromDays(ENV.CHECKIN_EVENT_RETENTION_DAYS);
  const gpsCutoff = cutoffFromDays(ENV.GPS_POINT_RETENTION_DAYS);

  // In dryRun, we count full table candidates (can be heavy; intended for admin use).
  const countWhere = async (model, where) => {
    try { return await db[model].count({ where }); } catch { return null; }
  };

  const result = {
    dryRun,
    cutoffs: { apiCutoff, auditCutoff, notifCutoff, checkinCutoff, gpsCutoff },
    apiRequest: { deleted: 0, batches: 0, wouldDelete: 0 },
    auditLog: { deleted: 0, batches: 0, wouldDelete: 0 },
    notification: { deleted: 0, batches: 0, wouldDelete: 0 },
    checkinEvent: { deleted: 0, batches: 0, wouldDelete: 0 },
    gpsPoint: { deleted: 0, batches: 0, wouldDelete: 0 },
    consent: { retainedProof: true, deleted: 0, batches: 0, wouldDelete: 0 },
  };

  // ApiRequest
  if (apiCutoff) {
    if (dryRun) {
      result.apiRequest.wouldDelete = (await countWhere("apiRequest", { createdAt: { lt: apiCutoff } })) ?? 0;
      result.apiRequest.deleted = 0;
    } else {
      const r = await deleteOldBatched({ model: "apiRequest", label: "ApiRequest", cutoff: apiCutoff, batchSize, maxBatches, db });
      result.apiRequest.deleted = r.deleted; result.apiRequest.batches = r.batches;
    }
  }

  // AuditLog
  if (auditCutoff) {
    if (dryRun) {
      result.auditLog.wouldDelete = (await countWhere("auditLog", { createdAt: { lt: auditCutoff } })) ?? 0;
    } else {
      const r = await deleteOldBatched({ model: "auditLog", label: "AuditLog", cutoff: auditCutoff, batchSize, maxBatches, db });
      result.auditLog.deleted = r.deleted; result.auditLog.batches = r.batches;
    }
  }

  // Notification
  if (notifCutoff) {
    if (dryRun) {
      result.notification.wouldDelete = (await countWhere("notification", { createdAt: { lt: notifCutoff } })) ?? 0;
    } else {
      const r = await deleteOldBatched({ model: "notification", label: "Notification", cutoff: notifCutoff, batchSize, maxBatches, db });
      result.notification.deleted = r.deleted; result.notification.batches = r.batches;
    }
  }

  // CheckinEvent
  if (checkinCutoff) {
    if (dryRun) {
      result.checkinEvent.wouldDelete = (await countWhere("checkinEvent", { at: { lt: checkinCutoff } })) ?? 0;
    } else {
      const r = await deleteOldBatched({ model: "checkinEvent", label: "CheckinEvent", cutoff: checkinCutoff, batchSize, field: "at", maxBatches, db });
      result.checkinEvent.deleted = r.deleted;
      result.checkinEvent.batches = r.batches;
    }
  }

  // GPS points (cut by at)
  if (gpsCutoff) {
    if (dryRun) {
      result.gpsPoint.wouldDelete = (await countWhere("gpsPoint", { at: { lt: gpsCutoff } })) ?? 0;
    } else {
      const r = await deleteOldBatched({ model: "gpsPoint", label: "GpsPoint", cutoff: gpsCutoff, batchSize, field: "at", maxBatches, db });
      result.gpsPoint.deleted = r.deleted; result.gpsPoint.batches = r.batches;
    }
  }

  result.ok = true;
  return result;
}

export function startRetentionCleanup(_ioUnused, opts = {}) {
  const db = opts.prismaClient || workerPrisma;
  if (!db) return () => {};
  if (!ENV.LOG_RETENTION_ENABLED) {
    return () => {};
  }

  const intervalMs = opts.intervalMs ?? msFromHours(ENV.LOG_RETENTION_INTERVAL_HOURS);
  const batchSize = opts.batchSize ?? ENV.LOG_RETENTION_BATCH_SIZE;
  const runOnStart = opts.runOnStart ?? true;

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    const t0 = Date.now();

    try {
      if (!(await isDbReadyOnce(db))) return;

      const apiCutoff = cutoffFromDays(ENV.API_REQUEST_RETENTION_DAYS);
      const auditCutoff = cutoffFromDays(ENV.AUDIT_LOG_RETENTION_DAYS);
      const notifCutoff = cutoffFromDays(ENV.NOTIFICATION_RETENTION_DAYS);
      const checkinCutoff = cutoffFromDays(ENV.CHECKIN_EVENT_RETENTION_DAYS);
      const gpsCutoff = cutoffFromDays(ENV.GPS_POINT_RETENTION_DAYS);

      const api = await deleteOldBatched({
        model: "apiRequest",
        label: "ApiRequest",
        cutoff: apiCutoff,
        batchSize,
        db,
      });

      const audit = await deleteOldBatched({
        model: "auditLog",
        label: "AuditLog",
        cutoff: auditCutoff,
        batchSize,
        db,
      });

      const notif = await deleteOldBatched({
        model: "notification",
        label: "Notification",
        cutoff: notifCutoff,
        batchSize,
        db,
      });

      const checkin = await deleteOldBatched({
        model: "checkinEvent",
        label: "CheckinEvent",
        cutoff: checkinCutoff,
        batchSize,
        field: "at",
        db,
      });

      const gps = await deleteOldBatched({
        model: "gpsPoint",
        label: "GpsPoint",
        cutoff: gpsCutoff,
        batchSize,
        field: "at",
        db,
      });

      const ms = Date.now() - t0;

      // Only log when something happened (or if first run is useful).
      if (api.deleted || audit.deleted || notif.deleted || checkin.deleted || gps.deleted) {
        logger.info(
          `retentionCleanup: ApiRequest -${api.deleted}, AuditLog -${audit.deleted}, Notification -${notif.deleted}, CheckinEvent -${checkin.deleted}, GpsPoint -${gps.deleted} (ms=${ms})`
        );
      }
    } catch (e) {
      logger.error("retentionCleanup error:", e);
    } finally {
      running = false;
    }
  };

  if (runOnStart) {
    // fire-and-forget
    tick();
  }

  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}

