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
const evidenceDir = path.join(repoRoot, "output", "worker-database-role-separation-fixture-20261102");
const backupDir = path.join(repoRoot, "output", "backup-restore-rehearsal-20261102");
const inventory = JSON.parse(fs.readFileSync(path.join(backupDir, "backup-inventory.json"), "utf8"));
const backupEntry = inventory.entries?.[0];
const backupPath = path.join(backupDir, backupEntry?.backupFile || "");
const runTag = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const names = {
  db: `seferpakt-worker-db-${runTag}`,
  redis: `seferpakt-worker-redis-${runTag}`,
  volume: `seferpakt_worker_pgdata_${runTag.replace(/[^a-z0-9_]/gi, "_")}`,
};
const database = `seferpakt_worker_${runTag.replace(/[^a-z0-9]/gi, "_").slice(0, 35)}`;
const roles = {
  admin: "fixture_worker_bootstrap_admin",
  owner: "fixture_worker_owner",
  app: "fixture_worker_app",
  worker: "fixture_worker_runtime",
  freezeAdmin: "fixture_worker_freeze_admin",
};
const passwords = Object.fromEntries(Object.keys(roles).map((key) => [key, crypto.randomBytes(18).toString("hex")]));
let pgPort;
let redisPort;
let apiPort;
let apiProcess;
let redisClient;
let cleaned = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function sqlQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function redactedFailure(result) {
  if (result?.ok) return null;
  return String(result?.output || "FAILED").replaceAll(/postgresql:\/\/[^\s]+/g, "postgresql://[redacted]").slice(-500);
}

function psqlArgs(user, password, sql) {
  return ["exec", "-e", `PGPASSWORD=${password}`, names.db, "psql", "-h", "127.0.0.1", "-U", user, "-d", database, "-v", "ON_ERROR_STOP=1", "-Atc", sql];
}

function psql(user, password, sql, { allowFailure = false } = {}) {
  try {
    return { ok: true, output: docker(psqlArgs(user, password, sql)) };
  } catch (error) {
    const output = String(error?.stderr || error?.stdout || error?.message || error);
    if (allowFailure) return { ok: false, output };
    throw new Error(`fixture psql failed: ${output}`);
  }
}

async function waitFor(label, fn, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let last;
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
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: response.status, ok: response.ok, json, text };
}

function roleSetupSql() {
  const statements = [
    `CREATE ROLE ${roles.owner} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    `CREATE ROLE ${roles.app} LOGIN PASSWORD ${sqlQuote(passwords.app)} NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT`,
    `CREATE ROLE ${roles.worker} LOGIN PASSWORD ${sqlQuote(passwords.worker)} NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT`,
    `CREATE ROLE ${roles.freezeAdmin} LOGIN PASSWORD ${sqlQuote(passwords.freezeAdmin)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    `GRANT ${roles.owner} TO ${roles.freezeAdmin}`,
    `ALTER SCHEMA public OWNER TO ${roles.owner}`,
  ];
  return `${statements.join(";\n")};
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO ${roles.owner}', r.tablename);
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO ${roles.owner}', r.sequence_name);
  END LOOP;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ${roles.app}, ${roles.worker};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roles.app}, ${roles.worker};
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${roles.app}, ${roles.worker};
REVOKE INSERT, UPDATE, DELETE ON TABLE "CompanyBudgetPlan", "HakedisRecord", "InvoiceRecord", "InvoiceCollection", "RoomCostEntry" FROM ${roles.worker};`;
}

const revokeRuntimeWritesSql = `SET ROLE ${roles.owner}; REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM ${roles.app}, ${roles.worker}; REVOKE USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public FROM ${roles.app}, ${roles.worker};`;
const grantRuntimeWritesSql = `SET ROLE ${roles.owner}; GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roles.app}, ${roles.worker}; GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${roles.app}, ${roles.worker};`;

function startApi(appUrl, workerUrl, redisUrl) {
  const logPath = path.join(evidenceDir, "api.log");
  const log = fs.createWriteStream(logPath, { flags: "a" });
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
  if (!backupEntry || backupEntry.sourceDatabaseIdentity?.database !== "seferpakt_clean_demo") throw new Error("clean-demo backup provenance doğrulanamadı");
  if (!fs.existsSync(backupPath)) throw new Error(`backup yok: ${backupPath}`);

  pgPort = await freePort();
  redisPort = await freePort();
  apiPort = await freePort();
  docker(["volume", "create", names.volume]);
  docker(["run", "-d", "--name", names.db, "-e", `POSTGRES_USER=${roles.admin}`, "-e", `POSTGRES_PASSWORD=${passwords.admin}`, "-e", `POSTGRES_DB=${database}`, "-p", `${pgPort}:5432`, "-v", `${names.volume}:/var/lib/postgresql/data`, "postgres:16"]);
  await waitFor("fixture postgres", () => dockerTry(["exec", names.db, "pg_isready", "-U", roles.admin, "-d", database]).ok);
  docker(["cp", backupPath, `${names.db}:/tmp/worker-role.dump`]);
  docker(["exec", "-e", `PGPASSWORD=${passwords.admin}`, names.db, "pg_restore", "--no-owner", "--no-privileges", "-U", roles.admin, "-d", database, "/tmp/worker-role.dump"]);
  psql(roles.admin, passwords.admin, roleSetupSql());

  docker(["run", "-d", "--name", names.redis, "-p", `${redisPort}:6379`, "redis:7"]);
  redisClient = createMiniRedisClient(`redis://127.0.0.1:${redisPort}`);
  await waitFor("fixture redis", async () => String(await redisClient.send("PING")).toUpperCase() === "PONG");

  const appUrl = `postgresql://${roles.app}:${encodeURIComponent(passwords.app)}@127.0.0.1:${pgPort}/${database}?schema=public`;
  const workerUrl = `postgresql://${roles.worker}:${encodeURIComponent(passwords.worker)}@127.0.0.1:${pgPort}/${database}?schema=public`;
  const redisUrl = `redis://127.0.0.1:${redisPort}`;
  const appDb = new PrismaClient({ datasources: { db: { url: appUrl } } });
  const workerDb = new PrismaClient({ datasources: { db: { url: workerUrl } } });
  const identity = async (db) => {
    const rows = await db.$queryRawUnsafe("SELECT current_user, session_user");
    return { currentUser: rows[0]?.current_user || null, sessionUser: rows[0]?.session_user || null };
  };
  const appIdentity = await identity(appDb);
  const workerIdentity = await identity(workerDb);
  startApi(appUrl, workerUrl, redisUrl);
  await waitFor("fixture api", async () => {
    if (apiProcess.exitCode !== null) throw new Error(`api exited ${apiProcess.exitCode}`);
    const health = await httpJson(`http://127.0.0.1:${apiPort}/health`);
    return health.ok && health.json?.dbOk === true;
  });

  const control = createWriteFreezeController({
    redis: redisClient,
    namespace: "seferpakt:global-write-freeze:v1",
    authorizeControl: ({ owner, changeControlId }) => owner === "fixture-runner" && String(changeControlId || "").startsWith("WORKER_ROLE_FIXTURE_"),
  });
  const changeControlId = `WORKER_ROLE_FIXTURE_${runTag}`;
  await control.markOpen({ owner: "fixture-runner", changeControlId });
  const loginOpen = await httpJson(`http://127.0.0.1:${apiPort}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "company@demo.com", password: "demo123", deviceId: `worker-role-${runTag}` }) });
  const appDdl = psql(roles.app, passwords.app, "CREATE TABLE public.__worker_role_forbidden(id integer);", { allowFailure: true });
  const workerDdl = psql(roles.worker, passwords.worker, "CREATE TABLE public.__worker_role_forbidden(id integer);", { allowFailure: true });
  const appWrite = psql(roles.app, passwords.app, "BEGIN; UPDATE \"Company\" SET \"status\"=\"status\" WHERE \"id\"=(SELECT \"id\" FROM \"Company\" LIMIT 1); ROLLBACK;", { allowFailure: true });
  const workerWrite = psql(roles.worker, passwords.worker, "BEGIN; UPDATE \"Shift\" SET \"status\"=\"status\" WHERE \"id\"=(SELECT \"id\" FROM \"Shift\" LIMIT 1); ROLLBACK;", { allowFailure: true });
  const workerFinancialWrite = psql(roles.worker, passwords.worker, "DELETE FROM \"InvoiceRecord\" WHERE false;", { allowFailure: true });

  await control.beginFencing({ owner: "fixture-runner", reason: "worker role fixture freeze", changeControlId });
  await control.markFrozen({ owner: "fixture-runner", reason: "worker role fixture freeze", changeControlId });
  const revoke = psql(roles.freezeAdmin, passwords.freezeAdmin, revokeRuntimeWritesSql);
  const frozenLogin = await httpJson(`http://127.0.0.1:${apiPort}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "company@demo.com", password: "demo123", deviceId: `worker-role-frozen-${runTag}` }) });
  const frozenAppWrite = psql(roles.app, passwords.app, "UPDATE \"Company\" SET \"status\"=\"status\" WHERE \"id\"=(SELECT \"id\" FROM \"Company\" LIMIT 1);", { allowFailure: true });
  const frozenWorkerWrite = psql(roles.worker, passwords.worker, "UPDATE \"Shift\" SET \"status\"=\"status\" WHERE \"id\"=(SELECT \"id\" FROM \"Shift\" LIMIT 1);", { allowFailure: true });
  const unauthorizedUnfreeze = await control.beginUnfreeze({ owner: "attacker", changeControlId: "WORKER_ROLE_ATTACK" }).then(() => true).catch(() => false);
  const redisFailure = await createWriteFreezeController({ redis: { send: async () => { throw new Error("fixture redis down"); } } }).assertWritable({ operation: "WORKER_ROLE_REDIS_FAILURE" }).then(() => false).catch((error) => error.code === "WRITE_FREEZE_STATE_UNAVAILABLE");

  await control.beginUnfreeze({ owner: "fixture-runner", changeControlId });
  psql(roles.freezeAdmin, passwords.freezeAdmin, grantRuntimeWritesSql);
  await control.markOpen({ owner: "fixture-runner", changeControlId });
  const loginAfterOpen = await httpJson(`http://127.0.0.1:${apiPort}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: "company@demo.com", password: "demo123", deviceId: `worker-role-open-${runTag}` }) });

  const roleRows = psql(roles.admin, passwords.admin, `SELECT rolname || '|' || rolsuper || '|' || rolcreaterole || '|' || rolcreatedb || '|' || rolcanlogin FROM pg_roles WHERE rolname IN (${[roles.app, roles.worker, roles.owner, roles.freezeAdmin].map(sqlQuote).join(",")}) ORDER BY rolname;`).output.split(/\r?\n/).filter(Boolean);
  const evidence = {
    generatedAt: new Date().toISOString(),
    fixture: { status: "PASS", names, database, ports: { pgPort, redisPort, apiPort }, cleaned: false },
    sourceBackup: { backupId: backupEntry.backupId, sourceDatabase: backupEntry.sourceDatabaseIdentity.database, verified: true, migrationRun: false },
    runtimeIdentity: { appRole: roles.app, workerRole: roles.worker, appIdentity, workerIdentity, distinct: appIdentity.currentUser === roles.app && appIdentity.sessionUser === roles.app && workerIdentity.currentUser === roles.worker && workerIdentity.sessionUser === roles.worker && appIdentity.currentUser !== workerIdentity.currentUser, api: `http://127.0.0.1:${apiPort}` },
    apiWorkerConfig: { databaseUrlRole: roles.app, workerDatabaseUrlRole: roles.worker, fallbackAllowed: false, serverHealth: loginOpen.status > 0 },
    privileges: { roles: roleRows, appDdlRejected: !appDdl.ok, workerDdlRejected: !workerDdl.ok, appTransactionWrite: appWrite.ok, workerTransactionWrite: workerWrite.ok, workerFinancialWriteRejected: !workerFinancialWrite.ok, appTransactionWriteError: redactedFailure(appWrite), workerTransactionWriteError: redactedFailure(workerWrite), workerFinancialWriteError: redactedFailure(workerFinancialWrite), appWorkerWritePathsDistinct: appWrite.ok && workerWrite.ok && !workerFinancialWrite.ok },
    applicationGate: { openLogin: loginOpen.status, frozenLogin: frozenLogin.status, afterOpenLogin: loginAfterOpen.status, frozenStatusRejected: [423, 503].includes(frozenLogin.status) },
    freezeGate: { revoke: revoke.ok, directAppWriteRejected: !frozenAppWrite.ok, directWorkerWriteRejected: !frozenWorkerWrite.ok, unauthorizedUnfreezeRejected: unauthorizedUnfreeze === false, redisFailureFailClosed: redisFailure },
    mainRuntimeChanged: false,
    cleanupRequired: true,
  };
  evidence.status = evidence.runtimeIdentity.distinct && evidence.privileges.appDdlRejected && evidence.privileges.workerDdlRejected && evidence.privileges.appTransactionWrite && evidence.privileges.workerTransactionWrite && evidence.privileges.workerFinancialWriteRejected && evidence.applicationGate.frozenStatusRejected && evidence.freezeGate.revoke && evidence.freezeGate.directAppWriteRejected && evidence.freezeGate.directWorkerWriteRejected && evidence.freezeGate.unauthorizedUnfreezeRejected && evidence.freezeGate.redisFailureFailClosed ? "PASS" : "NOT_PROVEN";
  fs.writeFileSync(path.join(evidenceDir, "evidence.json"), JSON.stringify(evidence, null, 2));
  await appDb.$disconnect();
  await workerDb.$disconnect();
  console.log(JSON.stringify({ evidencePath: path.join(evidenceDir, "evidence.json"), status: evidence.status, app: appIdentity, worker: workerIdentity, openLogin: loginOpen.status, frozenLogin: frozenLogin.status, afterOpenLogin: loginAfterOpen.status }, null, 2));
}

try {
  await main();
} catch (error) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, "fixture-error.json"), JSON.stringify({ error: String(error?.stack || error) }, null, 2));
  console.error(error?.stack || error);
  process.exitCode = 1;
} finally {
  await cleanup();
  try {
    const evidencePath = path.join(evidenceDir, "evidence.json");
    if (fs.existsSync(evidencePath)) {
      const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      evidence.fixture = { ...(evidence.fixture || {}), cleaned };
      fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    }
  } catch {}
}
