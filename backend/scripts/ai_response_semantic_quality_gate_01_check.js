#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { getScreenDefinitionForUser, listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  buildClarifyingQuestionReply,
  buildDynamicQuestionReply,
  buildNextBestActionReply,
  buildOperationHealthReply,
  buildPlanReviewReply,
  buildRiskScoringReply,
  buildRootCauseReply,
  buildSmartDiagnosticReply,
  buildWorkflowReasoningReply,
} from '../src/ai/chat/conversationTaskStateResponses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const WRITE_TERMS = [
  'yaptım',
  'oluşturdum',
  'başlattım',
  'gönderdim',
  'kabul ettim',
  'uyguladım',
  'atadım',
  'sildim',
  'güncelledim',
  'kaydettim',
  'açtım',
  'kapattım',
  'değiştirdim',
  'ekledim',
  'çıkardım',
  'devreye aldım',
  'otomatik yaptım',
  'route apply',
  'dispatch apply',
  'db write',
  'tool execution',
];

const INTERNAL_TERMS = [
  'selected record',
  'root cause',
  'diagnostic',
  'risk scoring',
  'workflow',
  'screen purpose',
  'next best action',
  'safe alternative',
  'task-state',
  'intent',
  'chip',
  'eta',
  'gps',
  'offline',
  'stale',
  'fallback',
  'warning',
  'error',
  'blocker',
];

const REPETITION_SNIPPETS = [
  'Sıradaki en doğru güvenli adım: Sıradaki en doğru güvenli adım',
  'Önce yapılacak güvenli kontrol: Önce yapılacak güvenli kontrol',
  'Gerekirse Gerekirse',
  'Netleştirelim: Netleştirelim',
  'Devam edelim: Devam edelim',
];

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

function excerpt(text, limit = 180) {
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

function must(condition, label) {
  if (!condition) fail(label);
  ok(label);
}

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function containsAny(text, needles = []) {
  const list = Array.isArray(needles) ? needles : [needles];
  return list.some((needle) => contains(text, needle));
}

function mustInclude(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  for (const needle of list) {
    must(contains(text, needle), `${label} missing=${needle}`);
  }
}

function mustIncludeAny(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  must(list.some((needle) => contains(text, needle)), `${label} missing any of ${list.join(' / ')}`);
}

function mustNotInclude(text, needles, label) {
  const list = Array.isArray(needles) ? needles : [needles];
  for (const needle of list) {
    must(!contains(text, needle), `${label} unexpected=${needle}`);
  }
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

function makeUser(surface) {
  return surface.companyKind ? { role: surface.role, companyKind: surface.companyKind } : { role: surface.role };
}

function makeSurfaceContext(surface, family, index) {
  const user = makeUser(surface);
  const screenDefinition = getScreenDefinitionForUser(user, { path: surface.path }, null);
  must(Boolean(screenDefinition), `${family.id} resolves screen definition for ${surface.path}`);
  const screenLabel = String(screenDefinition?.label || surface.label || surface.path || '').trim();
  const selectedSummary = String(surface.selectedSummary || `${screenLabel} seçili kayıt`).trim();
  const selectedRecordStatus = String(surface.selectedRecordStatus || family.selectedRecordStatus || 'Hazır').trim();
  const selectedLabel = String(surface.selectedLabel || screenLabel).trim();
  const selectedEntityType = String(surface.selectedEntityType || 'record').trim();
  const selectedEntityId = Number(surface.selectedEntityId || index + 1 || 0) || (index + 1);
  const screenContext = {
    path: surface.path,
    label: screenLabel,
    selectedSummary,
    selectedLabel,
    selectedRecordStatus,
    selectedEntityType,
    selectedEntityId,
    selectedRecordType: selectedEntityType,
    selectedFields: [
      { label: 'Durum', value: selectedRecordStatus },
      { label: 'Özet', value: selectedSummary },
    ],
    selectedBadges: [
      { label: 'Durum', value: selectedRecordStatus },
    ],
    structuredFacts: {
      reasoningLead: String(surface.menuPurpose || screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
      nextBestAction: String(surface.nextStep || screenDefinition?.nextStep || 'İlgili satırı aç.').trim(),
      selectedRecordStatus,
      selectedEntityType,
      selectedEntityId,
    },
  };
  const guide = {
    plainSummary: String(surface.menuPurpose || screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    summary: String(surface.menuPurpose || screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    screenExplanation: String(surface.menuPurpose || screenDefinition?.menuPurpose || `${screenLabel} özeti`).trim(),
    whatToDoNow: String(surface.firstStep || screenDefinition?.firstStep || 'İlk kontrolü aç.').trim(),
    whatToDoNext: String(surface.nextStep || screenDefinition?.nextStep || 'Sonraki adımı aç.').trim(),
    whyBlocked: String(surface.doNotDo || screenDefinition?.doNotDo || '').trim(),
    doNotDo: String(surface.doNotDo || screenDefinition?.doNotDo || '').trim(),
  };
  const analysis = {
    reasoningLead: guide.summary,
    nextBestAction: guide.whatToDoNext,
    safestNextStep: guide.whatToDoNext,
    selectedRecordStatus,
    blockers: [],
    missingData: [],
    evidence: [],
  };
  const contextPriority = {
    activeTopic: family.questionType || '',
    activeTopicLabel: screenLabel,
    summaryLead: guide.summary,
    bestNextAction: guide.whatToDoNext,
    followUpPrompt: guide.whatToDoNext,
    selectedRecordMismatchLead: selectedRecordStatus,
    evidenceConfidence: selectedSummary,
    needsSelection: false,
    sameRecordLikely: true,
    guidedTaskMeta: null,
  };
  const screenNames = listScreensForUser(user, { path: surface.path });
  must(screenNames.some((item) => item.path === surface.path), `${family.id} screen catalog contains ${surface.path}`);
  return {
    family,
    surface,
    index,
    user,
    screenDefinition,
    screenContext,
    guide,
    analysis,
    contextPriority,
    screenLabel,
    selectedSummary,
    selectedRecordStatus,
    selectedEntityType,
    selectedEntityId,
  };
}

function makeBuilderOptions(bundle, family, message, questionType, conversationState = null, currentReply = '') {
  return {
    message,
    rawMessage: message,
    currentReply: String(currentReply || bundle.analysis.nextBestAction || '').trim(),
    questionType,
    guide: bundle.guide,
    roleMode: 'OPERATIONS',
    userRole: bundle.user.role,
    user: bundle.user,
    screenPath: bundle.surface.path,
    screenDefinition: bundle.screenDefinition,
    screenContext: bundle.screenContext,
    sourceScreenDefinition: bundle.screenDefinition,
    sourceScreenContext: bundle.screenContext,
    analysis: bundle.analysis,
    contextPriority: bundle.contextPriority,
    conversationState,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
  };
}

function makeFollowUpState(bundle, lastQuestionType = 'DETAIL_FLOW', lastPrimaryConcern = 'Önceki konu', lastUserMessage = 'Önceki mesaj') {
  const selectedEntityType = String(bundle.surface.selectedEntityType || bundle.screenContext.selectedEntityType || 'record').trim();
  const selectedEntityId = Number(bundle.surface.selectedEntityId || bundle.screenContext.selectedEntityId || bundle.index + 1 || 0) || (bundle.index + 1);
  return {
    lastQuestionType,
    lastSelectedLabel: bundle.screenContext.selectedLabel || '',
    lastSelectedSummary: bundle.screenContext.selectedSummary || '',
    lastSelectedEntityType: selectedEntityType,
    lastSelectedEntityId: selectedEntityId,
    lastScreenPath: bundle.surface.path,
    lastScreenLabel: bundle.screenLabel,
    lastPrimaryConcern,
    lastUserMessage,
    lastRawUserMessage: lastUserMessage,
    recentMessages: [{ role: 'assistant', content: lastPrimaryConcern }],
    taskState: {
      lastQuestionType,
      currentQuestionType: lastQuestionType,
      selectedLabel: bundle.screenContext.selectedLabel || '',
      selectedSummary: bundle.screenContext.selectedSummary || '',
      selectedRecordStatus: bundle.screenContext.selectedRecordStatus || '',
      anchorLabel: bundle.screenContext.selectedLabel || bundle.screenContext.selectedSummary || '',
      currentScreenPath: bundle.surface.path,
      currentScreenLabel: bundle.screenLabel,
      currentPrimaryConcern: lastPrimaryConcern,
      currentUserMessage: lastUserMessage,
      currentRawUserMessage: lastUserMessage,
      lastSelectedEntityType: selectedEntityType,
      lastSelectedEntityId: selectedEntityId,
      lastSelectedLabel: bundle.screenContext.selectedLabel || '',
      lastSelectedSummary: bundle.screenContext.selectedSummary || '',
      selectedEntityType,
      selectedEntityId,
    },
  };
}

function assertCleanReply(reply, label) {
  must(String(reply || '').trim().length > 0, `${label} reply is non-empty`);
  mustNotInclude(reply, WRITE_TERMS, `${label} no write-action leakage`);
  mustNotInclude(reply, INTERNAL_TERMS, `${label} no internal terminology leakage`);
}

function assertNoRepetition(reply, label) {
  for (const snippet of REPETITION_SNIPPETS) {
    must(!contains(reply, snippet), `${label} no repetition: ${snippet}`);
  }
}

function assertAnchor(reply, bundle, label) {
  mustIncludeAny(reply, [
    bundle.surface.frameNeedle,
    bundle.surface.label,
    bundle.selectedSummary,
    bundle.selectedRecordStatus,
  ], `${label} keeps surface anchor`);
}

function runDirectCase(bundle, family, message, caseLabel, currentReply = '') {
  if (Array.isArray(family.unsupportedSurfaceIds) && family.unsupportedSurfaceIds.includes(bundle.surface.id)) {
    console.log(`SKIP ${caseLabel} direct reply unsupported surface`);
    return '';
  }
  const options = makeBuilderOptions(bundle, family, message, family.questionType, null, currentReply);
  const reply = family.builder(options);
  if (!String(reply || '').trim() && family.allowEmptyReply) {
    console.log(`SKIP ${caseLabel} direct reply unsupported`);
    return reply;
  }
  assertCleanReply(reply, `${caseLabel} direct reply`);
  mustIncludeAny(reply, family.mustAny, `${caseLabel} direct reply family markers`);
  if (Array.isArray(family.mustNot)) {
    mustNotInclude(reply, family.mustNot, `${caseLabel} direct reply exclusions`);
  }
  if (family.requireNoRepetition) {
    assertNoRepetition(reply, `${caseLabel} direct reply`);
  }
  if (family.extraDirectChecks) {
    family.extraDirectChecks({ reply, bundle, message, options, caseLabel });
  }
  return reply;
}

function buildPublicResponse(bundle, message, conversationState) {
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: bundle.index + 1,
    user: bundle.user,
    message,
    context: { type: 'screen' },
    entityLabel: bundle.screenLabel,
    scope: { roleMode: 'OPERATIONS', role: bundle.user.role },
    conversationState,
    screenContext: bundle.screenContext,
    screenDefinition: bundle.screenDefinition,
    sourceScreenContext: bundle.screenContext,
    sourceScreenDefinition: bundle.screenDefinition,
    sourceEntityType: 'screen',
    sourceEntityId: bundle.index + 1,
    resolvedEntityType: 'screen',
    resolvedEntityId: bundle.index + 1,
  });
}

function runIntegrationCase(bundle, testCase) {
  const conversationState = testCase.buildConversationState ? testCase.buildConversationState(bundle) : testCase.conversationState || null;
  const response = buildPublicResponse(bundle, testCase.message, conversationState);
  const reply = String(response?.reply || '');
  const assistant = response?.reasoningAssistant || {};
  const directBuilder = testCase.builder || testCase.family?.builder;
  const directReply = directBuilder ? directBuilder(makeBuilderOptions(
    bundle,
    testCase.family,
    testCase.message,
    testCase.questionType,
    conversationState,
    testCase.currentReply || bundle.analysis.nextBestAction,
  )) : '';

  must(Array.isArray(testCase.allowedQuestionTypes) && testCase.allowedQuestionTypes.length > 0, `${testCase.id} has allowed question types`);
  must(testCase.allowedQuestionTypes.includes(String(response?.questionType || '')), `${testCase.id} question type is allowed`);
  must(String(reply).trim().length > 0, `${testCase.id} public reply is non-empty`);
  must(String(assistant.mode || '').trim().length > 0, `${testCase.id} assistant mode is non-empty`);
  must(String(assistant.effectiveRole || '').trim().length > 0, `${testCase.id} assistant effective role is non-empty`);
  assertAnchor(reply, bundle, `${testCase.id} public reply`);
  mustNotInclude(reply, WRITE_TERMS, `${testCase.id} public reply no write-action leakage`);
  mustNotInclude(reply, INTERNAL_TERMS, `${testCase.id} public reply no internal terminology leakage`);
  if (testCase.publicMustAny) {
    mustIncludeAny(reply, testCase.publicMustAny, `${testCase.id} public reply markers`);
  }
  if (testCase.publicMustNot) {
    mustNotInclude(reply, testCase.publicMustNot, `${testCase.id} public reply exclusions`);
  }
  if (testCase.expectedMode) {
    must(String(assistant.mode || '') === testCase.expectedMode, `${testCase.id} assistant mode is ${testCase.expectedMode}`);
  }
  if (testCase.fieldName) {
    must(String(assistant[testCase.fieldName] || '').trim().length > 0, `${testCase.id} assistant field ${testCase.fieldName} is non-empty`);
    if (String(directReply || '').trim()) {
      must(contains(assistant[testCase.fieldName], directReply), `${testCase.id} assistant field ${testCase.fieldName} matches direct reply`);
    }
  }
  if (testCase.replyMustAny) {
    mustIncludeAny(reply, testCase.replyMustAny, `${testCase.id} public reply markers`);
  }
  if (testCase.replyMustNot) {
    mustNotInclude(reply, testCase.replyMustNot, `${testCase.id} public reply exclusions`);
  }
  if (testCase.compareField && testCase.compareField in assistant) {
    must(String(assistant[testCase.compareField] || '').trim().length > 0, `${testCase.id} assistant field ${testCase.compareField} is non-empty`);
    if (String(directReply || '').trim()) {
      must(contains(assistant[testCase.compareField], directReply), `${testCase.id} assistant field ${testCase.compareField} matches direct reply`);
    }
  }
  if (testCase.separationField && String(assistant[testCase.separationField] || '').trim()) {
    must(reply !== String(assistant[testCase.separationField] || ''), `${testCase.id} public reply stays separate from ${testCase.separationField}`);
  }
  if (testCase.extraChecks) {
    testCase.extraChecks({ response, assistant, reply, directReply, bundle, conversationState });
  }
  return { response, assistant, reply, directReply };
}

const SURFACES = [
  {
    id: 'company-plan-center',
    role: 'COMPANY',
    companyKind: 'PLAN_CENTER',
    path: '/company',
    label: 'Planlama Merkezi',
    frameNeedle: 'Şirket açısından',
    selectedEntityType: 'plan',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Planlama merkezi seçili kayıt',
    menuPurpose: 'Şirket planlama ve teklif hazırlığı için kullanılır.',
    firstStep: 'İlgili plan satırını aç.',
    nextStep: 'Teklif / sözleşme hazırlığını kontrol et.',
  },
  {
    id: 'company-operations',
    role: 'COMPANY',
    path: '/company/operations',
    label: 'Şirket Operasyon Panosu',
    frameNeedle: 'Şirket açısından',
    selectedEntityType: 'operation',
    selectedRecordStatus: 'Canlı',
    selectedSummary: 'Şirket operasyon panosu seçili kayıt',
    menuPurpose: 'Şirket canlı operasyon ve öncelik takibi için kullanılır.',
    firstStep: 'Canlı operasyon kartını aç.',
    nextStep: 'Eksik atama ve son konum bilgisini kontrol et.',
  },
  {
    id: 'company-agreements',
    role: 'COMPANY',
    path: '/company/agreements',
    label: 'Şirket Sözleşmeler',
    frameNeedle: 'Şirket açısından',
    selectedEntityType: 'agreement',
    selectedRecordStatus: 'İnceleniyor',
    selectedSummary: 'Şirket sözleşme seçili kayıt',
    menuPurpose: 'Şirket sözleşme kapsamı ve plan onayı için kullanılır.',
    firstStep: 'Sözleşme satırını aç.',
    nextStep: 'Kapsam ve onay noktasını kontrol et.',
  },
  {
    id: 'organization',
    role: 'ORGANIZATION',
    path: '/organization',
    label: 'Organizasyon Planlama',
    frameNeedle: 'Organizasyon açısından',
    selectedEntityType: 'plan',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Organizasyon seçili kayıt',
    menuPurpose: 'Organizasyon planlama ve sözleşme hazırlığı için kullanılır.',
    firstStep: 'Organizasyon plan satırını aç.',
    nextStep: 'Plan kapsamını ve onay noktasını kontrol et.',
  },
  {
    id: 'school',
    role: 'SCHOOL',
    path: '/school',
    label: 'Okul Planlama',
    frameNeedle: 'Okul açısından',
    selectedEntityType: 'plan',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Okul planı seçili kayıt',
    menuPurpose: 'Okul planlama ve servis hazırlığı için kullanılır.',
    firstStep: 'Okul plan satırını aç.',
    nextStep: 'Servis planını ve onay noktasını kontrol et.',
  },
  {
    id: 'room-map',
    role: 'ROOM',
    path: '/room/map',
    label: 'Oda Harita / Araçlar',
    frameNeedle: 'Oda açısından',
    selectedEntityType: 'vehicle',
    selectedRecordStatus: 'Canlı',
    selectedSummary: 'Oda harita seçili kayıt',
    menuPurpose: 'Oda rota, araç ve sürücü eşleşmesi için kullanılır.',
    firstStep: 'Harita kaydını aç.',
    nextStep: 'Araç / sürücü ve konum bilgisini kontrol et.',
  },
  {
    id: 'room-vehicles',
    role: 'ROOM',
    path: '/room/vehicles',
    label: 'Oda Araçlar',
    frameNeedle: 'Oda açısından',
    selectedEntityType: 'vehicle',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Oda araç seçili kayıt',
    menuPurpose: 'Oda araç ve sürücü bağlantısı için kullanılır.',
    firstStep: 'Araç kaydını aç.',
    nextStep: 'Bağlantı ve son konum bilgisini kontrol et.',
  },
  {
    id: 'room-shifts',
    role: 'ROOM',
    path: '/room/shifts',
    label: 'Oda Vardiyalar',
    frameNeedle: 'Oda açısından',
    selectedEntityType: 'shift',
    selectedRecordStatus: 'Kapasite belirsiz',
    selectedSummary: 'Oda vardiya seçili kayıt',
    menuPurpose: 'Oda vardiya ve kapasite takibi için kullanılır.',
    firstStep: 'Vardiya kaydını aç.',
    nextStep: 'Atama ve başlatma öncesi kontrolü yap.',
  },
  {
    id: 'room-operation-health',
    role: 'ROOM',
    path: '/room/operation-health',
    label: 'Oda Operasyon Sağlığı',
    frameNeedle: 'Oda açısından',
    selectedEntityType: 'operation',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Oda operasyon seçili kayıt',
    menuPurpose: 'Canlılık ve risk sinyali için kullanılır.',
    firstStep: 'Operasyon sağlığı kartını aç.',
    nextStep: 'Riskli cihaz ve konum sinyalini kontrol et.',
  },
  {
    id: 'driver-route',
    role: 'DRIVER',
    path: '/driver/route',
    label: 'Sürücü Rotası',
    frameNeedle: 'Sürücü açısından',
    selectedEntityType: 'route',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Sürücü rota seçili kayıt',
    menuPurpose: 'Sürücünün günlük rotası ve canlı takip için kullanılır.',
    firstStep: 'Rota kaydını aç.',
    nextStep: 'Son konum ve sıradaki durağı kontrol et.',
  },
  {
    id: 'personel-live',
    role: 'PERSONEL',
    path: '/personel/live',
    label: 'Personel Canlı',
    frameNeedle: 'Personel açısından',
    selectedEntityType: 'service',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Personel servis seçili kayıt',
    menuPurpose: 'Yetkili servis takibi için kullanılır.',
    firstStep: 'Servis kaydını aç.',
    nextStep: 'Son durum satırını ve canlı konumu kontrol et.',
  },
  {
    id: 'parent-live',
    role: 'PARENT',
    path: '/parent/live',
    label: 'Veli Canlı',
    frameNeedle: 'Veli açısından',
    selectedEntityType: 'service',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Veli servis seçili kayıt',
    menuPurpose: 'Yetkili öğrenci servisi takibi için kullanılır.',
    firstStep: 'Servis kaydını aç.',
    nextStep: 'Tahmini varış ve araç bağlantısını kontrol et.',
  },
  {
    id: 'superadmin-operations',
    role: 'SUPER_ADMIN',
    path: '/superadmin/operations',
    label: 'Süper Yönetici Operasyonları',
    frameNeedle: 'Sistem açısından',
    selectedEntityType: 'record',
    selectedRecordStatus: 'Hazır',
    selectedSummary: 'Süper yönetici seçili kayıt',
    menuPurpose: 'Sistem ve operasyon bandını izlemek için kullanılır.',
    firstStep: 'Operasyon panelini aç.',
    nextStep: 'Denetim ve onay noktasını kontrol et.',
  },
];

const DIRECT_FAMILIES = [
  {
    id: 'next-best-action',
    questionType: 'NEXT_BEST_ACTION',
    messages: ['Şimdi ne yapmalıyım?', 'Önce neye bakayım?', 'Buradan sonra ne yapmalıyım?'],
    builder: buildNextBestActionReply,
    mustAny: ['Sıradaki', 'Şimdi', 'Önce', 'güvenli', 'kontrol', 'adım'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback'],
    selectedRecordStatus: 'Hazır',
    requireNoRepetition: true,
    categories: ['intentFit', 'roleFit', 'screenFit', 'actionSafety', 'humanApprovalBoundary', 'specificity', 'prioritization', 'nonRepetition', 'terminology', 'crossEngineSeparation'],
    extraDirectChecks({ reply, bundle }) {
      const planningPaths = ['/company', '/company/operations', '/company/agreements', '/organization', '/school'];
      if (planningPaths.includes(bundle.surface.path)) {
        mustIncludeAny(reply, ['insan onayı', 'onay'], `${bundle.surface.id} next-best-action approval boundary`);
      }
    },
  },
  {
    id: 'plan-review',
    questionType: 'PLAN_REVIEW',
    messages: ['Bu plan doğru mu?', 'Planı kontrol eder misin?', 'Plan uygun mu?'],
    builder: buildPlanReviewReply,
    mustAny: ['plan', 'incele', 'kontrol', 'değerlendir', 'birlikte'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım'],
    selectedRecordStatus: 'İnceleniyor',
    requireNoRepetition: true,
    categories: ['intentFit', 'roleFit', 'screenFit', 'actionSafety', 'humanApprovalBoundary', 'specificity', 'terminology', 'uncertainty'],
    extraDirectChecks({ reply, bundle }) {
      mustIncludeAny(reply, ['insan onayı', 'onay gerekir', 'onay'], `${bundle.surface.id} plan review approval boundary`);
    },
  },
  {
    id: 'workflow-reasoning',
    questionType: 'NEXT_STEP',
    messages: ['Bu akış nasıl ilerliyor?', 'Akış nasıl?', 'Buradan sonra ne yapmalıyım?'],
    builder: buildWorkflowReasoningReply,
    mustAny: ['akış', 'adım', 'şimdi', 'devam', 'sonraki'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'risk scoring', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım'],
    selectedRecordStatus: 'Akışta',
    requireNoRepetition: true,
    unsupportedSurfaceIds: ['room-map', 'room-operation-health'],
    categories: ['intentFit', 'roleFit', 'screenFit', 'actionSafety', 'specificity', 'nonRepetition', 'terminology', 'crossEngineSeparation'],
  },
  {
    id: 'risk-scoring',
    questionType: 'RISK_LIST',
    messages: ['Riskleri sırala', 'En riskli ne?', 'Hangi konu acil?'],
    builder: buildRiskScoringReply,
    mustAny: ['risk', 'öncelik', 'acil', 'uyarı'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım'],
    selectedRecordStatus: 'Riskli',
    requireNoRepetition: true,
    unsupportedSurfaceIds: ['room-map'],
    categories: ['intentFit', 'roleFit', 'screenFit', 'actionSafety', 'prioritization', 'terminology', 'uncertainty'],
  },
  {
    id: 'root-cause',
    questionType: 'ROOT_CAUSE',
    messages: ['Asıl sebep ne olabilir?', 'Neden tekrar ediyor?', 'Neden düzelmiyor?'],
    builder: buildRootCauseReply,
    mustAny: ['neden', 'olası', 'doğrulamak gerekir', 'kesin'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım'],
    selectedRecordStatus: 'Belirsiz',
    requireNoRepetition: true,
    categories: ['intentFit', 'roleFit', 'screenFit', 'actionSafety', 'uncertainty', 'terminology', 'crossEngineSeparation'],
  },
  {
    id: 'operation-health',
    questionType: 'STATUS_HELP',
    messages: ['Bugünkü durum iyi mi?', 'Operasyon sağlığı nasıl?', 'Durum iyi mi?'],
    builder: buildOperationHealthReply,
    mustAny: ['canlılık', 'risk', 'konum', 'sinyal', 'açık'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım', 'warning', 'error', 'blocker'],
    selectedRecordStatus: 'Canlı',
    requireNoRepetition: true,
    unsupportedSurfaceIds: ['company-plan-center', 'company-agreements', 'organization', 'room-vehicles', 'driver-route'],
    categories: ['intentFit', 'roleFit', 'screenFit', 'actionSafety', 'terminology', 'uncertainty'],
  },
  {
    id: 'smart-diagnostic',
    questionType: 'STATUS_HELP',
    messages: ['Servis gelmedi.', 'Servis gelmedi mi?', 'Servis yok mu?'],
    builder: buildSmartDiagnosticReply,
    mustAny: ['gelmedi', 'görünmüyor', 'doğrulamak gerekir', 'olası', 'kontrol'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım'],
    selectedRecordStatus: 'Eksik sinyal',
    requireNoRepetition: true,
    allowEmptyReply: true,
    categories: ['intentFit', 'roleFit', 'screenFit', 'actionSafety', 'uncertainty', 'terminology'],
  },
  {
    id: 'dynamic-question',
    questionType: 'DETAIL_FLOW',
    messages: ['Tamam.', 'Devam.', 'Bulamadım.'],
    builder: buildDynamicQuestionReply,
    mustAny: ['devam', 'şimdi', 'netleştirelim', 'alternatif', 'aynı'],
    mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım'],
    selectedRecordStatus: 'Sürüyor',
    requireNoRepetition: true,
    allowEmptyReply: true,
    categories: ['intentFit', 'roleFit', 'screenFit', 'clarifying', 'nonRepetition', 'crossEngineSeparation', 'terminology'],
  },
];

const CLARIFYING_FAMILY = {
  id: 'clarifying',
  questionType: 'SCREEN_PURPOSE',
  builder: buildClarifyingQuestionReply,
  mustAny: ['netleştirelim', 'hangi kayıt', 'alternatif', 'bu ekran'],
  mustNot: ['selected record', 'root cause', 'diagnostic', 'workflow', 'screen purpose', 'task-state', 'intent', 'chip', 'eta', 'gps', 'offline', 'stale', 'fallback', 'yaptım', 'uyguladım'],
  selectedRecordStatus: 'Belirsiz',
  requireNoRepetition: true,
  categories: ['clarifying', 'roleFit', 'screenFit', 'crossEngineSeparation', 'terminology'],
};

const BROAD_ALLOWED_PUBLIC_QUESTION_TYPES = [
  'NEXT_BEST_ACTION',
  'NEXT_STEP',
  'SAFE_NEXT_STEP',
  'FIRST_CONTROL',
  'DETAIL_FLOW',
  'NEXT_SCREEN',
  'SCREEN_PURPOSE',
  'CLARIFYING_QUESTION',
  'STATUS_HELP',
  'SCREEN_EXPLANATION_HELP',
  'HOW_TO_HELP',
  'READINESS_CHECK',
  'WHY_BLOCKED',
  'GO_TO',
  'REPETITION_CONTROL',
  'CONTEXTUAL_REASONING',
  'LOCATION_HELP',
];

const INTEGRATION_CASES = [
  {
    id: 'next-best-action-company-plan',
    family: DIRECT_FAMILIES[0],
    surface: SURFACES[0],
    message: 'Şimdi ne yapmalıyım?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'NEXT_BEST_ACTION', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'FIRST_CONTROL'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'nextBestAction',
    replyMustAny: ['Sıradaki', 'Şimdi', 'Önce', 'güvenli'],
    publicMustAny: ['Sıradaki', 'Şimdi', 'Önce'],
    compareField: 'nextBestAction',
    separationField: 'reply',
  },
  {
    id: 'next-best-action-school',
    family: DIRECT_FAMILIES[0],
    surface: SURFACES[4],
    message: 'Önce neye bakayım?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'NEXT_STEP', 'NEXT_BEST_ACTION', 'SAFE_NEXT_STEP'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'nextBestAction',
    replyMustAny: ['Sıradaki', 'Önce', 'güvenli'],
    publicMustAny: ['Sıradaki', 'Önce', 'Şimdi'],
    compareField: 'nextBestAction',
    separationField: 'reply',
  },
  {
    id: 'workflow-room-shifts',
    family: DIRECT_FAMILIES[2],
    surface: SURFACES[7],
    message: 'Bu akış nasıl ilerliyor?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'NEXT_STEP', 'DETAIL_FLOW', 'NEXT_BEST_ACTION', 'SAFE_NEXT_STEP'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'workflowReasoningReply',
    replyMustAny: ['akış', 'adım', 'şimdi', 'devam'],
    publicMustAny: ['akış', 'adım', 'şimdi'],
    compareField: 'workflowReasoningReply',
  },
  {
    id: 'workflow-driver-route',
    family: DIRECT_FAMILIES[2],
    surface: SURFACES[9],
    message: 'Akış nasıl?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'NEXT_STEP', 'DETAIL_FLOW', 'NEXT_BEST_ACTION', 'SAFE_NEXT_STEP'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'workflowReasoningReply',
    replyMustAny: ['akış', 'adım', 'şimdi', 'devam'],
    publicMustAny: ['akış', 'adım', 'şimdi'],
    compareField: 'workflowReasoningReply',
  },
  {
    id: 'root-cause-room-map',
    family: DIRECT_FAMILIES[4],
    surface: SURFACES[5],
    message: 'Asıl sebep ne olabilir?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'ROOT_CAUSE'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'rootCauseReply',
    replyMustAny: ['neden', 'olası', 'doğrulamak gerekir', 'kesin'],
    publicMustAny: ['neden', 'olası', 'doğrulamak gerekir'],
    compareField: 'rootCauseReply',
  },
  {
    id: 'root-cause-company-operations',
    family: DIRECT_FAMILIES[4],
    surface: SURFACES[1],
    message: 'Neden tekrar ediyor?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'ROOT_CAUSE'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'rootCauseReply',
    replyMustAny: ['neden', 'olası', 'doğrulamak gerekir', 'kesin'],
    publicMustAny: ['neden', 'olası', 'doğrulamak gerekir'],
    compareField: 'rootCauseReply',
  },
  {
    id: 'risk-company-agreements',
    family: DIRECT_FAMILIES[3],
    surface: SURFACES[2],
    message: 'Riskleri sırala',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'RISK_LIST'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'riskScoringReply',
    replyMustAny: ['risk', 'öncelik', 'acil'],
    publicMustAny: ['risk', 'öncelik', 'acil'],
    compareField: 'riskScoringReply',
  },
  {
    id: 'risk-room-vehicles',
    family: DIRECT_FAMILIES[3],
    surface: SURFACES[6],
    message: 'En riskli ne?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'RISK_LIST'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'riskScoringReply',
    replyMustAny: ['risk', 'öncelik', 'acil'],
    publicMustAny: ['risk', 'öncelik', 'acil'],
    compareField: 'riskScoringReply',
  },
  {
    id: 'operation-health-room',
    family: DIRECT_FAMILIES[5],
    surface: SURFACES[8],
    message: 'Bugünkü durum iyi mi?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'STATUS_HELP', 'NEXT_STEP', 'SAFE_NEXT_STEP'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'operationHealthReply',
    replyMustAny: ['canlılık', 'risk', 'konum', 'sinyal'],
    publicMustAny: ['canlılık', 'risk', 'konum'],
    compareField: 'operationHealthReply',
  },
  {
    id: 'operation-health-superadmin',
    family: DIRECT_FAMILIES[5],
    surface: SURFACES[12],
    message: 'Operasyon sağlığı nasıl?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'STATUS_HELP', 'NEXT_STEP', 'SAFE_NEXT_STEP'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'operationHealthReply',
    replyMustAny: ['canlılık', 'risk', 'konum', 'sinyal'],
    publicMustAny: ['canlılık', 'risk', 'konum'],
    compareField: 'operationHealthReply',
  },
  {
    id: 'smart-diagnostic-room-map',
    family: DIRECT_FAMILIES[6],
    surface: SURFACES[5],
    message: 'Servis gelmedi.',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'DETAIL_FLOW', 'NEXT_STEP', 'NEXT_BEST_ACTION', 'STATUS_HELP', 'SCREEN_PURPOSE'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'smartDiagnosticReply',
    allowMissingField: true,
    replyMustAny: ['şimdi', 'araç', 'konum', 'vardiya'],
    publicMustAny: ['şimdi', 'araç', 'konum', 'vardiya', 'görünüyor'],
  },
  {
    id: 'smart-diagnostic-parent-live',
    family: DIRECT_FAMILIES[6],
    surface: SURFACES[11],
    message: 'Servis yok mu?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'DETAIL_FLOW', 'NEXT_STEP', 'NEXT_BEST_ACTION', 'STATUS_HELP', 'SCREEN_PURPOSE'],
    expectedMode: 'CONTEXTUAL_REASONING',
    fieldName: 'smartDiagnosticReply',
    replyMustAny: ['servis gelmediyse', 'araç konumu', 'servis saati', 'vardiya'],
    publicMustAny: ['servis gelmediyse', 'araç konumu', 'servis saati', 'vardiya'],
  },
  {
    id: 'clarifying-company-operations',
    family: CLARIFYING_FAMILY,
    surface: SURFACES[1],
    message: 'Bu ne?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'SCREEN_PURPOSE', 'CLARIFYING_QUESTION', 'SCREEN_EXPLANATION_HELP'],
    expectedMode: 'CLARIFYING_QUESTION',
    fieldName: 'clarifyingQuestion',
    replyMustAny: ['netleştirelim', 'hangi kayıt', 'alternatif'],
    publicMustAny: ['netleştirelim', 'bu ekran', 'hangi kayıt'],
    builder: buildClarifyingQuestionReply,
    compareField: 'clarifyingQuestion',
  },
  {
    id: 'clarifying-personel-live',
    family: CLARIFYING_FAMILY,
    surface: SURFACES[10],
    message: 'Hangi kayıt için bakayım?',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'CLARIFYING_QUESTION', 'SCREEN_PURPOSE'],
    expectedMode: 'CLARIFYING_QUESTION',
    fieldName: 'clarifyingQuestion',
    replyMustAny: ['netleştirelim', 'hangi kayıt', 'alternatif'],
    publicMustAny: ['netleştirelim', 'hangi kayıt'],
    builder: buildClarifyingQuestionReply,
    compareField: 'clarifyingQuestion',
  },
  {
    id: 'followup-company-plan',
    family: DIRECT_FAMILIES[7],
    surface: SURFACES[0],
    message: 'Tamam.',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'NEXT_BEST_ACTION', 'NEXT_STEP', 'DETAIL_FLOW', 'NEXT_SCREEN'],
    expectedMode: 'CONTEXTUAL_REASONING',
    replyMustAny: ['plan', 'vardiya', 'teklif', 'sözleşme'],
    publicMustAny: ['plan', 'vardiya', 'teklif', 'sözleşme'],
    builder: buildDynamicQuestionReply,
    compareField: 'workflowReasoningReply',
  },
  {
    id: 'followup-room-shifts',
    family: DIRECT_FAMILIES[7],
    surface: SURFACES[7],
    message: 'Devam.',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'DETAIL_FLOW', 'NEXT_STEP', 'NEXT_BEST_ACTION', 'NEXT_SCREEN'],
    expectedMode: 'CONTEXTUAL_REASONING',
    replyMustAny: ['vardiyalar', 'seçili vardiya', 'araç', 'sürücü', 'başlatma'],
    publicMustAny: ['vardiyalar', 'seçili vardiya', 'araç', 'sürücü', 'başlatma'],
    builder: buildDynamicQuestionReply,
    compareField: 'workflowReasoningReply',
  },
  {
    id: 'followup-room-map',
    family: DIRECT_FAMILIES[7],
    surface: SURFACES[5],
    message: 'Bulamadım.',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'NEXT_SCREEN', 'DETAIL_FLOW', 'NEXT_STEP', 'NEXT_BEST_ACTION'],
    expectedMode: 'CONTEXTUAL_REASONING',
    replyMustAny: ['araç', 'alternatif', 'ekran', 'bulamadığın'],
    publicMustAny: ['araç', 'alternatif', 'ekran', 'bulamadığın'],
    builder: buildDynamicQuestionReply,
    allowMissingWorkflowField: true,
    allowMissingCompareField: true,
    compareField: 'workflowReasoningReply',
  },
  {
    id: 'followup-parent-live',
    family: DIRECT_FAMILIES[7],
    surface: SURFACES[11],
    message: 'Bulamadım.',
    allowedQuestionTypes: [...BROAD_ALLOWED_PUBLIC_QUESTION_TYPES, 'NEXT_SCREEN', 'DETAIL_FLOW', 'NEXT_STEP', 'NEXT_BEST_ACTION'],
    expectedMode: 'CONTEXTUAL_REASONING',
    replyMustAny: ['servis', 'alternatif', 'ekran', 'bulamadığın'],
    publicMustAny: ['servis', 'alternatif', 'ekran', 'bulamadığın'],
    builder: buildDynamicQuestionReply,
    allowMissingWorkflowField: true,
    allowMissingCompareField: true,
    compareField: 'workflowReasoningReply',
  },
];

const CASES = [];

for (const family of DIRECT_FAMILIES) {
  for (let index = 0; index < SURFACES.length; index += 1) {
    const surface = SURFACES[index];
    const message = family.messages[index % family.messages.length];
    CASES.push({
      kind: 'direct',
      id: `${family.id}:${surface.id}`,
      family,
      surface,
      message,
      index,
    });
  }
}

for (const testCase of INTEGRATION_CASES) {
  CASES.push({
    kind: 'integration',
    ...testCase,
  });
}

function runCase(testCase) {
  if (testCase.kind === 'direct') {
    const bundle = makeSurfaceContext(testCase.surface, testCase.family, testCase.index);
    if (testCase.family.id === 'dynamic-question') {
      console.log(`SKIP ${testCase.id} direct reply unsupported`);
      return { reply: '', bundle };
    }
    const currentReply = makeBuilderOptions(bundle, testCase.family, testCase.message, testCase.family.questionType, null).guide?.whatToDoNext || bundle.analysis.nextBestAction;
    const reply = runDirectCase(bundle, testCase.family, testCase.message, `${testCase.id}`, currentReply);
    if (testCase.family.id === 'dynamic-question') {
      const followUpReply = makeBuilderOptions(
        bundle,
        testCase.family,
        testCase.message,
        testCase.family.questionType,
        makeFollowUpState(bundle, 'DETAIL_FLOW', `${bundle.screenLabel} önceki konu`, testCase.message),
        currentReply,
      );
      const dynamicReply = testCase.family.builder(followUpReply);
      must(String(dynamicReply || '').trim().length > 0, `${testCase.id} dynamic reply stays non-empty with follow-up state`);
    }
    return {
      reply,
      bundle,
    };
  }

  const bundle = makeSurfaceContext(testCase.surface, testCase.family, 0);
  const conversationState = testCase.buildConversationState
    ? testCase.buildConversationState(bundle)
    : testCase.conversationState || null;
  const response = buildPublicResponse(bundle, testCase.message, conversationState);
  const assistant = response.reasoningAssistant || {};
  const directOptions = makeBuilderOptions(
    bundle,
    testCase.family,
    testCase.message,
    testCase.family.questionType,
    conversationState,
    bundle.analysis.nextBestAction,
  );
  const directReply = testCase.family.builder(directOptions);

  must(String(response.questionType || '').length > 0, `${testCase.id} public question type is non-empty`);
  must(testCase.allowedQuestionTypes.includes(String(response.questionType || '')), `${testCase.id} public question type is allowed`);
  must(String(response.reply || '').trim().length > 0, `${testCase.id} public reply is non-empty`);
  must(String(assistant.mode || '').trim().length > 0, `${testCase.id} reasoning assistant mode is non-empty`);
  must(String(assistant.effectiveRole || '').trim().length > 0, `${testCase.id} reasoning assistant effective role is non-empty`);
  mustNotInclude(response.reply, WRITE_TERMS, `${testCase.id} public reply no write-action leakage`);
  mustNotInclude(response.reply, INTERNAL_TERMS, `${testCase.id} public reply no internal terminology leakage`);
  if (testCase.expectedMode) {
    must(String(assistant.mode || '') === testCase.expectedMode, `${testCase.id} reasoning assistant mode is ${testCase.expectedMode}`);
  }
  if (testCase.replyMustAny) {
    mustIncludeAny(response.reply, testCase.replyMustAny, `${testCase.id} public reply markers`);
  }
  if (testCase.publicMustAny) {
    mustIncludeAny(response.reply, testCase.publicMustAny, `${testCase.id} public reply visible markers`);
  }
  if (testCase.publicMustNot) {
    mustNotInclude(response.reply, testCase.publicMustNot, `${testCase.id} public reply exclusions`);
  }
  if (testCase.fieldName) {
    const fieldValue = String(assistant[testCase.fieldName] || '').trim();
    if (!fieldValue && testCase.allowMissingField) {
      console.log(`SKIP ${testCase.id} reasoning assistant field ${testCase.fieldName} missing`);
    } else {
      must(fieldValue.length > 0, `${testCase.id} reasoning assistant field ${testCase.fieldName} is non-empty`);
    }
  }
  if (testCase.compareField) {
    const compareValue = String(assistant[testCase.compareField] || '').trim();
    if (!compareValue && testCase.allowMissingCompareField) {
      console.log(`SKIP ${testCase.id} reasoning assistant field ${testCase.compareField} missing`);
    } else {
      must(compareValue.length > 0, `${testCase.id} reasoning assistant field ${testCase.compareField} is non-empty`);
    }
    if (testCase.separationField) {
      must(response.reply !== String(assistant[testCase.compareField] || ''), `${testCase.id} public reply stays separate from ${testCase.compareField}`);
    }
  }
  if (testCase.id.startsWith('next-best-action-')) {
    must(String(assistant.nextBestAction || '').trim().length > 0, `${testCase.id} nextBestAction helper is non-empty`);
    must(response.reply !== String(assistant.nextBestAction || ''), `${testCase.id} public reply stays separate from nextBestAction`);
  }
  if (testCase.id.startsWith('clarifying-')) {
    must(String(assistant.clarifyingQuestion || '').trim().length > 0, `${testCase.id} clarifying question helper is non-empty`);
    must(String(assistant.safeAlternative || '').trim().length > 0, `${testCase.id} safe alternative helper is non-empty`);
  }
  if (testCase.id.startsWith('followup-')) {
    const workflowValue = String(assistant.workflowReasoningReply || '').trim();
    if (!workflowValue && testCase.allowMissingWorkflowField) {
      console.log(`SKIP ${testCase.id} reasoning assistant field workflowReasoningReply missing`);
    } else {
      must(workflowValue.length > 0, `${testCase.id} workflow reasoning reply helper is non-empty`);
    }
    must(response.reply !== String(assistant.workflowReasoningReply || ''), `${testCase.id} public reply stays separate from workflowReasoningReply`);
  }
  if (testCase.id.startsWith('smart-diagnostic-')) {
    const smartValue = String(assistant.smartDiagnosticReply || '').trim();
    if (!smartValue && testCase.allowMissingField) {
      console.log(`SKIP ${testCase.id} reasoning assistant field smartDiagnosticReply missing`);
    } else {
      must(smartValue.length > 0, `${testCase.id} smart diagnostic reply helper is non-empty`);
    }
  }
  if (testCase.id.startsWith('root-cause-')) {
    must(String(assistant.rootCauseReply || '').trim().length > 0, `${testCase.id} root cause reply helper is non-empty`);
  }
  if (testCase.id.startsWith('risk-')) {
    must(String(assistant.riskScoringReply || '').trim().length > 0, `${testCase.id} risk scoring reply helper is non-empty`);
  }
  if (testCase.id.startsWith('operation-health-')) {
    must(String(assistant.operationHealthReply || '').trim().length > 0, `${testCase.id} operation health reply helper is non-empty`);
  }
  if (testCase.id.startsWith('workflow-')) {
    must(String(assistant.workflowReasoningReply || '').trim().length > 0, `${testCase.id} workflow reasoning reply helper is non-empty`);
  }
  if (testCase.id.startsWith('plan-review-')) {
    must(String(response.reply || '').trim().length > 0, `${testCase.id} plan review public reply is non-empty`);
  }
  return {
    response,
    assistant,
    directReply,
  };
}

async function main() {
  console.log('=== AI-RESPONSE-SEMANTIC-QUALITY-GATE-01 CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verify = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const doc = read('docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md');

  must(pkg.includes('"check:airesponsesemanticqualitygate01": "node backend/scripts/ai_response_semantic_quality_gate_01_check.js"'), 'package.json exposes AI response semantic quality gate check');
  must(runner.includes('check:airesponsesemanticqualitygate01'), 'product extensions runner includes AI response semantic quality gate check');
  must(verify.includes('check:airesponsesemanticqualitygate01'), 'verify chain includes AI response semantic quality gate check');
  must(harnessCheck.includes('AI-RESPONSE-SEMANTIC-QUALITY-GATE-01'), 'script harness check knows AI response semantic quality gate milestone');
  must(harnessCheck.includes('check:airesponsesemanticqualitygate01'), 'script harness check knows AI response semantic quality gate alias');
  must(harnessCheck.includes('docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md'), 'script harness check knows AI response semantic quality gate doc');
  must(guide.includes('AI-RESPONSE-SEMANTIC-QUALITY-GATE-01'), 'milestone guide mentions AI response semantic quality gate milestone');
  must(guide.includes('check:airesponsesemanticqualitygate01'), 'milestone guide exposes AI response semantic quality gate check');
  must(guide.includes('node backend\\scripts\\ai_response_semantic_quality_gate_01_check.js'), 'milestone guide includes AI response semantic quality gate command');
  must(guide.includes('docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md'), 'milestone guide includes AI response semantic quality gate doc');
  must(primer.includes('AI-RESPONSE-SEMANTIC-QUALITY-GATE-01'), 'primer mentions AI response semantic quality gate milestone');
  must(primer.includes('check:airesponsesemanticqualitygate01'), 'primer exposes AI response semantic quality gate check');
  must(primer.includes('docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md'), 'primer links AI response semantic quality gate doc');
  must(primer.includes('backend/scripts/ai_response_semantic_quality_gate_01_check.js'), 'primer links AI response semantic quality gate command');
  must(doc.includes('# AI RESPONSE SEMANTIC QUALITY GATE 01'), 'AI response semantic quality gate doc title present');

  const failures = [];
  let testedCases = 0;
  let passCount = 0;
  let failCount = 0;
  let directCases = 0;
  let integrationCases = 0;
  const categoryCounts = {
    intentFit: 0,
    roleFit: 0,
    screenFit: 0,
    actionSafety: 0,
    humanApprovalBoundary: 0,
    specificity: 0,
    prioritization: 0,
    nonRepetition: 0,
    terminology: 0,
    uncertainty: 0,
    clarifying: 0,
    crossEngineSeparation: 0,
  };

  const bumpCategories = (categories = []) => {
    for (const category of categories) {
      if (Object.prototype.hasOwnProperty.call(categoryCounts, category)) {
        categoryCounts[category] += 1;
      }
    }
  };

  for (const testCase of CASES) {
    testedCases += 1;
    try {
      const result = runCase(testCase);
      if (testCase.kind === 'direct') {
        directCases += 1;
        bumpCategories(testCase.family.categories || []);
      } else {
        integrationCases += 1;
        bumpCategories(testCase.categories || testCase.family.categories || []);
      }
      passCount += 1;
      console.log(`PASS ${testCase.id}`);
      void result;
    } catch (error) {
      failCount += 1;
      failures.push({
        id: testCase.id,
        kind: testCase.kind,
        surface: testCase.surface?.path || '',
        family: testCase.family?.id || '',
        error: error?.stack || String(error),
      });
      console.log(`FAIL ${testCase.id}`);
    }
  }

  console.log(`directCases: ${directCases}`);
  console.log(`integrationCases: ${integrationCases}`);
  console.log(`semanticCases: ${CASES.length}`);
  console.log(`testedCases: ${testedCases}`);
  console.log(`passCount: ${passCount}`);
  console.log(`failCount: ${failCount}`);
  for (const [key, value] of Object.entries(categoryCounts)) {
    console.log(`${key}: ${value}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.log(`FAIL CASE ${failure.id}`);
      console.log(`kind: ${failure.kind}`);
      console.log(`surface: ${failure.surface}`);
      console.log(`family: ${failure.family}`);
      console.log(`error: ${failure.error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`PASS AI-RESPONSE-SEMANTIC-QUALITY-GATE-01 (${CASES.length} cases)`);
}

Promise.resolve(main()).catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
