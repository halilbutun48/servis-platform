import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function banner(title) { console.log(`
=== ${title} ===`); }
function must(label, ok) { if (!ok) throw new Error(`FAIL ${label}`); console.log(`OK ${label}`); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function includesAny(text, needles) { return needles.some((needle) => text.includes(needle)); }

async function main() {
  banner("M65 PILOT LAUNCH GATE CHECK");
  const requiredFiles = [
    "backend/scripts/m65_pilot_launch_gate_check.js",
    "backend/src/ops/pilotLaunchGateManifest.js",
    "backend/src/routes/pilotLaunchGate.js",
    "web/src/panels/superadmin/PilotLaunchGatePanel.jsx",
    "docs/RUNBOOK_M65_PILOT_LAUNCH_GATE.md",
    "docs/MILESTONE_M65_PILOT_LAUNCH_GATE.md",
    "tools/pack_m65_pilot_launch_gate.ps1",
    "tools/check_m65_pilot_launch_gate_repo_contract.ps1",
    "README.md", "docs/PROJECT_SPEC_V1.md", "docs/PRIMER_SSOT.md", "docs/STARTPACK_V1.md", "docs/CHECKLIST_SSOT.md"
  ];
  console.log("INFO checking required M65 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));
  const readme = read("README.md");
  const projectSpec = read("docs/PROJECT_SPEC_V1.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const server = read("backend/src/server.js");
  const manifest = read("backend/src/ops/pilotLaunchGateManifest.js");
  const route = read("backend/src/routes/pilotLaunchGate.js");
  const panel = read("web/src/panels/superadmin/PilotLaunchGatePanel.jsx");
  const runbook = read("docs/RUNBOOK_M65_PILOT_LAUNCH_GATE.md");
  console.log("INFO checking updated route and SSOT status");
  must("readme points to M65 route", includesAny(readme, ["M64 green", "M65 — Pilot Launch Gate", "pack_m65_pilot_launch_gate.ps1"]));
  must("project spec reflects launch gate layer", includesAny(projectSpec, ["Pilot Launch Gate", "GO / LIMITED GO / NO-GO", "M59 → M65"]));
  must("primer reflects M64 green and M65 active", includesAny(primer, ["M64 — Doğal Copilot Katmanı", "M65 — Pilot Launch Gate", "pack_m65_pilot_launch_gate.ps1"]));
  must("startpack reflects M65 opening", includesAny(startpack, ["M65 — Pilot Launch Gate", "M65 green olmadan sahaya çıkılmaz", "pack_m65_pilot_launch_gate.ps1"]));
  must("checklist marks M64 green and keeps M65 open", includesAny(checklist, ["[x] `M64 — Doğal Copilot Katmanı`", "[ ] `M65 — Pilot Launch Gate`"]));
  console.log("INFO checking backend and web skeleton");
  must("server imports pilot launch gate router", includesAny(server, ["pilotLaunchGateRouter", "./routes/pilotLaunchGate.js"]));
  must("server mounts /api/pilot-launch-gate", includesAny(server, ["/api/pilot-launch-gate"]));
  must("manifest defines gate capabilities", includesAny(manifest, ["PILOT_LAUNCH_GATE_CAPABILITIES", "Launch checklist", "GO / LIMITED GO / NO-GO"]));
  must("route exposes manifest and templates", includesAny(route, ["/manifest", "/decision-template", "/risk-template"]));
  must("panel shows M65 cards", includesAny(panel, ["M65 Pilot Launch Gate", "Launch checklist", "GO / LIMITED GO / NO-GO"]));
  must("runbook explains M65 scope", includesAny(runbook, ["Pilot Launch Gate", "kritik risk listesi", "M65 green olmadan sahaya çıkılmaz"]));
  console.log();
  console.log("OK M65 PILOT LAUNCH GATE CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
