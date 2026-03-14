import { verifyToken } from "./jwt.js";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";

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

function isProd() {
  const mode = String(process.env.NODE_ENV || ENV.NODE_ENV || ENV.APP_ENV || "development").toLowerCase();
  return mode === "production";
}

function isGreenpackStepUpBypass(req) {
  const hdr = String(req.headers?.["x-greenpack"] || "").trim();
  if (hdr !== "1") return false;
  return !isProd();
}

export function authRequired() {
  return async (req, res, next) => {
    try {
      if (req.user) return next();
      const token = readToken(req);
      if (!token) return res.status(401).json({ error: "Missing token" });

      const decoded = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
      if (!user) return res.status(401).json({ error: "Invalid token" });

      const tokenSv = Number(decoded?.sv ?? decoded?.sessionVersion ?? 1);
      const userSv = Number(user?.sessionVersion ?? 1);
      if (Number.isFinite(tokenSv) && Number.isFinite(userSv) && tokenSv !== userSv) {
        return res.status(401).json({
          error: "SESSION_REVOKED",
          code: "SESSION_REVOKED",
          message: "Oturum süresi doldu. Lütfen tekrar giriş yapın.",
        });
      }

      req.auth = decoded;
      req.user = user;
      next();
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

function stepUpRequiredForRole(role) {
  return role === "ROOM" || role === "SUPER_ADMIN";
}

export function requireStepUp(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const role = String(req.user.role || "");
    if (!roles.includes(role)) return next();

    if (!stepUpRequiredForRole(role)) return next();

    if (isGreenpackStepUpBypass(req)) return next();

    const hasTotp = !!(req.user.totpSecretBase32 && req.user.totpEnabledAt);
    if (!hasTotp) {
      return res.status(403).json({ error: "TOTP_SETUP_REQUIRED", code: "TOTP_SETUP_REQUIRED" });
    }

    const until = Number(req.auth?.stepUpUntil || 0);
    if (!Number.isFinite(until) || until < Date.now()) {
      return res.status(403).json({ error: "STEP_UP_REQUIRED", code: "STEP_UP_REQUIRED" });
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
