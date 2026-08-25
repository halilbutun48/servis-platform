#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { assertProductExtensionsIncludes, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, mustDiffEmptyOrExactlyWithIdentity, mustStatusEmptyOrExactlyWithIdentity } from "./lib/guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");
const CURRENT_HEAD_APPROVED_TRACKED_BACKEND_DIFF = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) => path.startsWith("backend/src/routes/") || path.startsWith("backend/src/services/"));

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
  const out = execFileSync("git", args, {
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
  const out = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
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

function mustNotList(files, needle, label) {
  if (files.some((file) => normalize(file).includes(normalize(needle)))) fail(label);
  ok(label);
}

function normalizePath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .trim();
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedUniquePaths(paths) {
  return [...new Set(paths.map((text) => normalizePath(text)))].sort(compareText);
}

function gitStatusEntries(paths) {
  const out = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "--", ...paths], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
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
    fail(
      `${label}: ${[
        unexpected.length > 0 ? `unexpected=${unexpected.join(", ")}` : "",
        missing.length > 0 ? `missing=${missing.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("; ")}`
    );
  }
  ok(label);
}

function fileSha256(relPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relPath))).digest("hex").toUpperCase();
}

function mustFileSha256(relPath, expectedHash, label) {
  const actual = fileSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) fail(`${label}: ${actual} != ${wanted}`);
  ok(label);
}

function normalizedTextSha256(relPath) {
  const bytes = fs.readFileSync(path.join(root, relPath));
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0d && (i === bytes.length - 1 || bytes[i + 1] !== 0x0a)) {
      fail(`${relPath}: bare CR`);
    }
  }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const normalized = text.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(Buffer.from(normalized, 'utf8')).digest('hex').toUpperCase();
}

function mustNormalizedTextSha256(relPath, expectedHash, label) {
  const actual = normalizedTextSha256(relPath);
  const wanted = String(expectedHash || "").toUpperCase();
  if (actual !== wanted) fail(`${label}: ${actual} != ${wanted}`);
  ok(label);
}

function mustMigrationDirectoryShape(relPath, label) {
  const absPath = path.join(root, relPath);
  const stat = fs.lstatSync(absPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`${label}: not an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") fail(`${label}: unexpected contents=${entries.join(", ")}`);
  ok(label);
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
const ACCEPTED_PRISMA_PATHS = ACCEPTED_PRISMA_FILES.map((entry) => entry.path);

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.posix.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function main() {
  console.log("=== UX-PREMIUM-CRITICAL-FIX-ROOM-01 CHECK ===");

  const pkg = read("package.json");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md");

  const shiftsPanel = read("web/src/panels/room/ShiftsPanel.jsx");
  const shiftsSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const agreementsPanel = read("web/src/panels/room/AgreementsPanel.jsx");
  const driversPanel = read("web/src/panels/room/DriversPanel.jsx");
  const statusTable = read("web/src/panels/room/RoomDriversStatusTable.jsx");
  const shiftsTable = read("web/src/panels/room/RoomDriversShiftsTable.jsx");
  const editModal = read("web/src/panels/room/RoomDriversEditModal.jsx");
  const css = read("web/src/index.css");
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
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
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
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
    "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/dashboard_bulk_endpoint_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/src/kvkk/matrix.js",
    "backend/src/bootstrap/routeMounts.js",
    "backend/src/server.js",
    "backend/src/routes/dashboardBulk.js",
    "backend/src/services/dashboardBulk.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/DASHBOARD_BULK_ENDPOINT_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/SAFE_DRIVE_01.md",
    "package.json",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/index.css",
    "web/src/layout/AppShell.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/utils/dashboardBulk.js",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelWorkflow.js",
    "web/src/panels/room/roomVehiclesPanelActions.js",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
    "web/src/utils/safeDriveSummary.js",
  ];

  mustTrue(exists("backend/scripts/ux_premium_critical_fix_room_01_check.js"), "room critical fix check exists");
  mustTrue(exists("docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md"), "room critical fix doc exists");

  must(pkg, '"check:uxpremiumcriticalfixroom01": "node backend/scripts/ux_premium_critical_fix_room_01_check.js"', "package.json exposes room critical fix check");
  assertProductExtensionsIncludes("check:uxpremiumcriticalfixroom01", "product extensions registry includes room critical fix check", registryScripts);

  must(harnessCheck, "UX-PREMIUM-CRITICAL-FIX-ROOM-01", "script harness check knows room critical fix milestone");
  must(harnessCheck, "check:uxpremiumcriticalfixroom01", "script harness check knows room critical fix alias");
  must(harnessCheck, "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md", "script harness check knows room critical fix doc");
  must(harnessDoc, "UX-PREMIUM-CRITICAL-FIX-ROOM-01", "script harness doc lists room critical fix milestone");
  must(harnessDoc, "check:uxpremiumcriticalfixroom01", "script harness doc lists room critical fix alias");
  must(harnessDoc, "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md", "script harness doc lists room critical fix doc");

  must(guide, "UX-PREMIUM-CRITICAL-FIX-ROOM-01", "milestone guide mentions room critical fix milestone");
  must(guide, "check:uxpremiumcriticalfixroom01", "milestone guide exposes room critical fix check");
  must(guide, "node backend\\scripts\\ux_premium_critical_fix_room_01_check.js", "milestone guide includes room critical fix command");
  must(guide, "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md", "milestone guide includes room critical fix doc");

  must(doc, "UX-PREMIUM-CRITICAL-FIX-ROOM-01", "room critical fix doc title present");
  must(doc, "Room / Vardiyalar", "room critical fix doc covers shifts surface");
  must(doc, "Room / Sözleşmeler", "room critical fix doc covers agreements surface");
  must(doc, "Room / Sürücüler", "room critical fix doc covers drivers surface");
  must(doc, "Dispatch apply button not visible", "room critical fix doc tracks dispatch apply family");
  must(doc, "Detayı aç", "room critical fix doc tracks detail CTA family");
  must(doc, "hash copy", "room critical fix doc tracks hash cleanup family");
  must(doc, "roomCriticalFixScope", "room critical fix doc keeps room safe-area scope");
  must(doc, "roomActionCTA", "room critical fix doc keeps CTA scope");
  must(doc, "NavDock", "room critical fix doc keeps mobile intercept note");
  must(doc, "safe-area", "room critical fix doc keeps safe-area note");
  must(doc, "Sürücü kaydı", "room critical fix doc keeps safe driver wording");
  must(doc, "Düşük canlılık", "room critical fix doc keeps safe live wording");
  must(doc, "Çevrim dışı", "room critical fix doc keeps offline wording");
  must(doc, "Bu milestone yeni business flow eklemez.", "room critical fix doc keeps no-business-flow boundary");
  must(doc, "Backend route/write-path değişmez.", "room critical fix doc keeps backend boundary");
  must(doc, "Schema/migration yok.", "room critical fix doc keeps schema boundary");
  must(doc, "Runtime-data commit dışı kalır.", "room critical fix doc keeps runtime-data boundary");
  must(doc, "Browser-smoke artifact commit dışı kalır.", "room critical fix doc keeps browser artifact boundary");
  must(doc, "Playwright runner policy değişmez.", "room critical fix doc keeps runner boundary");
  must(doc, "Coverage matrix fail policy değişmez.", "room critical fix doc keeps coverage boundary");

  must(shiftsPanel, "roomCriticalFixScope", "room shifts panel uses room critical fix scope");
  must(shiftsSections, "showDispatchApplyAction = Boolean(data)", "room shifts dispatch action remains visible");
  must(shiftsSections, "roomActionCTA", "room shifts dispatch CTA uses room action class");
  must(shiftsSections, "Önizlemeyi Uygula: Böl & Onayla", "room shifts dispatch CTA label present");

  must(agreementsPanel, "roomCriticalFixScope", "room agreements panel uses room critical fix scope");
  must(agreementsPanel, "roomActionCTA", "room agreements detail CTA uses room action class");
  must(agreementsPanel, "Detayı aç", "room agreements detail CTA label present");

  must(driversPanel, "roomCriticalFixScope", "room drivers panel uses room critical fix scope");
  must(driversPanel, "roomDriverUiLabel", "room drivers panel keeps safe UI label helper");
  must(driversPanel, "Sürücü kaydı", "room drivers panel uses safe driver label");
  must(driversPanel, "Düşük canlılık", "room drivers panel uses safe live wording");
  must(driversPanel, "Çevrim dışı", "room drivers panel uses safe offline wording");
  must(driversPanel, "Kayıt", "room drivers panel uses safe table header");
  must(driversPanel, "uiLabel", "room drivers panel renders safe status label");
  mustNot(driversPanel, "Sürücü #", "room drivers panel removes visible hash copy");
  mustNot(driversPanel, "Sürücü #", "room drivers panel removes visible driver hash copy");

  must(statusTable, "Ad / kod", "room drivers status table uses safe filter placeholder");
  must(statusTable, "Düşük canlılık", "room drivers status table uses safe live wording");
  must(statusTable, "Çevrim dışı", "room drivers status table uses safe offline wording");
  must(statusTable, "Konum bekliyor", "room drivers status table uses safe waiting wording");
  must(statusTable, "Sürücü kaydı", "room drivers status table uses safe record label");
  must(statusTable, "Mevcut vardiya", "room drivers status table uses safe current shift wording");
  must(statusTable, "Sonraki vardiya", "room drivers status table uses safe next shift wording");
  mustNot(statusTable, "#${d.id}", "room drivers status table removes visible id hash copy");

  must(shiftsTable, "Mevcut", "room drivers shifts table keeps safe current header");
  must(shiftsTable, "Sonraki", "room drivers shifts table keeps safe next header");
  must(shiftsTable, "Sürücü kaydı", "room drivers shifts table uses safe record label");
  mustNot(shiftsTable, "#${d.id}", "room drivers shifts table removes visible id hash copy");

  must(editModal, "Sürücü kaydı", "room drivers edit modal uses safe backup label");
  mustNot(editModal, "(#", "room drivers edit modal removes id hash suffix");

  must(css, ".roomCriticalFixScope", "global css keeps room critical fix scope");
  must(css, ".roomActionCTA", "global css keeps room action cta scope");
  must(css, "z-index: 4305", "global css keeps room action z-index clearance");
  must(css, "scroll-margin-bottom: calc(220px + env(safe-area-inset-bottom))", "global css keeps room action scroll margin");
  must(css, "padding-bottom: calc(240px + env(safe-area-inset-bottom))", "global css keeps room mobile bottom clearance");
  must(css, "padding-bottom: calc(200px + env(safe-area-inset-bottom))", "global css keeps room mid-size bottom clearance");

  const staged = stagedNames().filter((file) => !cleanupScopeFiles.includes(file));
  const stagedAllowed = new Set([
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
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
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/PRIMER_SSOT.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "tools/repo_contract_state.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "package.json",
    "web/src/index.css",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
    "web/src/copilot/screenRegistry.js",
    "web/src/layout/NavDock.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within room critical fix validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames().filter((file) => !cleanupScopeFiles.includes(file));
  mustStatusEmptyOrExactlyWithIdentity(
    ["backend/src/routes", "backend/src/services"],
    CURRENT_HEAD_APPROVED_TRACKED_BACKEND_DIFF,
    "backend route/service status stays within approved current-head scope"
  );
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustAcceptedPrismaManifest();
  mustNotList(status, "web/src/panels/company/DriversPanel.jsx", "company drivers panel is untouched");
  mustNotList(status, "web/src/panels/company/VehiclesPanel.jsx", "company vehicles panel is untouched");
  mustNotList(status, "web/src/panels/company/MapPanel.jsx", "company map panel is untouched");
  mustNotList(status, "web/src/panels/company/CheckinPanel.jsx", "company check-in panel is untouched");
  mustNotList(status, "web/src/panels/company/OffersPanel.jsx", "company offers panel is untouched");
  mustNotList(status, "web/src/panels/parent/", "parent surfaces are untouched");
  mustNotList(status, "web/src/panels/personel/", "personel surfaces are untouched");
  const superadminStatus = status.filter((file) =>
    file !== "web/src/panels/superadmin/SuperAdminPanel.jsx" &&
    file !== "web/src/panels/superadmin/TelematicsHubPanel.jsx" &&
    file !== "web/src/panels/superadmin/TrustQualityPanel.jsx"
  );
  mustNotList(superadminStatus, "web/src/panels/superadmin/", "superadmin surfaces are untouched");
  mustNotList(status, "web/src/panels/driver/CheckinPanel.jsx", "driver check-in surface is untouched");
  mustNotList(status, "web/src/panels/driver/RoutePanel.jsx", "driver route surface is untouched");
  mustNotList(status, "web/src/panels/driver/TodayPanel.jsx", "driver today surface is untouched");
  mustNotList(status, "web/src/panels/room/VehiclesPanel.jsx", "room vehicles surface is untouched");
  mustNotList(status, "web/src/panels/room/roomVehiclesPanel", "room vehicles helpers are untouched");
  mustNotList(status, "web/src/panels/shared/PanelKvkkHint.jsx", "shared KVKK hint is untouched");

  console.log("=== UX-PREMIUM-CRITICAL-FIX-ROOM-01 CHECK PASS ===");
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
