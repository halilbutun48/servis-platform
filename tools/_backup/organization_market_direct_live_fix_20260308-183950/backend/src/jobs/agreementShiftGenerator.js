// backend/src/jobs/agreementShiftGenerator.js
import { prisma } from "../prisma.js";
import { checkShiftConflicts } from "../services/shiftConflict.js";
import { ymdTR, addDaysTR, dayBitTRFromYmd, atTR, dateOnlyUTCFromYmd } from "../time/tr.js";

/**
 * M52: approved/active agreement'lara göre rolling ufukta (bugün..+6 gün) shift üretir.
 * Saat/dow hesabı TR (+03:00) bazlıdır.
 * Duplicate guard: Shift @@unique([agreementId, startAt])
 *
 * @param {import('socket.io').Server} io
 * @param {{ intervalMs?: number }} opts
 */
export function startAgreementShiftGenerator(io, opts = {}) {
  const intervalMs = Number(opts.intervalMs || 5000);

  let timer = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;

    try {
      const now = new Date();
      const today = ymdTR(now);
      const horizonEnd = addDaysTR(today, 6);

      // overlap with rolling horizon
      const agreements = await prisma.agreement.findMany({
        where: {
          status: { in: ["APPROVED", "ACTIVE"] },
          startDate: { lte: dateOnlyUTCFromYmd(horizonEnd) },
          endDate: { gte: dateOnlyUTCFromYmd(today) },
        },
        take: 500,
      });

      for (const a of agreements) {
        // agreement date range as YMD (db.Date => safe via UTC components)
        const sYmd = String(a.startDate?.toISOString?.() || "").slice(0, 10);
        const eYmd = String(a.endDate?.toISOString?.() || "").slice(0, 10);

        for (let i = 0; i < 7; i++) {
          const ymd = addDaysTR(today, i);
          if (ymd < sYmd || ymd > eYmd) continue;

          // week mask (TR)
          const wm = Number(a.weekMask || 0);
          const bit = dayBitTRFromYmd(ymd);
          if ((wm & bit) === 0) continue;

          const startAt = atTR(ymd, a.startMin);
          const endYmd = Number(a.endMin) < Number(a.startMin) ? addDaysTR(ymd, 1) : ymd;
          const endAt = atTR(endYmd, a.endMin);

          // cheap precheck: already exists?
          // eslint-disable-next-line no-await-in-loop
          const exists = await prisma.shift.findFirst({
            where: { agreementId: a.id, startAt },
            select: { id: true },
          });
          if (exists?.id) continue;

          // shift conflict with any existing shift (manual or generated)
          if (a.driverId || a.vehicleId) {
            // eslint-disable-next-line no-await-in-loop
            const conflicts = await checkShiftConflicts({
              driverId: a.driverId ?? undefined,
              vehicleId: a.vehicleId ?? undefined,
              startAt: startAt.toISOString(),
              endAt: endAt.toISOString(),
            });
            if (conflicts?.driverConflict || conflicts?.vehicleConflict) {
              continue; // skip silently (ops tarafı isterse log/audit ekleriz)
            }
          }

          // duplicate guard: unique(agreementId,startAt)
          try {
            // eslint-disable-next-line no-await-in-loop
            const created = await prisma.shift.create({
              data: {
                companyId: a.companyId,
                roomId: a.roomId,
                vehicleId: a.vehicleId ?? null,
                driverId: a.driverId ?? null,
                startAt,
                endAt,
                status: "APPROVED",
                agreementId: a.id,
                // ✅ M19: routing meta
                hubLat: a.hubLat ?? null,
                hubLng: a.hubLng ?? null,
                direction: a.direction ?? "INBOUND",
                pattern: a.pattern ?? "ONE_WAY",
              },
            });

            const payload = {
              kind: "shift:update",
              shiftId: created.id,
              agreementId: a.id,
              status: created.status,
              startAt: created.startAt,
              endAt: created.endAt,
            };

            // WS invalidate için: shift kelimesi yeterli (client guessTopics)
            io?.to?.(`company:${created.companyId}`)?.emit?.("shift:update", payload);
            io?.to?.(`room:${created.roomId}`)?.emit?.("shift:update", payload);
            if (created.vehicleId) io?.to?.(`vehicle:${created.vehicleId}`)?.emit?.("shift:update", payload);

            // (opsiyonel) agreement list refresh
            io?.to?.(`company:${created.companyId}`)?.emit?.("agreement:update", {
              kind: "agreement:update",
              agreementId: a.id,
            });
            io?.to?.(`room:${created.roomId}`)?.emit?.("agreement:update", {
              kind: "agreement:update",
              agreementId: a.id,
            });
          } catch (e) {
            // Prisma unique violation => already exists (duplicate guard)
            const msg = String(e?.code || e?.message || "");
            if (msg.includes("P2002")) continue;
            // başka hata: sessiz geçmeyelim
            // eslint-disable-next-line no-console
            console.error("[agreementShiftGenerator] create failed:", e?.message || e);
          }
        }
      }
    } finally {
      running = false;
    }
  }

  // start
  timer = setInterval(() => tick().catch(() => {}), intervalMs);
  // ilk tick biraz sonra (agreement sonradan oluşacağı için periodic yeterli)
  setTimeout(() => tick().catch(() => {}), Math.min(1500, intervalMs));

  return () => {
    try {
      clearInterval(timer);
    } catch {}
  };
}
