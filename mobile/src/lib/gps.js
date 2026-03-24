export const GPS_PUBLISH_INTERVAL_MS = 20000;

export function resolveGpsPublishTarget(today, route) {
  const visibleShift = today?.active || today?.assigned || today?.today?.[0] || today?.tomorrow?.[0] || today?.upcoming?.[0] || null;
  const shiftStatus = String(route?.shift?.status || visibleShift?.status || '').toUpperCase();
  const vehicleId = Number(route?.shift?.vehicleId || route?.vehicle?.id || visibleShift?.vehicleId || visibleShift?.vehicle?.id || 0) || null;
  const shiftId = Number(route?.shift?.id || visibleShift?.id || 0) || null;
  const startMs = visibleShift?.startAt ? new Date(visibleShift.startAt).getTime() : NaN;
  const endMs = visibleShift?.endAt ? new Date(visibleShift.endAt).getTime() : NaN;
  const nowMs = Date.now();
  const withinWindow = Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= nowMs && endMs >= nowMs;
  const assignmentState = visibleShift
    ? (!vehicleId ? 'ASSIGNED_NO_VEHICLE' : (shiftStatus === 'ACTIVE' || withinWindow ? 'ACTIVE' : 'ASSIGNED'))
    : 'NONE';

  return {
    activeShift: visibleShift,
    shiftId,
    vehicleId,
    shiftStatus,
    assignmentState,
    canPublish: Boolean(visibleShift && vehicleId && ['APPROVED', 'ACTIVE'].includes(shiftStatus) && (shiftStatus === 'ACTIVE' || withinWindow)),
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
