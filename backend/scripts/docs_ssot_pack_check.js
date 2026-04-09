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

async function main() {
  const state = readRepoContractState();
  banner("DOCS / SSOT PACK CHECK");

  const manifestRel = "tools/milestone_pack_manifest.json";
  must(`${manifestRel} exists`, exists(manifestRel));
  const manifest = JSON.parse(read(manifestRel));

  const requiredStageIds = [
    "M0-M41", "M42 OPTIONAL", "M58", "M59", "M60", "M61", "M62", "M63", "M64", "M65", "M66", "DOCS-SSOT",
    "M80", "M80.1", "M80.2", "M80.3", "M81", "M82.1", "M82.8", "M82.9", "M82.10", "M82.11", "M83", "M84", "M85", "M86", "M87", "M88", "M89"
  ];
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
  const markerPolicy = read("docs/REPO_CONTRACT_MARKER_POLITIKASI_V1.md");
  const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");

  must("state latest master pack is 89", Number(state.latestMasterPack) === 89);
  must("state latest historical master pack is 79", Number(state.latestHistoricalMasterPack) === 79);
  must("state stable_to remains 78", Number(state.stableTo) === 78);
  must("state next milestone is M90", String(state.nextMilestone || "") === "M90");
  must("state historical next milestone is M80", String(state.historicalNextMilestone || "") === "M80");
  must("state docs contract mode is split", String(state.docsContractMode || "") === "state-first-canonical-history-split");
  must("state upper route is M80 to M89", Number(state.livingUpperRouteFrom) === 80 && Number(state.livingUpperRouteTo) === 89);

  const canonicalDocsBundle = [readme, primer, toolsPrimer, startpack, registry, backlog, toolsReadme, scriptGuide].join("\n");
  must("canonical docs reflect M89 green and M90 route", includesAnyText(canonicalDocsBundle, ["M0->M89", "M89", "M90", "10-10 kapanış"]));
  must("canonical docs keep historical anchor visible", includesAnyText(canonicalDocsBundle, ["M0->M79", "historical master", "tarihsel tam master anchor"]));
  must("checklist reflects active route markers", includesAnyText(checklist, ["M77", "M78", "M79", "M80", "M89", "master pack marker"]));
  must("tools checklist carries compatible route markers", includesAnyText(toolsChecklist, ["M77", "M78", "M79", "M80", "M89", "master pack marker"]));
  must("registry lists current canonical route", includesAnyText(registry, ["M76A-1", "M77", "M78", "M79", "M80", "M89", "Aktif kanonik hat"]));
  must("backlog points to M90 route", includesAnyText(backlog, ["M90", "canonical closure", "10-10 kapanış", "SCRIPT_KILAVUZU_MILESTONE_HARITASI"]));
  must("tools readme lists living master entry and M90 route", includesAnyText(toolsReadme, ["tools\\pack.ps1 -To 89", "pack_living.ps1", "M89", "M90"]));
  must("full runbook mentions historical master/docs pack", includesAnyText(fullRunbook, ["tools\\pack.ps1 -To 66", "pack_docs_ssot"]));
  must("docs pack runbook explains runbook/checklist same roof", includesAnyText(docsPackRunbook, ["Runbook + checklist", "tek çatı", "milestone_pack_manifest.json"]));
  must("marker policy explains state first and historical split", includesAnyText(markerPolicy, ["latestHistoricalMasterPack", "historicalNextMilestone", "docsContractMode", "state-first-canonical-history-split"]));
  must("script guide says canonical single guide", includesAnyText(scriptGuide, ["tek resmi rehber", "M0'dan M89'a", "M90"]));

  console.log("\nOK DOCS / SSOT PACK CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
