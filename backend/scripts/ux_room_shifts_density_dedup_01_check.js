#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(cond, label) {
  if (!cond) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
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

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function main() {
  console.log("=== UX-ROOM-SHIFTS-DENSITY-DEDUP-01 CHECK ===");

  const pkg = read("package.json");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md");
  const css = read("web/src/index.css");

  const shiftsPanel = read("web/src/panels/room/ShiftsPanel.jsx");
  const overview = read("web/src/panels/room/roomShiftsOverviewSection.jsx");
  const mainSections = read("web/src/panels/room/roomShiftsMainSections.jsx");
  const sections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const rows = read("web/src/panels/room/roomShiftsPanelRows.jsx");
  const cards = read("web/src/panels/room/roomShiftsPanelCards.jsx");
  const utils = read("web/src/panels/room/roomShiftsPanelUtils.js");

  mustContains(pkg, '"check:uxroomshiftsdensitydedup01": "node backend/scripts/ux_room_shifts_density_dedup_01_check.js"', "package.json exposes room shifts density dedup check");
  assertProductExtensionsIncludes("check:uxroomshiftsdensitydedup01", "product extensions registry includes room shifts density dedup check", registryScripts);
  mustContains(harnessCheck, "UX-ROOM-SHIFTS-DENSITY-DEDUP-01", "script harness check knows room shifts density dedup milestone");
  mustContains(harnessCheck, "check:uxroomshiftsdensitydedup01", "script harness check knows room shifts density dedup alias");
  mustContains(harnessCheck, "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md", "script harness check knows room shifts density dedup doc");
  mustContains(harnessDoc, "UX-ROOM-SHIFTS-DENSITY-DEDUP-01", "script harness doc lists room shifts density dedup milestone");
  mustContains(harnessDoc, "check:uxroomshiftsdensitydedup01", "script harness doc lists room shifts density dedup alias");
  mustContains(harnessDoc, "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md", "script harness doc lists room shifts density dedup doc");
  mustContains(guide, "UX-ROOM-SHIFTS-DENSITY-DEDUP-01", "milestone guide mentions room shifts density dedup milestone");
  mustContains(guide, "check:uxroomshiftsdensitydedup01", "milestone guide exposes room shifts density dedup check");
  mustContains(guide, "node backend\\scripts\\ux_room_shifts_density_dedup_01_check.js", "milestone guide includes room shifts density dedup command");
  mustContains(guide, "docs/UX_ROOM_SHIFTS_DENSITY_DEDUP_01.md", "milestone guide includes room shifts density dedup doc");

  mustContains(doc, "UX-ROOM-SHIFTS-DENSITY-DEDUP-01", "room shifts density dedup doc title present");
  mustContains(doc, "one top title", "room shifts density dedup doc keeps top title wording");
  mustContains(doc, "one summary band", "room shifts density dedup doc keeps summary band wording");
  mustContains(doc, "one tab row", "room shifts density dedup doc keeps single tab row wording");
  mustContains(doc, "active content that actually changes by tab", "room shifts density dedup doc keeps active content wording");
  mustContains(doc, "dispatch preview should not dominate when no shift is selected", "room shifts density dedup doc keeps dispatch preview wording");
  mustContains(doc, "one top title korunur ama daha kompakt görünür", "room shifts density dedup doc keeps compact top title wording");
  mustContains(doc, "one summary band korunur; ekstra üst açıklama satırı yoktur", "room shifts density dedup doc keeps summary band boundary");
  mustContains(doc, "inline satır olarak görünür kalır", "room shifts density dedup doc keeps compact dispatch CTA wording");
  mustContains(doc, "full-width band yerine compact inline notice olur", "room shifts density dedup doc keeps compact warning wording");
  mustContains(doc, "tekrar eden `Diğer Vardiyalar` heading'i içerik alanında görünmez", "room shifts density dedup doc keeps duplicate heading boundary");
  mustContains(doc, "backend dispatch flow unchanged", "room shifts density dedup doc keeps backend dispatch boundary");
  mustContains(doc, "no route apply addition", "room shifts density dedup doc keeps route apply boundary");
  mustContains(doc, "payment/settlement", "room shifts density dedup doc keeps payment boundary");
  mustContains(doc, "schema/migration", "room shifts density dedup doc keeps schema boundary");
  mustContains(doc, "UX-FIX 0", "room shifts density dedup doc keeps UX-FIX goal");
  mustContains(doc, "BLOCKER 0", "room shifts density dedup doc keeps blocker goal");
  mustContains(doc, "NOT-FOUND 0", "room shifts density dedup doc keeps not-found goal");
  mustContains(doc, "runtime-data", "room shifts density dedup doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "room shifts density dedup doc keeps browser-smoke boundary");

  mustContains(shiftsPanel, "roomShiftsDensityScope", "room shifts panel wraps the density scope");
  mustContains(shiftsPanel, "RoomShiftsOverviewSection", "room shifts panel keeps overview section wiring");
  mustContains(shiftsPanel, "RoomShiftsMainSections", "room shifts panel keeps main sections wiring");
  mustContains(shiftsPanel, "copilotShift", "room shifts panel keeps copilot selection wiring");
  mustContains(shiftsPanel, "setCopilotSelection", "room shifts panel keeps copilot selection side effect");

  mustContains(overview, "roomShiftsOverviewStrip", "room shifts overview keeps compact strip scope");
  mustContains(overview, "FlowSummaryStrip", "room shifts overview keeps summary strip");
  mustContains(overview, "Vardiya Özeti", "room shifts overview keeps title");
  mustContains(overview, "Özet üstte; karar, dispatch ve rota önizleme tablarda kalır.", "room shifts overview keeps summary-first copy");
  mustContains(overview, "autoSplitApprove", "room shifts overview keeps apply wiring");
  mustContains(overview, "Number(copilotShift.roomId || 0) > 0", "room shifts overview keeps room-based apply gating");
  mustContains(overview, "![\"SPLIT\", \"DONE\"].includes", "room shifts overview keeps visibility guard");
  mustNotContains(overview, "splitRootId", "room shifts overview no longer ties apply action to split packages");
  mustContains(overview, "Önizlemeyi Uygula: Böl & Onayla", "room shifts overview keeps compact dispatch CTA");
  mustContains(overview, "roomShiftsDispatchApplyRow", "room shifts overview keeps inline dispatch apply row");
  mustContains(overview, "roomShiftsDispatchApplyHint", "room shifts overview keeps compact dispatch hint");
  mustContains(overview, "roomInlineNotice roomInlineNotice--error", "room shifts overview keeps compact error notice");
  mustNotContains(overview, "Dispatch önizleme", "room shifts overview no longer dominates with dispatch preview");
  mustNotContains(overview, "Bekleyen Talepler", "room shifts overview no longer duplicates pending tab label");
  mustNotContains(overview, "Sözleşmeden Üretilen", "room shifts overview no longer duplicates contract tab label");
  mustNotContains(overview, "Diğer Vardiyalar", "room shifts overview no longer duplicates other tab label");

  mustContains(mainSections, "roomShiftsTabCard", "room shifts main sections keeps compact tab card");
  mustContains(mainSections, "roomShiftsTabHint", "room shifts main sections keeps tab hint");
  mustContains(mainSections, "PanelSegmentTabs", "room shifts main sections keeps the only tab row");
  mustContains(mainSections, 'activeTab === "pending"', "room shifts main sections keeps pending tab switch");
  mustContains(mainSections, 'activeTab === "contract"', "room shifts main sections keeps contract tab switch");
  mustContains(mainSections, 'activeTab === "other"', "room shifts main sections keeps other tab switch");
  mustContains(mainSections, "RoomPendingSection", "room shifts main sections keeps pending content");
  mustContains(mainSections, "RoomFinalListSection", "room shifts main sections keeps final list content");
  mustContains(mainSections, "showTitle={false}", "room shifts main sections hides repeated section titles");

  mustContains(sections, "roomShiftsSectionCard", "room shifts sections use compact card wrapper");
  mustContains(sections, "roomShiftsSectionSubtitle", "room shifts sections keep optional subtitle styling");
  mustContains(sections, "roomShiftsDispatchPoolCard", "room shifts dispatch summary uses compact card wrapper");
  mustContains(sections, "Taşımacılık Firması havuz özeti", "room shifts panel sections keeps dispatch summary card");
  mustContains(sections, "showDispatchApplyAction = Boolean(data)", "room shifts panel sections keeps dispatch apply gating");
  mustContains(sections, "Önizlemeyi Uygula: Böl & Onayla", "room shifts panel sections keeps dispatch apply CTA");
  mustContains(sections, "roomShiftsDispatchApplyRow", "room shifts panel sections keeps dispatch apply row compact");
  mustContains(sections, "roomShiftsDispatchApplyHint", "room shifts panel sections keeps dispatch apply hint compact");
  mustContains(sections, "roomShiftsDispatchApplyState", "room shifts panel sections keeps dispatch apply state compact");
  mustContains(sections, "Bölme önizlemesi oluştur", "room shifts panel sections keeps dispatch preview create CTA");
  mustContains(sections, "Bölme önizlemesini yenile", "room shifts panel sections keeps dispatch preview refresh CTA");

  mustContains(rows, "renderPoolSummary(shift, capacityMeta, effectiveRoomId)", "room shifts rows keep split dispatch summary wiring");
  mustContains(rows, "Bölme modu aktif", "room shifts rows keep split mode copy");
  mustContains(rows, "roomInlineNotice roomInlineNotice--warn", "room shifts rows use compact split warning");
  mustContains(rows, "Öneri kartlarını aşağıdan kullan.", "room shifts rows keep concise split warning copy");
  mustContains(rows, "capacityMeta.dispatchRequired", "room shifts rows keep dispatch required branch");

  mustContains(cards, "RoomDispatchSuggestionCard", "room shifts cards keep dispatch suggestion cards");
  mustContains(cards, "RoomAvailabilityLine", "room shifts cards keep availability line");
  mustContains(cards, "buildCapacityMeta", "room shifts cards keep capacity meta helper");

  mustContains(utils, "dispatchRequired", "room shifts utils keep dispatch requirement helper");
  mustContains(utils, "buildCapacityMeta", "room shifts utils keep capacity helper");
  mustContains(utils, "roomMinVehicleCount", "room shifts utils keep room min vehicle count logic");

  mustContains(css, ".roomShiftsDensityScope", "room shifts css defines density scope");
  mustContains(css, ".roomShiftsOverviewStrip .panelMeta", "room shifts css compacts overview meta");
  mustContains(css, ".roomShiftsTabHint", "room shifts css compacts tab hint");
  mustContains(css, ".roomShiftsDispatchApplyRow", "room shifts css compacts dispatch apply row");
  mustContains(css, ".roomInlineNotice--warn", "room shifts css styles compact split warning");
  mustContains(css, ".roomInlineNotice--error", "room shifts css styles compact error notice");
  mustContains(css, ".roomShiftsDispatchPoolCard", "room shifts css scopes dispatch pool card");

  console.log("=== UX-ROOM-SHIFTS-DENSITY-DEDUP-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
