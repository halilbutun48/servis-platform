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

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function main() {
  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-01 CHECK ===");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

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
  mustNotContains(companyCommercial, "PanelSegmentTabs", "Company commercial flow is single-page and no longer uses functional tabs");
  mustNotContains(companyCommercial, 'viewMode === "summary"', "Company commercial flow removes summary render");
  mustNotContains(companyCommercial, 'viewMode === "list"', "Company commercial flow removes list render");
  mustNotContains(companyCommercial, 'viewMode === "selected"', "Company commercial flow removes selected render");
  mustContains(companyCommercial, "Ticari Akış Listesi", "Company commercial flow keeps list panel title");
  mustContains(companyCommercial, "Seçili kayıt", "Company commercial flow keeps selected record panel");
  mustContains(companyCommercial, "companyCommercialFlowSplit", "Company commercial flow keeps split layout");
  mustContains(agreements, "PanelSegmentTabs", "Company agreements still uses functional tabs");
  mustNotContains(agreements, 'label: "Özet"', "Company agreements removes summary tab label");
  mustNotContains(agreements, 'viewMode === "summary"', "Company agreements removes summary render");
  mustContains(agreements, 'useState("list")', "Company agreements defaults to list");
  mustContains(agreements, 'label: "Liste"', "Company agreements keeps list tab");
  mustContains(agreements, 'viewMode === "list"', "Company agreements keeps list render");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanellayoutwidth02cfix01"', "package.json exposes width fix check");
  mustContains(pkg, '"check:uxpaneltabsfix01"', "package.json keeps check:uxpaneltabsfix01");
  mustContains(pkg, '"check:uxpanelreality02c"', "package.json keeps check:uxpanelreality02c");
  mustContains(pkg, '"check:uxpanelstructure02b"', "package.json keeps check:uxpanelstructure02b");
  mustContains(pkg, '"check:uxpanelstructure02"', "package.json keeps check:uxpanelstructure02");
  mustContains(pkg, '"check:uxpanelinventory02a"', "package.json keeps check:uxpanelinventory02a");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json keeps check:uxcollapsiblepanels01");
  assertProductExtensionsIncludes("check:uxpanellayoutwidth02cfix01", "product extensions registry includes width fix check", registryScripts);
  assertProductExtensionsIncludes("check:uxpaneltabsfix01", "product extensions registry includes tabs fix check", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelreality02c", "product extensions registry includes reality audit check", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelstructure02b", "product extensions registry includes structure 02B check", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelstructure02", "product extensions registry includes structure 02 check", registryScripts);
  assertProductExtensionsIncludes("check:uxpanelinventory02a", "product extensions registry includes inventory 02A check", registryScripts);
  assertProductExtensionsIncludes("check:uxcollapsiblepanels01", "product extensions registry includes collapsible panels check", registryScripts);
  assertProductExtensionsIncludes("check:uxnav01", "product extensions registry includes uxnav01", registryScripts);
  assertProductExtensionsIncludes("check:uxdensity01", "product extensions registry includes uxdensity01", registryScripts);

  console.log("=== UX-PANEL-LAYOUT-WIDTH-02C-FIX-01 CHECK PASS ===");
}

main();

