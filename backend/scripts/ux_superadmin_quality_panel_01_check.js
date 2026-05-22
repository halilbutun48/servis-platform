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

function must(condition, label) {
  if (condition) ok(label);
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
  console.log("=== UX-SUPERADMIN-QUALITY-PANEL-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxsuperadminqualitypanel01"', "package.json exposes check:uxsuperadminqualitypanel01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxsuperadminqualitypanel01", "product extensions runner includes superadmin quality panel check");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxsuperadminqualitypanel01", "verify chain includes superadmin quality panel check");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-SUPERADMIN-QUALITY-PANEL-01", "script guide mentions UX-SUPERADMIN-QUALITY-PANEL-01");
  mustContains(guide, "check:uxsuperadminqualitypanel01", "script guide exposes check:uxsuperadminqualitypanel01");

  const structureAudit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(structureAudit, "UX-SUPERADMIN-QUALITY-PANEL-01", "structure audit includes superadmin quality panel note");
  must(!normalize(structureAudit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(structureAudit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(structureAudit).includes("migration"), "structure audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-SUPERADMIN-QUALITY-PANEL-01", "copilot audit mentions UX-SUPERADMIN-QUALITY-PANEL-01");

  const panel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");

  mustContains(panel, "Güven ve Kalite Özeti", "trust quality panel keeps title");
  mustContains(panel, "FlowSummaryStrip", "trust quality panel keeps flow summary strip");
  mustContains(panel, "Kalite akış özeti", "trust quality panel keeps flow summary title");
  mustContains(panel, "Bu ekran kesin kalite puanı vermez. Kanıt, taslak skor, inceleme kararı ve denetim izini birlikte gösterir.", "trust quality panel keeps flow summary description");
  mustContains(panel, "quality-summary-grid", "trust quality panel keeps summary grid");
  mustContains(panel, "quality-detail-layout", "trust quality panel keeps detail layout");
  mustContains(panel, "quality-card-shell", "trust quality panel keeps shared card shell");
  mustContains(panel, "PanelSegmentTabs", "trust quality panel keeps segmented tabs");
  mustContains(panel, "label: \"Özet\"", "trust quality panel exposes Özet tab label");
  mustContains(panel, "label: \"Servis Kanıtı\"", "trust quality panel exposes Servis Kanıtı tab label");
  mustContains(panel, "label: \"Taslak Skor\"", "trust quality panel exposes Taslak Skor tab label");
  mustContains(panel, "label: \"İnceleme Kararı\"", "trust quality panel exposes İnceleme Kararı tab label");
  mustContains(panel, "label: \"Kalite Geçmişi\"", "trust quality panel exposes Kalite Geçmişi tab label");
  mustContains(panel, "label: \"Yol Haritası / Riskler\"", "trust quality panel exposes Yol Haritası / Riskler tab label");
  mustContains(panel, 'const [activeTab, setActiveTab] = useState("overview")', "trust quality panel keeps overview default tab");
  mustContains(panel, 'role="tabpanel" aria-label="Özet"', "trust quality panel renders overview tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Servis Kanıtı"', "trust quality panel renders proof tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Taslak Skor"', "trust quality panel renders draft tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="İnceleme Kararı"', "trust quality panel renders decision tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Kalite Geçmişi"', "trust quality panel renders history tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Yol Haritası / Riskler"', "trust quality panel renders roadmap tabpanel");
  must(countMatches(panel, /activeTab ===/g) === 6, "trust quality panel keeps exactly six tab branches");
  must(countMatches(panel, /role="tabpanel"/g) === 6, "trust quality panel keeps exactly six tabpanel surfaces");
  must(countMatches(panel, /quality-summary-grid/g) === 1, "trust quality panel keeps a single summary grid");
  must(countMatches(panel, /quality-detail-layout/g) === 1, "trust quality panel keeps a single detail layout");
  mustContains(panel, "Kalite/kanıt bekleyen hizmet var", "trust quality panel keeps critical pending band");
  mustContains(panel, "İnceleme Kararı sekmesine git", "trust quality panel keeps decision CTA");
  mustContains(panel, "Servis Kanıtı sekmesine git", "trust quality panel keeps proof CTA");
  mustContains(panel, "Canlı kalite özeti", "trust quality panel keeps live quality summary wording");
  mustContains(panel, "Tamamlanan hizmet", "trust quality panel keeps completed service wording");
  mustContains(panel, "Değerlendirme bekleyen", "trust quality panel keeps pending wording");
  mustContains(panel, "Aktif hizmet", "trust quality panel keeps active service wording");
  mustContains(panel, "Sağlayıcı sayısı", "trust quality panel keeps provider count wording");
  mustContains(panel, "Yol haritası: hizmet alan değerlendirmesi", "trust quality panel keeps roadmap service-field wording");
  mustContains(panel, "Yol haritası: sağlayıcı kalite sinyali", "trust quality panel keeps roadmap provider-signal wording");
  must(countJsxUses(panel, "OperationProofReadonlyBadge") === 1, "trust quality panel renders proof badge once");
  must(countJsxUses(panel, "QualityProofReadonlyCard") === 1, "trust quality panel renders proof card once");
  must(countJsxUses(panel, "QualityDraftScoreCard") === 1, "trust quality panel renders draft card once");
  must(countJsxUses(panel, "QualityReviewDecisionCard") === 1, "trust quality panel renders decision card once");
  must(countJsxUses(panel, "QualityReviewHistoryCard") === 1, "trust quality panel renders history card once");
  mustNotContains(panel, "runtime-data", "trust quality panel avoids runtime-data");
  mustNotContains(panel, "prisma", "trust quality panel avoids prisma");
  mustNotContains(panel, "migration", "trust quality panel avoids migration");

  console.log("=== UX-SUPERADMIN-QUALITY-PANEL-01 CHECK PASS ===");
}

main();
