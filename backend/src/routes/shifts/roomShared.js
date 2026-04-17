import prisma from "../../prisma.js";
import { haversineKm } from "../../geo.js";
import {
  buildChildPlanFromSlice,
  loadFullChildShift,
  persistChildPlan,
} from "../../services/dispatchRepack.js";
import { httpError, sendErrorResponse } from "../../errors/http.js";
import { findReservationConflictForRange } from "../../services/reservationConflict.js";
import { buildCapacityConflict } from "../../services/roomPoolPlanner.js";

export function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isValidIso(iso) {
  const t = new Date(String(iso)).getTime();
  return Number.isFinite(t);
}

export async function ensureVehicleDriverScopeOrThrow({ scopeRoomId, vehicleId, driverId }) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, roomId: true, archivedAt: true, capacity: true, plate: true },
  });
  if (!vehicle || vehicle.archivedAt) {
    throw httpError(400, "Vehicle not found/archived");
  }
  if (
    scopeRoomId != null &&
    vehicle.roomId != null &&
    Number(vehicle.roomId) !== Number(scopeRoomId)
  ) {
    throw httpError(403, "Vehicle is not in this room scope");
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, roomId: true, fullName: true, userId: true },
  });
  if (!driver) {
    throw httpError(400, "Driver not found");
  }
  if (
    scopeRoomId != null &&
    driver.roomId != null &&
    Number(driver.roomId) !== Number(scopeRoomId)
  ) {
    throw httpError(403, "Driver is not in this room scope");
  }

  return { vehicle, driver };
}

export async function getConflictOrNull({ driverId, vehicleId, startAt, endAt, excludeShiftId }) {
  return findReservationConflictForRange({
    driverId,
    vehicleId,
    startAt,
    endAt,
    excludeShiftId,
  });
}

export function sendShiftConflict(res, cr, fallbackCode = "SHIFT_CONFLICT", fallbackMessage = "Vehicle/driver conflict") {
  return sendErrorResponse(
    res,
    httpError(409, cr?.code || fallbackCode, cr?.message || fallbackMessage, cr || null),
  );
}

export function sendCapacityConflict(res, capacityConflict) {
  return sendErrorResponse(
    res,
    httpError(
      409,
      capacityConflict?.code || "CAPACITY_CONFLICT",
      capacityConflict?.message || "Vehicle capacity conflict",
      capacityConflict || null,
    ),
  );
}

export function sendPenaltyError(res, err, fallbackCode = "ACTIVE_NO_SHOW_PENALTY", fallbackMessage = "Driver blocked") {
  return sendErrorResponse(
    res,
    httpError(
      Number(err?.status || 409),
      err?.code || fallbackCode,
      err?.message || fallbackMessage,
      err?.penalty != null ? { penalty: err.penalty } : null,
    ),
  );
}

function buildSplitGroupKey(rootShiftId) {
  return `split:${rootShiftId}:${Date.now()}`;
}

async function buildPassengerUnitsForSplit(shiftId, demand) {
  const [stops, people, shiftHead] = await Promise.all([
    prisma.stop.findMany({
      where: { shiftId },
      orderBy: { order: "asc" },
      include: {
        assignments: {
          select: { personelId: true, walkM: true },
          orderBy: [{ personelId: "asc" }],
        },
      },
    }),
    prisma.shiftPersonel.findMany({
      where: { shiftId },
      select: { personelId: true },
      orderBy: { personelId: "asc" },
    }),
    prisma.shift.findUnique({
      where: { id: shiftId },
      select: { organizationPlanId: true },
    }),
  ]);

  const units = [];
  const assignedPersonIds = new Set();

  for (const stop of stops || []) {
    for (const a of stop.assignments || []) {
      const pid = Number(a?.personelId || 0) || null;
      if (pid) assignedPersonIds.add(pid);
      units.push({
        kind: "assignment",
        personelId: pid,
        walkM: Number(a?.walkM || 0) || 0,
        originalStopKey: `stop:${stop.id}`,
        stopMeta: {
          id: Number(stop.id),
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          order: Number(stop.order || 0),
          type: stop.type,
          state: stop.state,
        },
      });
    }
  }

  if (!units.length && (people || []).length) {
    for (const row of people) {
      const pid = Number(row?.personelId || 0) || null;
      if (pid) assignedPersonIds.add(pid);
      units.push({
        kind: "personel",
        personelId: pid,
        walkM: 0,
        originalStopKey: null,
        stopMeta: null,
      });
    }
  }

  if (!units.length && shiftHead?.organizationPlanId) {
    const orgStops = await prisma.organizationStop.findMany({
      where: { planId: shiftHead.organizationPlanId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, lat: true, lng: true, order: true, passengerCount: true },
    });
    for (let idx = 0; idx < orgStops.length; idx += 1) {
      const org = orgStops[idx];
      const baseStop = (stops || [])[idx] || null;
      const count = Math.max(0, Number(org?.passengerCount || 0));
      for (let i = 0; i < count; i += 1) {
        units.push({
          kind: "org",
          personelId: null,
          walkM: 0,
          originalStopKey: baseStop ? `stop:${baseStop.id}` : `org:${org.id}`,
          stopMeta: {
            id: baseStop ? Number(baseStop.id) : Number(org.id),
            name: baseStop?.name || org.name,
            lat: baseStop?.lat ?? org.lat,
            lng: baseStop?.lng ?? org.lng,
            order: Number(baseStop?.order ?? org.order ?? idx + 1),
            type: baseStop?.type || "COMMON",
            state: baseStop?.state || "PENDING",
          },
        });
      }
    }
  }

  if (!units.length) {
    const fallbackCount = Math.max(0, Number(demand?.requiredPax || 0));
    for (let i = 0; i < fallbackCount; i += 1) {
      units.push({ kind: "generic", personelId: null, walkM: 0, originalStopKey: null, stopMeta: null });
    }
  }

  return { units, rootStops: stops || [], assignedPersonIds: [...assignedPersonIds] };
}

function haversineM(a, b) {
  return Math.round(haversineKm(Number(a?.lat || 0), Number(a?.lng || 0), Number(b?.lat || 0), Number(b?.lng || 0)) * 1000);
}

async function loadShiftPersonCoordMap(shiftId) {
  const rows = await prisma.shiftPersonel.findMany({
    where: { shiftId },
    include: {
      personel: {
        select: { id: true, fullName: true, homeLat: true, homeLng: true },
      },
    },
    orderBy: { id: "asc" },
  });
  const m = new Map();
  for (const row of rows || []) {
    const pid = Number(row?.personel?.id || 0);
    const lat = Number(row?.personel?.homeLat);
    const lng = Number(row?.personel?.homeLng);
    if (!pid || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    m.set(pid, {
      personelId: pid,
      title: row?.personel?.fullName || `#${pid}`,
      lat,
      lng,
    });
  }
  return m;
}

function pointForUnit(unit, coordMap) {
  const stopLat = Number(unit?.stopMeta?.lat);
  const stopLng = Number(unit?.stopMeta?.lng);
  if (Number.isFinite(stopLat) && Number.isFinite(stopLng)) {
    return {
      lat: stopLat,
      lng: stopLng,
      title: unit?.stopMeta?.name || unit?.originalStopKey || "Durak",
    };
  }
  const pid = Number(unit?.personelId || 0);
  const person = pid ? coordMap.get(pid) : null;
  if (person) return { lat: person.lat, lng: person.lng, title: person.title || `#${pid}` };
  return null;
}

function buildSeedPoints(points, count) {
  const src = (points || []).filter(Boolean);
  if (!src.length || count <= 0) return [];
  const seeds = [src[0]];
  while (seeds.length < count && seeds.length < src.length) {
    let best = null;
    let bestScore = -1;
    for (const p of src) {
      if (seeds.some((s) => Number(s.__unitIndex) === Number(p.__unitIndex))) continue;
      const nearest = Math.min(...seeds.map((s) => haversineM(p, s)));
      if (nearest > bestScore) {
        bestScore = nearest;
        best = p;
      }
    }
    if (!best) break;
    seeds.push(best);
  }
  return seeds;
}

function buildBucketsFromUnits(units, comboItems, coordMap) {
  const items = (comboItems || []).map((item, idx) => ({
    groupKey: null,
    splitIndex: idx + 1,
    splitTotal: comboItems.length,
    vehicleId: Number(item?.id || 0),
    driverId: Number(item?.suggestedDriver?.id || 0),
    capacity: Math.max(0, Number(item?.capacity || 0)),
    allocatedPax: Math.max(0, Number(item?.allocatedPax || 0)),
    units: [],
    centroid: null,
  })).filter((x) => x.vehicleId && x.driverId && x.allocatedPax > 0);

  if (!items.length) return [];

  const decorated = (units || []).map((u, idx) => ({
    ...u,
    __unitIndex: idx,
    point: pointForUnit(u, coordMap),
  }));
  const coordUnits = decorated.filter((u) => u.point);
  const noCoordUnits = decorated.filter((u) => !u.point);

  const seeds = buildSeedPoints(coordUnits.map((u) => ({ ...u.point, __unitIndex: u.__unitIndex })), items.length);
  const seededIndexes = new Set();
  for (let i = 0; i < items.length; i += 1) {
    const seed = seeds[i] || null;
    if (!seed) continue;
    const unit = decorated.find((u) => Number(u.__unitIndex) === Number(seed.__unitIndex));
    if (!unit) continue;
    items[i].units.push(unit);
    items[i].centroid = { lat: unit.point.lat, lng: unit.point.lng };
    seededIndexes.add(unit.__unitIndex);
  }

  const remainingCoord = coordUnits.filter((u) => !seededIndexes.has(u.__unitIndex));
  remainingCoord.sort((a, b) => {
    const aNear = Math.min(...items.map((bucket) => bucket.centroid ? haversineM(a.point, bucket.centroid) : Infinity));
    const bNear = Math.min(...items.map((bucket) => bucket.centroid ? haversineM(b.point, bucket.centroid) : Infinity));
    return bNear - aNear;
  });

  function recalcCentroid(bucket) {
    const pts = bucket.units.filter((u) => u.point).map((u) => u.point);
    if (!pts.length) return bucket.centroid;
    const lat = pts.reduce((s, p) => s + Number(p.lat || 0), 0) / pts.length;
    const lng = pts.reduce((s, p) => s + Number(p.lng || 0), 0) / pts.length;
    bucket.centroid = { lat, lng };
    return bucket.centroid;
  }

  for (const unit of remainingCoord) {
    const candidates = items.filter((bucket) => bucket.units.length < bucket.allocatedPax);
    if (!candidates.length) break;
    candidates.sort((a, b) => {
      const da = a.centroid ? haversineM(unit.point, a.centroid) : Infinity;
      const db = b.centroid ? haversineM(unit.point, b.centroid) : Infinity;
      if (da !== db) return da - db;
      return Number(a.splitIndex || 0) - Number(b.splitIndex || 0);
    });
    candidates[0].units.push(unit);
    recalcCentroid(candidates[0]);
  }

  const leftovers = noCoordUnits.concat(remainingCoord.filter((u) => !items.some((b) => b.units.some((x) => x.__unitIndex === u.__unitIndex))));
  for (const unit of leftovers) {
    const candidates = items.filter((bucket) => bucket.units.length < bucket.allocatedPax);
    if (!candidates.length) break;
    candidates.sort((a, b) => (b.allocatedPax - b.units.length) - (a.allocatedPax - a.units.length));
    candidates[0].units.push(unit);
    recalcCentroid(candidates[0]);
  }

  for (const bucket of items) {
    if (bucket.units.length) continue;
    const donor = items
      .filter((x) => x.units.length > 1)
      .sort((a, b) => b.units.length - a.units.length)[0];
    if (donor) {
      const moved = donor.units.pop();
      if (moved) bucket.units.push(moved);
    }
  }

  return items.map((bucket) => ({
    ...bucket,
    slice: bucket.units.map((u) => {
      const copy = { ...u };
      delete copy.point;
      delete copy.__unitIndex;
      return copy;
    }),
  }));
}

async function buildPreviewStopsForSlice(slice, shift, coordMap) {
  return buildChildPlanFromSlice({ slice, shift, coordMap });
}

function ensurePreviewMetrics(preview, shift) {
  const next = preview && typeof preview === "object" ? { ...preview } : { stops: [] };
  const stops = Array.isArray(next.stops) ? next.stops : [];
  const currentDistance = Number(next.totalDistanceM);
  const currentDuration = Number(next.totalDurationSec);
  const hasPositiveDistance = Number.isFinite(currentDistance) && currentDistance > 0;
  const hasPositiveDuration = Number.isFinite(currentDuration) && currentDuration > 0;
  if (!stops.length || (hasPositiveDistance && hasPositiveDuration)) return next;

  const direction = String(shift?.direction || "INBOUND").toUpperCase();
  const pattern = String(shift?.pattern || "ONE_WAY").toUpperCase();
  const hubLat = Number(shift?.hubLat);
  const hubLng = Number(shift?.hubLng);
  const hubOk = Number.isFinite(hubLat) && Number.isFinite(hubLng);
  const stopPts = stops
    .map((s) => ({ lat: Number(s?.lat), lng: Number(s?.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  let routePts = stopPts;
  if (hubOk && pattern === "LOOP") routePts = [{ lat: hubLat, lng: hubLng }, ...stopPts, { lat: hubLat, lng: hubLng }];
  else if (hubOk && direction === "OUTBOUND") routePts = [{ lat: hubLat, lng: hubLng }, ...stopPts];
  else if (hubOk) routePts = [...stopPts, { lat: hubLat, lng: hubLng }];

  if (routePts.length >= 2) {
    let distM = 0;
    for (let i = 0; i < routePts.length - 1; i += 1) {
      distM += haversineM(routePts[i], routePts[i + 1]);
    }
    if (distM > 0) {
      const durationSec = Math.max(60, Math.round(distM / (25 * 1000 / 3600)));
      if (!hasPositiveDistance) next.totalDistanceM = Math.round(distM);
      if (!hasPositiveDuration) next.totalDurationSec = durationSec;
      if (!Array.isArray(next.pathPoints) || next.pathPoints.length < 2) next.pathPoints = routePts.map((p) => ({ lat: p.lat, lng: p.lng }));
      if (!Array.isArray(next.sparsePathPoints) || next.sparsePathPoints.length < 2) next.sparsePathPoints = routePts.map((p) => ({ lat: p.lat, lng: p.lng }));
      if (!next.source || next.source === "ESTIMATED" || next.source === "OSRM_TABLE") {
        next.source = "HAVERSINE_PREVIEW_FALLBACK";
      }
    }
  }

  return next;
}

export async function buildDispatchSplitPlan({ shift, demand, pool }) {
  const comboItems = Array.isArray(pool?.suggestedCombo?.items) ? pool.suggestedCombo.items : [];
  if (!pool?.enoughPoolCapacity || comboItems.length < 2) {
    throw httpError(409, "Dispatch preview requires at least 2 matched pool pairs");
  }
  const { units } = await buildPassengerUnitsForSplit(shift.id, demand);
  const coordMap = await loadShiftPersonCoordMap(shift.id);
  const buckets = buildBucketsFromUnits(units, comboItems, coordMap);
  const groupKey = buildSplitGroupKey(shift.id);
  return Promise.all(buckets.map(async (bucket) => {
    const previewRaw = await buildPreviewStopsForSlice(bucket.slice, shift, coordMap);
    const preview = ensurePreviewMetrics(previewRaw, shift);
    return {
      groupKey,
      splitIndex: bucket.splitIndex,
      splitTotal: buckets.length,
      vehicleId: bucket.vehicleId,
      driverId: bucket.driverId,
      capacity: bucket.capacity,
      allocatedPax: bucket.slice.length,
      slice: bucket.slice,
      preview,
    };
  }));
}

export async function applyDispatchOverrides({ splitPlan, overrides, shift }) {
  const raw = Array.isArray(overrides) ? overrides : [];
  if (!raw.length) return splitPlan;

  const byIndex = new Map();
  for (const row of raw) {
    const splitIndex = Number(row?.splitIndex || 0);
    if (!splitIndex) continue;
    const vehicleId = Number(row?.vehicleId || 0);
    const driverId = Number(row?.driverId || 0);
    byIndex.set(splitIndex, { splitIndex, vehicleId, driverId });
  }
  if (!byIndex.size) return splitPlan;

  const seenVehicleIds = new Set();
  const seenDriverIds = new Set();
  const next = [];

  for (const part of splitPlan) {
    const ov = byIndex.get(Number(part?.splitIndex || 0)) || null;
    const vehicleId = Number(ov?.vehicleId || part?.vehicleId || 0);
    const driverId = Number(ov?.driverId || part?.driverId || 0);
    if (!vehicleId || !driverId) {
      throw httpError(409, `Dispatch seçimleri eksik (#${Number(part?.splitIndex || 0)})`);
    }
    if (seenVehicleIds.has(vehicleId)) {
      throw httpError(409, `Aynı araç birden fazla öneride seçildi (#${vehicleId})`);
    }
    if (seenDriverIds.has(driverId)) {
      throw httpError(409, `Aynı şoför birden fazla öneride seçildi (#${driverId})`);
    }

    const { vehicle, driver } = await ensureVehicleDriverScopeOrThrow({
      scopeRoomId: Number(shift.roomId),
      vehicleId,
      driverId,
    });

    const capacityConflict = buildCapacityConflict({
      requiredPax: Number(part?.allocatedPax || 0),
      vehicleCapacity: Number(vehicle?.capacity || 0),
    });
    if (capacityConflict?.blockCode) {
      throw httpError(409, capacityConflict.blockMessage || "Selected vehicle capacity is not enough");
    }

    const cr = await getConflictOrNull({
      vehicleId,
      driverId,
      startAt: shift.startAt,
      endAt: shift.endAt,
      excludeShiftId: shift.id,
    });
    if (cr) {
      throw httpError(409, cr.message || "Vehicle/driver conflict");
    }

    seenVehicleIds.add(vehicleId);
    seenDriverIds.add(driverId);
    next.push({
      ...part,
      vehicleId,
      driverId,
      capacity: Number(vehicle?.capacity || part?.capacity || 0),
      vehicle,
      driver,
    });
  }
  return next;
}

export async function createChildShiftFromSlice(tx, rootShift, splitMeta, unitSlice) {
  const child = await tx.shift.create({
    data: {
      companyId: rootShift.companyId,
      roomId: rootShift.roomId,
      vehicleId: splitMeta.vehicleId,
      driverId: splitMeta.driverId,
      startAt: rootShift.startAt,
      endAt: rootShift.endAt,
      status: "APPROVED",
      requiredPaxOverride: splitMeta.allocatedPax,
      splitRootId: rootShift.id,
      splitGroupKey: splitMeta.groupKey,
      splitIndex: splitMeta.splitIndex,
      splitTotal: splitMeta.splitTotal,
      hubLat: rootShift.hubLat,
      hubLng: rootShift.hubLng,
      direction: rootShift.direction,
      pattern: rootShift.pattern,
      companyOfferVehicleId: splitMeta.vehicleId,
      companyOfferAmount: rootShift.companyOfferAmount,
      companyOfferNote: rootShift.companyOfferNote,
      roomOfferVehicleId: null,
      roomOfferAmount: null,
      roomOfferNote: null,
      roomOfferToDriver: false,
      roomOfferDriverNote: null,
      roomOfferDecision: rootShift.roomOfferDecision,
      roomOfferDecisionNote: rootShift.roomOfferDecisionNote,
      roomOfferDecisionAt: rootShift.roomOfferDecisionAt,
      extendRequestedEndAt: rootShift.extendRequestedEndAt,
      extendRequestedAt: rootShift.extendRequestedAt,
      extendDecision: rootShift.extendDecision,
      extendNoteCompany: rootShift.extendNoteCompany,
      extendNoteRoom: rootShift.extendNoteRoom,
      extendDecisionAt: rootShift.extendDecisionAt,
    },
  });

  const personelIds = Array.from(
    new Set(unitSlice.map((u) => Number(u?.personelId || 0)).filter((x) => x > 0)),
  );
  if (personelIds.length) {
    await tx.shiftPersonel.createMany({
      data: personelIds.map((personelId) => ({ shiftId: child.id, personelId })),
      skipDuplicates: true,
    });
  }

  const plan = splitMeta?.preview || { stops: [] };
  await persistChildPlan(tx, { childShiftId: child.id, plan });
  return loadFullChildShift(tx, child.id);
}
