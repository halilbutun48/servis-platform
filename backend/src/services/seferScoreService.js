import { buildAgreementQualityPaymentBridgePreview } from "./qualityPaymentBridgeService.js";

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
  const text = String((value ?? fallback) || "").trim().toUpperCase();
  return text || String(fallback || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function clampNumber(value, min = 0, max = 5, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function roundTo(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function statusToSeferStatus(value, rawText = "") {
  const status = upper(value || rawText || "");
  if (!status) return "UNKNOWN";
  if (["READY", "GOOD", "OK", "CLEAR", "REVIEWED", "DONE", "COMPLETED", "ON_TIME", "FULL", "COMPLETE", "ACTIVE", "VALID"].includes(status)) return "GOOD";
  if (["PARTIAL", "WEAK", "RISK", "RISKY", "LATE", "DELAYED", "NEEDS_REVIEW", "NEEDS_RECHECK", "WARNING", "HOLD", "NEEDS_PROOF", "MISSING_PROOF", "ISSUE"].includes(status)) return "WEAK";
  if (["MISSING", "NONE", "N/A", "NA", "ABSENT", "EMPTY", "NOT_AVAILABLE"].includes(status)) return "MISSING";
  if (["UNKNOWN", "UNSURE", "UNAVAILABLE", "INSUFFICIENT_DATA", "NULL", "-"].includes(status)) return "UNKNOWN";

  const text = normalizeText(rawText || status);
  if (/(hazır|hazir|var|aktif|güçlü|guçlu|iyi|tamam|completed|done|ready|ok|clear|reviewed|on time|zamanında|zamaninda)/.test(text)) return "GOOD";
  if (/(eksik|yok|belirsiz|unknown|risk|riskli|zayıf|zayif|gecik|late|delay|problem|issue|warning|hold|kontrol|kısmi|kismi|partial)/.test(text)) return "WEAK";
  if (/(yok|eksik|boş|bos|absent|missing|none)/.test(text)) return "MISSING";
  return "UNKNOWN";
}

function factorForStatus(status, def = {}) {
  const map = def?.factors || {};
  const fallbackMap = {
    GOOD: 1,
    WEAK: 0.35,
    MISSING: 0,
    UNKNOWN: 0.15,
  };
  return Number.isFinite(Number(map[status])) ? Number(map[status]) : fallbackMap[status] ?? 0;
}

function normalizeSupplierLabel(input = {}) {
  const agreement = input.agreement && typeof input.agreement === "object" ? input.agreement : null;
  const company = input.company && typeof input.company === "object" ? input.company : agreement?.company || null;
  const room = input.room && typeof input.room === "object" ? input.room : agreement?.room || null;
  return compactText(
    input.supplierLabel
    || input.companyLabel
    || company?.name
    || agreement?.company?.name
    || room?.name
    || input.roomLabel
    || "Tedarikçi",
    "Tedarikçi",
  );
}

function normalizeAgreementLabel(input = {}) {
  const agreement = input.agreement && typeof input.agreement === "object" ? input.agreement : null;
  const agreementId = Number(input.agreementId || agreement?.id || 0);
  return compactText(
    input.agreementLabel
    || (agreementId > 0 ? `Sözleşme #${agreementId}` : "Sözleşme"),
    "Sözleşme",
  );
}

function rawSignalObject(source = null, key = "") {
  if (!source || typeof source !== "object") return null;
  const direct = source[key];
  if (direct != null) {
    if (typeof direct === "object") return direct;
    return { status: direct };
  }
  const compactKey = String(key || "").replace(/Signal$/u, "");
  const alt = source[compactKey];
  if (alt != null) {
    if (typeof alt === "object") return alt;
    return { status: alt };
  }
  return null;
}

function signalReasonFromRaw(raw = null, fallback = "") {
  return compactText(
    raw?.reason
    || raw?.note
    || raw?.message
    || raw?.detail
    || raw?.summary
    || raw?.text
    || raw?.value
    || fallback,
    fallback,
  );
}

function buildSignalEntry(def = {}, raw = null) {
  const rawStatus = upper(raw?.status || raw?.state || raw?.value || raw?.label || raw?.text || "");
  const status = statusToSeferStatus(rawStatus, rawStatus);
  const reasonMap = {
    GOOD: compactText(signalReasonFromRaw(raw, def.goodReason), def.goodReason),
    WEAK: compactText(signalReasonFromRaw(raw, def.weakReason), def.weakReason),
    MISSING: compactText(signalReasonFromRaw(raw, def.missingReason), def.missingReason),
    UNKNOWN: compactText(signalReasonFromRaw(raw, def.unknownReason), def.unknownReason),
  };
  const factor = factorForStatus(status, def);
  const weight = Number(def.weight || 0);
  const contribution = roundTo((weight / 100) * 5 * factor, 2);
  return {
    status,
    weight,
    contribution,
    reason: reasonMap[status] || def.missingReason || def.unknownReason || "",
    sourceStatus: rawStatus || "",
  };
}

const SIGNAL_DEFINITIONS = [
  {
    key: "onTimeSignal",
    label: "Zamanında hizmet",
    weight: 20,
    category: "support",
    goodReason: "Zamanında hizmet sinyali güçlü.",
    weakReason: "Zamanlama sinyali zayıf veya kısmi.",
    missingReason: "Zamanında hizmet sinyali görünmüyor.",
    unknownReason: "Zamanlama verisi okunamadı.",
    factors: { GOOD: 1, WEAK: 0.4, MISSING: 0, UNKNOWN: 0.15 },
  },
  {
    key: "gpsProofSignal",
    label: "GPS kanıtı",
    weight: 18,
    category: "support",
    goodReason: "GPS kanıtı doğrulanmış.",
    weakReason: "GPS kanıtı kısmi veya zayıf.",
    missingReason: "GPS kanıtı görünmüyor.",
    unknownReason: "GPS kanıtı okunamadı.",
    factors: { GOOD: 1, WEAK: 0.35, MISSING: 0, UNKNOWN: 0.15 },
  },
  {
    key: "completionSignal",
    label: "Görev tamamlama",
    weight: 22,
    category: "support",
    goodReason: "Görev tamamlama sinyali güçlü.",
    weakReason: "Görev tamamlama sinyali kısmi.",
    missingReason: "Görev tamamlama sinyali görünmüyor.",
    unknownReason: "Görev tamamlama verisi okunamadı.",
    factors: { GOOD: 1, WEAK: 0.45, MISSING: 0, UNKNOWN: 0.15 },
  },
  {
    key: "complaintSignal",
    label: "Şikâyet sinyali",
    weight: 15,
    category: "risk",
    goodReason: "Şikâyet veya issue görünmüyor.",
    weakReason: "Şikâyet / issue riski var.",
    missingReason: "Şikâyet sinyali görünmüyor.",
    unknownReason: "Şikâyet verisi okunamadı.",
    factors: { GOOD: 1, WEAK: 0.08, MISSING: 0.15, UNKNOWN: 0.12 },
  },
  {
    key: "disputeSignal",
    label: "İtiraz sinyali",
    weight: 10,
    category: "risk",
    goodReason: "İtiraz görünmüyor.",
    weakReason: "İtiraz veya anlaşmazlık riski var.",
    missingReason: "İtiraz sinyali görünmüyor.",
    unknownReason: "İtiraz verisi okunamadı.",
    factors: { GOOD: 1, WEAK: 0.1, MISSING: 0.15, UNKNOWN: 0.12 },
  },
  {
    key: "documentSignal",
    label: "Doküman sinyali",
    weight: 10,
    category: "support",
    goodReason: "Doküman desteği yeterli.",
    weakReason: "Doküman desteği kısmi.",
    missingReason: "Doküman sinyali görünmüyor.",
    unknownReason: "Doküman verisi okunamadı.",
    factors: { GOOD: 1, WEAK: 0.4, MISSING: 0, UNKNOWN: 0.15 },
  },
  {
    key: "qualityReviewSignal",
    label: "Kalite incelemesi",
    weight: 5,
    category: "support",
    goodReason: "Kalite incelemesi destekleyici.",
    weakReason: "Kalite incelemesi risk veya re-check sinyali veriyor.",
    missingReason: "Kalite incelemesi görünmüyor.",
    unknownReason: "Kalite incelemesi verisi okunamadı.",
    factors: { GOOD: 1, WEAK: 0.25, MISSING: 0, UNKNOWN: 0.15 },
  },
];

function normalizeSeferScoreSignals(input = {}) {
  const qualityPaymentBridgePreview = input.qualityPaymentBridgePreview && typeof input.qualityPaymentBridgePreview === "object"
    ? input.qualityPaymentBridgePreview
    : null;
  const directSignals = input.seferScoreSignalsPreview && typeof input.seferScoreSignalsPreview === "object"
    ? input.seferScoreSignalsPreview
    : null;
  const bridgeSignals = qualityPaymentBridgePreview?.seferScoreSignalsPreview && typeof qualityPaymentBridgePreview.seferScoreSignalsPreview === "object"
    ? qualityPaymentBridgePreview.seferScoreSignalsPreview
    : null;
  const sourceSignals = directSignals || bridgeSignals || null;
  const signalSource = directSignals ? "direct" : bridgeSignals ? "qualityPaymentBridgePreview" : "fallback";
  const agreementLabel = normalizeAgreementLabel(input);
  const supplierLabel = normalizeSupplierLabel(input);
  const proofCompleteness = Number.isFinite(Number(input.proofCompleteness))
    ? Number(input.proofCompleteness)
    : Number(qualityPaymentBridgePreview?.proofCompleteness ?? NaN);

  const signalBreakdown = {};
  for (const def of SIGNAL_DEFINITIONS) {
    const raw = rawSignalObject(sourceSignals, def.key) || rawSignalObject(qualityPaymentBridgePreview?.seferScoreSignalsPreview, def.key);
    signalBreakdown[def.key] = buildSignalEntry(def, raw);
  }

  const evidenceSignals = Object.values(signalBreakdown).filter((entry) => entry.status === "GOOD" || entry.status === "WEAK");
  const anyRawSignal = Boolean(sourceSignals || qualityPaymentBridgePreview?.seferScoreSignalsPreview);

  return {
    agreementLabel,
    supplierLabel,
    proofCompleteness,
    signalSource,
    hasSourceSignals: anyRawSignal,
    evidenceSignalCount: evidenceSignals.length,
    signalBreakdown,
    qualityPaymentBridgePreview,
  };
}

function classifySeferScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) {
    return {
      level: "INSUFFICIENT_DATA",
      levelLabel: "Yetersiz veri",
    };
  }
  if (n >= 4.7) return { level: "ELITE", levelLabel: "Elit" };
  if (n >= 4.3) return { level: "GOOD", levelLabel: "İyi" };
  if (n >= 3.8) return { level: "STANDARD", levelLabel: "Standart" };
  if (n >= 3.3) return { level: "RISKY", levelLabel: "Riskli" };
  return { level: "CRITICAL", levelLabel: "Kritik" };
}

function buildSeferScoreReasons(signals = {}) {
  const positiveReasons = [];
  const riskReasons = [];
  const missingSignals = [];

  for (const def of SIGNAL_DEFINITIONS) {
    const signal = signals?.[def.key] || {};
    const reason = compactText(signal.reason || "", "");
    if (signal.status === "GOOD") {
      positiveReasons.push(reason || def.goodReason);
      continue;
    }
    if (signal.status === "WEAK") {
      if (def.category === "risk") {
        riskReasons.push(reason || def.weakReason);
      } else {
        missingSignals.push(def.label);
      }
      continue;
    }
    if (signal.status === "MISSING") {
      missingSignals.push(def.label);
      continue;
    }
    if (signal.status === "UNKNOWN") {
      missingSignals.push(def.label);
    }
  }

  return {
    positiveReasons: compactList(positiveReasons, 6),
    riskReasons: compactList(riskReasons, 6),
    missingSignals: compactList(missingSignals, 6),
  };
}

function buildSeferScoreNextBestAction(result = {}) {
  const status = upper(result.status || "", "INSUFFICIENT_DATA");
  if (status === "READY") {
    return "Readonly önizlemeyi kontrol et; son kararı yetkili kullanıcı verir.";
  }
  if (status === "RISKY") {
    return "Risk nedenlerini ve eksik sinyalleri kontrol et; önce kanıt boşluklarını kapat.";
  }
  if (status === "NEEDS_MORE_PROOF") {
    return "Önce eksik sinyalleri ve kanıtları tamamla; sonra önizlemeyi yeniden oku.";
  }
  return "Önce zamanında hizmet, GPS kanıtı, görev tamamlama, belge ve kalite sinyallerini topla.";
}

async function resolveQualityPaymentBridgePreview(input = {}) {
  if (input.qualityPaymentBridgePreview && typeof input.qualityPaymentBridgePreview === "object") {
    return input.qualityPaymentBridgePreview;
  }
  if (input.seferScoreSignalsPreview && typeof input.seferScoreSignalsPreview === "object") {
    return null;
  }
  if (input.agreement && typeof input.agreement === "object") {
    try {
      return await buildAgreementQualityPaymentBridgePreview({ agreement: input.agreement });
    } catch {
      return null;
    }
  }
  return null;
}

export async function computeSeferScorePreview(input = {}) {
  const qualityPaymentBridgePreview = await resolveQualityPaymentBridgePreview(input);
  const normalized = normalizeSeferScoreSignals({
    ...input,
    qualityPaymentBridgePreview,
  });
  const reasons = buildSeferScoreReasons(normalized.signalBreakdown);
  const evidenceSignalCount = normalized.evidenceSignalCount || 0;
  const hasEvidence = evidenceSignalCount > 0;
  const scoreRaw = hasEvidence
    ? Object.values(normalized.signalBreakdown).reduce((sum, signal) => sum + Number(signal?.contribution || 0), 0)
    : 0;
  const score = clampNumber(roundTo(scoreRaw, 2), 0, 5, 0);
  const classification = hasEvidence ? classifySeferScore(score) : { level: "INSUFFICIENT_DATA", levelLabel: "Yetersiz veri" };
  const confidence = !hasEvidence
    ? "PREVIEW"
    : evidenceSignalCount >= 6 && reasons.missingSignals.length === 0
      ? "HIGH"
      : evidenceSignalCount >= 4
        ? "MEDIUM"
        : evidenceSignalCount >= 2
          ? "LOW"
          : "PREVIEW";
  const status = !hasEvidence
    ? "INSUFFICIENT_DATA"
    : reasons.riskReasons.length > 0
      ? "RISKY"
      : reasons.missingSignals.length > 0
        ? "NEEDS_MORE_PROOF"
        : "READY";
  const safeExplanation = "Readonly kalite puanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.";
  const nextBestAction = buildSeferScoreNextBestAction({
    status,
    score,
    level: classification.level,
    positiveReasons: reasons.positiveReasons,
    riskReasons: reasons.riskReasons,
    missingSignals: reasons.missingSignals,
  });
  const summaryText = `SeferPuanı ${score.toFixed(2)} / 5 • ${classification.levelLabel} • Güven: ${confidence === "PREVIEW" ? "Önizleme" : confidence === "LOW" ? "Düşük" : confidence === "MEDIUM" ? "Orta" : "Yüksek"}`;

  return {
    previewOnly: true,
    score,
    scoreMax: 5,
    level: classification.level,
    levelLabel: classification.levelLabel,
    confidence,
    status,
    supplierLabel: normalized.supplierLabel,
    agreementLabel: normalized.agreementLabel,
    signalBreakdown: normalized.signalBreakdown,
    seferScoreSignalsPreview: normalized.signalBreakdown,
    positiveReasons: reasons.positiveReasons,
    riskReasons: reasons.riskReasons,
    missingSignals: reasons.missingSignals,
    nextBestAction,
    safeExplanation,
    summaryText,
    evidenceSignalCount,
    proofCompleteness: Number.isFinite(Number(normalized.proofCompleteness)) ? clampNumber(normalized.proofCompleteness, 0, 100, 0) : null,
    signalSource: normalized.signalSource,
  };
}

export async function buildAgreementSeferScorePreview(input = {}) {
  return computeSeferScorePreview(input);
}

export {
  buildSeferScoreNextBestAction,
  buildSeferScoreReasons,
  classifySeferScore,
  normalizeSeferScoreSignals,
};
