import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  captureRunEndManifest,
  captureRunSourceManifest,
  createProvenanceReceipt,
  validateCanonicalOwnerTopology,
  verifyProvenanceReceipt,
} from './lib/m18RunScopedProvenance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const receiptPath = resolve(planDir, 'm18-post-r15-corrective-fresh-acceptance-20261009-provenance-receipt.json');
const expectedHeadSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().toUpperCase();
const expectedBranch = execFileSync('git', ['symbolic-ref', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const authorityObservation = {
  semanticAuthorityMode: 'NEW',
  liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
  semanticAuthorityCount: 1,
  shadowSemanticAuthorityCount: 0,
  runtimeFallbackCount: 0,
  downstreamSemanticRedecisionCount: 0,
};
const runtimeOwnerPaths = [
  { relativePath: 'backend/src/server.js', ownerClass: 'RUNTIME_ENTRYPOINT', lifecycleClass: 'CANONICAL_ENTRYPOINT' },
  { relativePath: 'backend/src/ai/chat/semanticAuthorityMode.js', ownerClass: 'SEMANTIC_AUTHORITY', lifecycleClass: 'CANONICAL_AUTHORITY' },
  { relativePath: 'backend/src/ai/chat/semanticEvidenceComposer.js', ownerClass: 'SEMANTIC_COMPOSER', lifecycleClass: 'CANONICAL_COMPOSER' },
  { relativePath: 'backend/src/ai/chat/authorizationGate.js', ownerClass: 'AUTHORIZATION', lifecycleClass: 'CANONICAL_AUTHORIZATION' },
  { relativePath: 'backend/src/services/authorizedProductAwareness.js', ownerClass: 'GROUNDING', lifecycleClass: 'CANONICAL_GROUNDING' },
  { relativePath: 'backend/scripts/lib/m18HoldoutExecutionAdapter.mjs', ownerClass: 'HOLDOUT_EXECUTION_PROTOCOL', lifecycleClass: 'M18_PROTOCOL_OWNER' },
  { relativePath: 'backend/scripts/m18_holdout_freeze_01_check.mjs', ownerClass: 'HOLDOUT_FREEZE_OWNER', lifecycleClass: 'M18_FREEZE_OWNER' },
  { relativePath: 'backend/scripts/m18_holdout_execution_integration_01_check.mjs', ownerClass: 'EXECUTION_HARNESS', lifecycleClass: 'M18_PROTOCOL_REGRESSION' },
  { relativePath: 'backend/scripts/m18_post_r15_fresh_acceptance_20261009_author.mjs', ownerClass: 'HOLDOUT_AUTHOR', lifecycleClass: 'M18_PHASE_B_AUTHORING' },
  { relativePath: 'backend/scripts/m18_post_r15_fresh_acceptance_20261009_audit.mjs', ownerClass: 'HOLDOUT_AUDITOR', lifecycleClass: 'M18_PHASE_B_AUDIT' },
  { relativePath: 'backend/scripts/m18_post_r15_fresh_acceptance_20261009_provenance.mjs', ownerClass: 'PHASE_B_PROVENANCE', lifecycleClass: 'M18_PHASE_B_PROVENANCE' },
  { relativePath: 'backend/scripts/lib/m18RunScopedProvenance.mjs', ownerClass: 'PROVENANCE_HELPER', lifecycleClass: 'RUN_SCOPED_AUTHORITY' },
];
const topologyResult = validateCanonicalOwnerTopology({
  repoRoot: root,
  topologyRegistry: { registryVersion: 'M18-RUN-SOURCE-TOPOLOGY-V1' },
  requiredOwnerClasses: [...new Set(runtimeOwnerPaths.map((item) => item.ownerClass))],
  runtimeOwnerPaths,
});
if (!topologyResult.safe) throw new Error(`OWNER_TOPOLOGY_INVALID:${topologyResult.failures.join(';')}`);
const runId = `m18-post-r15-provenance-${Date.now()}`;
const runStart = captureRunSourceManifest({
  repoRoot: root,
  expectedHeadSha,
  branchPolicy: { expectedBranch, allowDetached: false },
  topologyResult,
  runtimeOwnerPaths,
  relevantIgnoredPaths: [],
  authorityObservation,
  runId,
  createdAt: new Date().toISOString(),
});
if (!runStart.safe) throw new Error(`SOURCE_MANIFEST_CAPTURE_FAILED:${runStart.failureReasons.join(';')}`);
const runEnd = captureRunEndManifest({
  startManifest: runStart.manifest,
  repoRoot: root,
  expectedHeadSha,
  branchPolicy: { expectedBranch, allowDetached: false },
  topologyResult,
  runtimeOwnerPaths,
  relevantIgnoredPaths: [],
  authorityObservation,
  capturedAt: new Date().toISOString(),
});
if (!runEnd.safe) throw new Error(`SOURCE_MANIFEST_END_CAPTURE_FAILED:${runEnd.failureReasons.join(';')}`);
const receiptResult = createProvenanceReceipt({
  runStart,
  runEnd,
  runtimeBinding: { sourceManifestSha256: runStart.manifestSha256, mode: 'PREPARATION_ONLY', runtimeExecution: false },
  suiteResults: [{ businessWriteExecution: 0, authorizationMutation: 0, externalLlmProviderCount: 0, externalLlmNetworkCallCount: 0, llmApiSecretCount: 0, runtimeFallbackCount: 0, downstreamSemanticRedecisionCount: 0, shadowSemanticAuthorityCount: 0 }],
  finalStatus: 'GREEN',
  capturedAt: new Date().toISOString(),
});
const verification = verifyProvenanceReceipt({
  receiptBytes: receiptResult.receipt,
  expectedRunId: runId,
  expectedStartSha256: runStart.manifestSha256,
  expectedEndSha256: runEnd.manifestSha256,
});
if (!verification.safe) throw new Error(`PROVENANCE_RECEIPT_INVALID:${verification.failureReasons.join(';')}`);
writeFileSync(receiptPath, JSON.stringify(receiptResult.receipt, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  status: 'GREEN',
  runId,
  sourceManifestSha256: runStart.manifestSha256,
  sourceContentIdentity: runStart.manifest.sourceIdentityDigest,
  endManifestSha256: runEnd.manifestSha256,
  sourceMutation: false,
  provenanceReceiptSha256: receiptResult.receiptSha256,
  receiptPath,
  runtimeExecution: false,
  businessWrites: 0,
}, null, 2));
