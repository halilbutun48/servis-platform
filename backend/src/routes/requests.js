// backend/src/routes/requests.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createRequestSchema } from "../validators.js";

/**
 * PickupRequestStatus enum:
 * - OPEN
 * - CANCELLED
 * - ACCEPTED
 *
 * Bu yüzden "CLOSED" diye bir status KULLANMIYORUZ.
 * ROOM tarafında "kapatma" = ACCEPTED (default) ya da CANCELLED.
 */

const DEFAULT_CLOSE_STATUS = "ACCEPTED";
const ALLOWED_CLOSE = new Set(["ACCEPTED", "CANCELLED"]);

export function requestsRouter(io) {
  const r = express.Router();

  // PERSONEL: create pickup request for a shift
  r.post("/", authRequired(), requireRole("PERSONEL"), async (req, res) => {
    try {
      const u = req.user;

      const parsed = createRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      // Link user -> personel record
      const personel = await prisma.personel.findFirst({
        where: { userId: u.id },
        select: { id: true, companyId: true },
      });
      if (!personel) {
        return res
          .status(400)
          .json({ error: "Personel profile not found for user" });
      }

      const shift = await prisma.shift.findUnique({
        where: { id: parsed.data.shiftId },
        select: { id: true, companyId: true, roomId: true, status: true },
      });
      if (!shift) return res.status(404).json({ error: "Shift not found" });

      if (shift.companyId !== personel.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // MVP: sadece APPROVED/ACTIVE shift'e istek atılsın
      if (!["APPROVED", "ACTIVE"].includes(shift.status)) {
        return res.status(400).json({
          error: `Shift not allowed for request (status=${shift.status})`,
        });
      }

      // Aynı personel + aynı shift için OPEN varsa tekrar oluşturma
      const existing = await prisma.pickupRequest.findFirst({
        where: { shiftId: shift.id, personelId: personel.id, status: "OPEN" },
        select: { id: true },
      });
      if (existing) {
        return res
          .status(409)
          .json({ error: "Request already OPEN", id: existing.id });
      }

      const item = await prisma.pickupRequest.create({
        data: {
          shiftId: shift.id,
          personelId: personel.id,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          status: "OPEN",
        },
        include: { personel: true, shift: true },
      });

      const evt = {
        requestId: item.id,
        action: "created",
        shiftId: shift.id,
        status: item.status,
      };

      io.to(`company:${shift.companyId}`).emit("request:update", evt);
      io.to(`room:${shift.roomId}`).emit("request:update", evt);
      io.to(`shift:${shift.id}`).emit("request:update", evt);

      return res.json(item);
    } catch (e) {
      console.error("[requests] POST / error:", e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // COMPANY/ROOM/SUPER_ADMIN: list pickup requests
  // query: ?onlyOpen=1&onlyActive=1
  r.get("/", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      const u = req.user;

      const onlyOpen = String(req.query.onlyOpen ?? "") === "1";
      const onlyActive = String(req.query.onlyActive ?? "") === "1";

      const where = {};
      if (onlyOpen) where.status = "OPEN";

      // relation filter (PickupRequest -> Shift)
      if (u.role === "COMPANY") {
        where.shift = {
          is: {
            companyId: u.companyId ?? -1,
            ...(onlyActive ? { status: "ACTIVE" } : {}),
          },
        };
      }

      if (u.role === "ROOM") {
        where.shift = {
          is: {
            roomId: u.roomId ?? -1,
            ...(onlyActive ? { status: "ACTIVE" } : {}),
          },
        };
      }

      if (u.role === "SUPER_ADMIN" && onlyActive) {
        where.shift = { is: { status: "ACTIVE" } };
      }

      const items = await prisma.pickupRequest.findMany({
        where,
        include: { personel: true, shift: true },
        orderBy: { id: "desc" },
        take: 200,
      });

      return res.json(items);
    } catch (e) {
      console.error("[requests] GET / error:", e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ROOM: close pickup request (OPEN -> ACCEPTED/CANCELLED)
  // Body opsiyonel: { status: "CANCELLED" } veya { status: "ACCEPTED" }
  r.post("/:id/close", authRequired(), requireRole("ROOM"), async (req, res) => {
    try {
      const u = req.user;
      if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

      const requestId = Number(req.params.id);

      const item = await prisma.pickupRequest.findUnique({
        where: { id: requestId },
        include: { shift: true, personel: true },
      });
      if (!item) return res.status(404).json({ error: "Request not found" });

      if (!item.shift || item.shift.roomId !== u.roomId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (item.status !== "OPEN") {
        return res
          .status(409)
          .json({ error: `Request not OPEN (current=${item.status})` });
      }

      // default: ACCEPTED
      const desired = req.body?.status ?? DEFAULT_CLOSE_STATUS;
      const closeStatus = String(desired).toUpperCase();

      if (!ALLOWED_CLOSE.has(closeStatus)) {
        return res.status(400).json({
          error: "Invalid close status",
          allowed: Array.from(ALLOWED_CLOSE),
          got: closeStatus,
        });
      }

      const updated = await prisma.pickupRequest.update({
        where: { id: requestId },
        data: { status: closeStatus },
        include: { personel: true, shift: true },
      });

      const evt = {
        requestId: updated.id,
        action: "closed",
        shiftId: updated.shiftId,
        status: updated.status,
      };

      io.to(`company:${updated.shift.companyId}`).emit("request:update", evt);
      io.to(`room:${updated.shift.roomId}`).emit("request:update", evt);
      io.to(`shift:${updated.shiftId}`).emit("request:update", evt);

      return res.json(updated);
    } catch (e) {
      console.error("[requests] POST /:id/close error:", e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return r;
}