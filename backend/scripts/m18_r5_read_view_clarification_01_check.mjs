import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';

const authorityEnv = { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' };
const company = { id: 10, role: 'COMPANY', companyId: 10 };
const parent = { id: 11, role: 'PARENT', companyId: 10 };
const companySurface = { id: 2101, path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' };

async function trace(message, user = company, screenContext = companySurface) {
  const canonical = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState: null,
    env: authorityEnv,
  });
  const plan = resolveSemanticIntent({ message, user, screenContext, conversationState: null, canonicalRequest: canonical });
  const authorization = await authorizeSemanticRequest({ user, plan, request: canonical.request });
  return { canonical, authorization };
}

function assertCanonical(name, result, expected) {
  assert.equal(result.canonical.request.semanticAction?.actionClass, expected.action, `${name}: action`);
  assert.equal(result.canonical.request.semanticAction?.objectClass, expected.object, `${name}: object`);
  assert.equal(result.canonical.request.operation, expected.operation, `${name}: operation`);
  assert.equal(result.authorization.status, expected.policy, `${name}: policy`);
  assert.equal(result.authorization.authorizationStatus, expected.nativeStatus, `${name}: native status`);
}

const cases = [];
const add = async (name, message, user, expected) => {
  const result = await trace(message, user);
  assertCanonical(name, result, expected);
  cases.push({ name, message, expected, actual: {
    action: result.canonical.request.semanticAction?.actionClass,
    object: result.canonical.request.semanticAction?.objectClass,
    operation: result.canonical.request.operation,
    policy: result.authorization.status,
    nativeStatus: result.authorization.authorizationStatus,
    deniedCandidateRefs: result.authorization.deniedCandidateRefs,
  } });
};

// Collection/list reads do not require a selected record.  This is the RED
// family exposed by R5-COMPANY-03 and its seven role-equivalent cases.
await add('plain-list-view', 'Vardiya listesini getirir misin?', company, {
  action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', policy: 'ALLOW', nativeStatus: 'AUTHORIZED',
});
await add('temporal-list-view', 'Bu haftanın vardiya listesini getirir misin?', company, {
  action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', policy: 'ALLOW', nativeStatus: 'AUTHORIZED',
});
await add('current-list-view', 'Bugünkü vardiyaları gösterir misin?', company, {
  action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', policy: 'ALLOW', nativeStatus: 'AUTHORIZED',
});
const nonShiftCollectionRequest = {
  version: 'SEFER-ABI-CANONICAL-REQUEST-V3',
  operation: 'VIEW_AUTHORIZED_SURFACE',
  domain: 'AGREEMENTS',
  capability: 'VIEW_AGREEMENTS',
  candidateEntityRefs: [{ type: 'AGREEMENT', id: null, source: 'TEXT_ENTITY_CANDIDATE' }],
};
const nonShiftCollectionAuth = await authorizeSemanticRequest({
  user: company,
  plan: { typedRequest: { taskType: 'SCREEN_CONTEXT', selectedRecordIntent: false, recordDetailsIntent: false } },
  request: nonShiftCollectionRequest,
});
assert.equal(nonShiftCollectionAuth.status, 'ALLOW', 'non-shift collection policy');
assert.equal(nonShiftCollectionAuth.authorizationStatus, 'AUTHORIZED', 'non-shift collection native status');
cases.push({ name: 'non-shift-collection-view', expected: { policy: 'ALLOW', nativeStatus: 'AUTHORIZED' }, actual: nonShiftCollectionAuth });

// A type-only read without a selected record is a collection/surface read;
// clarification is reserved for an actually unresolved record reference.
await add('unresolved-record-view', 'Vardiya kaydını gösterir misin?', company, {
  action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', policy: 'ALLOW', nativeStatus: 'AUTHORIZED',
});
await add('record-details-without-id', 'Vardiya detayını gösterir misin?', company, {
  action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', policy: 'ALLOW', nativeStatus: 'AUTHORIZED',
});

// Existing authorization axes must remain independent.
await add('incomplete-create', 'Sıfırdan vardiya kurmak istiyorum.', company, {
  action: 'CREATE', object: 'SHIFT', operation: 'CREATE_SHIFT', policy: 'ALLOW', nativeStatus: 'REQUIRES_CLARIFICATION',
});
await add('unresolved-update', 'Şu vardiya kaydını günceller misin?', company, {
  action: 'NONE', object: null, operation: 'CLARIFY_SEMANTIC_REQUEST', policy: 'ALLOW', nativeStatus: 'AUTHORIZED',
});

const unauthorizedRequest = {
  version: 'SEFER-ABI-CANONICAL-REQUEST-V3',
  operation: 'VIEW_AUTHORIZED_SURFACE',
  domain: 'BUDGET',
  capability: 'VIEW_BUDGET',
  candidateEntityRefs: [],
};
const unauthorized = await authorizeSemanticRequest({ user: parent, plan: {}, request: unauthorizedRequest });
assert.equal(unauthorized.status, 'DENY', 'unauthorized read must remain denied');
assert.equal(unauthorized.authorizationStatus, 'DENIED', 'unauthorized read native status');
cases.push({ name: 'unauthorized-read', expected: { policy: 'DENY', nativeStatus: 'DENIED' }, actual: unauthorized });

console.log(JSON.stringify({
  READ_VIEW_CLARIFICATION_TEST_COUNT: cases.length,
  READ_VIEW_CLARIFICATION_PASS_COUNT: cases.length,
  READ_VIEW_CLARIFICATION_SUITE_STATUS: 'GREEN',
  cases,
}, null, 2));
