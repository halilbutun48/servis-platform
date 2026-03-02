// backend/src/routes/companies.js
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const createCompanySchema = z.object({
  name: z.string().trim().min(2),
  status: z.string().trim().optional(),
  regionId: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().int().positive().nullable()).optional(),
  district: z.string().trim().max(64).optional().nullable(),
  legalName: z.string().trim().max(200).optional().nullable(),
  taxNo: z.string().trim().max(32).optional().nullable(),
  taxOffice: z.string().trim().max(120).optional().nullable(),
  addressLine: z.string().trim().max(500).optional().nullable(),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  contactEmail: z.string().trim().max(180).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const updateCompanySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    status: z.string().trim().optional(),
    regionId: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().int().positive().nullable()).optional(),
    district: z.string().trim().max(64).optional().nullable(),
      legalName: z.string().trim().max(200).optional().nullable(),
      taxNo: z.string().trim().max(32).optional().nullable(),
      taxOffice: z.string().trim().max(120).optional().nullable(),
      addressLine: z.string().trim().max(500).optional().nullable(),
      contactName: z.string().trim().max(120).optional().nullable(),
      contactPhone: z.string().trim().max(40).optional().nullable(),
      contactEmail: z.string().trim().max(180).optional().nullable(),
      notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export function companiesRouter() {
  const r = express.Router();

  // SUPER_ADMIN only
  r.use(authRequired(), requireRole("SUPER_ADMIN"));

  // LIST
  r.get("/", async (req, res) => {
    const all = String(req.query.all ?? "") === "1";
    const regionId = req.query.regionId != null && String(req.query.regionId).trim() !== "" ? Number(req.query.regionId) : null;
    const district = req.query.district != null && String(req.query.district).trim() !== "" ? String(req.query.district).trim() : null;

    const where = {
      ...(all ? {} : { status: { not: "DELETED" } }),
      ...(regionId ? { regionId } : {}),
      ...(district ? { district: { contains: district, mode: "insensitive" } } : {}),
    };

    const items = await prisma.company.findMany({
      where,
      orderBy: { id: "asc" },
      include: { region: { select: { id: true, name: true } } },
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
        regionId: Object.prototype.hasOwnProperty.call(parsed.data, "regionId") ? (parsed.data.regionId ? Number(parsed.data.regionId) : null) : null,
        district: parsed.data.district ? String(parsed.data.district).trim() : null,
        legalName: parsed.data.legalName ? String(parsed.data.legalName).trim() : null,
        taxNo: parsed.data.taxNo ? String(parsed.data.taxNo).trim() : null,
        taxOffice: parsed.data.taxOffice ? String(parsed.data.taxOffice).trim() : null,
        addressLine: parsed.data.addressLine ? String(parsed.data.addressLine).trim() : null,
        contactName: parsed.data.contactName ? String(parsed.data.contactName).trim() : null,
        contactPhone: parsed.data.contactPhone ? String(parsed.data.contactPhone).trim() : null,
        contactEmail: parsed.data.contactEmail ? String(parsed.data.contactEmail).trim() : null,
        notes: parsed.data.notes ? String(parsed.data.notes).trim() : null,
      },
    });

    // DEV/DEMO convenience:
    // The repo includes demo users (company@demo.com, room@demo.com). In the M1 test flow,
    // SUPER_ADMIN creates a fresh Company and then the demo COMPANY user is expected to
    // operate on that Company immediately. We auto-bind the demo COMPANY user to the most
    // recently created Company in non-production environments.
    if ((process.env.NODE_ENV ?? "development") !== "production") {
      // Only auto-bind demo COMPANY user when they are NOT already bound (avoid surprising overrides)
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
    const item = await prisma.company.findUnique({ where: { id }, include: { region: { select: { id: true, name: true } } } });
    if (!item) return res.status(404).json({ error: "Company not found" });
    res.json(item);
  });

  // UPDATE
  r.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateCompanySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const data = { ...parsed.data };
    if (Object.prototype.hasOwnProperty.call(data, "regionId")) data.regionId = data.regionId ? Number(data.regionId) : null;
    if (Object.prototype.hasOwnProperty.call(data, "district")) data.district = data.district ? String(data.district).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "legalName")) data.legalName = data.legalName ? String(data.legalName).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "taxNo")) data.taxNo = data.taxNo ? String(data.taxNo).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "taxOffice")) data.taxOffice = data.taxOffice ? String(data.taxOffice).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "addressLine")) data.addressLine = data.addressLine ? String(data.addressLine).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "contactName")) data.contactName = data.contactName ? String(data.contactName).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "contactPhone")) data.contactPhone = data.contactPhone ? String(data.contactPhone).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "contactEmail")) data.contactEmail = data.contactEmail ? String(data.contactEmail).trim() : null;
    if (Object.prototype.hasOwnProperty.call(data, "notes")) data.notes = data.notes ? String(data.notes).trim() : null;

    const item = await prisma.company.update({
      where: { id },
      data,
      include: { region: { select: { id: true, name: true } } },
    });

    res.json(item);
  });

  // SOFT DELETE
  r.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const item = await prisma.company.update({
      where: { id },
      data: { status: "DELETED" },
    });

    res.json(item);
  });

  return r;
}
