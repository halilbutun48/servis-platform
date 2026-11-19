#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';

const message = 'Taşımacılık tarafında üzerime düşen işlerin sınırı nedir?';

const result = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: {
    id: 994003,
    role: 'ROOM',
    companyId: null,
    roomId: 1,
    sessionVersion: 1,
  },
  screenContext: {
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
  },
  message,
  authSessionId: 'm18-k02-role-concept-regression',
});

const request = result?.semanticPlan?.canonicalRequest || {};
const action = request.semanticAction || {};

assert.equal(request.semanticScope?.class, 'PRODUCT_EXPLICIT', 'K02 scope');
assert.equal(action.actionClass, 'EXPLAIN', 'K02 action');
assert.equal(action.objectClass, 'SURFACE', 'K02 object');
assert.equal(request.operation, 'GENERAL_INFORMATION', 'K02 operation');
assert.equal(request.capability, 'GENERAL_INFORMATION', 'K02 capability');
assert.equal(result?.semanticPlan?.authorizationDecision?.status, 'ALLOW', 'K02 authorization');
assert.equal(action.resolutionStatus, 'RESOLVED', 'K02 resolution');
assert.equal(result?.semanticPlan?.family, 'ROLE_EXPLANATION_HELP', 'K02 family');
assert.equal(result?.conversationRoute, 'GENERIC_PRODUCT_HELP', 'K02 route');
assert.doesNotMatch(
  String(result?.reply || ''),
  /hangi kayıt|konuyu kastettiğini|numarasını/iu,
  'K02 must not fall into entity clarification',
);

console.log(JSON.stringify({
  status: 'PASS',
  caseId: 'K02',
  message,
  canonical: {
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: result?.semanticPlan?.authorizationDecision?.status || null,
    resolution: action.resolutionStatus || null,
  },
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
