import {
  buildOperationalCostModel,
} from "./operationalCostModel.js";
import {
  RECOGNIZED_CURRENCY_CODES,
  safeHashId,
} from "./operationalCostMath.js";
import { resolveVehicleConsumptionReference } from "./vehicleConsumptionReferences.js";
import { resolveVehicleCapacityReference, VEHICLE_PLAN_REFERENCE_UNIT, VEHICLE_PLAN_REFERENCE_VERSION } from "./vehiclePlanReferences.js";

export const COST_SCENARIO_FORECAST_MODEL_VERSION = "COST-SCENARIO-FORECAST-AND-SAVINGS-01";

const MAX_SCENARIO_NUMBER = 1_000_000_000;
const MAX_SCENARIO_FIELDS = 96;
const MONEY_FIELDS = new Set([
  "baselineCostMinor",
  "fuelUnitPriceMinor",
  "vehicleLeaseMonthlyMinor",
  "vehicleDepreciationMonthlyMinor",
  "insuranceMonthlyMinor",
  "taxAndLicenseMonthlyMinor",
  "fixedVehicleCostMonthlyMinor",
  "explicitVehicleFixedCostAllocatedMinor",
  "maintenancePerKmMinor",
  "tirePerKmMinor",
  "depreciationPerKmMinor",
  "cleaningPerShiftMinor",
  "vehicleWearPerKmMinor",
  "otherVehicleVariableCostMinor",
  "driverBasePerShiftMinor",
  "driverHourlyCostMinor",
  "driverOvertimeHourlyCostMinor",
  "driverWaitingHourlyCostMinor",
  "socialCostAllocationMinor",
  "mealAllowancePerShiftMinor",
  "otherDriverCostMinor",
  "tollMinor",
  "bridgeMinor",
  "highwayMinor",
  "parkingMinor",
  "terminalMinor",
  "routeFeeMinor",
  "otherDirectRouteFeeMinor",
  "otherDirectCostMinor",
  "operationsOverheadFixedMinor",
  "operationsOverheadPerShiftMinor",
  "operationsOverheadRateBaseMinor",
  "dispatchControlCostMinor",
  "trackingTechnologyCostMinor",
  "otherOverheadMinor",
]);

const INTEGER_FIELDS = new Set([
  "shiftCount",
  "serviceDayCount",
  "passengerCount",
  "vehicleCapacity",
  "tripCount",
  "stopCount",
  "vehicleCount",
  "shiftsPerServiceDay",
  "operationsOverheadRateBps",
  "shiftStartMinutes",
  "shiftEndMinutes",
  "shiftDurationMinutes",
]);

const DECIMAL_FIELDS = new Set([
  "serviceDistanceKm",
  "emptyDistanceKm",
  "totalDistanceKm",
  "routeDurationMinutes",
  "waitingMinutes",
  "overtimeMinutes",
  "fuelConsumptionLitersPer100Km",
  "idleFuelLiters",
  "allocationServiceDaysPerMonth",
  "allocationShiftsPerMonth",
  "allocationMonthFraction",
]);

const COST_MODEL_FIELDS = new Set([
  ...MONEY_FIELDS,
  ...INTEGER_FIELDS,
  ...DECIMAL_FIELDS,
  "currencyCode",
  "fuelCurrencyCode",
  "fuelDistanceBasis",
  "vehicleFixedCostAllocationMode",
  "driverCompensationMode",
  "fuelType",
  "zeroFuelVehicle",
  "waitingMinutes",
  "overtimeMinutes",
]);

const SCALE_MONEY_FIELDS = [
  "vehicleLeaseMonthlyMinor",
  "vehicleDepreciationMonthlyMinor",
  "insuranceMonthlyMinor",
  "taxAndLicenseMonthlyMinor",
  "fixedVehicleCostMonthlyMinor",
  "explicitVehicleFixedCostAllocatedMinor",
  "tollMinor",
  "bridgeMinor",
  "highwayMinor",
  "parkingMinor",
  "terminalMinor",
  "routeFeeMinor",
  "otherDirectRouteFeeMinor",
  "otherDirectCostMinor",
  "operationsOverheadFixedMinor",
  "dispatchControlCostMinor",
  "trackingTechnologyCostMinor",
  "otherOverheadMinor",
];

const SCALE_DISTANCE_FIELDS = ["serviceDistanceKm", "emptyDistanceKm", "totalDistanceKm"];
const SCALE_INTEGER_FIELDS = ["shiftCount", "tripCount"];

const SCENARIO_LABELS = Object.freeze({
  baseline: "Mevcut Plan",
  scenario: "Alternatif Senaryo",
  savings: "Tahmini Tasarruf",
  additionalCost: "Tahmini Ek Maliyet",
});

const VARIANT_LABELS = Object.freeze({
  EXPECTED: "Beklenen",
  BEST: "En uygun",
  RISK: "Riskli durum",
});

const VEHICLE_PLAN_CLASSES = Object.freeze(["MINIBUS", "MIDIBUS", "OTOBUS"]);
const VEHICLE_PLAN_LABELS = Object.freeze({ MINIBUS: "Minibüs", MIDIBUS: "Midibüs", OTOBUS: "Otobüs" });
const DRIVER_COST_FIELDS = Object.freeze([
  "driverBasePerShiftMinor",
  "driverHourlyCostMinor",
  "driverOvertimeHourlyCostMinor",
  "driverWaitingHourlyCostMinor",
  "socialCostAllocationMinor",
  "mealAllowancePerShiftMinor",
  "otherDriverCostMinor",
]);
const MAINTENANCE_COST_FIELDS = Object.freeze([
  "maintenancePerKmMinor",
  "tirePerKmMinor",
  "depreciationPerKmMinor",
  "cleaningPerShiftMinor",
  "vehicleWearPerKmMinor",
  "otherVehicleVariableCostMinor",
]);
const ALTERNATIVE_COST_EVIDENCE_FIELDS = Object.freeze([
  ...DRIVER_COST_FIELDS,
  ...MAINTENANCE_COST_FIELDS,
  "vehicleLeaseMonthlyMinor",
  "vehicleDepreciationMonthlyMinor",
  "insuranceMonthlyMinor",
  "taxAndLicenseMonthlyMinor",
  "fixedVehicleCostMonthlyMinor",
  "explicitVehicleFixedCostAllocatedMinor",
  "vehicleFixedCostAllocationMode",
  "allocationServiceDaysPerMonth",
  "allocationShiftsPerMonth",
  "allocationMonthFraction",
  "routeFeeMinor",
  "otherDirectCostMinor",
  "operationsOverheadFixedMinor",
  "fuelConsumptionLitersPer100Km",
  "fuelUnitPriceMinor",
]);

const USER_PLANNING_ASSUMPTION_FIELDS = new Set(ALTERNATIVE_COST_EVIDENCE_FIELDS);

const COMPARISON_DIMENSION_LABELS = Object.freeze({
  vehicleCount: "Araç ihtiyacı",
  vehicleType: "Araç tipi",
  vehicleCapacity: "Kapasite",
  passengerCount: "Yolcu sayısı",
  stopCount: "Durak sayısı",
  serviceDistanceKm: "Mesafe",
  totalDistanceKm: "Toplam mesafe",
  routeDurationMinutes: "Süre",
  serviceDayCount: "Hizmet günü",
});

function compact(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function pushUnique(list, value) {
  const text = compact(value);
  if (text && !list.includes(text)) list.push(text);
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseMoney(value, field, issues) {
  if (value === null || value === undefined || value === "") return null;
  const text = typeof value === "string" ? value.trim() : null;
  if (text !== null && !/^\d+$/.test(text)) {
    pushUnique(issues.invalidFields, field);
    pushUnique(issues.blockers, `${field} güvenli kuruş değeri olmalıdır`);
    return null;
  }
  const numeric = text === null ? value : Number(text);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    pushUnique(issues.invalidFields, field);
    pushUnique(issues.blockers, `${field} güvenli kuruş değeri olmalıdır`);
    return null;
  }
  return numeric;
}

function parseNumber(value, field, issues, integer = false) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_SCENARIO_NUMBER || (integer && !Number.isInteger(numeric))) {
    pushUnique(issues.invalidFields, field);
    pushUnique(issues.blockers, `${field} geçerli ve negatif olmayan bir sayı olmalıdır`);
    return null;
  }
  return numeric;
}

function normalizeCurrency(value, field, issues) {
  if (value === null || value === undefined || value === "") return null;
  const code = compact(value).toUpperCase();
  if (!RECOGNIZED_CURRENCY_CODES.has(code)) {
    pushUnique(issues.invalidFields, field);
    pushUnique(issues.blockers, `${field} desteklenen bir para birimi olmalıdır`);
    return null;
  }
  return code;
}

function sanitizeInput(input, label) {
  const issues = { invalidFields: [], blockers: [], warnings: [], ignoredFields: [] };
  if (!isObject(input)) {
    pushUnique(issues.blockers, `${label} nesne olmalıdır`);
    return { values: {}, issues };
  }

  const entries = Object.entries(input);
  if (entries.length > MAX_SCENARIO_FIELDS) {
    pushUnique(issues.blockers, `${label} çok fazla alan içeriyor`);
  }

  const values = {};
  for (const [field, value] of entries.slice(0, MAX_SCENARIO_FIELDS)) {
    if (field === "roomCostLedgerInputs" || field === "roomCostPlanningEvidence") {
      // These are server-owned planning inputs. Public scenario requests must
      // supply them through context.actualCostInputs, never through the body.
      pushUnique(issues.ignoredFields, field);
      continue;
    }
    if (field === "vehicleType" || field === "fuelType" || field === "fuelDistanceBasis" || field === "vehicleFixedCostAllocationMode" || field === "driverCompensationMode") {
      const normalized = compact(value);
      if (normalized) values[field] = normalized;
      continue;
    }
    if (field === "currencyCode" || field === "fuelCurrencyCode") {
      const normalized = normalizeCurrency(value, field, issues);
      if (normalized) values[field] = normalized;
      continue;
    }
    if (field === "zeroFuelVehicle" || field === "useExternalFuelPrice") {
      values[field] = Boolean(value);
      continue;
    }
    if (MONEY_FIELDS.has(field)) {
      const normalized = parseMoney(value, field, issues);
      if (normalized !== null) values[field] = normalized;
      continue;
    }
    if (INTEGER_FIELDS.has(field)) {
      const normalized = parseNumber(value, field, issues, true);
      if (normalized !== null) values[field] = normalized;
      continue;
    }
    if (DECIMAL_FIELDS.has(field)) {
      const normalized = parseNumber(value, field, issues, false);
      if (normalized !== null) values[field] = normalized;
      continue;
    }
    pushUnique(issues.ignoredFields, field);
  }

  return { values, issues };
}

function mergeIssues(...issueSets) {
  const output = { invalidFields: [], blockers: [], warnings: [], ignoredFields: [] };
  for (const set of issueSets) {
    for (const key of Object.keys(output)) {
      for (const value of set?.[key] || []) pushUnique(output[key], value);
    }
  }
  return output;
}

function toBigIntSafe(value) {
  return Number.isSafeInteger(value) ? BigInt(value) : null;
}

function bigIntToNumber(value, field, issues) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) {
    pushUnique(issues.blockers, `${field} güvenli sayı sınırını aşıyor`);
    return null;
  }
  return numeric;
}

function multiplyMoney(value, multiplier, field, issues) {
  if (value === null || value === undefined) return null;
  const left = toBigIntSafe(value);
  const right = toBigIntSafe(multiplier);
  if (left === null || right === null) {
    pushUnique(issues.blockers, `${field} güvenli sayı sınırını aşıyor`);
    return null;
  }
  return bigIntToNumber(left * right, field, issues);
}

function multiplyDecimal(value, multiplier, field, issues) {
  if (value === null || value === undefined) return null;
  const result = Number(value) * Number(multiplier);
  if (!Number.isFinite(result) || result > MAX_SCENARIO_NUMBER) {
    pushUnique(issues.blockers, `${field} güvenli sayı sınırını aşıyor`);
    return null;
  }
  return result;
}

function divideRound(numerator, denominator, field, issues) {
  if (numerator === null || denominator === null || denominator === 0) return null;
  const n = toBigIntSafe(numerator);
  const d = toBigIntSafe(denominator);
  if (n === null || d === null || d === 0n) {
    pushUnique(issues.blockers, `${field} güvenli oran hesabı yapılamadı`);
    return null;
  }
  const sign = n < 0n ? -1n : 1n;
  const absolute = n < 0n ? -n : n;
  const rounded = (absolute + d / 2n) / d;
  return bigIntToNumber(sign * rounded, field, issues);
}

function divideBigIntRound(numerator, denominator, field, issues) {
  if (numerator === null || denominator === null || denominator === 0n) return null;
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  const rounded = (absolute + denominator / 2n) / denominator;
  return bigIntToNumber(sign * rounded, field, issues);
}

function scaleForVehicles(values, issues, {
  distanceAlreadyAggregated = false,
  routeFeesAlreadyAggregated = false,
  driverBaseAlreadyAggregated = false,
} = {}) {
  const vehicleCount = values.vehicleCount ?? 1;
  const scaled = { ...values };
  if (vehicleCount === 0) {
    for (const field of [...SCALE_DISTANCE_FIELDS, ...SCALE_INTEGER_FIELDS, ...SCALE_MONEY_FIELDS]) {
      if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = 0;
    }
    return scaled;
  }
  if (!distanceAlreadyAggregated) {
    for (const field of SCALE_DISTANCE_FIELDS) {
      if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = multiplyDecimal(scaled[field], vehicleCount, field, issues);
    }
  }
  for (const field of SCALE_INTEGER_FIELDS) {
    if (driverBaseAlreadyAggregated && (field === "shiftCount" || field === "tripCount")) continue;
    if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = multiplyMoney(scaled[field], vehicleCount, field, issues);
  }
  for (const field of SCALE_MONEY_FIELDS) {
    if (routeFeesAlreadyAggregated && field === "routeFeeMinor") continue;
    if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = multiplyMoney(scaled[field], vehicleCount, field, issues);
  }
  if (scaled.shiftsPerServiceDay !== null && scaled.shiftsPerServiceDay !== undefined && scaled.serviceDayCount !== null && scaled.serviceDayCount !== undefined) {
    scaled.shiftCount = multiplyMoney(scaled.shiftsPerServiceDay, scaled.serviceDayCount, "shiftCount", issues);
    if (!driverBaseAlreadyAggregated) scaled.shiftCount = multiplyMoney(scaled.shiftCount, vehicleCount, "shiftCount", issues);
  }
  return scaled;
}

function canonicalInput(values, context, side) {
  const output = {};
  for (const field of COST_MODEL_FIELDS) {
    if (values[field] !== null && values[field] !== undefined && values[field] !== "") output[field] = values[field];
  }
  output.sourceType = "COST_SCENARIO_PREVIEW";
  output.sourceRef = compact(context?.baselineReference, "scenario-baseline");
  output.role = compact(context?.role);
  output.shiftRef = compact(context?.shiftReference);
  output.routeRef = compact(context?.routeReference);
  output.vehicleRef = compact(context?.vehicleReference);
  output.calculationId = `${side}-${compact(context?.tenantScope, "tenant")}`;
  if (Array.isArray(values.roomCostLedgerInputs) && values.roomCostLedgerInputs.length > 0) {
    output.roomCostLedgerInputs = values.roomCostLedgerInputs;
  }
  // The canonical cost owner models one vehicle. Keep its capacity guard true
  // while the scenario layer separately validates total passengers across all
  // vehicles; passenger-sensitive costs are not invented here.
  if (output.passengerCount != null && output.vehicleCapacity != null && values.vehicleCount > 1 && output.passengerCount > output.vehicleCapacity) {
    output.passengerCount = Math.ceil(output.passengerCount / values.vehicleCount);
  }
  return output;
}

function fieldChanged(base, next, field) {
  return JSON.stringify(base?.[field] ?? null) !== JSON.stringify(next?.[field] ?? null);
}

function buildAnchorAmount(values, baseValues, side, issues) {
  if (values.baselineCostMinor === null || values.baselineCostMinor === undefined) return null;
  if (side === "baseline") return values.baselineCostMinor;

  const unsupported = [
    "serviceDistanceKm",
    "emptyDistanceKm",
    "totalDistanceKm",
    "routeDurationMinutes",
    "passengerCount",
    "vehicleCapacity",
    "fuelConsumptionLitersPer100Km",
    "fuelUnitPriceMinor",
    "maintenancePerKmMinor",
    "driverBasePerShiftMinor",
  ].filter((field) => fieldChanged(baseValues, values, field));
  if (unsupported.length) {
    pushUnique(issues.warnings, `Planlanan maliyet tabanı ${unsupported.join(", ")} değişimini açıklayamaz`);
    return null;
  }

  const baseVehicleCount = baseValues.vehicleCount ?? 1;
  const scenarioVehicleCount = values.vehicleCount ?? baseVehicleCount;
  const baseDays = baseValues.serviceDayCount ?? 1;
  const scenarioDays = values.serviceDayCount ?? baseDays;
  let amount = values.baselineCostMinor;
  amount = divideRound(amount * scenarioVehicleCount, baseVehicleCount || 1, "scenarioCostMinor", issues);
  amount = divideRound(amount * scenarioDays, baseDays || 1, "scenarioCostMinor", issues);
  return amount;
}

function buildSide(values, baseValues, context, side, globalIssues) {
  const localIssues = { invalidFields: [], blockers: [], warnings: [], ignoredFields: [] };
  const effectiveValues = scaleForVehicles(values, localIssues, {
    distanceAlreadyAggregated: context?.routeDistanceAlreadyAggregated === true,
    routeFeesAlreadyAggregated: context?.routeFeesAlreadyAggregated === true,
    driverBaseAlreadyAggregated: context?.driverBaseAlreadyAggregated === true,
  });
  const model = buildOperationalCostModel(canonicalInput(effectiveValues, context, side));
  const hasIncludedComponent = model.components.some((component) => component.includedInBaseline);
  const completeCanonical = model.status === "complete" && hasIncludedComponent && model.blockers.length === 0;
  const hasCanonicalLedger = Array.isArray(model.normalizedInput?.roomCostLedgerInputs) && model.normalizedInput.roomCostLedgerInputs.length > 0;
  const hasReadableGrossCost = (completeCanonical || hasCanonicalLedger)
    && hasIncludedComponent
    && model.baselineOperationalCostMinor !== null
    && model.blockers.length === 0;
  let costMinor = hasReadableGrossCost ? model.baselineOperationalCostMinor : null;
  let basis = hasReadableGrossCost ? (completeCanonical ? "OPERATIONAL_COST_MODEL" : "OPERATIONAL_COST_MODEL_PARTIAL") : null;
  if (costMinor === null) {
    const anchor = buildAnchorAmount(values, baseValues, side, localIssues);
    if (anchor !== null) {
      costMinor = anchor;
      basis = "INTERNAL_PLANNED_COST_ANCHOR";
    }
  }

  if (model.blockers.length) localIssues.blockers.push(...model.blockers);
  for (const item of model.invalidFields || []) pushUnique(localIssues.invalidFields, item);
  for (const item of model.missingFields || []) pushUnique(localIssues.warnings, `${item} eksik`);
  for (const item of model.warnings || []) pushUnique(localIssues.warnings, item);
  for (const item of model.currencyWarnings || []) pushUnique(localIssues.blockers, item);
  globalIssues.invalidFields.push(...localIssues.invalidFields);
  globalIssues.blockers.push(...localIssues.blockers);
  globalIssues.warnings.push(...localIssues.warnings);

  return {
    values: effectiveValues,
    rawValues: values,
    model,
    costMinor,
    basis,
    complete: completeCanonical,
    issues: localIssues,
  };
}

function capacityGuard(side, label, globalIssues) {
  const passengers = side.rawValues.passengerCount;
  const capacity = side.rawValues.vehicleCapacity;
  const vehicles = side.rawValues.vehicleCount ?? 1;
  if (passengers === null || passengers === undefined || passengers === 0) return null;
  if (capacity === null || capacity === undefined || capacity <= 0) {
    pushUnique(globalIssues.warnings, `${label} için kapasite bilgisi eksik`);
    return { requiredVehicleCount: null, blocked: false };
  }
  const required = Math.ceil(passengers / capacity);
  if (vehicles < required) {
    pushUnique(globalIssues.blockers, `${label} yolcu kapasitesi için en az ${required} araç gerektiriyor`);
    return { requiredVehicleCount: required, blocked: true };
  }
  return { requiredVehicleCount: required, blocked: false };
}

function externalValueMinor(reference) {
  if (!reference) return null;
  if (Number.isSafeInteger(reference.valueMinor) && reference.valueMinor >= 0) return reference.valueMinor;
  const decimal = String(reference.valueDecimal || "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(decimal)) return null;
  const [whole, fraction = ""] = decimal.split(".");
  const minor = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

function applyExternalReference(baseValues, scenarioValues, externalReference, globalIssues) {
  const reference = externalReference?.marketReference || null;
  const freshness = String(externalReference?.freshness || reference?.freshness || "UNKNOWN").toUpperCase();
  const valueMinor = externalValueMinor(reference);
  const result = {
    baseline: { ...baseValues },
    scenario: { ...scenarioValues },
    used: false,
    status: freshness,
    reference,
  };
  if (!externalReference) return { ...result, status: "NOT_REQUESTED" };
  if (!reference || valueMinor === null || !["FRESH", "STALE"].includes(freshness)) {
    pushUnique(globalIssues.warnings, freshness === "EXPIRED" ? "Piyasa referansının süresi doldu; maliyet hesabına alınmadı" : "Piyasa referansı kullanılabilir bir değer sağlamadı");
    return result;
  }
  const baseFuelType = compact(baseValues.fuelType).toUpperCase();
  const scenarioFuelType = compact(scenarioValues.fuelType || baseFuelType).toUpperCase();
  if ([baseFuelType, scenarioFuelType].some((fuelType) => fuelType && fuelType !== "DIESEL") && String(reference.family || "").toUpperCase() === "FUEL_DIESEL") {
    pushUnique(globalIssues.warnings, "Dizel piyasa referansı seçili araç yakıt türüyle uyumlu değil; maliyet hesabına alınmadı");
    return result;
  }
  if (!baseFuelType && !scenarioFuelType && String(reference.family || "").toUpperCase() === "FUEL_DIESEL") {
    pushUnique(globalIssues.warnings, "Araç yakıt türü doğrulanmadı; dizel piyasa referansı sınıf varsayımı olarak gösterildi");
  }
  const referenceCurrency = compact(reference.currencyCode).toUpperCase();
  const baseCurrency = compact(baseValues.currencyCode, "TRY").toUpperCase();
  if (referenceCurrency && referenceCurrency !== baseCurrency) {
    pushUnique(globalIssues.blockers, "Piyasa referansı ile senaryo para birimi uyuşmuyor");
    return result;
  }
  const applyForecastPrice = scenarioValues.useExternalFuelPrice === true;
  const baselinePriceMissing = result.baseline.fuelUnitPriceMinor === null || result.baseline.fuelUnitPriceMinor === undefined;
  const scenarioPriceMissing = result.scenario.fuelUnitPriceMinor === null || result.scenario.fuelUnitPriceMinor === undefined;
  if (baselinePriceMissing) {
    result.baseline.fuelUnitPriceMinor = valueMinor;
    result.baseline.fuelCurrencyCode = referenceCurrency || baseCurrency;
    if (scenarioPriceMissing) {
      result.scenario.fuelUnitPriceMinor = valueMinor;
      result.scenario.fuelCurrencyCode = referenceCurrency || baseCurrency;
    }
    result.used = true;
    pushUnique(globalIssues.warnings, "Eksik yakıt fiyatı piyasa referansı ile tamamlandı; gerçekleşen maliyet değildir");
  } else if (applyForecastPrice) {
    result.scenario.fuelUnitPriceMinor = valueMinor;
    result.scenario.fuelCurrencyCode = referenceCurrency || baseCurrency;
    result.used = true;
    pushUnique(globalIssues.warnings, "Alternatif yakıt fiyatı piyasa referansından alındı; gerçekleşen maliyet değildir");
  }
  if (freshness === "STALE") pushUnique(globalIssues.warnings, "Piyasa referansı eski; sonuç düşük güvenle gösteriliyor");
  return result;
}

function applyVehicleConsumptionReference(baseValues, scenarioValues, context, { baselineExplicit = false, scenarioExplicit = false } = {}, globalIssues) {
  const baselineVehicleType = baseValues.vehicleType || null;
  const scenarioVehicleType = scenarioValues.vehicleType || baselineVehicleType;
  const baselineActualValue = context?.actualVehicleConsumptionLitersPer100Km
    ?? (baselineExplicit ? baseValues.fuelConsumptionLitersPer100Km : null);
  const baselineActualReference = context?.actualVehicleConsumptionReference
    || (baselineExplicit ? { sourceName: "Açık mevcut plan tüketim girdisi", version: "USER_INPUT" } : null);
  const baseline = resolveVehicleConsumptionReference({
    vehicleType: baselineVehicleType,
    fuelType: baseValues.fuelType,
    actualReference: baselineActualReference,
    actualValue: baselineActualValue,
    platformReference: context?.platformVehicleConsumptionReference,
  });
  const vehicleTypeChanged = String(scenarioVehicleType || "") !== String(baselineVehicleType || "");
  const planningValue = context?.scenarioVehicleConsumptionPlanningValue ?? null;
  const hasPlanningValue = planningValue !== null && planningValue !== undefined;
  const scenarioActualValue = context?.scenarioVehicleConsumptionLitersPer100Km
    ?? (hasPlanningValue
      ? null
      : scenarioExplicit
        ? scenarioValues.fuelConsumptionLitersPer100Km
        : !vehicleTypeChanged && baseline.selected?.sourceKind === "USER_ACTUAL"
          ? baseline.selected.valueLitersPer100Km
          : null);
  const scenarioActualReference = context?.scenarioVehicleConsumptionReference
    || (!hasPlanningValue && scenarioExplicit ? { sourceName: "Açık senaryo actual tüketim girdisi", version: "USER_INPUT" } : null);
  const scenario = resolveVehicleConsumptionReference({
    vehicleType: scenarioVehicleType,
    fuelType: scenarioValues.fuelType || baseValues.fuelType,
    actualReference: scenarioActualReference,
    actualValue: scenarioActualValue,
    platformReference: context?.platformVehicleConsumptionReference,
    planningReference: context?.scenarioVehicleConsumptionPlanningReference,
    planningValue,
  });
  const nextBaseline = { ...baseValues };
  const nextScenario = { ...scenarioValues };
  if (baseline.selected?.available && baseline.selected.valueLitersPer100Km !== null && baseline.selected.valueLitersPer100Km !== undefined) {
    nextBaseline.fuelConsumptionLitersPer100Km = baseline.selected.valueLitersPer100Km;
  } else {
    delete nextBaseline.fuelConsumptionLitersPer100Km;
  }
  if (scenario.selected?.available && scenario.selected.valueLitersPer100Km !== null && scenario.selected.valueLitersPer100Km !== undefined) {
    nextScenario.fuelConsumptionLitersPer100Km = scenario.selected.valueLitersPer100Km;
  } else {
    delete nextScenario.fuelConsumptionLitersPer100Km;
  }
  for (const [side, resolution] of [["Mevcut plan", baseline], ["Alternatif senaryo", scenario]]) {
    for (const missing of resolution.missingData || []) pushUnique(globalIssues.warnings, `${side} tüketim verisi: ${missing}`);
    if (resolution.fuelTypeStatus === "UNRESOLVED" && resolution.selected?.sourceKind === "TECHNICAL_CLASS_REFERENCE") {
      pushUnique(globalIssues.warnings, `${side} için yakıt türü doğrulanmadı; dizel sınıf referansı açıkça işaretlendi`);
    }
  }
  return {
    baselineValues: nextBaseline,
    scenarioValues: nextScenario,
    baseline,
    scenario,
    precedence: baseline.precedence || scenario.precedence || ["USER_ACTUAL", "PLATFORM_OBSERVED_REFERENCE", "TECHNICAL_CLASS_REFERENCE", "NO_DATA"],
  };
}

function isFuelLedgerInput(item) {
  return String(item?.componentKey || item?.categoryKey || "").trim().toUpperCase() === "FUEL";
}

function fuelLedgerAmountMinor(values = {}) {
  const entries = Array.isArray(values.roomCostLedgerInputs) ? values.roomCostLedgerInputs : [];
  const fuelEntries = entries.filter((item) => isFuelLedgerInput(item) && String(item?.recordKind || "ACTUAL").toUpperCase() === "ACTUAL");
  if (!fuelEntries.length) return null;
  const total = fuelEntries.reduce((sum, item) => {
    const amount = Number(item?.amountMinor);
    return Number.isSafeInteger(amount) && amount >= 0 ? sum + amount : sum;
  }, 0);
  return total;
}

function removeFuelLedgerInputs(values = {}) {
  const entries = Array.isArray(values.roomCostLedgerInputs) ? values.roomCostLedgerInputs : [];
  if (!entries.length) return { ...values, removed: false };
  const remaining = entries.filter((item) => !isFuelLedgerInput(item) || String(item?.recordKind || "ACTUAL").toUpperCase() !== "ACTUAL");
  if (remaining.length === entries.length) return { ...values, removed: false };
  const next = { ...values };
  if (remaining.length) next.roomCostLedgerInputs = remaining;
  else delete next.roomCostLedgerInputs;
  return { ...next, removed: true };
}

function fuelComponent(components = []) {
  return (components || []).find((item) => item?.componentKey === "fuel") || null;
}

function fuelScenarioDimensionsChanged(baselineValues = {}, scenarioValues = {}, scenarioMeta = {}) {
  const fields = [
    "serviceDistanceKm",
    "totalDistanceKm",
    "emptyDistanceKm",
    "vehicleCount",
    "vehicleType",
    "fuelConsumptionLitersPer100Km",
    "fuelUnitPriceMinor",
  ];
  return fields.some((field) => fieldChanged(baselineValues, scenarioValues, field))
    || scenarioMeta.stopOperations.length > 0
    || Boolean(scenarioMeta.routeAlternative);
}

function buildFuelComparison({ baseline, scenario, baselineValues, scenarioUsesActualFuelLedger }) {
  const actualLedgerMinor = fuelLedgerAmountMinor(baselineValues);
  const baselineFormula = fuelComponent(baseline?.model?.formulaComponents);
  const scenarioFormula = fuelComponent(scenario?.model?.formulaComponents);
  const baselineCounted = fuelComponent(baseline?.model?.components);
  const scenarioCounted = fuelComponent(scenario?.model?.components);
  const baselineFormulaMinor = baselineFormula?.amountMinor ?? null;
  const scenarioFormulaMinor = scenarioFormula?.amountMinor ?? null;
  const baselineCountedMinor = baselineCounted?.amountMinor ?? null;
  const scenarioCountedMinor = scenarioCounted?.amountMinor ?? null;
  const actualLedgerUsed = actualLedgerMinor !== null && scenarioUsesActualFuelLedger;
  const scenarioEstimateMinor = scenarioUsesActualFuelLedger ? scenarioCountedMinor : scenarioFormulaMinor;
  return {
    status: actualLedgerMinor === null
      ? "ESTIMATE_ONLY"
      : scenarioUsesActualFuelLedger
        ? "ACTUAL_USED_WITHOUT_DUPLICATION"
        : "ACTUAL_BASELINE_SCENARIO_ESTIMATE",
    actualLedgerMinor,
    estimatedBaselineMinor: baselineFormulaMinor,
    scenarioEstimateMinor,
    countedBaselineMinor: baselineCountedMinor,
    countedScenarioMinor: scenarioCountedMinor,
    baselineEstimateIncluded: baselineFormula?.includedInBaseline === true,
    scenarioEstimateIncluded: scenarioFormula?.includedInBaseline === true,
    actualLedgerUsed,
    scenarioUsesActualFuelLedger,
    doubleCounted: false,
    explanation: actualLedgerMinor !== null && !scenarioUsesActualFuelLedger
      ? "Gerçekleşen yakıt temel planda korunur; değişen senaryo yakıtı ayrı tahmin olarak karşılaştırılır."
      : actualLedgerMinor !== null
        ? "Gerçekleşen yakıt kullanıldı; tahmini yakıt ikinci kez toplanmadı."
        : "Gerçekleşmiş yakıt kaydı yok; sonuç yalnızca kaynaklı tahmin olarak gösterilir.",
  };
}

function fuelPriceResolution({ baseValues, scenarioValues, external }) {
  const externalReference = external?.reference || null;
  const baselineHasPrice = baseValues.fuelUnitPriceMinor !== null && baseValues.fuelUnitPriceMinor !== undefined;
  const scenarioHasPrice = scenarioValues.fuelUnitPriceMinor !== null && scenarioValues.fuelUnitPriceMinor !== undefined;
  const externalLayer = externalReference
    ? {
      sourceKind: "EXTERNAL_CURRENT_REFERENCE",
      authority: "EXTERNAL_DYNAMIC_FUEL",
      family: externalReference.family || null,
      sourceName: externalReference.sourceName || null,
      sourceUrl: externalReference.sourceUrl || null,
      providerKey: externalReference.providerKey || null,
      regionCode: externalReference.regionCode ?? null,
      regionName: externalReference.regionName || externalReference.sourceMetadata?.geographicScopeLabel || null,
      scopeType: externalReference.scopeType || null,
      scopeKey: externalReference.scopeKey || null,
      fallbackState: externalReference.fallbackState || "NONE",
      sourceMetadata: externalReference.sourceMetadata || null,
      asOf: externalReference.asOf || null,
      currencyCode: externalReference.currencyCode || null,
      freshness: external.status,
      confidence: externalReference.confidence || "UNKNOWN",
      valueMinor: externalValueMinor(externalReference),
    }
    : null;
  const baseline = baselineHasPrice
    ? { sourceKind: "BASELINE_INPUT", authority: "BASELINE_INPUT", valueMinor: baseValues.fuelUnitPriceMinor, currencyCode: baseValues.fuelCurrencyCode || baseValues.currencyCode || "TRY" }
    : external?.used ? externalLayer : { sourceKind: "NO_DATA", authority: "NO_DATA", valueMinor: null };
  const scenario = scenarioHasPrice
    ? (external?.used && scenarioValues.useExternalFuelPrice ? externalLayer : { sourceKind: "BASELINE_INPUT", authority: "BASELINE_INPUT", valueMinor: scenarioValues.fuelUnitPriceMinor, currencyCode: scenarioValues.fuelCurrencyCode || scenarioValues.currencyCode || "TRY" })
    : external?.used ? externalLayer : { sourceKind: "NO_DATA", authority: "NO_DATA", valueMinor: null };
  return {
    baseline,
    scenario,
    precedence: ["USER_ACTUAL", "PLATFORM_OBSERVED_REFERENCE", "EXTERNAL_CURRENT_REFERENCE", "NO_DATA"],
    status: baseline.valueMinor !== null && scenario.valueMinor !== null ? "RESOLVED" : "NO_DATA",
    selectedExternal: externalLayer,
  };
}

function compareComponents(baseline, scenario) {
  const byKey = new Map((scenario?.components || []).map((component) => [component.componentKey, component]));
  return (baseline?.components || [])
    .filter((component) => component.includedInBaseline || byKey.get(component.componentKey)?.includedInBaseline)
    .map((component) => {
      const other = byKey.get(component.componentKey);
      return {
        key: component.componentKey,
        label: component.labelTr,
        baselineMinor: component.includedInBaseline ? component.amountMinor : null,
        scenarioMinor: other?.includedInBaseline ? other.amountMinor : null,
        deltaMinor: component.includedInBaseline && other?.includedInBaseline ? other.amountMinor - component.amountMinor : null,
      };
    });
}

const COST_COMPONENT_LABELS = Object.freeze({
  fuel: "Yakıt",
  vehicle_fixed_allocated: "Dağıtılmış araç sabit giderleri",
  vehicle_variable: "Bakım ve araç değişken giderleri",
  driver_labor: "Sürücü maliyeti",
  waiting_and_overtime: "Bekleme ve fazla süre maliyeti",
  route_fees: "HGS, otoyol ve otopark",
  operations_overhead: "Operasyon genel giderleri",
  other_direct_cost: "Diğer doğrudan giderler",
});

function buildComponentCoverage(baseline, scenario) {
  const includedKeys = (side) => new Set((side?.model?.components || [])
    .filter((component) => component.includedInBaseline)
    .map((component) => component.componentKey));
  const baselineKeys = includedKeys(baseline);
  const scenarioKeys = includedKeys(scenario);
  const missingInScenario = [...baselineKeys].filter((key) => !scenarioKeys.has(key));
  const missingInBaseline = [...scenarioKeys].filter((key) => !baselineKeys.has(key));
  return {
    hasGap: missingInScenario.length > 0 || missingInBaseline.length > 0,
    missingInScenario,
    missingInBaseline,
    missingInScenarioLabels: missingInScenario.map((key) => COST_COMPONENT_LABELS[key] || "Karşılaştırılabilir maliyet bileşeni"),
    missingInBaselineLabels: missingInBaseline.map((key) => COST_COMPONENT_LABELS[key] || "Karşılaştırılabilir maliyet bileşeni"),
  };
}

const VARIABLE_INCREMENTAL_COMPONENT_KEYS = new Set([
  "fuel",
  "vehicle_variable",
  "waiting_and_overtime",
  "route_fees",
]);
const FIXED_DISTRIBUTED_COMPONENT_KEYS = new Set(["vehicle_fixed_allocated"]);

function periodKey(start, end) {
  const normalizedStart = String(start || "").slice(0, 10);
  const normalizedEnd = String(end || "").slice(0, 10);
  return normalizedStart && normalizedEnd ? `${normalizedStart}|${normalizedEnd}` : null;
}

function buildPeriodScopeEvidence({ actualCostInputs = [], actualEvidence = null } = {}) {
  const actuals = (Array.isArray(actualCostInputs) ? actualCostInputs : [])
    .filter((entry) => String(entry?.recordKind || "ACTUAL").toUpperCase() === "ACTUAL");
  if (!actuals.length) {
    return {
      status: "COMPLETE",
      selectedPeriodStart: null,
      selectedPeriodEnd: null,
      distinctPeriods: [],
      unscopedEntryIds: [],
      outsideSelectedPeriodEntryIds: [],
      blockers: [],
      reason: "Gerçekleşmiş ledger girdisi yok; bu karşılaştırma yalnız açık senaryo girdileriyle çalışıyor.",
    };
  }

  const selectedPeriodStart = actualEvidence?.periodStart || null;
  const selectedPeriodEnd = actualEvidence?.periodEnd || null;
  const selectedKey = periodKey(selectedPeriodStart, selectedPeriodEnd);
  const distinctPeriods = [...new Set(actuals.map((entry) => periodKey(entry?.periodStart, entry?.periodEnd)).filter(Boolean))];
  const unscopedEntryIds = actuals
    .filter((entry) => !periodKey(entry?.periodStart, entry?.periodEnd))
    .map((entry) => entry?.entryId ?? null)
    .filter((entryId) => entryId !== null);
  const outsideSelectedPeriodEntryIds = selectedKey
    ? actuals
      .filter((entry) => {
        const entryKey = periodKey(entry?.periodStart, entry?.periodEnd);
        return entryKey && entryKey !== selectedKey;
      })
      .map((entry) => entry?.entryId ?? null)
      .filter((entryId) => entryId !== null)
    : [];
  const blockers = [];
  if (distinctPeriods.length > 1 || outsideSelectedPeriodEntryIds.length > 0) blockers.push("MIXED_PERIODS");
  if (unscopedEntryIds.length > 0) blockers.push("UNSCOPED_ACTUAL_COST");
  if (!selectedKey && distinctPeriods.length > 1) blockers.push("SELECTED_PERIOD_REQUIRED");

  return {
    status: blockers.length ? "INSUFFICIENT_DATA" : "COMPLETE",
    selectedPeriodStart,
    selectedPeriodEnd,
    distinctPeriods,
    unscopedEntryIds,
    outsideSelectedPeriodEntryIds,
    blockers,
    reason: blockers.length
      ? "Gerçekleşmiş giderler tek bir dönem ve vardiya kapsamına indirgenemedi; dağıtılmış maliyet, tasarruf ve kârlılık farkı kesin gösterilmedi."
      : "Gerçekleşmiş giderlerin dönem kapsamı tek ve karşılaştırılabilir.",
  };
}

function buildIncrementalCostEvidence({ baseline, scenario, componentCoverage, periodScope, distributedDeltaMinor }) {
  if (periodScope?.status !== "COMPLETE") {
    return {
      status: "NOT_PROVEN",
      distributedTotalDeltaMinor: null,
      variableBaselineMinor: null,
      variableScenarioMinor: null,
      variableDeltaMinor: null,
      fixedBaselineMinor: null,
      fixedScenarioMinor: null,
      fixedDeltaMinor: null,
      avoidableDeltaMinor: null,
      includedComponents: [],
      excludedComponents: [],
      reason: periodScope?.reason || "Dönem kapsamı doğrulanmadığı için artımsal maliyet hesaplanmadı.",
    };
  }
  if (componentCoverage?.hasGap) {
    return {
      status: "NOT_PROVEN",
      distributedTotalDeltaMinor: distributedDeltaMinor ?? null,
      variableBaselineMinor: null,
      variableScenarioMinor: null,
      variableDeltaMinor: null,
      fixedBaselineMinor: null,
      fixedScenarioMinor: null,
      fixedDeltaMinor: null,
      avoidableDeltaMinor: null,
      includedComponents: [],
      excludedComponents: [],
      reason: "Maliyet bileşeni kapsamı iki tarafta eşit olmadığı için artımsal/kaçınılabilir fark hesaplanmadı.",
    };
  }

  const baselineComponents = new Map((baseline?.model?.components || []).map((item) => [item.componentKey, item]));
  const scenarioComponents = new Map((scenario?.model?.components || []).map((item) => [item.componentKey, item]));
  const keys = new Set([...baselineComponents.keys(), ...scenarioComponents.keys()]);
  let variableBaselineMinor = 0;
  let variableScenarioMinor = 0;
  let fixedBaselineMinor = 0;
  let fixedScenarioMinor = 0;
  const includedComponents = [];
  const excludedComponents = [];

  for (const key of keys) {
    const base = baselineComponents.get(key);
    const next = scenarioComponents.get(key);
    const baseIncluded = base?.includedInBaseline === true;
    const nextIncluded = next?.includedInBaseline === true;
    if (!baseIncluded && !nextIncluded) continue;
    if (!baseIncluded || !nextIncluded) {
      excludedComponents.push(COST_COMPONENT_LABELS[key] || key);
      continue;
    }

    const baseAmount = Number(base.amountMinor);
    const nextAmount = Number(next.amountMinor);
    if (!Number.isSafeInteger(baseAmount) || !Number.isSafeInteger(nextAmount)) {
      excludedComponents.push(COST_COMPONENT_LABELS[key] || key);
      continue;
    }
    if (VARIABLE_INCREMENTAL_COMPONENT_KEYS.has(key)) {
      variableBaselineMinor += baseAmount;
      variableScenarioMinor += nextAmount;
      includedComponents.push(COST_COMPONENT_LABELS[key] || key);
      continue;
    }
    if (FIXED_DISTRIBUTED_COMPONENT_KEYS.has(key)) {
      fixedBaselineMinor += baseAmount;
      fixedScenarioMinor += nextAmount;
      includedComponents.push(COST_COMPONENT_LABELS[key] || key);
      continue;
    }
    if (baseAmount !== nextAmount) excludedComponents.push(COST_COMPONENT_LABELS[key] || key);
    else includedComponents.push(COST_COMPONENT_LABELS[key] || key);
  }

  const variableDeltaMinor = variableScenarioMinor - variableBaselineMinor;
  const fixedDeltaMinor = fixedScenarioMinor - fixedBaselineMinor;
  const status = excludedComponents.length || fixedDeltaMinor !== 0 ? "PARTIAL" : "READY";
  const avoidableDeltaMinor = status === "READY" ? variableDeltaMinor : null;
  const reason = status === "READY"
    ? "Artımsal fark yakıt, değişken araç, bekleme ve rota kalemleriyle hesaplandı; sabit dönem giderleri aynı kaldı."
    : fixedDeltaMinor !== 0
      ? "Dağıtılmış sabit gider değişti; sabit fark için kaçınılabilirlik kanıtı olmadan tasarruf iddiası kapalıdır."
      : `Artımsal sınıflaması kanıtlanamayan kalemler var: ${excludedComponents.join(", ")}.`;

  return {
    status,
    distributedTotalDeltaMinor: distributedDeltaMinor ?? null,
    variableBaselineMinor,
    variableScenarioMinor,
    variableDeltaMinor,
    fixedBaselineMinor,
    fixedScenarioMinor,
    fixedDeltaMinor,
    avoidableDeltaMinor,
    includedComponents,
    excludedComponents,
    reason,
  };
}

export function classifyPlanningEconomicReliability({ planningEvidence = {}, dataClass = null, userAssumptionUsed = false } = {}) {
  const classes = [
    dataClass,
    ...Object.values(planningEvidence || {}).map((item) => item?.dataClass),
  ]
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(Boolean);
  const hasActualScoped = classes.includes("INTERNAL_ACTUAL_DERIVED");
  const hasDemoAssumption = classes.includes("DEMO_PLANNING_ASSUMPTION");
  const hasCanonicalPlanning = classes.includes("INTERNAL_DATA_PLANNING_ESTIMATE")
    || classes.includes("ROOM_FLEET_AND_TECHNICAL_REFERENCE")
    || classes.includes("ROOM_QUOTE_FLOOR_DRAFT");
  if (userAssumptionUsed) {
    return {
      level: "USER_ASSUMPTION",
      label: "Kullanıcı varsayımı",
      userMessage: "Bu teklif için kullanıcı tarafından girilen maliyet varsayımı kullanıldı; kalıcı gider kaydı değildir.",
      demoAssumptionUsed: false,
      actualScoped: false,
      sourceClasses: [...new Set(classes)],
    };
  }
  if (hasActualScoped && hasDemoAssumption) {
    return {
      level: "MIXED_EVIDENCE",
      label: "Karışık kanıt",
      userMessage: "Bazı maliyetler aynı araç ve dönem verisinden, bazıları DEMO planlama varsayımından geliyor; DEMO kalemleri tamamlanmadan güvenilir teklif olarak kullanılmamalı.",
      demoAssumptionUsed: true,
      actualScoped: true,
      sourceClasses: [...new Set(classes)],
    };
  }
  if (hasActualScoped) {
    return {
      level: "ACTUAL_SCOPED",
      label: "Aynı kapsam gerçek verisi",
      userMessage: "Aynı araç ve dönem kapsamındaki doğrulanmış giderlerden türetilen planlama oranları kullanıldı; sonuç yine tahmini maliyettir, gerçekleşmiş gider değildir.",
      demoAssumptionUsed: false,
      actualScoped: true,
      sourceClasses: [...new Set(classes)],
    };
  }
  if (hasDemoAssumption) {
    return {
      level: "DEMO_ASSUMPTION",
      label: "DEMO varsayımı",
      userMessage: "DEMO planlama varsayımı kullanıldı; bu sonuç doğrudan işletme teklifi olarak kullanılmamalı.",
      demoAssumptionUsed: true,
      actualScoped: false,
      sourceClasses: [...new Set(classes)],
    };
  }
  if (hasCanonicalPlanning) {
    return {
      level: "CANONICAL_PLANNING",
      label: "Tarihli planlama oranı",
      userMessage: "Tarihli ve kapsamı bilinen canonical planlama oranları kullanıldı; sonuç gerçekleşmiş gider değildir.",
      demoAssumptionUsed: false,
      actualScoped: false,
      sourceClasses: [...new Set(classes)],
    };
  }
  return {
    level: "UNKNOWN",
    label: "Ekonomik kaynak belirsiz",
    userMessage: "Ekonomik kaynak sınıfı doğrulanamadı; bu sonuç kesin teklif önerisi olarak kullanılamaz.",
    demoAssumptionUsed: false,
    actualScoped: false,
    sourceClasses: [...new Set(classes)],
  };
}

function confidenceFor({ baseline, scenario, blockers, externalStatus, externalUsed, consumption, independentRouteQuoteAdvice }) {
  if (
    blockers.length
    || scenario.costMinor === null
    || (independentRouteQuoteAdvice !== true && baseline.costMinor === null)
  ) {
    return { level: "INSUFFICIENT", score: 0, reason: "Maliyet hesabı için güvenli ve karşılaştırılabilir veri yok" };
  }
  if (externalStatus === "EXPIRED" || externalStatus === "UNKNOWN" || externalStatus === "SOURCE_UNAVAILABLE") return { level: "LOW", score: 45, reason: "Piyasa referansı güncel veya kullanılabilir değil" };
  if (externalUsed && externalStatus === "STALE") return { level: "MEDIUM", score: 65, reason: "Karşılaştırma eski bir piyasa referansı içeriyor" };
  if (consumption?.baseline?.selected?.confidence === "LOW" || consumption?.scenario?.selected?.confidence === "LOW") {
    return { level: "LOW", score: 50, reason: "Tüketim referansı araç alt tipi veya görev çevrimi açısından sınırlı" };
  }
  if (independentRouteQuoteAdvice === true && scenario?.basis === "INTERNAL_DATA_PLANNING_ESTIMATE") {
    return { level: "MEDIUM", score: 70, reason: "Bağımsız rota hesabında açık planlama varsayımları kullanıldı; sonuç gerçekleşmiş maliyet değil" };
  }
  if (consumption?.baseline?.fuelTypeStatus === "UNRESOLVED" || consumption?.scenario?.fuelTypeStatus === "UNRESOLVED") {
    return { level: "MEDIUM", score: 60, reason: "Yakıt türü doğrulanmadı; dizel sınıf referansı açıkça işaretlendi" };
  }
  if (!baseline.complete || !scenario.complete) return { level: "MEDIUM", score: 70, reason: "Bazı maliyet bileşenleri planlanan maliyet tabanından geliyor" };
  return { level: "HIGH", score: 95, reason: "İç maliyet modeli aynı kapsamda deterministic olarak çalıştı" };
}

function deltaPercentBps(delta, baseline, issues) {
  if (delta === null || baseline === null || baseline === 0) return null;
  const numerator = toBigIntSafe(delta);
  const denominator = toBigIntSafe(baseline);
  if (numerator === null || denominator === null || denominator === 0n) {
    pushUnique(issues.blockers, "Maliyet yüzdesi güvenli biçimde hesaplanamadı");
    return null;
  }
  return divideBigIntRound(numerator * 10000n, denominator, "deltaPercentBps", issues);
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function addSafeMoney(left, right) {
  const a = integerOrNull(left);
  const b = integerOrNull(right);
  if (a === null || b === null) return null;
  const result = BigInt(a) + BigInt(b);
  return result <= BigInt(Number.MAX_SAFE_INTEGER) && result >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(result) : null;
}

function multiplySafeMoney(value, multiplier) {
  const amount = integerOrNull(value);
  const factor = integerOrNull(multiplier);
  if (amount === null || factor === null || factor < 0) return null;
  const result = BigInt(amount) * BigInt(factor);
  return result <= BigInt(Number.MAX_SAFE_INTEGER) && result >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(result) : null;
}

function normalizeScenarioMeta(input = {}) {
  const cleanOverrides = { ...(isObject(input) ? input : {}) };
  const scenarioType = compact(cleanOverrides.scenarioType).toUpperCase() || null;
  const routeAlternative = isObject(cleanOverrides.routeAlternative) ? { ...cleanOverrides.routeAlternative } : null;
  const dispatchAlternative = isObject(cleanOverrides.dispatchAlternative) ? { ...cleanOverrides.dispatchAlternative } : null;
  const stopOperations = Array.isArray(cleanOverrides.scenarioStopOperations)
    ? cleanOverrides.scenarioStopOperations.slice(0, 24).filter(isObject).map((item) => ({ ...item }))
    : Array.isArray(cleanOverrides.stopOperations)
      ? cleanOverrides.stopOperations.slice(0, 24).filter(isObject).map((item) => ({ ...item }))
      : [];
  const bestCandidate = isObject(cleanOverrides.bestCandidate) ? { ...cleanOverrides.bestCandidate } : null;
  const routePassageRequests = Array.isArray(cleanOverrides.routePassageRequests)
    ? cleanOverrides.routePassageRequests.slice(0, 24).filter(isObject).map((item) => ({ ...item }))
    : null;
  const riskAssumptions = isObject(cleanOverrides.riskAssumptions) ? { ...cleanOverrides.riskAssumptions } : {};
  for (const field of [
    "scenarioType",
    "routeAlternative",
    "dispatchAlternative",
    "scenarioStopOperations",
    "stopOperations",
    "bestCandidate",
    "riskAssumptions",
    "routePassageRequests",
    "riskVehicleCount",
    "riskPassengerCount",
    "riskFuelUnitPriceMinor",
    "riskDistanceKm",
    "riskDurationMinutes",
  ]) delete cleanOverrides[field];
  for (const field of ["riskVehicleCount", "riskPassengerCount", "riskFuelUnitPriceMinor", "riskDistanceKm", "riskDurationMinutes"]) {
    if (input?.[field] !== undefined) riskAssumptions[field] = input[field];
  }
  return { cleanOverrides, scenarioType, routeAlternative, dispatchAlternative, stopOperations, bestCandidate, riskAssumptions, routePassageRequests };
}

function hasAnyCostValue(values, fields) {
  return fields.some((field) => values?.[field] !== null && values?.[field] !== undefined && values?.[field] !== "");
}

export function materializeVehiclePlanningInputs(rawEvidence, requiredVehicleCount) {
  const components = rawEvidence?.planningComponents;
  if (!isObject(components)) return { input: {}, evidence: {}, componentKeys: [] };
  const count = Math.max(1, integerOrNull(requiredVehicleCount) || 1);
  const input = {};
  const evidence = {};
  for (const [componentKey, component] of Object.entries(components)) {
    if (!isObject(component?.input) || !isObject(component?.evidence)) continue;
    for (const [field, value] of Object.entries(component.input)) {
      if (field === "driverBasePerShiftMinor") input[field] = Number(value) * count;
      else input[field] = value;
    }
    evidence[componentKey] = { ...component.evidence, candidateVehicleCount: count };
  }
  return { input, evidence, componentKeys: Object.keys(evidence) };
}

function applyUserPlanningAssumptions(planningInput = {}, scenarioOverrides = {}) {
  const output = { ...(isObject(planningInput) ? planningInput : {}) };
  for (const field of USER_PLANNING_ASSUMPTION_FIELDS) {
    if (scenarioOverrides?.[field] !== null && scenarioOverrides?.[field] !== undefined) {
      output[field] = scenarioOverrides[field];
    }
  }
  return output;
}

function deriveScenarioPlanningInputs({ scenarioValues, context, scenarioOverrides = {} }) {
  const explicitPlanning = context?.scenarioPlanningInput;
  if (isObject(explicitPlanning?.input) && Object.keys(explicitPlanning.input).length > 0) {
    const input = applyUserPlanningAssumptions(explicitPlanning.input, scenarioOverrides);
    return {
      requiredVehicleCount: Math.max(1, integerOrNull(explicitPlanning.requiredVehicleCount) || integerOrNull(scenarioValues?.vehicleCount) || 1),
      input,
      evidence: { ...(explicitPlanning.evidence || {}) },
      componentKeys: Array.isArray(explicitPlanning.componentKeys) ? explicitPlanning.componentKeys : Object.keys(explicitPlanning.evidence || {}),
      source: explicitPlanning.source || "INTERNAL_DATA_PLANNING_ESTIMATE",
      explanation: explicitPlanning.explanation || "Canonical planlama bileşenleri senaryo araç sayısına göre ölçeklendi.",
      economicReliability: explicitPlanning.economicReliability
        || classifyPlanningEconomicReliability({
          planningEvidence: explicitPlanning.evidence || {},
          dataClass: explicitPlanning.dataClass,
          userAssumptionUsed: explicitPlanning.userAssumptionUsed === true,
        }),
      userAssumptionUsed: explicitPlanning.userAssumptionUsed === true,
      consumptionPlanningValue: numberOrNull(input?.fuelConsumptionLitersPer100Km),
      consumptionPlanningReference: explicitPlanning.consumptionPlanningReference || null,
    };
  }
  const vehicleType = compact(scenarioValues?.vehicleType).toUpperCase();
  const passengerCount = integerOrNull(scenarioValues?.passengerCount);
  const vehicleCapacity = integerOrNull(scenarioValues?.vehicleCapacity);
  const currentVehicleCount = Math.max(1, integerOrNull(scenarioValues?.vehicleCount) || 1);
  if (!vehicleType || passengerCount === null || passengerCount < 0 || !vehicleCapacity || vehicleCapacity < 1) return null;

  const requiredVehicleCount = Math.max(1, Math.ceil(passengerCount / vehicleCapacity));
  if (requiredVehicleCount <= currentVehicleCount) return null;

  const rawEvidence = context?.vehicleCostInputsByType?.[vehicleType];
  const materialized = materializeVehiclePlanningInputs(rawEvidence, requiredVehicleCount);
  if (!materialized.componentKeys.length) return null;
  const planningConsumption = numberOrNull(rawEvidence?.input?.fuelConsumptionLitersPer100Km);

  return {
    requiredVehicleCount,
    input: {
      ...materialized.input,
      ...(planningConsumption !== null ? { fuelConsumptionLitersPer100Km: planningConsumption } : {}),
    },
    evidence: materialized.evidence,
    componentKeys: materialized.componentKeys,
    source: "INTERNAL_DATA_PLANNING_ESTIMATE",
    explanation: `Kapasite ${passengerCount} kişi için ${requiredVehicleCount} araç gerektirdi; tek araçlık gerçekleşen kayıt yerine araç başına türetilmiş canonical planlama girdileri kullanıldı.`,
    economicReliability: classifyPlanningEconomicReliability({
      planningEvidence: materialized.evidence,
      dataClass: rawEvidence?.dataClass,
    }),
    userAssumptionUsed: false,
    consumptionPlanningValue: planningConsumption,
    consumptionPlanningReference: planningConsumption !== null ? {
      sourceName: rawEvidence?.sourceLabel || "Kanonik araç planlama varsayımı",
      sourceDate: rawEvidence?.evidence?.sourceDate || null,
      version: rawEvidence?.source || null,
      confidence: "MEDIUM",
      applicabilityLimits: "Teklif tabanındaki açık tüketim varsayımıdır; actual araç tüketimi değildir.",
    } : null,
  };
}

function buildOptionalCostCoverage(values) {
  const ledgerInputs = Array.isArray(values?.roomCostLedgerInputs) ? values.roomCostLedgerInputs : [];
  const hasLedgerCost = ({ componentKeys = [], categoryKeys = [] } = {}) => ledgerInputs.some((entry) => {
    const amountMinor = Number(entry?.amountMinor);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return false;
    const componentKey = compact(entry?.componentKey).toLowerCase();
    const categoryKey = compact(entry?.categoryKey).toUpperCase();
    return componentKeys.includes(componentKey) || categoryKeys.includes(categoryKey);
  });
  const hasDriverLedgerCost = hasLedgerCost({
    componentKeys: ["driver_labor"],
    categoryKeys: ["EMPLOYER_MONTHLY_COST", "BASE_SALARY", "BENEFIT", "OVERTIME", "PER_DIEM", "MEAL_ALLOWANCE", "SOCIAL_COST", "OTHER_DRIVER"],
  });
  const hasMaintenanceLedgerCost = hasLedgerCost({
    componentKeys: ["vehicle_variable"],
    categoryKeys: ["MAINTENANCE", "REPAIR", "TIRE_RIM", "CLEANING", "ROADSIDE_ASSISTANCE"],
  });
  const hasFixedLedgerCost = hasLedgerCost({
    componentKeys: ["vehicle_fixed_allocated"],
    categoryKeys: ["RENT", "LEASE", "DEPRECIATION", "TRAFFIC_INSURANCE", "CASCO", "MTV_TAX", "TAX"],
  });
  const hasRouteFeeLedgerCost = hasLedgerCost({
    componentKeys: ["route_fees"],
    categoryKeys: ["HGS_TOLL", "BRIDGE", "HIGHWAY", "PARKING", "TERMINAL", "ROUTE_FEE", "OTHER_ROUTE_FEE"],
  });
  const hasAdBlueLedgerCost = hasLedgerCost({
    componentKeys: ["fuel"],
    categoryKeys: ["ADBLUE"],
  });
  const missingOptionalCosts = [];
  if (!hasAnyCostValue(values, DRIVER_COST_FIELDS) && !hasDriverLedgerCost) missingOptionalCosts.push({ key: "driver", label: "Sürücü maliyeti" });
  if (!hasAnyCostValue(values, MAINTENANCE_COST_FIELDS) && !hasMaintenanceLedgerCost) missingOptionalCosts.push({ key: "maintenance", label: "Bakım maliyeti" });
  if (values?.requireFullOperatingCostEvidence === true) {
    if (!hasAnyCostValue(values, ["vehicleLeaseMonthlyMinor", "vehicleDepreciationMonthlyMinor", "insuranceMonthlyMinor", "taxAndLicenseMonthlyMinor", "fixedVehicleCostMonthlyMinor", "explicitVehicleFixedCostAllocatedMinor"]) && !hasFixedLedgerCost) {
      missingOptionalCosts.push({ key: "vehicle_fixed", label: "Araç sabit giderleri" });
    }
    if (!hasAnyCostValue(values, ["tollMinor", "bridgeMinor", "highwayMinor", "parkingMinor", "terminalMinor", "routeFeeMinor", "otherDirectRouteFeeMinor"]) && !hasRouteFeeLedgerCost) {
      missingOptionalCosts.push({ key: "route_fees", label: "Geçiş ve rota ücretleri" });
    }
    if (!hasAdBlueLedgerCost) {
      missingOptionalCosts.push({ key: "adblue", label: "AdBlue ve yardımcı tüketim giderleri" });
    }
  }
  const hasDriverCost = !missingOptionalCosts.some((item) => item.key === "driver");
  const hasMaintenanceCost = !missingOptionalCosts.some((item) => item.key === "maintenance");
  const status = missingOptionalCosts.length ? "PARTIAL" : "COMPLETE";
  const partialExplanation = missingOptionalCosts.length === 0
    ? "Sürücü, bakım, sabit gider, yardımcı tüketim ve geçiş/rota ücretleri mevcut referanslarla hesaplamaya dahil edildi."
    : `Bu karşılaştırma şu kanıtlar tamamlanmadan hesaplandı: ${missingOptionalCosts.map((item) => item.label.toLocaleLowerCase("tr-TR")).join(", ")}.`;
  return {
    status,
    hasDriverCost,
    hasMaintenanceCost,
    missingOptionalCosts,
    partialExplanation,
  };
}

function buildCostQualityNotes({ baseline, scenario, costCoverage, componentCoverage }) {
  const notes = costCoverage?.scenario?.missingOptionalCosts?.map((item) => `${item.label} dahil edilmeden hesaplandı.`) || [];
  const models = [baseline?.model, scenario?.model].filter(Boolean);
  if (componentCoverage?.missingInScenarioLabels?.length) {
    notes.push(`${componentCoverage.missingInScenarioLabels.join(", ")} için alternatif senaryoda karşılaştırılabilir kanıt yok; tasarruf farkı hesaplanmadı.`);
  }
  if (componentCoverage?.missingInBaselineLabels?.length) {
    notes.push(`${componentCoverage.missingInBaselineLabels.join(", ")} için mevcut planda karşılaştırılabilir kanıt yok; fark güvenli biçimde hesaplanmadı.`);
  }
  if (models.some((model) => model.netRollupBlocked)) {
    notes.push("KDV durumu belirsiz gerçek giderler nedeniyle doğrulanmış net toplam ve net kâr gösterilmez; brüt maliyet ayrı tutulur.");
  }
  if (models.some((model) => model.status !== "complete") && !models.some((model) => model.netRollupBlocked)) {
    notes.push("Bazı operasyon ölçümleri veya maliyet uyarıları bulunduğu için sonuç kısmi güvenle gösterilir.");
  }
  return [...new Set(notes)];
}

function confidenceWithOptionalCoverage(confidence, coverage) {
  if (coverage?.status !== "PARTIAL" || !confidence || confidence.level === "INSUFFICIENT") return confidence;
  const missingLabels = Array.isArray(coverage?.missingOptionalCosts)
    ? coverage.missingOptionalCosts
      .map((item) => String(item?.label || "").trim())
      .filter(Boolean)
    : [];
  const missingText = missingLabels.length
    ? `Eksik kanıtlar: ${missingLabels.join(", ")}.`
    : "Bazı maliyet kanıtları eksik.";
  return {
    ...confidence,
    level: confidence.level === "HIGH" ? "MEDIUM" : confidence.level,
    score: Math.min(Number(confidence.score || 0), 70),
    reason: `Planlama maliyeti kısmi güvenle gösteriliyor. ${missingText}`,
  };
}

function vehicleFuelRequirementLiters({ distanceKm, consumptionLitersPer100Km, vehicleCount }) {
  const distance = numberOrNull(distanceKm);
  const consumption = numberOrNull(consumptionLitersPer100Km);
  const count = integerOrNull(vehicleCount);
  if (distance === null || consumption === null || count === null || count < 1) return null;
  const liters = (distance * consumption * count) / 100;
  return Number.isFinite(liters) ? Number(liters.toFixed(2)) : null;
}

function buildVehiclePlanAlternatives({ baselineInput, scenarioOverrides, context, externalReference, now }) {
  const baselineValues = { ...(isObject(baselineInput) ? baselineInput : {}) };
  const scenarioValues = { ...baselineValues, ...(isObject(scenarioOverrides) ? scenarioOverrides : {}) };
  const passengerCount = numberOrNull(scenarioValues.passengerCount);
  const baselineVehicleType = compact(baselineValues.vehicleType).toUpperCase() || null;
  const actualCapacity = numberOrNull(scenarioValues.vehicleCapacity);
  if (passengerCount === null || passengerCount < 0) {
    return {
      referenceVersion: VEHICLE_PLAN_REFERENCE_VERSION,
      unit: VEHICLE_PLAN_REFERENCE_UNIT,
      status: "NO_DATA",
      passengerCount: null,
      alternatives: [],
      items: [],
      recommendation: null,
      factors: [],
      reason: "Araç planı için kişi sayısı bulunamadı; değer uydurulmadı.",
    };
  }

  const items = VEHICLE_PLAN_CLASSES.map((vehicleType) => {
    const baselineCandidate = vehicleType === baselineVehicleType;
    const rawCandidateEvidence = context?.vehicleCostInputsByType?.[vehicleType];
    const sharedPlanningEvidenceInput = Object.fromEntries(Object.entries(isObject(scenarioOverrides) ? scenarioOverrides : {})
      .filter(([field]) => ALTERNATIVE_COST_EVIDENCE_FIELDS.includes(field)));
    const candidateEvidenceInput = isObject(rawCandidateEvidence?.input)
      ? rawCandidateEvidence.input
      : isObject(rawCandidateEvidence) ? rawCandidateEvidence : sharedPlanningEvidenceInput;
    const candidateActualInputs = Array.isArray(rawCandidateEvidence?.actualInputs)
      ? rawCandidateEvidence.actualInputs
      : [];
    const candidateEvidenceProvided = baselineCandidate
      || candidateActualInputs.length > 0
      || hasAnyCostValue(candidateEvidenceInput, ALTERNATIVE_COST_EVIDENCE_FIELDS);
    const canonicalCapacity = context?.vehicleCapacitiesByClass?.[vehicleType];
    const capacityResolution = resolveVehicleCapacityReference({
      vehicleType,
      actualCapacity: vehicleType === baselineVehicleType ? actualCapacity : null,
      canonicalCapacity,
      planningCapacity: vehicleType === baselineVehicleType ? null : numberOrNull(candidateEvidenceInput?.vehicleCapacity),
      planningReference: vehicleType === baselineVehicleType ? null : {
        sourceName: rawCandidateEvidence?.sourceLabel || "Kanonik araç planlama varsayımı",
        version: rawCandidateEvidence?.source || null,
      },
    });
    const selectedCapacity = capacityResolution.selected?.capacity ?? null;
    if (selectedCapacity === null) {
      return {
        vehicleType,
        vehicleLabel: VEHICLE_PLAN_LABELS[vehicleType],
        passengerCount,
        status: "NO_DATA",
        capacity: null,
        requiredVehicleCount: null,
        driverCount: null,
        capacityResolution,
        missingData: ["Onaylı araç kapasitesi"],
        missingOptionalCosts: [],
        recommendationEligible: false,
      };
    }

    const requiredVehicleCount = Math.max(1, Math.ceil(passengerCount / selectedCapacity));
    const availability = rawCandidateEvidence?.availability || null;
    const roomFleetAvailability = String(availability?.availabilityScope || "").toUpperCase() === "ROOM_FLEET"
      && (Number.isSafeInteger(Number(availability?.availableVehicleCount))
        || Number.isSafeInteger(Number(availability?.availableDriverCount)));
    const availabilityMissingData = roomFleetAvailability
      ? [
        ...(Number.isSafeInteger(Number(availability?.availableVehicleCount)) && Number(availability.availableVehicleCount) < requiredVehicleCount
          ? ["Yeterli aktif ROOM aracı"] : []),
        ...(Number.isSafeInteger(Number(availability?.availableDriverCount)) && Number(availability.availableDriverCount) < requiredVehicleCount
          ? ["Yeterli eşzamanlı ROOM sürücüsü"] : []),
      ]
      : [];
    const fleetAvailabilityReady = availabilityMissingData.length === 0;
    const partitionEvidenceRequested = context?.routeEvidence?.vehiclePartitionEvidenceRequested === true;
    const routePartition = requiredVehicleCount > 1
      ? context?.routeEvidence?.vehiclePartitionsByCount?.[String(requiredVehicleCount)] || null
      : null;
    const vehiclePassageEvidence = requiredVehicleCount > 1
      ? context?.routeEvidence?.vehiclePassageEvidenceByCount?.[String(requiredVehicleCount)] || null
      : null;
    const vehiclePassageRequested = vehiclePassageEvidence !== null;
    const vehiclePassageReady = !vehiclePassageRequested || vehiclePassageEvidence.status === "PROVEN";
    const passengerAllocationRequested = context?.routeEvidence?.passengerAllocationEvidenceRequested === true;
    const passengerAllocationReady = !passengerAllocationRequested || (
      routePartition?.passengerAllocationEvidenceRequested === true
      && Number(routePartition?.passengerCount) === passengerCount
      && Array.isArray(routePartition?.routes)
      && routePartition.routes.length === requiredVehicleCount
      && routePartition.routes.every((route) => Number.isSafeInteger(Number(route?.passengerCount)) && Number(route.passengerCount) >= 0)
    );
    const routePartitionReady = requiredVehicleCount <= 1
      || !partitionEvidenceRequested
      || (routePartition?.status === "READY" && vehiclePassageReady && passengerAllocationReady);
    const partitionedRoute = requiredVehicleCount > 1 && routePartitionReady && routePartition?.status === "READY";
    const periodMovementCount = Math.max(1, integerOrNull(context?.periodPlanning?.plannedMovementCount) || 1);
    const routePartitionOverrides = partitionedRoute
      ? {
        serviceDistanceKm: Number((Number(routePartition.totalDistanceKm) * periodMovementCount).toFixed(4)),
        totalDistanceKm: Number((Number(routePartition.totalDistanceKm) * periodMovementCount).toFixed(4)),
        routeDurationMinutes: Number((Number(routePartition.durationMinutes) * periodMovementCount).toFixed(4)),
      }
      : {};
    const baselineInputDistanceKm = numberOrNull(baselineValues.totalDistanceKm ?? baselineValues.serviceDistanceKm);
    const baselineInputDurationMinutes = numberOrNull(baselineValues.routeDurationMinutes);
    const baselineEvidenceDistanceKm = numberOrNull(context?.routeEvidence?.baseline?.distanceKm);
    const baselineEvidenceDurationMinutes = numberOrNull(context?.routeEvidence?.baseline?.durationMinutes);
    // Route evidence is the canonical source for the candidate's period
    // scope. The route endpoint scales this evidence once by the planned
    // movement count before it reaches the alternatives builder. Prefer it
    // over the one-movement baseline input so fuel and distance-based costs
    // do not stay daily while driver labor is period-scaled.
    const singleVehicleDistanceKm = baselineEvidenceDistanceKm !== null
      ? baselineEvidenceDistanceKm
      : baselineInputDistanceKm !== null
        ? baselineInputDistanceKm * periodMovementCount
        : null;
    const singleVehicleDurationMinutes = baselineEvidenceDurationMinutes !== null
      ? baselineEvidenceDurationMinutes
      : baselineInputDurationMinutes !== null
        ? baselineInputDurationMinutes * periodMovementCount
        : null;
    const singleVehicleRouteOverrides = !partitionedRoute && singleVehicleDistanceKm !== null
      ? {
        serviceDistanceKm: Number(singleVehicleDistanceKm.toFixed(4)),
        totalDistanceKm: Number(singleVehicleDistanceKm.toFixed(4)),
        ...(singleVehicleDurationMinutes !== null
          ? { routeDurationMinutes: Number(singleVehicleDurationMinutes.toFixed(4)) }
          : {}),
      }
      : {};
    const candidateRouteOverrides = partitionedRoute ? routePartitionOverrides : singleVehicleRouteOverrides;
    // A selected multi-vehicle scenario may expose its partitioned route as
    // routeEvidence.scenario. That route belongs only to the selected plan;
    // a single-vehicle candidate must fall back to the canonical baseline
    // route instead of inheriting another candidate's distance.
    const candidateRouteEvidence = !partitionedRoute && context?.routeEvidence?.baseline
      ? { ...context.routeEvidence, scenario: context.routeEvidence.baseline }
      : context?.routeEvidence;
    const routePassageOverrides = partitionedRoute && vehiclePassageEvidence?.status === "PROVEN"
      && Number.isSafeInteger(vehiclePassageEvidence.totalMinor)
      ? { routeFeeMinor: vehiclePassageEvidence.totalMinor * periodMovementCount }
      : {};
    const routeFeesAlreadyAggregated = Object.keys(routePassageOverrides).length > 0;
    const baselineVehicleCount = Math.max(1, integerOrNull(baselineValues.vehicleCount) || 1);
    const baselineNeedsPlanningScale = baselineCandidate && requiredVehicleCount > baselineVehicleCount;
    const materializedPlanning = materializeVehiclePlanningInputs(rawCandidateEvidence, requiredVehicleCount);
    const effectiveCandidateEvidenceInput = {
      ...candidateEvidenceInput,
      ...materializedPlanning.input,
    };
    const candidateOverrides = {
      ...(isObject(scenarioOverrides) ? scenarioOverrides : {}),
      ...(baselineCandidate && !baselineNeedsPlanningScale ? {} : effectiveCandidateEvidenceInput),
      ...candidateRouteOverrides,
      ...routePassageOverrides,
      vehicleType,
      vehicleCount: requiredVehicleCount,
      vehicleCapacity: selectedCapacity,
      passengerCount,
    };
    const candidateContext = {
      ...context,
      ...(candidateRouteEvidence ? { routeEvidence: candidateRouteEvidence } : {}),
      actualCostInputs: baselineCandidate ? context?.actualCostInputs : candidateActualInputs,
      ...(baselineNeedsPlanningScale ? {
        scenarioPlanningInput: {
          ...materializedPlanning,
          requiredVehicleCount,
          source: "INTERNAL_DATA_PLANNING_ESTIMATE",
          explanation: "Seçili planın tek araçlık gerçekleşen ledger'ı tekrarlanmadı; araç başına canonical planlama bileşenleri iki araçlık senaryoya ölçeklendi.",
        },
        driverBaseAlreadyAggregated: materializedPlanning.componentKeys.includes("driver_labor"),
      } : {}),
      ...(partitionedRoute ? { routeDistanceAlreadyAggregated: true } : {}),
      ...(routeFeesAlreadyAggregated ? { routeFeesAlreadyAggregated: true } : {}),
      ...(((baselineCandidate && !baselineNeedsPlanningScale) || !candidateEvidenceInput?.fuelConsumptionLitersPer100Km) ? {} : {
        scenarioVehicleConsumptionPlanningValue: candidateEvidenceInput.fuelConsumptionLitersPer100Km,
        scenarioVehicleConsumptionPlanningReference: {
          sourceName: rawCandidateEvidence?.sourceLabel || "Kanonik araç planlama varsayımı",
          sourceDate: rawCandidateEvidence?.evidence?.sourceDate || null,
          version: rawCandidateEvidence?.source || null,
          confidence: "MEDIUM",
          applicabilityLimits: "Teklif tabanındaki açık tüketim varsayımıdır; actual araç tüketimi değildir.",
        },
      }),
    };
    const candidatePreview = buildCostScenarioPreview({
      baselineInput,
      scenarioOverrides: candidateOverrides,
      context: candidateContext,
      externalReference,
      now,
      includeVariants: false,
      includeVehicleAlternatives: false,
    });
    const planningCandidateOverrides = {
      ...(isObject(scenarioOverrides) ? scenarioOverrides : {}),
      ...effectiveCandidateEvidenceInput,
      ...candidateRouteOverrides,
      ...routePassageOverrides,
      vehicleType,
      vehicleCount: requiredVehicleCount,
      vehicleCapacity: selectedCapacity,
      passengerCount,
    };
    const planningCandidatePreview = (materializedPlanning.componentKeys.length || hasAnyCostValue(candidateEvidenceInput, ALTERNATIVE_COST_EVIDENCE_FIELDS))
      ? buildCostScenarioPreview({
        baselineInput,
        scenarioOverrides: planningCandidateOverrides,
        context: {
          ...context,
          ...(candidateRouteEvidence ? { routeEvidence: candidateRouteEvidence } : {}),
          actualCostInputs: [],
          actualEvidence: null,
          forecastEvidence: {},
          forecastCostInputs: context?.forecastCostInputs || [],
          plannedInput: {},
          baselineDataClass: "INTERNAL_PLANNED",
          vehicleCostInputsByType: {},
          driverBaseAlreadyAggregated: materializedPlanning.componentKeys.includes("driver_labor"),
          ...(partitionedRoute ? { routeDistanceAlreadyAggregated: true } : {}),
          ...(routeFeesAlreadyAggregated ? { routeFeesAlreadyAggregated: true } : {}),
        },
        externalReference,
        now,
        includeVariants: false,
        includeVehicleAlternatives: false,
      })
      : null;
    const candidateValues = {
      ...baselineValues,
      ...candidateOverrides,
      ...(candidateActualInputs.length > 0 || (baselineCandidate && !baselineNeedsPlanningScale && Array.isArray(context?.actualCostInputs) && context.actualCostInputs.length > 0)
        ? { roomCostLedgerInputs: baselineCandidate ? context.actualCostInputs : candidateActualInputs }
        : {}),
    };
    const requireFullOperatingCostEvidence = context?.requireFullOperatingCostEvidence === true
      || (String(context?.scope || "").toUpperCase() === "ROOM"
        && context?.periodPlanning?.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION");
    const costCoverage = buildOptionalCostCoverage({
      ...candidateValues,
      ...materializedPlanning.input,
      requireFullOperatingCostEvidence,
    });
    const planningValues = {
      ...baselineValues,
      ...planningCandidateOverrides,
      vehicleCount: requiredVehicleCount,
      vehicleCapacity: selectedCapacity,
      requireFullOperatingCostEvidence,
    };
    const planningCostCoverage = buildOptionalCostCoverage(planningValues);
    const actualCostMinor = baselineCandidate && !baselineNeedsPlanningScale
      ? candidatePreview.baseline?.costMinor ?? null
      : null;
    const planningCostMinor = !fleetAvailabilityReady && roomFleetAvailability
      ? null
      : routePartitionReady ? planningCandidatePreview?.scenario?.costMinor ?? null : null;
    const candidateScenarioCostMinor = !fleetAvailabilityReady && roomFleetAvailability
      ? null
      : routePartitionReady ? candidatePreview.scenario?.costMinor ?? null : null;
    const comparisonCostMinor = !fleetAvailabilityReady && roomFleetAvailability
      ? null
      : planningCostMinor ?? (baselineCandidate ? actualCostMinor : candidateScenarioCostMinor);
    const selectedConsumption = candidatePreview.referenceResolution?.vehicleConsumption?.scenario?.selected || null;
    const distanceKm = routePartitionReady
      ? candidatePreview.dimensions?.totalDistanceKm?.scenario ?? candidateValues.totalDistanceKm ?? candidateValues.serviceDistanceKm ?? null
      : null;
    const fuelRequirementLiters = vehicleFuelRequirementLiters({
      distanceKm,
      consumptionLitersPer100Km: selectedConsumption?.valueLitersPer100Km,
      vehicleCount: partitionedRoute ? 1 : requiredVehicleCount,
    });
    const hasCost = candidateEvidenceProvided
      && candidateScenarioCostMinor !== null
      && candidateScenarioCostMinor !== undefined
      && candidatePreview.status !== "BLOCKED";
    const hasComparablePlanningCost = planningCostMinor !== null
      && planningCandidatePreview?.status !== "BLOCKED"
      && planningCostCoverage.status === "COMPLETE";
    const missingData = [...new Set([
      ...(candidatePreview.missingData || []),
      ...(!routePartitionReady ? ["Araç bazında rota dağılımı"] : []),
      ...(!passengerAllocationReady ? ["Araç bazında yolcu dağılımı"] : []),
      ...(!vehiclePassageReady ? ["Araç bazında doğrulanmış geçiş ücreti"] : []),
      ...(!candidateEvidenceProvided && !baselineCandidate ? ["Alternatif araç maliyet kanıtı"] : []),
      ...(selectedConsumption?.available ? [] : ["Onaylı tüketim referansı"]),
      ...(fuelRequirementLiters === null ? ["Yakıt ihtiyacı için rota/tüketim"] : []),
      ...availabilityMissingData,
    ])].filter((item) => !/mevcut plan kanıtı eksik/i.test(String(item)));
    const componentEvidence = { ...materializedPlanning.evidence };
    if (!baselineCandidate && candidateEvidenceInput?.fuelConsumptionLitersPer100Km !== null && candidateEvidenceInput?.fuelConsumptionLitersPer100Km !== undefined) {
      componentEvidence.fuel = {
        dataClass: rawCandidateEvidence?.evidence?.dataClass || "DEMO_PLANNING_ASSUMPTION",
        actual: false,
        formula: "totalDistanceKm × fuelConsumptionLitersPer100Km / 100 × fuelUnitPriceMinor",
        sourceRefs: [rawCandidateEvidence?.source || "ROOM_QUOTE_FLOOR_DRAFT_PLANNING_ASSUMPTION"],
        sourceLabel: rawCandidateEvidence?.sourceLabel || "Kanonik araç planlama varsayımı",
      };
    }
    return {
      vehicleType,
      vehicleLabel: VEHICLE_PLAN_LABELS[vehicleType],
      passengerCount,
      status: !fleetAvailabilityReady && roomFleetAvailability
        ? "BLOCKED"
        : hasComparablePlanningCost
        ? "READY"
        : hasCost ? (costCoverage.status === "PARTIAL" ? "PARTIAL" : "READY") : candidatePreview.status,
      capacity: selectedCapacity,
      capacityRange: capacityResolution.selected?.range || null,
      capacityUnit: VEHICLE_PLAN_REFERENCE_UNIT,
      capacityResolution,
      requiredVehicleCount,
      driverCount: requiredVehicleCount,
      driverCountBasis: "ONE_DRIVER_PER_SIMULTANEOUS_VEHICLE",
      fuelConsumptionLitersPer100Km: selectedConsumption?.valueLitersPer100Km ?? null,
      fuelConsumptionReference: selectedConsumption,
      fuelPriceReference: candidatePreview.referenceResolution?.fuelPrice?.scenario || null,
      fuelRequirementLiters,
      routeDistanceKm: distanceKm,
      routeDistanceBasis: partitionedRoute ? "PARTITIONED_ROUTES" : "SINGLE_ROUTE_OR_BASELINE",
      routePartition,
      periodMovementCount,
      passageEvidence: vehiclePassageEvidence,
      routeEvidenceSource: partitionedRoute ? routePartition.source : context?.routeEvidence?.baseline?.source || null,
      routeDurationMinutes: routePartitionReady
        ? candidatePreview.dimensions?.routeDurationMinutes?.scenario ?? candidateValues.routeDurationMinutes ?? null
        : null,
      costMinor: baselineCandidate && !baselineNeedsPlanningScale
        ? actualCostMinor
        : candidateScenarioCostMinor,
      costBasis: candidatePreview.scenario?.costBasis || null,
      componentBreakdown: candidatePreview.scenario?.componentBreakdown || [],
      actualCostMinor,
      actualCostBasis: actualCostMinor !== null ? "INTERNAL_ACTUAL" : null,
      planningCostMinor,
      planningCostBasis: planningCostMinor !== null ? "INTERNAL_DATA_PLANNING_ESTIMATE" : null,
      planningCostEvidenceSource: planningCostMinor !== null ? "INTERNAL_DATA_PLANNING_ESTIMATE" : null,
      planningCostEvidenceLabel: planningCostMinor !== null ? "İç veriye dayalı eşdeğer planlama tahmini" : null,
      planningComponentBreakdown: planningCandidatePreview?.scenario?.componentBreakdown || [],
      comparisonCostMinor,
      comparisonCostBasis: comparisonCostMinor !== null
        ? (planningCostMinor !== null ? "INTERNAL_DATA_PLANNING_ESTIMATE" : candidatePreview.scenario?.costBasis || null)
        : null,
      currencyCode: candidatePreview.currencyCode || compact(candidateValues.currencyCode, "TRY").toUpperCase(),
      confidence: candidatePreview.confidence || { level: "INSUFFICIENT", score: 0 },
      risk: candidatePreview.operationalRisk || null,
      costCoverage,
      planningCostCoverage,
      missingOptionalCosts: costCoverage.missingOptionalCosts,
      costEvidenceSource: baselineCandidate && !baselineNeedsPlanningScale ? "MEVCUT_PLAN_KANITI" : candidateActualInputs.length > 0 ? "ADAY_ARAC_KANITI" : materializedPlanning.componentKeys.length > 0 ? "INTERNAL_DATA_PLANNING_ESTIMATE" : candidateEvidenceProvided ? "PLANLAMA_VARSAYIMI" : null,
      costEvidenceLabel: baselineCandidate && !baselineNeedsPlanningScale ? "Mevcut plan kanıtı" : candidateActualInputs.length > 0 ? "Kanonik aday araç kanıtı" : materializedPlanning.componentKeys.length > 0 ? "İç veriye dayalı planlama tahmini" : candidateEvidenceProvided ? "Planlama varsayımı" : null,
      availability: availability
        ? {
          ...availability,
          availableForPlan: fleetAvailabilityReady,
          requiredVehicleCount,
          requiredDriverCount: requiredVehicleCount,
          ...(availabilityMissingData.length ? { reason: availabilityMissingData.join("; ") } : {}),
        }
        : null,
      componentEvidence,
      planningProfile: rawCandidateEvidence?.planningProfile || null,
      partialExplanation: costCoverage.partialExplanation,
      missingData,
      recommendationEligible: fleetAvailabilityReady
        && hasComparablePlanningCost
        && !missingData.includes("Onaylı araç kapasitesi")
        && !missingData.includes("Alternatif araç maliyet kanıtı")
        && routePartitionReady,
      previewSafety: candidatePreview.safety,
    };
  });

  const eligible = items
    .filter((item) => item.recommendationEligible && item.planningCostCoverage?.status === "COMPLETE")
    .sort((left, right) => {
      const costDifference = Number(left.comparisonCostMinor) - Number(right.comparisonCostMinor);
      if (costDifference !== 0) return costDifference;
      return Number(left.requiredVehicleCount) - Number(right.requiredVehicleCount);
    });
  const recommended = eligible.length >= 2 ? eligible[0] : null;
  const recommendationUsesPlanningAssumptions = eligible.some((item) => item.planningCostMinor !== null);
  const recommendation = recommended
    ? {
      vehicleType: recommended.vehicleType,
      vehicleLabel: recommended.vehicleLabel,
      label: recommendationUsesPlanningAssumptions
        ? "Planlama için önerilen"
        : recommended.costCoverage.status === "PARTIAL" ? "Operasyonel olarak önerilen" : "Önerilen",
      reason: recommended.costCoverage.status === "PARTIAL"
        ? `${recommended.vehicleLabel} planı kapasiteyi güvenli biçimde karşılıyor ve mevcut rota/yakıt kanıtıyla hesaplanabilir maliyetler içinde en düşük sinyali veriyor. Sürücü ve bakım maliyeti eksik olduğu için bu tam maliyet açısından en iyi seçenek olarak sunulmaz.`
        : recommendationUsesPlanningAssumptions
          ? `${recommended.vehicleLabel} planı kapasiteyi güvenli biçimde karşılıyor ve açık planlama varsayımlarıyla karşılaştırılan adaylar içinde en düşük hesaplanabilir maliyet sinyalini veriyor; gerçekleşmiş gider veya onaylı hizmet sonucu değildir.`
          : `${recommended.vehicleLabel} planı kapasiteyi güvenli biçimde karşılıyor ve mevcut rota/yakıt/maliyet kanıtıyla karşılaştırılan adaylar içinde en düşük hesaplanabilir maliyet sinyalini veriyor.`,
      basis: [
        "capacity_suitability",
        "vehicle_count",
        ...(recommended.fuelConsumptionLitersPer100Km !== null ? ["fuel_consumption"] : []),
        ...(recommended.fuelRequirementLiters !== null ? ["total_fuel_requirement"] : []),
        ...(recommended.comparisonCostMinor !== null ? ["available_cost_evidence"] : []),
      ],
      evidenceCompleteness: recommendationUsesPlanningAssumptions
        ? "PLANNING_ASSUMPTIONS"
        : recommended.costCoverage.status === "PARTIAL" ? "PARTIAL" : "COMPLETE",
    }
    : null;
  const candidateEvidenceGap = items.some((item) => item.vehicleType !== baselineVehicleType && item.missingData.includes("Alternatif araç maliyet kanıtı"));
  const status = candidateEvidenceGap
    ? "PARTIAL"
    : items.some((item) => item.status === "READY" || item.status === "PARTIAL")
      ? items.some((item) => item.status === "PARTIAL") ? "PARTIAL" : "RESOLVED"
      : "NO_DATA";
  const factors = ["capacity_suitability", "vehicle_count", "driver_count"];
  if (items.some((item) => item.fuelConsumptionLitersPer100Km !== null)) factors.push("fuel_consumption");
  if (items.some((item) => item.fuelRequirementLiters !== null)) factors.push("total_fuel_requirement");
  if (items.some((item) => item.costMinor !== null)) factors.push("available_cost_evidence");
  return {
    referenceVersion: VEHICLE_PLAN_REFERENCE_VERSION,
    unit: VEHICLE_PLAN_REFERENCE_UNIT,
    status,
    passengerCount,
    alternatives: items,
    items,
    recommendation,
    factors,
    precedence: ["USER_OR_VEHICLE_ACTUAL", "CANONICAL_VEHICLE_MODEL", "TECHNICAL_CLASS_REFERENCE", "NO_DATA"],
    reason: recommendation
      ? recommendation.reason
      : candidateEvidenceGap
        ? "Alternatif araçların kendi kira, bakım ve diğer maliyet kanıtı bulunmadığı için karşılaştırmalı öneri üretilmedi."
        : "Kapasite ve karşılaştırılabilir maliyet kanıtı bulunamadı; öneri uydurulmadı.",
  };
}

function missingVehicleComparisonInputs(values = {}) {
  const missing = [];
  if (!(numberOrNull(values.passengerCount) > 0)) missing.push("Kişi / öğrenci / yolcu sayısı");
  if (!(numberOrNull(values.stopCount) > 0)) missing.push("Durak sayısı");
  if (!(numberOrNull(values.serviceDistanceKm) > 0 || numberOrNull(values.totalDistanceKm) > 0)) missing.push("Rota mesafesi");
  if (!(numberOrNull(values.routeDurationMinutes) > 0)) missing.push("Rota süresi");
  return missing;
}

function applyRouteEvidence(values, routeEvidence, side) {
  const next = { ...values };
  const evidence = routeEvidence?.[side] || null;
  if (!evidence) return next;
  const distanceKm = numberOrNull(evidence.distanceKm);
  const durationMinutes = numberOrNull(evidence.durationMinutes);
  if (evidence.distanceKm !== null && evidence.distanceKm !== undefined && distanceKm !== null) {
    next.serviceDistanceKm = distanceKm;
    next.totalDistanceKm = distanceKm;
  }
  if (evidence.durationMinutes !== null && evidence.durationMinutes !== undefined && durationMinutes !== null) next.routeDurationMinutes = durationMinutes;
  if (integerOrNull(evidence.stopCount) !== null) next.stopCount = Number(evidence.stopCount);
  const routeFeeMinor = integerOrNull(evidence.routeFeeMinor);
  const hasRouteLedger = Array.isArray(next.roomCostLedgerInputs)
    && next.roomCostLedgerInputs.some((entry) => (
      String(entry?.componentKey || "").toLowerCase() === "route_fees"
      || ["HGS_TOLL", "BRIDGE", "HIGHWAY", "PARKING", "TERMINAL", "FERRY"].includes(String(entry?.categoryKey || "").toUpperCase())
    ));
  if (String(evidence.passage?.status || "").toUpperCase() === "PROVEN" && routeFeeMinor !== null && routeFeeMinor >= 0 && !hasRouteLedger) {
    if (next.routeFeeMinor === null || next.routeFeeMinor === undefined) next.routeFeeMinor = routeFeeMinor;
  }
  return next;
}

function buildTimingComparison({ baselineValues, scenarioValues, context = {}, routeEvidence = null }) {
  const baselineRoute = routeEvidence?.baseline || {};
  const scenarioRoute = routeEvidence?.scenario || {};
  const baselineStart = integerOrNull(context?.schedule?.baselineStartMinutes ?? baselineValues.shiftStartMinutes);
  const scenarioStart = integerOrNull(scenarioValues.shiftStartMinutes ?? baselineStart);
  // applyRouteEvidence has already resolved the canonical baseline and any
  // explicit what-if route values into the input objects. Prefer those values
  // over the baseline route snapshot so a bounded duration stress is not
  // silently replaced by the original route duration.
  const baselineDuration = numberOrNull(baselineValues.routeDurationMinutes ?? baselineRoute.durationMinutes);
  const scenarioDuration = numberOrNull(scenarioValues.routeDurationMinutes ?? scenarioRoute.durationMinutes);
  const baselineEnd = baselineStart !== null && baselineDuration !== null ? Math.round(baselineStart + baselineDuration) : null;
  const scenarioEnd = scenarioStart !== null && scenarioDuration !== null ? Math.round(scenarioStart + scenarioDuration) : null;
  const hasTiming = baselineStart !== null && scenarioStart !== null && baselineDuration !== null && scenarioDuration !== null;
  const shiftTimeChanged = hasTiming && baselineStart !== scenarioStart;
  const durationChanged = hasTiming && Math.round(baselineDuration) !== Math.round(scenarioDuration);
  return {
    status: hasTiming ? "COMPARED" : "INSUFFICIENT_DATA",
    baselineStartMinutes: baselineStart,
    scenarioStartMinutes: scenarioStart,
    baselineEndMinutes: baselineEnd,
    scenarioEndMinutes: scenarioEnd,
    baselineDurationMinutes: baselineDuration,
    scenarioDurationMinutes: scenarioDuration,
    delayImpactMinutes: hasTiming ? Math.round(scenarioDuration - baselineDuration) : null,
    shiftTimeChanged,
    durationChanged,
    trafficPredictionModeled: false,
    explanation: hasTiming
      ? "Zaman etkisi planlanan başlangıç, rota süresi ve vardiya bitişiyle karşılaştırıldı; trafik tahmini modellenmedi."
      : "Başlangıç veya rota süresi kanıtı bulunmadığı için zaman etkisi hesaplanamadı.",
    evidence: hasTiming ? ["Planlanan vardiya başlangıç/bitiş zamanları", "Kanonik rota süre metriği"] : [],
  };
}

function buildPeriodEndForecast({ baselineCost, scenarioCost, baselineValues, context = {} }) {
  const evidence = context?.forecastEvidence || {};
  const periodStart = compact(evidence.periodStart, "") || null;
  const periodEnd = compact(evidence.periodEnd, "") || null;
  const actualToDate = integerOrNull(evidence.actualToDateMinor);
  const remainingQuantity = integerOrNull(evidence.remainingServiceDayCount);
  const directRemaining = integerOrNull(evidence.remainingForecastMinor);
  const perDay = integerOrNull(evidence.remainingForecastPerServiceDayMinor);
  const derivedPerDay = perDay !== null
    ? perDay
    : scenarioCost !== null && Number(baselineValues.serviceDayCount || 0) > 0
      ? Math.round(Number(scenarioCost) / Number(baselineValues.serviceDayCount))
      : null;
  const remainingForecast = directRemaining !== null
    ? directRemaining
    : remainingQuantity !== null && derivedPerDay !== null
      ? multiplySafeMoney(derivedPerDay, remainingQuantity)
      : null;
  const forecastPeriodEnd = actualToDate !== null && remainingForecast !== null
    ? addSafeMoney(actualToDate, remainingForecast)
    : null;
  const complete = Boolean(periodStart && periodEnd && actualToDate !== null && remainingForecast !== null && forecastPeriodEnd !== null);
  const missingData = [];
  if (!periodStart) missingData.push("periodStart");
  if (!periodEnd) missingData.push("periodEnd");
  if (actualToDate === null) missingData.push("actualToDateMinor");
  if (remainingForecast === null) missingData.push("remaining forecast evidence");
  return {
    status: complete ? "READY" : "INSUFFICIENT_DATA",
    periodStart,
    periodEnd,
    actualToDateMinor: actualToDate,
    remainingPlannedQuantity: remainingQuantity,
    remainingForecastMinor: remainingForecast,
    forecastPeriodEndMinor: forecastPeriodEnd,
    baselineBudgetOrPlanMinor: integerOrNull(evidence.budgetAmountMinor ?? context?.plannedInput?.baselineCostMinor),
    forecastDeltaMinor: forecastPeriodEnd !== null && baselineCost !== null ? forecastPeriodEnd - baselineCost : null,
    confidence: complete ? "EVIDENCE_BASED" : "INSUFFICIENT",
    missingData,
    provenance: evidence.provenance || (complete ? "CANONICAL_PERIOD_AND_ACTUAL_EVIDENCE" : "MISSING_CANONICAL_PERIOD_OR_ACTUAL_EVIDENCE"),
    equation: "actualToDate + remainingForecast = forecastPeriodEnd",
  };
}

function buildBudgetVariance({ forecast, context = {} }) {
  const budgetAmount = integerOrNull(context?.budgetEvidence?.budgetAmountMinor ?? forecast?.baselineBudgetOrPlanMinor);
  const comparisonAmount = forecast?.forecastPeriodEndMinor !== null && forecast?.forecastPeriodEndMinor !== undefined
    ? integerOrNull(forecast.forecastPeriodEndMinor)
    : integerOrNull(forecast?.actualToDateMinor);
  const varianceAmount = budgetAmount !== null && comparisonAmount !== null ? comparisonAmount - budgetAmount : null;
  const variancePercentBps = budgetAmount !== null && budgetAmount > 0 && varianceAmount !== null
    ? Math.round((varianceAmount * 10000) / budgetAmount)
    : null;
  return {
    status: budgetAmount !== null && comparisonAmount !== null ? "READY" : "INSUFFICIENT_DATA",
    budgetAmountMinor: budgetAmount,
    comparisonAmountMinor: comparisonAmount,
    varianceAmountMinor: varianceAmount,
    variancePercentBps,
    direction: varianceAmount === null ? "UNKNOWN" : varianceAmount > 0 ? "OVER_BUDGET" : varianceAmount < 0 ? "UNDER_BUDGET" : "ON_BUDGET",
    reason: varianceAmount === null ? "Bütçe veya karşılaştırılabilir forecast/actual kanıtı eksik." : "Bütçe ile dönem sonu forecast/actual tutarı ayrı olarak karşılaştırıldı.",
    confidence: budgetAmount !== null && comparisonAmount !== null ? "EVIDENCE_BASED" : "INSUFFICIENT",
    evidence: budgetAmount !== null && comparisonAmount !== null ? ["Kanonik bütçe planı", forecast?.forecastPeriodEndMinor !== null ? "Dönem sonu forecast" : "Bugüne kadarki actual kanıt"] : [],
  };
}

function buildPlannedVsActual({ plannedInput = {}, actualInput = {}, context = {} }) {
  const fields = [
    ["vehicleCount", "adet"],
    ["vehicleType", "tip"],
    ["serviceDistanceKm", "km"],
    ["routeDurationMinutes", "dk"],
    ["passengerCount", "kişi"],
    ["vehicleCapacity", "kişi"],
    ["stopCount", "durak"],
    ["shiftCount", "sefer"],
  ];
  const dimensions = {};
  for (const [field, unit] of fields) {
    const planned = plannedInput?.[field] ?? null;
    const actual = actualInput?.[field] ?? null;
    dimensions[field] = {
      planned,
      actual,
      delta: planned !== null && actual !== null && typeof planned === "number" && typeof actual === "number" ? actual - planned : null,
      unit,
      evidence: actual !== null ? (planned !== null ? "CANONICAL_PLANNED_AND_ACTUAL" : "CANONICAL_ACTUAL_ONLY") : planned !== null ? "CANONICAL_PLANNED_ONLY" : null,
      confidence: actual !== null && planned !== null ? "EVIDENCE_BASED" : "INSUFFICIENT",
      status: actual !== null && planned !== null ? "COMPARED" : actual !== null ? "ACTUAL_EVIDENCE_WITHOUT_PLAN" : planned !== null ? "PLANNED_ONLY" : "NOT_APPLICABLE",
    };
  }
  const plannedCost = integerOrNull(context?.plannedInput?.baselineCostMinor);
  const actualCost = integerOrNull(context?.actualEvidence?.actualCostMinor);
  dimensions.cost = {
    planned: plannedCost,
    actual: actualCost,
    delta: plannedCost !== null && actualCost !== null ? actualCost - plannedCost : null,
    unit: "kuruş",
    evidence: actualCost !== null ? plannedCost !== null ? "CANONICAL_PLANNED_AND_ACTUAL_COST" : "CANONICAL_ACTUAL_COST_ONLY" : plannedCost !== null ? "CANONICAL_PLANNED_COST_ONLY" : null,
    confidence: actualCost !== null && plannedCost !== null ? "EVIDENCE_BASED" : "INSUFFICIENT",
    status: actualCost !== null && plannedCost !== null ? "COMPARED" : actualCost !== null ? "ACTUAL_EVIDENCE_WITHOUT_PLAN" : plannedCost !== null ? "PLANNED_ONLY" : "NOT_APPLICABLE",
  };
  return { status: Object.values(dimensions).some((item) => item.status === "COMPARED" || item.status === "ACTUAL_EVIDENCE_WITHOUT_PLAN") ? "AVAILABLE" : "INSUFFICIENT_DATA", dimensions };
}

function buildOperationalRisk({ preview, timing, context = {} }) {
  const reasons = [];
  const affectedDimensions = [];
  const blockers = preview?.blockers || [];
  if (preview?.scenario?.requiredVehicleCount !== null && preview?.scenario?.requiredVehicleCount !== undefined && Number(preview.scenario.requiredVehicleCount) > Number(preview?.dimensions?.vehicleCount?.scenario || 0)) {
    reasons.push("Araç kapasitesi yetersiz");
    affectedDimensions.push("capacity", "vehicleRequirement");
  }
  if (blockers.length) {
    reasons.push(...blockers);
    affectedDimensions.push("scenarioValidity");
  }
  if (preview?.missingData?.length) {
    reasons.push("Eksik veri sonucu güven sınırlı");
    affectedDimensions.push("dataSufficiency");
  }
  if (timing?.status === "INSUFFICIENT_DATA") {
    reasons.push("Zamanlama kanıtı eksik");
    affectedDimensions.push("timing");
  }
  if (timing?.delayImpactMinutes !== null && timing?.delayImpactMinutes !== undefined && timing.delayImpactMinutes > 0) {
    reasons.push("Rota/süre varsayımı uzadı");
    affectedDimensions.push("timing");
  }
  const riskState = blockers.length ? "HIGH" : reasons.length ? "MEDIUM" : "LOW";
  return {
    riskState,
    reasons: [...new Set(reasons)],
    evidence: [...new Set([...(preview?.evidence || []).slice(0, 6), ...(context?.riskEvidence || [])])],
    affectedDimension: [...new Set(affectedDimensions)],
    score: null,
    explained: true,
  };
}

function variantEnvelope({
  type,
  preview,
  side = "scenario",
  rationale = "",
  assumptions = {},
  costDeltaOverride,
  savingsOverride,
  additionalCostOverride,
  fuelOverride,
  costReconciliation = null,
  costNote = "Önizleme sonucu",
}) {
  const selected = side === "baseline" ? preview?.baseline : preview?.scenario;
  const capacityBlocked = (preview?.blockers || []).some((item) => /kapasite|capacity/i.test(item));
  return {
    scenarioType: type,
    label: VARIANT_LABELS[type] || type,
    assumptions,
    evidence: preview?.evidence || [],
    estimatedCost: selected?.costMinor ?? null,
    costDelta: costDeltaOverride !== undefined ? costDeltaOverride : side === "baseline" ? 0 : preview?.costDeltaMinor ?? null,
    vehicleRequirement: selected?.requiredVehicleCount ?? null,
    distance: preview?.dimensions?.serviceDistanceKm?.[side] ?? null,
    duration: preview?.dimensions?.routeDurationMinutes?.[side] ?? null,
    fuel: fuelOverride !== undefined ? fuelOverride : preview?.fuelDeltaMinor ?? null,
    capacity: { status: capacityBlocked ? "INVALID" : "VALID", requiredVehicleCount: selected?.requiredVehicleCount ?? null },
    delayImpact: preview?.timingComparison?.delayImpactMinutes ?? null,
    operationalRisk: preview?.operationalRisk || null,
    savings: savingsOverride !== undefined ? savingsOverride : preview?.savingsMinor ?? null,
    additionalCost: additionalCostOverride !== undefined ? additionalCostOverride : preview?.additionalCostMinor ?? null,
    costReconciliation,
    confidence: preview?.confidence || { level: "INSUFFICIENT", score: 0 },
    missingData: preview?.missingData || [],
    rationale,
    costNote,
    status: preview?.status || "INCOMPLETE",
  };
}

function incompleteBestVariant(vehiclePlanAlternatives) {
  const rationale = vehiclePlanAlternatives?.reason
    || "Karşılaştırılabilir alternatif araç maliyet kanıtı bulunamadı; öneri üretilmedi.";
  return {
    scenarioType: "BEST",
    label: VARIANT_LABELS.BEST,
    assumptions: {},
    evidence: [],
    estimatedCost: null,
    costDelta: null,
    vehicleRequirement: null,
    distance: null,
    duration: null,
    fuel: null,
    capacity: { status: "UNKNOWN", requiredVehicleCount: null },
    delayImpact: null,
    operationalRisk: { riskState: "UNKNOWN", reasons: [rationale], evidence: [], affectedDimension: ["comparisonEvidence"], score: null, explained: true },
    savings: null,
    additionalCost: null,
    confidence: { level: "INSUFFICIENT", score: 0, reason: "Geçerli alternatif maliyet kanıtı olmadan en uygun sonucu üretmek güvenli değil." },
    missingData: ["Karşılaştırılabilir alternatif araç maliyet kanıtı"],
    rationale: `En uygun sonucu üretmek için ${rationale.toLocaleLowerCase("tr-TR")}`,
    costNote: "Karşılaştırılabilir maliyet kanıtı bekleniyor; tutar uydurulmadı.",
    status: "INCOMPLETE",
  };
}

function vehicleAlternativeVariant({ item, recommendation, baselinePreview }) {
  const baselineCost = baselinePreview?.vehiclePlanAlternatives?.items
    ?.find((candidate) => candidate.vehicleType === baselinePreview?.baseline?.values?.vehicleType)
    ?.comparisonCostMinor
    ?? baselinePreview?.baseline?.costMinor
    ?? null;
  const candidateCost = item?.comparisonCostMinor ?? item?.costMinor ?? null;
  const costDelta = candidateCost !== null && baselineCost !== null ? candidateCost - baselineCost : null;
  const status = item?.status === "READY" ? "READY" : "INCOMPLETE";
  return {
    scenarioType: "BEST",
    label: VARIANT_LABELS.BEST,
    assumptions: {
      vehicleType: item.vehicleType,
      vehicleCount: item.requiredVehicleCount,
      vehicleCapacity: item.capacity,
    },
    evidence: [
      ...(item.fuelConsumptionReference?.sourceName ? [`Tüketim kaynağı: ${item.fuelConsumptionReference.sourceName}`] : []),
      ...(item.costEvidenceLabel ? [`Maliyet dayanağı: ${item.costEvidenceLabel}`] : []),
    ],
    estimatedCost: candidateCost,
    costDelta,
    vehicleRequirement: item.requiredVehicleCount ?? null,
    distance: item.routeDistanceKm ?? null,
    duration: item.routeDurationMinutes ?? null,
    fuel: null,
    capacity: { status: "VALID", requiredVehicleCount: item.requiredVehicleCount ?? null },
    delayImpact: 0,
    operationalRisk: item.risk || null,
    savings: costDelta !== null && costDelta < 0 ? Math.abs(costDelta) : null,
    additionalCost: costDelta !== null && costDelta > 0 ? costDelta : null,
    confidence: item.confidence || { level: "INSUFFICIENT", score: 0 },
    missingData: item.missingData || [],
    rationale: recommendation.reason,
    costNote: item.costEvidenceLabel || "Aday maliyet kanıtı",
    status,
  };
}

function forecastBaselineCostForRisk(preview) {
  const actualFuel = preview?.fuelComparison?.actualLedgerMinor;
  const formulaFuel = preview?.fuelComparison?.estimatedBaselineMinor;
  const baselineCost = preview?.baseline?.costMinor;
  if (preview?.fuelComparison?.baselineEstimateIncluded !== true
    || preview?.fuelComparison?.scenarioEstimateIncluded !== true
    || !Number.isFinite(Number(baselineCost))) return null;
  // With no actual fuel ledger, the baseline already contains the formula
  // estimate. Do not manufacture an actual=0 value or add the formula twice.
  if (actualFuel === null || actualFuel === undefined) return Number(baselineCost);
  if (!Number.isFinite(Number(formulaFuel))) return null;
  return Number(baselineCost) - Number(actualFuel) + Number(formulaFuel);
}

function buildRiskCostReconciliation({ preview, riskCost, planningBaselineCost }) {
  const actualBaselineCostMinor = integerOrNull(preview?.baseline?.costMinor);
  const riskCostMinor = integerOrNull(riskCost);
  const planningBaselineCostMinor = integerOrNull(planningBaselineCost);
  return {
    actualBaselineCostMinor,
    planningBaselineCostMinor,
    riskCostMinor,
    additionalCostVsPlanningBaselineMinor: riskCostMinor !== null && planningBaselineCostMinor !== null
      ? riskCostMinor - planningBaselineCostMinor
      : null,
    deltaVsActualBaselineMinor: riskCostMinor !== null && actualBaselineCostMinor !== null
      ? riskCostMinor - actualBaselineCostMinor
      : null,
    actualFuelLedgerMinor: integerOrNull(preview?.fuelComparison?.actualLedgerMinor),
    formulaBaselineFuelMinor: integerOrNull(preview?.fuelComparison?.estimatedBaselineMinor),
    riskFuelMinor: integerOrNull(preview?.fuelComparison?.scenarioEstimateMinor),
    scope: "ACTUAL_BASELINE_AND_PLANNING_STRESS_SEPARATE",
    explanation: "Risk maliyeti, gerçekleşen temel toplamı değiştirmez. Karşılaştırılabilir stres artışı, gerçekleşen yakıtı ikinci kez saymadan formül tabanına göre; gerçek plana fark ayrıca gösterilir.",
  };
}

function buildScenarioVariants({ preview, baselineInput, scenarioOverrides, context, externalReference, now, scenarioMeta, vehiclePlanAlternatives }) {
  const expected = variantEnvelope({
    type: "EXPECTED",
    preview,
    assumptions: scenarioOverrides,
    rationale: "Mevcut kanonik plan ve açık kullanıcı varsayımlarıyla beklenen projection.",
  });

  const baselinePreview = buildCostScenarioPreview({
    baselineInput,
    scenarioOverrides: {},
    context,
    externalReference,
    now,
    includeVariants: false,
  });
  let best = null;
  if (scenarioMeta?.bestCandidate) {
    const candidatePreview = buildCostScenarioPreview({
      baselineInput,
      scenarioOverrides: { ...scenarioOverrides, ...scenarioMeta.bestCandidate },
      context,
      externalReference,
      now,
      includeVariants: false,
    });
    if (candidatePreview.status === "READY" && candidatePreview.scenario?.costMinor !== null) {
      best = variantEnvelope({
        type: "BEST",
        preview: candidatePreview,
        side: "scenario",
        assumptions: scenarioMeta.bestCandidate,
        rationale: "Kullanıcının açıkça sağladığı geçerli bounded aday, mevcut planla karşılaştırıldı.",
      });
    }
  }
  const recommendation = vehiclePlanAlternatives?.recommendation || null;
  if (!best && recommendation) {
    const recommendedItem = (vehiclePlanAlternatives.items || []).find((item) => item.vehicleType === recommendation.vehicleType);
    if (recommendedItem) {
      best = vehicleAlternativeVariant({ item: recommendedItem, recommendation, baselinePreview });
    }
  }
  if (!best) best = incompleteBestVariant(vehiclePlanAlternatives);

  const riskInput = { ...scenarioMeta.riskAssumptions };
  const riskOverrides = {};
  if (riskInput.riskVehicleCount !== undefined) riskOverrides.vehicleCount = riskInput.riskVehicleCount;
  if (riskInput.riskPassengerCount !== undefined) riskOverrides.passengerCount = riskInput.riskPassengerCount;
  if (riskInput.riskFuelUnitPriceMinor !== undefined) riskOverrides.fuelUnitPriceMinor = riskInput.riskFuelUnitPriceMinor;
  if (riskInput.riskDistanceKm !== undefined) {
    // Keep the derived total-distance dimension aligned with the explicit risk
    // route bound; otherwise the cost engine could still price the baseline km
    // while the card displayed the changed service distance.
    riskOverrides.serviceDistanceKm = riskInput.riskDistanceKm;
    riskOverrides.totalDistanceKm = riskInput.riskDistanceKm;
  }
  if (riskInput.riskDurationMinutes !== undefined) riskOverrides.routeDurationMinutes = riskInput.riskDurationMinutes;
  const hasRiskBound = Object.keys(riskOverrides).length > 0;
  const riskPreview = hasRiskBound
    ? buildCostScenarioPreview({ baselineInput, scenarioOverrides: { ...scenarioOverrides, ...riskOverrides }, context, externalReference, now, includeVariants: false })
    : null;
  const riskForecastBaseline = riskPreview ? forecastBaselineCostForRisk(riskPreview) : null;
  const riskCost = riskPreview?.scenario?.costMinor ?? null;
  const riskCostDelta = riskCost !== null && riskForecastBaseline !== null ? riskCost - riskForecastBaseline : null;
  const riskCostReconciliation = riskPreview
    ? buildRiskCostReconciliation({ preview: riskPreview, riskCost, planningBaselineCost: riskForecastBaseline })
    : null;
  const riskFuelDelta = riskPreview?.fuelComparison?.baselineEstimateIncluded === true
    && riskPreview?.fuelComparison?.scenarioEstimateIncluded === true
    && riskPreview?.fuelComparison?.estimatedBaselineMinor !== null
    && riskPreview?.fuelComparison?.estimatedBaselineMinor !== undefined
    && riskPreview?.fuelComparison?.scenarioEstimateMinor !== null
    && riskPreview?.fuelComparison?.scenarioEstimateMinor !== undefined
    ? Number(riskPreview.fuelComparison.scenarioEstimateMinor) - Number(riskPreview.fuelComparison.estimatedBaselineMinor)
    : undefined;
  const risk = riskPreview
    ? variantEnvelope({
      type: "RISK",
      preview: riskPreview,
      assumptions: riskInput,
      rationale: "Yalnızca açıkça verilen risk varsayımlarıyla oluşturuldu; keyfi yüzde veya olasılık kullanılmadı.",
      costDeltaOverride: riskCostDelta,
      savingsOverride: riskCostDelta !== null && riskCostDelta < 0 ? Math.abs(riskCostDelta) : null,
      additionalCostOverride: riskCostDelta !== null && riskCostDelta > 0 ? riskCostDelta : null,
      fuelOverride: riskFuelDelta,
      costReconciliation: riskCostReconciliation,
      costNote: riskForecastBaseline !== null
        ? "Risk tahmini; gerçekleşen yakıt tekrar sayılmadan, aynı formülün baseline tahminiyle karşılaştırıldı."
        : "Risk tahmini; karşılaştırma tabanı için kanıt bekleniyor.",
    })
    : {
      scenarioType: "RISK",
      label: VARIANT_LABELS.RISK,
      assumptions: {},
      evidence: [],
      estimatedCost: null,
      costDelta: null,
      vehicleRequirement: null,
      distance: null,
      duration: null,
      fuel: null,
      capacity: { status: "UNKNOWN", requiredVehicleCount: null },
      delayImpact: null,
      operationalRisk: { riskState: "UNKNOWN", reasons: ["Açık risk varsayımı yok"], evidence: [], affectedDimension: ["riskAssumption"], score: null, explained: true },
      savings: null,
      additionalCost: null,
      confidence: { level: "INSUFFICIENT", score: 0, reason: "Risk senaryosu için açık bounded varsayım gerekli" },
      missingData: ["Açık risk varsayımı"],
      rationale: "Riskli durum keyfi oranlarla uydurulmadı; açık risk varsayımı bekleniyor.",
      status: "INCOMPLETE",
    };
  return { EXPECTED: expected, BEST: best, RISK: risk };
}

export function normalizeCostScenarioInput(input = {}, label = "Senaryo girdisi") {
  return sanitizeInput(input, label);
}

export function buildCostScenarioPreview({
  baselineInput = {},
  scenarioOverrides = {},
  context = {},
  externalReference = null,
  now = new Date(),
  includeVariants = true,
  includeVehicleAlternatives = true,
} = {}) {
  const scenarioMeta = normalizeScenarioMeta(scenarioOverrides);
  const baseSanitized = sanitizeInput(baselineInput, "Mevcut plan");
  const overrideSanitized = sanitizeInput(scenarioMeta.cleanOverrides, "Alternatif senaryo");
  const globalIssues = mergeIssues(baseSanitized.issues, overrideSanitized.issues);
  let baseValues = { ...baseSanitized.values };
  if (Array.isArray(context?.actualCostInputs) && context.actualCostInputs.length > 0) {
    baseValues.roomCostLedgerInputs = context.actualCostInputs;
  }
  let scenarioValues = { ...baseValues, ...overrideSanitized.values };
  const scenarioPlanning = deriveScenarioPlanningInputs({
    scenarioValues,
    context,
    scenarioOverrides: overrideSanitized.values,
  });
  const economicReliability = scenarioPlanning?.economicReliability
    || classifyPlanningEconomicReliability({
      planningEvidence: scenarioPlanning?.evidence || {},
      dataClass: scenarioPlanning?.dataClass,
      userAssumptionUsed: scenarioPlanning?.userAssumptionUsed === true,
    });
  if (scenarioPlanning) {
    scenarioValues = {
      ...scenarioValues,
      ...scenarioPlanning.input,
      vehicleCount: scenarioPlanning.requiredVehicleCount,
    };
    // A scaled scenario is a planning projection, never the one-vehicle
    // actual ledger repeated for a larger passenger load.
    delete scenarioValues.roomCostLedgerInputs;
  }
  const forecastCostInputs = Array.isArray(context?.forecastCostInputs) ? context.forecastCostInputs : [];
  if (forecastCostInputs.length > 0) {
    scenarioValues.roomCostLedgerInputs = [
      ...(Array.isArray(scenarioValues.roomCostLedgerInputs) ? scenarioValues.roomCostLedgerInputs : []),
      ...forecastCostInputs,
    ];
  }
  baseValues = applyRouteEvidence(baseValues, context?.routeEvidence, "baseline");
  const explicitScenarioRoute = ["serviceDistanceKm", "totalDistanceKm", "routeDurationMinutes"].some((field) => overrideSanitized.values[field] !== undefined && overrideSanitized.values[field] !== null);
  const hasRouteOperation = scenarioMeta.stopOperations.length > 0 || Boolean(scenarioMeta.routeAlternative);
  if (!explicitScenarioRoute || hasRouteOperation) scenarioValues = applyRouteEvidence(scenarioValues, context?.routeEvidence, "scenario");

  const baselineCurrency = compact(baseValues.currencyCode, "TRY").toUpperCase();
  const scenarioCurrency = compact(scenarioValues.currencyCode, baselineCurrency).toUpperCase();
  if (baselineCurrency !== scenarioCurrency) pushUnique(globalIssues.blockers, "Mevcut plan ile alternatif senaryo farklı para biriminde olamaz");
  const periodScope = buildPeriodScopeEvidence({
    actualCostInputs: context?.actualCostInputs,
    actualEvidence: context?.actualEvidence,
  });
  const scenarioConsumptionContext = scenarioPlanning?.consumptionPlanningValue !== null
    && scenarioPlanning?.consumptionPlanningValue !== undefined
    ? {
      ...context,
      scenarioVehicleConsumptionPlanningValue: scenarioPlanning.consumptionPlanningValue,
      scenarioVehicleConsumptionPlanningReference: scenarioPlanning.consumptionPlanningReference,
    }
    : context;

  const consumptionResolution = applyVehicleConsumptionReference(
    baseValues,
    scenarioValues,
    scenarioConsumptionContext,
    {
      baselineExplicit: Object.prototype.hasOwnProperty.call(baseSanitized.values, "fuelConsumptionLitersPer100Km"),
      scenarioExplicit: Object.prototype.hasOwnProperty.call(overrideSanitized.values, "fuelConsumptionLitersPer100Km"),
    },
    globalIssues,
  );
  baseValues = consumptionResolution.baselineValues;
  scenarioValues = consumptionResolution.scenarioValues;
  const withExternal = applyExternalReference(baseValues, scenarioValues, externalReference, globalIssues);
  const actualFuelLedgerMinor = fuelLedgerAmountMinor(withExternal.baseline);
  const scenarioFuelChanged = fuelScenarioDimensionsChanged(withExternal.baseline, withExternal.scenario, scenarioMeta);
  const scenarioLedger = actualFuelLedgerMinor !== null && scenarioFuelChanged
    ? removeFuelLedgerInputs(withExternal.scenario)
    : { ...withExternal.scenario, removed: false };
  if (scenarioLedger.removed) {
    pushUnique(globalIssues.warnings, "Değişen senaryo için gerçekleşen yakıt kaydı temel planda bırakıldı; senaryo yakıtı ayrı tahmin edildi");
  }
  const baseline = buildSide(withExternal.baseline, baseValues, context, "baseline", globalIssues);
  const scenario = buildSide(scenarioLedger, baseValues, {
    ...context,
    ...(scenarioPlanning?.componentKeys?.includes("driver_labor") ? { driverBaseAlreadyAggregated: true } : {}),
  }, "scenario", globalIssues);
  if (scenarioPlanning && scenario.costMinor !== null) {
    scenario.basis = scenarioPlanning.source;
  }
  const baselineCapacity = capacityGuard(baseline, SCENARIO_LABELS.baseline, globalIssues);
  const scenarioCapacity = capacityGuard(scenario, SCENARIO_LABELS.scenario, globalIssues);

  const baselineCost = baselineCapacity?.blocked ? null : baseline.costMinor;
  const scenarioCost = scenarioCapacity?.blocked ? null : scenario.costMinor;
  const requireFullOperatingCostEvidence = context?.requireFullOperatingCostEvidence === true
    || (String(context?.scope || "").toUpperCase() === "ROOM"
      && context?.periodPlanning?.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION");
  const baselineCostCoverage = buildOptionalCostCoverage({
    ...withExternal.baseline,
    requireFullOperatingCostEvidence,
  });
  const scenarioCostCoverage = buildOptionalCostCoverage({
    ...scenarioLedger,
    requireFullOperatingCostEvidence,
  });
  const componentCoverage = buildComponentCoverage(baseline, scenario);
  const comparable = baselineCost !== null
    && scenarioCost !== null
    && !globalIssues.blockers.length
    && !componentCoverage.hasGap
    && periodScope.status === "COMPLETE";
  const independentScenarioReady = context?.independentRouteQuoteAdvice === true
    && scenarioCost !== null
    && !globalIssues.blockers.length
    && ["COMPLETE", "PARTIAL"].includes(scenarioCostCoverage.status)
    && periodScope.status === "COMPLETE";
  const costDeltaMinor = comparable ? scenarioCost - baselineCost : null;
  const savingsMinor = costDeltaMinor !== null && costDeltaMinor < 0 ? Math.abs(costDeltaMinor) : null;
  const additionalCostMinor = costDeltaMinor !== null && costDeltaMinor > 0 ? costDeltaMinor : null;
  const incrementalCost = buildIncrementalCostEvidence({
    baseline,
    scenario,
    componentCoverage,
    periodScope,
    distributedDeltaMinor: costDeltaMinor,
  });
  const percentIssues = { blockers: [] };
  const deltaPercent = comparable ? deltaPercentBps(costDeltaMinor, baselineCost, percentIssues) : null;
  globalIssues.blockers.push(...percentIssues.blockers);

  const dimensions = {
    vehicleCount: { baseline: baseValues.vehicleCount ?? 1, scenario: scenarioValues.vehicleCount ?? baseValues.vehicleCount ?? 1 },
    vehicleType: { baseline: baseValues.vehicleType || null, scenario: scenarioValues.vehicleType || baseValues.vehicleType || null },
    vehicleCapacity: { baseline: baseValues.vehicleCapacity ?? null, scenario: scenarioValues.vehicleCapacity ?? baseValues.vehicleCapacity ?? null },
    passengerCount: { baseline: baseValues.passengerCount ?? null, scenario: scenarioValues.passengerCount ?? baseValues.passengerCount ?? null },
    stopCount: { baseline: baseValues.stopCount ?? null, scenario: scenarioValues.stopCount ?? baseValues.stopCount ?? null },
    serviceDistanceKm: { baseline: baseValues.serviceDistanceKm ?? null, scenario: scenarioValues.serviceDistanceKm ?? baseValues.serviceDistanceKm ?? null },
    totalDistanceKm: { baseline: baseValues.totalDistanceKm ?? null, scenario: scenarioValues.totalDistanceKm ?? baseValues.totalDistanceKm ?? null },
    routeDurationMinutes: { baseline: baseValues.routeDurationMinutes ?? null, scenario: scenarioValues.routeDurationMinutes ?? baseValues.routeDurationMinutes ?? null },
    serviceDayCount: { baseline: baseValues.serviceDayCount ?? null, scenario: scenarioValues.serviceDayCount ?? baseValues.serviceDayCount ?? null },
  };
  const differences = Object.entries(dimensions)
    .filter(([, value]) => JSON.stringify(value.baseline) !== JSON.stringify(value.scenario))
    .map(([key]) => key);

  const status = globalIssues.blockers.length
    ? "BLOCKED"
    : comparable || independentScenarioReady
      ? "READY"
      : "INCOMPLETE";
  const referenceResolution = {
    vehicleConsumption: consumptionResolution,
    fuelPrice: fuelPriceResolution({ baseValues, scenarioValues, external: withExternal }),
  };
  const costQualityNotes = [
    ...buildCostQualityNotes({
      baseline,
      scenario,
      costCoverage: { baseline: baselineCostCoverage, scenario: scenarioCostCoverage },
      componentCoverage,
    }),
    ...(periodScope.status !== "COMPLETE" ? [periodScope.reason] : []),
  ];
  const costCoverage = {
    baseline: baselineCostCoverage,
    scenario: scenarioCostCoverage,
    partialExplanation: costQualityNotes.join(" ") || scenarioCostCoverage.partialExplanation,
  };
  const hasPartialCost = status !== "BLOCKED"
    && baselineCost !== null
    && scenarioCost !== null
    && costQualityNotes.length > 0;
  const confidence = confidenceWithOptionalCoverage({
    ...confidenceFor({ baseline: { ...baseline, costMinor: baselineCost }, scenario: { ...scenario, costMinor: scenarioCost }, blockers: globalIssues.blockers, externalStatus: withExternal.status, externalUsed: withExternal.used, consumption: consumptionResolution, independentRouteQuoteAdvice: context?.independentRouteQuoteAdvice === true }),
    baseline: context?.baselineConfidence || null,
  }, costCoverage.scenario);
  const scenarioId = `scn_${safeHashId({
    version: COST_SCENARIO_FORECAST_MODEL_VERSION,
    tenantScope: compact(context?.tenantScope, "tenant"),
    scope: compact(context?.scope, "COMPANY"),
    baseline: baseValues,
    scenario: scenarioValues,
    externalReference: withExternal.reference ? {
      family: withExternal.reference.family,
      valueDecimal: withExternal.reference.valueDecimal,
      freshness: withExternal.reference.freshness,
    } : null,
  }).slice(4)}`;
  const independentQuoteReady = context?.independentRouteQuoteAdvice === true && scenarioCost !== null;
  const independentQuotePartial = independentQuoteReady && scenarioCostCoverage.status !== "COMPLETE";
  const summaryText = independentQuoteReady
    ? independentQuotePartial
      ? `Sözleşmesiz talep için kısmi planlama maliyeti hazır; ${scenarioCostCoverage.partialExplanation} Kesin teklif ve kârlılık için bu kayıtlar tamamlanmalı.`
      : "Sözleşmesiz talep için planlama maliyeti hazır; bu sonuç açık DEMO planlama varsayımlarına dayanır ve gerçekleşmiş gider değildir."
    : status === "BLOCKED"
    ? "Senaryo güvenli biçimde karşılaştırılamadı; kapasite, para birimi veya giriş verisi engeli var."
    : hasPartialCost
      ? `Kısmi/uyarılı maliyet hesaplandı; ${costQualityNotes.join(" ")} Gerçek toplam maliyet veya net sonuç bu sınırlamalar nedeniyle kesin kabul edilmez.`
    : status === "INCOMPLETE"
      ? `Senaryo önizlemesi kısmen hazır; maliyet etkisini göstermek için eksik veriler tamamlanmalı.${periodScope.status !== "COMPLETE" ? ` ${periodScope.reason}` : ""}`
      : savingsMinor !== null
        ? `Alternatif senaryo yaklaşık ${savingsMinor} kuruş tasarruf sinyali veriyor; sonuç tahminidir.`
        : additionalCostMinor !== null
          ? `Alternatif senaryo yaklaşık ${additionalCostMinor} kuruş ek maliyet sinyali veriyor; sonuç tahminidir.`
          : "Mevcut plan ile alternatif senaryonun tahmini maliyeti aynı görünüyor.";

  const missingData = [...new Set([
    ...globalIssues.warnings.filter((item) => /eksik|açıklayamaz|kullanılabilir/i.test(item) && !/tamamlandı/i.test(item)),
    ...(referenceResolution.fuelPrice.baseline.valueMinor === null ? ["Yakıt litre fiyatı için kullanılabilir güncel referans bulunamadı."] : []),
    ...(baseline.costMinor === null ? ["Mevcut plan maliyet tabanı"] : []),
    ...(scenario.costMinor === null ? ["Alternatif senaryo maliyet tabanı"] : []),
    ...(baselineCapacity?.requiredVehicleCount === null ? ["Mevcut plan araç kapasitesi"] : []),
    ...(scenarioCapacity?.requiredVehicleCount === null ? ["Alternatif senaryo araç kapasitesi"] : []),
    ...costCoverage.scenario.missingOptionalCosts.map((item) => `${item.label} eksik`),
    ...componentCoverage.missingInScenarioLabels.map((label) => `${label} için alternatif kanıtı eksik`),
    ...componentCoverage.missingInBaselineLabels.map((label) => `${label} için mevcut plan kanıtı eksik`),
    ...(periodScope.status !== "COMPLETE" ? [periodScope.reason] : []),
  ])];

  const timingComparison = buildTimingComparison({ baselineValues: baseValues, scenarioValues, context, routeEvidence: context?.routeEvidence });
  const forecast = buildPeriodEndForecast({ baselineCost, scenarioCost, baselineValues: baseValues, context });
  const budgetVariance = buildBudgetVariance({ forecast, context });
  const plannedVsActual = buildPlannedVsActual({ plannedInput: context?.plannedInput || {}, actualInput: context?.actualInput || baseValues, context });
  const previewShape = {
    status,
    blockers: [...new Set(globalIssues.blockers)],
    missingData,
    evidence: [
      `Mevcut plan kaynağı: ${baseline.basis || "eksik"}`,
      `Alternatif senaryo kaynağı: ${scenario.basis || "eksik"}`,
      ...baseline.model.evidence,
      ...scenario.model.evidence,
    ],
    baseline: { costMinor: baselineCost, requiredVehicleCount: baselineCapacity?.requiredVehicleCount ?? null },
    scenario: { costMinor: scenarioCost, requiredVehicleCount: scenarioCapacity?.requiredVehicleCount ?? null },
    dimensions,
    costDeltaMinor,
    fuelDeltaMinor: baseline.model.components.find((item) => item.componentKey === "fuel")?.includedInBaseline && scenario.model.components.find((item) => item.componentKey === "fuel")?.includedInBaseline
      ? scenario.model.components.find((item) => item.componentKey === "fuel").amountMinor - baseline.model.components.find((item) => item.componentKey === "fuel").amountMinor
      : null,
    savingsMinor,
    additionalCostMinor,
    incrementalCost,
    periodScope,
    confidence,
    baselineConfidence: context?.baselineConfidence || null,
    baselineSourceMap: context?.baselineSourceMap || null,
    timingComparison,
    scenarioPlanning,
    economicReliability,
  };
  const fuelComparison = buildFuelComparison({
    baseline,
    scenario,
    baselineValues: withExternal.baseline,
    scenarioValues: scenarioLedger,
    scenarioUsesActualFuelLedger: actualFuelLedgerMinor !== null && !scenarioLedger.removed,
  });
  const operationalRisk = buildOperationalRisk({ preview: previewShape, timing: timingComparison, context });
  const routeAlternative = context?.routeEvidence?.alternative || {
    status: scenarioMeta.routeAlternative ? "INSUFFICIENT_DATA" : "NOT_REQUESTED",
    type: scenarioMeta.routeAlternative?.type || null,
    source: null,
    compared: false,
    applied: false,
    reason: scenarioMeta.routeAlternative ? "Rota alternatifi için kanonik rota metriği bulunamadı." : "Rota alternatifi istenmedi.",
  };
  const dispatchAlternative = context?.dispatchAlternative || (scenarioMeta.dispatchAlternative
    ? {
      status: "SEAM_PROVEN_DEFERRED_TO_#20",
      typedInput: true,
      compared: false,
      applied: false,
      reason: "Atama alternatifi yalnızca typed preview seam olarak korunur; dispatch önerisi veya uygulaması #20 kapsamındadır.",
    }
    : {
      status: "SEAM_PROVEN_DEFERRED_TO_#20",
      typedInput: false,
      compared: false,
      applied: false,
      reason: "Dispatch alternatifi çalıştırılmadı; #4 yalnız güvenli preview seam sağlar.",
    });
  const vehiclePlanAlternatives = includeVehicleAlternatives
    ? buildVehiclePlanAlternatives({
      baselineInput,
      scenarioOverrides: scenarioMeta.cleanOverrides,
      context,
      externalReference,
      now,
    })
    : null;
  const comparisonInputMissing = includeVehicleAlternatives
    && context?.independentRouteQuoteAdvice !== true
    && String(context?.scope || "").toUpperCase() === "ROOM"
    ? missingVehicleComparisonInputs(baseValues)
    : [];
  if (comparisonInputMissing.length) {
    pushUnique(globalIssues.warnings, `Araç karşılaştırması için eksik zorunlu veri: ${comparisonInputMissing.join(", ")}`);
  }
  const comparisonReady = comparisonInputMissing.length === 0;
  const effectiveStatus = comparisonReady ? status : "INCOMPLETE";
  const effectiveMissingData = [...new Set([
    ...missingData,
    ...comparisonInputMissing.map((item) => `${item} eksik`),
  ])];
  const scenarioVariants = includeVariants
    ? buildScenarioVariants({ preview: { ...previewShape, status: effectiveStatus, missingData: effectiveMissingData, timingComparison, operationalRisk }, baselineInput, scenarioOverrides: scenarioMeta.cleanOverrides, context, externalReference, now, scenarioMeta, vehiclePlanAlternatives })
    : null;

  return Object.freeze({
    ok: true,
    modelVersion: COST_SCENARIO_FORECAST_MODEL_VERSION,
    scenarioId,
    status: effectiveStatus,
    statusLabel: effectiveStatus === "READY" && hasPartialCost ? "Kısmi maliyet hesaplandı" : effectiveStatus === "READY" ? "Karşılaştırma hazır" : effectiveStatus === "BLOCKED" ? "Güvenli hesap durdu" : "Eksik veri",
    summaryText: comparisonReady ? summaryText : `Karşılaştırma için zorunlu operasyon kanıtı eksik: ${comparisonInputMissing.join(", ")}.`,
    currencyCode: baselineCurrency,
    baseline: {
      label: SCENARIO_LABELS.baseline,
      costMinor: baselineCost,
      costBasis: baseline.basis,
      costModelStatus: baseline.model.status,
      requiredVehicleCount: baselineCapacity?.requiredVehicleCount ?? null,
      componentBreakdown: baseline.model.componentSummaries,
    },
    scenario: {
      label: SCENARIO_LABELS.scenario,
      costMinor: scenarioCost,
      costBasis: scenario.basis,
      costModelStatus: scenario.model.status,
      requiredVehicleCount: scenarioCapacity?.requiredVehicleCount ?? null,
      componentBreakdown: scenario.model.componentSummaries,
    },
    dimensions,
    changedDimensions: differences,
    costDeltaMinor,
    costDeltaPercentBps: deltaPercent,
    savingsMinor,
    additionalCostMinor,
    incrementalCost,
    periodScope,
    fuelDeltaMinor: baseline.model.components.find((item) => item.componentKey === "fuel")?.includedInBaseline && scenario.model.components.find((item) => item.componentKey === "fuel")?.includedInBaseline
      ? scenario.model.components.find((item) => item.componentKey === "fuel").amountMinor - baseline.model.components.find((item) => item.componentKey === "fuel").amountMinor
      : null,
    componentBreakdown: compareComponents(baseline.model, scenario.model),
    fuelComparison,
    missingData: effectiveMissingData,
    warnings: [...new Set(globalIssues.warnings)],
    invalidFields: [...new Set(globalIssues.invalidFields)],
    blockers: [...new Set(globalIssues.blockers)],
    confidence,
    economicReliability,
    baselineConfidence: context?.baselineConfidence || null,
    baselineSourceMap: context?.baselineSourceMap || null,
    scenarioVariants,
    scenarioPlanning,
    timingComparison,
    forecast,
    budgetVariance,
    plannedVsActual,
    operationalRisk,
    routeAlternative,
    routePassage: {
      baseline: context?.routeEvidence?.baseline?.passage || null,
      scenario: context?.routeEvidence?.scenario?.passage || null,
      vehicleByCount: context?.routeEvidence?.vehiclePassageEvidenceByCount || {},
    },
    dispatchAlternative,
    componentCoverage,
    costCoverage,
    partialCost: hasPartialCost ? {
      status: "PARTIAL",
      estimatedCostMinor: scenarioCost,
      included: "Kanonik gerçek gider ledger'ı ve hesaplanabilen maliyet kanıtları",
      excluded: costQualityNotes,
      warning: "Brüt maliyet görülebilir; eksik veya belirsiz kanıtlar varken net kâr ve kesin tasarruf iddiası kapalıdır.",
    } : null,
    vehiclePlanAlternatives,
    referenceResolution,
    resolvedAssumptions: {
      baseline: {
        vehicleConsumption: consumptionResolution.baseline.selected,
        fuelPrice: referenceResolution.fuelPrice.baseline,
      },
      scenario: {
        vehicleConsumption: consumptionResolution.scenario.selected,
        fuelPrice: referenceResolution.fuelPrice.scenario,
      },
      precedence: {
        vehicleConsumption: consumptionResolution.precedence,
        fuelPrice: referenceResolution.fuelPrice.precedence,
      },
    },
    comparisonDimensions: {
      labels: COMPARISON_DIMENSION_LABELS,
      vehicleRequirement: { baseline: baselineCapacity?.requiredVehicleCount ?? null, scenario: scenarioCapacity?.requiredVehicleCount ?? null, unit: "araç" },
      km: dimensions.serviceDistanceKm,
      duration: dimensions.routeDurationMinutes,
      fuel: { baseline: baseline.model.components.find((item) => item.componentKey === "fuel")?.amountMinor ?? null, scenario: scenario.model.components.find((item) => item.componentKey === "fuel")?.amountMinor ?? null, delta: previewShape.fuelDeltaMinor, unit: "kuruş" },
      cost: { baseline: baselineCost, scenario: scenarioCost, delta: costDeltaMinor, unit: "kuruş" },
      incrementalCost,
      delay: { baseline: 0, scenario: timingComparison.delayImpactMinutes, unit: "dk", status: timingComparison.status },
      capacity: { baseline: baselineCapacity?.requiredVehicleCount ?? null, scenario: scenarioCapacity?.requiredVehicleCount ?? null, unit: "kişi/araç" },
      operationalRisk,
    },
    evidence: [
      `Mevcut plan kaynağı: ${baseline.basis || "eksik"}`,
      `Alternatif senaryo kaynağı: ${scenario.basis || "eksik"}`,
      ...(scenarioPlanning ? [`Alternatif senaryo planlama kaynağı: ${scenarioPlanning.source}`, scenarioPlanning.explanation] : []),
      ...baseline.model.evidence,
      ...scenario.model.evidence,
    ],
    formulaTrace: [
      "Senaryo sonucu yalnızca preview olarak üretilir.",
      "Alternatif maliyet, mevcut operational cost model çıktısı ile aynı bileşenlerden hesaplanır.",
      ...(baseline.basis === "INTERNAL_PLANNED_COST_ANCHOR" || scenario.basis === "INTERNAL_PLANNED_COST_ANCHOR" ? ["Planlanan maliyet tabanı yalnızca araç sayısı ve hizmet günü oranında ölçeklenir; diğer etkiler açıklanamazsa sonuç boş bırakılır."] : []),
      ...(componentCoverage.hasGap ? ["Maliyet bileşeni kapsamı iki tarafta eşit olmadığı için costDeltaMinor, savingsMinor ve additionalCostMinor hesaplanmadı."] : []),
      ...(periodScope.status !== "COMPLETE" ? [`Dönem kapsamı: ${periodScope.reason}`] : []),
      ...(incrementalCost.reason ? [`Artımsal maliyet: ${incrementalCost.reason}`] : []),
      ...(costDeltaMinor !== null ? [`costDeltaMinor = scenarioCostMinor - baselineCostMinor = ${scenarioCost} - ${baselineCost}`] : ["costDeltaMinor hesaplanmadı; karşılaştırılabilir maliyet tabanı yok."]),
    ],
    provenance: {
      tenantScope: compact(context?.tenantScope, "tenant-scoped"),
      scope: compact(context?.scope, "COMPANY"),
      role: compact(context?.role, null),
      companyKind: compact(context?.companyKind, null),
      requestedBy: compact(context?.requestedBy, "authenticated-user"),
      baselineReference: compact(context?.baselineReference, "request-input"),
      baselineDataClass: context?.baselineDataClass || "INTERNAL_PLANNED",
      scenarioDataClass: scenarioPlanning?.source || "USER_SCENARIO_OVERRIDE",
      externalReference: withExternal.reference ? {
        dataClass: "EXTERNAL_REFERENCE",
        family: withExternal.reference.family || null,
        unit: withExternal.reference.unit || null,
        valueDecimal: withExternal.reference.valueDecimal || null,
        currencyCode: withExternal.reference.currencyCode || null,
        sourceName: withExternal.reference.sourceName || null,
        providerKey: withExternal.reference.providerKey || null,
        asOf: withExternal.reference.asOf || null,
        regionCode: withExternal.reference.regionCode ?? null,
        regionName: withExternal.reference.regionName || withExternal.reference.sourceMetadata?.geographicScopeLabel || null,
        scopeType: withExternal.reference.scopeType || null,
        scopeKey: withExternal.reference.scopeKey || null,
        fallbackState: withExternal.reference.fallbackState || "NONE",
        freshness: withExternal.status,
        confidence: withExternal.reference.confidence || externalReference?.confidence || "UNKNOWN",
        usedForForecast: withExternal.used,
        usedForActualTruth: false,
      } : null,
      calculationVersion: COST_SCENARIO_FORECAST_MODEL_VERSION,
      createdAt: new Date(now).toISOString(),
      status: "PREVIEW",
      previewOnly: true,
    },
    safety: {
      readOnly: true,
      previewOnly: true,
      writeAction: false,
      notPersisted: true,
      notInvoiced: true,
      notPaid: true,
      notPostedToAccounting: true,
      noLiveMutation: true,
      noQuoteFloorChange: true,
      noBudgetChange: true,
      noShiftChange: true,
      noVehicleAssignmentChange: true,
    },
  });
}
