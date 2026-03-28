import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const artifactDir = path.join(repoRoot, 'artifacts', 'compliance');

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function ok(message) {
  console.log(`OK ${message}`);
}

function fail(message) {
  throw new Error(`FAIL ${message}`);
}

function mustExist(rel) {
  if (!exists(rel)) fail(`${rel} exists`);
  ok(`${rel} exists`);
}

console.log('=== M77 KVKK + UYUM KATMANI CHECK ===');

const required = [
  'backend/scripts/m77_kvkk_uyum_katmani_check.js',
  'tools/pack_m77_kvkk_uyum_katmani.ps1',
  'tools/check_m77_kvkk_uyum_katmani_repo_contract.ps1',
  'docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md',
  'docs/MILESTONE_M77_KVKK_UYUM_KATMANI.md'
];
required.forEach(mustExist);

const manifest = JSON.parse(read('tools/milestone_pack_manifest.json'));
const stages = manifest.stages || [];
const m77 = stages.find((stage) => stage && stage.id === 'M77');
if (!m77) fail('manifest registers M77');
ok('manifest registers M77');
if (m77.group !== 77) fail('manifest assigns M77 to group 77');
ok('manifest assigns M77 to group 77');
if (m77.script !== 'tools/pack_m77_kvkk_uyum_katmani.ps1') fail('manifest script points to M77 pack');
ok('manifest script points to M77 pack');
if (m77.check !== 'tools/check_m77_kvkk_uyum_katmani_repo_contract.ps1') fail('manifest check points to M77 repo contract');
ok('manifest check points to M77 repo contract');

const verifyStatic = read('tools/verify_living_static.ps1');
if (!verifyStatic.includes('check_m76_m81_static.ps1')) fail('verify_living_static links phase M76-M81 static check');
ok('verify_living_static links phase M76-M81 static check');

const phaseStatic = read('tools/checks/living/check_m76_m81_static.ps1');
if (!phaseStatic.includes('check_m77_kvkk_uyum_katmani_repo_contract.ps1')) fail('phase M76-M81 static check links M77 repo contract');
ok('phase M76-M81 static check links M77 repo contract');

const packPs = read('tools/pack.ps1');
if (!packPs.includes('M77')) fail('master pack visible phase note mentions M77');
ok('master pack visible phase note mentions M77');

const toolsReadme = read('tools/README.md');
if (!toolsReadme.includes('pack_m77_kvkk_uyum_katmani.ps1')) fail('tools readme documents M77 pack command');
ok('tools readme documents M77 pack command');

const startpack = read('docs/STARTPACK_V1.md');
for (const needle of ['aydınlatma metinleri', 'veri görünürlük matrisi', 'retention', 'anonimleştirme', 'audit']) {
  if (!startpack.includes(needle)) fail(`startpack mentions ${needle}`);
  ok(`startpack mentions ${needle}`);
}

const runbook = read('docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md');
for (const needle of ['aydınlatma metinleri', 'veri görünürlük matrisi', 'retention / silme / anonimleştirme', 'audit ve erişim izi']) {
  if (!runbook.includes(needle)) fail(`runbook covers ${needle}`);
  ok(`runbook covers ${needle}`);
}

const milestone = read('docs/MILESTONE_M77_KVKK_UYUM_KATMANI.md').toLowerCase();
for (const needle of ['m77', 'kvkk', 'uyum', 'iskelet']) {
  if (!milestone.includes(needle)) fail(`milestone covers ${needle}`);
  ok(`milestone covers ${needle}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  stage: 'M77',
  kind: 'skeleton',
  focus: [
    'aydinlatma metinleri',
    'veri gorunurluk matrisi',
    'retention / silme / anonimlestirme',
    'audit ve erisim izi uyumu'
  ],
  manifest: {
    id: m77.id,
    group: m77.group,
    script: m77.script,
    check: m77.check,
    runbook: m77.runbook,
    checklist: m77.checklist
  },
  linkedStaticChecks: {
    verifyLivingStatic: verifyStatic.includes('check_m76_m81_static.ps1'),
    phaseM76M81Static: phaseStatic.includes('check_m77_kvkk_uyum_katmani_repo_contract.ps1')
  }
};

fs.mkdirSync(artifactDir, { recursive: true });
const reportPath = path.join(artifactDir, 'm77_kvkk_uyum_katmani_latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
console.log('=== M77 KVKK + UYUM KATMANI CHECK PASS ===');
