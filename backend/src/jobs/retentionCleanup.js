// backend/src/jobs/retentionCleanup.js
// Log retention / cleanup job (M10+ops)
// - ApiRequest + AuditLog (and optionally Notification) tables can grow unbounded.
// - This job deletes old rows in small batches to avoid long locks.
//
// Defaults (see env.js): keep 2 years for ApiRequest + AuditLog.

import { prisma } from "../prisma.js";
import { ENV } from "../env.js";

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

async function isDbReadyOnce() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    globalThis.__retentionDbWarned = false;
    return true;
  } catch {
    if (!globalThis.__retentionDbWarned) {
      globalThis.__retentionDbWarned = true;
      console.warn("retentionCleanup: DB not ready, skipping run.");
    }
    return false;
  }
}

/**
 * Delete rows older than cutoff in batches.
 * Prisma's deleteMany has no LIMIT, so we fetch ids with take=batchSize.
 */
async function deleteOldBatched({ model, label, cutoff, batchSize, maxBatches = 200 }) {
  if (!cutoff) return { deleted: 0, batches: 0 };

  let deleted = 0;
  let batches = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await prisma[model].findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: batchSize,
      orderBy: { id: "asc" },
    });

    if (!rows.length) break;

    const ids = rows.map((r) => r.id);
    const r = await prisma[model].deleteMany({ where: { id: { in: ids } } });
    deleted += r.count;
    batches += 1;

    if (batches >= maxBatches) {
      console.warn(
        `retentionCleanup: maxBatches reached for ${label} (deleted=${deleted}). Will continue next run.`
      );
      break;
    }
  }

  return { deleted, batches };
}

export function startRetentionCleanup(_ioUnused, opts = {}) {
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
      if (!(await isDbReadyOnce())) return;

      const apiCutoff = cutoffFromDays(ENV.API_REQUEST_RETENTION_DAYS);
      const auditCutoff = cutoffFromDays(ENV.AUDIT_LOG_RETENTION_DAYS);
      const notifCutoff = cutoffFromDays(ENV.NOTIFICATION_RETENTION_DAYS);

      const api = await deleteOldBatched({
        model: "apiRequest",
        label: "ApiRequest",
        cutoff: apiCutoff,
        batchSize,
      });

      const audit = await deleteOldBatched({
        model: "auditLog",
        label: "AuditLog",
        cutoff: auditCutoff,
        batchSize,
      });

      const notif = await deleteOldBatched({
        model: "notification",
        label: "Notification",
        cutoff: notifCutoff,
        batchSize,
      });

      const ms = Date.now() - t0;

      // Only log when something happened (or if first run is useful).
      if (api.deleted || audit.deleted || notif.deleted) {
        console.log(
          `retentionCleanup: ApiRequest -${api.deleted}, AuditLog -${audit.deleted}, Notification -${notif.deleted} (ms=${ms})`
        );
      }
    } catch (e) {
      console.error("retentionCleanup error:", e);
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
