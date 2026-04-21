import prisma from "../prisma.js";
import { addDaysTR, atTR, dateOnlyUTCFromYmd, dayBitTRFromYmd, ymdTR } from "../time/tr.js";

function overlapsTR(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function intervalsForDayTR(ag, ymd) {
  const mask = dayBitTRFromYmd(ymd);
  if ((Number(ag.weekMask || 0) & mask) === 0) return [];

  const startMin = Number(ag.startMin || 0);
  const endMin = Number(ag.endMin || 0);
  const start = atTR(ymd, startMin);

  if (endMin >= startMin) {
    return [[start, atTR(ymd, endMin)]];
  }

  const nextYmd = addDaysTR(ymd, 1);
  const midnightNext = atTR(nextYmd, 0);
  return [
    [start, midnightNext],
    [midnightNext, atTR(nextYmd, endMin)],
  ];
}

function agreementOverlapsRangeTR(ag, s, e) {
  const startYmd = ymdTR(s);
  const endYmd = ymdTR(e);
  const horizonEnd = addDaysTR(endYmd, 1);
  for (let cur = startYmd; cur <= horizonEnd; cur = addDaysTR(cur, 1)) {
    const ints = intervalsForDayTR(ag, cur);
    for (const [as, ae] of ints) {
      if (overlapsTR(as, ae, s, e)) return true;
    }
  }
  return false;
}

export async function findAgreementBlockedRoomIdsForShift({ companyId, roomIds, startAt, endAt }) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const startYmd = ymdTR(s);
  const endYmd = ymdTR(e);

  const candidates = await prisma.agreement.findMany({
    where: {
      companyId,
      roomId: { in: roomIds },
      status: { in: ["APPROVED", "ACTIVE"] },
      startDate: { lte: dateOnlyUTCFromYmd(endYmd) },
      endDate: { gte: dateOnlyUTCFromYmd(startYmd) },
    },
    select: {
      id: true,
      roomId: true,
      startDate: true,
      endDate: true,
      weekMask: true,
      startMin: true,
      endMin: true,
      status: true,
    },
    orderBy: { id: "asc" },
  });

  const blocked = new Set();
  for (const ag of candidates) {
    if (agreementOverlapsRangeTR(ag, s, e)) blocked.add(Number(ag.roomId));
  }
  return blocked;
}
