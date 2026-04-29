import express from "express";
import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { httpError, sendErrorResponse } from "../../errors/http.js";
import { audit } from "../../audit.js";
import { createNotification } from "../../notifications/service.js";
import { assertDriverAssignable } from "../../lib/penalties.js";
import { clearShiftRoutePreviewCache, rebuildShiftRouteStateBestEffort } from "../../services/shiftRouteState.js";
import { upsertShiftSeriesCommercialBackboneByShiftId } from "../../services/paymentBackbone.js";
import { applyDispatchOverrides, buildDispatchSplitPlan, buildSplitGroupKey, createChildShiftFromSlice, ensureVehicleDriverScopeOrThrow, getConflictOrNull, sendPenaltyError, sendShiftConflict } from "./roomShared.js";
import { buildRoomPoolSummary, getShiftDemandSnapshot } from "../../services/roomPoolPlanner.js";
import { emitShift, getShiftAndCheckScopeOrThrow } from "./helpers.js";

export function buildShiftRoomDispatchRouter(io) {
  const r = express.Router();

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

  return r;
}
