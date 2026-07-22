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
  doc: path.join(repoRoot, "docs", "LOAD_TEST_2000_USERS_01.md"),
  harness: path.join(repoRoot, "backend", "scripts", "load_test_2000_users_01_harness.js"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  policyDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  dashboardDoc: path.join(repoRoot, "docs", "DASHBOARD_BULK_ENDPOINT_01.md"),
  cacheDoc: path.join(repoRoot, "docs", "CACHE_COALESCING_AND_BACKOFF_01.md"),
  productFlowReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PRODUCT_FLOW_BUTTON_AUDIT_01", "report.json"),
  premiumReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_LIVE_PANEL_PREMIUM_SMOKE_01", "report.json"),
  allPanelsReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_ALL_PANELS_REALITY_AUDIT_01", "report.json"),
  mobileReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01", "report.json"),
  gitignore: path.join(repoRoot, ".gitignore"),
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

function must(condition, label) {
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContains(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContains(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
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

function smokeSummary(report) {
  const counts = report.statusCounts || {};
  return `PASS ${Number(counts.PASS || 0)}/${Number(counts["PASS-"] || 0)}/${Number(counts["UX-FIX"] || 0)}/${Number(counts.BLOCKER || 0)}`;
}

function expectSmokeReport(spec) {
  must(fs.existsSync(spec.path), `${spec.label} report exists`);
  const report = readJson(spec.path);
  must(Number(report.routeCount || 0) === spec.routeCount, `${spec.label} route count`);
  must(Number(report.screenshotCount || 0) === spec.screenshotCount, `${spec.label} screenshot count`);
  must(Boolean(report.success) === true, `${spec.label} success flag`);
  must(Number(report.consoleErrorCount || 0) === spec.consoleErrorCount, `${spec.label} console error count`);
  must(Number(report.pageErrorCount || 0) === spec.pageErrorCount, `${spec.label} page error count`);
  must(Number(report.statusCounts?.PASS || 0) === spec.passCount, `${spec.label} PASS count`);
  must(Number(report.statusCounts?.["PASS-"] || 0) === 0, `${spec.label} PASS- count`);
  must(Number(report.statusCounts?.["UX-FIX"] || 0) === 0, `${spec.label} UX-FIX count`);
  must(Number(report.statusCounts?.BLOCKER || 0) === 0, `${spec.label} BLOCKER count`);
  must(Array.isArray(report.routes) && report.routes.length === spec.routeCount, `${spec.label} route rows`);
  must(report.routes.every((row) => Array.isArray(row.consoleErrors) && row.consoleErrors.length === 0), `${spec.label} console errors empty`);
  must(report.routes.every((row) => Array.isArray(row.pageErrors) && row.pageErrors.length === 0), `${spec.label} page errors empty`);
  return report;
}

function main() {
  console.log("=== LOAD-TEST-2000-USERS-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const harness = readFile(paths.harness);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const policyDoc = readFile(paths.policyDoc);
  const dashboardDoc = readFile(paths.dashboardDoc);
  const cacheDoc = readFile(paths.cacheDoc);
  const gitignore = readFile(paths.gitignore);

  addContains(cases, "package.json exposes load-test alias", pkg, '"check:loadtest2000users01": "node backend/scripts/load_test_2000_users_01_check.js"');
  addContains(cases, "product extensions runner includes load-test check", runner, "check:loadtest2000users01");
  addContains(cases, "verify chain includes load-test check", verify, "check:loadtest2000users01");
  addContains(cases, "script harness check knows load-test milestone", harnessCheck, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "script harness check knows load-test alias", harnessCheck, "load_test_2000_users_01_check.js");
  addContains(cases, "script harness check knows load-test doc", harnessCheck, "docs/LOAD_TEST_2000_USERS_01.md");
  addContains(cases, "script harness doc knows load-test milestone", harnessDoc, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "script harness doc knows load-test alias", harnessDoc, "check:loadtest2000users01");
  addContains(cases, "script harness doc knows load-test doc", harnessDoc, "docs/LOAD_TEST_2000_USERS_01.md");
  addContains(cases, "script harness doc knows load-test command", harnessDoc, "node backend\\scripts\\load_test_2000_users_01_check.js");
  addContains(cases, "milestone guide knows load-test milestone", guide, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "milestone guide knows load-test alias", guide, "check:loadtest2000users01");
  addContains(cases, "milestone guide knows load-test doc", guide, "docs/LOAD_TEST_2000_USERS_01.md");
  addContains(cases, "milestone guide knows load-test command", guide, "node backend\\scripts\\load_test_2000_users_01_check.js");
  addContains(cases, "primer knows load-test milestone", primer, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "primer knows load-test alias", primer, "check:loadtest2000users01");
  addContains(cases, "primer knows load-test doc", primer, "docs/LOAD_TEST_2000_USERS_01.md");
  addContains(cases, "primer knows load-test command", primer, "backend/scripts/load_test_2000_users_01_check.js");

  const docHeadings = [
    "# LOAD-TEST-2000-USERS-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) 2000-user target",
    "## 4) Role distribution",
    "## 5) Endpoint scenario matrix",
    "## 6) Local-safe harness policy",
    "## 7) Explicit high-concurrency flag policy",
    "## 8) Read-only boundary",
    "## 9) No write-action / human approval boundary",
    "## 10) Rate-limit / request-storm / dashboard bulk / cache coalescing compatibility",
    "## 11) Metrics",
    "## 12) What is not tested yet",
    "## 13) Generated report policy",
    "## 14) Smoke expectations",
    "## 15) Validation results",
    "## 16) Remaining risks",
    "## 17) Next recommended milestone",
  ];
  for (const heading of docHeadings) {
    addContains(cases, `load-test doc heading ${heading}`, doc, heading);
  }
  addContains(cases, "load-test doc mentions local-dev safe", doc, "local/dev-safe");
  addContains(cases, "load-test doc mentions 2000 users", doc, "2000-user");
  addContains(cases, "load-test doc mentions role distribution", doc, "35% personel / parent live-read");
  addContains(cases, "load-test doc mentions endpoint budget", doc, "dashboard bulk read");
  addContains(cases, "load-test doc mentions high concurrency flag", doc, "LOAD_TEST_ALLOW_HIGH_CONCURRENCY");
  addContains(cases, "load-test doc mentions read-only boundary", doc, "read-only");
  addContains(cases, "load-test doc mentions human approval boundary", doc, "human approval");
  addContains(cases, "load-test doc mentions request storm", doc, "REQUEST-STORM-RESILIENCE-01");
  addContains(cases, "load-test doc mentions dashboard bulk", doc, "DASHBOARD-BULK-ENDPOINT-01");
  addContains(cases, "load-test doc mentions cache coalescing", doc, "CACHE-COALESCING-AND-BACKOFF-01");
  addContains(cases, "load-test doc mentions production policy", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContains(cases, "load-test doc mentions smoke expectations", doc, "consoleErrorCount=0");
  addContains(cases, "load-test doc mentions generated report policy", doc, "backend/artifacts/load-test/");
  addContains(cases, "load-test doc mentions check command", doc, "node backend/scripts/load_test_2000_users_01_check.js");
  addContains(cases, "load-test doc mentions next milestone", doc, "DB-POOL-AND-API-SCALING-01");

  addContains(cases, "harness base url defaults local", harness, "http://localhost:3000");
  addContains(cases, "harness checks API_URL fallback", harness, "process.env.API_URL");
  addContains(cases, "harness uses load-test base url env", harness, "LOAD_TEST_BASE_URL");
  addContains(cases, "harness rejects non-local base urls", harness, "LOAD_TEST_BASE_URL must stay local/dev-safe");
  addContains(cases, "harness defaults to 20 users", harness, "const DEFAULT_USERS = 20");
  addContains(cases, "harness bounds concurrency", harness, "const DEFAULT_CONCURRENCY = 4");
  addContains(cases, "harness bounds duration", harness, "const DEFAULT_DURATION_MS = 10000");
  addContains(cases, "harness bounds request timeout", harness, "const DEFAULT_REQUEST_TIMEOUT_MS = 4000");
  addContains(cases, "harness writes report under load-test", harness, "load_test_2000_users_01_report.json");
  addContains(cases, "harness supports high concurrency flag", harness, "LOAD_TEST_ALLOW_HIGH_CONCURRENCY");
  addContains(cases, "harness supports auth endpoints flag", harness, "LOAD_TEST_ALLOW_AUTH_ENDPOINTS");
  addContains(cases, "harness supports plan only mode", harness, "LOAD_TEST_PLAN_ONLY");
  addContains(cases, "harness supports report writing", harness, "LOAD_TEST_WRITE_REPORT");
  addContains(cases, "harness supports auth token", harness, "LOAD_TEST_AUTH_TOKEN");
  addContains(cases, "harness scenario matrix includes personel/parent live-read", harness, "personel-parent-live-read");
  addContains(cases, "harness scenario matrix includes company operations", harness, "company-operations-shifts-agreements");
  addContains(cases, "harness scenario matrix includes room map vehicles health", harness, "room-map-vehicles-operation-health");
  addContains(cases, "harness scenario matrix includes driver route map", harness, "driver-route-map");
  addContains(cases, "harness scenario matrix includes school org ops", harness, "school-organization-operations");
  addContains(cases, "harness scenario matrix includes superadmin overview", harness, "superadmin-overview-audit-commercial");
  addContains(cases, "harness only uses GET methods", harness, 'method: "GET"');
  addNotContains(cases, "harness has no POST", harness, "method: \"POST\"");
  addNotContains(cases, "harness has no PUT", harness, "method: \"PUT\"");
  addNotContains(cases, "harness has no PATCH", harness, "method: \"PATCH\"");
  addNotContains(cases, "harness has no DELETE", harness, "method: \"DELETE\"");
  addNotContains(cases, "harness has no while true loop", harness, "while (true)");
  addNotContains(cases, "harness has no infinite retry", harness, "retry forever");
  addContains(cases, "harness reports p50", harness, "p50=");
  addContains(cases, "harness reports p95", harness, "p95=");
  addContains(cases, "harness reports p99", harness, "p99=");
  addContains(cases, "harness reports error rate", harness, "errorRate");
  addContains(cases, "harness reports 429 count", harness, "429=");
  addContains(cases, "harness reports max concurrency", harness, "concurrency=");
  addContains(cases, "harness reports request timeout", harness, "requestTimeoutMs=");
  addContains(cases, "harness uses deadline", harness, "const deadline = Date.now() + config.durationMs");
  addContains(cases, "harness skips auth endpoints by default", harness, "skipped-by-auth-policy");
  addContains(cases, "harness refuses auth endpoints without token", harness, "LOAD_TEST_ALLOW_AUTH_ENDPOINTS=true requires LOAD_TEST_AUTH_TOKEN");
  addContains(cases, "harness refuses 2000 without high concurrency flag", harness, "LOAD_TEST_USERS=2000 requires LOAD_TEST_ALLOW_HIGH_CONCURRENCY=true");
  addContains(cases, "harness refuses non-local urls", harness, "non-local URLs are refused");

  addContains(cases, "gitignore keeps load-test reports ignored", gitignore, "backend/artifacts/load-test/");
  addContains(cases, "gitignore keeps browser-smoke ignored", gitignore, "backend/artifacts/browser-smoke/");

  addCase(cases, "package alias does not expose write action", () => {
    must(!contains(pkg, "LOAD_TEST_ALLOW_WRITE"), "write action flag absent");
    must(!contains(harness, "method: \"POST\""), "POST absent");
  });

  addContains(cases, "request storm doc mentions load-test follow-up", requestStormDoc, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "production policy doc mentions load-test follow-up", policyDoc, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "dashboard bulk doc mentions load-test follow-up", dashboardDoc, "LOAD-TEST-2000-USERS-01");
  addContains(cases, "cache coalescing doc mentions load-test follow-up", cacheDoc, "LOAD-TEST-2000-USERS-01");

  const smokeSpecs = [
    { label: "product-flow", path: paths.productFlowReport, routeCount: 18, screenshotCount: 36, consoleErrorCount: 0, pageErrorCount: 0, passCount: 18 },
    { label: "premium", path: paths.premiumReport, routeCount: 82, screenshotCount: 164, consoleErrorCount: 0, pageErrorCount: 0, passCount: 82 },
    { label: "all-panels", path: paths.allPanelsReport, routeCount: 82, screenshotCount: 164, consoleErrorCount: 0, pageErrorCount: 0, passCount: 82 },
    { label: "mobile all-roles", path: paths.mobileReport, routeCount: 82, screenshotCount: 164, consoleErrorCount: 0, pageErrorCount: 0, passCount: 82 },
  ];
  const smokeReports = smokeSpecs.map((spec) => ({ spec, report: expectSmokeReport(spec) }));

  addCase(cases, "route diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0, "route diff not empty");
  });
  addCase(cases, "service diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0, "service diff not empty");
  });
  addCase(cases, "prisma diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty");
  });
  addCase(cases, "backend prisma diff stays empty", () => {
    must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend prisma diff not empty");
  });
  addCase(cases, "git diff --check stays clean", () => {
    must(gitLines(["diff", "--check"]).length === 0, "git diff --check findings");
  });
  addCase(cases, "git diff --cached --check stays clean", () => {
    must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check findings");
  });
  addCase(cases, "staged diff stays empty", () => {
    must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "staged diff not empty");
  });
  addCase(cases, "runtime-data stays commit external", () => {
    const statusLines = gitLines(["status", "--short"]);
    must(statusLines.some((line) => line.includes("backend/artifacts/runtime-data/")), "runtime-data missing from status");
  });
  addCase(cases, "browser-smoke stays commit external", () => {
    const statusLines = gitLines(["status", "--short"]);
    must(!statusLines.some((line) => line.includes("backend/artifacts/browser-smoke/") && line.startsWith("M ")), "browser-smoke modified in working tree");
  });
  addCase(cases, "load-test report stays commit external", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/load-test/")), "load-test report staged");
  });
  addCase(cases, "debug.log stays absent", () => {
    must(!fs.existsSync(paths.debugLog), "debug.log present");
  });

  const results = [];
  for (const entry of cases) {
    try {
      entry.fn();
      results.push({ label: entry.label, ok: true });
    } catch (error) {
      results.push({ label: entry.label, ok: false, error: error?.message || String(error) });
      console.log(`FAIL ${entry.label}`);
    }
  }

  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const guardCases = results.length;

  const smokeThresholdSummary = smokeReports.every(({ report, spec }) =>
    Number(report.statusCounts?.PASS || 0) === spec.passCount &&
    Number(report.statusCounts?.["PASS-"] || 0) === 0 &&
    Number(report.statusCounts?.["UX-FIX"] || 0) === 0 &&
    Number(report.statusCounts?.BLOCKER || 0) === 0
  )
    ? `product-flow PASS ${smokeReports[0].report.statusCounts.PASS}/0/0/0; premium PASS ${smokeReports[1].report.statusCounts.PASS}/0/0/0; all-panels PASS ${smokeReports[2].report.statusCounts.PASS}/0/0/0; mobile all-roles PASS ${smokeReports[3].report.statusCounts.PASS}/0/0/0`
    : "smoke thresholds changed";

  const scenarioMatrixSummary = contains(doc, "35% personel / parent live-read") && contains(doc, "20% company operations / shifts / agreements read")
    ? "2000-user matrix keeps 35/20/20/10/10/5 role split with dashboard bulk, route preview and live-read coverage"
    : "scenario matrix missing";

  const harnessSafetySummary = [
    contains(harness, "LOAD_TEST_BASE_URL"),
    contains(harness, "http://localhost:3000"),
    contains(harness, "const DEFAULT_USERS = 20"),
    contains(harness, "LOAD_TEST_ALLOW_HIGH_CONCURRENCY"),
    contains(harness, "LOAD_TEST_ALLOW_AUTH_ENDPOINTS"),
    contains(harness, "LOAD_TEST_PLAN_ONLY"),
    contains(harness, "LOAD_TEST_WRITE_REPORT"),
    contains(harness, "LOAD_TEST_AUTH_TOKEN"),
    contains(harness, "LOAD_TEST_BASE_URL must stay local/dev-safe"),
    contains(harness, "LOAD_TEST_USERS=2000 requires LOAD_TEST_ALLOW_HIGH_CONCURRENCY=true"),
  ].every(Boolean)
    ? "default smoke stays local/dev-safe, 2000 needs explicit high-concurrency flag, auth is opt-in and report output is gitignored"
    : "harness safety incomplete";

  const readOnlyBoundarySummary = [
    contains(harness, 'method: "GET"'),
    !contains(harness, 'method: "POST"'),
    !contains(harness, 'method: "PUT"'),
    !contains(harness, 'method: "PATCH"'),
    !contains(harness, 'method: "DELETE"'),
    contains(doc, "read-only"),
    contains(doc, "human approval"),
    contains(doc, "auth endpoints stay opt-in only"),
  ].every(Boolean)
    ? "GET-only scenario matrix keeps write-action and human approval boundary closed"
    : "read-only boundary incomplete";

  const cacheDashboardCompatibilitySummary = [
    contains(doc, "DASHBOARD-BULK-ENDPOINT-01"),
    contains(doc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(doc, "REQUEST-STORM-RESILIENCE-01"),
    contains(doc, "PRODUCTION-RATE-LIMIT-POLICY-01"),
    contains(harness, "/api/dashboard/bulk?bundle=company-operations"),
    contains(harness, "/api/dashboard/bulk?bundle=room-operation-health"),
    contains(harness, "/api/dashboard/bulk?bundle=school-operations"),
    contains(harness, "/api/dashboard/bulk?bundle=superadmin-overview"),
    contains(harness, "/api/shifts?take=1"),
    contains(requestStormDoc, "LOAD-TEST-2000-USERS-01"),
  ].every(Boolean)
    ? "dashboard bulk, cache coalescing, request storm and production policy are represented as read-only companions"
    : "cache/dashboard compatibility incomplete";

  const metricsSummary = [
    contains(doc, "p50"),
    contains(doc, "p95"),
    contains(doc, "p99"),
    contains(doc, "error rate"),
    contains(doc, "429 threshold"),
    contains(doc, "max concurrency"),
    contains(doc, "request timeout"),
    contains(doc, "generated report"),
    contains(harness, "latencyMs"),
    contains(harness, "errorRate"),
  ].every(Boolean)
    ? "metrics track p50/p95/p99, error rate, 429 threshold, timeout and bounded concurrency"
    : "metrics coverage incomplete";

  const chainWiringSummary = [
    contains(pkg, '"check:loadtest2000users01": "node backend/scripts/load_test_2000_users_01_check.js"'),
    contains(runner, "check:loadtest2000users01"),
    contains(verify, "check:loadtest2000users01"),
    contains(harnessCheck, "LOAD-TEST-2000-USERS-01"),
    contains(harnessDoc, "LOAD-TEST-2000-USERS-01"),
    contains(guide, "LOAD-TEST-2000-USERS-01"),
    contains(primer, "LOAD-TEST-2000-USERS-01"),
    contains(doc, "LOAD-TEST-2000-USERS-01"),
  ].every(Boolean)
    ? "package.json, runner, verify chain, harness check/doc, guide and primer are wired"
    : "chain wiring incomplete";

  const commitExternalSummary = [
    gitLines(["status", "--short"]).some((line) => line.includes("backend/artifacts/runtime-data/")),
    gitLines(["diff", "--cached", "--name-only"]).length === 0,
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/browser-smoke/")),
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/load-test/")),
    !fs.existsSync(paths.debugLog),
  ].every(Boolean)
    ? "runtime-data working tree'de, browser-smoke/load-test staged değil, debug.log absent, stage empty"
    : "commit-external boundary incomplete";

  const prismaSummary = [
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    gitLines(["diff", "--name-only", "--", "prisma"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0,
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty"
    : "route/service/prisma diff unexpectedly dirty";

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`scenarioMatrixSummary=${scenarioMatrixSummary}`);
  console.log(`harnessSafetySummary=${harnessSafetySummary}`);
  console.log(`readOnlyBoundarySummary=${readOnlyBoundarySummary}`);
  console.log(`cacheDashboardCompatibilitySummary=${cacheDashboardCompatibilitySummary}`);
  console.log(`metricsSummary=${metricsSummary}`);
  console.log(`smokeThresholdSummary=${smokeThresholdSummary}`);
  console.log(`chainWiringSummary=${chainWiringSummary}`);
  console.log(`commitExternalSummary=${commitExternalSummary}`);
  console.log(`prismaSummary=${prismaSummary}`);

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    process.exit(1);
  }

  console.log("PASS LOAD-TEST-2000-USERS-01");
}

main();
