// backend/src/routes/parent.js
// ✅ M81: Parent role — child list + time-window live vehicles (+ live stop progress)

import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { haversineKm, etaMinutes } from "../geo.js";

function uniqNums(xs) {
  return Array.from(new Set((xs || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)));
}

const VEHICLE_LIVE_SELECT = {
  id: true,
  plate: true,
  capacity: true,
  roomId: true,
  room: { select: { id: true, name: true } },
  gpsLast: { select: { lat: true, lng: true, at: true, status: true, speed: true } },
  gpsState: { select: { lastUiStatus: true, lastChangedAt: true } },
};

function computeEtaTo(last, targetLat, targetLng) {
  if (!last || typeof last.lat !== "number" || typeof last.lng !== "number") return null;
  if (typeof targetLat !== "number" || typeof targetLng !== "number") return null;
  const speedKmh = typeof last.speed === "number" && last.speed > 1 ? last.speed : 30;
  const km = haversineKm(last.lat, last.lng, targetLat, targetLng);
  return { km: Number(km.toFixed(2)), etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)) };
}

function computeStopProgress(stops, childStopId) {
  const arr = Array.isArray(stops) ? stops.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
  const pending = arr.filter((s) => s?.state === "PENDING");
  const next = pending[0] || null;
  const remainingStopsTotal = pending.length;

  const childStop = childStopId ? arr.find((s) => Number(s.id) === Number(childStopId)) || null : null;
  const childStopReached = childStop ? childStop.state === "REACHED" : null;

  let remainingStopsToChild = null;
  if (childStop) {
    if (childStopReached) remainingStopsToChild = 0;
    else if (next) {
      const from = next.order;
      const to = childStop.order;
      remainingStopsToChild = pending.filter((s) => s.order >= from && s.order <= to).length;
    } else {
      remainingStopsToChild = 0;
    }
  }

  return {
    nextStop: next
      ? {
          id: next.id,
          name: next.name,
          order: next.order,
          type: next.type,
        }
      : null,
    remainingStopsTotal,
    childStop: childStop
      ? {
          id: childStop.id,
          name: childStop.name,
          order: childStop.order,
        }
      : null,
    remainingStopsToChild,
    childStopReached,
  };
}

export function parentRouter() {
  const r = express.Router();

  // GET /api/parent/children
  r.get("/children", authRequired(), requireRole("PARENT"), async (req, res) => {
    const u = req.user;

    const links = await prisma.parentChild.findMany({
      where: { parentUserId: u.id },
      orderBy: [{ id: "asc" }],
      include: {
        child: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            homeAddress: true,
            kind: true,
            company: { select: { id: true, name: true, kind: true, regionId: true, district: true } },
          },
        },
      },
    });

    const items = links
      .map((x) => x.child)
      .filter(Boolean)
      .map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        homeAddress: c.homeAddress,
        kind: c.kind,
        company: c.company,
      }));

    res.json({ items });
  });

  // GET /api/parent/live/vehicles?childId=
  // Returns minimal vehicles list like /api/live/vehicles but scoped to parent's children.
  r.get("/live/vehicles", authRequired(), requireRole("PARENT"), async (req, res) => {
    const u = req.user;
    const now = new Date();

    const childIdRaw = req.query?.childId != null ? String(req.query.childId).trim() : "";
    const childId = childIdRaw ? Number(childIdRaw) : null;

    const links = await prisma.parentChild.findMany({
      where: { parentUserId: u.id, ...(childId ? { personelId: childId } : {}) },
      select: { personelId: true },
      take: 2000,
    });

    const childIds = uniqNums(links.map((x) => x.personelId));
    if (!childIds.length) return res.json([]);

    const takeRaw = Number(req.query?.take ?? 2000);
    const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(5000, takeRaw)) : 2000;

    // Active window shifts containing the child (via people link or stop assignment)
    const shifts = await prisma.shift.findMany({
      where: {
        status: { in: ["APPROVED", "ACTIVE"] },
        vehicleId: { not: null },
        startAt: { lte: now },
        endAt: { gte: now },
        OR: [
          { people: { some: { personelId: { in: childIds } } } },
          { assignments: { some: { personelId: { in: childIds } } } },
        ],
      },
      select: { id: true, vehicleId: true },
      take: 5000,
      orderBy: { id: "asc" },
    });

    const vehicleIds = uniqNums(shifts.map((s) => s.vehicleId));
    if (!vehicleIds.length) return res.json([]);

    const shiftByVehicleId = new Map();
    for (const s of shifts) {
      const vid = Number(s.vehicleId);
      if (!vid || shiftByVehicleId.has(vid)) continue;
      shiftByVehicleId.set(vid, Number(s.id));
    }

    const shiftIds = uniqNums(Array.from(shiftByVehicleId.values()));

    const items = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, archivedAt: null },
      select: VEHICLE_LIVE_SELECT,
      orderBy: { id: "asc" },
      take,
    });

    // If UI provided a specific child, enrich response with ETA + stop progress.
    if (childId) {
      const [child, assigns, stops] = await Promise.all([
        prisma.personel.findUnique({
          where: { id: childId },
          select: { id: true, fullName: true, homeLat: true, homeLng: true },
        }),
        prisma.stopAssignment.findMany({
          where: {
            personelId: childId,
            shift: {
              status: { in: ["APPROVED", "ACTIVE"] },
              vehicleId: { in: vehicleIds },
              startAt: { lte: now },
              endAt: { gte: now },
            },
          },
          select: {
            shift: { select: { id: true, vehicleId: true } },
            stop: { select: { id: true, name: true, lat: true, lng: true, order: true, state: true, type: true } },
          },
          take: 2000,
        }),
        shiftIds.length
          ? prisma.stop.findMany({
              where: { shiftId: { in: shiftIds } },
              select: { id: true, shiftId: true, name: true, order: true, state: true, type: true },
              orderBy: [{ shiftId: "asc" }, { order: "asc" }],
              take: 20000,
            })
          : Promise.resolve([]),
      ]);

      const childStopByVehicleId = new Map();
      for (const a of assigns || []) {
        const vid = a?.shift?.vehicleId;
        if (!vid || childStopByVehicleId.has(vid)) continue;
        childStopByVehicleId.set(Number(vid), a.stop);
      }

      const stopsByShiftId = new Map();
      for (const st of stops || []) {
        const sid = Number(st.shiftId);
        if (!stopsByShiftId.has(sid)) stopsByShiftId.set(sid, []);
        stopsByShiftId.get(sid).push(st);
      }

      const patched = (items || []).map((v) => {
        const stop = childStopByVehicleId.get(Number(v.id)) || null;
        const targetLat = stop?.lat ?? child?.homeLat ?? null;
        const targetLng = stop?.lng ?? child?.homeLng ?? null;
        const eta = computeEtaTo(v.gpsLast, targetLat, targetLng);

        const sid = shiftByVehicleId.get(Number(v.id)) || null;
        const shiftStops = sid ? stopsByShiftId.get(Number(sid)) || [] : [];
        const progress = computeStopProgress(shiftStops, stop?.id ?? null);

        return {
          ...v,
          childId,
          // ETA
          etaToChildMin: eta?.etaMin ?? null,
          etaToChildKm: eta?.km ?? null,
          etaTarget: stop
            ? { type: "STOP", stopId: stop.id, stopName: stop.name }
            : child?.homeLat != null && child?.homeLng != null
              ? { type: "HOME", label: child?.fullName ?? "Ev" }
              : null,
          // Live stop progress
          nextStop: progress.nextStop,
          remainingStopsTotal: progress.remainingStopsTotal,
          childStop: progress.childStop,
          remainingStopsToChild: progress.remainingStopsToChild,
          childStopReached: progress.childStopReached,
        };
      });

      return res.json(patched);
    }

    return res.json(items);
  });

  return r;
}
