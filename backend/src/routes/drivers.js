// backend/src/routes/drivers.js
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { audit } from "../audit.js";
import { clearDriverPinFailureState } from "../auth/driverAccessGuard.js";
import { createDriverSchema } from "../validators.js";
import { resolveRoomOwnership } from "../region/ownership.js";

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
  const DRIVER_USER_SELECT = { id: true, email: true, deviceId: true, deviceBoundAt: true, deviceLastSeenAt: true, sessionVersion: true };

  const CONNECTION_ONLINE_WINDOW_MS = 5 * 60 * 1000;

  function safeTs(value) {
    const ms = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(ms) ? ms : NaN;
  }

  function deriveConnectionState(user) {
    const lastSeenMs = safeTs(user?.deviceLastSeenAt);
    const hasBinding = Boolean(user?.deviceId || user?.deviceBoundAt || Number.isFinite(lastSeenMs));
    if (!hasBinding) return { connectionState: "OFFLINE", connectionLabel: "Bagli degil" };
    if (Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs <= CONNECTION_ONLINE_WINDOW_MS) {
      return { connectionState: "ONLINE", connectionLabel: "Bagli" };
    }
    return { connectionState: "OFFLINE", connectionLabel: "Bagli degil" };
  }

  function deriveGpsUiState(vehicle) {
    const atMs = safeTs(vehicle?.gpsLast?.at);
    if (!vehicle) return { gpsUiState: "IDLE", gpsLabel: "GPS pasif" };
    if (!Number.isFinite(atMs)) return { gpsUiState: "OFFLINE", gpsLabel: "GPS yok" };
    const ageMs = Date.now() - atMs;
    if (ageMs <= 90 * 1000) return { gpsUiState: "LIVE", gpsLabel: "Canli" };
    if (ageMs <= 5 * 60 * 1000) return { gpsUiState: "STALE", gpsLabel: "Eski" };
    return { gpsUiState: "OFFLINE", gpsLabel: "GPS yok" };
  }

  function deriveAssignmentState({ currentShift, nextShift, boundVehicle }) {
    const base = currentShift || nextShift || null;
    if (!base) return { assignmentState: "NONE", assignmentLabel: "Gorev yok" };
    if (!base.vehicleId && !boundVehicle?.id) return { assignmentState: "ASSIGNED_NO_VEHICLE", assignmentLabel: "Arac bekleniyor" };
    if (currentShift) return { assignmentState: "ACTIVE", assignmentLabel: "Aktif vardiya" };
    return { assignmentState: "ASSIGNED", assignmentLabel: "Vardiya atandi" };
  }

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

    const room = await prisma.room.findUnique({
      where: { id: u.roomId },
      select: {
        id: true,
        regionId: true,
        district: true,
        region: { select: { id: true, name: true } },
      },
    });
    const roomOwnership = resolveRoomOwnership(room || { id: u.roomId, regionId: null, district: null, region: null });

    const drivers = await prisma.driver.findMany({
      where: { roomId: u.roomId },
      include: {
        backupDriver: true,
        user: { select: DRIVER_USER_SELECT },
      },
      orderBy: { id: "asc" },
    });

    const driverIds = drivers.map((x) => Number(x.id)).filter((x) => Number.isFinite(x));
    const [vehicles, shifts] = await Promise.all([
      prisma.vehicle.findMany({
        where: { roomId: u.roomId, archivedAt: null, driverId: { in: driverIds.length ? driverIds : [-1] } },
        select: {
          id: true,
          plate: true,
          status: true,
          driverId: true,
          gpsLast: { select: { at: true, lat: true, lng: true, speed: true } },
        },
      }),
      prisma.shift.findMany({
        where: {
          roomId: u.roomId,
          driverId: { in: driverIds.length ? driverIds : [-1] },
          status: { in: ACTIVE_SHIFT_STATUSES },
          endAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          status: true,
          roomId: true,
          companyId: true,
          vehicleId: true,
          driverId: true,
          agreementId: true,
          company: { select: { id: true, name: true } },
        },
      }),
    ]);

    const vehicleByDriverId = new Map();
    for (const vehicle of vehicles) {
      if (vehicle?.driverId != null) vehicleByDriverId.set(Number(vehicle.driverId), vehicle);
    }

    const nowMs = Date.now();
    const shiftsByDriverId = new Map();
    for (const shift of shifts) {
      const key = Number(shift.driverId);
      if (!shiftsByDriverId.has(key)) shiftsByDriverId.set(key, []);
      shiftsByDriverId.get(key).push(shift);
    }

    const payload = drivers.map((driver) => {
      const key = Number(driver.id);
      const boundVehicle = vehicleByDriverId.get(key) || null;
      const rows = shiftsByDriverId.get(key) || [];
      const currentShift = rows.find((shift) => {
        const startMs = safeTs(shift.startAt);
        const endMs = safeTs(shift.endAt);
        const status = String(shift.status || "").toUpperCase();
        return status === "ACTIVE" || (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= nowMs && endMs >= nowMs);
      }) || null;
      const nextShift = rows.find((shift) => safeTs(shift.startAt) > nowMs) || null;
      const connection = deriveConnectionState(driver.user);
      const assignment = deriveAssignmentState({ currentShift, nextShift, boundVehicle });
      const gps = assignment.assignmentState === "NONE"
        ? { gpsUiState: "IDLE", gpsLabel: "GPS pasif" }
        : assignment.assignmentState === "ASSIGNED"
          ? { gpsUiState: "WAITING", gpsLabel: "Bekliyor" }
          : deriveGpsUiState(boundVehicle);

      return {
        ...driver,
        regionOwnership: roomOwnership,
        boundVehicle,
        currentShift,
        nextShift,
        ops: {
          ...connection,
          ...assignment,
          ...gps,
        },
      };
    });

    return res.json(payload);
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
          include: { backupDriver: true, user: { select: DRIVER_USER_SELECT } },
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
          include: { backupDriver: true, user: { select: DRIVER_USER_SELECT } },
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

  r.post("/:id/reset-device", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid id" });

    const owner = await assertRoomDriverOwner({ user: u, driverId: id, res });
    if (!owner) return;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const currentUser = owner.userId
          ? await tx.user.findUnique({
              where: { id: owner.userId },
              select: { id: true, deviceId: true, deviceBoundAt: true, deviceLastSeenAt: true, sessionVersion: true },
            })
          : null;

        let revokedSessions = 0;
        let bumpedTo = null;
        const hadDeviceBinding = Boolean(currentUser?.deviceId || currentUser?.deviceBoundAt || currentUser?.deviceLastSeenAt);

        if (owner.userId) {
          const revoked = await tx.refreshSession.updateMany({
            where: { userId: owner.userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          revokedSessions = Number(revoked?.count || 0);

          const updatedUser = await tx.user.update({
            where: { id: owner.userId },
            data: {
              deviceId: null,
              deviceBoundAt: null,
              deviceLastSeenAt: null,
              sessionVersion: { increment: 1 },
            },
            select: { sessionVersion: true },
          });
          bumpedTo = updatedUser?.sessionVersion ?? null;
        }

        return {
          hadDeviceBinding,
          revokedSessions,
          sessionVersionBumpedTo: bumpedTo,
          noLinkedUser: !owner.userId,
        };
      });

      await clearDriverPinFailureState(id);
      await audit(req, {
        action: "AUTH_DRIVER_DEVICE_RESET",
        entity: "Driver",
        entityId: id,
        meta: {
          driverId: id,
          driverCode: owner.driverCode || null,
          roomId: u.roomId,
          hadDeviceBinding: result.hadDeviceBinding,
          revokedSessions: result.revokedSessions ?? 0,
          sessionVersionBumpedTo: result.sessionVersionBumpedTo ?? null,
          noLinkedUser: result.noLinkedUser ?? false,
        },
      });

      io?.to(`room:${u.roomId}`).emit("driver:update", { driverId: id, action: "updated" });
      return res.json({
        ok: true,
        driverId: id,
        hadDeviceBinding: result.hadDeviceBinding,
        revokedSessions: result.revokedSessions ?? 0,
        sessionVersionBumpedTo: result.sessionVersionBumpedTo ?? null,
        noLinkedUser: result.noLinkedUser ?? false,
        message: result.hadDeviceBinding
          ? "Cihaz bağı ve aktif erişimler sıfırlandı."
          : "Kayıtlı cihaz bağı yoktu. Aktif erişimler yine de sıfırlandı.",
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
      include: { backupDriver: true, user: { select: DRIVER_USER_SELECT } },
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
