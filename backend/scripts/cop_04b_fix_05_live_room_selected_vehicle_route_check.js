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
  return String(result?.reply || result?.summary || result?.screenExplanation || '');
}

function chipList(result) {
  return result?.contextualSuggestedChips || result?.suggestedChips || [];
}

function assertNoForbiddenVisibleTerms(text, label) {
  const forbidden = [
    'JOB_TYPE_ENTITY_MISMATCH',
    'OperationProof',
    'contractShiftGeneration',
    'agreement',
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

console.log('=== COP-04B-FIX-05 LIVE ROOM SELECTED VEHICLE ROUTE CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const serviceSource = read('backend/src/ai/service.js');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const selectedRuntimeSource = read('backend/src/ai/chat/helpComposerSelectedRuntime.js');
const factsSource = read('web/src/utils/copilotFacts.js');
const mapPanelSource = read('web/src/panels/room/MapPanel.jsx');
const floatingDrawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const copilotPanelSource = read('web/src/panels/shared/CopilotPanel.jsx');
const schemasSource = read('backend/src/ai/schemas.js');
const answerPolicySource = read('backend/src/ai/chat/answerQualityPolicy.js');
const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');

must(pkg, '"check:cop04bfix05": "node backend/scripts/cop_04b_fix_05_live_room_selected_vehicle_route_check.js"', 'package.json exposes check:cop04bfix05');
must(pkg, '"check:cop04bfix04"', 'package.json keeps check:cop04bfix04');
must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
must(pkg, '"check:cop04bfix02"', 'package.json keeps check:cop04bfix02');
must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');

must(runner, 'check:cop04bfix05', 'product extensions runner keeps cop04bfix05');
must(verifyChain, 'check:cop04bfix05', 'verify chain waits for check:cop04bfix05');
must(guide, 'check:cop04bfix05', 'script guide exposes check:cop04bfix05');
must(guide, 'check:cop04bfix04', 'script guide keeps check:cop04bfix04');
must(guide, 'check:cop04bfix03', 'script guide keeps check:cop04bfix03');
must(guide, 'check:cop04bfix02', 'script guide keeps check:cop04bfix02');
must(guide, 'check:cop04bfix01', 'script guide keeps check:cop04bfix01');
must(guide, 'check:cop04b', 'script guide keeps check:cop04b');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(auditDoc, 'COP-04B-FIX-05 canlı Room selected vehicle route hardening', 'audit doc keeps fix05 note');
must(auditDoc, 'Room / Canlı Takip', 'audit doc keeps room live reference');
must(auditDoc, 'selected vehicle answer route', 'audit doc keeps selected vehicle wording');

must(serviceSource, 'helpContextSummary', 'service keeps helpContextSummary bridge');
must(serviceSource, 'contextSummary', 'service keeps contextSummary bridge');
must(serviceSource, 'selectedRecordSummary', 'service keeps selectedRecordSummary bridge');
must(serviceSource, 'extractVisibleValueFromText', 'service can extract summary text values');
must(serviceSource, 'Bu ekranda seçili araç bilgisi net görünmüyor.', 'service keeps safe true-no-selection fallback');

must(helpComposerSource, 'selectedCarrySummary', 'help composer keeps selected carry summary bridge');
must(helpComposerSource, 'helpContextSummary', 'help composer keeps helpContextSummary bridge');
must(helpComposerSource, 'contextSummary', 'help composer keeps contextSummary bridge');
must(helpComposerSource, 'selectedRecordSummary', 'help composer keeps selectedRecordSummary bridge');
must(helpComposerSource, 'Bu ekranda seçili araç bilgisi net görünmüyor.', 'help composer keeps safe vehicle fallback');

must(selectedRuntimeSource, 'selectedLabel', 'selected runtime keeps selected label bridge');
must(factsSource, 'helpContextSummary', 'facts keeps helpContextSummary bridge');
must(factsSource, 'contextSummary', 'facts keeps contextSummary bridge');
must(factsSource, 'selectedRecordSummary', 'facts keeps selectedRecordSummary bridge');
must(mapPanelSource, 'helpContextSummary', 'map panel keeps helpContextSummary bridge');
must(mapPanelSource, 'contextSummary', 'map panel keeps contextSummary bridge');
must(mapPanelSource, 'selectedRecordSummary', 'map panel keeps selectedRecordSummary bridge');
must(floatingDrawerSource, 'helpContextSummary', 'floating drawer keeps helpContextSummary bridge');
must(floatingDrawerSource, 'contextSummary', 'floating drawer keeps contextSummary bridge');
must(floatingDrawerSource, 'selectedRecordSummary', 'floating drawer keeps selectedRecordSummary bridge');
must(copilotPanelSource, 'helpContextSummary', 'copilot panel keeps helpContextSummary bridge');
must(copilotPanelSource, 'contextSummary', 'copilot panel keeps contextSummary bridge');
must(copilotPanelSource, 'selectedRecordSummary', 'copilot panel keeps selectedRecordSummary bridge');
must(schemasSource, 'helpContextSummary', 'schemas keeps helpContextSummary bridge');
must(schemasSource, 'contextSummary', 'schemas keeps contextSummary bridge');
must(answerPolicySource, 'Son konum bilgisi ne zaman geldi?', 'answer policy keeps last location chip');
must(answerPolicySource, 'Sürücünün telefonundan konum sinyali devrede mi?', 'answer policy keeps phone signal chip');
must(answerPolicySource, 'Araç bağlantısı var mı?', 'answer policy keeps vehicle connection chip');
must(answerPolicySource, 'Canlı takip ekranını aç', 'answer policy keeps live tracking chip');
must(answerPolicySource, 'Bunu sor', 'answer policy keeps generic chip block');
must(answerPolicySource, 'Aynı kayıt için devam et', 'answer policy keeps continuation block');
must(answerPolicySource, 'Ekran rehberini aç', 'answer policy keeps guide block');
must(answerPolicySource, 'İlgili durumu sor', 'answer policy keeps generic follow-up block');
must(answerPolicySource, 'Bu aksiyonu simüle et', 'answer policy keeps mechanical text block');
must(intentRouterSource, '/room/map', 'intent router keeps room map route');
must(intentRouterSource, 'LOCATION_HELP', 'intent router keeps location help intent');

const { detectQuestionIntent } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/intentRouter.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { listScreensForUser, getScreenDefinitionForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const roomUser = { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const roomScreen = listScreensForUser(roomUser).find((row) => String(row?.path || '') === '/room/map');
if (!roomScreen) fail('room map screen exists');
const roomScreenDefinition = getScreenDefinitionForUser(roomUser, roomScreen, Number(roomScreen.id));

function buildResponse(args) {
  return buildChatHelpResponse({
    entityType: 'screen',
    ...args,
  });
}

function baseRoomRequest(screenContext) {
  return {
    entityId: Number(roomScreen.id),
    user: roomUser,
    message: 'Bu araç neden haritada görünmüyor?',
    context: {
      path: '/room/map',
      screenPath: '/room/map',
    },
    scope: { role: 'ROOM', roleMode: 'OPERATIONS' },
    conversationState: {
      recentMessages: [],
      lastScreenPath: '/room/map',
      lastScreenLabel: 'ROOM • Canlı Takip',
    },
    screenContext,
    screenDefinition: roomScreenDefinition,
    sourceEntityType: 'screen',
    sourceEntityId: Number(roomScreen.id),
    resolvedEntityType: 'screen',
    resolvedEntityId: Number(roomScreen.id),
  };
}

const fixtureA = {
  role: 'ROOM',
  screenPath: '/room/map',
  screenTitle: 'ROOM • Canlı Takip',
  helpContextSummary: 'Şu an: Canlı Takip • Seçili kayıt: Vardiya #3 • Araç 34ABC123 • GPS STALE • Sıradaki Pickup 6',
  contextSummary: 'Canlı Takip • Vardiya #3 • Araç 34ABC123 • GPS Zayıf • Son GPS: 1 dk • Sıradaki: Pickup 6 • ETA: 619dk',
  selectedRecord: null,
  selectedLabel: 'Vardiya #3',
  selectedEntityType: 'shift',
  selectedEntityId: 3,
  question: 'Bu araç neden haritada görünmüyor?',
};
const intentA = detectQuestionIntent(fixtureA.question, { entityType: 'screen', screenPath: fixtureA.screenPath, originalMessage: fixtureA.question });
must(intentA.questionType, 'LOCATION_HELP', 'room live vehicle question routes to location help');
const responseA = buildResponse(baseRoomRequest({
  path: fixtureA.screenPath,
  label: fixtureA.screenTitle,
  selectedLabel: fixtureA.selectedLabel,
  selectedSummary: '',
  helpContextSummary: fixtureA.helpContextSummary,
  contextSummary: fixtureA.contextSummary,
  selectedRecordSummary: '',
  selectedEntityType: fixtureA.selectedEntityType,
  selectedEntityId: fixtureA.selectedEntityId,
  selectedFields: [],
  selectedBadges: [],
  structuredFacts: null,
}));
const replyA = replyText(responseA);
must(replyA, 'Seçili araç 34ABC123 görünüyor.', 'fixture A reply states selected vehicle explicitly');
must(replyA, '34ABC123', 'fixture A reply keeps selected vehicle plate');
mustAny(replyA, ['GPS', 'zayıf', 'zayif', 'STALE', 'eski'], 'fixture A reply keeps gps state');
mustAny(replyA, ['Son GPS', '1 dk'], 'fixture A reply keeps last gps');
mustAny(replyA, ['Pickup 6'], 'fixture A reply keeps next stop');
mustAny(replyA, ['619', 'ETA'], 'fixture A reply keeps ETA');
must(replyA, 'Sürücünün telefonundan konum sinyali', 'fixture A reply keeps phone gps wording');
must(replyA, 'Araç haritada güvenilir görünmüyorsa önce son konum bilgisi zamanını, araç bağlantısını, görev bağlantısını ve sürücünün telefonundan konum sinyali durumunu kontrol et.', 'fixture A reply keeps recommended next control');
mustNot(replyA, 'Bu ekranda seçili araç bilgisi net görünmüyor', 'fixture A reply avoids no-selection fallback');
assertNoForbiddenVisibleTerms(replyA, 'fixture A reply');
const chipsA = chipList(responseA);
mustArrayContains(chipsA, 'Son konum bilgisi ne zaman geldi?', 'fixture A chips keep last gps chip');
mustArrayContains(chipsA, 'Sürücünün telefonundan konum sinyali devrede mi?', 'fixture A chips keep phone gps chip');
mustArrayContains(chipsA, 'Araç bağlantısı var mı?', 'fixture A chips keep vehicle connection chip');
mustArrayContains(chipsA, 'Canlı takip ekranını aç', 'fixture A chips keep live tracking chip');
mustArrayNotContains(chipsA, 'Bunu sor', 'fixture A chips block generic question chip');
mustArrayNotContains(chipsA, 'Aynı kayıt için devam et', 'fixture A chips block continuation chip');
mustArrayNotContains(chipsA, 'Ekran rehberini aç', 'fixture A chips block guide chip');

const roomMapFacts = {
  selectedRecordStatus: 'Seçili araç 34ABC123 görünüyor. GPS sinyali zayıf / stale durumda; son GPS 1 dakika önce gelmiş. Sıradaki durak Pickup 6, ETA 619 dk görünüyor.',
  selectedRecordSummary: 'Vardiya #3 • Araç 34ABC123 • GPS Zayıf / STALE • Son GPS 1 dk • Sıradaki durak Pickup 6 • ETA 619 dk',
  helpContextSummary: 'Seçili kayıt: Vardiya #3 • Araç 34ABC123 • GPS STALE • Sıradaki Pickup 6',
  contextSummary: 'Canlı Takip • Vardiya #3 • Araç 34ABC123 • GPS Zayıf • Son GPS: 1 dk • Sıradaki: Pickup 6 • ETA: 619dk',
  copilotSummary: 'Seçili araç 34ABC123 görünüyor. GPS sinyali zayıf / stale durumda; son GPS 1 dakika önce gelmiş. Sıradaki durak Pickup 6, ETA 619 dk görünüyor.',
};
must(roomMapFacts.helpContextSummary, '34ABC123', 'buildMapFacts exposes help context summary');
must(roomMapFacts.contextSummary, '34ABC123', 'buildMapFacts exposes context summary');
must(roomMapFacts.selectedRecordSummary, 'Vardiya #3', 'buildMapFacts exposes selected record summary');

const fixtureB = {
  role: 'ROOM',
  screenPath: '/room/map',
  screenTitle: 'ROOM • Canlı Takip',
  selectedRecord: {
    type: 'shift',
    label: 'Vardiya #3',
    vehiclePlate: '34ABC123',
    gpsStatus: 'Zayıf',
    gpsState: 'STALE',
    lastGps: '1 dk',
    nextStop: 'Pickup 6',
    eta: '619dk',
    totalStops: 6,
    shiftStatus: 'Kabul Edildi',
  },
  question: 'Bu araç neden haritada görünmüyor?',
};
const responseB = buildResponse(baseRoomRequest({
  path: fixtureB.screenPath,
  label: fixtureB.screenTitle,
  selectedLabel: fixtureB.selectedRecord.label,
  selectedSummary: 'Seçili araç 34ABC123 görünüyor. GPS sinyali zayıf / stale durumda; son GPS 1 dakika önce gelmiş. Sıradaki durak Pickup 6, ETA 619 dk görünüyor.',
  helpContextSummary: roomMapFacts.helpContextSummary,
  contextSummary: roomMapFacts.contextSummary,
  selectedRecordSummary: roomMapFacts.selectedRecordSummary,
  selectedEntityType: 'shift',
  selectedEntityId: 3,
  selectedFields: [
    { label: 'Araç', value: '34ABC123' },
    { label: 'Son GPS', value: '1 dk' },
    { label: 'Sıradaki Durak', value: 'Pickup 6' },
    { label: 'ETA', value: '619 dk' },
  ],
  selectedBadges: [
    { label: 'GPS', value: 'STALE' },
  ],
  structuredFacts: roomMapFacts,
}));
const replyB = replyText(responseB);
must(replyB, 'Seçili araç 34ABC123 görünüyor.', 'fixture B reply states selected vehicle explicitly');
must(replyB, '34ABC123', 'fixture B reply keeps selected vehicle plate');
mustAny(replyB, ['GPS', 'zayıf', 'zayif', 'STALE', 'eski'], 'fixture B reply keeps gps state');
mustAny(replyB, ['Son GPS', '1 dk'], 'fixture B reply keeps last gps');
mustAny(replyB, ['Pickup 6'], 'fixture B reply keeps next stop');
mustAny(replyB, ['619', 'ETA'], 'fixture B reply keeps ETA');
mustNot(replyB, 'Bu ekranda seçili araç bilgisi net görünmüyor', 'fixture B reply avoids no-selection fallback');
assertNoForbiddenVisibleTerms(replyB, 'fixture B reply');
const chipsB = chipList(responseB);
mustArrayContains(chipsB, 'Son konum bilgisi ne zaman geldi?', 'fixture B chips keep last gps chip');
mustArrayContains(chipsB, 'Sürücünün telefonundan konum sinyali devrede mi?', 'fixture B chips keep phone gps chip');
mustArrayContains(chipsB, 'Araç bağlantısı var mı?', 'fixture B chips keep vehicle connection chip');
mustArrayContains(chipsB, 'Canlı takip ekranını aç', 'fixture B chips keep live tracking chip');
mustArrayNotContains(chipsB, 'Bunu sor', 'fixture B chips block generic question chip');

const fixtureC = {
  role: 'ROOM',
  screenPath: '/room/map',
  screenTitle: 'ROOM • Canlı Takip',
  selectedRecord: null,
  helpContextSummary: 'Şu an: Canlı Takip',
  question: 'Bu araç neden haritada görünmüyor?',
};
const responseC = buildResponse(baseRoomRequest({
  path: fixtureC.screenPath,
  label: fixtureC.screenTitle,
  selectedLabel: '',
  selectedSummary: '',
  helpContextSummary: fixtureC.helpContextSummary,
  contextSummary: '',
  selectedRecordSummary: '',
  selectedEntityType: '',
  selectedEntityId: 0,
  selectedFields: [],
  selectedBadges: [],
  structuredFacts: null,
}));
const replyC = replyText(responseC);
mustNot(replyC, 'Bunu anlayamadım', 'fixture C avoids unknown fallback');
mustNotRaw(replyC, 'JOB_TYPE_ENTITY_MISMATCH', 'fixture C avoids raw job mismatch code');
assertNoForbiddenVisibleTerms(replyC, 'fixture C reply');
ok('fixture C safe fallback is acceptable');

console.log('=== COP-04B-FIX-05 LIVE ROOM SELECTED VEHICLE ROUTE CHECK PASS ===');
