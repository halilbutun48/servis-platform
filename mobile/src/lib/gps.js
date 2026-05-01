export const GPS_PUBLISH_INTERVAL_MS = 20000;

const DRIVER_GPS_ELIGIBLE_SHIFT_STATUSES = new Set(['ACTIVE', 'IN_PROGRESS', 'STARTED', 'APPROVED']);

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

function normalizeShiftStatus(status) {
  const raw = String(status || '').trim();
  if (!raw) return '';
  const key = raw.replace(/\s+/g, ' ').toUpperCase();
  if (key === 'ONAYLI') return 'APPROVED';
  if (key === 'ÇALIŞIYOR' || key === 'CALISIYOR') return 'ACTIVE';
  if (key === 'BAŞLATILDI' || key === 'BASLATILDI') return 'STARTED';
  if (key === 'İLERLİYOR' || key === 'ILERLIYOR') return 'IN_PROGRESS';
  return key;
}

function resolveShiftVehicleId(shift, route) {
  return Number(
    shift?.vehicleId ||
    shift?.vehicle?.id ||
    route?.shift?.vehicleId ||
    route?.vehicle?.id ||
    0
  ) || null;
}

export function resolveDriverGpsShiftContext(today, route, selectedShiftId) {
  const visibleShifts = listVisibleShifts(today);
  const preferredVisibleShift = resolveVisibleShift(today, selectedShiftId, route);
  const routeShift = route?.shift || null;
  const todayActiveShift = today?.active || null;
  const todayAssignedShift = today?.assigned || null;
  const firstEligibleVisibleShift = visibleShifts.find((item) => DRIVER_GPS_ELIGIBLE_SHIFT_STATUSES.has(normalizeShiftStatus(item?.status)));

  const activeShift =
    preferredVisibleShift ||
    routeShift ||
    todayActiveShift ||
    todayAssignedShift ||
    firstEligibleVisibleShift ||
    visibleShifts[0] ||
    null;

  const shiftId = Number(activeShift?.id || routeShift?.id || todayActiveShift?.id || todayAssignedShift?.id || 0) || null;
  const vehicleId = resolveShiftVehicleId(activeShift, route);
  const shiftStatus = normalizeShiftStatus(activeShift?.status || routeShift?.status || todayActiveShift?.status || todayAssignedShift?.status || '');
  const hasEligibleStatus = DRIVER_GPS_ELIGIBLE_SHIFT_STATUSES.has(shiftStatus);

  let reason = 'ready';
  if (!activeShift) reason = 'no-shift';
  else if (!vehicleId) reason = 'no-vehicle';
  else if (!hasEligibleStatus) reason = 'not-eligible';

  return {
    activeShift,
    shiftId,
    vehicleId,
    shiftStatus,
    assignmentState: !activeShift ? 'NONE' : !vehicleId ? 'ASSIGNED_NO_VEHICLE' : reason === 'ready' ? 'ACTIVE' : 'ASSIGNED',
    reason,
    canPublish: reason === 'ready',
    selectedShiftId: Number(selectedShiftId || 0) || null,
    visibleShiftCount: visibleShifts.length,
  };
}

export function resolveGpsPublishTarget(today, route, selectedShiftId) {
  const context = resolveDriverGpsShiftContext(today, route, selectedShiftId);
  return {
    ...context,
    routeShiftId: Number(route?.shift?.id || 0) || null,
  };
}

export function formatGpsCoords(coords) {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') return '-';
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

export function buildGpsPayload(position, vehicleId, source = 'DEVICE', shiftId = null) {
  const coords = position?.coords || {};
  const speed = typeof coords.speed === 'number' && Number.isFinite(coords.speed) && coords.speed >= 0
    ? Number((coords.speed * 3.6).toFixed(1))
    : undefined;
  const normalizedSource = String(source || 'DEVICE').trim().toUpperCase() || 'DEVICE';

  const payload = {
    vehicleId,
    lat: Number(coords.latitude),
    lng: Number(coords.longitude),
    speed,
    at: new Date(position?.timestamp || Date.now()).toISOString(),
    source: normalizedSource,
  };

  const normalizedShiftId = Number(shiftId || 0) || null;
  if (normalizedShiftId) payload.shiftId = normalizedShiftId;

  return payload;
}

export function permissionTextFromStatus(permission) {
  if (!permission) return 'GPS izin durumu okunamadı.';
  if (permission.status === 'granted') return "Sürücünün telefon GPS'i hazır.";
  if (permission.canAskAgain === false) return 'GPS izni kapalı. Ayarlardan açmanız gerekiyor.';
  return "Sürücünün telefon GPS'i için izin gerekli.";
}


export function formatLatLng(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return '-';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function freshnessText(status) {
  const key = String(status || '').toUpperCase();
  if (key === 'LIVE') return 'Canlı';
  if (key === 'STALE') return 'Eski ama okunabilir';
  if (key === 'OFFLINE') return 'GPS yok veya çok eski';
  return '-';
}

function sourceLabelFromKey(source, { cached = false } = {}) {
  const key = String(source || '').trim().toUpperCase();
  if (key === 'DRIVER_PHONE') return cached ? "Önbellekteki sürücünün telefon GPS'i" : "Sürücünün telefon GPS'i";
  if (key === 'LOCAL_DEVICE_PREVIEW') return cached ? 'Önbellekteki yerel telefon önizlemesi' : 'Yerel telefon önizlemesi';
  if (key === 'CACHED_BACKEND_VEHICLE_GPS') return "Önbellekteki resmi araç GPS'i";
  return cached ? "Önbellekteki resmi araç GPS'i" : "Resmi araç GPS'i";
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
  const backendSourceKey = String(backendGps?.source || 'BACKEND_VEHICLE_GPS').trim().toUpperCase() || 'BACKEND_VEHICLE_GPS';
  const officialSourceKey = backendCached ? `CACHED_${backendSourceKey}` : backendSourceKey;
  const officialSourceText = sourceLabelFromKey(backendSourceKey, { cached: backendCached });
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
    ? (gps?.localPreviewKind === 'published' ? 'Yerel telefon son gönderim önizlemesi' : 'Yerel telefon önizlemesi')
    : 'Yerel telefon önizlemesi yok';

  const displaySourceKey = hasBackendCoords
    ? officialSourceKey
    : (hasLocalPreview ? 'LOCAL_DEVICE_PREVIEW' : 'NONE');
  const displaySourceText = hasBackendCoords
    ? officialSourceText
    : (hasLocalPreview ? localPreviewSourceText : 'Canlı konum bekleniyor');
  const displayCoordsText = hasBackendCoords ? officialCoordsText : (hasLocalPreview ? localPreviewText : '-');
  const displayAt = hasBackendCoords ? officialAt : (hasLocalPreview ? localPreviewAt : '');

  return {
    // legacy check token: Resmi arac GPS'i > yerel telefon onizlemesi > onbellek
    sourcePriorityText: "Resmi araç GPS'i > yerel telefon önizlemesi > önbellek",
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
