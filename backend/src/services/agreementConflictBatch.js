// backend/src/services/agreementConflictBatch.js
// ✅ M20: batch agreement conflict lookup for a time range
// Deterministic: return the first conflicting agreement by id ASC for each vehicle/driver.

import { prisma } from "../prisma.js";

// Bitmask: Mon=1 Tue=2 Wed=4 Thu=8 Fri=16 Sat=32 Sun=64
function dowMaskUTC(d) {
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

function agreementOverlapsRange(ag, s, e) {
  const s0 = dateOnlyUTC(s);
  const e0 = dateOnlyUTC(e);

  // iterate days in [s0..e0] + 1 for midnight spill
  for (let day = s0; day <= addDaysUTC(e0, 1); day = addDaysUTC(day, 1)) {
    const ints = intervalsForDay(ag, day);
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
  const s0 = dateOnlyUTC(s);
  const e0 = dateOnlyUTC(e);

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
    if (!agreementOverlapsRange(ag, s, e)) continue;

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
