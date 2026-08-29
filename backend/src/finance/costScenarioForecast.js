import {
  buildOperationalCostModel,
} from "./operationalCostModel.js";
import {
  RECOGNIZED_CURRENCY_CODES,
  safeHashId,
} from "./operationalCostMath.js";

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

function scaleForVehicles(values, issues) {
  const vehicleCount = values.vehicleCount ?? 1;
  const scaled = { ...values };
  if (vehicleCount === 0) {
    for (const field of [...SCALE_DISTANCE_FIELDS, ...SCALE_INTEGER_FIELDS, ...SCALE_MONEY_FIELDS]) {
      if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = 0;
    }
    return scaled;
  }
  for (const field of SCALE_DISTANCE_FIELDS) {
    if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = multiplyDecimal(scaled[field], vehicleCount, field, issues);
  }
  for (const field of SCALE_INTEGER_FIELDS) {
    if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = multiplyMoney(scaled[field], vehicleCount, field, issues);
  }
  for (const field of SCALE_MONEY_FIELDS) {
    if (scaled[field] !== null && scaled[field] !== undefined) scaled[field] = multiplyMoney(scaled[field], vehicleCount, field, issues);
  }
  if (scaled.shiftsPerServiceDay !== null && scaled.shiftsPerServiceDay !== undefined && scaled.serviceDayCount !== null && scaled.serviceDayCount !== undefined) {
    scaled.shiftCount = multiplyMoney(scaled.shiftsPerServiceDay, scaled.serviceDayCount, "shiftCount", issues);
    scaled.shiftCount = multiplyMoney(scaled.shiftCount, vehicleCount, "shiftCount", issues);
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
  const effectiveValues = scaleForVehicles(values, localIssues);
  const model = buildOperationalCostModel(canonicalInput(effectiveValues, context, side));
  const hasIncludedComponent = model.components.some((component) => component.includedInBaseline);
  const completeCanonical = model.status === "complete" && hasIncludedComponent && model.blockers.length === 0;
  let costMinor = completeCanonical ? model.baselineOperationalCostMinor : null;
  let basis = completeCanonical ? "OPERATIONAL_COST_MODEL" : null;
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
  if (!externalReference) return result;
  if (!reference || valueMinor === null || !["FRESH", "STALE"].includes(freshness)) {
    pushUnique(globalIssues.warnings, freshness === "EXPIRED" ? "Piyasa referansının süresi doldu; maliyet hesabına alınmadı" : "Piyasa referansı kullanılabilir bir değer sağlamadı");
    return result;
  }
  const referenceCurrency = compact(reference.currencyCode).toUpperCase();
  const baseCurrency = compact(baseValues.currencyCode, "TRY").toUpperCase();
  if (referenceCurrency && referenceCurrency !== baseCurrency) {
    pushUnique(globalIssues.blockers, "Piyasa referansı ile senaryo para birimi uyuşmuyor");
    return result;
  }
  const applyForecastPrice = scenarioValues.useExternalFuelPrice === true;
  if (result.baseline.fuelUnitPriceMinor === null || result.baseline.fuelUnitPriceMinor === undefined) {
    result.baseline.fuelUnitPriceMinor = valueMinor;
    result.baseline.fuelCurrencyCode = referenceCurrency || baseCurrency;
    result.scenario.fuelUnitPriceMinor = valueMinor;
    result.scenario.fuelCurrencyCode = referenceCurrency || baseCurrency;
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

function confidenceFor({ baseline, scenario, blockers, externalStatus, externalUsed }) {
  if (blockers.length || baseline.costMinor === null || scenario.costMinor === null) return { level: "INSUFFICIENT", score: 0, reason: "Maliyet hesabı için güvenli ve karşılaştırılabilir veri yok" };
  if (externalStatus === "EXPIRED" || externalStatus === "UNKNOWN" || externalStatus === "SOURCE_UNAVAILABLE") return { level: "LOW", score: 45, reason: "Piyasa referansı güncel veya kullanılabilir değil" };
  if (externalUsed && externalStatus === "STALE") return { level: "MEDIUM", score: 65, reason: "Karşılaştırma eski bir piyasa referansı içeriyor" };
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
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

function numberOrNull(value) {
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
  const riskAssumptions = isObject(cleanOverrides.riskAssumptions) ? { ...cleanOverrides.riskAssumptions } : {};
  for (const field of [
    "scenarioType",
    "routeAlternative",
    "dispatchAlternative",
    "scenarioStopOperations",
    "stopOperations",
    "bestCandidate",
    "riskAssumptions",
    "riskVehicleCount",
    "riskPassengerCount",
    "riskFuelUnitPriceMinor",
    "riskDistanceKm",
    "riskDurationMinutes",
  ]) delete cleanOverrides[field];
  for (const field of ["riskVehicleCount", "riskPassengerCount", "riskFuelUnitPriceMinor", "riskDistanceKm", "riskDurationMinutes"]) {
    if (input?.[field] !== undefined) riskAssumptions[field] = input[field];
  }
  return { cleanOverrides, scenarioType, routeAlternative, dispatchAlternative, stopOperations, bestCandidate, riskAssumptions };
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
  return next;
}

function buildTimingComparison({ baselineValues, scenarioValues, context = {}, routeEvidence = null }) {
  const baselineRoute = routeEvidence?.baseline || {};
  const scenarioRoute = routeEvidence?.scenario || {};
  const baselineStart = integerOrNull(context?.schedule?.baselineStartMinutes ?? baselineValues.shiftStartMinutes);
  const scenarioStart = integerOrNull(scenarioValues.shiftStartMinutes ?? baselineStart);
  const baselineDuration = numberOrNull(baselineRoute.durationMinutes ?? baselineValues.routeDurationMinutes);
  const scenarioDuration = numberOrNull(scenarioRoute.durationMinutes ?? scenarioValues.routeDurationMinutes);
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

function variantEnvelope({ type, preview, side = "scenario", rationale = "", assumptions = {} }) {
  const selected = side === "baseline" ? preview?.baseline : preview?.scenario;
  const capacityBlocked = (preview?.blockers || []).some((item) => /kapasite|capacity/i.test(item));
  return {
    scenarioType: type,
    label: VARIANT_LABELS[type] || type,
    assumptions,
    evidence: preview?.evidence || [],
    estimatedCost: selected?.costMinor ?? null,
    costDelta: side === "baseline" ? 0 : preview?.costDeltaMinor ?? null,
    vehicleRequirement: selected?.requiredVehicleCount ?? null,
    distance: preview?.dimensions?.serviceDistanceKm?.[side] ?? null,
    duration: preview?.dimensions?.routeDurationMinutes?.[side] ?? null,
    fuel: preview?.fuelDeltaMinor ?? null,
    capacity: { status: capacityBlocked ? "INVALID" : "VALID", requiredVehicleCount: selected?.requiredVehicleCount ?? null },
    delayImpact: preview?.timingComparison?.delayImpactMinutes ?? null,
    operationalRisk: preview?.operationalRisk || null,
    savings: preview?.savingsMinor ?? null,
    additionalCost: preview?.additionalCostMinor ?? null,
    confidence: preview?.confidence || { level: "INSUFFICIENT", score: 0 },
    missingData: preview?.missingData || [],
    rationale,
    status: preview?.status || "INCOMPLETE",
  };
}

function buildScenarioVariants({ preview, baselineInput, scenarioOverrides, context, externalReference, now, scenarioMeta }) {
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
  let bestPreview = baselinePreview;
  let bestSide = "baseline";
  let bestRationale = "Daha düşük maliyetli geçerli alternatif kanıtı yok; mevcut plan geçerli en uygun bounded aday olarak korundu.";
  if (preview?.status === "READY" && preview?.scenario?.costMinor !== null && preview?.scenario?.costMinor < (baselinePreview?.baseline?.costMinor ?? Number.MAX_SAFE_INTEGER)) {
    bestPreview = preview;
    bestSide = "scenario";
    bestRationale = "Mevcut planla karşılaştırılan geçerli alternatifler içinde daha düşük maliyetli seçenek.";
  }
  if (scenarioMeta?.bestCandidate) {
    const candidatePreview = buildCostScenarioPreview({
      baselineInput,
      scenarioOverrides: { ...scenarioOverrides, ...scenarioMeta.bestCandidate },
      context,
      externalReference,
      now,
      includeVariants: false,
    });
    if (candidatePreview.status === "READY" && candidatePreview.scenario?.costMinor !== null && candidatePreview.scenario.costMinor < (bestPreview?.[bestSide]?.costMinor ?? Number.MAX_SAFE_INTEGER)) {
      bestPreview = candidatePreview;
      bestSide = "scenario";
      bestRationale = "Kullanıcının açıkça sağladığı geçerli bounded aday, mevcut planla karşılaştırıldı.";
    }
  }
  const best = variantEnvelope({ type: "BEST", preview: bestPreview, side: bestSide, assumptions: scenarioMeta?.bestCandidate || scenarioOverrides, rationale: bestRationale });

  const riskInput = { ...scenarioMeta.riskAssumptions };
  const riskOverrides = {};
  if (riskInput.riskVehicleCount !== undefined) riskOverrides.vehicleCount = riskInput.riskVehicleCount;
  if (riskInput.riskPassengerCount !== undefined) riskOverrides.passengerCount = riskInput.riskPassengerCount;
  if (riskInput.riskFuelUnitPriceMinor !== undefined) riskOverrides.fuelUnitPriceMinor = riskInput.riskFuelUnitPriceMinor;
  if (riskInput.riskDistanceKm !== undefined) riskOverrides.serviceDistanceKm = riskInput.riskDistanceKm;
  if (riskInput.riskDurationMinutes !== undefined) riskOverrides.routeDurationMinutes = riskInput.riskDurationMinutes;
  const hasRiskBound = Object.keys(riskOverrides).length > 0;
  const riskPreview = hasRiskBound
    ? buildCostScenarioPreview({ baselineInput, scenarioOverrides: { ...scenarioOverrides, ...riskOverrides }, context, externalReference, now, includeVariants: false })
    : null;
  const risk = riskPreview
    ? variantEnvelope({ type: "RISK", preview: riskPreview, assumptions: riskInput, rationale: "Yalnızca açıkça verilen risk varsayımlarıyla oluşturuldu; keyfi yüzde veya olasılık kullanılmadı." })
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
} = {}) {
  const scenarioMeta = normalizeScenarioMeta(scenarioOverrides);
  const baseSanitized = sanitizeInput(baselineInput, "Mevcut plan");
  const overrideSanitized = sanitizeInput(scenarioMeta.cleanOverrides, "Alternatif senaryo");
  const globalIssues = mergeIssues(baseSanitized.issues, overrideSanitized.issues);
  let baseValues = { ...baseSanitized.values };
  let scenarioValues = { ...baseValues, ...overrideSanitized.values };
  baseValues = applyRouteEvidence(baseValues, context?.routeEvidence, "baseline");
  scenarioValues = applyRouteEvidence(scenarioValues, context?.routeEvidence, "scenario");

  const baselineCurrency = compact(baseValues.currencyCode, "TRY").toUpperCase();
  const scenarioCurrency = compact(scenarioValues.currencyCode, baselineCurrency).toUpperCase();
  if (baselineCurrency !== scenarioCurrency) pushUnique(globalIssues.blockers, "Mevcut plan ile alternatif senaryo farklı para biriminde olamaz");

  const withExternal = applyExternalReference(baseValues, scenarioValues, externalReference, globalIssues);
  const baseline = buildSide(withExternal.baseline, baseValues, context, "baseline", globalIssues);
  const scenario = buildSide(withExternal.scenario, baseValues, context, "scenario", globalIssues);
  const baselineCapacity = capacityGuard(baseline, SCENARIO_LABELS.baseline, globalIssues);
  const scenarioCapacity = capacityGuard(scenario, SCENARIO_LABELS.scenario, globalIssues);

  const baselineCost = baselineCapacity?.blocked ? null : baseline.costMinor;
  const scenarioCost = scenarioCapacity?.blocked ? null : scenario.costMinor;
  const comparable = baselineCost !== null && scenarioCost !== null && !globalIssues.blockers.length;
  const costDeltaMinor = comparable ? scenarioCost - baselineCost : null;
  const savingsMinor = costDeltaMinor !== null && costDeltaMinor < 0 ? Math.abs(costDeltaMinor) : null;
  const additionalCostMinor = costDeltaMinor !== null && costDeltaMinor > 0 ? costDeltaMinor : null;
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
    : comparable
      ? "READY"
      : "INCOMPLETE";
  const confidence = confidenceFor({ baseline: { ...baseline, costMinor: baselineCost }, scenario: { ...scenario, costMinor: scenarioCost }, blockers: globalIssues.blockers, externalStatus: withExternal.status, externalUsed: withExternal.used });
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
  const summaryText = status === "BLOCKED"
    ? "Senaryo güvenli biçimde karşılaştırılamadı; kapasite, para birimi veya giriş verisi engeli var."
    : status === "INCOMPLETE"
      ? "Senaryo önizlemesi kısmen hazır; maliyet etkisini göstermek için eksik veriler tamamlanmalı."
      : savingsMinor !== null
        ? `Alternatif senaryo yaklaşık ${savingsMinor} kuruş tasarruf sinyali veriyor; sonuç tahminidir.`
        : additionalCostMinor !== null
          ? `Alternatif senaryo yaklaşık ${additionalCostMinor} kuruş ek maliyet sinyali veriyor; sonuç tahminidir.`
          : "Mevcut plan ile alternatif senaryonun tahmini maliyeti aynı görünüyor.";

  const missingData = [...new Set([
    ...globalIssues.warnings.filter((item) => /eksik|açıklayamaz|kullanılabilir/i.test(item)),
    ...(baseline.costMinor === null ? ["Mevcut plan maliyet tabanı"] : []),
    ...(scenario.costMinor === null ? ["Alternatif senaryo maliyet tabanı"] : []),
    ...(baselineCapacity?.requiredVehicleCount === null ? ["Mevcut plan araç kapasitesi"] : []),
    ...(scenarioCapacity?.requiredVehicleCount === null ? ["Alternatif senaryo araç kapasitesi"] : []),
  ])];

  const timingComparison = buildTimingComparison({ baselineValues: baseValues, scenarioValues, context, routeEvidence: context?.routeEvidence });
  const forecast = buildPeriodEndForecast({ baselineCost, scenarioCost, baselineValues: baseValues, context });
  const budgetVariance = buildBudgetVariance({ forecast, context });
  const plannedVsActual = buildPlannedVsActual({ plannedInput: context?.plannedInput || {}, actualInput: context?.actualInput || baseValues, context });
  const previewShape = {
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
    confidence,
    timingComparison,
  };
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
  const scenarioVariants = includeVariants
    ? buildScenarioVariants({ preview: { ...previewShape, timingComparison, operationalRisk }, baselineInput, scenarioOverrides: scenarioMeta.cleanOverrides, context, externalReference, now, scenarioMeta })
    : null;

  return Object.freeze({
    ok: true,
    modelVersion: COST_SCENARIO_FORECAST_MODEL_VERSION,
    scenarioId,
    status,
    statusLabel: status === "READY" ? "Karşılaştırma hazır" : status === "BLOCKED" ? "Güvenli hesap durdu" : "Eksik veri",
    summaryText,
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
    fuelDeltaMinor: baseline.model.components.find((item) => item.componentKey === "fuel")?.includedInBaseline && scenario.model.components.find((item) => item.componentKey === "fuel")?.includedInBaseline
      ? scenario.model.components.find((item) => item.componentKey === "fuel").amountMinor - baseline.model.components.find((item) => item.componentKey === "fuel").amountMinor
      : null,
    componentBreakdown: compareComponents(baseline.model, scenario.model),
    missingData,
    warnings: [...new Set(globalIssues.warnings)],
    invalidFields: [...new Set(globalIssues.invalidFields)],
    blockers: [...new Set(globalIssues.blockers)],
    confidence,
    scenarioVariants,
    timingComparison,
    forecast,
    budgetVariance,
    plannedVsActual,
    operationalRisk,
    routeAlternative,
    dispatchAlternative,
    comparisonDimensions: {
      labels: COMPARISON_DIMENSION_LABELS,
      vehicleRequirement: { baseline: baselineCapacity?.requiredVehicleCount ?? null, scenario: scenarioCapacity?.requiredVehicleCount ?? null, unit: "araç" },
      km: dimensions.serviceDistanceKm,
      duration: dimensions.routeDurationMinutes,
      fuel: { baseline: baseline.model.components.find((item) => item.componentKey === "fuel")?.amountMinor ?? null, scenario: scenario.model.components.find((item) => item.componentKey === "fuel")?.amountMinor ?? null, delta: previewShape.fuelDeltaMinor, unit: "kuruş" },
      cost: { baseline: baselineCost, scenario: scenarioCost, delta: costDeltaMinor, unit: "kuruş" },
      delay: { baseline: 0, scenario: timingComparison.delayImpactMinutes, unit: "dk", status: timingComparison.status },
      capacity: { baseline: baselineCapacity?.requiredVehicleCount ?? null, scenario: scenarioCapacity?.requiredVehicleCount ?? null, unit: "kişi/araç" },
      operationalRisk,
    },
    evidence: [
      `Mevcut plan kaynağı: ${baseline.basis || "eksik"}`,
      `Alternatif senaryo kaynağı: ${scenario.basis || "eksik"}`,
      ...baseline.model.evidence,
      ...scenario.model.evidence,
    ],
    formulaTrace: [
      "Senaryo sonucu yalnızca preview olarak üretilir.",
      "Alternatif maliyet, mevcut operational cost model çıktısı ile aynı bileşenlerden hesaplanır.",
      ...(baseline.basis === "INTERNAL_PLANNED_COST_ANCHOR" || scenario.basis === "INTERNAL_PLANNED_COST_ANCHOR" ? ["Planlanan maliyet tabanı yalnızca araç sayısı ve hizmet günü oranında ölçeklenir; diğer etkiler açıklanamazsa sonuç boş bırakılır."] : []),
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
      scenarioDataClass: "USER_SCENARIO_OVERRIDE",
      externalReference: withExternal.reference ? {
        dataClass: "EXTERNAL_REFERENCE",
        family: withExternal.reference.family || null,
        unit: withExternal.reference.unit || null,
        valueDecimal: withExternal.reference.valueDecimal || null,
        currencyCode: withExternal.reference.currencyCode || null,
        sourceName: withExternal.reference.sourceName || null,
        providerKey: withExternal.reference.providerKey || null,
        asOf: withExternal.reference.asOf || null,
        regionCode: withExternal.reference.regionCode || null,
        scopeType: withExternal.reference.scopeType || null,
        scopeKey: withExternal.reference.scopeKey || null,
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
