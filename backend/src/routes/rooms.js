// backend/src/routes/rooms.js
// Room = servis sağlayan (operator) organizasyon.
// Company (kiralayan) ile bağ: Agreement üzerinden kurulmalı (room.companyId yok).
//
// M22: Company için "Room Directory" (search + hasHub filter)

import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

function roleOf(req) {
  return String(req.user?.role || req.me?.role || req.auth?.role || "");
}
function roomIdOf(req) {
  const v = req.user?.roomId ?? req.me?.roomId ?? req.auth?.roomId;
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

// CREATE: allow optional hub on create
const createRoomSchema = z
  .object({
    name: z.string().trim().min(2),
    status: z.string().trim().optional(),
    hubLat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
    hubLng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
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

  // ✅ auth required
  r.use(authRequired());

  // LIST
  // SUPER_ADMIN -> tüm roomlar
  // COMPANY -> tüm aktif roomlar (directory)
  // ROOM -> sadece kendi room'u
  //
  // M22 query:
  //  - ?q=term (name contains, insensitive)
  //  - ?hasHub=1  (hubLat+hubLng not null)
  //  - ?take=200
  r.get("/", requireAnyRole("SUPER_ADMIN", "ROOM", "COMPANY"), async (req, res) => {
    const role = roleOf(req);
    const take = Math.min(500, Math.max(1, Number(req.query.take || 200)));

    // ROOM: only own room (ignore filters)
    if (role === "ROOM") {
      const rid = roomIdOf(req);
      if (!rid) return res.json({ items: [] });
      const item = await prisma.room.findUnique({ where: { id: rid } });
      if (!item || item.status === "DELETED") return res.json({ items: [] });
      return res.json({ items: [item] });
    }

    const q = String(req.query.q || "").trim();
    const hasHub = truthy(req.query.hasHub);

    const where = {
      status: { not: "DELETED" },
      ...(q
        ? {
            name: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
      ...(hasHub
        ? {
            hubLat: { not: null },
            hubLng: { not: null },
          }
        : {}),
    };

    const items = await prisma.room.findMany({
      where,
      take,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return res.json({ items });
  });

  // READ
  // SUPER_ADMIN/COMPANY -> any
  // ROOM -> only own room
  r.get("/:id", requireAnyRole("SUPER_ADMIN", "ROOM", "COMPANY"), async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.room.findUnique({ where: { id } });
    if (!item || item.status === "DELETED") return res.status(404).json({ error: "Room not found" });

    const role = roleOf(req);
    if (role === "ROOM") {
      const rid = roomIdOf(req);
      if (!rid || Number(rid) !== Number(id)) {
        // info sızdırmamak için 404
        return res.status(404).json({ error: "Room not found" });
      }
    }

    return res.json(item);
  });

  // CREATE (SUPER_ADMIN only)
  r.post("/", requireRole("SUPER_ADMIN"), async (req, res) => {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.room.create({
      data: {
        name: parsed.data.name,
        status: parsed.data.status ?? "ACTIVE",
        hubLat: Object.prototype.hasOwnProperty.call(parsed.data, "hubLat") ? parsed.data.hubLat : null,
        hubLng: Object.prototype.hasOwnProperty.call(parsed.data, "hubLng") ? parsed.data.hubLng : null,
      },
    });

    // DEV/DEMO convenience:
    // demo ROOM user'unu sadece ilk kez room'a bağla (override etme)
    if (process.env.NODE_ENV !== "production") {
      await prisma.user.updateMany({
        where: { email: "room@demo.com", role: "ROOM", roomId: null },
        data: { roomId: item.id },
      });
    }

    return res.status(201).json(item);
  });

  // UPDATE (SUPER_ADMIN only)
  r.put("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.room.update({ where: { id }, data: parsed.data });
    return res.json(item);
  });

  // ✅ M19: HUB UPDATE
  // SUPER_ADMIN -> any room
  // ROOM -> only own room (id must match token roomId)
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
