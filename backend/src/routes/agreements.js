// backend/src/routes/agreements.js
import express from "express";
import { prisma } from "../prisma.js";
import { audit } from "../audit.js";
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
import { agreementCommercialFieldsFromSourceOffer } from "./agreementSourceOffer.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { buildAgreementRouteRefreshRouter } from "./agreementRouteRefreshRouter.js";
import { buildAgreementExtendNegotiationRouter } from "./agreementExtendNegotiationRouter.js";
import { generateAgreementShiftsOnce } from "../jobs/agreementShiftGenerator.js";
import { requireStepUpWrite } from "../auth/middleware.js";
import { wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";
import {
  buildRoomQuoteDraftPreview,
  buildRoomQuoteDraftServiceContext,
  loadRoomFinancialContext,
} from "./commercialCoreRoomRoutes.js";
import {
  costedQuoteReplayKey,
  validateCostedQuoteSendSnapshot,
} from "../finance/roomCostedQuoteSend.js";
import {
  buildCompanyAgreementDecisionAuditMeta,
  buildCompanyAgreementDecisionMutation,
  buildCompanyAgreementDecisionReplaySnapshot,
  validateCompanyAgreementDecisionSnapshot,
} from "../finance/companyAgreementDecision.js";
import {
  buildRoomAgreementApprovalAuditMeta,
  buildRoomAgreementApprovalReplayKey,
} from "../finance/companyAgreementApproval.js";
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

function costedQuoteSnapshot(draft) {
  return draft?.inputSnapshot && typeof draft.inputSnapshot === "object"
    ? draft.inputSnapshot
    : {};
}

function costedQuoteSendMessage(code) {
  const messages = {
    ROOM_QUOTE_SEND_CONFIRMATION_REQUIRED: "Teklif gönderilmeden önce açık onay gerekir.",
    ROOM_QUOTE_SEND_AGREEMENT_NOT_READY: "Bu talep artık teklif gönderimine açık değil.",
    ROOM_QUOTE_SEND_DRAFT_NOT_READY: "Teklif taslağı artık düzenlenebilir durumda değil.",
    ROOM_QUOTE_SEND_SCOPE_MISMATCH: "Teklif taslağı seçili hizmetle eşleşmiyor.",
    ROOM_QUOTE_SEND_STALE_DRAFT: "Teklif taslağı güncellenmiş; önce güncel taslağı yeniden inceleyin.",
    ROOM_QUOTE_SEND_STALE_CONTEXT: "Hizmet bilgileri değişmiş; teklif taslağını güncel hesapla yeniden onaylayın.",
    ROOM_QUOTE_SEND_SCOPE_CHANGED: "Planlanan hizmet kapsamı değişmiş; teklif yeniden hesaplanmalı.",
    ROOM_QUOTE_SEND_PERIOD_NOT_READY: "Hizmet dönemi için güvenilir maliyet hesabı hazır değil.",
    AGREEMENT_COUNTER_ALREADY_SENT: "Bu teklif zaten sunuldu; aynı teklif tekrar gönderilemez.",
  };
  return messages[code] || "Teklif gönderilemedi.";
}

function costedQuoteAuditMetaMatches(meta, replayKey) {
  return String(meta?.replayKey || "") === String(replayKey || "");
}

function buildCostedQuoteRoomOfferNote({ belowEstimatedCost = false } = {}) {
  return belowEstimatedCost
    ? "Maliyetli teklif taslağı, tahmini maliyet uyarısı gösterilerek ROOM kullanıcısının açık onayıyla sunuldu."
    : "Maliyetli teklif taslağı, ROOM kullanıcısının açık onayıyla sunuldu.";
}

function companyDecisionMessage(code) {
  const messages = {
    AGREEMENT_DECISION_CONFIRMATION_REQUIRED: "Karar uygulanmadan önce açık onay gerekir.",
    AGREEMENT_DECISION_FORBIDDEN: "Bu teklif için karar verme yetkiniz yok.",
    AGREEMENT_DECISION_INVALID: "Geçersiz teklif kararı.",
    AGREEMENT_DECISION_INVALID_STATE: "Bu teklif artık karar vermeye açık değil.",
    AGREEMENT_DECISION_STALE_OFFER: "Teklif tutarı değişmiş; güncel teklifi yeniden inceleyin.",
    AGREEMENT_DECISION_STALE_VERSION: "Teklif güncellenmiş; güncel kaydı yeniden açın.",
    AGREEMENT_DECISION_VERSION_REQUIRED: "Karar için güncel teklif kaydı gerekir.",
    AGREEMENT_DECISION_ALREADY_DECIDED: "Bu karar daha önce tamamlandı.",
  };
  return messages[code] || "Teklif kararı uygulanamadı.";
}

function decisionReplayMetaMatches(meta, replayKey, actorCompanyId) {
  return String(meta?.replayKey || "") === String(replayKey || "")
    && Number(meta?.actorCompanyId || 0) === Number(actorCompanyId || 0);
}

function formatOfferMinorForNotification(amountMinor) {
  const amount = Number(amountMinor);
  if (!Number.isSafeInteger(amount) || amount < 0) return "-";
  return `${(amount / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

async function executeCompanyAgreementDecision({ io, id, req, decision }) {
  const ag = await prisma.agreement.findUnique({ where: { id } });
  if (!ag) throw httpError(404, "notFound");
  if (ag.companyId !== req.user.companyId) throw httpError(403, "Forbidden");

  const requestInput = {
    agreement: ag,
    actor: req.user,
    decision,
    expectedStatus: "COUNTERED",
    expectedRoomOfferAmountMinor: req.body?.expectedRoomOfferAmountMinor,
    expectedUpdatedAt: req.body?.expectedUpdatedAt,
    confirmed: req.body?.confirmed === true,
    confirmationToken: req.body?.confirmationToken,
  };
  const currentStatus = String(ag.status || "").toUpperCase();

  if (currentStatus !== "COUNTERED") {
    const replayValidation = validateCompanyAgreementDecisionSnapshot({
      ...requestInput,
      agreement: buildCompanyAgreementDecisionReplaySnapshot({
        agreement: ag,
        expectedRoomOfferAmountMinor: req.body?.expectedRoomOfferAmountMinor,
        expectedUpdatedAt: req.body?.expectedUpdatedAt,
      }),
    });
    if (!replayValidation.ok) {
      throw httpError(replayValidation.code === "AGREEMENT_DECISION_FORBIDDEN" ? 403 : 409, replayValidation.code, companyDecisionMessage(replayValidation.code));
    }
    const prior = await prisma.auditLog.findFirst({
      where: {
        entity: "Agreement",
        entityId: id,
        action: "COMPANY_AGREEMENT_DECISION",
      },
      orderBy: { id: "desc" },
    });
    if (!prior || !decisionReplayMetaMatches(prior.meta, replayValidation.replayKey, req.user.companyId) || String(prior.meta?.decision || "") !== decision) {
      throw httpError(409, "AGREEMENT_DECISION_INVALID_STATE", companyDecisionMessage("AGREEMENT_DECISION_INVALID_STATE"));
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user?.id || null,
        actorRole: req.user?.role || null,
        action: "COMPANY_AGREEMENT_DECISION_REPLAYED",
        entity: "Agreement",
        entityId: id,
        meta: {
          ...prior.meta,
          actorUserId: req.user?.id || null,
          actorCompanyId: req.user?.companyId || null,
          idempotent: true,
          replayOfAuditId: prior.id,
        },
      },
    });

    return {
      updated: ag,
      idempotent: true,
      agreementDecision: {
        decision,
        previousStatus: prior.meta?.previousStatus || "COUNTERED",
        finalStatus: prior.meta?.finalStatus || currentStatus,
        roomOfferAmountMinor: prior.meta?.roomOfferAmountMinor ?? ag.roomOfferAmount ?? null,
      },
    };
  }

  const validation = validateCompanyAgreementDecisionSnapshot(requestInput);
  if (!validation.ok) {
    throw httpError(validation.code === "AGREEMENT_DECISION_FORBIDDEN" ? 403 : 409, validation.code, companyDecisionMessage(validation.code));
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const freshAgreement = await tx.agreement.findUnique({ where: { id } });
    if (!freshAgreement) throw httpError(404, "notFound");

    const freshValidation = validateCompanyAgreementDecisionSnapshot({
      ...requestInput,
      agreement: freshAgreement,
    });
    if (!freshValidation.ok) {
      const prior = await tx.auditLog.findFirst({
        where: {
          entity: "Agreement",
          entityId: id,
          action: "COMPANY_AGREEMENT_DECISION",
        },
        orderBy: { id: "desc" },
      });
      if (prior && decisionReplayMetaMatches(prior.meta, validation.replayKey, req.user.companyId) && String(prior.meta?.decision || "") === decision) {
        await tx.auditLog.create({
          data: {
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || null,
            action: "COMPANY_AGREEMENT_DECISION_REPLAYED",
            entity: "Agreement",
            entityId: id,
            meta: {
              ...prior.meta,
              actorUserId: req.user?.id || null,
              actorCompanyId: req.user?.companyId || null,
              idempotent: true,
              replayOfAuditId: prior.id,
            },
          },
        });
        return {
          updated: freshAgreement,
          idempotent: true,
          agreementDecision: {
            decision,
            previousStatus: prior.meta?.previousStatus || "COUNTERED",
            finalStatus: prior.meta?.finalStatus || String(freshAgreement.status || "").toUpperCase(),
            roomOfferAmountMinor: prior.meta?.roomOfferAmountMinor ?? freshAgreement.roomOfferAmount ?? null,
          },
        };
      }
      throw httpError(409, freshValidation.code, companyDecisionMessage(freshValidation.code));
    }

    const mutation = buildCompanyAgreementDecisionMutation({
      decision,
      roomOfferAmountMinor: freshValidation.roomOfferAmountMinor,
      roomOfferNote: freshAgreement.roomOfferNote ?? freshAgreement.companyOfferNote ?? null,
    });
    const changed = await tx.agreement.updateMany({
      where: {
        id,
        companyId: req.user.companyId,
        status: "COUNTERED",
        roomOfferAmount: freshValidation.roomOfferAmountMinor,
        updatedAt: freshAgreement.updatedAt,
      },
      data: mutation,
    });
    if (changed.count !== 1) {
      const prior = await tx.auditLog.findFirst({
        where: {
          entity: "Agreement",
          entityId: id,
          action: "COMPANY_AGREEMENT_DECISION",
        },
        orderBy: { id: "desc" },
      });
      if (prior && decisionReplayMetaMatches(prior.meta, freshValidation.replayKey, req.user.companyId) && String(prior.meta?.decision || "") === decision) {
        await tx.auditLog.create({
          data: {
            actorUserId: req.user?.id || null,
            actorRole: req.user?.role || null,
            action: "COMPANY_AGREEMENT_DECISION_REPLAYED",
            entity: "Agreement",
            entityId: id,
            meta: {
              ...prior.meta,
              actorUserId: req.user?.id || null,
              actorCompanyId: req.user?.companyId || null,
              idempotent: true,
              replayOfAuditId: prior.id,
            },
          },
        });
        return {
          updated: freshAgreement,
          idempotent: true,
          agreementDecision: {
            decision,
            previousStatus: prior.meta?.previousStatus || "COUNTERED",
            finalStatus: prior.meta?.finalStatus || String(freshAgreement.status || "").toUpperCase(),
            roomOfferAmountMinor: prior.meta?.roomOfferAmountMinor ?? freshAgreement.roomOfferAmount ?? null,
          },
        };
      }
      throw httpError(409, "AGREEMENT_DECISION_ALREADY_DECIDED", companyDecisionMessage("AGREEMENT_DECISION_ALREADY_DECIDED"));
    }

    const updated = await tx.agreement.findUnique({ where: { id } });
    const auditMeta = buildCompanyAgreementDecisionAuditMeta({
      validation: freshValidation,
      actorUserId: req.user?.id,
      actorCompanyId: req.user?.companyId,
      finalStatus: updated?.status,
      idempotent: false,
    });
    await tx.auditLog.create({
      data: {
        actorUserId: req.user?.id || null,
        actorRole: req.user?.role || null,
        action: "COMPANY_AGREEMENT_DECISION",
        entity: "Agreement",
        entityId: id,
        meta: auditMeta,
      },
    });
    return {
      updated,
      idempotent: false,
      agreementDecision: {
        decision,
        previousStatus: freshValidation.previousStatus,
        finalStatus: updated?.status || "REQUESTED",
        roomOfferAmountMinor: freshValidation.roomOfferAmountMinor,
      },
    };
  });

  if (!transactionResult.idempotent) {
    const accepted = decision === "ACCEPT";
    await createAndEmitNotification({
      io,
      type: accepted ? "AGREEMENT_COUNTER_ACCEPTED" : "AGREEMENT_COUNTER_REJECTED",
      scope: "ROOM",
      roomId: transactionResult.updated.roomId,
      companyId: transactionResult.updated.companyId,
      payload: {
        v: 1,
        kind: accepted ? "agreement:counterAccepted" : "agreement:counterRejected",
        title: accepted ? "Karşı teklif kabul edildi" : "Karşı teklif reddedildi",
        message: accepted
          ? `${agreementRef(transactionResult.updated.id)} • teklif kabul edildi: ${formatOfferMinorForNotification(transactionResult.updated.companyOfferAmount)}`
          : `${agreementRef(transactionResult.updated.id)} • karşı teklif reddedildi. Yeni teklif gönderebilirsin.`,
      },
      dedupeKey: accepted
        ? `agreement:${transactionResult.updated.id}:counterAccepted:${transactionResult.updated.companyOfferAmount ?? "X"}`
        : `agreement:${transactionResult.updated.id}:counterRejected`,
    });

    broadcastAgreementUpdate(io, {
      companyId: transactionResult.updated.companyId,
      roomId: transactionResult.updated.roomId,
      payload: { id: transactionResult.updated.id, kind: accepted ? "counterAccepted" : "counterRejected" },
    });

  }

  // Keep the existing commercial backbone/settlement preview in sync with
  // the accepted agreement amount. This is an idempotent projection refresh;
  // it does not create a second commercial source or settlement.
  await upsertAgreementCommercialBackbone(transactionResult.updated.id).catch(() => null);

  return transactionResult;
}

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
      // The Room agreement surface needs the authorized display names that
      // correspond to the stored foreign keys. Keep the tenant-scoped where
      // clause above as the isolation boundary; these are read-only labels.
      include: {
        room: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        vehicle: { select: { id: true, plate: true } },
        driver: { select: { id: true, fullName: true } },
      },
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
    const byId = await buildAgreementOpsBridgeById({ agreementIds: ids, companyId, roomId, actorRole: req.user.role });

    res.json({ byId });
  });

  // Explicit user-triggered path for the canonical agreement -> operation
  // shift generator. Scheduler remains optional/closed; this route reuses the
  // same idempotent generator and never repurposes the source shift.
  r.post("/:id/operation-shifts/sync", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return sendErrorResponse(res, httpError(400, "invalidAgreementId"));

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        roomId: true,
        status: true,
        vehicleId: true,
        driverId: true,
        startDate: true,
        endDate: true,
        companyOfferAmount: true,
        roomOfferAmount: true,
      },
    });
    if (!agreement) return sendErrorResponse(res, httpError(404, "notFound"));
    if (req.user.role === "ROOM" && Number(agreement.roomId) !== Number(req.user.roomId)) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }
    if (req.user.role === "COMPANY" && Number(agreement.companyId) !== Number(req.user.companyId)) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const status = String(agreement.status || "").toUpperCase();
    if (!["APPROVED", "ACTIVE"].includes(status)) {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_OPERATION_NOT_APPROVED", "Operasyon vardiyası yalnız kabul edilmiş sözleşmede hazırlanabilir."));
    }
    if (!agreement.vehicleId || !agreement.driverId) {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_ASSIGNMENT_REQUIRED", "Önce sözleşmeye araç ve sürücü ata."));
    }

    const fromYmd = String(agreement.startDate?.toISOString?.() || "").slice(0, 10);
    const toYmd = String(agreement.endDate?.toISOString?.() || "").slice(0, 10);
    const result = await generateAgreementShiftsOnce(io, {
      prismaClient: prisma,
      agreementIds: [id],
      fromYmd,
      toYmd,
    });
    const item = result?.byId?.[id] || null;
    if (item?.blocked) {
      return sendErrorResponse(res, httpError(409, item.blocked.code, item.blocked.message));
    }

    const createdShiftIds = Array.isArray(item?.createdShiftIds) ? item.createdShiftIds : [];
    const existingShiftIds = Array.isArray(item?.existingShiftIds) ? item.existingShiftIds : [];
    const skippedDates = Array.isArray(item?.skippedDates) ? item.skippedDates : [];
    if (!createdShiftIds.length && !existingShiftIds.length && skippedDates.length) {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_OPERATION_RESOURCE_CONFLICT", "Sözleşme dönemi için araç veya sürücü uygun değil."));
    }
    if (!createdShiftIds.length && !existingShiftIds.length) {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_OPERATION_DATE_MISSING", "Sözleşme döneminde planlı operasyon günü bulunamadı."));
    }

    await audit(req, {
      action: "AGREEMENT_OPERATION_SHIFTS_SYNCED",
      entity: "Agreement",
      entityId: agreement.id,
      meta: {
        sourceShiftId: item?.sourceShiftId || null,
        createdShiftIds,
        existingShiftIds,
        skippedDates,
        fromYmd,
        toYmd,
        vehicleId: agreement.vehicleId,
        driverId: agreement.driverId,
        companyOfferAmountMinor: agreement.companyOfferAmount,
        roomOfferAmountMinor: agreement.roomOfferAmount,
        idempotent: createdShiftIds.length === 0,
      },
    });
    broadcastAgreementUpdate(io, {
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      payload: { id: agreement.id, kind: "operationShiftsSynced", createdShiftIds, existingShiftIds },
    });

    return res.json({
      ok: true,
      agreementId: agreement.id,
      sourceShiftId: item?.sourceShiftId || null,
      createdShiftIds,
      existingShiftIds,
      skippedDates,
      idempotent: createdShiftIds.length === 0,
      amountMinor: agreement.roomOfferAmount ?? agreement.companyOfferAmount ?? null,
    });
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

    const sourceOffer = sourceShiftId > 0
      ? await prisma.shiftOffer.findFirst({
          where: { shiftId: sourceShiftId, roomId, status: "ACCEPTED" },
          orderBy: { id: "desc" },
        select: { id: true, amountCompany: true, amountRoom: true, noteRoom: true },
        })
      : null;
    const sourceCommercialFields = agreementCommercialFieldsFromSourceOffer({
      sourceOffer,
      companyOfferAmount: req.body.companyOfferAmount,
      companyOfferNote: req.body.companyOfferNote,
    });

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
            ...sourceCommercialFields,
          },
        });
        rows.push(row);
      }
      return rows;
    });

    for (const row of created) {
      await upsertAgreementCommercialBackbone(row.id, { sourceShiftId }).catch(() => null);
      await audit(req, {
        action: "AGREEMENT_CREATE",
        entity: "Agreement",
        entityId: row.id,
        meta: {
          sourceShiftId: sourceShiftId || null,
          sourceOfferId: sourceOffer?.id || null,
          companyId,
          roomId,
          companyOfferAmount: row.companyOfferAmount,
          roomOfferAmount: row.roomOfferAmount,
          sourceOfferAmountCompany: sourceOffer?.amountCompany ?? null,
          sourceOfferAmountRoom: sourceOffer?.amountRoom ?? null,
        },
      });
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

    const sourceOffer = sourceShiftId > 0
      ? await prisma.shiftOffer.findFirst({
          where: { shiftId: sourceShiftId, roomId, status: "ACCEPTED" },
          orderBy: { id: "desc" },
        select: { id: true, amountCompany: true, amountRoom: true, noteRoom: true },
        })
      : null;
    const sourceCommercialFields = agreementCommercialFieldsFromSourceOffer({
      sourceOffer,
      companyOfferAmount: req.body.companyOfferAmount,
      companyOfferNote: req.body.companyOfferNote,
    });

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
        ...sourceCommercialFields,
      },
    });

    await upsertAgreementCommercialBackbone(created.id, { sourceShiftId }).catch(() => null);
    await audit(req, {
      action: "AGREEMENT_CREATE",
      entity: "Agreement",
      entityId: created.id,
      meta: {
        sourceShiftId: sourceShiftId || null,
        sourceOfferId: sourceOffer?.id || null,
        companyId,
        roomId,
        companyOfferAmount: created.companyOfferAmount,
        roomOfferAmount: created.roomOfferAmount,
        sourceOfferAmountCompany: sourceOffer?.amountCompany ?? null,
        sourceOfferAmountRoom: sourceOffer?.amountRoom ?? null,
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

    const now = new Date();
    const firstStart = computeFirstStartAtUTC(ag);
    const nextStatus = now >= firstStart ? "ACTIVE" : "APPROVED";
    const approvalReplayKey = buildRoomAgreementApprovalReplayKey({
      agreementId: ag.id,
      vehicleId,
      driverId,
      finalStatus: nextStatus,
    });
    const previousApproval = await prisma.auditLog.findFirst({
      where: {
        entity: "Agreement",
        entityId: ag.id,
        action: "AGREEMENT_ROOM_APPROVED",
      },
      orderBy: { id: "desc" },
    });
    if (
      previousApproval?.meta?.replayKey === approvalReplayKey
      && String(ag.status || "").toUpperCase() === nextStatus
      && Number(ag.vehicleId || 0) === vehicleId
      && Number(ag.driverId || 0) === driverId
    ) {
      const hasRoomOfferAmount = Object.prototype.hasOwnProperty.call(req.body || {}, "roomOfferAmount");
      const hasRoomOfferNote = Object.prototype.hasOwnProperty.call(req.body || {}, "roomOfferNote");
      if (hasRoomOfferAmount || hasRoomOfferNote) {
        const replayUpdated = await prisma.agreement.update({
          where: { id: ag.id },
          data: {
            ...(hasRoomOfferAmount ? { roomOfferAmount: toInt(req.body.roomOfferAmount, null) } : {}),
            ...(hasRoomOfferNote ? { roomOfferNote: req.body.roomOfferNote ? String(req.body.roomOfferNote) : null } : {}),
          },
        });
        return res.json({ ...replayUpdated, idempotent: true });
      }
      return res.json({ ...ag, idempotent: true });
    }

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

    const updated = await prisma.agreement.update({
      where: { id: ag.id },
      data: {
        vehicleId,
        driverId,
        // NOTE: pricing pazarlığı M57 itibariyle Agreement seviyesinde yapılır.
        // roomOfferAmount/note burada opsiyonel bırakıldı (geriye dönük uyum).
        ...(Object.prototype.hasOwnProperty.call(req.body || {}, "roomOfferAmount")
          ? { roomOfferAmount: toInt(req.body.roomOfferAmount, null) }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(req.body || {}, "roomOfferNote")
          ? { roomOfferNote: req.body.roomOfferNote ? String(req.body.roomOfferNote) : null }
          : {}),
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
    await audit(req, {
      action: "AGREEMENT_ROOM_APPROVED",
      entity: "Agreement",
      entityId: updated.id,
      meta: buildRoomAgreementApprovalAuditMeta({
        agreementId: updated.id,
        roomId: updated.roomId,
        companyId: updated.companyId,
        vehicleId: updated.vehicleId,
        driverId: updated.driverId,
        finalStatus: updated.status,
        idempotent: false,
      }),
    });
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

    const hasCostedQuotePayload = [
      "quoteFloorDraftId",
      "quoteDraftVersion",
      "quoteContextHash",
    ].some((key) => Object.prototype.hasOwnProperty.call(req.body || {}, key));

    if (hasCostedQuotePayload) {
      const quoteFloorDraftId = Number(req.body.quoteFloorDraftId || 0);
      const draft = Number.isSafeInteger(quoteFloorDraftId) && quoteFloorDraftId > 0
        ? await prisma.roomQuoteFloorDraft.findUnique({ where: { id: quoteFloorDraftId } })
        : null;
      if (!draft) {
        return sendErrorResponse(res, httpError(404, "ROOM_QUOTE_FLOOR_DRAFT_NOT_FOUND", costedQuoteSendMessage("ROOM_QUOTE_FLOOR_DRAFT_NOT_FOUND")));
      }

      const snapshot = costedQuoteSnapshot(draft);
      const serviceContext = snapshot.serviceContext || {};
      const selection = {
        agreementId: id,
        shiftId: Number(serviceContext.shiftId || 0) || null,
        vehicleId: Number(serviceContext.vehicleId || 0) || null,
      };
      const previewUser = { ...req.user, roomId: ag.roomId };
      const context = await loadRoomFinancialContext(ag.roomId, previewUser, selection);
      const currentAgreement = context.latestAgreement || ag;
      const currentServiceContext = buildRoomQuoteDraftServiceContext({
        room: context.room,
        agreement: currentAgreement,
        latestShift: context.latestShift,
        planningSourceShift: context.planningSourceShift,
      });
      const currentPlanningInputs = snapshot.computed?.planningInputs && typeof snapshot.computed.planningInputs === "object"
        ? snapshot.computed.planningInputs
        : {};
      const currentDraftPreview = buildRoomQuoteDraftPreview({
        room: context.room,
        context,
        selection,
        requestInputs: currentPlanningInputs,
        role: req.user?.role,
        companyKind: req.user?.companyKind,
      });
      const currentPeriodPlanning = currentDraftPreview.periodPlanning;
      const currentPeriodQuoteFloorMinor = currentDraftPreview.periodFinancialPreview?.quoteFloor?.quoteFloorMinor
        ?? currentPeriodPlanning?.periodQuoteFloorMinor
        ?? null;
      const validation = validateCostedQuoteSendSnapshot({
        agreement: currentAgreement,
        draft,
        // A successful counter updates Agreement.updatedAt, which is part of the
        // historical draft hash. During a verified idempotent recovery, the
        // saved hash remains the correct commercial scope; the live period
        // planning checks below still guard movement count and economics.
        currentScopeHash: st === "COUNTERED"
          ? String(serviceContext.scopeHash || "")
          : (currentServiceContext?.scopeHash || ""),
        expectedVersion: req.body.quoteDraftVersion,
        expectedContextHash: req.body.quoteContextHash,
        currentPeriodPlanning,
        currentPeriodQuoteFloorMinor,
        requestedAmountMinor: roomOfferAmount,
        confirmed: req.body.confirmed === true,
        confirmationToken: req.body.confirmationToken,
        allowAlreadyCountered: st === "COUNTERED",
      });
      if (!validation.ok) {
        return sendErrorResponse(res, httpError(409, validation.code, costedQuoteSendMessage(validation.code)));
      }

      const replayKey = costedQuoteReplayKey({
        agreementId: validation.agreementId,
        draftId: validation.draftId,
        draftVersion: validation.draftVersion,
        quoteContextHash: validation.quoteContextHash,
        offerAmountMinor: validation.offerAmountMinor,
      });
      let transactionResult;
      try {
        transactionResult = await prisma.$transaction(async (tx) => {
          const freshAgreement = await tx.agreement.findUnique({ where: { id } });
          if (!freshAgreement) throw httpError(404, "notFound");

          if (String(freshAgreement.status || "").toUpperCase() === "COUNTERED") {
            const previous = await tx.auditLog.findMany({
              where: {
                entity: "Agreement",
                entityId: id,
                action: { in: ["ROOM_COSTED_QUOTE_SENT", "ROOM_COSTED_QUOTE_SEND_REPLAYED"] },
              },
              orderBy: { id: "desc" },
              take: 10,
            });
            const replay = previous.find((entry) => costedQuoteAuditMetaMatches(entry.meta, replayKey));
            if (!replay) {
              if (
                freshAgreement.roomOfferAmount !== validation.offerAmountMinor
                || (freshAgreement.roomOfferNote !== null && freshAgreement.roomOfferNote !== undefined && freshAgreement.roomOfferNote !== "")
              ) {
                throw httpError(409, "AGREEMENT_COUNTER_ALREADY_SENT", costedQuoteSendMessage("AGREEMENT_COUNTER_ALREADY_SENT"));
              }

              const recovered = await tx.agreement.update({
                where: { id },
                data: { roomOfferNote: buildCostedQuoteRoomOfferNote(validation) },
              });
              await tx.auditLog.create({
                data: {
                  actorUserId: req.user?.id || null,
                  actorRole: req.user?.role || null,
                  action: "ROOM_COSTED_QUOTE_SENT",
                  entity: "Agreement",
                  entityId: id,
                  meta: {
                    replayKey,
                    agreementId: id,
                    draftId: validation.draftId,
                    draftVersion: validation.draftVersion,
                    quoteContextHash: validation.quoteContextHash,
                    offerAmountMinor: validation.offerAmountMinor,
                    periodPlanningCostMinor: validation.periodPlanningCostMinor,
                    quoteFloorMinor: validation.quoteFloorMinor,
                    differenceToCostMinor: validation.differenceToCostMinor,
                    differenceToFloorMinor: validation.differenceToFloorMinor,
                    plannedMovementCount: validation.plannedMovementCount,
                    decision: validation.classification,
                    finalStatus: recovered.status,
                    idempotent: true,
                    recoveredFromExistingCounter: true,
                  },
                },
              });
              return { updated: recovered, idempotent: true, recovered: true };
            }

            await tx.auditLog.create({
              data: {
                actorUserId: req.user?.id || null,
                actorRole: req.user?.role || null,
                action: "ROOM_COSTED_QUOTE_SEND_REPLAYED",
                entity: "Agreement",
                entityId: id,
                meta: {
                  replayKey,
                  agreementId: id,
                  draftId: validation.draftId,
                  draftVersion: validation.draftVersion,
                  quoteContextHash: validation.quoteContextHash,
                  offerAmountMinor: validation.offerAmountMinor,
                  finalStatus: freshAgreement.status,
                  idempotent: true,
                },
              },
            });
            return { updated: freshAgreement, idempotent: true };
          }

          if (String(freshAgreement.status || "").toUpperCase() !== "REQUESTED") {
            throw httpError(409, "AGREEMENT_COUNTER_ALREADY_SENT", costedQuoteSendMessage("AGREEMENT_COUNTER_ALREADY_SENT"));
          }

          const freshDraft = await tx.roomQuoteFloorDraft.findUnique({ where: { id: validation.draftId } });
          if (!freshDraft || freshDraft.roomId !== freshAgreement.roomId || freshDraft.version !== validation.draftVersion) {
            throw httpError(409, "ROOM_QUOTE_SEND_STALE_DRAFT", costedQuoteSendMessage("ROOM_QUOTE_SEND_STALE_DRAFT"));
          }

          const changed = await tx.agreement.updateMany({
            where: {
              id,
              roomId: freshAgreement.roomId,
              status: "REQUESTED",
            },
            data: {
              roomOfferAmount,
              roomOfferNote: buildCostedQuoteRoomOfferNote(validation),
              status: "COUNTERED",
            },
          });
          if (changed.count !== 1) {
            throw httpError(409, "AGREEMENT_COUNTER_ALREADY_SENT", costedQuoteSendMessage("AGREEMENT_COUNTER_ALREADY_SENT"));
          }

          const updated = await tx.agreement.findUnique({ where: { id } });
          await tx.auditLog.create({
            data: {
              actorUserId: req.user?.id || null,
              actorRole: req.user?.role || null,
              action: "ROOM_COSTED_QUOTE_SENT",
              entity: "Agreement",
              entityId: id,
              meta: {
                replayKey,
                agreementId: id,
                draftId: validation.draftId,
                draftVersion: validation.draftVersion,
                quoteContextHash: validation.quoteContextHash,
                offerAmountMinor: validation.offerAmountMinor,
                periodPlanningCostMinor: validation.periodPlanningCostMinor,
                quoteFloorMinor: validation.quoteFloorMinor,
                differenceToCostMinor: validation.differenceToCostMinor,
                differenceToFloorMinor: validation.differenceToFloorMinor,
                plannedMovementCount: validation.plannedMovementCount,
                decision: validation.classification,
                finalStatus: updated?.status || "COUNTERED",
                idempotent: false,
              },
            },
          });
          return { updated, idempotent: false };
        });
      } catch (error) {
        return sendErrorResponse(res, error);
      }

      if (!transactionResult.idempotent) {
        await createAndEmitNotification({
          io,
          type: "AGREEMENT_COUNTERED",
          scope: "COMPANY",
          companyId: transactionResult.updated.companyId,
          roomId: transactionResult.updated.roomId,
          payload: {
            v: 1,
            kind: "agreement:countered",
            title: "Karşı teklif",
            message: `${agreementRef(transactionResult.updated.id)} • karşı teklif: ${offerSummary(transactionResult.updated.roomOfferAmount, transactionResult.updated.roomOfferNote)}`,
          },
          dedupeKey: `agreement:${transactionResult.updated.id}:counter`,
        });

        broadcastAgreementUpdate(io, {
          companyId: transactionResult.updated.companyId,
          roomId: transactionResult.updated.roomId,
          payload: { id: transactionResult.updated.id, kind: "countered" },
        });

        await upsertAgreementCommercialBackbone(transactionResult.updated.id).catch(() => null);
      }

      return res.status(transactionResult.idempotent ? 200 : 201).json({
        ...transactionResult.updated,
        idempotent: transactionResult.idempotent,
        costedQuote: {
          draftId: validation.draftId,
          draftVersion: validation.draftVersion,
          plannedMovementCount: validation.plannedMovementCount,
          periodPlanningCostMinor: validation.periodPlanningCostMinor,
          quoteFloorMinor: validation.quoteFloorMinor,
          offerAmountMinor: validation.offerAmountMinor,
          differenceToCostMinor: validation.differenceToCostMinor,
          differenceToFloorMinor: validation.differenceToFloorMinor,
          classification: validation.classification,
          warningText: validation.warningText,
        },
      });
    }

    if (st === "COUNTERED") {
      const priorCostedSend = await prisma.auditLog.findFirst({
        where: {
          entity: "Agreement",
          entityId: id,
          action: "ROOM_COSTED_QUOTE_SENT",
        },
        orderBy: { id: "desc" },
      });
      if (priorCostedSend) {
        return sendErrorResponse(res, httpError(409, "AGREEMENT_COUNTER_ALREADY_SENT", costedQuoteSendMessage("AGREEMENT_COUNTER_ALREADY_SENT")));
      }
    }

    const roomOfferNote = trimOrNull(req.body.roomOfferNote);

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        roomOfferAmount,
        roomOfferNote,
        status: "COUNTERED",
      },
    });

    await audit(req, {
      action: "ROOM_AGREEMENT_COUNTER",
      entity: "Agreement",
      entityId: updated.id,
      meta: {
        agreementId: updated.id,
        roomId: updated.roomId,
        companyId: updated.companyId,
        previousStatus: st,
        finalStatus: updated.status,
        roomOfferAmountMinor: updated.roomOfferAmount,
        roomOfferNote: updated.roomOfferNote,
        idempotent: false,
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
    try {
      const result = await executeCompanyAgreementDecision({ io, id, req, decision: "ACCEPT" });
      await upsertAgreementCommercialBackbone(id).catch(() => null);
      return res.status(result.idempotent ? 200 : 201).json({
        ...result.updated,
        idempotent: result.idempotent,
        agreementDecision: result.agreementDecision,
      });
    } catch (error) {
      return sendErrorResponse(res, error);
    }
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

    await audit(req, {
      action: "COMPANY_AGREEMENT_COUNTER",
      entity: "Agreement",
      entityId: updated.id,
      meta: {
        agreementId: updated.id,
        roomId: updated.roomId,
        companyId: updated.companyId,
        previousStatus: st,
        finalStatus: updated.status,
        companyOfferAmountMinor: updated.companyOfferAmount,
        companyOfferNote: updated.companyOfferNote,
        idempotent: false,
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
    try {
      const result = await executeCompanyAgreementDecision({ io, id, req, decision: "REJECT" });
      return res.status(result.idempotent ? 200 : 201).json({
        ...result.updated,
        idempotent: result.idempotent,
        agreementDecision: result.agreementDecision,
      });
    } catch (error) {
      return sendErrorResponse(res, error);
    }
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

    await audit(req, {
      action: "ROOM_AGREEMENT_REJECT",
      entity: "Agreement",
      entityId: updated.id,
      meta: {
        agreementId: updated.id,
        roomId: updated.roomId,
        companyId: updated.companyId,
        previousStatus: st,
        finalStatus: updated.status,
        idempotent: false,
      },
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

    await audit(req, {
      action: "AGREEMENT_CANCELLED",
      entity: "Agreement",
      entityId: updated.id,
      meta: {
        previousStatus: ag.status,
        companyId: updated.companyId,
        roomId: updated.roomId,
        vehicleId: updated.vehicleId,
        driverId: updated.driverId,
      },
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

