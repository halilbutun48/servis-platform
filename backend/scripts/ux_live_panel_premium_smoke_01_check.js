#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";
import { PREMIUM_SMOKE_COVERAGE_SOURCES, buildPremiumSmokeEvidenceSourceFiles, mustSmokeEvidenceIdentity } from "./lib/guardSmokeEvidence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const read = (relPath) => fs.readFileSync(path.join(repoRoot, relPath), "utf8");
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
const must = (cond, label) => {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
};
const has = (text, needle) => String(text).includes(needle);
const notHas = (text, needle) => !String(text).includes(needle);

const pkg = read("package.json");
const smoke = read("backend/scripts/ux_live_panel_premium_smoke_01.mjs");
const referenceCard = read("web/src/panels/shared/ExternalReferenceCard.jsx");
const doc = read("docs/UX_LIVE_PANEL_PREMIUM_SMOKE_01.md");
const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const gitCached = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repoRoot, encoding: "utf8", shell: true }).trim();
const gitIgnore = read(".gitignore");
const packageLock = fs.existsSync(path.join(repoRoot, "package-lock.json")) ? read("package-lock.json") : "";
const reportJsonPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

must(has(pkg, '"smoke:uxlivepanelpremium01": "node backend/scripts/ux_live_panel_premium_smoke_01.mjs"'), "package.json exposes smoke:uxlivepanelpremium01");
must(has(pkg, '"check:uxlivepanelpremiumsmoke01": "node backend/scripts/ux_live_panel_premium_smoke_01_check.js"'), "package.json exposes check:uxlivepanelpremiumsmoke01");
must(has(packageLock, "@playwright/test"), "package-lock keeps @playwright/test");

must(has(smoke, "WEB_BASE_URL"), "smoke script reads WEB_BASE_URL");
must(has(smoke, "API_BASE_URL"), "smoke script reads API_BASE_URL");
must(has(smoke, "HEADLESS"), "smoke script reads HEADLESS");
must(has(smoke, "SLOW_MO"), "smoke script reads SLOW_MO");
must(has(smoke, "browser-smoke") && has(smoke, "UX_LIVE_PANEL_PREMIUM_SMOKE_01"), "smoke script writes browser-smoke artifact root");
must(has(smoke, "report.json"), "smoke script writes report.json");
must(has(smoke, "report.md"), "smoke script writes report.md");
must(has(smoke, "desktop"), "smoke script includes desktop viewport");
must(has(smoke, "mobile"), "smoke script includes mobile viewport");
must(has(smoke, "console"), "smoke script captures console errors");
must(has(smoke, "pageerror"), "smoke script captures page errors");
must(has(smoke, "runRoomFinancialOperationsAdvancedAssertion"), "smoke script checks ROOM advanced finance text");
must(has(smoke, "runCompanyFinancialOperationsAdvancedAssertion"), "smoke script checks COMPANY advanced finance text");
must(has(smoke, "targetContributionBps"), "smoke script checks target contribution raw key");
must(has(smoke, "riskReserveBps"), "smoke script checks risk reserve raw key");
must(has(smoke, "budgetAmountMinor"), "smoke script checks budget amount raw key");
must(has(smoke, "warningThresholdBps"), "smoke script checks warning threshold raw key");
must(has(smoke, "draft_budget"), "smoke script checks draft budget raw code");
must(has(smoke, "systemFieldInputLabels"), "smoke script checks system fields are not editable");
must(has(smoke, "Hedef katkı oranı"), "smoke script checks target contribution Turkish label");
must(has(smoke, "Risk payı"), "smoke script checks risk reserve Turkish label");
must(has(smoke, "Bütçe ayrıntıları"), "smoke script checks company advanced Turkish label");
must(has(smoke, "Bütçe kaynağı"), "smoke script checks company source Turkish label");
must(has(smoke, "financeAssertions"), "smoke report keeps finance assertions");
must(has(smoke, "runExternalReferenceDataAvailableAssertion"), "smoke script checks external reference available state");
must(has(smoke, "externalReferenceAssertions"), "smoke report keeps external reference assertions");
must(has(referenceCard, "Piyasa referansı henüz mevcut değil."), "reference card keeps honest no-data state");
must(has(referenceCard, "Bu bilgi gerçek maliyetinizin veya sözleşme tutarınızın yerine geçmez."), "reference card keeps no-substitution authority note");
must(has(smoke, "Tarayıcı doğrulama kaynağı"), "smoke checks isolated available reference fixture");
must(has(smoke, '!["BLOCKER", "NOT-FOUND"].includes(row.status)'), "smoke command only fails on blocker and 404 outcomes");
must(notHas(smoke, '!["BLOCKER", "AUTH-BLOCKED", "NOT-FOUND"].includes(row.status)'), "smoke command no longer fails on AUTH-BLOCKED alone");

must(has(doc, "UX-LIVE-PANEL-PREMIUM-SMOKE-01"), "docs title present");
must(has(doc, "smoke:uxlivepanelpremium01"), "docs expose smoke alias");
must(has(doc, "check:uxlivepanelpremiumsmoke01"), "docs expose check alias");
must(has(doc, "backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/"), "docs document artifact root");
must(has(doc, "report.json"), "docs mention report.json");
must(has(doc, "report.md"), "docs mention report.md");
must(has(doc, "PASS"), "docs keep PASS status");
must(has(doc, "PASS-"), "docs keep PASS- status");
must(has(doc, "UX-FIX"), "docs keep UX-FIX status");
must(has(doc, "BLOCKER"), "docs keep BLOCKER status");
must(has(doc, "AUTH-BLOCKED"), "docs keep AUTH-BLOCKED status");
must(has(doc, "NOT-FOUND"), "docs keep NOT-FOUND status");
must(has(doc, "AUTH-BLOCKED raporlanır; erişim/session/auth notudur; tek başına smoke komutunu fail ettirmez."), "docs explain AUTH-BLOCKED as a non-failing access note");
must(has(doc, "BLOCKER veya NOT-FOUND varsa smoke komutu fail olur."), "docs explain BLOCKER and NOT-FOUND as failing outcomes");
must(has(doc, "WEB_BASE_URL=http://127.0.0.1:5173"), "docs document WEB_BASE_URL");
must(has(doc, "API_BASE_URL=http://127.0.0.1:3000"), "docs document API_BASE_URL");
must(has(doc, "npx playwright install chromium"), "docs document chromium install");
must(has(doc, "npm i -D @playwright/test"), "docs document playwright dependency install");
must(has(doc, "payment execute"), "docs keep forbidden payment execute boundary");
must(has(doc, "billing execute"), "docs keep forbidden billing execute boundary");
must(has(doc, "collection execute"), "docs keep forbidden collection execute boundary");
must(has(doc, "contract execute/sign"), "docs keep forbidden contract execute boundary");
must(has(doc, "invite send"), "docs keep forbidden invite send boundary");
must(has(doc, "user create"), "docs keep forbidden user create boundary");
must(has(doc, "supplier verification auto"), "docs keep forbidden supplier verification boundary");
must(has(doc, "settlement execute"), "docs keep forbidden settlement execute boundary");

must(has(guide, "UX-LIVE-PANEL-PREMIUM-SMOKE-01"), "milestone guide mentions premium smoke milestone");
must(has(guide, "check:uxlivepanelpremiumsmoke01"), "milestone guide exposes premium smoke check");
must(has(guide, "node backend\\scripts\\ux_live_panel_premium_smoke_01.mjs"), "milestone guide includes premium smoke command");
must(has(guide, "backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01"), "milestone guide documents browser-smoke artifacts");

assertProductExtensionsIncludes("check:uxlivepanelpremiumsmoke01", "product extensions registry includes premium smoke check");
must(has(verify, "check:uxlivepanelpremiumsmoke01"), "verify chain includes premium smoke check");
must(has(harnessCheck, "UX-LIVE-PANEL-PREMIUM-SMOKE-01"), "script harness check knows premium smoke milestone");
must(has(harnessCheck, "docs/UX_LIVE_PANEL_PREMIUM_SMOKE_01.md"), "script harness check knows premium smoke doc");
must(has(harnessCheck, "check:uxlivepanelpremiumsmoke01"), "script harness check knows premium smoke alias");
must(has(harnessCheck, "smoke:uxlivepanelpremium01"), "script harness check knows premium smoke runner");
must(has(harnessDoc, "UX-LIVE-PANEL-PREMIUM-SMOKE-01"), "script harness doc mentions premium smoke milestone");
must(has(harnessDoc, "docs/UX_LIVE_PANEL_PREMIUM_SMOKE_01.md"), "script harness doc registers premium smoke doc");

must(has(gitIgnore, "backend/artifacts/browser-smoke/"), "gitignore keeps browser-smoke artifacts ignored");
must(notHas(gitCached, "backend/artifacts/runtime-data"), "runtime-data is not staged");
must(notHas(gitCached, "public-leads.json"), "public-leads runtime data is not staged");
must(notHas(gitCached, "backend/artifacts/browser-smoke"), "browser-smoke artifacts are not staged");

must(fs.existsSync(reportJsonPath), "premium smoke report exists");
const report = readJson(reportJsonPath);
must(Array.isArray(report.financeAssertions), "premium smoke report keeps finance assertions");
for (const assertion of report.financeAssertions) {
  must(assertion.passed === true, `${assertion.scope} finance advanced assertion passes for ${assertion.viewport}`);
  must(assertion.rawFieldKeyVisibleCount === 0, `${assertion.scope} finance advanced raw field key count is zero for ${assertion.viewport}`);
  must(assertion.rawInternalCodeVisibleCount === 0, `${assertion.scope} finance advanced raw internal code count is zero for ${assertion.viewport}`);
  must(assertion.minorTokenVisibleCount === 0, `${assertion.scope} finance advanced minor token count is zero for ${assertion.viewport}`);
  must(assertion.bpsTokenVisibleCount === 0, `${assertion.scope} finance advanced bps token count is zero for ${assertion.viewport}`);
  must(assertion.externalReferenceVisible === true, `${assertion.scope} external reference card is visible for ${assertion.viewport}`);
  must(assertion.externalReferenceNoDataVisible === true || assertion.externalReferenceValueVisible === true, `${assertion.scope} external reference is honestly available or explicitly no-data for ${assertion.viewport}`);
  must(assertion.externalReferenceRawTokensVisible?.length === 0, `${assertion.scope} external reference raw tokens are hidden for ${assertion.viewport}`);
  must(assertion.consoleErrors?.length === 0, `${assertion.scope} finance advanced console errors are zero for ${assertion.viewport}`);
  must(assertion.pageErrors?.length === 0, `${assertion.scope} finance advanced page errors are zero for ${assertion.viewport}`);
}
must(Array.isArray(report.externalReferenceAssertions), "premium smoke report keeps external reference assertions");
for (const assertion of report.externalReferenceAssertions) {
  must(assertion.passed === true, `${assertion.scope} external reference available-state assertion passes for ${assertion.viewport}`);
  must(assertion.referenceRequests > 0, `${assertion.scope} external reference fixture was requested for ${assertion.viewport}`);
  must(assertion.rawTokensVisible?.length === 0, `${assertion.scope} external reference available-state raw tokens are hidden for ${assertion.viewport}`);
  must(assertion.consoleErrors?.length === 0, `${assertion.scope} external reference console errors are zero for ${assertion.viewport}`);
  must(assertion.pageErrors?.length === 0, `${assertion.scope} external reference page errors are zero for ${assertion.viewport}`);
}
mustSmokeEvidenceIdentity(
  report,
  {
    repoRoot,
    sourceFiles: buildPremiumSmokeEvidenceSourceFiles(),
    schemaPath: "backend/prisma/schema.prisma",
  },
  "premium smoke report identity"
);
if (Array.isArray(report.coverageSources)) {
  for (const source of PREMIUM_SMOKE_COVERAGE_SOURCES) {
    must(report.coverageSources.includes(source), `premium smoke report keeps coverage source ${source}`);
  }
}

must(notHas(doc, "payment execute açma"), "doc avoids action wording for payment execute");
must(notHas(doc, "billing execute açma"), "doc avoids action wording for billing execute");
must(notHas(doc, "invite send açma"), "doc avoids action wording for invite send");

console.log("=== UX-LIVE-PANEL-PREMIUM-SMOKE-01 CHECK PASS ===");
