// backend/src/routes/notifications.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired } from "../auth/middleware.js";

export const notificationsRouter = express.Router();

// GET /api/notifications/my
// Scope bazlı bildirimler (ROOM/COMPANY/DRIVER)
// ✅ Room artık Company'ye bağlı değil; Company filtre sadece notification.companyId üzerinden yapılır.
notificationsRouter.get("/my", authRequired(), async (req, res) => {
  try {
    const u = req.user;

    // SUPER_ADMIN: hepsi
    if (u.role === "SUPER_ADMIN") {
      const items = await prisma.notification.findMany({ orderBy: { id: "desc" }, take: 100 });
      return res.json(items);
    }

    // ROOM: sadece ROOM scope + roomId
    if (u.role === "ROOM") {
      if (!u.roomId) return res.json([]);
      const items = await prisma.notification.findMany({
        where: { scope: "ROOM", roomId: u.roomId },
        orderBy: { id: "desc" },
        take: 100,
      });
      return res.json(items);
    }

    // COMPANY: companyId tag'li notifs
    if (u.role === "COMPANY") {
      if (!u.companyId) return res.json([]);
      const items = await prisma.notification.findMany({
        where: { companyId: u.companyId },
        orderBy: { id: "desc" },
        take: 100,
      });
      return res.json(items);
    }

    // PERSONEL: companyId + userId (kişisel) notifs
    if (u.role === "PERSONEL") {
      const ors = [{ userId: u.id }];
      if (u.companyId) ors.push({ companyId: u.companyId });

      const items = await prisma.notification.findMany({
        where: { OR: ors },
        orderBy: { id: "desc" },
        take: 100,
      });
      return res.json(items);
    }

    // PARENT: sadece userId (kişisel) notifs
    if (u.role === "PARENT") {
      const items = await prisma.notification.findMany({
        where: { userId: u.id },
        orderBy: { id: "desc" },
        take: 100,
      });
      return res.json(items);
    }

    // DRIVER: sadece DRIVER scope + driverId
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
  } catch (e) {
    console.error("notifications/my error:", e);
    return res.status(500).json({ error: "notifications failed" });
  }
});