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

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) return text.slice(start);
  return text.slice(start, end);
}

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-03 CHECK ===");

  const auditPath = "docs/UX_PANEL_STRUCTURE_02_AUDIT.md";
  must(exists(auditPath), "structure audit doc exists");
  const audit = read(auditPath);
  mustContains(audit, "UX-PANEL-LAYOUT-WIDTH-02C-FIX-03", "audit includes layout width fix 03 note");
  mustContains(audit, "Room / Ticari Akışım", "audit mentions Room / Ticari Akışım");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-LAYOUT-WIDTH-02C-FIX-03", "milestone guide mentions width fix 03");
  mustContains(guide, "check:uxpanellayoutwidth02cfix03", "milestone guide exposes width fix 03 check");

  const roomCommercial = read("web/src/panels/room/CommercialFlowPanel.jsx");
  const summaryBlock = sliceBetween(
    roomCommercial,
    "if (viewMode === \"summary\") {",
    "if (viewMode === \"settlement\") {",
  );

  mustContains(roomCommercial, "roomCommercialWorkspaceFull", "Room commercial flow uses room full-width workspace container");
  mustContains(roomCommercial, "roomCommercialWorkspaceFullSplit", "Room commercial flow uses room full-width split grid");
  mustContains(roomCommercial, "PanelSegmentTabs", "Room commercial flow keeps segmented tabs");
  mustContains(roomCommercial, "viewMode === \"contractShift\"", "Room commercial flow defaults to contract/shift render");
  mustContains(roomCommercial, "Sözleşme & Vardiya", "Room commercial flow keeps contract/shift landing tab");
  mustContains(roomCommercial, "viewMode === \"history\"", "Room commercial flow keeps history render");
  mustContains(roomCommercial, "<div className=\"panelSectionTitle\">Seçili kayıt</div>", "Room commercial flow keeps selected-record card in right column");
  mustContains(roomCommercial, "<div className=\"panelSectionTitle\">Hızlı erişim</div>", "Room commercial flow keeps quick-access card in right column");

  must(summaryBlock.length === 0, "summary block removed");
  must(!roomCommercial.includes('key: "summary"'), "Room commercial flow no longer exposes summary tab key");
  must(!roomCommercial.includes('label: "İlk adım"'), "Room commercial flow no longer exposes first-step tab label");
  must(!roomCommercial.includes('label: "Özet"'), "Room commercial flow no longer exposes summary tab label");
  must(!normalize(roomCommercial).includes(normalize("Seçili kayıt bağlamı")), "Room commercial flow no longer repeats selected-record block in main area");
  must(!normalize(roomCommercial).includes(normalize("Görünen ana özet")), "Room commercial flow no longer renders duplicate KPI summary block");
  must(countMatches(roomCommercial, /<div className="panelSectionTitle">Seçili kayıt<\/div>/g) === 1, "Room commercial flow keeps a single selected-record heading");
  must(countMatches(roomCommercial, /<div className="panelSectionTitle">Hızlı erişim<\/div>/g) === 1, "Room commercial flow keeps a single quick-access heading");
  must(!normalize(summaryBlock).includes(normalize("Görünen ana özet")), "summary view no longer renders duplicate KPI summary block");

  const css = read("web/src/index.css");
  mustContains(css, "roomCommercialWorkspaceFull", "index.css defines room full-width workspace class");
  mustContains(css, "width: 100%", "index.css room full-width workspace uses full width");
  mustContains(css, "max-width: none", "index.css room full-width workspace removes max-width lock");
  mustContains(css, "margin: 0;", "index.css room full-width workspace removes centered margin");
  mustContains(css, "justify-items: stretch", "index.css room full-width workspace stretches children");
  mustContains(css, "roomCommercialWorkspaceFullSplit", "index.css defines room full-width split grid");
  mustContains(css, "minmax(0, 1fr) clamp(340px, 24vw, 460px)", "index.css uses wider dashboard columns");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanellayoutwidth02cfix03"', "package.json exposes width fix 03 check");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxpanellayoutwidth02cfix03", "product extensions runner includes width fix 03 check");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxpanellayoutwidth02cfix03", "verify chain includes width fix 03 check");

  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-03 CHECK PASS ===");
}

main();
