import prisma from "../prisma.js";

function minuteBounds(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  d.setSeconds(0, 0);
  const end = new Date(d.getTime() + 60_000);
  return { start: d, end };
}

export async function findPackageShiftRowsBySeed(seedShift, { roomId = undefined } = {}) {
  const companyId = Number(seedShift?.companyId || 0);
  if (!companyId) return [];
  const bounds = minuteBounds(seedShift?.createdAt);
  if (!bounds) return [];
  const where = {
    companyId,
    createdAt: { gte: bounds.start, lt: bounds.end },
  };
  if (roomId !== undefined) {
    where.roomId = roomId == null ? null : Number(roomId);
  }
  return prisma.shift.findMany({
    where,
    select: {
      id: true,
      companyId: true,
      roomId: true,
      createdAt: true,
      status: true,
      startAt: true,
      endAt: true,
      agreementId: true,
      vehicleId: true,
      driverId: true,
      roomOfferDecision: true,
    },
    orderBy: [{ id: 'asc' }],
  });
}

export async function findPackageShiftRowsByShiftId(shiftId, opts = {}) {
  const sid = Number(shiftId || 0);
  if (!sid) return [];
  const seed = await prisma.shift.findUnique({
    where: { id: sid },
    select: { id: true, companyId: true, roomId: true, createdAt: true },
  });
  if (!seed) return [];
  return findPackageShiftRowsBySeed(seed, opts);
}

export async function findPackageShiftIdsByShiftId(shiftId, opts = {}) {
  const rows = await findPackageShiftRowsByShiftId(shiftId, opts);
  return rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0);
}
