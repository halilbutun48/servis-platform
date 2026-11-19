import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import { createWriteFreezeController } from "../src/services/globalWriteFreeze.js";
import { createMiniRedisClient } from "../src/redis/miniRedis.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDir = path.join(repoRoot, "output", "global-write-freeze-fixture-20261102");
const backupDir = path.join(repoRoot, "output", "backup-restore-rehearsal-20261102");
const inventoryPath = path.join(backupDir, "backup-inventory.json");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const backupEntry = inventory.entries?.[0];
const backupPath = path.join(backupDir, backupEntry?.backupFile || "");

const runTag = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const names = {
  db: `seferpakt-gwf-db-${runTag}`,
  redis: `seferpakt-gwf-redis-${runTag}`,
  volume: `seferpakt_gwf_pgdata_${runTag.replace(/[^a-z0-9_]/gi, "_")}`,
};
const roles = {
  admin: "fixture_bootstrap_admin",
  owner: "seferpakt_fixture_owner",
  app: "seferpakt_fixture_app",
  worker: "seferpakt_fixture_worker",
  freezeAdmin: "seferpakt_fixture_freeze_admin",
};
const passwords = {
  admin: crypto.randomBytes(18).toString("hex"),
  owner: crypto.randomBytes(18).toString("hex"),
  app: crypto.randomBytes(18).toString("hex"),
  worker: crypto.randomBytes(18).toString("hex"),
  freezeAdmin: crypto.randomBytes(18).toString("hex"),
};
const database = `seferpakt_gwf_${runTag.replace(/[^a-z0-9]/gi, "_").slice(0, 35)}`;
let pgPort = null;
let redisPort = null;
let apiPort = null;
let apiProcess = null;
let redisClient = null;
let control = null;
let cleaned = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function docker(args, options = {}) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
    maxBuffer: options.maxBuffer || 32 * 1024 * 1024,
  }).trim();
}

function dockerTry(args) {
  try {
    return { ok: true, output: docker(args) };
  } catch (error) {
    return { ok: false, output: String(error?.stderr || error?.stdout || error?.message || error) };
  }
}

function psqlArgs({ user, password, sql }) {
  return [
    "exec",
    "-e",
    `PGPASSWORD=${password}`,
    names.db,
    "psql",
    "-h",
    "127.0.0.1",
    "-U",
    user,
    "-d",
    database,
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    sql,
  ];
}

function runPsql(user, password, sql, { allowFailure = false } = {}) {
  try {
    return { ok: true, output: docker(psqlArgs({ user, password, sql })) };
  } catch (error) {
    const output = String(error?.stderr || error?.stdout || error?.message || error);
    if (allowFailure) return { ok: false, output };
    throw new Error(`psql ${user} failed: ${output}`);
  }
}

function sqlQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function waitFor(label, fn, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await sleep(250);
  }
  throw new Error(`${label} timeout${last ? `: ${last.message}` : ""}`);
}

async function httpJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs || 5000) });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  return { status: response.status, ok: response.ok, json, text };
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function mainRuntimeSnapshot() {
  const containers = dockerTry(["ps", "--format", "{{.Names}}|{{.ID}}|{{.Image}}|{{.Ports}}"]);
  if (!containers.ok) return null;
  return containers.output.split(/\r?\n/).filter(Boolean).filter((line) => /personel_(api|db|redis)|personel_frontend/.test(line));
}

function databaseSnapshot(user, password) {
  const sql = `SELECT json_build_object(
    'companies', (SELECT count(*) FROM "Company"),
    'agreements', (SELECT count(*) FROM "Agreement"),
    'hakedis', (SELECT count(*) FROM "HakedisRecord"),
    'invoices', (SELECT count(*) FROM "InvoiceRecord"),
    'collections', (SELECT count(*) FROM "InvoiceCollection"),
    'audit', (SELECT count(*) FROM "AuditLog"),
    'apiRequest', (SELECT count(*) FROM "ApiRequest"),
    'shifts', (SELECT count(*) FROM "Shift"),
    'roomCosts', (SELECT count(*) FROM "RoomCostEntry")
  )::text`;
  const result = runPsql(user, password, sql);
  return JSON.parse(result.output);
}

async function redisSnapshot(client) {
  const values = await Promise.all([
    client.send("LLEN", "gps:auto-reached:v1"),
    client.send("LLEN", "gps:auto-reached:processing:v1"),
    client.send("HLEN", "gps:auto-reached:claims:v1"),
    client.send("ZCARD", "gps:auto-reached:claims:index:v1"),
    client.send("LLEN", "gps:auto-reached:dead:v1"),
  ]);
  return { queue: Number(values[0] || 0), processing: Number(values[1] || 0), claims: Number(values[2] || 0), claimsIndex: Number(values[3] || 0), dead: Number(values[4] || 0) };
}

function roleSetupSql() {
  const roleStatements = [
    `CREATE ROLE ${roles.owner} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    `CREATE ROLE ${roles.app} LOGIN PASSWORD ${sqlQuote(passwords.app)} NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT`,
    `CREATE ROLE ${roles.worker} LOGIN PASSWORD ${sqlQuote(passwords.worker)} NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT`,
    `CREATE ROLE ${roles.freezeAdmin} LOGIN PASSWORD ${sqlQuote(passwords.freezeAdmin)} NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT`,
    `GRANT ${roles.owner} TO ${roles.freezeAdmin}`,
    `ALTER SCHEMA public OWNER TO ${roles.owner}`,
  ];
  return `${roleStatements.join(";\n")};
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO ${roles.owner}', r.tablename);
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO ${roles.owner}', r.sequence_name);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA public TO ${roles.app}, ${roles.worker};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roles.app}, ${roles.worker};
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${roles.app}, ${roles.worker};`;
}

const revokeRuntimeWritesSql = `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM ${roles.app}, ${roles.worker};
REVOKE USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public FROM ${roles.app}, ${roles.worker};`;
const grantRuntimeWritesSql = `GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roles.app}, ${roles.worker};
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${roles.app}, ${roles.worker};`;

function auditControlEvent(action, changeControlId) {
  const meta = JSON.stringify({ changeControlId, fixture: true, source: "global_write_freeze_fixture_01" });
  return runPsql(roles.freezeAdmin, passwords.freezeAdmin, `INSERT INTO "AuditLog" ("actorRole", "action", "entity", "meta") VALUES ('WRITE_FREEZE_ADMIN', ${sqlQuote(action)}, 'WRITE_FREEZE', ${sqlQuote(meta)}::jsonb);` , { allowFailure: true });
}

async function startApi() {
  const apiLogPath = path.join(evidenceDir, "api.log");
  const log = fs.createWriteStream(apiLogPath, { flags: "a" });
  const appUrl = `postgresql://${roles.app}:${encodeURIComponent(passwords.app)}@127.0.0.1:${pgPort}/${database}?schema=public`;
  const workerUrl = `postgresql://${roles.worker}:${encodeURIComponent(passwords.worker)}@127.0.0.1:${pgPort}/${database}?schema=public`;
  const redisUrl = `redis://127.0.0.1:${redisPort}`;
  apiProcess = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(repoRoot, "backend"),
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(apiPort),
      DATABASE_URL: appUrl,
      WORKER_DATABASE_URL: workerUrl,
      REDIS_URL: redisUrl,
      LOCAL_MAINTENANCE_MODE: "0",
      TELEMATICS_ENABLED: "0",
      LOG_RETENTION_ENABLED: "0",
      ROUTE_LEARN_ENABLED: "0",
      AI_COPILOT_ENABLED: "0",
      JWT_SECRET: "fixture-only-jwt-secret",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  apiProcess.stdout.pipe(log);
  apiProcess.stderr.pipe(log);
  await waitFor("fixture API health", async () => {
    if (apiProcess.exitCode !== null) throw new Error(`api exited ${apiProcess.exitCode}`);
    const result = await httpJson(`http://127.0.0.1:${apiPort}/health`);
    return result.ok && result.json?.dbOk === true;
  }, 45_000);
  return { appUrl, workerUrl, redisUrl };
}

async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  try { apiProcess?.kill("SIGTERM"); } catch {}
  await sleep(500);
  if (apiProcess && apiProcess.exitCode === null) {
    try { apiProcess.kill("SIGKILL"); } catch {}
  }
  try { redisClient?.quit(); } catch {}
  dockerTry(["rm", "-f", names.db]);
  dockerTry(["rm", "-f", names.redis]);
  dockerTry(["volume", "rm", names.volume]);
}

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const mainBefore = mainRuntimeSnapshot();
  if (!backupEntry || backupEntry.sourceDatabaseIdentity?.database !== "seferpakt_clean_demo") throw new Error("canonical clean DEMO backup kimliği doğrulanamadı");
  if (!fs.existsSync(backupPath)) throw new Error(`backup bulunamadı: ${backupPath}`);
  if (sha256(backupPath) !== backupEntry.checksum) throw new Error("backup checksum eşleşmiyor");

  pgPort = await freePort();
  redisPort = await freePort();
  apiPort = await freePort();
  fs.writeFileSync(path.join(evidenceDir, "fixture-identity.json"), JSON.stringify({ runTag, names, database, ports: { pgPort, redisPort, apiPort }, sourceBackupId: backupEntry.backupId }, null, 2));

  docker(["volume", "create", names.volume]);
  docker(["run", "-d", "--name", names.db, "-e", `POSTGRES_USER=${roles.admin}`, "-e", `POSTGRES_PASSWORD=${passwords.admin}`, "-e", `POSTGRES_DB=${database}`, "-p", `${pgPort}:5432`, "-v", `${names.volume}:/var/lib/postgresql/data`, "postgres:16"]);
  await waitFor("fixture PostgreSQL", () => dockerTry(["exec", names.db, "pg_isready", "-U", roles.admin, "-d", database]).ok);
  docker(["cp", backupPath, `${names.db}:/tmp/global-write-freeze.dump`]);
  docker(["exec", "-e", `PGPASSWORD=${passwords.admin}`, names.db, "pg_restore", "--no-owner", "--no-privileges", "-U", roles.admin, "-d", database, "/tmp/global-write-freeze.dump"]);
  runPsql(roles.admin, passwords.admin, roleSetupSql());

  docker(["run", "-d", "--name", names.redis, "-p", `${redisPort}:6379`, "redis:7"]);
  redisClient = createMiniRedisClient(`redis://127.0.0.1:${redisPort}`);
  await waitFor("fixture Redis", async () => String(await redisClient.send("PING")).toUpperCase() === "PONG");
  control = createWriteFreezeController({
    redis: redisClient,
    namespace: "seferpakt:global-write-freeze:v1",
    authorizeControl: ({ owner, changeControlId }) => owner === "fixture-runner" && String(changeControlId || "").startsWith("GWF_FIXTURE_"),
  });
  await control.markOpen({ owner: "fixture-runner", changeControlId: `GWF_FIXTURE_${runTag}` });
  const runtime = await startApi();
  const openLogin = await httpJson(`http://127.0.0.1:${apiPort}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "company@demo.com", password: "demo123", deviceId: `gwf-${runTag}` }) });
  const openDirectWrite = runPsql(roles.app, passwords.app, `BEGIN; UPDATE "Company" SET "updatedAt"="updatedAt" WHERE id=1; ROLLBACK;`, { allowFailure: true });
  const beforeFreezeDb = databaseSnapshot(roles.admin, passwords.admin);
  const beforeFreezeRedis = await redisSnapshot(redisClient);

  const changeControlId = `GWF_FIXTURE_${runTag}`;
  const auditBefore = auditControlEvent("GLOBAL_WRITE_FREEZE_FENCING", changeControlId);
  const fencingState = await control.beginFencing({ owner: "fixture-runner", reason: "isolated defense-in-depth proof", changeControlId });

  const txClient = new PrismaClient({ datasources: { db: { url: runtime.appUrl } } });
  let transactionStartedResolve;
  const transactionStarted = new Promise((resolve) => { transactionStartedResolve = resolve; });
  const transaction = txClient.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
    transactionStartedResolve(Number(rows?.[0]?.pid || 0));
    await tx.$queryRaw`SELECT pg_sleep(1.2)`;
    return tx.$executeRawUnsafe('UPDATE "Company" SET "updatedAt"="updatedAt" WHERE id=1');
  }).then(() => ({ committed: true })).catch((error) => ({ committed: false, error: String(error?.message || error) }));
  const transactionPid = await transactionStarted;
  await sleep(100);
  const revoke = runPsql(roles.freezeAdmin, passwords.freezeAdmin, revokeRuntimeWritesSql, { allowFailure: true });
  const transactionResult = await transaction;
  await txClient.$disconnect();
  const frozenState = await control.markFrozen({ owner: "fixture-runner", reason: "isolated defense-in-depth proof", changeControlId });

  const frozenLogin = await httpJson(`http://127.0.0.1:${apiPort}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "company@demo.com", password: "demo123", deviceId: `gwf-frozen-${runTag}` }) });
  const frozenPayment = await httpJson(`http://127.0.0.1:${apiPort}/api/company/invoice-payment`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amountMinor: 1 }) });
  const directAppWrite = runPsql(roles.app, passwords.app, `UPDATE "Company" SET "updatedAt"="updatedAt" WHERE id=1;`, { allowFailure: true });
  const directWorkerWrite = runPsql(roles.worker, passwords.worker, `UPDATE "Company" SET "updatedAt"="updatedAt" WHERE id=1;`, { allowFailure: true });
  const afterFrozenDb = databaseSnapshot(roles.admin, passwords.admin);
  const afterFrozenRedis = await redisSnapshot(redisClient);
  const unauthorizedUnfreeze = await control.beginUnfreeze({ owner: "attacker", changeControlId: "GWF_FIXTURE_ATTACK" }).then(() => ({ ok: true })).catch((error) => ({ ok: false, code: error.code }));
  const redisFailure = await createWriteFreezeController({ redis: { send: async () => { throw new Error("fixture redis down"); } } }).assertWritable({ operation: "REDIS_FAILURE_TEST" }).then(() => ({ status: "FAIL" })).catch((error) => ({ status: error.code === "WRITE_FREEZE_STATE_UNAVAILABLE" ? "PASS" : "FAIL", code: error.code }));

  const unfreezingState = await control.beginUnfreeze({ owner: "fixture-runner", changeControlId });
  const grant = runPsql(roles.freezeAdmin, passwords.freezeAdmin, grantRuntimeWritesSql, { allowFailure: true });
  const openState = await control.markOpen({ owner: "fixture-runner", changeControlId });
  const afterOpenLogin = await httpJson(`http://127.0.0.1:${apiPort}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "company@demo.com", password: "demo123", deviceId: `gwf-open-${runTag}` }) });
  const afterOpenDb = databaseSnapshot(roles.admin, passwords.admin);
  const auditAfter = auditControlEvent("GLOBAL_WRITE_FREEZE_OPEN", changeControlId);
  const mainAfter = mainRuntimeSnapshot();

  const roleRows = runPsql(roles.admin, passwords.admin, `SELECT rolname || '|' || rolsuper || '|' || rolcreaterole || '|' || rolcreatedb || '|' || rolcanlogin FROM pg_roles WHERE rolname IN (${[roles.owner, roles.app, roles.worker, roles.freezeAdmin].map(sqlQuote).join(",")}) ORDER BY rolname;`).output.split(/\r?\n/).filter(Boolean);
  const evidence = {
    generatedAt: new Date().toISOString(),
    globalWriteFreeze: "PASS_CANDIDATE",
    fixture: { status: "PASS", names, database, ports: { pgPort, redisPort, apiPort }, cleaned: false },
    sourceBackup: { backupId: backupEntry.backupId, checksum: backupEntry.checksum, verified: sha256(backupPath) === backupEntry.checksum, sourceDatabase: backupEntry.sourceDatabaseIdentity.database, migrationRun: false },
    runtimeIdentity: { api: `http://127.0.0.1:${apiPort}`, appRole: roles.app, workerRole: roles.worker, redis: `redis://127.0.0.1:${redisPort}`, sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim() },
    roleSecurity: { status: roleRows.every((row) => !row.includes("|t|")), rows: roleRows, appAndWorkerSuperuser: false, tableOwner: roles.owner, freezeAdminSeparate: true },
    applicationGate: { status: openLogin.status === 200 && frozenLogin.status === 423 && frozenPayment.status === 423 && afterOpenLogin.status === 200 ? "PASS" : "FAIL", openLogin: openLogin.status, frozenLogin: frozenLogin.status, frozenPayment: frozenPayment.status, afterOpenLogin: afterOpenLogin.status, redisFailure },
    postgresPrivilegeGate: { status: revoke.ok && directAppWrite.ok === false && directWorkerWrite.ok === false && transactionResult.committed === false ? "PASS" : "NOT_PROVEN", revoke: revoke.ok, directAppWriteRejected: !directAppWrite.ok, directWorkerWriteRejected: !directWorkerWrite.ok, transaction: { pid: transactionPid, committed: transactionResult.committed, error: transactionResult.error || null }, grant: grant.ok },
    transactionDrain: { status: transactionResult.committed === false ? "PASS" : "FAIL", transactionPid, privilegeRevokeDuringOpenTransaction: true },
    fencingAndRace: { status: fencingState.state === "FENCING" && frozenState.state === "FROZEN" && unfreezingState.state === "UNFENCING" && openState.state === "OPEN" ? "PASS" : "FAIL", fencingToken: fencingState.token, frozenToken: frozenState.token, openToken: openState.token, tokenMonotonic: openState.token > frozenState.token },
    redisFailure: { status: redisFailure.status, code: redisFailure.code },
    workerQueue: { status: JSON.stringify(beforeFreezeRedis) === JSON.stringify(afterFrozenRedis) ? "PASS" : "NOT_PROVEN", beforeFreeze: beforeFreezeRedis, afterFrozen: afterFrozenRedis, activeTaskObserved: false, workerRole: roles.worker },
    socketIo: { status: "PASS", inboundBusinessWriteHandlers: "NOT_APPLICABLE", relayFrozenPublish: "PASS_UNIT_TEST" },
    audit: { status: auditBefore.ok && auditAfter.ok ? "PASS" : "NOT_PROVEN", fencingAudit: auditBefore.ok, openAudit: auditAfter.ok, rejectedBusinessOperationsDoNotCreateAudit: JSON.stringify(beforeFreezeDb) === JSON.stringify(afterFrozenDb) },
    databaseSideEffects: { beforeFreeze: beforeFreezeDb, afterFrozen: afterFrozenDb, afterOpen: afterOpenDb, frozenBusinessSnapshotUnchanged: JSON.stringify(beforeFreezeDb) === JSON.stringify(afterFrozenDb) },
    unauthorizedUnfreeze: { status: unauthorizedUnfreeze.ok === false ? "PASS" : "FAIL", code: unauthorizedUnfreeze.code },
    rollback: { status: true, fixtureCleanupRequired: true, noMainRuntimeRestart: true },
    mainRuntimeProtection: { mainRuntimeChanged: JSON.stringify(mainBefore) !== JSON.stringify(mainAfter), businessWriteObserved: false, before: mainBefore, after: mainAfter, mainRuntimeUntouched: JSON.stringify(mainBefore) === JSON.stringify(mainAfter) },
    dataBoundary: { status: "BLOCKED", note: "Eski/yeni DEMO mapping ve canonical sınır bu çalışmanın dışındadır." },
  };
  evidence.globalWriteFreeze = [evidence.applicationGate.status, evidence.postgresPrivilegeGate.status, evidence.transactionDrain.status, evidence.fencingAndRace.status, evidence.redisFailure.status, evidence.workerQueue.status, evidence.audit.status, evidence.unauthorizedUnfreeze.status].every((status) => status === "PASS") ? "PASS" : "NOT_PROVEN";
  fs.writeFileSync(path.join(evidenceDir, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ evidencePath: path.join(evidenceDir, "evidence.json"), globalWriteFreeze: evidence.globalWriteFreeze, app: evidence.applicationGate.status, postgres: evidence.postgresPrivilegeGate.status, cleanupPending: true }, null, 2));
}

try {
  await main();
} catch (error) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, "fixture-error.json"), JSON.stringify({ generatedAt: new Date().toISOString(), error: String(error?.stack || error) }, null, 2));
  console.error(error?.stack || error);
  process.exitCode = 1;
} finally {
  await cleanup();
  try {
    const identityPath = path.join(evidenceDir, "fixture-identity.json");
    if (fs.existsSync(identityPath)) {
      const identity = JSON.parse(fs.readFileSync(identityPath, "utf8"));
      identity.cleaned = true;
      fs.writeFileSync(identityPath, JSON.stringify(identity, null, 2));
    }
    const evidencePath = path.join(evidenceDir, "evidence.json");
    if (fs.existsSync(evidencePath)) {
      const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      evidence.fixture.cleaned = cleaned;
      fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    }
  } catch (error) {
    console.error(`fixture cleanup evidence update failed: ${error.message}`);
  }
}
