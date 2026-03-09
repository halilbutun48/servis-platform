// backend/src/routes/drivers.js
import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createDriverSchema } from "../validators.js";

function isValidEmail(s) {
  return typeof s === "string" && s.includes("@") && s.includes(".");
}

export function driversRouter(io) {
  const r = express.Router();
  const ACTIVE_SHIFT_STATUSES = ["APPROVED", "ACTIVE"];
  const hasKey = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  async function assertRoomDriverOwner({ user, driverId, res }) {
    if (!user.roomId) {
      res.status(400).json({ code: "BAD_REQUEST", message: "ROOM must have roomId" });
      return null;
    }

    const d = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, roomId: true, userId: true },
    });

    if (!d) {
      res.status(404).json({ code: "NOT_FOUND", message: "Driver bulunamadı" });
      return null;
    }

    if (d.roomId !== user.roomId) {
      res.status(403).json({ code: "FORBIDDEN", message: "Forbidden" });
      return null;
    }

    return d;
  }

  // LIST (ROOM)
  r.get("/", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.json([]);

    const drivers = await prisma.driver.findMany({
      where: { roomId: u.roomId },
      include: {
        backupDriver: true,
        user: { select: { id: true, email: true } },
      },
      orderBy: { id: "asc" },
    });

    return res.json(drivers);
  });

  // CREATE (ROOM)
  r.post("/", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ code: "BAD_REQUEST", message: "ROOM must have roomId" });

    const parsed = createDriverSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { fullName, phone, deviceInfo, email, password } = parsed.data;

    let userId = null;

    // optional login user create
    if (email || password) {
      if (!isValidEmail(email)) return res.status(400).json({ code: "BAD_REQUEST", message: "email geçersiz" });
      if (String(password || "").length < 4) return res.status(400).json({ code: "BAD_REQUEST", message: "password çok kısa" });

      const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (exists) return res.status(400).json({ code: "BAD_REQUEST", message: "email zaten kullanılıyor" });

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "DRIVER",
          roomId: u.roomId,
          fullName,
          phone,
        },
        select: { id: true, email: true },
      });

      userId = user.id;
    }

    const created = await prisma.driver.create({
      data: {
        roomId: u.roomId,
        fullName,
        phone,
        deviceInfo: deviceInfo ?? null,
        userId,
      },
      include: { backupDriver: true, user: { select: { id: true, email: true } } },
    });

    io?.to(`room:${u.roomId}`).emit("driver:update", { driverId: created.id, action: "created" });

    return res.json(created);
  });

  // UPDATE (ROOM)
  r.put("/:id", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid id" });

    const owner = await assertRoomDriverOwner({ user: u, driverId: id, res });
    if (!owner) return;

    const b = req.body || {};
    const data = {};

    if (hasKey(b, "fullName")) {
      const v = String(b.fullName || "").trim();
      if (!v) return res.status(400).json({ code: "BAD_REQUEST", message: "fullName gerekli" });
      data.fullName = v;
    }

    if (hasKey(b, "phone")) {
      const v = String(b.phone || "").trim();
      if (!v) return res.status(400).json({ code: "BAD_REQUEST", message: "phone gerekli" });
      data.phone = v;
    }

    if (hasKey(b, "deviceInfo")) {
      const v = String(b.deviceInfo || "").trim();
      data.deviceInfo = v ? v : null;
    }

    if (hasKey(b, "backupDriverId")) {
      const raw = b.backupDriverId;
      const bid = raw == null ? null : Number(raw);

      if (!bid) {
        data.backupDriverId = null;
      } else {
        if (bid === id) {
          return res.status(400).json({ code: "BAD_REQUEST", message: "backupDriverId aynı sürücü olamaz" });
        }

        const bd = await prisma.driver.findUnique({ where: { id: bid }, select: { id: true, roomId: true } });
        if (!bd) return res.status(404).json({ code: "NOT_FOUND", message: "Backup driver bulunamadı" });
        if (bd.roomId !== u.roomId) {
          return res.status(400).json({ code: "BAD_REQUEST", message: "Backup driver aynı room içinde olmalı" });
        }

        data.backupDriverId = bid;
      }
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "No fields to update" });
    }

    const updated = await prisma.driver.update({
      where: { id },
      data,
      include: { backupDriver: true, user: { select: { id: true, email: true } } },
    });

    io?.to(`room:${u.roomId}`).emit("driver:update", { driverId: updated.id, action: "updated" });

    return res.json({ ok: true, driver: updated });
  });

  // DELETE (ROOM)
  r.delete("/:id", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid id" });

    const owner = await assertRoomDriverOwner({ user: u, driverId: id, res });
    if (!owner) return;

    const active = await prisma.shift.findFirst({
      where: { driverId: id, status: { in: ACTIVE_SHIFT_STATUSES } },
      select: { id: true, status: true },
    });
    if (active) {
      return res.status(400).json({
        code: "HAS_ACTIVE_SHIFTS",
        message: `Driver aktif vardiyaya bağlı (shift #${active.id} ${active.status})`,
      });
    }

    const any = await prisma.shift.findFirst({ where: { driverId: id }, select: { id: true, status: true } });
    if (any) {
      return res.status(400).json({
        code: "HAS_SHIFT_HISTORY",
        message: `Driver geçmiş vardiyalarda kullanılmış (shift #${any.id} ${any.status}). Silme yerine ileride 'Arşiv' ekleyelim.`,
      });
    }

    // detach any vehicle bind (safety)
    await prisma.vehicle.updateMany({
      where: { roomId: u.roomId, driverId: id },
      data: { driverId: null },
    });

    try {
      await prisma.driver.delete({ where: { id } });
      if (owner.userId) {
        try {
          await prisma.user.delete({ where: { id: owner.userId } });
        } catch (_) {
          // ignore
        }
      }
    } catch (e) {
      return res.status(400).json({ code: "BAD_REQUEST", message: String(e?.message || e) });
    }

    io?.to(`room:${u.roomId}`).emit("driver:update", { driverId: id, action: "deleted" });

    return res.json({ ok: true });
  });

  return r;
}
