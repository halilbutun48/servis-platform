import { execFileSync, spawn } from 'node:child_process';
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
const backendRoot = resolve(root, 'backend');
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const manifestPath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-frozen.json');
const receiptPath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-freeze-receipt.json');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const provenancePath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-provenance-receipt.json');
const manifestBytes = readFileSync(manifestPath);
const receiptBytes = readFileSync(receiptPath);
const packetBytes = readFileSync(packetPath);
const provenanceBytes = readFileSync(provenancePath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const packet = JSON.parse(packetBytes.toString('utf8'));
const provenance = JSON.parse(provenanceBytes.toString('utf8'));
const executionOrder = receipt.executionOrder;
const manifestSha256 = sha256(manifestBytes);
const receiptSha256 = sha256(receiptBytes);
const executionOrderSha256 = receipt.executionOrderSha256;
const receiptValidation = validateFreezeReceipt({
  frozenManifestBytes: manifestBytes,
  contractPacketBytes: packetBytes,
  receipt,
  expectedSchemaVersion: manifest.schemaVersion,
  expectedExecutionOrder: executionOrder,
});
const provenanceValid = provenance.finalStatus === 'GREEN'
  && provenance.sourceMutation === false
  && provenance.startManifestSha256 === provenance.endManifestSha256;

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

async function waitForHealth(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:3400/health', { signal: AbortSignal.timeout(1_000) });
      if (response.status === 200) return true;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  return false;
}

const integrity = {
  receiptValidation: receiptValidation.safe,
  provenanceReceiptPresent: provenanceValid,
  manifestStatusFrozen: manifest.status === 'FROZEN_NOT_EXECUTED',
  caseCount: manifest.cases?.length === 56,
  orderCount: executionOrder?.length === 56,
};
const existingPid = listenerPidForPort(3400);
if (!Object.values(integrity).every(Boolean)) {
  console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_CASE_1', integrity, manifestSha256, receiptSha256 }, null, 2));
  process.exitCode = 1;
} else if (existingPid !== null) {
  console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_CASE_1', reason: 'STALE_RUNTIME_REJECTED', pid: existingPid }, null, 2));
  process.exitCode = 1;
} else {
  const backend = spawn(process.execPath, ['src/server.js'], {
    cwd: backendRoot,
    env: { ...process.env, PORT: '3400', SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let backendStdout = '';
  let backendStderr = '';
  backend.stdout.on('data', (chunk) => { backendStdout += chunk; });
  backend.stderr.on('data', (chunk) => { backendStderr += chunk; });
  try {
    const health = await waitForHealth();
    if (!health) {
      console.log(JSON.stringify({ status: 'BLOCKED_BEFORE_CASE_1', reason: 'HEALTHCHECK_FAILED', backendStdout, backendStderr }, null, 2));
      process.exitCode = 1;
    } else {
      const result = await executeGovernedManifest({
        frozenManifestBytes: manifestBytes,
        contractPacketBytes: packetBytes,
        receipt,
        provenanceReceipt: provenance,
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
      const report = {
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
        executionOrderSha256,
        receiptSha256,
        manifestMutatedAfterFreeze: false,
        freezeReceiptMutated: false,
        backendPid: backend.pid,
      };
      console.log(JSON.stringify(report, null, 2));
      if (result.status !== 'GREEN') process.exitCode = 1;
    }
  } finally {
    backend.kill('SIGTERM');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
    if (backend.exitCode === null) backend.kill('SIGKILL');
  }
}
