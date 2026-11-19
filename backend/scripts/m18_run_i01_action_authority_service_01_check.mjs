#!/usr/bin/env node

import assert from 'node:assert/strict';

const apiBase = process.env.M18_I01_API_BASE || 'http://127.0.0.1:3319';

async function login() {
  if (process.env.M18_SHARED_COMPANY_TOKEN) return process.env.M18_SHARED_COMPANY_TOKEN;
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'company@demo.com', password: 'demo123', deviceId: 'm18-i01-action-authority' }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `login status ${response.status}`);
  assert.ok(body.token, 'login token');
  return body.token;
}

function shape(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: plan.authorizationDecision?.status || payload?.authorization?.status || payload?.authorization || null,
    resolution: action.resolutionStatus || null,
    reply: String(payload?.reply || ''),
  };
}

async function ask(token, message, sessionLabel) {
  const response = await fetch(`${apiBase}/api/ai/copilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      screenContext: { path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
      message,
      format: 'json',
      sessionLabel,
    }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, `${sessionLabel} HTTP status`);
  return shape(payload);
}

function assertCommon(actual, label) {
  assert.equal(actual.scope, 'PRODUCT_EXPLICIT', `${label} scope`);
  assert.equal(actual.authorization, 'ALLOW', `${label} authorization`);
  assert.equal(actual.resolution, 'RESOLVED', `${label} resolution`);
}

const token = await login();
const cases = [
  {
    id: 'I01',
    message: 'Yeni bir şirket hesabında önce hangi alanların görevini öğrenmeliyim?',
    expected: { family: 'GENERIC_PRODUCT_HELP', action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION' },
    rejectClarification: true,
  },
  {
    id: 'EXPLAIN_ORIENTATION',
    message: 'SeferPakt’ta şirket hesabını kullanmaya başlarken izlenecek yolu anlatır mısın?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION' },
    rejectClarification: true,
  },
  {
    id: 'TRUE_VIEW',
    message: 'Vardiya listesini görüntüle.',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
  },
  {
    id: 'TRUE_NAVIGATE',
    message: 'Sözleşmeler sayfasına geçelim.',
    expected: { action: 'NAVIGATE', object: 'SURFACE', operation: 'NAVIGATE_AUTHORIZED_SURFACE' },
  },
  {
    id: 'TRUE_GUIDED_SHOW',
    message: 'Vardiya ekranını göster.',
    expected: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE', capability: 'VIEW_SHIFTS' },
  },
  {
    id: 'CURRENT_SCREEN_EXPLAIN',
    message: 'Operasyon panelinin çalışma mantığını anlatır mısın?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
    rejectClarification: true,
  },
  {
    id: 'ROLE_HELP',
    message: 'Bu rolde hangi işlemleri yapabildiğimi özetler misin?',
    expected: { action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION', capability: 'GENERAL_INFORMATION' },
    rejectClarification: true,
  },
];

const results = [];
for (const item of cases) {
  const actual = await ask(token, item.message, item.id);
  assertCommon(actual, item.id);
  for (const [key, expected] of Object.entries(item.expected)) {
    if (Array.isArray(expected)) assert.ok(expected.includes(actual[key]), `${item.id} ${key}`);
    else assert.equal(actual[key], expected, `${item.id} ${key}`);
  }
  if (item.rejectClarification) assert.doesNotMatch(actual.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.id} entity clarification`);
  results.push({ id: item.id, actual });
}

console.log(JSON.stringify({
  status: 'PASS',
  apiBase,
  cases: results,
  businessWriteExecution: 0,
  externalLlmProviderCount: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
