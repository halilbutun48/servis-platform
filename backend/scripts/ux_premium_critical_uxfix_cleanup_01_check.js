#!/usr/bin/env node

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
      "web/src/App.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
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
    "web/src/panels/driver/CheckinPanel.jsx",
    "web/src/panels/driver/RoutePanel.jsx",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/roomShiftsOverviewSection.jsx",
    "web/src/panels/room/roomShiftsMainSections.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/panels/room/roomShiftsPanelRows.jsx",
    "web/src/panels/room/roomVehiclesPanelCards.jsx",
    "web/src/panels/room/roomVehiclesPanelSections.jsx",
    "web/src/panels/room/RoomDriversQuickPenaltyCard.jsx",
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
  mustContains(runner, "'check:uxpremiumcriticaluxfixcleanup01'", "product extensions runner includes cleanup check");
  mustContains(verify, '"check:uxpremiumcriticaluxfixcleanup01"', "verify chain exposes cleanup check");
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

  const staged = stagedNames().filter((file) => !cleanupScopeFiles.includes(file));
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames().filter((file) => !cleanupScopeFiles.includes(file));
  allWithin(
    status,
    new Set([
      "backend/artifacts/runtime-data/password-change-requirements.json",
      "backend/artifacts/runtime-data/username-directory.json",
      "backend/artifacts/runtime-data/agreement-route-refresh-requests.json",
      "backend/artifacts/runtime-data/public-leads.json",
      "backend/artifacts/runtime-data/quality-review-decisions.json",
      "backend/scripts/copilot_stop_route_draft_01_check.js",
      "backend/src/ai/chat/copilotStopRouteDraftPolicy.js",
      "docs/COPILOT_STOP_ROUTE_DRAFT_01.md",
      "backend/scripts/ux_panel_inventory_02a_check.js",
      "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
      "backend/scripts/ux_room_company_shifts_mobile_card_fix_01_check.js",
      "backend/scripts/ux_brand_login_premium_01_check.js",
      "backend/scripts/onboarding_review_01_check.js",
      "backend/scripts/onboarding_review_final_audit_01_check.js",
      "backend/scripts/quality_gate_final_01_check.js",
      "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
      "backend/scripts/ux_company_personel_access_mobile_parity_01_check.js",
      "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
      "backend/scripts/ux_panel_standard_architecture_01_check.js",
      "backend/scripts/ux_shifts_responsive_layout_fix_01_check.js",
      "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md",
      "backend/scripts/ux_panel_standard_architecture_01_check.js",
      "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
      "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
      "backend/scripts/mobile_web_final_01_check.js",
      "backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js",
      "backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js",
      "backend/scripts/safe_drive_01_check.js",
      "backend/src/ai/jobGuide/screenCatalog.js",
      "docs/SAFE_DRIVE_01.md",
      "web/src/panels/company/MapPanel.jsx",
      "web/src/panels/driver/MapPanel.jsx",
      "web/src/panels/driver/RoutePanel.jsx",
      "web/src/panels/room/MapPanel.jsx",
      "web/src/panels/shared/SafeDriveSummaryCard.jsx",
      "web/src/utils/safeDriveSummary.js",
      "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
      "docs/MOBILE_WEB_FINAL_01.md",
      "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md",
      "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md",
      "docs/UX_PANEL_INVENTORY_02A_AUDIT.md",
      "docs/UX_PANEL_REALITY_AUDIT_02C.md",
      "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
      "docs/OFFER_RANKING_QUALITY_01.md",
      "docs/QUALITY_GATE_FINAL_01.md",
      "docs/UX_ROOM_COMPANY_SHIFTS_MOBILE_CARD_FIX_01.md",
      "docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md",
      "docs/ONBOARDING_REVIEW_01.md",
      "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md",
      "web/src/panels/company/companyAgreementsMobileCards.jsx",
      "backend/scripts/ux_room_shifts_density_dedup_01_check.js",
      "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md",
      "web/src/panels/company/companyShiftsPanelMobileCards.jsx",
      "web/src/panels/company/WorkflowPanel.jsx",
      "web/src/panels/company/companyShiftsPanelCards.jsx",
      "web/src/panels/room/roomShiftsPanelMobileCards.jsx",
      "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
      "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
      "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
      "backend/scripts/product_flow_button_audit_01_check.js",
      "backend/scripts/product_flow_button_audit_01.mjs",
      "docs/PRODUCT_FLOW_BUTTON_AUDIT_01.md",
      "web/src/layout/NavDock.jsx",
      "web/src/App.jsx",
      "web/src/copilot/screenRegistry.js",
      "web/src/components/BrandMark.jsx",
      "web/src/components/brand/SeferPaktLogo.jsx",
      "web/src/panels/company/PersonelAccessPanel.jsx",
      "web/src/panels/company/companyShiftsPanelSections.jsx",
      "web/src/panels/organization/CenterPanel.jsx",
      "web/src/panels/organization/PlansPanel.jsx",
      "web/src/panels/organization/organizationPlansShared.jsx",
      "web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx",
      "web/src/components/map/ReadableMiniRouteMap.jsx",
      "docs/UX_BRAND_LOGIN_PREMIUM_01.md",
      "docs/PUBLIC_LANDING_01.md",
      "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md",
      "backend/scripts/public_landing_platform_first_01_check.js",
      "backend/scripts/public_landing_final_promise_01_check.js",
      "web/public/vardis-logo.svg",
      "web/public/vardis-favicon.svg",
      "web/public/seferpakt-lockup.png",
      "web/public/seferpakt-app-icon.png",
      "web/public/seferpakt-favicon.png",
      "web/src/panels/room/roomVehiclesPanelRows.jsx",
      "web/src/panels/room/useRoomVehicleTelematics.js",
      "web/src/panels/superadmin/TelematicsHubPanel.jsx",
      "web/src/panels/superadmin/TrustQualityPanel.jsx",
      "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    ]), 
    ["backend/artifacts/runtime-data/", "web/public/seferpakt-", "web/public/vardis-", "web/src/components/brand/"],
    "working tree stays within cleanup scope"
  );

  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
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
