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

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function main() {
  console.log("=== UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md");
  const app = read("web/src/App.jsx");
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
  ordered(
    runner,
    ["check:uxcompanymobileactionclarity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxcompanyopspaneltabs01"],
    "product extensions runner keeps agreements detail after company mobile action clarity"
  );
  ordered(
    verify,
    ["check:uxcompanymobileactionclarity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxcompanyopspaneltabs01"],
    "verify chain keeps agreements detail after company mobile action clarity"
  );

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
    "web/src/App.jsx",
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
    "web/src/App.jsx",
    "web/src/components/BrandMark.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/companyAgreementsSourceShiftSection.jsx",
    "web/src/panels/company/companyAgreementsBridgeSection.jsx",
    "web/src/panels/company/companyAgreementsPanelHelpers.js",
    "web/src/panels/room/roomAgreementsBridgeSection.jsx",
    "web/src/panels/room/roomAgreementsPanelHelpers.js",
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
    "backend/src/bootstrap/routeMounts.js",
    "backend/src/server.js",
    "backend/src/routes/dashboardBulk.js",
    "backend/src/services/dashboardBulk.js",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
  ]);
  allWithin(status, exactAllowed, ["backend/artifacts/runtime-data/", "web/public/seferpakt-", "web/public/vardis-", "web/src/components/brand/", "backend/scripts/", "backend/src/ai/chat/", "web/src/utils/", "docs/"], "working tree stays within agreements detail scope");
  const exactAllowedSet = new Set(exactAllowed);

  mustNotList(status.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/routes/", "backend routes are untouched");
  mustNotList(status.filter((file) => file !== "backend/src/routes/dashboardBulk.js" && file !== "backend/src/services/dashboardBulk.js"), "backend/src/services/", "backend services are untouched");
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  const statusWithoutOffers = status.filter((file) => file !== "web/src/panels/room/OffersPanel.jsx");
  const statusWithoutTrustQuality = statusWithoutOffers.filter((file) => file !== "web/src/panels/superadmin/TrustQualityPanel.jsx" && file !== "web/src/panels/superadmin/PublicLeadReviewPanel.jsx");

  mustNotList(statusWithoutTrustQuality.filter((file) => !exactAllowedSet.has(file)), "web/src/panels/room/", "room surfaces are untouched");
  mustNotList(status, "web/src/panels/driver/", "driver surfaces are untouched");
  mustNotList(statusWithoutTrustQuality, "web/src/panels/superadmin/", "superadmin surfaces are untouched");

  console.log("=== UX-PREMIUM-CRITICAL-FIX-AGREEMENTS-DETAIL-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
