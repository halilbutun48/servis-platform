import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  compareExpectedContract,
  createCanonicalHttpTransport,
  createDemoSessionFactory,
  executeGovernedManifest,
  sha256,
} from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const base = process.env.M18_RUNTIME_API_BASE || 'http://127.0.0.1:3400';
const dir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const manifestPath = resolve(dir, 'm18-action-reference-r2-fresh-unseen-56-governed-v4r2r2-frozen-20261005.json');
const packetPath = resolve(dir, 'm18-holdout-contract-packet-v2.json');
const receiptPath = resolve(dir, 'm18-action-reference-r2-fresh-unseen-56-governed-v4r2r2-freeze-receipt-20261005.json');
const manifestBytes = readFileSync(manifestPath);
const packetBytes = readFileSync(packetPath);
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const packet = JSON.parse(packetBytes.toString('utf8'));
const executionOrder = manifest.frozenExecutionOrder;

let healthcheck = 'FAIL';
try {
  const response = await fetch(`${base}/health`);
  healthcheck = response.status === 200 ? 'PASS' : `HTTP_${response.status}`;
} catch (error) {
  healthcheck = `ERROR:${error?.message || String(error)}`;
}

const result = await executeGovernedManifest({
  frozenManifestBytes: manifestBytes,
  contractPacketBytes: packetBytes,
  receipt,
  expectedSchemaVersion: manifest.schemaVersion,
  executionOrder,
  runtimeProof: {
    healthcheck,
    mode: 'NEW',
    authoritativePath: 'NEW_TYPED_EVIDENCE',
    semanticAuthorityCount: 1,
    shadowSemanticAuthorityCount: 0,
    runtimeFallbackCount: 0,
    downstreamSemanticRedecisionCount: 0,
  },
  sessionFactory: createDemoSessionFactory({ apiBase: base }),
  transport: createCanonicalHttpTransport({ apiBase: base }),
  compare: (expected, actual, contractPacket) => compareExpectedContract(expected, actual, contractPacket),
  contractPacket: packet,
});

const firstFailure = result.firstFailure;
const firstRow = firstFailure?.row;
const lastTurn = firstRow?.turns?.at(-1);
console.log(JSON.stringify({
  manifestSha256: sha256(manifestBytes),
  receiptManifestSha256: receipt.manifestSha256,
  executionOrderSha256: receipt.executionOrderSha256,
  healthcheck,
  status: result.status,
  executedCount: result.executedCount,
  passCount: result.passCount,
  failCount: result.failCount,
  notRunCount: result.notRunCount,
  businessWriteExecution: result.businessWriteExecution,
  firstFailure: firstFailure ? {
    index: firstFailure.index,
    caseId: firstFailure.caseId,
    role: firstFailure.role,
    classification: firstFailure.classification,
    error: firstRow?.error,
    failures: firstRow?.failures,
    rawTurns: firstRow?.turns?.map((turn) => turn.rawInput),
    expected: firstFailure.caseId ? adaptExpectedForReport(manifest, firstFailure.caseId) : null,
    actual: lastTurn?.actual ? compactActual(lastTurn.actual) : null,
  } : null,
}, null, 2));

function adaptExpectedForReport(candidate, caseId) {
  const item = candidate.cases.find((entry) => entry.CASE_ID === caseId);
  if (!item) return null;
  return {
    semanticScope: item.EXPECTED_SEMANTIC_SCOPE,
    requestMode: item.EXPECTED_REQUEST_MODE,
    semanticAction: item.EXPECTED_SEMANTIC_ACTION,
    action: item.EXPECTED_ACTION,
    object: item.EXPECTED_OBJECT,
    reference: item.EXPECTED_REFERENCE_CLASS,
    resolutionStatus: item.EXPECTED_RESOLUTION_STATUS,
    task: item.EXPECTED_TASK_OR_TASK_FAMILY,
    operation: item.EXPECTED_OPERATION_OR_OPERATION_FAMILY,
    authorizationClass: item.EXPECTED_AUTHORIZATION_CLASS,
  };
}

function compactActual(actual) {
  return {
    semanticScope: actual.semanticScope,
    requestMode: actual.requestMode,
    semanticAction: actual.semanticAction,
    action: actual.action,
    object: actual.object,
    reference: actual.reference,
    resolutionStatus: actual.resolutionStatus,
    task: actual.task,
    operation: actual.operation,
    authorizationClass: actual.authorizationClass,
    authorizationNativeStatus: actual.authorizationNativeStatus,
    authority: actual.authority,
  };
}
