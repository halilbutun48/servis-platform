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

function assertContains(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function assertNotContains(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function assertExists(relPath, label) {
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

console.log("=== M99-KVKK-01 MOBILE WEB PLAIN TEXT CHECK ===");

const rootPkg = read("package.json");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const docPath = "docs/M99_KVKK_01_MOBIL_WEB_SADE_METIN_VE_IZIN_DILI.md";
const doc = read(docPath);
const sections = topLevelSections(doc);
const mobilePkg = read("mobile/package.json");

assertExists(docPath, "KVKK plain text document exists");
assertContains(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package exposes check:m99kvkk01");
assertContains(rootPkg, '"check:m95e25": "node backend/scripts/m95_e25_mobile_field_acceptance_check.js"', "root package keeps check:m95e25");
assertContains(rootPkg, '"check:m95e26": "node backend/scripts/m95_e26_android_emulator_smoke_plan_check.js"', "root package keeps check:m95e26");
assertContains(rootPkg, '"check:m95e27": "node backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js"', "root package keeps check:m95e27");

assertContains(doc, "M99-KVKK-01 Mobil/Web KVKK Sade Metin ve İzin Dili", "document title present");
assertContains(doc, "Mobil ve web yüzeylerinde KVKK / izin açıklamalarını sade Türkçe ile netleştirmek.", "document purpose present");

const section2 = getSection(sections, "2. Temel dil kuralları");
assertContains(section2, "Sürücünün telefon GPS’i", "rules mention driver phone GPS");
assertContains(section2, "driver GPS", "rules mention driver GPS as forbidden");
assertContains(section2, "Sözleşme", "rules mention sözleşme");
assertContains(section2, "agreement", "rules mention agreement as forbidden");
assertContains(section2, "Kullanıcı kodu", "rules mention user code");
assertContains(section2, "PIN veya şifre", "rules mention pin or password");
assertContains(section2, "Veli kodu + PIN", "rules mention veli code plus pin");

const visibleMerged = [
  getSection(sections, "3. Sürücü konum izni metni"),
  getSection(sections, "4. Arka plan konum / ekran kapalı metni"),
  getSection(sections, "5. Personel canlı takip metni"),
  getSection(sections, "6. Veli canlı takip metni"),
  getSection(sections, "7. Firma / okul / oda görünürlük metni"),
  getSection(sections, "8. Veri saklama sade metni"),
  getSection(sections, "9. Hata ve izin reddi metinleri"),
].join("\n");

for (const needle of [
  "driver GPS",
  "agreement",
  "raw token",
  "hash",
  "payload",
  "sourceVisibility",
  "officialSource",
  "debug",
  "fallback",
  "stale",
]) {
  assertNotContains(visibleMerged, needle, `visible sections avoid ${needle}`);
}

assertContains(doc, "Konum izni neden gerekli?", "driver permission title present");
assertContains(doc, "Ekran kapalıyken konum", "background location title present");
assertContains(doc, "Servisim nerede?", "personel live tracking title present");
assertContains(doc, "Öğrencimin servisi", "parent live tracking title present");
assertContains(doc, "Kim neyi görebilir?", "visibility title present");
assertContains(doc, "Veriler ne kadar saklanır?", "retention title present");
assertContains(doc, "Kabul edildi / Eksik / Tekrar kontrol", "document mentions acceptance states");
assertContains(doc, "Teknik flag, token, hash, raw payload kullanıcıya gösterilmeyecek.", "document mentions hidden technical data");

for (const command of [
  "node backend/scripts/m77_kvkk_uyum_katmani_check.js",
  "npm run check:m99kvkk01",
  "npm run check:m95e25",
  "npm run check:m95e26",
  "npm run check:m95e27",
  "npm run verify:final",
]) {
  assertContains(doc, command, `document includes command ${command}`);
}

assertContains(doc, "Mobil login dili sade.", "acceptance checklist contains mobile login language");
assertContains(doc, "Sürücünün telefon GPS’i dili doğru.", "acceptance checklist contains driver phone gps");
assertContains(doc, "Görev yokken GPS beklemede dili doğru.", "acceptance checklist contains standby gps");
assertContains(doc, "Personel canlı takip metni sade.", "acceptance checklist contains personnel live text");
assertContains(doc, "Veli canlı takip metni sade.", "acceptance checklist contains parent live text");
assertContains(doc, "Firma / okul / oda görünürlük metni sade.", "acceptance checklist contains visibility text");
assertContains(doc, "Web panelden devam edin dili yönetim rolleri için korunuyor.", "acceptance checklist contains web panel guidance");
assertContains(doc, "PIN / şifre / token / debug görünmüyor.", "acceptance checklist hides secrets");

assertContains(primer, "M99-KVKK-01", "primer exposes M99-KVKK-01 visibility");
assertContains(primer, "mobil/web KVKK sade metin ve izin dili", "primer describes M99-KVKK-01");

assertContains(registry, "M99-KVKK-01 - mobil/web kvkk sade metin ve izin dili - active", "registry exposes M99-KVKK-01 visibility");

assertContains(guide, "node backend\\scripts\\m99_kvkk_01_mobile_web_plain_text_check.js", "script guide references check:m99kvkk01");
assertContains(guide, "M99-KVKK-01 — mobil/web KVKK sade metin ve izin dili [CHECK]", "script guide has M99-KVKK-01 section");

assertContains(mobilePkg, '"check:m1": "npm run check:m48', "mobile package keeps check:m1");
assertContains(mobilePkg, '"check:m98e1": "node scripts/m98_e1_mobile_force_password_change_check.js"', "mobile package keeps check:m98e1");
assertContains(mobilePkg, '"check:m98e2d": "node scripts/m98_e2d_mobile_code_pin_login_check.js"', "mobile package keeps check:m98e2d");

assertExists("backend/scripts/m77_kvkk_uyum_katmani_check.js", "existing KVKK check script remains present");

console.log("=== M99-KVKK-01 MOBILE WEB PLAIN TEXT CHECK PASS ===");
