export const QUALITY_DRAFT_SCORE_VERSION = "QLT-02";

export const QUALITY_DRAFT_SCORE_STATUSES = Object.freeze({
  NO_SCORE: "NO_SCORE",
  DRAFT_PARTIAL: "DRAFT_PARTIAL",
  DRAFT_READY_FOR_REVIEW: "DRAFT_READY_FOR_REVIEW",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  REVIEWED_DRAFT: "REVIEWED_DRAFT",
});

const QUALITY_DRAFT_SIGNAL_IDS = [
  "PROOF_READY",
  "PROOF_PARTIAL",
  "BOARDING_SIGNAL",
  "GPS_SIGNAL",
  "DRIVER_PHONE_GPS_SIGNAL",
  "VEHICLE_GPS_SIGNAL",
  "MANUAL_OPERATOR_NOTE",
  "SERVICE_EVALUATION_SEEN",
  "FEEDBACK_SEEN",
  "COMPLAINT_SEEN",
  "LATE_OR_MISSING_EVIDENCE",
  "REVIEW_REQUIRED",
];

const QUALITY_DRAFT_SIGNAL_SET = new Set(QUALITY_DRAFT_SIGNAL_IDS);
const QUALITY_DRAFT_SIGNAL_ALIASES = new Map([
  ["READY", "PROOF_READY"],
  ["EVIDENCE_READY", "PROOF_READY"],
  ["COMPLETED", "PROOF_READY"],
  ["PROOF_READY", "PROOF_READY"],
  ["PARTIAL", "PROOF_PARTIAL"],
  ["EVIDENCE_PARTIAL", "PROOF_PARTIAL"],
  ["IN_PROGRESS", "PROOF_PARTIAL"],
  ["PROOF_PARTIAL", "PROOF_PARTIAL"],
  ["BOARDING", "BOARDING_SIGNAL"],
  ["BOARDING_RECORDED", "BOARDING_SIGNAL"],
  ["BINIS_KAYDI", "BOARDING_SIGNAL"],
  ["BOARDING_SIGNAL", "BOARDING_SIGNAL"],
  ["GPS", "GPS_SIGNAL"],
  ["GPS_SEEN", "GPS_SIGNAL"],
  ["GPS_SIGNAL", "GPS_SIGNAL"],
  ["DRIVER_PHONE_GPS", "DRIVER_PHONE_GPS_SIGNAL"],
  ["DRIVER_PHONE_GPS_SEEN", "DRIVER_PHONE_GPS_SIGNAL"],
  ["SURUCUNUN_TELEFON_GPSI_GORULDU", "DRIVER_PHONE_GPS_SIGNAL"],
  ["DRIVER_PHONE_GPS_SIGNAL", "DRIVER_PHONE_GPS_SIGNAL"],
  ["VEHICLE_GPS", "VEHICLE_GPS_SIGNAL"],
  ["VEHICLE_GPS_SEEN", "VEHICLE_GPS_SIGNAL"],
  ["ARAC_GPSI_GORULDU", "VEHICLE_GPS_SIGNAL"],
  ["VEHICLE_GPS_SIGNAL", "VEHICLE_GPS_SIGNAL"],
  ["MANUAL_NOTE", "MANUAL_OPERATOR_NOTE"],
  ["OPERATOR_NOTE", "MANUAL_OPERATOR_NOTE"],
  ["OPERATOR", "MANUAL_OPERATOR_NOTE"],
  ["MANUAL_OPERATOR_NOTE", "MANUAL_OPERATOR_NOTE"],
  ["SERVICE_EVALUATION", "SERVICE_EVALUATION_SEEN"],
  ["SERVICE_EVALUATION_SEEN", "SERVICE_EVALUATION_SEEN"],
  ["EVALUATION_SEEN", "SERVICE_EVALUATION_SEEN"],
  ["FEEDBACK", "FEEDBACK_SEEN"],
  ["FEEDBACK_SEEN", "FEEDBACK_SEEN"],
  ["COMPLAINT_OR_FEEDBACK_SEEN", "FEEDBACK_SEEN"],
  ["COMPLAINT", "COMPLAINT_SEEN"],
  ["COMPLAINT_SEEN", "COMPLAINT_SEEN"],
  ["REVIEW", "REVIEW_REQUIRED"],
  ["REVIEW_REQUIRED", "REVIEW_REQUIRED"],
  ["NEEDS_REVIEW", "REVIEW_REQUIRED"],
  ["TEKRAR_KONTROL", "REVIEW_REQUIRED"],
  ["LATE_OR_MISSING_EVIDENCE", "LATE_OR_MISSING_EVIDENCE"],
  ["MISSING_EVIDENCE", "LATE_OR_MISSING_EVIDENCE"],
  ["LATE_EVIDENCE", "LATE_OR_MISSING_EVIDENCE"],
]);

const SCORE_BAND_LABELS = Object.freeze({
  NO_SCORE: "Skor yok",
  DRAFT_PARTIAL: "Taslak kısmi",
  DRAFT_READY_FOR_REVIEW: "Denetime hazır öneri",
  NEEDS_REVIEW: "Tekrar kontrol gerekli",
  REVIEWED_DRAFT: "İncelenmiş taslak",
});

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanUpper(value, fallback = "") {
  const text = cleanText(value, fallback);
  return text ? text.toUpperCase() : "";
}

function asCount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function normalizeDraftSignalId(raw) {
  const text = cleanUpper(raw).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!text) return "";
  return QUALITY_DRAFT_SIGNAL_ALIASES.get(text) || (QUALITY_DRAFT_SIGNAL_SET.has(text) ? text : "");
}

export function normalizeDraftScoreSignal(signal) {
  if (!signal) return "";
  if (typeof signal === "string") return normalizeDraftSignalId(signal);
  if (typeof signal === "object") {
    return normalizeDraftSignalId(
      signal.id ||
        signal.signal ||
        signal.type ||
        signal.key ||
        signal.name ||
        signal.code ||
        signal.value
    );
  }
  return "";
}

function collectSignalSet(input = {}) {
  const source = [
    ...(Array.isArray(input?.proofSummary?.signals) ? input.proofSummary.signals : []),
    ...(Array.isArray(input?.qualitySummary?.signals) ? input.qualitySummary.signals : []),
    ...(Array.isArray(input?.signals) ? input.signals : []),
  ];
  return new Set(source.map((signal) => normalizeDraftScoreSignal(signal)).filter(Boolean));
}

function buildFlags(input = {}, signalSet = collectSignalSet(input)) {
  const proofSummary = input?.proofSummary || {};
  const qualitySummary = input?.qualitySummary || {};
  const serviceSummary = input?.serviceSummary || {};
  const proofStatus = cleanUpper(proofSummary?.status);
  const qualityStatus = cleanUpper(qualitySummary?.status);
  const proofReady = signalSet.has("PROOF_READY") || ["EVIDENCE_READY", "COMPLETED"].includes(proofStatus);
  const proofPartial = signalSet.has("PROOF_PARTIAL") || ["EVIDENCE_PARTIAL", "IN_PROGRESS"].includes(proofStatus);
  const boarding = signalSet.has("BOARDING_SIGNAL");
  const gpsSignal = signalSet.has("GPS_SIGNAL") || signalSet.has("DRIVER_PHONE_GPS_SIGNAL") || signalSet.has("VEHICLE_GPS_SIGNAL");
  const driverPhoneGps = signalSet.has("DRIVER_PHONE_GPS_SIGNAL");
  const vehicleGps = signalSet.has("VEHICLE_GPS_SIGNAL");
  const manualNote = signalSet.has("MANUAL_OPERATOR_NOTE");
  const serviceEvaluationSeen =
    signalSet.has("SERVICE_EVALUATION_SEEN") ||
    asCount(serviceSummary?.cards?.completedServices ?? input?.completedServices) > 0 ||
    asCount(serviceSummary?.cards?.pendingEvaluation ?? input?.pendingEvaluation) > 0;
  const feedbackSeen = signalSet.has("FEEDBACK_SEEN") || serviceEvaluationSeen;
  const complaintSeen = signalSet.has("COMPLAINT_SEEN") || qualityStatus === "NEEDS_REVIEW" || proofStatus === "NEEDS_REVIEW";
  const lateOrMissingEvidence = signalSet.has("LATE_OR_MISSING_EVIDENCE") || (!proofReady && (proofPartial || boarding || gpsSignal || manualNote));
  const reviewRequired = signalSet.has("REVIEW_REQUIRED") || complaintSeen || lateOrMissingEvidence;

  return {
    signalSet,
    proofStatus,
    qualityStatus,
    proofReady,
    proofPartial,
    boarding,
    gpsSignal,
    driverPhoneGps,
    vehicleGps,
    manualNote,
    serviceEvaluationSeen,
    feedbackSeen,
    complaintSeen,
    lateOrMissingEvidence,
    reviewRequired,
  };
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

export function buildDraftScoreChecklist(input = {}) {
  const flags = buildFlags(input);
  return [
    item(flags.proofReady, "Servis kanıtı hazır", flags.proofReady ? "Servis kanıtı kalite incelemesine yardımcı olur." : "Servis kanıtı bekleniyor.", flags.proofReady ? 1 : 0, "PROOF_READY"),
    item(flags.proofPartial, "Kanıt kısmi", flags.proofPartial ? "Kanıt kısmi geldi." : "Kanıt kısmi sinyali bekleniyor.", flags.proofPartial ? 1 : 0, "PROOF_PARTIAL"),
    item(flags.boarding, "Biniş kaydı var", flags.boarding ? "Biniş kaydı bulundu." : "Biniş kaydı bekleniyor.", flags.boarding ? 1 : 0, "BOARDING_SIGNAL"),
    item(flags.driverPhoneGps, "Sürücünün telefon GPS’i sinyali var", flags.driverPhoneGps ? "Sürücünün telefon GPS’i görüldü." : "Sürücünün telefon GPS’i bekleniyor.", flags.driverPhoneGps ? 1 : 0, "DRIVER_PHONE_GPS_SIGNAL"),
    item(flags.vehicleGps, "Araç GPS’i sinyali var", flags.vehicleGps ? "Araç GPS’i görüldü." : "Araç GPS’i bekleniyor.", flags.vehicleGps ? 1 : 0, "VEHICLE_GPS_SIGNAL"),
    item(flags.manualNote, "Operatör notu var", flags.manualNote ? "Operatör notu var." : "Operatör notu bekleniyor.", flags.manualNote ? 1 : 0, "MANUAL_OPERATOR_NOTE"),
    item(flags.serviceEvaluationSeen, "Servis değerlendirmesi görüldü", flags.serviceEvaluationSeen ? "Servis değerlendirme izi bulundu." : "Servis değerlendirme izi bekleniyor.", flags.serviceEvaluationSeen ? 1 : 0, "SERVICE_EVALUATION_SEEN"),
    item(flags.feedbackSeen, "Geri bildirim var", flags.feedbackSeen ? "Geri bildirim bulundu." : "Geri bildirim bekleniyor.", flags.feedbackSeen ? 1 : 0, "FEEDBACK_SEEN"),
    item(flags.complaintSeen, "Şikayet / tekrar kontrol sinyali var", flags.complaintSeen ? "Şikayet / tekrar kontrol sinyali görüldü." : "Şikayet / tekrar kontrol sinyali bekleniyor.", flags.complaintSeen ? 1 : 0, "COMPLAINT_SEEN"),
    item(flags.lateOrMissingEvidence, "Eksik veya geciken kanıt", flags.lateOrMissingEvidence ? "Eksik veya geciken kanıt görüldü." : "Eksik veya geciken kanıt bekleniyor.", flags.lateOrMissingEvidence ? 1 : 0, "LATE_OR_MISSING_EVIDENCE"),
    item(flags.reviewRequired, "Tekrar kontrol gerekli", flags.reviewRequired ? "Tekrar kontrol gerekli sinyali görüldü." : "Tekrar kontrol sinyali bekleniyor.", flags.reviewRequired ? 1 : 0, "REVIEW_REQUIRED"),
  ];
}

function buildStatus(flags) {
  const hasAnySignal =
    flags.proofReady ||
    flags.proofPartial ||
    flags.boarding ||
    flags.gpsSignal ||
    flags.manualNote ||
    flags.serviceEvaluationSeen ||
    flags.feedbackSeen ||
    flags.complaintSeen ||
    flags.lateOrMissingEvidence ||
    flags.reviewRequired;

  let draftScore = 0;
  if (flags.proofReady) draftScore += 30;
  if (flags.proofPartial) draftScore += 18;
  if (flags.boarding) draftScore += 14;
  if (flags.driverPhoneGps) draftScore += 12;
  if (flags.vehicleGps) draftScore += 10;
  if (flags.manualNote) draftScore += 10;
  if (flags.serviceEvaluationSeen) draftScore += 8;
  if (flags.feedbackSeen) draftScore += 6;
  if (flags.complaintSeen) draftScore -= 14;
  if (flags.lateOrMissingEvidence) draftScore -= 10;
  if (flags.reviewRequired) draftScore -= 8;
  if (flags.proofReady && flags.boarding && flags.manualNote) draftScore += 6;
  if (flags.proofReady && (flags.driverPhoneGps || flags.vehicleGps)) draftScore += 4;
  draftScore = Math.max(0, Math.min(100, Math.round(draftScore)));

  if (!hasAnySignal) {
    return {
      status: QUALITY_DRAFT_SCORE_STATUSES.NO_SCORE,
      draftScore: 0,
      scoreBand: SCORE_BAND_LABELS.NO_SCORE,
      summaryText: "Taslak kalite skoru henüz oluşmadı.",
      nextAction: "Servis kanıtı oluşunca tekrar kontrol edin.",
    };
  }

  if (flags.complaintSeen || flags.lateOrMissingEvidence || flags.reviewRequired) {
    if (draftScore >= 70 && flags.proofReady && (flags.manualNote || flags.boarding)) {
      return {
        status: QUALITY_DRAFT_SCORE_STATUSES.REVIEWED_DRAFT,
        draftScore,
        scoreBand: SCORE_BAND_LABELS.REVIEWED_DRAFT,
        summaryText: "İncelenmiş taslak",
        nextAction: "İncelenmiş taslak; kontrollü kalite inceleme akışına hazır.",
      };
    }
    return {
      status: QUALITY_DRAFT_SCORE_STATUSES.NEEDS_REVIEW,
      draftScore,
      scoreBand: SCORE_BAND_LABELS.NEEDS_REVIEW,
      summaryText: "Tekrar kontrol gerekli",
      nextAction: "Eksik veya riskli sinyalleri tamamlayıp tekrar kontrol edin.",
    };
  }

  if (draftScore >= 70 && flags.proofReady && (flags.manualNote || flags.boarding || flags.serviceEvaluationSeen || flags.feedbackSeen)) {
    return {
      status: QUALITY_DRAFT_SCORE_STATUSES.REVIEWED_DRAFT,
      draftScore,
      scoreBand: SCORE_BAND_LABELS.REVIEWED_DRAFT,
      summaryText: "İncelenmiş taslak",
      nextAction: "İncelenmiş taslak; kontrollü kalite inceleme akışına hazır.",
    };
  }

  if (flags.proofReady && draftScore >= 55) {
    return {
      status: QUALITY_DRAFT_SCORE_STATUSES.DRAFT_READY_FOR_REVIEW,
      draftScore,
      scoreBand: SCORE_BAND_LABELS.DRAFT_READY_FOR_REVIEW,
      summaryText: "Denetime hazır öneri",
      nextAction: "Denetim öncesi öneriyi gözden geçirin.",
    };
  }

  return {
    status: QUALITY_DRAFT_SCORE_STATUSES.DRAFT_PARTIAL,
    draftScore,
    scoreBand: SCORE_BAND_LABELS.DRAFT_PARTIAL,
    summaryText: "Taslak kalite skoru kısmi.",
    nextAction: "Eksik sinyali biniş kaydı, GPS veya operatör notu ile tamamlayın.",
  };
}

export function buildDraftScoreExplanation(input = {}) {
  const flags = buildFlags(input);
  const lines = [
    "Operasyon kanıtı kalite incelemesine yardımcı olur.",
    "Sağlayıcı karşılaştırması için hazırlık.",
    "Sağlayıcı sıralaması değildir.",
    "Bu skor kesin kalite puanı değildir.",
    "Bu skor hakediş veya komisyon hesabını etkilemez.",
  ];

  if (flags.proofReady) {
    lines.push("Servis kanıtı hazır.");
  } else if (flags.proofPartial) {
    lines.push("Kanıt kısmi.");
  }

  if (flags.boarding) lines.push("Biniş kaydı var.");
  if (flags.driverPhoneGps) lines.push("Sürücünün telefon GPS’i sinyali var.");
  if (flags.vehicleGps) lines.push("Araç GPS’i sinyali var.");
  if (flags.manualNote) lines.push("Operatör notu var.");
  if (flags.feedbackSeen) lines.push("Geri bildirim var.");
  if (flags.complaintSeen || flags.reviewRequired || flags.lateOrMissingEvidence) {
    lines.push("Şikayet / tekrar kontrol sinyali var.");
  }

  return lines.slice(0, 6);
}

export function buildQualityDraftScore(input = {}) {
  const checklist = Array.isArray(input.checklist) ? input.checklist : buildDraftScoreChecklist(input);
  const flags = buildFlags(input);
  const statusInfo = buildStatus(flags);
  const signals = checklist
    .filter((item) => Boolean(item?.done))
    .slice(0, 10)
    .map((item) => ({
      id: normalizeDraftScoreSignal(item?.id || item?.signalId || item?.type || item?.code || item?.key || item?.label) || String(item?.id || item?.label || ""),
      label: cleanText(item?.label, String(item?.id || "")),
      count: asCount(item?.count) || 1,
      note: cleanText(item?.note, ""),
    }));

  return {
    version: QUALITY_DRAFT_SCORE_VERSION,
    status: statusInfo.status,
    title: "Taslak kalite skoru",
    draftScore: statusInfo.draftScore,
    scoreBand: statusInfo.scoreBand,
    summaryText: statusInfo.summaryText,
    explanation: buildDraftScoreExplanation({ ...input, ...flags }),
    checklist,
    signals,
    nextAction: cleanText(input.nextAction, statusInfo.nextAction),
    nonFinalText: "Bu skor kesin kalite puanı değildir.",
    paymentImpactText: "Bu skor hakediş veya komisyon hesabını etkilemez.",
  };
}
