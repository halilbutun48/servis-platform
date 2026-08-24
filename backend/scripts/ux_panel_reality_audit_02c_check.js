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
  if (cond) ok(label);
  else fail(label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function countRows(text, marker) {
  return (String(text || "").match(new RegExp(`^\\|\\s*\\\`${marker}`, "mg")) || []).length;
}

function main() {
  console.log("=== UX-PANEL-REALITY-AUDIT-02C CHECK ===");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  const auditPath = "docs/UX_PANEL_REALITY_AUDIT_02C.md";
  must(exists(auditPath), "reality audit doc exists");
  const audit = read(auditPath);

  mustContains(audit, "1) Taranan panel listesi", "audit has scan section");
  mustContains(audit, "2) Panel reality matrix", "audit has reality matrix");
  mustContains(audit, "3) PanelSegmentTabs kullanılan yüzeyler", "audit lists tab surfaces");
  mustContains(audit, "4) Functional / cosmetic / focus verdict", "audit has verdict section");
  mustContains(audit, "5) P0 / P1 / P2", "audit has priority section");
  mustContains(audit, "6) Referans standardı", "audit has reference standard section");
  mustContains(audit, "7) Browser / DOM smoke notu", "audit has browser smoke note");
  mustContains(audit, "8) Sonuç", "audit has conclusion section");

  mustContains(audit, "Room / Araçlar", "audit mentions room vehicle reference standard");
  mustContains(audit, "Room / Sürücüler", "audit mentions room driver reference standard");
  mustContains(audit, "functional tab", "audit mentions functional tab");
  mustContains(audit, "cosmetic-only", "audit mentions cosmetic-only risk");
  mustContains(audit, "focus-model", "audit mentions focus-model risk");
  mustContains(audit, "accordion-only", "audit mentions accordion-only surfaces");
  mustContains(audit, "scroll/focus", "audit mentions scroll/focus behavior");
  mustContains(audit, "browser / DOM smoke", "audit mentions browser smoke gap");
  mustContains(audit, "commerc", "audit mentions commercial surfaces");

  const rowCount = countRows(audit, "web/src/panels/");
  must(rowCount >= 10, "audit classifies at least 10 panel rows");

  const expectedFiles = [
    "web/src/panels/superadmin/CommercialCorePanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelIntro.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/superadmin/OperationVerificationPanel.jsx",
  ];
  for (const rel of expectedFiles) {
    mustContains(audit, rel, `audit mentions ${rel}`);
  }

  mustContains(audit, "12", "audit states tab surface count");
  must(
    normalize(audit).includes(normalize("0 code-confirmed cosmetic-only")) ||
      normalize(audit).includes(normalize("Cosmetic-only (code-confirmed): 0")),
    "audit states no confirmed cosmetic-only tabs",
  );
  mustContains(audit, "3 focus-model watchlist", "audit states focus-model watchlist count");
  mustContains(audit, "14", "audit states long-scroll count");

  const realityTabs = [
    "web/src/panels/superadmin/CommercialCorePanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
    "web/src/panels/company/CommercialFlowPanel.jsx",
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/company/CompanyShiftsPanelIntro.jsx",
    "web/src/panels/company/CompanyShiftsPanelTrackView.jsx",
    "web/src/panels/room/MapPanel.jsx",
    "web/src/panels/parent/LivePanel.jsx",
    "web/src/panels/personel/LivePanel.jsx",
    "web/src/panels/superadmin/OperationVerificationPanel.jsx",
  ];
  for (const rel of realityTabs) {
    const text = read(rel);
    if (rel.endsWith("CompanyShiftsPanelIntro.jsx")) {
      mustNotContains(text, "PanelSegmentTabs", `${rel} is summary-only and no longer uses PanelSegmentTabs`);
      mustContains(text, "trackCounts", `${rel} keeps summary counts`);
    } else if (rel === "web/src/panels/company/CommercialFlowPanel.jsx") {
      mustNotContains(text, "PanelSegmentTabs", `${rel} is now single-page and no longer uses PanelSegmentTabs`);
      mustNotContains(text, 'viewMode === "summary"', `${rel} removes summary tab rendering`);
      mustNotContains(text, 'viewMode === "list"', `${rel} removes list tab rendering`);
      mustNotContains(text, 'viewMode === "selected"', `${rel} removes selected tab rendering`);
      mustContains(text, "Ticari Akış Listesi", `${rel} keeps list panel title`);
      mustContains(text, "Seçili kayıt", `${rel} keeps selected record panel`);
      mustContains(text, "companyCommercialFlowSplit", `${rel} keeps split layout`);
    } else {
      mustContains(text, "PanelSegmentTabs", `${rel} uses PanelSegmentTabs`);
    }
  }

  const shiftsPanel = read("web/src/panels/company/ShiftsPanel.jsx");
  mustContains(shiftsPanel, "CompanyShiftsPanelIntro", "ShiftsPanel composes CompanyShiftsPanelIntro");
  mustContains(shiftsPanel, "CompanyShiftsPanelTrackView", "ShiftsPanel composes CompanyShiftsPanelTrackView");
  mustContains(shiftsPanel, "mainTab", "ShiftsPanel keeps mainTab state");
  mustContains(shiftsPanel, "trackTab", "ShiftsPanel keeps trackTab state");

  const commercialCore = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  mustContains(commercialCore, "scrollIntoView", "CommercialCorePanel keeps focus/scroll behavior");
  mustContains(commercialCore, "tabSectionRefs", "CommercialCorePanel keeps section refs");

  const roomMap = read("web/src/panels/room/MapPanel.jsx");
  mustContains(roomMap, "mapTabRefs", "Room MapPanel keeps section refs");
  mustContains(roomMap, "scrollIntoView", "Room MapPanel keeps focus/scroll behavior");

  const trackView = read("web/src/panels/company/CompanyShiftsPanelTrackView.jsx");
  mustContains(trackView, "PanelSegmentTabs", "CompanyShiftsPanelTrackView keeps functional tab renderer");
  mustContains(trackView, "trackCounts", "CompanyShiftsPanelTrackView keeps tab counts");
  mustContains(trackView, "CompanyMarketSection", "CompanyShiftsPanelTrackView composes market section");
  mustContains(trackView, "CompanyPendingSection", "CompanyShiftsPanelTrackView composes pending section");
  mustContains(trackView, "CompanyContractSection", "CompanyShiftsPanelTrackView composes contract section");
  mustContains(trackView, "CompanyOtherSection", "CompanyShiftsPanelTrackView composes other section");

  const intro = read("web/src/panels/company/CompanyShiftsPanelIntro.jsx");
  mustContains(intro, "Shifts (COMPANY)", "CompanyShiftsPanelIntro keeps summary title");
  mustContains(intro, "trackCounts", "CompanyShiftsPanelIntro keeps summary counts");
  mustNotContains(intro, "PanelSegmentTabs", "CompanyShiftsPanelIntro no longer uses PanelSegmentTabs");
  mustNotContains(intro, "mainTab === \"create\"", "CompanyShiftsPanelIntro removes create branch");
  mustNotContains(intro, "Planlama Merkezi", "CompanyShiftsPanelIntro removes planning center wording");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanelreality02c"', "package.json exposes check:uxpanelreality02c");
  mustContains(pkg, '"check:uxpaneltabsfix01"', "package.json keeps check:uxpaneltabsfix01");
  mustContains(pkg, '"check:uxpanelstructure02b"', "package.json keeps check:uxpanelstructure02b");
  mustContains(pkg, '"check:uxpanelstructure02"', "package.json keeps check:uxpanelstructure02");
  mustContains(pkg, '"check:uxpanelinventory02a"', "package.json keeps check:uxpanelinventory02a");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json keeps check:uxcollapsiblepanels01");
  assertProductExtensionsIncludes("check:uxpanelreality02c", "product extensions registry includes UX-PANEL-REALITY-AUDIT-02C", registryScripts);
  assertProductExtensionsIncludes("check:uxpaneltabsfix01", "product extensions registry includes UX-PANEL-TABS-FUNCTIONAL-02B-FIX-01", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelstructure02b", "product extensions registry includes UX-PANEL-STRUCTURE-02B", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelstructure02", "product extensions registry includes UX-PANEL-STRUCTURE-02", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelinventory02a", "product extensions registry includes UX-PANEL-INVENTORY-02A", registryScripts);
  assertProductExtensionsIncludes("check:uxcollapsiblepanels01", "product extensions registry includes UX-COLLAPSIBLE-PANELS-01", registryScripts);

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-REALITY-AUDIT-02C", "milestone guide mentions UX-PANEL-REALITY-AUDIT-02C");
  mustContains(guide, "check:uxpanelreality02c", "milestone guide exposes check:uxpanelreality02c");
  mustContains(guide, "UX-PANEL-STRUCTURE-02B-FIX-01", "milestone guide keeps UX-PANEL-STRUCTURE-02B-FIX-01");
  mustContains(guide, "UX-PANEL-STRUCTURE-02", "milestone guide keeps UX-PANEL-STRUCTURE-02");
  mustContains(guide, "UX-COLLAPSIBLE-PANELS-01", "milestone guide keeps UX-COLLAPSIBLE-PANELS-01");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-PANEL-REALITY-AUDIT-02C", "copilot audit mentions UX-PANEL-REALITY-AUDIT-02C");

  must(!normalize(audit).includes("runtime-data"), "audit avoids runtime-data");
  must(!normalize(audit).includes("prisma"), "audit avoids prisma");
  must(!normalize(audit).includes("migration"), "audit avoids migration");

  console.log("=== UX-PANEL-REALITY-AUDIT-02C CHECK PASS ===");
}

main();
