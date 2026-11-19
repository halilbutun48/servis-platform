import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { validateExecutionContext } from './m18HoldoutGovernance.mjs';
import { verifyProvenanceReceipt } from './m18RunScopedProvenance.mjs';
import { validateFixtureReference, HARNESS_SEMANTIC_AUTHORITY_COUNT } from './m18ExecutionFixturePreconditions.mjs';

export const CANONICAL_RUNTIME_ENDPOINT = '/api/ai/copilot';
export const CANONICAL_LIVE_AUTHORITY_PATH = 'NEW_TYPED_EVIDENCE';
export const EXECUTION_RECEIPT_SCHEMA_VERSION = 'M18-HOLDOUT-EXECUTION-RECEIPT-V1';
export const FIRST_FAILURE_STOP_POLICY = 'STOP_AT_FIRST_MATERIAL_FAILURE';
export const SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY = 'COLLECT_SAFE_ORDINARY_MISMATCHES';
export const SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID = 'M18-HOLDOUT-EXECUTION-PROTOCOL-V2-SAFE-ORDINARY-COLLECT-ALL';
export const CRITICAL_FAILURE_STOP_POLICY = 'STOP_ON_SECURITY_OR_INTEGRITY_FAILURE';
export const BUSINESS_WRITE_POLICY = 'ZERO_WRITES';
export const EXECUTION_ADAPTER_SEMANTIC_AUTHORITY_COUNT = 0;
export { HARNESS_SEMANTIC_AUTHORITY_COUNT };

const HASH_PATTERN = /^[0-9A-F]{64}$/u;
const DEFAULT_ROLE_CREDENTIALS = Object.freeze({
  COMPANY: 'company@demo.com',
  ROOM: 'room@demo.com',
  SCHOOL: 'school@demo.com',
  ORGANIZATION: 'organization@demo.com',
  DRIVER: 'driver@demo.com',
  PERSONEL: 'personel@demo.com',
  PARENT: 'parent@demo.com',
  SUPER_ADMIN: 'superadmin@demo.com',
});

const DEFAULT_ROLE_DEVICE_IDS = Object.freeze({
  DRIVER: 'web-vos7tyh6mtpo1gze',
});

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function orderHash(order) {
  return sha256(Buffer.from(order.join('\n'), 'utf8'));
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseManifest(bytes) {
  return JSON.parse(asBuffer(bytes).toString('utf8'));
}

const SAFE_CRITICAL_REASON_CODES = new Set([
  'CASE_NOT_IN_MANIFEST',
  'TURN_COUNT_MISMATCH',
  'EXECUTION_CONTEXT_INVALID',
  'EXECUTION_FIXTURE_INVALID',
  'FIXTURE_REGISTRY_MISSING',
  'FIXTURE_NOT_FOUND',
  'FIXTURE_REFERENCE_MISMATCH',
  'FIXTURE_NOT_REACHABLE',
  'SESSION_ISOLATION_FAILED',
  'EXECUTION_INTEGRITY_PROBE_FAILED',
  'EXECUTION_INTEGRITY_GUARD_FAILED',
  'CASE_AUTHORITY_PROOF_FAILED',
  'BUSINESS_WRITE_EXECUTION_NONZERO',
  'CANONICAL_RUNTIME_STATUS',
  'CONTINUATION_STATE_MISSING',
  'HARNESS_REQUEST_CONSTRUCTION_DEFECT',
  'LOGIN_FAILED',
  'SESSION_REFRESH_FAILED',
  'RUNTIME_PROVENANCE_INVALID',
  'PROVENANCE_INVALID',
  'UNKNOWN_CRITICAL_FAILURE',
]);

function safeReasonCode(value) {
  const text = String(value || '').toUpperCase();
  const tokens = text.split(/[:;,\s]+/u).filter(Boolean);
  return [...tokens].reverse().find((token) => SAFE_CRITICAL_REASON_CODES.has(token))
    || tokens.find((token) => SAFE_CRITICAL_REASON_CODES.has(token))
    || 'UNKNOWN_CRITICAL_FAILURE';
}

function safeClassification(value) {
  const classification = String(value || '').toUpperCase();
  return /^[A-Z][A-Z0-9_]{1,63}$/u.test(classification) ? classification : 'OTHER_CRITICAL_OR_UNKNOWN';
}

function criticalCategoryFor({ classification, reasonCode, guardId } = {}) {
  const normalizedClassification = safeClassification(classification);
  const normalizedReasonCode = safeReasonCode(reasonCode);
  const normalizedGuardId = String(guardId || '').toUpperCase();
  if (normalizedClassification === 'SECURITY_FAILURE' || normalizedReasonCode === 'BUSINESS_WRITE_EXECUTION_NONZERO') return 'SECURITY_FAILURE';
  if (normalizedClassification === 'RUNTIME_ENVIRONMENT_BLOCK' || normalizedReasonCode === 'CANONICAL_RUNTIME_STATUS' || normalizedReasonCode === 'RUNTIME_PROVENANCE_INVALID' || normalizedReasonCode === 'PROVENANCE_INVALID' || normalizedReasonCode === 'LOGIN_FAILED' || normalizedReasonCode === 'SESSION_REFRESH_FAILED') return 'RUNTIME_ENVIRONMENT_BLOCK';
  if (normalizedClassification === 'INTEGRITY_FAILURE' || normalizedClassification === 'HARNESS_OR_INTEGRITY_FAILURE' || normalizedReasonCode.startsWith('EXECUTION_INTEGRITY') || normalizedReasonCode === 'SESSION_ISOLATION_FAILED' || normalizedGuardId === 'CASE_ISOLATION') return 'INTEGRITY_FAILURE';
  if (normalizedClassification === 'HARNESS_DEFECT' || normalizedGuardId === 'PREEXPOSURE_ADAPTER_COMPATIBILITY' || normalizedReasonCode.startsWith('EXECUTION_') || normalizedReasonCode === 'HARNESS_REQUEST_CONSTRUCTION_DEFECT' || normalizedReasonCode === 'TURN_COUNT_MISMATCH' || normalizedReasonCode === 'CASE_NOT_IN_MANIFEST') return 'HARNESS_PREFLIGHT_BLOCK';
  return 'OTHER_CRITICAL_OR_UNKNOWN';
}

function guardIdForFailure({ reasonCode, guardId, classification } = {}) {
  if (nonEmptyString(guardId) && /^[A-Z][A-Z0-9_]{1,63}$/u.test(guardId)) return guardId;
  const normalizedReasonCode = safeReasonCode(reasonCode);
  if (normalizedReasonCode.startsWith('EXECUTION_') || normalizedReasonCode === 'TURN_COUNT_MISMATCH' || normalizedReasonCode === 'CASE_NOT_IN_MANIFEST') return 'PREEXPOSURE_ADAPTER_COMPATIBILITY';
  if (normalizedReasonCode === 'SESSION_ISOLATION_FAILED') return 'CASE_ISOLATION';
  if (normalizedReasonCode.startsWith('BUSINESS_WRITE')) return 'BUSINESS_WRITE_GUARD';
  if (String(classification || '').toUpperCase().includes('INTEGRITY')) return 'EXECUTION_INTEGRITY_PROBE';
  return 'UNKNOWN_CRITICAL_GUARD';
}

function stageForFailure({ stage, guardId } = {}) {
  if (nonEmptyString(stage) && /^[A-Z][A-Z0-9_]{1,63}$/u.test(stage)) return stage;
  return guardId === 'PREEXPOSURE_ADAPTER_COMPATIBILITY' ? 'PRE_EXPOSURE_PREFLIGHT' : 'CASE_EXECUTION';
}

function boundaryForFailure({ boundary, guardId } = {}) {
  if (nonEmptyString(boundary) && /^[A-Z][A-Z0-9_]{1,63}$/u.test(boundary)) return boundary;
  return guardId === 'PREEXPOSURE_ADAPTER_COMPATIBILITY' ? 'BEFORE_CASE_EXPOSURE' : 'AFTER_CASE_EXPOSURE';
}

function safeCaseId(value) {
  return nonEmptyString(value) && /^[A-Za-z0-9_.:-]{1,160}$/u.test(value) ? value : null;
}

function serializeCriticalFailure(failure, result, executionProtocolId) {
  if (!failure) return null;
  const reasonCode = safeReasonCode(failure.reasonCode || failure.reason);
  const guardId = guardIdForFailure({ reasonCode, guardId: failure.guardId, classification: failure.classification });
  return {
    index: Number.isInteger(failure.index) ? failure.index : null,
    caseId: safeCaseId(failure.caseId),
    role: nonEmptyString(failure.role) && /^[A-Z][A-Z0-9_]{1,31}$/u.test(failure.role) ? failure.role : null,
    classification: safeClassification(failure.classification),
    category: criticalCategoryFor({ classification: failure.classification, reasonCode, guardId }),
    reasonCode,
    guardId,
    stage: stageForFailure({ stage: failure.stage, guardId }),
    caseBoundary: boundaryForFailure({ boundary: failure.boundary || failure.caseBoundary, guardId }),
    casesExposed: Number(result?.exposedCount ?? result?.executedCount ?? 0),
    casesExecuted: Number(result?.executedCount ?? 0),
    casesPassed: Number(result?.passCount ?? 0),
    casesFailed: Number(result?.failCount ?? 0),
    casesUnexecuted: Number(result?.notRunCount ?? 0),
    executionProtocolId: result?.executionProtocolId || executionProtocolId || null,
  };
}

export function createExecutionReceipt({
  baseReceipt = {},
  result = {},
  executionProtocolId = null,
  currentSourceManifest = null,
  currentSourceContentIdentity = null,
} = {}) {
  const criticalFailure = serializeCriticalFailure(result.criticalFailure, result, executionProtocolId);
  const receipt = {
    ...baseReceipt,
    casesExposed: Number(result.exposedCount ?? result.executedCount ?? 0),
    casesExecuted: Number(result.executedCount ?? 0),
    casesPassed: Number(result.passCount ?? 0),
    casesFailed: Number(result.failCount ?? 0),
    casesUnexecuted: Number(result.notRunCount ?? 0),
    ordinaryMismatchesCollected: Number(result.ordinaryMismatchCount ?? 0),
    executionStatus: result.status ?? null,
    executionProtocolId: result.executionProtocolId || executionProtocolId || baseReceipt.executionProtocolId || null,
    businessWriteExecution: Number(result.businessWriteExecution ?? baseReceipt.businessWriteExecution ?? 0),
    criticalFailure,
    securityEmergencyStop: criticalFailure?.category === 'SECURITY_FAILURE',
    integrityEmergencyStop: criticalFailure?.category === 'INTEGRITY_FAILURE',
  };
  if (currentSourceManifest !== null) receipt.currentSourceManifest = currentSourceManifest;
  if (currentSourceContentIdentity !== null) receipt.currentSourceContentIdentity = currentSourceContentIdentity;
  return receipt;
}

export function writeExecutionReceipt({ receiptPath, receipt } = {}) {
  if (!nonEmptyString(receiptPath)) throw new Error('RECEIPT_PATH_MISSING');
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw new Error('RECEIPT_INVALID');
  const bytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  try {
    writeFileSync(receiptPath, bytes, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error('RECEIPT_ALREADY_EXISTS');
    throw error;
  }
  return { written: true, receiptSha256: sha256(bytes), receiptPath };
}

export function validateCanonicalRuntimeRequest({ endpoint, session, item, message } = {}) {
  const failures = [];
  if (endpoint !== CANONICAL_RUNTIME_ENDPOINT) failures.push('CANONICAL_ENDPOINT_INVALID');
  if (!session || !nonEmptyString(session.token)) failures.push('SESSION_AUTH_TOKEN_MISSING');
  if (!item || !nonEmptyString(item.role)) failures.push('RUNTIME_ROLE_MISSING');
  if (!nonEmptyString(message)) failures.push('RUNTIME_MESSAGE_MISSING');
  if (item?.screenContext !== null) {
    const screen = item?.screenContext;
    if (!screen || typeof screen !== 'object' || Array.isArray(screen)) failures.push('SCREEN_CONTEXT_SHAPE_INVALID');
    else {
      if (!Number.isInteger(screen.id) || screen.id <= 0) failures.push('SCREEN_CONTEXT_ID_INVALID');
      if (!nonEmptyString(screen.path) || !screen.path.startsWith('/')) failures.push('SCREEN_CONTEXT_PATH_INVALID');
      if (!nonEmptyString(screen.label)) failures.push('SCREEN_CONTEXT_LABEL_INVALID');
      if (!nonEmptyString(screen.role)) failures.push('SCREEN_CONTEXT_ROLE_INVALID');
      if (screen.selectedEntityType !== undefined && !nonEmptyString(screen.selectedEntityType)) failures.push('SELECTED_ENTITY_TYPE_INVALID');
      if (screen.selectedEntityId !== undefined && (!Number.isInteger(screen.selectedEntityId) || screen.selectedEntityId <= 0)) failures.push('SELECTED_ENTITY_ID_INVALID');
    }
  }
  return { safe: failures.length === 0, failureReasons: [...new Set(failures)] };
}

export function createFreezeReceipt({
  frozenManifestBytes,
  contractPacketBytes,
  schemaVersion,
  executionOrder,
  freezeTimestamp = new Date().toISOString(),
  authorContextId,
  auditorContextId,
  provenanceReceiptSha256 = null,
  executionProtocolId = null,
  ordinaryMismatchPolicy = FIRST_FAILURE_STOP_POLICY,
  criticalFailurePolicy = CRITICAL_FAILURE_STOP_POLICY,
} = {}) {
  const manifestBytes = asBuffer(frozenManifestBytes);
  const packetBytes = asBuffer(contractPacketBytes);
  const manifest = parseManifest(manifestBytes);
  const order = Array.isArray(executionOrder) && executionOrder.length
    ? [...executionOrder]
    : Array.isArray(manifest.frozenExecutionOrder) && manifest.frozenExecutionOrder.length
      ? [...manifest.frozenExecutionOrder]
      : (manifest.cases || []).map((item) => item.CASE_ID);
  return {
    receiptSchemaVersion: EXECUTION_RECEIPT_SCHEMA_VERSION,
    manifestSha256: sha256(manifestBytes),
    candidateManifestSha256: manifest.candidateManifestSha256 || null,
    contractPacketSha256: sha256(packetBytes),
    schemaVersion: schemaVersion || manifest.schemaVersion || null,
    executionOrderSha256: orderHash(order),
    executionOrder: order,
    freezeTimestamp,
    caseCount: order.length,
    authorContextId: authorContextId || null,
    auditorContextId: auditorContextId || null,
    provenanceReceiptSha256: provenanceReceiptSha256 || null,
    executionProtocolId: executionProtocolId || null,
    ordinaryMismatchPolicy,
    criticalFailurePolicy,
    executionAuthority: {
      endpoint: CANONICAL_RUNTIME_ENDPOINT,
      liveProvenanceMode: 'NEW',
      liveAuthoritativePath: CANONICAL_LIVE_AUTHORITY_PATH,
      semanticAuthorityCount: 1,
      shadowSemanticAuthorityCount: 0,
      runtimeFallbackCount: 0,
      downstreamSemanticRedecisionCount: 0,
    },
    businessWriteExecution: 0,
  };
}

export function validateFreezeReceipt({
  frozenManifestBytes,
  contractPacketBytes,
  receipt,
  expectedSchemaVersion,
  expectedExecutionOrder,
  expectedExecutionProtocolId = null,
  expectedOrdinaryMismatchPolicy = null,
} = {}) {
  const failures = [];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return { safe: false, failureReasons: ['MISSING_FREEZE_RECEIPT'], failures: [{ reason: 'MISSING_FREEZE_RECEIPT' }] };
  let manifest;
  try { manifest = parseManifest(frozenManifestBytes); } catch { failures.push({ reason: 'FROZEN_MANIFEST_NOT_JSON' }); }
  const manifestHash = sha256(asBuffer(frozenManifestBytes));
  const packetHash = sha256(asBuffer(contractPacketBytes));
  const order = Array.isArray(expectedExecutionOrder) ? expectedExecutionOrder : (manifest?.frozenExecutionOrder || manifest?.cases || []).map((item) => item.CASE_ID);
  const checks = [
    ['receiptSchemaVersion', receipt.receiptSchemaVersion, EXECUTION_RECEIPT_SCHEMA_VERSION],
    ['manifestSha256', receipt.manifestSha256, manifestHash],
    ['contractPacketSha256', receipt.contractPacketSha256, packetHash],
    ['schemaVersion', receipt.schemaVersion, expectedSchemaVersion],
    ['executionOrderSha256', receipt.executionOrderSha256, orderHash(order)],
    ['caseCount', receipt.caseCount, order.length],
  ];
  for (const [field, actual, expected] of checks) if (actual !== expected) failures.push({ reason: `RECEIPT_${field.toUpperCase()}_MISMATCH`, field, actual, expected });
  if (expectedExecutionProtocolId !== null && receipt.executionProtocolId !== expectedExecutionProtocolId) {
    failures.push({ reason: 'RECEIPT_EXECUTION_PROTOCOL_ID_MISMATCH', field: 'executionProtocolId', actual: receipt.executionProtocolId, expected: expectedExecutionProtocolId });
  }
  if (expectedOrdinaryMismatchPolicy !== null && receipt.ordinaryMismatchPolicy !== expectedOrdinaryMismatchPolicy) {
    failures.push({ reason: 'RECEIPT_ORDINARY_MISMATCH_POLICY_MISMATCH', field: 'ordinaryMismatchPolicy', actual: receipt.ordinaryMismatchPolicy, expected: expectedOrdinaryMismatchPolicy });
  }
  if (!HASH_PATTERN.test(String(receipt.manifestSha256 || ''))) failures.push({ reason: 'RECEIPT_MANIFEST_HASH_INVALID' });
  if (!HASH_PATTERN.test(String(receipt.contractPacketSha256 || ''))) failures.push({ reason: 'RECEIPT_CONTRACT_HASH_INVALID' });
  if (!nonEmptyString(receipt.freezeTimestamp)) failures.push({ reason: 'RECEIPT_FREEZE_TIMESTAMP_MISSING' });
  if (!nonEmptyString(receipt.authorContextId)) failures.push({ reason: 'RECEIPT_AUTHOR_CONTEXT_MISSING' });
  if (!nonEmptyString(receipt.auditorContextId)) failures.push({ reason: 'RECEIPT_AUDITOR_CONTEXT_MISSING' });
  if (receipt.authorContextId === receipt.auditorContextId) failures.push({ reason: 'RECEIPT_AUTHOR_AUDITOR_NOT_INDEPENDENT' });
  if (manifest?.status !== 'FROZEN_NOT_EXECUTED') failures.push({ reason: 'MANIFEST_NOT_FROZEN' });
  if (receipt.executionAuthority?.endpoint !== CANONICAL_RUNTIME_ENDPOINT) failures.push({ reason: 'RECEIPT_ENDPOINT_INVALID' });
  if (receipt.executionAuthority?.liveAuthoritativePath !== CANONICAL_LIVE_AUTHORITY_PATH) failures.push({ reason: 'RECEIPT_AUTHORITY_PATH_INVALID' });
  if (receipt.businessWriteExecution !== 0) failures.push({ reason: 'RECEIPT_BUSINESS_WRITE_POLICY_INVALID' });
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((item) => item.reason))], failures };
}

export function validateSharedProvenanceReceipt(provenanceReceipt) {
  const receipt = provenanceReceipt?.receipt || provenanceReceipt;
  const verification = verifyProvenanceReceipt({
    receiptBytes: receipt,
    expectedRunId: receipt?.runId,
    expectedStartSha256: receipt?.startManifestSha256,
    expectedEndSha256: receipt?.endManifestSha256,
  });
  const finalStatusValid = ['GREEN', 'PASS'].includes(String(receipt?.finalStatus || '').toUpperCase());
  const failureReasons = [
    ...(verification.failureReasons || []),
    ...(finalStatusValid ? [] : ['PROVENANCE_RECEIPT_NOT_GREEN']),
  ];
  return {
    safe: verification.safe && finalStatusValid,
    failureReasons: [...new Set(failureReasons)],
    receipt,
  };
}

export function adaptGovernedCase(testCase, { fixtureRegistry = null } = {}) {
  if (!testCase || typeof testCase !== 'object') throw new Error('CASE_NOT_OBJECT');
  const turns = [testCase.TURN_1, testCase.TURN_2, testCase.TURN_3].slice(0, Number(testCase.TURN_COUNT)).filter((value) => value !== null && value !== undefined);
  if (turns.length !== Number(testCase.TURN_COUNT)) throw new Error(`TURN_COUNT_MISMATCH:${testCase.CASE_ID}`);
  const executionContextValidation = validateExecutionContext(testCase.EXECUTION_CONTEXT, {
    role: testCase.ROLE,
    semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE,
  });
  if (!executionContextValidation.safe) throw new Error(`EXECUTION_CONTEXT_INVALID:${executionContextValidation.failureReasons.join(',')}`);
  const fixtureValidation = validateFixtureReference({ executionContext: testCase.EXECUTION_CONTEXT, fixtureRegistry });
  if (!fixtureValidation.safe) throw new Error(`EXECUTION_FIXTURE_INVALID:${fixtureValidation.failureReasons.join(',')}`);
  const executionContext = testCase.EXECUTION_CONTEXT;
  const screenContext = executionContext.screen
    ? {
      id: executionContext.screen.id,
      path: executionContext.screen.path,
      label: executionContext.screen.label,
      role: executionContext.screen.role,
      ...(executionContext.selectedEntity
        ? {
          selectedEntityType: executionContext.selectedEntity.type,
          selectedEntityId: executionContext.selectedEntity.id,
        }
        : {}),
    }
    : null;
  return {
    caseId: testCase.CASE_ID,
    role: testCase.ROLE,
    turns,
    tenantContext: executionContext.tenantContext,
    screenContext,
    executionContext,
    documentation: {
      surfacePrecondition: testCase.SURFACE_PRECONDITION,
      statePrecondition: testCase.STATE_PRECONDITION,
      referencePrecondition: testCase.REFERENCE_PRECONDITION,
    },
    statePrecondition: testCase.STATE_PRECONDITION,
    referencePrecondition: testCase.REFERENCE_PRECONDITION,
  };
}

export function extractCanonicalActual(payload) {
  const foundation = payload?.semanticPlan ? payload : { semanticPlan: payload?.semanticPlan || {} };
  const envelope = payload?.semanticPlan?.canonicalRequestEnvelope || payload?.canonicalRequestEnvelope || null;
  const canonical = envelope || payload?.semanticPlan?.canonicalRequest || payload?.canonicalRequest || {};
  const request = canonical?.request || canonical || {};
  const semanticAction = request.semanticAction || {};
  const typedEvidence = request.typedEvidence || {};
  const plan = foundation.semanticPlan || {};
  const authority = envelope?.diagnostics?.semanticAuthority || canonical?.diagnostics?.semanticAuthority || plan?.diagnostics?.semanticAuthority || payload?.diagnostics?.semanticAuthority || null;
  const nativeAuthorizationStatus = plan.authorizationDecision?.authorizationStatus
    || (plan.authorizationDecision?.status === 'ALLOW' ? 'AUTHORIZED' : plan.authorizationDecision?.status === 'DENY' ? 'DENIED' : plan.authorizationDecision?.status)
    || null;
  const typedTaskForCanonicalScope = request.semanticScope?.class === 'OFF_TOPIC_GENUINE'
    ? plan.typedRequest?.taskType
    : plan.family === 'COUNT'
      ? plan.typedRequest?.taskType
      : null;
  const continuationTask = plan.family === 'CONTINUE_CURRENT_REASONING' ? plan.typedRequest?.taskType : null;
  // The live canonical response carries ordinary task identity in the
  // typedRequest envelope.  Omitting this path turns COUNT into NONE in the
  // disposable oracle even though the product returned a typed COUNT plan.
  const canonicalScalar = (value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value.value ?? null;
    return value;
  };
  const rawTask = request.task
    ?? request.taskType
    ?? plan.taskType
    ?? plan.typedRequest?.taskType
    ?? continuationTask
    ?? typedTaskForCanonicalScope
    ?? null;
  return {
    semanticScope: request.semanticScope?.class ?? request.semanticScope ?? null,
    requestMode: canonicalScalar(typedEvidence.requestMode)
      ?? canonicalScalar(request.requestMode)
      ?? (plan.family === 'CONTINUE_CURRENT_REASONING' ? 'CONTINUE' : null),
    semanticAction: semanticAction.actionClass ?? request.semanticActionClass ?? null,
    action: semanticAction.actionClass ?? request.action ?? null,
    object: semanticAction.objectClass ?? request.object ?? null,
    reference: typedEvidence.reference?.value ?? typedEvidence.reference ?? semanticAction.referenceClass ?? semanticAction.reference ?? request.reference ?? 'ABSENT',
    resolutionStatus: semanticAction.resolutionStatus ?? request.resolutionStatus ?? null,
    task: rawTask === null || rawTask === undefined ? 'NONE' : rawTask,
    operation: request.operation ?? plan.operation ?? null,
    authorizationClass: plan.authorizationDecision?.status ?? payload?.authorizationBoundary?.status ?? null,
    authorizationNativeStatus: nativeAuthorizationStatus,
    authority,
    response: payload,
  };
}

export function compareExpectedContract(expected, actual, contractPacket) {
  const mismatches = [];
  for (const field of ['semanticScope', 'requestMode', 'semanticAction', 'action', 'object', 'reference', 'resolutionStatus', 'task', 'operation']) {
    if (expected[field] !== actual[field]) mismatches.push({ field, expected: expected[field], actual: actual[field] });
  }
  const definition = contractPacket?.authorizationContract?.classes?.[expected.authorizationClass];
  if (definition?.category === 'AUTHORIZED_INTENT') {
    if (actual.authorizationClass !== 'ALLOW') {
      mismatches.push({
        field: 'authorizationClass',
        expected: expected.authorizationClass,
        expectedPolicyStatus: 'ALLOW',
        actualPolicyStatus: actual.authorizationClass,
      });
    }
    return mismatches;
  }
  if (definition && definition.nativeProductStatus !== 'NOT_APPLICABLE' && definition.nativeProductStatus !== actual.authorizationNativeStatus) {
    mismatches.push({ field: 'authorizationClass', expected: expected.authorizationClass, expectedNativeStatus: definition.nativeProductStatus, actualNativeStatus: actual.authorizationNativeStatus });
  }
  return mismatches;
}

export function adaptExpectedContract(testCase) {
  return {
    semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE,
    requestMode: testCase.EXPECTED_REQUEST_MODE,
    semanticAction: testCase.EXPECTED_SEMANTIC_ACTION,
    action: testCase.EXPECTED_ACTION,
    object: testCase.EXPECTED_OBJECT,
    reference: testCase.EXPECTED_REFERENCE_CLASS,
    resolutionStatus: testCase.EXPECTED_RESOLUTION_STATUS,
    task: testCase.EXPECTED_TASK_OR_TASK_FAMILY,
    operation: testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY,
    authorizationClass: testCase.EXPECTED_AUTHORIZATION_CLASS,
  };
}

export function responseWriteCount(payload) {
  const counters = payload?.counters?.observed || payload?.diagnostics?.counters?.observed || payload?.semanticPlan?.counters?.observed || payload?.safetyCounters || {};
  return Number(counters.businessWriteExecution ?? counters.businessWriteExecutions ?? counters.businessWrites ?? 0);
}

export function validateExecutionManifestPreflight(manifest, executionOrder, { fixtureRegistry = null } = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      safe: false,
      failure: {
        index: 0,
        caseId: null,
        classification: 'HARNESS_DEFECT',
        reason: 'MANIFEST_NOT_OBJECT',
          reasonCode: 'UNKNOWN_CRITICAL_FAILURE',
          guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
          stage: 'PRE_EXPOSURE_PREFLIGHT',
          boundary: 'BEFORE_CASE_EXPOSURE',
          caseBoundary: 'BEFORE_CASE_EXPOSURE',
      },
    };
  }
  if (!Array.isArray(executionOrder) || executionOrder.length === 0) {
    return {
      safe: false,
      failure: {
        index: 0,
        caseId: null,
        classification: 'HARNESS_DEFECT',
        reason: 'EXECUTION_ORDER_INVALID',
          reasonCode: 'UNKNOWN_CRITICAL_FAILURE',
          guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
          stage: 'PRE_EXPOSURE_PREFLIGHT',
          boundary: 'BEFORE_CASE_EXPOSURE',
          caseBoundary: 'BEFORE_CASE_EXPOSURE',
      },
    };
  }
  const casesById = new Map((Array.isArray(manifest.cases) ? manifest.cases : []).map((item) => [item?.CASE_ID, item]));
  const governedCases = new Map();
  for (let index = 0; index < executionOrder.length; index += 1) {
    const caseId = executionOrder[index];
    const testCase = casesById.get(caseId);
    if (!testCase) {
      return {
        safe: false,
        failure: {
          index: index + 1,
          caseId,
          classification: 'HARNESS_DEFECT',
          reason: 'CASE_NOT_IN_MANIFEST',
          reasonCode: 'CASE_NOT_IN_MANIFEST',
          guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
          stage: 'PRE_EXPOSURE_PREFLIGHT',
          boundary: 'BEFORE_CASE_EXPOSURE',
          caseBoundary: 'BEFORE_CASE_EXPOSURE',
        },
      };
    }
    try {
      governedCases.set(caseId, adaptGovernedCase(testCase, { fixtureRegistry }));
    } catch (error) {
      const reason = error?.message || String(error);
      return {
        safe: false,
        failure: {
          index: index + 1,
          caseId,
          role: testCase.ROLE,
          classification: 'HARNESS_DEFECT',
          reason,
          reasonCode: safeReasonCode(reason),
          guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
          stage: 'PRE_EXPOSURE_PREFLIGHT',
          boundary: 'BEFORE_CASE_EXPOSURE',
          caseBoundary: 'BEFORE_CASE_EXPOSURE',
        },
      };
    }
  }
  return { safe: true, governedCases };
}

export async function executeGovernedManifest({
  frozenManifestBytes,
  contractPacketBytes,
  receipt,
  provenanceReceipt,
  expectedSchemaVersion,
  executionOrder,
  runtimeProof,
  sessionFactory,
  transport,
  compare,
  contractPacket,
  fixtureRegistry = null,
  executionProtocolId = null,
  ordinaryMismatchPolicy = FIRST_FAILURE_STOP_POLICY,
  integrityProbe = null,
} = {}) {
  const provenanceValidation = validateSharedProvenanceReceipt(provenanceReceipt);
  if (!provenanceValidation.safe) {
    return {
      status: 'BLOCKED',
      failure: {
        failureClass: 'PROVENANCE_INVALID',
        failureReasons: provenanceValidation.failureReasons.length ? provenanceValidation.failureReasons : ['MISSING_PROVENANCE_RECEIPT'],
      },
      executed: [],
      notRun: true,
    };
  }
  const collectOrdinaryMismatches = ordinaryMismatchPolicy === SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY;
  if (ordinaryMismatchPolicy !== FIRST_FAILURE_STOP_POLICY && !collectOrdinaryMismatches) {
    return { status: 'BLOCKED', failure: { failureReasons: ['UNSUPPORTED_ORDINARY_MISMATCH_POLICY'] }, executed: [], notRun: true };
  }
  if (collectOrdinaryMismatches && executionProtocolId !== SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID) {
    return { status: 'BLOCKED', failure: { failureReasons: ['SAFE_COLLECT_ALL_PROTOCOL_ID_REQUIRED'] }, executed: [], notRun: true };
  }
  if (collectOrdinaryMismatches && typeof integrityProbe !== 'function') {
    return { status: 'BLOCKED', failure: { failureReasons: ['EXECUTION_INTEGRITY_PROBE_REQUIRED'] }, executed: [], notRun: true };
  }
  const receiptValidation = validateFreezeReceipt({
    frozenManifestBytes,
    contractPacketBytes,
    receipt,
    expectedSchemaVersion,
    expectedExecutionOrder: executionOrder,
    expectedExecutionProtocolId: collectOrdinaryMismatches ? executionProtocolId : null,
    expectedOrdinaryMismatchPolicy: collectOrdinaryMismatches ? ordinaryMismatchPolicy : null,
  });
  if (!receiptValidation.safe) return { status: 'BLOCKED', failure: receiptValidation, executed: [], notRun: true };
  if (!runtimeProof || runtimeProof.healthcheck !== 'PASS' || runtimeProof.mode !== 'NEW' || runtimeProof.authoritativePath !== CANONICAL_LIVE_AUTHORITY_PATH || runtimeProof.semanticAuthorityCount !== 1 || runtimeProof.shadowSemanticAuthorityCount !== 0 || runtimeProof.runtimeFallbackCount !== 0 || runtimeProof.downstreamSemanticRedecisionCount !== 0) {
    return { status: 'BLOCKED', failure: { failureReasons: ['RUNTIME_PROVENANCE_INVALID'] }, executed: [], notRun: true };
  }
  if (typeof sessionFactory !== 'function' || typeof transport !== 'function' || typeof compare !== 'function') return { status: 'BLOCKED', failure: { failureReasons: ['EXECUTION_DEPENDENCY_MISSING'] }, executed: [], notRun: true };
  const manifest = parseManifest(frozenManifestBytes);
  const preflight = validateExecutionManifestPreflight(manifest, executionOrder, { fixtureRegistry });
  if (!preflight.safe) {
    const criticalFailure = preflight.failure;
    return {
      status: 'BLOCKED',
      executed: [],
      firstFailure: criticalFailure,
      criticalFailure,
      executedCount: 0,
      exposedCount: 0,
      passCount: 0,
      failCount: 0,
      notRunCount: executionOrder.length,
      ordinaryMismatchCount: 0,
      safetyStopped: true,
      executionProtocolId: collectOrdinaryMismatches ? executionProtocolId : null,
      ordinaryMismatchPolicy,
      businessWriteExecution: 0,
    };
  }
  const governedCases = preflight.governedCases;
  const rows = [];
  let firstFailure = null;
  let criticalFailure = null;
  let businessWriteExecution = 0;
  let exposedCount = 0;
  const seenSessionIds = new Set();
  const runIntegrityProbe = async (stage, context) => {
    if (!collectOrdinaryMismatches) return;
    let result;
    try {
      result = await integrityProbe({ stage, ...context });
    } catch (error) {
      throw Object.assign(new Error('EXECUTION_INTEGRITY_PROBE_FAILED'), { critical: true, integrityReason: error?.message || String(error) });
    }
    if (!result || result.safe !== true) {
      throw Object.assign(new Error('EXECUTION_INTEGRITY_GUARD_FAILED'), { critical: true, integrityReason: result?.reason || 'INTEGRITY_PROBE_REJECTED' });
    }
  };
  for (let index = 0; index < executionOrder.length; index += 1) {
    const caseId = executionOrder[index];
    const testCase = manifest.cases.find((item) => item.CASE_ID === caseId);
    const governedCase = governedCases.get(caseId);
    if (!testCase || !governedCase) {
      criticalFailure = {
        index: index + 1,
        caseId,
        classification: 'HARNESS_DEFECT',
        reason: 'CASE_NOT_IN_MANIFEST',
        reasonCode: 'CASE_NOT_IN_MANIFEST',
        guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
        stage: 'PRE_EXPOSURE_PREFLIGHT',
        boundary: 'BEFORE_CASE_EXPOSURE',
        caseBoundary: 'BEFORE_CASE_EXPOSURE',
      };
      firstFailure = criticalFailure;
      break;
    }
    const row = { index: index + 1, caseId, role: governedCase.role, sessionIsolationProven: true, turns: [] };
    try {
      await runIntegrityProbe('BEFORE_CASE', { index: index + 1, caseId, governedCase });
      const session = await sessionFactory(governedCase.role, governedCase.caseId, governedCase.tenantContext);
      if (!session?.id || seenSessionIds.has(session.id)) throw Object.assign(new Error('SESSION_ISOLATION_FAILED'), { critical: true });
      seenSessionIds.add(session.id);
      let conversationState = null;
      for (let turnIndex = 0; turnIndex < governedCase.turns.length; turnIndex += 1) {
        if (turnIndex === 0) exposedCount += 1;
        const response = await transport({
          endpoint: CANONICAL_RUNTIME_ENDPOINT,
          method: 'POST',
          session,
          item: governedCase,
          message: governedCase.turns[turnIndex],
          conversationState,
          authorityMode: 'NEW',
        });
        const actual = extractCanonicalActual(response?.body ?? response);
        if (response?.status !== undefined && response.status !== 200) throw new Error(`CANONICAL_RUNTIME_STATUS:${response.status}`);
        if (actual.authority?.mode !== 'NEW' || actual.authority?.authoritativePath !== CANONICAL_LIVE_AUTHORITY_PATH || actual.authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT !== 1 || actual.authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT !== 0 || actual.authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT !== 0 || actual.authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT !== 0) throw new Error('CASE_AUTHORITY_PROOF_FAILED');
        const writes = responseWriteCount(actual.response);
        businessWriteExecution += writes;
        if (writes !== 0) throw Object.assign(new Error('BUSINESS_WRITE_EXECUTION_NONZERO'), { critical: true });
        row.turns.push({ turnIndex: turnIndex + 1, rawInput: governedCase.turns[turnIndex], actual });
        if (turnIndex < governedCase.turns.length - 1) {
          conversationState = actual.response?.conversationState || actual.response?.semanticPlan?.conversationState || actual.response?.semanticPlan?.canonicalRequestEnvelope?.conversationState || null;
          if (!conversationState) throw new Error('CONTINUATION_STATE_MISSING');
        }
        await runIntegrityProbe('AFTER_TURN', { index: index + 1, caseId, turnIndex: turnIndex + 1, governedCase, session, conversationState });
      }
      const actual = row.turns.at(-1).actual;
      const failures = compare(adaptExpectedContract(testCase), actual, contractPacket, testCase);
      if (failures.length) throw Object.assign(new Error('EXPECTED_CONTRACT_MISMATCH'), { failures });
      await runIntegrityProbe('AFTER_CASE', { index: index + 1, caseId, governedCase });
      row.status = 'PASS';
      rows.push(row);
    } catch (error) {
      row.status = 'FAIL';
      row.error = error?.message || String(error);
      row.failures = error?.failures || [];
      row.integrityReason = error?.integrityReason || null;
      rows.push(row);
      const ordinaryMismatch = error?.message === 'EXPECTED_CONTRACT_MISMATCH'
        && row.failures.length > 0
        && error?.critical !== true;
      const failure = {
        index: index + 1,
        caseId,
        role: governedCase.role,
        classification: ordinaryMismatch ? 'ORDINARY_SEMANTIC_MISMATCH' : 'HARNESS_OR_INTEGRITY_FAILURE',
        reason: row.error || 'UNKNOWN_CRITICAL_FAILURE',
        reasonCode: safeReasonCode(row.error),
        guardId: guardIdForFailure({ reasonCode: safeReasonCode(row.error), classification: ordinaryMismatch ? 'ORDINARY_SEMANTIC_MISMATCH' : 'HARNESS_OR_INTEGRITY_FAILURE' }),
        stage: 'CASE_EXECUTION',
        boundary: 'AFTER_CASE_EXPOSURE',
        row,
      };
      if (!firstFailure) firstFailure = failure;
      if (!ordinaryMismatch || !collectOrdinaryMismatches) {
        criticalFailure = ordinaryMismatch ? null : failure;
        break;
      }
    }
  }
  const hasFailures = rows.some((row) => row.status === 'FAIL');
  const status = criticalFailure ? 'BLOCKED' : hasFailures ? 'RED' : 'GREEN';
  return {
    status,
    executed: rows,
    firstFailure,
    criticalFailure,
    executedCount: rows.length,
    exposedCount,
    passCount: rows.filter((row) => row.status === 'PASS').length,
    failCount: rows.filter((row) => row.status === 'FAIL').length,
    notRunCount: executionOrder.length - rows.length,
    ordinaryMismatchCount: rows.filter((row) => row.status === 'FAIL' && row.failures.length > 0).length,
    safetyStopped: Boolean(criticalFailure),
    executionProtocolId: collectOrdinaryMismatches ? executionProtocolId : null,
    ordinaryMismatchPolicy,
    businessWriteExecution,
  };
}

export function createCanonicalHttpTransport({ apiBase = 'http://127.0.0.1:3400' } = {}) {
  return async ({ endpoint, session, item, message, conversationState }) => {
    const requestValidation = validateCanonicalRuntimeRequest({ endpoint, session, item, message });
    if (!requestValidation.safe) throw new Error(`HARNESS_REQUEST_CONSTRUCTION_DEFECT:${requestValidation.failureReasons.join(',')}`);
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        intent: 'CHAT_HELP',
        entityType: 'screen',
        entityId: 0,
        screenContext: item.screenContext,
        conversationState: conversationState || undefined,
        message,
        format: 'json',
      }),
    });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    return { status: response.status, body };
  };
}

export function createDemoSessionFactory({
  apiBase = 'http://127.0.0.1:3400',
  roleCredentials = DEFAULT_ROLE_CREDENTIALS,
  roleDeviceIds = DEFAULT_ROLE_DEVICE_IDS,
} = {}) {
  const authByScope = new Map();
  return async (role, caseId, tenantContext = null) => {
    const tenantScope = tenantContext && typeof tenantContext === 'object'
      ? {
        type: tenantContext.type || tenantContext.tenantType || null,
        companyId: tenantContext.companyId ?? null,
        roomId: tenantContext.roomId ?? null,
        organizationId: tenantContext.organizationId ?? null,
      }
      : tenantContext;
    const scopeKey = `${String(role)}:${JSON.stringify(tenantScope)}`;
    let auth = authByScope.get(scopeKey);
    if (!auth) {
      const deviceId = roleDeviceIds[role] || `m18-governed-${role}-${randomUUID()}`;
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: roleCredentials[role], password: 'demo123', deviceId }),
      });
      const body = await response.json();
      if (response.status !== 200 || !body?.token) throw new Error(`LOGIN_FAILED:${role}:${response.status}`);
      auth = { token: body.token, refreshToken: body.refreshToken || null, deviceId };
      authByScope.set(scopeKey, auth);
    } else if (auth.refreshToken) {
      // Keep the production login limiter untouched while rotating through the
      // real authenticated session lifecycle.  The access-token jti changes
      // per case, which gives the server-owned canonical conversation state a
      // fresh auth scope without copying semantic state or bypassing auth.
      const response = await fetch(`${apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.refreshToken, ...(auth.deviceId ? { deviceId: auth.deviceId } : {}) }),
      });
      const body = await response.json();
      if (response.status !== 200 || !body?.token) throw new Error(`SESSION_REFRESH_FAILED:${role}:${response.status}`);
      auth = { token: body.token, refreshToken: body.refreshToken || null, deviceId: auth.deviceId };
      authByScope.set(scopeKey, auth);
    }
    return { id: `m18-${caseId}-${randomUUID()}`, token: auth.token, role };
  };
}
