// backend/src/routes/rooms.js
// Room = servis sağlayan (operator) organizasyon.
// Company (kiralayan) ile bağ: Agreement üzerinden kurulmalı (room.companyId yok).
//
// M22: Company için "Room Directory" (search + hasHub filter)
// M36+: regionId/district + profile fields + region include for UI

import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { resolveRoomOwnership } from "../region/index.js";

function roleOf(req) {
  return String(req.user?.role || req.me?.role || req.auth?.role || "");
}
function roomIdOf(req) {
  const v = req.user?.roomId ?? req.me?.roomId ?? req.auth?.roomId;
  return v == null ? null : Number(v);
}
function companyIdOf(req) {
  const v = req.user?.companyId ?? req.me?.companyId ?? req.auth?.companyId;
  return v == null ? null : Number(v);
}
function requireAnyRole(...roles) {
  return (req, res, next) => {
    const role = roleOf(req);
    if (roles.includes(role)) return next();
    return res.status(403).json({ error: "Forbidden" });
  };
}
function truthy(v) {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

const zRegionId = z.preprocess(
  (v) => (v == null || v === "" ? null : Number(v)),
  z.number().int().positive().nullable()
);

const zOptStr = z.preprocess(
  (v) => (v == null || String(v).trim() === "" ? null : String(v).trim()),
  z.string().min(1).nullable()
);

const zOptEmail = z.preprocess(
  (v) => (v == null || String(v).trim() === "" ? null : String(v).trim().toLowerCase()),
  z.string().email().nullable()
);

// CREATE: allow optional hub on create + optional region/profile fields
const createRoomSchema = z
  .object({
    name: z.string().trim().min(2),
    status: z.string().trim().optional(),
    regionId: zRegionId.optional(),
    district: zOptStr.optional(),
    hubLat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
    hubLng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
    // profile
    addressLine: zOptStr.optional(),
    contactName: zOptStr.optional(),
    contactPhone: zOptStr.optional(),
    contactEmail: zOptEmail.optional(),
    notes: zOptStr.optional(),
  })
  .refine(
    (v) => {
      const hasLat = Object.prototype.hasOwnProperty.call(v, "hubLat");
      const hasLng = Object.prototype.hasOwnProperty.call(v, "hubLng");
      if (!hasLat && !hasLng) return true;
      if (hasLat !== hasLng) return false;
      const a = v.hubLat;
      const b = v.hubLng;
      if (a == null && b == null) return true;
      if (a == null || b == null) return false;
      if (a < -90 || a > 90) return false;
      if (b < -180 || b > 180) return false;
      return true;
    },
    { message: "hubLat+hubLng birlikte olmalı ve range valid olmalı" }
  );

const updateRoomSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    status: z.string().trim().optional(),
    regionId: zRegionId.optional(),
    district: zOptStr.optional(),
    // profile
    addressLine: zOptStr.optional(),
    contactName: zOptStr.optional(),
    contactPhone: zOptStr.optional(),
    contactEmail: zOptEmail.optional(),
    notes: zOptStr.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

// ✅ M19: worksite hub update (lat/lng pair; allow null to clear)
const updateHubSchema = z
  .object({
    hubLat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()),
    hubLng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()),
  })
  .refine(
    (v) => {
      const a = v.hubLat;
      const b = v.hubLng;
      if (a == null && b == null) return true;
      if (a == null || b == null) return false;
      if (a < -90 || a > 90) return false;
      if (b < -180 || b > 180) return false;
      return true;
    },
    { message: "hubLat+hubLng birlikte olmalı ve range valid olmalı" }
  );

export function roomsRouter() {
  const r = express.Router();
  r.use(authRequired());

  // LIST
  // SUPER_ADMIN -> tüm roomlar (filters allowed)
  // COMPANY -> room directory (region enforced if company has regionId)
  // ROOM -> sadece kendi room'u
  //
  // Query:
  //  - ?q=term
  //  - ?hasHub=1
  //  - ?take=200
  //  - ?regionId=1 (SUPER_ADMIN only)
  //  - ?district=... (SUPER_ADMIN only)
  r.get("/", requireAnyRole("SUPER_ADMIN", "ROOM", "COMPANY"), async (req, res) => {
    const role = roleOf(req);
    const take = Math.min(500, Math.max(1, Number(req.query.take || 200)));

    // ROOM: only own room (ignore filters)
    if (role === "ROOM") {
      const rid = roomIdOf(req);
      if (!rid) return res.json({ items: [] });
      const item = await prisma.room.findUnique({
        where: { id: rid },
        include: { region: { select: { id: true, name: true } } },
      });
      if (!item || item.status === "DELETED") return res.json({ items: [] });
      return res.json({
        items: [
          {
            ...item,
            regionOwnership: resolveRoomOwnership(item),
          },
        ],
      });
    }

    const q = String(req.query.q || "").trim();
    const hasHub = truthy(req.query.hasHub);

    const where = {
      status: { not: "DELETED" },
      ...(q
        ? {
            name: { contains: q, mode: "insensitive" },
          }
        : {}),
      ...(hasHub
        ? {
            hubLat: { not: null },
            hubLng: { not: null },
          }
        : {}),
    };

    // SUPER_ADMIN filters
    if (role === "SUPER_ADMIN") {
      const regionId = req.query.regionId == null || req.query.regionId === "" ? null : Number(req.query.regionId);
      const district = String(req.query.district || "").trim();
      if (!Number.isNaN(regionId) && regionId != null) where.regionId = regionId;
      if (district) where.district = { contains: district, mode: "insensitive" };
    }

    // COMPANY: only rooms in the same region
    if (role === "COMPANY") {
      const cid = companyIdOf(req);
      if (cid) {
        const c = await prisma.company.findUnique({ where: { id: cid }, select: { regionId: true } });
        const rId = c?.regionId ?? null;
        if (rId != null) {
          where.regionId = rId;
        }
      }
    }

    const items = await prisma.room.findMany({
      where,
      take,
      include: { region: { select: { id: true, name: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return res.json({
      items: items.map((item) => ({
        ...item,
        regionOwnership: resolveRoomOwnership(item),
      })),
    });
  });

  // READ
  // SUPER_ADMIN/COMPANY -> any
  // ROOM -> only own room
  r.get("/:id", requireAnyRole("SUPER_ADMIN", "ROOM", "COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.room.findUnique({
      where: { id },
      include: { region: { select: { id: true, name: true } } },
    });
    if (!item || item.status === "DELETED") return res.status(404).json({ error: "Room not found" });

    const role = roleOf(req);
    if (role === "ROOM") {
      const rid = roomIdOf(req);
      if (!rid || Number(rid) !== Number(id)) {
        return res.status(404).json({ error: "Room not found" });
      }
    }

    return res.json({
      ...item,
      regionOwnership: resolveRoomOwnership(item),
    });
  });

  // CREATE (SUPER_ADMIN only)
  r.post("/", requireRole("SUPER_ADMIN"), async (req, res) => {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = {
      name: parsed.data.name,
      status: parsed.data.status ?? "ACTIVE",
      regionId: Object.prototype.hasOwnProperty.call(parsed.data, "regionId") ? parsed.data.regionId : null,
      district: Object.prototype.hasOwnProperty.call(parsed.data, "district") ? parsed.data.district : null,
      hubLat: Object.prototype.hasOwnProperty.call(parsed.data, "hubLat") ? parsed.data.hubLat : null,
      hubLng: Object.prototype.hasOwnProperty.call(parsed.data, "hubLng") ? parsed.data.hubLng : null,
      addressLine: Object.prototype.hasOwnProperty.call(parsed.data, "addressLine") ? parsed.data.addressLine : null,
      contactName: Object.prototype.hasOwnProperty.call(parsed.data, "contactName") ? parsed.data.contactName : null,
      contactPhone: Object.prototype.hasOwnProperty.call(parsed.data, "contactPhone") ? parsed.data.contactPhone : null,
      contactEmail: Object.prototype.hasOwnProperty.call(parsed.data, "contactEmail") ? parsed.data.contactEmail : null,
      notes: Object.prototype.hasOwnProperty.call(parsed.data, "notes") ? parsed.data.notes : null,
    };

    const item = await prisma.room.create({
      data,
      include: { region: { select: { id: true, name: true } } },
    });

    // DEV/DEMO convenience:
    if ((process.env.NODE_ENV ?? "development") !== "production") {
      await prisma.user.updateMany({
        where: { email: "room@demo.com", role: "ROOM", roomId: null },
        data: { roomId: item.id },
      });
    }

    return res.status(201).json({
      ...item,
      regionOwnership: resolveRoomOwnership(item),
    });
  });

  // UPDATE (SUPER_ADMIN only)
  r.put("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.room.update({
      where: { id },
      data: parsed.data,
      include: { region: { select: { id: true, name: true } } },
    });
    return res.json(item);
  });

  // ✅ M19: HUB UPDATE
  r.put("/:id/hub", requireAnyRole("SUPER_ADMIN", "ROOM"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateHubSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.room.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!item || item.status === "DELETED") return res.status(404).json({ error: "Room not found" });

    const role = roleOf(req);
    if (role === "ROOM") {
      const rid = roomIdOf(req);
      if (!rid || Number(rid) !== Number(id)) return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await prisma.room.update({
      where: { id },
      data: { hubLat: parsed.data.hubLat, hubLng: parsed.data.hubLng },
    });

    return res.json({ ok: true, id: updated.id, hubLat: updated.hubLat, hubLng: updated.hubLng });
  });

  // SOFT DELETE (SUPER_ADMIN only)
  r.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.room.update({ where: { id }, data: { status: "DELETED" } });
    return res.json(item);
  });

  return r;
}
