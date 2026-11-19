import { buildOperationalCostModel } from "./operationalCostModel.js";
import { isVatNetRollupEligible } from './roomCostPolicy.js';
import {
  describeFinancialSurface,
  getFinancialOperationsAccessForRole,
} from "./financialOperationsScope.js";
import { resolveOperationRegion } from "../region/operationRegion.js";
import { resolveVehicleConsumptionReference } from "./vehicleConsumptionReferences.js";

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

function normalizeScope(value) {
  const key = normalizeToken(value);
  return key === "COMPANY" ? "COMPANY" : "ROOM";
}

function isBlockedCompanyKind(companyKind) {
  const key = normalizeToken(companyKind);
  return key === "SCHOOL" || key === "ORGANIZATION";
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toMinor(value) {
  const n = toNumber(value);
  if (n == null) return null;
  return Math.trunc(n);
}

function toBps(value) {
  const n = toNumber(value);
  if (n == null) return null;
  const rounded = Math.trunc(n);
  if (rounded < 0) return null;
  return rounded;
}

function pickNumber(...values) {
  for (const value of values) {
    const n = toNumber(value);
    if (n != null) return n;
  }
  return null;
}

function pickMinor(...values) {
  for (const value of values) {
    const n = toMinor(value);
    if (n != null) return n;
  }
  return null;
}

function pickText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeFuelType(value) {
  const token = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
  if (["DIESEL", "MOTORIN", "MAZOT"].includes(token)) return "DIESEL";
  if (["GASOLINE", "GASOLINE_95", "BENZIN", "BENZIN_95"].includes(token)) return "GASOLINE_95";
  if (["LPG", "OTOGAZ"].includes(token)) return "LPG";
  if (["ELECTRIC", "EV", "ELEKTRIK"].includes(token)) return "ELECTRIC";
  return token || null;
}

function selectedFuelPrice(reference) {
  const selected = reference?.selected || reference?.marketReference || reference || null;
  const valueMinor = pickMinor(selected?.valueMinor, selected?.value);
  if (valueMinor == null || valueMinor < 0) return null;
  return {
    valueMinor,
    currencyCode: pickText(selected?.currencyCode, "TRY").toUpperCase(),
    sourceName: pickText(selected?.sourceName, selected?.providerKey, "Yetkili yakıt fiyatı"),
    asOf: selected?.asOf || null,
    freshness: selected?.freshness || selected?.state || null,
    confidence: selected?.confidence || null,
    authority: selected?.authority || selected?.origin || "EXTERNAL_REFERENCE",
    regionName: selected?.regionName || null,
  };
}

function actualFuelLedgerPresent(entries = []) {
  return entries.some((entry) => (
    String(entry?.componentKey || "").toLowerCase() === "fuel"
      && String(entry?.recordKind || "").toUpperCase() === "ACTUAL"
      && Number.isSafeInteger(Number(entry?.amountMinor))
      && Number(entry.amountMinor) > 0
  ));
}

/**
 * Resolve the server-owned vehicle/route/reference inputs used by the ROOM
 * financial preview. This is only an adapter around the canonical
 * vehicleConsumptionReferences + operationalCostMath owners; it never writes
 * a ledger row and never lets a client supplied value replace a server-owned
 * route or reference.
 */
export function resolveAutomaticFuelInputs({ snapshot, costInputs = {}, fuelReference = null } = {}) {
  const profile = costInputs?.canonicalFuelProfile || null;
  const canonicalRoute = costInputs?.canonicalRoute || null;
  const hasCanonicalContext = Boolean(profile || canonicalRoute || fuelReference);
  if (!hasCanonicalContext) {
    return { modelInputs: {}, fuelResolution: null };
  }

  const vehicleType = pickText(profile?.vehicleType, snapshot?.vehicleType) || null;
  const fuelType = normalizeFuelType(profile?.fuelType);
  const consumption = resolveVehicleConsumptionReference({
    vehicleType,
    fuelType,
    actualReference: profile?.actualConsumptionReference || null,
    actualValue: profile?.actualConsumptionLitersPer100Km ?? null,
    platformReference: profile?.platformConsumptionReference || null,
    planningReference: costInputs?.planningFuelReference || null,
    planningValue: costInputs?.fuelConsumptionLitersPer100Km ?? null,
  });
  const referencePrice = selectedFuelPrice(fuelReference);
  const scenarioPriceMinor = pickMinor(costInputs?.fuelUnitPriceMinor);
  const price = scenarioPriceMinor != null
    ? {
      ...(referencePrice || {}),
      valueMinor: scenarioPriceMinor,
      currencyCode: pickText(costInputs?.fuelCurrencyCode, referencePrice?.currencyCode, "TRY").toUpperCase(),
      sourceName: "Kullanıcı senaryo varsayımı",
      authority: "SCENARIO_INPUT",
      priceSourceKind: "SCENARIO_INPUT",
    }
    : referencePrice;
  const serviceDistanceKm = pickNumber(canonicalRoute?.serviceDistanceKm, snapshot?.routeDistanceKm);
  const canonicalEmptyDistanceKm = pickNumber(canonicalRoute?.emptyDistanceKm);
  const scenarioEmptyDistanceKm = pickNumber(costInputs?.emptyDistanceKm);
  const emptyDistanceKm = pickNumber(canonicalEmptyDistanceKm, scenarioEmptyDistanceKm);
  const emptyDistanceSource = canonicalEmptyDistanceKm != null
    ? "CANONICAL_ROUTE"
    : scenarioEmptyDistanceKm != null
      ? "SCENARIO_INPUT"
      : null;
  const explicitTotalDistanceKm = pickNumber(costInputs?.totalDistanceKm);
  const derivedTotalDistanceKm = serviceDistanceKm != null && emptyDistanceKm != null
    ? serviceDistanceKm + emptyDistanceKm
    : null;
  const totalDistanceKm = pickNumber(explicitTotalDistanceKm, derivedTotalDistanceKm, canonicalRoute?.totalDistanceKm);
  const actualLedger = actualFuelLedgerPresent(costInputs?.roomCostLedgerInputs);
  const missing = [];
  if (totalDistanceKm == null) missing.push("Doğrulanmış rota mesafesi");
  if (emptyDistanceKm == null) missing.push("Doğrulanmış boş kilometre bilgisi");
  if (!consumption.selected?.available || consumption.selected?.valueLitersPer100Km == null) missing.push("Doğrulanmış araç tüketimi");
  if (!price) missing.push("Kaynaklı yakıt birim fiyatı");
  if (consumption.fuelTypeStatus !== "RESOLVED") missing.push("Araç yakıt türü doğrulaması");

  const referenceConsumption = consumption.selected?.valueLitersPer100Km ?? null;
  const estimatedLiters = totalDistanceKm != null && referenceConsumption != null
    ? Number(((totalDistanceKm * referenceConsumption) / 100).toFixed(4))
    : null;
  const estimatedAmountMinor = estimatedLiters != null && price
    ? Math.round(estimatedLiters * price.valueMinor)
    : null;
  const status = actualLedger
    ? "ACTUAL_LEDGER"
    : missing.length === 0
      ? (scenarioPriceMinor != null ? "SCENARIO_INPUT_ESTIMATE" : "AUTO_REFERENCE_ESTIMATE")
      : "INCOMPLETE_REFERENCE";
  const missingForConfirmed = actualLedger
    ? []
    : [...missing];

  return {
    modelInputs: {
      ...(totalDistanceKm != null ? { serviceDistanceKm, totalDistanceKm } : {}),
      ...(emptyDistanceKm != null ? { emptyDistanceKm } : {}),
      ...(referenceConsumption != null ? { fuelConsumptionLitersPer100Km: referenceConsumption } : {}),
      ...(price ? { fuelUnitPriceMinor: price.valueMinor, fuelCurrencyCode: price.currencyCode } : {}),
      ...(consumption.selected?.fuelType ? { fuelType: consumption.selected.fuelType } : {}),
    },
    fuelResolution: {
      status,
      serviceDistanceKm,
      emptyDistanceKm,
      totalDistanceKm,
      fuelType: consumption.selected?.fuelType || fuelType || null,
      fuelTypeStatus: consumption.fuelTypeStatus,
      consumptionLitersPer100Km: referenceConsumption,
      consumptionSource: consumption.selected?.sourceKind || null,
      consumptionSourceName: consumption.selected?.sourceName || null,
      consumptionConfidence: consumption.selected?.confidence || null,
      priceMinor: price?.valueMinor ?? null,
      priceCurrencyCode: price?.currencyCode || null,
      priceSourceName: price?.sourceName || null,
      priceSourceKind: price?.priceSourceKind || (scenarioPriceMinor != null ? "SCENARIO_INPUT" : "EXTERNAL_REFERENCE"),
      priceAsOf: price?.asOf || null,
      priceFreshness: price?.freshness || null,
      priceConfidence: price?.confidence || null,
      estimatedLiters,
      estimatedAmountMinor,
      actualLedgerUsed: actualLedger,
      estimatedFuelExcluded: actualLedger,
      missing: missingForConfirmed,
      formula: "Toplam km × L/100 km ÷ 100 × TL/L",
      emptyDistanceSource,
      distanceSource: emptyDistanceSource === "SCENARIO_INPUT"
        ? "SCENARIO_INPUT"
        : canonicalRoute?.source || "DB_ROUTE_SNAPSHOT",
      readOnly: true,
      previewOnly: true,
      writeAction: false,
    },
  };
}

function buildSnapshot({
  scope,
  room,
  company,
  shift,
  agreement,
  roomSummary = null,
  companySummary = null,
  explicitRegionName = null,
}) {
  const scopeKey = normalizeScope(scope);
  const region = resolveOperationRegion({
    shift,
    room,
    company,
    agreement,
    explicitRegionName,
  });
  const routeDistanceM = pickMinor(shift?.routeSnapshotDistanceM);
  const routeDurationSec = pickMinor(shift?.routeSnapshotDurationSec);
  const routeDistanceKm = routeDistanceM != null ? Number((routeDistanceM / 1000).toFixed(2)) : null;
  const routeDurationMin = routeDurationSec != null ? Math.max(0, Math.round(routeDurationSec / 60)) : null;
  const passengerCount = Math.max(
    0,
    pickMinor(shift?._count?.people, shift?.requiredPaxOverride, agreement?.passengerCount, shift?.passengerCount) ?? 0,
  );
  const vehicleCapacity = pickMinor(shift?.vehicle?.capacity);
  const currentRoomOfferMinor = pickMinor(shift?.roomOfferAmount, agreement?.roomOfferAmount);
  const currentCompanyOfferMinor = pickMinor(shift?.companyOfferAmount, agreement?.companyOfferAmount);
  const currentCommercialAmountMinor = scopeKey === "ROOM" ? currentRoomOfferMinor : currentCompanyOfferMinor;
  const currentCommercialAmountLabel = scopeKey === "ROOM" ? "Oda teklifi" : "Servis maliyeti / bütçe";
  const currentCommercialCounterLabel = scopeKey === "ROOM" ? "Firma teklifi" : "Oda etkisi";
  const roomName = pickText(room?.name, shift?.room?.name, agreement?.room?.name);
  const companyName = pickText(company?.name, shift?.company?.name, agreement?.company?.name);
  const status = pickText(shift?.status, agreement?.status, "DRAFT");
  const sourceLabel = pickText(
    shift?.id ? `Vardiya #${shift.id}` : "",
    agreement?.id ? `Sözleşme #${agreement.id}` : "",
    scopeKey === "ROOM" ? "Oda özeti" : "Şirket özeti",
  );

  return {
    scope: scopeKey,
    roomId: Number(room?.id || shift?.roomId || agreement?.roomId || 0) || null,
    companyId: Number(company?.id || shift?.companyId || agreement?.companyId || 0) || null,
    roomKind: pickText(room?.kind, agreement?.room?.kind, shift?.room?.kind).toUpperCase() || null,
    companyKind: pickText(company?.kind, agreement?.company?.kind, shift?.company?.kind).toUpperCase() || null,
    regionId: region.regionId,
    regionCode: region.provinceCode,
    regionName: region.regionName,
    regionResolution: region,
    roomName: roomName || null,
    companyName: companyName || null,
    shiftId: Number(shift?.id || 0) || null,
    agreementId: Number(agreement?.id || 0) || null,
    vehicleId: Number(shift?.vehicle?.id || agreement?.vehicle?.id || 0) || null,
    vehiclePlate: pickText(shift?.vehicle?.plate, agreement?.vehicle?.plate) || null,
    driverId: Number(shift?.driver?.id || agreement?.driver?.id || shift?.driverId || agreement?.driverId || 0) || null,
    driverName: pickText(shift?.driver?.fullName, agreement?.driver?.fullName) || null,
    shiftStatus: status,
    routeDistanceM,
    routeDistanceKm,
    routeDurationSec,
    routeDurationMin,
    passengerCount,
    vehicleCapacity,
    vehicleType: pickText(shift?.vehicle?.type).toUpperCase() || null,
    currentRoomOfferMinor,
    currentCompanyOfferMinor,
    currentCommercialAmountMinor,
    currentCommercialAmountLabel,
    currentCommercialCounterLabel,
    sourceLabel,
    activeShiftCount: Number(roomSummary?.cards?.approvedOrActiveShifts ?? companySummary?.cards?.activeShiftCount ?? 0) || 0,
    activeAgreementCount: Number(roomSummary?.cards?.activeAgreements ?? companySummary?.cards?.activeAgreements ?? 0) || 0,
    openOfferCount: Number(roomSummary?.cards?.openOffers ?? companySummary?.cards?.openOffersCount ?? 0) || 0,
    counterOfferCount: Number(roomSummary?.cards?.counteredOffers ?? companySummary?.cards?.counterShiftCount ?? 0) || 0,
    requestedAgreementCount: Number(roomSummary?.cards?.requestedAgreements ?? companySummary?.cards?.requestedAgreements ?? 0) || 0,
    companyBudgetCount: Number(companySummary?.cards?.todayAgreements ?? 0) || 0,
    roomSummary: roomSummary || null,
    companySummary: companySummary || null,
  };
}

function buildCostModelInput(snapshot, costInputs = {}) {
  const roomCostLedgerInputs = Array.isArray(costInputs.roomCostLedgerInputs)
    ? costInputs.roomCostLedgerInputs
    : Array.isArray(costInputs.roomCostPlanningEvidence?.actualInputs)
      ? costInputs.roomCostPlanningEvidence.actualInputs
      : [];
  const defaultSourceRef = snapshot.shiftId
    ? `shift-${snapshot.shiftId}`
    : snapshot.agreementId
      ? `agreement-${snapshot.agreementId}`
      : snapshot.sourceLabel;
  const defaultRouteRef = snapshot.shiftId ? `shift-${snapshot.shiftId}` : null;
  const defaultShiftRef = snapshot.shiftId ? `shift-${snapshot.shiftId}` : null;
  const defaultVehicleRef = snapshot.shiftId ? `vehicle-${snapshot.shiftId}` : null;
  const defaultDriverRef = snapshot.shiftId ? `driver-${snapshot.shiftId}` : null;
  return {
    sourceType: snapshot.scope === "ROOM" ? "room_financial_operations_preview" : "company_financial_operations_preview",
    sourceRef: costInputs.sourceRef !== undefined ? costInputs.sourceRef : defaultSourceRef,
    routeRef: costInputs.routeRef !== undefined ? costInputs.routeRef : defaultRouteRef,
    shiftRef: costInputs.shiftRef !== undefined ? costInputs.shiftRef : defaultShiftRef,
    vehicleRef: costInputs.vehicleRef !== undefined ? costInputs.vehicleRef : defaultVehicleRef,
    driverRef: costInputs.driverRef !== undefined ? costInputs.driverRef : defaultDriverRef,
    currencyCode: pickText(costInputs.currencyCode, "TRY").toUpperCase(),
    serviceDistanceKm: pickNumber(costInputs.serviceDistanceKm, snapshot.routeDistanceKm),
    emptyDistanceKm: pickNumber(costInputs.emptyDistanceKm),
    totalDistanceKm: pickNumber(costInputs.totalDistanceKm),
    routeDurationMinutes: pickNumber(costInputs.routeDurationMinutes, snapshot.routeDurationMin),
    waitingMinutes: pickNumber(costInputs.waitingMinutes),
    overtimeMinutes: pickNumber(costInputs.overtimeMinutes),
    shiftCount: pickNumber(costInputs.shiftCount, snapshot.activeShiftCount > 0 ? snapshot.activeShiftCount : 1),
    serviceDayCount: pickNumber(costInputs.serviceDayCount),
    passengerCount: pickNumber(costInputs.passengerCount, snapshot.passengerCount),
    vehicleCapacity: pickNumber(costInputs.vehicleCapacity, snapshot.vehicleCapacity),
    tripCount: pickNumber(costInputs.tripCount),
    fuelConsumptionLitersPer100Km: pickNumber(costInputs.fuelConsumptionLitersPer100Km),
    fuelUnitPriceMinor: toMinor(costInputs.fuelUnitPriceMinor),
    vehicleLeaseMonthlyMinor: toMinor(costInputs.vehicleLeaseMonthlyMinor),
    vehicleDepreciationMonthlyMinor: toMinor(costInputs.vehicleDepreciationMonthlyMinor),
    insuranceMonthlyMinor: toMinor(costInputs.insuranceMonthlyMinor),
    taxAndLicenseMonthlyMinor: toMinor(costInputs.taxAndLicenseMonthlyMinor),
    fixedVehicleCostMonthlyMinor: toMinor(costInputs.fixedVehicleCostMonthlyMinor),
    allocationServiceDaysPerMonth: pickNumber(costInputs.allocationServiceDaysPerMonth),
    allocationShiftsPerMonth: pickNumber(costInputs.allocationShiftsPerMonth),
    allocationMonthFraction: pickNumber(costInputs.allocationMonthFraction),
    explicitVehicleFixedCostAllocatedMinor: toMinor(costInputs.explicitVehicleFixedCostAllocatedMinor),
    vehicleFixedCostAllocationMode: pickText(costInputs.vehicleFixedCostAllocationMode),
    maintenancePerKmMinor: toMinor(costInputs.maintenancePerKmMinor),
    tirePerKmMinor: toMinor(costInputs.tirePerKmMinor),
    depreciationPerKmMinor: toMinor(costInputs.depreciationPerKmMinor),
    cleaningPerShiftMinor: toMinor(costInputs.cleaningPerShiftMinor),
    vehicleWearPerKmMinor: toMinor(costInputs.vehicleWearPerKmMinor),
    driverBasePerShiftMinor: toMinor(costInputs.driverBasePerShiftMinor),
    driverHourlyCostMinor: toMinor(costInputs.driverHourlyCostMinor),
    driverCompensationMode: pickText(costInputs.driverCompensationMode),
    mealAllowancePerShiftMinor: toMinor(costInputs.mealAllowancePerShiftMinor),
    socialCostAllocationMinor: toMinor(costInputs.socialCostAllocationMinor),
    driverWaitingHourlyCostMinor: toMinor(costInputs.driverWaitingHourlyCostMinor),
    driverOvertimeHourlyCostMinor: toMinor(costInputs.driverOvertimeHourlyCostMinor),
    tollMinor: toMinor(costInputs.tollMinor),
    bridgeMinor: toMinor(costInputs.bridgeMinor),
    highwayMinor: toMinor(costInputs.highwayMinor),
    parkingMinor: toMinor(costInputs.parkingMinor),
    terminalMinor: toMinor(costInputs.terminalMinor),
    routeFeeMinor: toMinor(costInputs.routeFeeMinor),
    otherDirectRouteFeeMinor: toMinor(costInputs.otherDirectRouteFeeMinor),
    operationsOverheadFixedMinor: toMinor(costInputs.operationsOverheadFixedMinor),
    operationsOverheadPerShiftMinor: toMinor(costInputs.operationsOverheadPerShiftMinor),
    operationsOverheadRateBps: toBps(costInputs.operationsOverheadRateBps),
    operationsOverheadRateBaseMinor: toMinor(costInputs.operationsOverheadRateBaseMinor),
    dispatchControlCostMinor: toMinor(costInputs.dispatchControlCostMinor),
    trackingTechnologyCostMinor: toMinor(costInputs.trackingTechnologyCostMinor),
    otherOverheadMinor: toMinor(costInputs.otherOverheadMinor),
    otherDirectCostMinor: toMinor(costInputs.otherDirectCostMinor),
    qualityAdjustmentPreviewMinor: toMinor(costInputs.qualityAdjustmentPreviewMinor),
    hakedisAdjustmentPreviewMinor: toMinor(costInputs.hakedisAdjustmentPreviewMinor),
    contractualAdjustmentPreviewMinor: toMinor(costInputs.contractualAdjustmentPreviewMinor),
    includeExternalPreviewAdjustments: Boolean(costInputs.includeExternalPreviewAdjustments),
    roomCostLedgerInputs,
  };
}

function buildQuoteFloorPreview({
  baselineOperationalCostMinor,
  currentCommercialAmountMinor,
  passengerCount,
  targetContributionBps,
  riskReserveBps,
  baselineSource,
}) {
  const missingFields = [];
  if (baselineOperationalCostMinor == null) missingFields.push("manualBaselineOperationalCostMinor");
  if (targetContributionBps == null) missingFields.push("targetContributionBps");
  if (riskReserveBps == null) missingFields.push("riskReserveBps");

  const marginRate = targetContributionBps == null ? null : Number(targetContributionBps) / 10000;
  const riskRate = riskReserveBps == null ? null : Number(riskReserveBps) / 10000;
  if (marginRate != null && (marginRate < 0 || marginRate >= 1)) missingFields.push("targetContributionBpsBelow10000");
  if (riskRate != null && riskRate < 0) missingFields.push("riskReserveBpsNonNegative");

  const computed = missingFields.length === 0;
  const reserveBps = computed ? Number(targetContributionBps || 0) + Number(riskReserveBps || 0) : null;
  const riskAdjustedCostMinor = computed
    ? Math.ceil(Number(baselineOperationalCostMinor || 0) * (1 + riskRate))
    : null;
  const quoteFloorMinor = computed
    ? Math.max(0, Math.ceil(riskAdjustedCostMinor / (1 - marginRate)))
    : null;
  const quoteFloorPerPassengerMinor = computed && Number(passengerCount || 0) > 0
    ? Math.max(0, Math.round(quoteFloorMinor / Number(passengerCount || 1)))
    : null;
  const marginGapMinor = computed && currentCommercialAmountMinor != null
    ? Number(currentCommercialAmountMinor || 0) - Number(quoteFloorMinor || 0)
    : null;

  return {
    computed,
    baselineOperationalCostMinor,
    baselineSource,
    targetContributionBps,
    riskReserveBps,
    reserveBps,
    riskAdjustedCostMinor,
    contributionMarginBasis: "PRICE_PERCENT",
    formula: "risk-adjusted cost ÷ (1 - hedef katkı marjı)",
    quoteFloorMinor,
    quoteFloorPerPassengerMinor,
    currentCommercialAmountMinor,
    marginGapMinor,
    missingFields,
    summaryText: computed
      ? `Teklif tabanı önizlemesi hazırlandı; herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.`
      : `Teklif tabanı önizlemesi için açık parametreler bekleniyor; herhangi bir ödeme, fatura veya muhasebe kaydı oluşturulmadı.`,
    previewOnly: true,
    readOnly: true,
    writeAction: false,
  };
}

function decisionPeriodOverlaps(entry, periodStart, periodEnd) {
  const leftStart = new Date(entry?.periodStart || entry?.occurredAt || "").getTime();
  const leftEnd = new Date(entry?.periodEnd || entry?.occurredAt || "").getTime();
  const rightStart = new Date(periodStart || "").getTime();
  const rightEnd = new Date(periodEnd || "").getTime();
  if (![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)) return false;
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function decisionSignedAmount(entry) {
  const amountMinor = Number(entry?.amountMinor);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return entry?.isReversal ? -amountMinor : amountMinor;
}

function optionalMinor(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const amountMinor = Number(value);
  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
}

const VAT_KNOWN_CLASSIFICATIONS = new Set([
  "DOCUMENTED_VAT",
  "OUT_OF_SCOPE",
  "DOCUMENTED_EXEMPT",
  "VERIFIED_ZERO_RATE",
]);

function normalizedVatValue(value) {
  return String(value || "").trim().toUpperCase();
}

function hasVatEvidence(item = {}) {
  return Boolean(String(item?.vatEvidenceRef || "").trim() && String(item?.vatClassificationReason || "").trim());
}

function knownVatClassification(item = {}) {
  const classification = normalizedVatValue(item?.vatClassification);
  const vatMode = normalizedVatValue(item?.vatMode);
  if (!VAT_KNOWN_CLASSIFICATIONS.has(classification) || vatMode === "UNKNOWN" || !hasVatEvidence(item)) return false;
  if (classification === "DOCUMENTED_VAT") {
    const vatAmountMinor = optionalMinor(item?.vatAmountMinor);
    return vatAmountMinor != null && vatAmountMinor >= 0;
  }
  return true;
}

function vatAmountFor(item = {}) {
  if (!knownVatClassification(item)) return null;
  if (normalizedVatValue(item?.vatClassification) !== "DOCUMENTED_VAT") return 0;
  return optionalMinor(item?.vatAmountMinor);
}

function normalizedVatDeductibility(item = {}) {
  const value = normalizedVatValue(item?.vatDeductibility);
  return ["DEDUCTIBLE", "NON_DEDUCTIBLE", "NOT_APPLICABLE", "UNKNOWN"].includes(value)
    ? value
    : "UNKNOWN";
}

function taxBasisIsVerified(taxBasis = null) {
  const rateBps = optionalMinor(taxBasis?.rateBps);
  return rateBps != null
    && rateBps >= 0
    && rateBps <= 10000
    && Boolean(String(taxBasis?.sourceRef || "").trim())
    && Boolean(String(taxBasis?.evidenceRef || "").trim())
    && Boolean(String(taxBasis?.reason || "").trim());
}

function vatScopedEntry(entry = {}, countedAmountMinor) {
  const counted = Number(countedAmountMinor);
  if (!Number.isSafeInteger(counted) || counted === 0) return null;
  const original = Math.abs(Number(entry?.amountMinor));
  const suppliedVat = optionalMinor(entry?.vatAmountMinor);
  const scaledVat = suppliedVat != null && Number.isSafeInteger(original) && original > 0
    ? Math.round(suppliedVat * Math.abs(counted) / original)
    : suppliedVat;
  return {
    ...entry,
    amountMinor: Math.abs(counted),
    isReversal: counted < 0,
    vatAmountMinor: scaledVat,
  };
}

/**
 * Server-owned KDV-aware operational result. This function only consumes
 * already scoped, authoritative revenue and ACTUAL cost records; it never
 * creates ledger rows or infers tax/deductibility from a missing field.
 */
export function buildVatAdjustedProfitabilitySummary({
  periodStart,
  periodEnd,
  earnedIncomeLines = [],
  costEntries = [],
  taxBasis = null,
} = {}) {
  const blockers = [];
  const missing = [];
  const currencies = new Set();
  const sourceEntryIds = [];
  const sourceIncomeIds = [];
  const unknownVatSourceIds = [];
  const countedCostIds = new Set();
  let grossEarnedRevenueMinor = 0;
  let documentedOutputVatMinor = 0;
  let grossActualCostMinor = 0;
  let deductibleInputVatMinor = 0;
  let nonDeductibleInputVatMinor = 0;
  let unknownVatAmountMinor = 0;
  let unknownVatAmountKnown = true;
  let incomeVatComplete = true;
  let costVatComplete = true;

  const incomeLines = Array.isArray(earnedIncomeLines) ? earnedIncomeLines : [];
  for (const line of incomeLines) {
    const amountMinor = optionalMinor(line?.amountMinor);
    if (amountMinor == null || amountMinor < 0) {
      blockers.push("EARNED_REVENUE_AMOUNT_INVALID");
      continue;
    }
    grossEarnedRevenueMinor += amountMinor;
    const incomeId = Number(line?.id || line?.hakedisId || line?.invoiceId || 0);
    if (Number.isSafeInteger(incomeId) && incomeId > 0) sourceIncomeIds.push(incomeId);
    const currency = String(line?.currencyCode || "").trim().toUpperCase();
    if (currency) currencies.add(currency);
    else blockers.push("EARNED_REVENUE_CURRENCY_MISSING");
    const vatAmountMinor = vatAmountFor(line);
    if (vatAmountMinor == null) {
      blockers.push("VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN");
      incomeVatComplete = false;
      if (Number.isSafeInteger(incomeId) && incomeId > 0) unknownVatSourceIds.push(incomeId);
      const suppliedVat = optionalMinor(line?.vatAmountMinor);
      if (suppliedVat != null) unknownVatAmountMinor += suppliedVat;
      else unknownVatAmountKnown = false;
    } else {
      documentedOutputVatMinor += vatAmountMinor;
    }
  }
  if (!incomeLines.length) missing.push("earnedIncomeEvidence");

  for (const entry of Array.isArray(costEntries) ? costEntries : []) {
    const entryId = Number(entry?.id || entry?.entryId || 0);
    if (!Number.isSafeInteger(entryId) || entryId <= 0 || countedCostIds.has(entryId)) continue;
    const amountMinor = decisionSignedAmount(entry);
    if (amountMinor == null) continue;
    if (String(entry?.lifecycle || "").toUpperCase() !== "CONFIRMED"
      || String(entry?.recordKind || "").toUpperCase() !== "ACTUAL") continue;
    if (!decisionPeriodOverlaps(entry, periodStart, periodEnd)) continue;
    countedCostIds.add(entryId);
    sourceEntryIds.push(entryId);
    grossActualCostMinor += amountMinor;
    const currency = String(entry?.currencyCode || "").trim().toUpperCase();
    if (currency) currencies.add(currency);
    else blockers.push("ACTUAL_COST_CURRENCY_MISSING");

    const vatAmountMinor = vatAmountFor(entry);
    if (vatAmountMinor == null) {
      blockers.push("VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN");
      costVatComplete = false;
      unknownVatSourceIds.push(entryId);
      const suppliedVat = optionalMinor(entry?.vatAmountMinor);
      if (suppliedVat != null) unknownVatAmountMinor += suppliedVat;
      else unknownVatAmountKnown = false;
      continue;
    }

    const classification = normalizedVatValue(entry?.vatClassification);
    if (classification !== "DOCUMENTED_VAT") continue;
    const deductibility = normalizedVatDeductibility(entry);
    if (deductibility === "DEDUCTIBLE") deductibleInputVatMinor += vatAmountMinor;
    else if (deductibility === "NON_DEDUCTIBLE") nonDeductibleInputVatMinor += vatAmountMinor;
    else {
      blockers.push("VAT_DEDUCTIBILITY_NOT_PROVEN");
      costVatComplete = false;
      unknownVatSourceIds.push(entryId);
      unknownVatAmountMinor += vatAmountMinor;
    }
  }
  if (!countedCostIds.size) missing.push("realizedActualCostEvidence");
  if (currencies.size > 1) blockers.push("MIXED_CURRENCIES");

  const uniqueBlockers = [...new Set(blockers)];
  const incomeCurrencyComplete = incomeLines.length > 0
    && incomeLines.every((line) => String(line?.currencyCode || "").trim());
  const costCurrencyComplete = countedCostIds.size > 0
    && [...countedCostIds].every((entryId) => {
      const entry = (Array.isArray(costEntries) ? costEntries : []).find((item) => Number(item?.id || item?.entryId || 0) === entryId);
      return Boolean(String(entry?.currencyCode || "").trim());
    });
  const singleCurrency = currencies.size <= 1;
  const incomeResultReady = incomeVatComplete && incomeCurrencyComplete && singleCurrency;
  const costResultReady = costVatComplete && costCurrencyComplete && singleCurrency;
  const netEarnedRevenueMinor = !incomeResultReady || !incomeLines.length
    ? null
    : grossEarnedRevenueMinor - documentedOutputVatMinor;
  const costForProfitMinor = countedCostIds.size && costResultReady
    ? grossActualCostMinor - deductibleInputVatMinor
    : null;
  const vatAdjustedOperatingProfitMinor = netEarnedRevenueMinor != null && costForProfitMinor != null
    ? netEarnedRevenueMinor - costForProfitMinor
    : null;
  const verifiedTaxBasis = taxBasisIsVerified(taxBasis);
  const estimatedAfterTaxNetProfitMinor = verifiedTaxBasis && vatAdjustedOperatingProfitMinor != null
    ? vatAdjustedOperatingProfitMinor - Math.max(0, Math.round(vatAdjustedOperatingProfitMinor * Number(taxBasis.rateBps) / 10000))
    : null;
  if (!verifiedTaxBasis) uniqueBlockers.push("VERIFIED_TAX_BASIS_MISSING");

  return Object.freeze({
    grossEarnedRevenueMinor: incomeLines.length ? grossEarnedRevenueMinor : null,
    documentedOutputVatMinor: incomeResultReady ? documentedOutputVatMinor : null,
    netEarnedRevenueMinor,
    grossActualCostMinor: countedCostIds.size ? grossActualCostMinor : null,
    deductibleInputVatMinor: countedCostIds.size && costResultReady ? deductibleInputVatMinor : null,
    nonDeductibleInputVatMinor: countedCostIds.size && costResultReady ? nonDeductibleInputVatMinor : null,
    unknownVatAmountMinor: unknownVatAmountKnown ? unknownVatAmountMinor : null,
    costForProfitMinor,
    vatAdjustedOperatingProfitMinor,
    vatAdjustedOperatingProfitStatus: vatAdjustedOperatingProfitMinor != null ? "READY" : "NOT_PROVEN",
    estimatedOperationalNetProfitMinor: vatAdjustedOperatingProfitMinor,
    estimatedOperationalNetProfitStatus: vatAdjustedOperatingProfitMinor != null ? "READY" : "NOT_PROVEN",
    estimatedAfterTaxNetProfitMinor,
    estimatedAfterTaxNetProfitStatus: estimatedAfterTaxNetProfitMinor != null ? "READY" : "NOT_PROVEN",
    vatPositionMinor: incomeResultReady && costResultReady
      ? documentedOutputVatMinor - deductibleInputVatMinor
      : null,
    vatPositionStatus: incomeResultReady && costResultReady ? "READY" : "NOT_PROVEN",
    vatBreakdown: {
      outputVatMinor: incomeResultReady ? documentedOutputVatMinor : null,
      deductibleInputVatMinor: countedCostIds.size && costResultReady ? deductibleInputVatMinor : null,
      nonDeductibleInputVatMinor: countedCostIds.size && costResultReady ? nonDeductibleInputVatMinor : null,
      unknownVatAmountMinor: unknownVatAmountKnown ? unknownVatAmountMinor : null,
    },
    profitabilityEvidence: {
      earnedIncomeSourceIds: [...new Set(sourceIncomeIds)],
      actualCostSourceIds: [...new Set(sourceEntryIds)],
      unknownVatSourceIds: [...new Set(unknownVatSourceIds)],
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      currencyCode: currencies.size === 1 ? [...currencies][0] : null,
      blockers: [...new Set(uniqueBlockers)],
    },
    blockers: [...new Set(uniqueBlockers)],
    missing: [...new Set(missing)],
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}

/**
 * Read-only contract/month decision summary. Contract total, earned revenue,
 * collection and realized cost intentionally remain separate economic facts.
 */
export function selectContractShiftIds({ agreementId, shifts = [] } = {}) {
  const selectedAgreementId = Number(agreementId || 0) || null;
  if (!selectedAgreementId) return [];
  return (Array.isArray(shifts) ? shifts : [])
    .filter((shift) => Number(shift?.agreementId || 0) === selectedAgreementId)
    .map((shift) => Number(shift?.id || 0))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
}

export function buildContractMonthDecisionSummary({
  agreementId,
  periodStart,
  periodEnd,
  accountingPeriodClosed = false,
  contractTotalMinor = null,
  realizedIncomeEvidence = null,
  plannedCostMinor = null,
  shiftIds = [],
  costEntries = [],
} = {}) {
  const selectedAgreementId = Number(agreementId || 0) || null;
  const selectedShiftIds = new Set((Array.isArray(shiftIds) ? shiftIds : []).map((value) => Number(value || 0)).filter(Boolean));
  const blockers = [];
  const missing = [];
  const currencies = new Set();
  const costLineage = [];
  const costComponents = new Map();
  const countedEntryIds = new Set();
  const vatCostEntries = [];
  let realizedActualCostMinor = 0;

  const incomeLines = Array.isArray(realizedIncomeEvidence?.lines)
    ? realizedIncomeEvidence.lines.filter((line) => Number(line?.agreementId || 0) === selectedAgreementId)
    : [];
  const earnedRevenueMinor = realizedIncomeEvidence?.status === "AVAILABLE" && realizedIncomeEvidence?.authoritative === true && incomeLines.length
    ? incomeLines.reduce((sum, line) => sum + (Number.isSafeInteger(Number(line?.amountMinor)) ? Number(line.amountMinor) : 0), 0)
    : null;
  if (earnedRevenueMinor == null) missing.push("earnedRevenueEvidence");
  const earnedIncomeCurrencies = new Set(incomeLines.map((line) => String(line?.currencyCode || "").trim().toUpperCase()).filter(Boolean));
  if (earnedIncomeCurrencies.size > 1) blockers.push("MIXED_CURRENCIES");
  for (const currency of earnedIncomeCurrencies) currencies.add(currency);

  for (const entry of Array.isArray(costEntries) ? costEntries : []) {
    const amountMinor = decisionSignedAmount(entry);
    if (amountMinor == null || String(entry?.lifecycle || "").toUpperCase() !== "CONFIRMED" || String(entry?.recordKind || "").toUpperCase() !== "ACTUAL") continue;
    if (!decisionPeriodOverlaps(entry, periodStart, periodEnd) || String(entry?.allocation || "").toUpperCase() === "EXCLUDED_FROM_ROLLUP") continue;
    const entryAgreementMatch = Number(entry?.agreementId || 0) === selectedAgreementId;
    const entryShiftMatch = selectedShiftIds.has(Number(entry?.shiftId || 0));
    const allocationLines = Array.isArray(entry?.allocationLines) ? entry.allocationLines : [];
    const matchingLines = allocationLines.filter((line) => Number(line?.agreementId || 0) === selectedAgreementId || selectedShiftIds.has(Number(line?.shiftId || 0)));
    if (!entryAgreementMatch && !entryShiftMatch && !matchingLines.length) continue;
    if (countedEntryIds.has(entry.id)) continue;

    const matchingLineAmountMinor = matchingLines.reduce((sum, line) => {
      const value = Number(line?.allocatedAmountMinor);
      return Number.isSafeInteger(value) && value > 0 ? sum + value : sum;
    }, 0);
    const countedAmountMinor = allocationLines.length && matchingLineAmountMinor > 0 && !entryAgreementMatch && !entryShiftMatch
      ? (entry?.isReversal ? -matchingLineAmountMinor : matchingLineAmountMinor)
      : amountMinor;
    countedEntryIds.add(entry.id);
    const vatEntry = vatScopedEntry(entry, countedAmountMinor);
    if (vatEntry) vatCostEntries.push(vatEntry);
    realizedActualCostMinor += countedAmountMinor;
    const categoryKey = String(entry?.categoryKey || "OTHER_OPERATION").trim().toUpperCase();
    const component = costComponents.get(categoryKey) || { categoryKey, amountMinor: 0, sourceEntryIds: [], currencyCode: null };
    component.amountMinor += countedAmountMinor;
    component.currencyCode = String(entry?.currencyCode || "").trim().toUpperCase() || component.currencyCode;
    if (!component.sourceEntryIds.includes(entry.id)) component.sourceEntryIds.push(entry.id);
    costComponents.set(categoryKey, component);
    const currency = String(entry?.currencyCode || "").trim().toUpperCase();
    if (currency) currencies.add(currency);
    else blockers.push("ACTUAL_COST_CURRENCY_MISSING");
    if (!isVatNetRollupEligible(entry)) blockers.push("VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN");
    costLineage.push({ entryId: entry.id, sourceRef: entry?.sourceRef || null, amountMinor: countedAmountMinor, shiftIds: matchingLines.map((line) => Number(line?.shiftId || 0)).filter(Boolean), counted: true });
  }
  if (!countedEntryIds.size) missing.push("realizedActualCostEvidence");
  if (currencies.size > 1) blockers.push("MIXED_CURRENCIES");
  if (accountingPeriodClosed !== true) blockers.push("ACCOUNTING_PERIOD_NOT_CLOSED");
  const activityResultMinor = earnedRevenueMinor != null && countedEntryIds.size ? earnedRevenueMinor - realizedActualCostMinor : null;
  const confirmedNetProfitMinor = activityResultMinor != null && accountingPeriodClosed === true && blockers.length === 0 ? activityResultMinor : null;
  const collectionEvidence = realizedIncomeEvidence?.collectionEvidence || {};
  const receivableEvidence = realizedIncomeEvidence?.receivableEvidence || {};
  const vatAdjustedProfitability = buildVatAdjustedProfitabilitySummary({
    periodStart,
    periodEnd,
    earnedIncomeLines: earnedRevenueMinor == null ? [] : incomeLines,
    costEntries: vatCostEntries,
  });

  // Income evidence is assembled at ROOM + period scope, while this summary
  // is agreement-scoped. When the source includes collection records, scope
  // both cash and receivable to the selected agreement's matched invoices;
  // otherwise a different agreement's payment can appear on this contract.
  const selectedInvoiceIds = new Set(
    incomeLines
      .map((line) => Number(line?.invoiceId || 0))
      .filter((invoiceId) => Number.isSafeInteger(invoiceId) && invoiceId > 0),
  );
  const selectedInvoiceAmountMinor = incomeLines.reduce((sum, line) => {
    const invoiceId = Number(line?.invoiceId || 0);
    const amountMinor = Number(line?.amountMinor);
    return selectedInvoiceIds.has(invoiceId) && Number.isSafeInteger(amountMinor) && amountMinor >= 0
      ? sum + amountMinor
      : sum;
  }, 0);
  const collectionRecords = Array.isArray(collectionEvidence.records) ? collectionEvidence.records : [];
  const hasScopedCollectionRecords = collectionRecords.length > 0;
  const scopedCollectionRecords = collectionRecords.filter((record) => selectedInvoiceIds.has(Number(record?.invoiceId || 0)));
  const scopedCollectedCashMinor = hasScopedCollectionRecords
    ? scopedCollectionRecords.reduce((sum, record) => {
      const amountMinor = Number(record?.amountMinor);
      if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return sum;
      return String(record?.direction || "COLLECTION").toUpperCase() === "REVERSAL"
        ? sum - amountMinor
        : sum + amountMinor;
    }, 0)
    : null;
  const collectedCashMinor = hasScopedCollectionRecords
    ? scopedCollectedCashMinor
    : collectionEvidence.status === "AVAILABLE" ? collectionEvidence.amountMinor ?? null : null;
  const receivableMinor = hasScopedCollectionRecords && selectedInvoiceIds.size
    ? selectedInvoiceAmountMinor - Number(scopedCollectedCashMinor || 0)
    : receivableEvidence.status === "AVAILABLE" ? receivableEvidence.amountMinor ?? null : null;
  if (hasScopedCollectionRecords && selectedInvoiceIds.size && (Number(scopedCollectedCashMinor) < 0 || Number(scopedCollectedCashMinor) > selectedInvoiceAmountMinor)) {
    blockers.push("COLLECTION_SCOPE_MISMATCH");
  }
  return Object.freeze({
    agreementId: selectedAgreementId,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    contractTotalMinor: optionalMinor(contractTotalMinor),
    earnedRevenueMinor,
    collectedCashMinor,
    receivableMinor,
    realizedActualCostMinor: countedEntryIds.size ? realizedActualCostMinor : null,
    plannedCostMinor: optionalMinor(plannedCostMinor),
    activityResultMinor,
    confirmedNetProfitMinor,
    vatAdjustedProfitability,
    status: activityResultMinor != null ? "PROVISIONAL_ACTIVITY_RESULT" : "NOT_PROVEN",
    costComponents: [...costComponents.values()],
    costLineage,
    blockers: [...new Set(blockers)],
    missing: [...new Set(missing)],
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  });
}

export function buildNewOfferDecisionSummary({
  baselineOperationalCostMinor = null,
  targetContributionBps = null,
  riskReserveBps = null,
  currentOfferMinor = null,
  scenarioOfferMinor = null,
  passengerCount = null,
  baselineSource = "CANONICAL_PLAN_OR_ACTUAL",
} = {}) {
  const quoteFloor = buildQuoteFloorPreview({
    baselineOperationalCostMinor: pickMinor(baselineOperationalCostMinor),
    currentCommercialAmountMinor: pickMinor(currentOfferMinor),
    passengerCount: pickMinor(passengerCount),
    targetContributionBps: toBps(targetContributionBps),
    riskReserveBps: toBps(riskReserveBps),
    baselineSource,
  });
  const scenarioAmount = pickMinor(scenarioOfferMinor);
  const scenarioActivityResultMinor = scenarioAmount != null && quoteFloor.baselineOperationalCostMinor != null
    ? scenarioAmount - quoteFloor.baselineOperationalCostMinor
    : null;
  const scenarioContributionMarginBps = scenarioAmount != null && scenarioAmount > 0 && scenarioActivityResultMinor != null
    ? Math.round((scenarioActivityResultMinor / scenarioAmount) * 10000)
    : null;
  return Object.freeze({
    status: quoteFloor.computed ? "READY_FOR_REVIEW" : "NOT_PROVEN",
    ...quoteFloor,
    scenarioOfferMinor: scenarioAmount,
    scenarioActivityResultMinor,
    scenarioContributionMarginBps,
    offerSubmissionAllowed: false,
    nextAction: quoteFloor.computed ? "Kullanıcı minimum teklif tabanını gözden geçirir; teklif gönderimi bu önizlemede yapılmaz." : "Eksik teklif parametrelerini tamamla.",
  });
}

function buildRoomProfitabilitySection(snapshot, model, quoteFloor, costInputs = {}) {
  const currentOfferMinor = snapshot.currentCommercialAmountMinor;
  const scenarioOfferMinor = pickMinor(costInputs?.quoteScenarioAmountMinor);
  const baselineMinor = quoteFloor.baselineOperationalCostMinor;
  const contextBlocked = costInputs?.serviceContextCoherent === false;
  const estimatedProfitMinor = !contextBlocked && currentOfferMinor != null && baselineMinor != null
    ? Number(currentOfferMinor || 0) - Number(baselineMinor || 0)
    : null;
  const scenarioProfitMinor = !contextBlocked && scenarioOfferMinor != null && baselineMinor != null
    ? Number(scenarioOfferMinor || 0) - Number(baselineMinor || 0)
    : null;
  const actualOperationalCostMinor = pickMinor(costInputs?.roomCostPlanningEvidence?.actual?.grossAmountMinor);
  const confirmedEligible = !contextBlocked && model?.status === "complete"
    && model?.netRollupBlocked !== true
    && quoteFloor?.baselineSource !== "MANUAL_BASELINE_OVERRIDE"
    && actualOperationalCostMinor != null
    && currentOfferMinor != null
    && (!costInputs?.fuelResolution
      || String(costInputs.fuelResolution.status || "").toUpperCase() === "ACTUAL_LEDGER");
  const confirmedProfitMinor = confirmedEligible
    ? Number(currentOfferMinor || 0) - Number(actualOperationalCostMinor || 0)
    : null;
  const marginBps = confirmedProfitMinor != null && currentOfferMinor != null && Number(currentOfferMinor || 0) > 0
    ? Math.round((confirmedProfitMinor / Number(currentOfferMinor || 1)) * 10000)
    : null;
  const profitabilityStatus = contextBlocked
    ? "BLOCKED"
    : confirmedProfitMinor != null
    ? "CONFIRMED"
    : estimatedProfitMinor != null
      ? "ESTIMATED"
      : "BLOCKED";
  return {
    title: "Teklif ve kârlılık önizlemesi",
    currentOfferMinor,
    scenarioOfferMinor,
    baselineOperationalCostMinor: baselineMinor,
    actualOperationalCostMinor,
    profitMinor: estimatedProfitMinor,
    estimatedProfitMinor,
    estimatedMarginBps: estimatedProfitMinor != null && currentOfferMinor > 0
      ? Math.round((estimatedProfitMinor / currentOfferMinor) * 10000)
      : null,
    scenarioProfitMinor,
    scenarioMarginBps: scenarioProfitMinor != null && scenarioOfferMinor > 0
      ? Math.round((scenarioProfitMinor / scenarioOfferMinor) * 10000)
      : null,
    confirmedProfitMinor,
    marginBps,
    profitabilityStatus,
    netRollupBlocked: model?.netRollupBlocked === true,
    contextBlocked,
    contextReason: costInputs?.serviceContextReason || null,
    fuelCalculation: costInputs?.fuelResolution || null,
    completenessScore: Number(model?.dataQuality?.completenessScore || 0) || 0,
    confidenceLevel: confirmedEligible ? (model?.dataQuality?.confidenceLevel || "low") : "low",
    missingFields: Array.from(new Set([...(model?.missingFields || []), ...(quoteFloor?.missingFields || [])])),
    costInputs: {
      targetContributionBps: quoteFloor.targetContributionBps,
      riskReserveBps: quoteFloor.riskReserveBps,
      manualBaselineOperationalCostMinor: costInputs.manualBaselineOperationalCostMinor ?? costInputs.baselineOperationalCostMinor ?? null,
    },
    summaryText: contextBlocked
      ? "Seçili teklif ve hizmet bağlamı uyuşmuyor; kârlılık hesabı gösterilmiyor."
      : profitabilityStatus === "CONFIRMED"
      ? `Gerçekleşen kanıtlarla kârlılık önizlemesi hazırlandı; bu alan salt okunur önizleme olarak kalır.`
      : profitabilityStatus === "ESTIMATED"
        ? `Tahmini kârlılık gösteriliyor; eksik veya manuel varsayımlar nedeniyle doğrulanmış net kâr değildir.`
      : `Oda kârlılığı önizlemesi için daha fazla veri gerekli; bu alan salt okunur önizleme olarak kalır.`,
  };
}

function buildCompanyBudgetSection(snapshot, model, quoteFloor, costInputs = {}) {
  const currentBudgetMinor = snapshot.currentCommercialAmountMinor;
  const serviceCostMinor = quoteFloor.quoteFloorMinor ?? quoteFloor.baselineOperationalCostMinor;
  const budgetGapMinor = currentBudgetMinor != null && serviceCostMinor != null
    ? Number(currentBudgetMinor || 0) - Number(serviceCostMinor || 0)
    : null;
  return {
    title: "Bütçe ve servis maliyeti önizlemesi",
    currentBudgetMinor,
    serviceCostMinor,
    budgetGapMinor,
    completenessScore: Number(model?.dataQuality?.completenessScore || 0) || 0,
    confidenceLevel: model?.dataQuality?.confidenceLevel || "low",
    missingFields: Array.from(new Set([...(model?.missingFields || []), ...(quoteFloor?.missingFields || [])])),
    costInputs: {
      targetContributionBps: quoteFloor.targetContributionBps,
      riskReserveBps: quoteFloor.riskReserveBps,
      manualBaselineOperationalCostMinor: costInputs.manualBaselineOperationalCostMinor ?? costInputs.baselineOperationalCostMinor ?? null,
    },
    summaryText: currentBudgetMinor != null && serviceCostMinor != null
      ? `Bütçe ve servis maliyeti önizlemesi hazırlandı; bu alan salt okunur önizleme olarak kalır.`
      : `Bütçe ve servis maliyeti önizlemesi için daha fazla veri gerekli; bu alan salt okunur önizleme olarak kalır.`,
  };
}

function presentPlanningBucket(bucket = null) {
  if (!bucket || typeof bucket !== "object") return null;
  return {
    entryCount: Number.isSafeInteger(Number(bucket.entryCount)) ? Number(bucket.entryCount) : 0,
    grossAmountMinor: bucket.grossAmountMinor ?? null,
    netAmountMinor: bucket.netAmountMinor ?? null,
    currencyCode: bucket.currencyCode || "TRY",
    netRollupBlocked: bucket.netRollupBlocked === true,
    blockers: Array.isArray(bucket.blockers) ? bucket.blockers.slice(0, 12) : [],
    status: bucket.entryCount > 0
      ? (bucket.blockers?.length ? "INSUFFICIENT_DATA" : "READY")
      : "MISSING",
  };
}

function presentRoomPlanningEvidence(evidence = null) {
  if (!evidence || typeof evidence !== "object") return null;
  const forecastAllocation = evidence.forecastAllocation && typeof evidence.forecastAllocation === "object"
    ? {
      status: evidence.forecastAllocation.status || "INCOMPLETE",
      sourceScopeAmountMinor: evidence.forecastAllocation.sourceScopeAmountMinor ?? null,
      allocatedAmountMinor: evidence.forecastAllocation.allocatedAmountMinor ?? null,
      grossAmountMinor: evidence.forecastAllocation.grossAmountMinor ?? null,
      pendingAmountMinor: evidence.forecastAllocation.pendingAmountMinor ?? null,
      unallocatedAmountMinor: evidence.forecastAllocation.unallocatedAmountMinor ?? null,
      includedLineCount: evidence.forecastAllocation.includedLineCount ?? 0,
      blockers: Array.isArray(evidence.forecastAllocation.blockers) ? evidence.forecastAllocation.blockers.slice(0, 12) : [],
      missing: Array.isArray(evidence.forecastAllocation.missing) ? evidence.forecastAllocation.missing.slice(0, 12) : [],
      planningOnly: true,
      readOnly: true,
      previewOnly: true,
      writeAction: false,
    }
    : null;
  return {
    actual: presentPlanningBucket(evidence.actual),
    budget: presentPlanningBucket(evidence.budget),
    forecast: presentPlanningBucket(evidence.forecast),
    accrual: presentPlanningBucket(evidence.accrual),
    missing: Array.isArray(evidence.missing) ? evidence.missing.slice(0, 20) : [],
    excludedCount: Array.isArray(evidence.excluded) ? evidence.excluded.length : 0,
    blockerCount: Array.isArray(evidence.blockers) ? evidence.blockers.length : 0,
    blockers: Array.isArray(evidence.blockers) ? evidence.blockers.slice(0, 20) : [],
    forecastAllocation,
    netRollupEligible: evidence.netRollupEligible === true,
    readOnly: true,
    previewOnly: true,
    writeAction: false,
  };
}

function buildBasePreview({
  scope,
  role,
  companyKind,
  room,
  company,
  shift,
  agreement,
  roomSummary,
  companySummary,
  costInputs = {},
  quoteFloorInputs = {},
}) {
  const scopeKey = normalizeScope(scope);
  const roleKey = normalizeToken(role) || "DEFAULT";
  const companyKindKey = normalizeToken(companyKind);
  const surfaceId = scopeKey === "COMPANY" ? "company_budget" : "room_profitability";
  const surface = describeFinancialSurface(surfaceId, roleKey);
  const access = getFinancialOperationsAccessForRole(roleKey);

  if (roleKey === "COMPANY" && isBlockedCompanyKind(companyKindKey)) {
    return {
      allowed: false,
      deniedByCompanyKind: true,
      role: roleKey,
      companyKind: companyKindKey || null,
      scope: scopeKey,
      surfaceId,
      surface,
    access,
    readOnly: true,
    previewOnly: true,
    writeAction: false,
    title: surface.title,
    summaryText: "Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan salt okunur önizleme olarak kalır.",
    nextAction: "Yetkili COMPANY kimliği ile tekrar aç.",
    tenantIsolationText: access.tenantIsolationText,
  };
  }

  const snapshot = buildSnapshot({
    scope: scopeKey,
    room,
    company,
    shift,
    agreement,
    roomSummary,
    companySummary,
    explicitRegionName: costInputs?.regionName || quoteFloorInputs?.regionName || null,
  });
  const automaticFuel = resolveAutomaticFuelInputs({
    snapshot,
    costInputs,
    fuelReference: costInputs?.canonicalFuelReference || null,
  });
  const effectiveCostInputs = {
    ...costInputs,
    ...automaticFuel.modelInputs,
    ...(automaticFuel.fuelResolution ? { fuelResolution: automaticFuel.fuelResolution } : {}),
  };
  const modelInput = buildCostModelInput(snapshot, effectiveCostInputs);
  const model = buildOperationalCostModel(modelInput);
  const fuelCalculation = automaticFuel.fuelResolution
    ? (() => {
      const actualComponent = model.components?.find((component) => component.componentKey === "fuel") || null;
      const formulaComponent = model.formulaComponents?.find((component) => component.componentKey === "fuel") || null;
      const actualLedgerUsed = automaticFuel.fuelResolution.actualLedgerUsed === true;
      return {
        ...automaticFuel.fuelResolution,
        actualAmountMinor: actualLedgerUsed && actualComponent?.includedInBaseline ? actualComponent.amountMinor : null,
        estimatedAmountMinor: formulaComponent?.includedInBaseline
          ? formulaComponent.amountMinor
          : automaticFuel.fuelResolution.estimatedAmountMinor,
        countedAmountMinor: actualLedgerUsed && actualComponent?.includedInBaseline
          ? actualComponent.amountMinor
          : formulaComponent?.includedInBaseline
            ? formulaComponent.amountMinor
            : null,
      };
    })()
    : null;

  const manualBaseline = pickMinor(
    quoteFloorInputs.manualBaselineOperationalCostMinor,
    quoteFloorInputs.baselineOperationalCostMinor,
  );
  const baselineOperationalCostMinor = manualBaseline != null
    ? manualBaseline
    : pickMinor(model.adjustedPreviewCostMinor, model.baselineOperationalCostMinor);
  const targetContributionBps = toBps(quoteFloorInputs.targetContributionBps);
  const riskReserveBps = toBps(quoteFloorInputs.riskReserveBps);
  const quoteFloor = buildQuoteFloorPreview({
    baselineOperationalCostMinor,
    currentCommercialAmountMinor: snapshot.currentCommercialAmountMinor,
    passengerCount: snapshot.passengerCount,
    targetContributionBps,
    riskReserveBps,
    baselineSource: manualBaseline != null
      ? "MANUAL_BASELINE_OVERRIDE"
      : Array.isArray(modelInput.roomCostLedgerInputs) && modelInput.roomCostLedgerInputs.length > 0
        ? "ROOM_COST_LEDGER_ACTUAL"
        : (model?.status || "PARTIAL"),
  });

  const roomProfitability = scopeKey === "ROOM"
    ? buildRoomProfitabilitySection(snapshot, model, quoteFloor, { ...quoteFloorInputs, fuelResolution: fuelCalculation })
    : null;
  const companyBudget = scopeKey === "COMPANY"
    ? buildCompanyBudgetSection(snapshot, model, quoteFloor, quoteFloorInputs)
    : null;

  const summaryText = scopeKey === "ROOM"
    ? roomProfitability?.summaryText || "Oda kârlılığı önizlemesi hazırlandı."
    : companyBudget?.summaryText || "Bütçe ve servis maliyeti önizlemesi hazırlandı.";
  const nextAction = scopeKey === "ROOM"
    ? "Teklif tabanı parametrelerini açıkça ver ve maliyet tabanını doğrula."
    : "Bütçe ve servis maliyeti önizlemesini açık parametrelerle tamamla.";

  return {
    allowed: true,
    deniedByCompanyKind: false,
    role: roleKey,
    companyKind: companyKindKey || null,
    scope: scopeKey,
    surfaceId,
    surface,
    access,
    title: surface.title,
    summaryText,
    nextAction,
    previewOnly: true,
    readOnly: true,
    writeAction: false,
    tenantIsolationText: access.tenantIsolationText,
    snapshot,
    operationalCostModel: model,
    baselineOperationalCostMinor,
    roomProfitability,
    companyBudget,
    quoteFloor,
    modelInput,
    fuelCalculation,
    roomCostPlanningEvidence: scopeKey === "ROOM"
      ? presentRoomPlanningEvidence(effectiveCostInputs?.roomCostPlanningEvidence)
      : null,
    roomCostForecastAllocation: scopeKey === "ROOM"
      ? presentRoomPlanningEvidence({ forecastAllocation: effectiveCostInputs?.roomCostForecastAllocation })?.forecastAllocation || null
      : null,
    roomCostForecastInputs: scopeKey === "ROOM" && Array.isArray(effectiveCostInputs?.roomCostForecastInputs)
      ? effectiveCostInputs.roomCostForecastInputs
      : [],
    roomPlanningProfileEvidence: scopeKey === "ROOM"
      ? effectiveCostInputs?.roomPlanningProfileEvidence || null
      : null,
  };
}

export function buildRoomProfitabilityAndQuoteFloorPreview(args = {}) {
  return buildBasePreview({ ...args, scope: "ROOM" });
}

export function buildCompanyBudgetAndServiceCostPreview(args = {}) {
  return buildBasePreview({ ...args, scope: "COMPANY" });
}

export function buildFinancialOperationsScopePreview(args = {}) {
  const scopeKey = normalizeScope(args?.scope);
  return scopeKey === "COMPANY"
    ? buildCompanyBudgetAndServiceCostPreview(args)
    : buildRoomProfitabilityAndQuoteFloorPreview(args);
}

export function isFinancialOperationsCompanyKindDenied(companyKind) {
  return isBlockedCompanyKind(companyKind);
}

export function buildFinancialOperationsCompanyKindDeniedPreview({ role = "COMPANY", companyKind = "", scope = "COMPANY" } = {}) {
  const roleKey = normalizeToken(role) || "COMPANY";
  const scopeKey = normalizeScope(scope);
  const surfaceId = scopeKey === "COMPANY" ? "company_budget" : "room_profitability";
  const surface = describeFinancialSurface(surfaceId, roleKey);
  return {
    allowed: false,
    deniedByCompanyKind: true,
    role: roleKey,
    companyKind: normalizeToken(companyKind) || null,
    scope: scopeKey,
    surfaceId,
    surface,
    access: getFinancialOperationsAccessForRole(roleKey),
    readOnly: true,
    previewOnly: true,
    writeAction: false,
    title: surface.title,
    summaryText: "Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan salt okunur önizleme olarak kalır.",
    nextAction: "Yetkili COMPANY kimliği ile tekrar aç.",
    tenantIsolationText: "Tenant isolation korunur; alt kimlikler daraltılır.",
  };
}
