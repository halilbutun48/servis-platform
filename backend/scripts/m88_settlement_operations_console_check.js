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

function mustNotInclude(text, needle, label) {
  if (includesText(text, needle)) fail(label);
  else ok(label);
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
const runbook = read("docs/RUNBOOK_M88_SETTLEMENT_OPERATIONS_CONSOLE.md");

mustInclude(service, "buildSettlementOperationsStatus", "payment backbone service exposes settlement operations status builder");
mustInclude(service, "listSettlementOperationQueue", "payment backbone service exposes settlement operation queue builder");
mustInclude(service, "planSettlementEntries", "payment backbone service exposes settlement plan action");
mustInclude(service, "executeSettlementEntries", "payment backbone service exposes settlement execute action");
mustInclude(service, "cancelSettlementEntries", "payment backbone service exposes settlement cancel action");
mustInclude(route, "/payment-backbone/settlement/status", "commercial core route exposes settlement status endpoint");
mustInclude(route, "/payment-backbone/settlement/queue", "commercial core route exposes settlement queue endpoint");
mustInclude(route, "/payment-backbone/settlement/entries/plan", "commercial core route exposes settlement plan endpoint");
mustInclude(route, "/payment-backbone/settlement/entries/execute", "commercial core route exposes settlement execute endpoint");
mustInclude(route, "/payment-backbone/settlement/entries/cancel", "commercial core route exposes settlement cancel endpoint");
mustInclude(panel, "M88 settlement operasyon masası", "commercial core panel renders M88 section");
mustInclude(panel, "Settlement operasyon kuyruğu", "commercial core panel renders settlement queue");
mustNotInclude(panel, "EXECUTED yap", "commercial core panel does not expose settlement execute action");
mustInclude(backendPkg, '"m88check": "node scripts/m88_settlement_operations_console_check.js"', "backend package exposes m88check script");
mustInclude(toolsReadme, "pack_m88_settlement_operations_console.ps1", "tools readme lists M88 pack");
mustMentionMilestone(toolsPrimer, "M88", ["settlement operasyon masasi", "settlement operations console", "m88check"], "tools primer lists M88");
mustInclude(backlog, "M88", "next backlog lists M88");
mustMentionMilestone(primer, "M88", ["settlement operasyon masasi", "settlement operations console", "settlement"], "primer lists M88");
mustInclude(registry, "M88", "registry lists M88");
mustInclude(runbook, "m88check", "runbook references m88check");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M88 settlement operations console check passed");
