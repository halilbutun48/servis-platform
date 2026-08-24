#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes } from "./lib/productExtensionsRegistry.js";

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
  if (!cond) fail(label);
  ok(label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
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

function main() {
  console.log("=== UX-MOBILE-ALL-ROLES-PANEL-FIX-01 CHECK ===");

  const pkg = read("package.json");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md");
  const css = read("web/src/index.css");
  const superadminPanel = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
  const superadminOps = read("web/src/panels/superadmin/OperationsPanel.jsx");
  const roomCommercialFlow = read("web/src/panels/room/CommercialFlowPanel.jsx");
  const companyOps = read("web/src/panels/company/OperationsPanel.jsx");
  const schoolOps = read("web/src/panels/school/OperationsPanel.jsx");
  const companyShiftsTrack = read("web/src/panels/company/CompanyShiftsPanelTrackView.jsx");
  const personelLive = read("web/src/panels/personel/LivePanel.jsx");

  mustContains(pkg, '"check:uxmobileallrolespanelfix01": "node backend/scripts/ux_mobile_all_roles_panel_fix_01_check.js"', "package.json exposes mobile all roles panel fix check");
  assertProductExtensionsIncludes("check:uxmobileallrolespanelfix01", "product extensions registry includes mobile all roles panel fix check");
  mustContains(harnessCheck, "UX-MOBILE-ALL-ROLES-PANEL-FIX-01", "script harness check knows mobile all roles panel fix milestone");
  mustContains(harnessCheck, "check:uxmobileallrolespanelfix01", "script harness check knows mobile all roles panel fix alias");
  mustContains(harnessCheck, "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md", "script harness check knows mobile all roles panel fix doc");
  mustContains(harnessDoc, "UX-MOBILE-ALL-ROLES-PANEL-FIX-01", "script harness doc lists mobile all roles panel fix milestone");
  mustContains(harnessDoc, "check:uxmobileallrolespanelfix01", "script harness doc lists mobile all roles panel fix alias");
  mustContains(harnessDoc, "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md", "script harness doc lists mobile all roles panel fix doc");
  mustContains(guide, "UX-MOBILE-ALL-ROLES-PANEL-FIX-01", "milestone guide mentions mobile all roles panel fix milestone");
  mustContains(guide, "check:uxmobileallrolespanelfix01", "milestone guide exposes mobile all roles panel fix check");
  mustContains(guide, "node backend\\scripts\\ux_mobile_all_roles_panel_fix_01_check.js", "milestone guide includes mobile all roles panel fix command");
  mustContains(guide, "docs/UX_MOBILE_ALL_ROLES_PANEL_FIX_01.md", "milestone guide includes mobile all roles panel fix doc");

  mustContains(doc, "UX-MOBILE-ALL-ROLES-PANEL-FIX-01", "mobile all roles panel fix doc title present");
  mustContains(doc, "panel bazlı", "mobile all roles panel fix doc keeps panel-based wording");
  mustContains(doc, "first viewport", "mobile all roles panel fix doc keeps first viewport wording");
  mustContains(doc, "drawer", "mobile all roles panel fix doc keeps drawer wording");
  mustContains(doc, "Sefer Abi launcher", "mobile all roles panel fix doc keeps launcher wording");
  mustContains(doc, "sticky header / tab yoğunluğu", "mobile all roles panel fix doc keeps sticky density wording");
  mustContains(doc, "horizontal overflow", "mobile all roles panel fix doc keeps overflow wording");
  mustContains(doc, "empty / loading / error", "mobile all roles panel fix doc keeps state wording");
  mustContains(doc, "SUPER_ADMIN", "mobile all roles panel fix doc keeps SUPER_ADMIN scope");
  mustContains(doc, "ROOM", "mobile all roles panel fix doc keeps ROOM scope");
  mustContains(doc, "COMPANY", "mobile all roles panel fix doc keeps COMPANY scope");
  mustContains(doc, "DRIVER", "mobile all roles panel fix doc keeps DRIVER scope");
  mustContains(doc, "PERSONEL", "mobile all roles panel fix doc keeps PERSONEL scope");
  mustContains(doc, "SCHOOL", "mobile all roles panel fix doc keeps SCHOOL scope");
  mustContains(doc, "ORGANIZATION", "mobile all roles panel fix doc keeps ORGANIZATION scope");
  mustContains(doc, "UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01", "mobile all roles panel fix doc keeps audit reference");
  mustContains(doc, "UX-MOBILE-WEB-SHELL-CLARITY-01", "mobile all roles panel fix doc keeps shell reference");
  mustContains(doc, "UX-FIX 0", "mobile all roles panel fix doc keeps UX-FIX goal");
  mustContains(doc, "BLOCKER 0", "mobile all roles panel fix doc keeps blocker goal");
  mustContains(doc, "NOT-FOUND 0", "mobile all roles panel fix doc keeps not-found goal");
  mustContains(doc, "PASS- 19", "mobile all roles panel fix doc keeps PASS-minus target");
  mustContains(doc, "runtime-data", "mobile all roles panel fix doc keeps runtime-data boundary");
  mustContains(doc, "browser-smoke", "mobile all roles panel fix doc keeps browser-smoke boundary");
  mustContains(doc, "backend route/write-path", "mobile all roles panel fix doc keeps backend route boundary");
  mustContains(doc, "Schema/migration", "mobile all roles panel fix doc keeps schema boundary");
  mustContains(doc, "Playwright runner policy", "mobile all roles panel fix doc keeps playwright policy boundary");
  mustContains(doc, "Coverage matrix check", "mobile all roles panel fix doc keeps coverage matrix boundary");

  mustContains(css, "overflow-x: hidden", "global css keeps x overflow hidden");
  mustContains(css, "--nav-dock-mobile-width", "global css keeps mobile nav width variable");
  mustContains(css, "navDockBackdrop", "global css keeps backdrop rule");
  mustContains(css, "left: var(--nav-dock-mobile-width, min(86vw, 360px));", "global css keeps mobile backdrop inset");
  mustContains(css, ".shell--has-copilot-fab .shellContent", "global css keeps copilot fab bottom clearance");
  mustContains(css, "padding-bottom: calc(180px + env(safe-area-inset-bottom))", "global css keeps mobile copilot bottom clearance");
  mustContains(css, ".tbl { min-width: 0; width: 100%; }", "global css keeps mobile table width fix");

  ordered(superadminPanel, ["PanelSegmentTabs", "Hızlı erişim"], "superadmin panel tabs stay before quick access");
  ordered(superadminOps, ["PanelSegmentTabs", "STEP_UP_REQUIRED · KVKK sınırı aktif"], "superadmin operations tabs stay before summary band");
  ordered(roomCommercialFlow, ["PanelSegmentTabs", "FlowSummaryStrip"], "room commercial flow tabs stay before summary strip");
  ordered(companyOps, ["PanelSegmentTabs", "MiniStat title=\"Personel\""], "company operations tabs stay before stats row");
  ordered(schoolOps, ["PanelSegmentTabs", "MiniStat title=\"Öğrenci servis atamaları\""], "school operations tabs stay before stats row");
  ordered(companyShiftsTrack, ["PanelSegmentTabs", "Hızlı Filtre"], "company shift track tabs stay before sticky filter");
  ordered(personelLive, ["PanelSegmentTabs", "BoardingChangeRequestEntryCard"], "personel live tabs stay before request entry card");

  mustNotContains(doc, "force push", "mobile all roles panel fix doc avoids force push wording");
  mustNotContains(doc, "tag taşıma", "mobile all roles panel fix doc avoids tag rewrite wording");

  console.log("=== UX-MOBILE-ALL-ROLES-PANEL-FIX-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
