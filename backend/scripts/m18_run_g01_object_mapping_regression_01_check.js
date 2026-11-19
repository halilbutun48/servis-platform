#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { applyCanonicalConversationTransition } from '../src/ai/chat/canonicalConversationState.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = 'NEW';

const company = { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' };
const g01Screen = {
  path: '/company/operations',
  label: 'Operasyon Paneli',
  role: 'COMPANY',
  companyKind: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Vardiyalar', disabled: false, semanticType: 'button', identitySource: 'LEGACY_LABEL' },
      { label: 'Servis KanıtıHakediş için nihai karar değildir.▸', disabled: false, semanticType: 'button', identitySource: 'LEGACY_LABEL' },
    ],
    activeTabs: ['Operasyon Paneli'],
    workflowState: null,
    currentTarget: null,
    foregroundSurface: null,
  },
};

function resolve(message, { user = company, screenContext = g01Screen, conversationState = null } = {}) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState,
    interpreterMode: 'DETERMINISTIC',
  });
}

async function main() {
  const result = resolve('Hafta içi kapasiteye göre ayrılmış servis görevlerinin dökümünü aç.', {
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: g01Screen.uiHints },
  });

  assert.equal(result.request.semanticScope.class, 'PRODUCT_EXPLICIT', 'G01 semantic scope');
  assert.equal(result.request.semanticAction.actionClass, 'NAVIGATE', 'G01 action');
  assert.equal(result.request.semanticAction.objectClass, 'SURFACE', 'G01 object');
  assert.equal(result.request.operation, 'NAVIGATE_AUTHORIZED_SURFACE', 'G01 operation');
  assert.equal(result.request.capability, 'OPEN_SURFACE', 'G01 capability');
  assert.equal(result.request.semanticAction.resolutionStatus, 'RESOLVED', 'G01 resolution');
  const authorization = await authorizeSemanticRequest({ user: company, request: result.request });
  assert.equal(authorization.status, 'ALLOW', 'G01 authorization');

  const contrastive = [
    {
      id: 'A_CLEAR_OPERATIONAL_ENTITY',
      result: resolve('Servis görev listelerini incele.'),
      expected: { scope: 'PRODUCT_EXPLICIT', action: 'NAVIGATE', object: 'SURFACE', operation: 'NAVIGATE_AUTHORIZED_SURFACE', capability: 'OPEN_SURFACE_SURFACE' },
    },
    {
      id: 'B_GENERIC_SURFACE',
      result: resolve('Operasyon panelinin hangi bilgileri sunduğunu açıkla.'),
      expected: { object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
    },
    {
      id: 'C_OPERATIONAL_ENTITY_ON_SURFACE',
      result: resolve('Servis görev kayıtlarını incele.'),
      expected: { object: 'SURFACE', capability: 'OPEN_SURFACE_SURFACE' },
    },
    {
      id: 'D_CONTEXTUAL_SURFACE',
      result: resolve('Buradaki bölümün işleyişini açıklar mısın.'),
      expected: { object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
    },
    {
      id: 'E_SHIFT_CONTINUATION',
      result: resolve('Buradan ilerlemeye devam edelim.', {
        screenContext: { path: '/company', label: 'GUIDED_PLAN_STEP3', role: 'COMPANY', companyKind: 'COMPANY' },
        conversationState: { activeGuidedTask: { taskId: 'g01-contrast-task', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } } },
      }),
      expected: { scope: 'PRODUCT_CONTEXTUAL', action: 'CONTINUE', object: 'SHIFT', operation: 'CONTINUE_EXPLANATION' },
    },
    {
      id: 'F_NEW_SHIFT_INTENT',
      result: resolve('Yeni servis görevlerini görüntüle.', {
        conversationState: { activeGuidedTask: { taskId: 'g01-stale-surface', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } } },
      }),
      expected: { scope: 'PRODUCT_EXPLICIT', action: 'VIEW', object: 'SHIFT', capability: 'VIEW_SHIFTS' },
    },
    {
      id: 'G_AMBIGUOUS_OBJECT',
      result: resolve('Şu kayıtları açalım.', {
        screenContext: { path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY', companyKind: 'COMPANY' },
        conversationState: { multipleRecentReferents: [{ type: 'SHIFT', id: 1 }, { type: 'AGREEMENT', id: 2 }] },
      }),
      expected: { action: 'NONE', object: null, resolution: 'UNRESOLVED' },
    },
    {
      id: 'H_ROLE_BOUNDARY_PRESERVES_SHIFT',
      result: resolve('Oda tarafında yeni vardiya planlamak istiyorum.', {
        user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'ROOM' },
        screenContext: { path: '/room', label: 'ROOM', role: 'ROOM', companyKind: 'ROOM' },
      }),
      expected: { scope: 'PRODUCT_EXPLICIT', action: 'CREATE', object: 'SHIFT', operation: 'OPEN_EXISTING_SHIFT_OPERATIONS' },
    },
    {
      id: 'I_OTHER_SUPPORTED_OBJECT',
      result: resolve('Sözleşme kaydının ayrıntılarını görüntüle.', {
        screenContext: { path: '/company/agreements', label: 'AGREEMENTS', role: 'COMPANY', companyKind: 'COMPANY' },
      }),
      expected: { object: 'AGREEMENT', operation: 'VIEW_AUTHORIZED_SURFACE' },
    },
    {
      id: 'J_UNIQUE_REFERENT_RESOLUTION',
      result: resolve('Bu kaydın durumunu göster.', {
        conversationState: { uniqueDiscourseReferent: { type: 'SHIFT', id: 42 }, recentMessages: [] },
      }),
      expected: { scope: 'PRODUCT_EXPLICIT', action: 'VIEW', object: 'RECORD', operation: 'VIEW_AUTHORIZED_SURFACE', resolution: 'RESOLVED' },
    },
  ];
  for (const item of contrastive) {
    const actual = item.result.request;
    if (item.expected.scope) assert.equal(actual.semanticScope.class, item.expected.scope, `${item.id} scope`);
    if (item.expected.action) assert.equal(actual.semanticAction.actionClass, item.expected.action, `${item.id} action`);
    if (item.expected.object !== undefined) assert.equal(actual.semanticAction.objectClass, item.expected.object, `${item.id} object`);
    if (item.expected.operation) assert.equal(actual.operation, item.expected.operation, `${item.id} operation`);
    if (item.expected.capability) assert.equal(actual.capability, item.expected.capability, `${item.id} capability`);
    if (item.expected.resolution) assert.equal(actual.semanticAction.resolutionStatus, item.expected.resolution, `${item.id} resolution`);
  }
  assert.equal(contrastive[7].result.canonicalShape.roleCapabilityBoundary, 'ROOM_CREATE_UNSUPPORTED', 'ROOM policy boundary');

  const invalidated = applyCanonicalConversationTransition({
    state: {
      guidedTarget: { targetKey: 'stale-g01-target' },
      requestState: { requestedEntitySet: [{ type: 'SHIFT', id: 17 }] },
      revalidationRequired: false,
    },
    transition: 'INVALIDATE_STALE_CONTEXT',
    reason: 'G01 bounded stale-reference check',
  });
  assert.equal(invalidated.guidedTarget, null, 'STALE_REFERENCE_REJECTION clears stale target');
  assert.equal(invalidated.requestState, null, 'STALE_REFERENCE_REJECTION clears stale request state');
  assert.equal(invalidated.revalidationRequired, true, 'STALE_REFERENCE_REJECTION requires revalidation');

  console.log(JSON.stringify({
    status: 'PASS',
    semanticScope: result.request.semanticScope,
    semanticAction: result.request.semanticAction,
    operation: result.request.operation,
    capability: result.request.capability,
    authorization: authorization.status,
    contrastive: contrastive.map(({ id, result: item }) => ({
      id,
      scope: item.request.semanticScope.class,
      action: item.request.semanticAction.actionClass,
      object: item.request.semanticAction.objectClass,
      operation: item.request.operation,
      capability: item.request.capability,
      resolution: item.request.semanticAction.resolutionStatus,
    })),
    staleReferenceRejection: 'PASS',
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
