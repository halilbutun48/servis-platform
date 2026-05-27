import {
  buildSourceEvidence,
  buildAgreementLineageSummary,
  classifyAgreementSource,
  getLineageConfidence,
  hasBillableSeferPaktLineage,
  hasBillableLineageSignal,
  inferAgreementSourceLineage,
} from "./agreementSourceLineageService.js";

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

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundTo(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function formatMoneyTR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function normalizeSourceType(value) {
  const text = compactText(value, "").replace(/[\s-]+/g, "_").toUpperCase();
  if (!text) return "";
  if (["EXISTING_IMPORTED", "MANUAL_INTERNAL", "PILOT_FREE", "SEFERPAKT_NEW", "SEFERPAKT_RENEWAL", "INSUFFICIENT_LINEAGE"].includes(text)) {
    return text;
  }
  if (["EXISTING", "IMPORTED", "LEGACY", "MIGRATED"].includes(text)) return "EXISTING_IMPORTED";
  if (["MANUAL", "MANUAL_ENTRY", "INTERNAL", "INTERNAL_MANUAL"].includes(text)) return "MANUAL_INTERNAL";
  if (["PILOT", "PILOT_FREE", "FREE_PILOT"].includes(text)) return "PILOT_FREE";
  if (["NEW", "SEFERPAKT", "SEFERPAKT_NEW", "SOURCE_SHIFT", "SHIFT_SERIES", "LINEAGED"].includes(text)) return "SEFERPAKT_NEW";
  if (["RENEWAL", "EXTEND", "EXTENSION", "SEFERPAKT_RENEWAL"].includes(text)) return "SEFERPAKT_RENEWAL";
  if (["INSUFFICIENT", "INSUFFICIENT_DATA", "INSUFFICIENT_LINEAGE", "UNKNOWN"].includes(text)) return "INSUFFICIENT_LINEAGE";
  return "";
}

function normalizeCommercialSources(input = {}) {
  const commercialSources = Array.isArray(input.commercialSources)
    ? input.commercialSources
    : Array.isArray(input.agreement?.commercialSources)
      ? input.agreement.commercialSources
      : [];
  return commercialSources.filter((row) => row && typeof row === "object");
}

function selectAgreementAmount(input = {}) {
  const agreement = input.agreement && typeof input.agreement === "object" ? input.agreement : null;
  const candidates = [
    input.contractAmount,
    input.agreementAmount,
    input.amount,
    input.companyOfferAmount,
    input.roomOfferAmount,
    input.extendOfferAmount,
    input.extendCounterAmount,
    agreement?.companyOfferAmount,
    agreement?.roomOfferAmount,
    agreement?.extendOfferAmount,
    agreement?.extendCounterAmount,
  ];
  for (const candidate of candidates) {
    const value = toNumber(candidate);
    if (value != null && value > 0) return value;
  }
  return null;
}

function hasRenewalSignal(input = {}) {
  const agreement = input.agreement && typeof input.agreement === "object" ? input.agreement : null;
  const extendStatus = compactText(input.extendStatus || agreement?.extendStatus || "", "").toUpperCase();
  return Boolean(
    extendStatus && extendStatus !== "NONE"
    || input.isRenewal
    || agreement?.extendRequestedAt
    || agreement?.extendRequestedEndDate
    || agreement?.extendOfferAmount != null
    || agreement?.extendCounterAmount != null
    || compactText(input.sourceType || input.agreementSource || input.agreementSourceType || "", "").toUpperCase().includes("RENEWAL")
  );
}

function buildLineageSignals(input = {}) {
  const agreement = input.agreement && typeof input.agreement === "object" ? input.agreement : null;
  const sourceTypeHint = normalizeSourceType(
    input.sourceType
    || input.agreementSource
    || input.agreementSourceType
    || input.commercialSourceType
    || (input.existingImported || input.importedExisting ? "EXISTING_IMPORTED" : "")
    || ""
  );
  const manual = Boolean(input.manualInternal || input.manual || input.manualEntry);
  const pilot = Boolean(input.pilotFree || input.pilot);
  const legacy = Boolean(input.legacy || input.legacySource || sourceTypeHint === "LEGACY");
  const commercialSources = normalizeCommercialSources(input);
  const sourceLineage = inferAgreementSourceLineage(agreement, {
    ...input,
    commercialSources,
    sourceType: sourceTypeHint,
    manualInternal: manual,
    pilotFree: pilot,
    legacy,
  });
  const sourceShiftId = Number(sourceLineage?.sourceShiftId || 0) > 0
    ? Number(sourceLineage.sourceShiftId)
    : Number(
      input.sourceShiftId
      || input.bridge?.sourceShiftId
      || input.sourceShift?.shift?.id
      || input.sourceShift?.id
      || 0
    ) || 0;
  const marketShiftId = Number(sourceLineage?.marketShiftId || 0) > 0
    ? Number(sourceLineage.marketShiftId)
    : Number(input.marketShiftId || input.marketShift?.id || input.marketShift?.shiftRootId || 0) || 0;
  const organizationPlanId = Number(sourceLineage?.organizationPlanId || 0) > 0
    ? Number(sourceLineage.organizationPlanId)
    : Number(input.organizationPlanId || input.organizationPlan?.id || agreement?.organizationPlanId || 0) || 0;
  const selectedOfferId = Number(sourceLineage?.selectedOfferId || 0) > 0
    ? Number(sourceLineage.selectedOfferId)
    : Number(input.selectedOfferId || input.selectedOffer?.id || input.offerId || 0) || 0;
  const roomId = Number(sourceLineage?.roomId || 0) > 0
    ? Number(sourceLineage.roomId)
    : Number(input.roomId || agreement?.roomId || input.marketShift?.roomId || 0) || 0;
  const sourceSummary = compactText(
    sourceLineage?.sourceSummary
    || input.sourceSummary
    || input.bridge?.sourceSummary
    || input.sourceShift?.sourceSummary
    || input.marketShift?.sourceSummary
    || "",
  );
  const hasSupportLineageSignal = Boolean(
    sourceLineage?.hasSupportLineageSignal
    || sourceLineage?.hasLineageSignal
    || sourceLineage?.sourceSignals?.hasSupportLineageSignal
    || sourceLineage?.sourceSignals?.hasLineageSignal
    || sourceShiftId > 0
    || marketShiftId > 0
    || organizationPlanId > 0
    || selectedOfferId > 0
    || sourceSummary
    || commercialSources.length > 0
  );
  const hasBillableSignal = Boolean(
    sourceLineage?.hasBillableLineageSignal
    || sourceLineage?.sourceSignals?.hasBillableLineageSignal
    || hasBillableLineageSignal({
      sourceShiftId,
      marketShiftId,
      selectedOfferId,
      commercialSources,
    })
  );
  const agreementSource = sourceLineage?.agreementSource || classifyAgreementSource({
    ...sourceLineage,
    sourceShiftId,
    marketShiftId,
    organizationPlanId,
    selectedOfferId,
    roomId,
    sourceSummary,
    billableByMarketplacePolicy: Boolean(sourceLineage?.billableByMarketplacePolicy || hasBillableSignal),
    agreementStatus: input.agreementStatus || agreement?.status || "",
  });

  const sourceConfidence = sourceLineage?.confidence
    || getLineageConfidence({
      sourceType: agreementSource,
      agreementSource,
      sourceShiftId,
      marketShiftId,
      organizationPlanId,
      sourceSummary,
      billableByMarketplacePolicy: Boolean(sourceLineage?.billableByMarketplacePolicy || hasBillableSignal),
      isRenewal: agreementSource === "SEFERPAKT_RENEWAL",
      isManual: agreementSource === "MANUAL_INTERNAL",
      isPilot: agreementSource === "PILOT_FREE",
      isLegacy: agreementSource === "LEGACY",
      isImported: agreementSource === "EXISTING_IMPORTED",
      isInsufficient: agreementSource === "INSUFFICIENT_LINEAGE",
    });

  const missingSignals = compactList(sourceLineage?.missingSignals || [
    sourceShiftId > 0 ? "" : "sourceShiftId",
    marketShiftId > 0 ? "" : "marketShiftId",
    organizationPlanId > 0 ? "" : "organizationPlanId",
    selectedOfferId > 0 ? "" : "selectedOfferId",
    sourceSummary ? "" : "sourceSummary",
    commercialSources.length > 0 ? "" : "commercialSource",
  ], 6);

  const sourceEvidence = compactList(
    sourceLineage?.sourceEvidence?.length
      ? sourceLineage.sourceEvidence
      : buildSourceEvidence({
          sourceShiftId: sourceShiftId > 0 ? sourceShiftId : null,
          marketShiftId: marketShiftId > 0 ? marketShiftId : null,
          organizationPlanId: organizationPlanId > 0 ? organizationPlanId : null,
          selectedOfferId: selectedOfferId > 0 ? selectedOfferId : null,
          sourceSummary,
          commercialSourceCount: commercialSources.length,
          hasLineageSignal: hasSupportLineageSignal,
          hasBillableLineageSignal: hasBillableSignal,
          hasRenewal: hasRenewalSignal({ ...input, agreement }),
          isManual: agreementSource === "MANUAL_INTERNAL",
          isPilot: agreementSource === "PILOT_FREE",
          isLegacy: agreementSource === "LEGACY",
          isImported: agreementSource === "EXISTING_IMPORTED",
          isInsufficient: agreementSource === "INSUFFICIENT_LINEAGE",
          billableByMarketplacePolicy: Boolean(sourceLineage?.billableByMarketplacePolicy),
          missingSignals,
        }),
    8,
  );

  const billableByMarketplacePolicy = Boolean(
    sourceLineage?.billableByMarketplacePolicy
    || hasBillableSeferPaktLineage({
      ...sourceLineage,
      sourceType: agreementSource,
      sourceShiftId,
      marketShiftId,
      organizationPlanId,
      selectedOfferId,
      roomId,
      sourceSummary,
      missingSignals,
    })
  );

  return {
    agreementSource,
    sourceConfidence,
    hasLineageSignal: hasSupportLineageSignal,
    hasSupportLineageSignal,
    hasBillableLineageSignal: hasBillableSignal,
    sourceShiftId: sourceShiftId > 0 ? sourceShiftId : null,
    marketShiftId: marketShiftId > 0 ? marketShiftId : null,
    organizationPlanId: organizationPlanId > 0 ? organizationPlanId : null,
    selectedOfferId: selectedOfferId > 0 ? selectedOfferId : null,
    roomId: roomId > 0 ? roomId : null,
    sourceSummary,
    sourceEvidence,
    commercialSources,
    commercialSourceCount: commercialSources.length,
    isRenewal: agreementSource === "SEFERPAKT_RENEWAL",
    isManual: agreementSource === "MANUAL_INTERNAL",
    isPilot: agreementSource === "PILOT_FREE",
    isLegacy: agreementSource === "LEGACY",
    isImported: agreementSource === "EXISTING_IMPORTED",
    isInsufficient: agreementSource === "INSUFFICIENT_LINEAGE",
    sourceLineage: {
      ...(sourceLineage || {}),
      sourceType: agreementSource,
      agreementSource,
      confidence: sourceConfidence,
      billableByMarketplacePolicy,
      hasSupportLineageSignal,
      hasBillableLineageSignal: hasBillableSignal,
      sourceShiftId: sourceShiftId > 0 ? sourceShiftId : null,
      marketShiftId: marketShiftId > 0 ? marketShiftId : null,
      organizationPlanId: organizationPlanId > 0 ? organizationPlanId : null,
      selectedOfferId: selectedOfferId > 0 ? selectedOfferId : null,
      roomId: roomId > 0 ? roomId : null,
      sourceSummary,
      sourceEvidence,
      missingSignals,
      lineageSummary: compactText(
        sourceLineage?.lineageSummary
        || buildAgreementLineageSummary({
          sourceType: agreementSource,
          sourceShiftId,
          marketShiftId,
          organizationPlanId,
          selectedOfferId,
          sourceSummary,
          missingSignals,
          billableByMarketplacePolicy,
          isRenewal: agreementSource === "SEFERPAKT_RENEWAL",
          isManual: agreementSource === "MANUAL_INTERNAL",
          isPilot: agreementSource === "PILOT_FREE",
          isLegacy: agreementSource === "LEGACY",
          isImported: agreementSource === "EXISTING_IMPORTED",
          isInsufficient: agreementSource === "INSUFFICIENT_LINEAGE",
        }),
        "Kaynak vardiya zinciri bulunamadı; mevcut/taşınmış kabul edilir.",
      ),
    },
    billableByMarketplacePolicy,
    missingSignals,
  };
}

function levelFromScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) {
    return { band: "INSUFFICIENT_DATA", label: "Yetersiz veri", reviewRequired: false };
  }
  if (n >= 4.7) return { band: "ELITE", label: "Elit", reviewRequired: false };
  if (n >= 4.3) return { band: "GOOD", label: "İyi", reviewRequired: false };
  if (n >= 3.8) return { band: "STANDARD", label: "Standart", reviewRequired: false };
  if (n >= 3.3) return { band: "RISKY", label: "Riskli", reviewRequired: false };
  return { band: "CRITICAL", label: "Kritik", reviewRequired: true };
}

export function computeSuccessShareRateBySeferScore(score, { renewal = false } = {}) {
  const classification = levelFromScore(score);
  if (classification.band === "INSUFFICIENT_DATA") {
    return {
      rate: 0,
      rateLabel: "SeferPuanı yeterli değil",
      band: classification.band,
      bandLabel: classification.label,
      reviewRequired: false,
      score: null,
    };
  }

  const rates = renewal
    ? { ELITE: 1, GOOD: 1.25, STANDARD: 1.5, RISKY: 1.75, CRITICAL: 2 }
    : { ELITE: 1, GOOD: 1.5, STANDARD: 2, RISKY: 2.5, CRITICAL: 3 };
  const rate = Number(rates[classification.band] ?? 0);
  const rateLabel = rate > 0 ? `%${String(rate).replace(/\.0+$/, "")}` : "Başarı payı doğmaz";
  return {
    rate,
    rateLabel,
    band: classification.band,
    bandLabel: classification.label,
    reviewRequired: classification.reviewRequired,
    score: Number(score),
  };
}

export function inferAgreementSourcePreview(input = {}) {
  return buildLineageSignals(input);
}

export function buildPlatformFeeReason(result = {}) {
  const agreementSource = compactText(result?.agreementSource || "", "INSUFFICIENT_LINEAGE");
  const licenseFeeText = compactText(result?.licenseFeeText || "0 TL", "0 TL");
  const shareRateLabel = compactText(result?.successShareRateLabel || "Başarı payı doğmaz", "Başarı payı doğmaz");
  const scoreText = compactText(result?.seferScoreText || result?.seferScoreUsed?.summaryText || "", "");
  if (["EXISTING_IMPORTED", "MANUAL_INTERNAL", "PILOT_FREE", "INSUFFICIENT_LINEAGE"].includes(agreementSource)) {
    return `Lisans ücreti ${licenseFeeText}'dir ve mevcut/taşınmış kayıt için başarı payı doğmaz. Sadece önizleme — tahsilat/fatura oluşturulmaz.`;
  }
  if (agreementSource === "LEGACY") {
    return `Lisans ücreti ${licenseFeeText}'dir ve eski sistem kaydı için başarı payı doğmaz. Sadece önizleme — tahsilat/fatura oluşturulmaz.`;
  }
  if (agreementSource === "SEFERPAKT_NEW" || agreementSource === "SEFERPAKT_RENEWAL") {
    const scorePart = scoreText ? ` SeferPuanı: ${scoreText}.` : "";
    const reviewPart = result?.reviewRequired ? " İnceleme gerekli." : "";
    return `Lisans ücreti ${licenseFeeText}'dir; SeferPakt kaynaklı ${agreementSource === "SEFERPAKT_RENEWAL" ? "yenileme" : "yeni"} kayıt için başarı payı yalnızca önizlenir.${scorePart}${reviewPart} ${shareRateLabel}. Sadece önizleme — tahsilat/fatura oluşturulmaz.`;
  }
  return `Lisans ücreti ${licenseFeeText}'dir; başarı payı yalnızca önizlenir. Sadece önizleme — tahsilat/fatura oluşturulmaz.`;
}

export function buildMarketplaceFreeToOperateSummary(result = {}) {
  const readonlyBoundary = "Sadece önizleme — tahsilat/fatura oluşturulmaz.";
  const parts = [
    compactText(result?.licenseFeeText || "Lisans ücreti: 0 TL"),
    compactText(result?.agreementSourceLabel || result?.agreementSource || "Kaynak durumu belirsiz"),
    compactText(result?.sourceConfidence ? `Güven: ${result.sourceConfidence}` : ""),
    compactText(result?.sourceSummary || ""),
    compactText(result?.seferScoreText || ""),
    compactText(result?.successShareRateLabel || ""),
    compactText(result?.estimatedSuccessShareText || ""),
    compactText(result?.summaryHint || ""),
  ].filter(Boolean);
  const detail = compactText(parts.join(" • "), "");
  return compactText(detail ? `${detail} • ${readonlyBoundary}` : readonlyBoundary, readonlyBoundary);
}

export function computePlatformFeePreview(input = {}) {
  const agreement = input.agreement && typeof input.agreement === "object" ? input.agreement : null;
  const sourcePreview = inferAgreementSourcePreview(input);
  const seferScorePreview = input.seferScorePreview && typeof input.seferScorePreview === "object"
    ? input.seferScorePreview
    : null;
  const scoreValue = Number(
    input.seferScoreValue
    ?? seferScorePreview?.score
    ?? input.score
    ?? NaN
  );
  const scoreText = Number.isFinite(scoreValue)
    ? `${scoreValue.toFixed(2)} / ${Number(input.seferScoreMax ?? seferScorePreview?.scoreMax ?? 5).toFixed(0)}`
    : compactText(seferScorePreview?.summaryText || seferScorePreview?.safeExplanation || "SeferPuanı yeterli değil", "SeferPuanı yeterli değil");
  const amount = selectAgreementAmount({
    agreement,
    contractAmount: input.contractAmount,
    agreementAmount: input.agreementAmount,
    amount: input.amount,
    companyOfferAmount: input.companyOfferAmount,
    roomOfferAmount: input.roomOfferAmount,
    extendOfferAmount: input.extendOfferAmount,
    extendCounterAmount: input.extendCounterAmount,
  });
  const amountText = amount != null ? `${formatMoneyTR(amount)} TL` : "Tutar bulunamadı";
  const sourceType = sourcePreview.agreementSource;
  const shouldPreviewShare = Boolean(
    sourcePreview.billableByMarketplacePolicy
    && (sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL")
  );
  const ratePreview = shouldPreviewShare
    ? computeSuccessShareRateBySeferScore(scoreValue, { renewal: sourceType === "SEFERPAKT_RENEWAL" })
    : {
        rate: 0,
        rateLabel: "Başarı payı doğmaz",
        band: "NOT_APPLICABLE",
        bandLabel: "Uygulanmaz",
        reviewRequired: false,
        score: Number.isFinite(scoreValue) ? scoreValue : null,
      };
  const estimatedSuccessShare = amount != null && ratePreview.rate > 0
    ? roundTo((amount * ratePreview.rate) / 100, 0)
    : 0;
  const estimatedSuccessShareText = amount != null
    ? `${formatMoneyTR(estimatedSuccessShare)} TL`
    : "Tutar bulunamadı";
  const agreementSourceLabelMap = {
    EXISTING_IMPORTED: "Mevcut / taşınmış kayıt",
    MANUAL_INTERNAL: "Manuel iç kayıt",
    PILOT_FREE: "Pilot ücretsiz kayıt",
    LEGACY: "Eski kayıt",
    SEFERPAKT_NEW: "SeferPakt kaynaklı yeni sözleşme",
    SEFERPAKT_RENEWAL: "SeferPakt kaynaklı yenileme",
    INSUFFICIENT_LINEAGE: "Kaynak zinciri eksik",
  };
  const summaryHint = sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL"
    ? `SeferPuanı ${scoreText} nedeniyle ${ratePreview.rateLabel} önizleniyor.`
    : "Bu kayıt mevcut / manuel / pilot / eski / taşınmış görünüyor; başarı payı doğmaz.";
  const result = {
    previewOnly: true,
    licenseFee: 0,
    licenseFeeText: "0 TL",
    agreementSource: sourceType,
    agreementSourceLabel: agreementSourceLabelMap[sourceType] || agreementSourceLabelMap.INSUFFICIENT_LINEAGE,
    sourceConfidence: sourcePreview.sourceConfidence,
    sourceShiftId: sourcePreview.sourceShiftId,
    marketShiftId: sourcePreview.marketShiftId,
    organizationPlanId: sourcePreview.organizationPlanId,
    selectedOfferId: sourcePreview.selectedOfferId,
    roomId: sourcePreview.roomId,
    sourceSummary: sourcePreview.sourceSummary,
    sourceEvidence: sourcePreview.sourceEvidence,
    sourceLineage: sourcePreview.sourceLineage,
    sourceSignals: {
      hasLineageSignal: sourcePreview.hasLineageSignal,
      hasSupportLineageSignal: sourcePreview.hasSupportLineageSignal,
      hasBillableLineageSignal: sourcePreview.hasBillableLineageSignal,
      billableByMarketplacePolicy: sourcePreview.billableByMarketplacePolicy,
      commercialSourceCount: sourcePreview.commercialSourceCount,
      sourceShiftId: sourcePreview.sourceShiftId,
      marketShiftId: sourcePreview.marketShiftId,
      organizationPlanId: sourcePreview.organizationPlanId,
      selectedOfferId: sourcePreview.selectedOfferId,
      roomId: sourcePreview.roomId,
      isRenewal: sourcePreview.isRenewal,
      isManual: sourcePreview.isManual,
      isPilot: sourcePreview.isPilot,
      isImported: sourcePreview.isImported,
      isInsufficient: sourcePreview.isInsufficient,
      missingSignals: sourcePreview.missingSignals,
    },
    agreementAmount: amount,
    agreementAmountText: amountText,
    successShareRate: ratePreview.rate,
    successShareRateLabel: ratePreview.rate > 0 ? `${String(ratePreview.rate).replace(/\.0+$/, "")}%` : ratePreview.rateLabel,
    successShareBand: ratePreview.band,
    successShareBandLabel: ratePreview.bandLabel,
    estimatedSuccessShare,
    estimatedSuccessShareText,
    payableNow: false,
    canInvoice: false,
    canCollect: false,
    reviewRequired: Boolean(ratePreview.reviewRequired),
    seferScoreUsed: {
      score: Number.isFinite(scoreValue) ? scoreValue : null,
      scoreMax: Number(input.seferScoreMax ?? seferScorePreview?.scoreMax ?? 5) || 5,
      summaryText: scoreText,
      level: compactText(input.seferScoreLevel || seferScorePreview?.level || "", ""),
      confidence: compactText(input.seferScoreConfidence || seferScorePreview?.confidence || "", ""),
      status: compactText(input.seferScoreStatus || seferScorePreview?.status || "", ""),
    },
    reason: buildPlatformFeeReason({
      agreementSource: sourceType,
      licenseFeeText: "0 TL",
      successShareRateLabel: ratePreview.rateLabel,
      seferScoreText: scoreText,
      reviewRequired: Boolean(ratePreview.reviewRequired),
    }),
    lineageSummary: compactText(
      sourcePreview.sourceLineage?.lineageSummary
      || sourcePreview.lineageSummary
      || sourcePreview.sourceEvidence.join(" • "),
      sourcePreview.sourceSummary || "Kaynak vardiyası sinyali yok",
    ),
    safeExplanation: sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL"
      ? `Lisans ücreti yoktur. Bu kayıt SeferPakt kaynaklı ${sourceType === "SEFERPAKT_RENEWAL" ? "yenileme" : "yeni"} göründüğü için başarı payı yalnızca önizlenir. Tahsilat/fatura oluşturulmaz.`
      : `Lisans ücreti yoktur. Bu kayıt ${sourceType === "LEGACY" ? "eski sistem kaydı" : "mevcut/taşınmış"} göründüğü için başarı payı doğmaz. Tahsilat/fatura oluşturulmaz.`,
    summaryHint,
  };
  result.summaryText = buildMarketplaceFreeToOperateSummary(result);
  return result;
}
