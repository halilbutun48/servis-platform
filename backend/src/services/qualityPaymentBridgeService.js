import { prisma } from "../prisma.js";
import { buildAgreementOpsBridgeById } from "./agreementOpsBridge.js";
import { buildAgreementShiftStats } from "./agreementShiftStats.js";
import { buildOperationProofSummary } from "../ops/operationProof.js";
import { buildQualityProofSignalSummary } from "../ops/qualityProofSignals.js";
import { buildQualityDraftScore } from "../ops/qualityDraftScore.js";
import {
  QUALITY_REVIEW_STATUSES,
  buildQualityReviewDecisionSummary,
} from "../ops/qualityReviewDecision.js";
import { findLatestQualityReviewDecisionRecord, readQualityReviewDecisionRecords } from "../ops/qualityReviewDecisionStore.js";
import { readOperationVerificationRecords } from "../ops/operationVerificationRecordStore.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { resolveGpsSourceVisibility } from "../gps/sourceVisibility.js";

const HIDDEN_CHECKLIST_IDS = new Set([
  "COMPANY_VISIBLE",
  "ROOM_VISIBLE",
  "SCHOOL_VISIBLE",
  "PARENT_PERSONEL_VISIBLE",
]);

function compactText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || String(fallback || "").trim();
}

function compactList(items = [], limit = 6) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const text = compactText(item, "");
    if (!text) continue;
    const key = text.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function upper(value, fallback = "") {
  const v = String(value || fallback).trim().toUpperCase();
  return v || fallback;
}

function formatAgreementLabel(agreement = null) {
  const id = Number(agreement?.id || 0);
  if (!id) return "Sözleşme";
  return `Sözleşme #${id}`;
}

function scopeKeysForAgreement(agreement = null) {
  return compactList([
    Number(agreement?.roomId || 0) > 0 ? `room:${Number(agreement.roomId)}` : "",
    Number(agreement?.companyId || 0) > 0 ? `company:${Number(agreement.companyId)}` : "",
    "global",
  ], 4);
}

function normalizeManualNoteRecord(record = {}) {
  return {
    note: compactText(record?.note || record?.message || record?.text || "", ""),
    updatedAt: record?.updatedAt || record?.createdAt || null,
    checkId: compactText(record?.checkId || "", ""),
    proofType: compactText(record?.proofType || "", ""),
  };
}

function collectAgreementManualNotes(records = [], agreement = null) {
  const scopeKeys = scopeKeysForAgreement(agreement);
  if (!scopeKeys.length) return [];

  return (Array.isArray(records) ? records : [])
    .filter((record) => {
      const checkId = compactText(record?.checkId || "", "");
      if (!checkId.startsWith("OPERATION_PROOF_MANUAL_NOTE:")) return false;
      return scopeKeys.some((scopeKey) => checkId.startsWith(`OPERATION_PROOF_MANUAL_NOTE:${scopeKey}:`));
    })
    .sort((a, b) => String(b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.updatedAt || a?.createdAt || "")))
    .map((record) => normalizeManualNoteRecord(record))
    .filter((item) => Boolean(item.note));
}

function mapAgreementReviewStatus(reviewRecord = null) {
  const status = upper(reviewRecord?.reviewStatus || "", "");
  if (status === QUALITY_REVIEW_STATUSES.REVIEWED) return QUALITY_REVIEW_STATUSES.REVIEWED;
  if (status === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK) return QUALITY_REVIEW_STATUSES.NEEDS_RECHECK;
  if (status === QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW) return QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW;
  return QUALITY_REVIEW_STATUSES.REVIEW_PENDING;
}

function buildShiftSignalCounts(shifts = []) {
  const counts = {
    shiftStartedCount: 0,
    shiftCompletedCount: 0,
    gpsSeenCount: 0,
    driverPhoneGpsSeenCount: 0,
    vehicleGpsSeenCount: 0,
    boardingRecordedCount: 0,
    noBoardRecordedCount: 0,
    etaAvailableCount: 0,
    manualOperatorNoteCount: 0,
  };

  for (const shift of Array.isArray(shifts) ? shifts : []) {
    const status = upper(shift?.status || "", "");
    const gpsLastAt = shift?.vehicle?.gpsLast?.at || null;
    const gpsFreshness = gpsLastAt ? gpsStatusFromAt(gpsLastAt) : { status: "OFFLINE", ageSec: null };
    const sourceKey = upper(shift?.vehicle?.gpsState?.lastSource || "", "") || "BACKEND_VEHICLE_GPS";
    const sourceVisibility = resolveGpsSourceVisibility({
      officialSourceKey: sourceKey,
      freshness: gpsFreshness.status,
      hasActiveShift: status === "ACTIVE",
    });
    const checkinEvents = Array.isArray(shift?.checkinEvents) ? shift.checkinEvents : [];
    const notifications = Array.isArray(shift?.notifications) ? shift.notifications : [];
    const manualNote = [
      shift?.companyOfferNote,
      shift?.roomOfferNote,
      shift?.roomOfferDecisionNote,
      shift?.roomOfferDriverNote,
      shift?.extendNoteCompany,
      shift?.extendNoteRoom,
    ].some((value) => Boolean(compactText(value, "")));

    if (status === "ACTIVE" || status === "DONE" || shift?.progress?.startedAt) counts.shiftStartedCount += 1;
    if (status === "DONE" || shift?.progress?.completedAt) counts.shiftCompletedCount += 1;
    if (gpsLastAt || shift?.vehicle?.gpsState?.lastSource) counts.gpsSeenCount += 1;
    if (sourceVisibility.isDriverPhone && gpsLastAt) counts.driverPhoneGpsSeenCount += 1;
    if (sourceVisibility.isVehicleOfficial && gpsLastAt) counts.vehicleGpsSeenCount += 1;
    if (checkinEvents.some((event) => upper(event?.eventType || "", "") === "BOARD")) counts.boardingRecordedCount += 1;
    if (notifications.some((notification) => {
      const payload = typeof notification?.payloadJson === "string"
        ? (() => {
          try {
            const parsed = JSON.parse(notification.payloadJson);
            return parsed && typeof parsed === "object" ? parsed : {};
          } catch {
            return {};
          }
        })()
        : (notification?.payloadJson && typeof notification.payloadJson === "object" ? notification.payloadJson : {});
      return upper(payload?.requestKind || "", "") === "NO_SHOW" || upper(payload?.kind || "", "") === "BOARDING_CHANGE_REQUEST_NO_SHOW";
    })) counts.noBoardRecordedCount += 1;
    if ((gpsLastAt && status !== "DRAFT") || status === "DONE") counts.etaAvailableCount += 1;
    if (manualNote || notifications.some((notification) => {
      const payload = typeof notification?.payloadJson === "string"
        ? (() => {
          try {
            const parsed = JSON.parse(notification.payloadJson);
            return parsed && typeof parsed === "object" ? parsed : {};
          } catch {
            return {};
          }
        })()
        : (notification?.payloadJson && typeof notification.payloadJson === "object" ? notification.payloadJson : {});
      return upper(payload?.requestKind || "", "") === "OPERATION_NOTE" || upper(payload?.kind || "", "").includes("OPERATION_NOTE");
    })) counts.manualOperatorNoteCount += 1;
  }

  return counts;
}

function buildSignalState({ ready = false, partial = false, risky = false, unknown = false } = {}) {
  if (unknown) return "UNKNOWN";
  if (risky) return "RISK";
  if (ready) return "READY";
  if (partial) return "PARTIAL";
  return "MISSING";
}

function buildMissingProofLabels(proofChecklist = []) {
  const labelMap = {
    SHIFT_STARTED: "Servis başlangıç sinyali",
    GPS_SEEN: "GPS kanıtı",
    DRIVER_PHONE_GPS_SEEN: "Sürücünün telefon GPS’i",
    VEHICLE_GPS_SEEN: "Araç GPS’i",
    BOARDING_RECORDED: "Biniş kaydı",
    ETA_AVAILABLE: "ETA sinyali",
    MANUAL_OPERATOR_NOTE: "Operatör notu",
    SHIFT_COMPLETED: "Tamamlanma sinyali",
  };
  return compactList(
    (Array.isArray(proofChecklist) ? proofChecklist : [])
      .filter((item) => item && !item.done && !HIDDEN_CHECKLIST_IDS.has(item.id))
      .map((item) => labelMap[item.id] || item?.label || ""),
    6,
  );
}

function buildRiskReasons({
  agreement,
  bridge,
  proofSummary,
  qualitySummary,
  draftScoreSummary,
  reviewDecisionSummary,
  progressPreview,
  missingProofs,
  completeness,
} = {}) {
  const reasons = [];
  const agreementStatus = upper(agreement?.status || "", "");
  const proofStatus = upper(proofSummary?.status || "", "");
  const qualityStatus = upper(qualitySummary?.status || "", "");
  const draftStatus = upper(draftScoreSummary?.status || "", "");
  const reviewStatus = upper(reviewDecisionSummary?.reviewStatus || "", "");
  const generatedCount = Number(bridge?.generatedCount || 0);
  const todayTotal = Number(progressPreview?.todayTotal || 0);
  const todayDone = Number(progressPreview?.todayDone || 0);
  const horizonOpen = Number(progressPreview?.horizonOpen || 0);

  if (!["APPROVED", "ACTIVE"].includes(agreementStatus)) {
    reasons.push("Sözleşme aktif görünmüyor.");
  }
  if (generatedCount <= 0 && !bridge?.lastShift) {
    reasons.push("Bu sözleşmeye bağlı üretilmiş vardiya görünmüyor.");
  }
  if (proofStatus === "NOT_STARTED") {
    reasons.push("Servis kanıtı henüz başlamamış.");
  }
  if (proofStatus === "NEEDS_REVIEW") {
    reasons.push("Servis kanıtı tekrar kontrol bekliyor.");
  }
  if (qualityStatus === "NEEDS_REVIEW") {
    reasons.push("Kalite sinyali tekrar kontrol gerektiriyor.");
  }
  if (draftStatus === "NEEDS_REVIEW") {
    reasons.push("Taslak kalite incelemesi riskli görünüyor.");
  }
  if (reviewStatus === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK) {
    reasons.push("Kalite kararı tekrar kontrol istiyor.");
  }
  if (reviewStatus === QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW) {
    reasons.push("Kalite kararı şimdilik beklemeye alınmış.");
  }
  if (Array.isArray(missingProofs) && missingProofs.length > 0 && completeness < 70) {
    reasons.push("Eksik kanıtlar tamamlanmadan önizleme güçlü sayılmaz.");
  }
  if (todayTotal > 0 && todayDone < todayTotal) {
    reasons.push("Bugünkü vardiya ilerlemesi tamamlanmamış görünüyor.");
  }
  if (horizonOpen > 0 && proofSummary?.status !== "COMPLETED") {
    reasons.push("Ufukta açık vardiyalar var; kapanış sinyali tam değil.");
  }
  return compactList(reasons, 8);
}

function buildSeferSignals({
  proofSummary,
  draftScoreSummary,
  reviewDecisionSummary,
  bridge,
  progressPreview,
  qualitySummary,
} = {}) {
  const proofChecklist = Array.isArray(proofSummary?.checklist) ? proofSummary.checklist : [];
  const proofSignals = new Set(
    proofChecklist
      .filter((item) => Boolean(item?.done))
      .map((item) => upper(item?.id || "", ""))
      .filter(Boolean),
  );
  const agreementReady = ["APPROVED", "ACTIVE"].includes(upper(bridge?.agreementStatus || "", "")) || Boolean(bridge?.lastShift);
  const gpsReady = proofSignals.has("GPS_SEEN") || proofSignals.has("DRIVER_PHONE_GPS_SEEN") || proofSignals.has("VEHICLE_GPS_SEEN");
  const started = proofSignals.has("SHIFT_STARTED");
  const completed = proofSignals.has("SHIFT_COMPLETED") || upper(proofSummary?.status || "", "") === "COMPLETED";
  const manualNote = proofSignals.has("MANUAL_OPERATOR_NOTE");
  const reviewStatus = upper(reviewDecisionSummary?.reviewStatus || "", "");
  const draftStatus = upper(draftScoreSummary?.status || "", "");
  const complaintRisk = upper(draftScoreSummary?.status || "", "") === "NEEDS_REVIEW" || upper(qualitySummary?.status || "", "") === "NEEDS_REVIEW";

  return {
    onTimeSignal: buildSignalState({
      ready: completed || (Number(progressPreview?.todayTotal || 0) > 0 && Number(progressPreview?.todayDone || 0) >= Number(progressPreview?.todayTotal || 0)),
      partial: agreementReady && (started || Number(progressPreview?.todayTotal || 0) > 0),
      unknown: !agreementReady && !started && !completed,
    }),
    gpsProofSignal: buildSignalState({
      ready: gpsReady,
      partial: proofSignals.has("GPS_SEEN") || proofSignals.has("DRIVER_PHONE_GPS_SEEN") || proofSignals.has("VEHICLE_GPS_SEEN"),
      unknown: !gpsReady && !started,
    }),
    completionSignal: buildSignalState({
      ready: completed,
      partial: started && !completed,
      unknown: !started && !completed,
    }),
    complaintSignal: buildSignalState({
      risky: complaintRisk,
      ready: !complaintRisk && (draftStatus === "REVIEWED_DRAFT" || reviewStatus === QUALITY_REVIEW_STATUSES.REVIEWED),
      unknown: !proofChecklist.length,
    }),
    disputeSignal: buildSignalState({
      risky: reviewStatus === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK || draftStatus === "NEEDS_REVIEW",
      ready: reviewStatus === QUALITY_REVIEW_STATUSES.REVIEWED,
      unknown: !proofChecklist.length,
    }),
    documentSignal: buildSignalState({
      ready: manualNote,
      partial: !manualNote && (started || gpsReady),
      unknown: !proofChecklist.length,
    }),
    qualityReviewSignal: buildSignalState({
      ready: reviewStatus === QUALITY_REVIEW_STATUSES.REVIEWED,
      partial: reviewStatus === QUALITY_REVIEW_STATUSES.REVIEW_PENDING || reviewStatus === QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW,
      risky: reviewStatus === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK,
      unknown: !proofChecklist.length,
    }),
  };
}

function buildQualityPaymentBridgePreview({
  agreement = null,
  bridge = null,
  proofSummary = null,
  qualitySummary = null,
  draftScoreSummary = null,
  reviewDecisionSummary = null,
  progressPreview = null,
  paymentPreview = null,
  settlementPreview = null,
} = {}) {
  const agreementId = Number(agreement?.id || 0) || Number(bridge?.agreementId || 0) || 0;
  const agreementLabel = formatAgreementLabel(agreement || { id: agreementId });
  const bridgeStatus = upper(bridge?.lastShift?.status || "", "");
  const proofChecklist = Array.isArray(proofSummary?.checklist) ? proofSummary.checklist : [];
  const totalChecklist = proofChecklist.filter((item) => !HIDDEN_CHECKLIST_IDS.has(item.id)).length || 1;
  const doneChecklist = proofChecklist.filter((item) => !HIDDEN_CHECKLIST_IDS.has(item.id) && item?.done).length;
  const proofCompleteness = Math.max(0, Math.min(100, Math.round((doneChecklist / totalChecklist) * 100)));
  const missingProofs = buildMissingProofLabels(proofChecklist);
  const reviewStatus = upper(reviewDecisionSummary?.reviewStatus || "", "");
  const proofStatus = upper(proofSummary?.status || "", "");
  const qualityState = upper(qualitySummary?.status || "", "");
  const draftState = upper(draftScoreSummary?.status || "", "");
  const bridgeHasEvidence = Boolean(bridge?.generatedCount || bridge?.lastShift || proofChecklist.length || progressPreview?.todayTotal || progressPreview?.horizonOpen);
  const qualityStatus = !bridgeHasEvidence
    ? "INSUFFICIENT_DATA"
    : reviewStatus === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK || draftState === "NEEDS_REVIEW" || qualityState === "NEEDS_REVIEW"
      ? "RISKY"
      : proofCompleteness < 45 || missingProofs.length > 1 || proofStatus === "NOT_STARTED"
        ? "MISSING_PROOF"
        : "READY";

  const riskReasons = buildRiskReasons({
    agreement,
    bridge,
    proofSummary,
    qualitySummary,
    draftScoreSummary,
    reviewDecisionSummary,
    progressPreview,
    missingProofs,
    completeness: proofCompleteness,
  });
  const signalPreview = buildSeferSignals({
    proofSummary,
    draftScoreSummary,
    reviewDecisionSummary,
    bridge: { ...bridge, agreementStatus: agreement?.status },
    progressPreview,
    qualitySummary,
  });
  const settlementReadiness = !bridgeHasEvidence
    ? "INSUFFICIENT_DATA"
    : riskReasons.some((reason) => /kalite kararı|tekrar kontrol|risk|beklemeye/i.test(reason))
      ? "NEEDS_QUALITY_REVIEW"
      : missingProofs.length > 0 && proofCompleteness < 80
        ? "NEEDS_PROOF"
        : qualityStatus === "READY" && proofCompleteness >= 70
          ? "READY_FOR_REVIEW"
          : "NEEDS_QUALITY_REVIEW";

  const paymentPreviewImpactStatus = !bridgeHasEvidence
    ? "INSUFFICIENT_DATA"
    : qualityStatus === "RISKY"
      ? "REVIEW_REQUIRED"
      : qualityStatus === "READY" && settlementReadiness === "READY_FOR_REVIEW" && reviewStatus === QUALITY_REVIEW_STATUSES.REVIEWED
        ? "NO_IMPACT"
        : missingProofs.length > 0
          ? "PARTIAL_HOLD_RECOMMENDED"
          : "REVIEW_REQUIRED";

  const paymentPreviewImpactReason = !bridgeHasEvidence
    ? "Bu kayıt için yeterli sinyal yok."
    : paymentPreviewImpactStatus === "NO_IMPACT"
      ? "Kalite ve kanıt önizlemesi dengeli görünüyor. Bu sadece önizlemedir."
      : paymentPreviewImpactStatus === "PARTIAL_HOLD_RECOMMENDED"
        ? "Eksik kanıt varsa önce tamamlanmalı. Bu sadece önizlemedir."
        : "Kalite incelemesi / risk sinyali var. Bu sadece önizlemedir.";

  const nextBestAction = !bridgeHasEvidence
    ? "Önce vardiya, GPS ve kanıt sinyallerini topla."
    : settlementReadiness === "READY_FOR_REVIEW"
      ? "Bu sadece önizlemedir. Yetkili kullanıcı son kararı vermeden önce kalite ve kanıt özetini son kez kontrol etmeli."
      : settlementReadiness === "NEEDS_PROOF"
        ? "Önce eksik kanıt/kalite kontrolü tamamlanmalı."
        : "Önce kalite incelemesini aç ve eksik kanıtları tamamla.";

  const evidenceSummary = compactList([
    agreementLabel,
    bridge?.sourceSummary || "",
    proofSummary?.summaryText || "",
    qualitySummary?.summaryText || "",
    draftScoreSummary?.summaryText || "",
    reviewDecisionSummary?.summaryText || "",
    progressPreview ? `Bugün: ${Number(progressPreview.todayDone || 0)}/${Number(progressPreview.todayTotal || 0)} • Ufuk: ${Number(progressPreview.horizonOpen || 0)}` : "",
  ], 5).join(" • ");

  return {
    agreementId,
    agreementLabel,
    previewOnly: true,
    previewOnlyNote: "Readonly önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.",
    canStartPayment: false,
    paymentActionBlocked: true,
    qualityStatus,
    proofCompleteness,
    settlementReadiness,
    paymentPreviewImpact: {
      status: paymentPreviewImpactStatus,
      reason: paymentPreviewImpactReason,
    },
    seferScoreSignalsPreview: signalPreview,
    missingProofs,
    riskReasons,
    nextBestAction,
    evidenceSummary,
    summaryText: "Hakediş için kalite/kanıt hazırlık önizlemesi.",
    agreementStatus: upper(agreement?.status || "", "") || "UNKNOWN",
    agreementStateText: bridgeStatus || upper(agreement?.status || "", "") || "UNKNOWN",
    bridgeSummary: compactText(bridge?.sourceSummary || "", ""),
    progressPreview: progressPreview || null,
    paymentPreview: paymentPreview || null,
    settlementPreview: settlementPreview || null,
    proofSummary: proofSummary || null,
    qualitySummary: qualitySummary || null,
    draftScoreSummary: draftScoreSummary || null,
    reviewDecisionSummary: reviewDecisionSummary || null,
  };
}

async function resolveAgreementQualityPaymentBridgePreview({
  agreementId = 0,
  agreement = null,
  bridge = null,
  paymentPreview = null,
  settlementPreview = null,
  progressPreview = null,
} = {}) {
  const id = Number(agreement?.id || agreementId || 0);
  if (id <= 0 && !agreement) {
    return buildQualityPaymentBridgePreview();
  }

  let resolvedAgreement = agreement;
  if (!resolvedAgreement && id > 0) {
    resolvedAgreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, kind: true } },
        room: { select: { id: true, name: true } },
      },
    });
  }

  if (!resolvedAgreement) {
    return buildQualityPaymentBridgePreview();
  }

  const normalizedAgreementId = Number(resolvedAgreement.id || id || 0);
  const companyId = Number(resolvedAgreement.companyId || 0) || null;
  const roomId = Number(resolvedAgreement.roomId || 0) || null;
  const scope = {
    role: roomId ? "ROOM" : "COMPANY",
    companyId,
    roomId,
    companyKind: resolvedAgreement?.company?.kind || null,
  };

  const [resolvedBridgeMap, resolvedProgressMap, relatedShifts, verificationRecords, reviewRecords] = await Promise.all([
    bridge ? Promise.resolve({ [normalizedAgreementId]: bridge }) : buildAgreementOpsBridgeById({
      agreementIds: [normalizedAgreementId],
      companyId,
      roomId,
    }),
    progressPreview ? Promise.resolve({ byId: { [normalizedAgreementId]: progressPreview } }) : buildAgreementShiftStats({
      agreementIds: [normalizedAgreementId],
      horizonDays: 7,
      companyId,
      roomId,
    }),
    prisma.shift.findMany({
      where: {
        agreementId: normalizedAgreementId,
        status: { not: "DRAFT" },
        ...(companyId != null ? { companyId } : {}),
        ...(roomId != null ? { roomId } : {}),
      },
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        companyId: true,
        roomId: true,
        status: true,
        startAt: true,
        endAt: true,
        vehicleId: true,
        driverId: true,
        progress: {
          select: {
            startedAt: true,
            completedAt: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            gpsLast: { select: { at: true } },
            gpsState: {
              select: {
                lastSource: true,
                lastUiStatus: true,
                lastChangedAt: true,
                seenLiveAt: true,
              },
            },
          },
        },
        checkinEvents: {
          select: {
            eventType: true,
            source: true,
            at: true,
          },
        },
        notifications: {
          select: {
            type: true,
            payloadJson: true,
            createdAt: true,
          },
        },
        companyOfferNote: true,
        roomOfferNote: true,
        roomOfferDecisionNote: true,
        roomOfferDriverNote: true,
        extendNoteCompany: true,
        extendNoteRoom: true,
      },
    }),
    readOperationVerificationRecords(),
    readQualityReviewDecisionRecords(),
  ]);

  const resolvedBridge = resolvedBridgeMap?.[normalizedAgreementId] || null;
  const resolvedProgressPreview = resolvedProgressMap?.byId?.[normalizedAgreementId] || progressPreview || null;
  const manualNotes = collectAgreementManualNotes(verificationRecords, resolvedAgreement);
  const proofCounts = buildShiftSignalCounts(relatedShifts);
  const proofSummary = buildOperationProofSummary({
    scope,
    ...proofCounts,
    manualNotes,
    title: `${resolvedAgreement?.company?.name || resolvedAgreement?.room?.name || "Sözleşme"} servis kanıtı`,
  });
  const serviceSummary = {
    cards: {
      completedServices: Number(resolvedBridge?.generatedCount || 0),
      pendingEvaluation: Math.max(0, Number(relatedShifts.length || 0) - Number(proofCounts.shiftCompletedCount || 0)),
      providerCount: Number(resolvedBridge?.generatedCount || 0) > 0 ? 1 : 0,
    },
  };
  const qualityProofSummary = buildQualityProofSignalSummary({
    scope,
    proofSummary,
    serviceSummary,
  });
  const draftScoreSummary = buildQualityDraftScore({
    scope,
    proofSummary,
    qualitySummary: qualityProofSummary,
    serviceSummary,
  });

  let reviewRecord = null;
  const reviewScopeCandidates = [
    `AGREEMENT:${normalizedAgreementId}`,
    `agreement:${normalizedAgreementId}`,
    String(normalizedAgreementId),
  ];
  for (const scopeId of reviewScopeCandidates) {
    reviewRecord = await findLatestQualityReviewDecisionRecord("AGREEMENT", scopeId);
    if (reviewRecord) break;
  }
  if (!reviewRecord) {
    reviewRecord = (Array.isArray(reviewRecords) ? reviewRecords : [])
      .filter((record) => upper(record?.scopeType || "", "") === "AGREEMENT")
      .find((record) => reviewScopeCandidates.some((candidate) => compactText(record?.scopeId || "", "") === candidate));
  }

  const reviewDecisionSummary = buildQualityReviewDecisionSummary({
    draftScoreSummary,
    reviewStatus: mapAgreementReviewStatus(reviewRecord),
  });

  return buildQualityPaymentBridgePreview({
    agreement: resolvedAgreement,
    bridge: resolvedBridge,
    proofSummary,
    qualitySummary: qualityProofSummary,
    draftScoreSummary,
    reviewDecisionSummary,
    progressPreview: resolvedProgressPreview,
    paymentPreview,
    settlementPreview,
  });
}

export {
  buildQualityPaymentBridgePreview,
  resolveAgreementQualityPaymentBridgePreview as buildAgreementQualityPaymentBridgePreview,
};
