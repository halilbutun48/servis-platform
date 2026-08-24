#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildSuggestedChips } from '../src/ai/chat/intentRouter.js';
import {
  buildSeferAbiReasoningAssistant,
} from '../src/ai/chat/seferAbiReasoningAssistant.js';
import { normalizeCopilotRequestInput } from '../src/ai/schemas.js';
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from './lib/currentHeadScopePolicy.js';
import { mustDiffEmptyOrExactlyWithIdentity } from './lib/guardGitScope.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const CURRENT_HEAD_APPROVED_CONCURRENT_SERVICE_DIFF = CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) => path.startsWith('backend/src/services/'));

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

function arrayTextList(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
}

function assertExactList(actual, expected, label) {
  const got = arrayTextList(actual);
  const want = arrayTextList(expected);
  if (got.length !== want.length) {
    fail(`${label}: length ${got.length} !== ${want.length}`);
  }
  for (let index = 0; index < want.length; index += 1) {
    if (normalize(got[index]) !== normalize(want[index])) {
      fail(`${label}: item ${index + 1} mismatch (${got[index]} !== ${want[index]})`);
    }
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
  selectedRecordType = '',
  selectedRecordLabel = '',
  helpContextSummary = '',
  contextSummary = '',
  facts = {},
  firstStep = '',
  nextStep = '',
  selectedFields = [],
  selectedBadges = [],
  buttonGuides = [],
  simpleTerms = ['hakediş', 'route readiness', 'servis kanıtı'],
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
      buttonGuides: buttonGuides.length ? buttonGuides : [{ label: 'Takip', purpose: `${screenLabel} listesini açar.`, whenToUse: 'Kayıt görmek istediğinde.', whatHappens: `${screenLabel} listesi açılır.` }],
      simpleTerms,
    },
    screenContext: {
      path: screenPath,
      label: screenLabel,
      selectedSummary,
      selectedLabel,
      selectedRecordStatus,
      selectedRecordType,
      selectedRecordLabel,
      helpContextSummary,
      contextSummary,
      facts,
      selectedFields: selectedFields.length ? selectedFields : [
        { label: 'Durum', value: selectedRecordStatus },
        { label: 'Özet', value: selectedSummary },
      ],
      selectedBadges: selectedBadges.length ? selectedBadges : [{ label: 'Durum', value: selectedRecordStatus }],
      structuredFacts: {
        reasoningLead: `${screenLabel} için özet.`,
        nextBestAction: firstStep || 'İlk kartı aç.',
        selectedRecordStatus,
        selectedRecordType,
        selectedRecordLabel,
        facts,
      },
    },
  };
}

function buildHelpResponse({
  role = 'COMPANY',
  companyKind = '',
  roleMode = 'OPERATIONS',
  fixture,
  message,
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

function buildReasoningAssistant({
  role = 'COMPANY',
  companyKind = '',
  roleMode = 'OPERATIONS',
  fixture,
  message,
  conversationState = null,
  questionType = 'OPEN',
  guide = null,
  analysis = null,
  contextPriority = null,
  guidedTaskMeta = null,
  rawReply = 'Temel cevap.',
}) {
  const user = companyKind ? { role: 'COMPANY', companyKind } : { role };
  return buildSeferAbiReasoningAssistant({
    rawReply,
    message,
    questionType,
    replyMode: 'SHORT',
    guide: guide || {
      plainSummary: fixture?.screenDefinition?.summary || '',
      summary: fixture?.screenDefinition?.summary || '',
      screenExplanation: fixture?.screenDefinition?.screenExplanation || '',
      whatToDoNow: fixture?.screenContext?.structuredFacts?.nextBestAction || '',
      whatToDoNext: fixture?.screenContext?.structuredFacts?.nextBestAction || '',
      whyBlocked: '',
      doNotDo: '',
    },
    roleMode,
    userRole: user.role,
    user,
    screenPath: fixture?.screenDefinition?.path || '',
    screenDefinition: fixture?.screenDefinition || null,
    screenContext: fixture?.screenContext || null,
    analysis: analysis || {
      reasoningLead: fixture?.screenContext?.structuredFacts?.reasoningLead || '',
      nextBestAction: fixture?.screenContext?.structuredFacts?.nextBestAction || '',
      safestNextStep: fixture?.screenContext?.structuredFacts?.nextBestAction || '',
      selectedRecordStatus: fixture?.screenContext?.selectedRecordStatus || '',
      compareHint: '',
      blockers: [],
      missingData: [],
      evidence: [],
    },
    contextPriority: contextPriority || {
      summaryLead: fixture?.screenContext?.structuredFacts?.reasoningLead || '',
      bestNextAction: fixture?.screenContext?.structuredFacts?.nextBestAction || '',
      selectedRecordMismatchLead: fixture?.screenContext?.selectedRecordStatus || '',
      needsSelection: false,
      sameRecordLikely: true,
      roleBoundary: '',
      evidenceConfidence: '',
      activeTopic: '',
      activeTopicLabel: '',
      followUpPrompt: '',
    },
    conversationState,
    guidedTaskMeta,
    entityType: 'screen',
  });
}

function assertNormalizedRequest(message, label, {
  expectedIntent = 'CHAT_HELP',
  expectedEntityType = 'screen',
} = {}) {
  const normalized = normalizeCopilotRequestInput({ message });
  if (expectedIntent === null) {
    assert(!normalized.intent, `${label} keeps intent unset`);
  } else {
    assert(normalized.intent === expectedIntent, `${label} normalizes to ${expectedIntent}`);
  }
  if (expectedEntityType === null) {
    assert(!normalized.entityType, `${label} keeps entity type unset`);
  } else {
    assert(normalized.entityType === expectedEntityType, `${label} normalizes to ${expectedEntityType}`);
  }
  must(normalized.message, message, `${label} keeps typed message`);
  return normalized;
}

function assertReplyCase({
  label,
  role,
  companyKind = '',
  fixture,
  message,
  expectedQuestionType,
  expectedReasoningFamily = null,
  expectedReasoningMode = 'CONTEXTUAL_REASONING',
  replyNeedles = [],
  replyNotNeedles = [],
  payloadQuestionType = expectedQuestionType,
  payloadChips = null,
  payloadMustInclude = [],
  payloadMustNotInclude = [],
  conversationState = null,
  expectedNormalizedIntent = 'CHAT_HELP',
  expectedNormalizedEntityType = 'screen',
}) {
  const normalized = assertNormalizedRequest(message, label, {
    expectedIntent: expectedNormalizedIntent,
    expectedEntityType: expectedNormalizedEntityType,
  });
  const response = buildHelpResponse({
    role,
    companyKind,
    fixture,
    message: normalized.message,
    conversationState,
  });
  assert(response.questionType === expectedQuestionType, `${label} resolves to ${expectedQuestionType}`);
  assert(response.reasoningAssistant?.mode === expectedReasoningMode, `${label} reasoning mode stays ${expectedReasoningMode}`);
  if (expectedReasoningFamily) {
    assert(response.reasoningAssistant?.interactionIntentFamily === expectedReasoningFamily, `${label} reasoning family stays ${expectedReasoningFamily}`);
  }
  const replyText = expectedReasoningFamily === 'CONTINUE_FLOW'
    ? (response.reasoningAssistant?.reply || response.reply)
    : response.reply;
  for (const needle of replyNeedles) {
    must(replyText, needle, `${label} reply includes ${needle}`);
  }
  for (const needle of replyNotNeedles) {
    mustNot(replyText, needle, `${label} reply avoids ${needle}`);
  }
  if (payloadChips) {
    const chips = buildSuggestedChips({
      entityType: 'screen',
      questionType: payloadQuestionType,
      roleMode: 'OPERATIONS',
      screenPath: fixture?.screenDefinition?.path || '',
    });
    assertExactList(chips, payloadChips, `${label} chip payload matches`);
    for (const needle of payloadMustInclude) {
      must(chips.join(' | '), needle, `${label} chip payload includes ${needle}`);
    }
    for (const needle of payloadMustNotInclude) {
      mustNot(chips.join(' | '), needle, `${label} chip payload avoids ${needle}`);
    }
  }
  return response;
}

function assertTypedParityCase({
  label,
  role,
  companyKind = '',
  fixture,
  message,
  expectedQuestionType,
  conversationState = null,
  expectedReasoningFamily = null,
  expectedReasoningMode = 'CONTEXTUAL_REASONING',
  replyNeedles = [],
  replyNotNeedles = [],
}) {
  const response = buildHelpResponse({
    role,
    companyKind,
    fixture,
    message,
    conversationState,
  });
  assert(response.questionType === expectedQuestionType, `${label} typed message resolves to ${expectedQuestionType}`);
  assert(response.reasoningAssistant?.mode === expectedReasoningMode, `${label} reasoning mode stays ${expectedReasoningMode}`);
  if (expectedReasoningFamily) {
    assert(response.reasoningAssistant?.interactionIntentFamily === expectedReasoningFamily, `${label} reasoning family stays ${expectedReasoningFamily}`);
  }
  for (const needle of replyNeedles) {
    must(response.reply, needle, `${label} reply includes ${needle}`);
  }
  for (const needle of replyNotNeedles) {
    mustNot(response.reply, needle, `${label} reply avoids ${needle}`);
  }
  return response;
}

function assertContinueFlowCase({
  label,
  role,
  fixture,
  conversationState,
  message,
  expectedVisibleChips,
  expectedReasonChips,
}) {
  const response = buildHelpResponse({
    role,
    fixture,
    message,
    conversationState,
  });
  assert(response.questionType === 'NEXT_STEP', `${label} keeps NEXT_STEP on the visible surface`);
  assert(response.reasoningAssistant?.mode === 'CONTEXTUAL_REASONING', `${label} reasoning mode stays CONTEXTUAL_REASONING`);
  assert(response.reasoningAssistant?.interactionIntentFamily === 'CONTINUE_FLOW', `${label} reasoning family stays CONTINUE_FLOW`);
  const continueFlowReplyText = response.reasoningAssistant?.reply || response.reply;
  must(continueFlowReplyText, 'Vardiyalar akışından devam edelim', `${label} reply keeps the continue-flow wording`);
  must(continueFlowReplyText, 'Yeni vardiya oluşturuyorsan', `${label} reply keeps the new-vs-existing branch`);
  must(continueFlowReplyText, 'mevcut vardiyayı takip ediyorsan', `${label} reply keeps the existing-flow branch`);
  assertExactList(response.suggestedChips, expectedVisibleChips, `${label} visible chips stay surface-specific`);
  assertExactList(response.reasoningAssistant?.suggestedChips, expectedReasonChips, `${label} reasoning payload keeps continue-flow chips`);
  return response;
}

function assertClarifyingCase({
  label,
  role,
  fixture,
  message,
  expectedReplyNeedles,
  expectedChips,
}) {
  const assistant = buildReasoningAssistant({
    role,
    fixture,
    message,
    questionType: 'OPEN',
    contextPriority: {
      summaryLead: '',
      bestNextAction: '',
      selectedRecordMismatchLead: '',
      needsSelection: true,
      sameRecordLikely: false,
      roleBoundary: '',
      evidenceConfidence: '',
      activeTopic: '',
      activeTopicLabel: '',
      followUpPrompt: '',
    },
    analysis: {
      reasoningLead: '',
      nextBestAction: '',
      safestNextStep: '',
      selectedRecordStatus: '',
      compareHint: '',
      blockers: [],
      missingData: [],
      evidence: [],
    },
  });
  assert(assistant.mode === 'CLARIFYING_QUESTION', `${label} enters CLARIFYING_QUESTION mode`);
  assert(assistant.interactionIntentFamily === 'DEFAULT', `${label} clarifying family stays DEFAULT`);
  for (const needle of expectedReplyNeedles) {
    must(assistant.reply, needle, `${label} reply includes ${needle}`);
  }
  assertExactList(assistant.suggestedChips, expectedChips, `${label} clarifying payload chips stay stable`);
  return assistant;
}

function main() {
  console.log('=== AI-03B-SEMANTIC-VISIBLE-AUDIT-01 CHECK ===');

  const pkg = read('package.json');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:ai03bsemanticvisibleaudit01": "node backend/scripts/ai03b_semantic_visible_audit_01_check.js"', 'package.json exposes the AI-03B semantic visible audit');
  assertProductExtensionsOrder(['check:copilotreasoninganswercomposer01', 'check:ai03bparaphraseintentaudit01', 'check:ai03bsemanticvisibleaudit01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01'], 'product extensions registry order keeps semantic visible audit in the AI-03B lane', registryScripts);
  assertProductExtensionsOrder(['check:copilotreasoninganswercomposer01', 'check:ai03bparaphraseintentaudit01', 'check:ai03bsemanticvisibleaudit01', 'check:seferabireasoningassistant01', 'check:seferabiallrolesreasoningassistant01'], 'verify chain registry order keeps semantic visible audit in the AI-03B lane', registryScripts);
  must(harnessDoc, 'ai03b_semantic_visible_audit_01_check.js', 'script harness doc tracks the semantic visible audit file');
  must(harnessDoc, 'check:ai03bsemanticvisibleaudit01', 'script harness doc exposes the semantic visible audit command');

  const planCenterFixture = buildScreenFixture({
    path: '/company',
    label: 'Planlama Merkezi',
    menuPurpose: 'Planlama ve teklif hazırlığı için kullanılır.',
    screenExplanation: 'Planlama ve teklif hazırlığı için kullanılır.',
    summary: 'Planlama ve teklif hazırlığı için kullanılır.',
    selectedSummary: 'Planlama merkezinde seçili kayıt hazır.',
    selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
    firstStep: "Planlama Merkezi'ni aç.",
    nextStep: 'Vardiya ya da talebi oluştur.',
  });

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

  const shiftsFixture = buildScreenFixture({
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

  const roomShiftsFixture = buildScreenFixture({
    path: '/room/shifts',
    label: 'Oda Vardiyalar',
    menuPurpose: 'Oda vardiya planlama ve takip için kullanılır.',
    screenExplanation: 'Oda vardiya planlama ve takip için kullanılır.',
    summary: 'Oda vardiya planlama ve takip için kullanılır.',
    selectedSummary: 'Seçili oda vardiyası hazır.',
    selectedRecordStatus: 'Seçili oda vardiyası hazır.',
    firstStep: 'Oda vardiyasını seç.',
    nextStep: 'Risk ve önizleme kartını aç.',
  });

  const roomShiftsClarifyingFixture = {
    ...roomShiftsFixture,
    screenContext: {
      ...roomShiftsFixture.screenContext,
      selectedSummary: '',
      selectedLabel: '',
      selectedRecordStatus: '',
      selectedFields: [],
      selectedBadges: [],
      structuredFacts: {
        ...roomShiftsFixture.screenContext.structuredFacts,
        selectedRecordStatus: '',
        selectedRecordType: '',
        selectedRecordLabel: '',
      },
    },
  };

  const roomMapFixture = buildScreenFixture({
    path: '/room/map',
    label: 'Canlı Harita',
    menuPurpose: 'Canlı araç ve sürücü takibi için kullanılır.',
    screenExplanation: 'Canlı araç ve sürücü takibi için kullanılır.',
    summary: 'Canlı araç ve sürücü takibi için kullanılır.',
    selectedSummary: 'Araç 34ABC123 • Son GPS 1 dk • ETA 6 dk',
    selectedRecordStatus: 'Araç 34ABC123 • Son GPS 1 dk • ETA 6 dk',
    firstStep: 'Haritayı aç.',
    nextStep: 'Son GPS ve araç bağlantısını kontrol et.',
  });

  const personelFixture = buildScreenFixture({
    path: '/personel/live',
    label: 'Personel Canlı',
    menuPurpose: 'Personel servis durumu için kullanılır.',
    screenExplanation: 'Personel servis durumu için kullanılır.',
    summary: 'Personel servis durumu için kullanılır.',
    selectedSummary: 'Bugünkü servis 34ABC123 • Shift #1 • Son GPS 11dk • Sıradaki Durak A • ETA 3 dk',
    selectedLabel: 'Bugünkü servis',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    selectedRecordType: 'serviceRide',
    selectedRecordLabel: 'Bugünkü servis',
    helpContextSummary: 'Bugünkü servis 34ABC123 • Shift #1 • Son GPS 11dk • Sıradaki Durak A • ETA 3 dk',
    contextSummary: 'Personel canlı takip • Shift #1 • Araç 34ABC123 • GPS Çevrim Dışı • Son GPS: 11dk • Sıradaki: Durak A • ETA: 3dk • Rota km: 1.6km',
    facts: { vehicleCount: 1 },
    firstStep: 'Servis durumunu aç.',
    nextStep: 'Son GPS ve servis durumunu kontrol et.',
  });

  const driverFixture = buildScreenFixture({
    path: '/driver/map',
    label: 'Sürücü Harita',
    menuPurpose: 'Sürücü canlı harita için kullanılır.',
    screenExplanation: 'Sürücü canlı harita için kullanılır.',
    summary: 'Sürücü canlı harita için kullanılır.',
    selectedSummary: 'GPS güncel değil.',
    selectedRecordStatus: 'GPS güncel değil.',
    firstStep: 'Haritayı aç.',
    nextStep: 'Son GPS sinyalini kontrol et.',
  });

  const superAdminFixture = buildScreenFixture({
    path: '/superadmin/operations',
    label: 'Super Admin Operasyon',
    menuPurpose: 'Sistem ve operasyon bandını izlemek için kullanılır.',
    screenExplanation: 'Sistem ve operasyon bandını izlemek için kullanılır.',
    summary: 'Sistem ve operasyon bandını izlemek için kullanılır.',
    selectedSummary: 'Canlı durum • Riskler • Açık sorunlar',
    selectedRecordStatus: 'Canlı durum • Riskler • Açık sorunlar',
    firstStep: 'Canlı durum bandını aç.',
    nextStep: 'Risk ve açık sorunları kontrol et.',
  });

  const visibleCases = [
    {
      label: 'company plan purpose',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Bu ekran ne için?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['Planlama Merkezi', 'Yeni Plan Oluştur', 'Vardiyalar ekranında takip edersin'],
      replyNotNeedles: ['Sıradaki doğru işlem'],
      payloadQuestionType: 'SCREEN_PURPOSE',
      payloadChips: ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?', 'Bu rolde ne yapabilirim?'],
    },
    {
      label: 'company plan focus',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Bu ekranda neye bakmalıyım?',
      expectedQuestionType: 'SCREEN_FOCUS',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['şirket konumu', 'rota önizlemesine bak', 'Vardiyalar ekranında takip et'],
      payloadQuestionType: 'SCREEN_FOCUS',
      payloadChips: ['Konum kontrolü', 'Tarih / saat kontrolü', 'Personel ve duraklar', 'Rota önizlemesi'],
      expectedNormalizedIntent: null,
      expectedNormalizedEntityType: null,
    },
    {
      label: 'company plan risk',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Riskleri sırala',
      expectedQuestionType: 'RISK_LIST',
      expectedReasoningFamily: 'DEFAULT',
      replyNeedles: ['riskler', 'önce onu düzelt'],
      payloadQuestionType: 'RISK_LIST',
      payloadChips: ['Konum riski', 'Tarih / saat riski', 'Personel açığı', 'Rota önizleme riski'],
      expectedNormalizedIntent: null,
      expectedNormalizedEntityType: null,
    },
    {
      label: 'company next best action',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Sıradaki doğru işlem ne?',
      expectedQuestionType: 'NEXT_BEST_ACTION',
      expectedReasoningFamily: 'DEFAULT',
      replyNeedles: ['Planlama Merkezi', 'sıradaki doğru işlem', 'Yeni Plan Oluştur'],
      payloadQuestionType: 'NEXT_BEST_ACTION',
      payloadChips: ['Eksik konumu düzelt', 'Planı sürdür', 'Vardiyayı takip et', 'Teklif hazırlığı'],
    },
    {
      label: 'company operations next step',
      role: 'COMPANY',
      fixture: operationsFixture,
      message: 'Şimdi ne yapayım?',
      expectedQuestionType: 'NEXT_STEP',
      expectedReasoningFamily: 'DEFAULT',
      replyNeedles: ['Operasyon kartını aç', 'Bekleyen işleri kontrol et', 'İlgili kartı aç'],
      payloadQuestionType: 'NEXT_STEP',
      payloadChips: ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri', 'Yetki sınırı'],
    },
    {
      label: 'company shifts detail flow',
      role: 'COMPANY',
      fixture: shiftsFixture,
      message: 'Şimdi ne yapayım?',
      expectedQuestionType: 'DETAIL_FLOW',
      expectedReasoningFamily: 'DEFAULT',
      replyNeedles: ['Seçili kayıt', 'Vardiyalar için özet', 'Takip edeceğin vardiyayı seç'],
      payloadQuestionType: 'DETAIL_FLOW',
      payloadChips: ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?', 'Bu rolde ne yapabilirim?'],
    },
    {
      label: 'company opener negative',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Bu ekran, planlama merkezi içinde ne yapmam gerekiyor?',
      expectedQuestionType: 'PRODUCT_OVERVIEW_HELP',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['SeferPakt', 'Şirket rolünde', 'Planlama Merkezi'],
      replyNotNeedles: ['Sıradaki doğru işlem'],
      expectedNormalizedIntent: null,
      expectedNormalizedEntityType: null,
    },
    {
      label: 'room map purpose',
      role: 'ROOM',
      fixture: roomMapFixture,
      message: 'Bu ekran ne için?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['canlı araç ve sürücü takibi', 'Son konum bilgisini ve araç bağlantısını kontrol et'],
      payloadQuestionType: 'SCREEN_PURPOSE',
      payloadChips: ['Bu ekranı detaylı anlat', 'Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç', 'Bu rolde ne yapabilirim?'],
    },
    {
      label: 'room shifts risk list',
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'Riskleri sırala',
      expectedQuestionType: 'RISK_LIST',
      expectedReasoningFamily: 'DEFAULT',
      replyNeedles: ['Oda açısından', 'riskli alanı belirle', 'Sonra ilgili ekrana geç'],
      payloadQuestionType: 'RISK_LIST',
      payloadChips: ['Konum riski', 'Tarih / saat riski', 'Personel açığı', 'Rota önizleme riski'],
      expectedNormalizedIntent: null,
      expectedNormalizedEntityType: null,
    },
    {
      label: 'personel purpose',
      role: 'PERSONEL',
      fixture: personelFixture,
      message: 'Bu ekran ne için?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['personel servis durumunu', 'Servis durumunu aç', 'Son konum bilgisi ve servis durumunu kontrol et'],
      payloadQuestionType: 'SCREEN_PURPOSE',
      payloadChips: ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri', 'Bu rolde ne yapabilirim?'],
    },
    {
      label: 'personel next step',
      role: 'PERSONEL',
      fixture: personelFixture,
      message: 'Şimdi ne yapayım?',
      expectedQuestionType: 'NEXT_STEP',
      expectedReasoningFamily: 'DEFAULT',
      replyNeedles: ['Servis durumunu aç', 'Sade cevap', 'Mavi aktif sıradaki parçayı'],
      payloadQuestionType: 'NEXT_STEP',
      payloadChips: ['Araç nerede?', 'Son konum bilgisi ne zaman geldi?', 'Servis durumu ne?', 'Sürücünün telefonundan konum sinyali devrede mi?'],
    },
    {
      label: 'personel risk list',
      role: 'PERSONEL',
      fixture: personelFixture,
      message: 'Riskleri sırala',
      expectedQuestionType: 'RISK_LIST',
      expectedReasoningFamily: 'DEFAULT',
      replyNeedles: ['Servis durumunu aç', 'Personel Canlı'],
      payloadQuestionType: 'RISK_LIST',
      payloadChips: ['Konum riski', 'Tarih / saat riski', 'Personel açığı', 'Rota önizleme riski'],
      expectedNormalizedIntent: null,
      expectedNormalizedEntityType: null,
    },
    {
      label: 'super admin purpose',
      role: 'SUPER_ADMIN',
      fixture: superAdminFixture,
      message: 'Bu ekran ne için?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['sistem ve operasyon bandını izlemek', 'Canlı durum bandını aç', 'Risk ve açık sorunları kontrol et'],
      payloadQuestionType: 'SCREEN_PURPOSE',
      payloadChips: ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Bu rolde ne yapabilirim?'],
    },
    {
      label: 'super admin focus',
      role: 'SUPER_ADMIN',
      fixture: superAdminFixture,
      message: 'Bu ekranda neye bakmalıyım?',
      expectedQuestionType: 'SCREEN_FOCUS',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['canlı durum ve konum sinyali güven skorunu', 'ilk kontrolünü netleştirelim', 'Canlı durum ile konum sinyali güven skoru aynı şey değildir'],
      payloadQuestionType: 'SCREEN_FOCUS',
      payloadChips: ['Konum kontrolü', 'Tarih / saat kontrolü', 'Personel ve duraklar', 'Rota önizlemesi'],
      expectedNormalizedIntent: null,
      expectedNormalizedEntityType: null,
    },
    {
      label: 'driver purpose',
      role: 'DRIVER',
      fixture: driverFixture,
      message: 'Bu ekran ne için?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      expectedReasoningFamily: 'SCREEN_START',
      replyNeedles: ['sürücü canlı harita', 'Haritayı aç', 'Son konum bilgisini kontrol et'],
      payloadQuestionType: 'SCREEN_PURPOSE',
      payloadChips: ['Bu ekranı detaylı anlat', 'Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?'],
    },
  ];

  assert(visibleCases.length >= 15, '15+ visible semantic cases are covered');
  for (const testCase of visibleCases) {
    assertReplyCase(testCase);
  }

  const continueFlowAssistant = assertContinueFlowCase({
    label: 'continue flow assistant',
    role: 'COMPANY',
    fixture: shiftsFixture,
    message: 'devam et',
    conversationState: {
      lastQuestionType: 'NEXT_STEP',
      lastPrimaryConcern: 'Şimdi ne yapayım?',
      lastUserMessage: 'Şimdi ne yapayım?',
      lastRawUserMessage: 'Şimdi ne yapayım?',
      recentMessages: [
        { role: 'user', text: 'Şimdi ne yapayım?' },
        { role: 'assistant', text: '...' },
      ],
    },
    expectedVisibleChips: ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri', 'Yetki sınırı'],
    expectedReasonChips: ['Devam et', 'Sıradaki adımı göster', 'Neden takıldı?', 'Seçili kayıt özetini göster', 'Aynı kayıtta mı devam edelim?'],
  });

  const clarifyingAssistant = assertClarifyingCase({
    label: 'clarifying assistant',
    role: 'ROOM',
    fixture: roomShiftsClarifyingFixture,
    message: 'Hangi kayıt için bakayım?',
    expectedReplyNeedles: ['Netleştirelim', 'Hangi vardiya için bakayım', 'Alternatif:'],
    expectedChips: ['Hangi kayıt için bakayım? Araç, sürücü ya da operasyon kaydı mı?', 'Araç / sürücü', 'Kapasite', 'Kalite / risk', 'Operasyon kontrolü'],
  });

  const typedParityCases = [
    {
      label: 'company chip roundtrip location help',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Eksik konumu düzelt',
      expectedQuestionType: 'LOCATION_HELP',
      replyNeedles: ['Seçili kayıt', 'son konum bilgisi zamanını', 'araç bağlantısını', 'Sürücünün telefonundan konum sinyali'],
    },
    {
      label: 'company chip roundtrip excel preview',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Planı sürdür',
      expectedQuestionType: 'EXCEL_ROUTE_PREVIEW',
      replyNeedles: ['Doğrudan rota oluşturamam', 'Excel’den satırları yorumlayabilirim', 'Aynı vardiya akışını sürdürüyoruz'],
    },
    {
      label: 'company chip roundtrip detail flow',
      role: 'COMPANY',
      fixture: planCenterFixture,
      message: 'Vardiyayı takip et',
      expectedQuestionType: 'DETAIL_FLOW',
      replyNeedles: ['ana engel atama veya teklif tarafında', 'araç ve sürücü bağını tamamla', 'Sınır: Sadece hazırlık'],
    },
    {
      label: 'operations chip roundtrip purpose',
      role: 'COMPANY',
      fixture: operationsFixture,
      message: 'Açık talep var mı?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      replyNeedles: ['Planlama Merkezi ekranını kullanırsın', 'Yeni Plan Oluştur', 'Vardiyalar ekranında takip edersin'],
    },
    {
      label: 'operations chip roundtrip approval',
      role: 'COMPANY',
      fixture: operationsFixture,
      message: 'Kim onaylayacak?',
      expectedQuestionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
      replyNeedles: ['Bu rota için gerçek uygulama başlatamam', 'insan onayı gerekir', 'preview ve risk özeti'],
    },
    {
      label: 'operations chip roundtrip missing data',
      role: 'COMPANY',
      fixture: operationsFixture,
      message: 'Eksik veri',
      expectedQuestionType: 'MISSING_DATA_HELP',
      replyNeedles: ['Seçili operasyon kaydı hazır', 'Operasyon paneli karar yüzeyidir', 'Eksik veri'],
    },
    {
      label: 'company shifts chip roundtrip detail',
      role: 'COMPANY',
      fixture: shiftsFixture,
      message: 'Bu ekranı detaylı anlat',
      expectedQuestionType: 'DETAIL_FLOW',
      replyNeedles: ['Takip edeceğin vardiyayı seç', 'onaylı ile tam atama aynı şey değildir', 'Vardiya engeli'],
    },
    {
      label: 'company shifts chip roundtrip timing',
      role: 'COMPANY',
      fixture: shiftsFixture,
      message: 'Başlatma zamanı uygun mu?',
      expectedQuestionType: 'DETAIL_FLOW',
      replyNeedles: ['Takip edeceğin vardiyayı seç', 'Teklif göndermek mi, gelen teklifi incelemek mi, yoksa fiyat istemek mi istediğini netleştir', 'Sınır: Sadece hazırlık'],
    },
    {
      label: 'company shifts chip roundtrip link check',
      role: 'COMPANY',
      fixture: shiftsFixture,
      message: 'Araç/sürücü bağlantısını kontrol et',
      expectedQuestionType: 'SCREEN_PURPOSE',
      expectedReasoningMode: 'SAFE_REFUSAL_WITH_ALTERNATIVE',
      replyNeedles: ['Kaydet veritabanına yazar', 'büyük harita seçim modalını onaylar', 'teklifleri ve sözleşme hazırlığını kontrol et'],
    },
    {
      label: 'room shifts chip roundtrip location risk',
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'Konum riski',
      expectedQuestionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
      replyNeedles: ['Bu rota için gerçek uygulama başlatamam', 'risk özeti', 'insan onayı', 'preview'],
    },
    {
      label: 'room shifts chip roundtrip time risk',
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'Tarih / saat riski',
      expectedQuestionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
      replyNeedles: ['Bu rota için gerçek uygulama başlatamam', 'risk özeti', 'insan onayı', 'preview'],
    },
    {
      label: 'room shifts chip roundtrip personel gap',
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'Personel açığı',
      expectedQuestionType: 'IMPORT_WRITE_BLOCKED',
      replyNeedles: ['DB write', 'personel oluşturma', 'eksik kolonları', 'KVKK sınırını'],
    },
    {
      label: 'personel chip roundtrip detail flow',
      role: 'PERSONEL',
      fixture: personelFixture,
      message: 'Servis durumunu göster',
      expectedQuestionType: 'DETAIL_FLOW',
      replyNeedles: ['Servis durumunu aç', 'Personel Canlı'],
    },
    {
      label: 'personel chip roundtrip status source',
      role: 'PERSONEL',
      fixture: personelFixture,
      message: 'Bildirim kaynağı',
      expectedQuestionType: 'STATUS_HELP',
      replyNeedles: ['Bildirimin türünü ve zamanını incele', 'kritik bildirim', 'ilgili kayda veya ekrana geç'],
    },
    {
      label: 'personel chip roundtrip missing data',
      role: 'PERSONEL',
      fixture: personelFixture,
      message: 'Eksik veri',
      expectedQuestionType: 'MISSING_DATA_HELP',
      replyNeedles: ['Seçili kayıt: Durum: Kabul Edildi / onaylı', 'Servis durumunu aç', 'Mavi aktif sıradaki parçayı'],
    },
    {
      label: 'super admin chip roundtrip purpose',
      role: 'SUPER_ADMIN',
      fixture: superAdminFixture,
      message: 'Bu ekran ne için?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      replyNeedles: ['sistem', 'operasyon'],
    },
    {
      label: 'super admin chip roundtrip focus',
      role: 'SUPER_ADMIN',
      fixture: superAdminFixture,
      message: 'Bu ekranda neye bakmalıyım?',
      expectedQuestionType: 'SCREEN_FOCUS',
      replyNeedles: ['canlı durum', 'konum sinyali'],
    },
    {
      label: 'driver chip roundtrip purpose',
      role: 'DRIVER',
      fixture: driverFixture,
      message: 'Bu ekran ne için?',
      expectedQuestionType: 'SCREEN_PURPOSE',
      replyNeedles: ['sürücü', 'harita'],
    },
    {
      label: 'company follow-up typed continue flow',
      role: 'COMPANY',
      fixture: shiftsFixture,
      message: 'devam et',
      conversationState: {
        lastQuestionType: 'NEXT_STEP',
        lastPrimaryConcern: 'Şimdi ne yapayım?',
        lastUserMessage: 'Şimdi ne yapayım?',
        lastRawUserMessage: 'Şimdi ne yapayım?',
        recentMessages: [
          { role: 'user', text: 'Şimdi ne yapayım?' },
          { role: 'assistant', text: '...' },
        ],
      },
      expectedQuestionType: 'NEXT_STEP',
      expectedReasoningFamily: 'CONTINUE_FLOW',
      replyNeedles: ['Vardiyalar akışından devam edelim', 'Yeni vardiya oluşturuyorsan', 'mevcut vardiyayı takip ediyorsan'],
    },
  ];

  assert(typedParityCases.length >= 15, '15+ typed parity cases are covered');
  for (const testCase of typedParityCases) {
    assertTypedParityCase(testCase);
  }

  assert(continueFlowAssistant.questionType === 'NEXT_STEP', 'continue-flow assistant keeps the visible NEXT_STEP family');
  assert(continueFlowAssistant.reasoningAssistant?.interactionIntentFamily === 'CONTINUE_FLOW', 'continue-flow assistant keeps CONTINUE_FLOW intent family');
  assert(clarifyingAssistant.mode === 'CLARIFYING_QUESTION', 'clarifying assistant stays in CLARIFYING_QUESTION mode');

  mustDiffEmptyOrExactlyWithIdentity(
    ['backend/src/services', 'prisma'],
    CURRENT_HEAD_APPROVED_CONCURRENT_SERVICE_DIFF,
    'service/prisma diff stays empty'
  );
  assert(gitCachedNames().length === 0, 'stage stays empty');
  mustNoStagedPrefix(gitCachedNames(), ['backend/artifacts/runtime-data/', 'backend/artifacts/browser-smoke/'], 'runtime-data and browser-smoke stay commit-external');

  console.log('=== AI-03B-SEMANTIC-VISIBLE-AUDIT-01 CHECK PASS ===');
}

try {
  main();
} catch (err) {
  console.error(err?.stack || err?.message || err);
  process.exit(1);
}
