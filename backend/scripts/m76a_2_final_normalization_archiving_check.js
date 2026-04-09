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

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function mustExist(rel) { if (exists(rel)) ok(`${rel} exists`); else fail(`${rel} missing`); }

const state = readRepoContractState();

console.log("=== M76A-2 FINAL NORMALIZATION + ARCHIVING CHECK ===");

const required = [
  "tools/packs/living/pack_phase_m76_m81.ps1",
  "tools/checks/living/check_m76_m81_static.ps1",
  "tools/packs/living/hotfixes/pack_m71_room_title_hotfix.ps1",
  "tools/packs/living/hotfixes/pack_m71_ui_contract_hotfix.ps1",
  "tools/packs/living/hotfixes/pack_m71_workflow_loadsummary_hotfix.ps1",
  "tools/packs/living/hotfixes/pack_m72_georeview_token_hotfix.ps1",
  "tools/packs/living/hotfixes/pack_m75_repo_contract_hotfix.ps1",
  "tools/checks/living/hotfixes/check_m71_room_title_hotfix_repo_contract.ps1",
  "tools/checks/living/hotfixes/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1",
  "tools/checks/living/hotfixes/check_m72_georeview_token_hotfix_repo_contract.ps1",
  "docs/RUNBOOK_M76A_2_FINAL_NORMALIZATION_ARCHIVING.md",
  "docs/MILESTONE_M76A_2_FINAL_NORMALIZATION_ARCHIVING.md"
];
required.forEach(mustExist);

const wrappers = [
  ["tools/pack_m71_room_title_hotfix.ps1", "packs\\living\\hotfixes\\pack_m71_room_title_hotfix.ps1"],
  ["tools/pack_m71_ui_contract_hotfix.ps1", "packs\\living\\hotfixes\\pack_m71_ui_contract_hotfix.ps1"],
  ["tools/pack_m71_workflow_loadsummary_hotfix.ps1", "packs\\living\\hotfixes\\pack_m71_workflow_loadsummary_hotfix.ps1"],
  ["tools/pack_m72_georeview_token_hotfix.ps1", "packs\\living\\hotfixes\\pack_m72_georeview_token_hotfix.ps1"],
  ["tools/pack_m75_repo_contract_hotfix.ps1", "packs\\living\\hotfixes\\pack_m75_repo_contract_hotfix.ps1"],
  ["tools/check_m71_room_title_hotfix_repo_contract.ps1", "checks\\living\\hotfixes\\check_m71_room_title_hotfix_repo_contract.ps1"],
  ["tools/check_m71_workflow_loadsummary_hotfix_repo_contract.ps1", "checks\\living\\hotfixes\\check_m71_workflow_loadsummary_hotfix_repo_contract.ps1"],
  ["tools/check_m72_georeview_token_hotfix_repo_contract.ps1", "checks\\living\\hotfixes\\check_m72_georeview_token_hotfix_repo_contract.ps1"]
];
for (const [rel, marker] of wrappers) {
  const txt = read(rel);
  if (includesText(txt, marker)) ok(`${rel} is compatibility alias`); else fail(`${rel} is compatibility alias`);
}

if (!(state.canonicalPackHierarchy?.publicRoot === 'tools/packs/living')) fail("state marks living wrapper root"); else ok("state marks living wrapper root");
if (Number(state.phaseDefaults?.packLivingTo) >= 79) ok("pack_living default moved to 79 or later living route"); else fail("pack_living default moved to 79 or later living route");
if (Number(state.phaseDefaults?.verifyLivingRuntimeTo) >= 79) ok("verify_living_runtime default moved to 79 or later living route"); else fail("verify_living_runtime default moved to 79 or later living route");
if (Number(state.phaseDefaults?.phase76To) >= 79) ok("phase76 default moved to 79 or later living route"); else fail("phase76 default moved to 79 or later living route");

const manifest = JSON.parse(read("tools/milestone_pack_manifest.json"));
if ((manifest.stages || []).some((s) => s.id === "M76A-2" && s.script === "tools/pack_m76a_2_final_normalization_archiving.ps1")) ok("manifest registers M76A-2 pack"); else fail("manifest registers M76A-2 pack");

const reportDir = path.join(repoRoot, "artifacts", "normalization");
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, "m76a_2_final_normalization_latest.json");
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  groupedHotfixPacks: 5,
  groupedHotfixChecks: 3,
  compatibilityAliases: wrappers.length,
  defaultsMovedTo: 76
}, null, 2));
console.log(`INFO report => artifacts/normalization/m76a_2_final_normalization_latest.json`);
console.log("=== M76A-2 FINAL NORMALIZATION + ARCHIVING CHECK PASS ===");


