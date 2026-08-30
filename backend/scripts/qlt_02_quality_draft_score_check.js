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

console.log("=== QLT-02 CONTROLLED QUALITY DRAFT SCORE CHECK ===");

const rootPkg = read("package.json");
const route = read("backend/src/routes/trustQuality.js");
const helper = read("backend/src/ops/qualityDraftScore.js");
const api = read("web/src/api.js");
const card = read("web/src/components/QualityDraftScoreCard.jsx");
const trustPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const servicePanel = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
const doc = read("docs/QLT_02_KONTROLLU_KALITE_SKORU_TASLAK_MODELI.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const schema = readCanonicalPrismaSchemaSource(repoRoot);

must(rootPkg, '"check:qlt02": "node backend/scripts/qlt_02_quality_draft_score_check.js"', "root package exposes check:qlt02");
must(rootPkg, '"check:qlt01": "node backend/scripts/qlt_01_quality_provider_readiness_check.js"', "root package keeps check:qlt01");
must(rootPkg, '"check:op01": "node backend/scripts/op_01_operation_proof_service_proof_check.js"', "root package keeps check:op01");
must(rootPkg, '"check:op02": "node backend/scripts/op_02_manual_operator_proof_note_check.js"', "root package keeps check:op02");
must(rootPkg, '"check:op03": "node backend/scripts/op_03_web_operation_proof_card_check.js"', "root package keeps check:op03");
must(rootPkg, '"check:op04": "node backend/scripts/op_04_proof_commercial_quality_readonly_bridge_check.js"', "root package keeps check:op04");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(helper, "QUALITY_DRAFT_SCORE_VERSION", "draft score helper exposes version");
must(helper, "buildQualityDraftScore", "draft score helper exposes builder");
must(helper, "normalizeDraftScoreSignal", "draft score helper exposes signal normalizer");
must(helper, "buildDraftScoreChecklist", "draft score helper exposes checklist builder");
must(helper, "buildDraftScoreExplanation", "draft score helper exposes explanation builder");
must(helper, "NO_SCORE", "draft score helper keeps no score status");
must(helper, "DRAFT_PARTIAL", "draft score helper keeps partial status");
must(helper, "DRAFT_READY_FOR_REVIEW", "draft score helper keeps ready-for-review status");
must(helper, "NEEDS_REVIEW", "draft score helper keeps needs-review status");
must(helper, "REVIEWED_DRAFT", "draft score helper keeps reviewed draft status");
for (const signal of [
  "PROOF_READY",
  "PROOF_PARTIAL",
  "BOARDING_SIGNAL",
  "GPS_SIGNAL",
  "DRIVER_PHONE_GPS_SIGNAL",
  "VEHICLE_GPS_SIGNAL",
  "MANUAL_OPERATOR_NOTE",
  "SERVICE_EVALUATION_SEEN",
  "FEEDBACK_SEEN",
  "COMPLAINT_SEEN",
  "LATE_OR_MISSING_EVIDENCE",
  "REVIEW_REQUIRED",
]) {
  must(helper, signal, `draft score helper keeps ${signal} signal`);
}
must(helper, "Taslak kalite skoru", "draft score helper keeps title");
must(helper, "Bu skor kesin kalite puanı değildir.", "draft score helper keeps non-final wording");
must(helper, "Bu skor hakediş veya komisyon hesabını etkilemez.", "draft score helper keeps payment impact wording");
must(helper, "Operasyon kanıtı kalite incelemesine yardımcı olur.", "draft score helper keeps operation helper wording");
must(helper, "Denetime hazır öneri", "draft score helper keeps review wording");
must(helper, "Sağlayıcı sıralaması değildir", "draft score helper keeps provider comparison wording");
must(helper, "Taslak kalite skoru henüz oluşmadı.", "draft score helper keeps empty wording");
mustNot(helper, "finalScore", "draft score helper does not expose final score wording");
mustNot(helper, "providerRank", "draft score helper does not expose provider rank wording");
mustNot(helper, "ranking", "draft score helper does not rank providers");
mustNot(helper, "star", "draft score helper does not expose stars");
mustNot(helper, "settlementScore", "draft score helper does not expose settlement score wording");
mustNot(helper, "commission", "draft score helper does not activate commission");

must(route, '"/draft-score/summary"', "trust quality route exposes draft score path");
must(route, 'requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION")', "trust quality draft score scope is limited");
must(route, "buildQualityDraftScore", "trust quality route uses draft score helper");
must(route, "buildQualityProofSignalSummary", "trust quality route keeps proof readiness helper");
must(route, "buildOperationProofPayload", "trust quality route collects operation proof data");
must(route, "buildCompanyServiceEvaluationSummary", "trust quality route can read service evaluation summary");
mustNot(route, 'requireRole("DRIVER"', "driver is not allowed on draft score summary");
mustNot(route, 'requireRole("PERSONEL"', "personel is not allowed on draft score summary");
mustNot(route, 'requireRole("PARENT"', "parent is not allowed on draft score summary");

must(api, "getQualityDraftScoreSummary", "api exposes draft score summary helper");
must(api, "normalizeQualityDraftError", "api exposes draft score error normalizer");
must(api, "/api/trust-quality/draft-score/summary", "api uses draft score summary endpoint");

must(card, "Taslak kalite skoru", "draft score card title present");
must(card, "Bu skor kesin kalite puanı değildir.", "draft score card keeps non-final wording");
must(card, "Bu skor hakediş veya komisyon hesabını etkilemez.", "draft score card keeps payment impact wording");
must(card, "Operasyon kanıtı kalite incelemesine yardımcı olur.", "draft score card keeps helper wording");
must(card, "Taslak kalite skoru yükleniyor...", "draft score card keeps loading text");
must(card, "Taslak kalite skoru henüz oluşmadı.", "draft score card keeps empty text");
must(card, "Denetime hazır öneri", "draft score card keeps review wording");
must(card, "Tekrar kontrol gerekli", "draft score card keeps review warning");
must(card, "İncelenmiş taslak", "draft score card keeps reviewed wording");
must(card, "Sürücünün telefon GPS’i sinyali var", "draft score card keeps driver gps wording");
must(card, "Araç GPS’i sinyali var", "draft score card keeps vehicle gps wording");
must(card, "Biniş kaydı var", "draft score card keeps boarding wording");
must(card, "Operatör notu var", "draft score card keeps operator note wording");
must(card, "Geri bildirim var", "draft score card keeps feedback wording");
must(card, "Şikayet / tekrar kontrol sinyali var", "draft score card keeps complaint wording");
must(card, "Skor yok", "draft score card keeps no-score band");
must(card, "Taslak kısmi", "draft score card keeps partial band");
mustNot(card, "textarea", "draft score card does not expose textarea");
mustNot(card, "Notu kaydet", "draft score card does not expose save action");
mustNot(card, "★", "draft score card does not expose stars");
mustNot(card, "Ranking", "draft score card does not expose ranking");
mustNot(card, "ranking", "draft score card does not expose ranking wording");
mustNot(card, "finalScore", "draft score card does not expose final score wording");
mustNot(card, "providerRank", "draft score card does not expose provider rank wording");
mustNot(card, "score calculated", "draft score card does not expose automatic decision wording");

must(trustPanel, "QualityDraftScoreCard", "trust quality panel imports draft score card");
must(trustPanel, "QualityProofReadonlyCard", "trust quality panel keeps qlt01 card");
must(servicePanel, "QualityDraftScoreCard", "service evaluation panel imports draft score card");
must(servicePanel, "QualityProofReadonlyCard", "service evaluation panel keeps qlt01 card");

must(doc, "Taslak kalite skoru", "doc mentions draft score");
must(doc, "Denetime hazır öneri", "doc mentions review-ready suggestion");
must(doc, "Bu skor kesin kalite puanı değildir", "doc mentions non-final score wording");
must(doc, "Bu skor hakediş veya komisyon hesabını etkilemez", "doc mentions payment impact wording");
must(doc, "Sağlayıcı sıralaması değildir", "doc mentions not a ranking");
must(doc, "Servis Kanıtı", "doc mentions servis proof");
must(doc, "Hizmet Kanıtı", "doc mentions hizmet proof");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver gps");
must(doc, "Araç GPS’i", "doc mentions vehicle gps");
must(doc, "Biniş kaydı", "doc mentions boarding record");
must(doc, "Operatör notu", "doc mentions operator note");
must(doc, "Geri bildirim", "doc mentions feedback");
must(doc, "Şikayet", "doc mentions complaint");
must(doc, "KVKK görünürlük sınırı", "doc mentions KVKK boundary");
must(doc, "Settlement aktif değildir", "doc mentions settlement inactive state");
must(doc, "Komisyon hesaplama aktif değildir", "doc mentions commission inactive state");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "doc mentions acceptance outcome");
must(doc, "Operasyon kanıtı kalite incelemesine yardımcı olur", "doc mentions operation proof helper wording");
for (const command of [
  "npm run check:m99kvkk01",
  "npm run check:m99ux01",
  "npm run check:op01",
  "npm run check:op02",
  "npm run check:op03",
  "npm run check:op04",
  "npm run check:qlt01",
  "npm run check:qlt02",
  "npm run check:web-mobile",
  "npm run lint:web",
  "npm run verify:final",
]) {
  must(doc, command, `doc includes ${command}`);
}

must(primer, "QLT-01", "primer keeps QLT-01 visibility");
must(primer, "QLT-02", "primer exposes QLT-02 visibility");
must(primer, "QLT-03", "primer exposes QLT-03 visibility");
must(primer, "OP-01→OP-04 evidence chain", "primer keeps OP evidence chain note");

must(registry, "QLT-01 - kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası - active-prep", "registry keeps QLT-01 visibility");
must(registry, "QLT-02 - kontrollü kalite skoru taslak modeli - active-draft", "registry exposes QLT-02 visibility");
must(registry, "QLT-03 - kontrollü kalite inceleme akışı - active-review", "registry exposes QLT-03 visibility");

must(guide, "node backend\\scripts\\qlt_02_quality_draft_score_check.js", "script guide references check:qlt02");
must(guide, "QLT-02 — kontrollü kalite skoru taslak modeli [CHECK]", "script guide has QLT-02 section");
must(guide, "QLT-01 — kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası [CHECK]", "script guide keeps QLT-01 section");
must(guide, "QLT-03 kontrollü kalite inceleme kararı", "script guide keeps QLT-03 note");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model QualityScore", "schema does not add QualityScore model");
mustNot(schema, "model ProviderQualityScore", "schema does not add ProviderQualityScore model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");
mustNoMigrationMarker("qlt_02", "no new qlt-02 migration folder detected");
mustNoMigrationMarker("quality_draft_score", "no new quality draft score migration folder detected");

mustNot(helper, "ranking", "draft score helper does not rank providers");
mustNot(helper, "star", "draft score helper does not expose stars");
mustNot(helper, "finalScore", "draft score helper does not expose final score wording");
mustNot(helper, "providerRank", "draft score helper does not expose provider rank wording");
mustNot(helper, "settlementScore", "draft score helper does not expose settlement score wording");

console.log("=== QLT-02 CONTROLLED QUALITY DRAFT SCORE CHECK PASS ===");
