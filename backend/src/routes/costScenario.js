import express from "express";
import { asyncHandler, wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { prisma } from "../prisma.js";
import { httpError } from "../errors/http.js";
import { safeHashId } from "../finance/operationalCostMath.js";
import {
  buildCostScenarioPreview,
  COST_SCENARIO_FORECAST_MODEL_VERSION,
} from "../finance/costScenarioForecast.js";
import { getExternalCostReference } from "../externalCost/externalCostReferenceService.js";
import { osrmRoute } from "../services/osrmRoute.js";
import { sumDistanceKm } from "../services/routeLearning.js";

const ALLOWED_SCOPES = new Set(["COMPANY", "ROOM"]);
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

const SHIFT_SELECT = {
  id: true, companyId: true, roomId: true, status: true, requiredPaxOverride: true,
  routeSnapshotDistanceM: true, routeSnapshotDurationSec: true, routeSnapshotValidatedAt: true,
  startAt: true, endAt: true, hubLat: true, hubLng: true, direction: true, pattern: true,
  stops: { select: { lat: true, lng: true, order: true } },
  vehicle: { select: { id: true, capacity: true, type: true } },
  _count: { select: { people: true, stops: true } },
};

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function parsePositiveId(value) {
  const id = Number(value || 0);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

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
  if (!Array.isArray(points) || points.length < 2) return { distanceKm: null, durationMinutes: null, source: null };
  const routed = await osrmRoute(points);
  if (routed?.ok && Number.isFinite(Number(routed.distanceM)) && Number.isFinite(Number(routed.durationSec))) {
    return {
      distanceKm: Number((Number(routed.distanceM) / 1000).toFixed(2)),
      durationMinutes: Number((Number(routed.durationSec) / 60).toFixed(2)),
      source: "OSRM_ROUTE",
    };
  }
  const distanceKm = Number(sumDistanceKm(points).toFixed(2));
  if (!(distanceKm > 0)) return { distanceKm: null, durationMinutes: null, source: null };
  return {
    distanceKm,
    durationMinutes: Number((distanceKm / 25 * 60).toFixed(2)),
    source: "ROUTE_LEARNING_HAVERSINE_FALLBACK",
  };
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

async function buildRouteEvidence(shift, { stopOperations = [], routeAlternative = null } = {}) {
  const originalStops = (Array.isArray(shift?.stops) ? shift.stops : [])
    .slice()
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
    .map((stop) => ({ lat: Number(stop.lat), lng: Number(stop.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  let scenarioStops = originalStops;
  const operationResult = applyScenarioStopOperations(scenarioStops, stopOperations);
  scenarioStops = operationResult.stopPoints;
  let alternativeStops = scenarioStops;
  const alternativeType = String(routeAlternative?.type || routeAlternative?.mode || "").toUpperCase();
  if (alternativeType === "REVERSE_STOP_ORDER") alternativeStops = scenarioStops.slice().reverse();
  const alternativePoints = routePointsForShift(shift, alternativeStops);
  const snapshotDistanceKm = Number(shift?.routeSnapshotDistanceM) > 0 ? Number((Number(shift.routeSnapshotDistanceM) / 1000).toFixed(2)) : null;
  const snapshotDurationMinutes = Number(shift?.routeSnapshotDurationSec) > 0 ? Number((Number(shift.routeSnapshotDurationSec) / 60).toFixed(2)) : null;
  const snapshotMetric = {
    distanceKm: snapshotDistanceKm,
    durationMinutes: snapshotDurationMinutes,
    source: snapshotDistanceKm !== null || snapshotDurationMinutes !== null ? "DB_ROUTE_SNAPSHOT" : null,
  };
  const measuredBaseline = snapshotMetric.distanceKm !== null && snapshotMetric.durationMinutes !== null
    ? snapshotMetric
    : await routeMetricsForPoints(routePointsForShift(shift, originalStops));
  const measuredScenario = stopOperations.length || alternativeType
    ? await routeMetricsForPoints(alternativePoints)
    : measuredBaseline;
  const requestedAlternative = Boolean(routeAlternative || stopOperations.length);
  return {
    baseline: { ...measuredBaseline, stopCount: originalStops.length },
    scenario: { ...measuredScenario, stopCount: alternativeStops.length },
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
  const passengerCount = shift.requiredPaxOverride ?? shift._count?.people ?? null;
  return {
    ...routeFields(shift),
    ...(Number(passengerCount) > 0 ? { passengerCount } : {}),
    ...(Number(shift._count?.stops) > 0 ? { stopCount: shift._count.stops } : {}),
    ...(Number(shift.vehicle?.capacity) > 0 ? { vehicleCapacity: shift.vehicle.capacity } : {}),
    ...(shift.vehicle?.type ? { vehicleType: shift.vehicle.type } : {}),
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
  for (const field of ["serviceDistanceKm", "totalDistanceKm", "routeDurationMinutes", "passengerCount", "stopCount", "vehicleCapacity", "vehicleType"]) {
    if (shiftInputs(shift)[field] !== undefined) classifications[field] = "INTERNAL_ACTUAL";
  }
  if (shift) {
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
    where: { ...where, status: PUBLIC_SHIFT_STATUSES, routeSnapshotValidatedAt: { not: null } },
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

async function loadCompanyBaseline(companyId) {
  const [company, preferredShift, plan, budgetPlan, agreement, hakedisRecords] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, kind: true, regionId: true, district: true } }),
    findPreferredShift({ companyId }),
    prisma.organizationPlan.findFirst({
      where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true, companyId: true, planDate: true, status: true, roomId: true, startMin: true, endMin: true, stops: { select: { passengerCount: true, lat: true, lng: true, order: true } } },
    }),
    prisma.companyBudgetPlan.findFirst({ where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, currencyCode: true, status: true, budgetAmountMinor: true, periodStart: true, periodEnd: true, budgetApprovalState: true, budgetSource: true, version: true } }),
    prisma.agreement.findFirst({ where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, roomId: true, status: true, startDate: true, endDate: true } }),
    prisma.hakedisRecord.findMany({ where: { companyId, status: { in: ["READY", "FINALIZED"] } }, orderBy: { id: "asc" }, select: { id: true, amountMinor: true, currencyCode: true, source: true, periodStart: true, periodEnd: true } }),
  ]);
  if (!company) throw httpError(404, "SCENARIO_COMPANY_NOT_FOUND", "Senaryo kapsamı bulunamadı.");

  const shift = preferredShift.shift;
  const useShift = Boolean(shift);
  const routeEvidence = useShift ? await buildRouteEvidence(shift) : plan ? await buildPlanRouteEvidence(plan) : null;
  const input = useShift ? shiftInputs(shift) : planInputs(plan, routeEvidence);
  const source = useShift
    ? { type: "SHIFT", label: preferredShift.selection === "VALIDATED_ROUTE_SNAPSHOT" ? "Son doğrulanmış vardiya" : "Son yayımlanmış vardiya", shiftId: shift.id, roomId: shift.roomId, companyId }
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
  const classifications = useShift ? shiftClassifications(shift) : planClassifications(plan, routeEvidence);
  const baselineSourceMap = buildBaselineSourceMap({ input: { ...input, ...(budgetPlan?.currencyCode ? { currencyCode: budgetPlan.currencyCode } : {}) }, classifications, source, routeEvidence, companyKind: company.kind, scope: "COMPANY" });
  return {
    scope: "COMPANY",
    companyId,
    roomId: source.roomId || shift?.roomId || plan?.roomId || null,
    companyKind: company.kind,
    companyName: company.name,
    source,
    input: { ...input, ...(budgetPlan?.currencyCode ? { currencyCode: budgetPlan.currencyCode } : {}) },
    plannedInput,
    routeEvidence,
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
    },
  };
}

async function loadRoomBaseline(roomId) {
  const [room, preferredShift, agreement] = await Promise.all([
    prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true, status: true } }),
    findPreferredShift({ roomId }).then(async (preferred) => {
      if (!preferred.shift) return preferred;
      const company = await prisma.company.findUnique({ where: { id: preferred.shift.companyId }, select: { id: true, name: true, kind: true } });
      return { ...preferred, shift: { ...preferred.shift, company } };
    }),
    prisma.agreement.findFirst({ where: { roomId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, companyId: true, roomId: true, status: true } }),
  ]);
  if (!room) throw httpError(404, "SCENARIO_ROOM_NOT_FOUND", "Senaryo kapsamı bulunamadı.");
  const shift = preferredShift.shift;
  const source = shift
    ? { type: "SHIFT", label: preferredShift.selection === "VALIDATED_ROUTE_SNAPSHOT" ? "Son doğrulanmış vardiya" : "Son yayımlanmış vardiya", shiftId: shift.id, roomId, companyId: shift.companyId }
    : agreement
      ? { type: "AGREEMENT", label: "Son sözleşme bağlamı", agreementId: agreement.id, roomId, companyId: agreement.companyId }
      : { type: "NONE", label: "Kayıtlı plan girdisi yok", roomId };
  const routeEvidence = shift ? await buildRouteEvidence(shift) : null;
  const input = shiftInputs(shift);
  const classifications = shift ? shiftClassifications(shift) : {};
  const baselineSourceMap = buildBaselineSourceMap({ input, classifications, source, routeEvidence, companyKind: shift?.company?.kind || "COMPANY", scope: "ROOM" });
  return {
    scope: "ROOM",
    roomId,
    companyId: shift?.companyId || agreement?.companyId || null,
    companyKind: shift?.company?.kind || "COMPANY",
    companyName: shift?.company?.name || null,
    roomName: room.name,
    source,
    input,
    plannedInput: {},
    routeEvidence,
    routeShift: shift,
    budgetEvidence: {},
    actualEvidence: { actualCostMinor: null, provenance: "#3_ROOM_SCOPE_NOT_BUDGET_AUTHORITY" },
    classifications,
    baselineSourceMap,
    missingFields: Object.entries(baselineSourceMap).filter(([, item]) => item.classification === "TRULY_MISSING").map(([field]) => field),
    baselineConfidence: baselineConfidence(baselineSourceMap),
    baselineReference: referenceId("ROOM", source),
    tenantScope: `room_${safeHashId({ roomId }).slice(4)}`,
    baselineDataClass: shift ? "INTERNAL_ACTUAL" : agreement ? "INTERNAL_PLANNED" : "MISSING",
    related: { sourceStatus: source.type === "SHIFT" ? shift.status : agreement?.status || null, agreementAvailable: Boolean(agreement) },
  };
}

async function loadBaseline(req, scope) {
  const id = targetId(req, scope);
  return scope === "ROOM" ? loadRoomBaseline(id) : loadCompanyBaseline(id);
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
    planningOnly: baseline.companyKind !== "COMPANY",
    normalBudgetLifecycle: baseline.companyKind === "COMPANY",
    baselineReferenceId: baseline.baselineReference,
    source,
    input,
    classifications: baseline.classifications,
    baselineSourceMap: baseline.baselineSourceMap,
    missingFields: baseline.missingFields || [],
    baselineConfidence: baseline.baselineConfidence || { level: "LOW", score: 50, missingFields: [], reason: "Baseline güveni hesaplanamadı." },
    routeEvidence: baseline.routeEvidence || null,
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
    const scenarioOverrides = req.body?.scenarioOverrides || {};
    const routeEvidence = baseline.routeShift
      ? await buildRouteEvidence(baseline.routeShift, {
        stopOperations: scenarioOverrides.scenarioStopOperations || scenarioOverrides.stopOperations || [],
        routeAlternative: scenarioOverrides.routeAlternative || null,
      })
      : baseline.routeEvidence;
    const result = buildCostScenarioPreview({
      baselineInput: { ...baseline.input, ...(req.body?.baselineInput || {}) },
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
        plannedInput: baseline.plannedInput,
          budgetEvidence: baseline.budgetEvidence,
          forecastEvidence: {
            ...baseline.budgetEvidence,
            ...(baseline.actualEvidence || {}),
            actualToDateMinor: baseline.actualEvidence?.actualCostMinor ?? null,
          },
        actualEvidence: baseline.actualEvidence,
        routeEvidence,
        schedule: { baselineStartMinutes: baseline.input.shiftStartMinutes ?? null },
        dispatchAlternative: dispatchSeam(scenarioOverrides.dispatchAlternative),
      },
    });
    return res.json({ ok: true, data: result });
  }));
  wrapAsyncRouterMethods(r);
  return r;
}
