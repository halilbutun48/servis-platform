#!/usr/bin/env node
import {
  createCanonicalBackup,
  getCanonicalBackupInventory,
  getCanonicalBackupPolicy,
  pruneCanonicalBackups,
  restoreCanonicalBackup,
  verifyCanonicalBackup,
} from "../src/ops/databaseBackupService.js";

function readArg(name, fallback = null) {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  return fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function printResult(result) {
  if (hasFlag("json")) console.log(JSON.stringify(result, null, 2));
  else console.log(`OK ${JSON.stringify(result)}`);
}

async function main() {
  const command = process.argv[2] || "policy";
  if (command === "create") {
    const result = await createCanonicalBackup({
      outputDir: readArg("output-dir"),
      retentionClass: readArg("retention-class", "daily"),
      logicalScope: readArg("logical-scope", "canonical-database"),
      sourceDatabaseUrl: readArg("source-database-url") || process.env.DATABASE_URL,
    });
    console.log(`OK Backup file: ${result.backupFile}`);
    console.log(`OK Manifest: ${result.manifestFile}`);
    console.log(`OK Backup ID: ${result.backupId}`);
    return;
  }
  if (command === "verify") {
    printResult(verifyCanonicalBackup({ backupFile: readArg("backup-file"), manifestFile: readArg("manifest-file") }));
    return;
  }
  if (command === "restore") {
    const result = await restoreCanonicalBackup({
      backupFile: readArg("backup-file"),
      manifestFile: readArg("manifest-file"),
      targetDatabaseUrl: readArg("target-database-url"),
      targetContainer: readArg("target-container"),
      isolated: hasFlag("isolated"),
    });
    printResult(result);
    return;
  }
  if (command === "prune") {
    printResult(pruneCanonicalBackups({ outputDir: readArg("output-dir"), dryRun: hasFlag("dry-run") }));
    return;
  }
  if (command === "inventory") {
    printResult(getCanonicalBackupInventory({ outputDir: readArg("output-dir") }));
    return;
  }
  if (command === "policy") {
    printResult(getCanonicalBackupPolicy({ outputDir: readArg("output-dir") }));
    return;
  }
  throw new Error(`Unknown backup command: ${command}`);
}

main().catch((error) => {
  console.error(`BACKUP_FAILURE ${String(error?.message || error).replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgresql://[redacted]")}`);
  process.exit(1);
});
