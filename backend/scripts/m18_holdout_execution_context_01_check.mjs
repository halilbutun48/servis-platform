import assert from 'node:assert/strict';

import {
  adaptGovernedCase,
  createCanonicalHttpTransport,
} from './lib/m18HoldoutExecutionAdapter.mjs';
import { validateCandidateManifestSchema } from './lib/m18HoldoutGovernance.mjs';

const ROLES = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const CHALLENGES = [
  'EXPLAIN/CURRENT_SURFACE',
  'VIEW_OR_NAVIGATE',
  'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY',
  'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED',
  'DOMAIN_TASK_OR_GENUINE_OOS',
];

const CATALOG_CONTEXT = {
  COMPANY: {
    tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' },
    screen: { id: 2117, path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
  },
  ROOM: {
    tenantContext: { type: 'ROOM', companyKind: null },
    screen: { id: 1103, path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
  },
  SCHOOL: {
    tenantContext: { type: 'COMPANY', companyKind: 'SCHOOL' },
    screen: { id: 2117, path: '/school/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
  },
  ORGANIZATION: {
    tenantContext: { type: 'COMPANY', companyKind: 'ORGANIZATION' },
    screen: { id: 2117, path: '/organization/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
  },
  DRIVER: {
    tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' },
    screen: { id: 3101, path: '/driver/today', label: 'Bugün', role: 'DRIVER' },
  },
  PERSONEL: {
    tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' },
    screen: { id: 4101, path: '/personel/live', label: 'Canlı', role: 'PERSONEL' },
  },
  PARENT: {
    tenantContext: { type: 'PARENT', companyKind: null },
    screen: { id: 5101, path: '/parent/live', label: 'Canlı', role: 'PARENT' },
  },
  SUPER_ADMIN: {
    tenantContext: { type: 'SUPER_ADMIN', companyKind: null },
    screen: { id: 6117, path: '/superadmin/operations', label: 'Denetim Paneli', role: 'SUPER_ADMIN' },
  },
};

const contextFor = (role, overrides = {}) => ({
  source: 'AUTHORIZED_PRODUCT_CATALOG',
  role,
  ...CATALOG_CONTEXT[role],
  selectedEntity: null,
  ...overrides,
});

const baseCase = (overrides = {}) => ({
  CASE_ID: 'SYNTHETIC-COMPANY-01',
  ROLE: 'COMPANY',
  TENANT_CONTEXT_TYPE: 'COMPANY',
  TURN_COUNT: 1,
  TURN_1: 'synthetic-turn-1',
  TURN_2: null,
  TURN_3: null,
  SURFACE_PRECONDITION: 'Synthetic current surface documentation only.',
  STATE_PRECONDITION: 'Synthetic state.',
  REFERENCE_PRECONDITION: 'No reference.',
  CHALLENGE_CLASS: 'EXPLAIN/CURRENT_SURFACE',
  EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_CONTEXTUAL',
  EXPECTED_REQUEST_MODE: 'EXPLAIN',
  EXPECTED_SEMANTIC_ACTION: 'EXPLAIN',
  EXPECTED_ACTION: 'EXPLAIN',
  EXPECTED_OBJECT: 'SURFACE',
  EXPECTED_REFERENCE_CLASS: 'ABSENT',
  EXPECTED_RESOLUTION_STATUS: 'RESOLVED',
  EXPECTED_TASK_OR_TASK_FAMILY: 'SCREEN_CONTEXT',
  EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE',
  EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE',
  EXPECTED_USER_BEHAVIOR: 'Explain the current surface.',
  PROHIBITED_OUTCOMES: 'Do not invent a route.',
  CONTRACT_RATIONALE: 'Synthetic contract fixture.',
  CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  EXECUTION_CONTEXT: contextFor('COMPANY'),
  ...overrides,
});

function candidateFixture() {
  const cases = ROLES.flatMap((role) => CHALLENGES.map((challenge, index) => baseCase({
    CASE_ID: `SYNTHETIC-${role}-${String(index + 1).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: ['SCHOOL', 'ORGANIZATION'].includes(role) ? role : role,
    CHALLENGE_CLASS: challenge,
    EXECUTION_CONTEXT: contextFor(role),
  })));
  return {
    schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
    manifestId: 'synthetic-execution-context-v2',
    status: 'UNFROZEN_CANDIDATE',
    caseCount: cases.length,
    cases,
  };
}

const tests = [
  ['prose-only SURFACE_PRECONDITION is not copied into path', () => {
    const adapted = adaptGovernedCase(baseCase());
    assert.notEqual(adapted.screenContext?.path, baseCase().SURFACE_PRECONDITION);
  }],
  ['prose-only SURFACE_PRECONDITION is not copied into route', () => {
    const adapted = adaptGovernedCase(baseCase());
    assert.notEqual(adapted.screenContext?.route, baseCase().SURFACE_PRECONDITION);
  }],
  ['prose-only SURFACE_PRECONDITION is not copied into label', () => {
    const adapted = adaptGovernedCase(baseCase());
    assert.notEqual(adapted.screenContext?.label, baseCase().SURFACE_PRECONDITION);
  }],
  ['valid typed runtime context produces API-valid screenContext', () => {
    const adapted = adaptGovernedCase(baseCase());
    assert.deepEqual(adapted.screenContext, { id: 2117, path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' });
  }],
  ['missing typed runtime context fails closed', () => {
    assert.throws(() => adaptGovernedCase(baseCase({ EXECUTION_CONTEXT: undefined })), /EXECUTION_CONTEXT/u);
  }],
  ['malformed route fails before HTTP', () => {
    assert.throws(() => adaptGovernedCase(baseCase({ EXECUTION_CONTEXT: contextFor('COMPANY', { screen: { id: 2117, path: 'not-a-route', label: 'Bad', role: 'COMPANY' } }) })), /EXECUTION_CONTEXT|ROUTE/u);
  }],
  ['invalid screenContext shape fails before HTTP', () => {
    assert.throws(() => adaptGovernedCase(baseCase({ EXECUTION_CONTEXT: contextFor('COMPANY', { screen: { id: '2117', path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' } }) })), /EXECUTION_CONTEXT|SCREEN/u);
  }],
  ['selected entity metadata is preserved when typed', () => {
    const adapted = adaptGovernedCase(baseCase({ EXECUTION_CONTEXT: contextFor('COMPANY', { selectedEntity: { type: 'shift', id: 42, tenantContextType: 'COMPANY' } }) }), {
      fixtureRegistry: new Map([['SHIFT:42', { type: 'SHIFT', id: 42, exists: true, reachable: true }]]),
    });
    assert.equal(adapted.screenContext.selectedEntityType, 'shift');
    assert.equal(adapted.screenContext.selectedEntityId, 42);
  }],
  ['role and tenant context are preserved', () => {
    const adapted = adaptGovernedCase(baseCase({ EXECUTION_CONTEXT: contextFor('COMPANY') }));
    assert.equal(adapted.role, 'COMPANY');
    assert.deepEqual(adapted.tenantContext, { type: 'COMPANY', companyKind: 'COMPANY' });
  }],
  ['adapter performs zero semantic reinterpretation', () => {
    const adapted = adaptGovernedCase(baseCase());
    assert.equal(Object.hasOwn(adapted, 'semanticAction'), false);
    assert.equal(Object.hasOwn(adapted, 'requestMode'), false);
  }],
  ['adapter performs zero expectation repair', () => {
    const adapted = adaptGovernedCase(baseCase());
    assert.equal(Object.keys(adapted).some((key) => key.startsWith('EXPECTED_')), false);
  }],
  ['COMPANY current-surface context serializes structurally', async () => {
    const adapted = adaptGovernedCase(baseCase());
    const originalFetch = globalThis.fetch;
    let requestBody;
    globalThis.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { status: 200, text: async () => JSON.stringify({ ok: true }) };
    };
    try {
      await createCanonicalHttpTransport()({ endpoint: '/api/ai/copilot', session: { token: 'synthetic' }, item: adapted, message: 'synthetic' });
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.deepEqual(requestBody.screenContext, { id: 2117, path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' });
  }],
  ['non-COMPANY surface context serializes structurally', () => {
    const adapted = adaptGovernedCase(baseCase({ ROLE: 'ROOM', EXECUTION_CONTEXT: contextFor('ROOM') }));
    assert.equal(adapted.screenContext.path, '/room/shifts');
    assert.equal(adapted.screenContext.role, 'ROOM');
  }],
  ['no-screen-context case serializes without fabricated screen', () => {
    const adapted = adaptGovernedCase(baseCase({ EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXECUTION_CONTEXT: contextFor('COMPANY', { screen: null }) }));
    assert.equal(adapted.screenContext, null);
  }],
  ['canonical request serializer uses typed context only', () => {
    const adapted = adaptGovernedCase(baseCase());
    assert.equal(adapted.screenContext.path, '/company/operations');
    assert.notEqual(adapted.screenContext.path, adapted.documentation?.surfacePrecondition);
  }],
  ['no case-specific route mapping exists', () => {
    assert.equal(adaptGovernedCase.toString().includes('M18-COMPANY-01'), false);
  }],
  ['no phrase-to-route mapping exists', () => {
    assert.equal(adaptGovernedCase.toString().includes('Teklifler'), false);
  }],
  ['incomplete execution context is rejected before transport', () => {
    assert.throws(() => adaptGovernedCase(baseCase({ EXECUTION_CONTEXT: { source: 'AUTHORIZED_PRODUCT_CATALOG' } })), /EXECUTION_CONTEXT/u);
  }],
  ['valid V2 candidate schema accepts typed execution context', () => {
    const result = validateCandidateManifestSchema(candidateFixture(), { expectedCaseCount: 56 });
    assert.equal(result.safe, true, JSON.stringify(result));
  }],
  ['invalid role/screen context is rejected structurally', () => {
    const candidate = candidateFixture();
    candidate.cases[0].EXECUTION_CONTEXT = contextFor('ROOM', { screen: { id: 2117, path: '/company/operations', label: 'Operasyon Paneli', role: 'ROOM' } });
    const result = validateCandidateManifestSchema(candidate, { expectedCaseCount: 56 });
    assert.equal(result.safe, false);
  }],
];

const failures = [];
let passCount = 0;
for (const [name, test] of tests) {
  try {
    await test();
    passCount += 1;
  } catch (error) {
    failures.push({ name, message: error?.message || String(error) });
  }
}

const report = {
  status: failures.length === 0 ? 'GREEN' : 'RED',
  ADAPTER_RED_TEST_COUNT: tests.length,
  ADAPTER_RELEVANT_RED_FAILURE_COUNT: failures.length,
  ADAPTER_RELEVANT_RED_PROVEN: failures.some(({ name }) => name.includes('typed') || name.includes('prose') || name.includes('context')),
  passCount,
  failureCount: failures.length,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
