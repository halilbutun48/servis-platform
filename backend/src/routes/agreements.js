// backend/src/routes/agreements.js
import express from "express";
import { prisma } from "../prisma.js";
import { buildAgreementCommercialBackboneMap, upsertAgreementCommercialBackbone } from "../services/paymentBackbone.js";
import { broadcastAgreementUpdate } from "../services/agreementBroadcast.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
// ✅ M59: agreement UI shift stats helper endpoint

import { computeFirstStartAtUTC } from "../services/agreementConflict.js";
import { findReservationConflictForAgreement } from "../services/reservationConflict.js";
import { validateAgreementSlotItems } from "../services/agreementSlots.js";
import { buildAgreementOpsBridgeById } from "../services/agreementOpsBridge.js";
import { buildAgreementQualityPaymentBridgePreview } from "../services/qualityPaymentBridgeService.js";
import { computeSeferScorePreview } from "../services/seferScoreService.js";
import { computePlatformFeePreview } from "../services/platformFeePreviewService.js";
import { buildAgreementShiftStats } from "../services/agreementShiftStats.js";
import { requireSourceShiftForAgreementCreate } from "../services/agreementSourceShiftGate.js";
import { agreementRef } from "../services/agreementCopy.js";
import { buildAgreementListItemsWithCommercialBackbone } from "../services/agreementListView.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { buildAgreementRouteRefreshRouter } from "./agreementRouteRefreshRouter.js";
import { buildAgreementExtendNegotiationRouter } from "./agreementExtendNegotiationRouter.js";
import { requireStepUpWrite } from "../auth/middleware.js";
import { wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";
import {
  clampMin,
  clampWeekMask,
  normDirection,
  normPattern,
  offerSummary,
  parseDateOnly,
  parseHub,
  parseOfferAmount,
  toInt,
  trimOrNull,
} from "./agreementsHelpers.js";

export function agreementsRouter(io) {
  const r = express.Router();
  wrapAsyncRouterMethods(r);
  r.use(authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), requireStepUpWrite("COMPANY", "ROOM", "SUPER_ADMIN"));

  // LIST
  r.get("/", async (req, res) => {
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
    const mapped = buildAgreementListItemsWithCommercialBackbone(items, commercialBackboneByAgreementId);

    res.json({ items: mapped });
  });

  r.use(buildAgreementRouteRefreshRouter(io));
  r.use(buildAgreementExtendNegotiationRouter(io));

  r.post("/shift-stats", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const ids = Array.isArray(req.body?.agreementIds) ? req.body.agreementIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    const horizonDays = Math.min(30, Math.max(1, Number(req.body?.horizonDays ?? 7)));

    if (!ids.length) return res.json({ byId: {} });
    const companyId = req.user.role === "COMPANY" ? (req.user.companyId ?? -1) : null;
    const roomId = req.user.role === "ROOM" ? (req.user.roomId ?? -1) : null;
    const stats = await buildAgreementShiftStats({ agreementIds: ids, horizonDays, companyId, roomId });

    res.json(stats);
  });
  // M91-D: OPERATION BRIDGE SUMMARY
  // Body: { agreementIds:number[] }
  // Returns: { byId: { [id]: { generatedCount, lastShift, agreementVehicle, agreementDriver } } }
  r.post("/ops-bridge", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const ids = Array.isArray(req.body?.agreementIds) ? req.body.agreementIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : [];
    if (!ids.length) return res.json({ byId: {} });
    const companyId = req.user.role === "COMPANY" ? (req.user.companyId ?? -1) : null;
    const roomId = req.user.role === "ROOM" ? (req.user.roomId ?? -1) : null;
    const byId = await buildAgreementOpsBridgeById({ agreementIds: ids, companyId, roomId });

    res.json({ byId });
  });

  r.get("/:id/quality-payment-bridge", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return sendErrorResponse(res, httpError(400, "invalidAgreementId"));

    const ag = await prisma.agreement.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, kind: true } },
        room: { select: { id: true, name: true } },
      },
    });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "COMPANY" && ag.companyId !== req.user.companyId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }
    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const preview = await buildAgreementQualityPaymentBridgePreview({ agreement: ag });
    return res.json(preview);
  });

  r.get("/:id/sefer-score-preview", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return sendErrorResponse(res, httpError(400, "invalidAgreementId"));

    const ag = await prisma.agreement.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, kind: true } },
        room: { select: { id: true, name: true } },
      },
    });

    if (ag) {
      if (req.user.role === "COMPANY" && ag.companyId !== req.user.companyId) {
        return sendErrorResponse(res, httpError(403, "Forbidden"));
      }
      if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
        return sendErrorResponse(res, httpError(403, "Forbidden"));
      }
    }

    const seferScorePreview = await computeSeferScorePreview({ agreement: ag, agreementId: id });
    return res.json({ seferScorePreview });
  });

  r.get("/:id/platform-fee-preview", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return sendErrorResponse(res, httpError(400, "invalidAgreementId"));

    const ag = await prisma.agreement.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, kind: true } },
        room: { select: { id: true, name: true } },
        commercialSources: {
          select: {
            id: true,
            sourceType: true,
            sourceKey: true,
            shiftRootId: true,
            agreementId: true,
          },
        },
      },
    });

    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));

    if (req.user.role === "COMPANY" && ag.companyId !== req.user.companyId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }
    if (req.user.role === "ROOM" && ag.roomId !== req.user.roomId) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const [bridgeById, seferScorePreview] = await Promise.all([
      buildAgreementOpsBridgeById({
        agreementIds: [id],
        companyId: req.user.role === "COMPANY" ? (req.user.companyId ?? -1) : null,
        roomId: req.user.role === "ROOM" ? (req.user.roomId ?? -1) : null,
      }),
      computeSeferScorePreview({ agreement: ag, agreementId: id }),
    ]);
    const bridge = bridgeById?.[id] || null;
    const platformFeePreview = computePlatformFeePreview({
      agreement: ag,
      bridge,
      seferScorePreview,
      sourceShiftId: bridge?.sourceShiftId || null,
      sourceSummary: bridge?.sourceSummary || null,
      commercialSources: ag.commercialSources || [],
      companyOfferAmount: ag.companyOfferAmount,
      roomOfferAmount: ag.roomOfferAmount,
      extendOfferAmount: ag.extendOfferAmount,
      extendCounterAmount: ag.extendCounterAmount,
      extendStatus: ag.extendStatus,
      agreementStatus: ag.status,
    });

    return res.json({ platformFeePreview });
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

  // M91-F: BUNDLE CREATE (COMPANY)
  // Body: { roomId,startDate,endDate,weekMask,items:[{startMin,endMin,direction,pattern,label?}], hubLat?,hubLng?, companyOfferAmount?, companyOfferNote? }
  r.post("/bundle", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const companyId = req.user.companyId;
    if (!companyId) return sendErrorResponse(res, httpError(400, "companyId required"));

    const roomId = Number(req.body.roomId);
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, status: true } });
    if (!room || room.status === "DELETED") return sendErrorResponse(res, httpError(400, "invalidRoomId"));

    const startDate = parseDateOnly(req.body.startDate);
    const endDate = parseDateOnly(req.body.endDate);
    const weekMask = clampWeekMask(req.body.weekMask);
    if (!startDate || !endDate) return sendErrorResponse(res, httpError(400, "startDate/endDate required"));
    if (endDate < startDate) return sendErrorResponse(res, httpError(400, "endDate must be >= startDate"));
    if (weekMask == null) return sendErrorResponse(res, httpError(400, "weekMask required (1..127)"));

    const slotValidation = validateAgreementSlotItems(req.body?.items);
    if (!slotValidation?.ok) return sendErrorResponse(res, httpError(400, "BAD_REQUEST", slotValidation?.message || "invalidSlotBundle"));

    const hub = parseHub(req.body);
    if (hub?.error) return sendErrorResponse(res, httpError(400, "BAD_REQUEST", hub.error));
    const sourceShiftId = Number(req.body?.sourceShiftId || 0);

    try {
      await requireSourceShiftForAgreementCreate(prisma, { sourceShiftId, companyId, roomId });
    } catch (error) {
      return sendErrorResponse(res, error);
    }

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const slot of slotValidation.slots) {
        const row = await tx.agreement.create({
          data: {
            companyId,
            roomId,
            startDate,
            endDate,
            weekMask,
            startMin: slot.startMin,
            endMin: slot.endMin,
            status: "REQUESTED",
            hubLat: hub.hubLat,
            hubLng: hub.hubLng,
            direction: slot.direction,
            pattern: slot.pattern,
            companyOfferAmount: toInt(req.body.companyOfferAmount, null),
            companyOfferNote: req.body.companyOfferNote ? String(req.body.companyOfferNote) : null,
          },
        });
        rows.push(row);
      }
      return rows;
    });

    for (const row of created) {
      await upsertAgreementCommercialBackbone(row.id, { sourceShiftId }).catch(() => null);
      await createAndEmitNotification({
        io,
        type: "AGREEMENT_REQUESTED",
        scope: "ROOM",
        roomId,
        companyId,
        payload: {
          v: 1,
          kind: "agreement:requested",
          title: "Yeni sözleşme talebi",
          message: `${agreementRef(row.id)} • teklif: ${offerSummary(row.companyOfferAmount, row.companyOfferNote)}`,
        },
        dedupeKey: `agreement:${row.id}:requested`,
      });
      broadcastAgreementUpdate(io, {
        companyId,
        roomId,
        payload: { id: row.id, kind: "created" },
      });
    }

    return res.json({ ok: true, createdIds: created.map((row) => Number(row.id)), items: created });
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

    const sourceShiftId = Number(req.body?.sourceShiftId || 0);

    try {
      await requireSourceShiftForAgreementCreate(prisma, { sourceShiftId, companyId, roomId });
    } catch (error) {
      return sendErrorResponse(res, error);
    }

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

    await upsertAgreementCommercialBackbone(created.id, { sourceShiftId }).catch(() => null);

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
        message: `${agreementRef(created.id)} • teklif: ${offerSummary(created.companyOfferAmount, created.companyOfferNote)}`,
      },
      dedupeKey: `agreement:${created.id}:requested`,
    });

    broadcastAgreementUpdate(io, {
      companyId,
      roomId,
      payload: { id: created.id, kind: "created" },
    });

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

    const conflict = await findReservationConflictForAgreement({
      agreementId: ag.id,
      vehicleId,
      driverId,
      startDate: ag.startDate,
      endDate: ag.endDate,
      weekMask: ag.weekMask,
      startMin: ag.startMin,
      endMin: ag.endMin,
    });
    if (conflict) {
      return res.status(409).json(conflict);
    }

    const now = new Date();
    const firstStart = computeFirstStartAtUTC(ag);

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
        title: "Sözleşme kabul edildi",
        message: `${agreementRef(updated.id)} kabul edildi. Araç=${updated.vehicleId} Sürücü=${updated.driverId}`,
      },
      dedupeKey: `agreement:${updated.id}:approved`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: { id: updated.id, kind: "approved" },
    });

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
        message: `${agreementRef(updated.id)} • karşı teklif: ${offerSummary(updated.roomOfferAmount, updated.roomOfferNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:counter`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: { id: updated.id, kind: "countered" },
    });

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
        message: `${agreementRef(updated.id)} • teklif kabul edildi: ${updated.companyOfferAmount ?? "-"}`,
      },
      dedupeKey: `agreement:${updated.id}:counterAccepted:${updated.companyOfferAmount ?? "X"}`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: { id: updated.id, kind: "counterAccepted" },
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // COMPANY COUNTER (COMPANY): send a revised company offer after room counter
  r.put("/:id/company-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const ag = await prisma.agreement.findUnique({ where: { id } });
    if (!ag) return sendErrorResponse(res, httpError(404, "notFound"));
    if (ag.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const st = String(ag.status || "").toUpperCase();
    if (st !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_COUNTER_NOT_PENDING", `notCountered:${st}`));
    }

    const companyOfferAmount = parseOfferAmount(req.body.companyOfferAmount);
    if (companyOfferAmount == null) return sendErrorResponse(res, httpError(400, "companyOfferAmount required (>0)"));

    const companyOfferNote = trimOrNull(req.body.companyOfferNote);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        companyOfferAmount,
        companyOfferNote,
        status: "REQUESTED",
      },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_COMPANY_COUNTERED",
      scope: "ROOM",
      roomId: updated.roomId,
      companyId: updated.companyId,
      payload: {
        v: 1,
        kind: "agreement:companyCountered",
        title: "Şirket yeni teklif gönderdi",
        message: `${agreementRef(updated.id)} • yeni teklif: ${offerSummary(updated.companyOfferAmount, updated.companyOfferNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:companyCounter:${updated.companyOfferAmount ?? "X"}`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: { id: updated.id, kind: "companyCountered" },
    });

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
        message: `${agreementRef(updated.id)} • karşı teklif reddedildi. Yeni teklif gönderebilirsin.`,
      },
      dedupeKey: `agreement:${updated.id}:counterRejected`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: { id: updated.id, kind: "counterRejected" },
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });

  // REJECT (ROOM): reject agreement request / negotiation
  r.put("/:id/reject", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
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

    const updated = await prisma.agreement.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_REJECTED",
      scope: "COMPANY",
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: {
        v: 1,
        kind: "agreement:rejected",
        title: "Sözleşme reddedildi",
        message: `${agreementRef(updated.id)} reddedildi.`,
      },
      dedupeKey: `agreement:${updated.id}:rejected`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: { id: updated.id, kind: "rejected" },
    });

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
        message: `${agreementRef(updated.id)} iptal edildi.`,
      },
      dedupeKey: `agreement:${updated.id}:cancelled`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updated.companyId,
      roomId: updated.roomId,
      payload: { id: updated.id, kind: "cancelled" },
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    res.json(updated);
  });


  return r;
}

