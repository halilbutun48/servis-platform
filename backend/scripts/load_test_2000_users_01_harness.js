#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_BASE_URL = process.env.LOAD_TEST_BASE_URL || process.env.API_URL || "http://localhost:3000";
const DEFAULT_USERS = 20;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_DURATION_MS = 10000;
const DEFAULT_REQUEST_TIMEOUT_MS = 4000;
const DEFAULT_REPORT_PATH = path.join(repoRoot, "backend", "artifacts", "load-test", "load_test_2000_users_01_report.json");

const ROLE_MATRIX = [
  {
    role: "personel-parent-live-read",
    sharePct: 35,
    endpointClass: "health / live-read",
    method: "GET",
    path: "/health",
    requiresAuth: false,
    note: "Public/dev-safe live-read proxy; auth endpoints stay opt-in only.",
  },
  {
    role: "company-operations-shifts-agreements",
    sharePct: 20,
    endpointClass: "dashboard bulk",
    method: "GET",
    path: "/api/dashboard/bulk?bundle=company-operations",
    requiresAuth: true,
    note: "Company operations / shifts / agreements read bundle.",
  },
  {
    role: "room-map-vehicles-operation-health",
    sharePct: 20,
    endpointClass: "dashboard bulk",
    method: "GET",
    path: "/api/dashboard/bulk?bundle=room-operation-health",
    requiresAuth: true,
    note: "Room map / vehicles / operation health read bundle.",
  },
  {
    role: "driver-route-map",
    sharePct: 10,
    endpointClass: "route preview read",
    method: "GET",
    path: "/api/shifts?take=1",
    requiresAuth: true,
    note: "Driver route / map read proxy; route preview stays read-only.",
  },
  {
    role: "school-organization-operations",
    sharePct: 10,
    endpointClass: "dashboard bulk",
    method: "GET",
    path: "/api/dashboard/bulk?bundle=school-operations",
    requiresAuth: true,
    note: "School / organization operations read bundle.",
  },
  {
    role: "superadmin-overview-audit-commercial",
    sharePct: 5,
    endpointClass: "dashboard bulk",
    method: "GET",
    path: "/api/dashboard/bulk?bundle=superadmin-overview",
    requiresAuth: true,
    note: "Superadmin overview / audit / commercial read bundle.",
  },
];

function parseIntEnv(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  let n = Math.trunc(parsed);
  if (Number.isFinite(min)) n = Math.max(min, n);
  if (Number.isFinite(max)) n = Math.min(max, n);
  return n;
}

function parseBool(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function normalizeBaseUrl(input) {
  const base = String(input || "").trim();
  if (!base) return DEFAULT_BASE_URL;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function isLocalBaseUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function allocateCounts(total, shares) {
  const raw = shares.map((share) => (total * share) / 100);
  const base = raw.map((value) => Math.floor(value));
  let remaining = total - base.reduce((sum, value) => sum + value, 0);
  const ranked = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const item of ranked) {
    if (remaining <= 0) break;
    base[item.index] += 1;
    remaining -= 1;
  }
  return base;
}

function buildScenarioPlan({ users, allowAuthEndpoints }) {
  const active = ROLE_MATRIX.filter((item) => !item.requiresAuth || allowAuthEndpoints);
  const counts = allocateCounts(users, active.map((item) => item.sharePct));
  const plan = [];
  active.forEach((item, index) => {
    for (let i = 0; i < counts[index]; i += 1) {
      plan.push({
        role: item.role,
        endpointClass: item.endpointClass,
        method: item.method,
        path: item.path,
        requiresAuth: item.requiresAuth,
        note: item.note,
      });
    }
  });
  return plan;
}

function summarizeMatrix(users, allowAuthEndpoints) {
  const active = ROLE_MATRIX.filter((item) => !item.requiresAuth || allowAuthEndpoints);
  const counts = allocateCounts(users, active.map((item) => item.sharePct));
  return active.map((item, index) => ({
    role: item.role,
    sharePct: item.sharePct,
    plannedUsers: counts[index],
    endpointClass: item.endpointClass,
    method: item.method,
    path: item.path,
    requiresAuth: item.requiresAuth,
    note: item.note,
  }));
}

function requestOnce(baseUrl, entry, { requestTimeoutMs, authToken } = {}) {
  const url = new URL(entry.path, baseUrl);
  const lib = url.protocol === "https:" ? https : http;
  const headers = {
    "User-Agent": "servis-platform-load-test/1.0",
    Accept: "application/json, text/plain, */*",
  };
  if (authToken && entry.requiresAuth) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const req = lib.request(
      {
        method: entry.method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers,
        timeout: requestTimeoutMs,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: Number(res.statusCode || 0),
            elapsedMs: Date.now() - startedAt,
            path: entry.path,
            role: entry.role,
            endpointClass: entry.endpointClass,
            requiresAuth: entry.requiresAuth,
            body: body.slice(0, 200),
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.on("error", (error) => {
      resolve({
        ok: false,
        status: 0,
        elapsedMs: Date.now() - startedAt,
        path: entry.path,
        role: entry.role,
        endpointClass: entry.endpointClass,
        requiresAuth: entry.requiresAuth,
        body: String(error?.message || error || "request error"),
      });
    });
    req.end();
  });
}

async function runLoadTest(config) {
  const plan = buildScenarioPlan(config);
  const deadline = Date.now() + config.durationMs;
  const records = [];
  const activePlan = plan.length > 0 ? plan : [{ role: "fallback-health", endpointClass: "health / live-read", method: "GET", path: "/health", requiresAuth: false, note: "Fallback public smoke probe." }];
  let cursor = 0;

  async function worker() {
    while (Date.now() < deadline) {
      const entry = activePlan[cursor % activePlan.length];
      cursor += 1;
      if (entry.requiresAuth && !config.allowAuthEndpoints) {
        records.push({
          ok: true,
          status: -1,
          elapsedMs: 0,
          path: entry.path,
          role: entry.role,
          endpointClass: entry.endpointClass,
          requiresAuth: entry.requiresAuth,
          body: "skipped-by-auth-policy",
        });
        continue;
      }
      const result = await requestOnce(config.baseUrl, entry, {
        requestTimeoutMs: config.requestTimeoutMs,
        authToken: config.authToken,
      });
      records.push(result);
      if (config.failOn429 && result.status === 429) {
        break;
      }
      if (result.status >= 500) {
        break;
      }
    }
  }

  const workerCount = Math.max(1, Math.min(config.concurrency, activePlan.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return { plan, records };
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function buildSummary(config, plan, records) {
  const measured = records.filter((row) => Number.isFinite(row.elapsedMs) && row.status !== -1);
  const latencyValues = measured.map((row) => Number(row.elapsedMs || 0));
  const byStatus = new Map();
  const byPath = new Map();
  for (const row of records) {
    const statusKey = String(row.status);
    byStatus.set(statusKey, Number(byStatus.get(statusKey) || 0) + 1);
    const pathKey = row.path;
    const rec = byPath.get(pathKey) || { path: pathKey, role: row.role, endpointClass: row.endpointClass, count: 0, status429: 0, status5xx: 0, ok2xx: 0, totalMs: 0 };
    rec.count += 1;
    rec.totalMs += Number(row.elapsedMs || 0);
    if (row.status === 429) rec.status429 += 1;
    if (row.status >= 500) rec.status5xx += 1;
    if (row.status >= 200 && row.status < 300) rec.ok2xx += 1;
    byPath.set(pathKey, rec);
  }

  const totalRequests = records.length;
  const totalErrors = records.filter((row) => !row.ok && row.status !== -1).length;
  const total429 = records.filter((row) => row.status === 429).length;
  const total5xx = records.filter((row) => row.status >= 500).length;
  const skippedByAuthPolicy = records.filter((row) => row.status === -1).length;
  const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
  const avgMs = latencyValues.length ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length) : 0;

  return {
    milestone: "LOAD-TEST-2000-USERS-01",
    baseUrl: config.baseUrl,
    mode: config.mode,
    users: config.users,
    concurrency: config.concurrency,
    durationMs: config.durationMs,
    requestTimeoutMs: config.requestTimeoutMs,
    allowHighConcurrency: config.allowHighConcurrency,
    allowAuthEndpoints: config.allowAuthEndpoints,
    authTokenProvided: Boolean(config.authToken),
    startedAt: config.startedAt,
    finishedAt: new Date().toISOString(),
    roleDistribution: summarizeMatrix(config.users, config.allowAuthEndpoints),
    endpointClassBudget: [
      { class: "dashboard bulk read", sharePct: 55, note: "Company / room / school / superadmin bulk bundles." },
      { class: "live-read / health", sharePct: 35, note: "Public health and live-read proxy." },
      { class: "route preview read", sharePct: 10, note: "Driver route / map proxy via GET only." },
      { class: "AI assistant read-only", sharePct: 0, note: "Excluded from default smoke-load; low-rate opt-in only." },
      { class: "write-action", sharePct: 0, note: "Excluded." },
    ],
    totals: {
      requests: totalRequests,
      errors: totalErrors,
      status429: total429,
      status5xx: total5xx,
      skippedByAuthPolicy,
      successful2xx: records.filter((row) => row.status >= 200 && row.status < 300).length,
    },
    latencyMs: {
      min: latencyValues.length ? Math.min(...latencyValues) : 0,
      avg: avgMs,
      p50: Math.round(percentile(latencyValues, 0.5)),
      p95: Math.round(percentile(latencyValues, 0.95)),
      p99: Math.round(percentile(latencyValues, 0.99)),
      max: latencyValues.length ? Math.max(...latencyValues) : 0,
    },
    errorRate,
    byStatus: Object.fromEntries([...byStatus.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
    byPath: [...byPath.values()]
      .map((row) => ({
        ...row,
        avgMs: row.count ? Math.round(row.totalMs / row.count) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path)),
    planSize: plan.length,
  };
}

function writeReport(reportPath, summary) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function printSummary(summary, reportPath) {
  console.log("=== LOAD-TEST-2000-USERS-01 HARNESS ===");
  console.log(`baseUrl=${summary.baseUrl}`);
  console.log(`mode=${summary.mode}`);
  console.log(`users=${summary.users}`);
  console.log(`concurrency=${summary.concurrency}`);
  console.log(`durationMs=${summary.durationMs}`);
  console.log(`requestTimeoutMs=${summary.requestTimeoutMs}`);
  console.log(`allowHighConcurrency=${summary.allowHighConcurrency}`);
  console.log(`allowAuthEndpoints=${summary.allowAuthEndpoints}`);
  console.log(`planSize=${summary.planSize}`);
  console.log(`requests=${summary.totals.requests}`);
  console.log(`errors=${summary.totals.errors}`);
  console.log(`429=${summary.totals.status429}`);
  console.log(`5xx=${summary.totals.status5xx}`);
  console.log(`skippedByAuthPolicy=${summary.totals.skippedByAuthPolicy}`);
  console.log(`errorRate=${summary.errorRate.toFixed(4)}`);
  console.log(`p50=${summary.latencyMs.p50}ms`);
  console.log(`p95=${summary.latencyMs.p95}ms`);
  console.log(`p99=${summary.latencyMs.p99}ms`);
  console.log(`reportPath=${reportPath}`);
  console.log("ROLE MATRIX");
  for (const row of summary.roleDistribution) {
    console.log(`- ${row.role} share=${row.sharePct}% planned=${row.plannedUsers} class=${row.endpointClass} path=${row.path} auth=${row.requiresAuth ? "yes" : "no"}`);
  }
  console.log("ENDPOINT BUDGET");
  for (const row of summary.endpointClassBudget) {
    console.log(`- ${row.class} share=${row.sharePct}% note=${row.note}`);
  }
  console.log("TOP PATHS");
  for (const row of summary.byPath.slice(0, 8)) {
    console.log(`- ${row.path} role=${row.role} count=${row.count} ok2xx=${row.ok2xx} 429=${row.status429} 5xx=${row.status5xx} avgMs=${row.avgMs}`);
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(DEFAULT_BASE_URL);
  const users = parseIntEnv(process.env.LOAD_TEST_USERS, DEFAULT_USERS, 1, 2000);
  const allowHighConcurrency = parseBool(process.env.LOAD_TEST_ALLOW_HIGH_CONCURRENCY);
  const allowAuthEndpoints = parseBool(process.env.LOAD_TEST_ALLOW_AUTH_ENDPOINTS);
  const planOnly = parseBool(process.env.LOAD_TEST_PLAN_ONLY);
  const failOn429 = true;
  const mode = planOnly ? "plan" : allowAuthEndpoints ? "auth-smoke" : "smoke";
  const concurrency = parseIntEnv(process.env.LOAD_TEST_CONCURRENCY, DEFAULT_CONCURRENCY, 1, allowHighConcurrency ? 64 : 16);
  const durationMs = parseIntEnv(process.env.LOAD_TEST_DURATION_MS, DEFAULT_DURATION_MS, 1000, allowHighConcurrency ? 60000 : 15000);
  const requestTimeoutMs = parseIntEnv(process.env.LOAD_TEST_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS, 1000, 30000);
  const reportPath = path.resolve(process.env.LOAD_TEST_REPORT_PATH || DEFAULT_REPORT_PATH);
  const authToken = String(process.env.LOAD_TEST_AUTH_TOKEN || "").trim() || null;

  if (!isLocalBaseUrl(baseUrl)) {
    throw new Error("LOAD_TEST_BASE_URL must stay local/dev-safe; non-local URLs are refused.");
  }
  if (users > 50 && !allowHighConcurrency) {
    throw new Error("LOAD_TEST_USERS above 50 requires LOAD_TEST_ALLOW_HIGH_CONCURRENCY=true.");
  }
  if (users >= 2000 && !allowHighConcurrency) {
    throw new Error("LOAD_TEST_USERS=2000 requires LOAD_TEST_ALLOW_HIGH_CONCURRENCY=true.");
  }
  if (allowAuthEndpoints && !authToken) {
    throw new Error("LOAD_TEST_ALLOW_AUTH_ENDPOINTS=true requires LOAD_TEST_AUTH_TOKEN.");
  }

  const config = {
    baseUrl,
    users,
    concurrency,
    durationMs,
    requestTimeoutMs,
    allowHighConcurrency,
    allowAuthEndpoints,
    authToken,
    mode,
    failOn429,
    startedAt: new Date().toISOString(),
  };

  const { plan, records } = planOnly ? { plan: buildScenarioPlan(config), records: [] } : await runLoadTest(config);
  const summary = buildSummary(config, plan, records);

  if (process.env.LOAD_TEST_WRITE_REPORT === "1") {
    writeReport(reportPath, summary);
  }

  printSummary(summary, reportPath);

  if (!planOnly) {
    if (summary.totals.status429 > 0) {
      throw new Error(`FAIL 429 detected -> ${summary.totals.status429}`);
    }
    if (summary.totals.status5xx > 0) {
      throw new Error(`FAIL 5xx detected -> ${summary.totals.status5xx}`);
    }
    if (summary.errorRate > 0) {
      throw new Error(`FAIL errorRate > 0 -> ${summary.errorRate}`);
    }
  }

  console.log("PASS LOAD-TEST-2000-USERS-01 HARNESS");
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
