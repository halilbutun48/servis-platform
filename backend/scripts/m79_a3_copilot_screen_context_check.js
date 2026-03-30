import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeScreenState } from '../src/ai/chat/screenStateAnalyzer.js';
import { getScreenDefinitionForUser, listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const fails = [];

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); fails.push(msg); }
function must(cond, msg) { cond ? ok(msg) : fail(msg); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), 'utf8'); }

console.log('=== M79 A3 COPILOT SCREEN CONTEXT CHECK ===');

const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
const agreementsPanel = read('web/src/panels/room/AgreementsPanel.jsx');
const operationHealthPanel = read('web/src/panels/room/OperationHealthPanel.jsx');
const operationVerificationPanel = read('web/src/panels/superadmin/OperationVerificationPanel.jsx');
const acceptancePanel = read('web/src/panels/superadmin/FieldAcceptanceCenter.jsx');
const trustPanel = read('web/src/panels/superadmin/TrustQualityPanel.jsx');
const observabilityPanel = read('web/src/panels/superadmin/ObservabilityPanel.jsx');
const analyzer = read('backend/src/ai/chat/screenStateAnalyzer.js');
const catalog = read('backend/src/ai/jobGuide/screenCatalog.js');

must(copilotPanel.includes('import { getCopilotScreenOptions } from "../../copilot/screenRegistry";'), 'CopilotPanel imports shared screen registry');
must(copilotPanel.includes('return getCopilotScreenOptions(me);'), 'CopilotPanel uses shared screen options');
must(!copilotPanel.includes('const defs = {\n    ROOM:'), 'CopilotPanel local screen option table removed');

must(agreementsPanel.includes("scopeKey: '/room/agreements'"), 'room agreements writes copilot selection');
must(agreementsPanel.includes('buildAgreementCopilotFacts'), 'room agreements builds copilot facts');
must(operationHealthPanel.includes("scopeKey: '/room/operation-health'"), 'operation health writes copilot selection');
must(operationVerificationPanel.includes("scopeKey: '/superadmin/operation-verification'"), 'operation verification writes copilot selection');
must(acceptancePanel.includes("scopeKey: '/superadmin/acceptance'"), 'field acceptance writes copilot selection');
must(trustPanel.includes("scopeKey: '/superadmin/trust-quality'"), 'trust quality writes copilot selection');
must(observabilityPanel.includes("scopeKey: '/superadmin/observability'"), 'observability writes copilot selection');

must(analyzer.includes("if (p.includes('/agreements')) return 'AGREEMENTS';"), 'screen analyzer classifies agreements');
must(analyzer.includes("if (p.includes('/operation-health')) return 'OPERATION_HEALTH';"), 'screen analyzer classifies operation health');
must(analyzer.includes("if (p.includes('/operation-verification')) return 'OPERATION_VERIFICATION';"), 'screen analyzer classifies operation verification');
must(analyzer.includes("if (p.includes('/acceptance')) return 'FIELD_ACCEPTANCE';"), 'screen analyzer classifies field acceptance');
must(analyzer.includes("if (p.includes('/trust-quality')) return 'TRUST_QUALITY';"), 'screen analyzer classifies trust quality');
must(analyzer.includes("if (p.includes('/observability')) return 'OBSERVABILITY';"), 'screen analyzer classifies observability');
must(analyzer.includes('function analyzeAgreements('), 'screen analyzer exports agreements reasoning');
must(analyzer.includes('function analyzeOperationHealth('), 'screen analyzer exports operation health reasoning');
must(analyzer.includes('function analyzeOperationVerification('), 'screen analyzer exports operation verification reasoning');
must(analyzer.includes('function analyzeFieldAcceptance('), 'screen analyzer exports field acceptance reasoning');
must(analyzer.includes('function analyzeTrustQuality('), 'screen analyzer exports trust quality reasoning');
must(analyzer.includes('function analyzeObservability('), 'screen analyzer exports observability reasoning');

must(catalog.includes("screen(1114, \"/room/operation-health\""), 'screen catalog includes room operation health');
must(catalog.includes("screen(6107, '/superadmin/observability'"), 'screen catalog includes observability');
must(catalog.includes("screen(6108, '/superadmin/acceptance'"), 'screen catalog includes acceptance');
must(catalog.includes("screen(6109, '/superadmin/operation-verification'"), 'screen catalog includes operation verification');
must(catalog.includes("screen(6113, '/superadmin/trust-quality'"), 'screen catalog includes trust quality');

const superAdminScreens = listScreensForUser({ role: 'SUPER_ADMIN' }, {});
must(superAdminScreens.some((x) => x.path === '/superadmin/observability'), 'super admin screen list exposes observability');
must(superAdminScreens.some((x) => x.path === '/superadmin/acceptance'), 'super admin screen list exposes acceptance');
must(superAdminScreens.some((x) => x.path === '/superadmin/operation-verification'), 'super admin screen list exposes operation verification');
must(superAdminScreens.some((x) => x.path === '/superadmin/trust-quality'), 'super admin screen list exposes trust quality');

const observabilityDef = getScreenDefinitionForUser({ role: 'SUPER_ADMIN' }, { path: '/superadmin/observability' }, 6107);
must(observabilityDef?.label === 'Canlı İzleme', 'observability screen definition resolves');
const acceptanceDef = getScreenDefinitionForUser({ role: 'SUPER_ADMIN' }, { path: '/superadmin/acceptance' }, 6108);
must(acceptanceDef?.label === 'Kabul Merkezi', 'acceptance screen definition resolves');

function expectType(label, input, expected) {
  const result = analyzeScreenState(input);
  must(result?.type === expected, `${label} => ${expected}`);
  must(Boolean(String(result?.nextBestAction || '').trim()), `${label} has next best action`);
  return result;
}

expectType('agreements reasoning', {
  screenContext: {
    path: '/room/agreements',
    label: 'Sözleşmeler',
    selectedLabel: 'Sözleşme #91',
    selectedFields: [
      { label: 'Durum', value: 'REQUESTED' },
      { label: 'Başlangıç', value: '2026-03-29' },
      { label: 'Bitiş', value: '2026-04-05' },
      { label: 'Araç', value: '-' },
      { label: 'Sürücü', value: '-' },
    ],
  },
  screenDefinition: { path: '/room/agreements', label: 'Sözleşmeler' },
}, 'AGREEMENTS');

expectType('operation health reasoning', {
  screenContext: {
    path: '/room/operation-health',
    label: 'Operasyon Sağlığı',
    selectedLabel: 'Operasyon sağlığı özeti',
    selectedFields: [
      { label: 'Stale / Offline', value: '3' },
      { label: 'Riskli Cihaz', value: '2' },
      { label: 'Açık Sorun', value: '1' },
      { label: 'Örnek Sürücü', value: 'Ahmet' },
    ],
  },
  screenDefinition: { path: '/room/operation-health', label: 'Operasyon Sağlığı' },
}, 'OPERATION_HEALTH');

expectType('operation verification reasoning', {
  screenContext: {
    path: '/superadmin/operation-verification',
    label: 'Operasyon Doğrulama',
    selectedLabel: 'ROOM',
    selectedFields: [
      { label: 'Rol', value: 'ROOM' },
      { label: 'Kayıtlı Kontrol', value: '2' },
      { label: 'Toplam Kontrol', value: '5' },
      { label: 'Varsayılan Karar', value: 'Tekrar kontrol' },
    ],
  },
  screenDefinition: { path: '/superadmin/operation-verification', label: 'Operasyon Doğrulama' },
}, 'OPERATION_VERIFICATION');

expectType('field acceptance reasoning', {
  screenContext: {
    path: '/superadmin/acceptance',
    label: 'Kabul Merkezi',
    selectedLabel: 'Saha kabul özeti',
    selectedFields: [
      { label: 'Karar', value: 'PENDING' },
      { label: 'Checklist', value: '6' },
      { label: 'Bekleyen', value: '2' },
      { label: 'İlk Açık Madde', value: 'Offline/online toparlama' },
    ],
  },
  screenDefinition: { path: '/superadmin/acceptance', label: 'Kabul Merkezi' },
}, 'FIELD_ACCEPTANCE');

expectType('trust quality reasoning', {
  screenContext: {
    path: '/superadmin/trust-quality',
    label: 'Güven ve Kalite',
    selectedLabel: 'Güven ve kalite özeti',
    selectedFields: [
      { label: 'Değerlendirme Alanı', value: '4' },
      { label: 'Sağlayıcı Sinyali', value: '0' },
      { label: 'İlk Sinyal', value: '-' },
    ],
  },
  screenDefinition: { path: '/superadmin/trust-quality', label: 'Güven ve Kalite' },
}, 'TRUST_QUALITY');

const obs = expectType('observability reasoning', {
  screenContext: {
    path: '/superadmin/observability',
    label: 'Canlı İzleme',
    selectedLabel: 'Canlı sağlık özeti',
    selectedFields: [
      { label: 'Canlı Durum', value: 'WARN' },
      { label: 'GPS Skoru', value: '51' },
      { label: 'Cihaz Riski', value: 'medium' },
      { label: 'Son Olay', value: 'gps:stale' },
    ],
  },
  screenDefinition: { path: '/superadmin/observability', label: 'Canlı İzleme' },
}, 'OBSERVABILITY');
must(Array.isArray(obs?.blockers) && obs.blockers.length >= 1, 'observability reasoning yields blockers');

if (fails.length) {
  console.error('CHECK FAIL M79 A3 copilot screen context');
  process.exit(1);
}
console.log('PASS M79 A3 copilot screen context check');
