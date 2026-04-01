import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signToken } from "../auth/jwt.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { ENV } from "../env.js";
import { verifyGoogleCredential } from "../auth/google.js";
import { sanitizeAuthInviteListItem } from "../kvkk/enforcement.js";

const DISABLED_PREFIX = "$DISABLED$";
const authStep2Router = express.Router();

function isDisabledHash(hash) {
  return String(hash || "").startsWith(DISABLED_PREFIX);
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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

function randomTokenHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

function getReqIp(req) {
  try {
    const xfwd = req.headers["x-forwarded-for"]?.toString() || "";
    return xfwd.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
  } catch {
    return null;
  }
}

function pickDeviceId(req) {
  const d = String(req.body?.deviceId || "").trim();
  return d || null;
}

function roleNeedsStepUp(role) {
  const x = String(role || "").trim().toUpperCase();
  return x === "ROOM" || x === "SUPER_ADMIN";
}

async function recordAudit({ req, email, user, action, reason, meta }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: user?.id || null,
        actorRole: user?.role || null,
        action,
        entity: "User",
        entityId: user?.id || null,
        meta: {
          email: email || null,
          reason: reason || null,
          ip: getReqIp(req),
          ua: req.headers["user-agent"]?.toString() || null,
          ...(meta || {}),
        },
      },
    });
    await enforceMaxRefreshSessions(user.id);
  } catch {
    // swallow
  }
}

async function createPasswordHash() {
  return bcrypt.hash(randomPassword(), 10);
}

async function issueAuthPayload({ req, user, action = "AUTH_OAUTH_LOGIN", meta = {} }) {
  const sv = Number(user?.sessionVersion ?? 1);
  const token = signToken({ userId: user.id, role: user.role, sv });
  const refreshToken = randomTokenHex(32);
  const ttlDays = Number(ENV.REFRESH_TOKEN_TTL_DAYS || 30);
  const deviceId = pickDeviceId(req);

  try {
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(refreshToken),
        deviceId: deviceId || user.deviceId || null,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 3600_000),
        ip: getReqIp(req),
        userAgent: req.headers["user-agent"]?.toString() || null,
      },
    });
  } catch {
    // fail-open
  }

  await recordAudit({ req, email: user.email, user, action, meta });
  return {
    token,
    refreshToken,
    deviceId: deviceId || user.deviceId || null,
    stepUpRequired: roleNeedsStepUp(user.role),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      companyId: user.companyId,
      roomId: user.roomId,
    },
  };
}

async function enforceDriverDeviceBinding({ req, user }) {
  if (String(user?.role || "") !== "DRIVER") return user;

  const deviceId = pickDeviceId(req);
  if (!deviceId) {
    throw Object.assign(new Error("DEVICE_ID_REQUIRED"), { status: 400, code: "DEVICE_ID_REQUIRED" });
  }

  if (!user.deviceId) {
    return prisma.user.update({
      where: { id: user.id },
      data: { deviceId, deviceBoundAt: new Date(), deviceLastSeenAt: new Date() },
    });
  }

  if (String(user.deviceId) !== deviceId) {
    throw Object.assign(new Error("DEVICE_MISMATCH"), { status: 403, code: "DEVICE_MISMATCH" });
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { deviceLastSeenAt: new Date() },
  });
}

function isActiveWindow(row) {
  if (!row) return false;
  if (row.revokedAt) return false;
  if (row.consumedAt) return false;
  if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) return false;
  return true;
}

async function resolveScopedInviteByToken(raw) {
  const tokenHash = sha256Hex(raw);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      room: { select: { id: true, name: true } },
      personel: { select: { id: true, companyId: true, fullName: true } },
      childPersonel: { select: { id: true, companyId: true, fullName: true } },
      driver: { select: { id: true, roomId: true, fullName: true } },
    },
  });
  if (invite) return { kind: "AUTH", row: invite };

  const parentInvite = await prisma.parentInvite.findUnique({
    where: { tokenHash },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      child: { select: { id: true, companyId: true, fullName: true, kind: true } },
    },
  });
  if (parentInvite) return { kind: "PARENT", row: parentInvite };
  return null;
}

async function resolveScopedInviteByEmail(email) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (!emailNorm) return null;

  const invite = await prisma.invite.findFirst({
    where: {
      email: emailNorm,
      revokedAt: null,
      consumedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      room: { select: { id: true, name: true } },
      personel: { select: { id: true, companyId: true, fullName: true } },
      childPersonel: { select: { id: true, companyId: true, fullName: true } },
      driver: { select: { id: true, roomId: true, fullName: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (invite) return { kind: "AUTH", row: invite };

  const parentInvite = await prisma.parentInvite.findFirst({
    where: {
      email: emailNorm,
      revokedAt: null,
      consumedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      child: { select: { id: true, companyId: true, fullName: true, kind: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (parentInvite) return { kind: "PARENT", row: parentInvite };

  return null;
}

async function upsertUserFromInvite({ tx, invite, existingUser, email, fullName }) {
  const scopeData = {
    role: invite.role,
    fullName: fullName || invite.fullName || existingUser?.fullName || email.split("@")[0],
    phone: invite.phone || existingUser?.phone || null,
    companyId: invite.companyId ?? null,
    roomId: invite.roomId ?? null,
  };

  if (invite.role === "ROOM") scopeData.companyId = null;
  if (invite.role === "COMPANY" || invite.role === "PERSONEL") scopeData.roomId = null;
  if (invite.role === "PARENT") {
    scopeData.roomId = null;
    scopeData.companyId = invite.companyId ?? null;
  }

  if (existingUser) {
    if (existingUser.role !== invite.role) {
      throw Object.assign(new Error("INVITE_ROLE_CONFLICT"), { status: 409, code: "INVITE_ROLE_CONFLICT" });
    }
    if (invite.roomId && existingUser.roomId && Number(existingUser.roomId) !== Number(invite.roomId)) {
      throw Object.assign(new Error("INVITE_SCOPE_CONFLICT"), { status: 409, code: "INVITE_SCOPE_CONFLICT" });
    }
    if (invite.companyId && existingUser.companyId && Number(existingUser.companyId) !== Number(invite.companyId)) {
      throw Object.assign(new Error("INVITE_SCOPE_CONFLICT"), { status: 409, code: "INVITE_SCOPE_CONFLICT" });
    }
    return tx.user.update({
      where: { id: existingUser.id },
      data: scopeData,
    });
  }

  return tx.user.create({
    data: {
      email,
      passwordHash: await createPasswordHash(),
      ...scopeData,
    },
  });
}

async function consumeAuthInvite({ req, invite, existingUser, email, fullName }) {
  if (!isActiveWindow(invite)) {
    throw Object.assign(new Error("INVITE_INVALID"), { status: 410, code: invite?.revokedAt ? "INVITE_REVOKED" : invite?.consumedAt ? "INVITE_CONSUMED" : "INVITE_EXPIRED" });
  }
  if (invite.email && String(invite.email).trim().toLowerCase() !== String(email).trim().toLowerCase()) {
    throw Object.assign(new Error("INVITE_EMAIL_MISMATCH"), { status: 403, code: "INVITE_EMAIL_MISMATCH" });
  }

  if (invite.role === "PERSONEL") {
    if (!invite.personelId || !invite.personel || invite.personel.companyId !== invite.companyId) {
      throw Object.assign(new Error("INVITE_SCOPE_INVALID"), { status: 409, code: "INVITE_SCOPE_INVALID" });
    }
  }
  if (invite.role === "DRIVER") {
    if (!invite.driverId || !invite.driver || invite.driver.roomId !== invite.roomId) {
      throw Object.assign(new Error("INVITE_SCOPE_INVALID"), { status: 409, code: "INVITE_SCOPE_INVALID" });
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const nextUser = await upsertUserFromInvite({ tx, invite, existingUser, email, fullName });

    if (invite.role === "PERSONEL" && invite.personelId) {
      const personel = await tx.personel.findUnique({ where: { id: invite.personelId }, select: { id: true, userId: true } });
      if (!personel) throw Object.assign(new Error("INVITE_PERSONEL_NOT_FOUND"), { status: 404, code: "INVITE_PERSONEL_NOT_FOUND" });
      if (personel.userId && personel.userId !== nextUser.id) {
        throw Object.assign(new Error("INVITE_PROFILE_IN_USE"), { status: 409, code: "INVITE_PROFILE_IN_USE" });
      }
      await tx.personel.update({ where: { id: invite.personelId }, data: { userId: nextUser.id } });
    }

    if (invite.role === "DRIVER" && invite.driverId) {
      const driver = await tx.driver.findUnique({ where: { id: invite.driverId }, select: { id: true, userId: true } });
      if (!driver) throw Object.assign(new Error("INVITE_DRIVER_NOT_FOUND"), { status: 404, code: "INVITE_DRIVER_NOT_FOUND" });
      if (driver.userId && driver.userId !== nextUser.id) {
        throw Object.assign(new Error("INVITE_PROFILE_IN_USE"), { status: 409, code: "INVITE_PROFILE_IN_USE" });
      }
      await tx.driver.update({ where: { id: invite.driverId }, data: { userId: nextUser.id } });
    }

    await tx.invite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date(), consumedByUserId: nextUser.id },
    });

    return nextUser;
  });

  await recordAudit({
    req,
    email: user.email,
    user,
    action: "INVITE_ACCEPT",
    meta: { inviteId: invite.id, inviteType: invite.type, role: invite.role, companyId: invite.companyId ?? null, roomId: invite.roomId ?? null },
  });

  return user;
}

async function consumeParentInvite({ req, invite, existingUser, email, fullName }) {
  if (!isActiveWindow(invite)) {
    throw Object.assign(new Error("INVITE_INVALID"), { status: 410, code: invite?.revokedAt ? "INVITE_REVOKED" : invite?.consumedAt ? "INVITE_CONSUMED" : "INVITE_EXPIRED" });
  }
  if (invite.email && String(invite.email).trim().toLowerCase() !== String(email).trim().toLowerCase()) {
    throw Object.assign(new Error("INVITE_EMAIL_MISMATCH"), { status: 403, code: "INVITE_EMAIL_MISMATCH" });
  }
  if (!invite.company || invite.company.kind !== "SCHOOL") {
    throw Object.assign(new Error("INVITE_SCOPE_INVALID"), { status: 409, code: "INVITE_SCOPE_INVALID" });
  }
  if (!invite.child || invite.child.companyId !== invite.company.id) {
    throw Object.assign(new Error("INVITE_CHILD_INVALID"), { status: 409, code: "INVITE_CHILD_INVALID" });
  }

  let user = existingUser;
  if (user && user.role !== "PARENT") {
    throw Object.assign(new Error("INVITE_ROLE_CONFLICT"), { status: 409, code: "INVITE_ROLE_CONFLICT" });
  }

  user = await prisma.$transaction(async (tx) => {
    let parentUser = user;
    if (parentUser) {
      parentUser = await tx.user.update({
        where: { id: parentUser.id },
        data: {
          role: "PARENT",
          companyId: invite.company.id,
          roomId: null,
          fullName: fullName || invite.parentFullName || parentUser.fullName || email.split("@")[0],
          phone: invite.phone || parentUser.phone || null,
        },
      });
    } else {
      parentUser = await tx.user.create({
        data: {
          email,
          passwordHash: await createPasswordHash(),
          role: "PARENT",
          fullName: fullName || invite.parentFullName || email.split("@")[0],
          phone: invite.phone || null,
          companyId: invite.company.id,
        },
      });
    }

    const existingLink = await tx.parentChild.findFirst({
      where: { parentUserId: parentUser.id, personelId: invite.child.id },
      select: { id: true },
    });
    if (!existingLink) {
      await tx.parentChild.create({ data: { parentUserId: parentUser.id, personelId: invite.child.id } });
    }

    await tx.parentInvite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date(), consumedByUserId: parentUser.id },
    });

    return parentUser;
  });

  await recordAudit({
    req,
    email: user.email,
    user,
    action: "INVITE_ACCEPT",
    meta: { parentInviteId: invite.id, companyId: invite.company.id, childPersonelId: invite.child.id },
  });

  return user;
}

function inviteTitle(kind, row) {
  if (kind === "PARENT") return "Veli Erişimi";
  if (row?.role === "DRIVER") return "Sürücü Giriş Daveti";
  if (row?.role === "PERSONEL") return "Personel Giriş Daveti";
  if (row?.role === "ROOM") return "Room Kullanıcı Daveti";
  if (row?.role === "COMPANY") return "Company Kullanıcı Daveti";
  return "Giriş Daveti";
}

function mapInviteInfo(ref) {
  if (!ref) return null;
  if (ref.kind === "PARENT") {
    const x = ref.row;
    return {
      kind: ref.kind,
      title: inviteTitle(ref.kind, x),
      role: "PARENT",
      email: x.email || null,
      fullName: x.parentFullName || null,
      expiresAt: x.expiresAt,
      company: x.company ? { id: x.company.id, name: x.company.name, kind: x.company.kind } : null,
      child: x.child ? { id: x.child.id, fullName: x.child.fullName, kind: x.child.kind } : null,
    };
  }
  const x = ref.row;
  return {
    kind: ref.kind,
    title: inviteTitle(ref.kind, x),
    type: x.type,
    role: x.role,
    email: x.email || null,
    fullName: x.fullName || null,
    expiresAt: x.expiresAt,
    company: x.company ? { id: x.company.id, name: x.company.name, kind: x.company.kind } : null,
    room: x.room ? { id: x.room.id, name: x.room.name } : null,
    personel: x.personel ? { id: x.personel.id, fullName: x.personel.fullName } : null,
    child: x.childPersonel ? { id: x.childPersonel.id, fullName: x.childPersonel.fullName } : null,
    driver: x.driver ? { id: x.driver.id, fullName: x.driver.fullName } : null,
  };
}

const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  ttlDays: z.number().int().min(1).max(365).optional(),
  role: z.enum(["PERSONEL", "DRIVER", "ROOM", "COMPANY"]),
  companyId: z.number().int().positive().optional().nullable(),
  roomId: z.number().int().positive().optional().nullable(),
  personelId: z.number().int().positive().optional().nullable(),
  driverId: z.number().int().positive().optional().nullable(),
  fullName: z.string().trim().min(2).optional().nullable(),
  phone: z.string().trim().min(3).optional().nullable(),
}).superRefine((v, ctx) => {
  if (v.role === "PERSONEL" && !v.personelId) ctx.addIssue({ code: "custom", path: ["personelId"], message: "PERSONEL requires personelId" });
  if (v.role === "DRIVER" && !v.driverId) ctx.addIssue({ code: "custom", path: ["driverId"], message: "DRIVER requires driverId" });
  if (v.role === "ROOM" && !v.roomId) ctx.addIssue({ code: "custom", path: ["roomId"], message: "ROOM requires roomId" });
  if ((v.role === "COMPANY" || v.role === "PERSONEL") && !v.companyId) ctx.addIssue({ code: "custom", path: ["companyId"], message: "COMPANY scope requires companyId" });
  if (v.role === "DRIVER" && !v.roomId) ctx.addIssue({ code: "custom", path: ["roomId"], message: "DRIVER requires roomId" });
});

const googleLoginSchema = z.object({
  credential: z.string().trim().optional(),
  inviteToken: z.string().trim().optional(),
  deviceId: z.string().trim().min(2).optional(),
  testProfile: z.any().optional(),
});

function roleTypeOf(role) {
  if (role === "PERSONEL") return "PERSONEL_INVITE";
  if (role === "DRIVER") return "DRIVER_INVITE";
  if (role === "ROOM") return "ROOM_USER_INVITE";
  if (role === "COMPANY") return "COMPANY_USER_INVITE";
  return "COMPANY_USER_INVITE";
}

async function assertInviteScope(req, parsed) {
  const b = parsed;
  if (req.user.role === "COMPANY") {
    if (!req.user.companyId) throw Object.assign(new Error("COMPANY_SCOPE_REQUIRED"), { status: 400, code: "COMPANY_SCOPE_REQUIRED" });
    if (b.role !== "PERSONEL") throw Object.assign(new Error("FORBIDDEN"), { status: 403, code: "FORBIDDEN" });
    if (Number(b.companyId) !== Number(req.user.companyId)) throw Object.assign(new Error("INVITE_SCOPE_FORBIDDEN"), { status: 403, code: "INVITE_SCOPE_FORBIDDEN" });
    const personel = await prisma.personel.findUnique({ where: { id: Number(b.personelId) }, select: { id: true, companyId: true, fullName: true, phone: true, userId: true } });
    if (!personel || Number(personel.companyId) !== Number(req.user.companyId)) throw Object.assign(new Error("PERSONEL_NOT_FOUND"), { status: 404, code: "PERSONEL_NOT_FOUND" });
    if (personel.userId) throw Object.assign(new Error("INVITE_PROFILE_ALREADY_LINKED"), { status: 409, code: "INVITE_PROFILE_ALREADY_LINKED" });
    return { fullName: b.fullName || personel.fullName, phone: b.phone || personel.phone || null, companyId: req.user.companyId, roomId: null, personelId: personel.id, driverId: null };
  }

  if (req.user.role === "ROOM") {
    if (!req.user.roomId) throw Object.assign(new Error("ROOM_SCOPE_REQUIRED"), { status: 400, code: "ROOM_SCOPE_REQUIRED" });
    if (b.role !== "DRIVER") throw Object.assign(new Error("FORBIDDEN"), { status: 403, code: "FORBIDDEN" });
    if (Number(b.roomId) !== Number(req.user.roomId)) throw Object.assign(new Error("INVITE_SCOPE_FORBIDDEN"), { status: 403, code: "INVITE_SCOPE_FORBIDDEN" });
    const driver = await prisma.driver.findUnique({ where: { id: Number(b.driverId) }, select: { id: true, roomId: true, fullName: true, phone: true, userId: true } });
    if (!driver || Number(driver.roomId) !== Number(req.user.roomId)) throw Object.assign(new Error("DRIVER_NOT_FOUND"), { status: 404, code: "DRIVER_NOT_FOUND" });
    if (driver.userId) throw Object.assign(new Error("INVITE_PROFILE_ALREADY_LINKED"), { status: 409, code: "INVITE_PROFILE_ALREADY_LINKED" });
    return { fullName: b.fullName || driver.fullName, phone: b.phone || driver.phone || null, companyId: null, roomId: req.user.roomId, personelId: null, driverId: driver.id };
  }

  if (req.user.role === "SUPER_ADMIN") {
    return {
      fullName: b.fullName || null,
      phone: b.phone || null,
      companyId: b.companyId ?? null,
      roomId: b.roomId ?? null,
      personelId: b.personelId ?? null,
      driverId: b.driverId ?? null,
    };
  }

  throw Object.assign(new Error("FORBIDDEN"), { status: 403, code: "FORBIDDEN" });
}

authStep2Router.get("/invite/info", async (_req, res) => res.status(410).json({ error: "AUTH_INVITE_REMOVED", message: "Hesap daveti akışı kaldırıldı." }));

authStep2Router.get("/invites", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (_req, res) => res.status(410).json({ error: "AUTH_INVITE_REMOVED", message: "Hesap daveti ekranı kaldırıldı." }));

authStep2Router.post("/invites", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), requireStepUpWrite("ROOM", "SUPER_ADMIN"), async (_req, res) => res.status(410).json({ error: "AUTH_INVITE_REMOVED", message: "Hesap daveti oluşturma kaldırıldı." }));

authStep2Router.post("/invites/:id/revoke", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), requireStepUpWrite("ROOM", "SUPER_ADMIN"), async (_req, res) => res.status(410).json({ error: "AUTH_INVITE_REMOVED", message: "Hesap daveti iptal akışı kaldırıldı." }));

authStep2Router.post("/google", async (req, res) => {
  try {
    const parsed = googleLoginSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const profile = await verifyGoogleCredential({ credential: parsed.data.credential, req });
    if (!profile.emailVerified) return res.status(403).json({ error: "GOOGLE_EMAIL_NOT_VERIFIED", code: "GOOGLE_EMAIL_NOT_VERIFIED" });

    const inviteToken = String(parsed.data.inviteToken || "").trim();
    let identity = await prisma.userIdentity.findUnique({
      where: { provider_providerSub: { provider: "GOOGLE", providerSub: profile.sub } },
      include: { user: true },
    }).catch(() => null);

    let user = identity?.user || null;
    let inviteRef = inviteToken ? await resolveScopedInviteByToken(inviteToken) : null;
    if (!inviteRef && !user) inviteRef = await resolveScopedInviteByEmail(profile.email);

    if (inviteRef?.kind === "AUTH") {
      user = await consumeAuthInvite({ req, invite: inviteRef.row, existingUser: user, email: profile.email, fullName: profile.name });
    } else if (inviteRef?.kind === "PARENT") {
      user = await consumeParentInvite({ req, invite: inviteRef.row, existingUser: user, email: profile.email, fullName: profile.name });
    }

    if (!user) return res.status(403).json({ error: "INVITE_REQUIRED", code: "INVITE_REQUIRED" });
    if (isDisabledHash(user.passwordHash)) return res.status(403).json({ error: "ACCOUNT_DISABLED", code: "ACCOUNT_DISABLED" });

    if (!identity) {
      identity = await prisma.userIdentity.create({
        data: {
          userId: user.id,
          provider: "GOOGLE",
          providerSub: profile.sub,
          email: profile.email,
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
        },
      });
    }

    user = await enforceDriverDeviceBinding({ req, user });

    const out = await issueAuthPayload({
      req,
      user,
      action: "AUTH_OAUTH_LOGIN",
      meta: { provider: "GOOGLE", inviteId: inviteRef?.kind === "AUTH" ? inviteRef.row.id : null, parentInviteId: inviteRef?.kind === "PARENT" ? inviteRef.row.id : null, googleEmail: profile.email, googleSub: profile.sub, testMode: profile.testMode === true },
    });

    return res.json({ ok: true, provider: "GOOGLE", inviteAccepted: Boolean(inviteRef), ...out });
  } catch (e) {
    return res.status(e?.status ?? 500).json({ error: String(e?.code || e?.message || e), code: String(e?.code || "GOOGLE_AUTH_FAILED") });
  }
});

export { authStep2Router };
