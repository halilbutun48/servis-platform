import prisma from '../prisma.js';
import { clearResponseCacheExact } from '../utils/responseCache.js';
import { computeRouteKey, stringifyPolyline, sumDistanceKm } from './routeLearning.js';
import { osrmRoute } from './osrmRoute.js';
import { etaMinutes } from '../geo.js';

function buildShiftServicePathPoints(shift) {
  const hub =
    typeof shift?.hubLat === 'number' && typeof shift?.hubLng === 'number'
      ? { lat: Number(shift.hubLat), lng: Number(shift.hubLng) }
      : null;
  const direction = String(shift?.direction || 'INBOUND').toUpperCase();
  const pattern = String(shift?.pattern || 'ONE_WAY').toUpperCase();
  const stopPoints = Array.isArray(shift?.stops)
    ? shift.stops
        .filter((s) => typeof s?.lat === 'number' && typeof s?.lng === 'number')
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
        .map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }))
    : [];

  let servicePoints = [];
  if (!hub) servicePoints = stopPoints.slice();
  else if (pattern === 'LOOP') servicePoints = [hub, ...stopPoints, hub];
  else if (direction === 'OUTBOUND') servicePoints = [hub, ...stopPoints];
  else servicePoints = [...stopPoints, hub];

  return { hub, direction, pattern, stopPoints, servicePoints };
}

export function shiftRoutePreviewCacheKey(shiftId) {
  return `shift-route-preview:${Number(shiftId)}`;
}

export function clearShiftRoutePreviewCache(shiftId) {
  clearResponseCacheExact(shiftRoutePreviewCacheKey(shiftId));
}

export async function invalidateShiftRouteSnapshot(shiftId, db = prisma) {
  return db.shift.update({
    where: { id: Number(shiftId) },
    data: {
      routeSnapshotPolyline: null,
      routeSnapshotDistanceM: null,
      routeSnapshotDurationSec: null,
      routeSnapshotValidatedAt: null,
      routeSnapshotInputHash: null,
    },
  });
}

export async function refreshShiftRouteSnapshot(shiftId) {
  const shift = await prisma.shift.findUnique({
    where: { id: Number(shiftId) },
    include: { stops: { orderBy: { order: 'asc' } } },
  });
  if (!shift) return null;

  const { hub, direction, pattern, stopPoints, servicePoints } = buildShiftServicePathPoints(shift);
  const routeSnapshotInputHash = computeRouteKey({ direction, pattern, hub, stops: stopPoints });

  let routeSnapshotPolyline = null;
  let routeSnapshotDistanceM = null;
  let routeSnapshotDurationSec = null;
  let routeSnapshotValidatedAt = null;

  if (servicePoints.length >= 2) {
    const routed = await osrmRoute(servicePoints);
    if (routed?.ok && Array.isArray(routed.points) && routed.points.length >= 2) {
      routeSnapshotPolyline = stringifyPolyline(routed.points);
      const distanceM = Number.isFinite(Number(routed.distanceM))
        ? Math.round(Number(routed.distanceM))
        : Math.round(Number(sumDistanceKm(routed.points) * 1000));
      const durationSec = Number.isFinite(Number(routed.durationSec))
        ? Math.round(Number(routed.durationSec))
        : Math.round(Number(etaMinutes(Number(distanceM || 0) / 1000, 30) * 60));
      routeSnapshotDistanceM = Number.isFinite(distanceM) ? distanceM : null;
      routeSnapshotDurationSec = Number.isFinite(durationSec) ? durationSec : null;
      routeSnapshotValidatedAt = new Date();
    }
  }

  await prisma.shift.update({
    where: { id: shift.id },
    data: {
      routeSnapshotPolyline,
      routeSnapshotDistanceM,
      routeSnapshotDurationSec,
      routeSnapshotValidatedAt,
      routeSnapshotInputHash,
    },
  });

  return {
    routeSnapshotInputHash,
    routeSnapshotPolyline,
    routeSnapshotDistanceM,
    routeSnapshotDurationSec,
    routeSnapshotValidatedAt,
  };
}

export async function rebuildShiftRouteState(shiftId, db = prisma) {
  await invalidateShiftRouteSnapshot(shiftId, db);
  clearShiftRoutePreviewCache(shiftId);
  return refreshShiftRouteSnapshot(shiftId);
}


export async function rebuildShiftRouteStateBestEffort(shiftId, db = prisma) {
  try {
    return await rebuildShiftRouteState(shiftId, db);
  } catch (err) {
    console.error('[shift-route-state] rebuild failed', { shiftId: Number(shiftId), message: String(err?.message || err) });
    return null;
  }
}
