// backend/src/routes/offers.js
// M24 — Shift marketplace offers (multi-room)
// M25 — status filtreleri
// M28 — COMPANY offer directory (open offers summary)

import express from "express";
import { z } from "zod";
import prisma from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { rememberResponse } from "../utils/responseCache.js";
import { validateWithZod } from "../z.js";

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

const emitShift = H.emitShift;

function emitOffer(io, { companyId, roomId, shiftId, kind, offerId }) {
  if (!io) return;
  const payload = { kind, offerId, shiftId, roomId, companyId };
  if (companyId) io.to(`company:${companyId}`).emit("offer:update", payload);
  if (roomId) io.to(`room:${roomId}`).emit("offer:update", payload);
}

const OFFER_STATUSES = new Set(["OPEN", "COUNTERED", "ACCEPTED", "CANCELLED"]);
async function finalizeAcceptedOffer(io, offer) {
  const shiftId = offer.shiftId;
  const companyId = offer.shift.companyId;
  const acceptedRoomId = offer.roomId;

  const offerRows = await prisma.shiftOffer.findMany({
    where: { shiftId },
    select: { id: true, roomId: true },
  });
  const allRoomIds = Array.from(new Set(offerRows.map((x) => x.roomId)));

  let cancelledCount = 0;

  await prisma.$transaction(async (tx) => {
    await tx.shiftOffer.update({ where: { id: offer.id }, data: { status: "ACCEPTED" } });
    const upd = await tx.shiftOffer.updateMany({
      where: { shiftId, id: { not: offer.id }, status: { in: ["OPEN", "COUNTERED"] } },
      data: { status: "CANCELLED" },
    });
    cancelledCount = Number(upd?.count || 0);

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
  });

  const shiftFull = await prisma.shift.findUnique({
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

  io?.to?.(`company:${companyId}`)?.emit?.("offer:update", {
    kind: "offer:accept",
    offerId: offer.id,
    shiftId,
    roomId: acceptedRoomId,
    companyId,
  });
  for (const rid of allRoomIds) {
    const row = offerRows.find((x) => x.roomId === rid);
    io?.to?.(`room:${rid}`)?.emit?.("offer:update", {
      kind: rid === acceptedRoomId ? "offer:accepted" : "offer:cancelled",
      offerId: row?.id ?? offer.id,
      shiftId,
      roomId: rid,
      companyId,
    });
  }

  emitShift(io, shiftFull, "shift:update");
  return { cancelledCount, shift: shiftFull };
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
        return res.status(500).json({ error: String(e?.message ?? e) });
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

        const payload = await rememberResponse(`offers-company:${companyId}:${statusIn ? statusIn.join(",") : "all"}:${q || "-"}:${take}`, async () => {
          const items = await prisma.shiftOffer.findMany({
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
          return { items };
        }, { ttlMs: 15000, scope: { role: req.user?.role, companyId: req.user?.companyId, userId: req.user?.id } });

        return res.json(payload);
      } catch (e) {
        return res.status(500).json({ error: String(e?.message ?? e) });
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
        if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

        const shift = await prisma.shift.findUnique({
          where: { id: shiftId },
          select: { id: true, companyId: true },
        });
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role === "COMPANY" && shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
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
        return res.status(500).json({ error: String(e?.message ?? e) });
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
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad offerId" });

        const body = validateWithZod(counterShiftOfferSchema, req.body);

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { id: true, companyId: true, agreementId: true } } },
        });
        if (!offer) return res.status(404).json({ error: "Offer not found" });

        if (req.user.role === "ROOM" && offer.roomId !== req.user.roomId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        if (offer.status === "CANCELLED") return res.status(409).json({ error: "Offer cancelled" });
        if (offer.status === "ACCEPTED") return res.status(409).json({ error: "Offer already accepted" });

        // ✅ M54: Agreement kaynaklı shiftlerde market offers kapalı
        if (offer?.shift?.agreementId) {
          return res.status(409).json({ error: "Agreement shift: offers disabled", code: "AGREEMENT_NO_OFFERS" });
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
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
        if (!Number.isFinite(roomId) || roomId <= 0) return res.status(400).json({ error: "roomId required" });

        const { offerIds, amountRoom, noteRoom } = validateWithZod(bulkCounterSchema, req.body);
        const ids = Array.from(new Set(offerIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))));
        if (!ids.length) return res.status(400).json({ error: "offerIds required" });

        const rows = await prisma.shiftOffer.findMany({
          where: { id: { in: ids }, roomId },
          include: { shift: { select: { id: true, companyId: true, agreementId: true } } },
        });

        // security: caller cannot counter offers outside their room
        if (rows.length !== ids.length) {
          return res.status(404).json({ error: "Some offers not found for this room" });
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
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e), details: e?.details });
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
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad offerId" });

        const body = validateWithZod(companyCounterSchema, req.body);
        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { companyId: true, agreementId: true, roomId: true } } },
        });
        if (!offer) return res.status(404).json({ error: "Offer not found" });
        if (req.user.role === "COMPANY" && Number(offer?.shift?.companyId || 0) !== Number(req.user.companyId || 0)) {
          return res.status(403).json({ error: "Forbidden" });
        }
        if (offer?.shift?.agreementId) {
          return res.status(409).json({ error: "Agreement shift: offers disabled", code: "AGREEMENT_NO_OFFERS" });
        }
        if (offer.status === "CANCELLED") return res.status(409).json({ error: "Offer cancelled" });
        if (offer.status === "ACCEPTED") return res.status(409).json({ error: "Offer already accepted" });
        if (offer?.shift?.roomId != null && Number(offer.shift.roomId) !== Number(offer.roomId)) {
          return res.status(409).json({ error: "Shift already assigned" });
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
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e), details: e?.details });
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
        if (!Number.isFinite(companyId) || companyId <= 0) return res.status(400).json({ error: "companyId required" });

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
        if (!allowed.length) return res.status(404).json({ error: "No offers found" });
        const blocked = allowed.find((row) => row?.shift?.agreementId);
        if (blocked) return res.status(409).json({ error: "Agreement shift: offers disabled", code: "AGREEMENT_NO_OFFERS" });

        const activeIds = allowed.filter((row) => ["OPEN", "COUNTERED"].includes(String(row.status || "").toUpperCase())).map((row) => row.id);
        if (!activeIds.length) return res.status(409).json({ error: "No active offers to counter" });

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
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e), details: e?.details });
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
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad offerId" });

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { id: true, companyId: true, roomId: true, status: true, agreementId: true } } },
        });
        if (!offer) return res.status(404).json({ error: "Offer not found" });
        if (req.user.role === "ROOM" && Number(offer.roomId) !== Number(req.user.roomId || 0)) {
          return res.status(403).json({ error: "Forbidden" });
        }
        if (offer?.shift?.agreementId) {
          return res.status(409).json({ error: "Agreement shift: offers disabled", code: "AGREEMENT_NO_OFFERS" });
        }
        if (offer.status === "CANCELLED") return res.status(409).json({ error: "Offer cancelled" });
        if (offer.status === "ACCEPTED") return res.status(409).json({ error: "Offer already accepted" });
        if (offer.shift.roomId != null && Number(offer.shift.roomId) !== Number(offer.roomId)) return res.status(409).json({ error: "Shift already assigned" });

        const result = await finalizeAcceptedOffer(io, offer);
        return res.json({ ok: true, ...result });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad offerId" });

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { id: true, companyId: true, roomId: true, status: true, agreementId: true } } },
        });
        if (!offer) return res.status(404).json({ error: "Offer not found" });

        if (req.user.role === "COMPANY" && offer.shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        // ✅ M54: Agreement kaynaklı shiftlerde market offers kapalı
        if (offer?.shift?.agreementId) {
          return res.status(409).json({ error: "Agreement shift: offers disabled", code: "AGREEMENT_NO_OFFERS" });
        }
        if (offer.status === "CANCELLED") return res.status(409).json({ error: "Offer cancelled" });

        // ✅ M54: Agreement kaynaklı shiftlerde market offers kapalı
        if (offer?.shift?.agreementId) {
          return res.status(409).json({ error: "Agreement shift: offers disabled", code: "AGREEMENT_NO_OFFERS" });
        }

        if (offer.shift.roomId != null) return res.status(409).json({ error: "Shift already assigned" });

        const result = await finalizeAcceptedOffer(io, offer);

        return res.json({ ok: true, ...result });
      } catch (e) {
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
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
        if (!Number.isFinite(id)) return res.status(400).json({ error: "bad offerId" });

        const offer = await prisma.shiftOffer.findUnique({
          where: { id },
          include: { shift: { select: { companyId: true, agreementId: true } } },
        });
        if (!offer) return res.status(404).json({ error: "Offer not found" });

        if (req.user.role === "COMPANY" && offer.shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
        }
        if (offer.status === "ACCEPTED") {
          return res.status(409).json({ error: "Accepted offer cannot be cancelled" });
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
        return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
      }
    }
  );

  return r;
}