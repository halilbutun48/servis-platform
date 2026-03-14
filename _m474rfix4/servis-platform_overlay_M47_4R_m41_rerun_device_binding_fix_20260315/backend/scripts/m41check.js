// backend/scripts/m41check.js
// M41 — Refresh token + device binding + Redis rate-limit (PHASE 12)
//
// Rerun-compatible expectation:
// - refresh endpoint exists
// - driver first login succeeds on current bound device (or binds fallback on clean DB)
// - different deviceId is rejected

import { prisma } from "../src/prisma.js";
import { banner, step, must, reqJson } from "./_harness.js";

async function resolveDriverDevicePair(email = "driver@demo.com") {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, deviceId: true },
  });

  must("driver user exists", !!user && user.role === "DRIVER");

  const bound = String(user?.deviceId || "").trim();
  const deviceA = bound || "device-A";
  const deviceBBase = `device-B-${Date.now()}`;
  const deviceB = deviceA === deviceBBase ? `device-C-${Date.now()}` : deviceBBase;

  if (bound) {
    console.log(`INFO reuse bound driver deviceId (${deviceA})`);
  } else {
    console.log(`INFO driver not bound yet, using fallback deviceId (${deviceA})`);
  }

  return { deviceA, deviceB };
}

async function main() {
  banner("M41CHECK: Refresh + device binding + Redis rate-limit");

  step("Refresh endpoint should exist");
  const r = await reqJson("POST", "/api/auth/refresh", { body: { refreshToken: "dummy" } });
  must("refresh endpoint exists (should not be 404)", r.status !== 404);

  step("Driver device binding should reject different deviceId");
  const { deviceA, deviceB } = await resolveDriverDevicePair();

  const loginA = await reqJson("POST", "/api/auth/login", {
    body: { email: "driver@demo.com", password: "demo123", deviceId: deviceA },
  });
  must("loginA ok", loginA.ok && !!loginA.json?.token);

  const loginB = await reqJson("POST", "/api/auth/login", {
    body: { email: "driver@demo.com", password: "demo123", deviceId: deviceB },
  });
  must(
    "loginB rejected with device mismatch",
    loginB.status === 403 && String(loginB.json?.code || loginB.json?.error || "") === "DEVICE_MISMATCH"
  );

  step("Rate limit store should be redis in multi-instance setups");
  const store = process.env.RATE_LIMIT_STORE || "";
  must("RATE_LIMIT_STORE=redis", String(store).toLowerCase() === "redis");

  console.log("\n=== M41CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
