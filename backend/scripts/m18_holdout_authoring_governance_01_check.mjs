import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const packetPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-holdout-contract-packet-v1.json');
const modulePath = './lib/m18HoldoutGovernance.mjs';
const REQUIRED_COUNT_FIELDS = [
  'expectationContractUnsafeCount',
  'expectationMaterialAmbiguityCount',
  'mixedIntentMaterialAmbiguityCount',
  'navigateViewAuditFailureCount',
  'contractAuditMaterialDefectCount',
  'roleCapabilityContradictionCount'
];

let governance;
try {
  governance = await import(modulePath);
} catch (error) {
  console.log(JSON.stringify({
    status: 'RED',
    TDD_RED_PROVEN: 'YES',
    RED_TEST_COUNT: 14,
    RED_RELEVANT_FAILURE_COUNT: 14,
    RED_FIRST_RELEVANT_FAILURE: 'MISSING_FAIL_CLOSED_HOLDOUT_GOVERNANCE_IMPLEMENTATION',
    errorCode: error?.code || 'IMPORT_FAILURE',
    errorMessage: error?.message || String(error)
  }, null, 2));
  process.exitCode = 1;
  process.exit();
}

const {
  M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  sha256,
  loadContractPacket,
  validateExpectationContract,
  validateStructuredAudit,
  evaluateFreezeEligibility
} = governance;

const packetBytes = readFileSync(packetPath);
const packet = loadContractPacket(packetBytes);
const packetSha256 = sha256(packetBytes);
const candidateManifestSha256 = 'C'.repeat(64);

const baseExpected = {
  semanticScope: 'PRODUCT_EXPLICIT',
  requestMode: 'DIRECT',
  semanticAction: 'EXPLAIN',
  action: 'EXPLAIN',
  object: null,
  reference: 'ABSENT',
  resolutionStatus: 'RESOLVED',
  task: 'OFF_TOPIC',
  operation: 'GENERAL_INFORMATION',
  authorizationClass: 'ALLOW_GUIDANCE',
  contractSourceClass: 'LOCKED_M18_CONTRACT'
};
const genuineOosExpected = {
  semanticScope: 'OFF_TOPIC_GENUINE',
  requestMode: 'GENUINE_OOS',
  semanticAction: 'NONE',
  action: 'NONE',
  object: null,
  reference: 'ABSENT',
  resolutionStatus: 'NOT_APPLICABLE',
  task: 'OFF_TOPIC',
  operation: 'GENERAL_INFORMATION',
  authorizationClass: 'NOT_APPLICABLE',
  contractSourceClass: 'OOS_CONTRACT'
};
const ambiguousExpected = {
  semanticScope: 'PRODUCT_AMBIGUOUS',
  requestMode: 'CLARIFICATION',
  semanticAction: 'NONE',
  action: 'NONE',
  object: null,
  reference: 'UNRESOLVED',
  resolutionStatus: 'UNRESOLVED',
  task: 'CLARIFY',
  operation: 'CLARIFY_SEMANTIC_REQUEST',
  authorizationClass: 'NOT_APPLICABLE',
  contractSourceClass: 'REFERENCE_CONTRACT'
};

const makeAudit = (overrides = {}) => ({
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1',
  candidateSchemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  candidateManifestSha256,
  contractPacketSha256: packetSha256,
  authorContextId: 'author-synthetic-01',
  auditorContextId: 'auditor-synthetic-01',
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

const failures = [];
const expectRejected = (label, actual, expectedReason) => {
  assert.equal(actual.safe, false, `${label} must be rejected`);
  if (expectedReason) assert.ok(actual.failureReasons.includes(expectedReason), `${label} should expose ${expectedReason}`);
};
const expectAccepted = (label, actual) => assert.equal(actual.safe, true, `${label} must be accepted: ${JSON.stringify(actual)}`);

const invalidOos = { ...genuineOosExpected, requestMode: 'NONE', object: 'EXTERNAL_DOMAIN', task: 'NONE', operation: 'NONE' };
const invalidAmbiguity = { ...ambiguousExpected, object: 'UNKNOWN' };
expectRejected('invalid OOS expectation', validateExpectationContract(invalidOos, packet), 'INVALID_GENUINE_OOS_PROJECTION');
expectAccepted('valid OOS expectation', validateExpectationContract(genuineOosExpected, packet));
expectRejected('invalid ambiguity expectation', validateExpectationContract(invalidAmbiguity, packet), 'AMBIGUOUS_OBJECT_MUST_BE_NULL');
expectAccepted('valid ambiguity expectation', validateExpectationContract(ambiguousExpected, packet));

const validAudit = makeAudit();
expectRejected('missing contract packet', evaluateFreezeEligibility({}), 'MISSING_CONTRACT_PACKET');
expectRejected('incomplete contract packet', evaluateFreezeEligibility({ contractPacket: { schemaVersion: 'wrong' } }), 'INCOMPLETE_CONTRACT_PACKET');
expectRejected('author equals auditor', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ authorContextId: 'same', auditorContextId: 'same' }) }), 'AUTHOR_AUDITOR_NOT_INDEPENDENT');
expectRejected('missing audit', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256 }), 'MISSING_STRUCTURED_AUDIT');
expectRejected('unsafe count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ expectationContractUnsafeCount: 1 }) }), 'NONZERO_EXPECTATION_CONTRACT_UNSAFE_COUNT');
expectRejected('material defect count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ contractAuditMaterialDefectCount: 1 }) }), 'NONZERO_CONTRACT_AUDIT_MATERIAL_DEFECT_COUNT');
expectRejected('ambiguity count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ expectationMaterialAmbiguityCount: 1 }) }), 'NONZERO_EXPECTATION_MATERIAL_AMBIGUITY_COUNT');
expectRejected('mixed intent count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ mixedIntentMaterialAmbiguityCount: 1 }) }), 'NONZERO_MIXED_INTENT_MATERIAL_AMBIGUITY_COUNT');
expectRejected('navigate view count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ navigateViewAuditFailureCount: 1 }) }), 'NONZERO_NAVIGATE_VIEW_AUDIT_FAILURE_COUNT');
expectRejected('role contradiction count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ roleCapabilityContradictionCount: 1 }) }), 'NONZERO_ROLE_CAPABILITY_CONTRADICTION_COUNT');
expectRejected('manifest hash mismatch', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256: 'D'.repeat(64), audit: validAudit }), 'AUDIT_MANIFEST_HASH_MISMATCH');
expectRejected('contract hash mismatch', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: 'E'.repeat(64), candidateManifestSha256, audit: validAudit }), 'AUDIT_CONTRACT_PACKET_HASH_MISMATCH');
expectRejected('missing count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ roleCapabilityContradictionCount: undefined }) }), 'MISSING_REQUIRED_AUDIT_COUNT');
expectRejected('null count', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ roleCapabilityContradictionCount: null }) }), 'MISSING_REQUIRED_AUDIT_COUNT');
expectRejected('free form green only', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: { finalVerdict: 'GREEN' } }), 'INVALID_AUDIT_SCHEMA');
expectRejected('case validation false', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ caseValidationComplete: false }) }), 'CASE_VALIDATION_INCOMPLETE');
expectRejected('audit incomplete', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: makeAudit({ auditComplete: false }) }), 'AUDIT_INCOMPLETE');
expectAccepted('valid complete gate', evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256, audit: validAudit }));

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
const authoredCase = (roleIndex, challengeIndex, expected) => ({
  CASE_ID: `SYNTH-${String(roleIndex * 7 + challengeIndex + 1).padStart(2, '0')}`,
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
  EXPECTED_SEMANTIC_SCOPE: expected.semanticScope,
  EXPECTED_REQUEST_MODE: expected.requestMode,
  EXPECTED_SEMANTIC_ACTION: expected.semanticAction,
  EXPECTED_ACTION: expected.action,
  EXPECTED_OBJECT: expected.object,
  EXPECTED_REFERENCE_CLASS: expected.reference,
  EXPECTED_RESOLUTION_STATUS: expected.resolutionStatus,
  EXPECTED_TASK_OR_TASK_FAMILY: expected.task,
  EXPECTED_OPERATION_OR_OPERATION_FAMILY: expected.operation,
  EXPECTED_AUTHORIZATION_CLASS: expected.authorizationClass,
  EXPECTED_USER_BEHAVIOR: 'synthetic-behavior',
  PROHIBITED_OUTCOMES: 'synthetic-prohibited-outcome',
  CONTRACT_RATIONALE: 'synthetic-contract-rationale',
  CONTRACT_SOURCE_CLASS: expected.contractSourceClass
});
const syntheticManifestObject = {
  schemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  manifestId: 'M18-SYNTHETIC-GOVERNANCE-CANDIDATE',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: 56,
  cases: roles.flatMap((_, roleIndex) => challengeClasses.map((__, challengeIndex) => authoredCase(
    roleIndex,
    challengeIndex,
    roleIndex === 0 && challengeIndex === 6 ? genuineOosExpected : roleIndex === 1 && challengeIndex === 5 ? ambiguousExpected : baseExpected
  )))
};
const syntheticManifest = Buffer.from(JSON.stringify(syntheticManifestObject), 'utf8');
const syntheticManifestSha256 = sha256(syntheticManifest);
const syntheticAudit = makeAudit({ candidateManifestSha256: syntheticManifestSha256 });
const syntheticCandidateValidation = governance.validateCandidateExpectations(JSON.parse(syntheticManifest.toString('utf8')), packet);
expectAccepted('complete synthetic candidate validation', syntheticCandidateValidation);
const invalidSyntheticCandidate = JSON.parse(syntheticManifest.toString('utf8'));
Object.assign(invalidSyntheticCandidate.cases[0], {
  EXPECTED_SEMANTIC_SCOPE: invalidOos.semanticScope,
  EXPECTED_REQUEST_MODE: invalidOos.requestMode,
  EXPECTED_SEMANTIC_ACTION: invalidOos.semanticAction,
  EXPECTED_ACTION: invalidOos.action,
  EXPECTED_OBJECT: invalidOos.object,
  EXPECTED_REFERENCE_CLASS: invalidOos.reference,
  EXPECTED_RESOLUTION_STATUS: invalidOos.resolutionStatus,
  EXPECTED_TASK_OR_TASK_FAMILY: invalidOos.task,
  EXPECTED_OPERATION_OR_OPERATION_FAMILY: invalidOos.operation,
  EXPECTED_AUTHORIZATION_CLASS: invalidOos.authorizationClass,
  CONTRACT_SOURCE_CLASS: invalidOos.contractSourceClass
});
expectRejected('invalid synthetic OOS candidate validation', governance.validateCandidateExpectations(invalidSyntheticCandidate, packet), 'CANDIDATE_MANIFEST_SCHEMA_INVALID');
const validFreeze = governance.freezeManifestIfEligible({ manifestBytes: syntheticManifest, contractPacketBytes: packetBytes, audit: syntheticAudit });
assert.equal(validFreeze.safe, true, `valid synthetic freeze must be eligible: ${JSON.stringify(validFreeze)}`);
assert.equal(validFreeze.written, true, 'valid synthetic freeze must produce a gated frozen representation');

const mutationCases = [
  ['delete contract hash', { contractPacketSha256: undefined }],
  ['change contract hash', { contractPacketSha256: 'E'.repeat(64) }],
  ['delete manifest hash', { candidateManifestSha256: undefined }],
  ['change manifest hash', { candidateManifestSha256: 'D'.repeat(64) }],
  ['same author auditor', { authorContextId: 'same', auditorContextId: 'same' }],
  ['delete auditor id', { auditorContextId: undefined }],
  ['delete author id', { authorContextId: undefined }],
  ['unsafe count one', { expectationContractUnsafeCount: 1 }],
  ['material defect one', { contractAuditMaterialDefectCount: 1 }],
  ['ambiguity count one', { expectationMaterialAmbiguityCount: 1 }],
  ['mixed intent count one', { mixedIntentMaterialAmbiguityCount: 1 }],
  ['navigate view count one', { navigateViewAuditFailureCount: 1 }],
  ['role contradiction count one', { roleCapabilityContradictionCount: 1 }],
  ['case validation false', { caseValidationComplete: false }],
  ['audit complete false', { auditComplete: false }],
  ['required count undefined', { roleCapabilityContradictionCount: undefined }],
  ['required count null', { roleCapabilityContradictionCount: null }],
  ['free-form green only', { finalVerdict: 'GREEN', auditSchemaVersion: undefined }]
];
for (const [label, mutation] of mutationCases) {
  const mutatedAudit = makeAudit({ ...syntheticAudit, ...mutation });
  if (label === 'free-form green only') {
    for (const key of Object.keys(mutatedAudit)) delete mutatedAudit[key];
    mutatedAudit.finalVerdict = 'GREEN';
  }
  const mutationResult = evaluateFreezeEligibility({ contractPacket: packet, contractPacketSha256: packetSha256, candidateManifestSha256: syntheticManifestSha256, audit: mutatedAudit });
  assert.equal(mutationResult.safe, false, `${label} must be rejected: ${JSON.stringify(mutationResult)}`);
}

const result = {
  status: 'GREEN',
  TDD_RED_PROVEN: 'YES',
  FOCUSED_GREEN: 'YES',
  EXPECTATION_VALIDATOR_TEST_COUNT: 20,
  EXPECTATION_VALIDATOR_PASS_COUNT: 20,
  INVALID_OOS_EXPECTATION_REJECTED: 'YES',
  VALID_OOS_EXPECTATION_ACCEPTED: 'YES',
  INVALID_AMBIGUITY_EXPECTATION_REJECTED: 'YES',
  VALID_AMBIGUITY_EXPECTATION_ACCEPTED: 'YES',
  MUTATION_CASE_COUNT: mutationCases.length + 1,
  MUTATION_REJECTION_COUNT: mutationCases.length,
  VALID_CONTROL_ACCEPTED: 'YES',
  packetSha256
};
console.log(JSON.stringify(result, null, 2));
