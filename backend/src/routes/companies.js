// backend/src/routes/companies.js
import express from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

const createCompanySchema = z.object({
  name: z.string().trim().min(2),
  status: z.string().trim().optional(),
});

const updateCompanySchema = z.object({
  name: z.string().trim().min(2).optional(),
  status: z.string().trim().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export function companiesRouter() {
  const r = express.Router();

  // SUPER_ADMIN only
  r.use(authRequired(), requireRole("SUPER_ADMIN"));

  // LIST
  r.get("/", async (req, res) => {
    const all = String(req.query.all ?? "") === "1";
    const where = all ? {} : { status: { not: "DELETED" } };

    const items = await prisma.company.findMany({
      where,
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
    const item = await prisma.company.findUnique({ where: { id } });
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
