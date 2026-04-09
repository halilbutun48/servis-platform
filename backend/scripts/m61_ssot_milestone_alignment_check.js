import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, "..", ".."));

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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function exists(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`FAIL missing ${rel}`);
  console.log(`OK ${rel} exists`);
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }

async function main() {
  const state = readRepoContractState();

  console.log("=== M61 SSOT + MILESTONE HIZASI CHECK ===");
  console.log("INFO checking required M61 files");

  [
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
    "docs/REPO_CONTRACT_MARKER_POLITIKASI_V1.md",
    "tools/check_m80_m89_contract_sweep.ps1"
  ].forEach(exists);

  const readme = read("README.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const toolsChecklist = read("tools/CHECKLIST_SSOT.md");
  const backlog = read("docs/NEXT_BACKLOG_V1.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const manifest = read("tools/milestone_pack_manifest.json");
  const stableTo = read("tools/STABLE_TO.txt");
  const markerPolicy = read("docs/REPO_CONTRACT_MARKER_POLITIKASI_V1.md");

  console.log("INFO checking updated route and SSOT status");
  if (Number(state.latestMasterPack) === 89) ok("state latest master pack is 89"); else fail("state latest master pack is 89");
  if (Number(state.latestHistoricalMasterPack) === 79) ok("state latest historical master pack is 79"); else fail("state latest historical master pack is 79");
  if (String(stableTo).includes("78")) ok("state stable_to remains 78"); else fail("state stable_to remains 78");
  if (String(state.nextMilestone || "") === "M90") ok("state next milestone is M90"); else fail("state next milestone is M90");
  if (String(state.historicalNextMilestone || "") === "M80") ok("state historical next milestone is M80"); else fail("state historical next milestone is M80");

  const routeText = [readme, primer, startpack, backlog, registry].join("\n");
  if (includesAnyText(routeText, ["M89", "M90", "10-10 kapanış"])) ok("docs reflect living M89 to M90 route"); else fail("docs reflect living M89 to M90 route");
  if (includesAnyText(routeText, ["M0->M79", "historical master", "tarihsel tam master anchor"])) ok("docs preserve historical anchor"); else fail("docs preserve historical anchor");
  if (includesAnyText(checklist, ["M61", "M80", "M81", "M82", "M89"])) ok("checklist reflects active verification state"); else fail("checklist reflects active verification state");
  if (includesAnyText(toolsChecklist, ["M61", "M80", "M81", "M82", "M89"])) ok("tools checklist reflects active verification state"); else fail("tools checklist reflects active verification state");
  if (includesAnyText(backlog, ["M90A", "M90B", "M90C", "M90D", "M90E"])) ok("backlog points to M90 route"); else fail("backlog points to M90 route");
  if (includesAnyText(registry, ["M61", "M80", "M81", "M82", "M89", "M90"])) ok("registry shows current canonical route"); else fail("registry shows current canonical route");
  if (includesAnyText(markerPolicy, ["latestHistoricalMasterPack", "historicalNextMilestone", "livingUpperRouteFrom", "livingUpperRouteTo"])) ok("marker policy describes split state"); else fail("marker policy describes split state");
  if (includesAnyText(manifest, ["pack_docs_ssot.ps1", "pack_m80_final_sert_kabul_yuk_guveni.ps1", "pack_m81_mobile_saha_sertlestirme.ps1", "pack_m82_1_backend_correctness.ps1", "pack_m89_settlement_reconciliation_desk.ps1"])) ok("manifest contains docs pack and latest stages"); else fail("manifest contains docs pack and latest stages");

  console.log("=== M61 SSOT + MILESTONE HIZASI CHECK PASS ===");
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
