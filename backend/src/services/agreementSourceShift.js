import { prisma } from "../prisma.js";

const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

function trMinutes(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + TR_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

async function loadShiftPayload(shiftId) {
  const id = Number(shiftId || 0);
  if (id <= 0) return null;
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      room: true,
      agreement: true,
      organizationPlan: {
        include: {
          stops: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!shift) return null;
  const [stops, people, assignments] = await Promise.all([
    prisma.stop.findMany({ where: { shiftId: id }, orderBy: { order: "asc" } }),
    prisma.shiftPersonel.findMany({ where: { shiftId: id }, select: { personelId: true, note: true } }),
    prisma.stopAssignment.findMany({ where: { shiftId: id }, select: { stopId: true, personelId: true, walkM: true } }),
  ]);
  return { shift, stops, people, assignments };
}

function scoreCandidate(candidate, agreement) {
  let score = 0;
  if (Number(candidate.startMin) === Number(agreement.startMin)) score += 40;
  if (Number(candidate.endMin) === Number(agreement.endMin)) score += 40;
  if (String(candidate.direction || "") === String(agreement.direction || "")) score += 20;
  if (String(candidate.pattern || "") === String(agreement.pattern || "")) score += 20;
  if (candidate.routeSnapshotValidatedAt) score += 25;
  if (Number(candidate.stopCount || 0) > 0) score += 25;
  if (Number(candidate.planStopCount || 0) > 0) score += 15;
  if (agreement.createdAt && candidate.createdAt) {
    const diffHours = Math.abs(new Date(candidate.createdAt).getTime() - new Date(agreement.createdAt).getTime()) / (60 * 60 * 1000);
    score += Math.max(0, 24 - Math.min(diffHours, 24));
    if (new Date(candidate.createdAt).getTime() <= new Date(agreement.createdAt).getTime()) score += 10;
  }
  return score;
}

async function inferAgreementSourceShiftId(agreement) {
  if (!agreement?.companyId || !agreement?.roomId) return null;
  const candidates = await prisma.shift.findMany({
    where: {
      companyId: agreement.companyId,
      roomId: agreement.roomId,
      agreementId: null,
      direction: agreement.direction ?? undefined,
      pattern: agreement.pattern ?? undefined,
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      createdAt: true,
      direction: true,
      pattern: true,
      routeSnapshotValidatedAt: true,
      _count: { select: { stops: true } },
      organizationPlan: { select: { stops: { select: { id: true }, take: 1, orderBy: { order: "asc" } } } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });

  const normalized = candidates.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    direction: c.direction,
    pattern: c.pattern,
    routeSnapshotValidatedAt: c.routeSnapshotValidatedAt,
    startMin: trMinutes(c.startAt),
    endMin: trMinutes(c.endAt),
    stopCount: Number(c?._count?.stops || 0),
    planStopCount: Array.isArray(c?.organizationPlan?.stops) ? c.organizationPlan.stops.length : 0,
  }));

  if (!normalized.length) return null;
  normalized.sort((a, b) => scoreCandidate(b, agreement) - scoreCandidate(a, agreement));
  return Number(normalized[0]?.id || 0) || null;
}

export async function resolveAgreementSourceShiftPayload(agreementId) {
  const aid = Number(agreementId || 0);
  if (aid <= 0) return null;
  const agreement = await prisma.agreement.findUnique({
    where: { id: aid },
    select: {
      id: true,
      companyId: true,
      roomId: true,
      startMin: true,
      endMin: true,
      direction: true,
      pattern: true,
      createdAt: true,
    },
  });
  if (!agreement) return null;

  const source = await prisma.commercialSource.findFirst({
    where: { agreementId: aid, shiftRootId: { not: null } },
    select: { shiftRootId: true },
    orderBy: { id: "asc" },
  });
  const directId = Number(source?.shiftRootId || 0);
  if (directId > 0) return loadShiftPayload(directId);

  const inferredId = await inferAgreementSourceShiftId(agreement);
  if (!inferredId) return null;
  return loadShiftPayload(inferredId);
}

export async function resolveAgreementSourceShiftId(agreementId) {
  const payload = await resolveAgreementSourceShiftPayload(agreementId);
  return Number(payload?.shift?.id || 0) || null;
}
