import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
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

function mustExist(relPath, label) {
  if (!exists(relPath)) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function topLevelSections(text) {
  const sections = new Map();
  const lines = String(text || "").split(/\r?\n/);
  let current = null;
  let buffer = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.*)$/);
    if (match) {
      if (current) {
        sections.set(current, buffer.join("\n"));
      }
      current = match[1].trim();
      buffer = [];
      continue;
    }
    if (current) {
      buffer.push(line);
    }
  }

  if (current) {
    sections.set(current, buffer.join("\n"));
  }

  return sections;
}

function getSection(sections, prefix) {
  for (const [title, body] of sections.entries()) {
    if (title.startsWith(prefix)) {
      return body;
    }
  }
  throw new Error(`FAIL missing section ${prefix}`);
}

console.log("=== OP-02 MANUAL OPERATOR PROOF NOTE CHECK ===");

const rootPkg = read("package.json");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const docPath = "docs/OP_02_MANUEL_OPERATOR_KANIT_NOTU.md";
const doc = read(docPath);
const sections = topLevelSections(doc);
const service = read("backend/src/ops/operationProof.js");
const route = read("backend/src/routes/operationProof.js");
const store = read("backend/src/ops/operationVerificationRecordStore.js");
const routeMounts = read("backend/src/bootstrap/routeMounts.js");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:op02": "node backend/scripts/op_02_manual_operator_proof_note_check.js"', "root package exposes check:op02");
must(rootPkg, '"check:op01": "node backend/scripts/op_01_operation_proof_service_proof_check.js"', "root package keeps check:op01");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

mustExist(docPath, "manual note document exists");
must(doc, "OP-02 Manuel Operatör Kanıt Notu", "document title present");
must(doc, "Manuel operatör notu", "document mentions manual operator note");
must(doc, "Servis kanıtı", "document mentions service proof");
must(doc, "Hizmet kanıtı", "document mentions service evidence");
must(doc, "MANUAL_OPERATOR_NOTE", "document mentions manual operator signal");
must(doc, "Hakediş için nihai karar değildir", "document mentions non-final payout note");
must(doc, "KVKK görünürlük sınırı", "document mentions KVKK visibility boundary");
must(doc, "Sürücünün telefon GPS’i", "document mentions driver-phone GPS");
must(doc, "Sözleşme", "document mentions sözleşme");
must(doc, "Kalite puanı şimdilik pasif", "document mentions quality score passive state");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "document mentions acceptance outcome states");

const section2 = getSection(sections, "2. OP-01 ile ilişki");
must(section2, "yazma katmanı yalnızca manuel not içindir", "OP-01 relation section explains layer");
must(section2, "OP-02", "OP-01 relation section mentions OP-02 manual note");
must(section2, "destek sinyali olarak kullanır", "OP-01 relation section keeps support-signal wording");

const section4 = getSection(sections, "4. Kim not ekleyebilir?");
for (const needle of ["SUPER_ADMIN", "ROOM", "COMPANY", "SCHOOL", "ORGANIZATION"]) {
  must(section4, needle, `section 4 includes ${needle}`);
}

const section5 = getSection(sections, "5. Kim not ekleyemez?");
for (const needle of ["DRIVER", "PERSONEL", "PARENT"]) {
  must(section5, needle, `section 5 excludes ${needle}`);
}

const section7 = getSection(sections, "7. Hakediş bağlantısı");
must(section7, "Hakediş için nihai karar değildir", "section 7 keeps non-final wording");

const section8 = getSection(sections, "8. Kalite puanı bağlantısı");
must(section8, "Kalite puanı şimdilik pasif", "section 8 keeps passive quality score wording");

const section9 = getSection(sections, "9. Kabul checklist’i");
for (const needle of [
  "Manuel operatör notu eklenebiliyor.",
  "MANUAL_OPERATOR_NOTE sinyali",
  "Hizmet kanıtı özeti güvenli kalıyor.",
  "Kim not ekleyebilir sınırı açık.",
  "Kim not ekleyemez sınırı açık.",
  "KVKK görünürlük sınırı korunuyor.",
  "Sözleşme dili sade kalıyor.",
  "Sürücünün telefon GPS’i dili korunuyor.",
  "Hakediş için nihai karar değildir metni görünüyor.",
  "Kalite puanı şimdilik pasif kalıyor.",
  "Kabul edildi / Eksik / Tekrar kontrol sonucu not edilebiliyor.",
]) {
  must(section9, needle, `section 9 includes ${needle}`);
}

const section10 = getSection(sections, "10. Kabul komutları");
for (const command of [
  "npm run check:m99kvkk01",
  "npm run check:m99ux01",
  "npm run check:op01",
  "npm run check:op02",
  "npm run verify:final",
]) {
  must(section10, command, `section 10 includes ${command}`);
}

const section11 = getSection(sections, "11. Sık hata / ilk bakılacak yerler");
must(section11, "500 karakteri geçerse", "section 11 mentions length guard");
must(section11, "Runtime JSON dosyaları değiştiyse commit’e alınmaz.", "section 11 mentions runtime json hygiene");

must(primer, "OP-02", "primer exposes OP-02 visibility");
must(primer, "manuel operatör kanıt notu katmanı", "primer describes OP-02 layer");
must(registry, "OP-02 - manuel operatör kanıt notu katmanı - active", "registry exposes OP-02 visibility");
must(registry, "manuel not sinyali bu katmanda yaşar", "registry keeps OP-01 readonly note");
must(guide, "node backend\\scripts\\op_02_manual_operator_proof_note_check.js", "script guide references check:op02");
must(guide, "OP-02 — manuel operatör kanıt notu [CHECK]", "script guide has OP-02 section");

must(service, "MANUAL_OPERATOR_NOTE", "service keeps manual operator signal");
must(service, "manualNotes", "service accepts manual notes");
must(service, "operationVerificationRecords", "service accepts operation verification records");
must(service, "manualNotePreview", "service builds manual note preview");
must(service, "Operatör notu:", "service formats operator note signal");
must(service, "Bu özet hakediş için nihai karar değildir", "service keeps non-final payout note");
must(service, "EVIDENCE_READY", "service keeps evidence ready status");
must(service, "NEEDS_REVIEW", "service keeps needs review status");

must(route, "operationProofRouter", "route export exists");
must(route, '"/manual-note"', "route manual note path exists");
must(route, "MANUAL_NOTE_MAX_LENGTH", "route keeps manual note length guard");
must(route, "note.length > MANUAL_NOTE_MAX_LENGTH", "route keeps note length validation");
must(route, "OPERATION_PROOF_MANUAL_NOTE", "route keeps audit marker");
must(route, "notePreview", "route returns safe note preview");
must(route, "nonFinalText", "route returns non-final text");
must(route, "clearResponseCacheExact", "route clears summary cache");
must(route, "upsertOperationVerificationRecord", "route persists manual note through verification store");
must(route, "readOperationVerificationRecords", "route reads verification store for summary");
must(route, 'requireRole("SUPER_ADMIN", "ROOM", "COMPANY")', "route keeps allowed scopes");
must(route, "companyKind", "route keeps company kind scope");
mustNot(route, 'requireRole("DRIVER"', "driver is not allowed on manual note route");
mustNot(route, 'requireRole("PERSONEL"', "personel is not allowed on manual note route");
mustNot(route, 'requireRole("PARENT"', "parent is not allowed on manual note route");

must(routeMounts, "/api/operation-proof", "route mounts operation proof endpoint");
must(routeMounts, "operationProofRouter", "route mount uses operation proof router");

must(store, "upsertOperationVerificationRecord", "record store exposes upsert");
must(store, "readOperationVerificationRecords", "record store exposes read");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model OperationProof", "schema does not add OperationProof model");
mustNot(schema, "model ServiceProof", "schema does not add ServiceProof model");

console.log("=== OP-02 MANUAL OPERATOR PROOF NOTE CHECK PASS ===");
