// backend/src/routes/companyPersonels.js
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const qGeoStatusSchema = z.string().trim().min(1).optional();
const qKindSchema = z.enum(["PERSONEL", "STUDENT"]).optional();

const putLocationSchema = z.object({
  lat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite()),
  lng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite()),
  geoManualOverride: z.boolean().optional().default(true),
  geoStatus: z.enum(["OK", "NEEDS_REVIEW", "FAILED"]).optional().default("OK"),
});

export function companyPersonelsRouter() {
  const r = express.Router();

  // COMPANY scope only
  r.use(authRequired(), requireRole("COMPANY"));

  // GET /api/company/personels?geoStatus=NEEDS_REVIEW
  r.get("/", async (req, res) => {
    const u = req.user;
    const geoStatus = qGeoStatusSchema.parse(req.query.geoStatus);
    const kind = qKindSchema.parse((req.query.kind || undefined) ? String(req.query.kind).toUpperCase() : undefined);

    const where = { companyId: u.companyId ?? -1 };
    if (geoStatus) where.geoStatus = geoStatus;
    if (kind) where.kind = kind;

    const items = await prisma.personel.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        kind: true,
        fullName: true,
        phone: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        geoStatus: true,
        geoManualOverride: true,
        geoNote: true,
        geoUpdatedAt: true,
      },
    });

    res.json({ ok: true, items });
  });

  // PUT /api/company/personels/:id/location
  r.put("/:id/location", async (req, res) => {
    const u = req.user;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "badId" });

    const body = putLocationSchema.parse(req.body ?? {});

    const existing = await prisma.personel.findFirst({
      where: { id, companyId: u.companyId ?? -1 },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ ok: false, error: "notFound" });

    const updated = await prisma.personel.update({
      where: { id },
      data: {
        homeLat: body.lat,
        homeLng: body.lng,
        geoManualOverride: Boolean(body.geoManualOverride),
        geoStatus: body.geoStatus,
        geoUpdatedAt: new Date(),
      },
      select: {
        id: true,
        kind: true,
        fullName: true,
        phone: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        geoStatus: true,
        geoManualOverride: true,
        geoNote: true,
        geoUpdatedAt: true,
      },
    });

    res.json({ ok: true, item: updated });
  });

  return r;
}
