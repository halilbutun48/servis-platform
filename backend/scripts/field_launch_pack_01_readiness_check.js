import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
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

function mustAll(text, needles, labelPrefix) {
  for (const needle of needles) {
    must(text, needle, `${labelPrefix}: ${needle}`);
  }
}

console.log("=== FIELD-LAUNCH-PACK-01 READINESS CHECK ===");

const runbook = read("docs/FIELD_LAUNCH_PACK_01_RUNBOOK.md");
const evidence = read("docs/FIELD_LAUNCH_PACK_01_EVIDENCE_TEMPLATE.md");
const rollback = read("docs/FIELD_LAUNCH_PACK_01_ROLLBACK_NO_GO.md");
const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");

must(pkg, '"check:fieldlaunch01": "node backend/scripts/field_launch_pack_01_readiness_check.js"', "package.json exposes check:fieldlaunch01");
must(runbook, "E2E-SMOKE-01", "runbook references E2E-SMOKE-01");
must(runbook, "COP-03C-FIX-02", "runbook references COP-03C-FIX-02");
must(runbook, "Invoke-RestMethod http://127.0.0.1:3000/health", "runbook has backend health command");
mustAll(runbook, [
  "git status --short",
  "git log -1 --oneline",
  "git tag --points-at HEAD",
  "backend/src",
  "web/src",
  "mobile/src",
  "prisma/migrations",
  "Aktif ödeme yok",
  "readonly hakediş",
  "KVKK",
  "Araç GPS’i",
  "Sürücünün telefon GPS’i",
  "GPS bekleniyor",
  "GPS eski",
], "runbook coverage");

mustAll(evidence, [
  "Bu vardiya neden başlayamıyor?",
  "Bu araç neden haritada görünmüyor?",
  "Bu hakediş neden hazır değil?",
  "Bu sözleşmeden bugün vardiya üretildi mi?",
  "Operasyon Sağlığı: sorun ne?",
  "PASS / FAIL / BLOCKED / NOT_TESTED",
  "Mobil gerçek cihaz kanıtı",
  "GPS Kanıtı",
  "Hakediş readonly preview Kanıtı",
  "KVKK / Rol Boundary Kanıtı",
], "evidence coverage");

mustAll(rollback, [
  "dbOk",
  "backend health",
  "runtime-data",
  "Sürücünün telefon GPS’i",
  "Araç GPS’i",
  "Aktif ödeme yok",
  "settlement execute yok",
  "KVKK / rol boundary",
], "rollback coverage");

must(backlog, "FIELD-LAUNCH-PACK-01", "backlog keeps FIELD-LAUNCH-PACK-01 visible");
must(backlog, "E2E-SMOKE-01", "backlog keeps E2E-SMOKE-01 visible");
must(registry, "FIELD-LAUNCH-PACK-01", "registry keeps FIELD-LAUNCH-PACK-01 visible");
must(registry, "M95-E27", "registry keeps M95-E27 visible");
must(guide, "check:fieldlaunch01", "script guide exposes check:fieldlaunch01");
must(guide, "FIELD-LAUNCH-PACK-01 — saha/pilot öncesi launch hazırlık paketi", "script guide exposes field launch section");
must(guide, "check:e2esmoke01", "script guide keeps E2E-SMOKE-01 alias visible");
must(guide, "E2E-SMOKE-01 — demo acceptance pack", "script guide keeps E2E-SMOKE-01 section");
must(runner, "check:fieldlaunch01", "product extensions runner includes fieldlaunch01");
must(verify, "check:fieldlaunch01", "verify chain includes fieldlaunch01");

console.log("=== FIELD-LAUNCH-PACK-01 READINESS CHECK PASS ===");

