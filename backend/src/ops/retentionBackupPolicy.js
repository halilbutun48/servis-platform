// Read-only policy/visibility facade retained for existing admin surfaces.
// #12 owns backup creation, inventory, checksum and retention behavior.
import { ENV } from "../env.js";
import {
  getCanonicalBackupInventory,
  getCanonicalBackupPolicy,
  getBackupRetentionPolicy,
} from "./databaseBackupService.js";

export function getRetentionPolicySummary() {
  const policy = getCanonicalBackupPolicy({ outputDir: ENV.BACKUP_LOCAL_DIR });
  return {
    logRetentionEnabled: ENV.LOG_RETENTION_ENABLED,
    apiRequestRetentionDays: ENV.API_REQUEST_RETENTION_DAYS,
    auditLogRetentionDays: ENV.AUDIT_LOG_RETENTION_DAYS,
    notificationRetentionDays: ENV.NOTIFICATION_RETENTION_DAYS,
    checkinEventRetentionDays: ENV.CHECKIN_EVENT_RETENTION_DAYS,
    gpsPointRetentionDays: ENV.GPS_POINT_RETENTION_DAYS,
    telematicsUsesGpsPoint: true,
    historyGate: {
      telematicsHistoryMinSec: ENV.TELEMATICS_HISTORY_MIN_SEC,
      telematicsHistoryMinMeters: ENV.TELEMATICS_HISTORY_MIN_METERS,
    },
    archive: {
      mode: "full-db-snapshot",
      backupLocalDir: policy.outputDir,
      backupLocalRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
      backupDumpFormat: policy.format,
      contractVersion: policy.contractVersion,
    },
  };
}

export function getBackupPolicySummary() {
  const policy = getCanonicalBackupPolicy({ outputDir: ENV.BACKUP_LOCAL_DIR });
  return {
    backupEnabled: true,
    backupLocalDir: policy.outputDir,
    backupLocalRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
    backupDumpFormat: policy.format,
    archiveMode: "full-db-snapshot",
    archiveRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
    contractVersion: policy.contractVersion,
    checksumAlgorithm: policy.checksumAlgorithm,
    retention: getBackupRetentionPolicy(),
    encryption: policy.encryption,
    rpo: policy.rpo,
    rto: policy.rto,
    failureDomain: policy.failureDomain,
  };
}

export function getBackupManifestSummary() {
  const snapshot = getCanonicalBackupInventory({ outputDir: ENV.BACKUP_LOCAL_DIR });
  const entries = snapshot.inventory.entries || [];
  const latest = [...entries].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  return {
    backupLocalDir: snapshot.directory,
    inventoryPath: `${snapshot.directory}/backup-inventory.json`,
    exists: entries.length > 0,
    totalFiles: entries.length,
    latestBackupFile: latest ? { name: latest.path, path: `${snapshot.directory}/${latest.path}`, sizeBytes: latest.fileSize, modifiedAt: latest.createdAt } : null,
    latestManifestFile: latest ? { name: latest.manifestPath, path: `${snapshot.directory}/${latest.manifestPath}`, sizeBytes: null, modifiedAt: latest.createdAt } : null,
    entries,
  };
}
