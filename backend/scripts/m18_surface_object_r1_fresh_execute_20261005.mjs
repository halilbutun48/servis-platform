import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  adaptExpectedContract,
  compareExpectedContract,
  createCanonicalHttpTransport,
  createDemoSessionFactory,
  executeGovernedManifest,
  extractCanonicalActual,
  sha256,
  validateFreezeReceipt,
} from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const manifestPath = resolve(planDir, 'm18-surface-object-r1-fresh-unseen-56-governed-v4r2r1-frozen-20261005.json');
const receiptPath = resolve(planDir, 'm18-surface-object-r1-fresh-unseen-56-governed-v4r2r1-freeze-receipt-20261005.json');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const expectedManifestSha256 = 'B79E8EB281B63DB86EE8B3E122FC1FF8CDA538EC5F6B6B20E3291F67436F1094';
const expectedReceiptSha256 = '58B00C964D95D2661C14FB6157B030A7C919E9A46F6D6B4B1A03A7AB4FDDA41F';
const expectedExecutionOrderSha256 = 'C8DF2D04DA862CECB8CBCF742024BF156BFFCF94F418565D49814FD6E94FD860';
const manifestBytes = readFileSync(manifestPath);
const receiptBytes = readFileSync(receiptPath);
const packetBytes = readFileSync(packetPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const packet = JSON.parse(packetBytes.toString('utf8'));
const executionOrder = receipt.executionOrder;
const manifestSha256 = sha256(manifestBytes);
const receiptSha256 = sha256(receiptBytes);
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
  executionOrderIntegrity: receipt.executionOrderSha256 === expectedExecutionOrderSha256,
  receiptValidation: receiptValidation.safe,
};
let currentSourceRuntimeProven = false;
let preflight = null;
if (health && Object.values(integrity).every(Boolean)) {
  const firstCase = manifest.cases[0];
  const sessionFactory = createDemoSessionFactory();
  const transport = createCanonicalHttpTransport();
  try {
    const session = await sessionFactory(firstCase.ROLE, `m18-r4r2r1-preflight-${Date.now()}`);
    const response = await transport({
      endpoint: '/api/ai/copilot',
      method: 'POST',
      session,
      item: {
        role: firstCase.ROLE,
        screenContext: firstCase.EXECUTION_CONTEXT.screen ? {
          id: firstCase.EXECUTION_CONTEXT.screen.id,
          path: firstCase.EXECUTION_CONTEXT.screen.path,
          label: firstCase.EXECUTION_CONTEXT.screen.label,
          role: firstCase.EXECUTION_CONTEXT.screen.role,
        } : null,
      },
      message: 'Bu ekranın yetkili kullanım sınırlarını kısaca açıklar mısın?',
    });
    const actual = extractCanonicalActual(response.body ?? response);
    preflight = { status: response.status, authority: actual.authority };
    currentSourceRuntimeProven = response.status === 200
      && actual.authority?.mode === 'NEW'
      && actual.authority?.authoritativePath === 'NEW_TYPED_EVIDENCE'
      && actual.authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT === 1
      && actual.authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT === 0
      && actual.authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT === 0
      && actual.authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT === 0;
  } catch (error) {
    preflight = { error: error?.message || String(error) };
  }
}

if (!health || !Object.values(integrity).every(Boolean) || !currentSourceRuntimeProven) {
  console.log(JSON.stringify({
    status: 'BLOCKED_BEFORE_CASE_1',
    currentSourceRuntimeProven,
    healthcheck: health ? 'PASS' : 'FAIL',
    integrity,
    manifestSha256,
    receiptSha256,
    preflight,
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
    frozenManifestSha256: manifestSha256,
    freezeReceiptSha256: receiptSha256,
    executionOrderSha256: receipt.executionOrderSha256,
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
    preflight,
  }, null, 2));
  if (result.status !== 'GREEN') process.exitCode = 1;
}
