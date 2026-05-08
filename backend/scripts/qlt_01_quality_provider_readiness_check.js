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

console.log("=== QLT-01 KALITE PUANI + SAGLAYICI KARSILASTIRMA HAZIRLIK CHECK ===");

const rootPkg = read("package.json");
const route = read("backend/src/routes/trustQuality.js");
const helper = read("backend/src/ops/qualityProofSignals.js");
const api = read("web/src/api.js");
const card = read("web/src/components/QualityProofReadonlyCard.jsx");
const trustPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const servicePanel = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
const op04Badge = read("web/src/components/OperationProofReadonlyBadge.jsx");
const op03Card = read("web/src/components/OperationProofMiniCard.jsx");
const doc = read("docs/QLT_01_KALITE_PUANI_SAGLAYICI_KARSILASTIRMA_HAZIRLIK.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const schema = read("backend/prisma/schema.prisma");
const op04Doc = read("docs/OP_04_KANIT_DURUMU_TICARI_KALITE_READONLY_KOPRU.md");

must(rootPkg, '"check:qlt01": "node backend/scripts/qlt_01_quality_provider_readiness_check.js"', "root package exposes check:qlt01");
must(rootPkg, '"check:op01": "node backend/scripts/op_01_operation_proof_service_proof_check.js"', "root package keeps check:op01");
must(rootPkg, '"check:op02": "node backend/scripts/op_02_manual_operator_proof_note_check.js"', "root package keeps check:op02");
must(rootPkg, '"check:op03": "node backend/scripts/op_03_web_operation_proof_card_check.js"', "root package keeps check:op03");
must(rootPkg, '"check:op04": "node backend/scripts/op_04_proof_commercial_quality_readonly_bridge_check.js"', "root package keeps check:op04");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(helper, "QUALITY_PROOF_SIGNAL_VERSION", "quality helper exposes version");
must(helper, "buildQualityProofSignalSummary", "quality helper exposes summary builder");
must(helper, "normalizeQualitySignal", "quality helper exposes signal normalizer");
must(helper, "buildProviderComparisonReadiness", "quality helper exposes provider comparison readiness");
must(helper, "buildQualityReadinessChecklist", "quality helper exposes readiness checklist");
must(helper, "NOT_READY", "quality helper keeps not ready status");
must(helper, "SIGNALS_PARTIAL", "quality helper keeps signals partial status");
must(helper, "READY_FOR_REVIEW", "quality helper keeps ready for review status");
must(helper, "NEEDS_REVIEW", "quality helper keeps needs review status");
must(helper, "REVIEWED", "quality helper keeps reviewed status");
must(helper, "Kalite puanı hazırlığı", "quality helper keeps preparation title");
must(helper, "Bu bilgi tek başına kalite puanı değildir.", "quality helper keeps non-final text");
must(helper, "Servis kanıtı kalite değerlendirmesine yardımcı olur.", "quality helper keeps helper text");
must(helper, "Sağlayıcı karşılaştırması için hazırlık", "quality helper keeps comparison wording");
must(helper, "Kesin puan değildir", "quality helper keeps no-final-score wording");

must(route, "\"/proof-signals/summary\"", "trust quality route exposes proof signals summary path");
must(route, 'requireRole("SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION")', "trust quality proof summary scope is limited");
must(route, "buildQualityProofSignalSummary", "trust quality route uses quality summary helper");
must(route, "buildOperationProofPayload", "trust quality route collects operation proof data");
must(route, "buildCompanyServiceEvaluationSummary", "trust quality route can read service evaluation summary");
must(route, "getProviderScore", "trust quality route can read provider score");
mustNot(route, 'requireRole("DRIVER"', "driver is not allowed on proof signals summary");
mustNot(route, 'requireRole("PERSONEL"', "personel is not allowed on proof signals summary");
mustNot(route, 'requireRole("PARENT"', "parent is not allowed on proof signals summary");

must(api, "getQualityProofSignalSummary", "api exposes quality proof summary helper");
must(api, "normalizeQualityProofError", "api exposes quality proof error normalizer");
must(api, "/api/trust-quality/proof-signals/summary", "api uses proof signals summary endpoint");

must(card, "Kalite puanı hazırlığı", "readonly quality card title present");
must(card, "Bu bilgi tek başına kalite puanı değildir.", "readonly quality card keeps non-final text");
must(card, "Servis kanıtı kalite değerlendirmesine yardımcı olur.", "readonly quality card keeps helper text");
must(card, "Sağlayıcı karşılaştırması için hazırlık", "readonly quality card keeps comparison text");
must(card, "Kalite sinyalleri yükleniyor...", "readonly quality card keeps loading text");
must(card, "Kalite sinyali henüz oluşmadı.", "readonly quality card keeps empty text");
must(card, "Bu kalite özetini görme yetkiniz yok.", "readonly quality card keeps permission fallback");
must(card, "Sürücünün telefon GPS’i sinyali var", "readonly quality card keeps driver GPS wording");
must(card, "Araç GPS’i sinyali var", "readonly quality card keeps vehicle GPS wording");
must(card, "Biniş kaydı var", "readonly quality card keeps boarding wording");
must(card, "Operatör notu var", "readonly quality card keeps operator note wording");
must(card, "Geri bildirim var", "readonly quality card keeps feedback wording");
must(card, "Hazır değil", "readonly quality card keeps status label");
must(card, "Sinyaller kısmi", "readonly quality card keeps partial label");
must(card, "İncelemeye hazır", "readonly quality card keeps ready label");
must(card, "Tekrar kontrol gerekli", "readonly quality card keeps review label");
must(card, "İncelendi", "readonly quality card keeps reviewed label");
mustNot(card, "textarea", "readonly quality card does not expose textarea");
mustNot(card, "Notu kaydet", "readonly quality card does not expose save action");
mustNot(card, "★", "readonly quality card does not expose star rating");
mustNot(card, "Ranking", "readonly quality card does not expose ranking");
mustNot(card, "siralama", "readonly quality card does not expose ranking wording");
mustNot(card, "hash", "readonly quality card does not expose hash wording");
mustNot(card, "payload", "readonly quality card does not expose payload wording");
mustNot(card, "debug", "readonly quality card does not expose debug wording");

must(trustPanel, "QualityProofReadonlyCard", "trust quality panel imports quality card");
must(servicePanel, "QualityProofReadonlyCard", "service evaluation panel imports quality card");

must(op04Badge, "Servis Kanıtı", "op04 badge still exists");
must(op03Card, "Servis Kanıtı", "op03 card still exists");

must(doc, "Kalite puanı hazırlığı", "doc mentions quality preparation");
must(doc, "Sağlayıcı karşılaştırması için hazırlık", "doc mentions provider comparison preparation");
must(doc, "Servis Kanıtı", "doc mentions servis proof");
must(doc, "Hizmet Kanıtı", "doc mentions hizmet proof");
must(doc, "Servis kanıtı kalite değerlendirmesine yardımcı olur", "doc mentions helper text");
must(doc, "Bu bilgi tek başına kalite puanı değildir.", "doc keeps non-final text");
must(doc, "Kesin puan değildir", "doc keeps no-final-score wording");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver GPS");
must(doc, "Araç GPS’i", "doc mentions vehicle GPS");
must(doc, "Biniş kaydı", "doc mentions boarding record");
must(doc, "Operatör notu", "doc mentions operator note");
must(doc, "Geri bildirim", "doc mentions feedback");
must(doc, "KVKK görünürlük sınırı", "doc mentions KVKK boundary");
must(doc, "Hakediş pasif", "doc mentions payout passive state");
must(doc, "Settlement aktif değildir", "doc mentions settlement inactive state");
must(doc, "Komisyon hesaplama aktif değildir", "doc mentions commission inactive state");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "doc mentions acceptance outcome");
for (const command of [
  "npm run check:m99kvkk01",
  "npm run check:m99ux01",
  "npm run check:op01",
  "npm run check:op02",
  "npm run check:op03",
  "npm run check:op04",
  "npm run check:qlt01",
  "npm run check:web-mobile",
  "npm run lint:web",
  "npm run verify:final",
]) {
  must(doc, command, `doc includes ${command}`);
}

must(primer, "QLT-01", "primer exposes QLT-01 visibility");
must(primer, "OP-01", "primer keeps OP-01 visibility");
must(primer, "OP-02", "primer keeps OP-02 visibility");
must(primer, "OP-03", "primer keeps OP-03 visibility");
must(primer, "OP-04", "primer keeps OP-04 visibility");
must(primer, "OP-01→OP-04 evidence chain", "primer ties OP evidence chain to QLT-01");

must(registry, "QLT-01 - kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası - active-prep", "registry exposes QLT-01 visibility");
must(registry, "OP-01", "registry keeps OP-01 visibility");
must(registry, "OP-02", "registry keeps OP-02 visibility");
must(registry, "OP-03", "registry keeps OP-03 visibility");
must(registry, "OP-04", "registry keeps OP-04 visibility");
must(registry, "OP-01/02/03/04", "registry ties OP evidence chain to QLT-01");

must(guide, "node backend\\scripts\\qlt_01_quality_provider_readiness_check.js", "script guide references check:qlt01");
must(guide, "QLT-01 — kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası [CHECK]", "script guide has QLT-01 section");
must(guide, "node backend\\scripts\\op_01_operation_proof_service_proof_check.js", "script guide keeps check:op01 command");
must(guide, "node backend\\scripts\\op_02_manual_operator_proof_note_check.js", "script guide keeps check:op02 command");
must(guide, "node backend\\scripts\\op_03_web_operation_proof_card_check.js", "script guide keeps check:op03 command");
must(guide, "node backend\\scripts\\op_04_proof_commercial_quality_readonly_bridge_check.js", "script guide keeps check:op04 command");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model QualityScore", "schema does not add QualityScore model");
mustNot(schema, "model ProviderQualityScore", "schema does not add ProviderQualityScore model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");

must(op04Doc, "Servis Kanıtı", "op04 doc still exists");
must(op04Doc, "OP-01", "op04 doc keeps op01 bridge");
must(op04Doc, "OP-02", "op04 doc keeps op02 bridge");
must(op04Doc, "OP-03", "op04 doc keeps op03 bridge");
must(op04Doc, "Settlement aktif değildir", "op04 doc keeps settlement inactive wording");
must(op04Doc, "Komisyon hesaplama aktif değildir", "op04 doc keeps commission inactive wording");
mustNot(op04Doc, "Kalite puanı hesaplandı", "op04 doc does not activate quality score");

mustNot(helper, "ranking", "quality helper does not rank providers");
mustNot(helper, "star", "quality helper does not expose stars");
mustNot(helper, "commission", "quality helper does not activate commission");
mustNot(helper, "settlement", "quality helper does not activate settlement");
mustNot(helper, "token", "quality helper does not expose token wording");
mustNot(helper, "hash", "quality helper does not expose hash wording");
mustNot(helper, "payload", "quality helper does not expose payload wording");
mustNot(helper, "debug", "quality helper does not expose debug wording");

console.log("=== QLT-01 KALITE PUANI + SAGLAYICI KARSILASTIRMA HAZIRLIK CHECK PASS ===");
