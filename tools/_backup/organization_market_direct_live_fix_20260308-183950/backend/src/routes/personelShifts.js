// backend/src/routes/personelShifts.js
// M30-B: PERSONEL için "uygun vardiyalar" listesi (request create UX)

import express from "express";
import prisma from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

export function personelShiftsRouter() {
  const r = express.Router();

  // GET /api/personel/shifts?take=50
  // PERSONEL: kendi company’sindeki APPROVED/ACTIVE ve endAt>now vardiyalar
  // SUPER_ADMIN: opsiyonel companyId ile sorgulayabilir
  r.get("/", authRequired(), requireRole("PERSONEL", "SUPER_ADMIN"), async (req, res) => {
    try {
      const take = Math.min(Math.max(Number(req.query.take ?? 50), 1), 200);
      const now = new Date();

      let companyId = null;
      if (req.user.role === "PERSONEL") {
        companyId = req.user.companyId ?? null;
        if (!companyId) {
          const personel = await prisma.personel.findFirst({
            where: { userId: req.user.id },
            select: { companyId: true },
          });
          companyId = personel?.companyId ?? null;
        }
      } else {
        companyId = Number(req.query.companyId || 0) || null;
      }

      if (!companyId) return res.json({ items: [] });

      const items = await prisma.shift.findMany({
        where: {
          companyId,
          status: { in: ["APPROVED", "ACTIVE"] },
          endAt: { gt: now },
        },
        orderBy: { startAt: "asc" },
        take,
        include: {
          room: { select: { id: true, name: true, hubLat: true, hubLng: true } },
          vehicle: { select: { id: true, plate: true, status: true } },
          driver: { select: { id: true, fullName: true, phone: true } },
          stops: { orderBy: { order: "asc" } },
        },
      });

      return res.json({ items });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  return r;
}
