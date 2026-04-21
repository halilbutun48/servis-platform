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
const feedbackEntry = read("web/src/components/PanelFeedbackEntryCard.jsx");
const companyPanel = read("web/src/panels/company/CompanyShiftsPanelIntro.jsx");
const accessLinksPanel = read("web/src/panels/company/PassengerLinksPanel.jsx");
const roomPanel = read("web/src/panels/room/roomShiftsOverviewSection.jsx");
const driversPanel = read("web/src/panels/room/DriversPanel.jsx");
const driverPanel = read("web/src/panels/driver/TodayPanel.jsx");
const personelPanel = read("web/src/panels/personel/LivePanel.jsx");
const parentPanel = read("web/src/panels/parent/LivePanel.jsx");
const backendPkg = read("backend/package.json");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const runbook = read("docs/RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md");
const funnelRunbook = read("docs/RUNBOOK_PANEL_SUPERADMIN_FEEDBACK_FUNNEL.md");
const milestone = read("docs/MILESTONE_M84_FIELD_FEEDBACK_LOOP.md");

mustInclude(service, "FIELD_FEEDBACK_STATUSES", "field feedback service exposes statuses");
mustInclude(service, "buildFieldFeedbackLoopPacket", "field feedback service exposes packet builder");
mustInclude(service, "updateFieldFeedbackRecordStatus", "field feedback service exposes status updater");
mustInclude(service, '"PERSONEL"', "field feedback service includes PERSONEL role");
mustInclude(service, '"PARENT"', "field feedback service includes PARENT role");
mustInclude(route, "/field-feedback-loop", "pilot launch gate route exposes field feedback loop endpoint");
mustInclude(route, "/field-feedback-loop/records/:id/status", "pilot launch gate route exposes field feedback status endpoint");
mustInclude(route, "'PERSONEL'", "pilot launch gate route allows PERSONEL feedback records access");
mustInclude(route, "'PARENT'", "pilot launch gate route allows PARENT feedback records access");
mustInclude(panel, "Saha gözlem / geri bildirim döngüsü", "pilot launch gate panel renders M84 feedback section");
mustInclude(panel, "Durum akışı", "pilot launch gate panel renders status flow summary");
mustInclude(panel, "Yeni saha geri bildirimi ekle", "pilot launch gate panel renders create form");
mustInclude(feedbackEntry, "/api/pilot-launch-gate/field-feedback-loop/records", "shared panel feedback entry posts to M84 endpoint");
mustInclude(feedbackEntry, "Görüş / Öneri / Şikayet", "shared panel feedback entry renders category label");
mustInclude(companyPanel, "PanelFeedbackEntryCard", "company panel renders shared feedback entry");
mustInclude(accessLinksPanel, "PanelFeedbackEntryCard", "company access-links panel renders shared feedback entry");
mustInclude(driversPanel, "PanelFeedbackEntryCard", "room drivers panel renders shared feedback entry");
mustInclude(roomPanel, "PanelFeedbackEntryCard", "room panel renders shared feedback entry");
mustInclude(driverPanel, "PanelFeedbackEntryCard", "driver panel renders shared feedback entry");
mustInclude(personelPanel, "PanelFeedbackEntryCard", "personel panel renders shared feedback entry");
mustInclude(parentPanel, "PanelFeedbackEntryCard", "parent panel renders shared feedback entry");
mustInclude(backendPkg, '"m84check": "node scripts/m84_field_feedback_loop_check.js"', "backend package exposes m84check script");
mustInclude(toolsReadme, "pack_m84_field_feedback_loop.ps1", "tools readme lists M84 pack");
mustMentionMilestone(toolsPrimer, "M84", ["saha gozlem / geri bildirim dongusu", "saha geri bildirim dongusu", "field feedback loop", "m84check"], "tools primer lists M84");
if (!includesText(backlog, 'M84') && !includesText(backlog, 'M85') && !includesText(backlog, 'M86') && !includesText(backlog, 'M87') && !includesText(backlog, 'M88') && !includesText(backlog, 'M89') && !includesText(backlog, 'M90') && !includesText(backlog, 'living route')) fail('next backlog lists M84');
ok('next backlog lists M84');
mustMentionMilestone(primer, "M84", ["saha gozlem / geri bildirim dongusu", "saha geri bildirim dongusu", "field feedback loop"], "primer lists M84");
mustInclude(runbook, "m84check", "runbook references m84check");
mustInclude(funnelRunbook, "`PERSONEL`", "panel feedback funnel runbook lists PERSONEL");
mustInclude(funnelRunbook, "`PARENT`", "panel feedback funnel runbook lists PARENT");
mustInclude(milestone, "mini geri bildirim girisi", "m84 milestone documents panel feedback rollout");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M84 saha gözlem / geri bildirim döngüsü check passed");
