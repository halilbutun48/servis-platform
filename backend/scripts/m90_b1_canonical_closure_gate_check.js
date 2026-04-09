import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function expectIncludes(text, needle, msg) {
  if (includesText(text, needle)) ok(msg);
  else fail(msg);
}

console.log("=== M90B.1 CANONICAL CLOSURE GATE CHECK ===");

const state = JSON.parse(read("tools/repo_contract_state.json"));
const pack = read("tools/pack.ps1");
const packLiving = read("tools/pack_living.ps1");
const verifyRuntime = read("tools/verify_living_runtime.ps1");
const repoAudit = read("backend/scripts/repo_audit.js");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const milestone = read("docs/MILESTONE_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");
const runbook = read("docs/RUNBOOK_M90_LIVING_VERIFICATION_ACCEPTANCE_CONVERGENCE.md");
const scriptGuide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const primer = read("docs/PRIMER_SSOT.md");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");

if (state.latestMasterPack === 89) ok("state latestMasterPack locked to M89");
else fail("state latestMasterPack locked to M89");

if (state.phaseDefaults?.packLivingTo === 89 && state.phaseDefaults?.verifyLivingRuntimeTo === 89) ok("state phase defaults keep living runtime upper route at M89");
else fail("state phase defaults keep living runtime upper route at M89");

if ((state.activeMilestones || []).includes("M90") && (state.activeMilestones || []).includes("M90B.1")) ok("state tracks M90 and M90B.1 as active milestones");
else fail("state tracks M90 and M90B.1 as active milestones");

expectIncludes(pack, 'INFO Visible phases: M0->M41 | M42->M58 | M59->M66 | M67->M75 | M76A-1 | M76B | M76A-2 | M77 | M78 | M79 | M80 | M81 | M82.1 | M82.8 | M82.9->M82.11 | M83 | M84 | M85 | M86 | M87 | M88 | M89', 'master pack exposes canonical upper route through M89');
expectIncludes(packLiving, '& $master -To $To -RepoDir $RepoRoot', 'pack_living delegates to master pack with explicit repo root');
expectIncludes(verifyRuntime, "& (Join-Path $ScriptRoot 'pack_living.ps1') -To $To", 'verify_living_runtime delegates runtime proof to pack_living');
expectIncludes(repoAudit, '".prisma"', 'repo audit counts prisma files in text visibility');
expectIncludes(repoAudit, '".sql"', 'repo audit counts sql files in text visibility');
expectIncludes(repoAudit, 'largeFileWarnThreshold = 1000', 'repo audit keeps hot file warning threshold');
expectIncludes(repoAudit, 'largeFileBlockThreshold = 1200', 'repo audit keeps large file block threshold');
expectIncludes(repoAudit, 'warningHotFiles', 'repo audit publishes warning hot files list');

if (!exists('backend/src/ai/chat/helpComposerFlowSupport.js') && !exists('backend/src/ai/chat/helpComposerEntitySupport.js') && !exists('backend/src/ai/chat/helpComposerSelectedSupport.js')) ok('dead helpComposer split remnants are absent');
else fail('dead helpComposer split remnants are absent');

expectIncludes(registry, 'M90B.1', 'registry records M90B.1 closure gate');
expectIncludes(backlog, 'M90B.1', 'backlog points to M90B.1 as immediate closure gate');
expectIncludes(milestone, 'M90B.1', 'M90 milestone doc names executable closure gate');
expectIncludes(runbook, 'pack_m90_b1_canonical_closure_gate.ps1', 'M90 runbook exposes executable closure gate command');
expectIncludes(scriptGuide, 'M90B.1', 'script guide includes M90B.1 route');
expectIncludes(primer, 'M90B.1', 'primer tracks M90B.1 closure gate');
expectIncludes(toolsReadme, 'pack_m90_b1_canonical_closure_gate.ps1', 'tools readme exposes M90B.1 command');
expectIncludes(toolsPrimer, 'pack_m90_b1_canonical_closure_gate.ps1', 'tools primer exposes M90B.1 command');

if (process.exitCode) process.exit(process.exitCode);
console.log('M90B.1 CANONICAL CLOSURE GATE CHECK PASS');
