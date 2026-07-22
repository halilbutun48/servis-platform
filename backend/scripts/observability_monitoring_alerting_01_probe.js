#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_REQUEST_TIMEOUT_MS = 2500;
const REPORT_RELATIVE_PATH = "backend/artifacts/observability/observability_monitoring_alerting_01_report.json";
const REPORT_PATH = path.join(repoRoot, "backend", "artifacts", "observability", "observability_monitoring_alerting_01_report.json");

function parseBool(value) {
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

function parseIntBounded(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  const base = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, base));
}

function normalizeBaseUrl(raw) {
  const parsed = new URL(String(raw || DEFAULT_BASE_URL));
  const host = String(parsed.hostname || "").toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("OBSERVABILITY_BASE_URL must stay local/dev-safe");
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

async function requestJson(baseUrl, pathName, { authToken, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const startedAt = Date.now();

  try {
    const url = new URL(pathName, `${baseUrl}/`);
    const headers = {};
    if (authToken) {
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
      path: pathName,
      ok: response.ok && response.status < 400,
      status: response.status,
      durationMs: Date.now() - startedAt,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

function maybeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  console.log("=== OBSERVABILITY-MONITORING-ALERTING-01 PROBE ===");

  const baseUrl = normalizeBaseUrl(
    process.env.OBSERVABILITY_BASE_URL ||
      process.env.DB_SCALING_BASE_URL ||
      process.env.LOAD_TEST_BASE_URL ||
      process.env.API_URL ||
      DEFAULT_BASE_URL
  );
  const allowAuthEndpoints = parseBool(process.env.OBSERVABILITY_ALLOW_AUTH_ENDPOINTS);
  const planOnly = parseBool(process.env.OBSERVABILITY_PLAN_ONLY);
  const writeReport = parseBool(process.env.OBSERVABILITY_WRITE_REPORT);
  const authToken = String(process.env.OBSERVABILITY_AUTH_TOKEN || "").trim();
  const requestTimeoutMs = parseIntBounded(process.env.OBSERVABILITY_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS, 500, 10000);

  if (allowAuthEndpoints && !authToken) {
    throw new Error("OBSERVABILITY_ALLOW_AUTH_ENDPOINTS=true requires OBSERVABILITY_AUTH_TOKEN");
  }

  const scenarios = [
    { label: "health", path: "/health", auth: false },
    { label: "observability-health-summary", path: "/api/observability/health-summary", auth: allowAuthEndpoints },
    { label: "observability-event-types", path: "/api/observability/event-types", auth: allowAuthEndpoints },
  ];

  const scenarioPlan = scenarios
    .filter((scenario) => !scenario.auth || allowAuthEndpoints)
    .map((scenario) => `${scenario.label}:${scenario.path}`)
    .join(", ");

  if (planOnly) {
    console.log(`baseUrl=${baseUrl}`);
    console.log(`requestTimeoutMs=${requestTimeoutMs}`);
    console.log(`allowAuthEndpoints=${allowAuthEndpoints}`);
    console.log(`scenarioPlan=${scenarioPlan}`);
    console.log("reportPath=disabled");
    console.log("planOnly=true");
    return;
  }

  const results = [];
  for (const scenario of scenarios) {
    if (scenario.auth && !allowAuthEndpoints) continue;
    let result;
    try {
      result = await requestJson(baseUrl, scenario.path, {
        authToken: scenario.auth ? authToken : "",
        timeoutMs: requestTimeoutMs,
      });
    } catch (error) {
      result = {
        path: scenario.path,
        ok: false,
        status: 0,
        durationMs: 0,
        body: null,
        error: error?.message || String(error),
      };
    }

    results.push({
      label: scenario.label,
      path: result.path,
      status: result.status,
      ok: result.ok,
      durationMs: result.durationMs,
      error: result.error || null,
      body: result.body,
    });
  }

  const health = results.find((item) => item.label === "health") || null;
  const summary = results.find((item) => item.label === "observability-health-summary") || null;
  const eventTypes = results.find((item) => item.label === "observability-event-types") || null;
  const healthBody = health?.body || {};
  const capacity = healthBody?.capacity || {};
  const summaryBody = summary?.body || {};
  const eventTypeItems = Array.isArray(eventTypes?.body?.items) ? eventTypes.body.items : [];
  const healthSummaryStatus = String(summaryBody?.status || "-");
  const healthDbLatencyMs = maybeNumber(healthBody?.dbLatencyMs);
  const observabilityWidgetCount = Array.isArray(summaryBody?.widgets) ? summaryBody.widgets.length : 0;
  const observabilityEventTypeCount = eventTypeItems.length;
  const report = {
    baseUrl,
    allowAuthEndpoints,
    requestTimeoutMs,
    scenarioPlan,
    results: results.map(({ label, path, status, ok, durationMs, error }) => ({
      label,
      path,
      status,
      ok,
      durationMs,
      error,
    })),
    healthSummaryStatus,
    healthDbLatencyMs,
    capacity: {
      inflight: maybeNumber(capacity?.inflight),
      peakInflight: maybeNumber(capacity?.peakInflight),
      wsClients: maybeNumber(capacity?.wsClients),
      peakWsClients: maybeNumber(capacity?.peakWsClients),
      eventLoopLagMs: maybeNumber(capacity?.eventLoopLagMs),
      eventLoopLagPeakMs: maybeNumber(capacity?.eventLoopLagPeakMs),
    },
    observabilityWidgetCount,
    observabilityEventTypeCount,
    generatedAt: new Date().toISOString(),
  };

  console.log(`baseUrl=${report.baseUrl}`);
  console.log(`requestTimeoutMs=${report.requestTimeoutMs}`);
  console.log(`allowAuthEndpoints=${report.allowAuthEndpoints}`);
  console.log(`scenarioPlan=${report.scenarioPlan}`);
  console.log(`healthSummaryStatus=${report.healthSummaryStatus}`);
  console.log(`healthDbLatencyMs=${report.healthDbLatencyMs}`);
  console.log(`capacityInflight=${report.capacity.inflight}`);
  console.log(`capacityPeakInflight=${report.capacity.peakInflight}`);
  console.log(`capacityEventLoopLagMs=${report.capacity.eventLoopLagMs}`);
  console.log(`observabilityWidgetCount=${report.observabilityWidgetCount}`);
  console.log(`observabilityEventTypeCount=${report.observabilityEventTypeCount}`);

  if (writeReport) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`reportPath=${REPORT_RELATIVE_PATH}`);
  } else {
    console.log("reportPath=disabled");
  }

  if (results.some((item) => !item.ok)) {
    throw new Error("OBSERVABILITY probe detected an HTTP, auth, or timeout failure");
  }

  console.log("PASS OBSERVABILITY-MONITORING-ALERTING-01 PROBE");
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
