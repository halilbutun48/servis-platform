#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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
  if ((Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustArrayContains(arr, needle, label) {
  if (Array.isArray(arr) && arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

console.log('=== COP-04A-FIX-04 QUICK HELP CONTRACT ANSWER ROUTE CHECK ===');

const pkg = read('package.json');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const schemasSource = read('backend/src/ai/schemas.js');
const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const agreementFactsSource = read('web/src/utils/agreementCopilotFacts.js');
const panelSource = read('web/src/panels/company/AgreementsPanel.jsx');
const goldenSource = read('backend/src/ai/chat/goldenQuestionPack.js');
const registryScripts = productExtensionsChecks.map((step) => step.script);

must(pkg, '"check:cop04afix04": "node backend/scripts/cop_04a_fix_04_quick_help_contract_answer_route_check.js"', 'package.json exposes check:cop04afix04');
must(pkg, '"check:cop04afix03"', 'package.json keeps check:cop04afix03');
must(pkg, '"check:cop04afix02"', 'package.json keeps check:cop04afix02');
must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');

assertProductExtensionsOrder([
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
], 'product extensions registry order keeps cop04afix04 in the global chain', registryScripts);
assertProductExtensionsIncludes('check:cop04afix04', 'product extensions registry references cop04afix04', registryScripts);
assertProductExtensionsIncludes('check:cop04afix04', 'verify chain registry waits for check:cop04afix04', registryScripts);
must(guide, 'check:cop04afix04', 'script guide exposes check:cop04afix04');
must(guide, 'check:cop04afix03', 'script guide keeps check:cop04afix03');
must(guide, 'check:cop04afix02', 'script guide keeps check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide keeps check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');

must(schemasSource, 'isAgreementScreenContext', 'request normalization keeps agreement screen context helper');
must(schemasSource, 'isContractToShiftQuestion', 'request normalization keeps contract-to-shift prompt helper');
must(schemasSource, 'CONTRACT_TO_SHIFT_PHRASES', 'request normalization keeps contract prompt variants');
must(intentRouterSource, 'CONTRACT_TO_SHIFT', 'intent router keeps contract-to-shift intent');
must(intentRouterSource, 'CONTRACT_SHIFT_TODAY', 'intent router keeps contract-today intent');
must(intentRouterSource, '/company/agreements', 'intent router keeps agreements screen routing');
must(helpComposerSource, 'buildContractProductionSignalState', 'help composer keeps contract production bridge helper');
must(helpComposerSource, 'contractProductionSignal.summaryText', 'help composer keeps contract production lead reuse');
must(helpComposerSource, 'contractProductionSignal.details', 'help composer keeps contract production evidence reuse');
must(helpComposerSource, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'help composer keeps positive contract production wording');
must(helpComposerSource, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'help composer keeps negative contract production wording');

must(agreementFactsSource, 'export function buildAgreementCopilotFacts', 'agreement facts helper exists');
must(agreementFactsSource, 'copilotSummary', 'agreement facts helper keeps copilot summary');
must(agreementFactsSource, 'generatedShiftCount', 'agreement facts helper keeps generated shift count');
must(agreementFactsSource, 'lastGeneratedShiftId', 'agreement facts helper keeps last generated shift id');
must(agreementFactsSource, 'todayGeneratedShift', 'agreement facts helper keeps today generated flag');
must(agreementFactsSource, 'Üretilen vardiya:', 'agreement facts helper keeps generated shift wording');
must(agreementFactsSource, 'Son üretilen vardiya #', 'agreement facts helper keeps last generated shift wording');
must(agreementFactsSource, 'Bugün üretim: Var', 'agreement facts helper keeps today production wording');
must(panelSource, "selectedAgreementCopilotContext", 'agreements panel keeps copilot bridge selection');
must(panelSource, "setCopilotSelection({", 'agreements panel keeps copilot selection push');
must(panelSource, "selectedRecordSummary", 'agreements panel keeps selected record summary bridge');
must(panelSource, "copilotSummary", 'agreements panel keeps copilot summary bridge');
must(goldenSource, 'company-agreements-contract-bridge', 'golden pack keeps company agreements bridge case');
must(goldenSource, 'Bu sözleşmeden bugün vardiya üretildi mi?', 'golden pack keeps contract production question');

const { buildAgreementCopilotFacts } = await import(pathToFileURL(path.join(root, 'web/src/utils/agreementCopilotFacts.js')).href);
const { normalizeCopilotRequestInput, parseCopilotRequest } = await import(pathToFileURL(path.join(root, 'backend/src/ai/schemas.js')).href);
const { detectQuestionIntent } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/intentRouter.js')).href);
const { buildChatHelpResponse } = await import(pathToFileURL(path.join(root, 'backend/src/ai/chat/helpComposer.js')).href);
const { getScreenDefinitionForUser, listScreensForUser } = await import(pathToFileURL(path.join(root, 'backend/src/ai/jobGuide/screenCatalog.js')).href);

const user = { role: 'COMPANY', companyId: 1, companyKind: 'DEMO' };
const question = 'Bu sözleşmeden bugün vardiya üretildi mi?';
const screens = listScreensForUser(user);
const screen = screens.find((row) => String(row?.path || '') === '/company/agreements');
if (!screen) fail('company agreements screen exists');

const screenDefinition = getScreenDefinitionForUser(user, screen, Number(screen.id));

const selectedRecord = {
  id: 1,
  type: 'agreement',
  label: 'Sözleşme #1',
  status: 'Kabul Edildi',
  roomId: 1,
  roomName: 'DEMO Oda',
  startDate: '2026-05-16',
  endDate: '2026-05-20',
  startMin: 7 * 60,
  endMin: 9 * 60,
  weekMask: 62,
  sourceShiftId: 4,
  generatedShiftCount: 3,
  lastGeneratedShiftId: 7,
  lastGeneratedShiftStatus: 'APPROVED',
  lastGeneratedShiftStart: '20.05.2026 07:00',
  lastGeneratedShiftEnd: '20.05.2026 09:00',
  personelCount: 6,
  stopCount: 6,
};

const bridge = buildAgreementCopilotFacts(selectedRecord, {
  screenPath: '/company/agreements',
  screenTitle: 'Sözleşmeler (Company)',
  selectedRecordType: 'agreement',
  selectedRecordLabel: 'Sözleşme #1',
  selectedRecordId: 1,
  selectedRecordStatus: 'Kabul Edildi',
  selectedRecordSummary: 'Kabul Edildi • Oda #1 • 16.05.2026 - 20.05.2026 • Kaynak vardiya #4 • Üretilen vardiya: 3 • Son üretilen vardiya #7 • APPROVED • 20.05.2026 07:00 - 20.05.2026 09:00 • Personel: 6 • Durak: 6',
  sourceShiftId: 4,
  generatedShiftCount: 3,
  lastGeneratedShiftId: 7,
  lastGeneratedShiftStatus: 'APPROVED',
  lastGeneratedShiftStart: '20.05.2026 07:00',
  lastGeneratedShiftEnd: '20.05.2026 09:00',
  personelCount: 6,
  stopCount: 6,
  todayGeneratedShift: true,
});

must(bridge.selectedRecordLabel, 'Sözleşme #1', 'bridge helper keeps selected record label');
must(bridge.selectedRecordSummary, 'Kaynak vardiya #4', 'bridge helper keeps source shift summary');
must(bridge.copilotSummary, 'Üretilen vardiya: 3', 'bridge helper keeps generated shift count summary');
must(bridge.copilotSummary, 'Son üretilen vardiya #7', 'bridge helper keeps last generated shift summary');
must(bridge.copilotSummary, 'Bugün üretim: Var', 'bridge helper keeps today production summary');

const rawRequest = {
  message: question,
  screenContext: {
    id: Number(screen.id),
    path: '/company/agreements',
    label: 'Sözleşmeler (Company)',
    selectedLabel: bridge.selectedRecordLabel,
    selectedSummary: 'Seçili kayıt: Sözleşme #1 • Kaynak vardiya: #4 • Üretilen vardiya: 3 • Son üretilen vardiya #7 • Bugün üretim: Var • Bağlam: Sözleşmeler - Sözleşme #1',
    structuredFacts: bridge,
    selectedEntityType: bridge.selectedRecordType,
    selectedEntityId: bridge.selectedRecordId,
    copilotSummary: bridge.copilotSummary,
  },
  conversationState: {
    lastScreenPath: '/company/agreements',
    lastScreenLabel: 'Sözleşmeler (Company)',
    recentMessages: [],
  },
};

const normalized = normalizeCopilotRequestInput(rawRequest);
must(normalized.intent, 'CHAT_HELP', 'normalization infers chat help intent');
must(normalized.entityType, 'screen', 'normalization infers screen entity type');
must(String(normalized.entityId || ''), String(screen.id), 'normalization pins the screen entity id');

const parsed = parseCopilotRequest(rawRequest);
if (!parsed.success) {
  fail(`parseCopilotRequest should succeed: ${JSON.stringify(parsed.error.flatten())}`);
}
must(parsed.data.intent, 'CHAT_HELP', 'parse keeps chat help intent');
must(parsed.data.entityType, 'screen', 'parse keeps screen entity type');

const intentProbe = detectQuestionIntent(question, {
  screenPath: '/company/agreements',
  entityType: 'screen',
  originalMessage: question,
});
mustAny(intentProbe?.questionType || '', ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'], 'question intent routes to contract production');

const response = buildChatHelpResponse({
  entityType: parsed.data.entityType,
  entityId: parsed.data.entityId,
  user,
  message: parsed.data.message,
  context: {
    screenPath: '/company/agreements',
    selectedLabel: bridge.selectedRecordLabel,
    selectedSummary: bridge.copilotSummary,
  },
  entityLabel: 'Sözleşmeler (Company)',
  scope: '/company/agreements',
  conversationState: parsed.data.conversationState || rawRequest.conversationState,
  screenContext: rawRequest.screenContext,
  screenDefinition,
  sourceEntityType: 'screen',
  sourceEntityId: Number(screen.id),
  resolvedEntityType: parsed.data.entityType,
  resolvedEntityId: parsed.data.entityId,
});

const reply = String(response?.reply || response?.summary || '');
mustNot(reply, 'Bunu anlayamadım', 'reply avoids unknown fallback wording');
mustAny(reply, [
  'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.',
  'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.',
], 'reply keeps contract production explanation');
mustAny(reply, ['Üretilen vardiya sayısı 3', 'Üretilen vardiya: 3'], 'reply keeps generated shift count');
must(reply, 'son üretilen vardiya #7', 'reply keeps last generated shift id');
mustAny(reply, ['Bugün üretim: Var', 'bugün üretim: var'], 'reply keeps today production signal');
mustNotRaw(reply, 'agreement', 'reply avoids visible agreement term');
mustNotRaw(reply, 'contractShiftGeneration', 'reply avoids visible technical contract token');
mustNotRaw(reply, 'OperationProof', 'reply avoids visible proof token');
mustNot(reply, 'Bu vardiyada ana engel', 'reply avoids wrong shift-first wording');
mustNotRaw(reply, 'raw', 'reply avoids raw token');
mustNotRaw(reply, 'payload', 'reply avoids payload token');
mustNotRaw(reply, 'token', 'reply avoids token token');
mustNotRaw(reply, 'hash', 'reply avoids hash token');
mustNotRaw(reply, 'debug', 'reply avoids debug token');
mustNotRaw(reply, 'write', 'reply avoids write token');
mustNotRaw(reply, 'execute', 'reply avoids execute token');
mustNotRaw(reply, 'settlement execute', 'reply avoids settlement execute token');
mustArrayContains(response?.contextualSuggestedChips || response?.suggestedChips || [], 'Üretim geçmişini göster', 'reply keeps contract production chip');
mustArrayContains(response?.contextualSuggestedChips || response?.suggestedChips || [], 'Bugünkü vardiyaları göster', 'reply keeps today shifts chip');
mustArrayContains(response?.contextualSuggestedChips || response?.suggestedChips || [], 'İlgili sözleşmeyi aç', 'reply keeps open contract chip');
mustArrayContains(response?.contextualSuggestedChips || response?.suggestedChips || [], 'Üretim durumunu açıkla', 'reply keeps explain production chip');
mustNotRaw(JSON.stringify(response?.contextualSuggestedChips || response?.suggestedChips || []), 'Bunu sor:', 'workflow chips avoid self-question generic wording');
mustNotRaw(JSON.stringify(response?.contextualSuggestedChips || response?.suggestedChips || []), 'Aynı kayıt için devam et', 'workflow chips avoid generic continue wording');
mustNotRaw(JSON.stringify(response?.contextualSuggestedChips || response?.suggestedChips || []), 'Ekran rehberini aç', 'workflow chips avoid generic guide wording');

console.log('=== COP-04A-FIX-04 QUICK HELP CONTRACT ANSWER ROUTE CHECK PASS ===');
