
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const planSchema = z.object({
  name: z.string().min(2).max(120),
  eventDate: z.string().optional().nullable(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.enum(["DRAFT", "READY", "PUBLISHED"]).optional(),
  direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
  hubLat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  hubLng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  note: z.string().max(500).optional().nullable(),
});

const stopSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(2).max(120),
  address: z.string().max(250).optional().nullable(),
  lat: z.number(),
  lng: z.number(),
  orderHint: z.number().int().min(1),
  passengerCount: z.number().int().min(1).max(999).optional(),
  windowStartMin: z.number().int().min(0).max(1439).optional().nullable(),
  windowEndMin: z.number().int().min(0).max(1439).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

async function ensureOrg(req, res, next) {
  if (req.user?.role !== "COMPANY") return res.status(403).json({ error: "COMPANY_REQUIRED" });
  if (req.user?.companyId == null) return res.status(400).json({ error: "COMPANY_SCOPE_REQUIRED" });
  try {
    const c = await prisma.company.findUnique({ where: { id: Number(req.user.companyId) }, select: { kind: true } });
    if (!c || c.kind !== "ORGANIZATION") return res.status(403).json({ error: "ORGANIZATION_ONLY" });
    next();
  } catch (e) {
    res.status(500).json({ error: "ORG_SCOPE_FAILED", detail: String(e?.message || e) });
  }
}

export function organizationPlansRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY"), ensureOrg);

  r.get('/plans', async (req, res) => {
    const items = await prisma.organizationPlan.findMany({
      where: { companyId: Number(req.user.companyId) },
      include: { stops: { orderBy: { orderHint: 'asc' } }, _count: { select: { shifts: true, stops: true } } },
      orderBy: [{ eventDate: 'asc' }, { id: 'desc' }],
    });
    res.json({ items });
  });

  r.post('/plans', async (req, res) => {
    const body = planSchema.parse(req.body || {});
    const item = await prisma.organizationPlan.create({
      data: {
        companyId: Number(req.user.companyId),
        name: body.name,
        eventDate: body.eventDate ? new Date(body.eventDate) : null,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        status: body.status || 'DRAFT',
        direction: body.direction || 'OUTBOUND',
        hubLat: body.hubLat ?? null,
        hubLng: body.hubLng ?? null,
        note: body.note ?? null,
      },
    });
    res.json({ ok: true, item });
  });

  r.put('/plans/:id', async (req, res) => {
    const body = planSchema.partial().parse(req.body || {});
    const id = Number(req.params.id);
    const found = await prisma.organizationPlan.findUnique({ where: { id } });
    if (!found || found.companyId !== Number(req.user.companyId)) return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
    const item = await prisma.organizationPlan.update({
      where: { id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(body.eventDate !== undefined ? { eventDate: body.eventDate ? new Date(body.eventDate) : null } : {}),
        ...(body.startAt != null ? { startAt: new Date(body.startAt) } : {}),
        ...(body.endAt != null ? { endAt: new Date(body.endAt) } : {}),
        ...(body.status != null ? { status: body.status } : {}),
        ...(body.direction != null ? { direction: body.direction } : {}),
        ...(body.hubLat !== undefined ? { hubLat: body.hubLat } : {}),
        ...(body.hubLng !== undefined ? { hubLng: body.hubLng } : {}),
        ...(body.note !== undefined ? { note: body.note ?? null } : {}),
      },
    });
    res.json({ ok: true, item });
  });

  r.post('/plans/:id/stops/upsert', async (req, res) => {
    const id = Number(req.params.id);
    const plan = await prisma.organizationPlan.findUnique({ where: { id }, select: { id: true, companyId: true } });
    if (!plan || plan.companyId !== Number(req.user.companyId)) return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
    const items = z.array(stopSchema).min(1).parse(req.body?.items || []);
    const out = [];
    for (const it of items) {
      if (it.id) {
        const row = await prisma.organizationStop.update({
          where: { id: it.id },
          data: { name: it.name, address: it.address ?? null, lat: it.lat, lng: it.lng, orderHint: it.orderHint, passengerCount: it.passengerCount ?? 1, windowStartMin: it.windowStartMin ?? null, windowEndMin: it.windowEndMin ?? null, note: it.note ?? null },
        });
        out.push(row);
      } else {
        const row = await prisma.organizationStop.create({
          data: { planId: id, name: it.name, address: it.address ?? null, lat: it.lat, lng: it.lng, orderHint: it.orderHint, passengerCount: it.passengerCount ?? 1, windowStartMin: it.windowStartMin ?? null, windowEndMin: it.windowEndMin ?? null, note: it.note ?? null },
        });
        out.push(row);
      }
    }
    res.json({ ok: true, items: out });
  });

  r.delete('/plans/:id/stops/:stopId', async (req, res) => {
    const id = Number(req.params.id);
    const stopId = Number(req.params.stopId);
    const stop = await prisma.organizationStop.findUnique({ where: { id: stopId }, include: { plan: true } });
    if (!stop || stop.planId !== id || stop.plan.companyId !== Number(req.user.companyId)) return res.status(404).json({ error: 'STOP_NOT_FOUND' });
    await prisma.organizationStop.delete({ where: { id: stopId } });
    res.json({ ok: true });
  });

  r.post('/plans/:id/publish-draft', async (req, res) => {
    const id = Number(req.params.id);
    const plan = await prisma.organizationPlan.findUnique({ where: { id }, include: { stops: { orderBy: { orderHint: 'asc' } } } });
    if (!plan || plan.companyId !== Number(req.user.companyId)) return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
    if (!plan.stops.length) return res.status(400).json({ error: 'PLAN_HAS_NO_STOPS' });
    const shift = await prisma.shift.create({
      data: {
        companyId: Number(req.user.companyId),
        startAt: plan.startAt,
        endAt: plan.endAt,
        status: 'DRAFT',
        direction: plan.direction,
        hubLat: plan.hubLat ?? null,
        hubLng: plan.hubLng ?? null,
        organizationPlanId: plan.id,
      },
    });
    await prisma.stop.createMany({
      data: plan.stops.map((s, idx) => ({ shiftId: shift.id, name: s.name, lat: s.lat, lng: s.lng, order: idx + 1, type: 'MANUAL' })),
    });
    await prisma.organizationPlan.update({ where: { id: plan.id }, data: { status: 'PUBLISHED' } });
    res.json({ ok: true, shiftId: shift.id });
  });

  return r;
}
