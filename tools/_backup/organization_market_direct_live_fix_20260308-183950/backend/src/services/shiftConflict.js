// backend/src/services/shiftConflict.js
import { prisma } from "../prisma.js";

// Time overlap: [aStart, aEnd) intersects [bStart, bEnd)
// => aStart < bEnd && aEnd > bStart
export async function checkShiftConflicts({ driverId, vehicleId, startAt, endAt, excludeShiftId }) {
  const baseWhere = {
    status: { in: ["APPROVED", "ACTIVE"] },
    startAt: { lt: new Date(endAt) },
    endAt: { gt: new Date(startAt) },
    ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
  };

  const out = {};

  if (driverId) {
    const c = await prisma.shift.findFirst({
      where: { ...baseWhere, driverId: Number(driverId) },
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
      orderBy: { startAt: "asc" },
    });
    if (c) out.driver = c;
  }

  if (vehicleId) {
    const c = await prisma.shift.findFirst({
      where: { ...baseWhere, vehicleId: Number(vehicleId) },
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
      orderBy: { startAt: "asc" },
    });
    if (c) out.vehicle = c;
  }

  return out; // { driver?: Shift, vehicle?: Shift }
}

export function conflictResponse(conflicts) {
  if (conflicts?.driver) {
    return {
      code: "DRIVER_CONFLICT",
      message: "Driver aynı zaman aralığında başka bir vardiyada.",
      conflictingShift: conflicts.driver,
    };
  }
  if (conflicts?.vehicle) {
    return {
      code: "VEHICLE_CONFLICT",
      message: "Araç aynı zaman aralığında başka bir vardiyada.",
      conflictingShift: conflicts.vehicle,
    };
  }
  return null;
}
