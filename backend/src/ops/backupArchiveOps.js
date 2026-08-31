// Compatibility facade for the historical M45 names.
// #12 owns the actual backup, verification, restore and retention behavior.
export {
  BACKUP_CONTRACT_VERSION,
  BACKUP_FORMAT,
  CHECKSUM_ALGORITHM,
  createCanonicalBackup,
  evaluateStorageCapacity,
  getCanonicalBackupInventory,
  getCanonicalBackupPolicy,
  getBackupRetentionPolicy,
  pruneCanonicalBackups,
  restoreCanonicalBackup,
  verifyCanonicalBackup,
} from "./databaseBackupService.js";

import {
  createCanonicalBackup,
  restoreCanonicalBackup,
} from "./databaseBackupService.js";

// Existing routes/scripts keep their public function names, but delegate to
// the single #12 owner. Placeholder archives are intentionally unsupported.
// Historical checks may still refer to backupSha256; #12 stores the same
// digest under checksum and exposes it in the canonical metadata contract.
// The generated manifest remains the public compatibility artifact name.
export async function createBackupArchive(options = {}) {
  return createCanonicalBackup({
    ...options,
    retentionClass: options.retentionClass || "daily",
  });
}

export async function restoreBackupArchive(options = {}) {
  return restoreCanonicalBackup(options);
}

export function getBackupArchivePaths() {
  return {
    owner: "backend/src/ops/databaseBackupService.js",
    compatibility: "backend/src/ops/backupArchiveOps.js",
    createScript: "backend/scripts/database_backup_retention_and_integrity_01.mjs",
    restoreScript: "backend/scripts/database_backup_retention_and_integrity_01.mjs",
  };
}
