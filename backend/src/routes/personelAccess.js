import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signToken } from "../auth/jwt.js";
import { ENV } from "../env.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { getAccessTokenExpiresInForUser, isStepUpRole } from "../auth/securityPolicy.js";
import { buildInternalLoginEmail, getEffectiveUsername, isUsernameTaken, setStoredLogin, visibleEmail } from "../auth/usernameDirectory.js";
import { markPasswordChangeRequired } from "../auth/passwordChangeRequirementStore.js";
import { getPasswordPolicySummary } from "../auth/passwordPolicy.js";
import { maskPhone, sanitizeAuditMeta } from "../kvkk/enforcement.js";

const PERSONEL_INVITE_TYPE = "PERSONEL_INVITE"; // InviteType.PERSONEL_INVITE
const ACCESS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s || ""), "utf8").digest("hex");
}

function randomAccessCode(len = 8) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i += 1) out += ACCESS_ALPHABET[bytes[i] % ACCESS_ALPHABET.length];
  return out;
}

function randomPin(len = 6) {
  let out = "";
  while (out.length < len) out += String(crypto.randomInt(0, 10));
  return out.slice(0, len);
}

function normalizeAccessCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizePin(value) {
  return String(value || "").trim().replace(/\D/g, "");
}

function buildRawInviteToken({ token, accessCode, pin }) {
  const rawToken = String(token || "").trim();
  if (rawToken) return rawToken.replace(/\s+/g, "").toUpperCase();
  const code = normalizeAccessCode(accessCode);
  const cleanPin = normalizePin(pin);
  if (!code || !cleanPin) return "";
  return `${code}${cleanPin}`;
}

function maskAccessCode(code) {
  const clean = normalizeAccessCode(code);
  if (!clean) return null;
  if (clean.length <= 4) return `${clean.slice(0, 2)}**`;
  return `${clean.slice(0, 4)}****`;
}

function inviteStatus(row) {
  if (row?.revokedAt) return "REVOKED";
  if (row?.consumedAt) return "ACCEPTED";
  if (row?.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) return "EXPIRED";
  return "ACTIVE";
}

function buildInviteView(row) {
  if (!row) return null;
  const accessCode = normalizeAccessCode(row.phone);
  return {
    id: row.id,
    type: row.type,
    role: row.role,
    companyId: row.companyId,
    personelId: row.personelId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    revokedAt: row.revokedAt,
    status: inviteStatus(row),
    accessCodeMasked: maskAccessCode(accessCode),
    company: row.company
      ? { id: row.company.id, name: row.company.name, kind: row.company.kind }
      : null,
    personel: row.personel
      ? {
          id: row.personel.id,
          fullName: row.personel.fullName,
          kind: row.personel.kind,
          phoneMasked: maskPhone(row.personel.phone),
        }
      : null,
  };
}

async function recordAudit({ actorUserId, actorRole, action, entity, entityId, meta }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        actorRole: actorRole ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: sanitizeAuditMeta(meta ?? null),
      },
    });
  } catch {
    // best effort
  }
}

async function assertPersonelAccessScope(req, res) {
  const companyId = Number(req.user?.companyId || 0);
  if (!companyId) {
    res.status(400).json({ error: "company scope missing" });
    return null;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, kind: true },
  });
  if (!company) {
    res.status(404).json({ error: "company not found" });
    return null;
  }
  if (company.kind !== "COMPANY" && company.kind !== "ORGANIZATION") {
    res.status(403).json({ error: "PERSONEL_ACCESS_SCOPE_INVALID" });
    return null;
  }
  return company;
}

async function resolveUniqueAccessCode() {
  for (let i = 0; i < 24; i += 1) {
    const candidate = randomAccessCode(8);
    const usernameTaken = await isUsernameTaken(prisma, candidate).catch(() => false);
    if (usernameTaken) continue;

    const activeInvite = await prisma.invite.findFirst({
      where: {
        type: PERSONEL_INVITE_TYPE,
        phone: candidate,
        revokedAt: null,
        consumedAt: null,
      },
      select: { id: true },
    });
    if (activeInvite) continue;

    return candidate;
  }
  throw new Error("ACCESS_CODE_GENERATION_FAILED");
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
    // best effort
  }
}

async function createRefreshSession({ req, user, deviceId }) {
  const refreshTokenRaw = crypto.randomBytes(32).toString("hex");
  const ttlDays = Number(ENV.REFRESH_TOKEN_TTL_DAYS || 30);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: sha256Hex(refreshTokenRaw),
      deviceId: deviceId || null,
      expiresAt,
      ip: req.ip || null,
      userAgent: req.headers["user-agent"]?.toString() || null,
    },
  });
  await enforceMaxRefreshSessions(user.id);

  return refreshTokenRaw;
}

function issueAccessToken(user, extra = {}) {
  const sv = Number(user?.sessionVersion ?? 1);
  const expiresIn = getAccessTokenExpiresInForUser(user);
  const payload = { userId: user.id, role: user.role, sv, ...extra };
  return signToken(payload, expiresIn ? { expiresIn } : {});
}

async function buildAuthResponse({ req, user, deviceId }) {
  const refreshToken = await createRefreshSession({ req, user, deviceId });
  const token = issueAccessToken(user, { pwdChangeOnly: true });
  return {
    token,
    refreshToken,
    deviceId: deviceId || null,
    stepUpRequired: isStepUpRole(user.role),
    passwordChangeRequired: true,
    requirePasswordChange: true,
    passwordPolicy: getPasswordPolicySummary(),
    user: {
      id: user.id,
      username: getEffectiveUsername(user),
      email: visibleEmail(user.email),
      role: user.role,
      fullName: user.fullName,
      companyId: user.companyId,
      roomId: user.roomId,
    },
  };
}

async function resolveInviteByRawToken(raw) {
  const tokenHash = sha256Hex(raw);
  return prisma.invite.findUnique({
    where: { tokenHash },
    include: {
      company: { select: { id: true, name: true, kind: true } },
      personel: { select: { id: true, fullName: true, phone: true, kind: true, companyId: true, userId: true } },
    },
  });
}

const createSchema = z.object({
  personelId: z.coerce.number().int().positive(),
});

const acceptSchema = z
  .object({
    token: z.string().trim().optional(),
    accessCode: z.string().trim().optional(),
    code: z.string().trim().optional(),
    pin: z.string().trim().optional(),
    deviceId: z.string().trim().min(2).optional(),
  })
  .superRefine((value, ctx) => {
    const hasToken = Boolean(String(value.token || "").trim());
    const hasCodePin = Boolean(String(value.accessCode || value.code || "").trim()) && Boolean(String(value.pin || "").trim());
    if (!hasToken && !hasCodePin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["token"],
        message: "token veya accessCode+pin gerekli",
      });
    }
  });

export function personelAccessRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY"));
  r.use(requireStepUpWrite("COMPANY"));

  r.get("/", async (req, res) => {
    const company = await assertPersonelAccessScope(req, res);
    if (!company) return;

    const personelId = req.query.personelId == null || req.query.personelId === "" ? null : Number(req.query.personelId);
    const status = String(req.query.status || "").trim().toUpperCase();
    const takeRaw = Number(req.query.take || 50);
    const take = Math.min(200, Math.max(1, Number.isFinite(takeRaw) ? Math.trunc(takeRaw) : 50));

    const items = await prisma.invite.findMany({
      where: {
        type: PERSONEL_INVITE_TYPE,
        companyId: company.id,
        ...(Number.isFinite(personelId) && personelId ? { personelId } : {}),
      },
      include: {
        company: { select: { id: true, name: true, kind: true } },
        personel: { select: { id: true, fullName: true, phone: true, kind: true, companyId: true, userId: true } },
      },
      orderBy: [{ id: "desc" }],
      take,
    });

    let out = items.map((item) => buildInviteView(item));
    if (status) out = out.filter((item) => item.status === status);
    res.json({ ok: true, items: out });
  });

  r.post("/", async (req, res) => {
    const company = await assertPersonelAccessScope(req, res);
    if (!company) return;

    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const personelId = parsed.data.personelId;
    const personel = await prisma.personel.findFirst({
      where: { id: personelId, companyId: company.id, kind: "PERSONEL" },
      select: { id: true, fullName: true, phone: true, kind: true, companyId: true, userId: true },
    });
    if (!personel) return res.status(404).json({ error: "personel not found" });

    const accessCode = await resolveUniqueAccessCode();
    const pin = randomPin(6);
    const rawToken = `${accessCode}${pin}`;
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const now = new Date();

    const created = await prisma.$transaction(async (tx) => {
      await tx.invite.updateMany({
        where: {
          type: PERSONEL_INVITE_TYPE,
          companyId: company.id,
          personelId: personel.id,
          revokedAt: null,
          consumedAt: null,
        },
        data: { revokedAt: now },
      });

      return tx.invite.create({
        data: {
          type: PERSONEL_INVITE_TYPE,
          role: "PERSONEL",
          companyId: company.id,
          personelId: personel.id,
          fullName: personel.fullName,
          phone: accessCode, // accessCode payload
          tokenHash,
          expiresAt,
          createdByUserId: req.user?.id ?? null,
        },
        include: {
          company: { select: { id: true, name: true, kind: true } },
          personel: { select: { id: true, fullName: true, phone: true, kind: true, companyId: true, userId: true } },
        },
      });
    });

    await recordAudit({
      actorUserId: req.user?.id ?? null,
      actorRole: req.user?.role ?? null,
      action: "PERSONEL_ACCESS_CREATE",
      entity: "Invite",
      entityId: created.id,
      meta: {
        companyId: company.id,
        companyKind: company.kind,
        personelId: personel.id,
        personelFullName: personel.fullName,
        accessCodeMasked: maskAccessCode(accessCode),
        expiresAt,
      },
    });

    res.json({
      ok: true,
      item: buildInviteView(created),
      accessCode,
      pin,
    });
  });

  r.post("/:id/revoke", async (req, res) => {
    const company = await assertPersonelAccessScope(req, res);
    if (!company) return;

    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: "id required" });

    const existing = await prisma.invite.findFirst({
      where: {
        id,
        type: PERSONEL_INVITE_TYPE,
        companyId: company.id,
      },
      include: {
        company: { select: { id: true, name: true, kind: true } },
        personel: { select: { id: true, fullName: true, phone: true, kind: true, companyId: true, userId: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: "invite not found" });

    if (existing.consumedAt || existing.revokedAt) {
      return res.json({ ok: true, item: buildInviteView(existing) });
    }

    const updated = await prisma.invite.update({
      where: { id },
      data: { revokedAt: new Date() },
      include: {
        company: { select: { id: true, name: true, kind: true } },
        personel: { select: { id: true, fullName: true, phone: true, kind: true, companyId: true, userId: true } },
      },
    });

    await recordAudit({
      actorUserId: req.user?.id ?? null,
      actorRole: req.user?.role ?? null,
      action: "PERSONEL_ACCESS_REVOKE",
      entity: "Invite",
      entityId: id,
      meta: {
        companyId: company.id,
        companyKind: company.kind,
        personelId: updated.personelId,
        accessCodeMasked: maskAccessCode(updated.phone),
      },
    });

    res.json({ ok: true, item: buildInviteView(updated) });
  });

  return r;
}

export function publicPersonelInviteRouter() {
  const r = express.Router();

  r.get("/info", async (req, res) => {
    const parsed = buildRawInviteToken({
      token: req.query?.token,
      accessCode: req.query?.accessCode ?? req.query?.code,
      pin: req.query?.pin,
    });
    if (!parsed) return res.status(400).json({ error: "token or accessCode+pin required" });

    const invite = await resolveInviteByRawToken(parsed);
    if (!invite) return res.status(404).json({ error: "INVITE_NOT_FOUND" });
    if (!invite.company || (invite.company.kind !== "COMPANY" && invite.company.kind !== "ORGANIZATION")) {
      return res.status(409).json({ error: "INVITE_SCOPE_INVALID" });
    }
    if (invite.revokedAt) return res.status(410).json({ error: "INVITE_REVOKED" });
    if (invite.consumedAt) return res.status(410).json({ error: "INVITE_ACCEPTED" });
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
      return res.status(410).json({ error: "INVITE_EXPIRED" });
    }

    return res.json({
      ok: true,
      access: buildInviteView(invite),
      invite: buildInviteView(invite),
    });
  });

  r.post("/accept", async (req, res) => {
    const parsed = acceptSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const raw = buildRawInviteToken({
      token: parsed.data.token,
      accessCode: parsed.data.accessCode || parsed.data.code,
      pin: parsed.data.pin,
    });
    if (!raw) return res.status(400).json({ error: "token or accessCode+pin required" });

    const invite = await resolveInviteByRawToken(raw);
    if (!invite) return res.status(404).json({ error: "INVITE_NOT_FOUND" });
    if (!invite.company || (invite.company.kind !== "COMPANY" && invite.company.kind !== "ORGANIZATION")) {
      return res.status(409).json({ error: "INVITE_SCOPE_INVALID" });
    }
    if (!invite.personel || invite.personel.companyId !== invite.company.id) {
      return res.status(409).json({ error: "INVITE_PERSONEL_INVALID" });
    }
    if (invite.revokedAt) return res.status(410).json({ error: "INVITE_REVOKED" });
    if (invite.consumedAt) return res.status(410).json({ error: "INVITE_ACCEPTED" });
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
      return res.status(410).json({ error: "INVITE_EXPIRED" });
    }

    const accessCode = normalizeAccessCode(invite.phone);
    const pin = normalizePin(String(raw).slice(accessCode.length));
    if (!accessCode || !pin) return res.status(400).json({ error: "INVALID_INVITE_PAYLOAD" });

    const user = await prisma.$transaction(async (tx) => {
      const personel = await tx.personel.findFirst({
        where: { id: invite.personelId, companyId: invite.company.id, kind: "PERSONEL" },
        select: { id: true, fullName: true, phone: true, kind: true, companyId: true, userId: true },
      });
      if (!personel) throw Object.assign(new Error("PERSONEL_NOT_FOUND"), { status: 404 });

      const passwordHash = await bcrypt.hash(pin, 10);
      const existingUser = personel.userId ? await tx.user.findUnique({ where: { id: personel.userId } }) : null;
      let userRow;

      if (!existingUser) {
        userRow = await tx.user.create({
          data: {
            email: buildInternalLoginEmail(accessCode),
            passwordHash,
            role: "PERSONEL",
            fullName: personel.fullName,
            phone: personel.phone ?? null,
            companyId: invite.company.id,
            roomId: null,
          },
          select: {
            id: true,
            email: true,
            role: true,
            fullName: true,
            phone: true,
            companyId: true,
            roomId: true,
            sessionVersion: true,
          },
        });

        await tx.personel.update({
          where: { id: personel.id },
          data: { userId: userRow.id },
        });
      } else {
        userRow = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            role: "PERSONEL",
            fullName: personel.fullName,
            phone: personel.phone ?? existingUser.phone,
            companyId: invite.company.id,
            roomId: null,
            sessionVersion: { increment: 1 },
          },
          select: {
            id: true,
            email: true,
            role: true,
            fullName: true,
            phone: true,
            companyId: true,
            roomId: true,
            sessionVersion: true,
          },
        });
      }

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          consumedAt: new Date(),
          consumedByUserId: userRow.id,
        },
      });

      return userRow;
    });

    await setStoredLogin({ userId: user.id, username: accessCode });
    try {
      await markPasswordChangeRequired(user.id, { reason: "PERSONEL_ACCESS_ACCEPT", temporaryPassword: true });
    } catch {
      // current token still carries pwdChangeOnly, so the first session remains safe
    }

    await recordAudit({
      actorUserId: user.id,
      actorRole: user.role,
      action: "PERSONEL_ACCESS_ACCEPT",
      entity: "Invite",
      entityId: invite.id,
      meta: {
        companyId: invite.company.id,
        companyKind: invite.company.kind,
        personelId: invite.personel.id,
        accessCodeMasked: maskAccessCode(accessCode),
        passwordChangeRequired: true,
      },
    });

    const authPayload = await buildAuthResponse({
      req,
      user,
      deviceId: parsed.data.deviceId || null,
    });

    return res.json({
      ok: true,
      ...authPayload,
      invite: buildInviteView({
        ...invite,
        consumedAt: new Date(),
        consumedByUserId: user.id,
      }),
    });
  });

  return r;
}
