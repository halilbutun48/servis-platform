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

function main() {
  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-02 CHECK ===");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  const auditPath = "docs/UX_PANEL_STRUCTURE_02_AUDIT.md";
  must(exists(auditPath), "structure audit doc exists");
  const audit = read(auditPath);
  mustContains(audit, "UX-PANEL-LAYOUT-WIDTH-02C-FIX-02", "audit includes layout width fix 02 note");
  mustContains(audit, "Room / Ticari Akışım", "audit mentions Room / Ticari Akışım");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-LAYOUT-WIDTH-02C-FIX-02", "milestone guide mentions width fix 02");
  mustContains(guide, "check:uxpanellayoutwidth02cfix02", "milestone guide exposes width fix 02 check");

  const roomCommercial = read("web/src/panels/room/CommercialFlowPanel.jsx");
  mustContains(roomCommercial, "roomCommercialWorkspaceFull", "Room commercial flow uses room full-width workspace container");
  mustContains(roomCommercial, "roomCommercialWorkspaceFullSplit", "Room commercial flow uses room full-width split grid");
  mustContains(roomCommercial, "PanelSegmentTabs", "Room commercial flow keeps segmented tabs");
  mustContains(roomCommercial, "viewMode === \"contractShift\"", "Room commercial flow defaults to contract/shift render");
  mustContains(roomCommercial, "Sözleşme & Vardiya", "Room commercial flow keeps contract/shift landing tab");
  mustContains(roomCommercial, "viewMode === \"history\"", "Room commercial flow keeps history render");
  must(!roomCommercial.includes('key: "summary"'), "Room commercial flow no longer exposes summary tab key");
  must(!roomCommercial.includes('label: "İlk adım"'), "Room commercial flow no longer exposes first-step tab label");
  must(!normalize(roomCommercial).includes("panelworkspacewide"), "Room commercial flow no longer uses generic centered wide workspace class");
  must(!normalize(roomCommercial).includes("mx-auto"), "Room commercial flow avoids centered auto margin wrappers");

  const css = read("web/src/index.css");
  mustContains(css, "roomCommercialWorkspaceFull", "index.css defines room full-width workspace class");
  mustContains(css, "width: 100%", "index.css room full-width workspace uses full width");
  mustContains(css, "max-width: none", "index.css room full-width workspace removes max-width lock");
  mustContains(css, "margin: 0;", "index.css room full-width workspace removes centered margin");
  mustContains(css, "justify-items: stretch", "index.css room full-width workspace stretches children");
  mustContains(css, "roomCommercialWorkspaceFullSplit", "index.css defines room full-width split grid");
  mustContains(css, "minmax(0, 1fr) clamp(340px, 24vw, 460px)", "index.css uses wider dashboard columns");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanellayoutwidth02cfix02"', "package.json exposes width fix 02 check");
  assertProductExtensionsIncludes("check:uxpanellayoutwidth02cfix02", "product extensions registry includes width fix 02 check", registryScripts);

  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-02 CHECK PASS ===");
}

main();
