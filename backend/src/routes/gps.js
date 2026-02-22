// backend/src/routes/gps.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { gpsIngestSchema } from "../validators.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { buildNotifPayloadV1 } from "../notifications/payloadV1.js";
import { haversineKm, etaMinutes } from "../geo.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { gateVehicleGpsState } from "../gps/gpsStateGate.js"; // ✅ NEW

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
        select: { id: true, plate: true, roomId: true, speedLimitKmh: true },
      });
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

      // =========================================================
      // ✅ M9 GPS hardening
      // Driver yalnızca kendi APPROVED/ACTIVE shift'inde atanmış araca GPS basabilir
      // =========================================================
      const senderDriver = await prisma.driver.findFirst({
        where: { userId: u.id },
        select: { id: true },
      });
      if (!senderDriver) return res.status(400).json({ error: "Driver profile not found" });

      const allowedShift = await prisma.shift.findFirst({
        where: {
          driverId: senderDriver.id,
          vehicleId,
          status: { in: ["APPROVED", "ACTIVE"] },
        },
        select: { id: true },
      });

      if (!allowedShift) {
        return res.status(403).json({ error: "Forbidden: driver not assigned to this vehicle" });
      }

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

      // ✅ DB enum: OK | STALE
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
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: "ACTIVE" },
      });

      // ✅ UI status + ageSec
      const { status: uiStatus, ageSec } = gpsStatusFromAt(last.at);

      // ✅ company fanout: sadece shift şirketleri (APPROVED/ACTIVE)
      // Not: COMPANY rolü /api/notifications/my'da companyId üzerinden filtreliyor.
      // Bu yüzden GPS bildirimlerinde SHIFT.companyId mutlaka kapsanmalı.
      const companyIds = new Set();
      try {
        const rel = await prisma.shift.findMany({
          where: { vehicleId, status: { in: ["APPROVED", "ACTIVE"] } },
          select: { companyId: true },
        });
        for (const r of rel) if (r.companyId) companyIds.add(r.companyId);
      } catch (_) {}

      // =========================================================
      // ✅ helper: DRIVER notif hedeflerini üret
      // - her zaman sender user hedefi var (driverId null olabilir)
      // - ayrıca shift’e atanmış driver varsa onu da ekle
      // =========================================================
      async function getDriverNotifTargets() {
        const targets = [];

        // sender driver record (yoksa null kalır)
        let senderDriverId = null;
        try {
          const sender = await prisma.driver.findFirst({
            where: { userId: u.id },
            select: { id: true },
          });
          senderDriverId = sender?.id ?? null;
        } catch {
          senderDriverId = null;
        }

        // ✅ her durumda sender user’a DRIVER notif üret
        targets.push({ driverId: senderDriverId, userId: u.id });

        // assigned shift driver (varsa)
        try {
          const sh = await prisma.shift.findFirst({
            where: {
              vehicleId,
              status: { in: ["APPROVED", "ACTIVE"] },
              driverId: { not: null },
            },
            select: { driverId: true },
          });

          const assignedDriverId = sh?.driverId ?? null;
          if (assignedDriverId && assignedDriverId !== senderDriverId) {
            const dUser = await prisma.driver.findUnique({
              where: { id: assignedDriverId },
              select: { userId: true },
            });
            targets.push({ driverId: assignedDriverId, userId: dUser?.userId ?? null });
          }
        } catch {
          // ignore
        }

        return targets;
      }

      // =========================================================
      // ✅ RECOVERY GATE (OFFLINE/STALE -> LIVE)
      // =========================================================
      const gate = await gateVehicleGpsState({
        prisma,
        vehicleId,
        newUiStatus: uiStatus,
        now: new Date(),
      });

      if (gate.shouldNotify && gate.transition === "TO_LIVE") {
        const payload = buildNotifPayloadV1({
          title: "GPS Geri Geldi",
          message: `Araç ${vehicle.plate}: ${gate.prevStatus} → ${gate.newStatus}`,
          vehicleId,
          at: last.at?.toISOString ? last.at.toISOString() : new Date(last.at).toISOString(),
          ageSec,
          status: uiStatus,
          kind: "GPS_RECOVERY",
        });

        // ✅ NOTIF tarafı GPS ingest'i KIRAMAZ
        try {
          const targets = await getDriverNotifTargets();
          for (const t of targets) {
            await createAndEmitNotification({
              io,
              type: "GPS_RECOVERY",
              scope: "DRIVER",
              payload,
              driverId: t.driverId, // null olabilir (FULLCHECK için sorun değil)
              userId: t.userId,     // WS user room için kritik
              vehicleId,
              roomId: vehicle.roomId,
            });
          }

          await createAndEmitNotification({
            io,
            type: "GPS_RECOVERY",
            scope: "ROOM",
            payload,
            roomId: vehicle.roomId,
            vehicleId,
          });

          // COMPANY scope: hem room'un operatör şirketi hem de (APPROVED/ACTIVE) shift şirketleri
          for (const cid of companyIds) {
            await createAndEmitNotification({
              io,
              type: "GPS_RECOVERY",
              scope: "COMPANY",
              payload,
              companyId: cid,
              roomId: vehicle.roomId,
              vehicleId,
            });
          }
        } catch (e) {
          console.error("GPS_RECOVERY notif error:", e);
        }
      }

      // ✅ WS: gps:update
      const gpsPayload = {
        vehicleId,
        lat,
        lng,
        speed: typeof speed === "number" ? speed : null,
        at: last.at,
        status: uiStatus,
        ageSec,
      };


      io.to(`vehicle:${vehicleId}`).emit("gps:update", gpsPayload);
      io.to(`room:${vehicle.roomId}`).emit("gps:update", gpsPayload);
      for (const cid of companyIds) io.to(`company:${cid}`).emit("gps:update", gpsPayload);

      // ✅ WS: vehicle:status
      const vehicleStatusPayload = { vehicleId, status: uiStatus, ageSec };
      io.to(`vehicle:${vehicleId}`).emit("vehicle:status", vehicleStatusPayload);
      io.to(`room:${vehicle.roomId}`).emit("vehicle:status", vehicleStatusPayload);
      for (const cid of companyIds) io.to(`company:${cid}`).emit("vehicle:status", vehicleStatusPayload);

      // =========================================================
      // ✅ OVERSPEED
      // =========================================================
      if (typeof speed === "number" && speed > (vehicle.speedLimitKmh ?? 80)) {
        const limit = vehicle.speedLimitKmh ?? 80;

        const payload = buildNotifPayloadV1({
          title: "Hız Limiti Aşıldı",
          message: `Araç ${vehicle.plate}: ${Math.round(speed)} km/h (limit ${limit})`,
          vehicleId,
          at: last.at?.toISOString ? last.at.toISOString() : new Date(last.at).toISOString(),
          ageSec,
          status: uiStatus,
          kind: "OVERSPEED",
        });

        // ✅ NOTIF tarafı GPS ingest'i KIRAMAZ
        try {
          const targets = await getDriverNotifTargets();
          for (const t of targets) {
            await createAndEmitNotification({
              io,
              type: "OVERSPEED",
              scope: "DRIVER",
              payload,
              driverId: t.driverId, // null olabilir -> yine de DRIVER notif oluşur
              userId: t.userId,
              vehicleId,
              dedupeKey: "", // ✅ overspeed için dedupe yok
              roomId: vehicle.roomId,
            });
          }

          await createAndEmitNotification({
            io,
            type: "OVERSPEED",
            scope: "ROOM",
            payload,
            roomId: vehicle.roomId,
            vehicleId,
            dedupeKey: "", // ✅ overspeed için dedupe yok
          });

          for (const cid of companyIds) {
            await createAndEmitNotification({
              io,
              type: "OVERSPEED",
              scope: "COMPANY",
              payload,
              companyId: cid,
              roomId: vehicle.roomId,
              vehicleId,
              dedupeKey: "", // ✅ overspeed için dedupe yok
            });
          }
        } catch (e) {
          console.error("OVERSPEED notif error:", e);
        }
      }

      // =========================================================
      // ✅ ETA broadcast (progress-aware)
      // =========================================================
      try {
        const shifts = await prisma.shift.findMany({
          where: { vehicleId, status: { in: ["APPROVED", "ACTIVE"] } },
          include: {
            stops: { orderBy: { order: "asc" } },
          },
        });

        const speedKmh = typeof speed === "number" ? speed : 30;

        for (const sh of shifts) {
          if (!sh.stops?.length) continue;

          const remainingStops = sh.stops.filter((s) => s.state === "PENDING");
          if (!remainingStops.length) continue;

          const items = remainingStops.map((s) => {
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