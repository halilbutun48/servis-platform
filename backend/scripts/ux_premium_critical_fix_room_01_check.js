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

function main() {
  console.log("=== UX-PREMIUM-CRITICAL-FIX-ROOM-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
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
    "backend/scripts/m44_telematics_t1_t5_check.js",
    "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
    "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/src/kvkk/matrix.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_UXFIX_CLEANUP_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "package.json",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/checkin/CameraQrScannerCard.jsx",
    "web/src/index.css",
    "web/src/layout/AppShell.jsx",
    "web/src/panels/company/OperationsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/school/OperationsPanel.jsx",
    "web/src/panels/superadmin/OperationsPanel.jsx",
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "backend/scripts/ux_superadmin_overview_cleanup_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "web/src/panels/company/AgreementsPanel.jsx",
    "docs/DB_SCHEMA_V1.md",
    "docs/M44_TELEMATICS_T1_T5.md",
    "backend/scripts/telematics_provider_hub_01_check.js",
    "docs/TELEMATICS_PROVIDER_HUB_01.md",
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/shared/PanelKvkkHint.jsx",
    "web/src/panels/superadmin/AuditLogsPanel.jsx",
    "web/src/utils/regionOwnership.js",
  ];

  mustTrue(exists("backend/scripts/ux_premium_critical_fix_room_01_check.js"), "room critical fix check exists");
  mustTrue(exists("docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md"), "room critical fix doc exists");

  must(pkg, '"check:uxpremiumcriticalfixroom01": "node backend/scripts/ux_premium_critical_fix_room_01_check.js"', "package.json exposes room critical fix check");
  must(runner, "check:uxpremiumcriticalfixroom01", "product extensions runner includes room critical fix check");
  must(verify, "check:uxpremiumcriticalfixroom01", "verify chain includes room critical fix check");

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
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within room critical fix validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames().filter((file) => !cleanupScopeFiles.includes(file));
  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  mustNotList(status, "web/src/panels/company/DriversPanel.jsx", "company drivers panel is untouched");
  mustNotList(status, "web/src/panels/company/VehiclesPanel.jsx", "company vehicles panel is untouched");
  mustNotList(status, "web/src/panels/company/MapPanel.jsx", "company map panel is untouched");
  mustNotList(status, "web/src/panels/company/CheckinPanel.jsx", "company check-in panel is untouched");
  mustNotList(status, "web/src/panels/company/OffersPanel.jsx", "company offers panel is untouched");
  mustNotList(status, "web/src/panels/parent/", "parent surfaces are untouched");
  mustNotList(status, "web/src/panels/personel/", "personel surfaces are untouched");
  mustNotList(status, "web/src/panels/superadmin/", "superadmin surfaces are untouched");
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
