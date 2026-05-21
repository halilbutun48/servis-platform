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

function countOccurrences(text, needle) {
  const hay = normalize(text);
  const n = normalize(needle);
  if (!n) return 0;
  return hay.split(n).length - 1;
}

function main() {
  console.log("=== UX-LIVE-MAP-TABS-SIMPLIFY-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxlivemaptabssimplify01"', "package.json exposes check:uxlivemaptabssimplify01");
  mustContains(pkg, '"check:uxlivemaptabsfix01"', "package.json keeps check:uxlivemaptabsfix01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxlivemaptabssimplify01", "product extensions runner includes UX-LIVE-MAP-TABS-SIMPLIFY-01");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxlivemaptabssimplify01", "verify chain includes UX-LIVE-MAP-TABS-SIMPLIFY-01");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-LIVE-MAP-TABS-SIMPLIFY-01", "milestone guide mentions UX-LIVE-MAP-TABS-SIMPLIFY-01");
  mustContains(guide, "check:uxlivemaptabssimplify01", "milestone guide exposes check:uxlivemaptabssimplify01");

  const audit = read("docs/UX_PANEL_REALITY_AUDIT_02C.md");
  mustContains(audit, "UX-LIVE-MAP-TABS-SIMPLIFY-01", "reality audit mentions UX-LIVE-MAP-TABS-SIMPLIFY-01");
  mustContains(audit, "Room / Canlı Takip", "reality audit keeps room live tracking reference");

  const mapPanel = read("web/src/panels/room/MapPanel.jsx");
  const markerJs = read("web/src/lib/markers/vehicleMarkerC.js");
  const markerCss = read("web/src/components/map/markers.css");

  mustContains(mapPanel, "PanelSegmentTabs", "Room MapPanel keeps segmented tabs");
  mustContains(mapPanel, 'const [mapTab, setMapTab] = useState("map")', "Room MapPanel defaults to Harita tab");
  mustContains(mapPanel, "onChange={setMapTab}", "Room MapPanel wires active tab setter");
  mustContains(mapPanel, "role=\"tabpanel\"", "Room MapPanel uses tabpanel semantics");
  mustContains(mapPanel, "MapView", "Room MapPanel keeps map view");
  mustContains(mapPanel, "renderVehicleListCard", "Room MapPanel keeps live list renderer");
  mustContains(mapPanel, "selectedRiskLines", "Room MapPanel keeps risk content");
  mustContains(mapPanel, "selectedHistoryLine", "Room MapPanel keeps short history line");
  mustContains(mapPanel, "selectedSummaryText", "Room MapPanel keeps compact summary text");
  mustContains(mapPanel, "Harita Önizleme", "Room MapPanel keeps map preview surface");
  mustContains(mapPanel, "Son güncelleme:", "Room MapPanel keeps short history wording");
  mustContains(mapPanel, "getEtaDisplay", "Room MapPanel keeps safe ETA helper");
  mustContains(mapPanel, "getGpsAgeText", "Room MapPanel keeps safe GPS age helper");
  mustContains(mapPanel, 'label: "Harita"', "Room MapPanel keeps Harita tab label");
  mustContains(mapPanel, 'label: "Araçlar"', "Room MapPanel keeps Araçlar tab label");

  mustNotContains(mapPanel, 'label: "Özet"', "Room MapPanel removed Özet tab");
  mustNotContains(mapPanel, 'label: "Rota / Durak"', "Room MapPanel removed Rota / Durak tab");
  mustNotContains(mapPanel, 'label: "GPS Durumu"', "Room MapPanel removed GPS Durumu tab");
  mustNotContains(mapPanel, 'label: "Riskler"', "Room MapPanel removed Riskler tab");
  mustNotContains(mapPanel, 'label: "Geçmiş"', "Room MapPanel removed Geçmiş tab");
  mustNotContains(mapPanel, 'mapTab === "summary"', "Room MapPanel removed summary branch");
  mustNotContains(mapPanel, 'mapTab === "route"', "Room MapPanel removed route branch");
  mustNotContains(mapPanel, 'mapTab === "gps"', "Room MapPanel removed gps branch");
  mustNotContains(mapPanel, 'mapTab === "risk"', "Room MapPanel removed risk branch");
  mustNotContains(mapPanel, 'mapTab === "history"', "Room MapPanel removed history branch");
  must(countOccurrences(mapPanel, 'mapTab === "') === 2, "Room MapPanel keeps exactly two conditional tab branches");

  mustContains(markerJs, "bus.svg", "bus.svg marker remains referenced");
  mustContains(markerCss, "object-fit: contain", "marker css keeps contain sizing");

  mustNotContains(mapPanel, "runtime-data", "Room MapPanel avoids runtime-data wording");
  mustNotContains(mapPanel, "prisma", "Room MapPanel avoids prisma wording");
  mustNotContains(mapPanel, "migration", "Room MapPanel avoids migration wording");
  mustNotContains(audit, "runtime-data", "reality audit avoids runtime-data");
  mustNotContains(audit, "prisma", "reality audit avoids prisma");
  mustNotContains(audit, "migration", "reality audit avoids migration");

  console.log("=== UX-LIVE-MAP-TABS-SIMPLIFY-01 CHECK PASS ===");
}

main();
