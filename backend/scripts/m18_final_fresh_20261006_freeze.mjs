import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createFreezeReceipt, sha256 } from './lib/m18HoldoutExecutionAdapter.mjs';
import { freezeManifestIfEligible, loadContractPacket } from './lib/m18HoldoutGovernance.mjs';
import {
  completeContractBinding,
  completeContractBindingSha256,
  currentContractBinding,
  COMPLETE_M18_SOURCE_BINDING_VERSION,
  validateCompleteContractBinding,
} from './lib/m18CurrentSemanticContract.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const artifactPrefix = process.env.M18_FINAL_ARTIFACT_PREFIX || 'm18-final-fresh-unseen-56-governed-v4r2r2-20261006';
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, `${artifactPrefix}-candidate.json`);
const auditPath = resolve(planDir, `${artifactPrefix}-audit.json`);
const authorPath = resolve(planDir, `${artifactPrefix}-author.json`);
const provenancePath = resolve(planDir, `${artifactPrefix}-provenance-receipt.json`);
const frozenPath = resolve(planDir, `${artifactPrefix}-frozen.json`);
const receiptPath = resolve(planDir, `${artifactPrefix}-freeze-receipt.json`);

if (existsSync(frozenPath) || existsSync(receiptPath)) throw new Error('FROZEN_TARGET_ALREADY_EXISTS');
const packetBytes = readFileSync(packetPath);
const candidateBytes = readFileSync(candidatePath);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const author = JSON.parse(readFileSync(authorPath, 'utf8'));
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
const currentBinding = currentContractBinding(root);
const currentBindingSha256 = sha256(Buffer.from(JSON.stringify(currentBinding), 'utf8'));
const currentCompleteBinding = completeContractBinding(root);
const currentCompleteBindingSha256 = completeContractBindingSha256(root);
if (!validateCompleteContractBinding(currentCompleteBinding)
  || author.sourceBinding?.bindingVersion !== COMPLETE_M18_SOURCE_BINDING_VERSION
  || author.sourceBinding?.completeBindingSha256 !== currentCompleteBindingSha256
  || author.sourceBinding?.parentBindingSha256 !== currentBindingSha256) {
  throw new Error('COMPLETE_SOURCE_BINDING_NOT_CURRENT');
}
if (provenance.finalStatus !== 'GREEN' || provenance.sourceMutation !== false || provenance.startManifestSha256 !== provenance.endManifestSha256) {
  throw new Error('PROVENANCE_RECEIPT_NOT_GREEN');
}

const frozen = freezeManifestIfEligible({ manifestBytes: candidateBytes, contractPacketBytes: packetBytes, audit });
if (!frozen.safe || !frozen.written) throw new Error(`FREEZE_BLOCKED:${JSON.stringify(frozen.failureReasons || [])}`);
const frozenManifest = {
  ...frozen.frozenManifest,
  manifestId: `${artifactPrefix.toUpperCase().replace(/[^A-Z0-9]+/gu, '-')}-FROZEN`,
  frozenAt: new Date().toISOString(),
  preFreezeBatchCorrectionCount: 0,
  provenanceReceiptSha256: sha256(Buffer.from(JSON.stringify(provenance, null, 2) + '\n', 'utf8')),
  sourceBinding: author.sourceBinding,
};
const frozenBytes = Buffer.from(JSON.stringify(frozenManifest, null, 2) + '\n', 'utf8');
writeFileSync(frozenPath, frozenBytes);
const executionOrder = frozenManifest.cases.map((testCase) => testCase.CASE_ID);
const receipt = createFreezeReceipt({
  frozenManifestBytes: frozenBytes,
  contractPacketBytes: packetBytes,
  schemaVersion: frozenManifest.schemaVersion,
  executionOrder,
  authorContextId: author.authorContextId,
  auditorContextId: audit.auditorContextId,
  provenanceReceiptSha256: frozenManifest.provenanceReceiptSha256,
});
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  status: 'GREEN',
  frozenManifestPath: frozenPath,
  freezeReceiptPath: receiptPath,
  provenanceReceiptPath: provenancePath,
  manifestSha256: sha256(frozenBytes),
  executionOrderSha256: receipt.executionOrderSha256,
  freezeReceiptSha256: sha256(Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8')),
  provenanceReceiptSha256: frozenManifest.provenanceReceiptSha256,
  freezeTimestamp: frozenManifest.frozenAt,
  authorContextId: author.authorContextId,
  auditorContextId: audit.auditorContextId,
  caseCount: frozenManifest.cases.length,
  preFreezeBatchCorrectionCount: 0,
}, null, 2));
