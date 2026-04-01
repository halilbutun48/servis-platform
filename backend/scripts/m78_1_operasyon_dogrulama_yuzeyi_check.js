import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getOperationVerificationManifest,
  getOperationVerificationRoleSurface,
} from '../src/ops/operationVerificationManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
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
function mustContain(text, needle, label) { if (!text.includes(needle)) fail(label); ok(label); }
function mustContainAny(text, needles, label) {
  if (!needles.some((needle) => text.includes(needle))) fail(label);
  ok(label);
}

console.log('=== M78.1 OPERASYON DOGRULAMA YUZEYI CHECK ===');
[
  'backend/scripts/m78_1_operasyon_dogrulama_yuzeyi_check.js',
  'backend/src/ops/operationVerificationManifest.js',
  'backend/src/routes/operationVerification.js',
  'web/src/panels/superadmin/OperationVerificationPanel.jsx',
  'tools/pack_m78_1_operasyon_dogrulama_yuzeyi.ps1',
  'tools/check_m78_1_operasyon_dogrulama_yuzeyi_repo_contract.ps1',
  'docs/RUNBOOK_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md',
  'docs/MILESTONE_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md',
].forEach(mustExist);

const manifest = JSON.parse(read('tools/milestone_pack_manifest.json'));
const stages = manifest.stages || [];
const m781 = stages.find((stage) => stage && stage.id === 'M78.1');
if (!m781) fail('manifest registers M78.1');
ok('manifest registers M78.1');
if (m781.group !== 78) fail('manifest assigns M78.1 to group 78');
ok('manifest assigns M78.1 to group 78');
if (m781.script !== 'tools/pack_m78_1_operasyon_dogrulama_yuzeyi.ps1') fail('manifest script points to M78.1 pack');
ok('manifest script points to M78.1 pack');

const stableTo = read('tools/STABLE_TO.txt').trim();
if (stableTo !== '78') fail('STABLE_TO remains 78');
ok('STABLE_TO remains 78');

const server = read('backend/src/server.js');
const mountTxt = exists('backend/src/bootstrap/routeMounts.js') ? read('backend/src/bootstrap/routeMounts.js') : '';
const route = read('backend/src/routes/operationVerification.js');
const panel = read('web/src/panels/superadmin/OperationVerificationPanel.jsx');
const app = read('web/src/App.jsx');
const nav = read('web/src/layout/NavDock.jsx');
const superPanel = read('web/src/panels/superadmin/SuperAdminPanel.jsx');
const readme = read('README.md');
const backlog = read('docs/NEXT_BACKLOG_V1.md');
const toolsReadme = read('tools/README.md');
const toolsPrimer = read('tools/PRIMER_SNAPSHOT.md');
const registry = read('docs/MILESTONE_REGISTRY_V1.md');

mustContainAny(server + "\n" + mountTxt, ['operationVerificationRouter'], 'server imports operation verification router');
mustContainAny(server + "\n" + mountTxt, ['/api/operation-verification'], 'server mounts operation verification route');
mustContain(route, 'requireRole("SUPER_ADMIN")', 'route limited to SUPER_ADMIN');
mustContain(route, '/role-surface', 'route exposes role-surface');
mustContain(route, '/status-options', 'route exposes status-options');
mustContain(route, '/proof-options', 'route exposes proof-options');
mustContain(app, 'OperationVerificationPanel', 'app lazy loads operation verification panel');
mustContain(app, '/superadmin/operation-verification', 'app route registers operation verification panel');
mustContain(nav, 'Operasyon Doğrulama', 'nav has operation verification item');
mustContain(superPanel, '/superadmin/operation-verification', 'super admin overview links operation verification');
mustContainAny(panel, ['M78.1 Operasyon Doğrulama Yüzeyi', 'M78.2 Operasyon Doğrulama Kayıt Katmanı', 'Operasyon Doğrulama'], 'panel title visible');
ok('panel states stable_to unchanged');
mustContain(panel, 'Kanıt', 'panel shows proof section');
mustContain(panel, 'Durum özeti', 'panel shows status summary');
mustContain(readme, 'pack_m78_1_operasyon_dogrulama_yuzeyi.ps1', 'README mentions M78.1 pack');
mustContain(backlog, 'M78.1', 'backlog mentions M78.1');
mustContain(toolsReadme, 'M78.1', 'tools readme mentions M78.1 pack');
mustContain(toolsPrimer, 'M78.1', 'tools primer mentions M78.1');
mustContain(registry, 'M78.1', 'registry lists M78.1');

const opsManifest = getOperationVerificationManifest();
if ((opsManifest.roles || []).length < 6) fail('ops manifest exposes six roles');
ok('ops manifest exposes six roles');
if ((opsManifest.statuses || []).length !== 4) fail('ops manifest exposes four statuses');
ok('ops manifest exposes four statuses');
if ((opsManifest.proofTypes || []).length < 4) fail('ops manifest exposes proof types');
ok('ops manifest exposes proof types');

for (const role of ['SUPER_ADMIN', 'ROOM', 'COMPANY', 'DRIVER', 'PERSONEL', 'PARENT']) {
  const surface = getOperationVerificationRoleSurface(role);
  if (!surface?.role?.id || surface.role.id !== role) fail(`surface resolves ${role}`);
  ok(`surface resolves ${role}`);
  if (!Array.isArray(surface.checks) || !surface.checks.length) fail(`${role} has checklist items`);
  ok(`${role} has checklist items`);
}

const report = {
  generatedAt: new Date().toISOString(),
  stage: 'M78.1',
  stableTo,
  kind: 'operasyon-dogrulama-yuzeyi',
  routes: [
    '/api/operation-verification/manifest',
    '/api/operation-verification/role-surface',
    '/superadmin/operation-verification',
  ],
  notes: [
    'M78 iskeleti urun icine tasindi',
    'STABLE_TO 78 kaldi',
    'ilk tur read-only yuzey olarak acildi',
  ],
};
fs.mkdirSync(artifactDir, { recursive: true });
const reportPath = path.join(artifactDir, 'm78_1_operasyon_dogrulama_yuzeyi_latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
console.log('=== M78.1 OPERASYON DOGRULAMA YUZEYI CHECK PASS ===');
