#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
}

function mustTrue(cond, label) {
  if (cond) ok(label);
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
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stagedNames() {
  return gitLines(["diff", "--cached", "--name-only"]).map((line) => line.replace(/\\/g, "/")).filter(Boolean);
}

function main() {
  console.log("=== UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md");
  const css = read("web/src/index.css");
  const miniMap = read("web/src/components/map/ReadableMiniRouteMap.jsx");
  const orgPlansShared = read("web/src/panels/organization/organizationPlansShared.jsx");
  const plansPanel = read("web/src/panels/organization/PlansPanel.jsx");
  const boardingImpact = read("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx");
  const companyFilters = read("web/src/panels/company/companyShiftsPanelFilters.jsx");
  const companySections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
  const companyAgreements = read("web/src/panels/company/AgreementsPanel.jsx");
  const roomSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");

  mustTrue(exists("backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js"), "mobile overflow mini-map polish check exists");
  mustTrue(exists("docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md"), "mobile overflow mini-map polish doc exists");

  must(pkg, '"check:uxmobileoverflowminimappolish02": "node backend/scripts/ux_mobile_overflow_minimap_polish_02_check.js"', "package.json exposes mobile overflow mini-map polish check");
  ordered(
    runner,
    ["check:uxmobileoverflowminimapreadability01", "check:uxmobileoverflowminimappolish02", "check:uxdensity01"],
    "product extensions runner keeps mobile overflow mini-map polish after readability"
  );
  ordered(
    verify,
    ["check:uxmobileoverflowminimapreadability01", "check:uxmobileoverflowminimappolish02", "check:uxdensity01"],
    "verify chain keeps mobile overflow mini-map polish after readability"
  );

  must(harnessCheck, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "script harness check knows mobile overflow mini-map polish milestone");
  must(harnessCheck, "check:uxmobileoverflowminimappolish02", "script harness check knows mobile overflow mini-map polish alias");
  must(harnessCheck, "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md", "script harness check knows mobile overflow mini-map polish doc");
  must(harnessDoc, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "script harness doc lists mobile overflow mini-map polish milestone");
  must(harnessDoc, "check:uxmobileoverflowminimappolish02", "script harness doc lists mobile overflow mini-map polish alias");
  must(harnessDoc, "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md", "script harness doc lists mobile overflow mini-map polish doc");

  must(guide, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "milestone guide mentions mobile overflow mini-map polish milestone");
  must(guide, "check:uxmobileoverflowminimappolish02", "milestone guide exposes mobile overflow mini-map polish check");
  must(guide, "node backend\\scripts\\ux_mobile_overflow_minimap_polish_02_check.js", "milestone guide includes mobile overflow mini-map polish command");
  must(guide, "docs/UX_MOBILE_OVERFLOW_MINIMAP_POLISH_02.md", "milestone guide includes mobile overflow mini-map polish doc");

  must(doc, "UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02", "mobile overflow mini-map polish doc title present");
  must(doc, "Room / Vardiyalar", "mobile overflow mini-map polish doc covers room surface");
  must(doc, "Company / Vardiyalar", "mobile overflow mini-map polish doc covers company surface");
  must(doc, "Organization / Planlama", "mobile overflow mini-map polish doc covers organization surface");
  must(doc, "ReadableMiniRouteMap", "mobile overflow mini-map polish doc references shared map component");
  must(doc, "MapContainer", "mobile overflow mini-map polish doc references Leaflet map container");
  must(doc, "TileLayer", "mobile overflow mini-map polish doc references real tile layer");
  must(doc, "fitBounds", "mobile overflow mini-map polish doc references viewport fit");
  must(doc, "tileerror", "mobile overflow mini-map polish doc references tile failure fallback");
  must(doc, "tableWrap", "mobile overflow mini-map polish doc mentions tableWrap");
  must(doc, "organizationPlansLayout", "mobile overflow mini-map polish doc mentions organization plans layout");
  must(doc, "organizationPlansSidebar", "mobile overflow mini-map polish doc mentions organization plans sidebar");
  must(doc, "map-preview-pill", "mobile overflow mini-map polish doc mentions map preview pills");
  must(doc, "Haritayı büyüt", "mobile overflow mini-map polish doc keeps map expand wording");
  must(doc, "Haritayı kapat", "mobile overflow mini-map polish doc keeps map close wording");
  must(doc, "OpenStreetMap contributors", "mobile overflow mini-map polish doc keeps tile attribution wording");
  must(doc, "390x844", "mobile overflow mini-map polish doc keeps mobile audit viewport");
  must(doc, "UX-FIX 0", "mobile overflow mini-map polish doc keeps UX-FIX target");
  must(doc, "BLOCKER 0", "mobile overflow mini-map polish doc keeps blocker target");
  must(doc, "NOT-FOUND 0", "mobile overflow mini-map polish doc keeps not-found target");
  must(doc, "Backend route/write-path değişmedi.", "mobile overflow mini-map polish doc keeps backend boundary");
  must(doc, "Schema/migration yok.", "mobile overflow mini-map polish doc keeps schema boundary");
  must(doc, "runtime-data", "mobile overflow mini-map polish doc keeps runtime-data boundary");
  must(doc, "browser-smoke", "mobile overflow mini-map polish doc keeps browser-smoke boundary");
  must(doc, "Sefer Abi", "mobile overflow mini-map polish doc keeps Sefer Abi reference");

  must(css, ".tableWrap {", "global css defines tableWrap");
  must(css, "overflow-x: clip", "global css clips desktop table overflow");
  must(css, "table-layout: fixed", "global css fixes table layout for wrapping");
  must(css, "overflow-wrap: anywhere", "global css allows long cell wrapping");
  must(css, ".organizationPlansLayout {", "global css defines organization plans layout");
  must(css, ".organizationPlansSidebar {", "global css defines organization plans sidebar");
  must(css, "overflow-x: auto", "global css restores mobile table scrolling");

  must(miniMap, "expandable && showOpenMapButton", "shared mini map only overlays when expandable");
  must(miniMap, "onClick={openModal}", "shared mini map overlay opens modal");
  must(miniMap, "routePreviewShiftId", "shared mini map fetches route preview by shift");
  must(miniMap, "routeModeLabel", "shared mini map accepts route mode label");
  must(miniMap, "allowWheelZoomInModal", "shared mini map supports modal wheel zoom toggle");
  must(miniMap, "Haritayı büyüt", "shared mini map keeps expand wording");
  must(miniMap, "Haritayı kapat", "shared mini map keeps close wording");
  must(miniMap, "fitBounds", "shared mini map fits viewport");
  must(miniMap, "tileerror", "shared mini map exposes tile fallback");
  must(miniMap, "map-preview-pill", "shared mini map renders legend pills");

  must(orgPlansShared, "routePreviewShiftId", "organization mini map passes route preview shift");
  must(orgPlansShared, "expandedTitle", "organization mini map sets expanded title");
  must(orgPlansShared, "showOpenMapButton", "organization mini map shows open button");
  must(plansPanel, "publishedShiftId", "organization plans panel passes shift id");

  must(boardingImpact, "mapExpanded", "boarding preview tracks expanded map state");
  must(boardingImpact, "routePreviewShiftId", "boarding preview passes route preview shift");
  must(boardingImpact, "routeModeLabel", "boarding preview passes route mode label");
  must(boardingImpact, "decisionOwnerNoteText", "boarding preview renders decision owner note text");
  must(boardingImpact, "Haritada göster", "boarding preview keeps map toggle wording");

  must(companyFilters, 'width: "min(100%, 220px)"', "company filters use responsive market width");
  must(companyFilters, 'width: "min(100%, 240px)"', "company filters use responsive pending/status width");
  must(companySections, 'width: "min(100%, 240px)"', "company sections use responsive extend width");
  must(companySections, 'flex: "1 1 260px", minWidth: 0', "company sections use responsive note width");
  must(companySections, 'width: "min(100%, 220px)"', "company sections use responsive room search width");
  must(companySections, 'width: "min(100%, 180px)"', "company sections use responsive amount width");
  must(companySections, 'flex: "1 1 240px", minWidth: 0', "company sections use responsive note width 2");
  mustNot(companyAgreements, "minWidth: 980", "company agreements removes hardcoded wide table width");
  must(roomSections, 'width: "min(100%, 280px)"', "room shifts uses responsive pending search width");
  must(roomSections, 'width: "min(100%, 320px)"', "room shifts uses responsive list search width");
  mustNot(roomSections, "minWidth: 280", "room shifts removes hardcoded pending search width");
  mustNot(roomSections, "minWidth: 320", "room shifts removes hardcoded list search width");

  mustNot(companyFilters, "minWidth: 220", "company filters remove fixed market width");
  mustNot(companyFilters, "minWidth: 240", "company filters remove fixed pending/status width");
  mustNot(companySections, "minWidth: 240", "company sections remove fixed extend width");
  mustNot(companySections, "minWidth: 260", "company sections remove fixed note width");
  mustNot(companySections, "minWidth: 220", "company sections remove fixed room search width");
  mustNot(companySections, "minWidth: 180", "company sections remove fixed amount width");
  mustNot(companySections, "minWidth: 240", "company sections remove second fixed note width");
  mustNot(companyAgreements, "minWidth: 980", "company agreements removes fixed table width");

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "prisma", "backend/prisma"]);
  mustTrue(routeDiff.length === 0, "backend route/service/schema diff stays empty");

  console.log("=== UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
