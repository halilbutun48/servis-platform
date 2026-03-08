export function asNum(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function stopCoord(stop) {
  const lat = asNum(stop?.lat ?? stop?.location?.lat);
  const lng = asNum(stop?.lng ?? stop?.location?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function vehicleCoord(vehicleLike) {
  const src = vehicleLike?.gpsLast ? vehicleLike.gpsLast : vehicleLike;
  const lat = asNum(src?.lat);
  const lng = asNum(src?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function isReachedStop(stop) {
  const st = String(stop?.status || stop?.state || "").toUpperCase();
  return st === "REACHED" || st === "DONE" || st === "COMPLETED" || st === "SKIPPED" || Boolean(stop?.reachedAt);
}

export function routeStats(stops = []) {
  const arr = Array.isArray(stops) ? stops : [];
  const total = arr.length;
  const completed = arr.filter((s) => isReachedStop(s)).length;
  const remaining = Math.max(0, total - completed);
  return { total, completed, remaining };
}

export function buildGoogleNavUrl({ origin, destination, waypoints = [] }) {
  const dest = destination ? `${destination.lat},${destination.lng}` : "";
  if (!dest) return null;
  const originPart = origin ? `&origin=${origin.lat},${origin.lng}` : "";
  const wp = (Array.isArray(waypoints) ? waypoints : [])
    .map((x) => `${x.lat},${x.lng}`)
    .filter(Boolean)
    .join("|");
  const waypointsPart = wp ? `&waypoints=${encodeURIComponent(wp)}` : "";
  return `https://www.google.com/maps/dir/?api=1${originPart}&destination=${dest}&travelmode=driving${waypointsPart}`;
}

export function openNextStopNavigation(stop, originVehicle) {
  const sc = stopCoord(stop);
  if (!sc) {
    window.alert("Navigasyon açılamadı: durak konumu yok.");
    return;
  }
  const vc = vehicleCoord(originVehicle);
  const url = buildGoogleNavUrl({ origin: vc, destination: sc });
  if (!url) {
    window.alert("Navigasyon açılamadı.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openFullRouteNavigation(stops, originVehicle) {
  const coords = (Array.isArray(stops) ? stops : [])
    .map((s) => ({ stop: s, coord: stopCoord(s) }))
    .filter((x) => !!x.coord);
  if (!coords.length) {
    window.alert("Rota açılamadı: uygun durak yok.");
    return;
  }
  const origin = vehicleCoord(originVehicle);
  const destination = coords[coords.length - 1].coord;
  const waypoints = coords.slice(0, -1).map((x) => x.coord);
  const url = buildGoogleNavUrl({ origin, destination, waypoints });
  if (!url) {
    window.alert("Rota açılamadı.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
