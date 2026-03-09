// backend/src/services/agreementConflictBatch.js
// ✅ M20: batch agreement conflict lookup for a time range
// Deterministic: return the first conflicting agreement by id ASC for each vehicle/driver.
// TR-local schedule semantics (UTC+03:00).

import { prisma } from "../prisma.js";
import { addDaysTR, dayBitTRFromYmd, dateOnlyTR } from "../time/tr.js";

function ymdFromDateOnlyUTC(d) {
  return String(new Date(d).toISOString()).slice(0, 10);
}

function minutesToDtTR(ymd, min) {
  const base = new Date(`${ymd}T00:00:00.000+03:00`);
  return new Date(base.getTime() + Number(min || 0) * 60_000);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function intervalsForDayTR(ag, ymd) {
  const mask = dayBitTRFromYmd(ymd);
  if ((Number(ag.weekMask || 0) & mask) === 0) return [];

  const startMin = Number(ag.startMin || 0);
  const endMin = Number(ag.endMin || 0);
  const start = minutesToDtTR(ymd, startMin);

  if (endMin >= startMin) {
    const end = minutesToDtTR(ymd, endMin);
    return [[start, end]];
  }

  const end1 = minutesToDtTR(ymd, 1440);
  const nextYmd = addDaysTR(ymd, 1);
  const start2 = minutesToDtTR(nextYmd, 0);
  const end2 = minutesToDtTR(nextYmd, endMin);
  return [
    [start, end1],
    [start2, end2],
  ];
}

function agreementOverlapsRangeTR(ag, s, e) {
  const sYmd = ymdFromDateOnlyUTC(dateOnlyTR(s));
  const eYmd = ymdFromDateOnlyUTC(dateOnlyTR(e));
  const endPlus = addDaysTR(eYmd, 1);

  for (let ymd = sYmd; ymd <= endPlus; ymd = addDaysTR(ymd, 1)) {
    const ints = intervalsForDayTR(ag, ymd);
    for (const [as, ae] of ints) {
      if (overlaps(as, ae, s, e)) return true;
    }
  }
  return false;
}

function mkAgreementConflict(kind, agreement) {
  if (!agreement) return null;
  if (kind === "driver") {
    return {
      code: "AGREEMENT_DRIVER_CONFLICT",
      message: "Driver aynı zaman penceresinde başka bir anlaşmada rezerve.",
      conflictingAgreement: { id: agreement.id },
    };
  }
  return {
    code: "AGREEMENT_VEHICLE_CONFLICT",
    message: "Araç aynı zaman penceresinde başka bir anlaşmada rezerve.",
    conflictingAgreement: { id: agreement.id },
  };
}

export async function findAgreementConflictsForRangeBatch({ vehicleIds = [], driverIds = [], startAt, endAt }) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const s0 = dateOnlyTR(s);
  const e0 = dateOnlyTR(e);

  const vSet = new Set((vehicleIds || []).map((x) => Number(x)).filter((x) => x > 0));
  const dSet = new Set((driverIds || []).map((x) => Number(x)).filter((x) => x > 0));

  if (!vSet.size && !dSet.size) {
    return { vehicleConflictById: new Map(), driverConflictById: new Map() };
  }

  // coarse candidate filter
  const where = {
    status: { in: ["APPROVED", "ACTIVE"] },
    startDate: { lte: e0 },
    endDate: { gte: s0 },
    OR: [
      ...(vSet.size ? [{ vehicleId: { in: Array.from(vSet) } }] : []),
      ...(dSet.size ? [{ driverId: { in: Array.from(dSet) } }] : []),
    ],
  };

  const candidates = await prisma.agreement.findMany({
    where,
    select: {
      id: true,
      vehicleId: true,
      driverId: true,
      startDate: true,
      endDate: true,
      weekMask: true,
      startMin: true,
      endMin: true,
      status: true,
    },
    orderBy: { id: "asc" },
  });

  const vehicleConflictById = new Map();
  const driverConflictById = new Map();

  // deterministic: first conflict wins (id asc)
  for (const ag of candidates) {
    if (!agreementOverlapsRangeTR(ag, s, e)) continue;

    const vId = Number(ag.vehicleId || 0);
    if (vId && vSet.has(vId) && !vehicleConflictById.has(vId)) {
      vehicleConflictById.set(vId, mkAgreementConflict("vehicle", ag));
    }

    const dId = Number(ag.driverId || 0);
    if (dId && dSet.has(dId) && !driverConflictById.has(dId)) {
      driverConflictById.set(dId, mkAgreementConflict("driver", ag));
    }

    // short-circuit if we already have all
    if (vehicleConflictById.size >= vSet.size && driverConflictById.size >= dSet.size) break;
  }

  return { vehicleConflictById, driverConflictById };
}
