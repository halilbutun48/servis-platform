import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createRequestSchema } from "../validators.js";

// PRIMER'daki PickupRequest (personel durak / konum talebi)
export function requestsRouter(io) {
  const r = express.Router();

  // PERSONEL: create pickup request for a shift
  r.post("/", authRequired(), requireRole("PERSONEL"), async (req, res) => {
    const u = req.user;
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    // Link user -> personel record
    const personel = await prisma.personel.findFirst({ where: { userId: u.id }, select: { id: true, companyId: true } });
    if (!personel) return res.status(400).json({ error: "Personel profile not found for user" });

    const shift = await prisma.shift.findUnique({ where: { id: parsed.data.shiftId } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.companyId !== personel.companyId) return res.status(403).json({ error: "Forbidden" });

    const item = await prisma.pickupRequest.create({
      data: {
        shiftId: shift.id,
        personelId: personel.id,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        status: "OPEN",
      },
    });

    io.to(`company:${shift.companyId}`).emit("request:update", { requestId: item.id, action: "created", shiftId: shift.id });
    io.to(`room:${shift.roomId}`).emit("request:update", { requestId: item.id, action: "created", shiftId: shift.id });

    res.json(item);
  });

  // COMPANY/ROOM/SUPER_ADMIN: list pickup requests
  r.get("/", authRequired(), requireRole("COMPANY", "ROOM", "SUPER_ADMIN"), async (req, res) => {
    const u = req.user;
    const where = {};
    if (u.role === "COMPANY") where["shift"] = { companyId: u.companyId ?? -1 };
    if (u.role === "ROOM") where["shift"] = { roomId: u.roomId ?? -1 };

    const items = await prisma.pickupRequest.findMany({
      where,
      include: { personel: true, shift: true },
      orderBy: { id: "desc" },
      take: 100,
    });
    res.json(items);
  });

  return r;
}
