import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL ${message}`);
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

function assertContains(text, needle, label) {
  assert(text.includes(needle), `${label}: ${needle}`);
}

function main() {
  console.log("=== M95-E25 MOBILE FIELD ACCEPTANCE CHECK ===");

  const checklist = read("docs/M95_E25_MOBIL_SAHA_KABUL_CHECKLIST.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const rootPkg = read("package.json");
  const mobilePkg = read("mobile/package.json");

  assert(fs.existsSync(path.join(repoRoot, "docs/M95_E25_MOBIL_SAHA_KABUL_CHECKLIST.md")), "checklist document exists");

  assertContains(checklist, "Kullanıcı kodu", "checklist mentions user code");
  assertContains(checklist, "PIN veya şifre", "checklist mentions pin or password");
  assertContains(checklist, "İlk şifre değiştirme ekranı", "checklist mentions first password screen");
  assertContains(checklist, "Sürücünün telefon GPS’i", "checklist mentions driver phone GPS");
  assertContains(checklist, "Bugünkü servis", "checklist mentions today service");
  assertContains(checklist, "Öğrencimin servisi", "checklist mentions student service");
  assertContains(checklist, "Web panelden devam edin", "checklist mentions web panel guidance");
  assertContains(checklist, "check:web-mobile", "checklist mentions web mobile check");
  assertContains(checklist, "Kabul edildi / Eksik / Tekrar kontrol", "checklist mentions acceptance states");

  for (const command of [
    "npm --prefix mobile run check:m1",
    "npm --prefix mobile run check:m98e1",
    "npm --prefix mobile run check:m98e2d",
    "npm run check:web-mobile",
    "npm run check:m98e5",
    "npm run check:m95e25",
    "npm run verify:final",
  ]) {
    assertContains(checklist, command, "checklist includes command");
  }

  assertContains(primer, "M95-E25", "primer exposes M95-E25 visibility");
  assertContains(primer, "mobil saha kabul checklist’i", "primer describes M95-E25 checklist");

  assertContains(registry, "M95-E25 - mobil saha kabul checklist’i - active", "registry exposes M95-E25 visibility");

  assertContains(guide, "node backend\\scripts\\m95_e25_mobile_field_acceptance_check.js", "script guide references check:m95e25");
  assertContains(guide, "M95-E25 — mobil saha kabul checklist’i [CHECK]", "script guide has M95-E25 section");

  assertContains(rootPkg, '"check:m95e25": "node backend/scripts/m95_e25_mobile_field_acceptance_check.js"', "package.json exposes check:m95e25");
  assertContains(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
  assertContains(rootPkg, '"check:m98e5": "node backend/scripts/m98_e5_code_pin_manual_acceptance_check.js"', "root package keeps check:m98e5");

  assertContains(mobilePkg, '"check:m1": "npm run check:m48', "mobile package keeps check:m1");
  assertContains(mobilePkg, '"check:m98e1": "node scripts/m98_e1_mobile_force_password_change_check.js"', "mobile package keeps check:m98e1");
  assertContains(mobilePkg, '"check:m98e2d": "node scripts/m98_e2d_mobile_code_pin_login_check.js"', "mobile package keeps check:m98e2d");

  const forbiddenWrites = [
    "backend/artifacts/runtime-data/password-change-requirements.json",
    "backend/artifacts/runtime-data/username-directory.json",
  ];
  for (const rel of forbiddenWrites) {
    checkRuntimeArtifact(rel);
  }

  console.log("=== M95-E25 MOBILE FIELD ACCEPTANCE CHECK PASS ===");
}

main();
