// backend/src/services/agreementConflict.js
// Agreement schedule semantics are TR-local (UTC+03:00). All calculations below
// convert TR-local (date + minutes) into absolute UTC timestamps for storage
// and comparisons.

import { prisma } from "../prisma.js";
import { addDaysTR, dayBitTRFromYmd, dateOnlyTR, ymdTR } from "../time/tr.js";

// Bitmask: Mon=1 Tue=2 Wed=4 Thu=8 Fri=16 Sat=32 Sun=64
export function dowMaskUTC(d) {
  // Back-compat name: returns TR day-of-week mask for the given Date.
  return dayBitTRFromYmd(ymdTR(d));
}

function ymdFromDateOnlyUTC(d) {
  return ymdTR(d);
}

function minutesToDtTR(ymd, min) {
  const base = new Date(`${ymd}T00:00:00.000+03:00`);
  return new Date(base.getTime() + Number(min || 0) * 60_000);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function intervalsForDayTR(ag, ymd) {
  // week gate: only the "start day" is masked (night shift spills to next day)
  const mask = dayBitTRFromYmd(ymd);
  if ((Number(ag.weekMask || 0) & mask) === 0) return [];

  const startMin = Number(ag.startMin || 0);
  const endMin = Number(ag.endMin || 0);
  const start = minutesToDtTR(ymd, startMin);

  if (endMin >= startMin) {
    const end = minutesToDtTR(ymd, endMin);
    return [[start, end]];
  }

  // midnight cross: [start..24:00) + [00:00..endMin) next day
  const end1 = minutesToDtTR(ymd, 1440);
  const nextYmd = addDaysTR(ymd, 1);
  const start2 = minutesToDtTR(nextYmd, 0);
  const end2 = minutesToDtTR(nextYmd, endMin);
  return [
    [start, end1],
    [start2, end2],
  ];
}

export function computeFinalEndAtUTC(ag) {
  const endYmd = ymdFromDateOnlyUTC(ag.endDate);
  const startMin = Number(ag.startMin || 0);
  const endMin = Number(ag.endMin || 0);

  // endDate + endMin in TR
  const base = minutesToDtTR(endYmd, endMin);
  // if midnight-cross, last window ends on next day
  if (endMin < startMin) {
    const nextYmd = addDaysTR(endYmd, 1);
    return minutesToDtTR(nextYmd, endMin);
  }
  return base;
}

export function computeFirstStartAtUTC(ag) {
  const startYmd = ymdFromDateOnlyUTC(ag.startDate);
  return minutesToDtTR(startYmd, Number(ag.startMin || 0));
}

export function agreementsOverlap(a, b) {
  // iterate small range: overlap of date ranges (+1 day for midnight spill)
  const aStart = ymdFromDateOnlyUTC(a.startDate);
  const aEnd = ymdFromDateOnlyUTC(a.endDate);
  const bStart = ymdFromDateOnlyUTC(b.startDate);
  const bEnd = ymdFromDateOnlyUTC(b.endDate);

  let start = aStart > bStart ? aStart : bStart;
  let end = aEnd < bEnd ? aEnd : bEnd;

  if (end < start) return false;

  // allow 1 extra day because of midnight spill
  end = addDaysTR(end, 1);

  for (let ymd = start; ymd <= end; ymd = addDaysTR(ymd, 1)) {
    const ia = intervalsForDayTR(a, ymd);
    const ib = intervalsForDayTR(b, ymd);
    for (const [as, ae] of ia) {
      for (const [bs, be] of ib) {
        if (overlaps(as, ae, bs, be)) return true;
      }
    }
  }
  return false;
}

export async function findAgreementConflictForApproval({ agreementId, vehicleId, driverId }) {
  const where = {
    id: { not: agreementId },
    status: { in: ["APPROVED", "ACTIVE"] },
    OR: [...(vehicleId ? [{ vehicleId }] : []), ...(driverId ? [{ driverId }] : [])],
  };

  const candidates = await prisma.agreement.findMany({
    where,
    select: {
      id: true,
      companyId: true,
      roomId: true,
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

  return candidates;
}

export async function findAgreementConflictForRange({ vehicleId, driverId, startAt, endAt }) {
  const s = new Date(startAt);
  const e = new Date(endAt);

  // TR-day date-only for coarse filter (important before 03:00TR)
  const s0 = dateOnlyTR(s);
  const e0 = dateOnlyTR(e);

  const where = {
    status: { in: ["APPROVED", "ACTIVE"] },
    ...(vehicleId ? { vehicleId } : {}),
    ...(driverId ? { driverId } : {}),
    // date range coarse filter
    startDate: { lte: e0 },
    endDate: { gte: s0 },
  };

  const candidates = await prisma.agreement.findMany({
    where,
    select: {
      id: true,
      companyId: true,
      roomId: true,
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

  // precise overlap
  const sYmd = ymdFromDateOnlyUTC(dateOnlyTR(s));
  const eYmd = ymdFromDateOnlyUTC(dateOnlyTR(e));
  const endPlus = addDaysTR(eYmd, 1);

  for (const ag of candidates) {
    for (let ymd = sYmd; ymd <= endPlus; ymd = addDaysTR(ymd, 1)) {
      const ints = intervalsForDayTR(ag, ymd);
      for (const [as, ae] of ints) {
        if (overlaps(as, ae, s, e)) return ag;
      }
    }
  }
  return null;
}

export function agreementConflictResponse({ kind, agreement }) {
  if (!agreement) return null;
  if (kind === "driver") {
    return {
      code: "AGREEMENT_DRIVER_CONFLICT",
      message: "Driver aynı zaman penceresinde başka bir anlaşmada rezerve.",
      conflictingAgreement: agreement,
    };
  }
  if (kind === "vehicle") {
    return {
      code: "AGREEMENT_VEHICLE_CONFLICT",
      message: "Araç aynı zaman penceresinde başka bir anlaşmada rezerve.",
      conflictingAgreement: agreement,
    };
  }
  return null;
}
