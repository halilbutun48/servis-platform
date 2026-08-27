#!/usr/bin/env node

import { CANONICAL_PRISMA_SCHEMA_PATH as ACCEPTED_SCHEMA_PATH, CANONICAL_PRISMA_SCHEMA_RAW_SHA256 as ACCEPTED_SCHEMA_SHA256 } from "./lib/prismaSchemaIdentity.js";

import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";
import {
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_PATHS,
} from "./lib/currentHeadScopePolicy.js";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const allRolesReportPath = path.join(
  root,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01",
  "report.json"
);

const premiumReportPath = path.join(
  root,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function gitLines(args) {
  const out = execFileSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function must(cond, label) {
  if (!cond) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustContains(text, needle, label) {
  must(String(text).includes(needle), label);
}

function mustNotContains(text, needle, label) {
  must(!String(text).includes(needle), label);
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
  const out = execFileSync(
    "git",
    ["-c", "safe.directory=D:/servis-platform", "status", "--porcelain=v1", "--untracked-files=all", "--", ...paths],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  return String(out || "")
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
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  must(actual === wanted, label);
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
  const absPath = path.join(root, relPath);
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
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function assertRows(report, label, expectedCounts, expectedRows) {
  must(Array.isArray(report.routes), `${label} keeps routes array`);
  must(report.routeCount === report.routes.length, `${label} routeCount matches rows`);
  must(report.routeCount === 82, `${label} keeps 82 route checks`);
  must(report.statusCounts.PASS === expectedCounts.PASS, `${label} keeps PASS count`);
  must(report.statusCounts["PASS-"] === expectedCounts["PASS-"], `${label} keeps PASS- count`);
  must(report.statusCounts["UX-FIX"] === expectedCounts["UX-FIX"], `${label} keeps UX-FIX count`);
  must(report.statusCounts.BLOCKER === expectedCounts.BLOCKER, `${label} keeps BLOCKER count`);
  must(report.statusCounts["AUTH-BLOCKED"] === expectedCounts["AUTH-BLOCKED"], `${label} keeps AUTH-BLOCKED count`);
  must(report.statusCounts["NOT-FOUND"] === expectedCounts["NOT-FOUND"], `${label} keeps NOT-FOUND count`);
  must(
    report.statusCounts.PASS +
      report.statusCounts["PASS-"] +
      report.statusCounts["UX-FIX"] +
      report.statusCounts.BLOCKER +
      report.statusCounts["AUTH-BLOCKED"] +
      report.statusCounts["NOT-FOUND"] ===
      report.routeCount,
    `${label} status buckets cover all routes`
  );
  must(report.statusCounts["PASS-"] === expectedRows.length, `${label} keeps PASS- row count`);

  for (const row of expectedRows) {
    must(
      report.routes.some((entry) => entry.route === row.route && entry.viewport === row.viewport),
      `${label} lists PASS- route ${row.route} (${row.viewport})`
    );
  }
}

function main() {
  console.log("=== MOBILE-WEB-FINAL-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/MOBILE_WEB_FINAL_01.md");
  const allRolesCheck = read("backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js");
  const premiumCheck = read("backend/scripts/ux_live_panel_premium_smoke_01_check.js");
  const passMinusCheck = read("backend/scripts/ux_smoke_pass_minus_evidence_01_check.js");

  mustContains(pkg, '"check:mobilewebfinal01": "node backend/scripts/mobile_web_final_01_check.js"', "package.json exposes mobile web final check");
  assertProductExtensionsIncludes("check:mobilewebfinal01", "product extensions registry includes mobile web final check");
  mustContains(harnessCheck, "MOBILE-WEB-FINAL-01", "script harness check knows mobile web final milestone");
  mustContains(harnessCheck, "check:mobilewebfinal01", "script harness check knows mobile web final alias");
  mustContains(harnessCheck, "docs/MOBILE_WEB_FINAL_01.md", "script harness check knows mobile web final doc");
  mustContains(harnessDoc, "MOBILE-WEB-FINAL-01", "script harness doc lists mobile web final milestone");
  mustContains(harnessDoc, "check:mobilewebfinal01", "script harness doc lists mobile web final alias");
  mustContains(harnessDoc, "docs/MOBILE_WEB_FINAL_01.md", "script harness doc lists mobile web final doc");
  mustContains(guide, "MOBILE-WEB-FINAL-01", "milestone guide mentions mobile web final milestone");
  mustContains(guide, "check:mobilewebfinal01", "milestone guide exposes mobile web final check");
  mustContains(guide, "node backend\\scripts\\mobile_web_final_01_check.js", "milestone guide includes mobile web final command");
  mustContains(guide, "docs/MOBILE_WEB_FINAL_01.md", "milestone guide includes mobile web final doc");

  mustContains(doc, "MOBILE-WEB-FINAL-01", "mobile final doc title present");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "mobile final doc keeps all-roles snapshot");
  mustContains(doc, "PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "mobile final doc keeps premium snapshot");
  mustContains(doc, "PASS- remaining routes yok", "mobile final doc keeps final risk wording");
  mustContains(doc, "final risk", "mobile final doc keeps final risk wording");
  mustContains(doc, "backlog boş", "mobile final doc keeps backlog wording");
  mustContains(doc, "Sefer Abi launcher", "mobile final doc keeps launcher ruling");
  mustContains(doc, "NavDock", "mobile final doc keeps NavDock ruling");
  mustContains(doc, "UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01", "mobile final doc keeps company personel access milestone");
  mustContains(doc, "horizontal overflow", "mobile final doc keeps overflow ruling");
  mustContains(doc, "sticky tabs", "mobile final doc keeps sticky tabs ruling");
  mustContains(doc, "UX-FIX 0", "mobile final doc keeps UX-FIX acceptance");
  mustContains(doc, "BLOCKER 0", "mobile final doc keeps blocker acceptance");
  mustContains(doc, "NOT-FOUND 0", "mobile final doc keeps not-found acceptance");
  mustContains(doc, "AUTH-BLOCKED 0", "mobile final doc keeps auth-blocked acceptance");
  mustContains(doc, "runtime-data", "mobile final doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "mobile final doc keeps browser-smoke boundary");
  mustContains(doc, "backend/src/routes", "mobile final doc keeps backend route boundary");
  mustContains(doc, "backend/src/services", "mobile final doc keeps backend service boundary");
  mustContains(doc, "prisma", "mobile final doc keeps prisma boundary");
  mustContains(doc, "backend/prisma", "mobile final doc keeps backend prisma boundary");
  mustContains(doc, "no Prisma/schema/migration", "mobile final doc keeps schema boundary wording");
  mustContains(doc, "no route/service/schema", "mobile final doc keeps route/service/schema boundary wording");
  mustNotContains(doc, "force push", "mobile final doc avoids force push wording");
  mustNotContains(doc, "tag taşıma", "mobile final doc avoids tag rewrite wording");

  if (!fs.existsSync(allRolesReportPath)) {
    throw new Error("FAIL mobile final check missing all-roles audit report");
  }
  if (!fs.existsSync(premiumReportPath)) {
    throw new Error("FAIL mobile final check missing premium smoke report");
  }

  const allRolesReport = readJson(allRolesReportPath);
  const premiumReport = readJson(premiumReportPath);

  assertRows(
    allRolesReport,
    "mobile all-roles audit report",
    { PASS: 82, "PASS-": 0, "UX-FIX": 0, BLOCKER: 0, "AUTH-BLOCKED": 0, "NOT-FOUND": 0 },
    []
  );

  assertRows(
    premiumReport,
    "mobile premium smoke report",
    { PASS: 82, "PASS-": 0, "UX-FIX": 0, BLOCKER: 0, "AUTH-BLOCKED": 0, "NOT-FOUND": 0 },
    []
  );

  mustContains(allRolesCheck, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01", "mobile final check keeps all-roles audit reference");
  mustContains(allRolesCheck, "browser-smoke", "mobile final check keeps all-roles browser-smoke boundary");
  mustContains(premiumCheck, "UX-LIVE-PANEL-PREMIUM-SMOKE-01", "mobile final check keeps premium smoke reference");
  mustContains(premiumCheck, "browser-smoke", "mobile final check keeps premium browser-smoke boundary");
  mustContains(passMinusCheck, "PASS- classification", "mobile final check keeps PASS-minus evidence reference");
  mustContains(passMinusCheck, "review queue evidence", "mobile final check keeps review evidence reference");
  mustContains(passMinusCheck, "route preview", "mobile final check keeps route preview evidence reference");
  mustContains(passMinusCheck, "commercial flow", "mobile final check keeps commercial evidence reference");
  mustContains(passMinusCheck, "convertToAgreement", "mobile final check keeps conversion evidence reference");
  mustContains(passMinusCheck, "long live-map", "mobile final check keeps long live-map evidence reference");
  mustContains(passMinusCheck, "console noise", "mobile final check keeps console noise evidence reference");

  const staged = gitLines(["diff", "--cached", "--name-only"]);
  must(staged.length === 0, "stage remains empty");
  mustNotContains(staged, "backend/artifacts/runtime-data", "mobile final check keeps runtime-data unstaged");
  mustNotContains(staged, "backend/artifacts/browser-smoke", "mobile final check keeps browser-smoke unstaged");

  mustAcceptedPrismaManifest();
  mustNoDiffExceptWithIdentity(
    ["backend/src/routes", "backend/src/services"],
    CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF,
    "approved NEW-01 backend diff is identity-locked"
  );

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes"])
    .filter((line) => line && line !== "backend/src/routes/companyOverview.js" && !APPROVED_CONCURRENT_BACKEND_PATHS.has(normalizePath(line)))
    .join("\n");
  const serviceDiff = gitLines(["diff", "--name-only", "--", "backend/src/services"])
    .filter((line) => !APPROVED_CONCURRENT_BACKEND_PATHS.has(normalizePath(line)))
    .join("\n");
  const prismaDiff = gitLines(["diff", "--name-only", "--", "prisma"]).join("\n");
  const backendPrismaDiff = gitLines(["diff", "--name-only", "--", "backend/prisma"])
    .filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file)))
    .join("\n");

  must(routeDiff === "", "mobile final check keeps backend routes unchanged");
  must(serviceDiff === "", "mobile final check keeps backend services unchanged");
  must(prismaDiff === "", "mobile final check keeps prisma unchanged");
  must(backendPrismaDiff === "", "mobile final check keeps backend prisma unchanged");

  console.log("=== MOBILE-WEB-FINAL-01 CHECK PASS ===");
}

main();
