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
