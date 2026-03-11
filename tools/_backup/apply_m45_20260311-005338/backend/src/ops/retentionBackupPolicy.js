// backend/src/ops/retentionBackupPolicy.js
import fs from "fs";
import path from "path";
import { ENV } from "../env.js";

function maskDatabaseUrl(input) {
  try {
    const u = new URL(String(input || ""));
    const auth = u.username ? `${decodeURIComponent(u.username)}:***@` : "";
    return `${u.protocol}//${auth}${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return null;
  }
}

function summarizeFile(fullPath) {
  try {
    const st = fs.statSync(fullPath);
    return {
      name: path.basename(fullPath),
      path: fullPath,
      sizeBytes: st.size,
      modifiedAt: st.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

function scanLocalBackupDir(dir) {
  if (!dir || !fs.existsSync(dir)) {
    return {
      exists: false,
      totalFiles: 0,
      latestBackupFile: null,
      latestManifestFile: null,
    };
  }

  const files = fs.readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((fullPath) => {
      try { return fs.statSync(fullPath).isFile(); } catch { return false; }
    });

  files.sort((a, b) => {
    try {
      return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
    } catch {
      return 0;
    }
  });

  const backups = files.filter((f) => /\.(sql|dump|backup)$/i.test(f));
  const manifests = files.filter((f) => /manifest.*\.json$/i.test(path.basename(f)) || /_manifest\.json$/i.test(path.basename(f)));

  return {
    exists: true,
    totalFiles: files.length,
    latestBackupFile: backups.length ? summarizeFile(backups[0]) : null,
    latestManifestFile: manifests.length ? summarizeFile(manifests[0]) : null,
  };
}

export function getRetentionPolicySummary() {
  return {
    logRetentionEnabled: ENV.LOG_RETENTION_ENABLED,
    apiRequestRetentionDays: ENV.API_REQUEST_RETENTION_DAYS,
    auditLogRetentionDays: ENV.AUDIT_LOG_RETENTION_DAYS,
    notificationRetentionDays: ENV.NOTIFICATION_RETENTION_DAYS,
    gpsPointRetentionDays: ENV.GPS_POINT_RETENTION_DAYS,
    telematicsUsesGpsPoint: true,
    historyGate: {
      telematicsHistoryMinSec: ENV.TELEMATICS_HISTORY_MIN_SEC,
      telematicsHistoryMinMeters: ENV.TELEMATICS_HISTORY_MIN_METERS,
    },
  };
}

export function getBackupPolicySummary() {
  return {
    backupEnabled: true,
    backupLocalDir: ENV.BACKUP_LOCAL_DIR,
    backupLocalRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
    backupDumpFormat: ENV.BACKUP_DUMP_FORMAT,
    dbTargetMasked: maskDatabaseUrl(ENV.DATABASE_URL),
    localDirExists: fs.existsSync(ENV.BACKUP_LOCAL_DIR),
  };
}

export function getBackupManifestSummary() {
  return {
    backupLocalDir: ENV.BACKUP_LOCAL_DIR,
    ...scanLocalBackupDir(ENV.BACKUP_LOCAL_DIR),
  };
}
