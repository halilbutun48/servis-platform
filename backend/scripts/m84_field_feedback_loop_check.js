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

const service = read("backend/src/ops/fieldFeedbackLoop.js");
const route = read("backend/src/routes/pilotLaunchGate.js");
const panel = read("web/src/panels/superadmin/PilotLaunchGatePanel.jsx");
const backendPkg = read("backend/package.json");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const runbook = read("docs/RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md");

mustInclude(service, "FIELD_FEEDBACK_STATUSES", "field feedback service exposes statuses");
mustInclude(service, "buildFieldFeedbackLoopPacket", "field feedback service exposes packet builder");
mustInclude(service, "updateFieldFeedbackRecordStatus", "field feedback service exposes status updater");
mustInclude(route, "/field-feedback-loop", "pilot launch gate route exposes field feedback loop endpoint");
mustInclude(route, "/field-feedback-loop/records/:id/status", "pilot launch gate route exposes field feedback status endpoint");
mustInclude(panel, "Saha gözlem / geri bildirim döngüsü", "pilot launch gate panel renders M84 feedback section");
mustInclude(panel, "Durum akışı", "pilot launch gate panel renders status flow summary");
mustInclude(panel, "Yeni saha geri bildirimi ekle", "pilot launch gate panel renders create form");
mustInclude(backendPkg, '"m84check": "node scripts/m84_field_feedback_loop_check.js"', "backend package exposes m84check script");
mustInclude(toolsReadme, "pack_m84_field_feedback_loop.ps1", "tools readme lists M84 pack");
mustMentionMilestone(toolsPrimer, "M84", ["saha gozlem / geri bildirim dongusu", "saha geri bildirim dongusu", "field feedback loop", "m84check"], "tools primer lists M84");
mustMentionMilestone(backlog, "M84", ["saha gozlem / geri bildirim dongusu", "saha geri bildirim dongusu", "field feedback loop"], "next backlog lists M84");
mustMentionMilestone(primer, "M84", ["saha gozlem / geri bildirim dongusu", "saha geri bildirim dongusu", "field feedback loop"], "primer lists M84");
mustInclude(runbook, "m84check", "runbook references m84check");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M84 saha gözlem / geri bildirim döngüsü check passed");
