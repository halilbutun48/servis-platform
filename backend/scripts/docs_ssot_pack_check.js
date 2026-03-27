import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  banner("DOCS / SSOT PACK CHECK");

  const manifestRel = "tools/milestone_pack_manifest.json";
  must(`${manifestRel} exists`, exists(manifestRel));
  const manifest = JSON.parse(read(manifestRel));

  const requiredStageIds = ["M0-M41", "M42 OPTIONAL", "M58", "M59", "M60", "M61", "M62", "M63", "M64", "M65", "M66", "DOCS-SSOT"];
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

  must("README points to living master entry or historical docs markers", includesAny(readme, ["tools\\pack.ps1 -To 76", "tools\\pack.ps1 -To 66", "tools\\pack_docs_ssot.ps1"]));
  must("primer reflects historical M66 or current M75/M76 honesty", includesAny(primer, ["M66", "fonksiyonel", "tam milestone kapanışı için", "M75 green baseline", "M76A-1"]));
  must("tools primer reflects historical M66 or current M75/M76 honesty", includesAny(toolsPrimer, ["M66", "fonksiyonel", "tam milestone kapanışı için", "M75 green baseline", "M76A-1"]));
  must("startpack points to living master entry or historical docs markers", includesAny(startpack, ["tools\\pack.ps1 -To 76", "tools\\pack.ps1 -To 66", "tools\\pack_docs_ssot.ps1"]));
  must("checklist marks M65 green and keeps M66 open", includesAny(checklist, ["[x] `M65 — Pilot Launch Gate`", "[ ] `M66 — Operasyonel Reassignment`"]));
  must("tools checklist mirrors docs checklist", checklist === toolsChecklist);
  must("registry lists historical M66 or current M75/M76 route", includesAny(registry, ["M66 - Operasyonel Reassignment - functional-open", "M66 — Operasyonel Reassignment — functional-open", "M66 - Operasyonel Reassignment - fonksiyonel / tekrar test acik", "M66 — Operasyonel Reassignment — fonksiyonel / tekrar test acik", "M75 - green-baseline", "M76A-1 - minimum-normalization - active"]));
  must("backlog points to rerun + cleanup or current normalization route", includesAny(backlog, ["M0-M66", "cleanup", "saha testi", "M76A-1", "minimum normalizasyon"]));
  must("tools readme lists living master entry or historical docs markers", includesAny(toolsReadme, ["tools\\pack.ps1 -To 76", "tools\\pack.ps1 -To 66", "tools\\pack_docs_ssot.ps1"]));
  must("full runbook mentions historical master/docs pack", includesAny(fullRunbook, ["tools\\pack.ps1 -To 66", "pack_docs_ssot"]));
  must("docs pack runbook explains runbook/checklist same roof", includesAny(docsPackRunbook, ["Runbook + checklist", "tek çatı", "milestone_pack_manifest.json"]));

  console.log("\nOK DOCS / SSOT PACK CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
