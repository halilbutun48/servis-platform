// backend/src/routes/shifts/room.js
import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { httpError, sendErrorResponse } from "../../errors/http.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";
import { createNotification, createAndEmitNotification } from "../../notifications/service.js";
import { assertDriverAssignable } from "../../lib/penalties.js";
import { buildNotifPayloadV1 } from "../../notifications/payloadV1.js";
import { clearShiftRoutePreviewCache, rebuildShiftRouteStateBestEffort } from "../../services/shiftRouteState.js";
import { upsertShiftSeriesCommercialBackboneByShiftId } from "../../services/paymentBackbone.js";
import {
  applyDispatchOverrides,
  buildDispatchSplitPlan,
  createChildShiftFromSlice,
  ensureVehicleDriverScopeOrThrow,
  getConflictOrNull,
  isValidIso,
  sendCapacityConflict,
  sendPenaltyError,
  sendShiftConflict,
  toInt,
} from "./roomShared.js";

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
  getShiftDemandSnapshot,
  buildCapacityConflict,
  buildRoomPoolSummary,
} from "../../services/roomPoolPlanner.js";

// ROOM + SUPER_ADMIN endpoints (approve/reject/start/room-offer + M7 suggestions)
export function attachShiftRoomRoutes(r, io) {
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
          return sendErrorResponse(res, httpError(400, "driverId/vehicleId required"));
        }
        if (!startAt || !endAt || !isValidIso(startAt) || !isValidIso(endAt)) {
          return sendErrorResponse(res, httpError(400, "startAt/endAt invalid"));
        }
        const a0 = new Date(startAt).getTime();
        const a1 = new Date(endAt).getTime();
        if (!(a0 < a1)) {
          return sendErrorResponse(res, httpError(400, "startAt must be < endAt"));
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
          return sendShiftConflict(res, cr);
        }
        return res.json({ ok: true });
      } catch (e) {
        return sendErrorResponse(res, e);
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
        return sendErrorResponse(res, httpError(400, "bad shiftId"));

      // schema differs (approve vs assign) but both contain vehicleId/driverId
      const body = validateWithZod(
        auditAction === "SHIFT_ASSIGN" ? assignShiftSchema : approveShiftSchema,
        req.body
      );

      const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        // ✅ M54: Agreement kaynaklı shiftlerde pazarlık/offer kapalı
        if (shift?.agreementId) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));
        }

      if (shift.status === "ACTIVE") {
        return sendErrorResponse(res, httpError(400, "Cannot approve/assign while shift is ACTIVE"));
      }

      const vehicleId = Number(body.vehicleId);
      const driverId = Number(body.driverId);
      if (!Number.isFinite(vehicleId) || !Number.isFinite(driverId)) {
        return sendErrorResponse(res, httpError(400, "vehicleId/driverId required"));
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
      if (capacityConflict) return sendCapacityConflict(res, capacityConflict);

      // conflict checks: driver/vehicle overlap (ACTIVE or APPROVED)
      const cr = await getConflictOrNull({
        driverId,
        vehicleId,
        startAt: shift.startAt,
        endAt: shift.endAt,
        excludeShiftId: shift.id,
      });
      if (cr) return sendShiftConflict(res, cr);
      try {
        await assertDriverAssignable({ driverId, shiftId: shift.id, at: shift.startAt });
      } catch (e) {
        return sendPenaltyError(res, e);
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

      clearShiftRoutePreviewCache(updated.id);
      emitShift(io, updated, "shift:update");
      emitShift(io, updated, "route:plan");
      return res.json(updated);
    } catch (e) {
      return sendErrorResponse(res, e);
    }
  }


  r.put(
    "/:id/reassign",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user, {
          include: { vehicle: true, driver: { include: { user: true } }, company: true, room: true },
        });

        const status = String(shift?.status || "").toUpperCase();
        if (!["APPROVED", "ACTIVE"].includes(status)) {
          return sendErrorResponse(res, httpError(409, "SHIFT_REASSIGN_STATUS", "Only APPROVED/ACTIVE shifts can be reassigned"));
        }

        const vehicleId = Number(req.body?.vehicleId);
        const driverId = Number(req.body?.driverId);
        const reason = String(req.body?.reason || "OTHER").trim().toUpperCase();
        const note = String(req.body?.note || "").trim() || null;
        if (!Number.isFinite(vehicleId) || !Number.isFinite(driverId)) {
          return sendErrorResponse(res, httpError(400, "vehicleId/driverId required"));
        }
        if (!reason) return sendErrorResponse(res, httpError(400, "reason required"));
        if (Number(shift.vehicleId || 0) === vehicleId && Number(shift.driverId || 0) === driverId) {
          return sendErrorResponse(res, httpError(400, "SHIFT_REASSIGN_NO_CHANGE", "No change detected"));
        }

        const { vehicle, driver } = await ensureVehicleDriverScopeOrThrow({ scopeRoomId: Number(shift.roomId), vehicleId, driverId });

        const demand = await getShiftDemandSnapshot(shift.id);
        const capacityConflict = buildCapacityConflict({
          requiredPax: demand?.requiredPax ?? 0,
          vehicleCapacity: vehicle?.capacity ?? 0,
        });
        if (capacityConflict) return sendCapacityConflict(res, capacityConflict);

        const cr = await getConflictOrNull({
          driverId,
          vehicleId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          excludeShiftId: shift.id,
        });
        if (cr) return sendShiftConflict(res, cr);

        try {
          await assertDriverAssignable({ driverId, shiftId: shift.id, at: shift.startAt });
        } catch (e) {
          return sendPenaltyError(res, e);
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

        clearShiftRoutePreviewCache(updated.id);
        emitShift(io, updated, "shift:update", { action: "reassign", reason });
        emitShift(io, updated, "route:plan", { action: "reassign", reason });
        return res.json({ ok: true, shift: updated, event: meta });
      } catch (e) {
        return sendErrorResponse(res, e);
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
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);
        if (!shift.roomId) return sendErrorResponse(res, httpError(400, "Shift has no roomId"));
        if (shift.status === "SPLIT") return sendErrorResponse(res, httpError(409, "Shift already split"));
        if (shift.status === "DONE") return sendErrorResponse(res, httpError(409, "Shift already done"));

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
        return sendErrorResponse(res, e);
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
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);
        if (!shift.roomId) return sendErrorResponse(res, httpError(400, "Shift has no roomId"));
        if (shift.status === "SPLIT") return sendErrorResponse(res, httpError(409, "Shift already split"));
        if (shift.status === "DONE") return sendErrorResponse(res, httpError(409, "Shift already done"));

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
        return sendErrorResponse(res, e);
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
          return sendErrorResponse(res, httpError(400, "bad shiftId"));
        }

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);
        if (!shift.roomId) {
          return sendErrorResponse(res, httpError(400, "Shift has no roomId"));
        }
        if (shift.status === "ACTIVE" || shift.status === "DONE") {
          return sendErrorResponse(res, httpError(409, `Cannot auto-split from status ${shift.status}`));
        }
        if (shift.status === "SPLIT") {
          return sendErrorResponse(res, httpError(409, "Shift already split"));
        }
        if (shift.agreementId) {
          return sendErrorResponse(res, httpError(409, "Agreement shift auto-split is not supported yet"));
        }

        const demand = await getShiftDemandSnapshot(shift.id);
        if (!Number(demand?.requiredPax || 0)) {
          return sendErrorResponse(res, httpError(409, "Shift demand is empty"));
        }

        const pool = await buildRoomPoolSummary({ shiftId: shift.id });
        const comboItems = Array.isArray(pool?.suggestedCombo?.items) ? pool.suggestedCombo.items : [];
        if (!pool?.enoughPoolCapacity || comboItems.length < 2) {
          return sendErrorResponse(res, httpError(409, "AUTO_SPLIT_NOT_AVAILABLE", comboItems.length < 2 ? "Auto split requires at least 2 matched vehicles in pool" : "Room pool capacity is not enough", { pool }));
        }

        for (const item of comboItems) {
          const vehicleId = Number(item?.id || 0);
          const driverId = Number(item?.suggestedDriver?.id || 0);
          if (!vehicleId || !driverId) {
            return sendErrorResponse(res, httpError(409, "AUTO_SPLIT_PAIR_INVALID", "Pool combination has incomplete vehicle/driver pair"));
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
            return sendShiftConflict(res, cr, "AUTO_SPLIT_CONFLICT", "Vehicle/driver conflict");
          }
          try {
            await assertDriverAssignable({ driverId, shiftId: shift.id, at: shift.startAt });
          } catch (e) {
            return sendPenaltyError(res, e);
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
          return sendErrorResponse(res, httpError(404, "Shift not found"));
        }

        let splitPlan = await buildDispatchSplitPlan({ shift, demand, pool });
        splitPlan = await applyDispatchOverrides({ splitPlan, overrides: req.body?.overrides, shift });

        if (!splitPlan.length) {
          return sendErrorResponse(res, httpError(409, "AUTO_SPLIT_PLAN_EMPTY", "Split plan could not be created"));
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

        for (const child of createdChildren) {
          await rebuildShiftRouteStateBestEffort(child.id);
        }
        await upsertShiftSeriesCommercialBackboneByShiftId(shift.id).catch(() => null);

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

        if (updatedRoot) {
          clearShiftRoutePreviewCache(updatedRoot.id);
          emitShift(io, updatedRoot, "shift:update", { kind: "split_root" });
        }
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
        return sendErrorResponse(res, e);
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
          return sendErrorResponse(res, httpError(400, "bad shiftId"));

        validateWithZod(rejectShiftSchema, req.body ?? {});
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "DONE") {
          return sendErrorResponse(res, httpError(400, "Cannot reject a DONE shift"));
        }
        if (shift.status === "ACTIVE") {
          return sendErrorResponse(res, httpError(400, "Cannot reject an ACTIVE shift"));
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

        clearShiftRoutePreviewCache(updated.id);
        emitShift(io, updated, "shift:update");
        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
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
          return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const body = validateWithZod(roomOfferSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return sendErrorResponse(res, httpError(400, "Cannot send room-offer while shift is ACTIVE"));
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
            return sendErrorResponse(res, httpError(400, "MISSING_ROOM_OFFER_VEHICLE", "notifyDriver requires roomOfferVehicleId"));
          }

          const v = await prisma.vehicle.findUnique({
            where: { id: Number(roomOfferVehicleId) },
            select: { id: true, roomId: true, driverId: true },
          });
          if (!v)
            return sendErrorResponse(res, httpError(400, "roomOfferVehicleId not found"));

          if (
            shift.roomId &&
            v.roomId &&
            Number(v.roomId) !== Number(shift.roomId)
          ) {
            return sendErrorResponse(res, httpError(400, "roomOfferVehicleId must belong to the same room"));
          }

          if (!v.driverId) {
            return sendErrorResponse(res, httpError(400, "VEHICLE_DRIVER_NOT_BOUND", "Vehicle has no bound driver"));
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

        clearShiftRoutePreviewCache(updated.id);
        emitShift(io, updated, "shift:update");
        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
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
      if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

      const body = validateWithZod(extendShiftDecisionSchema, req.body);
      const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

      if (req.user.role === "ROOM" && shift.roomId !== req.user.roomId) {
        return sendErrorResponse(res, httpError(403, "Forbidden"));
      }

      if (shift.extendDecision !== "PENDING" || !shift.extendRequestedEndAt) {
        return sendErrorResponse(res, httpError(409, "No pending extension request"));
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

      clearShiftRoutePreviewCache(updated.id);
      emitShift(io, updated, "shift:list");
      return res.json(updated);
    } catch (e) {
      return sendErrorResponse(res, e);
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
          return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status !== "APPROVED") {
          return sendErrorResponse(res, httpError(400, "Shift must be APPROVED to start"));
        }
        if (!shift.vehicleId || !shift.driverId) {
          return sendErrorResponse(res, httpError(400, "Shift missing vehicle/driver"));
        }

        // conflict checks: driver/vehicle overlap (ACTIVE or APPROVED)
        const cr = await getConflictOrNull({
          driverId: shift.driverId,
          vehicleId: shift.vehicleId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          excludeShiftId: shift.id,
        });
        if (cr) return sendShiftConflict(res, cr);

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

        clearShiftRoutePreviewCache(updated.id);
        emitShift(io, updated, "shift:update");
        emitShift(io, updated, "route:plan");
        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
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
          return sendErrorResponse(res, httpError(400, "bad shiftId"));

        await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        const radiusM = Number(req.query.radiusM ?? 120);
        const onlyOpen = String(req.query.onlyOpen ?? "1") === "1";

        const { Req, latF, lngF, statusF } = await resolveRequestDelegateSafe();
        if (!Req || typeof Req.findMany !== "function") {
          return sendErrorResponse(res, httpError(500, "REQUEST_DELEGATE_MISSING", "Requests prisma delegate missing. Expected getRequestDelegateOrThrow().d.findMany or prisma.pickupRequest.findMany"));
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
        return sendErrorResponse(res, e);
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
          return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        // M7 harness expects accepting a suggestion while shift is ACTIVE.
        // We only block terminal states.
        if (shift.status === "DONE" || shift.status === "REJECTED") {
          return sendErrorResponse(res, httpError(400, `Cannot add stop while shift is ${shift.status}`));
        }

        const lat = Number(req.body?.lat);
        const lng = Number(req.body?.lng);
        const name = String(req.body?.name ?? "COMMON from requests");

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return sendErrorResponse(res, httpError(400, "lat/lng required"));
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

        await rebuildShiftRouteStateBestEffort(shift.id);
        emitShift(io, shift, "route:plan");
        return res.json({ ok: true, stop });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );
}
