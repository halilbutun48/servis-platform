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

// --- Log export helpers (SUPER_ADMIN) ---
function parseDateParam(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function clampTake(v, def = 200) {
  const n = Number(v || def);
  if (!Number.isFinite(n)) return def;
  return Math.min(2000, Math.max(1, n));
}

function safeJson(v) {
  try {
    return v == null ? null : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function fmtIso(ts) {
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts || "");
  }
}

function toCsvRow(cols) {
  return cols
    .map((c) => {
      const s = c == null ? "" : String(c);
      // RFC4180-ish
      const needs = /[",\n\r]/.test(s);
      const esc = s.replace(/"/g, '""');
      return needs ? `"${esc}"` : esc;
    })
    .join(",");
}

async function usersByEmailLike(emailLike) {
  const q = String(emailLike || "").trim().toLowerCase();
  if (!q) return [];
  const us = await prisma.user.findMany({
    where: { email: { contains: q, mode: "insensitive" } },
    select: { id: true, email: true, role: true, fullName: true, companyId: true, roomId: true },
    take: 500,
  });
  return us;
}

async function buildActorMap(ids) {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map();
  if (!uniq.length) return map;
  const us = await prisma.user.findMany({ where: { id: { in: uniq } }, select: { id: true, email: true, fullName: true, role: true } });
  for (const u of us) map.set(u.id, u);
  return map;
}

function sendTextAttachment(res, filename, content, contentType = "text/plain; charset=utf-8") {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(content);
}

function section(title) {
  return `\n\n# ${title}\n`;
}

function lineKV(k, v) {
  return `${k}: ${v == null ? "" : String(v)}\n`;
}

async function exportBundleTxt({ from, to, targetType, targetId, speedLimitKmhOverride }) {
  const now = new Date();
  const hdr = [];
  hdr.push("PERSONEL-SERVIS V1 — LOG BUNDLE EXPORT (TXT)\n");
  hdr.push(lineKV("generatedAt", fmtIso(now)));
  if (from) hdr.push(lineKV("from", fmtIso(from)));
  if (to) hdr.push(lineKV("to", fmtIso(to)));
  hdr.push(lineKV("targetType", targetType));
  hdr.push(lineKV("targetId", targetId));
  if (speedLimitKmhOverride != null) hdr.push(lineKV("speedLimitKmhOverride", speedLimitKmhOverride));
  hdr.push("\n");

  const parts = [hdr.join("")];

  const whereTime = (field = "createdAt") => ({
    ...(from ? { [field]: { gte: from } } : {}),
    ...(to ? { [field]: { ...(from ? { gte: from } : {}), lte: to } } : {}),
  });

  // --- helpers
  async function addLoginSection(user) {
    parts.push(section("LOGIN LOGS"));
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { in: ["AUTH_LOGIN_OK", "AUTH_LOGIN_FAIL", "AUTH_LOGIN_DISABLED"] },
        ...(user?.id ? { entityId: user.id } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take: 500,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    for (const x of logs) {
      parts.push(`${fmtIso(x.createdAt)}\t${x.action}\tuserId=${x.entityId || ""}\tmeta=${safeJson(x.meta)}\n`);
    }
    if (!logs.length) parts.push("(no login logs in range)\n");
  }

  async function addAuditSection({ actorUserId, entity, entityId }) {
    parts.push(section("AUDIT ACTIONS"));
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(actorUserId ? { actorUserId } : {}),
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take: 1000,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const actorMap = await buildActorMap(logs.map((x) => x.actorUserId));
    for (const x of logs) {
      const u = x.actorUserId ? actorMap.get(x.actorUserId) : null;
      parts.push(
        `${fmtIso(x.createdAt)}\t${x.action}\t${x.entity}#${x.entityId ?? ""}\tactor=${u?.email || x.actorUserId || "-"}\tmeta=${safeJson(x.meta)}\n`
      );
    }
    if (!logs.length) parts.push("(no audit logs in range)\n");
  }

  async function addRequestsSection({ userId, role, pathLike }) {
    parts.push(section("API REQUESTS"));
    const logs = await prisma.apiRequest.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(role ? { role } : {}),
        ...(pathLike ? { path: { contains: pathLike, mode: "insensitive" } } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take: 1500,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    for (const x of logs) {
      parts.push(`${fmtIso(x.createdAt)}\t${x.method}\t${x.status}\t${x.path}\t${x.durationMs}ms\tip=${x.ip || ""}\n`);
    }
    if (!logs.length) parts.push("(no api requests in range)\n");
  }

  async function addNotificationsSection(where) {
    parts.push(section("NOTIFICATIONS"));
    const logs = await prisma.notification.findMany({
      where: {
        ...where,
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take: 1000,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    for (const n of logs) {
      parts.push(`${fmtIso(n.createdAt)}\t${n.type}\tscope=${n.scope}\ttargets=${safeJson({ companyId: n.companyId, roomId: n.roomId, driverId: n.driverId, userId: n.userId, vehicleId: n.vehicleId, shiftId: n.shiftId })}\tpayload=${safeJson(n.payloadJson)}\n`);
    }
    if (!logs.length) parts.push("(no notifications in range)\n");
  }

  async function addVehicleSection(vehicleId) {
    parts.push(section("VEHICLE GPS"));
    const v = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { gpsLast: true, gpsState: true },
    });
    if (!v) {
      parts.push("(vehicle not found)\n");
      return;
    }
    parts.push(lineKV("vehicle", `${v.id} ${v.plate} roomId=${v.roomId} driverId=${v.driverId ?? ""} speedLimitKmh=${v.speedLimitKmh}`));
    parts.push(lineKV("gpsLast", safeJson(v.gpsLast)));
    parts.push(lineKV("gpsState", safeJson(v.gpsState)));

    // gps points
    const pts = await prisma.gpsPoint.findMany({
      where: {
        vehicleId,
        ...(from || to ? { at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take: 1000,
      orderBy: [{ at: "desc" }, { id: "desc" }],
    });
    for (const p of pts) parts.push(`${fmtIso(p.at)}\tlat=${p.lat}\tlng=${p.lng}\tspeed=${p.speed ?? ""}\n`);
    if (!pts.length) parts.push("(no gps points in range)\n");

    // speed violations
    parts.push(section("SPEED VIOLATIONS"));
    const limit = speedLimitKmhOverride != null ? Number(speedLimitKmhOverride) : v.speedLimitKmh;
    const viol = await prisma.gpsPoint.findMany({
      where: {
        vehicleId,
        speed: { not: null, gte: Number(limit) },
        ...(from || to ? { at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take: 500,
      orderBy: [{ at: "desc" }, { id: "desc" }],
    });
    for (const p of viol) parts.push(`${fmtIso(p.at)}\tspeed=${p.speed}\tlimit=${limit}\tlat=${p.lat}\tlng=${p.lng}\n`);
    if (!viol.length) parts.push("(no speed violations in range)\n");
  }

  // --- Dispatch by targetType
  if (targetType === "user") {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    parts.push(section("BASIC"));
    parts.push(lineKV("user", safeJson(user)));
    await addLoginSection(user);
    await addAuditSection({ actorUserId: targetId });
    await addRequestsSection({ userId: targetId });
    await addNotificationsSection({ userId: targetId });
  } else if (targetType === "driver") {
    const driver = await prisma.driver.findUnique({ where: { id: targetId }, include: { user: true, room: true } });
    parts.push(section("BASIC"));
    parts.push(lineKV("driver", safeJson(driver)));
    if (driver?.userId) {
      await addLoginSection(driver.user);
      await addAuditSection({ actorUserId: driver.userId });
      await addRequestsSection({ userId: driver.userId });
    }
    await addNotificationsSection({ driverId: targetId });
    // vehicles bound to driver
    const vehicles = await prisma.vehicle.findMany({ where: { driverId: targetId }, select: { id: true } });
    for (const vv of vehicles) await addVehicleSection(vv.id);
  } else if (targetType === "vehicle") {
    await addVehicleSection(targetId);
    await addNotificationsSection({ vehicleId: targetId });
  } else if (targetType === "room") {
    const room = await prisma.room.findUnique({ where: { id: targetId } });
    parts.push(section("BASIC"));
    parts.push(lineKV("room", safeJson(room)));
    await addAuditSection({ entity: "Room", entityId: targetId });
    await addNotificationsSection({ roomId: targetId });
    // vehicles in room
    const vehicles = await prisma.vehicle.findMany({ where: { roomId: targetId }, select: { id: true } });
    for (const vv of vehicles) await addVehicleSection(vv.id);
    // requests by room users
    const users = await prisma.user.findMany({ where: { roomId: targetId }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      parts.push(section("API REQUESTS (ROOM USERS)"));
      const logs = await prisma.apiRequest.findMany({
        where: {
          userId: { in: ids },
          ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        },
        take: 1500,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      for (const x of logs) parts.push(`${fmtIso(x.createdAt)}\tuserId=${x.userId}\t${x.method}\t${x.status}\t${x.path}\n`);
      if (!logs.length) parts.push("(no api requests in range)\n");
    }
  } else if (targetType === "company") {
    const company = await prisma.company.findUnique({ where: { id: targetId } });
    parts.push(section("BASIC"));
    parts.push(lineKV("company", safeJson(company)));
    await addAuditSection({ entity: "Company", entityId: targetId });
    await addNotificationsSection({ companyId: targetId });
    // requests by company users
    const users = await prisma.user.findMany({ where: { companyId: targetId }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      parts.push(section("API REQUESTS (COMPANY USERS)"));
      const logs = await prisma.apiRequest.findMany({
        where: {
          userId: { in: ids },
          ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        },
        take: 1500,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      for (const x of logs) parts.push(`${fmtIso(x.createdAt)}\tuserId=${x.userId}\t${x.method}\t${x.status}\t${x.path}\n`);
      if (!logs.length) parts.push("(no api requests in range)\n");
    }
  } else if (targetType === "personel" || targetType === "student") {
    const p = await prisma.personel.findUnique({ where: { id: targetId }, include: { user: true, company: true } });
    parts.push(section("BASIC"));
    parts.push(lineKV("personel", safeJson(p)));
    if (targetType === "student" && String(p?.kind) !== "STUDENT") {
      parts.push("WARN: targetType=student but personel.kind is not STUDENT\n");
    }
    if (p?.userId) {
      await addLoginSection(p.user);
      await addAuditSection({ actorUserId: p.userId });
      await addRequestsSection({ userId: p.userId });
      await addNotificationsSection({ userId: p.userId });
    }
    // assignments
    parts.push(section("ASSIGNMENTS (StopAssignment)"));
    const asg = await prisma.stopAssignment.findMany({
      where: { personelId: targetId },
      take: 200,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    for (const a of asg) parts.push(`${fmtIso(a.createdAt)}\tshiftId=${a.shiftId}\tstopId=${a.stopId}\twalkM=${a.walkM}\n`);
    if (!asg.length) parts.push("(no assignments)\n");
  } else {
    parts.push("\nERROR: unsupported targetType\n");
  }

  return parts.join("");
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
      if (v.roomId) ctx.addIssue({ code: "custom", message: "PARENT must not have roomId" });
      if (v.companyId) ctx.addIssue({ code: "custom", message: "PARENT must not have companyId" });
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

// --- SuperAdmin Log Export ---
// Preview: GET /api/admin/logs/preview?kind=login|audit|requests&from=&to=&take=&userId=&email=&pathLike=&status=&ip=
r.get("/logs/preview", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
  const kind = String(req.query.kind || "audit").trim();
  const take = clampTake(req.query.take || 200, 200);
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const userId = req.query.userId != null && String(req.query.userId).trim() !== "" ? Number(req.query.userId) : null;
  const email = String(req.query.email || "").trim();
  const pathLike = String(req.query.pathLike || "").trim();
  const ip = String(req.query.ip || "").trim();
  const status = req.query.status != null && String(req.query.status).trim() !== "" ? Number(req.query.status) : null;

  // resolve email -> userIds (optional)
  let userIds = null;
  if (email) {
    const us = await usersByEmailLike(email);
    userIds = us.map((u) => u.id);
    if (!userIds.length) return res.json({ items: [] });
  }

  if (kind === "login") {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { in: ["AUTH_LOGIN_OK", "AUTH_LOGIN_FAIL", "AUTH_LOGIN_DISABLED"] },
        ...(userId ? { entityId: userId } : {}),
        ...(userIds ? { entityId: { in: userIds } } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return res.json({ items: logs });
  }

  if (kind === "requests") {
    const logs = await prisma.apiRequest.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(userIds ? { userId: { in: userIds } } : {}),
        ...(pathLike ? { path: { contains: pathLike, mode: "insensitive" } } : {}),
        ...(ip ? { ip: { contains: ip } } : {}),
        ...(status != null ? { status } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return res.json({ items: logs });
  }

  // default: audit
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(userId ? { actorUserId: userId } : {}),
      ...(userIds ? { actorUserId: { in: userIds } } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    take,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return res.json({ items: logs });
});

// Export: GET /api/admin/logs/export?kind=login|audit|requests|bundle&format=txt|csv&from=&to=&userId=&email=&targetType=&targetId=
r.get("/logs/export", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
  const kind = String(req.query.kind || "audit").trim();
  const format = String(req.query.format || "txt").trim().toLowerCase();
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const userId = req.query.userId != null && String(req.query.userId).trim() !== "" ? Number(req.query.userId) : null;
  const email = String(req.query.email || "").trim();
  const pathLike = String(req.query.pathLike || "").trim();
  const ip = String(req.query.ip || "").trim();
  const status = req.query.status != null && String(req.query.status).trim() !== "" ? Number(req.query.status) : null;

  const targetType = String(req.query.targetType || "").trim();
  const targetId = req.query.targetId != null && String(req.query.targetId).trim() !== "" ? Number(req.query.targetId) : null;
  const speedLimitKmh = req.query.speedLimitKmh != null && String(req.query.speedLimitKmh).trim() !== "" ? Number(req.query.speedLimitKmh) : null;

  // email -> ids
  let userIds = null;
  if (email) {
    const us = await usersByEmailLike(email);
    userIds = us.map((u) => u.id);
    if (!userIds.length) userIds = [-1];
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `superadmin_${kind}_${stamp}`;

  // Bundles (multi-section TXT only)
  if (kind.startsWith("bundle")) {
    if (!targetType || !targetId) return res.status(400).json({ error: "targetType and targetId required for bundle" });
    const txt = await exportBundleTxt({
      from,
      to,
      targetType,
      targetId,
      speedLimitKmhOverride: speedLimitKmh,
    });
    return sendTextAttachment(res, `${base}_${targetType}_${targetId}.txt`, txt, "text/plain; charset=utf-8");
  }

  // Non-bundle: list export
  const take = clampTake(req.query.take || 2000, 2000);

  if (kind === "login") {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { in: ["AUTH_LOGIN_OK", "AUTH_LOGIN_FAIL", "AUTH_LOGIN_DISABLED"] },
        ...(userId ? { entityId: userId } : {}),
        ...(userIds ? { entityId: { in: userIds } } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (format === "csv") {
      const rows = [];
      rows.push(toCsvRow(["createdAt", "action", "entityId", "meta"]));
      for (const x of logs) rows.push(toCsvRow([fmtIso(x.createdAt), x.action, x.entityId ?? "", safeJson(x.meta)]));
      return sendTextAttachment(res, `${base}.csv`, rows.join("\n"), "text/csv; charset=utf-8");
    }

    const lines = [];
    for (const x of logs) lines.push(`${fmtIso(x.createdAt)}\t${x.action}\tuserId=${x.entityId ?? ""}\tmeta=${safeJson(x.meta)}`);
    return sendTextAttachment(res, `${base}.txt`, lines.join("\n") + "\n");
  }

  if (kind === "requests") {
    const logs = await prisma.apiRequest.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(userIds ? { userId: { in: userIds } } : {}),
        ...(pathLike ? { path: { contains: pathLike, mode: "insensitive" } } : {}),
        ...(ip ? { ip: { contains: ip } } : {}),
        ...(status != null ? { status } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (format === "csv") {
      const rows = [];
      rows.push(toCsvRow(["createdAt", "method", "status", "path", "durationMs", "ip", "userId", "role", "userAgent"]));
      for (const x of logs) rows.push(toCsvRow([fmtIso(x.createdAt), x.method, x.status, x.path, x.durationMs, x.ip ?? "", x.userId ?? "", x.role ?? "", x.userAgent ?? ""]));
      return sendTextAttachment(res, `${base}.csv`, rows.join("\n"), "text/csv; charset=utf-8");
    }

    const lines = [];
    for (const x of logs) lines.push(`${fmtIso(x.createdAt)}\t${x.method}\t${x.status}\t${x.path}\t${x.durationMs}ms\tip=${x.ip || ""}\tuserId=${x.userId || ""}\trole=${x.role || ""}`);
    return sendTextAttachment(res, `${base}.txt`, lines.join("\n") + "\n");
  }

  // audit
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(userId ? { actorUserId: userId } : {}),
      ...(userIds ? { actorUserId: { in: userIds } } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    take,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (format === "csv") {
    const rows = [];
    rows.push(toCsvRow(["createdAt", "actorUserId", "actorRole", "action", "entity", "entityId", "meta"]));
    for (const x of logs) rows.push(toCsvRow([fmtIso(x.createdAt), x.actorUserId ?? "", x.actorRole ?? "", x.action, x.entity, x.entityId ?? "", safeJson(x.meta)]));
    return sendTextAttachment(res, `${base}.csv`, rows.join("\n"), "text/csv; charset=utf-8");
  }

  const lines = [];
  for (const x of logs) lines.push(`${fmtIso(x.createdAt)}\t${x.action}\t${x.entity}#${x.entityId ?? ""}\tactorUserId=${x.actorUserId ?? ""}\trole=${x.actorRole ?? ""}\tmeta=${safeJson(x.meta)}`);
  return sendTextAttachment(res, `${base}.txt`, lines.join("\n") + "\n");
});

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

    await audit(req, { action: "ADMIN_USER_ENABLE", entity: "User", entityId: updated.id, meta: { email: updated.email, role: updated.role } });
    res.json({ ok: true, user: updated, disabled: false });
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