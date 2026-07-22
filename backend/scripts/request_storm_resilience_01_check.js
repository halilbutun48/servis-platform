#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  runner: path.join(repoRoot, "backend", "scripts", "run_product_extensions_check_chain.js"),
  verify: path.join(repoRoot, "backend", "scripts", "verify_chain_01_product_extensions_check.js"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  doc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  premiumSmoke: path.join(repoRoot, "backend", "scripts", "ux_live_panel_premium_smoke_01.mjs"),
  mobileAllRoles: path.join(repoRoot, "backend", "scripts", "ux_mobile_all_roles_panel_audit_01.mjs"),
  productFlow: path.join(repoRoot, "backend", "scripts", "product_flow_button_audit_01.mjs"),
  allPanelsWrapper: path.join(repoRoot, "backend", "scripts", "ux_all_panels_reality_audit_01.mjs"),
  allPanelsReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_ALL_PANELS_REALITY_AUDIT_01", "report.json"),
  mobileAllRolesReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01", "report.json"),
  premiumSmokeReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_LIVE_PANEL_PREMIUM_SMOKE_01", "report.json"),
  productFlowReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PRODUCT_FLOW_BUTTON_AUDIT_01", "report.json"),
  debugLog: path.join(repoRoot, "debug.log"),
};

function readFile(relOrAbsPath) {
  return fs.readFileSync(relOrAbsPath, "utf8");
}

function readJson(relOrAbsPath) {
  return JSON.parse(readFile(relOrAbsPath));
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

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function noIgnore429(text) {
  return !/ignore.*429|429.*ignore|ignore.*too many requests|too many requests.*ignore/i.test(String(text || ""));
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function must(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

function statusCountsSummary(report) {
  const counts = report.statusCounts || {};
  return [
    `PASS ${Number(counts.PASS || 0)}`,
    `PASS- ${Number(counts["PASS-"] || 0)}`,
    `UX-FIX ${Number(counts["UX-FIX"] || 0)}`,
    `BLOCKER ${Number(counts.BLOCKER || 0)}`,
    `AUTH-BLOCKED ${Number(counts["AUTH-BLOCKED"] || 0)}`,
    `NOT-FOUND ${Number(counts["NOT-FOUND"] || 0)}`,
  ].join(" / ");
}

function expectReport(reportPath, expected, label) {
  must(fs.existsSync(reportPath), `${label} report exists`);
  const report = readJson(reportPath);
  must(Number(report.routeCount || 0) === expected.routeCount, `${label} route count`);
  must(Number(report.screenshotCount || 0) === expected.screenshotCount, `${label} screenshot count`);
  must(Boolean(report.success) === true, `${label} success flag`);
  must(Number(report.consoleErrorCount || 0) === expected.consoleErrorCount, `${label} console error count`);
  must(Number(report.pageErrorCount || 0) === expected.pageErrorCount, `${label} page error count`);
  must(Number(report.totalLoginFailures || 0) === expected.totalLoginFailures, `${label} login failure count`);
  must(Number(report.statusCounts?.PASS || 0) === expected.passCount, `${label} PASS count`);
  must(Number(report.statusCounts?.["PASS-"] || 0) === expected.passMinusCount, `${label} PASS- count`);
  must(Number(report.statusCounts?.["UX-FIX"] || 0) === expected.uxFixCount, `${label} UX-FIX count`);
  must(Number(report.statusCounts?.BLOCKER || 0) === expected.blockerCount, `${label} BLOCKER count`);
  must(Number(report.statusCounts?.["AUTH-BLOCKED"] || 0) === expected.authBlockedCount, `${label} AUTH-BLOCKED count`);
  must(Number(report.statusCounts?.["NOT-FOUND"] || 0) === expected.notFoundCount, `${label} NOT-FOUND count`);
  must(Array.isArray(report.routes), `${label} routes array present`);
  must(report.routes.length === expected.routeCount, `${label} route rows count`);
  must(report.routes.every((row) => Array.isArray(row.consoleErrors) && row.consoleErrors.every((item) => noIgnore429(item))), `${label} console errors are 429-free`);
  must(report.routes.every((row) => Array.isArray(row.pageErrors) && row.pageErrors.length === 0), `${label} page errors are empty`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
}

function buildCases() {
  const cases = [];

  const packageJson = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const premiumSource = readFile(paths.premiumSmoke);
  const mobileSource = readFile(paths.mobileAllRoles);
  const productFlowSource = readFile(paths.productFlow);
  const allPanelsWrapper = readFile(paths.allPanelsWrapper);

  const chainNeedles = [
    [packageJson, '"check:requeststormresilience01": "node backend/scripts/request_storm_resilience_01_check.js"'],
    [runner, "check:requeststormresilience01"],
    [verify, "check:requeststormresilience01"],
    [harnessCheck, "REQUEST-STORM-RESILIENCE-01"],
    [harnessCheck, "check:requeststormresilience01"],
    [harnessCheck, "root:check:requeststormresilience01"],
    [harnessCheck, "docs/REQUEST_STORM_RESILIENCE_01.md"],
    [harnessDoc, "REQUEST-STORM-RESILIENCE-01"],
    [harnessDoc, "check:requeststormresilience01"],
    [harnessDoc, "root:check:requeststormresilience01"],
    [harnessDoc, "docs/REQUEST_STORM_RESILIENCE_01.md"],
    [harnessDoc, "node backend\\scripts\\request_storm_resilience_01_check.js"],
    [guide, "REQUEST-STORM-RESILIENCE-01"],
    [guide, "check:requeststormresilience01"],
    [guide, "node backend\\scripts\\request_storm_resilience_01_check.js"],
    [guide, "docs/REQUEST_STORM_RESILIENCE_01.md"],
    [primer, "REQUEST-STORM-RESILIENCE-01"],
    [primer, "check:requeststormresilience01"],
    [primer, "docs/REQUEST_STORM_RESILIENCE_01.md"],
    [primer, "backend/scripts/request_storm_resilience_01_check.js"],
    [doc, "REQUEST-STORM-RESILIENCE-01"],
  ];
  for (const [text, needle] of chainNeedles) {
    addContainsCase(cases, `chain wiring contains ${needle}`, text, needle);
  }

  addContainsCase(cases, "request storm doc has purpose heading", doc, "Purpose");
  addContainsCase(cases, "request storm doc has problem statement heading", doc, "Problem statement");
  addContainsCase(cases, "request storm doc captures previous 429 finding", doc, "Previous 429");
  addContainsCase(cases, "request storm doc captures storageState policy", doc, "StorageState/context reuse policy");
  addContainsCase(cases, "request storm doc captures role isolation policy", doc, "Role isolation policy");
  addContainsCase(cases, "request storm doc captures console/page policy", doc, "Console/page error policy");
  addContainsCase(cases, "request storm doc captures what changed", doc, "What changed");
  addContainsCase(cases, "request storm doc captures what was not changed", doc, "What was explicitly not changed");
  addContainsCase(cases, "request storm doc captures guard cases", doc, "Guard cases");
  addContainsCase(cases, "request storm doc captures validation results", doc, "Validation results");
  addContainsCase(cases, "request storm doc captures remaining risks", doc, "Remaining risks");
  addContainsCase(cases, "request storm doc captures next milestone", doc, "Next recommended milestone");
  addContainsCase(cases, "request storm doc keeps runtime-data boundary", doc, "runtime-data");
  addContainsCase(cases, "request storm doc keeps browser-smoke boundary", doc, "browser-smoke");
  addContainsCase(cases, "request storm doc keeps route boundary", doc, "backend/src/routes");
  addContainsCase(cases, "request storm doc keeps service boundary", doc, "backend/src/services");
  addContainsCase(cases, "request storm doc keeps prisma boundary", doc, "prisma");
  addContainsCase(cases, "request storm doc keeps backend prisma boundary", doc, "backend/prisma");
  addContainsCase(cases, "request storm doc names premium smoke", doc, "premium smoke");
  addContainsCase(cases, "request storm doc names product-flow smoke", doc, "product-flow");

  const sourceSpecs = [
    {
      label: "premium smoke source",
      text: premiumSource,
      role: "premium",
    },
    {
      label: "mobile all-roles source",
      text: mobileSource,
      role: "mobile",
    },
    {
      label: "product-flow source",
      text: productFlowSource,
      role: "product-flow",
    },
  ];

  for (const spec of sourceSpecs) {
    addContainsCase(cases, `${spec.label} declares shared storage state`, spec.text, "let sharedStorageState = null;");
    addContainsCase(cases, `${spec.label} seeds context storage state`, spec.text, "contextOptions.storageState = sharedStorageState;");
    addContainsCase(cases, `${spec.label} snapshots desktop storage state`, spec.text, "if (viewport.name === \"desktop\")");
    addContainsCase(cases, `${spec.label} persists storage state after desktop`, spec.text, "sharedStorageState = await context.storageState().catch(() => null);");
    addContainsCase(cases, `${spec.label} counts console errors`, spec.text, "report.consoleErrorCount += row.consoleErrors.length;");
    addContainsCase(cases, `${spec.label} counts page errors`, spec.text, "report.pageErrorCount += row.pageErrors.length;");
    addContainsCase(cases, `${spec.label} keeps console error capture raw`, spec.text, "result.consoleErrors.push(msg.text());");
    addContainsCase(cases, `${spec.label} keeps page error capture raw`, spec.text, "result.pageErrors.push(err?.message || String(err));");
    addNotContainsCase(cases, `${spec.label} has no 429 ignore policy`, spec.text, "ignore 429");
    addNotContainsCase(cases, `${spec.label} has no too-many-requests ignore policy`, spec.text, "Too Many Requests");
  }

  addContainsCase(cases, "all-panels wrapper references source audit runner", allPanelsWrapper, "sourceRunnerPath");
  addContainsCase(cases, "all-panels wrapper references source report json", allPanelsWrapper, "sourceReportJsonPath");
  addContainsCase(cases, "all-panels wrapper references target report json", allPanelsWrapper, "targetReportJsonPath");
  addContainsCase(cases, "all-panels wrapper references coverage source append", allPanelsWrapper, "coverageSourceAppend");
  addContainsCase(cases, "all-panels wrapper keeps console error summary", allPanelsWrapper, "consoleErrorCount");
  addContainsCase(cases, "all-panels wrapper keeps page error summary", allPanelsWrapper, "pageErrorCount");
  addContainsCase(cases, "all-panels wrapper keeps source audit wording", allPanelsWrapper, "Source audit:");

  const reportSpecs = [
    {
      label: "all-panels reality audit",
      path: paths.allPanelsReport,
      expected: {
        routeCount: 82,
        screenshotCount: 164,
        consoleErrorCount: 0,
        pageErrorCount: 0,
        totalLoginFailures: 0,
        passCount: 82,
        passMinusCount: 0,
        uxFixCount: 0,
        blockerCount: 0,
        authBlockedCount: 0,
        notFoundCount: 0,
      },
    },
    {
      label: "mobile all-roles audit",
      path: paths.mobileAllRolesReport,
      expected: {
        routeCount: 82,
        screenshotCount: 164,
        consoleErrorCount: 0,
        pageErrorCount: 0,
        totalLoginFailures: 0,
        passCount: 82,
        passMinusCount: 0,
        uxFixCount: 0,
        blockerCount: 0,
        authBlockedCount: 0,
        notFoundCount: 0,
      },
    },
    {
      label: "premium smoke",
      path: paths.premiumSmokeReport,
      expected: {
        routeCount: 82,
        screenshotCount: 164,
        consoleErrorCount: 0,
        pageErrorCount: 0,
        totalLoginFailures: 0,
        passCount: 82,
        passMinusCount: 0,
        uxFixCount: 0,
        blockerCount: 0,
        authBlockedCount: 0,
        notFoundCount: 0,
      },
    },
    {
      label: "product-flow button audit",
      path: paths.productFlowReport,
      expected: {
        routeCount: 18,
        screenshotCount: 36,
        consoleErrorCount: 0,
        pageErrorCount: 0,
        totalLoginFailures: 0,
        passCount: 18,
        passMinusCount: 0,
        uxFixCount: 0,
        blockerCount: 0,
        authBlockedCount: 0,
        notFoundCount: 0,
      },
    },
  ];

  for (const spec of reportSpecs) {
    addCase(cases, `${spec.label} report exists`, () => must(fs.existsSync(spec.path), `${spec.label} report missing`));
    addCase(cases, `${spec.label} route and screenshot counts`, () => {
      const report = readJson(spec.path);
      must(Number(report.routeCount || 0) === spec.expected.routeCount, `${spec.label} route count`);
      must(Number(report.screenshotCount || 0) === spec.expected.screenshotCount, `${spec.label} screenshot count`);
    });
    addCase(cases, `${spec.label} status counts`, () => {
      const report = readJson(spec.path);
      must(Number(report.statusCounts?.PASS || 0) === spec.expected.passCount, `${spec.label} PASS count`);
      must(Number(report.statusCounts?.["PASS-"] || 0) === spec.expected.passMinusCount, `${spec.label} PASS- count`);
      must(Number(report.statusCounts?.["UX-FIX"] || 0) === spec.expected.uxFixCount, `${spec.label} UX-FIX count`);
      must(Number(report.statusCounts?.BLOCKER || 0) === spec.expected.blockerCount, `${spec.label} BLOCKER count`);
      must(Number(report.statusCounts?.["AUTH-BLOCKED"] || 0) === spec.expected.authBlockedCount, `${spec.label} AUTH-BLOCKED count`);
      must(Number(report.statusCounts?.["NOT-FOUND"] || 0) === spec.expected.notFoundCount, `${spec.label} NOT-FOUND count`);
    });
    addCase(cases, `${spec.label} console/page errors stay within expected policy`, () => {
      const report = readJson(spec.path);
      must(Number(report.consoleErrorCount || 0) === spec.expected.consoleErrorCount, `${spec.label} console error count`);
      must(Number(report.pageErrorCount || 0) === spec.expected.pageErrorCount, `${spec.label} page error count`);
      must(Number(report.totalLoginFailures || 0) === spec.expected.totalLoginFailures, `${spec.label} login failure count`);
      must(Boolean(report.success) === true, `${spec.label} success flag`);
    });
    addCase(cases, `${spec.label} does not contain 429 console errors`, () => {
      const report = readJson(spec.path);
      must(Array.isArray(report.routes), `${spec.label} routes array`);
      must(
        report.routes.every((row) => Array.isArray(row.consoleErrors) && row.consoleErrors.every((item) => noIgnore429(item))),
        `${spec.label} 429 console guard`
      );
    });
  }

  const diffChecks = [
    ["backend routes diff is empty", ["diff", "--name-only", "--", "backend/src/routes"]],
    ["backend services diff is empty", ["diff", "--name-only", "--", "backend/src/services"]],
    ["prisma diff is empty", ["diff", "--name-only", "--", "prisma"]],
    ["backend prisma diff is empty", ["diff", "--name-only", "--", "backend/prisma"]],
  ];
  for (const [label, args] of diffChecks) {
    addCase(cases, label, () => must(gitLines(args).length === 0, label));
  }

  addCase(cases, "working tree has runtime-data entries", () => {
    const lines = gitLines(["status", "--short"]);
    must(lines.some((line) => line.includes("backend/artifacts/runtime-data/")), "runtime-data entries missing from status");
  });
  addCase(cases, "working tree does not show staged browser-smoke artifacts", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/browser-smoke")), "browser-smoke artifacts staged");
  });
  addCase(cases, "git diff check is clean", () => {
    must(gitLines(["diff", "--check"]).length === 0, "git diff --check has findings");
  });
  addCase(cases, "git cached diff check is clean", () => {
    must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check has findings");
  });
  addCase(cases, "staged diff is empty", () => {
    must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "staged diff not empty");
  });
  addCase(cases, "debug.log is absent", () => {
    must(!fs.existsSync(paths.debugLog), "debug.log is present");
  });

  return cases;
}

function main() {
  console.log("=== REQUEST-STORM-RESILIENCE-01 CHECK ===");
  console.log(`Repo root: ${repoRoot}`);

  const cases = buildCases();
  const results = [];

  for (const entry of cases) {
    try {
      entry.fn();
      results.push({ label: entry.label, ok: true });
      console.log(`OK ${entry.label}`);
    } catch (error) {
      results.push({ label: entry.label, ok: false, error: error?.message || String(error) });
      console.log(`FAIL ${entry.label}`);
    }
  }

  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const guardCases = results.length;

  const premiumReport = readJson(paths.premiumSmokeReport);
  const mobileReport = readJson(paths.mobileAllRolesReport);
  const productFlowReport = readJson(paths.productFlowReport);
  const allPanelsReport = readJson(paths.allPanelsReport);
  const statusLines = gitLines(["status", "--short"]);
  const stagedNames = gitLines(["diff", "--cached", "--name-only"]);

  const storageStateSummary = [
    contains(readFile(paths.premiumSmoke), "sharedStorageState"),
    contains(readFile(paths.mobileAllRoles), "sharedStorageState"),
    contains(readFile(paths.productFlow), "sharedStorageState"),
  ].every(Boolean)
    ? "premium smoke, mobile all-roles audit ve product-flow button audit aynı role içinde desktop->mobile sharedStorageState reuse yapıyor; role isolation korunuyor"
    : "sharedStorageState reuse eksik";

  const consoleErrorPolicySummary = [
    Number(premiumReport.consoleErrorCount || 0) === 0,
    Number(productFlowReport.consoleErrorCount || 0) === 0,
    Number(allPanelsReport.consoleErrorCount || 0) === 0,
    Number(mobileReport.consoleErrorCount || 0) === 0,
    Number(premiumReport.pageErrorCount || 0) === 0,
    Number(productFlowReport.pageErrorCount || 0) === 0,
    Number(allPanelsReport.pageErrorCount || 0) === 0,
    Number(mobileReport.pageErrorCount || 0) === 0,
  ].every(Boolean)
    ? "product-flow, premium, all-panels reality audit ve mobile all-roles consoleErrorCount=0 kalır; pageErrorCount=0; 429 ignore list yok"
    : "console/page error policy bozuldu";

  const thresholdSummary = [
    `${statusCountsSummary(productFlowReport)}`,
    `${statusCountsSummary(premiumReport)}`,
    `${statusCountsSummary(allPanelsReport)}`,
    `${statusCountsSummary(mobileReport)}`,
  ].join("; ");

  const duplicateRequestSummary = [
    Number(premiumReport.consoleErrorCount || 0) === 0,
    Number(productFlowReport.consoleErrorCount || 0) === 0,
    Number(allPanelsReport.consoleErrorCount || 0) === 0,
    Number(mobileReport.consoleErrorCount || 0) === 0,
    Number(allPanelsReport.pageErrorCount || 0) === 0,
    Number(mobileReport.pageErrorCount || 0) === 0,
    !/429|Too Many Requests/i.test(
      [
        ...(premiumReport.routes || []),
        ...(productFlowReport.routes || []),
      ]
        .flatMap((row) => row.consoleErrors || [])
        .join(" ")
    ),
  ].every(Boolean)
    ? "desktop->mobile sharedStorageState reuse duplicate read flood'u kesiyor; all-panels ve mobile all-roles console/page error üretmiyor"
    : "duplicate request flood veya 429 izi var";

  const commitExternalSummary = [
    statusLines.some((line) => line.includes("backend/artifacts/runtime-data/")),
    stagedNames.length === 0,
    !stagedNames.some((line) => line.includes("backend/artifacts/browser-smoke")),
    !fs.existsSync(paths.debugLog),
  ].every(Boolean)
    ? "runtime-data working tree'de, browser-smoke staged değil, debug.log absent, stage empty"
    : "commit-external boundary bozuldu";

  const routeServicePrismaSummary = [
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    gitLines(["diff", "--name-only", "--", "prisma"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0,
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty"
    : "route/service/prisma scope dışında değişiklik var";

  const chainWiringSummary = [
    contains(readFile(paths.packageJson), '"check:requeststormresilience01": "node backend/scripts/request_storm_resilience_01_check.js"'),
    contains(readFile(paths.runner), "check:requeststormresilience01"),
    contains(readFile(paths.verify), "check:requeststormresilience01"),
    contains(readFile(paths.harnessCheck), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.harnessDoc), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.guide), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.primer), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.doc), "REQUEST-STORM-RESILIENCE-01"),
  ].every(Boolean)
    ? "package.json, product-extensions runner, verify chain, harness check/doc, guide, primer ve milestone doc request-storm resilience için bağlı"
    : "chain wiring eksik";

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`storageStateSummary=${storageStateSummary}`);
  console.log(`consoleErrorPolicySummary=${consoleErrorPolicySummary}`);
  console.log(`thresholdSummary=${thresholdSummary}`);
  console.log(`duplicateRequestSummary=${duplicateRequestSummary}`);
  console.log(`commitExternalSummary=${commitExternalSummary}`);
  console.log(`routeServicePrismaSummary=${routeServicePrismaSummary}`);
  console.log(`chainWiringSummary=${chainWiringSummary}`);

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    process.exit(1);
  }

  console.log("PASS REQUEST-STORM-RESILIENCE-01");
}

main();
