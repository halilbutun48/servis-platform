// backend/src/routes/offers.js
// M24 — Shift marketplace offers (multi-room)
// M25 — status filtreleri
// M28 — COMPANY offer directory (open offers summary)

import express from "express";
import prisma from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { validateWithZod } from "../z.js";

import { counterShiftOfferSchema } from "./shifts/schemas.js";
import * as H from "./shifts/helpers.js";

const emitShift = H.emitShift;

function emitOffer(io, { companyId, roomId, shiftId, kind, offerId }) {
  if (!io) return;
  const payload = { kind, offerId, shiftId, roomId, companyId };
  if (companyId) io.to(`company:${companyId}`).emit("offer:update", payload);
  if (roomId) io.to(`room:${roomId}`).emit("offer:update", payload);
}

const OFFER_STATUSES = new Set(["OPEN", "COUNTERED", "ACCEPTED", "CANCELLED"]);
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
            shift: { include: { company: true } },
          },
        });

        return res.json({ items });
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
        const take = Math.min(800, Math.max(1, Number(req.query.take || 400)));

        // ✅ garanti yöntem: company shiftIds -> offers shiftId IN (...)
        const shifts = await prisma.shift.findMany({
          where: { companyId },
          select: { id: true },
          take: 5000,
        });
        const shiftIds = shifts.map((s) => s.id);
        if (!shiftIds.length) return res.json({ items: [] });

        const items = await prisma.shiftOffer.findMany({
          where: {
            shiftId: { in: shiftIds },
            ...(statusIn ? { status: { in: statusIn } } : {}),
          },
          orderBy: [{ updatedAt: "desc" }],
          take,
          include: {
            room: true,
            shift: {
              include: { company: true },
            },
          },
        });

        return res.json({ items });
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

        const shiftId = offer.shiftId;
        const companyId = offer.shift.companyId;
        const acceptedRoomId = offer.roomId;

        const roomIds = await prisma.shiftOffer.findMany({
          where: { shiftId },
          select: { roomId: true },
        });
        const allRoomIds = Array.from(new Set(roomIds.map((x) => x.roomId)));

        let cancelledCount = 0;

        await prisma.$transaction(async (tx) => {
          await tx.shiftOffer.update({ where: { id }, data: { status: "ACCEPTED" } });
          const upd = await tx.shiftOffer.updateMany({
            where: { shiftId, id: { not: id }, status: { not: "CANCELLED" } },
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
          offerId: id,
          shiftId,
          roomId: acceptedRoomId,
          companyId,
        });
        for (const rid of allRoomIds) {
          io?.to?.(`room:${rid}`)?.emit?.("offer:update", {
            kind: rid === acceptedRoomId ? "offer:accepted" : "offer:cancelled",
            offerId: id,
            shiftId,
            roomId: rid,
            companyId,
          });
        }

        emitShift(io, shiftFull, "shift:update");

        return res.json({ ok: true, cancelledCount, shift: shiftFull });
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