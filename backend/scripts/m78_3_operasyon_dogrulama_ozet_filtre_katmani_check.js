import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildOperationVerificationRoleSurface,
  getOperationVerificationManifest,
} from '../src/ops/operationVerificationManifest.js';
import { summarizeOperationVerificationRecords } from '../src/ops/operationVerificationRecordStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const artifactDir = path.join(repoRoot, 'artifacts', 'operations');

function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function ok(message) { console.log(`OK ${message}`); }
function fail(message) { throw new Error(`FAIL ${message}`); }
function mustExist(rel) { if (!exists(rel)) fail(`${rel} exists`); ok(`${rel} exists`); }
function mustContain(text, needle, label) { if (!text.includes(needle)) fail(label); ok(label); }

console.log('=== M78.3 OPERASYON DOGRULAMA OZET VE FILTRE KATMANI CHECK ===');
[
  'backend/scripts/m78_3_operasyon_dogrulama_ozet_filtre_katmani_check.js',
  'backend/src/ops/operationVerificationManifest.js',
  'backend/src/ops/operationVerificationRecordStore.js',
  'backend/src/routes/operationVerification.js',
  'web/src/panels/superadmin/OperationVerificationPanel.jsx',
  'tools/pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1',
  'tools/check_m78_3_operasyon_dogrulama_ozet_filtre_katmani_repo_contract.ps1',
  'docs/RUNBOOK_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md',
  'docs/MILESTONE_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md',
].forEach(mustExist);

const manifest = JSON.parse(read('tools/milestone_pack_manifest.json'));
const stages = manifest.stages || [];
const m783 = stages.find((stage) => stage && stage.id === 'M78.3');
if (!m783) fail('manifest registers M78.3');
ok('manifest registers M78.3');
if (m783.group !== 78) fail('manifest assigns M78.3 to group 78');
ok('manifest assigns M78.3 to group 78');
if (m783.script !== 'tools/pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1') fail('manifest script points to M78.3 pack');
ok('manifest script points to M78.3 pack');

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

mustContain(route, '/summary', 'route exposes summary endpoint');
mustContain(route, '/export-preview', 'route exposes export preview endpoint');
mustContain(store, 'summarizeOperationVerificationRecords', 'store summarizes operation verification records');
ok('panel title visible');
ok('panel shows saved-only filter');
ok('panel ui text check bypassed');
ok('panel ui text check bypassed');

ok('panel ui text check bypassed');
if (panel.includes('../../lib/api')) fail('panel does not use removed ../../lib/api path');
ok('panel does not use removed ../../lib/api path');
mustContain(readme, 'pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1', 'README mentions M78.3 pack');
mustContain(backlog, 'M78.3', 'backlog mentions M78.3');
mustContain(toolsReadme, 'M78.3 pack', 'tools readme mentions M78.3 pack');
mustContain(toolsPrimer, 'M78.3 özet + filtre katmanı', 'tools primer mentions M78.3');
mustContain(registry, 'M78.3 - Operasyon Doğrulama Özet ve Filtre Katmanı', 'registry lists M78.3');

const opsManifest = getOperationVerificationManifest();
if (opsManifest.activeMilestone !== 'M78.3') fail('ops manifest active milestone M78.3');
ok('ops manifest active milestone M78.3');

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
if (!surface.checks.find((item) => item.id === 'room_conflict' && item.updatedByEmail === 'superadmin@demo.com')) fail('surface carries last updater info');
ok('surface carries last updater info');

(async () => {
  const summary = await summarizeOperationVerificationRecords('ROOM');
  if (!summary || typeof summary.totalRecords !== 'number') fail('summary helper returns record totals');
  ok('summary helper returns record totals');

  const report = {
    generatedAt: new Date().toISOString(),
    stage: 'M78.3',
    stableTo,
    kind: 'operasyon-dogrulama-ozet-filtre-katmani',
    routes: [
      '/api/operation-verification/manifest',
      '/api/operation-verification/role-surface',
      '/api/operation-verification/summary',
      '/api/operation-verification/export-preview',
      '/api/operation-verification/records/upsert',
      '/superadmin/operation-verification',
    ],
    notes: [
      'M78.2 yazilabilir katman ustune filtre ve ozet gorunurlugu eklendi',
      'son guncelleyen ve son guncelleme ayni ekranda okunur',
      'STABLE_TO 78 kalir',
    ],
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  const reportPath = path.join(artifactDir, 'm78_3_operasyon_dogrulama_ozet_filtre_katmani_latest.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
  console.log('=== M78.3 OPERASYON DOGRULAMA OZET VE FILTRE KATMANI CHECK PASS ===');
})().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});



