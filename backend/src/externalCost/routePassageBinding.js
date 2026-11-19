import { normalizePassageRequest, resolvePassageEvidence } from "./passageTariffContract.js";
import { computeRouteKey } from "../services/routeLearning.js";

const SHIFT_DIRECTIONS = new Set(["INBOUND", "OUTBOUND"]);

function dateLabel(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}
function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function canonicalRouteInputHashForShift(shift = {}) {
  const hub = Number.isFinite(Number(shift.hubLat)) && Number.isFinite(Number(shift.hubLng))
    ? { lat: Number(shift.hubLat), lng: Number(shift.hubLng) }
    : null;
  const stops = (Array.isArray(shift.stops) ? shift.stops : [])
    .slice()
    .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
    .map((stop) => ({ lat: Number(stop?.lat), lng: Number(stop?.lng) }))
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
  const pattern = text(shift.pattern).toUpperCase() || "ONE_WAY";
  const servicePointCount = hub
    ? pattern === "LOOP" ? stops.length + 2 : stops.length + 1
    : stops.length;
  if (servicePointCount < 2) return null;
  return computeRouteKey({ direction: shift.direction, pattern, hub, stops });
}

export function buildCanonicalRoutePassageContext({ shift = {}, routeId } = {}) {
  const missingReasons = [];
  const normalizedRouteId = text(routeId);
  const serviceDate = dateLabel(shift.startAt);
  const direction = text(shift.direction).toUpperCase();
  const routeSnapshotInputHash = text(shift.routeSnapshotInputHash);
  const routeSnapshotPolyline = text(shift.routeSnapshotPolyline);
  const distanceM = Number(shift.routeSnapshotDistanceM);
  const durationSec = Number(shift.routeSnapshotDurationSec);
  const validatedAt = dateLabel(shift.routeSnapshotValidatedAt);
  const canonicalRouteInputHash = canonicalRouteInputHashForShift(shift);

  if (!normalizedRouteId) missingReasons.push("canonical route identity is missing.");
  if (!serviceDate) missingReasons.push("canonical service date is missing.");
  if (!SHIFT_DIRECTIONS.has(direction)) missingReasons.push("canonical route direction is missing or unsupported.");
  if (!routeSnapshotInputHash || !routeSnapshotPolyline || !(distanceM > 0) || !(durationSec > 0) || !validatedAt) {
    missingReasons.push("validated canonical route snapshot is missing.");
  }
  if (!canonicalRouteInputHash) {
    missingReasons.push("current canonical route geometry metadata is missing.");
  } else if (canonicalRouteInputHash !== routeSnapshotInputHash) {
    missingReasons.push("route snapshot input hash does not match current canonical route metadata.");
  }

  return {
    status: missingReasons.length ? "NOT_PROVEN" : "PROVEN",
    routeId: normalizedRouteId || null,
    serviceDate: serviceDate || null,
    direction: direction || null,
    routeSnapshotInputHash: routeSnapshotInputHash || null,
    canonicalRouteInputHash: canonicalRouteInputHash || null,
    routeSnapshotValidatedAt: validatedAt || null,
    routeSnapshotDistanceM: Number.isFinite(distanceM) && distanceM > 0 ? distanceM : null,
    routeSnapshotDurationSec: Number.isFinite(durationSec) && durationSec > 0 ? durationSec : null,
    missingReasons,
  };
}
export function bindPassageRequestsToRoute({ routeContext, requests = [] } = {}) {
  if (!Array.isArray(requests) || !requests.length) {
    return {
      status: "NOT_PROVEN",
      requests: [],
      missingReasons: ["explicit paid passage request is missing."],
    };
  }

  const normalizedRequests = requests.map((item) => normalizePassageRequest(item));
  const missingReasons = [];
  if (!routeContext || routeContext.status !== "PROVEN") {
    missingReasons.push(...(routeContext?.missingReasons || ["canonical route context is missing."]));
  }

  normalizedRequests.forEach((request) => {
    if (routeContext?.routeId !== request.routeId) missingReasons.push(`${request.paidSegment}: route identity mismatch.`);
    if (routeContext?.routeSnapshotInputHash !== request.routeSnapshotInputHash) {
      missingReasons.push(`${request.paidSegment}: route snapshot input hash mismatch.`);
    }
    if (routeContext?.serviceDate !== request.serviceDate) missingReasons.push(`${request.paidSegment}: service date mismatch.`);
    if (routeContext?.direction !== request.direction) missingReasons.push(`${request.paidSegment}: direction mismatch.`);
  });

  if (missingReasons.length) {
    return { status: "NOT_PROVEN", requests: [], missingReasons: [...new Set(missingReasons)] };
  }
  return { status: "PROVEN_ROUTE_CONTEXT", requests: normalizedRequests, missingReasons: [] };
}

export async function resolveCanonicalPassageEvidence({ routeContext, requests = [], getReference } = {}) {
  if (!Array.isArray(requests) || !requests.length) return resolvePassageEvidence({});
  const binding = bindPassageRequestsToRoute({ routeContext, requests });
  if (binding.status !== "PROVEN_ROUTE_CONTEXT") {
    return {
      status: "NOT_PROVEN",
      totalMinor: null,
      currencyCode: "TRY",
      passageBasis: "PLANNED_ROUTE_TARIFF",
      actualHgsEventStatus: "SEPARATE_RECORD_REQUIRED",
      items: [],
      missingReasons: binding.missingReasons,
      routeBinding: binding,
    };
  }
  const references = await Promise.all(binding.requests.map((request) => getReference(request)));
  return {
    ...resolvePassageEvidence({ requests: binding.requests, references }),
    routeBinding: binding,
  };
}

export async function resolvePerVehiclePassageEvidence({
  vehicleRoutes = [],
  requestsByVehicle = {},
  getReference,
} = {}) {
  if (!Array.isArray(vehicleRoutes) || !vehicleRoutes.length) {
    return {
      status: "NOT_PROVEN",
      totalMinor: null,
      currencyCode: "TRY",
      passageBasis: "PER_VEHICLE_PLANNED_ROUTE_TARIFF",
      actualHgsEventStatus: "SEPARATE_RECORD_REQUIRED",
      vehicleTotalsMinor: [],
      vehicles: [],
      missingReasons: ["Her araç için doğrulanmış rota ve geçiş tarife kanıtı bulunamadı."],
    };
  }

  const vehicles = await Promise.all(vehicleRoutes.map(async (vehicleRoute) => {
    const vehicleIndex = Number.isSafeInteger(Number(vehicleRoute?.vehicleIndex))
      ? Number(vehicleRoute.vehicleIndex)
      : null;
    const requests = Array.isArray(vehicleRoute?.requests)
      ? vehicleRoute.requests
      : (Array.isArray(requestsByVehicle?.[String(vehicleIndex)]) ? requestsByVehicle[String(vehicleIndex)] : []);
    const evidence = await resolveCanonicalPassageEvidence({
      routeContext: vehicleRoute?.routeContext,
      requests,
      getReference,
    });
    return {
      vehicleIndex,
      status: evidence.status,
      totalMinor: evidence.status === "PROVEN" ? evidence.totalMinor : null,
      items: evidence.items,
      missingReasons: evidence.missingReasons,
      routeBinding: evidence.routeBinding || null,
    };
  }));

  const missingReasons = [...new Set(vehicles.flatMap((vehicle) => (
    vehicle.missingReasons || []
  ).map((reason) => `Araç ${vehicle.vehicleIndex ?? "?"}: ${reason}`)))];
  const allProven = vehicles.every((vehicle) => vehicle.status === "PROVEN");
  const vehicleTotalsMinor = vehicles.map((vehicle) => vehicle.totalMinor);

  return {
    status: allProven ? "PROVEN" : "NOT_PROVEN",
    totalMinor: allProven ? vehicleTotalsMinor.reduce((total, value) => total + value, 0) : null,
    currencyCode: "TRY",
    passageBasis: "PER_VEHICLE_PLANNED_ROUTE_TARIFF",
    actualHgsEventStatus: "SEPARATE_RECORD_REQUIRED",
    vehicleTotalsMinor,
    vehicles,
    missingReasons,
  };
}
