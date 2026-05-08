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

console.log("=== OP-03 WEB SERVIS KANITI KARTI CHECK ===");

const rootPkg = read("package.json");
const route = read("backend/src/routes/operationProof.js");
const service = read("backend/src/ops/operationProof.js");
const api = read("web/src/api.js");
const card = read("web/src/components/OperationProofMiniCard.jsx");
const companyOps = read("web/src/panels/company/OperationsPanel.jsx");
const schoolOps = read("web/src/panels/school/OperationsPanel.jsx");
const superAdminOps = read("web/src/panels/superadmin/OperationsPanel.jsx");
const roomOps = read("web/src/panels/room/OperationHealthPanel.jsx");
const doc = read("docs/OP_03_WEB_SERVIS_KANITI_KARTI.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:op03": "node backend/scripts/op_03_web_operation_proof_card_check.js"', "root package exposes check:op03");
must(rootPkg, '"check:op01": "node backend/scripts/op_01_operation_proof_service_proof_check.js"', "root package keeps check:op01");
must(rootPkg, '"check:op02": "node backend/scripts/op_02_manual_operator_proof_note_check.js"', "root package keeps check:op02");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(api, "getOperationProofSummary", "api exposes operation proof summary helper");
must(api, "postOperationProofManualNote", "api exposes operation proof manual note helper");
must(api, "/api/operation-proof/summary", "api uses operation proof summary endpoint");
must(api, "/api/operation-proof/manual-note", "api uses operation proof manual note endpoint");

must(card, "Servis Kanıtı", "mini card title present");
must(card, "Bu özet hakediş için nihai karar değildir.", "mini card keeps non-final wording");
must(card, "Kısa operatör notu yazın", "mini card keeps note placeholder");
must(card, "Notu kaydet", "mini card keeps save action");
must(card, "Operatör notu kaydedildi.", "mini card keeps success message");
must(card, "Sürücünün telefon GPS’i", "mini card keeps driver-phone GPS wording");
must(card, "Araç GPS’i", "mini card keeps vehicle GPS wording");
must(card, "Biniş kaydı", "mini card keeps boarding wording");
must(card, "Operatör notu", "mini card keeps operator note wording");
must(card, "Bu özet için yetkiniz yok.", "mini card keeps permission fallback");
must(card, "Servis kanıtı yükleniyor...", "mini card keeps loading text");
must(card, "Henüz servis kanıtı oluşmadı.", "mini card keeps empty text");
mustNot(card, "raw token", "mini card does not expose raw token wording");
mustNot(card, "hash", "mini card does not expose hash wording");
mustNot(card, "payload", "mini card does not expose payload wording");
mustNot(card, "debug", "mini card does not expose debug wording");

must(companyOps, "OperationProofMiniCard", "company operations imports mini card");
must(companyOps, "manualNoteScopeType", "company operations passes manual note scope");
must(companyOps, "manualNoteScopeId", "company operations passes manual note scope id");

must(schoolOps, "OperationProofMiniCard", "school operations imports mini card");
must(schoolOps, "manualNoteScopeType", "school operations passes manual note scope");
must(schoolOps, "manualNoteScopeId", "school operations passes manual note scope id");

must(superAdminOps, "OperationProofMiniCard", "super admin operations imports mini card");
must(superAdminOps, "manualNoteScopeType", "super admin operations passes manual note scope");
must(superAdminOps, "manualNoteScopeId", "super admin operations passes manual note scope id");

must(roomOps, "OperationProofMiniCard", "room operation health imports mini card");
must(roomOps, "manualNoteScopeType", "room operation health passes manual note scope");
must(roomOps, "manualNoteScopeId", "room operation health passes manual note scope id");

must(route, "operationProofRouter", "operation proof route export exists");
must(route, '"/summary"', "operation proof summary path exists");
must(route, '"/manual-note"', "operation proof manual note path exists");
must(route, "GET /api/operation-proof/summary", "operation proof summary marker exists");
must(route, "POST /api/operation-proof/manual-note", "operation proof manual note marker exists");
must(route, "MANUAL_NOTE_MAX_LENGTH", "operation proof route keeps note length guard");
must(route, "OPERATION_PROOF_MANUAL_NOTE", "operation proof route keeps audit marker");
must(route, "Operatör notu kaydedildi.", "operation proof route keeps safe success response");
must(route, "Bu özet hakediş için nihai karar değildir", "operation proof route keeps non-final wording");
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

must(doc, "Servis Kanıtı", "doc mentions servis kaniti");
must(doc, "Hizmet Kanıtı", "doc mentions hizmet kaniti");
must(doc, "Manuel operatör notu", "doc mentions manual operator note");
must(doc, "Operatör notu kaydedildi.", "doc mentions saved note text");
must(doc, "Hakediş için nihai karar değildir", "doc mentions non-final payout note");
must(doc, "KVKK görünürlük sınırı", "doc mentions KVKK visibility boundary");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver-phone GPS");
must(doc, "Araç GPS’i", "doc mentions vehicle GPS");
must(doc, "Biniş kaydı", "doc mentions boarding record");
must(doc, "Sözleşme", "doc mentions sözleşme");
must(doc, "Kalite puanı şimdilik pasif", "doc mentions quality score passive state");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "doc mentions acceptance outcome");
for (const command of [
  "npm run check:m99kvkk01",
  "npm run check:m99ux01",
  "npm run check:op01",
  "npm run check:op02",
  "npm run check:op03",
  "npm run check:web-mobile",
  "npm run lint:web",
  "npm run verify:final",
]) {
  must(doc, command, `doc includes ${command}`);
}

must(primer, "OP-03", "primer exposes OP-03 visibility");
must(primer, "web servis kanıtı / manuel not küçük kartı", "primer describes OP-03 card");
must(registry, "OP-03 - web servis kanıtı / manuel not küçük kartı - active", "registry exposes OP-03 visibility");
must(registry, "OP-01", "registry keeps OP-01 visibility");
must(registry, "OP-02", "registry keeps OP-02 visibility");
must(guide, "node backend\\scripts\\op_03_web_operation_proof_card_check.js", "script guide references check:op03");
must(guide, "OP-03 — web servis kanıtı / manuel not küçük kartı [CHECK]", "script guide has OP-03 section");
must(guide, "node backend\\scripts\\op_01_operation_proof_service_proof_check.js", "script guide keeps check:op01 command");
must(guide, "node backend\\scripts\\op_02_manual_operator_proof_note_check.js", "script guide keeps check:op02 command");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");

console.log("=== OP-03 WEB SERVIS KANITI KARTI CHECK PASS ===");
