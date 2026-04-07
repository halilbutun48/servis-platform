// backend/src/routes/companyHub.js
// COMPANY can set its own worksite hub (lat/lng)
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { httpError } from "../errors/http.js";

function companyIdOf(req) {
  const v = req.user?.companyId ?? req.me?.companyId ?? req.auth?.companyId;
  return v == null ? null : Number(v);
}

const hubSchema = z
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

export function companyHubRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY"));

  r.get("/", asyncHandler(async (req, res) => {
    const companyId = companyIdOf(req);
    if (!companyId) throw httpError(400, "COMPANY_ID_MISSING", "companyId missing");
    const c = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, hubLat: true, hubLng: true, name: true } });
    if (!c) throw httpError(404, "COMPANY_NOT_FOUND", "Company not found");
    return res.json({ ok: true, companyId: c.id, name: c.name, hubLat: c.hubLat, hubLng: c.hubLng });
  }));

  r.put("/", asyncHandler(async (req, res) => {
    const companyId = companyIdOf(req);
    if (!companyId) throw httpError(400, "COMPANY_ID_MISSING", "companyId missing");

    const parsed = hubSchema.safeParse(req.body);
    if (!parsed.success) throw httpError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.flatten());

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { hubLat: parsed.data.hubLat, hubLng: parsed.data.hubLng },
      select: { id: true, hubLat: true, hubLng: true },
    });

    return res.json({ ok: true, companyId: updated.id, hubLat: updated.hubLat, hubLng: updated.hubLng });
  }));

  return r;
}
