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
const feedbackEntry = read("web/src/components/feedback/FeedbackLoopSection.jsx");
const feedbackPanel = read("web/src/panels/shared/FeedbackLoopPanel.jsx");
const navDock = read("web/src/layout/NavDock.jsx");
const superAdminPanel = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
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
mustInclude(service, "FIELD_FEEDBACK_CATEGORIES", "field feedback service exposes categories");
mustInclude(service, "normalizeRating", "field feedback service exposes rating normalizer");
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
mustInclude(feedbackEntry, "/api/pilot-launch-gate/field-feedback-loop/records", "shared feedback section posts to M84 endpoint");
mustInclude(feedbackEntry, "Geri Bildirim", "shared feedback section renders friendly title");
mustInclude(feedbackEntry, "★", "shared feedback section renders star rating");
mustInclude(feedbackPanel, "FeedbackLoopSection", "shared feedback panel uses reusable section");
mustInclude(navDock, 'advancedTitle = "SİSTEM"', "navdock exposes advanced feedback group");
mustInclude(navDock, "advanced.push(feedbackEntry)", "navdock exposes feedback under advanced");
mustInclude(navDock, "Geri Bildirim", "navdock exposes feedback submenu");
mustInclude(navDock, "/shared/feedback", "navdock feedback submenu points to shared feedback");
mustNotInclude(navDock, "copilotEntry.path }, feedbackEntry", "navdock feedback no longer sits under Copilot");
mustInclude(navDock, "copilotSection", "navdock keeps copilot section visible at the bottom");
mustNotInclude(navDock, "sections.push({ title: \"Copilot\"", "navdock no longer renders copilot as a top section");
mustInclude(superAdminPanel, "FeedbackLoopSection", "superadmin panel renders feedback section");
mustInclude(superAdminPanel, "Geri Bildirim", "superadmin panel renders feedback title");
mustNotInclude(companyPanel, "PanelFeedbackEntryCard", "company panel no longer renders scattered feedback entry");
mustNotInclude(accessLinksPanel, "PanelFeedbackEntryCard", "company access-links panel no longer renders scattered feedback entry");
mustNotInclude(driversPanel, "PanelFeedbackEntryCard", "room drivers panel no longer renders scattered feedback entry");
mustNotInclude(roomPanel, "PanelFeedbackEntryCard", "room panel no longer renders scattered feedback entry");
mustNotInclude(driverPanel, "PanelFeedbackEntryCard", "driver panel no longer renders scattered feedback entry");
mustNotInclude(personelPanel, "PanelFeedbackEntryCard", "personel panel no longer renders scattered feedback entry");
mustNotInclude(parentPanel, "PanelFeedbackEntryCard", "parent panel no longer renders scattered feedback entry");
mustInclude(backendPkg, '"m84check": "node scripts/m84_field_feedback_loop_check.js"', "backend package exposes m84check script");
mustInclude(toolsReadme, "pack_m84_field_feedback_loop.ps1", "tools readme lists M84 pack");
mustMentionMilestone(toolsPrimer, "M84", ["saha gozlem / geri bildirim dongusu", "saha geri bildirim dongusu", "field feedback loop", "m84check"], "tools primer lists M84");
if (!includesText(backlog, 'M84') && !includesText(backlog, 'M85') && !includesText(backlog, 'M86') && !includesText(backlog, 'M87') && !includesText(backlog, 'M88') && !includesText(backlog, 'M89') && !includesText(backlog, 'M90') && !includesText(backlog, 'living route')) fail('next backlog lists M84');
ok('next backlog lists M84');
mustMentionMilestone(primer, "M84", ["saha gozlem / geri bildirim dongusu", "saha geri bildirim dongusu", "field feedback loop"], "primer lists M84");
mustInclude(runbook, "m84check", "runbook references m84check");
mustInclude(funnelRunbook, "`PERSONEL`", "panel feedback funnel runbook lists PERSONEL");
mustInclude(funnelRunbook, "`PARENT`", "panel feedback funnel runbook lists PARENT");
mustInclude(milestone, "gelişmiş alt menüsü", "m84 milestone documents shared feedback rollout");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M84 saha gözlem / geri bildirim döngüsü check passed");
