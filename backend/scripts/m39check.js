// backend/scripts/m39check.js
// M39 — Retention job (Admin endpoint) — PHASE 12
//
// Goal: ensure admin endpoint exists and returns structured summary.
// This check should PASS once M39 implementation is merged.

import { banner, step, must, reqJson, loginFirst } from "./_harness.js";

async function main() {
  banner("M39CHECK: Retention run endpoint (dryRun)");

  const superToken = await loginFirst("super");

  step("call /api/admin/retention/run (dryRun)");
  const r = await reqJson("POST", "/api/admin/retention/run", {
    token: superToken,
    body: { dryRun: true },
  });

  must("retention endpoint ok", r.ok);
  must("ok=true", r.json?.ok === true);

  // Basic shape
  must("has cutoffs", !!r.json?.cutoffs);
  must("has apiRequest block", !!r.json?.apiRequest);
  must("has auditLog block", !!r.json?.auditLog);
  must("has notification block", !!r.json?.notification);
  must("has gpsPoint block", !!r.json?.gpsPoint);

  console.log("\n=== M39CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
