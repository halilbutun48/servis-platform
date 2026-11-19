import assert from 'node:assert/strict';

const base = process.env.M18_RUNTIME_API_BASE || 'http://127.0.0.1:3400';
const accounts = new Map();

const cases = [
  {
    id: 'NAV_ONLY',
    identifier: 'company@demo.com',
    path: '/company/operations',
    role: 'COMPANY',
    message: "Planlama Merkezi'ne git.",
    assertSemantic: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'NAV_GUIDE',
    identifier: 'company@demo.com',
    path: '/company/operations',
    role: 'COMPANY',
    message: "Operasyon Paneli'ne geçip başlangıç adımını anlatır mısın?",
    assertSemantic: (actual) => actual.action === 'NAVIGATE',
  },
  {
    id: 'EXPLAIN',
    identifier: 'company@demo.com',
    path: '/company/operations',
    role: 'COMPANY',
    message: 'Planlama Merkezi kullanımını açıklar mısın?',
    assertSemantic: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'CURRENT_GUIDE',
    identifier: 'company@demo.com',
    path: '/company/operations',
    role: 'COMPANY',
    message: 'Bu ekranda ne yapabilirim?',
    assertSemantic: (actual) => actual.action === 'EXPLAIN',
  },
  {
    id: 'NEGATED',
    identifier: 'company@demo.com',
    path: '/company/operations',
    role: 'COMPANY',
    message: "Planlama Merkezi'ne geçme, burada devam edelim.",
    assertSemantic: (actual) => actual.action !== 'NAVIGATE',
  },
  {
    id: 'HYPOTHETICAL',
    identifier: 'company@demo.com',
    path: '/company/operations',
    role: 'COMPANY',
    message: "Planlama Merkezi'ne geçersem ne görürüm?",
    assertSemantic: (actual) => actual.action !== 'NAVIGATE',
  },
  {
    id: 'UNRESOLVED',
    identifier: 'company@demo.com',
    path: '/company/operations',
    role: 'COMPANY',
    message: 'Hayali kullanıcı yönetimi ekranına geçip ne yapacağımı gösterir misin?',
    assertSemantic: (actual) => actual.workflowIntent === 'UNRESOLVED_UI_TARGET',
  },
  {
    id: 'UNAUTHORIZED',
    identifier: 'room@demo.com',
    path: '/room/shifts',
    role: 'ROOM',
    message: 'COMPANY ekranına git',
    assertSemantic: (actual) => actual.action === 'NAVIGATE' && actual.roleTargetResolution === 'UNAUTHORIZED',
  },
];

async function login(identifier, deviceId) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'demo123', deviceId }),
  });
  assert.equal(response.status, 200, `${identifier} login status`);
  const payload = await response.json();
  assert.ok(payload.token, `${identifier} login token`);
  return payload.token;
}

async function tokenFor(identifier, deviceId) {
  if (!accounts.has(identifier)) accounts.set(identifier, await login(identifier, deviceId));
  return accounts.get(identifier);
}

const reports = [];
for (const testCase of cases) {
  const token = await tokenFor(testCase.identifier, `m18-mixed-navigation-runtime-${testCase.id}`);
  const response = await fetch(`${base}/api/ai/copilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      screenContext: {
        path: testCase.path,
        label: testCase.role === 'COMPANY' ? 'Operasyon Paneli' : 'Oda Operasyon',
        role: testCase.role,
      },
      message: testCase.message,
      format: 'json',
      sessionLabel: `m18-mixed-navigation-runtime-${testCase.id}`,
    }),
  });
  const payload = await response.json();
  const request = payload.semanticPlan?.canonicalRequestEnvelope?.request;
  const authority = payload.semanticPlan?.canonicalRequestEnvelope?.diagnostics?.semanticAuthority;
  const actual = {
    action: request?.semanticAction?.actionClass || null,
    object: request?.semanticAction?.objectClass || null,
    operation: request?.operation || null,
    resolution: request?.semanticAction?.resolutionStatus || null,
    workflowIntent: payload.semanticPlan?.workflowIntent || null,
    roleTargetResolution: payload.semanticPlan?.roleTargetResolution
      || payload.semanticPlan?.authorizationDecision?.roleTarget?.resolution
      || null,
  };
  const passed = response.status === 200
    && testCase.assertSemantic(actual)
    && authority?.mode === 'NEW'
    && authority?.authoritativePath === 'NEW_TYPED_EVIDENCE'
    && authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT === 1
    && authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT === 0
    && authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT === 0
    && authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT === 0;
  reports.push({ id: testCase.id, http: response.status, passed, ...actual });
}

const passCount = reports.filter((report) => report.passed).length;
console.log(JSON.stringify({
  RUNTIME_NAVIGATION_GUIDANCE_MATRIX: passCount === reports.length ? 'GREEN' : 'RED',
  caseCount: reports.length,
  passCount,
  BUSINESS_WRITE_EXECUTION: 0,
  reports,
}, null, 2));

if (passCount !== reports.length) process.exitCode = 1;
