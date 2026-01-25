// backend/src/routes/gps.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { gpsIngestSchema } from "../validators.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { buildNotifPayloadV1 } from "../notifications/payloadV1.js";
import { haversineKm, etaMinutes } from "../geo.js";

export function gpsRouter(io) {
  const r = express.Router();

  // DRIVER: GPS ingest
  r.post("/", authRequired(), requireRole("DRIVER"), async (req, res) => {
    try {
      const u = req.user;

      const parsed = gpsIngestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { vehicleId, lat, lng, speed } = parsed.data;

      const at = parsed.data.at
        ? new Date(parsed.data.at)
        : parsed.data.ts
          ? new Date(parsed.data.ts)
          : new Date();

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: { room: true },
      });
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

      // History point
      await prisma.gpsPoint.create({
        data: {
          vehicleId,
          lat,
          lng,
          speed: typeof speed === "number" ? speed : null,
          at,
        },
      });

      // ✅ DB enum: OK | STALE  (LIVE yazılmaz)
      const last = await prisma.gpsLast.upsert({
        where: { vehicleId },
        update: {
          lat,
          lng,
          speed: typeof speed === "number" ? speed : null,
          at,
          status: "OK",
        },
        create: {
          vehicleId,
          lat,
          lng,
          speed: typeof speed === "number" ? speed : null,
          at,
          status: "OK",
        },
      });

      // ✅ VehicleStatus enum: ACTIVE | PASSIVE | STALE
      // GPS geldiyse ACTIVE'a çek
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: "ACTIVE" },
      });

      // ✅ WS: gps:update (UI status = LIVE)
      const gpsPayload = {
        vehicleId,
        lat,
        lng,
        speed: typeof speed === "number" ? speed : null,
        at: last.at,
        status: "LIVE",
      };

      io.to(`vehicle:${vehicleId}`).emit("gps:update", gpsPayload);
      io.to(`room:${vehicle.roomId}`).emit("gps:update", gpsPayload);
      io.to(`company:${vehicle.room.companyId}`).emit("gps:update", gpsPayload);

      // (Opsiyonel ama iyi): UI vehicle status yayını
      io.to(`room:${vehicle.roomId}`).emit("vehicle:status", {
        vehicleId,
        status: "LIVE",
        ageSec: 0,
      });

      // Overspeed notif (v1 payload)
      if (typeof speed === "number" && speed > (vehicle.speedLimitKmh ?? 80)) {
        const limit = vehicle.speedLimitKmh ?? 80;

        const payload = buildNotifPayloadV1({
          title: "Hız Limiti Aşıldı",
          message: `Araç ${vehicle.plate}: ${Math.round(speed)} km/h (limit ${limit})`,
          vehicleId,
          at: last.at?.toISOString ? last.at.toISOString() : new Date(last.at).toISOString(),
          ageSec: 0,
          status: "LIVE",
          kind: "OVERSPEED",
        });

        // driver target (DB: driverId dolsun + WS: user:{id})
        const driver = await prisma.driver.findFirst({
          where: { userId: u.id },
          select: { id: true },
        });

        if (driver) {
          await createAndEmitNotification({
            io,
            type: "OVERSPEED",
            scope: "DRIVER",
            payload,
            driverId: driver.id,
            userId: u.id, // ✅ WS için
            vehicleId,
            roomId: vehicle.roomId,
            companyId: vehicle.room.companyId,
          });
        }

        // room target
        await createAndEmitNotification({
          io,
          type: "OVERSPEED",
          scope: "ROOM",
          payload,
          roomId: vehicle.roomId,
          companyId: vehicle.room.companyId,
          vehicleId,
        });

        // company target
        await createAndEmitNotification({
          io,
          type: "OVERSPEED",
          scope: "COMPANY",
          payload,
          companyId: vehicle.room.companyId,
          roomId: vehicle.roomId,
          vehicleId,
        });
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
            return {
              id: s.id,
              name: s.name,
              order: s.order,
              remainingKm: Number(km.toFixed(2)),
              etaMin: Number(etaMinutes(km, speedKmh).toFixed(0)),
            };
          });

          const payload = { shiftId: sh.id, vehicleId, at: last.at, stops: items };

          // ✅ debug log doğru yerde
          // console.log("eta:update", { shiftId: sh.id, vehicleId, stops: items.length });

          io.to(`vehicle:${vehicleId}`).emit("eta:update", payload);
          io.to(`room:${sh.roomId}`).emit("eta:update", payload);
          io.to(`company:${sh.companyId}`).emit("eta:update", payload);
        }
      } catch (e) {
        console.error("ETA calc error:", e);
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error("gps ingest error:", e);
      return res.status(500).json({ error: "gps ingest failed" });
    }
  });

  return r;
}