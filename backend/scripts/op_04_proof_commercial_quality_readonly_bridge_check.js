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

console.log("=== OP-04 SERVIS KANITI TICARI/KALITE READONLY KOPRU CHECK ===");

const rootPkg = read("package.json");
const route = read("backend/src/routes/operationProof.js");
const service = read("backend/src/ops/operationProof.js");
const api = read("web/src/api.js");
const badge = read("web/src/components/OperationProofReadonlyBadge.jsx");
const commercialCorePanel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const trustQualityPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const op03Card = read("web/src/components/OperationProofMiniCard.jsx");
const doc = read("docs/OP_04_KANIT_DURUMU_TICARI_KALITE_READONLY_KOPRU.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const schema = readCanonicalPrismaSchemaSource(repoRoot);

must(rootPkg, '"check:op04": "node backend/scripts/op_04_proof_commercial_quality_readonly_bridge_check.js"', "root package exposes check:op04");
must(rootPkg, '"check:op01": "node backend/scripts/op_01_operation_proof_service_proof_check.js"', "root package keeps check:op01");
must(rootPkg, '"check:op02": "node backend/scripts/op_02_manual_operator_proof_note_check.js"', "root package keeps check:op02");
must(rootPkg, '"check:op03": "node backend/scripts/op_03_web_operation_proof_card_check.js"', "root package keeps check:op03");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(api, "getOperationProofSummary", "api exposes operation proof summary helper");
must(api, "normalizeOperationProofError", "api exposes operation proof error normalizer");
must(api, "/api/operation-proof/summary", "api uses operation proof summary endpoint");

must(badge, "Servis Kanıtı", "readonly badge title present");
must(badge, "Bu özet hakediş için nihai karar değildir.", "readonly badge keeps non-final wording");
must(badge, "Kanıt bekleniyor", "readonly badge keeps not started label");
must(badge, "Kanıt kısmi", "readonly badge keeps partial label");
must(badge, "Kanıt denetime hazır", "readonly badge keeps ready label");
must(badge, "Tekrar kontrol gerekli", "readonly badge keeps review label");
must(badge, "Sürücünün telefon GPS’i", "readonly badge keeps driver-phone GPS wording");
must(badge, "Araç GPS’i", "readonly badge keeps vehicle GPS wording");
must(badge, "Biniş kaydı", "readonly badge keeps boarding wording");
must(badge, "Operatör notu", "readonly badge keeps operator note wording");
must(badge, "Kanıt durumu yükleniyor...", "readonly badge keeps loading text");
must(badge, "Kanıt durumu henüz oluşmadı.", "readonly badge keeps empty text");
must(badge, "Bu kanıt özetini görme yetkiniz yok.", "readonly badge keeps permission fallback");
mustNot(badge, "Notu kaydet", "readonly badge does not expose save action");
mustNot(badge, "textarea", "readonly badge does not expose textarea");
mustNot(badge, "postOperationProofManualNote", "readonly badge does not write manual notes");
mustNot(badge, "raw token", "readonly badge does not expose raw token wording");
mustNot(badge, "hash", "readonly badge does not expose hash wording");
mustNot(badge, "payload", "readonly badge does not expose payload wording");
mustNot(badge, "debug", "readonly badge does not expose debug wording");

must(commercialCorePanel, "OperationProofReadonlyBadge", "commercial core panel imports readonly badge");
must(trustQualityPanel, "OperationProofReadonlyBadge", "trust quality panel imports readonly badge");

must(route, "operationProofRouter", "operation proof route export exists");
must(route, '"/summary"', "operation proof summary path exists");
must(route, '"/manual-note"', "operation proof manual note path exists");
must(route, "GET /api/operation-proof/summary", "operation proof summary marker exists");
must(route, "POST /api/operation-proof/manual-note", "operation proof manual note marker exists");
must(route, "MANUAL_NOTE_MAX_LENGTH", "operation proof route keeps note length guard");
must(route, "OPERATION_PROOF_MANUAL_NOTE", "operation proof route keeps audit marker");
must(route, "requireRole(\"SUPER_ADMIN\", \"ROOM\", \"COMPANY\")", "operation proof route scope remains limited");
mustNot(route, 'requireRole("DRIVER"', "driver is not allowed on operation proof route");
mustNot(route, 'requireRole("PERSONEL"', "personel is not allowed on operation proof route");
mustNot(route, 'requireRole("PARENT"', "parent is not allowed on operation proof route");

must(service, "MANUAL_OPERATOR_NOTE", "operation proof service keeps manual note signal");
must(service, "manualNotes", "operation proof service still accepts manual notes");
must(service, "manualNotePreview", "operation proof service still builds manual note preview");
must(service, "Sürücünün telefon GPS’i", "operation proof service keeps driver-phone GPS wording");
must(service, "Araç GPS’i", "operation proof service keeps vehicle GPS wording");
must(service, "Biniş kaydı", "operation proof service keeps boarding wording");
must(service, "Hakediş için nihai karar değildir", "operation proof service keeps non-final wording");
mustNot(service, "driver GPS", "operation proof service does not use driver GPS visible wording");
mustNot(service, "agreement", "operation proof service does not use agreement visible wording");

must(op03Card, "Servis Kanıtı", "op03 mini card still exists");
must(op03Card, "Operatör notu kaydedildi.", "op03 mini card still has manual note flow");

must(doc, "Servis Kanıtı", "doc mentions servis kaniti");
must(doc, "Hizmet Kanıtı", "doc mentions hizmet kaniti");
must(doc, "readonly köprü", "doc mentions readonly bridge");
must(doc, "Hakediş için nihai karar değildir", "doc mentions non-final payout note");
must(doc, "Kalite puanı şimdilik pasif", "doc mentions quality score passive state");
must(doc, "PAY-01 için hazırlık", "doc mentions PAY-01 preparation");
must(doc, "QLT-01 için hazırlık", "doc mentions QLT-01 preparation");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver-phone GPS");
must(doc, "Araç GPS’i", "doc mentions vehicle GPS");
must(doc, "Biniş kaydı", "doc mentions boarding record");
must(doc, "Operatör notu", "doc mentions operator note");
must(doc, "Sözleşme", "doc mentions sözleşme");
must(doc, "KVKK görünürlük sınırı", "doc mentions KVKK visibility boundary");
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
  "npm run check:web-mobile",
  "npm run lint:web",
  "npm run verify:final",
]) {
  must(doc, command, `doc includes ${command}`);
}

must(primer, "OP-04", "primer exposes OP-04 visibility");
must(primer, "readonly köprü", "primer describes OP-04 bridge");
must(primer, "settlement aktif değildir", "primer keeps settlement inactive note");
must(primer, "komisyon hesaplama aktif değildir", "primer keeps commission inactive note");

must(registry, "OP-04 - servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü - active-readonly", "registry exposes OP-04 visibility");
must(registry, "OP-01", "registry keeps OP-01 visibility");
must(registry, "OP-02", "registry keeps OP-02 visibility");
must(registry, "OP-03", "registry keeps OP-03 visibility");

must(guide, "node backend\\scripts\\op_04_proof_commercial_quality_readonly_bridge_check.js", "script guide references check:op04");
must(guide, "OP-04 — ticari/kalite readonly köprü [CHECK]", "script guide has OP-04 section");
must(guide, "node backend\\scripts\\op_01_operation_proof_service_proof_check.js", "script guide keeps check:op01 command");
must(guide, "node backend\\scripts\\op_02_manual_operator_proof_note_check.js", "script guide keeps check:op02 command");
must(guide, "node backend\\scripts\\op_03_web_operation_proof_card_check.js", "script guide keeps check:op03 command");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");

console.log("=== OP-04 SERVIS KANITI TICARI/KALITE READONLY KOPRU CHECK PASS ===");
