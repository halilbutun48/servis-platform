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

function countJsxUses(text, componentName) {
  return countMatches(text, new RegExp(`<${componentName}\\b`, "g"));
}

function main() {
  console.log("=== UX-COMPANY-QUALITY-PANEL-TABS-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxcompanyqualitytabs01"', "package.json exposes check:uxcompanyqualitytabs01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxcompanyqualitytabs01", "product extensions runner includes company quality tabs check");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxcompanyqualitytabs01", "verify chain includes company quality tabs check");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-COMPANY-QUALITY-PANEL-TABS-01", "script guide mentions UX-COMPANY-QUALITY-PANEL-TABS-01");
  mustContains(guide, "check:uxcompanyqualitytabs01", "script guide exposes check:uxcompanyqualitytabs01");

  const structureAudit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(structureAudit, "UX-COMPANY-QUALITY-PANEL-TABS-01", "structure audit includes company quality tabs note");
  must(!normalize(structureAudit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(structureAudit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(structureAudit).includes("migration"), "structure audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-COMPANY-QUALITY-PANEL-TABS-01", "copilot audit mentions UX-COMPANY-QUALITY-PANEL-TABS-01");

  const panelTabs = read("web/src/components/PanelSegmentTabs.jsx");
  const panel = read("web/src/panels/company/ServiceEvaluationPanel.jsx");

  mustContains(panelTabs, "onChange", "PanelSegmentTabs keeps onChange support");
  mustContains(panelTabs, "onSelect", "PanelSegmentTabs keeps onSelect support");
  mustContains(panelTabs, "onClick", "PanelSegmentTabs keeps onClick support");
  mustContains(panelTabs, 'role="tab"', "PanelSegmentTabs renders accessible tab buttons");
  mustContains(panelTabs, "aria-selected", "PanelSegmentTabs marks active tab");

  mustContains(panel, "PanelChrome", "Company quality panel uses panel chrome");
  mustContains(panel, "PanelSegmentTabs", "Company quality panel uses segmented tabs");
  mustContains(panel, "QualityProofReadonlyCard", "Company quality panel keeps proof card");
  mustContains(panel, "QualityDraftScoreCard", "Company quality panel keeps draft score card");
  mustContains(panel, "QualityReviewDecisionCard", "Company quality panel keeps review decision card");
  mustContains(panel, "QualityReviewHistoryCard", "Company quality panel keeps history card");
  mustContains(panel, "buildServiceEvaluationFacts", "Company quality panel keeps copilot facts");
  mustContains(panel, "getCompanyTrustQualitySummary", "Company quality panel loads summary");
  mustContains(panel, "getCompanyTrustQualityItems", "Company quality panel loads pending items");
  mustContains(panel, "getTrustQualityTemplate", "Company quality panel loads template");
  mustContains(panel, 'const [activeTab, setActiveTab] = useState("overview")', "Company quality panel keeps overview default tab");
  mustContains(panel, 'tabs={tabs}', "Company quality panel binds tab list");
  mustContains(panel, 'label: "Özet"', "Company quality panel exposes Özet tab label");
  mustContains(panel, 'label: "Kanıt / Hazırlık"', "Company quality panel exposes Kanıt / Hazırlık tab label");
  mustContains(panel, 'label: "Taslak Skor"', "Company quality panel exposes Taslak Skor tab label");
  mustContains(panel, 'label: "İnceleme Kararı"', "Company quality panel exposes İnceleme Kararı tab label");
  mustContains(panel, 'label: "Geçmiş"', "Company quality panel exposes Geçmiş tab label");
  mustContains(panel, 'label: "Değerlendirme Alanları"', "Company quality panel exposes Değerlendirme Alanları tab label");
  mustContains(panel, 'setActiveTab("decision")', "Company quality panel routes pending band to decision tab");
  mustContains(panel, 'setActiveTab("proof")', "Company quality panel keeps proof shortcut");
  mustContains(panel, "Değerlendirme bekleyen hizmet var", "Company quality panel shows pending-review info band");
  mustContains(panel, "İnceleme Kararı sekmesine git", "Company quality panel uses decision CTA");
  mustContains(panel, "Hizmetleri aç", "Company quality panel keeps service open action");
  mustContains(panel, "Sözleşmeleri aç", "Company quality panel keeps agreements open action");
  mustContains(panel, "role=\"tabpanel\" aria-label=\"Özet\"", "Company quality panel renders overview tabpanel");
  mustContains(panel, "role=\"tabpanel\" aria-label=\"Kanıt / Hazırlık\"", "Company quality panel renders proof tabpanel");
  mustContains(panel, "role=\"tabpanel\" aria-label=\"Taslak Skor\"", "Company quality panel renders draft tabpanel");
  mustContains(panel, "role=\"tabpanel\" aria-label=\"İnceleme Kararı\"", "Company quality panel renders decision tabpanel");
  mustContains(panel, "role=\"tabpanel\" aria-label=\"Geçmiş\"", "Company quality panel renders history tabpanel");
  mustContains(panel, "role=\"tabpanel\" aria-label=\"Değerlendirme Alanları\"", "Company quality panel renders fields tabpanel");
  must(countMatches(panel, /activeTab === "/g) === 6, "Company quality panel keeps exactly six tab branches");
  must(countMatches(panel, /role="tabpanel"/g) === 6, "Company quality panel keeps exactly six tabpanel surfaces");
  must(countJsxUses(panel, "QualityProofReadonlyCard") === 1, "Company quality panel renders proof card once");
  must(countJsxUses(panel, "QualityDraftScoreCard") === 1, "Company quality panel renders draft card once");
  must(countJsxUses(panel, "QualityReviewDecisionCard") === 1, "Company quality panel renders decision card once");
  must(countJsxUses(panel, "QualityReviewHistoryCard") === 1, "Company quality panel renders history card once");
  mustNotContains(panel, "FlowSummaryStrip", "Company quality panel removes flow summary strip");
  mustNotContains(panel, "quality-summary-grid", "Company quality panel removes duplicate summary grid");
  mustNotContains(panel, "Son Değerlendirme Bekleyen Hizmetler", "Company quality panel removes old pending services table");
  mustNotContains(panel, "Değerlendirme akışı", "Company quality panel removes legacy flow strip wording");
  must(!normalize(panel).includes("runtime-data"), "Company quality panel avoids runtime-data");
  must(!normalize(panel).includes("prisma"), "Company quality panel avoids prisma");
  must(!normalize(panel).includes("migration"), "Company quality panel avoids migration");

  console.log("=== UX-COMPANY-QUALITY-PANEL-TABS-01 CHECK PASS ===");
}

main();
