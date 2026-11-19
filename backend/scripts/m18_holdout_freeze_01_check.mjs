import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { freezeManifestIfEligible } from './lib/m18HoldoutGovernance.mjs';
import {
  CRITICAL_FAILURE_STOP_POLICY,
  FIRST_FAILURE_STOP_POLICY,
  createFreezeReceipt,
  sha256 as executionSha256,
} from './lib/m18HoldoutExecutionAdapter.mjs';
import { verifyProvenanceReceipt } from './lib/m18RunScopedProvenance.mjs';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required governed-freeze input: ${name}`);
  return resolve(process.cwd(), value);
};

const manifestPath = required('M18_HOLDOUT_MANIFEST_PATH');
const contractPacketPath = required('M18_HOLDOUT_CONTRACT_PACKET_PATH');
const auditPath = required('M18_HOLDOUT_AUDIT_PATH');
const provenanceReceiptPath = required('M18_PROVENANCE_RECEIPT_PATH');
const manifestBytes = readFileSync(manifestPath);
const contractPacketBytes = readFileSync(contractPacketPath);
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const provenanceReceipt = JSON.parse(readFileSync(provenanceReceiptPath, 'utf8'));
const provenanceVerification = verifyProvenanceReceipt({
  receiptBytes: provenanceReceipt,
  expectedRunId: provenanceReceipt.runId,
  expectedStartSha256: provenanceReceipt.startManifestSha256,
  expectedEndSha256: provenanceReceipt.endManifestSha256,
});
if (!provenanceVerification.safe || !['GREEN', 'PASS'].includes(String(provenanceReceipt.finalStatus || '').toUpperCase())) {
  console.log(JSON.stringify({ FREEZE_ELIGIBLE: 'NO', WRITTEN: 'NO', FAILURE_REASONS: ['INVALID_PROVENANCE_RECEIPT', ...(provenanceVerification.failureReasons || [])] }, null, 2));
  process.exitCode = 1;
}
const result = freezeManifestIfEligible({ manifestBytes, contractPacketBytes, audit });

let frozenBytes = result.frozenBytes;
let receipt = null;
let receiptFailure = null;
if (result.safe) {
  const receiptPath = process.env.M18_HOLDOUT_FREEZE_RECEIPT_OUTPUT_PATH;
  if (!receiptPath) {
    receiptFailure = 'MISSING_FREEZE_RECEIPT_OUTPUT_PATH';
  } else {
    const candidate = JSON.parse(result.frozenBytes.toString('utf8'));
    const executionOrder = candidate.cases.map((item) => item.CASE_ID);
    candidate.frozenExecutionOrder = executionOrder;
    candidate.freezeTimestamp = new Date().toISOString();
    const executionProtocolId = process.env.M18_EXECUTION_PROTOCOL_ID || null;
    const ordinaryMismatchPolicy = process.env.M18_ORDINARY_MISMATCH_POLICY || FIRST_FAILURE_STOP_POLICY;
    const criticalFailurePolicy = process.env.M18_CRITICAL_FAILURE_POLICY || CRITICAL_FAILURE_STOP_POLICY;
    if (executionProtocolId) {
      candidate.executionProtocolId = executionProtocolId;
      candidate.ordinaryMismatchPolicy = ordinaryMismatchPolicy;
      candidate.criticalFailurePolicy = criticalFailurePolicy;
    }
    frozenBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
    receipt = createFreezeReceipt({
      frozenManifestBytes: frozenBytes,
      contractPacketBytes,
      schemaVersion: candidate.schemaVersion,
      executionOrder,
      freezeTimestamp: candidate.freezeTimestamp,
      authorContextId: audit.authorContextId,
      auditorContextId: audit.auditorContextId,
      provenanceReceiptSha256: provenanceReceipt.receiptSha256,
      executionProtocolId,
      ordinaryMismatchPolicy,
      criticalFailurePolicy,
    });
    writeFileSync(resolve(process.cwd(), receiptPath), JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  }
}

if (result.safe && !receiptFailure && process.env.M18_HOLDOUT_FREEZE_OUTPUT_PATH) {
  writeFileSync(resolve(process.cwd(), process.env.M18_HOLDOUT_FREEZE_OUTPUT_PATH), frozenBytes, 'utf8');
}

console.log(JSON.stringify({
  FREEZE_ELIGIBLE: result.freezeEligible && !receiptFailure ? 'YES' : 'NO',
  WRITTEN: result.written && !receiptFailure && Boolean(process.env.M18_HOLDOUT_FREEZE_OUTPUT_PATH) ? 'YES' : 'NO',
  FAILURE_REASONS: [...(result.failureReasons || []), ...(receiptFailure ? [receiptFailure] : [])],
  CANDIDATE_MANIFEST_SHA256: result.safe ? result.frozenManifest.candidateManifestSha256 : undefined,
  FROZEN_MANIFEST_SHA256: result.safe && !receiptFailure ? executionSha256(frozenBytes) : undefined,
  CONTRACT_PACKET_SHA256: result.safe ? result.frozenManifest.contractPacketSha256 : undefined,
  EXECUTION_ORDER_SHA256: receipt?.executionOrderSha256,
  FREEZE_RECEIPT_SHA256: receipt ? executionSha256(Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8')) : undefined,
}, null, 2));

if (!result.safe || receiptFailure) process.exitCode = 1;
