#!/usr/bin/env node

import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { resolveSemanticIntent, toPublicQuestionType } from '../src/ai/chat/semanticIntentPlanner.js';

const failures = [];
const failedCaseIds = new Set();
let passes = 0;
let currentCaseId = '';

function check(condition, label, detail = '') {
  if (condition) {
    passes += 1;
    console.log(`PASS ${label}`);
    return;
  }
  const failure = `${label}${detail ? ` :: ${detail}` : ''}`;
  failures.push(failure);
  failedCaseIds.add(currentCaseId || label);
  console.error(`FAIL ${failure}`);
}

function screenFixture({ path, label, menuPurpose = '', selectedEntityType = 'screen' }) {
  const screenDefinition = {
    path,
    label,
    menuPurpose,
    summary: menuPurpose || label,
    screenExplanation: menuPurpose || label,
    firstStep: 'İlk güvenli kontrolü aç.',
    nextStep: 'Durumu doğrula.',
  };
  return {
    screenDefinition,
    screenContext: {
      ...screenDefinition,
      selectedEntityType,
      selectedEntityId: 1,
      selectedSummary: 'Yetkili seçili kayıt hazır.',
      selectedRecordStatus: 'Hazır',
      structuredFacts: { nextBestAction: screenDefinition.firstStep },
    },
  };
}

function semanticResolutionContext(fixture, { requestEntityType = 'screen', sourcePath = fixture.screenContext.path } = {}) {
  return {
    authorizedRole: '',
    requestEntityType,
    sourceScreenPath: sourcePath,
    effectiveScreenPath: fixture.screenDefinition.path,
    sourceScreenLabel: fixture.screenContext.label,
    effectiveScreenLabel: fixture.screenDefinition.label,
    sourceScreenMenuPurpose: fixture.screenContext.menuPurpose,
    effectiveScreenMenuPurpose: fixture.screenDefinition.menuPurpose,
    selectedEntityType: fixture.screenContext.selectedEntityType,
  };
}

function buildCaseResponse(testCase) {
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user: { role: testCase.role },
    message: testCase.input,
    context: null,
    entityLabel: testCase.fixture.screenContext.label,
    scope: { role: testCase.role, roleMode: 'OPERATIONS' },
    conversationState: testCase.conversationState || null,
    screenContext: testCase.fixture.screenContext,
    screenDefinition: testCase.fixture.screenDefinition,
  });
}

const roomShifts = screenFixture({
  path: '/room/shifts',
  label: 'Oda Vardiyalar',
  menuPurpose: 'Oda vardiya planlama ve takip için kullanılır.',
});
const companyOperations = screenFixture({
  path: '/company/operations',
  label: 'Operasyon Paneli',
  menuPurpose: 'Operasyon takibi için kullanılır.',
});
const companyPlanCenter = screenFixture({
  path: '/company',
  label: 'Planlama Merkezi',
  menuPurpose: 'Planlama ve teklif hazırlığı için kullanılır.',
});

const cases = [
  {
    id: 'ROUTE_REVIEW_LOCATION_RISK',
    input: 'Konum riski',
    role: 'ROOM',
    fixture: roomShifts,
    expected: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    intendedRed: true,
  },
  {
    id: 'ROUTE_REVIEW_TIME_RISK',
    input: 'Tarih / saat riski',
    role: 'ROOM',
    fixture: roomShifts,
    expected: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    intendedRed: true,
  },
  {
    id: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    input: 'Kim onaylayacak?',
    role: 'COMPANY',
    fixture: companyOperations,
    expected: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    intendedRed: true,
    requiredReply: 'Onayınız gerekli',
  },
  {
    id: 'NORMAL_RISK_RANKING',
    input: 'Riskleri sırala',
    role: 'ROOM',
    fixture: roomShifts,
    expected: 'RISK_LIST',
  },
  {
    id: 'CURRENT_SCREEN_HELP',
    input: 'Bu ekranı detaylı anlat',
    role: 'COMPANY',
    fixture: companyPlanCenter,
    expected: 'SCREEN_PURPOSE',
  },
  {
    id: 'CONTINUATION',
    input: 'Devamını anlat',
    role: 'ROOM',
    fixture: roomShifts,
    expected: 'CONTINUE_FLOW',
    conversationState: {
      lastSettledResult: {
        semanticPlan: { family: 'NEXT_STEP', taskVariant: 'CONTINUATION' },
      },
    },
  },
  {
    id: 'ROLE_HELP',
    input: 'ROOM rolü ne yapar?',
    role: 'ROOM',
    fixture: roomShifts,
    expected: 'ROLE_EXPLANATION_HELP',
  },
  {
    id: 'GENERIC_HELP_MODEL_A',
    input: 'Bu program ne işe yarıyor?',
    role: 'ROOM',
    fixture: roomShifts,
    expected: 'PRODUCT_OVERVIEW_HELP',
  },
  {
    id: 'HUMAN_APPROVAL_PRESENTATION',
    input: 'Kim onaylayacak?',
    role: 'COMPANY',
    fixture: companyOperations,
    expected: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    presentationOnly: true,
    requiredReply: 'Onayınız gerekli',
  },
];

for (const testCase of cases) {
  currentCaseId = testCase.id;
  const transport = semanticResolutionContext(testCase.fixture);
  transport.authorizedRole = testCase.role;
  const plan = resolveSemanticIntent({
    message: testCase.input,
    user: { role: testCase.role },
    conversationState: testCase.conversationState || null,
    screenContext: {
      path: testCase.fixture.screenDefinition.path,
      semanticResolutionContext: transport,
    },
  });
  const publicType = toPublicQuestionType(plan);
  const intent = detectQuestionIntent(testCase.input, {
    entityType: 'screen',
    screenPath: testCase.fixture.screenDefinition.path,
    userRole: testCase.role,
    conversationState: testCase.conversationState || null,
    originalMessage: testCase.input,
    semanticResolutionContext: transport,
  });
  const response = buildCaseResponse(testCase);

  if (testCase.presentationOnly) {
    check(
      response.questionType === testCase.expected,
      `${testCase.id} keeps the approved public type visible`,
      `expected=${testCase.expected} actual=${response.questionType || '<empty>'}`,
    );
  } else {
    check(
      publicType === testCase.expected,
      `${testCase.id} planner public type`,
      `expected=${testCase.expected} actual=${publicType || '<empty>'} family=${plan.family}`,
    );
    check(
      intent.questionType === publicType,
      `${testCase.id} router preserves planner adapter`,
      `planner=${publicType || '<empty>'} router=${intent.questionType || '<empty>'}`,
    );
    check(
      response.questionType === publicType,
      `${testCase.id} composer preserves public type`,
      `planner=${publicType || '<empty>'} composer=${response.questionType || '<empty>'}`,
    );
  }
  if (testCase.requiredReply) {
    check(
      String(response.reply || '').includes(testCase.requiredReply),
      `${testCase.id} retains human-approval wording`,
      `reply=${response.reply || '<empty>'}`,
    );
  }
}

currentCaseId = 'FOREIGN_ROLE_CONTEXT_REJECTED';
const foreignTransport = semanticResolutionContext(roomShifts);
foreignTransport.authorizedRole = 'ROOM';
const foreignRolePlan = resolveSemanticIntent({
  message: 'Konum riski',
  user: { role: 'COMPANY' },
  screenContext: { path: '/room/shifts', semanticResolutionContext: foreignTransport },
});
check(
  toPublicQuestionType(foreignRolePlan) !== 'ROUTE_REVIEW_HUMAN_APPROVAL',
  'FOREIGN_ROLE_CONTEXT_REJECTED does not become planner truth',
  `actual=${toPublicQuestionType(foreignRolePlan) || '<empty>'}`,
);

currentCaseId = 'UNKNOWN_CONTEXT_REJECTED';
const unknownTransport = semanticResolutionContext(roomShifts);
unknownTransport.authorizedRole = 'ROOM';
unknownTransport.effectiveScreenPath = '/room/not-a-screen';
const unknownPlan = resolveSemanticIntent({
  message: 'Konum riski',
  user: { role: 'ROOM' },
  screenContext: { path: '/room/not-a-screen', semanticResolutionContext: unknownTransport },
});
check(
  toPublicQuestionType(unknownPlan) !== 'ROUTE_REVIEW_HUMAN_APPROVAL',
  'UNKNOWN_CONTEXT_REJECTED does not manufacture route-review semantics',
  `actual=${toPublicQuestionType(unknownPlan) || '<empty>'}`,
);

currentCaseId = 'STALE_SELECTED_ID_NOT_TRANSPORTED';
const staleTransport = semanticResolutionContext(roomShifts);
staleTransport.authorizedRole = 'ROOM';
staleTransport.selectedEntityId = 999;
const stalePlan = resolveSemanticIntent({
  message: 'Konum riski',
  user: { role: 'ROOM' },
  screenContext: { path: '/room/shifts', semanticResolutionContext: staleTransport },
});
check(
  !stalePlan.entities.some((entity) => Number(entity?.id) === 999),
  'STALE_SELECTED_ID_NOT_TRANSPORTED does not reuse a selected entity id',
  `entities=${JSON.stringify(stalePlan.entities)}`,
);

console.log(`SUMMARY assertionPass=${passes} assertionFail=${failures.length} caseFail=${failedCaseIds.size}`);
if (failures.length) {
  process.exitCode = 1;
}
