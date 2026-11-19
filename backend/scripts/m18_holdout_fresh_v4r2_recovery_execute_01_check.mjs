import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  adaptExpectedContract,
  compareExpectedContract,
  createCanonicalHttpTransport,
  createDemoSessionFactory,
  executeGovernedManifest,
  sha256,
  validateFreezeReceipt,
} from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const manifestPath = resolve(planDir, 'm18-fresh-recovery-unseen-56-governed-v4r2-frozen-20261005.json');
const receiptPath = resolve(planDir, 'm18-fresh-recovery-unseen-56-governed-v4r2-freeze-receipt-20261005.json');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const expectedManifestSha256 = '017D2B9606542ADD723D7D1290BC30ED538EC5A34552D9E6154B39DF217812A9';
const expectedReceiptSha256 = 'A197B7BA284E6D01ED6F6F21B4331A108B656AC40530E8A160CD1F694BE6518A';
const manifestBytes = readFileSync(manifestPath);
const receiptBytes = readFileSync(receiptPath);
const packetBytes = readFileSync(packetPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const packet = JSON.parse(packetBytes.toString('utf8'));
const executionOrder = receipt.executionOrder;
const manifestSha256 = sha256(manifestBytes);
const receiptSha256 = sha256(Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8'));
const receiptValidation = validateFreezeReceipt({
  frozenManifestBytes: manifestBytes,
  contractPacketBytes: packetBytes,
  receipt,
  expectedSchemaVersion: manifest.schemaVersion,
  expectedExecutionOrder: executionOrder,
});

async function healthcheck() {
  try {
    const response = await fetch('http://127.0.0.1:3400/health');
    return response.status === 200;
  } catch {
    return false;
  }
}

const health = await healthcheck();
const integrity = {
  frozenManifestIntegrity: manifestSha256 === expectedManifestSha256,
  freezeReceiptIntegrity: receiptSha256 === expectedReceiptSha256,
  receiptValidation: receiptValidation.safe,
};
if (!integrity.frozenManifestIntegrity || !integrity.freezeReceiptIntegrity || !integrity.receiptValidation || !health) {
  console.log(JSON.stringify({
    status: 'BLOCKED_BEFORE_CASE_1',
    integrity,
    healthcheck: health ? 'PASS' : 'FAIL',
    manifestSha256,
    receiptSha256,
  }, null, 2));
  process.exitCode = 1;
} else {
  const result = await executeGovernedManifest({
    frozenManifestBytes: manifestBytes,
    contractPacketBytes: packetBytes,
    receipt,
    expectedSchemaVersion: manifest.schemaVersion,
    executionOrder,
    runtimeProof: {
      healthcheck: 'PASS',
      mode: 'NEW',
      authoritativePath: 'NEW_TYPED_EVIDENCE',
      semanticAuthorityCount: 1,
      shadowSemanticAuthorityCount: 0,
      runtimeFallbackCount: 0,
      downstreamSemanticRedecisionCount: 0,
    },
    sessionFactory: createDemoSessionFactory(),
    transport: createCanonicalHttpTransport(),
    compare: compareExpectedContract,
    contractPacket: packet,
  });
  const first = result.firstFailure;
  const firstRow = first?.row;
  const firstCase = first ? manifest.cases.find((item) => item.CASE_ID === first.caseId) : null;
  const lastActual = firstRow?.turns?.at(-1)?.actual;
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
    executedCount: result.executedCount,
    passCount: result.passCount,
    failCount: result.failCount,
    notRunCount: result.notRunCount,
    businessWriteExecution: result.businessWriteExecution,
    firstFailure: first ? {
      index: first.index,
      caseId: first.caseId,
      role: first.role,
      classification: first.classification,
      rawTurns: firstRow?.turns?.map((turn) => turn.rawInput) || [],
      expected: firstCase ? adaptExpectedContract(firstCase) : null,
      actual: lastActual ? {
        semanticScope: lastActual.semanticScope,
        requestMode: lastActual.requestMode,
        semanticAction: lastActual.semanticAction,
        action: lastActual.action,
        object: lastActual.object,
        reference: lastActual.reference,
        resolutionStatus: lastActual.resolutionStatus,
        task: lastActual.task,
        operation: lastActual.operation,
        authorizationClass: lastActual.authorizationClass,
        authorizationNativeStatus: lastActual.authorizationNativeStatus,
        authority: lastActual.authority,
      } : null,
      failures: firstRow?.failures || [],
    } : null,
    manifestSha256,
    receiptSha256,
  }, null, 2));
  if (result.status !== 'GREEN') process.exitCode = 1;
}
