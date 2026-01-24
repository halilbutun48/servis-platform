import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { gpsIngestSchema } from "../validators.js";
import { createNotification } from "../notifications/service.js";
import { haversineKm, etaMinutes } from "../geo.js";

export function gpsRouter(io) {
  const r = express.Router();

  // DRIVER: GPS ingest
  r.post("/", authRequired(), requireRole("DRIVER"), async (req, res) => {
    const u = req.user;
    const parsed = gpsIngestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { vehicleId, lat, lng, speed } = parsed.data;
    const at = parsed.data.at ? new Date(parsed.data.at) : (parsed.data.ts ? new Date(parsed.data.ts) : new Date());

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { room: true },
    });
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    // History point
    await prisma.gpsPoint.create({ data: { vehicleId, lat, lng, speed: typeof speed === "number" ? speed : null, at } });

    // Upsert last
    const last = await prisma.gpsLast.upsert({
      where: { vehicleId },
      update: { lat, lng, speed: typeof speed === "number" ? speed : null, at, status: "OK" },
      create: { vehicleId, lat, lng, speed: typeof speed === "number" ? speed : null, at, status: "OK" },
    });

    // WS: gps:update
    const gpsPayload = { vehicleId, lat, lng, speed: typeof speed === "number" ? speed : null, at: last.at, status: last.status };
    io.to(`vehicle:${vehicleId}`).emit("gps:update", gpsPayload);
    io.to(`room:${vehicle.roomId}`).emit("gps:update", gpsPayload);
    // room'un bağlı olduğu company scope (varsayılan Company 1—Room N)
    io.to(`company:${vehicle.room.companyId}`).emit("gps:update", gpsPayload);

    // Overspeed notif
    if (typeof speed === "number" && speed > (vehicle.speedLimitKmh ?? 80)) {
      const payloadJson = {
        title: "Hız Limiti Aşıldı",
        message: `Araç ${vehicle.plate}: ${Math.round(speed)} km/h (limit ${vehicle.speedLimitKmh ?? 80})`,
        vehicleId,
        speed,
        at: last.at,
      };

      // driver target
      const driver = await prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true } });
      if (driver) {
        await createNotification({ type: "OVERSPEED", scope: "DRIVER", payloadJson, driverId: driver.id, vehicleId });
        io.to(`user:${u.id}`).emit("notif:new", { scope: "DRIVER", type: "OVERSPEED", payload: payloadJson });
        io.to(`user:${u.id}`).emit("notify:new", { scope: "DRIVER", type: "OVERSPEED", payload: payloadJson });
      }

      // room target
      await createNotification({ type: "OVERSPEED", scope: "ROOM", payloadJson, roomId: vehicle.roomId, vehicleId });
      io.to(`room:${vehicle.roomId}`).emit("notif:new", { scope: "ROOM", type: "OVERSPEED", payload: payloadJson });
      io.to(`room:${vehicle.roomId}`).emit("notify:new", { scope: "ROOM", type: "OVERSPEED", payload: payloadJson });

      // company target
      await createNotification({ type: "OVERSPEED", scope: "COMPANY", payloadJson, companyId: vehicle.room.companyId, vehicleId });
      io.to(`company:${vehicle.room.companyId}`).emit("notif:new", { scope: "COMPANY", type: "OVERSPEED", payload: payloadJson });
      io.to(`company:${vehicle.room.companyId}`).emit("notify:new", { scope: "COMPANY", type: "OVERSPEED", payload: payloadJson });
    }

    // ETA broadcast: APPROVED/ACTIVE shifts assigned to this vehicle
    try {
      const shifts = await prisma.shift.findMany({
        where: { vehicleId, status: { in: ["APPROVED", "ACTIVE"] } },
        include: { stops: { orderBy: { order: "asc" } } },
      });

      const speedKmh = typeof speed === "number" ? speed : 30;
      for (const sh of shifts) {
        if (!sh.stops?.length) continue;
        const items = sh.stops.map((s) => {
          const km = haversineKm(lat, lng, s.lat, s.lng);
          return { id: s.id, name: s.name, order: s.order, remainingKm: Number(km.toFixed(2)), etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)) };
        });
        const payload = { shiftId: sh.id, vehicleId, at: last.at, stops: items };
        io.to(`vehicle:${vehicleId}`).emit("eta:update", payload);
        io.to(`room:${sh.roomId}`).emit("eta:update", payload);
        io.to(`company:${sh.companyId}`).emit("eta:update", payload);
      }
    } catch (e) {
      console.error("ETA calc error:", e);
    }

    return res.json({ ok: true });
  });

  return r;
}
