// backend/src/routes/gps.js
import express from "express";
import { prisma } from "../prisma.js";
import { ENV } from "../env.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { requireConsent, CONSENT_DOCS } from "../middleware/consentGate.js";
import { gpsIngestSchema } from "../validators.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { buildNotifPayloadV1 } from "../notifications/payloadV1.js";
import { haversineKm } from "../geo.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { gateVehicleGpsState } from "../gps/gpsStateGate.js"; // ✅ NEW
import { gpsThrottle1200ms } from "../middleware/gpsThrottle1200ms.js";
import { isoOffsetTR } from "../time/tr.js";
import { enqueueAutoReachedTask, processAutoReachedTask } from "../jobs/autoReachedQueue.js";

export function gpsRouter(io) {
  const r = express.Router();

  // DRIVER: GPS ingest
  r.post("/", authRequired(), requireRole("DRIVER"), requireConsent(CONSENT_DOCS.LOCATION.docKey, CONSENT_DOCS.LOCATION.docVersion), gpsThrottle1200ms({ minIntervalMs: 1200 }), async (req, res) => {
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

      const [vehicle, senderDriver, previousGpsLast] = await Promise.all([
        prisma.vehicle.findUnique({
          where: { id: vehicleId },
          select: { id: true, plate: true, roomId: true, speedLimitKmh: true },
        }),
        prisma.driver.findFirst({
          where: { userId: u.id },
          select: { id: true },
        }),
        prisma.gpsLast.findUnique({
          where: { vehicleId },
          select: { lat: true, lng: true, at: true },
        }),
      ]);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

      // =========================================================
      // ✅ M9 GPS hardening
      // Driver yalnızca kendi APPROVED/ACTIVE shift'inde atanmış araca GPS basabilir
      // =========================================================
      if (!senderDriver) return res.status(400).json({ error: "Driver profile not found" });
      const senderDriverId = senderDriver.id;
      const activeShifts = await prisma.shift.findMany({
        where: {
          vehicleId,
          status: { in: ["APPROVED", "ACTIVE"] },
        },
        select: { id: true, driverId: true, companyId: true, startAt: true, endAt: true },
      });
      const allowedShift = activeShifts.find((s) => Number(s.driverId || 0) === Number(senderDriverId));

      if (!allowedShift) {
        return res.status(403).json({ error: "Forbidden: driver not assigned to this vehicle" });
      }

      // History point (kısa / anlamlı hareket dışında prune et)
      const historyMinSec = Math.max(0, Number(ENV.TELEMATICS_HISTORY_MIN_SEC || 0));
      const historyMinMeters = Math.max(0, Number(ENV.TELEMATICS_HISTORY_MIN_METERS || 0));
      const prevAtMs = previousGpsLast?.at ? new Date(previousGpsLast.at).getTime() : 0;
      const sameAt = !!prevAtMs && prevAtMs === at.getTime();
      const distM = previousGpsLast ? haversineKm(previousGpsLast.lat, previousGpsLast.lng, lat, lng) * 1000 : Infinity;
      const historyAgeSec = prevAtMs ? Math.abs(at.getTime() - prevAtMs) / 1000 : Infinity;
      const deduped = !!previousGpsLast && sameAt && distM <= 5;
      const skipHistory = !!previousGpsLast && historyAgeSec < historyMinSec && distM < historyMinMeters;

      if (!deduped && !skipHistory) {
        await prisma.gpsPoint.create({
          data: {
            vehicleId,
            lat,
            lng,
            speed: typeof speed === "number" ? speed : null,
            at,
          },
        });
      }

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
      const nowForScope = at;
      // Not: COMPANY rolü /api/notifications/my'da companyId üzerinden filtreliyor.
      // Bu yüzden GPS bildirimlerinde SHIFT.companyId mutlaka kapsanmalı.
      const companyIds = new Set(
        activeShifts
          .filter((shift) => shift.startAt <= nowForScope && shift.endAt >= nowForScope && shift.companyId)
          .map((shift) => shift.companyId)
      );

      // =========================================================
      // ✅ helper: DRIVER notif hedeflerini üret
      // - her zaman sender user hedefi var (driverId null olabilir)
      // - ayrıca shift’e atanmış driver varsa onu da ekle
      // =========================================================
      const driverNotifTargets = [{ driverId: senderDriverId, userId: u.id }];
      try {
        const assignedShift = activeShifts.find((shift) => Number(shift.driverId || 0) && Number(shift.driverId || 0) !== Number(senderDriverId));
        const assignedDriverId = assignedShift?.driverId ?? null;
        if (assignedDriverId) {
          const dUser = await prisma.driver.findUnique({
            where: { id: assignedDriverId },
            select: { userId: true },
          });
          driverNotifTargets.push({ driverId: assignedDriverId, userId: dUser?.userId ?? null });
        }
      } catch {
        // ignore
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
          at: isoOffsetTR(last.at),
          ageSec,
          status: uiStatus,
          kind: "GPS_RECOVERY",
        });

        // ✅ NOTIF tarafı GPS ingest'i KIRAMAZ
        try {
          for (const t of driverNotifTargets) {
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
          at: isoOffsetTR(last.at),
          ageSec,
          status: uiStatus,
          kind: "OVERSPEED",
        });

        // ✅ NOTIF tarafı GPS ingest'i KIRAMAZ
        try {
          for (const t of driverNotifTargets) {
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
      // ✅ M71: AUTO-REACHED (geofence)
      // - Uses vehicle GPS ingest (/api/gps) which is typically sent by the driver app/device.
      // - When within 80m of the NEXT pending stop and (speed <= 15 km/h if provided), mark stop as REACHED.
      // - Idempotent: already reached/skipped stops are ignored.
      // =========================================================
      let autoReachedShifts = null;
      try {
        const radiusM = 80;
        const maxSpeedKmh = 15;
        const speedKmh = typeof speed === "number" ? speed : null;

        function firstPending(stops) {
          return (stops ?? []).find((s) => s.state === "PENDING") ?? null;
        }

        autoReachedShifts = await prisma.shift.findMany({
          where: { vehicleId, status: { in: ["APPROVED", "ACTIVE"] } },
          include: {
            progress: { select: { lastReachedOrder: true, pausedAt: true } },
            stops: {
              where: { state: "PENDING" },
              orderBy: { order: "asc" },
              take: 2,
              select: { id: true, order: true, name: true, state: true, lat: true, lng: true },
            },
          },
        });

        for (const sh of autoReachedShifts) {
          if (sh.progress?.pausedAt) continue;
          const next = firstPending(sh.stops ?? []);
          if (!next) continue;
          if (Number(next.order ?? 0) <= Number(sh.progress?.lastReachedOrder ?? 0)) continue;

          const km = haversineKm(lat, lng, next.lat, next.lng);
          const distM = km * 1000;
          if (distM > radiusM) continue;
          if (speedKmh !== null && speedKmh > maxSpeedKmh) continue;

          const now2 = new Date();
          const lastReachedOrder = Math.max(Number(sh.progress?.lastReachedOrder ?? 0), Number(next.order ?? 0));
          const task = {
            shiftId: sh.id,
            stopId: next.id,
            stopOrder: next.order ?? null,
            vehicleId,
            atIso: now2.toISOString(),
            lat,
            lng,
            speed: typeof speed === "number" ? speed : null,
            completed: (sh.stops?.length ?? 0) <= 1,
            lastReachedOrder,
            shiftSnapshot: {
              id: sh.id,
              companyId: sh.companyId ?? null,
              roomId: sh.roomId ?? null,
              vehicleId,
              startAt: sh.startAt ?? null,
            },
            stopsSnapshot: sh.stops ?? [],
            vehicleSnapshot: { id: vehicle.id, plate: vehicle.plate },
            gpsLastSnapshot: { lat: last.lat, lng: last.lng, at: last.at },
          };

          const queued = await enqueueAutoReachedTask(task);
          if (!queued.ok) {
            console.error("AUTO_REACHED enqueue failed:", queued.error || queued.reason || "unknown");
            void processAutoReachedTask(io, task).catch((e) => {
              console.error("AUTO_REACHED fallback error:", e);
            });
          }
        }
      } catch (e) {
        console.error("AUTO_REACHED error:", e);
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error("gps ingest error:", e);
      return res.status(500).json({ error: "gps ingest failed" });
    }
  });

  return r;
}
