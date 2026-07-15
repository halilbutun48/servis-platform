#!/usr/bin/env node

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { workflowActionSpec, workflowTopicChipSet } from '../src/ai/chat/answerQualityPolicy.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { buildRootCauseState, looksLikeRootCauseQuestion } from '../src/ai/chat/conversationRootCauseEngine.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';

let passCount = 0;
let failCount = 0;
const failures = [];

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

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function containsAny(text, needles = []) {
  const haystack = normalize(text);
  return (Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalize(needle)));
}

function must(condition, label) {
  if (!condition) throw new Error(label);
}

function mustEqual(actual, expected, label) {
  const values = Array.isArray(expected) ? expected : [expected];
  must(values.some((item) => normalize(actual) === normalize(item)), `${label} expected=${values.join(' / ')} actual=${String(actual || '')}`);
}

function mustInclude(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  for (const needle of list) {
    must(contains(text, needle), `${label} missing=${needle}`);
  }
}

function mustIncludeAny(text, needles, label) {
  must(containsAny(text, needles), `${label} missing any of ${Array.isArray(needles) ? needles.join(' / ') : String(needles || '')}`);
}

function mustHaveText(value, label) {
  must(String(value || '').trim().length > 0, `${label} expected non-empty text`);
}

function mustNotInclude(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  for (const needle of list) {
    must(!contains(text, needle), `${label} unexpected=${needle}`);
  }
}

function makeUser(role) {
  return { role };
}

function makeSurfaceFixture({
  path,
  label,
  menuPurpose = '',
  firstStep = '',
  nextStep = '',
  selectedLabel = '',
  selectedSummary = '',
  selectedRecordStatus = '',
  selectedEntityType = 'record',
  selectedEntityId = 1,
} = {}) {
  const summary = menuPurpose || `${label} özeti`;
  return {
    screenDefinition: {
      path,
      label,
      menuPurpose: summary,
      screenExplanation: summary,
      plainSummary: summary,
      summary,
      firstStep,
      nextStep,
      simpleTerms: [label],
    },
    screenContext: {
      path,
      label,
      menuPurpose: summary,
      screenExplanation: summary,
      helpContextSummary: summary,
      contextSummary: summary,
      selectedLabel,
      selectedSummary,
      selectedRecordStatus,
      selectedEntityType,
      selectedEntityId,
      selectedFields: [
        { label: 'Durum', value: selectedRecordStatus || selectedSummary || selectedLabel },
        { label: 'Özet', value: selectedSummary || selectedLabel || selectedRecordStatus || summary },
      ].filter((row) => Boolean(row.value)),
      selectedBadges: selectedRecordStatus ? [{ label: 'Durum', value: selectedRecordStatus }] : [],
      structuredFacts: {
        reasoningLead: summary,
        nextBestAction: nextStep || firstStep || 'İlk kontrolü aç.',
        selectedRecordStatus: selectedRecordStatus || selectedSummary || selectedLabel || '',
        selectedRecordSummary: selectedSummary || selectedLabel || '',
        helpContextSummary: summary,
        contextSummary: summary,
      },
    },
  };
}

function makeFollowUpState({
  fixture,
  lastQuestionType = 'DETAIL_FLOW',
  lastPrimaryConcern = 'Önceki konu',
  lastUserMessage = 'Önceki soru',
} = {}) {
  return {
    lastQuestionType,
    lastSelectedLabel: fixture?.screenContext?.selectedLabel || '',
    lastSelectedSummary: fixture?.screenContext?.selectedSummary || '',
    lastSelectedEntityType: fixture?.screenContext?.selectedEntityType || '',
    lastSelectedEntityId: fixture?.screenContext?.selectedEntityId || 0,
    lastScreenPath: fixture?.screenContext?.path || '',
    lastScreenLabel: fixture?.screenContext?.label || '',
    lastPrimaryConcern,
    lastUserMessage,
    lastRawUserMessage: lastUserMessage,
    recentMessages: [{ role: 'assistant', content: lastPrimaryConcern }],
    taskState: {
      lastQuestionType,
      currentQuestionType: lastQuestionType,
      selectedLabel: fixture?.screenContext?.selectedLabel || '',
      selectedSummary: fixture?.screenContext?.selectedSummary || '',
      selectedRecordStatus: fixture?.screenContext?.selectedRecordStatus || '',
      anchorLabel: fixture?.screenContext?.selectedLabel || fixture?.screenContext?.selectedSummary || '',
      currentScreenPath: fixture?.screenContext?.path || '',
      currentScreenLabel: fixture?.screenContext?.label || '',
      currentPrimaryConcern: lastPrimaryConcern,
      currentUserMessage: lastUserMessage,
      currentRawUserMessage: lastUserMessage,
      lastSelectedEntityType: fixture?.screenContext?.selectedEntityType || '',
      lastSelectedEntityId: fixture?.screenContext?.selectedEntityId || 0,
      lastSelectedLabel: fixture?.screenContext?.selectedLabel || '',
      lastSelectedSummary: fixture?.screenContext?.selectedSummary || '',
    },
  };
}

function buildHelpResponse({
  role,
  fixture,
  message,
  conversationState = null,
} = {}) {
  const user = makeUser(role);
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: Number(fixture?.screenContext?.selectedEntityId || 1) || 1,
    user,
    message,
    context: { type: 'screen' },
    entityLabel: fixture?.screenContext?.label || '',
    scope: { roleMode: 'OPERATIONS', role },
    conversationState,
    screenContext: fixture?.screenContext || null,
    screenDefinition: fixture?.screenDefinition || null,
    sourceScreenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
  });
}

function buildAssistantResponse({
  role,
  fixture,
  message,
  rawReply = '',
  questionType = 'NEXT_STEP',
  conversationState = null,
} = {}) {
  const user = makeUser(role);
  const menuPurpose = fixture?.screenDefinition?.menuPurpose || '';
  const nextStep = fixture?.screenDefinition?.nextStep || '';
  const analysis = {
    reasoningLead: menuPurpose,
    nextBestAction: nextStep,
    safestNextStep: nextStep,
    selectedRecordStatus: fixture?.screenContext?.selectedRecordStatus || fixture?.screenContext?.selectedSummary || fixture?.screenContext?.selectedLabel || '',
    compareHint: '',
    blockers: [],
    missingData: [],
    evidence: [],
  };
  const contextPriority = {
    summaryLead: menuPurpose,
    bestNextAction: nextStep,
    selectedRecordMismatchLead: fixture?.screenContext?.selectedRecordStatus || fixture?.screenContext?.selectedSummary || fixture?.screenContext?.selectedLabel || '',
    evidenceConfidence: '',
    roleBoundary: '',
    needsSelection: false,
    sameRecordLikely: Boolean(fixture?.screenContext?.selectedLabel || fixture?.screenContext?.selectedSummary),
    activeTopic: questionType,
    activeTopicLabel: fixture?.screenContext?.label || '',
    followUpPrompt: '',
  };
  const guide = {
    plainSummary: menuPurpose,
    summary: menuPurpose,
    screenExplanation: menuPurpose,
    whatToDoNow: fixture?.screenDefinition?.firstStep || 'İlk kontrolü aç.',
    whatToDoNext: nextStep || 'Sonraki adımı aç.',
    whyBlocked: '',
    doNotDo: '',
  };
  return buildSeferAbiReasoningAssistant({
    rawReply,
    message,
    questionType,
    replyMode: 'SHORT',
    guide,
    roleMode: 'OPERATIONS',
    userRole: role,
    user,
    screenPath: fixture?.screenContext?.path || '',
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

function describeFixture(fixture) {
  return `${fixture?.screenContext?.path || ''} :: ${fixture?.screenContext?.label || ''}`;
}

function runRootCauseScenario(testCase) {
  const intent = detectQuestionIntent(testCase.message, {
    originalMessage: testCase.message,
    screenPath: testCase.fixture?.screenContext?.path || '',
    userRole: testCase.role,
    roleMode: 'OPERATIONS',
    entityType: 'screen',
  });
  const help = buildHelpResponse({
    role: testCase.role,
    fixture: testCase.fixture,
    message: testCase.message,
    conversationState: testCase.conversationState || null,
  });
  const rootState = buildRootCauseState({
    message: testCase.message,
    currentReply: String(help?.reply || ''),
    questionType: help?.questionType || intent?.questionType || 'OPEN',
    screenPath: testCase.fixture?.screenContext?.path || '',
    screenDefinition: testCase.fixture?.screenDefinition || null,
    screenContext: testCase.fixture?.screenContext || null,
    sourceScreenDefinition: testCase.fixture?.screenDefinition || null,
    sourceScreenContext: testCase.fixture?.screenContext || null,
    conversationState: testCase.conversationState || null,
    contextPriority: null,
    analysis: null,
    roleMode: 'OPERATIONS',
    userRole: testCase.role,
    user: makeUser(testCase.role),
    guidedTaskMeta: null,
    context: null,
    entityType: 'screen',
  });
  const assistant = buildAssistantResponse({
    role: testCase.role,
    fixture: testCase.fixture,
    message: testCase.message,
    rawReply: String(help?.reply || 'Temel cevap.'),
    questionType: help?.questionType || intent?.questionType || 'OPEN',
    conversationState: testCase.conversationState || null,
  });

  const reply = String(help?.reply || '');
  const assistantReply = String(assistant?.reply || '');
  const assistantRaw = String(assistant?.rawReply || '');
  const chips = Array.isArray(help?.contextualSuggestedChips) ? help.contextualSuggestedChips : Array.isArray(help?.suggestedChips) ? help.suggestedChips : [];
  const assistantChips = Array.isArray(assistant?.suggestedChips) ? assistant.suggestedChips : [];
  const rootChips = Array.isArray(rootState?.chips) ? rootState.chips : [];
  const rootReply = String(rootState?.reply || '');
  const combined = [reply, assistantReply, assistantRaw, rootReply, ...chips, ...assistantChips, ...rootChips].join(' ');

  must(looksLikeRootCauseQuestion(testCase.message), `${testCase.label} detects root-cause language`);
  mustEqual(intent?.questionType || '', 'ROOT_CAUSE', `${testCase.label} intent question type`);
  mustEqual(help?.questionType || '', 'ROOT_CAUSE', `${testCase.label} help question type`);
  mustEqual(assistant?.questionType || '', 'ROOT_CAUSE', `${testCase.label} assistant question type`);
  mustEqual(rootState?.questionType || '', 'ROOT_CAUSE', `${testCase.label} root cause state question type`);
  mustEqual(rootState?.theme || '', testCase.theme, `${testCase.label} root cause theme`);
  mustHaveText(reply, `${testCase.label} help reply`);
  mustHaveText(assistantRaw, `${testCase.label} assistant raw reply`);
  mustHaveText(assistantReply, `${testCase.label} assistant reply`);
  mustHaveText(rootReply, `${testCase.label} root cause reply`);
  mustHaveText(chips.join(' '), `${testCase.label} help chips`);
  mustHaveText(assistantChips.join(' '), `${testCase.label} assistant chips`);
  mustHaveText(rootChips.join(' '), `${testCase.label} root cause chips`);
  mustInclude(rootReply, testCase.replyNeedles, `${testCase.label} root cause reply`);
  mustInclude(assistantReply, testCase.replyNeedles, `${testCase.label} assistant reply`);
  mustInclude(rootChips, testCase.chipNeedles, `${testCase.label} root cause chips`);
  mustIncludeAny(assistantChips, testCase.chipNeedles, `${testCase.label} assistant chips`);
  mustNotInclude(combined, ['write-action', 'runtime ai action', 'db write', 'tool execution', 'fake success'], `${testCase.label} keeps write-action wording out`);

  if (testCase.policyCheck) {
    const policy = workflowActionSpec({ activeTopic: 'ROOT_CAUSE', questionType: 'ROOT_CAUSE' });
    const policyChips = workflowTopicChipSet({
      activeTopic: 'ROOT_CAUSE',
      questionType: 'ROOT_CAUSE',
      screenPath: testCase.fixture?.screenContext?.path || '',
    });
    mustEqual(policy?.guideLabel || '', 'Kök neden rehberini aç', `${testCase.label} policy guide label`);
    mustEqual(policy?.guideLevel || '', 'WHY', `${testCase.label} policy guide level`);
    mustEqual(policy?.askQuery || '', 'asıl sebep ne olabilir', `${testCase.label} policy ask query`);
    mustInclude(policyChips, testCase.chipNeedles, `${testCase.label} policy chips`);
  }
}

function runRegressionScenario(testCase) {
  const intent = detectQuestionIntent(testCase.message, {
    originalMessage: testCase.message,
    screenPath: testCase.fixture?.screenContext?.path || '',
    userRole: testCase.role,
    roleMode: 'OPERATIONS',
    entityType: 'screen',
  });
  const help = buildHelpResponse({
    role: testCase.role,
    fixture: testCase.fixture,
    message: testCase.message,
    conversationState: testCase.conversationState || null,
  });
  const reply = String(help?.reply || '');
  const chips = Array.isArray(help?.contextualSuggestedChips) ? help.contextualSuggestedChips : Array.isArray(help?.suggestedChips) ? help.suggestedChips : [];
  const expectedIntentQuestionTypes = testCase.expectedIntentQuestionTypes || testCase.expectedQuestionTypes || [];
  const expectedHelpQuestionTypes = testCase.expectedHelpQuestionTypes || testCase.expectedQuestionTypes || [];

  must(!looksLikeRootCauseQuestion(testCase.message), `${testCase.label} stays out of root-cause detection`);
  mustEqual(intent?.questionType || '', expectedIntentQuestionTypes, `${testCase.label} intent question type`);
  mustEqual(help?.questionType || '', expectedHelpQuestionTypes, `${testCase.label} help question type`);
  mustInclude(reply, testCase.replyNeedles, `${testCase.label} help reply`);
  if (testCase.chipNeedles?.length) mustInclude(chips, testCase.chipNeedles, `${testCase.label} help chips`);
  mustNotInclude(reply, ['write-action', 'runtime ai action', 'db write', 'tool execution', 'fake success'], `${testCase.label} keeps write-action wording out`);
}

function runCase(testCase) {
  try {
    if (testCase.kind === 'root') {
      runRootCauseScenario(testCase);
    } else {
      runRegressionScenario(testCase);
    }
    passCount += 1;
    console.log(`PASS ${testCase.label}`);
  } catch (error) {
    failCount += 1;
    const detail = `${testCase.label}: ${error?.message || String(error)}`;
    failures.push(detail);
    console.error(`FAIL ${detail}`);
  }
}

function buildThemeCases() {
  const sharedPlanningTheme = {
    role: 'COMPANY',
    path: '/company/planning-center',
    label: 'Planlama Merkezi',
    menuPurpose: 'Yeni plan ve rota önizlemesi için kullanılır.',
    firstStep: 'Şirket konumu ve tarih / saat bilgisini kontrol et.',
    nextStep: 'Personel ve durakları kontrol et.',
    selectedLabel: 'Plan 12',
    selectedSummary: 'Önizleme planı',
    selectedRecordStatus: 'Hazırlanıyor',
    selectedEntityType: 'record',
    selectedEntityId: 12,
  };

  const themeConfigs = [
    {
      id: 'company-planning-route',
      theme: 'COMPANY_PLANNING_ROUTE',
      fixture: makeSurfaceFixture(sharedPlanningTheme),
      messages: ['Asıl sebep ne olabilir?', 'Kök neden ne?', 'Neden tekrar ediyor?'],
      replyNeedles: ['eksik personel konumu', 'vardiya saatinin net olmaması', 'önizleme için yeterli durak'],
      chipNeedles: ['Eksik personel konumu', 'Vardiya saatini kontrol et', 'Rota önizlemesi'],
      policyCheck: true,
    },
    {
      id: 'company-planning-empty',
      theme: 'COMPANY_PLANNING_EMPTY',
      fixture: makeSurfaceFixture(sharedPlanningTheme),
      messages: ['Asıl sebep ne olabilir, plan neden boş kalıyor?', 'Kök neden ne, personel neden eklenmemiş?', 'Sürekli neden böyle oluyor, filtre mi yanlış?'],
      replyNeedles: ['plan kapsamına personel eklenmemesi', 'filtre/tarih bağlamı', 'eksik konum verisi'],
      chipNeedles: ['Plan personel listesi', 'Aktif filtreler', 'Eksik konum verisi'],
    },
    {
      id: 'company-operations',
      theme: 'COMPANY_OPERATIONS',
      fixture: makeSurfaceFixture({
        path: '/company/operations',
        label: 'Şirket Operasyon',
        menuPurpose: 'Canlı operasyon ve vardiya izleme için kullanılır.',
        firstStep: 'Aktif vardiyayı aç.',
        nextStep: 'Son GPS ve araç atamasını kontrol et.',
        selectedLabel: 'Operasyon 8',
        selectedSummary: 'Canlı operasyon',
        selectedRecordStatus: 'Açık',
        selectedEntityType: 'record',
        selectedEntityId: 8,
      }),
      messages: ['Asıl sebep ne olabilir?', 'Kök neden ne?', 'Neden düzelmiyor?'],
      replyNeedles: ['aktif operasyon/vardiya olmaması', 'araç atamasının eksik olması', 'konum sinyali verisinin gelmemesi'],
      chipNeedles: ['Aktif vardiya var mı?', 'Son GPS zamanı', 'Araç ataması'],
    },
    {
      id: 'company-operations-repeat',
      theme: 'COMPANY_OPERATIONS_REPEAT',
      fixture: makeSurfaceFixture({
        path: '/company/operations',
        label: 'Şirket Operasyon',
        menuPurpose: 'Canlı operasyon ve vardiya izleme için kullanılır.',
        firstStep: 'Aktif vardiyayı aç.',
        nextStep: 'Son GPS ve araç atamasını kontrol et.',
        selectedLabel: 'Operasyon 8',
        selectedSummary: 'Canlı operasyon',
        selectedRecordStatus: 'Açık',
        selectedEntityType: 'record',
        selectedEntityId: 8,
      }),
      messages: ['Neden sürekli görünmüyor?', 'Neden tekrar ediyor?', 'Sürekli neden böyle oluyor?'],
      replyNeedles: ['tarih/filtre bağlamı', 'aktif vardiya üretimi', 'yetki/şirket kapsamı'],
      chipNeedles: ['Tarih filtresi', 'Şirket/oda kapsamı', 'Aktif vardiya üretimi'],
    },
    {
      id: 'company-shift',
      theme: 'COMPANY_SHIFT',
      fixture: makeSurfaceFixture({
        path: '/company/shifts',
        label: 'Vardiyalar',
        menuPurpose: 'Vardiya akışını izlemek için kullanılır.',
      firstStep: 'Bugünkü vardiyayı aç.',
      nextStep: 'Sonraki adımı kontrol et.',
      selectedLabel: 'Vardiya 3',
      selectedSummary: 'Planlı vardiya',
      selectedRecordStatus: 'Hazır',
        selectedEntityType: 'record',
        selectedEntityId: 3,
      }),
      messages: ['Kök neden ne?', 'Bunu ne bozuyor olabilir?', 'Neden düzelmiyor?'],
      replyNeedles: ['vardiya zamanı', 'araç-sürücü ataması', 'operasyon hazırlığı eksikliği'],
      chipNeedles: ['Vardiya zamanı', 'Araç-sürücü ataması', 'Operasyon hazırlığı'],
    },
    {
      id: 'company-shift-repeat',
      theme: 'COMPANY_SHIFT_REPEAT',
      fixture: makeSurfaceFixture({
        path: '/company/shifts',
        label: 'Vardiyalar',
        menuPurpose: 'Vardiya akışını izlemek için kullanılır.',
      firstStep: 'Bugünkü vardiyayı aç.',
      nextStep: 'Sonraki adımı kontrol et.',
      selectedLabel: 'Vardiya 3',
      selectedSummary: 'Planlı vardiya',
      selectedRecordStatus: 'Hazır',
      selectedEntityType: 'record',
      selectedEntityId: 3,
    }),
      messages: ['Neden tekrar ediyor?', 'Sürekli neden böyle oluyor?', 'Asıl sebep ne olabilir, neden sürekli tekrar ediyor?'],
      replyNeedles: ['vardiya saati', 'atama doğruluğu', 'operasyon ön koşullarının eksik kalması'],
      chipNeedles: ['Atama durumu', 'Vardiya saati', 'Operasyon ön koşulları', 'Son durum'],
    },
    {
      id: 'company-offer',
      theme: 'COMPANY_OFFER',
      fixture: makeSurfaceFixture({
        path: '/company/agreements',
        label: 'Sözleşmeler',
        menuPurpose: 'Talep, teklif ve sözleşme ilişkisini görmek için kullanılır.',
        firstStep: 'Talep durumunu aç.',
        nextStep: 'Teklif filtresini kontrol et.',
        selectedLabel: 'Teklif 5',
        selectedSummary: 'Bekleyen teklif',
        selectedRecordStatus: 'Bekliyor',
        selectedEntityType: 'record',
        selectedEntityId: 5,
      }),
      messages: ['Kök neden ne?', 'Neden tekrar ediyor?', 'En olası neden ne?'],
      replyNeedles: ['talebin tedarikçiye ulaşmaması', 'tedarikçi dönüşünün beklenmesi', 'filtre/status farkı'],
      chipNeedles: ['Talep durumu', 'Teklif filtresi', 'Tedarikçi dönüşü'],
    },
    {
      id: 'room-shift',
      theme: 'ROOM_SHIFT',
      fixture: makeSurfaceFixture({
        path: '/room/shifts',
        label: 'Oda Vardiyalar',
        menuPurpose: 'Canlı vardiya başlatma ve eksik durum kontrolü için kullanılır.',
        firstStep: 'Canlı başlatma kaydını aç.',
        nextStep: 'Araç ve sürücü bilgisini kontrol et.',
        selectedLabel: 'Vardiya 6',
        selectedSummary: 'Kabul edilen vardiya',
        selectedRecordStatus: 'Kabul Edildi / APPROVED',
        selectedEntityType: 'shift',
        selectedEntityId: 6,
      }),
      messages: ['Asıl sebep ne olabilir?', 'Kök neden ne?', 'Neden düzelmiyor?'],
      replyNeedles: ['araç-sürücü atamasının eksik olması', 'başlatma zamanının uygun olmaması', 'konum sinyali hazırlığının tamamlanmaması'],
      chipNeedles: ['Araç-sürücü ataması', 'Başlatma zamanı', 'GPS hazırlığı'],
    },
    {
      id: 'room-shift-repeat',
      theme: 'ROOM_SHIFT_REPEAT',
      fixture: makeSurfaceFixture({
        path: '/room/shifts',
        label: 'Oda Vardiyalar',
        menuPurpose: 'Canlı vardiya başlatma ve eksik durum kontrolü için kullanılır.',
        firstStep: 'Canlı başlatma kaydını aç.',
        nextStep: 'Araç ve sürücü bilgisini kontrol et.',
        selectedLabel: 'Vardiya 6',
        selectedSummary: 'Kabul edilen vardiya',
        selectedRecordStatus: 'Kabul Edildi / APPROVED',
      selectedEntityType: 'shift',
      selectedEntityId: 6,
    }),
      messages: ['Asıl sebep ne olabilir, neden sürekli görünmüyor?', 'Kök neden ne, GPS neden sürekli yok?', 'Sürekli neden böyle oluyor, canlı başlangıç niye kopuk?'],
      replyNeedles: ['atama, zaman veya konum sinyali hazırlığının birinde kopukluk', 'canlı başlangıç'],
      chipNeedles: ['Son atama', 'GPS hazırlığı', 'Başlatma zamanı', 'Canlı başlangıç'],
    },
    {
      id: 'room-vehicle',
      theme: 'ROOM_VEHICLE',
      fixture: makeSurfaceFixture({
        path: '/room/vehicles',
        label: 'Araçlar',
        menuPurpose: 'Araç, GPS ve sürücü bağını kontrol etmek için kullanılır.',
        firstStep: 'Seçili aracı aç.',
        nextStep: 'GPS ve sürücü bağını kontrol et.',
        selectedLabel: 'Araç 17',
        selectedSummary: 'Seçili araç hazır',
        selectedRecordStatus: 'Hazır',
        selectedEntityType: 'vehicle',
        selectedEntityId: 17,
      }),
      messages: ['Kök neden ne?', 'Asıl sebep ne olabilir?', 'Bunu ne bozuyor olabilir?'],
      replyNeedles: ['filtre/oda kapsamı', 'araç kaydının pasif olması', 'seçili şirket/oda bağlamının farklı olması'],
      chipNeedles: ['Filtreleri kontrol et', 'Araç aktif mi?', 'Oda/kapsam'],
    },
    {
      id: 'room-vehicle-gps',
      theme: 'ROOM_VEHICLE_GPS',
      fixture: makeSurfaceFixture({
        path: '/room/vehicles',
        label: 'Araçlar',
        menuPurpose: 'Araç, GPS ve sürücü bağını kontrol etmek için kullanılır.',
        firstStep: 'Seçili aracı aç.',
        nextStep: 'GPS ve sürücü bağını kontrol et.',
        selectedLabel: 'Araç 17',
        selectedSummary: 'Seçili araç hazır',
        selectedRecordStatus: 'Hazır',
      selectedEntityType: 'vehicle',
      selectedEntityId: 17,
    }),
      messages: ['Asıl sebep ne olabilir, GPS neden sürekli yok?', 'Kök neden ne, konum verisi neden stale kaldı?', 'Sürekli neden böyle oluyor, araç offline mı?'],
      replyNeedles: ['araç-sürücü eşleşmesi', 'sürücü cihazının konum izni', 'konum sinyali verisinin stale/çevrim dışı kalması'],
      chipNeedles: ['Son GPS zamanı', 'Araç-sürücü eşleşmesi', 'Konum izni', 'Stale/offline'],
    },
    {
      id: 'driver-route',
      theme: 'DRIVER_ROUTE',
      fixture: makeSurfaceFixture({
        path: '/driver/route',
        label: 'Sürücü Rotası',
        menuPurpose: 'Günün rotası ve sıradaki durak için kullanılır.',
        firstStep: 'Aktif rotayı aç.',
        nextStep: 'Sıradaki durağı kontrol et.',
        selectedLabel: 'Rota 5',
        selectedSummary: 'Aktif rota',
      selectedRecordStatus: 'Hazır',
      selectedEntityType: 'record',
      selectedEntityId: 5,
    }),
      messages: ['Rota neden hep oluşmuyor?', 'Kök neden ne?', 'Asıl sebep ne olabilir?'],
      replyNeedles: ['sürücüye aktif vardiya atanmaması', 'rota henüz başlatılmaması', 'durak listesinin hazır olmaması'],
      chipNeedles: ['Aktif vardiya', 'Atanmış araç', 'Durak listesi', 'Rota başlatma'],
    },
    {
      id: 'driver-checkin',
      theme: 'DRIVER_CHECKIN',
      fixture: makeSurfaceFixture({
        path: '/driver/today',
        label: 'Bugün',
        menuPurpose: 'Günlük görev ve check-in için kullanılır.',
        firstStep: 'Günlük görevini aç.',
        nextStep: 'Check-in veya sıradaki durağı kontrol et.',
        selectedLabel: 'Günlük görev 2',
        selectedSummary: 'Aktif günlük görev',
        selectedRecordStatus: 'Açık',
      selectedEntityType: 'record',
      selectedEntityId: 2,
    }),
      messages: ['Asıl sebep ne olabilir, biniş neden sürekli görünmüyor?', 'Kök neden ne, check-in neden düzelmiyor?', 'Sürekli neden böyle oluyor, giriş neden görünmüyor?'],
      replyNeedles: ['yanlış durak', 'uygun olmayan zaman', 'konum sinyali/konum doğrulamasının eksik'],
      chipNeedles: ['Durak doğrulaması', 'Uygun zaman', 'GPS doğrulaması', 'Konum geldi mi?'],
    },
    {
      id: 'personel-live',
      theme: 'PERSONEL_LIVE',
      fixture: makeSurfaceFixture({
        path: '/personel/live',
        label: 'Personel Canlı',
        menuPurpose: 'Personel servis durumu ve canlı konum için kullanılır.',
        firstStep: 'Servis durumunu aç.',
        nextStep: 'Son GPS ve servis durumunu kontrol et.',
        selectedLabel: 'Servis 11',
      selectedSummary: 'Canlı servis bilgisi',
      selectedRecordStatus: 'Aktif',
        selectedEntityType: 'personel',
        selectedEntityId: 11,
      }),
      messages: ['Asıl sebep ne olabilir?', 'Kök neden ne?', 'Neden düzelmiyor?'],
      replyNeedles: ['atanmış aktif vardiya olmaması', 'servis saatinin başlamaması', 'araç konum sinyali verisinin gelmemesi'],
      chipNeedles: ['Atanmış vardiya', 'Son GPS zamanı', 'Araç bağlantısı', 'Servis saati'],
    },
    {
      id: 'personel-live-repeat',
      theme: 'PERSONEL_LIVE_REPEAT',
      fixture: makeSurfaceFixture({
        path: '/personel/live',
        label: 'Personel Canlı',
        menuPurpose: 'Personel servis durumu ve canlı konum için kullanılır.',
        firstStep: 'Servis durumunu aç.',
        nextStep: 'Son GPS ve servis durumunu kontrol et.',
        selectedLabel: 'Servis 11',
        selectedSummary: 'Canlı servis bilgisi',
        selectedRecordStatus: 'Aktif',
      selectedEntityType: 'personel',
      selectedEntityId: 11,
    }),
      messages: ['Asıl sebep ne olabilir, neden sürekli görünmüyor?', 'Kök neden ne, GPS neden sürekli gelmiyor?', 'Sürekli neden böyle oluyor, servis akışı neden kesiliyor?'],
      replyNeedles: ['atanan vardiya', 'servis saatinin başlamaması', 'araçtan sinyal gelmemesi'],
      chipNeedles: ['Atanmış vardiya', 'Servis saati', 'GPS akışı', 'Araç bağlantısı'],
    },
    {
      id: 'parent-live',
      theme: 'PARENT_LIVE',
      fixture: makeSurfaceFixture({
        path: '/parent/live',
        label: 'Veli Canlı',
        menuPurpose: 'Öğrenci servis durumunu izlemek için kullanılır.',
        firstStep: 'Yetkili öğrenci servis görünümünü aç.',
        nextStep: 'Canlı takip ve servis durumunu kontrol et.',
        selectedLabel: 'Öğrenci 3',
        selectedSummary: 'Canlı takip',
        selectedRecordStatus: 'Aktif',
      selectedEntityType: 'personel',
      selectedEntityId: 3,
    }),
      messages: ['Kök neden ne?', 'Neden tekrar ediyor?', 'Asıl sebep ne olabilir?'],
      replyNeedles: ['planlanan servis saatinin değişmesi', 'araç konumunun gelmemesi', 'atanmış vardiya bilgisinin eksik olması'],
      chipNeedles: ['Servis saati', 'Araç konumu', 'Atanmış vardiya'],
    },
    {
      id: 'superadmin-company',
      theme: 'SUPERADMIN_COMPANY',
      fixture: makeSurfaceFixture({
        path: '/superadmin/operations',
        label: 'Superadmin Operasyon',
        menuPurpose: 'Sistem denetimi ve operasyon durumunu izlemek için kullanılır.',
        firstStep: 'Açık kayıt ve kritik sinyali aç.',
        nextStep: 'Sonraki doğru işlem olarak canlı durum ve GPS kaydını incele.',
        selectedLabel: 'Denetim 7',
        selectedSummary: 'Sistem özet',
        selectedRecordStatus: 'Açık',
        selectedEntityType: 'record',
        selectedEntityId: 7,
      }),
      messages: ['Asıl sebep ne olabilir?', 'Kök neden ne?', 'Neden düzelmiyor?'],
      replyNeedles: ['filtre/arama', 'şirket kaydının durumu', 'yetki kapsamı'],
      chipNeedles: ['Arama filtresi', 'Kayıt durumu', 'Yetki kapsamı'],
    },
    {
      id: 'feedback-status',
      theme: 'FEEDBACK_STATUS',
      fixture: makeSurfaceFixture({
        path: '/shared/feedback',
        label: 'Geri Bildirim',
        menuPurpose: 'Açık geri bildirim ve sorumlu rol için kullanılır.',
        firstStep: 'Açık kaydı aç.',
        nextStep: 'Sorumlu rolü ve durum filtresini kontrol et.',
        selectedLabel: 'Geri bildirim 14',
        selectedSummary: 'Açık kayıt',
        selectedRecordStatus: 'Açık',
        selectedEntityType: 'feedback',
        selectedEntityId: 14,
      }),
      messages: ['Neden tekrar ediyor?', 'Asıl sebep ne olabilir?', 'Kök neden ne?'],
      replyNeedles: ['açık/kritik durumun filtrede kalması', 'sorumlu rolün değişmesi', 'seçili kaydın kapanmamış olması'],
      chipNeedles: ['Açık kayıt', 'Sorumlu rol', 'Durum filtresi'],
    },
    {
      id: 'generic-context',
      theme: 'GENERIC_CONTEXT',
      fixture: makeSurfaceFixture({
        path: '/room/reports',
        label: 'Raporlar',
        menuPurpose: 'Rapor görünürlüğü ve filtreleri için kullanılır.',
        firstStep: 'Seçili raporu aç.',
        nextStep: 'Filtreleri ve son sinyali kontrol et.',
        selectedLabel: 'Rapor 2',
        selectedSummary: 'Seçili rapor',
        selectedRecordStatus: 'Eksik',
        selectedEntityType: 'record',
        selectedEntityId: 2,
      }),
      messages: ['Asıl sebep ne olabilir?', 'Bunu ne bozuyor olabilir?', 'Kök neden ne?'],
      replyNeedles: ['kayıt durumu', 'filtre/kapsam', 'son sinyal eksikliği'],
      chipNeedles: ['Seçili kaydı aç', 'Son sinyali göster', 'Filtreyi kontrol et'],
    },
  ];

  const cases = [];
  for (const config of themeConfigs) {
    config.messages.forEach((message, index) => {
      cases.push({
        kind: 'root',
        label: `${config.id}-${String(index + 1).padStart(2, '0')}`,
        role: config.role,
        fixture: config.fixture,
        message,
        theme: config.theme,
        replyNeedles: config.replyNeedles,
        chipNeedles: config.chipNeedles,
        policyCheck: Boolean(config.policyCheck && index === 0),
      });
    });
  }

  const roomShiftsFixture = makeSurfaceFixture({
    path: '/room/shifts',
    label: 'Oda Vardiyalar',
    menuPurpose: 'Canlı vardiya başlatma ve eksik durum kontrolü için kullanılır.',
    firstStep: 'Canlı başlatma kaydını aç.',
    nextStep: 'Araç ve sürücü bilgisini kontrol et.',
    selectedLabel: 'Vardiya 6',
    selectedSummary: 'Kabul edilen vardiya',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    selectedEntityType: 'shift',
    selectedEntityId: 6,
  });
  const companyPlanningFixture = makeSurfaceFixture({
    path: '/company/planning-center',
    label: 'Planlama Merkezi',
    menuPurpose: 'Yeni plan ve rota önizlemesi için kullanılır.',
    firstStep: 'Şirket konumu ve tarih / saat bilgisini kontrol et.',
    nextStep: 'Personel ve durakları kontrol et.',
    selectedLabel: 'Plan 12',
    selectedSummary: 'Önizleme planı',
    selectedRecordStatus: 'Hazırlanıyor',
    selectedEntityType: 'plan',
    selectedEntityId: 12,
  });
  const personelLiveFixture = makeSurfaceFixture({
    path: '/personel/live',
    label: 'Personel Canlı',
    menuPurpose: 'Personel servis durumu ve canlı konum için kullanılır.',
    firstStep: 'Servis durumunu aç.',
    nextStep: 'Son GPS ve servis durumunu kontrol et.',
    selectedLabel: 'Servis 11',
    selectedSummary: 'Canlı servis bilgisi',
    selectedRecordStatus: 'Aktif',
    selectedEntityType: 'personel',
    selectedEntityId: 11,
  });
  const companyPlanningFollowUpFixture = makeSurfaceFixture({
    path: '/company/planning-center',
    label: 'Planlama Merkezi',
    menuPurpose: 'Yeni plan ve rota önizlemesi için kullanılır.',
    firstStep: 'Şirket konumu ve tarih / saat bilgisini kontrol et.',
    nextStep: 'Personel ve durakları kontrol et.',
    selectedLabel: 'Plan 12',
    selectedSummary: 'Önizleme planı',
    selectedRecordStatus: 'Hazırlanıyor',
    selectedEntityType: 'plan',
    selectedEntityId: 12,
  });
  const followUpState = makeFollowUpState({
    fixture: companyPlanningFollowUpFixture,
    lastQuestionType: 'DETAIL_FLOW',
    lastPrimaryConcern: 'Önceki konu',
    lastUserMessage: 'Önceki soru',
  });
  const superadminTestFixture = makeSurfaceFixture({
    path: '/superadmin/operations',
    label: 'Test',
    menuPurpose: 'Test',
    firstStep: 'İlk adım',
    nextStep: 'Sonraki adım',
    selectedLabel: 'Seçili',
    selectedSummary: 'Özet',
    selectedRecordStatus: 'Durum',
    selectedEntityType: 'record',
    selectedEntityId: 1,
  });

  cases.push(
    {
      kind: 'regression',
      label: 'room-shifts-clarify-01',
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'İlgili durumu sor',
      expectedQuestionTypes: ['STATUS_HELP'],
      replyNeedles: ['Netleştirelim', 'canlı başlatma', 'araç-sürücü', 'eksik bilgi'],
      chipNeedles: ['Canlı başlatma zamanı', 'Araç / sürücü'],
    },
    {
      kind: 'regression',
      label: 'company-planning-followup-01',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Personelleri ekledim.',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyNeedles: ['Aynı plan akışından devam edelim', 'adres / konum', 'durak', 'rota önizlemesini', 'vardiyayı oluşturup'],
      chipNeedles: ['Devam et', 'Yaptım', 'Bulamadım', 'Detayını anlat'],
    },
    {
      kind: 'regression',
      label: 'personel-live-diagnostic-01',
      role: 'PERSONEL',
      fixture: personelLiveFixture,
      message: 'Servis neden görünmüyor?',
      expectedQuestionTypes: ['LOCATION_HELP'],
      replyNeedles: ['Servis görünmüyorsa', 'son konum bilgisi', 'araç bağlantısı'],
      chipNeedles: ['Servis', 'Araç', 'Durak', 'Saat'],
    },
    {
      kind: 'regression',
      label: 'company-planning-howto-01',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Bunu nasıl yapacağım?',
      expectedQuestionTypes: ['NEXT_STEP'],
      replyNeedles: ['Netleştirelim', 'Alternatif', 'Planlama Merkezi'],
      chipNeedles: ['Yeni plan oluştur', 'Mevcut planı incele'],
    },
    {
      kind: 'regression',
      label: 'company-shifts-detail-continue-01',
      role: 'COMPANY',
      fixture: companyPlanningFollowUpFixture,
      message: 'Devamını anlat',
      conversationState: followUpState,
      expectedIntentQuestionTypes: ['HOW_TO_HELP'],
      expectedHelpQuestionTypes: ['DETAIL_FLOW'],
      replyNeedles: ['Aynı plan akışından devam edelim', 'Planlama Merkezi', 'Vardiyalar ekranında takip et'],
    },
    {
      kind: 'regression',
      label: 'company-shifts-result-check-01',
      role: 'COMPANY',
      fixture: companyPlanningFollowUpFixture,
      message: 'yaptım',
      conversationState: followUpState,
      expectedIntentQuestionTypes: ['SCREEN_PURPOSE'],
      expectedHelpQuestionTypes: ['NEXT_STEP'],
      replyNeedles: ['Birlikte kontrol edelim', 'Sıradaki doğru işlem', 'Paket, tarih, saat', 'Planlama Merkezi > Yeni Plan Oluştur / Rehberi Başlat'],
    },
    {
      kind: 'regression',
      label: 'company-shifts-continue-state-01',
      role: 'COMPANY',
      fixture: companyPlanningFollowUpFixture,
      message: 'tamam',
      conversationState: followUpState,
      expectedIntentQuestionTypes: ['SCREEN_PURPOSE'],
      expectedHelpQuestionTypes: ['NEXT_STEP'],
      replyNeedles: ['Sıradaki doğru işlem', 'Aynı plan akışından devam edelim', 'Planlama Merkezi > Yeni Plan Oluştur / Rehberi Başlat'],
      chipNeedles: ['Devam et', 'Yaptım', 'Bulamadım', 'Detayını anlat'],
    },
    {
      kind: 'regression',
      label: 'company-shifts-missing-01',
      role: 'COMPANY',
      fixture: companyPlanningFollowUpFixture,
      message: 'bulamadım',
      conversationState: followUpState,
      expectedIntentQuestionTypes: ['SCREEN_PURPOSE'],
      expectedHelpQuestionTypes: ['NEXT_SCREEN'],
      replyNeedles: ['Alternatif yol bulalım', 'Aynı plan akışından devam edelim', 'Planlama Merkezi > Yeni Plan Oluştur / Rehberi Başlat'],
    },
    {
      kind: 'regression',
      label: 'superadmin-screen-focus-01',
      role: 'SUPER_ADMIN',
      fixture: superadminTestFixture,
      message: 'Bu ekranda neye bakmalıyım?',
      expectedQuestionTypes: ['SCREEN_FOCUS'],
      replyNeedles: ['canlı durum ve konum sinyali güven skorunu oku'],
    },
    {
      kind: 'regression',
      label: 'superadmin-next-step-01',
      role: 'SUPER_ADMIN',
      fixture: superadminTestFixture,
      message: 'Sıradaki doğru işlem ne?',
      expectedQuestionTypes: ['NEXT_STEP', 'NEXT_BEST_ACTION'],
      replyNeedles: ['Şimdi: İlk adım'],
    },
    {
      kind: 'regression',
      label: 'superadmin-risk-list-01',
      role: 'SUPER_ADMIN',
      fixture: superadminTestFixture,
      message: 'Riskleri sırala',
      expectedQuestionTypes: ['RISK_LIST'],
      replyNeedles: ['Riskler: Önce: İlk adım'],
    },
  );

  return cases;
}

function main() {
  console.log('=== COPILOT ROOT CAUSE ENGINE 01 ===');

  const runtimeCases = buildThemeCases();
  for (const testCase of runtimeCases) {
    runCase(testCase);
  }

  console.log(`runtimeCases=${runtimeCases.length}`);
  console.log(`testedCases=${runtimeCases.length}`);
  console.log(`passCount=${passCount}`);
  console.log(`failCount=${failCount}`);
  if (failures.length) {
    console.log('Failures:');
    for (const failure of failures) console.log(`- ${failure}`);
    throw new Error('COPILOT-ROOT-CAUSE-ENGINE-01 check failed');
  }
  mustEqual(passCount, runtimeCases.length, 'all cases passed');
  mustEqual(failCount, 0, 'no case failed');
  console.log('PASS COPILOT-ROOT-CAUSE-ENGINE-01');
  console.log('PASS root cause engine check completed');
}

main();
