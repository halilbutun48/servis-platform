// backend/src/routes/auth.js

import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { signToken, verifyToken } from "../auth/jwt.js";
import { authRequired } from "../auth/middleware.js";
import { clearDriverPinFailureState, getDriverPinLockState, registerDriverPinFailure, validateNewDriverPin } from "../auth/driverAccessGuard.js";
import { generateSecretBase32, buildOtpauthUrl, verifyTotp, normalizeTotpToken } from "../auth/totp.js";
import { loginSchema, refreshSchema, logoutSchema } from "../validators.js";
import { ENV } from "../env.js";
import { clearPasswordChangeRequired, isPasswordChangeRequired } from "../auth/passwordChangeRequirementStore.js";
import { getPasswordPolicySummary, validatePasswordPolicy } from "../auth/passwordPolicy.js";
import { getEffectiveUsername, resolveUserIdByUsername, visibleEmail } from "../auth/usernameDirectory.js";

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

async function enforceMaxRefreshSessions(userId) {
  const max = Number(ENV.MAX_REFRESH_SESSIONS_PER_USER ?? 10);
  if (!Number.isFinite(max) || max <= 0) return;
  try {
    const extra = await prisma.refreshSession.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: max,
      take: 200,
    });
    const ids = extra.map((x) => x.id).filter(Boolean);
    if (!ids.length) return;
    await prisma.refreshSession.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
  } catch {
    // fail-open
  }
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

function accessExpiresInForUser(user) {
  if (String(user?.role || "") === "DRIVER") {
    const v = String(ENV.DRIVER_ACCESS_TOKEN_EXPIRES_IN || "").trim();
    if (v) return v;
  }
  return null;
}

function issueAccessToken(user, extra = {}) {
  const sv = Number(user?.sessionVersion ?? 1);
  const payload = { userId: user.id, role: user.role, sv, ...extra };
  const expiresIn = accessExpiresInForUser(user);
  return signToken(payload, expiresIn ? { expiresIn } : {});
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

  const userId = await resolveUserIdByUsername(prisma, identifier);
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include });
    if (user) return user;
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
    return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS", message: "Kimlik bilgileri hatalı." });
  }

  if (isDisabledHash(user.passwordHash)) {
    await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_DISABLED", reason: "DISABLED" });
    return res.status(403).json({ error: "Account disabled" });
  }

  if (user.role === "DRIVER") {
    const lock = await getDriverPinLockState(user.driver?.id || user.id);
    if (lock.locked) {
      await recordLoginAudit({
        req,
        email: identifier,
        user,
        action: "AUTH_DRIVER_PIN_LOCKED",
        reason: "PIN_LOCKED",
        meta: { driverId: user.driver?.id || null, cooldownSec: lock.cooldownSec, lockedUntil: lock.lockedUntil },
      });
      return res.status(423).json({
        error: "PIN_LOCKED",
        code: "PIN_LOCKED",
        message: `Çok fazla hatalı PIN denemesi oldu. ${lock.cooldownSec} saniye sonra tekrar deneyin.`,
        cooldownSec: lock.cooldownSec,
        lockedUntil: lock.lockedUntil,
      });
    }
  }

  const okPass = await bcrypt.compare(password, user.passwordHash);
  if (!okPass) {
    if (user.role === "DRIVER") {
      const failure = await registerDriverPinFailure(user.driver?.id || user.id);
      await recordLoginAudit({
        req,
        email: identifier,
        user,
        action: failure.locked ? "AUTH_DRIVER_PIN_LOCKED" : "AUTH_LOGIN_FAIL",
        reason: failure.locked ? "PIN_LOCKED" : "BAD_PASSWORD",
        meta: {
          driverId: user.driver?.id || null,
          failCount: failure.count,
          failLimit: failure.failLimit,
          cooldownSec: failure.cooldownSec || 0,
          lockedUntil: failure.lockedUntil || null,
        },
      });
      if (failure.locked) {
        return res.status(423).json({
          error: "PIN_LOCKED",
          code: "PIN_LOCKED",
          message: `Çok fazla hatalı PIN denemesi oldu. ${failure.cooldownSec} saniye sonra tekrar deneyin.`,
          cooldownSec: failure.cooldownSec,
          lockedUntil: failure.lockedUntil,
        });
      }
    } else {
      await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_FAIL", reason: "BAD_PASSWORD" });
    }
    return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS", message: "Kimlik bilgileri hatalı." });
  }

  if (user.role === "DRIVER") {
    await clearDriverPinFailureState(user.driver?.id || user.id);
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
        meta: { boundDeviceId: user.deviceId, reqDeviceId, driverId: user.driver?.id || null },
      });
      return res.status(403).json({ error: "DEVICE_MISMATCH", code: "DEVICE_MISMATCH", message: "Bu sürücü kodu başka bir cihaza bağlı görünüyor." });
    }

    if (isProd() && user.deviceId && !reqDeviceId) {
      await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_DEVICE_REQUIRED", reason: "DEVICE_ID_REQUIRED", meta: { driverId: user.driver?.id || null } });
      return res.status(400).json({ error: "DEVICE_ID_REQUIRED", code: "DEVICE_ID_REQUIRED", message: "Bu hesap için cihaz bilgisi gerekli." });
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

  

  const mustChangePassword = await isPasswordChangeRequired(user.id);

  const loginExtra = {};
  if (isGreenpackStepUpBypass(req) && isStepUpRole(user.role)) {
    loginExtra.stepUpUntil = Date.now() + Number(ENV.STEP_UP_TOTP_WINDOW_SEC || 43200) * 1000;
  }
  if (mustChangePassword && !isGreenpackStepUpBypass(req)) loginExtra.pwdChangeOnly = true;
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
    await enforceMaxRefreshSessions(user.id);
  } catch {
    // ignore
  }

  await recordLoginAudit({ req, email: identifier, user, action: "AUTH_LOGIN_OK", reason: null, meta: { deviceId: reqDeviceId || null, driverId: user.driver?.id || null, passwordChangeRequired: mustChangePassword } });

  return res.json({
    token,
    refreshToken: refreshTokenRaw,
    deviceId: reqDeviceId || user.deviceId || null,
    stepUpRequired: isStepUpRole(user.role),
    passwordChangeRequired: mustChangePassword,
    passwordPolicy: mustChangePassword ? getPasswordPolicySummary() : null,
    user: {
      id: user.id,
      username: getEffectiveUsername(user),
      email: visibleEmail(user.email),
      role: user.role,
      fullName: user.fullName,
      companyId: user.companyId,
      roomId: user.roomId,
    },
  });
});

authRouter.post("/change-password", authRequired(), async (req, res) => {
  const user = req.user;
  const forceOnly = !!req.auth?.pwdChangeOnly;
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (!newPassword) return res.status(400).json({ error: "Yeni şifre gerekli." });
  if (confirmPassword && confirmPassword !== newPassword) {
    return res.status(400).json({ error: "Yeni şifre ve tekrar alanı eşleşmiyor." });
  }

  if (!forceOnly) {
    if (!currentPassword) return res.status(400).json({ error: "Mevcut şifre gerekli." });
    const okCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!okCurrent) return res.status(400).json({ error: "Mevcut şifre hatalı." });
  }

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return res.status(400).json({ error: "Yeni şifre mevcut/geçici şifre ile aynı olamaz." });
  }

  const policy = validatePasswordPolicy(newPassword, { email: visibleEmail(user.email), fullName: user.fullName });
  if (!policy.ok) {
    return res.status(400).json({ error: policy.errors[0], details: policy });
  }

  const nextHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.$transaction(async (tx) => {
    const nextUser = await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: nextHash, sessionVersion: { increment: 1 } },
    });
    await tx.refreshSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return nextUser;
  });

  await clearPasswordChangeRequired(user.id);

  const loginExtra = {};
  if (isGreenpackStepUpBypass(req) && isStepUpRole(updated.role)) {
    loginExtra.stepUpUntil = Date.now() + Number(ENV.STEP_UP_TOTP_WINDOW_SEC || 43200) * 1000;
  }
  const token = issueAccessToken(updated, loginExtra);

  await recordLoginAudit({
    req,
    email: updated.email,
    user: updated,
    action: "AUTH_PASSWORD_CHANGED",
    reason: forceOnly ? "FORCED_AFTER_RESET" : "SELF_SERVICE",
    meta: { passwordChangeRequiredCleared: true },
  });

  return res.json({
    ok: true,
    token,
    user: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      fullName: updated.fullName,
      companyId: updated.companyId,
      roomId: updated.roomId,
    },
    requirePasswordChange: false,
  });
});

function normalizeParentAccessCode(v) {
  return String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeParentAccessPin(v) {
  return String(v || "").trim().replace(/\D/g, "");
}

function rawParentAccessToken({ token, accessCode, pin }) {
  const raw = String(token || "").trim();
  if (raw) return raw;
  const code = normalizeParentAccessCode(accessCode);
  const cleanPin = normalizeParentAccessPin(pin);
  if (!code || !cleanPin) return "";
  return `${code}${cleanPin}`;
}

// Parent access info (link or code+PIN fallback)
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
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) return res.status(410).json({ error: "INVITE_EXPIRED" });

  const access = {
    id: invite.id,
    expiresAt: invite.expiresAt,
    company: invite.company ? { id: invite.company.id, name: invite.company.name, kind: invite.company.kind } : null,
    child: invite.child ? { id: invite.child.id, fullName: invite.child.fullName, kind: invite.child.kind } : null,
  };

  return res.json({ ok: true, access, invite: access });
});

authRouter.post("/parent-invite/accept", async (req, res) => {
  const raw = rawParentAccessToken({
    token: req.body?.token,
    accessCode: req.body?.accessCode,
    pin: req.body?.pin,
  });
  if (!raw) return res.status(400).json({ error: "token or accessCode+pin required" });

  const accessRow = await prisma.parentInvite.findUnique({
    where: { tokenHash: sha256Hex(raw) },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      child: { select: { id: true, companyId: true, fullName: true } },
    },
  });

  if (!accessRow) return res.status(404).json({ error: "INVITE_NOT_FOUND" });
  if (accessRow.revokedAt) return res.status(410).json({ error: "INVITE_REVOKED" });
  if (accessRow.expiresAt && new Date(accessRow.expiresAt).getTime() <= Date.now()) return res.status(410).json({ error: "INVITE_EXPIRED" });
  if (!accessRow.company || accessRow.company.kind !== "SCHOOL") return res.status(409).json({ error: "INVITE_SCOPE_INVALID" });
  if (!accessRow.child || accessRow.child.companyId !== accessRow.company.id) return res.status(409).json({ error: "INVITE_CHILD_INVALID" });

  const syntheticEmail = `parent-access-${accessRow.id}@vardis.local`;
  const out = await prisma.$transaction(async (tx) => {
    let parentUser = await tx.user.findUnique({ where: { email: syntheticEmail } });
    if (parentUser && isDisabledHash(parentUser.passwordHash)) return null;
    if (!parentUser) {
      const passwordHash = await bcrypt.hash(raw, 10);
      parentUser = await tx.user.create({
        data: {
          email: syntheticEmail,
          passwordHash,
          role: "PARENT",
          fullName: accessRow.child?.fullName ? `${accessRow.child.fullName} velisi` : "Veli erişimi",
          phone: null,
          companyId: accessRow.company.id,
        },
      });
    } else {
      parentUser = await tx.user.update({
        where: { id: parentUser.id },
        data: {
          role: "PARENT",
          companyId: accessRow.company.id,
          fullName: accessRow.child?.fullName ? `${accessRow.child.fullName} velisi` : parentUser.fullName,
        },
      });
    }
    const existingLink = await tx.parentChild.findFirst({ where: { parentUserId: parentUser.id, personelId: accessRow.child.id }, select: { id: true } });
    if (!existingLink) await tx.parentChild.create({ data: { parentUserId: parentUser.id, personelId: accessRow.child.id } });
    return parentUser;
  });
  if (!out) return res.status(403).json({ error: "ACCOUNT_DISABLED" });
  try {
    await clearPasswordChangeRequired(out.id);
  } catch {}
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: out.id,
        actorRole: out.role,
        action: "PARENT_ACCESS_LOGIN",
        entity: "ParentInvite",
        entityId: accessRow.id,
        meta: { companyId: accessRow.company.id, childPersonelId: accessRow.child.id },
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

  if (isProd() && ENV.REFRESH_REQUIRE_DEVICE_ID_FOR_BOUND && session.deviceId && !reqDeviceId) {
    if (String(user?.role || "") === "DRIVER") {
      await recordLoginAudit({
        req,
        email: user.email || null,
        user,
        action: "AUTH_REFRESH_DEVICE_REQUIRED",
        reason: "DEVICE_ID_REQUIRED",
        meta: { refreshSessionId: session.id, sessionDeviceId: session.deviceId },
      });
      return res.status(400).json({ error: "DEVICE_ID_REQUIRED", code: "DEVICE_ID_REQUIRED", message: "Cihaz bilgisi gerekli." });
    }
  }

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
    await enforceMaxRefreshSessions(user.id);


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

  if (currentPin.length < 4) {
    return res.status(400).json({ error: 'CURRENT_PIN_REQUIRED', code: 'CURRENT_PIN_REQUIRED', message: 'Mevcut PIN gerekli.' });
  }

  const authUser = await prisma.user.findUnique({ where: { id: user.id }, include: { driver: true } });
  if (!authUser?.driver) return res.status(404).json({ error: 'DRIVER_PROFILE_NOT_FOUND', code: 'DRIVER_PROFILE_NOT_FOUND' });

  const policy = validateNewDriverPin(newPin, { currentPin });
  if (!policy.ok) {
    await recordLoginAudit({
      req,
      email: authUser.email || authUser.driver?.driverCode || null,
      user: authUser,
      action: 'AUTH_DRIVER_PIN_CHANGE_FAIL',
      reason: policy.code,
      meta: { driverId: authUser.driver.id, policyCode: policy.code },
    });
    return res.status(400).json({ error: policy.code, code: policy.code, message: policy.message });
  }

  const okPass = await bcrypt.compare(currentPin, authUser.passwordHash);
  if (!okPass) {
    await recordLoginAudit({ req, email: authUser.email || authUser.driver?.driverCode || null, user: authUser, action: 'AUTH_DRIVER_PIN_CHANGE_FAIL', reason: 'BAD_CURRENT_PIN', meta: { driverId: authUser.driver.id } });
    return res.status(401).json({ error: 'BAD_CURRENT_PIN', code: 'BAD_CURRENT_PIN', message: 'Mevcut PIN hatalı.' });
  }

  const passwordHash = await bcrypt.hash(newPin, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: authUser.id }, data: { passwordHash } }),
    prisma.driver.update({ where: { id: authUser.driver.id }, data: { pinTemporary: false, pinUpdatedAt: new Date() } }),
    // ✅ M46.9: revoke refresh sessions on credential change (best-effort)
    prisma.refreshSession.updateMany({ where: { userId: authUser.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  // Issue new tokens (optional; clients may ignore)
  let newToken = null;
  let newRefreshToken = null;
  try {
    const freshUser = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (freshUser) {
      newToken = issueAccessToken(freshUser);
      const raw = randomTokenHex(32);
      const tokenHash = sha256Hex(raw);
      const ttlDays = Number(ENV.REFRESH_TOKEN_TTL_DAYS || 30);
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
      await prisma.refreshSession.create({
        data: {
          userId: freshUser.id,
          tokenHash,
          deviceId: freshUser.deviceId || null,
          expiresAt,
          ip: getReqIp(req),
          userAgent: req.headers["user-agent"]?.toString() || null,
        },
      });
      await enforceMaxRefreshSessions(freshUser.id);
      newRefreshToken = raw;
    }
  } catch {
    // ignore
  }

  await clearDriverPinFailureState(authUser.driver.id);
  await recordLoginAudit({ req, email: authUser.email || authUser.driver?.driverCode || null, user: authUser, action: 'AUTH_DRIVER_PIN_CHANGE_OK', reason: null, meta: { driverId: authUser.driver.id, refreshSessionsRevoked: true, REFRESH_SESSION_REVOKED_ON_PIN_CHANGE: true } });
  return res.json({ ok: true, pinTemporary: false, token: newToken, refreshToken: newRefreshToken });
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


