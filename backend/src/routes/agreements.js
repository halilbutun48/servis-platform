// backend/src/routes/agreements.js
import express from "express";
import { prisma } from "../prisma.js";
import { buildAgreementCommercialBackboneMap, upsertAgreementCommercialBackbone } from "../services/paymentBackbone.js";
import { dateOnlyUTCFromYmd } from "../time/tr.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { ymdTR, addDaysTR, atTR } from "../time/tr.js";
// ✅ M59: agreement UI shift stats helper endpoint

import {
  agreementsOverlap,
  findAgreementConflictForApproval,
  agreementConflictResponse,
  computeFirstStartAtUTC,
} from "../services/agreementConflict.js";

function parseDateOnly(s) {
  const v = String(s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return dateOnlyUTCFromYmd(v);
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

function parseOfferAmountNullable(v) {
  const raw = v == null ? "" : String(v).trim();
  if (!raw) return null;
  return parseOfferAmount(raw);
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
    const q = String(req.query.q || "").trim();

    const where = {};
    if (status) where.status = status;

    // scope
    if (req.user.role === "COMPANY") where.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") where.roomId = req.user.roomId ?? -1;

    if (q) {
      where.OR = [
        { room: { is: { name: { contains: q, mode: "insensitive" } } } },
        { companyOfferNote: { contains: q, mode: "insensitive" } },
        { roomOfferNote: { contains: q, mode: "insensitive" } },
      ];
      if (Number.isFinite(Number(q)) && Number(q) > 0) {
        where.OR.push({ id: Number(q) });
      }
    }

    const items = await prisma.agreement.findMany({
      where,
      take,
      orderBy: { id: "desc" },
      include: q ? { room: { select: { id: true, name: true } } } : undefined,
    });

    const commercialBackboneByAgreementId = await buildAgreementCommercialBackboneMap(items.map((item) => item.id));
    const mapped = items.map((item) => ({
      ...item,
      commercialBackbone: commercialBackboneByAgreementId[Number(item.id)] || null,
    }));

    res.json({ items: mapped });
  });

  // ✅ M59: SHIFT STATS (for UI clarity)
  // Body: { agreementIds: number[], horizonDays?: number }
  // Returns: { byId: { [id]: { todayTotal, todayDone, horizonOpen } } }
  r.post("/shift-stats", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const ids = Array.isArray(req.body?.agreementIds) ? req.body.agreementIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    const horizonDays = Math.min(30, Math.max(1, Number(req.body?.horizonDays ?? 7)));

    if (!ids.length) return res.json({ byId: {} });

    const now = new Date();
    const todayYmd = ymdTR(now);
    const todayStart = atTR(todayYmd, 0);
    const tomorrowStart = atTR(addDaysTR(todayYmd, 1), 0);
    const horizonEnd = atTR(addDaysTR(todayYmd, horizonDays), 0);

    const scope = { agreementId: { in: ids } };
    if (req.user.role === "COMPANY") scope.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") scope.roomId = req.user.roomId ?? -1;

    const todayWhere = { ...scope, startAt: { gte: todayStart, lt: tomorrowStart } };
    const horizonWhere = { ...scope, startAt: { gte: now, lt: horizonEnd }, status: { in: ["APPROVED", "ACTIVE"] } };

    const [todayTotal, todayDone, horizonOpen] = await Promise.all([
      prisma.shift.groupBy({ by: ["agreementId"], where: todayWhere, _count: { _all: true } }),
      prisma.shift.groupBy({ by: ["agreementId"], where: { ...todayWhere, status: "DONE" }, _count: { _all: true } }),
      prisma.shift.groupBy({ by: ["agreementId"], where: horizonWhere, _count: { _all: true } }),
    ]);

    const byId = {};
    for (const id of ids) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };

    for (const row of (todayTotal || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].todayTotal = Number(row?._count?._all ?? 0);
    }
    for (const row of (todayDone || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].todayDone = Number(row?._count?._all ?? 0);
    }
    for (const row of (horizonOpen || [])) {
      const id = Number(row.agreementId);
      if (!byId[id]) byId[id] = { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
      byId[id].horizonOpen = Number(row?._count?._all ?? 0);
    }

    res.json({ byId, meta: { todayStart, tomorrowStart, horizonEnd, horizonDays } });
  });
  // GET by id (debug + checks)
  r.get("/:id", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "COMPANY" && ag.companyId !== req.user.companyId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }
    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    res.json(ag);
  });

  // CREATE (COMPANY)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const companyId = req.user.companyId;
    if (!companyId) return sendErrorResponse(res, httpError(400, "companyId required"));

    const roomId = Number(req.body.roomId);
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, status: true } });
    if (!room || room.status === "DELETED") return sendErrorResponse(res, httpError(400, "invalidRoomId"));

    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate);
    const weekMask = clampWeekMask(req.body.weekMask);
    const startMin = clampMin(req.body.startMin);
    const endMin = clampMin(req.body.endMin);

    if (!startDate || !endDate) return sendErrorResponse(res, httpError(400, "startDate/endDate required"));
    if (endDate < startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (weekMask == null) return sendErrorResponse(res, httpError(400, "weekMask required (1..127)"));
    if (startMin == null || endMin == null) return sendErrorResponse(res, httpError(400, "startMin/endMin required (0..1439)"));

    // ✅ M19: routing meta
    const direction = normDirection(req.body.direction);
    const pattern = normPattern(req.body.pattern);
    if (!direction) return sendErrorResponse(res, httpError(400, "direction invalid (INBOUND|OUTBOUND)"));
    if (!pattern) return sendErrorResponse(res, httpError(400, "pattern invalid (ONE_WAY|LOOP)"));
    const hub = parseHub(req.body);
    if (hub?.error) return sendErrorResponse(res, httpError(400, "BAD_REQUEST", hub.error));

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

    await upsertAgreementCommercialBackbone(created.id).catch(() => null);

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
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
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
    if (!vehicleId || !driverId) return sendErrorResponse(res, httpError(400, "vehicleId+driverId required"));

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

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // COUNTER (ROOM): propose price (no vehicle/driver assignment)
  r.put("/:id/counter", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED" || st === "DONE") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", `invalidState:${st}`));
    }
    if (st === "APPROVED" || st === "ACTIVE") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_ALREADY_APPROVED", `alreadyApproved:${st}`));
    }

    const roomOfferAmount = parseOfferAmount(req.body.roomOfferAmount);
    if (roomOfferAmount == null) return sendErrorResponse(res, httpError(400, "roomOfferAmount required (>0)"));

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

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // ACCEPT COUNTER (COMPANY): accept room price -> back to REQUESTED (waiting room approval/assignment)
  r.put("/:id/accept-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_COUNTER_NOT_PENDING", `notCountered:${st}`));
    }
    if (ag.roomOfferAmount == null) return sendErrorResponse(res, httpError(400, "roomOfferAmount missing"));

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

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // REJECT COUNTER (COMPANY): reject and return to REQUESTED (clears roomOffer*)
  r.put("/:id/reject-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_COUNTER_NOT_PENDING", `notCountered:${st}`));
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

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // CANCEL (COMPANY)
  r.put("/:id/cancel", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

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

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });


  // ✅ M57: AGREEMENT EXTEND NEGOTIATION
  // Model:
  // - Company sends extend-request (new endDate + optional new offer amount/note)
  // - Room can accept/reject OR counter price (then company accepts/rejects counter)
  // - Old /extend endpoint kept for backward compatibility; it behaves like extend-request.

  function ymdOfDateOnly(d) {
    try {
      return ymdTR(d);
    } catch {
      return "";
    }
  }

  async function assertNoExtendConflictOr409(ag, proposedEndDate, res) {
    // If already assigned, extend must not create conflicts
    if (!ag.vehicleId && !ag.driverId) return true;

    const candidates = await findAgreementConflictForApproval({
      agreementId: ag.id,
      vehicleId: ag.vehicleId ?? undefined,
      driverId: ag.driverId ?? undefined,
    });

    const proposed = { ...ag, endDate: proposedEndDate };

    for (const c of candidates) {
      if (ag.vehicleId && c.vehicleId === ag.vehicleId && agreementsOverlap(proposed, c)) {
        res.status(409).json(agreementConflictResponse({ kind: "vehicle", agreement: c }));
        return false;
      }
    }
    for (const c of candidates) {
      if (ag.driverId && c.driverId === ag.driverId && agreementsOverlap(proposed, c)) {
        res.status(409).json(agreementConflictResponse({ kind: "driver", agreement: c }));
        return false;
      }
    }
    return true;
  }

  function computeReactivatedStatus(ag, proposedEndDate) {
    const now = new Date();
    const proposed = { ...ag, endDate: proposedEndDate };
    const firstStart = computeFirstStartAtUTC(proposed);
    return now >= firstStart ? "ACTIVE" : "APPROVED";
  }

  // EXTEND REQUEST (COMPANY)
  r.put("/:id/extend-request", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", `invalidState:${st}`));
    }

    const endDate = parseDateOnly(req.body.endDate);
    if (!endDate) return sendErrorResponse(res, httpError(400, "endDate required (YYYY-MM-DD)"));
    if (endDate < ag.startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (endDate <= ag.endDate) return sendErrorResponse(res, httpError(400, "endDate must be > current endDate"));

    // if room already countered, do not overwrite the negotiation
    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex === "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_PENDING", "extendCounterPending"));
    }

    // optional offer update
    const offerAmount = parseOfferAmountNullable(req.body.extendOfferAmount);
    if (String(req.body.extendOfferAmount || "").trim() && offerAmount == null) {
      return sendErrorResponse(res, httpError(400, "extendOfferAmount invalid (>0)"));
    }
    const offerNote = trimOrNull(req.body.extendOfferNote);

    // if assigned, we can early-check conflicts (so room doesn't waste time)
    const ok = await assertNoExtendConflictOr409(ag, endDate, res);
    if (!ok) return;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "PENDING",
        extendRequestedEndDate: endDate,
        extendRequestedAt: new Date(),
        extendOfferAmount: offerAmount,
        extendOfferNote: offerNote,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: null,
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_REQUESTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:extendRequested",
        title: "Sözleşme uzatma teklifi",
        message: `Agreement #${updated.id} yeni bitiş: ${ymdOfDateOnly(updated.extendRequestedEndDate)} • teklif: ${offerAmount ?? "-"}${offerNote ? " — " + offerNote : ""}`,
      },
      dedupeKey: `agreement:${updated.id}:extendReq:${ymdOfDateOnly(updated.extendRequestedEndDate)}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND DECISION (ROOM): accept / reject company extend-request
  r.put("/:id/extend-decision", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "PENDING") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_NOT_PENDING", `extendNotPending:${ex}`));
    }
    if (!ag.extendRequestedEndDate) return sendErrorResponse(res, httpError(400, "extendRequestedEndDate missing"));

    const decision = String(req.body.decision || "").trim().toUpperCase();
    if (decision !== "ACCEPT" && decision !== "REJECT") {
      return sendErrorResponse(res, httpError(400, "decision must be ACCEPT|REJECT"));
    }

    if (decision === "REJECT") {
      const updated = await prisma.agreement.update({
        where: { id },
        data: {
          extendStatus: "NONE",
          extendRequestedEndDate: null,
          extendRequestedAt: null,
          extendOfferAmount: null,
          extendOfferNote: null,
          extendCounterAmount: null,
          extendCounterNote: null,
          extendDecisionAt: new Date(),
        },
      });

      await createAndEmitNotification({
        io,
        type: "AGREEMENT_EXTEND_REJECTED",
        scope: "COMPANY",
        companyId: updated.companyId,
        roomId: updated.roomId,
        payload: {
          v: 1,
          kind: "agreement:extendRejected",
          title: "Uzatma reddedildi",
          message: `Agreement #${updated.id} uzatma teklifi reddedildi.`,
        },
        dedupeKey: `agreement:${updated.id}:extendRejected:${Date.now()}`,
      });

      io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRejected" });
      io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRejected" });

      return res.json(updated);
    }

    // ACCEPT: conflict check + apply endDate (+ optional offer update), reactivate if needed
    const proposedEndDate = ag.extendRequestedEndDate;
    const ok = await assertNoExtendConflictOr409(ag, proposedEndDate, res);
    if (!ok) return;

    const offerAmount = ag.extendOfferAmount;
    const offerNote = ag.extendOfferNote;

    const nextStatus = String(ag.status || "").toUpperCase() === "DONE" ? computeReactivatedStatus(ag, proposedEndDate) : ag.status;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        endDate: proposedEndDate,
        status: nextStatus,
        // apply offer only if provided
        companyOfferAmount: offerAmount != null ? offerAmount : ag.companyOfferAmount,
        companyOfferNote: offerAmount != null ? (offerNote ?? ag.companyOfferNote ?? null) : ag.companyOfferNote,
        extendStatus: "NONE",
        extendRequestedEndDate: null,
        extendRequestedAt: null,
        extendOfferAmount: null,
        extendOfferNote: null,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_ACCEPTED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:extendAccepted",
        title: "Uzatma kabul edildi",
        message: `Agreement #${updated.id} yeni bitiş: ${ymdOfDateOnly(updated.endDate)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendAccepted:${ymdOfDateOnly(updated.endDate)}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendAccepted" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendAccepted" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND COUNTER (ROOM): counter price for extension (keeps requested endDate)
  r.put("/:id/extend-counter", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "PENDING") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_NOT_PENDING", `extendNotPending:${ex}`));
    }
    if (!ag.extendRequestedEndDate) return sendErrorResponse(res, httpError(400, "extendRequestedEndDate missing"));

    const amount = parseOfferAmount(req.body.extendCounterAmount);
    if (amount == null) return sendErrorResponse(res, httpError(400, "extendCounterAmount required (>0)"));
    const note = trimOrNull(req.body.extendCounterNote);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "COUNTERED",
        extendCounterAmount: amount,
        extendCounterNote: note,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_COUNTERED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:extendCountered",
        title: "Uzatma karşı teklifi",
        message: `Agreement #${updated.id} • yeni bitiş: ${ymdOfDateOnly(updated.extendRequestedEndDate)} • karşı: ${updated.extendCounterAmount}${updated.extendCounterNote ? " — " + updated.extendCounterNote : ""}`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounter:${ymdOfDateOnly(updated.extendRequestedEndDate)}:${updated.extendCounterAmount}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCountered" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCountered" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND ACCEPT COUNTER (COMPANY): accept room counter -> apply endDate and new price
  r.put("/:id/extend-accept-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_NOT_PENDING", `extendNotCountered:${ex}`));
    }
    if (!ag.extendRequestedEndDate) return sendErrorResponse(res, httpError(400, "extendRequestedEndDate missing"));
    if (ag.extendCounterAmount == null) return sendErrorResponse(res, httpError(400, "extendCounterAmount missing"));

    const proposedEndDate = ag.extendRequestedEndDate;
    const ok = await assertNoExtendConflictOr409(ag, proposedEndDate, res);
    if (!ok) return;

    const nextStatus = String(ag.status || "").toUpperCase() === "DONE" ? computeReactivatedStatus(ag, proposedEndDate) : ag.status;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        endDate: proposedEndDate,
        status: nextStatus,
        companyOfferAmount: ag.extendCounterAmount,
        companyOfferNote: ag.extendCounterNote ?? ag.companyOfferNote ?? null,
        extendStatus: "NONE",
        extendRequestedEndDate: null,
        extendRequestedAt: null,
        extendOfferAmount: null,
        extendOfferNote: null,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_COUNTER_ACCEPTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:extendCounterAccepted",
        title: "Uzatma karşı teklifi kabul edildi",
        message: `Agreement #${updated.id} yeni bitiş: ${ymdOfDateOnly(updated.endDate)} • yeni teklif: ${updated.companyOfferAmount ?? "-"}`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounterAccepted:${ymdOfDateOnly(updated.endDate)}:${updated.companyOfferAmount ?? "X"}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterAccepted" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterAccepted" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // EXTEND REJECT COUNTER (COMPANY): reject room counter -> back to pending (room can accept original offer or counter again)
  r.put("/:id/extend-reject-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_NOT_PENDING", `extendNotCountered:${ex}`));
    }

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "PENDING",
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: new Date(),
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_EXTEND_COUNTER_REJECTED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:extendCounterRejected",
        title: "Karşı teklif reddedildi",
        message: `Agreement #${updated.id} • uzatma teklifi hala beklemede. İstersen kabul et veya yeni counter gönder.`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounterRejected:${Date.now()}`,
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterRejected" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendCounterRejected" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // BACKCOMPAT: EXTEND (COMPANY) behaves like extend-request (kept for older UIs)
  r.put("/:id/extend", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st === "CANCELLED" || st === "REJECTED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", `invalidState:${st}`));
    }

    const endDate = parseDateOnly(req.body.endDate);
    if (!endDate) return sendErrorResponse(res, httpError(400, "endDate required (YYYY-MM-DD)"));
    if (endDate < ag.startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (endDate <= ag.endDate) return sendErrorResponse(res, httpError(400, "endDate must be > current endDate"));

    const ex = String(ag.extendStatus || "NONE").toUpperCase();
    if (ex === "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_EXTEND_COUNTER_PENDING", "extendCounterPending"));
    }

    const offerAmount = parseOfferAmountNullable(req.body.extendOfferAmount);
    if (String(req.body.extendOfferAmount || "").trim() && offerAmount == null) {
      return sendErrorResponse(res, httpError(400, "extendOfferAmount invalid (>0)"));
    }
    const offerNote = trimOrNull(req.body.extendOfferNote);

    const ok = await assertNoExtendConflictOr409(ag, endDate, res);
    if (!ok) return;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        extendStatus: "PENDING",
        extendRequestedEndDate: endDate,
        extendRequestedAt: new Date(),
        extendOfferAmount: offerAmount,
        extendOfferNote: offerNote,
        extendCounterAmount: null,
        extendCounterNote: null,
        extendDecisionAt: null,
      },
    });

    io?.to?.(`company:${updated.companyId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });
    io?.to?.(`room:${updated.roomId}`)?.emit?.("agreement:update", { id: updated.id, kind: "extendRequested" });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });


  return r;
}
