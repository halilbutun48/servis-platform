// backend/src/routes/companyPersonels.js
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { decorateGeoItem, inferGeoState } from "../services/geoState.js";

const qGeoStatusSchema = z.string().trim().min(1).optional();
const qKindSchema = z.enum(["PERSONEL", "STUDENT"]).optional();

const nullableFiniteNumberSchema = z.preprocess(
  (v) => (v == null || v === "" ? null : Number(v)),
  z.number().finite().nullable()
);

const putLocationSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.preprocess((v) => {
    const s = String(v ?? "").trim();
    return s || null;
  }, z.string().max(40).nullable()).optional(),
  homeAddress: z.preprocess((v) => {
    const s = String(v ?? "").trim();
    return s || null;
  }, z.string().max(240).nullable()).optional(),
  lat: nullableFiniteNumberSchema.optional(),
  lng: nullableFiniteNumberSchema.optional(),
  geoManualOverride: z.boolean().optional(),
  geoStatus: z.enum(["OK", "NEEDS_REVIEW", "FAILED"]).optional(),
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

    const decorated = items.map(decorateGeoItem).filter((item) => !geoStatus || item.geoStatus === geoStatus);
    res.json({ ok: true, items: decorated });
  });

  // PUT /api/company/personels/:id/location
  r.put("/:id/location", async (req, res) => {
    const u = req.user;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "badId" });

    const body = putLocationSchema.parse(req.body ?? {});

    const existing = await prisma.personel.findFirst({
      where: { id, companyId: u.companyId ?? -1 },
      select: {
        id: true,
        fullName: true,
        phone: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        geoStatus: true,
        geoManualOverride: true,
        geoNote: true,
      },
    });
    if (!existing) return res.status(404).json({ ok: false, error: "notFound" });

    const nextFullName = body.fullName ?? existing.fullName;
    const nextPhone = Object.prototype.hasOwnProperty.call(body, "phone") ? body.phone : existing.phone;
    const nextAddress = Object.prototype.hasOwnProperty.call(body, "homeAddress") ? body.homeAddress : existing.homeAddress;
    const nextLat = Object.prototype.hasOwnProperty.call(body, "lat") ? body.lat : existing.homeLat;
    const nextLng = Object.prototype.hasOwnProperty.call(body, "lng") ? body.lng : existing.homeLng;
    const nextManualOverride = body.geoManualOverride ?? existing.geoManualOverride;
    const nextStatus = body.geoStatus ?? existing.geoStatus;

    const geoMeta = inferGeoState({
      homeAddress: nextAddress,
      homeLat: nextLat,
      homeLng: nextLng,
      geoManualOverride: nextManualOverride,
      geoStatus: nextStatus,
      geoNote: nextManualOverride ? "MANUAL_OVERRIDE" : existing.geoNote,
    });

    const updated = await prisma.personel.update({
      where: { id },
      data: {
        fullName: nextFullName,
        phone: nextPhone,
        homeAddress: nextAddress,
        homeLat: nextLat,
        homeLng: nextLng,
        geoManualOverride: Boolean(nextManualOverride),
        geoStatus: geoMeta.geoStatus,
        geoNote: geoMeta.geoReason,
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

    res.json({ ok: true, item: decorateGeoItem(updated) });
  });

  return r;
}
