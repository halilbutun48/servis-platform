#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';
import { composeCopilotGuidedTaskEngineReply } from '../src/ai/chat/copilotGuidedTaskEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
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

function excerpt(text, limit = 220) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    ok(label);
    return;
  }
  fail(label);
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

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function containsAny(text, needles) {
  const haystack = normalize(text);
  return (Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalize(needle)));
}

function makeUser(role) {
  return { role };
}

function buildScreenFixture({
  path,
  label,
  menuPurpose = '',
  firstStep = '',
  nextStep = '',
  selectedLabel = '',
  selectedSummary = '',
  selectedRecordStatus = '',
  selectedEntityType = '',
  selectedEntityId = 0,
} = {}) {
  return {
    screenDefinition: {
      path,
      label,
      menuPurpose: menuPurpose || `${label} özeti`,
      screenExplanation: menuPurpose || `${label} özeti`,
      plainSummary: menuPurpose || `${label} özeti`,
      summary: menuPurpose || `${label} özeti`,
      firstStep,
      nextStep,
    },
    screenContext: {
      path,
      label,
      selectedLabel,
      selectedSummary,
      selectedRecordStatus,
      selectedEntityType,
      selectedEntityId,
      selectedFields: [
        { label: 'Durum', value: selectedRecordStatus || selectedSummary || selectedLabel },
        { label: 'Özet', value: selectedSummary || selectedLabel || selectedRecordStatus },
      ].filter((row) => Boolean(row.value)),
      selectedBadges: selectedRecordStatus ? [{ label: 'Durum', value: selectedRecordStatus }] : [],
      structuredFacts: {
        reasoningLead: menuPurpose || `${label} için özet.`,
        nextBestAction: nextStep || firstStep || 'İlk kontrolü aç.',
        selectedRecordStatus: selectedRecordStatus || selectedSummary || selectedLabel,
      },
    },
  };
}

function buildHelpReply({ role, fixture, message, conversationState = null }) {
  const user = makeUser(role);
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: Number(fixture?.screenContext?.selectedEntityId || 1) || 1,
    user,
    message,
    context: null,
    entityLabel: fixture?.screenContext?.label || '',
    scope: { roleMode: 'OPERATIONS', role },
    conversationState,
    screenContext: fixture?.screenContext || null,
    screenDefinition: fixture?.screenDefinition || null,
  });
}

function buildAssistantReply({
  role,
  fixture,
  message,
  questionType = 'NEXT_STEP',
  replyMode = 'SHORT',
  conversationState = null,
}) {
  const user = makeUser(role);
  const guide = {
    plainSummary: fixture?.screenDefinition?.menuPurpose || '',
    summary: fixture?.screenDefinition?.menuPurpose || '',
    screenExplanation: fixture?.screenDefinition?.menuPurpose || '',
    whatToDoNow: fixture?.screenDefinition?.firstStep || 'İlk kontrolü aç.',
    whatToDoNext: fixture?.screenDefinition?.nextStep || 'Sonraki adımı aç.',
    whyBlocked: '',
    doNotDo: '',
  };
  const analysis = {
    reasoningLead: fixture?.screenDefinition?.menuPurpose || '',
    nextBestAction: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
    safestNextStep: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
    blockers: [],
    missingData: [],
    evidence: [],
  };
  const contextPriority = {
    activeTopic: questionType,
    activeTopicLabel: fixture?.screenDefinition?.label || '',
    followUpPrompt: fixture?.screenDefinition?.nextStep || '',
    summaryLead: fixture?.screenDefinition?.menuPurpose || '',
    bestNextAction: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
    needsSelection: Boolean(fixture?.screenContext?.selectedLabel || fixture?.screenContext?.selectedSummary || fixture?.screenContext?.selectedRecordStatus),
  };
  return buildSeferAbiReasoningAssistant({
    rawReply: 'Aynı akışı sürdürüyorum.',
    message,
    questionType,
    replyMode,
    guide,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath: fixture?.screenDefinition?.path || '',
    screenDefinition: fixture?.screenDefinition || null,
    screenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
    sourceScreenContext: fixture?.screenContext || null,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  });
}

function buildGuidedReply({
  questionType = 'NEXT_STEP',
  message,
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  roleMode = 'OPERATIONS',
  userRole = 'COMPANY',
  screenPath = '',
  conversationState = null,
  contextPriority = null,
  entityType = 'screen',
}) {
  return composeCopilotGuidedTaskEngineReply({
    questionType,
    message,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    roleMode,
    userRole,
    screenPath,
    conversationState,
    contextPriority,
    entityType,
  });
}

function describeCase(testCase) {
  return `role=${testCase.role} screen=${testCase.fixture?.screenDefinition?.path || ''} question=${JSON.stringify(testCase.message)}`;
}

function failCase(testCase, expected, actual, questionType = '') {
  const questionTypeText = questionType ? ` questionType=${questionType}` : '';
  fail(`${testCase.label} ${describeCase(testCase)}${questionTypeText} expected=${expected} actual=${excerpt(actual)}`);
}

function assertContainsAll(testCase, actual, needles, questionType = '') {
  for (const needle of needles) {
    if (!contains(actual, needle)) {
      failCase(testCase, `contains ${needles.join(' / ')}`, actual, questionType);
    }
  }
}

function assertContainsAny(testCase, actual, needles, questionType = '') {
  if (!containsAny(actual, needles)) {
    failCase(testCase, `contains any ${needles.join(' / ')}`, actual, questionType);
  }
}

function assertNotContainsAny(testCase, actual, needles, questionType = '') {
  for (const needle of needles) {
    if (contains(actual, needle)) {
      failCase(testCase, `does not contain ${needles.join(' / ')}`, actual, questionType);
    }
  }
}

function assertQuestionTypeOneOf(testCase, actual, allowed, reply) {
  if (!allowed.includes(actual)) {
    failCase(testCase, `questionType in ${allowed.join(', ')}`, reply, actual || '');
  }
}

function runCase(testCase) {
  let result;
  if (testCase.kind === 'assistant') {
    result = buildAssistantReply(testCase);
  } else if (testCase.kind === 'guided') {
    result = buildGuidedReply(testCase);
  } else {
    result = buildHelpReply(testCase);
  }

  const reply = typeof result === 'string' ? result : String(result?.reply || '');
  const questionType = typeof result === 'string' ? '' : String(result?.questionType || '');

  if (Array.isArray(testCase.mustIncludeAll) && testCase.mustIncludeAll.length) {
    assertContainsAll(testCase, reply, testCase.mustIncludeAll, questionType);
  }
  if (Array.isArray(testCase.mustIncludeAny) && testCase.mustIncludeAny.length) {
    assertContainsAny(testCase, reply, testCase.mustIncludeAny, questionType);
  }
  if (Array.isArray(testCase.mustNotIncludeAny) && testCase.mustNotIncludeAny.length) {
    assertNotContainsAny(testCase, reply, testCase.mustNotIncludeAny, questionType);
  }
  if (Array.isArray(testCase.allowedQuestionTypes) && testCase.allowedQuestionTypes.length) {
    assertQuestionTypeOneOf(testCase, questionType, testCase.allowedQuestionTypes, reply);
  }
  return { reply, questionType };
}

const companyPlanFixture = buildScreenFixture({
  path: '/company/operations',
  label: 'Planlama Merkezi',
  menuPurpose: 'Planlama Merkezi yeni işi kurma ve vardiya planlama akışını yönetir.',
  firstStep: 'Plan bilgilerini kontrol et.',
  nextStep: 'Sıradaki işi aç.',
});

const companyPlanSelectedFixture = buildScreenFixture({
  path: '/company/operations',
  label: 'Planlama Merkezi',
  selectedLabel: 'Seçili plan',
  selectedSummary: 'Seçili plan hazır.',
  selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
  selectedEntityType: 'plan',
  selectedEntityId: 101,
  menuPurpose: 'Planlama Merkezi yeni işi kurma ve vardiya planlama akışını yönetir.',
  firstStep: 'Plan bilgilerini kontrol et.',
  nextStep: 'Sıradaki işi aç.',
});

const companyOffersFixture = buildScreenFixture({
  path: '/company/agreements',
  label: 'Teklifler',
  menuPurpose: 'Teklifleri fiyat, süre, risk ve sözleşme uygunluğu açısından karşılaştırır.',
  firstStep: 'Teklifleri incele.',
  nextStep: 'Teklifleri karşılaştır.',
});

const roomShiftsFixture = buildScreenFixture({
  path: '/room/shifts',
  label: 'Vardiyalar',
  menuPurpose: 'Vardiyalar ekranı mevcut vardiya ve operasyon akışını takip eder.',
  firstStep: 'Vardiya satırını aç.',
  nextStep: 'Araç ve sürücüyü kontrol et.',
});

const roomShiftsSelectedFixture = buildScreenFixture({
  path: '/room/shifts',
  label: 'Vardiyalar',
  selectedLabel: 'Seçili vardiya',
  selectedSummary: 'Seçili vardiya hazır.',
  selectedRecordStatus: 'Seçili vardiya hazır.',
  selectedEntityType: 'shift',
  selectedEntityId: 201,
  menuPurpose: 'Vardiyalar ekranı mevcut vardiya ve operasyon akışını takip eder.',
  firstStep: 'Vardiya satırını aç.',
  nextStep: 'Araç ve sürücüyü kontrol et.',
});

const personelLiveFixture = buildScreenFixture({
  path: '/personel/live',
  label: 'Personel Canlı',
  menuPurpose: 'Personel canlı ekranı servis durumu ve canlı takip sinyallerini gösterir.',
  firstStep: 'Servis durumunu aç.',
  nextStep: 'Biniş ve saat bilgisini kontrol et.',
});

const parentLiveFixture = buildScreenFixture({
  path: '/parent/live',
  label: 'Veli Canlı',
  menuPurpose: 'Veli canlı ekranı çocuğun servis konumu ve geliş saatini gösterir.',
  firstStep: 'Servis durumunu aç.',
  nextStep: 'Konum ve saat bilgisini kontrol et.',
});

const genericSelectedFixture = buildScreenFixture({
  path: '/superadmin',
  label: 'Genel Bakış',
  selectedLabel: 'Seçili kayıt',
  selectedSummary: 'Seçili kayıt hazır.',
  selectedRecordStatus: 'Seçili kayıt hazır.',
  selectedEntityType: 'record',
  selectedEntityId: 301,
  menuPurpose: 'Sistem özet ve denetim alanı.',
  firstStep: 'İlk kartı aç.',
  nextStep: 'Sonraki kartı aç.',
});

const genericBareFixture = buildScreenFixture({
  path: '/superadmin',
  label: 'Genel Bakış',
  menuPurpose: 'Sistem özet ve denetim alanı.',
  firstStep: 'İlk kartı aç.',
  nextStep: 'Sonraki kartı aç.',
});

const cases = [
  {
    kind: 'help',
    label: 'company-plan-ambiguous-how',
    role: 'COMPANY',
    fixture: companyPlanFixture,
    message: 'Bunu nasıl yapacağım?',
    mustIncludeAny: ['Bekleyen işleri kontrol et', 'Operasyon özetinde', 'açık veya riskli işleri'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['NEXT_STEP', 'NEXT_ACTION', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'company-plan-purpose',
    role: 'COMPANY',
    fixture: companyPlanFixture,
    message: 'Hangisini seçeyim?',
    mustIncludeAny: ['Planlama Merkezi', 'planlama merkezi', 'vardiya'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'company-plan-selected-bu-ne',
    role: 'COMPANY',
    fixture: companyPlanSelectedFixture,
    message: 'Bu ne?',
    mustIncludeAny: ['Planlama Merkezi', 'planlama merkezi', 'vardiya'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'company-plan-selected-clarify',
    role: 'COMPANY',
    fixture: companyPlanSelectedFixture,
    message: 'İlgili durumu sor',
    mustIncludeAll: ['Ekranın amacını mı, seçili kaydı mı netleştireyim?'],
    mustIncludeAny: ['Netleştirelim:', 'Alternatif:'],
  },
  {
    kind: 'help',
    label: 'company-plan-purpose',
    role: 'COMPANY',
    fixture: companyPlanFixture,
    message: 'Bu ekran ne işe yarar?',
    mustIncludeAny: ['Planlama Merkezi', 'planlama merkezi', 'vardiya'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'company-plan-next-step',
    role: 'COMPANY',
    fixture: companyPlanFixture,
    message: 'Şimdi ne yapayım?',
    mustIncludeAny: ['Şimdi', 'Sıradaki', 'sıradaki'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['NEXT_STEP', 'NEXT_BEST_ACTION'],
  },
  {
    kind: 'help',
    label: 'company-plan-detail',
    role: 'COMPANY',
    fixture: companyPlanFixture,
    message: 'Devamını anlat',
    mustIncludeAny: ['devam', 'Devam', 'aç'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['HOW_TO_HELP', 'DETAIL_FLOW'],
  },
  {
    kind: 'help',
    label: 'company-offers-compare',
    role: 'COMPANY',
    fixture: companyOffersFixture,
    message: 'Hangisini seçeyim?',
    mustIncludeAll: [
      'Teklifi hangi açıdan kıyaslayayım: fiyat, süre, risk veya sözleşme uygunluğu?',
    ],
    mustIncludeAny: ['Netleştirelim:', 'Alternatif:'],
  },
  {
    kind: 'help',
    label: 'company-offers-bu-ne',
    role: 'COMPANY',
    fixture: companyOffersFixture,
    message: 'Bu ne?',
    mustIncludeAny: ['Bu ekran, teklifleri', 'fiyat, süre, risk', 'sözleşme uygunluğu'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'room-shifts-start',
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Bunu başlatayım mı?',
    mustIncludeAny: ['Vardiyalar', 'vardiya', 'operasyon'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['DETAIL_FLOW', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'room-shifts-how',
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Bunu nasıl yapacağım?',
    mustIncludeAny: ['Vardiya engeli', 'ilk kontrol', 'Vardiyalar ekranı'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['NEXT_STEP', 'FIRST_CONTROL', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'room-shifts-selected-bu-ne',
    role: 'ROOM',
    fixture: roomShiftsSelectedFixture,
    message: 'Bu ne?',
    mustIncludeAll: ['Ekranın amacını mı, seçili kaydı mı netleştireyim?'],
    mustIncludeAny: ['Netleştirelim:', 'Alternatif:'],
  },
  {
    kind: 'help',
    label: 'room-shifts-purpose',
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Bu ekran ne işe yarar?',
    mustIncludeAny: ['Vardiyalar', 'vardiya', 'operasyon'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'room-shifts-next-step',
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Şimdi ne yapayım?',
    mustIncludeAny: ['Şimdi', 'Sıradaki', 'sıradaki'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['NEXT_STEP', 'FIRST_CONTROL'],
  },
  {
    kind: 'help',
    label: 'personel-live-niye-yok',
    role: 'PERSONEL',
    fixture: personelLiveFixture,
    message: 'Niye yok?',
    mustIncludeAny: ['Personel Canlı', 'servis durumu', 'canlı takip'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'personel-live-bu-ne',
    role: 'PERSONEL',
    fixture: personelLiveFixture,
    message: 'Bu ne?',
    mustIncludeAny: ['Personel Canlı', 'servis durumu', 'canlı takip'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'personel-live-purpose',
    role: 'PERSONEL',
    fixture: personelLiveFixture,
    message: 'Bu ekran ne işe yarar?',
    mustIncludeAny: ['Son konum bilgisi', 'Sürücünün telefonundan konum sinyali', 'servis durumunu'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP', 'DETAIL_FLOW'],
  },
  {
    kind: 'help',
    label: 'parent-live-gelmedi',
    role: 'PARENT',
    fixture: parentLiveFixture,
    message: 'Gelmedi mi?',
    mustIncludeAny: ['Son konum bilgisi', 'araç bağlantısı', 'tahmini varış süresi'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'parent-live-bu-ne',
    role: 'PARENT',
    fixture: parentLiveFixture,
    message: 'Bu ne?',
    mustIncludeAny: ['Bu ekranda öğrencinin servisine ait seçili canlı bilgi net görünmüyor', 'Servis görünmüyorsa son konum bilgisi, araç bağlantısı ve tahmini varışı kontrol et'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'help',
    label: 'parent-live-purpose',
    role: 'PARENT',
    fixture: parentLiveFixture,
    message: 'Bu ekran ne işe yarar?',
    mustIncludeAny: ['öğrenci servis durumunu güvenli biçimde izlemek için kullanılır', 'Son konum bilgisi', 'Servis saati'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP', 'DETAIL_FLOW'],
  },
  {
    kind: 'help',
    label: 'generic-selected-bu-ne',
    role: 'SUPER_ADMIN',
    fixture: genericSelectedFixture,
    message: 'Bu ne?',
    mustIncludeAll: ['Ekranın amacını mı, seçili kaydı mı netleştireyim?'],
    mustIncludeAny: ['Netleştirelim:', 'Alternatif:'],
  },
  {
    kind: 'help',
    label: 'generic-selected-select',
    role: 'SUPER_ADMIN',
    fixture: genericSelectedFixture,
    message: 'Hangisini seçeyim?',
    mustIncludeAll: ['Ekranın amacını mı, seçili kaydı mı netleştireyim?'],
    mustIncludeAny: ['Netleştirelim:', 'Alternatif:'],
  },
  {
    kind: 'help',
    label: 'generic-no-selection-hangi-kayit',
    role: 'SUPER_ADMIN',
    fixture: genericBareFixture,
    message: 'Hangi kayıt için bakayım?',
    mustIncludeAny: ['Hangi kayıt', 'audit', 'risk'],
    mustIncludeAll: ['Netleştirelim:', 'Alternatif:'],
  },
  {
    kind: 'help',
    label: 'generic-no-selection-bu-ne',
    role: 'SUPER_ADMIN',
    fixture: genericBareFixture,
    message: 'Bu ne?',
    mustIncludeAny: ['Sistem durumu bandını', 'Ödeme, hakediş', 'sahaya çıkış'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:', 'Ekranın amacını mı, seçili kaydı mı netleştireyim?'],
    allowedQuestionTypes: ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'],
  },
  {
    kind: 'assistant',
    label: 'assistant-company-how',
    role: 'COMPANY',
    fixture: companyPlanFixture,
    message: 'Bunu nasıl yapacağım?',
    questionType: 'HOW_TO_HELP',
    mustIncludeAny: ['Aynı akışı sürdürüyorum'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['HOW_TO_HELP'],
  },
  {
    kind: 'assistant',
    label: 'assistant-company-selected-bu-ne',
    role: 'COMPANY',
    fixture: companyPlanSelectedFixture,
    message: 'Bu ne?',
    questionType: 'SCREEN_PURPOSE',
    mustIncludeAll: [
      'Bu ekran, Planlama Merkezi yeni işi kurma ve vardiya planlama akışını yönetir.',
      'Seçili kayıt: Planlama merkezinde seçili kayıt hazır.',
      'Sıradaki işi aç.',
      'Aynı akışı sürdürüyorum.',
    ],
  },
  {
    kind: 'assistant',
    label: 'assistant-room-start',
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Bunu başlatayım mı?',
    questionType: 'NEXT_STEP',
    mustIncludeAny: ['Oda açısından', 'Vardiyalar ekranı', 'Araç ve sürücüyü kontrol et', 'Aynı akışı sürdürüyorum'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
    allowedQuestionTypes: ['NEXT_STEP'],
  },
  {
    kind: 'assistant',
    label: 'assistant-personel-niye-yok',
    role: 'PERSONEL',
    fixture: personelLiveFixture,
    message: 'Niye yok?',
    questionType: 'WHY_BLOCKED',
    mustIncludeAll: [
      'Netleştirelim:',
      'Hangi servis kaydı için bakayım',
      'servis mi, araç mı, yoksa durak / saat bilgisi mi?',
      'Alternatif:',
    ],
  },
  {
    kind: 'assistant',
    label: 'assistant-parent-gelmedi',
    role: 'PARENT',
    fixture: parentLiveFixture,
    message: 'Gelmedi mi?',
    questionType: 'LOCATION_HELP',
    mustIncludeAll: [
      'Netleştirelim:',
      'Hangi öğrenci servisi için bakayım',
      'servisin konumunu mu, geliş saatini mi, yoksa bağlı vardiyayı mı?',
      'Alternatif:',
    ],
  },
  {
    kind: 'assistant',
    label: 'assistant-offers-select',
    role: 'COMPANY',
    fixture: companyOffersFixture,
    message: 'Hangisini seçeyim?',
    questionType: 'NEXT_STEP',
    mustIncludeAll: [
      'Netleştirelim:',
      'Teklifi hangi açıdan kıyaslayayım: fiyat, süre, risk veya sözleşme uygunluğu?',
      'Alternatif:',
    ],
  },
  {
    kind: 'guided',
    label: 'guided-excel-route-prep',
    role: 'COMPANY',
    fixture: companyOffersFixture,
    message: 'Excel attım rota çıkar.',
    mustIncludeAll: ['Doğrudan rota oluşturamam', 'otomatik import', 'route apply'],
  },
  {
    kind: 'guided',
    label: 'guided-shift-flow-clarify',
    role: 'COMPANY',
    fixture: roomShiftsFixture,
    message: 'Vardiya oluşturmak mı istiyorsun, yoksa mevcut vardiyaları incelemek mi?',
    mustIncludeAll: ['Bu rota için gerçek uygulama başlatamam', 'insan onayı'],
    mustNotIncludeAny: ['Netleştirelim:', 'Alternatif:'],
  },
  {
    kind: 'guided',
    label: 'guided-fake-success-blocked',
    role: 'COMPANY',
    fixture: companyPlanFixture,
    message: 'Yaptım de.',
    questionType: 'FAKE_SUCCESS_REQUEST_BLOCKED',
    mustIncludeAll: ['Yapmış gibi söyleyemem', 'Sahte başarı'],
  },
  {
    kind: 'guided',
    label: 'guided-route-review-human-approval',
    role: 'ROOM',
    fixture: roomShiftsFixture,
    message: 'Rota uygula',
    questionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    mustIncludeAll: ['Bu rota için gerçek uygulama başlatamam', 'insan onayı'],
  },
];

function main() {
  console.log('=== COPILOT CLARIFYING QUESTION ENGINE 01 ===');
  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const doc = read('docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const assistantSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const guidedSource = read('backend/src/ai/chat/copilotGuidedTaskEngine.js');
  const responsesSource = read('backend/src/ai/chat/conversationTaskStateResponses.js');

  must(pkg, '"check:copilotclarifyingquestionengine01": "node backend/scripts/copilot_clarifying_question_engine_01_check.js"', 'package.json exposes clarifying question engine check');
  ordered(runner, ['check:copilotguidedtaskengine01', 'check:copilotclarifyingquestionengine01', 'check:copilotreasoninganswercomposer01'], 'product extensions runner places clarifying question engine after guided task engine');
  ordered(verify, ['check:copilotguidedtaskengine01', 'check:copilotclarifyingquestionengine01', 'check:copilotreasoninganswercomposer01'], 'verify chain places clarifying question engine after guided task engine');
  must(guide, 'COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'script guide mentions clarifying question engine milestone');
  must(guide, 'check:copilotclarifyingquestionengine01', 'script guide exposes clarifying question engine check');
  must(guide, 'docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md', 'script guide includes clarifying question engine doc');
  must(guide, 'backend/src/ai/chat/conversationTaskStateResponses.js', 'script guide includes clarifying question engine helper');
  must(primer, 'COPILOT-CLARIFYING-QUESTION-ENGINE-01', 'primer mentions clarifying question engine milestone');
  must(primer, 'check:copilotclarifyingquestionengine01', 'primer exposes clarifying question engine check');
  must(primer, 'docs/COPILOT_CLARIFYING_QUESTION_ENGINE_01.md', 'primer links clarifying question engine doc');
  must(primer, 'backend/src/ai/chat/conversationTaskStateResponses.js', 'primer links clarifying question engine helper');
  must(doc, '# COPILOT CLARIFYING QUESTION ENGINE 01', 'clarifying question engine doc title present');
  must(doc, 'Canonical check: `check:copilotclarifyingquestionengine01`', 'clarifying question engine doc keeps canonical check wording');
  must(doc, 'conversationTaskStateResponses.js', 'clarifying question engine doc mentions canonical helper');
  must(doc, 'helpComposer.js', 'clarifying question engine doc mentions help composer');
  must(doc, 'seferAbiReasoningAssistant.js', 'clarifying question engine doc mentions reasoning assistant');
  must(doc, 'copilotGuidedTaskEngine.js', 'clarifying question engine doc mentions guided task engine');
  must(doc, 'Netleştirelim', 'clarifying question engine doc keeps clarifying phrasing');
  must(doc, 'Alternatif', 'clarifying question engine doc keeps alternative phrasing');
  must(harnessDoc, 'Copilot clarifying question engine milestone: `COPILOT-CLARIFYING-QUESTION-ENGINE-01`', 'harness doc lists clarifying question engine milestone');
  must(harnessDoc, 'root:check:copilotclarifyingquestionengine01', 'harness doc lists clarifying question engine root check');
  must(harnessDoc, 'copilot_clarifying_question_engine_01_check.js', 'harness doc lists clarifying question engine check file');
  must(harnessDoc, 'backend/src/ai/chat/conversationTaskStateResponses.js', 'harness doc lists clarifying question engine helper');
  must(helpComposerSource, 'buildClarifyingQuestionReplyImpl', 'help composer uses shared clarifying reply helper');
  must(assistantSource, 'resolveClarifyingQuestionText', 'reasoning assistant uses shared clarifying resolver');
  must(guidedSource, 'composeCopilotGuidedTaskEngineReply', 'guided task engine source remains available');
  must(responsesSource, 'createConversationTaskStateResponses', 'conversation task state responses facade is canonical');

  if (cases.length < 30) fail(`Expected at least 30 cases, got ${cases.length}`);

  for (const [index, testCase] of cases.entries()) {
    const result = runCase(testCase);
    ok(`${String(index + 1).padStart(2, '0')}/${cases.length} ${testCase.label}`);
    if (testCase.allowedQuestionTypes && testCase.allowedQuestionTypes.length) {
      assertQuestionTypeOneOf(testCase, result.questionType, testCase.allowedQuestionTypes, result.reply);
    }
  }

  console.log(`PASS COPILOT-CLARIFYING-QUESTION-ENGINE-01 (${cases.length} cases)`);
}

Promise.resolve(main()).catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
