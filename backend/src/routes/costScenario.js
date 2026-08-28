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

const ALLOWED_SCOPES = new Set(["COMPANY", "ROOM"]);
const PUBLIC_SHIFT_STATUSES = { not: "DRAFT" };

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

function planInputs(plan) {
  if (!plan) return {};
  const passengerCount = (plan.stops || []).reduce((sum, stop) => sum + Number(stop.passengerCount || 0), 0);
  return {
    passengerCount,
    stopCount: plan.stops?.length || 0,
    vehicleCount: 1,
    serviceDayCount: 1,
    shiftCount: 1,
    tripCount: 1,
    currencyCode: "TRY",
  };
}

function planClassifications(plan) {
  if (!plan) return {};
  return {
    passengerCount: "INTERNAL_PLANNED",
    stopCount: "INTERNAL_PLANNED",
    vehicleCount: "INTERNAL_PLANNED",
    serviceDayCount: "INTERNAL_PLANNED",
    shiftCount: "INTERNAL_PLANNED",
    tripCount: "INTERNAL_PLANNED",
  };
}

function referenceId(scope, entity) {
  return `base_${safeHashId({ scope, companyId: entity?.companyId || null, roomId: entity?.roomId || null, shiftId: entity?.shiftId || null, planId: entity?.planId || null, agreementId: entity?.agreementId || null }).slice(4)}`;
}

async function loadCompanyBaseline(companyId) {
  const [company, shift, plan, budgetPlan, agreement] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, kind: true, regionId: true, district: true } }),
    prisma.shift.findFirst({
      where: { companyId, status: PUBLIC_SHIFT_STATUSES },
      orderBy: [{ routeSnapshotValidatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true, companyId: true, roomId: true, status: true, requiredPaxOverride: true,
        routeSnapshotDistanceM: true, routeSnapshotDurationSec: true, routeSnapshotValidatedAt: true,
        startAt: true, endAt: true,
        vehicle: { select: { id: true, capacity: true, type: true } },
        _count: { select: { people: true, stops: true } },
      },
    }),
    prisma.organizationPlan.findFirst({
      where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: { id: true, companyId: true, planDate: true, status: true, roomId: true, stops: { select: { passengerCount: true } } },
    }),
    prisma.companyBudgetPlan.findFirst({ where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, currencyCode: true, status: true, budgetAmountMinor: true } }),
    prisma.agreement.findFirst({ where: { companyId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, roomId: true, status: true, startDate: true, endDate: true } }),
  ]);
  if (!company) throw httpError(404, "SCENARIO_COMPANY_NOT_FOUND", "Senaryo kapsamı bulunamadı.");

  const useShift = Boolean(shift);
  const input = useShift ? shiftInputs(shift) : planInputs(plan);
  const source = useShift
    ? { type: "SHIFT", label: "Son yayımlanmış vardiya", shiftId: shift.id, roomId: shift.roomId, companyId }
    : plan
      ? { type: "ORGANIZATION_PLAN", label: "Son organizasyon planı", planId: plan.id, roomId: plan.roomId, companyId }
      : { type: "NONE", label: "Kayıtlı plan girdisi yok", companyId };
  const baselineReference = referenceId("COMPANY", source);
  return {
    scope: "COMPANY",
    companyId,
    roomId: source.roomId || shift?.roomId || plan?.roomId || null,
    companyKind: company.kind,
    companyName: company.name,
    source,
    input: { ...input, ...(budgetPlan?.currencyCode ? { currencyCode: budgetPlan.currencyCode } : {}) },
    classifications: useShift ? shiftClassifications(shift) : planClassifications(plan),
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
  const [room, shift, agreement] = await Promise.all([
    prisma.room.findUnique({ where: { id: roomId }, select: { id: true, name: true, status: true } }),
    prisma.shift.findFirst({
      where: { roomId, status: PUBLIC_SHIFT_STATUSES },
      orderBy: [{ routeSnapshotValidatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true, companyId: true, roomId: true, status: true, requiredPaxOverride: true,
        routeSnapshotDistanceM: true, routeSnapshotDurationSec: true, routeSnapshotValidatedAt: true,
        startAt: true, endAt: true, vehicle: { select: { id: true, capacity: true, type: true } },
        _count: { select: { people: true, stops: true } },
        company: { select: { id: true, name: true, kind: true } },
      },
    }),
    prisma.agreement.findFirst({ where: { roomId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], select: { id: true, companyId: true, roomId: true, status: true } }),
  ]);
  if (!room) throw httpError(404, "SCENARIO_ROOM_NOT_FOUND", "Senaryo kapsamı bulunamadı.");
  const source = shift
    ? { type: "SHIFT", label: "Son yayımlanmış vardiya", shiftId: shift.id, roomId, companyId: shift.companyId }
    : agreement
      ? { type: "AGREEMENT", label: "Son sözleşme bağlamı", agreementId: agreement.id, roomId, companyId: agreement.companyId }
      : { type: "NONE", label: "Kayıtlı plan girdisi yok", roomId };
  return {
    scope: "ROOM",
    roomId,
    companyId: shift?.companyId || agreement?.companyId || null,
    companyKind: shift?.company?.kind || "COMPANY",
    companyName: shift?.company?.name || null,
    roomName: room.name,
    source,
    input: shiftInputs(shift),
    classifications: shift ? shiftClassifications(shift) : {},
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
    const result = buildCostScenarioPreview({
      baselineInput: { ...baseline.input, ...(req.body?.baselineInput || {}) },
      scenarioOverrides: req.body?.scenarioOverrides || {},
      externalReference,
      context: {
        scope,
        role: req.user?.role,
        companyKind: baseline.companyKind,
        tenantScope: baseline.tenantScope,
        requestedBy: `user_${safeHashId({ userId: req.user?.id }).slice(4)}`,
        baselineReference: baseline.baselineReference,
        baselineDataClass: baseline.baselineDataClass,
        shiftReference: baseline.source.shiftId ? `shift_${safeHashId({ id: baseline.source.shiftId }).slice(4)}` : "",
        routeReference: baseline.source.shiftId ? `route_${safeHashId({ id: baseline.source.shiftId }).slice(4)}` : "",
        vehicleReference: baseline.input.vehicleCount ? "selected-vehicle" : "",
      },
    });
    return res.json({ ok: true, data: result });
  }));
  wrapAsyncRouterMethods(r);
  return r;
}
