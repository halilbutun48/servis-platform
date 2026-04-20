// backend/src/jobs/gpsStaleMonitor.js
// GPS STALE/OFFLINE monitor:
// - UI status (LIVE|STALE|OFFLINE) yayınlar (vehicle:status)
// - DB mapping uygular (GpsLast.OK/STALE + Vehicle.ACTIVE/STALE)
// - Notif sadece state transition'da (gateVehicleGpsState)
//   LIVE->STALE, STALE->OFFLINE  (+ /api/gps recovery = TO_LIVE)

import { prisma } from "../prisma.js";
import { gpsStatusFromAt } from "../gps/status.js";
import { gateVehicleGpsState } from "../gps/gpsStateGate.js";
import { createAndEmitNotification } from "../notifications/service.js";
import { buildNotifPayloadV1 } from "../notifications/payloadV1.js";

async function isDbReadyOnce() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    globalThis.__dbWarned = false;
    return true;
  } catch {
    if (!globalThis.__dbWarned) {
      globalThis.__dbWarned = true;
      console.warn("gpsStaleMonitor: DB not ready, skipping checks.");
    }
    return false;
  }
}

export function startGpsStaleMonitor(io, opts = {}) {
  const intervalMs = opts.intervalMs ?? 15_000;
  const batchSize = opts.batchSize ?? 200;

  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;

    try {
      if (!(await isDbReadyOnce())) return;

      const now = new Date();
      const nowMs = now.getTime();

      // id üzerinden sayfalama (batchSize) — tüm araçlar kapsansın.
      let lastId = 0;

      // gpsLast olan araçlar → "daha önce GPS görmüş" demektir; spam riskini azaltır
      // (gate ayrıca seenLiveAt şartı ile spam'i keser)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const vehicles = await prisma.vehicle.findMany({
          where: { id: { gt: lastId }, gpsLast: { isNot: null } },
          include: { gpsLast: true },
          take: batchSize,
          orderBy: { id: "asc" },
        });

        if (!vehicles.length) break;
        lastId = vehicles[vehicles.length - 1].id;

        for (const v of vehicles) {
          const lastAt = v.gpsLast?.at;
          if (!lastAt) continue;

          const derived = gpsStatusFromAt(lastAt);
          const uiStatus = derived?.status ?? "OFFLINE";
          const ageSec =
            typeof derived?.ageSec === "number"
              ? derived.ageSec
              : Math.max(0, Math.round((nowMs - new Date(lastAt).getTime()) / 1000));

          // 1) UI'nın stale/offline değişimini canlı görmesi için WS status emit
          const vehicleStatusPayload = { vehicleId: v.id, status: uiStatus, ageSec };
          io.to(`vehicle:${v.id}`).emit("vehicle:status", vehicleStatusPayload);
          io.to(`room:${v.roomId}`).emit("vehicle:status", vehicleStatusPayload);

          // ✅ Company fanout artık Room.companyId üzerinden değil;
          // sadece bu araca bağlı APPROVED/ACTIVE shift'lerin companyId'leri üzerinden.
          // Not: LIVE status zaten gps ingest ile şirketlere gider; burada asıl kritik STALE/OFFLINE.
          if (uiStatus !== "LIVE") {
            try {
              const rel = await prisma.shift.findMany({
                where: { vehicleId: v.id, status: { in: ["APPROVED", "ACTIVE"] } },
                select: { companyId: true },
              });
              for (const row of rel) {
                if (row.companyId) io.to(`company:${row.companyId}`).emit("vehicle:status", vehicleStatusPayload);
              }
            } catch {
              // ignore
            }
          }

          // 2) DB mapping (tek kaynak status.js)
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

          // /api/gps zaten OFFLINE/STALE -> LIVE (recovery) üretiyor;
          // burada sadece STALE/OFFLINE üretelim.
          let kind = null;
          let title = null;

          if (gate.transition === "LIVE_TO_STALE") {
            kind = "GPS_STALE";
            title = "GPS Stale";
          } else if (gate.transition === "STALE_TO_OFFLINE" || gate.transition === "LIVE_TO_OFFLINE") {
            kind = "GPS_OFFLINE";
            title = "GPS Offline";
          } else {
            continue;
          }

          const payload = buildNotifPayloadV1({
            title,
            message:
              kind === "GPS_OFFLINE"
                ? `Araç ${v.plate} uzun süredir çevrimdışı (${ageSec}sn).`
                : `Araç ${v.plate} konum güncellemesi gecikti (${ageSec}sn).`,
            vehicleId: v.id,
            at: now.toISOString(),
            ageSec,
            status: uiStatus,
            kind,
          });

          // Hedef scope'lar (driver/room/company) için bağları mümkünse SHIFT'ten üret.
          // ÖNEMLİ: findFirst orderBy olmadan farklı tick'lerde farklı SHIFT dönebilir
          // (özellikle aynı araçta hem APPROVED hem ACTIVE shift açık kalırsa).
          // Bu yüzden önce ACTIVE'ı, yoksa en yeni APPROVED'ı seçiyoruz.
          const shActive = await prisma.shift.findFirst({
            where: { vehicleId: v.id, status: "ACTIVE", driverId: { not: null } },
            orderBy: { id: "desc" },
            select: { id: true, driverId: true, roomId: true, companyId: true },
          });

          const sh =
            shActive ??
            (await prisma.shift.findFirst({
              where: { vehicleId: v.id, status: "APPROVED", driverId: { not: null } },
              orderBy: { id: "desc" },
              select: { id: true, driverId: true, roomId: true, companyId: true },
            }));

          const targetRoomId = sh?.roomId ?? v.roomId ?? null;
          const targetCompanyId = sh?.companyId ?? null;
          const dedupeKeyOf = (scope) => `GPS:${v.id}:${kind}:${scope}:${sh?.id ?? 0}`;

          // ROOM scope
          if (targetRoomId) {
            await createAndEmitNotification({
              io,
              // API/testler Notification.type alanını okuyor (GPS_STALE / GPS_OFFLINE)
              type: kind,
              scope: "ROOM",
              payload,
              // dedupeKey ayrı ayrı (ROOM/DRIVER/COMPANY) tutulur.
              // NOTE: createAndEmitNotification 'dedupeKey' paramı bekler (meta değil).
              dedupeKey: dedupeKeyOf("ROOM"),
              roomId: targetRoomId,
              companyId: targetCompanyId,
              vehicleId: v.id,
            });
          }

          // COMPANY scope
          if (targetCompanyId) {
            await createAndEmitNotification({
              io,
              type: kind,
              scope: "COMPANY",
              payload,
              // NOTE: createAndEmitNotification 'dedupeKey' paramı bekler (meta değil).
              dedupeKey: dedupeKeyOf("COMPANY"),
              companyId: targetCompanyId,
              roomId: targetRoomId,
              vehicleId: v.id,
            });
          }

          if (sh?.driverId) {
            const dUser = await prisma.driver.findUnique({
              where: { id: sh.driverId },
              select: { userId: true },
            });

            await createAndEmitNotification({
              io,
              type: kind,
              scope: "DRIVER",
              payload,
              // NOTE: createAndEmitNotification 'dedupeKey' paramı bekler (meta değil).
              dedupeKey: dedupeKeyOf("DRIVER"),
              driverId: sh.driverId,
              userId: dUser?.userId ?? null,
              vehicleId: v.id,
              roomId: targetRoomId,
              companyId: targetCompanyId,
            });
          }
        }
      }
    } catch (e) {
      console.error("gpsStaleMonitor error:", e);
    } finally {
      running = false;
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
