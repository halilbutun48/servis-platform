export const GPS_PUBLISH_INTERVAL_MS = 20000;

export function listVisibleShifts(today) {
  const buckets = [today?.active, today?.assigned]
    .concat(Array.isArray(today?.today) ? today.today : [])
    .concat(Array.isArray(today?.tomorrow) ? today.tomorrow : [])
    .concat(Array.isArray(today?.upcoming) ? today.upcoming : []);

  const seen = new Set();
  const rows = [];
  for (const item of buckets) {
    const shiftId = Number(item?.id || 0);
    if (!shiftId || seen.has(shiftId)) continue;
    seen.add(shiftId);
    rows.push(item);
  }
  return rows;
}

export function resolveVisibleShift(today, selectedShiftId, route) {
  const shifts = listVisibleShifts(today);
  const preferredId = Number(selectedShiftId || route?.shift?.id || 0) || null;
  if (preferredId) {
    const preferred = shifts.find((item) => Number(item?.id || 0) === preferredId);
    if (preferred) return preferred;
  }
  return shifts[0] || null;
}

export function resolveGpsPublishTarget(today, route, selectedShiftId) {
  const visibleShift = resolveVisibleShift(today, selectedShiftId, route);
  const routeShiftId = Number(route?.shift?.id || 0) || null;
  const routeFallbackShift = !visibleShift && routeShiftId
    ? {
        id: routeShiftId,
        status: route?.shift?.status || '',
        vehicleId: route?.shift?.vehicleId || route?.vehicle?.id || null,
        vehicle: route?.vehicle || null,
        startAt: route?.shift?.startAt || route?.startAt || null,
        endAt: route?.shift?.endAt || route?.endAt || null,
      }
    : null;
  const activeShift = visibleShift || routeFallbackShift;
  const routeMatchesShift = Boolean(routeShiftId && activeShift?.id && routeShiftId === Number(activeShift.id));
  const shiftStatus = String((routeMatchesShift ? route?.shift?.status : '') || activeShift?.status || '').toUpperCase();
  const vehicleId = Number(
    (routeMatchesShift ? (route?.shift?.vehicleId || route?.vehicle?.id) : 0) ||
    activeShift?.vehicleId ||
    activeShift?.vehicle?.id ||
    0
  ) || null;
  const shiftId = Number(activeShift?.id || (routeMatchesShift ? routeShiftId : 0) || 0) || null;
  const startMs = activeShift?.startAt ? new Date(activeShift.startAt).getTime() : NaN;
  const endMs = activeShift?.endAt ? new Date(activeShift.endAt).getTime() : NaN;
  const nowMs = Date.now();
  const withinWindow = Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= nowMs && endMs >= nowMs;
  const assignmentState = activeShift
    ? (!vehicleId ? 'ASSIGNED_NO_VEHICLE' : (shiftStatus === 'ACTIVE' || withinWindow ? 'ACTIVE' : 'ASSIGNED'))
    : 'NONE';

  return {
    activeShift,
    shiftId,
    vehicleId,
    shiftStatus,
    assignmentState,
    canPublish: Boolean(activeShift && vehicleId && ['APPROVED', 'ACTIVE'].includes(shiftStatus) && (shiftStatus === 'ACTIVE' || withinWindow)),
  };
}

export function formatGpsCoords(coords) {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return '-';
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

export function buildGpsPayload(position, vehicleId) {
  const coords = position?.coords || {};
  const speed = typeof coords.speed === 'number' && Number.isFinite(coords.speed) && coords.speed >= 0
    ? Number((coords.speed * 3.6).toFixed(1))
    : undefined;

  return {
    vehicleId,
    lat: Number(coords.latitude),
    lng: Number(coords.longitude),
    speed,
    at: new Date(position?.timestamp || Date.now()).toISOString(),
  };
}

export function permissionTextFromStatus(permission) {
  if (!permission) return 'GPS izin durumu okunamadi.';
  if (permission.status === 'granted') return "Surucunun telefon GPS'i hazir.";
  if (permission.canAskAgain === false) return "GPS izni kapali. Ayarlardan acmaniz gerekiyor.";
  return "Surucunun telefon GPS'i icin izin gerekli.";
}


export function formatLatLng(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return '-';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function freshnessText(status) {
  const key = String(status || '').toUpperCase();
  if (key === 'LIVE') return 'Canli';
  if (key === 'STALE') return 'Eski ama okunabilir';
  if (key === 'OFFLINE') return 'GPS yok veya cok eski';
  return '-';
}

export function resolveLiveLocationState({ route, gps, usingCachedData = false, netStatus = 'unknown', selectedShiftId = null } = {}) {
  const routeShiftId = Number(route?.shift?.id || 0) || null;
  const selectedId = Number(selectedShiftId || 0) || null;
  const shiftMatches = !selectedId || !routeShiftId || selectedId === routeShiftId;
  const backendGps = route?.liveLocation?.backendVehicleGps || (route?.last
    ? {
        available: true,
        source: 'BACKEND_VEHICLE_GPS',
        label: "Resmi arac GPS'i",
        freshness: route?.last?.at ? 'UNKNOWN' : 'OFFLINE',
        ageSec: null,
        at: route?.last?.at || '',
        lat: route?.last?.lat,
        lng: route?.last?.lng,
        speed: route?.last?.speed,
      }
    : null);
  const hasBackendCoords = Boolean(
    shiftMatches &&
    backendGps?.available !== false &&
    typeof backendGps?.lat === 'number' &&
    typeof backendGps?.lng === 'number'
  );
  const backendCached = Boolean(hasBackendCoords && (usingCachedData || netStatus === 'offline'));
  const officialSourceKey = backendCached ? 'CACHED_BACKEND_VEHICLE_GPS' : 'BACKEND_VEHICLE_GPS';
  const officialSourceText = backendCached ? "Onbellekteki resmi arac GPS'i" : "Resmi arac GPS'i";
  const officialCoordsText = hasBackendCoords ? formatLatLng(backendGps.lat, backendGps.lng) : '-';
  const officialAt = hasBackendCoords ? (backendGps.at || '') : '';
  const officialFreshness = hasBackendCoords ? String(backendGps?.freshness || 'UNKNOWN').toUpperCase() : 'OFFLINE';
  const officialFreshnessText = hasBackendCoords ? freshnessText(officialFreshness) : 'GPS yok veya bekleniyor';

  const localPreviewShiftId = Number(gps?.localPreviewShiftId || 0) || null;
  const localPreviewVehicleId = Number(gps?.localPreviewVehicleId || 0) || null;
  const routeVehicleId = Number(route?.shift?.vehicleId || route?.vehicle?.id || 0) || null;
  const localPreviewMatchesShift = !selectedId || !localPreviewShiftId || localPreviewShiftId === selectedId;
  const localPreviewMatchesVehicle = !routeVehicleId || !localPreviewVehicleId || localPreviewVehicleId === routeVehicleId;
  const hasLocalPreview = Boolean(
    gps?.localPreviewText &&
    gps.localPreviewText !== '-' &&
    localPreviewMatchesShift &&
    localPreviewMatchesVehicle
  );
  const localPreviewText = hasLocalPreview ? gps.localPreviewText : '-';
  const localPreviewAt = hasLocalPreview ? (gps?.localPreviewAt || '') : '';
  const localPreviewSourceText = hasLocalPreview
    ? (gps?.localPreviewKind === 'published' ? 'Yerel telefon son gonderim onizlemesi' : 'Yerel telefon onizlemesi')
    : 'Yerel telefon onizlemesi yok';

  const displaySourceKey = hasBackendCoords
    ? officialSourceKey
    : (hasLocalPreview ? 'LOCAL_DEVICE_PREVIEW' : 'NONE');
  const displaySourceText = hasBackendCoords
    ? officialSourceText
    : (hasLocalPreview ? localPreviewSourceText : 'Canli konum bekleniyor');
  const displayCoordsText = hasBackendCoords ? officialCoordsText : (hasLocalPreview ? localPreviewText : '-');
  const displayAt = hasBackendCoords ? officialAt : (hasLocalPreview ? localPreviewAt : '');

  return {
    sourcePriorityText: "Resmi arac GPS'i > yerel telefon onizlemesi > onbellek",
    officialSourceKey,
    officialSourceText,
    officialCoordsText,
    officialAt,
    officialFreshness,
    officialFreshnessText,
    displaySourceKey,
    displaySourceText,
    displayCoordsText,
    displayAt,
    localPreviewText,
    localPreviewAt,
    localPreviewSourceText,
    lastLocationText: displayCoordsText,
  };
}
