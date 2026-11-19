import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createCanonicalHttpTransport,
  createDemoSessionFactory,
  executeGovernedManifest,
  compareExpectedContract,
  adaptExpectedContract,
  validateFreezeReceipt,
  sha256,
} from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const manifestPath = resolve(planDir, 'm18-replacement-fresh-unseen-56-governed-v4r1-frozen-20261005.json');
const receiptPath = resolve(planDir, 'm18-replacement-fresh-unseen-56-governed-v4r1-freeze-receipt-20261005.json');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const manifestBytes = readFileSync(manifestPath);
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const packetBytes = readFileSync(packetPath);
const packet = JSON.parse(packetBytes.toString('utf8'));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const executionOrder = receipt.executionOrder;
const receiptValidation = validateFreezeReceipt({
  frozenManifestBytes: manifestBytes,
  contractPacketBytes: packetBytes,
  receipt,
  expectedSchemaVersion: manifest.schemaVersion,
  expectedExecutionOrder: executionOrder,
});
if (!receiptValidation.safe) {
  console.log(JSON.stringify({ status: 'BLOCKED', receiptValidation }, null, 2));
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
  console.log(JSON.stringify({
    status: result.status,
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
      actual: firstRow?.turns?.at(-1)?.actual ? {
        semanticScope: firstRow.turns.at(-1).actual.semanticScope,
        requestMode: firstRow.turns.at(-1).actual.requestMode,
        semanticAction: firstRow.turns.at(-1).actual.semanticAction,
        action: firstRow.turns.at(-1).actual.action,
        object: firstRow.turns.at(-1).actual.object,
        reference: firstRow.turns.at(-1).actual.reference,
        resolutionStatus: firstRow.turns.at(-1).actual.resolutionStatus,
        task: firstRow.turns.at(-1).actual.task,
        operation: firstRow.turns.at(-1).actual.operation,
        authorizationClass: firstRow.turns.at(-1).actual.authorizationClass,
        authorizationNativeStatus: firstRow.turns.at(-1).actual.authorizationNativeStatus,
        authority: firstRow.turns.at(-1).actual.authority,
      } : null,
      failures: firstRow?.failures || [],
    } : null,
    manifestSha256: sha256(manifestBytes),
    receiptManifestSha256: receipt.manifestSha256,
  }, null, 2));
  if (result.status !== 'GREEN') process.exitCode = 1;
}
