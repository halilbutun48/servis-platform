// backend/src/jobs/maintenanceMonitor.js
// Maintenance upcoming monitor (default: 7 days window, 24h dedupe)

import { prisma } from "../prisma.js";
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
      console.warn("maintenanceMonitor: DB not ready, skipping checks.");
    }
    return false;
  }
}

export function startMaintenanceMonitor(io, opts = {}) {
  const intervalMs = opts.intervalMs ?? 30 * 60 * 1000; // 30dk
  const windowDays = opts.windowDays ?? 7;
  const dedupeHours = opts.dedupeHours ?? 24;

  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;

    try {
      if (!(await isDbReadyOnce())) return;

      const now = new Date();
      const nowMs = now.getTime();
      const windowMs = windowDays * 24 * 60 * 60 * 1000;
      const dedupeMs = dedupeHours * 60 * 60 * 1000;

      const upcoming = await prisma.vehicle.findMany({
        where: { nextMaintenanceAt: { not: null } },
        include: { room: true },
      });

      for (const v of upcoming) {
        const due = v.nextMaintenanceAt ? new Date(v.nextMaintenanceAt).getTime() : null;
        if (!due) continue;

        const diff = due - nowMs;
        if (diff <= 0 || diff >= windowMs) continue;

        // spam gate: same type+vehicle within last dedupe window
        const existing = await prisma.notification.findFirst({
          where: {
            type: "MAINT_7D",
            vehicleId: v.id,
            createdAt: { gte: new Date(nowMs - dedupeMs) },
          },
          select: { id: true },
        });
        if (existing) continue;

        const payload = buildNotifPayloadV1({
          title: "Bakım Yaklaşıyor",
          message: `Araç ${v.plate} bakım tarihi yaklaştı (${new Date(due)
            .toISOString()
            .slice(0, 10)}).`,
          vehicleId: v.id,
          at: now.toISOString(),
          ageSec: null,
          status: null,
          kind: "MAINT_7D",
        });

        await createAndEmitNotification({
          io,
          type: "MAINT_7D",
          scope: "ROOM",
          payload,
          roomId: v.roomId,
          companyId: v.room.companyId,
          vehicleId: v.id,
        });

        await createAndEmitNotification({
          io,
          type: "MAINT_7D",
          scope: "COMPANY",
          payload,
          companyId: v.room.companyId,
          roomId: v.roomId,
          vehicleId: v.id,
        });

        // if any active shift -> driver
        const sh = await prisma.shift.findFirst({
          where: {
            vehicleId: v.id,
            status: { in: ["APPROVED", "ACTIVE"] },
            driverId: { not: null },
          },
          select: { driverId: true },
        });

        if (sh?.driverId) {
          const dUser = await prisma.driver.findUnique({
            where: { id: sh.driverId },
            select: { userId: true },
          });

          await createAndEmitNotification({
            io,
            type: "MAINT_7D",
            scope: "DRIVER",
            payload,
            driverId: sh.driverId,
            userId: dUser?.userId ?? null,
            vehicleId: v.id,
            roomId: v.roomId,
            companyId: v.room.companyId,
          });
        }
      }
    } catch (e) {
      console.error("maintenanceMonitor error:", e);
    } finally {
      running = false;
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
