//backend/src/routes/me.js
import express from "express";
import { authRequired } from "../auth/middleware.js";
import { prisma } from "../prisma.js";

export const meRouter = express.Router();

meRouter.get("/", authRequired(), async (req, res) => {
  const u = req.user;

  const [driver, personel, company, room] = await Promise.all([
    u.role === "DRIVER" ? prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true } }) : Promise.resolve(null),
    u.role === "PERSONEL" ? prisma.personel.findFirst({ where: { userId: u.id }, select: { id: true, kind: true } }) : Promise.resolve(null),
    u.companyId
      ? prisma.company.findUnique({
          where: { id: u.companyId },
          select: { id: true, name: true, kind: true, regionId: true, district: true },
        })
      : Promise.resolve(null),
    u.roomId
      ? prisma.room.findUnique({
          where: { id: u.roomId },
          select: { id: true, name: true, regionId: true, district: true },
        })
      : Promise.resolve(null),
  ]);

  const features = {
    checkin: String(process.env.FEATURE_CHECKIN || "0") === "1",
  };

  res.json({
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.fullName,
    phone: u.phone,

    // scope ids
    companyId: u.companyId,
    roomId: u.roomId,

    // resolved scope meta (optional)
    companyName: company?.name ?? null,
    companyKind: company?.kind ?? null,
    companyRegionId: company?.regionId ?? null,
    companyDistrict: company?.district ?? null,

    roomName: room?.name ?? null,
    roomRegionId: room?.regionId ?? null,
    roomDistrict: room?.district ?? null,

    driverId: driver?.id ?? null,
    personelId: personel?.id ?? null,
    personelKind: personel?.kind ?? null,

    features,
  });
});

