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
    'agreement',
    'contractShiftGeneration',
  ];
  for (const term of forbidden) {
    mustNotRaw(text, term, `${label} avoids ${term}`);
  }
}

console.log('=== COP-04B-FIX-03 PERSONEL + PARENT + DRIVER CONTEXT CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const answerPolicySource = read('backend/src/ai/chat/answerQualityPolicy.js');
const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');
const factsSource = read('web/src/utils/copilotFacts.js');
const personelLivePanelSource = read('web/src/panels/personel/LivePanel.jsx');
const personelMyRidePanelSource = read('web/src/panels/personel/MyRidePanel.jsx');
const parentLivePanelSource = read('web/src/panels/parent/LivePanel.jsx');
const driverTodayPanelSource = read('web/src/panels/driver/TodayPanel.jsx');
const driverRoutePanelSource = read('web/src/panels/driver/RoutePanel.jsx');
const driverMapPanelSource = read('web/src/panels/driver/MapPanel.jsx');

must(pkg, '"check:cop04bfix03": "node backend/scripts/cop_04b_fix_03_personel_parent_driver_context_check.js"', 'package.json exposes check:cop04bfix03');
must(pkg, '"check:cop04bfix02"', 'package.json keeps check:cop04bfix02');
must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:cop04afix04"', 'package.json keeps check:cop04afix04');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');

must(runner, 'check:cop04bfix03', 'product extensions runner keeps cop04bfix03');
must(verifyChain, 'check:cop04bfix03', 'verify chain waits for check:cop04bfix03');
must(guide, 'check:cop04bfix03', 'script guide exposes check:cop04bfix03');
must(guide, 'check:cop04bfix02', 'script guide keeps check:cop04bfix02');
must(guide, 'check:cop04bfix01', 'script guide keeps check:cop04bfix01');
must(guide, 'check:cop04b', 'script guide keeps check:cop04b');
must(guide, 'check:cop04afix04', 'script guide keeps check:cop04afix04');
must(guide, 'check:cop04afix03', 'script guide keeps check:cop04afix03');
must(guide, 'check:cop04afix02', 'script guide keeps check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide keeps check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(auditDoc, 'COP-04B-FIX-03 acceptance note', 'audit doc keeps fix03 note');
must(auditDoc, 'Personel / Veli / Sürücü mobile-web live context parity', 'audit doc keeps fix03 title');
must(auditDoc, 'selected live context parity', 'audit doc keeps selected parity wording');
must(auditDoc, 'Bu audit product behavior değiştirmez.', 'audit doc keeps no product behavior note');

must(personelLivePanelSource, 'setCopilotSelection(copilotSelection)', 'personel live panel keeps copilot selection push');
must(personelLivePanelSource, 'fields', 'personel live panel keeps fields bridge');
must(personelLivePanelSource, 'badges', 'personel live panel keeps badges bridge');
must(personelLivePanelSource, 'facts', 'personel live panel keeps facts bridge');
mustAny(personelLivePanelSource, ['Araç GPS’i', 'Sürücünün telefon GPS’i'], 'personel live panel keeps gps source labels');

must(personelMyRidePanelSource, 'setCopilotSelection(copilotSelection)', 'personel my-ride panel keeps copilot selection push');
must(personelMyRidePanelSource, 'fields', 'personel my-ride panel keeps fields bridge');
must(personelMyRidePanelSource, 'badges', 'personel my-ride panel keeps badges bridge');
must(personelMyRidePanelSource, 'facts', 'personel my-ride panel keeps facts bridge');
mustAny(personelMyRidePanelSource, ['Araç GPS’i', 'Sürücünün telefon GPS’i'], 'personel my-ride panel keeps gps source labels');

must(parentLivePanelSource, 'setCopilotSelection(copilotSelection)', 'parent live panel keeps copilot selection push');
must(parentLivePanelSource, 'fields', 'parent live panel keeps fields bridge');
must(parentLivePanelSource, 'badges', 'parent live panel keeps badges bridge');
must(parentLivePanelSource, 'facts', 'parent live panel keeps facts bridge');
mustAny(parentLivePanelSource, ['Araç GPS’i', 'Sürücünün telefon GPS’i'], 'parent live panel keeps gps source labels');

must(driverTodayPanelSource, 'setCopilotSelection(copilotSelection)', 'driver today panel keeps copilot selection push');
must(driverTodayPanelSource, 'selectedFields', 'driver today panel keeps selected fields bridge');
must(driverTodayPanelSource, 'selectedBadges', 'driver today panel keeps selected badges bridge');
must(driverTodayPanelSource, 'structuredFacts', 'driver today panel keeps structured facts bridge');
mustAny(driverTodayPanelSource, ['Operasyon kanıtı', 'Sürücünün telefon GPS’i', 'Araç GPS’i'], 'driver today panel keeps operational and gps labels');

must(driverRoutePanelSource, 'setCopilotSelection(copilotSelection)', 'driver route panel keeps copilot selection push');
must(driverRoutePanelSource, 'selectedFields', 'driver route panel keeps selected fields bridge');
must(driverRoutePanelSource, 'selectedBadges', 'driver route panel keeps selected badges bridge');
must(driverRoutePanelSource, 'structuredFacts', 'driver route panel keeps structured facts bridge');
mustAny(driverRoutePanelSource, ['Operasyon kanıtı', 'Sürücünün telefon GPS’i', 'Araç GPS’i'], 'driver route panel keeps operational and gps labels');

must(driverMapPanelSource, 'setCopilotSelection(copilotSelection)', 'driver map panel keeps copilot selection push');
must(driverMapPanelSource, 'selectedFields', 'driver map panel keeps selected fields bridge');
must(driverMapPanelSource, 'selectedBadges', 'driver map panel keeps selected badges bridge');
must(driverMapPanelSource, 'structuredFacts', 'driver map panel keeps structured facts bridge');
mustAny(driverMapPanelSource, ['Operasyon kanıtı', 'Sürücünün telefon GPS’i', 'Araç GPS’i'], 'driver map panel keeps operational and gps labels');

must(helpComposerSource, 'Bu ekranda seçili servis bilgisi net görünmüyor; önce bugünkü servis satırını seç.', 'help composer keeps personel no-selection fallback');
must(helpComposerSource, 'Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor; önce öğrencinin servis satırını seç.', 'help composer keeps parent no-selection fallback');
must(helpComposerSource, 'Bu ekranda bugünkü göreve ait seçili bilgi net görünmüyor; önce vardiya veya araç satırını seç.', 'help composer keeps driver no-selection fallback');
must(helpComposerSource, 'Araç nerede?', 'help composer keeps personel live chips');
must(helpComposerSource, 'Son konum bilgisi ne zaman geldi?', 'help composer keeps parent live chips');
must(helpComposerSource, 'Son konum bilgisi ne zaman geldi?', 'help composer keeps gps chips');
must(helpComposerSource, "Sürücünün telefonundan konum sinyali devrede mi?", 'help composer keeps driver phone gps chip');
must(helpComposerSource, 'Başlatma zamanı uygun mu?', 'help composer keeps driver start chip');
must(helpComposerSource, 'Konum sinyali/operasyon kanıtını kontrol et', 'help composer keeps driver operational chip');
must(helpComposerSource, 'Bu aksiyonu simüle et', 'help composer keeps blocklist text');

must(answerPolicySource, 'WORKFLOW_GENERIC_CHIP_BLOCKLIST', 'answer policy keeps generic chip blocklist');
must(answerPolicySource, 'Araç nerede?', 'answer policy keeps personel live chip');
must(answerPolicySource, 'Servis durumu ne?', 'answer policy keeps personel live status chip');
must(answerPolicySource, 'Sürücünün telefonundan konum sinyali devrede mi?', 'answer policy keeps driver gps chip');
must(answerPolicySource, 'Son konum bilgisi ne zaman geldi?', 'answer policy keeps parent live chip');
must(answerPolicySource, 'Tahmini varış süresi nedir?', 'answer policy keeps parent eta chip');
must(answerPolicySource, 'Başlatma zamanı uygun mu?', 'answer policy keeps driver chip');
must(answerPolicySource, 'Araç/sürücü bağlantısını kontrol et', 'answer policy keeps driver readiness chip');
must(answerPolicySource, 'Konum sinyali/operasyon kanıtını kontrol et', 'answer policy keeps driver proof chip');
must(answerPolicySource, 'Bunu sor', 'answer policy keeps generic chip block');
must(answerPolicySource, 'Aynı kayıt için devam et', 'answer policy keeps continuation block');
must(answerPolicySource, 'Ekran rehberini aç', 'answer policy keeps guide block');
must(answerPolicySource, 'Vardiya engelini sor', 'answer policy keeps old generic block');

must(intentRouterSource, '/personel/live', 'intent router keeps personel live route');
must(intentRouterSource, '/parent/live', 'intent router keeps parent live route');
must(intentRouterSource, '/driver/today', 'intent router keeps driver today route');
must(intentRouterSource, '/driver/route', 'intent router keeps driver route');
must(intentRouterSource, '/driver/map', 'intent router keeps driver map route');
must(intentRouterSource, 'LOCATION_HELP', 'intent router keeps location help intent');
must(intentRouterSource, 'SHIFT_BLOCKED', 'intent router keeps shift blocked intent');

must(factsSource, 'buildMapFacts', 'facts keeps map helper');
must(factsSource, 'buildShiftFacts', 'facts keeps shift helper');
must(factsSource, 'buildLiveFactConfidence', 'facts keeps live confidence helper');
must(factsSource, 'buildDiagnosticPriority', 'facts keeps diagnostic priority helper');
must(factsSource, 'buildActionSimulationWording', 'facts keeps action simulation helper');
must(factsSource, 'selectedRecordStatus', 'facts keeps selected record status bridge');
must(factsSource, 'araç görünürlüğü', 'facts keeps vehicle visibility wording');
must(factsSource, "Sürücünün telefon GPS’i", 'facts keeps driver phone gps wording');
must(factsSource, 'operasyon kanıtı', 'facts keeps operational proof wording');

const { buildMapFacts, buildShiftFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/copilotFacts.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { detectQuestionIntent } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/intentRouter.js')).href);
const { normalizeCopilotRequestInput, parseCopilotRequest } = await import(pathToFileURL(path.join(root, 'backend/src/ai/schemas.js')).href);
const { listScreensForUser, getScreenDefinitionForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const personelUser = { role: 'PERSONEL', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const parentUser = { role: 'PARENT', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const driverUser = { role: 'DRIVER', roomId: 1, companyId: 1, companyKind: 'DEMO' };

const personelScreen = listScreensForUser(personelUser).find((row) => String(row?.path || '') === '/personel/live');
const parentScreen = listScreensForUser(parentUser).find((row) => String(row?.path || '') === '/parent/live');
const driverTodayScreen = listScreensForUser(driverUser).find((row) => String(row?.path || '') === '/driver/today');
const driverRouteScreen = listScreensForUser(driverUser).find((row) => String(row?.path || '') === '/driver/route');
const driverMapScreen = listScreensForUser(driverUser).find((row) => String(row?.path || '') === '/driver/map');

if (!personelScreen) fail('personel live screen exists');
if (!parentScreen) fail('parent live screen exists');
if (!driverTodayScreen) fail('driver today screen exists');
if (!driverRouteScreen) fail('driver route screen exists');
if (!driverMapScreen) fail('driver map screen exists');

const personelScreenDef = getScreenDefinitionForUser(personelUser, personelScreen, Number(personelScreen.id));
const parentScreenDef = getScreenDefinitionForUser(parentUser, parentScreen, Number(parentScreen.id));
const driverTodayScreenDef = getScreenDefinitionForUser(driverUser, driverTodayScreen, Number(driverTodayScreen.id));

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
const personelRequest = {
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: Number(personelScreen.id),
  message: 'Servis neden görünmüyor?',
  screenContext: {
    path: '/personel/live',
    label: 'Servisim',
    selectedLabel: 'Bugünkü servis • 34ABC123',
    selectedSummary: 'Bugünkü servis • 34ABC123 • GPS eski • Son GPS 2 dk • ETA 12 dk • Personel durağı',
    selectedFields: [
      { label: 'Servis', value: 'Bugünkü servis', help: 'Bugünkü servisi gösterir.' },
      { label: 'Araç', value: '34ABC123', help: 'Seçili aracın plakasını gösterir.' },
      { label: 'Sürücü', value: 'Sürücü Demo', help: 'Bağlı sürücü adını gösterir.' },
      { label: 'Son GPS', value: '2 dk', help: 'Son canlı konumun ne kadar önce geldiğini gösterir.' },
      { label: 'GPS durumu', value: 'GPS eski', help: 'Araç GPS sinyal durumunu gösterir.' },
      { label: 'Kaynak', value: 'Araç GPS’i', help: 'Konum kaynağını güvenli biçimde gösterir.' },
      { label: 'Sürücünün telefon GPS’i', value: 'Devrede', help: 'Sürücünün telefon GPS’i kaynağını gösterir.' },
      { label: 'Sıradaki durak', value: 'Personel durağı', help: 'Bir sonraki durağı gösterir.' },
      { label: 'ETA', value: '12 dk', help: 'Tahmini varış süresini gösterir.' },
      { label: 'Servis durumu', value: 'Aktif', help: 'Servisin görünür durumunu gösterir.' },
    ],
    selectedBadges: [
      { label: 'Araç GPS’i', value: 'GPS eski', help: 'Araç GPS görünürlüğünü gösterir.' },
      { label: 'Sürücünün telefon GPS’i', value: 'Devrede', help: 'Telefon GPS kaynağını gösterir.' },
    ],
    structuredFacts: personelFacts,
    selectedRecordType: 'vehicle',
    selectedRecordId: 34,
    selectedRecordLabel: 'Bugünkü servis • 34ABC123',
    selectedRecordStatus: 'Araç: 34ABC123 • Son GPS: 2 dk • GPS durumu: GPS eski • Kaynak: Araç GPS’i • Sürücünün telefon GPS’i devrede • Sıradaki durak: Personel durağı • ETA: 12 dk • Servis durumu: Aktif',
    copilotSummary: personelFacts.copilotSummary,
    selectedEntityType: 'vehicle',
    selectedEntityId: 34,
  },
  conversationState: {
    recentMessages: [],
    lastScreenPath: '/personel/live',
    lastScreenLabel: 'Servisim',
  },
};
const normalizedPersonelRequest = normalizeCopilotRequestInput(personelRequest);
must(normalizedPersonelRequest.intent, 'CHAT_HELP', 'personel request infers chat help intent');
must(normalizedPersonelRequest.entityType, 'screen', 'personel request keeps screen entity type');
const parsedPersonelRequest = parseCopilotRequest(personelRequest);
if (!parsedPersonelRequest.success) fail(`personel parse should succeed: ${JSON.stringify(parsedPersonelRequest.error.flatten())}`);
const personelIntent = detectQuestionIntent(personelRequest.message, {
  screenPath: '/personel/live',
  entityType: 'screen',
  originalMessage: personelRequest.message,
});
mustAny(personelIntent?.questionType || '', ['LOCATION_HELP'], 'personel live question routes to location help');
const personelResponse = buildChatHelpResponse({
  entityType: parsedPersonelRequest.data.entityType,
  entityId: parsedPersonelRequest.data.entityId,
  user: personelUser,
  message: parsedPersonelRequest.data.message,
  context: {
    screenPath: '/personel/live',
    selectedLabel: personelRequest.screenContext.selectedLabel,
    selectedSummary: personelRequest.screenContext.selectedSummary,
  },
  entityLabel: 'Servisim',
  scope: '/personel/live',
  conversationState: parsedPersonelRequest.data.conversationState || personelRequest.conversationState,
  screenContext: personelRequest.screenContext,
  screenDefinition: personelScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(personelScreen.id),
  resolvedEntityType: parsedPersonelRequest.data.entityType,
  resolvedEntityId: parsedPersonelRequest.data.entityId,
});
const personelReply = replyText(personelResponse);
mustNot(personelReply, 'Bunu anlayamadım', 'personel reply avoids unknown fallback');
mustNot(personelReply, 'seçili servis bilgisi net görünmüyor', 'personel reply avoids generic no-selection fallback');
mustAny(personelReply, ['34ABC123', 'Bugünkü servis'], 'personel reply keeps selected service');
mustAny(personelReply, ['konum sinyali eski', 'Son konum bilgisi: 2 dk', 'Araç konum sinyali'], 'personel reply keeps gps age/status');
mustAny(personelReply, ['Araç konum sinyali', 'Sürücünün telefonundan konum sinyali'], 'personel reply keeps gps source language');
mustAny(personelReply, ['Servis görünmüyorsa', 'Sıradaki durak Durak A', 'Durak A'], 'personel reply keeps live service wording');
mustArrayContains(chipList(personelResponse), 'Araç nerede?', 'personel chips keep live service chip');
mustArrayContains(chipList(personelResponse), 'Son konum bilgisi ne zaman geldi?', 'personel chips keep gps chip');
mustArrayContains(chipList(personelResponse), 'Servis durumu ne?', 'personel chips keep status chip');
mustArrayContains(chipList(personelResponse), 'Sürücünün telefonundan konum sinyali devrede mi?', 'personel chips keep phone gps chip');
mustArrayNotContains(chipList(personelResponse), 'Bunu sor', 'personel chips avoid generic self-question');
mustArrayNotContains(chipList(personelResponse), 'Aynı kayıt için devam et', 'personel chips avoid generic continuation');
mustArrayNotContains(chipList(personelResponse), 'Ekran rehberini aç', 'personel chips avoid generic guide');
assertNoForbiddenVisibleTerms(personelReply, 'personel reply');

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
const parentRequest = {
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: Number(parentScreen.id),
  message: 'Servis neden görünmüyor?',
  screenContext: {
    path: '/parent/live',
    label: 'Öğrencimin servisi',
    selectedLabel: 'Öğrenci servisi • 34ABC123',
    selectedSummary: 'Öğrenci servisi • 34ABC123 • Canlı • Son GPS 30 sn • ETA 8 dk • Okul',
    selectedFields: [
      { label: 'Öğrenci', value: 'Öğrenci servisi', help: 'Öğrenci servisini gösterir.' },
      { label: 'Araç', value: '34ABC123', help: 'Seçili aracın plakasını gösterir.' },
      { label: 'Son GPS', value: '30 sn', help: 'Son canlı konumun ne kadar önce geldiğini gösterir.' },
      { label: 'GPS durumu', value: 'Canlı', help: 'Servis GPS durumunu gösterir.' },
      { label: 'Kaynak', value: 'Sürücünün telefon GPS’i', help: 'Konum kaynağını güvenli biçimde gösterir.' },
      { label: 'Sıradaki durak', value: 'Okul', help: 'Bir sonraki durağı gösterir.' },
      { label: 'ETA', value: '8 dk', help: 'Tahmini varış süresini gösterir.' },
      { label: 'Servis durumu', value: 'Yolda', help: 'Servis durumunu gösterir.' },
    ],
    selectedBadges: [
      { label: 'Araç GPS’i', value: 'Canlı', help: 'Araç GPS görünürlüğünü gösterir.' },
      { label: 'Sürücünün telefon GPS’i', value: 'Devrede', help: 'Telefon GPS kaynağını gösterir.' },
    ],
    structuredFacts: parentFacts,
    selectedRecordType: 'studentService',
    selectedRecordId: 34,
    selectedRecordLabel: 'Öğrenci servisi',
    selectedRecordStatus: 'Araç: 34ABC123 • Son GPS: 30 sn • GPS durumu: Canlı • Kaynak: Sürücünün telefon GPS’i • Sıradaki durak: Okul • ETA: 8 dk • Servis durumu: Yolda',
    copilotSummary: parentFacts.copilotSummary,
    selectedEntityType: 'vehicle',
    selectedEntityId: 34,
  },
  conversationState: {
    recentMessages: [],
    lastScreenPath: '/parent/live',
    lastScreenLabel: 'Öğrencimin servisi',
  },
};
const normalizedParentRequest = normalizeCopilotRequestInput(parentRequest);
must(normalizedParentRequest.intent, 'CHAT_HELP', 'parent request infers chat help intent');
must(normalizedParentRequest.entityType, 'screen', 'parent request keeps screen entity type');
const parsedParentRequest = parseCopilotRequest(parentRequest);
if (!parsedParentRequest.success) fail(`parent parse should succeed: ${JSON.stringify(parsedParentRequest.error.flatten())}`);
const parentIntent = detectQuestionIntent(parentRequest.message, {
  screenPath: '/parent/live',
  entityType: 'screen',
  originalMessage: parentRequest.message,
});
mustAny(parentIntent?.questionType || '', ['LOCATION_HELP'], 'parent live question routes to location help');
const parentResponse = buildChatHelpResponse({
  entityType: parsedParentRequest.data.entityType,
  entityId: parsedParentRequest.data.entityId,
  user: parentUser,
  message: parsedParentRequest.data.message,
  context: {
    screenPath: '/parent/live',
    selectedLabel: parentRequest.screenContext.selectedLabel,
    selectedSummary: parentRequest.screenContext.selectedSummary,
  },
  entityLabel: 'Öğrencimin servisi',
  scope: '/parent/live',
  conversationState: parsedParentRequest.data.conversationState || parentRequest.conversationState,
  screenContext: parentRequest.screenContext,
  screenDefinition: parentScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(parentScreen.id),
  resolvedEntityType: parsedParentRequest.data.entityType,
  resolvedEntityId: parsedParentRequest.data.entityId,
});
const parentReply = replyText(parentResponse);
mustNot(parentReply, 'Bunu anlayamadım', 'parent reply avoids unknown fallback');
mustNot(parentReply, 'seçili servis bilgisi net görünmüyor', 'parent reply avoids generic no-selection fallback');
mustAny(parentReply, ['34ABC123', 'Öğrenci servisi'], 'parent reply keeps selected service');
mustAny(parentReply, ['Son konum bilgisi 30 sn önce', 'Tahmini varış süresi 8 dk', 'Canlı'], 'parent reply keeps gps age/status');
mustAny(parentReply, ['Sürücünün telefonundan konum sinyali', 'Araç konum sinyali'], 'parent reply keeps gps source language');
mustAny(parentReply, ['Servis görünmüyorsa', 'Tahmini varış'], 'parent reply keeps live service wording');
mustArrayContains(chipList(parentResponse), 'Son konum bilgisi ne zaman geldi?', 'parent chips keep live service chip');
mustArrayContains(chipList(parentResponse), 'Son konum bilgisi ne zaman geldi?', 'parent chips keep gps chip');
mustArrayContains(chipList(parentResponse), 'Tahmini varış süresi nedir?', 'parent chips keep eta chip');
mustArrayContains(chipList(parentResponse), 'Araç bağlantısı var mı?', 'parent chips keep vehicle connection chip');
mustArrayNotContains(chipList(parentResponse), 'Bunu sor', 'parent chips avoid generic self-question');
mustArrayNotContains(chipList(parentResponse), 'Aynı kayıt için devam et', 'parent chips avoid generic continuation');
mustArrayNotContains(chipList(parentResponse), 'Ekran rehberini aç', 'parent chips avoid generic guide');
assertNoForbiddenVisibleTerms(parentReply, 'parent reply');

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
const driverRequest = {
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: Number(driverTodayScreen.id),
  message: 'Görev neden başlamıyor?',
  screenContext: {
    path: '/driver/today',
    label: 'Bugünkü görev',
    selectedLabel: 'Vardiya #3',
    selectedSummary: 'Vardiya #3 • Kabul Edildi • Araç 34ABC123 • Son GPS Telefon GPS’i beklemede • Pickup 6 • Operasyon kanıtı eksik',
    selectedFields: [
      { label: 'Vardiya', value: '#3', help: 'Bugünkü vardiya numarasını gösterir.' },
      { label: 'Durum', value: 'Kabul Edildi', help: 'Vardiya durumunu gösterir.' },
      { label: 'Araç', value: '34ABC123', help: 'Bağlı aracı gösterir.' },
      { label: 'Sürücü', value: 'Sürücü Demo', help: 'Bağlı sürücüyü gösterir.' },
      { label: 'Durak', value: '6', help: 'Vardiyanın durak sayısını gösterir.' },
      { label: 'Son GPS', value: 'Telefon GPS’i beklemede', help: 'Son konum durumunu gösterir.' },
      { label: 'GPS durumu', value: 'Telefon GPS’i beklemede', help: 'Telefon GPS sinyalini gösterir.' },
      { label: 'Kaynak', value: 'Sürücünün telefon GPS’i', help: 'Konum kaynağını güvenli biçimde gösterir.' },
      { label: 'Operasyon kanıtı', value: 'Eksik', help: 'Başlatma veya varış kanıtını gösterir.' },
    ],
    selectedBadges: [
      { label: 'Araç GPS’i', value: 'Telefon GPS’i beklemede', help: 'Araç GPS durumunu gösterir.' },
      { label: 'Sürücünün telefon GPS’i', value: 'Sürücünün telefon GPS’i', help: 'Telefon GPS kaynağını gösterir.' },
    ],
    structuredFacts: driverFacts,
    selectedRecordType: 'shift',
    selectedRecordId: 3,
    selectedRecordLabel: 'Vardiya #3',
    selectedRecordStatus: 'Durum: Kabul Edildi • Araç: 34ABC123 • Sürücü: Sürücü Demo • Durak: 6 • Son GPS: Telefon GPS’i beklemede • GPS durumu: Telefon GPS’i beklemede • Kaynak: Sürücünün telefon GPS’i • Operasyon kanıtı: Eksik',
    copilotSummary: driverFacts.copilotSummary,
    selectedEntityType: 'shift',
    selectedEntityId: 3,
  },
  conversationState: {
    recentMessages: [],
    lastScreenPath: '/driver/today',
    lastScreenLabel: 'Bugünkü görev',
  },
};
const normalizedDriverRequest = normalizeCopilotRequestInput(driverRequest);
must(normalizedDriverRequest.intent, 'CHAT_HELP', 'driver request infers chat help intent');
must(normalizedDriverRequest.entityType, 'screen', 'driver request keeps screen entity type');
const parsedDriverRequest = parseCopilotRequest(driverRequest);
if (!parsedDriverRequest.success) fail(`driver parse should succeed: ${JSON.stringify(parsedDriverRequest.error.flatten())}`);
const driverIntent = detectQuestionIntent(driverRequest.message, {
  screenPath: '/driver/today',
  entityType: 'screen',
  originalMessage: driverRequest.message,
});
mustAny(driverIntent?.questionType || '', ['SHIFT_BLOCKED'], 'driver live question routes to shift blocked');
const driverResponse = buildChatHelpResponse({
  entityType: parsedDriverRequest.data.entityType,
  entityId: parsedDriverRequest.data.entityId,
  user: driverUser,
  message: parsedDriverRequest.data.message,
  context: {
    screenPath: '/driver/today',
    selectedLabel: driverRequest.screenContext.selectedLabel,
    selectedSummary: driverRequest.screenContext.selectedSummary,
  },
  entityLabel: 'Bugünkü görev',
  scope: '/driver/today',
  conversationState: parsedDriverRequest.data.conversationState || driverRequest.conversationState,
  screenContext: driverRequest.screenContext,
  screenDefinition: driverTodayScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(driverTodayScreen.id),
  resolvedEntityType: parsedDriverRequest.data.entityType,
  resolvedEntityId: parsedDriverRequest.data.entityId,
});
const driverReply = replyText(driverResponse);
mustNot(driverReply, 'Bunu anlayamadım', 'driver reply avoids unknown fallback');
mustNot(driverReply, 'OperationProof', 'driver reply avoids technical proof wording');
mustNot(driverReply, 'Bu aksiyonu simüle et', 'driver reply avoids mechanical simulation wording');
mustNot(driverReply, 'Eksik araç/sürücü', 'driver reply avoids first-cause missing vehicle driver wording');
mustNot(driverReply, 'Yetki sınırını kontrol et', 'driver reply avoids default permission boundary');
mustAny(driverReply, ['canlı başlatma zamanını ve aktif durumu kontrol et', 'Başlatma zamanı ve aktif durum uygunsa GPS ve operasyon kanıtı akışına geç'], 'driver reply keeps live-start wording');
mustAny(driverReply, ['Araç: 34ABC123', 'Sürücü: Sürücü Demo', 'Operasyon kanıtı: Eksik'], 'driver reply keeps vehicle-driver details');
mustAny(driverReply, ['34ABC123', 'Vardiya #3'], 'driver reply keeps selected task');
mustAny(driverReply, ['Telefon konum sinyali', 'Operasyon kanıtı: Eksik'], 'driver reply keeps gps/proof status');
mustArrayContains(chipList(driverResponse), 'Başlatma zamanı uygun mu?', 'driver chips keep start-time chip');
mustArrayContains(chipList(driverResponse), 'Araç/sürücü bağlantısını kontrol et', 'driver chips keep vehicle-driver chip');
mustArrayContains(chipList(driverResponse), 'Konum sinyali/operasyon kanıtını kontrol et', 'driver chips keep proof chip');
mustArrayContains(chipList(driverResponse), 'Rota/durak hazır mı?', 'driver chips keep route chip');
mustArrayNotContains(chipList(driverResponse), 'Bunu sor', 'driver chips avoid generic self-question');
mustArrayNotContains(chipList(driverResponse), 'Aynı kayıt için devam et', 'driver chips avoid generic continuation');
mustArrayNotContains(chipList(driverResponse), 'Ekran rehberini aç', 'driver chips avoid generic guide');
assertNoForbiddenVisibleTerms(driverReply, 'driver reply');

const noSelectionPersonelRequest = {
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: Number(personelScreen.id),
  message: 'Servis neden görünmüyor?',
  screenContext: {
    path: '/personel/live',
    label: 'Servisim',
    selectedLabel: '',
    selectedSummary: '',
    selectedFields: [],
    selectedBadges: [],
    structuredFacts: {},
    selectedRecordStatus: '',
    copilotSummary: '',
    selectedEntityType: 'screen',
    selectedEntityId: Number(personelScreen.id),
  },
  conversationState: { recentMessages: [], lastScreenPath: '/personel/live', lastScreenLabel: 'Servisim' },
};
const noSelectionPersonelParsed = parseCopilotRequest(normalizeCopilotRequestInput(noSelectionPersonelRequest));
if (!noSelectionPersonelParsed.success) fail(`personel no-selection parse should succeed: ${JSON.stringify(noSelectionPersonelParsed.error.flatten())}`);
const noSelectionPersonelResponse = buildChatHelpResponse({
  entityType: noSelectionPersonelParsed.data.entityType,
  entityId: noSelectionPersonelParsed.data.entityId,
  user: personelUser,
  message: noSelectionPersonelParsed.data.message,
  context: { screenPath: '/personel/live', selectedLabel: '', selectedSummary: '' },
  entityLabel: 'Servisim',
  scope: '/personel/live',
  conversationState: noSelectionPersonelParsed.data.conversationState || noSelectionPersonelRequest.conversationState,
  screenContext: noSelectionPersonelRequest.screenContext,
  screenDefinition: personelScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(personelScreen.id),
  resolvedEntityType: noSelectionPersonelParsed.data.entityType,
  resolvedEntityId: noSelectionPersonelParsed.data.entityId,
});
const noSelectionPersonelReply = replyText(noSelectionPersonelResponse);
mustNot(noSelectionPersonelReply, 'Bunu anlayamadım', 'personel no-selection reply avoids unknown fallback');
mustAny(noSelectionPersonelReply, ['Bu ekranda seçili servis bilgisi net görünmüyor', 'Önce bugünkü servis satırını seç'], 'personel no-selection reply keeps safe fallback');
assertNoForbiddenVisibleTerms(noSelectionPersonelReply, 'personel no-selection reply');

const noSelectionParentRequest = {
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: Number(parentScreen.id),
  message: 'Servis neden görünmüyor?',
  screenContext: {
    path: '/parent/live',
    label: 'Öğrencimin servisi',
    selectedLabel: '',
    selectedSummary: '',
    selectedFields: [],
    selectedBadges: [],
    structuredFacts: {},
    selectedRecordStatus: '',
    copilotSummary: '',
    selectedEntityType: 'screen',
    selectedEntityId: Number(parentScreen.id),
  },
  conversationState: { recentMessages: [], lastScreenPath: '/parent/live', lastScreenLabel: 'Öğrencimin servisi' },
};
const noSelectionParentParsed = parseCopilotRequest(normalizeCopilotRequestInput(noSelectionParentRequest));
if (!noSelectionParentParsed.success) fail(`parent no-selection parse should succeed: ${JSON.stringify(noSelectionParentParsed.error.flatten())}`);
const noSelectionParentResponse = buildChatHelpResponse({
  entityType: noSelectionParentParsed.data.entityType,
  entityId: noSelectionParentParsed.data.entityId,
  user: parentUser,
  message: noSelectionParentParsed.data.message,
  context: { screenPath: '/parent/live', selectedLabel: '', selectedSummary: '' },
  entityLabel: 'Öğrencimin servisi',
  scope: '/parent/live',
  conversationState: noSelectionParentParsed.data.conversationState || noSelectionParentRequest.conversationState,
  screenContext: noSelectionParentRequest.screenContext,
  screenDefinition: parentScreenDef,
  sourceEntityType: 'screen',
  sourceEntityId: Number(parentScreen.id),
  resolvedEntityType: noSelectionParentParsed.data.entityType,
  resolvedEntityId: noSelectionParentParsed.data.entityId,
});
const noSelectionParentReply = replyText(noSelectionParentResponse);
mustNot(noSelectionParentReply, 'Bunu anlayamadım', 'parent no-selection reply avoids unknown fallback');
mustAny(noSelectionParentReply, ['Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor', 'Öğrencinin servis satırını seç'], 'parent no-selection reply keeps safe fallback');
assertNoForbiddenVisibleTerms(noSelectionParentReply, 'parent no-selection reply');

console.log('=== COP-04B-FIX-03 PERSONEL + PARENT + DRIVER CONTEXT CHECK PASS ===');
