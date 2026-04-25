// backend/src/bootstrap/rateLimits.js
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../middleware/rateLimitRedisStore.js";
import { isGreenpackBypassAllowed } from "../auth/securityPolicy.js";

export function createApiRateLimiters({ ENV, verifyToken, rateLimitStoreMode, getRedis }) {
  const useRedisRateLimitStore = String(rateLimitStoreMode || "").toLowerCase() === "redis";
  const redis = useRedisRateLimitStore ? getRedis() : null;

  function rlStore(prefix, windowMs) {
    if (!useRedisRateLimitStore || !redis) return undefined;
    return new RedisRateLimitStore({ redis, windowMs, prefix });
  }

  function greenpackSkip(req) {
    return isGreenpackBypassAllowed(req);
  }

  function readBearerToken(req) {
    const authHeader = String(req.get("authorization") || "");
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? String(match[1] || "") : "";
  }

  function authKey(req) {
    const token = String(req.get("x-auth-token") || "") || readBearerToken(req);
    if (token) {
      try {
        const decoded = verifyToken(String(token));
        const userId = decoded?.userId ?? decoded?.id;
        if (userId) return `u:${userId}`;
      } catch {}
      return `t:${token.slice(0, 24)}`;
    }
    return `ip:${req.ip}`;
  }

  function authActionKey(req) {
    const token = String(req.get("x-auth-token") || "") || readBearerToken(req);
    if (token) return authKey(req);

    const refreshToken = String(req.body?.refreshToken || "").trim();
    if (refreshToken) return `ip:${req.ip}|refresh:${refreshToken.slice(0, 24)}`;

    const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const deviceId = String(req.body?.deviceId || "").trim().toLowerCase();
    return `ip:${req.ip}|identifier:${identifier}|device:${deviceId}`;
  }

  function limiter429Handler(req, res) {
    const resetTime = req.rateLimit?.resetTime instanceof Date ? req.rateLimit.resetTime.getTime() : null;
    const retryAfterSec = resetTime ? Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)) : null;
    const message = retryAfterSec
      ? `Çok kısa sürede çok sayıda işlem gönderildi. ${retryAfterSec} sn sonra tekrar deneyin.`
      : "Çok kısa sürede çok sayıda işlem gönderildi. Lütfen biraz bekleyip tekrar deneyin.";
    return res.status(429).json({
      error: "RATE_LIMITED",
      code: "RATE_LIMITED",
      message,
      retryAfterSec,
      path: req.originalUrl || req.path || null,
    });
  }

  function buildLimiter(options) {
    return rateLimit({
      ...options,
      standardHeaders: true,
      legacyHeaders: false,
      skip: greenpackSkip,
      handler: limiter429Handler,
    });
  }

  const authLimiter = buildLimiter({
    windowMs: ENV.AUTH_RATE_LIMIT_WINDOW_MS,
    max: ENV.AUTH_RATE_LIMIT_MAX,
    store: rlStore("auth:", ENV.AUTH_RATE_LIMIT_WINDOW_MS),
    keyGenerator: (req) => {
      const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      return `ip:${req.ip}|identifier:${identifier}`;
    },
  });

  const authActionWindowMs = Math.min(Number(ENV.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000), 10 * 60 * 1000);
  const authActionLimiter = buildLimiter({
    windowMs: authActionWindowMs,
    max: Math.max(5, Math.min(Number(ENV.AUTH_RATE_LIMIT_MAX || 10), 10)),
    store: rlStore("auth-action:", authActionWindowMs),
    keyGenerator: authActionKey,
  });

  const readLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: ENV.READ_RATE_LIMIT_MAX,
    store: rlStore("read:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readSummaryLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(180, Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2),
    store: rlStore("read-summary:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readPreviewLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(180, Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2),
    store: rlStore("read-preview:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readDirectoryLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(240, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.2)),
    store: rlStore("read-directory:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readOfferLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.8)),
    store: rlStore("read-offer:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readPeopleLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.8)),
    store: rlStore("read-people:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readLiveShiftLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 2.8)),
    store: rlStore("read-live-shift:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readReportLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 3)),
    store: rlStore("read-report:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const readScoreLimiter = buildLimiter({
    windowMs: ENV.READ_RATE_LIMIT_WINDOW_MS,
    max: Math.max(260, Math.round(Number(ENV.READ_RATE_LIMIT_MAX || 120) * 3)),
    store: rlStore("read-score:", ENV.READ_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const writeLimiter = buildLimiter({
    windowMs: ENV.WRITE_RATE_LIMIT_WINDOW_MS,
    max: ENV.WRITE_RATE_LIMIT_MAX,
    store: rlStore("write:", ENV.WRITE_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const guidedDraftCreateLimiter = buildLimiter({
    windowMs: ENV.WRITE_RATE_LIMIT_WINDOW_MS,
    max: Math.max(120, Math.round(Number(ENV.WRITE_RATE_LIMIT_MAX || 60) * 3)),
    store: rlStore("write-guided-draft:", ENV.WRITE_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const stopGenerateWriteLimiter = buildLimiter({
    windowMs: ENV.WRITE_RATE_LIMIT_WINDOW_MS,
    max: Math.max(180, Math.round(Number(ENV.WRITE_RATE_LIMIT_MAX || 60) * 4)),
    store: rlStore("write-stop-generate:", ENV.WRITE_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const gpsLimiter = buildLimiter({
    windowMs: ENV.GPS_RATE_LIMIT_WINDOW_MS,
    max: ENV.GPS_RATE_LIMIT_MAX,
    store: rlStore("gps:", ENV.GPS_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  const telematicsLimiter = buildLimiter({
    windowMs: ENV.TELEMATICS_RATE_LIMIT_WINDOW_MS,
    max: ENV.TELEMATICS_RATE_LIMIT_MAX,
    store: rlStore("telematics:", ENV.TELEMATICS_RATE_LIMIT_WINDOW_MS),
    keyGenerator: (req) => {
      const auth = String(req.get("authorization") || req.get("x-device-key") || req.get("x-telematics-secret") || "").trim();
      return auth ? `tele:${auth.slice(0, 32)}` : `ip:${req.ip}`;
    },
  });

  const exportLimiter = buildLimiter({
    windowMs: ENV.EXPORT_RATE_LIMIT_WINDOW_MS,
    max: ENV.EXPORT_RATE_LIMIT_MAX,
    store: rlStore("export:", ENV.EXPORT_RATE_LIMIT_WINDOW_MS),
    keyGenerator: authKey,
  });

  function isSummaryReadPath(req) {
    const pathname = String(req.path || "");
    return (
      pathname === "/company/overview/workflow-summary" ||
      pathname === "/company/overview/commercial-flow-summary" ||
      pathname === "/trust-quality/company/summary"
    );
  }

  function isReportReadPath(req) {
    return /^\/reports\/(shifts|drivers|vehicles|stops)\/summary$/.test(String(req.path || ""));
  }

  function isScoreReadPath(req) {
    return String(req.path || "") === "/trust-quality/provider-scores";
  }

  function isPreviewReadPath(req) {
    return /^\/shifts\/\d+\/route-preview$/.test(String(req.path || ""));
  }

  function isOfferReadPath(req) {
    return String(req.path || "") === "/offers/company";
  }

  function isPeopleReadPath(req) {
    return String(req.path || "") === "/company/personels";
  }

  function isLiveShiftReadPath(req) {
    const pathname = String(req.path || "");
    if (pathname !== "/shifts") return false;
    const onlyNow = String(req.query?.onlyNow || "0") === "1";
    const status = String(req.query?.status || "");
    return onlyNow || status.includes("APPROVED") || status.includes("ACTIVE");
  }

  function isDirectoryReadPath(req) {
    const pathname = String(req.path || "");
    return pathname === "/rooms" || pathname === "/vehicles" || pathname === "/agreements";
  }


  function isGuidedDraftCreateWritePath(req) {
    const pathname = String(req.path || "");
    if (String(req.method || "GET").toUpperCase() !== "POST") return false;
    if (pathname === "/shifts/guided-batch") return true;
    if (pathname !== "/shifts") return false;
    return String(req.body?.status || "").toUpperCase() === "DRAFT";
  }

  function isStopGenerateWritePath(req) {
    if (String(req.method || "GET").toUpperCase() !== "POST") return false;
    const pathname = String(req.path || "");
    return pathname === "/shifts/stops/generate-batch" || /^\/shifts\/\d+\/stops\/generate$/.test(pathname);
  }

  function apiLimiterMiddleware(req, res, next) {
    if (req.path.startsWith("/auth")) return next();
    if (req.path.startsWith("/gps")) return next();
    if (req.path.startsWith("/telematics")) return next();

    if (req.method === "GET") {
      if (isSummaryReadPath(req)) return readSummaryLimiter(req, res, next);
      if (isReportReadPath(req)) return readReportLimiter(req, res, next);
      if (isScoreReadPath(req)) return readScoreLimiter(req, res, next);
      if (isPreviewReadPath(req)) return readPreviewLimiter(req, res, next);
      if (isOfferReadPath(req)) return readOfferLimiter(req, res, next);
      if (isPeopleReadPath(req)) return readPeopleLimiter(req, res, next);
      if (isLiveShiftReadPath(req)) return readLiveShiftLimiter(req, res, next);
      if (isDirectoryReadPath(req)) return readDirectoryLimiter(req, res, next);
      return readLimiter(req, res, next);
    }

    if (isGuidedDraftCreateWritePath(req)) return guidedDraftCreateLimiter(req, res, next);
    if (isStopGenerateWritePath(req)) return stopGenerateWriteLimiter(req, res, next);
    return writeLimiter(req, res, next);
  }

  return {
    authLimiter,
    authActionLimiter,
    gpsLimiter,
    telematicsLimiter,
    exportLimiter,
    apiLimiterMiddleware,
  };
}
