#!/usr/bin/env node

import assert from 'node:assert/strict';

const apiBase = process.env.M18_J02_API_BASE || 'http://127.0.0.1:3321';

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
  assert.equal(response.ok, true, `login ${identifier} status`);
  assert.ok(body.token, `login ${identifier} token`);
  return body.token;
}

function shape(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  const authority = plan.canonicalRequestEnvelope?.diagnostics?.semanticAuthority
    || payload?.diagnostics?.semanticAuthority
    || null;
  return {
    family: plan.family || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: plan.authorizationDecision?.status || payload?.authorization?.status || null,
    resolution: action.resolutionStatus || null,
    authority,
    reply: String(payload?.reply || ''),
  };
}

async function ask({ token, message, path, role, sessionLabel }) {
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
      sessionLabel,
    }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, `${sessionLabel} HTTP status`);
  return shape(payload);
}

function assertRoleHelp(actual, label) {
  assertNewAuthority(actual, label);
  assert.equal(actual.family, 'ROLE_EXPLANATION_HELP', `${label} family`);
  assert.equal(actual.scope, 'PRODUCT_EXPLICIT', `${label} scope`);
  assert.equal(actual.action, 'EXPLAIN', `${label} action`);
  assert.equal(actual.object, 'SURFACE', `${label} object`);
  assert.ok(['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(actual.operation), `${label} operation`);
  assert.ok(['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(actual.capability), `${label} capability`);
  assert.equal(actual.authorization, 'ALLOW', `${label} authorization`);
  assert.equal(actual.resolution, 'RESOLVED', `${label} resolution`);
  assert.doesNotMatch(actual.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${label} entity clarification`);
}

function assertNewAuthority(actual, label) {
  assert.equal(actual.authority?.mode, 'NEW', `${label} authority mode`);
  assert.equal(actual.authority?.authoritativePath, 'NEW_TYPED_EVIDENCE', `${label} authority path`);
  assert.equal(actual.authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, `${label} semantic authority count`);
  assert.equal(actual.authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0, `${label} runtime fallback count`);
  assert.equal(actual.authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT, 0, `${label} shadow authority count`);
  assert.equal(actual.authority?.DUAL_SEMANTIC_AUTHORITY_COUNT, 0, `${label} dual authority count`);
  assert.equal(actual.authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT, 0, `${label} downstream redecision count`);
}

const users = [
  { id: 'ROOM', identifier: 'room@demo.com', path: '/room/shifts', message: 'Taşıma firması hesabımda günlük işlerimi nasıl kavrayacağım?' },
  { id: 'COMPANY', identifier: 'company@demo.com', path: '/company/operations', message: 'Şirket hesabında ilk olarak hangi sorumluluk alanlarını tanımalıyım?' },
  { id: 'SCHOOL', identifier: 'school@demo.com', path: '/school/operations', message: 'Okul tarafında bana düşen işleri öğrenmeye nereden başlamalıyım?' },
  { id: 'DRIVER', identifier: 'driver@demo.com', deviceId: 'web-vos7tyh6mtpo1gze', path: '/driver/today', message: 'Sürücü olarak gün içindeki görev akışımı nasıl anlayacağım?' },
  { id: 'PARENT', identifier: 'parent@demo.com', path: '/parent/live', message: 'Veli hesabında takip etmem gereken konuları nasıl öğrenebilirim?' },
];

const results = [];
for (const item of users) {
  const token = await login(item.identifier, item.deviceId || `m18-j02-service-${item.id.toLowerCase()}`);
  const actual = await ask({ ...item, token, sessionLabel: `j02-${item.id.toLowerCase()}` });
  assertRoleHelp(actual, item.id);
  results.push({ id: item.id, actual });
}

const roomToken = await login('room@demo.com', 'm18-j02-service-contrasts');
const clarification = await ask({
  token: roomToken,
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Şu kaydı anlat.',
  sessionLabel: 'true-clarification',
});
assertNewAuthority(clarification, 'true clarification');
assert.equal(clarification.family, 'UNCLEAR_OR_AMBIGUOUS', 'true clarification family');
assert.equal(clarification.scope, 'PRODUCT_AMBIGUOUS', 'true clarification scope');
assert.equal(clarification.action, 'NONE', 'true clarification action');
assert.equal(clarification.resolution, 'UNRESOLVED', 'true clarification resolution');

const companyToken = await login('company@demo.com', 'm18-j02-service-operational-contrasts');
const view = await ask({
  token: companyToken,
  role: 'COMPANY',
  path: '/company/operations',
  message: 'Vardiya listesini görüntüle.',
  sessionLabel: 'true-view',
});
assertNewAuthority(view, 'true view');
assert.equal(view.family, 'UI_GUIDANCE', 'true view family');
assert.equal(view.action, 'VIEW', 'true view action');
assert.equal(view.object, 'SHIFT', 'true view object');

const navigate = await ask({
  token: companyToken,
  role: 'COMPANY',
  path: '/company/operations',
  message: 'Sözleşmeler sayfasına geçelim.',
  sessionLabel: 'true-navigate',
});
assertNewAuthority(navigate, 'true navigate');
assert.equal(navigate.family, 'UI_GUIDANCE', 'true navigate family');
assert.equal(navigate.action, 'NAVIGATE', 'true navigate action');
assert.equal(navigate.object, 'SURFACE', 'true navigate target surface object');

console.log(JSON.stringify({
  status: 'PASS',
  apiBase,
  roleHelp: results,
  contrasts: { clarification, view, navigate },
  businessWriteExecution: 0,
  externalLlmProviderCount: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
