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

function countOccurrences(text, needle) {
  const hay = normalize(text);
  const n = normalize(needle);
  if (!n) return 0;
  return hay.split(n).length - 1;
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log("=== UX-PANEL-TABS-FUNCTIONAL-02B-FIX-01 CHECK ===");

  const tabs = read("web/src/components/PanelSegmentTabs.jsx");
  mustContains(tabs, "onChange", "PanelSegmentTabs supports onChange");
  mustContains(tabs, "onSelect", "PanelSegmentTabs supports onSelect");
  mustContains(tabs, "onClick", "PanelSegmentTabs supports click callback");
  mustContains(tabs, "aria-selected", "PanelSegmentTabs keeps aria-selected");
  mustContains(tabs, "role=\"tab\"", "PanelSegmentTabs keeps tab semantics");

  const commercialCore = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  mustContains(commercialCore, "const [viewTab, setViewTab] = useState(\"summary\")", "CommercialCore has active tab state");
  mustContains(commercialCore, "onSelect={setViewTab}", "CommercialCore wires tab select handler");
  mustContains(commercialCore, "tabSectionRefs", "CommercialCore uses section refs for focus");
  mustContains(commercialCore, "scrollIntoView", "CommercialCore scrolls to active section");
  mustContains(commercialCore, "viewTab === \"proof\"", "CommercialCore has a functional proof section");
  mustContains(commercialCore, "Ticari akış bölümleri", "CommercialCore tab labels exist");
  mustContains(commercialCore, "Özet", "CommercialCore includes summary tab");
  mustContains(commercialCore, "Hakediş", "CommercialCore includes billing tab");
  mustContains(commercialCore, "Ödeme Hazırlık", "CommercialCore includes payment prep tab");
  mustContains(commercialCore, "Komisyon", "CommercialCore includes commission tab");
  mustContains(commercialCore, "Kalite / Kanıt", "CommercialCore includes proof tab");
  mustContains(commercialCore, "Riskler", "CommercialCore includes risk tab");
  mustContains(commercialCore, "Geçmiş", "CommercialCore includes history tab");

  const roomMap = read("web/src/panels/room/MapPanel.jsx");
  mustContains(roomMap, "const [mapTab, setMapTab] = useState(\"map\")", "Room map has active tab state");
  mustContains(roomMap, "mapTabRefs", "Room map uses tab refs");
  mustContains(roomMap, "scrollIntoView", "Room map scrolls to active section");
  mustContains(roomMap, "Harita Önizleme", "Room map includes map preview section");
  mustContains(roomMap, "selectedSummaryText", "Room map keeps compact summary text");
  mustContains(roomMap, "selectedHistoryLine", "Room map keeps short history line");
  mustContains(roomMap, "selectedRiskLines", "Room map exposes risk section");
  mustContains(roomMap, 'label: "Harita"', "Room map keeps Harita tab label");
  mustContains(roomMap, 'label: "Araçlar"', "Room map keeps Araçlar tab label");
  mustNotContains(roomMap, 'label: "Özet"', "Room map removes summary tab label");
  mustNotContains(roomMap, 'label: "Rota / Durak"', "Room map removes route tab label");
  mustNotContains(roomMap, 'label: "GPS Durumu"', "Room map removes GPS tab label");
  mustNotContains(roomMap, 'label: "Riskler"', "Room map removes risk tab label");
  mustNotContains(roomMap, 'label: "Geçmiş"', "Room map removes history tab label");
  mustNotContains(roomMap, 'mapTab === "summary"', "Room map removes summary branch");
  mustNotContains(roomMap, 'mapTab === "route"', "Room map removes route branch");
  mustNotContains(roomMap, 'mapTab === "gps"', "Room map removes gps branch");
  mustNotContains(roomMap, 'mapTab === "risk"', "Room map removes risk branch");
  mustNotContains(roomMap, 'mapTab === "history"', "Room map removes history branch");
  must(countOccurrences(roomMap, 'mapTab === "') === 2, "Room map keeps exactly two tab branches");

  const roomCommercial = read("web/src/panels/room/CommercialFlowPanel.jsx");
  mustContains(roomCommercial, "PanelSegmentTabs", "Room commercial flow uses segmented tabs");
  mustContains(roomCommercial, "viewMode === \"contractShift\"", "Room commercial flow defaults to contract/shift render");
  mustContains(roomCommercial, "viewMode === \"settlement\"", "Room commercial flow has settlement tab render");
  mustContains(roomCommercial, "viewMode === \"contractShift\"", "Room commercial flow has contract/shift tab render");
  mustContains(roomCommercial, "viewMode === \"offers\"", "Room commercial flow has offers tab render");
  mustContains(roomCommercial, "viewMode === \"quality\"", "Room commercial flow has quality tab render");
  mustContains(roomCommercial, "viewMode === \"payment\"", "Room commercial flow has payment tab render");
  mustContains(roomCommercial, "viewMode === \"history\"", "Room commercial flow has history tab render");
  must(!roomCommercial.includes('key: "summary"'), "Room commercial flow no longer exposes summary tab key");
  must(!roomCommercial.includes('label: "İlk adım"'), "Room commercial flow no longer exposes first-step tab label");

  const companyCommercial = read("web/src/panels/company/CommercialFlowPanel.jsx");
  mustNotContains(companyCommercial, "PanelSegmentTabs", "Company commercial flow removes decorative segmented tabs");
  mustNotContains(companyCommercial, "viewMode === \"summary\"", "Company commercial flow removes summary render");
  mustNotContains(companyCommercial, "viewMode === \"list\"", "Company commercial flow removes list tab render");
  mustNotContains(companyCommercial, "viewMode === \"selected\"", "Company commercial flow removes selected tab render");
  mustContains(companyCommercial, "Ticari Akış Listesi", "Company commercial flow keeps main list title");
  mustContains(companyCommercial, "Seçili kayıt", "Company commercial flow keeps selected record panel");
  mustContains(companyCommercial, "companyCommercialFlowSplit", "Company commercial flow keeps single-page split layout");

  const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
  mustContains(agreements, "PanelSegmentTabs", "Company agreements uses segmented tabs");
  mustContains(agreements, 'useState("list")', "Company agreements defaults to list");
  mustContains(agreements, "viewMode === \"bridge\"", "Company agreements has bridge render");
  mustContains(agreements, "viewMode === \"wizard\"", "Company agreements has wizard render");
  mustContains(agreements, "viewMode === \"list\"", "Company agreements has list render");
  mustNotContains(agreements, "viewMode === \"summary\"", "Company agreements removes summary render");
  mustNotContains(agreements, 'label: "Özet"', "Company agreements removes summary tab label");

  const shiftsIntro = read("web/src/panels/company/CompanyShiftsPanelIntro.jsx");
  mustContains(shiftsIntro, "Shifts (COMPANY)", "Company shifts intro keeps title");
  mustContains(shiftsIntro, "Market", "Company shifts intro keeps market count");
  mustContains(shiftsIntro, "Bekleyen", "Company shifts intro keeps pending count");
  mustContains(shiftsIntro, "Sözleşmeden Üretilen", "Company shifts intro keeps contract count");
  mustContains(shiftsIntro, "Diğer Vardiyalar", "Company shifts intro keeps other count");
  mustNotContains(shiftsIntro, "PanelSegmentTabs", "Company shifts intro removes decorative tab row");
  mustNotContains(shiftsIntro, "mainTab === \"create\"", "Company shifts intro removes create branch");
  mustNotContains(shiftsIntro, "Planlama Merkezi'ne git", "Company shifts intro removes planning center action");
  mustNotContains(shiftsIntro, "Takibe dön", "Company shifts intro removes return-to-track action");

  const shiftsTrackView = read("web/src/panels/company/CompanyShiftsPanelTrackView.jsx");
  mustContains(shiftsTrackView, "PanelSegmentTabs", "Company shifts track view uses segmented tabs");
  mustContains(shiftsTrackView, 'tabs={[', "Company shifts track view defines tab list");
  mustContains(shiftsTrackView, 'key: "market"', "Company shifts track view keeps market tab");
  mustContains(shiftsTrackView, 'key: "pending"', "Company shifts track view keeps pending tab");
  mustContains(shiftsTrackView, 'key: "contract"', "Company shifts track view keeps contract tab");
  mustContains(shiftsTrackView, 'key: "other"', "Company shifts track view keeps other tab");
  mustContains(shiftsTrackView, 'trackTab === "market"', "Company shifts track view renders market branch");
  mustContains(shiftsTrackView, 'trackTab === "pending"', "Company shifts track view renders pending branch");
  mustContains(shiftsTrackView, 'trackTab === "contract"', "Company shifts track view renders contract branch");
  mustContains(shiftsTrackView, 'trackTab === "other"', "Company shifts track view renders other branch");
  must(countMatches(shiftsTrackView, /trackTab === "/g) === 4, "Company shifts track view keeps exactly four branches");
  mustNotContains(shiftsTrackView, "Oluşturma", "Company shifts track view removes create wording");
  mustNotContains(shiftsTrackView, "Planlama Merkezi", "Company shifts track view removes planning center wording");
  mustNotContains(shiftsTrackView, "Liste", "Company shifts track view removes list wording");

  const audit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(audit, "Functional tab fix", "structure audit includes functional tab fix note");
  mustContains(audit, "Room/MapPanel", "structure audit includes room map follow-up");
  mustContains(audit, "CompanyShiftsPanelIntro", "structure audit includes company shifts intro follow-up");
  mustContains(audit, "CommercialCorePanel", "structure audit still mentions CommercialCorePanel");
  mustContains(audit, "scroll/focus", "structure audit notes scroll/focus behavior");
  must(!normalize(audit).includes("runtime-data"), "audit avoids runtime-data");
  must(!normalize(audit).includes("prisma"), "audit avoids prisma");
  must(!normalize(audit).includes("migration"), "audit avoids migration");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-STRUCTURE-02B-FIX-01", "milestone guide mentions UX-PANEL-STRUCTURE-02B-FIX-01");
  mustContains(guide, "check:uxpaneltabsfix01", "milestone guide exposes check:uxpaneltabsfix01");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpaneltabsfix01"', "package.json exposes check:uxpaneltabsfix01");
  mustContains(pkg, '"check:uxpanelstructure02b"', "package.json keeps check:uxpanelstructure02b");
  mustContains(pkg, '"check:uxpanelstructure02"', "package.json keeps check:uxpanelstructure02");
  mustContains(pkg, '"check:uxpanelinventory02a"', "package.json keeps check:uxpanelinventory02a");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json keeps check:uxcollapsiblepanels01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxpaneltabsfix01", "product extensions runner includes UX-PANEL-TABS-FUNCTIONAL-02B-FIX-01");
  mustContains(runner, "check:uxpanelstructure02b", "product extensions runner keeps UX-PANEL-STRUCTURE-02B");
  mustContains(runner, "check:uxpanelstructure02", "product extensions runner keeps UX-PANEL-STRUCTURE-02");
  mustContains(runner, "check:uxpanelinventory02a", "product extensions runner keeps UX-PANEL-INVENTORY-02A");
  mustContains(runner, "check:uxcollapsiblepanels01", "product extensions runner keeps UX-COLLAPSIBLE-PANELS-01");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxpaneltabsfix01", "verify chain includes UX-PANEL-TABS-FUNCTIONAL-02B-FIX-01");
  mustContains(verify, "check:uxpanelstructure02b", "verify chain keeps UX-PANEL-STRUCTURE-02B");
  mustContains(verify, "check:uxpanelstructure02", "verify chain keeps UX-PANEL-STRUCTURE-02");
  mustContains(verify, "check:uxpanelinventory02a", "verify chain keeps UX-PANEL-INVENTORY-02A");
  mustContains(verify, "check:uxcollapsiblepanels01", "verify chain keeps UX-COLLAPSIBLE-PANELS-01");

  console.log("=== UX-PANEL-TABS-FUNCTIONAL-02B-FIX-01 CHECK PASS ===");
}

main();
