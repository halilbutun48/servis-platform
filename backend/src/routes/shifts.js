// backend/src/routes/shifts.js (M5 + M7 + M8 + M9 + M10 audit)
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { audit } from "../audit.js";

const createShiftSchema = z.object({
  roomId: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.string().optional(),

  // COMPANY → ROOM teklif (shift seviyesinde)
  companyOfferVehicleId: z.number().int().positive().optional(),
  companyOfferNote: z.string().max(200).optional(),

  stops: z
    .array(
      z.object({
        name: z.string().min(1),
        lat: z.number(),
        lng: z.number(),
        order: z.number().int().min(1),
        type: z.enum(["COMMON", "MANUAL"]).optional(),
      })
    )
    .optional(),
});

const approveSchema = z.object({
  vehicleId: z.number().int().positive(),
  driverId: z.number().int().positive().optional(), // opsiyonel
  status: z.string().optional(),
});

// ROOM → COMPANY teklif schema (pazarlık)
const roomOfferSchema = z.object({
  roomOfferVehicleId: z.number().int().positive().optional(),
  roomOfferNote: z.string().max(200).optional(),

  // opsiyonel: driver'a ilet (room isterse)
  notifyDriver: z.boolean().optional(),
  driverNote: z.string().max(200).optional(),
});

// COMPANY: mevcut shift üstünde teklif güncelle (karşı teklif)
const companyOfferSchema = z
  .object({
    companyOfferVehicleId: z.union([z.number().int().positive(), z.null()]).optional(),
    companyOfferNote: z.union([z.string().max(200), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

const addStopSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  order: z.number().int().min(1).optional(),
  type: z.enum(["COMMON", "MANUAL"]).optional(),
});

const updateStopSchema = z
  .object({
    name: z.string().min(1).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    order: z.number().int().min(1).optional(),
    type: z.enum(["COMMON", "MANUAL"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

const reorderSchema = z.object({
  idsInOrder: z.array(z.number().int().positive()).optional(),
  orders: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        stopId: z.number().int().positive().optional(),
        order: z.number().int().min(1).optional(),
      })
    )
    .optional(),
});

const reachedSchema = z.object({ order: z.number().int().min(1) });

const fromTemplateSchema = z.object({
  templateId: z.number().int().positive(),
  mode: z.enum(["REPLACE", "APPEND"]).default("REPLACE"),
});

function isEditableStatus(status) {
  return status === "DRAFT" || status === "REQUESTED";
}

function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

function parseDateOrThrow(s, fieldName) {
  const d = new Date(s);
  if (!d || Number.isNaN(d.getTime())) {
    const e = new Error(`Invalid date for ${fieldName}`);
    e.status = 400;
    throw e;
  }
  return d;
}

// WS helper
function emitShift(io, shift, event, payload = {}) {
  if (!io || !shift) return;
  const base = { shiftId: shift.id, ...payload };
  io.to(`company:${shift.companyId}`).emit(event, base);
  io.to(`room:${shift.roomId}`).emit(event, base);
  io.to(`shift:${shift.id}`).emit(event, base);
}

// --- M7 helpers ---
function haversineM(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function clusterPoints(points, radiusM) {
  const left = new Set(points.map((_, i) => i));
  const clusters = [];

  while (left.size) {
    const seed = left.values().next().value;
    left.delete(seed);

    const q = [seed];
    const members = [seed];

    while (q.length) {
      const i = q.shift();
      for (const j of Array.from(left)) {
        const d = haversineM(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
        if (d <= radiusM) {
          left.delete(j);
          q.push(j);
          members.push(j);
        }
      }
    }
    clusters.push(members);
  }

  return clusters;
}

async function getShiftAndCheckScopeOrThrow(shiftId, user) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) {
    const e = new Error("Shift not found");
    e.status = 404;
    throw e;
  }

  if (user.role === "SUPER_ADMIN") return shift;

  if (user.role === "ROOM") {
    if (!user.roomId || user.roomId !== shift.roomId) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    return shift;
  }

  if (user.role === "COMPANY") {
    if (!user.companyId || user.companyId !== shift.companyId) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    return shift;
  }

  const e = new Error("Forbidden");
  e.status = 403;
  throw e;
}

// --- M7: Request delegate detect (prisma.request olmayabilir) ---
let _ReqDelegate = null;
let _ReqLatField = "lat";
let _ReqLngField = "lng";
let _ReqStatusField = "status";

async function getRequestDelegateOrThrow() {
  // PickupRequest varsa HER ZAMAN onu kullan
  if (prisma.pickupRequest) {
    _ReqDelegate = prisma.pickupRequest;
    _ReqLatField = "lat";
    _ReqLngField = "lng";
    _ReqStatusField = "status";
    return { d: _ReqDelegate, latF: _ReqLatField, lngF: _ReqLngField, statusF: _ReqStatusField };
  }

  if (_ReqDelegate) {
    return { d: _ReqDelegate, latF: _ReqLatField, lngF: _ReqLngField, statusF: _ReqStatusField };
  }

  const candidates = Object.keys(prisma).filter(
    (k) => k !== "stop" && prisma[k] && typeof prisma[k].findMany === "function"
  );

  const probes = [
    { lat: "lat", lng: "lng", status: "status" },
    { lat: "latitude", lng: "longitude", status: "status" },
    { lat: "lat", lng: "lng", status: "state" },
  ];

  for (const k of candidates) {
    for (const p of probes) {
      try {
        const sel = { id: true, shiftId: true };
        sel[p.lat] = true;
        sel[p.lng] = true;
        sel[p.status] = true;

        await prisma[k].findMany({ take: 1, select: sel });

        _ReqDelegate = prisma[k];
        _ReqLatField = p.lat;
        _ReqLngField = p.lng;
        _ReqStatusField = p.status;

        return { d: _ReqDelegate, latF: _ReqLatField, lngF: _ReqLngField, statusF: _ReqStatusField };
      } catch {
        // continue
      }
    }
  }

  const e = new Error("Request modeli Prisma Client'ta bulunamadı (shiftId + lat/lng + status/state bekleniyor)");
  e.status = 500;
  throw e;
}

export function shiftsRouter(io) {
  const r = express.Router();

  // ROOM/COMPANY/SUPER_ADMIN: list shifts
  r.get("/", authRequired(), async (req, res) => {
    const role = req.user?.role;

    const where = {};
    if (role === "ROOM") where.roomId = req.user.roomId;
    else if (role === "COMPANY") where.companyId = req.user.companyId;
    else if (role === "SUPER_ADMIN") {
      // no filter
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    const items = await prisma.shift.findMany({
      where,
      orderBy: { id: "desc" },
      include: { vehicle: true, driver: true, company: true, room: true },
      take: 50,
    });

    res.json(items);
  });

  // DRIVER or PERSONEL: my shifts
  r.get("/my", authRequired(), async (req, res) => {
    const role = req.user?.role;

    // DRIVER: assigned shifts
    if (role === "DRIVER") {
      const driver = await prisma.driver.findFirst({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!driver) return res.json({ items: [] });

      const items = await prisma.shift.findMany({
        where: { driverId: driver.id, status: { in: ["APPROVED", "ACTIVE"] } },
        orderBy: { id: "desc" },
        include: { stops: { orderBy: { order: "asc" } }, progress: true, vehicle: true },
        take: 20,
      });

      return res.json({ items });
    }

    // PERSONEL: shifts where this personel has pickup request (OPEN/ACCEPTED)
    if (role === "PERSONEL") {
      const personel = await prisma.personel.findFirst({
        where: { userId: req.user.id },
        select: { id: true, companyId: true },
      });
      if (!personel) return res.json({ items: [] });

      const prs = await prisma.pickupRequest.findMany({
        where: {
          personelId: personel.id,
          status: { in: ["OPEN", "ACCEPTED"] },
          shift: {
            is: {
              companyId: personel.companyId,
              status: { in: ["APPROVED", "ACTIVE"] },
            },
          },
        },
        orderBy: { id: "desc" },
        include: {
          shift: {
            include: {
              stops: { orderBy: { order: "asc" } },
              progress: true,
              vehicle: true,
            },
          },
        },
        take: 20,
      });

      // dedupe same shift (if multiple pickup requests exist)
      const seen = new Set();
      const items = [];
      for (const pr of prs) {
        const sh = pr.shift;
        if (!sh) continue;
        if (seen.has(sh.id)) continue;
        seen.add(sh.id);
        items.push(sh);
      }

      return res.json({ items });
    }

    return res.status(403).json({ error: "Forbidden" });
  });

  // COMPANY: create shift (with optional initial stops + optional initial offer)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    try {
      const parsed = createShiftSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      if (!req.user.companyId) return res.status(400).json({ error: "User has no companyId" });

      const status = String(parsed.data.status ?? "REQUESTED");
      const startAt = parseDateOrThrow(parsed.data.startAt, "startAt");
      const endAt = parseDateOrThrow(parsed.data.endAt, "endAt");
      if (startAt >= endAt) return res.status(400).json({ error: "startAt must be < endAt" });

      // OFFER VALIDATION
      const offerVehicleId = parsed.data.companyOfferVehicleId ?? null;
      if (offerVehicleId) {
        const v = await prisma.vehicle.findUnique({
          where: { id: offerVehicleId },
          select: { id: true, roomId: true },
        });
        if (!v) return res.status(400).json({ error: "Offer vehicle not found" });
        if (v.roomId !== parsed.data.roomId) {
          return res.status(400).json({ error: "Offer vehicle must belong to the same roomId" });
        }
      }

      const shift = await prisma.shift.create({
        data: {
          companyId: req.user.companyId,
          roomId: parsed.data.roomId,
          startAt,
          endAt,
          status,

          companyOfferVehicleId: offerVehicleId,
          companyOfferNote: trimOrNull(parsed.data.companyOfferNote),

          ...(parsed.data.stops?.length
            ? {
                stops: {
                  create: parsed.data.stops.map((s) => ({
                    name: s.name,
                    lat: s.lat,
                    lng: s.lng,
                    order: s.order,
                    type: s.type ?? "COMMON",
                  })),
                },
              }
            : {}),
        },
        include: {
          stops: { orderBy: { order: "asc" } },
          vehicle: true,
          driver: true,
          company: true,
          room: true,
        },
      });

      await audit(req, {
        action: "SHIFT_CREATE",
        entity: "Shift",
        entityId: shift.id,
        meta: {
          roomId: shift.roomId,
          startAt: shift.startAt,
          endAt: shift.endAt,
          status: shift.status,
          hasCompanyOffer: Boolean(shift.companyOfferVehicleId || shift.companyOfferNote),
        },
      });

      // WS notify
      emitShift(io, shift, "shift:created");

      res.json(shift);
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // COMPANY: update offer on existing shift (counter-offer)
  r.put("/:id/company-offer", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = companyOfferSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    if (!req.user.companyId) return res.status(400).json({ error: "User has no companyId" });

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.companyId !== req.user.companyId) return res.status(403).json({ error: "Forbidden" });

    // sadece approve öncesi
    if (!["DRAFT", "REQUESTED"].includes(String(shift.status))) {
      return res.status(400).json({ error: "Company offer can be set only before APPROVE (DRAFT/REQUESTED)" });
    }

    // payload normalize
    const rawVehicleId = Object.prototype.hasOwnProperty.call(parsed.data, "companyOfferVehicleId")
      ? parsed.data.companyOfferVehicleId
      : undefined;

    const rawNote = Object.prototype.hasOwnProperty.call(parsed.data, "companyOfferNote")
      ? parsed.data.companyOfferNote
      : undefined;

    const companyOfferVehicleId =
      rawVehicleId === undefined ? undefined : rawVehicleId === null ? null : Number(rawVehicleId);

    const noteStr = rawNote === undefined ? undefined : rawNote === null ? null : trimOrNull(rawNote);

    // vehicle doğrula (set ediliyorsa)
    if (companyOfferVehicleId) {
      const v = await prisma.vehicle.findUnique({
        where: { id: companyOfferVehicleId },
        select: { id: true, roomId: true },
      });
      if (!v) return res.status(400).json({ error: "Offer vehicle not found" });
      if (v.roomId !== shift.roomId) {
        return res.status(400).json({ error: "Offer vehicle must belong to the same roomId" });
      }
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        ...(companyOfferVehicleId !== undefined ? { companyOfferVehicleId } : {}),
        ...(noteStr !== undefined ? { companyOfferNote: noteStr } : {}),
      },
      include: {
        vehicle: true,
        driver: true,
        company: true,
        room: true,
      },
    });

    await audit(req, {
      action: "SHIFT_COMPANY_OFFER",
      entity: "Shift",
      entityId: updated.id,
      meta: {
        companyOfferVehicleId: updated.companyOfferVehicleId,
        hasNote: Boolean(updated.companyOfferNote),
      },
    });

    // WS: company/room ekranı yenilensin
    emitShift(io, updated, "shift:company-offer");

    res.json(updated);
  });

  // ROOM: approve/assign (POST + PUT alias)
  const approveHandler = async (req, res) => {
    const id = Number(req.params.id);
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });

    const vehicleId = Number(parsed.data.vehicleId);
    let driverId = parsed.data.driverId ? Number(parsed.data.driverId) : null;

    // driverId gelmediyse: vehicle üstünden driverId çek
    if (!driverId) {
      const v = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { id: true, roomId: true, driverId: true },
      });
      if (!v) return res.status(400).json({ error: "Vehicle not found" });

      if (v.roomId !== shift.roomId) {
        return res.status(400).json({ error: "Vehicle must belong to the same roomId" });
      }

      if (!v.driverId) {
        return res.status(400).json({ error: "Selected vehicle has no driver. Bind a driver to the vehicle first." });
      }
      driverId = v.driverId;
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: { vehicleId, driverId, status: "APPROVED" },
      include: {
        stops: { orderBy: { order: "asc" } },
        progress: true,
        vehicle: true,
        driver: true,
        company: true,
        room: true,
      },
    });

    await audit(req, {
      action: "SHIFT_APPROVE",
      entity: "Shift",
      entityId: updated.id,
      meta: { vehicleId, driverId },
    });

    emitShift(io, updated, "shift:approved");
    res.json(updated);
  };

  r.post("/:id/approve", authRequired(), requireRole("ROOM"), approveHandler);
  r.put("/:id/approve", authRequired(), requireRole("ROOM"), approveHandler);
  r.put("/:id/assign", authRequired(), requireRole("ROOM"), approveHandler);

  // ROOM: (opsiyonel) Company'e karşı teklif ilet + isterse driver'a da ilet
  r.put("/:id/room-offer", authRequired(), requireRole("ROOM"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = roomOfferSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });

    // pazarlık sadece approve öncesi mantıklı
    if (!["DRAFT", "REQUESTED"].includes(String(shift.status))) {
      return res.status(400).json({ error: "Room offer can be set only before APPROVE (DRAFT/REQUESTED)" });
    }

    const roomOfferVehicleId = parsed.data.roomOfferVehicleId ? Number(parsed.data.roomOfferVehicleId) : null;

    // araç validasyonu: aynı room + driverId yakala (driver’a ilet seçildiyse lazım)
    let driverId = null;
    if (roomOfferVehicleId) {
      const v = await prisma.vehicle.findUnique({
        where: { id: roomOfferVehicleId },
        select: { id: true, roomId: true, driverId: true },
      });
      if (!v) return res.status(400).json({ error: "Room offer vehicle not found" });
      if (v.roomId !== shift.roomId) {
        return res.status(400).json({ error: "Room offer vehicle must belong to the same roomId" });
      }
      driverId = v.driverId ?? null;
    }

    const notifyDriver = Boolean(parsed.data.notifyDriver);
    const driverNote = trimOrNull(parsed.data.driverNote);

    // notifyDriver true ise: araç + driver şart
    if (notifyDriver) {
      if (!roomOfferVehicleId) {
        return res.status(400).json({ error: "notifyDriver requires roomOfferVehicleId" });
      }
      if (!driverId) {
        return res.status(400).json({ error: "Selected offer vehicle has no driver. Bind a driver first." });
      }
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        roomOfferVehicleId,
        roomOfferNote: trimOrNull(parsed.data.roomOfferNote),
        roomOfferToDriver: notifyDriver,
        roomOfferDriverNote: notifyDriver ? driverNote : null,
      },
      include: {
        vehicle: true,
        driver: true,
        company: true,
        room: true,
      },
    });

    await audit(req, {
      action: "SHIFT_ROOM_OFFER",
      entity: "Shift",
      entityId: updated.id,
      meta: {
        roomOfferVehicleId,
        notifyDriver,
        hasDriverNote: Boolean(driverNote),
      },
    });

    emitShift(io, updated, "shift:room-offer");

    // opsiyonel driver notify
    if (notifyDriver && driverId) {
      io?.to(`driver:${driverId}`).emit("shift:room-offer", {
        shiftId: shift.id,
        roomOfferVehicleId,
        roomOfferDriverNote: driverNote,
      });
    }

    res.json(updated);
  });

  // ROOM: start shift (APPROVED -> ACTIVE)
  r.post("/:id/start", authRequired(), requireRole("ROOM"), async (req, res) => {
    const id = Number(req.params.id);
    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });
    if (shift.status !== "APPROVED") return res.status(400).json({ error: "Shift must be APPROVED to start" });

    const updated = await prisma.shift.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: { stops: { orderBy: { order: "asc" } }, progress: true, vehicle: true, driver: true, company: true, room: true },
    });

    await prisma.shiftProgress.upsert({
      where: { shiftId: updated.id },
      update: {},
      create: { shiftId: updated.id, lastReachedOrder: 0 },
    });

    await audit(req, {
      action: "SHIFT_START",
      entity: "Shift",
      entityId: updated.id,
    });

    emitShift(io, updated, "shift:started");
    res.json(updated);
  });

  // COMPANY: add stop to shift (DRAFT/REQUESTED)
  r.post("/:id/stops", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (!req.user.companyId || req.user.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });
    if (!isEditableStatus(shift.status)) return res.status(400).json({ error: "Stops can be edited only in DRAFT/REQUESTED" });

    const parsed = addStopSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const maxOrder = (shift.stops ?? []).reduce((m, s) => Math.max(m, s.order), 0);
    const order = parsed.data.order ?? maxOrder + 1;
    if ((shift.stops ?? []).some((s) => s.order === order)) return res.status(400).json({ error: "Stop order already exists" });

    const stop = await prisma.stop.create({
      data: {
        shiftId: shift.id,
        name: parsed.data.name,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        order,
        type: parsed.data.type ?? "COMMON",
      },
    });

    await audit(req, {
      action: "SHIFT_STOP_ADD",
      entity: "Shift",
      entityId: shift.id,
      meta: { stopId: stop.id, order, type: stop.type },
    });

    emitShift(io, shift, "route:plan");
    res.json({ ok: true, stop });
  });

  // COMPANY: update stop (DRAFT/REQUESTED)
  r.put("/:id/stops/:stopId(\\d+)", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const stopId = Number(req.params.stopId);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (!req.user.companyId || req.user.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });
    if (!isEditableStatus(shift.status)) return res.status(400).json({ error: "Stops can be edited only in DRAFT/REQUESTED" });

    const parsed = updateStopSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const stop = (shift.stops ?? []).find((s) => s.id === stopId);
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    if (parsed.data.order && parsed.data.order !== stop.order) {
      if ((shift.stops ?? []).some((s) => s.order === parsed.data.order)) {
        return res.status(400).json({ error: "Stop order already exists" });
      }
    }

    const updated = await prisma.stop.update({
      where: { id: stopId },
      data: parsed.data,
    });

    await audit(req, {
      action: "SHIFT_STOP_UPDATE",
      entity: "Shift",
      entityId: shift.id,
      meta: { stopId, patch: Object.keys(parsed.data) },
    });

    emitShift(io, shift, "route:plan");
    res.json({ ok: true, stop: updated });
  });

  // COMPANY: delete stop (DRAFT/REQUESTED)
  r.delete("/:id/stops/:stopId(\\d+)", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const stopId = Number(req.params.stopId);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (!req.user.companyId || req.user.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });
    if (!isEditableStatus(shift.status)) return res.status(400).json({ error: "Stops can be edited only in DRAFT/REQUESTED" });

    const stop = (shift.stops ?? []).find((s) => s.id === stopId);
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    await prisma.stop.delete({ where: { id: stopId } });

    await audit(req, {
      action: "SHIFT_STOP_DELETE",
      entity: "Shift",
      entityId: shift.id,
      meta: { stopId },
    });

    emitShift(io, shift, "route:plan");
    res.json({ ok: true });
  });

  // COMPANY/ROOM: apply route template to shift stops (only in DRAFT/REQUESTED)
  r.post("/:id/stops/from-template", authRequired(), requireRole("COMPANY", "ROOM"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = fromTemplateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (!isEditableStatus(shift.status)) return res.status(400).json({ error: "Stops can be edited only in DRAFT/REQUESTED" });

    // scope
    if (req.user.role === "COMPANY") {
      if (!req.user.companyId || req.user.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user.role === "ROOM") {
      if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });
    }

    const tpl = await prisma.routeTemplate.findUnique({
      where: { id: parsed.data.templateId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!tpl) return res.status(404).json({ error: "Template not found" });
    if (tpl.roomId !== shift.roomId) return res.status(403).json({ error: "Template room mismatch" });

    const mode = parsed.data.mode;

    const maxOrder = (shift.stops ?? []).reduce((m, s) => Math.max(m, s.order), 0);
    const rows = (tpl.stops ?? []).map((s) => ({
      shiftId: shift.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      order: mode === "APPEND" ? maxOrder + s.order : s.order,
      type: s.type,
    }));

    await prisma.$transaction(async (tx) => {
      if (mode === "REPLACE") {
        await tx.stop.deleteMany({ where: { shiftId: shift.id } });
      }
      if (rows.length) {
        await tx.stop.createMany({ data: rows });
      }
    });

    await audit(req, {
      action: "SHIFT_TEMPLATE_APPLY",
      entity: "Shift",
      entityId: shift.id,
      meta: { templateId: tpl.id, mode, created: rows.length },
    });

    emitShift(io, shift, "route:plan");
    res.json({ ok: true, mode, created: rows.length });
  });

  // COMPANY/ROOM: reorder stops (only in DRAFT/REQUESTED)
  r.put("/:id/stops/reorder", authRequired(), requireRole("COMPANY", "ROOM"), async (req, res) => {
    const id = Number(req.params.id);
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });

    if (req.user.role === "COMPANY") {
      if (!req.user.companyId || req.user.companyId !== shift.companyId) return res.status(403).json({ error: "Forbidden" });
      if (!isEditableStatus(shift.status)) return res.status(400).json({ error: "Stops can be reordered only in DRAFT/REQUESTED" });
    }
    if (req.user.role === "ROOM") {
      if (req.user.roomId !== shift.roomId) return res.status(403).json({ error: "Forbidden" });
      if (!isEditableStatus(shift.status)) return res.status(400).json({ error: "Stops can be reordered only in DRAFT/REQUESTED" });
    }

    const parsed = reorderSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const stops = shift.stops ?? [];
    if (!stops.length) return res.json({ ok: true, noop: true });

    if (Array.isArray(parsed.data.idsInOrder) && parsed.data.idsInOrder.length) {
      await prisma.$transaction(
        parsed.data.idsInOrder.map((sid, idx) =>
          prisma.stop.update({ where: { id: sid }, data: { order: idx + 1 } })
        )
      );

      await audit(req, {
        action: "SHIFT_STOPS_REORDER",
        entity: "Shift",
        entityId: shift.id,
        meta: { mode: "idsInOrder", count: parsed.data.idsInOrder.length },
      });

      emitShift(io, shift, "route:plan");
      return res.json({ ok: true });
    }

    if (Array.isArray(parsed.data.orders) && parsed.data.orders.length) {
      const ops = [];
      let count = 0;
      for (const o of parsed.data.orders) {
        const sid = o.id ?? o.stopId;
        if (!sid || !o.order) continue;
        count += 1;
        ops.push(prisma.stop.update({ where: { id: sid }, data: { order: o.order } }));
      }
      if (ops.length) await prisma.$transaction(ops);

      await audit(req, {
        action: "SHIFT_STOPS_REORDER",
        entity: "Shift",
        entityId: shift.id,
        meta: { mode: "orders", count },
      });

      emitShift(io, shift, "route:plan");
      return res.json({ ok: true });
    }

    res.json({ ok: true, noop: true });
  });

  // DRIVER: reached stop (progress)
  const reachedHandler = async (req, res) => {
    const id = Number(req.params.id);
    const parsed = reachedSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } }, progress: true, company: true, room: true },
    });
    if (!shift) return res.status(404).json({ error: "Shift not found" });
    if (shift.status !== "ACTIVE") return res.status(400).json({ error: "Shift must be ACTIVE" });

    const driver = await prisma.driver.findFirst({ where: { userId: req.user.id }, select: { id: true } });
    if (!driver) return res.status(400).json({ error: "Driver profile missing" });
    if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });

    const prev = shift.progress?.lastReachedOrder ?? 0;
    const stop = (shift.stops ?? []).find((s) => s.order === parsed.data.order);
    if (!stop) return res.status(404).json({ error: "Stop not found" });

    const next = Math.max(prev, stop.order);
    const now = new Date();

    await prisma.$transaction([
      prisma.stop.update({
        where: { id: stop.id },
        data: { state: "REACHED", reachedAt: now, skippedAt: null },
      }),
      prisma.shiftProgress.upsert({
        where: { shiftId: shift.id },
        update: { lastReachedOrder: next },
        create: { shiftId: shift.id, lastReachedOrder: next },
      }),
    ]);

    await audit(req, {
      action: "SHIFT_STOP_REACHED",
      entity: "Shift",
      entityId: shift.id,
      meta: { stopId: stop.id, order: stop.order, lastReachedOrder: next },
    });

    emitShift(io, shift, "shift:progress", { lastReachedOrder: next, stopId: stop.id });
    res.json({ ok: true, lastReachedOrder: next, stopId: stop.id, state: "REACHED" });
  };

  r.post("/:id/reached", authRequired(), requireRole("DRIVER"), reachedHandler);
  r.post("/:id/stop/reached", authRequired(), requireRole("DRIVER"), reachedHandler);
  r.post("/:id/progress/reached", authRequired(), requireRole("DRIVER"), reachedHandler);

  // =======================
  // M7: Stop suggestions + accept
  // =======================

  // ROOM/COMPANY/SUPER_ADMIN: list suggestions (OPEN requests clustered)
  r.get("/:id/stop-suggestions", authRequired(), requireRole("ROOM", "COMPANY", "SUPER_ADMIN"), async (req, res) => {
    try {
      const shiftId = Number(req.params.id);
      if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

      await getShiftAndCheckScopeOrThrow(shiftId, req.user);

      const radiusM = Number(req.query.radiusM ?? 120);
      const onlyOpen = String(req.query.onlyOpen ?? "1") === "1";

      const { d: Req, latF, lngF, statusF } = await getRequestDelegateOrThrow();

      const where = { shiftId };
      if (onlyOpen) where[statusF] = "OPEN";

      const select = { id: true };
      select[latF] = true;
      select[lngF] = true;

      const reqs = await Req.findMany({ where, select });

      const points = reqs
        .map((x) => ({ id: x.id, lat: Number(x[latF]), lng: Number(x[lngF]) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

      if (!points.length) return res.json({ items: [] });

      const clusters = clusterPoints(points, radiusM);

      const items = clusters
        .map((idxs, k) => {
          const count = idxs.length;
          const lat = idxs.reduce((s, i) => s + points[i].lat, 0) / count;
          const lng = idxs.reduce((s, i) => s + points[i].lng, 0) / count;
          const requestIds = idxs.map((i) => points[i].id);
          return { id: `s-${shiftId}-${k + 1}`, lat, lng, count, requestIds };
        })
        .sort((a, b) => b.count - a.count);

      return res.json({ items });
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // ROOM/SUPER_ADMIN: accept suggestion -> create COMMON stop
  r.post("/:id/stops/from-suggestion", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
    try {
      const shiftId = Number(req.params.id);
      if (!Number.isFinite(shiftId)) return res.status(400).json({ error: "bad shiftId" });

      const shift = await getShiftAndCheckScopeOrThrow(shiftId, req.user);

      if (shift.status === "ACTIVE") {
        return res.status(400).json({ error: "Cannot add stop while shift is ACTIVE" });
      }

      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      const name = String(req.body?.name ?? "COMMON from requests");

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: "lat/lng required" });
      }

      const maxAgg = await prisma.stop.aggregate({
        where: { shiftId },
        _max: { order: true },
      });
      const nextOrder = (maxAgg?._max?.order ?? 0) + 1;

      const stop = await prisma.stop.create({
        data: { shiftId, name, lat, lng, order: nextOrder, type: "COMMON" },
      });

      await audit(req, {
        action: "SHIFT_SUGGESTION_ACCEPT",
        entity: "Shift",
        entityId: shift.id,
        meta: { stopId: stop.id, order: stop.order },
      });

      emitShift(io, shift, "route:plan");
      return res.json({ ok: true, stop });
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // =======================
  // Shift detail (include stops)
  // =======================
  r.get("/:id(\\d+)", authRequired(), requireRole("ROOM", "COMPANY", "DRIVER", "SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        stops: { orderBy: { order: "asc" } },
        progress: true,
        vehicle: true,
        driver: true,
        company: true,
        room: true,
      },
    });

    if (!shift) return res.status(404).json({ error: "Shift not found" });

    // scope check
    if (req.user.role === "ROOM") {
      if (!req.user.roomId || req.user.roomId !== shift.roomId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    if (req.user.role === "COMPANY") {
      if (!req.user.companyId || req.user.companyId !== shift.companyId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    if (req.user.role === "DRIVER") {
      const driver = await prisma.driver.findFirst({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!driver) return res.status(400).json({ error: "Driver profile missing" });
      if (shift.driverId !== driver.id) return res.status(403).json({ error: "Forbidden" });
    }

    return res.json(shift);
  });

  return r;
}