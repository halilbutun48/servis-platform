#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_REQUEST_BUDGET = 40;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_DURATION_MS = 5000;
const DEFAULT_REQUEST_TIMEOUT_MS = 2500;
const REPORT_RELATIVE_PATH = "backend/artifacts/db-scaling/db_pool_and_api_scaling_01_report.json";
const REPORT_PATH = path.join(repoRoot, "backend", "artifacts", "db-scaling", "db_pool_and_api_scaling_01_report.json");

function parseBool(value) {
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

function parseIntBounded(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  const base = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, base));
}

function percentile(values, p) {
  const sorted = (values || []).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function normalizeBaseUrl(raw) {
  const parsed = new URL(String(raw || DEFAULT_BASE_URL));
  const host = String(parsed.hostname || "").toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("DB_SCALING_BASE_URL must stay local/dev-safe");
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function buildScenarios({ allowAuth }) {
  const scenarios = [
    {
      label: "health",
      path: "/health",
      auth: false,
      collectDbLatency: true,
    },
    {
      label: "dashboard-bulk-room-operation-health",
      path: "/api/dashboard/bulk?bundle=room-operation-health",
      auth: false,
      collectDbLatency: false,
    },
    {
      label: "dashboard-bulk-company-operations",
      path: "/api/dashboard/bulk?bundle=company-operations",
      auth: false,
      collectDbLatency: false,
    },
  ];

  if (allowAuth) {
    scenarios.push({
      label: "observability-health-summary",
      path: "/api/observability/health-summary",
      auth: true,
      collectDbLatency: false,
    });
  }

  return scenarios;
}

async function requestJson(baseUrl, scenario, { authToken, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const startedAt = Date.now();

  try {
    const url = new URL(scenario.path, `${baseUrl}/`);
    const headers = {};
    if (scenario.auth && authToken) {
      headers.authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { rawText: text.slice(0, 2000) };
      }
    }

    return {
      ok: response.ok && response.status < 400,
      status: response.status,
      durationMs: Date.now() - startedAt,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log("=== DB-POOL-AND-API-SCALING-01 PROBE ===");

  const baseUrl = normalizeBaseUrl(
    process.env.DB_SCALING_BASE_URL ||
      process.env.LOAD_TEST_BASE_URL ||
      process.env.API_URL ||
      DEFAULT_BASE_URL
  );
  const allowHighConcurrency = parseBool(process.env.DB_SCALING_ALLOW_HIGH_CONCURRENCY);
  const allowAuthEndpoints = parseBool(process.env.DB_SCALING_ALLOW_AUTH_ENDPOINTS);
  const planOnly = parseBool(process.env.DB_SCALING_PLAN_ONLY);
  const writeReport = parseBool(process.env.DB_SCALING_WRITE_REPORT);
  const authToken = String(process.env.DB_SCALING_AUTH_TOKEN || "").trim();

  if (allowAuthEndpoints && !authToken) {
    throw new Error("DB_SCALING_ALLOW_AUTH_ENDPOINTS=true requires DB_SCALING_AUTH_TOKEN");
  }

  const requestedBudget = parseIntBounded(process.env.DB_SCALING_REQUEST_BUDGET, DEFAULT_REQUEST_BUDGET, 1, 200);
  const requestedConcurrency = parseIntBounded(process.env.DB_SCALING_CONCURRENCY, DEFAULT_CONCURRENCY, 1, 8);
  const durationMs = parseIntBounded(process.env.DB_SCALING_DURATION_MS, DEFAULT_DURATION_MS, 1000, 30000);
  const requestTimeoutMs = parseIntBounded(process.env.DB_SCALING_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS, 500, 10000);

  if (!allowHighConcurrency) {
    if (requestedBudget > DEFAULT_REQUEST_BUDGET) {
      throw new Error("DB_SCALING_REQUEST_BUDGET > 40 requires DB_SCALING_ALLOW_HIGH_CONCURRENCY=true");
    }
    if (requestedConcurrency > DEFAULT_CONCURRENCY) {
      throw new Error("DB_SCALING_CONCURRENCY > 2 requires DB_SCALING_ALLOW_HIGH_CONCURRENCY=true");
    }
  }

  const requestBudget = requestedBudget;
  const concurrency = requestedConcurrency;
  const scenarios = buildScenarios({ allowAuth: allowAuthEndpoints });
  const scenarioPlan = scenarios.map((scenario) => `${scenario.label}:${scenario.path}`).join(", ");

  if (planOnly) {
    console.log(`baseUrl=${baseUrl}`);
    console.log(`requestBudget=${requestBudget}`);
    console.log(`concurrency=${concurrency}`);
    console.log(`durationMs=${durationMs}`);
    console.log(`requestTimeoutMs=${requestTimeoutMs}`);
    console.log(`scenarioPlan=${scenarioPlan}`);
    console.log("planOnly=true");
    return;
  }

  const deadline = Date.now() + durationMs;
  let nextIndex = 0;
  const results = [];
  const healthDbLatencies = [];

  async function worker() {
    while (Date.now() < deadline && nextIndex < requestBudget) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const scenario = scenarios[currentIndex % scenarios.length];
      let result;
      try {
        result = await requestJson(baseUrl, scenario, {
          authToken,
          timeoutMs: requestTimeoutMs,
        });
      } catch (error) {
        result = {
          ok: false,
          status: 0,
          durationMs: 0,
          body: null,
          error: error?.message || String(error),
        };
      }

      results.push({
        label: scenario.label,
        path: scenario.path,
        status: result.status,
        ok: result.ok,
        durationMs: result.durationMs,
        error: result.error || null,
      });

      if (scenario.collectDbLatency && Number.isFinite(Number(result.body?.dbLatencyMs))) {
        healthDbLatencies.push(Number(result.body.dbLatencyMs));
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const statusCounts = results.reduce(
    (acc, item) => {
      if (item.status <= 0) acc.networkError += 1;
      else if (item.status === 429) acc.rateLimited += 1;
      else if (item.status >= 500) acc.serverError += 1;
      else if (item.status >= 400) acc.clientError += 1;
      else acc.ok += 1;
      return acc;
    },
    { ok: 0, clientError: 0, serverError: 0, rateLimited: 0, networkError: 0 }
  );

  const summary = {
    baseUrl,
    requestBudget,
    concurrency,
    durationMs,
    requestTimeoutMs,
    scenarioPlan,
    totalRequests: results.length,
    statusCounts,
    healthDbLatencySamples: healthDbLatencies,
    healthDbLatencyP50: percentile(healthDbLatencies, 50),
    healthDbLatencyP95: percentile(healthDbLatencies, 95),
    healthDbLatencyP99: percentile(healthDbLatencies, 99),
    generatedAt: new Date().toISOString(),
  };

  console.log(`baseUrl=${summary.baseUrl}`);
  console.log(`requestBudget=${summary.requestBudget}`);
  console.log(`concurrency=${summary.concurrency}`);
  console.log(`durationMs=${summary.durationMs}`);
  console.log(`requestTimeoutMs=${summary.requestTimeoutMs}`);
  console.log(`scenarioPlan=${summary.scenarioPlan}`);
  console.log(`totalRequests=${summary.totalRequests}`);
  console.log(
    `statusCounts=ok:${summary.statusCounts.ok} clientError:${summary.statusCounts.clientError} serverError:${summary.statusCounts.serverError} rateLimited:${summary.statusCounts.rateLimited} networkError:${summary.statusCounts.networkError}`
  );
  console.log(`healthDbLatencyP50=${summary.healthDbLatencyP50}`);
  console.log(`healthDbLatencyP95=${summary.healthDbLatencyP95}`);
  console.log(`healthDbLatencyP99=${summary.healthDbLatencyP99}`);

  if (writeReport) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`reportPath=${REPORT_RELATIVE_PATH}`);
  } else {
    console.log("reportPath=disabled");
  }

  if (
    summary.statusCounts.clientError > 0 ||
    summary.statusCounts.serverError > 0 ||
    summary.statusCounts.rateLimited > 0 ||
    summary.statusCounts.networkError > 0
  ) {
    throw new Error("DB pool and API scaling probe detected client, server, rate limit, or network failures");
  }

  console.log("PASS DB-POOL-AND-API-SCALING-01 PROBE");
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
