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
  console.log("=== UX-PANEL-STRUCTURE-02 CHECK ===");

  const auditPath = "docs/UX_PANEL_STRUCTURE_02_AUDIT.md";
  must(exists(auditPath), "audit doc exists");
  const audit = read(auditPath);
  mustContains(audit, "1) Taranan panel listesi", "audit has scanned panel list");
  mustContains(audit, "2) Uzun panel adayları", "audit has long panel candidates");
  mustContains(audit, "3) P0 / P1 / P2 sınıflandırması", "audit has priority classification");
  mustContains(audit, "4) Hep açık kalacak kritik alanlar", "audit has always-open list");
  mustContains(audit, "5) Accordion / çekmece olacak ikincil alanlar", "audit has accordion list");
  mustContains(audit, "6) Tab olarak kalacak eş düzey alt modlar", "audit has tab-level submods");
  mustContains(audit, "7) Bu patchte düzenlenen paneller", "audit has changed panels section");
  mustContains(audit, "8) Sonraya bırakılan paneller", "audit has deferred panels section");

  const segmentComponent = read("web/src/components/PanelSegmentTabs.jsx");
  mustContains(segmentComponent, "role=\"tablist\"", "PanelSegmentTabs is accessible");
  mustContains(segmentComponent, "aria-selected", "PanelSegmentTabs sets selected state");
  mustContains(segmentComponent, "compact", "PanelSegmentTabs supports compact mode");

  const style = read("web/src/index.css");
  const indexCss = style;
  mustContains(style, ".panelSegmentTabs", "segmented tab styles exist");
  mustContains(style, ".panelSegmentTab", "segmented tab button styles exist");
  mustContains(style, ".panelSegmentTabBadge", "segmented tab badge styles exist");
  mustContains(style, "max-width: 900px", "segmented tab styles support small screens");

  const roomVehicles = read("web/src/panels/room/VehiclesPanel.jsx");
  const roomDrivers = read("web/src/panels/room/DriversPanel.jsx");
  mustContains(roomVehicles, "TABS", "Room / Araçlar keeps segmented tabs");
  mustContains(roomDrivers, "TABS", "Room / Sürücüler keeps segmented tabs");

  const operationHealth = read("web/src/panels/room/OperationHealthPanel.jsx");
  const roomCommercialFlow = read("web/src/panels/room/CommercialFlowPanel.jsx");
  const companyCommercialFlow = read("web/src/panels/company/CommercialFlowPanel.jsx");
  const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
  const superadminVerification = read("web/src/panels/superadmin/OperationVerificationPanel.jsx");
  const parentLive = read("web/src/panels/parent/LivePanel.jsx");
  const personelLive = read("web/src/panels/personel/LivePanel.jsx");

  const tabbedPanels = [
    roomVehicles,
    roomDrivers,
    roomCommercialFlow,
    agreements,
    companyCommercialFlow,
    superadminVerification,
    parentLive,
    personelLive,
  ].filter(panelUsesTabs).length;
  must(tabbedPanels >= 5, "at least 5 panels use segmented/tab standard");

  mustContains(operationHealth, "RoomOperationsBoard", "Room / Operasyon Sağlığı keeps summary board open");
  mustContains(operationHealth, "MetricCard", "Room / Operasyon Sağlığı keeps critical metrics open");
  mustContains(operationHealth, "PanelSegmentTabs", "Room / Operasyon Sağlığı uses functional tabs");
  mustContains(operationHealth, "activeTab", "Room / Operasyon Sağlığı keeps active tab state");
  mustContains(operationHealth, "role=\"tabpanel\"", "Room / Operasyon Sağlığı exposes tabpanel sections");
  mustContains(operationHealth, "Şartlı Küme", "Room / Operasyon Sağlığı keeps conditional cluster tab");
  mustContains(operationHealth, "Sorunlu Sürücüler", "Room / Operasyon Sağlığı keeps driver tab");
  mustContains(operationHealth, "Açık Sorunlar", "Room / Operasyon Sağlığı keeps issues tab");

  mustContains(roomCommercialFlow, "ROOM_FLOW_TABS", "Room / Ticari Akışım exposes segmented views");
  mustContains(roomCommercialFlow, "PanelSegmentTabs", "Room / Ticari Akışım uses segmented tabs");
  mustContains(roomCommercialFlow, "CollapsibleSection", "Room / Ticari Akışım keeps secondary blocks collapsible");
  mustContains(roomCommercialFlow, "Hakediş", "Room / Ticari Akışım keeps settlement tab visible");
  mustContains(roomCommercialFlow, "Sözleşme & Vardiya", "Room / Ticari Akışım keeps contract-shift tab visible");
  mustContains(roomCommercialFlow, "Teklifler", "Room / Ticari Akışım keeps offers tab visible");
  mustContains(roomCommercialFlow, "Kalite / Kanıt", "Room / Ticari Akışım keeps quality tab visible");
  mustContains(roomCommercialFlow, "Ödeme & Komisyon", "Room / Ticari Akışım keeps payment tab visible");
  mustContains(roomCommercialFlow, "Geçmiş", "Room / Ticari Akışım keeps history tab visible");
  mustContains(roomCommercialFlow, "Ticari Akışım", "Room / Ticari Akışım keeps the room title visible");
  mustContains(roomCommercialFlow, "roomCommercialWorkspaceFull", "Room / Ticari Akışım uses full-width workspace container");
  mustContains(roomCommercialFlow, "roomCommercialWorkspaceFullSplit", "Room / Ticari Akışım keeps full-width split layout");
  mustContains(indexCss, "roomCommercialWorkspaceFull", "Room / Ticari Akışım uses room full-width workspace css");
  mustContains(indexCss, "roomCommercialWorkspaceFullSplit", "Room / Ticari Akışım split layout is defined in CSS");

  mustContains(agreements, "AGREEMENTS_VIEW_TABS", "Company / Sözleşmeler exposes segmented views");
  mustContains(agreements, "CompanyAgreementsSelectedSummarySection", "Company / Sözleşmeler keeps selected summary visible");
  mustContains(agreements, 'table className="tbl"', "Company / Sözleşmeler keeps main table visible");
  mustContains(agreements, "AgreementWizard", "Company / Sözleşmeler keeps wizard mode visible");
  mustContains(agreements, "CollapsibleSection", "Company / Sözleşmeler keeps secondary bridge collapsed");

  mustNotContains(companyCommercialFlow, "PanelSegmentTabs", "Company / Ticari Akış no longer uses segmented tabs");
  mustNotContains(companyCommercialFlow, "FLOW_VIEW_TABS", "Company / Ticari Akış removes segmented view config");
  mustNotContains(companyCommercialFlow, 'viewMode === "summary"', "Company / Ticari Akış removes summary render");
  mustNotContains(companyCommercialFlow, 'viewMode === "list"', "Company / Ticari Akış removes list render");
  mustNotContains(companyCommercialFlow, 'viewMode === "selected"', "Company / Ticari Akış removes selected render");
  mustContains(companyCommercialFlow, "MetricCard", "Company / Ticari Akış keeps summary cards visible");
  mustContains(companyCommercialFlow, "Ticari Akış Listesi", "Company / Ticari Akış keeps list view visible");
  mustContains(companyCommercialFlow, "Seçili kayıt", "Company / Ticari Akış keeps selected summary visible");
  mustContains(companyCommercialFlow, "companyCommercialFlowSplit", "Company / Ticari Akış keeps single-page split layout");
  mustContains(companyCommercialFlow, "<table", "Company / Ticari Akış keeps table visible");

  mustContains(superadminVerification, "PanelSegmentTabs", "Super Admin / Operasyon Doğrulama uses segmented roles");
  mustContains(superadminVerification, "Seçili rol", "Super Admin / Operasyon Doğrulama keeps selected role summary visible");
  mustContains(superadminVerification, "Aktif operasyon", "Super Admin / Operasyon Doğrulama keeps main section visible");
  mustContains(superadminVerification, "<table", "Super Admin / Operasyon Doğrulama keeps table visible");

  mustContains(parentLive, "PARENT_LIVE_TABS", "Parent / Canlı Takip exposes segmented views");
  mustContains(parentLive, "Çocuğun durağı", "Parent / Canlı Takip keeps child-stop summary visible");
  mustContains(parentLive, "MapView", "Parent / Canlı Takip keeps map visible");
  mustContains(parentLive, "CollapsibleSection", "Parent / Canlı Takip keeps secondary lists collapsible");

  mustContains(personelLive, "PERSONEL_LIVE_TABS", "Personel / Canlı Takip exposes segmented views");
  mustContains(personelLive, "Seçili Araç", "Personel / Canlı Takip keeps selected vehicle summary visible");
  mustContains(personelLive, "StopTimeline", "Personel / Canlı Takip keeps timeline visible");
  mustContains(personelLive, "MapView", "Personel / Canlı Takip keeps map visible");

  const nav = read("web/src/layout/NavDock.jsx");
  const copilotFacts = read("web/src/utils/copilotFacts.js");
  mustContains(nav, "companyKind", "NavDock role/kind logic preserved");
  mustContains(nav, "Sefer Abi Terminali", "NavDock keeps Sefer Abi Terminali");
  mustContains(copilotFacts, "Sefer Abi’ye Sor", "Copilot keeps Sefer Abi’ye Sor");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-STRUCTURE-02", "milestone guide mentions UX-PANEL-STRUCTURE-02");
  mustContains(guide, "check:uxpanelstructure02", "milestone guide exposes check:uxpanelstructure02");
  mustContains(guide, "UX-COLLAPSIBLE-PANELS-01", "milestone guide keeps UX-COLLAPSIBLE-PANELS-01");

  const auditContext = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(auditContext, "UX-PANEL-STRUCTURE-02", "copilot audit mentions UX-PANEL-STRUCTURE-02");
  mustContains(auditContext, "summary-first", "copilot audit keeps summary-first wording");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanelstructure02"', "package.json exposes check:uxpanelstructure02");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json keeps check:uxcollapsiblepanels01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxpanelstructure02", "product extensions chain keeps panel structure check");
  mustContains(runner, "check:uxcollapsiblepanels01", "product extensions chain keeps collapsible panels check");
  mustContains(runner, "check:etaosrm02", "product extensions chain keeps ETA-OSRM-02");
  mustContains(runner, "check:livetrackingfinal01", "product extensions chain keeps LIVE-TRACKING-FINAL-01");
  mustContains(runner, "check:driverflowfinal01", "product extensions chain keeps DRIVER-FLOW-FINAL-01");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxpanelstructure02", "verify chain keeps panel structure check");
  mustContains(verify, "check:uxcollapsiblepanels01", "verify chain keeps collapsible panels check");
  mustContains(verify, "check:etaosrm02", "verify chain keeps ETA-OSRM-02");
  mustContains(verify, "check:livetrackingfinal01", "verify chain keeps LIVE-TRACKING-FINAL-01");
  mustContains(verify, "check:driverflowfinal01", "verify chain keeps DRIVER-FLOW-FINAL-01");

  mustContains(audit, "Room / Araçlar", "audit mentions room vehicle surface");
  mustContains(audit, "Room / Sürücüler", "audit mentions room drivers surface");
  mustContains(audit, "Company / Sözleşmeler", "audit mentions company agreements");
  mustContains(audit, "Company / Ticari Akış", "audit mentions company commercial flow");
  mustContains(audit, "Super Admin / Operasyon Doğrulama", "audit mentions super admin verification");
  mustContains(audit, "Parent / Canlı Takip", "audit mentions parent live tracking");
  mustContains(audit, "Personel / Canlı Takip", "audit mentions personel live tracking");
  mustContains(audit, "Sefer Abi Terminali", "audit preserves Sefer Abi Terminali boundary");
  mustContains(audit, "Sefer Abi’ye Sor", "audit preserves Sefer Abi drawer boundary");
  console.log("=== UX-PANEL-STRUCTURE-02 CHECK PASS ===");
}

main();

