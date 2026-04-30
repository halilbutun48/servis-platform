function parseCoordText(text) {
  const raw = String(text || '').trim();
  if (!raw || raw === '-') return null;
  const parts = raw
    .replace(/\s+/g, ' ')
    .split(/[,\s]+/)
    .map((part) => Number(String(part || '').replace(',', '.')));
  if (parts.length < 2) return null;
  const [lat, lng] = parts;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function readStopCoords(stop = null) {
  if (!stop) return null;
  const lat = Number(stop?.lat);
  const lng = Number(stop?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function resolveBoardingChangeRequestCoords(state = {}, current = null) {
  const gps = state?.gps || {};
  const parsedGps = parseCoordText(gps?.displayCoordsText) || parseCoordText(gps?.localPreviewText);
  if (parsedGps) return parsedGps;

  const nextStop = current?.nextStop || current?.routePreviewStops?.[0] || state?.roleLive?.current?.nextStop || null;
  const nextStopCoords = readStopCoords(nextStop);
  if (nextStopCoords) return nextStopCoords;

  const routeStops = Array.isArray(current?.routePreviewStops) ? current.routePreviewStops : [];
  for (const stop of routeStops) {
    const coords = readStopCoords(stop);
    if (coords) return coords;
  }

  const fallbackRouteStops = Array.isArray(state?.route?.stops) ? state.route.stops : [];
  for (const stop of fallbackRouteStops) {
    const coords = readStopCoords(stop);
    if (coords) return coords;
  }

  return null;
}

export function buildBoardingChangeRequestPayload({
  state = {},
  current = null,
  shiftId,
  kind,
  reason,
  childId = null,
  source = 'mobile',
} = {}) {
  const coords = resolveBoardingChangeRequestCoords(state, current);
  if (!coords) return null;
  return {
    shiftId: Number(shiftId || 0) || null,
    lat: coords.lat,
    lng: coords.lng,
    kind: String(kind || '').trim(),
    reason: String(reason || '').trim(),
    childId: Number(childId || 0) || null,
    source: String(source || 'mobile').trim() || 'mobile',
  };
}

