import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function banner(title) {
  console.log(`\n=== ${title} ===`);
}
function must(label, ok) {
  if (!ok) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}
function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}
function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}
const server = read("backend/src/server.js");
const mountTxt = exists("backend/src/bootstrap/routeMounts.js") ? read("backend/src/bootstrap/routeMounts.js") : "";

async function main() {
  const state = readRepoContractState();
  banner("M61 SSOT + MILESTONE HIZASI CHECK");

  const requiredFiles = [
    "backend/scripts/m61_ssot_milestone_alignment_check.js",
    "backend/src/ops/ssotAlignmentManifest.js",
    "backend/src/routes/ssotAlignment.js",
    "web/src/panels/superadmin/SsotAlignmentPanel.jsx",
    "docs/MILESTONE_REGISTRY_V1.md",
    "docs/RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md",
    "docs/MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md",
    "tools/pack_m61_ssot_milestone_alignment.ps1",
    "tools/check_m61_ssot_milestone_alignment_repo_contract.ps1",
    "README.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md",
  ];

  console.log("INFO checking required M61 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const readme = read("README.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const backlog = read("docs/NEXT_BACKLOG_V1.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const manifest = read("backend/src/ops/ssotAlignmentManifest.js");
  const route = read("backend/src/routes/ssotAlignment.js");
  const panel = read("web/src/panels/superadmin/SsotAlignmentPanel.jsx");
  const runbook = read("docs/RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md");

  console.log("INFO checking updated route and SSOT status");
  must("state latest master pack is 79", Number(state.latestMasterPack) === 79);
  must("state stable_to remains 78", Number(state.stableTo) === 78);
  must("state next milestone is M80", String(state.nextMilestone || "") === "M80");
  must("checklist reflects active verification state", includesAny(checklist, ["master pack marker", "repo audit marker", "M77", "M78", "M79"]));
  must("backlog points to M80 route", includesAny(backlog, ["M80", "final sert kabul", "yük güveni"]));
  must("registry shows current canonical route", includesAny(registry, ["M76A-1", "M77", "M78", "M79", "Aktif kanonik hat"]));

  console.log("INFO checking backend and web skeleton");
  must("server imports ssot alignment router", includesAny(server, ["ssotAlignmentRouter", "./routes/ssotAlignment.js"]) || includesAny(mountTxt, ["ssotAlignmentRouter"]));
  must("server mounts /api/ssot-alignment", includesAny(server, ["/api/ssot-alignment"]) || includesAny(mountTxt, ["/api/ssot-alignment"]));
  must("manifest defines SSOT targets and route", includesAny(manifest, ["SSOT_ALIGNMENT_TARGETS", "MILESTONE_ROUTE", '"M61"']));
  must("route exposes manifest and summary-template", includesAny(route, ["/manifest", "/summary-template", "/route"]));
  must("panel shows M61 cards", includesAny(panel, ["M61 SSOT + Milestone Hizası", "Sistem Standartları", "Izlenen SSOT hedefleri", "İzlenen SSOT hedefleri", "Milestone ozeti", "Milestone özeti", "Aktif milestone", "Aktif standart paketi"]));

  console.log("INFO checking M61 runbook language");
  must("runbook explains M61 scope", includesAny(runbook, ["milestone registry", "M61 green olmadan", "README", "PRIMER", "CHECKLIST"]));

  console.log("\nOK M61 SSOT + MILESTONE HIZASI CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
