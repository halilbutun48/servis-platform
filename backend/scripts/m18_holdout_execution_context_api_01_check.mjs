import assert from 'node:assert/strict';

import {
  adaptGovernedCase,
  createCanonicalHttpTransport,
  createDemoSessionFactory,
  extractCanonicalActual,
} from './lib/m18HoldoutExecutionAdapter.mjs';

const CONTEXTS = {
  COMPANY: {
    source: 'AUTHORIZED_PRODUCT_CATALOG', role: 'COMPANY',
    tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' },
    screen: { id: 2117, path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
    selectedEntity: null,
  },
  ROOM: {
    source: 'AUTHORIZED_PRODUCT_CATALOG', role: 'ROOM',
    tenantContext: { type: 'ROOM', companyKind: null },
    screen: { id: 1103, path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    selectedEntity: null,
  },
  PERSONEL: {
    source: 'AUTHORIZED_PRODUCT_CATALOG', role: 'PERSONEL',
    tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' },
    screen: { id: 4101, path: '/personel/live', label: 'Canlı', role: 'PERSONEL' },
    selectedEntity: null,
  },
  AMBIGUOUS: {
    source: 'AUTHORIZED_PRODUCT_CATALOG', role: 'COMPANY',
    tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' },
    screen: null,
    selectedEntity: null,
  },
};

const makeCase = (id, role, context, overrides = {}) => ({
  CASE_ID: id,
  ROLE: role,
  EXPECTED_SEMANTIC_SCOPE: context.screen ? 'PRODUCT_CONTEXTUAL' : 'PRODUCT_AMBIGUOUS',
  TURN_COUNT: 1,
  TURN_1: 'sentetik çalışma isteği',
  TURN_2: null,
  TURN_3: null,
  SURFACE_PRECONDITION: 'Documentation only; never a runtime route source.',
  STATE_PRECONDITION: 'Synthetic deterministic state.',
  REFERENCE_PRECONDITION: 'ABSENT',
  EXECUTION_CONTEXT: context,
  ...overrides,
});

const validCases = [
  makeCase('SYNTHETIC-CONTEXT-COMPANY', 'COMPANY', CONTEXTS.COMPANY),
  makeCase('SYNTHETIC-CONTEXT-ROOM', 'ROOM', CONTEXTS.ROOM),
  makeCase('SYNTHETIC-CONTEXT-PERSONEL', 'PERSONEL', CONTEXTS.PERSONEL),
  makeCase('SYNTHETIC-CONTEXT-NO-SCREEN', 'COMPANY', CONTEXTS.AMBIGUOUS),
];

const negativeCases = [
  ['unauthorized surface', makeCase('NEG-UNAUTHORIZED', 'ROOM', { ...CONTEXTS.ROOM, screen: { id: 2117, path: '/company/operations', label: 'Operasyon Paneli', role: 'ROOM' } })],
  ['cross-tenant context', makeCase('NEG-CROSS-TENANT', 'COMPANY', { ...CONTEXTS.COMPANY, tenantContext: { type: 'COMPANY', companyKind: 'SCHOOL' } })],
  ['malformed selected entity', makeCase('NEG-ENTITY', 'COMPANY', { ...CONTEXTS.COMPANY, selectedEntity: { type: 'shift', id: '42', tenantContextType: 'COMPANY' } })],
  ['missing required tenant', makeCase('NEG-TENANT', 'COMPANY', { ...CONTEXTS.COMPANY, tenantContext: null })],
];

const sessionFactory = createDemoSessionFactory();
const transport = createCanonicalHttpTransport();
const validResults = [];
const negativeResults = [];

for (const testCase of validCases) {
  const adapted = adaptGovernedCase(testCase);
  const session = await sessionFactory(adapted.role, adapted.caseId);
  const response = await transport({
    endpoint: '/api/ai/copilot',
    session,
    item: adapted,
    message: testCase.TURN_1,
  });
  assert.equal(response.status, 200, `${testCase.CASE_ID}:${response.status}`);
  const actual = extractCanonicalActual(response.body);
  assert.equal(actual.authority?.mode, 'NEW', `${testCase.CASE_ID}:mode`);
  assert.equal(actual.authority?.authoritativePath, 'NEW_TYPED_EVIDENCE', `${testCase.CASE_ID}:path`);
  assert.equal(actual.authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, `${testCase.CASE_ID}:authority count`);
  assert.equal(actual.authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT, 0, `${testCase.CASE_ID}:shadow`);
  assert.equal(actual.authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0, `${testCase.CASE_ID}:fallback`);
  assert.equal(actual.authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT, 0, `${testCase.CASE_ID}:redecision`);
  validResults.push({ caseId: testCase.CASE_ID, status: response.status, payload: true });
}

for (const [name, testCase] of negativeCases) {
  assert.throws(() => adaptGovernedCase(testCase));
  negativeResults.push({ name, rejectedBeforeHttp: true });
}

console.log(JSON.stringify({
  status: 'GREEN',
  SYNTHETIC_TYPED_CONTEXT_API_CASE_COUNT: validResults.length,
  SYNTHETIC_HTTP_400_COUNT: validResults.filter((item) => item.status === 400).length,
  SYNTHETIC_CANONICAL_PAYLOAD_COUNT: validResults.filter((item) => item.payload).length,
  SYNTHETIC_AUTH_CONTEXT_NEGATIVE_COUNT: negativeResults.length,
  SYNTHETIC_AUTH_CONTEXT_NEGATIVE_REJECT_COUNT: negativeResults.filter((item) => item.rejectedBeforeHttp).length,
  BUSINESS_WRITE_EXECUTION: 0,
}, null, 2));
