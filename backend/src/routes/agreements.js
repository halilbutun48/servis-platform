// backend/src/routes/agreements.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createAndEmitNotification } from "../notifications/service.js";
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
function toFloat(v, def = null) {
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

function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function parseOfferAmount(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n <= 0) return null;
  return n;
}

function normDirection(v) {
  const s = String(v || "INBOUND").trim().toUpperCase();
  if (s === "INBOUND" || s === "OUTBOUND") return s;
  return null;
}
function normPattern(v) {
  const s = String(v || "ONE_WAY").trim().toUpperCase();
  if (s === "ONE_WAY" || s === "LOOP") return s;
  return null;
}
function parseHub(body) {
  const lat = body?.hubLat == null || body?.hubLat === "" ? null : toFloat(body.hubLat, null);
  const lng = body?.hubLng == null || body?.hubLng === "" ? null : toFloat(body.hubLng, null);
  if (lat == null && lng == null) return { hubLat: null, hubLng: null };
  if (lat == null || lng == null) return { error: "hubLat+hubLng birlikte olmalı" };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: "hubLat/hubLng range invalid" };
  return { hubLat: lat, hubLng: lng };
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
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, status: true } });
    if (!room || room.status === "DELETED") return res.status(400).json({ error: "invalidRoomId" });

    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate);
    const weekMask = clampWeekMask(req.body.weekMask);
    const startMin = clampMin(req.body.startMin);
    const endMin = clampMin(req.body.endMin);

    if (!startDate || !endDate) return res.status(400).json({ error: "startDate/endDate required" });
    if (endDate < startDate) return res.status(400).json({ error: "endDate must be >= startDate" });
    if (weekMask == null) return res.status(400).json({ error: "weekMask required (1..127)" });
    if (startMin == null || endMin == null) return res.status(400).json({ error: "startMin/endMin required (0..1439)" });

    // ✅ M19: routing meta
    const direction = normDirection(req.body.direction);
    const pattern = normPattern(req.body.pattern);
    if (!direction) return res.status(400).json({ error: "direction invalid (INBOUND|OUTBOUND)" });
    if (!pattern) return res.status(400).json({ error: "pattern invalid (ONE_WAY|LOOP)" });
    const hub = parseHub(req.body);
    if (hub?.error) return res.status(400).json({ error: hub.error });

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
        hubLat: hub.hubLat,
        hubLng: hub.hubLng,
        direction,
        pattern,
        companyOfferAmount: toInt(req.body.companyOfferAmount, null),
        companyOfferNote: req.body.companyOfferNote ? String(req.body.companyOfferNote) : null,
      },
    });

    // ✅ M53: notify ROOM (company offer visible)
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_REQUESTED",
      scope: "ROOM",
      roomId: roomId,
      companyId,
      payload: {
        v: 1,
        kind: "agreement:requested",
        title: "Yeni sözleşme talebi",
        message: `Agreement #${created.id} • teklif: ${created.companyOfferAmount ?? "-"}${created.companyOfferNote ? " — " + created.companyOfferNote : ""}`,
      },
      dedupeKey: `agreement:${created.id}:requested`,
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

    const st = String(ag.status || "").toUpperCase();
    if (st === "COUNTERED") {
      return res.status(409).json({
        error: "Counter pending: company decision required",
        code: "AGREEMENT_NEEDS_COMPANY_DECISION",
      });
    }
    if (st === "CANCELLED" || st === "REJECTED" || st === "DONE") {
      return res.status(409).json({
        error: `invalidState:${st}`,
        code: "AGREEMENT_INVALID_STATE",
      });
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
        // NOTE: pricing pazarlığı M57 itibariyle Agreement seviyesinde yapılır.
        // roomOfferAmount/note burada opsiyonel bırakıldı (geriye dönük uyum).
        roomOfferAmount: toInt(req.body.roomOfferAmount, null),
        roomOfferNote: req.body.roomOfferNote ? String(req.body.roomOfferNote) : null,
        status: nextStatus,
      },
    });


    // ✅ M53: notify COMPANY (room approved / assigned)
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_APPROVED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:approved",
        title: "Sözleşme onaylandı",
        message: `Agreement #${updated.id} onaylandı. vehicleId=${updated.vehicleId} driverId=${updated.driverId}`,
      },
      dedupeKey: `agreement:${updated.id}:approved`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "approved" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "approved" });

    res.json(updated);
  });

  // COUNTER (ROOM): propose price (no vehicle/driver assignment)
  r.put("/:id/counter", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ error: "notFound" });

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED" || st === "DONE") {
      return res.status(409).json({ error: `invalidState:${st}`, code: "AGREEMENT_INVALID_STATE" });
    }
    if (st === "APPROVED" || st === "ACTIVE") {
      return res.status(409).json({ error: `alreadyApproved:${st}`, code: "AGREEMENT_ALREADY_APPROVED" });
    }

    const roomOfferAmount = parseOfferAmount(req.body.roomOfferAmount);
    if (roomOfferAmount == null) return res.status(400).json({ error: "roomOfferAmount required (>0)" });

    const roomOfferNote = trimOrNull(req.body.roomOfferNote);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        roomOfferAmount,
        roomOfferNote,
        status: "COUNTERED",
      },
    });

    // notify COMPANY
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COUNTERED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:countered",
        title: "Karşı teklif",
        message: `Agreement #${updated.id} • karşı teklif: ${updated.roomOfferAmount ?? "-"}${updated.roomOfferNote ? " — " + updated.roomOfferNote : ""}`,
      },
      dedupeKey: `agreement:${updated.id}:counter`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "countered" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "countered" });

    res.json(updated);
  });

  // ACCEPT COUNTER (COMPANY): accept room price -> back to REQUESTED (waiting room approval/assignment)
  r.put("/:id/accept-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ error: "notFound" });
    if (ag.companyId !== req.user.companyId) return res.status(403).json({ error: "Forbidden" });

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return res.status(409).json({ error: `notCountered:${st}`, code: "AGREEMENT_COUNTER_NOT_PENDING" });
    }
    if (ag.roomOfferAmount == null) return res.status(400).json({ error: "roomOfferAmount missing" });

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        companyOfferAmount: ag.roomOfferAmount,
        companyOfferNote: ag.roomOfferNote ?? ag.companyOfferNote ?? null,
        status: "REQUESTED",
      },
    });

    // notify ROOM
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COUNTER_ACCEPTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:counterAccepted",
        title: "Karşı teklif kabul edildi",
        message: `Agreement #${updated.id} • teklif kabul edildi: ${updated.companyOfferAmount ?? "-"}`,
      },
      dedupeKey: `agreement:${updated.id}:counterAccepted:${updated.companyOfferAmount ?? "X"}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterAccepted" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterAccepted" });

    res.json(updated);
  });

  // REJECT COUNTER (COMPANY): reject and return to REQUESTED (clears roomOffer*)
  r.put("/:id/reject-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return res.status(404).json({ error: "notFound" });
    if (ag.companyId !== req.user.companyId) return res.status(403).json({ error: "Forbidden" });

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return res.status(409).json({ error: `notCountered:${st}`, code: "AGREEMENT_COUNTER_NOT_PENDING" });
    }

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        roomOfferAmount: null,
        roomOfferNote: null,
        status: "REQUESTED",
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COUNTER_REJECTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:counterRejected",
        title: "Karşı teklif reddedildi",
        message: `Agreement #${updated.id} • karşı teklif reddedildi. Yeni teklif gönderebilirsin.`,
      },
      dedupeKey: `agreement:${updated.id}:counterRejected`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterRejected" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "counterRejected" });

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


    // ✅ M53: notify ROOM (company cancelled)
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_CANCELLED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:cancelled",
        title: "Sözleşme iptal edildi",
        message: `Agreement #${updated.id} iptal edildi.`,
      },
      dedupeKey: `agreement:${updated.id}:cancelled`,
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

    // ✅ M53: notify ROOM (company extended)
    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTENDED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:extended",
        title: "Sözleşme uzatıldı",
        message: `Agreement #${updated.id} yeni bitiş: ${String(updated.endDate).slice(0, 10)}`,
      },
      dedupeKey: `agreement:${updated.id}:extended:${String(updated.endDate).slice(0, 10)}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extended" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extended" });
    res.json(updated);
  });

  return r;
}