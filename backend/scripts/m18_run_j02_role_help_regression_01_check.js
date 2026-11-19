#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';

const message = 'Taşıma firması kullanıcısı olarak günlük sorumluluklarımı nereden tanıyacağım?';

const result = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: {
    id: 994002,
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
  authSessionId: 'm18-j02-role-help-regression',
});

const request = result?.semanticPlan?.canonicalRequest || {};
const action = request.semanticAction || {};

assert.equal(request.semanticScope?.class, 'PRODUCT_EXPLICIT', 'J02 scope');
assert.equal(action.actionClass, 'EXPLAIN', 'J02 action');
assert.equal(action.objectClass, 'SURFACE', 'J02 object');
assert.ok(['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(request.operation), 'J02 operation');
assert.ok(['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(request.capability), 'J02 capability');
assert.equal(result?.semanticPlan?.authorizationDecision?.status, 'ALLOW', 'J02 authorization');
assert.equal(action.resolutionStatus, 'RESOLVED', 'J02 resolution');
assert.equal(result?.semanticPlan?.family, 'ROLE_EXPLANATION_HELP', 'J02 family');
assert.equal(result?.conversationRoute, 'GENERIC_PRODUCT_HELP', 'J02 route');
assert.doesNotMatch(
  String(result?.reply || ''),
  /hangi kayıt|konuyu kastettiğini|numarasını/iu,
  'J02 must not fall into entity clarification',
);

console.log(JSON.stringify({
  status: 'PASS',
  caseId: 'J02',
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
