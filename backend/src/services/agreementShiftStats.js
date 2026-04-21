import { prisma } from "../prisma.js";
import { addDaysTR, atTR, ymdTR } from "../time/tr.js";

function normalizeAgreementIds(agreementIds = []) {
  return Array.from(
    new Set(
      (Array.isArray(agreementIds) ? agreementIds : [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );
}

function buildShiftScope({ agreementIds, companyId, roomId }) {
  const scope = { agreementId: { in: normalizeAgreementIds(agreementIds) } };
  if (companyId != null) scope.companyId = companyId;
  if (roomId != null) scope.roomId = roomId;
  return scope;
}

function createEmptyStats() {
  return { todayTotal: 0, todayDone: 0, horizonOpen: 0 };
}

function upsertCount(byId, rows = [], field) {
  for (const row of rows || []) {
    const agreementId = Number(row?.agreementId || 0);
    if (!agreementId) continue;
    if (!byId[agreementId]) byId[agreementId] = createEmptyStats();
    byId[agreementId][field] = Number(row?._count?._all ?? 0);
  }
}

export async function buildAgreementShiftStats({
  agreementIds = [],
  horizonDays = 7,
  companyId = null,
  roomId = null,
} = {}) {
  const ids = normalizeAgreementIds(agreementIds);
  if (!ids.length) return { byId: {}, meta: { horizonDays } };

  const now = new Date();
  const todayYmd = ymdTR(now);
  const todayStart = atTR(todayYmd, 0);
  const tomorrowStart = atTR(addDaysTR(todayYmd, 1), 0);
  const horizonEnd = atTR(addDaysTR(todayYmd, horizonDays), 0);

  const scope = buildShiftScope({ agreementIds: ids, companyId, roomId });
  const todayWhere = { ...scope, startAt: { gte: todayStart, lt: tomorrowStart }, status: { not: "DRAFT" } };
  const horizonWhere = { ...scope, startAt: { gte: now, lt: horizonEnd }, status: { in: ["APPROVED", "ACTIVE"] } };

  const [todayTotal, todayDone, horizonOpen] = await Promise.all([
    prisma.shift.groupBy({ by: ["agreementId"], where: todayWhere, _count: { _all: true } }),
    prisma.shift.groupBy({ by: ["agreementId"], where: { ...todayWhere, status: "DONE" }, _count: { _all: true } }),
    prisma.shift.groupBy({ by: ["agreementId"], where: horizonWhere, _count: { _all: true } }),
  ]);

  const byId = Object.create(null);
  for (const agreementId of ids) byId[agreementId] = createEmptyStats();

  upsertCount(byId, todayTotal, "todayTotal");
  upsertCount(byId, todayDone, "todayDone");
  upsertCount(byId, horizonOpen, "horizonOpen");

  return {
    byId,
    meta: { todayStart, tomorrowStart, horizonEnd, horizonDays },
  };
}
