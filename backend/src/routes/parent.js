// backend/src/routes/parent.js
// ✅ M81: Parent role — child list + time-window live vehicles

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
  gpsState: { select: { lastUiStatus: true, lastChangeAt: true } },
};

function computeEtaTo(last, targetLat, targetLng) {
  if (!last || typeof last.lat !== "number" || typeof last.lng !== "number") return null;
  if (typeof targetLat !== "number" || typeof targetLng !== "number") return null;
  const speedKmh = typeof last.speed === "number" && last.speed > 1 ? last.speed : 30;
  const km = haversineKm(last.lat, last.lng, targetLat, targetLng);
  return { km: Number(km.toFixed(2)), etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)) };
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
      select: { vehicleId: true },
      take: 5000,
    });

    const vehicleIds = uniqNums(shifts.map((s) => s.vehicleId));
    if (!vehicleIds.length) return res.json([]);

    const items = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, archivedAt: null },
      select: VEHICLE_LIVE_SELECT,
      orderBy: { id: "asc" },
      take,
    });

    // ETA for the selected child (UI sends childId after first load).
    if (childId) {
      // Prefer StopAssignment.stop ETA; fallback to homeLat/homeLng.
      const [child, assigns] = await Promise.all([
        prisma.personel.findUnique({ where: { id: childId }, select: { id: true, fullName: true, homeLat: true, homeLng: true } }),
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
            shift: { select: { vehicleId: true } },
            stop: { select: { id: true, name: true, lat: true, lng: true } },
          },
          take: 2000,
        }),
      ]);

      const byVehicleId = new Map();
      for (const a of assigns || []) {
        const vid = a?.shift?.vehicleId;
        if (!vid || byVehicleId.has(vid)) continue;
        byVehicleId.set(vid, a.stop);
      }

      const patched = (items || []).map((v) => {
        const stop = byVehicleId.get(v.id) || null;
        const targetLat = stop?.lat ?? child?.homeLat ?? null;
        const targetLng = stop?.lng ?? child?.homeLng ?? null;
        const eta = computeEtaTo(v.gpsLast, targetLat, targetLng);

        return {
          ...v,
          childId,
          etaToChildMin: eta?.etaMin ?? null,
          etaToChildKm: eta?.km ?? null,
          etaTarget: stop
            ? { type: "STOP", stopId: stop.id, stopName: stop.name }
            : child?.homeLat != null && child?.homeLng != null
              ? { type: "HOME", label: child?.fullName ?? "Ev" }
              : null,
        };
      });

      return res.json(patched);
    }

    return res.json(items);
  });

  return r;
}
