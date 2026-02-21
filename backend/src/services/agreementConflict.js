// backend/src/services/agreementConflict.js
import { prisma } from "../prisma.js";

// Bitmask: Mon=1 Tue=2 Wed=4 Thu=8 Fri=16 Sat=32 Sun=64
export function dowMaskUTC(d) {
  // JS: 0=Sun ... 6=Sat
  const dow = d.getUTCDay();
  if (dow === 0) return 64;
  return 1 << (dow - 1);
}

function dateOnlyUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDaysUTC(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function minutesToDtUTC(day0, min) {
  return new Date(day0.getTime() + min * 60_000);
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function intervalsForDay(ag, day0) {
  // week gate: only the "start day" is masked (night shift spills to next day)
  const mask = dowMaskUTC(day0);
  if ((ag.weekMask & mask) === 0) return [];

  const start = minutesToDtUTC(day0, ag.startMin);
  if (ag.endMin >= ag.startMin) {
    const end = minutesToDtUTC(day0, ag.endMin);
    return [[start, end]];
  }

  // midnight cross: [start..24:00) + [00:00..endMin) next day
  const end1 = minutesToDtUTC(day0, 1440);
  const next0 = addDaysUTC(day0, 1);
  const start2 = minutesToDtUTC(next0, 0);
  const end2 = minutesToDtUTC(next0, ag.endMin);
  return [
    [start, end1],
    [start2, end2],
  ];
}

export function computeFinalEndAtUTC(ag) {
  // endDate at 00:00Z
  const end0 = dateOnlyUTC(new Date(ag.endDate));
  const base = minutesToDtUTC(end0, ag.endMin);
  // if midnight-cross, last window ends on next day
  if (ag.endMin < ag.startMin) return addDaysUTC(base, 1);
  return base;
}

export function computeFirstStartAtUTC(ag) {
  const start0 = dateOnlyUTC(new Date(ag.startDate));
  return minutesToDtUTC(start0, ag.startMin);
}

export function agreementsOverlap(a, b) {
  // iterate small range: overlap of date ranges (+1 day for midnight spill)
  const aStart = dateOnlyUTC(new Date(a.startDate));
  const aEnd = dateOnlyUTC(new Date(a.endDate));
  const bStart = dateOnlyUTC(new Date(b.startDate));
  const bEnd = dateOnlyUTC(new Date(b.endDate));

  let start = aStart > bStart ? aStart : bStart;
  let end = aEnd < bEnd ? aEnd : bEnd;

  // allow 1 extra day because of midnight spill
  end = addDaysUTC(end, 1);

  for (let day = start; day <= end; day = addDaysUTC(day, 1)) {
    const ia = intervalsForDay(a, day);
    const ib = intervalsForDay(b, day);
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
    OR: [
      ...(vehicleId ? [{ vehicleId }] : []),
      ...(driverId ? [{ driverId }] : []),
    ],
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
  const s0 = dateOnlyUTC(s);
  const e0 = dateOnlyUTC(e);

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

  // check precise overlap
  for (const ag of candidates) {
    // iterate days in [s0..e0] + 1 for midnight
    for (let day = s0; day <= addDaysUTC(e0, 1); day = addDaysUTC(day, 1)) {
      const ints = intervalsForDay(ag, day);
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