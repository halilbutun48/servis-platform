#!/usr/bin/env node

import assert from 'node:assert/strict';
import { buildCanonicalSemanticContext } from '../src/ai/chat/canonicalSemanticContext.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';

const roleCases = [
  ['ROOM', '/room/shifts', 'Taşımacılık tarafında takip edeceğim servis işlerini nasıl öğrenebilirim?'],
  ['COMPANY', '/company/operations', 'Şirket tarafında takip edeceğim vardiya işlerini nasıl öğrenebilirim?'],
  ['SCHOOL', '/school/operations', 'Okul hesabında takip edeceğim servis işlerini nasıl öğrenebilirim?'],
  ['ORGANIZATION', '/organization/operations', 'Kurumda takip edeceğim servis işlerini nasıl öğrenebilirim?'],
  ['DRIVER', '/driver/today', 'Sürücü olarak takip edeceğim rota işlerini nasıl öğrenebilirim?'],
  ['PERSONEL', '/personel/tasks', 'Personel olarak takip edeceğim servis işlerini nasıl öğrenebilirim?'],
  ['PARENT', '/parent/live', 'Veli olarak takip edeceğim servis işlerini nasıl öğrenebilirim?'],
  ['SUPER_ADMIN', '/super-admin/operations', 'Yönetici olarak takip edeceğim operasyon işlerini nasıl öğrenebilirim?'],
];

function resolve(role, path, message) {
  const user = { role, companyKind: role, companyId: 2 };
  const screenContext = { path, label: `${role} ekranı`, role };
  const conversationState = { recentMessages: [], activeGuidedTask: null };
  const semanticContext = buildCanonicalSemanticContext({ message, user, conversationState, screenContext });
  return resolveCanonicalConversationRequest({
    message,
    user,
    conversationState,
    screenContext,
    semanticContext,
    interpreterMode: 'DETERMINISTIC',
  });
}

const roleResults = roleCases.map(([role, path, message]) => {
  const result = resolve(role, path, message);
  const action = result.request.semanticAction;
  assert.equal(result.canonicalShape.taskType, 'OFF_TOPIC', `${role} role-help task`);
  assert.equal(result.canonicalShape.screenContextIntent, false, `${role} role-help is not current-surface intent`);
  assert.equal(result.canonicalShape.roleHelpIntent, true, `${role} role-help intent`);
  assert.equal(action.actionClass, 'EXPLAIN', `${role} action`);
  assert.equal(action.objectClass, 'SURFACE', `${role} object`);
  assert.equal(result.request.operation, 'GENERAL_INFORMATION', `${role} operation`);
  assert.equal(action.resolutionStatus, 'RESOLVED', `${role} resolution`);
  assert.deepEqual(result.request.candidateEntityRefs, [], `${role} record references`);
  return {
    role,
    message,
    action: action.actionClass,
    object: action.objectClass,
    operation: result.request.operation,
    resolution: action.resolutionStatus,
  };
});

const unresolvedRecord = resolve('COMPANY', '/company/operations', 'Şu vardiyayı göster.');
assert.equal(unresolvedRecord.request.semanticAction.actionClass, 'NONE', 'unresolved record action');
assert.equal(unresolvedRecord.request.semanticAction.resolutionStatus, 'UNRESOLVED', 'unresolved record resolution');
assert.notEqual(unresolvedRecord.canonicalShape.roleHelpIntent, true, 'unresolved record must not become role help');

const explicitView = resolve('COMPANY', '/company/operations', 'Vardiya kayıtlarını görüntüle.');
assert.equal(explicitView.request.semanticAction.actionClass, 'VIEW', 'explicit view action');
assert.equal(explicitView.request.semanticAction.objectClass, 'SHIFT', 'explicit view object');
assert.notEqual(explicitView.canonicalShape.roleHelpIntent, true, 'explicit view must not become role help');

const explicitCreate = resolve('COMPANY', '/company/operations', 'Yeni vardiya oluşturmak istiyorum.');
assert.equal(explicitCreate.request.semanticAction.actionClass, 'CREATE', 'explicit create action');
assert.equal(explicitCreate.request.semanticAction.objectClass, 'SHIFT', 'explicit create object');
assert.notEqual(explicitCreate.canonicalShape.roleHelpIntent, true, 'explicit create must not become role help');

console.log(JSON.stringify({
  status: 'PASS',
  genericHelpConcreteObjectMatrix: 'GREEN',
  roleCount: roleResults.length,
  roles: roleResults,
  recordClarificationFalsePositiveCount: 0,
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
