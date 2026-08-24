import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function mustInclude(text, needle, label) {
  if (includesText(text, needle)) ok(label);
  else fail(label);
}

function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}

function normalizeText(value) {
  return String(value || "")
    .replace(/[İI]/g, "i")
    .replace(/ı/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[—–]/g, "-")
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function mustMentionMilestone(text, milestone, descriptors, label) {
  const normalized = normalizeText(text);
  if (!normalized.includes(normalizeText(milestone))) {
    fail(label);
    return;
  }
  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    ok(label);
    return;
  }
  if (descriptors.some((d) => normalized.includes(normalizeText(d)))) ok(label);
  else fail(label);
}

const service = read("backend/src/services/paymentBackbone.js");
const route = read("backend/src/routes/commercialCorePaymentRoutes.js");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const backendPkg = read("backend/package.json");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const runbook = read("docs/RUNBOOK_M87_PAYMENT_ACCOUNT_READINESS.md");

mustInclude(service, "buildPaymentAccountReadinessStatus", "payment backbone service exposes payment account readiness status builder");
mustInclude(service, "listPaymentAccountReadinessCandidates", "payment backbone service exposes payment account readiness candidate list");
mustInclude(service, "upsertPaymentAccountMetadata", "payment backbone service exposes payment account metadata upsert");
mustInclude(route, "/payment-backbone/accounts/status", "commercial core route exposes payment account readiness status endpoint");
mustInclude(route, "/payment-backbone/accounts/candidates", "commercial core route exposes payment account readiness candidate endpoint");
mustInclude(route, "/payment-backbone/accounts/upsert", "commercial core route exposes payment account metadata upsert endpoint");
mustInclude(panel, "M87 ödeme hesabı hazırlığı", "commercial core panel renders M87 section");
mustInclude(panel, "Ödeme hesabı aday listesi", "commercial core panel renders payment account candidate list");
mustInclude(panel, "Hesap metadata kaydet", "commercial core panel renders payment account save action");
mustInclude(backendPkg, '"m87check": "node scripts/m87_payment_account_readiness_check.js"', "backend package exposes m87check script");
mustInclude(toolsReadme, "pack_m87_payment_account_readiness.ps1", "tools readme lists M87 pack");
mustMentionMilestone(toolsPrimer, "M87", ["odeme hesabi hazirligi", "payment account readiness", "m87check"], "tools primer lists M87");
mustInclude(backlog, "M87", "next backlog lists M87");
mustMentionMilestone(primer, "M87", ["odeme hesabi hazirligi", "payment account readiness", "hesap hazirligi"], "primer lists M87");
mustInclude(registry, "M87", "registry lists M87");
mustInclude(runbook, "m87check", "runbook references m87check");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M87 payment account readiness check passed");
