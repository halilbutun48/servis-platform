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

const updateRoomSchema = z.object({
  name: z.string().trim().min(2).optional(),
  status: z.string().trim().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export function roomsRouter() {
  const r = express.Router();

  // SUPER_ADMIN only (M1 için)
  r.use(authRequired(), requireRole("SUPER_ADMIN"));

  // LIST (optional ?companyId=)
  r.get("/", async (req, res) => {
    const companyId = req.query.companyId ? Number(req.query.companyId) : null;

    const items = await prisma.room.findMany({
      where: companyId ? { companyId, status: { not: "DELETED" } } : { status: { not: "DELETED" } },
      orderBy: { id: "asc" },
      include: { company: { select: { id: true, name: true } } },
    });

    res.json({ items });
  });

  // CREATE
  r.post("/", async (req, res) => {
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

  // READ
  r.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.room.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!item) return res.status(404).json({ error: "Room not found" });
    res.json(item);
  });

  // UPDATE
  r.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.room.update({
      where: { id },
      data: parsed.data,
    });

    res.json(item);
  });

  // SOFT DELETE
  r.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const item = await prisma.room.update({
      where: { id },
      data: { status: "DELETED" },
    });

    res.json(item);
  });

  return r;
}
