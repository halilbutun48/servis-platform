#!/usr/bin/env node

import crypto from "node:crypto";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, mustDiffEmptyOrExactlyWithIdentity } from "./lib/guardGitScope.js";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF_WITHOUT_COMMERCIAL_CORE_CHILDREN } from "./lib/currentHeadScopePolicy.js";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const reportJsonPath = path.join(
  root,
  "backend",
  "artifacts",
  "browser-smoke",
  "UX_LIVE_PANEL_PREMIUM_SMOKE_01",
  "report.json"
);

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

function must(cond, label) {
  if (!cond) fail(label);
  ok(label);
}

function mustTrue(cond, label) {
  must(Boolean(cond), label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
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

function mustNotList(files, needle, label) {
  if (files.some((file) => normalize(file).includes(normalize(needle)))) fail(label);
  ok(label);
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
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
    fail(`${label}: ${actual} != ${wanted}`);
  }
  ok(label);
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
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(`${label}: not an ordinary directory`);
  }
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") {
    fail(`${label}: unexpected contents=${entries.join(", ")}`);
  }
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
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_FILES.map((entry) => normalizePath(entry.path)));

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function evidenceBucket(row) {
  const notes = Array.isArray(row.notes) ? row.notes.map((note) => normalize(note)) : [];
  const hasNote = (needle) => notes.some((note) => note.includes(normalize(needle)));

  if (row.kind === "reviewQueue" && Number(row.checks?.reviewActionCount || 0) < 3) return "review-gap";
  if (row.kind === "routePreview" && row.checks?.compactRoutePreview === true) return "route-preview";
  if (row.kind === "commercialFlow" && hasNote("commercial flow accepted/applied bucket görünür")) return "commercial-bucket";
  if (row.kind === "dispatch" && row.checks?.dispatchApplyEnabled === true) return "dispatch";
  if (row.kind === "convertToAgreement" && row.checks?.convertedToAgreementDraft === true) return "convert-draft";
  if (row.kind === "liveMap" && row.route === "/#/parent/live" && (row.consoleErrors || []).length > 0) return "console-noise";
  if (row.kind === "liveMap" && row.route === "/#/company/map" && (row.consoleErrors || []).length > 0) return "console-noise";
  if (row.kind === "liveMap" && Number(row.scrollHeight || 0) > 3200) return "long-live-map";
  if (row.kind === "parentOverview" && (row.consoleErrors || []).length > 0) return "console-noise";
  return null;
}

function main() {
  console.log("=== UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md");
  const smokeAudit = read("backend/scripts/ux_live_panel_smoke_audit_01_check.js");
  const passMinus = read("backend/scripts/ux_smoke_pass_minus_evidence_01_check.js");

  const app = read("web/src/App.jsx");
  const appShell = read("web/src/layout/AppShell.jsx");
  const superadminAudit = read("web/src/panels/superadmin/AuditLogsPanel.jsx");
  const cameraQr = read("web/src/components/checkin/CameraQrScannerCard.jsx");
  const driverCheckin = read("web/src/panels/driver/CheckinPanel.jsx");
  const driverRoute = read("web/src/panels/driver/RoutePanel.jsx");
  const roomShiftsPanel = read("web/src/panels/room/ShiftsPanel.jsx");
  const roomShiftsPanelSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const roomAgreements = read("web/src/panels/room/AgreementsPanel.jsx");
  const agreementOpsBridge = read("web/src/components/AgreementOpsBridgeCard.jsx");
  const roomVehiclesPanel = read("web/src/panels/room/VehiclesPanel.jsx");
  const roomVehiclesCards = read("web/src/panels/room/roomVehiclesPanelCards.jsx");
  const roomVehiclesSections = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
  const roomDriversPanel = read("web/src/panels/room/DriversPanel.jsx");
  const roomDriversStatus = read("web/src/panels/room/RoomDriversStatusTable.jsx");
  const roomDriversShifts = read("web/src/panels/room/RoomDriversShiftsTable.jsx");
  const roomDriversEdit = read("web/src/panels/room/RoomDriversEditModal.jsx");
  const companyAgreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
  const companyAgreementsOverview = read("web/src/panels/company/companyAgreementsOverviewSection.jsx");
  const companyAgreementsSource = read("web/src/panels/company/companyAgreementsSourceShiftSection.jsx");
  const etaSanity = read("web/src/utils/etaSanity.js");

  const cleanupScopeFiles = [
    "backend/src/kvkk/matrix.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
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
    "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
    "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js",
    "backend/src/ai/chat/answerQualityPolicy.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/intentRouter.js",
    "backend/src/ai/chat/intentRouterCore.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "backend/scripts/sefer_abi_terminal_humanize_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/SAFE_DRIVE_01.md",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
      "docs/PRIMER_SSOT.md",
      "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
      "package.json",
      "backend/scripts/invite_based_membership_01_check.js",
      "backend/scripts/onboarding_review_final_audit_01_check.js",
      "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
      "backend/scripts/run_product_extensions_check_chain.js",
      "backend/scripts/script_harness_consolidation_01_check.js",
      "backend/scripts/ux_brand_login_premium_01_check.js",
      "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
      "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
      "backend/scripts/ux_panel_standard_architecture_01_check.js",
      "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
      "backend/scripts/offer_ranking_quality_01_check.js",
      "backend/scripts/ux_premium_critical_fix_room_01_check.js",
      "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
      "web/src/panels/company/MapPanel.jsx",
      "web/src/panels/driver/MapPanel.jsx",
      "web/src/panels/driver/RoutePanel.jsx",
      "web/src/panels/room/MapPanel.jsx",
      "web/src/panels/room/OffersPanel.jsx",
      "web/src/panels/shared/SafeDriveSummaryCard.jsx",
      "web/src/panels/shared/OfferQualityRankingCard.jsx",
      "web/src/utils/safeDriveSummary.js",
      "web/src/utils/offerQualityRanking.js",
      "backend/scripts/ux_room_panel_clarity_01_check.js",
      "backend/scripts/verified_supplier_01_check.js",
      "backend/scripts/verify_chain_01_product_extensions_check.js",
      "docs/INVITE_BASED_MEMBERSHIP_01.md",
      "docs/PRIMER_SSOT.md",
      "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
      "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
      "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
      "docs/VERIFIED_SUPPLIER_01.md",
      "package.json",
      "backend/scripts/invite_based_membership_01_check.js",
      "backend/scripts/onboarding_review_final_audit_01_check.js",
      "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
      "backend/scripts/run_product_extensions_check_chain.js",
      "backend/scripts/script_harness_consolidation_01_check.js",
      "backend/scripts/ux_brand_login_premium_01_check.js",
      "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
      "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
      "backend/scripts/ux_panel_standard_architecture_01_check.js",
      "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
      "backend/scripts/ux_premium_critical_fix_room_01_check.js",
      "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
      "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
      "backend/scripts/ux_room_panel_clarity_01_check.js",
      "backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
      "backend/scripts/verified_supplier_01_check.js",
      "backend/scripts/verify_chain_01_product_extensions_check.js",
      "docs/INVITE_BASED_MEMBERSHIP_01.md",
      "docs/PRIMER_SSOT.md",
      "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
      "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
      "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
      "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
      "docs/VERIFIED_SUPPLIER_01.md",
      "package.json",
      ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/RoutePreviewModal.jsx",
    "web/src/components/geo/GeoLocationPicker.jsx",
    "web/src/components/geo/HubMapPicker.jsx",
    "web/src/components/map/MapView.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/components/map/mapTileAssets.js",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/index.css",
    "web/src/layout/AppShell.jsx",
    "web/src/state/sessionProvider.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyAgreementsOverviewSection.jsx",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/bug_route_impact_preview_button_01_check.js",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelWorkflow.js",
    "web/src/panels/room/roomShiftsPanelActions.js",
    "web/src/panels/room/roomVehiclesPanelActions.js",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/shared/KvkkConsentGate.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
    "tools/repo_contract_state.json",
  ];

  mustTrue(exists("backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js"), "cleanup check exists");
  mustTrue(exists("docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md"), "cleanup doc exists");
  mustTrue(exists("backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/report.json"), "smoke report exists");
  mustTrue(exists("backend/artifacts/browser-smoke/UX_LIVE_PANEL_PREMIUM_SMOKE_01/report.md"), "smoke markdown report exists");

  mustContains(pkg, '"check:uxpremiumcriticaluxfixcleanup01": "node backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js"', "package.json exposes cleanup check");
  assertProductExtensionsIncludes("check:uxpremiumcriticaluxfixcleanup01", "product extensions registry includes cleanup check");
  mustContains(harnessCheck, "UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01", "script harness check knows cleanup milestone");
  mustContains(harnessCheck, "check:uxpremiumcriticaluxfixcleanup01", "script harness check knows cleanup alias");
  mustContains(harnessCheck, "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md", "script harness check knows cleanup doc");
  mustContains(harnessDoc, "UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01", "script harness doc lists cleanup milestone");
  mustContains(harnessDoc, "check:uxpremiumcriticaluxfixcleanup01", "script harness doc lists cleanup alias");
  mustContains(harnessDoc, "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md", "script harness doc lists cleanup doc");
  mustContains(guide, "UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01", "milestone guide mentions cleanup milestone");
  mustContains(guide, "check:uxpremiumcriticaluxfixcleanup01", "milestone guide exposes cleanup check");
  mustContains(guide, "node backend\\scripts\\ux_premium_critical_uxfix_cleanup_01_check.js", "milestone guide includes cleanup command");
  mustContains(guide, "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md", "milestone guide includes cleanup doc");

  mustContains(doc, "UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01", "cleanup doc title present");
  mustContains(doc, "UX-FIX: 20 → 0", "cleanup doc keeps UX-FIX goal");
  mustContains(doc, "23'ü aşmamalı", "cleanup doc keeps PASS-minus baseline note");
  mustContains(doc, "Super Admin Audit", "cleanup doc covers super admin audit");
  mustContains(doc, "Room Shifts", "cleanup doc covers room shifts");
  mustContains(doc, "Room Agreements", "cleanup doc covers room agreements");
  mustContains(doc, "Room Vehicles", "cleanup doc covers room vehicles");
  mustContains(doc, "Room Drivers", "cleanup doc covers room drivers");
  mustContains(doc, "Company Agreements", "cleanup doc covers company agreements");
  mustContains(doc, "Driver Route", "cleanup doc covers driver route");
  mustContains(doc, "Driver Check-in", "cleanup doc covers driver check-in");
  mustContains(doc, "Sistem kanıtı", "cleanup doc keeps safe audit wording");
  mustContains(doc, "Okuma kodu", "cleanup doc keeps safe driver check-in wording");
  mustContains(doc, "GPS durumu", "cleanup doc keeps safe route wording");
  mustContains(doc, "Yeni cihaz erişim kodu", "cleanup doc keeps safe vehicle wording");
  mustContains(doc, "Sürücü kaydı", "cleanup doc keeps safe driver wording");
  mustContains(doc, "Güncel değil", "cleanup doc keeps safe stale wording");
  mustContains(doc, "Çevrim dışı", "cleanup doc keeps safe offline wording");
  mustContains(doc, "Detayı aç", "cleanup doc keeps visible detail CTA wording");
  mustContains(doc, "Detayları göster", "cleanup doc keeps bridge detail wording");
  mustContains(doc, "Önizlemeyi Uygula: Böl & Onayla", "cleanup doc keeps dispatch CTA wording");
  mustContains(doc, "Bu alan önizlemedir; işlem başlatmaz.", "cleanup doc keeps readonly boundary wording");
  mustContains(doc, "roomCriticalFixScope", "cleanup doc keeps room safe-area scope");
  mustContains(doc, "roomActionCTA", "cleanup doc keeps room action CTA scope");
  mustContains(doc, "companyActionClarityScope", "cleanup doc keeps company safe-area scope");
  mustContains(doc, "shell--agreements-detail", "cleanup doc keeps app shell agreements detail scope");
  mustContains(doc, "navDock", "cleanup doc keeps navDock safety note");
  mustContains(doc, "safe-area", "cleanup doc keeps safe-area note");
  mustContains(doc, "z-index", "cleanup doc keeps z-index note");
  mustContains(doc, "PASS-minus evidence", "cleanup doc keeps PASS-minus preservation note");
  mustContains(doc, "backend route/write-path", "cleanup doc keeps backend boundary");
  mustContains(doc, "Schema/migration", "cleanup doc keeps schema boundary");
  mustContains(doc, "Playwright runner policy", "cleanup doc keeps policy boundary");

  mustContains(app, "/room/shifts", "cleanup app keeps room shifts route mounted");
  mustContains(app, "/company/agreements", "cleanup app keeps company agreements route mounted");
  mustContains(app, "/driver/checkin", "cleanup app keeps driver check-in route mounted");
  mustContains(app, "/superadmin/audit", "cleanup app keeps super admin audit route mounted");
  mustContains(appShell, "shell--agreements-detail", "cleanup app shell keeps agreements detail scope");
  mustContains(superadminAudit, "Sistem kanıtı", "cleanup super admin audit keeps safe proof wording");
  mustContains(cameraQr, "kod alanına", "cleanup camera QR keeps safe code wording");
  mustContains(driverCheckin, "Okuma kodu", "cleanup driver check-in keeps safe code wording");
  mustContains(driverRoute, "GPS durumu", "cleanup driver route keeps safe GPS wording");
  mustContains(roomShiftsPanel, "copilotShift={copilotShift}", "cleanup room shifts keeps dispatch preview wiring");
  mustContains(roomShiftsPanelSections, "Önizlemeyi Uygula: Böl & Onayla", "cleanup room shifts keeps visible dispatch CTA in lower surface");
  mustContains(roomAgreements, "Rota Önizleme", "cleanup room agreements keeps detail preview wording");
  mustContains(agreementOpsBridge, "Detayları göster", "cleanup agreements bridge keeps visible detail wording");
  mustContains(roomVehiclesPanel, "erişim görünürlüğü", "cleanup room vehicles keeps access visibility wording");
  mustContains(roomVehiclesCards, "Yeni cihaz erişim kodu", "cleanup room vehicles keeps access code wording");
  mustContains(roomVehiclesSections, "Erişim kodu yalnızca create/rotate anında bir kez gösterilir.", "cleanup room vehicles keeps one-time code boundary");
  mustContains(roomDriversPanel, "Sürücü kaydı", "cleanup room drivers keeps safe driver wording");
  mustContains(roomDriversStatus, "Mevcut vardiya", "cleanup room drivers keeps current shift wording");
  mustContains(roomDriversShifts, "Sürücü kaydı", "cleanup room driver shifts keeps safe driver wording");
  mustContains(roomDriversEdit, "Sürücü kaydı", "cleanup room driver edit keeps safe driver wording");
  mustContains(companyAgreementsPanel, 'scrollIntoView({ block: "center"', "cleanup company agreements keeps centered detail scroll");
  mustContains(companyAgreementsOverview, "Sözleşmeler (Company)", "cleanup company agreements keeps company label");
  mustContains(companyAgreementsSource, "Kaynak vardiya bağlantısı", "cleanup company agreements keeps source shift link wording");
  mustContains(etaSanity, "Çevrim dışı", "cleanup ETA sanity keeps offline wording");

  mustContains(smokeAudit, 'report.statusCounts["UX-FIX"] === expectedStatusCounts["UX-FIX"]', "smoke audit keeps UX-FIX zero gate");
  mustContains(smokeAudit, 'report.statusCounts.PASS > 0', "smoke audit keeps PASS gate");
  mustContains(smokeAudit, 'report.statusCounts["PASS-"] >= 0', "smoke audit keeps PASS-minus flexibility");
  mustNotContains(smokeAudit, '"PASS": 40', "smoke audit does not hardcode old PASS count");
  mustNotContains(smokeAudit, '"PASS-": 22', "smoke audit does not hardcode old PASS-minus count");
  mustNotContains(smokeAudit, '"UX-FIX": 20', "smoke audit does not hardcode old UX-FIX count");

  mustContains(passMinus, "PASS- classification", "PASS-minus evidence check remains active");
  mustContains(passMinus, "route preview compact card", "PASS-minus evidence check keeps route-preview evidence");
  mustContains(passMinus, "accepted/applied bucket", "PASS-minus evidence check keeps commercial evidence");
  mustContains(passMinus, "convertToAgreement", "PASS-minus evidence check keeps conversion evidence");
  mustContains(passMinus, "long live-map", "PASS-minus evidence check keeps live-map evidence");
  mustContains(passMinus, "console noise", "PASS-minus evidence check keeps console evidence");

  const report = JSON.parse(fs.readFileSync(reportJsonPath, "utf8"));
  must(Array.isArray(report.routes), "smoke report keeps routes array");
  must(report.routeCount === report.routes.length, "smoke report route count matches rows");
  must(report.routeCount === 82, "smoke report keeps 82 route checks");
  must(report.screenshotCount === 164, "smoke report keeps 164 screenshots");
  must(report.pageErrorCount === 0, "smoke report keeps pageErrorCount at 0");
  must(report.statusCounts.BLOCKER === 0, "smoke report keeps blocker count at 0");
  must(report.statusCounts["NOT-FOUND"] === 0, "smoke report keeps not-found count at 0");
  must(report.statusCounts["UX-FIX"] === 0, "smoke report keeps UX-FIX count at 0");
  must(report.statusCounts.PASS > 0, "smoke report keeps PASS count");
  must(report.statusCounts["PASS-"] <= 23, "smoke report keeps PASS-minus at or below current evidence baseline");
  must(
    report.statusCounts.PASS + report.statusCounts["PASS-"] + report.statusCounts["UX-FIX"] + (report.statusCounts["AUTH-BLOCKED"] || 0) ===
      report.routeCount,
    "smoke report status buckets cover all routes"
  );

  const criticalRoutes = [
    "/#/superadmin/audit",
    "/#/room/shifts",
    "/#/room/agreements",
    "/#/room/vehicles",
    "/#/room/drivers",
    "/#/company/agreements",
    "/#/school/agreements",
    "/#/organization/agreements",
    "/#/driver/route",
    "/#/driver/checkin",
  ];

  for (const route of criticalRoutes) {
    const rows = report.routes.filter((row) => row.route === route);
    must(rows.length === 2, `cleanup smoke keeps desktop/mobile coverage for ${route}`);
    must(rows.every((row) => row.status !== "UX-FIX"), `cleanup smoke removes UX-FIX from ${route}`);
  }

  const actualPassMinusRows = report.routes.filter((row) => row.status === "PASS-");
  const passMinusRows = report.routes.filter(
    (row) => row.status === "PASS-" || (row.kind === "dispatch" && row.status === "PASS")
  );
  const bucketCounts = {};
  const uncategorized = [];
  for (const row of passMinusRows) {
    const bucket = evidenceBucket(row);
    if (!bucket) {
      uncategorized.push(`${row.role} ${row.route} ${row.viewport}`);
      continue;
    }
    bucketCounts[bucket] = (bucketCounts[bucket] || 0) + 1;
  }

  must(uncategorized.length === 0, `PASS-minus inventory stays evidence-based (${passMinusRows.length})`);

  if (actualPassMinusRows.length > 0) {
    must(bucketCounts["review-gap"] >= 1, "PASS- inventory keeps review queue evidence");
    must(bucketCounts["route-preview"] >= 1, "PASS- inventory keeps route preview evidence");
    must(bucketCounts["dispatch"] >= 1, "PASS- inventory keeps dispatch evidence");
    must(bucketCounts["commercial-bucket"] >= 1, "PASS- inventory keeps commercial flow evidence");
    must(bucketCounts["convert-draft"] >= 1, "PASS- inventory keeps company shift conversion evidence");
    must(bucketCounts["long-live-map"] >= 1, "PASS- inventory keeps long live-map evidence");
    if ((report.consoleErrorCount || 0) > 0) {
      must(bucketCounts["console-noise"] >= 1, "PASS- inventory keeps console noise evidence");
    }
  }

  const stagedAll = stagedNames();
  mustTrue(stagedAll.length === 0, "stage remains empty");
  const staged = stagedAll.filter((file) => !cleanupScopeFiles.includes(file));
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  mustAcceptedPrismaManifest();
  const status = statusNames().filter((file) => !cleanupScopeFiles.includes(file) && !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file)));
  const approvedConcurrentBackendDiff = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF_WITHOUT_COMMERCIAL_CORE_CHILDREN;
  mustDiffEmptyOrExactlyWithIdentity(
    ["backend/src/routes", "backend/src/services"],
    approvedConcurrentBackendDiff,
    "approved NEW-01 backend diff is identity-locked"
  );

  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  mustNotList(status, "web/src/panels/room/CommercialFlowPanel.jsx", "room commercial flow panel is untouched");
  mustNotList(status, "web/src/panels/driver/MapPanel.jsx", "driver map panel is untouched");
  mustNotList(status, "web/src/panels/parent/", "parent surfaces are untouched");
  mustNotList(status, "web/src/panels/personel/", "personel surfaces are untouched");

  console.log("=== UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
