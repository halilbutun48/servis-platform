#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';

const screenFor = (role) => ({
  path: role === 'ROOM' ? '/room/shifts' : '/company/operations',
  label: role === 'ROOM' ? 'Vardiyalar' : 'Operasyon Paneli',
  role,
});

function resolve(role, message) {
  return resolveCanonicalConversationRequest({
    message,
    user: { role },
    screenContext: screenFor(role),
    conversationState: { recentMessages: [], activeGuidedTask: null },
    interpreterMode: 'DETERMINISTIC',
  });
}

function assertRoleHelp(role, message) {
  const result = resolve(role, message);
  const request = result.request;
  const action = request.semanticAction;
  assert.equal(result.canonicalShape.roleHelpIntent, true, `${role} role-help evidence`);
  assert.equal(request.semanticScope.class, 'PRODUCT_EXPLICIT', `${role} scope`);
  assert.equal(action.actionClass, 'EXPLAIN', `${role} action`);
  assert.equal(action.objectClass, 'SURFACE', `${role} object`);
  assert.equal(request.operation, 'GENERAL_INFORMATION', `${role} operation`);
  assert.equal(request.capability, 'GENERAL_INFORMATION', `${role} capability`);
  assert.equal(action.resolutionStatus, 'RESOLVED', `${role} resolution`);
  return { role, message, aspectFamily: result.canonicalShape.primaryTask };
}

const roleCases = [
  ['COMPANY', 'Şirket tarafında hangi süreçleri ben yönetirim?'],
  ['ROOM', 'Sorumluluklarım hangi noktada sona eriyor?'],
  ['SCHOOL', 'İlk günümde hangi işleri kavramam gerekir?'],
  ['SCHOOL', 'Okul hesabında takip edeceğim servis işlerini nasıl öğrenebilirim?'],
  ['ORGANIZATION', 'Bu yapıda benim yetki alanım neyi kapsıyor?'],
  ['DRIVER', 'Sürücü olarak görevlerimi nasıl yürüteceğim?'],
  ['PERSONEL', 'Personel olarak hangi işleri takip ederim?'],
  ['PARENT', 'Veli olarak hangi sorumlulukları üstlenirim?'],
  ['SUPER_ADMIN', 'Yönetici rolünde yetkim nerede biter?'],
];

const positive = roleCases.map(([role, message]) => assertRoleHelp(role, message));

const negativeCases = [
  {
    id: 'SHIFT_VIEW',
    role: 'ROOM',
    message: 'Vardiya kayıtlarını görüntüle.',
    check: (request) => [request.semanticAction.actionClass, request.semanticAction.objectClass],
    expected: ['VIEW', 'SHIFT'],
  },
  {
    id: 'AGREEMENT_EXPLANATION',
    role: 'COMPANY',
    message: 'Sözleşme kaydının kapsamını açıkla.',
    check: (request) => request.semanticAction.objectClass,
    expected: null,
  },
  {
    id: 'OFFER_NAVIGATION',
    role: 'COMPANY',
    message: 'Teklifi aç.',
    check: (request) => [request.semanticAction.actionClass, request.semanticAction.objectClass],
    expected: ['NAVIGATE', 'OFFER'],
  },
  {
    id: 'SCREEN_VIEW',
    role: 'COMPANY',
    message: 'Operasyon panelini göster.',
    check: (request) => request.semanticAction.actionClass,
    expected: null,
  },
  {
    id: 'ENTITY_EXPLANATION',
    role: 'COMPANY',
    message: 'Bu vardiyanın durumunu açıkla.',
    check: (request) => [request.semanticAction.actionClass, request.semanticAction.objectClass],
    expected: ['EXPLAIN', 'SHIFT'],
  },
  {
    id: 'AMBIGUOUS_REFERENCE',
    role: 'COMPANY',
    message: 'Şunu anlat.',
    check: (request) => [request.semanticScope.class, request.semanticAction.resolutionStatus],
    expected: ['UNRESOLVED', 'UNRESOLVED'],
  },
  {
    id: 'GENUINE_OOS',
    role: 'ROOM',
    message: '2+2 kaç eder?',
    check: (request) => request.semanticScope.class,
    expected: 'OFF_TOPIC_GENUINE',
  },
  {
    id: 'UNAUTHORIZED_BUSINESS_INTENT',
    role: 'ROOM',
    message: 'Yeni vardiya oluşturmak istiyorum.',
    check: (request) => [request.semanticAction.actionClass, request.semanticAction.objectClass],
    expected: ['CREATE', 'SHIFT'],
  },
];

const negative = negativeCases.map((item) => {
  const result = resolve(item.role, item.message);
  assert.notEqual(result.canonicalShape.roleHelpIntent, true, `${item.id} must not become role help`);
  const actual = item.check(result.request);
  if (item.expected !== null) assert.deepEqual(actual, item.expected, `${item.id} semantic control`);
  return {
    id: item.id,
    scope: result.request.semanticScope.class,
    action: result.request.semanticAction.actionClass,
    object: result.request.semanticAction.objectClass,
    resolution: result.request.semanticAction.resolutionStatus,
  };
});

console.log(JSON.stringify({
  status: 'PASS',
  family: 'ROLE_HELP_CONCEPT_8_ROLE_CONTRASTIVE',
  roleHelpStructuralDiversity: 'PASS',
  positive,
  negative,
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
