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
    .toLowerCase('tr-TR');
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

function mustArrayContains(arr, needle, label) {
  if (Array.isArray(arr) && arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustArrayNotContains(arr, needle, label) {
  if (!Array.isArray(arr) || !arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

function replyText(result) {
  return String(result?.reply || result?.summary || '');
}

function chipList(result) {
  return result?.contextualSuggestedChips || result?.suggestedChips || [];
}

function assertNoForbiddenVisibleTerms(text, label) {
  const forbidden = [
    'JOB_TYPE_ENTITY_MISMATCH',
    'OperationProof',
    'agreement',
    'contractShiftGeneration',
    'raw',
    'payload',
    'token',
    'hash',
    'debug',
    'write',
    'execute',
    'settlement execute',
    'stack',
    'exception',
    'Bu aksiyonu simüle et',
    'Önerilen adım:',
  ];
  for (const term of forbidden) {
    mustNotRaw(text, term, `${label} avoids ${term}`);
  }
}

function assertNoRepeatedActionPair(text, label) {
  const normalized = String(text || '');
  const suggestionLabel = 'Öneri:';
  const nextLabel = 'Sıradaki doğru işlem:';
  const suggestionIndex = normalized.indexOf(suggestionLabel);
  const nextIndex = normalized.indexOf(nextLabel);
  if (suggestionIndex < 0 || nextIndex < 0) return ok(`${label} has no duplicate action pair`);
  if (nextIndex <= suggestionIndex) fail(`${label} action pair order`);
  const suggestion = normalized.slice(suggestionIndex + suggestionLabel.length, nextIndex).trim();
  const next = normalized.slice(nextIndex + nextLabel.length).trim();
  if (!suggestion || !next) return ok(`${label} has partial action pair`);
  if (normalize(suggestion) === normalize(next)) fail(`${label} repeats the same action twice`);
  ok(`${label} keeps action pair distinct`);
}

console.log('=== COP-04B-FIX-04 CHIP + ANSWER PREMIUM POLISH CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const answerPolicySource = read('backend/src/ai/chat/answerQualityPolicy.js');
const copilotFactsSource = read('web/src/utils/copilotFacts.js');
const agreementFactsSource = read('web/src/utils/agreementCopilotFacts.js');
const entityRuntimeSource = read('backend/src/ai/chat/helpComposerEntityRuntime.js');
const selectedRuntimeSource = read('backend/src/ai/chat/helpComposerSelectedRuntime.js');
const analyzerSource = read('backend/src/ai/chat/screenStateAnalyzer.js');

must(pkg, '"check:cop04bfix04": "node backend/scripts/cop_04b_fix_04_chip_answer_premium_polish_check.js"', 'package.json exposes check:cop04bfix04');
must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
must(pkg, '"check:cop04bfix02"', 'package.json keeps check:cop04bfix02');
must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:cop04afix04"', 'package.json keeps check:cop04afix04');
must(pkg, '"check:cop04afix03"', 'package.json keeps check:cop04afix03');
must(pkg, '"check:cop04afix02"', 'package.json keeps check:cop04afix02');
must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');

must(runner, 'check:cop04bfix04', 'product extensions runner keeps cop04bfix04');
must(verifyChain, 'check:cop04bfix04', 'verify chain waits for check:cop04bfix04');
must(guide, 'check:cop04bfix04', 'script guide exposes check:cop04bfix04');
must(guide, 'check:cop04bfix03', 'script guide keeps check:cop04bfix03');
must(guide, 'check:cop04bfix02', 'script guide keeps check:cop04bfix02');
must(guide, 'check:cop04bfix01', 'script guide keeps check:cop04bfix01');
must(guide, 'check:cop04b', 'script guide keeps check:cop04b');
must(guide, 'check:cop04afix04', 'script guide keeps check:cop04afix04');
must(guide, 'check:cop04afix03', 'script guide keeps check:cop04afix03');
must(guide, 'check:cop04afix02', 'script guide keeps check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide keeps check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(auditDoc, 'COP-04B-FIX-04 acceptance note', 'audit doc keeps fix04 note');
must(auditDoc, 'aynı aksiyon', 'audit doc keeps repetition guard note');
must(auditDoc, 'domain-specific chips', 'audit doc keeps chip policy note');
must(auditDoc, 'mekanik anlatım', 'audit doc keeps mechanical phrase note');

must(helpComposerSource, 'collapseDuplicateVisibleActionPair', 'help composer keeps duplicate action collapse helper');
must(helpComposerSource, 'filterWorkflowGenericChips(fallback', 'help composer filters workflow fallback chips');
must(helpComposerSource, 'Öneri: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(visibleActionSimulation))}', 'help composer normalizes visible action simulation');
must(answerPolicySource, 'Devamını anlat', 'answer policy blocks continuation prompt');
must(answerPolicySource, 'Devamını açıkla', 'answer policy blocks continuation explanation');
must(answerPolicySource, 'Daha fazla anlat', 'answer policy blocks more explain prompt');
must(answerPolicySource, 'Daha fazla açıkla', 'answer policy blocks more explain explanation');
must(answerPolicySource, 'Riskli cihazı göster', 'answer policy keeps operation-health chip');
must(answerPolicySource, 'GPS güncel değil / çevrim dışı satırını aç', 'answer policy keeps stale chip');
must(answerPolicySource, 'Açık sorunları sırala', 'answer policy keeps issue chip');
must(answerPolicySource, 'Aktif sürücüleri kontrol et', 'answer policy keeps driver chip');
must(answerPolicySource, 'Son GPS ne zaman geldi?', 'answer policy keeps gps chip');
must(answerPolicySource, 'Araç bağlantısı var mı?', 'answer policy keeps vehicle connection chip');
must(answerPolicySource, 'Üretim geçmişini göster', 'answer policy keeps contract chip');
must(answerPolicySource, 'Hakediş önizlemesini aç', 'answer policy keeps payment chip');

must(copilotFactsSource, 'normalizeVisibleActionSimulationText', 'copilot facts keeps visible action simulation normalizer');
must(agreementFactsSource, 'replace(/^(?:Önerilen adım|Öneri)\\s*:\\s*/i', 'agreement facts strips visible action simulation prefix');
must(entityRuntimeSource, 'visibleSimulationLead', 'entity runtime keeps visible simulation lead');
must(selectedRuntimeSource, 'visibleActionSimulation', 'selected runtime keeps visible action simulation normalization');
must(analyzerSource, 'replace(/^(?:Önerilen adım|Öneri)\\s*:\\s*/i', 'screen analyzer strips visible action simulation prefix');

const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { buildMapFacts, buildOperationHealthCopilotFacts, buildCommercialCoreCopilotFacts, buildShiftFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);
const { buildAgreementCopilotFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/agreementCopilotFacts.js')).href);
const { listScreensForUser, getScreenDefinitionForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const roomUser = { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const superUser = { role: 'SUPER_ADMIN', companyId: 1, companyKind: 'DEMO' };
const companyUser = { role: 'COMPANY', companyId: 1, companyKind: 'DEMO' };
const personelUser = { role: 'PERSONEL', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const parentUser = { role: 'PARENT', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const driverUser = { role: 'DRIVER', roomId: 1, companyId: 1, companyKind: 'DEMO' };

const roomScreens = listScreensForUser(roomUser);
const superScreens = listScreensForUser(superUser);
const companyScreens = listScreensForUser(companyUser);
const personelScreens = listScreensForUser(personelUser);
const parentScreens = listScreensForUser(parentUser);
const driverScreens = listScreensForUser(driverUser);

const roomMapScreen = roomScreens.find((row) => String(row?.path || '') === '/room/map');
const roomOperationScreen = roomScreens.find((row) => String(row?.path || '') === '/room/operation-health');
const superCommercialScreen = superScreens.find((row) => String(row?.path || '') === '/superadmin/commercial-core');
const companyAgreementsScreen = companyScreens.find((row) => String(row?.path || '') === '/company/agreements');
const companyShiftsScreen = companyScreens.find((row) => String(row?.path || '') === '/company/shifts');
const personelLiveScreen = personelScreens.find((row) => String(row?.path || '') === '/personel/live');
const parentLiveScreen = parentScreens.find((row) => String(row?.path || '') === '/parent/live');
const driverTodayScreen = driverScreens.find((row) => String(row?.path || '') === '/driver/today');

if (!roomMapScreen) fail('room map screen exists');
if (!roomOperationScreen) fail('room operation health screen exists');
if (!superCommercialScreen) fail('superadmin commercial core screen exists');
if (!companyAgreementsScreen) fail('company agreements screen exists');
if (!companyShiftsScreen) fail('company shifts screen exists');
if (!personelLiveScreen) fail('personel live screen exists');
if (!parentLiveScreen) fail('parent live screen exists');
if (!driverTodayScreen) fail('driver today screen exists');

const roomMapDef = getScreenDefinitionForUser(roomUser, roomMapScreen, Number(roomMapScreen.id));
const roomOperationDef = getScreenDefinitionForUser(roomUser, roomOperationScreen, Number(roomOperationScreen.id));
const superCommercialDef = getScreenDefinitionForUser(superUser, superCommercialScreen, Number(superCommercialScreen.id));
const companyAgreementsDef = getScreenDefinitionForUser(companyUser, companyAgreementsScreen, Number(companyAgreementsScreen.id));
const companyShiftsDef = getScreenDefinitionForUser(companyUser, companyShiftsScreen, Number(companyShiftsScreen.id));
const personelLiveDef = getScreenDefinitionForUser(personelUser, personelLiveScreen, Number(personelLiveScreen.id));
const parentLiveDef = getScreenDefinitionForUser(parentUser, parentLiveScreen, Number(parentLiveScreen.id));
const driverTodayDef = getScreenDefinitionForUser(driverUser, driverTodayScreen, Number(driverTodayScreen.id));

function buildResponse(args) {
  return buildChatHelpResponse({
    entityType: 'screen',
    ...args,
  });
}

// ROOM / CANLI TAKİP
const roomMapFacts = buildMapFacts({
  selected: { id: 34, plate: '34ABC123' },
  selectedShift: { id: 3, status: 'APPROVED', vehicle: { plate: '34ABC123' }, driver: { fullName: 'Sürücü Demo' }, stops: [{ name: 'Pickup 6' }, { name: 'Durak 2' }, { name: 'Durak 3' }, { name: 'Durak 4' }, { name: 'Durak 5' }, { name: 'Durak 6' }] },
  selectedNext: { name: 'Pickup 6' },
  selectedEta: 619,
  selectedStats: { total: 6, remaining: 0, completed: 6 },
  gpsStatus: 'Zayıf / STALE',
  gpsAge: '47s',
  vehicleCount: 1,
});
const roomMapResponse = buildResponse({
  entityId: Number(roomMapScreen.id),
  user: roomUser,
  message: 'Bu araç neden haritada görünmüyor?',
  context: {
    screenPath: '/room/map',
    selectedLabel: 'Vardiya #3',
    selectedSummary: 'Seçili araç 34ABC123 görünüyor. GPS sinyali zayıf / stale durumda; son GPS 47 saniye önce gelmiş. Sıradaki durak Pickup 6, toplam durak 6 görünüyor.',
  },
  scope: { role: 'ROOM', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/room/map',
    label: 'ROOM • Canlı Takip',
    selectedLabel: 'Vardiya #3',
    selectedSummary: roomMapFacts.selectedRecordStatus,
    selectedFields: [
      { label: 'Araç', value: '34ABC123' },
      { label: 'GPS', value: 'Zayıf / STALE' },
      { label: 'Son GPS', value: '47s' },
      { label: 'Sıradaki durak', value: 'Pickup 6' },
      { label: 'ETA', value: '619dk' },
    ],
    selectedBadges: [
      { label: 'GPS', value: 'Zayıf / STALE' },
      { label: 'Vardiya Durumu', value: 'Kabul Edildi' },
    ],
    selectedEntityType: 'shift',
    selectedEntityId: 3,
    structuredFacts: roomMapFacts,
    copilotSummary: roomMapFacts.copilotSummary,
  },
  screenDefinition: roomMapDef,
  sourceEntityId: Number(roomMapScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(roomMapScreen.id),
  resolvedEntityType: 'screen',
});
const roomMapReply = replyText(roomMapResponse);
const roomMapChips = chipList(roomMapResponse);
mustNot(roomMapReply, 'seçili araç bilgisi net görünmüyor', 'room map reply avoids generic no-selection fallback');
mustAny(roomMapReply, ['34ABC123', 'Seçili araç 34ABC123 görünüyor.'], 'room map reply keeps selected vehicle');
mustAny(roomMapReply, ['GPS: Güncel değil', 'GPS: Canlı', 'GPS: Çevrim dışı', 'GPS: Bekleniyor', 'GPS güncel değil', 'GPS canlı', 'GPS çevrim dışı'], 'room map reply keeps gps state');
mustAny(roomMapReply, ['Sürücünün telefon GPS’i', 'Araç bağlantısı', 'görev bağlantısı'], 'room map reply keeps gps source language');
mustAny(roomMapReply, ['Pickup 6', 'toplam durak 6'], 'room map reply keeps next stop and stop count');
mustNotRaw(roomMapReply, 'Önerilen adım:', 'room map reply hides mechanical action wording');
assertNoRepeatedActionPair(roomMapReply, 'room map reply');
assertNoForbiddenVisibleTerms(roomMapReply, 'room map reply');
mustArrayContains(roomMapChips, 'Son GPS ne zaman geldi?', 'room map chips keep gps chip');
mustArrayContains(roomMapChips, "Sürücünün telefon GPS’i devrede mi?", 'room map chips keep driver gps chip');
mustArrayContains(roomMapChips, 'Araç bağlantısı var mı?', 'room map chips keep vehicle connection chip');
mustArrayContains(roomMapChips, 'Canlı takip ekranını aç', 'room map chips keep live tracking chip');
mustArrayNotContains(roomMapChips, 'Aynı kayıt için devam et', 'room map chips avoid generic continuation');
mustArrayNotContains(roomMapChips, 'Ekran rehberini aç', 'room map chips avoid generic guide');
mustArrayNotContains(roomMapChips, 'Bunu sor:', 'room map chips avoid self-question');

// ROOM / OPERASYON SAĞLIĞI
const roomOperationFacts = buildOperationHealthCopilotFacts({
  summary: { status: 'LIVE', cards: { activeDrivers: 0, riskyDevices: 1, staleOrOffline: 1, openIssues: 2 } },
  copilotDriver: { driverName: 'Sürücü Demo', liveState: 'STALE' },
  copilotIssue: { title: 'Canlılık sorunu', severity: 'HIGH' },
});
const roomOperationResponse = buildResponse({
  entityId: Number(roomOperationScreen.id),
  user: roomUser,
  message: 'Operasyon Sağlığı: sorun ne?',
  context: {
    screenPath: '/room/operation-health',
    selectedLabel: 'Canlılık ve cihaz riski',
    selectedSummary: roomOperationFacts.copilotSummary,
  },
  scope: { role: 'ROOM', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/room/operation-health',
    label: 'Operasyon Sağlığı',
    selectedLabel: 'Canlılık ve cihaz riski',
    selectedSummary: roomOperationFacts.copilotSummary,
    selectedFields: [
      { label: 'Aktif Sürücü', value: '0' },
      { label: 'Riskli Cihaz', value: '1' },
      { label: 'Stale / Offline', value: '1' },
      { label: 'Açık Sorun', value: '2' },
    ],
    selectedBadges: [
      { label: 'Canlılık', value: 'STALE' },
      { label: 'Önem', value: 'HIGH' },
    ],
    selectedEntityType: 'screen',
    selectedEntityId: 1114,
    structuredFacts: roomOperationFacts,
    copilotSummary: roomOperationFacts.copilotSummary,
  },
  screenDefinition: roomOperationDef,
  sourceEntityId: Number(roomOperationScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(roomOperationScreen.id),
  resolvedEntityType: 'screen',
});
const roomOperationReply = replyText(roomOperationResponse);
const roomOperationChips = chipList(roomOperationResponse);
mustAny(roomOperationReply, ['Aktif sürücü 0', 'Aktif sürücü: 0'], 'operation health reply keeps active driver count');
mustAny(roomOperationReply, ['riskli cihaz 1', 'Riskli cihaz: 1'], 'operation health reply keeps risky device count');
mustAny(roomOperationReply, ['GPS güncel değil / çevrim dışı 1', 'GPS güncel değil / çevrim dışı: 1'], 'operation health reply keeps stale offline count');
mustAny(roomOperationReply, ['açık sorun 2', 'Açık sorun: 2'], 'operation health reply keeps open issue count');
must(roomOperationReply, 'Riskli cihazı aç, GPS güncel değil / çevrim dışı satırını kontrol et ve açık sorunları sırala.', 'operation health reply keeps natural next step');
mustNot(roomOperationReply, 'Yetki sınırını kontrol et', 'operation health reply avoids default role boundary');
mustNot(roomOperationReply, 'Bu aksiyonu simüle et', 'operation health reply avoids action simulation wording');
mustNotRaw(roomOperationReply, 'Önerilen adım:', 'operation health reply hides mechanical lead');
assertNoRepeatedActionPair(roomOperationReply, 'operation health reply');
assertNoForbiddenVisibleTerms(roomOperationReply, 'operation health reply');
mustArrayContains(roomOperationChips, 'Riskli cihazı göster', 'operation health chips keep risk chip');
mustArrayContains(roomOperationChips, 'GPS güncel değil / çevrim dışı satırını aç', 'operation health chips keep stale chip');
mustArrayContains(roomOperationChips, 'Açık sorunları sırala', 'operation health chips keep issue chip');
mustArrayContains(roomOperationChips, 'Aktif sürücüleri kontrol et', 'operation health chips keep driver chip');
mustArrayNotContains(roomOperationChips, 'Aynı kayıt için devam et', 'operation health chips avoid generic continuation chip');
mustArrayNotContains(roomOperationChips, 'Ekran rehberini aç', 'operation health chips avoid generic guide chip');
mustArrayNotContains(roomOperationChips, 'Bunu sor:', 'operation health chips avoid self-question chip');

// COMPANY / SÖZLEŞME
const agreementFacts = buildAgreementCopilotFacts({
  id: 1,
  type: 'agreement',
  label: 'Sözleşme #1',
  status: 'Kabul Edildi',
  roomId: 1,
  roomName: 'DEMO Oda',
  startDate: '2026-05-16',
  endDate: '2026-05-20',
  startMin: 420,
  endMin: 540,
  weekMask: 62,
  sourceShiftId: 4,
  generatedShiftCount: 3,
  lastGeneratedShiftId: 7,
  lastGeneratedShiftStatus: 'APPROVED',
  lastGeneratedShiftStart: '20.05.2026 07:00',
  lastGeneratedShiftEnd: '20.05.2026 09:00',
  personelCount: 6,
  stopCount: 6,
}, {
  screenPath: '/company/agreements',
  screenTitle: 'Sözleşmeler (Company)',
  selectedRecordType: 'agreement',
  selectedRecordLabel: 'Sözleşme #1',
  selectedRecordId: 1,
  selectedRecordStatus: 'Kabul Edildi',
  selectedRecordSummary: 'Kabul Edildi • Oda #1 • 16.05.2026 - 20.05.2026 • Kaynak vardiya #4 • Üretilen vardiya: 3 • Son üretilen vardiya #7 • APPROVED • 20.05.2026 07:00 - 20.05.2026 09:00 • Personel: 6 • Durak: 6',
  roomName: 'DEMO Oda',
  roomLabel: 'DEMO Oda',
  startDate: '2026-05-16',
  endDate: '2026-05-20',
  sourceShiftId: 4,
  generatedShiftCount: 3,
  lastGeneratedShiftId: 7,
  lastGeneratedShiftStatus: 'APPROVED',
  lastGeneratedShiftStart: '20.05.2026 07:00',
  lastGeneratedShiftEnd: '20.05.2026 09:00',
  personelCount: 6,
  stopCount: 6,
  todayGeneratedShift: true,
  productionSignal: 'Üretilen vardiya: 3',
  vehicleLabel: '34ABC123',
  driverLabel: 'Sürücü Demo',
  shiftCount: 3,
  todayDone: 1,
  todayTotal: 1,
});
const agreementResponse = buildResponse({
  entityId: Number(companyAgreementsScreen.id),
  user: companyUser,
  message: 'Bu sözleşmeden bugün vardiya üretildi mi?',
  context: {
    screenPath: '/company/agreements',
    selectedLabel: agreementFacts.selectedRecordLabel,
    selectedSummary: agreementFacts.copilotSummary,
  },
  scope: { role: 'COMPANY', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/company/agreements',
    label: 'Sözleşmeler (Company)',
    selectedLabel: agreementFacts.selectedRecordLabel,
    selectedSummary: agreementFacts.copilotSummary,
    selectedEntityType: 'agreement',
    selectedEntityId: 1,
    selectedRecordType: 'agreement',
    selectedRecordId: 1,
    selectedRecordLabel: 'Sözleşme #1',
    selectedRecordStatus: agreementFacts.selectedRecordStatus,
    structuredFacts: agreementFacts,
    copilotSummary: agreementFacts.copilotSummary,
  },
  screenDefinition: companyAgreementsDef,
  sourceEntityId: Number(companyAgreementsScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(companyAgreementsScreen.id),
  resolvedEntityType: 'screen',
});
const agreementReply = replyText(agreementResponse);
const agreementChips = chipList(agreementResponse);
mustNot(agreementReply, 'Bunu anlayamadım', 'agreement reply avoids unknown fallback');
mustAny(agreementReply, ['Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.'], 'agreement reply keeps production wording');
mustAny(agreementReply, ['Üretilen vardiya sayısı 3', 'Üretilen vardiya: 3'], 'agreement reply keeps generated count');
must(agreementReply, 'son üretilen vardiya #7', 'agreement reply keeps last generated shift');
mustAny(agreementReply, ['Bugün üretim: Var', 'bugün üretim: var'], 'agreement reply keeps today production');
mustNotRaw(agreementReply, 'agreement', 'agreement reply avoids visible agreement term');
mustNotRaw(agreementReply, 'contractShiftGeneration', 'agreement reply avoids technical contract token');
mustNotRaw(agreementReply, 'OperationProof', 'agreement reply avoids technical proof wording');
mustNot(agreementReply, 'Bu vardiyada ana engel', 'agreement reply avoids wrong shift-first wording');
mustNotRaw(agreementReply, 'Önerilen adım:', 'agreement reply hides mechanical lead');
assertNoRepeatedActionPair(agreementReply, 'agreement reply');
assertNoForbiddenVisibleTerms(agreementReply, 'agreement reply');
mustArrayContains(agreementChips, 'Üretim geçmişini göster', 'agreement chips keep production history');
mustArrayContains(agreementChips, 'Bugünkü vardiyaları göster', 'agreement chips keep today shifts');
mustArrayContains(agreementChips, 'İlgili sözleşmeyi aç', 'agreement chips keep open contract');
mustArrayContains(agreementChips, 'Üretim durumunu açıkla', 'agreement chips keep explain production');
mustArrayNotContains(agreementChips, 'Bunu sor:', 'agreement chips avoid generic self-question');
mustArrayNotContains(agreementChips, 'Aynı kayıt için devam et', 'agreement chips avoid generic continuation');
mustArrayNotContains(agreementChips, 'Ekran rehberini aç', 'agreement chips avoid generic screen guide');

// SUPER ADMIN / TİCARİ AKIŞ
const commercialFacts = buildCommercialCoreCopilotFacts({
  paymentPreviewSummary: {
    title: 'Hakediş önizleme',
    statusText: 'Hazır değil',
    missingCount: 0,
    reviewCount: 1,
    paymentAccountStatus: 'Eksik bilgi',
    contractOrShiftSummary: 'Sözleşme / vardiya sinyali',
    nextAction: 'Önce ödeme hesabı, komisyon ve hizmet/onay sinyalini kontrol et.',
    nonFinalText: 'Ödeme başlatılmaz. Sadece önizleme verisi indirilir.',
    detailReason: 'Hazırlık sinyali okunuyor.',
  },
  paymentBackbone: { activeRule: { paymentMode: 'OFF', commissionBps: 0 } },
  settings: { globalRule: { paymentMode: 'OFF' } },
  settlementStatus: { summaryText: 'Kontrol gerekli', status: 'NEEDS_REVIEW' },
  accountStatus: { summaryText: 'Eksik bilgi' },
  operationProofSummary: { statusText: 'Kontrol gerekli', summaryText: 'Servis kanıtı kontrol gerekli', visibilityNote: 'Servis kanıtı görünür' },
  paymentSourcesMeta: { summary: 'Önizleme kaynakları özetleniyor.', total: 2 },
  lifecycle: { summary: 'Sözleşme / vardiya sinyali' },
});
const commercialResponse = buildResponse({
  entityId: Number(superCommercialScreen.id),
  user: superUser,
  message: 'Bu hakediş neden hazır değil?',
  context: {
    screenPath: '/superadmin/commercial-core',
    selectedLabel: 'Hakediş önizleme',
    selectedSummary: commercialFacts.copilotSummary,
  },
  scope: { role: 'SUPER_ADMIN', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    id: Number(superCommercialScreen.id),
    path: '/superadmin/commercial-core',
    label: 'Ticari Akış',
    selectedLabel: 'Hakediş önizleme',
    selectedSummary: commercialFacts.copilotSummary,
    selectedEntityType: 'screen',
    selectedEntityId: Number(superCommercialScreen.id),
    selectedRecordStatus: commercialFacts.selectedRecordStatus,
    copilotSummary: commercialFacts.copilotSummary,
    structuredFacts: commercialFacts,
  },
  screenDefinition: superCommercialDef,
  sourceEntityId: Number(superCommercialScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(superCommercialScreen.id),
  resolvedEntityType: 'screen',
});
const commercialReply = replyText(commercialResponse);
const commercialChips = chipList(commercialResponse);
mustNot(commercialReply, 'Bunu anlayamadım', 'commercial reply avoids unknown fallback');
mustAny(commercialReply, ['Eksik bilgi 0 görünüyor', 'Eksik bilgi 0'], 'commercial reply keeps zero-missing wording');
mustAny(commercialReply, ['ödeme hesabı', 'ödeme hesabını', 'ödeme hesabı, komisyon durumu ve hizmet/onay sinyalini'], 'commercial reply keeps payment account wording');
mustAny(commercialReply, ['komisyon', 'komisyon durumu'], 'commercial reply keeps commission wording');
mustAny(commercialReply, ['hizmet/onay', 'servis kanıtı', 'operasyon kanıtı'], 'commercial reply keeps proof wording');
mustAny(commercialReply, ['Ödeme başlatılmaz', 'ödeme başlatılmaz'], 'commercial reply keeps readonly payment boundary');
mustNotRaw(commercialReply, 'agreement', 'commercial reply avoids visible agreement term');
mustNotRaw(commercialReply, 'contractShiftGeneration', 'commercial reply avoids technical contract token');
mustNotRaw(commercialReply, 'OperationProof', 'commercial reply avoids technical proof wording');
mustNot(commercialReply, 'Bu vardiyada ana engel', 'commercial reply avoids wrong shift-first wording');
mustNotRaw(commercialReply, 'Önerilen adım:', 'commercial reply hides mechanical lead');
assertNoRepeatedActionPair(commercialReply, 'commercial reply');
assertNoForbiddenVisibleTerms(commercialReply, 'commercial reply');
mustArrayContains(commercialChips, 'Eksik bilgi ne?', 'commercial chips keep missing info');
mustArrayContains(commercialChips, 'Ödeme hesabı var mı?', 'commercial chips keep payment account');
mustArrayContains(commercialChips, 'Komisyon durumu ne?', 'commercial chips keep commission');
mustArrayContains(commercialChips, 'Hakediş önizlemesini aç', 'commercial chips keep preview');
mustArrayNotContains(commercialChips, 'Bunu sor:', 'commercial chips avoid generic self-question');
mustArrayNotContains(commercialChips, 'Aynı kayıt için devam et', 'commercial chips avoid generic continuation');
mustArrayNotContains(commercialChips, 'Ekran rehberini aç', 'commercial chips avoid generic screen guide');

// COMPANY / VARDİYALAR
const companyShiftFacts = buildShiftFacts({
  shift: {
    id: 7,
    status: 'APPROVED',
    vehicleId: 34,
    vehicle: { id: 34, plate: '34ABC123', gpsLast: { at: '2026-05-16T08:00:00.000Z', sourceLabel: 'Araç GPS’i' } },
    driverId: 9,
    driver: { fullName: 'Sürücü Demo' },
    stops: [{ name: 'Pickup 6', order: 1 }, { name: 'Durak 2', order: 2 }, { name: 'Durak 3', order: 3 }, { name: 'Durak 4', order: 4 }, { name: 'Durak 5', order: 5 }, { name: 'Durak 6', order: 6 }],
    nextStop: { name: 'Pickup 6' },
    stopCount: 6,
    operationProofStatus: 'Eksik',
  },
  itemCount: 1,
});
const companyShiftResponse = buildResponse({
  entityId: Number(companyShiftsScreen.id),
  user: companyUser,
  message: 'Bu vardiya neden başlayamıyor?',
  context: {
    screenPath: '/company/shifts',
    selectedLabel: 'Vardiya #7',
    selectedSummary: companyShiftFacts.copilotSummary,
  },
  scope: { role: 'COMPANY', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/company/shifts',
    label: 'Vardiyalar',
    selectedLabel: 'Vardiya #7',
    selectedSummary: companyShiftFacts.copilotSummary,
    selectedRecordType: 'shift',
    selectedRecordId: 7,
    selectedRecordStatus: companyShiftFacts.selectedRecordStatus,
    selectedFields: [
      { label: 'Vardiya', value: '#7' },
      { label: 'Durum', value: 'APPROVED' },
      { label: 'Araç', value: '34ABC123' },
      { label: 'Sürücü', value: 'Sürücü Demo' },
      { label: 'Durak', value: '6' },
    ],
    selectedBadges: [
      { label: 'GPS', value: 'Araç GPS’i' },
    ],
    structuredFacts: companyShiftFacts,
    copilotSummary: companyShiftFacts.copilotSummary,
  },
  screenDefinition: companyShiftsDef,
  sourceEntityId: Number(companyShiftsScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(companyShiftsScreen.id),
  resolvedEntityType: 'screen',
});
const companyShiftReply = replyText(companyShiftResponse);
const companyShiftChips = chipList(companyShiftResponse);
mustAny(companyShiftReply, ['Vardiya #7', 'APPROVED'], 'company shift reply keeps selected shift');
mustAny(companyShiftReply, ['34ABC123', 'Araç: 34ABC123'], 'company shift reply keeps vehicle');
mustAny(companyShiftReply, ['Sürücü Demo', 'Sürücü'], 'company shift reply keeps driver');
mustAny(companyShiftReply, ['Durak: 6', '6'], 'company shift reply keeps stop count');
mustNotRaw(companyShiftReply, 'Önerilen adım:', 'company shift reply hides mechanical lead');
assertNoRepeatedActionPair(companyShiftReply, 'company shift reply');
assertNoForbiddenVisibleTerms(companyShiftReply, 'company shift reply');
mustArrayContains(companyShiftChips, 'Başlatma zamanı uygun mu?', 'company shift chips keep start time chip');
mustArrayContains(companyShiftChips, 'Araç/sürücü bağlantısını kontrol et', 'company shift chips keep vehicle-driver chip');
mustArrayContains(companyShiftChips, 'Rota/durak hazır mı?', 'company shift chips keep route chip');
mustArrayContains(companyShiftChips, 'GPS/operasyon kanıtını kontrol et', 'company shift chips keep proof chip');
mustArrayNotContains(companyShiftChips, 'Aynı kayıt için devam et', 'company shift chips avoid generic continuation');
mustArrayNotContains(companyShiftChips, 'Ekran rehberini aç', 'company shift chips avoid generic guide');

// PERSONEL / CANLI TAKİP
const personelFacts = buildMapFacts({
  selected: { id: 34, plate: '34ABC123' },
  selectedShift: { id: 12, status: 'ACTIVE', vehicle: { plate: '34ABC123' }, driver: { fullName: 'Sürücü Demo' }, stops: [{ name: 'Personel durağı' }, { name: 'Okul' }] },
  selectedNext: { name: 'Personel durağı' },
  selectedEta: 12,
  selectedStats: { total: 6, remaining: 2, completed: 4 },
  gpsStatus: 'GPS eski',
  gpsAge: '2 dk',
  vehicleCount: 1,
});
const personelResponse = buildResponse({
  entityId: Number(personelLiveScreen.id),
  user: personelUser,
  message: 'Servis neden görünmüyor?',
  context: {
    screenPath: '/personel/live',
    selectedLabel: 'Bugünkü servis • 34ABC123',
    selectedSummary: personelFacts.copilotSummary,
  },
  scope: { role: 'PERSONEL', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/personel/live',
    label: 'Servisim',
    selectedLabel: 'Bugünkü servis • 34ABC123',
    selectedSummary: 'Bugünkü servis • 34ABC123 • GPS eski • Son GPS 2 dk • ETA 12 dk • Personel durağı',
    selectedFields: [
      { label: 'Servis', value: 'Bugünkü servis' },
      { label: 'Araç', value: '34ABC123' },
      { label: 'Sürücü', value: 'Sürücü Demo' },
      { label: 'Son GPS', value: '2 dk' },
      { label: 'GPS durumu', value: 'GPS eski' },
      { label: 'Kaynak', value: 'Araç GPS’i' },
      { label: 'Sürücünün telefon GPS’i', value: 'Devrede' },
      { label: 'Sıradaki durak', value: 'Personel durağı' },
      { label: 'ETA', value: '12 dk' },
      { label: 'Servis durumu', value: 'Aktif' },
    ],
    selectedBadges: [
      { label: 'Araç GPS’i', value: 'GPS eski' },
      { label: 'Sürücünün telefon GPS’i', value: 'Devrede' },
    ],
    selectedRecordType: 'vehicle',
    selectedRecordId: 34,
    selectedRecordLabel: 'Bugünkü servis • 34ABC123',
    selectedRecordStatus: 'Araç: 34ABC123 • Son GPS: 2 dk • GPS durumu: GPS eski • Kaynak: Araç GPS’i • Sürücünün telefon GPS’i devrede • Sıradaki durak: Personel durağı • ETA: 12 dk • Servis durumu: Aktif',
    selectedEntityType: 'vehicle',
    selectedEntityId: 34,
    structuredFacts: personelFacts,
    copilotSummary: personelFacts.copilotSummary,
  },
  screenDefinition: personelLiveDef,
  sourceEntityId: Number(personelLiveScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(personelLiveScreen.id),
  resolvedEntityType: 'screen',
});
const personelReply = replyText(personelResponse);
const personelChips = chipList(personelResponse);
mustNot(personelReply, 'Bunu anlayamadım', 'personel reply avoids unknown fallback');
mustNot(personelReply, 'seçili servis bilgisi net görünmüyor', 'personel reply avoids generic no-selection fallback');
mustAny(personelReply, ['34ABC123', 'Bugünkü servis'], 'personel reply keeps selected service');
mustAny(personelReply, ['GPS eski', 'Son GPS 2 dk', 'Son GPS: 2 dk'], 'personel reply keeps gps age/status');
mustAny(personelReply, ['Araç GPS’i', 'Sürücünün telefon GPS’i'], 'personel reply keeps gps source language');
mustAny(personelReply, ['Bugünkü servis 34ABC123', 'Bugünkü servis'], 'personel reply keeps live service wording');
mustNotRaw(personelReply, 'Önerilen adım:', 'personel reply hides mechanical lead');
assertNoRepeatedActionPair(personelReply, 'personel reply');
assertNoForbiddenVisibleTerms(personelReply, 'personel reply');
mustArrayContains(personelChips, 'Araç nerede?', 'personel chips keep live service chip');
mustArrayContains(personelChips, 'Son GPS ne zaman geldi?', 'personel chips keep gps chip');
mustArrayContains(personelChips, 'Servis durumu ne?', 'personel chips keep status chip');
mustArrayContains(personelChips, "Sürücünün telefon GPS’i devrede mi?", 'personel chips keep phone gps chip');
mustArrayNotContains(personelChips, 'Bunu sor', 'personel chips avoid generic self-question');
mustArrayNotContains(personelChips, 'Aynı kayıt için devam et', 'personel chips avoid generic continuation');
mustArrayNotContains(personelChips, 'Ekran rehberini aç', 'personel chips avoid generic guide');

// VELI / ÖĞRENCİMİN SERVİSİ
const parentFacts = buildMapFacts({
  selected: { id: 34, plate: '34ABC123' },
  selectedShift: { id: 15, status: 'ACTIVE', vehicle: { plate: '34ABC123' }, driver: { fullName: 'Sürücü Demo' }, stops: [{ name: 'Okul' }, { name: 'Ev' }] },
  selectedNext: { name: 'Okul' },
  selectedEta: 8,
  selectedStats: { total: 5, remaining: 1, completed: 4 },
  gpsStatus: 'Canlı',
  gpsAge: '30 sn',
  vehicleCount: 1,
});
const parentResponse = buildResponse({
  entityId: Number(parentLiveScreen.id),
  user: parentUser,
  message: 'Servis neden görünmüyor?',
  context: {
    screenPath: '/parent/live',
    selectedLabel: 'Öğrenci servisi • 34ABC123',
    selectedSummary: parentFacts.copilotSummary,
  },
  scope: { role: 'PARENT', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/parent/live',
    label: 'Öğrencimin servisi',
    selectedLabel: 'Öğrenci servisi • 34ABC123',
    selectedSummary: 'Öğrenci servisi • 34ABC123 • Canlı • Son GPS 30 sn • ETA 8 dk • Okul',
    selectedFields: [
      { label: 'Öğrenci', value: 'Öğrenci servisi' },
      { label: 'Araç', value: '34ABC123' },
      { label: 'Son GPS', value: '30 sn' },
      { label: 'GPS durumu', value: 'Canlı' },
      { label: 'Kaynak', value: 'Sürücünün telefon GPS’i' },
      { label: 'Sıradaki durak', value: 'Okul' },
      { label: 'ETA', value: '8 dk' },
      { label: 'Servis durumu', value: 'Yolda' },
    ],
    selectedBadges: [
      { label: 'Araç GPS’i', value: 'Canlı' },
      { label: 'Sürücünün telefon GPS’i', value: 'Devrede' },
    ],
    selectedRecordType: 'studentService',
    selectedRecordId: 34,
    selectedRecordLabel: 'Öğrenci servisi',
    selectedRecordStatus: 'Araç: 34ABC123 • Son GPS: 30 sn • GPS durumu: Canlı • Kaynak: Sürücünün telefon GPS’i • Sıradaki durak: Okul • ETA: 8 dk • Servis durumu: Yolda',
    selectedEntityType: 'vehicle',
    selectedEntityId: 34,
    structuredFacts: parentFacts,
    copilotSummary: parentFacts.copilotSummary,
  },
  screenDefinition: parentLiveDef,
  sourceEntityId: Number(parentLiveScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(parentLiveScreen.id),
  resolvedEntityType: 'screen',
});
const parentReply = replyText(parentResponse);
const parentChips = chipList(parentResponse);
mustNot(parentReply, 'Bunu anlayamadım', 'parent reply avoids unknown fallback');
mustNot(parentReply, 'seçili servis bilgisi net görünmüyor', 'parent reply avoids generic no-selection fallback');
mustAny(parentReply, ['34ABC123', 'Öğrenci servisi'], 'parent reply keeps selected service');
mustAny(parentReply, ['30 sn', 'Son GPS 30 sn', 'Canlı'], 'parent reply keeps gps age/status');
mustAny(parentReply, ['Sürücünün telefon GPS’i', 'Araç GPS’i'], 'parent reply keeps gps source language');
mustAny(parentReply, ['Öğrencinin servisi 34ABC123', 'Öğrencinin servisi'], 'parent reply keeps live service wording');
mustNotRaw(parentReply, 'Önerilen adım:', 'parent reply hides mechanical lead');
assertNoRepeatedActionPair(parentReply, 'parent reply');
assertNoForbiddenVisibleTerms(parentReply, 'parent reply');
mustArrayContains(parentChips, 'Son GPS ne zaman geldi?', 'parent chips keep live service chip');
mustArrayContains(parentChips, 'Son GPS ne zaman geldi?', 'parent chips keep gps chip');
mustArrayContains(parentChips, 'ETA nedir?', 'parent chips keep eta chip');
mustArrayContains(parentChips, 'Araç bağlantısı var mı?', 'parent chips keep vehicle connection chip');
mustArrayNotContains(parentChips, 'Bunu sor', 'parent chips avoid generic self-question');
mustArrayNotContains(parentChips, 'Aynı kayıt için devam et', 'parent chips avoid generic continuation');
mustArrayNotContains(parentChips, 'Ekran rehberini aç', 'parent chips avoid generic guide');

// SÜRÜCÜ / BUGÜNKÜ GÖREV
const driverFacts = buildShiftFacts({
  shift: {
    id: 3,
    status: 'APPROVED',
    vehicleId: 34,
    vehicle: { id: 34, plate: '34ABC123', gpsLast: { at: '2026-05-16T08:00:00.000Z', sourceLabel: 'Sürücünün telefon GPS’i' }, gpsState: { lastUiStatus: 'Telefon GPS’i beklemede', sourceLabel: 'Sürücünün telefon GPS’i' } },
    driverId: 9,
    driver: { fullName: 'Sürücü Demo' },
    stops: [{ name: 'Pickup 6', order: 1 }, { name: 'Durak 2', order: 2 }, { name: 'Durak 3', order: 3 }, { name: 'Durak 4', order: 4 }, { name: 'Durak 5', order: 5 }, { name: 'Durak 6', order: 6 }],
    nextStop: { name: 'Pickup 6' },
    stopCount: 6,
    operationProofStatus: 'Eksik',
    proofStatus: 'Eksik',
    serviceProofStatus: 'Eksik',
  },
  itemCount: 1,
});
const driverResponse = buildResponse({
  entityId: Number(driverTodayScreen.id),
  user: driverUser,
  message: 'Görev neden başlamıyor?',
  context: {
    screenPath: '/driver/today',
    selectedLabel: 'Vardiya #3',
    selectedSummary: driverFacts.copilotSummary,
  },
  scope: { role: 'DRIVER', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/driver/today',
    label: 'Bugünkü görev',
    selectedLabel: 'Vardiya #3',
    selectedSummary: 'Vardiya #3 • Kabul Edildi • Araç 34ABC123 • Son GPS Telefon GPS’i beklemede • Pickup 6 • Operasyon kanıtı eksik',
    selectedFields: [
      { label: 'Vardiya', value: '#3' },
      { label: 'Durum', value: 'Kabul Edildi' },
      { label: 'Araç', value: '34ABC123' },
      { label: 'Sürücü', value: 'Sürücü Demo' },
      { label: 'Durak', value: '6' },
      { label: 'Son GPS', value: 'Telefon GPS’i beklemede' },
      { label: 'GPS durumu', value: 'Telefon GPS’i beklemede' },
      { label: 'Kaynak', value: 'Sürücünün telefon GPS’i' },
      { label: 'Operasyon kanıtı', value: 'Eksik' },
    ],
    selectedBadges: [
      { label: 'Araç GPS’i', value: 'Telefon GPS’i beklemede' },
      { label: 'Sürücünün telefon GPS’i', value: 'Sürücünün telefon GPS’i' },
    ],
    selectedRecordType: 'shift',
    selectedRecordId: 3,
    selectedRecordLabel: 'Vardiya #3',
    selectedRecordStatus: 'Durum: Kabul Edildi • Araç: 34ABC123 • Sürücü: Sürücü Demo • Durak: 6 • Son GPS: Telefon GPS’i beklemede • GPS durumu: Telefon GPS’i beklemede • Kaynak: Sürücünün telefon GPS’i • Operasyon kanıtı: Eksik',
    selectedEntityType: 'shift',
    selectedEntityId: 3,
    structuredFacts: driverFacts,
    copilotSummary: driverFacts.copilotSummary,
  },
  screenDefinition: driverTodayDef,
  sourceEntityId: Number(driverTodayScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(driverTodayScreen.id),
  resolvedEntityType: 'screen',
});
const driverReply = replyText(driverResponse);
const driverChips = chipList(driverResponse);
mustAny(driverReply, ['Vardiya #3', 'Kabul Edildi'], 'driver reply keeps selected task');
mustAny(driverReply, ['34ABC123', 'Araç: 34ABC123'], 'driver reply keeps vehicle');
mustAny(driverReply, ['Telefon GPS’i beklemede', 'Sürücünün telefon GPS’i'], 'driver reply keeps gps source wording');
mustAny(driverReply, ['Pickup 6', 'Durak: 6'], 'driver reply keeps route info');
mustAny(driverReply, ['operasyon kanıtı', 'başlatma kanıtı'], 'driver reply keeps proof wording');
mustNot(driverReply, 'OperationProof', 'driver reply avoids technical proof token');
mustNot(driverReply, 'Bu aksiyonu simüle et', 'driver reply avoids mechanical action wording');
mustNotRaw(driverReply, 'Önerilen adım:', 'driver reply hides mechanical lead');
assertNoRepeatedActionPair(driverReply, 'driver reply');
assertNoForbiddenVisibleTerms(driverReply, 'driver reply');
mustArrayContains(driverChips, 'Başlatma zamanı uygun mu?', 'driver chips keep start chip');
mustArrayContains(driverChips, 'Sonraki durak nerede?', 'driver chips keep next stop chip');
mustArrayContains(driverChips, 'GPS/operasyon kanıtını kontrol et', 'driver chips keep proof chip');
mustArrayContains(driverChips, 'Rota/durak hazır mı?', 'driver chips keep route chip');
mustArrayNotContains(driverChips, 'Aynı kayıt için devam et', 'driver chips avoid generic continuation');
mustArrayNotContains(driverChips, 'Ekran rehberini aç', 'driver chips avoid generic guide');
mustArrayNotContains(driverChips, 'Bunu sor:', 'driver chips avoid self-question');

// PERSONEL fallback (role-friendly no-selection)
const personelNoSelectionResponse = buildResponse({
  entityId: Number(personelLiveScreen.id),
  user: personelUser,
  message: 'Servis neden görünmüyor?',
  context: {
    screenPath: '/personel/live',
    selectedLabel: '',
    selectedSummary: '',
  },
  scope: { role: 'PERSONEL', roleMode: 'OPERATIONS' },
  conversationState: { recentMessages: [] },
  screenContext: {
    path: '/personel/live',
    label: 'Servisim',
    selectedLabel: '',
    selectedSummary: '',
    selectedEntityType: 'screen',
    selectedEntityId: Number(personelLiveScreen.id),
    structuredFacts: null,
    copilotSummary: '',
  },
  screenDefinition: personelLiveDef,
  sourceEntityId: Number(personelLiveScreen.id),
  sourceEntityType: 'screen',
  resolvedEntityId: Number(personelLiveScreen.id),
  resolvedEntityType: 'screen',
});
const personelNoSelectionReply = replyText(personelNoSelectionResponse);
mustNot(personelNoSelectionReply, 'Bunu anlayamadım', 'personel no-selection reply avoids unknown fallback');
mustAny(personelNoSelectionReply, ['Bu ekranda seçili servis bilgisi net görünmüyor', 'Servis görünmüyorsa'], 'personel no-selection reply keeps safe fallback');

console.log('=== COP-04B-FIX-04 CHIP + ANSWER PREMIUM POLISH CHECK PASS ===');
