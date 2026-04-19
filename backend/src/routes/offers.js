// backend/src/routes/offers.js
// M24 — Shift marketplace offers (multi-room)
// M25 — status filtreleri
// M28 — COMPANY offer directory (open offers summary)

import express from "express";
import { z } from "zod";
import prisma from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { rememberResponse } from "../utils/responseCache.js";
import { httpError, sendErrorResponse } from "../errors/http.js";
import { validateWithZod } from "../z.js";
import { findPackageShiftIdsByShiftId } from "../services/shiftPackage.js";

import { counterShiftOfferSchema } from "./shifts/schemas.js";
import * as H from "./shifts/helpers.js";

const bulkCounterSchema = z.object({
  offerIds: z.array(z.coerce.number().int().positive()).min(1).max(50),
  amountRoom: z.coerce.number().int().positive(),
  noteRoom: z.string().max(500).optional().nullable(),
});

const companyCounterSchema = z.object({
  amountCompany: z.coerce.number().int().positive(),
  noteCompany: z.string().max(500).optional().nullable(),
});

const bulkCompanyCounterSchema = z.object({
  offerIds: z.array(z.coerce.number().int().positive()).min(1).max(100).optional(),
  shiftIds: z.array(z.coerce.number().int().positive()).min(1).max(100).optional(),
  roomId: z.coerce.number().int().positive(),
  amountCompany: z.coerce.number().int().positive(),
  noteCompany: z.string().max(500).optional().nullable(),
});

const companyAcceptPackageSchema = z.object({
  shiftIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  roomId: z.coerce.number().int().positive(),
});

const roomAcceptPackageSchema = z.object({
  offerIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
});

const emitShift = H.emitShift;

function emitOffer(io, { companyId, roomId, shiftId, kind, offerId }) {
  if (!io) return;
  const payload = { kind, offerId, shiftId, roomId, companyId };
  if (companyId) io.to(`company:${companyId}`).emit("offer:update", payload);
  if (roomId) io.to(`room:${roomId}`).emit("offer:update", payload);
}

const OFFER_STATUSES = new Set(["OPEN", "COUNTERED", "ACCEPTED", "CANCELLED"]);

function shouldBypassCompanyOffersCache(req) {
  const fresh = String(req.query?.fresh || "").trim();
  const header = String(req.headers?.["x-bypass-response-cache"] || "").trim();
  return fresh === "1" || header === "1";
}

async function loadCompanyDirectoryItems(where, take) {
  return prisma.shiftOffer.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take,
    include: {
      room: true,
      shift: {
        include: { company: true },
      },
    },
  });
}

async function finalizeAcceptedOfferTx(tx, offer) {
  const shiftId = Number(offer.shiftId);
  const companyId = Number(offer?.shift?.companyId || 0);
  const acceptedRoomId = Number(offer.roomId);

  const offerRows = await tx.shiftOffer.findMany({
    where: { shiftId },
    select: { id: true, roomId: true },
  });
  const allRoomIds = Array.from(new Set(offerRows.map((x) => Number(x.roomId)).filter((x) => x > 0)));

  await tx.shiftOffer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } });
  const upd = await tx.shiftOffer.updateMany({
    where: { shiftId, id: { not: offer.id }, status: { in: ["OPEN", "COUNTERED"] } },
    data: { status: "CANCELLED" },
  });

  await tx.shift.update({
    where: { id: shiftId },
    data: {
      roomId: acceptedRoomId,
      companyOfferAmount: offer.amountCompany ?? null,
      roomOfferAmount: offer.amountRoom ?? null,
      roomOfferDecision: "ACCEPTED",
      roomOfferDecisionAt: new Date(),
    },
  });

  return {
    offerId: Number(offer.id),
    shiftId,
    companyId,
    acceptedRoomId,
    cancelledCount: Number(upd?.count || 0),
    offerRows,
    allRoomIds,
  };
}

async function emitAcceptedOfferResult(io, meta) {
  const shiftFull = await prisma.shift.findUnique({
    where: { id: meta.shiftId },
    include: {
      stops: { orderBy: { order: "asc" } },
      progress: true,
      vehicle: true,
      driver: true,
      company: true,
      room: true,
    },
  });

  io?.to?.(`company:${meta.companyId}`)?.emit?.("offer:update", {
    kind: "offer:accept",
    offerId: meta.offerId,
    shiftId: meta.shiftId,
    roomId: meta.acceptedRoomId,
    companyId: meta.companyId,
  });
  for (const rid of meta.allRoomIds) {
    const row = meta.offerRows.find((x) => Number(x.roomId) === Number(rid));
    io?.to?.(`room:${rid}`)?.emit?.("offer:update", {
      kind: Number(rid) === Number(meta.acceptedRoomId) ? "offer:accepted" : "offer:cancelled",
      offerId: row?.id ?? meta.offerId,
      shiftId: meta.shiftId,
      roomId: rid,
      companyId: meta.companyId,
    });
  }

  emitShift(io, shiftFull, "shift:update");
  return { cancelledCount: meta.cancelledCount, shift: shiftFull };
}

async function finalizeAcceptedOffer(io, offer) {
  let meta = null;
  await prisma.$transaction(async (tx) => {
    meta = await finalizeAcceptedOfferTx(tx, offer);
  });
  return emitAcceptedOfferResult(io, meta);
}

async function loadCompanyPackageAcceptanceTargetsOrThrow({ companyId, roomId, shiftIds }) {
  const ids = Array.from(new Set((shiftIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
  if (!ids.length) throw httpError(400, "shiftIds required");

  const canonicalIds = await findPackageShiftIdsByShiftId(ids[0]);
  const targetShiftIds = canonicalIds.length > 1 ? canonicalIds : ids;
  const sameSize = targetShiftIds.length === ids.length;
  const sameItems = sameSize && targetShiftIds.every((id) => ids.includes(id));
  if (targetShiftIds.length > 1 && !sameItems) {
    throw httpError(409, "PACKAGE_ALL_OR_NOTHING", "Paket kısmi kabul edilemez; tüm paket birlikte kabul edilmeli");
  }

  const shifts = await prisma.shift.findMany({
    where: { id: { in: targetShiftIds } },
    select: { id: true, companyId: true, roomId: true, agreementId: true, startAt: true, endAt: true },
    orderBy: [{ id: "asc" }],
  });
  if (shifts.length !== targetShiftIds.length) throw httpError(404, "Some shifts not found");
  if (shifts.some((row) => Number(row.companyId || 0) !== Number(companyId || 0))) throw httpError(403, "Forbidden");
  if (shifts.some((row) => Number(row.agreementId || 0) > 0)) throw httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled");
  if (shifts.some((row) => row.roomId != null && Number(row.roomId) !== Number(roomId))) throw httpError(409, "PACKAGE_SHIFT_ALREADY_ASSIGNED", "Paket içindeki bir vardiya başka room'a atanmış");
  // Package accept is a commercial decision; vehicle/driver readiness is checked later in the pending operation flow.

  const offers = await prisma.shiftOffer.findMany({
    where: { shiftId: { in: targetShiftIds }, roomId: Number(roomId) },
    include: { shift: { select: { id: true, companyId: true, roomId: true, status: true, agreementId: true } } },
    orderBy: [{ shiftId: "asc" }],
  });
  if (offers.length !== targetShiftIds.length) throw httpError(409, "PACKAGE_ROOM_MISSING_OFFER", "Room paket içindeki tüm vardiyalar için teklif vermemiş");

  const allowedStatuses = new Set(["OPEN", "COUNTERED"]);
  const blocked = offers.find((offer) => !allowedStatuses.has(String(offer.status || "").toUpperCase()));
  if (blocked) throw httpError(409, "PACKAGE_OFFER_NOT_ACTIVE", `Paket içindeki Shift #${blocked.shiftId} için aktif teklif yok`);
  const assignedElsewhere = offers.find((offer) => offer.shift?.roomId != null && Number(offer.shift.roomId) !== Number(roomId));
  if (assignedElsewhere) throw httpError(409, "PACKAGE_SHIFT_ALREADY_ASSIGNED", `Shift #${assignedElsewhere.shiftId} başka room'a atanmış`);

  return { targetShiftIds, offers };
}

async function loadRoomPackageAcceptanceTargetsOrThrow({ roomId, offerIds }) {
  const ids = Array.from(new Set((offerIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
  if (!ids.length) throw httpError(400, "offerIds required");

  const offers = await prisma.shiftOffer.findMany({
    where: { id: { in: ids }, roomId: Number(roomId) },
    include: { shift: { select: { id: true, companyId: true, roomId: true, status: true, agreementId: true } } },
    orderBy: [{ shiftId: "asc" }],
  });
  if (offers.length !== ids.length) throw httpError(404, "Some offers not found for this room");

  const shiftIds = offers.map((offer) => Number(offer.shiftId)).filter((x) => x > 0);
  const canonicalIds = await findPackageShiftIdsByShiftId(shiftIds[0]);
  const targetShiftIds = canonicalIds.length > 1 ? canonicalIds : shiftIds;
  const sameSize = targetShiftIds.length === shiftIds.length;
  const sameItems = sameSize && targetShiftIds.every((id) => shiftIds.includes(id));
  if (targetShiftIds.length > 1 && !sameItems) {
    throw httpError(409, "PACKAGE_ALL_OR_NOTHING", "Paket kısmi kabul edilemez; tüm paket birlikte kabul edilmeli");
  }

  const byShiftId = new Map(offers.map((offer) => [Number(offer.shiftId), offer]));
  const targetOffers = targetShiftIds.map((shiftId) => byShiftId.get(Number(shiftId))).filter(Boolean);
  if (targetOffers.length !== targetShiftIds.length) throw httpError(409, "PACKAGE_ROOM_MISSING_OFFER", "Room paket içindeki tüm vardiyalar için teklif seçmeli");

  const blocked = targetOffers.find((offer) => Number(offer?.shift?.agreementId || 0) > 0);
  if (blocked) throw httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled");
  const cancelled = targetOffers.find((offer) => String(offer.status || "").toUpperCase() === "CANCELLED");
  if (cancelled) throw httpError(409, "Offer cancelled");
  const accepted = targetOffers.find((offer) => String(offer.status || "").toUpperCase() === "ACCEPTED");
  if (accepted) throw httpError(409, "Offer already accepted");
  const assignedElsewhere = targetOffers.find((offer) => offer.shift?.roomId != null && Number(offer.shift.roomId) !== Number(roomId));
  if (assignedElsewhere) throw httpError(409, "Shift already assigned");
  // Package accept is a commercial decision; vehicle/driver readiness is checked later in the pending operation flow.

  return { targetShiftIds, offers: targetOffers };
}

function parseStatusFilter(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const parts = t
    .split(",")
    .map((x) => String(x || "").trim().toUpperCase())
    .filter(Boolean)
    .filter((x) => OFFER_STATUSES.has(x));
  const uniq = Array.from(new Set(parts));
  return uniq.length ? uniq : null;
}

export function offersRouter(io) {
  const r = express.Router();

  // ROOM: inbox
  // GET /api/offers/inbox?status=OPEN,COUNTERED
  r.get(
    "/inbox",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const roomId =
          req.user.role === "ROOM" ? Number(req.user.roomId) : Number(req.query.roomId || 0);
        if (!Number.isFinite(roomId) || roomId <= 0) return res.json({ items: [] });

        const statusIn = parseStatusFilter(req.query.status);
        const take = Math.min(500, Math.max(1, Number(req.query.take || 200)));

        const items = await prisma.shiftOffer.findMany({
          where: {
            roomId,
            ...(statusIn ? { status: { in: statusIn } } : {}),
          },
          orderBy: [{ updatedAt: "desc" }],
          take,
          include: {
            room: true,
            shift: {
              include: {
                company: true,
                organizationPlan: { select: { stops: { select: { passengerCount: true } } } },
                _count: { select: { assignments: true, people: true } },
              },
            },
          },
        });

        const mapped = items.map((o) => {
          const assignmentCount = Number(o?.shift?._count?.assignments || 0);
          const peopleCount = Number(o?.shift?._count?.people || 0);
          const orgPassengerCount = Array.isArray(o?.shift?.organizationPlan?.stops)
            ? o.shift.organizationPlan.stops.reduce(
                (sum, st) => sum + Math.max(0, Number(st?.passengerCount || 0)),
                0
              )
            : 0;
          const requiredPaxOverride = Math.max(0, Number(o?.shift?.requiredPaxOverride || 0));
          const requiredPax = Math.max(assignmentCount, peopleCount, Number(orgPassengerCount || 0), requiredPaxOverride, 0);

          return {
            ...o,
            shift: o.shift
              ? {
                  ...o.shift,
                  assignmentCount,
                  peopleCount,
                  orgPassengerCount,
                  requiredPaxOverride,
                  requiredPax,
                }
              : o.shift,
          };
        });

        return res.json({ items: mapped });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // COMPANY: directory (all offers for my company)
  // GET /api/offers/company?status=OPEN,COUNTERED
  r.get(
    "/company",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const companyIdRaw =
          req.user.role === "COMPANY" ? req.user.companyId : Number(req.query.companyId || 0);
        const companyId = Number(companyIdRaw);
        if (!Number.isFinite(companyId) || companyId <= 0) return res.json({ items: [] });

        const statusIn = parseStatusFilter(req.query.status);
        const take = Math.min(400, Math.max(1, Number(req.query.take || 240)));
        const q = String(req.query.q || "").trim();

        // ✅ garanti yöntem: company shiftIds -> offers shiftId IN (...)
        const shifts = await prisma.shift.findMany({
          where: { companyId },
          select: { id: true },
          take: 5000,
        });
        const shiftIds = shifts.map((s) => s.id);
        if (!shiftIds.length) return res.json({ items: [] });

        const where = {
          shiftId: { in: shiftIds },
          ...(statusIn ? { status: { in: statusIn } } : {}),
        };
        if (q) {
          where.OR = [
            { noteCompany: { contains: q, mode: "insensitive" } },
            { noteRoom: { contains: q, mode: "insensitive" } },
            { room: { is: { name: { contains: q, mode: "insensitive" } } } },
          ];
          if (Number.isFinite(Number(q)) && Number(q) > 0) {
            where.OR.push({ id: Number(q) }, { shiftId: Number(q) }, { roomId: Number(q) });
          }
        }

        if (shouldBypassCompanyOffersCache(req)) {
          const items = await loadCompanyDirectoryItems(where, take);
          return res.json({ items });
        }

        const payload = await rememberResponse(`offers-company:${companyId}:${statusIn ? statusIn.join(",") : "all"}:${q || "-"}:${take}`, async () => {
          const items = await loadCompanyDirectoryItems(where, take);
          return { items };
        }, { ttlMs: 15000, scope: { role: req.user?.role, companyId: req.user?.companyId, userId: req.user?.id } });

        return res.json(payload);
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // COMPANY: list offers for a shift
  // GET /api/offers/shift/:shiftId?status=OPEN,COUNTERED
  r.get(
    "/shift/:shiftId",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const shiftId = Number(req.params.shiftId);
        if (!Number.isFinite(shiftId)) return sendErrorResponse(res, httpError(400, "bad shiftId"));

        const shift = await prisma.shift.findUnique({
          where: { id: shiftId },
          select: { id: true, companyId: true },
        });
        if (!shift) return sendErrorResponse(res, httpError(404, "Shift not found"));
        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        const statusIn = parseStatusFilter(req.query.status);

        const items = await prisma.shiftOffer.findMany({
          where: {
            shiftId,
            ...(statusIn ? { status: { in: statusIn } } : {}),
          },
          orderBy: [{ id: "asc" }],
          include: { room: true },
        });

        return res.json({ items });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // ROOM: counter offer
  // PUT /api/offers/:id/counter
  r.put(
    "/:id/counter",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad offerId"));

        const body = validateWithZod(counterShiftOfferSchema, req.body);

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { id: true, companyId: true, agreementId: true } } },
        });
        if (!offer) return sendErrorResponse(res, httpError(404, "Offer not found"));

        if (req.user.role === "ROOM" && offer.roomId !== req.user.roomId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        if (offer.status === "CANCELLED") return sendErrorResponse(res, httpError(409, "Offer cancelled"));
        if (offer.status === "ACCEPTED") return sendErrorResponse(res, httpError(409, "Offer already accepted"));

        // ✅ M54: Agreement kaynaklı shiftlerde market offers kapalı
        if (offer?.shift?.agreementId) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));
        }

        const updated = await prisma.shiftOffer.update({
          where: { id },
          data: {
            status: "COUNTERED",
            amountRoom: body.amountRoom ?? null,
            noteRoom: body.noteRoom ?? null,
          },
          include: { room: true },
        });

        emitOffer(io, {
          kind: "offer:counter",
          offerId: id,
          shiftId: offer.shiftId,
          roomId: offer.roomId,
          companyId: offer.shift.companyId,
        });

        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // ROOM: bulk counter (package reply)
  // POST /api/offers/bulk-counter
  r.post(
    "/bulk-counter",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const roomId =
          req.user.role === "ROOM" ? Number(req.user.roomId) : Number(req.body.roomId || 0);
        if (!Number.isFinite(roomId) || roomId <= 0) return sendErrorResponse(res, httpError(400, "roomId required"));

        const { offerIds, amountRoom, noteRoom } = validateWithZod(bulkCounterSchema, req.body);
        const ids = Array.from(new Set(offerIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))));
        if (!ids.length) return sendErrorResponse(res, httpError(400, "offerIds required"));

        const rows = await prisma.shiftOffer.findMany({
          where: { id: { in: ids }, roomId },
          include: { shift: { select: { id: true, companyId: true, agreementId: true } } },
        });

        // security: caller cannot counter offers outside their room
        if (rows.length !== ids.length) {
          return sendErrorResponse(res, httpError(404, "Some offers not found for this room"));
        }

        // Agreement shifts: offers are disabled
        const agBlocked = rows.find((r) => r?.shift?.agreementId);
        if (agBlocked) {
          return res.status(409).json({
            error: "Agreement shift: offers disabled",
            code: "AGREEMENT_NO_OFFERS",
          });
        }

        // Update only active offers (OPEN/COUNTERED)
        const upd = await prisma.shiftOffer.updateMany({
          where: { id: { in: ids }, roomId, status: { in: ["OPEN", "COUNTERED"] } },
          data: {
            status: "COUNTERED",
            amountRoom: Number(amountRoom),
            noteRoom: noteRoom ? String(noteRoom) : null,
          },
        });

        // emit per offer (keeps UI simple)
        for (const o of rows) {
          emitOffer(io, {
            kind: "offer:counter",
            offerId: o.id,
            shiftId: o.shiftId,
            roomId: o.roomId,
            companyId: o.shift.companyId,
          });
        }

        return res.json({ ok: true, updatedCount: Number(upd?.count || 0), total: ids.length });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // COMPANY: counter an offer on market
  r.put(
    "/:id/company-counter",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad offerId"));

        const body = validateWithZod(companyCounterSchema, req.body);
        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { companyId: true, agreementId: true, roomId: true } } },
        });
        if (!offer) return sendErrorResponse(res, httpError(404, "Offer not found"));
        if (req.user.role === "COMPANY" && Number(offer?.shift?.companyId || 0) !== Number(req.user.companyId || 0)) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }
        if (offer?.shift?.agreementId) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));
        }
        if (offer.status === "CANCELLED") return sendErrorResponse(res, httpError(409, "Offer cancelled"));
        if (offer.status === "ACCEPTED") return sendErrorResponse(res, httpError(409, "Offer already accepted"));
        if (offer?.shift?.roomId != null && Number(offer.shift.roomId) !== Number(offer.roomId)) {
          return sendErrorResponse(res, httpError(409, "Shift already assigned"));
        }

        const updated = await prisma.shiftOffer.update({
          where: { id },
          data: {
            status: "COUNTERED",
            amountCompany: body.amountCompany,
            noteCompany: body.noteCompany ? String(body.noteCompany) : null,
          },
        });

        emitOffer(io, {
          kind: "offer:companyCounter",
          offerId: id,
          shiftId: offer.shiftId,
          roomId: offer.roomId,
          companyId: offer.shift.companyId,
        });

        return res.json(updated);
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // COMPANY: bulk counter same room/package offers on market
  r.post(
    "/company-counter-bulk",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const body = validateWithZod(bulkCompanyCounterSchema, req.body);
        const companyId = req.user.role === "COMPANY" ? Number(req.user.companyId) : Number(req.body.companyId || 0);
        if (!Number.isFinite(companyId) || companyId <= 0) return sendErrorResponse(res, httpError(400, "companyId required"));

        const roomId = Number(body.roomId);
        const shiftIds = Array.from(new Set((body.shiftIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));
        let offerIds = Array.from(new Set((body.offerIds || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)));

        let where = { roomId };
        if (shiftIds.length) where.shiftId = { in: shiftIds };
        if (offerIds.length) where.id = { in: offerIds };

        const rows = await prisma.shiftOffer.findMany({
          where,
          include: { shift: { select: { id: true, companyId: true, agreementId: true, roomId: true } } },
        });
        const allowed = rows.filter((row) => Number(row?.shift?.companyId || 0) === companyId);
        if (!allowed.length) return sendErrorResponse(res, httpError(404, "No offers found"));
        const blocked = allowed.find((row) => row?.shift?.agreementId);
        if (blocked) return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));

        const activeIds = allowed.filter((row) => ["OPEN", "COUNTERED"].includes(String(row.status || "").toUpperCase())).map((row) => row.id);
        if (!activeIds.length) return sendErrorResponse(res, httpError(409, "No active offers to counter"));

        await prisma.shiftOffer.updateMany({
          where: { id: { in: activeIds } },
          data: {
            status: "COUNTERED",
            amountCompany: body.amountCompany,
            noteCompany: body.noteCompany ? String(body.noteCompany) : null,
          },
        });

        for (const row of allowed) {
          emitOffer(io, {
            kind: "offer:companyCounter",
            offerId: row.id,
            shiftId: row.shiftId,
            roomId: row.roomId,
            companyId: row.shift.companyId,
          });
        }

        return res.json({ ok: true, updatedCount: activeIds.length, total: allowed.length });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // ROOM: accept package atomically
  r.post(
    "/room-accept-package",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const roomId = req.user.role === "ROOM" ? Number(req.user.roomId || 0) : Number(req.body?.roomId || 0);
        if (!Number.isFinite(roomId) || roomId <= 0) return sendErrorResponse(res, httpError(400, "roomId required"));

        const body = validateWithZod(roomAcceptPackageSchema, req.body);
        const prepared = await loadRoomPackageAcceptanceTargetsOrThrow({ roomId, offerIds: body.offerIds });

        const accepted = [];
        await prisma.$transaction(async (tx) => {
          for (const offer of prepared.offers) {
            accepted.push(await finalizeAcceptedOfferTx(tx, offer));
          }
        });

        const results = [];
        for (const meta of accepted) results.push(await emitAcceptedOfferResult(io, meta));
        return res.json({ ok: true, packageAccepted: true, updatedCount: results.length, shiftIds: prepared.targetShiftIds, firstShiftId: Number(results?.[0]?.shift?.id || 0), results });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // COMPANY: accept package atomically
  r.post(
    "/accept-package",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const body = validateWithZod(companyAcceptPackageSchema, req.body);
        const companyId = req.user.role === "COMPANY" ? Number(req.user.companyId || 0) : Number(req.body?.companyId || 0);
        if (!Number.isFinite(companyId) || companyId <= 0) return sendErrorResponse(res, httpError(400, "companyId required"));

        const prepared = await loadCompanyPackageAcceptanceTargetsOrThrow({ companyId, roomId: body.roomId, shiftIds: body.shiftIds });
        const accepted = [];
        await prisma.$transaction(async (tx) => {
          for (const offer of prepared.offers) {
            accepted.push(await finalizeAcceptedOfferTx(tx, offer));
          }
        });

        const results = [];
        for (const meta of accepted) results.push(await emitAcceptedOfferResult(io, meta));
        return res.json({ ok: true, packageAccepted: true, updatedCount: results.length, shiftIds: prepared.targetShiftIds, roomId: Number(body.roomId), results });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // ROOM: accept company counter / offer and move to pending workflow
  r.put(
    "/:id/room-accept",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad offerId"));

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { id: true, companyId: true, roomId: true, status: true, agreementId: true } } },
        });
        if (!offer) return sendErrorResponse(res, httpError(404, "Offer not found"));
        if (req.user.role === "ROOM" && Number(offer.roomId) !== Number(req.user.roomId || 0)) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }
        if (offer?.shift?.agreementId) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));
        }
        if (offer.status === "CANCELLED") return sendErrorResponse(res, httpError(409, "Offer cancelled"));
        if (offer.status === "ACCEPTED") return sendErrorResponse(res, httpError(409, "Offer already accepted"));
        if (offer.shift.roomId != null && Number(offer.shift.roomId) !== Number(offer.roomId)) return sendErrorResponse(res, httpError(409, "Shift already assigned"));

        const result = await finalizeAcceptedOffer(io, offer);
        return res.json({ ok: true, ...result });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // COMPANY: accept one offer -> cancel others -> bind shift.roomId
  // PUT /api/offers/:id/accept
  r.put(
    "/:id/accept",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad offerId"));

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { id: true, companyId: true, roomId: true, status: true, agreementId: true } } },
        });
        if (!offer) return sendErrorResponse(res, httpError(404, "Offer not found"));

        if (req.user.role === "COMPANY" && offer.shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }

        // ✅ M54: Agreement kaynaklı shiftlerde market offers kapalı
        if (offer?.shift?.agreementId) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));
        }
        if (offer.status === "CANCELLED") return sendErrorResponse(res, httpError(409, "Offer cancelled"));

        // ✅ M54: Agreement kaynaklı shiftlerde market offers kapalı
        if (offer?.shift?.agreementId) {
          return sendErrorResponse(res, httpError(409, "AGREEMENT_NO_OFFERS", "Agreement shift: offers disabled"));
        }

        if (offer.shift.roomId != null) return sendErrorResponse(res, httpError(409, "Shift already assigned"));

        const result = await finalizeAcceptedOffer(io, offer);

        return res.json({ ok: true, ...result });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  // COMPANY: cancel an offer (optional)
  // PUT /api/offers/:id/cancel
  r.put(
    "/:id/cancel",
    authRequired(),
    requireRole("COMPANY", "SUPER_ADMIN"),
    async (req, res) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return sendErrorResponse(res, httpError(400, "bad offerId"));

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { companyId: true, agreementId: true } } },
        });
        if (!offer) return sendErrorResponse(res, httpError(404, "Offer not found"));

        if (req.user.role === "COMPANY" && offer.shift.companyId !== req.user.companyId) {
          return sendErrorResponse(res, httpError(403, "Forbidden"));
        }
        if (offer.status === "ACCEPTED") {
          return sendErrorResponse(res, httpError(409, "Accepted offer cannot be cancelled"));
        }

        const updated = await prisma.shiftOffer.update({ where: { id }, data: { status: "CANCELLED" } });

        emitOffer(io, {
          kind: "offer:cancel",
          offerId: id,
          shiftId: offer.shiftId,
          roomId: offer.roomId,
          companyId: offer.shift.companyId,
        });

        return res.json({ ok: true, offer: updated });
      } catch (e) {
        return sendErrorResponse(res, e);
      }
    }
  );

  return r;
}
