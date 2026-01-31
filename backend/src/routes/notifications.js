//backend/src/routes/notifications.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";

export const notificationsRouter = express.Router();

// GET /api/notifications/my
// PRIMER: scope bazlı bildirimler (ROOM/COMPANY/DRIVER)
notificationsRouter.get("/my", authRequired(), async (req, res) => {
  const u = req.user;

  // SUPER_ADMIN: hepsi
  if (u.role === "SUPER_ADMIN") {
    const items = await prisma.notification.findMany({ orderBy: { id: "desc" }, take: 100 });
    return res.json(items);
  }

  if (u.role === "ROOM") {
    if (!u.roomId) return res.json([]);
    const items = await prisma.notification.findMany({
      where: { scope: "ROOM", roomId: u.roomId },
      orderBy: { id: "desc" },
      take: 100,
    });
    return res.json(items);
  }


  if (u.role === "COMPANY" || u.role === "PERSONEL") {
    if (!u.companyId) return res.json([]);
    const items = await prisma.notification.findMany({
      where: {
        OR: [
          // COMPANY paneli için: aynı şirketle ilişkili tüm bildirimler.
          // Not: bazı bildirimler scope=DRIVER/ROOM olsa bile companyId set ediliyor.
          // Ek fallback: room/driver relation üzerinden company filtrele.
          { companyId: u.companyId },
          { room: { companyId: u.companyId } },
          { driver: { room: { companyId: u.companyId } } },
        ],
      },
      orderBy: { id: "desc" },
      take: 100,
    });
    return res.json(items);
  }


  if (u.role === "DRIVER") {
    const driver = await prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true } });
    if (!driver) return res.json([]);
    const items = await prisma.notification.findMany({
      where: { scope: "DRIVER", driverId: driver.id },
      orderBy: { id: "desc" },
      take: 100,
    });
    return res.json(items);
  }

  return res.json([]);
});
