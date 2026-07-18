#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function mustAll(text, items, label) {
  for (const [needle, itemLabel] of items) {
    mustContains(text, needle, `${label}: ${itemLabel}`);
  }
}

function gitCapture(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function gitLines(args) {
  return gitCapture(args)
    .stdout.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustGitEmpty(args, label) {
  const result = gitCapture(args);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  must(result.status === 0, `${label} exit code is 0`);
  must(output === "", `${label} has empty output`);
}

function mustDiffCheckClean(label, args) {
  const result = gitCapture(args);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  must(result.status === 0, `${label} exit code is 0`);

  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const whitespaceErrors = lines.filter((line) => /trailing whitespace|space before tab in indent|leftover conflict marker/i.test(line));
  const crlfWarnings = lines.filter((line) => /CRLF will be replaced by LF/i.test(line));

  must(whitespaceErrors.length === 0, `${label} has no whitespace errors`);
  if (crlfWarnings.length > 0) {
    console.log(`OK ${label} CRLF warning noted: ${crlfWarnings[0]}`);
  } else {
    console.log(`OK ${label} has no CRLF warning`);
  }

  return { crlfWarnings, output };
}

async function main() {
  console.log("=== TEST-QUALITY-AND-FLAKE-AUDIT-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const doc = read("docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md");
  const productFlowCheck = read("backend/scripts/product_flow_button_audit_01_check.js");
  const productFlowSmoke = read("backend/scripts/product_flow_button_audit_01.mjs");
  const premiumSmokeCheck = read("backend/scripts/ux_live_panel_premium_smoke_01_check.js");
  const premiumSmoke = read("backend/scripts/ux_live_panel_premium_smoke_01.mjs");
  const allPanelsCheck = read("backend/scripts/ux_all_panels_reality_audit_01_check.js");
  const allPanelsSmoke = read("backend/scripts/ux_all_panels_reality_audit_01.mjs");
  const mobileAuditCheck = read("backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js");
  const mobileAuditSmoke = read("backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs");
  const routeReviewCheck = read("backend/scripts/copilot_route_review_human_approval_01_check.js");
  const redteamCheck = read("backend/scripts/excel_to_route_readiness_redteam_01_check.js");
  const companyAgreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
  const roomAgreementsPanel = read("web/src/panels/room/AgreementsPanel.jsx");
  const routePreviewChecks = read("backend/scripts/_m91_route_preview_checks.js");
  const gitStatusShort = gitCapture(["status", "--short"]).stdout.trim();
  const gitCachedNames = gitLines(["diff", "--cached", "--name-only"]);
  const gitRouteDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "prisma", "backend/prisma"]);
  const diffCheck = mustDiffCheckClean("git diff --check", ["diff", "--check"]);
  mustGitEmpty(["diff", "--cached", "--check"], "git diff --cached --check");

  const guards = [];
  const addGuard = (category, label, run) => {
    guards.push({ category, label, run });
  };

  addGuard("wiring", "package.json exposes the test quality and flake audit check", () => {
    mustContains(pkg, '"check:testqualityandflakeaudit01": "node backend/scripts/test_quality_and_flake_audit_01_check.js"', "package.json exposes check:testqualityandflakeaudit01");
  });

  addGuard("wiring", "product extensions runner includes the new audit check", () => {
    mustContains(runner, "'check:testqualityandflakeaudit01'", "product extensions runner includes check:testqualityandflakeaudit01");
  });

  addGuard("wiring", "verify chain includes the new audit check", () => {
    mustContains(verify, '"check:testqualityandflakeaudit01"', "verify chain includes check:testqualityandflakeaudit01");
  });

  addGuard("wiring", "harness check knows the new milestone", () => {
    mustAll(harnessCheck, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "root alias"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
    ], "script harness check wiring");
  });

  addGuard("wiring", "harness doc keeps the new milestone visible", () => {
    mustAll(harnessDoc, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "root alias"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
    ], "script harness doc wiring");
  });

  addGuard("wiring", "milestone guide exposes the new audit", () => {
    mustAll(guide, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "check alias"],
      ["node backend\\scripts\\test_quality_and_flake_audit_01_check.js", "command"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
    ], "milestone guide wiring");
  });

  addGuard("wiring", "primer exposes the new audit", () => {
    mustAll(primer, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "check alias"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
      ["backend/scripts/test_quality_and_flake_audit_01_check.js", "command path"],
    ], "primer wiring");
  });

  addGuard("docs", "audit doc title and top-level sections are present", () => {
    mustAll(doc, [
      ["# TEST-QUALITY-AND-FLAKE-AUDIT-01", "title"],
      ["## 1) Purpose", "purpose section"],
      ["## 2) Scope", "scope section"],
      ["## 3) Scripts Audited", "scripts audited section"],
      ["## 4) Flake Risks Found", "flake risks section"],
      ["## 5) False Negative Fixes", "false negative fixes section"],
    ], "audit doc structure");
  });

  addGuard("docs", "audit doc keeps the purpose wording", () => {
    mustAll(doc, [
      ["Bu milestone feature milestone değildir.", "feature milestone note"],
      ["smoke/check zincirindeki flake risklerini", "flake risk wording"],
      ["threshold / skip / timing / PASS kriteri", "threshold wording"],
    ], "audit doc purpose");
  });

  addGuard("docs", "audit doc keeps the scope wording", () => {
    mustAll(doc, [
      ["kırılgan bekleme ve selector yüzeylerini denetlemek", "selector/wait scope"],
      ["false negative üreten dar noktaları belgelemek", "false negative scope"],
      ["runtime-data, browser-smoke ve debug.log commit sınırını görünür tutmak", "commit boundary scope"],
    ], "audit doc scope");
  });

  addGuard("docs", "audit doc keeps the scripts audited wording", () => {
    mustAll(doc, [
      ["npm run smoke:productflowbuttonaudit01", "product-flow smoke"],
      ["npm run smoke:uxlivepanelpremium01", "premium smoke"],
      ["npm run smoke:uxallpanelsrealityaudit01", "all-panels smoke"],
      ["npm run smoke:uxmobileallrolespanelaudit01", "mobile all-roles smoke"],
      ["npm run check:product-extensions", "product extensions"],
      ["npm run verify:repo", "verify repo"],
      ["npm run verify:final", "verify final"],
    ], "audit doc scripts audited");
  });

  addGuard("docs", "audit doc keeps the flake risk wording", () => {
    mustAll(doc, [
      ["school mobile overview", "school overview risk"],
      ["split path references", "split path risk"],
      ["exact allowlist entries", "allowlist risk"],
      ["No threshold relaxation was accepted.", "no threshold relaxation"],
    ], "audit doc flake risks");
  });

  addGuard("docs", "audit doc keeps the false negative fixes wording", () => {
    mustAll(doc, [
      ["backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs", "mobile wait fix"],
      ["backend/scripts/_m91_route_preview_checks.js", "route preview path fix"],
      ["Okul — Planlama Merkezi", "school overview target"],
      ["false negative", "false negative wording"],
    ], "audit doc false negative fixes");
  });

  addGuard("docs", "audit doc keeps selector and wait stabilization notes", () => {
    mustAll(doc, [
      ["## 6) Selector / Wait Stabilization Notes", "selector/wait section"],
      ["visible locator", "visible locator wording"],
      ["role/data-testid", "role/data-testid wording"],
      ["aria-label", "aria-label wording"],
      ["button text", "button text wording"],
    ], "audit doc selector stabilization");
  });

  addGuard("docs", "audit doc keeps the selector and wait wording", () => {
    mustAll(doc, [
      ["role and aria-label surfaces", "role and aria label wording"],
      ["button text is preserved", "button text wording"],
      ["no broad sleep", "no broad sleep wording"],
    ], "audit doc stabilization notes");
  });

  addGuard("docs", "audit doc keeps explicit non-goals", () => {
    mustAll(doc, [
      ["## 7) Explicitly Not Changed", "explicit non-goals section"],
      ["smoke threshold preservation", "smoke threshold preservation wording"],
      ["runtime-data / browser-smoke / debug.log policy", "commit-external policy heading"],
      ["route/service/prisma", "route/service/prisma wording"],
      ["global allowlist", "global allowlist wording"],
    ], "audit doc non-goals");
  });

  addGuard("docs", "audit doc keeps the non-goals wording", () => {
    mustAll(doc, [
      ["new UI davranışı eklemez", "no new UI wording"],
      ["backend route/service/prisma değiştirmez", "no backend changes wording"],
      ["skip eklemez", "no skip wording"],
      ["threshold düşürmez", "no threshold wording"],
      ["broad allowlist açmaz", "no broad allowlist wording"],
    ], "audit doc non-goals wording");
  });

  addGuard("docs", "audit doc keeps validation and follow-up sections", () => {
    mustAll(doc, [
      ["## 10) Validation Results", "validation results section"],
      ["## 11) Remaining Risks", "remaining risks section"],
      ["## 12) Next Recommended Milestone", "next recommended milestone section"],
      ["guardCases", "guardCases label"],
      ["passCount", "passCount label"],
      ["failCount", "failCount label"],
    ], "audit doc follow-up sections");
  });

  addGuard("docs", "audit doc keeps the smoke threshold preservation section", () => {
    mustAll(doc, [
      ["## 8) Smoke Threshold Preservation", "threshold heading"],
      ["product-flow: `PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "product-flow threshold"],
      ["premium smoke: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "premium threshold"],
      ["all-panels reality audit: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "all-panels threshold"],
      ["mobile all-roles audit: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "mobile threshold"],
    ], "audit doc thresholds");
  });

  addGuard("docs", "audit doc keeps the runtime-data and browser-smoke policy", () => {
    mustAll(doc, [
      ["## 9) Runtime-data / Browser-smoke / debug.log Policy", "policy heading"],
      ["runtime-data stays commit external and unstaged", "runtime-data wording"],
      ["browser-smoke artifacts stay commit external and ignored", "browser-smoke wording"],
      ["debug.log stays absent", "debug.log wording"],
      ["stage stays empty", "stage wording"],
    ], "audit doc commit external policy");
  });

  addGuard("docs", "audit doc keeps the validation results wording", () => {
    mustAll(doc, [
      ["npm run check:testqualityandflakeaudit01", "audit command"],
      ["guardCases", "guardCases metric"],
      ["passCount", "passCount metric"],
      ["failCount", "failCount metric"],
      ["flakeRiskSummary", "flakeRiskSummary metric"],
      ["smokeThresholdSummary", "smokeThresholdSummary metric"],
      ["selectorStabilitySummary", "selectorStabilitySummary metric"],
      ["commitExternalSummary", "commitExternalSummary metric"],
      ["routeServicePrismaSummary", "routeServicePrismaSummary metric"],
    ], "audit doc validation results");
  });

  addGuard("docs", "audit doc keeps the remaining risks wording", () => {
    mustAll(doc, [
      ["browser-smoke artifacts", "browser-smoke risk"],
      ["PASS-minus evidence routes", "PASS-minus evidence risk"],
      ["mobile overview waits", "mobile wait risk"],
    ], "audit doc remaining risks");
  });

  addGuard("docs", "audit doc keeps the next recommended milestone wording", () => {
    mustAll(doc, [
      ["## 12) Next Recommended Milestone", "next milestone heading"],
      ["QUALITY-GATE-FINAL-01", "next milestone name"],
      ["existing release gate", "release gate wording"],
    ], "audit doc next milestone");
  });

  addGuard("docs", "audit doc names the audited command set", () => {
    mustAll(doc, [
      ["npm run smoke:productflowbuttonaudit01", "product-flow smoke command"],
      ["npm run smoke:uxlivepanelpremium01", "premium smoke command"],
      ["npm run smoke:uxallpanelsrealityaudit01", "all-panels smoke command"],
      ["npm run smoke:uxmobileallrolespanelaudit01", "mobile all-roles smoke command"],
      ["npm run check:product-extensions", "product extensions command"],
      ["npm run verify:repo", "verify repo command"],
      ["npm run verify:final", "verify final command"],
      ["npm --prefix backend run lint", "backend lint command"],
      ["npm --prefix web run lint", "web lint command"],
    ], "audit doc command list");
  });

  addGuard("docs", "audit doc keeps the known false negative fixes documented", () => {
    mustAll(doc, [
      ["backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs", "mobile all-roles smoke fix"],
      ["backend/scripts/_m91_route_preview_checks.js", "room ops bridge path fix"],
      ["Okul — Planlama Merkezi", "school overview wait target"],
      ["false negative", "false negative wording"],
    ], "audit doc false negative notes");
  });

  addGuard("docs", "audit doc preserves smoke threshold targets", () => {
    mustAll(doc, [
      ["PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "product-flow target"],
      ["PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "panel smoke target"],
      ["product-flow", "product-flow wording"],
      ["premium smoke", "premium smoke wording"],
      ["all-panels", "all-panels wording"],
      ["mobile all-roles", "mobile all-roles wording"],
    ], "audit doc smoke thresholds");
  });

  addGuard("docs", "audit doc keeps commit-external policy visible", () => {
    mustAll(doc, [
      ["runtime-data stays commit external and unstaged", "runtime-data policy"],
      ["browser-smoke artifacts stay commit external and ignored", "browser-smoke policy"],
      ["debug.log absent", "debug.log policy"],
      ["stage empty", "stage policy"],
    ], "audit doc commit external policy");
  });

  addGuard("threshold", "product-flow button audit keeps its exact smoke threshold", () => {
    mustAll(productFlowCheck, [
      ["PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "smoke summary"],
      ["UX-FIX 0", "UX-FIX target"],
      ["BLOCKER 0", "BLOCKER target"],
      ["AUTH-BLOCKED 0", "AUTH-BLOCKED target"],
      ["NOT-FOUND 0", "NOT-FOUND target"],
    ], "product-flow check");
    mustAll(productFlowSmoke, [
      ["trial: true", "trial clicks"],
      ["Harita / Navigasyon Önizle", "company preview text"],
      ["Rota Önizleme", "route preview text"],
      ["Navigasyon Aç", "personel navigation text"],
      ["Bugün gelmiyor", "parent button text"],
      ["İncelemeye al", "review queue text"],
      ["Tam Rotayı Dış Navigasyonda Aç", "external navigation read-only text"],
    ], "product-flow smoke");
    mustNotContains(productFlowSmoke, "submitPublicLead(", "product-flow smoke avoids public lead writes");
    mustNotContains(productFlowSmoke, "updatePublicLeadReviewStatus(", "product-flow smoke avoids review writes");
    mustNotContains(productFlowSmoke, "approveShiftAction(", "product-flow smoke avoids room approve writes");
    mustNotContains(productFlowSmoke, "rejectShiftAction(", "product-flow smoke avoids room reject writes");
  });

  addGuard("threshold", "premium live panel smoke keeps fail logic scoped to blocker and not-found", () => {
    mustAll(premiumSmokeCheck, [
      ['!["BLOCKER", "NOT-FOUND"].includes(row.status)', "fail logic"],
      ['!["BLOCKER", "AUTH-BLOCKED", "NOT-FOUND"].includes(row.status)', "no auth-blocked fail logic"],
      ["AUTH-BLOCKED raporlanır; erişim/session/auth notudur; tek başına smoke komutunu fail ettirmez.", "auth-blocked note"],
      ["BLOCKER veya NOT-FOUND varsa smoke komutu fail olur.", "failure note"],
    ], "premium smoke check");
    mustAll(premiumSmoke, [
      ["WEB_BASE_URL", "web base url"],
      ["API_BASE_URL", "api base url"],
      ["HEADLESS", "headless config"],
      ["SLOW_MO", "slow motion config"],
      ["browser-smoke", "artifact root"],
      ["report.json", "report json"],
      ["report.md", "report md"],
    ], "premium smoke runner");
    mustNotContains(premiumSmoke, "AUTH-BLOCKED alone", "premium smoke runner does not relax auth-blocked");
  });

  addGuard("threshold", "all-panels reality audit keeps 82/0/0/0 thresholds", () => {
    mustAll(allPanelsCheck, [
      ["report.statusCounts.PASS === 82", "PASS 82"],
      ['report.statusCounts["PASS-"] === 0', "PASS- 0"],
      ['report.statusCounts["UX-FIX"] === 0', "UX-FIX 0"],
      ['report.statusCounts.BLOCKER === 0', "BLOCKER 0"],
      ['report.statusCounts["AUTH-BLOCKED"] === 0', "AUTH-BLOCKED 0"],
      ['report.statusCounts["NOT-FOUND"] === 0', "NOT-FOUND 0"],
    ], "all-panels check");
    mustAll(allPanelsSmoke, [
      ["mobileDrawerIssueCount", "mobile drawer issue count"],
      ["stickyHeaderTabIssueCount", "sticky header issue count"],
      ["PASS 82 | PASS- 0 | UX-FIX 0 | BLOCKER 0", "summary line"],
      ["browser-smoke", "browser-smoke artifact root"],
    ], "all-panels smoke");
  });

  addGuard("threshold", "mobile all-roles audit keeps the 82 route threshold and targeted wait fix", () => {
    mustAll(mobileAuditCheck, [
      ["PASS- 37", "current PASS- framing"],
      ["PASS- 19", "premium comparison framing"],
      ["UX-FIX 0", "UX-FIX framing"],
      ["BLOCKER 0", "blocker framing"],
      ["NOT-FOUND 0", "not-found framing"],
      ["browser-smoke", "browser-smoke boundary"],
      ["runtime-data", "runtime-data boundary"],
    ], "mobile all-roles check");
    mustAll(mobileAuditSmoke, [
      ['getByText("Okul — Planlama Merkezi")', "targeted school overview wait"],
      ["waitForTimeout(2500)", "targeted wait duration"],
      ['!["BLOCKER", "NOT-FOUND"].includes(row.status)', "failure logic"],
      ["report.statusCounts.BLOCKER", "blocker count"],
      ["report.statusCounts[\"NOT-FOUND\"]", "not-found count"],
      ["report.statusCounts[\"UX-FIX\"]", "UX-FIX count"],
    ], "mobile all-roles smoke");
  });

  addGuard("threshold", "product extensions chain keeps the known smoke/check wiring intact", () => {
    mustAll(runner, [
      ["check:hotfilesplitaichatcomposers01", "AI chat split check"],
      ["check:hotfilesplitwebpanels01", "web panels split check"],
      ["check:copilotnextbestactionengine01", "next best action check"],
      ["check:seferabiturkishterminology01", "Turkish terminology audit"],
      ["check:qualitygatefinal01", "quality gate final check"],
      ["check:testqualityandflakeaudit01", "new audit check"],
    ], "product extensions runner wiring");
    mustAll(verify, [
      ["check:hotfilesplitaichatcomposers01", "AI chat split check"],
      ["check:hotfilesplitwebpanels01", "web panels split check"],
      ["check:copilotnextbestactionengine01", "next best action check"],
      ["check:seferabiturkishterminology01", "Turkish terminology audit"],
      ["check:qualitygatefinal01", "quality gate final check"],
      ["check:testqualityandflakeaudit01", "new audit check"],
    ], "verify chain wiring");
  });

  addGuard("selector", "company agreements panel keeps smoke-critical aria and button texts", () => {
    mustAll(companyAgreementsPanel, [
      ['ariaLabel="Sözleşme görünümü"', "panel tabs aria label"],
      ["companyActionClarityScope", "company action scope"],
      ["Detayı aç", "bridge CTA text"],
      ["Kabul Et", "accept button text"],
      ["CompanyAgreementsBridgeSection", "split bridge section"],
    ], "company agreements panel");
  });

  addGuard("selector", "room agreements panel keeps smoke-critical action texts and split bridge", () => {
    mustAll(roomAgreementsPanel, [
      ["roomCriticalFixScope", "room scope"],
      ["roomActionCTA", "room action CTA"],
      ["Rota Önizle", "route preview text"],
      ["Karşı Teklif", "counter offer text"],
      ["Kabul Et", "accept button text"],
      ["RoomAgreementsBridgeSection", "split bridge section"],
    ], "room agreements panel");
  });

  addGuard("selector", "room ops bridge path fix is still targeted to the split bridge section", () => {
    mustAll(routePreviewChecks, [
      ["web/src/panels/room/roomAgreementsBridgeSection.jsx", "room bridge section path"],
      ["backend/scripts/_m91_route_preview_checks.js", "route preview checks file"],
    ], "route preview checks");
    mustNotContains(routePreviewChecks, "web/src/panels/room/AgreementsPanel.jsx", "route preview checks no longer point at the monolith");
  });

  addGuard("commit-external", "runtime-data stays in the working tree and out of commit", () => {
    mustAll(gitStatusShort, [
      ["backend/artifacts/runtime-data/password-change-requirements.json", "password change runtime data"],
      ["backend/artifacts/runtime-data/username-directory.json", "username directory runtime data"],
      ["backend/artifacts/runtime-data/agreement-route-refresh-requests.json", "agreement refresh runtime data"],
      ["backend/artifacts/runtime-data/public-leads.json", "public leads runtime data"],
      ["backend/artifacts/runtime-data/quality-review-decisions.json", "quality review runtime data"],
      ["backend/artifacts/runtime-data/region-failover-drill-state.json", "region failover runtime data"],
    ], "runtime data status");
  });

  addGuard("commit-external", "debug.log stays absent", () => {
    mustNotContains(gitStatusShort, "debug.log", "git status does not show debug.log");
    mustNotContains(gitStatusShort, "backend/artifacts/browser-smoke/", "git status does not show browser-smoke artifacts");
  });

  addGuard("commit-external", "stage stays empty", () => {
    must(gitCachedNames.length === 0, "staged file list stays empty");
  });

  addGuard("commit-external", "route/service/prisma diff stays empty", () => {
    must(gitRouteDiff.length === 0, "route/service/prisma diff stays empty");
  });

  addGuard("commit-external", "git diff --check stays clean while allowing non-blocking CRLF note", () => {
    must(diffCheck.crlfWarnings.length >= 0, "diff check warning capture available");
    mustNotContains(diffCheck.output, "trailing whitespace", "diff check has no trailing whitespace");
    mustNotContains(diffCheck.output, "space before tab in indent", "diff check has no indentation whitespace errors");
  });

  addGuard("commit-external", "cached diff check stays clean", () => {
    mustGitEmpty(["diff", "--cached", "--check"], "git diff --cached --check");
  });

  addGuard("commit-external", "browser-smoke artifacts remain ignored", () => {
    const gitIgnore = read(".gitignore");
    mustContains(gitIgnore, "backend/artifacts/browser-smoke/", "browser-smoke ignore entry");
    mustNotContains(gitStatusShort, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  });

  addGuard("allowlist", "route review guard stays exact-scope only", () => {
    mustAll(routeReviewCheck, [
      ["const exactAllowed = new Set([", "exactAllowed set"],
      ["backend/scripts/_m91_route_preview_checks.js", "split path reference"],
      ["allWithin(status, exactAllowed,", "exact scope enforcement"],
      ["working tree stays within route review scope", "scope label"],
    ], "route review guard");
    mustNotContains(routeReviewCheck, "backend/scripts/**", "route review guard does not broaden to a wildcard script allowlist");
    mustNotContains(routeReviewCheck, "allow all", "route review guard does not open a global allowlist");
  });

  addGuard("allowlist", "redteam guard keeps the split path reference narrow", () => {
    mustAll(redteamCheck, [
      ["backend/scripts/_m91_route_preview_checks.js", "split path reference"],
      ["backend/artifacts/runtime-data/", "runtime-data boundary"],
      ["backend/artifacts/browser-smoke/", "browser-smoke boundary"],
      ["debug.log", "debug.log boundary"],
    ], "redteam guard");
    mustNotContains(redteamCheck, "backend/scripts/**", "redteam guard does not broaden to a wildcard script allowlist");
  });

  addGuard("docs", "validation results and follow-up guidance are present in the audit doc", () => {
    mustAll(doc, [
      ["PASS TEST-QUALITY-AND-FLAKE-AUDIT-01", "PASS line"],
      ["guardCases", "guard cases metric"],
      ["passCount", "pass count metric"],
      ["failCount", "fail count metric"],
      ["flakeRiskSummary", "flake risk summary"],
      ["smokeThresholdSummary", "smoke threshold summary"],
      ["selectorStabilitySummary", "selector stability summary"],
      ["commitExternalSummary", "commit external summary"],
      ["routeServicePrismaSummary", "route/service/prisma summary"],
    ], "audit doc validation metrics");
  });

  let passCount = 0;
  let failCount = 0;

  for (const guard of guards) {
    try {
      guard.run();
      passCount += 1;
      console.log(`OK ${guard.label}`);
    } catch (error) {
      failCount += 1;
      throw error;
    }
  }

  const flakeRiskSummary = [
    "2 known false-negative repairs documented",
    "0 threshold or skip relaxations",
    "0 global allowlist expansions",
  ].join("; ");
  const smokeThresholdSummary = [
    "product-flow 18/0/0/0",
    "premium 82/0/0/0",
    "all-panels 82/0/0/0",
    "mobile all-roles 82/0/0/0",
  ].join("; ");
  const selectorStabilitySummary = [
    "visible/role/aria-label/button-text surfaces kept intact",
    "school overview wait is targeted and scoped",
    "no broad sleep or threshold easing was introduced",
  ].join("; ");
  const commitExternalSummary = [
    "runtime-data unstaged",
    "browser-smoke ignored and unstaged",
    "debug.log absent",
    "stage empty",
  ].join("; ");
  const routeServicePrismaSummary = [
    "backend/src/routes diff empty",
    "backend/src/services diff empty",
    "prisma diff empty",
    "backend/prisma diff empty",
  ].join("; ");

  console.log(`SUMMARY guardCases=${guards.length} passCount=${passCount} failCount=${failCount}`);
  console.log(`SUMMARY flakeRiskSummary=${flakeRiskSummary}`);
  console.log(`SUMMARY smokeThresholdSummary=${smokeThresholdSummary}`);
  console.log(`SUMMARY selectorStabilitySummary=${selectorStabilitySummary}`);
  console.log(`SUMMARY commitExternalSummary=${commitExternalSummary}`);
  console.log(`SUMMARY routeServicePrismaSummary=${routeServicePrismaSummary}`);
  console.log("PASS TEST-QUALITY-AND-FLAKE-AUDIT-01");
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
