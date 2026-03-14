// backend/src/ops/capacityLoadBaseline.js
import os from "os";
import { performance } from "perf_hooks";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";

const runtime = {
  startedAt: new Date(),
  inflight: 0,
  peakInflight: 0,
  wsClients: 0,
  peakWsClients: 0,
};

let eventLoopLagMs = 0;
let eventLoopLagPeakMs = 0;
let eventLoopLastMeasuredAt = new Date();
let monitorStarted = false;

function clampInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function percentile(values, p) {
  const arr = (values || []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!arr.length) return 0;
  const idx = Math.min(arr.length - 1, Math.max(0, Math.ceil((p / 100) * arr.length) - 1));
  return arr[idx];
}

function topEntries(mapLike, take = 5, mapFn = (key, value) => ({ key, value })) {
  return Array.from(mapLike.entries())
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, take)
    .map(([key, value]) => mapFn(key, value));
}

async function safeCount(run, fallback = 0) {
  try {
    const n = await run();
    return Number.isFinite(Number(n)) ? Number(n) : fallback;
  } catch {
    return fallback;
  }
}

export function startCapacityBaselineMonitor() {
  if (monitorStarted) return;
  monitorStarted = true;

  let last = performance.now();
  const intervalMs = 1000;
  const timer = setInterval(() => {
    const now = performance.now();
    const drift = Math.max(0, now - last - intervalMs);
    eventLoopLagMs = Math.round(drift);
    if (eventLoopLagMs > eventLoopLagPeakMs) eventLoopLagPeakMs = eventLoopLagMs;
    eventLoopLastMeasuredAt = new Date();
    last = now;
  }, intervalMs);
  timer.unref?.();
}

export function capacityRequestStarted() {
  runtime.inflight += 1;
  if (runtime.inflight > runtime.peakInflight) runtime.peakInflight = runtime.inflight;
}

export function capacityRequestFinished() {
  runtime.inflight = Math.max(0, runtime.inflight - 1);
}

export function capacityWsConnected() {
  runtime.wsClients += 1;
  if (runtime.wsClients > runtime.peakWsClients) runtime.peakWsClients = runtime.wsClients;
}

export function capacityWsDisconnected() {
  runtime.wsClients = Math.max(0, runtime.wsClients - 1);
}

export function getCapacityPolicySummary() {
  return {
    enabled: ENV.CAPACITY_BASELINE_ENABLED,
    windowMinutes: ENV.CAPACITY_BASELINE_WINDOW_MINUTES,
    thresholds: {
      avgRequestsPerMinuteWarn: ENV.CAPACITY_BASELINE_WARN_RPM,
      p95LatencyMsWarn: ENV.CAPACITY_BASELINE_WARN_P95_MS,
      ratio429WarnPct: ENV.CAPACITY_BASELINE_WARN_429_RATIO_PCT,
      inflightWarn: ENV.CAPACITY_BASELINE_WARN_INFLIGHT,
      wsConnectionsWarn: ENV.CAPACITY_BASELINE_WARN_WS_CONNECTIONS,
      eventLoopLagMsWarn: ENV.CAPACITY_BASELINE_WARN_EVENT_LOOP_LAG_MS,
    },
    rateLimitStore: ENV.RATE_LIMIT_STORE || "memory",
    gpsThrottleStore: ENV.GPS_THROTTLE_STORE || "memory",
    notes: [
      "Bu ekran kapasiteyi kesin garanti etmez; anlik durum ve baz cizgiyi gosterir.",
      "Uretimde Redis rate-limit store ve telematics ayrik kota korunmalidir.",
    ],
  };
}

export function getCapacityHealthSummary() {
  return {
    enabled: ENV.CAPACITY_BASELINE_ENABLED,
    startedAt: runtime.startedAt.toISOString(),
    inflight: runtime.inflight,
    peakInflight: runtime.peakInflight,
    wsClients: runtime.wsClients,
    peakWsClients: runtime.peakWsClients,
    eventLoopLagMs,
    eventLoopLagPeakMs,
    eventLoopLastMeasuredAt: eventLoopLastMeasuredAt.toISOString(),
  };
}

export async function getCapacitySnapshot() {
  const windowMinutes = Math.max(1, clampInt(ENV.CAPACITY_BASELINE_WINDOW_MINUTES, 15));
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const now = new Date();

  const [
    recentRequests,
    companies,
    rooms,
    vehicles,
    drivers,
    activeRefreshSessions,
  ] = await Promise.all([
    prisma.apiRequest
      .findMany({
        where: { createdAt: { gte: since } },
        select: { method: true, path: true, status: true, durationMs: true, createdAt: true },
        orderBy: [{ createdAt: "desc" }],
        take: 10000,
      })
      .catch(() => []),
    safeCount(() => prisma.company.count({ where: { status: { not: "DELETED" } } }), 0),
    safeCount(() => prisma.room.count({ where: { status: { not: "DELETED" } } }), 0),
    safeCount(() => prisma.vehicle.count({ where: { archivedAt: null } }), safeCount(() => prisma.vehicle.count(), 0)),
    safeCount(() => prisma.driver.count(), 0),
    safeCount(() => prisma.refreshSession.count({ where: { revokedAt: null, expiresAt: { gt: now } } }), 0),
  ]);

  const totalRequests = recentRequests.length;
  const avgRequestsPerMinute = Number((totalRequests / windowMinutes).toFixed(2));
  const lastMinuteSince = new Date(Date.now() - 60 * 1000);
  const lastMinuteRequests = recentRequests.filter((x) => new Date(x.createdAt) >= lastMinuteSince).length;
  const durations = recentRequests.map((x) => Number(x.durationMs || 0)).filter((x) => Number.isFinite(x));
  const latency = {
    avgMs: durations.length ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)) : 0,
    p95Ms: percentile(durations, 95),
    maxMs: durations.length ? Math.max(...durations) : 0,
  };

  const statusBuckets = { ok2xx: 0, redirect3xx: 0, client4xx: 0, server5xx: 0, rateLimited429: 0 };
  const methodCounts = new Map();
  const pathCounts = new Map();
  const slowPaths = new Map();

  for (const item of recentRequests) {
    const status = Number(item.status || 0);
    const method = String(item.method || "GET").toUpperCase();
    const path = String(item.path || "");
    const dur = Number(item.durationMs || 0);

    methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
    pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
    slowPaths.set(path, Math.max(slowPaths.get(path) || 0, dur));

    if (status === 429) statusBuckets.rateLimited429 += 1;
    else if (status >= 500) statusBuckets.server5xx += 1;
    else if (status >= 400) statusBuckets.client4xx += 1;
    else if (status >= 300) statusBuckets.redirect3xx += 1;
    else if (status >= 200) statusBuckets.ok2xx += 1;
  }

  const ratio429Pct = totalRequests > 0 ? Number(((statusBuckets.rateLimited429 / totalRequests) * 100).toFixed(2)) : 0;
  const topPaths = topEntries(pathCounts, 5, (path, count) => ({ path, count, maxDurationMs: slowPaths.get(path) || 0 }));
  const topMethods = topEntries(methodCounts, 5, (method, count) => ({ method, count }));

  const health = getCapacityHealthSummary();
  const policy = getCapacityPolicySummary();
  const warnings = [];
  if (avgRequestsPerMinute >= ENV.CAPACITY_BASELINE_WARN_RPM) warnings.push("avgRequestsPerMinute");
  if (latency.p95Ms >= ENV.CAPACITY_BASELINE_WARN_P95_MS) warnings.push("p95LatencyMs");
  if (ratio429Pct >= ENV.CAPACITY_BASELINE_WARN_429_RATIO_PCT) warnings.push("ratio429Pct");
  if (health.inflight >= ENV.CAPACITY_BASELINE_WARN_INFLIGHT) warnings.push("inflight");
  if (health.wsClients >= ENV.CAPACITY_BASELINE_WARN_WS_CONNECTIONS) warnings.push("wsClients");
  if (health.eventLoopLagMs >= ENV.CAPACITY_BASELINE_WARN_EVENT_LOOP_LAG_MS) warnings.push("eventLoopLagMs");

  return {
    ok: true,
    capturedAt: new Date().toISOString(),
    windowMinutes,
    policy,
    runtime: {
      requests: {
        total: totalRequests,
        avgRequestsPerMinute,
        lastMinuteRequests,
        ratio429Pct,
        statusBuckets,
        topMethods,
        topPaths,
        latency,
      },
      process: {
        pid: process.pid,
        uptimeSec: Math.round(process.uptime()),
        memoryRssMb: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(1)),
        loadAverage1m: Number((os.loadavg?.()[0] || 0).toFixed(2)),
      },
      realtime: health,
    },
    inventory: {
      companies,
      rooms,
      vehicles,
      drivers,
      activeRefreshSessions,
    },
    assessment: warnings.length ? "WARN" : "OK",
    warnings,
    recommendations: warnings.length
      ? [
          "Redis rate-limit store aktif kalmali.",
          "Refresh session sayisi ve 429 oranlari izlenmeli.",
          "Yuksek p95 varsa path bazli DB/IO darbogazi incelenmeli.",
        ]
      : ["Anlik gorunum saglikli; uretim testinde bu baz cizgi referans alinabilir."],
  };
}
