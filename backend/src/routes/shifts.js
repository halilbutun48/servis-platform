// backend/src/routes/shifts.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createShiftSchema, approveShiftSchema, setRouteSchema } from "../validators.js";

/**
 * Stops normalize:
 * - order boş/dup ise 1..N reindex
 * - input sırası stabil kalsın (önce verilen order, sonra index)
 */
function normalizeStops(stops) {
  const input = Array.isArray(stops) ? stops : [];
  const withMeta = input.map((s, idx) => ({
    ...s,
    __idx: idx,
    __order: typeof s.order === "number" ? s.order : null,
  }));

  // önce geçerli order'ı olanlar order'a göre, sonra idx
  withMeta.sort((a, b) => {
    const ao = a.__order;
    const bo = b.__order;
    if (ao != null && bo != null) return ao - bo || a.__idx - b.__idx;
    if (ao != null) return -1;
    if (bo != null) return 1;
    return a.__idx - b.__idx;
  });

  const orders = new Set();
  let hasDup = false;

  const normalizedList = withMeta.map((s, i) => {
    const newOrder = i + 1;
    if (s.__order != null) {
      if (orders.has(s.__order)) hasDup = true;
      orders.add(s.__order);
    }
    const { __idx, __order, ...rest } = s;
    return { ...rest, order: newOrder };
  });

  // changed?
  let changed = false;
  if (normalizedList.length !== input.length) changed = true;
  else {
    for (let i = 0; i < input.length; i++) {
      const a = input[i];
      const b =
        normalizedList.find(
          (x) => x.name === a.name && x.lat === a.lat && x.lng === a.lng
        ) || normalizedList[i];

      const ao = typeof a.order === "number" ? a.order : null;
      const bo = typeof b.order === "number" ? b.order : null;
      if (ao !== bo) {
        changed = true;
        break;
      }
    }
    if (hasDup) changed = true;
  }

  return { normalized: true, changed, hasDup, stops: normalizedList };
}

export function shiftsRouter(io) {
  const r = express.Router();

  // COMPANY: create shift request (REQUESTED)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const u = req.user;
    if (!u.companyId) {
      return res.status(400).json({ error: "COMPANY must have companyId" });
    }

    const parsed = createShiftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const shift = await prisma.shift.create({
      data: {
        companyId: u.companyId,
        roomId: parsed.data.roomId,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        status: "REQUESTED",
      },
    });

    const evt = { shiftId: shift.id, action: "requested", status: shift.status };
    io.to(`room:${shift.roomId}`).emit("shift:update", evt);
    io.to(`company:${shift.companyId}`).emit("shift:update", evt);
    io.to(`shift:${shift.id}`).emit("shift:update", evt);

    return res.json(shift);
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

    if (shift.status !== "REQUESTED" && shift.status !== "DRAFT") {
      return res.status(400).json({ error: `Shift status must be REQUESTED/DRAFT to approve (current=${shift.status})` });
    }

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: "APPROVED",
        vehicleId: parsed.data.vehicleId,
        driverId: parsed.data.driverId,
      },
    });

    const evt = {
      shiftId,
      action: "approved",
      status: updated.status,
      vehicleId: updated.vehicleId,
      driverId: updated.driverId,
    };

    io.to(`company:${shift.companyId}`).emit("shift:update", evt);
    io.to(`room:${shift.roomId}`).emit("shift:update", evt);
    if (updated.vehicleId) io.to(`vehicle:${updated.vehicleId}`).emit("shift:update", evt);
    io.to(`shift:${shiftId}`).emit("shift:update", evt);

    return res.json(updated);
  });

  // ROOM: start shift (APPROVED -> ACTIVE)
  r.post("/:id/start", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const shiftId = Number(req.params.id);

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: true },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.roomId !== u.roomId) return res.status(403).json({ error: "Forbidden" });

    if (shift.status === "ACTIVE") {
      return res.status(409).json({ error: "Shift already ACTIVE" });
    }
    if (shift.status !== "APPROVED") {
      return res.status(400).json({ error: `Shift must be APPROVED to start (current=${shift.status})` });
    }
    if (!shift.vehicleId || !shift.driverId) {
      return res.status(400).json({ error: "Shift must have vehicleId and driverId to start" });
    }
    if (!shift.stops?.length) {
      return res.status(400).json({ error: "Shift must have stops to start" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.shift.update({
        where: { id: shiftId },
        data: { status: "ACTIVE" },
      });

      await tx.shiftProgress.upsert({
        where: { shiftId },
        update: { lastReachedOrder: 0, completedAt: null },
        create: { shiftId, lastReachedOrder: 0, completedAt: null },
      });

      return up;
    });

    const evt = {
      shiftId,
      action: "started",
      status: updated.status,
      vehicleId: updated.vehicleId,
      driverId: updated.driverId,
    };

    io.to(`company:${updated.companyId}`).emit("shift:update", evt);
    io.to(`room:${updated.roomId}`).emit("shift:update", evt);
    if (updated.vehicleId) io.to(`vehicle:${updated.vehicleId}`).emit("shift:update", evt);
    io.to(`shift:${shiftId}`).emit("shift:update", evt);

    return res.json(updated);
  });

  // ROOM: end shift (ACTIVE -> DONE)
  r.post("/:id/end", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const shiftId = Number(req.params.id);

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.roomId !== u.roomId) return res.status(403).json({ error: "Forbidden" });

    if (shift.status === "DONE") {
      return res.status(409).json({ error: "Shift already DONE" });
    }
    if (shift.status !== "ACTIVE") {
      return res.status(400).json({ error: `Shift must be ACTIVE to end (current=${shift.status})` });
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.shiftProgress.upsert({
        where: { shiftId },
        update: { completedAt: now },
        create: { shiftId, lastReachedOrder: 0, completedAt: now },
      });

      return tx.shift.update({
        where: { id: shiftId },
        data: { status: "DONE" },
      });
    });

    const evt = {
      shiftId,
      action: "ended",
      status: updated.status,
      vehicleId: updated.vehicleId,
      driverId: updated.driverId,
    };

    io.to(`company:${updated.companyId}`).emit("shift:update", evt);
    io.to(`room:${updated.roomId}`).emit("shift:update", evt);
    if (updated.vehicleId) io.to(`vehicle:${updated.vehicleId}`).emit("shift:update", evt);
    io.to(`shift:${shiftId}`).emit("shift:update", evt);

    return res.json(updated);
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

    if (shift.status === "ACTIVE") {
      return res.status(400).json({ error: "Cannot change stops while shift is ACTIVE" });
    }
    if (shift.status === "DONE") {
      return res.status(400).json({ error: "Cannot change stops for a DONE shift" });
    }

    const { normalized, changed, hasDup, stops } = normalizeStops(parsed.data.stops);

    await prisma.$transaction(async (tx) => {
      await tx.stop.deleteMany({ where: { shiftId } });

      const data = stops.map((s, idx) => ({
        shiftId,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        order: s.order ?? idx + 1,
        type: s.type ?? "COMMON",
      }));

      await tx.stop.createMany({ data });

      // route değişti → progress sıfırla (varsa)
      await tx.shiftProgress.updateMany({
        where: { shiftId },
        data: { lastReachedOrder: 0, completedAt: null },
      });
    });

    const normalizedData = stops.map((s) => ({
      shiftId,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      order: s.order,
      type: s.type ?? "COMMON",
    }));

    io.to(`company:${shift.companyId}`).emit("route:plan", { shiftId, stops: normalizedData });
    io.to(`room:${shift.roomId}`).emit("route:plan", { shiftId, stops: normalizedData });
    if (shift.vehicleId) {
      io.to(`vehicle:${shift.vehicleId}`).emit("route:plan", {
        shiftId,
        vehicleId: shift.vehicleId,
        stops: normalizedData,
      });
    }
    io.to(`shift:${shiftId}`).emit("route:plan", { shiftId, stops: normalizedData });

    return res.json({
      ok: true,
      shiftId,
      count: normalizedData.length,
      normalized,
      changed,
      hasDup,
      stops: normalizedData,
    });
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
      const items = await prisma.shift.findMany({
        where: { companyId: u.companyId ?? -1, status: { in: ["APPROVED", "ACTIVE"] } },
        include: { vehicle: { include: { gpsLast: true } }, stops: { orderBy: { order: "asc" } }, progress: true },
        orderBy: { id: "desc" },
        take: 10,
      });
      return res.json(items);
    }

    // SUPER_ADMIN
    const items = await prisma.shift.findMany({
      include: { company: true, room: true, vehicle: true, driver: true },
      orderBy: { id: "desc" },
    });
    return res.json(items);
  });

  return r;
}