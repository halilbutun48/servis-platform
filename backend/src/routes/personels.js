// backend/src/routes/personels.js
import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { createPersonelSchema } from "../validators.js";

export function personelsRouter(io) {
  const r = express.Router();

  // COMPANY: list personels
  r.get("/", authRequired(), requireRole("COMPANY", "SUPER_ADMIN"), async (req, res) => {
    const u = req.user;

    if (u.role === "COMPANY") {
      const items = await prisma.personel.findMany({
        where: { companyId: u.companyId ?? -1 },
        include: { user: { select: { id: true, email: true, fullName: true, phone: true } } },
        orderBy: { id: "asc" },
      });
      return res.json(items);
    }

    // SUPER_ADMIN
    const items = await prisma.personel.findMany({
      include: { company: true, user: { select: { id: true, email: true, fullName: true, phone: true } } },
      orderBy: { id: "asc" },
    });
    return res.json(items);
  });

  // COMPANY: create personel (+ user)
  r.post("/", authRequired(), requireRole("COMPANY"), async (req, res) => {
    const u = req.user;
    if (!u.companyId) return res.status(400).json({ error: "COMPANY must have companyId" });

    const parsed = createPersonelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { fullName, phone, email, password } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: "PERSONEL",
          fullName,
          phone,
          companyId: u.companyId,
        },
      });

      const personel = await tx.personel.create({
        data: {
          companyId: u.companyId,
          userId: user.id,
        },
        include: { user: { select: { id: true, email: true, fullName: true, phone: true } } },
      });

      return personel;
    });

    io.to(`company:${u.companyId}`).emit("personel:update", { personelId: created.id, action: "created" });

    return res.json(created);
  });

  return r;
}