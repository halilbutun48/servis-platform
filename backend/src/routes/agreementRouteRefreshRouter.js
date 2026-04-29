// backend/src/routes/agreementRouteRefreshRouter.js
import express from "express";
import { prisma } from "../prisma.js";
import { broadcastAgreementUpdate } from "../services/agreementBroadcast.js";
import { upsertAgreementCommercialBackbone } from "../services/paymentBackbone.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { ymdTR } from "../time/tr.js";
import {
  createAgreementRouteRefreshRequest,
  decideAgreementRouteRefreshRequest,
  getAgreementRouteRefreshRequestById,
  getPendingAgreementRouteRefreshRequest,
  listAgreementRouteRefreshRequests,
  updateAgreementRouteRefreshRequest,
} from "../services/agreementRouteRefreshStore.js";
import { createAndEmitNotification } from "../notifications/service.js";
import {
  agreementRef,
  routeRefreshRef,
} from "../services/agreementCopy.js";
import {
  emitAgreementNotification,
  offerSummary,
  parseOfferAmount,
  parseOfferAmountNullable,
  parseRouteRefreshDecision,
  routeRefreshWindowSummary,
  trimOrNull,
} from "./agreementsHelpers.js";

export function buildAgreementRouteRefreshRouter(io) {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), requireStepUpWrite("COMPANY", "ROOM", "SUPER_ADMIN"));

  r.get("/route-refresh", async (req, res) => {
    const agreementId = Number(req.query.agreementId || 0);
    const status = String(req.query.status || "").trim().toUpperCase();
    const filters = {};
    if (agreementId > 0) filters.agreementId = agreementId;
    if (status) filters.status = status;
    if (req.user.role === "COMPANY") filters.companyId = req.user.companyId ?? -1;
    if (req.user.role === "ROOM") filters.roomId = req.user.roomId ?? -1;
    const items = await listAgreementRouteRefreshRequests(filters);
    res.json({ items });
  });

  r.post("/:id/route-refresh-request", async (req, res) => {
    const agreementId = Number(req.params.id || 0);
    if (!agreementId) return sendErrorResponse(res, httpError(400, "agreementId required"));

    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        companyId: true,
        roomId: true,
        status: true,
        weekMask: true,
        startMin: true,
        endMin: true,
        direction: true,
        pattern: true,
        hubLat: true,
        hubLng: true,
      },
    });
    if (!agreement) return sendErrorResponse(res, httpError(404, "notFound"));
    if (Number(agreement.companyId || 0) !== Number(req.user.companyId || 0)) return sendErrorResponse(res, httpError(403, "Forbidden"));

    const agreementStatus = String(agreement.status || "").toUpperCase();
    if (!["APPROVED", "ACTIVE"].includes(agreementStatus)) {
      return sendErrorResponse(res, httpError(409, "AGREEMENT_INVALID_STATE", "Rota güncelleme sadece kabul edilmiş / aktif sözleşmede açılır."));
    }

    const pending = await getPendingAgreementRouteRefreshRequest(agreementId);
    if (pending) {
      return sendErrorResponse(res, httpError(409, "ROUTE_REFRESH_PENDING", "Bu sözleşme için zaten bekleyen rota güncelleme teklifi var."));
    }

    const roomId = Number(req.body?.roomId || agreement.roomId || 0);
    const sourceShiftId = Number(req.body?.sourceShiftId || 0);
    const draftShiftIds = Array.from(new Set((Array.isArray(req.body?.draftShiftIds) ? req.body.draftShiftIds : []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
    if (!roomId || Number(roomId) !== Number(agreement.roomId || 0)) {
      return sendErrorResponse(res, httpError(400, "ROOM_REQUIRED", "Rota güncelleme aynı sözleşme odasına gitmelidir."));
    }
    if (sourceShiftId <= 0) {
      return sendErrorResponse(res, httpError(400, "SOURCE_SHIFT_REQUIRED", "Kaynak vardiya olmadan rota güncelleme teklifi açılamaz."));
    }
    if (!draftShiftIds.length) {
      return sendErrorResponse(res, httpError(400, "DRAFT_SHIFT_REQUIRED", "Önce taslak vardiyaları oluştur."));
    }

    const draftShifts = await prisma.shift.findMany({
      where: {
        id: { in: draftShiftIds },
        companyId: req.user.companyId ?? -1,
        status: "DRAFT",
      },
      select: {
        id: true,
        roomId: true,
        agreementId: true,
        startAt: true,
        endAt: true,
        direction: true,
        pattern: true,
        hubLat: true,
        hubLng: true,
        _count: { select: { stops: true, people: true } },
      },
    });
    if (draftShifts.length !== draftShiftIds.length) {
      return sendErrorResponse(res, httpError(400, "DRAFT_SHIFT_INVALID", "Taslak vardiyaların tamamı bulunamadı."));
    }

    const invalidRoom = draftShifts.find((shift) => shift.roomId != null && Number(shift.roomId) !== Number(roomId));
    if (invalidRoom) {
      return sendErrorResponse(res, httpError(400, "DRAFT_SHIFT_ROOM_MISMATCH", "Taslak vardiyalar seçilen oda ile aynı olmalı."));
    }
    const linkedElsewhere = draftShifts.find((shift) => Number(shift.agreementId || 0) > 0 && Number(shift.agreementId || 0) !== agreementId);
    if (linkedElsewhere) {
      return sendErrorResponse(res, httpError(400, "DRAFT_SHIFT_ALREADY_LINKED", "Bazı taslak vardiyalar başka sözleşmeye bağlı."));
    }

    const ordered = [...draftShifts].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const firstShift = ordered[0] || null;
    const lastShift = ordered[ordered.length - 1] || null;
    const companyOfferAmount = parseOfferAmountNullable(req.body?.companyOfferAmount ?? req.body?.amountCompany);
    if (String(req.body?.companyOfferAmount ?? req.body?.amountCompany ?? "").trim() && companyOfferAmount == null) {
      return sendErrorResponse(res, httpError(400, "companyOfferAmount invalid (>0)"));
    }
    const companyOfferNote = trimOrNull(req.body?.companyOfferNote ?? req.body?.noteCompany);

    const created = await createAgreementRouteRefreshRequest({
      agreementId,
      companyId: agreement.companyId,
      roomId,
      sourceShiftId,
      draftShiftIds,
      shiftCount: draftShiftIds.length,
      peopleCount: Math.max(0, ...ordered.map((shift) => Number(shift?._count?.people || 0))),
      stopCount: Math.max(0, ...ordered.map((shift) => Number(shift?._count?.stops || 0))),
      startDate: firstShift ? ymdTR(firstShift.startAt) : null,
      endDate: lastShift ? ymdTR(lastShift.endAt) : null,
      weekMask: Number(agreement.weekMask || 0),
      startMin: Number(agreement.startMin || 0),
      endMin: Number(agreement.endMin || 0),
      direction: agreement.direction,
      pattern: agreement.pattern,
      hubLat: agreement.hubLat,
      hubLng: agreement.hubLng,
      priorAgreementAmount: agreement.companyOfferAmount ?? null,
      priorAgreementNote: agreement.companyOfferNote ?? null,
      companyOfferAmount,
      companyOfferNote,
      initialCompanyOfferAmount: companyOfferAmount,
      initialCompanyOfferNote: companyOfferNote,
    });

    await emitAgreementNotification(io, {
      type: "AGREEMENT_ROUTE_REFRESH_REQUESTED",
      scope: "ROOM",
      roomId: agreement.roomId,
      companyId: agreement.companyId,
      kind: "agreement:routeRefreshRequested",
      title: "Rota güncelleme teklifi",
      message: `${agreementRef(agreement.id)} • ${routeRefreshWindowSummary(created)}`,
      dedupeKey: `agreement:${agreement.id}:routeRefresh:${created.id}`,
    });

    broadcastAgreementUpdate(io, {
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      payload: { id: agreement.id, kind: "routeRefreshRequested", routeRefreshRequestId: created.id },
    });

    return res.status(201).json({ ok: true, item: created });
  });

  r.put("/route-refresh/:requestId/counter", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const requestId = Number(req.params.requestId || 0);
    if (requestId <= 0) return sendErrorResponse(res, httpError(400, "requestId required"));

    const currentItem = await getAgreementRouteRefreshRequestById(requestId);
    if (!currentItem) return sendErrorResponse(res, httpError(404, "ROUTE_REFRESH_NOT_FOUND", "Rota güncelleme talebi bulunamadı."));
    if (!["PENDING", "COUNTERED"].includes(String(currentItem.status || "").toUpperCase())) {
      return sendErrorResponse(res, httpError(409, "ROUTE_REFRESH_COUNTER_INVALID_STATE", "Bu talep için artık karşı teklif verilemez."));
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: Number(currentItem.agreementId || 0) },
      select: { id: true, companyId: true, roomId: true, companyOfferAmount: true, companyOfferNote: true },
    });
    if (!agreement) return sendErrorResponse(res, httpError(404, "AGREEMENT_NOT_FOUND", "Sözleşme bulunamadı."));
    if (req.user.role === "ROOM" && Number(agreement.roomId || 0) !== Number(req.user.roomId || 0)) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const roomCounterAmount = parseOfferAmount(req.body?.roomCounterAmount ?? req.body?.roomOfferAmount ?? req.body?.amount);
    if (roomCounterAmount == null) {
      return sendErrorResponse(res, httpError(400, "ROOM_COUNTER_AMOUNT_REQUIRED", "Karşı teklif tutarı gerekli (>0)."));
    }
    const roomCounterNote = trimOrNull(req.body?.roomCounterNote ?? req.body?.roomOfferNote ?? req.body?.note);

    const updated = await updateAgreementRouteRefreshRequest({
      requestId,
      patch: {
        status: "COUNTERED",
        roomCounterAmount,
        roomCounterNote,
      },
    });
    if (!updated) return sendErrorResponse(res, httpError(500, "ROUTE_REFRESH_STORE_UPDATE_FAILED", "Karşı teklif kaydedilemedi."));

    await emitAgreementNotification(io, {
      type: "AGREEMENT_ROUTE_REFRESH_COUNTERED",
      scope: "COMPANY",
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      kind: "agreement:routeRefreshCountered",
      title: "Rota güncelleme karşı teklifi",
      message: `${agreementRef(agreement.id)} • ${routeRefreshRef(updated.id)} • oda karşı teklifi: ${offerSummary(updated.roomCounterAmount, updated.roomCounterNote)}`,
      dedupeKey: `agreement:${agreement.id}:routeRefresh:${updated.id}:counter:${updated.roomCounterAmount ?? "X"}`,
    });

    broadcastAgreementUpdate(io, {
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      payload: { id: agreement.id, kind: "routeRefreshCountered", routeRefreshRequestId: updated.id },
    });
    return res.json({ ok: true, item: updated });
  });

  r.put("/route-refresh/:requestId/accept-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const requestId = Number(req.params.requestId || 0);
    if (requestId <= 0) return sendErrorResponse(res, httpError(400, "requestId required"));

    const currentItem = await getAgreementRouteRefreshRequestById(requestId);
    if (!currentItem) return sendErrorResponse(res, httpError(404, "ROUTE_REFRESH_NOT_FOUND", "Rota güncelleme talebi bulunamadı."));
    if (String(currentItem.status || "").toUpperCase() !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "ROUTE_REFRESH_COUNTER_NOT_PENDING", "Karşı teklif kabul edilemez durumda."));
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: Number(currentItem.agreementId || 0) },
      select: {
        id: true,
        companyId: true,
        roomId: true,
        status: true,
        vehicleId: true,
        driverId: true,
        companyOfferAmount: true,
        companyOfferNote: true,
      },
    });
    if (!agreement) return sendErrorResponse(res, httpError(404, "AGREEMENT_NOT_FOUND", "Sözleşme bulunamadı."));
    if (Number(agreement.companyId || 0) !== Number(req.user.companyId || 0)) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }
    const effectiveAmount = currentItem.roomCounterAmount;
    if (effectiveAmount == null) {
      return sendErrorResponse(res, httpError(409, "ROUTE_REFRESH_COUNTER_MISSING", "Oda karşı teklifi bulunamadı."));
    }

    let updatedAgreement = agreement;
    let acceptedSourceShiftId = 0;
    try {
      const result = await applyAcceptedRouteRefresh({
        agreement,
        currentItem,
        effectiveAmount,
        effectiveNote: currentItem.roomCounterNote ?? currentItem.companyOfferNote ?? agreement.companyOfferNote ?? null,
      });
      updatedAgreement = result.agreement || agreement;
      acceptedSourceShiftId = Number(result.sourceShiftId || 0);
    } catch (error) {
      return sendErrorResponse(res, error);
    }

    const nextItem = await decideAgreementRouteRefreshRequest({
      requestId,
      status: "ACCEPTED",
      patch: {
        finalAcceptedAmount: effectiveAmount,
        finalAcceptedNote: currentItem.roomCounterNote ?? null,
        finalAcceptedSource: "ROOM_COUNTER",
      },
    });
    if (!nextItem) return sendErrorResponse(res, httpError(500, "ROUTE_REFRESH_STORE_UPDATE_FAILED", "Karşı teklif kabulü kaydedilemedi."));

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_ROUTE_REFRESH_COUNTER_ACCEPTED",
      scope: "ROOM",
      companyId: updatedAgreement.companyId,
      roomId: updatedAgreement.roomId,
      payload: {
        v: 1,
        kind: "agreement:routeRefreshCounterAccepted",
        title: "Rota güncelleme karşı teklifi kabul edildi",
        message: `${agreementRef(updatedAgreement.id)} • ${routeRefreshRef(nextItem.id)} • final ücret: ${offerSummary(nextItem.finalAcceptedAmount, nextItem.finalAcceptedNote)}`,
      },
      dedupeKey: `agreement:${updatedAgreement.id}:routeRefresh:${nextItem.id}:counterAccepted:${nextItem.finalAcceptedAmount ?? "X"}`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updatedAgreement.companyId,
      roomId: updatedAgreement.roomId,
      payload: {
        id: updatedAgreement.id,
        kind: "routeRefreshCounterAccepted",
        routeRefreshRequestId: nextItem.id,
        sourceShiftId: acceptedSourceShiftId || undefined,
      },
    });

    return res.json({ ok: true, item: nextItem, agreement: updatedAgreement, sourceShiftId: acceptedSourceShiftId || null });
  });

  r.put("/route-refresh/:requestId/reject-counter", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const requestId = Number(req.params.requestId || 0);
    if (requestId <= 0) return sendErrorResponse(res, httpError(400, "requestId required"));

    const currentItem = await getAgreementRouteRefreshRequestById(requestId);
    if (!currentItem) return sendErrorResponse(res, httpError(404, "ROUTE_REFRESH_NOT_FOUND", "Rota güncelleme talebi bulunamadı."));
    if (String(currentItem.status || "").toUpperCase() !== "COUNTERED") {
      return sendErrorResponse(res, httpError(409, "ROUTE_REFRESH_COUNTER_NOT_PENDING", "Karşı teklif reddedilemez durumda."));
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: Number(currentItem.agreementId || 0) },
      select: { id: true, companyId: true, roomId: true },
    });
    if (!agreement) return sendErrorResponse(res, httpError(404, "AGREEMENT_NOT_FOUND", "Sözleşme bulunamadı."));
    if (Number(agreement.companyId || 0) !== Number(req.user.companyId || 0)) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }

    const updated = await updateAgreementRouteRefreshRequest({
      requestId,
      patch: {
        status: "PENDING",
        roomCounterAmount: null,
        roomCounterNote: null,
      },
    });
    if (!updated) return sendErrorResponse(res, httpError(500, "ROUTE_REFRESH_STORE_UPDATE_FAILED", "Karşı teklif reddi kaydedilemedi."));

    await createAndEmitNotification({
      io,
      type: "AGREEMENT_ROUTE_REFRESH_COUNTER_REJECTED",
      scope: "ROOM",
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      payload: {
        v: 1,
        kind: "agreement:routeRefreshCounterRejected",
        title: "Rota güncelleme karşı teklifi reddedildi",
        message: `${agreementRef(agreement.id)} • ${routeRefreshRef(updated.id)} • şirket ilk teklifine dönüldü`,
      },
      dedupeKey: `agreement:${agreement.id}:routeRefresh:${updated.id}:counterRejected`,
    });

    broadcastAgreementUpdate(io, {
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      payload: { id: agreement.id, kind: "routeRefreshCounterRejected", routeRefreshRequestId: updated.id },
    });
    return res.json({ ok: true, item: updated });
  });

  async function applyAcceptedRouteRefresh({ agreement, currentItem, effectiveAmount, effectiveNote }) {
    const result = await prisma.$transaction(async (tx) => {
      const freshAgreement = await tx.agreement.findUnique({
        where: { id: agreement.id },
        select: {
          id: true,
          companyId: true,
          roomId: true,
          status: true,
          vehicleId: true,
          driverId: true,
          companyOfferAmount: true,
          companyOfferNote: true,
        },
      });
      if (!freshAgreement) throw httpError(404, "AGREEMENT_NOT_FOUND", "Sözleşme bulunamadı.");
      const agreementStatus = String(freshAgreement.status || "").toUpperCase();
      if (!["APPROVED", "ACTIVE"].includes(agreementStatus)) {
        throw httpError(409, "AGREEMENT_INVALID_STATE", "Rota güncelleme sadece aktif / kabul edilmiş sözleşmede uygulanır.");
      }

      const draftIds = Array.from(new Set((Array.isArray(currentItem.draftShiftIds) ? currentItem.draftShiftIds : []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
      if (!draftIds.length) throw httpError(400, "DRAFT_SHIFT_REQUIRED", "Taslak vardiya bulunamadı.");

      const draftRowsRaw = await tx.shift.findMany({
        where: {
          id: { in: draftIds },
          companyId: freshAgreement.companyId,
          status: "DRAFT",
        },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          roomId: true,
          agreementId: true,
        },
      });
      if (draftRowsRaw.length !== draftIds.length) {
        throw httpError(409, "DRAFT_SHIFT_INVALID", "Taslak vardiyaların tamamı bulunamadı veya artık geçerli değil.");
      }
      const invalidRoom = draftRowsRaw.find((row) => row.roomId != null && Number(row.roomId) !== Number(freshAgreement.roomId || 0));
      if (invalidRoom) {
        throw httpError(409, "DRAFT_SHIFT_ROOM_MISMATCH", "Taslak vardiyaların oda bağlamı geçersiz.");
      }
      const linkedElsewhere = draftRowsRaw.find((row) => Number(row.agreementId || 0) > 0 && Number(row.agreementId || 0) !== Number(freshAgreement.id || 0));
      if (linkedElsewhere) {
        throw httpError(409, "DRAFT_SHIFT_ALREADY_LINKED", "Bazı taslak vardiyalar başka sözleşmeye bağlı.");
      }
      const draftById = Object.fromEntries(draftRowsRaw.map((row) => [Number(row.id), row]));
      const draftRows = draftIds.map((id) => draftById[Number(id)]).filter(Boolean);
      const startIsoList = draftRows.map((row) => new Date(row.startAt).toISOString());
      const existingRows = startIsoList.length
        ? await tx.shift.findMany({
            where: {
              agreementId: freshAgreement.id,
              startAt: { in: startIsoList.map((iso) => new Date(iso)) },
            },
            select: { id: true, startAt: true, status: true },
          })
        : [];
      const now = new Date();
      const blocking = existingRows.find((row) => {
        const st = String(row.status || "").toUpperCase();
        if (!["ACTIVE", "DONE"].includes(st)) return false;
        const ts = new Date(row.startAt).getTime();
        return Number.isFinite(ts) && ts <= now.getTime();
      });
      if (blocking) {
        throw httpError(409, "ROUTE_REFRESH_LIVE_SHIFT_CONFLICT", `Başlamış vardiya bulundu (#${blocking.id}). Önce canlı vardiya penceresi bitsin.`);
      }

      const obsoleteIds = existingRows.map((row) => Number(row.id)).filter((id) => id > 0);
      if (obsoleteIds.length) {
        await tx.shift.updateMany({
          where: { id: { in: obsoleteIds } },
          data: { agreementId: null, status: "REJECTED" },
        });
      }

      for (const row of draftRows) {
        const nextStatus = new Date(row.startAt).getTime() <= now.getTime() ? "ACTIVE" : "APPROVED";
        await tx.shift.update({
          where: { id: row.id },
          data: {
            agreementId: freshAgreement.id,
            status: nextStatus,
            roomId: freshAgreement.roomId,
            vehicleId: freshAgreement.vehicleId ?? null,
            driverId: freshAgreement.driverId ?? null,
          },
        });
      }

      const nextAgreementData = {};
      if (effectiveAmount != null) nextAgreementData.companyOfferAmount = Number(effectiveAmount);
      if (effectiveNote != null) nextAgreementData.companyOfferNote = effectiveNote;
      const nextAgreement = Object.keys(nextAgreementData).length
        ? await tx.agreement.update({ where: { id: freshAgreement.id }, data: nextAgreementData })
        : await tx.agreement.findUnique({ where: { id: freshAgreement.id } });

      const acceptedRootId = Number(draftRows[0]?.id || 0);
      await upsertAgreementCommercialBackbone(freshAgreement.id, { tx, sourceShiftId: acceptedRootId }).catch(() => null);
      return { agreement: nextAgreement || freshAgreement, sourceShiftId: acceptedRootId };
    });
    return result;
  }

  r.put("/route-refresh/:requestId/decision", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const requestId = Number(req.params.requestId || 0);
    if (requestId <= 0) return sendErrorResponse(res, httpError(400, "requestId required"));

    const decision = parseRouteRefreshDecision(req.body?.decision ?? req.body?.status ?? req.body?.action);
    if (!decision) return sendErrorResponse(res, httpError(400, "ROUTE_REFRESH_DECISION_REQUIRED", "Karar gerekli: ACCEPT veya CANCEL."));

    const currentItem = await getAgreementRouteRefreshRequestById(requestId);
    if (!currentItem) return sendErrorResponse(res, httpError(404, "ROUTE_REFRESH_NOT_FOUND", "Rota güncelleme talebi bulunamadı."));
    if (!["PENDING", "COUNTERED"].includes(String(currentItem.status || "").toUpperCase())) {
      return sendErrorResponse(res, httpError(409, "ROUTE_REFRESH_ALREADY_DECIDED", `Bu talep zaten ${String(currentItem.status || "-").toUpperCase()} durumunda.`));
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: Number(currentItem.agreementId || 0) },
      select: {
        id: true,
        companyId: true,
        roomId: true,
        status: true,
        vehicleId: true,
        driverId: true,
        companyOfferAmount: true,
        companyOfferNote: true,
      },
    });
    if (!agreement) return sendErrorResponse(res, httpError(404, "AGREEMENT_NOT_FOUND", "Sözleşme bulunamadı."));
    if (req.user.role === "ROOM" && Number(agreement.roomId || 0) !== Number(req.user.roomId || 0)) {
      return sendErrorResponse(res, httpError(403, "Forbidden"));
    }
    if (Number(currentItem.roomId || 0) !== Number(agreement.roomId || 0)) {
      return sendErrorResponse(res, httpError(409, "ROUTE_REFRESH_ROOM_MISMATCH", "Talep oda bağlamı bozulmuş."));
    }

    let updatedAgreement = agreement;
    let acceptedSourceShiftId = 0;

    if (decision === "ACCEPTED") {
      try {
        const result = await applyAcceptedRouteRefresh({
          agreement,
          currentItem,
          effectiveAmount: currentItem.companyOfferAmount ?? agreement.companyOfferAmount ?? null,
          effectiveNote: currentItem.companyOfferNote ?? agreement.companyOfferNote ?? null,
        });
        updatedAgreement = result.agreement || agreement;
        acceptedSourceShiftId = Number(result.sourceShiftId || 0);
      } catch (error) {
        return sendErrorResponse(res, error);
      }
    }

    const nextItem = await decideAgreementRouteRefreshRequest({ requestId, status: decision, patch: decision === "ACCEPTED" ? {
      finalAcceptedAmount: currentItem.companyOfferAmount ?? agreement.companyOfferAmount ?? null,
      finalAcceptedNote: currentItem.companyOfferNote ?? agreement.companyOfferNote ?? null,
      finalAcceptedSource: "COMPANY_OFFER",
    } : {} });
    if (!nextItem) return sendErrorResponse(res, httpError(500, "ROUTE_REFRESH_STORE_UPDATE_FAILED", "Rota güncelleme talebi kaydedilemedi."));

    const notifyType = decision === "ACCEPTED" ? "AGREEMENT_ROUTE_REFRESH_ACCEPTED" : "AGREEMENT_ROUTE_REFRESH_CANCELLED";
    const notifyTitle = decision === "ACCEPTED" ? "Rota güncelleme kabul edildi" : "Rota güncelleme iptal edildi";
    const notifyMessage = decision === "ACCEPTED"
      ? `${agreementRef(updatedAgreement.id)} • ${routeRefreshRef(nextItem.id)} kabul edildi`
      : `${agreementRef(updatedAgreement.id)} • ${routeRefreshRef(nextItem.id)} iptal edildi`;

    await emitAgreementNotification(io, {
      type: notifyType,
      scope: "COMPANY",
      companyId: updatedAgreement.companyId,
      roomId: updatedAgreement.roomId,
      kind: decision === "ACCEPTED" ? "agreement:routeRefreshAccepted" : "agreement:routeRefreshCancelled",
      title: notifyTitle,
      message: notifyMessage,
      dedupeKey: `agreement:${updatedAgreement.id}:routeRefresh:${nextItem.id}:${decision}`,
    });

    broadcastAgreementUpdate(io, {
      companyId: updatedAgreement.companyId,
      roomId: updatedAgreement.roomId,
      payload: {
        id: updatedAgreement.id,
        kind: decision === "ACCEPTED" ? "routeRefreshAccepted" : "routeRefreshCancelled",
        routeRefreshRequestId: nextItem.id,
        sourceShiftId: acceptedSourceShiftId || undefined,
      },
    });

    return res.json({ ok: true, item: nextItem, agreement: updatedAgreement, sourceShiftId: acceptedSourceShiftId || null });
  });

  // ✅ M59: SHIFT STATS (for UI clarity)
  // Body: { agreementIds: number[], horizonDays?: number }
  // Returns: { byId: { [id]: { todayTotal, todayDone, horizonOpen } } }

  return r;
}
