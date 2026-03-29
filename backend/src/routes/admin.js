// backend/src/routes/admin.js
// SUPER_ADMIN ops endpoints (stats + users + regions) + audit logs

import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { runRetentionCleanupOnce } from "../jobs/retentionCleanup.js";
import { getBackupManifestSummary, getBackupPolicySummary, getRetentionPolicySummary } from "../ops/retentionBackupPolicy.js";
import { getCapacityPolicySummary, getCapacitySnapshot } from "../ops/capacityLoadBaseline.js";
import { getEdgeSecurityPolicySummary, getEdgeSecuritySnapshot } from "../ops/edgeSecurityBaseline.js";
import { audit } from "../audit.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { markPasswordChangeRequired } from "../auth/passwordChangeRequirementStore.js";
import { validatePasswordPolicy } from "../auth/passwordPolicy.js";
import { buildInternalLoginEmail, getUserLoginMeta, isUsernameTaken, setStoredLogin, validateUsernameOrThrow } from "../auth/usernameDirectory.js";
import { buildKvkkRetentionEnforcementSummary, buildKvkkRetentionRunAuditMeta } from "../kvkk/retention.js";

const DISABLED_PREFIX = "$DISABLED$";
function isDisabledHash(hash) {
  return String(hash || "").startsWith(DISABLED_PREFIX);
}

// ✅ Disable artık eski hash'i saklar: "$DISABLED$" + <bcryptHash>
function disabledHash(originalHash) {
  const h = String(originalHash || "");
  if (!h) return DISABLED_PREFIX + crypto.randomBytes(16).toString("hex");
  return h.startsWith(DISABLED_PREFIX) ? h : DISABLED_PREFIX + h;
}
function enableHash(h) {
  const v = String(h || "");
  if (!v.startsWith(DISABLED_PREFIX)) return v;
  const inner = v.slice(DISABLED_PREFIX.length);
  // bcrypt hashes start with $2...
  if (!inner.startsWith("$2")) return null;
  return inner;
}

function genPassword() {
  // URL-safe random password (~12 chars)
  return crypto.randomBytes(9).toString("base64url");
}


function deriveCompatUsername(rawUsername, email) {
  const direct = String(rawUsername || "").trim();
  if (direct) return validateUsernameOrThrow(direct);

  const local = String(email || "").trim().toLowerCase().split("@")[0] || "";
  const normalized = String(local)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_.]/g, "")
    .replace(/[_.]{2,}/g, (m) => m[0])
    .replace(/^[_.]+|[_.]+$/g, "");

  const compact = normalized.length > 24 ? normalized.slice(0, 24).replace(/[_.]+$/g, "") : normalized;
  if (!compact) throw new Error("Kullanıcı adı üretilemedi");
  return validateUsernameOrThrow(compact);
}

const createUserSchema = z
  .object({
    username: z.string().trim().min(4).max(24).regex(/^[a-z0-9_.]+$/).optional(),
    email: z.string().trim().toLowerCase().optional().default(""),
    fullName: z.string().trim().min(2),
    phone: z.string().trim().optional(),
    role: z.enum(["ROOM", "COMPANY", "DRIVER", "PERSONEL", "PARENT"]),
    roomId: z.number().int().positive().optional().nullable(),
    companyId: z.number().int().positive().optional().nullable(),
    password: z.string().min(4).optional(),
  })
  .superRefine((v, ctx) => {
    const email = String(v.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Geçerli bir e-posta girin veya boş bırakın." });
    }
    if (v.role === "ROOM") {
      if (!v.roomId) ctx.addIssue({ code: "custom", message: "ROOM requires roomId" });
      if (v.companyId) ctx.addIssue({ code: "custom", message: "ROOM must not have companyId" });
    }
    if (v.role === "COMPANY") {
      if (!v.companyId) ctx.addIssue({ code: "custom", message: "COMPANY requires companyId" });
      if (v.roomId) ctx.addIssue({ code: "custom", message: "COMPANY must not have roomId" });
    }
    if (v.role === "DRIVER") {
      if (!v.roomId) ctx.addIssue({ code: "custom", message: "DRIVER requires roomId" });
    }
    if (v.role === "PERSONEL") {
      if (!v.companyId) ctx.addIssue({ code: "custom", message: "PERSONEL requires companyId" });
    }
    if (v.role === "PARENT") {
      if (v.roomId) ctx.addIssue({ code: "custom", message: "PARENT must not have roomId" });
      if (v.companyId) ctx.addIssue({ code: "custom", message: "PARENT must not have companyId" });
    }
  });

const updateUserSchema = z
  .object({
    username: z.string().trim().min(4).max(24).regex(/^[a-z0-9_.]+$/).optional(),
    fullName: z.string().trim().min(2).optional(),
    phone: z.string().trim().optional().nullable(),
    roomId: z.number().int().positive().optional().nullable(),
    companyId: z.number().int().positive().optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export function adminRouter() {
  const r = express.Router();

// ✅ M39: retention run (dry-run supported)
r.post("/retention/run", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const dryRun = !!req.body?.dryRun;
    const result = await runRetentionCleanupOnce({ dryRun });

    // Audit the run (even dryRun)
    await audit(req, {
      action: "RETENTION_RUN",
      entity: "SYSTEM",
      meta: buildKvkkRetentionRunAuditMeta({ dryRun, result }),
    });

    return res.json({ ok: true, ...result, kvkkRetention: buildKvkkRetentionEnforcementSummary() });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});


// âœ… M45: retention policy summary (ops/readiness)
r.get("/retention/policy", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
  return res.json({ ok: true, ...getRetentionPolicySummary() });
});

// âœ… M45: backup policy summary (ops/readiness)
r.get("/backup/policy", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
  return res.json({ ok: true, ...getBackupPolicySummary() });
});

// âœ… M45: local backup dir manifest / latest dump visibility
r.get("/backup/manifest", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
  return res.json({
    ok: true,
    env: {
      backupLocalDir: ENV.BACKUP_LOCAL_DIR,
      backupLocalRetentionDays: ENV.BACKUP_LOCAL_RETENTION_DAYS,
      backupDumpFormat: ENV.BACKUP_DUMP_FORMAT,
    },
    ...getBackupManifestSummary(),
  });
});


// M47.2: capacity / load baseline policy
r.get("/capacity/policy", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
  return res.json({ ok: true, ...getCapacityPolicySummary() });
});

// M47.2: capacity / load snapshot
r.get("/capacity/snapshot", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
  return res.json(await getCapacitySnapshot());
});

// M47.3: edge security / resilience policy
r.get("/edge-security/policy", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
  return res.json({ ok: true, ...getEdgeSecurityPolicySummary() });
});

// M47.3: edge security / resilience snapshot
r.get("/edge-security/snapshot", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
  return res.json(await getEdgeSecuritySnapshot());
});
  /**
   * SUPER_ADMIN — Overview stats
   * GET /api/admin/stats
   */
  r.get("/stats", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    const [companiesTotal, roomsTotal, vehiclesTotal, driversTotal, companies, rooms] = await Promise.all([
      prisma.company.count(),
      prisma.room.count(),
      prisma.vehicle.count(),
      prisma.driver.count(),
      prisma.company.count({ where: { status: { not: "DELETED" } } }),
      prisma.room.count({ where: { status: { not: "DELETED" } } }),
    ]);

    res.json({
      companies,
      rooms,
      vehicles: vehiclesTotal,
      drivers: driversTotal,
      companiesTotal,
      roomsTotal,
      vehiclesTotal,
      driversTotal,
    });
  });

  // --- Audit logs ---
  // GET /api/admin/audit-logs?take=&entity=&action=&actorRole=&actorEmail=&actorUserId=&entityId=&q=
  r.get("/audit-logs", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const take = Math.min(500, Math.max(1, Number(req.query.take || 200)));
    const entity = String(req.query.entity || "").trim();
    const action = String(req.query.action || "").trim();
    const actorRole = String(req.query.actorRole || "").trim();
    const actorEmail = String(req.query.actorEmail || "").trim().toLowerCase();
    const q = String(req.query.q || "").trim();

    const actorUserId = req.query.actorUserId != null && String(req.query.actorUserId).trim() !== "" ? Number(req.query.actorUserId) : null;
    const entityId = req.query.entityId != null && String(req.query.entityId).trim() !== "" ? Number(req.query.entityId) : null;

    let actorIdsFromEmail = null;
    const emailNeed = actorEmail || (q.includes("@") ? q.toLowerCase() : "");
    if (emailNeed) {
      const us = await prisma.user.findMany({
        where: { email: { contains: emailNeed, mode: "insensitive" } },
        select: { id: true },
        take: 200,
      });
      actorIdsFromEmail = us.map((u) => u.id);
      if (actorIdsFromEmail.length === 0) return res.json({ items: [] });
    }

    const where = {
      ...(entity ? { entity } : {}),
      ...(actorRole ? { actorRole } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(actorIdsFromEmail ? { actorUserId: { in: actorIdsFromEmail } } : {}),
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
      ...(q && !q.includes("@")
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entity: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const logs = await prisma.auditLog.findMany({
      where,
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const actorIds = Array.from(new Set(logs.map((x) => x.actorUserId).filter(Boolean)));
    const actorMap = new Map();
    if (actorIds.length) {
      const us = await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, email: true, fullName: true },
      });
      for (const u of us) actorMap.set(u.id, u);
    }

    const items = logs.map((x) => ({
      id: x.id,
      createdAt: x.createdAt,
      actorUserId: x.actorUserId,
      actorRole: x.actorRole,
      actorEmail: x.actorUserId ? actorMap.get(x.actorUserId)?.email || null : null,
      action: x.action,
      entity: x.entity,
      entityId: x.entityId,
      meta: x.meta,
    }));

    res.json({ items });
  });

  // --- Users management ---
  r.get("/users", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const take = Math.min(500, Math.max(1, Number(req.query.take || 200)));
    const q = String(req.query.q || "").trim().toLowerCase();
    const role = String(req.query.role || "").trim().toUpperCase();

    const items = await prisma.user.findMany({
      where: role ? { role } : {},
      take,
      orderBy: [{ id: "asc" }],
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        companyId: true,
        roomId: true,
        createdAt: true,
        passwordHash: true,
      },
    });

    const mapped = items
      .map((u) => {
        const loginMeta = getUserLoginMeta(u);
        return {
          id: u.id,
          username: loginMeta.username,
          email: loginMeta.email,
          role: u.role,
          fullName: u.fullName,
          phone: u.phone,
          companyId: u.companyId,
          roomId: u.roomId,
          createdAt: u.createdAt,
          disabled: isDisabledHash(u.passwordHash),
        };
      })
      .filter((u) => {
        if (!q) return true;
        return [u.username, u.email, u.fullName].some((x) => String(x || "").toLowerCase().includes(q));
      });

    res.json({ items: mapped });
  });

  r.post("/users", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const publicEmail = String(parsed.data.email || "").trim().toLowerCase();
    const { fullName, phone, role, roomId, companyId } = parsed.data;
    let username;
    try {
      username = deriveCompatUsername(parsed.data.username, publicEmail);
    } catch {
      return res.status(400).json({ error: { formErrors: [], fieldErrors: { username: ["Required"] } } });
    }
    const password = parsed.data.password || genPassword();
    const hasManualPassword = Boolean(String(parsed.data.password || "").trim());

    if (await isUsernameTaken(prisma, username)) {
      return res.status(409).json({ error: "Kullanıcı adı zaten kullanılıyor" });
    }

    const email = publicEmail || buildInternalLoginEmail(username);
    if (publicEmail) {
      const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (exists) return res.status(409).json({ error: "Email already exists" });
    }

    if (roomId) {
      const rr = await prisma.room.findUnique({ where: { id: Number(roomId) }, select: { id: true, status: true } });
      if (!rr || rr.status === "DELETED") return res.status(400).json({ error: "Room not found" });
    }
    if (companyId) {
      const cc = await prisma.company.findUnique({ where: { id: Number(companyId) }, select: { id: true, status: true } });
      if (!cc || cc.status === "DELETED") return res.status(400).json({ error: "Company not found" });
    }

    if (hasManualPassword) {
      const policy = validatePasswordPolicy(password, { email: publicEmail || null, fullName });
      if (!policy.ok) return res.status(400).json({ error: policy.errors[0], details: policy });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        fullName,
        phone: phone || null,
        roomId: roomId ? Number(roomId) : null,
        companyId: companyId ? Number(companyId) : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        roomId: true,
        companyId: true,
        createdAt: true,
      },
    });

    await markPasswordChangeRequired(created.id, {
      reason: "ADMIN_USER_CREATE",
      temporaryPassword: true,
    });

    setStoredLogin({ userId: created.id, username, contactEmail: publicEmail || null });
    const loginMeta = getUserLoginMeta(created);
    await audit(req, { action: "ADMIN_USER_CREATE", entity: "User", entityId: created.id, meta: { email: loginMeta.email, username, role, roomId: created.roomId, companyId: created.companyId, passwordChangeRequired: true } });

    res.status(201).json({
      user: { ...created, username: loginMeta.username, email: loginMeta.email, disabled: false },
      tempPassword: password,
      passwordChangeRequired: true,
      note:
        role === "PERSONEL"
          ? "PERSONEL user created. NOTE: Personel profile record is managed under /api/personels (COMPANY flow). İlk girişte şifre değişimi zorunludur."
          : role === "DRIVER"
          ? "DRIVER user created. NOTE: Driver profile record is managed under /api/drivers (ROOM flow). İlk girişte şifre değişimi zorunludur."
          : "İlk girişte şifre değişimi zorunludur.",
    });
  });

  r.put("/users/:id", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = { ...parsed.data };
    let nextUsername = null;
    if (Object.prototype.hasOwnProperty.call(data, "username")) {
      nextUsername = validateUsernameOrThrow(data.username);
      delete data.username;
      if (await isUsernameTaken(prisma, nextUsername, id)) {
        return res.status(409).json({ error: "Kullanıcı adı zaten kullanılıyor" });
      }
    }
    if (Object.prototype.hasOwnProperty.call(data, "roomId")) data.roomId = data.roomId ? Number(data.roomId) : null;
    if (Object.prototype.hasOwnProperty.call(data, "companyId")) data.companyId = data.companyId ? Number(data.companyId) : null;
    if (Object.prototype.hasOwnProperty.call(data, "phone")) data.phone = data.phone ? String(data.phone).trim() : null;

    const u0 = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!u0) return res.status(404).json({ error: "User not found" });

    if (u0.role === "ROOM" && Object.prototype.hasOwnProperty.call(data, "companyId") && data.companyId) {
      return res.status(400).json({ error: "ROOM must not have companyId" });
    }
    if (u0.role === "COMPANY" && Object.prototype.hasOwnProperty.call(data, "roomId") && data.roomId) {
      return res.status(400).json({ error: "COMPANY must not have roomId" });
    }

    if (u0.role === "PARENT") {
      if (Object.prototype.hasOwnProperty.call(data, "roomId") && data.roomId) {
        return res.status(400).json({ error: "PARENT must not have roomId" });
      }
      if (Object.prototype.hasOwnProperty.call(data, "companyId") && data.companyId) {
        return res.status(400).json({ error: "PARENT must not have companyId" });
      }
    }


    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        roomId: true,
        companyId: true,
        createdAt: true,
        passwordHash: true,
      },
    });

    if (nextUsername) {
      setStoredLogin({ userId: updated.id, username: nextUsername, contactEmail: updated.email });
    }
    const loginMeta = getUserLoginMeta(updated);
    await audit(req, { action: "ADMIN_USER_UPDATE", entity: "User", entityId: updated.id, meta: { email: loginMeta.email, username: loginMeta.username, role: updated.role, roomId: updated.roomId, companyId: updated.companyId } });

    res.json({
      ok: true,
      user: {
        id: updated.id,
        username: loginMeta.username,
        email: loginMeta.email,
        role: updated.role,
        fullName: updated.fullName,
        phone: updated.phone,
        roomId: updated.roomId,
        companyId: updated.companyId,
        createdAt: updated.createdAt,
        disabled: isDisabledHash(updated.passwordHash),
      },
    });
  });

  r.post("/users/:id/reset-password", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const nextPw = genPassword();
    const hash = await bcrypt.hash(nextPw, 10);

    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash: hash },
      select: { id: true, email: true, role: true },
    });

    await markPasswordChangeRequired(updated.id, {
      reason: "ADMIN_USER_RESET_PASSWORD",
      temporaryPassword: true,
    });

    const loginMeta = getUserLoginMeta(updated);
    await audit(req, { action: "ADMIN_USER_RESET_PASSWORD", entity: "User", entityId: updated.id, meta: { email: loginMeta.email, username: loginMeta.username, role: updated.role, passwordChangeRequired: true } });

    res.json({ ok: true, user: { ...updated, username: loginMeta.username, email: loginMeta.email }, tempPassword: nextPw, passwordChangeRequired: true });
  });

  r.post("/users/:id/disable", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    if (id === Number(req.user.id)) return res.status(400).json({ error: "Cannot disable self" });

    const u = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, passwordHash: true } });
    if (!u) return res.status(404).json({ error: "User not found" });

    if (isDisabledHash(u.passwordHash)) {
      return res.json({ ok: true, user: { id: u.id, ...getUserLoginMeta(u), role: u.role }, disabled: true });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash: disabledHash(u.passwordHash) },
      select: { id: true, email: true, role: true },
    });

    const loginMeta = getUserLoginMeta(updated);
    await audit(req, { action: "ADMIN_USER_DISABLE", entity: "User", entityId: updated.id, meta: { email: loginMeta.email, username: loginMeta.username, role: updated.role } });
    res.json({ ok: true, user: { ...updated, username: loginMeta.username, email: loginMeta.email }, disabled: true });
  });

  r.post("/users/:id/enable", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const u = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, passwordHash: true } });
    if (!u) return res.status(404).json({ error: "User not found" });

    if (!isDisabledHash(u.passwordHash)) {
      return res.json({ ok: true, user: { id: u.id, ...getUserLoginMeta(u), role: u.role }, disabled: false });
    }

    const restored = enableHash(u.passwordHash);
    if (!restored) {
      return res.status(409).json({ error: "Cannot enable without reset (legacy disabled hash). Use reset-password." });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash: restored },
      select: { id: true, email: true, role: true },
    });

    const loginMeta = getUserLoginMeta(updated);
    await audit(req, { action: "ADMIN_USER_ENABLE", entity: "User", entityId: updated.id, meta: { email: loginMeta.email, username: loginMeta.username, role: updated.role } });
    res.json({ ok: true, user: { ...updated, username: loginMeta.username, email: loginMeta.email }, disabled: false });
  });
  // --- Parent ↔ Student links (M81) ---
  // GET /api/admin/parent-children?parentUserId=
  r.get("/parent-children", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const parentUserId = req.query.parentUserId != null && String(req.query.parentUserId).trim() !== "" ? Number(req.query.parentUserId) : null;
    if (!parentUserId) return res.status(400).json({ error: "parentUserId required" });

    const items = await prisma.parentChild.findMany({
      where: { parentUserId },
      orderBy: [{ id: "asc" }],
      include: {
        child: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.json({
      items: items.map((x) => ({
        id: x.id,
        parentUserId: x.parentUserId,
        personelId: x.personelId,
        createdAt: x.createdAt,
        personel: x.child
          ? {
              id: x.child.id,
              fullName: x.child.fullName,
              phone: x.child.phone,
              kind: x.child.kind || null,
              company: x.child.company ? { id: x.child.company.id, name: x.child.company.name } : null,
            }
          : null,
      })),
    });
  });

  // POST /api/admin/parent-children { parentUserId, personelId }
  r.post("/parent-children", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const parentUserId = Number(req.body?.parentUserId || 0);
    const personelId = Number(req.body?.personelId || 0);
    if (!parentUserId || !personelId) return res.status(400).json({ error: "parentUserId and personelId required" });

    const parent = await prisma.user.findUnique({ where: { id: parentUserId }, select: { id: true, role: true, email: true } });
    if (!parent) return res.status(404).json({ error: "Parent user not found" });
    if (parent.role !== "PARENT") return res.status(400).json({ error: "User role must be PARENT" });

    const p = await prisma.personel.findUnique({ where: { id: personelId }, select: { id: true, kind: true } });
    if (!p) return res.status(404).json({ error: "Student not found" });
    if (p.kind && p.kind !== "STUDENT") return res.status(400).json({ error: "Personel.kind must be STUDENT" });

    // idempotent bind (unique (parentUserId, personelId))
    const existing = await prisma.parentChild.findFirst({ where: { parentUserId, personelId }, select: { id: true } });
    let created = null;

    if (existing) {
      created = await prisma.parentChild.findUnique({
        where: { id: existing.id },
        include: { child: { include: { company: { select: { id: true, name: true } } } } },
      });
    } else {
      created = await prisma.parentChild.create({
        data: { parentUserId, personelId },
        include: { child: { include: { company: { select: { id: true, name: true } } } } },
      });
      await audit(req, { action: "ADMIN_PARENT_CHILD_LINK", entity: "ParentChild", entityId: created.id, meta: { parentUserId, personelId } });
    }

    res.status(201).json({
      ok: true,
      item: {
        id: created.id,
        parentUserId: created.parentUserId,
        personelId: created.personelId,
        createdAt: created.createdAt,
        personel: created.child
          ? {
              id: created.child.id,
              fullName: created.child.fullName,
              phone: created.child.phone,
              kind: created.child.kind || null,
              company: created.child.company ? { id: created.child.company.id, name: created.child.company.name } : null,
            }
          : null,
      },
    });
  });

  // DELETE /api/admin/parent-children/:id
  r.delete("/parent-children/:id", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const existing = await prisma.parentChild.findUnique({ where: { id }, select: { id: true, parentUserId: true, personelId: true } });
    if (!existing) return res.status(404).json({ error: "Link not found" });

    await prisma.parentChild.delete({ where: { id } });
    await audit(req, { action: "ADMIN_PARENT_CHILD_UNLINK", entity: "ParentChild", entityId: id, meta: { parentUserId: existing.parentUserId, personelId: existing.personelId } });

    res.json({ ok: true });
  });


  // --- Regions (İl) ---
  r.get("/regions", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    const items = await prisma.region.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] });
    res.json({ items });
  });

  r.post("/regions", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const name = String(req.body?.name || "").trim();
    if (name.length < 2) return res.status(400).json({ error: "Region name required" });

    const exists = await prisma.region.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (exists) return res.status(409).json({ error: "Region already exists" });

    const created = await prisma.region.create({ data: { name } });
    res.status(201).json(created);
  });

  r.put("/regions/:id", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const name = String(req.body?.name || "").trim();
    if (name.length < 2) return res.status(400).json({ error: "Region name required" });

    const exists = await prisma.region.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, NOT: { id } },
      select: { id: true },
    });
    if (exists) return res.status(409).json({ error: "Region name already used" });

    const updated = await prisma.region.update({ where: { id }, data: { name } });
    res.json(updated);
  });

  r.delete("/regions/:id", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const [c, ro] = await Promise.all([
      prisma.company.count({ where: { regionId: id, status: { not: "DELETED" } } }),
      prisma.room.count({ where: { regionId: id, status: { not: "DELETED" } } }),
    ]);
    if (c > 0 || ro > 0) return res.status(409).json({ error: "Region in use", companies: c, rooms: ro });

    await prisma.region.delete({ where: { id } });
    res.json({ ok: true });
  });

  return r;
}