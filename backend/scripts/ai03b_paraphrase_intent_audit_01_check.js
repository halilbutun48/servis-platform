#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildSuggestedChips } from '../src/ai/chat/intentRouter.js';
import { normalizeCopilotRequestInput } from '../src/ai/schemas.js';

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

function assert(condition, label) {
  if (!condition) fail(label);
  ok(label);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function gitDiffNames(paths) {
  const out = execFileSync('git', ['diff', '--name-only', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitCachedNames() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return String(out || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  if (files.length > 0) fail(`${label}: ${files.join(', ')}`);
  ok(label);
}

function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalize(name).startsWith(normalize(prefix))));
  if (hits.length > 0) fail(`${label}: ${hits.join(', ')}`);
  ok(label);
}

function buildScreenFixture({
  path: screenPath,
  label: screenLabel,
  menuPurpose = `${screenLabel} özeti`,
  screenExplanation = menuPurpose,
  summary = menuPurpose,
  selectedSummary = 'Seçili kayıt hazır.',
  selectedLabel = 'Seçili kayıt',
  selectedRecordStatus = 'Seçili kayıt hazır.',
  firstStep = '',
  nextStep = '',
  selectedFields = [],
  selectedBadges = [],
} = {}) {
  return {
    screenDefinition: {
      path: screenPath,
      label: screenLabel,
      menuPurpose,
      screenExplanation,
      plainSummary: summary,
      summary,
      firstStep,
      nextStep,
      screenMenus: [{ label: 'Takip', path: screenPath, purpose: `${screenLabel} ekranını açar.` }],
      buttonGuides: [{ label: 'Takip', purpose: `${screenLabel} listesini açar.`, whenToUse: 'Kayıt görmek istediğinde.', whatHappens: `${screenLabel} listesi açılır.` }],
      simpleTerms: ['hakediş', 'route readiness', 'servis kanıtı'],
    },
    screenContext: {
      path: screenPath,
      label: screenLabel,
      selectedSummary,
      selectedLabel,
      selectedRecordStatus,
      selectedFields: selectedFields.length ? selectedFields : [
        { label: 'Durum', value: selectedRecordStatus },
        { label: 'Özet', value: selectedSummary },
      ],
      selectedBadges: selectedBadges.length ? selectedBadges : [{ label: 'Durum', value: selectedRecordStatus }],
      structuredFacts: {
        reasoningLead: `${screenLabel} için özet.`,
        nextBestAction: firstStep || 'İlk kartı aç.',
        selectedRecordStatus,
      },
    },
  };
}

function buildHelpResponse({
  message,
  role = 'COMPANY',
  companyKind = '',
  roleMode = 'OPERATIONS',
  fixture,
  conversationState = null,
}) {
  const user = companyKind ? { role: 'COMPANY', companyKind } : { role };
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user,
    message,
    context: null,
    entityLabel: fixture?.screenContext?.label || '',
    scope: { roleMode, role },
    conversationState,
    screenContext: fixture?.screenContext || null,
    screenDefinition: fixture?.screenDefinition || null,
  });
}

function assertNormalizedRequest(message, label) {
  const normalized = normalizeCopilotRequestInput({ message });
  assert(normalized.intent === 'CHAT_HELP', `${label} normalizes to CHAT_HELP`);
  assert(normalized.entityType === 'screen', `${label} normalizes to screen entity`);
  must(normalized.message, message, `${label} keeps the typed text`);
  return normalized;
}

function assertPlanCenterNextBestAction(message, fixture, label) {
  const normalized = assertNormalizedRequest(message, label);
  const response = buildHelpResponse({ message: normalized.message, fixture });
  assert(response.questionType === 'NEXT_BEST_ACTION', `${label} resolves to NEXT_BEST_ACTION`);
  must(response.reply, 'Planlama Merkezi', `${label} names the planning center`);
  must(response.reply, 'Sıradaki doğru işlem', `${label} stays in the next-best-action lane`);
  mustNot(response.reply, 'Bu ekran, planlama merkezi içinde', `${label} avoids the screen-purpose fallback`);
  return response;
}

function main() {
  console.log('=== AI-03B-PARAPHRASE-INTENT-AUDIT-01 CHECK ===');

  const pkg = read('package.json');
  const nextBestActionChips = buildSuggestedChips({ entityType: 'screen', questionType: 'NEXT_BEST_ACTION', roleMode: 'OPERATIONS', screenPath: '/company' });
  const screenPurposeChips = buildSuggestedChips({ entityType: 'screen', questionType: 'SCREEN_PURPOSE', roleMode: 'OPERATIONS', screenPath: '/company' });
  const riskChips = buildSuggestedChips({ entityType: 'screen', questionType: 'RISK_LIST', roleMode: 'OPERATIONS', screenPath: '/company' });

  must(pkg, '"check:ai03bparaphraseintentaudit01": "node backend/scripts/ai03b_paraphrase_intent_audit_01_check.js"', 'package.json exposes the AI-03B paraphrase audit');

  const planCenterFixture = {
    screenDefinition: {
      path: '/company',
      label: 'Planlama Merkezi',
      menuPurpose: 'Planlama ve teklif hazırlığı için kullanılır.',
      screenExplanation: 'Planlama ve teklif hazırlığı için kullanılır.',
      plainSummary: 'Planlama ve teklif hazırlığı için kullanılır.',
      summary: 'Planlama ve teklif hazırlığı için kullanılır.',
      firstStep: 'Planlama Merkezi\'ni aç.',
      nextStep: 'Vardiya ya da talebi oluştur.',
    },
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
      selectedLabel: 'Seçili kayıt',
      selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
    },
  };

  const nextBestActionCases = [
    'Sıradaki doğru işlem ne?',
    'Şimdi ne yapayım?',
    'Nereden devam edeyim?',
    'Hangi adıma geçeceğim?',
    'Bundan sonra ne yapmalıyım?',
    'Devamında ne var?',
    'Burada sıradaki adım hangisi?',
    'Ne ile başlamalıyım?',
    'Bir sonraki adım ne?',
    'Burada önce neyi tamamlayayım?',
    'Bu kayıt için ne yapmam gerekiyor?',
    'Sırada hangi işlem var?',
    'Burada devam etmek için ne eksik?',
    'Sonra ne olacak?',
    'Şimdi hangi butona basacağım?',
    'İş akışında sıradaki adım nedir?',
  ];

  assert(nextBestActionCases.length === 16, '16 next-best-action paraphrases are covered');
  for (const message of nextBestActionCases) {
    assertPlanCenterNextBestAction(message, planCenterFixture, message);
  }

  const chipPayloadResponse = assertPlanCenterNextBestAction('Sıradaki doğru işlem ne?', planCenterFixture, 'chip payload control');
  const typedPromptResponse = assertPlanCenterNextBestAction('Nereden devam edeyim?', planCenterFixture, 'typed paraphrase control');
  assert(chipPayloadResponse.questionType === typedPromptResponse.questionType, 'chip payload and typed message resolve to the same intent family');
  ordered(nextBestActionChips.join(' | '), ['Planı sürdür', 'Vardiyayı takip et', 'Teklif hazırlığı'], 'next-best-action chips stay action oriented');
  mustNot(nextBestActionChips.join(' | '), 'Bu ekranı detaylı anlat', 'next-best-action chips do not fall back to screen-purpose wording');
  assert(Array.isArray(screenPurposeChips) && screenPurposeChips.length > 0, 'screen-purpose chips are available');
  assert(Array.isArray(riskChips) && riskChips.length > 0, 'risk-list chips are available');

  const screenFocusResponse = buildHelpResponse({
    message: 'Bu ekranda neye bakmalıyım?',
    fixture: planCenterFixture,
  });
  assert(screenFocusResponse.questionType === 'SCREEN_FOCUS', 'screen-focus question stays in SCREEN_FOCUS');
  mustNot(screenFocusResponse.reply, 'Sıradaki doğru işlem', 'screen-focus reply does not drift into next-best-action');

  const screenPurposeResponse = buildHelpResponse({
    message: 'Bu ekran ne işe yarıyor?',
    fixture: planCenterFixture,
  });
  assert(['SCREEN_EXPLANATION_HELP', 'SCREEN_PURPOSE'].includes(String(screenPurposeResponse.questionType || '')), 'screen-purpose question stays in the screen-purpose family');
  mustNot(screenPurposeResponse.reply, 'Sıradaki doğru işlem', 'screen-purpose reply does not drift into next-best-action');

  const riskResponse = buildHelpResponse({
    message: 'Riskleri sırala',
    fixture: planCenterFixture,
  });
  assert(riskResponse.questionType === 'RISK_LIST', 'risk question stays in RISK_LIST');
  mustNot(riskResponse.reply, 'Sıradaki doğru işlem', 'risk reply does not drift into next-best-action');

  const howToFixture = buildScreenFixture({
    path: '/company/shifts',
    label: 'Vardiyalar',
    menuPurpose: 'Vardiya planlama ve takip için kullanılır.',
    screenExplanation: 'Vardiya planlama ve takip için kullanılır.',
    summary: 'Vardiya planlama ve takip için kullanılır.',
    selectedSummary: 'Seçili vardiya hazır.',
    selectedRecordStatus: 'Seçili vardiya hazır.',
    firstStep: 'Takip edeceğin vardiyayı seç.',
    nextStep: 'Teklif, detay veya önizlemeyi aç.',
  });

  const howToResponse = buildHelpResponse({
    message: 'Vardiya nasıl oluşturulur?',
    fixture: howToFixture,
  });
  assert(howToResponse.questionType === 'HOW_TO_HELP', 'how-to question stays in HOW_TO_HELP');
  must(howToResponse.reply, 'Planlama Merkezi', 'how-to reply still explains the planning flow');

  const continueResponse = buildHelpResponse({
    message: 'Devamını anlat',
    fixture: howToFixture,
    conversationState: {
      lastQuestionType: howToResponse.questionType,
      lastPrimaryConcern: 'Vardiya nasıl oluşturulur?',
      lastUserMessage: 'Vardiya nasıl oluşturulur?',
      lastRawUserMessage: 'Vardiya nasıl oluşturulur?',
      recentMessages: [
        { role: 'user', text: 'Vardiya nasıl oluşturulur?' },
        { role: 'assistant', text: howToResponse.reply },
      ],
    },
  });
  assert(continueResponse.questionType === 'HOW_TO_HELP', 'continue flow keeps the detail family');
  mustNot(continueResponse.reply, 'Bu ekran,', 'continue reply avoids screen-purpose fallback');
  must(continueResponse.reply, 'Planlama Merkezi', 'continue reply keeps the planning flow');

  const clarifyResponse = buildHelpResponse({
    message: 'Eksik bilgi ne?',
    fixture: planCenterFixture,
  });
  assert(clarifyResponse.questionType === 'WHY_BLOCKED', 'clarify-style question stays in WHY_BLOCKED');
  mustNot(clarifyResponse.reply, 'Sıradaki doğru işlem', 'clarify reply does not drift into next-best-action');

  const operationsFixture = buildScreenFixture({
    path: '/company/operations',
    label: 'Operasyon Paneli',
    menuPurpose: 'Operasyon takibi için kullanılır.',
    screenExplanation: 'Operasyon takibi için kullanılır.',
    summary: 'Operasyon takibi için kullanılır.',
    selectedSummary: 'Seçili operasyon kaydı hazır.',
    selectedRecordStatus: 'Seçili operasyon kaydı hazır.',
    firstStep: 'Operasyon kartını aç.',
    nextStep: 'Bekleyen işi kontrol et.',
  });
  const operationsResponse = buildHelpResponse({
    message: 'Şimdi ne yapayım?',
    fixture: operationsFixture,
  });
  assert(operationsResponse.questionType === 'NEXT_STEP', '/company/operations keeps NEXT_STEP for "Şimdi ne yapayım?"');

  const shiftsResponse = buildHelpResponse({
    message: 'Şimdi ne yapayım?',
    fixture: howToFixture,
  });
  assert(shiftsResponse.questionType === 'DETAIL_FLOW', '/company/shifts keeps DETAIL_FLOW for "Şimdi ne yapayım?"');

  mustNoDiff(['backend/src/services', 'prisma'], 'service/prisma diff stays empty');
  assert(gitCachedNames().length === 0, 'stage stays empty');
  mustNoStagedPrefix(gitCachedNames(), ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  console.log('=== AI-03B-PARAPHRASE-INTENT-AUDIT-01 CHECK PASS ===');
}

try {
  main();
} catch (err) {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
}
