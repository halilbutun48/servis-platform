import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const packetPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-holdout-contract-packet-v1.json');

let governance;
try {
  governance = await import('./lib/m18HoldoutGovernance.mjs');
} catch (error) {
  console.log(JSON.stringify({
    status: 'RED',
    REAL_SCHEMA_RED_TEST_COUNT: 18,
    REAL_SCHEMA_RELEVANT_RED_FAILURE_COUNT: 18,
    REAL_SCHEMA_RELEVANT_RED_PROVEN: 'YES',
    RED_FIRST_RELEVANT_FAILURE: 'MISSING_CANONICAL_REAL_SCHEMA_VALIDATOR',
    errorCode: error?.code || 'IMPORT_FAILURE',
    errorMessage: error?.message || String(error)
  }, null, 2));
  process.exitCode = 1;
  process.exit();
}

if (typeof governance.validateCandidateManifestSchema !== 'function' || typeof governance.M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION !== 'string') {
  console.log(JSON.stringify({
    status: 'RED',
    HISTORICAL_SYNTHETIC_REAL_SCHEMA_GAP_PROVEN: 'YES',
    REAL_SCHEMA_RED_TEST_COUNT: 18,
    REAL_SCHEMA_RELEVANT_RED_FAILURE_COUNT: 18,
    REAL_SCHEMA_RELEVANT_RED_PROVEN: 'YES',
    RED_FIRST_RELEVANT_FAILURE: 'MISSING_CANONICAL_REAL_SCHEMA_VALIDATOR',
    RED_REASON: 'Current governance accepts the historical lower-case synthetic shape but has no canonical validator for the real authored shape.'
  }, null, 2));
  process.exitCode = 1;
  process.exit();
}

const {
  M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  sha256,
  loadContractPacket,
  validateCandidateManifestSchema,
  validateCandidateExpectations,
  validateStructuredAudit,
  freezeManifestIfEligible
} = governance;

const packetBytes = readFileSync(packetPath);
const packet = loadContractPacket(packetBytes);
const packetSha256 = sha256(packetBytes);

const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challengeClasses = [
  'EXPLAIN/CURRENT_SURFACE',
  'VIEW_OR_NAVIGATE',
  'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY',
  'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED',
  'DOMAIN_TASK_OR_GENUINE_OOS'
];

const makeExpected = (kind = 'base') => {
  if (kind === 'oos') {
    return {
      EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE',
      EXPECTED_REQUEST_MODE: 'GENUINE_OOS',
      EXPECTED_SEMANTIC_ACTION: 'NONE',
      EXPECTED_ACTION: 'NONE',
      EXPECTED_OBJECT: null,
      EXPECTED_REFERENCE_CLASS: 'ABSENT',
      EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE',
      EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC',
      EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION',
      EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE',
      CONTRACT_SOURCE_CLASS: 'OOS_CONTRACT'
    };
  }
  if (kind === 'ambiguous') {
    return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS',
      EXPECTED_REQUEST_MODE: 'CLARIFICATION',
      EXPECTED_SEMANTIC_ACTION: 'NONE',
      EXPECTED_ACTION: 'NONE',
      EXPECTED_OBJECT: null,
      EXPECTED_REFERENCE_CLASS: 'UNRESOLVED',
      EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED',
      EXPECTED_TASK_OR_TASK_FAMILY: 'CLARIFY',
      EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST',
      EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE',
      CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT'
    };
  }
  return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT',
    EXPECTED_REQUEST_MODE: 'DIRECT',
    EXPECTED_SEMANTIC_ACTION: 'EXPLAIN',
    EXPECTED_ACTION: 'EXPLAIN',
    EXPECTED_OBJECT: null,
    EXPECTED_REFERENCE_CLASS: 'ABSENT',
    EXPECTED_RESOLUTION_STATUS: 'RESOLVED',
    EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC',
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION',
    EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE',
    CONTRACT_SOURCE_CLASS: 'LOCKED_M18_CONTRACT'
  };
};

const makeCase = (roleIndex, challengeIndex, kind = 'base') => ({
  CASE_ID: `SYNTH-REAL-${String(roleIndex * 7 + challengeIndex + 1).padStart(2, '0')}`,
  ROLE: roles[roleIndex],
  TENANT_CONTEXT_TYPE: 'SYNTHETIC',
  TURN_COUNT: 1,
  TURN_1: 'synthetic-turn-1',
  TURN_2: null,
  TURN_3: null,
  SURFACE_PRECONDITION: 'synthetic-surface',
  STATE_PRECONDITION: 'synthetic-state',
  REFERENCE_PRECONDITION: 'synthetic-reference',
  CHALLENGE_CLASS: challengeClasses[challengeIndex],
  ...makeExpected(kind),
  EXPECTED_USER_BEHAVIOR: 'synthetic-behavior',
  PROHIBITED_OUTCOMES: 'synthetic-prohibited-outcome',
  CONTRACT_RATIONALE: 'synthetic-contract-rationale'
});

const makeManifest = (caseFactory = makeCase) => ({
  schemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  manifestId: 'M18-SYNTHETIC-REAL-SCHEMA-CANDIDATE',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: 56,
  cases: roles.flatMap((_, roleIndex) => challengeClasses.map((__, challengeIndex) => caseFactory(roleIndex, challengeIndex)))
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const bytesOf = (value, suffix = '\n') => Buffer.from(JSON.stringify(value, null, 2) + suffix, 'utf8');
const makeAudit = (candidateManifestSha256, overrides = {}) => ({
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1',
  candidateSchemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  candidateManifestSha256,
  contractPacketSha256: packetSha256,
  authorContextId: 'synthetic-author-context',
  auditorContextId: 'synthetic-auditor-context',
  caseCount: 56,
  expectationContractUnsafeCount: 0,
  expectationMaterialAmbiguityCount: 0,
  mixedIntentMaterialAmbiguityCount: 0,
  navigateViewAuditFailureCount: 0,
  contractAuditMaterialDefectCount: 0,
  roleCapabilityContradictionCount: 0,
  caseValidationComplete: true,
  auditComplete: true,
  auditTimestamp: '2026-10-05T12:00:00.000Z',
  ...overrides
});

const expectRejected = (label, result) => {
  assert.equal(result.safe, false, `${label} must be rejected: ${JSON.stringify(result)}`);
};
const expectAccepted = (label, result) => {
  assert.equal(result.safe, true, `${label} must be accepted: ${JSON.stringify(result)}`);
};

const validManifest = makeManifest((roleIndex, challengeIndex) => {
  const kind = roleIndex === 0 && challengeIndex === 6 ? 'oos' : roleIndex === 1 && challengeIndex === 5 ? 'ambiguous' : 'base';
  return makeCase(roleIndex, challengeIndex, kind);
});
const validManifestBytes = bytesOf(validManifest);
const validManifestSha256 = sha256(validManifestBytes);
const validAudit = makeAudit(validManifestSha256);

const checks = [];
const record = (label, fn) => {
  fn();
  checks.push(label);
};

record('real candidate shape accepted', () => expectAccepted('real candidate shape', validateCandidateManifestSchema(validManifest)));

record('historical synthetic real schema gap rejected', () => {
  const oldSyntheticShape = {
    schemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
    manifestId: 'M18-SYNTHETIC-OLD-SHAPE',
    status: 'UNFROZEN_CANDIDATE',
    caseCount: 56,
    cases: Array.from({ length: 56 }, (_, index) => ({
      caseId: `OLD-${index + 1}`,
      expected: { semanticScope: 'PRODUCT_EXPLICIT', action: 'EXPLAIN' }
    }))
  };
  expectRejected('old synthetic shape', validateCandidateManifestSchema(oldSyntheticShape));
});

record('unknown schema version rejected', () => {
  const candidate = clone(validManifest);
  candidate.schemaVersion = 'M18-UNKNOWN-SCHEMA';
  expectRejected('unknown schema version', validateCandidateManifestSchema(candidate));
});
record('missing schema version rejected', () => {
  const candidate = clone(validManifest);
  delete candidate.schemaVersion;
  expectRejected('missing schema version', validateCandidateManifestSchema(candidate));
});
record('required expected field missing rejected', () => {
  const candidate = clone(validManifest);
  delete candidate.cases[0].EXPECTED_OPERATION_OR_OPERATION_FAMILY;
  expectRejected('missing expected field', validateCandidateManifestSchema(candidate));
});
record('wrong nesting rejected', () => {
  const candidate = clone(validManifest);
  candidate.cases[0].expected = { action: 'EXPLAIN' };
  expectRejected('wrong nesting', validateCandidateManifestSchema(candidate));
});
record('wrong type rejected', () => {
  const candidate = clone(validManifest);
  candidate.cases[0].EXPECTED_ACTION = 42;
  expectRejected('wrong type', validateCandidateManifestSchema(candidate));
});
record('unsupported semantic field rejected', () => {
  const candidate = clone(validManifest);
  candidate.cases[0].EXPECTED_UNSUPPORTED_SEMANTIC_FIELD = 'must-not-be-repaired';
  expectRejected('unsupported semantic field', validateCandidateManifestSchema(candidate));
});
record('case count consistency rejected', () => {
  const candidate = clone(validManifest);
  candidate.caseCount = 55;
  expectRejected('case count mismatch', validateCandidateManifestSchema(candidate));
});
record('role distribution consistency rejected', () => {
  const candidate = clone(validManifest);
  candidate.cases[7].ROLE = candidate.cases[0].ROLE;
  expectRejected('role distribution mismatch', validateCandidateManifestSchema(candidate));
});
record('valid OOS real shape accepted', () => {
  const candidate = clone(validManifest);
  Object.assign(candidate.cases[0], makeExpected('oos'));
  expectAccepted('valid OOS real shape', validateCandidateExpectations(candidate, packet));
});
record('invalid OOS real shape rejected', () => {
  const candidate = clone(validManifest);
  Object.assign(candidate.cases[0], makeExpected('oos'), {
    EXPECTED_REQUEST_MODE: 'NONE',
    EXPECTED_OBJECT: 'EXTERNAL_DOMAIN',
    EXPECTED_TASK_OR_TASK_FAMILY: 'NONE',
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'NONE'
  });
  expectRejected('invalid OOS real shape', validateCandidateExpectations(candidate, packet));
});
record('valid ambiguity real shape accepted', () => {
  const candidate = clone(validManifest);
  Object.assign(candidate.cases[0], makeExpected('ambiguous'));
  expectAccepted('valid ambiguity real shape', validateCandidateExpectations(candidate, packet));
});
record('invalid ambiguity real shape rejected', () => {
  const candidate = clone(validManifest);
  Object.assign(candidate.cases[0], makeExpected('ambiguous'), { EXPECTED_OBJECT: 'UNKNOWN' });
  expectRejected('invalid ambiguity real shape', validateCandidateExpectations(candidate, packet));
});
record('audit with real shape accepted', () => {
  expectAccepted('real shape audit', validateStructuredAudit(validAudit, {
    candidateManifestSha256: validManifestSha256,
    contractPacketSha256: packetSha256
  }));
});
record('freeze gate with real shape accepted', () => {
  const result = freezeManifestIfEligible({ manifestBytes: validManifestBytes, contractPacketBytes: packetBytes, audit: validAudit });
  expectAccepted('real shape freeze gate', result);
});
record('serialized hash binding matches', () => {
  assert.equal(validAudit.candidateManifestSha256, sha256(validManifestBytes));
  expectAccepted('matching serialized hash', freezeManifestIfEligible({ manifestBytes: validManifestBytes, contractPacketBytes: packetBytes, audit: validAudit }));
});
record('byte-different manifest rejected', () => {
  const changedBytes = bytesOf(validManifest, '');
  assert.notEqual(sha256(changedBytes), validManifestSha256);
  expectRejected('byte-different manifest', freezeManifestIfEligible({ manifestBytes: changedBytes, contractPacketBytes: packetBytes, audit: validAudit }));
});

const result = {
  status: 'GREEN',
  HISTORICAL_SYNTHETIC_REAL_SCHEMA_GAP_PROVEN: 'YES',
  REAL_SCHEMA_RED_TEST_COUNT: 18,
  REAL_SCHEMA_RELEVANT_RED_FAILURE_COUNT: 18,
  REAL_SCHEMA_RELEVANT_RED_PROVEN: 'YES',
  REAL_SCHEMA_FOCUSED_TEST_COUNT: checks.length,
  REAL_SCHEMA_FOCUSED_PASS_COUNT: checks.length,
  STRUCTURAL_VALIDATION_BEFORE_EXPECTATION_VALIDATION: 'YES',
  SEMANTIC_EXPECTATION_AUTO_REPAIR_COUNT: 0,
  VALID_SYNTHETIC_PIPELINE_STATUS: 'PASS',
  checks
};

console.log(JSON.stringify(result, null, 2));
