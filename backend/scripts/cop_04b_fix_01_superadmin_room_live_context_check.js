#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

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
    .toLowerCase();
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

function mustNotRaw(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function mustAny(text, needles, label) {
  const haystack = normalize(text);
  const list = Array.isArray(needles) ? needles : [];
  if (list.some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustArrayNotContains(arr, needle, label) {
  if (!Array.isArray(arr) || !arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

console.log('=== COP-04B-FIX-01 SUPERADMIN + ROOM LIVE CONTEXT CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const service = read('backend/src/ai/service.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const answerPolicy = read('backend/src/ai/chat/answerQualityPolicy.js');
const factsSource = read('web/src/utils/copilotFacts.js');
const copilotPanel = read('web/src/panels/shared/CopilotPanel.jsx');
const mapPanel = read('web/src/panels/room/MapPanel.jsx');
const operationHealthPanel = read('web/src/panels/room/OperationHealthPanel.jsx');
const superAdminOperationsPanel = read('web/src/panels/superadmin/OperationsPanel.jsx');

must(pkg, '"check:cop04bfix01": "node backend/scripts/cop_04b_fix_01_superadmin_room_live_context_check.js"', 'package.json exposes check:cop04bfix01');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:cop04afix04"', 'package.json keeps check:cop04afix04');
must(pkg, '"check:cop04afix03"', 'package.json keeps check:cop04afix03');
must(pkg, '"check:cop04afix02"', 'package.json keeps check:cop04afix02');
must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');

ordered(runner, [
  'check:op04',
  'check:qlt04b',
  'check:pay01e',
  'check:paysafe01',
  'check:web01a',
  'check:web01b',
  'check:cop01e',
  'check:cop02a',
  'check:cop02b',
  'check:cop03a',
  'check:cop03afix01',
  'check:cop03afix02',
  'check:cop03b',
  'check:cop03c',
  'check:cop03cfix01',
  'check:uxkvkk01',
  'check:docsstate01',
  'check:e2esmoke01',
  'check:fieldlaunch01',
  'check:cop03cfix02',
  'check:cop04afix03',
  'check:cop04afix04',
  'check:cop03cfix03',
  'check:cop04a',
  'check:cop04afix02',
  'check:cop04afix01',
  'check:cop04b',
  'check:cop04bfix01',
], 'product extensions runner order keeps cop04bfix01 last');

must(verifyChain, 'check:cop04bfix01', 'verify chain waits for check:cop04bfix01');
must(guide, 'check:cop04bfix01', 'script guide exposes check:cop04bfix01');
must(guide, 'check:cop04b', 'script guide keeps check:cop04b');
must(guide, 'check:cop04afix04', 'script guide keeps check:cop04afix04');
must(guide, 'check:cop04afix03', 'script guide keeps check:cop04afix03');
must(guide, 'check:cop04afix02', 'script guide keeps check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide keeps check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(auditDoc, 'COP-04B-FIX-01 acceptance note', 'audit doc keeps fix01 note');
must(auditDoc, 'Room / Canlı Takip', 'audit doc keeps room map live reference');
must(auditDoc, 'Super Admin / Canlı İzleme', 'audit doc keeps super admin live reference');
must(auditDoc, 'selected context parity', 'audit doc keeps selected parity wording');
must(auditDoc, 'Bu audit product behavior değiştirmez.', 'audit doc keeps no product behavior note');

must(service, 'buildLiveSelectionSnapshot', 'service keeps live selection snapshot helper');
must(service, 'screenContext?.selectedRecordStatus', 'service keeps selected record status bridge');
must(service, 'Seçili araç bilgisi net görünmüyor.', 'service keeps safe gps fallback wording');
must(service, 'Araç haritada güvenilir görünmüyorsa önce son GPS zamanını, araç bağlantısını, görev bağlantısını ve Sürücünün telefon GPS’i durumunu kontrol et.', 'service keeps gps recommendation');

must(helpComposer, 'selectedDiagnosticTheme(message)', 'help composer keeps selected diagnostic theme routing');
must(helpComposer, 'composeSelectedRecordDiagnosticReply', 'help composer keeps selected diagnostic reply');
must(helpComposer, 'selectedCarrySummary', 'help composer keeps selected carry summary');
must(helpComposer, 'operationHealthLead', 'help composer keeps operation health lead');
must(helpComposer, 'selectedRecordStatus', 'help composer keeps selected record status use');

must(answerPolicy, 'workflowTopicChipSet', 'answer policy keeps workflow chip set');
must(answerPolicy, 'Riskli cihazı göster', 'answer policy keeps operation-health chip');
must(answerPolicy, 'Stale/offline satırını aç', 'answer policy keeps stale chip');
must(answerPolicy, 'Açık sorunları sırala', 'answer policy keeps issue chip');
must(answerPolicy, 'Aktif sürücüleri kontrol et', 'answer policy keeps active driver chip');
must(answerPolicy, 'Son GPS ne zaman geldi?', 'answer policy keeps gps chip');
must(answerPolicy, "Sürücünün telefon GPS’i devrede mi?", 'answer policy keeps driver gps chip');
must(answerPolicy, 'Araç bağlantısı var mı?', 'answer policy keeps vehicle connection chip');
must(answerPolicy, 'Canlı takip ekranını aç', 'answer policy keeps live map chip');
must(answerPolicy, 'Başlatma zamanı uygun mu?', 'answer policy keeps shift chip');
must(answerPolicy, 'GPS/operasyon kanıtını kontrol et', 'answer policy keeps operation-proof chip');

must(factsSource, 'buildMapFacts', 'facts keeps map helper');
must(factsSource, 'buildOperationHealthCopilotFacts', 'facts keeps operation-health helper');
must(factsSource, 'buildOperationsCopilotFacts', 'facts keeps superadmin operations helper');
must(factsSource, 'selectedRecordStatus', 'facts keeps selected record status bridge');
must(factsSource, "Sürücünün telefon GPS’i", 'facts keeps driver phone gps wording');
mustAny(factsSource, ['Riskli cihazı göster', 'Riskli cihaz', 'Riskli cihazlar var.'], 'facts keeps operation-health chip wording');
mustAny(factsSource, ['Operasyon kanıtı eksik', 'Eksik / engel', 'Kanıt durumu'], 'facts keeps operations panel wording');

must(copilotPanel, 'selectedSummary', 'copilot panel keeps selected summary bridge');
must(copilotPanel, 'selectedFields', 'copilot panel keeps selected fields bridge');
must(copilotPanel, 'selectedBadges', 'copilot panel keeps selected badges bridge');
must(copilotPanel, 'structuredFacts', 'copilot panel keeps structured facts bridge');

must(mapPanel, 'setCopilotSelection({', 'room map panel keeps copilot selection push');
must(mapPanel, 'label:', 'room map panel keeps selected label bridge');
must(mapPanel, 'summary:', 'room map panel keeps selected summary bridge');
mustAny(mapPanel, ['Araç', 'Sıradaki Durak', 'ETA', 'Toplam Durak', 'Kalan'], 'room map panel keeps selected fields bridge');
mustAny(mapPanel, ['GPS', 'Vardiya Durumu'], 'room map panel keeps selected badges bridge');
must(operationHealthPanel, 'setCopilotSelection({', 'room operation health panel keeps copilot selection push');
must(operationHealthPanel, 'buildOperationHealthCopilotFacts', 'room operation health panel keeps dedicated facts helper');
mustAny(operationHealthPanel, ['Aktif Sürücü', 'Riskli Cihaz', 'Stale / Offline', 'Açık Sorun'], 'room operation health panel keeps selected fields bridge');
mustAny(operationHealthPanel, ['Canlılık', 'Önem'], 'room operation health panel keeps selected badges bridge');
must(superAdminOperationsPanel, 'setCopilotSelection({', 'super admin operations panel keeps copilot selection push');
must(superAdminOperationsPanel, 'buildOperationsCopilotFacts', 'super admin operations panel keeps dedicated facts helper');
must(superAdminOperationsPanel, 'GPS görünürlüğü', 'super admin operations panel keeps gps visibility field');
must(superAdminOperationsPanel, 'Kanıt durumu', 'super admin operations panel keeps evidence field');

const { buildMapFacts, buildOperationHealthCopilotFacts, buildOperationsCopilotFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { runCopilotFoundation } = await import(pathToFileURL(path.join(root, 'backend/src/ai/service.js')).href);
const { getScreenDefinitionForUser, listScreensForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const roomUser = { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const superUser = { role: 'SUPER_ADMIN', companyId: 1, companyKind: 'DEMO' };

const roomScreens = listScreensForUser(roomUser);
const roomMapScreen = roomScreens.find((row) => String(row?.path || '') === '/room/map');
const roomOperationScreen = roomScreens.find((row) => String(row?.path || '') === '/room/operation-health');
const superScreens = listScreensForUser(superUser);
const superOperationsScreen = superScreens.find((row) => String(row?.path || '') === '/superadmin/operations');

if (!roomMapScreen) fail('room map screen exists');
if (!roomOperationScreen) fail('room operation health screen exists');
if (!superOperationsScreen) fail('super admin operations screen exists');

const roomMapDef = getScreenDefinitionForUser(roomUser, roomMapScreen, Number(roomMapScreen.id));
const roomOperationDef = getScreenDefinitionForUser(roomUser, roomOperationScreen, Number(roomOperationScreen.id));
const superOperationsDef = getScreenDefinitionForUser(superUser, superOperationsScreen, Number(superOperationsScreen.id));

const roomMapFacts = buildMapFacts({
  selected: { id: 34, plate: '34ABC123' },
  selectedShift: { id: 3, status: 'APPROVED' },
  selectedNext: { name: 'Pickup 6' },
  selectedEta: 619,
  selectedStats: { total: 6, remaining: 0, completed: 6 },
  gpsStatus: 'Zayıf / STALE',
  gpsAge: '47s',
  vehicleCount: 12,
});

const roomMapContext = {
  path: '/room/map',
  label: 'ROOM • Canlı Takip',
  selectedLabel: 'Vardiya #3',
  selectedSummary: roomMapFacts.selectedRecordStatus,
  selectedFields: [
    { label: 'Araç', value: '34ABC123', help: 'Seçili aracın plakasını gösterir.' },
    { label: 'GPS', value: 'Zayıf / STALE', help: 'Canlılık sinyalini gösterir.' },
    { label: 'Son GPS', value: '47s', help: 'Son konum zamanını gösterir.' },
    { label: 'Sıradaki Durak', value: 'Pickup 6', help: 'Bir sonraki durağı gösterir.' },
    { label: 'Toplam Durak', value: '6', help: 'Toplam durak sayısını gösterir.' },
    { label: 'ETA', value: '619dk', help: 'Tahmini kalan süreyi gösterir.' },
  ],
  selectedBadges: [
    { label: 'GPS', value: 'Zayıf / STALE', help: 'Canlı GPS durumunu gösterir.' },
    { label: 'Vardiya Durumu', value: 'Kabul Edildi', help: 'Seçili vardiya durumunu gösterir.' },
  ],
  selectedEntityType: 'shift',
  selectedEntityId: 3,
  structuredFacts: roomMapFacts,
  copilotSummary: roomMapFacts.copilotSummary,
};

const roomMapHelp = buildChatHelpResponse({
  entityType: 'screen',
  entityId: Number(roomMapScreen.id),
  user: roomUser,
  message: 'Bu araç neden haritada görünmüyor?',
  context: {
    screenPath: '/room/map',
    selectedLabel: roomMapContext.selectedLabel,
    selectedSummary: roomMapContext.selectedSummary,
  },
  scope: { role: 'ROOM', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: roomMapContext,
  screenDefinition: roomMapDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(roomMapScreen.id),
  resolvedEntityType: 'screen',
  resolvedEntityId: Number(roomMapScreen.id),
});

const roomMapReply = String(roomMapHelp?.reply || roomMapHelp?.summary || '');
mustNot(roomMapReply, 'seçili araç bilgisi net görünmüyor', 'room map reply avoids generic no-selection fallback');
mustAny(roomMapReply, ['34ABC123', 'Seçili araç 34ABC123 görünüyor.'], 'room map reply keeps selected vehicle plate');
mustAny(roomMapReply, ['GPS: Güncel değil', 'GPS: Canlı', 'GPS: Çevrim dışı', 'GPS: Bekleniyor', 'GPS güncel değil', 'GPS canlı', 'GPS çevrim dışı'], 'room map reply keeps gps state');
mustAny(roomMapReply, ['Son GPS: 47 sn önce', 'Son GPS 47 sn önce', 'Son GPS: 47 dk önce', 'Son GPS 47s', 'Son GPS 47 saniye önce'], 'room map reply keeps last gps age');
mustAny(roomMapReply, ['Pickup 6', 'toplam durak 6'], 'room map reply keeps next stop and stop count');
mustAny(roomMapReply, ["Sürücünün telefon GPS’i", "Sürücünün telefon GPS’i durumunu kontrol et"], 'room map reply keeps driver phone gps wording');
mustNot(roomMapReply, 'Yetki sınırını açıkla', 'room map reply avoids permission boundary fallback');
mustAny(roomMapHelp?.contextualSuggestedChips || roomMapHelp?.suggestedChips || [], ['Son GPS ne zaman geldi?'], 'room map chips keep gps chip');
mustAny(roomMapHelp?.contextualSuggestedChips || roomMapHelp?.suggestedChips || [], ["Sürücünün telefon GPS’i devrede mi?"], 'room map chips keep driver gps chip');
mustAny(roomMapHelp?.contextualSuggestedChips || roomMapHelp?.suggestedChips || [], ['Araç bağlantısı var mı?'], 'room map chips keep vehicle connection chip');
mustAny(roomMapHelp?.contextualSuggestedChips || roomMapHelp?.suggestedChips || [], ['Canlı takip ekranını aç'], 'room map chips keep live tracking chip');
mustArrayNotContains(roomMapHelp?.contextualSuggestedChips || roomMapHelp?.suggestedChips || [], 'Bu ekranı detaylı anlat', 'room map chips avoid generic screen chip');
mustArrayNotContains(roomMapHelp?.contextualSuggestedChips || roomMapHelp?.suggestedChips || [], 'Aynı kayıt için devam et', 'room map chips avoid same-record generic chip');
mustArrayNotContains(roomMapHelp?.contextualSuggestedChips || roomMapHelp?.suggestedChips || [], 'Ekran rehberini aç', 'room map chips avoid guide generic chip');

const roomMapMismatch = await runCopilotFoundation({
  intent: 'JOB_GUIDE',
  entityType: 'screen',
  entityId: Number(roomMapScreen.id),
  user: roomUser,
  jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE',
  guideLevel: 'WHY',
  screenContext: roomMapContext,
  message: 'Bu araç neden haritada görünmüyor?',
});

const roomMapMismatchText = String(roomMapMismatch?.plainSummary || roomMapMismatch?.screenExplanation || roomMapMismatch?.jobPurpose || '');
mustNot(roomMapMismatchText, 'Bunu anlayamadım', 'room map mismatch fallback avoids unknown wording');
mustAny(roomMapMismatchText, ['34ABC123', 'Seçili araç 34ABC123 görünüyor.'], 'room map mismatch keeps selected vehicle');
mustAny(roomMapMismatchText, ['Son GPS 47 sn önce', 'Son GPS 47 sn önce gelmiş', 'Son GPS 47 saniye önce gelmiş'], 'room map mismatch keeps last gps');
mustAny(roomMapMismatchText, ["Sürücünün telefon GPS’i", 'araç bağlantısı', 'görev bağlantısı'], 'room map mismatch keeps gps recommendation');

const roomMapNoSelection = await runCopilotFoundation({
  intent: 'JOB_GUIDE',
  entityType: 'screen',
  entityId: Number(roomMapScreen.id),
  user: roomUser,
  jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE',
  guideLevel: 'WHY',
  screenContext: {
    path: '/room/map',
    label: 'ROOM • Canlı Takip',
  },
  message: 'Bu araç neden haritada görünmüyor?',
});

const roomMapNoSelectionText = String(roomMapNoSelection?.plainSummary || roomMapNoSelection?.screenExplanation || roomMapNoSelection?.jobPurpose || '');
must(roomMapNoSelectionText, 'Bu ekranda seçili araç bilgisi net görünmüyor.', 'room map no-selection fallback stays safe');
mustNot(roomMapNoSelectionText, 'Bunu anlayamadım', 'room map no-selection fallback avoids unknown wording');
mustNotRaw(roomMapNoSelectionText, 'JOB_TYPE_ENTITY_MISMATCH', 'room map no-selection fallback avoids raw internal code');

const roomOperationFacts = buildOperationHealthCopilotFacts({
  summary: { status: 'LIVE', cards: { activeDrivers: 0, riskyDevices: 1, staleOrOffline: 1, openIssues: 2 } },
  copilotDriver: { driverName: 'Sürücü Demo', liveState: 'STALE' },
  copilotIssue: { title: 'Canlılık sorunu', severity: 'HIGH' },
});

const roomOperationContext = {
  path: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  selectedLabel: 'Canlılık ve cihaz riski',
  selectedSummary: roomOperationFacts.copilotSummary,
  selectedFields: [
    { label: 'Aktif Sürücü', value: '0', help: 'Aktif sürücü sayısı.' },
    { label: 'Riskli Cihaz', value: '1', help: 'Riskli cihaz sayısı.' },
    { label: 'Stale / Offline', value: '1', help: 'Stale/offline kayıt sayısı.' },
    { label: 'Açık Sorun', value: '2', help: 'Açık sorun sayısı.' },
  ],
  selectedBadges: [
    { label: 'Canlılık', value: 'STALE', help: 'Canlılık durumu.' },
    { label: 'Önem', value: 'HIGH', help: 'Önem seviyesi.' },
  ],
  selectedEntityType: 'screen',
  selectedEntityId: 1114,
  structuredFacts: roomOperationFacts,
  copilotSummary: roomOperationFacts.copilotSummary,
};

const roomOperationHelp = buildChatHelpResponse({
  entityType: 'screen',
  entityId: Number(roomOperationScreen.id),
  user: roomUser,
  message: 'Operasyon Sağlığı: sorun ne?',
  context: {
    screenPath: '/room/operation-health',
    selectedLabel: roomOperationContext.selectedLabel,
    selectedSummary: roomOperationContext.selectedSummary,
  },
  scope: { role: 'ROOM', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: roomOperationContext,
  screenDefinition: roomOperationDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(roomOperationScreen.id),
  resolvedEntityType: 'screen',
  resolvedEntityId: Number(roomOperationScreen.id),
});

const roomOperationReply = String(roomOperationHelp?.reply || roomOperationHelp?.summary || '');
mustAny(roomOperationReply, ['Aktif sürücü 0', 'Aktif sürücü: 0'], 'operation health reply keeps active driver count');
mustAny(roomOperationReply, ['riskli cihaz 1', 'Riskli cihaz: 1'], 'operation health reply keeps risky device count');
mustAny(roomOperationReply, ['stale/offline 1', 'Stale/offline: 1'], 'operation health reply keeps stale offline count');
mustAny(roomOperationReply, ['açık sorun 2', 'Açık sorun: 2'], 'operation health reply keeps open issue count');
must(roomOperationReply, 'Riskli cihazı aç, stale/offline satırını kontrol et ve açık sorunları sırala.', 'operation health reply keeps natural next step');
mustNot(roomOperationReply, 'Yetki sınırını kontrol et', 'operation health reply avoids default role boundary');
mustNot(roomOperationReply, 'Bu aksiyonu simüle et', 'operation health reply avoids action simulation wording');
mustAny(roomOperationHelp?.contextualSuggestedChips || roomOperationHelp?.suggestedChips || [], ['Riskli cihazı göster'], 'operation health chips keep risk chip');
mustAny(roomOperationHelp?.contextualSuggestedChips || roomOperationHelp?.suggestedChips || [], ['Stale/offline satırını aç'], 'operation health chips keep stale chip');
mustAny(roomOperationHelp?.contextualSuggestedChips || roomOperationHelp?.suggestedChips || [], ['Açık sorunları sırala'], 'operation health chips keep issue chip');
mustAny(roomOperationHelp?.contextualSuggestedChips || roomOperationHelp?.suggestedChips || [], ['Aktif sürücüleri kontrol et'], 'operation health chips keep driver chip');
mustArrayNotContains(roomOperationHelp?.contextualSuggestedChips || roomOperationHelp?.suggestedChips || [], 'Aynı kayıt için devam et', 'operation health chips avoid generic continuation chip');
mustArrayNotContains(roomOperationHelp?.contextualSuggestedChips || roomOperationHelp?.suggestedChips || [], 'Ekran rehberini aç', 'operation health chips avoid generic guide chip');
mustArrayNotContains(roomOperationHelp?.contextualSuggestedChips || roomOperationHelp?.suggestedChips || [], 'Bunu sor:', 'operation health chips avoid self-question chip');

const superOperationsFacts = buildOperationsCopilotFacts({
  operationProofSummary: {
    statusText: 'LIVE',
    summaryText: 'Kanıt ve GPS görünürlüğü okunuyor',
    visibilityNote: 'Araç GPS’i / Sürücünün telefon GPS’i okunuyor',
    nextAction: 'İlk bakılacak yer: Kanıt durumu',
    status: 'LIVE',
    nonFinalText: 'Hakediş için nihai karar değildir.',
  },
  auditCount: 18,
  notificationCount: 6,
  eventCount: 4,
});

const superOperationsContext = {
  path: '/superadmin/operations',
  label: 'Denetim Paneli',
  selectedLabel: 'Denetim Paneli',
  selectedSummary: superOperationsFacts.copilotSummary,
  selectedFields: [
    { label: 'Kanıt durumu', value: 'LIVE', help: 'Operasyon kanıtı durumunu gösterir.' },
    { label: 'GPS görünürlüğü', value: 'Araç GPS’i / Sürücünün telefon GPS’i', help: 'GPS görünürlüğü ve kaynak sinyalini gösterir.' },
    { label: 'Eksik / engel', value: 'İlk bakılacak yer: Kanıt durumu', help: 'Devam etmeden önce ilk bakılacak notu gösterir.' },
    { label: 'Denetim', value: '18 / 6', help: 'Audit ve bildirim özetini gösterir.' },
  ],
  selectedBadges: [
    { label: 'Durum', value: 'LIVE', help: 'Kanıt toplama durumunu gösterir.' },
  ],
  selectedEntityType: 'screen',
  selectedEntityId: 6117,
  structuredFacts: superOperationsFacts,
  copilotSummary: superOperationsFacts.copilotSummary,
};

const superOperationsHelp = buildChatHelpResponse({
  entityType: 'screen',
  entityId: Number(superOperationsScreen.id),
  user: superUser,
  message: 'Bu ekranda sorun ne?',
  context: {
    screenPath: '/superadmin/operations',
    selectedLabel: superOperationsContext.selectedLabel,
    selectedSummary: superOperationsContext.selectedSummary,
  },
  scope: { role: 'SUPER_ADMIN', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: superOperationsContext,
  screenDefinition: superOperationsDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(superOperationsScreen.id),
  resolvedEntityType: 'screen',
  resolvedEntityId: Number(superOperationsScreen.id),
});

const superOperationsReply = String(superOperationsHelp?.reply || superOperationsHelp?.summary || '');
mustAny(superOperationsReply, ['Kanıt durumu', 'GPS görünürlüğü', 'Eksik / engel', 'Denetim'], 'superadmin operations reply keeps selected context');
mustNot(superOperationsReply, 'seçili araç bilgisi net görünmüyor', 'superadmin operations reply avoids generic fallback');
mustNot(superOperationsReply, 'Yetki sınırını kontrol et', 'superadmin operations reply avoids default role boundary');
mustNot(superOperationsReply, 'Bu aksiyonu simüle et', 'superadmin operations reply avoids mechanical action wording');
mustAny(superOperationsHelp?.contextualSuggestedChips || superOperationsHelp?.suggestedChips || [], ['Riskli cihazı göster'], 'superadmin operations chips keep risk chip');
mustAny(superOperationsHelp?.contextualSuggestedChips || superOperationsHelp?.suggestedChips || [], ['Stale/offline satırını aç'], 'superadmin operations chips keep stale chip');
mustAny(superOperationsHelp?.contextualSuggestedChips || superOperationsHelp?.suggestedChips || [], ['Açık sorunları sırala'], 'superadmin operations chips keep issue chip');
mustAny(superOperationsHelp?.contextualSuggestedChips || superOperationsHelp?.suggestedChips || [], ['Aktif sürücüleri kontrol et'], 'superadmin operations chips keep driver chip');
mustArrayNotContains(superOperationsHelp?.contextualSuggestedChips || superOperationsHelp?.suggestedChips || [], 'Aynı kayıt için devam et', 'superadmin operations chips avoid generic continuation chip');
mustArrayNotContains(superOperationsHelp?.contextualSuggestedChips || superOperationsHelp?.suggestedChips || [], 'Ekran rehberini aç', 'superadmin operations chips avoid generic guide chip');

const superOperationsWorkflow = await runCopilotFoundation({
  intent: 'JOB_GUIDE',
  entityType: 'screen',
  entityId: Number(superOperationsScreen.id),
  user: superUser,
  jobType: 'ASSIGNMENT_READINESS_GUIDE',
  guideLevel: 'WHY',
  screenContext: superOperationsContext,
  message: 'Bu ekranda sorun ne?',
});

const superOperationsWorkflowText = String(superOperationsWorkflow?.plainSummary || superOperationsWorkflow?.screenExplanation || superOperationsWorkflow?.jobPurpose || '');
mustAny(superOperationsWorkflowText, ['Kanıt durumu', 'GPS görünürlüğü', 'Eksik / engel', 'Denetim'], 'superadmin operations mismatch bridge keeps selected context');
mustNot(superOperationsWorkflowText, 'Bunu anlayamadım', 'superadmin operations mismatch bridge avoids unknown wording');
mustNot(superOperationsWorkflowText, 'seçili kayıt bilgisi net görünmüyor', 'superadmin operations mismatch bridge avoids generic fallback');

console.log('=== COP-04B-FIX-01 SUPERADMIN + ROOM LIVE CONTEXT CHECK PASS ===');
