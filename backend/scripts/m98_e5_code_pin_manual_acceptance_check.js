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

function assertContains(text, needle, label) {
  assert(text.includes(needle), `${label}: ${needle}`);
}

function main() {
  console.log("=== M98-E5 CODE PIN MANUAL ACCEPTANCE CHECK ===");

  const checklist = read("docs/M98_E5_KOD_PIN_GERCEK_KULLANICI_KABUL_CHECKLIST.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const pkg = read("package.json");

  assert(fs.existsSync(path.join(repoRoot, "docs/M98_E5_KOD_PIN_GERCEK_KULLANICI_KABUL_CHECKLIST.md")), "checklist document exists");

  assertContains(checklist, "Kullanıcı kodu", "checklist mentions user code");
  assertContains(checklist, "Geçici PIN", "checklist mentions temp PIN");
  assertContains(checklist, "PIN veya şifre", "checklist mentions pin or password");
  assertContains(checklist, "İlk şifreni değiştir", "checklist mentions first password change");
  assertContains(checklist, "Veli kodu + PIN", "checklist mentions veli code plus pin");
  assertContains(checklist, "PassengerLiveLink", "checklist mentions PassengerLiveLink");
  assertContains(checklist, "Kabul edildi / Eksik / Tekrar kontrol", "checklist mentions acceptance result states");

  for (const command of [
    "npm run check:m98e2e",
    "npm run check:m98e3",
    "npm run smoke:m98e4",
    "npm run check:m98e4b",
    "npm run check:m98e4c",
    "npm run check:m98e5",
    "npm run verify:final",
  ]) {
    assertContains(checklist, command, `checklist includes command`);
  }

  assertContains(primer, "M98-E5", "primer exposes M98-E5 visibility");
  assertContains(primer, "gerçek kullanıcı kabul checklist", "primer describes M98-E5 checklist");

  assertContains(registry, "M98-E5 - code + PIN gerçek kullanıcı kabul checklist’i - active", "registry exposes M98-E5 visibility");

  assertContains(guide, "node backend\\scripts\\m98_e5_code_pin_manual_acceptance_check.js", "script guide references check:m98e5");
  assertContains(guide, "M98-E5 — kod + PIN gerçek kullanıcı kabul checklist’i [CHECK]", "script guide has M98-E5 section");

  assertContains(pkg, '"check:m98e5": "node backend/scripts/m98_e5_code_pin_manual_acceptance_check.js"', "package.json exposes check:m98e5");
  assertContains(pkg, '"check:m98e4b": "node backend/scripts/m98_e4b_personel_invite_router_mount_check.js"', "package.json keeps check:m98e4b");
  assertContains(pkg, '"check:m98e4c": "node backend/scripts/m98_e4c_route_mount_compat_check.js"', "package.json keeps check:m98e4c");
  assertContains(pkg, '"smoke:m98e4": "node backend/scripts/m98_e4_code_pin_runtime_smoke.js"', "package.json keeps smoke:m98e4");

  console.log("=== M98-E5 CODE PIN MANUAL ACCEPTANCE CHECK PASS ===");
}

main();
