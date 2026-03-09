// backend/scripts/m41check.js
// M41 — Refresh token + device binding + Redis rate-limit (PHASE 12)
//
// Expected to FAIL until refresh/device binding/redis rate-limit are implemented.

import { banner, step, must, reqJson, login } from "./_harness.js";

async function main() {
  banner("M41CHECK: Refresh + device binding + Redis rate-limit");

  step("Refresh endpoint should exist");
  const r = await reqJson("POST", "/api/auth/refresh", { body: { refreshToken: "dummy" } });
  must("refresh endpoint exists (should not be 404)", r.status !== 404);

  step("Driver device binding should reject different deviceId");
  const deviceA = "device-A";
  const deviceB = "device-B";
  const loginA = await reqJson("POST", "/api/auth/login", { body: { email: "driver@demo.com", password: "demo123", deviceId: deviceA } });
  must("loginA ok", loginA.ok && !!loginA.json?.token);

  const loginB = await reqJson("POST", "/api/auth/login", { body: { email: "driver@demo.com", password: "demo123", deviceId: deviceB } });
  must("loginB rejected or invalidated per policy (implement)", !loginB.ok);

  step("Rate limit store should be redis in multi-instance setups");
  const store = process.env.RATE_LIMIT_STORE || "";
  must("RATE_LIMIT_STORE=redis (implement)", String(store).toLowerCase() === "redis");

  console.log("\n=== M41CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
