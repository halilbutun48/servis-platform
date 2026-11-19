#!/usr/bin/env node

import assert from 'node:assert/strict';
import { inferCanonicalSemanticRequest, resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';

const company = { role: 'COMPANY', companyId: 1 };
const room = { role: 'ROOM', roomId: 1 };
const operationsContext = { path: '/company/operations', label: 'OPERATIONS', role: 'COMPANY' };

function resolve(message, { user = company, selectedEntity = null, screenContext = operationsContext, conversationState = null } = {}) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    selectedEntity,
    conversationState,
    screenContext,
    interpreterMode: 'DETERMINISTIC',
  });
}

function shape(message, options = {}) {
  return inferCanonicalSemanticRequest({ message, user: options.user || company, screenContext: options.screenContext || operationsContext, conversationState: options.conversationState || null });
}

function assertAction(result, expected, label) {
  assert.equal(result?.request?.semanticAction?.actionClass, expected.action, `${label} action`);
  assert.equal(result?.request?.semanticAction?.objectClass, expected.object, `${label} object`);
  assert.equal(result?.request?.operation, expected.operation, `${label} operation`);
  assert.equal(result?.request?.capability, expected.capability, `${label} capability`);
  assert.equal(result?.request?.semanticAction?.resolutionStatus, expected.resolution || 'RESOLVED', `${label} resolution`);
}

async function authorization(result, user, label) {
  return authorizeSemanticRequest({ user, request: result.request }).then((decision) => {
    assert.equal(decision?.status, 'ALLOW', `${label} authorization`);
    return decision;
  });
}

async function main() {
  const e01 = resolve('Operasyon listesinde yayımlanmış seferlerin hangileri olduğunu göster.');
  const f01 = resolve('Onaylanmış vardiyaları ayrıntılarıyla görüntüle.');

  const f01Shape = shape('Onaylanmış vardiyaları ayrıntılarıyla görüntüle.');
  assert.match(f01Shape.normalizedText, /vardiya/u, 'F01 intrinsic object wording');
  assert.equal(f01?.request?.semanticAction?.objectClass, 'SHIFT', 'F01 intrinsic object');
  assert.equal(f01?.request?.semanticScope?.class, 'PRODUCT_EXPLICIT', 'F01 semantic scope');
  assertAction(f01, {
    action: 'VIEW',
    object: 'SHIFT',
    operation: 'VIEW_AUTHORIZED_SURFACE',
    capability: 'VIEW_SHIFTS',
  }, 'F01');
  await authorization(f01, company, 'F01');

  assert.equal(e01?.request?.semanticScope?.class, 'PRODUCT_EXPLICIT', 'E01 semantic scope');
  assertAction(e01, {
    action: 'VIEW',
    object: 'SHIFT',
    operation: 'VIEW_AUTHORIZED_SURFACE',
    capability: 'VIEW_SHIFTS',
  }, 'E01');
  await authorization(e01, company, 'E01');

  const contrastive = [
    {
      id: 'A_INTRINSIC_OBJECT_ACTION',
      result: resolve('Vardiya kayıtlarını tarih sırasıyla incele.'),
      scope: 'PRODUCT_EXPLICIT',
    },
    {
      id: 'B_INTRINSIC_WITH_SURFACE',
      result: resolve('Anlaşma arşivini görüntüle.', { screenContext: { path: '/company/agreements', label: 'AGREEMENTS', role: 'COMPANY' } }),
      scope: 'PRODUCT_EXPLICIT',
    },
    {
      id: 'C_DEICTIC_CURRENT_SURFACE',
      result: resolve('Bu planı açıkla.', {
        screenContext: { path: '/company/planning-center', label: 'PLANNING_CENTER', role: 'COMPANY' },
        conversationState: { uniqueDiscourseReferent: { type: 'SHIFT', id: 77 }, recentMessages: [] },
      }),
      scope: 'PRODUCT_EXPLICIT',
    },
    {
      id: 'D_ACTIVE_CONTINUATION',
      result: resolve('Akışa devam edelim.', {
        screenContext: { path: '/company/planning-center', label: 'GUIDED_PLAN_STEP3', role: 'COMPANY' },
        conversationState: { activeGuidedTask: { taskId: 'dev-f01-task', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } } },
      }),
      scope: 'PRODUCT_CONTEXTUAL',
    },
    {
      id: 'E_UNIQUE_REFERENT',
      result: resolve('Az önce seçtiğim öğeyi yeniden aç.', {
        selectedEntity: { type: 'SHIFT', id: 42 },
        screenContext: { path: '/company/operations', label: 'OPERATIONS', role: 'COMPANY', selectedEntityId: 42, selectedEntityType: 'SHIFT' },
        conversationState: { uniqueDiscourseReferent: { type: 'SHIFT', id: 42 }, recentMessages: [] },
      }),
      scope: 'PRODUCT_EXPLICIT',
    },
    {
      id: 'F_NEW_INTENT_OVER_STALE_CONTEXT',
      result: resolve('Plan görevini bırakıp sözleşme kayıtlarına bak.', {
        screenContext: { path: '/company/planning-center', label: 'GUIDED_PLAN_STEP2', role: 'COMPANY' },
        conversationState: { activeGuidedTask: { taskId: 'dev-f01-stale', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } } },
      }),
      scope: 'PRODUCT_EXPLICIT',
    },
    {
      id: 'G_INSUFFICIENT_AND_AMBIGUOUS',
      result: resolve('Ne yapalım?', {
        screenContext: { path: '/company/operations', label: 'OPERATIONS', role: 'COMPANY' },
        conversationState: { recentMessages: [], activeDomain: 'SHIFTS' },
      }),
      scope: 'UNRESOLVED',
    },
    {
      id: 'H_GENUINE_OOS',
      result: resolve('Bana hafta sonu bir yemek öner.'),
      scope: 'OFF_TOPIC_GENUINE',
    },
  ];
  for (const item of contrastive) assert.equal(item.result?.request?.semanticScope?.class, item.scope, `${item.id} semantic scope`);

  const roomExplicit = resolve('Başka kuruma ait vardiya kaydını görüntüle.', {
    user: room,
    screenContext: { path: '/room/shifts', label: 'ROOM_SHIFTS', role: 'ROOM' },
  });
  assert.equal(roomExplicit?.request?.semanticScope?.class, 'PRODUCT_EXPLICIT', 'ROOM explicit scope');
  assertAction(roomExplicit, {
    action: 'VIEW',
    object: 'SHIFT',
    operation: 'VIEW_AUTHORIZED_SURFACE',
    capability: 'VIEW_SHIFTS',
  }, 'ROOM explicit');

  console.log(JSON.stringify({
    status: 'PASS',
    f01: f01.request.semanticScope,
    e01: e01.request.semanticScope,
    contrastive: contrastive.map(({ id, result }) => ({ id, scope: result.request.semanticScope })),
    room: roomExplicit.request.semanticScope,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
