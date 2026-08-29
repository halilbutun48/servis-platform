import { buildOperationalCostModel } from "./operationalCostModel.js";
import {
  describeFinancialSurface,
  getFinancialOperationsAccessForRole,
} from "./financialOperationsScope.js";
import { resolveOperationRegion } from "../region/operationRegion.js";

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
    shiftStatus: status,
    routeDistanceM,
    routeDistanceKm,
    routeDurationSec,
    routeDurationMin,
    passengerCount,
    vehicleCapacity,
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
  return {
    sourceType: snapshot.scope === "ROOM" ? "room_financial_operations_preview" : "company_financial_operations_preview",
    sourceRef: snapshot.shiftId ? `shift-${snapshot.shiftId}` : snapshot.agreementId ? `agreement-${snapshot.agreementId}` : snapshot.sourceLabel,
    routeRef: snapshot.shiftId ? `shift-${snapshot.shiftId}` : null,
    shiftRef: snapshot.shiftId ? `shift-${snapshot.shiftId}` : null,
    vehicleRef: snapshot.shiftId ? `vehicle-${snapshot.shiftId}` : null,
    driverRef: snapshot.shiftId ? `driver-${snapshot.shiftId}` : null,
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
    maintenancePerKmMinor: toMinor(costInputs.maintenancePerKmMinor),
    tirePerKmMinor: toMinor(costInputs.tirePerKmMinor),
    depreciationPerKmMinor: toMinor(costInputs.depreciationPerKmMinor),
    cleaningPerShiftMinor: toMinor(costInputs.cleaningPerShiftMinor),
    vehicleWearPerKmMinor: toMinor(costInputs.vehicleWearPerKmMinor),
    driverBasePerShiftMinor: toMinor(costInputs.driverBasePerShiftMinor),
    driverHourlyCostMinor: toMinor(costInputs.driverHourlyCostMinor),
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

  const computed = missingFields.length === 0;
  const reserveBps = computed ? Number(targetContributionBps || 0) + Number(riskReserveBps || 0) : null;
  const quoteFloorMinor = computed
    ? Math.max(0, Math.round(Number(baselineOperationalCostMinor || 0) * (1 + (reserveBps / 10000))))
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

function buildRoomProfitabilitySection(snapshot, model, quoteFloor, costInputs = {}) {
  const currentOfferMinor = snapshot.currentCommercialAmountMinor;
  const baselineMinor = quoteFloor.baselineOperationalCostMinor;
  const profitMinor = currentOfferMinor != null && baselineMinor != null
    ? Number(currentOfferMinor || 0) - Number(baselineMinor || 0)
    : null;
  const marginBps = currentOfferMinor != null && baselineMinor != null && Number(currentOfferMinor || 0) > 0
    ? Math.round((profitMinor / Number(currentOfferMinor || 1)) * 10000)
    : null;
  return {
    title: "Teklif ve kârlılık önizlemesi",
    currentOfferMinor,
    baselineOperationalCostMinor: baselineMinor,
    profitMinor,
    marginBps,
    completenessScore: Number(model?.dataQuality?.completenessScore || 0) || 0,
    confidenceLevel: model?.dataQuality?.confidenceLevel || "low",
    missingFields: Array.from(new Set([...(model?.missingFields || []), ...(quoteFloor?.missingFields || [])])),
    costInputs: {
      targetContributionBps: quoteFloor.targetContributionBps,
      riskReserveBps: quoteFloor.riskReserveBps,
      manualBaselineOperationalCostMinor: costInputs.manualBaselineOperationalCostMinor ?? costInputs.baselineOperationalCostMinor ?? null,
    },
    summaryText: currentOfferMinor != null && baselineMinor != null
      ? `Oda kârlılığı önizlemesi hazırlandı; bu alan salt okunur önizleme olarak kalır.`
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
  const modelInput = buildCostModelInput(snapshot, costInputs);
  const model = buildOperationalCostModel(modelInput);

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
    baselineSource: manualBaseline != null ? "MANUAL_BASELINE_OVERRIDE" : (model?.status || "PARTIAL"),
  });

  const roomProfitability = scopeKey === "ROOM"
    ? buildRoomProfitabilitySection(snapshot, model, quoteFloor, quoteFloorInputs)
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
