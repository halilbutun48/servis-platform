#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertProductExtensionsIncludes, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const matrixDocPath = 'docs/COP_LIVE_ACCEPT_01_MATRIX.md';

const COMMON_REQUIRED_CONTEXT = 'conversationState, screen, role, path, selectedLabel, selectedRecordSummary, selectedRecordStatus, selectedRecordLabel, selectedFields, selectedBadges, liveFacts, structuredFacts, contextSummary';
const COMMON_FORBIDDEN = 'generic fallback (Bunu anlayamadım), OperationProof, raw technical/internal code, payment execute, settlement execute, write action';

const SCREEN_GROUPS = [
  { key: 'room-map', role: 'ROOM', screen: 'Canlı Takip', path: '/room/map', visibleLabel: 'Canlı Takip', packNeedles: ['Bu araç neden haritada görünmüyor?'], registryPath: '/room/map', registryLabel: 'Canlı Takip' },
  { key: 'room-operation-health', role: 'ROOM', screen: 'Operasyon Sağlığı', path: '/room/operation-health', visibleLabel: 'Operasyon Sağlığı', packNeedles: ['Operasyon Sağlığı: sorun ne?'], registryPath: '/room/operation-health', registryLabel: 'Operasyon Sağlığı' },
  { key: 'room-agreements', role: 'ROOM', screen: 'Sözleşmeler', path: '/room/agreements', visibleLabel: 'Sözleşmeler', packNeedles: ['Bu ekran ne için var?', 'Bu sözleşmeden bugün vardiya üretildi mi?'], registryPath: '/room/agreements', registryLabel: 'Sözleşmeler' },
  { key: 'room-shifts', role: 'ROOM', screen: 'Vardiyalar', path: '/room/shifts', visibleLabel: 'Vardiyalar', packNeedles: ['Bu vardiya neden başlamıyor?', 'Bu vardiya neden başlayamıyor?'], registryPath: '/room/shifts', registryLabel: 'Vardiyalar' },
  { key: 'company-agreements', role: 'COMPANY', screen: 'Sözleşmeler', path: '/company/agreements', visibleLabel: 'Sözleşmeler', packNeedles: ['Bu sözleşmeden bugün vardiya üretildi mi?'], registryPath: '/company/agreements', registryLabel: 'Sözleşmeler' },
  { key: 'company-shifts', role: 'COMPANY', screen: 'Vardiyalar', path: '/company/shifts', visibleLabel: 'Vardiyalar', packNeedles: ['Bu rolde ne yapabilirim?'], registryPath: '/company/shifts', registryLabel: 'Vardiyalar' },
  { key: 'company-commercial-flow', role: 'COMPANY', screen: 'Ticari Akış', path: '/company/commercial-flow', visibleLabel: 'Ticari Akışım', packNeedles: ['Buradan sonra hangi ekrana geçmeliyim?', 'Bu kayıt neden ilerlemiyor?', 'Hakediş tarafında ne kontrol etmeliyim?'], registryPath: '/company/commercial-flow', registryLabel: 'Ticari Akışım' },
  { key: 'driver-today', role: 'DRIVER', screen: 'Bugün', path: '/driver/today', visibleLabel: 'Bugün', packNeedles: ['Görev neden başlamıyor?'], registryPath: '/driver/today', registryLabel: 'Bugün' },
  { key: 'driver-route', role: 'DRIVER', screen: 'Rota', path: '/driver/route', visibleLabel: 'Rota', packNeedles: ['Rota neden görünmüyor?', 'İlk neyi kontrol etmeliyim?'], registryPath: '/driver/route', registryLabel: 'Rota' },
  { key: 'parent-live', role: 'PARENT', screen: 'Canlı Takip', path: '/parent/live', visibleLabel: 'Canlı', packNeedles: ['Servis neden görünmüyor?', 'Öğrencimin servisi nerede?'], registryPath: '/parent/live', registryLabel: 'Canlı' },
  { key: 'personel-live', role: 'PERSONEL', screen: 'Canlı Takip', path: '/personel/live', visibleLabel: 'Canlı', packNeedles: ['Servisim nerede?', 'Servis neden görünmüyor?'], registryPath: '/personel/live', registryLabel: 'Canlı' },
  { key: 'superadmin-observability', role: 'SUPER_ADMIN', screen: 'Canlı İzleme', path: '/superadmin/observability', visibleLabel: 'Canlı İzleme', packNeedles: ['Bu sistem durumu ne demek?', 'Bu ekran ne için var?'], registryPath: '/superadmin/observability', registryLabel: 'Canlı İzleme' },
  { key: 'superadmin-commercial-core', role: 'SUPER_ADMIN', screen: 'Ticari Akış', path: '/superadmin/commercial-core', visibleLabel: 'Ticari Akış', packNeedles: ['Bu hakediş neden hazır değil?', 'Ödeme neden kapalı?', 'Bu hakediş neden eksik?'], registryPath: '/superadmin/commercial-core', registryLabel: 'Ticari Akış' },
  { key: 'superadmin-acceptance', role: 'SUPER_ADMIN', screen: 'Saha Kabul Merkezi', path: '/superadmin/acceptance', visibleLabel: 'Kabul Merkezi', packNeedles: ['Bu ekran ne için var?'], registryPath: '/superadmin/acceptance', registryLabel: 'Kabul Merkezi' },
];

const ACCEPTANCE_ROWS = [
  {
    role: 'ROOM',
    screen: 'Canlı Takip',
    question: 'Bu araç neden haritada görünmüyor?',
    expectedAnswerSignals: 'plaka veya araç etiketi; son GPS; araç GPS durumu; ETA; görev bağlantısı; Sürücünün telefon GPS’i',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'room-map',
  },
  {
    role: 'ROOM',
    screen: 'Operasyon Sağlığı',
    question: 'Operasyon sağlığı: sorun ne?',
    expectedAnswerSignals: 'aktif sürücü sayısı; riskli cihaz; stale/offline; açık sorun; kısa tanı ve sıradaki kontrol',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'room-operation-health',
  },
  {
    role: 'ROOM',
    screen: 'Sözleşmeler',
    question: 'Yeni talep var mı?',
    expectedAnswerSignals: 'yeni veya açık talep; sözleşme isteği; kısa follow-up; talep yönü',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'room-agreements',
  },
  {
    role: 'ROOM',
    screen: 'Sözleşmeler',
    question: 'Bu sözleşmeden bugün vardiya üretildi mi?',
    expectedAnswerSignals: 'sözleşme -> vardiya köprüsü; bugün üretim sinyali; bağlılık; üretim geçmişi',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'room-agreements',
  },
  {
    role: 'ROOM',
    screen: 'Vardiyalar',
    question: 'Bu vardiya neden başlamıyor?',
    expectedAnswerSignals: 'başlatma zamanı; araç/sürücü bağlantısı; rota/durak; GPS ve operasyon kanıtı',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'room-shifts',
  },
  {
    role: 'COMPANY',
    screen: 'Sözleşmeler',
    question: 'Bu sözleşmeden bugün vardiya üretildi mi?',
    expectedAnswerSignals: 'sözleşme -> vardiya köprüsü; bugün üretim sinyali; bağlılık; üretim geçmişi',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'company-agreements',
  },
  {
    role: 'COMPANY',
    screen: 'Vardiyalar',
    question: 'Sözleşmeden üretilen vardiyalar nerede?',
    expectedAnswerSignals: 'sözleşmeden üretilen vardiyalar; takip yüzeyi; üretim geçmişi; köprü görünümü',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'company-shifts',
  },
  {
    role: 'COMPANY',
    screen: 'Ticari Akış',
    question: 'Hakediş durumu nedir?',
    expectedAnswerSignals: 'hakediş durumu; ödeme hesabı; komisyon; readonly önizleme; hazırlık seviyesi',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'company-commercial-flow',
  },
  {
    role: 'DRIVER',
    screen: 'Bugün',
    question: 'Görev neden başlamıyor?',
    expectedAnswerSignals: 'başlatma zamanı; aktif durum; araç/sürücü bağlantısı; GPS ve operasyon kanıtı',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'driver-today',
  },
  {
    role: 'DRIVER',
    screen: 'Rota',
    question: 'Rota hazır mı?',
    expectedAnswerSignals: 'rota hazır durumu; başlangıç kanıtı; durak sırası; son GPS',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'driver-route',
  },
  {
    role: 'PARENT',
    screen: 'Canlı Takip',
    question: 'Servis neden görünmüyor?',
    expectedAnswerSignals: 'servis görünürlüğü; son GPS; ETA; çocuk / servis bağlamı; güvenli no-live fallback',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'parent-live',
  },
  {
    role: 'PERSONEL',
    screen: 'Canlı Takip',
    question: 'Servisim nerede?',
    expectedAnswerSignals: 'servis konumu; canlı durum; araç; ETA; kısa yönlendirme',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'personel-live',
  },
  {
    role: 'SUPER_ADMIN',
    screen: 'Canlı İzleme',
    question: 'Canlı risk ne?',
    expectedAnswerSignals: 'canlı risk; alarm veya uyarı; olay tipi; kanıt; readonly yorum',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'superadmin-observability',
  },
  {
    role: 'SUPER_ADMIN',
    screen: 'Ticari Akış',
    question: 'Ödeme başlatılır mı?',
    expectedAnswerSignals: 'readonly hakediş; ödeme hazırlığı; komisyon; ödeme kapalı; settlement yok',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'superadmin-commercial-core',
  },
  {
    role: 'SUPER_ADMIN',
    screen: 'Saha Kabul Merkezi',
    question: 'Kabul durumu nedir?',
    expectedAnswerSignals: 'kabul durumu; canlı oturum; manifest; checklist; karar kaydı',
    forbiddenSignals: COMMON_FORBIDDEN,
    requiredContextFacts: COMMON_REQUIRED_CONTEXT,
    passFail: 'PASS',
    groupKey: 'superadmin-acceptance',
  },
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr-TR');
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function visibleSource(text) {
  return String(text || '').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function mustAny(text, needles, label) {
  const haystack = normalize(text);
  const values = Array.isArray(needles) ? needles : [];
  if (values.some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function splitMarkdownRow(line) {
  return String(line || '')
    .trim()
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function parseMarkdownTable(doc) {
  const lines = String(doc || '').split(/\r?\n/);
  const headerPattern = /^\|\s*Role\s*\|\s*Screen\s*\|\s*Question\s*\|\s*Expected answer signals\s*\|\s*Forbidden signals\s*\|\s*Required context facts\s*\|\s*PASS\/FAIL\s*\|$/i;
  const rows = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inTable) {
      if (headerPattern.test(trimmed)) {
        inTable = true;
        rows.push(trimmed);
      }
      continue;
    }
    if (!trimmed.startsWith('|')) break;
    rows.push(trimmed);
  }
  if (!rows.length) fail('matrix table header not found');
  const header = splitMarkdownRow(rows[0]);
  const body = rows.slice(2).map(splitMarkdownRow);
  return { header, body };
}

function normalizeRowCells(row) {
  return row.map((cell) => normalize(cell));
}

function rowToKey(row) {
  return `${row.role}::${row.screen}::${row.question}`;
}

function buildPackIndex(pack) {
  const grouped = new Map();
  for (const entry of pack) {
    const key = String(entry?.path || '').trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }
  return grouped;
}

function assertScreenLabels(source, checks, labelPrefix) {
  for (const check of checks) {
    must(source, check.registryPath, `${labelPrefix} keeps ${check.role} ${check.screen} path`);
    must(source, check.registryLabel, `${labelPrefix} keeps ${check.role} ${check.screen} label`);
  }
}

async function main() {
  console.log('=== COP-LIVE-ACCEPT-01 CHECK ===');

  const pkg = read('package.json');
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
  const matrixDoc = read(matrixDocPath);

  const copilotFacts = read('web/src/utils/copilotFacts.js');
  const drawer = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
const navDock = read('web/src/layout/NavDock.jsx');
const roleNavigation = read('web/src/utils/roleNavigation.js');
const screenRegistry = read('web/src/copilot/screenRegistry.js');
  const service = read('backend/src/ai/service.js');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const intentRouter = read('backend/src/ai/chat/intentRouter.js');
  const answerPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
  const screenCatalog = read('backend/src/ai/jobGuide/screenCatalog.js');

  must(pkg, '"check:copliveaccept01": "node backend/scripts/cop_live_accept_01_check.js"', 'package.json exposes check:copliveaccept01');
  must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json keeps product extensions runner');
  must(pkg, '"check:verifychain01": "node backend/scripts/verify_chain_01_product_extensions_check.js"', 'package.json keeps verify chain');

  assertProductExtensionsIncludes('check:copliveaccept01', 'product extensions registry includes COP-LIVE-ACCEPT-01', registryScripts);
  assertProductExtensionsIncludes('check:copliveaccept01', 'verify chain registry includes COP-LIVE-ACCEPT-01', registryScripts);
  must(guide, 'COP-LIVE-ACCEPT-01', 'script guide mentions COP-LIVE-ACCEPT-01');
  must(guide, 'check:copliveaccept01', 'script guide exposes check:copliveaccept01');
  must(auditDoc, 'COP-LIVE-ACCEPT-01 kapsam notu', 'copilot context audit keeps live accept scope note');
  must(matrixDoc, 'COP LIVE ACCEPT 01 MATRIX', 'matrix doc keeps title');
  must(matrixDoc, 'Kapsanan ekran sayısı: 14', 'matrix doc keeps screen count summary');
  must(matrixDoc, 'Toplam kabul sorusu: 15', 'matrix doc keeps question count summary');

  must(copilotFacts, "assistantDisplayName: 'Sefer Abi'", 'copilot facts keeps Sefer Abi assistant display name');
  must(copilotFacts, "menuLabel: 'Sefer Abi'", 'copilot facts keeps Sefer Abi menu label');
  must(copilotFacts, "terminalLabel: 'Sefer Abi Terminali'", 'copilot facts keeps Sefer Abi terminal label');
  must(copilotFacts, "drawerTitle: 'Sefer Abi’ye Sor'", 'copilot facts keeps Sefer Abi launcher title');
  must(copilotFacts, 'assistantSubtitle: \'Operasyon yardımcısı\'', 'copilot facts keeps assistant subtitle');

  must(drawer, 'Sefer Abi’ye Sor', 'floating drawer keeps Sefer Abi launcher title');
  must(drawer, 'aria-label="Sefer Abi’ye Sor, operasyon yardımcısını aç"', 'floating drawer keeps launcher aria label');
  must(drawer, 'selectedRecordSummary', 'floating drawer keeps selectedRecordSummary payload field');
  must(drawer, 'selectedRecordStatus', 'floating drawer keeps selectedRecordStatus payload field');
  must(drawer, 'selectedRecordLabel', 'floating drawer keeps selectedRecordLabel payload field');
  must(drawer, 'selectedFields', 'floating drawer keeps selectedFields payload field');
  must(drawer, 'selectedBadges', 'floating drawer keeps selectedBadges payload field');
  must(drawer, 'liveFacts', 'floating drawer keeps liveFacts payload field');
  must(drawer, 'contextSummary', 'floating drawer keeps contextSummary payload field');
  must(drawer, 'structuredFacts', 'floating drawer keeps structuredFacts payload field');
  must(drawer, 'role: me?.role || ""', 'floating drawer keeps screen role payload field');
  must(drawer, 'path: screenContext.path', 'floating drawer keeps screen path payload field');

  must(copilotPanel, 'COPILOT_TERMINAL.title', 'copilot panel keeps terminal title');
  must(copilotPanel, 'selectedRecordSummary', 'copilot panel keeps selectedRecordSummary payload field');
  must(copilotPanel, 'selectedRecordStatus', 'copilot panel keeps selectedRecordStatus payload field');
  must(copilotPanel, 'selectedRecordLabel', 'copilot panel keeps selectedRecordLabel payload field');
  must(copilotPanel, 'selectedFields', 'copilot panel keeps selectedFields payload field');
  must(copilotPanel, 'selectedBadges', 'copilot panel keeps selectedBadges payload field');
  must(copilotPanel, 'liveFacts', 'copilot panel keeps liveFacts payload field');
  must(copilotPanel, 'contextSummary', 'copilot panel keeps contextSummary payload field');
  must(copilotPanel, 'structuredFacts', 'copilot panel keeps structuredFacts payload field');
  must(copilotPanel, 'conversationState', 'copilot panel keeps conversationState bridge');
  must(copilotPanel, 'role: me?.role || ""', 'copilot panel keeps screen role payload field');
  must(copilotPanel, 'path: selectedChatScreen.path', 'copilot panel keeps screen path payload field');

  must(navDock, 'getRoleNavigation', 'nav dock uses the canonical role navigation registry');
  must(roleNavigation, 'export function getRoleNavigation', 'role navigation owns visible destinations');
  mustNot(visibleSource(navDock), 'sefer abi terminali', 'nav dock has no rendered terminal label');

  must(screenRegistry, 'COPILOT_MENU_LABEL', 'screen registry keeps copilot menu label constant');
  must(screenRegistry, '/room/map', 'screen registry keeps room map route');
  must(screenRegistry, '/room/operation-health', 'screen registry keeps room operation health route');
  must(screenRegistry, '/room/agreements', 'screen registry keeps room agreements route');
  must(screenRegistry, '/room/shifts', 'screen registry keeps room shifts route');
  must(screenRegistry, '/company/agreements', 'screen registry keeps company agreements route');
  must(screenRegistry, '/company/shifts', 'screen registry keeps company shifts route');
  must(screenRegistry, '/company/commercial-flow', 'screen registry keeps company commercial flow route');
  must(screenRegistry, '/driver/today', 'screen registry keeps driver today route');
  must(screenRegistry, '/driver/route', 'screen registry keeps driver route route');
  must(screenRegistry, '/parent/live', 'screen registry keeps parent live route');
  must(screenRegistry, '/personel/live', 'screen registry keeps personel live route');
  must(screenRegistry, '/superadmin/observability', 'screen registry keeps superadmin observability route');
  must(screenRegistry, '/superadmin/commercial-core', 'screen registry keeps superadmin commercial core route');
  must(screenRegistry, '/superadmin/acceptance', 'screen registry keeps superadmin acceptance route');
  must(screenRegistry, 'Canlı Takip', 'screen registry keeps live tracking label');
  must(screenRegistry, 'Operasyon Sağlığı', 'screen registry keeps operation health label');
  must(screenRegistry, 'Sözleşmeler', 'screen registry keeps agreements label');
  must(screenRegistry, 'Vardiyalar', 'screen registry keeps shifts label');
  must(screenRegistry, 'Ticari Akışım', 'screen registry keeps company commercial flow label');
  must(screenRegistry, 'Bugün', 'screen registry keeps driver today label');
  must(screenRegistry, 'Rota', 'screen registry keeps driver route label');
  must(screenRegistry, 'Canlı', 'screen registry keeps parent/personel live label');
  must(screenRegistry, 'Canlı İzleme', 'screen registry keeps superadmin live monitoring label');
  must(screenRegistry, 'Ticari Akış', 'screen registry keeps superadmin commercial label');
  must(screenRegistry, 'Kabul Merkezi', 'screen registry keeps acceptance center label');

  must(screenCatalog, 'Canlı İzleme', 'screen catalog keeps live monitoring label');
  must(screenCatalog, 'Kabul Merkezi', 'screen catalog keeps acceptance center label');
  must(screenCatalog, 'Ticari Akış', 'screen catalog keeps commercial label');
  must(screenCatalog, 'Sefer Abi Terminali', 'screen catalog keeps Sefer Abi terminal label');

  must(service, 'structuredFacts', 'ai service keeps structuredFacts bridge');
  must(service, 'liveFacts', 'ai service keeps liveFacts bridge');
  must(service, 'selectedRecordSummary', 'ai service keeps selectedRecordSummary bridge');
  must(service, 'selectedRecordStatus', 'ai service keeps selectedRecordStatus bridge');
  must(service, 'selectedRecordLabel', 'ai service keeps selectedRecordLabel bridge');
  must(service, 'contextSummary', 'ai service keeps contextSummary bridge');
  must(service, 'Sürücünün telefon GPS’i', 'ai service keeps driver phone GPS safe wording');
  must(service, 'Son GPS', 'ai service keeps last GPS safe wording');
  must(service, 'ETA', 'ai service keeps ETA wording');
  must(service, 'Araç haritada güvenilir görünmüyorsa önce son GPS zamanını', 'ai service keeps safe GPS recommendation');
  mustNot(service, 'OperationProof', 'ai service hides raw operation proof code');
  mustNot(service, 'raw technical', 'ai service hides raw technical wording');
  mustNot(service, 'internal code', 'ai service hides internal code wording');
  mustNot(service, 'settlement execute', 'ai service keeps settlement execute out of visible text');
  mustNot(service, 'payment execute', 'ai service keeps payment execute out of visible text');

  must(helpComposer, 'selectedRecordSummary', 'help composer keeps selectedRecordSummary bridge');
  must(helpComposer, 'selectedRecordStatus', 'help composer keeps selectedRecordStatus bridge');
  must(helpComposer, 'selectedRecordLabel', 'help composer keeps selectedRecordLabel bridge');
  must(helpComposer, 'contextSummary', 'help composer keeps contextSummary bridge');
  must(helpComposer, 'liveFacts', 'help composer keeps liveFacts bridge');
  must(helpComposer, 'Sürücünün telefon GPS’i', 'help composer keeps driver phone GPS safe wording');
  must(helpComposer, 'Son GPS', 'help composer keeps last GPS safe wording');
  must(helpComposer, 'ETA', 'help composer keeps ETA wording');
  must(helpComposer, 'operasyon kanıtı', 'help composer keeps readable operational proof wording');
  must(helpComposer, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'help composer keeps contract-to-shift positive wording');
  must(helpComposer, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'help composer keeps contract-to-shift negative wording');
  mustNot(helpComposer, 'OperationProof', 'help composer hides raw operation proof code');
  mustNot(helpComposer, 'raw technical', 'help composer hides raw technical wording');
  mustNot(helpComposer, 'internal code', 'help composer hides internal code wording');
  mustNot(helpComposer, 'settlement execute', 'help composer keeps settlement execute out of visible text');
  mustNot(helpComposer, 'payment execute', 'help composer keeps payment execute out of visible text');

  must(intentRouter, 'CONTRACT_TO_SHIFT', 'intent router keeps contract-to-shift intent');
  must(intentRouter, 'PAYMENT_READINESS', 'intent router keeps payment readiness intent');
  must(intentRouter, 'LOCATION_HELP', 'intent router keeps location help intent');
  must(intentRouter, 'WHO_CAN_DO', 'intent router keeps role-boundary intent');
  must(intentRouter, 'QUALITY_SIGNAL', 'intent router keeps quality signal intent');
  must(intentRouter, 'NEXT_STEP', 'intent router keeps next step intent');
  must(intentRouter, 'NEXT_SCREEN', 'intent router keeps next screen intent');
  must(intentRouter, 'filterWorkflowGenericChips', 'intent router keeps workflow chip filtering');
  must(intentRouter, 'Konum sinyali/operasyon kanıtını kontrol et', 'intent router keeps GPS proof chip wording');
  must(intentRouter, 'Son konum bilgisi ne zaman geldi?', 'intent router keeps last GPS chip wording');

  must(answerPolicy, 'WORKFLOW_GENERIC_CHIP_BLOCKLIST', 'answer policy keeps workflow generic chip blocklist');
  must(answerPolicy, 'Konum sinyali/operasyon kanıtını kontrol et', 'answer policy keeps GPS proof chip wording');
  must(answerPolicy, 'Son konum bilgisi ne zaman geldi?', 'answer policy keeps last GPS chip wording');
  must(answerPolicy, 'Tahmini varış süresi nedir?', 'answer policy keeps ETA chip wording');
  must(answerPolicy, 'Hakediş eksiklerini sor', 'answer policy keeps commercial workflow chip');
  must(answerPolicy, 'Üretim durumunu sor', 'answer policy keeps contract workflow chip');
  mustNot(answerPolicy, 'OperationProof', 'answer policy hides raw operation proof code');
  mustNot(answerPolicy, 'settlement execute', 'answer policy keeps settlement execute out of visible text');
  mustNot(answerPolicy, 'payment execute', 'answer policy keeps payment execute out of visible text');

  const { buildGoldenQuestionPack } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/goldenQuestionPack.js')).href);
  const goldenPack = buildGoldenQuestionPack();
  if (!Array.isArray(goldenPack)) fail('golden question pack must return an array');
  ok('golden question pack returns array');
  const packByPath = buildPackIndex(goldenPack);

  const paths = new Set();
  for (const row of ACCEPTANCE_ROWS) {
    const key = `${row.role}::${row.screen}`;
    paths.add(key);
  }
  if (paths.size !== 14) fail(`expected 14 unique role/screen combinations, got ${paths.size}`);
  if (ACCEPTANCE_ROWS.length !== 15) fail(`expected 15 acceptance questions, got ${ACCEPTANCE_ROWS.length}`);
  ok('acceptance row counts');

  for (const group of SCREEN_GROUPS) {
    const entries = packByPath.get(group.path) || [];
    if (!entries.length) fail(`missing golden question pack entries for ${group.role} ${group.screen} (${group.path})`);
    const messages = entries.map((entry) => String(entry?.message || '').trim()).filter(Boolean);
    if (!messages.length) fail(`missing golden question messages for ${group.role} ${group.screen} (${group.path})`);
    mustAny(messages.join('\n'), group.packNeedles, `${group.role} ${group.screen} pack coverage`);
    mustNot(messages.join('\n'), 'Bunu anlayamadım', `${group.role} ${group.screen} pack avoids generic fallback`);
  }

  const matrix = parseMarkdownTable(matrixDoc);
  const expectedHeader = ['Role', 'Screen', 'Question', 'Expected answer signals', 'Forbidden signals', 'Required context facts', 'PASS/FAIL'];
  if (normalizeRowCells(matrix.header).join(' | ') !== normalizeRowCells(expectedHeader).join(' | ')) {
    fail('matrix header mismatch');
  }
  if (matrix.body.length !== ACCEPTANCE_ROWS.length) {
    fail(`matrix row count mismatch: expected ${ACCEPTANCE_ROWS.length}, got ${matrix.body.length}`);
  }

  const expectedRows = ACCEPTANCE_ROWS.map((row) => [
    row.role,
    row.screen,
    row.question,
    row.expectedAnswerSignals,
    row.forbiddenSignals,
    row.requiredContextFacts,
    row.passFail,
  ]);

  for (let index = 0; index < expectedRows.length; index += 1) {
    const expected = expectedRows[index];
    const actual = matrix.body[index];
    if (!actual) fail(`matrix row missing at index ${index + 1}`);
    const columns = ['Role', 'Screen', 'Question', 'Expected answer signals', 'Forbidden signals', 'Required context facts', 'PASS/FAIL'];
    for (let colIndex = 0; colIndex < expected.length; colIndex += 1) {
      const actualCell = normalize(actual[colIndex]);
      const expectedCell = normalize(expected[colIndex]);
      if (actualCell !== expectedCell) {
        fail(`matrix row mismatch at index ${index + 1} (${columns[colIndex]}): expected ${rowToKey(ACCEPTANCE_ROWS[index])}`);
      }
    }
    mustNot(actual[2], 'Bunu anlayamadım', `matrix question ${index + 1} avoids generic fallback`);
    must(actual[6], 'PASS', `matrix row ${index + 1} stays PASS`);
  }

  for (const group of SCREEN_GROUPS) {
    const groupRows = ACCEPTANCE_ROWS.filter((row) => row.groupKey === group.key);
    if (!groupRows.length) fail(`missing matrix rows for ${group.role} ${group.screen}`);
    const rowQuestions = groupRows.map((row) => row.question).join('\n');
    mustNot(rowQuestions, 'Bunu anlayamadım', `${group.role} ${group.screen} matrix avoids generic fallback`);
  }

  assertScreenLabels(screenRegistry, SCREEN_GROUPS, 'screen registry');

  console.log(`Matrix file: ${path.join(root, matrixDocPath)}`);
  console.log(`Unique role/screen combinations: ${paths.size}`);
  console.log(`Acceptance questions: ${ACCEPTANCE_ROWS.length}`);
  console.log(`Roles covered: ${Array.from(new Set(ACCEPTANCE_ROWS.map((row) => row.role))).join(', ')}`);
  console.log('Expected answer signals: short, context-aware, screen-specific reasoning without generic fallback.');
  console.log('Forbidden signals: generic fallback, OperationProof, raw technical/internal code, payment execute, settlement execute, write action.');
  console.log('=== COP-LIVE-ACCEPT-01 CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
