import crypto from "node:crypto";

export const OPERATIONAL_COST_MODEL_VERSION = "OPERATIONAL-COST-MODEL-01";

export const OPERATIONAL_COST_COMPONENT_REGISTRY = Object.freeze([
  Object.freeze({
    componentKey: "fuel",
    labelTr: "Yakıt",
    sourceFields: Object.freeze([
      "totalDistanceKm",
      "serviceDistanceKm",
      "emptyDistanceKm",
      "fuelConsumptionLitersPer100Km",
      "fuelUnitPriceMinor",
      "idleFuelLiters",
      "fuelType",
      "zeroFuelVehicle",
    ]),
  }),
  Object.freeze({
    componentKey: "vehicle_fixed_allocated",
    labelTr: "Araç sabit maliyet tahsisi",
    sourceFields: Object.freeze([
      "vehicleLeaseMonthlyMinor",
      "vehicleDepreciationMonthlyMinor",
      "insuranceMonthlyMinor",
      "taxAndLicenseMonthlyMinor",
      "fixedVehicleCostMonthlyMinor",
      "allocationServiceDaysPerMonth",
      "allocationShiftsPerMonth",
      "allocationMonthFraction",
      "explicitVehicleFixedCostAllocatedMinor",
      "vehicleFixedCostAllocationMode",
    ]),
  }),
  Object.freeze({
    componentKey: "vehicle_variable",
    labelTr: "Araç değişken maliyet",
    sourceFields: Object.freeze([
      "maintenancePerKmMinor",
      "tirePerKmMinor",
      "depreciationPerKmMinor",
      "cleaningPerShiftMinor",
      "vehicleWearPerKmMinor",
      "otherVehicleVariableCostMinor",
    ]),
  }),
  Object.freeze({
    componentKey: "driver_labor",
    labelTr: "Sürücü işçilik maliyeti",
    sourceFields: Object.freeze([
      "driverBasePerShiftMinor",
      "driverHourlyCostMinor",
      "mealAllowancePerShiftMinor",
      "socialCostAllocationMinor",
      "otherDriverCostMinor",
      "driverCompensationMode",
    ]),
  }),
  Object.freeze({
    componentKey: "waiting_and_overtime",
    labelTr: "Bekleme / fazla süre maliyeti",
    sourceFields: Object.freeze([
      "waitingMinutes",
      "overtimeMinutes",
      "driverWaitingHourlyCostMinor",
      "driverOvertimeHourlyCostMinor",
    ]),
  }),
  Object.freeze({
    componentKey: "route_fees",
    labelTr: "Rota ücretleri",
    sourceFields: Object.freeze([
      "tollMinor",
      "bridgeMinor",
      "highwayMinor",
      "parkingMinor",
      "terminalMinor",
      "routeFeeMinor",
      "otherDirectRouteFeeMinor",
    ]),
  }),
  Object.freeze({
    componentKey: "operations_overhead",
    labelTr: "Operasyonel genel gider",
    sourceFields: Object.freeze([
      "operationsOverheadFixedMinor",
      "operationsOverheadPerShiftMinor",
      "operationsOverheadRateBps",
      "operationsOverheadRateBaseMinor",
      "dispatchControlCostMinor",
      "trackingTechnologyCostMinor",
      "otherOverheadMinor",
    ]),
  }),
  Object.freeze({
    componentKey: "other_direct_cost",
    labelTr: "Diğer doğrudan maliyet",
    sourceFields: Object.freeze(["otherDirectCostMinor"]),
  }),
  Object.freeze({
    componentKey: "external_preview_adjustments",
    labelTr: "Harici önizleme düzeltmeleri",
    sourceFields: Object.freeze([
      "qualityAdjustmentPreviewMinor",
      "hakedisAdjustmentPreviewMinor",
      "contractualAdjustmentPreviewMinor",
      "includeExternalPreviewAdjustments",
    ]),
  }),
]);

export const OPERATIONAL_COST_UNIT_COST_KEYS = Object.freeze([
  "costPerServiceKmMinor",
  "costPerTotalKmMinor",
  "costPerShiftMinor",
  "costPerTripMinor",
  "costPerServiceDayMinor",
  "costPerPassengerMinor",
  "costPerPassengerKmMinor",
  "costPerVehicleMinor",
  "costPerMinuteMinor",
]);

const RECOGNIZED_CURRENCY_CODES = new Set([
  "TRY",
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "SAR",
  "AED",
  "QAR",
  "KWD",
  "BHD",
  "JPY",
]);

function compactText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || String(fallback || "").trim();
}

function normalizeCurrencyCode(value) {
  const code = compactText(value, "").toUpperCase();
  return code.length ? code : "";
}

function normalizeMode(value, allowed = []) {
  const mode = compactText(value, "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return allowed.includes(mode) ? mode : "";
}

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return Number.isFinite(Number(value));
}

function isSafeMinor(value) {
  return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

function roundMinor(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
}

function addUnique(list, value) {
  const text = compactText(value, "");
  if (!text) return;
  if (!list.includes(text)) list.push(text);
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseNonNegativeNumber(value, fieldName, issues) {
  if (!hasValue(value)) return null;
  const n = safeNumber(value);
  if (n === null) {
    addUnique(issues.invalidFields, fieldName);
    addUnique(issues.blockers, `${fieldName} geçersiz sayısal değer`);
    return null;
  }
  if (n < 0) {
    addUnique(issues.invalidFields, fieldName);
    addUnique(issues.blockers, `${fieldName} negatif olamaz`);
    return null;
  }
  if (!Number.isSafeInteger(Math.round(n))) {
    addUnique(issues.blockers, `${fieldName} safe integer sınırını aşıyor`);
    return null;
  }
  return n;
}

function parseMinor(value, fieldName, issues, { allowNegative = false } = {}) {
  if (!hasValue(value)) return null;
  const n = safeNumber(value);
  if (n === null) {
    addUnique(issues.invalidFields, fieldName);
    addUnique(issues.blockers, `${fieldName} geçersiz minor-unit değer`);
    return null;
  }
  if (!allowNegative && n < 0) {
    addUnique(issues.invalidFields, fieldName);
    addUnique(issues.blockers, `${fieldName} negatif olamaz`);
    return null;
  }
  const rounded = roundMinor(n);
  if (rounded === null || !isSafeMinor(rounded)) {
    addUnique(issues.blockers, `${fieldName} safe integer sınırını aşıyor`);
    return null;
  }
  if (rounded !== n) {
    addUnique(issues.warnings, `${fieldName} minor-unit'e yuvarlandı`);
  }
  return rounded;
}

function parseWholeNumber(value, fieldName, issues) {
  if (!hasValue(value)) return null;
  const n = safeNumber(value);
  if (n === null) {
    addUnique(issues.invalidFields, fieldName);
    addUnique(issues.blockers, `${fieldName} geçersiz sayı`);
    return null;
  }
  if (n < 0) {
    addUnique(issues.invalidFields, fieldName);
    addUnique(issues.blockers, `${fieldName} negatif olamaz`);
    return null;
  }
  const rounded = Math.round(n);
  if (!Number.isSafeInteger(rounded)) {
    addUnique(issues.blockers, `${fieldName} safe integer sınırını aşıyor`);
    return null;
  }
  if (rounded !== n) {
    addUnique(issues.warnings, `${fieldName} tam sayıya yuvarlandı`);
  }
  return rounded;
}

function parseRatio(value, fieldName, issues) {
  if (!hasValue(value)) return null;
  const n = safeNumber(value);
  if (n === null || n <= 0) {
    addUnique(issues.invalidFields, fieldName);
    addUnique(issues.blockers, `${fieldName} pozitif oran olmalıdır`);
    return null;
  }
  return n;
}

function isZeroFuelMetadata(input = {}) {
  const fuelType = compactText(input.fuelType, "").toLowerCase();
  return Boolean(input.zeroFuelVehicle) || fuelType.includes("electric") || fuelType.includes("ev") || fuelType.includes("hydrogen");
}

function safeHashId(input) {
  const json = JSON.stringify(input);
  return `ocm_${crypto.createHash("sha256").update(json).digest("hex").slice(0, 20)}`;
}

function buildIssues() {
  return {
    missingFields: [],
    invalidFields: [],
    warnings: [],
    blockers: [],
    currencyWarnings: [],
    doubleCountWarnings: [],
    evidence: [],
    formulaTrace: [],
  };
}

function baseNormalizedInput(input = {}, issues = null) {
  const sink = issues || buildIssues();
  const out = {
    calculationId: compactText(input.calculationId, ""),
    sourceType: compactText(input.sourceType, ""),
    sourceRef: compactText(input.sourceRef, ""),
    role: compactText(input.role, ""),
    currencyCode: normalizeCurrencyCode(input.currencyCode),
    periodType: compactText(input.periodType, ""),
    periodStart: compactText(input.periodStart, ""),
    periodEnd: compactText(input.periodEnd, ""),
    routeRef: compactText(input.routeRef, ""),
    shiftRef: compactText(input.shiftRef, ""),
    vehicleRef: compactText(input.vehicleRef, ""),
    driverRef: compactText(input.driverRef, ""),
    serviceDistanceKm: parseNonNegativeNumber(input.serviceDistanceKm, "serviceDistanceKm", sink),
    emptyDistanceKm: parseNonNegativeNumber(input.emptyDistanceKm, "emptyDistanceKm", sink),
    totalDistanceKm: parseNonNegativeNumber(input.totalDistanceKm, "totalDistanceKm", sink),
    routeDurationMinutes: parseNonNegativeNumber(input.routeDurationMinutes, "routeDurationMinutes", sink),
    waitingMinutes: parseNonNegativeNumber(input.waitingMinutes, "waitingMinutes", sink),
    overtimeMinutes: parseNonNegativeNumber(input.overtimeMinutes, "overtimeMinutes", sink),
    shiftCount: parseWholeNumber(input.shiftCount, "shiftCount", sink),
    serviceDayCount: parseWholeNumber(input.serviceDayCount, "serviceDayCount", sink),
    passengerCount: parseWholeNumber(input.passengerCount, "passengerCount", sink),
    vehicleCapacity: parseWholeNumber(input.vehicleCapacity, "vehicleCapacity", sink),
    tripCount: parseWholeNumber(input.tripCount, "tripCount", sink),
    fuelConsumptionLitersPer100Km: parseNonNegativeNumber(input.fuelConsumptionLitersPer100Km, "fuelConsumptionLitersPer100Km", sink),
    fuelUnitPriceMinor: parseMinor(input.fuelUnitPriceMinor, "fuelUnitPriceMinor", sink),
    fuelDistanceBasis: compactText(input.fuelDistanceBasis, ""),
    idleFuelLiters: parseNonNegativeNumber(input.idleFuelLiters, "idleFuelLiters", sink),
    fuelCurrencyCode: normalizeCurrencyCode(input.fuelCurrencyCode),
    vehicleLeaseMonthlyMinor: parseMinor(input.vehicleLeaseMonthlyMinor, "vehicleLeaseMonthlyMinor", sink),
    vehicleDepreciationMonthlyMinor: parseMinor(input.vehicleDepreciationMonthlyMinor, "vehicleDepreciationMonthlyMinor", sink),
    insuranceMonthlyMinor: parseMinor(input.insuranceMonthlyMinor, "insuranceMonthlyMinor", sink),
    taxAndLicenseMonthlyMinor: parseMinor(input.taxAndLicenseMonthlyMinor, "taxAndLicenseMonthlyMinor", sink),
    fixedVehicleCostMonthlyMinor: parseMinor(input.fixedVehicleCostMonthlyMinor, "fixedVehicleCostMonthlyMinor", sink),
    allocationServiceDaysPerMonth: parseWholeNumber(input.allocationServiceDaysPerMonth, "allocationServiceDaysPerMonth", sink),
    allocationShiftsPerMonth: parseWholeNumber(input.allocationShiftsPerMonth, "allocationShiftsPerMonth", sink),
    allocationMonthFraction: parseRatio(input.allocationMonthFraction, "allocationMonthFraction", sink),
    explicitVehicleFixedCostAllocatedMinor: parseMinor(input.explicitVehicleFixedCostAllocatedMinor, "explicitVehicleFixedCostAllocatedMinor", sink),
    vehicleFixedCostAllocationMode: normalizeMode(input.vehicleFixedCostAllocationMode, ["per_service_day", "per_shift", "per_month_fraction", "explicit_allocation"]),
    maintenancePerKmMinor: parseMinor(input.maintenancePerKmMinor, "maintenancePerKmMinor", sink),
    tirePerKmMinor: parseMinor(input.tirePerKmMinor, "tirePerKmMinor", sink),
    depreciationPerKmMinor: parseMinor(input.depreciationPerKmMinor, "depreciationPerKmMinor", sink),
    cleaningPerShiftMinor: parseMinor(input.cleaningPerShiftMinor, "cleaningPerShiftMinor", sink),
    vehicleWearPerKmMinor: parseMinor(input.vehicleWearPerKmMinor, "vehicleWearPerKmMinor", sink),
    otherVehicleVariableCostMinor: parseMinor(input.otherVehicleVariableCostMinor, "otherVehicleVariableCostMinor", sink),
    driverBasePerShiftMinor: parseMinor(input.driverBasePerShiftMinor, "driverBasePerShiftMinor", sink),
    driverHourlyCostMinor: parseMinor(input.driverHourlyCostMinor, "driverHourlyCostMinor", sink),
    driverOvertimeHourlyCostMinor: parseMinor(input.driverOvertimeHourlyCostMinor, "driverOvertimeHourlyCostMinor", sink),
    driverWaitingHourlyCostMinor: parseMinor(input.driverWaitingHourlyCostMinor, "driverWaitingHourlyCostMinor", sink),
    socialCostAllocationMinor: parseMinor(input.socialCostAllocationMinor, "socialCostAllocationMinor", sink),
    mealAllowancePerShiftMinor: parseMinor(input.mealAllowancePerShiftMinor, "mealAllowancePerShiftMinor", sink),
    otherDriverCostMinor: parseMinor(input.otherDriverCostMinor, "otherDriverCostMinor", sink),
    driverCompensationMode: normalizeMode(input.driverCompensationMode, ["per_shift", "hourly"]),
    tollMinor: parseMinor(input.tollMinor, "tollMinor", sink),
    bridgeMinor: parseMinor(input.bridgeMinor, "bridgeMinor", sink),
    highwayMinor: parseMinor(input.highwayMinor, "highwayMinor", sink),
    parkingMinor: parseMinor(input.parkingMinor, "parkingMinor", sink),
    terminalMinor: parseMinor(input.terminalMinor, "terminalMinor", sink),
    routeFeeMinor: parseMinor(input.routeFeeMinor, "routeFeeMinor", sink),
    otherDirectRouteFeeMinor: parseMinor(input.otherDirectRouteFeeMinor, "otherDirectRouteFeeMinor", sink),
    otherDirectCostMinor: parseMinor(input.otherDirectCostMinor, "otherDirectCostMinor", sink),
    operationsOverheadFixedMinor: parseMinor(input.operationsOverheadFixedMinor, "operationsOverheadFixedMinor", sink),
    operationsOverheadPerShiftMinor: parseMinor(input.operationsOverheadPerShiftMinor, "operationsOverheadPerShiftMinor", sink),
    operationsOverheadRateBps: parseWholeNumber(input.operationsOverheadRateBps, "operationsOverheadRateBps", sink),
    operationsOverheadRateBaseMinor: parseMinor(input.operationsOverheadRateBaseMinor, "operationsOverheadRateBaseMinor", sink),
    dispatchControlCostMinor: parseMinor(input.dispatchControlCostMinor, "dispatchControlCostMinor", sink),
    trackingTechnologyCostMinor: parseMinor(input.trackingTechnologyCostMinor, "trackingTechnologyCostMinor", sink),
    otherOverheadMinor: parseMinor(input.otherOverheadMinor, "otherOverheadMinor", sink),
    qualityAdjustmentPreviewMinor: parseMinor(input.qualityAdjustmentPreviewMinor, "qualityAdjustmentPreviewMinor", sink, { allowNegative: true }),
    hakedisAdjustmentPreviewMinor: parseMinor(input.hakedisAdjustmentPreviewMinor, "hakedisAdjustmentPreviewMinor", sink, { allowNegative: true }),
    contractualAdjustmentPreviewMinor: parseMinor(input.contractualAdjustmentPreviewMinor, "contractualAdjustmentPreviewMinor", sink, { allowNegative: true }),
    includeExternalPreviewAdjustments: Boolean(input.includeExternalPreviewAdjustments),
    zeroFuelVehicle: Boolean(input.zeroFuelVehicle),
    fuelType: compactText(input.fuelType, ""),
  };

  const currencyCandidates = [out.currencyCode, out.fuelCurrencyCode].filter(Boolean);
  const uniqueCurrencies = [...new Set(currencyCandidates)];
  if (uniqueCurrencies.length === 1) {
    out.currencyCode = uniqueCurrencies[0];
  } else if (uniqueCurrencies.length > 1) {
    out.currencyCode = uniqueCurrencies[0];
  } else {
    out.currencyCode = "TRY";
  }
  out._currencyCandidates = Object.freeze(uniqueCurrencies);

  const distanceTriplet = normalizeDistanceTriplet(out);
  out.serviceDistanceKm = distanceTriplet.serviceDistanceKm;
  out.emptyDistanceKm = distanceTriplet.emptyDistanceKm;
  out.totalDistanceKm = distanceTriplet.totalDistanceKm;
  out._distanceTripletDerived = distanceTriplet.derived;
  return out;
}

function normalizeDistanceTriplet(input) {
  let service = input.serviceDistanceKm;
  let empty = input.emptyDistanceKm;
  let total = input.totalDistanceKm;
  let derived = false;
  if (total === null && service !== null && empty !== null) {
    total = roundMinor(service + empty);
    derived = true;
  }
  if (total !== null && service === null && empty !== null) {
    service = roundMinor(total - empty);
    derived = true;
  }
  if (total !== null && empty === null && service !== null) {
    empty = roundMinor(total - service);
    derived = true;
  }
  return { serviceDistanceKm: service, emptyDistanceKm: empty, totalDistanceKm: total, derived };
}

function moneySum(...values) {
  return values.reduce((sum, value) => sum + (Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0), 0);
}

function componentStatus({ relevant, included, warnings, blockers, missing }) {
  if (!relevant) return "excluded";
  if (blockers.length > 0) return "blocked";
  if (!included) return missing.length > 0 ? "incomplete" : "excluded";
  if (warnings.length > 0) return "partial";
  return "complete";
}

function finalizeComponent({
  componentKey,
  labelTr,
  currencyCode,
  sourceFields,
  amountMinor,
  relevant,
  includedInBaseline,
  formula,
  calculationEvidence,
  warnings,
  blockers,
  missingFields,
  invalidFields,
  doubleCountGuard,
}) {
  const status = componentStatus({ relevant, included: includedInBaseline, warnings, blockers, missing: missingFields });
  const confidence = status === "complete" ? "high" : status === "partial" ? "medium" : status === "excluded" ? "low" : "low";
  const normalizedAmount = componentKey === "external_preview_adjustments"
    ? roundMinor(amountMinor ?? 0) ?? 0
    : Math.max(0, roundMinor(amountMinor ?? 0) ?? 0);
  return Object.freeze({
    componentKey,
    labelTr,
    amountMinor: normalizedAmount,
    currencyCode,
    includedInBaseline: Boolean(includedInBaseline),
    sourceFields: Object.freeze([...new Set(sourceFields.filter(Boolean))]),
    formula: compactText(formula, ""),
    calculationEvidence: Object.freeze([...new Set(calculationEvidence.filter(Boolean))]),
    warnings: Object.freeze([...new Set(warnings.filter(Boolean))]),
    blockers: Object.freeze([...new Set(blockers.filter(Boolean))]),
    missingFields: Object.freeze([...new Set(missingFields.filter(Boolean))]),
    invalidFields: Object.freeze([...new Set(invalidFields.filter(Boolean))]),
    doubleCountGuard: compactText(doubleCountGuard, "none"),
    confidence,
    dataQuality: status,
    readOnly: true,
    status,
  });
}

function buildFuelComponent(normalized) {
  const relevant = [
    normalized.totalDistanceKm,
    normalized.serviceDistanceKm,
    normalized.emptyDistanceKm,
    normalized.fuelConsumptionLitersPer100Km,
    normalized.fuelUnitPriceMinor,
    normalized.idleFuelLiters,
  ].some((value) => value !== null && value !== undefined);
  if (!relevant) {
    return finalizeComponent({
      componentKey: "fuel",
      labelTr: "Yakıt",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }

  const sourceFields = [];
  const warnings = [];
  const blockers = [];
  const missingFields = [];
  const invalidFields = [];
  const evidence = [];
  let includedInBaseline = false;
  let amountMinor = 0;

  if (normalized.fuelConsumptionLitersPer100Km === null) missingFields.push("fuelConsumptionLitersPer100Km");
  if (normalized.fuelUnitPriceMinor === null) missingFields.push("fuelUnitPriceMinor");
  if (normalized.totalDistanceKm === null) missingFields.push("totalDistanceKm");
  if (normalized.fuelConsumptionLitersPer100Km !== null) sourceFields.push("fuelConsumptionLitersPer100Km");
  if (normalized.fuelUnitPriceMinor !== null) sourceFields.push("fuelUnitPriceMinor");
  if (normalized.totalDistanceKm !== null) sourceFields.push("totalDistanceKm");
  if (normalized.serviceDistanceKm !== null) sourceFields.push("serviceDistanceKm");
  if (normalized.emptyDistanceKm !== null) sourceFields.push("emptyDistanceKm");
  if (normalized.idleFuelLiters !== null) sourceFields.push("idleFuelLiters");
  if (normalized.fuelType) sourceFields.push("fuelType");
  if (normalized.zeroFuelVehicle) sourceFields.push("zeroFuelVehicle");

  if (normalized.fuelConsumptionLitersPer100Km === 0 && !isZeroFuelMetadata(normalized)) {
    warnings.push("fuelConsumptionLitersPer100Km=0 fakat zero-fuel metadata yok");
  }
  if (normalized.idleFuelLiters !== null && normalized.idleFuelLiters > 0) {
    evidence.push(`idleFuelLiters açıkça eklendi: ${normalized.idleFuelLiters}`);
  }
  if (normalized.totalDistanceKm !== null && normalized.serviceDistanceKm !== null && normalized.emptyDistanceKm !== null) {
    const sumTrip = normalized.serviceDistanceKm + normalized.emptyDistanceKm;
    if (Math.abs(sumTrip - normalized.totalDistanceKm) > 0.001) {
      warnings.push("serviceDistanceKm + emptyDistanceKm ile totalDistanceKm çelişiyor");
    }
  }

  if (missingFields.length === 0) {
    const liters = (normalized.totalDistanceKm * normalized.fuelConsumptionLitersPer100Km) / 100 + (normalized.idleFuelLiters || 0);
    amountMinor = roundMinor(liters * normalized.fuelUnitPriceMinor);
    includedInBaseline = true;
    evidence.push(`yakıt formülü: (${normalized.totalDistanceKm} km × ${normalized.fuelConsumptionLitersPer100Km} L/100km / 100) × ${normalized.fuelUnitPriceMinor} minor`);
    if (normalized.emptyDistanceKm && normalized.emptyDistanceKm > 0) {
      evidence.push("emptyDistanceKm toplam rotaya dahil edildi");
    }
  }

  return finalizeComponent({
    componentKey: "fuel",
    labelTr: "Yakıt",
    currencyCode: normalized.currencyCode,
    sourceFields,
    amountMinor,
    relevant: true,
    includedInBaseline,
    formula: "totalDistanceKm × fuelConsumptionLitersPer100Km / 100 × fuelUnitPriceMinor (+ idleFuelLiters × fuelUnitPriceMinor)",
    calculationEvidence: evidence,
    warnings,
    blockers,
    missingFields,
    invalidFields,
    doubleCountGuard: "fuel costs are isolated from other per-km buckets",
  });
}

function resolveAllocationMode(normalized) {
  const explicit = normalized.vehicleFixedCostAllocationMode;
  if (explicit) return explicit;
  if (normalized.explicitVehicleFixedCostAllocatedMinor !== null) return "explicit_allocation";
  if (normalized.allocationMonthFraction !== null) return "per_month_fraction";
  const shiftSignals = normalized.allocationShiftsPerMonth !== null || normalized.shiftCount !== null;
  const daySignals = normalized.allocationServiceDaysPerMonth !== null || normalized.serviceDayCount !== null;
  if (shiftSignals && !daySignals) return "per_shift";
  if (daySignals && !shiftSignals) return "per_service_day";
  return "";
}

function buildVehicleFixedComponent(normalized) {
  const relevant = [
    normalized.vehicleLeaseMonthlyMinor,
    normalized.vehicleDepreciationMonthlyMinor,
    normalized.insuranceMonthlyMinor,
    normalized.taxAndLicenseMonthlyMinor,
    normalized.fixedVehicleCostMonthlyMinor,
    normalized.explicitVehicleFixedCostAllocatedMinor,
    normalized.allocationServiceDaysPerMonth,
    normalized.allocationShiftsPerMonth,
    normalized.allocationMonthFraction,
    normalized.vehicleFixedCostAllocationMode,
  ].some((value) => value !== null && value !== undefined && value !== "");
  if (!relevant) {
    return finalizeComponent({
      componentKey: "vehicle_fixed_allocated",
      labelTr: "Araç sabit maliyet tahsisi",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }

  const sourceFields = [];
  const warnings = [];
  const blockers = [];
  const missingFields = [];
  const invalidFields = [];
  const evidence = [];
  const monthlyTotal = moneySum(
    normalized.vehicleLeaseMonthlyMinor,
    normalized.vehicleDepreciationMonthlyMinor,
    normalized.insuranceMonthlyMinor,
    normalized.taxAndLicenseMonthlyMinor,
    normalized.fixedVehicleCostMonthlyMinor,
  );
  if (normalized.vehicleLeaseMonthlyMinor !== null) sourceFields.push("vehicleLeaseMonthlyMinor");
  if (normalized.vehicleDepreciationMonthlyMinor !== null) sourceFields.push("vehicleDepreciationMonthlyMinor");
  if (normalized.insuranceMonthlyMinor !== null) sourceFields.push("insuranceMonthlyMinor");
  if (normalized.taxAndLicenseMonthlyMinor !== null) sourceFields.push("taxAndLicenseMonthlyMinor");
  if (normalized.fixedVehicleCostMonthlyMinor !== null) sourceFields.push("fixedVehicleCostMonthlyMinor");
  if (normalized.explicitVehicleFixedCostAllocatedMinor !== null) sourceFields.push("explicitVehicleFixedCostAllocatedMinor");
  if (normalized.vehicleFixedCostAllocationMode) sourceFields.push("vehicleFixedCostAllocationMode");
  if (normalized.allocationServiceDaysPerMonth !== null) sourceFields.push("allocationServiceDaysPerMonth");
  if (normalized.allocationShiftsPerMonth !== null) sourceFields.push("allocationShiftsPerMonth");
  if (normalized.allocationMonthFraction !== null) sourceFields.push("allocationMonthFraction");
  if (normalized.shiftCount !== null) sourceFields.push("shiftCount");
  if (normalized.serviceDayCount !== null) sourceFields.push("serviceDayCount");

  const mode = resolveAllocationMode(normalized);
  let amountMinor = 0;
  let includedInBaseline = false;
  let doubleCountGuard = "none";

  if (!mode) {
    warnings.push("vehicleFixedCostAllocationMode eksik veya belirsiz");
    if (monthlyTotal > 0) {
      missingFields.push("vehicleFixedCostAllocationMode");
      missingFields.push("allocation basis");
    }
  } else if (mode === "explicit_allocation") {
    if (normalized.explicitVehicleFixedCostAllocatedMinor === null) {
      missingFields.push("explicitVehicleFixedCostAllocatedMinor");
    } else {
      amountMinor = normalized.explicitVehicleFixedCostAllocatedMinor;
      includedInBaseline = true;
      evidence.push("explicitVehicleFixedCostAllocatedMinor doğrudan kullanıldı");
    }
    doubleCountGuard = "explicit allocation used instead of monthly re-sum";
  } else if (mode === "per_shift") {
    if (normalized.allocationShiftsPerMonth === null) missingFields.push("allocationShiftsPerMonth");
    if (normalized.shiftCount === null) missingFields.push("shiftCount");
    if (normalized.allocationShiftsPerMonth !== null && normalized.shiftCount !== null && normalized.allocationShiftsPerMonth > 0) {
      amountMinor = roundMinor((monthlyTotal * normalized.shiftCount) / normalized.allocationShiftsPerMonth);
      includedInBaseline = true;
      evidence.push(`monthly total ${monthlyTotal} minor / ${normalized.allocationShiftsPerMonth} shifts × ${normalized.shiftCount} shift`);
    }
    doubleCountGuard = "per_shift allocation only";
  } else if (mode === "per_service_day") {
    if (normalized.allocationServiceDaysPerMonth === null) missingFields.push("allocationServiceDaysPerMonth");
    if (normalized.serviceDayCount === null) missingFields.push("serviceDayCount");
    if (normalized.allocationServiceDaysPerMonth !== null && normalized.serviceDayCount !== null && normalized.allocationServiceDaysPerMonth > 0) {
      amountMinor = roundMinor((monthlyTotal * normalized.serviceDayCount) / normalized.allocationServiceDaysPerMonth);
      includedInBaseline = true;
      evidence.push(`monthly total ${monthlyTotal} minor / ${normalized.allocationServiceDaysPerMonth} service day × ${normalized.serviceDayCount} day`);
    }
    doubleCountGuard = "per_service_day allocation only";
  } else if (mode === "per_month_fraction") {
    if (normalized.allocationMonthFraction === null) missingFields.push("allocationMonthFraction");
    if (normalized.allocationMonthFraction !== null) {
      amountMinor = roundMinor(monthlyTotal * normalized.allocationMonthFraction);
      includedInBaseline = true;
      evidence.push(`monthly total ${monthlyTotal} minor × month fraction ${normalized.allocationMonthFraction}`);
    }
    doubleCountGuard = "per_month_fraction allocation only";
  }

  if (monthlyTotal === 0 && normalized.explicitVehicleFixedCostAllocatedMinor === null) {
    missingFields.push("vehicle fixed monthly inputs");
  }
  if (monthlyTotal > 0) {
    evidence.push(`monthly fixed total = ${monthlyTotal} minor`);
  }

  return finalizeComponent({
    componentKey: "vehicle_fixed_allocated",
    labelTr: "Araç sabit maliyet tahsisi",
    currencyCode: normalized.currencyCode,
    sourceFields,
    amountMinor,
    relevant: true,
    includedInBaseline,
    formula: mode === "explicit_allocation"
      ? "explicitVehicleFixedCostAllocatedMinor"
      : mode === "per_shift"
      ? "(monthly fixed total × shiftCount) / allocationShiftsPerMonth"
      : mode === "per_service_day"
      ? "(monthly fixed total × serviceDayCount) / allocationServiceDaysPerMonth"
      : mode === "per_month_fraction"
      ? "monthly fixed total × allocationMonthFraction"
      : "monthly fixed total with explicit allocation basis",
    calculationEvidence: evidence,
    warnings,
    blockers,
    missingFields,
    invalidFields,
    doubleCountGuard,
  });
}

function buildVehicleVariableComponent(normalized, issues) {
  const relevant = [
    normalized.maintenancePerKmMinor,
    normalized.tirePerKmMinor,
    normalized.depreciationPerKmMinor,
    normalized.cleaningPerShiftMinor,
    normalized.vehicleWearPerKmMinor,
    normalized.otherVehicleVariableCostMinor,
  ].some((value) => value !== null && value !== undefined);
  if (!relevant) {
    return finalizeComponent({
      componentKey: "vehicle_variable",
      labelTr: "Araç değişken maliyet",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }

  const sourceFields = [];
  const warnings = [];
  const blockers = [];
  const missingFields = [];
  const invalidFields = [];
  const evidence = [];
  let amountMinor = 0;
  let includedInBaseline = false;
  let doubleCountGuard = "none";

  const kmBase = normalized.totalDistanceKm ?? 0;
  const _shiftBase = normalized.shiftCount ?? 0;
  const granularPerKm = [
    normalized.maintenancePerKmMinor,
    normalized.tirePerKmMinor,
    normalized.depreciationPerKmMinor,
  ].filter((value) => value !== null);
  const granularPresent = granularPerKm.length > 0;

  if (normalized.maintenancePerKmMinor !== null) sourceFields.push("maintenancePerKmMinor");
  if (normalized.tirePerKmMinor !== null) sourceFields.push("tirePerKmMinor");
  if (normalized.depreciationPerKmMinor !== null) sourceFields.push("depreciationPerKmMinor");
  if (normalized.cleaningPerShiftMinor !== null) sourceFields.push("cleaningPerShiftMinor");
  if (normalized.vehicleWearPerKmMinor !== null) sourceFields.push("vehicleWearPerKmMinor");
  if (normalized.otherVehicleVariableCostMinor !== null) sourceFields.push("otherVehicleVariableCostMinor");

  const hasPerKmInputs = normalized.maintenancePerKmMinor !== null || normalized.tirePerKmMinor !== null || normalized.depreciationPerKmMinor !== null || normalized.vehicleWearPerKmMinor !== null;
  if (hasPerKmInputs && normalized.totalDistanceKm === null) {
    missingFields.push("totalDistanceKm");
  }
  if (normalized.depreciationPerKmMinor !== null && normalized.vehicleDepreciationMonthlyMinor !== null) {
    warnings.push("Monthly depreciation ile depreciationPerKmMinor birlikte verilmiş; per-km depreciation baseline dışında bırakıldı");
    issues.doubleCountWarnings.push("Monthly depreciation ile depreciationPerKmMinor birlikte verilmiş");
    doubleCountGuard = "monthly_depreciation_excludes_per_km_depreciation";
  }
  if (normalized.vehicleWearPerKmMinor !== null && granularPresent) {
    warnings.push("vehicleWearPerKmMinor granular per-km maliyetlerle çakışıyor; baseline dışında bırakıldı");
    issues.doubleCountWarnings.push("vehicleWearPerKmMinor granular per-km maliyetlerle çakışıyor");
    doubleCountGuard = "vehicle_wear_excluded_due_to_granular_per_km_costs";
  }
  if (normalized.cleaningPerShiftMinor !== null && normalized.shiftCount === null) {
    missingFields.push("shiftCount");
  }
  if (normalized.cleaningPerShiftMinor !== null && normalized.shiftCount !== null) {
    amountMinor += normalized.cleaningPerShiftMinor * normalized.shiftCount;
    includedInBaseline = true;
    evidence.push(`cleaningPerShiftMinor × shiftCount = ${normalized.cleaningPerShiftMinor} × ${normalized.shiftCount}`);
  }
  if (normalized.maintenancePerKmMinor !== null && normalized.totalDistanceKm !== null) {
    amountMinor += roundMinor(kmBase * normalized.maintenancePerKmMinor);
    includedInBaseline = true;
    evidence.push(`maintenancePerKmMinor × totalDistanceKm = ${normalized.maintenancePerKmMinor} × ${kmBase}`);
  }
  if (normalized.tirePerKmMinor !== null && normalized.totalDistanceKm !== null) {
    amountMinor += roundMinor(kmBase * normalized.tirePerKmMinor);
    includedInBaseline = true;
    evidence.push(`tirePerKmMinor × totalDistanceKm = ${normalized.tirePerKmMinor} × ${kmBase}`);
  }
  if (normalized.depreciationPerKmMinor !== null && normalized.vehicleDepreciationMonthlyMinor === null && normalized.totalDistanceKm !== null) {
    amountMinor += roundMinor(kmBase * normalized.depreciationPerKmMinor);
    includedInBaseline = true;
    evidence.push(`depreciationPerKmMinor × totalDistanceKm = ${normalized.depreciationPerKmMinor} × ${kmBase}`);
  }
  if (normalized.vehicleWearPerKmMinor !== null && !granularPresent && normalized.totalDistanceKm !== null) {
    amountMinor += roundMinor(kmBase * normalized.vehicleWearPerKmMinor);
    includedInBaseline = true;
    evidence.push(`vehicleWearPerKmMinor × totalDistanceKm = ${normalized.vehicleWearPerKmMinor} × ${kmBase}`);
  }
  if (normalized.otherVehicleVariableCostMinor !== null) {
    amountMinor += normalized.otherVehicleVariableCostMinor;
    includedInBaseline = true;
    evidence.push("otherVehicleVariableCostMinor doğrudan toplandı");
  }

  if (!includedInBaseline) {
    missingFields.push("vehicle variable cost inputs");
  }

  return finalizeComponent({
    componentKey: "vehicle_variable",
    labelTr: "Araç değişken maliyet",
    currencyCode: normalized.currencyCode,
    sourceFields,
    amountMinor,
    relevant: true,
    includedInBaseline,
    formula: "maintenance + tire + depreciation + cleaning + wear + other variable",
    calculationEvidence: evidence,
    warnings,
    blockers,
    missingFields,
    invalidFields,
    doubleCountGuard,
  });
}

function buildDriverLaborComponent(normalized, _issues) {
  const relevant = [
    normalized.driverBasePerShiftMinor,
    normalized.driverHourlyCostMinor,
    normalized.mealAllowancePerShiftMinor,
    normalized.socialCostAllocationMinor,
    normalized.otherDriverCostMinor,
    normalized.driverCompensationMode,
  ].some((value) => value !== null && value !== undefined && value !== "");
  if (!relevant) {
    return finalizeComponent({
      componentKey: "driver_labor",
      labelTr: "Sürücü işçilik maliyeti",
      currencyCode: normalized.currencyCode,
      sourceFields: [],
      amountMinor: 0,
      relevant: false,
      includedInBaseline: false,
      formula: "",
      calculationEvidence: [],
      warnings: [],
      blockers: [],
      missingFields: [],
      invalidFields: [],
      doubleCountGuard: "none",
    });
  }

  const sourceFields = [];
  const warnings = [];
  const blockers = [];
  const missingFields = [];
  const invalidFields = [];
  const evidence = [];
  let amountMinor = 0;
  let includedInBaseline = false;
  let doubleCountGuard = "driver_base_mode_explicit_required";

  if (normalized.driverBasePerShiftMinor !== null) sourceFields.push("driverBasePerShiftMinor");
  if (normalized.driverHourlyCostMinor !== null) sourceFields.push("driverHourlyCostMinor");
  if (normalized.mealAllowancePerShiftMinor !== null) sourceFields.push("mealAllowancePerShiftMinor");
  if (normalized.socialCostAllocationMinor !== null) sourceFields.push("socialCostAllocationMinor");
  if (normalized.otherDriverCostMinor !== null) sourceFields.push("otherDriverCostMinor");
  if (normalized.driverCompensationMode) sourceFields.push("driverCompensationMode");

  const hasShiftBase = normalized.driverBasePerShiftMinor !== null;
  const hasHourlyBase = normalized.driverHourlyCostMinor !== null;
  const mode = normalized.driverCompensationMode || (hasShiftBase && !hasHourlyBase ? "per_shift" : hasHourlyBase && !hasShiftBase ? "hourly" : "");

  if (hasShiftBase && hasHourlyBase && !normalized.driverCompensationMode) {
    blockers.push("driverCompensationMode gerekli; per_shift ve hourly base birlikte verildi");
    missingFields.push("driverCompensationMode");
  } else if (mode === "per_shift") {
    if (normalized.shiftCount === null) {
      missingFields.push("shiftCount");
    } else {
      amountMinor += normalized.driverBasePerShiftMinor * normalized.shiftCount;
      includedInBaseline = true;
      evidence.push(`driverBasePerShiftMinor × shiftCount = ${normalized.driverBasePerShiftMinor} × ${normalized.shiftCount}`);
      doubleCountGuard = "per_shift base used";
    }
  } else if (mode === "hourly") {
    if (normalized.routeDurationMinutes === null) {
      missingFields.push("routeDurationMinutes");
    } else {
      amountMinor += roundMinor((normalized.driverHourlyCostMinor * normalized.routeDurationMinutes) / 60);
      includedInBaseline = true;
      evidence.push(`driverHourlyCostMinor × routeDurationMinutes / 60 = ${normalized.driverHourlyCostMinor} × ${normalized.routeDurationMinutes}`);
      doubleCountGuard = "hourly base used";
    }
  }

  if (normalized.mealAllowancePerShiftMinor !== null) {
    if (normalized.shiftCount === null) {
      missingFields.push("shiftCount");
    } else {
      amountMinor += normalized.mealAllowancePerShiftMinor * normalized.shiftCount;
      includedInBaseline = true;
      evidence.push(`mealAllowancePerShiftMinor × shiftCount = ${normalized.mealAllowancePerShiftMinor} × ${normalized.shiftCount}`);
    }
  }
  if (normalized.socialCostAllocationMinor !== null) {
    amountMinor += normalized.socialCostAllocationMinor;
    includedInBaseline = true;
    evidence.push("socialCostAllocationMinor doğrudan toplandı");
  }
  if (normalized.otherDriverCostMinor !== null) {
    amountMinor += normalized.otherDriverCostMinor;
    includedInBaseline = true;
    evidence.push("otherDriverCostMinor doğrudan toplandı");
  }
  if (!includedInBaseline) {
    missingFields.push("driver labor inputs");
  }

  return finalizeComponent({
    componentKey: "driver_labor",
    labelTr: "Sürücü işçilik maliyeti",
    currencyCode: normalized.currencyCode,
    sourceFields,
    amountMinor,
    relevant: true,
    includedInBaseline,
    formula: mode === "per_shift"
      ? "driverBasePerShiftMinor × shiftCount + meal/social/other"
      : mode === "hourly"
      ? "driverHourlyCostMinor × routeDurationMinutes / 60 + meal/social/other"
      : "driver base with explicit mode",
    calculationEvidence: evidence,
    warnings,
    blockers,
    missingFields,
    invalidFields,
    doubleCountGuard,
  });
}


export {
  compactText,
  normalizeCurrencyCode,
  normalizeMode,
  hasValue,
  isSafeMinor,
  roundMinor,
  addUnique,
  safeNumber,
  parseNonNegativeNumber,
  parseMinor,
  parseWholeNumber,
  parseRatio,
  isZeroFuelMetadata,
  safeHashId,
  buildIssues,
  baseNormalizedInput,
  normalizeDistanceTriplet,
  moneySum,
  componentStatus,
  finalizeComponent,
  buildFuelComponent,
  resolveAllocationMode,
  buildVehicleFixedComponent,
  buildVehicleVariableComponent,
  buildDriverLaborComponent,
  RECOGNIZED_CURRENCY_CODES,
};
