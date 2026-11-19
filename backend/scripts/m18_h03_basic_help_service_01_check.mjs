#!/usr/bin/env node

import assert from 'node:assert/strict';

const apiBase = process.env.M18_BASIC_HELP_API_BASE || 'http://127.0.0.1:3318';

async function login(identifier, deviceId) {
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
  return {
    family: plan.family || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: plan.authorizationDecision?.status || null,
    resolution: action.resolutionStatus || null,
    clarificationNeed: plan.clarificationNeed || null,
    reply: String(payload?.reply || ''),
  };
}

async function ask({ token, message, path, label, sessionLabel }) {
  const response = await fetch(`${apiBase}/api/ai/copilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      screenContext: { path, label, role: path.startsWith('/school') ? 'SCHOOL' : 'COMPANY' },
      message,
      format: 'json',
      sessionLabel,
    }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, `${message} HTTP status`);
  return { payload, actual: shape(payload) };
}

function assertGeneric(candidate, label) {
  assert.equal(candidate.family, 'GENERIC_PRODUCT_HELP', `${label} family`);
  assert.equal(candidate.scope, 'PRODUCT_EXPLICIT', `${label} scope`);
  assert.equal(candidate.action, 'EXPLAIN', `${label} action`);
  assert.equal(candidate.object, 'SURFACE', `${label} object`);
  assert.equal(candidate.operation, 'GENERAL_INFORMATION', `${label} operation`);
  assert.equal(candidate.capability, 'GENERAL_INFORMATION', `${label} capability`);
  assert.equal(candidate.authorization, 'ALLOW', `${label} authorization`);
  assert.equal(candidate.resolution, 'RESOLVED', `${label} resolution`);
  assert.doesNotMatch(candidate.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${label} entity clarification`);
}

const companyToken = await login('company@demo.com', 'm18-h03-service-company');
const schoolToken = await login('school@demo.com', 'm18-h03-service-school');

const h03 = await ask({
  token: schoolToken,
  message: 'Okul rolümle sistemde hangi işleri yürütebilirim?',
  path: '/school/operations',
  label: 'Okul Operasyonları',
  sessionLabel: 'h03',
});
const usage = await ask({
  token: companyToken,
  message: 'Nasıl kullanirim',
  path: '/company/operations',
  label: 'Operasyon Paneli',
  sessionLabel: 'usage',
});
const roleHelp = await ask({
  token: companyToken,
  message: 'Bu rolde ne yapabilirim?',
  path: '/company/operations',
  label: 'Operasyon Paneli',
  sessionLabel: 'role-help',
});
const overview = await ask({
  token: companyToken,
  message: 'Bu program ne işe yarar',
  path: '/company/operations',
  label: 'Operasyon Paneli',
  sessionLabel: 'overview',
});

const multiToken = await login('company@demo.com', 'm18-h03-service-multiturn');
const clarification = await ask({
  token: multiToken,
  message: 'Şu kaydı anlat.',
  path: '/company/operations',
  label: 'Operasyon Paneli',
  sessionLabel: 'multi-clarification',
});
const override = await ask({
  token: multiToken,
  message: 'Bu sistemde ilk adımı nasıl atacağımı anlatır mısın?',
  path: '/company/operations',
  label: 'Operasyon Paneli',
  sessionLabel: 'multi-help',
});
const continuation = await ask({
  token: multiToken,
  message: 'Devamını anlat',
  path: '/company/operations',
  label: 'Operasyon Paneli',
  sessionLabel: 'multi-continuation',
});

assertGeneric(h03.actual, 'H03');
assertGeneric(usage.actual, 'usage');
assertGeneric(roleHelp.actual, 'role help');
assertGeneric(overview.actual, 'overview');
assert.equal(clarification.actual.family, 'UNCLEAR_OR_AMBIGUOUS', 'true clarification');
assertGeneric(override.actual, 'clarification override');
assert.equal(continuation.actual.family, 'CONTINUE_CURRENT_REASONING', 'help continuation family');
assert.equal(continuation.actual.action, 'CONTINUE', 'help continuation action');
assert.equal(continuation.actual.resolution, 'RESOLVED', 'help continuation resolution');
assert.doesNotMatch(continuation.actual.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, 'help continuation entity clarification');

console.log(JSON.stringify({
  status: 'PASS',
  apiBase,
  service: { h03: h03.actual, usage: usage.actual, roleHelp: roleHelp.actual, overview: overview.actual },
  multiTurn: { clarification: clarification.actual, override: override.actual, continuation: continuation.actual },
  businessWriteExecution: 0,
  externalLlmProviderCount: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
