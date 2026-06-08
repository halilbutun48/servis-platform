#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const allRolesReportPath = path.join(
  root,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01",
  "report.json"
);

const premiumReportPath = path.join(
  root,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function must(cond, label) {
  if (!cond) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(String(text).includes(needle), label);
}

function mustNotContains(text, needle, label) {
  must(!String(text).includes(needle), label);
}

function assertRows(report, label, expectedCounts, expectedRows) {
  must(Array.isArray(report.routes), `${label} keeps routes array`);
  must(report.routeCount === report.routes.length, `${label} routeCount matches rows`);
  must(report.routeCount === 82, `${label} keeps 82 route checks`);
  must(report.statusCounts.PASS === expectedCounts.PASS, `${label} keeps PASS count`);
  must(report.statusCounts["PASS-"] === expectedCounts["PASS-"], `${label} keeps PASS- count`);
  must(report.statusCounts["UX-FIX"] === expectedCounts["UX-FIX"], `${label} keeps UX-FIX count`);
  must(report.statusCounts.BLOCKER === expectedCounts.BLOCKER, `${label} keeps BLOCKER count`);
  must(report.statusCounts["AUTH-BLOCKED"] === expectedCounts["AUTH-BLOCKED"], `${label} keeps AUTH-BLOCKED count`);
  must(report.statusCounts["NOT-FOUND"] === expectedCounts["NOT-FOUND"], `${label} keeps NOT-FOUND count`);
  must(
    report.statusCounts.PASS +
      report.statusCounts["PASS-"] +
      report.statusCounts["UX-FIX"] +
      report.statusCounts.BLOCKER +
      report.statusCounts["AUTH-BLOCKED"] +
      report.statusCounts["NOT-FOUND"] ===
      report.routeCount,
    `${label} status buckets cover all routes`
  );
  must(report.statusCounts["PASS-"] === expectedRows.length, `${label} keeps PASS- row count`);

  for (const row of expectedRows) {
    must(
      report.routes.some((entry) => entry.route === row.route && entry.viewport === row.viewport),
      `${label} lists PASS- route ${row.route} (${row.viewport})`
    );
  }
}

function main() {
  console.log("=== MOBILE-WEB-FINAL-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/MOBILE_WEB_FINAL_01.md");
  const allRolesCheck = read("backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js");
  const premiumCheck = read("backend/scripts/ux_live_panel_premium_smoke_01_check.js");
  const passMinusCheck = read("backend/scripts/ux_smoke_pass_minus_evidence_01_check.js");

  mustContains(pkg, '"check:mobilewebfinal01": "node backend/scripts/mobile_web_final_01_check.js"', "package.json exposes mobile web final check");
  mustContains(runner, "'check:mobilewebfinal01'", "product extensions runner includes mobile web final check");
  mustContains(verify, '"check:mobilewebfinal01"', "verify chain exposes mobile web final check");
  mustContains(harnessCheck, "MOBILE-WEB-FINAL-01", "script harness check knows mobile web final milestone");
  mustContains(harnessCheck, "check:mobilewebfinal01", "script harness check knows mobile web final alias");
  mustContains(harnessCheck, "docs/MOBILE_WEB_FINAL_01.md", "script harness check knows mobile web final doc");
  mustContains(harnessDoc, "MOBILE-WEB-FINAL-01", "script harness doc lists mobile web final milestone");
  mustContains(harnessDoc, "check:mobilewebfinal01", "script harness doc lists mobile web final alias");
  mustContains(harnessDoc, "docs/MOBILE_WEB_FINAL_01.md", "script harness doc lists mobile web final doc");
  mustContains(guide, "MOBILE-WEB-FINAL-01", "milestone guide mentions mobile web final milestone");
  mustContains(guide, "check:mobilewebfinal01", "milestone guide exposes mobile web final check");
  mustContains(guide, "node backend\\scripts\\mobile_web_final_01_check.js", "milestone guide includes mobile web final command");
  mustContains(guide, "docs/MOBILE_WEB_FINAL_01.md", "milestone guide includes mobile web final doc");

  mustContains(doc, "MOBILE-WEB-FINAL-01", "mobile final doc title present");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "mobile final doc keeps all-roles snapshot");
  mustContains(doc, "PASS 67 / PASS- 15 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "mobile final doc keeps premium snapshot");
  mustContains(doc, "PASS- remaining routes", "mobile final doc keeps final risk wording");
  mustContains(doc, "final risk", "mobile final doc keeps final risk wording");
  mustContains(doc, "backlog", "mobile final doc keeps backlog wording");
  mustContains(doc, "Sefer Abi launcher", "mobile final doc keeps launcher ruling");
  mustContains(doc, "NavDock", "mobile final doc keeps NavDock ruling");
  mustContains(doc, "UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01", "mobile final doc keeps company personel access milestone");
  mustContains(doc, "horizontal overflow", "mobile final doc keeps overflow ruling");
  mustContains(doc, "sticky tabs", "mobile final doc keeps sticky tabs ruling");
  mustContains(doc, "UX-FIX 0", "mobile final doc keeps UX-FIX acceptance");
  mustContains(doc, "BLOCKER 0", "mobile final doc keeps blocker acceptance");
  mustContains(doc, "NOT-FOUND 0", "mobile final doc keeps not-found acceptance");
  mustContains(doc, "AUTH-BLOCKED 0", "mobile final doc keeps auth-blocked acceptance");
  mustContains(doc, "runtime-data", "mobile final doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "mobile final doc keeps browser-smoke boundary");
  mustContains(doc, "backend/src/routes", "mobile final doc keeps backend route boundary");
  mustContains(doc, "backend/src/services", "mobile final doc keeps backend service boundary");
  mustContains(doc, "prisma", "mobile final doc keeps prisma boundary");
  mustContains(doc, "backend/prisma", "mobile final doc keeps backend prisma boundary");
  mustContains(doc, "no Prisma/schema/migration", "mobile final doc keeps schema boundary wording");
  mustContains(doc, "no route/service/schema", "mobile final doc keeps route/service/schema boundary wording");
  mustNotContains(doc, "force push", "mobile final doc avoids force push wording");
  mustNotContains(doc, "tag taşıma", "mobile final doc avoids tag rewrite wording");

  if (!fs.existsSync(allRolesReportPath)) {
    throw new Error("FAIL mobile final check missing all-roles audit report");
  }
  if (!fs.existsSync(premiumReportPath)) {
    throw new Error("FAIL mobile final check missing premium smoke report");
  }

  const allRolesReport = readJson(allRolesReportPath);
  const premiumReport = readJson(premiumReportPath);

  assertRows(
    allRolesReport,
    "mobile all-roles audit report",
    { PASS: 82, "PASS-": 0, "UX-FIX": 0, BLOCKER: 0, "AUTH-BLOCKED": 0, "NOT-FOUND": 0 },
    []
  );

  assertRows(
    premiumReport,
    "mobile premium smoke report",
    { PASS: 67, "PASS-": 15, "UX-FIX": 0, BLOCKER: 0, "AUTH-BLOCKED": 0, "NOT-FOUND": 0 },
    [
      { route: "/#/superadmin/onboarding-review", viewport: "desktop" },
      { route: "/#/superadmin/onboarding-review", viewport: "mobile" },
      { route: "/#/room/commercial-flow", viewport: "desktop" },
      { route: "/#/room/operation-health", viewport: "desktop" },
      { route: "/#/room/commercial-flow", viewport: "mobile" },
      { route: "/#/room/operation-health", viewport: "mobile" },
      { route: "/#/company/shifts", viewport: "desktop" },
      { route: "/#/company/commercial-flow", viewport: "desktop" },
      { route: "/#/company/shifts", viewport: "mobile" },
      { route: "/#/company/commercial-flow", viewport: "mobile" },
      { route: "/#/school/commercial-flow", viewport: "desktop" },
      { route: "/#/school/commercial-flow", viewport: "mobile" },
      { route: "/#/organization/commercial-flow", viewport: "desktop" },
      { route: "/#/organization/commercial-flow", viewport: "mobile" },
      { route: "/#/personel/live", viewport: "mobile" },
    ]
  );

  mustContains(allRolesCheck, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01", "mobile final check keeps all-roles audit reference");
  mustContains(allRolesCheck, "browser-smoke", "mobile final check keeps all-roles browser-smoke boundary");
  mustContains(premiumCheck, "UX-LIVE-PANEL-PREMIUM-SMOKE-01", "mobile final check keeps premium smoke reference");
  mustContains(premiumCheck, "browser-smoke", "mobile final check keeps premium browser-smoke boundary");
  mustContains(passMinusCheck, "PASS- classification", "mobile final check keeps PASS-minus evidence reference");
  mustContains(passMinusCheck, "review queue evidence", "mobile final check keeps review evidence reference");
  mustContains(passMinusCheck, "route preview", "mobile final check keeps route preview evidence reference");
  mustContains(passMinusCheck, "commercial flow", "mobile final check keeps commercial evidence reference");
  mustContains(passMinusCheck, "convertToAgreement", "mobile final check keeps conversion evidence reference");
  mustContains(passMinusCheck, "long live-map", "mobile final check keeps long live-map evidence reference");
  mustContains(passMinusCheck, "console noise", "mobile final check keeps console noise evidence reference");

  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  }).trim();
  mustNotContains(staged, "backend/artifacts/runtime-data", "mobile final check keeps runtime-data unstaged");
  mustNotContains(staged, "backend/artifacts/browser-smoke", "mobile final check keeps browser-smoke unstaged");

  const routeDiff = execFileSync("git", ["diff", "--name-only", "--", "backend/src/routes"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  }).trim();
  const serviceDiff = execFileSync("git", ["diff", "--name-only", "--", "backend/src/services"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  }).trim();
  const prismaDiff = execFileSync("git", ["diff", "--name-only", "--", "prisma"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  }).trim();
  const backendPrismaDiff = execFileSync("git", ["diff", "--name-only", "--", "backend/prisma"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  }).trim();

  must(routeDiff === "", "mobile final check keeps backend routes unchanged");
  must(serviceDiff === "", "mobile final check keeps backend services unchanged");
  must(prismaDiff === "", "mobile final check keeps prisma unchanged");
  must(backendPrismaDiff === "", "mobile final check keeps backend prisma unchanged");

  console.log("=== MOBILE-WEB-FINAL-01 CHECK PASS ===");
}

main();
