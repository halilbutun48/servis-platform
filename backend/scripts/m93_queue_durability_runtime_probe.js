#!/usr/bin/env node
/**
 * M93 optional runtime probe.
 * Safe by default: reads queue health/proof endpoints only.
 * Use --drill for controlled Redis down/up, worker restart, and poison-job drills.
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ENV } from "../src/env.js";
import { createMiniRedisClient } from "../src/redis/miniRedis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const COMPOSE_FILE = path.join("infra", "docker-compose.yml");
const API_URL = String(process.env.API_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const TOKEN = String(process.env.SUPER_ADMIN_TOKEN || process.env.ADMIN_TOKEN || "").trim();
const REDIS_URL = String(process.env.AUTO_REACHED_DRILL_REDIS_URL || "redis://127.0.0.1:6379").trim();
const IS_DRILL = new Set(process.argv.slice(2)).has("--drill") || new Set(process.argv.slice(2)).has("--chaos");

async function get(path) {
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
  const res = await fetch(`${API_URL}${path}`, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

async function post(path, body = null) {
  const headers = { "content-type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

function runCompose(args, label) {
  const result = spawnSync("docker", ["compose", "-f", COMPOSE_FILE, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`${label}: ${String(result.error.message || result.error)}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

async function waitFor(label, predicate, timeoutMs = 45000, intervalMs = 1500) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await predicate();
      if (value) return value;
      lastError = null;
    } catch (e) {
      lastError = e;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`${label} timeout${lastError ? `: ${String(lastError?.message || lastError)}` : ""}`);
}

async function fetchProof() {
  return get("/api/admin/queues/auto-reached/proof");
}

async function fetchThresholds() {
  return get("/api/admin/queues/auto-reached/thresholds");
}

async function syncIncident() {
  return post("/api/admin/queues/auto-reached/incident-sync");
}

async function seedStaleClaim(taskId) {
  const redis = createMiniRedisClient(REDIS_URL);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const staleMs = nowMs - Number(ENV.AUTO_REACHED_PROCESSING_TTL_MS || 5 * 60 * 1000) - 60_000;
  const task = {
    queueTaskId: taskId,
    shiftId: 910001,
    stopId: 910002,
    vehicleId: 910003,
    attemptCount: 0,
    queuedAtIso: nowIso,
    atIso: nowIso,
    lockKey: `drill:${taskId}`,
    lockToken: `drill:${taskId}`,
    lockTtlMs: Number(ENV.AUTO_REACHED_LOCK_TTL_MS || 120000),
  };
  const raw = JSON.stringify(task);
  await redis.send("LPUSH", "gps:auto-reached:v1", raw);
  await redis.send("LPUSH", "gps:auto-reached:processing:v1", raw);
  await redis.send(
    "HSET",
    "gps:auto-reached:claims:v1",
    taskId,
    JSON.stringify({
      raw,
      claimedAtMs: staleMs,
      queueTaskId: taskId,
      attemptCount: 0,
      lockKey: task.lockKey,
      lockToken: task.lockToken,
      lockTtlMs: task.lockTtlMs,
    })
  );
  await redis.send("ZADD", "gps:auto-reached:claims:index:v1", String(staleMs), taskId);
  redis.quit();
}

async function seedPoisonJob(taskId) {
  const redis = createMiniRedisClient(REDIS_URL);
  const task = {
    queueTaskId: taskId,
    shiftId: 920001,
    stopId: 920002,
    // vehicleId intentionally omitted to force AUTO_REACHED_INVALID_TASK
    attemptCount: 0,
    queuedAtIso: new Date().toISOString(),
    atIso: new Date().toISOString(),
  };
  await redis.send("LPUSH", "gps:auto-reached:v1", JSON.stringify(task));
  redis.quit();
}

console.log("=== M93 QUEUE DURABILITY RUNTIME PROBE ===");
console.log(`API_URL=${API_URL}`);
if (!TOKEN) console.log("WARN SUPER_ADMIN_TOKEN/ADMIN_TOKEN not set; protected endpoints may return 401.");
if (IS_DRILL && !TOKEN) {
  console.error("FAIL --drill requires SUPER_ADMIN_TOKEN or ADMIN_TOKEN.");
  process.exit(1);
}

const paths = [
  "/api/admin/queues/auto-reached",
  "/api/admin/queues/auto-reached/thresholds",
  "/api/admin/queues/auto-reached/dead-letter",
  "/api/admin/queues/auto-reached/proof",
];

let failed = false;
for (const p of paths) {
  const r = await get(p);
  if (!r.ok) {
    failed = true;
    console.error(`FAIL ${p} -> ${r.status} ${String(r.text || "").slice(0, 300)}`);
  } else {
    console.log(`OK ${p}`);
    if (p.endsWith("/thresholds")) {
      console.log(`INFO threshold status=${r.json?.threshold?.status || "UNKNOWN"} warnings=${r.json?.threshold?.warnings?.length ?? "?"}`);
    }
  }
}

if (IS_DRILL) {
  console.log("=== M93 QUEUE DURABILITY DRILL ===");

  const baseline = await fetchProof();
  if (!baseline.ok) {
    console.error(`FAIL baseline proof -> ${baseline.status} ${String(baseline.text || "").slice(0, 300)}`);
    process.exit(1);
  }

  const baselineHealth = baseline.json?.health || {};
  console.log(
    `INFO baseline queue=${baselineHealth?.queue?.queueDepth ?? "?"} processing=${baselineHealth?.queue?.processingDepth ?? "?"} claims=${baselineHealth?.queue?.claimsDepth ?? "?"} dead=${baselineHealth?.queue?.deadLetterDepth ?? "?"}`
  );

  const preSync = await syncIncident();
  if (!preSync.ok) {
    console.error(`FAIL incident-sync baseline -> ${preSync.status} ${String(preSync.text || "").slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`OK incident-sync baseline phase=${preSync.json?.phase || "UNKNOWN"} severity=${preSync.json?.severity || "UNKNOWN"}`);

  console.log("DRILL redis down/up...");
  runCompose(["stop", "redis"], "docker compose stop redis");
  await waitFor(
    "redis down proof",
    async () => {
      const r = await fetchProof();
      if (!r.ok) return false;
      return r.json?.health?.redisConnected === false || String(r.json?.incident?.severity || "").toUpperCase() === "CRITICAL";
    },
    30000,
    1500
  );
  console.log("OK redis down observed");
  const redisDownSync = await syncIncident();
  if (!redisDownSync.ok) {
    console.error(`FAIL incident-sync redis-down -> ${redisDownSync.status} ${String(redisDownSync.text || "").slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`OK incident-sync redis-down phase=${redisDownSync.json?.phase || "UNKNOWN"} severity=${redisDownSync.json?.severity || "UNKNOWN"}`);

  runCompose(["start", "redis"], "docker compose start redis");
  await waitFor(
    "redis recovery proof",
    async () => {
      const r = await fetchProof();
      if (!r.ok) return false;
      return r.json?.health?.redisConnected === true;
    },
    30000,
    1500
  );
  console.log("OK redis recovery observed");
  const redisRecoverySync = await syncIncident();
  if (!redisRecoverySync.ok) {
    console.error(`FAIL incident-sync redis-recovery -> ${redisRecoverySync.status} ${String(redisRecoverySync.text || "").slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`OK incident-sync redis-recovery phase=${redisRecoverySync.json?.phase || "UNKNOWN"} severity=${redisRecoverySync.json?.severity || "UNKNOWN"}`);

  console.log("DRILL worker restart reclaim...");
  const staleTaskId = `M93_DRILL_STALE_${Date.now()}`;
  await seedStaleClaim(staleTaskId);
  runCompose(["restart", "api"], "docker compose restart api");
  await waitFor(
    "worker restart reclaim",
    async () => {
      const r = await fetchProof();
      if (!r.ok) return false;
      const runtime = r.json?.health?.runtime || {};
      const queue = r.json?.health?.queue || {};
      if (runtime.lastRequeuedTaskId === staleTaskId || runtime.lastDeadLetteredTaskId === staleTaskId) return true;
      return Number(queue.claimsDepth ?? 0) === 0;
    },
    60000,
    2000
  );
  console.log("OK worker restart reclaim observed");
  const workerSync = await syncIncident();
  if (!workerSync.ok) {
    console.error(`FAIL incident-sync worker-restart -> ${workerSync.status} ${String(workerSync.text || "").slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`OK incident-sync worker-restart phase=${workerSync.json?.phase || "UNKNOWN"} severity=${workerSync.json?.severity || "UNKNOWN"}`);

  console.log("DRILL poison job dead-letter...");
  const poisonTaskId = `M93_DRILL_POISON_${Date.now()}`;
  await seedPoisonJob(poisonTaskId);
  await waitFor(
    "poison job dead-letter",
    async () => {
      const r = await fetchProof();
      if (!r.ok) return false;
      const runtime = r.json?.health?.runtime || {};
      const dead = r.json?.deadLetter || {};
      if (runtime.lastDeadLetteredTaskId === poisonTaskId) return true;
      return Array.isArray(dead.items) && dead.items.some((item) => String(item?.queueTaskId || item?.taskId || "") === poisonTaskId);
    },
    60000,
    1500
  );
  console.log("OK poison job dead-letter observed");
  const poisonSync = await syncIncident();
  if (!poisonSync.ok) {
    console.error(`FAIL incident-sync poison-job -> ${poisonSync.status} ${String(poisonSync.text || "").slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`OK incident-sync poison-job phase=${poisonSync.json?.phase || "UNKNOWN"} severity=${poisonSync.json?.severity || "UNKNOWN"}`);

  const finalThresholds = await fetchThresholds();
  if (!finalThresholds.ok) {
    console.error(`FAIL final thresholds -> ${finalThresholds.status} ${String(finalThresholds.text || "").slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`INFO final threshold status=${finalThresholds.json?.threshold?.status || "UNKNOWN"} warnings=${finalThresholds.json?.threshold?.warnings?.length ?? "?"}`);
  console.log("M93 QUEUE DURABILITY DRILL PASS");
}

if (failed) process.exit(1);
console.log("M93 QUEUE DURABILITY RUNTIME PROBE PASS");
