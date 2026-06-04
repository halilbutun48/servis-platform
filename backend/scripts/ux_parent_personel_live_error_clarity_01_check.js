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

function matches(file, needle) {
  return normalize(file).includes(normalize(needle));
}

function mustNotList(files, needle, label) {
  if (files.some((file) => matches(file, needle))) fail(label);
  ok(label);
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
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
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
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01_check.js",
    "backend/scripts/ux_mobile_all_roles_panel_audit_01.mjs",
    "docs/UX_MOBILE_ALL_ROLES_PANEL_AUDIT_01.md",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "web/src/layout/AppShell.jsx",
    "web/src/layout/NavDock.jsx",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
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
    "web/src/panels/room/roomShiftsPanelSections.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "tools/repo_contract_state.json",
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within parent/personel live error clarity validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames()
    .filter((file) => !cleanupScopeFiles.includes(file))
    .filter((file) => !file.startsWith("web/src/panels/room/") && file !== "backend/scripts/ux_room_panel_clarity_01_check.js" && file !== "backend/scripts/ux_premium_critical_fix_room_01_check.js" && file !== "docs/UX_ROOM_PANEL_CLARITY_01.md" && file !== "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md" && file !== "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js" && file !== "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md" && file !== "web/src/components/AgreementOpsBridgeCard.jsx" && file !== "web/src/panels/company/AgreementsPanel.jsx");
  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  mustNotList(status, "web/src/panels/room/", "room surfaces are untouched");
  mustNotList(status, "web/src/panels/company/", "company surfaces are untouched");
  mustNotList(status, "web/src/components/ShiftOperationEventsModal.jsx", "shift operation modal is untouched");
  mustNotList(status, "web/src/components/ShiftReassignModal.jsx", "shift reassign modal is untouched");

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
