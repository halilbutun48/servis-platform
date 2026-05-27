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

function normalizeAgreementSourceType(value) {
  const text = compactText(value, "").replace(/[\s-]+/g, "_").toUpperCase();
  if (!text) return "";
  if ([
    "EXISTING_IMPORTED",
    "MANUAL_INTERNAL",
    "PILOT_FREE",
    "SEFERPAKT_NEW",
    "SEFERPAKT_RENEWAL",
    "INSUFFICIENT_LINEAGE",
    "LEGACY",
  ].includes(text)) return text;
  if (["EXISTING", "IMPORTED", "MIGRATED", "CURRENT", "CURRENT_IMPORTED", "IMPORTED_EXISTING"].includes(text)) return "EXISTING_IMPORTED";
  if (["MANUAL", "MANUAL_ENTRY", "INTERNAL", "INTERNAL_MANUAL"].includes(text)) return "MANUAL_INTERNAL";
  if (["PILOT", "PILOT_FREE", "FREE_PILOT"].includes(text)) return "PILOT_FREE";
  if (["LEGACY", "LEGACY_IMPORTED", "MIGRATED_LEGACY"].includes(text)) return "LEGACY";
  if (["NEW", "SEFERPAKT", "SEFERPAKT_NEW", "SOURCE_SHIFT", "SHIFT_SERIES", "LINEAGED", "BILLABLE", "BILLABLE_LINEAGE"].includes(text)) return "SEFERPAKT_NEW";
  if (["RENEWAL", "EXTEND", "EXTENSION", "SEFERPAKT_RENEWAL"].includes(text)) return "SEFERPAKT_RENEWAL";
  if (["INSUFFICIENT", "INSUFFICIENT_DATA", "UNKNOWN"].includes(text)) return "INSUFFICIENT_LINEAGE";
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

function isExplicitLineageSource(row = {}) {
  const type = compactText(row?.sourceType || row?.type || row?.commercialSourceType || "", "").toUpperCase();
  if (type === "SHIFT_SERIES") return true;
  if (Number(row?.shiftRootId || 0) > 0) return true;
  if (Number(row?.shiftId || 0) > 0) return true;
  return false;
}

export function hasBillableLineageSignal(input = {}) {
  const commercialSources = normalizeCommercialSources(input);
  const explicitSource = commercialSources.find(isExplicitLineageSource) || null;
  return Boolean(
    Number(input.sourceShiftId || 0) > 0
    || Number(input.marketShiftId || 0) > 0
    || Number(input.selectedOfferId || 0) > 0
    || Number(explicitSource?.shiftRootId || 0) > 0
    || Number(explicitSource?.shiftId || 0) > 0
  );
}

function hasRenewalSignal(input = {}) {
  const agreement = input.agreement && typeof input.agreement === "object" ? input.agreement : null;
  const extendStatus = compactText(input.extendStatus || agreement?.extendStatus || "", "").toUpperCase();
  return Boolean(
    (extendStatus && extendStatus !== "NONE")
    || input.isRenewal
    || agreement?.extendRequestedAt
    || agreement?.extendRequestedEndDate
    || agreement?.extendOfferAmount != null
    || agreement?.extendCounterAmount != null
    || compactText(input.sourceType || input.agreementSource || input.agreementSourceType || "", "").toUpperCase().includes("RENEWAL")
  );
}

function buildSourceEvidence({
  sourceShiftId = null,
  marketShiftId = null,
  organizationPlanId = null,
  selectedOfferId = null,
  sourceSummary = "",
  commercialSourceCount = 0,
  hasLineageSignal = false,
  hasRenewal = false,
  isManual = false,
  isPilot = false,
  isLegacy = false,
  isImported = false,
  isInsufficient = false,
  billableByMarketplacePolicy = false,
  hasBillableLineageSignal = false,
  missingSignals = [],
} = {}) {
  return compactList([
    sourceShiftId ? `Kaynak vardiya #${sourceShiftId}` : "",
    marketShiftId ? `Market shift #${marketShiftId}` : "",
    organizationPlanId ? `Organization plan #${organizationPlanId}` : "",
    selectedOfferId ? `Seçili teklif #${selectedOfferId}` : "",
    sourceSummary ? `Kaynak özeti: ${sourceSummary}` : "",
    hasLineageSignal ? "Kaynak vardiya / market shift sinyali var" : "",
    hasBillableLineageSignal ? "Kaynak vardiya / market shift / teklif zinciri kanıtlı" : "",
    hasRenewal ? "Uzatma / yenileme sinyali var" : "",
    billableByMarketplacePolicy ? "SeferPakt kaynaklı readonly önizleme" : "",
    isManual ? "Manuel iç kayıt" : "",
    isPilot ? "Pilot ücretsiz kayıt" : "",
    isLegacy ? "Legacy kayıt" : "",
    isImported ? "Mevcut / taşınmış kayıt" : "",
    isInsufficient ? "Yetersiz lineage" : "",
    compactList(missingSignals, 4).length ? `Eksik sinyal: ${compactList(missingSignals, 4).join(", ")}` : "",
  ], 8);
}

export {
  buildSourceEvidence,
};

export function getLineageConfidence(lineage = {}) {
  const sourceType = normalizeAgreementSourceType(lineage?.sourceType || lineage?.agreementSource || lineage?.sourceTypeHint || "");
  const sourceShiftId = Number(lineage?.sourceShiftId || 0);
  const marketShiftId = Number(lineage?.marketShiftId || 0);
  const organizationPlanId = Number(lineage?.organizationPlanId || 0);
  const selectedOfferId = Number(lineage?.selectedOfferId || 0);
  const sourceSummary = compactText(lineage?.sourceSummary || "", "");
  const hasBillable = Boolean(lineage?.billableByMarketplacePolicy || hasBillableLineageSignal(lineage));
  if (sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL") {
    if (sourceShiftId > 0 || marketShiftId > 0 || selectedOfferId > 0 || hasBillable) return "HIGH";
    if (organizationPlanId > 0 || sourceSummary) return "MEDIUM";
    return "LOW";
  }
  if (sourceType === "EXISTING_IMPORTED") return sourceSummary ? "MEDIUM" : "LOW";
  if (sourceType === "MANUAL_INTERNAL" || sourceType === "PILOT_FREE" || sourceType === "LEGACY") return "MEDIUM";
  if (sourceType === "INSUFFICIENT_LINEAGE") return "LOW";
  return "LOW";
}

export function classifyAgreementSource(lineage = {}) {
  const sourceType = normalizeAgreementSourceType(lineage?.sourceType || lineage?.agreementSource || lineage?.sourceTypeHint || "");
  const sourceShiftId = Number(lineage?.sourceShiftId || 0);
  const marketShiftId = Number(lineage?.marketShiftId || 0);
  const selectedOfferId = Number(lineage?.selectedOfferId || 0);
  const status = compactText(lineage?.agreementStatus || lineage?.status || "", "").toUpperCase();
  const hasSupportSignal = Boolean(
    sourceShiftId > 0
    || marketShiftId > 0
    || Number(lineage?.organizationPlanId || 0) > 0
    || selectedOfferId > 0
    || compactText(lineage?.sourceSummary || "", "")
    || compactText(lineage?.lineageSummary || "", "")
    || compactText(lineage?.sourceEvidence || "", "")
  );
  const billableSignal = Boolean(lineage?.billableByMarketplacePolicy || hasBillableLineageSignal(lineage));
  if (sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL") {
    if (billableSignal) {
      return sourceType;
    }
    if (["APPROVED", "ACTIVE"].includes(status) && hasSupportSignal) {
      return "EXISTING_IMPORTED";
    }
    return "INSUFFICIENT_LINEAGE";
  }
  if (sourceType) return sourceType;
  if (billableSignal) return lineage?.isRenewal ? "SEFERPAKT_RENEWAL" : "SEFERPAKT_NEW";
  if (lineage?.isManual) return "MANUAL_INTERNAL";
  if (lineage?.isPilot) return "PILOT_FREE";
  if (lineage?.isLegacy) return "LEGACY";
  if (lineage?.isImported) return "EXISTING_IMPORTED";
  if (lineage?.isInsufficient) return "INSUFFICIENT_LINEAGE";
  if (["APPROVED", "ACTIVE"].includes(status) && hasSupportSignal) return "EXISTING_IMPORTED";
  return "INSUFFICIENT_LINEAGE";
}

export function hasBillableSeferPaktLineage(lineage = {}) {
  const sourceType = classifyAgreementSource(lineage);
  return Boolean((lineage?.billableByMarketplacePolicy || hasBillableLineageSignal(lineage)) && (sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL"));
}

export function buildAgreementLineageSummary(lineage = {}) {
  const sourceType = classifyAgreementSource(lineage);
  const sourceShiftId = Number(lineage?.sourceShiftId || 0);
  const marketShiftId = Number(lineage?.marketShiftId || 0);
  const organizationPlanId = Number(lineage?.organizationPlanId || 0);
  const selectedOfferId = Number(lineage?.selectedOfferId || 0);
  const sourceSummary = compactText(lineage?.sourceSummary || "", "");
  const missingSignals = compactList(lineage?.missingSignals || [], 6);
  const sourceTypeLabel = {
    SEFERPAKT_NEW: "SeferPakt kaynaklı yeni sözleşme",
    SEFERPAKT_RENEWAL: "SeferPakt kaynaklı yenileme",
    EXISTING_IMPORTED: "Mevcut / taşınmış kayıt",
    MANUAL_INTERNAL: "Manuel iç kayıt",
    PILOT_FREE: "Pilot ücretsiz kayıt",
    LEGACY: "Legacy kayıt",
    INSUFFICIENT_LINEAGE: "Yetersiz lineage",
  }[sourceType] || sourceType;

  if (sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL") {
    const parts = [
      sourceShiftId ? `Kaynak vardiya #${sourceShiftId}` : "",
      marketShiftId ? `Market shift #${marketShiftId}` : "",
      organizationPlanId ? `Organization plan #${organizationPlanId}` : "",
      selectedOfferId ? `Seçili teklif #${selectedOfferId}` : "",
      sourceSummary ? `Kaynak özeti: ${sourceSummary}` : "",
    ].filter(Boolean);
    const extras = missingSignals.length ? ` • Eksik sinyal: ${missingSignals.join(", ")}` : "";
    return compactText(
      `${parts.join(" • ")} • ${sourceTypeLabel}${extras}`,
      sourceTypeLabel,
    );
  }

  if (sourceType === "EXISTING_IMPORTED") {
    const suffix = missingSignals.length ? ` • Eksik sinyal: ${missingSignals.join(", ")}` : "";
    return compactText(
      `${sourceTypeLabel} • kaynak vardiya zinciri bulunamadığı için mevcut/taşınmış kabul edilir${suffix}`,
      `${sourceTypeLabel} • kaynak vardiya zinciri bulunamadığı için mevcut/taşınmış kabul edilir`,
    );
  }

  if (sourceType === "MANUAL_INTERNAL" || sourceType === "PILOT_FREE" || sourceType === "LEGACY") {
    return compactText(
      `${sourceTypeLabel} • başarı payı doğmaz`,
      `${sourceTypeLabel} • başarı payı doğmaz`,
    );
  }

  const fallback = missingSignals.length
    ? `Kaynak vardiya zinciri kanıtlanamadı • Eksik sinyal: ${missingSignals.join(", ")}`
    : "Kaynak vardiya zinciri bulunamadı; mevcut/taşınmış kabul edilir.";
  return compactText(fallback, "Kaynak vardiya zinciri bulunamadı; mevcut/taşınmış kabul edilir.");
}

export function inferAgreementSourceLineage(agreement, context = {}) {
  const agreementObj = agreement && typeof agreement === "object" ? agreement : null;
  const bridge = context.bridge && typeof context.bridge === "object" ? context.bridge : null;
  const commercialSources = normalizeCommercialSources(context);
  const commercialSourceCount = commercialSources.length;
  const explicitSource = commercialSources.find(isExplicitLineageSource) || null;
  const sourceShiftId = Number(
    context.sourceShiftId
    || bridge?.sourceShiftId
    || context.sourceShift?.shift?.id
    || context.sourceShift?.id
    || explicitSource?.shiftRootId
    || 0
  );
  const marketShiftId = Number(
    context.marketShiftId
    || context.marketShift?.id
    || context.marketShift?.shiftRootId
    || bridge?.lastShift?.id
    || bridge?.sourceShiftId
    || context.organizationPlan?.publishedShiftId
    || 0
  );
  const organizationPlanId = Number(
    context.organizationPlanId
    || context.organizationPlan?.id
    || agreementObj?.organizationPlanId
    || 0
  );
  const selectedOfferId = Number(
    context.selectedOfferId
    || context.selectedOffer?.id
    || context.offerId
    || 0
  );
  const roomId = Number(
    context.roomId
    || agreementObj?.roomId
    || context.marketShift?.roomId
    || 0
  );
  const sourceSummary = compactText(
    context.sourceSummary
    || bridge?.sourceSummary
    || context.sourceShift?.sourceSummary
    || context.marketShift?.sourceSummary
    || "",
  );
  const sourceTypeHint = normalizeAgreementSourceType(
    context.sourceType
    || context.agreementSource
    || context.agreementSourceType
    || context.commercialSourceType
    || explicitSource?.sourceType
    || "",
  );
  const manual = Boolean(context.manualInternal || context.manual || context.manualEntry || context.manualCreate);
  const pilot = Boolean(context.pilotFree || context.pilot);
  const legacy = Boolean(context.legacy || context.legacySource || sourceTypeHint === "LEGACY");
  const hasRenewal = hasRenewalSignal({ ...context, agreement: agreementObj });
  const hasSupportLineageSignal = Boolean(
    sourceShiftId > 0
    || marketShiftId > 0
    || organizationPlanId > 0
    || selectedOfferId > 0
    || sourceSummary
    || explicitSource
  );
  const hasBillableSignal = hasBillableLineageSignal({
    sourceShiftId,
    marketShiftId,
    selectedOfferId,
    commercialSources,
  });

  let sourceType = sourceTypeHint;
  if (["SEFERPAKT_NEW", "SEFERPAKT_RENEWAL"].includes(sourceType) && !hasBillableSignal) {
    sourceType = "";
  }
  if (!sourceType && manual) sourceType = "MANUAL_INTERNAL";
  if (!sourceType && pilot) sourceType = "PILOT_FREE";
  if (!sourceType && legacy) sourceType = "LEGACY";
  if (!sourceType && hasBillableSignal) {
    sourceType = hasRenewal ? "SEFERPAKT_RENEWAL" : "SEFERPAKT_NEW";
  }
  if (!sourceType && hasSupportLineageSignal) {
    const status = compactText(context.agreementStatus || agreementObj?.status || "", "").toUpperCase();
    sourceType = ["APPROVED", "ACTIVE"].includes(status) ? "EXISTING_IMPORTED" : "INSUFFICIENT_LINEAGE";
  }
  if (!sourceType) {
    const status = compactText(context.agreementStatus || agreementObj?.status || "", "").toUpperCase();
    sourceType = ["APPROVED", "ACTIVE"].includes(status) ? "EXISTING_IMPORTED" : "INSUFFICIENT_LINEAGE";
  }

  const billableByMarketplacePolicy = Boolean(
    hasBillableSignal
    && (sourceType === "SEFERPAKT_NEW" || sourceType === "SEFERPAKT_RENEWAL")
  );
  const missingSignals = compactList([
    sourceShiftId > 0 ? "" : "sourceShiftId",
    marketShiftId > 0 ? "" : "marketShiftId",
    organizationPlanId > 0 ? "" : "organizationPlanId",
    selectedOfferId > 0 ? "" : "selectedOfferId",
    sourceSummary ? "" : "sourceSummary",
    commercialSourceCount > 0 ? "" : "commercialSource",
  ], 8);
  const sourceEvidence = buildSourceEvidence({
    sourceShiftId: sourceShiftId > 0 ? sourceShiftId : null,
    marketShiftId: marketShiftId > 0 ? marketShiftId : null,
    organizationPlanId: organizationPlanId > 0 ? organizationPlanId : null,
    selectedOfferId: selectedOfferId > 0 ? selectedOfferId : null,
    sourceSummary,
    commercialSourceCount,
    hasLineageSignal: hasSupportLineageSignal,
    hasBillableLineageSignal: hasBillableSignal,
    hasRenewal,
    isManual: sourceType === "MANUAL_INTERNAL",
    isPilot: sourceType === "PILOT_FREE",
    isLegacy: sourceType === "LEGACY",
    isImported: sourceType === "EXISTING_IMPORTED",
    isInsufficient: sourceType === "INSUFFICIENT_LINEAGE",
    billableByMarketplacePolicy,
    missingSignals,
  });

  const sourceConfidence = getLineageConfidence({
    sourceType,
    agreementSource: sourceType,
    sourceShiftId,
    marketShiftId,
    organizationPlanId,
    sourceSummary,
    billableByMarketplacePolicy,
    isRenewal: sourceType === "SEFERPAKT_RENEWAL",
    isManual: sourceType === "MANUAL_INTERNAL",
    isPilot: sourceType === "PILOT_FREE",
    isLegacy: sourceType === "LEGACY",
    isImported: sourceType === "EXISTING_IMPORTED",
    isInsufficient: sourceType === "INSUFFICIENT_LINEAGE",
  });

  const sourceLineage = {
    sourceType,
    agreementSource: sourceType,
    confidence: sourceConfidence,
    billableByMarketplacePolicy,
    sourceSummary,
    sourceShiftId: sourceShiftId > 0 ? sourceShiftId : null,
    marketShiftId: marketShiftId > 0 ? marketShiftId : null,
    organizationPlanId: organizationPlanId > 0 ? organizationPlanId : null,
    selectedOfferId: selectedOfferId > 0 ? selectedOfferId : null,
    roomId: roomId > 0 ? roomId : null,
    reason: billableByMarketplacePolicy
      ? `Kaynak vardiya / market shift zinciri kanıtlı; ${sourceType === "SEFERPAKT_RENEWAL" ? "yenileme" : "yeni"} SeferPakt kaydı readonly önizlenebilir.`
      : sourceType === "LEGACY"
        ? "Legacy kayıt; başarı payı doğmaz."
        : sourceType === "MANUAL_INTERNAL" || sourceType === "PILOT_FREE"
          ? "Mevcut / manuel / pilot kayıt; başarı payı doğmaz."
          : sourceType === "EXISTING_IMPORTED"
            ? "Kaynak vardiya zinciri bulunamadığı için mevcut/taşınmış kabul edilir."
            : "Kaynak vardiya zinciri kanıtlanamadı; insufficient lineage fallback uygulandı.",
    lineageSummary: buildAgreementLineageSummary({
      sourceType,
      sourceShiftId,
      marketShiftId,
      organizationPlanId,
      selectedOfferId,
      sourceSummary,
      missingSignals,
      billableByMarketplacePolicy,
      isRenewal: sourceType === "SEFERPAKT_RENEWAL",
      isManual: sourceType === "MANUAL_INTERNAL",
      isPilot: sourceType === "PILOT_FREE",
      isLegacy: sourceType === "LEGACY",
      isImported: sourceType === "EXISTING_IMPORTED",
      isInsufficient: sourceType === "INSUFFICIENT_LINEAGE",
    }),
    sourceEvidence,
    sourceSignals: {
      hasLineageSignal: hasSupportLineageSignal,
      hasSupportLineageSignal,
      hasBillableLineageSignal: hasBillableSignal,
      billableByMarketplacePolicy,
      commercialSourceCount,
      sourceShiftId: sourceShiftId > 0 ? sourceShiftId : null,
      marketShiftId: marketShiftId > 0 ? marketShiftId : null,
      organizationPlanId: organizationPlanId > 0 ? organizationPlanId : null,
      selectedOfferId: selectedOfferId > 0 ? selectedOfferId : null,
      isRenewal: sourceType === "SEFERPAKT_RENEWAL",
      isManual: sourceType === "MANUAL_INTERNAL",
      isPilot: sourceType === "PILOT_FREE",
      isLegacy: sourceType === "LEGACY",
      isImported: sourceType === "EXISTING_IMPORTED",
      isInsufficient: sourceType === "INSUFFICIENT_LINEAGE",
      missingSignals,
    },
    commercialSources,
    commercialSourceCount,
    hasLineageSignal: hasSupportLineageSignal,
    hasSupportLineageSignal,
    hasBillableLineageSignal: hasBillableSignal,
    hasBillableSeferPaktLineage: billableByMarketplacePolicy,
    isRenewal: sourceType === "SEFERPAKT_RENEWAL",
    isManual: sourceType === "MANUAL_INTERNAL",
    isPilot: sourceType === "PILOT_FREE",
    isLegacy: sourceType === "LEGACY",
    isImported: sourceType === "EXISTING_IMPORTED",
    isInsufficient: sourceType === "INSUFFICIENT_LINEAGE",
    missingSignals,
  };

  return sourceLineage;
}
