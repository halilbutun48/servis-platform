import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
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

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function expect(cond, msg) { cond ? ok(msg) : fail(msg); }

console.log("=== M90C.8 CI / VERIFICATION VISIBILITY CHECK ===");

const state = JSON.parse(read("tools/repo_contract_state.json"));
const rootPackage = JSON.parse(read("package.json"));
const backendPackage = JSON.parse(read("backend/package.json"));
const workflow = read(".github/workflows/vardis_verification_visibility.yml");
const primer = read("docs/PRIMER_SSOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const toolsReadme = read("tools/README.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const milestone = read("docs/MILESTONE_M90C_8_CI_VERIFICATION_VISIBILITY.md");
const runbook = read("docs/RUNBOOK_M90C_8_CI_VERIFICATION_VISIBILITY.md");
const livingMilestone = read("docs/MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");
const livingRunbook = read("docs/RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");

const policy = state.ciVerificationVisibility || {};
expect((state.activeMilestones || []).includes("M90C.8"), "state active milestones include M90C.8");
expect(policy.goal === "repo-native-ci-verification-visibility", "state policy goal tracks repo-native CI visibility");
expect((policy.workflowPath || "") === ".github/workflows/vardis_verification_visibility.yml", "state policy points to workflow path");
expect((policy.primaryCommand || "") === "npm run verify:ci", "state policy points to root verify:ci command");
expect((policy.exportPack || "") === "tools/pack_m90_c7_export_package_hygiene.ps1", "state policy points to export hygiene pack");
expect(Array.isArray(policy.jobs) && policy.jobs.includes("repo-verification") && policy.jobs.includes("shareable-export"), "state policy lists repo-verification and shareable-export jobs");

expect((rootPackage.scripts || {})["verify:closure"]?.includes("m90b1check") && (rootPackage.scripts || {})["verify:closure"]?.includes("audit:repo") && (rootPackage.scripts || {})["verify:closure"]?.includes("m90c6check") && (rootPackage.scripts || {})["verify:closure"]?.includes("m90c7check") && (rootPackage.scripts || {})["verify:closure"]?.includes("m90c8check"), "root verify:closure chains closure gates and repo audit");
expect((rootPackage.scripts || {})["verify:ci"]?.includes("npm --prefix backend run lint") && (rootPackage.scripts || {})["verify:ci"]?.includes("npm run verify:docs") && (rootPackage.scripts || {})["verify:ci"]?.includes("npm run verify:hot") && (rootPackage.scripts || {})["verify:ci"]?.includes("npm run verify:web-contract") && (rootPackage.scripts || {})["verify:ci"]?.includes("npm run verify:closure"), "root verify:ci exposes canonical verification chain");
expect((backendPackage.scripts || {})["m90c8check"] === "node scripts/m90_c8_ci_verification_visibility_check.js", "backend package exposes m90c8check script");

expect(includesText(workflow, "push") && includesText(workflow, "pull_request") && includesText(workflow, "workflow_dispatch"), "workflow listens to push, pull_request and workflow_dispatch");
expect(includesText(workflow, "repo-verification") && includesText(workflow, "shareable-export"), "workflow defines both visibility jobs");
expect(includesText(workflow, "ubuntu-latest") && includesText(workflow, "windows-latest"), "workflow spans ubuntu and windows runners");
expect(includesText(workflow, "npm run verify:ci"), "workflow runs root verify:ci command");
expect(includesText(workflow, "pack_m90_c7_export_package_hygiene.ps1"), "workflow runs export hygiene pack in shareable-export job");
expect(includesText(workflow, "upload-artifact@v4") && includesText(workflow, "repo_audit_latest.json") && includesText(workflow, "servis-platform_shareable_*.zip"), "workflow uploads repo audit and shareable export artifacts");

const docsBundle = [primer, backlog, toolsPrimer, toolsReadme, scriptGuide, milestone, runbook, livingMilestone, livingRunbook].join("\n");
expect(includesText(docsBundle, "M90C.8"), "canonical docs mention M90C.8");
expect(includesText(docsBundle, "CI / verification visibility") || includesText(docsBundle, "ci / verification visibility"), "canonical docs mention CI / verification visibility");
expect(includesText(docsBundle, "satır azaltma en sona") || includesText(docsBundle, "line-count reduction stays deferred"), "canonical docs keep deferred line-count policy");
expect(includesText(primer, "M90C.8") && includesText(primer, "CI / verification visibility"), "primer preserves M90C.8 CI visibility record");
expect(includesText(toolsReadme, "pack_m90_c8_ci_verification_visibility.ps1") && includesText(toolsReadme, "npm run verify:ci"), "tools readme exposes M90C.8 pack and root verify command");
expect(includesText(scriptGuide, "RUNBOOK_M90C_8_CI_VERIFICATION_VISIBILITY.md"), "script guide exposes M90C.8 runbook");

if (process.exitCode) process.exit(process.exitCode);
console.log("M90C.8 CI / VERIFICATION VISIBILITY CHECK PASS");
