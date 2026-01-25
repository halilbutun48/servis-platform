// backend/src/jobs/gpsStaleMonitor.js
import { prisma } from "../prisma.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { gateVehicleGpsState } from "../gps/gpsStateGate.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { buildNotifPayloadV1 } from "../notifications/payloadV1.js";

export function startGpsStaleMonitor(io, opts = {}) {
  const intervalMs = opts.intervalMs ?? 10_000; // 10sn iyi
  const batchSize = opts.batchSize ?? 200;

  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;

    try {
      const now = new Date();

      // gpsLast olan araçlar → "daha önce GPS görmüş" demektir; spam riskini azaltır
      const vehicles = await prisma.vehicle.findMany({
        where: { gpsLast: { isNot: null } },
        include: { room: true, gpsLast: true },
        take: batchSize,
        orderBy: { id: "asc" },
      });

      for (const v of vehicles) {
        const lastAt = v.gpsLast?.at;
        if (!lastAt) continue;

        const { status: uiStatus, ageSec } = gpsStatusFromAt(lastAt);

        // 1) UI'nın stale/offline değişimini canlı görmesi için WS status emit
        const vehicleStatusPayload = { vehicleId: v.id, status: uiStatus, ageSec };
        io.to(`vehicle:${v.id}`).emit("vehicle:status", vehicleStatusPayload);
        io.to(`room:${v.roomId}`).emit("vehicle:status", vehicleStatusPayload);
        io.to(`company:${v.room.companyId}`).emit("vehicle:status", vehicleStatusPayload);

        // 2) DB mapping (senin tek kaynak kuralınla uyumlu)
        // LIVE => GpsLast.OK + Vehicle.ACTIVE
        // STALE/OFFLINE => GpsLast.STALE + Vehicle.STALE
        const desiredGpsLastStatus = uiStatus === "LIVE" ? "OK" : "STALE";
        const desiredVehicleStatus = uiStatus === "LIVE" ? "ACTIVE" : "STALE";

        // gereksiz write olmasın diye "farklıysa update" (updateMany ile)
        await prisma.gpsLast.updateMany({
          where: { vehicleId: v.id, status: { not: desiredGpsLastStatus } },
          data: { status: desiredGpsLastStatus },
        });

        await prisma.vehicle.updateMany({
          where: { id: v.id, status: { not: desiredVehicleStatus } },
          data: { status: desiredVehicleStatus },
        });

        // 3) ✅ SPAM'İ ASIL KESEN YER: gate + transition notif
        const gate = await gateVehicleGpsState({
          prisma,
          vehicleId: v.id,
          newUiStatus: uiStatus,
          now,
        });

        if (!gate.shouldNotify) continue;

        // /api/gps zaten OFFLINE->LIVE (recovery) üretiyor; burada sadece STALE/OFFLINE üretelim
        let type = null;
        let title = null;
        let kind = null;

        if (gate.transition === "LIVE_TO_STALE") {
          type = "GPS_STALE";
          title = "GPS Zayıfladı";
          kind = "GPS_STALE";
        } else if (gate.transition === "STALE_TO_OFFLINE") {
          type = "GPS_OFFLINE";
          title = "GPS Kesildi";
          kind = "GPS_OFFLINE";
        } else {
          continue;
        }

        const payload = buildNotifPayloadV1({
          title,
          message: `Araç ${v.plate}: ${gate.prevStatus} → ${gate.newStatus}`,
          vehicleId: v.id,
          at: now.toISOString(),
          ageSec,
          status: uiStatus,
          kind,
        });

        // ROOM
        await createAndEmitNotification({
          io,
          type,
          scope: "ROOM",
          payload,
          roomId: v.roomId,
          companyId: v.room.companyId,
          vehicleId: v.id,
        });

        // COMPANY
        await createAndEmitNotification({
          io,
          type,
          scope: "COMPANY",
          payload,
          companyId: v.room.companyId,
          roomId: v.roomId,
          vehicleId: v.id,
        });
      }
    } catch (e) {
      console.error("gpsStaleMonitor error:", e);
    } finally {
      running = false;
    }
  }, intervalMs);

  return () => clearInterval(timer);
}