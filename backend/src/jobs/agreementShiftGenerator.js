// backend/src/jobs/agreementShiftGenerator.js
import { workerPrisma } from "../prisma.js";
import { checkShiftConflicts } from "../services/shiftConflict.js";
import { ymdTR, addDaysTR, dayBitTRFromYmd, atTR, dateOnlyUTCFromYmd } from "../time/tr.js";
import { rebuildShiftRouteStateBestEffort } from "../services/shiftRouteState.js";
import { resolveAgreementSourceShiftPayload } from "../services/agreementSourceShift.js";
import logger from "../lib/logger.js";

async function loadAgreementSourceShift(agreementId, db) {
  return resolveAgreementSourceShiftPayload(agreementId, db);
}

async function cloneAgreementShiftPayload(createdShiftId, sourceShift, db) {
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
    await db.stop.createMany({ data: stopRows });
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
    await db.shiftPersonel.createMany({ data: peopleRows, skipDuplicates: true });
  }

  if (Array.isArray(sourceShift.assignments) && sourceShift.assignments.length && stopRows.length) {
    const freshStops = await db.stop.findMany({
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
      await db.stopAssignment.createMany({ data: assignmentRows, skipDuplicates: true });
    }
  }
}

function normalizeYmd(value) {
  const text = String(value || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function agreementDateYmd(value) {
  return normalizeYmd(value?.toISOString?.());
}

function sourceShiftValidation(agreement, sourceShift) {
  const source = sourceShift?.shift || null;
  if (!source) return { ok: false, code: "SOURCE_SHIFT_MISSING", message: "Agreement kaynak vardiyası bulunamadı." };
  if (Number(source.companyId || 0) !== Number(agreement.companyId || 0)) {
    return { ok: false, code: "SOURCE_SHIFT_COMPANY_MISMATCH", message: "Agreement ile kaynak vardiya aynı firmaya ait değil." };
  }
  if (Number(source.roomId || 0) !== Number(agreement.roomId || 0)) {
    return { ok: false, code: "SOURCE_SHIFT_ROOM_MISMATCH", message: "Agreement ile kaynak vardiya aynı odaya ait değil." };
  }
  if (Number(source.agreementId || 0) > 0 && Number(source.agreementId) !== Number(agreement.id)) {
    return { ok: false, code: "SOURCE_SHIFT_ALREADY_LINKED", message: "Kaynak vardiya başka bir sözleşmeye bağlı." };
  }
  if (String(source.status || "").toUpperCase() === "DRAFT") {
    return { ok: false, code: "SOURCE_SHIFT_DRAFT", message: "Taslak kaynak vardiyadan operasyon üretilemez." };
  }
  return { ok: true, source };
}

function routeSnapshotFromSource(sourceShift) {
  const source = sourceShift?.shift || null;
  if (!source?.routeSnapshotValidatedAt) return {};
  return {
    routeSnapshotPolyline: source.routeSnapshotPolyline ?? null,
    routeSnapshotDistanceM: source.routeSnapshotDistanceM ?? null,
    routeSnapshotDurationSec: source.routeSnapshotDurationSec ?? null,
    routeSnapshotValidatedAt: source.routeSnapshotValidatedAt ?? null,
    routeSnapshotInputHash: source.routeSnapshotInputHash ?? null,
  };
}

function emitCreatedShift(io, created) {
  if (!created?.id) return;
  const payload = {
    kind: "shift:update",
    shiftId: created.id,
    agreementId: created.agreementId,
    status: created.status,
    startAt: created.startAt,
    endAt: created.endAt,
  };
  io?.to?.(`company:${created.companyId}`)?.emit?.("shift:update", payload);
  io?.to?.(`room:${created.roomId}`)?.emit?.("shift:update", payload);
  if (created.vehicleId) io?.to?.(`vehicle:${created.vehicleId}`)?.emit?.("shift:update", payload);
  io?.to?.(`company:${created.companyId}`)?.emit?.("agreement:update", {
    kind: "agreement:update",
    agreementId: created.agreementId,
  });
  io?.to?.(`room:${created.roomId}`)?.emit?.("agreement:update", {
    kind: "agreement:update",
    agreementId: created.agreementId,
  });
}

async function createAgreementOperationShift({ agreement, sourceShift, startAt, endAt, db, io }) {
  const run = async (tx) => {
    const existing = await tx.shift.findFirst({
      where: { agreementId: agreement.id, startAt },
      select: { id: true, agreementId: true, startAt: true, endAt: true, status: true, companyId: true, roomId: true, vehicleId: true, driverId: true },
    });
    if (existing?.id) return { created: false, shift: existing };

    if (agreement.driverId || agreement.vehicleId) {
      const conflicts = await checkShiftConflicts({
        prismaClient: tx,
        driverId: agreement.driverId ?? undefined,
        vehicleId: agreement.vehicleId ?? undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      if (conflicts?.driverConflict || conflicts?.vehicleConflict) {
        return { created: false, conflict: true, shift: null };
      }
    }

    const sourceRouteSnapshot = routeSnapshotFromSource(sourceShift);
    const created = await tx.shift.create({
      data: {
        companyId: agreement.companyId,
        roomId: agreement.roomId,
        vehicleId: agreement.vehicleId ?? null,
        driverId: agreement.driverId ?? null,
        startAt,
        endAt,
        status: "APPROVED",
        agreementId: agreement.id,
        hubLat: agreement.hubLat ?? null,
        hubLng: agreement.hubLng ?? null,
        direction: agreement.direction ?? "INBOUND",
        pattern: agreement.pattern ?? "ONE_WAY",
        ...sourceRouteSnapshot,
      },
    });

    await cloneAgreementShiftPayload(created.id, sourceShift, tx);
    if (!sourceRouteSnapshot.routeSnapshotValidatedAt) {
      await rebuildShiftRouteStateBestEffort(created.id, tx);
    }
    return { created: true, shift: created };
  };

  try {
    const result = await db.$transaction(run);
    if (result.created) emitCreatedShift(io, result.shift);
    return result;
  } catch (error) {
    const message = String(error?.code || error?.message || "");
    if (!message.includes("P2002")) throw error;
    const existing = await db.shift.findFirst({
      where: { agreementId: agreement.id, startAt },
      select: { id: true, agreementId: true, startAt: true, endAt: true, status: true, companyId: true, roomId: true, vehicleId: true, driverId: true },
    });
    if (existing?.id) return { created: false, shift: existing, raceRecovered: true };
    throw error;
  }
}

/**
 * Run the canonical agreement -> operation shift generator once.
 * Background scheduling uses the rolling 7-day window; an authorized route
 * may provide an explicit agreement period without introducing another
 * generation engine.
 */
export async function generateAgreementShiftsOnce(io, opts = {}) {
  const db = opts.prismaClient || workerPrisma;
  if (!db) return { ok: false, byId: {}, reason: "DATABASE_UNAVAILABLE" };

  const fromYmd = normalizeYmd(opts.fromYmd) || ymdTR(new Date());
  const toYmd = normalizeYmd(opts.toYmd) || addDaysTR(fromYmd, Math.max(0, Number(opts.horizonDays ?? 6)));
  if (toYmd < fromYmd) return { ok: false, byId: {}, reason: "INVALID_DATE_WINDOW" };

  const ids = Array.from(new Set((Array.isArray(opts.agreementIds) ? opts.agreementIds : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)));
  const agreements = await db.agreement.findMany({
    where: {
      ...(ids.length ? { id: { in: ids } } : {}),
      status: { in: ["APPROVED", "ACTIVE"] },
      startDate: { lte: dateOnlyUTCFromYmd(toYmd) },
      endDate: { gte: dateOnlyUTCFromYmd(fromYmd) },
    },
    take: 500,
  });

  const byId = {};
  for (const agreement of agreements) {
    const result = {
      agreementId: agreement.id,
      sourceShiftId: null,
      createdShiftIds: [],
      existingShiftIds: [],
      skippedDates: [],
      blocked: null,
    };
    byId[agreement.id] = result;

    if (!agreement.vehicleId || !agreement.driverId) {
      result.blocked = { code: "AGREEMENT_ASSIGNMENT_REQUIRED", message: "Agreement araç ve sürücü ataması bekliyor." };
      continue;
    }

    const sourceShift = await loadAgreementSourceShift(agreement.id, db);
    const sourceCheck = sourceShiftValidation(agreement, sourceShift);
    if (!sourceCheck.ok) {
      result.blocked = { code: sourceCheck.code, message: sourceCheck.message };
      continue;
    }
    result.sourceShiftId = sourceCheck.source.id;

    const agreementStartYmd = agreementDateYmd(agreement.startDate);
    const agreementEndYmd = agreementDateYmd(agreement.endDate);
    const windowStart = agreementStartYmd > fromYmd ? agreementStartYmd : fromYmd;
    const windowEnd = agreementEndYmd < toYmd ? agreementEndYmd : toYmd;
    if (!agreementStartYmd || !agreementEndYmd || windowEnd < windowStart) continue;

    for (let ymd = windowStart; ymd <= windowEnd; ymd = addDaysTR(ymd, 1)) {
      const bit = dayBitTRFromYmd(ymd);
      if ((Number(agreement.weekMask || 0) & bit) === 0) continue;

      const startAt = atTR(ymd, agreement.startMin);
      const endYmd = Number(agreement.endMin) < Number(agreement.startMin) ? addDaysTR(ymd, 1) : ymd;
      const endAt = atTR(endYmd, agreement.endMin);
      const generated = await createAgreementOperationShift({ agreement, sourceShift, startAt, endAt, db, io });
      if (generated.conflict) {
        result.skippedDates.push({ ymd, reason: "RESOURCE_CONFLICT" });
      } else if (generated.created) {
        result.createdShiftIds.push(generated.shift.id);
      } else if (generated.shift?.id) {
        result.existingShiftIds.push(generated.shift.id);
      }
    }
  }

  return {
    ok: true,
    fromYmd,
    toYmd,
    byId,
    agreementCount: agreements.length,
  };
}

/**
 * M52: approved/active agreement'lara göre rolling ufukta (bugün..+6 gün) shift üretir.
 * Saat/dow hesabı TR (+03:00) bazlıdır.
 * Duplicate guard: Shift @@unique([agreementId, startAt])
 *
 * @param {import('socket.io').Server} io
 * @param {{ intervalMs?: number }} opts
 */
export function startAgreementShiftGenerator(io, opts = {}) {
  const db = opts.prismaClient || workerPrisma;
  if (!db) return () => {};
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
      await generateAgreementShiftsOnce(io, {
        prismaClient: db,
        fromYmd: today,
        toYmd: horizonEnd,
      });
    } catch (error) {
      logger.error("[agreementShiftGenerator] tick failed:", error?.message || error);
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

