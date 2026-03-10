import { banner, step, must, reqJson } from "./_harness.js";
import { totpToken } from "../src/auth/totp.js";
import { prisma } from "../src/prisma.js";

async function loginRaw(email, password, extra = {}) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password, ...extra }, includeGreenpack: false });
  must(`login ok ${email}`, r.ok && !!r.json?.token);
  return r.json;
}

async function resolveDriverDeviceId(email = "driver@demo.com") {
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true, deviceId: true } });
  return String(user?.deviceId || "step1-driver-device");
}

function driverPayload(label) {
  const stamp = Date.now();
  return {
    fullName: `Step1 ${label} Driver ${stamp}`,
    phone: `0599${String(stamp).slice(-6)}`,
    deviceInfo: "step1-totp-check",
  };
}

async function main() {
  banner("STEP1 TOTP STEP-UP CHECK");

  await prisma.user.updateMany({
    where: { email: { in: ["room@demo.com", "superadmin@demo.com"] } },
    data: {
      totpSecretBase32: null,
      totpPendingSecretBase32: null,
      totpEnabledAt: null,
      totpLastVerifiedAt: null,
    },
  });

  step("room role should require setup before sensitive write");
  const roomLogin = await loginRaw("room@demo.com", "demo123");
  must("room login flags stepUpRequired", roomLogin.stepUpRequired === true);

  const roomPre = await reqJson("POST", "/api/drivers", {
    token: roomLogin.token,
    includeGreenpack: false,
    body: driverPayload("RoomPre"),
  });
  must("room sensitive write blocked before setup", roomPre.status === 403);
  must("room sensitive write code setup required", String(roomPre.json?.code || roomPre.json?.error || "") === "TOTP_SETUP_REQUIRED");

  const roomSetup = await reqJson("POST", "/api/auth/totp/setup", { token: roomLogin.token, includeGreenpack: false, body: {} });
  must("room totp setup ok", roomSetup.ok && !!roomSetup.json?.secretBase32);
  const roomCode = totpToken(roomSetup.json.secretBase32);
  const roomEnable = await reqJson("POST", "/api/auth/totp/enable", {
    token: roomLogin.token,
    includeGreenpack: false,
    body: { code: roomCode },
  });
  must("room totp enable ok", roomEnable.ok && roomEnable.json?.enabled === true);

  const roomNoStepUp = await reqJson("POST", "/api/drivers", {
    token: roomLogin.token,
    includeGreenpack: false,
    body: driverPayload("RoomNoStepUp"),
  });
  must("room sensitive write blocked until verify", roomNoStepUp.status === 403);
  must("room sensitive write code step up required", String(roomNoStepUp.json?.code || roomNoStepUp.json?.error || "") === "STEP_UP_REQUIRED");

  const roomVerify = await reqJson("POST", "/api/auth/totp/verify", {
    token: roomLogin.token,
    includeGreenpack: false,
    body: { code: totpToken(roomSetup.json.secretBase32) },
  });
  must("room step-up verify ok", roomVerify.ok && !!roomVerify.json?.token);
  must("room stepUpUntil present", Number(roomVerify.json?.stepUpUntil || 0) > Date.now());

  const roomAllowed = await reqJson("POST", "/api/drivers", {
    token: roomVerify.json.token,
    includeGreenpack: false,
    body: driverPayload("RoomAllowed"),
  });
  must(
    `room sensitive write allowed after verify (status=${roomAllowed.status} code=${roomAllowed.json?.code || ""} message=${roomAllowed.json?.message || ""})`,
    roomAllowed.ok && !!roomAllowed.json?.id
  );

  step("super admin should require setup before admin endpoints");
  const superLogin = await loginRaw("superadmin@demo.com", "demo123");
  must("super login flags stepUpRequired", superLogin.stepUpRequired === true);

  const adminPre = await reqJson("GET", "/api/admin/stats", { token: superLogin.token, includeGreenpack: false });
  must("super admin stats blocked before setup", adminPre.status === 403);
  must("super admin stats code setup required", String(adminPre.json?.code || adminPre.json?.error || "") === "TOTP_SETUP_REQUIRED");

  const superSetup = await reqJson("POST", "/api/auth/totp/setup", { token: superLogin.token, includeGreenpack: false, body: {} });
  must("super totp setup ok", superSetup.ok && !!superSetup.json?.secretBase32);
  const superEnable = await reqJson("POST", "/api/auth/totp/enable", {
    token: superLogin.token,
    includeGreenpack: false,
    body: { code: totpToken(superSetup.json.secretBase32) },
  });
  must("super totp enable ok", superEnable.ok && superEnable.json?.enabled === true);

  const adminNoStepUp = await reqJson("GET", "/api/admin/stats", { token: superLogin.token, includeGreenpack: false });
  must("super admin stats blocked until verify", adminNoStepUp.status === 403);
  must("super admin stats code step up required", String(adminNoStepUp.json?.code || adminNoStepUp.json?.error || "") === "STEP_UP_REQUIRED");

  const superVerify = await reqJson("POST", "/api/auth/totp/verify", {
    token: superLogin.token,
    includeGreenpack: false,
    body: { code: totpToken(superSetup.json.secretBase32) },
  });
  must("super step-up verify ok", superVerify.ok && !!superVerify.json?.token);
  const adminOk = await reqJson("GET", "/api/admin/stats", { token: superVerify.json.token, includeGreenpack: false });
  must("super admin stats allowed after verify", adminOk.status === 200);

  step("driver and company remain unaffected by step-up guard");
  const companyLogin = await loginRaw("company@demo.com", "demo123");
  must("company login stepUpRequired false", companyLogin.stepUpRequired === false);
  const driverDeviceId = await resolveDriverDeviceId();
  const driverLogin = await loginRaw("driver@demo.com", "demo123", { deviceId: driverDeviceId });
  const today = await reqJson("GET", "/api/driver/shifts/today", { token: driverLogin.token, includeGreenpack: false });
  must("driver endpoint still responds without step-up", today.status !== 403 || String(today.json?.code || "") !== "STEP_UP_REQUIRED");

  console.log("\n=== STEP1 TOTP STEP-UP CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
