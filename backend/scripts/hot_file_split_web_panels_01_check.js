#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const BASELINE_COUNTS = {
  companyAgreements: 1577,
  roomAgreements: 1454,
};

const MIN_REDUCTION = {
  companyAgreements: 100,
  roomAgreements: 100,
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function lineCount(text) {
  return String(text || "").split(/\r?\n/).length;
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
  if (!normalize(text).includes(normalize(needle))) ok(label);
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
  return String(
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }) || ""
  ).trim();
}

function assertCleanOutput(args, label) {
  const out = gitLines(args);
  if (out) fail(`${label}: expected empty output but got ${out}`);
  ok(label);
}

function assertLineCount(rel, max, label) {
  const count = lineCount(read(rel));
  if (count > max) fail(`${label}: ${count} > ${max}`);
  ok(`${label} (${count})`);
  return count;
}

async function main() {
  console.log("=== HOT-FILE-SPLIT-WEB-PANELS-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const doc = read("docs/HOT_FILE_SPLIT_WEB_PANELS_01.md");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const companyMain = read("web/src/panels/company/AgreementsPanel.jsx");
  const companyBridge = read("web/src/panels/company/companyAgreementsBridgeSection.jsx");
  const companyHelpers = read("web/src/panels/company/companyAgreementsPanelHelpers.js");
  const roomMain = read("web/src/panels/room/AgreementsPanel.jsx");
  const roomBridge = read("web/src/panels/room/roomAgreementsBridgeSection.jsx");
  const roomHelpers = read("web/src/panels/room/roomAgreementsPanelHelpers.js");

  must(pkg, '"check:hotfilesplitwebpanels01": "node backend/scripts/hot_file_split_web_panels_01_check.js"', "package.json exposes hot file split web panels check");
  ordered(runner, ["check:hotfilesplitaichatcomposers01", "check:hotfilesplitwebpanels01", "check:copilotreasoninganswercomposer01"], "product extensions runner keeps hot file split web panels between ai chat split and reasoning answer composer");
  ordered(verify, ["check:hotfilesplitaichatcomposers01", "check:hotfilesplitwebpanels01", "check:copilotreasoninganswercomposer01"], "verify chain keeps hot file split web panels between ai chat split and reasoning answer composer");

  must(guide, "HOT-FILE-SPLIT-WEB-PANELS-01", "milestone guide mentions hot file split web panels milestone");
  must(guide, "check:hotfilesplitwebpanels01", "milestone guide exposes hot file split web panels check");
  must(guide, "docs/HOT_FILE_SPLIT_WEB_PANELS_01.md", "milestone guide links hot file split web panels doc");
  must(guide, "web/src/panels/company/companyAgreementsBridgeSection.jsx", "milestone guide lists company bridge split file");
  must(guide, "web/src/panels/room/roomAgreementsBridgeSection.jsx", "milestone guide lists room bridge split file");
  ordered(guide, ["HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01", "HOT-FILE-SPLIT-WEB-PANELS-01"], "milestone guide places web panels split after ai chat split");

  must(primer, "HOT-FILE-SPLIT-WEB-PANELS-01", "primer mentions hot file split web panels milestone");
  must(primer, "check:hotfilesplitwebpanels01", "primer exposes hot file split web panels check");
  must(primer, "docs/HOT_FILE_SPLIT_WEB_PANELS_01.md", "primer links hot file split web panels doc");
  must(primer, "web/src/panels/company/companyAgreementsBridgeSection.jsx", "primer lists company bridge split file");
  must(primer, "web/src/panels/room/roomAgreementsBridgeSection.jsx", "primer lists room bridge split file");

  must(doc, "# HOT FILE SPLIT WEB PANELS 01", "hot file split web panels doc title present");
  must(doc, "Canonical check: `check:hotfilesplitwebpanels01`", "hot file split web panels doc keeps canonical check wording");
  must(doc, "1577", "hot file split web panels doc records company baseline");
  must(doc, "1454", "hot file split web panels doc records room baseline");
  must(doc, "1288", "hot file split web panels doc records company current line count");
  must(doc, "1275", "hot file split web panels doc records room current line count");
  must(doc, "companyAgreementsBridgeSection.jsx", "hot file split web panels doc mentions company bridge split file");
  must(doc, "roomAgreementsBridgeSection.jsx", "hot file split web panels doc mentions room bridge split file");
  must(doc, "companyAgreementsPanelHelpers.js", "hot file split web panels doc mentions company helper file");
  must(doc, "roomAgreementsPanelHelpers.js", "hot file split web panels doc mentions room helper file");
  must(doc, "companyActionClarityScope", "hot file split web panels doc keeps company selector scope");
  must(doc, "roomCriticalFixScope", "hot file split web panels doc keeps room selector scope");
  must(doc, "desktopShiftTable", "hot file split web panels doc keeps desktop table selector");
  must(doc, "Detayı aç", "hot file split web panels doc keeps button text");
  must(doc, "Kabul Et", "hot file split web panels doc keeps button text");

  must(harnessCheck, "HOT-FILE-SPLIT-WEB-PANELS-01", "script harness check knows hot file split web panels milestone");
  must(harnessCheck, "check:hotfilesplitwebpanels01", "script harness check knows hot file split web panels check");
  must(harnessCheck, "docs/HOT_FILE_SPLIT_WEB_PANELS_01.md", "script harness check knows hot file split web panels doc");
  must(harnessCheck, "web/src/panels/company/companyAgreementsBridgeSection.jsx", "script harness check knows company bridge split file");
  must(harnessCheck, "web/src/panels/room/roomAgreementsBridgeSection.jsx", "script harness check knows room bridge split file");
  must(harnessDoc, "HOT-FILE-SPLIT-WEB-PANELS-01", "script harness doc lists hot file split web panels milestone");
  must(harnessDoc, "docs/HOT_FILE_SPLIT_WEB_PANELS_01.md", "script harness doc lists hot file split web panels doc");
  must(harnessDoc, "web/src/panels/company/companyAgreementsBridgeSection.jsx", "script harness doc lists company bridge split file");
  must(harnessDoc, "web/src/panels/room/roomAgreementsBridgeSection.jsx", "script harness doc lists room bridge split file");

  const companyLines = lineCount(companyMain);
  const roomLines = lineCount(roomMain);
  const companyReduction = BASELINE_COUNTS.companyAgreements - companyLines;
  const roomReduction = BASELINE_COUNTS.roomAgreements - roomLines;

  if (companyLines <= 1200) fail(`company agreements panel dropped to ${companyLines} lines; keep it above 1200`);
  if (roomLines <= 1200) fail(`room agreements panel dropped to ${roomLines} lines; keep it above 1200`);
  if (companyLines >= BASELINE_COUNTS.companyAgreements) fail(`company agreements panel did not shrink (${companyLines} >= ${BASELINE_COUNTS.companyAgreements})`);
  if (roomLines >= BASELINE_COUNTS.roomAgreements) fail(`room agreements panel did not shrink (${roomLines} >= ${BASELINE_COUNTS.roomAgreements})`);
  if (companyReduction < MIN_REDUCTION.companyAgreements) fail(`company agreements reduction too small (${companyReduction} < ${MIN_REDUCTION.companyAgreements})`);
  if (roomReduction < MIN_REDUCTION.roomAgreements) fail(`room agreements reduction too small (${roomReduction} < ${MIN_REDUCTION.roomAgreements})`);
  ok(`company agreements panel reduced to ${companyLines} lines from ${BASELINE_COUNTS.companyAgreements} (${companyReduction} fewer)`);
  ok(`room agreements panel reduced to ${roomLines} lines from ${BASELINE_COUNTS.roomAgreements} (${roomReduction} fewer)`);

  const companyBridgeLines = lineCount(companyBridge);
  const companyHelperLines = lineCount(companyHelpers);
  const roomBridgeLines = lineCount(roomBridge);
  const roomHelperLines = lineCount(roomHelpers);
  assertLineCount("web/src/panels/company/companyAgreementsBridgeSection.jsx", 999, "company bridge split file stays below 1000 lines");
  assertLineCount("web/src/panels/company/companyAgreementsPanelHelpers.js", 999, "company helper file stays below 1000 lines");
  assertLineCount("web/src/panels/room/roomAgreementsBridgeSection.jsx", 999, "room bridge split file stays below 1000 lines");
  assertLineCount("web/src/panels/room/roomAgreementsPanelHelpers.js", 999, "room helper file stays below 1000 lines");

  must(companyMain, "companyActionClarityScope", "company main keeps companyActionClarityScope");
  must(companyMain, "desktopShiftTable", "company main keeps desktopShiftTable");
  must(companyMain, "companyAgreementsDesktopList", "company main keeps companyAgreementsDesktopList");
  must(companyMain, 'ariaLabel="Sözleşme görünümü"', "company main keeps PanelSegmentTabs aria label");
  must(companyMain, "Detayı aç", "company main keeps list view button text");
  must(companyMain, "AgreementOpsBridgeCard", "company main keeps list bridge card");
  must(companyMain, "CompanyAgreementsBridgeSection", "company main uses split bridge section");
  mustNot(companyMain, "AgreementRoutePreviewEvidenceCard", "company main no longer defines route preview evidence card inline");
  mustNot(companyMain, "QualityPaymentBridgePreviewCard", "company main no longer renders quality preview inline");
  mustNot(companyMain, "PlatformFeePreviewCard", "company main no longer renders platform fee preview inline");
  mustNot(companyMain, "SeferScorePreviewCard", "company main no longer renders sefer score preview inline");
  mustNot(companyMain, "CompanyAgreementsRouteRefreshPendingSection", "company main no longer renders route refresh pending inline");
  mustNot(companyMain, "CompanyAgreementsSourceShiftSection", "company main no longer renders source shift section inline");
  mustNot(companyMain, "CollapsibleSection", "company main no longer owns bridge collapsible section");

  must(companyBridge, "Detayı kapat", "company bridge section keeps empty-state label");
  must(companyBridge, "Rota/Durak Önizleme", "company bridge section keeps route preview evidence card label");
  must(companyBridge, "Kalite / hakediş önizlemesi", "company bridge section keeps quality preview label");
  must(companyBridge, "CompanyAgreementsRouteRefreshPendingSection", "company bridge section keeps route refresh pending section");
  must(companyBridge, "CompanyAgreementsSourceShiftSection", "company bridge section keeps source shift section");
  must(companyBridge, "AgreementRoutePreviewEvidenceCard", "company bridge section owns route preview evidence card");
  must(companyBridge, "Detayı aç", "company bridge section keeps bridge CTA text");

  must(roomMain, "roomCriticalFixScope", "room main keeps roomCriticalFixScope");
  must(roomMain, "roomActionCTA", "room main keeps roomActionCTA selector");
  must(roomMain, "Rota Önizle", "room main keeps route preview button text");
  must(roomMain, "Karşı Teklif", "room main keeps counter button text");
  must(roomMain, "Kabul Et", "room main keeps approve button text");
  must(roomMain, "RoomAgreementsBridgeSection", "room main uses split bridge section");
  must(roomMain, "RoomAgreementsRouteRefreshPendingSection", "room main keeps route refresh tables");
  must(roomMain, "roomAgreementsPanelSections", "room main still uses existing section registry");
  must(roomMain, "RoutePreviewModal", "room main keeps preview modal");
  must(roomMain, "PanelSegmentTabs", "room main keeps panel segment tabs");
  mustNot(roomMain, "AgreementOpsBridgeCard", "room main no longer owns bridge card inline");
  mustNot(roomMain, "AgreementConflictBox", "room main no longer owns conflict box inline");
  mustNot(roomMain, "QualityPaymentBridgePreviewCard", "room main no longer owns quality preview inline");
  mustNot(roomMain, "PlatformFeePreviewCard", "room main no longer owns platform fee preview inline");
  mustNot(roomMain, "SeferScorePreviewCard", "room main no longer owns sefer score preview inline");
  mustNot(roomMain, "CollapsibleSection", "room main no longer owns bridge collapsible section inline");

  must(roomBridge, "roomCriticalFixScope", "room bridge section keeps roomCriticalFixScope");
  must(roomBridge, "Detayı aç", "room bridge section keeps bridge CTA text");
  must(roomBridge, "Rota Önizle", "room bridge section keeps route preview button text");
  must(roomBridge, "Karşı Teklif", "room bridge section keeps counter button text");
  must(roomBridge, "Kabul Et", "room bridge section keeps approve button text");
  must(roomBridge, "AgreementOpsBridgeCard", "room bridge section owns bridge card");
  must(roomBridge, "QualityPaymentBridgePreviewCard", "room bridge section owns quality preview card");
  must(roomBridge, "AgreementConflictBox", "room bridge section owns conflict box");
  must(roomBridge, "CollapsibleSection", "room bridge section owns collapsible section");

  must(roomHelpers, "export function resolveRoomAgreementsDefaultTab", "room helpers export default tab resolver");
  must(roomHelpers, "export function parseTryInput", "room helpers export numeric parser");
  must(companyHelpers, "export function canRouteRefresh", "company helpers export route refresh gate");
  must(companyHelpers, "export function buildRouteRefreshLaunch", "company helpers export launch builder");
  must(companyHelpers, "export function compactText", "company helpers export text compacting helper");

  const statusShort = gitLines(["status", "--short"]);
  must(statusShort, "backend/artifacts/runtime-data/", "runtime-data artifacts remain in working tree");
  mustNot(statusShort, "debug.log", "debug.log absent from git status");
  assertCleanOutput(["diff", "--cached", "--name-only"], "stage remains empty");
  assertCleanOutput(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "prisma", "backend/prisma"], "route/service/prisma diff remains empty");
  assertCleanOutput(["diff", "--check"], "working tree diff check is clean");
  assertCleanOutput(["diff", "--cached", "--check"], "staged diff check is clean");
  if (exists("debug.log")) fail("debug.log should be absent");
  ok("debug.log absent");

  console.log(
    `SUMMARY company=${companyLines} (-${companyReduction}) room=${roomLines} (-${roomReduction}) ` +
      `companyBridge=${companyBridgeLines} companyHelpers=${companyHelperLines} roomBridge=${roomBridgeLines} roomHelpers=${roomHelperLines}`
  );
  console.log("PASS HOT-FILE-SPLIT-WEB-PANELS-01");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
