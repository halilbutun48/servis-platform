import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCanonicalPrismaSchemaSource } from "./lib/prismaSchemaSource.js";

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

console.log("=== QLT-03 QUALITY REVIEW DECISION CHECK ===");

const rootPkg = read("package.json");
const route = read("backend/src/routes/trustQuality.js");
const helper = read("backend/src/ops/qualityReviewDecision.js");
const store = read("backend/src/ops/qualityReviewDecisionStore.js");
const api = read("web/src/api.js");
const card = read("web/src/components/QualityReviewDecisionCard.jsx");
const trustPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const servicePanel = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
const doc = read("docs/QLT_03_DENETIMLI_KALITE_ONAYI_TEKRAR_KONTROL.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const schema = readCanonicalPrismaSchemaSource(repoRoot);

must(rootPkg, '"check:qlt03": "node backend/scripts/qlt_03_quality_review_decision_check.js"', "root package exposes check:qlt03");
must(rootPkg, '"check:qlt02": "node backend/scripts/qlt_02_quality_draft_score_check.js"', "root package keeps check:qlt02");
must(rootPkg, '"check:qlt01": "node backend/scripts/qlt_01_quality_provider_readiness_check.js"', "root package keeps check:qlt01");
must(rootPkg, '"check:op01": "node backend/scripts/op_01_operation_proof_service_proof_check.js"', "root package keeps check:op01");
must(rootPkg, '"check:op02": "node backend/scripts/op_02_manual_operator_proof_note_check.js"', "root package keeps check:op02");
must(rootPkg, '"check:op03": "node backend/scripts/op_03_web_operation_proof_card_check.js"', "root package keeps check:op03");
must(rootPkg, '"check:op04": "node backend/scripts/op_04_proof_commercial_quality_readonly_bridge_check.js"', "root package keeps check:op04");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(helper, "QUALITY_REVIEW_DECISION_VERSION", "review helper exposes version");
must(helper, "QUALITY_REVIEW_STATUSES", "review helper exposes statuses");
must(helper, "normalizeQualityReviewDecision", "review helper exposes normalizer");
must(helper, "buildQualityReviewDecisionSummary", "review helper exposes summary builder");
must(helper, "buildQualityReviewChecklist", "review helper exposes checklist builder");
must(helper, "buildQualityReviewSafeView", "review helper exposes safe view builder");
must(helper, "REVIEW_PENDING", "review helper keeps pending status");
must(helper, "REVIEWED", "review helper keeps reviewed status");
must(helper, "NEEDS_RECHECK", "review helper keeps needs recheck status");
must(helper, "IGNORED_FOR_NOW", "review helper keeps ignored status");
must(helper, "Kalite inceleme kararı", "review helper keeps title");
must(helper, "Bu karar kesin kalite puanı değildir", "review helper keeps non-final wording");
must(helper, "Bu karar hakediş veya komisyon hesabını etkilemez", "review helper keeps payment impact wording");
must(helper, "Sağlayıcı sıralaması değildir", "review helper keeps not-ranking wording");
must(helper, "Kalite incelemesi bekliyor", "review helper keeps pending wording");
must(helper, "İncelendi", "review helper keeps reviewed wording");
must(helper, "Tekrar kontrol gerekli", "review helper keeps recheck wording");
must(helper, "Şimdilik dikkate alınmadı", "review helper keeps ignored wording");
must(helper, "Taslak kalite skoru", "review helper keeps draft score wording");
must(helper, "Servis Kanıtı", "review helper keeps proof wording");
must(helper, "Hizmet Kanıtı", "review helper keeps service proof wording");
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

must(route, '"/review-decision/summary"', "trust quality route exposes review decision summary path");
must(route, '"/review-decision"', "trust quality route exposes review decision write path");
must(route, 'requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION")', "trust quality review scope is limited");
must(route, "buildQualityReviewDecisionSummary", "trust quality route uses review helper");
must(route, "findLatestQualityReviewDecisionRecord", "trust quality route can read review decision store");
must(route, "upsertQualityReviewDecisionRecord", "trust quality route can save review decision");
must(route, "QUALITY_REVIEW_DECISION", "trust quality route writes audit marker");
must(route, "slice(0, 500)", "trust quality route trims notes to 500");
must(route, "Kapsam bu kullanıcı için geçerli değil.", "trust quality route keeps scope safety wording");
must(route, "Geçersiz kalite inceleme kararı.", "trust quality route keeps invalid decision wording");
must(route, "Bu karar kesin kalite puanı değildir", "trust quality route keeps non-final wording");
must(route, "Bu karar hakediş veya komisyon hesabını etkilemez", "trust quality route keeps payment impact wording");
must(route, "QUALITY_REVIEW_STATUSES.REVIEW_PENDING", "trust quality route keeps pending default but not postable");
mustNot(route, 'requireRole("DRIVER"', "driver is not allowed on review decision");
mustNot(route, 'requireRole("PERSONEL"', "personel is not allowed on review decision");
mustNot(route, 'requireRole("PARENT"', "parent is not allowed on review decision");
must(route, "decision === QUALITY_REVIEW_STATUSES.REVIEW_PENDING", "trust quality route blocks pending decision in write flow");

must(api, "getQualityReviewDecisionSummary", "api exposes review summary helper");
must(api, "postQualityReviewDecision", "api exposes review write helper");
must(api, "normalizeQualityReviewDecisionError", "api exposes review error normalizer");
must(api, "normalizeQualityReviewDecisionErrorMessage", "api exposes review error message helper");
must(api, "/api/trust-quality/review-decision/summary", "api uses review decision summary endpoint");
must(api, "/api/trust-quality/review-decision", "api uses review decision write endpoint");

must(card, "Kalite inceleme kararı", "review card title present");
must(card, "Bu karar kesin kalite puanı değildir.", "review card keeps non-final wording");
must(card, "Bu karar hakediş veya komisyon hesabını etkilemez.", "review card keeps payment impact wording");
must(card, "Kalite incelemesi bekliyor", "review card keeps pending wording");
must(card, "İncelendi", "review card keeps reviewed wording");
must(card, "Tekrar kontrol gerekli", "review card keeps recheck wording");
must(card, "Şimdilik dikkate alma", "review card keeps ignore wording");
must(card, "Kısa inceleme notu yazın", "review card keeps note placeholder");
must(card, "Kararı kaydet", "review card keeps save action");
must(card, "Kalite inceleme kararı kaydedildi.", "review card keeps success wording");
must(card, "Kalite inceleme kararı yükleniyor...", "review card keeps loading text");
must(card, "Kalite inceleme kararı henüz yok.", "review card keeps empty text");
must(card, "Bu kalite kararını görme yetkiniz yok.", "review card keeps permission fallback");
mustNot(card, "★", "review card does not expose stars");
mustNot(card, "Ranking", "review card does not expose ranking");
mustNot(card, "ranking", "review card does not expose ranking wording");
mustNot(card, "finalScore", "review card does not expose final score wording");
mustNot(card, "providerRank", "review card does not expose provider rank wording");
mustNot(card, "score calculated", "review card does not expose automatic decision wording");
mustNot(card, "automatic decision", "review card does not expose automatic decision wording");

must(trustPanel, "QualityReviewDecisionCard", "trust quality panel imports review card");
must(servicePanel, "QualityReviewDecisionCard", "service evaluation panel imports review card");
must(trustPanel, "QualityProofReadonlyCard", "trust quality panel keeps qlt01 card");
must(trustPanel, "QualityDraftScoreCard", "trust quality panel keeps qlt02 card");
must(servicePanel, "QualityProofReadonlyCard", "service evaluation panel keeps qlt01 card");
must(servicePanel, "QualityDraftScoreCard", "service evaluation panel keeps qlt02 card");

must(doc, "Kalite inceleme kararı", "doc mentions review decision");
must(doc, "Kalite incelemesi bekliyor", "doc mentions pending wording");
must(doc, "İncelendi", "doc mentions reviewed wording");
must(doc, "Tekrar kontrol gerekli", "doc mentions recheck wording");
must(doc, "Şimdilik dikkate alınmadı", "doc mentions ignored wording");
must(doc, "Bu karar kesin kalite puanı değildir", "doc mentions non-final wording");
must(doc, "Bu karar hakediş veya komisyon hesabını etkilemez", "doc mentions payment impact wording");
must(doc, "Sağlayıcı sıralaması değildir", "doc mentions not ranking wording");
must(doc, "Taslak kalite skoru", "doc mentions draft score");
must(doc, "Servis Kanıtı", "doc mentions servis proof");
must(doc, "Hizmet Kanıtı", "doc mentions hizmet proof");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver GPS");
must(doc, "Araç GPS’i", "doc mentions vehicle GPS");
must(doc, "Biniş kaydı", "doc mentions boarding record");
must(doc, "Operatör notu", "doc mentions operator note");
must(doc, "Geri bildirim", "doc mentions feedback");
must(doc, "Şikayet", "doc mentions complaint");
must(doc, "KVKK görünürlük sınırı", "doc mentions KVKK boundary");
must(doc, "Settlement aktif değildir", "doc mentions settlement inactive wording");
must(doc, "Komisyon hesaplama aktif değildir", "doc mentions commission inactive wording");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "doc mentions acceptance outcome");
must(doc, "Güvenli JSON adapter", "doc mentions safe adapter");
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
  "npm run verify:final",
]) {
  must(doc, command, `doc includes ${command}`);
}

must(primer, "QLT-03", "primer exposes QLT-03 visibility");
must(primer, "kontrollü kalite inceleme kararı", "primer keeps QLT-03 review wording");
must(primer, "QLT-01", "primer keeps QLT-01 visibility");
must(primer, "QLT-02", "primer keeps QLT-02 visibility");
must(primer, "OP-01→OP-04 evidence chain", "primer keeps OP evidence chain note");

must(registry, "QLT-03 - kontrollü kalite inceleme akışı - active-review", "registry exposes QLT-03 visibility");
must(registry, "kontrollü kalite inceleme kararı halkasıdır", "registry keeps QLT-03 review note");
must(registry, "QLT-01 - kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası - active-prep", "registry keeps QLT-01 visibility");
must(registry, "QLT-02 - kontrollü kalite skoru taslak modeli - active-draft", "registry keeps QLT-02 visibility");

must(guide, "node backend\\scripts\\qlt_03_quality_review_decision_check.js", "script guide references check:qlt03");
must(guide, "QLT-03 — kontrollü kalite inceleme kararı [CHECK]", "script guide has QLT-03 section");
must(
  guide,
  "QLT-01 hazırlık, QLT-02 taslak skor, QLT-03 kontrollü kalite inceleme kararı, QLT-04 kalite karar geçmişi / denetim izi olarak ilerler",
  "script guide keeps QLT chain note",
);

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model QualityScore", "schema does not add QualityScore model");
mustNot(schema, "model ProviderQualityScore", "schema does not add ProviderQualityScore model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");
mustNoMigrationMarker("qlt_03", "no new qlt-03 migration folder detected");
mustNoMigrationMarker("quality_review", "no new quality review migration folder detected");

mustNot(card, "finalScore", "review card does not expose final score wording");
mustNot(card, "providerRank", "review card does not expose provider rank wording");
mustNot(card, "ranking", "review card does not expose ranking wording");
mustNot(card, "settlementScore", "review card does not expose settlement score wording");

console.log("=== QLT-03 QUALITY REVIEW DECISION CHECK PASS ===");
