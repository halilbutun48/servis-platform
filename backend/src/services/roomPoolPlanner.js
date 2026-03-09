import { prisma } from "../prisma.js";
import {
  findAgreementConflictsForRangeBatch,
} from "./agreementConflictBatch.js";
import { findShiftConflictsForRangeBatch } from "./shiftConflictBatch.js";

function toIntOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function slimShiftRef(s) {
  if (!s) return null;
  return {
    id: Number(s.id || 0) || null,
    startAt: s.startAt || null,
    endAt: s.endAt || null,
    status: s.status || null,
    roomId: Number(s.roomId || 0) || null,
    companyId: Number(s.companyId || 0) || null,
  };
}

function slimAgreementRef(a) {
  if (!a) return null;
  return { id: Number(a.id || 0) || null };
}

export async function getShiftDemandSnapshot(shiftIdRaw) {
  const shiftId = toIntOrNull(shiftIdRaw);
  if (!shiftId) {
    return {
      shiftId: null,
      roomId: null,
      assignmentCount: 0,
      peopleCount: 0,
      orgPassengerCount: 0,
      requiredPaxOverride: 0,
      requiredPax: 0,
    };
  }

  const [assignmentCount, peopleCount, shift] = await Promise.all([
    prisma.stopAssignment.count({ where: { shiftId } }).catch(() => 0),
    prisma.shiftPersonel.count({ where: { shiftId } }).catch(() => 0),
    prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, roomId: true, organizationPlanId: true, requiredPaxOverride: true },
    }).catch(() => null),
  ]);

  let orgPassengerCount = 0;
  if ((assignmentCount || 0) === 0 && (peopleCount || 0) === 0 && shift?.organizationPlanId) {
    const orgStops = await prisma.organizationStop.findMany({
      where: { planId: shift.organizationPlanId },
      select: { passengerCount: true },
    }).catch(() => []);
    orgPassengerCount = (orgStops || []).reduce(
      (sum, s) => sum + Math.max(0, Number(s?.passengerCount || 0)),
      0
    );
  }

  const requiredPaxOverride = Math.max(0, Number(shift?.requiredPaxOverride || 0));
  return {
    shiftId,
    roomId: shift?.roomId ?? null,
    assignmentCount: Number(assignmentCount || 0),
    peopleCount: Number(peopleCount || 0),
    orgPassengerCount: Number(orgPassengerCount || 0),
    requiredPaxOverride,
    requiredPax: Math.max(
      Number(assignmentCount || 0),
      Number(peopleCount || 0),
      Number(orgPassengerCount || 0),
      requiredPaxOverride,
      0
    ),
  };
}

export function buildCapacityConflict({ requiredPax, vehicleCapacity }) {
  const pax = Math.max(0, Number(requiredPax || 0));
  if (!pax) return null;

  const cap = Number(vehicleCapacity || 0);
  if (!cap) {
    return {
      code: "VEHICLE_CAPACITY_MISSING",
      message: `Araç kapasitesi tanımsız. Gerekli yolcu: ${pax}.`,
      requiredPax: pax,
      vehicleCapacity: 0,
      missingCapacity: pax,
      minVehicleCount: null,
    };
  }

  if (cap >= pax) return null;

  return {
    code: "CAPACITY_INSUFFICIENT",
    message: `Yetersiz kapasite. Gerekli: ${pax}, araç: ${cap}, eksik: ${Math.max(0, pax - cap)}.`,
    requiredPax: pax,
    vehicleCapacity: cap,
    missingCapacity: Math.max(0, pax - cap),
    minVehicleCount: Math.ceil(pax / cap),
  };
}

function compareChoice(a, b) {
  if (!a) return 1;
  if (!b) return -1;
  if (a.count !== b.count) return a.count - b.count;
  if (a.total !== b.total) return a.total - b.total;
  return 0;
}

export function pickBestVehicleCombo(vehicles = [], requiredPax = 0) {
  const rows = [...(vehicles || [])]
    .map((v) => ({ ...v, capacity: Math.max(0, Number(v?.capacity || 0)) }))
    .filter((v) => v.capacity > 0);
  const need = Math.max(0, Number(requiredPax || 0));
  if (!rows.length) {
    return { items: [], totalCapacity: 0, coversDemand: need === 0, missingCapacity: need, overflowCapacity: 0 };
  }
  if (need <= 0) {
    const first = [...rows].sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0))[0] || null;
    return {
      items: first ? [first] : [],
      totalCapacity: Number(first?.capacity || 0),
      coversDemand: !!first,
      missingCapacity: 0,
      overflowCapacity: 0,
    };
  }

  const totalCap = rows.reduce((sum, v) => sum + v.capacity, 0);
  if (totalCap < need) {
    const greedy = [...rows].sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
    return {
      items: greedy,
      totalCapacity: totalCap,
      coversDemand: false,
      missingCapacity: need - totalCap,
      overflowCapacity: 0,
    };
  }

  const bestBySum = Array(totalCap + 1).fill(null);
  bestBySum[0] = { count: 0, prevSum: -1, vehicleIndex: -1, total: 0 };

  for (let idx = 0; idx < rows.length; idx += 1) {
    const cap = rows[idx].capacity;
    for (let sum = totalCap - cap; sum >= 0; sum -= 1) {
      const prev = bestBySum[sum];
      if (!prev) continue;
      const nextSum = sum + cap;
      const candidate = { count: prev.count + 1, prevSum: sum, vehicleIndex: idx, total: nextSum };
      const existing = bestBySum[nextSum];
      if (!existing || compareChoice(candidate, existing) < 0) {
        bestBySum[nextSum] = candidate;
      }
    }
  }

  let bestSum = -1;
  let bestNode = null;
  for (let sum = need; sum <= totalCap; sum += 1) {
    const node = bestBySum[sum];
    if (!node) continue;
    if (!bestNode || compareChoice(node, bestNode) < 0) {
      bestNode = node;
      bestSum = sum;
    }
  }

  if (!bestNode || bestSum < 0) {
    const greedy = [...rows].sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
    return {
      items: greedy,
      totalCapacity: totalCap,
      coversDemand: totalCap >= need,
      missingCapacity: Math.max(0, need - totalCap),
      overflowCapacity: Math.max(0, totalCap - need),
    };
  }

  const pickedIdx = [];
  let cursor = bestNode;
  while (cursor && cursor.vehicleIndex >= 0) {
    pickedIdx.push(cursor.vehicleIndex);
    cursor = bestBySum[cursor.prevSum];
  }

  const items = pickedIdx
    .reverse()
    .map((idx) => rows[idx])
    .sort((a, b) => {
      const capDiff = Number(b.capacity || 0) - Number(a.capacity || 0);
      if (capDiff) return capDiff;
      return String(a.plate || "").localeCompare(String(b.plate || ""));
    });

  return {
    items,
    totalCapacity: bestSum,
    coversDemand: bestSum >= need,
    missingCapacity: Math.max(0, need - bestSum),
    overflowCapacity: Math.max(0, bestSum - need),
  };
}

export function distributePaxAcrossCombo(requiredPax = 0, comboItems = []) {
  let remaining = Math.max(0, Number(requiredPax || 0));
  return (comboItems || []).map((item, idx) => {
    const capacity = Math.max(0, Number(item?.capacity || 0));
    const allocatedPax = remaining > 0 ? Math.min(capacity, remaining) : 0;
    remaining = Math.max(0, remaining - allocatedPax);
    return {
      ...item,
      splitIndex: idx + 1,
      allocatedPax,
      remainingAfter: remaining,
    };
  });
}

export async function buildRoomPoolSummary({ shiftId }) {
  const sid = toIntOrNull(shiftId);
  if (!sid) {
    const err = new Error("shiftId required");
    err.status = 400;
    throw err;
  }

  const shift = await prisma.shift.findUnique({
    where: { id: sid },
    select: {
      id: true,
      roomId: true,
      companyId: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });

  if (!shift) {
    const err = new Error("Shift not found");
    err.status = 404;
    throw err;
  }
  if (!shift.roomId) {
    const err = new Error("Shift has no roomId");
    err.status = 400;
    throw err;
  }

  const demand = await getShiftDemandSnapshot(shift.id);

  const [roomVehicles, roomDrivers] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        roomId: Number(shift.roomId),
        archivedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        plate: true,
        capacity: true,
        status: true,
        driverId: true,
        type: true,
        brand: true,
        model: true,
        modelYear: true,
      },
      orderBy: [{ capacity: "desc" }, { plate: "asc" }],
    }),
    prisma.driver.findMany({
      where: { roomId: Number(shift.roomId) },
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const vehicleIds = roomVehicles.map((v) => Number(v.id)).filter((x) => x > 0);
  const driverIds = roomDrivers.map((d) => Number(d.id)).filter((x) => x > 0);

  const [agRes, shiftRes] = await Promise.all([
    findAgreementConflictsForRangeBatch({
      vehicleIds,
      driverIds,
      startAt: shift.startAt,
      endAt: shift.endAt,
    }),
    findShiftConflictsForRangeBatch({
      vehicleIds,
      driverIds,
      startAt: shift.startAt,
      endAt: shift.endAt,
      excludeShiftId: shift.id,
    }),
  ]);

  const driverRows = roomDrivers.map((d) => {
    const driverId = Number(d.id);
    const agConflict = agRes?.driverConflictById?.get?.(driverId) || null;
    const shiftConflict = shiftRes?.driverConflictById?.get?.(driverId) || null;
    const conflict = agConflict || shiftConflict || null;
    return {
      id: driverId,
      fullName: d.fullName || `#${driverId}`,
      phone: d.phone || null,
      driverOk: !conflict,
      driverConflict: conflict
        ? {
            code: conflict.code || null,
            message: conflict.message || null,
            conflictingShift: slimShiftRef(conflict.conflictingShift),
            conflictingAgreement: slimAgreementRef(conflict.conflictingAgreement),
          }
        : null,
    };
  });

  const freeDrivers = driverRows.filter((d) => d.driverOk);
  const freeDriverById = new Map(freeDrivers.map((d) => [Number(d.id), d]));
  const usedDriverIds = new Set();

  const vehicleRows = roomVehicles.map((v) => {
    const vehicleId = Number(v.id);
    const capacity = Math.max(0, Number(v.capacity || 0));
    const capConflict = buildCapacityConflict({
      requiredPax: demand?.requiredPax ?? 0,
      vehicleCapacity: capacity,
    });
    const agConflict = agRes?.vehicleConflictById?.get?.(vehicleId) || null;
    const shiftConflict = shiftRes?.vehicleConflictById?.get?.(vehicleId) || null;
    const availabilityConflict = agConflict || shiftConflict || null;

    let suggestedDriver = null;
    if (!availabilityConflict) {
      const preferredId = Number(v.driverId || 0) || null;
      if (preferredId && freeDriverById.has(preferredId) && !usedDriverIds.has(preferredId)) {
        suggestedDriver = freeDriverById.get(preferredId);
        usedDriverIds.add(preferredId);
      } else {
        const fallback = freeDrivers.find((d) => !usedDriverIds.has(Number(d.id)));
        if (fallback) {
          suggestedDriver = fallback;
          usedDriverIds.add(Number(fallback.id));
        }
      }
    }

    return {
      id: vehicleId,
      plate: v.plate || `#${vehicleId}`,
      capacity,
      status: v.status || null,
      driverId: Number(v.driverId || 0) || null,
      type: v.type || null,
      brand: v.brand || null,
      model: v.model || null,
      modelYear: Number(v.modelYear || 0) || null,
      vehicleOk: !availabilityConflict,
      vehicleConflict: availabilityConflict
        ? {
            code: availabilityConflict?.code || null,
            message: availabilityConflict?.message || null,
            conflictingShift: slimShiftRef(availabilityConflict?.conflictingShift),
            conflictingAgreement: slimAgreementRef(availabilityConflict?.conflictingAgreement),
          }
        : null,
      capacityOk: !capConflict,
      capacityConflict: capConflict
        ? {
            code: capConflict.code,
            message: capConflict.message,
            requiredPax: capConflict.requiredPax,
            vehicleCapacity: capConflict.vehicleCapacity,
            missingCapacity: capConflict.missingCapacity,
            minVehicleCount: capConflict.minVehicleCount,
          }
        : null,
      suggestedDriver: suggestedDriver
        ? { id: Number(suggestedDriver.id), fullName: suggestedDriver.fullName || `#${suggestedDriver.id}` }
        : null,
      pairOk: !availabilityConflict && !!suggestedDriver,
    };
  });

  const usableVehicles = vehicleRows.filter((v) => v.pairOk && Number(v.capacity || 0) > 0);
  const availableVehicles = vehicleRows.filter((v) => v.vehicleOk && Number(v.capacity || 0) > 0);
  const combo = pickBestVehicleCombo(usableVehicles, demand?.requiredPax ?? 0);
  const allocationPlan = distributePaxAcrossCombo(demand?.requiredPax ?? 0, combo.items);
  const vehicleOnlyCombo = pickBestVehicleCombo(availableVehicles, demand?.requiredPax ?? 0);
  const vehicleOnlyAllocationPlan = distributePaxAcrossCombo(demand?.requiredPax ?? 0, vehicleOnlyCombo.items);
  const totalVehicleCapacity = availableVehicles.reduce((sum, v) => sum + Math.max(0, Number(v.capacity || 0)), 0);
  const totalPairCapacity = usableVehicles.reduce((sum, v) => sum + Math.max(0, Number(v.capacity || 0)), 0);
  const enoughVehicleCapacity = vehicleOnlyCombo.coversDemand;
  const enoughPoolCapacity = combo.coversDemand;
  const driverNeedForCapacity = Number(vehicleOnlyCombo?.items?.length || 0);
  const driverShortageCount = enoughVehicleCapacity
    ? Math.max(0, driverNeedForCapacity - Number(freeDrivers.length || 0))
    : 0;
  const blockedDrivers = driverRows
    .filter((d) => !d.driverOk)
    .map((d) => ({
      id: Number(d.id),
      fullName: d.fullName || `#${d.id}`,
      phone: d.phone || null,
      reasonCode: d.driverConflict?.code || null,
      reasonMessage: d.driverConflict?.message || null,
      conflictingShift: d.driverConflict?.conflictingShift || null,
      conflictingAgreement: d.driverConflict?.conflictingAgreement || null,
    }));

  let limitingReason = "OK";
  if (!enoughPoolCapacity) {
    if (enoughVehicleCapacity) limitingReason = "DRIVER_SHORTAGE";
    else if (totalVehicleCapacity > 0) limitingReason = "VEHICLE_CAPACITY";
    else limitingReason = "NO_AVAILABLE_PAIR";
  }

  return {
    ok: true,
    shiftId: Number(shift.id),
    roomId: Number(shift.roomId),
    companyId: Number(shift.companyId || 0) || null,
    startAt: shift.startAt,
    endAt: shift.endAt,
    requiredPax: demand?.requiredPax ?? 0,
    roomVehicleCount: vehicleRows.length,
    availableVehicleCount: availableVehicles.length,
    pairableVehicleCount: usableVehicles.length,
    freeDriverCount: freeDrivers.length,
    totalVehicleCapacity,
    totalPairCapacity,
    enoughSingleVehicle: vehicleRows.some((v) => v.vehicleOk && v.capacityOk && v.pairOk),
    enoughVehicleCapacity,
    enoughPoolCapacity,
    limitingReason,
    missingPoolCapacity: Math.max(0, Number(demand?.requiredPax || 0) - totalPairCapacity),
    driverNeedForCapacity,
    driverShortageCount,
    suggestedCombo: {
      vehicleCount: combo.items.length,
      totalCapacity: combo.totalCapacity,
      coversDemand: combo.coversDemand,
      missingCapacity: combo.missingCapacity,
      overflowCapacity: combo.overflowCapacity,
      items: allocationPlan.map((v) => ({
        id: Number(v.id),
        plate: v.plate,
        capacity: Number(v.capacity || 0),
        allocatedPax: Number(v.allocatedPax || 0),
        splitIndex: Number(v.splitIndex || 0) || null,
        suggestedDriver: v.suggestedDriver || null,
      })),
    },
    vehicleOnlyCombo: {
      vehicleCount: vehicleOnlyCombo.items.length,
      totalCapacity: vehicleOnlyCombo.totalCapacity,
      coversDemand: vehicleOnlyCombo.coversDemand,
      missingCapacity: vehicleOnlyCombo.missingCapacity,
      overflowCapacity: vehicleOnlyCombo.overflowCapacity,
      items: vehicleOnlyAllocationPlan.map((v) => ({
        id: Number(v.id),
        plate: v.plate,
        capacity: Number(v.capacity || 0),
        allocatedPax: Number(v.allocatedPax || 0),
        splitIndex: Number(v.splitIndex || 0) || null,
      })),
    },
    blockedDrivers,
    vehicles: vehicleRows,
    drivers: driverRows,
  };
}
