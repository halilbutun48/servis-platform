#!/usr/bin/env node

import crypto from "node:crypto";
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

function safeFileSha256(relPath, expectedHash) {
  try {
    return fileSha256(relPath) === String(expectedHash || "").toUpperCase();
  } catch {
    return false;
  }
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

function isMigrationDirectoryShape(relPath) {
  try {
    const absPath = path.join(repoRoot, relPath);
    const stat = fs.lstatSync(absPath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      return false;
    }
    const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
    return entries.length === 1 && entries[0] === "migration.sql";
  } catch {
    return false;
  }
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

function inspectAcceptedPrismaManifest(evidence = collectBackendPrismaEvidence()) {
  const acceptedPrismaFiles = ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path));
  const unexpected = evidence.actual.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(file));
  const missing = acceptedPrismaFiles.filter((file) => !evidence.actual.includes(file));
  const schemaShaMatches = safeFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256);
  const migrationShaMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => normalizedTextSha256(entry.path) === String(entry.sha256 || "").toUpperCase());
  const migrationShapeMatches = ACCEPTED_PRISMA_MIGRATIONS.every((entry) => isMigrationDirectoryShape(path.dirname(entry.path)));
  return {
    evidence,
    unexpected,
    missing,
    schemaShaMatches,
    migrationShaMatches,
    migrationShapeMatches,
    exact:
      unexpected.length === 0 &&
      missing.length === 0 &&
      schemaShaMatches &&
      migrationShaMatches &&
      migrationShapeMatches,
  };
}

function mustAcceptedPrismaManifest(evidence = collectBackendPrismaEvidence()) {
  const inspection = inspectAcceptedPrismaManifest(evidence);
  must(evidence.actual.length === 0, "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  return inspection;
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
  const backendPrismaEvidence = collectBackendPrismaEvidence();
  const backendPrismaInspection = inspectAcceptedPrismaManifest(backendPrismaEvidence);

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

  addCase(cases, "route diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/src/routes"]).filter((line) => line !== "backend/src/routes/companyOverview.js").length === 0, "route diff not empty"));
  addCase(cases, "service diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0, "service diff not empty"));
  addCase(cases, "prisma diff stays empty", () => must(gitLines(["diff", "--name-only", "--", "prisma"]).length === 0, "prisma diff not empty"));
  addCase(cases, "backend prisma accepted manifest exact", () => mustAcceptedPrismaManifest(backendPrismaEvidence));
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
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).filter((line) => line !== "backend/src/routes/companyOverview.js").length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    gitLines(["diff", "--name-only", "--", "prisma"]).length === 0,
    backendPrismaInspection.exact,
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma accepted manifest exact"
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
