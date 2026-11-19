import { buildOperationalCostModel } from "./operationalCostModel.js";
import { technicalVehicleConsumptionReference } from "./vehicleConsumptionReferences.js";
import { resolveVehicleCapacityReference } from "./vehiclePlanReferences.js";

const VEHICLE_TYPES = new Set(["MINIBUS", "MIDIBUS", "OTOBUS"]);
const VEHICLE_TYPE_ORDER = ["MINIBUS", "MIDIBUS", "OTOBUS"];
const DEMO_PLANNING_REFERENCE = "SEFERPAKT_DEMO_2026_CANONICAL_V1";
const DEMO_MAINTENANCE_PER_KM_MINOR = 9_500;
const DEMO_DRIVER_PER_SHIFT_MINOR = 500_000;
const FIXED_OWNERSHIP_ALTERNATIVES = ["RENT", "LEASING", "DEPRECIATION"];
const REUSABLE_FIXED_PROFILE_CATEGORIES = new Set([
  ...FIXED_OWNERSHIP_ALTERNATIVES,
  "TRAFFIC_INSURANCE",
  "CASCO",
  "MTV_TAX",
  "TAX",
  "INSPECTION",
  "EMISSION_TEST",
  "MANDATORY_DOCUMENT",
  "GPS",
  "CAMERA",
  "VEHICLE_EQUIPMENT",
  "FINANCE_CHARGE",
]);

// COMPANY may use only this public DEMO planning profile. It contains no
// ROOM fleet identity, private ledger, margin, or quote-floor data.
export const DEMO_PUBLIC_VEHICLE_ALTERNATIVES = Object.freeze([
  Object.freeze({ vehicleType: "MINIBUS", capacity: 16, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 24, source: `${DEMO_PLANNING_REFERENCE}:PUBLIC_VEHICLE_PROFILE` }),
  Object.freeze({ vehicleType: "MIDIBUS", capacity: 27, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 26, source: `${DEMO_PLANNING_REFERENCE}:PUBLIC_VEHICLE_PROFILE` }),
  Object.freeze({ vehicleType: "OTOBUS", capacity: 50, vehicleCount: 1, fuelType: "DIESEL", consumptionLitersPer100Km: 32, source: `${DEMO_PLANNING_REFERENCE}:PUBLIC_VEHICLE_PROFILE` }),
]);

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function snapshotCandidates(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  return [
    snapshot,
    snapshot.context,
    snapshot.serviceContext,
    snapshot.payload,
    snapshot.computed,
    snapshot.payload?.context,
    snapshot.payload?.serviceContext,
    snapshot.computed?.context,
    snapshot.computed?.serviceContext,
  ].filter((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate));
}

function firstArray(candidates, key) {
  return candidates.find((candidate) => Array.isArray(candidate?.[key]))?.[key] || [];
}

function positiveMoney(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function usableFleetStatus(value) {
  return !["INACTIVE", "DISABLED", "ARCHIVED", "RETIRED"].includes(compact(value).toUpperCase());
}

function sourceEvidence(actualCostInputs, componentKey) {
  const entries = (Array.isArray(actualCostInputs) ? actualCostInputs : [])
    .filter((entry) => String(entry?.componentKey || "").trim() === componentKey);
  return {
    sourceEntryIds: entries.map((entry) => entry?.entryId).filter((value) => value !== null && value !== undefined),
    sourceRefs: [...new Set(entries.map((entry) => compact(entry?.sourceRef)).filter(Boolean))],
    periods: [...new Set(entries
      .map((entry) => `${compact(entry?.periodStart)}|${compact(entry?.periodEnd)}`)
      .filter((value) => value !== "|"))],
  };
}

function planningComponentEvidence(actualCostInputs, componentKey) {
  const evidence = sourceEvidence(actualCostInputs, componentKey);
  return {
    ...evidence,
    dataClass: evidence.sourceEntryIds.length > 0
      ? "INTERNAL_ACTUAL_DERIVED"
      : "INTERNAL_DATA_PLANNING_ESTIMATE",
    actual: false,
  };
}

function planningEvidenceDataClass(planningComponents = {}) {
  const classes = Object.values(planningComponents)
    .map((component) => String(component?.evidence?.dataClass || "").trim().toUpperCase())
    .filter(Boolean);
  const hasActual = classes.includes("INTERNAL_ACTUAL_DERIVED");
  const hasDemo = classes.includes("DEMO_PLANNING_ASSUMPTION");
  const hasInternalForecastProfile = classes.includes("INTERNAL_FORECAST_PROFILE");
  if (hasActual && (hasDemo || hasInternalForecastProfile)) return "MIXED_EVIDENCE";
  if (hasActual) return "INTERNAL_ACTUAL_DERIVED";
  if (hasInternalForecastProfile && hasDemo) return "MIXED_EVIDENCE";
  if (hasInternalForecastProfile) return "INTERNAL_FORECAST_PROFILE";
  if (hasDemo) return "DEMO_PLANNING_ASSUMPTION";
  return "INTERNAL_DATA_PLANNING_ESTIMATE";
}

function dateOnly(value) {
  const text = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function inclusiveDays(periodStart, periodEnd) {
  const start = Date.parse(`${periodStart}T00:00:00Z`);
  const end = Date.parse(`${periodEnd}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function periodContains(period, targetPeriod) {
  if (!targetPeriod) return true;
  const targetStart = dateOnly(targetPeriod.periodStart);
  const targetEnd = dateOnly(targetPeriod.periodEnd || targetPeriod.periodStart);
  return Boolean(
    targetStart
    && targetEnd
    && period.periodStart <= targetStart
    && period.periodEnd >= targetEnd,
  );
}

function reusableProfileEvidence(entries, period, categoryKeys, excludedCategoryKeys = []) {
  return {
    dataClass: "INTERNAL_FORECAST_PROFILE",
    actual: false,
    sourceEntryIds: entries.map((entry) => entry.id),
    sourceRefs: [...new Set(entries.map((entry) => compact(entry.sourceRef)).filter(Boolean))],
    validity: {
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      periodDayCount: inclusiveDays(period.periodStart, period.periodEnd),
    },
    categoryKeys,
    excludedCategoryKeys,
    formula: "Kaynak dönem sabit toplamı / kaynak dönem gün sayısı × teklif planlı hizmet günü",
    applicabilityLimits: "Dönemli FORECAST/BUDGET planlama profilidir; gerçekleşmiş gider, fatura veya tahsilat değildir.",
  };
}

/**
 * Derive a reusable, period-bound planning profile from confirmed ledger rows.
 * This deliberately excludes ACTUAL rows, one-off AdBlue/HGS rows, and rows
 * without a validity period. It also fails closed when RENT, LEASING and
 * DEPRECIATION are mixed because they are alternative ownership bases.
 */
export function buildReusableVehiclePlanningProfiles({ entries = [], vehicleFleet = [], targetPeriod = null } = {}) {
  const fleetById = new Map((Array.isArray(vehicleFleet) ? vehicleFleet : [])
    .map((vehicle) => [Number(vehicle?.id), vehicle])
    .filter(([id]) => Number.isSafeInteger(id) && id > 0));
  const grouped = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const vehicleId = Number(entry?.vehicleId);
    const categoryKey = compact(entry?.categoryKey).toUpperCase();
    const periodStart = dateOnly(entry?.periodStart);
    const periodEnd = dateOnly(entry?.periodEnd);
    const amountMinor = positiveMoney(entry?.amountMinor);
    const recordKind = compact(entry?.recordKind).toUpperCase();
    const lifecycle = compact(entry?.lifecycle).toUpperCase();
    const occurrenceKind = compact(entry?.occurrenceKind).toUpperCase();
    if (!Number.isSafeInteger(vehicleId) || vehicleId <= 0 || !fleetById.has(vehicleId)) continue;
    if (!REUSABLE_FIXED_PROFILE_CATEGORIES.has(categoryKey) || amountMinor === null) continue;
    if (!(recordKind === "FORECAST" || recordKind === "BUDGET") || lifecycle !== "CONFIRMED") continue;
    if (!(occurrenceKind === "PERIODIC" || occurrenceKind === "RECURRING")) continue;
    if (!periodStart || !periodEnd || inclusiveDays(periodStart, periodEnd) <= 0) continue;
    const key = `${vehicleId}|${periodStart}|${periodEnd}`;
    const bucket = grouped.get(key) || { vehicleId, periodStart, periodEnd, entries: [] };
    bucket.entries.push({ ...entry, id: Number(entry.id), amountMinor, categoryKey });
    grouped.set(key, bucket);
  }

  const byVehicleType = {};
  const byVehicleId = {};
  for (const bucket of grouped.values()) {
    const fleetVehicle = fleetById.get(bucket.vehicleId);
    const vehicleType = compact(fleetVehicle?.type).toUpperCase();
    if (!VEHICLE_TYPES.has(vehicleType)) continue;
    const period = { periodStart: bucket.periodStart, periodEnd: bucket.periodEnd };
    const categoryKeys = [...new Set(bucket.entries.map((entry) => entry.categoryKey))];
    const ownershipKeys = FIXED_OWNERSHIP_ALTERNATIVES.filter((key) => categoryKeys.includes(key));
    const evidence = reusableProfileEvidence(bucket.entries, period, categoryKeys);
    if (!periodContains(period, targetPeriod)) {
      const profile = {
        status: "NOT_APPLICABLE",
        missing: ["Geçerli dönem maliyet profili"],
        evidence,
      };
      byVehicleId[String(bucket.vehicleId)] = profile;
      byVehicleType[vehicleType] = profile;
      continue;
    }
    if (ownershipKeys.length === 0) {
      const profile = {
        status: "BLOCKED",
        missing: ["Araç sabit giderinin sahibi belirsiz"],
        evidence,
      };
      byVehicleId[String(bucket.vehicleId)] = profile;
      byVehicleType[vehicleType] = profile;
      continue;
    }
    if (ownershipKeys.length > 1) {
      const profile = {
        status: "BLOCKED",
        missing: ["Araç sabit giderlerinin sahibi belirsiz"],
        evidence: {
          ...evidence,
          excludedCategoryKeys: ownershipKeys.slice(1),
        },
      };
      byVehicleId[String(bucket.vehicleId)] = profile;
      byVehicleType[vehicleType] = profile;
      continue;
    }
    const usableEntries = bucket.entries.filter((entry) => !FIXED_OWNERSHIP_ALTERNATIVES.includes(entry.categoryKey) || entry.categoryKey === ownershipKeys[0]);
    const fixedVehicleCostMonthlyMinor = usableEntries.reduce((sum, entry) => sum + entry.amountMinor, 0);
    const sourceDayCount = inclusiveDays(bucket.periodStart, bucket.periodEnd);
    if (!Number.isSafeInteger(fixedVehicleCostMonthlyMinor) || fixedVehicleCostMonthlyMinor <= 0 || sourceDayCount <= 0) continue;
    const profile = {
      status: "APPLICABLE",
      input: {
        fixedVehicleCostMonthlyMinor,
        allocationServiceDaysPerMonth: sourceDayCount,
        vehicleFixedCostAllocationMode: "per_service_day",
      },
      evidence,
    };
    byVehicleId[String(bucket.vehicleId)] = profile;
    // Keep the historical type projection for callers that compare a class,
    // while the selected-vehicle path uses byVehicleId to avoid borrowing a
    // same-type vehicle's profile.
    byVehicleType[vehicleType] = profile;
  }
  return { byVehicleType, byVehicleId, source: "ROOM_PERIOD_BOUND_PLANNING_PROFILE" };
}

export function resolveReusableVehiclePlanningProfile({
  entries = [],
  vehicleFleet = [],
  vehicleId = null,
  vehicleType = null,
  targetPeriod = null,
} = {}) {
  const profiles = buildReusableVehiclePlanningProfiles({ entries, vehicleFleet, targetPeriod });
  const normalizedVehicleId = Number(vehicleId);
  if (Number.isSafeInteger(normalizedVehicleId) && normalizedVehicleId > 0) {
    return profiles.byVehicleId?.[String(normalizedVehicleId)] || null;
  }
  const normalizedVehicleType = compact(vehicleType).toUpperCase();
  return normalizedVehicleType ? profiles.byVehicleType?.[normalizedVehicleType] || null : null;
}

function buildCanonicalPlanningComponents({ baselineInput = null, actualCostInputs = [], includeDemoPlanningDefaults = false } = {}) {
  if (!baselineInput || (!includeDemoPlanningDefaults && (!Array.isArray(actualCostInputs) || actualCostInputs.length === 0))) return {};
  const hasActualInputs = Array.isArray(actualCostInputs) && actualCostInputs.length > 0;
  const baselineVehicleCount = positiveInteger(baselineInput.vehicleCount) || 1;
  const routeDistanceKm = positiveNumber(baselineInput.totalDistanceKm ?? baselineInput.serviceDistanceKm);
  const model = hasActualInputs
    ? buildOperationalCostModel({
      ...baselineInput,
      roomCostLedgerInputs: actualCostInputs,
    })
    : null;
  const componentByKey = new Map((model?.components || []).map((component) => [component.componentKey, component]));
  const profile = {};

  const fixed = componentByKey.get("vehicle_fixed_allocated");
  const fixedAmount = positiveMoney(fixed?.amountMinor);
  if (fixed?.includedInBaseline && fixedAmount !== null) {
    profile.vehicle_fixed_allocated = {
      input: { explicitVehicleFixedCostAllocatedMinor: Math.round(fixedAmount / baselineVehicleCount) },
      evidence: {
        componentKey: "vehicle_fixed_allocated",
        baselineComponentMinor: fixedAmount,
        baselineVehicleCount,
        formula: "Seçili planın dağıtılmış sabit gideri / seçili araç sayısı; aday araç sayısıyla çarpılır.",
        ...planningComponentEvidence(actualCostInputs, "vehicle_fixed_allocated"),
      },
    };
  }

  const variable = componentByKey.get("vehicle_variable");
  const variableAmount = positiveMoney(variable?.amountMinor);
  if (variable?.includedInBaseline && variableAmount !== null && routeDistanceKm !== null) {
    profile.vehicle_variable = {
      input: { maintenancePerKmMinor: Math.round(variableAmount / (routeDistanceKm * baselineVehicleCount)) },
      evidence: {
        componentKey: "vehicle_variable",
        baselineComponentMinor: variableAmount,
        baselineVehicleCount,
        baselineDistanceKm: routeDistanceKm,
        formula: "Seçili planın bakım/araç değişken gideri / (rota km × seçili araç sayısı); aday rota km'siyle hesaplanır.",
        ...(hasActualInputs ? planningComponentEvidence(actualCostInputs, "vehicle_variable") : {
          dataClass: "DEMO_PLANNING_ASSUMPTION",
          actual: false,
          sourceRefs: [`${DEMO_PLANNING_REFERENCE}:REF_MAINTENANCE_RATE_2026`],
          periods: [],
        }),
      },
    };
  }

  const driver = componentByKey.get("driver_labor");
  const driverAmount = positiveMoney(driver?.amountMinor);
  if (driver?.includedInBaseline && driverAmount !== null) {
    profile.driver_labor = {
      input: { driverBasePerShiftMinor: Math.round(driverAmount / baselineVehicleCount), driverCompensationMode: "per_shift" },
      evidence: {
        componentKey: "driver_labor",
        baselineComponentMinor: driverAmount,
        baselineVehicleCount,
        formula: "Seçili planın vardiya sürücü maliyeti / seçili araç sayısı; aday eşzamanlı araç sayısıyla çarpılır.",
        ...(hasActualInputs ? planningComponentEvidence(actualCostInputs, "driver_labor") : {
          dataClass: "DEMO_PLANNING_ASSUMPTION",
          actual: false,
          sourceRefs: [`${DEMO_PLANNING_REFERENCE}:REF_DRIVER_PER_SHIFT_2026`],
          unit: "CURRENCY_PER_SHIFT_PER_VEHICLE",
          rateBasis: "Araç başına her planlı hareket",
          periodBasis: "Planlı hareket sayısı",
          periods: [],
        }),
      },
    };
  }

  const routeFees = componentByKey.get("route_fees");
  const routeFeeAmount = positiveMoney(routeFees?.amountMinor);
  if (routeFees?.includedInBaseline && routeFeeAmount !== null) {
    profile.route_fees = {
      input: { routeFeeMinor: Math.round(routeFeeAmount / baselineVehicleCount) },
      evidence: {
        componentKey: "route_fees",
        baselineComponentMinor: routeFeeAmount,
        baselineVehicleCount,
        formula: "Seçili planın HGS/rota ücretleri / seçili araç sayısı; aday araç sayısıyla çarpılır.",
        ...planningComponentEvidence(actualCostInputs, "route_fees"),
      },
    };
  }

  for (const [componentKey, inputField] of [
    ["operations_overhead", "operationsOverheadFixedMinor"],
    ["other_direct_cost", "otherDirectCostMinor"],
  ]) {
    const component = componentByKey.get(componentKey);
    const amount = positiveMoney(component?.amountMinor);
    if (!component?.includedInBaseline || amount === null) continue;
    profile[componentKey] = {
      input: { [inputField]: Math.round(amount / baselineVehicleCount) },
      evidence: {
        componentKey,
        baselineComponentMinor: amount,
        baselineVehicleCount,
        formula: `Seçili planın ${componentKey} tutarı / seçili araç sayısı; aday araç sayısıyla çarpılır.`,
        ...planningComponentEvidence(actualCostInputs, componentKey),
      },
    };
  }

  if (!profile.vehicle_variable) {
    profile.vehicle_variable = {
      input: { maintenancePerKmMinor: DEMO_MAINTENANCE_PER_KM_MINOR },
      evidence: {
        dataClass: "DEMO_PLANNING_ASSUMPTION",
        actual: false,
        componentKey: "vehicle_variable",
        sourceRefs: [`${DEMO_PLANNING_REFERENCE}:REF_MAINTENANCE_RATE_2026`],
        formula: "Kanonik FULL_DATA bakım planlama oranı × aday toplam km; gerçekleşmiş gider değildir.",
        rateMinor: DEMO_MAINTENANCE_PER_KM_MINOR,
        currencyCode: baselineInput.currencyCode || "TRY",
        applicabilityLimits: "ROOM FULL_DATA senaryo önizlemesi; actual bakım faturası veya piyasa doğrulaması değildir.",
      },
    };
  }

  if (!profile.driver_labor) {
    profile.driver_labor = {
      input: { driverBasePerShiftMinor: DEMO_DRIVER_PER_SHIFT_MINOR, driverCompensationMode: "per_shift" },
      evidence: {
        dataClass: "DEMO_PLANNING_ASSUMPTION",
        actual: false,
        componentKey: "driver_labor",
        sourceRefs: [`${DEMO_PLANNING_REFERENCE}:REF_DRIVER_PER_SHIFT_2026`],
        formula: "Kanonik FULL_DATA sürücü planlama oranı × aday araç/sefer sayısı; gerçekleşmiş gider değildir.",
        rateMinor: DEMO_DRIVER_PER_SHIFT_MINOR,
        unit: "CURRENCY_PER_SHIFT_PER_VEHICLE",
        rateBasis: "Araç başına her planlı hareket",
        periodBasis: "Planlı hareket sayısı",
        currencyCode: baselineInput.currencyCode || "TRY",
        applicabilityLimits: "ROOM FULL_DATA senaryo önizlemesi; actual maaş veya işveren maliyeti değildir.",
      },
    };
  }

  return profile;
}

function fallbackVehicleAlternatives(vehicleFleet = []) {
  const fleet = Array.isArray(vehicleFleet) ? vehicleFleet : [];
  return VEHICLE_TYPE_ORDER.map((vehicleType) => {
    const fleetVehicle = fleet.find((vehicle) => compact(vehicle?.type).toUpperCase() === vehicleType) || null;
    const capacity = resolveVehicleCapacityReference({
      vehicleType,
      canonicalCapacity: positiveInteger(fleetVehicle?.capacity),
    }).selected;
    const consumption = technicalVehicleConsumptionReference(vehicleType);
    return {
      vehicleType,
      plate: compact(fleetVehicle?.plate) || null,
      capacity: positiveInteger(fleetVehicle?.capacity) || capacity?.capacity || null,
      vehicleCount: 1,
      fuelType: consumption?.fuelType || "DIESEL",
      consumptionLitersPer100Km: consumption?.valueLitersPer100Km || null,
      source: fleetVehicle
        ? "ROOM_FLEET_PLANNING_REFERENCE"
        : "TECHNICAL_CLASS_REFERENCE",
      availability: fleetVehicle
        ? { status: String(fleetVehicle.status || "UNKNOWN").toUpperCase(), vehicleId: fleetVehicle.id ?? null }
        : { status: "NOT_IN_FLEET", vehicleId: null },
    };
  });
}

export function buildRoomVehiclePlanningEvidence(snapshot = null, {
  baselineInput = null,
  actualCostInputs = [],
  planningCostInputs = [],
  targetPeriod = null,
  vehicleFleet = [],
  driverFleet = null,
  includeDemoPlanningDefaults = false,
} = {}) {
  const candidates = snapshotCandidates(snapshot);
  const explicitAlternatives = firstArray(candidates, "vehicleAlternatives");
  const alternatives = explicitAlternatives.length ? explicitAlternatives : fallbackVehicleAlternatives(vehicleFleet);
  const publicDemoProfile = explicitAlternatives.some((item) => compact(item?.source).includes(":PUBLIC_VEHICLE_PROFILE"));
  const vehicleCostInputsByType = {};
  const accepted = [];
  const canonicalPlanningComponents = buildCanonicalPlanningComponents({ baselineInput, actualCostInputs, includeDemoPlanningDefaults });
  const reusableProfiles = buildReusableVehiclePlanningProfiles({ entries: planningCostInputs, vehicleFleet, targetPeriod });

  for (const raw of alternatives) {
    const vehicleType = compact(raw?.vehicleType).toUpperCase();
    if (!VEHICLE_TYPES.has(vehicleType) || vehicleCostInputsByType[vehicleType]) continue;
    const matchingFleetVehicles = (Array.isArray(vehicleFleet) ? vehicleFleet : [])
      .filter((vehicle) => compact(vehicle?.type).toUpperCase() === vehicleType);
    const fleetVehicle = matchingFleetVehicles[0] || null;

    const capacity = positiveInteger(raw?.capacity ?? raw?.vehicleCapacity);
    const vehicleCount = positiveInteger(raw?.vehicleCount);
    const fuelConsumptionLitersPer100Km = positiveNumber(
      raw?.consumptionLitersPer100Km ?? raw?.fuelConsumptionLitersPer100Km,
    );
    if (capacity === null && vehicleCount === null && fuelConsumptionLitersPer100Km === null) continue;

    const input = {
      vehicleType,
      ...(capacity !== null ? { vehicleCapacity: capacity } : {}),
      ...(vehicleCount !== null ? { vehicleCount } : {}),
      ...(compact(raw?.fuelType) ? { fuelType: compact(raw.fuelType).toUpperCase() } : {}),
      ...(fuelConsumptionLitersPer100Km !== null ? { fuelConsumptionLitersPer100Km } : {}),
    };
    const planningComponents = Object.fromEntries(Object.entries(canonicalPlanningComponents).map(([componentKey, component]) => [componentKey, {
      input: { ...component.input },
      evidence: { ...component.evidence },
    }]));
    const reusableProfile = reusableProfiles.byVehicleType[vehicleType];
    if (reusableProfile?.status === "APPLICABLE") {
      planningComponents.vehicle_fixed_allocated = {
        input: { ...reusableProfile.input },
        evidence: {
          componentKey: "vehicle_fixed_allocated",
          ...reusableProfile.evidence,
        },
      };
    }
    const hasCanonicalPlanningComponents = Object.keys(planningComponents).length > 0;
    const dataClass = planningEvidenceDataClass(planningComponents);
    const baseAvailability = raw?.availability
      ? {
        ...raw.availability,
        ...(raw.availability.driverId == null && Number.isSafeInteger(Number(fleetVehicle?.driverId)) && Number(fleetVehicle.driverId) > 0
          ? { driverId: Number(fleetVehicle.driverId) }
          : {}),
      }
      : (fleetVehicle
        ? {
          status: String(fleetVehicle.status || "UNKNOWN").toUpperCase(),
          vehicleId: fleetVehicle.id ?? null,
          ...(Number.isSafeInteger(Number(fleetVehicle.driverId)) && Number(fleetVehicle.driverId) > 0 ? { driverId: Number(fleetVehicle.driverId) } : {}),
        }
        : { status: "UNKNOWN", vehicleId: null });
    const availability = Array.isArray(driverFleet)
      ? {
        ...baseAvailability,
        availabilityScope: "ROOM_FLEET",
        availableVehicleCount: matchingFleetVehicles.filter((vehicle) => usableFleetStatus(vehicle?.status)).length,
        availableDriverCount: driverFleet.filter((driver) => usableFleetStatus(driver?.status)).length,
      }
      : baseAvailability;
    vehicleCostInputsByType[vehicleType] = {
      input,
      source: raw?.source || "ROOM_QUOTE_FLOOR_DRAFT_PLANNING_ASSUMPTION",
      sourceLabel: hasCanonicalPlanningComponents
        ? dataClass === "INTERNAL_ACTUAL_DERIVED"
          ? "Seçili araç ve dönem gerçek giderlerinden türetilen planlama oranı"
          : dataClass === "MIXED_EVIDENCE"
            ? "Gerçek gider ve DEMO planlama varsayımını birlikte kullanan tahmin"
            : "Seçili planın kanonik gider dağıtımından türetilen planlama tahmini"
        : publicDemoProfile
          ? "Yetkili DEMO araç planlama profili; gerçek filo veya özel maliyet değildir"
          : explicitAlternatives.length
          ? "Kanonik teklif tabanı araç planlama varsayımı"
          : "ROOM filo ve teknik sınıf planlama referansı",
      plate: compact(raw?.plate) || compact(fleetVehicle?.plate) || null,
      availability,
      planningComponents,
      planningProfile: reusableProfile || null,
      evidence: {
        dataClass: hasCanonicalPlanningComponents ? dataClass : "DEMO_PLANNING_ASSUMPTION",
        actual: false,
        source: raw?.source || "ROOM_QUOTE_FLOOR_DRAFT_PLANNING_ASSUMPTION",
        componentEvidence: planningComponents,
        availability,
        ...(reusableProfile ? { planningProfile: reusableProfile } : {}),
      },
    };
    accepted.push(vehicleType);
  }

  return {
    status: accepted.length ? "AVAILABLE" : "MISSING",
    source: accepted.length
      ? (publicDemoProfile ? "SEFERPAKT_DEMO_PUBLIC_VEHICLE_PROFILE" : explicitAlternatives.length ? "ROOM_QUOTE_FLOOR_DRAFT" : "ROOM_FLEET_AND_TECHNICAL_REFERENCE")
      : null,
    dataClass: accepted.length
      ? (() => {
        const allComponents = Object.fromEntries(Object.values(vehicleCostInputsByType)
          .flatMap((vehicle) => Object.entries(vehicle?.planningComponents || {})));
        return Object.keys(allComponents).length
          ? planningEvidenceDataClass(allComponents)
          : (explicitAlternatives.length ? "DEMO_PLANNING_ASSUMPTION" : "INTERNAL_DATA_PLANNING_ESTIMATE");
      })()
      : null,
    vehicleTypes: accepted,
    vehicleCostInputsByType,
    actual: false,
    reason: accepted.length
      ? "Alternatif araç girdileri yalnızca kanonik planlama varsayımıdır; gerçekleşmiş gider değildir."
      : "Kanonik alternatif araç planlama varsayımı bulunamadı.",
  };
}
