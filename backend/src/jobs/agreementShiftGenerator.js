// backend/src/jobs/agreementShiftGenerator.js
import { prisma } from "../prisma.js";
import { checkShiftConflicts } from "../services/shiftConflict.js";
import { ymdTR, addDaysTR, dayBitTRFromYmd, atTR, dateOnlyUTCFromYmd } from "../time/tr.js";
import { rebuildShiftRouteStateBestEffort } from "../services/shiftRouteState.js";
import { resolveAgreementSourceShiftPayload } from "../services/agreementSourceShift.js";

async function loadAgreementSourceShift(agreementId) {
  return resolveAgreementSourceShiftPayload(agreementId);
}

async function cloneAgreementShiftPayload(createdShiftId, sourceShift) {
  if (!sourceShift || !createdShiftId) return;

  const sourceStops = Array.isArray(sourceShift.stops) && sourceShift.stops.length
    ? sourceShift.stops
    : Array.isArray(sourceShift.organizationPlan?.stops)
      ? sourceShift.organizationPlan.stops.map((s) => ({
          id: 0,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          order: s.order,
          type: s.type,
        }))
      : [];

  const stopRows = Array.isArray(sourceStops)
    ? sourceStops.map((s) => ({
        shiftId: createdShiftId,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        order: s.order,
        type: s.type,
      }))
    : [];
  if (stopRows.length) {
    await prisma.stop.createMany({ data: stopRows });
  }

  const peopleRows = Array.isArray(sourceShift.people)
    ? sourceShift.people
        .map((p) => {
          const personelId = Number(p?.personelId || 0);
          return personelId > 0 ? { shiftId: createdShiftId, personelId, note: p?.note || null } : null;
        })
        .filter(Boolean)
    : [];
  if (peopleRows.length) {
    await prisma.shiftPersonel.createMany({ data: peopleRows, skipDuplicates: true });
  }

  if (Array.isArray(sourceShift.assignments) && sourceShift.assignments.length && stopRows.length) {
    const freshStops = await prisma.stop.findMany({
      where: { shiftId: createdShiftId },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
    const oldOrderByStopId = new Map((sourceStops || []).map((s, idx) => [Number(s.id || idx + 1), Number(s.order || idx + 1)]));
    const newStopIdByOrder = new Map(freshStops.map((s) => [Number(s.order), Number(s.id)]));
    const assignmentRows = sourceShift.assignments
      .map((row) => {
        const order = oldOrderByStopId.get(Number(row.stopId)) || oldOrderByStopId.get(Number(row.stopId || 0));
        const stopId = newStopIdByOrder.get(Number(order));
        const personelId = Number(row.personelId || 0);
        if (!stopId || personelId <= 0) return null;
        return {
          shiftId: createdShiftId,
          stopId,
          personelId,
          walkM: Number.isFinite(Number(row.walkM)) ? Number(row.walkM) : 0,
        };
      })
      .filter(Boolean);
    if (assignmentRows.length) {
      await prisma.stopAssignment.createMany({ data: assignmentRows, skipDuplicates: true });
    }
  }
}

/**
 * M52: approved/active agreement'lara gÃ¶re rolling ufukta (bugÃ¼n..+6 gÃ¼n) shift Ã¼retir.
 * Saat/dow hesabÄ± TR (+03:00) bazlÄ±dÄ±r.
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
        const sourceShift = await loadAgreementSourceShift(a.id);
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
              continue; // skip silently (ops tarafÄ± isterse log/audit ekleriz)
            }
          }

          // duplicate guard: unique(agreementId,startAt)
          try {
            const routeSnapshotFromSource = sourceShift?.routeSnapshotValidatedAt
              ? {
                  routeSnapshotPolyline: sourceShift.routeSnapshotPolyline ?? null,
                  routeSnapshotDistanceM: sourceShift.routeSnapshotDistanceM ?? null,
                  routeSnapshotDurationSec: sourceShift.routeSnapshotDurationSec ?? null,
                  routeSnapshotValidatedAt: sourceShift.routeSnapshotValidatedAt ?? null,
                  routeSnapshotInputHash: sourceShift.routeSnapshotInputHash ?? null,
                }
              : {};

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
                hubLat: a.hubLat ?? null,
                hubLng: a.hubLng ?? null,
                direction: a.direction ?? "INBOUND",
                pattern: a.pattern ?? "ONE_WAY",
                ...routeSnapshotFromSource,
              },
            });

            // eslint-disable-next-line no-await-in-loop
            await cloneAgreementShiftPayload(created.id, sourceShift);
            if (!routeSnapshotFromSource.routeSnapshotValidatedAt) {
              // eslint-disable-next-line no-await-in-loop
              await rebuildShiftRouteStateBestEffort(created.id);
            }

            const payload = {
              kind: "shift:update",
              shiftId: created.id,
              agreementId: a.id,
              status: created.status,
              startAt: created.startAt,
              endAt: created.endAt,
            };

            io?.to?.(`company:${created.companyId}`)?.emit?.("shift:update", payload);
            io?.to?.(`room:${created.roomId}`)?.emit?.("shift:update", payload);
            if (created.vehicleId) io?.to?.(`vehicle:${created.vehicleId}`)?.emit?.("shift:update", payload);

            io?.to?.(`company:${created.companyId}`)?.emit?.("agreement:update", {
              kind: "agreement:update",
              agreementId: a.id,
            });
            io?.to?.(`room:${created.roomId}`)?.emit?.("agreement:update", {
              kind: "agreement:update",
              agreementId: a.id,
            });
          } catch (e) {
            const msg = String(e?.code || e?.message || "");
            if (msg.includes("P2002")) continue;
            // eslint-disable-next-line no-console
            console.error("[agreementShiftGenerator] create failed:", e?.message || e);
          }
        }
      }
    } finally {
      running = false;
    }
  }

  timer = setInterval(() => tick().catch(() => {}), intervalMs);
  setTimeout(() => tick().catch(() => {}), Math.min(1500, intervalMs));

  return () => {
    try {
      clearInterval(timer);
    } catch {}
  };
}
