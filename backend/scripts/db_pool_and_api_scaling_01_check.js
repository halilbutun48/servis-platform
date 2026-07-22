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
  doc: path.join(repoRoot, "docs", "DB_POOL_AND_API_SCALING_01.md"),
  probe: path.join(repoRoot, "backend", "scripts", "db_pool_and_api_scaling_01_probe.js"),
  loadTestDoc: path.join(repoRoot, "docs", "LOAD_TEST_2000_USERS_01.md"),
  dashboardDoc: path.join(repoRoot, "docs", "DASHBOARD_BULK_ENDPOINT_01.md"),
  cacheDoc: path.join(repoRoot, "docs", "CACHE_COALESCING_AND_BACKOFF_01.md"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  policyDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  prismaJs: path.join(repoRoot, "backend", "src", "prisma.js"),
  serverJs: path.join(repoRoot, "backend", "src", "server.js"),
  rateLimitsJs: path.join(repoRoot, "backend", "src", "bootstrap", "rateLimits.js"),
  capacityJs: path.join(repoRoot, "backend", "src", "ops", "capacityLoadBaseline.js"),
  observabilityJs: path.join(repoRoot, "backend", "src", "routes", "observability.js"),
  gitignore: path.join(repoRoot, ".gitignore"),
  debugLog: path.join(repoRoot, "debug.log"),
  productFlowReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PRODUCT_FLOW_BUTTON_AUDIT_01", "report.json"),
  premiumReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_LIVE_PANEL_PREMIUM_SMOKE_01", "report.json"),
  allPanelsReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_ALL_PANELS_REALITY_AUDIT_01", "report.json"),
  mobileReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01", "report.json"),
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

function addContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const index = haystack.indexOf(target, cursor);
    if (index === -1) {
      throw new Error(`FAIL ${label}: missing ${needle}`);
    }
    cursor = index + target.length;
  }
  console.log(`OK ${label}`);
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
  console.log("=== DB-POOL-AND-API-SCALING-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const probe = readFile(paths.probe);
  const loadTestDoc = readFile(paths.loadTestDoc);
  const dashboardDoc = readFile(paths.dashboardDoc);
  const cacheDoc = readFile(paths.cacheDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const policyDoc = readFile(paths.policyDoc);
  const prismaJs = readFile(paths.prismaJs);
  const serverJs = readFile(paths.serverJs);
  const rateLimitsJs = readFile(paths.rateLimitsJs);
  const capacityJs = readFile(paths.capacityJs);
  const observabilityJs = readFile(paths.observabilityJs);
  const gitignore = readFile(paths.gitignore);

  addContainsCase(cases, "package.json exposes db scaling alias", pkg, '"check:dbpoolandapiscaling01": "node backend/scripts/db_pool_and_api_scaling_01_check.js"');
  addContainsCase(cases, "product extensions runner includes db scaling check", runner, "check:dbpoolandapiscaling01");
  addContainsCase(cases, "verify chain includes db scaling check", verify, "check:dbpoolandapiscaling01");
  addContainsCase(cases, "script harness check knows db scaling milestone", harnessCheck, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "script harness check knows db scaling alias", harnessCheck, "check:dbpoolandapiscaling01");
  addContainsCase(cases, "script harness check knows db scaling doc", harnessCheck, "docs/DB_POOL_AND_API_SCALING_01.md");
  addContainsCase(cases, "script harness check knows db scaling command", harnessCheck, "node backend/scripts/db_pool_and_api_scaling_01_check.js");
  addContainsCase(cases, "script harness doc lists db scaling milestone", harnessDoc, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "script harness doc lists db scaling alias", harnessDoc, "check:dbpoolandapiscaling01");
  addContainsCase(cases, "script harness doc lists db scaling doc", harnessDoc, "docs/DB_POOL_AND_API_SCALING_01.md");
  addContainsCase(cases, "script harness doc lists db scaling command", harnessDoc, "node backend\\scripts\\db_pool_and_api_scaling_01_check.js");
  addContainsCase(cases, "milestone guide lists db scaling milestone", guide, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "milestone guide lists db scaling alias", guide, "check:dbpoolandapiscaling01");
  addContainsCase(cases, "milestone guide lists db scaling command", guide, "node backend\\scripts\\db_pool_and_api_scaling_01_check.js");
  addContainsCase(cases, "milestone guide lists db scaling doc", guide, "docs/DB_POOL_AND_API_SCALING_01.md");
  addContainsCase(cases, "primer lists db scaling milestone", primer, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "primer lists db scaling alias", primer, "check:dbpoolandapiscaling01");
  addContainsCase(cases, "primer lists db scaling doc", primer, "docs/DB_POOL_AND_API_SCALING_01.md");
  addContainsCase(cases, "primer lists db scaling command", primer, "backend/scripts/db_pool_and_api_scaling_01_check.js");

  const docHeadings = [
    "# DB-POOL-AND-API-SCALING-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) 2000-user scaling assumptions",
    "## 4) DB pool policy",
    "## 5) API concurrency policy",
    "## 6) Timeout budget policy",
    "## 7) Keep-alive / header timeout / request timeout policy",
    "## 8) Query latency budget",
    "## 9) Pool saturation signals",
    "## 10) Rate-limit vs capacity signals",
    "## 11) Dashboard bulk / cache coalescing / request-storm / rate-limit compatibility",
    "## 12) Local/dev-safe probe policy",
    "## 13) No write-action / human approval boundary",
    "## 14) What is not changed",
    "## 15) What remains for production infra",
    "## 16) Observability metrics to add next",
    "## 17) Validation results",
    "## 18) Remaining risks",
    "## 19) Next recommended milestone",
  ];
  for (const heading of docHeadings) {
    addContainsCase(cases, `db scaling doc heading ${heading}`, doc, heading);
  }
  addContainsCase(cases, "db scaling doc mentions load-test handoff", doc, "LOAD-TEST-2000-USERS-01");
  addContainsCase(cases, "db scaling doc mentions local/dev-safe", doc, "local/dev-safe");
  addContainsCase(cases, "db scaling doc mentions no write-action", doc, "no write-action");
  addContainsCase(cases, "db scaling doc mentions no schema changes", doc, "no schema or migration changes");
  addContainsCase(cases, "db scaling doc mentions local probe", doc, "db_pool_and_api_scaling_01_probe.js");
  addContainsCase(cases, "db scaling doc mentions report path", doc, "backend/artifacts/db-scaling/db_pool_and_api_scaling_01_report.json");
  addContainsCase(cases, "db scaling doc mentions DB_SCALING_PLAN_ONLY", doc, "DB_SCALING_PLAN_ONLY=1");
  addContainsCase(cases, "db scaling doc mentions DB_SCALING_WRITE_REPORT", doc, "DB_SCALING_WRITE_REPORT=1");
  addContainsCase(cases, "db scaling doc mentions DB_SCALING_BASE_URL", doc, "DB_SCALING_BASE_URL");
  addContainsCase(cases, "db scaling doc mentions auth token opt-in", doc, "DB_SCALING_ALLOW_AUTH_ENDPOINTS=true");
  addContainsCase(cases, "db scaling doc mentions high concurrency flag", doc, "DB_SCALING_ALLOW_HIGH_CONCURRENCY=true");
  addContainsCase(cases, "db scaling doc mentions keepalive timeout", doc, "keepAliveTimeout");
  addContainsCase(cases, "db scaling doc mentions header timeout", doc, "headersTimeout");
  addContainsCase(cases, "db scaling doc mentions request timeout", doc, "requestTimeout");
  addContainsCase(cases, "db scaling doc mentions health latency", doc, "dbLatencyMs");
  addContainsCase(cases, "db scaling doc mentions capacity baseline", doc, "capacity baseline");
  addContainsCase(cases, "db scaling doc mentions pool wait time", doc, "pool wait time");
  addContainsCase(cases, "db scaling doc mentions rate-limit signal", doc, "429 remains a real signal");
  addContainsCase(cases, "db scaling doc mentions observability milestone", doc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "db scaling doc mentions next command", doc, "node backend/scripts/db_pool_and_api_scaling_01_check.js");
  addContainsCase(cases, "db scaling doc mentions canonical alias", doc, "check:dbpoolandapiscaling01");

  const probeNeedles = [
    "DB_SCALING_BASE_URL",
    "DB_SCALING_ALLOW_HIGH_CONCURRENCY",
    "DB_SCALING_ALLOW_AUTH_ENDPOINTS",
    "DB_SCALING_AUTH_TOKEN",
    "DB_SCALING_PLAN_ONLY",
    "DB_SCALING_WRITE_REPORT",
    "DB_SCALING_REQUEST_BUDGET",
    "DB_SCALING_CONCURRENCY",
    "DB_SCALING_DURATION_MS",
    "DB_SCALING_REQUEST_TIMEOUT_MS",
    "DB_SCALING_BASE_URL must stay local/dev-safe",
    "DB_SCALING_ALLOW_AUTH_ENDPOINTS=true requires DB_SCALING_AUTH_TOKEN",
    "DB_SCALING_REQUEST_BUDGET > 40 requires DB_SCALING_ALLOW_HIGH_CONCURRENCY=true",
    "DB_SCALING_CONCURRENCY > 2 requires DB_SCALING_ALLOW_HIGH_CONCURRENCY=true",
    "http://localhost:3000",
    "/health",
    "/api/dashboard/bulk?bundle=room-operation-health",
    "/api/dashboard/bulk?bundle=company-operations",
    "/api/observability/health-summary",
    "fetch(",
    "AbortController",
    "reportPath=disabled",
    "backend/artifacts/db-scaling/db_pool_and_api_scaling_01_report.json",
    "healthDbLatencyP50",
    "healthDbLatencyP95",
    "healthDbLatencyP99",
    "PASS DB-POOL-AND-API-SCALING-01 PROBE",
  ];
  for (const needle of probeNeedles) {
    addContainsCase(cases, `probe contains ${needle}`, probe, needle);
  }
  addNotContainsCase(cases, "probe has no post", probe, 'method: "POST"');
  addNotContainsCase(cases, "probe has no put", probe, 'method: "PUT"');
  addNotContainsCase(cases, "probe has no patch", probe, 'method: "PATCH"');
  addNotContainsCase(cases, "probe has no delete", probe, 'method: "DELETE"');
  addNotContainsCase(cases, "probe has no while true", probe, "while (true)");
  addNotContainsCase(cases, "probe has no production url wording", probe, "production/public");

  addContainsCase(cases, "load-test doc mentions next milestone", loadTestDoc, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "dashboard doc mentions db scaling follow-up", dashboardDoc, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "cache doc mentions db scaling follow-up", cacheDoc, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "request storm doc mentions db scaling follow-up", requestStormDoc, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "production policy doc mentions db scaling follow-up", policyDoc, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "db scaling doc mentions dashboard bulk", doc, "DASHBOARD-BULK-ENDPOINT-01");
  addContainsCase(cases, "db scaling doc mentions cache coalescing", doc, "CACHE-COALESCING-AND-BACKOFF-01");
  addContainsCase(cases, "db scaling doc mentions request storm", doc, "REQUEST-STORM-RESILIENCE-01");
  addContainsCase(cases, "db scaling doc mentions production policy", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContainsCase(cases, "db scaling doc mentions observability handoff", doc, "OBSERVABILITY-MONITORING-ALERTING-01");

  addContainsCase(cases, "prisma fallback uses local port 5433", prismaJs, 'POSTGRES_PORT || "5433"');
  addContainsCase(cases, "prisma fallback uses non-production database url", prismaJs, "DATABASE_URL");
  addContainsCase(cases, "server health route exists", serverJs, 'app.get("/health"');
  addContainsCase(cases, "server health returns db latency", serverJs, "dbLatencyMs");
  addContainsCase(cases, "server health returns capacity", serverJs, "capacity");
  addContainsCase(cases, "server health returns edge security", serverJs, "edgeSecurity");
  addContainsCase(cases, "rate limits keeps read limiter", rateLimitsJs, "readLimiter");
  addContainsCase(cases, "rate limits keeps write limiter", rateLimitsJs, "writeLimiter");
  addContainsCase(cases, "rate limits keeps summary limiter", rateLimitsJs, "readSummaryLimiter");
  addContainsCase(cases, "rate limits keeps preview limiter", rateLimitsJs, "readPreviewLimiter");
  addContainsCase(cases, "rate limits keeps directory limiter", rateLimitsJs, "readDirectoryLimiter");
  addContainsCase(cases, "rate limits keeps report limiter", rateLimitsJs, "readReportLimiter");
  addContainsCase(cases, "rate limits keeps score limiter", rateLimitsJs, "readScoreLimiter");
  addContainsCase(cases, "capacity baseline tracks inflight", capacityJs, "inflight");
  addContainsCase(cases, "capacity baseline tracks peak inflight", capacityJs, "peakInflight");
  addContainsCase(cases, "capacity baseline tracks ws clients", capacityJs, "wsClients");
  addContainsCase(cases, "capacity baseline tracks peak ws clients", capacityJs, "peakWsClients");
  addContainsCase(cases, "capacity baseline tracks event loop lag", capacityJs, "eventLoopLagMs");
  addContainsCase(cases, "capacity baseline tracks 429 ratio", capacityJs, "ratio429Pct");
  addContainsCase(cases, "capacity baseline tracks top paths", capacityJs, "topPaths");
  addContainsCase(cases, "capacity baseline tracks p95", capacityJs, "p95Ms");
  addContainsCase(cases, "observability router exposes health summary", observabilityJs, "health-summary");
  addContainsCase(cases, "observability router exposes event types", observabilityJs, "event-types");
  addContainsCase(cases, "observability router exposes recent events", observabilityJs, "recent-events");
  addContainsCase(cases, "observability router exposes room summary", observabilityJs, "room/summary");
  addContainsCase(cases, "observability router exposes room drivers", observabilityJs, "room/drivers");
  addContainsCase(cases, "observability router exposes room issues", observabilityJs, "room/issues");
  addContainsCase(cases, "gitignore ignores db scaling artifacts", gitignore, "backend/artifacts/db-scaling/");
  addContainsCase(cases, "gitignore ignores load-test artifacts", gitignore, "backend/artifacts/load-test/");
  addContainsCase(cases, "gitignore ignores browser-smoke artifacts", gitignore, "backend/artifacts/browser-smoke/");

  const smokeSpecs = [
    { label: "product-flow", path: paths.productFlowReport, routeCount: 18, screenshotCount: 36, consoleErrorCount: 0, pageErrorCount: 0, passCount: 18 },
    { label: "premium", path: paths.premiumReport, routeCount: 82, screenshotCount: 164, consoleErrorCount: 0, pageErrorCount: 0, passCount: 82 },
    { label: "all-panels", path: paths.allPanelsReport, routeCount: 82, screenshotCount: 164, consoleErrorCount: 0, pageErrorCount: 0, passCount: 82 },
    { label: "mobile all-roles", path: paths.mobileReport, routeCount: 82, screenshotCount: 164, consoleErrorCount: 0, pageErrorCount: 0, passCount: 82 },
  ];
  const smokeReports = smokeSpecs.map((spec) => ({ spec, report: expectSmokeReport(spec) }));

  addCase(cases, "route diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0, "route diff not empty"));
  addCase(cases, "service diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0, "service diff not empty"));
  addCase(cases, "prisma diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty"));
  addCase(cases, "backend prisma diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend prisma diff not empty"));
  addCase(cases, "git diff --check stays clean", () => must(gitLines(["diff", "--check"]).length === 0, "git diff --check findings"));
  addCase(cases, "git diff --cached --check stays clean", () => must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check findings"));
  addCase(cases, "staged diff stays empty", () => must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "staged diff not empty"));
  addCase(cases, "runtime-data stays commit external", () => {
    const statusLines = gitLines(["status", "--short"]);
    must(statusLines.some((line) => line.includes("backend/artifacts/runtime-data/")), "runtime-data missing from status");
  });
  addCase(cases, "browser-smoke stays commit external", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/browser-smoke/")), "browser-smoke staged");
  });
  addCase(cases, "load-test stays commit external", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/load-test/")), "load-test staged");
  });
  addCase(cases, "db-scaling report stays commit external", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/db-scaling/")), "db-scaling staged");
  });
  addCase(cases, "debug.log stays absent", () => must(!fs.existsSync(paths.debugLog), "debug.log present"));

  const orderedTexts = [
    [harnessDoc, [
      "Load test 2000 users milestone: `LOAD-TEST-2000-USERS-01`",
      "DB pool and API scaling milestone: `DB-POOL-AND-API-SCALING-01`",
      "Agreements detail milestone: `UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01`",
    ], "script harness doc order"],
    [guide, [
      "LOAD-TEST-2000-USERS-01",
      "DB-POOL-AND-API-SCALING-01",
      "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01",
    ], "milestone guide order"],
    [primer, [
      "LOAD-TEST-2000-USERS-01",
      "DB-POOL-AND-API-SCALING-01",
      "SEFER-ABI-REASONING-ASSISTANT-01",
    ], "primer order"],
  ];
  for (const [text, needles, label] of orderedTexts) {
    addCase(cases, label, () => ordered(text, needles, label));
  }

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

  const dbPoolPolicySummary = [
    contains(prismaJs, 'POSTGRES_PORT || "5433"'),
    contains(prismaJs, "DATABASE_URL"),
    contains(serverJs, 'app.get("/health"'),
    contains(serverJs, "dbLatencyMs"),
    contains(serverJs, "capacity"),
    contains(capacityJs, "ratio429Pct"),
  ].every(Boolean)
    ? "Prisma local fallback, /health db ping, capacity baseline and 429 ratio stay in place without schema or migration changes"
    : "db pool policy incomplete";

  const apiScalingPolicySummary = [
    contains(probe, 'method: "GET"'),
    !contains(probe, 'method: "POST"'),
    !contains(probe, 'method: "PUT"'),
    !contains(probe, 'method: "PATCH"'),
    !contains(probe, 'method: "DELETE"'),
    contains(probe, "DB_SCALING_ALLOW_HIGH_CONCURRENCY"),
    contains(probe, "DB_SCALING_ALLOW_AUTH_ENDPOINTS"),
    contains(probe, "DB_SCALING_AUTH_TOKEN"),
    contains(probe, "DB_SCALING_PLAN_ONLY"),
  ].every(Boolean)
    ? "GET-only local/dev-safe probe keeps API scaling bounded; auth endpoints are opt-in and high concurrency stays flag-gated"
    : "api scaling policy incomplete";

  const timeoutBudgetSummary = [
    contains(probe, "DEFAULT_REQUEST_TIMEOUT_MS = 2500"),
    contains(probe, "DB_SCALING_REQUEST_TIMEOUT_MS"),
    contains(probe, "DB_SCALING_DURATION_MS"),
    contains(doc, "request timeout"),
    contains(doc, "keepAliveTimeout"),
    contains(doc, "headersTimeout"),
    contains(doc, "requestTimeout"),
  ].every(Boolean)
    ? "bounded timeout budget keeps request timeout, duration and the keep-alive/header timeout follow-up explicit"
    : "timeout budget incomplete";

  const readOnlyBoundarySummary = [
    contains(probe, 'method: "GET"'),
    !contains(probe, 'method: "POST"'),
    !contains(probe, 'method: "PUT"'),
    !contains(probe, 'method: "PATCH"'),
    !contains(probe, 'method: "DELETE"'),
    contains(doc, "no write-action"),
    contains(doc, "no schema or migration changes"),
    contains(doc, "auth endpoints stay opt-in only"),
  ].every(Boolean)
    ? "GET-only probe keeps write-action, human approval and Prisma mutation boundaries closed"
    : "read-only boundary incomplete";

  const compatibilitySummary = [
    contains(loadTestDoc, "DB-POOL-AND-API-SCALING-01"),
    contains(dashboardDoc, "DB-POOL-AND-API-SCALING-01"),
    contains(cacheDoc, "DB-POOL-AND-API-SCALING-01"),
    contains(requestStormDoc, "DB-POOL-AND-API-SCALING-01"),
    contains(policyDoc, "DB-POOL-AND-API-SCALING-01"),
    contains(doc, "DASHBOARD-BULK-ENDPOINT-01"),
    contains(doc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(doc, "REQUEST-STORM-RESILIENCE-01"),
    contains(doc, "PRODUCTION-RATE-LIMIT-POLICY-01"),
  ].every(Boolean)
    ? "dashboard bulk, cache coalescing, request storm and production rate limit docs hand off to DB pool and API scaling readiness"
    : "compatibility handoff incomplete";

  const observabilityHandoffSummary = [
    contains(doc, "health db latency"),
    contains(doc, "capacity baseline summary"),
    contains(doc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(probe, "healthDbLatencyP95"),
    contains(probe, "healthDbLatencyP99"),
    contains(serverJs, "capacity"),
    contains(observabilityJs, "health-summary"),
    contains(observabilityJs, "recent-events"),
  ].every(Boolean)
    ? "health latency, capacity baseline and observability endpoints provide the handoff to the next alerting milestone"
    : "observability handoff incomplete";

  const chainWiringSummary = [
    contains(pkg, '"check:dbpoolandapiscaling01": "node backend/scripts/db_pool_and_api_scaling_01_check.js"'),
    contains(runner, "check:dbpoolandapiscaling01"),
    contains(verify, "check:dbpoolandapiscaling01"),
    contains(harnessCheck, "DB-POOL-AND-API-SCALING-01"),
    contains(harnessDoc, "DB-POOL-AND-API-SCALING-01"),
    contains(guide, "DB-POOL-AND-API-SCALING-01"),
    contains(primer, "DB-POOL-AND-API-SCALING-01"),
    contains(doc, "DB-POOL-AND-API-SCALING-01"),
    contains(probe, "DB-POOL-AND-API-SCALING-01 PROBE"),
  ].every(Boolean)
    ? "package.json, runner, verify chain, harness check/doc, guide, primer, doc and probe are wired"
    : "chain wiring incomplete";

  const commitExternalSummary = [
    gitLines(["status", "--short"]).some((line) => line.includes("backend/artifacts/runtime-data/")),
    gitLines(["diff", "--cached", "--name-only"]).length === 0,
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/browser-smoke/")),
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/load-test/")),
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/db-scaling/")),
    !fs.existsSync(paths.debugLog),
  ].every(Boolean)
    ? "runtime-data working tree'de, browser-smoke/load-test/db-scaling staged değil, debug.log absent, stage empty"
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
  console.log(`dbPoolPolicySummary=${dbPoolPolicySummary}`);
  console.log(`apiScalingPolicySummary=${apiScalingPolicySummary}`);
  console.log(`timeoutBudgetSummary=${timeoutBudgetSummary}`);
  console.log(`readOnlyBoundarySummary=${readOnlyBoundarySummary}`);
  console.log(`compatibilitySummary=${compatibilitySummary}`);
  console.log(`observabilityHandoffSummary=${observabilityHandoffSummary}`);
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

  console.log("PASS DB-POOL-AND-API-SCALING-01");
}

main();
