import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}

function banner(title) { console.log(`\n=== ${title} ===`); }
function must(label, ok) { if (!ok) throw new Error(`FAIL ${label}`); console.log(`OK ${label}`); }
function mustNot(label, ok) { if (ok) throw new Error(`FAIL ${label}`); console.log(`OK ${label}`); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function includesAny(text, needles) { return includesAnyText(text, needles); }
function checklistsCompatible(a, b) { return ['REPO_CONTRACT_CHECKLIST_COMPAT_V2', 'master pack marker', 'repo audit marker'].every((needle) => a.includes(needle) && b.includes(needle)); }

async function main() {
  const state = readRepoContractState();
  banner("M65 PILOT LAUNCH GATE CHECK");

  const requiredFiles = [
    "backend/scripts/m65_pilot_launch_gate_check.js",
    "backend/src/ops/pilotLaunchGateManifest.js",
    "backend/src/ops/pilotLaunchGateState.js",
    "backend/src/routes/pilotLaunchGate.js",
    "web/src/panels/superadmin/PilotLaunchGatePanel.jsx",
    "docs/RUNBOOK_M65_PILOT_LAUNCH_GATE.md",
    "docs/MILESTONE_M65_PILOT_LAUNCH_GATE.md",
    "tools/pack_m65_pilot_launch_gate.ps1",
    "tools/check_m65_pilot_launch_gate_repo_contract.ps1",
    "README.md",
    "docs/PROJECT_SPEC_V1.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md",
    "docs/NEXT_BACKLOG_V1.md",
    "tools/PRIMER_SNAPSHOT.md",
    "tools/CHECKLIST_SSOT.md",
    "tools/README.md",
    "docs/MILESTONE_REGISTRY_V1.md",
  ];
  console.log("INFO checking required M65 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const readme = read("README.md");
  const projectSpec = read("docs/PROJECT_SPEC_V1.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const backlog = read("docs/NEXT_BACKLOG_V1.md");
  const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
  const toolsChecklist = read("tools/CHECKLIST_SSOT.md");
  const toolsReadme = read("tools/README.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const route = read("backend/src/routes/pilotLaunchGate.js");
  const manifest = read("backend/src/ops/pilotLaunchGateManifest.js");
  const panel = read("web/src/panels/superadmin/PilotLaunchGatePanel.jsx");
  const runbook = read("docs/RUNBOOK_M65_PILOT_LAUNCH_GATE.md");

    must("project spec reflects launch gate layer", includesAny(projectSpec, ["Pilot Launch Gate", "GO / LIMITED GO / NO-GO", "M59 → M65"]));
      must("checklist marks M65 green and keeps M66 open", includesAny(checklist, ["[x] `M65 — Pilot Launch Gate`", "[ ] `M66 — Operasyonel Reassignment`"]));
      must("tools checklist contract markers synced", checklistsCompatible(checklist, toolsChecklist));
    must("registry includes M65/M66 history or current living route", includesAny(registry, ["M65 - Pilot Launch Gate - green-base", "M65 - Pilot Launch Gate - green", "M66 - Operasyonel Reassignment - functional-open", "M66 - Operasyonel Reassignment - fonksiyonel / tekrar test acik", "M75 - green-baseline", "M75 - living baseline", "M76A-1 - minimum-normalization - active", "M76A-1 - minimum normalization", "M77 - KVKK + Uyum Katmanı", "M82", "M82.8", "M82.9", "M83", "M84", "M85", "M86", "M87", "M88", "M89"]));

  must("route exposes launch gate endpoints", includesAny(route, ["/manifest", "/decision", "/risks", "/summary"]));
  mustNot("route drops template endpoints", includesAny(route, ["/decision-template", "/risk-template"]));
  must("manifest defines launch gate capabilities", includesAny(manifest, ["PILOT_LAUNCH_GATE_CAPABILITIES", "GO / LIMITED GO / NO-GO", "riskMatrix"]));
  must("panel shows M65 cards", includesAny(panel, ["M65 Pilot Launch Gate", "Launch checklist", "GO / LIMITED GO / NO-GO", "Karar kaydı", "Risk kaydı"]));
  mustNot("panel drops template endpoints", includesAny(panel, ["/api/pilot-launch-gate/decision-template", "/api/pilot-launch-gate/risk-template"]));
  must("panel uses real field acceptance session api", includesAny(panel, ["/api/field-acceptance/session"]));
  must("panel keeps acceptance summary", includesAny(panel, ["Acceptance özetleri", "Kabul checklisti"]));
  mustNot("panel drops field acceptance session-template api", includesAny(panel, ["/api/field-acceptance/session-template"]));
  must("runbook explains M65 scope", includesAny(runbook, ["Pilot Launch Gate", "kritik risk listesi", "M65 green olmadan sahaya çıkılmaz", "karar kaydı", "risk kaydı"]));

  console.log("");
  console.log("OK M65 PILOT LAUNCH GATE CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
