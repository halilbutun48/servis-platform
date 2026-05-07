import { QUALITY_DRAFT_SCORE_STATUSES } from "./qualityDraftScore.js";

export const QUALITY_REVIEW_DECISION_VERSION = "QLT-03";

export const QUALITY_REVIEW_STATUSES = Object.freeze({
  REVIEW_PENDING: "REVIEW_PENDING",
  REVIEWED: "REVIEWED",
  NEEDS_RECHECK: "NEEDS_RECHECK",
  IGNORED_FOR_NOW: "IGNORED_FOR_NOW",
});

const QUALITY_REVIEW_STATUS_ALIASES = new Map([
  ["REVIEWED", QUALITY_REVIEW_STATUSES.REVIEWED],
  ["INCELENDI", QUALITY_REVIEW_STATUSES.REVIEWED],
  ["APPROVED", QUALITY_REVIEW_STATUSES.REVIEWED],
  ["NEEDS_RECHECK", QUALITY_REVIEW_STATUSES.NEEDS_RECHECK],
  ["TEKRAR_KONTROL", QUALITY_REVIEW_STATUSES.NEEDS_RECHECK],
  ["NEEDS_REVIEW", QUALITY_REVIEW_STATUSES.NEEDS_RECHECK],
  ["RECHECK", QUALITY_REVIEW_STATUSES.NEEDS_RECHECK],
  ["IGNORED_FOR_NOW", QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW],
  ["SIMDIK_DIKKATE_ALINMADI", QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW],
  ["SIMDILIK_DIKKATE_ALINMADI", QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW],
  ["IGNORED", QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW],
]);

const QUALITY_REVIEW_STATUS_SET = new Set(Object.values(QUALITY_REVIEW_STATUSES));

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanUpper(value, fallback = "") {
  const text = cleanText(value, fallback);
  return text ? text.toUpperCase() : "";
}

function getDraftStatus(draftScoreSummary = {}) {
  return cleanUpper(draftScoreSummary?.status);
}

function hasSignal(draftScoreSummary = {}, signalId = "") {
  const normalized = cleanUpper(signalId);
  if (!normalized) return false;
  if (Array.isArray(draftScoreSummary?.signals) && draftScoreSummary.signals.some((signal) => cleanUpper(signal?.id) === normalized)) {
    return true;
  }
  if (Array.isArray(draftScoreSummary?.checklist) && draftScoreSummary.checklist.some((item) => cleanUpper(item?.id) === normalized && Boolean(item?.done))) {
    return true;
  }
  return false;
}

function hasDraftEvidence(draftScoreSummary = {}) {
  const draftStatus = getDraftStatus(draftScoreSummary);
  return Boolean(draftStatus && draftStatus !== QUALITY_DRAFT_SCORE_STATUSES.NO_SCORE);
}

export function normalizeQualityReviewDecision(input) {
  if (!input) return "";
  if (typeof input === "string") {
    const normalized = cleanUpper(input);
    return QUALITY_REVIEW_STATUS_ALIASES.get(normalized) || (QUALITY_REVIEW_STATUS_SET.has(normalized) ? normalized : "");
  }
  if (typeof input === "object") {
    return normalizeQualityReviewDecision(
      input.reviewStatus ||
      input.decision ||
      input.status ||
      input.value ||
      input.key
    );
  }
  return "";
}

function item(done, label, note, count = null, id = null) {
  return {
    id: id || label,
    label,
    done: Boolean(done),
    count: count != null ? count : (done ? 1 : 0),
    note: cleanText(note, ""),
  };
}

function buildReviewText(reviewStatus, hasDraftEvidenceFlag) {
  switch (reviewStatus) {
    case QUALITY_REVIEW_STATUSES.REVIEWED:
      return {
        summaryText: "İncelendi",
        nextAction: "Bu karar kesin kalite puanı değildir. Sağlayıcı sıralaması değildir.",
      };
    case QUALITY_REVIEW_STATUSES.NEEDS_RECHECK:
      return {
        summaryText: "Tekrar kontrol gerekli",
        nextAction: "Eksik sinyalleri tamamlayıp kararı güncelleyin. Sağlayıcı sıralaması değildir.",
      };
    case QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW:
      return {
        summaryText: "Şimdilik dikkate alınmadı",
        nextAction: "Gerekirse daha sonra tekrar inceleyin. Sağlayıcı sıralaması değildir.",
      };
    default:
      return {
        summaryText: "Kalite incelemesi bekliyor",
        nextAction: hasDraftEvidenceFlag
          ? "Taslak kalite skorunu inceleyip karar verin. Sağlayıcı sıralaması değildir."
          : "Önce taslak kalite skoru oluşsun. Sağlayıcı sıralaması değildir.",
      };
  }
}

export function buildQualityReviewChecklist(input = {}) {
  const draftScoreSummary = input?.draftScoreSummary || {};
  const reviewStatus = normalizeQualityReviewDecision(input?.reviewStatus || input?.decision || input?.decisionRecord) || QUALITY_REVIEW_STATUSES.REVIEW_PENDING;
  const hasDraft = hasDraftEvidence(draftScoreSummary);
  const proofReady = hasDraft && hasSignal(draftScoreSummary, "PROOF_READY");
  const manualNote = hasSignal(draftScoreSummary, "MANUAL_OPERATOR_NOTE");
  const boarding = hasSignal(draftScoreSummary, "BOARDING_SIGNAL");
  const driverPhoneGps = hasSignal(draftScoreSummary, "DRIVER_PHONE_GPS_SIGNAL");
  const vehicleGps = hasSignal(draftScoreSummary, "VEHICLE_GPS_SIGNAL");
  const feedbackSeen = hasSignal(draftScoreSummary, "FEEDBACK_SEEN");
  const complaintSeen = hasSignal(draftScoreSummary, "COMPLAINT_SEEN");

  return [
    item(hasDraft, "Taslak kalite skoru hazır", hasDraft ? "Taslak kalite skoru incelenebilir." : "Taslak kalite skoru bekleniyor.", hasDraft ? 1 : 0, "DRAFT_SCORE_READY"),
    item(proofReady, "Servis Kanıtı hazır", proofReady ? "Servis Kanıtı / Hizmet Kanıtı kalite incelemesine yardımcı olur." : "Servis Kanıtı bekleniyor.", proofReady ? 1 : 0, "PROOF_READY"),
    item(manualNote, "Operatör notu var", manualNote ? "Operatör notu kalite kararını destekliyor." : "Operatör notu bekleniyor.", manualNote ? 1 : 0, "MANUAL_OPERATOR_NOTE"),
    item(reviewStatus === QUALITY_REVIEW_STATUSES.REVIEWED, "İncelendi", reviewStatus === QUALITY_REVIEW_STATUSES.REVIEWED ? "Kalite incelemesi tamamlandı." : "İnceleme kararı bekleniyor.", reviewStatus === QUALITY_REVIEW_STATUSES.REVIEWED ? 1 : 0, "REVIEWED"),
    item(reviewStatus === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK, "Tekrar kontrol gerekli", reviewStatus === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK ? "Eksik sinyal varsa tekrar kontrol edin." : "Tekrar kontrol kararı bekleniyor.", reviewStatus === QUALITY_REVIEW_STATUSES.NEEDS_RECHECK ? 1 : 0, "NEEDS_RECHECK"),
    item(reviewStatus === QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW, "Şimdilik dikkate alınmadı", reviewStatus === QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW ? "Karar şimdilik beklemeye alındı." : "Dikkate alma kararı bekleniyor.", reviewStatus === QUALITY_REVIEW_STATUSES.IGNORED_FOR_NOW ? 1 : 0, "IGNORED_FOR_NOW"),
    item(boarding, "Biniş kaydı var", boarding ? "Biniş kaydı görüldü." : "Biniş kaydı bekleniyor.", boarding ? 1 : 0, "BOARDING_SIGNAL"),
    item(driverPhoneGps, "Sürücünün telefon GPS’i sinyali var", driverPhoneGps ? "Sürücünün telefon GPS’i sinyali görüldü." : "Sürücünün telefon GPS’i bekleniyor.", driverPhoneGps ? 1 : 0, "DRIVER_PHONE_GPS_SIGNAL"),
    item(vehicleGps, "Araç GPS’i sinyali var", vehicleGps ? "Araç GPS’i sinyali görüldü." : "Araç GPS’i bekleniyor.", vehicleGps ? 1 : 0, "VEHICLE_GPS_SIGNAL"),
    item(feedbackSeen, "Geri bildirim var", feedbackSeen ? "Geri bildirim sinyali görüldü." : "Geri bildirim bekleniyor.", feedbackSeen ? 1 : 0, "FEEDBACK_SEEN"),
    item(complaintSeen, "Şikayet sinyali var", complaintSeen ? "Şikayet sinyali görüldü." : "Şikayet sinyali bekleniyor.", complaintSeen ? 1 : 0, "COMPLAINT_SEEN"),
  ].slice(0, 5);
}

export function buildQualityReviewSafeView(input = {}) {
  const draftScoreSummary = input?.draftScoreSummary || {};
  const reviewStatus = normalizeQualityReviewDecision(input?.reviewStatus || input?.decision || input?.decisionRecord) || QUALITY_REVIEW_STATUSES.REVIEW_PENDING;
  const text = buildReviewText(reviewStatus, hasDraftEvidence(draftScoreSummary));
  return {
    reviewStatus,
    title: "Kalite inceleme kararı",
    summaryText: text.summaryText,
    checklist: buildQualityReviewChecklist({ ...input, reviewStatus }),
    nextAction: cleanText(input.nextAction, text.nextAction),
    nonFinalText: "Bu karar kesin kalite puanı değildir",
    paymentImpactText: "Bu karar hakediş veya komisyon hesabını etkilemez",
  };
}

export function buildQualityReviewDecisionSummary(input = {}) {
  return {
    version: QUALITY_REVIEW_DECISION_VERSION,
    ...buildQualityReviewSafeView(input),
  };
}
