// backend/src/routes/rooms.js
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const createRoomSchema = z.object({
  // M1CHECK body sadece {name} gönderiyor; companyId yoksa first company'yi kullanacağız.
  companyId: z.number().int().optional(),
  name: z.string().trim().min(2),
  status: z.string().trim().optional(),
});

const updateRoomSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    status: z.string().trim().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

function roleOf(req) {
  return String(req.user?.role || req.me?.role || req.auth?.role || "");
}
function companyIdOf(req) {
  const v = req.user?.companyId ?? req.me?.companyId ?? req.auth?.companyId;
  return v == null ? null : Number(v);
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

export function roomsRouter() {
  const r = express.Router();

  // ✅ herkes auth, rol bazlı kontrol route'larda
  r.use(authRequired());

  // ROOM/COMPANY için token'da companyId yoksa roomId'den resolve et
  async function resolveCompanyId(req) {
    const direct = companyIdOf(req);
    if (direct) return direct;

    const rid = roomIdOf(req);
    if (!rid) return null;

    const rm = await prisma.room.findUnique({
      where: { id: rid },
      select: { companyId: true },
    });
    return rm?.companyId ? Number(rm.companyId) : null;
  }

  // LIST (optional ?companyId=)
  // SUPER_ADMIN -> tüm roomlar (opsiyonel companyId filtresi)
  // ROOM/COMPANY -> sadece kendi company roomları (companyId query gelse bile scope dışına çıkamaz)
  r.get("/", requireAnyRole("SUPER_ADMIN", "ROOM", "COMPANY"), async (req, res) => {
    const role = roleOf(req);
    const qCompanyId = req.query.companyId ? Number(req.query.companyId) : null;

    let where = { status: { not: "DELETED" } };

    if (role === "SUPER_ADMIN") {
      if (qCompanyId) where = { ...where, companyId: qCompanyId };
    } else {
      const scopedCompanyId = await resolveCompanyId(req);
      if (!scopedCompanyId) return res.json({ items: [] });

      // scope dışı companyId istense bile kendi company’sini döner
      where = { ...where, companyId: scopedCompanyId };
    }

    const items = await prisma.room.findMany({
      where,
      orderBy: { id: "asc" },
      include: { company: { select: { id: true, name: true } } },
    });

    res.json({ items });
  });

  // READ
  // SUPER_ADMIN -> her şeyi okuyabilir
  // ROOM/COMPANY -> sadece kendi company’sine ait room okuyabilir (aksi 404)
  r.get("/:id", requireAnyRole("SUPER_ADMIN", "ROOM", "COMPANY"), async (req, res) => {
    const id = Number(req.params.id);

    const item = await prisma.room.findUnique({
负责: undefined,
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!item || item.status === "DELETED") return res.status(404).json({ error: "Room not found" });

    const role = roleOf(req);
    if (role !== "SUPER_ADMIN") {
      const scopedCompanyId = await resolveCompanyId(req);
      if (!scopedCompanyId || Number(item.companyId) !== Number(scopedCompanyId)) {
        // bilgi sızdırmamak için 403 yerine 404
        return res.status(404).json({ error: "Room not found" });
      }
    }

    res.json(item);
  });

  // CREATE (SUPER_ADMIN only)
  r.post("/", requireRole("SUPER_ADMIN"), async (req, res) => {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    let companyId = parsed.data.companyId ?? null;
    if (!companyId) {
      const first = await prisma.company.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
      if (!first) return res.status(400).json({ error: "No company exists. Create company first." });
      companyId = first.id;
    }

    const item = await prisma.room.create({
      data: {
        companyId,
        name: parsed.data.name,
        status: parsed.data.status ?? "ACTIVE",
      },
    });

    res.status(201).json(item);
  });

  // UPDATE (SUPER_ADMIN only)
  r.put("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.room.update({
      where: { id },
      data: parsed.data,
    });

    res.json(item);
  });

  // SOFT DELETE (SUPER_ADMIN only)
  r.delete("/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
    const id = Number(req.params.id);

    const item = await prisma.room.update({
      where: { id },
      data: { status: "DELETED" },
    });

    res.json(item);
  });

  return r;
}