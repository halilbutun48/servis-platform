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

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log("=== UX-PANEL-REALITY-CLEANUP-02D CHECK ===");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanelrealitycleanup02d"', "package.json exposes check:uxpanelrealitycleanup02d");
  mustContains(pkg, '"check:uxroomagreementstabs01"', "package.json exposes check:uxroomagreementstabs01");
  mustContains(pkg, '"check:uxpaneltabsfix01"', "package.json keeps check:uxpaneltabsfix01");
  mustContains(pkg, '"check:uxlivemaptabsfix01"', "package.json keeps check:uxlivemaptabsfix01");
  mustContains(pkg, '"check:uxpanelreality02c"', "package.json keeps check:uxpanelreality02c");
  mustContains(pkg, '"check:uxpanellayoutwidth02cfix03"', "package.json keeps check:uxpanellayoutwidth02cfix03");
  assertProductExtensionsIncludes("check:uxpanelrealitycleanup02d", "product extensions registry includes UX-PANEL-REALITY-CLEANUP-02D", registryScripts);
  assertProductExtensionsIncludes("check:uxpaneltabsfix01", "product extensions registry includes UX-PANEL-TABS-FUNCTIONAL-02B-FIX-01", registryScripts);
  assertProductExtensionsIncludes("check:uxlivemaptabsfix01", "product extensions registry includes UX-LIVE-MAP-TABS-FIX-01", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelreality02c", "product extensions registry includes UX-PANEL-REALITY-AUDIT-02C", registryScripts);
  assertProductExtensionsIncludes("check:uxpanellayoutwidth02cfix03", "product extensions registry includes UX-PANEL-LAYOUT-WIDTH-02C-FIX-03", registryScripts);

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-REALITY-CLEANUP-02D", "milestone guide mentions UX-PANEL-REALITY-CLEANUP-02D");
  mustContains(guide, "check:uxpanelrealitycleanup02d", "milestone guide exposes check:uxpanelrealitycleanup02d");
  mustContains(guide, "check:uxroomagreementstabs01", "milestone guide exposes check:uxroomagreementstabs01");

  const structureAudit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(structureAudit, "UX-PANEL-REALITY-CLEANUP-02D", "structure audit includes reality cleanup 02D note");
  must(!normalize(structureAudit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(structureAudit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(structureAudit).includes("migration"), "structure audit avoids migration");

  const realityAudit = read("docs/UX_PANEL_REALITY_AUDIT_02C.md");
  mustContains(realityAudit, "UX-PANEL-REALITY-CLEANUP-02D", "reality audit includes 02D follow-up note");
  must(!normalize(realityAudit).includes("runtime-data"), "reality audit avoids runtime-data");
  must(!normalize(realityAudit).includes("prisma"), "reality audit avoids prisma");
  must(!normalize(realityAudit).includes("migration"), "reality audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-PANEL-REALITY-CLEANUP-02D", "copilot audit mentions UX-PANEL-REALITY-CLEANUP-02D");

  const roomCommercial = read("web/src/panels/room/CommercialFlowPanel.jsx");
  const roomCommercialCss = read("web/src/index.css");
  mustContains(roomCommercial, "roomCommercialWorkspaceFull", "Room CommercialFlowPanel uses room full-width workspace container");
  mustContains(roomCommercial, "roomCommercialWorkspaceFullSplit", "Room CommercialFlowPanel uses room full-width split grid");
  mustContains(roomCommercial, "PanelSegmentTabs", "Room CommercialFlowPanel keeps segmented tabs");
  mustContains(roomCommercial, 'viewMode === "contractShift"', "Room CommercialFlowPanel keeps contract/shift view");
  mustContains(roomCommercial, 'viewMode === "settlement"', "Room CommercialFlowPanel keeps settlement view");
  mustContains(roomCommercial, 'viewMode === "payment"', "Room CommercialFlowPanel keeps payment view");
  mustContains(roomCommercial, 'viewMode === "history"', "Room CommercialFlowPanel keeps history view");
  mustContains(roomCommercialCss, ".roomCommercialWorkspaceFull", "index.css defines Room CommercialFlowPanel full-width workspace");
  mustContains(roomCommercialCss, "roomCommercialWorkspaceFullSplit", "index.css defines Room CommercialFlowPanel split grid");
  mustContains(roomCommercialCss, "width: 100%", "Room CommercialFlowPanel stays full width");
  mustContains(roomCommercialCss, "max-width: none", "Room CommercialFlowPanel removes centered max-width");
  mustContains(roomCommercialCss, "margin: 0", "Room CommercialFlowPanel removes centered margin");
  mustContains(roomCommercialCss, "minmax(0, 1fr)", "Room CommercialFlowPanel uses full-width left column");
  mustContains(roomCommercialCss, "clamp(340px, 24vw, 460px)", "Room CommercialFlowPanel uses right rail clamp");
  must(!roomCommercial.includes('key: "summary"'), "Room CommercialFlowPanel no longer exposes summary tab key");
  must(!roomCommercial.includes('label: "İlk adım"'), "Room CommercialFlowPanel no longer exposes first-step tab label");
  must(!roomCommercial.includes('label: "Özet"'), "Room CommercialFlowPanel no longer exposes summary tab label");
  must(!normalize(roomCommercial).includes(normalize("Seçili kayıt bağlamı")), "Room CommercialFlowPanel no longer repeats selected-record content in main area");
  must(!normalize(roomCommercial).includes(normalize("Görünen ana özet")), "Room CommercialFlowPanel no longer repeats KPI summary block");
  must(countMatches(roomCommercial, /<div className="panelSectionTitle">Seçili kayıt<\/div>/g) === 1, "Room CommercialFlowPanel keeps a single selected-record heading");
  must(countMatches(roomCommercial, /<div className="panelSectionTitle">Hızlı erişim<\/div>/g) === 1, "Room CommercialFlowPanel keeps a single quick-access heading");

  const roomMap = read("web/src/panels/room/MapPanel.jsx");
  mustContains(roomMap, 'const [mapTab, setMapTab] = useState("map")', "Room MapPanel keeps active tab state");
  mustContains(roomMap, "PanelSegmentTabs", "Room MapPanel uses segmented tabs");
  mustContains(roomMap, "mapTabRefs", "Room MapPanel uses tab refs");
  mustContains(roomMap, "scrollIntoView", "Room MapPanel scrolls/focuses to active section");
  mustContains(roomMap, 'mapTab === "map"', "Room MapPanel has map branch");
  mustContains(roomMap, 'mapTab === "vehicles"', "Room MapPanel has vehicles branch");
  mustContains(roomMap, 'label: "Harita"', "Room MapPanel has Harita tab label");
  mustContains(roomMap, 'label: "Araçlar"', "Room MapPanel has Araçlar tab label");
  mustContains(roomMap, "Harita Önizleme", "Room MapPanel keeps map preview surface");
  mustContains(roomMap, "selectedRiskLines", "Room MapPanel exposes risk lines");
  mustContains(roomMap, "selectedHistoryLine", "Room MapPanel exposes short history line");
  mustContains(roomMap, "selectedSummaryText", "Room MapPanel keeps compact summary text");
  must(!normalize(roomMap).includes(normalize('label: "Özet"')), "Room MapPanel no longer exposes summary tab label");
  must(!normalize(roomMap).includes(normalize('label: "Rota / Durak"')), "Room MapPanel no longer exposes route tab label");
  must(!normalize(roomMap).includes(normalize('label: "GPS Durumu"')), "Room MapPanel no longer exposes gps tab label");
  must(!normalize(roomMap).includes(normalize('label: "Riskler"')), "Room MapPanel no longer exposes risk tab label");
  must(!normalize(roomMap).includes(normalize('label: "Geçmiş"')), "Room MapPanel no longer exposes history tab label");
  must(!normalize(roomMap).includes(normalize('mapTab === "summary"')), "Room MapPanel no longer exposes summary branch");
  must(!normalize(roomMap).includes(normalize('mapTab === "route"')), "Room MapPanel no longer exposes route branch");
  must(!normalize(roomMap).includes(normalize('mapTab === "gps"')), "Room MapPanel no longer exposes gps branch");
  must(!normalize(roomMap).includes(normalize('mapTab === "risk"')), "Room MapPanel no longer exposes risk branch");
  must(!normalize(roomMap).includes(normalize('mapTab === "history"')), "Room MapPanel no longer exposes history branch");
  must(countMatches(roomMap, /mapTab === "/g) === 2, "Room MapPanel keeps exactly two tab branches");

  const markers = read("web/src/lib/markers/vehicleMarkerC.js");
  mustContains(markers, 'import busSvgUrl from "../../assets/bus.svg";', "bus.svg marker import remains intact");
  mustContains(markers, "vmc-busSvg", "bus svg is still rendered inside vehicle marker");

  const etaClient = read("web/src/utils/etaSanity.js");
  const etaServer = read("backend/src/ai/chat/etaSanity.js");
  mustContains(etaClient, "güncel değil", "frontend ETA safety wording remains");
  mustContains(etaClient, "hesaplanamıyor", "frontend ETA fallback wording remains");
  mustContains(etaServer, "güncel değil", "backend ETA safety wording remains");
  mustContains(etaServer, "hesaplanamıyor", "backend ETA fallback wording remains");

  const roomAgreements = read("web/src/panels/room/AgreementsPanel.jsx");
  const roomAgreementsBridgeSection = read("web/src/panels/room/roomAgreementsBridgeSection.jsx");
  mustContains(roomAgreements, "PanelSegmentTabs", "Room AgreementsPanel uses segmented tabs");
  mustContains(roomAgreements, 'const [viewMode, setViewMode] = useState("bridge")', "Room AgreementsPanel keeps active tab state");
  mustContains(roomAgreements, "roomAgreementsNotice", "Room AgreementsPanel has top info band state");
  mustContains(roomAgreements, "Yeni rota güncelleme talebi var", "Room AgreementsPanel shows route refresh notice");
  mustContains(roomAgreements, "Karar bekleyen sözleşme teklifi var", "Room AgreementsPanel shows bridge notice");
  mustContains(roomAgreements, "Uzatma talebi geldi", "Room AgreementsPanel shows extend notice");
  mustContains(roomAgreements, "setViewMode(roomAgreementsNotice.actionTab)", "Room AgreementsPanel info band routes to tab");
  mustContains(roomAgreements, "Operasyon Köprüsü", "Room AgreementsPanel includes operation bridge tab");
  mustContains(roomAgreements, "Rota Talepleri", "Room AgreementsPanel includes route requests tab");
  mustContains(roomAgreements, "Uygulanan Rota", "Room AgreementsPanel includes applied route tab");
  mustContains(roomAgreements, "Uzatma Talepleri", "Room AgreementsPanel includes extend tab");
  mustContains(roomAgreements, "Bekleyen", "Room AgreementsPanel includes pending tab");
  mustContains(roomAgreements, "Diğer Sözleşmeler", "Room AgreementsPanel includes other tab");
  mustContains(roomAgreements, 'viewMode === "bridge"', "Room AgreementsPanel renders bridge branch conditionally");
  mustContains(roomAgreements, 'viewMode === "route"', "Room AgreementsPanel renders route branch conditionally");
  mustContains(roomAgreements, 'viewMode === "applied"', "Room AgreementsPanel renders applied route branch conditionally");
  mustContains(roomAgreements, 'viewMode === "extend"', "Room AgreementsPanel renders extend branch conditionally");
  mustContains(roomAgreements, 'viewMode === "pending"', "Room AgreementsPanel renders pending branch conditionally");
  mustContains(roomAgreements, 'viewMode === "other"', "Room AgreementsPanel renders other branch conditionally");
  mustContains(roomAgreementsBridgeSection, "AgreementOpsBridgeCard", "Room AgreementsPanel keeps operation bridge card");
  mustContains(roomAgreements, "RoomAgreementsRouteRefreshPendingSection", "Room AgreementsPanel keeps route refresh pending section");
  mustContains(roomAgreements, "RoomAgreementsRouteRefreshAcceptedSection", "Room AgreementsPanel keeps route refresh accepted section");
  mustContains(roomAgreements, "RoomAgreementsExtendRequestsSection", "Room AgreementsPanel keeps extend requests section");
  mustContains(roomAgreements, "setViewMode(\"bridge\")", "Room AgreementsPanel returns selected contract decisions to bridge tab");
  mustContains(roomAgreements, "Kabul Et", "Room AgreementsPanel keeps approve action");
  mustContains(roomAgreements, "Karşı Teklif", "Room AgreementsPanel keeps counter action");
  mustContains(roomAgreements, "Rota Önizleme", "Room AgreementsPanel keeps route preview action");

  const auditStructure = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(auditStructure, "UX-PANEL-REALITY-CLEANUP-02D", "structure audit carries 02D note");
  mustContains(auditStructure, "Room / Sözleşmeler", "structure audit mentions room agreements");

  must(!normalize(auditStructure).includes("runtime-data"), "structure audit note avoids runtime-data");
  must(!normalize(auditStructure).includes("prisma"), "structure audit note avoids prisma");
  must(!normalize(auditStructure).includes("migration"), "structure audit note avoids migration");

  console.log("=== UX-PANEL-REALITY-CLEANUP-02D CHECK PASS ===");
}

main();
