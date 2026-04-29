import { overlaps } from "./roomShiftsPanelUtils";

export function pkgKeyOfShift(sh) {
  const cid = Number(sh?.companyId ?? sh?.company?.id ?? 0);
  const t0 =
    sh?.createdAt ? new Date(sh.createdAt).getTime() :
    sh?.startAt ? new Date(sh.startAt).getTime() :
    0;
  const bucket = Number.isFinite(t0) ? Math.floor(t0 / 60000) : 0;
  return `${cid}:${bucket}`;
}

export function pkgShiftIdsFor(baseShift, pendingFiltered = []) {
  return (pendingFiltered || [])
    .filter((x) => pkgKeyOfShift(x) === pkgKeyOfShift(baseShift))
    .map((x) => Number(x.id))
    .filter(Number.isFinite);
}

export function effectiveShiftRoomId(shift, marketOffer = null) {
  const shiftRoomId = Number(shift?.roomId || 0);
  if (shiftRoomId > 0) return shiftRoomId;
  const offerRoomId = Number(marketOffer?.roomId || 0);
  if (offerRoomId > 0) return offerRoomId;
  return null;
}

export function matchShift(s, qRaw) {
  const q = String(qRaw ?? "").trim().toLowerCase();
  if (!q) return true;

  const parts = [
    s?.id,
    s?.status,
    s?.company?.name,
    s?.vehicle?.plate,
    s?.driver?.fullName,
    s?.companyOfferNote,
    s?.roomOfferNote,
    s?.roomOfferDecision,
    s?.roomOfferDecisionNote,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return parts.includes(q);
}

export function isVehicleAvailableForShift(vehicleId, shift, items = []) {
  const vId = Number(vehicleId);
  if (!Number.isFinite(vId)) return false;

  const blockers = items.filter((x) => {
    if (!x?.vehicleId) return false;
    if (Number(x.vehicleId) !== vId) return false;
    const st = String(x.status || "");
    if (!["APPROVED", "ACTIVE"].includes(st)) return false;
    if (Number(x.id) === Number(shift.id)) return false;
    return overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt);
  });

  return blockers.length === 0;
}

export function isDriverAvailableForShift(driverId, shift, items = []) {
  const dId = Number(driverId);
  if (!Number.isFinite(dId)) return false;

  const blockers = items.filter((x) => {
    if (!x?.driverId) return false;
    if (Number(x.driverId) !== dId) return false;
    const st = String(x.status || "");
    if (!["APPROVED", "ACTIVE"].includes(st)) return false;
    if (Number(x.id) === Number(shift.id)) return false;
    return overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt);
  });

  return blockers.length === 0;
}

export function makeAvailabilitySig({ shift, vehicleId, driverId }) {
  return [String(vehicleId || ""), String(driverId || ""), String(shift?.startAt || ""), String(shift?.endAt || "")].join("|");
}

export function buildOffersByShiftId(offers) {
  const m = new Map();
  for (const o of offers || []) {
    const sid = Number(o?.shiftId);
    if (!Number.isFinite(sid) || sid <= 0) continue;
    m.set(sid, o);
  }
  return m;
}

export function listVehiclesForRoom(vehicles, roomId) {
  const rid = Number(roomId);
  return (Array.isArray(vehicles) ? vehicles : [])
    .filter((v) => !v?.roomId || Number(v.roomId) === rid)
    .sort((a, b) => String(a.plate || "").localeCompare(String(b.plate || "")));
}

export function listDriversForRoom(drivers, roomId) {
  const rid = Number(roomId);
  return (Array.isArray(drivers) ? drivers : [])
    .filter((d) => !d?.roomId || Number(d.roomId) === rid)
    .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
}

export function copyVehicleToPkg({ baseShift, vehicleIdStr, pendingFiltered, vehiclesById, setAssignSel, setDriverSel, pkgShiftIdsFor }) {
  const vidStr = String(vehicleIdStr || "");
  if (!vidStr) return;
  const ids = pkgShiftIdsFor(baseShift, pendingFiltered);
  if (ids.length <= 1) return;

  setAssignSel((prev) => {
    const next = { ...(prev || {}) };
    for (const id of ids) next[id] = vidStr;
    return next;
  });

  const vid = Number(vidStr);
  const vv = Number.isFinite(vid) ? vehiclesById.get(vid) : null;
  const autoDid = vv?.driverId ? String(vv.driverId) : "";
  if (autoDid) {
    setDriverSel((prev) => {
      const next = { ...(prev || {}) };
      for (const id of ids) {
        if (!next[id]) next[id] = autoDid;
      }
      return next;
    });
  }
}

export function copyDriverToPkg({ baseShift, driverIdStr, pendingFiltered, setDriverSel, pkgShiftIdsFor }) {
  const didStr = String(driverIdStr || "");
  if (!didStr) return;
  const ids = pkgShiftIdsFor(baseShift, pendingFiltered);
  if (ids.length <= 1) return;

  setDriverSel((prev) => {
    const next = { ...(prev || {}) };
    for (const id of ids) next[id] = didStr;
    return next;
  });
}

export function hydrateDispatchSelections(setDispatchEditSel, shiftId, suggestions = []) {
  const sid = Number(shiftId || 0);
  if (!sid) return;
  setDispatchEditSel((prev) => {
    const base = { ...(prev[sid] || {}) };
    for (const part of suggestions || []) {
      const idx = Number(part?.splitIndex || 0);
      if (!idx) continue;
      base[idx] = {
        vehicleId: Number(base[idx]?.vehicleId || part?.vehicleId || 0) || "",
        driverId: Number(base[idx]?.driverId || part?.driverId || 0) || "",
      };
    }
    return { ...prev, [sid]: base };
  });
}

export function setDispatchSelection(setDispatchEditSel, shiftId, splitIndex, patch) {
  const sid = Number(shiftId || 0);
  const idx = Number(splitIndex || 0);
  if (!sid || !idx) return;
  setDispatchEditSel((prev) => ({
    ...prev,
    [sid]: {
      ...(prev[sid] || {}),
      [idx]: {
        ...(prev[sid]?.[idx] || {}),
        ...(patch || {}),
      },
    },
  }));
}

export function selectedDispatchVehicleId(dispatchEditSel, shiftId, part) {
  const sid = Number(shiftId || 0);
  const idx = Number(part?.splitIndex || 0);
  return Number(dispatchEditSel?.[sid]?.[idx]?.vehicleId || part?.vehicleId || 0) || 0;
}

export function selectedDispatchDriverId(dispatchEditSel, shiftId, part) {
  const sid = Number(shiftId || 0);
  const idx = Number(part?.splitIndex || 0);
  return Number(dispatchEditSel?.[sid]?.[idx]?.driverId || part?.driverId || 0) || 0;
}

export function buildDispatchVirtualShift(shift, allocatedPax) {
  const pax = Number(allocatedPax || 0) || 0;
  return { ...(shift || {}), requiredPax: pax, requiredPaxOverride: pax, assignmentCount: pax, peopleCount: pax };
}

export function getDispatchSelectionStates({
  shift,
  suggestions = [],
  dispatchEditSel,
  vehiclesById,
  items,
  vehiclesForRoom,
  isDriverAvailableForShift,
  isVehicleAvailableForShift,
  buildCapacityMeta,
}) {
  const sid = Number(shift?.id || 0);
  const vehicleCounts = new Map();
  const driverCounts = new Map();
  const selRows = (suggestions || []).map((part) => ({
    splitIndex: Number(part?.splitIndex || 0),
    allocatedPax: Number(part?.allocatedPax || 0),
    vehicleId: selectedDispatchVehicleId(dispatchEditSel, sid, part),
    driverId: selectedDispatchDriverId(dispatchEditSel, sid, part),
    part,
  }));
  for (const row of selRows) {
    if (row.vehicleId) vehicleCounts.set(row.vehicleId, (vehicleCounts.get(row.vehicleId) || 0) + 1);
    if (row.driverId) driverCounts.set(row.driverId, (driverCounts.get(row.driverId) || 0) + 1);
  }
  const result = {};
  for (const row of selRows) {
    const vDup = row.vehicleId && (vehicleCounts.get(row.vehicleId) || 0) > 1;
    const dDup = row.driverId && (driverCounts.get(row.driverId) || 0) > 1;
    if (vDup) {
      result[row.splitIndex] = { status: "conflict", code: "DUPLICATE_VEHICLE", message: "Aynı araç başka öneride de seçili." };
      continue;
    }
    if (dDup) {
      result[row.splitIndex] = { status: "conflict", code: "DUPLICATE_DRIVER", message: "Aynı şoför başka öneride de seçili." };
      continue;
    }
    const virtualShift = buildDispatchVirtualShift(shift, row.allocatedPax);
    if (!row.vehicleId || !row.driverId) {
      result[row.splitIndex] = { status: "missing", code: "SELECT_REQUIRED", message: "Araç ve driver seç." };
      continue;
    }
    const vehicle = vehiclesById.get(Number(row.vehicleId)) || null;
    const capacity = buildCapacityMeta({
      shift: virtualShift,
      vehicle,
      roomVehicles: vehiclesForRoom(shift?.roomId),
    });
    if (capacity.blockCode) {
      result[row.splitIndex] = { status: "conflict", code: capacity.blockCode, message: capacity.blockMessage };
      continue;
    }
    const dOk = isDriverAvailableForShift(row.driverId, shift);
    if (!dOk) {
      const conflictingShift = (items || []).find((x) => {
        if (Number(x.id) === Number(shift.id)) return false;
        const st = String(x.status || "");
        if (!["APPROVED", "ACTIVE"].includes(st)) return false;
        return Number(x.driverId) === Number(row.driverId) && overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt);
      });
      result[row.splitIndex] = {
        status: "conflict",
        code: "DRIVER_CONFLICT",
        message: "Driver aynı zaman aralığında başka bir vardiyada.",
        conflictingShift: conflictingShift || null,
      };
      continue;
    }
    const vOk = isVehicleAvailableForShift(row.vehicleId, shift);
    if (!vOk) {
      const conflictingShift = (items || []).find((x) => {
        if (Number(x.id) === Number(shift.id)) return false;
        const st = String(x.status || "");
        if (!["APPROVED", "ACTIVE"].includes(st)) return false;
        return Number(x.vehicleId) === Number(row.vehicleId) && overlaps(x.startAt, x.endAt, shift.startAt, shift.endAt);
      });
      result[row.splitIndex] = {
        status: "conflict",
        code: "VEHICLE_CONFLICT",
        message: "Araç aynı zaman aralığında başka bir vardiyada.",
        conflictingShift: conflictingShift || null,
      };
      continue;
    }
    result[row.splitIndex] = { status: "ok", code: "OK", message: "Uygun" };
  }
  return result;
}
