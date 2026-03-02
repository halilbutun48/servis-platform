// backend/src/routes/live.js
// ✅ M77: lightweight live endpoints (map/telemetry)

import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";

function uniqNums(xs) {
  return Array.from(new Set((xs || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)));
}

const VEHICLE_LIVE_SELECT = {
  id: true,
  plate: true,
  capacity: true,
  roomId: true,
  room: { select: { id: true, name: true } },
  gpsLast: { select: { lat: true, lng: true, at: true, status: true } },
  gpsState: { select: { lastUiStatus: true, lastChangeAt: true } },
};

export function liveRouter() {
  const r = express.Router();

  // ---------------------------------------------------------
  // GET /api/live/vehicles
  // - COMPANY/PERSONEL: approved/active shifts (onlyNow time-window) => vehicles
  // - DRIVER: my approved/active shifts => vehicles
  // - ROOM: room vehicles (active only)
  // - SUPER_ADMIN: active vehicles (cap)
  // ---------------------------------------------------------
  r.get("/vehicles", authRequired(), async (req, res) => {
    const u = req.user;

    // hard cap (avoid accidental "return everything")
    const takeRaw = Number(req.query?.take ?? 2000);
    const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(5000, takeRaw)) : 2000;

    if (u.role === "ROOM") {
      if (!u.roomId) return res.json([]);
      const items = await prisma.vehicle.findMany({
        where: { roomId: u.roomId, archivedAt: null },
        select: VEHICLE_LIVE_SELECT,
        orderBy: { id: "asc" },
        take,
      });
      return res.json(items);
    }

    if (u.role === "COMPANY" || u.role === "PERSONEL") {
      if (!u.companyId) return res.json([]);
      // ✅ KVKK time-window gate: only shifts where startAt<=now<=endAt
      const now = new Date();
      const shifts = await prisma.shift.findMany({
        where: {
          companyId: u.companyId,
          status: { in: ["APPROVED", "ACTIVE"] },
          vehicleId: { not: null },
          startAt: { lte: now },
          endAt: { gte: now },
        },
        select: { vehicleId: true },
      });
      const vehicleIds = uniqNums(shifts.map((s) => s.vehicleId));
      if (!vehicleIds.length) return res.json([]);

      const items = await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds }, archivedAt: null },
        select: VEHICLE_LIVE_SELECT,
        orderBy: { id: "asc" },
        take,
      });
      return res.json(items);
    }

    if (u.role === "DRIVER") {
      const driver = await prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true } });
      if (!driver) return res.json([]);

      const shifts = await prisma.shift.findMany({
        where: {
          driverId: driver.id,
          status: { in: ["APPROVED", "ACTIVE"] },
          vehicleId: { not: null },
        },
        select: { vehicleId: true },
      });
      const vehicleIds = uniqNums(shifts.map((s) => s.vehicleId));
      if (!vehicleIds.length) return res.json([]);

      const items = await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds }, archivedAt: null },
        select: VEHICLE_LIVE_SELECT,
        orderBy: { id: "asc" },
        take,
      });
      return res.json(items);
    }

    // SUPER_ADMIN fallback
    const items = await prisma.vehicle.findMany({
      where: { archivedAt: null },
      select: VEHICLE_LIVE_SELECT,
      orderBy: { id: "asc" },
      take,
    });
    return res.json(items);
  });

  return r;
}
