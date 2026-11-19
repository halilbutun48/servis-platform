#!/usr/bin/env node

import assert from 'node:assert/strict';
import { deriveAuthorExpectation } from './lib/m18HoldoutExpectationAuthor.mjs';
import { deriveAuditedExpectation } from './lib/m18HoldoutExpectationAuditor.mjs';
import { extractTurkishSemanticFeatures } from '../src/ai/chat/turkishSemanticFeatures.js';
import { composeSemanticEvidence } from '../src/ai/chat/semanticEvidenceComposer.js';

const surface = { id: 1100, path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' };
const activeConversationState = {
  activeGuidedTask: {
    taskId: 'm18-contract-arbitration-active-task',
    workflowIntent: 'CREATE_SHIFT',
    taskState: 'ACTIVE',
    semanticPlan: { workflowIntent: 'CREATE_SHIFT' },
  },
  activeTask: null,
};
const continuationSeed = {
  schemaVersion: 'M18-CONTINUATION-AUTHORING-STATE-V1',
  stateKind: 'ROLE_SEQUENTIAL_AUTH_SESSION',
  status: 'VALID',
  validated: true,
  priorCaseIds: ['M18-CONTRACT-ARBITRATION-PRIOR-ROOM'],
  priorCanonicalTask: 'SCREEN_CONTEXT',
  priorOperation: 'EXPLAIN_CURRENT_SURFACE',
  priorObjectClass: 'SURFACE',
  priorSemanticScope: 'PRODUCT_EXPLICIT',
  priorReference: 'ABSENT',
  priorResolutionStatus: 'RESOLVED',
  currentSurface: surface,
  selectedEntity: null,
  selectedRecord: null,
  priorGuidedTarget: null,
  priorGuidedTask: 'SCREEN_CONTEXT',
  sessionScope: { role: 'ROOM', tenantContext: { type: 'ROOM', roomId: 1 } },
  continuationBaseObjectClass: 'RECORD',
  conversationStateRequired: true,
};

const continuation = deriveAuthorExpectation({
  role: 'ROOM',
  text: 'Devamını anlat',
  TURN_1: 'Taşımacılık Merkezi ekranında günlük iş akışının başlangıç çerçevesini açıklar mısın?',
  currentSurface: surface,
  continuationState: continuationSeed,
});
assert.equal(continuation.safe, true, `continuation authoring must be safe: ${continuation.failures.join(',')}`);
assert.equal(continuation.frame.action, 'CONTINUE');
assert.equal(continuation.frame.scope, 'PRODUCT_CONTEXTUAL');
assert.equal(continuation.frame.object, 'RECORD', 'continuation must use the server-owned continuation record object');

const auditedContinuation = deriveAuditedExpectation({
  role: 'ROOM',
  text: 'Devamını anlat',
  priorTurn: 'Taşımacılık Merkezi ekranında günlük iş akışının başlangıç çerçevesini açıklar mısın?',
  currentSurface: surface,
  continuationState: continuationSeed,
});
assert.equal(auditedContinuation.safe, true, `continuation audit must be safe: ${auditedContinuation.failures.join(',')}`);
assert.equal(auditedContinuation.frame.object, 'RECORD', 'auditor must use the server-owned continuation record object');

const compositionalCapability = deriveAuthorExpectation({
  role: 'ROOM',
  text: 'Yeni bir vardiya oluşturmak istiyorum; ROOM rolüyle oluşturma yetkim var mı?',
  currentSurface: surface,
});
assert.equal(compositionalCapability.safe, true, `create-capability authoring must be safe: ${compositionalCapability.failures.join(',')}`);
assert.equal(compositionalCapability.frame.requestMode, 'EXPLAIN');
assert.equal(compositionalCapability.frame.action, 'CREATE');
assert.equal(compositionalCapability.frame.operation, 'OPEN_EXISTING_SHIFT_OPERATIONS');
assert.equal(compositionalCapability.authorization.authorizationClass, 'ALLOW_GUIDANCE');

const auditedCompositionalCapability = deriveAuditedExpectation({
  role: 'ROOM',
  text: 'Yeni bir vardiya oluşturmak istiyorum; ROOM rolüyle oluşturma yetkim var mı?',
  currentSurface: surface,
});
assert.equal(auditedCompositionalCapability.safe, true, `create-capability audit must be safe: ${auditedCompositionalCapability.failures.join(',')}`);
assert.equal(auditedCompositionalCapability.frame.requestMode, 'EXPLAIN');
assert.equal(auditedCompositionalCapability.frame.action, 'CREATE');
assert.equal(auditedCompositionalCapability.frame.operation, 'OPEN_EXISTING_SHIFT_OPERATIONS');
assert.equal(auditedCompositionalCapability.authorization.authorizationClass, 'ALLOW_GUIDANCE');

for (const [role, expectedAuthorization] of [
  ['COMPANY', 'AUTHORIZED_PLANNING_INTENT'],
  ['SCHOOL', 'AUTHORIZATION_DENIAL'],
  ['ORGANIZATION', 'AUTHORIZATION_DENIAL'],
  ['DRIVER', 'AUTHORIZATION_DENIAL'],
  ['PERSONEL', 'AUTHORIZATION_DENIAL'],
  ['PARENT', 'AUTHORIZATION_DENIAL'],
  ['SUPER_ADMIN', 'AUTHORIZED_OPERATION'],
]) {
  const roleExpectation = deriveAuthorExpectation({
    role,
    text: `Yeni bir vardiya oluşturmak istiyorum; ${role} rolüyle oluşturma yetkim var mı?`,
    currentSurface: { ...surface, role },
  });
  assert.equal(roleExpectation.safe, true, `${role} create-capability authoring must be safe`);
  assert.equal(roleExpectation.frame.requestMode, 'EXPLAIN', `${role} capability question uses EXPLAIN request mode`);
  assert.equal(roleExpectation.frame.action, 'CREATE', `${role} capability question preserves CREATE action`);
  assert.equal(roleExpectation.authorization.authorizationClass, expectedAuthorization, `${role} create capability contract`);
}

const pureCapability = deriveAuthorExpectation({
  role: 'ROOM',
  text: 'ROOM rolüyle vardiya oluşturma yetkim var mı?',
  currentSurface: surface,
});
assert.equal(pureCapability.safe, true, `pure capability authoring must be safe: ${pureCapability.failures.join(',')}`);
assert.equal(pureCapability.frame.action, 'EXPLAIN');
assert.equal(pureCapability.frame.operation, 'LOOK_UP_FIELD');

const auditedPureCapability = deriveAuditedExpectation({
  role: 'ROOM',
  text: 'ROOM rolüyle vardiya oluşturma yetkim var mı?',
  currentSurface: surface,
});
assert.equal(auditedPureCapability.safe, true, `pure capability audit must be safe: ${auditedPureCapability.failures.join(',')}`);
assert.equal(auditedPureCapability.frame.action, 'EXPLAIN');
assert.equal(auditedPureCapability.frame.operation, 'LOOK_UP_FIELD');

const supportedContinuationVariants = [
  'daha fazla anlat?',
  'biraz daha anlat?',
  'adım adım anlat?',
  'devamını anlat?',
  'devamını açıkla?',
  'devamını açıklar mısın?',
];
for (const text of supportedContinuationVariants) {
  const evidence = composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context: { currentSurface: surface },
    conversationState: activeConversationState,
    screenContext: surface,
  });
  assert.equal(
    evidence.requestMode?.value,
    'CONTINUE',
    `supported continuation variant must preserve CONTINUE request mode: ${text}`,
  );
}

console.log(JSON.stringify({
  status: 'PASS',
  cases: {
    continuationPriorSurface: continuation.frame,
    compositionalCreateCapability: compositionalCapability.frame,
    pureCapabilityQuestion: pureCapability.frame,
  },
  businessWriteExecution: 0,
}, null, 2));
