import prisma from "../prisma.js";
import { httpError } from "../errors/http.js";

export function isRouteShapePatch(body) {
  return Object.prototype.hasOwnProperty.call(body || {}, "hubLat")
    || Object.prototype.hasOwnProperty.call(body || {}, "hubLng")
    || Object.prototype.hasOwnProperty.call(body || {}, "direction")
    || Object.prototype.hasOwnProperty.call(body || {}, "pattern");
}

export function requireHubPairOrThrow(body, { strict = false } = {}) {
  const source = body || {};
  const hasHubLat = strict
    ? Object.prototype.hasOwnProperty.call(source, "hubLat")
    : source.hubLat != null;
  const hasHubLng = strict
    ? Object.prototype.hasOwnProperty.call(source, "hubLng")
    : source.hubLng != null;
  if (hasHubLat !== hasHubLng) {
    throw httpError(400, "hubLat+hubLng together");
  }
}

export async function requireCompanyOfferVehicleSameRoomOrThrow({ companyOfferVehicleId, roomId }) {
  const vehicleId = Number(companyOfferVehicleId || 0);
  if (!Number.isFinite(vehicleId) || vehicleId <= 0) return null;

  const v = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, roomId: true },
  });
  if (!v) {
    throw httpError(400, "companyOfferVehicleId not found");
  }

  const scopedRoomId = Number(roomId || 0);
  if (scopedRoomId > 0 && v.roomId && Number(v.roomId) !== scopedRoomId) {
    throw httpError(400, "BAD_REQUEST", "companyOfferVehicleId must belong to the same room");
  }

  return v;
}
