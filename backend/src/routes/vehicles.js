// backend/src/routes/vehicles.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createVehicleSchema } from "../validators.js";
import { sanitizeVehicleDirectoryItem } from "../kvkk/enforcement.js";
import { resolveRoomOwnership } from "../region/ownership.js";
import logger from "../lib/logger.js";

export function vehiclesRouter(io) {
  const r = express.Router();

  const hasKey = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  const dt = (v) => {
    if (v == null || v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  // "Silme engeli" sayacağımız shift status'leri
  const BLOCKING_SHIFT_STATUSES = ["APPROVED", "ACTIVE"];

  function emitRoom(roomId, event, payload) {
    try {
      if (io && roomId) io.to(`room:${roomId}`).emit(event, payload);
    } catch {}
  }

  async function assertRoomVehicle(req, res, vehicleId, { allowArchived = false } = {}) {
    const u = req.user;
    if (!u.roomId) {
      res.status(400).json({ code: "BAD_REQUEST", message: "ROOM must have roomId" });
      return null;
    }

    const v = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, roomId: true, archivedAt: true },
    });

    if (!v) {
      res.status(404).json({ code: "NOT_FOUND", message: "Vehicle bulunamadı" });
      return null;
    }
    if (v.roomId !== u.roomId) {
      res.status(403).json({ code: "FORBIDDEN", message: "Forbidden" });
      return null;
    }
    if (!allowArchived && v.archivedAt) {
      res.status(400).json({ code: "BAD_REQUEST", message: "Vehicle archived (işlem yapılamaz)" });
      return null;
    }
    return v;
  }

  async function getVehicleForBind(req, res, vehicleId) {
    const u = req.user;

    const v = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, plate: true, roomId: true, archivedAt: true },
    });

    if (!v) {
      res.status(404).json({ code: "NOT_FOUND", message: "Vehicle bulunamadı" });
      return null;
    }
    if (v.archivedAt) {
      res.status(400).json({ code: "BAD_REQUEST", message: "Vehicle archived (işlem yapılamaz)" });
      return null;
    }

    // ROOM scope
    if (u.role === "ROOM") {
      if (!u.roomId) {
        res.status(400).json({ code: "BAD_REQUEST", message: "ROOM must have roomId" });
        return null;
      }
      if (v.roomId !== u.roomId) {
        res.status(403).json({ code: "FORBIDDEN", message: "Forbidden" });
        return null;
      }
    }

    return v;
  }

  // ---------------------------------------------------------
  // LIST vehicles based on role
  // ROOM:
  //  - default: archivedAt=null
  //  - ?archived=1 => only archived
  //  - ?includeArchived=1 => all
  // ---------------------------------------------------------
  r.get("/", authRequired(), async (req, res) => {
    const u = req.user;

    const includeArchived =
      String(req.query?.includeArchived || "") === "1" ||
      String(req.query?.includeArchived || "").toLowerCase() === "true";

    const onlyArchived =
      String(req.query?.archived || "") === "1" ||
      String(req.query?.archived || "").toLowerCase() === "true";

    const take = Math.min(200, Math.max(1, Number(req.query?.take || 120) || 120));
    const q = String(req.query?.q || "").trim();
    const qWhere = q
      ? {
          OR: [
            { plate: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { color: { contains: q, mode: "insensitive" } },
            { note: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    if (u.role === "ROOM") {
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

      const where = { roomId: u.roomId, ...qWhere };
      if (onlyArchived) where.archivedAt = { not: null };
      else if (!includeArchived) where.archivedAt = null;

      const items = await prisma.vehicle.findMany({
        where,
        include: {
          gpsLast: true,
          gpsState: true,
          driver: true,
          shifts: {
            where: { status: { in: ["APPROVED", "ACTIVE"] } },
            include: { company: true, driver: true, stops: { orderBy: { order: "asc" } } },
            orderBy: { startAt: "asc" },
            take: 5,
          },
        },
        orderBy: { id: "asc" },
        take,
      });
      return res.json(items.map((x) => ({
        ...sanitizeVehicleDirectoryItem(x, { role: u.role }),
        regionOwnership: roomOwnership,
      })));
    }

    if (u.role === "COMPANY") {
      if (!u.companyId) return res.json([]);
      const now = new Date();
      const shifts = await prisma.shift.findMany({
        where: {
          companyId: u.companyId,
          status: { in: ["APPROVED", "ACTIVE"] },
          vehicleId: { not: null },
          startAt: { lte: now },
          endAt: { gte: now },
        },
        select: { vehicleId: true },
      });
      const vehicleIds = Array.from(new Set(shifts.map((s) => s.vehicleId).filter(Boolean)));
      if (!vehicleIds.length) return res.json([]);

      const items = await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds }, archivedAt: null, ...qWhere },
        include: { gpsLast: true, gpsState: true, room: true, driver: true },
        orderBy: { id: "asc" },
        take,
      });
      return res.json(items.map((x) => sanitizeVehicleDirectoryItem(x, { role: u.role })));
    }

    if (u.role === "DRIVER") {
      const driver = await prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true } });
      if (!driver) return res.json([]);

      const shifts = await prisma.shift.findMany({
        where: { driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] }, vehicleId: { not: null } },
        select: { vehicleId: true },
      });
      const vehicleIds = Array.from(new Set(shifts.map((s) => s.vehicleId).filter(Boolean)));
      if (!vehicleIds.length) return res.json([]);

      const items = await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds }, archivedAt: null, ...qWhere },
        include: { gpsLast: true, gpsState: true, room: true, driver: true },
        orderBy: { id: "asc" },
        take,
      });
      return res.json(items.map((x) => sanitizeVehicleDirectoryItem(x, { role: u.role })));
    }

    if (u.role === "PERSONEL") {
      if (!u.companyId) return res.json([]);

      const now = new Date();
      const shifts = await prisma.shift.findMany({
        where: {
          companyId: u.companyId,
          status: { in: ["APPROVED", "ACTIVE"] },
          vehicleId: { not: null },
          startAt: { lte: now },
          endAt: { gte: now },
        },
        select: { vehicleId: true },
      });
      const vehicleIds = Array.from(new Set(shifts.map((s) => s.vehicleId).filter(Boolean)));
      if (!vehicleIds.length) return res.json([]);

      const items = await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds }, archivedAt: null, ...qWhere },
        include: { gpsLast: true, gpsState: true },
        orderBy: { id: "asc" },
        take,
      });
      return res.json(items.map((x) => sanitizeVehicleDirectoryItem(x, { role: u.role })));
    }

    // SUPER_ADMIN: default active only (istersen query ile genişletebiliriz)
    const where = { ...qWhere };
    if (!includeArchived && !onlyArchived) where.archivedAt = null;
    if (onlyArchived) where.archivedAt = { not: null };

    const items = await prisma.vehicle.findMany({
      where,
      include: { gpsLast: true, gpsState: true, room: true, driver: true },
      orderBy: { id: "asc" },
      take,
    });
    return res.json(items.map((x) => sanitizeVehicleDirectoryItem(x, { role: u.role })));
  });

  // ---------------------------------------------------------
  // Bind / Unbind driver to vehicle (ROOM + SUPER_ADMIN)
  // body: { driverId: number }  -> bind
  // body: { driverId: null }    -> unbind
  //
  // KURAL: aynı driver aynı anda birden fazla araca bağlı olamaz
  // -> başka araca bağlıysa 409 DRIVER_ALREADY_BOUND
  // ---------------------------------------------------------
  r.put("/:id/bind-driver", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    const u = req.user;
    const vehicleId = Number(req.params.id);

    const body = req.body || {};
    const hasDriverId = Object.prototype.hasOwnProperty.call(body, "driverId");
    const raw = hasDriverId ? body.driverId : undefined;

    const driverId = raw == null ? null : Number(raw);

    if (!vehicleId) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid vehicle id" });
    if (!hasDriverId) return res.status(400).json({ code: "BAD_REQUEST", message: "driverId gerekli (null=ayır)" });

    const vehicle = await getVehicleForBind(req, res, vehicleId);
    if (!vehicle) return;

    // UNBIND
    if (driverId === null || Number.isNaN(driverId) || driverId === 0) {
      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { driverId: null },
        include: { gpsLast: true, gpsState: true, driver: true },
      });

      emitRoom(vehicle.roomId, "vehicle:update", { vehicleId: updated.id, action: "unbind-driver" });
      return res.json({ ok: true, vehicle: sanitizeVehicleDirectoryItem(updated, { role: u.role }), unbound: true });
    }

    // BIND (validate driver)
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, roomId: true, fullName: true },
    });
    if (!driver) return res.status(404).json({ code: "NOT_FOUND", message: "Driver bulunamadı" });

    // Driver aynı room içinde olmalı (tek source of truth: driver.roomId)
    if (vehicle.roomId == null || driver.roomId == null || driver.roomId !== vehicle.roomId) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "Driver aynı room içinde olmalı" });
    }

    // ❌ başka araca bağlı mı?
    const other = await prisma.vehicle.findFirst({
      where: { driverId: driverId, archivedAt: null, id: { not: vehicleId } },
      select: { id: true, plate: true, roomId: true },
    });

    if (other) {
      return res.status(409).json({
        code: "DRIVER_ALREADY_BOUND",
        message: "Bu sürücü zaten başka bir araca bağlı.",
        conflictingVehicle: { id: other.id, plate: other.plate, roomId: other.roomId },
      });
    }

    // ✅ bind
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { driverId },
      include: { gpsLast: true, gpsState: true, driver: true },
    });

    emitRoom(vehicle.roomId, "vehicle:update", { vehicleId: updated.id, action: "bind-driver" });
    return res.json({ ok: true, vehicle: sanitizeVehicleDirectoryItem(updated, { role: u.role }), bound: true });
  });

  // ---------------------------------------------------------
  // Update vehicle (ROOM)
  // ---------------------------------------------------------
  r.put("/:id", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const vehicleId = Number(req.params.id);
    const b = req.body || {};

    if (!vehicleId) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid vehicle id" });

    const ownerOk = await assertRoomVehicle(req, res, vehicleId, { allowArchived: false });
    if (!ownerOk) return;

    const data = {};
    const has = (k) => hasKey(b, k);

    // required-ish fields: null/empty göndermeyi engelle
    if (has("plate")) {
      const p = String(b.plate || "").trim();
      if (p.length < 3) return res.status(400).json({ code: "BAD_REQUEST", message: "Plate too short" });
      data.plate = p;
    }
    if (has("capacity")) {
      const n = Number(b.capacity);
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ code: "BAD_REQUEST", message: "Capacity must be > 0" });
      data.capacity = Math.trunc(n);
    }
    if (has("speedLimitKmh")) {
      const n = Number(b.speedLimitKmh);
      if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ code: "BAD_REQUEST", message: "Speed limit must be > 0" });
      data.speedLimitKmh = Math.trunc(n);
    }

    // optional meta (null ile temizlenebilir)
    if (has("type")) data.type = b.type ? String(b.type) : null;
    if (has("brand")) data.brand = b.brand ? String(b.brand).trim() : null;
    if (has("model")) data.model = b.model ? String(b.model).trim() : null;
    if (has("modelYear")) data.modelYear = b.modelYear == null || b.modelYear === "" ? null : Number(b.modelYear);
    if (has("color")) data.color = b.color ? String(b.color).trim() : null;
    if (has("vin")) data.vin = b.vin ? String(b.vin).trim() : null;
    if (has("note")) data.note = b.note ? String(b.note).trim() : null;

    // dates
    if (has("inspectionDueAt")) data.inspectionDueAt = dt(b.inspectionDueAt);
    if (has("insuranceDueAt")) data.insuranceDueAt = dt(b.insuranceDueAt);
    if (has("cascoDueAt")) data.cascoDueAt = dt(b.cascoDueAt);

    // service
    if (has("lastServiceAt")) data.lastServiceAt = dt(b.lastServiceAt);
    if (has("lastServiceKm")) data.lastServiceKm = b.lastServiceKm == null || b.lastServiceKm === "" ? null : Number(b.lastServiceKm);
    if (has("serviceIntervalKm")) {
      const v = b.serviceIntervalKm == null || b.serviceIntervalKm === "" ? null : Number(b.serviceIntervalKm);
      data.serviceIntervalKm = v == null ? 15000 : Math.trunc(v);
    }
    if (has("serviceIntervalDays")) data.serviceIntervalDays = b.serviceIntervalDays == null || b.serviceIntervalDays === "" ? null : Number(b.serviceIntervalDays);

    // odometer (⚠️ odometerSource null yapma — prisma’da non-null olabilir)
    if (has("odometerKm")) {
      if (b.odometerKm == null || b.odometerKm === "") {
        data.odometerKm = null;
        data.odometerUpdatedAt = null;
        // odometerSource'a dokunmuyoruz
      } else {
        data.odometerKm = Number(b.odometerKm);
        data.odometerUpdatedAt = new Date();
        data.odometerSource = "MANUAL";
      }
    }

    // legacy
    if (has("nextMaintenanceAt")) data.nextMaintenanceAt = dt(b.nextMaintenanceAt);

    if (!Object.keys(data).length) {
      return res.status(400).json({ code: "BAD_REQUEST", message: "No fields to update" });
    }

    try {
      const updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data,
        include: { gpsLast: true, gpsState: true, driver: true },
      });

      emitRoom(u.roomId, "vehicle:update", { vehicleId: updated.id, action: "updated" });
      return res.json({ ok: true, vehicle: sanitizeVehicleDirectoryItem(updated, { role: u.role }) });
    } catch (e) {
      return res.status(400).json({ code: "BAD_REQUEST", message: String(e?.message || e) });
    }
  });

  // ---------------------------------------------------------
  // Archive / Delete vehicle (ROOM)
  // Rules:
  //  - If vehicle has APPROVED/ACTIVE shift => BLOCK (cannot delete/archive)
  //  - Else if vehicle has ANY shift history => ARCHIVE (and detach driverId)
  //  - Else => HARD DELETE
  // ---------------------------------------------------------
  r.delete("/:id", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const vehicleId = Number(req.params.id);

    if (!vehicleId) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid vehicle id" });

    const ownerOk = await assertRoomVehicle(req, res, vehicleId, { allowArchived: false });
    if (!ownerOk) return;

    const blockingShift = await prisma.shift.findFirst({
      where: { vehicleId, status: { in: BLOCKING_SHIFT_STATUSES } },
      select: { id: true, status: true },
      orderBy: { id: "desc" },
    });
    if (blockingShift) {
      return res.status(400).json({
        code: "HAS_ACTIVE_SHIFTS",
        message: `Vehicle aktif vardiyaya bağlı (shift #${blockingShift.id} ${blockingShift.status})`,
      });
    }

    const anyShift = await prisma.shift.findFirst({
      where: { vehicleId },
      select: { id: true, status: true },
      orderBy: { id: "desc" },
    });

    try {
      if (anyShift) {
        const archived = await prisma.vehicle.update({
          where: { id: vehicleId },
          data: {
            archivedAt: new Date(),
            archivedReason: `AUTO: linked shift ${anyShift.id} (${anyShift.status})`,
            driverId: null, // güvenli: bağ kopar
          },
          include: { gpsLast: true, gpsState: true, driver: true },
        });

        emitRoom(u.roomId, "vehicle:update", { vehicleId, action: "archived" });
        return res.json({ ok: true, archived: true, vehicle: archived });
      }

      await prisma.vehicle.delete({ where: { id: vehicleId } });
      emitRoom(u.roomId, "vehicle:update", { vehicleId, action: "deleted" });
      return res.json({ ok: true, archived: false });
    } catch (e) {
      return res.status(400).json({ code: "BAD_REQUEST", message: String(e?.message || e) });
    }
  });

  // ---------------------------------------------------------
  // UNARCHIVE (ROOM)  ✅ Arşivden geri al
  // ---------------------------------------------------------
  r.put("/:id/unarchive", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    const vehicleId = Number(req.params.id);
    if (!vehicleId) return res.status(400).json({ code: "BAD_REQUEST", message: "Invalid vehicle id" });

    const v = await assertRoomVehicle(req, res, vehicleId, { allowArchived: true });
    if (!v) return;

    if (!v.archivedAt) {
      return res.json({ ok: true, vehicleId, unarchived: false, message: "Zaten aktif" });
    }

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { archivedAt: null, archivedReason: null },
      include: { gpsLast: true, gpsState: true, driver: true },
    });

    emitRoom(u.roomId, "vehicle:update", { vehicleId, action: "unarchived" });
    return res.json({ ok: true, vehicle: sanitizeVehicleDirectoryItem(updated, { role: u.role }), unarchived: true });
  });

  // ---------------------------------------------------------
  // Create vehicle (ROOM)
  // ---------------------------------------------------------
  r.post("/", authRequired(), requireRole("ROOM"), async (req, res) => {
    const u = req.user;
    if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });

    const parsed = createVehicleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const {
      plate,
      capacity,
      speedLimitKmh,
      nextMaintenanceAt,

      type,
      brand,
      model,
      modelYear,
      color,
      vin,
      note,

      inspectionDueAt,
      insuranceDueAt,
      cascoDueAt,

      lastServiceAt,
      lastServiceKm,
      serviceIntervalKm,
      serviceIntervalDays,

      odometerKm,
    } = parsed.data;

    try {
      const vehicle = await prisma.vehicle.create({
        data: {
          roomId: u.roomId,
          plate,
          capacity,
          speedLimitKmh: speedLimitKmh ?? 80,

          type: type ?? null,
          brand: brand ?? null,
          model: model ?? null,
          modelYear: modelYear ?? null,
          color: color ?? null,
          vin: vin ?? null,
          note: note ?? null,

          inspectionDueAt: dt(inspectionDueAt),
          insuranceDueAt: dt(insuranceDueAt),
          cascoDueAt: dt(cascoDueAt),

          lastServiceAt: dt(lastServiceAt),
          lastServiceKm: lastServiceKm ?? null,
          serviceIntervalKm: serviceIntervalKm ?? 15000,
          serviceIntervalDays: serviceIntervalDays ?? null,

          odometerKm: odometerKm ?? null,
          odometerUpdatedAt: odometerKm != null ? new Date() : null,
          odometerSource: odometerKm != null ? "MANUAL" : undefined,

          nextMaintenanceAt: dt(nextMaintenanceAt),

          archivedAt: null,
          archivedReason: null,
        },
        include: { gpsLast: true, gpsState: true, driver: true },
      });

      emitRoom(u.roomId, "vehicle:update", { vehicleId: vehicle.id, action: "created" });
      return res.json(sanitizeVehicleDirectoryItem(vehicle, { role: u.role }));
    } catch (e) {
      if (e?.code === "P2002" && Array.isArray(e?.meta?.target)) {
        if (e.meta.target.includes("plate")) {
          return res.status(409).json({
            error: "Bu plaka ile kayıtlı araç zaten var.",
            code: "VEHICLE_PLATE_EXISTS",
            field: "plate",
          });
        }
        if (e.meta.target.includes("vin")) {
          return res.status(409).json({
            error: "Bu şasi numarası ile kayıtlı araç zaten var.",
            code: "VEHICLE_VIN_EXISTS",
            field: "vin",
          });
        }
      }
      logger.error("vehicle create failed", e);
      return res.status(500).json({ error: "Araç kaydedilemedi.", code: "VEHICLE_CREATE_FAILED" });
    }
  });

  return r;
}

