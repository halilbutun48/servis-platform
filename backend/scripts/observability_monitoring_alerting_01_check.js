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
  doc: path.join(repoRoot, "docs", "OBSERVABILITY_MONITORING_ALERTING_01.md"),
  probe: path.join(repoRoot, "backend", "scripts", "observability_monitoring_alerting_01_probe.js"),
  loadTestDoc: path.join(repoRoot, "docs", "LOAD_TEST_2000_USERS_01.md"),
  dbScalingDoc: path.join(repoRoot, "docs", "DB_POOL_AND_API_SCALING_01.md"),
  dashboardDoc: path.join(repoRoot, "docs", "DASHBOARD_BULK_ENDPOINT_01.md"),
  cacheDoc: path.join(repoRoot, "docs", "CACHE_COALESCING_AND_BACKOFF_01.md"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  policyDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  serverJs: path.join(repoRoot, "backend", "src", "server.js"),
  observabilityJs: path.join(repoRoot, "backend", "src", "routes", "observability.js"),
  manifestJs: path.join(repoRoot, "backend", "src", "ops", "observabilityManifest.js"),
  capacityJs: path.join(repoRoot, "backend", "src", "ops", "capacityLoadBaseline.js"),
  rateLimitsJs: path.join(repoRoot, "backend", "src", "bootstrap", "rateLimits.js"),
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
  console.log("=== OBSERVABILITY-MONITORING-ALERTING-01 CHECK ===");

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
  const dbScalingDoc = readFile(paths.dbScalingDoc);
  const dashboardDoc = readFile(paths.dashboardDoc);
  const cacheDoc = readFile(paths.cacheDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const policyDoc = readFile(paths.policyDoc);
  const serverJs = readFile(paths.serverJs);
  const observabilityJs = readFile(paths.observabilityJs);
  const manifestJs = readFile(paths.manifestJs);
  const capacityJs = readFile(paths.capacityJs);
  const rateLimitsJs = readFile(paths.rateLimitsJs);
  const gitignore = readFile(paths.gitignore);

  addContainsCase(cases, "package.json exposes observability alias", pkg, '"check:observabilitymonitoringalerting01": "node backend/scripts/observability_monitoring_alerting_01_check.js"');
  addContainsCase(cases, "product extensions runner includes observability check", runner, "check:observabilitymonitoringalerting01");
  addContainsCase(cases, "verify chain includes observability check", verify, "check:observabilitymonitoringalerting01");
  addContainsCase(cases, "script harness check knows observability milestone", harnessCheck, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "script harness check knows observability alias", harnessCheck, "check:observabilitymonitoringalerting01");
  addContainsCase(cases, "script harness check knows observability doc", harnessCheck, "docs/OBSERVABILITY_MONITORING_ALERTING_01.md");
  addContainsCase(cases, "script harness check knows observability probe", harnessCheck, "backend/scripts/observability_monitoring_alerting_01_probe.js");
  addContainsCase(cases, "script harness doc lists observability milestone", harnessDoc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "script harness doc lists observability alias", harnessDoc, "check:observabilitymonitoringalerting01");
  addContainsCase(cases, "script harness doc lists observability doc", harnessDoc, "docs/OBSERVABILITY_MONITORING_ALERTING_01.md");
  addContainsCase(cases, "script harness doc lists observability command", harnessDoc, "node backend\\scripts\\observability_monitoring_alerting_01_check.js");
  addContainsCase(cases, "script harness doc lists observability probe", harnessDoc, "node backend\\scripts\\observability_monitoring_alerting_01_probe.js");
  addContainsCase(cases, "milestone guide lists observability milestone", guide, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "milestone guide lists observability alias", guide, "check:observabilitymonitoringalerting01");
  addContainsCase(cases, "milestone guide lists observability command", guide, "node backend\\scripts\\observability_monitoring_alerting_01_check.js");
  addContainsCase(cases, "milestone guide lists observability probe", guide, "node backend\\scripts\\observability_monitoring_alerting_01_probe.js");
  addContainsCase(cases, "milestone guide lists observability doc", guide, "docs/OBSERVABILITY_MONITORING_ALERTING_01.md");
  addContainsCase(cases, "primer lists observability milestone", primer, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "primer lists observability alias", primer, "check:observabilitymonitoringalerting01");
  addContainsCase(cases, "primer lists observability doc", primer, "docs/OBSERVABILITY_MONITORING_ALERTING_01.md");
  addContainsCase(cases, "primer lists observability command", primer, "backend/scripts/observability_monitoring_alerting_01_check.js");

  const docHeadings = [
    "# OBSERVABILITY-MONITORING-ALERTING-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Observability signal model",
    "## 4) Health surface policy",
    "## 5) Metrics taxonomy",
    "## 6) Alert matrix",
    "## 7) KVKK-safe logging and wording",
    "## 8) Smoke / load-test / DB-scaling linkage",
    "## 9) Dashboard and rate-limit compatibility",
    "## 10) Local/dev-safe probe policy",
    "## 11) Incident runbook",
    "## 12) What is not changed",
    "## 13) What remains for production infra",
    "## 14) Validation results",
    "## 15) Remaining risks",
    "## 16) Next recommended milestone",
  ];
  for (const heading of docHeadings) {
    addContainsCase(cases, `observability doc heading ${heading}`, doc, heading);
  }
  addContainsCase(cases, "observability doc mentions local/dev-safe", doc, "local/dev-safe");
  addContainsCase(cases, "observability doc mentions read-only boundary", doc, "read-only");
  addContainsCase(cases, "observability doc mentions no write-action", doc, "write-action");
  addContainsCase(cases, "observability doc mentions no schema changes", doc, "schema / migration");
  addContainsCase(cases, "observability doc mentions production/public boundary", doc, "production/public URL");
  addContainsCase(cases, "observability doc mentions /health", doc, "/health");
  addContainsCase(cases, "observability doc mentions health summary endpoint", doc, "/api/observability/health-summary");
  addContainsCase(cases, "observability doc mentions event types endpoint", doc, "/api/observability/event-types");
  addContainsCase(cases, "observability doc mentions recent events endpoint", doc, "/api/observability/recent-events");
  addContainsCase(cases, "observability doc mentions room summary endpoint", doc, "/api/observability/room/summary");
  addContainsCase(cases, "observability doc mentions room drivers endpoint", doc, "/api/observability/room/drivers");
  addContainsCase(cases, "observability doc mentions room issues endpoint", doc, "/api/observability/room/issues");
  addContainsCase(cases, "observability doc mentions metrics taxonomy", doc, "ratio429Pct");
  addContainsCase(cases, "observability doc mentions db latency", doc, "dbLatencyMs");
  addContainsCase(cases, "observability doc mentions inflight", doc, "inflight");
  addContainsCase(cases, "observability doc mentions peak inflight", doc, "peakInflight");
  addContainsCase(cases, "observability doc mentions ws clients", doc, "wsClients");
  addContainsCase(cases, "observability doc mentions peak ws clients", doc, "peakWsClients");
  addContainsCase(cases, "observability doc mentions event loop lag", doc, "eventLoopLagMs");
  addContainsCase(cases, "observability doc mentions event loop lag peak", doc, "eventLoopLagPeakMs");
  addContainsCase(cases, "observability doc mentions rate limit code", doc, "RATE_LIMITED");
  addContainsCase(cases, "observability doc mentions retry-after seconds", doc, "retryAfterSec");
  addContainsCase(cases, "observability doc mentions kvkk proof key", doc, "SURUCUNUN_TELEFON_GPSI");
  addContainsCase(cases, "observability doc mentions plain tr wording", doc, "plain-tr");
  addContainsCase(cases, "observability doc mentions observability probe", doc, "backend/scripts/observability_monitoring_alerting_01_probe.js");
  addContainsCase(cases, "observability doc mentions observability report path", doc, "backend/artifacts/observability/observability_monitoring_alerting_01_report.json");
  addContainsCase(cases, "observability doc mentions load-test handoff", doc, "LOAD-TEST-2000-USERS-01");
  addContainsCase(cases, "observability doc mentions db scaling handoff", doc, "DB-POOL-AND-API-SCALING-01");
  addContainsCase(cases, "observability doc mentions request storm handoff", doc, "REQUEST-STORM-RESILIENCE-01");
  addContainsCase(cases, "observability doc mentions production policy handoff", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");
  addContainsCase(cases, "observability doc mentions dashboard bulk handoff", doc, "DASHBOARD-BULK-ENDPOINT-01");
  addContainsCase(cases, "observability doc mentions cache coalescing handoff", doc, "CACHE-COALESCING-AND-BACKOFF-01");
  addContainsCase(cases, "observability doc mentions next milestone", doc, "UX-SUPERADMIN-LIVE-MONITORING-01");

  const probeNeedles = [
    "OBSERVABILITY_BASE_URL",
    "DB_SCALING_BASE_URL",
    "LOAD_TEST_BASE_URL",
    "API_URL",
    "OBSERVABILITY_ALLOW_AUTH_ENDPOINTS",
    "OBSERVABILITY_AUTH_TOKEN",
    "OBSERVABILITY_PLAN_ONLY",
    "OBSERVABILITY_WRITE_REPORT",
    "OBSERVABILITY_REQUEST_TIMEOUT_MS",
    "OBSERVABILITY_BASE_URL must stay local/dev-safe",
    "OBSERVABILITY_ALLOW_AUTH_ENDPOINTS=true requires OBSERVABILITY_AUTH_TOKEN",
    "http://localhost:3000",
    "localhost",
    "127.0.0.1",
    "::1",
    "/health",
    "/api/observability/health-summary",
    "/api/observability/event-types",
    "method: \"GET\"",
    "fetch(",
    "AbortController",
    "reportPath=disabled",
    "backend/artifacts/observability/observability_monitoring_alerting_01_report.json",
    "healthSummaryStatus",
    "healthDbLatencyMs",
    "capacityInflight",
    "capacityPeakInflight",
    "capacityEventLoopLagMs",
    "observabilityWidgetCount",
    "observabilityEventTypeCount",
    "PASS OBSERVABILITY-MONITORING-ALERTING-01 PROBE",
  ];
  for (const needle of probeNeedles) {
    addContainsCase(cases, `probe contains ${needle}`, probe, needle);
  }
  addNotContainsCase(cases, "probe has no post", probe, 'method: "POST"');
  addNotContainsCase(cases, "probe has no put", probe, 'method: "PUT"');
  addNotContainsCase(cases, "probe has no patch", probe, 'method: "PATCH"');
  addNotContainsCase(cases, "probe has no delete", probe, 'method: "DELETE"');
  addNotContainsCase(cases, "probe has no while true", probe, "while (true)");
  addNotContainsCase(cases, "probe has no production/public wording", probe, "production/public");

  addContainsCase(cases, "server health route exists", serverJs, 'app.get("/health"');
  addContainsCase(cases, "server health returns db latency", serverJs, "dbLatencyMs");
  addContainsCase(cases, "server health returns capacity", serverJs, "capacity");
  addContainsCase(cases, "server health returns edge security", serverJs, "edgeSecurity");
  addContainsCase(cases, "observability router exposes manifest", observabilityJs, "manifest");
  addContainsCase(cases, "observability router exposes health summary", observabilityJs, "health-summary");
  addContainsCase(cases, "observability router exposes event types", observabilityJs, "event-types");
  addContainsCase(cases, "observability router exposes recent events", observabilityJs, "recent-events");
  addContainsCase(cases, "observability router exposes room summary", observabilityJs, "room/summary");
  addContainsCase(cases, "observability router exposes room drivers", observabilityJs, "room/drivers");
  addContainsCase(cases, "observability router exposes room issues", observabilityJs, "room/issues");
  addContainsCase(cases, "manifest exposes mobile health event types", manifestJs, "MOBILE_HEALTH_EVENT_TYPES");
  addContainsCase(cases, "manifest exposes observability widgets", manifestJs, "M59_OBSERVABILITY_WIDGETS");
  addContainsCase(cases, "manifest exposes kvkk gps source", manifestJs, "SURUCUNUN_TELEFON_GPSI");
  addContainsCase(cases, "manifest exposes plain tr tone", manifestJs, "plain-tr");
  addContainsCase(cases, "capacity baseline tracks inflight", capacityJs, "inflight");
  addContainsCase(cases, "capacity baseline tracks peak inflight", capacityJs, "peakInflight");
  addContainsCase(cases, "capacity baseline tracks ws clients", capacityJs, "wsClients");
  addContainsCase(cases, "capacity baseline tracks peak ws clients", capacityJs, "peakWsClients");
  addContainsCase(cases, "capacity baseline tracks event loop lag", capacityJs, "eventLoopLagMs");
  addContainsCase(cases, "capacity baseline tracks event loop lag peak", capacityJs, "eventLoopLagPeakMs");
  addContainsCase(cases, "capacity baseline tracks 429 ratio", capacityJs, "ratio429Pct");
  addContainsCase(cases, "capacity baseline tracks warnings", capacityJs, "warnings");
  addContainsCase(cases, "rate limits keeps rate limited code", rateLimitsJs, "RATE_LIMITED");
  addContainsCase(cases, "rate limits keeps retry after seconds", rateLimitsJs, "retryAfterSec");
  addContainsCase(cases, "rate limits keeps read limiter", rateLimitsJs, "readLimiter");
  addContainsCase(cases, "rate limits keeps write limiter", rateLimitsJs, "writeLimiter");
  addContainsCase(cases, "rate limits keeps summary limiter", rateLimitsJs, "readSummaryLimiter");
  addContainsCase(cases, "rate limits keeps preview limiter", rateLimitsJs, "readPreviewLimiter");
  addContainsCase(cases, "rate limits keeps directory limiter", rateLimitsJs, "readDirectoryLimiter");
  addContainsCase(cases, "rate limits keeps report limiter", rateLimitsJs, "readReportLimiter");
  addContainsCase(cases, "rate limits keeps score limiter", rateLimitsJs, "readScoreLimiter");
  addContainsCase(cases, "gitignore ignores observability artifacts", gitignore, "backend/artifacts/observability/");

  addContainsCase(cases, "load-test doc mentions observability follow-up", loadTestDoc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "db scaling doc mentions observability follow-up", dbScalingDoc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "dashboard doc mentions observability follow-up", dashboardDoc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "cache doc mentions observability follow-up", cacheDoc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "request storm doc mentions observability follow-up", requestStormDoc, "OBSERVABILITY-MONITORING-ALERTING-01");
  addContainsCase(cases, "production policy doc mentions observability follow-up", policyDoc, "OBSERVABILITY-MONITORING-ALERTING-01");

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
  addCase(cases, "load-test report stays commit external", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/load-test/")), "load-test staged");
  });
  addCase(cases, "db-scaling report stays commit external", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/db-scaling/")), "db-scaling staged");
  });
  addCase(cases, "observability report stays commit external", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/observability/")), "observability staged");
  });
  addCase(cases, "debug.log stays absent", () => must(!fs.existsSync(paths.debugLog), "debug.log present"));

  const orderedTexts = [
    [harnessDoc, [
      "Load test 2000 users milestone: `LOAD-TEST-2000-USERS-01`",
      "DB pool and API scaling milestone: `DB-POOL-AND-API-SCALING-01`",
      "Observability monitoring alerting milestone: `OBSERVABILITY-MONITORING-ALERTING-01`",
      "Agreements detail milestone: `UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01`",
    ], "script harness doc order"],
    [guide, [
      "LOAD-TEST-2000-USERS-01",
      "DB-POOL-AND-API-SCALING-01",
      "OBSERVABILITY-MONITORING-ALERTING-01",
      "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01",
    ], "milestone guide order"],
    [primer, [
      "LOAD-TEST-2000-USERS-01",
      "DB-POOL-AND-API-SCALING-01",
      "OBSERVABILITY-MONITORING-ALERTING-01",
      "SEFER-ABI-TURKISH-USER-FACING-TERMINOLOGY-AUDIT-01",
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

  const metricsSummary = [
    contains(doc, "dbLatencyMs"),
    contains(doc, "inflight"),
    contains(doc, "peakInflight"),
    contains(doc, "wsClients"),
    contains(doc, "peakWsClients"),
    contains(doc, "eventLoopLagMs"),
    contains(doc, "eventLoopLagPeakMs"),
    contains(doc, "ratio429Pct"),
    contains(rateLimitsJs, "RATE_LIMITED"),
    contains(rateLimitsJs, "retryAfterSec"),
  ].every(Boolean)
    ? "db latency, inflight, ws clients, event loop lag and 429 ratio stay visible"
    : "metrics coverage incomplete";

  const alertMatrixSummary = [
    contains(doc, "RATE_LIMITED"),
    contains(doc, "retryAfterSec"),
    contains(doc, "ratio429Pct"),
    contains(doc, "warnings"),
    contains(doc, "health surface"),
    contains(rateLimitsJs, "RATE_LIMITED"),
    contains(capacityJs, "warnings"),
  ].every(Boolean)
    ? "429, retryAfterSec, ratio429Pct and warnings stay in the alert band without masking real rate-limit signals"
    : "alert matrix incomplete";

  const kvkkSafeLoggingSummary = [
    contains(doc, "SURUCUNUN_TELEFON_GPSI"),
    contains(doc, "plain-tr"),
    contains(doc, "Kayıt ayrıştırılamadı"),
    contains(doc, "Kanıt anahtarı"),
    contains(doc, "Sistem kanıtı"),
    contains(manifestJs, "SURUCUNUN_TELEFON_GPSI"),
    contains(manifestJs, "plain-tr"),
  ].every(Boolean)
    ? "KVKK-safe wording keeps raw parse, claims hash and internal token leakage out of the public wording"
    : "KVKK-safe wording incomplete";

  const probeSafetySummary = [
    contains(probe, "OBSERVABILITY_BASE_URL must stay local/dev-safe"),
    contains(probe, "OBSERVABILITY_ALLOW_AUTH_ENDPOINTS=true requires OBSERVABILITY_AUTH_TOKEN"),
    contains(probe, "http://localhost:3000"),
    contains(probe, "localhost"),
    contains(probe, "127.0.0.1"),
    contains(probe, "::1"),
    contains(probe, 'method: "GET"'),
    !contains(probe, 'method: "POST"'),
    !contains(probe, 'method: "PUT"'),
    !contains(probe, 'method: "PATCH"'),
    !contains(probe, 'method: "DELETE"'),
    !contains(probe, "while (true)"),
    !contains(probe, "production/public"),
  ].every(Boolean)
    ? "probe stays GET-only, localhost-only, auth opt-in and write-action free"
    : "probe safety incomplete";

  const incidentRunbookSummary = [
    contains(doc, "/api/observability/manifest"),
    contains(doc, "/api/observability/health-summary"),
    contains(doc, "/api/observability/event-types"),
    contains(doc, "/api/observability/recent-events"),
    contains(doc, "/api/observability/room/summary"),
    contains(doc, "/api/observability/room/drivers"),
    contains(doc, "/api/observability/room/issues"),
    contains(observabilityJs, "health-summary"),
    contains(observabilityJs, "recent-events"),
    contains(observabilityJs, "room/issues"),
  ].every(Boolean)
    ? "manifest, health-summary, event types, recent events and room issues stay on the incident runbook surface"
    : "incident runbook surface incomplete";

  const compatibilitySummary = [
    contains(loadTestDoc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(dbScalingDoc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(dashboardDoc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(cacheDoc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(requestStormDoc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(policyDoc, "OBSERVABILITY-MONITORING-ALERTING-01"),
  ].every(Boolean)
    ? "load-test, db scaling, dashboard bulk, cache coalescing, request storm and rate-limit docs hand off to observability readiness"
    : "compatibility handoff incomplete";

  const chainWiringSummary = [
    contains(pkg, '"check:observabilitymonitoringalerting01": "node backend/scripts/observability_monitoring_alerting_01_check.js"'),
    contains(runner, "check:observabilitymonitoringalerting01"),
    contains(verify, "check:observabilitymonitoringalerting01"),
    contains(harnessCheck, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(harnessDoc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(guide, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(primer, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(doc, "OBSERVABILITY-MONITORING-ALERTING-01"),
    contains(probe, "PASS OBSERVABILITY-MONITORING-ALERTING-01 PROBE"),
  ].every(Boolean)
    ? "package.json, runner, verify chain, harness check/doc, guide, primer, doc and probe are wired"
    : "chain wiring incomplete";

  const commitExternalSummary = [
    gitLines(["status", "--short"]).some((line) => line.includes("backend/artifacts/runtime-data/")),
    gitLines(["diff", "--cached", "--name-only"]).length === 0,
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/browser-smoke/")),
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/load-test/")),
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/db-scaling/")),
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/observability/")),
    !fs.existsSync(paths.debugLog),
  ].every(Boolean)
    ? "runtime-data working tree'de, browser-smoke/load-test/db-scaling/observability staged değil, debug.log absent, stage empty"
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
  console.log(`metricsSummary=${metricsSummary}`);
  console.log(`alertMatrixSummary=${alertMatrixSummary}`);
  console.log(`kvkkSafeLoggingSummary=${kvkkSafeLoggingSummary}`);
  console.log(`probeSafetySummary=${probeSafetySummary}`);
  console.log(`incidentRunbookSummary=${incidentRunbookSummary}`);
  console.log(`compatibilitySummary=${compatibilitySummary}`);
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

  console.log("PASS OBSERVABILITY-MONITORING-ALERTING-01");
}

main();
