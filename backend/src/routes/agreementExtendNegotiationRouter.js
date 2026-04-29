import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { ymdTR } from "../time/tr.js";
import { computeFirstStartAtUTC } from "../services/agreementConflict.js";
import { findReservationConflictForAgreement } from "../services/reservationConflict.js";
import { agreementRef } from "../services/agreementCopy.js";
import { upsertAgreementCommercialBackbone } from "../services/paymentBackbone.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { parseDateOnly, parseOfferAmount, parseOfferAmountNullable, trimOrNull, offerSummary } from "./agreementsHelpers.js";

function ymdOfDateOnly(d) {
  try {
    return ymdTR(d);
  } catch {
    return "";
  }
}

async function assertNoExtendConflictOr409(ag, proposedEndDate, res) {
  if (!ag.vehicleId && !ag.driverId) return true;

  const conflict = await findReservationConflictForAgreement({
    agreementId: ag.id,
    vehicleId: ag.vehicleId ?? undefined,
    driverId: ag.driverId ?? undefined,
    startDate: ag.startDate,
    endDate: proposedEndDate,
    weekMask: ag.weekMask,
    startMin: ag.startMin,
    endMin: ag.endMin,
  });
  if (conflict) {
    res.status(409).json(conflict);
    return false;
  }
  return true;
}

function computeReactivatedStatus(ag) {
  const now = new Date();
  const firstStart = computeFirstStartAtUTC(ag);
  return now >= firstStart ? "ACTIVE" : "APPROVED";
}

export function buildAgreementExtendNegotiationRouter(io) {
  const r = express.Router();

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
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.extendRequestedEndDate)} • teklif: ${offerSummary(offerAmount, offerNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendReq:${ymdOfDateOnly(updated.extendRequestedEndDate)}`,
    });

    return res.json(updated);
  });

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
          message: `${agreementRef(updated.id)} uzatma teklifi reddedildi.`,
        },
        dedupeKey: `agreement:${updated.id}:extendRejected:${Date.now()}`,
      });

      return res.json(updated);
    }

    const proposedEndDate = ag.extendRequestedEndDate;
    const ok = await assertNoExtendConflictOr409(ag, proposedEndDate, res);
    if (!ok) return;

    const offerAmount = ag.extendOfferAmount;
    const offerNote = ag.extendOfferNote;
    const nextStatus = String(ag.status || "").toUpperCase() === "DONE" ? computeReactivatedStatus(ag) : ag.status;

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        endDate: proposedEndDate,
        status: nextStatus,
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
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.endDate)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendAccepted:${ymdOfDateOnly(updated.endDate)}`,
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    return res.json(updated);
  });

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
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.extendRequestedEndDate)} • karşı teklif: ${offerSummary(updated.extendCounterAmount, updated.extendCounterNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounter:${ymdOfDateOnly(updated.extendRequestedEndDate)}:${updated.extendCounterAmount}`,
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    return res.json(updated);
  });

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

    const nextStatus = String(ag.status || "").toUpperCase() === "DONE" ? computeReactivatedStatus(ag) : ag.status;

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
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.endDate)} • yeni teklif: ${updated.companyOfferAmount ?? "-"}`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounterAccepted:${ymdOfDateOnly(updated.endDate)}:${updated.companyOfferAmount ?? "X"}`,
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    return res.json(updated);
  });

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
        message: `${agreementRef(updated.id)} - uzatma teklifi hâlâ beklemede. İstersen kabul et veya yeni karşı teklif gönder.`,
      },
      dedupeKey: `agreement:${updated.id}:extendCounterRejected:${Date.now()}`,
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    return res.json(updated);
  });

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
        message: `${agreementRef(updated.id)} • yeni bitiş: ${ymdOfDateOnly(updated.extendRequestedEndDate)} • teklif: ${offerSummary(offerAmount, offerNote)}`,
      },
      dedupeKey: `agreement:${updated.id}:extendReq:${ymdOfDateOnly(updated.extendRequestedEndDate)}`,
    });

    await upsertAgreementCommercialBackbone(updated.id).catch(() => null);
    return res.json(updated);
  });

  return r;
}
