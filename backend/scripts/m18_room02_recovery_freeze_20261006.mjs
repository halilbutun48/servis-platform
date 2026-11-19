import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  createFreezeReceipt,
  sha256,
} from './lib/m18HoldoutExecutionAdapter.mjs';
import {
  freezeManifestIfEligible,
  loadContractPacket,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-candidate.json');
const auditPath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-audit.json');
const authorPath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-author.json');
const frozenPath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-frozen.json');
const receiptPath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-freeze-receipt.json');
const provenancePath = resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-provenance-receipt.json');

const packetBytes = readFileSync(packetPath);
const candidateBytes = readFileSync(candidatePath);
const packet = loadContractPacket(packetBytes);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const author = JSON.parse(readFileSync(authorPath, 'utf8'));
if (existsSync(frozenPath) || existsSync(receiptPath) || existsSync(provenancePath)) throw new Error('FROZEN_TARGET_ALREADY_EXISTS');

const provenanceRun = spawnSync(process.execPath, [resolve(root, 'backend/scripts/m18_task13_current_source_startup_01_check.mjs')], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
  timeout: 180000,
  env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
});
if (provenanceRun.status !== 0) throw new Error(`PROVENANCE_CAPTURE_FAILED:${provenanceRun.stderr || provenanceRun.stdout}`);
const provenanceText = String(provenanceRun.stdout || '').trim();
const provenanceJson = JSON.parse(provenanceText.slice(provenanceText.indexOf('{')));
const provenanceReceipt = provenanceJson?.provenance?.provenanceReceipt?.receipt;
if (!provenanceReceipt || provenanceReceipt.finalStatus !== 'GREEN') throw new Error('PROVENANCE_RECEIPT_NOT_GREEN');
writeFileSync(provenancePath, JSON.stringify(provenanceReceipt, null, 2) + '\n', 'utf8');
const provenanceReceiptSha256 = sha256(Buffer.from(JSON.stringify(provenanceReceipt, null, 2) + '\n', 'utf8'));

const frozen = freezeManifestIfEligible({
  manifestBytes: candidateBytes,
  contractPacketBytes: packetBytes,
  audit,
});
if (!frozen.safe || !frozen.written) throw new Error(`FREEZE_BLOCKED:${JSON.stringify(frozen.failureReasons || [])}`);
const frozenManifest = {
  ...frozen.frozenManifest,
  manifestId: 'M18-R4-ROOM02-REPLACEMENT-FRESH-UNSEEN-56-20261006-FROZEN',
  frozenAt: new Date().toISOString(),
  preFreezeBatchCorrectionCount: 0,
  provenanceReceiptSha256,
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
  auditorContextId: JSON.parse(readFileSync(resolve(planDir, 'm18-room02-recovery-fresh-unseen-56-governed-20261006-audit.json'), 'utf8')).auditorContextId,
  provenanceReceiptSha256,
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
  provenanceReceiptSha256,
  freezeTimestamp: frozenManifest.frozenAt,
  caseCount: frozenManifest.cases.length,
  preFreezeBatchCorrectionCount: 0,
}, null, 2));
