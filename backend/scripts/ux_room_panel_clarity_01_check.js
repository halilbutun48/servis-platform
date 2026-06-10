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

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function stagedNames() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function mustNotList(files, needle, label) {
  const hit = files.some((file) => normalize(file).includes(normalize(needle)));
  if (hit) fail(label);
  ok(label);
}

function main() {
  console.log("=== UX-ROOM-PANEL-CLARITY-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_ROOM_PANEL_CLARITY_01.md");

  const shiftsPanel = read("web/src/panels/room/ShiftsPanel.jsx");
  const shiftsOverview = read("web/src/panels/room/roomShiftsOverviewSection.jsx");
  const shiftsSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const agreementsPanel = read("web/src/panels/room/AgreementsPanel.jsx");
  const agreementSections = read("web/src/panels/room/roomAgreementsPanelSections.jsx");
  const commercialFlow = read("web/src/panels/room/CommercialFlowPanel.jsx");
  const operationHealth = read("web/src/panels/room/OperationHealthPanel.jsx");
  const bridgeCard = read("web/src/components/AgreementOpsBridgeCard.jsx");
  const roomOpsBoard = read("web/src/panels/room/roomOperationsBoard.jsx");

  must(pkg, '"check:uxroompanelclarity01": "node backend/scripts/ux_room_panel_clarity_01_check.js"', "package.json exposes room panel clarity check");
  must(runner, "check:uxroompanelclarity01", "product extensions runner includes room panel clarity check");
  must(verify, "check:uxroompanelclarity01", "verify chain includes room panel clarity check");
  must(harnessCheck, "docs/UX_ROOM_PANEL_CLARITY_01.md", "script harness check knows room panel clarity doc");
  must(harnessCheck, "UX-ROOM-PANEL-CLARITY-01", "script harness check knows room panel clarity milestone");
  must(harnessDoc, "docs/UX_ROOM_PANEL_CLARITY_01.md", "script harness doc lists room panel clarity doc");
  must(harnessDoc, "check:uxroompanelclarity01", "script harness doc lists room panel clarity check");
  must(guide, "UX-ROOM-PANEL-CLARITY-01", "milestone guide mentions room panel clarity milestone");
  must(guide, "check:uxroompanelclarity01", "milestone guide exposes room panel clarity check");
  must(guide, "node backend\\scripts\\ux_room_panel_clarity_01_check.js", "milestone guide includes room panel clarity command");

  must(doc, "UX-ROOM-PANEL-CLARITY-01", "room clarity doc title present");
  must(doc, "Room / Vardiyalar", "room clarity doc covers shifts surface");
  must(doc, "Room / Sözleşmeler", "room clarity doc covers agreements surface");
  must(doc, "Room / Ticari Akış", "room clarity doc covers commercial flow surface");
  must(doc, "Operasyon Sağlığı", "room clarity doc covers operation health surface");
  must(doc, "Özet üstte", "room clarity doc keeps summary-first wording");
  must(doc, "Ana aksiyonlar", "room clarity doc keeps action visibility wording");
  must(doc, "Detayı aç", "room clarity doc keeps clear detail CTA wording");
  must(doc, "Sistem kanıtı", "room clarity doc keeps controlled technical detail wording");
  must(doc, "Browser-smoke artifact commit'e alınmaz", "room clarity doc keeps browser-smoke boundary");
  must(doc, "Runtime-data commit'e alınmaz", "room clarity doc keeps runtime-data boundary");
  must(doc, "BLOCKER / NOT-FOUND kapatıcıdır", "room clarity doc keeps hard-fail policy");
  must(doc, "AUTH-BLOCKED", "room clarity doc keeps auth-blocked policy");
  must(doc, "UX-FIX coverage gap", "room clarity doc keeps coverage-gap wording");
  must(doc, "Bu milestone yeni business flow eklemez.", "room clarity doc keeps no-business-flow boundary");

  must(shiftsPanel, "Vardiya ID", "room shifts panel uses safe id labels");
  must(shiftsPanel, "Araç ID", "room shifts panel uses safe vehicle id labels");
  must(shiftsPanel, "Sürücü ID", "room shifts panel uses safe driver id labels");
  must(shiftsPanel, "Sözleşme ID", "room shifts panel uses safe agreement id labels");

  must(shiftsOverview, "Vardiya Özeti", "room shifts overview title present");
  mustNot(shiftsOverview, "Shifts (ROOM) · Room / Vardiyalar", "room shifts overview removes duplicate legacy title");
  must(shiftsOverview, "Özet üstte; karar, dispatch ve rota önizleme tablarda kalır.", "room shifts overview keeps summary-first copy");
  must(shiftsOverview, "Vardiya ID", "room shifts overview uses safe preview labels");

  must(
    shiftsSections,
    "showDispatchApplyAction = Boolean(data)",
    "room shifts dispatch action is visible in critical fix scope"
  );
  must(shiftsSections, "Önizlemeyi Uygula: Böl & Onayla", "room shifts dispatch apply CTA present");
  must(shiftsSections, "Bölme önizlemesini yenile", "room shifts dispatch preview refresh CTA present");
  must(shiftsSections, "Bölme önizlemesi oluştur", "room shifts dispatch preview create CTA present");
  must(shiftsSections, "Tüm öneriler hazır. Önizlemeyi uygulayabilirsin.", "room shifts dispatch success hint present");

  must(agreementsPanel, "Room / Sözleşmeler", "room agreements title present");
  must(agreementsPanel, "Detayı aç", "room agreements detail CTA present");
  must(agreementsPanel, "Sözleşme ID", "room agreements uses safe contract id labels");
  must(agreementsPanel, "Araç ID", "room agreements uses safe vehicle id labels");
  must(agreementsPanel, "Sürücü ID", "room agreements uses safe driver id labels");
  must(agreementsPanel, "Vardiya ID", "room agreements uses safe shift id labels");
  mustNot(agreementsPanel, "Sözleşme #", "room agreements removes hash-based contract labels");
  mustNot(agreementsPanel, "Talep #", "room agreements removes hash-based request labels");

  must(agreementSections, "Sözleşme ID", "agreement route sections use safe contract labels");
  must(agreementSections, "Talep ID", "agreement route sections use safe request labels");
  must(agreementSections, "Mevcut Rota", "agreement route sections keep current preview label");
  must(agreementSections, "Önerilen Yeni Rota", "agreement route sections keep proposed preview label");
  must(agreementSections, "Önceki Rota", "agreement route sections keep previous route label");
  must(agreementSections, "Uygulanan Yeni Rota", "agreement route sections keep applied route label");
  mustNot(agreementSections, "Sözleşme #", "agreement route sections remove hash contract labels");
  mustNot(agreementSections, "Talep #", "agreement route sections remove hash request labels");

  must(commercialFlow, "Ticari Akış", "commercial flow title present");
  must(commercialFlow, "FlowSummaryStrip", "commercial flow keeps summary strip");
  must(commercialFlow, "CollapsibleSection", "commercial flow keeps controlled detail sections");
  must(commercialFlow, "Operasyon Sağlığı", "commercial flow still links operation health");

  must(operationHealth, "Operasyon Sağlığı", "operation health title present");
  must(operationHealth, "Canlı Sağlık ve Risk Özeti", "operation health summary-first copy present");
  must(operationHealth, "Düşük canlılık / Çevrim dışı", "operation health uses safe health labels");
  must(operationHealth, "Kanıt / Rehber", "operation health keeps evidence guide tab");

  must(bridgeCard, "Oda ID", "agreement ops bridge card uses safe room labels");
  must(bridgeCard, "Araç ID", "agreement ops bridge card uses safe vehicle labels");
  must(bridgeCard, "Sürücü ID", "agreement ops bridge card uses safe driver labels");
  must(bridgeCard, "Detayı aç", "agreement ops bridge card keeps detail CTA");

  must(roomOpsBoard, "Operasyon Özeti", "room operations board title present");
  must(roomOpsBoard, "Personel ID", "room operations board uses safe personnel labels");
  must(roomOpsBoard, "vardiya ID", "room operations board uses safe shift detail labels");
  must(roomOpsBoard, "Düşük canlılık", "room operations board uses localized stale wording");

  const staged = stagedNames();
  const stagedAllowed = new Set([
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/quality_gate_final_01_check.js",
    "backend/scripts/public_landing_platform_first_01_check.js",
    "backend/scripts/public_landing_final_promise_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "docs/UX_ROOM_PANEL_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
    "docs/INVITE_BASED_MEMBERSHIP_01.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/PUBLIC_LANDING_01.md",
    "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
    "docs/PRIMER_SSOT.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "backend/src/kvkk/matrix.js",
    "tools/repo_contract_state.json",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/product_flow_button_audit_01_check.js",
    "backend/scripts/product_flow_button_audit_01.mjs",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/invite_based_membership_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/roadmap_lock_ai_marketplace_01_check.js",
    "backend/scripts/verified_supplier_01_check.js",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "docs/QUALITY_GATE_FINAL_01.md",
    "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
    "package.json",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/companyShiftsPanelSections.jsx",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/components/map/ReadableMiniRouteMap.jsx",
    "web/src/index.css",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/organization/PlansPanel.jsx",
    "web/src/panels/organization/organizationPlansShared.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
    "backend/scripts/final_ux_smoke_01_check.js",
    "backend/scripts/onboarding_review_final_audit_01_check.js",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/ux_brand_login_premium_01_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "docs/PRIMER_SSOT.md",
    "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/VERIFIED_SUPPLIER_01.md",
    "package.json",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
    "backend/scripts/ux_marketplace_panels_01_check.js",
    "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
    "docs/UX_MARKETPLACE_PANELS_01.md",
    "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
    "backend/scripts/mobile_web_final_01_check.js",
    "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
    "docs/MOBILE_WEB_FINAL_01.md",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within room panel clarity validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  console.log("=== UX-ROOM-PANEL-CLARITY-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
