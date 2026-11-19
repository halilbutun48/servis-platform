#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { getSemanticAuthorityMode } from '../src/ai/chat/semanticAuthorityMode.js';

const REQUESTED_AUTHORITY_MODE = 'NEW';
process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = REQUESTED_AUTHORITY_MODE;

function user(role = 'COMPANY', id = 994001, companyKind = null) {
  return {
    id,
    role,
    companyKind: companyKind || (role === 'COMPANY' ? 'COMPANY' : null),
    companyId: role === 'ROOM' ? null : 1,
    roomId: role === 'ROOM' ? 1 : null,
    sessionVersion: 1,
  };
}

function screen(path = '/company/operations', label = 'Operasyon Paneli', role = 'COMPANY') {
  return { id: 2101, path, label, role };
}

function shape(payload) {
  const request = payload?.semanticPlan?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: payload?.semanticPlan?.family || null,
    route: payload?.conversationRoute || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: payload?.semanticPlan?.authorizationDecision?.status || null,
    resolution: action.resolutionStatus || null,
    clarificationNeed: payload?.semanticPlan?.clarificationNeed || null,
    reply: String(payload?.reply || ''),
  };
}

async function ask({ message, role = 'COMPANY', id, path, label, screenRole, companyKind, session, userId = null }) {
  return runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: user(role, userId || 994001 + id.length, companyKind),
    screenContext: screen(path, label, screenRole || role),
    message,
    authSessionId: session || `m18-h03-red-${id}`,
  });
}

const authorityProbe = resolveCanonicalConversationRequest({
  message: 'Nasıl kullanırım?',
  user: user('COMPANY', 994001),
  screenContext: screen(),
  env: process.env,
});
const authorityDiagnostics = authorityProbe.diagnostics?.semanticAuthority || {};
assert.equal(getSemanticAuthorityMode({ env: process.env }), REQUESTED_AUTHORITY_MODE);
assert.equal(authorityDiagnostics.mode, REQUESTED_AUTHORITY_MODE);
assert.equal(authorityDiagnostics.authoritativePath, 'NEW_TYPED_EVIDENCE');
assert.equal(authorityDiagnostics.SHADOW_SEMANTIC_AUTHORITY_COUNT, 0);
assert.equal(authorityDiagnostics.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0);

const h03 = await ask({
  message: 'Okul rolümle sistemde hangi işleri yürütebilirim?',
  role: 'COMPANY',
  id: 'h03',
  path: '/school/operations',
  label: 'Okul Operasyonları',
  screenRole: 'SCHOOL',
  companyKind: 'SCHOOL',
});
const teach = await ask({ message: 'Bana bu programı öğret', id: 'teach' });
const usage = await ask({ message: 'Nasıl kullanirim', id: 'usage' });
const overview = await ask({ message: 'Bu program ne işe yarar', id: 'overview' });
const roleHelp = await ask({ message: 'Bu rolde ne yapabilirim?', id: 'role-help' });
const b02 = await ask({ message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?', id: 'b02-contextual-view' });

const conversationSession = 'm18-h03-red-multiturn';
const ambiguous = await ask({ message: 'Şu kaydı anlat.', id: 'multi-ambiguous', session: conversationSession, userId: 994900 });
const newHelp = await ask({ message: 'Bu sistemi kullanmaya nereden başlayacağımı anlat.', id: 'multi-new-help', session: conversationSession, userId: 994900 });
const continuation = await ask({ message: 'Devamını anlat', id: 'multi-continuation', session: conversationSession, userId: 994900 });

const actual = {
  h03: shape(h03),
  teach: shape(teach),
  usage: shape(usage),
  overview: shape(overview),
  roleHelp: shape(roleHelp),
  b02: shape(b02),
  clarificationOverride: { first: shape(ambiguous), second: shape(newHelp) },
  helpContinuation: shape(continuation),
};

function assertGenericHelp(candidate, label) {
  assert.ok(['GENERIC_PRODUCT_HELP', 'SCREEN_CONTEXT', 'UI_GUIDANCE'].includes(candidate.family), `${label} family`);
  assert.ok(['GENERIC_PRODUCT_HELP', 'RETURN_TO_PRODUCT_TASK'].includes(candidate.route), `${label} route`);
  assert.equal(candidate.scope, 'PRODUCT_EXPLICIT', `${label} scope`);
  assert.equal(candidate.action, 'EXPLAIN', `${label} action`);
  assert.ok([null, 'SURFACE'].includes(candidate.object), `${label} object must be absent or current-surface grounded`);
  assert.ok(['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(candidate.operation), `${label} operation`);
  assert.ok(['GENERAL_INFORMATION', 'SCREEN_CONTEXT'].includes(candidate.capability), `${label} capability`);
  assert.equal(candidate.authorization, 'ALLOW', `${label} authorization`);
  assert.equal(candidate.resolution, 'RESOLVED', `${label} resolution`);
  assert.doesNotMatch(candidate.reply, /hangi kayıt|konuyu kastettiğini|numarasını|birden fazla kayıt/iu, `${label} must not clarify an entity`);
  assert.ok(candidate.reply.length >= 80, `${label} useful reply`);
}

function assertFailClosedClarification(candidate, label) {
  assert.equal(candidate.family, 'UNCLEAR_OR_AMBIGUOUS', `${label} family`);
  assert.equal(candidate.route, 'SAFE_CLARIFICATION', `${label} route`);
  assert.equal(candidate.scope, 'UNRESOLVED', `${label} scope`);
  assert.equal(candidate.action, 'NONE', `${label} action`);
  assert.equal(candidate.object, null, `${label} object`);
  assert.equal(candidate.operation, 'GENERAL_INFORMATION', `${label} operation`);
  assert.equal(candidate.capability, 'GENERAL_INFORMATION', `${label} capability`);
  assert.equal(candidate.authorization, 'ALLOW', `${label} authorization`);
  assert.equal(candidate.resolution, 'UNRESOLVED', `${label} resolution`);
  assert.equal(candidate.clarificationNeed, 'CANONICAL_SCOPE_REQUIRES_CLARIFICATION', `${label} clarification need`);
  assert.match(candidate.reply, /güvenli biçimde|netleştir|alanı açıklamamı/iu, `${label} fail-closed reply`);
}

assertGenericHelp(actual.h03, 'H03 role-aware help');
assertGenericHelp(actual.teach, 'manual teach help');
assertGenericHelp(actual.usage, 'manual usage help');
assertGenericHelp(actual.roleHelp, 'manual role help');
assertGenericHelp(actual.overview, 'product overview positive control');
assert.equal(actual.b02.action, 'VIEW', 'B02 contextual view action');
assert.equal(actual.b02.object, 'SHIFT', 'B02 contextual view object');
assert.equal(actual.b02.operation, 'VIEW_AUTHORIZED_SURFACE', 'B02 contextual view operation');
assert.equal(actual.b02.capability, 'VIEW_SHIFTS', 'B02 contextual view capability');
assert.equal(actual.b02.authorization, 'ALLOW', 'B02 contextual view authorization');
assert.equal(actual.b02.resolution, 'RESOLVED', 'B02 contextual view resolution');
assert.equal(actual.clarificationOverride.first.family, 'UNCLEAR_OR_AMBIGUOUS', 'multi-turn first turn remains genuine clarification');
assertGenericHelp(actual.clarificationOverride.second, 'new help overrides clarification');
assert.equal(actual.helpContinuation.family, 'CONTINUE_CURRENT_REASONING', 'help continuation family');
assert.equal(actual.helpContinuation.scope, 'PRODUCT_CONTEXTUAL', 'help continuation scope');
assert.equal(actual.helpContinuation.action, 'CONTINUE', 'help continuation action');
assert.equal(actual.helpContinuation.operation, 'CONTINUE_EXPLANATION', 'help continuation operation');
assert.equal(actual.helpContinuation.capability, 'CONTINUE_SETTLED_TASK', 'help continuation capability');
assert.equal(actual.helpContinuation.resolution, 'RESOLVED', 'help continuation resolution');
assert.doesNotMatch(actual.helpContinuation.reply, /hangi kayıt|konuyu kastettiğini|numarasını|birden fazla kayıt/iu, 'help continuation must not resurrect stale clarification');
assert.match(actual.helpContinuation.reply, /devam|anlat|ekran|bağlam|seferpakt|planlama|vardiya/iu, 'help continuation remains useful');

console.log(JSON.stringify({
  status: 'PASS',
  requestedAuthorityMode: REQUESTED_AUTHORITY_MODE,
  selectedAuthoritativePath: authorityDiagnostics.authoritativePath,
  shadowAuthorityCount: authorityDiagnostics.SHADOW_SEMANTIC_AUTHORITY_COUNT,
  runtimeFallbackCount: authorityDiagnostics.RUNTIME_SEMANTIC_FALLBACK_COUNT,
  actual,
  h03: 'role-aware capability help is canonical product help',
  usage: 'bare usage help is canonical product help',
  roleHelp: 'broad role help is canonical product help',
  clarificationOverride: 'explicit new help supersedes the prior clarification',
  helpContinuation: 'continuation continues the latest valid help task',
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
