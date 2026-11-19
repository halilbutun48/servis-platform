#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';

function resolve(message, {
  user = { role: 'COMPANY', companyId: 1 },
  screenContext = { path: '/company/operations', label: 'Operasyonlar', role: 'COMPANY' },
  conversationState = null,
} = {}) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    selectedEntity: null,
    conversationState,
    screenContext,
    interpreterMode: 'DETERMINISTIC',
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
}

function assertAction(result, expected, label) {
  assert.equal(result?.request?.semanticAction?.actionClass, expected.action, `${label} action`);
  assert.equal(result?.request?.semanticAction?.objectClass, expected.object, `${label} object`);
  assert.equal(result?.request?.operation, expected.operation, `${label} operation`);
  assert.equal(result?.request?.capability, expected.capability, `${label} capability`);
  assert.equal(result?.request?.semanticAction?.resolutionStatus, 'RESOLVED', `${label} resolution`);
}

function assertGenuineOos(result, label) {
  assert.equal(result?.request?.semanticScope?.class, 'OFF_TOPIC_GENUINE', `${label} scope`);
  assert.equal(result?.request?.typedEvidence?.requestMode?.value, 'GENUINE_OOS', `${label} request mode`);
  assert.equal(result?.request?.semanticAction?.actionClass, 'NONE', `${label} action`);
  assert.equal(result?.request?.semanticAction?.objectClass, null, `${label} object`);
  assert.equal(result?.request?.typedEvidence?.reference?.value, 'ABSENT', `${label} reference`);
  assert.equal(result?.request?.semanticAction?.resolutionStatus, 'NOT_APPLICABLE', `${label} resolution`);
  assert.equal(result?.request?.operation, 'GENERAL_INFORMATION', `${label} operation`);
}

async function assertAllowed(result, user, label) {
  const authorization = await authorizeSemanticRequest({ user, request: result.request });
  assert.equal(authorization?.status, 'ALLOW', `${label} authorization`);
}

async function main() {
  const e01User = { role: 'COMPANY', companyId: 1 };
  const e01 = resolve('Operasyon listesinde yayımlanmış seferlerin hangileri olduğunu göster.', {
    user: e01User,
  });
  assert.equal(e01?.request?.semanticScope?.class, 'PRODUCT_EXPLICIT', 'E01 semantic scope');
  assertAction(e01, {
    action: 'VIEW',
    object: 'SHIFT',
    operation: 'VIEW_AUTHORIZED_SURFACE',
    capability: 'VIEW_SHIFTS',
  }, 'E01');
  await assertAllowed(e01, e01User, 'E01');

  const contrastiveCases = [
    {
      id: 'A_EXPLICIT_PRODUCT',
      message: 'Sefer kayıtlarını incele.',
      expectedScope: 'PRODUCT_EXPLICIT',
      expectedAction: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
    },
    {
      id: 'B_CONTEXT_DEPENDENT',
      message: 'Buradan ilerlemeye devam edelim.',
      expectedScope: 'PRODUCT_CONTEXTUAL',
      expectedAction: { action: 'CONTINUE', object: 'SHIFT', operation: 'CONTINUE_EXPLANATION', capability: 'CONTINUE_SETTLED_TASK' },
      conversationState: {
        activeGuidedTask: { taskId: 'active-guidance', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
        lastSettledResult: { requestId: 'active-settled', continuationDepth: 1 },
      },
    },
    {
      id: 'C_EXPLICIT_WITH_SUPPORTING_SURFACE',
      message: 'Aktif vardiya kayıtlarını incele.',
      expectedScope: 'PRODUCT_EXPLICIT',
      expectedAction: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
    },
    {
      id: 'D_CONTEXTUAL_WITH_SURFACE',
      message: 'Akışa devam edelim.',
      expectedScope: 'PRODUCT_CONTEXTUAL',
      expectedAction: { action: 'CONTINUE', object: 'SHIFT', operation: 'CONTINUE_EXPLANATION', capability: 'CONTINUE_SETTLED_TASK' },
      conversationState: {
        activeGuidedTask: { taskId: 'surface-guidance', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
        lastSettledResult: { requestId: 'surface-settled', continuationDepth: 1 },
      },
    },
    {
      id: 'E_EXPLICIT_NEW_INTENT',
      message: 'Sözleşme ekranına geçelim.',
      expectedScope: 'PRODUCT_EXPLICIT',
      expectedAction: { action: 'NAVIGATE', object: 'AGREEMENT', operation: 'NAVIGATE_AUTHORIZED_SURFACE', capability: 'OPEN_AGREEMENTS_SURFACE' },
      conversationState: {
        activeGuidedTask: { taskId: 'stale-create', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
        lastSettledResult: { requestId: 'stale-settled', continuationDepth: 1 },
      },
    },
    {
      id: 'F_AMBIGUOUS_OR_UNRESOLVED',
      message: 'Bu kayıtlar arasında hangisi?',
      expectedScope: 'PRODUCT_AMBIGUOUS',
      expectedAction: null,
      expectedResolution: 'UNRESOLVED',
    },
    {
      id: 'G_GENUINE_OOS',
      message: 'Akşam için film önerir misin?',
      expectedScope: 'OFF_TOPIC_GENUINE',
      expectedAction: null,
    },
  ];

  for (const testCase of contrastiveCases) {
    const result = resolve(testCase.message, {
      conversationState: testCase.conversationState || null,
    });
    if (Array.isArray(testCase.expectedScope)) {
      assert.ok(testCase.expectedScope.includes(result?.request?.semanticScope?.class), `${testCase.id} scope`);
    } else {
      assert.equal(result?.request?.semanticScope?.class, testCase.expectedScope, `${testCase.id} scope`);
    }
    if (testCase.expectedAction) assertAction(result, testCase.expectedAction, testCase.id);
    if (testCase.expectedResolution) {
      assert.equal(result?.request?.semanticAction?.resolutionStatus, testCase.expectedResolution, `${testCase.id} resolution`);
    }
  }

  const mediaEntertainmentCases = [
    'Akşam için film önerir misin?',
    'Bu akşam hangi filmi izleyeyim?',
    'Bana bir dizi önerir misin?',
    'Okumak için bir kitap öner.',
    'Dinlemek için müzik öner.',
  ];
  for (const message of mediaEntertainmentCases) {
    assertGenuineOos(resolve(message), `MEDIA_ENTERTAINMENT:${message}`);
  }

  const productRecommendationCases = [
    'Bana en uygun teklif seçeneğini öner.',
    'Bu vardiya için uygun aracı öner.',
    'Bu sözleşme için ne önerirsin?',
    'Bu personel planı için önerin nedir.',
  ];
  for (const message of productRecommendationCases) {
    const result = resolve(message);
    assert.notEqual(result?.request?.semanticScope?.class, 'OFF_TOPIC_GENUINE', `PRODUCT_RECOMMENDATION:${message} scope`);
    assert.notEqual(result?.request?.typedEvidence?.requestMode?.value, 'GENUINE_OOS', `PRODUCT_RECOMMENDATION:${message} request mode`);
  }

  const roomUser = { role: 'ROOM', roomId: 1, companyId: 2 };
  const roomExplicit = resolve('Sefer kayıtlarını incele.', {
    user: roomUser,
    screenContext: { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' },
  });
  assert.equal(roomExplicit?.request?.semanticScope?.class, 'PRODUCT_EXPLICIT', 'ROOM explicit scope');
  assertAction(roomExplicit, {
    action: 'VIEW',
    object: 'SHIFT',
    operation: 'VIEW_AUTHORIZED_SURFACE',
    capability: 'VIEW_SHIFTS',
  }, 'ROOM explicit');
  await assertAllowed(roomExplicit, roomUser, 'ROOM explicit');

  console.log(JSON.stringify({
    status: 'PASS',
    e01: e01.request.semanticScope,
    contrastiveCases: contrastiveCases.map(({ id, expectedScope }) => ({ id, expectedScope })),
    room: roomExplicit.request.semanticScope,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
