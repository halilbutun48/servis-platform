import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const artifactDir = path.join(repoRoot, 'artifacts', 'consolidation');

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}
function ok(message) { console.log(`OK ${message}`); }
function fail(message) { throw new Error(`FAIL ${message}`); }
function exists(rel) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) fail(`${rel} exists`);
  ok(`${rel} exists`);
}

console.log('=== M76B LIVING MATRIX + TOOLS CONSOLIDATION CHECK ===');

const required = [
  'tools/pack_living.ps1',
  'tools/verify_living_static.ps1',
  'tools/verify_living_runtime.ps1',
  'tools/packs/living/pack_phase_m0_m41.ps1',
  'tools/packs/living/pack_phase_m42_m58.ps1',
  'tools/packs/living/pack_phase_m59_m66.ps1',
  'tools/packs/living/pack_phase_m67_m75.ps1',
  'tools/checks/living/check_static_repo.ps1',
  'tools/checks/living/check_m67_m75_static.ps1',
  'tools/checks/living/check_living_matrix.ps1',
  'docs/RUNBOOK_M76B_LIVING_MATRIX_TOOLS_CONSOLIDATION.md',
  'docs/MILESTONE_M76B_LIVING_MATRIX_TOOLS_CONSOLIDATION.md'
];
required.forEach(exists);

const packPs = read('tools/pack.ps1');
if (!packPs.includes('M67->M75') && !packPs.includes('M67 -> M{0}')) fail('master pack visible phase mentions M67-M75');
ok('master pack visible phase mentions M67-M75');
if (!packPs.includes('pack_m67_m75.ps1')) fail('master pack calls phase4 wrapper');
ok('master pack calls phase4 wrapper');

const toolsReadme = read('tools/README.md');
if (!toolsReadme.includes('tools\\packs\\living\\')) fail('tools readme documents grouped living packs');
ok('tools readme documents grouped living packs');
if (!toolsReadme.includes('verify_living_static.ps1')) fail('tools readme documents verify_living_static');
ok('tools readme documents verify_living_static');
if (!toolsReadme.includes('check_tools_hygiene_m105.ps1')) fail('tools readme hygiene check sync');
ok('tools readme hygiene check sync');

const manifest = JSON.parse(read('tools/milestone_pack_manifest.json'));
const stages = (manifest.stages || []).filter((s) => s && s.kind === 'pack');
const groups = [...new Set(stages.map((s) => Number(s.group)).filter(Number.isFinite))].sort((a, b) => a - b);
if (!groups.includes(76)) fail('manifest contains group 76');
ok('manifest contains group 76');
const scripts = new Set(stages.map((s) => s.script));
['tools/pack_m76a_1_minimum_normalization.ps1', 'tools/pack_m76b_living_matrix_tools_consolidation.ps1'].forEach((rel) => {
  if (!scripts.has(rel)) fail(`manifest registers ${rel}`);
  ok(`manifest registers ${rel}`);
});

const toolRootFiles = fs.readdirSync(path.join(repoRoot, 'tools')).filter((n) => /^pack_m\d+.*\.ps1$/.test(n) || /^check_m\d+.*\.ps1$/.test(n));
const packRootCount = toolRootFiles.filter((n) => n.startsWith('pack_')).length;
const checkRootCount = toolRootFiles.filter((n) => n.startsWith('check_')).length;
ok(`tools root pack/check inventory counted (${packRootCount} pack, ${checkRootCount} check)`);

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    packRootCount,
    checkRootCount,
    manifestGroups: groups,
    groupedEntryPoints: required.filter((r) => r.startsWith('tools/'))
  },
  rootPackFiles: toolRootFiles.filter((n) => n.startsWith('pack_')).sort(),
  rootCheckFiles: toolRootFiles.filter((n) => n.startsWith('check_')).sort(),
  manifestStages: stages.map((s) => ({ id: s.id, group: s.group, script: s.script }))
};
fs.mkdirSync(artifactDir, { recursive: true });
const reportPath = path.join(artifactDir, 'm76b_living_matrix_tools_consolidation_latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
console.log('=== M76B LIVING MATRIX + TOOLS CONSOLIDATION CHECK PASS ===');
