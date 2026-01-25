//backend/src/routes/vehicles.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createVehicleSchema } from "../validators.js";

export function vehiclesRouter(io) {
  const r = express.Router();

  // List vehicles based on role
  r.get("/", authRequired(), async (req, res) => {
    const u = req.user;

    if (u.role === "ROOM") {
      if (!u.roomId) return res.json([]);
      const items = await prisma.vehicle.findMany({
        where: { roomId: u.roomId },
        include: {
          gpsLast: true,
          shifts: {
            where: { status: { in: ["APPROVED", "ACTIVE"] } },
            include: { company: true, driver: true, stops: { orderBy: { order: "asc" } } },
            orderBy: { id: "desc" },
            take: 5,
          },
        },
        orderBy: { id: "asc" },
      });
      return res.json(items);
    }

    if (u.role === "COMPANY") {
      if (!u.companyId) return res.json([]);
      const shifts = await prisma.shift.findMany({
        where: { companyId: u.companyId, status: { in: ["APPROVED", "ACTIVE"] }, vehicleId: { not: null } },
        select: { vehicleId: true },
      });
      const vehicleIds = Array.from(new Set(shifts.map((s) => s.vehicleId).filter(Boolean)));
      if (!vehicleIds.length) return res.json([]);
      const items = await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds } },
        include: { gpsLast: true, room: true },
        orderBy: { id: "asc" },
      });
      return res.json(items);
    }

    if (u.role === "DRIVER") {
      const driver = await prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true } });
      if (!driver) return res.json([]);
      const shifts = await prisma.shift.findMany({
        where: { driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] }, vehicleId: { not: null } },
        select: { vehicleId: true },
      });
      const vehicleIds = Array.from(new Set(shifts.map((s) => s.vehicleId).filter(Boolean)));
      if (!vehicleIds.length) return res.json([]);
      const items = await prisma.vehicle.findMany({ where: { id: { in: vehicleIds } }, include: { gpsLast: true, room: true } });
      return res.json(items);
    }

    if (u.role === "PERSONEL") {
      // MVP: personel kendi şirketindeki aktif vardiyalardaki araçları görebilir.
      if (!u.companyId) return res.json([]);
      const shifts = await prisma.shift.findMany({
        where: { companyId: u.companyId, status: { in: ["APPROVED", "ACTIVE"] }, vehicleId: { not: null } },
        select: { vehicleId: true },
      });
      const vehicleIds = Array.from(new Set(shifts.map((s) => s.vehicleId).filter(Boolean)));
      if (!vehicleIds.length) return res.json([]);
      const items = await prisma.vehicle.findMany({ where: { id: { in: vehicleIds } }, include: { gpsLast: true } });
      return res.json(items);
    }

    // SUPER_ADMIN: all
    const items = await prisma.vehicle.findMany({ include: { gpsLast: true, room: true }, orderBy: { id: "asc" } });
    return res.json(items);
  });

  // Create vehicle (ROOM)
  r.post("/", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const parsed = createVehicleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { plate, capacity, speedLimitKmh, nextMaintenanceAt } = parsed.data;
    const vehicle = await prisma.vehicle.create({
      data: {
        roomId: u.roomId,
        plate,
        capacity,
        speedLimitKmh: speedLimitKmh ?? 80,
        nextMaintenanceAt: nextMaintenanceAt ? new Date(nextMaintenanceAt) : null,
      },
    });

    io.to(`room:${u.roomId}`).emit("vehicle:update", { vehicleId: vehicle.id, action: "created" });
    res.json(vehicle);
  });

  return r;
}
