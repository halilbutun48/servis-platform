// backend/src/routes/logs.js
// Unified log preview/export + bundle_* packs (TXT default, CSV optional)

import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";

const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

const SUPPORTED_KINDS = [
  "api",
  "audit",
  "audit_login",
  "notifications",
  "gps",
  "speed",
  "bundle_vehicle",
  "bundle_driver",
  "bundle_room",
  "bundle_company",
  "bundle_user",
  "bundle_personel",
  "bundle_student",
];

function foldKey(x) {
  return String(x || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normKind(raw) {
  const s0 = String(raw || "").trim();
  const s = foldKey(s0);

  // direct supported
  if (SUPPORTED_KINDS.includes(s0)) return s0;
  if (SUPPORTED_KINDS.includes(s)) return s;

  // common aliases
  if (s === "requests" || s === "api_requests" || s === "apirequests") return "api";
  if (s === "login" || s === "login_logs" || s === "loginlogs") return "audit_login";

  // bundle aliases (TR/EN)
  if (s.includes("bundle")) {
    if (s.includes("arac") || s.includes("vehicle")) return "bundle_vehicle";
    if (s.includes("surucu") || s.includes("driver")) return "bundle_driver";
    if (s.includes("room")) return "bundle_room";
    if (s.includes("company") || s.includes("sirket")) return "bundle_company";
    if (s.includes("user") || s.includes("kullanici")) return "bundle_user";
    if (s.includes("personel")) return "bundle_personel";
    if (s.includes("student") || s.includes("ogrenci")) return "bundle_student";
  }

  // label-only selections (just in case UI sends Turkish labels)
  if (s.includes("arac") && s.includes("hiz") && s.includes("bildirim")) return "bundle_vehicle";
  if (s.includes("surucu") && s.includes("bundle")) return "bundle_driver";

  return s0; // keep raw; later we will error with supported list
}

function normTargetType(raw) {
  const s0 = String(raw || "").trim();
  const s = foldKey(s0);
  const map = {
    "arac": "vehicle",
    "vehicle": "vehicle",
    "surucu": "driver",
    "driver": "driver",
    "room": "room",
    "sirket": "company",
    "company": "company",
    "kullanici": "user",
    "user": "user",
    "personel": "personel",
    "ogrenci": "student",
    "student": "student",
    "shift": "shift",
  };
  return map[s] || s0.toLowerCase();
}


function parseIsoOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function defaultFromTo(from, to) {
  const now = new Date();
  const dTo = to || now;
  const dFrom = from || new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { from: dFrom, to: dTo };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtTR(d) {
  if (!d) return "";
  const ms = d instanceof Date ? d.getTime() : new Date(d).getTime();
  if (!Number.isFinite(ms)) return "";
  const tr = new Date(ms + TR_OFFSET_MS);
  return `${tr.getUTCFullYear()}-${pad2(tr.getUTCMonth() + 1)}-${pad2(tr.getUTCDate())} ${pad2(tr.getUTCHours())}:${pad2(
    tr.getUTCMinutes()
  )}:${pad2(tr.getUTCSeconds())}`;
}

function safeJson(x, maxLen = 400) {
  try {
    const s = JSON.stringify(x ?? {});
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + `…(+${s.length - maxLen})`;
  } catch {
    return "{}";
  }
}

function mk(ts, cat, level, text, meta) {
  return { ts, tsTR: fmtTR(ts), cat, level, text, meta: meta ?? null };
}

function toCsvRow(cols) {
  const esc = (x) => {
    const s = x == null ? "" : String(x);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return cols.map(esc).join(",");
}

function rowsToCsv(rows) {
  const out = [];
  out.push(toCsvRow(["ts", "tsTR", "cat", "level", "text", "meta"]));
  for (const it of rows) {
    out.push(
      toCsvRow([
        it.ts?.toISOString?.() || String(it.ts),
        it.tsTR || "",
        it.cat || "",
        it.level || "",
        it.text || "",
        safeJson(it.meta),
      ])
    );
  }
  return out.join("\n") + "\n";
}

function rowsToTxt({ kind, targetLabel, from, to, rows }) {
  let out = "";
  out += `# LOG EXPORT\n`;
  out += `# kind=${kind} target=${targetLabel}\n`;
  out += `# range(TR): ${fmtTR(from)} -> ${fmtTR(to)}\n`;
  out += `# generatedAt(TR): ${fmtTR(new Date())}\n\n`;

  const byCat = {};
  const byLevel = {};
  for (const r of rows) {
    byCat[r.cat] = (byCat[r.cat] || 0) + 1;
    byLevel[r.level] = (byLevel[r.level] || 0) + 1;
  }
  out += `== SUMMARY ==\n`;
  out += `total=${rows.length}\n`;
  out += `byCat=${safeJson(byCat)}\n`;
  out += `byLevel=${safeJson(byLevel)}\n\n`;

  out += `== EVENTS ==\n`;
  if (!rows.length) return out + "(none)\n";
  for (const r of rows) {
    out += `[TR ${r.tsTR}] ${r.cat} ${r.level} ${r.text}${r.meta ? " meta=" + safeJson(r.meta, 240) : ""}\n`;
  }
  return out;
}

function applyFilters(items, { onlyBad, cat, q }) {
  let out = items || [];
  if (String(onlyBad || "") === "1") {
    out = out.filter((x) => {
      const lv = String(x.level || "").toUpperCase();
      const cc = String(x.cat || "").toUpperCase();
      return lv === "ERROR" || lv === "WARN" || cc === "SPEED";
    });
  }
  if (cat && cat !== "ALL") {
    const cc = String(cat).toUpperCase();
    out = out.filter((x) => String(x.cat || "").toUpperCase() === cc);
  }
  if (q && String(q).trim()) {
    const qq = String(q).toLowerCase();
    out = out.filter((x) => (`${x.text || ""} ${safeJson(x.meta || {})}`).toLowerCase().includes(qq));
  }
  return out;
}

// ---------------- RBAC helpers ----------------

async function scopeUserIdsForRole(req) {
  const role = req.user?.role;

  if (role === "SUPER_ADMIN") return { mode: "all", userIds: null, roomId: null, companyId: null };

  if (role === "ROOM") {
    const roomId = Number(req.user.roomId || 0);
    if (!roomId) return { mode: "deny" };
    const us = await prisma.user.findMany({ where: { roomId }, select: { id: true } });
    return { mode: "userIds", userIds: us.map((u) => u.id), roomId, companyId: null };
  }

  if (role === "COMPANY") {
    const companyId = Number(req.user.companyId || 0);
    if (!companyId) return { mode: "deny" };
    const us = await prisma.user.findMany({ where: { companyId }, select: { id: true } });
    return { mode: "userIds", userIds: us.map((u) => u.id), companyId, roomId: null };
  }

  if (req.user?.id) return { mode: "userIds", userIds: [req.user.id], roomId: null, companyId: null };
  return { mode: "deny" };
}

async function ensureAccess(req, targetType, targetId, childId) {
  const role = req.user?.role;
  const id = Number(targetId || 0);

  if (role === "SUPER_ADMIN") return { ok: true };

  if (role === "ROOM") {
    const roomId = Number(req.user.roomId || 0);
    if (!roomId) return { ok: false, status: 403, error: "Forbidden" };

    if (targetType === "room") return id === roomId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    if (targetType === "vehicle") {
      const v = await prisma.vehicle.findUnique({ where: { id }, select: { roomId: true } });
      return v && Number(v.roomId) === roomId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    }
    if (targetType === "driver") {
      const d = await prisma.driver.findUnique({ where: { id }, select: { roomId: true } });
      return d && Number(d.roomId) === roomId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    }
    if (targetType === "user") {
      const u = await prisma.user.findUnique({ where: { id }, select: { roomId: true } });
      return u && Number(u.roomId) === roomId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (role === "COMPANY") {
    const companyId = Number(req.user.companyId || 0);
    if (!companyId) return { ok: false, status: 403, error: "Forbidden" };

    if (targetType === "company") return id === companyId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    if (targetType === "user") {
      const u = await prisma.user.findUnique({ where: { id }, select: { companyId: true } });
      return u && Number(u.companyId) === companyId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    }
    if (targetType === "personel" || targetType === "student") {
      const p = await prisma.personel.findUnique({ where: { id }, select: { companyId: true } });
      return p && Number(p.companyId) === companyId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (role === "DRIVER") {
    const meDriver = await prisma.driver.findFirst({ where: { userId: req.user.id }, select: { id: true } });
    const driverId = Number(meDriver?.id || 0);
    if (!driverId) return { ok: false, status: 403, error: "Forbidden" };

    if (targetType === "driver") return id === driverId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    if (targetType === "vehicle") {
      const v = await prisma.vehicle.findUnique({ where: { id }, select: { driverId: true } });
      return v && Number(v.driverId || 0) === driverId ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    }
    if (targetType === "user") return id === Number(req.user.id) ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (role === "PARENT") {
    // Parent can only export for own child / assigned vehicle in ACTIVE shift
    if (targetType === "vehicle") {
      const cid = Number(childId || 0);
      if (!cid) return { ok: false, status: 400, error: "childId required for parent vehicle export" };

      const rel = await prisma.parentChild.findFirst({ where: { parentUserId: req.user.id, personelId: cid }, select: { id: true } });
      if (!rel) return { ok: false, status: 403, error: "Forbidden" };

      const active = await prisma.shift.findFirst({
        where: { status: "ACTIVE", vehicleId: id, assignments: { some: { personelId: cid } } },
        select: { id: true },
      });
      if (!active) return { ok: false, status: 403, error: "Forbidden" };
      return { ok: true };
    }

    if (targetType === "student" || targetType === "personel") {
      const rel = await prisma.parentChild.findFirst({ where: { parentUserId: req.user.id, personelId: id }, select: { id: true } });
      return rel ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    }

    if (targetType === "user") return id === Number(req.user.id) ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (role === "PERSONEL") {
    if (targetType === "user") return id === Number(req.user.id) ? { ok: true } : { ok: false, status: 403, error: "Forbidden" };
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

// ---------------- fetch helpers ----------------

async function fetchGps(vehicleId, from, to, take = 5000) {
  return prisma.gpsPoint.findMany({
    where: { vehicleId, at: { gte: from, lte: to } },
    orderBy: { at: "asc" },
    take,
    select: { at: true, lat: true, lng: true, speed: true },
  });
}

async function fetchNotifications(where, take = 5000) {
  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take,
    select: { createdAt: true, type: true, scope: true, payloadJson: true, companyId: true, roomId: true, driverId: true, userId: true, vehicleId: true, shiftId: true },
  });
}

async function fetchAudit(where, take = 5000) {
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take,
    select: { createdAt: true, actorUserId: true, actorRole: true, action: true, entity: true, entityId: true, meta: true },
  });
}

async function fetchApiRequests(where, take = 5000) {
  return prisma.apiRequest.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take,
    select: { createdAt: true, method: true, path: true, status: true, durationMs: true, userId: true, role: true, ip: true, userAgent: true },
  });
}

// ---------------- bundle builders ----------------

async function bundleVehicle(req, vehicleId, childId, from, to, take) {
  const acc = await ensureAccess(req, "vehicle", vehicleId, childId);
  if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };

  const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, plate: true, speedLimitKmh: true } });
  const limit = Number(req.query.speedLimitKph || v?.speedLimitKmh || 80);

  const gps = await fetchGps(vehicleId, from, to, Math.min(10000, take * 20));
  const notifs = await fetchNotifications({ createdAt: { gte: from, lte: to }, vehicleId }, Math.min(5000, take * 10));

  const rows = [];
  for (const p of gps) {
    const sp = Number(p.speed ?? 0);
    rows.push(mk(p.at, sp >= limit ? "SPEED" : "GPS", sp >= limit ? "WARN" : "OK", `vehicle=${v?.plate || vehicleId} lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`, { speedLimitKph: limit }));
  }
  for (const n of notifs) {
    const payload = n.payloadJson || {};
    rows.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}`, { shiftId: n.shiftId || null, payload }));
  }

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  return { ok: true, targetLabel: `vehicle#${vehicleId} ${v?.plate || ""}`.trim(), rows };
}

async function bundleDriver(req, driverId, from, to, take) {
  const acc = await ensureAccess(req, "driver", driverId, null);
  if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };

  const d = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, fullName: true, userId: true } });
  const vehicles = await prisma.vehicle.findMany({ where: { driverId }, select: { id: true, plate: true, speedLimitKmh: true } });

  const rows = [];
  const dNotifs = await fetchNotifications({ createdAt: { gte: from, lte: to }, driverId }, Math.min(3000, take * 10));
  for (const n of dNotifs) rows.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}`, { shiftId: n.shiftId || null, payload: n.payloadJson || {} }));

  if (d?.userId) {
    const api = await fetchApiRequests({ createdAt: { gte: from, lte: to }, userId: d.userId }, Math.min(5000, take * 20));
    for (const r of api) rows.push(mk(r.createdAt, "REQ", r.status >= 500 ? "ERROR" : r.status >= 400 ? "WARN" : "OK", `${r.method} ${r.status} ${r.path} dur=${r.durationMs}ms`, { ip: r.ip || null }));

    const aud = await fetchAudit({ createdAt: { gte: from, lte: to }, actorUserId: d.userId }, Math.min(5000, take * 20));
    for (const a of aud) {
      const cc = a.action.startsWith("AUTH_LOGIN_") ? "LOGIN" : "AUDIT";
      const lv = a.action.endsWith("_OK") ? "OK" : cc === "LOGIN" ? "WARN" : "INFO";
      rows.push(mk(a.createdAt, cc, lv, `${a.action} ${a.entity}${a.entityId ? "#" + a.entityId : ""}`, a.meta || {}));
    }
  }

  for (const v of vehicles) {
    const limit = Number(v.speedLimitKmh || 80);
    const gps = await fetchGps(v.id, from, to, Math.min(2000, take * 5));
    for (const p of gps) {
      const sp = Number(p.speed ?? 0);
      rows.push(mk(p.at, sp >= limit ? "SPEED" : "GPS", sp >= limit ? "WARN" : "OK", `vehicle=${v.plate} lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`, { speedLimitKph: limit }));
    }
    const vn = await fetchNotifications({ createdAt: { gte: from, lte: to }, vehicleId: v.id }, Math.min(2000, take * 5));
    for (const n of vn) rows.push(mk(n.createdAt, "NOTIF", "INFO", `vehicle=${v.plate} ${n.type} scope=${n.scope}`, { shiftId: n.shiftId || null }));
  }

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  return { ok: true, targetLabel: `driver#${driverId} ${d?.fullName || ""}`.trim(), rows };
}

async function bundleRoom(req, roomId, from, to, take) {
  const acc = await ensureAccess(req, "room", roomId, null);
  if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };

  const r = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true } });
  const users = await prisma.user.findMany({ where: { roomId }, select: { id: true } });
  const drivers = await prisma.driver.findMany({ where: { roomId }, select: { id: true, userId: true } });
  const vehicles = await prisma.vehicle.findMany({ where: { roomId }, select: { id: true, plate: true, speedLimitKmh: true } });

  const userIds = Array.from(new Set(users.map((u) => u.id).concat(drivers.map((d) => d.userId || 0)).filter((x) => x > 0)));

  const rows = [];
  if (userIds.length) {
    const api = await fetchApiRequests({ createdAt: { gte: from, lte: to }, userId: { in: userIds } }, Math.min(10000, take * 50));
    for (const a of api) rows.push(mk(a.createdAt, "REQ", a.status >= 500 ? "ERROR" : a.status >= 400 ? "WARN" : "OK", `${a.method} ${a.status} ${a.path} dur=${a.durationMs}ms`, { userId: a.userId || null }));
    const aud = await fetchAudit({ createdAt: { gte: from, lte: to }, actorUserId: { in: userIds } }, Math.min(10000, take * 50));
    for (const x of aud) {
      const cc = x.action.startsWith("AUTH_LOGIN_") ? "LOGIN" : "AUDIT";
      const lv = x.action.endsWith("_OK") ? "OK" : cc === "LOGIN" ? "WARN" : "INFO";
      rows.push(mk(x.createdAt, cc, lv, `${x.action} ${x.entity}${x.entityId ? "#" + x.entityId : ""}`, x.meta || {}));
    }
  }

  const vehicleIds = vehicles.map((v) => v.id);
  const driverIds = drivers.map((d) => d.id);

  const notifs = await fetchNotifications(
    {
      createdAt: { gte: from, lte: to },
      OR: [
        { roomId },
        ...(vehicleIds.length ? [{ vehicleId: { in: vehicleIds } }] : []),
        ...(driverIds.length ? [{ driverId: { in: driverIds } }] : []),
        ...(userIds.length ? [{ userId: { in: userIds } }] : []),
      ],
    },
    Math.min(10000, take * 50)
  );
  for (const n of notifs) rows.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}`, { vehicleId: n.vehicleId || null, driverId: n.driverId || null, userId: n.userId || null }));

  for (const v of vehicles) {
    const limit = Number(v.speedLimitKmh || 80);
    const gps = await fetchGps(v.id, from, to, Math.min(2000, take * 5));
    for (const p of gps) {
      const sp = Number(p.speed ?? 0);
      rows.push(mk(p.at, sp >= limit ? "SPEED" : "GPS", sp >= limit ? "WARN" : "OK", `vehicle=${v.plate} lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`, { speedLimitKph: limit }));
    }
  }

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  return { ok: true, targetLabel: `room#${roomId} ${r?.name || ""}`.trim(), rows };
}

async function bundleCompany(req, companyId, from, to, take) {
  const acc = await ensureAccess(req, "company", companyId, null);
  if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };

  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, kind: true } });
  const users = await prisma.user.findMany({ where: { companyId }, select: { id: true } });
  const userIds = users.map((u) => u.id);

  const rows = [];
  if (userIds.length) {
    const api = await fetchApiRequests({ createdAt: { gte: from, lte: to }, userId: { in: userIds } }, Math.min(10000, take * 50));
    for (const a of api) rows.push(mk(a.createdAt, "REQ", a.status >= 500 ? "ERROR" : a.status >= 400 ? "WARN" : "OK", `${a.method} ${a.status} ${a.path} dur=${a.durationMs}ms`, { userId: a.userId || null }));
    const aud = await fetchAudit({ createdAt: { gte: from, lte: to }, actorUserId: { in: userIds } }, Math.min(10000, take * 50));
    for (const x of aud) {
      const cc = x.action.startsWith("AUTH_LOGIN_") ? "LOGIN" : "AUDIT";
      const lv = x.action.endsWith("_OK") ? "OK" : cc === "LOGIN" ? "WARN" : "INFO";
      rows.push(mk(x.createdAt, cc, lv, `${x.action} ${x.entity}${x.entityId ? "#" + x.entityId : ""}`, x.meta || {}));
    }
  }

  const notifs = await fetchNotifications({ createdAt: { gte: from, lte: to }, companyId }, Math.min(10000, take * 50));
  for (const n of notifs) rows.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}`, { userId: n.userId || null, shiftId: n.shiftId || null }));

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  return { ok: true, targetLabel: `company#${companyId} ${c?.name || ""}`.trim(), rows };
}

async function bundleUser(req, userId, from, to, take) {
  const acc = await ensureAccess(req, "user", userId, null);
  if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });

  const rows = [];
  const api = await fetchApiRequests({ createdAt: { gte: from, lte: to }, userId }, Math.min(10000, take * 50));
  for (const a of api) rows.push(mk(a.createdAt, "REQ", a.status >= 500 ? "ERROR" : a.status >= 400 ? "WARN" : "OK", `${a.method} ${a.status} ${a.path} dur=${a.durationMs}ms`, { ip: a.ip || null }));
  const aud = await fetchAudit({ createdAt: { gte: from, lte: to }, actorUserId: userId }, Math.min(10000, take * 50));
  for (const x of aud) {
    const cc = x.action.startsWith("AUTH_LOGIN_") ? "LOGIN" : "AUDIT";
    const lv = x.action.endsWith("_OK") ? "OK" : cc === "LOGIN" ? "WARN" : "INFO";
    rows.push(mk(x.createdAt, cc, lv, `${x.action} ${x.entity}${x.entityId ? "#" + x.entityId : ""}`, x.meta || {}));
  }
  const notifs = await fetchNotifications({ createdAt: { gte: from, lte: to }, userId }, Math.min(10000, take * 50));
  for (const n of notifs) rows.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}`, { shiftId: n.shiftId || null }));

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  return { ok: true, targetLabel: `user#${userId} ${u?.email || ""}`.trim(), rows };
}

async function bundlePersonelOrStudent(req, personelId, asStudent, childId, from, to, take) {
  const t = asStudent ? "student" : "personel";
  const acc = await ensureAccess(req, t, personelId, childId);
  if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };

  const p = await prisma.personel.findUnique({ where: { id: personelId }, select: { id: true, fullName: true, kind: true, companyId: true, userId: true } });
  if (!p) return { ok: false, status: 404, error: "not found" };

  const rows = [];
  // user logs if personel has userId
  if (p.userId) {
    const api = await fetchApiRequests({ createdAt: { gte: from, lte: to }, userId: p.userId }, Math.min(10000, take * 50));
    for (const a of api) rows.push(mk(a.createdAt, "REQ", a.status >= 500 ? "ERROR" : a.status >= 400 ? "WARN" : "OK", `${a.method} ${a.status} ${a.path} dur=${a.durationMs}ms`, { userId: p.userId }));
    const aud = await fetchAudit({ createdAt: { gte: from, lte: to }, actorUserId: p.userId }, Math.min(10000, take * 50));
    for (const x of aud) {
      const cc = x.action.startsWith("AUTH_LOGIN_") ? "LOGIN" : "AUDIT";
      const lv = x.action.endsWith("_OK") ? "OK" : cc === "LOGIN" ? "WARN" : "INFO";
      rows.push(mk(x.createdAt, cc, lv, `${x.action} ${x.entity}${x.entityId ? "#" + x.entityId : ""}`, x.meta || {}));
    }
  }

  // notifications: scoped to company and payload contains personelId/studentId/childId
  const notifs = await fetchNotifications({ createdAt: { gte: from, lte: to }, companyId: p.companyId }, Math.min(10000, take * 50));
  for (const n of notifs) {
    const payload = n.payloadJson || {};
    const pid = payload.personelId || payload.studentId || payload.childId || payload.personel?.id || payload.student?.id || null;
    if (Number(pid || 0) !== Number(p.id)) continue;
    rows.push(mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}`, { shiftId: n.shiftId || null, vehicleId: n.vehicleId || null }));
  }

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  return { ok: true, targetLabel: `${t}#${personelId} ${p.fullName || ""}`.trim(), rows };
}

// ---------------- main dispatcher ----------------

async function buildByKind({ req, kind, targetType, targetId, childId, from, to, take }) {
  // bundles
  if (kind === "bundle_vehicle") return bundleVehicle(req, targetId, childId, from, to, take);
  if (kind === "bundle_driver") return bundleDriver(req, targetId, from, to, take);
  if (kind === "bundle_room") return bundleRoom(req, targetId, from, to, take);
  if (kind === "bundle_company") return bundleCompany(req, targetId, from, to, take);
  if (kind === "bundle_user") return bundleUser(req, targetId, from, to, take);
  if (kind === "bundle_personel") return bundlePersonelOrStudent(req, targetId, false, childId, from, to, take);
  if (kind === "bundle_student") return bundlePersonelOrStudent(req, targetId, true, childId, from, to, take);

  // single streams
  if (kind === "gps" || kind === "speed") {
    if (targetType !== "vehicle" || !targetId) return { ok: false, status: 400, error: "gps/speed require targetType=vehicle&targetId" };
    const acc = await ensureAccess(req, "vehicle", targetId, childId);
    if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };

    const v = await prisma.vehicle.findUnique({ where: { id: targetId }, select: { plate: true, speedLimitKmh: true } });
    const limit = Number(req.query.speedLimitKph || v?.speedLimitKmh || 80);

    const gps = await fetchGps(targetId, from, to, Math.min(10000, take * 50));
    const rows = [];
    for (const p of gps) {
      const sp = Number(p.speed ?? 0);
      if (kind === "speed" && sp < limit) continue;
      rows.push(mk(p.at, sp >= limit ? "SPEED" : "GPS", sp >= limit ? "WARN" : "OK", `vehicle=${v?.plate || targetId} lat=${p.lat.toFixed(6)} lng=${p.lng.toFixed(6)} speed=${p.speed ?? "-"}`, { speedLimitKph: limit }));
    }
    return { ok: true, targetLabel: `vehicle#${targetId} ${v?.plate || ""}`.trim(), rows };
  }

  if (kind === "notifications") {
    // target optional: if provided, check access
    if (targetType && targetId) {
      const acc = await ensureAccess(req, targetType, targetId, childId);
      if (!acc.ok) return { ok: false, status: acc.status, error: acc.error };
    }

    const scope = await scopeUserIdsForRole(req);
    if (scope.mode === "deny") return { ok: false, status: 403, error: "Forbidden" };

    const where = { createdAt: { gte: from, lte: to } };
    if (targetType === "vehicle") where.vehicleId = targetId;
    else if (targetType === "driver") where.driverId = targetId;
    else if (targetType === "room") where.roomId = targetId;
    else if (targetType === "company") where.companyId = targetId;
    else if (targetType === "user") where.userId = targetId;
    else {
      if (scope.mode === "userIds") {
        where.OR = [
          { userId: { in: scope.userIds } },
          ...(scope.roomId ? [{ roomId: scope.roomId }] : []),
          ...(scope.companyId ? [{ companyId: scope.companyId }] : []),
        ];
      }
    }

    const notifs = await fetchNotifications(where, Math.min(10000, take * 50));
    const rows = notifs.map((n) => mk(n.createdAt, "NOTIF", "INFO", `${n.type} scope=${n.scope}`, { payload: n.payloadJson || {}, shiftId: n.shiftId || null, vehicleId: n.vehicleId || null }));
    return { ok: true, targetLabel: targetType && targetId ? `${targetType}#${targetId}` : "scoped", rows };
  }

  // global view (scope-based)
  if (kind === "api" || kind === "audit" || kind === "audit_login") {
    const scope = await scopeUserIdsForRole(req);
    if (scope.mode === "deny") return { ok: false, status: 403, error: "Forbidden" };

    const rows = [];
    if (kind === "api") {
      const where = { createdAt: { gte: from, lte: to } };
      if (scope.mode === "userIds") where.userId = { in: scope.userIds };
      const api = await fetchApiRequests(where, Math.min(10000, take * 200));
      for (const r of api) rows.push(mk(r.createdAt, "REQ", r.status >= 500 ? "ERROR" : r.status >= 400 ? "WARN" : "OK", `${r.method} ${r.status} ${r.path} dur=${r.durationMs}ms`, { userId: r.userId || null, role: r.role || null, ip: r.ip || null }));
      return { ok: true, targetLabel: "scoped", rows };
    }

    const where = { createdAt: { gte: from, lte: to } };
    if (scope.mode === "userIds") where.actorUserId = { in: scope.userIds };
    if (kind === "audit_login") where.action = { startsWith: "AUTH_LOGIN_" };

    const aud = await fetchAudit(where, Math.min(10000, take * 200));
    for (const a of aud) {
      const cc = a.action.startsWith("AUTH_LOGIN_") ? "LOGIN" : "AUDIT";
      const lv = a.action.endsWith("_OK") ? "OK" : cc === "LOGIN" ? "WARN" : "INFO";
      rows.push(mk(a.createdAt, cc, lv, `${a.action} ${a.entity}${a.entityId ? "#" + a.entityId : ""}`, a.meta || {}));
    }
    return { ok: true, targetLabel: "scoped", rows };
  }

  return { ok: false, status: 400, error: "unknown kind" };
}

// ---------------- router ----------------

export function logsRouter() {
  const r = express.Router();

  // GET /api/logs/preview
  r.get("/preview", authRequired(), async (req, res) => {
    
try {
  const kindRaw = req.query.kind;
  const kind = normKind(kindRaw);

  if (!SUPPORTED_KINDS.includes(kind)) {
    return res.status(400).json({ error: "unknown kind", kindRaw, kind, supported: SUPPORTED_KINDS });
  }

const targetType = normTargetType(req.query.targetType);
      const targetId = Number(req.query.targetId || 0) || 0;
      const childId = req.query.childId ? Number(req.query.childId) : null;

      const take = Math.min(500, Math.max(1, Number(req.query.take || 250)));

      const from0 = parseIsoOrNull(req.query.from);
      const to0 = parseIsoOrNull(req.query.to);
      const { from, to } = defaultFromTo(from0, to0);

      const built = await buildByKind({ req, kind, targetType, targetId, childId, from, to, take });
      if (!built.ok) return res.status(built.status || 400).json({ error: built.error || "error" });

      let rows = built.rows || [];
      rows = applyFilters(rows, { onlyBad: req.query.onlyBad, cat: req.query.cat || "ALL", q: req.query.q || "" });
      rows.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      const items = rows.slice(0, take);

      const summary = {
        kind,
        target: built.targetLabel || (targetType && targetId ? `${targetType}#${targetId}` : "scoped"),
        rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
        refreshedAtTR: fmtTR(new Date()),
        total: rows.length,
      };

      return res.json({ summary, items });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // GET /api/logs/export (TXT default)
  r.get("/export", authRequired(), async (req, res) => {
    
try {
  const kindRaw = req.query.kind;
  const kind = normKind(kindRaw);

  if (!SUPPORTED_KINDS.includes(kind)) {
    return res.status(400).json({ error: "unknown kind", kindRaw, kind, supported: SUPPORTED_KINDS });
  }

const targetType = normTargetType(req.query.targetType);
      const targetId = Number(req.query.targetId || 0) || 0;
      const childId = req.query.childId ? Number(req.query.childId) : null;

      const take = Math.min(5000, Math.max(1, Number(req.query.take || 1000)));

      const from0 = parseIsoOrNull(req.query.from);
      const to0 = parseIsoOrNull(req.query.to);
      const { from, to } = defaultFromTo(from0, to0);

      const format = String(req.query.format || "txt").toLowerCase() === "csv" ? "csv" : "txt";

      const built = await buildByKind({ req, kind, targetType, targetId, childId, from, to, take });
      if (!built.ok) return res.status(built.status || 400).json({ error: built.error || "error" });

      const rows = (built.rows || []).slice().sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

      const filename = `logs_${kind}_${targetType || "scoped"}_${targetId || 0}_${Date.now()}.${format === "csv" ? "csv" : "txt"}`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", format === "csv" ? "text/csv; charset=utf-8" : "text/plain; charset=utf-8");

      if (format === "csv") return res.status(200).send(rowsToCsv(rows));
      return res.status(200).send(rowsToTxt({ kind, targetLabel: built.targetLabel || "scoped", from, to, rows }));
    } catch (e) {
      return res.status(500).json({ error: String(e?.message || e) });
    }
  });

  return r;
}

export default logsRouter;
