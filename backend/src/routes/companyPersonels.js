// backend/src/routes/companyPersonels.js
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { decorateGeoItem, inferGeoState } from "../services/geoState.js";
import { clearResponseCache, rememberResponse } from "../utils/responseCache.js";

const qGeoStatusSchema = z.string().trim().min(1).optional();
const qKindSchema = z.enum(["PERSONEL", "STUDENT"]).optional();
const qSearchSchema = z.string().trim().max(120).optional();
const qTakeSchema = z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().int().min(1).max(500).nullable()).optional();

const nullableFiniteNumberSchema = z.preprocess(
  (v) => (v == null || v === "" ? null : Number(v)),
  z.number().finite().nullable()
);

const bulkClearSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).max(5000).optional(),
  fields: z.array(z.enum(["phone", "address"]))
    .min(1)
    .max(2),
});

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


function clearCompanyPersonelsCache(user) {
  clearResponseCache(`company-personels:${user?.companyId ?? -1}:`, {
    role: user?.role,
    companyId: user?.companyId,
    userId: user?.id,
  });
}

export function companyPersonelsRouter() {
  const r = express.Router();

  // COMPANY scope only
  r.use(authRequired(), requireRole("COMPANY"));

  // GET /api/company/personels?geoStatus=NEEDS_REVIEW
  r.get("/", async (req, res) => {
    const u = req.user;
    const geoStatus = qGeoStatusSchema.parse(req.query.geoStatus);
    const kind = qKindSchema.parse((req.query.kind || undefined) ? String(req.query.kind).toUpperCase() : undefined);
    const q = qSearchSchema.parse(req.query.q);
    const take = qTakeSchema.parse(req.query.take) ?? 200;

    const where = { companyId: u.companyId ?? -1 };
    if (geoStatus) where.geoStatus = geoStatus;
    if (kind) where.kind = kind;
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { homeAddress: { contains: q, mode: "insensitive" } },
      ];
    }

    const cacheKey = `company-personels:${u.companyId ?? -1}:${geoStatus || "all"}:${kind || "all"}:${q || "-"}:${take}`;
    const payload = await rememberResponse(cacheKey, async () => {
      const items = await prisma.personel.findMany({
        where,
        take,
        orderBy: [{ geoStatus: "desc" }, { id: "asc" }],
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
      return { ok: true, items: decorated };
    }, { ttlMs: 20000, scope: { role: u?.role, companyId: u?.companyId, userId: u?.id } });
    res.json(payload);
  });


  // POST /api/company/personels/bulk-clear
  r.post("/bulk-clear", async (req, res) => {
    const u = req.user;
    const body = bulkClearSchema.parse(req.body ?? {});
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0))] : [];
    const fields = Array.from(new Set((body.fields || []).map((x) => String(x)))).filter(Boolean);

    if (!fields.length) return res.status(400).json({ ok: false, error: "fieldsRequired" });

    const where = { companyId: u.companyId ?? -1 };
    if (ids.length) where.id = { in: ids };

    const records = await prisma.personel.findMany({
      where,
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
      orderBy: { id: "asc" },
    });

    let updatedCount = 0;
    for (const item of records) {
      const nextPhone = fields.includes("phone") ? null : item.phone;
      const nextAddress = fields.includes("address") ? null : item.homeAddress;
      const geoMeta = inferGeoState({
        homeAddress: nextAddress,
        homeLat: item.homeLat,
        homeLng: item.homeLng,
        geoManualOverride: item.geoManualOverride,
        geoStatus: item.geoStatus,
        geoNote: item.geoManualOverride ? "MANUAL_OVERRIDE" : item.geoNote,
      });

      await prisma.personel.update({
        where: { id: item.id },
        data: {
          phone: nextPhone,
          homeAddress: nextAddress,
          geoStatus: geoMeta.geoStatus,
          geoNote: geoMeta.geoReason,
          geoUpdatedAt: new Date(),
        },
      });
      updatedCount += 1;
    }

    clearCompanyPersonelsCache(u);
    res.json({ ok: true, updatedCount, fields, idsApplied: ids.length });
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

    clearCompanyPersonelsCache(u);
    res.json({ ok: true, item: decorateGeoItem(updated) });
  });

  return r;
}
