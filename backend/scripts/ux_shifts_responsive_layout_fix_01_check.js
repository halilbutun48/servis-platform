#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsOrder } from "./lib/productExtensionsRegistry.js";

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

function main() {
  console.log("=== UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01 CHECK ===");

  const pkg = read("package.json");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md");
  const css = read("web/src/index.css");
  const roomSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
  const companySections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
  const roomMobile = read("web/src/panels/room/roomShiftsPanelMobileCards.jsx");
  const companyMobile = read("web/src/panels/company/companyShiftsPanelMobileCards.jsx");

  mustTrue(exists("backend/scripts/ux_shifts_responsive_layout_fix_01_check.js"), "shifts responsive layout fix check exists");
  mustTrue(exists("docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md"), "shifts responsive layout fix doc exists");

  must(pkg, '"check:uxshiftsresponsivelayoutfix01": "node backend/scripts/ux_shifts_responsive_layout_fix_01_check.js"', "package.json exposes shifts responsive layout fix check");
  assertProductExtensionsOrder(
    ["check:uxroomcompanyshiftsmobilecardfix01", "check:uxshiftsresponsivelayoutfix01", "check:uxmobileoverflowminimapreadability01"],
    "product extensions registry keeps shifts responsive layout fix after room/company shifts mobile card fix"
  );

  must(harnessCheck, "UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01", "script harness check knows shifts responsive layout fix milestone");
  must(harnessCheck, "check:uxshiftsresponsivelayoutfix01", "script harness check knows shifts responsive layout fix alias");
  must(harnessCheck, "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md", "script harness check knows shifts responsive layout fix doc");
  must(harnessDoc, "UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01", "script harness doc lists shifts responsive layout fix milestone");
  must(harnessDoc, "check:uxshiftsresponsivelayoutfix01", "script harness doc lists shifts responsive layout fix alias");
  must(harnessDoc, "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md", "script harness doc lists shifts responsive layout fix doc");
  must(guide, "UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01", "milestone guide mentions shifts responsive layout fix milestone");
  must(guide, "check:uxshiftsresponsivelayoutfix01", "milestone guide exposes shifts responsive layout fix check");
  must(guide, "node backend\\scripts\\ux_shifts_responsive_layout_fix_01_check.js", "milestone guide includes shifts responsive layout fix command");
  must(guide, "docs/UX_SHIFTS_RESPONSIVE_LAYOUT_FIX_01.md", "milestone guide includes shifts responsive layout fix doc");

  must(doc, "UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01", "shifts responsive layout fix doc title present");
  must(doc, "Room / Vardiyalar", "shifts responsive layout fix doc covers room vardiyalar");
  must(doc, "Company / Vardiyalar", "shifts responsive layout fix doc covers company vardiyalar");
  must(doc, "desktopShiftTable", "shifts responsive layout fix doc keeps desktopShiftTable wording");
  must(doc, "shiftsDesktopTable", "shifts responsive layout fix doc keeps shiftsDesktopTable wording");
  must(doc, "shiftsMobileCards", "shifts responsive layout fix doc keeps shiftsMobileCards wording");
  must(doc, "shiftMobileCard", "shifts responsive layout fix doc keeps shiftMobileCard wording");
  must(doc, "shiftMetaGrid", "shifts responsive layout fix doc keeps shiftMetaGrid wording");
  must(doc, "shiftActionGroup", "shifts responsive layout fix doc keeps shiftActionGroup wording");
  must(doc, "table-layout: auto", "shifts responsive layout fix doc keeps table-layout auto wording");
  must(doc, "word-break: normal", "shifts responsive layout fix doc keeps word-break normal wording");
  must(doc, "overflow-wrap: break-word", "shifts responsive layout fix doc keeps overflow-wrap break-word wording");
  must(doc, "launcher safe-area", "shifts responsive layout fix doc keeps launcher safe-area wording");
  must(doc, "Sefer Abi launcher", "shifts responsive layout fix doc keeps launcher wording");
  must(doc, "Backend route/write-path değişmedi.", "shifts responsive layout fix doc keeps backend boundary");
  must(doc, "Schema/migration yok.", "shifts responsive layout fix doc keeps schema boundary");
  must(doc, "Playwright runner policy değişmedi.", "shifts responsive layout fix doc keeps runner policy boundary");
  must(doc, "Coverage matrix check değişmedi.", "shifts responsive layout fix doc keeps coverage boundary");
  must(doc, "Bu milestone yeni business flow eklemez.", "shifts responsive layout fix doc keeps business boundary");

  must(css, ".shiftsDesktopTable", "global css defines shifts desktop table class");
  must(css, ".shiftsMobileCards", "global css defines shifts mobile cards class");
  must(css, ".shiftMobileCard", "global css defines shift mobile card class");
  must(css, ".shiftMetaGrid", "global css defines shift meta grid class");
  must(css, ".shiftActionGroup", "global css defines shift action group class");
  must(css, "table-layout: auto;", "global css keeps auto table layout for shifts");
  must(css, "overflow-wrap: break-word;", "global css keeps break-word wrapping for shifts");
  must(css, "word-break: normal;", "global css keeps normal word break for shifts");

  must(roomSections, "shiftsDesktopTable--room-pending", "room shifts sections keep pending desktop shift wrapper");
  must(roomSections, "shiftsDesktopTable--room-final", "room shifts sections keep final desktop shift wrapper");
  must(roomSections, "shiftsMobileCards", "room shifts sections keep mobile shift cards wrapper");
  must(companySections, "shiftsDesktopTable--company-market", "company shifts sections keep market desktop shift wrapper");
  must(companySections, "shiftsDesktopTable--company-pending", "company shifts sections keep pending desktop shift wrapper");
  must(companySections, "shiftsDesktopTable--company-status", "company shifts sections keep final desktop shift wrapper");
  must(companySections, "shiftsMobileCards", "company shifts sections keep mobile shift cards wrapper");

  must(roomMobile, "shiftMobileCard", "room mobile card file keeps shift mobile card class");
  must(roomMobile, "shiftMetaGrid", "room mobile card file keeps shift meta grid class");
  must(roomMobile, "shiftActionGroup", "room mobile card file keeps shift action group class");
  must(companyMobile, "shiftMobileCard", "company mobile card file keeps shift mobile card class");
  must(companyMobile, "shiftMetaGrid", "company mobile card file keeps shift meta grid class");
  must(companyMobile, "shiftActionGroup", "company mobile card file keeps shift action group class");

  console.log("=== UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
}
