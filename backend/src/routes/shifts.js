// backend/src/routes/shifts.js (SAFE MINIMAL - M1/M3 uyumlu)
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const createShiftSchema = z.object({
  roomId: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.string().optional(),
  stops: z.array(z.object({
    name: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    order: z.number().int().min(1),
    type: z.enum(["COMMON","MANUAL"]).optional(),
  })).optional(),
});

const approveSchema = z.object({
  vehicleId: z.number().int().positive(),
  driverId: z.number().int().positive(),
  status: z.string().optional(),
});

const addStopSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  order: z.number().int().min(1).optional(),
  type: z.enum(["COMMON","MANUAL"]).optional(),
});

const reorderSchema = z.object({
  idsInOrder: z.array(z.number().int().positive()).optional(),
  orders: z.array(z.object({
    id: z.number().int().positive().optional(),
    stopId: z.number().int().positive().optional(),
    order: z.number().int().min(1).optional(),
  })).optional(),
});

const reachedSchema = z.object({ order: z.number().int().min(1) });

export function shiftsRouter(io) {
  const r = express.Router();

  // DRIVER: my assigned shifts
  r.get("/my", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user.id }, select: { id: true } });
    if (!driver) return res.json({ items: [] });

    const items = await prisma.shift.findMany({
      where: { driverId: driver.id, status: { in: ["APPROVED","ACTIVE"] } },
      orderBy: { id: "desc" },
      include: { stops: { orderBy: { order: "asc" } }, progress: true, vehicle: true },
      take: 20,
    });

    res.json({ items });
  });

  // COMPANY: create shift (with optional initial stops)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const parsed = createShiftSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (!req.user.companyId) return res.status(400).json({ error: "User has no companyId" });

    const status = String(parsed.data.status ?? "REQUESTED");

    const shift = await prisma.shift.create({
      data: {
        companyId: req.user.companyId,
        roomId: parsed.data.roomId,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        status,
        ...(parsed.data.stops?.length
          ? {
              stops: {
                create: parsed.data.stops.map((s) => ({
                  name: s.name,
                  lat: s.lat,
                  lng: s.lng,
                  order: s.order,
                  type: s.type ?? "COMMON",
                })),
              },
            }
          : {}),
      },
      include: { stops: { orderBy: { order: "asc" } } },
    });

    res.json(shift);
  });

  // ROOM: approve/assign (POST + PUT alias)
  const approveHandler = async (req, res) => {
    const id = Number(req.params.id);
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.shift.update({
      where: { id },
      data: { vehicleId: parsed.data.vehicleId, driverId: parsed.data.driverId, status: "APPROVED" },
      include: { stops: { orderBy: { order: "asc" } }, progress: true },
    });

    res.json(updated);
  };

  r.post("/:id/approve", authRequired(), requireRole("ROOM"), approveHandler);
  r.put("/:id/approve", authRequired(), requireRole("ROOM"), approveHandler);
  r.put("/:id/assign", authRequired(), requireRole("ROOM"), approveHandler);

  // ROOM: start shift (APPROVED -> ACTIVE)
  r.post("/:id/start", authRequired(), requireRole("ROOM"), async (req, res) => {
    const id = Number(req.params.id);
    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });
    if (shift.status !== "APPROVED") return res.status(400).json({ error: "Shift must be APPROVED to start" });

    const updated = await prisma.shift.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: { stops: { orderBy: { order: "asc" } }, progress: true },
    });

    res.json(updated);
  });

  // COMPANY: add stop to shift (DRAFT/REQUESTED)
  r.post("/:id/stops", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (!req.user.companyId || req.user.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });
    if (shift.status !== "DRAFT" && shift.status !== "REQUESTED") return res.status(400).json({ error: "Stops can be edited only in DRAFT/REQUESTED" });

    const parsed = addStopSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const maxOrder = (shift.stops ?? []).reduce((m, s) => Math.max(m, s.order), 0);
    const order = parsed.data.order ?? (maxOrder + 1);
    if ((shift.stops ?? []).some((s) => s.order === order)) return res.status(400).json({ error: "Stop order already exists" });

    const stop = await prisma.stop.create({
      data: {
        shiftId: shift.id,
        name: parsed.data.name,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        order,
        type: parsed.data.type ?? "COMMON",
      },
    });

    res.json({ ok: true, stop });
  });

  // COMPANY/ROOM: reorder stops (lenient)
  r.put("/:id/stops/reorder", authRequired(), requireRole("COMPANY","ROOM"), async (req, res) => {
    const id = Number(req.params.id);
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    if (req.user.role === "COMPANY") {
      if (!req.user.companyId || req.user.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user.role === "ROOM") {
      if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });
    }

    const parsed = reorderSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const stops = shift.stops ?? [];
    if (!stops.length) return res.json({ ok: true, noop: true });

    if (Array.isArray(parsed.data.idsInOrder) && parsed.data.idsInOrder.length) {
      await prisma.$transaction(
        parsed.data.idsInOrder.map((stopId, idx) =>
          prisma.stop.update({ where: { id: stopId }, data: { order: idx + 1 } })
        )
      );
      return res.json({ ok: true });
    }

    if (Array.isArray(parsed.data.orders) && parsed.data.orders.length) {
      const ops = [];
      for (const o of parsed.data.orders) {
        const sid = o.id ?? o.stopId;
        if (!sid || !o.order) continue;
        ops.push(prisma.stop.update({ where: { id: sid }, data: { order: o.order } }));
      }
      if (ops.length) await prisma.$transaction(ops);
      return res.json({ ok: true });
    }

    res.json({ ok: true, noop: true });
  });

  // DRIVER: reached stop (progress)
  const reachedHandler = async (req, res) => {
    const id = Number(req.params.id);
    const parsed = reachedSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } }, progress: true },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.status !== "ACTIVE") return res.status(400).json({ error: "Shift must be ACTIVE" });

    const driver = await prisma.driver.findFirst({ where: { userId: req.user.id }, select: { id: true } });
    if (!driver) return res.status(400).json({ error: "Driver profile missing" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });

    const prev = shift.progress?.lastReachedOrder ?? 0;
    const next = Math.max(prev, parsed.data.order);

    const prog = await prisma.shiftProgress.upsert({
      where: { shiftId: shift.id },
      update: { lastReachedOrder: next },
      create: { shiftId: shift.id, lastReachedOrder: next },
    });

    res.json({ ok: true, lastReachedOrder: prog.lastReachedOrder });
  };

  r.post("/:id/reached", authRequired(), requireRole("DRIVER"), reachedHandler);
  r.post("/:id/stop/reached", authRequired(), requireRole("DRIVER"), reachedHandler);
  r.post("/:id/progress/reached", authRequired(), requireRole("DRIVER"), reachedHandler);

  return r;
}
