import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  compareExpectedContract,
  adaptExpectedContract,
  createCanonicalHttpTransport,
  createDemoSessionFactory,
  createExecutionReceipt,
  CRITICAL_FAILURE_STOP_POLICY,
  executeGovernedManifest,
  EXECUTION_RECEIPT_SCHEMA_VERSION,
  SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  sha256,
  validateSharedProvenanceReceipt,
  validateFreezeReceipt,
  writeExecutionReceipt,
} from './lib/m18HoldoutExecutionAdapter.mjs';
import { completeContractBindingSha256, currentContractBinding } from './lib/m18CurrentSemanticContract.mjs';
import { verifyFixtureProvenanceEnvelope } from './m18_fixture_provenance_20261009_produce.mjs';

export const V2_PROTOCOL_BINDING_SCHEMA_VERSION = 'M18-HOLDOUT-PROTOCOL-BINDING-V1';
export const V2_PROTOCOL_BINDING_OWNER = 'backend/scripts/m18_final_fresh_20261006_execute.mjs';

export function resolveExecutionRuntime(environment = process.env) {
  const mode = String(environment.M18_RUNTIME_MODE || 'TASK13').trim().toUpperCase();
  if (mode !== 'TASK13' && mode !== 'DOCKER') throw new Error(`EXECUTION_RUNTIME_MODE_UNSUPPORTED:${mode}`);
  const port = mode === 'DOCKER' ? 3000 : 3400;
  const apiBase = String(environment.M18_RUNTIME_API_BASE || `http://127.0.0.1:${port}`).trim().replace(/\/$/u, '');
  let parsed;
  try { parsed = new URL(apiBase); } catch { throw new Error('EXECUTION_RUNTIME_API_BASE_INVALID'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80)) !== port) {
    throw new Error('EXECUTION_RUNTIME_API_BASE_PORT_INVALID');
  }
  return { mode, apiBase, port, requiresOwnedStartup: mode !== 'DOCKER' };
}

export function validateDockerExecutionProvenance({ provenance, candidateSha256, completeSourceBindingSha256, expectedPort = 3000 } = {}) {
  const failures = [];
  const shared = validateSharedProvenanceReceipt(provenance);
  if (!shared.safe) failures.push(...shared.failureReasons);
  const runtime = provenance?.runtimeBinding || {};
  const suite = Array.isArray(provenance?.suiteResults) ? provenance.suiteResults[0] || {} : {};
  const checks = [
    ['finalStatus', provenance?.finalStatus, 'GREEN'],
    ['sourceMutation', provenance?.sourceMutation, false],
    ['startEndManifest', provenance?.startManifestSha256 === provenance?.endManifestSha256, true],
    ['runtimeKind', runtime.runtimeKind, 'DOCKER'],
    ['containerName', runtime.containerName, 'personel_api'],
    ['port', Number(runtime.port), Number(expectedPort)],
    ['hostPort', Number(runtime.hostPort), Number(expectedPort)],
    ['healthStatus', runtime.healthStatus, 'PASS'],
    ['sourceContractBindingSha256', runtime.sourceContractBindingSha256, runtime.sourceIdentity],
    ['containerSourceContractBindingSha256', runtime.containerSourceContractBindingSha256, runtime.sourceIdentity],
    ['sourceManifestSha256', runtime.sourceManifestSha256, provenance.startManifestSha256],
    ['candidateManifestSha256', suite.candidateManifestSha256, candidateSha256],
    ['completeSourceBindingSha256', suite.completeSourceBindingSha256, completeSourceBindingSha256],
    ['businessWriteExecution', Number(suite.businessWriteExecution), 0],
    ['authorizationMutation', Number(suite.authorizationMutation), 0],
    ['downstreamBusinessWrite', Number(suite.downstreamBusinessWrite), 0],
    ['runtimeFallbackCount', Number(suite.runtimeFallbackCount), 0],
    ['downstreamSemanticRedecisionCount', Number(suite.downstreamSemanticRedecisionCount), 0],
    ['shadowSemanticAuthorityCount', Number(suite.shadowSemanticAuthorityCount), 0],
  ];
  for (const [field, actual, expected] of checks) {
    if (actual !== expected) failures.push(`DOCKER_RUNTIME_${field.toUpperCase()}_MISMATCH`);
  }
  if (!runtime.containerId || !runtime.containerProcessCommand || !runtime.containerProcessCwd || !runtime.containerProcessStartTime) failures.push('DOCKER_RUNTIME_PROCESS_IDENTITY_INCOMPLETE');
  if (!Array.isArray(runtime.hostPortForwarders) || runtime.hostPortForwarders.length === 0) failures.push('DOCKER_RUNTIME_PORT_FORWARDER_IDENTITY_INCOMPLETE');
  return { safe: failures.length === 0, failureReasons: [...new Set(failures)] };
}

export function loadDockerFixtureRegistry({ filePath, expectedRegistrySha256, expectedSourceBindingSha256 } = {}) {
  if (!filePath) throw new Error('DOCKER_FIXTURE_ENVELOPE_REQUIRED');
  let envelope;
  try {
    envelope = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`DOCKER_FIXTURE_ENVELOPE_UNREADABLE:${error?.code || 'INVALID_JSON'}`);
  }
  const verification = verifyFixtureProvenanceEnvelope(envelope);
  if (!verification.safe) throw new Error(`DOCKER_FIXTURE_ENVELOPE_INVALID:${verification.failureReasons.join(',')}`);
  if (envelope.provenance.registrySha256 !== expectedRegistrySha256) throw new Error('DOCKER_FIXTURE_REGISTRY_DIGEST_MISMATCH');
  if (envelope.provenance.sourceContractBindingSha256 !== expectedSourceBindingSha256) throw new Error('DOCKER_FIXTURE_SOURCE_BINDING_MISMATCH');
  return envelope.fixtureRegistry;
}

function normalizedJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assertBuffer(value, name) {
  if (!Buffer.isBuffer(value)) throw new TypeError(`${name}_MUST_BE_BUFFER`);
}

function currentSourceIdentity(repoRoot) {
  const binding = currentContractBinding(repoRoot);
  return sha256(Buffer.from(JSON.stringify(binding), 'utf8'));
}

function executorIdentity(repoRoot) {
  return sha256(readFileSync(resolve(repoRoot, V2_PROTOCOL_BINDING_OWNER)));
}

export function createV2ProtocolBinding({
  acceptanceId,
  frozenManifestBytes,
  freezeReceiptBytes,
  contractPacketBytes,
  sourceIdentity,
  completeSourceBindingSha256 = null,
  executorIdentity: boundExecutorIdentity,
  runtimeProvenanceReceiptSha256 = null,
  fixtureRegistrySha256 = null,
  runtimeKind = null,
  runtimePort = null,
  auditReceiptSha256 = null,
  authorContextId = null,
  auditorContextId = null,
  bindingRevision = 1,
  supersedesBindingId = null,
  supersedesBindingSha256 = null,
  createdAt = new Date().toISOString(),
} = {}) {
  assertBuffer(frozenManifestBytes, 'FROZEN_MANIFEST_BYTES');
  assertBuffer(freezeReceiptBytes, 'FREEZE_RECEIPT_BYTES');
  assertBuffer(contractPacketBytes, 'CONTRACT_PACKET_BYTES');
  const manifest = JSON.parse(frozenManifestBytes.toString('utf8'));
  const freezeReceipt = JSON.parse(freezeReceiptBytes.toString('utf8'));
  const bindingAcceptanceId = String(acceptanceId || manifest.manifestId || '').trim();
  if (!bindingAcceptanceId) throw new Error('V2_BINDING_ACCEPTANCE_ID_REQUIRED');
  const revision = Number(bindingRevision);
  if (!Number.isInteger(revision) || revision < 1 || revision > 2) throw new Error('V2_BINDING_REVISION_UNSUPPORTED');
  if (revision === 2 && (!supersedesBindingId || !supersedesBindingSha256)) throw new Error('V2_BINDING_SUCCESSOR_RELATION_REQUIRED');
  return {
    bindingSchemaVersion: V2_PROTOCOL_BINDING_SCHEMA_VERSION,
    bindingId: revision === 1 ? `${bindingAcceptanceId}-V2-BINDING` : `${bindingAcceptanceId}-V2-BINDING-S${revision}`,
    bindingRevision: revision,
    acceptanceId: bindingAcceptanceId,
    authoritativeExecutionOwner: V2_PROTOCOL_BINDING_OWNER,
    frozenManifestId: manifest.manifestId,
    frozenCaseCount: manifest.caseCount,
    frozenManifestSha256: sha256(frozenManifestBytes),
    originalFreezeReceiptSha256: sha256(freezeReceiptBytes),
    originalFreezeReceiptManifestSha256: freezeReceipt.manifestSha256 || null,
    contractPacketSha256: sha256(contractPacketBytes),
    executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
    ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
    criticalFailurePolicy: CRITICAL_FAILURE_STOP_POLICY,
    integrityProbeRequired: true,
    sourceIdentity: String(sourceIdentity || '').trim().toUpperCase(),
    completeSourceBindingSha256: completeSourceBindingSha256 || null,
    executorIdentity: String(boundExecutorIdentity || '').trim().toUpperCase(),
    runtimeProvenanceReceiptSha256: runtimeProvenanceReceiptSha256 || null,
    fixtureRegistrySha256: fixtureRegistrySha256 || null,
    runtimeKind: runtimeKind || null,
    runtimePort: runtimePort === null || runtimePort === undefined ? null : Number(runtimePort),
    auditReceiptSha256: auditReceiptSha256 || null,
    authorContextId,
    auditorContextId,
    lineage: revision === 1 ? 'ORIGINAL_BINDING' : 'ADDITIVE_SUCCESSOR',
    supersedesBindingId: revision === 1 ? null : supersedesBindingId,
    supersedesBindingSha256: revision === 1 ? null : supersedesBindingSha256,
    status: 'BOUND_NOT_EXECUTED',
    createdAt,
  };
}

export function validateV2ProtocolBinding({
  binding,
  acceptanceId,
  frozenManifestBytes,
  freezeReceiptBytes,
  contractPacketBytes,
  sourceIdentity,
  completeSourceBindingSha256 = null,
  executorIdentity: expectedExecutorIdentity,
  runtimeProvenanceReceiptSha256 = null,
  fixtureRegistrySha256 = null,
  expectedRuntimeKind = null,
  expectedRuntimePort = null,
  expectedBindingRevision = 1,
  supersededBinding = null,
  supersededBindingBytes = null,
} = {}) {
  const failures = [];
  if (!binding || typeof binding !== 'object') {
    return { safe: false, failures: [{ reason: 'V2_BINDING_MISSING' }] };
  }
  try {
    assertBuffer(frozenManifestBytes, 'FROZEN_MANIFEST_BYTES');
    assertBuffer(freezeReceiptBytes, 'FREEZE_RECEIPT_BYTES');
    assertBuffer(contractPacketBytes, 'CONTRACT_PACKET_BYTES');
    const manifest = JSON.parse(frozenManifestBytes.toString('utf8'));
    const freezeReceipt = JSON.parse(freezeReceiptBytes.toString('utf8'));
    const expectedAcceptanceId = String(acceptanceId || manifest.manifestId || '').trim();
    const revision = Number(expectedBindingRevision);
    if (!Number.isInteger(revision) || revision < 1 || revision > 2) {
      failures.push({ reason: 'V2_BINDING_REVISION_EXPECTATION_INVALID', field: 'bindingRevision', expected: expectedBindingRevision });
    }
    const expectedBindingId = revision === 1
      ? `${expectedAcceptanceId}-V2-BINDING`
      : `${expectedAcceptanceId}-V2-BINDING-S${revision}`;
    const expectedManifestSha256 = sha256(frozenManifestBytes);
    const expectedFreezeReceiptSha256 = sha256(freezeReceiptBytes);
    const expectedContractPacketSha256 = sha256(contractPacketBytes);
    const checks = [
      ['bindingSchemaVersion', binding.bindingSchemaVersion, V2_PROTOCOL_BINDING_SCHEMA_VERSION],
      ['bindingId', binding.bindingId, expectedBindingId],
      ['bindingRevision', Number(binding.bindingRevision ?? 1), revision],
      ['acceptanceId', binding.acceptanceId, expectedAcceptanceId],
      ['authoritativeExecutionOwner', binding.authoritativeExecutionOwner, V2_PROTOCOL_BINDING_OWNER],
      ['frozenManifestId', binding.frozenManifestId, manifest.manifestId],
      ['frozenCaseCount', binding.frozenCaseCount, manifest.caseCount],
      ['frozenManifestSha256', binding.frozenManifestSha256, expectedManifestSha256],
      ['originalFreezeReceiptSha256', binding.originalFreezeReceiptSha256, expectedFreezeReceiptSha256],
      ['originalFreezeReceiptManifestSha256', binding.originalFreezeReceiptManifestSha256, expectedManifestSha256],
      ['contractPacketSha256', binding.contractPacketSha256, expectedContractPacketSha256],
      ['executionProtocolId', binding.executionProtocolId, SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID],
      ['ordinaryMismatchPolicy', binding.ordinaryMismatchPolicy, SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY],
      ['criticalFailurePolicy', binding.criticalFailurePolicy, CRITICAL_FAILURE_STOP_POLICY],
      ['integrityProbeRequired', binding.integrityProbeRequired, true],
      ['sourceIdentity', binding.sourceIdentity, String(sourceIdentity || '').trim().toUpperCase()],
      ...(completeSourceBindingSha256 !== null ? [['completeSourceBindingSha256', binding.completeSourceBindingSha256, String(completeSourceBindingSha256).trim().toUpperCase()]] : []),
      ['executorIdentity', binding.executorIdentity, String(expectedExecutorIdentity || '').trim().toUpperCase()],
      ...(runtimeProvenanceReceiptSha256 !== null ? [['runtimeProvenanceReceiptSha256', binding.runtimeProvenanceReceiptSha256, String(runtimeProvenanceReceiptSha256).trim().toUpperCase()]] : []),
      ...(fixtureRegistrySha256 !== null ? [['fixtureRegistrySha256', binding.fixtureRegistrySha256, String(fixtureRegistrySha256).trim().toUpperCase()]] : []),
      ...(expectedRuntimeKind !== null ? [['runtimeKind', binding.runtimeKind, expectedRuntimeKind]] : []),
      ...(expectedRuntimePort !== null ? [['runtimePort', Number(binding.runtimePort), Number(expectedRuntimePort)]] : []),
      ['status', binding.status, 'BOUND_NOT_EXECUTED'],
    ];
    for (const [field, actual, expected] of checks) {
      if (actual !== expected) failures.push({ reason: `V2_BINDING_${field.toUpperCase()}_MISMATCH`, field, actual, expected });
    }
    if (manifest.status !== 'FROZEN_NOT_EXECUTED') failures.push({ reason: 'V2_BINDING_MANIFEST_NOT_FROZEN', field: 'status', actual: manifest.status });
    if (freezeReceipt.manifestSha256 !== expectedManifestSha256) failures.push({ reason: 'V2_BINDING_FREEZE_RECEIPT_MANIFEST_MISMATCH' });
    if (revision === 1) {
      if ((binding.lineage ?? 'ORIGINAL_BINDING') !== 'ORIGINAL_BINDING') failures.push({ reason: 'V2_BINDING_ORIGINAL_LINEAGE_INVALID', field: 'lineage' });
      if (binding.supersedesBindingId !== null && binding.supersedesBindingId !== undefined) failures.push({ reason: 'V2_BINDING_ORIGINAL_SUPERSEDES_ID_PRESENT', field: 'supersedesBindingId' });
      if (binding.supersedesBindingSha256 !== null && binding.supersedesBindingSha256 !== undefined) failures.push({ reason: 'V2_BINDING_ORIGINAL_SUPERSEDES_HASH_PRESENT', field: 'supersedesBindingSha256' });
    } else {
      if (binding.lineage !== 'ADDITIVE_SUCCESSOR') failures.push({ reason: 'V2_BINDING_SUCCESSOR_LINEAGE_INVALID', field: 'lineage' });
      if (!supersededBinding || !supersededBindingBytes) {
        failures.push({ reason: 'V2_BINDING_SUCCESSOR_PREVIOUS_BINDING_MISSING' });
      } else {
        const previousBindingSha256 = sha256(Buffer.isBuffer(supersededBindingBytes)
          ? supersededBindingBytes
          : Buffer.from(supersededBindingBytes));
        if (binding.supersedesBindingId !== supersededBinding.bindingId) failures.push({ reason: 'V2_BINDING_SUCCESSOR_PREVIOUS_ID_MISMATCH', field: 'supersedesBindingId' });
        if (binding.supersedesBindingSha256 !== previousBindingSha256) failures.push({ reason: 'V2_BINDING_SUCCESSOR_PREVIOUS_HASH_MISMATCH', field: 'supersedesBindingSha256' });
      }
    }
  } catch (error) {
    failures.push({ reason: 'V2_BINDING_VALIDATION_ERROR', message: error?.message || String(error) });
  }
  return { safe: failures.length === 0, failures };
}

export function writeV2ProtocolBindingReceipt({ bindingPath, binding } = {}) {
  if (!bindingPath) throw new Error('V2_BINDING_RECEIPT_PATH_REQUIRED');
  const bytes = normalizedJsonBytes(binding);
  if (existsSync(bindingPath)) {
    const existingBytes = readFileSync(bindingPath);
    if (sha256(existingBytes) !== sha256(bytes)) throw new Error('V2_BINDING_RECEIPT_ALREADY_EXISTS_MISMATCH');
    return { written: false, existing: true, sha256: sha256(existingBytes) };
  }
  writeFileSync(bindingPath, bytes, { flag: 'wx' });
  return { written: true, existing: false, sha256: sha256(bytes) };
}

function safeFailureToken(value) {
  const text = String(value || '').trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{1,127}$/u.test(text) ? text : null;
}

function sanitizePreExposureFailure(failure) {
  const failureReasons = Array.isArray(failure?.failureReasons)
    ? [...new Set(failure.failureReasons.map(safeFailureToken).filter(Boolean))]
    : [];
  const failures = Array.isArray(failure?.failures)
    ? failure.failures.map((item) => ({
      reason: safeFailureToken(item?.reason),
      field: safeFailureToken(item?.field),
      actual: safeFailureToken(item?.actual),
      expected: safeFailureToken(item?.expected),
    })).filter((item) => item.reason || item.field || item.actual || item.expected)
    : [];
  return { failureReasons, failures };
}

export function createEffectiveRuntimeReceipt({ originalReceipt, binding } = {}) {
  if (!originalReceipt || typeof originalReceipt !== 'object' || Array.isArray(originalReceipt)) {
    throw new TypeError('ORIGINAL_FREEZE_RECEIPT_REQUIRED');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    throw new TypeError('V2_PROTOCOL_BINDING_REQUIRED');
  }
  return {
    ...originalReceipt,
    executionProtocolId: binding.executionProtocolId,
    ordinaryMismatchPolicy: binding.ordinaryMismatchPolicy,
    criticalFailurePolicy: binding.criticalFailurePolicy,
    protocolBindingId: binding.bindingId,
  };
}

const SAFE_CASE_EVIDENCE_FIELDS = [
  'semanticScope',
  'requestMode',
  'semanticAction',
  'action',
  'object',
  'reference',
  'resolutionStatus',
  'task',
  'operation',
  'authorizationClass',
  'authorizationNativeStatus',
];

function safeCaseEvidenceValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  const text = String(value);
  return /^[A-Za-z0-9_./:-]{1,128}$/u.test(text) ? text : '[REDACTED]';
}

function projectSafeSemanticEvidence(value) {
  const projection = {};
  for (const field of SAFE_CASE_EVIDENCE_FIELDS) {
    if (Object.hasOwn(value || {}, field)) projection[field] = safeCaseEvidenceValue(value[field]);
  }
  return projection;
}

function safeEvidenceReasonCode(value) {
  const text = String(value || '').trim().toUpperCase();
  return /^[A-Z][A-Z0-9_]{1,127}$/u.test(text) ? text : 'UNKNOWN_FAILURE';
}

export function createCaseEvidenceProjection({ executionRows = [], manifestCases = [] } = {}) {
  const casesById = new Map((Array.isArray(manifestCases) ? manifestCases : []).map((item) => [item?.CASE_ID, item]));
  return (Array.isArray(executionRows) ? executionRows : []).map((row) => {
    const testCase = casesById.get(row?.caseId) || {};
    return {
      index: Number(row?.index || 0),
      caseId: safeCaseEvidenceValue(row?.caseId),
      role: safeCaseEvidenceValue(row?.role),
      challengeClass: safeCaseEvidenceValue(testCase.CHALLENGE_CLASS),
      contractSourceClass: safeCaseEvidenceValue(testCase.CONTRACT_SOURCE_CLASS),
      tenantContextType: safeCaseEvidenceValue(testCase.TENANT_CONTEXT_TYPE || testCase.EXECUTION_CONTEXT?.tenantContext?.type),
      surfacePath: safeCaseEvidenceValue(testCase.EXECUTION_CONTEXT?.screen?.path),
      selectedEntityPresent: Boolean(testCase.EXECUTION_CONTEXT?.selectedEntity),
      status: row?.status === 'PASS' ? 'PASS' : row?.status === 'FAIL' ? 'FAIL' : 'UNKNOWN',
      expected: projectSafeSemanticEvidence(adaptExpectedContract(testCase)),
      turns: (Array.isArray(row?.turns) ? row.turns : []).map((turn) => ({
        turnIndex: Number(turn?.turnIndex || 0),
        actual: projectSafeSemanticEvidence(turn?.actual),
        continuationStateObserved: Boolean(
          turn?.actual?.response?.conversationState
          || turn?.actual?.response?.semanticPlan?.conversationState
          || turn?.actual?.response?.semanticPlan?.canonicalRequestEnvelope?.conversationState,
        ),
      })),
      mismatchFields: [...new Set((Array.isArray(row?.failures) ? row.failures : [])
        .map((failure) => safeCaseEvidenceValue(failure?.field))
        .filter(Boolean))],
      failureReasonCode: row?.status === 'FAIL' ? safeEvidenceReasonCode(row?.error) : null,
    };
  });
}

export function createGovernedExecutionReceipt({
  baseReceipt = {},
  result = {},
  executionOrderCount = 0,
  executionProtocolId = null,
  currentSourceManifest = null,
  currentSourceContentIdentity = null,
  manifestCases = [],
} = {}) {
  const preExposureFailure = result.status === 'BLOCKED'
    && result.notRun === true
    && result.failure
    && result.exposedCount === undefined
    && result.executedCount === undefined
    && result.passCount === undefined
    && result.failCount === undefined
    && result.notRunCount === undefined;
  const normalizedResult = preExposureFailure
    ? {
      ...result,
      exposedCount: 0,
      executedCount: 0,
      passCount: 0,
      failCount: 0,
      notRunCount: Number(executionOrderCount),
      ordinaryMismatchCount: 0,
      safetyStopped: true,
      criticalFailure: result.criticalFailure || {
        classification: 'HARNESS_DEFECT',
        reason: 'EXECUTION_PREEXPOSURE_VALIDATION_FAILED',
        guardId: 'PREEXPOSURE_ADAPTER_COMPATIBILITY',
        stage: 'PRE_EXPOSURE_PREFLIGHT',
        boundary: 'BEFORE_CASE_EXPOSURE',
      },
      executionProtocolId: result.executionProtocolId || executionProtocolId,
    }
    : result;
  const receipt = createExecutionReceipt({
    baseReceipt,
    result: normalizedResult,
    executionProtocolId,
    currentSourceManifest,
    currentSourceContentIdentity,
  });
  if (Array.isArray(manifestCases) && manifestCases.length > 0) {
    receipt.perCaseEvidence = createCaseEvidenceProjection({
      executionRows: result.executed,
      manifestCases,
    });
  }
  if (preExposureFailure) {
    receipt.preExposureFailure = sanitizePreExposureFailure(result.failure);
  }
  return receipt;
}

function listenerPidForPort(port) {
  const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
  for (const line of output.split(/\r?\n/u)) {
    const columns = line.trim().split(/\s+/u);
    if (columns.length < 5) continue;
    if (columns[1]?.endsWith(`:${port}`) && columns.includes('LISTENING')) {
      const pid = Number(columns.at(-1));
      if (Number.isInteger(pid) && pid > 0) return pid;
    }
  }
  return null;
}

async function waitForHealth(apiBase, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(1_000) });
      if (response.status === 200) return true;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  return false;
}

function isMainModule() {
  return process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

export async function runFreshAcceptance() {
  const root = resolve(process.cwd());
  const backendRoot = resolve(root, 'backend');
  const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
  const artifactPrefix = process.env.M18_FINAL_ARTIFACT_PREFIX || 'm18-final-independent-fresh-20261009';
  const manifestPath = resolve(planDir, `${artifactPrefix}-frozen.json`);
  const receiptPath = resolve(planDir, `${artifactPrefix}-freeze-receipt.json`);
  const auditPath = resolve(planDir, `${artifactPrefix}-audit.json`);
  const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
  const provenancePath = resolve(planDir, `${artifactPrefix}-provenance-receipt.json`);
  const bindingRevision = Number(process.env.M18_V2_BINDING_REVISION || '1');
  const defaultBindingFile = bindingRevision === 2
    ? `${artifactPrefix}-v2-protocol-binding-s2-receipt.json`
    : `${artifactPrefix}-v2-protocol-binding-receipt.json`;
  const bindingPath = resolve(planDir, process.env.M18_V2_BINDING_RECEIPT_PATH || defaultBindingFile);
  const previousBindingPath = resolve(planDir, process.env.M18_V2_PREVIOUS_BINDING_RECEIPT_PATH || `${artifactPrefix}-v2-protocol-binding-receipt.json`);
  const runtime = resolveExecutionRuntime(process.env);
  const runtimeProvenancePath = resolve(root, process.env.M18_RUNTIME_PROVENANCE_PATH || provenancePath);
  const manifestBytes = readFileSync(manifestPath);
  const receiptBytes = readFileSync(receiptPath);
  const auditBytes = readFileSync(auditPath);
  const packetBytes = readFileSync(packetPath);
  const provenanceBytes = readFileSync(runtimeProvenancePath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  const audit = JSON.parse(auditBytes.toString('utf8'));
  const packet = JSON.parse(packetBytes.toString('utf8'));
  const provenance = JSON.parse(provenanceBytes.toString('utf8'));
  const executionOrder = receipt.executionOrder;
  const manifestSha256 = sha256(manifestBytes);
  const receiptSha256 = sha256(receiptBytes);
  const currentIdentity = currentSourceIdentity(root);
  const completeSourceBindingIdentity = completeContractBindingSha256(root);
  const currentExecutorIdentity = executorIdentity(root);
  const dockerProvenanceValidation = runtime.mode === 'DOCKER'
    ? validateDockerExecutionProvenance({
      provenance,
      candidateSha256: sha256(readFileSync(resolve(planDir, `${artifactPrefix}-candidate.json`))),
      completeSourceBindingSha256: completeSourceBindingIdentity,
      expectedPort: runtime.port,
    })
    : { safe: true, failureReasons: [] };
  if (runtime.mode === 'DOCKER' && !dockerProvenanceValidation.safe) {
    console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_BINDING', reason: 'DOCKER_RUNTIME_PROVENANCE_INVALID', failures: dockerProvenanceValidation.failureReasons, runtimeProvenancePath, casesExposed: 0, casesExecuted: 0 }, null, 2));
    process.exitCode = 1;
    return;
  }
  const runtimeSuite = Array.isArray(provenance.suiteResults) ? provenance.suiteResults[0] || {} : {};
  const runtimeProvenanceReceiptSha256 = sha256(provenanceBytes);
  const fixtureRegistrySha256 = runtimeSuite.fixtureRegistrySha256 || null;
  const fixtureEnvelopePath = process.env.M18_FIXTURE_ENVELOPE_PATH
    ? resolve(root, process.env.M18_FIXTURE_ENVELOPE_PATH)
    : null;
  let fixtureRegistry = null;
  if (runtime.mode === 'DOCKER') {
    try {
      fixtureRegistry = loadDockerFixtureRegistry({
        filePath: fixtureEnvelopePath,
        expectedRegistrySha256: fixtureRegistrySha256,
        expectedSourceBindingSha256: currentIdentity,
      });
    } catch (error) {
      console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_BINDING', reason: 'DOCKER_FIXTURE_ENVELOPE_INVALID', message: error?.message || String(error), casesExposed: 0, casesExecuted: 0 }, null, 2));
      process.exitCode = 1;
      return;
    }
  }
  let previousBinding = null;
  let previousBindingBytes = null;
  if (bindingRevision === 2) {
    try {
      previousBindingBytes = readFileSync(previousBindingPath);
      previousBinding = JSON.parse(previousBindingBytes.toString('utf8'));
    } catch (error) {
      console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_BINDING', reason: 'V2_BINDING_PREVIOUS_RECEIPT_UNAVAILABLE', previousBindingPath, message: error?.message || String(error) }, null, 2));
      process.exitCode = 1;
      return;
    }
  }
  const receiptValidation = validateFreezeReceipt({
    frozenManifestBytes: manifestBytes,
    contractPacketBytes: packetBytes,
    receipt,
    expectedSchemaVersion: manifest.schemaVersion,
    expectedExecutionOrder: executionOrder,
  });
  const auditBindingValid = audit.sourceContractBindingSha256 === currentIdentity
    && audit.executionProtocolId === SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID
    && audit.ordinaryMismatchPolicy === SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY
    && audit.criticalFailurePolicy === CRITICAL_FAILURE_STOP_POLICY
    && audit.authorRuntimeOracleUsed === false
    && audit.auditorRuntimeOracleUsed === false;
  const baseIntegrity = {
    frozenManifestIntegrity: manifestSha256 === receipt.manifestSha256,
    freezeReceiptIntegrity: receiptSha256 === sha256(receiptBytes),
    executionOrderIntegrity: receipt.executionOrderSha256 === sha256(Buffer.from(executionOrder.join('\n'), 'utf8')),
    receiptValidation: receiptValidation.safe,
    provenanceReceiptPresent: provenance.finalStatus === 'GREEN',
    provenanceSourceMutation: provenance.sourceMutation === false,
    auditBindingValid,
    sourceIdentityPresent: /^[A-F0-9]{64}$/u.test(currentIdentity),
  };
  const bindingInput = {
    acceptanceId: manifest.manifestId,
    frozenManifestBytes: manifestBytes,
    freezeReceiptBytes: receiptBytes,
    contractPacketBytes: packetBytes,
    sourceIdentity: currentIdentity,
    executorIdentity: currentExecutorIdentity,
    auditReceiptSha256: sha256(auditBytes),
    authorContextId: audit.authorContextId,
    auditorContextId: audit.auditorContextId,
    completeSourceBindingSha256: completeSourceBindingIdentity,
    runtimeProvenanceReceiptSha256,
    fixtureRegistrySha256,
    expectedRuntimeKind: runtime.mode === 'DOCKER' ? 'DOCKER' : null,
    expectedRuntimePort: runtime.mode === 'DOCKER' ? runtime.port : null,
  };

  if (process.env.M18_V2_BIND_ONLY === '1') {
    if (!Object.values(baseIntegrity).every(Boolean)) {
      console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_BINDING', baseIntegrity, manifestSha256, receiptSha256 }, null, 2));
      process.exitCode = 1;
      return;
    }
    const previousValidation = bindingRevision === 2
      ? validateV2ProtocolBinding({
        ...bindingInput,
        binding: previousBinding,
        expectedBindingRevision: 1,
        executorIdentity: previousBinding.executorIdentity,
        runtimeProvenanceReceiptSha256: previousBinding.runtimeProvenanceReceiptSha256,
        fixtureRegistrySha256: previousBinding.fixtureRegistrySha256,
        expectedRuntimeKind: previousBinding.runtimeKind,
        expectedRuntimePort: previousBinding.runtimePort,
      })
      : { safe: true, failures: [] };
    if (!previousValidation.safe) {
      console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_BINDING', reason: 'V2_BINDING_PREVIOUS_RECEIPT_INVALID', previousBindingPath, previousBindingFailures: previousValidation.failures }, null, 2));
      process.exitCode = 1;
      return;
    }
    const binding = createV2ProtocolBinding({
      ...bindingInput,
      bindingRevision,
      runtimeKind: runtime.mode,
      runtimePort: runtime.port,
      supersedesBindingId: bindingRevision === 2 ? previousBinding.bindingId : null,
      supersedesBindingSha256: bindingRevision === 2 ? sha256(previousBindingBytes) : null,
    });
    const bindingValidation = validateV2ProtocolBinding({
      ...bindingInput,
      binding,
      expectedBindingRevision: bindingRevision,
      supersededBinding: previousBinding,
      supersededBindingBytes: previousBindingBytes,
    });
    if (!bindingValidation.safe) {
      console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_BINDING', reason: 'V2_BINDING_SUCCESSOR_INVALID', bindingFailures: bindingValidation.failures }, null, 2));
      process.exitCode = 1;
      return;
    }
    const bindingWrite = writeV2ProtocolBindingReceipt({ bindingPath, binding });
    console.log(JSON.stringify({ status: 'V2_BINDING_GREEN', bindingPath, binding, bindingWrite, previousBindingPath, casesExposed: 0, casesExecuted: 0 }, null, 2));
    return;
  }

  const binding = existsSync(bindingPath) ? JSON.parse(readFileSync(bindingPath, 'utf8')) : null;
  const bindingValidation = validateV2ProtocolBinding({
    ...bindingInput,
    binding,
    expectedBindingRevision: bindingRevision,
    supersededBinding: previousBinding,
    supersededBindingBytes: previousBindingBytes,
  });
  const integrity = { ...baseIntegrity, v2Binding: bindingValidation.safe };
  if (!Object.values(integrity).every(Boolean)) {
    console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_CASE_1', integrity, bindingFailures: bindingValidation.failures, manifestSha256, receiptSha256 }, null, 2));
    process.exitCode = 1;
    return;
  }
  if (runtime.mode === 'TASK13' && listenerPidForPort(3400) !== null) {
    console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_CASE_1', reason: 'STALE_RUNTIME_REJECTED', pid: listenerPidForPort(3400) }, null, 2));
    process.exitCode = 1;
    return;
  }
  if (runtime.mode === 'DOCKER' && listenerPidForPort(3400) !== null) {
    console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_CASE_1', reason: 'SECONDARY_RUNTIME_PRESENT', port: 3400 }, null, 2));
    process.exitCode = 1;
    return;
  }

  const integrityProbe = async ({ stage } = {}) => {
    try {
      const probeManifestBytes = readFileSync(manifestPath);
      const probeReceiptBytes = readFileSync(receiptPath);
      const probeBinding = JSON.parse(readFileSync(bindingPath, 'utf8'));
      const probeValidation = validateV2ProtocolBinding({
        ...bindingInput,
        binding: probeBinding,
        frozenManifestBytes: probeManifestBytes,
        freezeReceiptBytes: probeReceiptBytes,
        expectedBindingRevision: bindingRevision,
        supersededBinding: previousBinding,
        supersededBindingBytes: previousBindingBytes,
      });
      return probeValidation.safe
        ? { safe: true }
        : { safe: false, reasonCode: 'EXECUTION_INTEGRITY_PROBE_FAILED', guardId: 'V2_PROTOCOL_BINDING', stage, failures: probeValidation.failures };
    } catch (error) {
      return { safe: false, reasonCode: 'EXECUTION_INTEGRITY_PROBE_UNAVAILABLE', guardId: 'V2_PROTOCOL_BINDING', stage, message: error?.message || String(error) };
    }
  };

  const backend = runtime.requiresOwnedStartup ? spawn(process.execPath, ['src/server.js'], {
    cwd: backendRoot,
    env: { ...process.env, PORT: '3400', SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  }) : null;
  let backendStdout = '';
  let backendStderr = '';
  backend?.stdout.on('data', (chunk) => { backendStdout += chunk; });
  backend?.stderr.on('data', (chunk) => { backendStderr += chunk; });
  try {
    const health = await waitForHealth(runtime.apiBase);
    if (!health) {
      console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_CASE_1', reason: 'HEALTHCHECK_FAILED', backendStdout, backendStderr }, null, 2));
      process.exitCode = 1;
    } else {
      const effectiveRuntimeReceipt = createEffectiveRuntimeReceipt({
        originalReceipt: receipt,
        binding,
      });
      const result = await executeGovernedManifest({
        frozenManifestBytes: manifestBytes,
        contractPacketBytes: packetBytes,
        receipt: effectiveRuntimeReceipt,
        provenanceReceipt: provenance,
        expectedSchemaVersion: manifest.schemaVersion,
        executionOrder,
        executionProtocolId: binding.executionProtocolId,
        ordinaryMismatchPolicy: binding.ordinaryMismatchPolicy,
        integrityProbe,
        runtimeProof: {
          healthcheck: provenance.runtimeBinding?.healthStatus || 'PASS',
          mode: 'NEW',
          authoritativePath: provenance.runtimeBinding?.authority?.liveAuthoritativePath || 'NEW_TYPED_EVIDENCE',
          semanticAuthorityCount: Number(provenance.runtimeBinding?.authority?.semanticAuthorityCount ?? 1),
          shadowSemanticAuthorityCount: Number(provenance.runtimeBinding?.authority?.shadowSemanticAuthorityCount ?? 0),
          runtimeFallbackCount: Number(provenance.runtimeBinding?.authority?.runtimeFallbackCount ?? 0),
          downstreamSemanticRedecisionCount: Number(provenance.runtimeBinding?.authority?.downstreamSemanticRedecisionCount ?? 0),
        },
        sessionFactory: createDemoSessionFactory({ apiBase: runtime.apiBase }),
        transport: createCanonicalHttpTransport({ apiBase: runtime.apiBase }),
        compare: compareExpectedContract,
        contractPacket: packet,
        fixtureRegistry,
      });
      const executionReceipt = createGovernedExecutionReceipt({
        baseReceipt: {
          receiptSchemaVersion: EXECUTION_RECEIPT_SCHEMA_VERSION,
          executionAttemptId: process.env.M18_EXECUTION_ATTEMPT_ID || null,
          acceptanceId: artifactPrefix,
          frozenManifestSha256: receipt.manifestSha256,
          freezeReceiptSha256: receiptSha256,
          contractPacketSha256: receipt.contractPacketSha256,
          executionOrderSha256: receipt.executionOrderSha256,
          protocolBindingId: binding.bindingId,
          protocolBindingSha256: sha256(readFileSync(bindingPath)),
        },
        result,
        executionOrderCount: executionOrder.length,
        executionProtocolId: result.executionProtocolId || binding.executionProtocolId,
        currentSourceManifest: provenance.endManifestSha256 || provenance.startManifestSha256 || null,
        currentSourceContentIdentity: provenance.runtimeBinding?.sourceIdentity || null,
        manifestCases: manifest.cases,
      });
      const executionReceiptPersistence = process.env.M18_EXECUTION_RECEIPT_OUTPUT_PATH
        ? writeExecutionReceipt({ receiptPath: resolve(root, process.env.M18_EXECUTION_RECEIPT_OUTPUT_PATH), receipt: executionReceipt })
        : { written: false, reason: 'M18_EXECUTION_RECEIPT_OUTPUT_PATH_NOT_SET' };
      const first = result.firstFailure;
      const firstRow = first?.row;
      const safeFirstFailure = executionReceipt.criticalFailure || (first ? {
        index: first.index,
        caseId: first.caseId,
        role: first.role,
        classification: first.classification,
        failureCount: Array.isArray(firstRow?.failures) ? firstRow.failures.length : 0,
      } : null);
      console.log(JSON.stringify({
        status: result.status,
        currentSourceRuntimeProven: 'YES',
        healthcheck: 'PASS',
        liveProvenanceMode: 'NEW',
        liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
        semanticAuthorityCount: 1,
        shadowSemanticAuthorityCount: 0,
        runtimeFallbackCount: 0,
        downstreamSemanticRedecisionCount: 0,
        executionProtocolId: binding.executionProtocolId,
        ordinaryMismatchPolicy: binding.ordinaryMismatchPolicy,
        integrityProbeRequired: binding.integrityProbeRequired,
        protocolBindingId: binding.bindingId,
        executedCount: result.executedCount,
        passCount: result.passCount,
        failCount: result.failCount,
        notRunCount: result.notRunCount,
        businessWriteExecution: result.businessWriteExecution,
        firstFailure: safeFirstFailure,
        manifestSha256,
        executionOrderSha256: receipt.executionOrderSha256,
        receiptSha256,
        manifestMutatedAfterFreeze: false,
        freezeReceiptMutated: false,
        backendPid: backend?.pid || provenance.runtimeBinding?.containerPid || null,
        runtimeMode: runtime.mode,
        runtimeApiBase: runtime.apiBase,
        executionReceipt,
        executionReceiptPersistence,
      }, null, 2));
      if (result.status !== 'GREEN') process.exitCode = 1;
    }
  } finally {
    if (backend) {
      backend.kill('SIGTERM');
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
      if (backend.exitCode === null) backend.kill('SIGKILL');
    }
  }
}

if (isMainModule()) {
  runFreshAcceptance().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
