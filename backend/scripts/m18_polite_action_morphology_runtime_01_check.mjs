import assert from 'node:assert/strict';

const base = process.env.M18_RUNTIME_API_BASE || 'http://127.0.0.1:3400';

async function login(identifier, deviceId) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo123', deviceId }),
  });
  assert.equal(response.status, 200, `${identifier} login`);
  const payload = await response.json();
  assert.ok(payload.token, `${identifier} token`);
  return payload.token;
}

function shape(payload) {
  const request = payload?.semanticPlan?.canonicalRequestEnvelope?.request;
  const authority = payload?.semanticPlan?.canonicalRequestEnvelope?.diagnostics?.semanticAuthority;
  return {
    requestMode: request?.typedEvidence?.requestMode?.value || null,
    action: request?.semanticAction?.actionClass || null,
    object: request?.semanticAction?.objectClass || null,
    reference: request?.typedEvidence?.reference?.value || null,
    resolution: request?.semanticAction?.resolutionStatus || null,
    operation: request?.operation || null,
    writeBoundary: request?.safety?.writeBoundary || null,
    authority,
  };
}

const cases = [
  {
    id: 'DIRECT_UPDATE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Vardiya kaydını güncelle.',
    expected: { action: 'UPDATE', requestMode: 'UPDATE' },
  },
  {
    id: 'POLITE_UPDATE_UNRESOLVED',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Şu vardiya kaydını günceller misin?',
    expected: { action: 'NONE', requestMode: 'UPDATE', reference: 'UNRESOLVED', resolution: 'UNRESOLVED', operation: 'CLARIFY_SEMANTIC_REQUEST', writeBoundary: 'NO_BUSINESS_WRITE' },
  },
  {
    id: 'POLITE_VIEW',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Vardiya listesini görüntüler misin?',
    expected: { action: 'VIEW', requestMode: 'VIEW' },
  },
  {
    id: 'POLITE_CREATE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Yeni vardiya oluşturur musun?',
    expected: { action: 'CREATE', requestMode: 'CREATE' },
  },
  {
    id: 'POLITE_COMPARE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Teklifleri karşılaştırır mısın?',
    expected: { action: 'COMPARE', requestMode: 'COMPARE' },
  },
  {
    id: 'POLITE_NAVIGATE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Sözleşmeler sayfasına geçer misin?',
    expected: { action: 'NAVIGATE', requestMode: 'NAVIGATE' },
  },
  {
    id: 'NEGATED_UPDATE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Vardiya kaydını güncelleme.',
    not: { action: 'UPDATE' },
  },
  {
    id: 'HYPOTHETICAL_UPDATE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Vardiya kaydını güncellersem ne olur?',
    not: { action: 'UPDATE' },
  },
  {
    id: 'PERMISSION_UPDATE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Vardiya kaydını güncelleyebilir miyim?',
    not: { action: 'UPDATE' },
  },
  {
    id: 'OOS_POLITE',
    identifier: 'company@demo.com',
    role: 'COMPANY',
    message: 'Yarın hava nasıl olacak, söyler misin?',
    not: { action: 'UPDATE', requestMode: 'UPDATE' },
  },
];

const tokens = new Map();
const reports = [];
for (const item of cases) {
  if (!tokens.has(item.identifier)) tokens.set(item.identifier, await login(item.identifier, `m18-politeness-runtime-${item.id}`));
  const response = await fetch(`${base}/api/ai/copilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${tokens.get(item.identifier)}` },
    body: JSON.stringify({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      screenContext: { path: item.role === 'COMPANY' ? '/company/shifts' : '/room/shifts', label: 'Vardiyalar', role: item.role },
      message: item.message,
      format: 'json',
      sessionLabel: `m18-politeness-runtime-${item.id}`,
    }),
  });
  const payload = await response.json();
  const actual = shape(payload);
  const authority = actual.authority || {};
  let passed = response.status === 200
    && authority.mode === 'NEW'
    && authority.authoritativePath === 'NEW_TYPED_EVIDENCE'
    && authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT === 1
    && authority.SHADOW_SEMANTIC_AUTHORITY_COUNT === 0
    && authority.RUNTIME_SEMANTIC_FALLBACK_COUNT === 0
    && authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT === 0;
  for (const [key, value] of Object.entries(item.expected || {})) passed = passed && actual[key] === value;
  for (const [key, value] of Object.entries(item.not || {})) passed = passed && actual[key] !== value;
  reports.push({ id: item.id, http: response.status, passed, actual: { ...actual, authority: undefined } });
}

const passCount = reports.filter((item) => item.passed).length;
console.log(JSON.stringify({
  RUNTIME_POLITE_ACTION_MATRIX: passCount === reports.length ? 'GREEN' : 'RED',
  caseCount: reports.length,
  passCount,
  BUSINESS_WRITE_EXECUTION: 0,
  EXTERNAL_LLM_PROVIDER_COUNT: 0,
  reports,
}, null, 2));
if (passCount !== reports.length) process.exitCode = 1;
