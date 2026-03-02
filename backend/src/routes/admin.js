// backend/src/routes/admin.js
// SUPER_ADMIN ops endpoints (stats + users + regions) + audit logs

import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { audit } from "../audit.js";
import { authRequired, requireRole } from "../auth/middleware.js";

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

const createUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    fullName: z.string().trim().min(2),
    phone: z.string().trim().optional(),
    role: z.enum(["ROOM", "COMPANY", "DRIVER", "PERSONEL", "PARENT"]),
    roomId: z.number().int().positive().optional().nullable(),
    companyId: z.number().int().positive().optional().nullable(),
    password: z.string().min(4).optional(),
  })
  .superRefine((v, ctx) => {
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
      if (v.companyId) ctx.addIssue({ code: "custom", message: "PARENT must not have companyId" });
      if (v.roomId) ctx.addIssue({ code: "custom", message: "PARENT must not have roomId" });
    }
  });

const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    phone: z.string().trim().optional().nullable(),
    roomId: z.number().int().positive().optional().nullable(),
    companyId: z.number().int().positive().optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export function adminRouter() {
  const r = express.Router();

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
    const q = String(req.query.q || "").trim();
    const role = String(req.query.role || "").trim().toUpperCase();

    const where = {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { fullName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const items = await prisma.user.findMany({
      where,
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

    const mapped = items.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      fullName: u.fullName,
      phone: u.phone,
      companyId: u.companyId,
      roomId: u.roomId,
      createdAt: u.createdAt,
      disabled: isDisabledHash(u.passwordHash),
    }));

    res.json({ items: mapped });
  });

  r.post("/users", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { email, fullName, phone, role, roomId, companyId } = parsed.data;
    const password = parsed.data.password || genPassword();

    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return res.status(409).json({ error: "Email already exists" });

    if (roomId) {
      const rr = await prisma.room.findUnique({ where: { id: Number(roomId) }, select: { id: true, status: true } });
      if (!rr || rr.status === "DELETED") return res.status(400).json({ error: "Room not found" });
    }
    if (companyId) {
      const cc = await prisma.company.findUnique({ where: { id: Number(companyId) }, select: { id: true, status: true } });
      if (!cc || cc.status === "DELETED") return res.status(400).json({ error: "Company not found" });
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

    await audit(req, { action: "ADMIN_USER_CREATE", entity: "User", entityId: created.id, meta: { email, role, roomId: created.roomId, companyId: created.companyId } });

    res.status(201).json({
      user: { ...created, disabled: false },
      tempPassword: password,
      note:
        role === "PERSONEL"
          ? "PERSONEL user created. NOTE: Personel profile record is managed under /api/personels (COMPANY flow)."
          : role === "DRIVER"
          ? "DRIVER user created. NOTE: Driver profile record is managed under /api/drivers (ROOM flow)."
          : undefined,
    });
  });

  r.put("/users/:id", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = { ...parsed.data };
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

    await audit(req, { action: "ADMIN_USER_UPDATE", entity: "User", entityId: updated.id, meta: { email: updated.email, role: updated.role, roomId: updated.roomId, companyId: updated.companyId } });

    res.json({
      ok: true,
      user: {
        id: updated.id,
        email: updated.email,
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

    await audit(req, { action: "ADMIN_USER_RESET_PASSWORD", entity: "User", entityId: updated.id, meta: { email: updated.email, role: updated.role } });

    res.json({ ok: true, user: updated, tempPassword: nextPw });
  });

  r.post("/users/:id/disable", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    if (id === Number(req.user.id)) return res.status(400).json({ error: "Cannot disable self" });

    const u = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, passwordHash: true } });
    if (!u) return res.status(404).json({ error: "User not found" });

    if (isDisabledHash(u.passwordHash)) {
      return res.json({ ok: true, user: { id: u.id, email: u.email, role: u.role }, disabled: true });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { passwordHash: disabledHash(u.passwordHash) },
      select: { id: true, email: true, role: true },
    });

    await audit(req, { action: "ADMIN_USER_DISABLE", entity: "User", entityId: updated.id, meta: { email: updated.email, role: updated.role } });
    res.json({ ok: true, user: updated, disabled: true });
  });

  r.post("/users/:id/enable", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });

    const u = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, passwordHash: true } });
    if (!u) return res.status(404).json({ error: "User not found" });

    if (!isDisabledHash(u.passwordHash)) {
      return res.json({ ok: true, user: { id: u.id, email: u.email, role: u.role }, disabled: false });
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


  // --- Parent ↔ Student links ---
  const parentChildSchema = z.object({
    parentUserId: z.number().int().positive(),
    personelId: z.number().int().positive(),
  });

  // GET /api/admin/parent-children?parentUserId=
  r.get("/parent-children", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const parentUserId =
      req.query.parentUserId != null && String(req.query.parentUserId).trim() !== "" ? Number(req.query.parentUserId) : null;
    if (!parentUserId) return res.json({ items: [] });

    const links = await prisma.parentChild.findMany({
      where: { parentUserId },
      orderBy: [{ id: "asc" }],
      include: { child: { select: { id: true, fullName: true, kind: true, companyId: true } } },
    });

    res.json({
      items: links.map((x) => ({
        id: x.id,
        parentUserId: x.parentUserId,
        personelId: x.personelId,
        child: x.child,
        createdAt: x.createdAt,
      })),
    });
  });

  // POST /api/admin/parent-children
  r.post("/parent-children", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const parsed = parentChildSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { parentUserId, personelId } = parsed.data;

    const parent = await prisma.user.findUnique({ where: { id: parentUserId }, select: { id: true, role: true, email: true } });
    if (!parent || parent.role !== "PARENT") return res.status(400).json({ error: "Parent user not found or role!=PARENT" });

    const child = await prisma.personel.findUnique({ where: { id: personelId }, select: { id: true, kind: true } });
    if (!child) return res.status(400).json({ error: "Student not found" });
    if (child.kind !== "STUDENT") return res.status(400).json({ error: "Only STUDENT can be linked" });

    const exists = await prisma.parentChild.findUnique({
      where: { parentUserId_personelId: { parentUserId, personelId } },
      select: { id: true },
    });
    if (exists) return res.status(409).json({ error: "Link already exists" });

    const created = await prisma.parentChild.create({
      data: { parentUserId, personelId },
      select: { id: true, parentUserId: true, personelId: true, createdAt: true },
    });

    await audit(req.user, "parent_child:create", "ParentChild", created.id, { parentUserId, personelId });
    res.json({ item: created });
  });

  // DELETE /api/admin/parent-children/:id
  r.delete("/parent-children/:id", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const found = await prisma.parentChild.findUnique({
      where: { id },
      select: { id: true, parentUserId: true, personelId: true },
    });
    if (!found) return res.status(404).json({ error: "Not found" });

    await prisma.parentChild.delete({ where: { id } });
    await audit(req.user, "parent_child:delete", "ParentChild", id, found);
    res.json({ ok: true });
  });

    await audit(req, { action: "ADMIN_USER_ENABLE", entity: "User", entityId: updated.id, meta: { email: updated.email, role: updated.role } });
    res.json({ ok: true, user: updated, disabled: false });
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