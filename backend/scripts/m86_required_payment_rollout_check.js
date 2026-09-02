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
const readonlySummary = read("web/src/components/CommercialReadonlySummary.jsx");
const backendPkg = read("backend/package.json");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const runbook = read("docs/RUNBOOK_M86_REQUIRED_PAYMENT_ROLLOUT.md");

mustInclude(service, "buildRequiredPaymentRolloutStatus", "payment backbone service exposes required rollout status builder");
mustInclude(service, "listRequiredPaymentRolloutCandidates", "payment backbone service exposes required rollout candidate list");
mustInclude(service, "activateRequiredPaymentRollout", "payment backbone service exposes required rollout activation");
mustInclude(service, "deactivateRequiredPaymentRollout", "payment backbone service exposes required rollout deactivation");
mustInclude(route, "/payment-backbone/required/status", "commercial core route exposes required rollout status endpoint");
mustInclude(route, "/payment-backbone/required/candidates", "commercial core route exposes required rollout candidate endpoint");
mustInclude(route, "/payment-backbone/required/activate", "commercial core route exposes required rollout activate endpoint");
mustInclude(route, "/payment-backbone/required/deactivate", "commercial core route exposes required rollout deactivate endpoint");
mustInclude(panel, "Zorunlu ödeme geçişi", "commercial core panel renders M86 section");
mustInclude(panel, "Zorunlu ödeme rollout listesi", "commercial core panel renders required rollout list");
mustInclude(panel, "Etkinleştir", "commercial core panel renders required rollout activate action");
mustInclude(readonlySummary, "Zorunlu ödeme geçişi", "readonly summary renders required rollout hint");
mustInclude(backendPkg, '"m86check": "node scripts/m86_required_payment_rollout_check.js"', "backend package exposes m86check script");
mustInclude(toolsReadme, "pack_m86_required_payment_rollout.ps1", "tools readme lists M86 pack");
mustMentionMilestone(toolsPrimer, "M86", ["zorunlu odeme rollout", "required payment rollout", "m86check"], "tools primer lists M86");
mustInclude(backlog, "M86", "next backlog lists M86");
mustMentionMilestone(primer, "M86", ["zorunlu odeme rollout", "required payment rollout", "payment"], "primer lists M86");
mustInclude(registry, "M86", "registry lists M86");
mustInclude(runbook, "m86check", "runbook references m86check");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M86 required payment rollout check passed");
