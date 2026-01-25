// backend/src/routes/driver.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { haversineKm, etaMinutes } from "../geo.js";

function buildEtaStops({ lat, lng, speedKmh, stops }) {
  return stops.map((s) => {
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

    // route sırası (order) ile hesap
    const routeStops = (shift.stops ?? []).map((s) => {
      const km = last ? haversineKm(last.lat, last.lng, s.lat, s.lng) : 0;
      return {
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        order: s.order,
        type: s.type,
        remainingKm: Number(km.toFixed(2)),
        etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
      };
    });

    // UI için mesafeye göre gösterim (mevcut davranış)
    const orderedStops = [...routeStops];
    if (last) orderedStops.sort((a, b) => a.remainingKm - b.remainingKm);

    const lastReachedOrder = shift.progress?.lastReachedOrder ?? 0;
    const nextStop = (shift.stops ?? []).find((s) => s.order > lastReachedOrder) ?? null;

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
        completed: !!shift.progress?.completedAt,
      },
      orderedStops, // distance-sorted
      nextStop,
      routeStops, // order-sorted (debug/opsiyonel)
    });
  });

  // DRIVER: reached (durak geçildi) + anında eta:update
  r.post(
    "/shifts/:shiftId/stops/:stopId/reached",
    authRequired(),
    requireRole("DRIVER"),
    async (req, res) => {
      const u = req.user;
      const shiftId = Number(req.params.shiftId);
      const stopId = Number(req.params.stopId);

      const driver = await prisma.driver.findFirst({
        where: { userId: u.id },
        select: { id: true },
      });
      if (!driver) return res.status(400).json({ error: "Driver profile not found" });

      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          stops: { orderBy: { order: "asc" } },
          progress: true,
          vehicle: { include: { gpsLast: true } }, // ✅ NEW (eta için)
        },
      });
      if (!shift) return res.status(404).json({ error: "Shift not found" });
      if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
      if (!["APPROVED", "ACTIVE"].includes(shift.status))
        return res.status(400).json({ error: "Shift not active" });

      const stop = (shift.stops ?? []).find((s) => s.id === stopId);
      if (!stop) return res.status(404).json({ error: "Stop not found" });

      const currentReached = shift.progress?.lastReachedOrder ?? 0;

      // ✅ idempotent + monotonic (geri gitme / aynı stop tekrar basma)
      if (stop.order <= currentReached) {
        const nextStop = (shift.stops ?? []).find((s) => s.order > currentReached) ?? null;
        const completed = !nextStop || !!shift.progress?.completedAt;
        return res.json({ lastReachedOrder: currentReached, completed, nextStop });
      }

      const lastReachedOrder = stop.order;

      const prog = await prisma.shiftProgress.upsert({
        where: { shiftId },
        update: { lastReachedOrder },
        create: { shiftId, lastReachedOrder },
      });

      // ✅ ilk reached ile APPROVED -> ACTIVE
      if (shift.status === "APPROVED") {
        await prisma.shift.update({ where: { id: shiftId }, data: { status: "ACTIVE" } });
      }

      const nextStop = (shift.stops ?? []).find((s) => s.order > lastReachedOrder) ?? null;
      const completed = !nextStop;

      if (completed) {
        await prisma.shiftProgress.update({
          where: { shiftId },
          data: { completedAt: new Date() },
        });
        await prisma.shift.update({ where: { id: shiftId }, data: { status: "DONE" } });
      }

      const payload = {
        shiftId,
        lastReachedOrder: prog.lastReachedOrder,
        nextStop,
        completed,
      };

      // WS: route:progress
      io.to(`shift:${shiftId}`).emit("route:progress", payload);
      io.to(`room:${shift.roomId}`).emit("route:progress", payload);
      io.to(`company:${shift.companyId}`).emit("route:progress", payload);
      if (shift.vehicleId) {
        io.to(`vehicle:${shift.vehicleId}`).emit("route:progress", {
          ...payload,
          vehicleId: shift.vehicleId,
        });
      }

      // ✅ reached sonrası anında ETA update (GPS beklemesin)
      try {
        const last = shift.vehicle?.gpsLast ?? null;
        if (last && (shift.stops ?? []).length && shift.vehicleId) {
          const speedKmh = typeof last.speed === "number" ? last.speed : 30;
          const remainingStops = (shift.stops ?? []).filter((s) => s.order > lastReachedOrder);

          const items = buildEtaStops({
            lat: last.lat,
            lng: last.lng,
            speedKmh,
            stops: remainingStops,
          });

          const etaPayload = {
            shiftId,
            vehicleId: shift.vehicleId,
            at: last.at,
            stops: items,
          };

          io.to(`vehicle:${shift.vehicleId}`).emit("eta:update", etaPayload);
          io.to(`room:${shift.roomId}`).emit("eta:update", etaPayload);
          io.to(`company:${shift.companyId}`).emit("eta:update", etaPayload);
        }
      } catch (e) {
        console.error("reached -> eta:update error:", e);
      }

      return res.json({ lastReachedOrder: prog.lastReachedOrder, completed, nextStop });
    }
  );

  return r;
}