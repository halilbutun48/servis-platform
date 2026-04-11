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
import { addDaysTR, atTR, dateOnlyUTCFromYmd, dayBitTRFromYmd, ymdTR } from "../../time/tr.js";
import { httpError, sendErrorResponse } from "../../errors/http.js";
import { rebuildShiftRouteStateBestEffort, clearShiftRoutePreviewCache } from "../../services/shiftRouteState.js";
import { upsertShiftSeriesCommercialBackboneByShiftId } from "../../services/paymentBackbone.js";

const emitShift = H.emitShift;

const getShiftAndCheckScopeOrThrow = H.getShiftAndCheckScopeOrThrow;

function isRouteShapePatch(body) {
  return Object.prototype.hasOwnProperty.call(body || {}, 'hubLat')
    || Object.prototype.hasOwnProperty.call(body || {}, 'hubLng')
    || Object.prototype.hasOwnProperty.call(body || {}, 'direction')
    || Object.prototype.hasOwnProperty.call(body || {}, 'pattern');
}

async function loadFullShift(shiftId) {
  return prisma.shift.findUnique({
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
}


async function createShiftWithStopsTx(tx, { body, effectiveCompanyId, effectiveStatus }) {
  const created = await tx.shift.create({
    data: {
      companyId: effectiveCompanyId,
      roomId: body.roomId ?? null,
      startAt: body.startAt,
      endAt: body.endAt,
      status: effectiveStatus,
      hubLat: body.hubLat ?? null,
      hubLng: body.hubLng ?? null,
      direction: body.direction ?? "INBOUND",
      pattern: body.pattern ?? "ONE_WAY",
      requiredPaxOverride: body.requiredPax ?? null,
      companyOfferVehicleId: body.companyOfferVehicleId ?? null,
      companyOfferAmount: body.companyOfferAmount ?? null,
      companyOfferNote: body.companyOfferNote ?? null,
    },
    include: { company: true, room: true, stops: true },
  });

  if (Array.isArray(body.stops) && body.stops.length) {
    await tx.stop.createMany({
      data: body.stops.map((s) => ({
        shiftId: created.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        order: s.order,
        type: s.type ?? "MANUAL",
      })),
    });
  }

  return created;
}

// --- Agreement overlap helpers (used to skip market offers when a contract already exists) ---
function overlapsTR(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function intervalsForDayTR(ag, ymd) {
  const mask = dayBitTRFromYmd(ymd);
  if ((Number(ag.weekMask || 0) & mask) === 0) return [];

  const startMin = Number(ag.startMin || 0);
  const endMin = Number(ag.endMin || 0);
  const start = atTR(ymd, startMin);

  if (endMin >= startMin) {
    return [[start, atTR(ymd, endMin)]];
  }

  const nextYmd = addDaysTR(ymd, 1);
  const midnightNext = atTR(nextYmd, 0);
  return [
    [start, midnightNext],
    [midnightNext, atTR(nextYmd, endMin)],
  ];
}

function agreementOverlapsRangeTR(ag, s, e) {
  const startYmd = ymdTR(s);
  const endYmd = ymdTR(e);
  const horizonEnd = addDaysTR(endYmd, 1);
  for (let cur = startYmd; cur <= horizonEnd; cur = addDaysTR(cur, 1)) {
    const ints = intervalsForDayTR(ag, cur);
    for (const [as, ae] of ints) {
      if (overlapsTR(as, ae, s, e)) return true;
    }
  }
  return false;
}

async function findAgreementBlockedRoomIdsForShift({ companyId, roomIds, startAt, endAt }) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  const startYmd = ymdTR(s);
  const endYmd = ymdTR(e);

  const candidates = await prisma.agreement.findMany({
    where: {
      companyId,
      roomId: { in: roomIds },
      status: { in: ["APPROVED", "ACTIVE"] },
      startDate: { lte: dateOnlyUTCFromYmd(endYmd) },
      endDate: { gte: dateOnlyUTCFromYmd(startYmd) },
    },
    select: { id: true, roomId: true, startDate: true, endDate: true, weekMask: true, startMin: true, endMin: true, status: true },
    orderBy: { id: "asc" },
  });

  const blocked = new Set();
  for (const ag of candidates) {
    if (agreementOverlapsRangeTR(ag, s, e)) blocked.add(Number(ag.roomId));
  }
  return blocked;
}
// --- /Agreement overlap helpers ---

// Company-focused endpoints (some are also allowed for ROOM/SUPER_ADMIN)
export function attachShiftCompanyRoutes(r, io) {
  r.post(
    "/guided-batch",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const rows = Array.isArray(req.body?.items) ? req.body.items : [];
        const uniqueStartDays = new Set(
          rows
            .map((row) => String(row?.startAt || "").slice(0, 10))
            .filter((ymd) => /^\d{4}-\d{2}-\d{2}$/.test(ymd))
        );
        const totalShiftCount = Number(rows.length || 0);
        const dayCount = Number(uniqueStartDays.size || 0);

        if (!rows.length) {
          return sendErrorResponse(res, httpError(400, "GUIDED_BATCH_EMPTY", "En az 1 taslak vardiya gerekli."));
        }
        if (dayCount > 7) {
          return sendErrorResponse(res, httpError(400, "GUIDED_DAY_LIMIT", "Guided en fazla 7 gün olabilir."));
        }
        if (totalShiftCount > 21) {
          return sendErrorResponse(res, httpError(400, "GUIDED_SHIFT_LIMIT", "Guided en fazla 21 vardiya oluşturabilir."));
        }

        const effectiveCompanyId = req.user.role === "COMPANY" ? req.user.companyId : Number(req.body?.companyId || 0);
        if (!effectiveCompanyId) {
          return sendErrorResponse(res, httpError(400, "companyId required"));
        }

        const parsedRows = rows.map((row) => validateWithZod(createShiftSchema, row));
        for (const body of parsedRows) {
          const hasHubLat = body.hubLat != null;
          const hasHubLng = body.hubLng != null;
          if (hasHubLat !== hasHubLng) {
            return sendErrorResponse(res, httpError(400, "hubLat+hubLng together"));
          }
          if (body.companyOfferVehicleId != null) {
            const v = await prisma.vehicle.findUnique({
              where: { id: body.companyOfferVehicleId },
              select: { id: true, roomId: true },
            });
            if (!v) return sendErrorResponse(res, httpError(400, "companyOfferVehicleId not found"));
            if (v.roomId && body.roomId && Number(v.roomId) !== Number(body.roomId)) {
              return sendErrorResponse(res, httpError(400, "BAD_REQUEST", "companyOfferVehicleId must belong to the same room"));
            }
          }
        }

        const created = await prisma.$transaction(async (tx) => {
          const rowsOut = [];
          for (const body of parsedRows) {
            const createdRow = await createShiftWithStopsTx(tx, {
              body,
              effectiveCompanyId,
              effectiveStatus: "DRAFT",
            });
            rowsOut.push(createdRow);
          }
          return rowsOut;
        });

        const fullItems = [];
        for (const shift of created) {
          await rebuildShiftRouteStateBestEffort(shift.id);
          await upsertShiftSeriesCommercialBackboneByShiftId(shift.id).catch(() => null);
          const full = await loadFullShift(shift.id);
          fullItems.push(full);
          await audit(req, {
            action: "SHIFT_CREATE",
            entity: "Shift",
            entityId: shift.id,
            meta: { status: "DRAFT", via: "GUIDED_BATCH" },
          });
          emitShift(io, full, "shift:list");
        }

        return res.json({
          ok: true,
          createdIds: fullItems.map((x) => Number(x.id)),
          items: fullItems,
          totalShiftCount,
          dayCount,
        });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

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
          return sendErrorResponse(res, httpError(400, "companyId required"));
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
          return sendErrorResponse(res, httpError(400, "hubLat+hubLng together"));
        }

        // Optional: companyOfferVehicleId verildiyse araç var mı ve aynı room mu?
        if (body.companyOfferVehicleId != null) {
          const v = await prisma.vehicle.findUnique({
            where: { id: body.companyOfferVehicleId },
            select: { id: true, roomId: true },
          });
          if (!v) {
            return sendErrorResponse(res, httpError(400, "companyOfferVehicleId not found"));
          }
          if (v.roomId && body.roomId && Number(v.roomId) !== Number(body.roomId)) {
            return sendErrorResponse(res, httpError(400, "BAD_REQUEST", "companyOfferVehicleId must belong to the same room"));
          }
        }

        const shift = await prisma.$transaction(async (tx) =>
          createShiftWithStopsTx(tx, { body, effectiveCompanyId, effectiveStatus })
        );

        await rebuildShiftRouteStateBestEffort(shift.id);
        await upsertShiftSeriesCommercialBackboneByShiftId(shift.id).catch(() => null);
        const full = await loadFullShift(shift.id);

        await audit(req, {
          action: "SHIFT_CREATE",
          entity: "Shift",
          entityId: shift.id,
          meta: { status: effectiveStatus },
        });

        emitShift(io, full, "shift:list");
        return res.json(full);
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );


  // COMPANY/SUPER_ADMIN: delete temporary guided draft before it reaches market
  r.delete(
    "/:id/guided-temp",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.id);
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await prisma.shift.findUnique({
          where: { id: shiftId },
          select: {
            id: true,
            companyId: true,
            roomId: true,
            status: true,
            _count: { select: { offers: true } },
          },
        });
        if (!shift) return sendErrorResponse(res, httpError(404, "Shift not found"));

        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        if (shift.status !== "DRAFT") {
          return sendErrorResponse(res, httpError(409, "Only DRAFT shifts can be deleted here"));
        }

        if (shift.roomId != null || Number(shift?._count?.offers || 0) > 0) {
          return sendErrorResponse(res, httpError(409, "Draft already moved beyond temp stage"));
        }

        await prisma.$transaction([
          prisma.notification.deleteMany({ where: { shiftId } }),
          prisma.pickupRequest.deleteMany({ where: { shiftId } }),
          prisma.stopAssignment.deleteMany({ where: { shiftId } }),
          prisma.shiftOffer.deleteMany({ where: { shiftId } }),
          prisma.shiftImport.deleteMany({ where: { shiftId } }),
          prisma.shiftPersonel.deleteMany({ where: { shiftId } }),
          prisma.shiftProgress.deleteMany({ where: { shiftId } }),
          prisma.stop.deleteMany({ where: { shiftId } }),
          prisma.shift.delete({ where: { id: shiftId } }),
        ]);

        await audit(req, {
          action: "SHIFT_DELETE_GUIDED_TEMP",
          entity: "Shift",
          entityId: shiftId,
          meta: { status: "DRAFT" },
        });

        return res.json({ ok: true, deleted: true, shiftId });
      } catch (e) {
        return sendErrorResponse(res, e);
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
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const body = validateWithZod(createShiftOffersSchema, req.body);

        const shift = await prisma.shift.findUnique({
          where: { id: shiftId },
          select: { id: true, companyId: true, roomId: true, status: true, startAt: true, endAt: true },
        });
        if (!shift) return sendErrorResponse(res, httpError(404, "Shift not found"));

        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        // Market shift only: roomId must be null
        if (shift.roomId != null) {
          return sendErrorResponse(res, httpError(400, "Shift already assigned to a room"));
        }

        if (shift.status !== "REQUESTED" && shift.status !== "DRAFT") {
          return sendErrorResponse(res, httpError(409, "Shift not editable for offers"));
        }

        const pendingGeoCount = await prisma.shiftPersonel.count({
          where: {
            shiftId,
            OR: [
              { personel: { geoStatus: { in: ["NEEDS_REVIEW", "FAILED"] } } },
              { personel: { homeLat: null } },
              { personel: { homeLng: null } },
            ],
          },
        });
        if (pendingGeoCount > 0) {
          return sendErrorResponse(res, httpError(409, "SHIFT_GEO_REVIEW_REQUIRED", "Shift has personel requiring geo review", { pendingGeoCount }));
        }

        const roomIds = Array.from(
          new Set((body.roomIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)))
        );
        if (!roomIds.length) return sendErrorResponse(res, httpError(400, "roomIds required"));

        // COMPANY: region gate (ops/KVKK) — offers can be sent only to rooms in the same region.
        let companyRegionId = null;
        if (req.user.role === "COMPANY") {
          const c = await prisma.company.findUnique({
            where: { id: shift.companyId },
            select: { regionId: true },
          });
          companyRegionId = c?.regionId ?? null;
        }

        const rooms = await prisma.room.findMany({
          where: { id: { in: roomIds }, status: "ACTIVE" },
          select: { id: true, regionId: true },
        });
        if (rooms.length !== roomIds.length) {
          return sendErrorResponse(res, httpError(400, "Some roomIds not found"));
        }

        if (companyRegionId != null) {
          const cross = rooms
            .filter((r) => r.regionId != null && Number(r.regionId) !== Number(companyRegionId))
            .map((r) => Number(r.id));
          if (cross.length) {
            return sendErrorResponse(res, httpError(409, "CROSS_REGION_OFFER_NOT_ALLOWED", "Cross-region offer not allowed", { companyRegionId, crossRoomIds: cross }));
          }
        }

        // GREENPACK_AGREEMENT_BYPASS (dev only): allow market offers even if an agreement exists (pack stability).
        const isGreenPack = process.env.NODE_ENV !== "production" && String(req.headers["x-greenpack"] || "") === "1";
        const blockedRoomIdsSet = isGreenPack ? new Set() : await findAgreementBlockedRoomIdsForShift({
          companyId: shift.companyId,
          roomIds,
          startAt: shift.startAt,
          endAt: shift.endAt,
        });

        const skippedRoomIds = roomIds.filter((rid) => blockedRoomIdsSet.has(Number(rid)));
        const effectiveRoomIds = roomIds.filter((rid) => !blockedRoomIdsSet.has(Number(rid)));
        if (!effectiveRoomIds.length) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_BLOCKED_ROOMS", "All selected rooms are already covered by an active agreement in this time window", { skippedRoomIds }));
        }

        await prisma.$transaction(async (tx) => {
          if (shift.status === "DRAFT") {
            await tx.shift.update({ where: { id: shiftId }, data: { status: "REQUESTED" } });
          }
          for (const rid of effectiveRoomIds) {
            await tx.shiftOffer.upsert({
              where: { shiftId_roomId: { shiftId, roomId: rid } },
              create: {
                shiftId,
                roomId: rid,
                status: "OPEN",
                amountCompany: body.amountCompany ?? null,
                noteCompany: body.noteCompany ?? null,
              },
              update: {
                status: "OPEN",
                amountCompany: body.amountCompany ?? null,
                noteCompany: body.noteCompany ?? null,
              },
            });
          }
        });

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
        return sendErrorResponse(res, e);
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
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const body = validateWithZod(updateShiftSchema, req.body);

        const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        // ✅ M54: Agreement kaynaklı shiftlerde pazarlık/offer kapalı
        if (shift?.agreementId) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));
        }

        // ✅ M19: hub pair validation (update)
        const updHasHubLat = Object.prototype.hasOwnProperty.call(body, "hubLat");
        const updHasHubLng = Object.prototype.hasOwnProperty.call(body, "hubLng");
        if (updHasHubLat !== updHasHubLng) {
          return sendErrorResponse(res, httpError(400, "hubLat+hubLng together"));
        }

        const routeShapeChanged = isRouteShapePatch(body);
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

        if (routeShapeChanged) await rebuildShiftRouteStateBestEffort(id);
        else clearShiftRoutePreviewCache(id);

        await audit(req, {
          action: "SHIFT_UPDATE",
          entity: "Shift",
          entityId: id,
        });

        await upsertShiftSeriesCommercialBackboneByShiftId(updated.id).catch(() => null);
        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
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
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const body = validateWithZod(updateCompanyOfferSchema, req.body);

        const shift = await getShiftAndCheckScopeOrThrow(id, req.user);
        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        // ✅ M19: hub pair validation (update)
        const updHasHubLat = Object.prototype.hasOwnProperty.call(body, "hubLat");
        const updHasHubLng = Object.prototype.hasOwnProperty.call(body, "hubLng");
        if (updHasHubLat !== updHasHubLng) {
          return sendErrorResponse(res, httpError(400, "hubLat+hubLng together"));
        }

        // only allow negotiate in DRAFT/REQUESTED (optional rule)
        if (!["DRAFT", "REQUESTED"].includes(String(shift.status))) {
          return sendErrorResponse(res, httpError(400, "BAD_REQUEST", `Offer not allowed for status=${shift.status}`));
        }

        if (body.companyOfferVehicleId != null) {
          const v = await prisma.vehicle.findUnique({
            where: { id: body.companyOfferVehicleId },
            select: { id: true, roomId: true },
          });
          if (!v) return sendErrorResponse(res, httpError(400, "companyOfferVehicleId not found"));
          if (v.roomId && shift.roomId && Number(v.roomId) !== Number(shift.roomId)) {
            return sendErrorResponse(res, httpError(400, "BAD_REQUEST", "companyOfferVehicleId must belong to the same room"));
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

        await upsertShiftSeriesCommercialBackboneByShiftId(updated.id).catch(() => null);
        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
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
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const body = validateWithZod(updateRoomOfferDecisionSchema, req.body);
        const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        // ✅ M19: hub pair validation (update)
        const updHasHubLat = Object.prototype.hasOwnProperty.call(body, "hubLat");
        const updHasHubLng = Object.prototype.hasOwnProperty.call(body, "hubLng");
        if (updHasHubLat !== updHasHubLng) {
          return sendErrorResponse(res, httpError(400, "hubLat+hubLng together"));
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

        await upsertShiftSeriesCommercialBackboneByShiftId(updated.id).catch(() => null);
        emitShift(io, updated, "shift:list");
        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
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
      if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

      const body = validateWithZod(extendShiftRequestSchema, req.body);
      const shift = await getShiftAndCheckScopeOrThrow(id, req.user);

      if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
        return sendErrorResponse(res, httpError(403, "Forbidden"));
      }

      if (!shift.roomId) {
        return sendErrorResponse(res, httpError(409, "Shift has no room (assign first)"));
      }

      const st = String(shift.status || "").toUpperCase();
      if (!["APPROVED", "ACTIVE"].includes(st)) {
        return sendErrorResponse(res, httpError(409, "Shift must be APPROVED/ACTIVE"));
      }

      if (shift.extendDecision === "PENDING" && shift.extendRequestedEndAt) {
        return sendErrorResponse(res, httpError(409, "There is already a pending extension request"));
      }

      const cur = new Date(shift.endAt);
      const next = new Date(body.requestedEndAt);
      if (!Number.isFinite(cur.getTime()) || !Number.isFinite(next.getTime())) {
        return sendErrorResponse(res, httpError(400, "Invalid date"));
      }
      if (!(next.getTime() > cur.getTime())) {
        return sendErrorResponse(res, httpError(400, "requestedEndAt must be > endAt"));
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
      return sendErrorResponse(res, e);
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
}

