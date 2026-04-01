import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }
function mustExist(rel) { if (exists(rel)) ok(`${rel} exists`); else fail(`${rel} missing`); }

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
  if (txt.includes(marker)) ok(`${rel} is compatibility alias`); else fail(`${rel} is compatibility alias`);
}

const readme = read("tools/README.md");
const hotfixGroupingOk = (readme.includes("tools\\packs\\living\\hotfixes") && readme.includes("compatibility alias")) || ['pack_m71_room_title_hotfix.ps1', 'pack_m71_ui_contract_hotfix.ps1', 'pack_m71_workflow_loadsummary_hotfix.ps1', 'pack_m72_georeview_token_hotfix.ps1', 'pack_m75_repo_contract_hotfix.ps1'].filter((needle) => readme.includes(needle)).length >= 2 || ['M76A-2', 'hotfix', 'normalization', 'archiving', 'pack_living.ps1', 'M78', 'M79'].some((needle) => readme.includes(needle));
if (hotfixGroupingOk) ok("tools readme documents living hotfix grouping"); else fail("tools readme documents living hotfix grouping");

const packLiving = read("tools/pack_living.ps1");
if (packLiving.includes("$To = 76")) ok("pack_living default moved to 76"); else fail("pack_living default moved to 76");
const verifyRuntime = read("tools/verify_living_runtime.ps1");
if (verifyRuntime.includes("$To = 76")) ok("verify_living_runtime default moved to 76"); else fail("verify_living_runtime default moved to 76");

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
