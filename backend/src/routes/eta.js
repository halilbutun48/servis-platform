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
      where: { vehicleId, driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] } },
      select: { id: true },
    });
    return !!any;
  }

  if (user.role === "COMPANY" || user.role === "PERSONEL") {
    if (!user.companyId) return false;

    const any = await prisma.shift.findFirst({
      where: { vehicleId, companyId: user.companyId, status: { in: ["APPROVED", "ACTIVE"] } },
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
    if (!["APPROVED", "ACTIVE"].includes(s.status)) return null;
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

  return null;
}

async function computeEta(vehicleId, shiftId) {
  const last = await prisma.gpsLast.findUnique({ where: { vehicleId } });
  if (!last) return { error: "No last gps for vehicle", status: 404 };

  const chosen = await pickShift(vehicleId, shiftId);

  const speedKmh = typeof last.speed === "number" ? last.speed : 30;
  const { status, ageSec } = gpsStatusFromAt(last.at);

  const chosenShiftId = chosen?.id ?? null;
  const remainingStops = (chosen?.stops ?? []).filter((s) => s.state === "PENDING");

  const stops = remainingStops.map((st) => {
    const km = haversineKm(last.lat, last.lng, st.lat, st.lng);
    return {
      id: st.id,
      name: st.name,
      order: st.order,
      remainingKm: Number(km.toFixed(2)),
      etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
    };
  });

  return {
    shiftId: chosenShiftId,
    vehicleId,
    at: new Date().toISOString(),
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
