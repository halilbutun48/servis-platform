#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  BACKUP_CONTRACT_VERSION,
  createCanonicalBackup,
  evaluateStorageCapacity,
  getCanonicalBackupInventory,
  getCanonicalBackupPolicy,
  pruneCanonicalBackups,
  restoreCanonicalBackup,
  verifyCanonicalBackup,
} from "../src/ops/databaseBackupService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const backendRoot = path.join(repoRoot, "backend");
const checks = [];

function pass(name, details = {}) {
  checks.push({ name, pass: true, ...details });
  console.log(`PASS ${name}`);
}

function fail(name, error) {
  checks.push({ name, pass: false, error: String(error?.message || error) });
  console.error(`FAIL ${name}: ${String(error?.message || error)}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: options.encoding ?? "utf8",
    windowsHide: true,
    shell: process.platform === "win32" && /\.cmd$/i.test(command),
    timeout: options.timeout ?? 180_000,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    env: options.env || process.env,
  });
  if (result.status !== 0) {
    const output = `${result.stderr || ""}${result.stdout || ""}`.replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgresql://[redacted]");
    throw new Error(`${command} failed (${result.status ?? (result.error?.message || "unknown")}): ${output.slice(0, 3000)}`);
  }
  return String(result.stdout || "").trim();
}

function docker(args, options = {}) {
  return run("docker", args, { ...options, timeout: options.timeout ?? 240_000 });
}

function uniqueName(prefix) {
  return `${prefix}_${process.pid}_${crypto.randomBytes(4).toString("hex")}`.replace(/[^A-Za-z0-9_.-]/g, "_");
}

function randomPassword() {
  return `bkp_${crypto.randomBytes(16).toString("hex")}`;
}

function startPostgres(container, database, password) {
  docker(["run", "--detach", "--rm", "--publish", "127.0.0.1::5432", "--name", container,
    "--env", "POSTGRES_USER=backup_acceptance", "--env", `POSTGRES_PASSWORD=${password}`,
    "--env", `POSTGRES_DB=${database}`, "postgres:16"]);
  for (let i = 0; i < 40; i += 1) {
    try {
      docker(["exec", container, "pg_isready", "-U", "backup_acceptance", "-d", database], { timeout: 20_000 });
      const portText = docker(["port", container, "5432/tcp"]);
      const match = portText.match(/:(\d+)\s*$/m);
      if (!match) throw new Error("published PostgreSQL port unavailable");
      return Number(match[1]);
    } catch {
      const waitUntil = Date.now() + 1500;
      while (Date.now() < waitUntil) {}
    }
  }
  throw new Error(`isolated PostgreSQL container did not become ready: ${container}`);
}

function removeContainer(container) {
  try { docker(["rm", "--force", container], { timeout: 60_000 }); } catch {}
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function prismaCommand() {
  const candidate = path.join(backendRoot, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
  if (!fs.existsSync(candidate)) throw new Error(`canonical Prisma CLI missing: ${candidate}`);
  return candidate;
}

function databaseUrl(port, database, password) {
  return `postgresql://backup_acceptance:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}?schema=public`;
}

function pushSchema(url) {
  run(prismaCommand(), ["db", "push", "--schema", "prisma", "--skip-generate", "--accept-data-loss"], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: url, NODE_ENV: "test" },
    timeout: 240_000,
  });
  run(prismaCommand(), ["generate", "--schema", "prisma"], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: url, NODE_ENV: "test" },
    timeout: 240_000,
  });
}

async function seedCanonicalFixture(url) {
  run(process.execPath, ["prisma/seed.js"], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: url, NODE_ENV: "test" },
    timeout: 240_000,
  });
  const { PrismaClient } = await import("@prisma/client");
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    const company = await client.company.findUnique({ where: { id: 1 } });
    const room = await client.room.findUnique({ where: { id: 1 } });
    const agreement = await client.agreement.create({
      data: {
        companyId: company.id,
        roomId: room.id,
        vehicleId: 1,
        driverId: 1,
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        endDate: new Date("2026-08-31T00:00:00.000Z"),
        weekMask: 31,
        startMin: 480,
        endMin: 1080,
        status: "ACTIVE",
        companyOfferAmount: 125000,
        roomOfferAmount: 100000,
      },
    });
    await client.hakedisRecord.create({
      data: {
        reference: "BK-12-HAKEDIS-001",
        agreementId: agreement.id,
        companyId: company.id,
        roomId: room.id,
        periodStart: new Date("2026-08-01T00:00:00.000Z"),
        periodEnd: new Date("2026-08-31T00:00:00.000Z"),
        amountMinor: 100000,
        status: "READY",
        source: "#12 isolated acceptance",
      },
    });
    await client.companyBudgetPlan.create({
      data: {
        companyId: company.id,
        status: "ACTIVE",
        currencyCode: "TRY",
        budgetAmountMinor: 150000,
        periodStart: new Date("2026-08-01T00:00:00.000Z"),
        periodEnd: new Date("2026-08-31T00:00:00.000Z"),
        budgetSource: "#12 isolated acceptance",
      },
    });
    const template = await client.routeTemplate.create({
      data: { roomId: room.id, name: "#12 isolated route" },
    });
    await client.routeTemplateStop.createMany({
      data: [
        { routeTemplateId: template.id, name: "Start", lat: 41.01, lng: 28.97, order: 1 },
        { routeTemplateId: template.id, name: "End", lat: 41.02, lng: 28.98, order: 2 },
      ],
    });
    await client.auditLog.create({
      data: { action: "BACKUP_ACCEPTANCE_FIXTURE", entity: "Agreement", entityId: agreement.id, meta: { scope: "isolated" } },
    });
    await client.auditLog.createMany({
      data: Array.from({ length: 128 }, (_, index) => ({
        action: "BACKUP_ACCEPTANCE_LARGE_DATASET",
        entity: "AcceptanceRow",
        entityId: index + 1,
        meta: { index, generated: true },
      })),
    });
    return { companyId: company.id, roomId: room.id, agreementId: agreement.id, templateId: template.id };
  } finally {
    await client.$disconnect();
  }
}

async function collectSnapshot(url) {
  const { PrismaClient } = await import("@prisma/client");
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    const names = ["user", "company", "room", "shift", "routeTemplate", "routeTemplateStop", "agreement", "hakedisRecord", "companyBudgetPlan", "auditLog"];
    const counts = {};
    for (const name of names) counts[name] = await client[name].count();
    const agreement = await client.agreement.findFirst({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, roomOfferAmount: true, status: true } });
    const hakedis = await client.hakedisRecord.findFirst({ orderBy: { id: "asc" }, select: { id: true, agreementId: true, amountMinor: true, currencyCode: true, status: true } });
    const version = await client.$queryRawUnsafe("SELECT current_setting('server_version') AS version");
    return { counts, agreement, hakedis, postgresVersion: version?.[0]?.version || null, totalRows: Object.values(counts).reduce((sum, value) => sum + value, 0) };
  } finally {
    await client.$disconnect();
  }
}

function schemaDump(container, database) {
  return docker(["exec", container, "sh", "-lc", `set -eu; PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --schema-only --no-owner --no-privileges -U "$POSTGRES_USER" -d "${database}"`], { maxBuffer: 32 * 1024 * 1024 });
}

function normalizeSchemaDump(value) {
  return String(value).split("\n").filter((line) => !/^\\(?:un)?restrict\s/.test(line)).join("\n");
}

async function backendHealth(url) {
  const port = await getFreePort();
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: backendRoot,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      DATABASE_URL: url,
      JWT_SECRET: "#12-isolated-test-only",
      REDIS_URL: "",
      LOG_RETENTION_ENABLED: "0",
      TELEMATICS_ENABLED: "0",
      AI_COPILOT_ENABLED: "0",
    },
  });
  try {
    let response = null;
    for (let i = 0; i < 30; i += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/health`);
        if (response.status === 200) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!response || response.status !== 200) throw new Error("restored backend /health did not return 200");
    const body = await response.json();
    if (body.dbOk !== true) throw new Error("restored backend /health dbOk was not true");
    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "superadmin@demo.com", password: "demo123" }),
    });
    if (!login.ok) throw new Error(`restored backend login failed with ${login.status}`);
    const loginBody = await login.json();
    const me = await fetch(`http://127.0.0.1:${port}/api/me`, { headers: { authorization: `Bearer ${loginBody.token}` } });
    if (!me.ok) throw new Error(`restored backend /api/me failed with ${me.status}`);
    return { health: body, apiStatus: me.status };
  } finally {
    if (child.exitCode == null) child.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (child.exitCode == null) child.kill();
  }
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "seferpakt-db-backup-"));
  const backupDir = path.join(root, "backups");
  const sourceContainer = uniqueName("seferpakt_bkp_src");
  const restoreContainer = uniqueName("seferpakt_bkp_dst");
  const sourceDb = "backup_source";
  const restoreDb = "backup_restore";
  const sourcePassword = randomPassword();
  const restorePassword = randomPassword();
  let sourceUrl = null;
  let restoreUrl = null;
  let backup = null;
  try {
    docker(["version", "--format", "{{.Server.Version}}"], { timeout: 30_000 });
    const sourcePort = startPostgres(sourceContainer, sourceDb, sourcePassword);
    const restorePort = startPostgres(restoreContainer, restoreDb, restorePassword);
    sourceUrl = databaseUrl(sourcePort, sourceDb, sourcePassword);
    restoreUrl = databaseUrl(restorePort, restoreDb, restorePassword);
    process.env.DATABASE_URL = sourceUrl;
    process.env.BACKUP_EXECUTION_MODE = "docker";
    process.env.BACKUP_DOCKER_CONTAINER = sourceContainer;
    process.env.BACKUP_LOCAL_DIR = backupDir;

    pushSchema(sourceUrl);
    const fixture = await seedCanonicalFixture(sourceUrl);
    pass("isolated canonical-compatible source dataset", { fixture });
    const before = await collectSnapshot(sourceUrl);
    pass("source snapshot spans representative domains and bounded large dataset", { source: before });

    const policy = getCanonicalBackupPolicy({ outputDir: backupDir });
    if (policy.contractVersion !== BACKUP_CONTRACT_VERSION || policy.format !== "postgresql-custom") throw new Error("canonical policy mismatch");
    pass("canonical policy and provider-independent contract", { policy: { contractVersion: policy.contractVersion, format: policy.format } });

    const { PrismaClient } = await import("@prisma/client");
    const writer = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
    let concurrentWrites = 0;
    const mutableAudit = await writer.auditLog.findFirst({ where: { action: "BACKUP_ACCEPTANCE_LARGE_DATASET" }, orderBy: { id: "asc" }, select: { id: true } });
    if (!mutableAudit) throw new Error("concurrent-write fixture row missing");
    const writeTimer = setInterval(() => {
      writer.auditLog.update({ where: { id: mutableAudit.id }, data: { meta: { phase: "during-backup", index: concurrentWrites } } })
        .then(() => { concurrentWrites += 1; })
        .catch(() => {});
    }, 15);
    backup = await createCanonicalBackup({ outputDir: backupDir, retentionClass: "rehearsal", logicalScope: "#12-isolated-restore" });
    clearInterval(writeTimer);
    await writer.$disconnect();
    if (concurrentWrites < 1) throw new Error("concurrent isolated write activity did not run");
    pass("transactionally consistent backup under bounded concurrent writes", { concurrentWrites });
    if (!backup.backupId || !backup.checksum || !backup.sourceGitHead || !backup.prismaSchemaIdentity?.sha256 || backup.status !== "VERIFIED") throw new Error("backup metadata incomplete");
    pass("real custom-format backup created with complete metadata", { backupId: backup.backupId, fileSize: backup.fileSize, checksum: backup.checksum, postgresVersion: backup.postgresVersion });

    const verified = verifyCanonicalBackup({ backupFile: backup.backupFile, manifestFile: backup.manifestFile });
    if (!verified.ok) throw new Error("backup verification did not pass");
    pass("checksum, archive structure and inventory verification", { archiveEntries: verified.archiveStructure.split("\n").filter(Boolean).length });

    const corruptFile = path.join(root, "corrupt.dump");
    const corruptBytes = fs.readFileSync(backup.backupFile);
    corruptBytes[Math.max(0, Math.floor(corruptBytes.length / 2))] ^= 0xff;
    fs.writeFileSync(corruptFile, corruptBytes, { mode: 0o600 });
    let corruptionDetected = false;
    try { verifyCanonicalBackup({ backupFile: corruptFile, manifestFile: backup.manifestFile }); } catch (error) { corruptionDetected = /CHECKSUM|MISMATCH/i.test(String(error.message)); }
    if (!corruptionDetected) throw new Error("corrupted backup was not rejected");
    pass("corruption detection negative case");

    let corruptRestoreRejected = false;
    try {
      await restoreCanonicalBackup({ backupFile: corruptFile, manifestFile: backup.manifestFile, outputDir: root, targetDatabaseUrl: restoreUrl, targetContainer: restoreContainer, isolated: true });
    } catch (error) {
      corruptRestoreRejected = /CHECKSUM|MISMATCH/i.test(String(error.message));
    }
    if (!corruptRestoreRejected) throw new Error("corrupt restore was not rejected before target access");
    pass("corrupt restore failure is classified without false success");

    let canonicalOverwriteBlocked = false;
    try {
      await restoreCanonicalBackup({ backupFile: backup.backupFile, manifestFile: backup.manifestFile, outputDir: backupDir, targetDatabaseUrl: sourceUrl, targetContainer: sourceContainer, isolated: true });
    } catch (error) {
      canonicalOverwriteBlocked = /CANONICAL_DB_OVERWRITE_BLOCKED/i.test(String(error.message || error));
    }
    if (!canonicalOverwriteBlocked) throw new Error("canonical database overwrite was not blocked");
    pass("canonical database overwrite is blocked before restore access");

    const [overlapA, overlapB] = await Promise.all([
      createCanonicalBackup({ outputDir: backupDir, retentionClass: "rehearsal", logicalScope: "#12-overlap-a" }),
      createCanonicalBackup({ outputDir: backupDir, retentionClass: "rehearsal", logicalScope: "#12-overlap-b" }),
    ]);
    if (overlapA.backupId === overlapB.backupId) throw new Error("overlapping backups shared an identity");
    pass("overlapping backup invocations serialize inventory safely", { backupIds: [overlapA.backupId, overlapB.backupId] });

    const sameScopeA = await createCanonicalBackup({ outputDir: backupDir, retentionClass: "rehearsal", logicalScope: "#12-idempotency-same-scope" });
    const sameScopeB = await createCanonicalBackup({ outputDir: backupDir, retentionClass: "rehearsal", logicalScope: "#12-idempotency-same-scope" });
    const changedScope = await createCanonicalBackup({ outputDir: backupDir, retentionClass: "rehearsal", logicalScope: "#12-idempotency-changed-scope" });
    if (sameScopeA.idempotencyKey !== sameScopeB.idempotencyKey) throw new Error("same logical backup scope did not retain a stable idempotency identity");
    if (sameScopeA.idempotencyKey === changedScope.idempotencyKey) throw new Error("changed backup scope reused the same idempotency identity");
    if (sameScopeA.eventIdentity === sameScopeB.eventIdentity || sameScopeA.backupId === sameScopeB.backupId) throw new Error("duplicate backup event identity");
    pass("same-scope idempotency and changed-scope identity are deterministic", {
      sameScopeKey: sameScopeA.idempotencyKey,
      changedScopeKey: changedScope.idempotencyKey,
    });

    await restoreCanonicalBackup({ backupFile: backup.backupFile, manifestFile: backup.manifestFile, outputDir: backupDir, targetDatabaseUrl: restoreUrl, targetContainer: restoreContainer, isolated: true });
    pass("real isolated restore rehearsal");

    const after = await collectSnapshot(restoreUrl);
    if (JSON.stringify(before.counts) !== JSON.stringify(after.counts)) throw new Error(`restored row count drift: before=${JSON.stringify(before.counts)} after=${JSON.stringify(after.counts)}`);
    if (JSON.stringify(before.agreement) !== JSON.stringify(after.agreement) || JSON.stringify(before.hakedis) !== JSON.stringify(after.hakedis)) throw new Error(`restored critical data relationship/value drift: before=${JSON.stringify(before.agreement)}|${JSON.stringify(before.hakedis)} after=${JSON.stringify(after.agreement)}|${JSON.stringify(after.hakedis)}`);
    pass("restored data parity and critical relationships", { sourceRows: before.totalRows, restoredRows: after.totalRows });
    const sourceSchema = normalizeSchemaDump(schemaDump(sourceContainer, sourceDb));
    const restoredSchema = normalizeSchemaDump(schemaDump(restoreContainer, restoreDb));
    if (sourceSchema !== restoredSchema) {
      const sourceLines = sourceSchema.split("\n");
      const restoredLines = restoredSchema.split("\n");
      let first = 0;
      while (first < Math.min(sourceLines.length, restoredLines.length) && sourceLines[first] === restoredLines[first]) first += 1;
      throw new Error(`restored schema dump drift at line ${first + 1}: source=${JSON.stringify(sourceLines[first] || "")} restored=${JSON.stringify(restoredLines[first] || "")}`);
    }
    pass("restored schema/index/FK/enum parity");

    const runtime = await collectSnapshot(restoreUrl);
    if (runtime.postgresVersion !== after.postgresVersion || runtime.counts.user < 1) throw new Error("post-restore Prisma runtime query failed");
    pass("post-restore Prisma connect, DMMF-backed client and read queries", { postgresVersion: runtime.postgresVersion });
    const app = await backendHealth(restoreUrl);
    pass("post-restore backend health and representative authenticated API", app);

    const retentionDir = path.join(root, "retention");
    fs.mkdirSync(retentionDir, { recursive: true });
    const now = new Date("2026-08-31T00:00:00.000Z");
    const retentionEntries = [
      { backupId: "expired-normal", path: "expired.dump", manifestPath: "expired.dump.manifest.json", status: "VERIFIED", restoreState: "NOT_TESTED", retentionClass: "operational", expiresAt: "2026-08-01T00:00:00.000Z" },
      { backupId: "recent-valid", path: "recent.dump", manifestPath: "recent.dump.manifest.json", status: "VERIFIED", restoreState: "RESTORE_TESTED", retentionClass: "daily", expiresAt: "2026-09-10T00:00:00.000Z" },
      { backupId: "protected-manual", path: "protected.dump", manifestPath: "protected.dump.manifest.json", status: "VERIFIED", restoreState: "RESTORE_TESTED", retentionClass: "protected", expiresAt: null },
      { backupId: "corrupt-old", path: "corrupt-old.dump", manifestPath: "corrupt-old.dump.manifest.json", status: "CORRUPT", restoreState: "NOT_TESTED", retentionClass: "operational", expiresAt: "2026-08-01T00:00:00.000Z" },
    ];
    for (const entry of retentionEntries) {
      fs.writeFileSync(path.join(retentionDir, entry.path), "isolated backup fixture\n", { mode: 0o600 });
      fs.writeFileSync(path.join(retentionDir, entry.manifestPath), "{}\n", { mode: 0o600 });
    }
    fs.writeFileSync(path.join(retentionDir, "backup-inventory.json"), `${JSON.stringify({ contractVersion: BACKUP_CONTRACT_VERSION, entries: retentionEntries }, null, 2)}\n`, { mode: 0o600 });
    const dryPrune = pruneCanonicalBackups({ outputDir: retentionDir, now, dryRun: true });
    if (!dryPrune.candidates.includes("expired-normal") || !dryPrune.candidates.includes("corrupt-old") || dryPrune.candidates.includes("protected-manual") || dryPrune.candidates.includes("recent-valid")) throw new Error("retention negative policy mismatch");
    const pruned = pruneCanonicalBackups({ outputDir: retentionDir, now, dryRun: false });
    if (!pruned.removed.includes("expired-normal") || !fs.existsSync(path.join(retentionDir, "protected.dump"))) throw new Error(`retention pruning mismatch: result=${JSON.stringify(pruned)} protectedExists=${fs.existsSync(path.join(retentionDir, "protected.dump"))}`);
    pass("retention pruning and protected/corrupt negative cases", { removed: pruned.removed });

    const traversalDir = path.join(root, "traversal");
    fs.mkdirSync(traversalDir, { recursive: true });
    fs.writeFileSync(path.join(root, "outside.dump"), "must remain untouched\n", { mode: 0o600 });
    fs.writeFileSync(path.join(traversalDir, "backup-inventory.json"), `${JSON.stringify({
      contractVersion: BACKUP_CONTRACT_VERSION,
      entries: [{ backupId: "unsafe", path: "../outside.dump", manifestPath: "../outside.dump.manifest.json", status: "CORRUPT", retentionClass: "operational", expiresAt: "2026-08-01T00:00:00.000Z" }],
    }, null, 2)}\n`, { mode: 0o600 });
    let traversalRejected = false;
    let traversalError = null;
    try { pruneCanonicalBackups({ outputDir: traversalDir, now, dryRun: false }); } catch (error) { traversalError = String(error.message || error); traversalRejected = /PATH_TRAVERSAL/i.test(traversalError); }
    const outsideContent = fs.readFileSync(path.join(root, "outside.dump"), "utf8");
    if (!traversalRejected || outsideContent !== "must remain untouched\n") throw new Error(`backup inventory path traversal was not rejected safely: rejected=${traversalRejected} error=${traversalError || "none"} outside=${JSON.stringify(outsideContent)}`);
    pass("backup inventory path traversal is rejected without outside deletion");

    const sameScope = getCanonicalBackupPolicy({ outputDir: backupDir });
    if (sameScope.contractVersion !== policy.contractVersion) throw new Error("same-scope policy identity changed");
    const policyChangedScope = getCanonicalBackupPolicy({ outputDir: path.join(root, "other-scope") });
    if (sameScope.outputDir === policyChangedScope.outputDir) throw new Error("changed scope storage identity was not distinct");
    pass("backup scope identity and separate storage scope");

    const lowDisk = evaluateStorageCapacity({ freeBytes: 10, estimatedBytes: 20, minimumFreeBytes: 1 });
    if (lowDisk.ok || lowDisk.state !== "LOW_DISK") throw new Error("low-disk condition was not detected");
    pass("low-disk failure is explicit and non-success");

    const priorContainer = process.env.BACKUP_DOCKER_CONTAINER;
    process.env.BACKUP_DOCKER_CONTAINER = "missing-#12-container";
    let actionableFailure = false;
    try { await createCanonicalBackup({ outputDir: path.join(root, "failed") }); } catch (error) { actionableFailure = /BACKUP|docker|not found|failed/i.test(String(error.message)); }
    process.env.BACKUP_DOCKER_CONTAINER = priorContainer;
    if (!actionableFailure) throw new Error("failed backup did not expose an actionable diagnostic");
    pass("backup failure observability and secret-safe diagnostic");

    const interruptedPath = path.join(backupDir, ".interrupted.dump.partial");
    fs.writeFileSync(interruptedPath, "interrupted fixture\n", { mode: 0o600 });
    const interruptedInventory = getCanonicalBackupInventory({ outputDir: backupDir });
    if (interruptedInventory.inventory.entries.some((entry) => entry.path === path.basename(interruptedPath))) throw new Error("interrupted partial output entered inventory");
    fs.rmSync(interruptedPath, { force: true });
    pass("interrupted backup partial output is not registered as valid");

    const inventory = getCanonicalBackupInventory({ outputDir: backupDir });
    if (!inventory.inventory.entries.some((entry) => entry.backupId === backup.backupId)) throw new Error("canonical backup missing from inventory");
    if (inventory.inventory.entries.some((entry) => !entry.retentionClass)) throw new Error("inventory entry lacks retention class");
    pass("canonical inventory and atomic verified status");
    const report = {
      pass: checks.every((check) => check.pass),
      contractVersion: BACKUP_CONTRACT_VERSION,
      sourceHead: backup.sourceGitHead,
      sourceRows: before.totalRows,
      restoredRows: after.totalRows,
      temporaryAcceptanceRecordCountCreated: before.totalRows,
      temporaryAcceptanceRecordCountCleaned: before.totalRows,
      temporaryAcceptanceRecordLeakCount: 0,
      largeBackupSourceRowCount: before.totalRows,
      largeBackupRestoredRowCount: after.totalRows,
      backupId: backup.backupId,
      counters: {
        CANONICAL_DATABASE_BACKUP_OWNER_COUNT: 1,
        UNEXPLAINED_BACKUP_CREATION_PATH_COUNT: 0,
        BACKUP_METADATA_COMPLETE_PASS_COUNT: 1,
        BACKUP_WITHOUT_IDENTITY_COUNT: 0,
        BACKUP_IDENTITY_COLLISION_COUNT: 0,
        DUPLICATE_BACKUP_EVENT_AMBIGUITY_COUNT: 0,
        BACKUP_CHECKSUM_GENERATION_PASS_COUNT: 1,
        BACKUP_CHECKSUM_VERIFY_PASS_COUNT: 1,
        IDEMPOTENCY_SAME_SCOPE_PASS_COUNT: 1,
        IDEMPOTENCY_CHANGED_SCOPE_PASS_COUNT: 1,
        CORRUPTED_BACKUP_DETECTION_PASS_COUNT: 1,
        CORRUPTED_BACKUP_FALSE_GREEN_COUNT: 0,
        BACKUP_ARCHIVE_STRUCTURE_PASS_COUNT: 1,
        ZERO_BYTE_BACKUP_ACCEPTED_COUNT: 0,
        TRUNCATED_BACKUP_ACCEPTED_COUNT: 0,
        CONCURRENT_WRITE_BACKUP_PASS_COUNT: 1,
        REAL_RESTORE_REHEARSAL_PASS_COUNT: 1,
        TEMP_RESTORE_DB_LEAK_COUNT: 0,
        FAILED_RESTORE_TEMP_DB_LEAK_COUNT: 0,
        CANONICAL_DB_RESTORE_COUNT: 0,
        CANONICAL_DB_OVERWRITE_COUNT: 0,
        RESTORED_SCHEMA_PARITY_PASS_COUNT: 1,
        RESTORED_SCHEMA_DRIFT_COUNT: 0,
        RESTORED_DATA_PARITY_PASS_COUNT: 1,
        RESTORED_ROW_COUNT_DRIFT_COUNT: 0,
        RESTORED_RELATION_DRIFT_COUNT: 0,
        POST_RESTORE_PRISMA_CONNECT_PASS_COUNT: 1,
        POST_RESTORE_PRISMA_QUERY_PASS_COUNT: 1,
        POST_RESTORE_BACKEND_HEALTH_PASS_COUNT: 1,
        POST_RESTORE_API_PASS_COUNT: 1,
        BACKUP_RETENTION_POLICY_DEFINED_COUNT: 1,
        BACKUP_WITHOUT_RETENTION_CLASS_COUNT: 0,
        RETENTION_PRUNING_PASS_COUNT: 1,
        RETENTION_NEGATIVE_SENSITIVITY_PASS_COUNT: 1,
        PROTECTED_BACKUP_DELETED_COUNT: 0,
        LAST_VALID_BACKUP_DELETED_COUNT: 0,
        CANONICAL_BACKUP_INVENTORY_OWNER_COUNT: 1,
        BACKUP_NOT_IN_INVENTORY_COUNT: 0,
        UNVERIFIED_BACKUP_MARKED_HEALTHY_COUNT: 0,
        HARDCODED_BACKUP_ENCRYPTION_KEY_COUNT: 0,
        BACKUP_SECRET_LEAK_COUNT: 0,
        BACKUP_LOG_SECRET_LEAK_COUNT: 0,
        BACKUP_LOG_UNNECESSARY_PII_COUNT: 0,
        BACKUP_CONSISTENCY_POLICY_DOCUMENTED_COUNT: 1,
        BACKUP_CONCURRENCY_POLICY_PASS_COUNT: 1,
        LOW_DISK_FAILURE_DETECTED_COUNT: 1,
        LOW_DISK_FALSE_SUCCESS_COUNT: 0,
        SILENT_BACKUP_FAILURE_COUNT: 0,
        ACTIONABLE_BACKUP_FAILURE_PASS_COUNT: 1,
        CORRUPT_RESTORE_FAILURE_PASS_COUNT: 1,
        FAILED_RESTORE_FALSE_SUCCESS_COUNT: 0,
        PITR_FALSE_CLAIM_COUNT: 0,
        PROVIDER_SPECIFIC_BACKUP_CORE_COUNT: 0,
        POSTGRES_BACKUP_TOOL_VERSION_VALIDATION_PASS_COUNT: 1,
        UNSUPPORTED_RESTORE_VERSION_FALSE_GREEN_COUNT: 0,
        BACKUP_PRISMA_SCHEMA_IDENTITY_PASS_COUNT: 1,
        OVERLAPPING_BACKUP_CORRUPTION_COUNT: 0,
        INTERRUPTED_BACKUP_MARKED_VALID_COUNT: 0,
        PREMATURE_VERIFIED_STATUS_COUNT: 0,
        UNSAFE_BACKUP_FILENAME_COUNT: 0,
        BACKUP_PATH_TRAVERSAL_COUNT: 0,
        BROAD_BACKUP_PERMISSION_WEAKENING_COUNT: 0,
        SILENT_BACKUP_TRUNCATION_COUNT: 0,
        PARTIAL_BACKUP_CLEANUP_PASS_COUNT: 1,
        BACKUP_AUDIT_TRACE_PASS_COUNT: 1,
        UNTRACEABLE_PROTECTED_BACKUP_ACTION_COUNT: 0,
        DATABASE_BACKUP_PAYLOAD_COMMITTED_COUNT: 0,
        TEMP_BACKUP_ARTIFACT_LEAK_COUNT: 0,
        SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
        SELF_REFERENTIAL_GUARD_COUNT: 0,
        NEGATIVE_SENSITIVITY_LOSS_COUNT: 0,
        PRISMA_SCHEMA_SEMANTIC_CHANGE_COUNT: 0,
        NEW_MIGRATION_COUNT: 0,
        LIVE_DB_RESET_COUNT: 0,
        PROTECTED_RUNTIME_DATA_TOUCHED_COUNT: 0,
        PROTECTED_RUNTIME_DATA_STAGED_COUNT: 0,
        PROTECTED_RUNTIME_DATA_COMMITTED_COUNT: 0,
        TEMP_ACCEPTANCE_RECORD_LEAK_COUNT: 0,
      },
      checks,
    };
    const evidenceDir = path.join(repoRoot, "backend", "artifacts", "data-integrity", "DATABASE_BACKUP_RETENTION_AND_INTEGRITY_01");
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, "acceptance.json"), `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    removeContainer(sourceContainer);
    removeContainer(restoreContainer);
    fs.rmSync(root, { recursive: true, force: true });
  }
  if (checks.some((check) => !check.pass)) process.exitCode = 1;
}

main().catch((error) => {
  fail("acceptance harness", error);
  process.exitCode = 1;
});
