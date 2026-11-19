function claimDateFingerprint(dates) {
  let hash = 2166136261;
  for (const value of dates) {
    for (const character of String(value)) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    }
    hash = Math.imul(hash ^ 124, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildRoomIncomeChainRequest({ agreementId, data, form, currencyCode } = {}) {
  const normalizedAgreementId = Number(agreementId || 0);
  const periodStart = String(data?.period?.start || "").trim();
  const periodEnd = String(data?.period?.end || "").trim();
  const sourceRef = String(form?.sourceRef || "").trim();
  if (!normalizedAgreementId || !periodStart || !periodEnd || !sourceRef) {
    return { error: "SOURCE_REQUIRED" };
  }
  const claimDates = Array.isArray(data?.incomeCalculation?.newlyCompletedServiceDates)
    ? data.incomeCalculation.newlyCompletedServiceDates.filter(Boolean)
    : [];
  const claimSuffix = claimDates.length ? `-${claimDateFingerprint(claimDates)}` : "";
  return {
    periodStart,
    periodEnd,
    currencyCode: String(currencyCode || "TRY").trim().toUpperCase(),
    sourceRef,
    serviceEvidenceSource: /^SEFERPAKT_DEMO_/i.test(sourceRef) ? "TEST_SIMULATED" : "INTERNAL_ACTUAL",
    idempotencyKey: `room-income-${normalizedAgreementId}-${periodStart}-${periodEnd}${claimSuffix}`,
    userApproval: true,
  };
}
