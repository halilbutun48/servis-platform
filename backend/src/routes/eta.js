// backend/src/routes/eta.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { gpsStatusFromAt } from "../gps/status.js";

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

  // If the shift was auto-completed (DONE) after the last stop was reached,
  // still allow ETA queries to return an empty pending list rather than 403.
  const done = await prisma.shift.findFirst({
    where: { vehicleId, status: "DONE" },
    orderBy: [{ id: "desc" }],
    include: { stops: { orderBy: { order: "asc" } } },
  });
  if (done) return done;

  return null;
}

function firstPendingStop(stops) {
  return (stops ?? []).find((s) => s.state === "PENDING") ?? null;
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

function listStopsByState(stops, wantedState) {
  const target = String(wantedState || "").toUpperCase();
  return (stops ?? [])
    .filter((s) => String(s?.state || "").toUpperCase() === target)
    .map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
      reachedAt: s.reachedAt ?? null,
      skippedAt: s.skippedAt ?? null,
    }));
}

function lastResolvedStop(stops) {
  let best = null;
  for (const s of stops ?? []) {
    const st = String(s?.state || "").toUpperCase();
    if (st !== "REACHED" && st !== "SKIPPED") continue;
    if (!best || Number(s?.order || 0) > Number(best?.order || 0)) best = s;
  }
  if (!best) return null;
  return {
    id: best.id,
    name: best.name,
    order: best.order,
    state: best.state,
    reachedAt: best.reachedAt ?? null,
    skippedAt: best.skippedAt ?? null,
  };
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

function deriveNextAction({ hasShift, counts, gpsStatus, nextStop, skippedStops, lastStop }) {
  if (!hasShift) {
    return { code: "NO_ACTIVE_SHIFT", text: "Aktif rota yok." };
  }

  if ((counts?.totalStopsCount ?? 0) > 0 && (counts?.pendingStopsCount ?? 0) === 0) {
    if ((counts?.skippedStopsCount ?? 0) > 0) {
      return {
        code: "ROUTE_DONE_WITH_SKIPS",
        text: "Rota tamamlandı. Atlanan duraklar için oda ile görüşün.",
      };
    }
    return { code: "ROUTE_DONE", text: "Rota tamamlandı." };
  }

  if (gpsStatus === "OFFLINE") {
    return { code: "WAIT_GPS_OFFLINE", text: "Araç GPS verisi çok eski. Konum güncellenince rota netleşir." };
  }
  if (gpsStatus === "STALE") {
    return { code: "WAIT_GPS_STALE", text: "Araç GPS verisi gecikmeli. ETA yaklaşık gösteriliyor." };
  }

  if (nextStop?.name && (skippedStops?.length ?? 0) > 0) {
    return {
      code: "GO_NEXT_PENDING_AFTER_SKIP",
      text: `Atlanan durak sonrası aktif hedef: ${nextStop.name}`,
    };
  }

  if (nextStop?.name) {
    return {
      code: "GO_NEXT_PENDING",
      text: `Sıradaki aktif durak: ${nextStop.name}`,
    };
  }

  if (lastStop?.name) {
    return {
      code: "CHECK_LAST_COMPLETED",
      text: `Son işlenen durak: ${lastStop.name}`,
    };
  }

  return { code: "CHECK_ROUTE", text: "Rota bilgisi güncelleniyor." };
}

async function computeEta(vehicleId, shiftId) {
  const last = await prisma.gpsLast.findUnique({ where: { vehicleId } });
  if (!last) return { error: "No last gps for vehicle", status: 404 };

  const chosen = await pickShift(vehicleId, shiftId);

  const speedKmh = typeof last.speed === "number" ? last.speed : 30;
  const { status, ageSec } = gpsStatusFromAt(last.at);

  const chosenShiftId = chosen?.id ?? null;
  const allStops = chosen?.stops ?? [];
  const remainingStops = allStops.filter((s) => s.state === "PENDING");
  const stops = buildRouteEtaStops({ last, speedKmh, remainingStops });
  const nextStop = firstPendingStop(allStops);
  const tail = stops.length ? stops[stops.length - 1] : null;
  const counts = countStopsByState(allStops);
  const skippedStops = listStopsByState(allStops, "SKIPPED");
  const lastStop = lastResolvedStop(allStops);
  const progress = deriveRouteProgress({ hasShift: !!chosenShiftId, counts, gpsStatus: status });
  const nextAction = deriveNextAction({
    hasShift: !!chosenShiftId,
    counts,
    gpsStatus: status,
    nextStop,
    skippedStops,
    lastStop,
  });
  const rerouteSuggested = (skippedStops.length > 0) && !!nextStop;
  const rerouteReason = rerouteSuggested ? "Atlanan durak sonrası rota bir sonraki aktif durağa göre gösteriliyor." : null;

  return {
    shiftId: chosenShiftId,
    vehicleId,
    at: new Date().toISOString(),
    etaMode: "ROUTE_CHAIN_HAVERSINE",
    routeQuality: progress.routeQuality,
    routeProgressState: progress.routeProgressState,
    progressLabel: progress.progressLabel,
    gpsFreshness: status,
    totalStopsCount: counts.totalStopsCount,
    reachedStopsCount: counts.reachedStopsCount,
    skippedStopsCount: counts.skippedStopsCount,
    remainingStopsCount: counts.pendingStopsCount,
    remainingRouteKm: tail?.remainingRouteKm ?? 0,
    remainingRouteEtaMin: tail?.remainingRouteEtaMin ?? 0,
    lastCompletedStop: lastStop,
    skippedStops,
    rerouteSuggested,
    rerouteReason,
    nextAction,
    nextStop: nextStop
      ? {
          id: nextStop.id,
          name: nextStop.name,
          order: nextStop.order,
          lat: nextStop.lat,
          lng: nextStop.lng,
        }
      : null,
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
