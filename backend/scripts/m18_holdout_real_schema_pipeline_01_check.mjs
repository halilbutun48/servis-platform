import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  M18_HOLDOUT_CANDIDATE_SCHEMA_SHA256,
  M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  freezeManifestIfEligible,
  loadContractPacket,
  sha256
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v1.json');
const governancePath = resolve(root, 'backend', 'scripts', 'lib', 'm18HoldoutGovernance.mjs');
const schemaPath = resolve(root, 'backend', 'scripts', 'lib', 'm18HoldoutCandidateSchemaV1.json');
const freezePath = resolve(root, 'backend', 'scripts', 'm18_holdout_freeze_01_check.mjs');

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

const expectedFor = (kind = 'base') => {
  if (kind === 'oos') return {
    EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE', EXPECTED_REQUEST_MODE: 'GENUINE_OOS', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE', EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'OOS_CONTRACT'
  };
  if (kind === 'ambiguous') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'CLARIFICATION', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'CLARIFY', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT'
  };
  return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'LOCKED_M18_CONTRACT'
  };
};

const makeCase = (roleIndex, challengeIndex, kind = 'base') => ({
  CASE_ID: `SYNTH-PIPE-${String(roleIndex * 7 + challengeIndex + 1).padStart(2, '0')}`,
  ROLE: roles[roleIndex], TENANT_CONTEXT_TYPE: 'SYNTHETIC', TURN_COUNT: 1,
  TURN_1: 'synthetic-turn-1', TURN_2: null, TURN_3: null,
  SURFACE_PRECONDITION: 'synthetic-surface', STATE_PRECONDITION: 'synthetic-state', REFERENCE_PRECONDITION: 'synthetic-reference',
  CHALLENGE_CLASS: challengeClasses[challengeIndex], ...expectedFor(kind),
  EXPECTED_USER_BEHAVIOR: 'synthetic-behavior', PROHIBITED_OUTCOMES: 'synthetic-prohibited-outcome', CONTRACT_RATIONALE: 'synthetic-contract-rationale'
});

const makeManifest = () => ({
  schemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  manifestId: 'M18-SYNTHETIC-REAL-SCHEMA-PIPELINE', status: 'UNFROZEN_CANDIDATE', caseCount: 56,
  cases: roles.flatMap((_, roleIndex) => challengeClasses.map((__, challengeIndex) => makeCase(
    roleIndex,
    challengeIndex,
    roleIndex === 0 && challengeIndex === 6 ? 'oos' : roleIndex === 1 && challengeIndex === 5 ? 'ambiguous' : 'base'
  )))
});

const clone = (value) => JSON.parse(JSON.stringify(value));
const bytesOf = (value, suffix = '\n') => Buffer.from(JSON.stringify(value, null, 2) + suffix, 'utf8');
const manifest = makeManifest();
const manifestBytes = bytesOf(manifest);
const manifestSha256 = sha256(manifestBytes);
const audit = {
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1', candidateSchemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION,
  candidateManifestSha256: manifestSha256, contractPacketSha256: packetSha256,
  authorContextId: 'synthetic-author-context', auditorContextId: 'synthetic-auditor-context', caseCount: 56,
  expectationContractUnsafeCount: 0, expectationMaterialAmbiguityCount: 0, mixedIntentMaterialAmbiguityCount: 0,
  navigateViewAuditFailureCount: 0, contractAuditMaterialDefectCount: 0, roleCapabilityContradictionCount: 0,
  caseValidationComplete: true, auditComplete: true, auditTimestamp: '2026-10-05T12:00:00.000Z'
};

const run = ({ candidate = manifest, candidateBytes = bytesOf(candidate), candidateAudit = audit, candidatePacketBytes = packetBytes } = {}) => freezeManifestIfEligible({
  manifestBytes: candidateBytes,
  contractPacketBytes: candidatePacketBytes,
  audit: candidateAudit
});
const expectBlocked = (label, result) => assert.equal(result.safe, false, `${label} must be blocked: ${JSON.stringify(result)}`);

const mutationCases = [
  ['schema version missing', () => { const value = clone(manifest); delete value.schemaVersion; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['schema version wrong', () => { const value = clone(manifest); value.schemaVersion = 'M18-WRONG'; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['cases missing', () => { const value = clone(manifest); delete value.cases; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['cases wrong type', () => { const value = clone(manifest); value.cases = {}; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['case count mismatch', () => { const value = clone(manifest); value.caseCount = 55; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['role count mismatch', () => { const value = clone(manifest); value.cases[7].ROLE = value.cases[0].ROLE; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['expected block missing', () => { const value = clone(manifest); delete value.cases[0].EXPECTED_ACTION; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['expected field wrong type', () => { const value = clone(manifest); value.cases[0].EXPECTED_ACTION = 7; return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['invalid OOS projection', () => { const value = clone(manifest); Object.assign(value.cases[0], expectedFor('oos'), { EXPECTED_REQUEST_MODE: 'NONE', EXPECTED_OBJECT: 'EXTERNAL_DOMAIN', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'NONE' }); return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['invalid ambiguity object', () => { const value = clone(manifest); Object.assign(value.cases[0], expectedFor('ambiguous'), { EXPECTED_OBJECT: 'UNKNOWN' }); return run({ candidate: value, candidateAudit: { ...audit, candidateManifestSha256: sha256(bytesOf(value)) } }); }],
  ['audit missing', () => run({ candidateAudit: null })],
  ['audit incomplete', () => run({ candidateAudit: { ...audit, auditComplete: false } })],
  ['author equals auditor', () => run({ candidateAudit: { ...audit, authorContextId: 'same', auditorContextId: 'same' } })],
  ['manifest hash mismatch', () => run({ candidateAudit: { ...audit, candidateManifestSha256: 'A'.repeat(64) } })],
  ['contract packet hash mismatch', () => run({ candidateAudit: { ...audit, contractPacketSha256: 'B'.repeat(64) } })],
  ['unsafe count one', () => run({ candidateAudit: { ...audit, expectationContractUnsafeCount: 1 } })],
  ['material defect one', () => run({ candidateAudit: { ...audit, contractAuditMaterialDefectCount: 1 } })],
  ['audit manifest bytes changed', () => { const changedBytes = bytesOf(manifest, ''); return run({ candidateBytes: changedBytes }); }],
  ['contract packet changed after audit', () => { const changedPacket = JSON.parse(packetBytes.toString('utf8')); changedPacket.rules.syntheticGovernanceMutation = 'changed-after-audit'; return run({ candidatePacketBytes: bytesOf(changedPacket) }); }],
  ['free-form GREEN without structured evidence', () => run({ candidateAudit: { finalVerdict: 'GREEN' } })]
];

for (const [label, execute] of mutationCases) expectBlocked(label, execute());

const governanceHashesBefore = {
  contract: sha256(readFileSync(packetPath)),
  schema: sha256(readFileSync(schemaPath)),
  library: sha256(readFileSync(governancePath)),
  freeze: sha256(readFileSync(freezePath))
};
assert.equal(governanceHashesBefore.schema, M18_HOLDOUT_CANDIDATE_SCHEMA_SHA256, 'schema owner hash must be stable');
const run1 = run();
assert.equal(run1.safe, true, `synthetic run 1 must pass: ${JSON.stringify(run1)}`);
const governanceHashesBetween = {
  contract: sha256(readFileSync(packetPath)),
  schema: sha256(readFileSync(schemaPath)),
  library: sha256(readFileSync(governancePath)),
  freeze: sha256(readFileSync(freezePath))
};
const run2 = run();
assert.equal(run2.safe, true, `synthetic run 2 must pass: ${JSON.stringify(run2)}`);
const governanceHashesAfter = {
  contract: sha256(readFileSync(packetPath)),
  schema: sha256(readFileSync(schemaPath)),
  library: sha256(readFileSync(governancePath)),
  freeze: sha256(readFileSync(freezePath))
};
assert.deepEqual(governanceHashesBefore, governanceHashesBetween);
assert.deepEqual(governanceHashesBetween, governanceHashesAfter);

console.log(JSON.stringify({
  status: 'GREEN',
  REAL_SCHEMA_MUTATION_CASE_COUNT: mutationCases.length + 1,
  REAL_SCHEMA_INVALID_MUTATION_COUNT: mutationCases.length,
  REAL_SCHEMA_INVALID_MUTATION_REJECTION_COUNT: mutationCases.length,
  VALID_CONTROL_ACCEPTED: 'YES',
  SYNTHETIC_RUN_1_STATUS: 'GREEN',
  SYNTHETIC_RUN_2_STATUS: 'GREEN',
  GOVERNANCE_FILE_MUTATION_COUNT_BETWEEN_RUNS: 0,
  GOVERNANCE_IDENTITY_STABLE_DURING_PIPELINE: 'YES',
  governanceHashesBefore,
  governanceHashesAfter
}, null, 2));
