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

function main() {
  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-01 CHECK ===");

  const auditPath = "docs/UX_PANEL_STRUCTURE_02_AUDIT.md";
  must(exists(auditPath), "structure audit doc exists");
  const audit = read(auditPath);
  mustContains(audit, "UX-PANEL-LAYOUT-WIDTH-02C-FIX-01", "audit includes layout width fix note");
  mustContains(audit, "Room / Ticari Akışım", "audit mentions Room / Ticari Akışım");
  must(!normalize(audit).includes("runtime-data"), "audit avoids runtime-data");
  must(!normalize(audit).includes("prisma"), "audit avoids prisma");
  must(!normalize(audit).includes("migration"), "audit avoids migration");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-LAYOUT-WIDTH-02C-FIX-01", "milestone guide mentions width fix");
  mustContains(guide, "check:uxpanellayoutwidth02cfix01", "milestone guide exposes width fix check");

  const roomCommercial = read("web/src/panels/room/CommercialFlowPanel.jsx");
  const css = read("web/src/index.css");
  mustContains(roomCommercial, "roomCommercialWorkspaceFull", "Room commercial flow uses full-width workspace container");
  mustContains(roomCommercial, "roomCommercialWorkspaceFullSplit", "Room commercial flow uses full-width split grid");
  mustContains(roomCommercial, "PanelSegmentTabs", "Room commercial flow keeps segmented tabs");
  mustContains(roomCommercial, "viewMode === \"contractShift\"", "Room commercial flow defaults to contract/shift render");
  mustContains(roomCommercial, "viewMode === \"history\"", "Room commercial flow keeps history render");
  must(!roomCommercial.includes('key: "summary"'), "Room commercial flow no longer exposes summary tab key");
  must(!roomCommercial.includes('label: "İlk adım"'), "Room commercial flow no longer exposes first-step tab label");
  must(!normalize(roomCommercial).includes("maxwidth: 1440"), "Room commercial flow no longer uses 1440 maxWidth lock");
  must(!normalize(roomCommercial).includes("maxwidth: 1280"), "Room commercial flow avoids 1280 lock");
  must(!normalize(roomCommercial).includes("mx-auto"), "Room commercial flow avoids centered auto margin wrappers");

  mustContains(css, "roomCommercialWorkspaceFull", "index.css defines room full-width workspace class");
  mustContains(css, "width: 100%", "index.css room full-width workspace uses full width");
  mustContains(css, "max-width: none", "index.css room full-width workspace removes max-width lock");
  mustContains(css, "margin: 0;", "index.css room full-width workspace removes centered margin");
  mustContains(css, "roomCommercialWorkspaceFullSplit", "index.css defines room full-width split grid");
  mustContains(css, "minmax(0, 1fr) clamp(340px, 24vw, 460px)", "index.css uses wider dashboard columns");

  const commercialCore = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const companyCommercial = read("web/src/panels/company/CommercialFlowPanel.jsx");
  const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
  mustContains(commercialCore, "PanelSegmentTabs", "CommercialCore still uses functional tabs");
  mustContains(commercialCore, "scrollIntoView", "CommercialCore still uses focus-model sections");
  mustContains(companyCommercial, "PanelSegmentTabs", "Company commercial flow still uses functional tabs");
  mustContains(companyCommercial, "viewMode === \"summary\"", "Company commercial flow keeps summary render");
  mustContains(agreements, "PanelSegmentTabs", "Company agreements still uses functional tabs");
  mustContains(agreements, "viewMode === \"summary\"", "Company agreements keeps summary render");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanellayoutwidth02cfix01"', "package.json exposes width fix check");
  mustContains(pkg, '"check:uxpaneltabsfix01"', "package.json keeps check:uxpaneltabsfix01");
  mustContains(pkg, '"check:uxpanelreality02c"', "package.json keeps check:uxpanelreality02c");
  mustContains(pkg, '"check:uxpanelstructure02b"', "package.json keeps check:uxpanelstructure02b");
  mustContains(pkg, '"check:uxpanelstructure02"', "package.json keeps check:uxpanelstructure02");
  mustContains(pkg, '"check:uxpanelinventory02a"', "package.json keeps check:uxpanelinventory02a");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json keeps check:uxcollapsiblepanels01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxpanellayoutwidth02cfix01", "product extensions runner includes width fix check");
  mustContains(runner, "check:uxpaneltabsfix01", "product extensions runner keeps tabs fix check");
  mustContains(runner, "check:uxpanelreality02c", "product extensions runner keeps reality audit check");
  mustContains(runner, "check:uxpanelstructure02b", "product extensions runner keeps structure 02B check");
  mustContains(runner, "check:uxpanelstructure02", "product extensions runner keeps structure 02 check");
  mustContains(runner, "check:uxpanelinventory02a", "product extensions runner keeps inventory 02A check");
  mustContains(runner, "check:uxcollapsiblepanels01", "product extensions runner keeps collapsible panels check");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxpanellayoutwidth02cfix01", "verify chain includes width fix check");
  mustContains(verify, "check:uxpaneltabsfix01", "verify chain keeps tabs fix check");
  mustContains(verify, "check:uxpanelreality02c", "verify chain keeps reality audit check");
  mustContains(verify, "check:uxpanelstructure02b", "verify chain keeps structure 02B check");
  mustContains(verify, "check:uxpanelstructure02", "verify chain keeps structure 02 check");
  mustContains(verify, "check:uxpanelinventory02a", "verify chain keeps inventory 02A check");
  mustContains(verify, "check:uxcollapsiblepanels01", "verify chain keeps collapsible panels check");
  mustContains(verify, "check:uxnav01", "verify chain keeps uxnav01");
  mustContains(verify, "check:uxdensity01", "verify chain keeps uxdensity01");

  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-01 CHECK PASS ===");
}

main();


