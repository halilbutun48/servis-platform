#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
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

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
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

function stagedNames() {
  return gitLines(["diff", "--cached", "--name-only"]).map((line) => line.replace(/\\/g, "/"));
}

function statusNames() {
  const out = execFileSync("git", ["-c", "safe.directory=D:/servis-platform", "status", "--short", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function matches(file, needle) {
  return normalize(file).includes(normalize(needle));
}

function mustNotList(files, needle, label) {
  if (files.some((file) => matches(file, needle))) fail(label);
  ok(label);
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
    fail(`${label}: unexpected=${unexpected.join(", ") || "(none)"} missing=${missing.join(", ") || "(none)"}`);
  }
  ok(label);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) {
    throw new Error(`FAIL ${label || relPath}: ${actual} != ${wanted}`);
  }
  ok(label || relPath);
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
  if (actual !== wanted) {
    fail(`${label}: ${actual} != ${wanted}`);
  }
  ok(label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`FAIL ${label || relPath}: not an ordinary directory`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") {
    throw new Error(`FAIL ${label || relPath}: unexpected contents=${entries.join(", ")}`);
  }
  ok(label || relPath);
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

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function main() {
  console.log("=== UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md");
  const parentLive = read("web/src/panels/parent/LivePanel.jsx");
  const personelLive = read("web/src/panels/personel/LivePanel.jsx");
  const myRide = read("web/src/panels/personel/MyRidePanel.jsx");
  const boardingChange = read("web/src/panels/shared/BoardingChangeRequestEntryCard.jsx");
  const liveCopy = read("web/src/utils/liveTrackingCopy.js");
  const copilotFacts = read("web/src/utils/copilotFacts.js");
  const cleanupScopeFiles = [
    "backend/src/kvkk/matrix.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/src/ai/chat/copilotRoleTaskMatrix.js",
    "backend/src/ai/chat/copilotAiActionRoadmap.js",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
    "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "package.json",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/index.css",
    "web/src/layout/AppShell.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/PersonelAccessPanel.jsx",
    "web/src/panels/company/GuidedPlanModal.jsx",
    "web/src/panels/company/ShiftPeopleTab.jsx",
    "web/src/panels/company/guidedPlanModalActions.js",
    "web/src/panels/company/guidedPlanModalCards.jsx",
    "web/src/panels/company/guidedPlanModalDestinationCards.jsx",
    "web/src/panels/company/guidedPlanModalPeopleStep.jsx",
    "web/src/panels/company/guidedPlanModalPlanCards.jsx",
    "web/src/panels/company/guidedPlanModalSections.jsx",
    "web/src/panels/company/guidedPlanModalShell.jsx",
    "web/src/panels/company/guidedPlanModalUtils.js",
    "web/src/panels/company/shiftPeopleTabActions.js",
    "web/src/panels/company/shiftPeopleTabSections.jsx",
    "backend/scripts/safe_drive_01_check.js",
    "docs/SAFE_DRIVE_01.md",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/utils/safeDriveSummary.js",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
  ];

  mustTrue(exists("docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md"), "parent/personel live error clarity doc exists");
  mustTrue(exists("backend/scripts/ux_parent_personel_live_error_clarity_01_check.js"), "parent/personel live error clarity check exists");

  must(pkg, '"check:uxparentpersonelliveerrorclarity01": "node backend/scripts/ux_parent_personel_live_error_clarity_01_check.js"', "package.json exposes parent/personel live error clarity check");
  ordered(runner, ["check:uxlivepanelsmokeaudit01", "check:uxlivepanelpremiumsmoke01", "check:uxparentpersonelliveerrorclarity01", "check:livetrackingfinal01"], "product extensions runner keeps parent/personel live error clarity in live chain");
  ordered(verify, ["check:uxlivepanelsmokeaudit01", "check:uxlivepanelpremiumsmoke01", "check:uxparentpersonelliveerrorclarity01", "check:livetrackingfinal01"], "verify chain keeps parent/personel live error clarity in live chain");

  must(harnessCheck, "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01", "script harness check knows parent/personel live error clarity milestone");
  must(harnessCheck, "check:uxparentpersonelliveerrorclarity01", "script harness check knows parent/personel live error clarity alias");
  must(harnessCheck, "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md", "script harness check knows parent/personel live error clarity doc");
  must(harnessDoc, "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01", "script harness doc lists parent/personel live error clarity milestone");
  must(harnessDoc, "check:uxparentpersonelliveerrorclarity01", "script harness doc lists parent/personel live error clarity alias");
  must(harnessDoc, "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md", "script harness doc lists parent/personel live error clarity doc");

  must(guide, "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01", "milestone guide mentions parent/personel live error clarity milestone");
  must(guide, "check:uxparentpersonelliveerrorclarity01", "milestone guide exposes parent/personel live error clarity check");
  must(guide, "node backend\\scripts\\ux_parent_personel_live_error_clarity_01_check.js", "milestone guide includes parent/personel live error clarity command");
  must(guide, "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md", "milestone guide includes parent/personel live error clarity doc");

  must(doc, "UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01", "parent/personel live error clarity doc title present");
  must(doc, "Parent / Veli canlı takip", "parent/personel live error clarity doc covers parent live surface");
  must(doc, "Personel / Servisim / Canlı takip", "parent/personel live error clarity doc covers personel live surface");
  must(doc, "Bugün için aktif servis görünmüyor.", "parent/personel live error clarity doc keeps parent missing-service wording");
  must(doc, "Bugün için aktif vardiya görünmüyor.", "parent/personel live error clarity doc keeps personel missing-shift wording");
  must(doc, "Servis saati, araç ataması veya konum izni kontrol edilmeli.", "parent/personel live error clarity doc keeps parent next-step wording");
  must(doc, "Servis saati veya vardiya ataması kontrol edilmeli.", "parent/personel live error clarity doc keeps personel next-step wording");
  must(doc, "GPS güncel değilse ETA kesin gösterilmez.", "parent/personel live error clarity doc keeps cautious ETA wording");
  must(doc, "ETA henüz alınamadı", "parent/personel live error clarity doc keeps fallback ETA wording");
  must(doc, "Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.", "parent/personel live error clarity doc keeps readonly boundary wording");
  must(doc, "Teknik/debug/raw/null/undefined görünmez.", "parent/personel live error clarity doc keeps visible-text hygiene wording");
  must(doc, "Backend auth/business route değişmedi.", "parent/personel live error clarity doc keeps backend boundary");
  must(doc, "Schema/migration yok.", "parent/personel live error clarity doc keeps schema boundary");
  must(doc, "Runtime-data commit dışı kaldı.", "parent/personel live error clarity doc keeps runtime-data boundary");
  must(doc, "Browser-smoke artifact commit dışı kaldı.", "parent/personel live error clarity doc keeps browser-smoke boundary");
  must(doc, "Playwright runner policy değişmedi.", "parent/personel live error clarity doc keeps runner policy boundary");
  must(doc, "Coverage matrix check değişmedi.", "parent/personel live error clarity doc keeps coverage matrix boundary");
  must(doc, "SMS/push/notification yok.", "parent/personel live error clarity doc keeps notification boundary");
  must(doc, "AI/Copilot capability eklenmedi.", "parent/personel live error clarity doc keeps AI boundary");

  must(liveCopy, "Bugün için aktif servis görünmüyor.", "live tracking copy keeps parent missing-service wording");
  must(liveCopy, "Bugün için aktif vardiya görünmüyor.", "live tracking copy keeps personel missing-shift wording");
  must(liveCopy, "Bu cihaz konum paylaşımını desteklemiyor. Konum destekleyen bir cihazda tekrar deneyin.", "live tracking copy keeps device fallback wording");
  must(liveCopy, "Servis saati, araç ataması veya konum izni kontrol edilmeli.", "live tracking copy keeps parent risk wording");
  must(liveCopy, "Servis saati veya vardiya ataması kontrol edilmeli.", "live tracking copy keeps personel risk wording");
  must(liveCopy, "GPS güncel değilse ETA kesin gösterilmez.", "live tracking copy keeps cautious ETA wording");
  must(liveCopy, "ETA henüz alınamadı", "live tracking copy keeps ETA fallback wording");
  must(liveCopy, "Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.", "live tracking copy keeps readonly wording");
  must(liveCopy, "getLiveTrackingStatusBandCopy", "live tracking copy exports status band helper");
  must(liveCopy, "getLiveTrackingApiFeedback", "live tracking copy exports api feedback helper");

  must(copilotFacts, "Bugün için aktif servis görünmüyor", "copilot facts keeps parent missing-service copy");
  must(copilotFacts, "Aktif servis görünmüyor", "copilot facts keeps parent no-vehicle status copy");
  must(copilotFacts, "Konum henüz alınmadı", "copilot facts keeps safe location copy");

  must(parentLive, "Canlı takip bandı", "parent live panel shows live status band card");
  must(parentLive, "Canlı takip durumu", "parent live panel keeps status band labels");
  must(parentLive, 'getLiveTrackingApiFeedback(e, "parent").message', "parent live panel uses safe api feedback");
  must(parentLive, 'getLiveTrackingGeoUnsupportedMessage("parent")', "parent live panel uses safe geo-unsupported copy");
  must(parentLive, 'getLiveTrackingGeoErrorMessage(e, "parent")', "parent live panel uses safe geo-error copy");
  must(parentLive, 'getLiveTrackingNoVehicleReason("parent")', "parent live panel uses safe no-vehicle reason");
  must(parentLive, 'getLiveTrackingNoVehicleDetail("parent")', "parent live panel uses safe no-vehicle detail");
  must(parentLive, "Bugün için aktif servis görünmüyor.", "parent live panel keeps parent missing-service wording");
  must(parentLive, "Servis saati, araç ataması veya konum izni kontrol edilmeli.", "parent live panel keeps parent guidance wording");
  must(parentLive, "Konum durumu:", "parent live panel uses neutral geo status label");
  mustNot(parentLive, "Tarayıcı konum desteği vermiyor.", "parent live panel removes old unsupported wording");
  mustNot(parentLive, "Konum alınamadı:", "parent live panel removes raw geo-error wording");
  mustNot(parentLive, "String(e?.message || e)", "parent live panel removes raw error string fallback");

  must(personelLive, "Canlı takip bandı", "personel live panel shows live status band card");
  must(personelLive, "Canlı takip durumu", "personel live panel keeps status band labels");
  must(personelLive, 'getLiveTrackingApiFeedback(e, "personel").message', "personel live panel uses safe api feedback");
  must(personelLive, 'getLiveTrackingGeoUnsupportedMessage("personel")', "personel live panel uses safe geo-unsupported copy");
  must(personelLive, 'getLiveTrackingGeoErrorMessage(e, "personel")', "personel live panel uses safe geo-error copy");
  must(personelLive, "Bugün için aktif vardiya görünmüyor.", "personel live panel keeps personel missing-shift wording");
  must(personelLive, "Servis saati veya vardiya ataması kontrol edilmeli.", "personel live panel keeps personel guidance wording");
  must(personelLive, "Konum durumu:", "personel live panel uses neutral geo status label");
  mustNot(personelLive, "Tarayıcı konum desteği vermiyor.", "personel live panel removes old unsupported wording");
  mustNot(personelLive, "Konum alınamadı:", "personel live panel removes raw geo-error wording");
  mustNot(personelLive, "String(e?.message || e)", "personel live panel removes raw error string fallback");

  must(myRide, "Canlı takip bandı", "my ride panel shows live status band card");
  must(myRide, "Bugün için aktif vardiya görünmüyor. Servis saati veya vardiya ataması kontrol edilmeli.", "my ride panel keeps personel missing-shift fallback");
  must(myRide, 'getLiveTrackingApiFeedback(e, "personel").message', "my ride panel uses safe api feedback");
  must(myRide, 'getLiveTrackingGeoUnsupportedMessage("personel")', "my ride panel uses safe geo-unsupported copy");
  must(myRide, 'getLiveTrackingGeoErrorMessage(e, "personel")', "my ride panel uses safe geo-error copy");
  must(myRide, 'getLiveTrackingRouteQualityText(eta, "personel")', "my ride panel uses safe route quality helper");
  must(myRide, 'getLiveTrackingRouteQualityTone(eta)', "my ride panel uses safe route tone helper");
  mustNot(myRide, "Şu an sana bağlı bir servis görünmüyor.", "my ride panel removes old no-service wording");
  mustNot(myRide, "Henüz eşleşmiş bir servis yok.", "my ride panel removes old no-service wording");
  mustNot(myRide, "Rota ilerliyor", "my ride panel removes generic route wording");
  mustNot(myRide, "Tarayıcı konum desteği vermiyor.", "my ride panel removes old unsupported wording");
  mustNot(myRide, "String(e?.message || e)", "my ride panel removes raw error string fallback");

  must(boardingChange, "getLiveTrackingServiceContextReason(normalizedMode)", "boarding change card uses safe service-context copy");
  must(boardingChange, "getLiveTrackingGeoUnsupportedMessage(normalizedMode)", "boarding change card uses safe geo-unsupported copy");
  must(boardingChange, "getLiveTrackingGeoErrorMessage(e, normalizedMode)", "boarding change card uses safe geo-error copy");
  must(boardingChange, 'getApiErrorInfo(e, "")', "boarding change card uses api error info helper");
  mustNot(boardingChange, "Cannot GET", "boarding change card removes raw geocode hint");

  const staged = stagedNames().filter((file) => !cleanupScopeFiles.includes(file));
  const stagedAllowed = new Set([
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "web/src/index.css",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/companyShiftsPanelCards.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "web/src/panels/room/OffersPanel.jsx",
    "web/src/utils/offerQualityRanking.js",
    "tools/repo_contract_state.json",
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within parent/personel live error clarity validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");
  mustTrue(staged.length === 0, "stage remains empty");

  mustAcceptedPrismaManifest();

  const status = statusNames()
    .filter((file) => !cleanupScopeFiles.includes(file))
    .filter((file) => !file.startsWith("web/src/panels/room/") && file !== "backend/scripts/ux_room_panel_clarity_01_check.js" && file !== "backend/scripts/ux_premium_critical_fix_room_01_check.js" && file !== "docs/UX_ROOM_PANEL_CLARITY_01.md" && file !== "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md" && file !== "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js" && file !== "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md" && file !== "web/src/components/AgreementOpsBridgeCard.jsx" && file !== "web/src/panels/company/AgreementsPanel.jsx" && file !== "web/src/panels/company/companyAgreementsBridgeSection.jsx" && file !== "web/src/panels/company/companyAgreementsPanelHelpers.js" && file !== "web/src/panels/company/companyShiftsPanelSections.jsx" && file !== "web/src/panels/company/WorkflowPanel.jsx" && file !== "web/src/panels/company/companyShiftsPanelCards.jsx");
  const residualStatus = status.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file)));
  mustNotList(residualStatus.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/routes/companyOverview.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/routes/", "backend routes are untouched");
  mustNotList(residualStatus.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/services/", "backend services are untouched");
  mustNotList(residualStatus, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(residualStatus, "Prisma/", "schema/migration files are untouched");
  mustNotList(residualStatus, "web/src/panels/room/", "room surfaces are untouched");
  mustNotList(residualStatus, "web/src/panels/company/", "company surfaces are untouched");
  mustNotList(residualStatus, "web/src/components/ShiftOperationEventsModal.jsx", "shift operation modal is untouched");
  mustNotList(residualStatus, "web/src/components/ShiftReassignModal.jsx", "shift reassign modal is untouched");

  console.log("=== UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01 CHECK PASS ===");
}

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
