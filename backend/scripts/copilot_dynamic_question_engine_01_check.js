#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildSeferAbiReasoningAssistant } from '../src/ai/chat/seferAbiReasoningAssistant.js';
import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function containsAny(text, needles = []) {
  const haystack = normalize(text);
  return normalizeList(needles).some((needle) => haystack.includes(normalize(needle)));
}

function makeUser(role) {
  return { role };
}

function makeSurfaceFixture({
  path: screenPath,
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
      path: screenPath,
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
      path: screenPath,
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
  lastQuestionType = 'NEXT_STEP',
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
  rawReply,
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
    reasoningAssistantFlavor: 'standalone',
  });
}

function must(text, needle, label) {
  if (contains(text, needle)) return;
  throw new Error(`FAIL ${label}`);
}

function checkSource(label, text, needle) {
  must(text, needle, label);
  console.log(`PASS ${label}`);
}

function runCase(testCase) {
  const response = buildHelpResponse(testCase);
  const reply = String(response?.reply || '');
  const chips = Array.isArray(response?.contextualSuggestedChips) ? response.contextualSuggestedChips : Array.isArray(response?.suggestedChips) ? response.suggestedChips : [];
  const assistant = buildAssistantResponse({
    role: testCase.role,
    fixture: testCase.fixture,
    message: testCase.message,
    rawReply: String(testCase.assistantRawReply || 'Temel cevap.'),
    questionType: response?.questionType || testCase.questionType || 'NEXT_STEP',
    conversationState: testCase.conversationState || null,
  });
  const assistantChips = Array.isArray(assistant?.suggestedChips) ? assistant.suggestedChips : [];
  const issues = [];

  if (normalizeList(testCase.expectedQuestionTypes).length && !normalizeList(testCase.expectedQuestionTypes).some((q) => normalize(response?.questionType || '') === normalize(q))) {
    issues.push(`questionType expected one of [${normalizeList(testCase.expectedQuestionTypes).join(', ')}] but got ${String(response?.questionType || '')}`);
  }
  for (const needle of normalizeList(testCase.replyIncludes)) {
    if (!contains(reply, needle)) issues.push(`reply missing ${needle}`);
  }
  for (const group of normalizeList(testCase.replyAnyOf)) {
    if (!containsAny(reply, Array.isArray(group) ? group : [group])) issues.push(`reply missing any of [${normalizeList(group).join(', ')}]`);
  }
  for (const needle of normalizeList(testCase.replyExcludes)) {
    if (contains(reply, needle)) issues.push(`reply unexpectedly contains ${needle}`);
  }
  for (const needle of normalizeList(testCase.chipsIncludes)) {
    if (!containsAny(chips, [needle])) issues.push(`chips missing ${needle}`);
  }
  for (const needle of normalizeList(testCase.chipsExcludes)) {
    if (containsAny(chips, [needle])) issues.push(`chips unexpectedly contains ${needle}`);
  }
  for (const needle of normalizeList(testCase.assistantChipsIncludes)) {
    if (!containsAny(assistantChips, [needle])) issues.push(`assistant chips missing ${needle}`);
  }
  for (const needle of normalizeList(testCase.assistantChipsExcludes)) {
    if (containsAny(assistantChips, [needle])) issues.push(`assistant chips unexpectedly contains ${needle}`);
  }

  return {
    response,
    reply,
    chips,
    assistant,
    assistantChips,
    issues,
  };
}

function main() {
  console.log('=== COPILOT DYNAMIC QUESTION ENGINE 01 ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const dynamicDoc = read('docs/COPILOT_DYNAMIC_QUESTION_ENGINE_01.md');
  const responsesSource = read('backend/src/ai/chat/conversationTaskStateResponses.js');
  const dynamicSource = read('backend/src/ai/chat/conversationTaskStateDynamicQuestions.js');
  const helpComposerSource = read('backend/src/ai/chat/helpComposer.js');
  const assistantSource = read('backend/src/ai/chat/seferAbiReasoningAssistant.js');
  const guidedSource = read('backend/src/ai/chat/copilotGuidedTaskEngine.js');
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  checkSource('package.json exposes dynamic question engine check', pkg, '"check:copilotdynamicquestionengine01": "node backend/scripts/copilot_dynamic_question_engine_01_check.js"');
  assertProductExtensionsOrder(['check:copilotguidedtaskengine01', 'check:copilotdynamicquestionengine01', 'check:copilotsmartdiagnosticengine01'], 'product extensions registry keeps dynamic question engine after guided task engine and before smart diagnostic', registryScripts);
  assertProductExtensionsOrder(['check:copilotguidedtaskengine01', 'check:copilotdynamicquestionengine01', 'check:copilotsmartdiagnosticengine01'], 'verify chain registry keeps dynamic question engine after guided task engine and before smart diagnostic', registryScripts);
  checkSource('guide mentions dynamic question engine milestone', guide, 'COPILOT-DYNAMIC-QUESTION-ENGINE-01');
  checkSource('primer mentions dynamic question engine milestone', primer, 'COPILOT-DYNAMIC-QUESTION-ENGINE-01');
  checkSource('harness doc mentions dynamic question engine milestone', harnessDoc, 'COPILOT-DYNAMIC-QUESTION-ENGINE-01');
  checkSource('dynamic doc has canonical check wording', dynamicDoc, 'Canonical check: `check:copilotdynamicquestionengine01`');
  checkSource('responses facade exports dynamic helper state', responsesSource, 'buildDynamicQuestionState');
  checkSource('dynamic helper source exports dynamic question reply', dynamicSource, 'buildDynamicQuestionReply');
  checkSource('dynamic helper source exports dynamic question chips', dynamicSource, 'buildDynamicQuestionChips');
  checkSource('help composer wires dynamic question reply helper', helpComposerSource, 'buildDynamicQuestionReplyImpl');
  checkSource('help composer wires dynamic question chips helper', helpComposerSource, 'buildDynamicQuestionChipsImpl');
  checkSource('sefer reasoning assistant wires dynamic chips', assistantSource, 'buildDynamicQuestionChips');
  checkSource('guided task engine wires dynamic chips', guidedSource, 'buildDynamicQuestionChips');

  const companyPlanningFixture = makeSurfaceFixture({
    path: '/company/planning-center',
    label: 'Planlama Merkezi',
    menuPurpose: 'Planlama Merkezi yeni plan oluşturma, teklif ve sözleşme hazırlığı için kullanılır.',
    firstStep: 'İlgili plan satırını aç.',
    nextStep: 'Teklif / sözleşme hazırlığını kontrol et.',
  });
  const organizationPlanningFixture = makeSurfaceFixture({
    path: '/organization/planning-center',
    label: 'Planlama Merkezi',
    menuPurpose: 'Organizasyon planlama ve onay akışı için kullanılır.',
    firstStep: 'Organizasyon planını aç.',
    nextStep: 'Onay ve planlamayı kontrol et.',
  });
  const companyOperationsFixture = makeSurfaceFixture({
    path: '/company/operations',
    label: 'Operasyonlar',
    menuPurpose: 'Operasyon kayıtlarını takip etmek için kullanılır.',
    firstStep: 'Bekleyen işi aç.',
    nextStep: 'Sıradaki işlemi kontrol et.',
  });
  const companyAgreementsFixture = makeSurfaceFixture({
    path: '/company/agreements',
    label: 'Sözleşmeler',
    menuPurpose: 'Teklifleri ve sözleşme hazırlığını kıyaslamak için kullanılır.',
    firstStep: 'Teklif satırlarını aç.',
    nextStep: 'Fiyat, süre ve risk karşılaştırmasını kontrol et.',
  });
  const companyShiftsFixture = makeSurfaceFixture({
    path: '/company/shifts',
    label: 'Vardiyalar',
    menuPurpose: 'Vardiya akışını izlemek için kullanılır.',
    firstStep: 'Bugünkü vardiyayı aç.',
    nextStep: 'Sonraki adımı kontrol et.',
  });
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
  const roomVehiclesFixture = makeSurfaceFixture({
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
  });
  const personelLiveFixture = makeSurfaceFixture({
    path: '/personel/live',
    label: 'Personel Canlı',
    menuPurpose: 'Personel servis durumu ve canlı konum için kullanılır.',
    firstStep: 'Servis durumunu aç.',
    nextStep: 'Son GPS ve servis durumunu kontrol et.',
    selectedLabel: 'Servis 11',
    selectedSummary: 'Canlı servis bilgisi',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    selectedEntityType: 'service',
    selectedEntityId: 11,
  });
  const parentLiveFixture = makeSurfaceFixture({
    path: '/parent/live',
    label: 'Veli Canlı',
    menuPurpose: 'Öğrenci servis durumunu güvenli biçimde izlemek için kullanılır.',
    firstStep: 'Yetkili öğrenci servis görünümünü aç.',
    nextStep: 'Canlı takip ve servis saatini kontrol et.',
    selectedLabel: 'Öğrenci Servisi',
    selectedSummary: 'Canlı servis bilgisi',
    selectedRecordStatus: 'Kabul Edildi / APPROVED',
    selectedEntityType: 'student_service',
    selectedEntityId: 21,
  });
  const driverRouteFixture = makeSurfaceFixture({
    path: '/driver/route',
    label: 'Sürücü Rota',
    menuPurpose: 'Durak sırası, varış ve tamamlanma kontrolü için kullanılır.',
    firstStep: 'Durak sırasını aç.',
    nextStep: 'ETA ve varış bilgisini kontrol et.',
    selectedLabel: 'Rota 12',
    selectedSummary: 'Bugünkü rota',
    selectedRecordStatus: 'Aktif',
    selectedEntityType: 'route',
    selectedEntityId: 12,
  });
  const feedbackFixture = makeSurfaceFixture({
    path: '/shared/feedback',
    label: 'Geri Bildirim',
    menuPurpose: 'Seçili geri bildirim kaydı üzerinde takip yapmak için kullanılır.',
    firstStep: 'Açık kaydı aç.',
    nextStep: 'Durumu ve sorumlu rolü kontrol et.',
    selectedLabel: 'Geri bildirim #7',
    selectedSummary: 'Seçili geri bildirim',
    selectedRecordStatus: 'Açık / In review',
    selectedEntityType: 'feedback',
    selectedEntityId: 7,
  });

  const followUpState = makeFollowUpState({
    fixture: companyShiftsFixture,
    lastQuestionType: 'NEXT_STEP',
    lastPrimaryConcern: 'Vardiya akışını aç.',
    lastUserMessage: 'Önce vardiya akışını aç.',
  });

  const runtimeCases = [
    {
      id: 'company-planning-clarify-1',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Bunu nasıl yapacağım?',
      expectedQuestionTypes: ['NEXT_STEP'],
      replyIncludes: ['Netleştirelim', 'Alternatif', 'Planlama Merkezi'],
      replyExcludes: ['Sıradaki doğru işlem', 'Bu ekran,'],
      chipsIncludes: ['Yeni plan oluştur', 'Mevcut planı incele'],
    },
    {
      id: 'company-planning-clarify-2',
      role: 'ORGANIZATION',
      fixture: organizationPlanningFixture,
      message: 'Bunu nasıl yaparsın?',
      expectedQuestionTypes: ['NEXT_STEP'],
      replyIncludes: ['Netleştirelim', 'Alternatif'],
      replyExcludes: ['Sıradaki doğru işlem', 'Bu ekran,'],
      chipsIncludes: ['Teklif / sözleşme hazırlığı'],
    },
    {
      id: 'company-planning-purpose-1',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Bu ekranda neye bakmalıyım?',
      replyIncludes: ['Planlama Merkezi', 'yeni işi kurma', 'Vardiyalar ekranında takip'],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-planning-purpose-2',
      role: 'ORGANIZATION',
      fixture: organizationPlanningFixture,
      message: 'Bu ekran ne için?',
      replyIncludes: ['Planlama Merkezi', 'yeni işi kurma', 'Vardiyalar ekranında takip'],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-planning-next-1',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Sıradaki doğru işlem ne?',
      expectedQuestionTypes: ['NEXT_BEST_ACTION', 'NEXT_STEP'],
      replyAnyOf: [['Sıradaki doğru işlem', 'Şimdi']],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-planning-next-2',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Şimdi ne yapmalıyım?',
      expectedQuestionTypes: ['NEXT_BEST_ACTION', 'NEXT_STEP'],
      replyAnyOf: [['Sıradaki doğru işlem', 'Şimdi']],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-planning-followup-1',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Personelleri ekledim.',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyIncludes: ['Aynı plan akışından devam edelim', 'adres / konum', 'durak', 'rota önizlemesini', 'vardiyayı oluşturup'],
      chipsIncludes: ['Devam et', 'Yaptım', 'Bulamadım', 'Detayını anlat'],
    },
    {
      id: 'company-operations-next-1',
      role: 'COMPANY',
      fixture: companyOperationsFixture,
      message: 'ne yapayım',
      expectedQuestionTypes: ['NEXT_STEP'],
      replyAnyOf: [['Sıradaki doğru işlem', 'Şimdi']],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-operations-next-2',
      role: 'COMPANY',
      fixture: companyOperationsFixture,
      message: 'şimdi ne yapayım',
      expectedQuestionTypes: ['NEXT_STEP'],
      replyAnyOf: [['Sıradaki doğru işlem', 'Şimdi']],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-operations-clarify-1',
      role: 'COMPANY',
      fixture: companyOperationsFixture,
      message: 'Bunu ne yapacağım?',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyIncludes: ['Bu operasyon kaydında', 'açık işi', 'sorumlu rolü', 'sonraki adımı'],
      replyExcludes: ['Sıradaki doğru işlem', 'Şimdi'],
    },
    {
      id: 'company-operations-followup-1',
      role: 'COMPANY',
      fixture: companyOperationsFixture,
      message: 'tamam',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyIncludes: ['Aynı operasyon akışından devam edelim', 'açık iş', 'sorumlu rol', 'risk'],
      chipsIncludes: ['Devam et', 'İlgili kartı aç', 'Sorumlu rol', 'Risk'],
    },
    {
      id: 'company-shifts-detail-1',
      role: 'COMPANY',
      fixture: companyShiftsFixture,
      message: 'ne yapayım',
      expectedQuestionTypes: ['DETAIL_FLOW'],
      replyAnyOf: [['Aynı vardiya', 'Şimdi', 'Devam']],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-shifts-detail-2',
      role: 'COMPANY',
      fixture: companyShiftsFixture,
      message: 'devam et',
      replyAnyOf: [['Aynı vardiya', 'Şimdi', 'Devam']],
      replyExcludes: ['Netleştirelim'],
    },
    {
      id: 'company-planning-followup-2',
      role: 'COMPANY',
      fixture: companyPlanningFixture,
      message: 'Ekledim.',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyIncludes: ['Aynı plan akışından devam edelim', 'adres / konum', 'durak', 'rota önizlemesini', 'vardiyayı oluşturup'],
      chipsIncludes: ['Devam et', 'Yaptım', 'Bulamadım', 'Detayını anlat'],
    },
    {
      id: 'company-agreements-compare-1',
      role: 'COMPANY',
      fixture: companyAgreementsFixture,
      message: 'Hangisini seçeyim?',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyIncludes: ['Teklifi hangi açıdan kıyaslayayım', 'fiyat', 'süre', 'risk', 'sözleşme uygunluğu'],
    },
    {
      id: 'room-shifts-clarify-1',
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'İlgili durumu sor',
      replyIncludes: ['Netleştirelim', 'canlı başlatma', 'araç-sürücü', 'eksik bilgi'],
      chipsIncludes: ['Canlı başlatma zamanı', 'Araç / sürücü'],
    },
    {
      id: 'room-shifts-clarify-2',
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'Bunu başlatayım mı?',
      replyIncludes: ['canlı başlatma', 'araç-sürücü', 'eksik bilgi'],
      chipsIncludes: ['Canlı başlatma zamanı', 'Araç / sürücü'],
    },
    {
      id: 'room-vehicles-context-1',
      role: 'ROOM',
      fixture: roomVehiclesFixture,
      message: 'Bunu başlatayım mı?',
      replyIncludes: ['Netleştirelim', 'Seçili araç'],
      replyAnyOf: [['konum sinyali', 'sürücü', 'son konum bilgisi']],
      chipsIncludes: ['Konum sinyali', 'Sürücü', 'Son konum'],
    },
    {
      id: 'room-vehicles-context-2',
      role: 'ROOM',
      fixture: roomVehiclesFixture,
      message: 'Niye yok?',
      replyIncludes: ['Netleştirelim', 'Seçili araç'],
      replyAnyOf: [['konum sinyali', 'sürücü', 'son konum bilgisi']],
      chipsIncludes: ['Konum sinyali', 'Sürücü', 'Son konum'],
    },
    {
      id: 'room-vehicles-context-3',
      role: 'ROOM',
      fixture: roomVehiclesFixture,
      message: 'Görünmüyor.',
      replyIncludes: ['Seçili araç', 'konum sinyali', 'sürücü'],
      replyAnyOf: [['son konum bilgisi', 'durak']],
      chipsIncludes: ['Konum sinyali', 'Sürücü', 'Son konum', 'Durak'],
    },
    {
      id: 'personel-live-diagnostic-1',
      role: 'PERSONEL',
      fixture: personelLiveFixture,
      message: 'Servis neden görünmüyor?',
      expectedQuestionTypes: ['LOCATION_HELP', 'SCREEN_PURPOSE'],
      replyIncludes: ['servis görünmüyorsa', 'son konum bilgisi', 'araç bağlantısı'],
      replyExcludes: ['Netleştirelim'],
      chipsIncludes: ['Son konum bilgisi', 'Sürücünün telefonundan konum sinyali'],
    },
    {
      id: 'personel-live-diagnostic-2',
      role: 'PERSONEL',
      fixture: makeSurfaceFixture({
        path: '/personel/live',
        label: 'Personel Canlı',
        menuPurpose: 'Personel servis durumu ve canlı konum için kullanılır.',
        firstStep: 'Servis durumunu aç.',
        nextStep: 'Son GPS ve servis durumunu kontrol et.',
        selectedLabel: '',
        selectedSummary: '',
        selectedRecordStatus: '',
        selectedEntityType: '',
        selectedEntityId: 0,
      }),
      message: 'Servis neden görünmüyor?',
      expectedQuestionTypes: ['LOCATION_HELP', 'SCREEN_PURPOSE'],
      replyIncludes: ['servis görünmüyorsa', 'son konum bilgisi', 'araç bağlantısı'],
      replyExcludes: ['Netleştirelim'],
      chipsIncludes: ['Son konum bilgisi', 'Sürücünün telefonundan konum sinyali'],
    },
    {
      id: 'personel-live-ambiguous-1',
      role: 'PERSONEL',
      fixture: personelLiveFixture,
      message: 'niye yok?',
      replyIncludes: ['Personel Canlı', 'servis', 'araç', 'durak', 'saat'],
      chipsIncludes: ['Servis', 'Araç', 'Durak', 'Saat'],
    },
    {
      id: 'personel-live-ambiguous-2',
      role: 'PERSONEL',
      fixture: makeSurfaceFixture({
        path: '/personel/my',
        label: 'Benim Servisim',
        menuPurpose: 'Kendi servis durumunu takip etmek için kullanılır.',
        firstStep: 'Servis durumunu aç.',
        nextStep: 'Son GPS ve servis durumunu kontrol et.',
        selectedLabel: 'Servis 22',
        selectedSummary: 'Kendi servis kaydı',
        selectedRecordStatus: 'Kabul Edildi / APPROVED',
        selectedEntityType: 'service',
        selectedEntityId: 22,
      }),
      message: 'neden yok?',
      replyIncludes: ['Personel Canlı', 'servis', 'araç', 'durak', 'saat'],
      chipsIncludes: ['Servis', 'Araç', 'Durak', 'Saat'],
    },
    {
      id: 'personel-live-diagnostic-3',
      role: 'PERSONEL',
      fixture: personelLiveFixture,
      message: 'Görünmüyor.',
      expectedQuestionTypes: ['LOCATION_HELP', 'SCREEN_PURPOSE'],
      replyIncludes: ['Personel Canlı ekranında', 'servis kaydı', 'son konum bilgisi', 'araç bağlantısı', 'durak'],
      replyExcludes: ['Netleştirelim'],
      chipsIncludes: ['Son konum bilgisi', 'Sürücünün telefonundan konum sinyali'],
    },
    {
      id: 'parent-live-clarify-1',
      role: 'PARENT',
      fixture: parentLiveFixture,
      message: 'Gelmedi mi?',
      replyIncludes: ['Netleştirelim', 'araç konumu', 'servis saati', 'bağlı vardiya'],
      chipsIncludes: ['Araç konumu', 'Servis saati', 'Bağlı vardiya'],
    },
    {
      id: 'parent-live-clarify-2',
      role: 'PARENT',
      fixture: parentLiveFixture,
      message: 'Niye yok?',
      replyIncludes: ['Netleştirelim', 'araç konumu', 'servis saati', 'bağlı vardiya'],
      chipsIncludes: ['Araç konumu', 'Servis saati', 'Bağlı vardiya'],
    },
    {
      id: 'parent-live-clarify-3',
      role: 'PARENT',
      fixture: parentLiveFixture,
      message: 'Gelmedi.',
      replyIncludes: ['araç konumu', 'servis saati', 'bağlı vardiya'],
      chipsIncludes: ['Araç konumu', 'Servis saati', 'Bağlı vardiya'],
    },
    {
      id: 'driver-route-clarify-1',
      role: 'DRIVER',
      fixture: driverRouteFixture,
      message: 'Geldim.',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyIncludes: ['Rota 12', 'durak', 'şirket/varış', 'tamamlanma', 'yazma işlemi'],
    },
    {
      id: 'driver-route-clarify-2',
      role: 'DRIVER',
      fixture: driverRouteFixture,
      message: 'tamam',
      expectedQuestionTypes: ['SCREEN_PURPOSE'],
      replyIncludes: ['Devam edelim', 'durak sırası', 'şirket/varış', 'tamamlanma durumunu', 'yazma işlemi'],
    },
    {
      id: 'feedback-generic-1',
      role: 'COMPANY',
      fixture: feedbackFixture,
      message: 'Bu ne?',
      replyIncludes: ['Netleştirelim', 'Seçili geri bildirim'],
      replyExcludes: ['Bu ekran,'],
      chipsIncludes: ['Açık durum', 'Sorumlu rol'],
      chipsExcludes: ['Bu ekranı detaylı anlat', 'Aynı kayıt için devam et', 'Ekran rehberini aç'],
    },
    {
      id: 'feedback-generic-2',
      role: 'COMPANY',
      fixture: feedbackFixture,
      message: 'Bu ekranda neye bakmalıyım?',
      replyIncludes: ['Netleştirelim', 'Seçili geri bildirim'],
      replyExcludes: ['Bu ekran,'],
      chipsIncludes: ['Açık durum', 'Sorumlu rol'],
      chipsExcludes: ['Bu ekranı detaylı anlat', 'Aynı kayıt için devam et', 'Ekran rehberini aç'],
    },
    {
      id: 'feedback-followup-1',
      role: 'COMPANY',
      fixture: feedbackFixture,
      message: 'yaptım',
      replyIncludes: ['Devam edelim', 'Seçili geri bildirim', 'açık durum', 'sorumlu rol'],
      chipsIncludes: ['Açık durum', 'Sorumlu rol', 'Son işlem', 'Notlar'],
    },
    {
      id: 'feedback-followup-2',
      role: 'COMPANY',
      fixture: feedbackFixture,
      message: 'tamam',
      replyIncludes: ['Devam edelim', 'Seçili geri bildirim', 'açık durum', 'sorumlu rol'],
      chipsIncludes: ['Açık durum', 'Sorumlu rol', 'Son işlem', 'Notlar'],
    },
    {
      id: 'followup-continue-1',
      role: 'COMPANY',
      fixture: companyShiftsFixture,
      message: 'Devamını anlat',
      conversationState: followUpState,
      replyAnyOf: [['Devam', 'Şimdi', 'detay']],
    },
    {
      id: 'followup-continue-2',
      role: 'COMPANY',
      fixture: companyShiftsFixture,
      message: 'yaptım',
      conversationState: followUpState,
      replyAnyOf: [['Devam', 'Şimdi', 'sonraki güvenli adım']],
    },
    {
      id: 'followup-continue-3',
      role: 'COMPANY',
      fixture: companyShiftsFixture,
      message: 'tamam',
      conversationState: followUpState,
      replyAnyOf: [['Devam', 'Şimdi', 'sonraki güvenli adım']],
    },
    {
      id: 'followup-continue-4',
      role: 'COMPANY',
      fixture: companyShiftsFixture,
      message: 'bulamadım',
      conversationState: followUpState,
      replyAnyOf: [['alternatif', 'devam', 'şimdi']],
    },
    {
      id: 'organization-planning-clarify-1',
      role: 'ORGANIZATION',
      fixture: organizationPlanningFixture,
      message: 'Bunu nasıl yapacağım?',
      expectedQuestionTypes: ['NEXT_STEP'],
      replyIncludes: ['Netleştirelim', 'Alternatif'],
      chipsIncludes: ['Yeni plan oluştur', 'Teklif / sözleşme hazırlığı'],
    },
    {
      id: 'organization-planning-purpose-1',
      role: 'ORGANIZATION',
      fixture: organizationPlanningFixture,
      message: 'Bu ekran ne için?',
      replyIncludes: ['Planlama Merkezi', 'yeni işi kurma', 'Vardiyalar ekranında takip'],
      replyExcludes: ['Netleştirelim'],
    },
  ];

  const cases = runtimeCases.map((item) => ({ ...item, phase: 'runtime' }));

  if (runtimeCases.length < 40) {
    throw new Error(`Expected at least 40 runtime cases, got ${runtimeCases.length}`);
  }

  let passCount = 0;
  const failures = [];

  for (const [index, testCase] of cases.entries()) {
    const result = runCase(testCase);
    const label = `${String(index + 1).padStart(2, '0')} ${testCase.phase} ${testCase.id}`;
    if (result.issues.length === 0) {
      passCount += 1;
      console.log(`PASS ${label}`);
      continue;
    }
    failures.push({
      index: index + 1,
      label,
      testCase,
      result,
    });
    console.log(`FAIL ${label}`);
  }

  console.log(`runtimeCases: ${runtimeCases.length}`);
  console.log(`testedCases: ${cases.length}`);
  console.log(`passCount: ${passCount}`);
  console.log(`failCount: ${failures.length}`);

  for (const failure of failures) {
    const { testCase, result } = failure;
    console.log(`FAIL CASE ${failure.index} ${failure.label}`);
    console.log(`role: ${testCase.role}`);
    console.log(`screen: ${testCase.fixture?.screenContext?.label || ''} (${testCase.fixture?.screenContext?.path || ''})`);
    console.log(`question: ${testCase.message}`);
    console.log(`expected questionType: ${normalizeList(testCase.expectedQuestionTypes).join(' | ') || 'n/a'}`);
    console.log(`expected reply includes: ${normalizeList(testCase.replyIncludes).join(' | ') || 'n/a'}`);
    console.log(`expected reply excludes: ${normalizeList(testCase.replyExcludes).join(' | ') || 'n/a'}`);
    console.log(`expected chips includes: ${normalizeList(testCase.chipsIncludes).join(' | ') || 'n/a'}`);
    console.log(`expected assistant chips includes: ${normalizeList(testCase.assistantChipsIncludes).join(' | ') || 'n/a'}`);
    console.log(`actual questionType: ${String(result.response?.questionType || '')}`);
    console.log(`actual reply: ${excerpt(result.reply)}`);
    console.log(`actual chips: ${(result.chips || []).join(' | ')}`);
    console.log(`actual assistant chips: ${(result.assistantChips || []).join(' | ')}`);
    console.log(`issues: ${result.issues.join(' || ')}`);
  }

  if (failures.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PASS COPILOT-DYNAMIC-QUESTION-ENGINE-01 (${runtimeCases.length} cases)`);
}

Promise.resolve(main()).catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
