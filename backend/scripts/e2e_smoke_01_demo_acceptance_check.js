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

function ordered(text, needles, label) {
  let last = -1;
  const norm = normalize(text);
  for (const needle of needles) {
    const idx = norm.indexOf(normalize(needle));
    if (idx < 0) throw new Error(`FAIL ${label}: missing ${needle}`);
    if (idx <= last) throw new Error(`FAIL ${label}: wrong order for ${needle}`);
    last = idx;
  }
  console.log(`OK ${label}`);
}

console.log("=== E2E-SMOKE-01 DEMO ACCEPTANCE CHECK ===");

const doc = read("docs/E2E_SMOKE_01_DEMO_ACCEPTANCE.md");
const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");

must(pkg, '"check:e2esmoke01": "node backend/scripts/e2e_smoke_01_demo_acceptance_check.js"', "package.json exposes check:e2esmoke01");

mustAll(doc, [
  "DEMO Firma",
  "DEMO Oda",
  "DEMO Araç",
  "DEMO Sürücü",
  "DEMO Personel",
  "DEMO sözleşme",
  "sözleşmeden üretilmiş en az 1 vardiya",
  "Bu vardiya neden başlayamıyor?",
  "Bu araç neden haritada görünmüyor?",
  "Bu hakediş neden hazır değil?",
  "Bu sözleşmeden bugün vardiya üretildi mi?",
  "Operasyon Sağlığı: sorun ne?",
  "readonly hakediş önizlemesi",
  "aktif ödeme yok",
  "settlement execute yok",
  "Sürücünün telefon GPS’i",
  "PASS / FAIL / BLOCKED / NOT_TESTED",
  "backend/src, web/src, mobile/src, prisma/migrations",
  "runtime davranışını değiştirmez",
  "otomatik seed çalıştırmaz",
], "doc coverage");

must(doc, "backend/artifacts/runtime-data", "doc keeps runtime-data out of scope");
must(doc, "docs/NEXT_BACKLOG_V1.md", "doc mentions backlog visibility");
must(backlog, "E2E-SMOKE-01", "backlog keeps E2E-SMOKE-01 visible");
must(backlog, "P1:", "backlog keeps P1 section");

must(guide, "check:e2esmoke01", "script guide exposes check:e2esmoke01");
must(guide, "E2E-SMOKE-01 — demo acceptance pack", "script guide exposes E2E-SMOKE-01 section");

ordered(runner, [
  "check:docsstate01",
  "check:e2esmoke01",
  "check:cop03cfix02",
], "product extensions runner order");

must(verify, "check:e2esmoke01", "verify chain includes e2esmoke01");
must(runner, "check:e2esmoke01", "runner includes e2esmoke01");

console.log("=== E2E-SMOKE-01 DEMO ACCEPTANCE CHECK PASS ===");
