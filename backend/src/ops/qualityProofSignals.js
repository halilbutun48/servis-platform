export const QUALITY_PROOF_SIGNAL_VERSION = "QLT-01";

export const QUALITY_PROOF_SIGNAL_STATUSES = Object.freeze({
  NOT_READY: "NOT_READY",
  SIGNALS_PARTIAL: "SIGNALS_PARTIAL",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  REVIEWED: "REVIEWED",
});

const QUALITY_SIGNAL_IDS = [
  "PROOF_READY",
  "PROOF_PARTIAL",
  "MANUAL_OPERATOR_NOTE",
  "BOARDING_SIGNAL",
  "GPS_SIGNAL",
  "DRIVER_PHONE_GPS_SIGNAL",
  "VEHICLE_GPS_SIGNAL",
  "SERVICE_EVALUATION_SEEN",
  "COMPLAINT_OR_FEEDBACK_SEEN",
  "NEEDS_REVIEW",
];

const QUALITY_SIGNAL_SET = new Set(QUALITY_SIGNAL_IDS);
const QUALITY_SIGNAL_ALIASES = new Map([
  ["READY", "PROOF_READY"],
  ["EVIDENCE_READY", "PROOF_READY"],
  ["COMPLETED", "PROOF_READY"],
  ["PROOF_READY", "PROOF_READY"],
  ["PARTIAL", "PROOF_PARTIAL"],
  ["EVIDENCE_PARTIAL", "PROOF_PARTIAL"],
  ["IN_PROGRESS", "PROOF_PARTIAL"],
  ["PROOF_PARTIAL", "PROOF_PARTIAL"],
  ["MANUAL_NOTE", "MANUAL_OPERATOR_NOTE"],
  ["OPERATOR_NOTE", "MANUAL_OPERATOR_NOTE"],
  ["OPERATOR", "MANUAL_OPERATOR_NOTE"],
  ["MANUAL_OPERATOR_NOTE", "MANUAL_OPERATOR_NOTE"],
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
  ["SERVICE_EVALUATION", "SERVICE_EVALUATION_SEEN"],
  ["SERVICE_EVALUATION_SEEN", "SERVICE_EVALUATION_SEEN"],
  ["EVALUATION_SEEN", "SERVICE_EVALUATION_SEEN"],
  ["FEEDBACK", "COMPLAINT_OR_FEEDBACK_SEEN"],
  ["FEEDBACK_SEEN", "COMPLAINT_OR_FEEDBACK_SEEN"],
  ["COMPLAINT_OR_FEEDBACK_SEEN", "COMPLAINT_OR_FEEDBACK_SEEN"],
  ["REVIEW", "NEEDS_REVIEW"],
  ["TEKRAR_KONTROL", "NEEDS_REVIEW"],
  ["NEEDS_REVIEW", "NEEDS_REVIEW"],
]);

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

function normalizeQualitySignalId(raw) {
  const text = cleanUpper(raw).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!text) return "";
  return QUALITY_SIGNAL_ALIASES.get(text) || (QUALITY_SIGNAL_SET.has(text) ? text : "");
}

export function normalizeQualitySignal(signal) {
  if (!signal) return "";
  if (typeof signal === "string") return normalizeQualitySignalId(signal);
  if (typeof signal === "object") {
    return normalizeQualitySignalId(
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

function proofDoneSet(input = {}) {
  const proofSummary = input?.proofSummary || {};
  const proofStatus = cleanUpper(proofSummary?.status);
  const proofSignals = Array.isArray(proofSummary?.signals) ? proofSummary.signals : [];
  const signalSet = new Set(proofSignals.map((signal) => normalizeQualitySignal(signal)).filter(Boolean));
  const completedServices = asCount(input?.serviceSummary?.cards?.completedServices ?? input?.completedServices);
  const pendingEvaluation = asCount(input?.serviceSummary?.cards?.pendingEvaluation ?? input?.pendingEvaluation);
  const providerCount = asCount(input?.serviceSummary?.cards?.providerCount ?? input?.providerCount);
  const evaluationCount = asCount(input?.providerScore?.evaluationCount ?? input?.evaluationCount);

  const proofReady = ["EVIDENCE_READY", "COMPLETED"].includes(proofStatus) || signalSet.has("PROOF_READY");
  const proofPartial = ["IN_PROGRESS", "EVIDENCE_PARTIAL"].includes(proofStatus) || signalSet.has("PROOF_PARTIAL");
  const manualNote = signalSet.has("MANUAL_OPERATOR_NOTE");
  const boarding = signalSet.has("BOARDING_SIGNAL");
  const driverPhoneGps = signalSet.has("DRIVER_PHONE_GPS_SIGNAL");
  const vehicleGps = signalSet.has("VEHICLE_GPS_SIGNAL");
  const gpsSignal = signalSet.has("GPS_SIGNAL") || driverPhoneGps || vehicleGps;
  const serviceEvaluationSeen = evaluationCount > 0 || completedServices > 0 || pendingEvaluation > 0 || signalSet.has("SERVICE_EVALUATION_SEEN");
  const feedbackSeen = evaluationCount > 0 || completedServices > 0 || signalSet.has("COMPLAINT_OR_FEEDBACK_SEEN");
  const needsReview = proofStatus === "NEEDS_REVIEW" || signalSet.has("NEEDS_REVIEW");
  const hasComparisonBase = providerCount > 0 || serviceEvaluationSeen || feedbackSeen || evaluationCount > 0;

  return {
    proofStatus,
    proofReady,
    proofPartial,
    manualNote,
    boarding,
    driverPhoneGps,
    vehicleGps,
    gpsSignal,
    serviceEvaluationSeen,
    feedbackSeen,
    needsReview,
    providerCount,
    completedServices,
    pendingEvaluation,
    evaluationCount,
    hasComparisonBase,
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

export function buildQualityReadinessChecklist(input = {}) {
  const flags = proofDoneSet(input);
  return [
    item(flags.proofReady, "Servis kanıtı hazır", flags.proofReady ? "Servis kanıtı kalite değerlendirmesine yardımcı olur." : "Servis kanıtı bekleniyor.", flags.proofReady ? 1 : 0, "PROOF_READY"),
    item(flags.proofPartial, "Kanıt kısmi", flags.proofPartial ? "Kanıt sinyali kısmi geldi." : "Kanıt sinyali bekleniyor.", flags.proofPartial ? 1 : 0, "PROOF_PARTIAL"),
    item(flags.manualNote, "Operatör notu var", flags.manualNote ? "Operatör notu kaydı bulundu." : "Operatör notu bekleniyor.", flags.manualNote ? 1 : 0, "MANUAL_OPERATOR_NOTE"),
    item(flags.boarding, "Biniş kaydı var", flags.boarding ? "Biniş kaydı bulundu." : "Biniş kaydı bekleniyor.", flags.boarding ? 1 : 0, "BOARDING_SIGNAL"),
    item(flags.driverPhoneGps, "Sürücünün telefon GPS’i sinyali var", flags.driverPhoneGps ? "Sürücünün telefon GPS’i görüldü." : "Sürücünün telefon GPS’i bekleniyor.", flags.driverPhoneGps ? 1 : 0, "DRIVER_PHONE_GPS_SIGNAL"),
    item(flags.vehicleGps, "Araç GPS’i sinyali var", flags.vehicleGps ? "Araç GPS’i görüldü." : "Araç GPS’i bekleniyor.", flags.vehicleGps ? 1 : 0, "VEHICLE_GPS_SIGNAL"),
    item(flags.feedbackSeen, "Geri bildirim var", flags.feedbackSeen ? "Geri bildirim görüldü." : "Geri bildirim bekleniyor.", flags.feedbackSeen ? 1 : 0, "COMPLAINT_OR_FEEDBACK_SEEN"),
  ];
}

function readinessText(status) {
  switch (status) {
    case QUALITY_PROOF_SIGNAL_STATUSES.SIGNALS_PARTIAL:
      return {
        summaryText: "Servis kanıtı kalite değerlendirmesine yardımcı olur.",
        nextAction: "Eksik sinyali operatör notu veya biniş kaydıyla tamamlayın.",
      };
    case QUALITY_PROOF_SIGNAL_STATUSES.READY_FOR_REVIEW:
      return {
        summaryText: "Sağlayıcı karşılaştırması için hazırlık",
        nextAction: "Kalite puanı hazırlığı için kanıtı ve değerlendirme sinyallerini birlikte inceleyin.",
      };
    case QUALITY_PROOF_SIGNAL_STATUSES.NEEDS_REVIEW:
      return {
        summaryText: "Tekrar kontrol gerekli",
        nextAction: "Tekrar kontrol gerekli; eksik kanıtı tamamlayın.",
      };
    case QUALITY_PROOF_SIGNAL_STATUSES.REVIEWED:
      return {
        summaryText: "Sağlayıcı karşılaştırması için hazırlık tamamlandı",
        nextAction: "Bu bilgi tek başına kalite puanı değildir.",
      };
    default:
      return {
        summaryText: "Kalite puanı hazırlığı bekleniyor",
        nextAction: "Servis kanıtı ve değerlendirme sinyali görünür olduğunda tekrar kontrol edin.",
      };
  }
}

export function buildProviderComparisonReadiness(input = {}) {
  const flags = proofDoneSet(input);
  let status = QUALITY_PROOF_SIGNAL_STATUSES.NOT_READY;
  if (flags.needsReview) {
    status = QUALITY_PROOF_SIGNAL_STATUSES.NEEDS_REVIEW;
  } else if (flags.proofReady && flags.hasComparisonBase && flags.manualNote) {
    status = QUALITY_PROOF_SIGNAL_STATUSES.REVIEWED;
  } else if (flags.proofReady && flags.hasComparisonBase) {
    status = QUALITY_PROOF_SIGNAL_STATUSES.READY_FOR_REVIEW;
  } else if (flags.proofPartial || flags.hasComparisonBase || flags.manualNote || flags.boarding || flags.gpsSignal) {
    status = QUALITY_PROOF_SIGNAL_STATUSES.SIGNALS_PARTIAL;
  }

  const text = readinessText(status);
  return {
    status,
    summaryText: text.summaryText,
    nextAction: text.nextAction,
    ready: status === QUALITY_PROOF_SIGNAL_STATUSES.READY_FOR_REVIEW || status === QUALITY_PROOF_SIGNAL_STATUSES.REVIEWED,
    reviewed: status === QUALITY_PROOF_SIGNAL_STATUSES.REVIEWED,
    proofReady: flags.proofReady,
    proofPartial: flags.proofPartial,
    manualNote: flags.manualNote,
    boarding: flags.boarding,
    driverPhoneGps: flags.driverPhoneGps,
    vehicleGps: flags.vehicleGps,
    gpsSignal: flags.gpsSignal,
    serviceEvaluationSeen: flags.serviceEvaluationSeen,
    feedbackSeen: flags.feedbackSeen,
    needsReview: flags.needsReview,
    providerCount: flags.providerCount,
    completedServices: flags.completedServices,
    pendingEvaluation: flags.pendingEvaluation,
    evaluationCount: flags.evaluationCount,
  };
}

export function buildQualityProofSignalSummary(input = {}) {
  const checklist = Array.isArray(input.checklist) ? input.checklist : buildQualityReadinessChecklist(input);
  const readiness = buildProviderComparisonReadiness({ ...input, checklist });
  const signals = checklist
    .filter((item) => Boolean(item?.done))
    .slice(0, 10)
    .map((item) => ({
      id: normalizeQualitySignal(item?.id || item?.signalId || item?.type || item?.code || item?.key || item?.label) || String(item?.id || item?.label || ""),
      label: cleanText(item?.label, String(item?.id || "")),
      count: asCount(item?.count) || 1,
      note: cleanText(item?.note, ""),
    }));

  return {
    version: QUALITY_PROOF_SIGNAL_VERSION,
    status: readiness.status,
    title: "Kalite puanı hazırlığı",
    summaryText: readiness.summaryText,
    checklist,
    signals,
    nextAction: readiness.nextAction,
    nonFinalText: "Bu bilgi tek başına kalite puanı değildir. Kesin puan değildir.",
  };
}
