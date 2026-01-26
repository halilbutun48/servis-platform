//backend/src/routes/drivers.js


import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createDriverSchema } from "../validators.js";

export function driversRouter(io) {
  const r = express.Router();

  // List drivers
  r.get("/", authRequired(), async (req, res) => {
    const u = req.user;

    if (u.role === "ROOM") {
      if (!u.roomId) return res.json([]);
      const items = await prisma.driver.findMany({
        where: { roomId: u.roomId },
        include: { user: { select: { id: true, email: true } }, backupDriver: true },
        orderBy: { id: "asc" },
      });
      return res.json(items);
    }

    if (u.role === "SUPER_ADMIN") {
      const items = await prisma.driver.findMany({
        include: { user: { select: { id: true, email: true } }, room: true, backupDriver: true },
        orderBy: { id: "asc" },
      });
      return res.json(items);
    }

    // Diğer roller, driver listesini doğrudan görmesin (Company shift üzerinden görür)
    return res.json([]);
  });

  // Create driver (+ optional user)
  r.post("/", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const parsed = createDriverSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { fullName, phone, deviceInfo, backupDriverId, email, password } = parsed.data;

    let userId = null;
    if (email && password) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ error: "Email already exists" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "DRIVER",
          fullName,
          phone,
          roomId: u.roomId,
        },
      });
      userId = user.id;
    }

    const driver = await prisma.driver.create({
      data: {
        roomId: u.roomId,
        fullName,
        phone,
        deviceInfo: deviceInfo ?? "",
        backupDriverId: backupDriverId ?? null,
        userId,
      },
      include: { user: { select: { id: true, email: true } }, backupDriver: true },
    });

    io.to(`room:${u.roomId}`).emit("driver:update", { driverId: driver.id, action: "created" });
    return res.json(driver);
  });

  return r;
}
