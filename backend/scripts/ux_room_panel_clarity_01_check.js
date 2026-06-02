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

  must(shiftsOverview, "Room / Vardiyalar", "room shifts overview title present");
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
    "docs/UX_ROOM_PANEL_CLARITY_01.md",
    "docs/UX_PREMIUM_CRITICAL_FIX_ROOM_01.md",
    "backend/scripts/ux_superadmin_panel_clarity_01_check.js",
    "package.json",
    "backend/scripts/run_product_extensions_check_chain.js",
    "backend/scripts/verify_chain_01_product_extensions_check.js",
    "backend/scripts/script_harness_consolidation_01_check.js",
    "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md",
    "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md",
    "backend/scripts/ux_company_mobile_action_clarity_01_check.js",
    "backend/scripts/ux_parent_personel_live_error_clarity_01_check.js",
    "backend/scripts/ux_panel_standard_architecture_01_check.js",
    "web/src/index.css",
    "web/src/panels/room/AgreementsPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/RoomDriversEditModal.jsx",
    "web/src/panels/room/RoomDriversShiftsTable.jsx",
    "web/src/panels/room/RoomDriversStatusTable.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/room/roomShiftsPanelSections.jsx",
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
