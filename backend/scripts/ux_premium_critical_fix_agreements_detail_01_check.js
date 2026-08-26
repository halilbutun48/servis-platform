#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, mustDiffEmptyOrExactlyWithIdentity, mustStatusEmptyOrExactlyWithIdentity } from "./lib/guardGitScope.js";
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

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

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
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
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`${label}: not an ordinary directory`);
  const entries = fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => entry.name).sort(compareText);
  if (entries.length !== 1 || entries[0] !== "migration.sql") fail(`${label}: unexpected contents=${entries.join(", ")}`);
  ok(label);
}

const ACCEPTED_SCHEMA_PATH = "backend/prisma/schema.prisma";
const ACCEPTED_SCHEMA_SHA256 = "7DFBAB959B3535B3F46A96EACCB53724A96B056FC559F993C6095E41CA44E748";
const APPROVED_SUPERADMIN_PRESENTATION = [
  { path: "web/src/panels/superadmin/AuditLogsPanel.jsx", sha256: "2F839DAB142DAEF2BEC4BDD4E6667F4836CCE6E9A44568AFDC8CE555931634FE" },
  { path: "web/src/panels/superadmin/CommercialCorePanel.jsx", sha256: "3A0392D66E6AF3AAA70DEC456A435B0A78A4828EDB9FF11F1554F1E0FB13E123" },
  { path: "web/src/panels/superadmin/commercialCorePanelShared.jsx", sha256: "9FAE47E7E24DB70A0ADB6F89E41C1BABD8868FDEF9A690CFEAE9D64F8CC9896D" },
];
const APPROVED_ROOM_PRESENTATION = [
  { path: "web/src/panels/room/AgreementsPanel.jsx", sha256: "A95D9BC43959CC0ED6417B2376CA9BB5A20B4F05D99B5A93BAEEF9824799D309" },
  { path: "web/src/panels/room/CommercialFlowPanel.jsx", sha256: "221744071AD73366242BCA96C6986F76B51BDD4703FCC8FF5806D622B7C29DEE" },
  { path: "web/src/panels/room/DriversPanel.jsx", sha256: "7E1E31C2813A24B95D384441FDFD587924EC3672CA8F7047CE3D35E0AFDF3DD4" },
  { path: "web/src/panels/room/HubPanel.jsx", sha256: "5D862BDA535D75AB91F788C63D9AD9B0F33DEB93BC288162D62E3F7845BA0C4E" },
  { path: "web/src/panels/room/MapPanel.jsx", sha256: "AB49A5566EDD95B31EE03FC42AD352E45C17E5EEA616188965212DC78376C6C0" },
  { path: "web/src/panels/room/OperationHealthPanel.jsx", sha256: "597E1D7B915FF732A768AB4662D7623961A2557BEE815B7D8CB56FDEAC0FD068" },
  { path: "web/src/panels/room/ShiftsPanel.jsx", sha256: "7C4258644A9E5998059BDD07FA57682C297A826FEC9C6BAFE431B4FB7846EC4A" },
  { path: "web/src/panels/room/VehiclesPanel.jsx", sha256: "6AF5573297F292976419FF0BC5635EEB06A9CEA7BC023AAD0EE11D0B7AB4D14D" },
  { path: "web/src/panels/room/roomShiftsMainSections.jsx", sha256: "54492ACB7BDA42CBD10122A5891C6D12E44B271C06CF0B9B7ACD45F37D6FB854" },
  { path: "web/src/panels/room/roomShiftsPanelCards.jsx", sha256: "676EBDF58A97169715581AC857EB51DEA3280BE6DD9CE26D1A363F4C3B059BDF" },
  { path: "web/src/panels/room/roomShiftsPanelMobileCards.jsx", sha256: "012306CE28A65467D41605957CE82006374386301FA82594F32626C7A7F24878" },
  { path: "web/src/panels/room/roomShiftsPanelRows.jsx", sha256: "1A5FF81F47851A7EB44AA20E55BEEDE70F5F5275D68CBB4BFDEF8E87CE702549" },
  { path: "web/src/panels/room/roomShiftsPanelSections.jsx", sha256: "BA8DDA6EA8F2E65776FBD68E58E749097D6E1B3DD98E42D72BCED3F379509B38" },
  { path: "web/src/panels/room/roomShiftsPanelUtils.js", sha256: "F75CE13DF998CEF7C100CD315F9C1196674671B289289D3598B88795077F2078" },
  { path: "web/src/panels/room/roomVehiclesPanelCards.jsx", sha256: "33CB799B71B0848FA6BE8A31E44063A35E7F2A5E86C1CDD134959967E0BEC278" },
  { path: "web/src/panels/room/roomVehiclesPanelSections.jsx", sha256: "185BEFC7E0BDF848924ADF20E89738DC7AAF6407985B73BE1C146EA81E714C51" },
  { path: "web/src/panels/room/roomVehiclesPanelRows.jsx", sha256: "A710286C91187E486089002B578F6EC930CAFE97049A4141F5614CFBDEE3ECD6" },
];
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
const ACCEPTED_PRISMA_PATH_SET = new Set(ACCEPTED_PRISMA_PATHS.map(normalizePath));

function mustAcceptedPrismaManifest() {
  mustExactGitPaths(["backend/prisma", "prisma"], [], "backend/prisma diff empty");
  mustFileSha256(ACCEPTED_SCHEMA_PATH, ACCEPTED_SCHEMA_SHA256, "accepted Prisma schema SHA matches");
  for (const entry of ACCEPTED_PRISMA_MIGRATIONS) {
    mustNormalizedTextSha256(entry.path, entry.sha256, `accepted Prisma migration SHA matches ${entry.path}`);
    mustMigrationDirectoryShape(path.dirname(entry.path), `accepted Prisma migration directory shape ${entry.path}`);
  }
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function main() {
  console.log("=== UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 CHECK ===");

  const pkg = read("package.json");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md");
  const app = read(APP_JSX_ROLE_TENANT_SCOPE_PATHS[0]);
  const appShell = read("web/src/layout/AppShell.jsx");
  const agreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
  const companyAgreementsBridgeSection = read("web/src/panels/company/companyAgreementsBridgeSection.jsx");
  const bridgeCard = read("web/src/components/AgreementOpsBridgeCard.jsx");
  const css = read("web/src/index.css");
  const cleanupScopeFiles = [
    "backend/src/kvkk/matrix.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
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
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/SAFE_DRIVE_01.md",
    "package.json",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/RoutePreviewModal.jsx",
    "web/src/components/geo/GeoLocationPicker.jsx",
    "web/src/components/geo/HubMapPicker.jsx",
    "web/src/components/map/MapView.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/components/map/mapTileAssets.js",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/PersonelAccessPanel.jsx",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/index.css",
    "web/src/layout/AppShell.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/bug_route_impact_preview_button_01_check.js",
    "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
    "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
    "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelWorkflow.js",
    "web/src/panels/room/roomShiftsPanelActions.js",
    "web/src/panels/room/roomVehiclesPanelActions.js",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/shared/KvkkConsentGate.jsx",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
    "web/src/utils/safeDriveSummary.js",
  ];

  mustTrue(exists("backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js"), "agreements detail check exists");
  mustTrue(exists("docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md"), "agreements detail doc exists");

  must(pkg, '"check:uxpremiumcriticalfixagreementsdetail01": "node backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js"', "package.json exposes agreements detail check");
  assertProductExtensionsIncludes("check:uxpremiumcriticalfixagreementsdetail01", "product extensions registry includes agreements detail check", registryScripts);
  assertProductExtensionsOrder(["check:uxcompanymobileactionclarity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxcompanyopspaneltabs01"], "product extensions registry keeps agreements detail after company mobile action clarity", registryScripts);

  must(harnessCheck, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "script harness check knows agreements detail milestone");
  must(harnessCheck, "check:uxpremiumcriticalfixagreementsdetail01", "script harness check knows agreements detail alias");
  must(harnessCheck, "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md", "script harness check knows agreements detail doc");
  must(harnessDoc, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "script harness doc lists agreements detail milestone");
  must(harnessDoc, "check:uxpremiumcriticalfixagreementsdetail01", "script harness doc lists agreements detail alias");
  must(harnessDoc, "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md", "script harness doc lists agreements detail doc");

  must(guide, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "milestone guide mentions agreements detail milestone");
  must(guide, "check:uxpremiumcriticalfixagreementsdetail01", "milestone guide exposes agreements detail check");
  must(guide, "node backend\\scripts\\ux_premium_critical_fix_agreements_detail_01_check.js", "milestone guide includes agreements detail command");
  must(guide, "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md", "milestone guide includes agreements detail doc");

  must(doc, "UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01", "agreements detail doc title present");
  must(doc, "Company / Sözleşmeler", "agreements detail doc covers company agreements surface");
  must(doc, "Organization / Sözleşmeler", "agreements detail doc covers organization agreements surface");
  must(doc, "School / Sözleşmeler", "agreements detail doc covers school agreements surface");
  must(doc, "Önizlemeyi aç", "agreements detail doc keeps list preview CTA wording");
  must(doc, "Detayı aç", "agreements detail doc keeps visible detail CTA wording");
  must(doc, "Taslağı incele", "agreements detail doc keeps draft wording");
  must(doc, "Önizlemeyi aç", "agreements detail doc keeps preview wording");
  must(doc, "Bu alan önizlemedir; işlem başlatmaz.", "agreements detail doc keeps readonly preview wording");
  must(doc, "navDock", "agreements detail doc mentions navDock safety");
  must(doc, "safe-area", "agreements detail doc mentions safe-area");
  must(doc, "z-index", "agreements detail doc mentions z-index safety");
  must(doc, "readonly preview", "agreements detail doc keeps readonly boundary wording");
  must(doc, "business flow", "agreements detail doc keeps no-business-flow wording");

  must(agreementsPanel, "companyActionClarityScope", "agreements panel uses company action clarity scope");
  must(agreementsPanel, "Detay ve önizleme", "agreements panel exposes detail preview card");
  must(agreementsPanel, "Detayı aç", "agreements panel exposes visible detail CTA");
  must(agreementsPanel, "Bu alan önizlemedir; işlem başlatmaz.", "agreements panel keeps readonly preview boundary");
  must(agreementsPanel, "viewMode === \"bridge\"", "agreements panel keeps bridge view");
  must(companyAgreementsBridgeSection, "defaultOpen={true}", "agreements panel opens bridge details by default");

  must(bridgeCard, "Detayı aç", "agreement ops bridge card keeps visible detail CTA");
  must(bridgeCard, "Taslağı incele", "agreement ops bridge card keeps draft CTA");
  must(bridgeCard, "Operasyon kaydını aç", "agreement ops bridge card keeps operation CTA");
  must(bridgeCard, "Detayı kapat", "agreement ops bridge card keeps close toggle wording");
  must(bridgeCard, "Bu alan önizlemedir; işlem başlatmaz.", "agreement ops bridge card keeps readonly preview boundary");
  must(bridgeCard, "initialDetailsOpen", "agreement ops bridge card accepts initial open state");

  must(app, "/company/agreements", "app routes company agreements");
  must(app, "/organization/agreements", "app routes organization agreements");
  must(app, "/school/agreements", "app routes school agreements");
  must(app, "CompanyAgreementsPanel", "app routes agreements aliases to company agreements panel");
  must(appShell, "shell--agreements-detail", "app shell keeps agreements detail shell class");
  must(appShell, "isAgreementsDetailRoute", "app shell computes agreements detail route flag");

  must(css, ".companyActionClarityScope", "global css keeps company action scope");
  must(css, ".companyActionClarityScope .btn.primary", "global css keeps primary CTA safety");
  must(css, ".companyActionClarityScope .btn.sm.primary", "global css keeps small primary CTA safety");
  must(css, "z-index: 4305", "global css keeps z-index clearance");
  must(css, "scroll-margin-bottom: calc(220px + env(safe-area-inset-bottom))", "global css keeps scroll margin");
  must(css, "safe-area-inset-bottom", "global css keeps safe-area padding");

  const staged = stagedNames().filter((file) => !cleanupScopeFiles.includes(file));
  mustTrue(staged.length === 0, "stage remains empty");
  const stagedAllowed = new Set([
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/onboarding_review_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "docs/PRIMER_SSOT.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
    "web/src/copilot/screenRegistry.js",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "tools/repo_contract_state.json",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "web/src/index.css",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within agreements detail validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames().filter((file) => !cleanupScopeFiles.includes(file));
  const exactAllowed = new Set([
    "backend/scripts/ai03b_semantic_visible_audit_01_check.js",
    "backend/scripts/copilot_context_memory_task_state_01_check.js",
    "backend/src/ai/chat/conversationTaskState.js",
    "backend/src/ai/chat/conversationTaskStateResponses.js",
    "backend/src/ai/chat/conversationTaskStateShared.js",
    "backend/src/ai/chat/conversationTaskStateClarifiers.js",
    "backend/src/ai/chat/conversationTaskStateSelectedRecord.js",
    "backend/src/ai/chat/conversationTaskStateFollowUps.js",
    "backend/src/ai/chat/conversationTaskStateBuilders.js",
    "backend/src/ai/chat/conversationTaskStateCompanyReplies.js",
    "backend/src/ai/chat/conversationTaskStateRoomReplies.js",
    "backend/src/ai/chat/screenStateAnalyzer.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ai03b_semantic_visible_live_matrix_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/copilot_dynamic_question_engine_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "docs/MILESTONE_M90C_6_HOT_FILE_QUEUE_POLICY.md",
    "docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md",
    "tools/PRIMER_SNAPSHOT.md",
    "backend/scripts/sefer_abi_reasoning_assistant_01_check.js",
    "backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js",
    "backend/src/ai/chat/seferAbiReasoningAssistant.js",
    "backend/src/ai/chat/conversationTaskStateDynamicQuestions.js",
    "docs/SEFER_ABI_REASONING_ASSISTANT_01.md",
    "docs/SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_01.md",
    "docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md",
    "backend/scripts/copilot_smart_diagnostic_engine_01_check.js",
    "backend/src/ai/chat/conversationSmartDiagnostics.js",
    "docs/COPILOT_SMART_DIAGNOSTIC_ENGINE_01.md",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
    "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js",
    "docs/COPILOT_ROUTE_REVIEW_HUMAN_APPROVAL_01.md",
    "backend/scripts/excel_to_route_readiness_redteam_01_check.js",
    "backend/src/ai/chat/excelToRouteReadinessRedteamPack.js",
    "docs/EXCEL_TO_ROUTE_READINESS_REDTEAM_01.md",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/sefer_abi_terminal_humanize_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/onboarding_review_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    ".gitignore",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
    "web/src/components/BrandMark.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "web/src/panels/company/companyAgreementsBridgeSection.jsx",
    "web/src/panels/company/companyAgreementsPanelHelpers.js",
    "web/src/panels/room/roomAgreementsBridgeSection.jsx",
    "web/src/panels/room/roomAgreementsPanelHelpers.js",
    "web/src/panels/room/roomAgreementsPanelSections.jsx",
    "web/src/panels/room/roomOperationsBoard.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/HubPanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/room/OperationHealthPanel.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelCards.jsx",
    "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelUtils.js",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelActions.js",
    "web/src/panels/room/CheckinPanel.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/companyShiftsPanelCards.jsx",
    "web/src/layout/AppShell.jsx",
    "web/src/state/sessionProvider.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/index.css",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelIntro.jsx",
    "web/src/panels/company/ShiftsPanel.jsx",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "web/src/panels/superadmin/CompaniesPanel.jsx",
    "web/src/panels/superadmin/RegionsPanel.jsx",
    "web/src/panels/superadmin/RoomsPanel.jsx",
    "web/src/panels/superadmin/UsersPanel.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/panels/superadmin/CommercialCorePanel.jsx",
    "web/src/panels/superadmin/commercialCorePanelShared.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/copilot/screenRegistry.js",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/COPILOT_E_BLOCK_RUNTIME_ANSWER_INTEGRATION_01.md",
    "backend/scripts/copilot_e_block_runtime_answer_integration_01_check.js",
    "backend/src/ai/chat/copilotEBlockRuntimeAnswerIntegration.js",
    "backend/src/ai/chat/answerQualityPolicy.js",
    "backend/src/ai/chat/helpComposer.js",
    "backend/src/ai/chat/intentRouter.js",
    "backend/src/ai/chat/intentRouterCore.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/invite_based_membership_01_check.js",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "backend/scripts/copilot_reasoning_answer_composer_01_check.js",
    "backend/src/ai/chat/copilotReasoningAnswerComposer.js",
    "backend/src/ai/schemas.js",
    "backend/scripts/copilot_route_review_human_approval_01_check.js",
    "backend/scripts/copilot_clarifying_question_engine_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/plan_center_guided_flow_persistence_01_check.js",
    "web/src/components/copilot/FloatingCopilotDrawer.jsx",
    "web/src/components/copilot/uiSurface.js",
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
    "web/src/utils/planCenterOverlayLayer.js",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "web/src/copilot/screenRegistry.js",
    "web/src/panels/room/OffersPanel.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "tools/repo_contract_state.json",
    "web/src/utils/offerQualityRanking.js",
    "backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
    "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
      "backend/src/ai/chat/conversationRootCauseEngine.js",
      "backend/src/ai/chat/conversationRiskScoringEngine.js",
      "backend/src/ai/chat/copilotGuidedTaskEngine.js",
    "backend/src/ai/chat/goldenQuestionPack.js",
    "backend/src/ai/chat/qualityScorer.js",
      "backend/scripts/copilot_guided_task_engine_01_check.js",
    "backend/scripts/copilot_root_cause_engine_01_check.js",
    "backend/scripts/copilot_risk_scoring_engine_01_check.js",
    "backend/src/ai/jobGuide/screenCatalog.roomCompany.js",
    "backend/scripts/sefer_abi_turkish_user_facing_language_01_check.js",
    "docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md",
    "docs/COPILOT_GUIDED_TASK_ENGINE_01.md",
    "docs/COPILOT_ROOT_CAUSE_ENGINE_01.md",
    "docs/COPILOT_RISK_SCORING_ENGINE_01.md",
    "docs/SEFER_ABI_TURKISH_USER_FACING_LANGUAGE_01.md",
    "web/src/utils/uiDataCache.js",
    "backend/src/utils/responseCache.js",
    "backend/src/bootstrap/routeMounts.js",
    "backend/src/server.js",
    "backend/src/routes/dashboardBulk.js",
    "backend/src/routes/companyOverview.js",
    "backend/src/services/dashboardBulk.js",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/shared/FinancialOperationsPanel.jsx",
  ]);
  mustAcceptedPrismaManifest();
  const statusWithoutAcceptedPrisma = status.filter((file) => !ACCEPTED_PRISMA_PATH_SET.has(normalizePath(file)));
  const approvedConcurrentBackendDiff = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF;
  mustStatusEmptyOrExactlyWithIdentity(
    ["backend/src/routes", "backend/src/services"],
    approvedConcurrentBackendDiff,
    "approved NEW-01 backend diff is identity-locked"
  );
  const exactAllowedSet = new Set(exactAllowed);
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(statusWithoutAcceptedPrisma, "Prisma/", "schema/migration files are untouched");
  const statusWithoutOffers = status.filter((file) => file !== "web/src/panels/room/OffersPanel.jsx");
  const statusWithoutTrustQuality = statusWithoutOffers.filter((file) => file !== "web/src/panels/superadmin/TrustQualityPanel.jsx" && file !== "web/src/panels/superadmin/PublicLeadReviewPanel.jsx");

  mustNotList(statusWithoutTrustQuality.filter((file) => !exactAllowedSet.has(file)), "web/src/panels/room/", "room surfaces are untouched");
  mustStatusEmptyOrExactlyWithIdentity(
    APPROVED_ROOM_PRESENTATION.map((entry) => entry.path),
    APPROVED_ROOM_PRESENTATION,
    "room surfaces stay within the approved presentation identities"
  );
  mustStatusEmptyOrExactlyWithIdentity(
    ["web/src/panels/driver/TodayPanel.jsx"],
    [{ path: "web/src/panels/driver/TodayPanel.jsx", sha256: "ACB5EB64D24F958A725D751EBE2F1DDAA2F6818D50605B0849F55CB828E11F02" }],
    "driver today surface stays within the approved presentation identity"
  );
  mustNotList(statusWithoutTrustQuality.filter((file) => !exactAllowedSet.has(file)), "web/src/panels/superadmin/", "superadmin surfaces are untouched");
  mustStatusEmptyOrExactlyWithIdentity(
    APPROVED_SUPERADMIN_PRESENTATION.map((entry) => entry.path),
    APPROVED_SUPERADMIN_PRESENTATION,
    "superadmin surfaces stay within the approved presentation identities"
  );

  console.log("=== UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
