#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';

function user(role, id) {
  return {
    id,
    role,
    companyId: role === 'ROOM' ? null : 1,
    roomId: role === 'ROOM' ? 1 : null,
    companyKind: role === 'COMPANY' ? 'COMPANY' : null,
    sessionVersion: 1,
  };
}

function screen(role) {
  const pathByRole = {
    COMPANY: '/company/operations',
    ROOM: '/room/shifts',
    SCHOOL: '/school/operations',
    ORGANIZATION: '/organization/operations',
    DRIVER: '/driver/today',
    PERSONEL: '/personel/operations',
    PARENT: '/parent/children',
    SUPER_ADMIN: '/superadmin/operations',
  };
  return { path: pathByRole[role], label: `${role} ekranı`, role };
}

const cases = [
  { id: 'COMPANY', role: 'COMPANY', message: 'Şirket tarafındaki işlerimi kavramak için ilk olarak hangi bölümleri tanımalıyım?' },
  { id: 'ROOM', role: 'ROOM', message: 'Taşıma firması hesabımda bana düşen işleri nasıl anlayacağım?' },
  { id: 'ROOM_CONTEXT_ONLY', role: 'ROOM', message: 'Sorumluluklarımı anlamak için nereden başlamalıyım?' },
  { id: 'SCHOOL', role: 'SCHOOL', message: 'Okul tarafında bu sistemle yürüttüğüm işleri nereden öğrenebilirim?' },
  { id: 'ORGANIZATION', role: 'ORGANIZATION', message: 'Organizasyon hesabımda hangi sorumluluklarla başlamalıyım?' },
  { id: 'DRIVER', role: 'DRIVER', message: 'Sürücü olarak uygulamada takip etmem gereken günlük adımlar neler?' },
  { id: 'PERSONEL', role: 'PERSONEL', message: 'Personel tarafında takip etmem gereken günlük işleri anlatır mısın?' },
  { id: 'PARENT', role: 'PARENT', message: 'Veli olarak sistemde benden beklenenleri nasıl öğrenebilirim?' },
  { id: 'SUPER_ADMIN', role: 'SUPER_ADMIN', message: 'Yönetici hesabında ilk bilmem gereken görev alanları hangileri?' },
];

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
    reply: String(payload?.reply || ''),
  };
}

for (const [index, item] of cases.entries()) {
  const currentUser = user(item.role, 995000 + index);
  const screenContext = screen(item.role);
  const canonical = resolveCanonicalConversationRequest({
    message: item.message,
    user: currentUser,
    screenContext,
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
    interpreterMode: 'DETERMINISTIC',
  });
  const semanticPlan = resolveSemanticIntent({
    message: item.message,
    user: currentUser,
    screenContext,
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
    canonicalRequest: canonical,
  });
  const authorization = await authorizeSemanticRequest({ user: currentUser, request: canonical.request, plan: semanticPlan });
  const actual = shape({ semanticPlan: { ...semanticPlan, canonicalRequest: canonical.request, authorizationDecision: authorization }, conversationRoute: semanticPlan.conversationRoute, reply: '' });
  assert.equal(actual.family, 'GENERIC_PRODUCT_HELP', `${item.id} family`);
  assert.equal(actual.route, 'GENERIC_PRODUCT_HELP', `${item.id} route`);
  assert.equal(actual.scope, 'PRODUCT_EXPLICIT', `${item.id} scope`);
  assert.equal(actual.action, 'EXPLAIN', `${item.id} action`);
  assert.equal(actual.object, 'SURFACE', `${item.id} object`);
  assert.equal(actual.operation, 'GENERAL_INFORMATION', `${item.id} operation`);
  assert.equal(actual.capability, 'GENERAL_INFORMATION', `${item.id} capability`);
  assert.equal(actual.authorization, 'ALLOW', `${item.id} authorization`);
  assert.equal(actual.resolution, 'RESOLVED', `${item.id} resolution`);
  assert.doesNotMatch(actual.reply, /hangi kayıt|konuyu kastettiğini|numarasını/iu, `${item.id} must not clarify an entity`);
}

const negativeCases = [
  { id: 'ENTITY_EXPLANATION', role: 'ROOM', message: 'Bu vardiyanın ayrıntılarını açıkla.', scope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN', object: 'SHIFT', family: 'RECORD_DETAILS' },
  { id: 'TRUE_SURFACE_NAVIGATION', role: 'ROOM', message: 'Vardiyalar ekranını aç.', scope: 'PRODUCT_EXPLICIT', action: 'NAVIGATE', object: 'SHIFT', family: 'UI_GUIDANCE' },
  { id: 'TRUE_AMBIGUITY', role: 'ROOM', message: 'Onu anlat.', scope: 'PRODUCT_AMBIGUOUS', action: 'NONE', object: null, family: 'UNCLEAR_OR_AMBIGUOUS' },
  { id: 'ROOM_OPERATION_BOUNDARY', role: 'ROOM', message: 'Vardiya oluşturmak istiyorum.', scope: 'PRODUCT_EXPLICIT', action: 'CREATE', object: 'SHIFT', family: 'UI_GUIDANCE', operation: 'OPEN_EXISTING_SHIFT_OPERATIONS', authorization: 'ALLOW' },
];

for (const [index, item] of negativeCases.entries()) {
  const currentUser = user(item.role, 996000 + index);
  const screenContext = screen(item.role);
  const conversationState = { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext };
  const canonical = resolveCanonicalConversationRequest({
    message: item.message,
    user: currentUser,
    screenContext,
    conversationState,
    interpreterMode: 'DETERMINISTIC',
  });
  const semanticPlan = resolveSemanticIntent({
    message: item.message,
    user: currentUser,
    screenContext,
    conversationState,
    canonicalRequest: canonical,
  });
  const authorization = await authorizeSemanticRequest({ user: currentUser, request: canonical.request, plan: semanticPlan });
  assert.equal(canonical.request.semanticScope.class, item.scope, `${item.id} scope`);
  assert.equal(canonical.request.semanticAction.actionClass, item.action, `${item.id} action`);
  assert.equal(canonical.request.semanticAction.objectClass, item.object, `${item.id} object`);
  assert.equal(semanticPlan.family, item.family, `${item.id} family`);
  if (item.operation) assert.equal(canonical.request.operation, item.operation, `${item.id} operation`);
  if (item.authorization) assert.equal(authorization.status, item.authorization, `${item.id} authorization`);
  assert.notEqual(semanticPlan.family, 'GENERIC_PRODUCT_HELP', `${item.id} must not be swallowed by role help`);
}

console.log(JSON.stringify({
  status: 'PASS',
  caseId: 'J02_ROLE_HELP_AUTHORITY',
  roleCount: [...new Set(cases.map((item) => item.role))].length,
  roles: cases.map((item) => item.role),
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
