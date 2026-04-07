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


function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
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

const prepService = read("backend/src/ops/fieldPrepPacket.js");
const prepRoute = read("backend/src/routes/pilotLaunchGate.js");
const gatePanel = read("web/src/panels/superadmin/PilotLaunchGatePanel.jsx");
const backendPkg = read("backend/package.json");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const runbook = read("docs/RUNBOOK_M83_FIELD_PREP_PACKET.md");

mustInclude(prepService, "FIELD_PREP_OPERATOR_SEQUENCE", "field prep service exposes operator sequence");
mustInclude(prepService, "FIELD_PREP_TEST_SCENARIOS", "field prep service exposes test scenarios");
mustInclude(prepService, "buildFieldPrepPacket", "field prep service exposes packet builder");
mustInclude(prepRoute, "/field-prep-packet", "pilot launch gate route exposes field prep packet endpoint");
mustInclude(gatePanel, "Canlı ortam ve release kontrolleri", "pilot launch gate panel renders env controls section");
mustInclude(gatePanel, "Gerçek saha senaryoları", "pilot launch gate panel renders real field scenarios");
mustInclude(gatePanel, "Rol ve cihaz checklisti", "pilot launch gate panel renders role-device checklist");
mustInclude(backendPkg, '"m83check": "node scripts/m83_field_prep_packet_check.js"', "backend package exposes m83check script");
mustInclude(toolsReadme, "pack_m83_field_prep_packet.ps1", "tools readme lists M83 pack");
mustMentionMilestone(toolsPrimer, "M83", ["saha hazirlik paketi", "field prep packet", "m83check"], "tools primer lists M83");
mustMentionMilestone(backlog, "M83", ["saha hazirlik paketi", "field prep packet"], "next backlog lists M83");
mustMentionMilestone(primer, "M83", ["saha hazirlik paketi", "field prep packet"], "primer lists M83");
mustInclude(runbook, "m83check", "runbook references m83check");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M83 saha hazırlık paketi check passed");
