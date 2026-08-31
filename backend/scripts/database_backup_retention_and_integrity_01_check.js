#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const ownerPath = path.join(repoRoot, "backend", "src", "ops", "databaseBackupService.js");
const facadePath = path.join(repoRoot, "backend", "src", "ops", "backupArchiveOps.js");
const adminPath = path.join(repoRoot, "backend", "src", "routes", "admin.js");
const acceptancePath = path.join(repoRoot, "backend", "scripts", "database_backup_retention_and_integrity_01_acceptance.mjs");
const evidencePath = path.join(repoRoot, "backend", "artifacts", "data-integrity", "DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01", "acceptance.json");
const checks = [];

function check(name, condition, detail = "") {
  checks.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${condition || !detail ? "" : `: ${detail}`}`);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function currentHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

function runPolicy() {
  const command = path.join(repoRoot, "backend", "node_modules", ".bin", process.platform === "win32" ? "node.cmd" : "node");
  const script = path.join(repoRoot, "backend", "scripts", "database_backup_retention_and_integrity_01.mjs");
  const result = spawnSync(process.execPath, [script, "policy", "--json"], { cwd: repoRoot, encoding: "utf8", windowsHide: true, timeout: 30_000 });
  if (result.status !== 0) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

const owner = read(ownerPath);
const facade = read(facadePath);
const admin = read(adminPath);
const acceptance = read(acceptancePath);
const policy = runPolicy();

check("canonical #12 owner exists", fs.existsSync(ownerPath));
check("one canonical create owner", (owner.match(/export async function createCanonicalBackup/g) || []).length === 1);
check("one canonical verify/restore/prune owner", ["verifyCanonicalBackup", "restoreCanonicalBackup", "pruneCanonicalBackups"].every((name) => owner.includes(name)));
check("legacy facade delegates to #12", facade.includes("./databaseBackupService.js") && !facade.includes("buildFallbackArchive"));
check("admin restore requires isolated target", admin.includes("targetDatabaseUrl") && admin.includes("isolated: force") && admin.includes("outputDir: ENV.BACKUP_LOCAL_DIR"));
check("custom format and cryptographic checksum are canonical", owner.includes('BACKUP_FORMAT = "postgresql-custom"') && owner.includes('CHECKSUM_ALGORITHM = "sha256"'));
check("metadata includes identity, content revision and retention", ["backupId", "eventIdentity", "idempotencyKey", "contentIdentity", "sourceDatabaseIdentity", "prismaSchemaIdentity", "retentionClass", "restoreCompatibility"].every((name) => owner.includes(name)));
check("atomic partial output and inventory ordering", owner.includes(".partial") && owner.includes('status: "VERIFIED"') && owner.indexOf("inspectArchive") < owner.indexOf('status: "VERIFIED"'));
check("bounded inventory lock", owner.includes("BACKUP_INVENTORY_LOCK_TIMEOUT") && owner.includes("for (let attempt = 0; attempt < 20"));
check("inventory paths reject traversal", owner.includes("resolveInventoryEntryPath") && owner.includes("BACKUP_PATH_TRAVERSAL_REJECTED"));
check("canonical retention classes defined", policy && policy.retention && ["operational", "daily", "weekly", "monthly", "protected", "rehearsal"].every((name) => policy.retention[name]));
check("RPO/RTO/PITR boundary is explicit", policy?.rpo?.pitr === "not implemented; WAL/PITR is a deployment follow-up" && /measured isolated rehearsal/.test(JSON.stringify(policy.rto)));
check("acceptance uses isolated PostgreSQL containers", /docker/.test(acceptance) && /postgres:16/.test(acceptance) && /backup_restore/.test(acceptance));
check("acceptance performs real archive inspection and restore", acceptance.includes("verifyCanonicalBackup") && acceptance.includes("restoreCanonicalBackup") && acceptance.includes("schemaDump"));
check("negative corruption/retention/low-disk cases are exercised", acceptance.includes("corruptFile") && acceptance.includes("pruneCanonicalBackups") && acceptance.includes("LOW_DISK"));
check("no placeholder or fake backup path", !owner.includes("placeholder") && !owner.includes("backupBody"));
check("no backup payload is tracked", (() => {
  const result = spawnSync("git", ["ls-files", "--", "artifacts/backups", "*.dump"], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  return result.status === 0 && !result.stdout.trim();
})());
check("protected runtime-data paths are not owned by #12", !owner.includes("password-change-requirements.json") && !acceptance.includes("runtime-data"));

let evidence = null;
if (fs.existsSync(evidencePath)) {
  try { evidence = JSON.parse(read(evidencePath)); } catch {}
}
check("current-head real acceptance evidence exists", Boolean(evidence));
check("acceptance evidence is fresh", evidence?.pass === true && evidence?.sourceHead === currentHead(), `evidence=${evidence?.sourceHead || "missing"} head=${currentHead() || "missing"}`);
const requiredCounterNames = [
  "BACKUP_METADATA_COMPLETE_PASS_COUNT", "BACKUP_CHECKSUM_GENERATION_PASS_COUNT", "BACKUP_CHECKSUM_VERIFY_PASS_COUNT",
  "CORRUPTED_BACKUP_DETECTION_PASS_COUNT", "BACKUP_ARCHIVE_STRUCTURE_PASS_COUNT", "CONCURRENT_WRITE_BACKUP_PASS_COUNT",
  "REAL_RESTORE_REHEARSAL_PASS_COUNT", "RESTORED_SCHEMA_PARITY_PASS_COUNT", "RESTORED_DATA_PARITY_PASS_COUNT",
  "POST_RESTORE_PRISMA_CONNECT_PASS_COUNT", "POST_RESTORE_PRISMA_QUERY_PASS_COUNT", "POST_RESTORE_BACKEND_HEALTH_PASS_COUNT",
  "POST_RESTORE_API_PASS_COUNT", "RETENTION_PRUNING_PASS_COUNT", "LOW_DISK_FAILURE_DETECTED_COUNT",
  "RETENTION_NEGATIVE_SENSITIVITY_PASS_COUNT", "CORRUPT_RESTORE_FAILURE_PASS_COUNT", "POSTGRES_BACKUP_TOOL_VERSION_VALIDATION_PASS_COUNT", "BACKUP_PRISMA_SCHEMA_IDENTITY_PASS_COUNT",
  "BACKUP_AUDIT_TRACE_PASS_COUNT", "BACKUP_CONSISTENCY_POLICY_DOCUMENTED_COUNT", "BACKUP_CONCURRENCY_POLICY_PASS_COUNT",
  "ACTIONABLE_BACKUP_FAILURE_PASS_COUNT", "PARTIAL_BACKUP_CLEANUP_PASS_COUNT",
  "IDEMPOTENCY_SAME_SCOPE_PASS_COUNT", "IDEMPOTENCY_CHANGED_SCOPE_PASS_COUNT",
];
check("acceptance counters cover mandatory real proof", requiredCounterNames.every((name) => Number(evidence?.counters?.[name]) >= 1));
check("acceptance negative counters are zero", [
  "BACKUP_WITHOUT_IDENTITY_COUNT", "BACKUP_IDENTITY_COLLISION_COUNT", "DUPLICATE_BACKUP_EVENT_AMBIGUITY_COUNT", "CORRUPTED_BACKUP_FALSE_GREEN_COUNT", "ZERO_BYTE_BACKUP_ACCEPTED_COUNT", "TRUNCATED_BACKUP_ACCEPTED_COUNT",
  "TEMP_RESTORE_DB_LEAK_COUNT", "FAILED_RESTORE_TEMP_DB_LEAK_COUNT", "CANONICAL_DB_RESTORE_COUNT", "CANONICAL_DB_OVERWRITE_COUNT", "RESTORED_SCHEMA_DRIFT_COUNT", "RESTORED_ROW_COUNT_DRIFT_COUNT", "RESTORED_RELATION_DRIFT_COUNT",
  "BACKUP_WITHOUT_RETENTION_CLASS_COUNT", "BACKUP_NOT_IN_INVENTORY_COUNT", "PROTECTED_BACKUP_DELETED_COUNT", "LAST_VALID_BACKUP_DELETED_COUNT", "UNVERIFIED_BACKUP_MARKED_HEALTHY_COUNT",
  "HARDCODED_BACKUP_ENCRYPTION_KEY_COUNT", "BACKUP_SECRET_LEAK_COUNT", "BACKUP_LOG_SECRET_LEAK_COUNT", "BACKUP_LOG_UNNECESSARY_PII_COUNT", "LOW_DISK_FALSE_SUCCESS_COUNT",
  "SILENT_BACKUP_FAILURE_COUNT", "FAILED_RESTORE_FALSE_SUCCESS_COUNT", "PITR_FALSE_CLAIM_COUNT", "UNSUPPORTED_RESTORE_VERSION_FALSE_GREEN_COUNT",
  "OVERLAPPING_BACKUP_CORRUPTION_COUNT", "INTERRUPTED_BACKUP_MARKED_VALID_COUNT", "PREMATURE_VERIFIED_STATUS_COUNT", "UNSAFE_BACKUP_FILENAME_COUNT",
  "BACKUP_PATH_TRAVERSAL_COUNT", "BROAD_BACKUP_PERMISSION_WEAKENING_COUNT", "SILENT_BACKUP_TRUNCATION_COUNT", "TEMP_BACKUP_ARTIFACT_LEAK_COUNT", "UNTRACEABLE_PROTECTED_BACKUP_ACTION_COUNT",
  "DATABASE_BACKUP_PAYLOAD_COMMITTED_COUNT", "PROTECTED_RUNTIME_DATA_TOUCHED_COUNT", "PROTECTED_RUNTIME_DATA_STAGED_COUNT", "PROTECTED_RUNTIME_DATA_COMMITTED_COUNT",
  "SOURCE_ONLY_FALSE_PROOF_COUNT", "SELF_REFERENTIAL_GUARD_COUNT", "NEGATIVE_SENSITIVITY_LOSS_COUNT",
].every((name) => Number(evidence?.counters?.[name]) === 0));

const pass = checks.every((item) => item.pass);
console.log(`DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01 ${pass ? "PASS" : "BLOCKED"} ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (!pass) process.exitCode = 1;
