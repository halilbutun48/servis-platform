#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
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

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stagedNames() {
  return gitLines(["diff", "--cached", "--name-only"]).map((line) => line.replace(/\\/g, "/"));
}

function statusNames() {
  const out = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function mustNotList(files, needle, label) {
  if (files.some((file) => normalize(file).includes(normalize(needle)))) fail(label);
  ok(label);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function main() {
  console.log("=== UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md");
  const app = read("web/src/App.jsx");
  const appShell = read("web/src/layout/AppShell.jsx");
  const agreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
  const bridgeCard = read("web/src/components/AgreementOpsBridgeCard.jsx");
  const css = read("web/src/index.css");

  mustTrue(exists("backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js"), "agreements detail check exists");
  mustTrue(exists("docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md"), "agreements detail doc exists");

  must(pkg, '"check:uxpremiumcriticalfixagreementsdetail01": "node backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js"', "package.json exposes agreements detail check");
  ordered(
    runner,
    ["check:uxcompanymobileactionclarity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxcompanyopspaneltabs01"],
    "product extensions runner keeps agreements detail after company mobile action clarity"
  );
  ordered(
    verify,
    ["check:uxcompanymobileactionclarity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxcompanyopspaneltabs01"],
    "verify chain keeps agreements detail after company mobile action clarity"
  );

  must(harnessCheck, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "script harness check knows agreements detail milestone");
  must(harnessCheck, "check:uxpremiumcriticalfixagreementsdetail01", "script harness check knows agreements detail alias");
  must(harnessCheck, "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md", "script harness check knows agreements detail doc");
  must(harnessDoc, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "script harness doc lists agreements detail milestone");
  must(harnessDoc, "check:uxpremiumcriticalfixagreementsdetail01", "script harness doc lists agreements detail alias");
  must(harnessDoc, "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md", "script harness doc lists agreements detail doc");

  must(guide, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "milestone guide mentions agreements detail milestone");
  must(guide, "check:uxpremiumcriticalfixagreementsdetail01", "milestone guide exposes agreements detail check");
  must(guide, "node backend\\scripts\\ux_premium_critical_fix_agreements_detail_01_check.js", "milestone guide includes agreements detail command");
  must(guide, "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md", "milestone guide includes agreements detail doc");

  must(doc, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "agreements detail doc title present");
  must(doc, "Company / Sözleşmeler", "agreements detail doc covers company agreements surface");
  must(doc, "Organization / Sözleşmeler", "agreements detail doc covers organization agreements surface");
  must(doc, "School / Sözleşmeler", "agreements detail doc covers school agreements surface");
  must(doc, "Önizlemeyi aç", "agreements detail doc keeps list preview CTA wording");
  must(doc, "Detayı aç", "agreements detail doc keeps visible detail CTA wording");
  must(doc, "Taslağı incele", "agreements detail doc keeps draft wording");
  must(doc, "Önizlemeyi aç", "agreements detail doc keeps preview wording");
  must(doc, "Bu alan önizlemedir; işlem başlatmaz.", "agreements detail doc keeps readonly preview wording");
  must(doc, "navDock", "agreements detail doc mentions navDock safety");
  must(doc, "safe-area", "agreements detail doc mentions safe-area");
  must(doc, "z-index", "agreements detail doc mentions z-index safety");
  must(doc, "readonly preview", "agreements detail doc keeps readonly boundary wording");
  must(doc, "business flow", "agreements detail doc keeps no-business-flow wording");

  must(agreementsPanel, "companyActionClarityScope", "agreements panel uses company action clarity scope");
  must(agreementsPanel, "Detay ve önizleme", "agreements panel exposes detail preview card");
  must(agreementsPanel, "Detayı aç", "agreements panel exposes visible detail CTA");
  must(agreementsPanel, "Bu alan önizlemedir; işlem başlatmaz.", "agreements panel keeps readonly preview boundary");
  must(agreementsPanel, "viewMode === \"bridge\"", "agreements panel keeps bridge view");
  must(agreementsPanel, "defaultOpen={true}", "agreements panel opens bridge details by default");

  must(bridgeCard, "Detayı aç", "agreement ops bridge card keeps visible detail CTA");
  must(bridgeCard, "Taslağı incele", "agreement ops bridge card keeps draft CTA");
  must(bridgeCard, "Operasyon kaydını aç", "agreement ops bridge card keeps operation CTA");
  must(bridgeCard, "Detayı kapat", "agreement ops bridge card keeps close toggle wording");
  must(bridgeCard, "Bu alan önizlemedir; işlem başlatmaz.", "agreement ops bridge card keeps readonly preview boundary");
  must(bridgeCard, "useState(true)", "agreement ops bridge card opens details by default");

  must(app, "/company/agreements", "app routes company agreements");
  must(app, "/organization/agreements", "app routes organization agreements");
  must(app, "/school/agreements", "app routes school agreements");
  must(app, "CompanyAgreementsPanel", "app routes agreements aliases to company agreements panel");
  must(appShell, "shell--agreements-detail", "app shell keeps agreements detail shell class");
  must(appShell, "isAgreementsDetailRoute", "app shell computes agreements detail route flag");

  must(css, ".companyActionClarityScope", "global css keeps company action scope");
  must(css, ".companyActionClarityScope .btn.primary", "global css keeps primary CTA safety");
  must(css, ".companyActionClarityScope .btn.sm.primary", "global css keeps small primary CTA safety");
  must(css, "z-index: 4305", "global css keeps z-index clearance");
  must(css, "scroll-margin-bottom: calc(220px + env(safe-area-inset-bottom))", "global css keeps scroll margin");
  must(css, "safe-area-inset-bottom", "global css keeps safe-area padding");

  const staged = stagedNames();
  const stagedAllowed = new Set([
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/layout/AppShell.jsx",
    "tools/repo_contract_state.json",
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within agreements detail validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames();
  const exactAllowed = new Set([
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/layout/AppShell.jsx",
    "web/src/index.css",
    "tools/repo_contract_state.json",
  ]);
  allWithin(status, exactAllowed, ["backend/artifacts/runtime-data/"], "working tree stays within agreements detail scope");

  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  mustNotList(status, "web/src/panels/room/", "room surfaces are untouched");
  mustNotList(status, "web/src/panels/driver/", "driver surfaces are untouched");
  mustNotList(status, "web/src/panels/superadmin/", "superadmin surfaces are untouched");

  console.log("=== UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
