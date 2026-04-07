import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');


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
const toolsDir = path.join(repoRoot, 'tools');
const artifactDir = path.join(repoRoot, 'artifacts', 'normalization');

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function listFiles(dir, prefix) {
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith(prefix))
    .sort();
}

function ok(message) {
  console.log(`OK ${message}`);
}

function fail(message) {
  throw new Error(`FAIL ${message}`);
}

console.log('=== M76A-1 MINIMUM NORMALIZATION CHECK ===');

const packFiles = listFiles(toolsDir, 'pack_').filter((name) => name.endsWith('.ps1'));
const checkFiles = listFiles(toolsDir, 'check_').filter((name) => name.endsWith('.ps1'));
const manifest = JSON.parse(fs.readFileSync(path.join(toolsDir, 'milestone_pack_manifest.json'), 'utf8'));
const manifestPackStages = (manifest.stages || []).filter((stage) => stage && stage.kind === 'pack');
const manifestGroups = [...new Set(manifestPackStages.map((stage) => Number(stage.group)).filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
const manifestScripts = new Set(manifestPackStages.map((stage) => stage.script));

const canonicalHelpers = [
  'tools/_console_status.ps1',
  'tools/_manifest_pack_helpers.ps1',
  'tools/_pack_runner.ps1',
  'tools/_repo_contract_common.ps1',
  'tools/_packs/pack_m67_m75.ps1',
  'tools/_packs/pack_m76_m81.ps1',
  'docs/LIVING_BASELINE_M75.md',
  'docs/RUNBOOK_M76A_1_MINIMUM_NORMALIZATION.md',
  'docs/MILESTONE_M76A_1_MINIMUM_NORMALIZATION.md'
];

for (const rel of canonicalHelpers) {
  if (!fs.existsSync(path.join(repoRoot, rel))) {
    fail(`${rel} exists`);
  }
  ok(`${rel} exists`);
}

const requiredGroups = [67, 68, 69, 70, 71, 72, 73, 74, 75, 76];
for (const group of requiredGroups) {
  if (!manifestGroups.includes(group)) {
    fail(`manifest contains group ${group}`);
  }
  ok(`manifest contains group ${group}`);
}

const expectedManifestScripts = [
  'tools/pack_m67_kurumsal_olcek_hazirlik.ps1',
  'tools/pack_m68_fetch_hardening.ps1',
  'tools/pack_m69_fetch_hardening_phase2.ps1',
  'tools/pack_m70_checker_sync_hot_path.ps1',
  'tools/pack_m71_summary_hotpath.ps1',
  'tools/pack_m72_hot_endpoint_reduction.ps1',
  'tools/pack_m73_hot_path_phase2.ps1',
  'tools/pack_m74_hot_path_phase3.ps1',
  'tools/pack_m75_hot_path_phase4.ps1',
  'tools/pack_m76a_1_minimum_normalization.ps1'
];
for (const rel of expectedManifestScripts) {
  if (!manifestScripts.has(rel)) {
    fail(`manifest registers ${rel}`);
  }
  ok(`manifest registers ${rel}`);
}

const packPs1 = read('tools/pack.ps1');
if (!includesText(packPs1, 'M67 -> M{0}') || !includesText(packPs1, 'pack_m67_m75.ps1')) {
  fail('master pack includes M67-M75 phase');
}
ok('master pack includes M67-M75 phase');
if (!includesText(packPs1, 'M76 -> M{0}') || !includesText(packPs1, 'pack_m76_m81.ps1')) {
  fail('master pack includes M76+ phase');
}
ok('master pack includes M76+ phase');
if (!includesText(packPs1, 'M76A-1')) {
  fail('master pack visible phase note mentions M76A-1');
}
ok('master pack visible phase note mentions M76A-1');

const commonHelperChecks = checkFiles.filter((name) => read(path.join('tools', name)).includes('_repo_contract_common.ps1'));
const hardcodedRepoRootFiles = [];
for (const name of [...packFiles, ...checkFiles]) {
  const rel = path.join('tools', name);
  const content = read(rel);
  if (/RepoRoot\s*=\s*["']D:\\servis-platform["']/i.test(content) || /RepoDir\s*=\s*["']D:\\servis-platform["']/i.test(content)) {
    hardcodedRepoRootFiles.push(rel.replace(/\\/g, '/'));
  }
}
if (hardcodedRepoRootFiles.length > 0) {
  fail(`hardcoded RepoRoot defaults remain: ${hardcodedRepoRootFiles.join(', ')}`);
}
ok('hardcoded RepoRoot defaults removed from pack/check parameter defaults');

const livingBaseline = read('docs/LIVING_BASELINE_M75.md');
const targetedHotfixes = [
  'pack_m71_room_title_hotfix.ps1',
  'pack_m71_workflow_loadsummary_hotfix.ps1',
  'pack_m71_ui_contract_hotfix.ps1',
  'pack_m72_georeview_token_hotfix.ps1',
  'pack_m75_repo_contract_hotfix.ps1'
];
for (const file of targetedHotfixes) {
  if (!includesText(livingBaseline, file)) {
    fail(`living baseline lists ${file}`);
  }
  ok(`living baseline lists ${file}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  repoRoot,
  summary: {
    packScriptCount: packFiles.length,
    checkScriptCount: checkFiles.length,
    manifestPackStageCount: manifestPackStages.length,
    manifestGroups,
    commonHelperCheckCount: commonHelperChecks.length,
    hardcodedRepoRootFileCount: hardcodedRepoRootFiles.length
  },
  manifestScripts: Array.from(manifestScripts).sort(),
  targetedHotfixPacks: targetedHotfixes.map((name) => `tools/${name}`),
  hardcodedRepoRootFiles,
  commonHelperChecks: commonHelperChecks.map((name) => `tools/${name}`)
};

fs.mkdirSync(artifactDir, { recursive: true });
const reportPath = path.join(artifactDir, 'm76a_1_normalization_latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`INFO common helper repo-contract count = ${commonHelperChecks.length}`);
console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
console.log('=== M76A-1 MINIMUM NORMALIZATION CHECK PASS ===');
