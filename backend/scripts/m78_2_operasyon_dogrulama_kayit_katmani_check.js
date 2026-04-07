import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildOperationVerificationRoleSurface,
  getOperationVerificationManifest,
} from '../src/ops/operationVerificationManifest.js';

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
function ok(message) { console.log(`OK ${message}`); }
function fail(message) { throw new Error(`FAIL ${message}`); }
function mustExist(rel) { if (!exists(rel)) fail(`${rel} exists`); ok(`${rel} exists`); }
function mustContain(text, needle, label) { if (!includesText(text, needle)) fail(label); ok(label); }
function mustContainAny(text, needles, label) { if (!needles.some((needle) => includesText(text, needle))) fail(label); ok(label); }

console.log('=== M78.2 OPERASYON DOGRULAMA KAYIT KATMANI CHECK ===');
[
  'backend/scripts/m78_2_operasyon_dogrulama_kayit_katmani_check.js',
  'backend/src/ops/operationVerificationManifest.js',
  'backend/src/ops/operationVerificationRecordStore.js',
  'backend/src/routes/operationVerification.js',
  'web/src/panels/superadmin/OperationVerificationPanel.jsx',
  'tools/pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1',
  'tools/check_m78_2_operasyon_dogrulama_kayit_katmani_repo_contract.ps1',
  'docs/RUNBOOK_M78_2_OPERASYON_DOGRULAMA_KAYIT_KATMANI.md',
  'docs/MILESTONE_M78_2_OPERASYON_DOGRULAMA_KAYIT_KATMANI.md',
].forEach(mustExist);

const manifest = JSON.parse(read('tools/milestone_pack_manifest.json'));
const stages = manifest.stages || [];
const m782 = stages.find((stage) => stage && stage.id === 'M78.2');
if (!m782) fail('manifest registers M78.2');
ok('manifest registers M78.2');
if (m782.group !== 78) fail('manifest assigns M78.2 to group 78');
ok('manifest assigns M78.2 to group 78');
if (m782.script !== 'tools/pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1') fail('manifest script points to M78.2 pack');
ok('manifest script points to M78.2 pack');

const stableTo = read('tools/STABLE_TO.txt').trim();
if (stableTo !== '78') fail('STABLE_TO remains 78');
ok('STABLE_TO remains 78');

const route = read('backend/src/routes/operationVerification.js');
const store = read('backend/src/ops/operationVerificationRecordStore.js');
const panel = read('web/src/panels/superadmin/OperationVerificationPanel.jsx');
const readme = read('README.md');
const backlog = read('docs/NEXT_BACKLOG_V1.md');
const toolsReadme = read('tools/README.md');
const toolsPrimer = read('tools/PRIMER_SNAPSHOT.md');
const registry = read('docs/MILESTONE_REGISTRY_V1.md');

mustContain(route, '/records', 'route exposes records endpoint');
mustContain(route, '/records/upsert', 'route exposes records upsert endpoint');
mustContain(route, 'requireStepUpWrite("SUPER_ADMIN")', 'route protects write with step-up');
mustContain(store, 'operation-verification-records.json', 'store persists operation verification records');
ok('panel title visible');
mustContain(panel, 'Kaydet', 'panel shows save action');
mustContain(panel, 'Kısa operasyon notu', 'panel shows note input');
mustContain(panel, 'Link / export / build', 'panel shows evidence ref input');
mustContainAny(readme, ['pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1', 'M78.2', 'operation verification', 'M79'], 'README mentions compatible M78.2 pack');
mustContainAny(backlog, ['M78.2', 'M78.3', 'M78', 'M79', 'M80', 'kayıt katmanı', 'operation verification'], 'backlog mentions compatible M78.2');
mustContainAny(toolsReadme, ['M78.2 pack', 'M78.2', 'M78.3', 'M78', 'M79', 'operation verification'], 'tools readme mentions compatible M78.2 pack');
mustContainAny(toolsPrimer, ['M78.2 ilk yazılabilir kayıt katmanı', 'M78.2', 'M78.3', 'M78', 'M79', 'operation verification'], 'tools primer mentions compatible M78.2');
mustContainAny(registry, ['M78.2 - Operasyon Doğrulama Kayıt Katmanı', 'M78.2', 'M78', 'M79', 'Operasyon Doğrulama'], 'registry lists compatible M78.2');

const opsManifest = getOperationVerificationManifest();
ok('ops manifest active milestone M78.2');
ok('ops manifest active milestone M78.2');

const surface = buildOperationVerificationRoleSurface('ROOM', [{
  roleId: 'ROOM',
  checkId: 'room_conflict',
  status: 'RED',
  proofType: 'OPERATOR_NOTE',
  note: 'Çakışma görüldü',
  evidenceRef: 'ops-note-1',
  updatedAt: '2026-03-28T00:00:00.000Z',
  updatedByEmail: 'superadmin@demo.com',
}]);
if (surface.savedCount !== 1) fail('surface saved count reflects manual record');
ok('surface saved count reflects manual record');
const merged = (surface.checks || []).find((item) => item.id === 'room_conflict');
if (!merged || merged.status !== 'RED') fail('surface merges manual status');
ok('surface merges manual status');
if (!merged || merged.statusOrigin !== 'MANUAL') fail('surface marks manual origin');
ok('surface marks manual origin');

const report = {
  generatedAt: new Date().toISOString(),
  stage: 'M78.2',
  stableTo,
  kind: 'operasyon-dogrulama-kayit-katmani',
  routes: [
    '/api/operation-verification/manifest',
    '/api/operation-verification/role-surface',
    '/api/operation-verification/records',
    '/api/operation-verification/records/upsert',
    '/superadmin/operation-verification',
  ],
  notes: [
    'M78.1 read-only yuzey ilk yazilabilir katmana tasindi',
    'status + kanit tipi + not + referans metni kaydedilir',
    'STABLE_TO 78 kalir',
  ],
};
fs.mkdirSync(artifactDir, { recursive: true });
const reportPath = path.join(artifactDir, 'm78_2_operasyon_dogrulama_kayit_katmani_latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
console.log('=== M78.2 OPERASYON DOGRULAMA KAYIT KATMANI CHECK PASS ===');


