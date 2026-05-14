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

function mustArrayContains(arr, needle, label) {
  if (Array.isArray(arr) && arr.some((item) => normalize(item) === normalize(needle) || normalize(item).includes(normalize(needle)))) ok(label);
  else fail(label);
}

console.log('=== COP-04A-FIX-02 CONTRACT GENERATION INTENT CHECK ===');

const pkg = read('package.json');
const runner = read('backend/scripts/run_product_extensions_check_chain.js');
const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const golden = read('backend/src/ai/chat/goldenQuestionPack.js');

must(pkg, '"check:cop04afix02": "node backend/scripts/cop_04a_fix_02_contract_generation_intent_check.js"', 'package.json exposes check:cop04afix02');
must(pkg, '"check:cop04a"', 'package.json keeps check:cop04a');
must(pkg, '"check:cop04afix01"', 'package.json keeps check:cop04afix01');
must(pkg, '"check:cop03cfix03"', 'package.json keeps check:cop03cfix03');

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
  'check:cop03cfix03',
  'check:cop04a',
  'check:cop04afix02',
  'check:cop04afix01',
], 'product extensions runner order keeps cop04afix02 before cop04afix01');

must(verifyChain, 'check:cop04afix02', 'verify chain waits for check:cop04afix02');
must(verifyChain, 'check:cop04afix01', 'verify chain waits for check:cop04afix01');
must(guide, 'check:cop04afix02', 'script guide exposes check:cop04afix02');
must(guide, 'check:cop04afix01', 'script guide exposes check:cop04afix01');
must(guide, 'check:cop04a', 'script guide keeps check:cop04a');
must(guide, 'check:cop03cfix03', 'script guide keeps check:cop03cfix03');

must(intentRouter, 'bu sözleşmeden bugün vardiya üretildi mi', 'intent router keeps company contract variants');
must(intentRouter, '/company/agreements', 'intent router boosts company agreements screen');
must(intentRouter, 'agreements-contract-shift-generation', 'intent router keeps agreements contract boost');
must(intentRouter, 'agreements-contract-shift-today', 'intent router keeps agreements today boost');
mustNot(intentRouter, 'Bunu anlayamadım', 'intent router avoids unknown fallback wording');

must(helpComposer, 'CONTRACT_TO_SHIFT', 'help composer keeps contract workflow topic');
must(helpComposer, 'CONTRACT_SHIFT_TODAY', 'help composer keeps contract today workflow topic');
must(helpComposer, 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.', 'help composer keeps contract next action');
must(helpComposer, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'help composer keeps safe no-signal contract wording');
must(helpComposer, 'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya sözleşme üretim sinyali gerekir.', 'help composer keeps shift mismatch lead');
mustNotRaw(helpComposer, 'OperationProof', 'help composer avoids visible proof code');
mustNotRaw(helpComposer, 'JOB_TYPE_ENTITY_MISMATCH', 'help composer avoids visible mismatch code');
mustNot(helpComposer, 'Bu vardiyada ana engel', 'help composer avoids shift-only generic lead for contract flow');

must(golden, 'company-agreements-contract-today', 'golden pack keeps company agreements contract case');
must(golden, "expectedType: 'CONTRACT_TO_SHIFT'", 'golden pack reflects contract intent');
must(golden, 'room-agreements-contract-readiness', 'golden pack keeps room agreements case');
must(golden, "path: '/company/agreements'", 'golden pack keeps company agreements path');
must(golden, "path: '/room/agreements'", 'golden pack keeps room agreements path');
must(golden, 'Bu sözleşmeden bugün vardiya üretildi mi?', 'golden pack keeps contract question wording');

const { buildChatHelpResponse } = await import('../src/ai/chat/helpComposer.js');
const { detectQuestionIntent } = await import('../src/ai/chat/intentRouter.js');
const { getScreenDefinitionForUser, listScreensForUser } = await import('../src/ai/jobGuide/screenCatalog.js');

const user = { role: 'COMPANY', companyId: 1, companyKind: 'DEMO' };
const screen = listScreensForUser(user).find((row) => String(row?.path || '') === '/company/agreements');
if (!screen) fail('company agreements screen exists');

const screenDefinition = getScreenDefinitionForUser(user, screen, Number(screen.id));
const question = 'Bu sözleşmeden bugün vardiya üretildi mi?';

const intent = detectQuestionIntent(question, { entityType: 'screen', screenPath: screen.path, roleMode: 'OPERATIONS', originalMessage: question });
must(intent.questionType, 'CONTRACT_TO_SHIFT', 'question intent routes to contract-to-shift');
mustNot(intent.questionType, 'READINESS_CHECK', 'question intent no longer prefers readiness check');

const baseContext = {
  id: Number(screen.id),
  path: screen.path,
  label: screen.label,
  role: user.role,
  companyKind: user.companyKind,
};

const noSelection = buildChatHelpResponse({
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
  screenContext: baseContext,
  screenDefinition,
});

must(noSelection.reply, 'Şimdi:', 'no-selection reply keeps workflow lead');
must(noSelection.reply, 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.', 'no-selection reply keeps safe no-signal contract wording');
mustNot(noSelection.reply, 'Bunu anlayamadım', 'no-selection reply avoids unknown fallback');
mustNot(noSelection.reply, 'Bu vardiyada ana engel', 'no-selection reply avoids readiness-only wording');
mustNotRaw(noSelection.reply, 'contractShiftGeneration', 'no-selection reply avoids technical contract signal wording');
mustNotRaw(noSelection.reply, 'OperationProof', 'no-selection reply avoids technical proof wording');
must(noSelection.screenPath, '/company/agreements', 'no-selection reply keeps agreements screen path');
must(noSelection.screenLabel, screen.label, 'no-selection reply keeps agreements screen label');
mustArrayContains(noSelection.suggestedChips, 'İlgili sözleşmeyi aç', 'no-selection suggested chips keep contract chip');
mustArrayContains(noSelection.suggestedChips, 'Bugünkü vardiyaları göster', 'no-selection suggested chips keep shift chip');
mustArrayContains(noSelection.suggestedChips, 'Üretim geçmişini göster', 'no-selection suggested chips keep production history chip');
mustArrayContains(noSelection.suggestedChips, 'Üretim durumunu açıkla', 'no-selection suggested chips keep production status chip');
mustNot(JSON.stringify(noSelection.suggestedChips), 'Bunu sor', 'no-selection suggested chips avoid self-question prefix');
mustNot(JSON.stringify(noSelection.suggestedChips), 'Ekran rehberini aç', 'no-selection suggested chips avoid generic guide chip');
mustNot(JSON.stringify(noSelection.suggestedChips), 'Aynı kayıt için devam et', 'no-selection suggested chips avoid generic continuation chip');

const shiftSelected = buildChatHelpResponse({
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
    selectedEntityType: 'shift',
    selectedEntityId: 4102,
    selectedLabel: 'Vardiya #4102',
    selectedSummary: 'APPROVED',
    selectedFields: [
      { label: 'Durum', value: 'APPROVED' },
      { label: 'Readiness', value: 'READY' },
      { label: 'Araç', value: '20 ABC 123' },
      { label: 'Sürücü', value: 'Sürücü Demo' },
      { label: 'Durak', value: '5' },
    ],
    selectedBadges: [{ label: 'Sözleşme', value: 'Aktif' }],
  },
  screenContext: {
    ...baseContext,
    selectedEntityType: 'shift',
    selectedEntityId: 4102,
    selectedLabel: 'Vardiya #4102',
    selectedSummary: 'APPROVED',
    selectedFields: [
      { label: 'Durum', value: 'APPROVED' },
      { label: 'Readiness', value: 'READY' },
      { label: 'Araç', value: '20 ABC 123' },
      { label: 'Sürücü', value: 'Sürücü Demo' },
      { label: 'Durak', value: '5' },
    ],
    selectedBadges: [{ label: 'Sözleşme', value: 'Aktif' }],
  },
  screenDefinition,
});

must(shiftSelected.reply, 'Seçili kayıt bir vardiya', 'shift-selected reply mentions selected record mismatch');
mustNot(shiftSelected.reply, 'Bunu anlayamadım', 'shift-selected reply avoids unknown fallback');
mustNotRaw(shiftSelected.reply, 'contractShiftGeneration', 'shift-selected reply avoids technical contract signal wording');
mustNotRaw(shiftSelected.reply, 'OperationProof', 'shift-selected reply avoids technical proof wording');
must(shiftSelected.screenPath, '/company/agreements', 'shift-selected reply keeps agreements screen path');
must(shiftSelected.screenLabel, screen.label, 'shift-selected reply keeps agreements screen label');

console.log('=== COP-04A-FIX-02 CONTRACT GENERATION INTENT CHECK PASS ===');
