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

console.log("=== M99-UX-01 VISIBLE TURKISH TEXT HYGIENE CHECK ===");

const rootPkg = read("package.json");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const uxDocPath = "docs/M99_UX_01_GORUNUR_TURKCE_METIN_HIJYENI.md";
const uxDoc = read(uxDocPath);
const uxSections = topLevelSections(uxDoc);
const kvkkDoc = read("docs/M99_KVKK_01_MOBIL_WEB_SADE_METIN_VE_IZIN_DILI.md");
const mobilePkg = read("mobile/package.json");
const loginScreen = read("mobile/src/screens/LoginScreen.js");
const driverText = read("mobile/src/screens/driverUiText.js");
const roleSurface = read("mobile/src/lib/roleSurface.js");
const brandMark = read("web/src/components/BrandMark.jsx");
const gpsSource = read("web/src/utils/gpsSource.js");
const gpsVisibility = read("web/src/utils/gpsSourceVisibility.js");
const mapView = read("web/src/components/map/MapView.jsx");

assertExists(uxDocPath, "UX hygiene document exists");
assertExists("docs/M99_KVKK_01_MOBIL_WEB_SADE_METIN_VE_IZIN_DILI.md", "KVKK plain text document still exists");
assertContains(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package exposes check:m99ux01");
assertContains(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
assertContains(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
assertContains(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

assertContains(uxDoc, "M99-UX-01 Görünür Türkçe Metin Hijyeni", "ux doc title present");
assertContains(uxDoc, "Web ve mobilde kullanıcıya görünen metinlerin sade Türkçe kalmasını sağlamak.", "ux doc purpose present");
assertContains(uxDoc, "Sözleşme", "ux doc mentions sözleşme");
assertContains(uxDoc, "agreement", "ux doc mentions agreement in technical section");
assertContains(uxDoc, "Sürücünün telefon GPS’i", "ux doc mentions driver phone gps");
assertContains(uxDoc, "driver GPS", "ux doc mentions driver GPS in technical section");
assertContains(uxDoc, "Kullanıcı kodu", "ux doc mentions user code");
assertContains(uxDoc, "PIN veya şifre", "ux doc mentions pin or password");
assertContains(uxDoc, "Veli kodu + PIN", "ux doc mentions veli code plus pin");
assertContains(uxDoc, "Web panelden devam edin", "ux doc mentions web panel guidance");
assertContains(uxDoc, "Kabul edildi / Eksik / Tekrar kontrol", "ux doc mentions acceptance states");

const section3 = getSection(uxSections, "3. Kullanıcıya görünmemesi gereken teknik kelimeler");
for (const term of [
  "agreement",
  "driver GPS",
  "fallback",
  "stale",
  "sourceVisibility",
  "officialSource",
  "payload",
  "raw",
  "hash",
  "token",
  "debug",
  "RBAC",
  "middleware",
  "router",
  "stack trace",
  "undefined",
  "null",
  "500 internal server error",
]) {
  assertContains(section3, term, `technical list mentions ${term}`);
}

const mobileVisibleSection = getSection(uxSections, "5. Mobil görünür metin checklist’i");
const webVisibleSection = getSection(uxSections, "6. Web görünür metin checklist’i");

for (const [sectionText, label, phrases] of [
  [
    mobileVisibleSection,
    "mobile visible section",
    [
      "Kullanıcı kodu",
      "PIN veya şifre",
      "Sürücünün telefon GPS’i",
      "Bugünkü servis",
      "Öğrencimin servisi",
      "Web panelden devam edin",
    ],
  ],
  [
    webVisibleSection,
    "web visible section",
    [
      "Sözleşme",
      "Sürücünün telefon GPS’i",
      "Web panelden devam edin",
    ],
  ],
]) {
  for (const phrase of phrases) {
    assertContains(sectionText, phrase, `${label} includes ${phrase}`);
  }
}

assertContains(uxDoc, "agreement → sözleşme", "doc provides agreement replacement");
assertContains(uxDoc, "driver GPS → sürücünün telefon GPS’i", "doc provides driver gps replacement");
assertContains(uxDoc, "fallback → yedek / devreye alma / beklemede", "doc provides fallback replacement");
assertContains(uxDoc, "stale → güncel değil / eski", "doc provides stale replacement");
assertContains(uxDoc, "sourceVisibility → konum kaynağı bilgisi", "doc provides sourceVisibility replacement");
assertContains(uxDoc, "officialSource → resmi konum kaynağı", "doc provides officialSource replacement");
assertContains(uxDoc, "payload → gönderilen bilgi / kayıt detayı", "doc provides payload replacement");
assertContains(uxDoc, "token → erişim kodu / oturum bilgisi / bağlantı bilgisi, bağlama göre", "doc provides token replacement");
assertContains(uxDoc, "debug → teknik kayıt", "doc provides debug replacement");
assertContains(uxDoc, "500 internal server error → İşlem tamamlanamadı. Lütfen tekrar deneyin.", "doc provides 500 replacement");

for (const command of [
  "npm run check:m99kvkk01",
  "npm run check:m99ux01",
  "npm run check:web-mobile",
  "npm --prefix mobile run check:m1",
  "npm run verify:final",
]) {
  assertContains(uxDoc, command, `ux doc includes command ${command}`);
}

assertContains(uxDoc, "Görünür metinlerde agreement yok.", "acceptance checklist includes agreement ban");
assertContains(uxDoc, "Görünür metinlerde driver GPS yok.", "acceptance checklist includes driver gps ban");
assertContains(uxDoc, "Görünür metinlerde fallback / stale / sourceVisibility / officialSource / payload / debug teknik dili yok.", "acceptance checklist includes technical bans");
assertContains(uxDoc, "Kullanıcı kodu dili korunuyor.", "acceptance checklist keeps user code");
assertContains(uxDoc, "PIN veya şifre dili korunuyor.", "acceptance checklist keeps pin or password");
assertContains(uxDoc, "Veli kodu + PIN dili korunuyor.", "acceptance checklist keeps veli code plus pin");
assertContains(uxDoc, "Sözleşme dili korunuyor.", "acceptance checklist keeps sözleşme");
assertContains(uxDoc, "Sürücünün telefon GPS’i dili korunuyor.", "acceptance checklist keeps driver phone gps");
assertContains(uxDoc, "Hata mesajları sade Türkçe.", "acceptance checklist keeps plain Turkish errors");
assertContains(uxDoc, "Kullanıcıya raw token / hash / payload gösterilmiyor.", "acceptance checklist hides raw secrets");

assertContains(primer, "M99-UX-01", "primer exposes M99-UX-01 visibility");
assertContains(primer, "görünür Türkçe metin hijyeni", "primer describes M99-UX-01");

assertContains(registry, "M99-UX-01 - görünür türkçe metin hijyeni / teknik terim taraması - active", "registry exposes M99-UX-01 visibility");

assertContains(guide, "node backend\\scripts\\m99_ux_01_visible_text_hygiene_check.js", "script guide references check:m99ux01");
assertContains(guide, "M99-UX-01 — görünür Türkçe metin hijyeni / teknik terim taraması [CHECK]", "script guide has M99-UX-01 section");

assertContains(mobilePkg, '"check:m1": "npm run check:m48', "mobile package keeps check:m1");
assertContains(mobilePkg, '"check:m98e1": "node scripts/m98_e1_mobile_force_password_change_check.js"', "mobile package keeps check:m98e1");
assertContains(mobilePkg, '"check:m98e2d": "node scripts/m98_e2d_mobile_code_pin_login_check.js"', "mobile package keeps check:m98e2d");

assertContains(loginScreen, 'Kullanıcı kodu', "login screen keeps user code label");
assertContains(loginScreen, 'PIN veya şifre', "login screen keeps pin or password label");
assertContains(driverText, "Sürücünün telefon GPS'i", "driver text keeps driver phone GPS");
assertContains(roleSurface, 'Bugünkü servis', "role surface keeps personel today service");
assertContains(roleSurface, 'Öğrencimin servisi', "role surface keeps parent student service");
assertContains(roleSurface, 'Web panelden devam edin', "role surface keeps web panel guidance");
assertContains(brandMark, '../config/brand.js', "brand mark keeps central brand import");
assertContains(gpsSource, "Sürücünün telefon GPS'i", "web gps source keeps driver phone gps marker");
assertContains(gpsVisibility, 'gpsSourceVisibilityTextFromVehicle', "web gps visibility helper remains present");
assertContains(mapView, 'gpsSourceVisibilityTextFromVehicle', "map view keeps gps visibility helper usage");

assertContains(kvkkDoc, "M99-KVKK-01", "existing KVKK plain text document remains present");

console.log("=== M99-UX-01 VISIBLE TURKISH TEXT HYGIENE CHECK PASS ===");
