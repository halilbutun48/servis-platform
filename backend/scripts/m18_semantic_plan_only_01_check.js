#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveConversationRoute } from '../src/ai/chat/conversationRouting.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';

const user = { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' };
const screenContext = { path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' };
const conversationState = { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext };
const screenDefinition = {
  path: screenContext.path,
  label: screenContext.label,
  menuPurpose: 'Operasyon kayıtlarını ve vardiya akışını yönetir.',
  plainSummary: 'Operasyon paneli',
};

const cases = [
  {
    id: 'ROLE_HELP',
    canonicalMessage: 'Şirket hesabında hangi bölümlerin işleyişini öğrenmek istiyorum.',
    contradictoryMessage: 'Vardiya ekranını göster.',
    expected: { action: 'EXPLAIN', object: null, operation: 'GENERAL_INFORMATION', family: 'GENERIC_PRODUCT_HELP', questionType: 'ROLE_EXPLANATION_HELP' },
  },
  {
    id: 'EXPLAIN',
    canonicalMessage: 'Operasyon panelinin çalışma mantığını anlatır mısın?',
    contradictoryMessage: 'SeferPakt nedir?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE', questionType: 'SCREEN_EXPLANATION_HELP' },
  },
  {
    id: 'VIEW',
    canonicalMessage: 'Vardiya listesini görüntüle.',
    contradictoryMessage: 'Bu rolde ne yapabilirim?',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', questionType: 'DETAIL_FLOW' },
  },
  {
    id: 'NAVIGATE',
    canonicalMessage: 'Sözleşmeler sayfasına geçelim.',
    contradictoryMessage: 'Şirket hesabında hangi bölümlerin işleyişini öğrenmek istiyorum.',
    expected: { action: 'NAVIGATE', object: 'AGREEMENT', operation: 'NAVIGATE_AUTHORIZED_SURFACE', questionType: 'GO_TO' },
  },
  {
    id: 'GUIDED_SHOW',
    canonicalMessage: 'Vardiya ekranını göster.',
    contradictoryMessage: 'Bu rolde ne yapabilirim?',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', questionType: 'DETAIL_FLOW' },
  },
  {
    id: 'RECORD_VIEW',
    canonicalMessage: 'Bu haftanın sefer kayıtlarını incelemek istiyorum.',
    contradictoryMessage: 'SeferPakt nedir?',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', questionType: 'DETAIL_FLOW' },
  },
  {
    id: 'ENTITY_EXPLANATION',
    canonicalMessage: 'Aktif vardiyanın ayrıntılarını açıklar mısın?',
    contradictoryMessage: 'Şirket hesabında hangi bölümlerin işleyişini öğrenmek istiyorum.',
    expected: { action: 'EXPLAIN', object: 'SHIFT', operation: 'LOOK_UP_FIELD', questionType: 'SEMANTIC_RECORD_DETAILS' },
    state: { selectedEntityId: 42, selectedEntityType: 'SHIFT', recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
  },
  {
    id: 'CLARIFICATION',
    canonicalMessage: 'Hangi kaydı açacağımı söyle.',
    contradictoryMessage: 'Bu rolde ne yapabilirim?',
    expected: { action: 'EXPLAIN', object: null, operation: 'GENERAL_INFORMATION', questionType: 'ROLE_EXPLANATION_HELP' },
  },
];

let downstreamSemanticRedecisionCount = 0;
let presentationProjectionDifferenceCount = 0;
let compatibilityPathRedecisionCount = 0;
const redecisionReasons = [];
const presentationProjectionReasons = [];
const compatibilityPathReasons = [];
const observations = [];

function canonicalSemanticProjection({ request, plan, envelope } = {}) {
  const typedEvidence = request?.typedEvidence || {};
  const action = request?.semanticAction || {};
  return {
    semanticScope: request?.semanticScope?.class || null,
    requestMode: typedEvidence.requestMode?.value || null,
    semanticAction: action.actionClass || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    reference: typedEvidence.reference?.value || request?.reference || null,
    resolutionStatus: action.resolutionStatus || null,
    task: plan?.typedRequest?.taskType || envelope?.canonicalShape?.taskType || null,
    operation: request?.operation || null,
  };
}

function recordCanonicalSemanticDifference(condition, reason) {
  if (condition) {
    downstreamSemanticRedecisionCount += 1;
    redecisionReasons.push(reason);
  }
}

function recordPresentationDifference(condition, reason) {
  if (condition) {
    presentationProjectionDifferenceCount += 1;
    presentationProjectionReasons.push(reason);
  }
}

function recordCompatibilityDifference(condition, reason) {
  if (condition) {
    compatibilityPathRedecisionCount += 1;
    compatibilityPathReasons.push(reason);
  }
}

for (const item of cases) {
  const state = item.state || conversationState;
  const canonicalRequest = resolveCanonicalConversationRequest({
    message: item.canonicalMessage,
    user,
    screenContext,
    conversationState: state,
  });
  const request = canonicalRequest.request;
  assert.equal(request.semanticAction.actionClass, item.expected.action, `${item.id} canonical action`);
  assert.equal(request.semanticAction.objectClass, item.expected.object, `${item.id} canonical object`);
  assert.equal(request.operation, item.expected.operation, `${item.id} canonical operation`);

  const canonicalPlan = resolveSemanticIntent({
    message: item.canonicalMessage,
    user,
    screenContext,
    conversationState: state,
    canonicalRequest,
  });
  const canonicalPlanWithRequest = { ...canonicalPlan, canonicalRequest: request, canonicalRequestEnvelope: canonicalRequest };
  const downstreamPlan = resolveSemanticIntent({
    message: item.contradictoryMessage,
    user,
    screenContext,
    conversationState: state,
    canonicalRequest,
  });
  const downstreamRequest = downstreamPlan.canonicalRequest || canonicalRequest.request;
  const canonicalSemanticFields = canonicalSemanticProjection({
    request,
    plan: canonicalPlan,
    envelope: canonicalRequest,
  });
  const downstreamSemanticFields = canonicalSemanticProjection({
    request: downstreamRequest,
    plan: downstreamPlan,
    envelope: canonicalRequest,
  });
  recordCanonicalSemanticDifference(
    JSON.stringify(downstreamSemanticFields) !== JSON.stringify(canonicalSemanticFields),
    `${item.id}:canonical-semantic-fields`,
  );
  if (item.expected.family) assert.equal(canonicalPlan.family, item.expected.family, `${item.id} canonical family`);

  const route = resolveConversationRoute({
    message: item.contradictoryMessage,
    user,
    conversationState: state,
    screenContext,
    canonicalShape: canonicalRequest.canonicalShape,
    canonicalRequest,
  });
  recordPresentationDifference(route.route !== canonicalPlan.conversationRoute, `${item.id}:route-projection`);

  const intent = detectQuestionIntent(item.contradictoryMessage, {
    userRole: user.role,
    roleMode: 'OPERATIONS',
    conversationState: state,
    screenContext,
    originalMessage: item.contradictoryMessage,
    canonicalRequest,
  });
  recordPresentationDifference(intent.questionType !== item.expected.questionType, `${item.id}:intent-router`);

  const response = buildChatHelpResponse({
    entityType: 'screen',
    user,
    message: item.contradictoryMessage,
    context: {},
    scope: { role: user.role, roleMode: 'OPERATIONS' },
    conversationState: state,
    semanticPlan: canonicalPlanWithRequest,
    screenContext,
    screenDefinition,
  });
  recordPresentationDifference(
    response?.assistantIntent !== item.expected.questionType
      && response?.questionType !== item.expected.questionType,
    `${item.id}:help-composer`,
  );

  observations.push({
    id: item.id,
    canonical: { action: request.semanticAction.actionClass, object: request.semanticAction.objectClass, operation: request.operation },
    plannerFamily: canonicalPlan.family,
    contradictoryQuestionType: intent.questionType,
    composerQuestionType: response?.questionType || null,
    composerAssistantIntent: response?.assistantIntent || null,
  });
}

// Entry normalization cases: the same V3 request must remain authoritative
// whether callers provide the transport envelope or only its direct request.
// The contradictory text is deliberately role help so raw re-inference is
// visible if either shape is treated as noncanonical.
const entryCanonical = resolveCanonicalConversationRequest({
  message: 'Vardiya listesini görüntüle.',
  user,
  screenContext,
  conversationState,
});
const entryReferencePlan = resolveSemanticIntent({
  message: 'Vardiya listesini görüntüle.',
  user,
  screenContext,
  conversationState,
  canonicalRequest: entryCanonical,
});
const planProjection = (plan) => ({
  family: plan?.family || null,
  conversationRoute: plan?.conversationRoute || null,
  primaryTask: plan?.primaryTask || null,
  taskVariant: plan?.taskVariant || null,
  typedTaskType: plan?.typedRequest?.taskType || null,
  workflowIntent: plan?.typedRequest?.workflowIntent || null,
});
for (const entryCase of [
  {
    id: 'DIRECT_V3_REQUEST',
    canonicalRequest: entryCanonical.request,
  },
  {
    id: 'ENVELOPE_WITHOUT_CANONICAL_SHAPE',
    canonicalRequest: { ...entryCanonical, canonicalShape: undefined },
  },
]) {
  const variantPlan = resolveSemanticIntent({
    message: 'Bu rolde ne yapabilirim?',
    user,
    screenContext,
    conversationState,
    canonicalRequest: entryCase.canonicalRequest,
  });
  const referenceProjection = planProjection(entryReferencePlan);
  const variantProjection = planProjection(variantPlan);
  recordCompatibilityDifference(
    JSON.stringify(variantProjection) !== JSON.stringify(referenceProjection),
    `${entryCase.id}:planner-entry-normalization`,
  );
  observations.push({
    id: entryCase.id,
    referenceProjection,
    variantProjection,
  });
}

const entryReferenceRoute = resolveConversationRoute({
  message: 'Vardiya listesini görüntüle.',
  user,
  conversationState,
  screenContext,
  canonicalShape: entryCanonical.canonicalShape,
  canonicalRequest: entryCanonical,
});
for (const entryCase of [
  {
    id: 'DIRECT_V3_REQUEST',
    canonicalRequest: entryCanonical.request,
  },
  {
    id: 'ENVELOPE_WITHOUT_CANONICAL_SHAPE',
    canonicalRequest: { ...entryCanonical, canonicalShape: undefined },
  },
]) {
  const route = resolveConversationRoute({
    message: 'Bu rolde ne yapabilirim?',
    user,
    conversationState,
    screenContext,
    canonicalRequest: entryCase.canonicalRequest,
  });
  const referenceRouteProjection = {
    route: entryReferenceRoute?.route || null,
    dialogueTopic: entryReferenceRoute?.dialogueTopic || null,
    primaryTask: entryReferenceRoute?.primaryTask || null,
  };
  const routeProjection = {
    route: route?.route || null,
    dialogueTopic: route?.dialogueTopic || null,
    primaryTask: route?.primaryTask || null,
  };
  recordCompatibilityDifference(
    JSON.stringify(routeProjection) !== JSON.stringify(referenceRouteProjection),
    `${entryCase.id}:route-entry-normalization`,
  );
  observations.push({
    id: `${entryCase.id}_ROUTE`,
    referenceRouteProjection,
    routeProjection,
  });
}

const entityState = {
  recentMessages: [],
  activeGuidedTask: null,
  uiSurface: screenContext,
};
const entityCanonical = resolveCanonicalConversationRequest({
  message: 'Aktif vardiyanın ayrıntılarını açıklar mısın?',
  user,
  screenContext,
  conversationState: entityState,
});
const entityReferencePlan = resolveSemanticIntent({
  message: 'Aktif vardiyanın ayrıntılarını açıklar mısın?',
  user,
  screenContext,
  conversationState: entityState,
  canonicalRequest: entityCanonical,
});
for (const entryCase of [
  {
    id: 'DIRECT_V3_ENTITY_EXPLANATION',
    canonicalRequest: entityCanonical.request,
  },
  {
    id: 'ENVELOPE_WITHOUT_CANONICAL_SHAPE_ENTITY_EXPLANATION',
    canonicalRequest: { ...entityCanonical, canonicalShape: undefined },
  },
]) {
  try {
    const plan = resolveSemanticIntent({
      message: 'Bu rolde ne yapabilirim?',
      user,
      screenContext,
      conversationState: entityState,
      canonicalRequest: entryCase.canonicalRequest,
    });
    const referenceProjection = planProjection(entityReferencePlan);
    const variantProjection = planProjection(plan);
    recordCompatibilityDifference(
      JSON.stringify(variantProjection) !== JSON.stringify(referenceProjection),
      `${entryCase.id}:planner-entity-normalization`,
    );
    observations.push({ id: entryCase.id, referenceProjection, variantProjection });
  } catch (error) {
    recordCompatibilityDifference(true, `${entryCase.id}:planner-entity-throw`);
    observations.push({ id: entryCase.id, error: String(error?.message || error) });
  }
}

console.log(`CANONICAL_DOWNSTREAM_SEMANTIC_REDECISION_COUNT=${downstreamSemanticRedecisionCount}`);
console.log(`PRESENTATION_PROJECTION_DIFFERENCE_COUNT=${presentationProjectionDifferenceCount}`);
console.log(`COMPATIBILITY_PATH_REDECISION_COUNT=${compatibilityPathRedecisionCount}`);
console.log(`DOWNSTREAM_SEMANTIC_REDECISION_COUNT=${downstreamSemanticRedecisionCount}`);
console.log(`DOWNSTREAM_SEMANTIC_REDECISION_REASONS=${JSON.stringify(redecisionReasons)}`);
console.log(`PRESENTATION_PROJECTION_DIFFERENCE_REASONS=${JSON.stringify(presentationProjectionReasons)}`);
console.log(`COMPATIBILITY_PATH_REDECISION_REASONS=${JSON.stringify(compatibilityPathReasons)}`);
console.log(JSON.stringify({
  status: downstreamSemanticRedecisionCount === 0 ? 'PASS' : 'RED',
  canonicalDownstreamSemanticRedecisionCount: downstreamSemanticRedecisionCount,
  presentationProjectionDifferenceCount,
  compatibilityPathRedecisionCount,
  cases: observations,
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));

assert.equal(downstreamSemanticRedecisionCount, 0, 'canonical downstream consumers must not re-decide semantic meaning');
console.log('__EXIT_CODE=0');
