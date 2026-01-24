import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createShiftSchema, approveShiftSchema, setRouteSchema } from "../validators.js";

export function shiftsRouter(io) {
  const r = express.Router();

  // COMPANY: create shift request (REQUESTED)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const u = req.user;
    if (!u.companyId) return res.status(400).json({ error: "COMPANY must have companyId" });

    const parsed = createShiftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.create({
      data: {
        companyId: u.companyId,
        roomId: parsed.data.roomId,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        status: "REQUESTED",
      },
    });

    io.to(`room:${shift.roomId}`).emit("shift:update", { shiftId: shift.id, action: "requested" });
    io.to(`company:${shift.companyId}`).emit("shift:update", { shiftId: shift.id, action: "requested" });

    res.json(shift);
  });

  // ROOM: approve shift + assign vehicle & driver
  r.post("/:id/approve", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const shiftId = Number(req.params.id);
    const parsed = approveShiftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.roomId !== u.roomId) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: "APPROVED",
        vehicleId: parsed.data.vehicleId,
        driverId: parsed.data.driverId,
      },
    });

    io.to(`company:${shift.companyId}`).emit("shift:update", { shiftId, action: "approved", vehicleId: parsed.data.vehicleId, driverId: parsed.data.driverId });
    io.to(`room:${shift.roomId}`).emit("shift:update", { shiftId, action: "approved", vehicleId: parsed.data.vehicleId, driverId: parsed.data.driverId });
    io.to(`vehicle:${parsed.data.vehicleId}`).emit("shift:update", { shiftId, action: "approved", vehicleId: parsed.data.vehicleId, driverId: parsed.data.driverId });

    res.json(updated);
  });

  // ROOM: set stops (route plan) for a shift
  r.post("/:id/stops", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const shiftId = Number(req.params.id);
    const parsed = setRouteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.roomId !== u.roomId) return res.status(403).json({ error: "Forbidden" });

    // Replace stops
    await prisma.stop.deleteMany({ where: { shiftId } });
    const data = parsed.data.stops.map((s, idx) => ({
      shiftId,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      order: s.order ?? (idx + 1),
      type: s.type ?? "COMMON",
    }));
    await prisma.stop.createMany({ data });

    io.to(`company:${shift.companyId}`).emit("route:plan", { shiftId, stops: data });
    io.to(`room:${shift.roomId}`).emit("route:plan", { shiftId, stops: data });
    if (shift.vehicleId) io.to(`vehicle:${shift.vehicleId}`).emit("route:plan", { shiftId, vehicleId: shift.vehicleId, stops: data });

    res.json({ ok: true, shiftId, count: data.length });
  });

  // List shifts relevant to user
  r.get("/my", authRequired(), async (req, res) => {
    const u = req.user;

    if (u.role === "COMPANY") {
      const items = await prisma.shift.findMany({
        where: { companyId: u.companyId ?? -1 },
        include: { vehicle: true, driver: true, stops: { orderBy: { order: "asc" } }, progress: true },
        orderBy: { id: "desc" },
      });
      return res.json(items);
    }

    if (u.role === "ROOM") {
      const items = await prisma.shift.findMany({
        where: { roomId: u.roomId ?? -1 },
        include: { company: true, vehicle: true, driver: true, stops: { orderBy: { order: "asc" } }, progress: true },
        orderBy: { id: "desc" },
      });
      return res.json(items);
    }

    if (u.role === "DRIVER") {
      const driver = await prisma.driver.findFirst({ where: { userId: u.id } });
      if (!driver) return res.json([]);

      const items = await prisma.shift.findMany({
        where: { driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] } },
        include: { company: true, room: true, vehicle: true, stops: { orderBy: { order: "asc" } }, progress: true },
        orderBy: { id: "desc" },
        take: 10,
      });
      return res.json(items);
    }

    if (u.role === "PERSONEL") {
      // MVP: personel, kendi şirketinin APPROVED/ACTIVE vardiyalarını görebilir
      const items = await prisma.shift.findMany({
        where: { companyId: u.companyId ?? -1, status: { in: ["APPROVED", "ACTIVE"] } },
        include: { vehicle: { include: { gpsLast: true } }, stops: { orderBy: { order: "asc" } }, progress: true },
        orderBy: { id: "desc" },
        take: 10,
      });
      return res.json(items);
    }

    // SUPER_ADMIN
    const items = await prisma.shift.findMany({ include: { company: true, room: true, vehicle: true, driver: true }, orderBy: { id: "desc" } });
    return res.json(items);
  });

  return r;
}
