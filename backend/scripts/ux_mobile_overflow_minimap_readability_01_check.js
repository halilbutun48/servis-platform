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

function must(cond, label) {
  if (!cond) fail(label);
  ok(label);
}

function mustTrue(cond, label) {
  must(Boolean(cond), label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContain(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
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

function countOccurrences(text, needle) {
  const haystack = normalize(text);
  const target = normalize(needle);
  if (!target) return 0;
  return haystack.split(target).length - 1;
}

function mustCountAtLeast(text, needle, min, label) {
  must(countOccurrences(text, needle) >= min, label);
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

function main() {
  console.log("=== UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md");
  const css = read("web/src/index.css");
  const miniMap = read("web/src/components/map/ReadableMiniRouteMap.jsx");
  const schoolOps = read("web/src/panels/school/OperationsPanel.jsx");
  const plansPanel = read("web/src/panels/organization/PlansPanel.jsx");
  const orgPlansShared = read("web/src/panels/organization/organizationPlansShared.jsx");
  const boardingImpact = read("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx");
  const roomShiftsSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const companyShiftsSections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
  const companyAgreementsPanel = read("web/src/panels/company/AgreementsPanel.jsx");
  const organizationCenterPanel = read("web/src/panels/organization/CenterPanel.jsx");

  mustTrue(exists("backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js"), "mobile overflow mini-map readability check exists");
  mustTrue(exists("docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md"), "mobile overflow mini-map readability doc exists");

  mustContains(pkg, '"check:uxmobileoverflowminimapreadability01": "node backend/scripts/ux_mobile_overflow_minimap_readability_01_check.js"', "package.json exposes mobile overflow mini-map readability check");
  ordered(
    runner,
    ["check:uxmobileallrolespanelfix01", "check:uxmobileoverflowminimapreadability01", "check:uxdensity01"],
    "product extensions runner keeps mobile overflow mini-map readability after mobile all roles panel fix"
  );
  ordered(
    verify,
    ["check:uxmobileallrolespanelfix01", "check:uxmobileoverflowminimapreadability01", "check:uxdensity01"],
    "verify chain keeps mobile overflow mini-map readability after mobile all roles panel fix"
  );

  mustContains(harnessCheck, "UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01", "script harness check knows mobile overflow mini-map readability milestone");
  mustContains(harnessCheck, "check:uxmobileoverflowminimapreadability01", "script harness check knows mobile overflow mini-map readability alias");
  mustContains(harnessCheck, "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md", "script harness check knows mobile overflow mini-map readability doc");
  mustContains(harnessDoc, "UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01", "script harness doc lists mobile overflow mini-map readability milestone");
  mustContains(harnessDoc, "check:uxmobileoverflowminimapreadability01", "script harness doc lists mobile overflow mini-map readability alias");
  mustContains(harnessDoc, "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md", "script harness doc lists mobile overflow mini-map readability doc");

  mustContains(guide, "UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01", "milestone guide mentions mobile overflow mini-map readability milestone");
  mustContains(guide, "check:uxmobileoverflowminimapreadability01", "milestone guide exposes mobile overflow mini-map readability check");
  mustContains(guide, "node backend\\scripts\\ux_mobile_overflow_minimap_readability_01_check.js", "milestone guide includes mobile overflow mini-map readability command");
  mustContains(guide, "docs/UX_MOBILE_OVERFLOW_MINIMAP_READABILITY_01.md", "milestone guide includes mobile overflow mini-map readability doc");

  mustContains(doc, "UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01", "mobile overflow mini-map readability doc title present");
  mustContains(doc, "Room / Vardiyalar", "mobile overflow mini-map readability doc covers room baseline");
  mustContains(doc, "School / Operasyon Paneli", "mobile overflow mini-map readability doc covers school operations");
  mustContains(doc, "Organization / Planlama", "mobile overflow mini-map readability doc covers organization plan mini map");
  mustContains(doc, "ReadableMiniRouteMap", "mobile overflow mini-map readability doc references shared Leaflet component");
  mustContains(doc, "MapContainer", "mobile overflow mini-map readability doc references Leaflet map container");
  mustContains(doc, "TileLayer", "mobile overflow mini-map readability doc references real tile layer");
  mustContains(doc, "fitBounds", "mobile overflow mini-map readability doc references viewport fit");
  mustContains(doc, "tileerror", "mobile overflow mini-map readability doc references tile failure fallback");
  mustContains(doc, "tableWrap", "mobile overflow mini-map readability doc mentions tableWrap");
  mustContains(doc, "organizationPlansLayout", "mobile overflow mini-map readability doc mentions organization plans layout");
  mustContains(doc, "organizationPlansSidebar", "mobile overflow mini-map readability doc mentions organization plans sidebar");
  mustContains(doc, "map-preview-pill", "mobile overflow mini-map readability doc mentions map preview pills");
  mustContains(doc, "Eski", "mobile overflow mini-map readability doc keeps boarding legend wording");
  mustContains(doc, "Yeni", "mobile overflow mini-map readability doc keeps boarding legend wording");
  mustContains(doc, "Başlangıç", "mobile overflow mini-map readability doc keeps plan legend wording");
  mustContains(doc, "Bitiş", "mobile overflow mini-map readability doc keeps plan legend wording");
  mustContains(doc, "1..N", "mobile overflow mini-map readability doc keeps sequential legend wording");
  mustContains(doc, "Harita döşemeleri yüklenemedi", "mobile overflow mini-map readability doc keeps tile fallback wording");
  mustContains(doc, "OpenStreetMap contributors", "mobile overflow mini-map readability doc keeps tile attribution wording");
  mustContains(doc, "390x844", "mobile overflow mini-map readability doc keeps mobile audit viewport");
  mustContains(doc, "UX-FIX 0", "mobile overflow mini-map readability doc keeps UX-FIX target");
  mustContains(doc, "BLOCKER 0", "mobile overflow mini-map readability doc keeps blocker target");
  mustContains(doc, "NOT-FOUND 0", "mobile overflow mini-map readability doc keeps not-found target");
  mustContains(doc, "Backend route/write-path değişmedi.", "mobile overflow mini-map readability doc keeps backend boundary");
  mustContains(doc, "Schema/migration yok.", "mobile overflow mini-map readability doc keeps schema boundary");
  mustContains(doc, "runtime-data", "mobile overflow mini-map readability doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "mobile overflow mini-map readability doc keeps browser-smoke boundary");
  mustContains(doc, "Sefer Abi", "mobile overflow mini-map readability doc keeps Sefer Abi reference");

  mustContains(css, ".organizationPlansLayout {", "global css defines organization plans layout");
  mustContains(css, ".organizationPlansSidebar {", "global css defines organization plans sidebar");
  ordered(
    css,
    [".organizationPlansLayout {", "grid-template-columns: 1fr;", ".organizationPlansSidebar {", "position: static;"],
    "global css stacks organization plans layout on mobile"
  );

  mustCountAtLeast(schoolOps, 'className="tableWrap"', 5, "school operations uses tableWrap for every table surface");
  mustNotContain(schoolOps, 'overflowX: "auto"', "school operations no longer uses inline overflow wrappers");

  mustContains(plansPanel, "organizationPlansLayout", "organization plans panel uses responsive outer layout");
  mustContains(plansPanel, "organizationPlansSidebar", "organization plans panel uses sticky sidebar class");
  mustNotContain(plansPanel, 'gridTemplateColumns: "280px minmax(0,1fr) 250px"', "organization plans panel no longer hardcodes the three-column grid inline");
  mustNotContain(plansPanel, 'position: "sticky"', "organization plans panel moves sticky sidebar styling to css");

  mustContains(miniMap, "MapContainer", "shared mini map uses MapContainer");
  mustContains(miniMap, "TileLayer", "shared mini map uses real tiles");
  mustContains(miniMap, "Polyline", "shared mini map draws route line");
  mustContains(miniMap, "CircleMarker", "shared mini map draws markers");
  mustContains(miniMap, "Tooltip", "shared mini map labels markers");
  mustContains(miniMap, "fitBounds", "shared mini map fits viewport");
  mustContains(miniMap, "tileerror", "shared mini map exposes tile failure fallback");
  mustContains(miniMap, "Harita döşemeleri yüklenemedi", "shared mini map shows tile failure fallback");
  mustContains(miniMap, "map-preview-pill", "shared mini map renders legend pills");
  mustContains(miniMap, "OpenStreetMap contributors", "shared mini map uses real tile attribution");
  mustContains(miniMap, "Leaflet tile arka planlı mini rota görünümü", "shared mini map reflects real leaflet map wording");
  mustContains(miniMap, "Koordinat eklenince burada tile arka planlı mini harita görünür.", "shared mini map fallback note present");

  mustContains(orgPlansShared, "ReadableMiniRouteMap", "organization mini map uses shared Leaflet component");
  mustContains(orgPlansShared, "Mini Harita Önizleme", "organization mini map title present");
  mustContains(orgPlansShared, "Başlangıç", "organization mini map keeps start legend");
  mustContains(orgPlansShared, "Bitiş", "organization mini map keeps end legend");
  mustContains(orgPlansShared, "1..N", "organization mini map keeps sequential legend");
  mustContains(orgPlansShared, "Koordinatlı konum ekleyin.", "organization mini map fallback text present");
  mustContains(orgPlansShared, "tile arka planında gösterilir", "organization mini map mentions tile background");
  mustNotContain(orgPlansShared, "<svg", "organization mini map no longer uses svg drawing");

  mustContains(boardingImpact, "ReadableMiniRouteMap", "boarding route impact mini map uses shared Leaflet component");
  mustContains(boardingImpact, "Eski", "boarding route impact mini map keeps old-stop label");
  mustContains(boardingImpact, "Yeni", "boarding route impact mini map keeps requested-stop label");
  mustContains(boardingImpact, "1..N", "boarding route impact mini map keeps sequential legend");
  mustContains(boardingImpact, "Readonly önizleme — rota uygulanmaz", "boarding route impact mini map keeps readonly wording");
  mustContains(boardingImpact, "Harita için yeterli koordinat yok. Rota etkisi metinsel olarak önizleniyor.", "boarding route impact mini map keeps fallback wording");
  mustContains(boardingImpact, "Leaflet mini-harita", "boarding route impact mini map mentions leaflet mini map");
  mustNotContain(boardingImpact, "boardingRoutePreviewGrid", "boarding route impact mini map no longer uses abstract grid");
  mustNotContain(boardingImpact, "<svg", "boarding route impact mini map no longer uses svg drawing");

  mustContains(roomShiftsSections, "tableWrap", "room shifts sections still use tableWrap");
  mustContains(companyShiftsSections, "tableWrap", "company shifts sections still use tableWrap");
  mustContains(companyAgreementsPanel, "tableWrap", "company agreements panel still uses tableWrap");
  mustContains(organizationCenterPanel, "tableWrap", "organization center panel still uses tableWrap");

  const routeDiff = gitLines(["diff", "--name-only", "--", "backend/src/routes", "backend/src/services", "Prisma", "backend/prisma"]);
  must(routeDiff.length === 0, "backend route/service/schema diff stays empty");

  console.log("=== UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
