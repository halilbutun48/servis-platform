import crypto from "crypto";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";

const runtime = {
  startedAt: new Date(),
  requestIdsIssued: 0,
  requestIdsAccepted: 0,
  suspiciousUserAgentBlocked: 0,
  traceMethodBlocked: 0,
  forwardedForSeen: 0,
  forwardedProtoSeen: 0,
  lastRequestId: null,
  lastBlockedAt: null,
};

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cross-origin-opener-policy": "same-origin",
};

function clampInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

function sanitizeRequestId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 128);
}

function blockedNeedles() {
  return String(ENV.EDGE_BLOCKED_UA_NEEDLES || "")
    .split(",")
    .map((x) => String(x || "").trim().toLowerCase())
    .filter(Boolean);
}

export function getEdgeClientIp(req) {
  const xfwd = String(req.headers?.["x-forwarded-for"] || "").trim();
  if (xfwd) {
    const first = xfwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || null;
}

export function edgeRequestContext(req, res, next) {
  const accepted = sanitizeRequestId(req.get("x-request-id") || req.get("x-correlation-id"));
  const requestId = accepted || crypto.randomUUID();

  req.requestId = requestId;
  req.edgeClientIp = getEdgeClientIp(req);
  res.setHeader("x-request-id", requestId);

  runtime.lastRequestId = requestId;
  if (accepted) runtime.requestIdsAccepted += 1;
  else runtime.requestIdsIssued += 1;
  if (req.headers?.["x-forwarded-for"]) runtime.forwardedForSeen += 1;
  if (req.headers?.["x-forwarded-proto"]) runtime.forwardedProtoSeen += 1;

  next();
}

export function applyEdgeSecurityHeaders(_req, res, next) {
  if (!ENV.EDGE_SECURITY_HEADERS_ENABLED) return next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
  return next();
}

export function edgeSecurityGuard(req, res, next) {
  if (!ENV.EDGE_SECURITY_ENABLED) return next();

  const method = String(req.method || "GET").toUpperCase();
  if (ENV.EDGE_BLOCK_TRACE_METHOD && method === "TRACE") {
    runtime.traceMethodBlocked += 1;
    runtime.lastBlockedAt = new Date().toISOString();
    return res.status(405).json({
      error: "EDGE_BLOCKED",
      code: "TRACE_METHOD_BLOCKED",
      message: "TRACE method kapalı.",
      requestId: req.requestId,
    });
  }

  if (ENV.EDGE_BLOCK_SUSPICIOUS_UA) {
    const ua = String(req.get("user-agent") || "").toLowerCase();
    const match = blockedNeedles().find((needle) => ua.includes(needle));
    if (match) {
      runtime.suspiciousUserAgentBlocked += 1;
      runtime.lastBlockedAt = new Date().toISOString();
      return res.status(403).json({
        error: "EDGE_BLOCKED",
        code: "SUSPICIOUS_USER_AGENT",
        message: "İstek güvenlik filtresine takıldı.",
        requestId: req.requestId,
      });
    }
  }

  return next();
}

export function getEdgeSecurityPolicySummary() {
  const windowMinutes = Math.max(1, clampInt(ENV.EDGE_SNAPSHOT_WINDOW_MINUTES, 60));
  return {
    enabled: ENV.EDGE_SECURITY_ENABLED,
    requestIdHeader: "x-request-id",
    trustProxyHops: ENV.TRUST_PROXY_HOPS,
    suspiciousUserAgentGuardEnabled: ENV.EDGE_BLOCK_SUSPICIOUS_UA,
    traceMethodBlocked: ENV.EDGE_BLOCK_TRACE_METHOD,
    securityHeadersEnabled: ENV.EDGE_SECURITY_HEADERS_ENABLED,
    securityHeaders: { ...SECURITY_HEADERS },
    blockedUserAgentNeedles: blockedNeedles(),
    snapshotWindowMinutes: windowMinutes,
    notes: [
      "Bu katman WAF yerine geçmez; uygulama içi temel edge guard sağlar.",
      "Prod ortamında proxy / LB üzerinde HTTPS, rate-limit ve log bağlantısı korunmalıdır.",
    ],
  };
}

export function getEdgeSecurityHealthSummary() {
  return {
    enabled: ENV.EDGE_SECURITY_ENABLED,
    requestIdHeader: "x-request-id",
    startedAt: runtime.startedAt.toISOString(),
    requestIdsIssued: runtime.requestIdsIssued,
    requestIdsAccepted: runtime.requestIdsAccepted,
    blocked: {
      suspiciousUserAgent: runtime.suspiciousUserAgentBlocked,
      traceMethod: runtime.traceMethodBlocked,
    },
    forwardedHeadersSeen: {
      forwardedFor: runtime.forwardedForSeen,
      forwardedProto: runtime.forwardedProtoSeen,
    },
    lastRequestId: runtime.lastRequestId,
    lastBlockedAt: runtime.lastBlockedAt,
  };
}

export async function getEdgeSecuritySnapshot() {
  const windowMinutes = Math.max(1, clampInt(ENV.EDGE_SNAPSHOT_WINDOW_MINUTES, 60));
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const rows = await prisma.apiRequest.findMany({
    where: { createdAt: { gte: since } },
    select: { method: true, path: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }],
    take: 10000,
  }).catch(() => []);

  const totals = {
    total: rows.length,
    blocked403: 0,
    rateLimited429: 0,
    server5xx: 0,
    unauthorized401: 0,
  };
  const protectedPaths = new Map();

  for (const row of rows) {
    const status = Number(row.status || 0);
    const path = String(row.path || "");
    if (status === 401) totals.unauthorized401 += 1;
    if (status === 403) totals.blocked403 += 1;
    if (status === 429) totals.rateLimited429 += 1;
    if (status >= 500) totals.server5xx += 1;
    if (status === 403 || status === 429 || status >= 500) {
      protectedPaths.set(path, (protectedPaths.get(path) || 0) + 1);
    }
  }

  const topProtectedPaths = Array.from(protectedPaths.entries())
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

  const ratio5xxPct = totals.total > 0 ? Number(((totals.server5xx / totals.total) * 100).toFixed(2)) : 0;
  const ratio429Pct = totals.total > 0 ? Number(((totals.rateLimited429 / totals.total) * 100).toFixed(2)) : 0;

  const warnings = [];
  if (ratio5xxPct >= ENV.EDGE_WARN_5XX_RATIO_PCT) warnings.push("server5xxRatioPct");
  if (ratio429Pct >= ENV.EDGE_WARN_429_RATIO_PCT) warnings.push("rateLimited429RatioPct");

  return {
    ok: true,
    capturedAt: new Date().toISOString(),
    windowMinutes,
    policy: getEdgeSecurityPolicySummary(),
    runtime: getEdgeSecurityHealthSummary(),
    recentRequests: {
      total: totals.total,
      statusBuckets: totals,
      ratio5xxPct,
      ratio429Pct,
      topProtectedPaths,
    },
    assessment: warnings.length ? "WARN" : "OK",
    warnings,
    recommendations: warnings.length
      ? [
          "Proxy/LB tarafında rate-limit ve timeout değerlerini kontrol edin.",
          "5xx veya 429 artıyorsa en sıcak path ve upstream bağlantılarını inceleyin.",
        ]
      : ["Edge katmanı temel koruma sağlıyor; üretimde LB/WAF ile birlikte kullanın."],
  };
}
