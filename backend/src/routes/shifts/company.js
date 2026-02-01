// backend/src/routes/shifts/company.js
import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";
import { createNotification } from "../../notifications/service.js";

import {
  createShiftSchema,
  updateShiftSchema,
  updateCompanyOfferSchema,
  updateRoomOfferDecisionSchema,
  addStopSchema,
  updateStopSchema,
  applyTemplateSchema,
  reorderStopsSchema,
} from "./schemas.js";

// Avoid named imports from helpers to prevent hard crashes at module-load time in edge environments.
import * as H from "./helpers.js";

const emitShift = H.emitShift;
const getShiftAndCheckScopeOrThrow = H.getShiftAndCheckScopeOrThrow;

// Company-focused endpoints (some are also allowed for ROOM/SUPER_ADMIN)
export function attachShiftCompanyRoutes(r, io) {
  // COMPANY/SUPER_ADMIN: create shift
  r.post(
    "/",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const body = validateWithZod(createShiftSchema, req.body);

        // Scope:
        // - COMPANY: companyId body'de zorunlu değil; token'dan alınır.
        // - SUPER_ADMIN: companyId body'de zorunludur.
        const effectiveCompanyId =
          req.user.role === "COMPANY" ? req.user.companyId : body.companyId;

        if (!effectiveCompanyId) {
          return res.status(400).json({ error: "companyId required" });
        }

        // ✅ COMPANY her zaman REQUESTED üretir
        const effectiveStatus =
          req.user.role === "COMPANY" ? "REQUESTED" : body.status ?? "DRAFT";

        // Optional: companyOfferVehicleId verildiyse araç var mı ve aynı room mu?
        if (body.companyOfferVehicleId != null) {
          const v = await prisma.vehicle.findUnique({
            where: { id: body.companyOfferVehicleId },
            select: { id: true, roomId: true },
          });
          if (!v) {
            return res.status(400).json({ error: "companyOfferVehicleId not found" });
          }
          if (v.roomId && body.roomId && Number(v.roomId) !== Number(body.roomId)) {
            return res
              .status(400)
              .json({ error: "companyOfferVehicleId must belong to the same room" });
          }
        }

        const shift = await prisma.shift.create({
          data: {
            companyId: effectiveCompanyId,
            roomId: body.roomId,
            startAt: body.startAt,
            endAt: body.endAt,

            status: effectiveStatus,

            companyOfferVehicleId: body.companyOfferVehicleId ?? null,
            companyOfferAmount: body.companyOfferAmount ?? null,
            companyOfferNote: body.companyOfferNote ?? null,
          },
          include: { company: true, room: true, stops: true },
        });

        // stops (optional)
        if (Array.isArray(body.stops) && body.stops.length) {
          await prisma.stop.createMany({
            data: body.stops.map((s) => ({
              shiftId: shift.id,
              name: s.name,
              lat: s.lat,
              lng: s.lng,
              order: s.order,
              type: s.type ?? "MANUAL",
            })),
          });
        }

        const full = await prisma.shift.findUnique({
          where: { id: shift.id },
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
          action: "SHIFT_CREATE",
          entity: "Shift",
          entityId: shift.id,
          meta: { status: effectiveStatus },
        });

        emitShift(io, full, "shift:list");
        return res.json(full);
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  // COMPANY/SUPER_ADMIN: update shift fields (time window/status)
  r.put(
    "/:id",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(updateShiftSchema, req.body);

        const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        const updated = await prisma.shift.update({
          where: { id },
          data: {
            startAt: body.startAt ?? undefined,
            endAt: body.endAt ?? undefined,
            status: body.status ?? undefined,
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
          action: "SHIFT_UPDATE",
          entity: "Shift",
          entityId: id,
        });

        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  // COMPANY/SUPER_ADMIN: update company offer fields (vehicle/amount/note)
  r.put(
    "/:id/company-offer",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(updateCompanyOfferSchema, req.body);

        const shift = await getShiftAndCheckScopeOrThrow(id, req.user);
        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        // only allow negotiate in DRAFT/REQUESTED (optional rule)
        if (!["DRAFT", "REQUESTED"].includes(String(shift.status))) {
          return res.status(400).json({ error: `Offer not allowed for status=${shift.status}` });
        }

        if (body.companyOfferVehicleId != null) {
          const v = await prisma.vehicle.findUnique({
            where: { id: body.companyOfferVehicleId },
            select: { id: true, roomId: true },
          });
          if (!v) return res.status(400).json({ error: "companyOfferVehicleId not found" });
          if (v.roomId && shift.roomId && Number(v.roomId) !== Number(shift.roomId)) {
            return res.status(400).json({
              error: "companyOfferVehicleId must belong to the same room",
            });
          }
        }

        const updated = await prisma.shift.update({
          where: { id },
          data: {
            companyOfferVehicleId: body.companyOfferVehicleId ?? null,
            companyOfferAmount: body.companyOfferAmount ?? null,
            companyOfferNote: body.companyOfferNote ?? null,
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
          action: "SHIFT_COMPANY_OFFER",
          entity: "Shift",
          entityId: id,
        });

        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  // COMPANY/SUPER_ADMIN: company decides on room offer (ACCEPTED/REJECTED) + optional note
  r.put(
    "/:id/room-offer-decision",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(updateRoomOfferDecisionSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        const updated = await prisma.shift.update({
          where: { id },
          data: {
            roomOfferDecision: body.decision,
            roomOfferDecisionAt: new Date(),
            roomOfferDecisionNote: body.note ?? null,
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
          action: "SHIFT_ROOM_OFFER_DECISION",
          entity: "Shift",
          entityId: id,
          meta: { decision: body.decision },
        });

        // notify ROOM
        if (updated?.roomId) {
          await createNotification({
            kind: "SHIFT_OFFER_DECISION",
            status: "INFO",
            title: `Company decision: ${body.decision}`,
            body: `Shift #${id}`,
            roomId: updated.roomId,
            companyId: updated.companyId,
            shiftId: id,
            dedupeKey: `shift:${id}:roomOfferDecision:${body.decision}`,
          });
        }

        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return res
          .status(e?.status ?? 500)
          .json({ error: String(e?.message ?? e) });
      }
    }
  );

  // --- stops endpoints (aynen) ---

  r.post(
    "/:id/stops",
    authRequired(),
    requireRole("ROOM", "COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(addStopSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res.status(400).json({ error: "Cannot add stop while shift is ACTIVE" });
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

        await audit(req, {
          action: "SHIFT_STOP_ADD",
          entity: "Shift",
          entityId: shift.id,
          meta: { stopId: stop.id, order: stop.order },
        });

        const full = await prisma.shift.findUnique({
          where: { id: shiftId },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, stop, shift: full });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
          return res.status(400).json({ error: "bad ids" });
        }

        const body = validateWithZod(updateStopSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res.status(400).json({ error: "Cannot update stop while shift is ACTIVE" });
        }

        const stop = await prisma.stop.findUnique({ where: { id: stopId } });
        if (!stop || stop.shiftId !== shiftId) return res.status(404).json({ error: "Stop not found" });

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

        await audit(req, {
          action: "SHIFT_STOP_UPDATE",
          entity: "Shift",
          entityId: shift.id,
          meta: { stopId: updatedStop.id },
        });

        const full = await prisma.shift.findUnique({
          where: { id: shiftId },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, stop: updatedStop, shift: full });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
          return res.status(400).json({ error: "bad ids" });
        }

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res.status(400).json({ error: "Cannot delete stop while shift is ACTIVE" });
        }

        const stop = await prisma.stop.findUnique({ where: { id: stopId } });
        if (!stop || stop.shiftId !== shiftId) return res.status(404).json({ error: "Stop not found" });

        await prisma.stop.delete({ where: { id: stopId } });

        await audit(req, {
          action: "SHIFT_STOP_DELETE",
          entity: "Shift",
          entityId: shift.id,
          meta: { stopId },
        });

        const full = await prisma.shift.findUnique({
          where: { id: shiftId },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, shift: full });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res.status(400).json({ error: "Cannot add stops while shift is ACTIVE" });
        }

        const body = validateWithZod(applyTemplateSchema, req.body);

        const tpl = await prisma.routeTemplate.findUnique({
          where: { id: body.templateId },
          include: { stops: { orderBy: { order: "asc" } } },
        });
        if (!tpl) return res.status(404).json({ error: "Template not found" });

        if (req.user.role === "ROOM") {
          if (tpl.roomId && tpl.roomId !== req.user.roomId) return res.status(403).json({ error: "Forbidden" });
        }
        if (req.user.role === "COMPANY") {
          if (tpl.companyId && tpl.companyId !== req.user.companyId) return res.status(403).json({ error: "Forbidden" });
        }

        const mode = body.mode ?? "REPLACE";

        let baseOrder = 1;
        if (mode === "REPLACE") {
          await prisma.stop.deleteMany({ where: { shiftId } });
          await prisma.shiftProgress.deleteMany({ where: { shiftId } });
          baseOrder = 1;
        } else {
          const maxAgg = await prisma.stop.aggregate({ where: { shiftId }, _max: { order: true } });
          baseOrder = (maxAgg?._max?.order ?? 0) + 1;
        }

        const data = (tpl.stops ?? []).map((s, idx) => ({
          shiftId,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          type: s.type ?? "COMMON",
          order: baseOrder + idx,
        }));

        if (data.length) await prisma.stop.createMany({ data });

        await audit(req, {
          action: "SHIFT_STOPS_FROM_TEMPLATE",
          entity: "Shift",
          entityId: shift.id,
          meta: { templateId: tpl.id, count: data.length, mode },
        });

        const full = await prisma.shift.findUnique({
          where: { id: shiftId },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, shift: full });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(reorderStopsSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

        if (shift.status === "ACTIVE") {
          return res.status(400).json({ error: "Cannot reorder stops while shift is ACTIVE" });
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
        if (!stopIds.length) return res.status(400).json({ error: "stopIds required" });

        const totalStops = await prisma.stop.count({ where: { shiftId } });
        if (totalStops !== stopIds.length) return res.status(400).json({ error: "Stop ids mismatch" });

        const stops = await prisma.stop.findMany({
          where: { shiftId, id: { in: stopIds } },
          select: { id: true },
        });
        if (stops.length !== stopIds.length) return res.status(400).json({ error: "Stop ids mismatch" });

        await prisma.$transaction(
          stopIds.map((id, idx) => prisma.stop.update({ where: { id }, data: { order: idx + 1 } }))
        );

        await audit(req, {
          action: "SHIFT_STOPS_REORDER",
          entity: "Shift",
          entityId: shift.id,
          meta: { count: stopIds.length },
        });

        const full = await prisma.shift.findUnique({
          where: { id: shiftId },
          include: {
            stops: { orderBy: { order: "asc" } },
            progress: true,
            vehicle: true,
            driver: true,
            company: true,
            room: true,
          },
        });

        emitShift(io, full, "route:plan");
        return res.json({ ok: true, shift: full });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );
}
