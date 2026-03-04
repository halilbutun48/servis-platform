// backend/scripts/m39check.js
// M39 — Retention job (silme/anonimleştirme) (PHASE 12)
//
// Expected to FAIL until retention job is implemented.

import { banner, step, must, callAny, loginFirst } from "./_harness.js";

async function main() {
  banner("M39CHECK: Retention job");

  const superToken = await loginFirst("super");

  step("Retention run endpoint should exist (admin)");
  const run = await callAny("POST", ["/api/admin/retention/run", "/api/admin/jobs/retention", "/api/admin/maintenance/retention"], {
    token: superToken,
    body: { dryRun: true },
  });
  must(`retention endpoint exists (got ${run.path})`, run.ok);

  console.log("\n=== M39CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
