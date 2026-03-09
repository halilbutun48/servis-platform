// backend/src/services/shiftConflictBatch.js
// ✅ M20: batch shift conflict lookup for a time range
// Deterministic: choose the earliest conflicting shift by startAt ASC then id ASC.

import { prisma } from "../prisma.js";

export async function findShiftConflictsForRangeBatch({
  vehicleIds = [],
  driverIds = [],
  startAt,
  endAt,
  excludeShiftId,
}) {
  const vSet = new Set((vehicleIds || []).map((x) => Number(x)).filter((x) => x > 0));
  const dSet = new Set((driverIds || []).map((x) => Number(x)).filter((x) => x > 0));

  if (!vSet.size && !dSet.size) {
    return { vehicleConflictById: new Map(), driverConflictById: new Map() };
  }

  // overlap: [aStart,aEnd) intersects [bStart,bEnd)
  const where = {
    status: { in: ["APPROVED", "ACTIVE"] },
    startAt: { lt: new Date(endAt) },
    endAt: { gt: new Date(startAt) },
    ...(excludeShiftId ? { id: { not: Number(excludeShiftId) } } : {}),
    OR: [
      ...(vSet.size ? [{ vehicleId: { in: Array.from(vSet) } }] : []),
      ...(dSet.size ? [{ driverId: { in: Array.from(dSet) } }] : []),
    ],
  };

  const shifts = await prisma.shift.findMany({
    where,
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      vehicleId: true,
      driverId: true,
      roomId: true,
      companyId: true,
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
  });

  const vehicleConflictById = new Map();
  const driverConflictById = new Map();

  for (const s of shifts) {
    const vId = Number(s.vehicleId || 0);
    if (vId && vSet.has(vId) && !vehicleConflictById.has(vId)) {
      vehicleConflictById.set(vId, {
        code: "VEHICLE_CONFLICT",
        message: "Araç aynı zaman aralığında başka bir vardiyada.",
        conflictingShift: s,
      });
    }

    const dId = Number(s.driverId || 0);
    if (dId && dSet.has(dId) && !driverConflictById.has(dId)) {
      driverConflictById.set(dId, {
        code: "DRIVER_CONFLICT",
        message: "Driver aynı zaman aralığında başka bir vardiyada.",
        conflictingShift: s,
      });
    }

    if (vehicleConflictById.size >= vSet.size && driverConflictById.size >= dSet.size) break;
  }

  return { vehicleConflictById, driverConflictById };
}
