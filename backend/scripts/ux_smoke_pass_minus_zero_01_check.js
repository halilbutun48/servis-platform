#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const reportJsonPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function ok(label) {
  console.log(`OK ${label}`);
}

function must(cond, label) {
  if (!cond) {
    throw new Error(`FAIL ${label}`);
  }
  ok(label);
}

function mustContains(text, needle, label) {
  must(String(text).includes(needle), label);
}

function main() {
  console.log("=== UX-SMOKE-PASS-MINUS-ZERO-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_SMOKE_PASS_MINUS_ZERO_01.md");

  mustContains(pkg, '"check:uxsmokepassminuszero01"', "package.json exposes check:uxsmokepassminuszero01");
  mustContains(
    runner,
    "'check:uxsmokepassminuszero01'",
    "product extensions runner includes PASS-minus zero check"
  );
  mustContains(
    verify,
    '"check:uxsmokepassminuszero01"',
    "verify chain exposes PASS-minus zero check"
  );
  mustContains(
    harnessCheck,
    "check:uxsmokepassminuszero01",
    "script harness check knows PASS-minus zero alias"
  );
  mustContains(
    harnessDoc,
    "check:uxsmokepassminuszero01",
    "script harness doc exposes PASS-minus zero alias"
  );
  mustContains(
    guide,
    "UX-SMOKE-PASS-MINUS-ZERO-01",
    "milestone guide mentions PASS-minus zero milestone"
  );
  mustContains(
    guide,
    "check:uxsmokepassminuszero01",
    "milestone guide exposes PASS-minus zero check"
  );
  mustContains(
    guide,
    "node backend\\scripts\\ux_smoke_pass_minus_zero_01_check.js",
    "milestone guide includes PASS-minus zero command"
  );
  mustContains(doc, "UX-SMOKE-PASS-MINUS-ZERO-01", "PASS-minus zero doc title present");
  mustContains(doc, "PASS- 0", "PASS-minus zero doc explains the target");
  mustContains(doc, "UX-FIX rows are tracked separately", "PASS-minus zero doc keeps UX-FIX backlog separate");
  mustContains(doc, "BLOCKER 0", "PASS-minus zero doc keeps blocker target strict");
  mustContains(doc, "NOT-FOUND 0", "PASS-minus zero doc keeps not-found target strict");

  if (fs.existsSync(reportJsonPath)) {
    const report = JSON.parse(fs.readFileSync(reportJsonPath, "utf8"));
    must(Array.isArray(report.routes), "smoke report keeps routes array");
    must(report.routeCount === report.routes.length, "smoke report route count matches rows");
    must(report.routeCount === 82, "smoke report keeps 82 route checks");
    must(report.statusCounts.PASS === report.routes.filter((row) => row.status === "PASS").length, "PASS count matches rows");
    must(report.statusCounts["PASS-"] === 0, "PASS- count is zero");
    must(typeof report.statusCounts["UX-FIX"] === "number", "UX-FIX count is recorded");
    must(report.statusCounts.BLOCKER === 0, "BLOCKER count is zero");
    must(report.statusCounts["AUTH-BLOCKED"] === 0, "AUTH-BLOCKED count is zero");
    must(report.statusCounts["NOT-FOUND"] === 0, "NOT-FOUND count is zero");
    must(report.routes.every((row) => row.status !== "PASS-"), "no route row remains PASS-");
    console.log("OK PASS-minus zero snapshot:");
    console.log(`- PASS: ${report.statusCounts.PASS || 0}`);
    console.log(`- PASS-: ${report.statusCounts["PASS-"] || 0}`);
    console.log(`- UX-FIX: ${report.statusCounts["UX-FIX"] || 0}`);
    console.log(`- BLOCKER: ${report.statusCounts.BLOCKER || 0}`);
    console.log(`- AUTH-BLOCKED: ${report.statusCounts["AUTH-BLOCKED"] || 0}`);
    console.log(`- NOT-FOUND: ${report.statusCounts["NOT-FOUND"] || 0}`);
  } else {
    console.log("WARN smoke report missing; run npm run smoke:uxlivepanelpremium01 to refresh the PASS-minus zero snapshot.");
  }

  console.log("=== UX-SMOKE-PASS-MINUS-ZERO-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
