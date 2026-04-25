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

console.log("=== M90C.7 EXPORT / PACKAGE HYGIENE CHECK ===");

const state = JSON.parse(read("tools/repo_contract_state.json"));
const report = JSON.parse(read("artifacts/repo-audit/repo_audit_latest.json"));
const gitignore = read(".gitignore");
const backendDataGitignore = read("backend/data/.gitignore");
const backendDataReadme = read("backend/data/README.md");
const preflight = read("tools/_repo_hygiene_preflight.ps1");
const preflightInternal = read("tools/_packs/_repo_hygiene_preflight.ps1");
const exportTool = read("tools/export_shareable_repo_bundle.ps1");
const jsonFileStore = read("backend/src/lib/jsonFileStore.js");
const packM90C7 = read("tools/pack_m90_c7_export_package_hygiene.ps1");
const primer = read("docs/PRIMER_SSOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const toolsReadme = read("tools/README.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const milestone = read("docs/MILESTONE_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md");
const runbook = read("docs/RUNBOOK_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md");
const livingMilestone = read("docs/MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");
const livingRunbook = read("docs/RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");

const policy = state.shareablePackageHygiene || {};
expect((state.activeMilestones || []).includes("M90C.7"), "state active milestones include M90C.7");
expect(policy.goal === "shareable-package-clean-export", "state policy goal tracks shareable package clean export");
expect((policy.exportTool || "") === "tools/export_shareable_repo_bundle.ps1", "state policy points to shareable export tool");
expect((policy.defaultRuntimeDataRoot || "") === "artifacts/runtime-data", "state policy records artifacts/runtime-data as default runtime json root");
expect((policy.forbiddenExactFiles || []).includes(".env") && (policy.forbiddenExactFiles || []).includes("backend/.env") && (policy.forbiddenExactFiles || []).includes("infra/.env"), "state policy blocks env files");
expect((policy.forbiddenGlobFiles || []).includes("backend/data/*.json") && (policy.forbiddenGlobFiles || []).includes("data/*.json") && (policy.forbiddenGlobFiles || []).includes("README_M*_OVERLAY*.txt"), "state policy blocks runtime json and overlay residue globs");
expect((policy.forbiddenPathPrefixes || []).includes("artifacts/") && (policy.forbiddenPathPrefixes || []).includes("web/dist/") && (policy.forbiddenPathPrefixes || []).includes("mobile/dist/"), "state policy blocks artifacts and dist trees");
expect(report.summary.runtimeJsonFileCount === 0, "repo audit runtime json count remains 0");
expect(includesText(jsonFileStore, 'const DEFAULT_DATA_DIR = path.resolve(__dirname, "..", "..", "artifacts", "runtime-data")'), "json file store default root resolves to artifacts/runtime-data");
expect(includesText(jsonFileStore, "process.env.RUNTIME_DATA_DIR") && !includesText(jsonFileStore, 'path.resolve(process.cwd(), "data")'), "json file store keeps override path without cwd data fallback");

expect(includesText(gitignore, "backend/data/*.json"), ".gitignore keeps runtime json ignored");
expect(includesText(gitignore, "data/*.json"), ".gitignore keeps root runtime json ignored");
expect(includesText(gitignore, ".env") && includesText(gitignore, "backend/.env") && includesText(gitignore, "infra/.env"), ".gitignore blocks env files");
expect(includesText(gitignore, "web/dist/") && includesText(gitignore, "mobile/dist/"), ".gitignore blocks web/mobile dist");
expect(includesText(gitignore, "pack_living_*.log") && includesText(gitignore, "README_M*_OVERLAY*.txt"), ".gitignore blocks pack logs and overlay residues");

expect(includesText(backendDataGitignore, "!.gitkeep") && includesText(backendDataGitignore, "!README.md"), "backend/data/.gitignore keeps only allowlisted metadata files");
expect(includesText(backendDataReadme, "*.json") && includesText(backendDataReadme, "repoda takip edilmez"), "backend/data README states runtime json files are not tracked");

const preflightBundle = preflight + "\n" + preflightInternal;
expect(includesText(preflightBundle, "web\\dist") && includesText(preflightBundle, "mobile\\dist"), "repo hygiene preflight removes web/mobile dist residues");
expect(includesText(preflightBundle, "pack_living_final.log") && includesText(preflightBundle, "README_M*_OVERLAY*.txt"), "repo hygiene preflight removes pack log and overlay readme residues");

expect(includesText(exportTool, "Compress-Archive") || includesText(exportTool, "tar.exe") || includesText(exportTool, "CreateFromDirectory"), "shareable export tool creates sanitized zip output");
expect(includesText(exportTool, "backend/data/*.json") && includesText(exportTool, "data/*.json") && includesText(exportTool, "README_M*_OVERLAY*.txt"), "shareable export tool excludes runtime json and overlay residue globs");
expect(includesText(exportTool, "artifacts/") && includesText(exportTool, "web/dist/") && includesText(exportTool, "mobile/dist/"), "shareable export tool excludes artifacts and dist trees");
expect(includesText(exportTool, "pack_living_final.log") && includesText(exportTool, "pack_living_latest.log"), "shareable export tool excludes pack logs");
expect(includesText(exportTool, "node_modules") && includesText(packM90C7, "node_modules"), "shareable export and pack inspection block nested node_modules");
expect(!includesText(exportTool, "Where-Object { param("), "shareable export tool has no duplicated nested pipeline body");
expect(includesText(exportTool, "Test-ForbiddenRelPath") && includesText(exportTool, "Assert-InsideRoot"), "shareable export tool enforces policy and staging path confinement");
expect(includesText(exportTool, "finally") && includesText(exportTool, "Remove-Item"), "shareable export tool cleans staging in finally");
expect(includesText(packM90C7, "OpenRead") && includesText(packM90C7, "forbidden entry"), "M90C.7 pack inspects zip contents for forbidden entries");
expect(includesText(packM90C7, "shareable export inspected entries"), "M90C.7 pack records inspected zip entry count");

const docsBundle = [primer, backlog, toolsPrimer, toolsReadme, scriptGuide, milestone, runbook, livingMilestone, livingRunbook].join("\n");
expect(includesText(docsBundle, "M90C.7"), "canonical docs mention M90C.7");
expect(includesText(docsBundle, "export / package hygiene closure") || includesText(docsBundle, "export-package hygiene closure"), "canonical docs mention export/package hygiene closure");
expect(includesText(docsBundle, "satır azaltma") || includesText(docsBundle, "line-count reduction stays deferred"), "canonical docs preserve deferred line-count policy");
expect(includesText(primer, "M90C.7") && includesText(primer, "export / package hygiene closure"), "primer preserves M90C.7 export hygiene record");
expect(includesText(toolsReadme, "pack_m90_c7_export_package_hygiene.ps1"), "tools readme exposes M90C.7 pack command");
expect(includesText(scriptGuide, "RUNBOOK_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md"), "script guide exposes M90C.7 runbook");

if (process.exitCode) process.exit(process.exitCode);
console.log("M90C.7 EXPORT / PACKAGE HYGIENE CHECK PASS");
