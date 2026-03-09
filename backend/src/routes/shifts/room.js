// backend/src/routes/shifts/room.js
import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";
import { createNotification } from "../../notifications/service.js";

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
      select: { id: true, roomId: true, archivedAt: true, capacity: true },
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
      select: { id: true, roomId: true },
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
      include: {
        stops: { orderBy: { order: "asc" } },
        progress: true,
        vehicle: true,
        driver: true,
        company: true,
        room: true,
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

    const stopBuckets = new Map();
    for (const unit of unitSlice) {
      if (!unit?.stopMeta || !unit?.originalStopKey) continue;
      if (!stopBuckets.has(unit.originalStopKey)) {
        stopBuckets.set(unit.originalStopKey, { meta: unit.stopMeta, units: [] });
      }
      stopBuckets.get(unit.originalStopKey).units.push(unit);
    }

    const orderedBuckets = [...stopBuckets.values()].sort(
      (a, b) => Number(a.meta?.order || 0) - Number(b.meta?.order || 0)
    );
    const childStopByKey = new Map();

    for (let idx = 0; idx < orderedBuckets.length; idx += 1) {
      const bucket = orderedBuckets[idx];
      const meta = bucket.meta || {};
      const stop = await tx.stop.create({
        data: {
          shiftId: child.id,
          name: meta.name || `Split Stop ${idx + 1}`,
          lat: Number(meta.lat || 0),
          lng: Number(meta.lng || 0),
          order: idx + 1,
          type: meta.type || "COMMON",
          state: meta.state || "PENDING",
        },
      });
      childStopByKey.set(meta.id != null ? `stop:${meta.id}` : `${meta.name}:${idx}`, stop);
      if (bucket.units.some((u) => Number(u?.personelId || 0) > 0)) {
        const rows = bucket.units
          .filter((u) => Number(u?.personelId || 0) > 0)
          .map((u) => ({
            shiftId: child.id,
            stopId: stop.id,
            personelId: Number(u.personelId),
            walkM: Number(u.walkM || 0) || 0,
          }));
        if (rows.length) {
          await tx.stopAssignment.createMany({ data: rows, skipDuplicates: true });
        }
      }
    }

    return child;
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

        const { units } = await buildPassengerUnitsForSplit(shift.id, demand);
        const groupKey = buildSplitGroupKey(shift.id);
        let cursor = 0;
        const splitPlan = comboItems.map((item, idx) => {
          const allocatedPax = Math.max(0, Number(item?.allocatedPax || 0));
          const slice = units.slice(cursor, cursor + allocatedPax);
          cursor += allocatedPax;
          return {
            groupKey,
            splitIndex: idx + 1,
            splitTotal: comboItems.length,
            vehicleId: Number(item.id),
            driverId: Number(item?.suggestedDriver?.id || 0),
            capacity: Number(item?.capacity || 0),
            allocatedPax,
            slice,
          };
        }).filter((x) => x.allocatedPax > 0);

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
          splitPlan: splitPlan.map((x, idx) => ({
            childShiftId: createdChildren[idx]?.id || null,
            vehicleId: x.vehicleId,
            driverId: x.driverId,
            allocatedPax: x.allocatedPax,
            capacity: x.capacity,
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
