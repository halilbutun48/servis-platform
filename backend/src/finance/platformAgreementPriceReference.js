const REQUIRED_DIMENSIONS = Object.freeze([
  "vehicleType",
  "vehicleCapacity",
  "routeKey",
  "totalDistanceKm",
  "dailyMovementCount",
  "serviceDayCount",
  "serviceType",
  "agreementMonth",
]);

function positiveMinor(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function dimensionKey(dimensions = {}) {
  return REQUIRED_DIMENSIONS.map((key) => `${key}:${String(dimensions[key])}`).join("|");
}

function notProven(missing, details = {}) {
  return {
    status: "NOT_PROVEN",
    value: null,
    missing: [...new Set(missing.filter(Boolean))],
    excludedCounts: details.excludedCounts || {},
    sampleCount: details.sampleCount ?? 0,
    distinctRoomCount: details.distinctRoomCount ?? 0,
    ...details,
  };
}

function hasReadyCommercialEvidence(observation) {
  return observation?.commercialReference?.status === "READY"
    && String(observation.commercialReference.currencyCode || "").toUpperCase() === "TRY"
    && positiveMinor(observation.commercialReference.amountMinor) != null;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function evaluatePlatformAgreementReferenceGate({ observations = [], policy = null } = {}) {
  if (!policy?.enabled) return notProven(["platform tarihsel fiyat uygunluk politikası onaylanmadı"]);
  const policyMissing = [];
  if (!Number.isInteger(policy.minComparableSampleCount) || policy.minComparableSampleCount <= 0) policyMissing.push("örneklem eşiği");
  if (!Number.isInteger(policy.minDistinctRoomCount) || policy.minDistinctRoomCount <= 0) policyMissing.push("farklı ROOM eşiği");
  if (policy.excludeDemoData !== true) policyMissing.push("DEMO/test dışlama politikası");
  if (policy.privacySafe !== true) policyMissing.push("anonim toplulaştırma güvenliği");
  if (policy.competitionApproved !== true) policyMissing.push("rekabet uygunluğu kararı");
  if (!["LOW", "NONE"].includes(String(policy.reidentificationRisk || "").toUpperCase())) policyMissing.push("yeniden kimliklendirme riski");
  if (policyMissing.length) return notProven(policyMissing);

  const input = Array.isArray(observations) ? observations : [];
  const controlledDemoOnly = String(policy.datasetMode || "").toUpperCase() === "CONTROLLED_DEMO"
    && policy.demoOnly === true;
  const demoPresent = input.some((observation) => observation?.isDemo === true || observation?.isTest === true);
  const controlledDemoBoundaryViolation = controlledDemoOnly && input.some((observation) => (
    observation?.isDemo !== true || observation?.isTest === true
  ));
  const excludedCounts = {
    demoOrTest: input.filter((observation) => observation?.isDemo === true || observation?.isTest === true).length,
    controlledDemoBoundaryViolation: input.filter((observation) => controlledDemoOnly && (
      observation?.isDemo !== true || observation?.isTest === true
    )).length,
    missingCanonicalAcceptedAudit: input.filter((observation) => controlledDemoOnly
      && hasReadyCommercialEvidence(observation)
      && observation?.commercialReference?.source !== "COMPANY_ACCEPT_AUDIT").length,
    missingCanonicalCommercialEvidence: input.filter((observation) => (
      observation && observation.isDemo !== true && observation.isTest !== true && !hasReadyCommercialEvidence(observation)
    )).length,
    invalidAmount: input.filter((observation) => (
      observation && observation.isDemo !== true && observation.isTest !== true
      && hasReadyCommercialEvidence(observation) && positiveMinor(observation.amountMinor) == null
    )).length,
    missingRoomHash: input.filter((observation) => (
      observation && observation.isDemo !== true && observation.isTest !== true
      && hasReadyCommercialEvidence(observation) && !observation.roomHash
    )).length,
    missingDimensions: input.filter((observation) => (
      observation && observation.isDemo !== true && observation.isTest !== true
      && hasReadyCommercialEvidence(observation)
      && REQUIRED_DIMENSIONS.some((key) => observation.dimensions?.[key] == null)
    )).length,
  };
  const eligible = input.filter((observation) => (
    observation
    && (controlledDemoOnly
      ? observation.isDemo === true && observation.isTest !== true
      : observation.isDemo !== true && observation.isTest !== true)
    && hasReadyCommercialEvidence(observation)
    && (!controlledDemoOnly || observation.commercialReference.source === "COMPANY_ACCEPT_AUDIT")
    && observation.roomHash
    && REQUIRED_DIMENSIONS.every((key) => observation.dimensions && observation.dimensions[key] != null)
  ));
  const missing = [];
  if (controlledDemoBoundaryViolation) {
    missing.push("kontrollü DEMO dışı veya test gözlemi");
  } else if (!controlledDemoOnly && demoPresent) {
    missing.push("DEMO/test gözlemleri referanstan dışlandı");
  }
  if (controlledDemoOnly && excludedCounts.missingCanonicalAcceptedAudit > 0) {
    missing.push("COMPANY kabul audit zinciri");
  }
  if (excludedCounts.missingCanonicalCommercialEvidence > 0) {
    missing.push("kabul edilmiş canonical ticari fiyat kanıtı");
  }
  if (eligible.length < policy.minComparableSampleCount) missing.push("yeterli karşılaştırılabilir örneklem");
  const keys = new Set(eligible.map((observation) => dimensionKey(observation.dimensions)));
  if (keys.size !== 1) missing.push("aynı karşılaştırma boyutları");
  const distinctRoomCount = new Set(eligible.map((observation) => String(observation.roomHash))).size;
  if (distinctRoomCount < policy.minDistinctRoomCount) missing.push("yeterli farklı ROOM sayısı");
  if (missing.length) {
    return notProven(missing, {
      excludedCounts,
      sampleCount: eligible.length,
      distinctRoomCount,
    });
  }

  const amounts = eligible.map((observation) => positiveMinor(observation.commercialReference.amountMinor));
  const averageAmountMinor = Math.round(amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length);
  return {
    status: "READY",
    missing: [],
    excludedCounts,
    sampleCount: amounts.length,
    distinctRoomCount,
    value: Object.freeze({
      medianAmountMinor: median(amounts),
      averageAmountMinor,
      range: Object.freeze({ minMinor: Math.min(...amounts), maxMinor: Math.max(...amounts) }),
      sampleCount: amounts.length,
      distinctRoomCount,
      controlledDemoOnly,
      datasetMode: controlledDemoOnly ? "CONTROLLED_DEMO" : "LIVE_APPROVED_POLICY",
      dimensionKey: [...keys][0],
      aggregatedOnly: true,
      rawTenantDataExposed: false,
      reidentificationRisk: "LOW",
      competitionApproved: true,
    }),
  };
}

export { REQUIRED_DIMENSIONS };
