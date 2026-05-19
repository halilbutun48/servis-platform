// backend/src/routes/eta.js
import express from "express";
import { prisma } from "../prisma.js";
import { isoOffsetTR } from "../time/tr.js";
import { authRequired } from "../auth/middleware.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { getNextStopEta } from "../services/routeEtaService.js";

export const etaRouter = express.Router();

async function canSeeVehicle(user, vehicleId) {
  if (user.role === "SUPER_ADMIN") return true;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { roomId: true },
  });
  if (!vehicle) return false;

  if (user.role === "ROOM") return !!user.roomId && vehicle.roomId === user.roomId;

  if (user.role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (!driver) return false;

    const any = await prisma.shift.findFirst({
      where: { vehicleId, driverId: driver.id, status: { in: ["APPROVED", "ACTIVE", "DONE"] } },
      select: { id: true },
    });
    return !!any;
  }

  if (user.role === "COMPANY" || user.role === "PERSONEL") {
    if (!user.companyId) return false;

    const any = await prisma.shift.findFirst({
      where: { vehicleId, companyId: user.companyId, status: { in: ["APPROVED", "ACTIVE", "DONE"] } },
      select: { id: true },
    });
    return !!any;
  }

  return false;
}

async function pickShift(vehicleId, shiftId) {
  if (shiftId) {
    const s = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!s) return null;
    if (s.vehicleId !== vehicleId) return null;
    if (!["APPROVED", "ACTIVE", "DONE"].includes(s.status)) return null;
    return s;
  }

  const active = await prisma.shift.findFirst({
    where: { vehicleId, status: "ACTIVE" },
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    include: { stops: { orderBy: { order: "asc" } } },
  });
  if (active && (active.stops?.length ?? 0) > 0) return active;

  const approved = await prisma.shift.findFirst({
    where: { vehicleId, status: "APPROVED" },
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    include: { stops: { orderBy: { order: "asc" } } },
  });
  if (approved && (approved.stops?.length ?? 0) > 0) return approved;

  const done = await prisma.shift.findFirst({
    where: { vehicleId, status: "DONE" },
    orderBy: [{ id: "desc" }],
    include: { stops: { orderBy: { order: "asc" } } },
  });
  if (done) return done;

  return null;
}

function firstPendingStop(stops) {
  return (stops ?? []).find((s) => String(s?.state || "").toUpperCase() === "PENDING") ?? null;
}

function lastResolvedStop(stops) {
  const resolved = (stops ?? []).filter((s) => ["REACHED", "SKIPPED"].includes(String(s?.state || "").toUpperCase()));
  return resolved.length ? resolved[resolved.length - 1] : null;
}

function buildSkippedStops(stops) {
  return (stops ?? [])
    .filter((s) => String(s?.state || "").toUpperCase() === "SKIPPED")
    .map((s) => ({
      id: s.id,
      order: s.order,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      skippedAt: s.skippedAt ?? null,
    }));
}

function buildRouteEtaStops({ last, speedKmh, remainingStops }) {
  const items = [];
  let prevLat = Number(last?.lat);
  let prevLng = Number(last?.lng);
  let cumulativeKm = 0;

  for (let i = 0; i < (remainingStops ?? []).length; i += 1) {
    const st = remainingStops[i];
    const directKm = haversineKm(last.lat, last.lng, st.lat, st.lng);
    const segmentKm = Number.isFinite(prevLat) && Number.isFinite(prevLng) ? haversineKm(prevLat, prevLng, st.lat, st.lng) : directKm;
    cumulativeKm += segmentKm;
    items.push({
      id: st.id,
      name: st.name,
      order: st.order,
      remainingKm: Number(directKm.toFixed(2)),
      etaMin: Number(etaMinutes(directKm, speedKmh).toFixed(0)),
      remainingRouteKm: Number(cumulativeKm.toFixed(2)),
      remainingRouteEtaMin: Number(etaMinutes(cumulativeKm, speedKmh).toFixed(0)),
      remainingStopsToHere: i + 1,
    });
    prevLat = Number(st.lat);
    prevLng = Number(st.lng);
  }

  return items;
}

function countStopsByState(stops) {
  const out = { totalStopsCount: 0, pendingStopsCount: 0, reachedStopsCount: 0, skippedStopsCount: 0 };
  for (const s of stops ?? []) {
    out.totalStopsCount += 1;
    const st = String(s?.state || "").toUpperCase();
    if (st === "REACHED") out.reachedStopsCount += 1;
    else if (st === "SKIPPED") out.skippedStopsCount += 1;
    else out.pendingStopsCount += 1;
  }
  return out;
}

function deriveRouteProgress({ hasShift, counts, gpsStatus }) {
  if (!hasShift) {
    return { routeQuality: "NO_SHIFT", routeProgressState: "NO_SHIFT", progressLabel: "Aktif rota yok" };
  }

  if ((counts?.totalStopsCount ?? 0) > 0 && (counts?.pendingStopsCount ?? 0) === 0) {
    if ((counts?.skippedStopsCount ?? 0) > 0) {
      return { routeQuality: "DONE_WITH_SKIPS", routeProgressState: "DONE_WITH_SKIPS", progressLabel: "Rota tamamlandı (atlanan durak var)" };
    }
    return { routeQuality: "DONE", routeProgressState: "DONE", progressLabel: "Rota tamamlandı" };
  }

  if (gpsStatus === "OFFLINE") {
    return { routeQuality: "OFFLINE_GPS", routeProgressState: "GPS_OFFLINE", progressLabel: "GPS kapalı veya çok eski" };
  }
  if (gpsStatus === "STALE") {
    return { routeQuality: "STALE_GPS", routeProgressState: "GPS_STALE", progressLabel: "GPS gecikmeli" };
  }
  if ((counts?.skippedStopsCount ?? 0) > 0) {
    return { routeQuality: "SKIP_PRESENT", routeProgressState: "IN_PROGRESS_WITH_SKIPS", progressLabel: "İlerliyor (atlanan durak var)" };
  }

  return { routeQuality: "FOUNDATION", routeProgressState: "IN_PROGRESS", progressLabel: "Rota ilerliyor" };
}

function deriveNextAction({ progress, nextStop, skippedStopsCount }) {
  const state = String(progress?.routeProgressState || "").toUpperCase();
  if (state === "NO_SHIFT") {
    return { rerouteSuggested: false, rerouteReason: null, nextAction: "NO_ACTIVE_ROUTE" };
  }
  if (state === "GPS_OFFLINE" || state === "GPS_STALE") {
    return { rerouteSuggested: false, rerouteReason: "GPS_FRESHNESS_LOW", nextAction: "WAIT_GPS_UPDATE" };
  }
  if (state === "DONE_WITH_SKIPS") {
    return { rerouteSuggested: true, rerouteReason: "SKIPPED_STOP_PRESENT", nextAction: "CONTACT_ROOM" };
  }
  if (state === "DONE") {
    return { rerouteSuggested: false, rerouteReason: null, nextAction: "ROUTE_DONE" };
  }
  if ((skippedStopsCount ?? 0) > 0 && nextStop) {
    return { rerouteSuggested: true, rerouteReason: "SKIPPED_STOP_PRESENT", nextAction: "CONTINUE_TO_NEXT_PENDING" };
  }
  if (nextStop) {
    return { rerouteSuggested: false, rerouteReason: null, nextAction: "CONTINUE_TO_NEXT_PENDING" };
  }
  return { rerouteSuggested: false, rerouteReason: null, nextAction: "WAIT_ROUTE_UPDATE" };
}

async function computeEta(vehicleId, shiftId) {
  const last = await prisma.gpsLast.findUnique({ where: { vehicleId } });
  if (!last) return { error: "No last gps for vehicle", status: 404 };

  const chosen = await pickShift(vehicleId, shiftId);

  const speedKmh = typeof last.speed === "number" ? last.speed : 30;
  const { status, ageSec } = gpsStatusFromAt(last.at);

  const chosenShiftId = chosen?.id ?? null;
  const allStops = chosen?.stops ?? [];
  const remainingStops = allStops.filter((s) => String(s?.state || "").toUpperCase() === "PENDING");
  const stops = buildRouteEtaStops({ last, speedKmh, remainingStops });
  const nextStop = firstPendingStop(allStops);
  const resolvedStop = lastResolvedStop(allStops);
  const skippedStops = buildSkippedStops(allStops);
  const tail = stops.length ? stops[stops.length - 1] : null;
  const counts = countStopsByState(allStops);
  const progress = deriveRouteProgress({ hasShift: !!chosenShiftId, counts, gpsStatus: status });
  const next = deriveNextAction({ progress, nextStop, skippedStopsCount: counts.skippedStopsCount });
  const etaBridge = nextStop
    ? await getNextStopEta({
        vehicle: { gpsLast: last, speedKmh },
        nextStop: { lat: nextStop.lat, lng: nextStop.lng, name: nextStop.name, order: nextStop.order },
        gpsFreshness: { status, ageSec, gpsLast: last },
        requestId: `eta:${vehicleId}:${shiftId ?? "auto"}`,
        timeoutMs: 2000,
      })
    : null;
  const etaSource = etaBridge?.source ?? "UNAVAILABLE";
  const etaReliability = etaBridge?.reliability ?? (status === "OFFLINE" ? "offline" : status === "STALE" ? "stale" : status === "LIVE" ? "fresh" : "unknown");
  const etaDisplayMode = etaBridge?.displayMode ?? (nextStop ? (status === "LIVE" ? "exact" : status === "STALE" || status === "OFFLINE" ? "not-current" : "unavailable") : "unavailable");
  const etaReason = etaBridge?.reason ?? (nextStop ? `GPS_${String(status || "UNKNOWN").toUpperCase()}` : "NO_NEXT_STOP");

  const resolvedPayload = resolvedStop
    ? {
        id: resolvedStop.id,
        name: resolvedStop.name,
        order: resolvedStop.order,
        state: String(resolvedStop.state || "").toUpperCase(),
        lat: resolvedStop.lat,
        lng: resolvedStop.lng,
        reachedAt: resolvedStop.reachedAt ?? null,
        skippedAt: resolvedStop.skippedAt ?? null,
      }
    : null;

  return {
    shiftId: chosenShiftId,
    vehicleId,
    at: isoOffsetTR(),
    etaMode: "ROUTE_CHAIN_HAVERSINE",
    routeQuality: progress.routeQuality,
    routeProgressState: progress.routeProgressState,
    progressLabel: progress.progressLabel,
    gpsFreshness: status,
    etaSource: etaSource,
    etaReliability: etaReliability,
    etaDisplayMode: etaDisplayMode,
    etaReason: etaReason,
    totalStopsCount: counts.totalStopsCount,
    reachedStopsCount: counts.reachedStopsCount,
    skippedStopsCount: counts.skippedStopsCount,
    remainingStopsCount: counts.pendingStopsCount,
    remainingRouteKm: tail?.remainingRouteKm ?? 0,
    remainingRouteEtaMin: tail?.remainingRouteEtaMin ?? 0,
    etaRoute: etaBridge
      ? {
          ok: etaBridge.ok,
          source: etaBridge.source,
          etaMinutes: etaBridge.etaMinutes,
          distanceMeters: etaBridge.distanceMeters,
          durationSeconds: etaBridge.durationSeconds,
          reliability: etaBridge.reliability,
          displayMode: etaBridge.displayMode,
          reason: etaBridge.reason,
        }
      : null,
    nextStop: nextStop
      ? {
          id: nextStop.id,
          name: nextStop.name,
          order: nextStop.order,
          lat: nextStop.lat,
          lng: nextStop.lng,
          etaMin: etaBridge?.etaMinutes ?? null,
          etaSource: etaSource,
          etaReliability: etaReliability,
          etaDisplayMode: etaDisplayMode,
          etaReason: etaReason,
        }
      : null,
    lastResolvedStop: resolvedPayload,
    lastCompletedStop: resolvedPayload,
    skippedStops,
    rerouteSuggested: next.rerouteSuggested,
    rerouteReason: next.rerouteReason,
    nextAction: next.nextAction,
    navigation: nextStop
      ? {
          lat: nextStop.lat,
          lng: nextStop.lng,
          label: nextStop.name || `Durak ${nextStop.order || ""}`.trim(),
        }
      : null,
    stops,
    last: { lat: last.lat, lng: last.lng, speed: last.speed, at: last.at, status, ageSec },
  };
}

etaRouter.get("/", authRequired(), async (req, res) => {
  const vehicleId = Number(req.query.vehicleId);
  const shiftId = req.query.shiftId ? Number(req.query.shiftId) : null;
  if (!vehicleId) return res.status(400).json({ error: "vehicleId query param required" });
  if (!(await canSeeVehicle(req.user, vehicleId))) return res.status(403).json({ error: "Forbidden" });

  const payload = await computeEta(vehicleId, shiftId);
  if (payload?.error && payload?.status) return res.status(payload.status).json({ error: payload.error });
  res.json(payload);
});

etaRouter.get("/vehicle/:id", authRequired(), async (req, res) => {
  const vehicleId = Number(req.params.id);
  const shiftId = req.query.shiftId ? Number(req.query.shiftId) : null;
  if (!(await canSeeVehicle(req.user, vehicleId))) return res.status(403).json({ error: "Forbidden" });

  const payload = await computeEta(vehicleId, shiftId);
  if (payload?.error && payload?.status) return res.status(payload.status).json({ error: payload.error });
  res.json(payload);
});
