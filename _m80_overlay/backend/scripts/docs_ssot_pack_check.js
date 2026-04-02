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

async function main() {
  const state = readRepoContractState();
  banner("DOCS / SSOT PACK CHECK");

  const manifestRel = "tools/milestone_pack_manifest.json";
  must(`${manifestRel} exists`, exists(manifestRel));
  const manifest = JSON.parse(read(manifestRel));

  const requiredStageIds = ["M0-M41", "M42 OPTIONAL", "M58", "M59", "M60", "M61", "M62", "M63", "M64", "M65", "M66", "DOCS-SSOT", "M80"];
  const stageIds = manifest.stages.map((stage) => stage.id);
  requiredStageIds.forEach((id) => must(`manifest contains ${id}`, stageIds.includes(id)));

  for (const stage of manifest.stages) {
    must(`${stage.id} script exists`, exists(stage.script));
    if (stage.check) must(`${stage.id} check exists`, exists(stage.check));
    if (stage.runtime) must(`${stage.id} runtime exists`, exists(stage.runtime));
    if (stage.runbook) must(`${stage.id} runbook exists`, exists(stage.runbook));
  }

  const readme = read("README.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const toolsChecklist = read("tools/CHECKLIST_SSOT.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const backlog = read("docs/NEXT_BACKLOG_V1.md");
  const toolsReadme = read("tools/README.md");
  const fullRunbook = read("docs/RUNBOOK_FULL_M0_M66_FIELD_TEST.md");
  const docsPackRunbook = read("docs/RUNBOOK_DOCS_SSOT_PACK.md");

  must("state latest master pack is 79", Number(state.latestMasterPack) === 79);
  must("state stable_to remains 78", Number(state.stableTo) === 78);
  must("state next milestone is M80", String(state.nextMilestone || "") === "M80");
  must("checklist reflects active route markers", includesAny(checklist, ["M77", "M78", "M79", "master pack marker"]));
  must("tools checklist carries compatible route markers", includesAny(toolsChecklist, ["M77", "M78", "M79", "master pack marker"]));
  must("registry lists current canonical route", includesAny(registry, ["M76A-1", "M77", "M78", "M79", "Aktif kanonik hat"]));
  must("backlog points to M80 route", includesAny(backlog, ["M80", "final sert kabul", "yük güveni"]));
  must("tools readme lists living master entry or historical docs markers", includesAny(toolsReadme, ["tools\pack.ps1 -To 79", "tools\pack.ps1 -To 76", "tools\pack.ps1 -To 66", "tools\pack_docs_ssot.ps1", "M79", "pack_living.ps1"]));
  must("full runbook mentions historical master/docs pack", includesAny(fullRunbook, ["tools\\pack.ps1 -To 66", "pack_docs_ssot"]));
  must("docs pack runbook explains runbook/checklist same roof", includesAny(docsPackRunbook, ["Runbook + checklist", "tek çatı", "milestone_pack_manifest.json"]));

  console.log("\nOK DOCS / SSOT PACK CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
