import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
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

function must(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNoMigrationMarker(marker, label) {
  const dir = path.join(repoRoot, "backend/prisma/migrations");
  if (!fs.existsSync(dir)) {
    console.log(`OK ${label}`);
    return;
  }
  const folders = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (folders.some((name) => normalize(name).includes(normalize(marker)))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

console.log("=== QLT-04B COMPACT SIGNAL LIST CHECK ===");

const rootPkg = read("package.json");
const trustPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const servicePanel = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
const opBadge = read("web/src/components/OperationProofReadonlyBadge.jsx");
const proofCard = read("web/src/components/QualityProofReadonlyCard.jsx");
const draftCard = read("web/src/components/QualityDraftScoreCard.jsx");
const reviewHistoryCard = read("web/src/components/QualityReviewHistoryCard.jsx");
const reviewDecisionCard = read("web/src/components/QualityReviewDecisionCard.jsx");
const css = read("web/src/index.css");
const route = read("backend/src/routes/trustQuality.js");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:qlt04b": "node backend/scripts/qlt_04b_compact_signal_list_check.js"', "root package exposes check:qlt04b");
must(rootPkg, '"check:qlt04a": "node backend/scripts/qlt_04a_quality_layout_polish_check.js"', "root package keeps check:qlt04a");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
must(rootPkg, '"lint:web": "node backend/scripts/run_web_lint_with_evidence.js"', "root package keeps lint:web");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(trustPanel, "quality-summary-grid", "trust panel keeps summary grid");
must(trustPanel, "quality-detail-layout", "trust panel keeps detail layout");
must(trustPanel, "quality-card-shell", "trust panel keeps quality card shell");
must(trustPanel, "OperationProofReadonlyBadge", "trust panel keeps operation proof badge");
must(trustPanel, "QualityProofReadonlyCard", "trust panel keeps proof card");
must(trustPanel, "QualityDraftScoreCard", "trust panel keeps draft card");
must(trustPanel, "QualityReviewDecisionCard", "trust panel keeps review decision card");
must(trustPanel, "QualityReviewHistoryCard", "trust panel keeps review history card");

must(servicePanel, "PanelSegmentTabs", "service panel keeps segmented tabs");
must(servicePanel, "quality-card-shell", "service panel keeps quality card shell");
must(servicePanel, 'const [activeTab, setActiveTab] = useState("overview")', "service panel keeps overview default tab");
must(servicePanel, 'label: "Özet"', "service panel exposes Özet tab label");
must(servicePanel, 'label: "Kanıt / Hazırlık"', "service panel exposes Kanıt / Hazırlık tab label");
must(servicePanel, 'label: "Taslak Skor"', "service panel exposes Taslak Skor tab label");
must(servicePanel, 'label: "İnceleme Kararı"', "service panel exposes İnceleme Kararı tab label");
must(servicePanel, 'label: "Geçmiş"', "service panel exposes Geçmiş tab label");
must(servicePanel, 'label: "Değerlendirme Alanları"', "service panel exposes Değerlendirme Alanları tab label");
must(servicePanel, "role=\"tabpanel\" aria-label=\"Özet\"", "service panel renders overview tabpanel");
must(servicePanel, "role=\"tabpanel\" aria-label=\"Kanıt / Hazırlık\"", "service panel renders proof tabpanel");
must(servicePanel, "role=\"tabpanel\" aria-label=\"Taslak Skor\"", "service panel renders draft tabpanel");
must(servicePanel, "role=\"tabpanel\" aria-label=\"İnceleme Kararı\"", "service panel renders decision tabpanel");
must(servicePanel, "role=\"tabpanel\" aria-label=\"Geçmiş\"", "service panel renders history tabpanel");
must(servicePanel, "role=\"tabpanel\" aria-label=\"Değerlendirme Alanları\"", "service panel renders fields tabpanel");
must(servicePanel, "Değerlendirme bekleyen hizmet var", "service panel keeps pending info band");
mustNot(servicePanel, "quality-detail-layout", "service panel removes legacy detail layout");
mustNot(servicePanel, "quality-metric-grid", "service panel removes legacy metric grid");
mustNot(servicePanel, "quality-summary-grid", "service panel removes legacy summary grid");
must(servicePanel, "QualityProofReadonlyCard", "service panel keeps proof card");
must(servicePanel, "QualityDraftScoreCard", "service panel keeps draft card");
must(servicePanel, "QualityReviewDecisionCard", "service panel keeps review decision card");
must(servicePanel, "QualityReviewHistoryCard", "service panel keeps review history card");

must(opBadge, "quality-compact-summary", "operation proof badge adds compact summary");
must(opBadge, "quality-chip-row", "operation proof badge adds chip row");
must(opBadge, "quality-chip", "operation proof badge uses compact chips");
must(opBadge, "Sürücünün telefon GPS’i", "operation proof badge keeps driver gps wording");
must(opBadge, "Araç GPS’i", "operation proof badge keeps vehicle gps wording");
must(opBadge, "Biniş kaydı", "operation proof badge keeps boarding wording");
must(opBadge, "Operatör notu", "operation proof badge keeps operator note wording");
mustNot(opBadge, "raw token", "operation proof badge does not expose raw token");
mustNot(opBadge, "payload", "operation proof badge does not expose payload");
mustNot(opBadge, "hash", "operation proof badge does not expose hash");
mustNot(opBadge, "debug", "operation proof badge does not expose debug");

must(proofCard, "quality-compact-summary", "proof card adds compact summary");
must(proofCard, "quality-chip-row", "proof card adds chip row");
must(proofCard, "quality-chip", "proof card uses compact chips");
must(proofCard, "quality-mini-list", "proof card keeps compact checklist wrapper");
must(proofCard, "Sürücünün telefon GPS’i", "proof card keeps driver gps wording");
must(proofCard, "Araç GPS’i", "proof card keeps vehicle gps wording");
must(proofCard, "Biniş kaydı", "proof card keeps boarding wording");
must(proofCard, "Operatör notu", "proof card keeps operator note wording");
mustNot(proofCard, "raw token", "proof card does not expose raw token");
mustNot(proofCard, "payload", "proof card does not expose payload");
mustNot(proofCard, "hash", "proof card does not expose hash");
mustNot(proofCard, "debug", "proof card does not expose debug");

must(draftCard, "quality-compact-summary", "draft card adds compact summary");
must(draftCard, "quality-chip-row", "draft card adds chip row");
must(draftCard, "quality-chip", "draft card uses compact chips");
must(draftCard, "quality-mini-list", "draft card keeps compact list wrapper");
must(draftCard, "Sürücünün telefon GPS’i", "draft card keeps driver gps wording");
must(draftCard, "Araç GPS’i", "draft card keeps vehicle gps wording");
must(draftCard, "Biniş kaydı", "draft card keeps boarding wording");
must(draftCard, "Operatör notu", "draft card keeps operator note wording");
mustNot(draftCard, "raw token", "draft card does not expose raw token");
mustNot(draftCard, "payload", "draft card does not expose payload");
mustNot(draftCard, "hash", "draft card does not expose hash");
mustNot(draftCard, "debug", "draft card does not expose debug");

must(reviewHistoryCard, "quality-compact-summary", "history card adds compact summary");
must(reviewHistoryCard, "quality-history-item", "history card keeps compact item shell");
must(reviewHistoryCard, "quality-mini-list", "history card keeps compact list wrapper");
must(reviewHistoryCard, "Kalite karar geçmişi", "history card keeps title");
must(reviewHistoryCard, "Denetim izi", "history card keeps audit wording");
must(reviewHistoryCard, "İncelendi", "history card keeps reviewed wording");
must(reviewHistoryCard, "Tekrar kontrol gerekli", "history card keeps recheck wording");
must(reviewHistoryCard, "Şimdilik dikkate alınmadı", "history card keeps ignored wording");
must(reviewHistoryCard, "Kalite karar geçmişi yükleniyor...", "history card keeps loading text");
must(reviewHistoryCard, "Kalite karar geçmişi henüz yok.", "history card keeps empty text");
must(reviewHistoryCard, "Bu geçmiş kesin kalite puanı değildir.", "history card keeps non-final wording");
must(reviewHistoryCard, "Bu geçmiş hakediş veya komisyon hesabını etkilemez.", "history card keeps payment impact wording");
mustNot(reviewHistoryCard, "finalScore", "history card does not expose final score");
mustNot(reviewHistoryCard, "providerRank", "history card does not expose provider rank");
mustNot(reviewHistoryCard, "ranking", "history card does not expose ranking");
mustNot(reviewHistoryCard, "debug", "history card does not expose debug");

must(reviewDecisionCard, "Kısa inceleme notu yazın", "review decision card keeps compact note field");
must(reviewDecisionCard, "Kararı kaydet", "review decision card keeps save action");
must(reviewDecisionCard, "rows={2}", "review decision card keeps compact textarea");
mustNot(reviewDecisionCard, "Notu kaydet", "review decision card does not rename save action");

must(css, ".quality-compact-summary {", "css defines compact summary");
must(css, ".quality-chip-row {", "css defines chip row");
must(css, ".quality-chip {", "css defines compact chips");
must(css, ".quality-chip--muted {", "css defines muted chip");
must(css, ".quality-mini-list {", "css defines mini list");
must(css, ".quality-history-item {", "css defines history item");
must(css, ".quality-summary-grid {", "css keeps summary grid");
must(css, ".quality-detail-layout {", "css keeps detail layout");
must(css, ".quality-card-shell {", "css keeps quality card shell");
must(css, ".quality-metric-grid {", "css keeps metric grid");

must(route, '"/review-decision/summary"', "trust quality route keeps draft summary endpoint");
must(route, '"/review-decision/history"', "trust quality route keeps history endpoint");
must(route, '"/review-decision"', "trust quality route keeps review decision endpoint");
mustNot(route, "compact-signal", "no new backend compact signal route");
mustNot(route, "qlt_04b", "no backend qlt04b route marker");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model QualityLayout", "schema does not add layout model");
mustNot(schema, "model QualityScore", "schema does not add quality score model");
mustNot(schema, "model ProviderQualityScore", "schema does not add provider quality score model");
mustNoMigrationMarker("qlt_04b", "no qlt-04b migration folder detected");

console.log("=== QLT-04B COMPACT SIGNAL LIST CHECK PASS ===");
