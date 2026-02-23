// backend/src/routes/offers.js
// M24 — Shift marketplace offers (multi-room)

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
      const roomId = req.user.role === "ROOM" ? req.user.roomId : Number(req.query.roomId || 0);
      if (!roomId) return res.json({ items: [] });

      // ✅ M25: status filter (comma-separated)
      const raw = String(req.query.status || "").trim();
      const statusList = raw
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

      const where = {
        roomId,
        ...(statusList ? { status: { in: statusList } } : {}),
      };

      const items = await prisma.shiftOffer.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        take: 200,
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

      // ✅ M25: status filter (comma-separated)
      const raw = String(req.query.status || "").trim();
      const statusList = raw
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

      const where = {
        shiftId,
        ...(statusList ? { status: { in: statusList } } : {}),
      };

      const items = await prisma.shiftOffer.findMany({
        where,
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
          include: { shift: { select: { id: true, companyId: true } } },
        });
        if (!offer) return res.status(404).json({ error: "Offer not found" });

        // ROOM scope
        if (req.user.role === "ROOM" && offer.roomId !== req.user.roomId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        if (offer.status === "CANCELLED") {
          return res.status(409).json({ error: "Offer cancelled" });
        }
        if (offer.status === "ACCEPTED") {
          return res.status(409).json({ error: "Offer already accepted" });
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
          include: {
            shift: {
              select: {
                id: true,
                companyId: true,
                roomId: true,
                status: true,
              },
            },
          },
        });
        if (!offer) return res.status(404).json({ error: "Offer not found" });

        if (req.user.role === "COMPANY" && offer.shift.companyId !== req.user.companyId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        if (offer.status === "CANCELLED") {
          return res.status(409).json({ error: "Offer cancelled" });
        }

        // Market-only accept: shift.roomId must still be null
        if (offer.shift.roomId != null) {
          return res.status(409).json({ error: "Shift already assigned" });
        }

        const shiftId = offer.shiftId;
        const companyId = offer.shift.companyId;
        const acceptedRoomId = offer.roomId;

        const roomIds = await prisma.shiftOffer.findMany({
          where: { shiftId },
          select: { roomId: true },
        });
        const allRoomIds = Array.from(new Set(roomIds.map((x) => x.roomId)));

        await prisma.$transaction(async (tx) => {
          await tx.shiftOffer.update({ where: { id }, data: { status: "ACCEPTED" } });
          await tx.shiftOffer.updateMany({
            where: {
              shiftId,
              id: { not: id },
              status: { not: "CANCELLED" },
            },
            data: { status: "CANCELLED" },
          });

          // bind shift to the accepted room
          await tx.shift.update({
            where: { id: shiftId },
            data: {
              roomId: acceptedRoomId,
              // optional trace: copy amounts into legacy fields
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

        // WS: offer update to company + all rooms (cancellation visibility)
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

        // WS: shift update for company + accepted room
        emitShift(io, shiftFull, "shift:update");

        return res.json({ ok: true, shift: shiftFull });
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
          include: { shift: { select: { companyId: true } } },
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
