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

function mustAny(text, needles, label) {
  const haystack = normalize(text);
  const list = Array.isArray(needles) ? needles : [];
  if (list.some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustNotRaw(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function mustArrayContains(arr, needle, label) {
  if (Array.isArray(arr) && arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
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

console.log('=== COP-04B-FIX-06 FREE CHAT CONTEXT BRIDGE CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const auditDoc = read('docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md');
const serviceSource = read('backend/src/ai/service.js');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const floatingDrawerSource = read('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const copilotPanelSource = read('web/src/panels/shared/CopilotPanel.jsx');

must(pkg, '"check:cop04bfix06": "node backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js"', 'package.json exposes check:cop04bfix06');
must(pkg, '"check:cop04bfix05"', 'package.json keeps check:cop04bfix05');
must(pkg, '"check:cop04bfix04"', 'package.json keeps check:cop04bfix04');
must(pkg, '"check:cop04bfix03"', 'package.json keeps check:cop04bfix03');
must(pkg, '"check:cop04bfix02"', 'package.json keeps check:cop04bfix02');
must(pkg, '"check:cop04bfix01"', 'package.json keeps check:cop04bfix01');
must(pkg, '"check:cop04b"', 'package.json keeps check:cop04b');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');

must(runner, 'check:cop04bfix06', 'product extensions runner keeps cop04bfix06');
must(verifyChain, 'check:cop04bfix06', 'verify chain waits for check:cop04bfix06');
must(guide, 'check:cop04bfix06', 'script guide exposes check:cop04bfix06');
mustAny(guide, ['free-chat submit request', 'selected signal setini', 'Room / Canlı Takip sorularında'], 'script guide keeps fix06 note visible');
mustAny(auditDoc, ['free-chat submit request', 'selected signal setini', 'header quick answer ile free chat ayni selected signal setini'], 'audit doc keeps fix06 note');
must(serviceSource, 'liveFacts', 'service accepts liveFacts alias');
must(helpComposerSource, 'liveFacts', 'help composer accepts liveFacts alias');
must(floatingDrawerSource, 'const latestSelection = readCopilotSelection();', 'floating drawer refreshes live selection at submit time');
must(floatingDrawerSource, 'entityType: "screen"', 'floating drawer submits free chat as screen-scoped request');
must(floatingDrawerSource, 'liveFacts', 'floating drawer forwards liveFacts');
must(copilotPanelSource, 'const latestSelection = readCopilotSelection();', 'copilot panel refreshes live selection at submit time');
must(copilotPanelSource, 'entityType: "screen"', 'copilot panel submits free chat as screen-scoped request');
must(copilotPanelSource, 'liveFacts', 'copilot panel forwards liveFacts');
must(serviceSource, 'Bu ekranda seçili araç bilgisi net görünmüyor', 'service keeps safe no-selection fallback');
must(helpComposerSource, 'Son konum bilgisi ne zaman geldi?', 'help composer keeps gps chip');
must(helpComposerSource, 'Sürücünün telefonundan konum sinyali devrede mi?', 'help composer keeps phone gps chip');

const { detectQuestionIntent } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/intentRouter.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { getScreenDefinitionForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const roomUser = { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'DEMO' };
const screenDefinition = getScreenDefinitionForUser(roomUser, { path: '/room/map', label: 'ROOM • Canlı Takip' }, 1100);

function buildResponse(screenContext) {
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1100,
    user: roomUser,
    message: 'Bu araç neden haritada görünmüyor?',
    conversationState: {
      recentMessages: [],
      lastScreenPath: '/room/map',
      lastScreenLabel: 'ROOM • Canlı Takip',
      selectedLabel: screenContext?.selectedLabel || '',
      selectedEntityType: screenContext?.selectedEntityType || '',
      selectedEntityId: Number(screenContext?.selectedEntityId || 0) || null,
    },
    screenContext,
    screenDefinition,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    resolvedEntityType: 'screen',
    resolvedEntityId: 1100,
    context: { path: '/room/map', screenPath: '/room/map' },
  });
}

const liveFacts = {
  copilotSummary: 'Seçili araç 34ABC123 • GPS STALE • Son GPS: 1 dk • Sıradaki Pickup 6 • ETA: 619dk',
  selectedRecordSummary: 'Durum: APPROVED • Araç: 34ABC123 • Sürücü: Sürücü Demo • Durak: 6',
  selectedRecordStatus: 'Durum: APPROVED • Araç: 34ABC123 • Sürücü: Sürücü Demo • Durak: 6',
  todayGenerated: false,
};

const fixtureA = {
  path: '/room/map',
  label: 'ROOM • Canlı Takip',
  role: 'ROOM',
  selectedLabel: 'Vardiya #3',
  selectedEntityType: 'shift',
  selectedEntityId: 3,
  helpContextSummary: 'Şu an: Canlı Takip • Seçili kayıt: Vardiya #3 • Araç 34ABC123 • GPS STALE • Sıradaki Pickup 6',
  contextSummary: 'Canlı Takip • Vardiya #3 • Araç 34ABC123 • GPS Zayıf • Son GPS: 1 dk • Sıradaki: Pickup 6 • ETA: 619dk',
  selectedRecordSummary: '',
  selectedRecordStatus: '',
  selectedFields: [],
  selectedBadges: [],
  liveFacts,
  structuredFacts: null,
};

const intentA = detectQuestionIntent('Bu araç neden haritada görünmüyor?', { entityType: 'screen', screenPath: fixtureA.path, originalMessage: 'Bu araç neden haritada görünmüyor?' });
must(intentA.questionType, 'LOCATION_HELP', 'free chat location question routes to location help');

const responseA = buildResponse(fixtureA);
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
mustNot(replyA, 'Bunu anlayamadım', 'fixture A reply avoids unknown fallback');
assertNoForbiddenVisibleTerms(replyA, 'fixture A reply');
const chipsA = chipList(responseA);
mustArrayContains(chipsA, 'Son konum bilgisi ne zaman geldi?', 'fixture A chips keep last gps chip');
mustArrayContains(chipsA, 'Sürücünün telefonundan konum sinyali devrede mi?', 'fixture A chips keep phone gps chip');
mustArrayContains(chipsA, 'Araç bağlantısı var mı?', 'fixture A chips keep vehicle connection chip');
mustArrayContains(chipsA, 'Canlı takip ekranını aç', 'fixture A chips keep live tracking chip');

const fixtureB = {
  path: '/room/map',
  label: 'ROOM • Canlı Takip',
  role: 'ROOM',
  selectedLabel: '',
  selectedEntityType: '',
  selectedEntityId: null,
  helpContextSummary: 'Şu an: Canlı Takip',
  contextSummary: 'Şu an: Canlı Takip',
  selectedRecordSummary: '',
  selectedRecordStatus: '',
  selectedFields: [],
  selectedBadges: [],
  liveFacts: null,
  structuredFacts: null,
};
const responseB = buildResponse(fixtureB);
const replyB = replyText(responseB);
mustAny(replyB, ['Bu ekranda seçili araç bilgisi net görünmüyor', 'Ekrandaki sinyale göre konuşuyorum'], 'fixture B keeps safe no-selection fallback');
mustNot(replyB, 'Bunu anlayamadım', 'fixture B avoids unknown fallback');
mustNotRaw(replyB, 'JOB_TYPE_ENTITY_MISMATCH', 'fixture B avoids raw entity mismatch');
assertNoForbiddenVisibleTerms(replyB, 'fixture B reply');
mustArrayContains(chipList(responseB), 'Son konum bilgisi ne zaman geldi?', 'fixture B chips stay gps-specific');

console.log('=== COP-04B-FIX-06 FREE CHAT CONTEXT BRIDGE CHECK PASS ===');
