import { Linking } from "react-native";

function asNum(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function stopCoord(stop) {
  const lat = asNum(stop?.lat);
  const lng = asNum(stop?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function vehicleCoord(vehicleLike) {
  const src = vehicleLike?.gpsLast ? vehicleLike.gpsLast : vehicleLike;
  const lat = asNum(src?.lat);
  const lng = asNum(src?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function buildGoogleNavUrl({ origin, destination, waypoints = [] }) {
  if (!destination?.lat || !destination?.lng) return null;
  const originPart = origin?.lat && origin?.lng ? `&origin=${origin.lat},${origin.lng}` : "";
  const wp = (Array.isArray(waypoints) ? waypoints : [])
    .filter((x) => x?.lat != null && x?.lng != null)
    .map((x) => `${x.lat},${x.lng}`)
    .join("|");
  const waypointsPart = wp ? `&waypoints=${encodeURIComponent(wp)}` : "";
  return `https://www.google.com/maps/dir/?api=1${originPart}&destination=${destination.lat},${destination.lng}&travelmode=driving${waypointsPart}`;
}

export async function openNextStopNavigation(nextStop, originVehicle) {
  const destination = stopCoord(nextStop);
  if (!destination) return false;
  const origin = vehicleCoord(originVehicle);
  const url = buildGoogleNavUrl({ origin, destination, waypoints: [] });
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}

export async function openFullRouteNavigation(route) {
  const stopCoords = (Array.isArray(route?.orderedStops) ? route.orderedStops : [])
    .filter((s) => String(s?.state || "").toUpperCase() === "PENDING")
    .map((s) => stopCoord(s))
    .filter(Boolean);
  if (!stopCoords.length) return false;

  const origin = vehicleCoord(route?.last || route?.vehicle);
  let destination = stopCoords[stopCoords.length - 1] || null;
  let waypoints = [];

  if (origin) {
    waypoints = stopCoords.slice(0, -1);
  } else {
    if (stopCoords.length < 2) return openNextStopNavigation(route?.nextStop, route?.vehicle);
    destination = stopCoords[stopCoords.length - 1];
    waypoints = stopCoords.slice(1, -1);
    const syntheticOrigin = stopCoords[0];
    const url = buildGoogleNavUrl({ origin: syntheticOrigin, destination, waypoints });
    if (!url) return false;
    await Linking.openURL(url);
    return true;
  }

  const url = buildGoogleNavUrl({ origin, destination, waypoints });
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}
