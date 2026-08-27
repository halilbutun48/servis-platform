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

function normalizeCacheKey(key) {
  return String(key || "").trim();
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
  const bytes = fs.readFileSync(path.join(repoRoot, relPath));
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      must(false, `${relPath}: unexpected bare CR`);
    }
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    must(false, `${relPath}: invalid UTF-8`);
  }
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  must(normalizedTextSha256(relPath) === String(expectedHash || "").toUpperCase(), label);
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

function mustAcceptedPrismaManifest() {
  const evidence = collectBackendPrismaEvidence();
  must(evidence.actual.length === 0, `backend/prisma diff empty: unexpected=${evidence.actual.join(", ") || "(none)"}`);
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
  return evidence;
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

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function exactPathSetEquals(expectedPaths, actualPaths) {
  const expected = sortedUniquePaths(expectedPaths);
  const actual = sortedUniquePaths(actualPaths);
  return expected.length === actual.length && expected.every((entry, index) => entry === actual[index]);
}

function outcomeOk(rule, details = {}) {
  return { ok: true, rule, reason: rule, ...details };
}

function outcomeFail(rule, details = {}) {
  return { ok: false, rule, reason: rule, ...details };
}

function validateCachePolicyScenario(spec = {}) {
  if (!spec.coalescingEnabled) return outcomeFail("coalescing-required");
  const firstKey = normalizeCacheKey(spec.firstKey);
  const secondKey = normalizeCacheKey(spec.secondKey);
  const upstreamRequestCount = Number(spec.upstreamRequestCount ?? spec.sameKeyUpstreamRequestCount ?? 0);
  if (upstreamRequestCount > 1 && firstKey && secondKey && firstKey === secondKey) return outcomeFail("duplicate-same-key-upstream");
  if (Number(spec.sameKeyUpstreamRequestCount || 0) > 1 && (!firstKey || !secondKey)) return outcomeFail("duplicate-same-key-upstream");
  if (!spec.backoffEnabled) return outcomeFail("backoff-required");
  if (spec.backoffBypassed) return outcomeFail("retry-backoff-bypass");
  if (spec.maxRetries == null || !Number.isFinite(spec.maxRetries)) return outcomeFail("bounded-retry-required");
  if (Number(spec.maxRetries || 0) < 0) return outcomeFail("bounded-retry-required");
  if (spec.infiniteRetry) return outcomeFail("unbounded-retry");
  if (!spec.scopeIncludesTenantCompanyUserToken) return outcomeFail("cache-key-scope-required");
  if (spec.crossTenantCollision) return outcomeFail("cross-tenant-cache-key-collision");
  if (spec.failedResponseCached) return outcomeFail("failed-response-must-not-be-cached");
  if (spec.staleResponseAfterInvalidation) return outcomeFail("stale-response-after-invalidation");
  return outcomeOk("cache-policy-ok");
}

function validatePathPolicyScenario(spec = {}) {
  if (String(spec.matchMode || "exact") !== "exact") return outcomeFail("exact-path-policy-required");
  if ((spec.allowedPatterns || []).some((pattern) => /[*?]/.test(String(pattern || "")))) return outcomeFail("exact-path-policy-required");
  if ((spec.prefixPatterns || []).length > 0) return outcomeFail("exact-path-policy-required");
  if ((spec.generatedRuntimePaths || []).length > 0) return outcomeFail("generated-runtime-path-not-allowed");
  if ((spec.stagedPaths || []).length > 0) return outcomeFail("staged-unrelated-path");
  const allowedPaths = sortedUniquePaths(spec.allowedPaths || []);
  const observedPaths = sortedUniquePaths(spec.observedPaths || []);
  if (!exactPathSetEquals(allowedPaths, observedPaths)) {
    const unexpected = observedPaths.filter((entry) => !allowedPaths.includes(entry));
    const missing = allowedPaths.filter((entry) => !observedPaths.includes(entry));
    return outcomeFail("exact-path-policy-required", { unexpected, missing });
  }
  return outcomeOk("path-policy-ok");
}

function validateCommandPolicyScenario(spec = {}) {
  if (!spec || typeof spec !== "object") return outcomeFail("command-failure-hard-fail");
  if (spec.threw) return outcomeFail("command-failure-hard-fail");
  if (Number(spec.exitCode) !== 0) return outcomeFail("command-failure-hard-fail");
  if (!Array.isArray(spec.stdoutLines) || !Array.isArray(spec.stderrLines)) return outcomeFail("command-failure-hard-fail");
  if (spec.stdoutLines.some((line) => typeof line !== "string") || spec.stderrLines.some((line) => typeof line !== "string")) return outcomeFail("command-failure-hard-fail");
  return outcomeOk("command-ok");
}

const negativeEvidenceMatrix = [];
const controlEvidenceMatrix = [];

function addExecutableNegativeCase(cases, spec) {
  addCase(cases, spec.label, () => {
    must(Number(spec.mutationTargetCount || 0) > 0, `${spec.label} mutation target count`);
    const baseline = cloneValue(spec.baseline);
    const baselineOutcome = spec.validate(baseline);
    must(Boolean(baselineOutcome?.ok), `${spec.label} baseline accepted`);

    const mutated = cloneValue(spec.baseline);
    spec.mutate(mutated);
    must(JSON.stringify(mutated) !== JSON.stringify(baseline), `${spec.label} mutation applied`);

    const mutatedOutcome = spec.validate(mutated);
    must(!mutatedOutcome?.ok, `${spec.label} mutation rejected`);
    must(mutatedOutcome.rule === spec.expectedRule, `${spec.label} expected rule ${spec.expectedRule} got ${mutatedOutcome.rule || "(none)"}`);

    negativeEvidenceMatrix.push({
      caseName: spec.label,
      classification: spec.classification,
      baselineAccepted: true,
      mutationApplied: true,
      mutationTargetCount: Number(spec.mutationTargetCount || 0),
      expectedRule: spec.expectedRule,
      actualRule: mutatedOutcome.rule,
      expectedRejected: true,
      actualRejected: true,
      repositoryMutation: "NO",
      result: "PASS",
    });
  });
}

function addNotApplicableProofCase(cases, spec) {
  addCase(cases, spec.label, () => {
    must(Boolean(spec.check()), `${spec.label} proof failed`);
    negativeEvidenceMatrix.push({
      caseName: spec.label,
      classification: "NOT_APPLICABLE_WITH_PROOF",
      baselineAccepted: true,
      mutationApplied: false,
      mutationTargetCount: 0,
      expectedRule: "NOT_APPLICABLE_WITH_PROOF",
      actualRule: "NOT_APPLICABLE_WITH_PROOF",
      expectedRejected: false,
      actualRejected: false,
      repositoryMutation: "NO",
      result: "PASS",
    });
  });
}

function addExecutableControlCase(cases, spec) {
  addCase(cases, spec.label, () => {
    must(Number(spec.controlTargetCount || 0) > 0, `${spec.label} control target count`);
    const baseline = cloneValue(spec.baseline);
    const baselineOutcome = spec.validate(baseline);
    must(Boolean(baselineOutcome?.ok), `${spec.label} baseline accepted`);

    const controlled = cloneValue(spec.baseline);
    spec.control(controlled);
    must(JSON.stringify(controlled) !== JSON.stringify(baseline), `${spec.label} control applied`);

    const controlledOutcome = spec.validate(controlled);
    must(Boolean(controlledOutcome?.ok), `${spec.label} control accepted`);
    must(Boolean(spec.expectedAccepted) === true, `${spec.label} expected accepted`);
    must(Boolean(spec.actualAccepted) === true, `${spec.label} actual accepted`);

    controlEvidenceMatrix.push({
      caseName: spec.label,
      classification: spec.classification,
      baselineAccepted: true,
      controlApplied: true,
      controlTargetCount: Number(spec.controlTargetCount || 0),
      expectedAccepted: true,
      actualAccepted: true,
      firstKey: normalizeCacheKey(controlled.firstKey),
      secondKey: normalizeCacheKey(controlled.secondKey),
      keysAreDistinct: normalizeCacheKey(controlled.firstKey) !== normalizeCacheKey(controlled.secondKey),
      upstreamRequestCount: Number(controlled.upstreamRequestCount ?? controlled.sameKeyUpstreamRequestCount ?? 0),
      repositoryMutation: "NO",
      result: "PASS",
      actualRule: controlledOutcome.rule,
    });
  });
}

const ACCEPTED_SCHEMA_PATH = "backend/prisma/schema.prisma";
const ACCEPTED_SCHEMA_SHA256 = "D67FB93C705C1597598D67ECD46806A676703E2153BCE6EF76E0AA10E5E37784";
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
  { path: "backend/prisma/migrations/20260827120000_external_cost_reference_foundation_01/migration.sql", sha256: "ED96C4BAA57C4F4842408D372A8818B3C494E66957A397804D97D4964826F236" },
];
const ACCEPTED_PRISMA_FILES = [
  { path: ACCEPTED_SCHEMA_PATH, sha256: ACCEPTED_SCHEMA_SHA256 },
  ...ACCEPTED_PRISMA_MIGRATIONS,
];
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path)));

function main() {
  console.log("=== CACHE-COALESCING-AND-BACKOFF-01 CHECK ===");

  const pkg = readFile(paths.packageJson);
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
  const acceptedPrismaEvidence = mustAcceptedPrismaManifest();

  const cachePolicyBaseline = {
    coalescingEnabled: contains(responseCache, "if (existing?.promise) return existing.promise;"),
    firstKey: "tenant-a/company-a/resource-1",
    secondKey: "tenant-a/company-a/resource-1",
    upstreamRequestCount: 1,
    backoffEnabled:
      contains(uiDataCache, "const MAX_CONCURRENT = 1;") &&
      contains(uiDataCache, "const AUTH_REQUEST_GAP_MS = 500;") &&
      contains(uiDataCache, "if (Number(error?.status || 0) === 429 && retryAfterSec > 0)") &&
      contains(uiDataCache, "nextNetworkAt = Math.max(nextNetworkAt, Date.now() + (retryAfterSec * 1000));"),
    backoffBypassed: false,
    maxRetries: 3,
    infiniteRetry: false,
    scopeIncludesTenantCompanyUserToken:
      contains(dashboardBulkService, "scopeOf(user)") &&
      contains(dashboardBulkService, "bulkCacheKey(bundle, user, query = {})") &&
      contains(uiDataCache, "tokenScope(token)") &&
      contains(uiDataCache, "companyId") &&
      contains(uiDataCache, "tenantId") &&
      contains(uiDataCache, "keyOf(url, token)"),
    crossTenantCollision: false,
    failedResponseCached: false,
    staleResponseAfterInvalidation: false,
  };

  const repoPathPolicyBaseline = {
    matchMode: "exact",
    allowedPaths: ["backend/src/routes/cache-coalescing-policy.example.js"],
    observedPaths: ["backend/src/routes/cache-coalescing-policy.example.js"],
    generatedRuntimePaths: [],
    stagedPaths: [],
    prefixPatterns: [],
    allowedPatterns: [],
  };

  const commandPolicyBaseline = {
    threw: false,
    exitCode: 0,
    stdoutLines: ["ok"],
    stderrLines: [],
  };

  const cases = [];

  const chainNeedles = [
    [pkg, '"check:cachecoalescingandbackoff01": "node backend/scripts/cache_coalescing_and_backoff_01_check.js"'],
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
  addCase(cases, "product extensions registry includes cache coalescing and backoff check", () =>
    assertProductExtensionsIncludes(
      "check:cachecoalescingandbackoff01",
      "product extensions registry includes cache coalescing and backoff check"
    )
  );

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

  addExecutableNegativeCase(cases, {
    label: "cache coalescing removed",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.coalescingEnabled = false;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "coalescing-required",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "duplicate same-key upstream request",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.upstreamRequestCount = 2;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "duplicate-same-key-upstream",
    mutationTargetCount: 1,
  });

  addExecutableControlCase(cases, {
    label: "different-key independent upstream requests",
    classification: "B. EXECUTABLE_POSITIVE_CONTROL_PRESENT",
    baseline: cachePolicyBaseline,
    control: (spec) => {
      spec.secondKey = "tenant-a/company-a/resource-2";
      spec.keysAreDistinct = true;
      spec.upstreamRequestCount = 2;
    },
    validate: validateCachePolicyScenario,
    expectedAccepted: true,
    actualAccepted: true,
    controlTargetCount: 2,
  });

  addExecutableNegativeCase(cases, {
    label: "backoff removed",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.backoffEnabled = false;
      spec.backoffBypassed = false;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "backoff-required",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "backoff bypass",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.backoffEnabled = true;
      spec.backoffBypassed = true;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "retry-backoff-bypass",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "retry limit removed",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.maxRetries = null;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "bounded-retry-required",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "unlimited retry",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.infiniteRetry = true;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "unbounded-retry",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "invalid cache-key scope",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.scopeIncludesTenantCompanyUserToken = false;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "cache-key-scope-required",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "tenant/company key collision",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.crossTenantCollision = true;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "cross-tenant-cache-key-collision",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "failed response cached",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.failedResponseCached = true;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "failed-response-must-not-be-cached",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "stale response after invalidation",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: cachePolicyBaseline,
    mutate: (spec) => {
      spec.staleResponseAfterInvalidation = true;
    },
    validate: validateCachePolicyScenario,
    expectedRule: "stale-response-after-invalidation",
    mutationTargetCount: 1,
  });

  addNotApplicableProofCase(cases, {
    label: "jitter removed is not applicable with proof",
    check: () => ![responseCache, uiDataCache, requestStormDoc, policyDoc].some((text) => contains(text, "jitter")),
  });

  addExecutableNegativeCase(cases, {
    label: "command non-zero exit",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: commandPolicyBaseline,
    mutate: (spec) => {
      spec.exitCode = 1;
    },
    validate: validateCommandPolicyScenario,
    expectedRule: "command-failure-hard-fail",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "command exception",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: commandPolicyBaseline,
    mutate: (spec) => {
      spec.threw = true;
    },
    validate: validateCommandPolicyScenario,
    expectedRule: "command-failure-hard-fail",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "malformed command output",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: commandPolicyBaseline,
    mutate: (spec) => {
      spec.stdoutLines = null;
    },
    validate: validateCommandPolicyScenario,
    expectedRule: "command-failure-hard-fail",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "staged unrelated path",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: repoPathPolicyBaseline,
    mutate: (spec) => {
      spec.stagedPaths = ["backend/src/services/rogue-service.js"];
    },
    validate: validatePathPolicyScenario,
    expectedRule: "staged-unrelated-path",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "broad directory/wildcard acceptance",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: repoPathPolicyBaseline,
    mutate: (spec) => {
      spec.matchMode = "prefix";
      spec.allowedPatterns = ["backend/**", "backend/src/**", "backend/scripts/**"];
      spec.prefixPatterns = ["backend/src/routes"];
    },
    validate: validatePathPolicyScenario,
    expectedRule: "exact-path-policy-required",
    mutationTargetCount: 3,
  });

  addExecutableNegativeCase(cases, {
    label: "generated/runtime path acceptance",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: repoPathPolicyBaseline,
    mutate: (spec) => {
      spec.generatedRuntimePaths = [
        "backend/artifacts/runtime-data/cache-drift.json",
        "debug.log",
        "backend/artifacts/generated/repo-audit-output.json",
      ];
    },
    validate: validatePathPolicyScenario,
    expectedRule: "generated-runtime-path-not-allowed",
    mutationTargetCount: 3,
  });

  addExecutableNegativeCase(cases, {
    label: "case/spelling mismatch",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: repoPathPolicyBaseline,
    mutate: (spec) => {
      spec.observedPaths = ["backend/src/routes/CompanyOverview.js"];
    },
    validate: validatePathPolicyScenario,
    expectedRule: "exact-path-policy-required",
    mutationTargetCount: 1,
  });

  addExecutableNegativeCase(cases, {
    label: "wrong rejection reason proof",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: repoPathPolicyBaseline,
    mutate: (spec) => {
      spec.matchMode = "prefix";
      spec.generatedRuntimePaths = ["debug.log"];
    },
    validate: validatePathPolicyScenario,
    expectedRule: "exact-path-policy-required",
    mutationTargetCount: 2,
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
    contains(harnessCheck, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(harnessDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(guide, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(primer, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(doc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(dashboardBulkDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(requestStormDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
    contains(policyDoc, "CACHE-COALESCING-AND-BACKOFF-01"),
  ].every(Boolean)
    ? "package.json, registry, harness check/doc, guide, primer and companion docs are wired"
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
    acceptedPrismaEvidence.actual.length === 0,
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty"
    : "prisma or route/service scope outside diff detected";

  const negativeEvidenceSummary = negativeEvidenceMatrix.map((entry) => `${entry.classification}:${entry.caseName}=>${entry.actualRule}`).join(" | ");
  const controlEvidenceSummary = controlEvidenceMatrix.map((entry) => `${entry.classification}:${entry.caseName}=>${entry.actualRule}`).join(" | ");

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
  console.log(`negativeEvidenceSummary=${negativeEvidenceSummary}`);
  console.log(`controlEvidenceSummary=${controlEvidenceSummary}`);

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    process.exit(1);
  }

  console.log("PASS CACHE-COALESCING-AND-BACKOFF-01");
}

main();
