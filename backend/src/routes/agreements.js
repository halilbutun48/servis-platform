// backend/src/routes/agreements.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import {
  agreementsOverlap,
  findAgreementConflictForApproval,
  agreementConflictResponse,
  computeFirstStartAtUTC,
} from "../services/agreementConflict.js";

function parseDateOnly(s) {
  const v = String(s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return new Date(v + "T00:00:00.000Z");
}
function toInt(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function clampMin(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n < 0 || n > 1439) return null;
  return n;
}
function clampWeekMask(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n < 1 || n > 127) return null;
  return n;
}

export function agreementsRouter(io) {
  const r = express.Router();

  // LIST
  r.get("/", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const take = Math.min(200, Math.max(1, Number(req.query.take || 50)));
    const status = String(req.query.status || "").trim() || null;

    const where = {};
    if (status) where.status = status;

    // scope
    if (req.user.role === "COMPANY") where.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") where.roomId = req.user.roomId ?? -1;

    const items = await prisma.agreement.findMany({
      where,
      take,
      orderBy: { id: "desc" },
    });

    res.json({ items });
  });

  // GET by id (debug + checks)
  r.get("/:id", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ error: "notFound" });

    if (req.user.role === "COMPANY" && ag.companyId !== req.user.companyId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(ag);
  });

  // CREATE (COMPANY)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const companyId = req.user.companyId;
    if (!companyId) return res.status(400).json({ error: "companyId required" });

    const roomId = Number(req.body.roomId);
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.companyId !== companyId) return res.status(400).json({ error: "invalidRoomId" });

    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate);
    const weekMask = clampWeekMask(req.body.weekMask);
    const startMin = clampMin(req.body.startMin);
    const endMin = clampMin(req.body.endMin);

    if (!startDate || !endDate) return res.status(400).json({ error: "startDate/endDate required" });
    if (endDate < startDate) return res.status(400).json({ error: "endDate must be >= startDate" });
    if (weekMask == null) return res.status(400).json({ error: "weekMask required (1..127)" });
    if (startMin == null || endMin == null) return res.status(400).json({ error: "startMin/endMin required (0..1439)" });

    const created = await prisma.agreement.create({
      data: {
        companyId,
        roomId,
        startDate,
        endDate,
        weekMask,
        startMin,
        endMin,
        status: "REQUESTED",
        companyOfferAmount: toInt(req.body.companyOfferAmount, null),
        companyOfferNote: req.body.companyOfferNote ? String(req.body.companyOfferNote) : null,
      },
    });

    io?.to?.(`company:${companyId}`)?.emit?.("agreement:update", { id: created.id, kind: "created" });
    io?.to?.(`room:${roomId}`)?.emit?.("agreement:update", { id: created.id, kind: "created" });

    res.json(created);
  });

  // APPROVE (ROOM): assign vehicle+driver + conflict check
  r.put("/:id/approve", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ error: "notFound" });

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const vehicleId = Number(req.body.vehicleId);
    const driverId = Number(req.body.driverId);
    if (!vehicleId || !driverId) return res.status(400).json({ error: "vehicleId+driverId required" });

    // Fetch candidates reserved
    const candidates = await findAgreementConflictForApproval({ agreementId: ag.id, vehicleId, driverId });

    // Build a "proposed agreement" object for overlap test
    const proposed = { ...ag, vehicleId, driverId };

    // Check conflicts (vehicle first)
    for (const c of candidates) {
      if (c.vehicleId === vehicleId && agreementsOverlap(proposed, c)) {
        return res.status(409).json(agreementConflictResponse({ kind: "vehicle", agreement: c }));
      }
    }
    for (const c of candidates) {
      if (c.driverId === driverId && agreementsOverlap(proposed, c)) {
        return res.status(409).json(agreementConflictResponse({ kind: "driver", agreement: c }));
      }
    }

    const now = new Date();
    const firstStart = computeFirstStartAtUTC(proposed);

    const nextStatus = now >= firstStart ? "ACTIVE" : "APPROVED";

    const updated = await prisma.agreement.update({
      where: { id: ag.id },
      data: {
        vehicleId,
        driverId,
        roomOfferAmount: toInt(req.body.roomOfferAmount, null),
        roomOfferNote: req.body.roomOfferNote ? String(req.body.roomOfferNote) : null,
        status: nextStatus,
      },
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "approved" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "approved" });

    res.json(updated);
  });

  // CANCEL (COMPANY)
  r.put("/:id/cancel", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ error: "notFound" });
    if (ag.companyId !== req.user.companyId) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.agreement.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "cancelled" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "cancelled" });

    res.json(updated);
  });

  // EXTEND (COMPANY) — endDate change + conflict check
  r.put("/:id/extend", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ error: "notFound" });
    if (ag.companyId !== req.user.companyId) return res.status(403).json({ error: "Forbidden" });

    const endDate = parseDateOnly(req.body.endDate);
    if (!endDate) return res.status(400).json({ error: "endDate required" });
    if (endDate < ag.startDate) return res.status(400).json({ error: "endDate must be >= startDate" });

    // If already assigned, extend must not create conflicts
    if (ag.vehicleId || ag.driverId) {
      const candidates = await findAgreementConflictForApproval({
        agreementId: ag.id,
        vehicleId: ag.vehicleId ?? undefined,
        driverId: ag.driverId ?? undefined,
      });

      const proposed = { ...ag, endDate };

      for (const c of candidates) {
        if (ag.vehicleId && c.vehicleId === ag.vehicleId && agreementsOverlap(proposed, c)) {
          return res.status(409).json(agreementConflictResponse({ kind: "vehicle", agreement: c }));
        }
      }
      for (const c of candidates) {
        if (ag.driverId && c.driverId === ag.driverId && agreementsOverlap(proposed, c)) {
          return res.status(409).json(agreementConflictResponse({ kind: "driver", agreement: c }));
        }
      }
    }

    const updated = await prisma.agreement.update({ where: { id }, data: { endDate } });
    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extended" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extended" });
    res.json(updated);
  });

  return r;
}