// backend/src/jobs/agreementShiftGenerator.js
import { prisma } from "../prisma.js";
import { checkShiftConflicts } from "../services/shiftConflict.js";

function todayYmdUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function utcDateFromYmd(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function addDaysUTC(ymd, days) {
  const d = utcDateFromYmd(ymd);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return todayYmdUTC(d);
}

function dayBitUTC(d = new Date()) {
  // getUTCDay: 0=Sun..6=Sat
  const wd = d.getUTCDay();
  if (wd === 0) return 64; // Sun
  return 1 << (wd - 1); // Mon=1..Sat=32
}

function atUtc(ymd, min) {
  const d = utcDateFromYmd(ymd);
  const m = Number(min || 0);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  d.setUTCHours(hh, mm, 0, 0);
  return d;
}

/**
 * M18: approved/active agreement'lara göre "bugün" için shift üretir.
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
      const ymd = todayYmdUTC(now);
      const bit = dayBitUTC(now);

      // today within date range + assigned vehicle/driver + approved/active
      const agreements = await prisma.agreement.findMany({
        where: {
          status: { in: ["APPROVED", "ACTIVE"] },
          vehicleId: { not: null },
          driverId: { not: null },
          startDate: { lte: utcDateFromYmd(ymd) },
          endDate: { gte: utcDateFromYmd(ymd) },
        },
        take: 500,
      });

      for (const a of agreements) {
        // week mask
        const wm = Number(a.weekMask || 0);
        if ((wm & bit) === 0) continue;

        const startAt = atUtc(ymd, a.startMin);
        const endYmd = a.endMin < a.startMin ? addDaysUTC(ymd, 1) : ymd;
        const endAt = atUtc(endYmd, a.endMin);

        // shift conflict with any existing shift (manual or generated)
        const conflicts = await checkShiftConflicts({
          driverId: a.driverId ?? undefined,
          vehicleId: a.vehicleId ?? undefined,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
        if (conflicts?.driverConflict || conflicts?.vehicleConflict) {
          continue; // skip silently (ops tarafı isterse log/audit ekleriz)
        }

        // duplicate guard: unique(agreementId,startAt)
        try {
          const created = await prisma.shift.create({
            data: {
              companyId: a.companyId,
              roomId: a.roomId,
              vehicleId: a.vehicleId,
              driverId: a.driverId,
              startAt,
              endAt,
              status: "APPROVED",
              agreementId: a.id,
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
          io?.to?.(`company:${created.companyId}`)?.emit?.("agreement:update", { kind: "agreement:update", agreementId: a.id });
          io?.to?.(`room:${created.roomId}`)?.emit?.("agreement:update", { kind: "agreement:update", agreementId: a.id });
        } catch (e) {
          // Prisma unique violation => already exists (duplicate guard)
          const msg = String(e?.code || e?.message || "");
          if (msg.includes("P2002")) continue;
          // başka hata: sessiz geçmeyelim
          // eslint-disable-next-line no-console
          console.error("[agreementShiftGenerator] create failed:", e?.message || e);
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