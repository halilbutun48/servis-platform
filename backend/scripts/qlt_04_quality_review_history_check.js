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

console.log("=== QLT-04 QUALITY REVIEW HISTORY CHECK ===");

const rootPkg = read("package.json");
const helper = read("backend/src/ops/qualityReviewDecision.js");
const store = read("backend/src/ops/qualityReviewDecisionStore.js");
const route = read("backend/src/routes/trustQuality.js");
const api = read("web/src/api.js");
const card = read("web/src/components/QualityReviewHistoryCard.jsx");
const trustPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const servicePanel = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
const doc = read("docs/QLT_04_KALITE_KARAR_GECMISI_DENETIM_IZI.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:qlt04": "node backend/scripts/qlt_04_quality_review_history_check.js"', "root package exposes check:qlt04");
must(rootPkg, '"check:qlt03": "node backend/scripts/qlt_03_quality_review_decision_check.js"', "root package keeps check:qlt03");
must(rootPkg, '"check:qlt02": "node backend/scripts/qlt_02_quality_draft_score_check.js"', "root package keeps check:qlt02");
must(rootPkg, '"check:qlt01": "node backend/scripts/qlt_01_quality_provider_readiness_check.js"', "root package keeps check:qlt01");
must(rootPkg, '"check:op01": "node backend/scripts/op_01_operation_proof_service_proof_check.js"', "root package keeps check:op01");
must(rootPkg, '"check:op02": "node backend/scripts/op_02_manual_operator_proof_note_check.js"', "root package keeps check:op02");
must(rootPkg, '"check:op03": "node backend/scripts/op_03_web_operation_proof_card_check.js"', "root package keeps check:op03");
must(rootPkg, '"check:op04": "node backend/scripts/op_04_proof_commercial_quality_readonly_bridge_check.js"', "root package keeps check:op04");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(helper, "buildQualityReviewHistorySummary", "review helper exposes history summary builder");
must(helper, "buildQualityReviewHistorySafeList", "review helper exposes history safe list builder");
must(helper, "Kalite karar geçmişi", "review helper keeps history title wording");
must(helper, "Denetim izi", "review helper keeps audit wording");
must(helper, "latestDecision", "review helper exposes latest decision field");
must(helper, "Bu geçmiş kesin kalite puanı değildir", "review helper keeps non-final history wording");
must(helper, "Bu geçmiş hakediş veya komisyon hesabını etkilemez", "review helper keeps payment impact wording");
must(helper, "Sağlayıcı sıralaması değildir", "review helper keeps not-ranking wording");
must(helper, "Kalite incelemesi bekliyor", "review helper keeps pending wording");
must(helper, "İncelendi", "review helper keeps reviewed wording");
must(helper, "Tekrar kontrol gerekli", "review helper keeps recheck wording");
must(helper, "Şimdilik dikkate alınmadı", "review helper keeps ignored wording");
must(helper, "Son kalite kararı", "review helper keeps latest decision wording");
must(helper, "Sürücünün telefon GPS’i", "review helper keeps driver GPS wording");
must(helper, "Araç GPS’i", "review helper keeps vehicle GPS wording");
must(helper, "Biniş kaydı", "review helper keeps boarding wording");
must(helper, "Operatör notu", "review helper keeps operator note wording");
must(helper, "Geri bildirim", "review helper keeps feedback wording");
must(helper, "Şikayet", "review helper keeps complaint wording");

must(store, "quality-review-decisions.json", "review store uses safe json adapter");
must(store, "createJsonFileStore", "review store uses json file store");
must(store, "QUALITY_REVIEW_DECISION", "review store keeps review decision marker");
must(store, "REVIEW_PENDING", "review store rejects pending decision");
must(store, "updatedByLabel", "review store keeps safe actor label");
must(store, "updatedByRole", "review store keeps actor role marker");

must(route, '"/review-decision/history"', "trust quality route exposes review decision history path");
must(route, 'requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION")', "trust quality history scope is limited");
must(route, "buildQualityReviewHistorySummary", "trust quality route uses history helper");
must(route, "readQualityReviewDecisionRecords", "trust quality route can read history records");
must(route, "clearResponseCache(\"trust-quality:review-decision-history:", "trust quality route clears history cache after save");
must(route, "slice(0, 10)", "trust quality history keeps 10 item limit");
must(route, "cleanText(record?.note, 120)", "trust quality history keeps note preview limit");
must(route, "Bu geçmiş kesin kalite puanı değildir", "trust quality route keeps non-final history wording");
must(route, "Bu geçmiş hakediş veya komisyon hesabını etkilemez", "trust quality route keeps payment impact history wording");
must(route, "Kapsam bu kullanıcı için geçerli değil.", "trust quality route keeps scope safety wording");
mustNot(route, 'post("/review-decision/history"', "history endpoint is read-only");
mustNot(route, 'put("/review-decision/history"', "history endpoint has no put");
mustNot(route, 'delete("/review-decision/history"', "history endpoint has no delete");
mustNot(route, 'requireRole("DRIVER"', "driver is not allowed on history");
mustNot(route, 'requireRole("PERSONEL"', "personel is not allowed on history");
mustNot(route, 'requireRole("PARENT"', "parent is not allowed on history");

must(api, "getQualityReviewDecisionHistory", "api exposes review history helper");
must(api, "/api/trust-quality/review-decision/history", "api uses review history endpoint");

must(card, "Kalite karar geçmişi", "history card title present");
must(card, "Denetim izi", "history card subtitle present");
must(card, "Bu geçmiş kesin kalite puanı değildir.", "history card keeps non-final wording");
must(card, "Bu geçmiş hakediş veya komisyon hesabını etkilemez.", "history card keeps payment impact wording");
must(card, "Kalite karar geçmişi yükleniyor...", "history card keeps loading text");
must(card, "Kalite karar geçmişi henüz yok.", "history card keeps empty text");
must(card, "Bu kalite geçmişini görme yetkiniz yok.", "history card keeps permission fallback");
must(card, "Son kalite kararı", "history card keeps latest decision label");
must(card, "İncelendi", "history card keeps reviewed wording");
must(card, "Tekrar kontrol gerekli", "history card keeps recheck wording");
must(card, "Şimdilik dikkate alınmadı", "history card keeps ignored wording");
must(card, "Kalite incelemesi bekliyor", "history card keeps pending wording");
must(card, "Sürücünün telefon GPS’i", "history card keeps driver gps wording");
must(card, "Araç GPS’i", "history card keeps vehicle gps wording");
must(card, "Biniş kaydı", "history card keeps boarding wording");
must(card, "Operatör notu", "history card keeps operator note wording");
mustNot(card, "★", "history card does not expose stars");
mustNot(card, "ranking", "history card does not expose ranking");
mustNot(card, "Ranking", "history card does not expose ranking");
mustNot(card, "finalScore", "history card does not expose final score");
mustNot(card, "providerRank", "history card does not expose provider rank");
mustNot(card, "textarea", "history card has no input");
mustNot(card, "Kararı kaydet", "history card has no save action");
mustNot(card, "Notu kaydet", "history card has no save action");

must(trustPanel, "QualityReviewHistoryCard", "trust quality panel imports history card");
must(servicePanel, "QualityReviewHistoryCard", "service evaluation panel imports history card");
must(trustPanel, "QualityReviewDecisionCard", "trust quality panel keeps qlt03 card");
must(trustPanel, "QualityDraftScoreCard", "trust quality panel keeps qlt02 card");
must(trustPanel, "QualityProofReadonlyCard", "trust quality panel keeps qlt01 card");
must(servicePanel, "QualityReviewDecisionCard", "service evaluation panel keeps qlt03 card");
must(servicePanel, "QualityDraftScoreCard", "service evaluation panel keeps qlt02 card");
must(servicePanel, "QualityProofReadonlyCard", "service evaluation panel keeps qlt01 card");

must(doc, "Kalite karar geçmişi", "doc mentions quality history");
must(doc, "Denetim izi", "doc mentions audit trace");
must(doc, "Son kalite kararı", "doc mentions latest decision");
must(doc, "Kalite inceleme kararı", "doc mentions review decision");
must(doc, "İncelendi", "doc mentions reviewed wording");
must(doc, "Tekrar kontrol gerekli", "doc mentions recheck wording");
must(doc, "Şimdilik dikkate alınmadı", "doc mentions ignored wording");
must(doc, "Bu geçmiş kesin kalite puanı değildir", "doc mentions non-final wording");
must(doc, "Bu geçmiş hakediş veya komisyon hesabını etkilemez", "doc mentions payment impact wording");
must(doc, "Sağlayıcı sıralaması değildir", "doc mentions not ranking wording");
must(doc, "Taslak kalite skoru", "doc mentions draft score");
must(doc, "Servis Kanıtı", "doc mentions servis proof");
must(doc, "Hizmet Kanıtı", "doc mentions hizmet proof");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver gps wording");
must(doc, "Araç GPS’i", "doc mentions vehicle gps wording");
must(doc, "Biniş kaydı", "doc mentions boarding wording");
must(doc, "Operatör notu", "doc mentions operator note");
must(doc, "Geri bildirim", "doc mentions feedback");
must(doc, "Şikayet", "doc mentions complaint");
must(doc, "KVKK görünürlük sınırı", "doc mentions kvkk boundary");
must(doc, "Settlement aktif değildir", "doc mentions settlement inactive wording");
must(doc, "Komisyon hesaplama aktif değildir", "doc mentions commission inactive wording");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "doc mentions acceptance outcome");
for (const command of [
  "npm run check:m99kvkk01",
  "npm run check:m99ux01",
  "npm run check:op01",
  "npm run check:op02",
  "npm run check:op03",
  "npm run check:op04",
  "npm run check:qlt01",
  "npm run check:qlt02",
  "npm run check:qlt03",
  "npm run check:qlt04",
  "npm run verify:final",
]) {
  must(doc, command, `doc includes ${command}`);
}

must(primer, "QLT-04", "primer exposes QLT-04 visibility");
must(primer, "kalite karar geçmişi / denetim izi", "primer keeps QLT-04 wording");
must(primer, "QLT-03", "primer keeps QLT-03 visibility");
must(primer, "QLT-02", "primer keeps QLT-02 visibility");
must(primer, "QLT-01", "primer keeps QLT-01 visibility");

must(registry, "QLT-04 - kalite karar geçmişi / denetim izi - active-history", "registry exposes QLT-04 visibility");
must(registry, "QLT-03 - kontrollü kalite inceleme akışı - active-review", "registry keeps QLT-03 visibility");
must(registry, "QLT-02 - kontrollü kalite skoru taslak modeli - active-draft", "registry keeps QLT-02 visibility");
must(registry, "QLT-01 - kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası - active-prep", "registry keeps QLT-01 visibility");

must(guide, "node backend\\scripts\\qlt_04_quality_review_history_check.js", "script guide references check:qlt04");
must(guide, "QLT-04 — kalite karar geçmişi / denetim izi [CHECK]", "script guide has QLT-04 section");
must(guide, "QLT-01 hazırlık, QLT-02 taslak skor, QLT-03 kontrollü kalite inceleme kararı, QLT-04 kalite karar geçmişi / denetim izi olarak ilerler", "script guide keeps QLT chain note");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model QualityScore", "schema does not add QualityScore model");
mustNot(schema, "model ProviderQualityScore", "schema does not add ProviderQualityScore model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");
mustNoMigrationMarker("qlt_04", "no new qlt-04 migration folder detected");
mustNoMigrationMarker("quality_review", "no new quality review migration folder detected");

mustNot(card, "finalScore", "history card does not expose final score wording");
mustNot(card, "providerRank", "history card does not expose provider rank wording");
mustNot(card, "ranking", "history card does not expose ranking wording");
mustNot(card, "settlementScore", "history card does not expose settlement score wording");

console.log("=== QLT-04 QUALITY REVIEW HISTORY CHECK PASS ===");
