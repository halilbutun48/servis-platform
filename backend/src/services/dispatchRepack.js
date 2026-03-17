import { osrmTable } from "./osrmTable.js";
import { osrmRoute } from "./osrmRoute.js";
import { solveTsp } from "./planSolve.js";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hasFiniteCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function pointForUnitFromCoordMap(unit, coordMap) {
  const stopLat = num(unit?.stopMeta?.lat);
  const stopLng = num(unit?.stopMeta?.lng);
  if (hasFiniteCoord(stopLat, stopLng)) {
    return {
      lat: stopLat,
      lng: stopLng,
      title: unit?.stopMeta?.name || unit?.originalStopKey || "Durak",
    };
  }

  const pid = Number(unit?.personelId || 0);
  const person = pid ? coordMap?.get?.(pid) : null;
  const personLat = num(person?.lat);
  const personLng = num(person?.lng);
  if (hasFiniteCoord(personLat, personLng)) {
    return {
      lat: personLat,
      lng: personLng,
      title: person?.title || `#${pid}`,
    };
  }
  return null;
}

function coordBucketKey(point, fallbackKey) {
  const lat = num(point?.lat);
  const lng = num(point?.lng);
  if (hasFiniteCoord(lat, lng)) {
    return `coord:${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
  return String(fallbackKey || `free:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`);
}

function stopTitleForUnit(unit, point, idx) {
  return (
    unit?.stopMeta?.name ||
    point?.title ||
    (Number(unit?.personelId || 0) > 0 ? `Personel Durağı ${idx}` : `Öneri Durak ${idx}`)
  );
}

function stopTypeForUnit(unit) {
  return unit?.stopMeta?.type || "COMMON";
}

function stopStateForUnit(unit) {
  return unit?.stopMeta?.state || "PENDING";
}

function buildRouteMode(shift) {
  const direction = String(shift?.direction || "INBOUND").toUpperCase();
  const pattern = String(shift?.pattern || "ONE_WAY").toUpperCase();
  return {
    direction,
    pattern,
    mode: pattern === "LOOP" ? "LOOP" : direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND",
  };
}

function buildHub(shift) {
  const lat = num(shift?.hubLat);
  const lng = num(shift?.hubLng);
  if (!hasFiniteCoord(lat, lng)) return null;
  return { id: "__hub__", lat, lng };
}

function sumSequentialMetrics(points, table) {
  const durations = Array.isArray(table?.durationsSec) ? table.durationsSec : null;
  const distances = Array.isArray(table?.distancesM) ? table.distancesM : null;
  if (!durations || durations.length !== points.length) {
    return { totalDurationSec: null, totalDistanceM: null };
  }

  let totalDurationSec = 0;
  let totalDistanceM = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const dSec = Number(durations?.[i]?.[i + 1]);
    const dM = Number(distances?.[i]?.[i + 1]);
    if (!Number.isFinite(dSec)) {
      return { totalDurationSec: null, totalDistanceM: null };
    }
    totalDurationSec += dSec;
    if (Number.isFinite(dM)) totalDistanceM += dM;
  }

  return {
    totalDurationSec: Math.round(totalDurationSec),
    totalDistanceM: Number.isFinite(totalDistanceM) ? Math.round(totalDistanceM) : null,
  };
}

async function estimateOrderedRouteMetrics(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return { totalDurationSec: null, totalDistanceM: null, source: null };
  }
  const table = await osrmTable(points);
  if (!table?.ok) {
    return { totalDurationSec: null, totalDistanceM: null, source: null };
  }
  const totals = sumSequentialMetrics(points, table);
  return {
    ...totals,
    source: "OSRM_TABLE",
  };
}


function haversineM(a, b) {
  const lat1 = num(a?.lat);
  const lng1 = num(a?.lng);
  const lat2 = num(b?.lat);
  const lng2 = num(b?.lng);
  if (!hasFiniteCoord(lat1, lng1) || !hasFiniteCoord(lat2, lng2)) return 0;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function buildSequentialFallbackMetrics(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return { totalDurationSec: null, totalDistanceM: null, source: null };
  }

  let totalDistanceM = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    totalDistanceM += haversineM(points[i], points[i + 1]);
  }
  if (!(totalDistanceM > 0)) {
    return { totalDurationSec: null, totalDistanceM: null, source: null };
  }

  const assumedSpeedMps = 25 * 1000 / 3600;
  const totalDurationSec = Math.max(60, Math.round(totalDistanceM / assumedSpeedMps));
  return {
    totalDistanceM: Math.round(totalDistanceM),
    totalDurationSec,
    source: 'HAVERSINE_FALLBACK',
  };
}

function normalizeStopRows(stops) {
  return (stops || []).map((stop, idx) => ({
    ...stop,
    id: stop?.bucketKey || stop?.id || `stop:${idx + 1}`,
    title: stop?.title || stop?.name || `Durak ${idx + 1}`,
    order: idx + 1,
  }));
}

async function buildDensePath(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return (points || []).map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
  }
  const routed = await osrmRoute(points);
  if (routed?.ok && Array.isArray(routed.points) && routed.points.length >= 2) {
    return routed.points.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
  }
  return points.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
}

function buildOrderedWaypoints(stops, shift) {
  const hub = buildHub(shift);
  const { mode } = buildRouteMode(shift);
  const routeStops = (stops || []).map((s) => ({ id: s.bucketKey, lat: Number(s.lat), lng: Number(s.lng) }));
  if (!hub) return routeStops;
  if (mode === "LOOP") return [hub, ...routeStops, { id: "__hub__2", lat: hub.lat, lng: hub.lng }];
  if (mode === "OUTBOUND") return [hub, ...routeStops];
  return [...routeStops, hub];
}

export function buildChildStopsFromSlice({ slice, coordMap }) {
  const grouped = new Map();
  let freeIndex = 0;

  for (const unit of slice || []) {
    const point = pointForUnitFromCoordMap(unit, coordMap);
    if (!point) continue;

    const bucketKey = coordBucketKey(
      point,
      Number(unit?.personelId || 0) > 0 ? `personel:${Number(unit.personelId)}` : `free:${++freeIndex}`
    );

    if (!grouped.has(bucketKey)) {
      grouped.set(bucketKey, {
        bucketKey,
        title: stopTitleForUnit(unit, point, grouped.size + 1),
        lat: Number(point.lat),
        lng: Number(point.lng),
        count: 0,
        assignmentCount: 0,
        passengerCount: 0,
        orderHint: Number(unit?.stopMeta?.order || 0) || grouped.size + 1,
        type: stopTypeForUnit(unit),
        state: stopStateForUnit(unit),
        assignmentRows: [],
      });
    }

    const row = grouped.get(bucketKey);
    row.count += 1;
    if (!row.title && point?.title) row.title = point.title;
    if (Number(row.orderHint || 0) <= 0 && Number(unit?.stopMeta?.order || 0) > 0) {
      row.orderHint = Number(unit.stopMeta.order);
    }
    if (!row.type && unit?.stopMeta?.type) row.type = unit.stopMeta.type;
    if (!row.state && unit?.stopMeta?.state) row.state = unit.stopMeta.state;

    const personelId = Number(unit?.personelId || 0);
    if (personelId > 0) {
      row.assignmentCount += 1;
      row.assignmentRows.push({
        personelId,
        walkM: Math.max(0, Number(unit?.walkM || 0) || 0),
      });
    } else {
      row.passengerCount += 1;
    }
  }

  return [...grouped.values()]
    .sort((a, b) => Number(a.orderHint || 0) - Number(b.orderHint || 0))
    .map((row, idx) => ({
      ...row,
      order: idx + 1,
      type: row.type || "COMMON",
      state: row.state || "PENDING",
    }));
}

export async function solveChildRoutePlan({ stops, shift }) {
  let orderedStops = normalizeStopRows(stops);
  let source = "ESTIMATED";
  let totalDistanceM = null;
  let totalDurationSec = null;

  const hub = buildHub(shift);
  const { mode } = buildRouteMode(shift);
  const stopPoints = orderedStops.map((s) => ({ id: s.bucketKey, lat: Number(s.lat), lng: Number(s.lng) }));

  if (orderedStops.length >= 2) {
    let matrixPoints = stopPoints;
    if (hub) matrixPoints = [hub, ...stopPoints];

    const table = await osrmTable(matrixPoints);
    if (table?.ok && Array.isArray(table.durationsSec)) {
      const solved = await solveTsp(table.durationsSec, table.distancesM || null, {
        depotIndex: 0,
        returnToDepot: Boolean(hub && mode === "LOOP"),
        preferOrtools: true,
        timeoutMs: 1800,
      });

      if (solved?.ok && Array.isArray(solved.order)) {
        source = String(solved.solver || "heuristic").toUpperCase();
        totalDistanceM = solved.totalDistanceM ?? null;
        totalDurationSec = solved.totalDurationSec ?? null;

        let stopOrderIdx = solved.order;
        if (hub) stopOrderIdx = stopOrderIdx.filter((idx) => idx !== 0);
        if (hub && mode === "INBOUND") stopOrderIdx = stopOrderIdx.reverse();

        const orderedIds = stopOrderIdx.map((idx) => matrixPoints[idx]?.id).filter(Boolean);
        const byId = new Map(orderedStops.map((s) => [s.bucketKey, s]));
        const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
        if (reordered.length === orderedStops.length) {
          orderedStops = normalizeStopRows(reordered);
        }
      }
    }
  }

  const routeWaypoints = buildOrderedWaypoints(orderedStops, shift);

  if ((totalDistanceM == null || totalDurationSec == null || totalDistanceM <= 0 || totalDurationSec <= 0) && routeWaypoints.length >= 2) {
    const estimated = await estimateOrderedRouteMetrics(routeWaypoints);
    if ((totalDistanceM == null || totalDistanceM <= 0) && estimated.totalDistanceM != null) totalDistanceM = estimated.totalDistanceM;
    if ((totalDurationSec == null || totalDurationSec <= 0) && estimated.totalDurationSec != null) totalDurationSec = estimated.totalDurationSec;
    if (source === "ESTIMATED" && estimated.source) source = estimated.source;
  }

  if ((totalDistanceM == null || totalDurationSec == null || totalDistanceM <= 0 || totalDurationSec <= 0) && routeWaypoints.length >= 2) {
    const fallback = buildSequentialFallbackMetrics(routeWaypoints);
    if ((totalDistanceM == null || totalDistanceM <= 0) && fallback.totalDistanceM != null) totalDistanceM = fallback.totalDistanceM;
    if ((totalDurationSec == null || totalDurationSec <= 0) && fallback.totalDurationSec != null) totalDurationSec = fallback.totalDurationSec;
    if ((source === "ESTIMATED" || source === "OSRM_TABLE") && fallback.source) source = fallback.source;
  }

  const pathPoints = await buildDensePath(routeWaypoints);

  return {
    stops: orderedStops,
    pathPoints,
    sparsePathPoints: routeWaypoints.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })),
    source,
    totalDistanceM,
    totalDurationSec,
  };
}

export async function buildChildPlanFromSlice({ slice, shift, coordMap }) {
  const stops = buildChildStopsFromSlice({ slice, coordMap });
  if (!stops.length) {
    return {
      stops: [],
      pathPoints: [],
      sparsePathPoints: [],
      source: "ESTIMATED",
      totalDistanceM: null,
      totalDurationSec: null,
    };
  }
  return solveChildRoutePlan({ stops, shift });
}

export async function persistChildPlan(tx, { childShiftId, plan }) {
  const shiftId = Number(childShiftId || 0);
  if (!shiftId) throw new Error("persistChildPlan: childShiftId required");

  const stops = Array.isArray(plan?.stops) ? plan.stops : [];
  const createdByBucket = new Map();

  for (let idx = 0; idx < stops.length; idx += 1) {
    const stop = stops[idx];
    const created = await tx.stop.create({
      data: {
        shiftId,
        name: stop?.title || stop?.name || `Split Stop ${idx + 1}`,
        lat: Number(stop?.lat || 0),
        lng: Number(stop?.lng || 0),
        order: idx + 1,
        type: stop?.type || "COMMON",
        state: stop?.state || "PENDING",
      },
    });
    createdByBucket.set(String(stop?.bucketKey || stop?.id || `stop:${idx + 1}`), created);

    const rows = Array.isArray(stop?.assignmentRows) ? stop.assignmentRows : [];
    const data = rows
      .map((row) => ({
        shiftId,
        stopId: created.id,
        personelId: Number(row?.personelId || 0),
        walkM: Math.max(0, Number(row?.walkM || 0) || 0),
      }))
      .filter((row) => row.personelId > 0);

    if (data.length) {
      await tx.stopAssignment.createMany({ data, skipDuplicates: true });
    }
  }

  return createdByBucket;
}

export async function loadFullChildShift(tx, childShiftId) {
  return tx.shift.findUnique({
    where: { id: Number(childShiftId) },
    include: {
      stops: { orderBy: { order: "asc" } },
      progress: true,
      vehicle: true,
      driver: true,
      company: true,
      room: true,
    },
  });
}
