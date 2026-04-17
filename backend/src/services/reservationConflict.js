import { prisma } from "../prisma.js";
import {
  agreementConflictResponse,
  agreementIntersectsRange,
  agreementsOverlap,
  computeFinalEndAtUTC,
  computeFirstStartAtUTC,
  findAgreementConflictForApproval,
  findAgreementConflictForRange,
} from "./agreementConflict.js";
import { checkShiftConflicts, conflictResponse } from "./shiftConflict.js";

async function findShiftConflictForAgreementResource({ proposedAgreement, resourceField, resourceId, excludeAgreementId }) {
  if (!resourceId) return null;

  const firstStartAt = computeFirstStartAtUTC(proposedAgreement);
  const finalEndAt = computeFinalEndAtUTC(proposedAgreement);

  const candidates = await prisma.shift.findMany({
    where: {
      status: { in: ["APPROVED", "ACTIVE"] },
      [resourceField]: Number(resourceId),
      startAt: { lt: finalEndAt },
      endAt: { gt: firstStartAt },
      ...(excludeAgreementId
        ? {
            OR: [{ agreementId: null }, { agreementId: { not: Number(excludeAgreementId) } }],
          }
        : {}),
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      vehicleId: true,
      driverId: true,
      roomId: true,
      companyId: true,
      agreementId: true,
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
  });

  for (const shift of candidates) {
    if (agreementIntersectsRange(proposedAgreement, shift.startAt, shift.endAt)) {
      return shift;
    }
  }
  return null;
}

export async function findReservationConflictForRange({ driverId, vehicleId, startAt, endAt, excludeShiftId }) {
  if (driverId) {
    const agDriver = await findAgreementConflictForRange({ driverId, startAt, endAt });
    if (agDriver) return agreementConflictResponse({ kind: "driver", agreement: agDriver });
  }

  if (vehicleId) {
    const agVehicle = await findAgreementConflictForRange({ vehicleId, startAt, endAt });
    if (agVehicle) return agreementConflictResponse({ kind: "vehicle", agreement: agVehicle });
  }

  const shiftConflict = conflictResponse(
    await checkShiftConflicts({ driverId, vehicleId, startAt, endAt, excludeShiftId })
  );
  return shiftConflict || null;
}

export async function findReservationConflictForAgreement({
  agreementId,
  vehicleId,
  driverId,
  startDate,
  endDate,
  weekMask,
  startMin,
  endMin,
}) {
  const proposedAgreement = {
    id: agreementId ?? null,
    vehicleId: vehicleId ?? null,
    driverId: driverId ?? null,
    startDate,
    endDate,
    weekMask,
    startMin,
    endMin,
  };

  const agreementCandidates = await findAgreementConflictForApproval({
    agreementId,
    vehicleId: vehicleId ?? undefined,
    driverId: driverId ?? undefined,
  });

  for (const candidate of agreementCandidates) {
    if (driverId && Number(candidate.driverId || 0) === Number(driverId) && agreementsOverlap(proposedAgreement, candidate)) {
      return agreementConflictResponse({ kind: "driver", agreement: candidate });
    }
  }

  for (const candidate of agreementCandidates) {
    if (vehicleId && Number(candidate.vehicleId || 0) === Number(vehicleId) && agreementsOverlap(proposedAgreement, candidate)) {
      return agreementConflictResponse({ kind: "vehicle", agreement: candidate });
    }
  }

  if (driverId) {
    const driverShift = await findShiftConflictForAgreementResource({
      proposedAgreement,
      resourceField: "driverId",
      resourceId: driverId,
      excludeAgreementId: agreementId,
    });
    if (driverShift) {
      return conflictResponse({ driver: driverShift });
    }
  }

  if (vehicleId) {
    const vehicleShift = await findShiftConflictForAgreementResource({
      proposedAgreement,
      resourceField: "vehicleId",
      resourceId: vehicleId,
      excludeAgreementId: agreementId,
    });
    if (vehicleShift) {
      return conflictResponse({ vehicle: vehicleShift });
    }
  }

  return null;
}
