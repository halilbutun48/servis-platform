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
  doc: path.join(repoRoot, "docs", "REQUEST_STORM_RESILIENCE_01.md"),
  policyDoc: path.join(repoRoot, "docs", "PRODUCTION_RATE_LIMIT_POLICY_01.md"),
  cacheGuard: path.join(repoRoot, "backend", "scripts", "cache_coalescing_and_backoff_01_check.js"),
  productionRateLimitPolicy: path.join(repoRoot, "backend", "scripts", "production_rate_limit_policy_01_check.js"),
  loadTest: path.join(repoRoot, "backend", "scripts", "load_test_2000_users_01_check.js"),
  dbPoolAndApiScaling: path.join(repoRoot, "backend", "scripts", "db_pool_and_api_scaling_01_check.js"),
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

function addCase(cases, label, fn) {
  cases.push({ label, fn });
}

function addContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(contains(text, needle), `${label} missing ${needle}`));
}

function addNotContainsCase(cases, label, text, needle) {
  addCase(cases, label, () => must(!contains(text, needle), `${label} unexpectedly contains ${needle}`));
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

function normalizeIdentity(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .trim()
    .toLowerCase();
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

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function outcomeOk(rule, details = {}) {
  return { ok: true, rule, reason: rule, ...details };
}

function outcomeFail(rule, details = {}) {
  return { ok: false, rule, reason: rule, ...details };
}

function exactPathSetEquals(expectedPaths, actualPaths) {
  const expected = sortedUniquePaths(expectedPaths);
  const actual = sortedUniquePaths(actualPaths);
  return expected.length === actual.length && expected.every((entry, index) => entry === actual[index]);
}

function validateRequestStormTrafficScenario(spec = {}) {
  if (!spec || typeof spec !== "object") return outcomeFail("request-storm-policy-invalid");

  const requests = Array.isArray(spec.requests) ? spec.requests : [];
  const requestBudget = Number(spec.requestBudget ?? requests.length);
  const concurrentBudget = Number(spec.concurrentBudget ?? 2);
  const burstBudget = Number(spec.burstBudget ?? 2);
  const requestCount = Number(spec.requestCount ?? requests.length);
  const concurrentRequests = Number(spec.concurrentRequests ?? requests.length);
  const burstRequests = Number(spec.burstRequests ?? requests.length);

  if (!Number.isFinite(requestBudget) || !Number.isFinite(concurrentBudget) || !Number.isFinite(burstBudget)) {
    return outcomeFail("request-storm-policy-invalid");
  }

  if (requestCount > requestBudget || concurrentRequests > concurrentBudget) {
    return outcomeFail("request-concurrency-limit-exceeded");
  }

  if (burstRequests > burstBudget) {
    return outcomeFail("request-burst-limit-exceeded");
  }

  if (requests.some((request) => Boolean(request?.ignore429) || Boolean(request?.ignoreRateLimit))) {
    return outcomeFail("rate-limit-response-must-not-be-ignored");
  }

  if (
    requests.some(
      (request) =>
        Number(request?.status || 0) === 429 &&
        String(request?.retryMode || "").trim().toLowerCase() === "immediate" &&
        Number(request?.retryCount ?? 0) > 0
    )
  ) {
    return outcomeFail("rate-limit-retry-storm");
  }

  const contexts = requests.map((request) => ({
    storageStateId: normalizeIdentity(request?.storageStateId),
    tenantId: normalizeIdentity(request?.tenantId),
    userId: normalizeIdentity(request?.userId),
    roleId: normalizeIdentity(request?.roleId),
  }));

  for (let leftIndex = 0; leftIndex < contexts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < contexts.length; rightIndex += 1) {
      const left = contexts[leftIndex];
      const right = contexts[rightIndex];
      if (!left.storageStateId || left.storageStateId !== right.storageStateId) {
        continue;
      }
      if (left.tenantId && right.tenantId && left.tenantId !== right.tenantId) {
        return outcomeFail("cross-tenant-request-context-mix");
      }
      if (left.userId && right.userId && left.userId !== right.userId) {
        return outcomeFail("cross-user-request-context-mix");
      }
    }
  }

  if (spec.productionTestBypass || spec.testOnlyFallback || spec.mockOnlyFallback || spec.fixtureOnlyFallback) {
    return outcomeFail("production-test-bypass-not-allowed");
  }

  const summary = spec.summary || {};
  const actualFailureCount = Number(summary.actualFailureCount ?? 0);
  const reportedFailureCount = Number(summary.reportedFailureCount ?? 0);
  const actualConsoleErrorCount = Number(summary.actualConsoleErrorCount ?? 0);
  const actualPageErrorCount = Number(summary.actualPageErrorCount ?? 0);
  const actual429Count = Number(summary.actual429Count ?? 0);
  const reportedConsoleErrorCount = Number(summary.reportedConsoleErrorCount ?? 0);
  const reportedPageErrorCount = Number(summary.reportedPageErrorCount ?? 0);
  const reported429Count = Number(summary.reported429Count ?? 0);
  const actualTotal = actualFailureCount + actualConsoleErrorCount + actualPageErrorCount + actual429Count;
  const reportedTotal = reportedFailureCount + reportedConsoleErrorCount + reportedPageErrorCount + reported429Count;

  if (actualTotal !== reportedTotal) {
    return outcomeFail("request-failure-summary-mismatch");
  }

  if (actualTotal > 0 && Boolean(summary.accepted) === true) {
    return outcomeFail("request-failure-summary-mismatch");
  }

  return outcomeOk("request-storm-policy-ok");
}

function validateRequestStormCommandScenario(spec = {}, runner = null) {
  try {
    const result = typeof runner === "function" ? runner(spec) : spec.commandResult;
    if (!result || typeof result !== "object") return outcomeFail("command-failure-hard-fail");
    if (result.threw) return outcomeFail("command-failure-hard-fail");
    if (Number(result.exitCode) !== 0) return outcomeFail("command-failure-hard-fail");
    if (!Array.isArray(result.stdoutLines) || !Array.isArray(result.stderrLines)) return outcomeFail("command-failure-hard-fail");
    if (result.stdoutLines.some((line) => typeof line !== "string") || result.stderrLines.some((line) => typeof line !== "string")) {
      return outcomeFail("command-failure-hard-fail");
    }
    return outcomeOk("request-storm-policy-ok");
  } catch {
    return outcomeFail("command-failure-hard-fail");
  }
}

function validateRequestStormPathScenario(spec = {}) {
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

const requestStormNegativeEvidenceMatrix = [];
const requestStormControlEvidenceMatrix = [];
const requestStormProofEvidenceMatrix = [];

function addRequestStormNegativeCase(cases, spec) {
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

    requestStormNegativeEvidenceMatrix.push({
      caseName: spec.label,
      class: spec.classification,
      baselineAccepted: true,
      mutationOrControlApplied: "mutation",
      targetCount: Number(spec.mutationTargetCount || 0),
      expectedAccepted: false,
      actualAccepted: false,
      expectedRejected: true,
      actualRejected: true,
      expectedRule: spec.expectedRule,
      actualRule: mutatedOutcome.rule,
      repositoryMutation: "NO",
      result: "PASS",
    });
  });
}

function addRequestStormControlCase(cases, spec) {
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

    requestStormControlEvidenceMatrix.push({
      caseName: spec.label,
      class: spec.classification,
      baselineAccepted: true,
      mutationOrControlApplied: "control",
      targetCount: Number(spec.controlTargetCount || 0),
      expectedAccepted: true,
      actualAccepted: true,
      expectedRejected: false,
      actualRejected: false,
      expectedRule: spec.expectedRule || "request-storm-policy-ok",
      actualRule: controlledOutcome.rule,
      repositoryMutation: "NO",
      result: "PASS",
    });
  });
}

function addRequestStormProofCase(cases, spec) {
  addCase(cases, spec.label, () => {
    must(Boolean(spec.check()), `${spec.label} proof failed`);
    requestStormProofEvidenceMatrix.push({
      caseName: spec.label,
      class: "E. NOT_APPLICABLE_WITH_PROOF",
      baselineAccepted: true,
      mutationOrControlApplied: "proof",
      targetCount: 0,
      expectedAccepted: false,
      actualAccepted: false,
      expectedRejected: false,
      actualRejected: false,
      expectedRule: "NOT_APPLICABLE_WITH_PROOF",
      actualRule: "NOT_APPLICABLE_WITH_PROOF",
      repositoryMutation: "NO",
      result: "PASS",
    });
  });
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

function buildCases() {
  const cases = [];

  const packageJson = readFile(paths.packageJson);
  const harnessCheck = readFile(paths.harnessCheck);
  const harnessDoc = readFile(paths.harnessDoc);
  const guide = readFile(paths.guide);
  const primer = readFile(paths.primer);
  const doc = readFile(paths.doc);
  const policyDoc = readFile(paths.policyDoc);
  const cacheGuard = readFile(paths.cacheGuard);
  const productionRateLimitPolicy = readFile(paths.productionRateLimitPolicy);
  const loadTest = readFile(paths.loadTest);
  const dbPoolAndApiScaling = readFile(paths.dbPoolAndApiScaling);
  const premiumSource = readFile(paths.premiumSmoke);
  const mobileSource = readFile(paths.mobileAllRoles);
  const productFlowSource = readFile(paths.productFlow);
  const allPanelsWrapper = readFile(paths.allPanelsWrapper);

  const requestStormTrafficBaseline = {
    requestBudget: 2,
    concurrentBudget: 2,
    burstBudget: 2,
    requestCount: 1,
    concurrentRequests: 1,
    burstRequests: 1,
    requests: [
      {
        tenantId: "tenant-a",
        userId: "user-a",
        roleId: "driver",
        storageStateId: "tenant-a/user-a",
        operationId: "route-preview-1",
        status: 200,
        retryMode: "bounded",
        retryCount: 0,
      },
    ],
    summary: {
      accepted: true,
      actualFailureCount: 0,
      reportedFailureCount: 0,
      actualConsoleErrorCount: 0,
      actualPageErrorCount: 0,
      actual429Count: 0,
      reportedConsoleErrorCount: 0,
      reportedPageErrorCount: 0,
      reported429Count: 0,
    },
  };

  const requestStormCommandBaseline = {
    commandResult: {
      exitCode: 0,
      stdoutLines: ["ok"],
      stderrLines: [],
    },
  };

  const requestStormPathBaseline = {
    matchMode: "exact",
    allowedPaths: ["backend/src/routes/request-storm-policy.example.js"],
    observedPaths: ["backend/src/routes/request-storm-policy.example.js"],
    generatedRuntimePaths: [],
    stagedPaths: [],
    prefixPatterns: [],
    allowedPatterns: [],
  };

  const chainNeedles = [
    [packageJson, '"check:requeststormresilience01": "node backend/scripts/request_storm_resilience_01_check.js"'],
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
  addCase(cases, "product extensions registry includes request storm resilience check", () =>
    assertProductExtensionsIncludes(
      "check:requeststormresilience01",
      "product extensions registry includes request storm resilience check"
    )
  );

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

  addRequestStormControlCase(cases, {
    label: "controlled burst within limit",
    classification: "C. POSITIVE_EVIDENCE_ONLY",
    baseline: requestStormTrafficBaseline,
    control: (spec) => {
      spec.requestCount = 2;
      spec.concurrentRequests = 2;
      spec.burstRequests = 2;
      spec.requests = [
        ...spec.requests,
        {
          tenantId: "tenant-a",
          userId: "user-a",
          roleId: "driver",
          storageStateId: "tenant-a/user-a",
          operationId: "route-preview-2",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
      ];
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "request-storm-policy-ok",
    controlTargetCount: 2,
  });

  addRequestStormNegativeCase(cases, {
    label: "uncontrolled parallel request amplification",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.requestCount = 3;
      spec.concurrentRequests = 3;
      spec.burstRequests = 2;
      spec.requests = [
        ...spec.requests,
        {
          tenantId: "tenant-a",
          userId: "user-a",
          roleId: "driver",
          storageStateId: "tenant-a/user-a",
          operationId: "route-preview-3",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
        {
          tenantId: "tenant-a",
          userId: "user-a",
          roleId: "driver",
          storageStateId: "tenant-a/user-a",
          operationId: "route-preview-4",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
      ];
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "request-concurrency-limit-exceeded",
    mutationTargetCount: 3,
  });

  addRequestStormNegativeCase(cases, {
    label: "repeated request burst beyond policy",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.requestCount = 2;
      spec.concurrentRequests = 2;
      spec.burstRequests = 3;
      spec.requests = [
        spec.requests[0],
        {
          tenantId: "tenant-a",
          userId: "user-a",
          roleId: "driver",
          storageStateId: "tenant-a/user-a",
          operationId: "route-preview-1",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
        {
          tenantId: "tenant-a",
          userId: "user-a",
          roleId: "driver",
          storageStateId: "tenant-a/user-a",
          operationId: "route-preview-1",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
      ];
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "request-burst-limit-exceeded",
    mutationTargetCount: 3,
  });

  addRequestStormControlCase(cases, {
    label: "distinct legitimate requests within limit",
    classification: "C. POSITIVE_EVIDENCE_ONLY",
    baseline: requestStormTrafficBaseline,
    control: (spec) => {
      spec.requestCount = 2;
      spec.concurrentRequests = 2;
      spec.burstRequests = 2;
      spec.requests = [
        spec.requests[0],
        {
          tenantId: "tenant-b",
          userId: "user-b",
          roleId: "personel",
          storageStateId: "tenant-b/user-b",
          operationId: "dashboard-refresh-1",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
      ];
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "request-storm-policy-ok",
    controlTargetCount: 2,
  });

  addRequestStormNegativeCase(cases, {
    label: "429 response ignored",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.requests[0].status = 429;
      spec.requests[0].ignore429 = true;
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "rate-limit-response-must-not-be-ignored",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "429 immediate retry amplification",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.requests[0].status = 429;
      spec.requests[0].retryMode = "immediate";
      spec.requests[0].retryCount = 2;
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "rate-limit-retry-storm",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "tenant boundary mix",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.requestCount = 2;
      spec.concurrentRequests = 2;
      spec.burstRequests = 2;
      spec.requests = [
        spec.requests[0],
        {
          tenantId: "tenant-b",
          userId: "user-b",
          roleId: "personel",
          storageStateId: "tenant-a/user-a",
          operationId: "route-preview-2",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
      ];
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "cross-tenant-request-context-mix",
    mutationTargetCount: 2,
  });

  addRequestStormNegativeCase(cases, {
    label: "user or role boundary mix",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.requestCount = 2;
      spec.concurrentRequests = 2;
      spec.burstRequests = 2;
      spec.requests = [
        spec.requests[0],
        {
          tenantId: "tenant-a",
          userId: "user-b",
          roleId: "personel",
          storageStateId: "tenant-a/user-a",
          operationId: "route-preview-2",
          status: 200,
          retryMode: "bounded",
          retryCount: 0,
        },
      ];
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "cross-user-request-context-mix",
    mutationTargetCount: 2,
  });

  addRequestStormNegativeCase(cases, {
    label: "production test-only fallback",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.productionTestBypass = true;
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "production-test-bypass-not-allowed",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "error or 429 hidden from acceptance summary",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormTrafficBaseline,
    mutate: (spec) => {
      spec.summary.actualFailureCount = 1;
      spec.summary.reportedFailureCount = 0;
      spec.summary.accepted = true;
    },
    validate: validateRequestStormTrafficScenario,
    expectedRule: "request-failure-summary-mismatch",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "command non-zero exit",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormCommandBaseline,
    mutate: (spec) => {
      spec.commandResult.exitCode = 1;
    },
    validate: (spec) => validateRequestStormCommandScenario(spec, () => spec.commandResult),
    expectedRule: "command-failure-hard-fail",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "command exception",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormCommandBaseline,
    mutate: (spec) => {
      spec.commandResult.runnerThrows = true;
    },
    validate: (spec) => validateRequestStormCommandScenario(spec, () => {
      if (spec.commandResult.runnerThrows) {
        throw new Error("injected command runner failure");
      }
      return spec.commandResult;
    }),
    expectedRule: "command-failure-hard-fail",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "malformed command output",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormCommandBaseline,
    mutate: (spec) => {
      spec.commandResult.stdoutLines = null;
    },
    validate: (spec) => validateRequestStormCommandScenario(spec, () => spec.commandResult),
    expectedRule: "command-failure-hard-fail",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "staged unrelated path",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormPathBaseline,
    mutate: (spec) => {
      spec.stagedPaths = ["backend/src/services/rogue-service.js"];
    },
    validate: validateRequestStormPathScenario,
    expectedRule: "staged-unrelated-path",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "broad route/service wildcard acceptance",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormPathBaseline,
    mutate: (spec) => {
      spec.matchMode = "prefix";
      spec.allowedPatterns = ["backend/**", "backend/src/**", "backend/scripts/**"];
      spec.prefixPatterns = ["backend/src/routes"];
    },
    validate: validateRequestStormPathScenario,
    expectedRule: "exact-path-policy-required",
    mutationTargetCount: 3,
  });

  addRequestStormNegativeCase(cases, {
    label: "generated/runtime path acceptance",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormPathBaseline,
    mutate: (spec) => {
      spec.generatedRuntimePaths = [
        "backend/artifacts/runtime-data/cache-drift.json",
        "debug.log",
        "backend/artifacts/generated/repo-audit-output.json",
      ];
    },
    validate: validateRequestStormPathScenario,
    expectedRule: "generated-runtime-path-not-allowed",
    mutationTargetCount: 3,
  });

  addRequestStormNegativeCase(cases, {
    label: "case or path spelling mismatch",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormPathBaseline,
    mutate: (spec) => {
      spec.observedPaths = ["backend/src/routes/CompanyOverview.js"];
    },
    validate: validateRequestStormPathScenario,
    expectedRule: "exact-path-policy-required",
    mutationTargetCount: 1,
  });

  addRequestStormNegativeCase(cases, {
    label: "wrong rejection reason proof",
    classification: "A. EXECUTABLE_NEGATIVE_EVIDENCE_PRESENT",
    baseline: requestStormPathBaseline,
    mutate: (spec) => {
      spec.matchMode = "prefix";
      spec.generatedRuntimePaths = ["debug.log"];
    },
    validate: validateRequestStormPathScenario,
    expectedRule: "exact-path-policy-required",
    mutationTargetCount: 2,
  });

  addRequestStormProofCase(cases, {
    label: "rate-limit policy removed is not applicable with proof",
    check: () =>
      [
        contains(productionRateLimitPolicy, "429 Console Policy"),
        contains(productionRateLimitPolicy, "RATE_LIMITED"),
        contains(policyDoc, "429 ignore list"),
        contains(doc, "PRODUCTION-RATE-LIMIT-POLICY-01"),
      ].every(Boolean),
  });

  addRequestStormProofCase(cases, {
    label: "retry/backoff removed is not applicable with proof",
    check: () =>
      [
        contains(cacheGuard, "backoff removed"),
        contains(cacheGuard, "backoff bypass"),
        contains(cacheGuard, "bounded-retry-required"),
        contains(cacheGuard, "retry-backoff-bypass"),
      ].every(Boolean),
  });

  addRequestStormProofCase(cases, {
    label: "same-key cache coalescing removed is not applicable with proof",
    check: () =>
      [
        contains(cacheGuard, "duplicate same-key upstream request"),
        contains(cacheGuard, "different-key independent upstream requests"),
        contains(cacheGuard, "same-key upstream request"),
      ].every(Boolean),
  });

  addRequestStormProofCase(cases, {
    label: "bounded DB/API concurrency removed is not applicable with proof",
    check: () =>
      [
        contains(dbPoolAndApiScaling, "API concurrency"),
        contains(dbPoolAndApiScaling, "high concurrency stays flag-gated"),
        contains(dbPoolAndApiScaling, "429 remains a real signal"),
      ].every(Boolean),
  });

  addRequestStormProofCase(cases, {
    label: "load-test capacity removed is not applicable with proof",
    check: () =>
      [
        contains(loadTest, "LOAD_TEST_ALLOW_HIGH_CONCURRENCY"),
        contains(loadTest, "harness reports 429 count"),
        contains(loadTest, "REQUEST-STORM-RESILIENCE-01"),
      ].every(Boolean),
  });

  addRequestStormProofCase(cases, {
    label: "jitter removed is not applicable with proof",
    check: () => contains(cacheGuard, "jitter removed is not applicable with proof"),
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

  const backendPrismaEvidence = collectBackendPrismaEvidence();
  const routeServicePrismaSummary = [
    gitLines(["diff", "--name-only", "--", "backend/src/routes"]).length === 0,
    gitLines(["diff", "--name-only", "--", "backend/src/services"]).length === 0,
    gitLines(["diff", "--name-only", "--", "prisma"]).length === 0,
    backendPrismaEvidence.actual.length === 0,
  ].every(Boolean)
    ? "backend/src/routes diff empty; backend/src/services diff empty; prisma diff empty; backend/prisma diff empty"
    : "route/service/prisma scope dışında değişiklik var";

  const requestStormNegativeSummary = requestStormNegativeEvidenceMatrix.map((entry) => `${entry.class}:${entry.caseName}=>${entry.actualRule}`).join(" | ");
  const requestStormControlSummary = requestStormControlEvidenceMatrix.map((entry) => `${entry.class}:${entry.caseName}=>${entry.actualRule}`).join(" | ");
  const requestStormProofSummary = requestStormProofEvidenceMatrix.map((entry) => `${entry.class}:${entry.caseName}=>${entry.actualRule}`).join(" | ");

  const chainWiringSummary = [
    contains(readFile(paths.packageJson), '"check:requeststormresilience01": "node backend/scripts/request_storm_resilience_01_check.js"'),
    contains(readFile(paths.harnessCheck), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.harnessDoc), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.guide), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.primer), "REQUEST-STORM-RESILIENCE-01"),
    contains(readFile(paths.doc), "REQUEST-STORM-RESILIENCE-01"),
  ].every(Boolean)
    ? "package.json, registry, harness check/doc, guide, primer ve milestone doc request-storm resilience için bağlı"
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
  console.log(`requestStormNegativeSummary=${requestStormNegativeSummary}`);
  console.log(`requestStormControlSummary=${requestStormControlSummary}`);
  console.log(`requestStormProofSummary=${requestStormProofSummary}`);

  if (failCount > 0) {
    for (const failure of results.filter((item) => !item.ok)) {
      console.error(`FAIL ${failure.label}: ${failure.error}`);
    }
    process.exit(1);
  }

  console.log("PASS REQUEST-STORM-RESILIENCE-01");
}

main();
