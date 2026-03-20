// backend/src/routes/shifts/room.js
import prisma from "../../prisma.js";
import { haversineKm } from "../../geo.js";
import {
  buildChildPlanFromSlice,
  loadFullChildShift,
  persistChildPlan,
} from "../../services/dispatchRepack.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";
import { createNotification, createAndEmitNotification } from "../../notifications/service.js";
import { assertDriverAssignable } from "../../lib/penalties.js";
import { buildNotifPayloadV1 } from "../../notifications/payloadV1.js";

import {
  approveShiftSchema,
  assignShiftSchema,
  rejectShiftSchema,
  roomOfferSchema,
  extendShiftDecisionSchema,
} from "./schemas.js";

// Avoid named imports from helpers to prevent hard crashes at module-load time in edge environments.
import * as H from "./helpers.js";

const clusterPoints = H.clusterPoints;
const emitShift = H.emitShift;
const getShiftAndCheckScopeOrThrow = H.getShiftAndCheckScopeOrThrow;
const resolveRequestDelegateSafe = H.resolveRequestDelegateSafe;

import {
  checkShiftConflicts,
  conflictResponse,
} from "../../services/shiftConflict.js";
import {
  getShiftDemandSnapshot,
  buildCapacityConflict,
  buildRoomPoolSummary,
} from "../../services/roomPoolPlanner.js";

// ROOM + SUPER_ADMIN endpoints (approve/reject/start/room-offer + M7 suggestions)
export function attachShiftRoomRoutes(r, io) {
  // -------------------------
  // shared helpers (M14 SSOT)
  // -------------------------
  const httpError = (status, message) => {
    const e = new Error(message);
    e.status = status;
    return e;
  };

  const toInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const isValidIso = (iso) => {
    const t = new Date(String(iso)).getTime();
    return Number.isFinite(t);
  };

  async function ensureVehicleDriverScopeOrThrow({ scopeRoomId, vehicleId, driverId }) {
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

  async function getConflictOrNull({ driverId, vehicleId, startAt, endAt, excludeShiftId }) {
    const conflicts = await checkShiftConflicts({
      driverId,
      vehicleId,
      startAt,
      endAt,
      excludeShiftId,
    });
    const cr = conflictResponse(conflicts);
    return cr || null;
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

  function isFiniteCoord(v) {
    return typeof v === "number" && Number.isFinite(v);
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

    // rebalance: move from overfull to empty if needed
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
      slice: bucket.units.map((u) => { const copy = { ...u }; delete copy.point; delete copy.__unitIndex; return copy; }),
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

  async function buildDispatchSplitPlan({ shift, demand, pool }) {
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

  async function applyDispatchOverrides({ splitPlan, overrides, shift }) {
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
        throw httpError(409, capacityConflict.blockMessage || 'Selected vehicle capacity is not enough');
      }

      const cr = await getConflictOrNull({
        vehicleId,
        driverId,
        startAt: shift.startAt,
        endAt: shift.endAt,
        excludeShiftId: shift.id,
      });
      if (cr) {
        throw httpError(409, cr.message || 'Vehicle/driver conflict');
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

  async function createChildShiftFromSlice(tx, rootShift, splitMeta, unitSlice) {
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
      new Set(unitSlice.map((u) => Number(u?.personelId || 0)).filter((x) => x > 0))
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

  // -------------------------
  // M14: Availability endpoint
  // -------------------------
  // ROOM/SUPER_ADMIN:
  // GET /api/availability?driverId=..&vehicleId=..&startAt=..&endAt=..&excludeShiftId=..
  r.get(
    "/availability",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const driverId = toInt(req.query.driverId);
        const vehicleId = toInt(req.query.vehicleId);
        const startAt = String(req.query.startAt ?? "");
        const endAt = String(req.query.endAt ?? "");
        const excludeShiftId = toInt(req.query.excludeShiftId);

        if (!driverId || !vehicleId) {
          return res.status(400).json({ error: "driverId/vehicleId required" });
        }
        if (!startAt || !endAt || !isValidIso(startAt) || !isValidIso(endAt)) {
          return res.status(400).json({ error: "startAt/endAt invalid" });
        }
        const a0 = new Date(startAt).getTime();
        const a1 = new Date(endAt).getTime();
        if (!(a0 < a1)) {
          return res.status(400).json({ error: "startAt must be < endAt" });
        }

        // scopeRoomId:
        // - ROOM ise req.user.roomId üzerinden scope'la
        // - SUPER_ADMIN ise scopeRoomId null kalsın (daha esnek)
        const scopeRoomId =
          req.user?.role === "ROOM" ? toInt(req.user?.roomId) : null;

        // validate that vehicle/driver are in scope (same room)
        await ensureVehicleDriverScopeOrThrow({
          scopeRoomId,
          vehicleId,
          driverId,
        });

        const cr = await getConflictOrNull({
          driverId,
          vehicleId,
          startAt,
          endAt,
          excludeShiftId: excludeShiftId || null,
        });

        if (cr) {
          return res.status(409).json({ ok: false, ...cr });
        }
        return res.json({ ok: true });
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );


  const REASSIGN_REASON_TR = {
    VEHICLE_BREAKDOWN: "Araç arızası",
    VEHICLE_UNAVAILABLE: "Araç kullanılamıyor",
    DRIVER_SICK: "Sürücü hastalandı",
    DRIVER_UNAVAILABLE: "Sürücü müsait değil",
    OPS_REALLOCATION: "Operasyon yeniden planlandı",
    OTHER: "Diğer",
  };

  async function emitReassignNotifications({ before, after, reason, note }) {
    const reasonLabel = REASSIGN_REASON_TR[String(reason || "OTHER")] || "Operasyon değişikliği";
    const shiftLabel = `Shift #${after.id}`;
    const vehicleBefore = before?.vehicle?.plate || (before?.vehicleId ? `#${before.vehicleId}` : "-");
    const vehicleAfter = after?.vehicle?.plate || (after?.vehicleId ? `#${after.vehicleId}` : "-");
    const driverBefore = before?.driver?.fullName || (before?.driverId ? `#${before.driverId}` : "-");
    const driverAfter = after?.driver?.fullName || (after?.driverId ? `#${after.driverId}` : "-");
    const baseMessage = `${shiftLabel}: ${reasonLabel}. Araç ${vehicleBefore} → ${vehicleAfter}, sürücü ${driverBefore} → ${driverAfter}${note ? ` • ${note}` : ""}`;

    await createAndEmitNotification({
      io,
      type: "SHIFT_REASSIGN",
      scope: "COMPANY",
      companyId: after.companyId,
      roomId: after.roomId || null,
      shiftId: after.id,
      vehicleId: after.vehicleId || null,
      payload: buildNotifPayloadV1({
        title: "Vardiya ataması değişti",
        message: baseMessage,
        vehicleId: after.vehicleId || null,
        kind: "SHIFT_REASSIGN",
      }),
    });

    if (after.roomId) {
      await createAndEmitNotification({
        io,
        type: "SHIFT_REASSIGN",
        scope: "ROOM",
        companyId: after.companyId,
        roomId: after.roomId,
        shiftId: after.id,
        vehicleId: after.vehicleId || null,
        payload: buildNotifPayloadV1({
          title: "Vardiya ataması güncellendi",
          message: baseMessage,
          vehicleId: after.vehicleId || null,
          kind: "SHIFT_REASSIGN",
        }),
      });
    }

    const beforeDriverUserId = Number(before?.driver?.userId || 0) || null;
    const afterDriverUserId = Number(after?.driver?.userId || 0) || null;

    if (afterDriverUserId) {
      await createAndEmitNotification({
        io,
        type: "SHIFT_REASSIGN",
        scope: "DRIVER",
        companyId: after.companyId,
        roomId: after.roomId || null,
        driverId: after.driverId || null,
        shiftId: after.id,
        vehicleId: after.vehicleId || null,
        userId: afterDriverUserId,
        payload: buildNotifPayloadV1({
          title: "Yeni görev atandı",
          message: `${shiftLabel}: ${vehicleAfter} aracı ve görev bilgileri size aktarıldı.${note ? ` • ${note}` : ""}`,
          vehicleId: after.vehicleId || null,
          kind: "SHIFT_REASSIGN",
        }),
      });
      io?.to?.(`user:${afterDriverUserId}`)?.emit?.("shift:update", { shiftId: after.id, action: "reassign", kind: "shift:update" });
      io?.to?.(`user:${afterDriverUserId}`)?.emit?.("route:plan", { shiftId: after.id, action: "reassign", kind: "route:plan" });
    }

    if (beforeDriverUserId && beforeDriverUserId !== afterDriverUserId) {
      await createAndEmitNotification({
        io,
        type: "SHIFT_REASSIGN",
        scope: "DRIVER",
        companyId: after.companyId,
        roomId: after.roomId || null,
        driverId: before.driverId || null,
        shiftId: after.id,
        vehicleId: before.vehicleId || null,
        userId: beforeDriverUserId,
        payload: buildNotifPayloadV1({
          title: "Görev sizden alındı",
          message: `${shiftLabel}: görev başka sürücüye aktarıldı. Neden: ${reasonLabel}${note ? ` • ${note}` : ""}`,
          vehicleId: before.vehicleId || null,
          kind: "SHIFT_REASSIGN",
        }),
      });
      io?.to?.(`user:${beforeDriverUserId}`)?.emit?.("shift:update", { shiftId: after.id, action: "reassign-removed", kind: "shift:update" });
      io?.to?.(`user:${beforeDriverUserId}`)?.emit?.("route:plan", { shiftId: after.id, action: "reassign-removed", kind: "route:plan" });
    }
  }

  // -------------------------
  // ROOM: approve/assign helpers
  // -------------------------
  async function approveOrAssign(req, res, { auditAction }) {
    try {
      const shiftId = Number(req.params.id);
      if (!Number.isFinite(shiftId))
        return res.status(400).json({ error: "bad shiftId" });

      // schema differs (approve vs assign) but both contain vehicleId/driverId
      const body = validateWithZod(
        auditAction === "SHIFT_ASSIGN" ? assignShiftSchema : approveShiftSchema,
        req.body
      );

      const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        // ✅ M54: Agreement kaynaklı shiftlerde pazarlık/offer kapalı
        if (shift?.agreementId) {
          return res.status(409).json({
            error: "Agreement shift: offers disabled",
            code: "AGREEMENT_NO_OFFERS",
          });
        }

      if (shift.status === "ACTIVE") {
        return res
          .status(400)
          .json({ error: "Cannot approve/assign while shift is ACTIVE" });
      }

      const vehicleId = Number(body.vehicleId);
      const driverId = Number(body.driverId);
      if (!Number.isFinite(vehicleId) || !Number.isFinite(driverId)) {
        return res.status(400).json({ error: "vehicleId/driverId required" });
      }

      // scope validation: vehicle and driver must belong to this shift's room
      const { vehicle } = await ensureVehicleDriverScopeOrThrow({
        scopeRoomId: Number(shift.roomId),
        vehicleId,
        driverId,
      });

      const demand = await getShiftDemandSnapshot(shift.id);
      const capacityConflict = buildCapacityConflict({
        requiredPax: demand?.requiredPax ?? 0,
        vehicleCapacity: vehicle?.capacity ?? 0,
      });
      if (capacityConflict) return res.status(409).json(capacityConflict);

      // conflict checks: driver/vehicle overlap (ACTIVE or APPROVED)
      const cr = await getConflictOrNull({
        driverId,
        vehicleId,
        startAt: shift.startAt,
        endAt: shift.endAt,
        excludeShiftId: shift.id,
      });
      if (cr) return res.status(409).json(cr);
      try {
        await assertDriverAssignable({ driverId, shiftId: shift.id, at: shift.startAt });
      } catch (e) {
        return res.status(e?.status || 409).json({ error: e?.message || 'Driver blocked', code: e?.code || 'ACTIVE_NO_SHOW_PENALTY', penalty: e?.penalty || null });
      }

      const updated = await prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: "APPROVED",
          vehicleId,
          driverId,
        },
        include: {
          stops: { orderBy: { order: "asc" } },
          progress: true,
          vehicle: true,
          driver: true,
          company: true,
          room: true,
        },
      });

      await audit(req, {
        action: auditAction,
        entity: "Shift",
        entityId: updated.id,
        meta: { vehicleId, driverId },
      });

      emitShift(io, updated, "shift:update");
      emitShift(io, updated, "route:plan");
      return res.json(updated);
    } catch (e) {
      return res
        .status(e?.status ?? 500)
        .json({ error: String(e?.message ?? e) });
    }
  }


  r.put(
    "/:id/reassign",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user, {
          include: { vehicle: true, driver: { include: { user: true } }, company: true, room: true },
        });

        const status = String(shift?.status || "").toUpperCase();
        if (!["APPROVED", "ACTIVE"].includes(status)) {
          return res.status(409).json({ error: "Only APPROVED/ACTIVE shifts can be reassigned", code: "SHIFT_REASSIGN_STATUS" });
        }

        const vehicleId = Number(req.body?.vehicleId);
        const driverId = Number(req.body?.driverId);
        const reason = String(req.body?.reason || "OTHER").trim().toUpperCase();
        const note = String(req.body?.note || "").trim() || null;
        if (!Number.isFinite(vehicleId) || !Number.isFinite(driverId)) {
          return res.status(400).json({ error: "vehicleId/driverId required" });
        }
        if (!reason) return res.status(400).json({ error: "reason required" });
        if (Number(shift.vehicleId || 0) === vehicleId && Number(shift.driverId || 0) === driverId) {
          return res.status(400).json({ error: "No change detected", code: "SHIFT_REASSIGN_NO_CHANGE" });
        }

        const { vehicle, driver } = await ensureVehicleDriverScopeOrThrow({ scopeRoomId: Number(shift.roomId), vehicleId, driverId });

        const demand = await getShiftDemandSnapshot(shift.id);
        const capacityConflict = buildCapacityConflict({
          requiredPax: demand?.requiredPax ?? 0,
          vehicleCapacity: vehicle?.capacity ?? 0,
        });
        if (capacityConflict) return res.status(409).json(capacityConflict);

        const cr = await getConflictOrNull({
          driverId,
          vehicleId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          excludeShiftId: shift.id,
        });
        if (cr) return res.status(409).json(cr);

        try {
          await assertDriverAssignable({ driverId, shiftId: shift.id, at: shift.startAt });
        } catch (e) {
          return res.status(e?.status || 409).json({ error: e?.message || 'Driver blocked', code: e?.code || 'ACTIVE_NO_SHOW_PENALTY', penalty: e?.penalty || null });
        }

        const updated = await prisma.shift.update({
          where: { id: shiftId },
          data: { vehicleId, driverId },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: { include: { user: true } },
            company: true,
            room: true,
          },
        });

        const meta = {
          reason,
          note,
          from: {
            vehicleId: shift.vehicleId || null,
            vehiclePlate: shift.vehicle?.plate || null,
            driverId: shift.driverId || null,
            driverName: shift.driver?.fullName || null,
          },
          to: {
            vehicleId: updated.vehicleId || null,
            vehiclePlate: updated.vehicle?.plate || null,
            driverId: updated.driverId || null,
            driverName: updated.driver?.fullName || null,
          },
        };

        await audit(req, {
          action: "SHIFT_REASSIGN",
          entity: "Shift",
          entityId: updated.id,
          meta,
        });

        await emitReassignNotifications({ before: shift, after: updated, reason, note });

        emitShift(io, updated, "shift:update", { action: "reassign", reason });
        emitShift(io, updated, "route:plan", { action: "reassign", reason });
        return res.json({ ok: true, shift: updated, event: meta });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );

  // ROOM: approve shift (bind vehicle+driver) -> sets status APPROVED
  r.put(
    "/:id/approve",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    (req, res) => approveOrAssign(req, res, { auditAction: "SHIFT_APPROVE" })
  );
  // Support both PUT and POST for approve (scripts expect POST)
  r.post(
    "/:id/approve",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    (req, res) => approveOrAssign(req, res, { auditAction: "SHIFT_APPROVE" })
  );

  // ROOM: assign shift (backward compatible alias)
  // Some gate scripts call `/api/shifts/:id/assign`.
  // We treat it as `APPROVED` + bind vehicle/driver.
  r.put(
    "/:id/assign",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    (req, res) => approveOrAssign(req, res, { auditAction: "SHIFT_ASSIGN" })
  );

  // ROOM: geo + osrm dispatch preview using room pool combination
  r.get(
    "/:id/dispatch-preview",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);
        if (!shift.roomId) return res.status(400).json({ error: "Shift has no roomId" });
        if (shift.status === "SPLIT") return res.status(409).json({ error: "Shift already split" });
        if (shift.status === "DONE") return res.status(409).json({ error: "Shift already done" });

        const demand = await getShiftDemandSnapshot(shift.id);
        const pool = await buildRoomPoolSummary({ shiftId: shift.id });
        const splitPlan = await buildDispatchSplitPlan({ shift, demand, pool });

        const vehicleMap = new Map((pool?.vehicles || []).map((x) => [Number(x.id), x]));
        const driverMap = new Map((pool?.drivers || []).map((x) => [Number(x.id), x]));

        return res.json({
          ok: true,
          shiftId: shift.id,
          requiredPax: Number(demand?.requiredPax || 0),
          groupKey: splitPlan?.[0]?.groupKey || null,
          suggestions: splitPlan.map((part) => ({
            splitIndex: part.splitIndex,
            splitTotal: part.splitTotal,
            vehicleId: part.vehicleId,
            driverId: part.driverId,
            vehicle: vehicleMap.get(Number(part.vehicleId)) || null,
            driver: driverMap.get(Number(part.driverId)) || null,
            allocatedPax: Number(part.allocatedPax || 0),
            capacity: Number(part.capacity || 0),
            stopCount: Number(part?.preview?.stops?.length || 0),
            routeSource: part?.preview?.source || "ESTIMATED",
            totalDistanceM: part?.preview?.totalDistanceM ?? null,
            totalDurationSec: part?.preview?.totalDurationSec ?? null,
            stops: part?.preview?.stops || [],
            path: { points: part?.preview?.pathPoints || [], source: part?.preview?.source || "ESTIMATED" },
            summary: {
              stopCount: Number(part?.preview?.stops?.length || 0),
              totalPassengerCount: Number(part.allocatedPax || 0),
              direction: String(shift.direction || "INBOUND").toUpperCase(),
              pattern: String(shift.pattern || "ONE_WAY").toUpperCase(),
              startLabel: (String(shift.pattern || "").toUpperCase() === "LOOP" || String(shift.direction || "").toUpperCase() === "OUTBOUND") ? "HUB" : "FIRST_STOP",
              endLabel: String(shift.pattern || "").toUpperCase() === "LOOP" ? "HUB" : (String(shift.direction || "").toUpperCase() === "OUTBOUND" ? "LAST_STOP" : "HUB"),
            },
          })),
        });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );

  r.post(
    "/:id/dispatch-preview",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);
        if (!shift.roomId) return res.status(400).json({ error: "Shift has no roomId" });
        if (shift.status === "SPLIT") return res.status(409).json({ error: "Shift already split" });
        if (shift.status === "DONE") return res.status(409).json({ error: "Shift already done" });

        const demand = await getShiftDemandSnapshot(shift.id);
        const pool = await buildRoomPoolSummary({ shiftId: shift.id });
        let splitPlan = await buildDispatchSplitPlan({ shift, demand, pool });
        splitPlan = await applyDispatchOverrides({ splitPlan, overrides: req.body?.overrides, shift });

        const vehicleMap = new Map((pool?.vehicles || []).map((x) => [Number(x.id), x]));
        const driverMap = new Map((pool?.drivers || []).map((x) => [Number(x.id), x]));

        return res.json({
          ok: true,
          shiftId: shift.id,
          requiredPax: Number(demand?.requiredPax || 0),
          groupKey: splitPlan?.[0]?.groupKey || null,
          suggestions: splitPlan.map((part) => ({
            splitIndex: part.splitIndex,
            splitTotal: part.splitTotal,
            vehicleId: part.vehicleId,
            driverId: part.driverId,
            vehicle: part?.vehicle || vehicleMap.get(Number(part.vehicleId)) || null,
            driver: part?.driver || driverMap.get(Number(part.driverId)) || null,
            allocatedPax: Number(part.allocatedPax || 0),
            capacity: Number(part.capacity || 0),
            stopCount: Number(part?.preview?.stops?.length || 0),
            routeSource: part?.preview?.source || "ESTIMATED",
            totalDistanceM: part?.preview?.totalDistanceM ?? null,
            totalDurationSec: part?.preview?.totalDurationSec ?? null,
            stops: part?.preview?.stops || [],
            path: { points: part?.preview?.pathPoints || [], source: part?.preview?.source || "ESTIMATED" },
            summary: {
              stopCount: Number(part?.preview?.stops?.length || 0),
              totalPassengerCount: Number(part.allocatedPax || 0),
              direction: String(shift.direction || "INBOUND").toUpperCase(),
              pattern: String(shift.pattern || "ONE_WAY").toUpperCase(),
              startLabel: (String(shift.pattern || "").toUpperCase() === "LOOP" || String(shift.direction || "").toUpperCase() === "OUTBOUND") ? "HUB" : "FIRST_STOP",
              endLabel: String(shift.pattern || "").toUpperCase() === "LOOP" ? "HUB" : (String(shift.direction || "").toUpperCase() === "OUTBOUND" ? "LAST_STOP" : "HUB"),
            },
          })),
        });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );

  // ROOM: auto split + approve using best room pool combination
  r.post(
    "/:id/auto-split-approve",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) {
          return res.status(400).json({ error: "bad shiftId" });
        }

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);
        if (!shift.roomId) {
          return res.status(400).json({ error: "Shift has no roomId" });
        }
        if (shift.status === "ACTIVE" || shift.status === "DONE") {
          return res.status(409).json({ error: `Cannot auto-split from status ${shift.status}` });
        }
        if (shift.status === "SPLIT") {
          return res.status(409).json({ error: "Shift already split" });
        }
        if (shift.agreementId) {
          return res.status(409).json({ error: "Agreement shift auto-split is not supported yet" });
        }

        const demand = await getShiftDemandSnapshot(shift.id);
        if (!Number(demand?.requiredPax || 0)) {
          return res.status(409).json({ error: "Shift demand is empty" });
        }

        const pool = await buildRoomPoolSummary({ shiftId: shift.id });
        const comboItems = Array.isArray(pool?.suggestedCombo?.items) ? pool.suggestedCombo.items : [];
        if (!pool?.enoughPoolCapacity || comboItems.length < 2) {
          return res.status(409).json({
            error: comboItems.length < 2
              ? "Auto split requires at least 2 matched vehicles in pool"
              : "Room pool capacity is not enough",
            code: "AUTO_SPLIT_NOT_AVAILABLE",
            pool,
          });
        }

        for (const item of comboItems) {
          const vehicleId = Number(item?.id || 0);
          const driverId = Number(item?.suggestedDriver?.id || 0);
          if (!vehicleId || !driverId) {
            return res.status(409).json({ error: "Pool combination has incomplete vehicle/driver pair", code: "AUTO_SPLIT_PAIR_INVALID" });
          }
          await ensureVehicleDriverScopeOrThrow({
            scopeRoomId: Number(shift.roomId),
            vehicleId,
            driverId,
          });
          const cr = await getConflictOrNull({
            vehicleId,
            driverId,
            startAt: shift.startAt,
            endAt: shift.endAt,
            excludeShiftId: shift.id,
          });
          if (cr) {
            return res.status(409).json({ error: cr.message || "Vehicle/driver conflict", code: cr.code || "AUTO_SPLIT_CONFLICT", conflict: cr });
          }
          try {
            await assertDriverAssignable({ driverId, shiftId: shift.id, at: shift.startAt });
          } catch (e) {
            return res.status(e?.status || 409).json({ error: e?.message || 'Driver blocked', code: e?.code || 'ACTIVE_NO_SHOW_PENALTY', penalty: e?.penalty || null });
          }
        }

        const rootShift = await prisma.shift.findUnique({
          where: { id: shift.id },
          select: {
            id: true,
            companyId: true,
            roomId: true,
            startAt: true,
            endAt: true,
            status: true,
            hubLat: true,
            hubLng: true,
            direction: true,
            pattern: true,
            companyOfferAmount: true,
            companyOfferNote: true,
            roomOfferDecision: true,
            roomOfferDecisionNote: true,
            roomOfferDecisionAt: true,
            extendRequestedEndAt: true,
            extendRequestedAt: true,
            extendDecision: true,
            extendNoteCompany: true,
            extendNoteRoom: true,
            extendDecisionAt: true,
          },
        });
        if (!rootShift) {
          return res.status(404).json({ error: "Shift not found" });
        }

        let splitPlan = await buildDispatchSplitPlan({ shift, demand, pool });
        splitPlan = await applyDispatchOverrides({ splitPlan, overrides: req.body?.overrides, shift });

        if (!splitPlan.length) {
          return res.status(409).json({ error: "Split plan could not be created", code: "AUTO_SPLIT_PLAN_EMPTY" });
        }

        let updatedRoot = null;
        const createdChildren = [];
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.shift.findUnique({ where: { id: shift.id }, select: { id: true, status: true } });
          if (!fresh) throw httpError(404, "Shift not found");
          if (fresh.status === "SPLIT") throw httpError(409, "Shift already split");
          if (fresh.status === "ACTIVE" || fresh.status === "DONE") throw httpError(409, `Cannot auto-split from status ${fresh.status}`);

          for (const part of splitPlan) {
            const child = await createChildShiftFromSlice(tx, rootShift, part, part.slice);
            createdChildren.push(child);
          }

          await tx.shiftOffer.updateMany({
            where: { shiftId: shift.id, status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] } },
            data: { status: "CANCELLED" },
          });

          updatedRoot = await tx.shift.update({
            where: { id: shift.id },
            data: {
              status: "SPLIT",
              vehicleId: null,
              driverId: null,
              roomOfferVehicleId: null,
              roomOfferAmount: null,
              roomOfferNote: null,
              roomOfferToDriver: false,
              roomOfferDriverNote: null,
            },
            include: {
              stops: { orderBy: { order: "asc" } },
              progress: true,
              vehicle: true,
              driver: true,
              company: true,
              room: true,
            },
          });
        });

        await audit(req, {
          action: "SHIFT_AUTO_SPLIT_APPROVE",
          entity: "Shift",
          entityId: shift.id,
          meta: {
            rootShiftId: shift.id,
            childShiftIds: createdChildren.map((x) => x.id),
            combo: splitPlan.map((x) => ({ vehicleId: x.vehicleId, driverId: x.driverId, allocatedPax: x.allocatedPax, capacity: x.capacity })),
          },
        });

        const groupKey = splitPlan?.[0]?.groupKey || buildSplitGroupKey(shift.id);

        await createNotification({
          type: "SHIFT_AUTO_SPLIT_APPROVE",
          scope: "COMPANY",
          companyId: rootShift.companyId,
          roomId: rootShift.roomId,
          shiftId: shift.id,
          payload: {
            v: 1,
            title: "Vardiya havuz kombinasyonuyla bölündü",
            message: `Shift #${shift.id} ${createdChildren.length} alt vardiyaya bölündü.`,
            childShiftIds: createdChildren.map((x) => x.id),
          },
          dedupeKey: `shift:${shift.id}:autoSplit:${groupKey}`,
        }).catch(() => null);

        if (updatedRoot) emitShift(io, updatedRoot, "shift:update", { kind: "split_root" });
        createdChildren.forEach((child) => {
          emitShift(io, child, "shift:update", { kind: "split_child", splitRootId: shift.id });
          emitShift(io, child, "route:plan", { kind: "split_child", splitRootId: shift.id });
        });

        return res.json({
          ok: true,
          rootShiftId: shift.id,
          rootStatus: updatedRoot?.status || "SPLIT",
          childShiftIds: createdChildren.map((x) => x.id),
          childCount: createdChildren.length,
          groupKey: splitPlan?.[0]?.groupKey || null,
          splitPlan: splitPlan.map((x, idx) => ({
            childShiftId: createdChildren[idx]?.id || null,
            vehicleId: x.vehicleId,
            driverId: x.driverId,
            allocatedPax: x.allocatedPax,
            capacity: x.capacity,
            splitIndex: x.splitIndex,
            stopCount: Number(x?.preview?.stops?.length || 0),
            totalDistanceM: x?.preview?.totalDistanceM ?? null,
            totalDurationSec: x?.preview?.totalDurationSec ?? null,
          })),
        });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );

  // ROOM: reject shift -> sets status REJECTED + unbind
  r.put(
    "/:id/reject",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId))
          return res.status(400).json({ error: "bad shiftId" });

        validateWithZod(rejectShiftSchema, req.body ?? {});
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "DONE") {
          return res
            .status(400)
            .json({ error: "Cannot reject a DONE shift" });
        }
        if (shift.status === "ACTIVE") {
          return res
            .status(400)
            .json({ error: "Cannot reject an ACTIVE shift" });
        }

        const updated = await prisma.shift.update({
          where: { id: shiftId },
          data: {
            status: "REJECTED",
            driverId: null,
            vehicleId: null,
            roomOfferVehicleId: null,
            roomOfferDecision: "REJECTED",
          },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        await audit(req, {
          action: "SHIFT_REJECT",
          entity: "Shift",
          entityId: updated.id,
        });

        emitShift(io, updated, "shift:update");
        return res.json(updated);
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  // ROOM: send room-offer (vehicle/amount/note + optional notifyDriver) for company decision
  r.put(
    "/:id/room-offer",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId))
          return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(roomOfferSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res
            .status(400)
            .json({ error: "Cannot send room-offer while shift is ACTIVE" });
        }

        // Keep backward-compat: fields can be omitted (undefined), provided as null, or provided as value
        const hasVehicle = Object.prototype.hasOwnProperty.call(
          body,
          "roomOfferVehicleId"
        );
        const hasAmount = Object.prototype.hasOwnProperty.call(
          body,
          "roomOfferAmount"
        );
        const hasNote = Object.prototype.hasOwnProperty.call(
          body,
          "roomOfferNote"
        );
        const hasDriverNote = Object.prototype.hasOwnProperty.call(
          body,
          "driverNote"
        );

        const roomOfferVehicleId = hasVehicle
          ? body.roomOfferVehicleId ?? null
          : undefined;
        const roomOfferAmount = hasAmount
          ? body.roomOfferAmount ?? null
          : undefined;
        const roomOfferNote = hasNote ? body.roomOfferNote ?? null : undefined;

        const notifyDriver = Boolean(body.notifyDriver);
        const driverNote = hasDriverNote ? body.driverNote ?? null : undefined;

        let roomOfferToDriver = false;

        // notifyDriver true ise: araç zorunlu + aynı room + araçta driver bağlı olmalı
        if (notifyDriver) {
          if (roomOfferVehicleId == null) {
            return res.status(400).json({
              error: "notifyDriver requires roomOfferVehicleId",
              code: "MISSING_ROOM_OFFER_VEHICLE",
            });
          }

          const v = await prisma.vehicle.findUnique({
            where: { id: Number(roomOfferVehicleId) },
            select: { id: true, roomId: true, driverId: true },
          });
          if (!v)
            return res
              .status(400)
              .json({ error: "roomOfferVehicleId not found" });

          if (
            shift.roomId &&
            v.roomId &&
            Number(v.roomId) !== Number(shift.roomId)
          ) {
            return res.status(400).json({
              error: "roomOfferVehicleId must belong to the same room",
            });
          }

          if (!v.driverId) {
            return res.status(400).json({
              error: "Vehicle has no bound driver",
              code: "VEHICLE_DRIVER_NOT_BOUND",
            });
          }

          roomOfferToDriver = true;
        }

        const data = {
          ...(roomOfferVehicleId !== undefined ? { roomOfferVehicleId } : {}),
          ...(roomOfferAmount !== undefined ? { roomOfferAmount } : {}),
          ...(roomOfferNote !== undefined ? { roomOfferNote } : {}),

          roomOfferToDriver,
          roomOfferDriverNote: roomOfferToDriver ? driverNote ?? null : null,

          // yeni teklif → karar sürecini resetle
          roomOfferDecision: "PENDING",
          roomOfferDecisionAt: null,
          roomOfferDecisionNote: null,
        };

        const updated = await prisma.shift.update({
          where: { id: shiftId },
          data,
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        await audit(req, {
          action: "SHIFT_ROOM_OFFER",
          entity: "Shift",
          entityId: updated.id,
          meta: {
            roomOfferVehicleId: roomOfferVehicleId ?? null,
            roomOfferAmount: roomOfferAmount ?? null,
            roomOfferToDriver,
          },
        });

        emitShift(io, updated, "shift:update");
        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  

// ROOM/SUPER_ADMIN: decide on shift extension request (ACCEPT/REJECT)
r.put(
  "/:id/extend-decision",
  authRequired(),
  requireRole("ROOM", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "bad shiftId" });

      const body = validateWithZod(extendShiftDecisionSchema, req.body);
      const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

      if (req.user.role === "ROOM" && shift.roomId !== req.user.roomId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (shift.extendDecision !== "PENDING" || !shift.extendRequestedEndAt) {
        return res.status(409).json({ error: "No pending extension request" });
      }

      const decision = body.decision;

      const data = {
        extendDecision: decision,
        extendNoteRoom: body.noteRoom ?? null,
        extendDecisionAt: new Date(),
      };
      if (decision === "ACCEPTED") {
        data.endAt = shift.extendRequestedEndAt;
      }

      const updated = await prisma.shift.update({
        where: { id },
        data,
        include: {
          stops: { orderBy: { order: "asc" } },
          progress: true,
          vehicle: true,
          driver: true,
          company: true,
          room: true,
        },
      });

      await audit(req, {
        action: "SHIFT_EXTEND_DECISION",
        entity: "Shift",
        entityId: id,
        meta: { decision },
      });

      // notify COMPANY
      await createNotification({
        type: "SHIFT_EXTEND_DECISION",
        scope: "COMPANY",
        companyId: updated.companyId,
        roomId: updated.roomId,
        shiftId: id,
        payload: {
          v: 1,
          title: "Süre uzatma kararı",
          message: `Shift #${id} uzatma kararı: ${decision}`,
        },
        dedupeKey: `shift:${id}:extendDecision:${String(updated.extendRequestedEndAt ?? "")}`,
      });

      emitShift(io, updated, "shift:list");
      return res.json(updated);
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  }
);

// ROOM: start shift (status ACTIVE)
  r.post(
    "/:id/start",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId))
          return res.status(400).json({ error: "bad shiftId" });

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status !== "APPROVED") {
          return res
            .status(400)
            .json({ error: "Shift must be APPROVED to start" });
        }
        if (!shift.vehicleId || !shift.driverId) {
          return res.status(400).json({ error: "Shift missing vehicle/driver" });
        }

        // conflict checks: driver/vehicle overlap (ACTIVE or APPROVED)
        const cr = await getConflictOrNull({
          driverId: shift.driverId,
          vehicleId: shift.vehicleId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          excludeShiftId: shift.id,
        });
        if (cr) return res.status(409).json(cr);

        const updated = await prisma.shift.update({
          where: { id: shiftId },
          data: { status: "ACTIVE" },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        await audit(req, {
          action: "SHIFT_START",
          entity: "Shift",
          entityId: updated.id,
        });

        emitShift(io, updated, "shift:update");
        emitShift(io, updated, "route:plan");
        return res.json(updated);
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  // =======================
  // M7: Stop suggestions + accept
  // =======================

  // ROOM/COMPANY/SUPER_ADMIN: list suggestions (OPEN requests clustered)
  r.get(
    "/:id/stop-suggestions",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId))
          return res.status(400).json({ error: "bad shiftId" });

        await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        const radiusM = Number(req.query.radiusM ?? 120);
        const onlyOpen = String(req.query.onlyOpen ?? "1") === "1";

        const { Req, latF, lngF, statusF } = await resolveRequestDelegateSafe();
        if (!Req || typeof Req.findMany !== "function") {
          return res.status(500).json({
            error:
              "Requests prisma delegate missing. Expected getRequestDelegateOrThrow().d.findMany or prisma.pickupRequest.findMany",
          });
        }

        const where = { shiftId };
        if (onlyOpen) where[statusF] = "OPEN";

        const select = { id: true, [latF]: true, [lngF]: true };
        const reqs = await Req.findMany({ where, select });

        const points = (reqs ?? [])
          .map((x) => ({
            id: x.id,
            lat: Number(x?.[latF]),
            lng: Number(x?.[lngF]),
          }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

        if (!points.length) return res.json({ items: [] });

        const clusters = clusterPoints(points, radiusM);

        const items = clusters
          .map((idxs, k) => {
            const count = idxs.length;
            const lat = idxs.reduce((s, i) => s + points[i].lat, 0) / count;
            const lng = idxs.reduce((s, i) => s + points[i].lng, 0) / count;
            const requestIds = idxs.map((i) => points[i].id);
            return { id: `s-${shiftId}-${k + 1}`, lat, lng, count, requestIds };
          })
          .sort((a, b) => b.count - a.count);

        return res.json({ items });
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  // ROOM/SUPER_ADMIN: accept suggestion -> create COMMON stop
  r.post(
    "/:id/stops/from-suggestion",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId))
          return res.status(400).json({ error: "bad shiftId" });

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        // M7 harness expects accepting a suggestion while shift is ACTIVE.
        // We only block terminal states.
        if (shift.status === "DONE" || shift.status === "REJECTED") {
          return res
            .status(400)
            .json({ error: `Cannot add stop while shift is ${shift.status}` });
        }

        const lat = Number(req.body?.lat);
        const lng = Number(req.body?.lng);
        const name = String(req.body?.name ?? "COMMON from requests");

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: "lat/lng required" });
        }

        const maxAgg = await prisma.stop.aggregate({
          where: { shiftId },
          _max: { order: true },
        });
        const nextOrder = (maxAgg?._max?.order ?? 0) + 1;

        const stop = await prisma.stop.create({
          data: { shiftId, name, lat, lng, order: nextOrder, type: "COMMON" },
        });

        await audit(req, {
          action: "SHIFT_SUGGESTION_ACCEPT",
          entity: "Shift",
          entityId: shift.id,
          meta: { stopId: stop.id, order: stop.order },
        });

        emitShift(io, shift, "route:plan");
        return res.json({ ok: true, stop });
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );
}
