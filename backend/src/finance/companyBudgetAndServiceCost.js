import { safeHashId, buildIssues, compactText, normalizeCurrencyCode, roundMinor, addUnique, hasValue, safeNumber } from "./operationalCostMath.js";
import { describeFinancialSurface, getFinancialOperationsAccessForRole } from "./financialOperationsScope.js";
import { ymdTR } from "../time/tr.js";
export const COMPANY_BUDGET_AND_SERVICE_COST_MODEL_VERSION = "COMPANY-BUDGET-AND-SERVICE-COST-01";
const BLOCKED_COMPANY_KINDS = new Set(["SCHOOL", "ORGANIZATION"]);
function normalizeToken(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}
function isBlockedCompanyKind(value) {
  return BLOCKED_COMPANY_KINDS.has(normalizeToken(value));
}
function textOrNull(...values) {
  for (const value of values) {
    const text = compactText(value, "");
    if (text) return text;
  }
  return "";
}
function minorOrNull(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = safeNumber(value);
    if (!Number.isFinite(n)) continue;
    return roundMinor(n);
  }
  return null;
}
function wholeOrNull(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = safeNumber(value);
    if (!Number.isFinite(n)) continue;
    const rounded = Math.round(n);
    if (rounded >= 0) return rounded;
  }
  return null;
}
function ratioOrNull(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
function dateIsoOrNull(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
function resolveTodayIso(value) {
  const text = textOrNull(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return ymdTR();
}
function dateSpanDays(startIso, endIso) {
  if (!startIso || !endIso) return null;
  if (startIso > endIso) return null;
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
}
function normalizeCurrencyWithWarning(rawCurrencyCode, issues) {
  const normalized = normalizeCurrencyCode(rawCurrencyCode);
  if (normalized) return normalized;
  addUnique(issues.warnings, "currencyCode eksik; TRY preview currency used");
  return "TRY";
}
function pickBudgetSource({
  budgetSource,
  budgetApprovalState,
  approvedBudgetAmountMinor,
  revisedBudgetAmountMinor,
  budgetAmountMinor,
  manualPreviewBudgetAmountMinor,
}) {
  const explicitSource = textOrNull(budgetSource);
  if (explicitSource) return explicitSource;
  if (revisedBudgetAmountMinor !== null && budgetApprovalState === "approved") return "approved_revised_budget";
  if (approvedBudgetAmountMinor !== null && budgetApprovalState === "approved") return "approved_budget";
  if (budgetAmountMinor !== null && budgetApprovalState === "draft") return "draft_budget";
  if (manualPreviewBudgetAmountMinor !== null) return "manual_preview_input";
  if (budgetAmountMinor !== null) return "explicit_company_budget";
  return "missing";
}
function pickServiceCostSource({
  serviceCostSource,
  actualServiceSpendMinor,
  deliveredServiceCostPreviewMinor,
  contractedServiceCostMinor,
  agreementPriceMinor,
  offerPriceMinor,
  deliveredShiftCount,
  deliveredTripCount,
  deliveredServiceDayCount,
  perShiftPriceMinor,
  perTripPriceMinor,
  perDayPriceMinor,
}) {
  const explicitSource = textOrNull(serviceCostSource);
  if (explicitSource) return explicitSource;
  if (actualServiceSpendMinor !== null) return "actual_service_spend";
  if (deliveredServiceCostPreviewMinor !== null) return "delivered_service_cost_preview";
  if (contractedServiceCostMinor !== null) return "contracted_service_cost";
  if (agreementPriceMinor !== null) return "agreement_price";
  if (offerPriceMinor !== null) return "offer_price";
  if (deliveredShiftCount !== null && perShiftPriceMinor !== null) return "delivered_shift_count_x_per_shift_price";
  if (deliveredTripCount !== null && perTripPriceMinor !== null) return "delivered_trip_count_x_per_trip_price";
  if (deliveredServiceDayCount !== null && perDayPriceMinor !== null) return "delivered_service_day_count_x_per_day_price";
  return "missing";
}
function buildCompanySnapshot({ company, shift, agreement, companySummary, previewInputs = {} }) {
  const companyId = Number(company?.id || shift?.companyId || agreement?.companyId || 0) || null;
  const roomId = Number(shift?.roomId || agreement?.roomId || 0) || null;
  const shiftId = Number(shift?.id || 0) || null;
  const agreementId = Number(agreement?.id || 0) || null;
  const companyKind = textOrNull(company?.kind, agreement?.company?.kind, shift?.company?.kind).toUpperCase() || "";
  const companyName = textOrNull(company?.name, shift?.company?.name, agreement?.company?.name) || "";
  const roomName = textOrNull(shift?.room?.name, agreement?.room?.name) || "";
  const shiftStatus = textOrNull(shift?.status, agreement?.status, "DRAFT").toUpperCase();
  const sourceLabel = textOrNull(
    shiftId ? `shift #${shiftId}` : "",
    agreementId ? `agreement #${agreementId}` : "",
    companyId ? `company #${companyId}` : "",
  ) || "company snapshot";
  const routeDistanceM = minorOrNull(shift?.routeSnapshotDistanceM);
  const routeDurationSec = minorOrNull(shift?.routeSnapshotDurationSec);
  const routeDistanceKm = routeDistanceM !== null ? Number((routeDistanceM / 1000).toFixed(2)) : null;
  const routeDurationMin = routeDurationSec !== null ? Math.max(0, Math.round(routeDurationSec / 60)) : null;
  const activePersonCount = wholeOrNull(shift?._count?.people);
  const activeTripCount = wholeOrNull(shift?._count?.stops);
  const requiredPax = wholeOrNull(shift?.requiredPaxOverride);
  const vehicleCapacity = wholeOrNull(shift?.vehicle?.capacity);
  const currentCompanyOfferMinor = minorOrNull(shift?.companyOfferAmount, agreement?.companyOfferAmount);
  const currentRoomOfferMinor = minorOrNull(shift?.roomOfferAmount, agreement?.roomOfferAmount);
  const contractStartIso = dateIsoOrNull(agreement?.startDate);
  const contractEndIso = dateIsoOrNull(agreement?.endDate);
  const contractDays = dateSpanDays(contractStartIso, contractEndIso);
  const todayIso = resolveTodayIso(previewInputs?.todayIso);
  return {
    companyId,
    roomId,
    shiftId,
    agreementId,
    companyKind: companyKind || "",
    regionName: textOrNull(previewInputs?.regionName, company?.region?.name) || "",
    companyName: companyName || "",
    roomName: roomName || "",
    shiftStatus,
    sourceLabel,
    routeDistanceM,
    routeDistanceKm,
    routeDurationSec,
    routeDurationMin,
    activePersonCount,
    activeTripCount,
    requiredPax,
    vehicleCapacity,
    currentCompanyOfferMinor,
    currentRoomOfferMinor,
    contractStartIso,
    contractEndIso,
    contractDays,
    todayIso,
    companySummary,
  };
}
function buildBudgetView(snapshot, inputs, issues) {
  const approvedBudgetAmountMinor = minorOrNull(inputs.approvedBudgetAmountMinor);
  const revisedBudgetAmountMinor = minorOrNull(inputs.revisedBudgetAmountMinor);
  const budgetAmountMinor = minorOrNull(inputs.budgetAmountMinor);
  const manualPreviewBudgetAmountMinor = minorOrNull(inputs.manualPreviewBudgetAmountMinor);
  const effectiveBudgetMinor = (() => {
    if (revisedBudgetAmountMinor !== null && textOrNull(inputs.budgetApprovalState).toLowerCase() === "approved") return revisedBudgetAmountMinor;
    if (approvedBudgetAmountMinor !== null && textOrNull(inputs.budgetApprovalState).toLowerCase() === "approved") return approvedBudgetAmountMinor;
    if (budgetAmountMinor !== null && textOrNull(inputs.budgetApprovalState).toLowerCase() === "draft") return budgetAmountMinor;
    if (manualPreviewBudgetAmountMinor !== null) return manualPreviewBudgetAmountMinor;
    if (budgetAmountMinor !== null) return budgetAmountMinor;
    return null;
  })();
  const explicitZeroBudget = budgetAmountMinor === 0 || approvedBudgetAmountMinor === 0 || revisedBudgetAmountMinor === 0 || manualPreviewBudgetAmountMinor === 0;
  const budgetApprovalState = textOrNull(inputs.budgetApprovalState).toLowerCase() || "unknown";
  const budgetSource = pickBudgetSource({
    budgetSource: inputs.budgetSource,
    budgetApprovalState,
    approvedBudgetAmountMinor,
    revisedBudgetAmountMinor,
    budgetAmountMinor,
    manualPreviewBudgetAmountMinor,
  });
  if (effectiveBudgetMinor !== null && effectiveBudgetMinor < 0) {
    addUnique(issues.invalidFields, "budgetAmountMinor");
    addUnique(issues.blockers, "Negative budget is not allowed");
  }
  if (effectiveBudgetMinor === 0 && !explicitZeroBudget) {
    addUnique(issues.missingFields, "budgetAmountMinor");
    addUnique(issues.warnings, "budget=0 not treated as explicit zero without source");
  }
  const periodType = textOrNull(inputs.periodType, snapshot.contractStartIso && snapshot.contractEndIso ? "contract_period" : "").toLowerCase();
  const periodStart = textOrNull(inputs.periodStart, snapshot.contractStartIso);
  const periodEnd = textOrNull(inputs.periodEnd, snapshot.contractEndIso);
  const periodLabel = periodStart && periodEnd ? `${periodStart} / ${periodEnd}` : periodStart || periodEnd || "";
  const periodHasValue = Boolean(periodStart && periodEnd);
  const periodIsComplete = Boolean(periodHasValue && periodEnd <= snapshot.todayIso);
  const periodState = periodHasValue ? (periodIsComplete ? "complete" : "partial") : "missing";
  if (effectiveBudgetMinor === null && budgetSource === "missing") {
    addUnique(issues.missingFields, "budgetAmountMinor");
    addUnique(issues.warnings, "Onaylı bütçe bulunmadı");
  }
  if (!periodHasValue) {
    addUnique(issues.missingFields, "periodStart");
    addUnique(issues.missingFields, "periodEnd");
  }
  if (periodHasValue && periodStart > periodEnd) {
    addUnique(issues.invalidFields, "periodStart/periodEnd");
    addUnique(issues.blockers, "Period start cannot be after period end");
  }
  const budgetUsedMinor = null;
  return {
    budgetSource,
    budgetApprovalState,
    approvedBudgetAmountMinor,
    revisedBudgetAmountMinor,
    budgetAmountMinor,
    manualPreviewBudgetAmountMinor,
    effectiveBudgetMinor,
    budgetUsedMinor,
    remainingBudgetMinor: null,
    varianceMinor: null,
    varianceDirection: "unknown",
    usageBps: null,
    periodType,
    periodStart,
    periodEnd,
    periodLabel,
    periodHasValue,
    periodState,
    explicitZeroBudget,
  };
}
function buildServiceCostView(snapshot, inputs, issues) {
  const currencyCode = normalizeCurrencyWithWarning(inputs.currencyCode || inputs.serviceCurrencyCode || "TRY", issues);
  const serviceCurrencyCode = normalizeCurrencyCode(inputs.serviceCurrencyCode) || currencyCode;
  const taxBasis = textOrNull(inputs.taxBasis, "contract");
  const actualServiceSpendMinor = minorOrNull(inputs.actualServiceSpendMinor);
  const deliveredServiceCostPreviewMinor = minorOrNull(inputs.deliveredServiceCostPreviewMinor);
  const contractedServiceCostMinor = minorOrNull(inputs.contractedServiceCostMinor);
  const agreementPriceMinor = minorOrNull(inputs.agreementPriceMinor, snapshot.currentCompanyOfferMinor);
  const offerPriceMinor = minorOrNull(inputs.offerPriceMinor, snapshot.currentCompanyOfferMinor);
  const perShiftPriceMinor = minorOrNull(inputs.perShiftPriceMinor);
  const perTripPriceMinor = minorOrNull(inputs.perTripPriceMinor);
  const perDayPriceMinor = minorOrNull(inputs.perDayPriceMinor);
  const qualityAdjustmentPreviewMinor = minorOrNull(inputs.qualityAdjustmentPreviewMinor);
  const hakedisAdjustmentPreviewMinor = minorOrNull(inputs.hakedisAdjustmentPreviewMinor);
  const contractualAdjustmentPreviewMinor = minorOrNull(inputs.contractualAdjustmentPreviewMinor);
  const externalPreviewAdjustments = [qualityAdjustmentPreviewMinor, hakedisAdjustmentPreviewMinor, contractualAdjustmentPreviewMinor]
    .filter((value) => value !== null);
  const deliveredShiftCount = wholeOrNull(inputs.deliveredShiftCount, snapshot.companySummary?.cards?.activeShiftCount);
  const deliveredTripCount = wholeOrNull(inputs.deliveredTripCount, snapshot.activeTripCount);
  const deliveredServiceDayCount = wholeOrNull(inputs.deliveredServiceDayCount, snapshot.contractDays);
  const activePersonCount = wholeOrNull(inputs.activePersonCount, snapshot.activePersonCount);
  const plannedPersonCount = wholeOrNull(inputs.plannedPersonCount, snapshot.requiredPax);
  const pricePeriod = textOrNull(inputs.pricePeriod, inputs.serviceCostPeriodType, inputs.periodType, snapshot.contractDays ? "contract_period" : "").toLowerCase();
  const source = pickServiceCostSource({
    serviceCostSource: inputs.serviceCostSource,
    actualServiceSpendMinor,
    deliveredServiceCostPreviewMinor,
    contractedServiceCostMinor,
    agreementPriceMinor,
    offerPriceMinor,
    deliveredShiftCount,
    deliveredTripCount,
    deliveredServiceDayCount,
    perShiftPriceMinor,
    perTripPriceMinor,
    perDayPriceMinor,
  });
  const derivedShiftSpendMinor = deliveredShiftCount !== null && perShiftPriceMinor !== null ? roundMinor(deliveredShiftCount * perShiftPriceMinor) : null;
  const derivedTripSpendMinor = deliveredTripCount !== null && perTripPriceMinor !== null ? roundMinor(deliveredTripCount * perTripPriceMinor) : null;
  const derivedDaySpendMinor = deliveredServiceDayCount !== null && perDayPriceMinor !== null ? roundMinor(deliveredServiceDayCount * perDayPriceMinor) : null;
  const companyVisibleServiceSpendMinor =
    actualServiceSpendMinor ??
    deliveredServiceCostPreviewMinor ??
    contractedServiceCostMinor ??
    agreementPriceMinor ??
    offerPriceMinor ??
    derivedShiftSpendMinor ??
    derivedTripSpendMinor ??
    derivedDaySpendMinor ??
    null;
  if (companyVisibleServiceSpendMinor === null) {
    addUnique(issues.missingFields, "actualServiceSpendMinor");
    addUnique(issues.missingFields, "contractedServiceCostMinor");
    addUnique(issues.missingFields, "agreementPriceMinor");
    addUnique(issues.missingFields, "offerPriceMinor");
  }
  if (companyVisibleServiceSpendMinor !== null && companyVisibleServiceSpendMinor < 0) {
    addUnique(issues.invalidFields, "actualServiceSpendMinor");
    addUnique(issues.blockers, "Service cost cannot be negative");
  }
  if (serviceCurrencyCode && currencyCode && serviceCurrencyCode !== currencyCode) {
    addUnique(issues.currencyWarnings, `Mixed currency not allowed: ${currencyCode}, ${serviceCurrencyCode}`);
    addUnique(issues.blockers, "Currency mismatch blocks direct comparison");
  }
  if (taxBasis && !["contract", "invoice", "preview", "agreement"].includes(taxBasis.toLowerCase())) {
    addUnique(issues.warnings, `Unknown tax basis: ${taxBasis}`);
  }
  if (deliveredShiftCount === null) addUnique(issues.missingFields, "deliveredShiftCount");
  if (deliveredTripCount === null) addUnique(issues.missingFields, "deliveredTripCount");
  if (deliveredServiceDayCount === null) addUnique(issues.missingFields, "deliveredServiceDayCount");
  if (activePersonCount === null) addUnique(issues.missingFields, "activePersonCount");
  return {
    source,
    currencyCode,
    serviceCurrencyCode,
    taxBasis,
    actualServiceSpendMinor,
    deliveredServiceCostPreviewMinor,
    contractedServiceCostMinor,
    agreementPriceMinor,
    offerPriceMinor,
    derivedShiftSpendMinor,
    derivedTripSpendMinor,
    derivedDaySpendMinor,
    companyVisibleServiceSpendMinor,
    deliveredShiftCount,
    deliveredTripCount,
    deliveredServiceDayCount,
    activePersonCount,
    plannedPersonCount,
    perShiftPriceMinor,
    perTripPriceMinor,
    perDayPriceMinor,
    qualityAdjustmentPreviewMinor,
    hakedisAdjustmentPreviewMinor,
    contractualAdjustmentPreviewMinor,
    externalPreviewAdjustments,
    periodType: pricePeriod,
  };
}
function buildBudgetAndServiceComparison(budgetView, serviceView, inputs, issues) {
  const periodMismatch = Boolean(
    budgetView.periodHasValue &&
    serviceView.periodType &&
    budgetView.periodType &&
    budgetView.periodType !== serviceView.periodType,
  );
  const mixedCurrency = Boolean(
    budgetView.effectiveBudgetMinor !== null &&
    serviceView.companyVisibleServiceSpendMinor !== null &&
    budgetView.periodHasValue &&
    serviceView.currencyCode &&
    budgetView.periodHasValue &&
    serviceView.currencyCode !== inputs.currencyCode &&
    inputs.currencyCode,
  );
  if (periodMismatch) {
    addUnique(issues.warnings, "Dönemler eşleşmedi");
    addUnique(issues.blockers, "Period mismatch");
  }
  if (mixedCurrency) {
    addUnique(issues.blockers, "Mixed currency comparison blocked");
  }
  return {
    periodMismatch,
    mixedCurrency,
  };
}
function buildSupplierComparisons(inputs, serviceView, budgetView, periodState) {
  const supplierRef = textOrNull(inputs.supplierRef);
  const safeSupplierLabel = textOrNull(inputs.safeSupplierLabel, inputs.supplierNameSafe, supplierRef, "Unnamed supplier");
  const normalizedPriceMinor = minorOrNull(inputs.supplierPriceMinor);
  const supplierCurrencyCode = normalizeCurrencyCode(inputs.supplierCurrencyCode) || serviceView.currencyCode;
  const qualityScore = ratioOrNull(inputs.supplierQualityScore);
  const reliabilityScore = ratioOrNull(inputs.supplierReliabilityScore);
  const serviceEvidenceCount = wholeOrNull(inputs.supplierEvidenceCount);
  const verifiedSupplierState = textOrNull(inputs.verifiedSupplierState, qualityScore !== null ? "verified" : "unknown").toLowerCase();
  const pricePeriod = textOrNull(inputs.supplierPricePeriod, periodState.periodType || serviceView.periodType).toLowerCase();
  const comparisonWarnings = [];
  if (!supplierRef && !inputs.supplierNameSafe && normalizedPriceMinor === null && qualityScore === null && reliabilityScore === null) {
    return {
      supplierComparisons: [],
      supplierComparisonState: "incomplete",
      supplierComparisonSummaryText: "Tedarikçi karşılaştırması için veri bekleniyor; otomatik seçim yapılmadı.",
    };
  }
  if (!pricePeriod) comparisonWarnings.push("period missing");
  if (!supplierCurrencyCode) comparisonWarnings.push("currency missing");
  if (supplierCurrencyCode && supplierCurrencyCode !== serviceView.currencyCode) comparisonWarnings.push(`currency mismatch: ${serviceView.currencyCode} vs ${supplierCurrencyCode}`);
  if (!hasValue(qualityScore)) comparisonWarnings.push("quality missing");
  if (!hasValue(reliabilityScore)) comparisonWarnings.push("reliability missing");
  if (!hasValue(serviceEvidenceCount)) comparisonWarnings.push("evidence count missing");
  if (!periodState.periodHasValue) comparisonWarnings.push("budget period missing");
  const comparisonBaseMinor = serviceView.companyVisibleServiceSpendMinor ?? budgetView.effectiveBudgetMinor ?? null;
  const priceDeltaMinor = normalizedPriceMinor !== null && comparisonBaseMinor !== null ? normalizedPriceMinor - comparisonBaseMinor : null;
  const priceIndexBps = normalizedPriceMinor !== null && comparisonBaseMinor && comparisonBaseMinor > 0
    ? Math.round((normalizedPriceMinor / comparisonBaseMinor) * 10000)
    : null;
  let valueBand = "incomplete";
  if (normalizedPriceMinor !== null && hasValue(qualityScore) && hasValue(reliabilityScore) && serviceEvidenceCount !== null) valueBand = "balanced";
  else if (normalizedPriceMinor !== null) valueBand = "price_only";
  else if (hasValue(qualityScore) || hasValue(reliabilityScore)) valueBand = "quality_only";
  if (comparisonWarnings.length > 0) valueBand = valueBand === "balanced" ? "review_required" : valueBand;
  return {
    supplierComparisons: [
      {
        supplierRef: supplierRef || null,
        safeSupplierLabel,
        normalizedPriceMinor,
        pricePeriod,
        currencyCode: supplierCurrencyCode,
        qualityScore: hasValue(qualityScore) ? qualityScore : null,
        reliabilityScore: hasValue(reliabilityScore) ? reliabilityScore : null,
        serviceEvidenceCount: serviceEvidenceCount ?? null,
        verifiedSupplierState,
        dataQuality: valueBand,
        comparisonWarnings,
        priceDeltaMinor,
        priceIndexBps,
        valueBand,
      },
    ],
    supplierComparisonState: valueBand,
    supplierComparisonSummaryText: comparisonWarnings.length > 0
      ? "Tedarikçi karşılaştırması salt okunur karar desteği olarak hazırlandı; otomatik seçim yapılmadı."
      : "Tedarikçi karşılaştırması hazırlandı; otomatik seçim yapılmadı.",
  };
}
function scoreDataQuality({ issues, budgetView, serviceView, periodState, supplierComparisons }) {
  let score = 100;
  score -= issues.missingFields.length * 4;
  score -= issues.invalidFields.length * 8;
  score -= issues.warnings.length * 2;
  score -= issues.blockers.length * 12;
  if (budgetView.effectiveBudgetMinor === null) score -= 18;
  if (serviceView.companyVisibleServiceSpendMinor === null) score -= 18;
  if (!periodState.periodHasValue) score -= 12;
  if (!serviceView.currencyCode) score -= 8;
  if (!supplierComparisons.length) score -= 6;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = score >= 80 ? "high" : score >= 55 ? "medium" : "low";
  const completenessText = budgetView.effectiveBudgetMinor !== null && serviceView.companyVisibleServiceSpendMinor !== null
    ? "Bütçe ve servis harcaması okunabildi."
    : "Bütçe veya servis harcaması eksik.";
  return {
    score,
    level,
    completenessScore: score,
    confidenceLevel: level,
    summaryText: completenessText,
    reason: issues.blockers[0] || issues.warnings[0] || "Sınırlı veriyle preview üretildi.",
  };
}
function deriveStatus({ budgetView, serviceView, periodState, comparisonState, issues }) {
  if (issues.blockers.some((line) => /currency/i.test(line))) return "mixed_currency";
  if (issues.blockers.some((line) => /period mismatch/i.test(line))) return "period_mismatch";
  if (budgetView.effectiveBudgetMinor === null && serviceView.companyVisibleServiceSpendMinor === null) return "no_budget";
  if (budgetView.effectiveBudgetMinor === null) return "no_budget";
  if (serviceView.companyVisibleServiceSpendMinor === null) return "no_service_cost";
  if (!periodState.periodHasValue) return "incomplete";
  if (periodState.periodState === "partial") return "partial_period";
  if (comparisonState === "review_required") return "review_required";
  if (budgetView.remainingBudgetMinor !== null && budgetView.remainingBudgetMinor < 0) return "over_budget";
  return "within_budget";
}
function buildUnitCosts(serviceView, budgetView) {
  const serviceSpend = serviceView.companyVisibleServiceSpendMinor;
  const costPerActivePersonMinor = serviceSpend !== null && serviceView.activePersonCount > 0 ? roundMinor(serviceSpend / serviceView.activePersonCount) : null;
  const costPerPlannedPersonMinor = serviceSpend !== null && serviceView.plannedPersonCount > 0 ? roundMinor(serviceSpend / serviceView.plannedPersonCount) : null;
  const costPerServiceDayMinor = serviceSpend !== null && serviceView.deliveredServiceDayCount > 0 ? roundMinor(serviceSpend / serviceView.deliveredServiceDayCount) : null;
  const costPerShiftMinor = serviceSpend !== null && serviceView.deliveredShiftCount > 0 ? roundMinor(serviceSpend / serviceView.deliveredShiftCount) : null;
  const costPerTripMinor = serviceSpend !== null && serviceView.deliveredTripCount > 0 ? roundMinor(serviceSpend / serviceView.deliveredTripCount) : null;
  const costPerAgreementMinor = serviceSpend !== null ? serviceSpend : null;
  return {
    costPerActivePersonMinor,
    costPerPlannedPersonMinor,
    costPerServiceDayMinor,
    costPerShiftMinor,
    costPerTripMinor,
    costPerAgreementMinor,
    costPerSupplierMinor: null,
    activePersonCount: serviceView.activePersonCount,
    plannedPersonCount: serviceView.plannedPersonCount,
    deliveredServiceDayCount: serviceView.deliveredServiceDayCount,
    deliveredShiftCount: serviceView.deliveredShiftCount,
    deliveredTripCount: serviceView.deliveredTripCount,
    budgetUsedMinor: budgetView.budgetUsedMinor,
  };
}
function buildServiceCostComponents(serviceView) {
  const components = [];
  if (serviceView.actualServiceSpendMinor !== null) {
    components.push({
      key: "actual_service_spend",
      label: "Gerçekleşen servis harcaması",
      amountMinor: serviceView.actualServiceSpendMinor,
      source: "actualServiceSpendMinor",
    });
  }
  if (serviceView.deliveredServiceCostPreviewMinor !== null) {
    components.push({
      key: "delivered_service_cost_preview",
      label: "Teslim edilmiş servis maliyeti",
      amountMinor: serviceView.deliveredServiceCostPreviewMinor,
      source: "deliveredServiceCostPreviewMinor",
    });
  }
  if (serviceView.contractedServiceCostMinor !== null) {
    components.push({
      key: "contracted_service_cost",
      label: "Sözleşmeli servis maliyeti",
      amountMinor: serviceView.contractedServiceCostMinor,
      source: "contractedServiceCostMinor",
    });
  }
  if (serviceView.agreementPriceMinor !== null) {
    components.push({
      key: "agreement_price",
      label: "Sözleşme fiyatı",
      amountMinor: serviceView.agreementPriceMinor,
      source: "agreementPriceMinor",
    });
  }
  if (serviceView.offerPriceMinor !== null) {
    components.push({
      key: "offer_price",
      label: "Teklif fiyatı",
      amountMinor: serviceView.offerPriceMinor,
      source: "offerPriceMinor",
    });
  }
  if (serviceView.externalPreviewAdjustments.length > 0) {
    components.push({
      key: "external_preview_adjustments",
      label: "Harici önizleme düzeltmeleri",
      amountMinor: serviceView.externalPreviewAdjustments.reduce((sum, value) => sum + Number(value || 0), 0),
      source: "qualityAdjustmentPreviewMinor / hakedisAdjustmentPreviewMinor / contractualAdjustmentPreviewMinor",
    });
  }
  return components;
}
function buildCompanyBudgetSummaryText({ status, budgetView, serviceView, periodState, comparisonState }) {
  const base = ["Bütçe ve Servis Maliyeti önizlemesi hazırlandı."];
  if (budgetView.effectiveBudgetMinor === null) {
    base.push("Onaylı bütçe bulunmadığı için bütçe sapması hesaplanmadı.");
  }
  if (serviceView.companyVisibleServiceSpendMinor === null) {
    base.push("Servis harcaması kaynağı bulunmadığı için gerçekleşen spend hesaplanmadı.");
  }
  if (periodState.periodState === "partial") {
    base.push("Dönem henüz tamamlanmadığı için gösterilen tutar kesin dönem sonucu değildir.");
  }
  if (status === "mixed_currency") {
    base.push("Para birimi uyumsuz olduğu için doğrudan toplam yapılmadı.");
  }
  if (status === "period_mismatch") {
    base.push("Dönem bilgileri eşleşmediği için fiyatlar doğrudan karşılaştırılmadı.");
  }
  if (comparisonState === "incomplete") {
    base.push("Tedarikçi karşılaştırması eksik veri nedeniyle tamamlanamadı.");
  }
  base.push("Bu sonuç fatura, hakediş, ödeme veya muhasebe kaydı değildir.");
  return base.join(" ");
}
function buildBudgetSummaryText({ status, budgetView, periodState }) {
  if (budgetView.effectiveBudgetMinor === null) {
    return "Onaylı bütçe bulunmadığı için bütçe sapması hesaplanmadı.";
  }
  if (status === "mixed_currency") {
    return "Para birimi uyumsuz olduğu için bütçe ile servis harcaması doğrudan karşılaştırılmadı.";
  }
  if (status === "period_mismatch") {
    return "Dönem bilgileri eşleşmediği için bütçe sapması güvenle hesaplanmadı.";
  }
  if (periodState.periodState === "partial") {
    return "Dönem henüz tamamlanmadığı için bütçe kullanım oranı önizleme niteliğindedir.";
  }
  if (budgetView.remainingBudgetMinor !== null && budgetView.remainingBudgetMinor < 0) {
    return "Bütçe aşıldı; kalan bütçe negatif görünüyor.";
  }
  return "Bütçe ve servis harcaması salt okunur olarak karşılaştırıldı.";
}
function buildServiceSummaryText({ serviceView, status, periodState }) {
  if (serviceView.companyVisibleServiceSpendMinor === null) {
    return "Gerçekleşen servis harcaması için yeterli kaynak bulunamadı.";
  }
  const fragments = ["Gerçekleşen servis harcaması önizlemesi hazırlandı."];
  if (periodState.periodState === "partial") {
    fragments.push("Dönem henüz tamamlanmadığı için bu değer bugüne kadarki servis harcamasıdır.");
  }
  if (status === "mixed_currency") {
    fragments.push("Para birimi uyumsuzluğu nedeniyle bazı karşılaştırmalar kapalı.");
  }
  fragments.push("Bu sonuç fatura, hakediş, ödeme veya muhasebe kaydı değildir.");
  return fragments.join(" ");
}
function buildPeriodState(snapshot, budgetView, serviceView, issues) {
  const start = budgetView.periodStart || snapshot.contractStartIso || "";
  const end = budgetView.periodEnd || snapshot.contractEndIso || "";
  const periodType = budgetView.periodType || serviceView.periodType || (start && end ? "contract_period" : "");
  const periodLabel = start && end ? `${start} - ${end}` : start || end || "";
  const hasPeriod = Boolean(start && end);
  const isMismatch = Boolean(hasPeriod && budgetView.periodType && serviceView.periodType && budgetView.periodType !== serviceView.periodType);
  const isPartial = Boolean(hasPeriod && end > snapshot.todayIso);
  if (!hasPeriod) {
    addUnique(issues.missingFields, "periodStart");
    addUnique(issues.missingFields, "periodEnd");
  }
  return {
    periodType,
    periodStart: start,
    periodEnd: end,
    periodLabel,
    periodHasValue: hasPeriod,
    periodState: isPartial ? "partial" : hasPeriod ? "complete" : "missing",
    isPartial,
    isMismatch,
    todayIso: snapshot.todayIso,
  };
}
function finalizeBudgetAmounts(budgetView, serviceView) {
  const budgetUsedMinor = serviceView.companyVisibleServiceSpendMinor;
  const remainingBudgetMinor = budgetView.effectiveBudgetMinor !== null && budgetUsedMinor !== null
    ? budgetView.effectiveBudgetMinor - budgetUsedMinor
    : null;
  const varianceMinor = remainingBudgetMinor;
  const varianceDirection = varianceMinor === null
    ? "unknown"
    : varianceMinor > 0
      ? "under_budget"
      : varianceMinor < 0
        ? "over_budget"
        : "on_budget";
  const usageBps = budgetView.effectiveBudgetMinor !== null && budgetView.effectiveBudgetMinor > 0 && budgetUsedMinor !== null
    ? Math.round((budgetUsedMinor / budgetView.effectiveBudgetMinor) * 10000)
    : null;
  return {
    budgetUsedMinor,
    remainingBudgetMinor,
    varianceMinor,
    varianceDirection,
    usageBps,
  };
}
export function buildCompanyBudgetAndServiceCostDeniedPreview({ role = "COMPANY", companyKind = "", scope = "COMPANY" } = {}) {
  const roleKey = normalizeToken(role) || "COMPANY";
  const scopeEntry = describeFinancialSurface("company_budget", roleKey);
  const access = getFinancialOperationsAccessForRole(roleKey);
  return {
    allowed: false,
    deniedByCompanyKind: true,
    role: roleKey,
    companyKind: normalizeToken(companyKind) || null,
    scope: normalizeToken(scope) === "ROOM" ? "ROOM" : "COMPANY",
    surfaceId: "company_budget",
    surface: scopeEntry,
    access,
    modelVersion: COMPANY_BUDGET_AND_SERVICE_COST_MODEL_VERSION,
    previewId: safeHashId({ roleKey, companyKind, scope }),
    title: scopeEntry.title,
    summaryText: "Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan salt okunur önizleme olarak kalır.",
    nextAction: "Yetkili COMPANY kimliği ile tekrar aç.",
    readOnly: true,
    previewOnly: true,
    writeAction: false,
    notPersisted: true,
    notInvoiced: true,
    notPaid: true,
    notApproved: true,
    noRoomInternalCost: true,
    noRoomMargin: true,
    noQuoteFloor: true,
    noSupplierSelection: true,
    noAccountingPosting: true,
    tenantIsolationText: access.tenantIsolationText,
    tenantIsolation: {
      companyId: null,
      role: roleKey,
      scope: "COMPANY",
      tenantIsolationText: access.tenantIsolationText,
    },
    status: "blocked",
    currencyCode: "TRY",
    taxBasis: "preview",
    budgetSource: "missing",
    budgetApprovalState: "unknown",
    effectiveBudgetMinor: null,
    companyVisibleServiceSpendMinor: null,
    budgetUsedMinor: null,
    remainingBudgetMinor: null,
    varianceMinor: null,
    varianceDirection: "unknown",
    usageBps: null,
    budget: null,
    companyBudget: null,
    serviceCost: null,
    companyServiceCost: null,
    unitCosts: {},
    supplierComparisons: [],
    serviceCostComponents: [],
    externalPreviewAdjustments: [],
    missingFields: ["budgetAmountMinor", "actualServiceSpendMinor"],
    invalidFields: [],
    warnings: ["şirket türü engellendi"],
    blockers: ["şirket türü engellendi"],
    dataQuality: {
      score: 0,
      level: "low",
      completenessScore: 0,
      confidenceLevel: "low",
      summaryText: "Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan salt okunur önizleme olarak kalır.",
      reason: "Şirket türü engellendi.",
    },
    confidence: {
      score: 0,
      level: "low",
      reason: "Şirket türü engellendi.",
    },
    evidence: [],
    formulaTrace: [],
    sourceTrace: [],
    nextSafeStep: "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01",
  };
}
export function buildFinancialOperationsCompanyKindDeniedPreview(args = {}) {
  return buildCompanyBudgetAndServiceCostDeniedPreview(args);
}
export function buildCompanyBudgetAndServiceCostPreview({
  role = "COMPANY",
  companyKind = "",
  company = null,
  shift = null,
  agreement = null,
  companySummary = null,
  budgetInputs = {},
  serviceCostInputs = {},
  supplierInputs = {},
  costInputs = {},
  previewInputs = {},
} = {}) {
  const roleKey = normalizeToken(role) || "DEFAULT";
  const companyKindKey = normalizeToken(companyKind);
  if (roleKey === "COMPANY" && isBlockedCompanyKind(companyKindKey)) {
    return buildCompanyBudgetAndServiceCostDeniedPreview({ role: roleKey, companyKind: companyKindKey, scope: "COMPANY" });
  }
  const surface = describeFinancialSurface("company_budget", roleKey);
  const access = getFinancialOperationsAccessForRole(roleKey);
  const snapshot = buildCompanySnapshot({ company, shift, agreement, companySummary, previewInputs });
  const issues = buildIssues();
  const mergedBudgetInputs = {
    ...previewInputs,
    ...costInputs,
    ...budgetInputs,
  };
  const mergedServiceInputs = {
    ...previewInputs,
    ...costInputs,
    ...serviceCostInputs,
  };
  const mergedSupplierInputs = {
    ...previewInputs,
    ...supplierInputs,
  };
  const budgetView = buildBudgetView(snapshot, mergedBudgetInputs, issues);
  const serviceView = buildServiceCostView(snapshot, mergedServiceInputs, issues);
  const periodState = buildPeriodState(snapshot, budgetView, serviceView, issues);
  const comparisonPolicy = buildBudgetAndServiceComparison(budgetView, serviceView, mergedBudgetInputs, issues);
  const supplierComparisonPack = buildSupplierComparisons(mergedSupplierInputs, serviceView, budgetView, periodState);
  const budgetFin = finalizeBudgetAmounts(budgetView, serviceView);
  budgetView.budgetUsedMinor = budgetFin.budgetUsedMinor;
  budgetView.remainingBudgetMinor = budgetFin.remainingBudgetMinor;
  budgetView.varianceMinor = budgetFin.varianceMinor;
  budgetView.varianceDirection = budgetFin.varianceDirection;
  budgetView.usageBps = budgetFin.usageBps;
  const unitCosts = buildUnitCosts(serviceView, budgetView);
  const serviceCostComponents = buildServiceCostComponents(serviceView);
  const status = deriveStatus({
    budgetView,
    serviceView,
    periodState,
    comparisonState: supplierComparisonPack.supplierComparisonState,
    issues,
  });
  const dataQuality = scoreDataQuality({
    issues,
    budgetView,
    serviceView,
    periodState,
    supplierComparisons: supplierComparisonPack.supplierComparisons,
  });
  const summaryText = buildCompanyBudgetSummaryText({
    status,
    budgetView,
    serviceView,
    periodState,
    comparisonState: supplierComparisonPack.supplierComparisonState,
  });
  const budgetSummaryText = buildBudgetSummaryText({
    status,
    budgetView,
    periodState,
  });
  const serviceSummaryText = buildServiceSummaryText({
    status,
    serviceView,
    periodState,
  });
  const nextSafeStep = "HAKEDIS-INVOICE-RECONCILIATION-PREVIEW-01";
  const previewId = safeHashId({
    modelVersion: COMPANY_BUDGET_AND_SERVICE_COST_MODEL_VERSION,
    companyId: snapshot.companyId,
    shiftId: snapshot.shiftId,
    agreementId: snapshot.agreementId,
    budgetSource: budgetView.budgetSource,
    serviceCostSource: serviceView.source,
    periodStart: periodState.periodStart,
    periodEnd: periodState.periodEnd,
    currencyCode: serviceView.currencyCode,
  });
  const evidence = [
    `companyId: ${snapshot.companyId || "-"}`,
    `shiftId: ${snapshot.shiftId || "-"}`,
    `agreementId: ${snapshot.agreementId || "-"}`,
    `budget source: ${budgetView.budgetSource}`,
    `service cost source: ${serviceView.source}`,
    `period: ${periodState.periodLabel || "-"}`,
  ];
  if (serviceView.companyVisibleServiceSpendMinor !== null) {
    evidence.push(`budgetUsedMinor = ${serviceView.companyVisibleServiceSpendMinor}`);
  }
  if (budgetView.effectiveBudgetMinor !== null && serviceView.companyVisibleServiceSpendMinor !== null) {
    evidence.push(`remainingBudgetMinor = ${budgetView.effectiveBudgetMinor} - ${serviceView.companyVisibleServiceSpendMinor}`);
  }
  const formulaTrace = [
    "budgetUsedMinor = companyVisibleServiceSpendMinor",
    "remainingBudgetMinor = effectiveBudgetMinor - budgetUsedMinor",
    "varianceMinor = effectiveBudgetMinor - budgetUsedMinor",
    "usageBps = budgetUsedMinor / effectiveBudgetMinor * 10000",
  ];
  const missingFields = [...new Set([...issues.missingFields])];
  const invalidFields = [...new Set([...issues.invalidFields])];
  const warnings = [...new Set([...issues.warnings, ...issues.currencyWarnings])];
  const blockers = [...new Set([...issues.blockers])];
  const allowed = blockers.length === 0;
  const companyBudget = {
    budgetSource: budgetView.budgetSource,
    budgetApprovalState: budgetView.budgetApprovalState,
    periodType: budgetView.periodType,
    periodStart: periodState.periodStart,
    periodEnd: periodState.periodEnd,
    periodLabel: periodState.periodLabel,
    effectiveBudgetMinor: budgetView.effectiveBudgetMinor,
    budgetUsedMinor: budgetView.budgetUsedMinor,
    remainingBudgetMinor: budgetView.remainingBudgetMinor,
    varianceMinor: budgetView.varianceMinor,
    varianceDirection: budgetView.varianceDirection,
    usageBps: budgetView.usageBps,
    explicitZeroBudget: budgetView.explicitZeroBudget,
    summaryText: budgetSummaryText,
    missingFields,
    warnings,
    blockers,
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  };
  const companyServiceCost = {
    serviceCostSource: serviceView.source,
    currencyCode: serviceView.currencyCode,
    serviceCurrencyCode: serviceView.serviceCurrencyCode,
    taxBasis: serviceView.taxBasis,
    companyVisibleServiceSpendMinor: serviceView.companyVisibleServiceSpendMinor,
    actualServiceSpendMinor: serviceView.actualServiceSpendMinor,
    deliveredServiceCostPreviewMinor: serviceView.deliveredServiceCostPreviewMinor,
    contractedServiceCostMinor: serviceView.contractedServiceCostMinor,
    agreementPriceMinor: serviceView.agreementPriceMinor,
    offerPriceMinor: serviceView.offerPriceMinor,
    deliveredShiftCount: serviceView.deliveredShiftCount,
    deliveredTripCount: serviceView.deliveredTripCount,
    deliveredServiceDayCount: serviceView.deliveredServiceDayCount,
    activePersonCount: serviceView.activePersonCount,
    plannedPersonCount: serviceView.plannedPersonCount,
    qualityAdjustmentPreviewMinor: serviceView.qualityAdjustmentPreviewMinor,
    hakedisAdjustmentPreviewMinor: serviceView.hakedisAdjustmentPreviewMinor,
    contractualAdjustmentPreviewMinor: serviceView.contractualAdjustmentPreviewMinor,
    summaryText: serviceSummaryText,
    missingFields,
    warnings,
    blockers,
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  };
  return {
    allowed,
    deniedByCompanyKind: false,
    modelVersion: COMPANY_BUDGET_AND_SERVICE_COST_MODEL_VERSION,
    previewId,
    role: roleKey,
    companyKind: companyKindKey || null,
    regionName: snapshot.regionName || null,
    scope: "COMPANY",
    surfaceId: "company_budget",
    surface,
    access,
    title: surface.title,
    summaryText,
    nextAction: "Bütçe ve servis maliyeti önizlemesini açık parametrelerle tamamla.",
    nextSafeStep,
    readOnly: true,
    previewOnly: true,
    writeAction: false,
    notPersisted: true,
    notInvoiced: true,
    notPaid: true,
    notApproved: true,
    noRoomInternalCost: true,
    noRoomMargin: true,
    noQuoteFloor: true,
    noSupplierSelection: true,
    noAccountingPosting: true,
    tenantIsolationText: access.tenantIsolationText,
    tenantIsolation: {
      companyId: snapshot.companyId,
      role: roleKey,
      scope: "COMPANY",
      tenantIsolationText: access.tenantIsolationText,
    },
    status,
    currencyCode: serviceView.currencyCode,
    taxBasis: serviceView.taxBasis,
    budgetSource: budgetView.budgetSource,
    budgetApprovalState: budgetView.budgetApprovalState,
    effectiveBudgetMinor: budgetView.effectiveBudgetMinor,
    companyVisibleServiceSpendMinor: serviceView.companyVisibleServiceSpendMinor,
    budgetUsedMinor: budgetView.budgetUsedMinor,
    remainingBudgetMinor: budgetView.remainingBudgetMinor,
    varianceMinor: budgetView.varianceMinor,
    varianceDirection: budgetView.varianceDirection,
    usageBps: budgetView.usageBps,
    unitCosts,
    supplierComparisons: supplierComparisonPack.supplierComparisons,
    supplierComparisonState: supplierComparisonPack.supplierComparisonState,
    supplierComparisonSummaryText: supplierComparisonPack.supplierComparisonSummaryText,
    serviceCostComponents,
    externalPreviewAdjustments: serviceView.externalPreviewAdjustments,
    companyBudget,
    companyServiceCost,
    period: {
      periodType: periodState.periodType,
      periodStart: periodState.periodStart,
      periodEnd: periodState.periodEnd,
      periodLabel: periodState.periodLabel,
      periodState: periodState.periodState,
      isPartial: periodState.isPartial,
      isMismatch: periodState.isMismatch,
      todayIso: periodState.todayIso,
    },
    missingFields,
    invalidFields,
    warnings,
    blockers,
    dataQuality,
    confidence: {
      score: dataQuality.score,
      level: dataQuality.level,
      reason: dataQuality.reason,
    },
    evidence,
    formulaTrace,
    sourceTrace: [
      `companyId:${snapshot.companyId || "-"}`,
      `shiftId:${snapshot.shiftId || "-"}`,
      `agreementId:${snapshot.agreementId || "-"}`,
      `companyName:${snapshot.companyName || "-"}`,
      `roomName:${snapshot.roomName || "-"}`,
      `budgetSource:${budgetView.budgetSource}`,
      `serviceCostSource:${serviceView.source}`,
    ],
    comparisonPolicy,
  };
}
