import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readCanonicalPrismaSchemaSource } from "../../scripts/lib/prismaSchemaSource.js";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(MODULE_DIR, "../../..");
export const BACKUP_CONTRACT_VERSION = "ACCOUNTING_BACKUP_INTEGRITY_V1";
export const BACKUP_FORMAT = "postgresql-custom";
export const CHECKSUM_ALGORITHM = "sha256";
export const DEFAULT_BACKUP_FILENAME_PREFIX = "seferpakt-db";
export const INVENTORY_FILENAME = "backup-inventory.json";

const RETENTION_POLICY = Object.freeze({
  operational: Object.freeze({ days: 7, frequency: "on-demand/6-hourly", restorePriority: "hot" }),
  daily: Object.freeze({ days: 35, frequency: "daily", restorePriority: "high" }),
  weekly: Object.freeze({ days: 90, frequency: "weekly", restorePriority: "medium" }),
  monthly: Object.freeze({ days: 730, frequency: "monthly", restorePriority: "long-term" }),
  protected: Object.freeze({ days: null, frequency: "manual/pre-migration", restorePriority: "highest" }),
  rehearsal: Object.freeze({ days: 2, frequency: "test-only", restorePriority: "test" }),
});

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function safeToken(value, label) {
  const result = text(value);
  if (!result || !/^[A-Za-z0-9_.-]+$/.test(result)) {
    throw new Error(`${label} must contain only letters, numbers, dot, underscore or hyphen`);
  }
  return result;
}

function sha256(value) {
  return crypto.createHash(CHECKSUM_ALGORITHM).update(value).digest("hex");
}

function fileSha256(filePath) {
  const hash = crypto.createHash(CHECKSUM_ALGORITHM);
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function readGitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  });
  return result.status === 0 ? text(result.stdout) : null;
}

function schemaIdentity() {
  return {
    algorithm: `${CHECKSUM_ALGORITHM}(canonical Prisma schema source set)`,
    sha256: sha256(readCanonicalPrismaSchemaSource(REPO_ROOT)),
  };
}

function parseDatabaseUrl(databaseUrl) {
  const raw = text(databaseUrl);
  if (!raw) throw new Error("DATABASE_URL is required for backup operations");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is invalid");
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const schema = parsed.searchParams.get("schema") || "public";
  const identity = {
    protocol: parsed.protocol.replace(/:$/, ""),
    host: parsed.hostname,
    port: parsed.port || (parsed.protocol === "postgresql:" ? "5432" : null),
    database,
    schema,
    username: decodeURIComponent(parsed.username || "") || null,
  };
  // The restore overwrite guard is database-scope based. Credentials are
  // metadata, not part of the identity of the database being protected.
  identity.identityHash = sha256(JSON.stringify({
    protocol: identity.protocol,
    host: identity.host,
    port: identity.port,
    database: identity.database,
    schema: identity.schema,
  }));
  return { parsed, identity };
}

function maskedDatabaseIdentity(databaseUrl) {
  return parseDatabaseUrl(databaseUrl).identity;
}

function defaultBackupDir() {
  const configured = text(process.env.BACKUP_LOCAL_DIR);
  if (configured && !(process.platform === "win32" && configured.replace(/\\/g, "/").startsWith("/app/"))) {
    return path.isAbsolute(configured) ? configured : path.resolve(REPO_ROOT, configured);
  }
  return path.join(REPO_ROOT, "artifacts", "backups");
}

function resolveBackupDir(input) {
  const raw = text(input) || defaultBackupDir();
  const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(REPO_ROOT, raw);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

function resolveInventoryPath(outputDir) {
  return path.join(outputDir, INVENTORY_FILENAME);
}

function readInventory(outputDir) {
  const inventoryPath = resolveInventoryPath(outputDir);
  if (!fs.existsSync(inventoryPath)) {
    return { contractVersion: BACKUP_CONTRACT_VERSION, generatedAt: null, entries: [] };
  }
  try {
    const value = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    if (!Array.isArray(value.entries)) throw new Error("entries must be an array");
    return value;
  } catch (error) {
    throw new Error(`Backup inventory is unreadable: ${error.message}`);
  }
}

function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, filePath);
}

function updateInventory(outputDir, entry) {
  const inventoryPath = resolveInventoryPath(outputDir);
  const inventory = readInventory(outputDir);
  inventory.contractVersion = BACKUP_CONTRACT_VERSION;
  inventory.generatedAt = new Date().toISOString();
  inventory.entries = inventory.entries.filter((item) => item.backupId !== entry.backupId);
  inventory.entries.push(entry);
  writeJsonAtomic(inventoryPath, inventory);
}

function removeInventoryEntry(outputDir, backupId) {
  const inventoryPath = resolveInventoryPath(outputDir);
  const inventory = readInventory(outputDir);
  inventory.generatedAt = new Date().toISOString();
  inventory.entries = inventory.entries.filter((item) => item.backupId !== backupId);
  writeJsonAtomic(inventoryPath, inventory);
}

function acquireInventoryLock(outputDir) {
  const lockPath = path.join(outputDir, ".backup-inventory.lock");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const handle = fs.openSync(lockPath, "wx", 0o600);
      return { lockPath, handle };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const waitUntil = Date.now() + Math.min(250, 25 * (attempt + 1));
      while (Date.now() < waitUntil) {}
    }
  }
  throw new Error("BACKUP_INVENTORY_LOCK_TIMEOUT: another backup operation is active");
}

function releaseInventoryLock(lock) {
  if (!lock) return;
  try { fs.closeSync(lock.handle); } catch {}
  try { fs.rmSync(lock.lockPath, { force: true }); } catch {}
}

function executionMode() {
  const requested = text(process.env.BACKUP_EXECUTION_MODE)?.toLowerCase();
  if (requested === "docker" || text(process.env.BACKUP_DOCKER_CONTAINER)) return "docker";
  return "native";
}

function dockerContainer() {
  return safeToken(process.env.BACKUP_DOCKER_CONTAINER, "BACKUP_DOCKER_CONTAINER");
}

function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: null,
    windowsHide: true,
    timeout: options.timeout ?? 300_000,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    env: options.env || process.env,
  });
  return {
    status: typeof result.status === "number" ? result.status : null,
    stdout: Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || ""),
    stderr: Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr || ""),
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function safeCommandOutput(buffer) {
  return String(buffer || "").replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgresql://[redacted]").slice(0, 2000);
}

function nativeConnectionArgs(databaseUrl) {
  const { parsed } = parseDatabaseUrl(databaseUrl);
  const clean = new URL(parsed.toString());
  const password = decodeURIComponent(clean.password || "");
  clean.password = "";
  return {
    args: [`--dbname=${clean.toString()}`],
    env: { ...process.env, PGPASSWORD: password },
  };
}

function runDockerShell(container, script, options = {}) {
  return runProcess("docker", ["exec", container, "sh", "-lc", script], options);
}

function toolVersion() {
  if (executionMode() === "docker") {
    const result = runDockerShell(dockerContainer(), "pg_dump --version", { timeout: 30_000 });
    if (result.status !== 0) throw new Error(`pg_dump version failed: ${safeCommandOutput(result.stderr)}`);
    return safeCommandOutput(result.stdout).trim();
  }
  const result = runProcess(process.env.PG_DUMP_BIN || "pg_dump", ["--version"], { timeout: 30_000 });
  if (result.status !== 0) throw new Error(`pg_dump version failed: ${result.error || safeCommandOutput(result.stderr)}`);
  return safeCommandOutput(result.stdout).trim();
}

function runPgDump(databaseUrl) {
  if (executionMode() === "docker") {
    const sourceDatabase = safeToken(parseDatabaseUrl(databaseUrl).identity.database, "source database name");
    const result = runDockerShell(
      dockerContainer(),
      `set -eu; PGPASSWORD="\${POSTGRES_PASSWORD:-}" pg_dump --format=custom --compress=6 --no-owner --no-privileges -U "\${POSTGRES_USER:-postgres}" -d "${sourceDatabase}"`,
      { timeout: 600_000, maxBuffer: 256 * 1024 * 1024 },
    );
    return result;
  }
  const connection = nativeConnectionArgs(databaseUrl);
  return runProcess(process.env.PG_DUMP_BIN || "pg_dump", [
    "--format=custom",
    "--compress=6",
    "--no-owner",
    "--no-privileges",
    ...connection.args,
  ], { timeout: 600_000, maxBuffer: 256 * 1024 * 1024, env: connection.env });
}

function copyIntoDocker(container, filePath, remoteName) {
  const remotePath = `/tmp/${safeToken(remoteName, "remote archive name")}`;
  const copied = runProcess("docker", ["cp", filePath, `${container}:${remotePath}`], { timeout: 120_000 });
  if (copied.status !== 0) throw new Error(`Docker archive copy failed: ${safeCommandOutput(copied.stderr)}`);
  return remotePath;
}

function removeDockerFile(container, remotePath) {
  runProcess("docker", ["exec", container, "rm", "-f", remotePath], { timeout: 30_000 });
}

function inspectArchive(backupFile) {
  if (executionMode() === "docker") {
    const remotePath = copyIntoDocker(dockerContainer(), backupFile, `${path.basename(backupFile)}-${process.pid}`);
    try {
      const result = runProcess("docker", ["exec", dockerContainer(), "pg_restore", "--list", remotePath], { timeout: 120_000 });
      if (result.status !== 0) throw new Error(`pg_restore archive inspection failed: ${safeCommandOutput(result.stderr)}`);
      return { ok: true, output: safeCommandOutput(result.stdout) };
    } finally {
      removeDockerFile(dockerContainer(), remotePath);
    }
  }
  const result = runProcess(process.env.PG_RESTORE_BIN || "pg_restore", ["--list", backupFile], { timeout: 120_000 });
  if (result.status !== 0) throw new Error(`pg_restore archive inspection failed: ${result.error || safeCommandOutput(result.stderr)}`);
  return { ok: true, output: safeCommandOutput(result.stdout) };
}

function restoreWithDocker(container, backupFile, databaseName, databaseUser) {
  const remotePath = copyIntoDocker(container, backupFile, `${path.basename(backupFile)}-${process.pid}`);
  try {
    const db = safeToken(databaseName, "target database name");
    const user = safeToken(databaseUser || process.env.BACKUP_RESTORE_DB_USER || "postgres", "target database user");
    const result = runProcess("docker", [
      "exec", container, "pg_restore", "--clean", "--if-exists", "--no-owner", "--no-privileges", "-U", user, "-d", db, remotePath,
    ], { timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`pg_restore restore failed: ${safeCommandOutput(result.stderr)}`);
  } finally {
    removeDockerFile(container, remotePath);
  }
}

function restoreNative(backupFile, targetDatabaseUrl) {
  const connection = nativeConnectionArgs(targetDatabaseUrl);
  const result = runProcess(process.env.PG_RESTORE_BIN || "pg_restore", [
    "--clean", "--if-exists", "--no-owner", "--no-privileges", ...connection.args, backupFile,
  ], { timeout: 600_000, maxBuffer: 16 * 1024 * 1024, env: connection.env });
  if (result.status !== 0) throw new Error(`pg_restore restore failed: ${result.error || safeCommandOutput(result.stderr)}`);
}

async function databaseServerVersion(databaseUrl) {
  let client = null;
  try {
    const { PrismaClient } = await import("@prisma/client");
    client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const rows = await client.$queryRawUnsafe("SELECT current_setting('server_version') AS version");
    return text(rows?.[0]?.version) || "unknown";
  } catch {
    return "unknown";
  } finally {
    try { await client?.$disconnect(); } catch {}
  }
}

function retentionFor(retentionClass) {
  const key = text(retentionClass) || "daily";
  if (!RETENTION_POLICY[key]) throw new Error(`Unknown backup retention class: ${key}`);
  return { key, ...RETENTION_POLICY[key] };
}

function expiresAt(createdAt, days) {
  if (days == null) return null;
  return new Date(new Date(createdAt).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function getFreeBytes(directory) {
  try {
    if (typeof fs.statfsSync !== "function") return null;
    const stat = fs.statfsSync(directory);
    return Number(stat.bavail) * Number(stat.bsize);
  } catch {
    return null;
  }
}

export function evaluateStorageCapacity({ freeBytes, estimatedBytes = 0, minimumFreeBytes = 50 * 1024 * 1024 } = {}) {
  if (freeBytes == null) return { ok: true, state: "UNKNOWN" };
  const free = Number(freeBytes);
  const estimate = Math.max(0, Number(estimatedBytes) || 0);
  const minimum = Math.max(0, Number(minimumFreeBytes) || 0);
  if (!Number.isFinite(free) || free < estimate + minimum) {
    return { ok: false, state: "LOW_DISK", freeBytes: free, estimatedBytes: estimate, minimumFreeBytes: minimum };
  }
  return { ok: true, state: "SUFFICIENT", freeBytes: free, estimatedBytes: estimate, minimumFreeBytes: minimum };
}

export function getBackupRetentionPolicy() {
  return Object.fromEntries(Object.entries(RETENTION_POLICY).map(([key, value]) => [key, { ...value }]));
}

export async function createCanonicalBackup({ outputDir = null, retentionClass = "daily", logicalScope = "canonical-database", sourceDatabaseUrl = process.env.DATABASE_URL } = {}) {
  const directory = resolveBackupDir(outputDir);
  const retention = retentionFor(retentionClass);
  const source = parseDatabaseUrl(sourceDatabaseUrl);
  const schema = schemaIdentity();
  const createdAt = new Date().toISOString();
  const backupId = `bkp_${crypto.randomUUID()}`;
  const freeBytes = getFreeBytes(directory);
  const capacity = evaluateStorageCapacity({
    freeBytes,
    minimumFreeBytes: Number(process.env.BACKUP_MIN_FREE_BYTES || 50 * 1024 * 1024),
  });
  if (!capacity.ok) throw new Error(`LOW_DISK_SPACE: freeBytes=${capacity.freeBytes} minimumFreeBytes=${capacity.minimumFreeBytes}`);

  const dumpVersion = toolVersion();
  const dump = runPgDump(sourceDatabaseUrl);
  if (dump.status !== 0) {
    throw new Error(`BACKUP_CREATE_FAILED: ${dump.error || safeCommandOutput(dump.stderr)}`);
  }
  if (!dump.stdout.length) throw new Error("BACKUP_ZERO_BYTE_REJECTED");

  const timestamp = createdAt.replace(/[-:TZ.]/g, "").slice(0, 14);
  const filename = `${DEFAULT_BACKUP_FILENAME_PREFIX}_${timestamp}_${backupId}.dump`;
  const backupFile = path.join(directory, filename);
  const partialFile = path.join(directory, `.${filename}.partial`);
  const manifestFile = path.join(directory, `${filename}.manifest.json`);
  const sourceDatabaseVersion = await databaseServerVersion(sourceDatabaseUrl);
  if (sourceDatabaseVersion === "unknown") throw new Error("BACKUP_DATABASE_VERSION_UNAVAILABLE");

  let lock;
  try {
    fs.writeFileSync(partialFile, dump.stdout, { mode: 0o600 });
    const sizeBytes = fs.statSync(partialFile).size;
    if (sizeBytes <= 0) throw new Error("BACKUP_ZERO_BYTE_REJECTED");
    const checksum = fileSha256(partialFile);
    inspectArchive(partialFile);
    fs.renameSync(partialFile, backupFile);
    const logicalIdentity = sha256(JSON.stringify({ source: source.identity, schema, logicalScope }));
    const metadata = {
      contractVersion: BACKUP_CONTRACT_VERSION,
      backupId,
      eventIdentity: sha256(`${backupId}|${createdAt}|${checksum}`),
      idempotencyKey: logicalIdentity,
      createdAt,
      sourceSystem: "SeferPakt",
      sourceDatabaseIdentity: source.identity,
      sourceSchemaIdentity: schema,
      postgresVersion: sourceDatabaseVersion,
      pgDumpVersion: dumpVersion,
      pgRestoreVersion: dumpVersion.replace(/^pg_dump/i, "pg_restore"),
      prismaSchemaIdentity: schema,
      sourceGitHead: readGitHead(),
      logicalScope: text(logicalScope) || "canonical-database",
      contentIdentity: sha256(`${logicalIdentity}|${checksum}`),
      format: BACKUP_FORMAT,
      compression: "pg_dump custom format compression=6",
      backupFile: filename,
      fileSize: sizeBytes,
      checksumAlgorithm: CHECKSUM_ALGORITHM,
      checksum,
      encryptionState: "STORAGE_POLICY_DELEGATED",
      retentionClass: retention.key,
      retentionFrequency: retention.frequency,
      retentionDurationDays: retention.days,
      expiresAt: expiresAt(createdAt, retention.days),
      restoreCompatibility: {
        sourcePostgresMajor: String(sourceDatabaseVersion).split(".")[0] || null,
        policy: "same-major-or-explicitly-approved-compatible-target",
      },
      status: "VERIFIED",
      restoreState: "NOT_TESTED",
      auditReference: `backup:${backupId}`,
    };
    lock = acquireInventoryLock(directory);
    writeJsonAtomic(manifestFile, metadata);
    updateInventory(directory, { ...metadata, path: filename, manifestPath: path.basename(manifestFile) });
    return { ok: true, ...metadata, backupFile, manifestFile, directory };
  } catch (error) {
    try { fs.rmSync(partialFile, { force: true }); } catch {}
    try { fs.rmSync(backupFile, { force: true }); } catch {}
    try { fs.rmSync(manifestFile, { force: true }); } catch {}
    throw error;
  } finally {
    releaseInventoryLock(lock);
  }
}

export function verifyCanonicalBackup({ backupFile, manifestFile = null } = {}) {
  const file = path.resolve(String(backupFile || ""));
  if (!file || !fs.existsSync(file)) throw new Error("BACKUP_NOT_FOUND");
  if (fs.statSync(file).size <= 0) throw new Error("BACKUP_ZERO_BYTE_REJECTED");
  const manifestPath = manifestFile ? path.resolve(manifestFile) : `${file}.manifest.json`;
  if (!fs.existsSync(manifestPath)) throw new Error("BACKUP_MANIFEST_NOT_FOUND");
  const metadata = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const checksum = fileSha256(file);
  if (String(metadata.checksum || "").toLowerCase() !== checksum.toLowerCase()) {
    throw new Error(`BACKUP_CHECKSUM_MISMATCH: expected=${metadata.checksum || "missing"} actual=${checksum}`);
  }
  if (Number(metadata.fileSize) !== fs.statSync(file).size) throw new Error("BACKUP_SIZE_MISMATCH");
  const archive = inspectArchive(file);
  return { ok: true, metadata, checksum, archiveStructure: archive.output };
}

function resolveInventoryEntryPath(directory, value, label) {
  const raw = String(value || "").trim();
  if (!raw || path.isAbsolute(raw) || raw === "." || raw === ".." || raw.includes("/") || raw.includes("\\")) {
    throw new Error(`BACKUP_PATH_TRAVERSAL_REJECTED: ${label}`);
  }
  const resolved = path.resolve(directory, raw);
  if (path.dirname(resolved) !== path.resolve(directory)) {
    throw new Error(`BACKUP_PATH_TRAVERSAL_REJECTED: ${label}`);
  }
  return resolved;
}

function resolveContainedArtifactPath(directory, value, label) {
  const resolvedDirectory = path.resolve(directory);
  const candidate = path.resolve(String(value || ""));
  const relative = path.relative(resolvedDirectory, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`BACKUP_PATH_OUTSIDE_CONFIGURED_DIR: ${label}`);
  }
  return candidate;
}

export async function restoreCanonicalBackup({ backupFile, manifestFile = null, outputDir = null, targetDatabaseUrl, targetContainer = null, isolated = false } = {}) {
  if (!isolated) throw new Error("RESTORE_ISOLATION_REQUIRED");
  if (!targetDatabaseUrl) throw new Error("RESTORE_TARGET_DATABASE_REQUIRED");
  const configuredDirectory = resolveBackupDir(outputDir);
  const configuredBackupFile = resolveContainedArtifactPath(configuredDirectory, backupFile, "backup file");
  const configuredManifestFile = manifestFile
    ? resolveContainedArtifactPath(configuredDirectory, manifestFile, "manifest file")
    : `${configuredBackupFile}.manifest.json`;
  const sourceUrl = process.env.DATABASE_URL;
  const sourceIdentity = sourceUrl ? maskedDatabaseIdentity(sourceUrl).identityHash : null;
  const targetIdentity = maskedDatabaseIdentity(targetDatabaseUrl);
  if (sourceIdentity && sourceIdentity === targetIdentity.identityHash) throw new Error("CANONICAL_DB_OVERWRITE_BLOCKED");
  const verified = verifyCanonicalBackup({ backupFile: configuredBackupFile, manifestFile: configuredManifestFile });
  if (targetContainer || executionMode() === "docker") {
    restoreWithDocker(targetContainer || dockerContainer(), configuredBackupFile, targetIdentity.database, targetIdentity.username);
  } else {
    restoreNative(configuredBackupFile, targetDatabaseUrl);
  }
  const manifestPath = configuredManifestFile;
  const metadata = { ...verified.metadata, restoreState: "RESTORE_TESTED", restoreTestedAt: new Date().toISOString() };
  writeJsonAtomic(manifestPath, metadata);
  const directory = path.dirname(configuredBackupFile);
  const lock = acquireInventoryLock(directory);
  try {
    updateInventory(directory, { ...metadata, path: path.basename(backupFile), manifestPath: path.basename(manifestPath) });
  } finally {
    releaseInventoryLock(lock);
  }
  return { ok: true, backupFile: configuredBackupFile, targetDatabaseIdentity: targetIdentity, metadata };
}

export function pruneCanonicalBackups({ outputDir = null, now = new Date(), dryRun = false } = {}) {
  const directory = resolveBackupDir(outputDir);
  const inventory = readInventory(directory);
  const at = new Date(now).getTime();
  const valid = inventory.entries.filter((entry) => entry.status === "VERIFIED" || entry.restoreState === "RESTORE_TESTED");
  const validRetained = valid.filter((entry) => !entry.expiresAt || new Date(entry.expiresAt).getTime() > at);
  const candidates = [];
  for (const entry of inventory.entries) {
    const expired = entry.expiresAt && new Date(entry.expiresAt).getTime() <= at;
    const protectedClass = entry.retentionClass === "protected";
    const lastValid = validRetained.length === 1 && validRetained[0].backupId === entry.backupId;
    if (expired && !protectedClass && !lastValid) candidates.push(entry);
  }
  if (dryRun) return { ok: true, dryRun: true, candidates: candidates.map((entry) => entry.backupId), retained: inventory.entries.length - candidates.length };
  const lock = acquireInventoryLock(directory);
  try {
    const removed = [];
    for (const entry of candidates) {
      const backupPath = resolveInventoryEntryPath(directory, entry.path || entry.backupFile, "inventory backup path");
      const manifestPath = resolveInventoryEntryPath(directory, entry.manifestPath || `${path.basename(backupPath)}.manifest.json`, "inventory manifest path");
      fs.rmSync(backupPath, { force: true });
      fs.rmSync(manifestPath, { force: true });
      removed.push(entry.backupId);
      removeInventoryEntry(directory, entry.backupId);
    }
    return { ok: true, dryRun: false, removed, retained: inventory.entries.length - removed.length };
  } finally {
    releaseInventoryLock(lock);
  }
}

export function getCanonicalBackupInventory({ outputDir = null } = {}) {
  const directory = resolveBackupDir(outputDir);
  return { ok: true, directory, inventory: readInventory(directory) };
}

export function getCanonicalBackupPolicy({ outputDir = null } = {}) {
  const directory = resolveBackupDir(outputDir);
  return {
    contractVersion: BACKUP_CONTRACT_VERSION,
    format: BACKUP_FORMAT,
    checksumAlgorithm: CHECKSUM_ALGORITHM,
    outputDir: directory,
    inventoryPath: resolveInventoryPath(directory),
    retention: getBackupRetentionPolicy(),
    encryption: {
      atRest: "deployment/storage owner; application does not own keys",
      inTransit: "TLS/private network according to deployment owner",
      keyOwner: "deployment/storage owner",
    },
    rpo: {
      target: "24 hours at current local-daily stage",
      frequency: "daily minimum; operational/on-demand before protected changes",
      pitr: "not implemented; WAL/PITR is a deployment follow-up",
    },
    rto: {
      target: "measured isolated rehearsal time; no production SLA claim",
    },
    failureDomain: {
      local: "same-host local backup is recovery convenience only",
      production: "separate host/disk or object storage required by deployment contract",
    },
  };
}
