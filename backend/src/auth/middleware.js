import { verifyToken } from "./jwt.js";
import { prisma } from "../prisma.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { getStepUpProvider, isGreenpackBypassAllowed, isStepUpRole, isTotpStepUpEnabled } from "./securityPolicy.js";

function readToken(req) {
  const header = req.headers["authorization"] || "";
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const t = header.slice(7).trim();
    if (t) return t;
  }

  const xt = req.headers["x-auth-token"];
  if (typeof xt === "string" && xt.trim()) return xt.trim();

  const xt2 = req.headers["X-Auth-Token"];
  if (typeof xt2 === "string" && xt2.trim()) return xt2.trim();

  return null;
}


const DRIVER_PRESENCE_TOUCH_WINDOW_MS = 45 * 1000;
const driverPresenceTouchCache = new Map();

async function touchDriverPresenceIfNeeded(user) {
  const role = String(user?.role || '').toUpperCase();
  if (role !== 'DRIVER' || !user?.id) return;

  const nowMs = Date.now();
  const lastSeenMs = user?.deviceLastSeenAt ? new Date(user.deviceLastSeenAt).getTime() : NaN;
  const lastTouchMs = Number(driverPresenceTouchCache.get(user.id) || 0);

  if (Number.isFinite(lastSeenMs) && nowMs - lastSeenMs <= DRIVER_PRESENCE_TOUCH_WINDOW_MS) return;
  if (Number.isFinite(lastTouchMs) && nowMs - lastTouchMs <= DRIVER_PRESENCE_TOUCH_WINDOW_MS) return;

  driverPresenceTouchCache.set(user.id, nowMs);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { deviceLastSeenAt: new Date(nowMs) },
    });
    user.deviceLastSeenAt = new Date(nowMs);
  } catch {
    // ignore presence touch errors
  }
}

export function authRequired() {
  return async (req, res, next) => {
    try {
      if (req.user) {
        if (String(req.user.passwordHash || "").startsWith("$DISABLED$")) {
          return sendErrorResponse(res, httpError(403, "ACCOUNT_DISABLED", "Account disabled"));
        }
        return next();
      }
      const token = readToken(req);
      if (!token) return sendErrorResponse(res, httpError(401, "MISSING_TOKEN", "Missing token"));

      const decoded = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
      if (!user) return sendErrorResponse(res, httpError(401, "INVALID_TOKEN", "Invalid token"));
      if (String(user.passwordHash || "").startsWith("$DISABLED$")) {
        return sendErrorResponse(res, httpError(403, "ACCOUNT_DISABLED", "Account disabled"));
      }

      const tokenSv = Number(decoded?.sv ?? decoded?.sessionVersion ?? 1);
      const userSv = Number(user?.sessionVersion ?? 1);
      if (Number.isFinite(tokenSv) && Number.isFinite(userSv) && tokenSv !== userSv) {
        return sendErrorResponse(res, httpError(401, "SESSION_REVOKED", "Oturum süresi doldu. Lütfen tekrar giriş yapın."));
      }

      const urlPath = String(req.originalUrl || req.url || "").split("?")[0];
      if (decoded?.pwdChangeOnly) {
        const allowedPaths = new Set(["/api/me", "/api/auth/change-password"]);
        if (!allowedPaths.has(urlPath)) {
          return sendErrorResponse(res, httpError(403, "PASSWORD_CHANGE_REQUIRED", "Şifre değişmeden bu alana geçilemez."));
        }
      }

      req.auth = decoded;
      req.user = user;
      await touchDriverPresenceIfNeeded(user);
      next();
    } catch (_e) {
      return sendErrorResponse(res, httpError(401, "UNAUTHORIZED", "Unauthorized"));
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendErrorResponse(res, httpError(401, "UNAUTHORIZED", "Unauthorized"));
    if (!roles.includes(req.user.role)) return sendErrorResponse(res, httpError(403, "FORBIDDEN", "Forbidden"));
    next();
  };
}

function stepUpRequiredForRole(role) {
  return isStepUpRole(role);
}

export function requireStepUp(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendErrorResponse(res, httpError(401, "UNAUTHORIZED", "Unauthorized"));
    const role = String(req.user.role || "");
    if (!roles.includes(role)) return next();

    if (!stepUpRequiredForRole(role)) return next();

    const provider = getStepUpProvider();
    if (provider === "sms") {
      return sendErrorResponse(res, httpError(503, "STEP_UP_PROVIDER_NOT_READY", "SMS doğrulama henüz bağlı değil."));
    }

    if (!isTotpStepUpEnabled()) {
      return sendErrorResponse(res, httpError(503, "STEP_UP_PROVIDER_NOT_READY", "TOTP step-up henüz bağlı değil."));
    }

    if (isGreenpackBypassAllowed(req)) return next();

    const hasTotp = !!(req.user.totpSecretBase32 && req.user.totpEnabledAt);
    if (!hasTotp) {
      return sendErrorResponse(res, httpError(403, "TOTP_SETUP_REQUIRED", "TOTP_SETUP_REQUIRED"));
    }

    const until = Number(req.auth?.stepUpUntil || 0);
    if (!Number.isFinite(until) || until < Date.now()) {
      return sendErrorResponse(res, httpError(403, "STEP_UP_REQUIRED", "STEP_UP_REQUIRED"));
    }
    return next();
  };
}

export function requireStepUpWrite(...roles) {
  const guard = requireStepUp(...roles);
  return (req, res, next) => {
    const method = String(req.method || "GET").toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
    return guard(req, res, next);
  };
}
