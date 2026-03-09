// backend/src/routes/routeTemplates.js (M8)
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const createTemplateSchema = z.object({
  // ROOM rolünde roomId body'den alınmaz; SUPER_ADMIN için opsiyonel destek
  roomId: z.number().int().positive().optional(),
  name: z.string().trim().min(2),
  status: z.string().trim().optional(), // "ACTIVE"/"PASSIVE" gibi
});

const updateTemplateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    status: z.string().trim().optional(),
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

// M6 contract ile birebir aynı
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

async function getTemplateOrThrow(templateId) {
  const t = await prisma.routeTemplate.findUnique({
    where: { id: templateId },
    include: { stops: { orderBy: { order: "asc" } } },
  });
  if (!t) {
    const e = new Error("Template not found");
    e.status = 404;
    throw e;
  }
  return t;
}

function assertTemplateScopeOrThrow(template, user) {
  // SUPER_ADMIN her şeyi görür
  if (user.role === "SUPER_ADMIN") return;

  // ROOM sadece kendi roomId
  if (user.role === "ROOM") {
    if (!user.roomId || user.roomId !== template.roomId) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    return;
  }

  // Bu router minimal: sadece ROOM/SUPER_ADMIN
  const e = new Error("Forbidden");
  e.status = 403;
  throw e;
}

export function routeTemplatesRouter() {
  const r = express.Router();

  // Minimal scope: ROOM + SUPER_ADMIN
  r.use(authRequired(), requireRole("ROOM", "SUPER_ADMIN"));

  // LIST
  // ROOM -> kendi roomId
  // SUPER_ADMIN -> ?roomId= ile filtre opsiyonel
  r.get("/", async (req, res) => {
    const u = req.user;
    const includePassive = String(req.query.includePassive ?? "0") === "1";

    let roomId = null;
    if (u.role === "ROOM") {
      if (!u.roomId) return res.json({ items: [] });
      roomId = u.roomId;
    } else if (u.role === "SUPER_ADMIN" && req.query.roomId) {
      roomId = Number(req.query.roomId);
    }

    const where = {};
    if (roomId) where.roomId = roomId;
    if (!includePassive) where.status = { not: "PASSIVE" };

    const items = await prisma.routeTemplate.findMany({
      where,
      orderBy: { id: "asc" },
      include: { stops: { orderBy: { order: "asc" } } },
    });

    res.json({ items });
  });

  // CREATE
  r.post("/", async (req, res) => {
    const u = req.user;
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    let roomId = null;

    if (u.role === "ROOM") {
      if (!u.roomId) return res.status(400).json({ error: "ROOM must have roomId" });
      roomId = u.roomId;
    } else {
      // SUPER_ADMIN
      roomId = parsed.data.roomId ?? null;
      if (!roomId) {
        const first = await prisma.room.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
        if (!first) return res.status(400).json({ error: "No room exists. Create room first." });
        roomId = first.id;
      }
    }

    const item = await prisma.routeTemplate.create({
      data: {
        roomId,
        name: parsed.data.name,
        status: parsed.data.status ?? "ACTIVE",
      },
      include: { stops: { orderBy: { order: "asc" } } },
    });

    res.status(201).json(item);
  });

  // UPDATE
  r.put("/:id(\\d+)", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = updateTemplateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const t = await getTemplateOrThrow(id);
      assertTemplateScopeOrThrow(t, req.user);

      const updated = await prisma.routeTemplate.update({
        where: { id },
        data: parsed.data,
        include: { stops: { orderBy: { order: "asc" } } },
      });

      res.json(updated);
    } catch (e) {
      res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // SOFT DELETE => status=PASSIVE
  r.delete("/:id(\\d+)", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const t = await getTemplateOrThrow(id);
      assertTemplateScopeOrThrow(t, req.user);

      const updated = await prisma.routeTemplate.update({
        where: { id },
        data: { status: "PASSIVE" },
      });

      res.json(updated);
    } catch (e) {
      res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // ADD STOP
  r.post("/:id(\\d+)/stops", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const t = await getTemplateOrThrow(id);
      assertTemplateScopeOrThrow(t, req.user);

      const parsed = addStopSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const stops = t.stops ?? [];
      const maxOrder = stops.reduce((m, s) => Math.max(m, s.order), 0);
      const order = parsed.data.order ?? maxOrder + 1;

      if (stops.some((s) => s.order === order)) {
        return res.status(400).json({ error: "Stop order already exists" });
      }

      const stop = await prisma.routeTemplateStop.create({
        data: {
          routeTemplateId: t.id,
          name: parsed.data.name,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          order,
          type: parsed.data.type ?? "COMMON",
        },
      });

      res.json({ ok: true, stop });
    } catch (e) {
      res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // UPDATE STOP
  r.put("/:id(\\d+)/stops/:stopId(\\d+)", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const stopId = Number(req.params.stopId);

      const t = await getTemplateOrThrow(id);
      assertTemplateScopeOrThrow(t, req.user);

      const parsed = updateStopSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const stop = (t.stops ?? []).find((s) => s.id === stopId);
      if (!stop) return res.status(404).json({ error: "Stop not found" });

      if (parsed.data.order && parsed.data.order !== stop.order) {
        if ((t.stops ?? []).some((s) => s.order === parsed.data.order)) {
          return res.status(400).json({ error: "Stop order already exists" });
        }
      }

      const updated = await prisma.routeTemplateStop.update({
        where: { id: stopId },
        data: parsed.data,
      });

      res.json({ ok: true, stop: updated });
    } catch (e) {
      res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // DELETE STOP
  r.delete("/:id(\\d+)/stops/:stopId(\\d+)", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const stopId = Number(req.params.stopId);

      const t = await getTemplateOrThrow(id);
      assertTemplateScopeOrThrow(t, req.user);

      const stop = (t.stops ?? []).find((s) => s.id === stopId);
      if (!stop) return res.status(404).json({ error: "Stop not found" });

      await prisma.routeTemplateStop.delete({ where: { id: stopId } });

      res.json({ ok: true });
    } catch (e) {
      res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  // REORDER STOPS (M6 contract)
  r.put("/:id(\\d+)/stops/reorder", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const t = await getTemplateOrThrow(id);
      assertTemplateScopeOrThrow(t, req.user);

      const parsed = reorderSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const stops = t.stops ?? [];
      if (!stops.length) return res.json({ ok: true, noop: true });

      // A) idsInOrder: [stopId...]
      if (Array.isArray(parsed.data.idsInOrder) && parsed.data.idsInOrder.length) {
        const ids = parsed.data.idsInOrder;
        const uniq = new Set(ids);

        // güvenli: aynı template'in tüm stopları mı?
        if (uniq.size !== ids.length) return res.status(400).json({ error: "idsInOrder must be unique" });

        const allIds = new Set(stops.map((s) => s.id));
        if (ids.length !== allIds.size) return res.status(400).json({ error: "idsInOrder must include all stops" });
        for (const sid of ids) {
          if (!allIds.has(sid)) return res.status(400).json({ error: "idsInOrder contains foreign stopId" });
        }

        // 2-pass reorder to avoid @@unique(routeTemplateId, order) collisions
const OFFSET = 1000;

await prisma.$transaction(async (tx) => {
  // pass-1: move to temporary unique range
  for (let i = 0; i < ids.length; i++) {
    const sid = ids[i];
    await tx.routeTemplateStop.update({
      where: { id: sid },
      data: { order: OFFSET + i + 1 },
    });
  }

  // pass-2: set final 1..N
  for (let i = 0; i < ids.length; i++) {
    const sid = ids[i];
    await tx.routeTemplateStop.update({
      where: { id: sid },
      data: { order: i + 1 },
    });
  }
});

        return res.json({ ok: true });
      }

      // B) orders: [{id/stopId, order}]
      if (Array.isArray(parsed.data.orders) && parsed.data.orders.length) {
        const allIds = new Set(stops.map((s) => s.id));
        const ops = [];

        for (const o of parsed.data.orders) {
          const sid = o.id ?? o.stopId;
          if (!sid || !o.order) continue;
          if (!allIds.has(sid)) return res.status(400).json({ error: "orders contains foreign stopId" });
          ops.push(prisma.routeTemplateStop.update({ where: { id: sid }, data: { order: o.order } }));
        }

        if (ops.length) await prisma.$transaction(ops);
        return res.json({ ok: true });
      }

      res.json({ ok: true, noop: true });
    } catch (e) {
      res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  return r;
}