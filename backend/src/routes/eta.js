//backend/src/routes/eta.js
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
    const driver = await prisma.driver.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!driver) return false;

    const any = await prisma.shift.findFirst({
      where: {
        vehicleId,
        driverId: driver.id,
        status: { in: ["APPROVED", "ACTIVE"] },
      },
      select: { id: true },
    });
    return !!any;
  }

  if (user.role === "COMPANY" || user.role === "PERSONEL") {
    if (!user.companyId) return false;

    const any = await prisma.shift.findFirst({
      where: {
        vehicleId,
        companyId: user.companyId,
        status: { in: ["APPROVED", "ACTIVE"] },
      },
      select: { id: true },
    });
    return !!any;
  }

  return false;
}

async function computeEtaPayload(vehicleId) {
  const last = await prisma.gpsLast.findUnique({ where: { vehicleId } });
  if (!last) return { error: "No last gps for vehicle", status: 404 };

  const shifts = await prisma.shift.findMany({
    where: { vehicleId, status: { in: ["APPROVED", "ACTIVE"] } },
    include: { stops: { orderBy: { order: "asc" } } },
  });

  const speedKmh = typeof last.speed === "number" ? last.speed : 30;

  const items = shifts
    .filter((s) => (s.stops?.length ?? 0) > 0)
    .map((s) => ({
      shiftId: s.id,
      vehicleId,
      at: new Date().toISOString(),
      stops: s.stops.map((st) => {
        const km = haversineKm(last.lat, last.lng, st.lat, st.lng);
        return {
          id: st.id,
          name: st.name,
          order: st.order,
          remainingKm: Number(km.toFixed(2)),
          etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
        };
      }),
    }));

  // ✅ payload standardizasyonu: status + ageSec tek kaynaktan
  const { status, ageSec } = gpsStatusFromAt(last.at);

  return {
    vehicleId,
    last: {
      lat: last.lat,
      lng: last.lng,
      speed: last.speed,
      at: last.at,
      status, // LIVE / STALE / OFFLINE
      ageSec, // saniye cinsinden yaş
    },
    items,
  };
}

/**
 * ✅ Yeni: UI'nin çağırdığı format
 * GET /api/eta?vehicleId=1
 */
etaRouter.get("/", authRequired(), async (req, res) => {
  const vehicleId = Number(req.query.vehicleId);
  if (!vehicleId) return res.status(400).json({ error: "vehicleId query param required" });
  if (!(await canSeeVehicle(req.user, vehicleId))) return res.status(403).json({ error: "Forbidden" });

  const payload = await computeEtaPayload(vehicleId);
  if (payload?.error && payload?.status) return res.status(payload.status).json({ error: payload.error });
  res.json(payload);
});

/**
 * Var olan: REST format
 * GET /api/eta/vehicle/1
 */
etaRouter.get("/vehicle/:id", authRequired(), async (req, res) => {
  const vehicleId = Number(req.params.id);
  if (!(await canSeeVehicle(req.user, vehicleId))) return res.status(403).json({ error: "Forbidden" });

  const payload = await computeEtaPayload(vehicleId);
  if (payload?.error && payload?.status) return res.status(payload.status).json({ error: payload.error });
  res.json(payload);
});