// backend/src/routes/driver.js
// Mounted at: /api/driver
// Purpose: DRIVER operational endpoints (active route, stop actions, completion)
// NOTE: ROOM driver CRUD lives in routes/drivers.js (mounted at /api/drivers).

import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { emitShift } from "./shifts/helpers.js";

function buildEtaStops({ lat, lng, speedKmh, stops }) {
  return (stops ?? []).map((s) => {
    const km = haversineKm(lat, lng, s.lat, s.lng);
    return {
      id: s.id,
      name: s.name,
      order: s.order,
      remainingKm: Number(km.toFixed(2)),
      etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
    };
  });
}

function firstPendingStop(stops) {
  return (stops ?? []).find((s) => s.state === "PENDING") ?? null;
}

function derivedLastReachedOrder(stops) {
  let max = 0;
  for (const s of stops ?? []) {
    if (s.state === "REACHED" || s.state === "SKIPPED") {
      if (typeof s.order === "number" && s.order > max) max = s.order;
    }
  }
  return max;
}

async function getDriverByUserId(userId) {
  return prisma.driver.findFirst({ where: { userId }, select: { id: true } });
}

async function getShiftForDriver({ shiftId }) {
  return prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      vehicle: { include: { gpsLast: true } },
      stops: { orderBy: { order: "asc" } },
      progress: true,
    },
  });
}

async function maybeStartShiftIfApproved(shiftId) {
  // first driver action can start the shift (APPROVED -> ACTIVE)
  await prisma.shift.updateMany({
    where: { id: shiftId, status: "APPROVED" },
    data: { status: "ACTIVE" },
  });
}

async function completeShift({ shiftId, roomId, companyId, vehicleId, io }) {
  const now = new Date();

  await prisma.shiftProgress.upsert({
    where: { shiftId },
    update: { completedAt: now },
    create: { shiftId, lastReachedOrder: 0, completedAt: now },
  });

  await prisma.shift.update({ where: { id: shiftId }, data: { status: "DONE" } });

  // NOTE: Kept as-is to avoid breaking clients.
  const payload = { shiftId, completed: true, nextStop: null };
  io?.to(`shift:${shiftId}`).emit("route:progress", payload);
  io?.to(`room:${roomId}`).emit("route:progress", payload);
  io?.to(`company:${companyId}`).emit("route:progress", payload);
  if (vehicleId) io?.to(`vehicle:${vehicleId}`).emit("route:progress", { ...payload, vehicleId });
}

export function driverRouter(io) {
  const r = express.Router();

  // DRIVER: aktif rota + ilerleme
  r.get("/route/active", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const u = req.user;
    const driver = await prisma.driver.findFirst({ where: { userId: u.id } });
    if (!driver) return res.json({ mode: "NO_DRIVER_PROFILE" });

    const shift = await prisma.shift.findFirst({
      where: { driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] } },
      include: {
        vehicle: { include: { gpsLast: true } },
        stops: { orderBy: { order: "asc" } },
        progress: true,
      },
      orderBy: { startAt: "desc" },
    });

    if (!shift) return res.json({ mode: "NO_ACTIVE_SHIFT" });

    const last = shift.vehicle?.gpsLast ?? null;
    const speedKmh = typeof last?.speed === "number" ? last.speed : 30;

    // order-sorted route stops
    const routeStops = (shift.stops ?? []).map((s) => {
      const km = last ? haversineKm(last.lat, last.lng, s.lat, s.lng) : 0;
      return {
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        order: s.order,
        type: s.type,
        state: s.state,
        reachedAt: s.reachedAt,
        skippedAt: s.skippedAt,
        remainingKm: Number(km.toFixed(2)),
        etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
      };
    });

    // UI icin mesafeye gore gosterim (mevcut davranis)
    const orderedStops = [...routeStops];
    if (last) orderedStops.sort((a, b) => a.remainingKm - b.remainingKm);

    const nextStop = firstPendingStop(shift.stops ?? []);
    const lastReachedOrder = shift.progress?.lastReachedOrder ?? derivedLastReachedOrder(shift.stops ?? []);

    return res.json({
      mode: "OK",
      shift: {
        id: shift.id,
        companyId: shift.companyId,
        roomId: shift.roomId,
        vehicleId: shift.vehicleId,
        driverId: shift.driverId,
        startAt: shift.startAt,
        endAt: shift.endAt,
        status: shift.status,
      },
      vehicle: shift.vehicle
        ? {
            id: shift.vehicle.id,
            plate: shift.vehicle.plate,
            capacity: shift.vehicle.capacity,
            speedLimitKmh: shift.vehicle.speedLimitKmh,
            nextMaintenanceAt: shift.vehicle.nextMaintenanceAt,
            status: shift.vehicle.status,
          }
        : null,
      last,
      progress: {
        lastReachedOrder,
        completed: shift.status === "DONE" || !!shift.progress?.completedAt,
      },
      orderedStops, // distance-sorted
      nextStop,
      routeStops, // order-sorted
    });
  });

  // DRIVER: shift start (APPROVED -> ACTIVE)
  // UI uses this to explicitly start a task. First stop action would also auto-start,
  // but having an explicit endpoint is better for UX.
  r.post("/shifts/:shiftId/start", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, status: true, driverId: true, companyId: true, roomId: true },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!["APPROVED", "ACTIVE"].includes(shift.status)) {
      return res.status(400).json({ error: "Shift cannot be started in this status", status: shift.status });
    }

    if (shift.status === "APPROVED") {
      await prisma.shift.update({ where: { id: shiftId }, data: { status: "ACTIVE" } });
    }

    // ensure progress row exists (legacy clients rely on it)
    await prisma.shiftProgress.upsert({
      where: { shiftId },
      update: {},
      create: { shiftId, lastReachedOrder: 0 },
    });

    const fresh = await prisma.shift.findUnique({ where: { id: shiftId } });
    emitShift(io, fresh, "shift:update", { action: "start", status: fresh?.status ?? "ACTIVE" });

    return res.json({ ok: true, shiftId, status: fresh?.status ?? "ACTIVE" });
  });

  // DRIVER: next pending stop
  r.get("/shifts/:shiftId/next-stop", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });

    return res.json({ nextStop: firstPendingStop(shift.stops ?? []) });
  });

  async function applyStopState({ req, res, state }) {
    const shiftId = Number(req.params.shiftId);
    const stopId = Number(req.params.stopId);

    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await getShiftForDriver({ shiftId });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!["APPROVED", "ACTIVE"].includes(shift.status)) {
      return res.status(400).json({ error: "Shift not active" });
    }

    const stop = (shift.stops ?? []).find((s) => s.id === stopId);
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    // idempotent
    if (stop.state === state) {
      return res.json({ ok: true, shiftId, stopId, state, nextStop: firstPendingStop(shift.stops ?? []) });
    }

    const now = new Date();

    // reached/skip counts as movement -> start shift if still APPROVED
    if (state === "REACHED" || state === "SKIPPED") {
      await maybeStartShiftIfApproved(shiftId);
    }

    const data = { state };
    if (state === "REACHED") {
      data.reachedAt = now;
      data.skippedAt = null;
    }
    if (state === "SKIPPED") {
      data.skippedAt = now;
      data.reachedAt = null;
    }
    if (state === "PENDING") {
      data.reachedAt = null;
      data.skippedAt = null;
    }

    // keep legacy progress monotonic (best-effort)
    const currentReached = shift.progress?.lastReachedOrder ?? 0;
    const nextLegacyReached = state === "PENDING" ? currentReached : Math.max(currentReached, stop.order ?? 0);

    await prisma.$transaction([
      prisma.stop.update({ where: { id: stopId }, data }),
      prisma.shiftProgress.upsert({
        where: { shiftId },
        update: { lastReachedOrder: nextLegacyReached },
        create: { shiftId, lastReachedOrder: nextLegacyReached },
      }),
    ]);

    // reload stops for accurate nextStop/completion
    const fresh = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: { orderBy: { order: "asc" } }, vehicle: { include: { gpsLast: true } } },
    });

    const nextStop = firstPendingStop(fresh?.stops ?? []);
    const completed = !nextStop;

    const payload = {
      shiftId,
      vehicleId: fresh?.vehicleId ?? null,
      nextStop,
      completed,
      changed: {
        stopId,
        state,
        reachedAt: state === "REACHED" ? now : null,
        skippedAt: state === "SKIPPED" ? now : null,
      },
    };

    io?.to(`shift:${shiftId}`).emit("route:progress", payload);
    io?.to(`room:${shift.roomId}`).emit("route:progress", payload);
    io?.to(`company:${shift.companyId}`).emit("route:progress", payload);
    if (fresh?.vehicleId) {
      io?.to(`vehicle:${fresh.vehicleId}`).emit("route:progress", { ...payload, vehicleId: fresh.vehicleId });
    }

    // instant ETA update (GPS beklemesin)
    try {
      const last = fresh?.vehicle?.gpsLast ?? null;
      if (last && fresh?.vehicleId) {
        const speedKmh = typeof last.speed === "number" ? last.speed : 30;
        const remainingStops = (fresh.stops ?? []).filter((s) => s.state === "PENDING");
        const items = buildEtaStops({ lat: last.lat, lng: last.lng, speedKmh, stops: remainingStops });

        const etaPayload = { shiftId, vehicleId: fresh.vehicleId, at: last.at, stops: items };
        io?.to(`vehicle:${fresh.vehicleId}`).emit("eta:update", etaPayload);
        io?.to(`room:${shift.roomId}`).emit("eta:update", etaPayload);
        io?.to(`company:${shift.companyId}`).emit("eta:update", etaPayload);
      }
    } catch (e) {
      console.error("stop state -> eta:update error:", e);
    }

    // Optional: auto complete if no pending stops
    if (completed) {
      try {
        await completeShift({
          shiftId,
          roomId: shift.roomId,
          companyId: shift.companyId,
          vehicleId: fresh?.vehicleId ?? null,
          io,
        });
      } catch (e) {
        console.error("auto complete error:", e);
      }
    }

    return res.json({ ok: true, shiftId, stopId, state, nextStop, completed });
  }

  // DRIVER: reached
  r.post("/shifts/:shiftId/stops/:stopId/reached", authRequired(), requireRole("DRIVER"), async (req, res) =>
    applyStopState({ req, res, state: "REACHED" })
  );

  // DRIVER: skip
  r.post("/shifts/:shiftId/stops/:stopId/skip", authRequired(), requireRole("DRIVER"), async (req, res) =>
    applyStopState({ req, res, state: "SKIPPED" })
  );

  // DRIVER: reopen (back to PENDING)
  r.post("/shifts/:shiftId/stops/:stopId/reopen", authRequired(), requireRole("DRIVER"), async (req, res) =>
    applyStopState({ req, res, state: "PENDING" })
  );

  // DRIVER: complete shift (manual)
  r.post("/shifts/:shiftId/complete", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const shiftId = Number(req.params.shiftId);
    const driver = await getDriverByUserId(req.user.id);
    if (!driver) return res.status(400).json({ error: "Driver profile not found" });

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    if (!["APPROVED", "ACTIVE", "DONE"].includes(shift.status)) {
      return res.status(400).json({ error: "Shift cannot be completed in this status" });
    }

    const pending = (shift.stops ?? []).filter((s) => s.state === "PENDING");
    if (pending.length) {
      return res.status(400).json({ error: "Pending stops exist", pendingCount: pending.length });
    }

    if (shift.status !== "DONE") {
      await completeShift({ shiftId, roomId: shift.roomId, companyId: shift.companyId, vehicleId: shift.vehicleId, io });
    }

    return res.json({ ok: true, shiftId, status: "DONE" });
  });

  return r;
}
