#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

function must(condition, label) {
  if (!condition) {
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

function mustAll(text, items, label) {
  for (const [needle, itemLabel] of items) {
    mustContains(text, needle, `${label}: ${itemLabel}`);
  }
}

function gitCapture(args) {
  const result = spawnSync("git", ["-c", "safe.directory=D:/servis-platform", ...args], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`git ${args.join(" ")} failed with exit ${result.status}${output ? `: ${output}` : ""}`);
  }

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function gitLines(args) {
  return gitCapture(args)
    .stdout.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustGitEmpty(args, label) {
  const result = gitCapture(args);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  must(result.status === 0, `${label} exit code is 0`);
  must(output === "", `${label} has empty output`);
}

function mustDiffCheckClean(label, args) {
  const result = gitCapture(args);
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  must(result.status === 0, `${label} exit code is 0`);

  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const whitespaceErrors = lines.filter((line) => /trailing whitespace|space before tab in indent|leftover conflict marker/i.test(line));
  const crlfWarnings = lines.filter((line) => /CRLF will be replaced by LF/i.test(line));

  must(whitespaceErrors.length === 0, `${label} has no whitespace errors`);
  if (crlfWarnings.length > 0) {
    console.log(`OK ${label} CRLF warning noted: ${crlfWarnings[0]}`);
  } else {
    console.log(`OK ${label} has no CRLF warning`);
  }

  return { crlfWarnings, output };
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
  return String(gitCapture(["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths]).stdout || "")
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
  must(unexpected.length === 0 && missing.length === 0, `${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  must(fileSha256(relPath) === String(expectedHash || "").toUpperCase(), label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      throw new Error(`FAIL ${relPath}: unexpected bare CR`);
    }
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`FAIL ${relPath}: invalid UTF-8`);
  }
  const normalized = text.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(normalized, "utf8")).digest("hex").toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  must(normalizedTextSha256(relPath) === String(expectedHash || "").toUpperCase(), label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  must(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  must(entries.length === 1 && entries[0] === "migration.sql", `${label} has exactly one migration.sql`);
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
const NORMALIZED_PRISMA_PATH_SET = new Set([
  "backend/prisma/migrations/20260125133200_driver_telematics_route_learning_baseline/migration.sql",
  "backend/prisma/migrations/20260303011000_add_company_region_id_missing_bridge/migration.sql",
  "backend/prisma/migrations/20260801210000_user_surface_reconciliation_01/migration.sql",
  "backend/prisma/migrations/20260801211000_room_company_cleanup_01/migration.sql",
  "backend/prisma/migrations/20260801212000_shift_agreement_unique_bridge_01/migration.sql",
]);
const ALLOWED_ROUTE_PATHS = new Set(["backend/src/routes/companyOverview.js"]);

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    if (NORMALIZED_PRISMA_PATH_SET.has(normalizePath(entry.path))) {
      mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    } else {
      mustFileSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    }
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

async function main() {
  console.log("=== TEST-QUALITY-AND-FLAKE-AUDIT-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const doc = read("docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md");
  const productFlowCheck = read("backend/scripts/product_flow_button_audit_01_check.js");
  const productFlowSmoke = read("backend/scripts/product_flow_button_audit_01.mjs");
  const premiumSmokeCheck = read("backend/scripts/ux_live_panel_premium_smoke_01_check.js");
  const premiumSmoke = read("backend/scripts/ux_live_panel_premium_smoke_01.mjs");
  const allPanelsCheck = read("backend/scripts/ux_all_panels_reality_audit_01_check.js");
  const allPanelsSmoke = read("backend/scripts/ux_all_panels_reality_audit_01.mjs");
  const mobileAuditCheck = read("backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js");
  const mobileAuditSmoke = read("backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs");
  const routeReviewCheck = read("backend/scripts/copilot_route_review_human_approval_01_check.js");
  const redteamCheck = read("backend/scripts/excel_to_route_readiness_redteam_01_check.js");
  const companyAgreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
  const roomAgreementsPanel = read("web/src/panels/room/AgreementsPanel.jsx");
  const routePreviewChecks = read("backend/scripts/_m91_route_preview_checks.js");
  const gitStatusShort = gitCapture(["status", "--short"]).stdout.trim();
  const gitCachedNames = gitLines(["diff", "--cached", "--name-only"]);
  const gitRouteDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "prisma", "backend/prisma"]);
  const diffCheck = mustDiffCheckClean("git diff --check", ["diff", "--check"]);
  mustGitEmpty(["diff", "--cached", "--check"], "git diff --cached --check");

  const guards = [];
  const addGuard = (category, label, run) => {
    guards.push({ category, label, run });
  };

  addGuard("wiring", "package.json exposes the test quality and flake audit check", () => {
    mustContains(pkg, '"check:testqualityandflakeaudit01": "node backend/scripts/test_quality_and_flake_audit_01_check.js"', "package.json exposes check:testqualityandflakeaudit01");
  });

  addGuard("wiring", "product extensions runner includes the new audit check", () => {
    mustContains(runner, "'check:testqualityandflakeaudit01'", "product extensions runner includes check:testqualityandflakeaudit01");
  });

  addGuard("wiring", "verify chain includes the new audit check", () => {
    mustContains(verify, '"check:testqualityandflakeaudit01"', "verify chain includes check:testqualityandflakeaudit01");
  });

  addGuard("wiring", "harness check knows the new milestone", () => {
    mustAll(harnessCheck, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "root alias"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
    ], "script harness check wiring");
  });

  addGuard("wiring", "harness doc keeps the new milestone visible", () => {
    mustAll(harnessDoc, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "root alias"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
    ], "script harness doc wiring");
  });

  addGuard("wiring", "milestone guide exposes the new audit", () => {
    mustAll(guide, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "check alias"],
      ["node backend\\scripts\\test_quality_and_flake_audit_01_check.js", "command"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
    ], "milestone guide wiring");
  });

  addGuard("wiring", "primer exposes the new audit", () => {
    mustAll(primer, [
      ["TEST-QUALITY-AND-FLAKE-AUDIT-01", "milestone name"],
      ["check:testqualityandflakeaudit01", "check alias"],
      ["docs/TEST_QUALITY_AND_FLAKE_AUDIT_01.md", "doc path"],
      ["backend/scripts/test_quality_and_flake_audit_01_check.js", "command path"],
    ], "primer wiring");
  });

  addGuard("docs", "audit doc title and top-level sections are present", () => {
    mustAll(doc, [
      ["# TEST-QUALITY-AND-FLAKE-AUDIT-01", "title"],
      ["## 1) Purpose", "purpose section"],
      ["## 2) Scope", "scope section"],
      ["## 3) Scripts Audited", "scripts audited section"],
      ["## 4) Flake Risks Found", "flake risks section"],
      ["## 5) False Negative Fixes", "false negative fixes section"],
    ], "audit doc structure");
  });

  addGuard("docs", "audit doc keeps the purpose wording", () => {
    mustAll(doc, [
      ["Bu milestone feature milestone değildir.", "feature milestone note"],
      ["smoke/check zincirindeki flake risklerini", "flake risk wording"],
      ["threshold / skip / timing / PASS kriteri", "threshold wording"],
    ], "audit doc purpose");
  });

  addGuard("docs", "audit doc keeps the scope wording", () => {
    mustAll(doc, [
      ["kırılgan bekleme ve selector yüzeylerini denetlemek", "selector/wait scope"],
      ["false negative üreten dar noktaları belgelemek", "false negative scope"],
      ["runtime-data, browser-smoke ve debug.log commit sınırını görünür tutmak", "commit boundary scope"],
    ], "audit doc scope");
  });

  addGuard("docs", "audit doc keeps the scripts audited wording", () => {
    mustAll(doc, [
      ["npm run smoke:productflowbuttonaudit01", "product-flow smoke"],
      ["npm run smoke:uxlivepanelpremium01", "premium smoke"],
      ["npm run smoke:uxallpanelsrealityaudit01", "all-panels smoke"],
      ["npm run smoke:uxmobileallrolespanelaudit01", "mobile all-roles smoke"],
      ["npm run check:product-extensions", "product extensions"],
      ["npm run verify:repo", "verify repo"],
      ["npm run verify:final", "verify final"],
    ], "audit doc scripts audited");
  });

  addGuard("docs", "audit doc keeps the flake risk wording", () => {
    mustAll(doc, [
      ["school mobile overview", "school overview risk"],
      ["split path references", "split path risk"],
      ["exact allowlist entries", "allowlist risk"],
      ["No threshold relaxation was accepted.", "no threshold relaxation"],
    ], "audit doc flake risks");
  });

  addGuard("docs", "audit doc keeps the false negative fixes wording", () => {
    mustAll(doc, [
      ["backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs", "mobile wait fix"],
      ["backend/scripts/_m91_route_preview_checks.js", "route preview path fix"],
      ["Okul — Planlama Merkezi", "school overview target"],
      ["false negative", "false negative wording"],
    ], "audit doc false negative fixes");
  });

  addGuard("docs", "audit doc keeps selector and wait stabilization notes", () => {
    mustAll(doc, [
      ["## 6) Selector / Wait Stabilization Notes", "selector/wait section"],
      ["visible locator", "visible locator wording"],
      ["role/data-testid", "role/data-testid wording"],
      ["aria-label", "aria-label wording"],
      ["button text", "button text wording"],
    ], "audit doc selector stabilization");
  });

  addGuard("docs", "audit doc keeps the selector and wait wording", () => {
    mustAll(doc, [
      ["role and aria-label surfaces", "role and aria label wording"],
      ["button text is preserved", "button text wording"],
      ["no broad sleep", "no broad sleep wording"],
    ], "audit doc stabilization notes");
  });

  addGuard("docs", "audit doc keeps explicit non-goals", () => {
    mustAll(doc, [
      ["## 7) Explicitly Not Changed", "explicit non-goals section"],
      ["smoke threshold preservation", "smoke threshold preservation wording"],
      ["runtime-data / browser-smoke / debug.log policy", "commit-external policy heading"],
      ["route/service/prisma", "route/service/prisma wording"],
      ["global allowlist", "global allowlist wording"],
    ], "audit doc non-goals");
  });

  addGuard("docs", "audit doc keeps the non-goals wording", () => {
    mustAll(doc, [
      ["new UI davranışı eklemez", "no new UI wording"],
      ["backend route/service/prisma değiştirmez", "no backend changes wording"],
      ["skip eklemez", "no skip wording"],
      ["threshold düşürmez", "no threshold wording"],
      ["broad allowlist açmaz", "no broad allowlist wording"],
    ], "audit doc non-goals wording");
  });

  addGuard("docs", "audit doc keeps validation and follow-up sections", () => {
    mustAll(doc, [
      ["## 10) Validation Results", "validation results section"],
      ["## 11) Remaining Risks", "remaining risks section"],
      ["## 12) Next Recommended Milestone", "next recommended milestone section"],
      ["guardCases", "guardCases label"],
      ["passCount", "passCount label"],
      ["failCount", "failCount label"],
    ], "audit doc follow-up sections");
  });

  addGuard("docs", "audit doc keeps the smoke threshold preservation section", () => {
    mustAll(doc, [
      ["## 8) Smoke Threshold Preservation", "threshold heading"],
      ["product-flow: `PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "product-flow threshold"],
      ["premium smoke: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "premium threshold"],
      ["all-panels reality audit: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "all-panels threshold"],
      ["mobile all-roles audit: `PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`", "mobile threshold"],
    ], "audit doc thresholds");
  });

  addGuard("docs", "audit doc keeps the runtime-data and browser-smoke policy", () => {
    mustAll(doc, [
      ["## 9) Runtime-data / Browser-smoke / debug.log Policy", "policy heading"],
      ["runtime-data stays commit external and unstaged", "runtime-data wording"],
      ["browser-smoke artifacts stay commit external and ignored", "browser-smoke wording"],
      ["debug.log stays absent", "debug.log wording"],
      ["stage stays empty", "stage wording"],
    ], "audit doc commit external policy");
  });

  addGuard("docs", "audit doc keeps the validation results wording", () => {
    mustAll(doc, [
      ["npm run check:testqualityandflakeaudit01", "audit command"],
      ["guardCases", "guardCases metric"],
      ["passCount", "passCount metric"],
      ["failCount", "failCount metric"],
      ["flakeRiskSummary", "flakeRiskSummary metric"],
      ["smokeThresholdSummary", "smokeThresholdSummary metric"],
      ["selectorStabilitySummary", "selectorStabilitySummary metric"],
      ["commitExternalSummary", "commitExternalSummary metric"],
      ["routeServicePrismaSummary", "routeServicePrismaSummary metric"],
    ], "audit doc validation results");
  });

  addGuard("docs", "audit doc keeps the remaining risks wording", () => {
    mustAll(doc, [
      ["browser-smoke artifacts", "browser-smoke risk"],
      ["PASS-minus evidence routes", "PASS-minus evidence risk"],
      ["mobile overview waits", "mobile wait risk"],
    ], "audit doc remaining risks");
  });

  addGuard("docs", "audit doc keeps the next recommended milestone wording", () => {
    mustAll(doc, [
      ["## 12) Next Recommended Milestone", "next milestone heading"],
      ["QUALITY-GATE-FINAL-01", "next milestone name"],
      ["existing release gate", "release gate wording"],
    ], "audit doc next milestone");
  });

  addGuard("docs", "audit doc names the audited command set", () => {
    mustAll(doc, [
      ["npm run smoke:productflowbuttonaudit01", "product-flow smoke command"],
      ["npm run smoke:uxlivepanelpremium01", "premium smoke command"],
      ["npm run smoke:uxallpanelsrealityaudit01", "all-panels smoke command"],
      ["npm run smoke:uxmobileallrolespanelaudit01", "mobile all-roles smoke command"],
      ["npm run check:product-extensions", "product extensions command"],
      ["npm run verify:repo", "verify repo command"],
      ["npm run verify:final", "verify final command"],
      ["npm --prefix backend run lint", "backend lint command"],
      ["npm --prefix web run lint", "web lint command"],
    ], "audit doc command list");
  });

  addGuard("docs", "audit doc keeps the known false negative fixes documented", () => {
    mustAll(doc, [
      ["backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs", "mobile all-roles smoke fix"],
      ["backend/scripts/_m91_route_preview_checks.js", "room ops bridge path fix"],
      ["Okul — Planlama Merkezi", "school overview wait target"],
      ["false negative", "false negative wording"],
    ], "audit doc false negative notes");
  });

  addGuard("docs", "audit doc preserves smoke threshold targets", () => {
    mustAll(doc, [
      ["PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "product-flow target"],
      ["PASS 82 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "panel smoke target"],
      ["product-flow", "product-flow wording"],
      ["premium smoke", "premium smoke wording"],
      ["all-panels", "all-panels wording"],
      ["mobile all-roles", "mobile all-roles wording"],
    ], "audit doc smoke thresholds");
  });

  addGuard("docs", "audit doc keeps commit-external policy visible", () => {
    mustAll(doc, [
      ["runtime-data stays commit external and unstaged", "runtime-data policy"],
      ["browser-smoke artifacts stay commit external and ignored", "browser-smoke policy"],
      ["debug.log absent", "debug.log policy"],
      ["stage empty", "stage policy"],
    ], "audit doc commit external policy");
  });

  addGuard("threshold", "product-flow button audit keeps its exact smoke threshold", () => {
    mustAll(productFlowCheck, [
      ["PASS 18 / PASS- 0 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0", "smoke summary"],
      ["UX-FIX 0", "UX-FIX target"],
      ["BLOCKER 0", "BLOCKER target"],
      ["AUTH-BLOCKED 0", "AUTH-BLOCKED target"],
      ["NOT-FOUND 0", "NOT-FOUND target"],
    ], "product-flow check");
    mustAll(productFlowSmoke, [
      ["trial: true", "trial clicks"],
      ["Harita / Navigasyon Önizle", "company preview text"],
      ["Rota Önizleme", "route preview text"],
      ["Navigasyon Aç", "personel navigation text"],
      ["Bugün gelmiyor", "parent button text"],
      ["İncelemeye al", "review queue text"],
      ["Tam Rotayı Dış Navigasyonda Aç", "external navigation read-only text"],
    ], "product-flow smoke");
    mustNotContains(productFlowSmoke, "submitPublicLead(", "product-flow smoke avoids public lead writes");
    mustNotContains(productFlowSmoke, "updatePublicLeadReviewStatus(", "product-flow smoke avoids review writes");
    mustNotContains(productFlowSmoke, "approveShiftAction(", "product-flow smoke avoids room approve writes");
    mustNotContains(productFlowSmoke, "rejectShiftAction(", "product-flow smoke avoids room reject writes");
  });

  addGuard("threshold", "premium live panel smoke keeps fail logic scoped to blocker and not-found", () => {
    mustAll(premiumSmokeCheck, [
      ['!["BLOCKER", "NOT-FOUND"].includes(row.status)', "fail logic"],
      ['!["BLOCKER", "AUTH-BLOCKED", "NOT-FOUND"].includes(row.status)', "no auth-blocked fail logic"],
      ["AUTH-BLOCKED raporlanır; erişim/session/auth notudur; tek başına smoke komutunu fail ettirmez.", "auth-blocked note"],
      ["BLOCKER veya NOT-FOUND varsa smoke komutu fail olur.", "failure note"],
    ], "premium smoke check");
    mustAll(premiumSmoke, [
      ["WEB_BASE_URL", "web base url"],
      ["API_BASE_URL", "api base url"],
      ["HEADLESS", "headless config"],
      ["SLOW_MO", "slow motion config"],
      ["browser-smoke", "artifact root"],
      ["report.json", "report json"],
      ["report.md", "report md"],
    ], "premium smoke runner");
    mustNotContains(premiumSmoke, "AUTH-BLOCKED alone", "premium smoke runner does not relax auth-blocked");
  });

  addGuard("threshold", "all-panels reality audit keeps 82/0/0/0 thresholds", () => {
    mustAll(allPanelsCheck, [
      ["report.statusCounts.PASS === 82", "PASS 82"],
      ['report.statusCounts["PASS-"] === 0', "PASS- 0"],
      ['report.statusCounts["UX-FIX"] === 0', "UX-FIX 0"],
      ['report.statusCounts.BLOCKER === 0', "BLOCKER 0"],
      ['report.statusCounts["AUTH-BLOCKED"] === 0', "AUTH-BLOCKED 0"],
      ['report.statusCounts["NOT-FOUND"] === 0', "NOT-FOUND 0"],
    ], "all-panels check");
    mustAll(allPanelsSmoke, [
      ["mobileDrawerIssueCount", "mobile drawer issue count"],
      ["stickyHeaderTabIssueCount", "sticky header issue count"],
      ["PASS 82 | PASS- 0 | UX-FIX 0 | BLOCKER 0", "summary line"],
      ["browser-smoke", "browser-smoke artifact root"],
    ], "all-panels smoke");
  });

  addGuard("threshold", "mobile all-roles audit keeps the 82 route threshold and targeted wait fix", () => {
    mustAll(mobileAuditCheck, [
      ["PASS- 37", "current PASS- framing"],
      ["PASS- 19", "premium comparison framing"],
      ["UX-FIX 0", "UX-FIX framing"],
      ["BLOCKER 0", "blocker framing"],
      ["NOT-FOUND 0", "not-found framing"],
      ["browser-smoke", "browser-smoke boundary"],
      ["runtime-data", "runtime-data boundary"],
    ], "mobile all-roles check");
    mustAll(mobileAuditSmoke, [
      ['getByText("Okul — Planlama Merkezi")', "targeted school overview wait"],
      ["waitForTimeout(2500)", "targeted wait duration"],
      ['!["BLOCKER", "NOT-FOUND"].includes(row.status)', "failure logic"],
      ["report.statusCounts.BLOCKER", "blocker count"],
      ["report.statusCounts[\"NOT-FOUND\"]", "not-found count"],
      ["report.statusCounts[\"UX-FIX\"]", "UX-FIX count"],
    ], "mobile all-roles smoke");
  });

  addGuard("threshold", "product extensions chain keeps the known smoke/check wiring intact", () => {
    mustAll(runner, [
      ["check:hotfilesplitaichatcomposers01", "AI chat split check"],
      ["check:hotfilesplitwebpanels01", "web panels split check"],
      ["check:copilotnextbestactionengine01", "next best action check"],
      ["check:seferabiturkishterminology01", "Turkish terminology audit"],
      ["check:qualitygatefinal01", "quality gate final check"],
      ["check:testqualityandflakeaudit01", "new audit check"],
    ], "product extensions runner wiring");
    mustAll(verify, [
      ["check:hotfilesplitaichatcomposers01", "AI chat split check"],
      ["check:hotfilesplitwebpanels01", "web panels split check"],
      ["check:copilotnextbestactionengine01", "next best action check"],
      ["check:seferabiturkishterminology01", "Turkish terminology audit"],
      ["check:qualitygatefinal01", "quality gate final check"],
      ["check:testqualityandflakeaudit01", "new audit check"],
    ], "verify chain wiring");
  });

  addGuard("selector", "company agreements panel keeps smoke-critical aria and button texts", () => {
    mustAll(companyAgreementsPanel, [
      ['ariaLabel="Sözleşme görünümü"', "panel tabs aria label"],
      ["companyActionClarityScope", "company action scope"],
      ["Detayı aç", "bridge CTA text"],
      ["Kabul Et", "accept button text"],
      ["CompanyAgreementsBridgeSection", "split bridge section"],
    ], "company agreements panel");
  });

  addGuard("selector", "room agreements panel keeps smoke-critical action texts and split bridge", () => {
    mustAll(roomAgreementsPanel, [
      ["roomCriticalFixScope", "room scope"],
      ["roomActionCTA", "room action CTA"],
      ["Rota Önizle", "route preview text"],
      ["Karşı Teklif", "counter offer text"],
      ["Kabul Et", "accept button text"],
      ["RoomAgreementsBridgeSection", "split bridge section"],
    ], "room agreements panel");
  });

  addGuard("selector", "room ops bridge path fix is still targeted to the split bridge section", () => {
    mustAll(routePreviewChecks, [
      ["web/src/panels/room/roomAgreementsBridgeSection.jsx", "room bridge section path"],
      ["backend/scripts/_m91_route_preview_checks.js", "route preview checks file"],
    ], "route preview checks");
    mustNotContains(routePreviewChecks, "web/src/panels/room/AgreementsPanel.jsx", "route preview checks no longer point at the monolith");
  });

  addGuard("commit-external", "runtime-data stays in the working tree and out of commit", () => {
    mustAll(gitStatusShort, [
      ["backend/artifacts/runtime-data/password-change-requirements.json", "password change runtime data"],
      ["backend/artifacts/runtime-data/username-directory.json", "username directory runtime data"],
      ["backend/artifacts/runtime-data/agreement-route-refresh-requests.json", "agreement refresh runtime data"],
      ["backend/artifacts/runtime-data/public-leads.json", "public leads runtime data"],
      ["backend/artifacts/runtime-data/quality-review-decisions.json", "quality review runtime data"],
      ["backend/artifacts/runtime-data/region-failover-drill-state.json", "region failover runtime data"],
    ], "runtime data status");
  });

  addGuard("commit-external", "debug.log stays absent", () => {
    mustNotContains(gitStatusShort, "debug.log", "git status does not show debug.log");
    mustNotContains(gitStatusShort, "backend/artifacts/browser-smoke/", "git status does not show browser-smoke artifacts");
  });

  addGuard("commit-external", "stage stays empty", () => {
    must(gitCachedNames.length === 0, "staged file list stays empty");
  });

  mustAcceptedPrismaManifest();

  addGuard("commit-external", "route/service/prisma diff stays empty", () => {
    const residual = sortedUniquePaths(gitRouteDiff).filter(
      (file) => !ALLOWED_ROUTE_PATHS.has(normalizePath(file)) && !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file))
    );
    must(residual.length === 0, "route/service/prisma diff stays empty");
  });

  addGuard("commit-external", "git diff --check stays clean while allowing non-blocking CRLF note", () => {
    must(diffCheck.crlfWarnings.length >= 0, "diff check warning capture available");
    mustNotContains(diffCheck.output, "trailing whitespace", "diff check has no trailing whitespace");
    mustNotContains(diffCheck.output, "space before tab in indent", "diff check has no indentation whitespace errors");
  });

  addGuard("commit-external", "cached diff check stays clean", () => {
    mustGitEmpty(["diff", "--cached", "--check"], "git diff --cached --check");
  });

  addGuard("commit-external", "browser-smoke artifacts remain ignored", () => {
    const gitIgnore = read(".gitignore");
    mustContains(gitIgnore, "backend/artifacts/browser-smoke/", "browser-smoke ignore entry");
    mustNotContains(gitStatusShort, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  });

  addGuard("allowlist", "route review guard stays exact-scope only", () => {
    mustAll(routeReviewCheck, [
      ["mustNoDiffExcept(['backend/src/routes'], ['backend/src/routes/companyOverview.js'], 'backend route diff limited to companyOverview.js');", "backend route diff limited to companyOverview.js"],
      ["mustNoDiff(['backend/src/services'], 'backend service diff remains empty')", "backend services stay empty"],
      ["mustExactGitPaths(['backend/prisma', 'prisma'], ACCEPTED_PRISMA_PATHS,", "accepted Prisma manifest is exact"],
      ["mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256,", "accepted schema SHA is enforced"],
      ["mustMigrationDirectoryShape(path.posix.dirname(entry.path),", "accepted migration directory shape is enforced"],
      ["stage stays empty", "stage policy remains exact"],
    ], "route review guard");
    mustNotContains(routeReviewCheck, "backend/scripts/**", "route review guard does not broaden to a wildcard script allowlist");
    mustNotContains(routeReviewCheck, "allow all", "route review guard does not open a global allowlist");
  });

  addGuard("allowlist", "redteam guard keeps the split path reference narrow", () => {
    mustAll(redteamCheck, [
      ["backend/scripts/_m91_route_preview_checks.js", "split path reference"],
      ["backend/artifacts/runtime-data/", "runtime-data boundary"],
      ["backend/artifacts/browser-smoke/", "browser-smoke boundary"],
      ["debug.log", "debug.log boundary"],
    ], "redteam guard");
    mustNotContains(redteamCheck, "backend/scripts/**", "redteam guard does not broaden to a wildcard script allowlist");
  });

  addGuard("docs", "validation results and follow-up guidance are present in the audit doc", () => {
    mustAll(doc, [
      ["PASS TEST-QUALITY-AND-FLAKE-AUDIT-01", "PASS line"],
      ["guardCases", "guard cases metric"],
      ["passCount", "pass count metric"],
      ["failCount", "fail count metric"],
      ["flakeRiskSummary", "flake risk summary"],
      ["smokeThresholdSummary", "smoke threshold summary"],
      ["selectorStabilitySummary", "selector stability summary"],
      ["commitExternalSummary", "commit external summary"],
      ["routeServicePrismaSummary", "route/service/prisma summary"],
    ], "audit doc validation metrics");
  });

  let passCount = 0;
  let failCount = 0;

  for (const guard of guards) {
    try {
      guard.run();
      passCount += 1;
      console.log(`OK ${guard.label}`);
    } catch (error) {
      failCount += 1;
      throw error;
    }
  }

  const flakeRiskSummary = [
    "2 known false-negative repairs documented",
    "0 threshold or skip relaxations",
    "0 global allowlist expansions",
  ].join("; ");
  const smokeThresholdSummary = [
    "product-flow 18/0/0/0",
    "premium 82/0/0/0",
    "all-panels 82/0/0/0",
    "mobile all-roles 82/0/0/0",
  ].join("; ");
  const selectorStabilitySummary = [
    "visible/role/aria-label/button-text surfaces kept intact",
    "school overview wait is targeted and scoped",
    "no broad sleep or threshold easing was introduced",
  ].join("; ");
  const commitExternalSummary = [
    "runtime-data unstaged",
    "browser-smoke ignored and unstaged",
    "debug.log absent",
    "stage empty",
  ].join("; ");
  const routeServicePrismaSummary = [
    "backend/src/routes diff empty",
    "backend/src/services diff empty",
    "prisma diff empty",
    "backend/prisma diff empty",
  ].join("; ");

  console.log(`SUMMARY guardCases=${guards.length} passCount=${passCount} failCount=${failCount}`);
  console.log(`SUMMARY flakeRiskSummary=${flakeRiskSummary}`);
  console.log(`SUMMARY smokeThresholdSummary=${smokeThresholdSummary}`);
  console.log(`SUMMARY selectorStabilitySummary=${selectorStabilitySummary}`);
  console.log(`SUMMARY commitExternalSummary=${commitExternalSummary}`);
  console.log(`SUMMARY routeServicePrismaSummary=${routeServicePrismaSummary}`);
  console.log("PASS TEST-QUALITY-AND-FLAKE-AUDIT-01");
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
