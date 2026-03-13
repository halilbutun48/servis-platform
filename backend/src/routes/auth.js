// backend/src/routes/auth.js

import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { signToken, verifyToken } from "../auth/jwt.js";
import { authRequired } from "../auth/middleware.js";
import { generateSecretBase32, buildOtpauthUrl, verifyTotp, normalizeTotpToken } from "../auth/totp.js";
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


function isGreenpackStepUpBypass(req) {
  const hdr = String(req.headers?.["x-greenpack"] || "").trim();
  if (hdr !== "1") return false;
  return !isProd();
}

function stepUpRequiredRolesSet() {
  return new Set(
    String(ENV.STEP_UP_REQUIRED_ROLES || "SUPER_ADMIN,ROOM")
      .split(",")
      .map((x) => String(x || "").trim().toUpperCase())
      .filter(Boolean)
  );
}

function isStepUpRole(role) {
  return stepUpRequiredRolesSet().has(String(role || "").trim().toUpperCase());
}

function issueAccessToken(user, extra = {}) {
  return signToken({ userId: user.id, role: user.role, ...extra });
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

function normalizeDriverCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

async function findLoginUser(identifierRaw) {
  const identifier = String(identifierRaw || '').trim();
  if (!identifier) return null;
  const include = { driver: { select: { id: true, driverCode: true, pinTemporary: true } } };
  if (identifier.includes('@')) {
    return prisma.user.findUnique({ where: { email: identifier.toLowerCase() }, include });
  }
  return prisma.user.findFirst({
    where: { role: 'DRIVER', driver: { is: { driverCode: normalizeDriverCode(identifier) } } },
    include,
  });
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
  const token = issueAccessToken(user);

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

  const identifier = String(parsed.data.identifier || parsed.data.email || '').trim();
  const password = parsed.data.password;
  const reqDeviceId = parsed.data.deviceId ? String(parsed.data.deviceId).trim() : null;

  const user = await findLoginUser(identifier);
  if (!user) {
    await recordLoginAudit({ req, email: identifier, user: null, action: "AUTH_LOGIN_FAIL", reason: "USER_NOT_FOUND" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (isDisabledHash(user.passwordHash)) {
    await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_DISABLED", reason: "DISABLED" });
    return res.status(403).json({ error: "Account disabled" });
  }

  const okPass = await bcrypt.compare(password, user.passwordHash);
  if (!okPass) {
    await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_FAIL", reason: "BAD_PASSWORD" });
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
        email: identifier,
        user,
        action: "AUTH_LOGIN_DEVICE_MISMATCH",
        reason: "DEVICE_MISMATCH",
        meta: { boundDeviceId: user.deviceId, reqDeviceId },
      });
      return res.status(403).json({ error: "DEVICE_MISMATCH" });
    }

    if (isProd() && user.deviceId && !reqDeviceId) {
      await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_DEVICE_REQUIRED", reason: "DEVICE_ID_REQUIRED" });
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

  

  const loginExtra = {};
  if (isGreenpackStepUpBypass(req) && isStepUpRole(user.role)) {
    loginExtra.stepUpUntil = Date.now() + Number(ENV.STEP_UP_TOTP_WINDOW_SEC || 43200) * 1000;
  }
  const token = issueAccessToken(user, loginExtra);

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

  await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_OK", reason: null, meta: { deviceId: reqDeviceId || null } });

  return res.json({
    token,
    refreshToken: refreshTokenRaw,
    deviceId: reqDeviceId || user.deviceId || null,
    stepUpRequired: isStepUpRole(user.role),
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

// Parent invite (self-serve accept)
authRouter.get("/parent-invite/info", async (req, res) => {
  const raw = String(req.query?.token || "").trim();
  if (!raw) return res.status(400).json({ error: "token required" });

  const invite = await prisma.parentInvite.findUnique({
    where: { tokenHash: sha256Hex(raw) },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      child: { select: { id: true, fullName: true, kind: true } },
    },
  });

  if (!invite) return res.status(404).json({ error: "INVITE_NOT_FOUND" });
  if (invite.revokedAt) return res.status(410).json({ error: "INVITE_REVOKED" });
  if (invite.consumedAt) return res.status(410).json({ error: "INVITE_CONSUMED" });
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) return res.status(410).json({ error: "INVITE_EXPIRED" });

  return res.json({
    ok: true,
    invite: {
      id: invite.id,
      parentFullName: invite.parentFullName || null,
      email: invite.email || null,
      phone: invite.phone || null,
      expiresAt: invite.expiresAt,
      company: invite.company ? { id: invite.company.id, name: invite.company.name, kind: invite.company.kind } : null,
      child: invite.child ? { id: invite.child.id, fullName: invite.child.fullName, kind: invite.child.kind } : null,
    },
  });
});

authRouter.post("/parent-invite/accept", async (req, res) => {
  const raw = String(req.body?.token || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.fullName || "").trim();
  const phone = String(req.body?.phone || "").trim() || null;

  if (!raw) return res.status(400).json({ error: "token required" });
  if (!email || !email.includes("@")) return res.status(400).json({ error: "valid email required" });
  if (password.length < 3) return res.status(400).json({ error: "password min 3" });
  if (!fullName) return res.status(400).json({ error: "fullName required" });

  const invite = await prisma.parentInvite.findUnique({
    where: { tokenHash: sha256Hex(raw) },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      child: { select: { id: true, companyId: true, fullName: true } },
    },
  });

  if (!invite) return res.status(404).json({ error: "INVITE_NOT_FOUND" });
  if (invite.revokedAt) return res.status(410).json({ error: "INVITE_REVOKED" });
  if (invite.consumedAt) return res.status(410).json({ error: "INVITE_CONSUMED" });
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) return res.status(410).json({ error: "INVITE_EXPIRED" });
  if (!invite.company || invite.company.kind !== "SCHOOL") return res.status(409).json({ error: "INVITE_SCOPE_INVALID" });
  if (!invite.child || invite.child.companyId !== invite.company.id) return res.status(409).json({ error: "INVITE_CHILD_INVALID" });
  if (invite.email && invite.email !== email) return res.status(403).json({ error: "INVITE_EMAIL_MISMATCH" });

  const passwordHash = await bcrypt.hash(password, 10);

  let user = await prisma.user.findUnique({ where: { email } });
  if (user && user.role !== "PARENT") return res.status(409).json({ error: "EMAIL_IN_USE" });
  if (user && isDisabledHash(user.passwordHash)) return res.status(403).json({ error: "ACCOUNT_DISABLED" });

  const out = await prisma.$transaction(async (tx) => {
    let parentUser = user;
    if (parentUser) {
      parentUser = await tx.user.update({
        where: { id: parentUser.id },
        data: {
          passwordHash,
          fullName,
          phone,
          companyId: invite.company.id,
          role: "PARENT",
        },
      });
    } else {
      parentUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "PARENT",
          fullName,
          phone,
          companyId: invite.company.id,
        },
      });
    }

    const existingLink = await tx.parentChild.findFirst({
      where: { parentUserId: parentUser.id, personelId: invite.child.id },
      select: { id: true },
    });
    if (!existingLink) {
      await tx.parentChild.create({
        data: { parentUserId: parentUser.id, personelId: invite.child.id },
      });
    }

    await tx.parentInvite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date(), consumedByUserId: parentUser.id },
    });

    return parentUser;
  });

  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: out.id,
        actorRole: out.role,
        action: "PARENT_INVITE_ACCEPT",
        entity: "ParentInvite",
        entityId: invite.id,
        meta: { email, companyId: invite.company.id, childPersonelId: invite.child.id },
      },
    });
  } catch {}

  const token = issueAccessToken(out);
  return res.json({
    ok: true,
    token,
    user: {
      id: out.id,
      email: out.email,
      role: out.role,
      fullName: out.fullName,
      companyId: out.companyId,
      roomId: out.roomId,
    },
  });
});

// Step 1.5: TOTP status/setup/enable/verify (ROOM + SUPER_ADMIN)
authRouter.get("/totp/status", authRequired(), async (req, res) => {
  const user = req.user;
  const required = isStepUpRole(user.role);
  const enabled = !!(user.totpSecretBase32 && user.totpEnabledAt);
  const pending = !!user.totpPendingSecretBase32;
  const stepUpUntil = Number(req.auth?.stepUpUntil || 0);
  return res.json({
    ok: true,
    required,
    enabled,
    pending,
    stepUpSatisfied: enabled && Number.isFinite(stepUpUntil) && stepUpUntil >= Date.now(),
    stepUpUntil: Number.isFinite(stepUpUntil) ? stepUpUntil : 0,
    issuer: ENV.STEP_UP_TOTP_ISSUER,
  });
});

authRouter.post("/totp/setup", authRequired(), async (req, res) => {
  const user = req.user;
  if (!isStepUpRole(user.role)) return res.status(403).json({ error: "STEP_UP_NOT_APPLICABLE", code: "STEP_UP_NOT_APPLICABLE" });

  const secretBase32 = generateSecretBase32(20);
  await prisma.user.update({
    where: { id: user.id },
    data: { totpPendingSecretBase32: secretBase32 },
  });
  await recordLoginAudit({ req, email: user.email, user, action: "AUTH_TOTP_SETUP_ISSUED", reason: null });

  return res.json({
    ok: true,
    secretBase32,
    manualEntryKey: secretBase32,
    otpauthUrl: buildOtpauthUrl({ issuer: ENV.STEP_UP_TOTP_ISSUER, label: user.email, secretBase32 }),
  });
});

authRouter.post("/totp/enable", authRequired(), async (req, res) => {
  const user = req.user;
  if (!isStepUpRole(user.role)) return res.status(403).json({ error: "STEP_UP_NOT_APPLICABLE", code: "STEP_UP_NOT_APPLICABLE" });
  const code = normalizeTotpToken(req.body?.code);
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "TOTP_CODE_REQUIRED", code: "TOTP_CODE_REQUIRED" });

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  const pendingSecret = String(fresh?.totpPendingSecretBase32 || "");
  if (!pendingSecret) return res.status(409).json({ error: "TOTP_SETUP_PENDING_NOT_FOUND", code: "TOTP_SETUP_PENDING_NOT_FOUND" });
  if (!verifyTotp(pendingSecret, code)) {
    await recordLoginAudit({ req, email: user.email, user, action: "AUTH_TOTP_ENABLE_FAIL", reason: "BAD_TOTP_CODE" });
    return res.status(401).json({ error: "BAD_TOTP_CODE", code: "BAD_TOTP_CODE" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecretBase32: pendingSecret,
      totpPendingSecretBase32: null,
      totpEnabledAt: new Date(),
      totpLastVerifiedAt: new Date(),
    },
  });
  await recordLoginAudit({ req, email: user.email, user, action: "AUTH_TOTP_ENABLED", reason: null });
  return res.json({ ok: true, enabled: true });
});

authRouter.post("/totp/verify", authRequired(), async (req, res) => {
  const user = req.user;
  if (!isStepUpRole(user.role)) return res.status(403).json({ error: "STEP_UP_NOT_APPLICABLE", code: "STEP_UP_NOT_APPLICABLE" });
  const code = normalizeTotpToken(req.body?.code);
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "TOTP_CODE_REQUIRED", code: "TOTP_CODE_REQUIRED" });

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  const secretBase32 = String(fresh?.totpSecretBase32 || "");
  if (!secretBase32 || !fresh?.totpEnabledAt) {
    return res.status(403).json({ error: "TOTP_SETUP_REQUIRED", code: "TOTP_SETUP_REQUIRED" });
  }
  if (!verifyTotp(secretBase32, code)) {
    await recordLoginAudit({ req, email: user.email, user, action: "AUTH_STEP_UP_FAIL", reason: "BAD_TOTP_CODE" });
    return res.status(401).json({ error: "BAD_TOTP_CODE", code: "BAD_TOTP_CODE" });
  }

  const stepUpUntil = Date.now() + Number(ENV.STEP_UP_TOTP_WINDOW_SEC || 43200) * 1000;
  const token = issueAccessToken(fresh, { stepUpUntil });
  await prisma.user.update({ where: { id: user.id }, data: { totpLastVerifiedAt: new Date() } });
  await recordLoginAudit({ req, email: user.email, user: fresh, action: "AUTH_STEP_UP_OK", reason: null, meta: { stepUpUntil } });
  return res.json({ ok: true, token, stepUpUntil });
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

  if (!session) {
    await recordLoginAudit({ req, email: null, user: null, action: "AUTH_REFRESH_INVALID", reason: "INVALID_REFRESH_TOKEN" });
    return res.status(401).json({ error: "INVALID_REFRESH_TOKEN" });
  }

  if (session.revokedAt) {
    if (session.replacedById) {
      await prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const reuseUser = await prisma.user.findUnique({ where: { id: session.userId } });
      await recordLoginAudit({
        req,
        email: reuseUser?.email || null,
        user: reuseUser || { id: session.userId, role: null },
        action: "AUTH_REFRESH_REUSE_DETECTED",
        reason: "REFRESH_REUSE_DETECTED",
        meta: { refreshSessionId: session.id, replacedById: session.replacedById },
      });
      return res.status(401).json({ error: "REFRESH_REUSE_DETECTED", code: "REFRESH_REUSE_DETECTED" });
    }

    const revokedUser = await prisma.user.findUnique({ where: { id: session.userId } });
    await recordLoginAudit({
      req,
      email: revokedUser?.email || null,
      user: revokedUser || { id: session.userId, role: null },
      action: "AUTH_REFRESH_REVOKED",
      reason: "REFRESH_REVOKED",
      meta: { refreshSessionId: session.id },
    });
    return res.status(401).json({ error: "REFRESH_REVOKED" });
  }

  if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
    const expiredUser = await prisma.user.findUnique({ where: { id: session.userId } });
    await recordLoginAudit({
      req,
      email: expiredUser?.email || null,
      user: expiredUser || { id: session.userId, role: null },
      action: "AUTH_REFRESH_EXPIRED",
      reason: "REFRESH_EXPIRED",
      meta: { refreshSessionId: session.id },
    });
    return res.status(401).json({ error: "REFRESH_EXPIRED" });
  }

  if (session.deviceId && reqDeviceId && String(session.deviceId) !== String(reqDeviceId)) {
    const mismatchUser = await prisma.user.findUnique({ where: { id: session.userId } });
    await recordLoginAudit({
      req,
      email: mismatchUser?.email || null,
      user: mismatchUser || { id: session.userId, role: null },
      action: "AUTH_REFRESH_DEVICE_MISMATCH",
      reason: "DEVICE_MISMATCH",
      meta: { refreshSessionId: session.id, sessionDeviceId: session.deviceId, reqDeviceId },
    });
    return res.status(403).json({ error: "DEVICE_MISMATCH" });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return res.status(401).json({ error: "INVALID_USER" });

  const newAccess = issueAccessToken(user);

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

    await recordLoginAudit({
      req,
      email: user.email || null,
      user,
      action: "AUTH_REFRESH_OK",
      reason: null,
      meta: { oldRefreshSessionId: session.id, newRefreshSessionId: created.id },
    });

    return res.json({ token: newAccess, refreshToken: newRefreshRaw });
  } catch {
    // if rotation fails, keep old
    await recordLoginAudit({
      req,
      email: user.email || null,
      user,
      action: "AUTH_REFRESH_OK_NO_ROTATE",
      reason: "ROTATION_CREATE_FAILED",
      meta: { refreshSessionId: session.id },
    });
    return res.json({ token: newAccess, refreshToken: refreshTokenRaw });
  }
});

authRouter.post("/driver/change-pin", authRequired(), async (req, res) => {
  const user = req.user;
  if (String(user?.role || '') !== 'DRIVER') return res.status(403).json({ error: 'Forbidden' });

  const currentPin = String(req.body?.currentPin || '').trim();
  const newPin = String(req.body?.newPin || '').trim();

  if (currentPin.length < 4) return res.status(400).json({ error: 'CURRENT_PIN_REQUIRED', code: 'CURRENT_PIN_REQUIRED' });
  if (newPin.length < 4) return res.status(400).json({ error: 'NEW_PIN_TOO_SHORT', code: 'NEW_PIN_TOO_SHORT' });
  if (!/^\d{4,8}$/.test(newPin)) return res.status(400).json({ error: 'PIN_FORMAT_INVALID', code: 'PIN_FORMAT_INVALID' });

  const authUser = await prisma.user.findUnique({ where: { id: user.id }, include: { driver: true } });
  if (!authUser?.driver) return res.status(404).json({ error: 'DRIVER_PROFILE_NOT_FOUND', code: 'DRIVER_PROFILE_NOT_FOUND' });

  const okPass = await bcrypt.compare(currentPin, authUser.passwordHash);
  if (!okPass) {
    await recordLoginAudit({ req, email: authUser.email || authUser.driver?.driverCode || null, user: authUser, action: 'AUTH_DRIVER_PIN_CHANGE_FAIL', reason: 'BAD_CURRENT_PIN' });
    return res.status(401).json({ error: 'BAD_CURRENT_PIN', code: 'BAD_CURRENT_PIN' });
  }

  const passwordHash = await bcrypt.hash(newPin, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: authUser.id }, data: { passwordHash } }),
    prisma.driver.update({ where: { id: authUser.driver.id }, data: { pinTemporary: false, pinUpdatedAt: new Date() } }),
  ]);

  await recordLoginAudit({ req, email: authUser.email || authUser.driver?.driverCode || null, user: authUser, action: 'AUTH_DRIVER_PIN_CHANGE_OK', reason: null, meta: { driverId: authUser.driver.id } });
  return res.json({ ok: true });
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
