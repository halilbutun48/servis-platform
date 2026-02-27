// backend/src/routes/shifts/company.js
import prisma from "../../prisma.js";
import { authRequired, requireRole } from "../../auth/middleware.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";
import { createNotification } from "../../notifications/service.js";

import {
  createShiftSchema,
  updateShiftSchema,
  createShiftOffersSchema,
  updateCompanyOfferSchema,
  updateRoomOfferDecisionSchema,
  addStopSchema,
  updateStopSchema,
  applyTemplateSchema,
  reorderStopsSchema,
  extendShiftRequestSchema,
} from "./schemas.js";

// Avoid named imports from helpers to prevent hard crashes at module-load time in edge environments.
import * as H from "./helpers.js";

const emitShift = H.emitShift;
const getShiftAndCheckScopeOrThrow = H.getShiftAndCheckScopeOrThrow;

// --- Agreement overlap helpers (used to skip market offers when a contract already exists) ---
function dateOnlyUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDaysUTC(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function minutesToDtUTC(day0, min) {
  return new Date(day0.getTime() + min * 60_000);
}
function dowMaskUTC(d) {
  // JS: 0=Sun ... 6=Sat; Bitmask: Mon=1 Tue=2 Wed=4 Thu=8 Fri=16 Sat=32 Sun=64
  const dow = d.getUTCDay();
  if (dow == 0) return 64;
  return 1 << (dow - 1);
}
function overlapsUTC(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}
function intervalsForDayUTC(ag, day0) {
  // week gate: only the "start day" is masked (night shift spills to next day)
  const mask = dowMaskUTC(day0);
  if ((Number(ag.weekMask || 0) & mask) === 0) return [];

  const start = minutesToDtUTC(day0, Number(ag.startMin || 0));
  const endMin = Number(ag.endMin || 0);
  const startMin = Number(ag.startMin || 0);

  if (endMin >= startMin) {
    const end = minutesToDtUTC(day0, endMin);
    return [[start, end]];
  }

  // midnight cross: [start..24:00) + [00:00..endMin) next day
  const end1 = minutesToDtUTC(day0, 1440);
  const next0 = addDaysUTC(day0, 1);
  const start2 = minutesToDtUTC(next0, 0);
  const end2 = minutesToDtUTC(next0, endMin);
  return [
    [start, end1],
    [start2, end2],
  ];
}

function agreementOverlapsRangeUTC(ag, s, e) {
  const s0 = dateOnlyUTC(s);
  const e0 = dateOnlyUTC(e);
  // iterate days in [s0..e0] + 1 for midnight spill
  for (let day = s0; day <= addDaysUTC(e0, 1); day = addDaysUTC(day, 1)) {
    const ints = intervalsForDayUTC(ag, day);
    for (const [as, ae] of ints) {
      if (overlapsUTC(as, ae, s, e)) return true;
    }
  }
  return false;
}

async function findAgreementBlockedRoomIdsForShift({ companyId, roomIds, startAt, endAt }) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const s0 = dateOnlyUTC(s);
  const e0 = dateOnlyUTC(e);

  const candidates = await prisma.agreement.findMany({
    where: {
      companyId,
      roomId: { in: roomIds },
      status: { in: ["APPROVED", "ACTIVE"] },
      // coarse date range filter
      startDate: { lte: e0 },
      endDate: { gte: s0 },
    },
    select: { id: true, roomId: true, startDate: true, endDate: true, weekMask: true, startMin: true, endMin: true, status: true },
    orderBy: { id: "asc" },
  });

  const blocked = new Set();
  for (const ag of candidates) {
    if (agreementOverlapsRangeUTC(ag, s, e)) blocked.add(Number(ag.roomId));
  }
  return blocked;
}
// --- /Agreement overlap helpers ---

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
        // ✅ COMPANY: wizard için DRAFT destekle (taslaklar UI'da gizli, sadece wizard includeDrafts=1 ile görür)
        const reqStatus = String(body.status ?? "").toUpperCase();
        const effectiveStatus =
          req.user.role === "COMPANY"
            ? (reqStatus === "DRAFT" ? "DRAFT" : "REQUESTED")
            : (body.status ?? "DRAFT");


        // ✅ M19: hub pair validation
        const hasHubLat = body.hubLat != null;
        const hasHubLng = body.hubLng != null;
        if (hasHubLat !== hasHubLng) {
          return res.status(400).json({ error: "hubLat+hubLng together" });
        }

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
            // ✅ M24: roomId optional (market shift)
            roomId: body.roomId ?? null,
            startAt: body.startAt,
            endAt: body.endAt,

            status: effectiveStatus,

            // ✅ M19: routing meta
            hubLat: body.hubLat ?? null,
            hubLng: body.hubLng ?? null,
            direction: body.direction ?? "INBOUND",
            pattern: body.pattern ?? "ONE_WAY",

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

  // ✅ M24: COMPANY creates marketplace offers for a market shift
  // POST /api/shifts/:id/offers
  r.post(
    "/:id/offers",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const body = validateWithZod(createShiftOffersSchema, req.body);

        const shift = await prisma.shift.findUnique({
          where: { id: shiftId },
          select: { id: true, companyId: true, roomId: true, status: true, startAt: true, endAt: true },
        });
        if (!shift) return res.status(404).json({ error: "Shift not found" });

        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        // Market shift only: roomId must be null
        if (shift.roomId != null) {
          return res.status(400).json({ error: "Shift already assigned to a room" });
        }

        if (shift.status !== "REQUESTED" && shift.status !== "DRAFT") {
          return res.status(409).json({ error: "Shift not editable for offers" });
        }

        // ✅ Taslak (DRAFT) shift: ilk teklif gönderiminde REQUESTED'a geçir (taslaklar sadece wizard içinde görünür)
        if (shift.status === "DRAFT") {
          await prisma.shift.update({ where: { id: shiftId }, data: { status: "REQUESTED" } });
        }

        const roomIds = Array.from(new Set((body.roomIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x))));
        if (!roomIds.length) return res.status(400).json({ error: "roomIds required" });

        const rooms = await prisma.room.findMany({
          where: { id: { in: roomIds }, status: "ACTIVE" },
          select: { id: true },
        });
        if (rooms.length !== roomIds.length) {
          return res.status(400).json({ error: "Some roomIds not found" });
        }

        // ✅ If there is an active agreement (contract) overlapping this shift for a room,
        // skip creating market offers for that room to avoid duplicate tracking (Agreement vs Market).
        const blockedRoomIdsSet = await findAgreementBlockedRoomIdsForShift({
          companyId: shift.companyId,
          roomIds,
          startAt: shift.startAt,
          endAt: shift.endAt,
        });

        const skippedRoomIds = roomIds.filter((rid) => blockedRoomIdsSet.has(Number(rid)));
        const effectiveRoomIds = roomIds.filter((rid) => !blockedRoomIdsSet.has(Number(rid)));
        if (!effectiveRoomIds.length) {
          return res.status(409).json({
            error: "All selected rooms are already covered by an active agreement in this time window",
            skippedRoomIds,
          });
        }

        await prisma.$transaction(
          effectiveRoomIds.map((rid) =>
            prisma.shiftOffer.upsert({
              where: { shiftId_roomId: { shiftId, roomId: rid } },
              create: {
                shiftId,
                roomId: rid,
                status: "OPEN",
                amountCompany: body.amountCompany ?? null,
                noteCompany: body.noteCompany ?? null,
              },
              update: {
                // idempotent bulk: refresh company amount/note and reopen unless accepted/cancelled
                status: "OPEN",
                amountCompany: body.amountCompany ?? null,
                noteCompany: body.noteCompany ?? null,
              },
            })
          )
        );

        const items = await prisma.shiftOffer.findMany({
          where: { shiftId },
          orderBy: [{ id: "asc" }],
        });

        // WS: notify company + each room
        io?.to?.(`company:${shift.companyId}`)?.emit?.("offer:update", {
          kind: "offer:bulk",
          shiftId,
          roomIds: effectiveRoomIds,
          skippedRoomIds,
        });
        for (const rid of effectiveRoomIds) {
          io?.to?.(`room:${rid}`)?.emit?.("offer:update", {
            kind: "offer:inbox",
            shiftId,
            roomId: rid,
          });
        }

        return res.json({ ok: true, items, skippedRoomIds });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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

        // ✅ M19: hub pair validation (update)
        const updHasHubLat = Object.prototype.hasOwnProperty.call(body, "hubLat");
        const updHasHubLng = Object.prototype.hasOwnProperty.call(body, "hubLng");
        if (updHasHubLat !== updHasHubLng) {
          return res.status(400).json({ error: "hubLat+hubLng together" });
        }

        const updated = await prisma.shift.update({
          where: { id },
          data: {
            startAt: body.startAt ?? undefined,
            endAt: body.endAt ?? undefined,
            status: body.status ?? undefined,
            // ✅ M19: routing meta
            hubLat: body.hubLat === undefined ? undefined : body.hubLat,
            hubLng: body.hubLng === undefined ? undefined : body.hubLng,
            direction: body.direction ?? undefined,
            pattern: body.pattern ?? undefined,
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

        // ✅ M19: hub pair validation (update)
        const updHasHubLat = Object.prototype.hasOwnProperty.call(body, "hubLat");
        const updHasHubLng = Object.prototype.hasOwnProperty.call(body, "hubLng");
        if (updHasHubLat !== updHasHubLng) {
          return res.status(400).json({ error: "hubLat+hubLng together" });
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

        // ✅ M19: hub pair validation (update)
        const updHasHubLat = Object.prototype.hasOwnProperty.call(body, "hubLat");
        const updHasHubLng = Object.prototype.hasOwnProperty.call(body, "hubLng");
        if (updHasHubLat !== updHasHubLng) {
          return res.status(400).json({ error: "hubLat+hubLng together" });
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
    type: "SHIFT_OFFER_DECISION",
    scope: "ROOM",
    roomId: updated.roomId,
    companyId: updated.companyId,
    shiftId: id,
    payload: {
      v: 1,
      title: `Company decision: ${body.decision}`,
      message: `Shift #${id}${body.note ? " — " + body.note : ""}`,
    },
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

  

// COMPANY/SUPER_ADMIN: request shift end extension (Company → Room)
r.put(
  "/:id/extend-request",
  authRequired(),
  requireRole("COMPANY", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "bad shiftId" });

      const body = validateWithZod(extendShiftRequestSchema, req.body);
      const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

      if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!shift.roomId) {
        return res.status(409).json({ error: "Shift has no room (assign first)" });
      }

      const st = String(shift.status || "").toUpperCase();
      if (!["APPROVED", "ACTIVE"].includes(st)) {
        return res.status(409).json({ error: "Shift must be APPROVED/ACTIVE" });
      }

      if (shift.extendDecision === "PENDING" && shift.extendRequestedEndAt) {
        return res.status(409).json({ error: "There is already a pending extension request" });
      }

      const cur = new Date(shift.endAt);
      const next = new Date(body.requestedEndAt);
      if (!Number.isFinite(cur.getTime()) || !Number.isFinite(next.getTime())) {
        return res.status(400).json({ error: "Invalid date" });
      }
      if (!(next.getTime() > cur.getTime())) {
        return res.status(400).json({ error: "requestedEndAt must be > endAt" });
      }

      const updated = await prisma.shift.update({
        where: { id },
        data: {
          extendRequestedEndAt: next,
          extendRequestedAt: new Date(),
          extendDecision: "PENDING",
          extendNoteCompany: body.noteCompany ?? null,
          extendNoteRoom: null,
          extendDecisionAt: null,
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
        action: "SHIFT_EXTEND_REQUEST",
        entity: "Shift",
        entityId: id,
        meta: { requestedEndAt: next.toISOString() },
      });

      // notify ROOM
      await createNotification({
        type: "SHIFT_EXTEND_REQUEST",
        scope: "ROOM",
        roomId: updated.roomId,
        companyId: updated.companyId,
        shiftId: id,
        payload: {
          v: 1,
          title: "Süre uzatma talebi",
          message: `Shift #${id} için yeni bitiş: ${next.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`,
        },
        dedupeKey: `shift:${id}:extend:${next.toISOString()}`,
      });

      emitShift(io, updated, "shift:list");
      return res.json(updated);
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
