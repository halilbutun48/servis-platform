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
    .replace(/[’']/g, "'")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function must(text, needle, message) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${message}`);
  }
  console.log(`OK ${message}`);
}

function mustExist(relPath, message) {
  if (!exists(relPath)) {
    throw new Error(`FAIL ${message}`);
  }
  console.log(`OK ${message}`);
}

function mustAll(text, needles, label) {
  for (const needle of needles) {
    must(text, needle, label);
  }
}

console.log("=== M95-E26 ANDROID EMULATOR SMOKE PLAN CHECK ===");

const rootPkg = read("package.json");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const doc = read("docs/M95_E26_ANDROID_EMULATOR_SMOKE_PLANI.md");
const mobilePkg = read("mobile/package.json");
const mobileEas = read("mobile/eas.json");
const mobileRelease = read("mobile/src/lib/release.js");
const mobileApi = read("mobile/src/lib/api.js");

must(rootPkg, '"check:m95e26": "node backend/scripts/m95_e26_android_emulator_smoke_plan_check.js"', "root package exposes check:m95e26");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
must(rootPkg, '"check:m98e5": "node backend/scripts/m98_e5_code_pin_manual_acceptance_check.js"', "root package keeps check:m98e5");

mustExist("docs/M95_E26_ANDROID_EMULATOR_SMOKE_PLANI.md", "emulator smoke plan document exists");
must(doc, "Android emülatörde mobil uygulamanın temel saha akışlarını kanıtlamak.", "doc has purpose");
must(doc, "10.0.2.2:3000", "doc mentions emulator api base");
must(doc, "EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000", "doc mentions env api base");
must(doc, "local-emulator", "doc mentions local emulator stage");
must(doc, "local-apk", "doc mentions local apk profile");
must(doc, "Kullanıcı kodu", "doc mentions user code");
must(doc, "PIN veya şifre", "doc mentions pin or password");
must(doc, "İlk şifre değiştirme", "doc mentions first password change");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver phone GPS");
must(doc, "Bugünkü servis", "doc mentions today service");
must(doc, "Öğrencimin servisi", "doc mentions student service");
must(doc, "Web panelden devam edin", "doc mentions web panel guidance");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "doc mentions acceptance states");

mustAll(doc, [
  "npm --prefix mobile run check:m1",
  "npm --prefix mobile run check:m95e2",
  "npm --prefix mobile run check:m95e6",
  "npm --prefix mobile run check:m98e1",
  "npm --prefix mobile run check:m98e2d",
  "npm run check:m95e25",
  "npm run check:m95e26",
  "npm run verify:final",
], "doc includes acceptance command");

must(primer, "M95-E26", "primer exposes M95-E26 visibility");
must(primer, "Android emulator smoke planı active", "primer describes M95-E26");

must(registry, "M95-E26 - android emulator smoke planı - active", "registry exposes M95-E26 visibility");
must(registry, "node backend/scripts/m95_e26_android_emulator_smoke_plan_check.js", "registry has M95-E26 command");

must(guide, "node backend\\scripts\\m95_e26_android_emulator_smoke_plan_check.js", "script guide references check:m95e26");
must(guide, "M95-E26 — Android emulator smoke planı [CHECK]", "script guide has M95-E26 section");

must(mobilePkg, '"check:m1": "npm run check:m48', "mobile package keeps check:m1");
must(mobilePkg, '"check:m95e2": "node scripts/m95_e2_android_local_api_profile_check.js"', "mobile package keeps check:m95e2");
must(mobilePkg, '"check:m95e6": "node scripts/m95_e6_api_base_join_check.js"', "mobile package keeps check:m95e6");
must(mobilePkg, '"check:m98e1": "node scripts/m98_e1_mobile_force_password_change_check.js"', "mobile package keeps check:m98e1");
must(mobilePkg, '"check:m98e2d": "node scripts/m98_e2d_mobile_code_pin_login_check.js"', "mobile package keeps check:m98e2d");

must(mobileEas, '"local-apk"', "mobile eas keeps local-apk profile");
must(mobileEas, '"EXPO_PUBLIC_API_BASE_URL": "http://10.0.2.2:3000"', "mobile eas keeps emulator api base");
must(mobileEas, '"EXPO_PUBLIC_RELEASE_STAGE": "local-emulator"', "mobile eas keeps local-emulator stage");

must(mobileRelease, "local-emulator", "release guard keeps local-emulator stage");
must(mobileRelease, "10.0.2.2", "release guard keeps 10.0.2.2 host");
must(mobileRelease, "EXPO_PUBLIC_API_BASE_URL", "release guard reads api base env");

must(mobileApi, "new URL(normalizedPath, baseUrl).toString()", "api helper uses URL join");
must(mobileApi, "API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`", "api helper keeps safe base slash join");
must(mobileApi, "replace(/\\/$/, '')", "api helper strips trailing slash");

console.log("=== M95-E26 ANDROID EMULATOR SMOKE PLAN CHECK PASS ===");
