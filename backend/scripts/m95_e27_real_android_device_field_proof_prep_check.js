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

function mustAny(text, needles, message) {
  const normalized = normalize(text);
  if (!needles.some((needle) => normalized.includes(normalize(needle)))) {
    throw new Error(`FAIL ${message}`);
  }
  console.log(`OK ${message}`);
}

function isShareableExportMode() {
  return process.env.SHAREABLE_EXPORT_MODE === "1" || !fs.existsSync(path.join(repoRoot, ".git"));
}

function checkRuntimeArtifact(relPath) {
  const absPath = path.join(repoRoot, relPath);
  if (fs.existsSync(absPath)) {
    console.log(`OK runtime artifact remains present: ${relPath}`);
    return;
  }

  if (isShareableExportMode()) {
    console.log(`INFO runtime JSON export paketinde beklenmez: ${relPath}`);
    return;
  }

  throw new Error(`FAIL runtime artifact missing: ${relPath}`);
}

console.log("=== M95-E27 REAL ANDROID DEVICE FIELD PROOF PREP CHECK ===");

const rootPkg = read("package.json");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const doc = read("docs/M95_E27_GERCEK_ANDROID_CIHAZ_SAHA_PROOF_HAZIRLIK.md");
const mobilePkg = read("mobile/package.json");
const mobileEas = read("mobile/eas.json");
const mobileRelease = read("mobile/src/lib/release.js");
const mobileApi = read("mobile/src/lib/api.js");

must(rootPkg, '"check:m95e27": "node backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js"', "root package exposes check:m95e27");
must(rootPkg, '"check:m95e25": "node backend/scripts/m95_e25_mobile_field_acceptance_check.js"', "root package keeps check:m95e25");
must(rootPkg, '"check:m95e26": "node backend/scripts/m95_e26_android_emulator_smoke_plan_check.js"', "root package keeps check:m95e26");

mustExist("docs/M95_E27_GERCEK_ANDROID_CIHAZ_SAHA_PROOF_HAZIRLIK.md", "real device proof prep document exists");
must(doc, "Gerçek Android cihaz saha proof öncesi hazırlığı netleştirmek.", "doc has purpose");
must(doc, "10.0.2.2 sadece emulator içindir", "doc says 10.0.2.2 is emulator only");
must(doc, "local ağ IP", "doc mentions local network IP");
must(doc, "güvenli HTTPS", "doc mentions secure HTTPS");
must(doc, "Kullanıcı kodu", "doc mentions user code");
must(doc, "PIN veya şifre", "doc mentions pin or password");
must(doc, "İlk şifre değiştirme", "doc mentions first password change");
must(doc, "Sürücünün telefon GPS’i", "doc mentions driver phone GPS");
must(doc, "ekran kapalı", "doc mentions screen off");
must(doc, "arka plan", "doc mentions background");
must(doc, "pil optimizasyonu", "doc mentions battery optimization");
must(doc, "Bugünkü servis", "doc mentions today service");
must(doc, "Öğrencimin servisi", "doc mentions student service");
must(doc, "Web panelden devam edin", "doc mentions web panel guidance");
must(doc, "Kabul edildi / Eksik / Tekrar kontrol", "doc mentions acceptance states");

for (const command of [
  "npm --prefix mobile run check:m1",
  "npm --prefix mobile run check:m98e1",
  "npm --prefix mobile run check:m98e2d",
  "npm run check:m95e25",
  "npm run check:m95e26",
  "npm run check:m95e27",
  "npm run verify:final",
]) {
  must(doc, command, "doc includes acceptance command");
}

must(primer, "M95-E27", "primer exposes M95-E27 visibility");
must(primer, "Gerçek Android cihaz saha proof hazırlığı active", "primer describes M95-E27");

must(registry, "M95-E27 - gerçek Android cihaz saha proof hazırlığı - active", "registry exposes M95-E27 visibility");
must(registry, "node backend/scripts/m95_e27_real_android_device_field_proof_prep_check.js", "registry has M95-E27 command");

must(guide, "node backend\\scripts\\m95_e27_real_android_device_field_proof_prep_check.js", "script guide references check:m95e27");
must(guide, "M95-E27 — Gerçek Android cihaz saha proof hazırlığı [CHECK]", "script guide has M95-E27 section");

must(mobilePkg, '"check:m1": "npm run check:m48', "mobile package keeps check:m1");
must(mobilePkg, '"check:m98e1": "node scripts/m98_e1_mobile_force_password_change_check.js"', "mobile package keeps check:m98e1");
must(mobilePkg, '"check:m98e2d": "node scripts/m98_e2d_mobile_code_pin_login_check.js"', "mobile package keeps check:m98e2d");
mustAny(mobilePkg, [
  '"check:m95e2": "node scripts/m95_e2_android_local_api_profile_check.js"',
], "mobile package keeps check:m95e2");
mustAny(mobilePkg, [
  '"check:m95e6": "node scripts/m95_e6_api_base_join_check.js"',
], "mobile package keeps check:m95e6");

mustAny(mobileEas, [
  '"preview-internal"',
  '"production"',
], "mobile eas keeps preview-internal or production profile visibility");
must(mobileRelease, "production", "release guard keeps production HTTPS branch");
must(mobileRelease, "preview-internal", "release guard keeps preview-internal stage");
must(mobileRelease, "HTTPS", "release guard keeps HTTPS requirement");
must(mobileApi, "new URL(normalizedPath, baseUrl).toString()", "api helper uses URL join");
must(mobileApi, "API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`", "api helper keeps safe base slash join");
must(mobileApi, "replace(/\\/$/, '')", "api helper strips trailing slash");

const runtimeArtifacts = [
  "backend/artifacts/runtime-data/password-change-requirements.json",
  "backend/artifacts/runtime-data/username-directory.json",
];
for (const relPath of runtimeArtifacts) {
  checkRuntimeArtifact(relPath);
}

console.log("=== M95-E27 REAL ANDROID DEVICE FIELD PROOF PREP CHECK PASS ===");
