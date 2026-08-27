#!/usr/bin/env node

import { CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH, CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256 } from "./lib/prismaSchemaIdentity.js";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";
import {
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS,
} from "./lib/currentHeadScopePolicy.js";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const allPanelsReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_ALL_PANELS_REALITY_AUDIT_01",
  "report.json"
);

const mobileAllRolesReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01",
  "report.json"
);

const premiumSmokeReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

const productFlowReportPath = path.join(
  repoRoot,
  "backend",
  "artifacts",
  "browser-smoke",
  "PRODUCT_FLOW_BUTTON_AUDIT_01",
  "report.json"
);

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function gitExec(args) {
  return execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitLines(args) {
  const out = gitExec(args);
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitSaysYes(args) {
  try {
    gitExec(args);
    return true;
  } catch (error) {
    if (typeof error?.status === "number" && error.status === 1) {
      return false;
    }
    throw error;
  }
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
  return String(gitExec(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]) || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3);
      const pathText = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() : rawPath;
      return { path: normalizePath(pathText), raw: line };
    });
}

function mustExactGitPaths(paths, expectedPaths, label) {
  const actual = sortedUniquePaths(gitStatusEntries(paths).map((entry) => entry.path));
  const expected = sortedUniquePaths(expectedPaths);
  const unexpected = actual.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actual.includes(file));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(`${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`);
  }
  console.log(`OK ${label}`);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(repoRoot, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  must(actual === wanted, label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(repoRoot, relPath);
  const stat = fs.lstatSync(absPath);
  must(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
}

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
const APPROVED_CONCURRENT_BACKEND_PATHS = new Set(CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS);

function mustAcceptedPrismaManifest() {
  must(gitLines(["diff", "--name-only", "--", "backend/prisma"]).length === 0, "backend prisma diff not empty");
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

function must(cond, label) {
  if (!cond) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function expectStatusCounts(report, expected, label) {
  must(report.routeCount === expected.routeCount, `${label} route count`);
  if (expected.screenshotCount !== undefined) {
    must(report.screenshotCount === expected.screenshotCount, `${label} screenshot count`);
  }
  if (expected.success !== undefined) {
    must(report.success === expected.success, `${label} success flag`);
  }
  if (expected.consoleErrorCount !== undefined) {
    must(report.consoleErrorCount === expected.consoleErrorCount, `${label} console error count`);
  }
  if (expected.pageErrorCount !== undefined) {
    must(report.pageErrorCount === expected.pageErrorCount, `${label} page error count`);
  }
  if (expected.totalLoginFailures !== undefined) {
    must(report.totalLoginFailures === expected.totalLoginFailures, `${label} login failure count`);
  }

  const actual = report.statusCounts || {};
  for (const [status, value] of Object.entries(expected.statusCounts || {})) {
    must(actual[status] === value, `${label} keeps ${status} count`);
  }
}

function expectSummary(report, expected, label) {
  const summary = report.summary || {};
  for (const [key, value] of Object.entries(expected)) {
    must(summary[key] === value, `${label} summary ${key}`);
  }
}

function main() {
  console.log("=== QUALITY-GATE-FINAL-01 CHECK ===");

  const pkg = read("package.json");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/QUALITY_GATE_FINAL_01.md");
  const roadmapLock = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");

  mustContains(pkg, '"check:qualitygatefinal01": "node backend/scripts/quality_gate_final_01_check.js"', "package.json exposes quality gate final check");
  assertProductExtensionsIncludes("check:qualitygatefinal01", "product extensions registry includes quality gate final check");
  mustContains(harnessCheck, "QUALITY-GATE-FINAL-01", "script harness check knows quality gate final milestone");
  mustContains(harnessCheck, "check:qualitygatefinal01", "script harness check knows quality gate final alias");
  mustContains(harnessCheck, "docs/QUALITY_GATE_FINAL_01.md", "script harness check knows quality gate final doc");
  mustContains(harnessDoc, "QUALITY-GATE-FINAL-01", "script harness doc lists quality gate final milestone");
  mustContains(harnessDoc, "check:qualitygatefinal01", "script harness doc lists quality gate final alias");
  mustContains(harnessDoc, "docs/QUALITY_GATE_FINAL_01.md", "script harness doc lists quality gate final doc");
  mustContains(guide, "QUALITY-GATE-FINAL-01", "milestone guide mentions quality gate final milestone");
  mustContains(guide, "check:qualitygatefinal01", "milestone guide exposes quality gate final check");
  mustContains(guide, "node backend\\scripts\\quality_gate_final_01_check.js", "milestone guide includes quality gate final command");
  mustContains(guide, "docs/QUALITY_GATE_FINAL_01.md", "milestone guide includes quality gate final doc");
  mustContains(roadmapLock, "QUALITY-GATE-FINAL-01", "roadmap lock keeps quality gate final milestone");

  mustContains(doc, "QUALITY-GATE-FINAL-01", "quality gate final doc title present");
  mustContains(doc, "check:qualitygatefinal01", "quality gate final doc exposes the alias");
  mustContains(doc, "node backend\\scripts\\quality_gate_final_01_check.js", "quality gate final doc exposes the command");
  mustContains(doc, "all-panels reality audit", "quality gate final doc names all-panels audit");
  mustContains(doc, "mobile all-roles audit", "quality gate final doc names mobile all-roles audit");
  mustContains(doc, "premium smoke", "quality gate final doc names premium smoke");
  mustContains(doc, "product-flow button audit", "quality gate final doc names product-flow audit");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps all-panels summary");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps mobile all-roles summary");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps premium summary");
  mustContains(doc, "PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "quality gate final doc keeps product-flow summary");
  mustContains(doc, "UX-SMOKE-PASS-MINUS-EVIDENCE-01", "quality gate final doc references PASS-minus evidence doc");
  mustContains(doc, "PRODUCT-FLOW-BUTTON-AUDIT-01", "quality gate final doc references product flow audit doc");
  mustContains(doc, "runtime-data", "quality gate final doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "quality gate final doc keeps browser-smoke boundary");
  mustContains(doc, "backend/src/routes", "quality gate final doc keeps backend routes boundary");
  mustContains(doc, "backend/src/services", "quality gate final doc keeps backend services boundary");
  mustContains(doc, "prisma", "quality gate final doc keeps prisma boundary");
  mustContains(doc, "backend/prisma", "quality gate final doc keeps backend prisma boundary");
  mustContains(doc, "no route/service/schema", "quality gate final doc keeps route/service/schema wording");
  mustContains(doc, "no Prisma/schema/migration", "quality gate final doc keeps prisma/schema/migration wording");
  mustContains(doc, "commit-ready", "quality gate final doc keeps commit-ready wording");
  mustContains(doc, "release blocker", "quality gate final doc keeps release blocker wording");
  mustContains(doc, "stage empty", "quality gate final doc keeps stage-empty wording");
  mustNotContains(doc, "force push", "quality gate final doc avoids force-push wording");
  mustNotContains(doc, "tag taşıma", "quality gate final doc avoids tag-move wording");

  if (!fs.existsSync(allPanelsReportPath)) {
    throw new Error("FAIL quality gate final missing all-panels report");
  }
  if (!fs.existsSync(mobileAllRolesReportPath)) {
    throw new Error("FAIL quality gate final missing mobile all-roles report");
  }
  if (!fs.existsSync(premiumSmokeReportPath)) {
    throw new Error("FAIL quality gate final missing premium smoke report");
  }
  if (!fs.existsSync(productFlowReportPath)) {
    throw new Error("FAIL quality gate final missing product-flow report");
  }

  const allPanelsReport = readJson(allPanelsReportPath);
  const mobileAllRolesReport = readJson(mobileAllRolesReportPath);
  const premiumSmokeReport = readJson(premiumSmokeReportPath);
  const productFlowReport = readJson(productFlowReportPath);

  expectStatusCounts(
    allPanelsReport,
    {
      routeCount: 82,
      screenshotCount: 164,
      statusCounts: {
        PASS: 82,
        "PASS-": 0,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
    },
    "all-panels reality audit"
  );
  expectSummary(
    allPanelsReport,
    {
      desktopRouteCount: 41,
      mobileRouteCount: 41,
      passCount: 82,
      passMinusCount: 0,
      uxFixCount: 0,
      blockerCount: 0,
      authBlockedCount: 0,
      notFoundCount: 0,
      horizontalOverflowIssueCount: 0,
      primaryActionClickableIssueCount: 0,
      launcherOverlapIssueCount: 0,
      mobileDrawerIssueCount: 0,
      stickyHeaderTabIssueCount: 0,
      emptyLoadingErrorUnreadableCount: 0,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      networkErrorCount: 0,
    },
    "all-panels reality audit"
  );

  expectStatusCounts(
    mobileAllRolesReport,
    {
      routeCount: 82,
      screenshotCount: 164,
      statusCounts: {
        PASS: 82,
        "PASS-": 0,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      totalLoginFailures: 0,
    },
    "mobile all-roles audit"
  );

  expectStatusCounts(
    premiumSmokeReport,
    {
      routeCount: 82,
      screenshotCount: 164,
      statusCounts: {
        PASS: 82,
        "PASS-": 0,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      totalLoginFailures: 0,
    },
    "premium smoke"
  );

  expectStatusCounts(
    productFlowReport,
    {
      routeCount: 18,
      screenshotCount: 36,
      statusCounts: {
        PASS: 18,
        "PASS-": 0,
        "UX-FIX": 0,
        BLOCKER: 0,
        "AUTH-BLOCKED": 0,
        "NOT-FOUND": 0,
      },
      success: true,
      consoleErrorCount: 0,
      pageErrorCount: 0,
      totalLoginFailures: 0,
    },
    "product-flow button audit"
  );

  const staged = gitLines(["diff", "--cached", "--name-only"]);
  const stagedText = staged.join("\n");
  must(!normalize(stagedText).includes("backend/artifacts/runtime-data"), "runtime-data is not staged");
  must(!normalize(stagedText).includes("backend/artifacts/browser-smoke"), "browser-smoke artifacts are not staged");
  must(staged.length === 0, "stage remains empty");
  mustAcceptedPrismaManifest();
  mustNoDiffExceptWithIdentity(
    ["backend/src/routes", "backend/src/services"],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    "approved NEW-01 backend diff is identity-locked"
  );

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes"]).join("\n");
  const serviceDiff = gitLines(["diff", "--name-only", "--", "backend/src/services"]).join("\n");
  const prismaDiff = gitLines(["diff", "--name-only", "--", "prisma"]).join("\n");
  const backendPrismaDiff = gitLines(["diff", "--name-only", "--", "backend/prisma"]).join("\n");

  const routeDiffFiltered = routeDiff
    .split(/\r?\n/)
    .filter((line) => line && line !== "backend/src/routes/companyOverview.js" && !APPROVED_CONCURRENT_BACKEND_PATHS.has(normalizePath(line)))
    .join("\n");

  must(routeDiffFiltered === "", "backend routes stay unchanged");
  const serviceDiffFiltered = serviceDiff
    .split(/\r?\n/)
    .filter((line) => line && !APPROVED_CONCURRENT_BACKEND_PATHS.has(normalizePath(line)))
    .join("\n");
  must(serviceDiffFiltered === "", "backend services stay unchanged");
  const prismaDiffFiltered = sortedUniquePaths([
    ...prismaDiff.split(/\r?\n/).filter(Boolean),
    ...backendPrismaDiff.split(/\r?\n/).filter(Boolean),
  ]).filter(
    (file) => !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file))
  );

  must(prismaDiffFiltered.length === 0, "backend prisma stay unchanged");

  const requiredTags = [
    "v2026.06.08-quality-gate-final-01",
    "v2026.06.08-quality-gate-final-01b-premium-smoke-fix",
    "v2026.06.08-ux-all-panels-p1-burndown-01",
    "v2026.06.08-roadmap-lock-ai-marketplace-01",
  ];
  for (const tag of requiredTags) {
    must(gitLines(["tag", "--list", tag]).includes(tag), `quality gate tag exists: ${tag}`);
  }

  const reachableTags = [
    "v2026.06.08-quality-gate-final-01b-premium-smoke-fix",
    "v2026.06.08-ux-all-panels-p1-burndown-01",
  ];
  for (const tag of reachableTags) {
    const tagCommit = gitLines(["rev-parse", "--verify", `${tag}^{commit}`])[0];
    must(Boolean(tagCommit), `quality gate tag resolves to a commit: ${tag}`);
    must(
      gitSaysYes(["merge-base", "--is-ancestor", tagCommit, "HEAD"]),
      `current HEAD keeps reachable quality gate history for ${tag}`
    );
  }

  console.log("=== QUALITY-GATE-FINAL-01 CHECK PASS ===");
}

main();
