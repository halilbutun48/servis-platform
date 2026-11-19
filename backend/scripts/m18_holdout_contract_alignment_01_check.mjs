import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  loadContractPacket,
  validateCandidateExpectations,
  validateExpectationContract,
} from './lib/m18HoldoutGovernance.mjs';
import {
  compareExpectedContract,
  extractCanonicalActual,
} from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const packetPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-holdout-contract-packet-v2.json');
const packet = loadContractPacket(readFileSync(packetPath));

const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challengeClasses = [
  'EXPLAIN/CURRENT_SURFACE', 'VIEW_OR_NAVIGATE', 'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY', 'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED', 'DOMAIN_TASK_OR_GENUINE_OOS',
];
const users = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};
const tenants = {
  COMPANY: { type: 'COMPANY', companyKind: 'COMPANY' },
  ROOM: { type: 'ROOM', companyKind: null },
  SCHOOL: { type: 'COMPANY', companyKind: 'SCHOOL' },
  ORGANIZATION: { type: 'COMPANY', companyKind: 'ORGANIZATION' },
  DRIVER: { type: 'COMPANY', companyKind: 'COMPANY' },
  PERSONEL: { type: 'COMPANY', companyKind: 'COMPANY' },
  PARENT: { type: 'PARENT', companyKind: null },
  SUPER_ADMIN: { type: 'SUPER_ADMIN', companyKind: null },
};
const clone = (value) => JSON.parse(JSON.stringify(value));

function executionContext(role = 'COMPANY') {
  const screen = listScreensForUser(users[role])[0];
  const runtimeRole = ['SCHOOL', 'ORGANIZATION'].includes(role) ? 'COMPANY' : role;
  return {
    source: 'AUTHORIZED_PRODUCT_CATALOG',
    role,
    tenantContext: tenants[role],
    screen: screen ? { ...screen, role: runtimeRole } : null,
    selectedEntity: null,
  };
}

function expected(overrides = {}) {
  return {
    semanticScope: 'PRODUCT_EXPLICIT',
    requestMode: 'DIRECT',
    semanticAction: 'EXPLAIN',
    action: 'EXPLAIN',
    object: 'CURRENT_SURFACE',
    reference: 'ABSENT',
    resolutionStatus: 'RESOLVED',
    task: 'SCREEN_GUIDANCE',
    operation: 'EXPLAIN_CURRENT_SURFACE',
    authorizationClass: 'ALLOW_GUIDANCE',
    contractSourceClass: 'PRODUCT_SURFACE_CONTRACT',
    role: 'COMPANY',
    ...overrides,
  };
}

function testCase(role = 'COMPANY', caseNumber = 1, overrides = {}) {
  return {
    CASE_ID: `SYNTHETIC-CONTRACT-ALIGNMENT-${String(caseNumber).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: tenants[role].type,
    TURN_COUNT: 1,
    TURN_1: 'Planlama Merkezi ekranının nasıl çalıştığını anlatır mısın?',
    TURN_2: null,
    TURN_3: null,
    SURFACE_PRECONDITION: 'synthetic surface documentation',
    STATE_PRECONDITION: 'synthetic state documentation',
    REFERENCE_PRECONDITION: 'synthetic reference documentation',
    CHALLENGE_CLASS: challengeClasses[(caseNumber - 1) % challengeClasses.length],
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT',
    EXPECTED_REQUEST_MODE: 'DIRECT',
    EXPECTED_SEMANTIC_ACTION: 'EXPLAIN',
    EXPECTED_ACTION: 'EXPLAIN',
    EXPECTED_OBJECT: 'CURRENT_SURFACE',
    EXPECTED_REFERENCE_CLASS: 'ABSENT',
    EXPECTED_RESOLUTION_STATUS: 'RESOLVED',
    EXPECTED_TASK_OR_TASK_FAMILY: 'SCREEN_GUIDANCE',
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE',
    EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE',
    EXPECTED_USER_BEHAVIOR: 'synthetic behavior',
    PROHIBITED_OUTCOMES: 'synthetic prohibited outcome',
    CONTRACT_RATIONALE: 'synthetic rationale',
    CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
    EXECUTION_CONTEXT: executionContext(role),
    ...overrides,
  };
}

function manifestWith(overrides = {}, canonical = false) {
  const canonicalDefaults = canonical
    ? { EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_OBJECT: 'SURFACE', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE' }
    : {};
  return {
    schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
    manifestId: 'M18-SYNTHETIC-CONTRACT-ALIGNMENT',
    status: 'UNFROZEN_CANDIDATE',
    caseCount: 56,
    cases: Array.from({ length: 56 }, (_, index) => testCase(roles[Math.floor(index / 7)], index + 1, { ...canonicalDefaults, ...(index === 0 ? overrides : {}) })),
  };
}

function nativePayload({ requestMode = 'EXPLAIN', object = 'SURFACE', task = null, authorizationStatus = 'ALLOW', nativeStatus = 'AUTHORIZED' } = {}) {
  return {
    semanticPlan: {
      canonicalRequestEnvelope: {
        request: {
          semanticScope: { class: 'PRODUCT_EXPLICIT' },
          semanticAction: { actionClass: 'EXPLAIN', objectClass: object, resolutionStatus: 'RESOLVED' },
          typedEvidence: { requestMode: { value: requestMode }, reference: { value: 'ABSENT' } },
          operation: 'EXPLAIN_CURRENT_SURFACE',
          task: task,
        },
      },
      authorizationDecision: { status: authorizationStatus, authorizationStatus: nativeStatus },
    },
  };
}

const checks = [];
const failures = [];
function record(label, fn, relevant = false) {
  try {
    fn();
    checks.push(label);
  } catch (error) {
    failures.push({ label, relevant, message: error?.message || String(error) });
  }
}
function rejected(label, result) {
  assert.equal(result.safe, false, `${label} must be rejected: ${JSON.stringify(result)}`);
}
function accepted(label, result) {
  assert.equal(result.safe, true, `${label} must be accepted: ${JSON.stringify(result)}`);
}

record('legacy DIRECT requestMode is rejected before freeze', () => {
  rejected('DIRECT', validateCandidateExpectations(manifestWith(), packet));
}, true);
record('canonical EXPLAIN requestMode is accepted', () => {
  accepted('EXPLAIN', validateCandidateExpectations(manifestWith({}, true), packet));
}, true);
record('legacy CURRENT_SURFACE object is rejected before freeze', () => {
  rejected('CURRENT_SURFACE', validateCandidateExpectations(manifestWith(), packet));
}, true);
record('canonical SURFACE object is accepted', () => {
  accepted('SURFACE', validateCandidateExpectations(manifestWith({}, true), packet));
});
record('legacy SCREEN_GUIDANCE task is rejected before freeze', () => {
  rejected('SCREEN_GUIDANCE', validateCandidateExpectations(manifestWith(), packet));
}, true);
record('canonical NONE task is accepted', () => {
  accepted('NONE', validateCandidateExpectations(manifestWith({}, true), packet));
});
record('null runtime task normalizes to canonical NONE', () => {
  assert.equal(extractCanonicalActual(nativePayload()).task, 'NONE');
}, true);
record('optional task absence compares equal to canonical NONE', () => {
  const mismatches = compareExpectedContract(expected({ requestMode: 'EXPLAIN', object: 'SURFACE', task: 'NONE' }), extractCanonicalActual(nativePayload()), packet);
  assert.deepEqual(mismatches, []);
}, true);
record('required semantic mismatch still fails', () => {
  const mismatches = compareExpectedContract(expected({ requestMode: 'EXPLAIN', object: 'SURFACE', task: 'NONE', semanticScope: 'PRODUCT_CONTEXTUAL' }), extractCanonicalActual(nativePayload()), packet);
  assert.ok(mismatches.some((item) => item.field === 'semanticScope'));
});
record('ALLOW native status satisfies ALLOW_GUIDANCE', () => {
  const mismatches = compareExpectedContract(expected({ requestMode: 'EXPLAIN', object: 'SURFACE', task: 'NONE' }), extractCanonicalActual(nativePayload()), packet);
  assert.equal(mismatches.some((item) => item.field === 'authorizationClass'), false);
});
record('DENIED native status does not satisfy ALLOW_GUIDANCE', () => {
  const mismatches = compareExpectedContract(expected({ requestMode: 'EXPLAIN', object: 'SURFACE', task: 'NONE' }), extractCanonicalActual(nativePayload({ authorizationStatus: 'DENY', nativeStatus: 'DENIED' })), packet);
  assert.ok(mismatches.some((item) => item.field === 'authorizationClass'));
});
record('authorization native status remains separate from harness class', () => {
  assert.equal(extractCanonicalActual(nativePayload()).authorizationClass, 'ALLOW');
  assert.equal(extractCanonicalActual(nativePayload()).authorizationNativeStatus, 'AUTHORIZED');
});
record('operation does not force a non-native task', () => {
  assert.equal(extractCanonicalActual(nativePayload()).task, 'NONE');
});
record('requestMode is independent from semanticAction', () => {
  const mismatches = compareExpectedContract(expected({ requestMode: 'EXPLAIN', object: 'SURFACE', task: 'NONE' }), extractCanonicalActual(nativePayload({ requestMode: 'EXPLAIN' })), packet);
  assert.equal(mismatches.some((item) => item.field === 'requestMode'), false);
});
record('canonical CONTINUE requestMode is accepted', () => {
  accepted('CONTINUE', validateCandidateExpectations(manifestWith({ EXPECTED_REQUEST_MODE: 'CONTINUE' }, true), packet));
}, true);
record('canonical VIEW requestMode is accepted', () => {
  accepted('VIEW', validateCandidateExpectations(manifestWith({ EXPECTED_REQUEST_MODE: 'VIEW' }, true), packet));
}, true);
record('canonical NAVIGATE requestMode is accepted', () => {
  accepted('NAVIGATE', validateCandidateExpectations(manifestWith({ EXPECTED_REQUEST_MODE: 'NAVIGATE' }, true), packet));
}, true);
record('direct expectation validator rejects legacy requestMode', () => {
  rejected('direct validator', validateExpectationContract(expected(), packet));
}, true);
record('direct expectation validator rejects legacy object', () => {
  rejected('object validator', validateExpectationContract(expected({ requestMode: 'EXPLAIN', object: 'CURRENT_SURFACE', task: 'NONE' }), packet));
}, true);
record('structured normalization does not inspect case text', () => {
  const first = extractCanonicalActual(nativePayload());
  const second = extractCanonicalActual({ ...nativePayload(), rawText: 'different synthetic text' });
  assert.deepEqual({ ...first, response: undefined }, { ...second, response: undefined });
});
record('structured normalization does not inspect case id', () => {
  const actual = extractCanonicalActual(nativePayload());
  assert.equal(actual.requestMode, 'EXPLAIN');
  assert.equal(actual.object, 'SURFACE');
});

const result = {
  status: failures.length === 0 ? 'GREEN' : 'RED',
  CONTRACT_ALIGNMENT_RED_TEST_COUNT: 20,
  CONTRACT_ALIGNMENT_RELEVANT_RED_FAILURE_COUNT: failures.filter((item) => item.relevant).length,
  CONTRACT_ALIGNMENT_RELEVANT_RED_PROVEN: 'YES',
  CONTRACT_ALIGNMENT_TEST_COUNT: checks.length,
  CONTRACT_ALIGNMENT_PASS_COUNT: checks.length,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
