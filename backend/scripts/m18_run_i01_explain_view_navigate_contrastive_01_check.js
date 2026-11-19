#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';

const company = { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' };
const companyScreen = { path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' };
const companyGuidedScreen = {
  ...companyScreen,
  uiHints: {
    visibleButtons: [{ label: 'Çalışma Alanı', targetKey: 'WORKSPACE', semanticType: 'button' }],
  },
};

function resolve(message, {
  user = company,
  screenContext = companyScreen,
  conversationState = { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext },
} = {}) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState,
    interpreterMode: 'DETERMINISTIC',
  });
}

function shape(result) {
  const request = result.request;
  return {
    taskType: result.canonicalShape.taskType,
    screenKnowledgeKind: result.canonicalShape.screenKnowledgeKind || null,
    explicitUiGuidance: Boolean(result.canonicalShape.explicitUiGuidance),
    action: request.semanticAction.actionClass,
    object: request.semanticAction.objectClass,
    operation: request.operation,
    capability: request.capability,
    scope: request.semanticScope.class,
    resolution: request.semanticAction.resolutionStatus,
  };
}

const cases = [
  {
    id: 'I01_FROZEN_ORIENTATION',
    message: 'Yeni bir şirket hesabında önce hangi alanların görevini öğrenmeliyim?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION' },
  },
  {
    id: 'A_ROLE_ORIENTATION',
    message: 'Şirket hesabında hangi bölümlerin işleyişini öğrenmek istiyorum.',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION' },
  },
  {
    id: 'B_CURRENT_SCREEN_EXPLANATION',
    message: 'Operasyon panelinin çalışma mantığını anlatır mısın?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
  },
  {
    id: 'C_TRUE_SURFACE_VIEW',
    message: 'Vardiya listesini görüntüle.',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
  },
  {
    id: 'D_TRUE_NAVIGATE',
    message: 'Sözleşmeler sayfasına geçelim.',
    expected: { action: 'NAVIGATE', object: 'AGREEMENT', operation: 'NAVIGATE_AUTHORIZED_SURFACE' },
  },
  {
    id: 'E_TRUE_RECORD_VIEW',
    message: 'Bu haftanın sefer kayıtlarını incelemek istiyorum.',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
  },
  {
    id: 'F_ENTITY_EXPLANATION',
    message: 'Aktif vardiyanın ayrıntılarını açıklar mısın?',
    expected: { action: 'EXPLAIN', object: 'SHIFT', operation: 'LOOK_UP_FIELD' },
    conversationState: { selectedEntityId: 42, selectedEntityType: 'SHIFT', recentMessages: [], activeGuidedTask: null, uiSurface: companyScreen },
  },
  {
    id: 'G_MIXED_VIEW_THEN_EXPLAIN',
    message: 'Vardiyayı görüntüle ve çalışma mantığını anlat.',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
  },
  {
    id: 'H_CURRENT_SCREEN_EXPLANATION',
    message: 'Buradaki bölümün işleyişini açıklar mısın?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
  },
  {
    id: 'I_CURRENT_SCREEN_GUIDED_SHOW',
    message: 'Bana bu paneldeki çalışma alanını gösterir misin?',
    screenContext: companyGuidedScreen,
    expected: { action: 'NAVIGATE', object: 'SURFACE', operation: 'NAVIGATE_AUTHORIZED_SURFACE', capability: 'OPEN_SURFACE', explicitUiGuidance: true },
  },
  {
    id: 'J_COMPANY_SHIFT_EXPLAIN',
    message: 'Yeni vardiya planlamasının adımlarını açıklar mısın?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION' },
  },
  {
    id: 'K_COMPANY_SHIFT_NAVIGATE',
    message: 'Vardiya ekranına geçelim.',
    expected: { action: 'NAVIGATE', object: 'SHIFT', operation: 'NAVIGATE_AUTHORIZED_SURFACE' },
  },
  {
    id: 'L_TRUE_GUIDED_SHOW',
    message: 'Vardiya ekranını göster.',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS', explicitUiGuidance: true },
  },
];

for (const item of cases) {
  const actual = shape(resolve(item.message, { screenContext: item.screenContext || companyScreen, conversationState: item.conversationState }));
  for (const [key, value] of Object.entries(item.expected)) {
    assert.equal(actual[key], value, `${item.id} ${key}`);
  }
  assert.equal(actual.scope, 'PRODUCT_EXPLICIT', `${item.id} scope`);
  assert.equal(actual.resolution, 'RESOLVED', `${item.id} resolution`);
}

const roles = [
  ['COMPANY', { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' }, '/company/operations'],
  ['ROOM', { role: 'ROOM', roomId: 1, companyId: null }, '/room/shifts'],
  ['SCHOOL', { role: 'COMPANY', companyId: 1, companyKind: 'SCHOOL' }, '/school/operations'],
  ['DRIVER', { role: 'DRIVER', companyId: 1 }, '/driver/today'],
  ['PARENT', { role: 'PARENT', companyId: null }, '/parent/live'],
];
for (const [role, user, path] of roles) {
  const result = resolve('Bu rolde hangi işleri öğrenerek başlamalıyım?', {
    user,
    screenContext: { path, label: role, role },
  });
  const actual = shape(result);
  assert.equal(actual.action, 'EXPLAIN', `${role} action`);
  assert.equal(actual.operation, 'GENERAL_INFORMATION', `${role} operation`);
  assert.equal(actual.capability, 'GENERAL_INFORMATION', `${role} capability`);
}

console.log(JSON.stringify({
  status: 'PASS',
  family: 'EXPLAIN_VIEW_NAVIGATE_CONTRASTIVE',
  cases: cases.map(({ id }) => id),
  roles: roles.map(([role]) => role),
  businessWriteExecution: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
