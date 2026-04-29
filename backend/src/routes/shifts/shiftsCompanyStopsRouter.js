import express from "express";
import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { httpError, sendErrorResponse } from "../../errors/http.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";
import { rebuildShiftRouteStateBestEffort } from "../../services/shiftRouteState.js";
import { emitShift, decorateShiftWithRegionContext, getShiftAndCheckScopeOrThrow } from "./helpers.js";
import {
  addStopSchema,
  updateStopSchema,
  applyTemplateSchema,
  reorderStopsSchema,
} from "./schemas.js";

async function loadFullShift(shiftId) {
  const shift = await prisma.shift.findUnique({
    where: { id: Number(shiftId) },
    include: {
      stops: { orderBy: { order: "asc" } },
      progress: true,
      vehicle: true,
      driver: true,
      company: true,
      room: true,
    },
  });
  return decorateShiftWithRegionContext(shift);
}

export function buildShiftCompanyStopsRouter(io) {
  const r = express.Router();

  r.post(
    "/:id/stops",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const body = validateWithZod(addStopSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return sendErrorResponse(res, httpError(400, "Cannot add stop while shift is ACTIVE"));
        }

        const maxAgg = await prisma.stop.aggregate({
          where: { shiftId },
          _max: { order: true },
        });
        const nextOrder = (maxAgg?._max?.order ?? 0) + 1;

        const stop = await prisma.stop.create({
          data: {
            shiftId,
            name: body.name,
            lat: body.lat,
            lng: body.lng,
            order: body.order ?? nextOrder,
            type: body.type ?? "MANUAL",
          },
        });

        await rebuildShiftRouteStateBestEffort(shiftId);

        await audit(req, {
          action: "SHIFT_STOP_ADD",
          entity: "Shift",
          entityId: shift.id,
          meta: { stopId: stop.id, order: stop.order },
        });

        const full = await loadFullShift(shiftId);

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, stop, shift: full });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  r.put(
    "/:id/stops/:stopId(\\d+)",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        const stopId = Number(req.params.stopId);
        if (!Number.isFinite(shiftId) || !Number.isFinite(stopId)) {
          return sendErrorResponse(res, httpError(400, "bad ids"));
        }

        const body = validateWithZod(updateStopSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return sendErrorResponse(res, httpError(400, "Cannot update stop while shift is ACTIVE"));
        }

        const stop = await prisma.stop.findUnique({ where: { id: stopId } });
        if (!stop || stop.shiftId !== shiftId) return sendErrorResponse(res, httpError(404, "Stop not found"));

        const updatedStop = await prisma.stop.update({
          where: { id: stopId },
          data: {
            name: body.name ?? undefined,
            lat: body.lat ?? undefined,
            lng: body.lng ?? undefined,
            order: body.order ?? undefined,
            type: body.type ?? undefined,
          },
        });

        await rebuildShiftRouteStateBestEffort(shiftId);

        await audit(req, {
          action: "SHIFT_STOP_UPDATE",
          entity: "Shift",
          entityId: shift.id,
          meta: { stopId: updatedStop.id },
        });

        const full = await loadFullShift(shiftId);

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, stop: updatedStop, shift: full });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  r.delete(
    "/:id/stops/:stopId(\\d+)",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        const stopId = Number(req.params.stopId);
        if (!Number.isFinite(shiftId) || !Number.isFinite(stopId)) {
          return sendErrorResponse(res, httpError(400, "bad ids"));
        }

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return sendErrorResponse(res, httpError(400, "Cannot delete stop while shift is ACTIVE"));
        }

        const stop = await prisma.stop.findUnique({ where: { id: stopId } });
        if (!stop || stop.shiftId !== shiftId) return sendErrorResponse(res, httpError(404, "Stop not found"));

        await prisma.stop.delete({ where: { id: stopId } });
        await rebuildShiftRouteStateBestEffort(shiftId);

        await audit(req, {
          action: "SHIFT_STOP_DELETE",
          entity: "Shift",
          entityId: shift.id,
          meta: { stopId },
        });

        const full = await loadFullShift(shiftId);

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, shift: full });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  r.post(
    "/:id/stops/from-template",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return sendErrorResponse(res, httpError(400, "Cannot add stops while shift is ACTIVE"));
        }

        const body = validateWithZod(applyTemplateSchema, req.body);

        const tpl = await prisma.routeTemplate.findUnique({
          where: { id: body.templateId },
          include: { stops: { orderBy: { order: "asc" } } },
        });
        if (!tpl) return sendErrorResponse(res, httpError(404, "Template not found"));

        if (req.user.role === "ROOM") {
          if (tpl.roomId && tpl.roomId !== req.user.roomId) return sendErrorResponse(res, httpError(403, "Forbidden"));
        }
        if (req.user.role === "COMPANY") {
          if (tpl.companyId && tpl.companyId !== req.user.companyId) return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        const mode = body.mode ?? "REPLACE";

        const data = await prisma.$transaction(async (tx) => {
          let baseOrder = 1;
          if (mode === "REPLACE") {
            await tx.stop.deleteMany({ where: { shiftId } });
            await tx.shiftProgress.deleteMany({ where: { shiftId } });
            baseOrder = 1;
          } else {
            const maxAgg = await tx.stop.aggregate({ where: { shiftId }, _max: { order: true } });
            baseOrder = (maxAgg?._max?.order ?? 0) + 1;
          }

          const nextData = (tpl.stops ?? []).map((s, idx) => ({
            shiftId,
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            type: s.type ?? "COMMON",
            order: baseOrder + idx,
          }));

          if (nextData.length) await tx.stop.createMany({ data: nextData });
          return nextData;
        });

        await rebuildShiftRouteStateBestEffort(shiftId);

        await audit(req, {
          action: "SHIFT_STOPS_FROM_TEMPLATE",
          entity: "Shift",
          entityId: shift.id,
          meta: { templateId: tpl.id, count: data.length, mode },
        });

        const full = await loadFullShift(shiftId);

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, shift: full });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  r.put(
    "/:id/stops/reorder",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const body = validateWithZod(reorderStopsSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return sendErrorResponse(res, httpError(400, "Cannot reorder stops while shift is ACTIVE"));
        }

        let stopIds = [];
        if (Array.isArray(body.idsInOrder) && body.idsInOrder.length) {
          stopIds = body.idsInOrder;
        } else if (Array.isArray(body.stopIds) && body.stopIds.length) {
          stopIds = body.stopIds;
        } else if (Array.isArray(body.orders) && body.orders.length) {
          stopIds = body.orders
            .map((o) => ({ id: o.id ?? o.stopId, order: o.order }))
            .filter((o) => Number.isFinite(o.id) && Number.isFinite(o.order))
            .sort((a, b) => a.order - b.order)
            .map((o) => o.id);
        }

        stopIds = stopIds.map((x) => Number(x)).filter(Number.isFinite);
        if (!stopIds.length) return sendErrorResponse(res, httpError(400, "stopIds required"));

        const totalStops = await prisma.stop.count({ where: { shiftId } });
        if (totalStops !== stopIds.length) return sendErrorResponse(res, httpError(400, "Stop ids mismatch"));

        const stops = await prisma.stop.findMany({
          where: { shiftId, id: { in: stopIds } },
          select: { id: true },
        });
        if (stops.length !== stopIds.length) return sendErrorResponse(res, httpError(400, "Stop ids mismatch"));

        await prisma.$transaction(
          stopIds.map((id, idx) => prisma.stop.update({ where: { id }, data: { order: idx + 1 } }))
        );

        await rebuildShiftRouteStateBestEffort(shiftId);

        await audit(req, {
          action: "SHIFT_STOPS_REORDER",
          entity: "Shift",
          entityId: shift.id,
          meta: { count: stopIds.length },
        });

        const full = await loadFullShift(shiftId);

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, shift: full });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  return r;
}
