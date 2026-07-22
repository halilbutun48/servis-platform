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
  doc: path.join(repoRoot, "docs", "CACHE_COALESCING_AND_BACKOFF_01.md"),
  dashboardBulkDoc: path.join(repoRoot, "docs", "DASHBOARD_BULK_ENDPOINT_01.md"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  policyDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  responseCache: path.join(repoRoot, "backend", "src", "utils", "responseCache.js"),
  dashboardBulkHelper: path.join(repoRoot, "web", "src", "utils", "dashboardBulk.js"),
  uiDataCache: path.join(repoRoot, "web", "src", "utils", "uiDataCache.js"),
  dashboardBulkService: path.join(repoRoot, "backend", "src", "services", "dashboardBulk.js"),
  dashboardBulkRoute: path.join(repoRoot, "backend", "src", "routes", "dashboardBulk.js"),
  productFlowReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PRODUCT_FLOW_BUTTON_AUDIT_01", "report.json"),
  premiumReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_LIVE_PANEL_PREMIUM_SMOKE_01", "report.json"),
  allPanelsReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_ALL_PANELS_REALITY_AUDIT_01", "report.json"),
  mobileReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01", "report.json"),
  debugLog: path.join(repoRoot, "debug.log"),
};

const smokeSpecs = [
  { label: "product-flow", path: paths.productFlowReport, routeCount: 18, screenshotCount: 36, passCount: 18 },
  { label: "premium", path: paths.premiumReport, routeCount: 82, screenshotCount: 164, passCount: 82 },
  {
    label: "all-panels",
    path: paths.allPanelsReport,
    routeCount: 82,
    screenshotCount: 164,
    passCount: 82,
  },
  {
    label: "mobile all-roles",
    path: paths.mobileReport,
    routeCount: 82,
    screenshotCount: 164,
    passCount: 82,
  },
];

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
  if (!condition) throw new Error(`FAIL ${label}`);
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

function expectSmoke(spec) {
  must(fs.existsSync(spec.path), `${spec.label} report exists`);
  const report = readJson(spec.path);
  const routeConsoleErrors = Array.isArray(report.routes)
    ? report.routes.flatMap((row) => Array.isArray(row.consoleErrors) ? row.consoleErrors : [])
    : [];
  must(Number(report.routeCount || 0) === spec.routeCount, `${spec.label} route count`);
  must(Number(report.screenshotCount || 0) === spec.screenshotCount, `${spec.label} screenshot count`);
  must(Boolean(report.success) === true, `${spec.label} success flag`);
  must(Number(report.consoleErrorCount || 0) === 0, `${spec.label} console error count`);
  must(Number(report.pageErrorCount || 0) === 0, `${spec.label} page error count`);
  must(Number(report.statusCounts?.PASS || 0) === spec.passCount, `${spec.label} PASS count`);
  must(Number(report.statusCounts?.["PASS-"] || 0) === 0, `${spec.label} PASS- count`);
  must(Number(report.statusCounts?.["UX-FIX"] || 0) === 0, `${spec.label} UX-FIX count`);
  must(Number(report.statusCounts?.BLOCKER || 0) === 0, `${spec.label} BLOCKER count`);
  must(Array.isArray(report.routes) && report.routes.length === spec.routeCount, `${spec.label} route rows count`);
  must(routeConsoleErrors.length === 0, `${spec.label} console errors empty`);
  must(report.routes.every((row) => Array.isArray(row.pageErrors) && row.pageErrors.length === 0), `${spec.label} page errors empty`);
  return report;
}

function statusCountsSummary(report) {
  const counts = report.statusCounts || {};
  return [
    `PASS ${Number(counts.PASS || 0)}`,
    `PASS- ${Number(counts["PASS-"] || 0)}`,
    `UX-FIX ${Number(counts["UX-FIX"] || 0)}`,
    `BLOCKER ${Number(counts.BLOCKER || 0)}`,
  ].join(" / ");
}

function main() {
  console.log("=== CACHE-COALESCING-AND-BACKOFF-01 CHECK ===");

  const pkg = readFile(paths.packageJson);
  const runner = readFile(paths.runner);
  const verify = readFile(paths.verify);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const dashboardBulkDoc = readFile(paths.dashboardBulkDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const policyDoc = readFile(paths.policyDoc);
  const responseCache = readFile(paths.responseCache);
  const dashboardBulkHelper = readFile(paths.dashboardBulkHelper);
  const uiDataCache = readFile(paths.uiDataCache);
  const dashboardBulkService = readFile(paths.dashboardBulkService);
  const dashboardBulkRoute = readFile(paths.dashboardBulkRoute);

  const cases = [];

  const chainNeedles = [
    [pkg, '"check:cachecoalescingandbackoff01": "node backend/scripts/cache_coalescing_and_backoff_01_check.js"'],
    [runner, "check:cachecoalescingandbackoff01"],
    [verify, '"check:cachecoalescingandbackoff01"'],
    [harnessCheck, "CACHE-COALESCING-AND-BACKOFF-01"],
    [harnessCheck, "check:cachecoalescingandbackoff01"],
    [harnessCheck, "docs/CACHE_COALESCING_AND_BACKOFF_01.md"],
    [harnessCheck, "backend/scripts/cache_coalescing_and_backoff_01_check.js"],
    [harnessDoc, "CACHE-COALESCING-AND-BACKOFF-01"],
    [harnessDoc, "check:cachecoalescingandbackoff01"],
    [harnessDoc, "docs/CACHE_COALESCING_AND_BACKOFF_01.md"],
    [harnessDoc, "node backend\\scripts\\cache_coalescing_and_backoff_01_check.js"],
    [guide, "CACHE-COALESCING-AND-BACKOFF-01"],
    [guide, "check:cachecoalescingandbackoff01"],
    [guide, "node backend\\scripts\\cache_coalescing_and_backoff_01_check.js"],
    [guide, "docs/CACHE_COALESCING_AND_BACKOFF_01.md"],
    [primer, "CACHE-COALESCING-AND-BACKOFF-01"],
    [primer, "check:cachecoalescingandbackoff01"],
    [primer, "docs/CACHE_COALESCING_AND_BACKOFF_01.md"],
    [primer, "backend/scripts/cache_coalescing_and_backoff_01_check.js"],
    [dashboardBulkDoc, "CACHE-COALESCING-AND-BACKOFF-01"],
    [requestStormDoc, "CACHE-COALESCING-AND-BACKOFF-01"],
    [policyDoc, "CACHE-COALESCING-AND-BACKOFF-01"],
  ];
  for (const [text, needle] of chainNeedles) {
    addContains(cases, `chain wiring contains ${needle}`, text, needle);
  }

  const docHeadings = [
    "# CACHE-COALESCING-AND-BACKOFF-01",
    "## 1) Purpose",
    "## 2) Problem statement",
    "## 3) Coalescing policy",
    "## 4) Cache key isolation model",
    "## 5) Backoff / retry policy",
    "## 6) Backend implementation",
    "## 7) Frontend integration",
    "## 8) New guard script",
    "## 9) Validation",
    "## 10) Diff / boundary safety",
    "## 11) Remaining risks",
    "## 12) Next recommended milestone",
  ];
  for (const heading of docHeadings) {
    addContains(cases, `cache coalescing doc heading ${heading}`, doc, heading);
  }
  addContains(cases, "cache coalescing doc read-only wording", doc, "read-only");
  addContains(cases, "cache coalescing doc write-action boundary", doc, "write-action");
  addContains(cases, "cache coalescing doc human approval boundary", doc, "human approval");
  addContains(cases, "cache coalescing doc backoff wording", doc, "backoff");
  addContains(cases, "cache coalescing doc retry-after wording", doc, "Retry-After");
  addContains(cases, "cache coalescing doc bounded backoff wording", doc, "bounded backoff");
  addContains(cases, "cache coalescing doc response cache source", doc, "backend/src/utils/responseCache.js");
  addContains(cases, "cache coalescing doc ui cache source", doc, "web/src/utils/uiDataCache.js");
  addContains(cases, "cache coalescing doc dashboard bulk source", doc, "backend/src/services/dashboardBulk.js");
  addContains(cases, "cache coalescing doc dashboard helper source", doc, "web/src/utils/dashboardBulk.js");
  addContains(cases, "cache coalescing doc request storm reference", doc, "REQUEST-STORM-RESILIENCE-01");
  addContains(cases, "cache coalescing doc production policy reference", doc, "PRODUCTION-RATE-LIMIT-POLICY-01");

  const responseCacheNeedles = [
    "const inflight = new Map();",
    "let cacheVersion = 0;",
    "function bumpCacheVersion()",
    "function matchesTarget(",
    "if (existing?.promise) return existing.promise;",
    "if (versionAtStart === cacheVersion)",
    "inflight.delete(compositeKey);",
    "clearResponseCacheExact",
    "clearResponseCache(prefix = '', scope = null)",
  ];
  for (const needle of responseCacheNeedles) {
    addContains(cases, `response cache contains ${needle}`, responseCache, needle);
  }

  const uiCacheNeedles = [
    "const inflight = new Map();",
    "const failures = new Map();",
    "const MAX_CONCURRENT = 1;",
    "const AUTH_REQUEST_GAP_MS = 500;",
    "const waitFor = Math.max(0, nextNetworkAt - now);",
    "nextNetworkAt = Date.now() + AUTH_REQUEST_GAP_MS;",
    "if (inflight.has(key)) return inflight.get(key);",
    "if (Number(error?.status || 0) === 429 && retryAfterSec > 0)",
    "nextNetworkAt = Math.max(nextNetworkAt, Date.now() + (retryAfterSec * 1000));",
    "function pump()",
    "function schedule(run)",
  ];
  for (const needle of uiCacheNeedles) {
    addContains(cases, `ui cache contains ${needle}`, uiDataCache, needle);
  }
  addNotContains(cases, "ui cache has no infinite retry", uiDataCache, "while (true) {");
  addNotContains(cases, "ui cache has no 429 ignore list", uiDataCache, "ignore 429");

  const dashboardBulkNeedles = [
    "loadDashboardBulkBundle",
    "const payload = await loadDashboardBulkBundle",
    "return await cachedGet(`/api/dashboard/bulk",
    "buildQueryString",
    "normalizeItems",
    "bundle",
    "force = false",
    "signal",
    "ttlMs = DEFAULT_TTL_MS",
    "delayMs = DEFAULT_DELAY_MS",
    "cachedGet",
  ];
  for (const needle of dashboardBulkNeedles) {
    addContains(cases, `dashboard bulk helper contains ${needle}`, dashboardBulkHelper, needle);
  }
  addContains(cases, "dashboard bulk service imports rememberResponse", dashboardBulkService, "rememberResponse");
  addContains(cases, "dashboard bulk service uses read-only cache key", dashboardBulkService, "dashboard-bulk:");
  addContains(cases, "dashboard bulk service keeps bundle loaders", dashboardBulkService, "const BUNDLE_LOADERS = {");
  addContains(cases, "dashboard bulk service keeps bundle roles", dashboardBulkService, "const BUNDLE_ROLES = {");
  addContains(cases, "dashboard bulk service keeps scope isolation", dashboardBulkService, "scopeOf(user)");
  addContains(cases, "dashboard bulk route remains GET only", dashboardBulkRoute, 'r.get("/bulk", authRequired()');
  addNotContains(cases, "dashboard bulk route has no POST", dashboardBulkRoute, "r.post(");
  addNotContains(cases, "dashboard bulk route has no PUT", dashboardBulkRoute, "r.put(");
  addNotContains(cases, "dashboard bulk route has no PATCH", dashboardBulkRoute, "r.patch(");
  addNotContains(cases, "dashboard bulk route has no DELETE", dashboardBulkRoute, "r.delete(");

  const smokeReports = smokeSpecs.map((spec) => ({ spec, report: expectSmoke(spec) }));

  const diffChecks = [
    ["backend routes diff is empty", ["diff", "--name-only", "--", "backend/src/routes"]],
    ["backend services diff is empty", ["diff", "--name-only", "--", "backend/src/services"]],
    ["prisma diff is empty", ["diff", "--name-only", "--", "prisma"]],
    ["backend prisma diff is empty", ["diff", "--name-only", "--", "backend/prisma"]],
  ];
  for (const [label, args] of diffChecks) {
    addCase(cases, label, () => must(gitLines(args).length === 0, label));
  }

  addCase(cases, "git diff check is clean", () => must(gitLines(["diff", "--check"]).length === 0, "git diff --check has findings"));
  addCase(cases, "git cached diff check is clean", () => must(gitLines(["diff", "--cached", "--check"]).length === 0, "git diff --cached --check has findings"));
  addCase(cases, "staged diff is empty", () => must(gitLines(["diff", "--cached", "--name-only"]).length === 0, "staged diff not empty"));
  addCase(cases, "working tree keeps runtime-data dirty", () => {
    const lines = gitLines(["status", "--short"]);
    must(lines.some((line) => line.includes("backend/artifacts/runtime-data/")), "runtime-data entries missing from status");
  });
  addCase(cases, "working tree does not stage browser-smoke", () => {
    const staged = gitLines(["diff", "--cached", "--name-only"]);
    must(!staged.some((line) => line.includes("backend/artifacts/browser-smoke")), "browser-smoke artifacts staged");
  });
  addCase(cases, "debug.log is absent", () => must(!fs.existsSync(paths.debugLog), "debug.log is present"));

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

  const responseCacheSummary = [
    contains(responseCache, "const inflight = new Map();"),
    contains(responseCache, "if (existing?.promise) return existing.promise;"),
    contains(responseCache, "if (versionAtStart === cacheVersion)"),
    contains(responseCache, "clearResponseCacheExact"),
    contains(responseCache, "clearResponseCache(prefix = '', scope = null)"),
  ].every(Boolean)
    ? "same-key inflight backend reads coalesce and stale cache writes are suppressed after invalidation"
    : "responseCache coalescing eksik";

  const readOnlyScopeSummary = [
    contains(dashboardBulkRoute, 'r.get("/bulk", authRequired()'),
    !contains(dashboardBulkRoute, "r.post("),
    !contains(dashboardBulkRoute, "r.put("),
    !contains(dashboardBulkRoute, "r.patch("),
    !contains(dashboardBulkRoute, "r.delete("),
    contains(dashboardBulkService, "rememberResponse"),
    contains(dashboardBulkHelper, "cachedGet"),
  ].every(Boolean)
    ? "coalescing read-only dashboard bulk / cached GET akışlarında kalıyor; write-action, auth and human approval yüzeyleri dışlanıyor"
    : "read-only scope bozuldu";

  const cacheKeyIsolationSummary = [
    contains(dashboardBulkService, "scopeOf(user)"),
    contains(dashboardBulkService, "bulkCacheKey(bundle, user, query = {})"),
    contains(dashboardBulkService, "dashboard-bulk:"),
    contains(dashboardBulkHelper, "buildQueryString"),
    contains(dashboardBulkHelper, "bundle"),
    contains(uiDataCache, "tokenScope(token)"),
    contains(uiDataCache, "companyId"),
    contains(uiDataCache, "tenantId"),
    contains(uiDataCache, "keyOf(url, token)"),
  ].every(Boolean)
    ? "role/company/room/user scope plus bundle/query and token/url keying cross-role contaminationı engelliyor"
    : "cache key isolation eksik";

  const backoffSummary = [
    contains(uiDataCache, "MAX_CONCURRENT = 1"),
    contains(uiDataCache, "AUTH_REQUEST_GAP_MS = 500"),
    contains(uiDataCache, "const waitFor = Math.max(0, nextNetworkAt - now);"),
    contains(uiDataCache, "retryAfterSec > 0"),
    contains(uiDataCache, "nextNetworkAt = Math.max(nextNetworkAt, Date.now() + (retryAfterSec * 1000));"),
    contains(uiDataCache, "nextNetworkAt = Date.now() + AUTH_REQUEST_GAP_MS;"),
    !contains(uiDataCache, "ignore 429"),
  ].every(Boolean)
    ? "bounded request gap / retry-after backoff korunuyor; console/page error 0 ve infinite retry yok"
    : "backoff policy bozuldu";

  const dashboardBulkCompatibilitySummary = [
    contains(dashboardBulkHelper, "loadDashboardBulkBundle"),
    contains(dashboardBulkHelper, "cachedGet"),
    contains(dashboardBulkService, "rememberResponse"),
    contains(dashboardBulkService, "assertBundleAccess"),
    contains(dashboardBulkDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
  ].every(Boolean)
    ? "dashboard bulk bulk-first kalıyor; fallback korunuyor; backend rememberResponse aynı-key inflight coalescing ile çalışıyor"
    : "dashboard bulk compatibility eksik";

  const requestStormCompatibilitySummary = [
    contains(requestStormDoc, "sharedStorageState"),
    contains(requestStormDoc, "429 ignore list"),
    contains(requestStormDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(policyDoc, "READ_HEAVY_SOFT"),
    contains(policyDoc, "429 Console Policy"),
    contains(policyDoc, "request-storm"),
  ].every(Boolean)
    ? "request-storm smoke boundary ve zero console/page error policy korunuyor; cache coalescing/backoff companion guard olarak belgelenmiş"
    : "request-storm compatibility eksik";

  const smokeThresholdSummary = smokeReports.every(({ report, spec }) =>
    Number(report.statusCounts?.PASS || 0) === spec.passCount &&
    Number(report.statusCounts?.["PASS-"] || 0) === 0 &&
    Number(report.statusCounts?.["UX-FIX"] || 0) === 0 &&
    Number(report.statusCounts?.BLOCKER || 0) === 0
  )
    ? `product-flow PASS ${smokeReports[0].report.statusCounts.PASS}/0/0/0; premium PASS ${smokeReports[1].report.statusCounts.PASS}/0/0/0; all-panels PASS ${smokeReports[2].report.statusCounts.PASS}/0/0/0; mobile all-roles PASS ${smokeReports[3].report.statusCounts.PASS}/0/0/0`
    : `smoke thresholds changed; product-flow PASS ${smokeReports[0].report.statusCounts.PASS}/${smokeReports[0].report.statusCounts["PASS-"] || 0}/${smokeReports[0].report.statusCounts["UX-FIX"] || 0}/${smokeReports[0].report.statusCounts.BLOCKER || 0}; premium PASS ${smokeReports[1].report.statusCounts.PASS}/${smokeReports[1].report.statusCounts["PASS-"] || 0}/${smokeReports[1].report.statusCounts["UX-FIX"] || 0}/${smokeReports[1].report.statusCounts.BLOCKER || 0}; all-panels PASS ${smokeReports[2].report.statusCounts.PASS}/${smokeReports[2].report.statusCounts["PASS-"] || 0}/${smokeReports[2].report.statusCounts["UX-FIX"] || 0}/${smokeReports[2].report.statusCounts.BLOCKER || 0}; mobile all-roles PASS ${smokeReports[3].report.statusCounts.PASS}/${smokeReports[3].report.statusCounts["PASS-"] || 0}/${smokeReports[3].report.statusCounts["UX-FIX"] || 0}/${smokeReports[3].report.statusCounts.BLOCKER || 0}`;

  const chainWiringSummary = [
    contains(pkg, '"check:cachecoalescingandbackoff01": "node backend/scripts/cache_coalescing_and_backoff_01_check.js"'),
    contains(runner, "check:cachecoalescingandbackoff01"),
    contains(verify, '"check:cachecoalescingandbackoff01"'),
    contains(harnessCheck, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(harnessDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(guide, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(primer, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(doc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(dashboardBulkDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(requestStormDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(policyDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
  ].every(Boolean)
    ? "package.json, runner, verify chain, harness check/doc, guide, primer and companion docs are wired"
    : "chain wiring eksik";

  const commitExternalSummary = [
    gitLines(["status", "--short"]).some((line) => line.includes("backend/artifacts/runtime-data/")),
    gitLines(["diff", "--cached", "--name-only"]).length === 0,
    !gitLines(["diff", "--cached", "--name-only"]).some((line) => line.includes("backend/artifacts/browser-smoke/")),
    !fs.existsSync(paths.debugLog),
  ].every(Boolean)
    ? "runtime-data working tree'de, browser-smoke staged değil, debug.log absent, stage empty"
    : "commit-external boundary bozuldu";

  const prismaSummary = [
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    gitLines(["diff", "--name-only", "--", "prisma"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0,
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty"
    : "prisma or route/service scope outside diff detected";

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`coalescingSummary=${responseCacheSummary}`);
  console.log(`readOnlyScopeSummary=${readOnlyScopeSummary}`);
  console.log(`cacheKeyIsolationSummary=${cacheKeyIsolationSummary}`);
  console.log(`backoffSummary=${backoffSummary}`);
  console.log(`dashboardBulkCompatibilitySummary=${dashboardBulkCompatibilitySummary}`);
  console.log(`requestStormCompatibilitySummary=${requestStormCompatibilitySummary}`);
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

  console.log("PASS CACHE-COALESCING-AND-BACKOFF-01");
}

main();
