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

const state = readRepoContractState();

console.log('=== M77 KVKK + UYUM KATMANI CHECK ===');

const required = [
  'backend/scripts/m77_kvkk_uyum_katmani_check.js',
  'backend/src/kvkk/matrix.js',
  'backend/src/kvkk/enforcement.js',
  'backend/src/kvkk/retention.js',
  'backend/src/routes/kvkk.js',
  'backend/src/routes/live.js',
  'backend/src/routes/parent.js',
  'backend/src/routes/me.js',
  'backend/src/routes/schoolParentInvites.js',
  'backend/src/routes/companyPersonels.js',
  'backend/src/routes/vehicles.js',
  'backend/src/routes/auth_step2.js',
  'backend/src/routes/logs.js',
  'backend/src/routes/admin_logs.js',
  'backend/src/routes/shifts/shared.js',
  'tools/pack_m77_kvkk_uyum_katmani.ps1',
  'tools/check_m77_kvkk_uyum_katmani_repo_contract.ps1',
  'docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md',
  'docs/MILESTONE_M77_KVKK_UYUM_KATMANI.md',
  'docs/KVKK_VERI_GORUNURLUK_MATRISI_V1.md',
  'docs/KVKK_AYDINLATMA_ENVANTERI_V1.md',
  'docs/KVKK_RETENTION_ANONIMLESTIRME_V1.md',
  'docs/KVKK_AUDIT_ERISIM_IZI_V1.md',
  'docs/KVKK_ENFORCEMENT_YUZEYI_V1.md',
  'docs/KVKK_REDACTION_ENFORCEMENT_V1.md',
  'docs/KVKK_ROLE_PAYLOAD_DARALTMA_V1.md',
  'docs/KVKK_RETENTION_ENFORCEMENT_V1.md',
  'docs/KVKK_EXPORT_ERISIM_IZI_V1.md'
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

const matrixJs = read('backend/src/kvkk/matrix.js');
for (const needle of ['PARENT', 'KVKK_BUSINESS_DOMAINS', 'school-domain', "sürücünün telefon GPS'i"]) {
  if (!includesText(matrixJs, needle)) fail(`matrix covers ${needle}`);
  ok(`matrix covers ${needle}`);
}

const enforcement = read('backend/src/kvkk/enforcement.js');
for (const needle of ['KVKK_ENFORCEMENT_VERSION', 'KVKK_EXACT_GPS_ROLES', 'KVKK_MASKED_GPS_ROLES', 'sanitizeVehicleLiveItem', 'sanitizeParentChildItem', 'sanitizeSessionItem', 'sanitizeInviteItem', 'sanitizeCompanyPersonelItem', 'sanitizeOperationEventMeta', 'sanitizeLogRow', 'sanitizeShiftActorLabel', 'sanitizeAuthInviteListItem', 'sanitizeShiftParticipantPayload', 'sanitizeVehicleDirectoryItem', 'trackedAuditEvents', 'buildKvkkEnforcementSummary']) {
  if (!includesText(enforcement, needle)) fail(`enforcement helper covers ${needle}`);
  ok(`enforcement helper covers ${needle}`);
}


const retention = read('backend/src/kvkk/retention.js');
for (const needle of ['KVKK_RETENTION_VERSION', 'KVKK_ANONYMIZE_TARGETS', 'buildKvkkRetentionEnforcementSummary', 'buildKvkkRetentionRunAuditMeta', 'buildKvkkExportAuditMeta', 'ApiRequest', 'AuditLog', 'GpsPoint', 'LOG_EXPORT', 'RETENTION_RUN']) {
  if (!includesText(retention, needle)) fail(`retention helper covers ${needle}`);
  ok(`retention helper covers ${needle}`);
}

const kvkkRoute = read('backend/src/routes/kvkk.js');
for (const needle of ['buildKvkkEnforcementSummary', 'enforcement: buildKvkkEnforcementSummary()', 'buildKvkkRetentionEnforcementSummary', 'retention: buildKvkkRetentionEnforcementSummary()', 'r.get("/retention"']) {
  if (!includesText(kvkkRoute, needle)) fail(`kvkk route covers ${needle}`);
  ok(`kvkk route covers ${needle}`);
}

const liveRoute = read('backend/src/routes/live.js');
for (const needle of ['sanitizeVehicleLiveItem', 'role: u.role']) {
  if (!includesText(liveRoute, needle)) fail(`live route covers ${needle}`);
  ok(`live route covers ${needle}`);
}

const parentRoute = read('backend/src/routes/parent.js');
for (const needle of ['sanitizeParentChildItem', 'sanitizeVehicleLiveItem(v, { role: "PARENT" })']) {
  if (!includesText(parentRoute, needle)) fail(`parent route covers ${needle}`);
  ok(`parent route covers ${needle}`);
}

const meRoute = read('backend/src/routes/me.js');
for (const needle of ['sanitizeSessionItem']) {
  if (!includesText(meRoute, needle)) fail(`me route covers ${needle}`);
  ok(`me route covers ${needle}`);
}

const schoolInvites = read('backend/src/routes/schoolParentInvites.js');
for (const needle of ['sanitizeInviteItem', 'sanitizeAuditMeta']) {
  if (!includesText(schoolInvites, needle)) fail(`school invite route covers ${needle}`);
  ok(`school invite route covers ${needle}`);
}

const companyPersonels = read('backend/src/routes/companyPersonels.js');
for (const needle of ['sanitizeCompanyPersonelItem', 'businessDomain']) {
  if (!includesText(companyPersonels, needle)) fail(`company personels route covers ${needle}`);
  ok(`company personels route covers ${needle}`);
}

const vehiclesRoute = read('backend/src/routes/vehicles.js');
for (const needle of ['sanitizeVehicleDirectoryItem', 'items.map((x) => sanitizeVehicleDirectoryItem(x, { role: u.role }))', 'vehicle: sanitizeVehicleDirectoryItem(updated, { role: u.role })']) {
  if (!includesText(vehiclesRoute, needle)) fail(`vehicles route covers ${needle}`);
  ok(`vehicles route covers ${needle}`);
}

const authInvitesRoute = read('backend/src/routes/auth_step2.js');
for (const needle of ['AUTH_INVITE_REMOVED']) {
  if (!includesText(authInvitesRoute, needle)) fail(`legacy auth invite route handling covers ${needle}`);
  ok(`legacy auth invite route handling covers ${needle}`);
}

const logsRoute = read('backend/src/routes/logs.js');
for (const needle of ['sanitizeLogRow', 'GET /api/logs/export', 'rowsToTxt', 'buildKvkkExportAuditMeta']) {
  if (!includesText(logsRoute, needle)) fail(`logs route covers ${needle}`);
  ok(`logs route covers ${needle}`);
}

const adminLogsRoute = read('backend/src/routes/admin_logs.js');
for (const needle of ['maskEmail', 'maskIp', 'sanitizeLogText', 'buildKvkkExportAuditMeta']) {
  if (!includesText(adminLogsRoute, needle)) fail(`admin logs route covers ${needle}`);
  ok(`admin logs route covers ${needle}`);
}

const adminRoute = read('backend/src/routes/admin.js');
for (const needle of ['buildKvkkRetentionRunAuditMeta', 'buildKvkkRetentionEnforcementSummary()', 'action: "RETENTION_RUN"', 'kvkkRetention: buildKvkkRetentionEnforcementSummary()']) {
  if (!includesText(adminRoute, needle)) fail(`admin route covers ${needle}`);
  ok(`admin route covers ${needle}`);
}

const shiftsShared = read('backend/src/routes/shifts/shared.js');
for (const needle of ['sanitizeOperationEventMeta', 'operation-events']) {
  if (!includesText(shiftsShared, needle)) fail(`shift shared route covers ${needle}`);
  ok(`shift shared route covers ${needle}`);
}

const runbook = read('docs/RUNBOOK_M77_KVKK_UYUM_KATMANI.md');
for (const needle of ['M77.2 enforcement skeleton', 'M77.3 payload daraltma + redaction', 'M77.5 retention / anonymize / export trail', 'driver/parent dışındaki roller için zorunlu consent enforcement']) {
  if (!includesText(runbook, needle)) fail(`runbook covers ${needle}`);
  ok(`runbook covers ${needle}`);
}

const enforcementDoc = read('docs/KVKK_ENFORCEMENT_YUZEYI_V1.md');
for (const needle of ['GET /api/parent/children', 'phoneMasked', 'GET /api/live/vehicles', 'gpsLast.lat/lng', 'GET /api/me/sessions', 'GET /api/admin/logs/export']) {
  if (!includesText(enforcementDoc, needle)) fail(`enforcement doc covers ${needle}`);
  ok(`enforcement doc covers ${needle}`);
}

const redactionDoc = read('docs/KVKK_REDACTION_ENFORCEMENT_V1.md');
for (const needle of ['ham `email` yerine `emailMasked`', 'ham `ip` yerine `ipMasked`', 'SUPER_ADMIN`, `ROOM`, `DRIVER`', 'Company.kind = SCHOOL', 'preview ve export aynı redaction helper']) {
  if (!includesText(redactionDoc, needle)) fail(`redaction doc covers ${needle}`);
  ok(`redaction doc covers ${needle}`);
}

const rolePayloadDoc = read('docs/KVKK_ROLE_PAYLOAD_DARALTMA_V1.md');
for (const needle of ['GET /api/auth/parent-invite/info', 'tokenHash', 'GET /api/vehicles', 'GET /api/shifts', 'GET /api/admin/logs/export']) {
  if (!includesText(rolePayloadDoc, needle)) fail(`role payload doc covers ${needle}`);
  ok(`role payload doc covers ${needle}`);
}

const retentionDoc = read('docs/KVKK_RETENTION_ENFORCEMENT_V1.md');
for (const needle of ['API_REQUEST_RETENTION_DAYS = 730', 'AUDIT_LOG_RETENTION_DAYS = 730', 'GPS_POINT_RETENTION_DAYS = 0', 'GET /api/kvkk/retention', 'buildKvkkRetentionRunAuditMeta()']) {
  if (!includesText(retentionDoc, needle)) fail(`retention doc covers ${needle}`);
  ok(`retention doc covers ${needle}`);
}

const exportTrailDoc = read('docs/KVKK_EXPORT_ERISIM_IZI_V1.md');
for (const needle of ['LOG_EXPORT', 'RETENTION_RUN', 'buildKvkkExportAuditMeta()', 'GET /api/logs/export', 'GET /api/admin/logs/export']) {
  if (!includesText(exportTrailDoc, needle)) fail(`export trail doc covers ${needle}`);
  ok(`export trail doc covers ${needle}`);
}

if (!(Number(state.latestHistoricalMasterPack || state.latestMasterPack) === 79)) fail('state latest historical master pack is 79');
ok('state latest historical master pack is 79');
if (String(state.historicalNextMilestone || state.nextMilestone || '') !== 'M80') fail('state historical next milestone is M80');
ok('state historical next milestone is M80');
if (!Array.isArray(state.activeMilestones) || !state.activeMilestones.includes('M77')) fail('state keeps M77 active history');
ok('state keeps M77 active history');
if (!(state.runtimeJsonStores?.transactionalUpdate === true && state.runtimeJsonStores?.trackedRuntimeFiles === false)) fail('state records runtime json store policy');
ok('state records runtime json store policy');

const report = {
  generatedAt: new Date().toISOString(),
  stage: 'M77',
  kind: 'retention-export-trail-enforcement',
  focus: [
    'role vs business domain distinction',
    'field-level visibility matrix',
    'payload narrowing and masking',
    'log/export redaction',
    'retention / anonymize enforcement',
    'export audit trail enforcement'
  ],
  manifest: {
    id: m77.id,
    group: m77.group,
    script: m77.script,
    check: m77.check,
    runbook: m77.runbook,
    checklist: m77.checklist
  }
};

fs.mkdirSync(artifactDir, { recursive: true });
const reportPath = path.join(artifactDir, 'm77_kvkk_uyum_katmani_latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`INFO report => ${path.relative(repoRoot, reportPath).replace(/\\/g, '/')}`);
console.log('=== M77 KVKK + UYUM KATMANI CHECK PASS ===');



