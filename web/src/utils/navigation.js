export function asNum(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function stopCoord(stop) {
  const lat = asNum(stop?.lat ?? stop?.location?.lat);
  const lng = asNum(stop?.lng ?? stop?.location?.lng);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9) return null;
  return { lat, lng };
}

export function vehicleCoord(vehicleLike) {
  const src = vehicleLike?.gpsLast ? vehicleLike.gpsLast : vehicleLike;
  const lat = asNum(src?.lat);
  const lng = asNum(src?.lng);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9) return null;
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

  const vehicleOrigin = vehicleCoord(originVehicle);
  const stopOnlyCoords = coords.map((x) => x.coord);

  let origin = vehicleOrigin;
  let destination = stopOnlyCoords[stopOnlyCoords.length - 1] || null;
  let waypoints = [];

  if (origin) {
    waypoints = stopOnlyCoords.slice(0, -1);
  } else {
    if (stopOnlyCoords.length < 2) {
      window.alert("Rota açılamadı: navigasyon için en az 2 nokta gerekir.");
      return;
    }
    origin = stopOnlyCoords[0];
    destination = stopOnlyCoords[stopOnlyCoords.length - 1];
    waypoints = stopOnlyCoords.slice(1, -1);
  }

  const url = buildGoogleNavUrl({ origin, destination, waypoints });
  if (!url) {
    window.alert("Rota açılamadı.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
