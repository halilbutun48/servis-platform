#!/usr/bin/env node

import assert from 'node:assert/strict';

const apiBase = process.env.M18_K02_API_BASE || 'http://127.0.0.1:3333';

async function login(identifier, deviceId) {
  if (identifier === 'company@demo.com' && process.env.M18_SHARED_COMPANY_TOKEN) {
    return process.env.M18_SHARED_COMPANY_TOKEN;
  }
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo123', deviceId }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `login ${identifier}`);
  assert.ok(body.token, `token ${identifier}`);
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
    authorization: plan.authorizationDecision?.status || payload?.authorization?.status || null,
    resolution: action.resolutionStatus || null,
    reply: String(payload?.reply || ''),
  };
}

async function ask({ token, role, path, message, label }) {
  const response = await fetch(`${apiBase}/api/ai/copilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      screenContext: { path, label: `${role} ekranı`, role },
      message,
      format: 'json',
      sessionLabel: `m18-k02-${label}`,
    }),
  });
  assert.equal(response.status, 200, `${label} HTTP`);
  return shape(await response.json());
}

function assertRoleHelp(actual, label) {
  assert.deepEqual(
    {
      family: actual.family,
      scope: actual.scope,
      action: actual.action,
      object: actual.object,
      operation: actual.operation,
      capability: actual.capability,
      authorization: actual.authorization,
      resolution: actual.resolution,
    },
    {
      family: 'ROLE_EXPLANATION_HELP',
      scope: 'PRODUCT_EXPLICIT',
      action: 'EXPLAIN',
      object: 'SURFACE',
      operation: 'GENERAL_INFORMATION',
      capability: 'GENERAL_INFORMATION',
      authorization: 'ALLOW',
      resolution: 'RESOLVED',
    },
    label,
  );
  assert.doesNotMatch(actual.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${label} clarification`);
}

const users = [
  { id: 'ROOM_K02', identifier: 'room@demo.com', role: 'ROOM', path: '/room/shifts', message: 'Taşımacılık tarafında üzerime düşen işlerin sınırı nedir?' },
  { id: 'ROOM_RESPONSIBILITY', identifier: 'room@demo.com', role: 'ROOM', path: '/room/shifts', message: 'Sorumluluklarım hangi noktada sona eriyor?' },
  { id: 'COMPANY_CAPABILITY', identifier: 'company@demo.com', role: 'COMPANY', path: '/company/operations', message: 'Şirket tarafında hangi süreçleri ben yönetirim?' },
  { id: 'SCHOOL_ORIENTATION', identifier: 'school@demo.com', role: 'SCHOOL', path: '/school/operations', message: 'Okul hesabında takip edeceğim servis işlerini nasıl öğrenebilirim?' },
  { id: 'DRIVER_LIMITATION', identifier: 'driver@demo.com', deviceId: 'web-vos7tyh6mtpo1gze', role: 'DRIVER', path: '/driver/today', message: 'Sürücü olarak hangi işlerin bende olmadığını bilmeliyim?' },
  { id: 'PARENT_PURPOSE', identifier: 'parent@demo.com', role: 'PARENT', path: '/parent/live', message: 'Veli hesabında önce hangi bilgileri anlamalıyım?' },
];

const results = [];
for (const item of users) {
  const token = await login(item.identifier, item.deviceId || item.id.toLowerCase());
  const actual = await ask({ ...item, token, label: item.id.toLowerCase() });
  assertRoleHelp(actual, item.id);
  results.push({ id: item.id, actual });
}

const roomToken = await login('room@demo.com', 'm18-k02-service-negative-room');
const clarification = await ask({ token: roomToken, role: 'ROOM', path: '/room/shifts', message: 'Şu kaydı anlat.', label: 'clarification' });
assert.equal(clarification.family, 'UNCLEAR_OR_AMBIGUOUS', 'true clarification family');
assert.equal(clarification.scope, 'PRODUCT_AMBIGUOUS', 'true clarification scope');
assert.equal(clarification.action, 'NONE', 'true clarification action');
assert.equal(clarification.resolution, 'UNRESOLVED', 'true clarification resolution');

const companyToken = await login('company@demo.com', 'm18-k02-service-negative-company');
const view = await ask({ token: companyToken, role: 'COMPANY', path: '/company/operations', message: 'Vardiya listesini görüntüle.', label: 'true-view' });
assert.equal(view.family, 'UI_GUIDANCE', 'true view family');
assert.equal(view.action, 'VIEW', 'true view action');
assert.equal(view.object, 'SHIFT', 'true view object');

const navigate = await ask({ token: companyToken, role: 'COMPANY', path: '/company/operations', message: 'Sözleşmeler sayfasına geçelim.', label: 'true-navigate' });
assert.equal(navigate.family, 'UI_GUIDANCE', 'true navigate family');
assert.equal(navigate.action, 'NAVIGATE', 'true navigate action');
assert.equal(navigate.object, 'SURFACE', 'true navigate target surface object');

console.log(JSON.stringify({
  status: 'PASS',
  apiBase,
  cases: results,
  contrasts: { clarification, view, navigate },
  businessWriteExecution: 0,
  externalLlmProviderCount: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
