import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";

import {
  approveShiftSchema,
  assignShiftSchema,
  rejectShiftSchema,
  roomOfferSchema,
} from "./schemas.js";

// Avoid named imports from helpers to prevent hard crashes at module-load time in edge environments.
import * as H from "./helpers.js";

const clusterPoints = H.clusterPoints;
const emitShift = H.emitShift;
const getShiftAndCheckScopeOrThrow = H.getShiftAndCheckScopeOrThrow;
const resolveRequestDelegateSafe = H.resolveRequestDelegateSafe;

import { checkShiftConflicts, conflictResponse } from "../../services/shiftConflict.js";

// ROOM + SUPER_ADMIN endpoints (approve/reject/start/room-offer + M7 suggestions)
export function attachShiftRoomRoutes(r, io) {
  // ROOM: approve/assign shift (bind vehicle+driver) -> sets status APPROVED
    const approveShiftHandler = async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId))
          return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(approveShiftSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res
            .status(400)
            .json({ error: "Cannot approve while shift is ACTIVE" });
        }

        const vehicleId = Number(body.vehicleId);
        const driverId = Number(body.driverId);
        if (!Number.isFinite(vehicleId) || !Number.isFinite(driverId)) {
          return res
            .status(400)
            .json({ error: "vehicleId/driverId required" });
        }

        
        // scope validation: vehicle and driver must belong to this shift's room
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
          select: { id: true, roomId: true, archivedAt: true },
        });
        if (!vehicle || vehicle.archivedAt) {
          return res.status(400).json({ error: "Vehicle not found/archived" });
        }
        if (vehicle.roomId != null && Number(vehicle.roomId) !== Number(shift.roomId)) {
          return res.status(403).json({ error: "Vehicle is not in this room scope" });
        }

        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: { id: true, roomId: true },
        });
        if (!driver) {
          return res.status(400).json({ error: "Driver not found" });
        }
        if (driver.roomId != null && Number(driver.roomId) !== Number(shift.roomId)) {
          return res.status(403).json({ error: "Driver is not in this room scope" });
        }

        // conflict checks: driver/vehicle overlap (ACTIVE or APPROVED)
        const conflicts = await checkShiftConflicts({
          driverId: driverId,
          vehicleId: vehicleId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          excludeShiftId: shift.id,
        });
        const cr = conflictResponse(conflicts);
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
          action: "SHIFT_APPROVE",
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
      };

  // Support both PUT and POST for approve (scripts expect POST)
  r.put(
    "/:id/approve",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    approveShiftHandler
  );
  r.post(
    "/:id/approve",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    approveShiftHandler
  );

  // ROOM: assign shift (backward compatible alias)
  // Some gate scripts call `/api/shifts/:id/assign`.
  // We treat it as `APPROVED` + bind vehicle/driver.
  r.put(
    "/:id/assign",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId))
          return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(assignShiftSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res
            .status(400)
            .json({ error: "Cannot assign while shift is ACTIVE" });
        }

        const vehicleId = Number(body.vehicleId);
        const driverId = Number(body.driverId);
        if (!Number.isFinite(vehicleId) || !Number.isFinite(driverId)) {
          return res
            .status(400)
            .json({ error: "vehicleId/driverId required" });
        }

        
        // scope validation: vehicle and driver must belong to this shift's room
        const vehicle = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
          select: { id: true, roomId: true, archivedAt: true },
        });
        if (!vehicle || vehicle.archivedAt) {
          return res.status(400).json({ error: "Vehicle not found/archived" });
        }
        if (vehicle.roomId != null && Number(vehicle.roomId) !== Number(shift.roomId)) {
          return res.status(403).json({ error: "Vehicle is not in this room scope" });
        }

        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: { id: true, roomId: true },
        });
        if (!driver) {
          return res.status(400).json({ error: "Driver not found" });
        }
        if (driver.roomId != null && Number(driver.roomId) !== Number(shift.roomId)) {
          return res.status(403).json({ error: "Driver is not in this room scope" });
        }

        // conflict checks: driver/vehicle overlap (ACTIVE or APPROVED)
        const conflicts = await checkShiftConflicts({
          driverId: driverId,
          vehicleId: vehicleId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          excludeShiftId: shift.id,
        });
        const cr = conflictResponse(conflicts);
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
          action: "SHIFT_ASSIGN",
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
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(roomOfferSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res.status(400).json({ error: "Cannot send room-offer while shift is ACTIVE" });
        }

        // Keep backward-compat: fields can be omitted (undefined), provided as null, or provided as value
        const hasVehicle = Object.prototype.hasOwnProperty.call(body, "roomOfferVehicleId");
        const hasAmount = Object.prototype.hasOwnProperty.call(body, "roomOfferAmount");
        const hasNote = Object.prototype.hasOwnProperty.call(body, "roomOfferNote");
        const hasDriverNote = Object.prototype.hasOwnProperty.call(body, "driverNote");

        const roomOfferVehicleId = hasVehicle ? (body.roomOfferVehicleId ?? null) : undefined;
        const roomOfferAmount = hasAmount ? (body.roomOfferAmount ?? null) : undefined;
        const roomOfferNote = hasNote ? (body.roomOfferNote ?? null) : undefined;

        const notifyDriver = Boolean(body.notifyDriver);
        const driverNote = hasDriverNote ? (body.driverNote ?? null) : undefined;

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
          if (!v) return res.status(400).json({ error: "roomOfferVehicleId not found" });

          if (shift.roomId && v.roomId && Number(v.roomId) !== Number(shift.roomId)) {
            return res.status(400).json({ error: "roomOfferVehicleId must belong to the same room" });
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
          roomOfferDriverNote: roomOfferToDriver ? (driverNote ?? null) : null,

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
          return res
            .status(400)
            .json({ error: "Shift missing vehicle/driver" });
        }

        
        // conflict checks: driver/vehicle overlap (ACTIVE or APPROVED)
        const conflicts = await checkShiftConflicts({
          driverId: shift.driverId,
          vehicleId: shift.vehicleId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          excludeShiftId: shift.id,
        });
        const cr = conflictResponse(conflicts);
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
