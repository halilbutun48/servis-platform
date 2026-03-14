// backend/src/routes/drivers.js
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { clearDriverPinFailureState } from "../auth/driverAccessGuard.js";
import { createDriverSchema } from "../validators.js";

function normalizeDriverCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function buildAliasEmail(driverCode) {
  return `${String(driverCode || "").trim().toLowerCase()}@driver.local`;
}

function makeTempPin() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

async function generateDriverCode(db = prisma) {
  for (let i = 0; i < 40; i += 1) {
    const code = `SRC-${String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")}`;
    const exists = await db.driver.findFirst({ where: { driverCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("DRIVER_CODE_GENERATION_FAILED");
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
      select: { id: true, roomId: true, userId: true, fullName: true, phone: true, driverCode: true },
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

  async function issueDriverCredentials({ db = prisma, driverId, roomId, fullName, phone, existingUserId = null, existingDriverCode = null }) {
    const driverCode = existingDriverCode || (await generateDriverCode(db));
    const temporaryPin = makeTempPin();
    const passwordHash = await bcrypt.hash(temporaryPin, 10);

    let userId = existingUserId || null;
    if (userId) {
      await db.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          fullName,
          phone,
        },
      });
    } else {
      const user = await db.user.create({
        data: {
          email: buildAliasEmail(driverCode),
          passwordHash,
          role: "DRIVER",
          roomId,
          fullName,
          phone,
        },
        select: { id: true },
      });
      userId = user.id;
    }

    await db.driver.update({
      where: { id: driverId },
      data: {
        userId,
        driverCode,
        pinTemporary: true,
        pinUpdatedAt: new Date(),
      },
    });

    return { driverCode, temporaryPin, userId };
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
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstFieldKey = Object.keys(flat?.fieldErrors || {}).find((k) => Array.isArray(flat.fieldErrors[k]) && flat.fieldErrors[k].length);
      const firstFieldMsg = firstFieldKey ? flat.fieldErrors[firstFieldKey]?.[0] : null;
      const formMsg = Array.isArray(flat?.formErrors) && flat.formErrors.length ? flat.formErrors[0] : null;
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: firstFieldMsg || formMsg || "Geçersiz sürücü verisi",
        details: flat,
      });
    }

    const { fullName, phone, deviceInfo } = parsed.data;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const created = await tx.driver.create({
          data: {
            roomId: u.roomId,
            fullName,
            phone,
            deviceInfo: deviceInfo ?? null,
          },
          select: { id: true },
        });

        const issued = await issueDriverCredentials({
          db: tx,
          driverId: created.id,
          roomId: u.roomId,
          fullName,
          phone,
        });

        const driver = await tx.driver.findUnique({
          where: { id: created.id },
          include: { backupDriver: true, user: { select: { id: true, email: true } } },
        });

        return { driver, issued };
      });

      io?.to(`room:${u.roomId}`).emit("driver:update", { driverId: result.driver.id, action: "created" });

      return res.json({
        ...result.driver,
        loginMode: "DRIVER_CODE_PIN",
        issuedCredentials: {
          driverCode: result.issued.driverCode,
          temporaryPin: result.issued.temporaryPin,
          temporary: true,
        },
      });
    } catch (e) {
      return res.status(400).json({ code: "BAD_REQUEST", message: String(e?.message || e) });
    }
  });

  r.post("/:id/reset-pin", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid id" });

    const owner = await assertRoomDriverOwner({ user: u, driverId: id, res });
    if (!owner) return;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const issued = await issueDriverCredentials({
          db: tx,
          driverId: id,
          roomId: u.roomId,
          fullName: owner.fullName,
          phone: owner.phone,
          existingUserId: owner.userId,
          existingDriverCode: owner.driverCode,
        });

        // ✅ M46.9: reset PIN => revoke refresh sessions + bump sessionVersion (invalidate access tokens)
        let revokedSessions = 0;
        let bumpedTo = null;
        try {
          if (issued?.userId) {
            const r0 = await tx.refreshSession.updateMany({ where: { userId: issued.userId, revokedAt: null }, data: { revokedAt: new Date() } });
            revokedSessions = Number(r0?.count || 0);
            const uu = await tx.user.update({ where: { id: issued.userId }, data: { sessionVersion: { increment: 1 } } });
            bumpedTo = uu?.sessionVersion ?? null;
          }
        } catch {
          // ignore
        }

        const driver = await tx.driver.findUnique({
          where: { id },
          include: { backupDriver: true, user: { select: { id: true, email: true } } },
        });
        return { driver, issued, revokedSessions, sessionVersionBumpedTo: bumpedTo };
      });

      await clearDriverPinFailureState(id);
      await audit(req, {
        action: 'AUTH_DRIVER_PIN_RESET',
        entity: 'Driver',
        entityId: id,
        meta: { driverId: id, driverCode: result.issued.driverCode, roomId: u.roomId, temporary: true, revokedSessions: result.revokedSessions ?? null, sessionVersionBumpedTo: result.sessionVersionBumpedTo ?? null, SESSION_BUMP_ON_PIN_RESET: true },
      });

      io?.to(`room:${u.roomId}`).emit("driver:update", { driverId: id, action: "updated" });
      return res.json({
        ok: true,
        driver: result.driver,
        issuedCredentials: {
          driverCode: result.issued.driverCode,
          temporaryPin: result.issued.temporaryPin,
          temporary: true,
        },
      });
    } catch (e) {
      return res.status(400).json({ code: "BAD_REQUEST", message: String(e?.message || e) });
    }
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

    if (owner.userId && (data.fullName || data.phone)) {
      await prisma.user.update({
        where: { id: owner.userId },
        data: {
          ...(data.fullName ? { fullName: data.fullName } : {}),
          ...(data.phone ? { phone: data.phone } : {}),
        },
      }).catch(() => {});
    }

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

    await prisma.vehicle.updateMany({ where: { roomId: u.roomId, driverId: id }, data: { driverId: null } });

    try {
      await prisma.driver.delete({ where: { id } });
      if (owner.userId) {
        try {
          await prisma.user.delete({ where: { id: owner.userId } });
        } catch {
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
