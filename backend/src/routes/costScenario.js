import express from "express";
import { asyncHandler, wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { prisma } from "../prisma.js";
import { httpError } from "../errors/http.js";
import { safeHashId } from "../finance/operationalCostMath.js";
import {
  buildCostScenarioPreview,
  COST_SCENARIO_FORECAST_MODEL_VERSION,
  classifyPlanningEconomicReliability,
  materializeVehiclePlanningInputs,
} from "../finance/costScenarioForecast.js";
import { getExternalCostReference, getPassageTariffReference } from "../externalCost/externalCostReferenceService.js";
import { resolvePassageEvidence } from "../externalCost/passageTariffContract.js";
import {
  buildCanonicalRoutePassageContext,
  resolveCanonicalPassageEvidence,
  resolvePerVehiclePassageEvidence,
} from "../externalCost/routePassageBinding.js";
import { discoverAutomaticRoutePassage } from "../externalCost/routePassageDiscovery.js";
import { osrmRoute } from "../services/osrmRoute.js";
import { sumDistanceKm } from "../services/routeLearning.js";
import { resolveOperationRegion } from "../region/operationRegion.js";
import { buildOperationalCostInputs } from "../finance/roomCostLedger.js";
import { selectRoomCostScenarioEvidence } from "../finance/roomCostScenarioContext.js";
import {
  buildRoomVehiclePlanningEvidence,
  DEMO_PUBLIC_VEHICLE_ALTERNATIVES,
} from "../finance/roomVehiclePlanningEvidence.js";
import {
  getRoomQuoteFloorDraftOverview,
  scopeRoomQuoteFloorDraftOverview,
} from "../services/financialOperationsLifecycle.js";
import {
  canonicalEmptyDistanceForRoute,
  canonicalFuelTypeForVehicle,
} from "../finance/vehicleConsumptionReferences.js";
import { roomFocusShiftWhere } from "../finance/roomServiceCostContext.js";
import {
  buildContractlessServicePeriodPlanningScope,
  buildPeriodCostInputOverrides,
  buildPeriodPlanningSummary,
} from "../finance/servicePeriodPlanning.js";

const ALLOWED_SCOPES = new Set(["COMPANY", "ROOM"]);
export const COST_SCENARIO_READ_ONLY_POST_PATH = "/api/cost-scenarios/preview";
const PUBLIC_SHIFT_STATUSES = { not: "DRAFT" };
const BASELINE_FIELD_LABELS = {
  vehicleType: "Araç tipi",
  vehicleCount: "Araç sayısı",
  vehicleCapacity: "Araç kapasitesi",
  passengerCount: "Kişi / öğrenci / yolcu sayısı",
  stopCount: "Durak sayısı",
  serviceDistanceKm: "Rota mesafesi",
  totalDistanceKm: "Toplam mesafe",
  routeDurationMinutes: "Rota süresi",
  serviceDayCount: "Hizmet günü",
  shiftCount: "Sefer sayısı",
  tripCount: "Yolculuk sayısı",
  shiftStartMinutes: "Başlangıç zamanı",
};

// Canonical DEMO DB currently stops at migration 66.  HGS class belongs to
// P9 is applied in the canonical development database. Keep the field
// nullable: an absent HGS class is a real missing-data state and must not be
// inferred from the vehicle type.
export function roomScenarioVehicleSelect() {
  return {
    id: true,
    plate: true,
    capacity: true,
    type: true,
    status: true,
    driverId: true,
    hgsClass: true,
  };
}

const SHIFT_SELECT = {
  id: true, companyId: true, roomId: true, agreementId: true, vehicleId: true, driverId: true, status: true, requiredPaxOverride: true,
  routeSnapshotPolyline: true, routeSnapshotDistanceM: true, routeSnapshotDurationSec: true, routeSnapshotValidatedAt: true, routeSnapshotInputHash: true,
  startAt: true, endAt: true, hubLat: true, hubLng: true, direction: true, pattern: true,
  stops: { select: { id: true, name: true, lat: true, lng: true, order: true } },
  vehicle: { select: roomScenarioVehicleSelect() },
  driver: { select: { id: true, fullName: true } },
  _count: { select: { people: true, stops: true } },
};

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function parsePositiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

// Kept as a route-module export for existing callers/tests; the ownership
// rule lives in the canonical financial context module.
export const buildRoomFocusShiftWhere = roomFocusShiftWhere;

function requestedScope(req) {
  const scope = upper(req.body?.scope || req.query?.scope);
  if (!ALLOWED_SCOPES.has(scope)) throw httpError(400, "INVALID_SCENARIO_SCOPE", "Senaryo kapsamı COMPANY veya ROOM olmalıdır.");
  return scope;
}

function targetId(req, scope) {
  const role = upper(req.user?.role);
  const ownId = scope === "ROOM" ? req.user?.roomId : req.user?.companyId;
  const requestedId = scope === "ROOM"
    ? req.body?.roomId || req.query?.roomId
    : req.body?.companyId || req.query?.companyId;
  const parsedRequested = requestedId ? parsePositiveId(requestedId) : 0;
  if (requestedId && !parsedRequested) throw httpError(400, "INVALID_SCENARIO_TENANT", "Senaryo kapsamı kimliği geçersiz.");
  if (role !== "SUPER_ADMIN" && parsedRequested && parsedRequested !== Number(ownId || 0)) {
    throw httpError(403, "SCENARIO_TENANT_MISMATCH", "Bu senaryo başka bir tenant için açılamaz.");
  }
  const id = role === "SUPER_ADMIN" ? parsedRequested : parsePositiveId(ownId);
  if (!id) throw httpError(400, scope === "ROOM" ? "ROOM_ID_REQUIRED" : "COMPANY_ID_REQUIRED", "Senaryo kapsamı için bağlı kayıt bulunamadı.");
  return id;
}

function dateLabel(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10);
}

function routeFields(shift) {
  return {
    ...(Number(shift?.routeSnapshotDistanceM) > 0 ? { serviceDistanceKm: Number(shift.routeSnapshotDistanceM) / 1000, totalDistanceKm: Number(shift.routeSnapshotDistanceM) / 1000 } : {}),
    ...(Number(shift?.routeSnapshotDurationSec) > 0 ? { routeDurationMinutes: Number(shift.routeSnapshotDurationSec) / 60 } : {}),
  };
}

function planningAssumptionsForVehicle(baseline, scenarioOverrides = {}) {
  const vehicleType = upper(scenarioOverrides.vehicleType || baseline?.input?.vehicleType);
  const evidence = vehicleType ? baseline?.vehicleCostInputsByType?.[vehicleType] : null;
  const componentInputs = Object.values(evidence?.planningComponents || {})
    .map((component) => component?.input)
    .filter((input) => input && typeof input === "object")
    .reduce((merged, input) => ({ ...merged, ...input }), {});
  const explicitPlanningFields = [
    "driverBasePerShiftMinor",
    "driverHourlyCostMinor",
    "maintenancePerKmMinor",
    "tirePerKmMinor",
    "depreciationPerKmMinor",
    "cleaningPerShiftMinor",
    "vehicleWearPerKmMinor",
    "otherVehicleVariableCostMinor",
    "vehicleLeaseMonthlyMinor",
    "fixedVehicleCostMonthlyMinor",
    "explicitVehicleFixedCostAllocatedMinor",
    "insuranceMonthlyMinor",
    "taxAndLicenseMonthlyMinor",
  ];
  const explicitPlanningInputs = Object.fromEntries(
    explicitPlanningFields
      .map((key) => [key, scenarioOverrides?.[key]])
      .filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
  return {
    ...(evidence?.input || {}),
    ...componentInputs,
    ...explicitPlanningInputs,
  };
}

function scalePeriodRouteEvidence(routeEvidence, movementCount) {
  const count = Number(movementCount);
  if (!routeEvidence || !Number.isSafeInteger(count) || count <= 0 || count === 1) return routeEvidence;
  const scaleMetric = (metric, key) => {
    if (!metric || typeof metric !== "object") return metric;
    const value = Number(metric[key]);
    return Number.isFinite(value) ? { ...metric, [key]: Number((value * count).toFixed(4)) } : metric;
  };
  return {
    ...routeEvidence,
    baseline: scaleMetric(scaleMetric(routeEvidence.baseline, "distanceKm"), "durationMinutes"),
    scenario: scaleMetric(scaleMetric(routeEvidence.scenario, "distanceKm"), "durationMinutes"),
  };
}

export function buildContractlessPeriodPlanning({ baseline, planningSchedule, scenarioOverrides = {} } = {}) {
  if (!isContractlessMarketShift(baseline?.routeShift)) return null;
  return buildContractlessServicePeriodPlanningScope({
    planningSchedule,
    planningTemplateShifts: baseline.routeShift ? [baseline.routeShift] : [],
    planningAssumptions: planningAssumptionsForVehicle(baseline, scenarioOverrides),
  });
}

export function isContractlessMarketShift(shift) {
  const status = upper(shift?.status);
  return Boolean(
    shift
    && Number(shift.roomId || 0) === 0
    && Number(shift.agreementId || 0) === 0
    && Number(shift.vehicleId || 0) === 0
    && Number(shift.driverId || 0) === 0
    && ["REQUESTED", "OPEN", "COUNTERED", "ACCEPTED"].includes(status),
  );
}

// Contractless market requests may use the existing, explicitly labelled DEMO
// planning profile for a read-only estimate. Assigned/actual shifts must stay
// on their scoped ledger evidence and never inherit that profile implicitly.
export function shouldUseContractlessPlanningDefaults(shift) {
  return isContractlessMarketShift(shift);
}

export function classifyShiftBaselineDataClass(shift) {
  if (isContractlessMarketShift(shift)) return "INTERNAL_PLANNED";
  return shift ? "INTERNAL_ACTUAL" : "MISSING";
}

function fieldClassification({ value, source, direct = false, derived = false, applicable = true }) {
  if (!applicable) return "NOT_APPLICABLE_FOR_ROLE";
  if (value === null || value === undefined || value === "") return "TRULY_MISSING";
  if (source === "DERIVABLE_FROM_CANONICAL_DATA") return "DERIVABLE_FROM_CANONICAL_DATA";
  if (source === "REFERENCE_INPUT") return "REFERENCE_INPUT";
  if (direct) return "DIRECT_EXISTING_DATA";
  if (derived) return "DERIVABLE_FROM_CANONICAL_DATA";
  return "DIRECT_EXISTING_DATA";
}

function buildBaselineSourceMap({ input = {}, classifications = {}, source = {}, routeEvidence = null, companyKind = "COMPANY" }) {
  const routeBaseline = routeEvidence?.baseline || {};
  const map = {};
  const isPlanningOnly = ["SCHOOL", "ORGANIZATION"].includes(upper(companyKind));
  const routeFieldsSet = new Set(["serviceDistanceKm", "totalDistanceKm", "routeDurationMinutes"]);
  for (const field of Object.keys(BASELINE_FIELD_LABELS)) {
    const value = input[field] ?? null;
    const routeValue = field === "serviceDistanceKm" || field === "totalDistanceKm"
      ? routeBaseline.distanceKm
      : field === "routeDurationMinutes" ? routeBaseline.durationMinutes : null;
    const effectiveValue = routeValue !== null && routeValue !== undefined ? routeValue : value;
    const isRouteDerived = routeFieldsSet.has(field) && routeBaseline.source && routeBaseline.source !== "DB_ROUTE_SNAPSHOT";
    const isRouteDirect = routeFieldsSet.has(field) && routeBaseline.source === "DB_ROUTE_SNAPSHOT";
    const notApplicable = isPlanningOnly && ["vehicleType", "vehicleCount", "vehicleCapacity"].includes(field) && source.type === "ORGANIZATION_PLAN";
    map[field] = {
      value: effectiveValue,
      label: BASELINE_FIELD_LABELS[field],
      classification: fieldClassification({ value: effectiveValue, source: classifications[field], direct: isRouteDirect || Boolean(classifications[field] && classifications[field] !== "DERIVABLE_FROM_CANONICAL_DATA"), derived: isRouteDerived, applicable: !notApplicable }),
      source: isRouteDirect ? "DB_ROUTE_SNAPSHOT" : isRouteDerived ? routeBaseline.source : source.type || "NONE",
      missingReason: effectiveValue === null || effectiveValue === undefined || effectiveValue === ""
        ? (notApplicable ? "Bu rol için uygulanabilir bir plan alanı değildir." : "Kanonik mevcut plan veya kanonik rota verisinde bulunamadı; varsayılan değer uydurulmadı.")
        : null,
    };
  }
  return map;
}

function baselineConfidence(sourceMap) {
  const entries = Object.values(sourceMap || {});
  const missing = entries.filter((item) => item.classification === "TRULY_MISSING");
  const notApplicable = entries.filter((item) => item.classification === "NOT_APPLICABLE_FOR_ROLE");
  const level = missing.length === 0 ? "HIGH" : missing.length <= 2 ? "MEDIUM" : "LOW";
  return {
    level,
    score: level === "HIGH" ? 95 : level === "MEDIUM" ? 75 : 50,
    missingFields: missing.map((item) => item.label),
    reason: missing.length
      ? `${missing.length} alan için kanonik veri eksik; eksik değerler doldurulmadı.`
      : notApplicable.length
        ? "Rol için uygulanabilir alanlar kanonik veriden dolduruldu; rol dışı alanlar gösterilmedi."
        : "Kanonik mevcut plan girdileri ve rota kanıtı kullanılabilir.",
  };
}

function minutesFromDate(value) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function routePointsForShift(shift, stopPoints = null) {
  const hasHubCoordinates = shift?.hubLat !== null && shift?.hubLat !== undefined
    && shift?.hubLng !== null && shift?.hubLng !== undefined
    && String(shift.hubLat).trim() !== "" && String(shift.hubLng).trim() !== "";
  const hub = hasHubCoordinates && Number.isFinite(Number(shift.hubLat)) && Number.isFinite(Number(shift.hubLng))
    ? { lat: Number(shift.hubLat), lng: Number(shift.hubLng) }
    : null;
  const stops = Array.isArray(stopPoints)
    ? stopPoints
    : (Array.isArray(shift?.stops) ? shift.stops : [])
      .slice()
      .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
      .map((stop) => ({ lat: Number(stop.lat), lng: Number(stop.lng) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  const direction = String(shift?.direction || "INBOUND").toUpperCase();
  const pattern = String(shift?.pattern || "ONE_WAY").toUpperCase();
  if (!hub) return stops;
  if (pattern === "LOOP") return [hub, ...stops, hub];
  if (direction === "OUTBOUND") return [hub, ...stops];
  return [...stops, hub];
}

async function routeMetricsForPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return { distanceKm: null, durationMinutes: null, source: null, routeDetails: null };
  const routed = await osrmRoute(points);
  if (routed?.ok && Number.isFinite(Number(routed.distanceM)) && Number.isFinite(Number(routed.durationSec))) {
    return {
      distanceKm: Number((Number(routed.distanceM) / 1000).toFixed(2)),
      durationMinutes: Number((Number(routed.durationSec) / 60).toFixed(2)),
      source: "OSRM_ROUTE",
      routeDetails: routed,
    };
  }
  const distanceKm = Number(sumDistanceKm(points).toFixed(2));
  if (!(distanceKm > 0)) return { distanceKm: null, durationMinutes: null, source: null, routeDetails: null };
  return {
    distanceKm,
    durationMinutes: Number((distanceKm / 25 * 60).toFixed(2)),
    source: "ROUTE_LEARNING_HAVERSINE_FALLBACK",
    routeDetails: null,
  };
}

export function buildVehicleStopBuckets(stopPoints, vehicleCount) {
  const count = Number(vehicleCount);
  if (!Number.isSafeInteger(count) || count <= 1 || count > 6) return [];
  const orderedStops = (Array.isArray(stopPoints) ? stopPoints : [])
    .slice()
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
    .filter((stop) => Number.isFinite(Number(stop?.lat)) && Number.isFinite(Number(stop?.lng)));
  if (!orderedStops.length) return [];

  const buckets = Array.from({ length: count }, () => []);
  if (orderedStops.length < count) {
    for (let index = 0; index < count; index += 1) {
      buckets[index].push(orderedStops[index % orderedStops.length]);
    }
    return buckets;
  }

  orderedStops.forEach((stop, index) => buckets[index % count].push(stop));
  return buckets;
}

function buildBalancedPassengerBuckets(passengerCount, vehicleCount) {
  const total = Number(passengerCount);
  const count = Number(vehicleCount);
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(count) || count <= 0) return null;
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

async function buildVehicleRoutePartitions(shift, stopPoints, requestedCounts = [], { passengerCount = null } = {}) {
  const counts = [...new Set((Array.isArray(requestedCounts) ? requestedCounts : [])
    .map((value) => Number(value))
    .filter((value) => Number.isSafeInteger(value) && value > 1 && value <= 6))];
  const result = {};
  for (const vehicleCount of counts) {
    const buckets = buildVehicleStopBuckets(stopPoints, vehicleCount);
    if (!buckets.length) {
      result[String(vehicleCount)] = {
        status: "INSUFFICIENT_DATA",
        totalDistanceKm: null,
        durationMinutes: null,
        source: null,
        allocationBasis: "ORDER_BALANCED_PLANNING_ONLY",
        routes: [],
        reason: `${vehicleCount} araç için doğrulanabilir durak koordinatı bulunamadı; rota üretilmedi.`,
      };
      continue;
    }
    const passengerBuckets = buildBalancedPassengerBuckets(passengerCount, vehicleCount);
    const routes = [];
    for (let index = 0; index < buckets.length; index += 1) {
      const points = routePointsForShift(shift, buckets[index]);
      const metric = await routeMetricsForPoints(points);
      routes.push({
        vehicleIndex: index + 1,
        passengerCount: passengerBuckets?.[index] ?? null,
        stopOrders: buckets[index].map((stop) => Number(stop.order)).filter((value) => Number.isFinite(value)),
        stopIds: buckets[index].map((stop) => stop.id).filter((value) => value !== null && value !== undefined),
        stopNames: buckets[index].map((stop) => stop.name).filter(Boolean),
        distanceKm: metric.distanceKm,
        durationMinutes: metric.durationMinutes,
        source: metric.source,
      });
    }
    const validRoutes = routes.every((route) => route.distanceKm !== null && route.durationMinutes !== null);
    result[String(vehicleCount)] = {
      status: validRoutes ? "READY" : "INSUFFICIENT_DATA",
      totalDistanceKm: validRoutes ? Number(routes.reduce((sum, route) => sum + Number(route.distanceKm), 0).toFixed(2)) : null,
      durationMinutes: validRoutes ? Number(Math.max(...routes.map((route) => Number(route.durationMinutes))).toFixed(2)) : null,
      source: validRoutes ? "OSRM_ROUTE_PARTITION" : null,
      allocationBasis: "ORDER_BALANCED_PLANNING_ONLY_SHARED_STOPS_ALLOWED",
        passengerAllocationBasis: passengerBuckets ? "BALANCED_PASSENGER_PLANNING_ONLY" : null,
        passengerCount: passengerBuckets ? passengerBuckets.reduce((sum, value) => sum + value, 0) : null,
      passengerAllocationEvidenceRequested: passengerBuckets !== null,
      routes,
      reason: validRoutes
        ? "Duraklar mevcut sıraları korunarak araçlara dengeli önizleme için dağıtıldı; araç sayısı durak sayısını aştığında aynı durak birden fazla rotada kullanılabilir. Canlı atama yapılmadı."
        : "Araç bazında doğrulanabilir rota metriği bulunamadı; maliyet uydurulmadı.",
    };
  }
  return result;
}

function normalizedStopOperation(item) {
  const operation = String(item?.operation || item?.type || "").toUpperCase();
  const lat = Number(item?.lat ?? item?.point?.lat);
  const lng = Number(item?.lng ?? item?.point?.lng);
  return {
    operation,
    index: Number.isInteger(Number(item?.index)) ? Number(item.index) : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  };
}

function applyScenarioStopOperations(stopPoints, operations = []) {
  const next = stopPoints.slice();
  const applied = [];
  const errors = [];
  for (const raw of operations) {
    const item = normalizedStopOperation(raw);
    if (item.operation === "ADD") {
      if (item.lat === null || item.lng === null || item.lat < -90 || item.lat > 90 || item.lng < -180 || item.lng > 180) {
        errors.push("Eklenen senaryo durağı geçerli koordinat içermiyor");
        continue;
      }
      const insertAt = item.index === null ? next.length : Math.max(0, Math.min(next.length, item.index));
      next.splice(insertAt, 0, { lat: item.lat, lng: item.lng });
      applied.push({ operation: "ADD", index: insertAt });
    } else if (item.operation === "REMOVE") {
      if (item.index === null || item.index < 0 || item.index >= next.length) {
        errors.push("Çıkarılacak senaryo durağı bulunamadı");
        continue;
      }
      next.splice(item.index, 1);
      applied.push({ operation: "REMOVE", index: item.index });
    } else {
      errors.push("Senaryo durak işlemi ADD veya REMOVE olmalıdır");
    }
  }
  return { stopPoints: next, applied, errors };
}

function routeReferenceForShift(shift) {
  return shift?.id ? `route_${safeHashId({ id: shift.id }).slice(4)}` : null;
}

async function resolveRoutePassageEvidence(passageRequests, shift) {
  if (!Array.isArray(passageRequests) || !passageRequests.length) return resolvePassageEvidence({});
  return resolveCanonicalPassageEvidence({
    routeContext: buildCanonicalRoutePassageContext({ shift, routeId: routeReferenceForShift(shift) }),
    requests: passageRequests,
    getReference: (request) => getPassageTariffReference(request),
  });
}

function vehiclePassageSpecForCount(passageRequests, vehicleCount) {
  if (!passageRequests || typeof passageRequests !== "object" || Array.isArray(passageRequests)) return null;
  const byCount = passageRequests.vehicleByCount || passageRequests.vehiclePassageByCount || null;
  if (!byCount || typeof byCount !== "object") return null;
  const spec = byCount[String(vehicleCount)];
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return null;
  return spec;
}

async function resolveVehiclePassageEvidenceForCount(passageRequests, vehicleCount) {
  const spec = vehiclePassageSpecForCount(passageRequests, vehicleCount);
  if (!spec) return null;
  return resolvePerVehiclePassageEvidence({
    vehicleRoutes: Array.isArray(spec.vehicleRoutes) ? spec.vehicleRoutes : [],
    requestsByVehicle: spec.requestsByVehicle || {},
    getReference: (request) => getPassageTariffReference(request),
  });
}

function passageRequestsForSide(passageRequests, side, { alternativeRequested = false } = {}) {
  if (Array.isArray(passageRequests)) return side === "scenario" && alternativeRequested ? [] : passageRequests;
  if (!passageRequests || typeof passageRequests !== "object") return [];
  return Array.isArray(passageRequests[side]) ? passageRequests[side] : [];
}

function attachPassageEvidence(metric, passage) {
  return {
    ...metric,
    passage,
    ...(passage?.status === "PROVEN" && Number.isSafeInteger(passage.totalMinor) ? { routeFeeMinor: passage.totalMinor } : {}),
  };
}

function attachAutomaticPassageDiscovery(passage, discovery) {
  if (!discovery) return passage;
  return {
    ...passage,
    automaticDiscovery: discovery,
    missingReasons: passage?.status === "PROVEN"
      ? passage.missingReasons || []
      : [...new Set([...(passage?.missingReasons || []), ...(discovery.missingReasons || [])])],
  };
}

function publicRouteMetric(metric) {
  if (!metric || typeof metric !== "object") return metric;
  const { routeDetails: _routeDetails, ...publicMetric } = metric;
  return publicMetric;
}

async function buildRouteEvidence(shift, { stopOperations = [], routeAlternative = null, vehiclePartitionCounts = [], passageRequests = null, passengerCount = null } = {}) {
  const originalStops = (Array.isArray(shift?.stops) ? shift.stops : [])
    .slice()
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
    .map((stop) => ({ id: stop.id, name: stop.name, order: stop.order, lat: Number(stop.lat), lng: Number(stop.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  let scenarioStops = originalStops;
  const operationResult = applyScenarioStopOperations(scenarioStops, stopOperations);
  scenarioStops = operationResult.stopPoints;
  let alternativeStops = scenarioStops;
  const alternativeType = String(routeAlternative?.type || routeAlternative?.mode || "").toUpperCase();
  if (alternativeType === "REVERSE_STOP_ORDER") alternativeStops = scenarioStops.slice().reverse();
  const alternativePoints = routePointsForShift(shift, alternativeStops);
  // Keep the DB route snapshot precision through period scaling. Rounding a
  // 6.782 km snapshot to 6.78 before multiplying four planned movements made
  // the alternative card price 98 minor lower than the selected scenario.
  // The UI may still present two decimals; the canonical cost input must not.
  const snapshotDistanceKm = Number(shift?.routeSnapshotDistanceM) > 0 ? Number((Number(shift.routeSnapshotDistanceM) / 1000).toFixed(4)) : null;
  const snapshotDurationMinutes = Number(shift?.routeSnapshotDurationSec) > 0 ? Number((Number(shift.routeSnapshotDurationSec) / 60).toFixed(4)) : null;
  const snapshotMetric = {
    distanceKm: snapshotDistanceKm,
    durationMinutes: snapshotDurationMinutes,
    source: snapshotDistanceKm !== null || snapshotDurationMinutes !== null ? "DB_ROUTE_SNAPSHOT" : null,
  };
  const measuredBaseline = snapshotMetric.distanceKm !== null && snapshotMetric.durationMinutes !== null
    ? snapshotMetric
    : await routeMetricsForPoints(routePointsForShift(shift, originalStops));
  const baselineRouteProbe = measuredBaseline.routeDetails
    ? measuredBaseline
    : await routeMetricsForPoints(routePointsForShift(shift, originalStops));
  const measuredScenario = stopOperations.length || alternativeType
    ? await routeMetricsForPoints(alternativePoints)
    : measuredBaseline;
  const requestedAlternative = Boolean(routeAlternative || stopOperations.length);
  const routeContext = buildCanonicalRoutePassageContext({ shift, routeId: routeReferenceForShift(shift) });
  const baselineDiscovery = discoverAutomaticRoutePassage({
    routeDetails: baselineRouteProbe?.routeDetails,
    routeContext,
    hgsClass: shift?.hgsClass ?? shift?.vehicle?.hgsClass,
  });
  const explicitBaselineRequests = passageRequestsForSide(passageRequests, "baseline");
  const baselinePassage = attachAutomaticPassageDiscovery(
    await resolveRoutePassageEvidence(explicitBaselineRequests.length ? explicitBaselineRequests : (baselineDiscovery.request ? [baselineDiscovery.request] : []), shift),
    baselineDiscovery,
  );
  const explicitScenarioRequests = passageRequestsForSide(passageRequests, "scenario", { alternativeRequested: requestedAlternative });
  const scenarioPassage = attachAutomaticPassageDiscovery(
    await resolveRoutePassageEvidence(explicitScenarioRequests, shift),
    requestedAlternative ? null : baselineDiscovery,
  );
  const vehiclePartitionsByCount = await buildVehicleRoutePartitions(shift, scenarioStops, vehiclePartitionCounts, { passengerCount });
  const vehiclePassageEvidenceByCount = {};
  for (const vehicleCount of vehiclePartitionCounts) {
    const vehiclePassage = await resolveVehiclePassageEvidenceForCount(passageRequests, vehicleCount);
    if (vehiclePassage) vehiclePassageEvidenceByCount[String(vehicleCount)] = vehiclePassage;
  }
  return {
    baseline: attachPassageEvidence({ ...publicRouteMetric(measuredBaseline), stopCount: originalStops.length }, baselinePassage),
    scenario: attachPassageEvidence({ ...publicRouteMetric(measuredScenario), stopCount: alternativeStops.length }, scenarioPassage),
    vehiclePartitionEvidenceRequested: vehiclePartitionCounts.length > 0,
    passengerAllocationEvidenceRequested: passengerCount !== null && passengerCount !== undefined,
    vehiclePartitionsByCount,
    vehiclePassageEvidenceByCount,
    alternative: requestedAlternative
      ? {
        status: measuredScenario.distanceKm !== null && measuredScenario.durationMinutes !== null ? "READY" : "INSUFFICIENT_DATA",
        type: alternativeType || (stopOperations.length ? "STOP_DRAFT" : null),
        source: measuredScenario.source,
        compared: measuredScenario.distanceKm !== null || measuredScenario.durationMinutes !== null,
        applied: false,
        stopOperations: operationResult.applied,
        errors: operationResult.errors,
        reason: operationResult.errors.length ? operationResult.errors.join("; ") : "Senaryo rotası mevcut route metric owner ile yalnızca karşılaştırıldı; canlı rotaya uygulanmadı.",
      }
      : { status: "NOT_REQUESTED", type: null, source: measuredBaseline.source, compared: false, applied: false, stopOperations: [], errors: [], reason: "Rota alternatifi istenmedi." },
  };
}

async function buildPlanRouteEvidence(plan) {
  const points = (plan?.stops || [])
    .slice()
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
    .map((stop) => ({ lat: Number(stop.lat), lng: Number(stop.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  const metric = await routeMetricsForPoints(points);
  return {
    baseline: { ...metric, stopCount: points.length },
    scenario: { ...metric, stopCount: points.length },
    alternative: { status: "NOT_REQUESTED", type: null, source: metric.source, compared: false, applied: false, stopOperations: [], errors: [], reason: "Rota alternatifi istenmedi." },
  };
}

function dispatchSeam(dispatchAlternative) {
  if (!dispatchAlternative || typeof dispatchAlternative !== "object") {
    return { status: "SEAM_PROVEN_DEFERRED_TO_#20", typedInput: false, compared: false, applied: false, reason: "Dispatch önerisi veya uygulaması #20 kapsamındadır." };
  }
  const typedInput = ["vehicleId", "driverId", "routeReference"].every((key) => dispatchAlternative[key] === undefined || typeof dispatchAlternative[key] === "string" || Number.isSafeInteger(Number(dispatchAlternative[key])));
  return {
    status: "SEAM_PROVEN_DEFERRED_TO_#20",
    typedInput,
    compared: false,
    applied: false,
    alternative: {
      vehicleId: dispatchAlternative.vehicleId ?? null,
      driverId: dispatchAlternative.driverId ?? null,
      routeReference: dispatchAlternative.routeReference ?? null,
    },
    reason: "Typed dispatch draft yalnızca preview seam olarak tutuldu; öneri, atama veya uygulama yapılmadı.",
  };
}

function shiftInputs(shift) {
  if (!shift) return {};
  const emptyDistanceKm = canonicalEmptyDistanceForRoute({
    pattern: shift.pattern,
    routeSnapshotDistanceM: shift.routeSnapshotDistanceM,
  });
  const passengerCount = shift.requiredPaxOverride ?? shift._count?.people ?? null;
  return {
    ...routeFields(shift),
    ...(emptyDistanceKm !== null ? { emptyDistanceKm } : {}),
    ...(Number(passengerCount) > 0 ? { passengerCount } : {}),
    ...(Number(shift._count?.stops) > 0 ? { stopCount: shift._count.stops } : {}),
    ...(Number(shift.vehicle?.capacity) > 0 ? { vehicleCapacity: shift.vehicle.capacity } : {}),
    ...(shift.vehicle?.type ? { vehicleType: shift.vehicle.type } : {}),
    ...(shift.vehicle?.type && canonicalFuelTypeForVehicle(shift.vehicle.type)
      ? { fuelType: canonicalFuelTypeForVehicle(shift.vehicle.type) }
      : {}),
    ...(shift.vehicle ? { vehicleCount: 1 } : {}),
    ...(minutesFromDate(shift.startAt) !== null ? { shiftStartMinutes: minutesFromDate(shift.startAt) } : {}),
    ...(minutesFromDate(shift.endAt) !== null ? { shiftEndMinutes: minutesFromDate(shift.endAt) } : {}),
    ...(minutesFromDate(shift.startAt) !== null && minutesFromDate(shift.endAt) !== null
      ? { shiftDurationMinutes: Math.max(0, minutesFromDate(shift.endAt) - minutesFromDate(shift.startAt)) }
      : {}),
    shiftCount: 1,
    serviceDayCount: 1,
    tripCount: 1,
    currencyCode: "TRY",
  };
}

function shiftClassifications(shift) {
  const classifications = {};
  const contractlessMarket = isContractlessMarketShift(shift);
  const operationalClass = contractlessMarket ? "INTERNAL_PLANNED" : "INTERNAL_ACTUAL";
  for (const field of ["serviceDistanceKm", "totalDistanceKm", "routeDurationMinutes", "passengerCount", "stopCount", "vehicleCapacity", "vehicleType"]) {
    if (shiftInputs(shift)[field] !== undefined) classifications[field] = operationalClass;
  }
  if (shift && !contractlessMarket) {
    classifications.vehicleCount = "INTERNAL_ACTUAL";
    classifications.shiftCount = "INTERNAL_ACTUAL";
  }
  classifications.serviceDayCount = "INTERNAL_PLANNED";
  classifications.tripCount = "INTERNAL_PLANNED";
  return classifications;
}

function planInputs(plan, routeEvidence = null) {
  if (!plan) return {};
  const passengerCount = (plan.stops || []).reduce((sum, stop) => sum + Number(stop.passengerCount || 0), 0);
  const route = routeEvidence?.baseline || {};
  return {
    passengerCount,
    stopCount: plan.stops?.length || 0,
    ...(route.distanceKm !== null && route.distanceKm !== undefined ? { serviceDistanceKm: route.distanceKm, totalDistanceKm: route.distanceKm } : {}),
    ...(route.durationMinutes !== null && route.durationMinutes !== undefined ? { routeDurationMinutes: route.durationMinutes } : {}),
    serviceDayCount: 1,
    shiftCount: 1,
    tripCount: 1,
    ...(Number.isSafeInteger(Number(plan.startMin)) ? { shiftStartMinutes: Number(plan.startMin) } : {}),
    ...(Number.isSafeInteger(Number(plan.endMin)) ? { shiftEndMinutes: Number(plan.endMin) } : {}),
    ...(Number.isSafeInteger(Number(plan.startMin)) && Number.isSafeInteger(Number(plan.endMin))
      ? { shiftDurationMinutes: Math.max(0, Number(plan.endMin) - Number(plan.startMin)) }
      : {}),
    currencyCode: "TRY",
  };
}

function planClassifications(plan, routeEvidence = null) {
  if (!plan) return {};
  return {
    passengerCount: "INTERNAL_PLANNED",
    stopCount: "INTERNAL_PLANNED",
    serviceDayCount: "INTERNAL_PLANNED",
    shiftCount: "INTERNAL_PLANNED",
    tripCount: "INTERNAL_PLANNED",
    ...(routeEvidence?.baseline?.distanceKm !== null && routeEvidence?.baseline?.distanceKm !== undefined ? { serviceDistanceKm: "DERIVABLE_FROM_CANONICAL_DATA", totalDistanceKm: "DERIVABLE_FROM_CANONICAL_DATA" } : {}),
    ...(routeEvidence?.baseline?.durationMinutes !== null && routeEvidence?.baseline?.durationMinutes !== undefined ? { routeDurationMinutes: "DERIVABLE_FROM_CANONICAL_DATA" } : {}),
  };
}

function referenceId(scope, entity) {
  return `base_${safeHashId({ scope, companyId: entity?.companyId || null, roomId: entity?.roomId || null, shiftId: entity?.shiftId || null, planId: entity?.planId || null, agreementId: entity?.agreementId || null }).slice(4)}`;
}

async function findPreferredShift(where) {
  const validated = await prisma.shift.findFirst({
    where: preferredValidatedRouteWhere(where),
    orderBy: [{ routeSnapshotValidatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: SHIFT_SELECT,
  });
  if (validated) return { shift: validated, selection: "VALIDATED_ROUTE_SNAPSHOT" };
  const published = await prisma.shift.findFirst({
    where: { ...where, status: PUBLIC_SHIFT_STATUSES },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: SHIFT_SELECT,
  });
  return published ? { shift: published, selection: "PUBLISHED_SHIFT_FALLBACK" } : { shift: null, selection: "NO_SHIFT" };
}

// A non-null validation timestamp is not sufficient route evidence: older
// preview rows can carry a timestamp while their measured route is zero.
// Keep those rows out of the validated baseline so the scenario adapter cannot
// silently bind to an incomplete/preflight-only shift.
export function preferredValidatedRouteWhere(where = {}) {
  return {
    ...where,
    status: PUBLIC_SHIFT_STATUSES,
    routeSnapshotValidatedAt: { not: null },
    routeSnapshotDistanceM: { gt: 0 },
    routeSnapshotDurationSec: { gt: 0 },
  };
}

export function resolveCompanyScenarioContext({
  companyId = null,
  focusAgreementId = null,
  focusShiftId = null,
  selectedAgreement = null,
  selectedShift = null,
  fallbackAgreement = null,
  fallbackShift = null,
} = {}) {
  const ownCompanyId = parsePositiveId(companyId);
  const agreementId = parsePositiveId(focusAgreementId);
  const shiftId = parsePositiveId(focusShiftId);
  const explicitlySelected = Boolean(agreementId || shiftId);
  if (!explicitlySelected) {
    return {
      status: "FALLBACK",
      agreement: fallbackAgreement || null,
      shift: fallbackShift || null,
    };
  }

  const resolvedAgreementId = parsePositiveId(selectedAgreement?.id);
  const resolvedShiftId = parsePositiveId(selectedShift?.id);
  const shiftAgreementId = parsePositiveId(selectedShift?.agreementId);
  const agreementCompanyId = parsePositiveId(selectedAgreement?.companyId);
  const shiftCompanyId = parsePositiveId(selectedShift?.companyId);
  const isSameCompany = ownCompanyId > 0
    && (!selectedAgreement || agreementCompanyId === ownCompanyId)
    && (!selectedShift || shiftCompanyId === ownCompanyId);
  const isSameRequestedAgreement = !agreementId || resolvedAgreementId === agreementId;
  const isSameRequestedShift = !shiftId || resolvedShiftId === shiftId;
  const isSameShiftAgreement = !selectedShift || (shiftAgreementId > 0 && resolvedAgreementId === shiftAgreementId);
  if (!selectedAgreement || !isSameCompany || !isSameRequestedAgreement || !isSameRequestedShift || !isSameShiftAgreement) {
    return { status: "NO_CANONICAL_CONTEXT", agreement: null, shift: null };
  }

  return { status: "RESOLVED", agreement: selectedAgreement, shift: selectedShift || null };
}

async function loadCompanyBaseline(companyId, context = {}) {
  const focusAgreementId = optionalContextId(context.focusAgreementId, "INVALID_SCENARIO_AGREEMENT", "Seçili sözleşme");
  const focusShiftId = optionalContextId(context.focusShiftId, "INVALID_SCENARIO_SHIFT", "Seçili vardiya");
  const explicitlySelected = Boolean(focusAgreementId || focusShiftId);
  const [company, preferredShift, plan, budgetPlan, latestAgreement, selectedAgreement, selectedShift, agreementScopedShift, hakedisRecords] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, kind: true, regionId: true, district: true, region: { select: { id: true, name: true } } } }),
    findPreferredShift({ companyId }),
    prisma.organizationPlan.findFirst({
      where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true, companyId: true, planDate: true, status: true, roomId: true, startMin: true, endMin: true, stops: { select: { passengerCount: true, lat: true, lng: true, order: true } } },
    }),
    prisma.companyBudgetPlan.findFirst({ where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, currencyCode: true, status: true, budgetAmountMinor: true, periodStart: true, periodEnd: true, budgetApprovalState: true, budgetSource: true, version: true } }),
    prisma.agreement.findFirst({ where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, roomId: true, companyId: true, status: true, startDate: true, endDate: true } }),
    focusAgreementId
      ? prisma.agreement.findFirst({ where: { id: focusAgreementId, companyId }, select: { id: true, roomId: true, companyId: true, status: true, startDate: true, endDate: true } })
      : Promise.resolve(null),
    focusShiftId
      ? prisma.shift.findFirst({ where: { id: focusShiftId, companyId, status: { not: "DRAFT" } }, select: SHIFT_SELECT })
      : Promise.resolve(null),
    focusAgreementId && !focusShiftId
      ? findPreferredShift({ companyId, agreementId: focusAgreementId })
      : Promise.resolve({ shift: null }),
    prisma.hakedisRecord.findMany({ where: { companyId, status: { in: ["READY", "FINALIZED"] } }, orderBy: { id: "asc" }, select: { id: true, amountMinor: true, currencyCode: true, source: true, periodStart: true, periodEnd: true } }),
  ]);
  if (!company) throw httpError(404, "SCENARIO_COMPANY_NOT_FOUND", "Senaryo kapsamı bulunamadı.");

  if (focusAgreementId && !selectedAgreement) throw httpError(404, "SCENARIO_AGREEMENT_NOT_FOUND", "Seçili sözleşme bu firmada bulunamadı.");
  if (focusShiftId && !selectedShift) throw httpError(404, "SCENARIO_SHIFT_NOT_FOUND", "Seçili vardiya bu firmada bulunamadı.");
  const selectedCompanyAgreement = selectedAgreement || (selectedShift?.agreementId
    ? await prisma.agreement.findFirst({ where: { id: selectedShift.agreementId, companyId }, select: { id: true, roomId: true, companyId: true, status: true, startDate: true, endDate: true } })
    : null);
  const explicitContext = resolveCompanyScenarioContext({
    companyId,
    focusAgreementId,
    focusShiftId,
    selectedAgreement: selectedCompanyAgreement,
    selectedShift: selectedShift || agreementScopedShift.shift,
    fallbackAgreement: latestAgreement,
    fallbackShift: preferredShift.shift,
  });
  if (explicitContext.status === "NO_CANONICAL_CONTEXT") {
    throw httpError(409, "SCENARIO_SERVICE_CONTEXT_MISMATCH", "Seçili vardiya ve sözleşme aynı hizmet bağlamına ait değil.");
  }

  const shift = explicitContext.shift;
  const agreement = explicitContext.agreement;
  const useShift = Boolean(shift);
  const routeEvidence = useShift ? await buildRouteEvidence(shift) : plan ? await buildPlanRouteEvidence(plan) : null;
  const input = useShift ? shiftInputs(shift) : planInputs(plan, routeEvidence);
  const source = useShift
    ? { type: "SHIFT", label: explicitlySelected ? "Seçili vardiya" : preferredShift.selection === "VALIDATED_ROUTE_SNAPSHOT" ? "Son doğrulanmış vardiya" : "Son yayımlanmış vardiya", shiftId: shift.id, roomId: shift.roomId, companyId }
    : plan
      ? { type: "ORGANIZATION_PLAN", label: "Son organizasyon planı", planId: plan.id, roomId: plan.roomId, companyId }
      : { type: "NONE", label: "Kayıtlı plan girdisi yok", companyId };
  const baselineReference = referenceId("COMPANY", source);
  const isCompanyBudgetOwner = upper(company.kind) === "COMPANY";
  const budgetPeriodStart = dateLabel(budgetPlan?.periodStart);
  const budgetPeriodEnd = dateLabel(budgetPlan?.periodEnd);
  const actualPeriodStart = budgetPeriodStart || dateLabel(agreement?.startDate);
  const actualPeriodEnd = budgetPeriodEnd || dateLabel(agreement?.endDate);
  const actualRecordsForPeriod = actualPeriodStart && actualPeriodEnd
    ? hakedisRecords.filter((record) => dateLabel(record.periodStart) === actualPeriodStart && dateLabel(record.periodEnd) === actualPeriodEnd)
    : [];
  const authoritativeActualRecords = actualRecordsForPeriod.filter((record) => upper(record.source) === "INTERNAL_ACTUAL" && Number.isSafeInteger(Number(record.amountMinor)));
  const actualCostMinor = authoritativeActualRecords.length === actualRecordsForPeriod.length && authoritativeActualRecords.length > 0
    ? authoritativeActualRecords.reduce((sum, record) => {
      if (sum === null) return null;
      const amount = Number(record.amountMinor);
      const next = sum + amount;
      return Number.isSafeInteger(next) ? next : null;
    }, 0)
    : null;
  const plannedInput = plan && !useShift ? planInputs(plan, routeEvidence) : {};
  const vehiclePlanningEvidence = buildRoomVehiclePlanningEvidence({
    vehicleAlternatives: DEMO_PUBLIC_VEHICLE_ALTERNATIVES,
  }, {
    baselineInput: input,
    actualCostInputs: [],
    includeDemoPlanningDefaults: true,
  });
  const classifications = useShift ? shiftClassifications(shift) : planClassifications(plan, routeEvidence);
  const baselineSourceMap = buildBaselineSourceMap({ input: { ...input, ...(budgetPlan?.currencyCode ? { currencyCode: budgetPlan.currencyCode } : {}) }, classifications, source, routeEvidence, companyKind: company.kind, scope: "COMPANY" });
  const region = resolveOperationRegion({ shift, company, agreement });
  return {
    scope: "COMPANY",
    companyId,
    roomId: source.roomId || shift?.roomId || plan?.roomId || null,
    companyKind: company.kind,
    companyName: company.name,
    regionId: region.regionId,
    regionCode: region.provinceCode,
    regionName: region.regionName,
    regionResolution: region,
    source,
    input: { ...input, ...(budgetPlan?.currencyCode ? { currencyCode: budgetPlan.currencyCode } : {}) },
    plannedInput,
    routeEvidence,
    vehiclePlanningEvidence,
    vehicleCostInputsByType: vehiclePlanningEvidence.vehicleCostInputsByType,
    routeShift: shift,
    budgetEvidence: isCompanyBudgetOwner ? {
      source: budgetPlan?.budgetSource || "COMPANY_BUDGET_PLAN",
      status: budgetPlan?.status || null,
      approvalState: budgetPlan?.budgetApprovalState || null,
      budgetAmountMinor: budgetPlan?.budgetAmountMinor ?? null,
      periodStart: budgetPeriodStart || null,
      periodEnd: budgetPeriodEnd || null,
      version: budgetPlan?.version ?? null,
    } : {},
    actualEvidence: {
      actualCostMinor,
      periodStart: actualPeriodStart || null,
      periodEnd: actualPeriodEnd || null,
      recordCount: actualRecordsForPeriod.length,
      provenance: actualCostMinor !== null ? "#3_HAKEDIS_INTERNAL_ACTUAL" : "#3_NO_COMPARABLE_INTERNAL_ACTUAL",
    },
    classifications,
    baselineSourceMap,
    missingFields: Object.entries(baselineSourceMap).filter(([, item]) => item.classification === "TRULY_MISSING").map(([field]) => field),
    baselineConfidence: baselineConfidence(baselineSourceMap),
    baselineReference,
    tenantScope: `company_${safeHashId({ companyId }).slice(4)}`,
    baselineDataClass: useShift ? "INTERNAL_ACTUAL" : plan ? "INTERNAL_PLANNED" : "MISSING",
    related: {
      sourceStatus: source.type === "SHIFT" ? shift.status : plan?.status || null,
      sourceDate: source.type === "SHIFT" ? dateLabel(shift.startAt) : dateLabel(plan?.planDate),
      agreementAvailable: Boolean(agreement),
      budgetPlanAvailable: Boolean(budgetPlan),
      selectedContext: selectedContext({ shift, agreement, explicitlySelected }),
    },
  };
}

function optionalContextId(value, code, label) {
  if (value === null || value === undefined || String(value).trim() === "" || String(value).trim() === "0") return 0;
  const parsed = parsePositiveId(value);
  if (!parsed) throw httpError(400, code, `${label} geçersiz.`);
  return parsed;
}

function requestedServiceContext(req) {
  return {
    focusOfferId: optionalContextId(req.body?.focusOfferId ?? req.query?.focusOfferId, "INVALID_SCENARIO_OFFER", "Seçili teklif"),
    focusAgreementId: optionalContextId(req.body?.focusAgreementId ?? req.query?.focusAgreementId, "INVALID_SCENARIO_AGREEMENT", "Seçili sözleşme"),
    focusShiftId: optionalContextId(req.body?.focusShiftId ?? req.query?.focusShiftId, "INVALID_SCENARIO_SHIFT", "Seçili vardiya"),
  };
}

function selectedContext({ shift, agreement, explicitlySelected = false }) {
  if (shift) {
    return {
      kind: "SHIFT",
      explicitlySelected,
      shiftId: shift.id,
      agreementId: shift.agreementId || agreement?.id || null,
      status: shift.status || null,
      date: dateLabel(shift.startAt),
      vehicleId: shift.vehicleId || shift.vehicle?.id || null,
      vehiclePlate: shift.vehicle?.plate || null,
      driverId: shift.driverId || shift.driver?.id || null,
      driverName: shift.driver?.fullName || null,
    };
  }
  if (agreement) {
    return {
      kind: "AGREEMENT",
      explicitlySelected,
      shiftId: null,
      agreementId: agreement.id,
      status: agreement.status || null,
      date: agreement.startDate ? dateLabel(agreement.startDate) : null,
      vehicleId: agreement.vehicleId || agreement.vehicle?.id || null,
      vehiclePlate: agreement.vehicle?.plate || null,
      driverId: agreement.driverId || agreement.driver?.id || null,
      driverName: agreement.driver?.fullName || null,
    };
  }
  return null;
}

export function resolveRoomBaselineAgreement({
  explicitlySelected = false,
  selectedAgreement = null,
  shiftAgreement = null,
  fallbackAgreement = null,
} = {}) {
  if (selectedAgreement) return selectedAgreement;
  if (shiftAgreement) return shiftAgreement;
  return explicitlySelected ? null : fallbackAgreement;
}

async function loadRoomBaseline(roomId, actor, context = {}) {
  const focusOfferId = optionalContextId(context.focusOfferId, "INVALID_SCENARIO_OFFER", "Seçili teklif");
  const focusAgreementId = optionalContextId(context.focusAgreementId, "INVALID_SCENARIO_AGREEMENT", "Seçili sözleşme");
  const focusShiftId = optionalContextId(context.focusShiftId, "INVALID_SCENARIO_SHIFT", "Seçili vardiya");
  const explicitlySelected = Boolean(focusOfferId || focusAgreementId || focusShiftId);
  const [room, preferredShift, latestAgreement, selectedAgreement, selectedOffer, selectedShift, quoteFloorDraftOverview, vehicleFleet, driverFleet] = await Promise.all([
    prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true, status: true, regionId: true, region: { select: { id: true, name: true } } } }),
    findPreferredShift({ roomId }).then(async (preferred) => {
      if (!preferred.shift) return preferred;
      const company = await prisma.company.findUnique({ where: { id: preferred.shift.companyId }, select: { id: true, name: true, kind: true, regionId: true, region: { select: { id: true, name: true } } } });
      return { ...preferred, shift: { ...preferred.shift, company } };
    }),
    prisma.agreement.findFirst({
      where: { roomId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        companyId: true,
        roomId: true,
        status: true,
        room: { select: { id: true, regionId: true, region: { select: { id: true, name: true } } } },
        company: { select: { id: true, regionId: true, region: { select: { id: true, name: true } } } },
      },
    }),
    focusAgreementId
      ? prisma.agreement.findFirst({
        where: { id: focusAgreementId, roomId },
        select: {
          id: true,
          companyId: true,
          roomId: true,
          vehicleId: true,
          driverId: true,
          status: true,
          startDate: true,
          endDate: true,
          room: { select: { id: true, regionId: true, region: { select: { id: true, name: true } } } },
          company: { select: { id: true, name: true, kind: true, regionId: true, region: { select: { id: true, name: true } } } },
          vehicle: { select: roomScenarioVehicleSelect() },
          driver: { select: { id: true, fullName: true } },
        },
      })
      : Promise.resolve(null),
    focusOfferId
      ? prisma.shiftOffer.findFirst({
        where: { id: focusOfferId, roomId },
        select: { id: true, roomId: true, shiftId: true, status: true },
      })
      : Promise.resolve(null),
    focusShiftId || focusOfferId
      ? prisma.shift.findFirst({
        where: focusShiftId
          ? buildRoomFocusShiftWhere({ roomId, focusShiftId })
          : { status: { not: "DRAFT" }, offers: { some: { id: focusOfferId, roomId } } },
        select: SHIFT_SELECT,
      })
      : Promise.resolve(null),
    getRoomQuoteFloorDraftOverview(roomId),
    prisma.vehicle.findMany({
      where: { roomId, type: { in: ["MINIBUS", "MIDIBUS", "OTOBUS"] } },
      orderBy: [{ type: "asc" }, { id: "asc" }],
      select: roomScenarioVehicleSelect(),
    }),
    prisma.driver.findMany({
      where: { roomId },
      orderBy: { id: "asc" },
      select: { id: true, roomId: true },
    }),
  ]);
  if (!room) throw httpError(404, "SCENARIO_ROOM_NOT_FOUND", "Senaryo kapsamı bulunamadı.");
  if (focusOfferId && !selectedOffer) throw httpError(404, "SCENARIO_OFFER_NOT_FOUND", "Seçili teklif bu firmada bulunamadı.");
  if (focusAgreementId && !selectedAgreement) throw httpError(404, "SCENARIO_AGREEMENT_NOT_FOUND", "Seçili sözleşme bu firmada bulunamadı.");
  if (focusShiftId && !selectedShift) throw httpError(404, "SCENARIO_SHIFT_NOT_FOUND", "Seçili vardiya bu firmada bulunamadı.");
  if (focusOfferId && !selectedShift) throw httpError(404, "SCENARIO_OFFER_SHIFT_NOT_FOUND", "Seçili teklifin işi bulunamadı.");
  if (focusOfferId && focusShiftId && Number(selectedOffer?.shiftId || 0) !== focusShiftId) {
    throw httpError(409, "SCENARIO_OFFER_SHIFT_MISMATCH", "Seçili teklif, seçili işe ait değil.");
  }
  if (focusAgreementId && focusShiftId && Number(selectedShift?.agreementId || 0) !== focusAgreementId) {
    throw httpError(409, "SCENARIO_SERVICE_CONTEXT_MISMATCH", "Seçili vardiya, seçili sözleşmeye ait değil.");
  }
  const shift = selectedShift || (focusAgreementId
    ? await prisma.shift.findFirst({ where: { roomId, agreementId: focusAgreementId, status: PUBLIC_SHIFT_STATUSES }, orderBy: [{ startAt: "desc" }, { id: "desc" }], select: SHIFT_SELECT })
    : preferredShift.shift);
  const shiftAgreement = shift?.agreementId
    ? await prisma.agreement.findFirst({ where: { id: shift.agreementId, roomId }, select: { id: true, companyId: true, roomId: true, status: true, startDate: true, endDate: true, vehicleId: true, driverId: true, room: { select: { id: true, regionId: true, region: { select: { id: true, name: true } } } }, company: { select: { id: true, name: true, kind: true, regionId: true, region: { select: { id: true, name: true } } } }, vehicle: { select: roomScenarioVehicleSelect() }, driver: { select: { id: true, fullName: true } } } })
    : null;
  const activeAgreement = resolveRoomBaselineAgreement({
    explicitlySelected,
    selectedAgreement,
    shiftAgreement,
    fallbackAgreement: latestAgreement,
  });
  let hydratedShift = shift;
  if (shift && !shift.company) {
    const company = await prisma.company.findUnique({ where: { id: shift.companyId }, select: { id: true, name: true, kind: true, regionId: true, region: { select: { id: true, name: true } } } });
    hydratedShift = { ...shift, company };
  }
  const agreement = activeAgreement;
  const source = shift
    ? { type: "SHIFT", label: explicitlySelected ? (isContractlessMarketShift(hydratedShift) ? "Sözleşmesiz talep" : "Seçili vardiya") : (preferredShift.selection === "VALIDATED_ROUTE_SNAPSHOT" ? "Son doğrulanmış vardiya" : "Son yayımlanmış vardiya"), shiftId: shift.id, agreementId: shift.agreementId || agreement?.id || null, roomId, companyId: shift.companyId }
    : agreement
      ? { type: "AGREEMENT", label: "Son sözleşme bağlamı", agreementId: agreement.id, roomId, companyId: agreement.companyId }
      : { type: "NONE", label: "Kayıtlı plan girdisi yok", roomId };
  const routeEvidence = hydratedShift ? await buildRouteEvidence(hydratedShift) : null;
  const input = shiftInputs(hydratedShift);
  const planningInputs = actor
    ? await buildOperationalCostInputs({ actor, roomId, prisma })
    : null;
  const serviceCostSelection = explicitlySelected
    ? {
      offerId: focusOfferId || null,
      agreementId: focusAgreementId || hydratedShift?.agreementId || agreement?.id || null,
      shiftId: focusShiftId || hydratedShift?.id || null,
    }
    : null;
  const selectedScenarioEvidence = explicitlySelected && planningInputs
    ? selectRoomCostScenarioEvidence({
      planningInputs,
      selection: serviceCostSelection,
      targetShift: hydratedShift,
      roomId,
    })
    : null;
  const planningEvidence = selectedScenarioEvidence?.planningEvidence
    || planningInputs?.planningEvidence
    || null;
  const scenarioActualCostInputs = selectedScenarioEvidence?.allocation?.operationalInputs?.inputs || null;
  const forecastCostInputs = selectedScenarioEvidence?.forecastCostInputs || [];
  const scopedQuoteFloorDraft = scopeRoomQuoteFloorDraftOverview(
    quoteFloorDraftOverview,
    serviceCostSelection,
  )?.current || null;
  const vehiclePlanningEvidence = buildRoomVehiclePlanningEvidence(scopedQuoteFloorDraft?.inputSnapshot || null, {
    baselineInput: input,
    actualCostInputs: scenarioActualCostInputs || [],
    planningCostInputs: planningInputs?.entries || [],
    targetPeriod: isContractlessMarketShift(hydratedShift)
      ? {
        periodStart: dateLabel(hydratedShift.startAt),
        periodEnd: dateLabel(hydratedShift.endAt || hydratedShift.startAt),
      }
      : null,
    vehicleFleet,
    driverFleet,
    includeDemoPlanningDefaults: shouldUseContractlessPlanningDefaults(hydratedShift),
  });
  const actualBucket = planningEvidence?.actual || planningInputs?.buckets?.ACTUAL || null;
  const budgetBucket = planningEvidence?.budget || planningInputs?.buckets?.BUDGET || null;
  const forecastBucket = planningEvidence?.forecast || planningInputs?.buckets?.FORECAST || null;
  const accrualBucket = planningEvidence?.accrual || planningInputs?.buckets?.ACCRUAL || null;
  const classifications = hydratedShift ? shiftClassifications(hydratedShift) : {};
  const baselineSourceMap = buildBaselineSourceMap({ input, classifications, source, routeEvidence, companyKind: shift?.company?.kind || "COMPANY", scope: "ROOM" });
  const region = resolveOperationRegion({ shift: hydratedShift, room, company: hydratedShift?.company, agreement });
  return {
    scope: "ROOM",
    roomId,
    companyId: hydratedShift?.companyId || agreement?.companyId || null,
    companyKind: hydratedShift?.company?.kind || agreement?.company?.kind || "COMPANY",
    companyName: hydratedShift?.company?.name || agreement?.company?.name || null,
    roomName: room.name,
    regionId: region.regionId,
    regionCode: region.provinceCode,
    regionName: region.regionName,
    regionResolution: region,
    source,
    input,
    plannedInput: {},
    planningEvidence,
    vehiclePlanningEvidence,
    vehicleCostInputsByType: vehiclePlanningEvidence.vehicleCostInputsByType,
    scenarioActualCostInputs,
    forecastCostInputs,
    routeEvidence,
    routeShift: hydratedShift,
    contractlessPlanningDefaults: isContractlessMarketShift(hydratedShift)
      ? {
        periodStart: dateLabel(hydratedShift.startAt),
        periodEnd: dateLabel(hydratedShift.endAt || hydratedShift.startAt),
        direction: upper(hydratedShift.direction) || null,
        pattern: upper(hydratedShift.pattern) || null,
        scheduleSource: "SHIFT_DATE_RANGE_ONLY",
        scheduleFieldsAvailable: false,
        missingFields: ["Çalışma günleri", "Günlük sefer sıklığı", "Günlük hizmet saati"],
      }
      : null,
    budgetEvidence: budgetBucket ? {
      source: "ROOM_COST_LEDGER_BUDGET",
      budgetAmountMinor: budgetBucket.netAmountMinor ?? budgetBucket.grossAmountMinor ?? null,
      periodStart: budgetBucket.known?.[0]?.periodStart || null,
      periodEnd: budgetBucket.known?.[0]?.periodEnd || null,
      status: budgetBucket.blockers?.length ? "INSUFFICIENT_DATA" : budgetBucket.entryCount ? "READY" : "MISSING",
    } : {},
    actualEvidence: {
      actualCostMinor: actualBucket?.netAmountMinor ?? null,
      actualGrossCostMinor: actualBucket?.grossAmountMinor ?? null,
      periodStart: actualBucket?.known?.[0]?.periodStart || null,
      periodEnd: actualBucket?.known?.[0]?.periodEnd || null,
      netRollupBlocked: actualBucket?.netRollupBlocked === true || planningEvidence?.netRollupEligible === false,
      recordCount: actualBucket?.entryCount || 0,
      provenance: actualBucket?.entryCount ? "#ROOM_COST_LEDGER_ACTUAL" : "#ROOM_COST_LEDGER_NO_CONFIRMED_ACTUAL",
    },
    forecastEvidence: forecastBucket ? {
      forecastAmountMinor: forecastBucket.netAmountMinor ?? forecastBucket.grossAmountMinor ?? null,
      periodStart: forecastBucket.known?.[0]?.periodStart || null,
      periodEnd: forecastBucket.known?.[0]?.periodEnd || null,
      status: forecastBucket.blockers?.length ? "INSUFFICIENT_DATA" : forecastBucket.entryCount ? "READY" : "MISSING",
    } : {},
    accrualEvidence: accrualBucket ? {
      accrualAmountMinor: accrualBucket.netAmountMinor ?? accrualBucket.grossAmountMinor ?? null,
      periodStart: accrualBucket.known?.[0]?.periodStart || null,
      periodEnd: accrualBucket.known?.[0]?.periodEnd || null,
      status: accrualBucket.blockers?.length ? "INSUFFICIENT_DATA" : accrualBucket.entryCount ? "READY" : "MISSING",
    } : {},
    classifications,
    baselineSourceMap,
    missingFields: Object.entries(baselineSourceMap).filter(([, item]) => item.classification === "TRULY_MISSING").map(([field]) => field),
    baselineConfidence: baselineConfidence(baselineSourceMap),
    baselineReference: referenceId("ROOM", source),
    tenantScope: `room_${safeHashId({ roomId }).slice(4)}`,
    baselineDataClass: hydratedShift
      ? classifyShiftBaselineDataClass(hydratedShift)
      : agreement
        ? "INTERNAL_PLANNED"
        : "MISSING",
    related: {
      sourceStatus: source.type === "SHIFT" ? hydratedShift.status : agreement?.status || null,
      agreementAvailable: Boolean(agreement),
      selectedContext: selectedContext({ shift: hydratedShift, agreement, explicitlySelected }),
      selectedOfferId: focusOfferId || null,
      selectedOfferStatus: selectedOffer?.status || null,
    },
  };
}

async function loadBaseline(req, scope) {
  const id = targetId(req, scope);
  return scope === "ROOM" ? loadRoomBaseline(id, req.user, requestedServiceContext(req)) : loadCompanyBaseline(id, requestedServiceContext(req));
}

// #5 Sefer Abi consumes the same tenant-scoped baseline and route evidence as
// the public #4 endpoints. This is an adapter, not a second scenario owner.
export async function loadCostScenarioBaselineForUser({
  user,
  scope,
  companyId = null,
  roomId = null,
  focusOfferId = null,
  focusAgreementId = null,
  focusShiftId = null,
} = {}) {
  const scopeKey = upper(scope);
  if (!ALLOWED_SCOPES.has(scopeKey)) {
    throw httpError(400, "INVALID_SCENARIO_SCOPE", "Senaryo kapsamı COMPANY veya ROOM olmalıdır.");
  }
  const ownId = scopeKey === "ROOM" ? user?.roomId : user?.companyId;
  const requestedId = scopeKey === "ROOM" ? roomId : companyId;
  const parsedRequested = requestedId ? parsePositiveId(requestedId) : 0;
  const role = upper(user?.role);
  if (requestedId && !parsedRequested) {
    throw httpError(400, "INVALID_SCENARIO_TENANT", "Senaryo kapsamı kimliği geçersiz.");
  }
  if (role !== "SUPER_ADMIN" && parsedRequested && parsedRequested !== Number(ownId || 0)) {
    throw httpError(403, "SCENARIO_TENANT_MISMATCH", "Bu senaryo başka bir tenant için açılamaz.");
  }
  const id = role === "SUPER_ADMIN" ? parsedRequested : parsePositiveId(ownId);
  if (!id) {
    throw httpError(400, scopeKey === "ROOM" ? "ROOM_ID_REQUIRED" : "COMPANY_ID_REQUIRED", "Senaryo kapsamı için bağlı kayıt bulunamadı.");
  }
  return scopeKey === "ROOM"
    ? loadRoomBaseline(id, user, { focusOfferId, focusAgreementId, focusShiftId })
    : loadCompanyBaseline(id, { focusAgreementId, focusShiftId });
}

// The assistant uses this exact #4 calculator with a baseline loaded above.
// It deliberately exposes no persistence or mutation path.
export async function buildCostScenarioPreviewFromBaseline({
  user,
  baseline,
  scenarioOverrides = {},
  externalReference = null,
  independentRouteQuoteAdvice = false,
  periodPlanning = null,
  routeDistanceAlreadyAggregated = false,
  routeEvidenceOverride = null,
} = {}) {
  if (!baseline || !ALLOWED_SCOPES.has(upper(baseline.scope))) {
    throw httpError(400, "SCENARIO_BASELINE_REQUIRED", "Senaryo için kanonik mevcut plan gerekli.");
  }
  const routeEvidence = routeEvidenceOverride || (baseline.routeShift
    ? await buildRouteEvidence(baseline.routeShift, {
      stopOperations: scenarioOverrides.scenarioStopOperations || scenarioOverrides.stopOperations || [],
      routeAlternative: scenarioOverrides.routeAlternative || null,
      passageRequests: scenarioOverrides.routePassageRequests || scenarioOverrides.routeAlternative?.passageRequests || null,
      vehiclePartitionCounts: [2, 3],
      passengerCount: scenarioOverrides.passengerCount ?? baseline.input?.passengerCount ?? baseline.routeShift?.requiredPaxOverride ?? null,
    })
    : baseline.routeEvidence);
  const selectedVehicleCount = Number(scenarioOverrides.vehicleCount || 0);
  const selectedRoutePartition = selectedVehicleCount > 1
    ? routeEvidence?.vehiclePartitionsByCount?.[String(selectedVehicleCount)] || null
    : null;
  if (selectedRoutePartition?.status === "READY"
    && periodPlanning?.plannedMovementCount > 0
    && Number.isFinite(Number(selectedRoutePartition.totalDistanceKm))
    && Number.isFinite(Number(selectedRoutePartition.durationMinutes))) {
    const movementCount = Number(periodPlanning.plannedMovementCount);
    scenarioOverrides = {
      ...scenarioOverrides,
      serviceDistanceKm: Number((Number(selectedRoutePartition.totalDistanceKm) * movementCount).toFixed(4)),
      totalDistanceKm: Number((Number(selectedRoutePartition.totalDistanceKm) * movementCount).toFixed(4)),
      routeDurationMinutes: Number((Number(selectedRoutePartition.durationMinutes) * movementCount).toFixed(4)),
    };
    routeDistanceAlreadyAggregated = true;
  }
  const planningVehicleType = upper(scenarioOverrides.vehicleType || baseline.input?.vehicleType);
  const rawPlanningEvidence = independentRouteQuoteAdvice
    ? baseline.vehicleCostInputsByType?.[planningVehicleType]
    : null;
  const independentPlanningEvidence = rawPlanningEvidence
    ? {
      ...rawPlanningEvidence,
      planningComponents: Object.fromEntries(
        Object.entries(rawPlanningEvidence.planningComponents || {})
          .filter(([componentKey]) => componentKey !== "route_fees"),
      ),
    }
    : null;
  const requiredVehicleCount = Math.max(1, Number(scenarioOverrides.vehicleCount || rawPlanningEvidence?.input?.vehicleCount || baseline.input?.vehicleCount || 1));
  const materializedPlanning = independentPlanningEvidence
    ? materializeVehiclePlanningInputs(independentPlanningEvidence, requiredVehicleCount)
    : { input: {}, evidence: {}, componentKeys: [] };
  const userAssumptionFields = new Set([
    "driverBasePerShiftMinor",
    "maintenancePerKmMinor",
    "tirePerKmMinor",
    "depreciationPerKmMinor",
    "cleaningPerShiftMinor",
    "vehicleWearPerKmMinor",
    "otherVehicleVariableCostMinor",
    "vehicleLeaseMonthlyMinor",
    "fixedVehicleCostMonthlyMinor",
    "explicitVehicleFixedCostAllocatedMinor",
    "insuranceMonthlyMinor",
    "taxAndLicenseMonthlyMinor",
  ]);
  const userAssumptionUsed = Object.keys(scenarioOverrides || {}).some((field) => userAssumptionFields.has(field));
  const economicReliability = classifyPlanningEconomicReliability({
    planningEvidence: materializedPlanning.evidence,
    dataClass: rawPlanningEvidence?.dataClass || independentPlanningEvidence?.evidence?.dataClass,
    userAssumptionUsed,
  });
  const independentPlanning = independentRouteQuoteAdvice && materializedPlanning.componentKeys.length > 0
    ? {
      ...materializedPlanning,
      requiredVehicleCount,
      input: {
        ...(rawPlanningEvidence.input || {}),
        ...materializedPlanning.input,
        ...(planningVehicleType ? { vehicleType: planningVehicleType } : {}),
        ...(scenarioOverrides.vehicleCapacity != null ? { vehicleCapacity: scenarioOverrides.vehicleCapacity } : {}),
      },
      source: "INTERNAL_DATA_PLANNING_ESTIMATE",
      dataClass: rawPlanningEvidence?.dataClass || independentPlanningEvidence?.evidence?.dataClass || null,
      economicReliability,
      userAssumptionUsed,
      explanation: "Geçmiş anlaşma veya eski gerçekleşmiş gider kullanılmadan, seçili araç sınıfının kanonik planlama bileşenleri yeni rota senaryosuna uygulandı.",
      consumptionPlanningValue: rawPlanningEvidence.input?.fuelConsumptionLitersPer100Km ?? null,
      consumptionPlanningReference: rawPlanningEvidence.input?.fuelConsumptionLitersPer100Km != null
        ? {
          sourceName: rawPlanningEvidence.sourceLabel || "Kanonik araç planlama varsayımı",
          sourceDate: rawPlanningEvidence.evidence?.sourceDate || null,
          version: rawPlanningEvidence.source || null,
          confidence: "MEDIUM",
          applicabilityLimits: "Teklif planlaması için açık varsayımdır; gerçekleşmiş araç tüketimi değildir.",
        }
        : null,
    }
    : null;
  const isolatedPlanningContext = independentRouteQuoteAdvice
    ? {
      actualInput: {},
      actualCostInputs: [],
      actualEvidence: null,
      forecastEvidence: {},
      forecastCostInputs: baseline.forecastCostInputs || [],
      plannedInput: {},
      baselineDataClass: "INTERNAL_PLANNED",
      scenarioPlanningInput: independentPlanning,
      // materializeVehiclePlanningInputs has already multiplied the
      // per-shift driver base by the selected vehicle count. Keep the period
      // movement count unchanged so driver labor is not scaled twice.
      driverBaseAlreadyAggregated: Boolean(independentPlanning?.componentKeys?.includes("driver_labor")),
      // Alternative cards still need the same explicit planning profile used
      // by the selected scenario (capacity, consumption, availability and
      // planning components). Keep actual ledger inputs out of this map so a
      // contractless preview cannot inherit realized costs while the UI can
      // still build the correct 16-seat/29-seat/50-seat alternatives and
      // their partition evidence.
      vehicleCostInputsByType: Object.fromEntries(
        Object.entries(baseline.vehicleCostInputsByType || {}).map(([vehicleType, evidence]) => [vehicleType, {
          dataClass: evidence?.dataClass || "DEMO_PLANNING_ASSUMPTION",
          input: evidence?.input || {},
          planningComponents: evidence?.planningComponents || {},
          planningProfile: evidence?.planningProfile || null,
          availability: evidence?.availability || null,
          source: evidence?.source || null,
          sourceLabel: evidence?.sourceLabel || null,
          evidence: evidence?.evidence || null,
        }]),
      ),
      periodPlanning,
      routeDistanceAlreadyAggregated,
    }
    : {};
  return buildCostScenarioPreview({
    baselineInput: baseline.input,
    scenarioOverrides,
    externalReference,
    context: {
      scope: baseline.scope,
      role: user?.role,
      companyKind: baseline.companyKind,
      tenantScope: baseline.tenantScope,
      requestedBy: "authenticated-user",
      baselineReference: baseline.baselineReference,
      baselineDataClass: baseline.baselineDataClass,
      baselineConfidence: baseline.baselineConfidence,
      baselineSourceMap: baseline.baselineSourceMap,
      shiftReference: baseline.source?.shiftId ? `shift_${safeHashId({ id: baseline.source.shiftId }).slice(4)}` : "",
      routeReference: baseline.source?.shiftId ? `route_${safeHashId({ id: baseline.source.shiftId }).slice(4)}` : "",
      vehicleReference: baseline.input?.vehicleCount ? "selected-vehicle" : "",
      actualInput: independentRouteQuoteAdvice ? {} : baseline.input,
      actualCostInputs: independentRouteQuoteAdvice
        ? []
        : baseline.scenarioActualCostInputs || baseline.planningEvidence?.actualInputs || [],
      // Offer-scoped forecast entries are read-only planning inputs. They are
      // safe to carry into a contractless ROOM quote, while actual ledger
      // inputs remain deliberately empty in this path.
      forecastCostInputs: baseline.forecastCostInputs || [],
      plannedInput: independentRouteQuoteAdvice ? {} : baseline.plannedInput,
      budgetEvidence: independentRouteQuoteAdvice ? {} : baseline.budgetEvidence,
      forecastEvidence: independentRouteQuoteAdvice
        ? {}
        : {
          ...baseline.budgetEvidence,
          ...(baseline.forecastEvidence || {}),
          ...(baseline.actualEvidence || {}),
          actualToDateMinor: baseline.actualEvidence?.actualCostMinor ?? null,
        },
      actualEvidence: independentRouteQuoteAdvice ? null : baseline.actualEvidence,
      vehicleCostInputsByType: independentRouteQuoteAdvice ? {} : baseline.vehicleCostInputsByType || {},
      // Contractless ROOM quoting is an operating-cost decision too. Actual
      // ROOM service previews remain backward compatible, while this read-only
      // offer path fails closed when fixed, auxiliary-consumption, or route-fee
      // evidence is not available.
      requireFullOperatingCostEvidence: baseline.scope === "COMPANY"
        || (baseline.scope === "ROOM" && independentRouteQuoteAdvice),
      ...isolatedPlanningContext,
      independentRouteQuoteAdvice: independentRouteQuoteAdvice === true,
      routeEvidence,
      schedule: { baselineStartMinutes: baseline.input?.shiftStartMinutes ?? null },
      dispatchAlternative: dispatchSeam(null),
    },
  });
}

function publicBaseline(baseline) {
  const input = { ...baseline.input };
  const source = {
    type: baseline.source?.type || "NONE",
    label: baseline.source?.label || "Kayıtlı plan girdisi yok",
  };
  return {
    modelVersion: COST_SCENARIO_FORECAST_MODEL_VERSION,
    scope: baseline.scope,
    companyKind: baseline.companyKind,
    companyName: baseline.companyName,
    roomName: baseline.roomName || null,
    regionId: baseline.regionId || null,
    regionCode: baseline.regionCode || null,
    regionName: baseline.regionName || null,
    regionResolution: baseline.regionResolution || null,
    planningOnly: baseline.companyKind !== "COMPANY" || isContractlessMarketShift(baseline.routeShift),
    normalBudgetLifecycle: baseline.companyKind === "COMPANY" && !isContractlessMarketShift(baseline.routeShift),
    baselineReferenceId: baseline.baselineReference,
    source,
    input,
    classifications: baseline.classifications,
    baselineSourceMap: baseline.baselineSourceMap,
    contractlessPlanningDefaults: baseline.contractlessPlanningDefaults || null,
    missingFields: baseline.missingFields || [],
    baselineConfidence: baseline.baselineConfidence || { level: "LOW", score: 50, missingFields: [], reason: "Baseline güveni hesaplanamadı." },
    routeEvidence: baseline.routeEvidence || null,
    vehiclePlanningEvidence: baseline.vehiclePlanningEvidence || null,
    related: baseline.related,
    capabilities: {
      vehicleCount: true,
      vehicleType: true,
      passengerCount: true,
      stopCount: true,
      serviceDistanceKm: true,
      routeDurationMinutes: true,
      serviceDayCount: true,
      externalReference: true,
      expectedScenario: true,
      bestScenario: true,
      riskScenario: true,
      periodEndForecast: true,
      budgetVariance: baseline.companyKind === "COMPANY",
      plannedVsActual: true,
      vehicleAddRemove: true,
      stopAddRemove: true,
      shiftTime: true,
      routeAlternative: true,
      dispatchSeam: true,
      delayComparison: true,
      operationalRisk: true,
    },
    safety: { readOnly: true, previewOnly: true, noLiveMutation: true, noPersistence: true },
  };
}

function externalQuery(body = {}) {
  if (!body.externalReference || typeof body.externalReference !== "object") return null;
  const requested = body.externalReference;
  return {
    providerKey: requested.providerKey,
    family: requested.family,
    unit: requested.unit,
    currencyCode: requested.currencyCode,
    regionCode: requested.regionCode,
    scopeType: requested.scopeType,
    scopeKey: requested.scopeKey,
  };
}

export function costScenarioRouter() {
  const r = express.Router();
  r.get("/baseline", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
    const scope = requestedScope(req);
    const baseline = await loadBaseline(req, scope);
    return res.json({ ok: true, data: publicBaseline(baseline) });
  }));

  r.post("/preview", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), asyncHandler(async (req, res) => {
    const scope = requestedScope(req);
    const baseline = await loadBaseline(req, scope);
    if (req.body?.baselineReferenceId && String(req.body.baselineReferenceId) !== baseline.baselineReference) {
      throw httpError(409, "SCENARIO_BASELINE_CHANGED", "Mevcut plan değişti; senaryoyu güncel planla yeniden hesaplayın.");
    }
    const requestedExternal = externalQuery(req.body);
    const externalReference = requestedExternal ? await getExternalCostReference(requestedExternal) : null;
    const requestedScenarioOverrides = req.body?.scenarioOverrides || {};
    const requestedBaselineInput = { ...baseline.input, ...(req.body?.baselineInput || {}) };
    const contractlessPeriodPlanning = scope === "ROOM"
      ? buildContractlessPeriodPlanning({
        baseline,
        planningSchedule: req.body?.planningSchedule,
        scenarioOverrides: requestedScenarioOverrides,
      })
      : null;
    const periodPlanningReady = contractlessPeriodPlanning?.scopeStatus === "READY_WITH_PLANNING_ASSUMPTION";
    const periodMovementCount = periodPlanningReady ? contractlessPeriodPlanning.plannedMovementCount : null;
    const periodBaselineInput = periodPlanningReady
      ? buildPeriodCostInputOverrides({ scope: contractlessPeriodPlanning, costInputs: requestedBaselineInput })
      : requestedBaselineInput;
    const scenarioOverrides = periodPlanningReady
      ? {
        ...requestedScenarioOverrides,
        serviceDayCount: periodMovementCount,
        shiftCount: periodMovementCount,
        tripCount: periodMovementCount,
      }
      : requestedScenarioOverrides;
    const rawRouteEvidence = baseline.routeShift
      ? await buildRouteEvidence(baseline.routeShift, {
        stopOperations: requestedScenarioOverrides.scenarioStopOperations || requestedScenarioOverrides.stopOperations || [],
        routeAlternative: requestedScenarioOverrides.routeAlternative || null,
        passageRequests: requestedScenarioOverrides.routePassageRequests || requestedScenarioOverrides.routeAlternative?.passageRequests || null,
        vehiclePartitionCounts: [2, 3],
        passengerCount: requestedScenarioOverrides.passengerCount ?? periodBaselineInput.passengerCount ?? baseline.input?.passengerCount ?? baseline.routeShift?.requiredPaxOverride ?? null,
      })
      : baseline.routeEvidence;
    const routeEvidence = periodPlanningReady
      ? scalePeriodRouteEvidence(rawRouteEvidence, periodMovementCount)
      : rawRouteEvidence;
    const selectedVehicleCount = Number(scenarioOverrides.vehicleCount || 0);
    const selectedRoutePartition = selectedVehicleCount > 1
      ? rawRouteEvidence?.vehiclePartitionsByCount?.[String(selectedVehicleCount)] || null
      : null;
    const selectedRoutePartitionReady = selectedRoutePartition?.status === "READY"
      && Number.isFinite(Number(selectedRoutePartition.totalDistanceKm))
      && Number.isFinite(Number(selectedRoutePartition.durationMinutes));
    const selectedPartitionPeriodOverrides = selectedRoutePartitionReady && periodPlanningReady
      ? {
        serviceDistanceKm: Number((Number(selectedRoutePartition.totalDistanceKm) * periodMovementCount).toFixed(4)),
        totalDistanceKm: Number((Number(selectedRoutePartition.totalDistanceKm) * periodMovementCount).toFixed(4)),
        routeDurationMinutes: Number((Number(selectedRoutePartition.durationMinutes) * periodMovementCount).toFixed(4)),
      }
      : {};
    const contractlessRouteQuote = scope === "ROOM"
      && isContractlessMarketShift(baseline.routeShift)
      && periodPlanningReady
      && Boolean(String(scenarioOverrides.vehicleType || "").trim());
    const independentScenarioOverrides = contractlessRouteQuote
      ? {
        ...scenarioOverrides,
        ...Object.fromEntries(
          ["serviceDistanceKm", "emptyDistanceKm", "totalDistanceKm", "routeDurationMinutes", "shiftCount", "serviceDayCount", "tripCount"]
            .filter((field) => periodBaselineInput[field] !== undefined && periodBaselineInput[field] !== null)
            .map((field) => [field, periodBaselineInput[field]]),
        ),
        ...selectedPartitionPeriodOverrides,
      }
      : scenarioOverrides;
    const result = contractlessRouteQuote
      ? await buildCostScenarioPreviewFromBaseline({
        user: req.user,
        baseline,
        scenarioOverrides: independentScenarioOverrides,
        externalReference,
        independentRouteQuoteAdvice: true,
        periodPlanning: contractlessPeriodPlanning,
        routeDistanceAlreadyAggregated: selectedRoutePartitionReady && periodPlanningReady,
        routeEvidenceOverride: routeEvidence,
      })
      : buildCostScenarioPreview({
        baselineInput: periodBaselineInput,
        scenarioOverrides,
        externalReference,
        context: {
          scope,
          role: req.user?.role,
          companyKind: baseline.companyKind,
          tenantScope: baseline.tenantScope,
          requestedBy: `user_${safeHashId({ userId: req.user?.id }).slice(4)}`,
          baselineReference: baseline.baselineReference,
          baselineDataClass: baseline.baselineDataClass,
          baselineConfidence: baseline.baselineConfidence,
          baselineSourceMap: baseline.baselineSourceMap,
          shiftReference: baseline.source.shiftId ? `shift_${safeHashId({ id: baseline.source.shiftId }).slice(4)}` : "",
          routeReference: baseline.source.shiftId ? `route_${safeHashId({ id: baseline.source.shiftId }).slice(4)}` : "",
          vehicleReference: baseline.input.vehicleCount ? "selected-vehicle" : "",
          actualInput: baseline.input,
          actualCostInputs: baseline.scenarioActualCostInputs
            || baseline.planningEvidence?.actualInputs
            || [],
          // Offer-scoped FORECAST/BUDGET entries are read-only planning
          // supplements and must also reach the initial comparison preview.
          // Without this field, the first vehicle cards omitted a confirmed
          // offer forecast until a later contractless re-preview.
          forecastCostInputs: baseline.forecastCostInputs || [],
          plannedInput: baseline.plannedInput,
            budgetEvidence: baseline.budgetEvidence,
            forecastEvidence: {
              ...baseline.budgetEvidence,
            ...(baseline.forecastEvidence || {}),
              ...(baseline.actualEvidence || {}),
              actualToDateMinor: baseline.actualEvidence?.actualCostMinor ?? null,
            },
          actualEvidence: baseline.actualEvidence,
          vehicleCostInputsByType: baseline.vehicleCostInputsByType || {},
          requireFullOperatingCostEvidence: scope === "COMPANY"
            || (scope === "ROOM" && (contractlessRouteQuote || periodPlanningReady)),
          periodPlanning: contractlessPeriodPlanning,
          routeEvidence,
          schedule: { baselineStartMinutes: periodPlanningReady ? contractlessPeriodPlanning.startMin : baseline.input.shiftStartMinutes ?? null },
          dispatchAlternative: dispatchSeam(scenarioOverrides.dispatchAlternative),
        },
      });
    const periodPlanning = contractlessPeriodPlanning
      ? buildPeriodPlanningSummary({
        scope: contractlessPeriodPlanning,
        preview: result,
      })
      : null;
    return res.json({
      ok: true,
      data: {
        ...result,
        contractlessPeriodPlanning,
        periodPlanning,
      },
    });
  }));
  wrapAsyncRouterMethods(r);
  return r;
}
