#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import {
  GUIDED_TARGET_STATUSES,
  resolveCopilotGuidedTarget,
} from '../src/ai/chat/copilotUiElementAnchor.js';

const user = { id: 111401, role: 'ROOM', roomId: 1 };
const screenContext = {
  id: 1114,
  path: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  role: 'ROOM',
  uiHints: {
    visibleButtons: [
      {
        label: 'Operasyon Merkezi',
        semanticType: 'button',
        targetKey: 'room:home',
        semanticId: 'product:room:home',
        identitySource: 'CANONICAL',
        disabled: false,
      },
      {
        label: 'Sürücü & Sorunlar5',
        semanticType: 'tab',
        targetKey: 'room-operation-health:tab:problems',
        semanticId: 'product:room-operation-health:tab:problems',
        identitySource: 'CANONICAL',
        disabled: false,
      },
    ],
    semanticElements: [
      {
        label: 'Sürücü / araç / canlılık / sorun',
        semanticType: 'field',
        targetKey: 'field:sürücü / araç / canlılık / sorun',
        identitySource: 'LEGACY_LABEL',
        disabled: false,
      },
    ],
  },
};

function resolve(message, conversationState = null) {
  const canonical = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  const semanticPlan = resolveSemanticIntent({
    message,
    user,
    screenContext,
    conversationState,
    canonicalRequest: canonical,
  });
  const target = resolveCopilotGuidedTarget({
    user,
    screenContext,
    conversationState,
    semanticPlan: {
      ...semanticPlan,
      canonicalRequest: canonical.request,
      typedRequest: semanticPlan.typedRequest,
    },
    message,
  });
  return { canonical, semanticPlan, target };
}

for (const message of [
  'Operasyon sorunlarını göster.',
  'Açık operasyon sorunlarını göster.',
  'Operasyondaki sorunları aç.',
]) {
  const result = resolve(message);
  assert.equal(result.canonical.request.operation, 'VIEW_AUTHORIZED_SURFACE', `${message}: canonical operation`);
  assert.equal(result.semanticPlan.family, 'UI_GUIDANCE', `${message}: explicit show family`);
  assert.equal(result.semanticPlan.typedRequest.domain, 'OPERATIONS', `${message}: operation-health domain`);
  assert.equal(result.target?.status, GUIDED_TARGET_STATUSES.FOUND, `${message}: target found`);
  assert.equal(result.target?.identitySource, 'CANONICAL', `${message}: canonical target identity`);
  assert.equal(result.target?.targetKey, 'room-operation-health:tab:problems', `${message}: problems target`);
}

const afterIssueDiscussion = resolve('Operasyon sorunlarını göster.', {
  lastSettledResult: {
    semanticPlan: { family: 'ISSUE_DIAGNOSTIC' },
  },
});
assert.equal(afterIssueDiscussion.canonical.request.operation, 'VIEW_AUTHORIZED_SURFACE', 'follow-up keeps VIEW operation');
assert.equal(afterIssueDiscussion.target?.targetKey, 'room-operation-health:tab:problems', 'follow-up keeps the canonical problems target');

const tabNavigation = resolve('Sorunlar sekmesine götür.');
assert.equal(tabNavigation.canonical.request.operation, 'NAVIGATE_AUTHORIZED_SURFACE', 'tab navigation keeps a navigation operation');
assert.equal(tabNavigation.semanticPlan.typedRequest.domain, 'OPERATIONS', 'tab navigation keeps operation-health domain');
assert.equal(tabNavigation.target?.status, GUIDED_TARGET_STATUSES.FOUND, 'tab navigation resolves a real target');
assert.equal(tabNavigation.target?.identitySource, 'CANONICAL', 'tab navigation uses canonical target identity');
assert.equal(tabNavigation.target?.targetKey, 'room-operation-health:tab:problems', 'tab navigation resolves the problems tab');
assert.equal(tabNavigation.target?.safeAction, 'NAVIGATE', 'tab navigation exposes a safe tab-navigation action');

const tabNavigationAfterDiscussion = resolve('Sorunlar sekmesine götür.', {
  lastSettledResult: {
    semanticPlan: { family: 'ISSUE_DIAGNOSTIC' },
  },
});
assert.equal(tabNavigationAfterDiscussion.target?.targetKey, 'room-operation-health:tab:problems', 'tab navigation after issue discussion keeps the canonical problems target');

const wrongScreenNavigation = resolveCanonicalConversationRequest({
  message: 'Sorunlar sekmesine götür.',
  user,
  screenContext: { ...screenContext, path: '/room/shifts' },
  conversationState: null,
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
});
assert.equal(wrongScreenNavigation.request.operation, 'NAVIGATE_AUTHORIZED_SURFACE', 'wrong-screen tab request remains a navigation intent');
const wrongScreenPlan = resolveSemanticIntent({
  message: 'Sorunlar sekmesine götür.',
  user,
  screenContext: { ...screenContext, path: '/room/shifts' },
  conversationState: null,
  canonicalRequest: wrongScreenNavigation,
});
const wrongScreenTarget = resolveCopilotGuidedTarget({
  user,
  screenContext: { ...screenContext, path: '/room/shifts' },
  conversationState: null,
  semanticPlan: {
    ...wrongScreenPlan,
    canonicalRequest: wrongScreenNavigation.request,
    typedRequest: wrongScreenPlan.typedRequest,
  },
  message: 'Sorunlar sekmesine götür.',
});
assert.equal(wrongScreenTarget, null, 'wrong-screen tab request fails closed without an operation-health target');

for (const message of ['Operasyon merkezine götür.', 'Operasyon merkezini aç.']) {
  const result = resolve(message);
  const expectedOperation = message.includes('götür') ? 'EXPLAIN_CURRENT_SURFACE' : 'NAVIGATE_AUTHORIZED_SURFACE';
  assert.equal(result.canonical.request.operation, expectedOperation, `${message}: generic surface operation`);
  assert.equal(result.target?.targetKey, 'room:home', `${message}: generic Operations Center target`);
}

const explanation = resolve('Operasyon sorunları neler?');
assert.equal(explanation.semanticPlan.family, 'ISSUE_DIAGNOSTIC', 'explanation remains an issue diagnostic');
assert.equal(explanation.target, null, 'explanation-only request does not force GÖSTER');

const where = resolve('Operasyon sorunları nerede?');
assert.equal(where.semanticPlan.family, 'UI_GUIDANCE', 'where-question remains explanatory surface guidance');

console.log('M18_CAP39_OPERATION_PROBLEM_SEMANTIC_EQUIVALENCE=GREEN');
