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

export function normalizeCostScenarioInput(input = {}, label = "Senaryo girdisi") {
  return sanitizeInput(input, label);
}

export function buildCostScenarioPreview({
  baselineInput = {},
  scenarioOverrides = {},
  context = {},
  externalReference = null,
  now = new Date(),
} = {}) {
  const baseSanitized = sanitizeInput(baselineInput, "Mevcut plan");
  const overrideSanitized = sanitizeInput(scenarioOverrides, "Alternatif senaryo");
  const globalIssues = mergeIssues(baseSanitized.issues, overrideSanitized.issues);
  const baseValues = { ...baseSanitized.values };
  const scenarioValues = { ...baseValues, ...overrideSanitized.values };

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
