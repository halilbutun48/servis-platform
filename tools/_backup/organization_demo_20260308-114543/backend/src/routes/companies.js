// backend/src/routes/companies.js
// SUPER_ADMIN companies CRUD (with regionId/district + profile fields)

import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

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

const createCompanySchema = z.object({
  name: z.string().trim().min(2),
  status: z.string().trim().optional(),
  kind: z.enum(["COMPANY", "SCHOOL"]).optional(),
  regionId: zRegionId.optional(),
  district: zOptStr.optional(),
  // profile
  legalName: zOptStr.optional(),
  taxNo: zOptStr.optional(),
  taxOffice: zOptStr.optional(),
  addressLine: zOptStr.optional(),
  contactName: zOptStr.optional(),
  contactPhone: zOptStr.optional(),
  contactEmail: zOptEmail.optional(),
  notes: zOptStr.optional(),
});

const updateCompanySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    status: z.string().trim().optional(),
    kind: z.enum(["COMPANY", "SCHOOL"]).optional(),
    regionId: zRegionId.optional(),
    district: zOptStr.optional(),
    // profile
    legalName: zOptStr.optional(),
    taxNo: zOptStr.optional(),
    taxOffice: zOptStr.optional(),
    addressLine: zOptStr.optional(),
    contactName: zOptStr.optional(),
    contactPhone: zOptStr.optional(),
    contactEmail: zOptEmail.optional(),
    notes: zOptStr.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export function companiesRouter() {
  const r = express.Router();

  r.use(authRequired(), requireRole("SUPER_ADMIN"));

  // LIST
  // ?all=1 includes DELETED too
  // ?q=term (name contains)
  // ?regionId=1
  // ?district=...
  // ?kind=COMPANY|SCHOOL
  r.get("/", async (req, res) => {
    const all = String(req.query.all ?? "") === "1";
    const q = String(req.query.q || "").trim();
    const district = String(req.query.district || "").trim();
    const kind = String(req.query.kind || "").trim().toUpperCase();
    const regionId = req.query.regionId == null || req.query.regionId === "" ? null : Number(req.query.regionId);

    const where = {
      ...(all ? {} : { status: { not: "DELETED" } }),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(district ? { district: { contains: district, mode: "insensitive" } } : {}),
      ...(kind === "COMPANY" || kind === "SCHOOL" ? { kind } : {}),
      ...(!Number.isNaN(regionId) && regionId != null ? { regionId } : {}),
    };

    const items = await prisma.company.findMany({
      where,
      include: { region: { select: { id: true, name: true } } },
      orderBy: { id: "asc" },
    });

    res.json({ items });
  });

  // CREATE
  r.post("/", async (req, res) => {
    const parsed = createCompanySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.company.create({
      data: {
        name: parsed.data.name,
        status: parsed.data.status ?? "ACTIVE",
        kind: parsed.data.kind ?? "COMPANY",
        regionId: Object.prototype.hasOwnProperty.call(parsed.data, "regionId") ? parsed.data.regionId : null,
        district: Object.prototype.hasOwnProperty.call(parsed.data, "district") ? parsed.data.district : null,
        legalName: Object.prototype.hasOwnProperty.call(parsed.data, "legalName") ? parsed.data.legalName : null,
        taxNo: Object.prototype.hasOwnProperty.call(parsed.data, "taxNo") ? parsed.data.taxNo : null,
        taxOffice: Object.prototype.hasOwnProperty.call(parsed.data, "taxOffice") ? parsed.data.taxOffice : null,
        addressLine: Object.prototype.hasOwnProperty.call(parsed.data, "addressLine") ? parsed.data.addressLine : null,
        contactName: Object.prototype.hasOwnProperty.call(parsed.data, "contactName") ? parsed.data.contactName : null,
        contactPhone: Object.prototype.hasOwnProperty.call(parsed.data, "contactPhone") ? parsed.data.contactPhone : null,
        contactEmail: Object.prototype.hasOwnProperty.call(parsed.data, "contactEmail") ? parsed.data.contactEmail : null,
        notes: Object.prototype.hasOwnProperty.call(parsed.data, "notes") ? parsed.data.notes : null,
      },
      include: { region: { select: { id: true, name: true } } },
    });

    // DEV/DEMO convenience (auto-bind demo company user once)
    if ((process.env.NODE_ENV ?? "development") !== "production") {
      const demo = await prisma.user.findFirst({
        where: { email: "company@demo.com", role: "COMPANY" },
        select: { id: true, companyId: true },
      });
      if (demo && !demo.companyId) {
        await prisma.user.update({ where: { id: demo.id }, data: { companyId: item.id } });
      }
    }

    res.status(201).json(item);
  });

  // READ
  r.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.company.findUnique({
      where: { id },
      include: { region: { select: { id: true, name: true } } },
    });
    if (!item) return res.status(404).json({ error: "Company not found" });
    res.json(item);
  });

  // UPDATE
  r.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateCompanySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const item = await prisma.company.update({
      where: { id },
      data: parsed.data,
      include: { region: { select: { id: true, name: true } } },
    });
    res.json(item);
  });

  // SOFT DELETE
  r.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const item = await prisma.company.update({ where: { id }, data: { status: "DELETED" } });
    res.json(item);
  });

  return r;
}
