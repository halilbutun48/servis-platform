// backend/src/routes/shifts/company.js
import prisma from "../../prisma.js";
import { authRequired, requireRole, requireStepUpWrite } from "../../auth/middleware.js";
import { validateWithZod } from "../../z.js";
import { audit } from "../../audit.js";
import { createNotification } from "../../notifications/service.js";

import {
  createShiftSchema,
  updateShiftSchema,
  createShiftOffersSchema,
  updateCompanyOfferSchema,
  updateRoomOfferDecisionSchema,
  extendShiftRequestSchema,
} from "./schemas.js";

// Avoid named imports from helpers to prevent hard crashes at module-load time in edge environments.
import * as H from "./helpers.js";
import { httpError, sendErrorResponse } from "../../errors/http.js";
import { findAgreementBlockedRoomIdsForShift } from "../../services/agreementOfferCoverage.js";
import {
  isRouteShapePatch,
  requireCompanyOfferVehicleSameRoomOrThrow,
  requireHubPairOrThrow,
} from "../../services/companyShiftValidation.js";
import {
  auditCompanyShiftMutation,
  publishCompanyShiftMutation,
  refreshCompanyShiftRouteStateAfterMutation,
  syncCompanyShiftCommercialBackbone,
} from "../../services/companyShiftMutationTail.js";
import { requireSameRegionOrThrow } from "../../region/ownership.js";
import { isGreenpackBypassAllowed } from "../../auth/securityPolicy.js";
import { buildShiftCompanyStopsRouter } from "./shiftsCompanyStopsRouter.js";

const emitShift = H.emitShift;
const decorateShiftWithRegionContext = H.decorateShiftWithRegionContext;

const getShiftAndCheckScopeOrThrow = H.getShiftAndCheckScopeOrThrow;

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

async function assertCompanyRoomRegionMatchOrThrow({ companyId, roomId, label }) {
  if (!roomId) return null;

  const [company, room] = await Promise.all([
    prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: {
        id: true,
        regionId: true,
        district: true,
        region: { select: { id: true, name: true } },
      },
    }),
    prisma.room.findUnique({
      where: { id: Number(roomId) },
      select: {
        id: true,
        regionId: true,
        district: true,
        region: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!company) throw Object.assign(new Error("Company not found"), { status: 404 });
  if (!room) throw Object.assign(new Error("Room not found"), { status: 404 });

  return requireSameRegionOrThrow({ company, room, label });
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

// Company-focused endpoints (some are also allowed for ROOM/SUPER_ADMIN)
export function attachShiftCompanyRoutes(r, io) {
  r.use(authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), requireStepUpWrite("COMPANY", "ROOM", "SUPER_ADMIN"));

  r.post(
    "/guided-batch",
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
            requireHubPairOrThrow(body);
            await assertCompanyRoomRegionMatchOrThrow({
              companyId: effectiveCompanyId,
              roomId: body.roomId ?? null,
              label: "GUIDED_BATCH_SHIFT_CREATE",
            });
            if (body.companyOfferVehicleId != null) {
              await requireCompanyOfferVehicleSameRoomOrThrow({
                companyOfferVehicleId: body.companyOfferVehicleId,
                roomId: body.roomId,
              });
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
          await refreshCompanyShiftRouteStateAfterMutation(shift.id, true);
          await syncCompanyShiftCommercialBackbone(shift.id);
          const full = await loadFullShift(shift.id);
          fullItems.push(full);
          await auditCompanyShiftMutation(req, {
            action: "SHIFT_CREATE",
            entityId: shift.id,
            meta: { status: "DRAFT", via: "GUIDED_BATCH" },
          });
          publishCompanyShiftMutation(io, emitShift, full, "shift:list");
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
          requireHubPairOrThrow(body);
          await assertCompanyRoomRegionMatchOrThrow({
            companyId: effectiveCompanyId,
            roomId: body.roomId ?? null,
            label: "SHIFT_CREATE",
          });

          // Optional: companyOfferVehicleId verildiyse araç var mı ve aynı room mu?
          if (body.companyOfferVehicleId != null) {
            await requireCompanyOfferVehicleSameRoomOrThrow({
              companyOfferVehicleId: body.companyOfferVehicleId,
            roomId: body.roomId,
          });
        }

        const shift = await prisma.$transaction(async (tx) =>
          createShiftWithStopsTx(tx, { body, effectiveCompanyId, effectiveStatus })
        );

        await refreshCompanyShiftRouteStateAfterMutation(shift.id, true);
        await syncCompanyShiftCommercialBackbone(shift.id);
        const full = await loadFullShift(shift.id);

        await auditCompanyShiftMutation(req, {
          action: "SHIFT_CREATE",
          entityId: shift.id,
          meta: { status: effectiveStatus },
        });

        publishCompanyShiftMutation(io, emitShift, full, "shift:list");
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
        const isGreenPack = isGreenpackBypassAllowed(req);
        const blockedRoomIdsSet = isGreenPack ? new Set() : await findAgreementBlockedRoomIdsForShift({
          companyId: shift.companyId,
          roomIds,
          startAt: shift.startAt,
          endAt: shift.endAt,
        });

        const agreementCoveredRoomIds = roomIds.filter((rid) => blockedRoomIdsSet.has(Number(rid)));
        const skippedRoomIds = [];
        const effectiveRoomIds = roomIds.slice();

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
          agreementCoveredRoomIds,
          skippedRoomIds,
        });
        for (const rid of effectiveRoomIds) {
          io?.to?.(`room:${rid}`)?.emit?.("offer:update", {
            kind: "offer:inbox",
            shiftId,
            roomId: rid,
          });
        }

        return res.json({ ok: true, items, skippedRoomIds, agreementCoveredRoomIds });
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
        requireHubPairOrThrow(body, { strict: true });

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

        await refreshCompanyShiftRouteStateAfterMutation(id, routeShapeChanged);

        await auditCompanyShiftMutation(req, {
          action: "SHIFT_UPDATE",
          entityId: id,
        });

        await syncCompanyShiftCommercialBackbone(updated.id);
        const decoratedUpdated = decorateShiftWithRegionContext(updated);
        publishCompanyShiftMutation(io, emitShift, decoratedUpdated, "shift:list");
        return res.json(decoratedUpdated);
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
        requireHubPairOrThrow(body, { strict: true });

        // only allow negotiate in DRAFT/REQUESTED (optional rule)
        if (!["DRAFT", "REQUESTED"].includes(String(shift.status))) {
          return sendErrorResponse(res, httpError(400, "BAD_REQUEST", `Offer not allowed for status=${shift.status}`));
        }

        if (body.companyOfferVehicleId != null) {
          await requireCompanyOfferVehicleSameRoomOrThrow({
            companyOfferVehicleId: body.companyOfferVehicleId,
            roomId: shift.roomId,
          });
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

        await auditCompanyShiftMutation(req, {
          action: "SHIFT_COMPANY_OFFER",
          entityId: id,
        });

        await syncCompanyShiftCommercialBackbone(updated.id);
        const decoratedUpdated = decorateShiftWithRegionContext(updated);
        publishCompanyShiftMutation(io, emitShift, decoratedUpdated, "shift:list");
        return res.json(decoratedUpdated);
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
        requireHubPairOrThrow(body, { strict: true });

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

        await auditCompanyShiftMutation(req, {
          action: "SHIFT_ROOM_OFFER_DECISION",
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

        await syncCompanyShiftCommercialBackbone(updated.id);
        const decoratedUpdated = decorateShiftWithRegionContext(updated);
        publishCompanyShiftMutation(io, emitShift, decoratedUpdated, "shift:list");
        return res.json(decoratedUpdated);
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

      await auditCompanyShiftMutation(req, {
        action: "SHIFT_EXTEND_REQUEST",
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

      const decoratedUpdated = decorateShiftWithRegionContext(updated);
      publishCompanyShiftMutation(io, emitShift, decoratedUpdated, "shift:list");
      return res.json(decoratedUpdated);
    } catch (e) {
      return sendErrorResponse(res, e);
    }
  }
);

  r.use(buildShiftCompanyStopsRouter(io));
}
