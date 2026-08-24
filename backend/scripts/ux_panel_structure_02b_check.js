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

function panelUsesTabs(text) {
  const normalized = normalize(text);
  return normalized.includes("panelsegmenttabs") || normalized.includes("role=\"tablist\"") || normalized.includes("aria-selected");
}

function main() {
  console.log("=== UX-PANEL-STRUCTURE-02B CHECK ===");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  const auditPath = "docs/UX_PANEL_STRUCTURE_02_AUDIT.md";
  must(exists(auditPath), "structure audit doc exists");
  const audit = read(auditPath);
  mustContains(audit, "UX-PANEL-STRUCTURE-02B", "audit includes 02B section");
  mustContains(audit, "CommercialCorePanel.jsx", "audit includes CommercialCorePanel");
  mustContains(audit, "VehiclesPanel.jsx", "audit includes VehiclesPanel");
  mustContains(audit, "DriversPanel.jsx", "audit includes DriversPanel");
  mustContains(audit, "ShiftsPanel.jsx", "audit includes ShiftsPanel");
  mustContains(audit, "MapPanel.jsx", "audit includes MapPanel");
  mustContains(audit, "PanelSegmentTabs", "audit mentions segmented/tab standard");
  mustContains(audit, "CollapsibleSection", "audit mentions collapsible standard");

  const commercialCore = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const roomVehicles = read("web/src/panels/room/VehiclesPanel.jsx");
  const roomDrivers = read("web/src/panels/room/DriversPanel.jsx");
  const roomMap = read("web/src/panels/room/MapPanel.jsx");
  const companyShifts = read("web/src/panels/company/ShiftsPanel.jsx");
  const companyShiftsIntro = read("web/src/panels/company/CompanyShiftsPanelIntro.jsx");
  const companyShiftsTrack = read("web/src/panels/company/CompanyShiftsPanelTrackView.jsx");

  const tabbedPanels = [commercialCore, roomVehicles, roomDrivers, roomMap, companyShiftsIntro, companyShiftsTrack]
    .filter(panelUsesTabs)
    .length;
  must(tabbedPanels >= 3, "at least 3 targeted panels use segmented/tab standard");

  mustContains(commercialCore, "PanelSegmentTabs", "CommercialCore uses segmented tabs");
  mustContains(commercialCore, "CollapsibleSection", "CommercialCore uses collapsible sections");
  mustContains(commercialCore, "Ticari Akış Özeti", "CommercialCore keeps summary visible");
  mustContains(commercialCore, "Hakediş", "CommercialCore tab set includes settlement view");
  mustContains(commercialCore, "Ödeme Hazırlık", "CommercialCore tab set includes payment prep view");
  mustContains(commercialCore, "Komisyon", "CommercialCore tab set includes commission view");
  mustContains(commercialCore, "Kalite / Kanıt", "CommercialCore tab set includes quality/proof view");
  mustContains(commercialCore, "Riskler", "CommercialCore tab set includes risk view");
  mustContains(commercialCore, "Geçmiş", "CommercialCore tab set includes history view");

  mustContains(roomVehicles, "PanelSegmentTabs", "Room / Araçlar keeps segmented tabs");
  mustContains(roomVehicles, "CollapsibleSection", "Room / Araçlar keeps secondary collapsible details");
  mustContains(roomVehicles, "Telematics", "Room / Araçlar keeps summary labels visible");

  mustContains(roomDrivers, "PanelSegmentTabs", "Room / Sürücüler keeps segmented tabs");
  mustContains(roomDrivers, "CollapsibleSection", "Room / Sürücüler keeps secondary collapsible details");
  mustContains(roomDrivers, "Yönetim detayları", "Room / Sürücüler keeps management details collapsed");
  mustContains(roomDrivers, "Bağlı araç:", "Room / Sürücüler keeps linked vehicle readout visible");
  mustContains(roomDrivers, "Araç bağlantısını Araçlar ekranında yönet", "Room / Sürücüler routes connection management away from driver screen");

  mustContains(roomMap, "PanelSegmentTabs", "Room / Map keeps segmented tabs");
  mustContains(roomMap, 'const [mapTab, setMapTab] = useState("map")', "Room / Map defaults to Harita tab");
  mustContains(roomMap, "selectedSummaryText", "Room / Map keeps compact summary text");
  mustContains(roomMap, "selectedHistoryLine", "Room / Map keeps short history line");
  mustContains(roomMap, "selectedRiskLines", "Room / Map keeps short risk lines");
  mustContains(roomMap, "Harita Önizleme", "Room / Map keeps live map preview section");
  mustContains(roomMap, "Araçlar", "Room / Map keeps vehicle tab");
  mustNotContains(roomMap, "Özet", "Room / Map removes summary tab");
  mustNotContains(roomMap, "Rota / Durak", "Room / Map removes route tab");
  mustNotContains(roomMap, "GPS Durumu", "Room / Map removes gps tab");
  mustNotContains(roomMap, "Riskler", "Room / Map removes risk tab");
  mustNotContains(roomMap, "Geçmiş", "Room / Map removes history tab");
  mustContains(roomMap, "Harita Önizleme", "Room / Map keeps map preview visible");

  mustContains(companyShifts, "mainTab", "Company / Shifts keeps main tab state");
  mustContains(companyShifts, "trackTab", "Company / Shifts keeps track tab state");
  mustContains(companyShiftsIntro, "Shifts (COMPANY)", "Company / Shifts intro keeps summary title");
  mustContains(companyShiftsIntro, "trackCounts", "Company / Shifts intro keeps summary counts");
  mustNotContains(companyShiftsIntro, "PanelSegmentTabs", "Company / Shifts intro is summary-only");
  mustNotContains(companyShiftsIntro, "mainTab === \"create\"", "Company / Shifts intro removes create branch");
  mustNotContains(companyShiftsIntro, "Planlama Merkezi", "Company / Shifts intro removes planning center wording");
  mustContains(companyShiftsTrack, "PanelSegmentTabs", "Company / Shifts track view uses segmented tabs");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanelstructure02b"', "package.json exposes check:uxpanelstructure02b");
  mustContains(pkg, '"check:uxpanelstructure02"', "package.json keeps check:uxpanelstructure02");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json keeps check:uxcollapsiblepanels01");

  assertProductExtensionsIncludes("check:uxpanelstructure02b", "product extensions registry includes UX-PANEL-STRUCTURE-02B", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelstructure02", "product extensions registry keeps UX-PANEL-STRUCTURE-02", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelinventory02a", "product extensions registry keeps UX-PANEL-INVENTORY-02A", registryScripts);
  assertProductExtensionsIncludes("check:uxcollapsiblepanels01", "product extensions registry keeps UX-COLLAPSIBLE-PANELS-01", registryScripts);
  assertProductExtensionsIncludes("check:uxnav01", "product extensions registry keeps UX-NAV-01", registryScripts);

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-STRUCTURE-02B", "milestone guide mentions UX-PANEL-STRUCTURE-02B");
  mustContains(guide, "check:uxpanelstructure02b", "milestone guide exposes check:uxpanelstructure02b");

  const inventory = read("docs/UX_PANEL_INVENTORY_02A_AUDIT.md");
  mustContains(inventory, "UX-PANEL-STRUCTURE-02B follow-up", "inventory audit includes 02B follow-up note");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-PANEL-STRUCTURE-02B", "copilot audit mentions UX-PANEL-STRUCTURE-02B");

  must(!normalize(audit).includes("runtime-data"), "audit avoids runtime-data");
  must(!normalize(audit).includes("prisma"), "audit avoids prisma");
  must(!normalize(audit).includes("migration"), "audit avoids migration");

  console.log("=== UX-PANEL-STRUCTURE-02B CHECK PASS ===");
}

main();
