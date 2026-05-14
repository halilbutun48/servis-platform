#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function mustAny(text, needles, label) {
  const normalized = normalize(text);
  if (needles.some((needle) => normalized.includes(normalize(needle)))) ok(label);
  else fail(label);
}

function mustArrayContains(arr, needle, label) {
  if (Array.isArray(arr) && arr.some((item) => normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

console.log('=== COP-04A-FIX-03 LIVE COMPANY AGREEMENTS CONTEXT CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const panel = read('web/src/panels/company/AgreementsPanel.jsx');
const agreementFactsSource = read('web/src/utils/agreementCopilotFacts.js');
const factsSource = read('web/src/utils/copilotFacts.js');
const intentRouterSource = read('backend/src/ai/chat/intentRouter.js');
const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
const golden = read('backend/src/ai/chat/goldenQuestionPack.js');

must(pkg, '"check:cop04afix03": "node backend/scripts/cop_04a_fix_03_live_company_agreements_context_check.js"', 'package.json exposes check:cop04afix03');
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
  'check:cop03cfix03',
  'check:cop04a',
  'check:cop04afix02',
  'check:cop04afix01',
], 'product extensions runner order keeps cop04afix03 in the global chain');

must(verifyChain, 'check:cop04afix03', 'verify chain waits for check:cop04afix03');
must(guide, 'check:cop04afix03', 'script guide exposes check:cop04afix03');
must(guide, 'check:cop04afix02', 'script guide keeps check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide keeps check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');
must(guide, 'check:cop03cfix03', 'script guide keeps check:cop03cfix03');

must(panel, "screenPath: '/company/agreements'", 'company agreements panel keeps copilot screen path');
must(panel, "screenTitle: 'Sözleşmeler (Company)'", 'company agreements panel keeps company title');
ordered(panel, ['Kaynak vardiya', 'Üretilen vardiya', 'Son üretilen vardiya'], 'company agreements panel keeps bridge fields first');
must(panel, 'selectedAgreementCopilotContext', 'company agreements panel keeps copilot context bridge');
must(panel, 'buildAgreementCopilotFacts', 'company agreements panel keeps agreement facts builder');

must(agreementFactsSource, 'export function buildAgreementCopilotFacts', 'agreement copilot facts helper exists');
must(agreementFactsSource, 'generatedShiftCount', 'agreement copilot facts helper keeps generated shift counter');
must(agreementFactsSource, 'sourceShiftId', 'agreement copilot facts helper keeps source shift counter');
must(agreementFactsSource, 'lastGeneratedShiftId', 'agreement copilot facts helper keeps last generated shift counter');
must(agreementFactsSource, 'productionSignal', 'agreement copilot facts helper keeps production signal');
must(agreementFactsSource, 'copilotSummary', 'agreement copilot facts helper keeps copilot summary');
must(agreementFactsSource, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'agreement copilot facts helper keeps positive production wording');
must(agreementFactsSource, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'agreement copilot facts helper keeps negative production wording');
must(agreementFactsSource, 'Sözleşme onayı, üretim köprüsü ve bugünkü vardiya aynı şey değildir; köprü sinyali ayrı okunur.', 'agreement copilot facts helper keeps compare hint');

must(factsSource, "if (normalizedScreenType === 'AGREEMENTS')", 'copilot facts keeps agreements branch');
must(factsSource, 'Üretim geçmişini aç, bugünkü vardiyalar listesini kontrol et ve son üretilen vardiyayı doğrula.', 'copilot facts keeps agreements action simulation');
must(factsSource, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'copilot facts keeps agreements positive diagnostic');
must(factsSource, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'copilot facts keeps agreements negative diagnostic');

must(intentRouterSource, '/company/agreements', 'intent router keeps company agreements routing');
must(intentRouterSource, 'CONTRACT_TO_SHIFT', 'intent router keeps contract-to-shift intent');
must(intentRouterSource, 'CONTRACT_SHIFT_TODAY', 'intent router keeps contract-today intent');
must(intentRouterSource, 'bu sözleşmeden bugün vardiya üretildi mi', 'intent router keeps Turkish contract question variants');
must(intentRouterSource, 'sözleşmeden vardiya üretildi mi', 'intent router keeps contract generation variants');
must(intentRouterSource, 'sözleşme bugün vardiya üretildi mi', 'intent router keeps contract today variants');

must(helpComposerSource, 'CONTRACT_TO_SHIFT', 'help composer keeps contract workflow topic');
must(helpComposerSource, 'CONTRACT_SHIFT_TODAY', 'help composer keeps contract today workflow topic');
must(helpComposerSource, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'help composer keeps positive company contract answer');
must(helpComposerSource, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'help composer keeps negative company contract answer');
mustAny(helpComposerSource, [
  'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya sözleşme üretim sinyali gerekir.',
  'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya üretim geçmişi gerekir.',
], 'help composer keeps mismatch explanation');
mustNot(helpComposerSource, 'Bunu anlayamadım', 'help composer avoids unknown fallback wording for contract flow');
mustNotRaw(helpComposerSource, 'contractShiftGeneration', 'help composer avoids technical contract generation token');
mustNotRaw(helpComposerSource, 'OperationProof', 'help composer avoids technical proof wording');
mustNot(helpComposerSource, 'Bu vardiyada ana engel', 'help composer avoids wrong shift-first wording');

must(golden, 'company-agreements-contract-bridge', 'golden pack keeps company agreements bridge case');
must(golden, "path: '/company/agreements'", 'golden pack keeps company agreements path');
must(golden, 'Kaynak vardiya', 'golden pack keeps source shift bridge field');
must(golden, 'Üretilen vardiya', 'golden pack keeps generated shift bridge field');
must(golden, 'Son üretilen vardiya', 'golden pack keeps last generated shift bridge field');
must(golden, 'Bu sözleşmeden bugün vardiya üretildi mi?', 'golden pack keeps contract question wording');
must(golden, 'CONTRACT_TO_SHIFT', 'golden pack keeps contract intent marker');

const { buildAgreementCopilotFacts } = await import('../../web/src/utils/agreementCopilotFacts.js');
const { detectQuestionIntent } = await import('../src/ai/chat/intentRouter.js');
const { buildChatHelpResponse } = await import('../src/ai/chat/helpComposer.js');
const { getScreenDefinitionForUser, listScreensForUser } = await import('../src/ai/jobGuide/screenCatalog.js');

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
  oda: '#1',
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

const agreementSummary = {
  screenPath: '/company/agreements',
  screenTitle: 'Sözleşmeler (Company)',
  selectedRecordType: 'agreement',
  selectedRecordLabel: 'Sözleşme #1',
  selectedRecordId: 1,
  selectedRecordStatus: 'Kabul Edildi',
  selectedRecordSummary: 'Kabul Edildi • Oda #1 • 16.05.2026 - 20.05.2026 • Hafta içi • 07:00 - 09:00',
  sourceShiftId: 4,
  generatedShiftCount: 3,
  lastGeneratedShiftId: 7,
  lastGeneratedShiftStatus: 'APPROVED',
  lastGeneratedShiftStart: '20.05.2026 07:00',
  lastGeneratedShiftEnd: '20.05.2026 09:00',
  personelCount: 6,
  stopCount: 6,
  todayGeneratedShift: true,
  generationHistory: [
    {
      id: 7,
      status: 'APPROVED',
      startAt: '20.05.2026 07:00',
      endAt: '20.05.2026 09:00',
      peopleCount: 6,
      stopCount: 6,
    },
  ],
  productionSignal: 'Üretilen vardiya: 3',
  vehicleLabel: '34ABC123',
  driverLabel: 'Sürücü Demo',
  pendingCount: 0,
  otherCount: 0,
  extendCount: 0,
  shiftCount: 3,
  todayDone: 1,
  todayTotal: 1,
  horizonOpen: 0,
};

const bridge = buildAgreementCopilotFacts(selectedRecord, agreementSummary);
must(bridge.selectedRecordType, 'agreement', 'bridge helper keeps selected record type');
must(bridge.selectedRecordLabel, 'Sözleşme #1', 'bridge helper keeps selected record label');
must(bridge.selectedRecordSummary, 'Kabul Edildi', 'bridge helper keeps selected record summary');
must(bridge.productionSignal, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'bridge helper keeps positive production signal');
must(bridge.copilotSummary, 'Üretilen vardiya: 3', 'bridge helper keeps generated shift count summary');
must(bridge.copilotSummary, 'Son üretilen vardiya #7', 'bridge helper keeps last generated shift summary');
must(bridge.copilotSummary, 'Bugün üretim: Var', 'bridge helper keeps today production summary');
must(bridge.diagnosticPriority.summary, 'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.', 'bridge helper keeps diagnostic summary');
must(bridge.actionSimulation, 'Üretim geçmişini aç', 'bridge helper keeps action simulation wording');
mustNot(bridge.actionSimulation, 'Bu aksiyonu simüle et', 'bridge helper avoids generic action simulation wording');

const intent = detectQuestionIntent(question, {
  entityType: 'screen',
  screenPath: screen.path,
  roleMode: 'OPERATIONS',
  originalMessage: question,
});
mustAny(intent.questionType, ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'], 'question intent routes to contract generation');
mustNot(intent.questionType, 'READINESS_CHECK', 'question intent no longer prefers readiness check');
mustNot(intent.questionType, 'SCREEN_PURPOSE', 'question intent does not fall back to screen purpose');

const screenContext = {
  id: Number(screen.id),
  path: screen.path,
  label: screen.label,
  role: user.role,
  companyKind: user.companyKind,
  selectedEntityType: 'agreement',
  selectedEntityId: 1,
  selectedLabel: 'Sözleşme #1',
  selectedSummary: 'Kabul Edildi • Oda #1',
  selectedFields: [
    { label: 'Kaynak vardiya', value: '#4' },
    { label: 'Üretilen vardiya', value: '3' },
    { label: 'Son üretilen vardiya', value: '#7' },
    { label: 'Son durum', value: 'APPROVED' },
    { label: 'Son zaman', value: '20.05.2026 07:00 - 20.05.2026 09:00' },
    { label: 'Personel', value: '6' },
    { label: 'Durak', value: '6' },
  ],
  selectedBadges: [
    { label: 'Üretim', value: 'Var' },
    { label: 'Köprü', value: 'Açık' },
  ],
  structuredFacts: bridge,
};

const response = buildChatHelpResponse({
  entityType: 'screen',
  entityId: Number(screen.id),
  user,
  message: question,
  context: null,
  entityLabel: screen.label,
  scope: { roleMode: 'OPERATIONS' },
  conversationState: {
    lastScreenPath: screen.path,
    lastScreenLabel: screen.label,
  },
  screenContext,
  screenDefinition,
});

must(response.reply, 'Şimdi:', 'reply keeps workflow lead');
mustAny(response.reply, [
  'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.',
  'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.',
], 'reply stays on contract generation path');
mustAny(response.reply, ['Üretilen vardiya', 'Son üretilen vardiya', 'üretim sinyali'], 'reply surfaces generated shift signal');
mustNot(response.reply, 'Bunu anlayamadım', 'reply avoids unknown fallback');
mustNot(response.reply, 'agreement', 'reply avoids english agreement wording');
mustNot(response.reply, 'contractShiftGeneration', 'reply avoids technical contract generation token');
mustNot(response.reply, 'OperationProof', 'reply avoids technical proof wording');
mustNot(response.reply, 'Bu vardiyada ana engel', 'reply avoids wrong shift-first lead');
mustArrayContains(response.suggestedChips, 'Üretim geçmişini göster', 'reply keeps production history chip');
mustArrayContains(response.suggestedChips, 'Bugünkü vardiyaları göster', 'reply keeps today shifts chip');
mustArrayContains(response.suggestedChips, 'İlgili sözleşmeyi aç', 'reply keeps contract chip');
mustArrayContains(response.suggestedChips, 'Üretim durumunu açıkla', 'reply keeps production status chip');
mustNot(JSON.stringify(response.suggestedChips), 'Bunu sor', 'reply avoids generic self-question chip');
mustNot(JSON.stringify(response.suggestedChips), 'Ekran rehberini aç', 'reply avoids generic guide chip');
mustNot(JSON.stringify(response.suggestedChips), 'Aynı kayıt için devam et', 'reply avoids generic continuation chip');

console.log('=== COP-04A-FIX-03 LIVE COMPANY AGREEMENTS CONTEXT CHECK PASS ===');
