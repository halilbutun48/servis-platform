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

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

function hasNote(row, needle) {
  const target = normalize(needle);
  return Array.isArray(row.notes) && row.notes.some((note) => normalize(note).includes(target));
}

function evidenceBucket(row) {
  if (row.kind === "reviewQueue" && Number(row.checks?.reviewActionCount || 0) < 3) {
    return "review-gap";
  }
  if (row.kind === "routePreview" && row.checks?.compactRoutePreview === true) {
    return "route-preview";
  }
  if (
    row.kind === "commercialFlow" &&
    hasNote(row, "commercial flow accepted/applied bucket görünür")
  ) {
    return "commercial-bucket";
  }
  if (row.kind === "convertToAgreement" && row.checks?.convertedToAgreementDraft === true) {
    return "convert-draft";
  }
  if (row.kind === "liveMap" && row.route === "/#/parent/live" && (row.consoleErrors || []).length > 0) {
    return "console-noise";
  }
  if (row.kind === "liveMap" && Number(row.scrollHeight || 0) > 3200) {
    return "long-live-map";
  }
  if (row.kind === "parentOverview" && (row.consoleErrors || []).length > 0) {
    return "console-noise";
  }
  return null;
}

function main() {
  console.log("=== UX-SMOKE-PASS-MINUS-EVIDENCE-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md");

  mustContains(pkg, '"check:uxsmokepassminusevidence01"', "package.json exposes check:uxsmokepassminusevidence01");
  mustContains(
    pkg,
    '"check:uxlivepanelsmokeaudit01": "node backend/scripts/ux_live_panel_smoke_audit_01_check.js"',
    "package.json keeps the live panel smoke audit gate"
  );
  mustContains(
    runner,
    "'check:uxsmokepassminusevidence01'",
    "product extensions runner includes PASS-minus evidence check"
  );
  mustContains(
    verify,
    '"check:uxsmokepassminusevidence01"',
    "verify chain exposes PASS-minus evidence check"
  );
  mustContains(
    harnessCheck,
    "check:uxsmokepassminusevidence01",
    "script harness check knows PASS-minus evidence alias"
  );
  mustContains(
    harnessDoc,
    "check:uxsmokepassminusevidence01",
    "script harness doc exposes PASS-minus evidence alias"
  );
  mustContains(
    harnessDoc,
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "script harness doc registers PASS-minus evidence doc"
  );
  mustContains(
    guide,
    "UX-SMOKE-PASS-MINUS-EVIDENCE-01",
    "milestone guide mentions PASS-minus evidence milestone"
  );
  mustContains(
    guide,
    "check:uxsmokepassminusevidence01",
    "milestone guide exposes PASS-minus evidence check"
  );
  mustContains(
    guide,
    "node backend\\scripts\\ux_smoke_pass_minus_evidence_01_check.js",
    "milestone guide includes PASS-minus evidence command"
  );
  mustContains(doc, "UX-SMOKE-PASS-MINUS-EVIDENCE-01", "PASS-minus evidence doc title present");
  mustContains(doc, "PASS- classification", "PASS-minus evidence doc explains classification");
  mustContains(doc, "Sefer Abi launcher secondary copilot", "PASS-minus evidence doc keeps launcher caveat");
  mustContains(doc, "route preview compact card", "PASS-minus evidence doc keeps route-preview evidence");
  mustContains(doc, "accepted/applied bucket", "PASS-minus evidence doc keeps commercial evidence");
  mustContains(doc, "convertToAgreement", "PASS-minus evidence doc keeps conversion evidence");
  mustContains(doc, "long live-map", "PASS-minus evidence doc keeps live-map evidence");
  mustContains(doc, "console noise", "PASS-minus evidence doc keeps console noise evidence");

  if (fs.existsSync(reportJsonPath)) {
    const report = JSON.parse(fs.readFileSync(reportJsonPath, "utf8"));
    must(Array.isArray(report.routes), "smoke report keeps routes array");
    must(report.routeCount === report.routes.length, "smoke report route count matches rows");
    must(report.routeCount === 82, "smoke report keeps 82 route checks");
    must(report.statusCounts.BLOCKER === 0, "smoke report keeps blocker count at 0");
    must(report.statusCounts["NOT-FOUND"] === 0, "smoke report keeps not-found count at 0");

    const passMinusRows = report.routes.filter((row) => row.status === "PASS-");
    const uxFixRows = report.routes.filter((row) => row.status === "UX-FIX");
    must(passMinusRows.length > 0, "smoke report keeps PASS- evidence rows");
    must(uxFixRows.length > 0, "smoke report keeps UX-FIX rows");

    const bucketCounts = {};
    const uncategorized = [];
    for (const row of passMinusRows) {
      const bucket = evidenceBucket(row);
      if (!bucket) {
        uncategorized.push(`${row.role} ${row.route} ${row.viewport}`);
        continue;
      }
      bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
      must(
        row.notes.some((note) => normalize(note) !== "sefer abi launcher secondary copilot olarak gorunur."),
        `PASS- row keeps real evidence for ${row.route} (${row.viewport})`
      );
    }

    must(uncategorized.length === 0, `PASS- rows stay evidence-based (${passMinusRows.length})`);
    must(bucketCounts["review-gap"] >= 1, "PASS- inventory keeps review queue evidence");
    must(bucketCounts["route-preview"] >= 1, "PASS- inventory keeps route preview evidence");
    must(bucketCounts["commercial-bucket"] >= 1, "PASS- inventory keeps commercial flow evidence");
    must(bucketCounts["convert-draft"] >= 1, "PASS- inventory keeps company shift conversion evidence");
    must(bucketCounts["long-live-map"] >= 1, "PASS- inventory keeps long live-map evidence");
    must(bucketCounts["console-noise"] >= 1, "PASS- inventory keeps console noise evidence");

    console.log("OK PASS- evidence bucket summary:");
    for (const [bucket, count] of Object.entries(bucketCounts).sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`- ${bucket}: ${count}`);
    }
  } else {
    console.log("WARN smoke report missing; run npm run smoke:uxlivepanelpremium01 to refresh the PASS-minus evidence snapshot.");
  }

  console.log("=== UX-SMOKE-PASS-MINUS-EVIDENCE-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
