#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';

const user = { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' };
const screenContext = {
  path: '/company/operations',
  label: 'Operasyon Paneli',
  role: 'COMPANY',
};
const message = 'Yeni bir şirket hesabında önce hangi alanların görevini öğrenmeliyim?';

function resolve(text = message) {
  return resolveCanonicalConversationRequest({
    message: text,
    user,
    screenContext,
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
    interpreterMode: 'DETERMINISTIC',
  });
}

const result = resolve();
const request = result.request;
const authorization = await authorizeSemanticRequest({ user, request });

// RED guard: the frozen defect is specifically semantic action selection. The
// surrounding scope/object/policy/resolution facts must already be correct.
assert.equal(request.semanticScope.class, 'PRODUCT_EXPLICIT', 'I01 scope precondition');
assert.equal(request.semanticAction.objectClass, 'SURFACE', 'I01 object precondition');
assert.equal(request.semanticAction.resolutionStatus, 'RESOLVED', 'I01 resolution precondition');
assert.equal(authorization.status, 'ALLOW', 'I01 authorization precondition');

assert.equal(request.semanticAction.actionClass, 'EXPLAIN', 'I01 action');
assert.equal(request.operation, 'GENERAL_INFORMATION', 'I01 operation');
assert.equal(request.capability, 'GENERAL_INFORMATION', 'I01 capability');

console.log(JSON.stringify({
  status: 'PASS',
  caseId: 'I01',
  message,
  canonical: {
    scope: request.semanticScope.class,
    action: request.semanticAction.actionClass,
    object: request.semanticAction.objectClass,
    operation: request.operation,
    capability: request.capability,
    authorization: authorization.status,
    resolution: request.semanticAction.resolutionStatus,
  },
}, null, 2));
