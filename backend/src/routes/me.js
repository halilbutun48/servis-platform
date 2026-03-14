//backend/src/routes/me.js
import express from "express";
import { authRequired, requireStepUpWrite } from "../auth/middleware.js";
import { prisma } from "../prisma.js";
import { audit } from "../audit.js";
import { getKvkkSummaryForUser } from "../kvkk/documents.js";

export const meRouter = express.Router();

meRouter.get("/", authRequired(), async (req, res) => {
  const u = req.user;

  const [driver, personel, company, room, kvkk] = await Promise.all([
    u.role === "DRIVER" ? prisma.driver.findFirst({ where: { userId: u.id }, select: { id: true, driverCode: true, pinTemporary: true, pinUpdatedAt: true } }) : Promise.resolve(null),
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
    getKvkkSummaryForUser({ userId: u.id, role: u.role, prismaClient: prisma }),
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
    driverCode: driver?.driverCode ?? null,
    requirePinChange: Boolean(driver?.pinTemporary),
    pinUpdatedAt: driver?.pinUpdatedAt ?? null,
    personelId: personel?.id ?? null,
    personelKind: personel?.kind ?? null,

    kvkk: {
      requiredCount: kvkk?.requiredCount ?? 0,
      acceptedCount: kvkk?.acceptedCount ?? 0,
      blocking: Boolean(kvkk?.blocking),
      pendingDocKeys: kvkk?.pendingDocKeys ?? [],
    },

    features,
  });
});



// ✅ M46.9: session visibility + self revoke-all
meRouter.get("/sessions", authRequired(), async (req, res) => {
  const u = req.user;
  const items = await prisma.refreshSession.findMany({
    where: { userId: u.id },
    select: { id: true, createdAt: true, expiresAt: true, revokedAt: true, deviceId: true, ip: true, userAgent: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return res.json({ ok: true, items });
});

meRouter.post("/sessions/revoke-all", authRequired(), requireStepUpWrite("ROOM", "SUPER_ADMIN"), async (req, res) => {
  const u = req.user;
  const now = new Date();

  const out = await prisma.$transaction(async (tx) => {
    const r = await tx.refreshSession.updateMany({ where: { userId: u.id, revokedAt: null }, data: { revokedAt: now } });
    const updated = await tx.user.update({ where: { id: u.id }, data: { sessionVersion: { increment: 1 } } });
    return { revokedCount: Number(r?.count || 0), sessionVersion: updated.sessionVersion };
  });

  await audit(req, {
    action: "AUTH_SESSION_REVOKE_ALL",
    entity: "User",
    entityId: u.id,
    meta: { userId: u.id, revokedCount: out.revokedCount, sessionVersion: out.sessionVersion },
  });

  // Note: current access token is invalid after bump; client must re-login.
  return res.json({ ok: true, revokedCount: out.revokedCount, sessionVersion: out.sessionVersion });
});
