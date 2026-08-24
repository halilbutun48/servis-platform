#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertProductExtensionsIncludes, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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
  return String(result?.reply || result?.summary || result?.screenExplanation || '');
}

function chipList(result) {
  return result?.contextualSuggestedChips || result?.suggestedChips || [];
}

function assertNoForbiddenVisibleTerms(text, label) {
  const forbidden = [
    'FORBIDDEN',
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
    'Validation failed',
    'Bu aksiyonu simüle et',
  ];
  for (const term of forbidden) {
    mustNotRaw(text, term, `${label} avoids ${term}`);
  }
}

console.log('=== COP-04B-FIX-08 PARENT LIVE CONTEXT CHECK ===');

const pkg = read('package.json');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const serviceSource = read('backend/src/ai/service.js');
const copilotFactsSource = read('web/src/utils/copilotFacts.js');
const parentLivePanelSource = read('web/src/panels/parent/LivePanel.jsx');
const drawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const copilotPanelSource = read('web/src/panels/shared/CopilotPanel.jsx');
const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');
const answerPolicySource = read('backend/src/ai/chat/answerQualityPolicy.js');
const registryScripts = productExtensionsChecks.map((step) => step.script);

must(pkg, '"check:cop04bfix08": "node backend/scripts/cop_04b_fix_08_parent_live_context_check.js"', 'package.json exposes check:cop04bfix08');
must(pkg, '"check:cop04bfix07"', 'package.json keeps check:cop04bfix07');
must(pkg, '"check:cop04bfix06"', 'package.json keeps check:cop04bfix06');
must(pkg, '"check:cop04bfix05"', 'package.json keeps check:cop04bfix05');
must(pkg, '"check:cop04bfix04"', 'package.json keeps check:cop04bfix04');
must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:product-extensions"', 'package.json keeps check:product-extensions');

assertProductExtensionsIncludes('check:cop04bfix08', 'product extensions registry references cop04bfix08', registryScripts);
assertProductExtensionsIncludes('check:cop04bfix08', 'verify chain registry waits for check:cop04bfix08', registryScripts);
must(guide, 'check:cop04bfix08', 'script guide exposes check:cop04bfix08');
must(guide, 'check:cop04bfix07', 'script guide keeps check:cop04bfix07');
must(guide, 'check:cop04bfix06', 'script guide keeps check:cop04bfix06');
must(guide, 'check:cop04bfix05', 'script guide keeps check:cop04bfix05');
must(guide, 'check:cop04bfix04', 'script guide keeps check:cop04bfix04');
must(guide, 'check:cop04bfix03', 'script guide keeps check:cop04bfix03');
must(guide, 'check:cop04b', 'script guide keeps check:cop04b');

must(auditDoc, 'COP-04B-FIX-08 Parent live screen context/no-live-vehicle fallback', 'audit doc keeps fix08 note');
must(auditDoc, 'Veli / Canlı Takip free-chat submit request', 'audit doc keeps parent live bridge note');
must(auditDoc, 'Bu ekran, saha geri bildirimlerini', 'audit doc keeps feedback wording reference');

must(helpComposerSource, 'parentLiveNoVehicleDetected', 'help composer keeps parent live no-vehicle detector');
must(helpComposerSource, 'buildParentLiveNoVehicleReply', 'help composer keeps parent live no-vehicle reply');
must(helpComposerSource, 'Şu an bu çocuk için canlı araç görünmüyor.', 'help composer keeps parent live no-vehicle wording');
must(helpComposerSource, 'Servis saati uygun mu?', 'help composer keeps parent live no-vehicle chip');
must(helpComposerSource, 'Araç ataması var mı?', 'help composer keeps parent live no-vehicle chip');
must(helpComposerSource, 'Canlı konum neden yok?', 'help composer keeps parent live no-vehicle chip');
must(helpComposerSource, 'Bildirimleri kontrol et', 'help composer keeps parent live no-vehicle chip');
must(helpComposerSource, 'Son konum bilgisi ne zaman geldi?', 'help composer keeps parent live selected chip');
must(helpComposerSource, 'Tahmini varış süresi nedir?', 'help composer keeps parent live selected chip');
must(helpComposerSource, 'Araç bağlantısı var mı?', 'help composer keeps parent live selected chip');
must(helpComposerSource, 'Sürücünün telefonundan konum sinyali devrede mi?', 'help composer keeps parent live selected chip');
must(helpComposerSource, 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor', 'help composer keeps safe parent fallback');

must(serviceSource, 'noLiveVehicle', 'service keeps no-live vehicle detection');
must(serviceSource, 'Şu an bu çocuk için canlı araç görünmüyor.', 'service keeps no-live vehicle summary');
must(serviceSource, 'Bu ekranda seçili araç bilgisi net görünmüyor.', 'service keeps generic no-selection fallback');

must(copilotFactsSource, 'buildParentLiveNoVehicleFacts', 'facts keeps parent live no-vehicle helper');
must(copilotFactsSource, 'Canlı araç', 'facts keeps live-vehicle no-show labels');
must(copilotFactsSource, 'Araç ataması', 'facts keeps vehicle assignment label');
must(copilotFactsSource, 'Servis saati', 'facts keeps service-hour label');

must(parentLivePanelSource, 'buildParentLiveNoVehicleFacts', 'parent live panel keeps no-vehicle facts bridge');
must(parentLivePanelSource, 'setCopilotSelection(copilotSelection)', 'parent live panel keeps selection push');
must(parentLivePanelSource, 'selectedRecordLabel', 'parent live panel keeps selected record label bridge');
must(parentLivePanelSource, 'Araç konum sinyali', 'parent live panel keeps vehicle signal badge');
must(parentLivePanelSource, 'Sürücünün telefonundan konum sinyali', 'parent live panel keeps driver phone signal badge');

must(drawerSource, 'helpContextSummary', 'floating drawer keeps helpContextSummary bridge');
must(drawerSource, 'contextSummary', 'floating drawer keeps contextSummary bridge');
must(drawerSource, 'selectedFields', 'floating drawer keeps selected fields bridge');
must(drawerSource, 'selectedBadges', 'floating drawer keeps selected badges bridge');
must(drawerSource, 'structuredFacts', 'floating drawer keeps structured facts bridge');
must(drawerSource, 'liveFacts', 'floating drawer keeps live facts bridge');
must(copilotPanelSource, 'helpContextSummary', 'copilot panel keeps helpContextSummary bridge');
must(copilotPanelSource, 'contextSummary', 'copilot panel keeps contextSummary bridge');
must(copilotPanelSource, 'selectedFields', 'copilot panel keeps selected fields bridge');
must(copilotPanelSource, 'selectedBadges', 'copilot panel keeps selected badges bridge');
must(copilotPanelSource, 'structuredFacts', 'copilot panel keeps structured facts bridge');
must(copilotPanelSource, 'liveFacts', 'copilot panel keeps live facts bridge');

must(intentRouterSource, "pathHas(options.screenPath, ['/parent/live'])", 'intent router keeps parent live path routing');
must(intentRouterSource, 'LOCATION_HELP', 'intent router keeps location help intent');
must(answerPolicySource, "path.includes('/parent/live')", 'answer policy keeps parent live chips path');
must(answerPolicySource, 'Son konum bilgisi ne zaman geldi?', 'answer policy keeps parent live selected chip');
must(answerPolicySource, 'Tahmini varış süresi nedir?', 'answer policy keeps parent live selected chip');
must(answerPolicySource, 'Araç bağlantısı var mı?', 'answer policy keeps parent live selected chip');
must(answerPolicySource, 'Sürücünün telefonundan konum sinyali devrede mi?', 'answer policy keeps parent live selected chip');
must(answerPolicySource, 'Bu ekranı detaylı anlat', 'answer policy keeps generic chip block');
must(answerPolicySource, 'Bunu sor', 'answer policy keeps generic chip block');
must(answerPolicySource, 'Aynı kayıt için devam et', 'answer policy keeps continuation block');
must(answerPolicySource, 'Ekran rehberini aç', 'answer policy keeps guide block');
must(answerPolicySource, 'İlgili durumu sor', 'answer policy keeps generic follow-up block');

const { detectQuestionIntent } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/intentRouter.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { resolveChatContext } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/contextResolver.js')).href);
const { listScreensForUser, getScreenDefinitionForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const parentUser = { role: 'PARENT', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const parentScreen = listScreensForUser(parentUser).find((row) => String(row?.path || '') === '/parent/live');
if (!parentScreen) fail('parent live screen exists');
const parentScreenDef = getScreenDefinitionForUser(parentUser, parentScreen, Number(parentScreen.id));

function buildResponse(args) {
  return buildChatHelpResponse({
    entityType: 'screen',
    ...args,
  });
}

function buildParentFixture({
  selectedRecord = null,
  selectedLabel = '',
  selectedRecordLabel = '',
  helpContextSummary = '',
  contextSummary = '',
  selectedFields = [],
  selectedBadges = [],
  selectedSummary = '',
  selectedRecordSummary = '',
  selectedRecordStatus = '',
  selectedEntityType = 'screen',
  selectedEntityId = 5101,
  structuredFacts = null,
  liveFacts = null,
  extraFacts = {},
} = {}) {
  const facts = structuredFacts && typeof structuredFacts === 'object'
    ? structuredFacts
    : liveFacts && typeof liveFacts === 'object'
      ? liveFacts
      : null;
  return {
    path: '/parent/live',
    label: 'Veli • Canlı Takip',
    role: 'PARENT',
    companyKind: 'DEMO',
    selectedLabel,
    selectedEntityType,
    selectedEntityId,
    selectedSummary: selectedSummary || helpContextSummary || contextSummary || '',
    selectedRecordSummary: selectedRecordSummary || selectedSummary || helpContextSummary || contextSummary || '',
    selectedRecordStatus,
    selectedRecordLabel: selectedRecordLabel || selectedLabel || selectedRecord?.label || '',
    helpContextSummary,
    contextSummary,
    selectedFields,
    selectedBadges,
    structuredFacts: facts ? { ...facts, ...extraFacts } : (Object.keys(extraFacts).length ? { ...extraFacts } : null),
    liveFacts: facts ? { ...facts, ...extraFacts } : (Object.keys(extraFacts).length ? { ...extraFacts } : null),
    selectedRecord,
  };
}

const noVehicleHelpSummary = 'Şu an: Canlı • Çocuk: #2 Student One • Araç: 0 • Okul/Şirket: DemoOkul • Bölge: #1 • Bu çocuk için şu an canlı araç görünmüyor. Araç sadece aktif vardiya saat aralığında ve araç ataması varsa görünür.';
const noVehicleContextSummary = 'Veli canlı takip • Student One • Araç yok • Canlı araç görünmüyor • Aktif vardiya saat aralığı ve araç ataması gerekir.';
const noVehicleFixture = buildParentFixture({
  selectedRecord: null,
  helpContextSummary: noVehicleHelpSummary,
  contextSummary: noVehicleContextSummary,
  selectedLabel: '',
  selectedSummary: '',
  selectedRecordSummary: '',
  selectedFields: [],
  selectedBadges: [],
  selectedEntityType: 'screen',
  selectedEntityId: Number(parentScreen.id),
});

const intentA = detectQuestionIntent('Servis neden görünmüyor?', { entityType: 'screen', screenPath: '/parent/live', originalMessage: 'Servis neden görünmüyor?' });
mustAny(intentA.questionType, ['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE'], 'parent live no-vehicle question routes to live location intent');
mustNot(intentA.questionType, 'FEEDBACK_STATUS', 'parent live no-vehicle question avoids feedback intent');

const resolvedA = await resolveChatContext({
  entityType: 'screen',
  entityId: Number(parentScreen.id),
  user: parentUser,
  screenContext: noVehicleFixture,
  conversationState: {
    recentMessages: [],
    lastScreenPath: '/parent/live',
    lastScreenLabel: 'Veli • Canlı Takip',
  },
});
must(resolvedA.context?.path || '', '/parent/live', 'parent live no-vehicle keeps parent live screen context');
must(resolvedA.resolvedEntityType || '', 'screen', 'parent live no-vehicle keeps screen entity type');

const responseA = buildResponse({
  entityId: Number(parentScreen.id),
  user: parentUser,
  message: 'Servis neden görünmüyor?',
  context: resolvedA.context,
  entityLabel: resolvedA.entityLabel,
  scope: resolvedA.scope,
  conversationState: {
    recentMessages: [{ role: 'user', text: 'Servis neden görünmüyor?' }],
    lastScreenPath: '/parent/live',
    lastScreenLabel: 'Veli • Canlı Takip',
  },
  screenContext: noVehicleFixture,
  screenDefinition: parentScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(parentScreen.id),
  resolvedEntityType: resolvedA.resolvedEntityType,
  resolvedEntityId: resolvedA.resolvedEntityId,
});
const replyA = replyText(responseA);
mustNotRaw(replyA, 'FORBIDDEN', 'parent live no-vehicle reply avoids raw FORBIDDEN');
mustNot(replyA, 'Bunu anlayamadım', 'parent live no-vehicle reply avoids understand fallback');
mustNot(replyA, 'saha geri bildirimlerini', 'parent live no-vehicle reply avoids feedback explanation');
mustNot(replyA, 'kullanıcı yorumlarını', 'parent live no-vehicle reply avoids feedback explanation');
mustNot(replyA, 'değerlendirme kayıtlarını', 'parent live no-vehicle reply avoids feedback explanation');
mustNot(replyA, 'Geri Bildirim ekranı', 'parent live no-vehicle reply avoids feedback screen wording');
mustNot(replyA, 'açık geri bildirim', 'parent live no-vehicle reply avoids feedback wording');
mustNot(replyA, 'kritik geri bildirim', 'parent live no-vehicle reply avoids feedback wording');
mustAny(replyA, ['canlı araç görünmüyor', 'araç sadece aktif vardiya saat aralığında', 'araç ataması varsa görünür'], 'parent live no-vehicle reply states no-live fallback');
mustAny(replyA, ['Canlı konum', 'son konum bilgisi', 'sürücünün telefonundan konum sinyali'], 'parent live no-vehicle reply mentions live location');
assertNoForbiddenVisibleTerms(replyA, 'parent live no-vehicle reply');
const chipsA = chipList(responseA);
mustArrayContains(chipsA, 'Servis saati uygun mu?', 'parent live no-vehicle chips keep service-hour chip');
mustArrayContains(chipsA, 'Araç ataması var mı?', 'parent live no-vehicle chips keep assignment chip');
mustArrayContains(chipsA, 'Canlı konum neden yok?', 'parent live no-vehicle chips keep live-location chip');
mustArrayContains(chipsA, 'Bildirimleri kontrol et', 'parent live no-vehicle chips keep notification chip');
mustArrayNotContains(chipsA, 'Geri Bildirim ekranını aç', 'parent live no-vehicle chips avoid feedback chip');
mustArrayNotContains(chipsA, 'Açık geri bildirimi göster', 'parent live no-vehicle chips avoid feedback chip');
mustArrayNotContains(chipsA, 'Kritik geri bildirimleri sırala', 'parent live no-vehicle chips avoid feedback chip');

const selectedServiceFixture = buildParentFixture({
  selectedRecord: {
    type: 'studentRide',
    label: 'Student One servisi',
    vehiclePlate: '34ABC123',
    gpsStatus: 'Zayıf',
    lastGps: '2dk',
    nextStop: 'Durak B',
    eta: '8dk',
    serviceStatus: 'Yolda',
  },
  selectedLabel: 'Student One servisi',
    helpContextSummary: 'Şu an: Canlı • Çocuk: #2 Student One • Araç 34ABC123 • Konum sinyali Zayıf • Son konum bilgisi 2dk • Sıradaki Durak B • Tahmini varış süresi 8dk',
  contextSummary: 'Veli canlı takip • Student One servisi • Araç 34ABC123 • Konum sinyali Zayıf • Son konum bilgisi 2dk • Sıradaki Durak B • Tahmini varış süresi 8dk',
  selectedSummary: 'Veli canlı takip • Student One servisi • Araç 34ABC123 • Konum sinyali Zayıf • Son konum bilgisi 2dk • Sıradaki Durak B • Tahmini varış süresi 8dk',
  selectedRecordSummary: 'Veli canlı takip • Student One servisi • Araç 34ABC123 • Konum sinyali Zayıf • Son konum bilgisi 2dk • Sıradaki Durak B • Tahmini varış süresi 8dk',
  selectedRecordStatus: 'Yolda',
  selectedEntityType: 'vehicle',
  selectedEntityId: 34,
  selectedFields: [
    { label: 'Araç', value: '34ABC123' },
    { label: 'Konum sinyali durumu', value: 'Zayıf' },
    { label: 'Son konum bilgisi', value: '2dk' },
    { label: 'Sıradaki durak', value: 'Durak B' },
    { label: 'Tahmini varış süresi', value: '8dk' },
  ],
  selectedBadges: [
    { label: 'Sürücünün telefonundan konum sinyali', value: 'Canlı' },
    { label: 'Araç konum sinyali', value: 'Canlı' },
  ],
});

const resolvedB = await resolveChatContext({
  entityType: 'screen',
  entityId: Number(parentScreen.id),
  user: parentUser,
  screenContext: selectedServiceFixture,
  conversationState: {
    recentMessages: [],
    lastScreenPath: '/parent/live',
    lastScreenLabel: 'Veli • Canlı Takip',
    selectedEntityType: 'vehicle',
    selectedEntityId: 34,
  },
});
const responseB = buildResponse({
  entityId: Number(parentScreen.id),
  user: parentUser,
  message: 'Servis neden görünmüyor?',
  context: resolvedB.context,
  entityLabel: resolvedB.entityLabel,
  scope: resolvedB.scope,
  conversationState: {
    recentMessages: [{ role: 'user', text: 'Servis neden görünmüyor?' }],
    lastScreenPath: '/parent/live',
    lastScreenLabel: 'Veli • Canlı Takip',
  },
  screenContext: selectedServiceFixture,
  screenDefinition: parentScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(parentScreen.id),
  resolvedEntityType: resolvedB.resolvedEntityType,
  resolvedEntityId: resolvedB.resolvedEntityId,
});
const replyB = replyText(responseB);
mustNotRaw(replyB, 'FORBIDDEN', 'parent live selected-service reply avoids raw FORBIDDEN');
mustNot(replyB, 'seçili servis bilgisi net görünmüyor', 'parent live selected-service reply avoids no-selection fallback');
must(replyB, '34ABC123', 'parent live selected-service reply keeps vehicle plate');
mustAny(replyB, ['GPS', 'Zayıf'], 'parent live selected-service reply keeps gps state');
mustAny(replyB, ['Son konum bilgisi', '2dk'], 'parent live selected-service reply keeps last gps');
must(replyB, 'Durak B', 'parent live selected-service reply keeps next stop');
mustAny(replyB, ['Tahmini varış süresi', '8dk'], 'parent live selected-service reply keeps ETA');
must(replyB, 'Sürücünün telefonundan konum sinyali', 'parent live selected-service reply keeps driver phone signal wording');
mustAny(replyB, ['araç bağlantısını', 'görev bağlantısını'], 'parent live selected-service reply keeps connection controls');
assertNoForbiddenVisibleTerms(replyB, 'parent live selected-service reply');
const chipsB = chipList(responseB);
mustArrayContains(chipsB, 'Son konum bilgisi ne zaman geldi?', 'parent live selected-service chips keep last gps chip');
mustArrayContains(chipsB, 'Tahmini varış süresi nedir?', 'parent live selected-service chips keep ETA chip');
mustArrayContains(chipsB, 'Araç bağlantısı var mı?', 'parent live selected-service chips keep vehicle connection chip');
mustArrayContains(chipsB, 'Sürücünün telefonundan konum sinyali devrede mi?', 'parent live selected-service chips keep driver phone gps chip');
mustArrayNotContains(chipsB, 'Geri Bildirim ekranını aç', 'parent live selected-service chips avoid feedback chip');
mustArrayNotContains(chipsB, 'Bu ekranı detaylı anlat', 'parent live selected-service chips avoid generic explainer');

const noContextFixture = buildParentFixture({
  selectedRecord: null,
  helpContextSummary: 'Şu an: Canlı',
  contextSummary: 'Şu an: Canlı',
  selectedFields: [],
  selectedBadges: [],
  selectedSummary: '',
  selectedRecordSummary: '',
  selectedRecordStatus: '',
  selectedLabel: '',
  selectedEntityType: 'screen',
  selectedEntityId: Number(parentScreen.id),
});
const resolvedC = await resolveChatContext({
  entityType: 'screen',
  entityId: Number(parentScreen.id),
  user: parentUser,
  screenContext: noContextFixture,
  conversationState: { recentMessages: [] },
});
const responseC = buildResponse({
  entityId: Number(parentScreen.id),
  user: parentUser,
  message: 'Servis neden görünmüyor?',
  context: resolvedC.context,
  entityLabel: resolvedC.entityLabel,
  scope: resolvedC.scope,
  conversationState: { recentMessages: [{ role: 'user', text: 'Servis neden görünmüyor?' }] },
  screenContext: noContextFixture,
  screenDefinition: parentScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(parentScreen.id),
  resolvedEntityType: resolvedC.resolvedEntityType,
  resolvedEntityId: resolvedC.resolvedEntityId,
});
const replyC = replyText(responseC);
mustNotRaw(replyC, 'FORBIDDEN', 'parent live no-context reply avoids raw FORBIDDEN');
mustNot(replyC, 'Bunu anlayamadım', 'parent live no-context reply avoids understand fallback');
mustNot(replyC, 'saha geri bildirimlerini', 'parent live no-context reply avoids feedback explanation');
mustNot(replyC, 'Geri Bildirim ekranı', 'parent live no-context reply avoids feedback screen wording');
mustAny(replyC, ['net görünmüyor', 'canlı araç görünmüyor'], 'parent live no-context reply uses safe fallback');
assertNoForbiddenVisibleTerms(replyC, 'parent live no-context reply');
const chipsC = chipList(responseC);
mustArrayNotContains(chipsC, 'Geri Bildirim ekranını aç', 'parent live no-context chips avoid feedback chip');
mustArrayNotContains(chipsC, 'Açık geri bildirimi göster', 'parent live no-context chips avoid feedback chip');
mustArrayNotContains(chipsC, 'Kritik geri bildirimleri sırala', 'parent live no-context chips avoid feedback chip');

console.log('=== COP-04B-FIX-08 PARENT LIVE CONTEXT CHECK PASS ===');
