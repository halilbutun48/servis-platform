// Step 1 foundation — refresh reuse detection + RBAC deny-by-default runtime check
import { banner, step, must, reqJson } from "./_harness.js";
import { prisma } from "../src/prisma.js";

async function loginRaw(email, password, extra = {}) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password, ...extra } });
  must(`login ok ${email}`, r.ok && !!r.json?.token);
  return r.json;
}

async function expectStatus(label, expected, method, path, opts = {}) {
  const r = await reqJson(method, path, opts);
  must(`${label} -> ${expected}`, r.status === expected);
  return r;
}

async function resolveDriverDeviceId(email = "driver@demo.com") {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, deviceId: true },
  });
  must("driver user exists", !!user && user.role === "DRIVER");
  const deviceId = String(user?.deviceId || "").trim();
  if (deviceId) {
    console.log(`INFO reuse bound driver deviceId (${deviceId})`);
    return deviceId;
  }
  const fallback = "step1-driver-device";
  console.log(`INFO driver not bound yet, using fallback deviceId (${fallback})`);
  return fallback;
}

async function main() {
  banner("STEP1 SECURITY FOUNDATION CHECK");

  step("refresh reuse detection should revoke active chain");
  const companyLogin = await loginRaw("company@demo.com", "demo123");
  must("company refreshToken present", !!companyLogin.refreshToken);

  const firstRefresh = await reqJson("POST", "/api/auth/refresh", {
    body: { refreshToken: companyLogin.refreshToken },
  });
  must("first refresh ok", firstRefresh.ok && !!firstRefresh.json?.refreshToken && !!firstRefresh.json?.token);

  const secondUseOld = await reqJson("POST", "/api/auth/refresh", {
    body: { refreshToken: companyLogin.refreshToken },
  });
  must("old refresh reuse rejected", secondUseOld.status === 401);
  must(
    "old refresh reuse code detected",
    String(
      secondUseOld.json?.code ||
        secondUseOld.json?.error?.code ||
        secondUseOld.json?.error ||
        ""
    ) === "REFRESH_REUSE_DETECTED"
  );

  const newestRefresh = String(firstRefresh.json?.refreshToken || "");
  const chainedAfterReuse = await reqJson("POST", "/api/auth/refresh", {
    body: { refreshToken: newestRefresh },
  });
  must("rotated chain revoked after reuse", chainedAfterReuse.status === 401);

  step("RBAC deny-by-default sanity matrix");
  const superLogin = await loginRaw("superadmin@demo.com", "demo123");
  const roomLogin = await loginRaw("room@demo.com", "demo123");
  const driverDeviceId = await resolveDriverDeviceId("driver@demo.com");
  const driverLogin = await loginRaw("driver@demo.com", "demo123", { deviceId: driverDeviceId });
  const personelLogin = await loginRaw("personel@demo.com", "demo123");
  const parentLogin = await loginRaw("parent@demo.com", "demo123");

  await expectStatus("super admin stats allowed", 200, "GET", "/api/admin/stats", { token: superLogin.token });
  await expectStatus("company admin stats forbidden", 403, "GET", "/api/admin/stats", { token: companyLogin.token });
  await expectStatus("room companies list forbidden", 403, "GET", "/api/companies", { token: roomLogin.token });
  await expectStatus("driver availability forbidden", 403, "GET", "/api/availability", { token: driverLogin.token });
  await expectStatus("personel requests list forbidden", 403, "GET", "/api/requests", { token: personelLogin.token });
  await expectStatus("parent driver today forbidden", 403, "GET", "/api/driver/shifts/today", { token: parentLogin.token });
  await expectStatus("company admin log export forbidden", 403, "GET", "/api/admin/logs/export?kind=audit&take=1", { token: companyLogin.token });

  console.log("\n=== STEP1 SECURITY FOUNDATION CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
