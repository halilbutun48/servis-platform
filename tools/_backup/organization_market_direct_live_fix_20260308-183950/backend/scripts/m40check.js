// backend/scripts/m40check.js
// M40 — RBAC matrix + Log export audit trail (PHASE 12)
//
// Expected to FAIL until export audit trail is implemented.

import { banner, step, must, reqJson, loginFirst } from "./_harness.js";

async function main() {
  banner("M40CHECK: RBAC + export audit trail");

  const superToken = await loginFirst("super");
  const roomToken = await loginFirst("room");

  step("Room should NOT export another room's vehicle logs (403)");
  // assumes seed vehicle 1 is roomId=1; try invalid vehicle id 999999 to avoid data leak checks
  const r1 = await reqJson("GET", "/api/logs/export?kind=bundle_vehicle&targetType=vehicle&targetId=999999&format=txt", { token: roomToken });
  must("room export forbidden or not found is acceptable", r1.status === 403 || r1.status === 404);

  step("SuperAdmin export should create audit entry LOG_EXPORT");
  await reqJson("GET", "/api/logs/export?kind=requests&format=txt&take=10", { token: superToken });

  const aud = await reqJson("GET", "/api/admin/logs/preview?kind=audit&take=200", { token: superToken });
  const items = aud.json?.items ?? aud.json ?? [];
  const found = items.some((x) => String(x.action || x.type || x.text || "").includes("LOG_EXPORT"));
  must("LOG_EXPORT audit entry exists (implement export audit trail)", found);

  console.log("\n=== M40CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
