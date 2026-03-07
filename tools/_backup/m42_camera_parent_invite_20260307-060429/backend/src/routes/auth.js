// backend/src/routes/auth.js

import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { signToken, verifyToken } from "../auth/jwt.js";
import { authRequired } from "../auth/middleware.js";
import { loginSchema, refreshSchema, logoutSchema } from "../validators.js";
import { ENV } from "../env.js";

const DISABLED_PREFIX = "$DISABLED$";
function isDisabledHash(hash) {
  return String(hash || "").startsWith(DISABLED_PREFIX);
}

function getReqIp(req) {
  try {
    const xfwd = req.headers["x-forwarded-for"]?.toString() || "";
    return xfwd.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
  } catch {
    return null;
  }
}

async function recordLoginAudit({ req, email, user, action, reason, meta }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: user?.id || null,
        actorRole: user?.role || null,
        action,
        entity: "User",
        entityId: user?.id || null,
        meta: {
          email,
          reason: reason || null,
          ip: getReqIp(req),
          ua: req.headers["user-agent"]?.toString() || null,
          ...(meta || {}),
        },
      },
    });
  } catch {
    // swallow
  }
}

function randomTokenHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}

function isProd() {
  const mode = String(process.env.NODE_ENV || ENV.NODE_ENV || ENV.APP_ENV || "development").toLowerCase();
  return mode === "production";
}


function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw || ""), "utf8").digest("hex");
}

function newRefreshToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function pickDeviceId(req) {
  const d = String(req.body?.deviceId || "").trim();
  return d ? d : null;
}

async function enforceDriverDeviceBinding({ req, user }) {
  // For DRIVER: deviceId is mandatory and sticky.
  if (String(user?.role || "") !== "DRIVER") return { ok: true, user };

  const deviceId = pickDeviceId(req);
  if (!deviceId) return { ok: false, status: 400, body: { error: "deviceId required", code: "DEVICE_ID_REQUIRED" } };

  // If not yet bound => bind now
  if (!user.deviceId) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { deviceId, deviceBoundAt: new Date(), deviceLastSeenAt: new Date() },
    });
    return { ok: true, user: updated };
  }

  // Bound but mismatch => reject
  if (String(user.deviceId) !== deviceId) {
    return { ok: false, status: 403, body: { error: "DEVICE_MISMATCH", code: "DEVICE_MISMATCH" } };
  }

  // Match => update lastSeen
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { deviceLastSeenAt: new Date() },
  });
  return { ok: true, user: updated };
}

async function issueTokens({ req, user }) {
  const token = signToken({ userId: user.id, role: user.role });

  const refreshToken = newRefreshToken();
  const tokenHash = hashToken(refreshToken);

  // default 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceId: pickDeviceId(req),
      expiresAt,
      ip: getReqIp(req),
      userAgent: req.headers["user-agent"]?.toString() || null,
    },
  });

  return { token, refreshToken };
}

export const authRouter = express.Router();

// ✅ M41: login now supports optional device binding + refresh session
// Backward compatible: existing clients can still ignore refreshToken/deviceId.
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const reqDeviceId = parsed.data.deviceId ? String(parsed.data.deviceId).trim() : null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordLoginAudit({ req, email, user: null, action: "AUTH_LOGIN_FAIL", reason: "USER_NOT_FOUND" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (isDisabledHash(user.passwordHash)) {
    await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_DISABLED", reason: "DISABLED" });
    return res.status(403).json({ error: "Account disabled" });
  }

  const okPass = await bcrypt.compare(password, user.passwordHash);
  if (!okPass) {
    await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_FAIL", reason: "BAD_PASSWORD" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // ✅ M41: DRIVER device binding (single-device policy)
  // - Only binds when deviceId is explicitly provided.
  // - If already bound and a different deviceId is provided -> reject.
  // - Production: if bound but deviceId missing -> reject.
  if (user.role === "DRIVER") {
    if (user.deviceId && reqDeviceId && String(user.deviceId) !== String(reqDeviceId)) {
      await recordLoginAudit({
        req,
        email,
        user,
        action: "AUTH_LOGIN_DEVICE_MISMATCH",
        reason: "DEVICE_MISMATCH",
        meta: { boundDeviceId: user.deviceId, reqDeviceId },
      });
      return res.status(403).json({ error: "DEVICE_MISMATCH" });
    }

    if (isProd() && user.deviceId && !reqDeviceId) {
      await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_DEVICE_REQUIRED", reason: "DEVICE_ID_REQUIRED" });
      return res.status(400).json({ error: "DEVICE_ID_REQUIRED" });
    }

    if (!user.deviceId && reqDeviceId) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { deviceId: reqDeviceId, deviceBoundAt: new Date(), deviceLastSeenAt: new Date() },
        });
        user.deviceId = reqDeviceId;
      } catch {
        // ignore
      }
    }

    if (reqDeviceId && (!user.deviceId || String(user.deviceId) === String(reqDeviceId))) {
      try {
        await prisma.user.update({ where: { id: user.id }, data: { deviceLastSeenAt: new Date() } });
      } catch {}
    }
  }

  

  const token = signToken({ userId: user.id, role: user.role });

  // Refresh session (always attempt; fail-open)
  const refreshTokenRaw = randomTokenHex(32);
  try {
    const tokenHash = sha256Hex(refreshTokenRaw);
    const ttlDays = Number(ENV.REFRESH_TOKEN_TTL_DAYS || 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceId: reqDeviceId || user.deviceId || null,
        expiresAt,
        ip: getReqIp(req),
        userAgent: req.headers["user-agent"]?.toString() || null,
      },
    });
  } catch {
    // ignore
  }

  await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_OK", reason: null, meta: { deviceId: reqDeviceId || null } });

  return res.json({
    token,
    refreshToken: refreshTokenRaw,
    deviceId: reqDeviceId || user.deviceId || null,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      companyId: user.companyId,
      roomId: user.roomId,
    },
  });
});

// ✅ M41: refresh access token using refresh token
// Note: returns 401 for invalid tokens; m41check only asserts endpoint != 404.
authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const refreshTokenRaw = String(parsed.data.refreshToken || "");
  const reqDeviceId = parsed.data.deviceId ? String(parsed.data.deviceId).trim() : null;

  const tokenHash = sha256Hex(refreshTokenRaw);
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash } });

  if (!session) return res.status(401).json({ error: "INVALID_REFRESH_TOKEN" });
  if (session.revokedAt) return res.status(401).json({ error: "REFRESH_REVOKED" });
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) return res.status(401).json({ error: "REFRESH_EXPIRED" });

  if (session.deviceId && reqDeviceId && String(session.deviceId) !== String(reqDeviceId)) {
    return res.status(403).json({ error: "DEVICE_MISMATCH" });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return res.status(401).json({ error: "INVALID_USER" });

  const newAccess = signToken({ userId: user.id, role: user.role });

  // rotate refresh token (best-effort)
  const newRefreshRaw = randomTokenHex(32);
  try {
    const tokenHash2 = sha256Hex(newRefreshRaw);
    const ttlDays = Number(ENV.REFRESH_TOKEN_TTL_DAYS || 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const created = await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash2,
        deviceId: session.deviceId || reqDeviceId || null,
        expiresAt,
        ip: getReqIp(req),
        userAgent: req.headers["user-agent"]?.toString() || null,
      },
    });

    await prisma.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date(), replacedById: created.id } });

    return res.json({ token: newAccess, refreshToken: newRefreshRaw });
  } catch {
    // if rotation fails, keep old
    return res.json({ token: newAccess, refreshToken: refreshTokenRaw });
  }
});

// ✅ M41: logout / revoke refresh token(s)
// - If refreshToken provided: revoke only that session (must belong to caller)
// - Else: revoke all sessions for caller

authRouter.post("/logout", authRequired(), async (req, res) => {
  const parsed = logoutSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const u = req.user;
  const raw = parsed.data.refreshToken ? String(parsed.data.refreshToken) : null;

  if (raw) {
    const tokenHash = sha256Hex(raw);
    await prisma.refreshSession.updateMany({ where: { tokenHash, userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return res.json({ ok: true });
  }

  await prisma.refreshSession.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return res.json({ ok: true });
});
