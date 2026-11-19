import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  freezeManifestIfEligible,
  loadContractPacket,
  sha256 as governanceSha256,
  validateCandidateExpectations,
} from './lib/m18HoldoutGovernance.mjs';
import {
  CANONICAL_LIVE_AUTHORITY_PATH,
  CANONICAL_RUNTIME_ENDPOINT,
  BUSINESS_WRITE_POLICY,
  EXECUTION_RECEIPT_SCHEMA_VERSION,
  FIRST_FAILURE_STOP_POLICY,
  SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  CRITICAL_FAILURE_STOP_POLICY,
  compareExpectedContract,
  createFreezeReceipt,
  createExecutionReceipt,
  executeGovernedManifest,
  validateExecutionManifestPreflight,
  validateFreezeReceipt,
  writeExecutionReceipt,
} from './lib/m18HoldoutExecutionAdapter.mjs';
import { createProvenanceReceipt } from './lib/m18RunScopedProvenance.mjs';
import {
  createV2ProtocolBinding,
  createEffectiveRuntimeReceipt,
  createGovernedExecutionReceipt,
  createCaseEvidenceProjection,
  validateV2ProtocolBinding,
} from './m18_final_fresh_20261006_execute.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const finalExecutorSource = readFileSync(resolve(root, 'backend/scripts/m18_final_fresh_20261006_execute.mjs'), 'utf8');
const packetBytes = readFileSync(resolve(planDir, 'm18-holdout-contract-packet-v2.json'));
const packet = loadContractPacket(packetBytes);
const schemaVersion = 'M18-FRESH-UNFROZEN-CANDIDATE-V2';
const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challenges = [
  'EXPLAIN/CURRENT_SURFACE', 'VIEW_OR_NAVIGATE', 'REFERENCE_CONTEXT', 'CONTINUATION_RECOVERY',
  'ROLE_AUTHORIZATION_BOUNDARY', 'AMBIGUITY_UNKNOWN_FAIL_CLOSED', 'DOMAIN_TASK_OR_GENUINE_OOS',
];

const executionContextFor = (role) => {
  const contexts = {
    COMPANY: { tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' }, screen: { id: 2117, path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' } },
    ROOM: { tenantContext: { type: 'ROOM', companyKind: null }, screen: { id: 1103, path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' } },
    SCHOOL: { tenantContext: { type: 'COMPANY', companyKind: 'SCHOOL' }, screen: { id: 2117, path: '/school/operations', label: 'Operasyon Paneli', role: 'COMPANY' } },
    ORGANIZATION: { tenantContext: { type: 'COMPANY', companyKind: 'ORGANIZATION' }, screen: { id: 2117, path: '/organization/operations', label: 'Operasyon Paneli', role: 'COMPANY' } },
    DRIVER: { tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' }, screen: { id: 3101, path: '/driver/today', label: 'Bugün', role: 'DRIVER' } },
    PERSONEL: { tenantContext: { type: 'COMPANY', companyKind: 'COMPANY' }, screen: { id: 4101, path: '/personel/live', label: 'Canlı', role: 'PERSONEL' } },
    PARENT: { tenantContext: { type: 'PARENT', companyKind: null }, screen: { id: 5101, path: '/parent/live', label: 'Canlı', role: 'PARENT' } },
    SUPER_ADMIN: { tenantContext: { type: 'SUPER_ADMIN', companyKind: null }, screen: { id: 6117, path: '/superadmin/operations', label: 'Denetim Paneli', role: 'SUPER_ADMIN' } },
  };
  return { source: 'AUTHORIZED_PRODUCT_CATALOG', role, ...contexts[role], selectedEntity: null };
};

const continuationStateFor = (role) => ({
  schemaVersion: 'M18-CONTINUATION-AUTHORING-STATE-V1',
  stateKind: 'ROLE_SEQUENTIAL_AUTH_SESSION',
  priorCaseIds: [`SYNTH-PRIOR-${role}`],
  priorCanonicalTask: 'SCREEN_CONTEXT',
  priorOperation: 'EXPLAIN_CURRENT_SURFACE',
  priorObjectClass: 'SURFACE',
  priorSemanticScope: 'PRODUCT_EXPLICIT',
  priorReference: 'ABSENT',
  priorResolutionStatus: 'RESOLVED',
  currentSurface: { id: 1103, path: '/room/shifts', label: 'Vardiyalar', role },
  selectedEntity: null,
  selectedRecord: null,
  priorGuidedTarget: null,
  priorGuidedTask: 'SCREEN_CONTEXT',
  sessionScope: { role, tenantContext: executionContextFor(role).tenantContext },
  continuationBaseObjectClass: 'SURFACE',
  conversationStateRequired: true,
});

const expectedFor = (roleIndex, challengeIndex) => {
  if (challengeIndex === 6) return {
    EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE', EXPECTED_REQUEST_MODE: 'GENUINE_OOS', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE', EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'OOS_CONTRACT'
  };
  if (challengeIndex === 5) return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'UNRESOLVED', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT'
  };
  if (challengeIndex === 3) return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_CONTEXTUAL', EXPECTED_REQUEST_MODE: 'CONTINUE', EXPECTED_SEMANTIC_ACTION: 'NEXT', EXPECTED_ACTION: 'NEXT', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'VALID_CONTEXTUAL_REFERENCE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'CONTINUE_CURRENT_REASONING', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CONTINUE_EXPLANATION', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_OPERATION', CONTRACT_SOURCE_CLASS: 'CONTINUATION_CONTRACT'
  };
  if (challengeIndex === 4 && roleIndex === 0) return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'CREATE', EXPECTED_SEMANTIC_ACTION: 'CREATE', EXPECTED_ACTION: 'CREATE', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CREATE_SHIFT', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_PLANNING_INTENT', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY'
  };
  if (challengeIndex === 4 && roleIndex === 1) return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'CREATE', EXPECTED_SEMANTIC_ACTION: 'CREATE', EXPECTED_ACTION: 'CREATE', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CREATE_SHIFT', EXPECTED_AUTHORIZATION_CLASS: 'UNAUTHORIZED_CREATE', CONTRACT_SOURCE_CLASS: 'AUTHORIZATION_CONTRACT'
  };
  return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'LOCKED_M18_CONTRACT'
  };
};

const makeCase = (roleIndex, challengeIndex) => ({
  CASE_ID: `SYNTH-GOVERNED-${String(roleIndex * 7 + challengeIndex + 1).padStart(2, '0')}`,
  ROLE: roles[roleIndex], TENANT_CONTEXT_TYPE: roles[roleIndex], TURN_COUNT: challengeIndex === 3 ? 2 : 1,
  TURN_1: challengeIndex === 3 ? 'Bu ekran nasıl çalışıyor?' : 'Planlama Merkezi ekranının nasıl çalıştığını anlatır mısın?', TURN_2: challengeIndex === 3 ? 'synthetic-turn-2' : null, TURN_3: null,
  SURFACE_PRECONDITION: 'synthetic-surface', STATE_PRECONDITION: challengeIndex === 3 ? 'fresh valid wizard state' : 'synthetic-state', REFERENCE_PRECONDITION: challengeIndex === 3 ? 'VALID_CONTEXTUAL_REFERENCE' : 'ABSENT',
  CHALLENGE_CLASS: challenges[challengeIndex], EXECUTION_CONTEXT: {
    ...executionContextFor(roles[roleIndex]),
    ...(challengeIndex === 3 ? { continuationStateSeed: continuationStateFor(roles[roleIndex]) } : {}),
  }, ...expectedFor(roleIndex, challengeIndex),
  EXPECTED_USER_BEHAVIOR: 'synthetic behavior', PROHIBITED_OUTCOMES: 'synthetic prohibited outcome', CONTRACT_RATIONALE: 'synthetic contract rationale'
});

const candidate = {
  schemaVersion, manifestId: 'M18-SYNTHETIC-GOVERNED-EXECUTION', status: 'UNFROZEN_CANDIDATE', caseCount: 56,
  cases: roles.flatMap((_, roleIndex) => challenges.map((__, challengeIndex) => makeCase(roleIndex, challengeIndex))),
};
const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
const audit = {
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1', candidateSchemaVersion: schemaVersion,
  candidateManifestSha256: governanceSha256(candidateBytes), contractPacketSha256: governanceSha256(packetBytes),
  authorContextId: 'synthetic-author', auditorContextId: 'synthetic-auditor', caseCount: 56,
  expectationContractUnsafeCount: 0, expectationMaterialAmbiguityCount: 0, mixedIntentMaterialAmbiguityCount: 0,
  navigateViewAuditFailureCount: 0, contractAuditMaterialDefectCount: 0, roleCapabilityContradictionCount: 0,
  executionContextDefectCount: 0,
  explicitContextualSurfaceDefectCount: 0, referenceScopeCouplingDefectCount: 0, runtimeContextOracleLeakCount: 0,
  caseValidationComplete: true, auditComplete: true, auditTimestamp: '2026-10-05T12:00:00.000Z'
};
const freeze = freezeManifestIfEligible({ manifestBytes: candidateBytes, contractPacketBytes: packetBytes, audit });
assert.equal(freeze.safe, true, JSON.stringify(freeze));
const frozenBytes = freeze.frozenBytes;
const executionOrder = [candidate.cases[0].CASE_ID, candidate.cases[1].CASE_ID];
const receipt = createFreezeReceipt({ frozenManifestBytes: frozenBytes, contractPacketBytes: packetBytes, schemaVersion, executionOrder, freezeTimestamp: '2026-10-05T12:00:00.000Z', authorContextId: audit.authorContextId, auditorContextId: audit.auditorContextId });
const sharedProvenanceReceipt = createProvenanceReceipt({
  runStart: { manifest: { runId: 'synthetic-integration-run' }, manifestSha256: 'A'.repeat(64) },
  runEnd: { manifest: { runId: 'synthetic-integration-run' }, manifestSha256: 'A'.repeat(64) },
  runtimeBinding: { sourceManifestSha256: 'A'.repeat(64) },
  suiteResults: [{ businessWriteExecution: 0, externalLlmProviderCount: 0, runtimeFallbackCount: 0, downstreamSemanticRedecisionCount: 0, shadowSemanticAuthorityCount: 0 }],
  finalStatus: 'GREEN',
  capturedAt: '2026-10-05T12:00:00.000Z',
});

const failures = [];
const pendingChecks = [];
const check = (name, fn) => {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      pendingChecks.push(result.catch((error) => failures.push({ name, message: error?.message || String(error) })));
    }
  } catch (error) {
    failures.push({ name, message: error?.message || String(error) });
  }
};

check('valid governed candidate structurally validates', () => assert.equal(validateCandidateExpectations(candidate, packet).safe, true));
check('receipt is complete', () => assert.equal(validateFreezeReceipt({ frozenManifestBytes: frozenBytes, contractPacketBytes: packetBytes, receipt, expectedSchemaVersion: schemaVersion, expectedExecutionOrder: executionOrder }).safe, true));
check('missing receipt rejects', () => assert.equal(validateFreezeReceipt({ frozenManifestBytes: frozenBytes, contractPacketBytes: packetBytes, receipt: null, expectedSchemaVersion: schemaVersion, expectedExecutionOrder: executionOrder }).safe, false));
check('manifest hash mismatch rejects', () => assert.equal(validateFreezeReceipt({ frozenManifestBytes: Buffer.from(frozenBytes.toString().replace('FROZEN_NOT_EXECUTED', 'FROZEN_CHANGED')), contractPacketBytes: packetBytes, receipt, expectedSchemaVersion: schemaVersion, expectedExecutionOrder: executionOrder }).safe, false));
check('execution-order mismatch rejects', () => assert.equal(validateFreezeReceipt({ frozenManifestBytes: frozenBytes, contractPacketBytes: packetBytes, receipt, expectedSchemaVersion: schemaVersion, expectedExecutionOrder: [executionOrder[1], executionOrder[0]] }).safe, false));
check('contract hash mismatch rejects', () => assert.equal(validateFreezeReceipt({ frozenManifestBytes: frozenBytes, contractPacketBytes: Buffer.from(packetBytes.toString().replace('M18-HOLDOUT-CONTRACT-PACKET-V2', 'M18-HOLDOUT-CONTRACT-PACKET-V2-CHANGED')), receipt, expectedSchemaVersion: schemaVersion, expectedExecutionOrder: executionOrder }).safe, false));
check('unsupported schema rejects', () => assert.equal(validateFreezeReceipt({ frozenManifestBytes: frozenBytes, contractPacketBytes: packetBytes, receipt, expectedSchemaVersion: 'M18-UNSUPPORTED', expectedExecutionOrder: executionOrder }).safe, false));
check('non-frozen manifest rejects', () => assert.equal(validateFreezeReceipt({ frozenManifestBytes: candidateBytes, contractPacketBytes: packetBytes, receipt, expectedSchemaVersion: schemaVersion, expectedExecutionOrder: executionOrder }).safe, false));
check('canonical endpoint is fixed', () => assert.equal(CANONICAL_RUNTIME_ENDPOINT, '/api/ai/copilot'));
check('canonical authority is fixed', () => assert.equal(CANONICAL_LIVE_AUTHORITY_PATH, 'NEW_TYPED_EVIDENCE'));
check('adapter declares zero-write policy', () => assert.equal(BUSINESS_WRITE_POLICY, 'ZERO_WRITES'));
check('receipt schema is fixed', () => assert.equal(EXECUTION_RECEIPT_SCHEMA_VERSION, 'M18-HOLDOUT-EXECUTION-RECEIPT-V1'));
check('first-failure policy is fixed', () => assert.equal(FIRST_FAILURE_STOP_POLICY, 'STOP_AT_FIRST_MATERIAL_FAILURE'));
check('safe ordinary mismatch policy is explicit', () => assert.equal(SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY, 'COLLECT_SAFE_ORDINARY_MISMATCHES'));
check('safe collect-all protocol identity is explicit', () => assert.equal(SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID, 'M18-HOLDOUT-EXECUTION-PROTOCOL-V2-SAFE-ORDINARY-COLLECT-ALL'));
check('critical failures retain immediate stop policy', () => assert.equal(CRITICAL_FAILURE_STOP_POLICY, 'STOP_ON_SECURITY_OR_INTEGRITY_FAILURE'));
check('final executor forwards V2 binding options and probe', () => {
  assert.match(finalExecutorSource, /executionProtocolId: binding\.executionProtocolId/u);
  assert.match(finalExecutorSource, /ordinaryMismatchPolicy: binding\.ordinaryMismatchPolicy/u);
  assert.match(finalExecutorSource, /integrityProbe,/u);
});
check('final executor passes the effective runtime receipt projection', () => {
  assert.match(finalExecutorSource, /receipt: effectiveRuntimeReceipt/u);
});
check('final executor selects and validates a revision-2 binding before exposure', () => {
  assert.match(finalExecutorSource, /M18_V2_BINDING_REVISION/u);
  assert.match(finalExecutorSource, /v2-protocol-binding-s2-receipt\.json/u);
  assert.match(finalExecutorSource, /expectedBindingRevision: bindingRevision/u);
  assert.match(finalExecutorSource, /supersededBinding: previousBinding/u);
});

const syntheticBinding = createV2ProtocolBinding({
  acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
  frozenManifestBytes: frozenBytes,
  freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
  contractPacketBytes: packetBytes,
  sourceIdentity: 'A'.repeat(64),
  executorIdentity: 'B'.repeat(64),
  createdAt: '2026-10-05T12:00:00.000Z',
});
check('exact V2 binding validates without mutating the frozen inputs', () => {
  assert.equal(validateV2ProtocolBinding({
    binding: syntheticBinding,
    acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
    frozenManifestBytes: frozenBytes,
    freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
    contractPacketBytes: packetBytes,
    sourceIdentity: 'A'.repeat(64),
    executorIdentity: 'B'.repeat(64),
  }).safe, true);
});
check('missing V2 binding rejects before exposure', () => {
  assert.equal(validateV2ProtocolBinding({
    binding: null,
    acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
    frozenManifestBytes: frozenBytes,
    freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
    contractPacketBytes: packetBytes,
    sourceIdentity: 'A'.repeat(64),
    executorIdentity: 'B'.repeat(64),
  }).safe, false);
});
check('stale or conflicting V2 binding rejects before exposure', () => {
  const stale = { ...syntheticBinding, frozenManifestSha256: 'C'.repeat(64) };
  assert.equal(validateV2ProtocolBinding({
    binding: stale,
    acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
    frozenManifestBytes: frozenBytes,
    freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
    contractPacketBytes: packetBytes,
    sourceIdentity: 'A'.repeat(64),
    executorIdentity: 'B'.repeat(64),
  }).safe, false);
  const conflicting = { ...syntheticBinding, ordinaryMismatchPolicy: FIRST_FAILURE_STOP_POLICY };
  assert.equal(validateV2ProtocolBinding({
    binding: conflicting,
    acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
    frozenManifestBytes: frozenBytes,
    freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
    contractPacketBytes: packetBytes,
    sourceIdentity: 'A'.repeat(64),
    executorIdentity: 'B'.repeat(64),
  }).safe, false);
});
const syntheticBindingBytes = Buffer.from(`${JSON.stringify(syntheticBinding, null, 2)}\n`, 'utf8');
const syntheticSuccessorBinding = createV2ProtocolBinding({
  acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
  frozenManifestBytes: frozenBytes,
  freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
  contractPacketBytes: packetBytes,
  sourceIdentity: 'A'.repeat(64),
  executorIdentity: 'D'.repeat(64),
  bindingRevision: 2,
  supersedesBindingId: syntheticBinding.bindingId,
  supersedesBindingSha256: governanceSha256(syntheticBindingBytes),
  createdAt: '2026-10-09T12:00:00.000Z',
});
check('versioned successor binding preserves the previous binding immutably', () => {
  assert.equal(syntheticSuccessorBinding.bindingId, 'M18-SYNTHETIC-GOVERNED-EXECUTION-V2-BINDING-S2');
  const successorValidation = validateV2ProtocolBinding({
    binding: syntheticSuccessorBinding,
    acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
    frozenManifestBytes: frozenBytes,
    freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
    contractPacketBytes: packetBytes,
    sourceIdentity: 'A'.repeat(64),
    executorIdentity: 'D'.repeat(64),
    expectedBindingRevision: 2,
    supersededBinding: syntheticBinding,
    supersededBindingBytes: syntheticBindingBytes,
  });
  assert.equal(successorValidation.safe, true, JSON.stringify(successorValidation));
  assert.equal(validateV2ProtocolBinding({
    binding: syntheticBinding,
    acceptanceId: 'M18-SYNTHETIC-GOVERNED-EXECUTION',
    frozenManifestBytes: frozenBytes,
    freezeReceiptBytes: Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'),
    contractPacketBytes: packetBytes,
    sourceIdentity: 'A'.repeat(64),
    executorIdentity: 'B'.repeat(64),
  }).safe, true);
});
check('original freeze receipt remains valid under its original immutable contract', () => {
  assert.equal(validateFreezeReceipt({
    frozenManifestBytes: frozenBytes,
    contractPacketBytes: packetBytes,
    receipt,
    expectedSchemaVersion: schemaVersion,
    expectedExecutionOrder: executionOrder,
  }).safe, true);
});
check('validated V2 runtime projection satisfies adapter protocol checks without mutating freeze evidence', () => {
  const effectiveReceipt = createEffectiveRuntimeReceipt({ originalReceipt: receipt, binding: syntheticBinding });
  assert.equal(receipt.executionProtocolId, null);
  assert.equal(receipt.ordinaryMismatchPolicy, FIRST_FAILURE_STOP_POLICY);
  assert.equal(validateFreezeReceipt({
    frozenManifestBytes: frozenBytes,
    contractPacketBytes: packetBytes,
    receipt: effectiveReceipt,
    expectedSchemaVersion: schemaVersion,
    expectedExecutionOrder: executionOrder,
    expectedExecutionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
    expectedOrdinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  }).safe, true);
});
check('pre-dispatch failure preserves reason and all unexecuted cases', () => {
  const mapped = createGovernedExecutionReceipt({
    baseReceipt: { acceptanceId: 'SYNTHETIC-V2-BLOCKED' },
    result: {
      status: 'BLOCKED',
      failure: {
        failureReasons: ['RECEIPT_EXECUTION_PROTOCOL_ID_MISMATCH', 'RECEIPT_ORDINARY_MISMATCH_POLICY_MISMATCH'],
        failures: [
          { reason: 'RECEIPT_EXECUTION_PROTOCOL_ID_MISMATCH', field: 'executionProtocolId' },
          { reason: 'RECEIPT_ORDINARY_MISMATCH_POLICY_MISMATCH', field: 'ordinaryMismatchPolicy' },
        ],
      },
      executed: [],
      notRun: true,
      executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
      ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
    },
    executionOrderCount: 56,
    executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  });
  assert.equal(mapped.casesExposed, 0);
  assert.equal(mapped.casesExecuted, 0);
  assert.equal(mapped.casesUnexecuted, 56);
  assert.equal(mapped.criticalFailure.category, 'HARNESS_PREFLIGHT_BLOCK');
  assert.deepEqual(mapped.preExposureFailure.failureReasons, ['RECEIPT_EXECUTION_PROTOCOL_ID_MISMATCH', 'RECEIPT_ORDINARY_MISMATCH_POLICY_MISMATCH']);
});

check('critical failure receipt preserves a safe structured reason', () => {
  const receipt = createExecutionReceipt({
    baseReceipt: { acceptanceId: 'SYNTHETIC-RECEIPT' },
    result: {
      status: 'BLOCKED',
      criticalFailure: {
        index: 3,
        caseId: 'SYNTH-REFERENCE-03',
        role: 'ROOM',
        classification: 'HARNESS_DEFECT',
        reason: 'EXECUTION_FIXTURE_INVALID:FIXTURE_REGISTRY_MISSING',
        guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
        stage: 'PRE_EXPOSURE_PREFLIGHT',
        boundary: 'BEFORE_CASE_EXPOSURE',
      },
      exposedCount: 2,
      executedCount: 2,
      passCount: 2,
      failCount: 0,
      notRunCount: 1,
      executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
      businessWriteExecution: 0,
    },
  });
  assert.equal(receipt.criticalFailure.reasonCode, 'FIXTURE_REGISTRY_MISSING');
  assert.equal(receipt.criticalFailure.category, 'HARNESS_PREFLIGHT_BLOCK');
  assert.equal(receipt.criticalFailure.caseBoundary, 'BEFORE_CASE_EXPOSURE');
  assert.equal(receipt.securityEmergencyStop, false);
  assert.equal(receipt.integrityEmergencyStop, false);
  assert.equal(Object.hasOwn(receipt.criticalFailure, 'rawReason'), false);
});

check('execution receipt persistence is immutable', () => {
  const directory = mkdtempSync(join(tmpdir(), 'm18-receipt-'));
  try {
    const receiptPath = join(directory, 'execution-receipt.json');
    const receipt = createExecutionReceipt({
      baseReceipt: { acceptanceId: 'SYNTHETIC-RECEIPT' },
      result: {
        status: 'BLOCKED',
        criticalFailure: {
          index: 3,
          caseId: 'SYNTH-REFERENCE-03',
          role: 'ROOM',
          classification: 'HARNESS_DEFECT',
          reason: 'EXECUTION_FIXTURE_INVALID:FIXTURE_REGISTRY_MISSING',
          guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
          stage: 'PRE_EXPOSURE_PREFLIGHT',
          boundary: 'BEFORE_CASE_EXPOSURE',
        },
        executed: [],
        executedCount: 2,
        exposedCount: 2,
        passCount: 2,
        failCount: 0,
        notRunCount: 1,
        businessWriteExecution: 0,
      },
    });
    const written = writeExecutionReceipt({ receiptPath, receipt });
    assert.equal(written.written, true);
    assert.equal(existsSync(receiptPath), true);
    const persisted = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(persisted.criticalFailure.reasonCode, 'FIXTURE_REGISTRY_MISSING');
    assert.equal(persisted.criticalFailure.casesUnexecuted, 1);
    assert.throws(() => writeExecutionReceipt({ receiptPath, receipt }), /RECEIPT_ALREADY_EXISTS/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

check('execution receipt retains redacted per-case semantic evidence', () => {
  const manifestCase = {
    CASE_ID: 'SYNTH-EVIDENCE-01',
    ROLE: 'ROOM',
    TENANT_CONTEXT_TYPE: 'ROOM',
    EXECUTION_CONTEXT: { tenantContext: { type: 'ROOM' }, screen: { path: '/room/shifts' }, selectedEntity: null },
    CHALLENGE_CLASS: 'VIEW_OR_NAVIGATE',
    CONTRACT_SOURCE_CLASS: 'CONTRACT_DERIVED_STRUCTURAL_CASE',
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT',
    EXPECTED_REQUEST_MODE: 'VIEW',
    EXPECTED_SEMANTIC_ACTION: 'VIEW',
    EXPECTED_ACTION: 'VIEW',
    EXPECTED_OBJECT: 'SHIFT',
    EXPECTED_REFERENCE_CLASS: 'ABSENT',
    EXPECTED_RESOLUTION_STATUS: 'RESOLVED',
    EXPECTED_TASK_OR_TASK_FAMILY: 'VIEW_SHIFT',
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'VIEW_RECORD',
    EXPECTED_AUTHORIZATION_CLASS: 'ALLOW',
  };
  const rows = [{
    index: 1,
    caseId: manifestCase.CASE_ID,
    role: manifestCase.ROLE,
    status: 'FAIL',
    error: 'EXPECTED_CONTRACT_MISMATCH',
    failures: [{ field: 'requestMode', expected: 'VIEW', actual: 'NAVIGATE' }],
    turns: [{
      turnIndex: 1,
      rawInput: 'sensitive frozen prompt must not persist',
      actual: {
        semanticScope: 'PRODUCT_EXPLICIT',
        requestMode: 'NAVIGATE',
        semanticAction: 'NAVIGATE',
        action: 'NAVIGATE',
        object: 'SHIFT',
        reference: 'ABSENT',
        resolutionStatus: 'RESOLVED',
        task: 'VIEW_SHIFT',
        operation: 'NAVIGATE_RECORD',
        authorizationClass: 'ALLOW',
        authorizationNativeStatus: 'ALLOW',
        response: { secret: 'must not persist' },
      },
    }],
  }];
  const projection = createCaseEvidenceProjection({ executionRows: rows, manifestCases: [manifestCase] });
  assert.equal(projection.length, 1);
  assert.equal(projection[0].caseId, manifestCase.CASE_ID);
  assert.equal(projection[0].challengeClass, 'VIEW_OR_NAVIGATE');
  assert.equal(projection[0].tenantContextType, 'ROOM');
  assert.equal(projection[0].surfacePath, '/room/shifts');
  assert.equal(projection[0].selectedEntityPresent, false);
  assert.equal(projection[0].status, 'FAIL');
  assert.deepEqual(projection[0].expected.requestMode, 'VIEW');
  assert.deepEqual(projection[0].turns[0].actual.requestMode, 'NAVIGATE');
  assert.deepEqual(projection[0].mismatchFields, ['requestMode']);
  assert.equal(Object.hasOwn(projection[0].turns[0], 'rawInput'), false);
  assert.equal(Object.hasOwn(projection[0].turns[0].actual, 'response'), false);
  const receipt = createGovernedExecutionReceipt({
    baseReceipt: { acceptanceId: 'SYNTHETIC-EVIDENCE' },
    result: { status: 'RED', executed: rows, executedCount: 1, exposedCount: 1, passCount: 0, failCount: 1, notRunCount: 0, ordinaryMismatchCount: 1, businessWriteExecution: 0 },
    executionOrderCount: 1,
    manifestCases: [manifestCase],
    currentSourceContentIdentity: 'SOURCE-CONTENT-IDENTITY',
  });
  assert.deepEqual(receipt.perCaseEvidence, projection);
  assert.equal(receipt.currentSourceContentIdentity, 'SOURCE-CONTENT-IDENTITY');
});

check('pre-exposure adapter validation rejects missing fixtures before execution', () => {
  const selectedCase = {
    ...candidate.cases[2],
    CASE_ID: 'SYNTH-PREFLIGHT-REFERENCE-03',
    EXECUTION_CONTEXT: {
      ...candidate.cases[0].EXECUTION_CONTEXT,
      selectedEntity: { type: 'SHIFT', id: 123, tenantContextType: 'COMPANY' },
    },
  };
  const manifest = { cases: [candidate.cases[0], candidate.cases[1], selectedCase] };
  const order = manifest.cases.map((item) => item.CASE_ID);
  const missing = validateExecutionManifestPreflight(manifest, order, { fixtureRegistry: null });
  assert.equal(missing.safe, false);
  assert.equal(missing.failure.caseId, selectedCase.CASE_ID);
  assert.equal(missing.failure.reasonCode, 'FIXTURE_REGISTRY_MISSING');
  assert.equal(missing.failure.caseBoundary, 'BEFORE_CASE_EXPOSURE');
  const supplied = validateExecutionManifestPreflight(manifest, order, {
    fixtureRegistry: new Map([['SHIFT:123', { type: 'SHIFT', id: 123, exists: true, reachable: true }]]),
  });
  assert.equal(supplied.safe, true, JSON.stringify(supplied));
});

const syntheticRuntimeProof = { healthcheck: 'PASS', mode: 'NEW', authoritativePath: CANONICAL_LIVE_AUTHORITY_PATH, semanticAuthorityCount: 1, shadowSemanticAuthorityCount: 0, runtimeFallbackCount: 0, downstreamSemanticRedecisionCount: 0 };
const syntheticReferenceActual = {
  semanticPlan: {
    canonicalRequestEnvelope: {
      request: { semanticScope: { class: 'PRODUCT_EXPLICIT' }, typedEvidence: { requestMode: { value: 'EXPLAIN' } }, semanticAction: { actionClass: 'EXPLAIN', objectClass: 'SURFACE', resolutionStatus: 'RESOLVED' }, task: null, operation: 'EXPLAIN_CURRENT_SURFACE' },
      diagnostics: { semanticAuthority: { mode: 'NEW', authoritativePath: CANONICAL_LIVE_AUTHORITY_PATH, PER_REQUEST_SEMANTIC_AUTHORITY_COUNT: 1, SHADOW_SEMANTIC_AUTHORITY_COUNT: 0, RUNTIME_SEMANTIC_FALLBACK_COUNT: 0, DOWNSTREAM_SEMANTIC_REDECISION_COUNT: 0 } },
    },
    authorizationDecision: { status: 'ALLOW', authorizationStatus: 'AUTHORIZED' },
    counters: { observed: { businessWriteExecution: 0 } },
  },
};

check('valid third synthetic case is reachable after preflight', async () => {
  const selectedCase = {
    ...candidate.cases[2],
    CASE_ID: 'SYNTH-EXECUTION-REFERENCE-03',
    EXECUTION_CONTEXT: {
      ...candidate.cases[0].EXECUTION_CONTEXT,
      selectedEntity: { type: 'SHIFT', id: 123, tenantContextType: 'COMPANY' },
    },
  };
  const referenceCandidate = {
    ...candidate,
    manifestId: 'M18-SYNTHETIC-REFERENCE-EXECUTION',
    cases: candidate.cases.map((item, index) => index === 2 ? selectedCase : item),
  };
  const referenceBytes = Buffer.from(JSON.stringify(referenceCandidate, null, 2) + '\n', 'utf8');
  const referenceAudit = { ...audit, candidateManifestSha256: governanceSha256(referenceBytes) };
  const referenceFreeze = freezeManifestIfEligible({ manifestBytes: referenceBytes, contractPacketBytes: packetBytes, audit: referenceAudit });
  assert.equal(referenceFreeze.safe, true, JSON.stringify(referenceFreeze));
  const referenceOrder = [referenceCandidate.cases[0].CASE_ID, referenceCandidate.cases[1].CASE_ID, selectedCase.CASE_ID];
  const referenceReceipt = createFreezeReceipt({
    frozenManifestBytes: referenceFreeze.frozenBytes,
    contractPacketBytes: packetBytes,
    schemaVersion,
    executionOrder: referenceOrder,
    freezeTimestamp: '2026-10-05T12:00:00.000Z',
    authorContextId: audit.authorContextId,
    auditorContextId: audit.auditorContextId,
    executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
    ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
    criticalFailurePolicy: CRITICAL_FAILURE_STOP_POLICY,
  });
  let transportCount = 0;
  const run = await executeGovernedManifest({
    frozenManifestBytes: referenceFreeze.frozenBytes,
    contractPacketBytes: packetBytes,
    receipt: referenceReceipt,
    provenanceReceipt: sharedProvenanceReceipt.receipt,
    expectedSchemaVersion: schemaVersion,
    executionOrder: referenceOrder,
    runtimeProof: syntheticRuntimeProof,
    executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
    ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
    integrityProbe: async () => ({ safe: true }),
    fixtureRegistry: new Map([['SHIFT:123', { type: 'SHIFT', id: 123, exists: true, reachable: true }]]),
    sessionFactory: async (_role, caseId) => ({ id: `reference-${caseId}`, token: 'synthetic-token' }),
    transport: async () => { transportCount += 1; return { status: 200, body: syntheticReferenceActual }; },
    compare: (expected, actual, contract) => compareExpectedContract(expected, actual, contract),
    contractPacket: packet,
  });
  assert.equal(run.status, 'GREEN', JSON.stringify(run));
  assert.equal(run.executedCount, 3, JSON.stringify(run));
  assert.equal(run.exposedCount, 3, JSON.stringify(run));
  assert.equal(transportCount, 3);
});

let transportCalls = 0;
const runtimeProof = { healthcheck: 'PASS', mode: 'NEW', authoritativePath: CANONICAL_LIVE_AUTHORITY_PATH, semanticAuthorityCount: 1, shadowSemanticAuthorityCount: 0, runtimeFallbackCount: 0, downstreamSemanticRedecisionCount: 0 };
const syntheticActual = ({ wrong = false, write = false } = {}) => ({
  semanticPlan: {
    canonicalRequestEnvelope: {
      request: { semanticScope: { class: 'PRODUCT_EXPLICIT' }, typedEvidence: { requestMode: { value: 'EXPLAIN' } }, semanticAction: { actionClass: wrong ? 'VIEW' : 'EXPLAIN', objectClass: 'SURFACE', resolutionStatus: 'RESOLVED' }, task: null, operation: 'EXPLAIN_CURRENT_SURFACE' },
      diagnostics: { semanticAuthority: { mode: 'NEW', authoritativePath: CANONICAL_LIVE_AUTHORITY_PATH, PER_REQUEST_SEMANTIC_AUTHORITY_COUNT: 1, SHADOW_SEMANTIC_AUTHORITY_COUNT: 0, RUNTIME_SEMANTIC_FALLBACK_COUNT: 0, DOWNSTREAM_SEMANTIC_REDECISION_COUNT: 0 } },
    },
    authorizationDecision: { status: 'ALLOW', authorizationStatus: 'AUTHORIZED' },
    counters: { observed: { businessWriteExecution: write ? 1 : 0 } },
  }
});
const syntheticRun = await executeGovernedManifest({
  frozenManifestBytes: frozenBytes, contractPacketBytes: packetBytes, receipt, provenanceReceipt: sharedProvenanceReceipt.receipt, expectedSchemaVersion: schemaVersion, executionOrder, runtimeProof,
  sessionFactory: async (role, caseId) => ({ id: `${role}-${caseId}-${transportCalls + 1}`, token: 'synthetic-token' }),
  transport: async () => ({ status: 200, body: syntheticActual({ wrong: ++transportCalls === 2 }) }),
  compare: (expected, actual, contract) => compareExpectedContract(expected, actual, contract),
  contractPacket: packet,
});
check('synthetic execution stops at first material failure', () => { assert.equal(syntheticRun.status, 'RED', JSON.stringify(syntheticRun)); assert.equal(syntheticRun.executedCount, 2, JSON.stringify(syntheticRun)); assert.equal(syntheticRun.failCount, 1, JSON.stringify(syntheticRun)); assert.equal(syntheticRun.notRunCount, 0, JSON.stringify(syntheticRun)); });

const collectExecutionOrder = [candidate.cases[0].CASE_ID, candidate.cases[1].CASE_ID, candidate.cases[7].CASE_ID, candidate.cases[8].CASE_ID];
const collectReceipt = createFreezeReceipt({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  schemaVersion,
  executionOrder: collectExecutionOrder,
  freezeTimestamp: '2026-10-05T12:00:00.000Z',
  authorContextId: audit.authorContextId,
  auditorContextId: audit.auditorContextId,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  criticalFailurePolicy: CRITICAL_FAILURE_STOP_POLICY,
});
const collectMismatchIds = new Set([candidate.cases[1].CASE_ID, candidate.cases[7].CASE_ID]);
let collectTransportCalls = 0;
let collectSessionCalls = 0;
const collectRun = await executeGovernedManifest({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  receipt: collectReceipt,
  provenanceReceipt: sharedProvenanceReceipt.receipt,
  expectedSchemaVersion: schemaVersion,
  executionOrder: collectExecutionOrder,
  runtimeProof,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  integrityProbe: async () => ({ safe: true }),
  sessionFactory: async (role, caseId) => ({ id: `collect-${++collectSessionCalls}-${role}-${caseId}`, token: 'synthetic-token' }),
  transport: async ({ item }) => {
    collectTransportCalls += 1;
    return { status: 200, body: syntheticActual({ wrong: collectMismatchIds.has(item.caseId) }) };
  },
  compare: (expected, actual, contract) => compareExpectedContract(expected, actual, contract),
  contractPacket: packet,
});
check('ordinary mismatch collection continues safely', () => {
  assert.equal(collectRun.status, 'RED', JSON.stringify(collectRun));
  assert.equal(collectRun.executedCount, 4, JSON.stringify(collectRun));
  assert.equal(collectRun.passCount, 2, JSON.stringify(collectRun));
  assert.equal(collectRun.failCount, 2, JSON.stringify(collectRun));
  assert.equal(collectRun.ordinaryMismatchCount, 2, JSON.stringify(collectRun));
  assert.equal(collectRun.notRunCount, 0, JSON.stringify(collectRun));
  assert.equal(collectRun.safetyStopped, false, JSON.stringify(collectRun));
  assert.equal(collectTransportCalls, 4);
  assert.equal(collectSessionCalls, 4);
});

const continuationCase = candidate.cases[3];
const continuationOrder = [continuationCase.CASE_ID];
const continuationReceipt = createFreezeReceipt({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  schemaVersion,
  executionOrder: continuationOrder,
  freezeTimestamp: '2026-10-05T12:00:00.000Z',
  authorContextId: audit.authorContextId,
  auditorContextId: audit.auditorContextId,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  criticalFailurePolicy: CRITICAL_FAILURE_STOP_POLICY,
});
const continuationStates = [];
const continuationActual = (turnIndex) => turnIndex === 1
  ? {
    semanticPlan: {
      canonicalRequestEnvelope: {
        request: { semanticScope: { class: 'PRODUCT_CONTEXTUAL' }, typedEvidence: { requestMode: { value: 'CONTINUE' }, reference: { value: 'VALID_CONTEXTUAL_REFERENCE' } }, semanticAction: { actionClass: 'NEXT', objectClass: 'SURFACE', resolutionStatus: 'RESOLVED' }, task: 'CONTINUE_CURRENT_REASONING', operation: 'CONTINUE_EXPLANATION' },
        diagnostics: { semanticAuthority: { mode: 'NEW', authoritativePath: CANONICAL_LIVE_AUTHORITY_PATH, PER_REQUEST_SEMANTIC_AUTHORITY_COUNT: 1, SHADOW_SEMANTIC_AUTHORITY_COUNT: 0, RUNTIME_SEMANTIC_FALLBACK_COUNT: 0, DOWNSTREAM_SEMANTIC_REDECISION_COUNT: 0 } },
      },
      authorizationDecision: { status: 'ALLOW', authorizationStatus: 'AUTHORIZED' },
      counters: { observed: { businessWriteExecution: 0 } },
    },
  }
  : { ...syntheticActual(), conversationState: { schemaVersion: 'synthetic-conversation-state' } };
const continuationRun = await executeGovernedManifest({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  receipt: continuationReceipt,
  provenanceReceipt: sharedProvenanceReceipt.receipt,
  expectedSchemaVersion: schemaVersion,
  executionOrder: continuationOrder,
  runtimeProof,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  integrityProbe: async () => ({ safe: true }),
  sessionFactory: async () => ({ id: `continuation-${Date.now()}`, token: 'synthetic-token' }),
  transport: async (request) => { continuationStates.push(request.conversationState); return { status: 200, body: continuationActual(continuationStates.length - 1) }; },
  compare: (expected, actual, contract) => compareExpectedContract(expected, actual, contract),
  contractPacket: packet,
});
check('multi-turn state is preserved inside one case', () => {
  assert.equal(continuationRun.status, 'GREEN', JSON.stringify(continuationRun));
  assert.equal(continuationRun.executedCount, 1, JSON.stringify(continuationRun));
  assert.equal(continuationStates.length, 2);
  assert.equal(continuationStates[0], null);
  assert.deepEqual(continuationStates[1], { schemaVersion: 'synthetic-conversation-state' });
});

let criticalTransportCalls = 0;
const criticalOrder = collectExecutionOrder.slice(0, 3);
const criticalReceipt = createFreezeReceipt({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  schemaVersion,
  executionOrder: criticalOrder,
  freezeTimestamp: '2026-10-05T12:00:00.000Z',
  authorContextId: audit.authorContextId,
  auditorContextId: audit.auditorContextId,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  criticalFailurePolicy: CRITICAL_FAILURE_STOP_POLICY,
});
const criticalWriteRun = await executeGovernedManifest({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  receipt: criticalReceipt,
  provenanceReceipt: sharedProvenanceReceipt.receipt,
  expectedSchemaVersion: schemaVersion,
  executionOrder: criticalOrder,
  runtimeProof,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  integrityProbe: async () => ({ safe: true }),
  sessionFactory: async (_role, caseId) => ({ id: `critical-${caseId}`, token: 'synthetic-token' }),
  transport: async () => ({ status: 200, body: syntheticActual({ write: ++criticalTransportCalls === 1 }) }),
  compare: (expected, actual, contract) => compareExpectedContract(expected, actual, contract),
  contractPacket: packet,
});
check('business write stops the complete run immediately', () => {
  assert.equal(criticalWriteRun.status, 'BLOCKED', JSON.stringify(criticalWriteRun));
  assert.equal(criticalWriteRun.executedCount, 1, JSON.stringify(criticalWriteRun));
  assert.equal(criticalWriteRun.notRunCount, 2, JSON.stringify(criticalWriteRun));
  assert.equal(criticalWriteRun.businessWriteExecution, 1, JSON.stringify(criticalWriteRun));
  assert.equal(criticalTransportCalls, 1);
});

const invalidRuntimeRun = await executeGovernedManifest({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  receipt,
  provenanceReceipt: sharedProvenanceReceipt.receipt,
  expectedSchemaVersion: schemaVersion,
  executionOrder,
  runtimeProof: { ...runtimeProof, runtimeFallbackCount: 1 },
  sessionFactory: async () => ({ id: 'unreachable', token: 'synthetic-token' }),
  transport: async () => ({ status: 200, body: syntheticActual() }),
  compare: (expected, actual, contract) => compareExpectedContract(expected, actual, contract),
  contractPacket: packet,
});
check('invalid runtime identity blocks before exposure', () => { assert.equal(invalidRuntimeRun.status, 'BLOCKED', JSON.stringify(invalidRuntimeRun)); assert.equal(invalidRuntimeRun.executed.length, 0); });

await Promise.all(pendingChecks);

console.log(JSON.stringify({
  status: failures.length ? 'RED' : 'GREEN', EXECUTION_INTEGRATION_TEST_COUNT: 34,
  SYNTHETIC_GOVERNED_EXECUTION_PIPELINE: failures.length ? 'RED' : 'GREEN',
  FIRST_FAILURE_STOP_SYNTHETIC_PROVEN: syntheticRun.status === 'RED' && syntheticRun.executedCount === 2 ? 'YES' : 'NO',
  SAFE_ORDINARY_MISMATCH_COLLECTION_PROVEN: collectRun.status === 'RED' && collectRun.notRunCount === 0 && collectRun.safetyStopped === false ? 'YES' : 'NO',
  CRITICAL_SECURITY_STOP_PROVEN: criticalWriteRun.status === 'BLOCKED' && criticalWriteRun.notRunCount === 2 ? 'YES' : 'NO',
  MULTITURN_ISOLATION_PROVEN: continuationRun.status === 'GREEN' && continuationStates[1] ? 'YES' : 'NO',
  INVALID_RUNTIME_STOP_PROVEN: invalidRuntimeRun.status === 'BLOCKED' ? 'YES' : 'NO',
  SYNTHETIC_SESSION_ISOLATION_PROVEN: [...syntheticRun.executed, ...collectRun.executed, ...continuationRun.executed].every((row) => row.sessionIsolationProven) ? 'YES' : 'NO', failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
