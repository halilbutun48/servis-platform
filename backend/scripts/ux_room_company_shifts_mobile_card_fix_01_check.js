#!/usr/bin/env node

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

function must(cond, label) {
  if (!cond) fail(label);
  ok(label);
}

function mustTrue(cond, label) {
  must(Boolean(cond), label);
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

function matches(file, needle) {
  return normalize(file).includes(normalize(needle));
}

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function mustNotList(files, needle, label) {
  if (files.some((file) => matches(file, needle))) fail(label);
  ok(label);
}

function main() {
  console.log("=== UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md");
  const css = read("web/src/index.css");
  const roomSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const companySections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
  const roomCards = read("web/src/panels/room/roomShiftsPanelMobileCards.jsx");
  const companyCards = read("web/src/panels/company/companyShiftsPanelMobileCards.jsx");
  const roomPanel = read("web/src/panels/room/ShiftsPanel.jsx");
  const companyPanel = read("web/src/panels/company/ShiftsPanel.jsx");

  mustTrue(exists("backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js"), "room/company shifts mobile card fix check exists");
  mustTrue(exists("docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md"), "room/company shifts mobile card fix doc exists");

  must(pkg, '"check:uxroomcompanyshiftsmobilecardfix01": "node backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js"', "package.json exposes room/company shifts mobile card fix check");
  ordered(
    runner,
    ["check:uxmobileallrolespanelfix01", "check:uxroomcompanyshiftsmobilecardfix01", "check:uxmobileoverflowminimapreadability01"],
    "product extensions runner keeps room/company shifts mobile card fix between mobile role fix and overflow readability"
  );
  ordered(
    verify,
    ["check:uxmobileallrolespanelfix01", "check:uxroomcompanyshiftsmobilecardfix01", "check:uxmobileoverflowminimapreadability01"],
    "verify chain keeps room/company shifts mobile card fix between mobile role fix and overflow readability"
  );

  must(harnessCheck, "UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01", "script harness check knows room/company shifts mobile card fix milestone");
  must(harnessCheck, "check:uxroomcompanyshiftsmobilecardfix01", "script harness check knows room/company shifts mobile card fix alias");
  must(harnessCheck, "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md", "script harness check knows room/company shifts mobile card fix doc");
  must(harnessDoc, "UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01", "script harness doc lists room/company shifts mobile card fix milestone");
  must(harnessDoc, "check:uxroomcompanyshiftsmobilecardfix01", "script harness doc lists room/company shifts mobile card fix alias");
  must(harnessDoc, "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md", "script harness doc lists room/company shifts mobile card fix doc");
  must(guide, "UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01", "milestone guide mentions room/company shifts mobile card fix milestone");
  must(guide, "check:uxroomcompanyshiftsmobilecardfix01", "milestone guide exposes room/company shifts mobile card fix check");
  must(guide, "node backend\\scripts\\ux_room_company_shifts_mobile_card_fix_01_check.js", "milestone guide includes room/company shifts mobile card fix command");
  must(guide, "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md", "milestone guide includes room/company shifts mobile card fix doc");

  must(doc, "UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01", "room/company shifts mobile card fix doc title present");
  must(doc, "Room / Vardiyalar", "room/company shifts mobile card fix doc covers room vardiyalar");
  must(doc, "Company / Vardiyalar", "room/company shifts mobile card fix doc covers company vardiyalar");
  must(doc, "desktopShiftTable", "room/company shifts mobile card fix doc keeps desktop table wrapper wording");
  must(doc, "mobileShiftCards", "room/company shifts mobile card fix doc keeps mobile card list wording");
  must(doc, "tableWrap", "room/company shifts mobile card fix doc mentions tableWrap");
  must(doc, "Vardiya ID", "room/company shifts mobile card fix doc keeps vardiya id wording");
  must(doc, "Durum badge", "room/company shifts mobile card fix doc keeps badge wording");
  must(doc, "Şirket / Oda", "room/company shifts mobile card fix doc keeps company/room field wording");
  must(doc, "Araç", "room/company shifts mobile card fix doc keeps vehicle wording");
  must(doc, "Sürücü", "room/company shifts mobile card fix doc keeps driver wording");
  must(doc, "Başlangıç", "room/company shifts mobile card fix doc keeps start wording");
  must(doc, "Bitiş", "room/company shifts mobile card fix doc keeps end wording");
  must(doc, "Teklif / sözleşme özeti", "room/company shifts mobile card fix doc keeps offer summary wording");
  must(doc, "Ödeme / hakediş", "room/company shifts mobile card fix doc keeps payment snapshot wording");
  must(doc, "Rota Önizleme", "room/company shifts mobile card fix doc keeps route preview wording");
  must(doc, "İşlem Kaydı", "room/company shifts mobile card fix doc keeps ops log wording");
  must(doc, "Atamayı Değiştir", "room/company shifts mobile card fix doc keeps reassign wording");
  must(doc, "Süre Uzat", "room/company shifts mobile card fix doc keeps extend wording");
  must(doc, "word-break: normal", "room/company shifts mobile card fix doc keeps word-break wording");
  must(doc, "overflow-wrap: anywhere", "room/company shifts mobile card fix doc keeps overflow-wrap wording");
  must(doc, "overflow-x: hidden", "room/company shifts mobile card fix doc keeps overflow-x wording");
  must(doc, "Sefer Abi launcher", "room/company shifts mobile card fix doc keeps launcher wording");
  must(doc, "Backend route/write-path değişmedi.", "room/company shifts mobile card fix doc keeps backend route boundary");
  must(doc, "Schema/migration yok.", "room/company shifts mobile card fix doc keeps schema boundary");
  must(doc, "runtime-data", "room/company shifts mobile card fix doc keeps runtime-data boundary");
  must(doc, "browser-smoke", "room/company shifts mobile card fix doc keeps browser-smoke boundary");
  must(doc, "UX-FIX 0", "room/company shifts mobile card fix doc keeps UX-FIX target");
  must(doc, "BLOCKER 0", "room/company shifts mobile card fix doc keeps blocker target");
  must(doc, "NOT-FOUND 0", "room/company shifts mobile card fix doc keeps not-found target");
  must(doc, "PASS-", "room/company shifts mobile card fix doc keeps PASS-minus wording");
  must(doc, "Bu milestone yeni business flow eklemez.", "room/company shifts mobile card fix doc keeps business boundary");

  must(css, "overflow-x: hidden", "global css keeps x overflow hidden");
  must(css, ".desktopShiftTable {", "global css defines desktop shift table class");
  must(css, ".mobileShiftCards {", "global css defines mobile shift cards class");
  must(css, ".shiftCard {", "global css defines shift card class");
  must(css, ".shiftCardFieldValue {", "global css defines shift card field value class");
  must(css, ".shiftCardActions {", "global css defines shift card actions class");
  must(css, ".shiftCardInlineLink {", "global css defines shift card inline link class");
  must(css, ".shiftCardNestedCard {", "global css defines nested card class");
  must(css, "word-break: normal;", "global css keeps normal word break");
  must(css, "overflow-wrap: anywhere;", "global css keeps overflow wrap anywhere");
  must(css, "padding-bottom: calc(240px + env(safe-area-inset-bottom))", "global css keeps mobile launcher clearance");
  must(css, "padding-bottom: calc(200px + env(safe-area-inset-bottom))", "global css keeps smaller mobile launcher clearance");
  must(css, ".roomShiftsDensityScope", "global css keeps room shifts density scope");
  must(css, ".companyActionClarityScope", "global css keeps company action clarity scope");

  must(roomPanel, "roomShiftsDensityScope", "room shifts panel keeps density scope");
  must(roomPanel, "setFocusedTrackShiftId", "room shifts panel keeps focused shift wiring");
  must(companyPanel, "companyActionClarityScope", "company shifts panel keeps action clarity scope");
  must(companyPanel, "setFocusedTrackShiftId", "company shifts panel keeps focused shift wiring");

  must(roomSections, "desktopShiftTable", "room shifts sections render desktop table path");
  must(roomSections, "mobileShiftCards", "room shifts sections render mobile card path");
  must(roomSections, "RoomPendingShiftCard", "room shifts sections wire pending mobile card");
  must(roomSections, "RoomAllShiftCard", "room shifts sections wire final mobile card");
  must(roomSections, "RoomPendingShiftRow", "room shifts sections keep pending desktop row");
  must(roomSections, "RoomAllShiftRow", "room shifts sections keep final desktop row");

  must(companySections, "desktopShiftTable", "company shifts sections render desktop table path");
  must(companySections, "mobileShiftCards", "company shifts sections render mobile card path");
  must(companySections, "CompanyMarketShiftCard", "company shifts sections wire market mobile card");
  must(companySections, "CompanyPendingShiftCard", "company shifts sections wire pending mobile card");
  must(companySections, "CompanyFinalShiftCard", "company shifts sections wire final mobile card");
  must(companySections, "CompanyMarketRow", "company shifts sections keep market desktop row");
  must(companySections, "CompanyPendingRow", "company shifts sections keep pending desktop row");
  must(companySections, "CompanyFinalListRow", "company shifts sections keep final desktop row");

  must(roomCards, "RoomPendingShiftCard", "room mobile card file exports pending card");
  must(roomCards, "RoomAllShiftCard", "room mobile card file exports final card");
  must(roomCards, "Vardiya ID", "room mobile card file keeps vardiya id wording");
  must(roomCards, "Rota Önizleme", "room mobile card file keeps route preview action");
  must(roomCards, "İşlem Kaydı", "room mobile card file keeps ops log action");
  must(roomCards, "Atamayı Değiştir", "room mobile card file keeps reassign action");
  must(roomCards, "Süre Uzat", "room mobile card file keeps extend action");

  must(companyCards, "CompanyMarketShiftCard", "company mobile card file exports market card");
  must(companyCards, "CompanyPendingShiftCard", "company mobile card file exports pending card");
  must(companyCards, "CompanyFinalShiftCard", "company mobile card file exports final card");
  must(companyCards, "Vardiya ID", "company mobile card file keeps vardiya id wording");
  must(companyCards, "Teklif / sözleşme özeti", "company mobile card file keeps offer summary wording");
  must(companyCards, "Ödeme / hakediş", "company mobile card file keeps payment snapshot wording");
  must(companyCards, "Rota Önizleme", "company mobile card file keeps route preview action");
  must(companyCards, "İşlem Kaydı", "company mobile card file keeps ops log action");
  must(companyCards, "Sözleşmeye Dönüştür", "company mobile card file keeps convert action");
  must(companyCards, "Süre Uzat", "company mobile card file keeps extend action");

  const status = statusNames();
  const exactAllowed = new Set([
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_panel_inventory_02a_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/offer_ranking_quality_01_check.js",
    "backend/scripts/safe_drive_01_check.js",
    "docs/SAFE_DRIVE_01.md",
    "web/src/panels/company/MapPanel.jsx",
    "web/src/panels/driver/MapPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/shared/SafeDriveSummaryCard.jsx",
    "web/src/utils/safeDriveSummary.js",
    "backend/scripts/copilot_stop_route_draft_01_check.js",
    "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
    "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
    "backend/scripts/osrm_route_draft_from_excel_01_check.js",
    "backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js",
    "docs/OSRM_ROUTE_DRAFT_FROM_EXCEL_01.md",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/ux_company_agreements_mobile_parity_01_check.js",
    "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/onboarding_review_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
    "docs/UX_PANEL_REALITY_AUDIT_02C.md",
    "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
    "docs/OFFER_RANKING_QUALITY_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/ONBOARDING_REVIEW_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
    "docs/MOBILE_WEB_FINAL_01.md",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "package.json",
    "tools/repo_contract_state.json",
    "web/src/index.css",
    "web/src/App.jsx",
    "web/src/components/BrandMark.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/company/companyShiftsPanelFilters.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
    "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
    "web/src/panels/company/WorkflowPanel.jsx",
    "web/src/panels/company/companyShiftsPanelCards.jsx",
    "web/src/panels/company/companyAgreementsMobileCards.jsx",
    "web/src/panels/company/PersonelAccessPanel.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "web/src/state/sessionProvider.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/VERIFIED_SUPPLIER_01.md",
    "backend/scripts/invite_based_membership_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_zero_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/src/ai/jobGuide/screenCatalog.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "backend/scripts/address_geocoding_confidence_01_check.js",
    "backend/src/ai/chat/addressGeocodingConfidencePolicy.js",
    "docs/ADDRESS_GEOCODING_CONFIDENCE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "web/src/App.jsx",
    "web/src/copilot/screenRegistry.js",
    "web/src/layout/NavDock.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelRows.jsx",
    "web/src/panels/room/useRoomVehicleTelematics.js",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/superadmin/TelematicsHubPanel.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "web/src/panels/room/OffersPanel.jsx",
    "web/src/panels/shared/OfferQualityRankingCard.jsx",
    "web/src/utils/offerQualityRanking.js",
    "backend/scripts/copilot_role_task_matrix_01_check.js",
    "backend/scripts/copilot_ai_action_roadmap_01_check.js",
    "backend/src/ai/chat/copilotRoleTaskMatrix.js",
    "backend/src/ai/chat/copilotAiActionRoadmap.js",
    "docs/COPILOT_ROLE_TASK_MATRIX_01.md",
    "docs/COPILOT_AI_ACTION_ROADMAP_01.md",
    "backend/scripts/copilot_demand_to_agreement_roadmap_01_check.js",
    "backend/src/ai/chat/copilotDemandToAgreementRoadmap.js",
    "docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md",
    "backend/scripts/copilot_excel_demand_import_01_check.js",
    "backend/src/ai/chat/copilotExcelDemandImportPolicy.js",
    "docs/COPILOT_EXCEL_DEMAND_IMPORT_01.md",
    "backend/scripts/copilot_human_approval_01_check.js",
    "backend/src/ai/chat/copilotHumanApprovalPolicy.js",
    "docs/COPILOT_HUMAN_APPROVAL_01.md",
    "backend/scripts/sefer_abi_terminal_humanize_01_check.js",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "docs/UX_SMOKE_PASS_MINUS_ZERO_01.md",
  ]);

  allWithin(status, exactAllowed, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/", "web/public/seferpakt-", "web/public/vardis-", "web/src/components/brand/"], "working tree stays within room/company shifts mobile card fix scope");
  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  mustNotList(status, "backend/prisma/", "backend schema/migration files are untouched");

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "prisma", "backend/prisma"]);
  must(routeDiff.length === 0, "backend route/service/schema diff stays empty");

  console.log("=== UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
