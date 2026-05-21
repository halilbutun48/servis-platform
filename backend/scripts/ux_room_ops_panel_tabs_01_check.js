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

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log("=== UX-ROOM-OPS-PANEL-TABS-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxroomopspaneltabs01"', "package.json exposes check:uxroomopspaneltabs01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxroomopspaneltabs01", "product extensions runner includes UX-ROOM-OPS-PANEL-TABS-01");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxroomopspaneltabs01", "verify chain includes UX-ROOM-OPS-PANEL-TABS-01");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-ROOM-OPS-PANEL-TABS-01", "script guide mentions UX-ROOM-OPS-PANEL-TABS-01");
  mustContains(guide, "check:uxroomopspaneltabs01", "script guide exposes check:uxroomopspaneltabs01");

  const audit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(audit, "UX-ROOM-OPS-PANEL-TABS-01", "structure audit includes room ops tabs note");
  must(!normalize(audit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(audit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(audit).includes("migration"), "structure audit avoids migration");

  const panel = read("web/src/panels/room/OperationHealthPanel.jsx");
  mustContains(panel, "PanelSegmentTabs", "OperationHealthPanel uses PanelSegmentTabs");
  mustContains(panel, "const [activeTab, setActiveTab] = useState(\"summary\")", "OperationHealthPanel has active tab state");
  mustContains(panel, "Şartlı Küme", "OperationHealthPanel keeps conditional cluster tab");
  mustContains(panel, "Oda Operasyon Özeti", "OperationHealthPanel keeps summary tab");
  mustContains(panel, "Sürücü & Sorunlar", "OperationHealthPanel keeps combined problems tab");
  mustContains(panel, 'activeTab === "proof"', "OperationHealthPanel renders proof tab conditionally");
  mustContains(panel, 'activeTab === "summary"', "OperationHealthPanel renders summary tab conditionally");
  mustContains(panel, 'activeTab === "problems"', "OperationHealthPanel renders combined problems tab conditionally");
  mustContains(panel, 'role="tabpanel"', "OperationHealthPanel uses tabpanel semantics");
  mustContains(panel, "OperationProofMiniCard", "OperationHealthPanel keeps conditional cluster block");
  mustContains(panel, "RoomOperationsBoard", "OperationHealthPanel keeps room operations board block");
  mustContains(panel, "Sorunlu Sürücüler / Canlılık Listesi", "OperationHealthPanel keeps driver live list block");
  mustContains(panel, "Açık Sorunlar", "OperationHealthPanel keeps issue block");
  mustContains(panel, "Filtre", "OperationHealthPanel keeps top filter row");
  mustContains(panel, "MetricCard", "OperationHealthPanel keeps top KPI cards");
  mustNotContains(panel, 'label: "Açık Sorunlar"', "OperationHealthPanel removes open issues tab label");
  mustNotContains(panel, 'activeTab === "drivers"', "OperationHealthPanel removes standalone drivers tab branch");
  mustNotContains(panel, 'activeTab === "issues"', "OperationHealthPanel removes standalone issues tab branch");
  must(countMatches(panel, /role="tabpanel"/g) === 3, "OperationHealthPanel renders exactly three tab panels");
  must(countMatches(panel, /activeTab === "/g) === 3, "OperationHealthPanel uses exactly three activeTab branches");
  must(countMatches(panel, /OperationProofMiniCard/g) >= 2, "OperationHealthPanel keeps proof card import and usage");
  must(countMatches(panel, /RoomOperationsBoard/g) >= 2, "OperationHealthPanel keeps operations board import and usage");
  must(countMatches(panel, /Sorunlu Sürücüler \/ Canlılık Listesi/g) === 1, "OperationHealthPanel keeps a single driver live list heading");
  must(countMatches(panel, /Açık Sorunlar/g) >= 1, "OperationHealthPanel keeps issue heading");
  must(!normalize(panel).includes("runtime-data"), "OperationHealthPanel avoids runtime-data");
  must(!normalize(panel).includes("prisma"), "OperationHealthPanel avoids prisma");
  must(!normalize(panel).includes("migration"), "OperationHealthPanel avoids migration");

  console.log("=== UX-ROOM-OPS-PANEL-TABS-01 CHECK PASS ===");
}

main();
