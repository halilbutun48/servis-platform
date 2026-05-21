#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
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

function must(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log("=== UX-ROOM-SHIFTS-TABS-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxroomshiftstabs01"', "package.json exposes check:uxroomshiftstabs01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxroomshiftstabs01", "product extensions runner includes UX-ROOM-SHIFTS-TABS-01");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxroomshiftstabs01", "verify chain includes UX-ROOM-SHIFTS-TABS-01");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-ROOM-SHIFTS-TABS-01", "script guide mentions UX-ROOM-SHIFTS-TABS-01");
  mustContains(guide, "check:uxroomshiftstabs01", "script guide exposes check:uxroomshiftstabs01");

  const audit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(audit, "UX-ROOM-SHIFTS-TABS-01", "structure audit includes room shifts tabs note");
  must(!normalize(audit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(audit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(audit).includes("migration"), "structure audit avoids migration");

  const panel = read("web/src/panels/room/ShiftsPanel.jsx");
  const mainSections = read("web/src/panels/room/roomShiftsMainSections.jsx");
  const overview = read("web/src/panels/room/roomShiftsOverviewSection.jsx");
  const panelSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const rows = read("web/src/panels/room/roomShiftsPanelRows.jsx");

  mustContains(panel, 'const [shiftsTab, setShiftsTab] = useState("pending")', "Room ShiftsPanel has tab state");
  mustContains(panel, "userSelectedShiftsTabRef", "Room ShiftsPanel keeps user selection guard");
  mustContains(panel, 'if (tabCounts.pending > 0) return "pending";', "Room ShiftsPanel default tab prefers pending");
  mustContains(panel, 'if (tabCounts.contract > 0) return "contract";', "Room ShiftsPanel default tab prefers contract");
  mustContains(panel, 'return "other";', "Room ShiftsPanel default tab falls back to other");
  mustContains(panel, 'setShiftsTab("pending")', "Room ShiftsPanel can jump to pending tab from focus state");
  mustContains(panel, 'setShiftsTab("contract")', "Room ShiftsPanel can jump to contract tab from focus state");
  mustContains(panel, "pendingCount={tabCounts.pending}", "Room ShiftsPanel keeps pending count band");
  mustContains(panel, "contractCount={tabCounts.contract}", "Room ShiftsPanel keeps contract count band");
  mustContains(panel, "otherCount={tabCounts.other}", "Room ShiftsPanel keeps other count band");
  mustContains(panel, "activeTab={shiftsTab}", "Room ShiftsPanel passes active tab to main sections");
  mustNotContains(panel, "listStatus", "Room ShiftsPanel no longer uses listStatus");
  mustNotContains(panel, "listQ", "Room ShiftsPanel no longer uses listQ");
  mustNotContains(panel, "onlyAgreement", "Room ShiftsPanel no longer uses onlyAgreement");
  mustNotContains(panel, "Tüm Vardiyalar", "Room ShiftsPanel removes the old all-rows label");
  mustNotContains(panel, "Sadece sözleşmeli vardiyalar", "Room ShiftsPanel removes the contract-only checkbox label");

  mustContains(mainSections, "PanelSegmentTabs", "Room Shifts main sections use segmented tabs");
  mustContains(mainSections, 'tabs={[', "Room Shifts main sections define a tab list");
  mustContains(mainSections, 'key: "pending"', "Room Shifts main sections include pending tab");
  mustContains(mainSections, 'key: "contract"', "Room Shifts main sections include contract tab");
  mustContains(mainSections, 'key: "other"', "Room Shifts main sections include other tab");
  mustContains(mainSections, "Bekleyen Talepler", "Room Shifts main sections keep pending label");
  mustContains(mainSections, "Sözleşmeden Üretilen", "Room Shifts main sections keep contract label");
  mustContains(mainSections, "Diğer Vardiyalar", "Room Shifts main sections keep other label");
  mustContains(mainSections, 'activeTab === "pending"', "Room Shifts main sections render pending branch conditionally");
  mustContains(mainSections, 'activeTab === "contract"', "Room Shifts main sections render contract branch conditionally");
  mustContains(mainSections, 'activeTab === "other"', "Room Shifts main sections render other branch conditionally");
  mustContains(mainSections, "RoomPendingSection", "Room Shifts main sections render pending section");
  mustContains(mainSections, "RoomFinalListSection", "Room Shifts main sections render final list sections");
  must(countMatches(mainSections, /RoomFinalListSection/g) >= 2, "Room Shifts main sections render two final list sections");
  mustNotContains(mainSections, "Tüm Vardiyalar", "Room Shifts main sections remove old all-rows label");
  mustNotContains(mainSections, "Sadece sözleşmeli vardiyalar", "Room Shifts main sections remove contract-only checkbox label");

  mustContains(overview, "Shifts (ROOM)", "Room Shifts overview keeps panel title");
  mustContains(overview, "pendingCount", "Room Shifts overview keeps pending count");
  mustContains(overview, "contractCount", "Room Shifts overview keeps contract count");
  mustContains(overview, "otherCount", "Room Shifts overview keeps other count");

  mustContains(panelSections, "Bekleyen Talepler", "Room Shifts panel sections keep pending heading");
  mustNotContains(panelSections, "Sadece sözleşmeli vardiyalar", "Room Shifts panel sections remove contract-only checkbox");
  mustContains(panelSections, "RoomFinalListSection", "Room Shifts panel sections keep final list section");

  mustContains(rows, "Rota Önizleme", "Room Shifts rows keep route preview action");
  mustContains(rows, "İşlem Kaydı", "Room Shifts rows keep operation log action");
  mustContains(rows, "Atamayı Değiştir", "Room Shifts rows keep reassign action");

  must(!normalize(panel).includes("runtime-data"), "Room ShiftsPanel avoids runtime-data");
  must(!normalize(panel).includes("prisma"), "Room ShiftsPanel avoids prisma");
  must(!normalize(panel).includes("migration"), "Room ShiftsPanel avoids migration");

  console.log("=== UX-ROOM-SHIFTS-TABS-01 CHECK PASS ===");
}

main();
