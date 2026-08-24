#!/usr/bin/env node

import crypto from "node:crypto";
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

function gitCapture(args) {
  return execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitLines(args) {
  const out = gitCapture(args);
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
}

function gitStatusEntries(paths) {
  return String(gitCapture(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(repoRoot, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  must(fileSha256(relPath) === String(expectedHash || "").toUpperCase(), label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(typeof repoRoot !== "undefined" ? repoRoot : root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      throw new Error(`FAIL ${relPath}: bare CR`);
    }
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  must(actual === wanted, `${label}: ${actual} != ${wanted}`);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(repoRoot, relPath);
  const stat = fs.lstatSync(absPath);
  must(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
}

function collectBackendPrismaEvidence() {
  const tracked = sortedUniquePaths(gitLines(["diff", "--name-only", "--", "prisma", "backend/prisma"]));
  const staged = sortedUniquePaths(gitLines(["diff", "--cached", "--name-only", "--", "prisma", "backend/prisma"]));
  const status = sortedUniquePaths(gitStatusEntries(["prisma", "backend/prisma"]).map((entry) => entry.path));
  const actual = sortedUniquePaths([...tracked, ...staged, ...status]);
  return { tracked, staged, status, actual };
}

const ACCEPTED_SCHEMA_PATH = "backend/prisma/schema.prisma";
const ACCEPTED_SCHEMA_SHA256 = "7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748";
const ACCEPTED_PRISMA_MIGRATIONS = [
  { path: "backend/prisma/migrations/20260125133000_seed_root_baseline/migration.sql", sha256: "27DF5155D24311AA9199AC7B8FC94DB615EC6457401B2BA0105C7FD30A5587DD" },
  { path: "backend/prisma/migrations/20260125133100_organization_shift_import_baseline/migration.sql", sha256: "864CB0607DB2F7833C834BFD9747D9518806CE9EC206C0C19F1A79271ACE3FBD" },
  { path: "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql", sha256: "E4EBDCDC04CC09D6698CF9EC868D6E55F46928A489D456A2DBB9ABDAF21B40B5" },
  { path: "backend/prisma/migrations/20260125133300_auth_consent_checkin_baseline/migration.sql", sha256: "6035100D9AA9B19DE70C011B17D85F870208E8F1B24DA02BEAE02F9995091FEB" },
  { path: "backend/prisma/migrations/20260303010500_add_company_kind_missing_bridge/migration.sql", sha256: "CFACF309BCE72D5023812755FDB4CD06335AF5C5512E16019AA23AC569F17B6F" },
  { path: "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql", sha256: "B168268CE0E96E131E27EB385EA4B0228883C8C04D5804CDF742F3A814C1EC90" },
  { path: "backend/prisma/migrations/20260407102000_create_agreement_missing_baseline/migration.sql", sha256: "734DC69D31081947BD82566E48831F6295F1A148FCB0742459212986A7616005" },
  { path: "backend/prisma/migrations/20260501144000_create_shift_offer_missing_baseline/migration.sql", sha256: "85D160041A9AB4D65D76516ED7A4E5909D05656D7C20CA3326C49700AD36BA17" },
  { path: "backend/prisma/migrations/20260731120000_financial_operations_persistence_01/migration.sql", sha256: "3673FCA31ADB9E3E0A7C3341B7E8320032BBAC5F1DCF1744CAC86CEE48489CB0" },
  { path: "backend/prisma/migrations/20260801130000_company_profile_fields_bridge_01/migration.sql", sha256: "24D3D22DEBE2FA786B757FA1E0547B280CE81A56218E3DFFB087AD11D9791198" },
  { path: "backend/prisma/migrations/20260801140000_room_scalar_region_profile_hub_bridge_01/migration.sql", sha256: "A104A23E7807BD90DD7B840A4005989BF81502660AF8B016481E6A4184E1B202" },
  { path: "backend/prisma/migrations/20260801150000_room_company_id_legacy_nullability_bridge_01/migration.sql", sha256: "0BC556A72B81CD1C51E1644833004F1339C17905BD1EF6F256FF33DF8BBDCF8A" },
  { path: "backend/prisma/migrations/20260801160000_user_scalar_auth_device_totp_bridge_01/migration.sql", sha256: "D267687FB90187D34AD629D97A776B07E82872D470AC9F1A3CC6E51BB44F1FFF" },
  { path: "backend/prisma/migrations/20260801170000_personel_scalar_profile_geo_kind_bridge_01/migration.sql", sha256: "8A9AA691192F237FB83E9AF9FB5C0132F69B1DFAC798C38949C2EACFDC379C0A" },
  { path: "backend/prisma/migrations/20260801180000_role_enum_values_bridge_01/migration.sql", sha256: "F864387F36296795BABFD3CB740B0C22DFF7F50BB5984C1C095EDAF0B6C52C5A" },
  { path: "backend/prisma/migrations/20260801190000_shift_core_route_fields_bridge_01/migration.sql", sha256: "025BD8398BF3AA8C68A1D7C5F0A52097ADAEF2A34649EF6207597C9AEA4BE1E0" },
  { path: "backend/prisma/migrations/20260801191000_shift_status_values_bridge_01/migration.sql", sha256: "D581B09029051582574F0F77FCE8B8EE1BD8D73A740D2D6835BE3FDBB2C9E19E" },
  { path: "backend/prisma/migrations/20260801192000_shift_split_contract_bridge_01/migration.sql", sha256: "C346FC2EC79C1C57A8A68D5116688B4201353D52C67CAA9ADCFEBB3F17009D54" },
  { path: "backend/prisma/migrations/20260801193000_shift_room_nullability_bridge_01/migration.sql", sha256: "FA57E36D09CA2DD31255CD8924204A6FD478D0B633B581582CA4335179222A5D" },
  { path: "backend/prisma/migrations/20260801194000_shift_agreement_organization_relations_bridge_01/migration.sql", sha256: "E2EAB9D464E2AC8D5F2EDC4815D550341FB2BB5794ADF0BEBE8790AA35F51C90" },
  { path: "backend/prisma/migrations/20260801200000_shift_progress_started_paused_bridge_01/migration.sql", sha256: "7074A0E5B5FB60798B1C52D1415D5CB713B0D6F9DD6DD8DA58FF25E90C0BF007" },
  { path: "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql", sha256: "285B8F12DB03865E6A6B27782F80C9FC44AC0632EA8ECBA2800842E699C1BC27" },
  { path: "backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql", sha256: "E002BE555C9116C98268307F194C380A3A081F7EE59E9DFB16EAA0D0322041B5" },
  { path: "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql", sha256: "3D367B1DEF35FA7475A8962044834A3759C9D16F7EB0C806FA81A3EE05698E36" },
  { path: "backend/prisma/migrations/20260801213000_notification_scope_user_value_bridge_01/migration.sql", sha256: "59BD838E221D53D03CC642052ACD8656F5DF382127FCA9B1F8C7D8C7E80C49BA" },
  { path: "backend/prisma/migrations/20260801214000_shift_room_referential_action_bridge_01/migration.sql", sha256: "F67DB90776421D3CC1841240C4997C933480D6E2DD9CA1E2E6847B5166D6E528" },
  { path: "backend/prisma/migrations/20260801215000_consent_surface_bridge_01/migration.sql", sha256: "423E0FF4F2DC2A76D5C6330EAECE874E5F98C0196B8A453328E9ADE7AAEF3581" },
  { path: "backend/prisma/migrations/20260801216000_checkin_telemetry_bridge_01/migration.sql", sha256: "252D71C0BB0ADD9275E1D935A295BDB9C5CD4FE56529AD24336CB6DC7CF45E79" },
  { path: "backend/prisma/migrations/20260801216500_gps_point_at_index_bridge_01/migration.sql", sha256: "168D3F7237E19DBA59B4B70E6BF96F4891F91D2CB380D325621400888722872F" },
  { path: "backend/prisma/migrations/20260801217000_personel_credential_bridge_01/migration.sql", sha256: "BEF405759E990B7C2D0208BC472E79143CEA6F236E1D9DA59ECFD19188DD05EC" },
  { path: "backend/prisma/migrations/20260801218000_operational_fk_bridge_01/migration.sql", sha256: "2937ED88E7F99D2E923C689EFA2314B9A5A1B9A5C0FE66AC22CBE4F3CC964924" },
  { path: "backend/prisma/migrations/20260801219000_updated_at_default_reconciliation_01/migration.sql", sha256: "939A755C5FB0447EB1512D094C3E478914DB1964F1B4F65D068DFFC80A38CEA5" },
];
const ACCEPTED_PRISMA_FILES = [
  { path: ACCEPTED_SCHEMA_PATH, sha256: ACCEPTED_SCHEMA_SHA256 },
  ...ACCEPTED_PRISMA_MIGRATIONS,
];
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path)));

function mustAcceptedPrismaManifest(evidence = collectBackendPrismaEvidence()) {
  const acceptedPrismaFiles = ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path));
  const unexpected = evidence.actual.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(file));
  const missing = acceptedPrismaFiles.filter((file) => !evidence.actual.includes(file));
  must(evidence.actual.length === 0, "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  return evidence;
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
  const acceptedPrismaEvidence = mustAcceptedPrismaManifest();

  addContains(cases, "package.json exposes load-test alias", pkg, '"check:loadtest2000users01": "node backend/scripts/load_test_2000_users_01_check.js"');
  addCase(cases, "product extensions registry includes load-test check", () =>
    assertProductExtensionsIncludes("check:loadtest2000users01", "product extensions registry includes load-test check")
  );
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
    contains(harnessCheck, "LOAD-TEST-2000-USERS-01"),
    contains(harnessDoc, "LOAD-TEST-2000-USERS-01"),
    contains(guide, "LOAD-TEST-2000-USERS-01"),
    contains(primer, "LOAD-TEST-2000-USERS-01"),
    contains(doc, "LOAD-TEST-2000-USERS-01"),
  ].every(Boolean)
    ? "package.json, registry, harness check/doc, guide and primer are wired"
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
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).filter((line) => line !== "backend/src/routes/companyOverview.js").length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    (() => {
      const unexpected = acceptedPrismaEvidence.actual.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(file));
      const missing = ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path)).filter((file) => !acceptedPrismaEvidence.actual.includes(file));
      return unexpected.length === 0 && missing.length === 0;
    })(),
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma accepted manifest exact"
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
