// backend/src/routes/admin_logs.js
import express from "express";
import { prisma } from "../prisma.js";
import { audit } from "../audit.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

function clampTake(v, max = 1000) {
  const n = Number(v);
  if (!Number.isFinite(n)) return Math.min(250, max);
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function parseDateMaybe(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;

  // dd.mm.yyyy [hh:mm]
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yy = Number(m[3]);
    const hh = Number(m[4] ?? 0);
    const mi = Number(m[5] ?? 0);
    const utcMs = Date.UTC(yy, mm - 1, dd, hh - 3, mi, 0, 0);
    const d = new Date(utcMs);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtTR(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const tr = new Date(dt.getTime() + TR_OFFSET_MS);
  const y = tr.getUTCFullYear();
  const m = String(tr.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tr.getUTCDate()).padStart(2, "0");
  const hh = String(tr.getUTCHours()).padStart(2, "0");
  const mi = String(tr.getUTCMinutes()).padStart(2, "0");
  const ss = String(tr.getUTCSeconds()).padStart(2, "0");
  return `${dd}.${m}.${y} ${hh}:${mi}:${ss}`;
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function userMap(userIds) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean).map((x) => Number(x)).filter((x) => x > 0)));
  const map = new Map();
  if (!ids.length) return map;
  const us = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, fullName: true, role: true, roomId: true, companyId: true },
  });
  for (const u of us) map.set(u.id, u);
  return map;
}

async function buildLoginLogs({ from, to, take, emailContains, userId }) {
  const where = {
    action: { startsWith: "AUTH_LOGIN_" },
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(userId ? { actorUserId: userId } : {}),
  };
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
  const um = await userMap(rows.map((r) => r.actorUserId));
  let items = rows.map((r) => {
    const u = r.actorUserId ? um.get(r.actorUserId) : null;
    const meta = r.meta || {};
    const email = u?.email || meta.email || "-";
    return {
      id: r.id,
      createdAt: r.createdAt,
      type: r.action,
      info: `email=${email} userId=${r.actorUserId || "-"} ip=${meta.ip || "-"} reason=${meta.reason || "-"}`,
    };
  });
  if (emailContains) {
    const q = String(emailContains).toLowerCase();
    items = items.filter((it) => it.info.toLowerCase().includes(q));
  }
  return items;
}

async function buildAudit({ from, to, take, q, emailContains, userId }) {
  const where = {
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(userId ? { actorUserId: userId } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { entity: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
  const um = await userMap(rows.map((r) => r.actorUserId));
  let items = rows.map((r) => {
    const u = r.actorUserId ? um.get(r.actorUserId) : null;
    return {
      id: r.id,
      createdAt: r.createdAt,
      type: r.action,
      info: `actor=${u?.email || "-"} role=${r.actorRole || u?.role || "-"} entity=${r.entity}${r.entityId ? "#" + r.entityId : ""}`,
    };
  });
  if (emailContains) {
    const q2 = String(emailContains).toLowerCase();
    items = items.filter((it) => it.info.toLowerCase().includes(q2));
  }
  return items;
}

async function buildApiRequests({ from, to, take, pathLike, status, ipContains, emailContains, userId }) {
  const where = {
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(userId ? { userId: userId } : {}),
    ...(pathLike ? { path: { contains: pathLike, mode: "insensitive" } } : {}),
    ...(status ? { status: Number(status) } : {}),
    ...(ipContains ? { ip: { contains: ipContains } } : {}),
  };

  const rows = await prisma.apiRequest.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: { id: true, createdAt: true, method: true, path: true, status: true, durationMs: true, userId: true, role: true, ip: true },
  });

  const um = await userMap(rows.map((r) => r.userId));
  let items = rows.map((r) => {
    const u = r.userId ? um.get(r.userId) : null;
    return {
      id: r.id,
      createdAt: r.createdAt,
      type: `${r.method} ${r.status}`,
      info: `actor=${u?.email || "-"} role=${r.role || u?.role || "-"} path=${r.path} dur=${r.durationMs}ms ip=${r.ip || "-"}`,
    };
  });

  if (emailContains) {
    const q2 = String(emailContains).toLowerCase();
    items = items.filter((it) => it.info.toLowerCase().includes(q2));
  }

  return items;
}

export function adminLogsRouter() {
  const r = express.Router();

  // Preview
  r.get("/preview", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const kind0 = String(req.query.kind || "audit").trim().toLowerCase();
    const kind = kind0 === "requests" ? "api" : kind0;
    const take = clampTake(req.query.take, 250);
    const from = parseDateMaybe(req.query.from);
    const to = parseDateMaybe(req.query.to);
    const emailContains = String(req.query.emailContains || req.query.email || "").trim();
    const userId = String(req.query.userId || "").trim() ? Number(req.query.userId) : null;

    try {
      let items = [];
      if (kind === "login") items = await buildLoginLogs({ from, to, take, emailContains, userId });
      else if (kind === "api") items = await buildApiRequests({
        from,
        to,
        take,
        pathLike: String(req.query.pathLike || "").trim(),
        status: String(req.query.status || "").trim(),
        ipContains: String(req.query.ip || req.query.ipContains || "").trim(),
        emailContains,
        userId,
      });
      else items = await buildAudit({ from, to, take, q: String(req.query.q || "").trim(), emailContains, userId });

      res.json({
        summary: {
          kind,
          rangeTR: `${fmtTR(from)} -> ${fmtTR(to)}`,
          total: items.length,
        },
        items,
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // Export (default txt)
  r.get("/export", authRequired(), requireRole("SUPER_ADMIN"), async (req, res) => {
    const kind0 = String(req.query.kind || "audit").trim().toLowerCase();
    const kind = kind0 === "requests" ? "api" : kind0;
    const take = clampTake(req.query.take, 1000);
    const from = parseDateMaybe(req.query.from);
    const to = parseDateMaybe(req.query.to);
    const emailContains = String(req.query.emailContains || req.query.email || "").trim();
    const userId = String(req.query.userId || "").trim() ? Number(req.query.userId) : null;

    const format = String(req.query.format || "txt").trim().toLowerCase() === "csv" ? "csv" : "txt";

    try {
      let items = [];
      if (kind === "login") items = await buildLoginLogs({ from, to, take, emailContains, userId });
      else if (kind === "api") items = await buildApiRequests({
        from,
        to,
        take,
        pathLike: String(req.query.pathLike || "").trim(),
        status: String(req.query.status || "").trim(),
        ipContains: String(req.query.ip || req.query.ipContains || "").trim(),
        emailContains,
        userId,
      });
      else items = await buildAudit({ from, to, take, q: String(req.query.q || "").trim(), emailContains, userId });

      // ✅ M40: audit export trail
      await audit(req, {
        action: "LOG_EXPORT",
        entity: "LOGS",
        meta: {
          endpoint: "/api/admin/logs/export",
          kind,
          format,
          take,
          filters: {
            from: from ? from.toISOString() : null,
            to: to ? to.toISOString() : null,
            q: String(req.query.q || "").trim() || null,
            emailContains: emailContains || null,
            userId: userId || null,
            pathLike: String(req.query.pathLike || "").trim() || null,
            status: String(req.query.status || "").trim() || null,
            ipContains: String(req.query.ip || req.query.ipContains || "").trim() || null,
          },
          rowCount: items.length,
        },
      });

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `admin_${kind}_${stamp}.${format}`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        const header = "createdAt,type,info\n";
        const body = items.map((x) => `${csvEscape(x.createdAt)},${csvEscape(x.type)},${csvEscape(x.info)}`).join("\n");
        return res.send(header + body + "\n");
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      const lines = items
        .map((x) => {
          const dt = x.createdAt instanceof Date ? x.createdAt.toISOString() : String(x.createdAt);
          return `[${dt}] ${x.type} ${x.info}`;
        })
        .join("\n");
      return res.send(lines + "\n");
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  return r;
}

export default adminLogsRouter;
