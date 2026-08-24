#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const paths = {
  packageJson: path.join(repoRoot, "package.json"),
  harnessCheck: path.join(repoRoot, "backend", "scripts", "script_harness_consolidation_01_check.js"),
  harnessDoc: path.join(repoRoot, "docs", "SCRIPT_HARNESS_CONSOLIDATION_01.md"),
  guide: path.join(repoRoot, "docs", "SCRIPT_KILAVUZU_MILESTONE_HARITASI.md"),
  primer: path.join(repoRoot, "docs", "PRIMER_SSOT.md"),
  policyDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  requestStormDoc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  rateLimits: path.join(repoRoot, "backend", "src", "bootstrap", "rateLimits.js"),
  env: path.join(repoRoot, "backend", "src", "env.js"),
  httpErrors: path.join(repoRoot, "backend", "src", "errors", "http.js"),
  productFlowReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "PRODUCT_FLOW_BUTTON_AUDIT_01", "report.json"),
  premiumReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_LIVE_PANEL_PREMIUM_SMOKE_01", "report.json"),
  allPanelsReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_ALL_PANELS_REALITY_AUDIT_01", "report.json"),
  mobileReport: path.join(repoRoot, "backend", "artifacts", "browser-smoke", "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01", "report.json"),
  debugLog: path.join(repoRoot, "debug.log"),
};

const POLICY_CLASSES = [
  {
    label: "AUTH_STRICT",
    summaryKey: "authPublicSummary",
    needles: ["AUTH_STRICT", "login", "register", "password", "invite", "verification"],
  },
  {
    label: "PUBLIC_INTAKE_STRICT",
    summaryKey: "authPublicSummary",
    needles: ["PUBLIC_INTAKE_STRICT", "public lead", "demand", "spam", "KVKK", "capture"],
  },
  {
    label: "READ_HEAVY_SOFT",
    summaryKey: "readLiveSummary",
    needles: ["READ_HEAVY_SOFT", "dashboard", "panel", "summary", "live", "smoke"],
  },
  {
    label: "LIVE_GPS_TOLERANT",
    summaryKey: "readLiveSummary",
    needles: ["LIVE_GPS_TOLERANT", "GPS", "live map", "driver", "vehicle", "telematics"],
  },
  {
    label: "ROUTE_PREVIEW_BOUNDED",
    summaryKey: "readLiveSummary",
    needles: ["ROUTE_PREVIEW_BOUNDED", "route preview", "readonly preview", "bounded", "compact", "summary-first"],
  },
  {
    label: "WRITE_ACTION_STRICT",
    summaryKey: "writeActionSummary",
    needles: ["WRITE_ACTION_STRICT", "POST", "PUT", "PATCH", "DELETE", "mutation"],
  },
  {
    label: "PAYMENT_CONTRACT_STRICT",
    summaryKey: "writeActionSummary",
    needles: ["PAYMENT_CONTRACT_STRICT", "payment", "contract", "settlement", "hakediş", "commission"],
  },
  {
    label: "ADMIN_AUDIT_STRICT",
    summaryKey: "writeActionSummary",
    needles: ["ADMIN_AUDIT_STRICT", "admin", "superadmin", "audit", "log export", "review queue"],
  },
  {
    label: "AI_ASSISTANT_READONLY",
    summaryKey: "aiPolicySummary",
    needles: ["AI_ASSISTANT_READONLY", "read-only", "copilot", "Sefer Abi", "tool execution", "write-action dispatcher"],
  },
  {
    label: "HEALTH_INTERNAL_SAFE",
    summaryKey: "aiPolicySummary",
    needles: ["HEALTH_INTERNAL_SAFE", "health", "internal", "observability", "monitoring", "debug.log"],
  },
];

const EXPECTED_SMOKES = [
  {
    label: "product-flow",
    path: paths.productFlowReport,
    routeCount: 18,
    screenshotCount: 36,
    passCount: 18,
    consoleErrorCount: 0,
    pageErrorCount: 0,
  },
  {
    label: "premium",
    path: paths.premiumReport,
    routeCount: 82,
    screenshotCount: 164,
    passCount: 82,
    consoleErrorCount: 0,
    pageErrorCount: 0,
  },
  {
    label: "all-panels",
    path: paths.allPanelsReport,
    routeCount: 82,
    screenshotCount: 164,
    passCount: 82,
    consoleErrorCount: 0,
    pageErrorCount: 0,
  },
  {
    label: "mobile all-roles",
    path: paths.mobileReport,
    routeCount: 82,
    screenshotCount: 164,
    passCount: 82,
    consoleErrorCount: 0,
    pageErrorCount: 0,
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
  if (!condition) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function gitCapture(args) {
  const result = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(result || "");
}

function gitLines(args) {
  return gitCapture(args)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function expectReport(spec) {
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
  must(Array.isArray(report.routes) && report.routes.length === spec.routeCount, `${spec.label} routes rows`);
  must(report.routes.every((row) => Array.isArray(row.consoleErrors) && row.consoleErrors.length === 0), `${spec.label} console errors empty`);
  must(report.routes.every((row) => Array.isArray(row.pageErrors) && row.pageErrors.length === 0), `${spec.label} page errors empty`);
  return report;
}

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addNeedleCases(cases, doc, classSpec) {
  for (const needle of classSpec.needles) {
    addCase(cases, `policy doc class ${classSpec.label} needle ${needle}`, () => {
      must(contains(doc, classSpec.label), `policy class label ${classSpec.label}`);
      must(contains(doc, needle), `policy class ${classSpec.label} needle ${needle}`);
    });
  }
}

function main() {
  console.log("=== PRODUCTION-RATE-LIMIT-POLICY-01 CHECK ===");

  const cases = [];
  const pkg = readFile(paths.packageJson);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const policyDoc = readFile(paths.policyDoc);
  const requestStormDoc = readFile(paths.requestStormDoc);
  const rateLimits = readFile(paths.rateLimits);
  const env = readFile(paths.env);
  const httpErrors = readFile(paths.httpErrors);

  addCase(cases, "package.json exposes the policy check", () => {
    must(contains(pkg, '"check:productionratelimitpolicy01": "node backend/scripts/production_rate_limit_policy_01_check.js"'), "package alias");
  });

  addCase(cases, "product extensions runner includes the policy check", () => {
    assertProductExtensionsIncludes(
      "check:productionratelimitpolicy01",
      "product extensions registry includes production rate limit policy check"
    );
  });

  addCase(cases, "script harness check knows the policy milestone", () => {
    must(contains(harnessCheck, "PRODUCTION-RATE-LIMIT-POLICY-01"), "harness milestone");
    must(contains(harnessCheck, "check:productionratelimitpolicy01"), "harness alias");
    must(contains(harnessCheck, "root:check:productionratelimitpolicy01"), "harness root alias");
    must(contains(harnessCheck, "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md"), "harness doc path");
  });

  addCase(cases, "script harness doc lists the policy milestone", () => {
    must(contains(harnessDoc, "PRODUCTION-RATE-LIMIT-POLICY-01"), "harness doc milestone");
    must(contains(harnessDoc, "check:productionratelimitpolicy01"), "harness doc alias");
    must(contains(harnessDoc, "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md"), "harness doc path");
    must(contains(harnessDoc, "node backend\\scripts\\production_rate_limit_policy_01_check.js"), "harness doc command");
  });

  addCase(cases, "milestone guide lists the policy milestone", () => {
    must(contains(guide, "PRODUCTION-RATE-LIMIT-POLICY-01"), "guide milestone");
    must(contains(guide, "check:productionratelimitpolicy01"), "guide alias");
    must(contains(guide, "node backend\\scripts\\production_rate_limit_policy_01_check.js"), "guide command");
    must(contains(guide, "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md"), "guide doc path");
  });

  addCase(cases, "primer lists the policy milestone", () => {
    must(contains(primer, "PRODUCTION-RATE-LIMIT-POLICY-01"), "primer milestone");
    must(contains(primer, "check:productionratelimitpolicy01"), "primer alias");
    must(contains(primer, "docs/PRODUCTION_RATE_LIMIT_POLICY_01.md"), "primer doc path");
    must(contains(primer, "backend/scripts/production_rate_limit_policy_01_check.js"), "primer command path");
  });

  addCase(cases, "request storm doc points to the policy milestone next", () => {
    must(contains(requestStormDoc, "PRODUCTION-RATE-LIMIT-POLICY-01"), "request storm next milestone");
  });

  addCase(cases, "policy doc has required structure", () => {
    const headings = [
      "# PRODUCTION RATE LIMIT POLICY 01",
      "## 1) Purpose",
      "## 2) Problem Statement",
      "## 3) Central Policy Model",
      "## 4) Policy Classes",
      "## 5) Endpoint Classification Matrix",
      "## 6) User-Facing 429 Behavior",
      "## 7) 429 Console Policy",
      "## 8) What Changed",
      "## 9) What Was Explicitly Not Changed",
      "## 10) Guard Cases",
      "## 11) Validation Results",
      "## 12) Remaining Risks",
      "## 13) Next Recommended Milestone",
    ];
    for (const heading of headings) must(contains(policyDoc, heading), `policy doc heading ${heading}`);
    must(contains(policyDoc, "Policy class count: `10`"), "policy class count");
    for (const item of POLICY_CLASSES) {
      must(contains(policyDoc, item.label), `policy class label ${item.label}`);
    }
    must(contains(policyDoc, "backend/src/bootstrap/rateLimits.js"), "policy doc runtime source");
    must(contains(policyDoc, "backend/src/env.js"), "policy doc env source");
    must(contains(policyDoc, "backend/src/errors/http.js"), "policy doc http source");
    must(contains(policyDoc, "Çok kısa sürede çok sayıda işlem gönderildi."), "policy doc 429 user message");
    must(contains(policyDoc, "RATE_LIMITED"), "policy doc 429 code");
    must(contains(policyDoc, "429 ignore list"), "policy doc 429 ignore wording");
    must(contains(policyDoc, "runtime enforcement açmaz"), "policy doc runtime enforcement wording");
    must(contains(policyDoc, "request-storm"), "policy doc request storm compatibility");
    must(contains(policyDoc, "smoke"), "policy doc smoke compatibility");
    must(contains(policyDoc, "route/service/prisma"), "policy doc route/service/prisma boundary");
    must(contains(policyDoc, "debug.log"), "policy doc debug.log boundary");
    must(contains(policyDoc, "AI-RESPONSE-SEMANTIC-QUALITY-GATE-01"), "policy doc next milestone");
  });

  addCase(cases, "runtime source files stay as policy sources only", () => {
    must(contains(rateLimits, "limiter429Handler"), "rateLimits 429 handler");
    must(contains(rateLimits, "authLimiter"), "rateLimits auth limiter");
    must(contains(rateLimits, "readLimiter"), "rateLimits read limiter");
    must(contains(rateLimits, "writeLimiter"), "rateLimits write limiter");
    must(contains(rateLimits, "gpsLimiter"), "rateLimits gps limiter");
    must(contains(rateLimits, "telematicsLimiter"), "rateLimits telematics limiter");
    must(contains(rateLimits, "exportLimiter"), "rateLimits export limiter");
    must(contains(env, "AUTH_RATE_LIMIT_WINDOW_MS"), "env auth window");
    must(contains(env, "READ_RATE_LIMIT_WINDOW_MS"), "env read window");
    must(contains(env, "WRITE_RATE_LIMIT_WINDOW_MS"), "env write window");
    must(contains(env, "GPS_RATE_LIMIT_WINDOW_MS"), "env gps window");
    must(contains(env, "TELEMATICS_RATE_LIMIT_WINDOW_MS"), "env telematics window");
    must(contains(env, "EXPORT_RATE_LIMIT_WINDOW_MS"), "env export window");
    must(contains(httpErrors, '429: "RATE_LIMITED"'), "http 429 mapping");
  });

  addCase(cases, "policy doc preserves explicit boundaries", () => {
    must(contains(policyDoc, "smoke threshold / skip / timing / PASS kriteri"), "threshold boundary");
    must(contains(policyDoc, "backend/src/routes"), "routes boundary");
    must(contains(policyDoc, "backend/src/services"), "services boundary");
    must(contains(policyDoc, "prisma"), "prisma boundary");
    must(contains(policyDoc, "backend/prisma"), "backend prisma boundary");
    must(contains(policyDoc, "global allowlist"), "allowlist boundary");
    must(contains(policyDoc, "write-action dispatcher"), "write dispatcher boundary");
    must(contains(policyDoc, "tool execution"), "tool execution boundary");
  });

  addCase(cases, "policy doc keeps endpoint classification language", () => {
    must(contains(policyDoc, "AUTH_STRICT"), "auth strict heading");
    must(contains(policyDoc, "PUBLIC_INTAKE_STRICT"), "public intake heading");
    must(contains(policyDoc, "READ_HEAVY_SOFT"), "read-heavy heading");
    must(contains(policyDoc, "LIVE_GPS_TOLERANT"), "live gps heading");
    must(contains(policyDoc, "ROUTE_PREVIEW_BOUNDED"), "route preview heading");
    must(contains(policyDoc, "WRITE_ACTION_STRICT"), "write action heading");
    must(contains(policyDoc, "PAYMENT_CONTRACT_STRICT"), "payment contract heading");
    must(contains(policyDoc, "ADMIN_AUDIT_STRICT"), "admin audit heading");
    must(contains(policyDoc, "AI_ASSISTANT_READONLY"), "ai read-only heading");
    must(contains(policyDoc, "HEALTH_INTERNAL_SAFE"), "health internal heading");
    must(contains(policyDoc, "admin/superadmin"), "admin wording");
    must(contains(policyDoc, "GPS ingest"), "gps ingest wording");
  });

  addCase(cases, "policy doc keeps request-storm compatibility wording", () => {
    must(contains(policyDoc, "request-storm"), "request storm wording");
    must(contains(policyDoc, "sharedStorageState"), "shared storage state wording");
    must(contains(policyDoc, "429 ignore list"), "429 ignore list wording");
    must(contains(policyDoc, "runtime-data"), "runtime-data wording");
  });

  addCase(cases, "policy doc keeps smoke compatibility wording", () => {
    must(contains(policyDoc, "smoke threshold"), "smoke threshold wording");
    must(contains(policyDoc, "PASS kriteri"), "pass criteria wording");
    must(contains(policyDoc, "browser-smoke"), "browser smoke wording");
  });

  addCase(cases, "policy doc keeps 429 console policy wording", () => {
    must(contains(policyDoc, "429 Console Policy"), "console policy heading");
    must(contains(policyDoc, "consoleErrorCount=0"), "console error wording");
    must(contains(policyDoc, "pageErrorCount=0"), "page error wording");
  });

  addCase(cases, "policy doc keeps runtime enforcement wording", () => {
    must(contains(policyDoc, "runtime enforcement açmaz"), "runtime enforcement wording");
    must(contains(policyDoc, "runtime enforcement"), "runtime enforcement mention");
  });

  addCase(cases, "policy doc keeps route/service/prisma wording", () => {
    must(contains(policyDoc, "backend/src/routes"), "routes wording");
    must(contains(policyDoc, "backend/src/services"), "services wording");
    must(contains(policyDoc, "prisma"), "prisma wording");
    must(contains(policyDoc, "backend/prisma"), "backend prisma wording");
  });

  for (const item of POLICY_CLASSES) {
    addNeedleCases(cases, policyDoc, item);
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

  const smokeReports = EXPECTED_SMOKES.map((spec) => ({ spec, report: expectReport(spec) }));

  const statusLines = gitLines(["status", "--short"]);
  const stagedNames = gitLines(["diff", "--cached", "--name-only"]);
  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes"]);
  const serviceDiff = gitLines(["diff", "--name-only", "--", "backend/src/services"]);
  const prismaDiff = gitLines(["diff", "--name-only", "--", "prisma"]);
  const backendPrismaDiff = gitLines(["diff", "--name-only", "--", "backend/prisma"]);
  const runtimeSourceDiff = gitLines(["diff", "--name-only", "--", "backend/src/bootstrap/rateLimits.js", "backend/src/env.js", "backend/src/errors/http.js"]);
  gitLines(["diff", "--check"]);
  gitLines(["diff", "--cached", "--check"]);

  const policyClassCount = POLICY_CLASSES.length;
  const policyClassSummary = POLICY_CLASSES.map((item) => item.label).join(" | ");
  const authPublicSummary = [
    contains(policyDoc, "AUTH_STRICT"),
    contains(policyDoc, "PUBLIC_INTAKE_STRICT"),
    contains(policyDoc, "login"),
    contains(policyDoc, "public lead"),
  ].every(Boolean)
    ? "AUTH_STRICT ve PUBLIC_INTAKE_STRICT login/register/password ile public lead/demand akışlarını ayrı ve sıkı bucket'larda tutuyor"
    : "auth/public sınıfları eksik";
  const readLiveSummary = [
    contains(policyDoc, "READ_HEAVY_SOFT"),
    contains(policyDoc, "LIVE_GPS_TOLERANT"),
    contains(policyDoc, "ROUTE_PREVIEW_BOUNDED"),
    contains(policyDoc, "dashboard"),
    contains(policyDoc, "GPS"),
    contains(policyDoc, "route preview"),
  ].every(Boolean)
    ? "READ_HEAVY_SOFT, LIVE_GPS_TOLERANT ve ROUTE_PREVIEW_BOUNDED dashboard/panel/live map/route preview akışlarını false 429 olmadan dengeliyor"
    : "read/live sınıfları eksik";
  const writeActionSummary = [
    contains(policyDoc, "WRITE_ACTION_STRICT"),
    contains(policyDoc, "PAYMENT_CONTRACT_STRICT"),
    contains(policyDoc, "ADMIN_AUDIT_STRICT"),
    contains(policyDoc, "HEALTH_INTERNAL_SAFE"),
    contains(policyDoc, "mutation"),
    contains(policyDoc, "payment"),
  ].every(Boolean)
    ? "WRITE_ACTION_STRICT, PAYMENT_CONTRACT_STRICT, ADMIN_AUDIT_STRICT ve HEALTH_INTERNAL_SAFE mutation, payment, audit ve internal health yüzeylerini daha sıkı koruyor"
    : "write-action sınıfları eksik";
  const aiPolicySummary = contains(policyDoc, "AI_ASSISTANT_READONLY")
    ? "AI_ASSISTANT_READONLY copilot / Sefer Abi yüzeyinde read-only kalıyor; tool execution ve write-action dispatcher açılmıyor"
    : "AI assistant sınıfı eksik";
  const userFacing429Summary = contains(policyDoc, "Çok kısa sürede çok sayıda işlem gönderildi.")
    ? "429 kullanıcıya Türkçe, retryAfterSec destekli ve RATE_LIMITED kodlu dönüyor"
    : "429 kullanıcı mesajı eksik";
  const console429PolicySummary = contains(policyDoc, "429 Console Policy")
    ? "429 console/page error ignore list açılmıyor; product-flow, premium, all-panels ve mobile all-roles consoleErrorCount=0 ve pageErrorCount=0 kalıyor"
    : "429 console policy eksik";
  const runtimeEnforcementSummary = [
    runtimeSourceDiff.length === 0,
    !contains(policyDoc, "runtime enforcement açar"),
    contains(policyDoc, "runtime enforcement açmaz"),
  ].every(Boolean)
    ? "runtime enforcement açılmadı; policy/check/doc only"
    : "runtime enforcement boundary bozuldu";
  const requestStormCompatibilitySummary = [
    contains(policyDoc, "request-storm"),
    contains(policyDoc, "sharedStorageState"),
    contains(policyDoc, "429 ignore list"),
    contains(requestStormDoc, "sharedStorageState"),
    contains(requestStormDoc, "429 ignore list"),
    contains(requestStormDoc, "runtime-data"),
  ].every(Boolean)
    ? "request-storm smoke uyumu korunuyor; sharedStorageState reuse, zero console/page error policy ve 429 ignore list yok"
    : "request-storm compatibility eksik";
  const smokeThresholdSummary = smokeReports.every(({ report, spec }) =>
    Number(report.statusCounts?.PASS || 0) === spec.passCount &&
    Number(report.statusCounts?.["PASS-"] || 0) === 0 &&
    Number(report.statusCounts?.["UX-FIX"] || 0) === 0 &&
    Number(report.statusCounts?.BLOCKER || 0) === 0
  )
    ? `product-flow PASS ${smokeReports[0].report.statusCounts.PASS}/0/0/0; premium PASS ${smokeReports[1].report.statusCounts.PASS}/0/0/0; all-panels PASS ${smokeReports[2].report.statusCounts.PASS}/0/0/0; mobile all-roles PASS ${smokeReports[3].report.statusCounts.PASS}/0/0/0`
    : `smoke thresholds changed; product-flow PASS ${smokeReports[0].report.statusCounts.PASS}/${smokeReports[0].report.statusCounts["PASS-"] || 0}/${smokeReports[0].report.statusCounts["UX-FIX"] || 0}/${smokeReports[0].report.statusCounts.BLOCKER || 0}; premium PASS ${smokeReports[1].report.statusCounts.PASS}/${smokeReports[1].report.statusCounts["PASS-"] || 0}/${smokeReports[1].report.statusCounts["UX-FIX"] || 0}/${smokeReports[1].report.statusCounts.BLOCKER || 0}; all-panels PASS ${smokeReports[2].report.statusCounts.PASS}/${smokeReports[2].report.statusCounts["PASS-"] || 0}/${smokeReports[2].report.statusCounts["UX-FIX"] || 0}/${smokeReports[2].report.statusCounts.BLOCKER || 0}; mobile all-roles PASS ${smokeReports[3].report.statusCounts.PASS}/${smokeReports[3].report.statusCounts["PASS-"] || 0}/${smokeReports[3].report.statusCounts["UX-FIX"] || 0}/${smokeReports[3].report.statusCounts.BLOCKER || 0}`;
  const commitExternalSummary = [
    statusLines.some((line) => line.includes("backend/artifacts/runtime-data/")),
    !statusLines.some((line) => line.includes("backend/artifacts/browser-smoke/") && line.startsWith("??")),
    !stagedNames.some((line) => line.includes("backend/artifacts/browser-smoke/")),
    !stagedNames.some((line) => line.includes("backend/artifacts/runtime-data/")),
    !fs.existsSync(paths.debugLog),
    stagedNames.length === 0,
  ].every(Boolean)
    ? "runtime-data working tree'de, browser-smoke staged değil, debug.log absent, stage empty"
    : "commit-external boundary bozuldu";
  const routeServicePrismaSummary = [
    routeDiff.length === 0,
    serviceDiff.length === 0,
    prismaDiff.length === 0,
    backendPrismaDiff.length === 0,
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty"
    : "route/service/prisma scope dışında değişiklik var";
  const chainWiringSummary = [
    contains(pkg, '"check:productionratelimitpolicy01": "node backend/scripts/production_rate_limit_policy_01_check.js"'),
    contains(harnessCheck, "PRODUCTION-RATE-LIMIT-POLICY-01"),
    contains(harnessCheck, "check:productionratelimitpolicy01"),
    contains(harnessDoc, "PRODUCTION-RATE-LIMIT-POLICY-01"),
    contains(harnessDoc, "check:productionratelimitpolicy01"),
    contains(guide, "PRODUCTION-RATE-LIMIT-POLICY-01"),
    contains(primer, "PRODUCTION-RATE-LIMIT-POLICY-01"),
    contains(policyDoc, "PRODUCTION-RATE-LIMIT-POLICY-01"),
  ].every(Boolean)
    ? "package.json, registry, harness check/doc, guide, primer ve policy doc production rate limit policy için bağlı"
    : "chain wiring eksik";

  console.log(`guardCases=${guardCases}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  console.log(`policyClassCount=${policyClassCount}`);
  console.log(`policyClassSummary=${policyClassSummary}`);
  console.log(`authPublicSummary=${authPublicSummary}`);
  console.log(`readLiveSummary=${readLiveSummary}`);
  console.log(`writeActionSummary=${writeActionSummary}`);
  console.log(`aiPolicySummary=${aiPolicySummary}`);
  console.log(`userFacing429Summary=${userFacing429Summary}`);
  console.log(`console429PolicySummary=${console429PolicySummary}`);
  console.log(`smokeThresholdSummary=${smokeThresholdSummary}`);
  console.log(`runtimeEnforcementSummary=${runtimeEnforcementSummary}`);
  console.log(`requestStormCompatibilitySummary=${requestStormCompatibilitySummary}`);
  console.log(`commitExternalSummary=${commitExternalSummary}`);
  console.log(`routeServicePrismaSummary=${routeServicePrismaSummary}`);
  console.log(`chainWiringSummary=${chainWiringSummary}`);

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.log(`FAIL CASE ${failure.label}`);
      console.log(`error: ${failure.error}`);
    }
    process.exit(1);
  }

  console.log("PASS PRODUCTION-RATE-LIMIT-POLICY-01");
}

main();
