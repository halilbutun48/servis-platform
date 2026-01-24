import express from "express";
import { authRequired } from "../auth/middleware.js";
import { prisma } from "../prisma.js";

export const meRouter = express.Router();

meRouter.get("/", authRequired(), async (req, res) => {
  const u = req.user;
  const [driver, personel] = await Promise.all([
    u.role === "DRIVER" ? prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true } }) : Promise.resolve(null),
    u.role === "PERSONEL" ? prisma.personel.findFirst({ where: { userId: u.id }, select: { id: true } }) : Promise.resolve(null),
  ]);
  res.json({
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.fullName,
    phone: u.phone,
    companyId: u.companyId,
    roomId: u.roomId,
    driverId: driver?.id ?? null,
    personelId: personel?.id ?? null,
  });
});
