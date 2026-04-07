import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readRepoContractState } from './_repoContractState.js';

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
const artifactDir = path.join(repoRoot, 'artifacts', 'operations');

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

function mustContain(text, needle, label) {
  if (!includesText(text, needle)) fail(label);
  ok(label);
}

function mustContainAny(text, needles, label) {
  if (!needles.some((needle) => includesText(text, needle))) fail(label);
  ok(label);
}

const state = readRepoContractState();

console.log('=== M78 CHECKLIST + OPERASYON DOGRULAMA CHECK ===');

const required = [
  'backend/scripts/m78_checklist_operasyon_dogrulama_check.js',
  'tools/pack_m78_checklist_operasyon_dogrulama.ps1',
  'tools/check_m78_checklist_operasyon_dogrulama_repo_contract.ps1',
  'docs/RUNBOOK_M78_CHECKLIST_OPERASYON_DOGRULAMA.md',
  'docs/MILESTONE_M78_CHECKLIST_OPERASYON_DOGRULAMA.md',
  'docs/SAHA_KABUL_CHECKLISTLERI_V1.md',
  'docs/ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md',
  'docs/KANIT_PROOF_KONTROL_OMURGASI_V1.md',
  'docs/KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md'
];
required.forEach(mustExist);

const manifest = JSON.parse(read('tools/milestone_pack_manifest.json'));
const stages = manifest.stages || [];
const m78 = stages.find((stage) => stage && stage.id === 'M78');
if (!m78) fail('manifest registers M78');
ok('manifest registers M78');
if (m78.group !== 78) fail('manifest assigns M78 to group 78');
ok('manifest assigns M78 to group 78');
if (m78.script !== 'tools/pack_m78_checklist_operasyon_dogrulama.ps1') fail('manifest script points to M78 pack');
ok('manifest script points to M78 pack');
if (m78.check !== 'tools/check_m78_checklist_operasyon_dogrulama_repo_contract.ps1') fail('manifest check points to M78 repo contract');
ok('manifest check points to M78 repo contract');
if (m78.runbook !== 'docs/RUNBOOK_M78_CHECKLIST_OPERASYON_DOGRULAMA.md') fail('manifest runbook points to M78 runbook');
ok('manifest runbook points to M78 runbook');

const stableTo = read('tools/STABLE_TO.txt').trim();
if (stableTo !== '78') fail('STABLE_TO is 78');
ok('STABLE_TO is 78');

const readme = read('README.md');
const startpack = read('docs/STARTPACK_V1.md');
const checklist = read('docs/CHECKLIST_SSOT.md');
const backlog = read('docs/NEXT_BACKLOG_V1.md');
const registry = read('docs/MILESTONE_REGISTRY_V1.md');
const toolsReadme = read('tools/README.md');
const toolsPrimer = read('tools/PRIMER_SNAPSHOT.md');
const livingStatic = read('tools/checks/living/check_m76_m81_static.ps1');
const packLiving = read('tools/pack_living.ps1');
const verifyLivingRuntime = read('tools/verify_living_runtime.ps1');
const phasePack = read('tools/_packs/pack_m76_m81.ps1');
const phaseWrapper = read('tools/packs/living/pack_phase_m76_m81.ps1');
const packPs = read('tools/pack.ps1');
const runbook = read('docs/RUNBOOK_M78_CHECKLIST_OPERASYON_DOGRULAMA.md');
const milestone = read('docs/MILESTONE_M78_CHECKLIST_OPERASYON_DOGRULAMA.md');
const saha = read('docs/SAHA_KABUL_CHECKLISTLERI_V1.md');
const roleDoc = read('docs/ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md');
const proofDoc = read('docs/KANIT_PROOF_KONTROL_OMURGASI_V1.md');
const flowDoc = read('docs/KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md');
if (Number(state.latestMasterPack) !== 79) fail("state latest master pack is 79");
ok("state latest master pack is 79");
if (Number(state.stableTo) !== 78) fail("state stable_to remains 78");
ok("state stable_to remains 78");
if (String(state.nextMilestone || "") !== "M80") fail("state next milestone is M80");
ok("state next milestone is M80");

mustContainAny(checklist, ['M0 -> M78', 'M0 -> M79', '[x] `M78 — Checklist + Operasyon Doğrulama`', 'master pack marker', 'M79'], 'checklist reflects compatible M78 route');
mustContainAny(backlog, ['operasyon doğrulama iskeleti', 'M78', 'M79', 'M80', 'final sert kabul'], 'backlog states compatible M78 route');
mustContainAny(registry, ['M78 - Checklist + Operasyon Doğrulama', 'M78', 'M80', 'historical overlay series'], 'registry lists compatible M78 route');
mustContainAny(toolsReadme, ['tools\pack.ps1 -To 78', 'tools\pack.ps1 -To 79', 'M78', 'operation verification'], 'tools readme points to compatible M78 route');
mustContainAny(toolsPrimer, ['`tools/STABLE_TO.txt`: `78`', 'STABLE_TO 78', 'M78', 'M79'], 'tools primer shows compatible STABLE_TO 78');
mustContain(livingStatic, 'check_m78_checklist_operasyon_dogrulama_repo_contract.ps1', 'living static includes M78');
mustContainAny(packPs, ['| M77 | M78', 'M77 | M78', 'M77 | M78 | M79', 'Pack max: M79'], 'master pack visible phases mention M78');
mustContainAny(runbook, ['kabul / red / eksik / tekrar kontrol', 'operasyon doğrulama', 'kabul / red'], 'runbook describes status flow');
mustContainAny(milestone, ['kanıt / proof / kontrol omurgası', 'kanıt / proof', 'operasyon doğrulama'], 'milestone describes proof backbone');
mustContainAny(saha, ['KABUL / RED / EKSIK / TEKRAR KONTROL', 'KABUL', 'TEKRAR KONTROL'], 'saha checklist defines statuses');
for (const [text, needle, label] of [
  [roleDoc, 'SUPER_ADMIN', 'role doc covers SUPER_ADMIN'],
  [roleDoc, 'ROOM', 'role doc covers ROOM'],
  [roleDoc, 'COMPANY', 'role doc covers COMPANY'],
  [roleDoc, 'DRIVER', 'role doc covers DRIVER'],
  [roleDoc, 'PERSONEL', 'role doc covers PERSONEL'],
  [roleDoc, 'PARENT', 'role doc covers PARENT'],
  [proofDoc, 'ekran görüntüsü', 'proof doc covers screenshot evidence'],
  [proofDoc, 'log/export izi', 'proof doc covers log/export evidence'],
  [proofDoc, 'cihaz / build bilgisi', 'proof doc covers device/build evidence'],
  [proofDoc, 'operatör notu', 'proof doc covers operator note'],
  [flowDoc, 'KABUL', 'flow doc covers KABUL'],
  [flowDoc, 'RED', 'flow doc covers RED'],
  [flowDoc, 'EKSİK', 'flow doc covers EKSİK'],
  [flowDoc, 'TEKRAR KONTROL', 'flow doc covers TEKRAR KONTROL']
]) {
  mustContain(text, needle, label);
}

mustContainAny(packLiving, ['[int]$To = 79', '[int]$To = 78'], 'pack_living default compatible with living route');
mustContainAny(verifyLivingRuntime, ['[int]$To = 79', '[int]$To = 78'], 'verify_living_runtime default compatible with living route');
mustContainAny(phasePack, ['[int]$To = 79', '[int]$To = 78'], 'phase pack default compatible with living route');
mustContainAny(phaseWrapper, ['[int]$To = 79', '[int]$To = 78'], 'phase wrapper default compatible with living route');

const report = {
  generatedAt: new Date().toISOString(),
  stage: 'M78',
  kind: 'checklist-operasyon-dogrulama-skeleton',
  focus: [
    'saha kabul checklistleri',
    'rol bazli operasyon dogrulama',
    'kanit / proof / kontrol omurgasi',
    'kabul / red / eksik / tekrar kontrol akisi',
    'living wrapper ve manifest baglari'
  ],
  manifest: {
    id: m78.id,
    group: m78.group,
    script: m78.script,
    check: m78.check,
    runbook: m78.runbook,
    checklist: m78.checklist
  }
};

fs.mkdirSync(artifactDir, { recursive: true });
const reportPath = path.join(artifactDir, 'm78_checklist_operasyon_dogrulama_latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
console.log('=== M78 CHECKLIST + OPERASYON DOGRULAMA CHECK PASS ===');
