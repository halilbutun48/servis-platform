#!/usr/bin/env node

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildConversationTaskState } from '../src/ai/chat/conversationTaskState.js';
import { composeCopilotReasoningAnswer } from '../src/ai/chat/copilotReasoningAnswerComposer.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import {
  buildSeferAbiReasoningAssistant,
  getSeferAbiReasoningRoleProfile,
} from '../src/ai/chat/seferAbiReasoningAssistant.js';

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

function contains(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function containsAny(text, needles) {
  const haystack = normalize(text);
  return (Array.isArray(needles) ? needles : []).some((needle) => haystack.includes(normalize(needle)));
}

function buildScreenFixture({
  path,
  label,
  selectedLabel = '',
  selectedSummary = '',
  selectedRecordStatus = '',
  selectedEntityType = '',
  selectedEntityId = 0,
  menuPurpose = '',
  firstStep = '',
  nextStep = '',
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

function makeUser(role, companyKind = '') {
  return companyKind ? { role: 'COMPANY', companyKind } : { role };
}

function buildChatResponse({
  role,
  companyKind = '',
  fixture,
  message,
  conversationState = null,
}) {
  const user = makeUser(role, companyKind);
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

function buildAssistantResponse({
  role,
  companyKind = '',
  fixture,
  message,
  questionType = 'NEXT_STEP',
  replyMode = 'SHORT',
  rawReply = 'Aynı akışı sürdürüyorum.',
  conversationState = null,
}) {
  const user = makeUser(role, companyKind);
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
  };
  return buildSeferAbiReasoningAssistant({
    rawReply,
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

function buildReasoningSnapshot({
  role,
  companyKind = '',
  fixture,
  message,
  conversationState = null,
}) {
  const user = makeUser(role, companyKind);
  const guide = {
    plainSummary: fixture?.screenDefinition?.menuPurpose || '',
    summary: fixture?.screenDefinition?.menuPurpose || '',
    screenExplanation: fixture?.screenDefinition?.menuPurpose || '',
    whatToDoNow: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
    whatToDoNext: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
    whyBlocked: '',
    doNotDo: '',
  };
  return {
    rawReply: 'Aynı akışı sürdürüyorum.',
    message,
    questionType: 'NEXT_STEP',
    replyMode: 'SHORT',
    guide,
    roleMode: 'OPERATIONS',
    userRole: user.role,
    user,
    screenPath: fixture?.screenDefinition?.path || '',
    screenDefinition: fixture?.screenDefinition || null,
    screenContext: fixture?.screenContext || null,
    sourceScreenDefinition: fixture?.screenDefinition || null,
    sourceScreenContext: fixture?.screenContext || null,
    analysis: {
      reasoningLead: fixture?.screenDefinition?.menuPurpose || '',
      nextBestAction: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
      safestNextStep: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
      blockers: [],
      missingData: [],
      evidence: [],
    },
    contextPriority: {
      activeTopic: 'NEXT_STEP',
      activeTopicLabel: fixture?.screenDefinition?.label || '',
      followUpPrompt: fixture?.screenDefinition?.nextStep || '',
      summaryLead: fixture?.screenDefinition?.menuPurpose || '',
      bestNextAction: fixture?.screenDefinition?.nextStep || 'İlk kontrolü aç.',
    },
    conversationState,
    guidedTaskMeta: null,
    entityType: 'screen',
    context: null,
    roleProfile: getSeferAbiReasoningRoleProfile(role, user),
    effectiveRole: role,
  };
}

function seedConversationState({
  role,
  fixture,
  message = 'Önceki soru',
  questionType = 'NEXT_STEP',
  guidedTaskMeta = null,
}) {
  const taskState = buildConversationTaskState({
    message,
    rawMessage: message,
    questionType,
    conversationState: null,
    screenContext: fixture?.screenContext || null,
    screenDefinition: fixture?.screenDefinition || null,
    guidedTaskMeta,
    roleMode: 'OPERATIONS',
    userRole: role,
    entityType: 'screen',
    screenPath: fixture?.screenDefinition?.path || '',
  });
  return {
    taskState,
    recentMessages: [
      { role: 'user', content: message },
    ],
  };
}

function assertTaskStateBridge(response, label) {
  assert(Boolean(response?.taskState), `${label} exposes top-level taskState`);
  assert(Boolean(response?.conversationState?.taskState), `${label} keeps conversationState.taskState`);
  assert(response.taskState.anchorLabel === response.conversationState.taskState.anchorLabel, `${label} mirrors anchor label across task state surfaces`);
}

function assertReplyHasAny(response, needles, label) {
  assert(containsAny(response?.reply || '', needles), `${label} reply contains one of: ${needles.join(' / ')}`);
}

function assertReplyHasNone(response, needles, label) {
  for (const needle of needles) {
    assert(!contains(response?.reply || '', needle), `${label} reply does not contain ${needle}`);
  }
}

function assertQuestionTypeOneOf(actual, allowed, label) {
  assert(allowed.includes(actual), `${label} questionType is one of ${allowed.join(', ')} (got ${actual || 'EMPTY'})`);
}

function runCase(testCase) {
  const result = testCase.run();
  testCase.verify(result);
  return result;
}

const companyPlanFixture = buildScreenFixture({
  path: '/company/operations',
  label: 'Planlama Merkezi',
  selectedLabel: 'Planlama Merkezi',
  selectedSummary: 'Planlama Merkezi seçili kayıt hazır.',
  selectedRecordStatus: 'Planlama merkezinde seçili kayıt hazır.',
  selectedEntityType: 'plan',
  selectedEntityId: 101,
  menuPurpose: 'Planlama Merkezi yeni işi kurma ve vardiya planlama akışını yönetir.',
  firstStep: 'Plan bilgilerini kontrol et.',
  nextStep: 'Sıradaki işi aç.',
});

const companyPlanBareFixture = buildScreenFixture({
  path: '/company/operations',
  label: 'Planlama Merkezi',
  menuPurpose: 'Planlama Merkezi yeni işi kurma ve vardiya planlama akışını yönetir.',
  firstStep: 'Plan bilgilerini kontrol et.',
  nextStep: 'Sıradaki işi aç.',
});

const roomShiftsFixture = buildScreenFixture({
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

const roomShiftsBareFixture = buildScreenFixture({
  path: '/room/shifts',
  label: 'Vardiyalar',
  menuPurpose: 'Vardiyalar ekranı mevcut vardiya ve operasyon akışını takip eder.',
  firstStep: 'Vardiya satırını aç.',
  nextStep: 'Araç ve sürücüyü kontrol et.',
});

const roomHealthFixture = buildScreenFixture({
  path: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  selectedLabel: 'Risk satırı',
  selectedSummary: 'Risk satırı hazır.',
  selectedRecordStatus: 'Risk satırı hazır.',
  selectedEntityType: 'health',
  selectedEntityId: 301,
  menuPurpose: 'Operasyon sağlığı riskleri ve canlılık sinyallerini gösterir.',
  firstStep: 'Risk satırını aç.',
  nextStep: 'Açık sorunları sırala.',
});

const cases = [
  {
    label: 'company plan purpose',
    role: 'COMPANY',
    flow: 'purpose',
    followUp: false,
    run: () => buildChatResponse({
      role: 'COMPANY',
      fixture: companyPlanFixture,
      message: 'Bu ekran ne işe yarar?',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'company plan purpose');
      assertQuestionTypeOneOf(response.questionType, ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'], 'company plan purpose');
      assertReplyHasAny(response, ['Planlama Merkezi', 'planlama merkezi', 'vardiya'], 'company plan purpose');
      assert(response.taskState.isFollowUp === false, 'company plan purpose is not a follow-up');
    },
  },
  {
    label: 'company plan selected record',
    role: 'COMPANY',
    flow: 'selected-record',
    followUp: false,
    run: () => buildChatResponse({
      role: 'COMPANY',
      fixture: companyPlanFixture,
      message: 'Bunda eksik ne?',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'company plan selected record');
      assert(response.taskState.anchorLabel.includes('Planlama Merkezi'), 'company plan selected record keeps anchor label');
      assert(response.taskState.sameEntity === true || response.taskState.currentEntityType === 'plan', 'company plan selected record keeps entity continuity');
      assertReplyHasAny(response, ['eksik', 'Planlama Merkezi', 'plan'], 'company plan selected record');
    },
  },
  {
    label: 'company plan follow-up continue',
    role: 'COMPANY',
    flow: 'follow-up',
    followUp: true,
    run: () => buildChatResponse({
      role: 'COMPANY',
      fixture: companyPlanBareFixture,
      message: 'devam et',
      conversationState: seedConversationState({
        role: 'COMPANY',
        fixture: companyPlanFixture,
        message: 'Bir önceki planı açtım',
        questionType: 'NEXT_STEP',
      }),
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'company plan follow-up continue');
      assert(response.taskState.isFollowUp === true, 'company plan follow-up continue is a follow-up');
      assert(response.taskState.sameScreen === true, 'company plan follow-up continue keeps same screen');
      assert(response.taskState.sameEntity === true, 'company plan follow-up continue keeps same entity');
      assertReplyHasAny(response, ['devam', 'aynı', 'Planlama Merkezi'], 'company plan follow-up continue');
    },
  },
  {
    label: 'company plan follow-up entered',
    role: 'COMPANY',
    flow: 'follow-up',
    followUp: true,
    run: () => buildChatResponse({
      role: 'COMPANY',
      fixture: companyPlanBareFixture,
      message: 'girdim',
      conversationState: seedConversationState({
        role: 'COMPANY',
        fixture: companyPlanFixture,
        message: 'Nereye geçmeliyim?',
        questionType: 'NEXT_SCREEN',
      }),
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'company plan follow-up entered');
      assert(response.taskState.isFollowUp === true, 'company plan follow-up entered is a follow-up');
      assertQuestionTypeOneOf(response.questionType, ['FIRST_CONTROL', 'NEXT_STEP'], 'company plan follow-up entered');
      assertReplyHasAny(response, ['girdin', 'ilk', 'kontrol', 'Planlama Merkezi'], 'company plan follow-up entered');
    },
  },
  {
    label: 'company plan risk',
    role: 'COMPANY',
    flow: 'risk',
    followUp: false,
    run: () => buildChatResponse({
      role: 'COMPANY',
      fixture: companyPlanFixture,
      message: 'Riskleri sırala',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'company plan risk');
      assertQuestionTypeOneOf(response.questionType, ['RISK_LIST'], 'company plan risk');
      assertReplyHasAny(response, ['risk', 'riskleri', 'Planlama Merkezi'], 'company plan risk');
    },
  },
  {
    label: 'company plan negative refusal',
    role: 'COMPANY',
    flow: 'negative',
    followUp: false,
    run: () => buildChatResponse({
      role: 'COMPANY',
      fixture: companyPlanBareFixture,
      message: 'bunu sen yap',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'company plan negative refusal');
      assertReplyHasAny(response, ['yapamam', 'güvenli', 'hazırlık'], 'company plan negative refusal');
      assertReplyHasNone(response, ['tool execution', 'write-action', 'runtime ai action', 'db write'], 'company plan negative refusal');
      assert(response.taskState.isFollowUp === false, 'company plan negative refusal is not a follow-up');
    },
  },
  {
    label: 'room shifts purpose',
    role: 'ROOM',
    flow: 'purpose',
    followUp: false,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'Bu ekran ne işe yarar?',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts purpose');
      assertQuestionTypeOneOf(response.questionType, ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'], 'room shifts purpose');
      assertReplyHasAny(response, ['Vardiyalar', 'vardiya', 'operasyon'], 'room shifts purpose');
    },
  },
  {
    label: 'room shifts selected record',
    role: 'ROOM',
    flow: 'selected-record',
    followUp: false,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomShiftsFixture,
      message: 'Bunda eksik ne?',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts selected record');
      assert(response.taskState.anchorLabel.includes('Vardiya') || response.taskState.anchorLabel.includes('vardiya'), 'room shifts selected record keeps anchor label');
      assertReplyHasAny(response, ['eksik', 'Vardiya', 'vardiya'], 'room shifts selected record');
    },
  },
  {
    label: 'room shifts follow-up continue',
    role: 'ROOM',
    flow: 'follow-up',
    followUp: true,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomShiftsBareFixture,
      message: 'devam et',
      conversationState: seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Şimdi ne yapmalıyım?',
        questionType: 'NEXT_STEP',
      }),
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts follow-up continue');
      assert(response.taskState.isFollowUp === true, 'room shifts follow-up continue is a follow-up');
      assert(response.taskState.sameEntity === true, 'room shifts follow-up continue keeps same entity');
      assertReplyHasAny(response, ['devam', 'aynı', 'Vardiyalar'], 'room shifts follow-up continue');
    },
  },
  {
    label: 'room shifts follow-up entered',
    role: 'ROOM',
    flow: 'follow-up',
    followUp: true,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomShiftsBareFixture,
      message: 'girdim',
      conversationState: seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Nereye gitmeliyim?',
        questionType: 'NEXT_SCREEN',
      }),
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts follow-up entered');
      assert(response.taskState.isFollowUp === true, 'room shifts follow-up entered is a follow-up');
      assertQuestionTypeOneOf(response.questionType, ['FIRST_CONTROL', 'NEXT_STEP'], 'room shifts follow-up entered');
      assertReplyHasAny(response, ['girdin', 'ilk', 'kontrol', 'Vardiyalar'], 'room shifts follow-up entered');
    },
  },
  {
    label: 'room shifts follow-up result',
    role: 'ROOM',
    flow: 'follow-up',
    followUp: true,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomShiftsBareFixture,
      message: 'yaptım',
      conversationState: seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Sonucu kontrol et',
        questionType: 'RESULT_CHECK',
      }),
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts follow-up result');
      assert(response.taskState.isFollowUp === true, 'room shifts follow-up result is a follow-up');
      assertQuestionTypeOneOf(response.questionType, ['READINESS_CHECK', 'NEXT_STEP'], 'room shifts follow-up result');
      assertReplyHasAny(response, ['kontrol', 'sonuç', 'yaptın'], 'room shifts follow-up result');
    },
  },
  {
    label: 'room shifts follow-up missing',
    role: 'ROOM',
    flow: 'follow-up',
    followUp: true,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomShiftsBareFixture,
      message: 'bulamadım',
      conversationState: seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Nereye gitmeliyim?',
        questionType: 'NEXT_STEP',
      }),
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts follow-up missing');
      assert(response.taskState.isFollowUp === true, 'room shifts follow-up missing is a follow-up');
      assertQuestionTypeOneOf(response.questionType, ['NEXT_SCREEN', 'FIRST_CONTROL', 'NEXT_STEP'], 'room shifts follow-up missing');
      assertReplyHasAny(response, ['bulamad', 'alternatif', 'yol', 'doğru vardiya kaydını seç'], 'room shifts follow-up missing');
    },
  },
  {
    label: 'room shifts risk',
    role: 'ROOM',
    flow: 'risk',
    followUp: false,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomHealthFixture,
      message: 'Riskleri sırala',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts risk');
      assertQuestionTypeOneOf(response.questionType, ['RISK_LIST'], 'room shifts risk');
      assertReplyHasAny(response, ['risk', 'riskleri', 'Operasyon Sağlığı', 'operasyon'], 'room shifts risk');
    },
  },
  {
    label: 'room shifts screen purpose',
    role: 'ROOM',
    flow: 'purpose',
    followUp: false,
    run: () => buildChatResponse({
      role: 'ROOM',
      fixture: roomShiftsBareFixture,
      message: 'Bu ekran ne işe yarar?',
    }),
    verify: (response) => {
      assertTaskStateBridge(response, 'room shifts screen purpose');
      assertQuestionTypeOneOf(response.questionType, ['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'], 'room shifts screen purpose');
      assertReplyHasAny(response, ['Vardiyalar', 'vardiya', 'operasyon'], 'room shifts screen purpose');
    },
  },
  {
    label: 'assistant company continue',
    role: 'COMPANY',
    flow: 'assistant-follow-up',
    followUp: true,
    run: () => buildAssistantResponse({
      role: 'COMPANY',
      fixture: companyPlanBareFixture,
      message: 'devam et',
      conversationState: seedConversationState({
        role: 'COMPANY',
        fixture: companyPlanFixture,
        message: 'Bir önceki planı açtım',
        questionType: 'NEXT_STEP',
      }),
    }),
    verify: (assistant) => {
      assert(Boolean(assistant.taskState), 'assistant company continue exposes taskState');
      assert(assistant.taskState.isFollowUp === true, 'assistant company continue flags follow-up');
      assert(assistant.interactionIntentFamily === 'CONTINUE_FLOW' || assistant.interactionIntentFamily === 'STEP_ENTERED', 'assistant company continue keeps continuation family');
      assertReplyHasAny(assistant, ['Planlama Merkezi', 'devam', 'aynı'], 'assistant company continue');
    },
  },
  {
    label: 'assistant room continue',
    role: 'ROOM',
    flow: 'assistant-follow-up',
    followUp: true,
    run: () => buildAssistantResponse({
      role: 'ROOM',
      fixture: roomShiftsBareFixture,
      message: 'girdim',
      conversationState: seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Nereye gitmeliyim?',
        questionType: 'NEXT_SCREEN',
      }),
    }),
    verify: (assistant) => {
      assert(Boolean(assistant.taskState), 'assistant room continue exposes taskState');
      assert(assistant.taskState.isFollowUp === true, 'assistant room continue flags follow-up');
      assert(assistant.interactionIntentFamily === 'CONTINUE_FLOW' || assistant.interactionIntentFamily === 'STEP_ENTERED', 'assistant room continue keeps continuation family');
      assertReplyHasAny(assistant, ['Vardiyalar', 'girdin', 'aynı'], 'assistant room continue');
    },
  },
  {
    label: 'reasoning composer company continue',
    role: 'COMPANY',
    flow: 'reasoning',
    followUp: true,
    run: () => {
      const seed = seedConversationState({
        role: 'COMPANY',
        fixture: companyPlanFixture,
        message: 'Planlama Merkezi için ne yapmalıyım?',
        questionType: 'NEXT_STEP',
      });
      return composeCopilotReasoningAnswer({
        ...buildReasoningSnapshot({
          role: 'COMPANY',
          fixture: companyPlanFixture,
          message: 'devam et',
          conversationState: seed,
        }),
        taskState: seed.taskState,
      });
    },
    verify: (reply) => {
      assert(containsAny(reply, ['Planlama Merkezi', 'aynı akışı', 'devam']), 'reasoning composer company continue carries anchor');
    },
  },
  {
    label: 'intent company detail follow-up',
    role: 'COMPANY',
    flow: 'intent',
    followUp: true,
    run: () => {
      const seed = seedConversationState({
        role: 'COMPANY',
        fixture: companyPlanFixture,
        message: 'Planlama Merkezi nasıl kurulur?',
        questionType: 'HOW_TO_HELP',
      });
      return detectQuestionIntent('devamını anlat', {
        entityType: 'screen',
        screenPath: companyPlanFixture.screenDefinition.path,
        conversationState: seed,
        originalMessage: 'devamını anlat',
      });
    },
    verify: (intent) => {
      assert(intent?.questionType === 'HOW_TO_HELP', 'intent company detail follow-up keeps HOW_TO_HELP');
    },
  },
  {
    label: 'intent room entered follow-up',
    role: 'ROOM',
    flow: 'intent',
    followUp: true,
    run: () => {
      const seed = seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Nereye gitmeliyim?',
        questionType: 'NEXT_SCREEN',
      });
      return detectQuestionIntent('girdim', {
        entityType: 'screen',
        screenPath: roomShiftsFixture.screenDefinition.path,
        conversationState: seed,
        originalMessage: 'girdim',
      });
    },
    verify: (intent) => {
      assert(intent?.questionType === 'FIRST_CONTROL', 'intent room entered follow-up becomes FIRST_CONTROL');
    },
  },
  {
    label: 'intent room result follow-up',
    role: 'ROOM',
    flow: 'intent',
    followUp: true,
    run: () => {
      const seed = seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Sonucu kontrol et',
        questionType: 'RESULT_CHECK',
      });
      return detectQuestionIntent('yaptım', {
        entityType: 'screen',
        screenPath: roomShiftsFixture.screenDefinition.path,
        conversationState: seed,
        originalMessage: 'yaptım',
      });
    },
    verify: (intent) => {
      assert(intent?.questionType === 'READINESS_CHECK', 'intent room result follow-up becomes READINESS_CHECK');
    },
  },
  {
    label: 'task-state helper same entity and screen',
    role: 'ROOM',
    flow: 'helper',
    followUp: true,
    run: () => {
      const seed = seedConversationState({
        role: 'ROOM',
        fixture: roomShiftsFixture,
        message: 'Nereye gitmeliyim?',
        questionType: 'NEXT_SCREEN',
      });
      return buildConversationTaskState({
        message: 'devam et',
        rawMessage: 'devam et',
        questionType: 'NEXT_STEP',
        conversationState: seed,
        screenContext: roomShiftsBareFixture.screenContext,
        sourceScreenContext: roomShiftsBareFixture.screenContext,
        screenDefinition: roomShiftsBareFixture.screenDefinition,
        sourceScreenDefinition: roomShiftsBareFixture.screenDefinition,
        roleMode: 'OPERATIONS',
        userRole: 'ROOM',
        entityType: 'screen',
        screenPath: roomShiftsBareFixture.screenDefinition.path,
      });
    },
    verify: (taskState) => {
      assert(Boolean(taskState), 'task-state helper returns a snapshot');
      assert(taskState.isFollowUp === true, 'task-state helper marks follow-up');
      assert(taskState.sameEntity === true, 'task-state helper keeps same entity');
      assert(taskState.sameScreen === true, 'task-state helper keeps same screen');
      assert(containsAny(taskState.anchorLabel, ['Seçili vardiya', 'Vardiya']), 'task-state helper keeps anchor label');
    },
  },
];

function main() {
  console.log('=== COPILOT CONTEXT MEMORY TASK STATE 01 ===');
  console.log(`Cases: ${cases.length}`);

  const testedRoles = new Set();
  const testedScreens = new Set();
  const testedFlows = new Set();
  const testedFollowUps = new Set();
  const failures = [];

  for (const testCase of cases) {
    try {
      const result = runCase(testCase);
      testedRoles.add(testCase.role);
      testedScreens.add(testCase.label.includes('room') ? 'ROOM' : testCase.label.includes('company') ? 'COMPANY' : 'MIXED');
      testedFlows.add(testCase.flow);
      if (testCase.followUp) testedFollowUps.add(testCase.label);
      console.log(`CASE PASS ${testCase.label}`);
      void result;
    } catch (error) {
      failures.push(`${testCase.label}: ${error?.message || String(error)}`);
      console.error(`CASE FAIL ${testCase.label}`);
      console.error(error?.stack || String(error));
    }
  }

  console.log('=== SUMMARY ===');
  console.log(`PASS: ${cases.length - failures.length}`);
  console.log(`FAIL: ${failures.length}`);
  console.log(`Roles: ${[...testedRoles].join(', ')}`);
  console.log(`Screens: ${[...testedScreens].join(', ')}`);
  console.log(`Flows: ${[...testedFlows].join(', ')}`);
  console.log(`FollowUps: ${[...testedFollowUps].join(', ')}`);

  if (failures.length) {
    console.log('=== FAILURES ===');
    for (const failure of failures) console.log(`- ${failure}`);
    process.exit(1);
  }

  console.log('COPILOT CONTEXT MEMORY TASK STATE 01 PASS');
}

main();
