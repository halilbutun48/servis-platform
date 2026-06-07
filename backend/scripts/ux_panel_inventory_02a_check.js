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

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(next, out);
    else if (entry.isFile() && next.endsWith(".jsx")) out.push(next.replace(/\\/g, "/"));
  }
  return out;
}

function extractRouteLiterals(appSource) {
  const set = new Set();
  const re = /(?:path|cleanPath)\s*===\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(appSource))) set.add(match[1]);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function extractScreenImports(appSource) {
  const set = new Set();
  const re = /const\s+\w+\s*=\s*lazy\(\(\)\s*=>\s*import\("(\.\/panels\/[^"]+)"\)\);/g;
  let match;
  while ((match = re.exec(appSource))) set.add(match[1].replace("./", "web/src/"));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function groupRoutes(routes) {
  const groups = [
    ["Super Admin", (route) => route === "/superadmin" || route.startsWith("/superadmin/")],
    ["Room/Oda", (route) => route === "/room" || route.startsWith("/room/")],
    ["Company/Firma", (route) => route === "/company" || route.startsWith("/company/")],
    ["School", (route) => route === "/school" || route.startsWith("/school/")],
    ["Organization", (route) => route === "/organization" || route.startsWith("/organization/")],
    ["Driver", (route) => route === "/driver" || route.startsWith("/driver/")],
    ["Parent/Veli", (route) => route === "/parent" || route.startsWith("/parent/")],
    ["Personel", (route) => route === "/personel" || route.startsWith("/personel/")],
    ["Shared/System", (route) => route.startsWith("/shared/")],
    ["Utility/Public/Auth", (route) => route === "/auth/change-password" || route === "/accept-parent-invite" || route === "/landing" || route.startsWith("/public/")],
  ];
  return Object.fromEntries(groups.map(([label, predicate]) => [label, routes.filter(predicate)]));
}

function main() {
  console.log("=== UX-PANEL-INVENTORY-02A CHECK ===");

  const auditPath = "docs/UX_PANEL_INVENTORY_02A_AUDIT.md";
  must(exists(auditPath), "audit doc exists");
  const audit = read(auditPath);

  mustContains(audit, "1) Taranan panel listesi", "audit has scanned panel list");
  mustContains(audit, "2) Uzun / karmaşık / aşağı scroll riski olan paneller", "audit has long panel risk section");
  mustContains(audit, "3) P0 / P1 / P2 sınıflandırması", "audit has priority classification");
  mustContains(audit, "4) Her panel için önerilen yapı", "audit has per-panel structure recommendation");
  mustContains(audit, "5) İlk düzeltilecek 5 panel önerisi", "audit has first five recommendation");
  mustContains(audit, "6) Sonraya bırakılacak paneller", "audit has deferred panel section");
  mustContains(audit, "116", "audit states total panel-related JSX file count");
  mustContains(audit, "61", "audit states route-backed screen component count");
  mustContains(audit, "98", "audit states route surface count");
  mustContains(audit, "99", "audit states unique route literal count");

  const app = read("web/src/App.jsx");
  const routeLiterals = extractRouteLiterals(app);
  const screenImports = extractScreenImports(app);
  const panelFiles = walk(path.join(root, "web/src/panels"));
  must(panelFiles.length === 116, "panel-related JSX count matches audit");
  must(screenImports.length === 61, "route-backed screen component count matches audit");
  must(routeLiterals.length === 99, "unique route literal count matches audit");
  must(routeLiterals.filter((route) => route !== "/").length === 98, "route surface count excluding root matches audit");

  const grouped = groupRoutes(routeLiterals.filter((route) => route !== "/"));
  const expectedCounts = {
    "Super Admin": 19,
    "Room/Oda": 13,
    "Company/Firma": 14,
    "School": 14,
    "Organization": 15,
    "Driver": 7,
    "Parent/Veli": 3,
    "Personel": 3,
    "Shared/System": 4,
    "Utility/Public/Auth": 6,
  };
  for (const [label, expected] of Object.entries(expectedCounts)) {
    must(grouped[label].length === expected, `${label} route count matches audit`);
  }

  const roleHeadings = [
    "Super Admin (19)",
    "Room / Oda (13)",
    "Company / Firma (14)",
    "School (14)",
    "Organization (15)",
    "Driver (7)",
    "Parent / Veli (3)",
    "Personel (3)",
    "Shared / System (4)",
    "Utility / Public / Auth (6)",
  ];
  for (const heading of roleHeadings) {
    mustContains(audit, heading, `audit includes ${heading}`);
  }

  const requiredRoutes = [
    "/superadmin/commercial-core",
    "/room/commercial-flow",
    "/company/agreements",
    "/company/commercial-flow",
    "/driver/route",
    "/parent/live",
    "/personel/live",
    "/shared/kvkk",
    "/landing",
    "/public/passenger-live",
  ];
  for (const route of requiredRoutes) {
    mustContains(audit, route, `audit references ${route}`);
  }

  mustContains(audit, "Room / Ticari Akışım", "audit mentions Room / Ticari Akışım");
  mustContains(audit, "Company / Ticari Akış", "audit mentions Company / Ticari Akış");
  mustContains(audit, "Room / Araçlar", "audit mentions Room / Araçlar");
  mustContains(audit, "Room / Sürücüler", "audit mentions Room / Sürücüler");
  mustContains(audit, "Super Admin / Ticari Akış", "audit mentions Super Admin / Ticari Akış");
  mustContains(audit, "Parent / Canlı Takip", "audit mentions Parent / Canlı Takip");
  mustContains(audit, "Personel / Canlı Takip", "audit mentions Personel / Canlı Takip");

  const priorityNeedles = [
    "web/src/panels/company/AgreementsPanel.jsx",
    "web/src/panels/superadmin/CommercialCorePanel.jsx",
    "web/src/panels/company/ShiftsPanel.jsx",
    "web/src/panels/room/VehiclesPanel.jsx",
    "web/src/panels/room/DriversPanel.jsx",
    "web/src/panels/room/CommercialFlowPanel.jsx",
  ];
  const priorityHits = priorityNeedles.filter((needle) => normalize(audit).includes(normalize(needle)));
  must(priorityHits.length >= 5, "audit identifies at least 5 P0/P1 panel candidates");
  mustContains(audit, "segmented/tab gerekli", "audit includes segmented/tab recommendation wording");
  mustContains(audit, "accordion yeterli", "audit includes accordion recommendation wording");
  mustContains(audit, "mevcut hali korunabilir", "audit includes keep-as-is recommendation wording");
  mustContains(audit, "ayrı alt modlara bölünmeli", "audit includes split-mod recommendation wording");

  mustContains(audit, "PanelChrome.jsx", "audit mentions PanelChrome scan scope");
  mustContains(audit, "NavDock.jsx", "audit mentions NavDock scan scope");

  const navDock = read("web/src/layout/NavDock.jsx");
  const copilotFacts = read("web/src/utils/copilotFacts.js");
  mustContains(navDock, "Sefer Abi Terminali", "NavDock keeps Sefer Abi Terminali");
  mustContains(navDock, "companyKind", "NavDock role/kind logic preserved");
  mustContains(copilotFacts, "Sefer Abi’ye Sor", "Copilot drawer boundary still referenced");

  const panelChrome = read("web/src/components/PanelChrome.jsx");
  mustContains(panelChrome, "panelChrome", "PanelChrome exists");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxpanelinventory02a"', "package.json exposes check:uxpanelinventory02a");
  mustContains(pkg, '"check:uxcollapsiblepanels01"', "package.json keeps check:uxcollapsiblepanels01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxpanelinventory02a", "product extensions runner includes UX-PANEL-INVENTORY-02A");
  mustContains(runner, "check:uxcollapsiblepanels01", "product extensions runner keeps UX-COLLAPSIBLE-PANELS-01");
  mustContains(runner, "check:uxpanelstructure02", "product extensions runner keeps UX-PANEL-STRUCTURE-02");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxpanelinventory02a", "verify chain includes UX-PANEL-INVENTORY-02A");
  mustContains(verify, "check:uxcollapsiblepanels01", "verify chain keeps UX-COLLAPSIBLE-PANELS-01");
  mustContains(verify, "check:uxpanelstructure02", "verify chain keeps UX-PANEL-STRUCTURE-02");
  mustContains(verify, "check:uxnav01", "verify chain keeps UX-NAV-01");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-PANEL-INVENTORY-02A", "milestone guide mentions UX-PANEL-INVENTORY-02A");
  mustContains(guide, "check:uxpanelinventory02a", "milestone guide exposes check:uxpanelinventory02a");
  mustContains(guide, "UX-COLLAPSIBLE-PANELS-01", "milestone guide keeps UX-COLLAPSIBLE-PANELS-01");

  const forbidden = ["runtime-data", "prisma", "migration"];
  for (const term of forbidden) {
    must(!normalize(audit).includes(term), `audit avoids ${term}`);
  }

  console.log("=== UX-PANEL-INVENTORY-02A CHECK PASS ===");
}

main();
