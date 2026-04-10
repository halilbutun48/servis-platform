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

console.log("=== M90C.9 SAFE CLOSURE / FINAL HYGIENE CHECK ===");

const state = JSON.parse(read("tools/repo_contract_state.json"));
const rootPackage = JSON.parse(read("package.json"));
const backendPackage = JSON.parse(read("backend/package.json"));
const exportTool = read("tools/export_shareable_repo_bundle.ps1");
const primer = read("docs/PRIMER_SSOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const toolsReadme = read("tools/README.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const milestone = read("docs/MILESTONE_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md");
const runbook = read("docs/RUNBOOK_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md");
const livingMilestone = read("docs/MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");
const livingRunbook = read("docs/RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");

const policy = state.safeClosureFinalHygiene || {};
expect((state.activeMilestones || []).includes("M90C.9"), "state active milestones include M90C.9");
expect(policy.goal === "safe-closure-final-hygiene-checklist", "state policy goal tracks final hygiene checklist");
expect((policy.primaryCommand || "") === "npm run verify:final", "state policy points to root verify:final command");
expect((policy.lintEvidence || "") === "artifacts/lint/web_lint_latest.txt", "state policy records canonical web lint evidence path");
expect((policy.windowsPreferredShell || "") === "pwsh", "state policy records pwsh as windows preferred shell");
expect((policy.exportPack || "") === "tools/pack_m90_c7_export_package_hygiene.ps1", "state policy points to export hygiene pack");
expect((policy.exportTool || "") === "tools/export_shareable_repo_bundle.ps1", "state policy points to shareable export tool");
expect(Array.isArray(policy.orderedSteps) && policy.orderedSteps.length >= 4 && policy.orderedSteps.some((x) => includesText(x, "verify:final")) && policy.orderedSteps.some((x) => includesText(x, "pack_m90_c7_export_package_hygiene")) && policy.orderedSteps.some((x) => includesText(x, "export_shareable_repo_bundle")) && policy.orderedSteps.some((x) => includesText(x, "git status --short")), "state policy captures final closure order");

expect((rootPackage.scripts || {})["verify:closure"]?.includes("m90c9check"), "root verify:closure includes m90c9check");
expect((rootPackage.scripts || {})["verify:final"] === "npm run verify:ci", "root verify:final aliases canonical verify chain");
expect((backendPackage.scripts || {})["m90c9check"] === "node scripts/m90_c9_safe_closure_final_hygiene_check.js", "backend package exposes m90c9check script");

expect(includesText(exportTool, "tar.exe") && includesText(exportTool, "CreateFromDirectory"), "export tool keeps tar and dotnet zip fallback");
expect(!includesText(exportTool, "GetRelativePath(") && !includesText(exportTool, "ConvertFrom-Json -Depth"), "export tool excludes known PowerShell 5.1 breaking APIs");
expect(includesText(exportTool, "prefer pwsh") || includesText(exportTool, "Windows note"), "export tool carries pwsh preference note");

const docsBundle = [primer, backlog, toolsPrimer, toolsReadme, scriptGuide, milestone, runbook, livingMilestone, livingRunbook].join("\n");
expect(includesText(docsBundle, "M90C.9"), "canonical docs mention M90C.9");
expect(includesText(docsBundle, "safe closure") || includesText(docsBundle, "guvenli kapanis"), "canonical docs mention safe closure / final hygiene checklist");
expect(includesText(docsBundle, "npm run verify:final"), "canonical docs mention root verify:final command");
expect(includesText(docsBundle, "artifacts/lint/web_lint_latest.txt"), "canonical docs mention canonical web lint evidence path");
expect(includesText(docsBundle, "pwsh"), "canonical docs mention pwsh preference");
expect(includesText(docsBundle, "satır azaltma en sona") || includesText(docsBundle, "line-count reduction stays deferred"), "canonical docs preserve deferred line-count policy");
expect(includesText(primer, "M90C.9") && (includesText(primer, "guvenli kapanis") || includesText(primer, "final hygiene checklist")), "primer points to M90C.9 as current official work");
expect(includesText(toolsReadme, "pack_m90_c9_safe_closure_final_hygiene.ps1") && includesText(toolsReadme, "npm run verify:final"), "tools readme exposes M90C.9 pack and final verify command");
expect(includesText(scriptGuide, "RUNBOOK_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md"), "script guide exposes M90C.9 runbook");

if (process.exitCode) process.exit(process.exitCode);
console.log("M90C.9 SAFE CLOSURE / FINAL HYGIENE CHECK PASS");
