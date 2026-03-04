// backend/src/routes/logs.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";

function parseIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function toCsvRow(cols) {
  const esc = (x) => {
    const s = x == null ? "" : String(x);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return cols.map(esc).join(",");
}

function fmtTR(d) {
  if (!d) return "";
  const ms = d instanceof Date ? d.getTime() : new Date(d).getTime();
  if (!Number.isFinite(ms)) return "";
  const tr = new Date(ms + 3 * 60 * 60 * 1000); // TR = UTC+03
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = tr.getUTCFullYear();
  const mm = pad(tr.getUTCMonth() + 1);
  const dd = pad(tr.getUTCDate());
  const hh = pad(tr.getUTCHours());
  const mi = pad(tr.getUTCMinutes());
  const ss = pad(tr.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function asTxtSection(title) {
  return `
== ${title} ==
`;
}

function lineTR(d, rest) {
  const ts = d ? fmtTR(d) : fmtTR(new Date());
  return `[TR ${ts}] ${rest}
`;
}

function safeJson(x, maxLen = 500) {
  try {
    const s = JSON.stringify(x ?? {});
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + `…(+${s.length - maxLen})`;
  } catch {
    return "{}";
  }
}
async function scopeUserIds(req) {
  // Determines which userIds this caller is allowed to see in "global" logs (api/audit/login without target)
  const me = req.user;
  if (!me) return [];
  if (me.role === "SUPER_ADMIN") return null; // null => no filter (all)
  if (me.role === "ROOM") {
    if (!me.roomId) return [me.id];
    const us = await prisma.user.findMany({ where: { roomId: me.roomId }, select: { id: true } });
    return us.map((u) => u.id);
  }
  if (me.role === "COMPANY") {
    if (!me.companyId) return [me.id];
    const us = await prisma.user.findMany({ where: { companyId: me.companyId }, select: { id: true } });
    return us.map((u) => u.id);
  }
  // DRIVER / PERSONEL / PARENT: only self
  return [me.id];
}

async function ensureAccess(req, targetType, targetId, childId) {
  const role = req.user?.role;

  // SUPER_ADMIN: everything
  if (role === "SUPER_ADMIN") return { ok: true };

  // PARENT: only own notifications + child-linked vehicle (ACTIVE shift)
  if (role === "PARENT") {
    if (targetType === "user") {
      if (Number(targetId) !== Number(req.user.id)) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "child") {
      const rel = await prisma.parentChild.findFirst({
        where: { parentUserId: req.user.id, personelId: Number(targetId) },
        select: { id: true },
      });
      if (!rel) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "vehicle") {
      const cid = Number(childId || 0);
      if (!cid) return { ok: false, status: 400, error: "childId required for parent vehicle export" };

      const rel = await prisma.parentChild.findFirst({
        where: { parentUserId: req.user.id, personelId: cid },
        select: { id: true },
      });
      if (!rel) return { ok: false, status: 403, error: "Forbidden" };

      const active = await prisma.shift.findFirst({
        where: {
          status: "ACTIVE",
          vehicleId: Number(targetId),
          stopAssignments: { some: { personelId: cid } },
        },
        select: { id: true },
      });
      if (!active) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }

    // deny other targetTypes for parent
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // ROOM: entities within room
  if (role === "ROOM") {
    const roomId = Number(req.user.roomId || 0);
    if (!roomId) return { ok: false, status: 403, error: "Forbidden" };

    if (targetType === "room") {
      if (Number(targetId) !== roomId) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "vehicle") {
      const v = await prisma.vehicle.findUnique({ where: { id: Number(targetId) }, select: { roomId: true } });
      if (!v || Number(v.roomId) !== roomId) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "driver") {
      const d = await prisma.driver.findUnique({ where: { id: Number(targetId) }, select: { roomId: true } });
      if (!d || Number(d.roomId) !== roomId) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "user") {
      // allow only own user (room user)
      if (Number(targetId) !== Number(req.user.id)) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // COMPANY: company-bound entities
  if (role === "COMPANY") {
    const companyId = Number(req.user.companyId || 0);
    if (!companyId) return { ok: false, status: 403, error: "Forbidden" };

    if (targetType === "company") {
      if (Number(targetId) !== companyId) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "personel" || targetType === "child") {
      const p = await prisma.personel.findUnique({ where: { id: Number(targetId) }, select: { companyId: true } });
      if (!p || Number(p.companyId) !== companyId) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "user") {
      if (Number(targetId) !== Number(req.user.id)) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    // Vehicles belong to ROOM; deny
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // DRIVER: only own driver + default vehicle binding
  if (role === "DRIVER") {
    const meDriver = await prisma.driver.findFirst({
      where: { userId: req.user.id },
      select: { id: true },
    });
    const driverId = Number(meDriver?.id || 0);
    if (!driverId) return { ok: false, status: 403, error: "Forbidden" };

    if (targetType === "driver") {
      if (Number(targetId) !== driverId) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "vehicle") {
      const v = await prisma.vehicle.findUnique({ where: { id: Number(targetId) }, select: { driverId: true } });
      if (!v || Number(v.driverId || 0) !== driverId) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    if (targetType === "user") {
      if (Number(targetId) !== Number(req.user.id)) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // PERSONEL: only own user notifications (and future extensions)
  if (role === "PERSONEL") {
    if (targetType === "user") {
      if (Number(targetId) !== Number(req.user.id)) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

function defaultFromTo(from, to) {
  const now = new Date();
  const dTo = to || now;
  const dFrom = from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { from: dFrom, to: dTo };
}

function formatFilename({ kind, targetType, targetId, format }) {
  const safe = (s) => String(s || "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const ext = format === "csv" ? "csv" : "txt";
  return `logs_${safe(kind)}_${safe(targetType)}_${safe(targetId)}_${Date.now()}.${ext}`;
}

async function fetchGps(vehicleId, from, to) {
  return prisma.gpsPoint.findMany({
    where: { vehicleId, at: { gte: from, lte: to } },
    orderBy: { at: "asc" },
    take: 10000,
    select: { at: true, lat: true, lng: true, speed: true },
  });
}

async function fetchNotifications(whereBase) {
  return prisma.notification.findMany({
    where: whereBase,
    orderBy: { createdAt: "asc" },
    take: 10000,
    select: { createdAt: true, type: true, scope: true, payloadJson: true, companyId: true, roomId: true, driverId: true, userId: true, vehicleId: true, shiftId: true },
  });
}

async function fetchAudit(whereBase) {
  return prisma.auditLog.findMany({
    where: whereBase,
    orderBy: { createdAt: "asc" },
    take: 10000,
    select: { createdAt: true, actorUserId: true, actorRole: true, action: true, entity: true, entityId: true, meta: true },
  });
}

async function fetchApiRequests(whereBase) {
  return prisma.apiRequest.findMany({
    where: whereBase,
    orderBy: { createdAt: "asc" },
    take: 10000,
    select: { createdAt: true, method: true, path: true, status: true, durationMs: true, userId: true, role: true, ip: true, userAgent: true },
  });
}

function sendExport(res, { body, format, filename }) {
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
  } else {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
  }
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(body);
}

export default function logsRouter() {
  const r = express.Router();


// GET /api/logs/preview
// kind=bundle_vehicle|gps|speed|notifications|audit|api
// returns { summary, items } where items are most-recent-first
r.get("/preview", authRequired(), async (req, res) => {
  try {
    const kind0 = String(req.query.kind || "");
    const kind = kind0 === "requests" ? "api" : (kind0 === "login" ? "login" : kind0);
    const targetType = String(req.query.targetType || "");
    const targetId = Number(req.query.targetId || 0);
    const childId = req.query.childId ? Number(req.query.childId) : null;

    const take = Math.min(500, Math.max(1, Number(req.query.take || 250)));

    const from0 = parseIsoOrNull(req.query.from);
    const to0 = parseIsoOrNull(req.query.to);
    const { from, to } = defaultFromTo(from0, to0);

    const now = new Date();

    const mk = (ts, cat, level, text, meta) => ({
      ts,
      tsTR: fmtTR(ts),
      cat,
      level,
      text,
      meta: meta || null,
    });

    const items = [];

    // bundle_vehicle
    if (kind === "bundle_vehicle") {
      if (targetType !== "vehicle" || !targetId) return res.status(400).json({ error: "bundle_vehicle requires targetType=vehicle&targetId" });
      const acc = await ensureAccess(req, "vehicle", targetId, childId);
      if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

      const vehicle = await prisma.vehicle.findUnique({ where: { id: targetId }, select: { speedLimitKmh: true, plate: true } });
      const limit = Number(req.query.speedLimitKph || vehicle?.speedLimitKmh || 80);

      const gps = await prisma.gpsPoint.findMany({
        where: { vehicleId: targetId, at: { gte: from, lte: to } },
        orderBy: { at: "desc" },
        take: Math.min(400, take),
        select: { at: true, lat: true, lng: true, speed: true },
      });

      const notifs = await prisma.notification.findMany({
        where: { vehicleId: targetId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "desc" },
        take: Math.min(200, take),
        select: { createdAt: true, type: true, scope: true, payloadJson: true, shiftId: true, vehicleId: true },
      });

      for (const p of gps) {
        const sp = Number(p.speed ?? 0);
        const cat = sp >= limit ? "SPEED" : "GPS";
        const level = sp >= limit ? "WARN" : "OK";
        items.push(mk(p.at, cat, level, `lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`, { speedLimitKph: limit }));
      }

      for (const n of notifs) {
        const payload = n.payloadJson || {};
        const stopName = payload.stopName || payload.stop?.name || payload.nextStop?.name || null;
        const child = payload.childId || payload.personelId || payload.studentId || payload.personel?.id || null;
        const extra = `${child ? ` childId=${child}` : ""}${stopName ? ` stop=${stopName}` : ""}`;
        items.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}${extra}`, { shiftId: n.shiftId || null }));
      }

      items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      const trimmed = items.slice(0, take);

      const summary = {
        kind,
        target: `vehicle#${targetId}`,
        plate: vehicle?.plate || null,
        rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
        generatedAtTR: fmtTR(now),
        counts: trimmed.reduce((acc2, it) => {
          acc2.total++;
          acc2.byCat[it.cat] = (acc2.byCat[it.cat] || 0) + 1;
          acc2.byLevel[it.level] = (acc2.byLevel[it.level] || 0) + 1;
          return acc2;
        }, { total: 0, byCat: {}, byLevel: {} }),
      };

      return res.json({ summary, items: trimmed });
    }

    // gps/speed
    if (["gps", "speed"].includes(kind)) {
      if (targetType !== "vehicle" || !targetId) return res.status(400).json({ error: "gps/speed require targetType=vehicle&targetId" });
      const acc = await ensureAccess(req, "vehicle", targetId, childId);
      if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

      const vehicle = await prisma.vehicle.findUnique({ where: { id: targetId }, select: { speedLimitKmh: true, plate: true } });
      const limit = Number(req.query.speedLimitKph || vehicle?.speedLimitKmh || 80);

      const gps = await prisma.gpsPoint.findMany({
        where: { vehicleId: targetId, at: { gte: from, lte: to } },
        orderBy: { at: "desc" },
        take: Math.min(500, take * 2),
        select: { at: true, lat: true, lng: true, speed: true },
      });

      for (const p of gps) {
        const sp = Number(p.speed ?? 0);
        if (kind === "speed" && sp < limit) continue;
        const cat = sp >= limit ? "SPEED" : "GPS";
        const level = sp >= limit ? "WARN" : "OK";
        items.push(mk(p.at, cat, level, `lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`, { speedLimitKph: limit }));
      }

      const trimmed = items.slice(0, take);
      const summary = {
        kind,
        target: `vehicle#${targetId}`,
        plate: vehicle?.plate || null,
        rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
        generatedAtTR: fmtTR(now),
        counts: trimmed.reduce((acc2, it) => {
          acc2.total++;
          acc2.byCat[it.cat] = (acc2.byCat[it.cat] || 0) + 1;
          acc2.byLevel[it.level] = (acc2.byLevel[it.level] || 0) + 1;
          return acc2;
        }, { total: 0, byCat: {}, byLevel: {} }),
      };
      return res.json({ summary, items: trimmed });
    }

    if (kind === "notifications") {
      let tType = targetType;
      let tId = targetId;

      if (req.user.role === "PARENT" && (!tType || !tId)) {
        tType = "user";
        tId = Number(req.user.id);
      }
      if (!tType || !tId) return res.status(400).json({ error: "notifications require targetType&targetId (or parent default)" });

      const acc = await ensureAccess(req, tType, tId, childId);
      if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

      const where = { createdAt: { gte: from, lte: to } };
      const colMap = { company: "companyId", room: "roomId", driver: "driverId", user: "userId", vehicle: "vehicleId", shift: "shiftId" };
      const col = colMap[tType];
      if (!col) return res.status(400).json({ error: "unsupported targetType for notifications" });
      where[col] = Number(tId);

      const rows = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        select: { createdAt: true, type: true, scope: true, payloadJson: true, shiftId: true, vehicleId: true },
      });

      for (const n of rows) {
        const payload = n.payloadJson || {};
        const stopName = payload.stopName || payload.stop?.name || payload.nextStop?.name || null;
        const child = payload.childId || payload.personelId || payload.studentId || payload.personel?.id || null;
        const extra = `${child ? ` childId=${child}` : ""}${stopName ? ` stop=${stopName}` : ""}`;
        items.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}${extra}`, { shiftId: n.shiftId || null, vehicleId: n.vehicleId || null }));
      }

      const summary = {
        kind,
        target: `${tType}#${tId}`,
        rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
        generatedAtTR: fmtTR(now),
        counts: { total: items.length, byCat: { NOTIF: items.length }, byLevel: { INFO: items.length } },
      };
      return res.json({ summary, items });
    }

    if (kind === "audit") {
      const where = { createdAt: { gte: from, lte: to } };

      if (!targetType || !targetId) {
        const ids = await scopeUserIds(req);
        if (Array.isArray(ids)) where.actorUserId = { in: ids };
        // SUPER_ADMIN => ids is null => no filter (all)
      }
      if (targetType && targetId) {
  if (targetType === "user") where.actorUserId = Number(targetId);
  else {
    where.entity = String(targetType).toUpperCase();
    where.entityId = Number(targetId);
  }
}

      const rows = await prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: { id: true, createdAt: true, actorUserId: true, actorRole: true, action: true, entity: true, entityId: true, meta: true },
      });

      const userIds = Array.from(new Set(rows.map((x) => x.actorUserId).filter(Boolean)));
      const users = userIds.length
        ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
        : [];
      const umap = new Map(users.map((u) => [u.id, u.email]));

      for (const a of rows) {
        const actor = a.actorUserId ? (umap.get(a.actorUserId) || `user#${a.actorUserId}`) : "-";
        const lvl = String(a.action || "").includes("FAIL") || String(a.action || "").includes("DENY") ? "WARN" : "INFO";
        items.push(mk(a.createdAt, "AUDIT", lvl, `${a.action} actor=${actor} role=${a.actorRole || "-"} entity=${a.entity}${a.entityId ? "#" + a.entityId : ""}`, null));
      }

      const summary = {
        kind,
        target: (!targetType || !targetId) ? `scope:${req.user.role}` : `${targetType}#${targetId}`,
        rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
        generatedAtTR: fmtTR(now),
        counts: items.reduce((acc2, it) => {
          acc2.total++;
          acc2.byCat[it.cat] = (acc2.byCat[it.cat] || 0) + 1;
          acc2.byLevel[it.level] = (acc2.byLevel[it.level] || 0) + 1;
          return acc2;
        }, { total: 0, byCat: {}, byLevel: {} }),
      };
      return res.json({ summary, items });
    }

    if (kind === "api") {
      const where = { createdAt: { gte: from, lte: to } };

      if (!targetType || !targetId) {
        const ids = await scopeUserIds(req);
        if (Array.isArray(ids)) where.userId = { in: ids };
        // SUPER_ADMIN => ids is null => no filter (all)
      } else {
        const acc = await ensureAccess(req, targetType, targetId, childId);
        if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

        if (targetType === "user") where.userId = Number(targetId);
        else return res.status(400).json({ error: "api supports targetType=user only" });
      }

      const rows = await prisma.apiRequest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: { id: true, createdAt: true, method: true, path: true, status: true, durationMs: true, userId: true, role: true, ip: true },
      });

      for (const r0 of rows) {
        const lvl = Number(r0.status || 0) >= 400 ? "ERROR" : "OK";
        items.push(mk(r0.createdAt, "REQ", lvl, `${r0.method} ${r0.path} status=${r0.status} dur=${r0.durationMs}ms ip=${r0.ip || "-"}`, null));
      }

      const summary = {
        kind,
        target: (!targetType || !targetId) ? `scope:${req.user.role}` : `${targetType}#${targetId}`,
        rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
        generatedAtTR: fmtTR(now),
        counts: items.reduce((acc2, it) => {
          acc2.total++;
          acc2.byCat[it.cat] = (acc2.byCat[it.cat] || 0) + 1;
          acc2.byLevel[it.level] = (acc2.byLevel[it.level] || 0) + 1;
          return acc2;
        }, { total: 0, byCat: {}, byLevel: {} }),
      };
      return res.json({ summary, items });
    }

    

if (kind === "login") {
  const where = { createdAt: { gte: from, lte: to }, action: { startsWith: "AUTH_LOGIN_" } };

  // Scope: SUPER_ADMIN => all, ROOM/COMPANY => only their users, others => self
  const ids = await scopeUserIds(req);
  if (Array.isArray(ids)) where.actorUserId = { in: ids };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: { id: true, createdAt: true, actorUserId: true, action: true, meta: true },
  });

  for (const a of rows) {
    const meta = a.meta || {};
    const email = meta.email || "-";
    const ip = meta.ip || "-";
    const reason = meta.reason || "-";
    const lvl = String(a.action || "").includes("FAIL") || String(a.action || "").includes("DISABLED") ? "WARN" : "OK";
    items.push(mk(a.createdAt, "LOGIN", lvl, `${a.action} email=${email} ip=${ip} reason=${reason}`, null));
  }

  const summary = {
    kind,
    target: `scope:${req.user.role}`,
    rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
    generatedAtTR: fmtTR(now),
    counts: items.reduce((acc2, it) => {
      acc2.total++;
      acc2.byCat[it.cat] = (acc2.byCat[it.cat] || 0) + 1;
      acc2.byLevel[it.level] = (acc2.byLevel[it.level] || 0) + 1;
      return acc2;
    }, { total: 0, byCat: {}, byLevel: {} }),
  };
  return res.json({ summary, items });
}    return res.status(400).json({ error: "unknown kind" });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

  // GET /api/logs/export
  // kind=gps|speed|notifications|audit|api|bundle_vehicle
  r.get("/export", authRequired(), async (req, res) => {
    try {
      const kind0 = String(req.query.kind || "");
      const kind = kind0 === "requests" ? "api" : (kind0 === "login" ? "login" : kind0);
      const targetType = String(req.query.targetType || "");
      const targetId = Number(req.query.targetId || 0);
      const childId = req.query.childId ? Number(req.query.childId) : null;
      const format = String(req.query.format || "txt").toLowerCase() === "csv" ? "csv" : "txt";

      const from0 = parseIsoOrNull(req.query.from);
      const to0 = parseIsoOrNull(req.query.to);
      const { from, to } = defaultFromTo(from0, to0);

      if (!kind) return res.status(400).json({ error: "kind required" });

      // bundle_vehicle is a shortcut
      if (kind === "bundle_vehicle") {
        if (targetType !== "vehicle" || !targetId) return res.status(400).json({ error: "bundle_vehicle requires targetType=vehicle&targetId" });

        const acc = await ensureAccess(req, "vehicle", targetId, childId);
        if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

        const vehicle = await prisma.vehicle.findUnique({
          where: { id: targetId },
          select: { id: true, plate: true, capacity: true, roomId: true, speedLimitKmh: true },
        });

        const gps = await fetchGps(targetId, from, to);
        const limit = Number(req.query.speedLimitKph || vehicle?.speedLimitKmh || 80);
        const speedViol = gps.filter((p) => (p.speed ?? 0) >= limit);

        const notifWhere = {
          createdAt: { gte: from, lte: to },
          vehicleId: targetId,
        };
        const notifs = await fetchNotifications(notifWhere);

        if (format === "csv") {
          // Multi-section CSV = we prefix section rows
          const rows = [];
          rows.push(toCsvRow(["SECTION", "bundle_vehicle"]));
          rows.push(toCsvRow(["vehicleId", vehicle?.id, "plate", vehicle?.plate, "roomId", vehicle?.roomId, "from", from.toISOString(), "to", to.toISOString()]));

          rows.push(toCsvRow(["SECTION", "gps"]));
          rows.push(toCsvRow(["at", "lat", "lng", "speed"]));
          for (const p of gps) rows.push(toCsvRow([p.at?.toISOString?.() || String(p.at), p.lat, p.lng, p.speed ?? ""]));

          rows.push(toCsvRow(["SECTION", `speed>=${limit}`]));
          rows.push(toCsvRow(["at", "lat", "lng", "speed"]));
          for (const p of speedViol) rows.push(toCsvRow([p.at?.toISOString?.() || String(p.at), p.lat, p.lng, p.speed ?? ""]));

          rows.push(toCsvRow(["SECTION", "notifications"]));
          rows.push(toCsvRow(["createdAt", "type", "scope", "payload"]));
          for (const n of notifs) rows.push(toCsvRow([n.createdAt.toISOString(), n.type, n.scope, JSON.stringify(n.payloadJson || {})]));

          const body = rows.join("\n") + "\n";
          return sendExport(res, { body, format, filename: formatFilename({ kind, targetType, targetId, format }) });
        }

        
// TXT
        let out = "";
        out += "# LOG EXPORT\n";
        out += `# kind=bundle_vehicle target=vehicle#${vehicle?.id} plate=${vehicle?.plate} roomId=${vehicle?.roomId} capacity=${vehicle?.capacity}
`;
        out += `# range(TR): ${fmtTR(from)} -> ${fmtTR(to)}
`;
        out += `# generatedAt(TR): ${fmtTR(new Date())}
`;
        out += "\n";

        out += asTxtSection("SUMMARY");
        out += `gpsPoints=${gps.length} speedViolations=${speedViol.length} notifications=${notifs.length} speedLimitKph=${limit}
`;

        out += asTxtSection("GPS LAST");
        if (!gps.length) out += "(none)\n";
        else {
          const last = gps[gps.length - 1];
          out += lineTR(last.at, `GPS lat=${last.lat.toFixed(6)} lng=${last.lng.toFixed(6)} speed=${last.speed ?? "-"}`);
        }

        out += asTxtSection("GPS POINTS");
        if (!gps.length) out += "(no gps points)\n";
        else {
          const MAX = 2000;
          const step = gps.length > MAX ? Math.ceil(gps.length / MAX) : 1;
          if (step > 1) out += `note: sampled every ${step} points (showing ~${Math.ceil(gps.length / step)} of ${gps.length})
`;
          for (let i = 0; i < gps.length; i += step) {
            const p = gps[i];
            out += lineTR(p.at, `GPS lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`);
          }
        }

        out += asTxtSection(`SPEED VIOLATIONS (>=${limit} kph)`);
        if (!speedViol.length) out += "(none)\n";
        else {
          for (const p of speedViol) {
            out += lineTR(p.at, `SPEED speed=${p.speed ?? "-"} lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)}`);
          }
        }

        out += asTxtSection("NOTIFICATIONS (vehicle)");
        if (!notifs.length) out += "(none)\n";
        else {
          for (const n of notifs) {
            const payload = n.payloadJson || {};
            const stopName = payload.stopName || payload.stop?.name || payload.nextStop?.name || null;
            const child = payload.childId || payload.personelId || payload.studentId || payload.personel?.id || null;
            const extra = `${child ? ` childId=${child}` : ""}${stopName ? ` stop=${stopName}` : ""}`;
            out += lineTR(n.createdAt, `NOTIF type=${n.type} scope=${n.scope}${extra} shiftId=${n.shiftId || "-"} vehicleId=${n.vehicleId || "-"} payload=${safeJson(payload)}`);
          }
        }

        return sendExport(res, { body: out, format, filename: formatFilename({ kind, targetType, targetId, format }) });
}

      // non-bundle kinds need targetType/Id in most cases
      if (["gps", "speed"].includes(kind)) {
        if (targetType !== "vehicle" || !targetId) return res.status(400).json({ error: "gps/speed require targetType=vehicle&targetId" });
        const acc = await ensureAccess(req, "vehicle", targetId, childId);
        if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

        const gps = await fetchGps(targetId, from, to);

        if (kind === "speed") {
          const vehicle = await prisma.vehicle.findUnique({
            where: { id: targetId },
            select: { speedLimitKmh: true, plate: true },
          });
          const limit = Number(req.query.speedLimitKph || vehicle?.speedLimitKmh || 80);
          const only = gps.filter((p) => (p.speed ?? 0) >= limit);

          if (format === "csv") {
            const rows = [];
            rows.push(toCsvRow(["at", "lat", "lng", "speed"]));
            for (const p of only) rows.push(toCsvRow([p.at.toISOString(), p.lat, p.lng, p.speed ?? ""]));
            return sendExport(res, { body: rows.join("\n") + "\n", format, filename: formatFilename({ kind, targetType, targetId, format }) });
          }

          
let out = "";
          out += "# LOG EXPORT\n";
          out += `# kind=speed target=vehicle#${targetId} limit>=${limit}
`;
          out += `# range(TR): ${fmtTR(from)} -> ${fmtTR(to)}
`;
          out += `# generatedAt(TR): ${fmtTR(new Date())}

`;
          out += asTxtSection(`SPEED VIOLATIONS (>=${limit} kph)`);
          if (!only.length) out += "(none)\n";
          for (const p of only) out += lineTR(p.at, `SPEED speed=${p.speed ?? "-"} lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)}`);
          return sendExport(res, { body: out, format, filename: formatFilename({ kind, targetType, targetId, format }) });
}

        // gps
        if (format === "csv") {
          const rows = [];
          rows.push(toCsvRow(["at", "lat", "lng", "speed"]));
          for (const p of gps) rows.push(toCsvRow([p.at.toISOString(), p.lat, p.lng, p.speed ?? ""]));
          return sendExport(res, { body: rows.join("\n") + "\n", format, filename: formatFilename({ kind, targetType, targetId, format }) });
        }

        
let out = "";
        out += "# LOG EXPORT\n";
        out += `# kind=gps target=vehicle#${targetId}
`;
        out += `# range(TR): ${fmtTR(from)} -> ${fmtTR(to)}
`;
        out += `# generatedAt(TR): ${fmtTR(new Date())}

`;

        out += asTxtSection("GPS POINTS");
        if (!gps.length) out += "(none)\n";
        else {
          const MAX = 2000;
          const step = gps.length > MAX ? Math.ceil(gps.length / MAX) : 1;
          if (step > 1) out += `note: sampled every ${step} points (showing ~${Math.ceil(gps.length / step)} of ${gps.length})
`;
          for (let i = 0; i < gps.length; i += step) {
            const p = gps[i];
            out += lineTR(p.at, `GPS lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`);
          }
        }

        return sendExport(res, { body: out, format, filename: formatFilename({ kind, targetType, targetId, format }) });
}

      if (kind === "notifications") {
        // targetType can be user/company/room/driver/vehicle/shift. For parent default to own user.
        let tType = targetType;
        let tId = targetId;

        if (req.user.role === "PARENT" && (!tType || !tId)) {
          tType = "user";
          tId = Number(req.user.id);
        }
        if (!tType || !tId) return res.status(400).json({ error: "notifications require targetType&targetId (or parent default)" });

        const acc = await ensureAccess(req, tType, tId, childId);
        if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

        const where = { createdAt: { gte: from, lte: to } };
        const colMap = {
          company: "companyId",
          room: "roomId",
          driver: "driverId",
          user: "userId",
          vehicle: "vehicleId",
          shift: "shiftId",
          personel: "userId",
          child: "userId",
        };
        const col = colMap[tType];
        if (!col) return res.status(400).json({ error: "unsupported targetType for notifications" });
        where[col] = Number(tId);

        const rows = await fetchNotifications(where);

        if (format === "csv") {
          const outRows = [];
          outRows.push(toCsvRow(["createdAt", "type", "scope", "payload"]));
          for (const n of rows) outRows.push(toCsvRow([n.createdAt.toISOString(), n.type, n.scope, JSON.stringify(n.payloadJson || {})]));
          return sendExport(res, { body: outRows.join("\n") + "\n", format, filename: formatFilename({ kind, targetType: tType, targetId: tId, format }) });
        }

        
let out = "";
        out += "# LOG EXPORT\n";
        out += `# kind=notifications target=${tType}#${tId}
`;
        out += `# range(TR): ${fmtTR(from)} -> ${fmtTR(to)}
`;
        out += `# generatedAt(TR): ${fmtTR(new Date())}

`;

        out += asTxtSection("NOTIFICATIONS");
        if (!rows.length) out += "(none)\n";
        for (const n of rows) {
          const payload = n.payloadJson || {};
          const stopName = payload.stopName || payload.stop?.name || payload.nextStop?.name || null;
          const child = payload.childId || payload.personelId || payload.studentId || payload.personel?.id || null;
          const extra = `${child ? ` childId=${child}` : ""}${stopName ? ` stop=${stopName}` : ""}`;
          out += lineTR(n.createdAt, `NOTIF type=${n.type} scope=${n.scope}${extra} shiftId=${n.shiftId || "-"} vehicleId=${n.vehicleId || "-"} payload=${safeJson(payload)}`);
        }

        return sendExport(res, { body: out, format, filename: formatFilename({ kind, targetType: tType, targetId: tId, format }) });
}

      if (kind === "audit") {
        const where = { createdAt: { gte: from, lte: to } };

        if (!targetType || !targetId) {
          const ids = await scopeUserIds(req);
          if (Array.isArray(ids)) where.actorUserId = { in: ids };
          // SUPER_ADMIN => ids null => no filter
        } else {
          const acc = await ensureAccess(req, targetType, targetId, childId);
          if (!acc.ok) return res.status(acc.status || 403).json({ error: acc.error || "Forbidden" });

          // For now: support user(actor) or entity filter
        // For now: support user(actor) or entity filter
        if (targetType === "user") where.actorUserId = Number(targetId);
        else {
          where.entity = String(targetType).toUpperCase();
          where.entityId = Number(targetId);
        }
        }

        const rows = await fetchAudit(where);

        if (format === "csv") {
          const outRows = [];
          outRows.push(toCsvRow(["createdAt", "actorUserId", "actorRole", "action", "entity", "entityId", "meta"]));
          for (const a of rows) outRows.push(toCsvRow([a.createdAt.toISOString(), a.actorUserId ?? "", a.actorRole ?? "", a.action, a.entity, a.entityId ?? "", JSON.stringify(a.meta || {})]));
          return sendExport(res, { body: outRows.join("\n") + "\n", format, filename: formatFilename({ kind, targetType, targetId, format }) });
        }

        
let out = "";
        out += "# LOG EXPORT\n";
        out += `# kind=audit target=${targetType}#${targetId}
`;
        out += `# range(TR): ${fmtTR(from)} -> ${fmtTR(to)}
`;
        out += `# generatedAt(TR): ${fmtTR(new Date())}

`;

        out += asTxtSection("AUDIT");
        if (!rows.length) out += "(none)\n";
        for (const a of rows) {
          out += lineTR(a.createdAt, `AUDIT action=${a.action} actorUserId=${a.actorUserId ?? "-"} role=${a.actorRole ?? "-"} entity=${a.entity}${a.entityId ? "#" + a.entityId : ""} meta=${safeJson(a.meta)}`);
        }

        return sendExport(res, { body: out, format, filename: formatFilename({ kind, targetType, targetId, format }) });
}

      if (kind === "api") {
        // Global export allowed: if no targetType/targetId, export by scope (ROOM/company/self) or all for SUPER_ADMIN.

        const where = { createdAt: { gte: from, lte: to } };

if (!targetType || !targetId) {
  const ids = await scopeUserIds(req);
  if (Array.isArray(ids)) where.userId = { in: ids };
  // SUPER_ADMIN => ids null => no filter
} else if (targetType === "user") where.userId = Number(targetId);
else if (targetType === "role") where.role = String(targetId);
else return res.status(400).json({ error: "api supports targetType=user|role only" });

        const rows = await fetchApiRequests(where);

        if (format === "csv") {
          const outRows = [];
          outRows.push(toCsvRow(["createdAt", "method", "path", "status", "durationMs", "userId", "role", "ip", "userAgent"]));
          for (const a of rows) outRows.push(toCsvRow([a.createdAt.toISOString(), a.method, a.path, a.status, a.durationMs, a.userId ?? "", a.role ?? "", a.ip ?? "", a.userAgent ?? ""]));
          return sendExport(res, { body: outRows.join("\n") + "\n", format, filename: formatFilename({ kind, targetType, targetId, format }) });
        }

        
let out = "";
        out += "# LOG EXPORT\n";
        out += `# kind=api_requests target=${(!targetType || !targetId) ? ("scope:" + req.user.role) : (targetType + "#" + targetId)}
`;
        out += `# range(TR): ${fmtTR(from)} -> ${fmtTR(to)}
`;
        out += `# generatedAt(TR): ${fmtTR(new Date())}

`;

        out += asTxtSection("API REQUESTS");
        if (!rows.length) out += "(none)\n";
        for (const a of rows) {
          const lvl = Number(a.status || 0) >= 400 ? "ERROR" : "OK";
          out += lineTR(a.createdAt, `${lvl} ${a.method} ${a.path} status=${a.status} dur=${a.durationMs}ms userId=${a.userId ?? "-"} role=${a.role ?? "-"} ip=${a.ip ?? "-"}`);
        }

        return sendExport(res, { body: out, format, filename: formatFilename({ kind, targetType, targetId, format }) });
}

      return res.status(400).json({ error: "unknown kind" });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  });

  return r;
}
