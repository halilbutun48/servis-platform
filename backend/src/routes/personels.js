// backend/src/routes/personels.js
import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { createPersonelSchema } from "../validators.js";
import { clearResponseCache } from "../utils/responseCache.js";

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

    const items = await prisma.personel.findMany({
      include: { company: true, user: { select: { id: true, email: true, fullName: true, phone: true } } },
      orderBy: { id: "asc" },
    });
    return res.json(items);
  });

  // COMPANY: create personel (login opsiyonel)
  r.post("/", authRequired(), requireRole("COMPANY"), requireStepUpWrite("COMPANY"), async (req, res) => {
    const u = req.user;
    if (!u.companyId) return res.status(400).json({ error: "COMPANY must have companyId" });

    const parsed = createPersonelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { fullName, phone, email, password } = parsed.data;
    const emailNorm = email ? String(email).trim().toLowerCase() : "";
    const wantsLogin = Boolean(emailNorm && password);

    try {
      const created = await prisma.$transaction(async (tx) => {
        let user = null;

        if (wantsLogin) {
          const exists = await tx.user.findUnique({ where: { email: emailNorm } });
          if (exists) throw Object.assign(new Error("Email already exists"), { status: 409 });

          const passwordHash = await bcrypt.hash(String(password), 10);
          user = await tx.user.create({
            data: {
              email: emailNorm,
              passwordHash,
              role: "PERSONEL",
              fullName,
              phone,
              companyId: u.companyId,
            },
            select: { id: true, email: true, fullName: true, phone: true },
          });
        }

        return tx.personel.create({
          data: {
            companyId: u.companyId,
            userId: user?.id ?? null,
            fullName,
            phone,
            geoStatus: "NEEDS_REVIEW",
          },
          include: { user: { select: { id: true, email: true, fullName: true, phone: true } } },
        });
      });

      io.to(`company:${u.companyId}`).emit("personel:update", {
        personelId: created.id,
        action: "created",
        loginEnabled: Boolean(created?.user?.id),
      });

      clearResponseCache(`company-personels:${u.companyId ?? -1}:`, {
        role: u?.role,
        companyId: u?.companyId,
        userId: u?.id,
      });

      return res.json({
        ...created,
        loginMode: created?.user?.id ? "ACCOUNT" : "PUBLIC_LINK",
      });
    } catch (e) {
      return res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
    }
  });

  return r;
}
