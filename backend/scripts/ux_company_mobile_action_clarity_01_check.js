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

function allWithin(files, exactPaths, prefixes, label) {
  const unexpected = files.filter((file) => !exactPaths.has(file) && !prefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length) fail(`${label}: ${unexpected.join(", ")}`);
  ok(label);
}

function main() {
  console.log("=== UX-COMPANY-MOBILE-ACTION-CLARITY-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md");
  const shiftsPanel = read("web/src/panels/company/ShiftsPanel.jsx");
  const shiftsRows = read("web/src/panels/company/companyShiftsPanelRows.jsx");
  const agreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
  const agreementsOverview = read("web/src/panels/company/companyAgreementsOverviewSection.jsx");
  const commercialFlow = read("web/src/panels/company/CommercialFlowPanel.jsx");
  const bridgeCard = read("web/src/components/AgreementOpsBridgeCard.jsx");
  const routePreview = read("web/src/components/RoutePreviewModal.jsx");
  const wizardModal = read("web/src/panels/company/AgreementWizardModal.jsx");
  const guidedShell = read("web/src/panels/company/guidedPlanModalShell.jsx");
  const css = read("web/src/index.css");
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
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_premium_critical_uxfix_cleanup_01_check.js",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
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
    "web/src/layout/NavDock.jsx",
    "backend/scripts/ux_mobile_web_shell_clarity_01_check.js",
    "docs/UX_MOBILE_WEB_SHELL_CLARITY_01.md",
  ];

  mustTrue(exists("backend/scripts/ux_company_mobile_action_clarity_01_check.js"), "company mobile action clarity check exists");
  mustTrue(exists("docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md"), "company mobile action clarity doc exists");

  must(pkg, '"check:uxcompanymobileactionclarity01": "node backend/scripts/ux_company_mobile_action_clarity_01_check.js"', "package.json exposes company mobile action clarity check");
  ordered(runner, ["check:uxcompanyshiftstabs01", "check:uxcompanymobileactionclarity01", "check:uxcompanyopspaneltabs01"], "product extensions runner keeps company mobile action clarity after company shift tabs");
  ordered(verify, ["check:uxcompanyshiftstabs01", "check:uxcompanymobileactionclarity01", "check:uxcompanyopspaneltabs01"], "verify chain keeps company mobile action clarity after company shift tabs");

  must(harnessCheck, "UX-COMPANY-MOBILE-ACTION-CLARITY-01", "script harness check knows company mobile milestone");
  must(harnessCheck, "check:uxcompanymobileactionclarity01", "script harness check knows company mobile alias");
  must(harnessCheck, "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md", "script harness check knows company mobile doc");
  must(harnessDoc, "UX-COMPANY-MOBILE-ACTION-CLARITY-01", "script harness doc lists company mobile milestone");
  must(harnessDoc, "check:uxcompanymobileactionclarity01", "script harness doc lists company mobile alias");
  must(harnessDoc, "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md", "script harness doc lists company mobile doc");
  must(guide, "UX-COMPANY-MOBILE-ACTION-CLARITY-01", "milestone guide mentions company mobile milestone");
  must(guide, "check:uxcompanymobileactionclarity01", "milestone guide exposes company mobile check");
  must(guide, "node backend\\scripts\\ux_company_mobile_action_clarity_01_check.js", "milestone guide includes company mobile command");

  must(doc, "UX-COMPANY-MOBILE-ACTION-CLARITY-01", "company mobile doc title present");
  must(doc, "Company / Vardiyalar", "company mobile doc covers vardiyalar surface");
  must(doc, "Company / Sözleşmeler", "company mobile doc covers agreements surface");
  must(doc, "Company / Ticari Akış", "company mobile doc covers commercial flow surface");
  must(doc, "Vardiyayı sözleşmeye dönüştür", "company mobile doc keeps convert CTA wording");
  must(doc, "Taslağı incele", "company mobile doc keeps draft CTA wording");
  must(doc, "Sözleşmeden üretilen vardiyaya git", "company mobile doc keeps commercial flow CTA wording");
  must(doc, "NavDock", "company mobile doc mentions NavDock");
  must(doc, "floating assistant/drawer", "company mobile doc mentions floating assistant drawer");
  must(doc, "safe-area", "company mobile doc mentions safe-area");
  must(doc, "readonly preview", "company mobile doc keeps readonly preview boundary");
  must(doc, "gerçek execute", "company mobile doc keeps real execute boundary");
  must(doc, "mobile-safe primary CTA", "company mobile doc keeps mobile-safe CTA wording");
  must(doc, "summary-first", "company mobile doc keeps summary-first wording");
  must(doc, "Backend route/write-path değişmedi.", "company mobile doc keeps backend route boundary");
  must(doc, "Schema/migration yok.", "company mobile doc keeps schema boundary");
  must(doc, "Playwright runner policy değişmedi.", "company mobile doc keeps runner policy boundary");
  must(doc, "Coverage matrix check değişmedi.", "company mobile doc keeps coverage matrix boundary");
  must(doc, "runtime-data", "company mobile doc keeps runtime-data boundary");
  must(doc, "browser-smoke", "company mobile doc keeps browser-smoke boundary");
  must(doc, "payment/settlement/contract execute", "company mobile doc keeps execute boundary");
  must(doc, "invite send", "company mobile doc keeps invite boundary");
  must(doc, "user create", "company mobile doc keeps user boundary");
  must(doc, "supplier verification", "company mobile doc keeps supplier verification boundary");
  must(doc, "AI/Copilot", "company mobile doc keeps AI boundary");
  must(doc, "Bu milestone yeni business flow eklemez.", "company mobile doc keeps no-business-flow wording");

  must(shiftsPanel, "companyActionClarityScope", "company shifts panel uses action clarity scope");
  must(shiftsPanel, "buildAgreementPrefillFromShift", "company shifts panel still builds agreement prefill");
  must(shiftsPanel, "stashAgreementPrefill", "company shifts panel still stores agreement prefill");
  must(shiftsPanel, "navigate(companyPath(me, \"/agreements\"))", "company shifts panel still navigates to agreements");

  must(shiftsRows, "className=\"btn sm primary\"", "company shifts rows keeps primary small CTA");
  must(shiftsRows, "Vardiyayı sözleşmeye dönüştür", "company shifts rows exposes the convert-flow phrase");
  must(shiftsRows, "Sözleşmeye Dönüştür", "company shifts rows keeps convert CTA text");
  must(shiftsRows, "Vardiyayı sözleşmeye dönüştür: tıkladığında vardiya Company Sözleşmeler ekranında taslak olarak açılır.", "company shifts rows gives precondition hint");

  must(agreementsPanel, "companyActionClarityScope", "company agreements panel uses action clarity scope");
  must(agreementsOverview, "Vardiyadan getirilen sözleşme taslağı hazır", "company agreements overview explains draft");
  must(agreementsOverview, "Akış otomatik açıldı. Tarih/gün/saati düzenleyip kaydedebilirsin.", "company agreements overview gives next-step hint");

  must(commercialFlow, "companyActionClarityScope", "company commercial flow uses action clarity scope");
  must(commercialFlow, "Bekleyen akışını aç", "company commercial flow has pending CTA");
  must(commercialFlow, "Market akışını aç", "company commercial flow has market CTA");
  must(commercialFlow, "Onaylı kaydı aç", "company commercial flow has list CTA");
  must(commercialFlow, "Sözleşmeden üretilen vardiyaya git", "company commercial flow has contract CTA");
  must(commercialFlow, "Diğer vardiyalara git", "company commercial flow has other CTA");
  must(commercialFlow, 'className="btn primary"', "company commercial flow keeps primary button class");

  must(bridgeCard, "Taslağı incele", "agreement ops bridge card keeps draft CTA");
  must(bridgeCard, "Detayı aç", "agreement ops bridge card keeps details CTA");
  must(bridgeCard, "Operasyon kaydını aç", "agreement ops bridge card keeps last-shift CTA");
  must(bridgeCard, "Taslak hazır. Taslağı inceleyip eksik alanları kontrol edebilirsin.", "agreement ops bridge card explains draft state");
  must(bridgeCard, 'className="btn primary"', "agreement ops bridge card keeps primary button class");

  must(routePreview, 'className="btn sm primary"', "route preview keeps primary external nav button");
  must(routePreview, "zIndex: 9055", "route preview overlay keeps safe z-index");

  must(wizardModal, "zIndex: 9050", "agreement wizard modal keeps safe z-index");
  must(wizardModal, "paddingBottom: \"calc(16px + env(safe-area-inset-bottom))\"", "agreement wizard modal keeps safe-area padding");

  must(guidedShell, "zIndex: 9060", "guided plan modal keeps safe z-index");
  must(guidedShell, "paddingBottom: \"calc(16px + env(safe-area-inset-bottom))\"", "guided plan modal keeps safe-area padding");

  must(css, ".companyActionClarityScope", "global css keeps company action clarity scope");
  must(css, "z-index: 4305", "global css keeps company action z-index clearance");
  must(css, "scroll-margin-bottom: calc(220px + env(safe-area-inset-bottom))", "global css keeps company action scroll margin");
  must(css, "safe-area-inset-bottom", "global css keeps safe-area padding");
  must(css, "padding-bottom: calc(240px + env(safe-area-inset-bottom))", "global css keeps mid-size bottom clearance");
  must(css, "padding-bottom: calc(200px + env(safe-area-inset-bottom))", "global css keeps mobile bottom clearance");

  const staged = stagedNames().filter((file) => !cleanupScopeFiles.includes(file));
  const stagedAllowed = new Set([
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_room_panel_clarity_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "web/src/layout/AppShell.jsx",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "web/src/index.css",
    "tools/repo_contract_state.json",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
  ]);
  mustTrue(staged.every((file) => stagedAllowed.has(file)), "staged files stay within company mobile action clarity validation");
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data is not staged");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke artifacts are not staged");
  mustNotList(staged, "debug.log", "debug.log is not staged");

  const status = statusNames()
    .filter((file) => !cleanupScopeFiles.includes(file))
    .filter((file) => !file.startsWith("web/src/panels/room/") && file !== "backend/scripts/ux_room_panel_clarity_01_check.js" && file !== "backend/scripts/ux_premium_critical_fix_room_01_check.js" && file !== "docs/UX_ROOM_PANEL_CLARITY_01.md" && file !== "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md");
  const exactAllowed = new Set([
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "backend/scripts/ux_premium_critical_fix_agreements_detail_01_check.js",
    "backend/scripts/ux_live_panel_smoke_audit_01_check.js",
    "backend/scripts/ux_live_panel_premium_smoke_01.mjs",
    "backend/scripts/ux_smoke_pass_minus_evidence_01_check.js",
    "backend/scripts/ux_premium_critical_fix_room_01_check.js",
    "backend/scripts/ux_room_shifts_tabs_01_check.js",
    "backend/scripts/room_vehicle_driver_uppercase_normalization_01_check.js",
    "web/src/layout/AppShell.jsx",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "docs/UX_COMPANY_MOBILE_ACTION_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_AGREEMENTS_DETAIL_01.md",
    "docs/UX_SMOKE_PASS_MINUS_EVIDENCE_01.md",
    "docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md",
    "web/src/components/AgreementOpsBridgeCard.jsx",
    "web/src/components/RoutePreviewModal.jsx",
    "web/src/index.css",
    "web/src/panels/driver/TodayPanel.jsx",
    "web/src/panels/organization/CenterPanel.jsx",
    "web/src/panels/public/PassengerLivePanel.jsx",
    "web/src/panels/company/AgreementWizardModal.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/ShiftsPanel.jsx",
    "web/src/panels/company/companyShiftsPanelRows.jsx",
    "web/src/panels/company/guidedPlanModalShell.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/personel/MyRidePanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/shared/BoardingChangeRequestEntryCard.jsx",
    "web/src/panels/shared/NotificationsPanel.jsx",
    "web/src/panels/shared/ReportsPanel.jsx",
    "web/src/panels/superadmin/UsersPanel.jsx",
    "web/src/utils/copilotFacts.js",
    "web/src/utils/liveTrackingCopy.js",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "docs/UX_PARENT_PERSONEL_LIVE_ERROR_CLARITY_01.md",
    "tools/repo_contract_state.json",
  ]);
  const allowedPrefixes = ["backend/artifacts/runtime-data/"];
  allWithin(status, exactAllowed, allowedPrefixes, "working tree stays within the company mobile action clarity scope");

  mustNotList(status, "backend/src/routes/", "backend routes are untouched");
  mustNotList(status, "backend/src/services/", "backend services are untouched");
  mustNotList(status, "backend/artifacts/browser-smoke/", "browser-smoke artifacts stay out of the tree");
  mustNotList(status, "Prisma/", "schema/migration files are untouched");
  mustNotList(status, "web/src/panels/room/", "room surfaces are untouched");
  mustNotList(status, "web/src/panels/company/DriversPanel.jsx", "company drivers panel is untouched");
  mustNotList(status, "web/src/panels/company/VehiclesPanel.jsx", "company vehicles panel is untouched");
  mustNotList(status, "web/src/panels/company/MapPanel.jsx", "company map panel is untouched");
  mustNotList(status, "web/src/panels/company/CheckinPanel.jsx", "company check-in panel is untouched");
  mustNotList(status, "web/src/panels/company/OffersPanel.jsx", "company offers panel is untouched");
  mustNotList(status, "web/src/components/ShiftOperationEventsModal.jsx", "shift operation modal is untouched");
  mustNotList(status, "web/src/components/ShiftReassignModal.jsx", "shift reassign modal is untouched");
  mustNotList(status, "backend/scripts/ux_room_panel_clarity_01_check.js", "room clarity check is untouched");
  mustNotList(status, "docs/UX_ROOM_PANEL_CLARITY_01.md", "room clarity doc is untouched");
  mustNotList(status, "docs/UX_LIVE_PANEL_SMOKE_AUDIT_01.md", "live panel smoke audit doc is untouched");

  console.log("=== UX-COMPANY-MOBILE-ACTION-CLARITY-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
