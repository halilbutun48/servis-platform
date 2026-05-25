// backend/src/routes/driver.js
// Mounted at: /api/driver
// Purpose: DRIVER operational endpoints (today list, active route, stop actions, completion)
// NOTE: ROOM driver CRUD lives in routes/drivers.js (mounted at /api/drivers).

import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { decorateShiftWithRegionContext, emitShift } from "./shifts/helpers.js";
import { emitStopProgressNotifs } from "../notifications/stopProgressNotifs.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { resolveGpsSourceVisibility } from "../gps/sourceVisibility.js";
import { loadDriverBoardingChangeRouteEffects } from "../services/boardingChangeRouteRefresh.js";
import { previewBoardingChangeRouteImpact } from "../services/boardingRouteImpactPreview.js";

// TR day helpers (already used across repo)
import { ymdTR, addDaysTR, atTR } from "../time/tr.js";
import { findReservationConflictForRange } from "../services/reservationConflict.js";
import logger from "../lib/logger.js";

// M72: audit helper (must never break ops)
async function audit(prisma, { actorUserId, actorRole, action, entity, entityId, meta }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        actorRole: actorRole ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ?? undefined,
      },
    });
  } catch (e) {
    logger.error("AUDIT error:", e);
  }
}

async function ensureProgressStarted(prisma, shiftId, now) {
  const p = await prisma.shiftProgress.findUnique({ where: { shiftId } });
  if (!p) {
    await prisma.shiftProgress.create({
      data: { shiftId, lastReachedOrder: 0, startedAt: now, pausedAt: null },
    });
    return;
  }
  const data = {};
  if (!p.startedAt) data.startedAt = now;
  if (p.pausedAt) data.pausedAt = null;
  if (Object.keys(data).length) {
    await prisma.shiftProgress.update({ where: { shiftId }, data });
  }
}


function buildEtaStops({ lat, lng, speedKmh, stops }) {
  return (stops ?? []).map((s) => {
    const km = haversineKm(lat, lng, s.lat, s.lng);
    return {
      id: s.id,
      name: s.name,
      order: s.order,
      remainingKm: Number(km.toFixed(2)),
      etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
    };
  });
}

function firstPendingStop(stops) {
  return (stops ?? []).find((s) => s.state === "PENDING") ?? null;
}

function derivedLastReachedOrder(stops) {
  let max = 0;
  for (const s of stops ?? []) {
    if (s.state === "REACHED" || s.state === "SKIPPED") {
      if (typeof s.order === "number" && s.order > max) max = s.order;
    }
  }
  return max;
}

async function getDriverByUserId(userId) {
  return prisma.driver.findFirst({ where: { userId }, select: { id: true } });
}

async function getShiftForDriver({ shiftId }) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      vehicle: { include: { gpsLast: true, gpsState: true } },
      company: {
        select: {
          id: true,
          name: true,
          regionId: true,
          district: true,
          region: { select: { id: true, name: true } },
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          regionId: true,
          district: true,
          region: { select: { id: true, name: true } },
        },
      },
      stops: { include: { _count: { select: { assignments: true } } }, orderBy: { order: "asc" } },
      progress: true,
    },
  });
  return decorateShiftWithRegionContext(shift);
}

async function loadDriverPendingBoardingChangeRequests({ shift }) {
  if (!shift?.id) return [];
  const requests = await prisma.pickupRequest.findMany({
    where: {
      shiftId: shift.id,
      status: "OPEN",
    },
    include: {
      personel: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });

  return requests.map((request) => {
    const preview = previewBoardingChangeRouteImpact({
      shift,
      currentStops: shift?.stops || [],
      passengersOrPeople: shift?.people || [],
      boardingChange: {
        changeType: "DIFFERENT_STOP",
        requestKind: "DIFFERENT_STOP",
        personelId: request.personelId,
        personLabel: request.personel?.fullName || request.personel?.name || request.personel?.label || `#${request.personelId || "-"}`,
        lat: request.lat,
        lng: request.lng,
      },
    });

    return {
      id: request.id,
      status: request.status,
      personelId: request.personelId,
      personLabel: preview.personLabel,
      requestKind: "DIFFERENT_STOP",
      decisionOwnerRole: preview.decisionOwnerRole || "COMPANY",
      decisionOwnerLabel: preview.decisionOwnerLabel || "Hizmet alan taraf",
      decisionOwnerNote: preview.decisionOwnerNote || "Hizmet alan taraf karar veriyor.",
      routeImpactPreview: preview,
      preview,
      createdAt: request.createdAt,
      lat: request.lat ?? null,
      lng: request.lng ?? null,
      nearestStop: null,
    };
  });
}

async function maybeStartShiftIfApproved(shiftId) {
  // first driver action can start the shift (APPROVED -> ACTIVE)
  await prisma.shift.updateMany({
    where: { id: shiftId, status: "APPROVED" },
    data: { status: "ACTIVE" },
  });
}

function buildDriverRoutePayload(shift) {
  const decoratedShift = decorateShiftWithRegionContext(shift);
  const boardingChangeEffects = Array.isArray(decoratedShift?.boardingChangeEffects) ? decoratedShift.boardingChangeEffects : [];
  const routeRefresh = decoratedShift?.routeRefresh || (boardingChangeEffects.length ? {
    routeRefreshState: "VISIBLE",
    routeRefreshLabel: "Günlük değişiklik rotada görünüyor",
    routeRefreshNote: "Sürücü rota ekranında görünür; SMS/push yok; kalıcı rota değişmez.",
    routeRefreshRequested: true,
    routeRefreshCompleted: true,
    routeRefreshRequired: true,
  } : null);
  const routeNotice = decoratedShift?.routeNotice || routeRefresh?.routeRefreshNote || null;
  const boardingChangeSummary = decoratedShift?.boardingChangeSummary || (boardingChangeEffects.length ? {
    count: boardingChangeEffects.length,
    label: boardingChangeEffects.length === 1 ? boardingChangeEffects[0]?.effectLabel || "Günlük değişiklik" : `${boardingChangeEffects.length} günlük değişiklik`,
    note: routeNotice,
    latestAppliedAt: boardingChangeEffects[0]?.appliedAt || null,
    latestEffectiveDate: boardingChangeEffects[0]?.effectiveDate || null,
  } : null);
  const last = decoratedShift?.vehicle?.gpsLast ?? null;
  const vehicleGpsSource = String(decoratedShift?.vehicle?.gpsState?.lastSource || "BACKEND_VEHICLE_GPS").trim().toUpperCase() || "BACKEND_VEHICLE_GPS";
  const gpsFreshness = last ? gpsStatusFromAt(last.at) : { status: "OFFLINE", ageSec: null };
  const hasActiveShift = String(decoratedShift?.status || "").trim().toUpperCase() === "ACTIVE";
  const sourceVisibility = resolveGpsSourceVisibility({
    officialSourceKey: vehicleGpsSource,
    freshness: gpsFreshness.status,
    hasActiveShift,
  });
  const backendGpsLabel = sourceVisibility.label;
  const backendGpsMeta = last
    ? {
        available: true,
        source: vehicleGpsSource,
        label: backendGpsLabel,
        sourceLabel: backendGpsLabel,
        sourceVisibility,
        freshness: gpsFreshness.status,
        ageSec: gpsFreshness.ageSec,
        at: last.at,
        lat: last.lat,
        lng: last.lng,
        speed: last.speed,
      }
    : {
        available: false,
        source: vehicleGpsSource,
        label: backendGpsLabel,
        sourceLabel: backendGpsLabel,
        sourceVisibility,
        freshness: "OFFLINE",
        ageSec: null,
        at: null,
        lat: null,
        lng: null,
        speed: null,
      };
  const speedKmh = typeof last?.speed === "number" ? last.speed : 30;

  const routeStops = (decoratedShift?.stops ?? []).map((s) => {
    const km = last ? haversineKm(last.lat, last.lng, s.lat, s.lng) : null;
    const passengerCount = Math.max(0, Number(s?._count?.assignments || 0));
    return {
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      order: s.order,
      type: s.type,
      state: s.state,
      reachedAt: s.reachedAt,
      skippedAt: s.skippedAt,
      passengerCount,
      remainingKm: km == null ? null : Number(km.toFixed(2)),
      etaMin: km == null ? null : Number(etaMinutes(km, speedKmh).toFixed(0)),
    };
  });

  const orderedStops = [...routeStops].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const proximityStops = last ? [...routeStops].sort((a, b) => Number(a.remainingKm || 0) - Number(b.remainingKm || 0)) : [...orderedStops];
  const nextStop = orderedStops.find((s) => s.state === "PENDING") ?? null;
  const lastReachedOrder = derivedLastReachedOrder(decoratedShift?.stops ?? []);
  const remainingStops = orderedStops.filter((s) => s.state === "PENDING");
  const totalPassengers = orderedStops.reduce((sum, s) => sum + Math.max(0, Number(s.passengerCount || 0)), 0);
  const remainingPassengers = remainingStops.reduce((sum, s) => sum + Math.max(0, Number(s.passengerCount || 0)), 0);

  return {
    mode: "OK",
    shift: {
      id: decoratedShift.id,
      companyId: decoratedShift.companyId,
      roomId: decoratedShift.roomId,
      vehicleId: decoratedShift.vehicleId,
      driverId: decoratedShift.driverId,
      startAt: decoratedShift.startAt,
      endAt: decoratedShift.endAt,
      status: decoratedShift.status,
      regionOwnership: decoratedShift.regionOwnership,
      regionRoutingKey: decoratedShift.regionRoutingKey,
      regionContext: decoratedShift.regionContext,
    },
    regionOwnership: decoratedShift.regionOwnership,
    regionRoutingKey: decoratedShift.regionRoutingKey,
    regionContext: decoratedShift.regionContext,
    vehicle: decoratedShift.vehicle
      ? {
          id: decoratedShift.vehicle.id,
          plate: decoratedShift.vehicle.plate,
          capacity: decoratedShift.vehicle.capacity,
          speedLimitKmh: decoratedShift.vehicle.speedLimitKmh,
          nextMaintenanceAt: decoratedShift.vehicle.nextMaintenanceAt,
          status: decoratedShift.vehicle.status,
        }
      : null,
    last,
    liveLocation: {
      officialSource: vehicleGpsSource,
      sourcePriority: ["BACKEND_VEHICLE_GPS", "DRIVER_PHONE", "LOCAL_DEVICE_PREVIEW", "CACHED_BACKEND_VEHICLE_GPS"],
      sourceVisibility,
      backendVehicleGps: backendGpsMeta,
    },
    progress: {
      lastReachedOrder,
      startedAt: decoratedShift.progress?.startedAt ?? null,
      pausedAt: decoratedShift.progress?.pausedAt ?? null,
      completed: decoratedShift.status === "DONE" || !!decoratedShift.progress?.completedAt,
    },
    summary: {
      totalStops: orderedStops.length,
      remainingStops: remainingStops.length,
      totalPassengers,
      remainingPassengers,
      nextStopPassengers: nextStop ? Math.max(0, Number(nextStop.passengerCount || 0)) : 0,
      boardingChangeCount: boardingChangeEffects.length,
    },
    orderedStops,
    proximityStops,
    nextStop,
    routeStops,
    boardingChangeEffects,
    boardingChangeSummary,
    pendingBoardingChangeRequests: Array.isArray(decoratedShift?.pendingBoardingChangeRequests) ? decoratedShift.pendingBoardingChangeRequests : [],
    routeRefresh,
    routeNotice,
  };
}

async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {
  const now = new Date();

  // ✅ Atomik tamamlama: completedAt + shift.status DONE
  // (fixes partial writes and makes behavior deterministic)
  const [, freshShift] = await prisma.$transaction([
    prisma.shiftProgress.upsert({
      where: { shiftId },
      update: { completedAt: now, pausedAt: null },
      create: { shiftId, lastReachedOrder: 0, startedAt: now, pausedAt: null, completedAt: now },
    }),
    prisma.shift.update({ where: { id: shiftId }, data: { status: "DONE" } }),
  ]);

  // NOTE: route:progress retained for backward compatibility.
  const payload = { shiftId, completed: true, nextStop: null };
  io?.to(`shift:${shiftId}`).emit("route:progress", payload);
  io?.to(`room:${roomId}`).emit("route:progress", payload);
  io?.to(`company:${companyId}`).emit("route:progress", payload);
  if (vehicleId) io?.to(`vehicle:${vehicleId}`).emit("route:progress", { ...payload, vehicleId });

  // ✅ Refresh panels/lists: shift:update
  try {
    emitShift(io, freshShift, "shift:update", { action: "complete", status: "DONE" });
  } catch {}
}

export function driverRouter(io) {
  const r = express.Router();

  // =========================================================
  // M70: Driver today list (today + tomorrow)
  // =========================================================
  r.get("/shifts/today", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user.id }, select: { id: true } });
    if (!driver) return res.json({ mode: "NO_DRIVER_PROFILE", today: [], tomorrow: [], upcoming: [], active: null, assigned: null, assignmentState: "NONE" });

    const now = new Date();
    const todayYmd = ymdTR(now);
    const tomorrowYmd = addDaysTR(todayYmd, 1);

    const start = atTR(todayYmd, 0);
    const end = atTR(addDaysTR(todayYmd, 7), 0);

    const rows = await prisma.shift.findMany({
      where: {
        driverId: driver.id,
        status: { in: ["APPROVED", "ACTIVE"] },
        startAt: { gte: start, lt: end },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        companyId: true,
        roomId: true,
        vehicleId: true,
        driverId: true,
        agreementId: true,
        vehicle: { select: { id: true, plate: true } },
        company: {
          select: {
            id: true,
            name: true,
            regionId: true,
            district: true,
            region: { select: { id: true, name: true } },
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            regionId: true,
            district: true,
            region: { select: { id: true, name: true } },
          },
        },
      },
    });

    const decoratedRows = rows.map((row) => decorateShiftWithRegionContext(row));
    const routeVisibilityByShiftId = await loadDriverBoardingChangeRouteEffects({
      shiftIds: decoratedRows.map((row) => row?.id).filter((value) => Number.isFinite(Number(value)) && Number(value) > 0),
    });
    const rowsWithVisibility = decoratedRows.map((row) => ({
      ...row,
      ...(routeVisibilityByShiftId[String(Number(row?.id || 0))] || {}),
    }));
    const today = [];
    const tomorrow = [];
    const upcoming = [];
    for (const s of rowsWithVisibility) {
      const y = ymdTR(s.startAt);
      if (y === todayYmd) today.push(s);
      else if (y === tomorrowYmd) tomorrow.push(s);
      if (new Date(s.startAt).getTime() > now.getTime()) upcoming.push(s);
    }

    const active = rowsWithVisibility.find((s) => {
      const st = String(s.status || "").toUpperCase();
      const startMs = new Date(s.startAt).getTime();
      const endMs = new Date(s.endAt).getTime();
      return st === "ACTIVE" || (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= now.getTime() && endMs >= now.getTime());
    }) || null;

    const assigned = active || upcoming[0] || today[0] || tomorrow[0] || null;

    let assignmentState = "NONE";
    if (assigned) {
      const startMs = new Date(assigned.startAt).getTime();
      const endMs = new Date(assigned.endAt).getTime();
      const inWindow = Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= now.getTime() && endMs >= now.getTime();
      if (!assigned.vehicleId) assignmentState = "ASSIGNED_NO_VEHICLE";
      else if (String(assigned.status || "").toUpperCase() === "ACTIVE" || inWindow) assignmentState = "ACTIVE";
      else assignmentState = "ASSIGNED";
    }

    return res.json({ mode: rowsWithVisibility.length ? "OK" : "NO_ASSIGNED_SHIFT", todayYmd, tomorrowYmd, today, tomorrow, upcoming, active, assigned, assignmentState });
  });

  // =========================================================
  // DRIVER: active route + progress
  // =========================================================
  r.get("/route/active", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const u = req.user;
    const driver = await prisma.driver.findFirst({ where: { userId: u.id } });
    if (!driver) return res.json({ mode: "NO_DRIVER_PROFILE" });

    const shift = await prisma.shift.findFirst({
      where: { driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] } },
      include: {
        vehicle: { include: { gpsLast: true, gpsState: true } },
        company: {
          select: {
            id: true,
            name: true,
            regionId: true,
            district: true,
            region: { select: { id: true, name: true } },
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            regionId: true,
            district: true,
            region: { select: { id: true, name: true } },
          },
        },
        stops: { include: { _count: { select: { assignments: true } } }, orderBy: { order: "asc" } },
        progress: true,
      },
      orderBy: { startAt: "desc" },
    });

    if (!shift) return res.json({ mode: "NO_ACTIVE_SHIFT" });
    const routeVisibilityByShiftId = await loadDriverBoardingChangeRouteEffects({ shiftIds: [shift.id] });
    const pendingBoardingChangeRequests = await loadDriverPendingBoardingChangeRequests({ shift });
    const enrichedShift = {
      ...shift,
      ...(routeVisibilityByShiftId[String(shift.id)] || {}),
      pendingBoardingChangeRequests,
    };
    return res.json(buildDriverRoutePayload(enrichedShift));
  });

  // =========================================================
  // DRIVER: explicit assigned shift route (Today -> Route deep link)
  // =========================================================
  r.get("/shifts/:shiftId/route", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    if (!Number.isFinite(shiftId) || shiftId <= 0) {
      return res.status(400).json({ error: "bad shiftId" });
    }

    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        vehicle: { include: { gpsLast: true, gpsState: true } },
        company: {
          select: {
            id: true,
            name: true,
            regionId: true,
            district: true,
            region: { select: { id: true, name: true } },
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            regionId: true,
            district: true,
            region: { select: { id: true, name: true } },
          },
        },
        stops: { include: { _count: { select: { assignments: true } } }, orderBy: { order: "asc" } },
        progress: true,
      },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!["APPROVED", "ACTIVE", "DONE"].includes(String(shift.status || ""))) {
      return res.status(400).json({ error: "Shift route not available in this status", status: shift.status });
    }

    const routeVisibilityByShiftId = await loadDriverBoardingChangeRouteEffects({ shiftIds: [shift.id] });
    const pendingBoardingChangeRequests = await loadDriverPendingBoardingChangeRequests({ shift });
    const enrichedShift = {
      ...shift,
      ...(routeVisibilityByShiftId[String(shift.id)] || {}),
      pendingBoardingChangeRequests,
    };

    return res.json(buildDriverRoutePayload(enrichedShift));
  });

  // =========================================================
  // DRIVER: explicit shift start (APPROVED -> ACTIVE)
  // =========================================================
  r.post("/shifts/:shiftId/start", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, status: true, driverId: true, companyId: true, roomId: true, vehicleId: true, startAt: true, endAt: true },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!['APPROVED', 'ACTIVE'].includes(shift.status)) {
      return res.status(400).json({ error: "Shift cannot be started in this status", status: shift.status });
    }

    if (shift.status === "APPROVED") {
      const conflict = await findReservationConflictForRange({
        driverId: shift.driverId ?? undefined,
        vehicleId: shift.vehicleId ?? undefined,
        startAt: shift.startAt,
        endAt: shift.endAt,
        excludeShiftId: shift.id,
      });
      if (conflict) return res.status(409).json(conflict);

      await prisma.shift.update({ where: { id: shiftId }, data: { status: "ACTIVE" } });
    }

    // ensure progress row exists
    await prisma.shiftProgress.upsert({
      where: { shiftId },
      update: {},
      create: { shiftId, lastReachedOrder: 0 },
    });

    const now = new Date();
    await ensureProgressStarted(prisma, shiftId, now);
    await audit(prisma, {
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: "DRIVER_SHIFT_START",
      entity: "Shift",
      entityId: shiftId,
      meta: { source: "MANUAL" },
    });


    const fresh = await prisma.shift.findUnique({ where: { id: shiftId } });
    emitShift(io, fresh, "shift:update", { action: "start", status: fresh?.status ?? "ACTIVE" });

    return res.json({ ok: true, shiftId, status: fresh?.status ?? "ACTIVE" });
  });

  // DRIVER: next pending stop
  r.get("/shifts/:shiftId/next-stop", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });

    return res.json({ nextStop: firstPendingStop(shift.stops ?? []) });
  });

  async function applyStopState({ req, res, state, source = "MANUAL" }) {
    const shiftId = Number(req.params.shiftId);
    const stopId = Number(req.params.stopId);

    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await getShiftForDriver({ shiftId });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!["APPROVED", "ACTIVE"].includes(shift.status)) {
      return res.status(400).json({ error: "Shift not active" });
    }

    // M72: pause gate (A: safer)
    if (shift.progress?.pausedAt && (state === "REACHED" || state === "SKIPPED")) {
      return res.status(409).json({ error: "Shift paused", code: "SHIFT_PAUSED" });
    }

    const stop = (shift.stops ?? []).find((s) => s.id === stopId);
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    // idempotent
    if (stop.state === state) {
      const nextStop0 = firstPendingStop(shift.stops ?? []);
      const lastReachedOrder0 = derivedLastReachedOrder(shift.stops ?? []);
      return res.json({ ok: true, shiftId, stopId, state, nextStop: nextStop0, completed: !nextStop0, lastReachedOrder: lastReachedOrder0 });
    }

    const now = new Date();

    // reached/skip counts as movement -> start shift if still APPROVED
    if (state === "REACHED" || state === "SKIPPED") {
      await maybeStartShiftIfApproved(shiftId);
      await ensureProgressStarted(prisma, shiftId, now);
    }

    const data = { state };
    if (state === "REACHED") {
      data.reachedAt = now;
      data.skippedAt = null;
    }
    if (state === "SKIPPED") {
      data.skippedAt = now;
      data.reachedAt = null;
    }
    if (state === "PENDING") {
      data.reachedAt = null;
      data.skippedAt = null;
    }

    if (state !== "PENDING") {
      // progress -> monotonic increase
      const currentReached = shift.progress?.lastReachedOrder ?? 0;
      const nextLegacyReached = Math.max(currentReached, stop.order ?? 0);

      await prisma.$transaction([
        prisma.stop.update({ where: { id: stopId }, data }),
        prisma.shiftProgress.upsert({
          where: { shiftId },
          update: { lastReachedOrder: nextLegacyReached },
          create: { shiftId, lastReachedOrder: nextLegacyReached },
        }),
      ]);
    } else {
      // M71: undo/reopen should ALSO fix progress
      await prisma.stop.update({ where: { id: stopId }, data });
    }

    // reload stops for accurate nextStop/completion
    const fresh = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: { orderBy: { order: "asc" } }, vehicle: { include: { gpsLast: true, gpsState: true } }, progress: true },
    });

    const nextStop = firstPendingStop(fresh?.stops ?? []);
    const completed = !nextStop;

    // M71: progress should match stop states (supports undo window)
    const lastReachedOrder = derivedLastReachedOrder(fresh?.stops ?? []);
    await prisma.shiftProgress.upsert({
      where: { shiftId },
      update: { lastReachedOrder },
      create: { shiftId, lastReachedOrder },
    });

    const payload = {
      shiftId,
      vehicleId: fresh?.vehicleId ?? null,
      nextStop,
      completed,
      changed: {
        stopId,
        state,
        reachedAt: state === "REACHED" ? now : null,
        skippedAt: state === "SKIPPED" ? now : null,
      },
    };

    io?.to(`shift:${shiftId}`).emit("route:progress", payload);
    io?.to(`room:${shift.roomId}`).emit("route:progress", payload);
    io?.to(`company:${shift.companyId}`).emit("route:progress", payload);
    if (fresh?.vehicleId) {
      io?.to(`vehicle:${fresh.vehicleId}`).emit("route:progress", { ...payload, vehicleId: fresh.vehicleId });
    }

    // stop progress notifications (ROOM/COMPANY + user/parent proximity)
    await emitStopProgressNotifs({
      io,
      shiftId,
      stop: { id: stopId, order: stop.order ?? null, state },
      state,
      source: "DRIVER_OPS",
      shiftSnapshot: {
        id: shiftId,
        companyId: shift.companyId,
        roomId: shift.roomId,
        vehicleId: fresh?.vehicleId ?? null,
      },
      stopsSnapshot: fresh?.stops ?? [],
      vehicleSnapshot: fresh?.vehicle ? { id: fresh.vehicle.id, plate: fresh.vehicle.plate } : null,
      gpsLastSnapshot: fresh?.vehicle?.gpsLast ?? null,
    });

    // instant ETA update (GPS beklemesin)
    try {
      const last = fresh?.vehicle?.gpsLast ?? null;
      if (last && fresh?.vehicleId) {
        const speedKmh = typeof last.speed === "number" ? last.speed : 30;
        const remainingStops = (fresh.stops ?? []).filter((s) => s.state === "PENDING");
        const items = buildEtaStops({ lat: last.lat, lng: last.lng, speedKmh, stops: remainingStops });

        const etaPayload = { shiftId, vehicleId: fresh.vehicleId, at: last.at, stops: items };
        io?.to(`vehicle:${fresh.vehicleId}`).emit("eta:update", etaPayload);
        io?.to(`room:${shift.roomId}`).emit("eta:update", etaPayload);
        io?.to(`company:${shift.companyId}`).emit("eta:update", etaPayload);
      }
    } catch (e) {
      logger.error("stop state -> eta:update error:", e);
    }

    // Optional: auto complete if no pending stops
    if (completed) {
      try {
        await completeShift({
          shiftId,
          roomId: shift.roomId,
          companyId: shift.companyId,
          vehicleId: fresh?.vehicleId ?? null,
          io,
        });
      } catch (e) {
        logger.error("auto complete error:", e);
      }
    }

    await audit(prisma, {
      actorUserId: req.user.id,
      actorRole: req.user.role,
      action: state === "REACHED" ? "DRIVER_STOP_REACHED" : state === "SKIPPED" ? "DRIVER_STOP_SKIPPED" : (source === "UNDO" ? "DRIVER_STOP_UNDO" : "DRIVER_STOP_REOPEN"),
      entity: "Shift",
      entityId: shiftId,
      meta: { stopId, state, source },
    });

    return res.json({ ok: true, shiftId, stopId, state, nextStop, completed, lastReachedOrder });
  }

  // DRIVER: reached
  r.post("/shifts/:shiftId/stops/:stopId/reached", authRequired(), requireRole("DRIVER"), async (req, res) =>
    applyStopState({ req, res, state: "REACHED", source: "MANUAL" })
  );

  // DRIVER: skip
  r.post("/shifts/:shiftId/stops/:stopId/skip", authRequired(), requireRole("DRIVER"), async (req, res) =>
    applyStopState({ req, res, state: "SKIPPED", source: "MANUAL" })
  );

  // DRIVER: reopen (back to PENDING)
  r.post("/shifts/:shiftId/stops/:stopId/reopen", authRequired(), requireRole("DRIVER"), async (req, res) =>
    applyStopState({ req, res, state: "PENDING", source: "MANUAL" })
  );

  // M71: undo (2 minutes)
  r.post("/shifts/:shiftId/stops/:stopId/undo", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const stopId = Number(req.params.stopId);

    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await getShiftForDriver({ shiftId });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!["APPROVED", "ACTIVE"].includes(shift.status)) {
      return res.status(400).json({ error: "Shift not active" });
    }

    const stop = (shift.stops ?? []).find((s) => s.id === stopId);
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    if (!["REACHED", "SKIPPED"].includes(stop.state)) {
      return res.status(409).json({ error: "Nothing to undo", state: stop.state });
    }

    const actionAt = stop.reachedAt || stop.skippedAt;
    if (!actionAt) return res.status(409).json({ error: "No action timestamp" });

    const ageMs = Date.now() - new Date(actionAt).getTime();
    const windowMs = 2 * 60 * 1000;
    if (ageMs > windowMs) {
      return res.status(409).json({ error: "Undo window expired", windowSec: 120 });
    }

    // reuse main flow
    return applyStopState({ req, res, state: "PENDING", source: "MANUAL" });
  });

  // M72: pause/resume (shift status stays ACTIVE; progress.pausedAt controls)
  r.post("/shifts/:shiftId/pause", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const sh = await prisma.shift.findUnique({ where: { id: shiftId }, select: { id: true, status: true, driverId: true } });
    if (!sh) return res.status(404).json({ error: "Shift not found" });
    if (sh.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (sh.status !== "ACTIVE") return res.status(400).json({ error: "Shift not ACTIVE", status: sh.status });

    const now = new Date();
    await prisma.shiftProgress.upsert({
      where: { shiftId },
      update: { pausedAt: now, startedAt: undefined },
      create: { shiftId, lastReachedOrder: 0, startedAt: now, pausedAt: now },
    });
    await prisma.shiftProgress.updateMany({ where: { shiftId, startedAt: null }, data: { startedAt: now } });

    await audit(prisma, { actorUserId: req.user.id, actorRole: req.user.role, action: "DRIVER_SHIFT_PAUSE", entity: "Shift", entityId: shiftId, meta: {} });
    return res.json({ ok: true, shiftId, pausedAt: now });
  });

  r.post("/shifts/:shiftId/resume", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const sh = await prisma.shift.findUnique({ where: { id: shiftId }, select: { id: true, status: true, driverId: true } });
    if (!sh) return res.status(404).json({ error: "Shift not found" });
    if (sh.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (sh.status !== "ACTIVE") return res.status(400).json({ error: "Shift not ACTIVE", status: sh.status });

    const now = new Date();
    await prisma.shiftProgress.upsert({
      where: { shiftId },
      update: { pausedAt: null },
      create: { shiftId, lastReachedOrder: 0, startedAt: now, pausedAt: null },
    });
    await prisma.shiftProgress.updateMany({ where: { shiftId, startedAt: null }, data: { startedAt: now } });

    await audit(prisma, { actorUserId: req.user.id, actorRole: req.user.role, action: "DRIVER_SHIFT_RESUME", entity: "Shift", entityId: shiftId, meta: {} });
    return res.json({ ok: true, shiftId });
  });

  // DRIVER: complete shift (manual)
  r.post("/shifts/:shiftId/complete", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!["APPROVED", "ACTIVE", "DONE"].includes(shift.status)) {
      return res.status(400).json({ error: "Shift cannot be completed in this status" });
    }


    const prog = await prisma.shiftProgress.findUnique({ where: { shiftId } });
    if (prog?.pausedAt) {
      return res.status(409).json({ error: "Shift paused", code: "SHIFT_PAUSED" });
    }

    const pending = (shift.stops ?? []).filter((s) => s.state === "PENDING");
    if (pending.length) {
      return res.status(400).json({ error: "Pending stops exist", pendingCount: pending.length });
    }

    if (shift.status !== "DONE") {
      await completeShift({ shiftId, roomId: shift.roomId, companyId: shift.companyId, vehicleId: shift.vehicleId, io });
    }

    await audit(prisma, { actorUserId: req.user.id, actorRole: req.user.role, action: "DRIVER_SHIFT_COMPLETE", entity: "Shift", entityId: shiftId, meta: { source: "MANUAL" } });
    return res.json({ ok: true, shiftId, status: "DONE" });
  });

  return r;
}

