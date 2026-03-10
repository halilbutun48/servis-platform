import { banner, step, must, reqJson } from "./_harness.js";
import { prisma } from "../src/prisma.js";

async function loginRaw(email, password, extra = {}) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password, ...extra } });
  must(`login ok ${email}`, r.ok && !!r.json?.token);
  return r.json;
}

async function ensureCompanyPersonel(companyToken, companyUserId) {
  const companyUser = await prisma.user.findUnique({ where: { id: companyUserId }, select: { companyId: true } });
  let personel = await prisma.personel.findFirst({
    where: { companyId: companyUser?.companyId ?? -1, userId: null },
    orderBy: { id: "asc" },
  });
  if (personel) return personel;

  const created = await reqJson("POST", "/api/personels", {
    token: companyToken,
    body: { fullName: "M43 Personel", phone: `555000${String(Date.now()).slice(-4)}` },
  });
  must("personel create fallback ok", created.ok && created.json?.id);
  personel = await prisma.personel.findUnique({ where: { id: created.json.id } });
  must("personel exists after create", !!personel);
  must("personel is unlinked", !personel.userId);
  return personel;
}

async function ensureRoomDriver(roomToken, roomUserId) {
  const roomUser = await prisma.user.findUnique({ where: { id: roomUserId }, select: { roomId: true } });
  let driver = await prisma.driver.findFirst({
    where: { roomId: roomUser?.roomId ?? -1, userId: null },
    orderBy: { id: "asc" },
  });
  if (driver) return driver;

  const created = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: "M43 Driver", phone: `555100${String(Date.now()).slice(-4)}`, deviceInfo: "m43-device" },
  });
  must("driver create fallback ok", created.ok && created.json?.id);
  driver = await prisma.driver.findUnique({ where: { id: created.json.id } });
  must("driver exists after create", !!driver);
  must("driver is unlinked", !driver.userId);
  return driver;
}

async function main() {
  banner("M43 GOOGLE AUTH + INVITE GATE CHECK");

  step("seed scope users with password login");
  const company = await loginRaw("company@demo.com", "demo123");
  const room = await loginRaw("room@demo.com", "demo123");

  const personel = await ensureCompanyPersonel(company.token, company.user.id);
  const driver = await ensureRoomDriver(room.token, room.user.id);

  step("create personel invite and accept with greenpack google profile");
  const personelEmail = `oauth.personel.${Date.now()}@demo.com`;
  const personelInvite = await reqJson("POST", "/api/auth/invites", {
    token: company.token,
    body: { role: "PERSONEL", companyId: company.user.companyId, personelId: personel.id, email: personelEmail, ttlDays: 30 },
  });
  must("personel invite create ok", personelInvite.ok && !!personelInvite.json?.token);

  const personelSub = `m43-personel-sub-${Date.now()}`;
  const personelGoogle = await reqJson("POST", "/api/auth/google", {
    body: {
      inviteToken: personelInvite.json.token,
      testProfile: { sub: personelSub, email: personelEmail, name: "M43 Personel OAuth" },
    },
  });
  must("personel google login ok", personelGoogle.ok && personelGoogle.json?.user?.role === "PERSONEL");
  must("personel refresh token present", !!personelGoogle.json?.refreshToken);

  const linkedPersonel = await prisma.personel.findUnique({ where: { id: personel.id }, select: { userId: true } });
  must("personel linked to created user", Number(linkedPersonel?.userId || 0) > 0);

  const personelIdentity = await prisma.userIdentity.findFirst({ where: { provider: "GOOGLE", providerSub: personelSub } });
  must("personel identity linked", !!personelIdentity);

  step("invite yoksa google login reject");
  const noInvite = await reqJson("POST", "/api/auth/google", {
    body: { testProfile: { sub: `m43-noinvite-sub-${Date.now()}`, email: `noinvite.${Date.now()}@demo.com`, name: "No Invite" } },
  });
  must("no invite rejected", noInvite.status === 403);
  must("no invite code", String(noInvite.json?.code || noInvite.json?.error || "") === "INVITE_REQUIRED");

  step("create driver invite and enforce device binding on oauth");
  const driverEmail = `oauth.driver.${Date.now()}@demo.com`;
  const driverInvite = await reqJson("POST", "/api/auth/invites", {
    token: room.token,
    body: { role: "DRIVER", roomId: room.user.roomId, driverId: driver.id, email: driverEmail, ttlDays: 30 },
  });
  must("driver invite create ok", driverInvite.ok && !!driverInvite.json?.token);

  const driverSub = `m43-driver-sub-${Date.now()}`;
  const driverFirst = await reqJson("POST", "/api/auth/google", {
    body: {
      inviteToken: driverInvite.json.token,
      deviceId: "m43-driver-device-A",
      testProfile: { sub: driverSub, email: driverEmail, name: "M43 Driver OAuth" },
    },
  });
  must("driver google login ok", driverFirst.ok && driverFirst.json?.user?.role === "DRIVER");
  must("driver refresh token present", !!driverFirst.json?.refreshToken);

  const linkedDriver = await prisma.driver.findUnique({ where: { id: driver.id }, select: { userId: true } });
  must("driver linked to created user", Number(linkedDriver?.userId || 0) > 0);

  const driverSecondSameDevice = await reqJson("POST", "/api/auth/google", {
    body: {
      deviceId: "m43-driver-device-A",
      testProfile: { sub: driverSub, email: driverEmail, name: "M43 Driver OAuth" },
    },
  });
  must("driver second oauth login same device ok", driverSecondSameDevice.ok && driverSecondSameDevice.json?.user?.role === "DRIVER");

  const driverMismatch = await reqJson("POST", "/api/auth/google", {
    body: {
      deviceId: "m43-driver-device-B",
      testProfile: { sub: driverSub, email: driverEmail, name: "M43 Driver OAuth" },
    },
  });
  must("driver mismatch rejected", driverMismatch.status === 403);
  must("driver mismatch code", String(driverMismatch.json?.code || driverMismatch.json?.error || "") === "DEVICE_MISMATCH");

  console.log("\n=== M43 GOOGLE AUTH + INVITE GATE CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
