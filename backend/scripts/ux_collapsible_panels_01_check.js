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

function countCollapsibles(text) {
  return (String(text || "").match(/CollapsibleSection/g) || []).length;
}

function main() {
  console.log("=== UX-COLLAPSIBLE-PANELS-01 CHECK ===");

  const auditPath = "docs/UX_COLLAPSIBLE_PANELS_AUDIT_V1.md";
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

  const component = read("web/src/components/CollapsibleSection.jsx");
  mustContains(component, "aria-expanded", "CollapsibleSection is accessible");
  mustContains(component, "defaultOpen", "CollapsibleSection exposes defaultOpen");

  const style = read("web/src/index.css");
  mustContains(style, ".collapsibleSection", "collapsible section styles exist");
  mustContains(style, ".collapsibleSectionBody", "collapsible body styles exist");
  mustContains(style, ".collapsibleSectionChevron", "collapsible chevron styles exist");

  const op = read("web/src/panels/room/OperationHealthPanel.jsx");
  const today = read("web/src/panels/driver/TodayPanel.jsx");
  const route = read("web/src/panels/driver/RoutePanel.jsx");
  const parent = read("web/src/panels/parent/LivePanel.jsx");
  const companyAgreements = read("web/src/panels/company/AgreementsPanel.jsx");
  const routeRefreshPending = read("web/src/panels/company/companyAgreementsRouteRefreshPendingSection.jsx");
  const sourceShift = read("web/src/panels/company/companyAgreementsSourceShiftSection.jsx");

  const p0PanelsWithAccordion = [op, today, route, parent, companyAgreements].filter((text) => countCollapsibles(text) > 0).length;
  must(p0PanelsWithAccordion >= 3, "at least 3 P0 panels use collapsible/accordion");

  mustContains(op, "RoomOperationsBoard", "Room / Operasyon Sağlığı keeps summary board open");
  mustContains(op, "MetricCard", "Room / Operasyon Sağlığı keeps critical metrics open");
  mustContains(op, "PanelSegmentTabs", "Room / Operasyon Sağlığı uses functional tabs");
  mustContains(op, "activeTab", "Room / Operasyon Sağlığı has active tab state");
  mustContains(op, "role=\"tabpanel\"", "Room / Operasyon Sağlığı exposes tabpanel sections");
  mustContains(op, "Şartlı Küme", "Room / Operasyon Sağlığı keeps conditional cluster tab");
  mustContains(op, "Sorunlu Sürücüler", "Room / Operasyon Sağlığı keeps driver tab");
  mustContains(op, "Açık Sorunlar", "Room / Operasyon Sağlığı keeps issues tab");

  mustContains(today, "Aktif Görev", "Driver / Bugün keeps active task visible");
  mustContains(today, "Bugün Vardiyalar", "Driver / Bugün keeps today's list visible");
  mustContains(today, "CollapsibleSection", "Driver / Bugün uses collapsible secondary block");

  mustContains(route, "MapView", "Driver / Rota keeps map visible");
  mustContains(route, "StopTimeline", "Driver / Rota keeps timeline visible");
  mustContains(route, "CollapsibleSection", "Driver / Rota uses collapsible route details");
  must(!normalize(route).includes("showqueue"), "Driver / Rota no longer uses manual queue toggle state");

  mustContains(parent, "MapView", "Parent / Canlı Takip keeps map visible");
  mustContains(parent, "Çocuğun durağı", "Parent / Canlı Takip keeps child-stop summary visible");
  mustContains(parent, "CollapsibleSection", "Parent / Canlı Takip uses collapsible secondary lists");

  mustContains(companyAgreements, "CompanyAgreementsSelectedSummarySection", "Company / Sözleşmeler keeps selected summary visible");
  mustContains(companyAgreements, 'table className="tbl"', "Company / Sözleşmeler keeps main table visible");
  mustContains(companyAgreements, "CollapsibleSection", "Company / Sözleşmeler uses collapsible secondary details");
  mustContains(routeRefreshPending, "CollapsibleSection", "route refresh pending section is collapsible");
  mustContains(sourceShift, "CollapsibleSection", "source shift section is collapsible");

  const nav = read("web/src/layout/NavDock.jsx");
  const copilot = read("web/src/utils/copilotFacts.js");
  mustContains(nav, "companyKind", "NavDock role/kind logic preserved");
  mustContains(nav, "Sefer Abi Terminali", "NavDock keeps Sefer Abi Terminali");
  mustContains(copilot, "Sefer Abi’ye Sor", "Copilot keeps Sefer Abi’ye Sor");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-COLLAPSIBLE-PANELS-01", "milestone guide mentions UX-COLLAPSIBLE-PANELS-01");
  mustContains(guide, "check:uxcollapsiblepanels01", "milestone guide exposes check:uxcollapsiblepanels01");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json exposes check:uxcollapsiblepanels01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxcollapsiblepanels01", "product extensions chain keeps collapsible panels check");
  mustContains(runner, "check:etasanity01", "product extensions chain keeps ETA-SANITY-01");
  mustContains(runner, "check:etaosrm01", "product extensions chain keeps ETA-OSRM-01");
  mustContains(runner, "check:etaosrm02", "product extensions chain keeps ETA-OSRM-02");
  mustContains(runner, "check:livetrackingfinal01", "product extensions chain keeps LIVE-TRACKING-FINAL-01");
  mustContains(runner, "check:driverflowfinal01", "product extensions chain keeps DRIVER-FLOW-FINAL-01");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxcollapsiblepanels01", "verify chain keeps collapsible panels check");
  mustContains(verify, "check:etasanity01", "verify chain keeps ETA-SANITY-01");
  mustContains(verify, "check:etaosrm01", "verify chain keeps ETA-OSRM-01");
  mustContains(verify, "check:etaosrm02", "verify chain keeps ETA-OSRM-02");
  mustContains(verify, "check:livetrackingfinal01", "verify chain keeps LIVE-TRACKING-FINAL-01");
  mustContains(verify, "check:driverflowfinal01", "verify chain keeps DRIVER-FLOW-FINAL-01");

  mustContains(audit, "Runtime-data dosyalarına dokunulmadı.", "audit states runtime-data untouched");
  mustContains(audit, "Sefer Abi Terminali", "audit preserves Sefer Abi Terminali boundary");
  mustContains(audit, "Sefer Abi’ye Sor", "audit preserves Sefer Abi drawer boundary");

  mustContains(audit, "Room / Operasyon Sağlığı", "audit mentions room operation health");
  mustContains(audit, "Driver / Bugün", "audit mentions driver today");
  mustContains(audit, "Driver / Rota", "audit mentions driver route");
  mustContains(audit, "Parent / Canlı Takip", "audit mentions parent live tracking");
  mustContains(audit, "Company / Sözleşmeler", "audit mentions company agreements");

  console.log("=== UX-COLLAPSIBLE-PANELS-01 CHECK PASS ===");
}

main();
