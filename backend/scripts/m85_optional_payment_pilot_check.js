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
const route = read("backend/src/routes/commercialCore.js");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const readonlySummary = read("web/src/components/CommercialReadonlySummary.jsx");
const backendPkg = read("backend/package.json");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const runbook = read("docs/RUNBOOK_M85_OPTIONAL_PAYMENT_PILOT.md");

mustInclude(service, "buildOptionalPaymentPilotStatus", "payment backbone service exposes optional pilot status builder");
mustInclude(service, "listOptionalPaymentPilotCandidates", "payment backbone service exposes optional pilot candidate list");
mustInclude(service, "activateOptionalPaymentPilot", "payment backbone service exposes pilot activation");
mustInclude(service, "deactivateOptionalPaymentPilot", "payment backbone service exposes pilot deactivation");
mustInclude(route, "/payment-backbone/pilot/status", "commercial core route exposes pilot status endpoint");
mustInclude(route, "/payment-backbone/pilot/candidates", "commercial core route exposes pilot candidate endpoint");
mustInclude(route, "/payment-backbone/pilot/activate", "commercial core route exposes pilot activate endpoint");
mustInclude(route, "/payment-backbone/pilot/deactivate", "commercial core route exposes pilot deactivate endpoint");
mustInclude(panel, "M85 opsiyonel ödeme pilotu", "commercial core panel renders M85 section");
mustInclude(panel, "Opsiyonel ödeme pilot listesi", "commercial core panel renders pilot list");
mustInclude(panel, "Pilot READY yap", "commercial core panel renders pilot activate action");
mustInclude(readonlySummary, "Opsiyonel ödeme pilotu", "readonly summary renders optional pilot hint");
mustInclude(backendPkg, '"m85check": "node scripts/m85_optional_payment_pilot_check.js"', "backend package exposes m85check script");
mustInclude(toolsReadme, "pack_m85_optional_payment_pilot.ps1", "tools readme lists M85 pack");
mustMentionMilestone(toolsPrimer, "M85", ["opsiyonel odeme pilotu", "odeme opsiyonel pilot", "optional payment pilot", "m85check"], "tools primer lists M85");
mustInclude(backlog, "M85", "next backlog lists M85");
mustMentionMilestone(primer, "M85", ["opsiyonel odeme pilotu", "odeme opsiyonel pilot", "optional payment pilot"], "primer lists M85");
mustInclude(registry, "M85", "registry lists M85");
mustInclude(runbook, "m85check", "runbook references m85check");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M85 optional payment pilot check passed");
