import { banner, exists, must, read } from "./_static_milestone_check.js";

function includesText(text, needle) {
  return String(text || "").includes(needle);
}

function includesAll(text, needles) {
  return needles.every((needle) => includesText(text, needle));
}

banner("M92 REPO VERIFICATION SPINE CHECK");

const rootPackage = JSON.parse(read("package.json"));
const backendPackage = JSON.parse(read("backend/package.json"));
const state = JSON.parse(read("tools/repo_contract_state.json"));
const manifest = JSON.parse(read("tools/milestone_pack_manifest.json"));

const chain = read("backend/scripts/run_repo_check_chain.js");
const milestoneRunner = read("backend/scripts/run_m0_latest.js");
const toolsReadme = read("tools/README.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const runbook = read("docs/RUNBOOK_M92_REPO_VERIFICATION_SPINE.md");
const milestone = read("docs/MILESTONE_M92_REPO_VERIFICATION_SPINE.md");

const rootScripts = rootPackage.scripts || {};
const backendScripts = backendPackage.scripts || {};
const stageIds = new Set((manifest.stages || []).map((stage) => stage.id));

must("repo check chain exists", exists("backend/scripts/run_repo_check_chain.js"));
must("M91 family check module exists", exists("backend/scripts/_m91_route_preview_checks.js"));
must("M91 family runner exists", exists("backend/scripts/run_m91_route_preview_checks.js"));
must("M92 node check exists", exists("backend/scripts/m92_repo_verification_spine_check.js"));
must("M92 tools check exists", exists("tools/check_m92_repo_verification_spine_repo_contract.ps1"));
must("M92 pack exists", exists("tools/pack_m92_repo_verification_spine.ps1"));
must("M92 runbook exists", exists("docs/RUNBOOK_M92_REPO_VERIFICATION_SPINE.md"));
must("M92 milestone doc exists", exists("docs/MILESTONE_M92_REPO_VERIFICATION_SPINE.md"));
must("tools check-repo wrapper exists", exists("tools/check-repo.ps1"));

must("root package exposes single repo entry", rootScripts.check === "npm run verify:repo");
must("root verify:repo uses repo check chain", rootScripts["verify:repo"] === "node backend/scripts/run_repo_check_chain.js --phase all");
must("root verify:ci aliases repo check chain", rootScripts["verify:ci"] === "npm run verify:repo");
must("root verify:final includes repo check chain", includesText(rootScripts["verify:final"], "npm run verify:repo"));
must("root verify:final refreshes snapshot soft-gate report", includesText(rootScripts["verify:final"], "npm run verify:snapshot"));
must("root phase aliases point to repo check chain", includesAll(JSON.stringify(rootScripts), [
  "run_repo_check_chain.js --phase docs",
  "run_repo_check_chain.js --phase hot",
  "run_repo_check_chain.js --phase web-contract",
  "run_repo_check_chain.js --phase closure",
]));
must("milestone alias remains direct latest runner", rootScripts["verify:milestones"] === "node backend/scripts/run_m0_latest.js --static-only --to latest --continue");

must("backend exposes repo and M92 aliases", includesAll(JSON.stringify(backendScripts), [
  "repo:check",
  "repo:check:chain",
  "m91check",
  "run_m91_route_preview_checks.js",
  "m91:milestones",
  "m92check",
  "m92_repo_verification_spine_check.js",
]));

must("repo chain keeps canonical phases in order", includesAll(chain, [
  'const defaultPhaseOrder = ["lint", "docs", "hot", "web-contract", "closure", "milestones"]',
  "run_web_lint_with_evidence.js",
  "docs_ssot_pack_check.js",
  "m90_b1_canonical_closure_gate_check.js",
  "repo_audit.js",
  "run_m0_latest.js",
]));
must("repo chain uses direct node phase steps", includesText(chain, "nodeStep(") && includesText(chain, "spawn("));
must("milestone runner discovers js cjs mjs", includesText(milestoneRunner, "(?:js|cjs|mjs)"));
must("milestone runner handles m162 legacy ordering", includesText(milestoneRunner, "m162check/m163check"));

must("manifest includes closure and latest verification stages", [
  "M90B.1",
  "M90C.6",
  "M90C.7",
  "M90C.8",
  "M90C.9",
  "M91",
  "M92",
].every((id) => stageIds.has(id)));
must("state active milestones include M91 and M92", (state.activeMilestones || []).includes("M91") && (state.activeMilestones || []).includes("M92"));
must("state repo verification spine policy exists", state.repoVerificationSpine?.primaryCommand === "npm run verify:repo");
must("state repo verification spine points to M92 check", state.repoVerificationSpine?.m92Check === "backend/scripts/m92_repo_verification_spine_check.js");

must("M92 docs expose single roof command", includesAll([toolsReadme, scriptGuide, runbook, milestone].join("\n"), [
  "npm run verify:repo",
  "run_repo_check_chain.js",
  "M92",
  "repo verification spine",
]));

console.log("M92 REPO VERIFICATION SPINE CHECK PASS");
