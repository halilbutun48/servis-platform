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
          driver: true,
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


  // Bind driver to vehicle (ROOM)
  r.put("/:id/bind-driver", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const vehicleId = Number(req.params.id);
    const driverId = Number(req.body?.driverId);

    if (!u.roomId) return res.status(400).json({ code: "BAD_REQUEST", message: "ROOM must have roomId" });
    if (!vehicleId || !driverId) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "driverId gerekli" });
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, roomId: true } });
    if (!vehicle) return res.status(404).json({ code: "NOT_FOUND", message: "Vehicle bulunamadı" });
    if (vehicle.roomId !== u.roomId) return res.status(403).json({ code: "FORBIDDEN", message: "Forbidden" });

    const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true, roomId: true, fullName: true } });
    if (!driver) return res.status(404).json({ code: "NOT_FOUND", message: "Driver bulunamadı" });
    if (driver.roomId !== u.roomId) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "Driver aynı room içinde olmalı" });
    }

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { driverId },
      include: { gpsLast: true, driver: true },
    });

    io.to(`room:${u.roomId}`).emit("vehicle:update", { vehicleId: updated.id, action: "bind-driver" });
    return res.json({ ok: true, vehicle: updated });
  });

  // Create vehicle (ROOM)
  r.post("/", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const parsed = createVehicleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const {
      plate,
      capacity,
      speedLimitKmh,
      nextMaintenanceAt,

      type,
      brand,
      model,
      modelYear,
      color,
      vin,
      note,

      inspectionDueAt,
      insuranceDueAt,
      cascoDueAt,

      lastServiceAt,
      lastServiceKm,
      serviceIntervalKm,
      serviceIntervalDays,

      odometerKm,
    } = parsed.data;

    const dt = (v) => (v ? new Date(v) : null);

    const vehicle = await prisma.vehicle.create({
      data: {
        roomId: u.roomId,
        plate,
        capacity,
        speedLimitKmh: speedLimitKmh ?? 80,

        type: type ?? null,
        brand: brand ?? null,
        model: model ?? null,
        modelYear: modelYear ?? null,
        color: color ?? null,
        vin: vin ?? null,
        note: note ?? null,

        inspectionDueAt: dt(inspectionDueAt),
        insuranceDueAt: dt(insuranceDueAt),
        cascoDueAt: dt(cascoDueAt),

        lastServiceAt: dt(lastServiceAt),
        lastServiceKm: lastServiceKm ?? null,
        serviceIntervalKm: serviceIntervalKm ?? 15000,
        serviceIntervalDays: serviceIntervalDays ?? null,

        odometerKm: odometerKm ?? null,
        odometerUpdatedAt: odometerKm != null ? new Date() : null,
        odometerSource: odometerKm != null ? "MANUAL" : undefined,

        nextMaintenanceAt: dt(nextMaintenanceAt),
      },
    });

    io.to(`room:${u.roomId}`).emit("vehicle:update", { vehicleId: vehicle.id, action: "created" });
    res.json(vehicle);
  });

  return r;
}
