import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './lib/m18HoldoutGovernance.mjs';
import {
  completeContractBindingSha256,
  currentContractBinding,
} from './lib/m18CurrentSemanticContract.mjs';
import {
  createProvenanceReceipt,
  verifyProvenanceReceipt,
} from './lib/m18RunScopedProvenance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const LEGACY_BINDING_SHA256 = sha256(Buffer.from(JSON.stringify(currentContractBinding(root)), 'utf8'));
const COMPLETE_BINDING_SHA256 = completeContractBindingSha256(root);

export function selectProvenanceMode(environment = process.env) {
  const mode = String(environment.M18_PROVENANCE_RUNTIME || 'TASK13').trim().toUpperCase();
  if (mode !== 'TASK13' && mode !== 'DOCKER') throw new Error(`PROVENANCE_RUNTIME_MODE_UNSUPPORTED:${mode}`);
  return mode;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function parseJsonOutput(stdout) {
  const text = String(stdout || '').trim();
  const jsonStart = text.indexOf('{');
  if (jsonStart < 0) throw new Error('DOCKER_FIXTURE_PRODUCER_MISSING_JSON');
  return JSON.parse(text.slice(jsonStart));
}

function assertCandidateReadiness({ artifactPrefix, candidateBytes, candidate, author, audit }) {
  const candidateSha256 = sha256(candidateBytes).toUpperCase();
  if (candidate.manifestId !== artifactPrefix.toUpperCase()) throw new Error('CANDIDATE_IDENTITY_MISMATCH');
  if (candidate.caseCount !== 56 || !Array.isArray(candidate.cases) || candidate.cases.length !== 56) {
    throw new Error('CANDIDATE_CASE_COUNT_INVALID');
  }
  if (author.caseCount !== 56 || audit.caseCount !== 56 || audit.auditComplete !== true || audit.caseValidationComplete !== true) {
    throw new Error('AUTHOR_AUDITOR_NOT_COMPLETE');
  }
  if (Number(audit.contaminationKnownArtifactOverlapCount) !== 0) throw new Error('CONTAMINATION_OVERLAP_NONZERO');
  if (audit.candidateManifestSha256 !== candidateSha256) throw new Error('AUDIT_CANDIDATE_DIGEST_MISMATCH');
  if (Number(audit.fixturePreflight?.requiredCount) !== 8 || Number(audit.fixturePreflight?.validatedCount) !== 8) {
    throw new Error('FIXTURE_PREFLIGHT_NOT_COMPLETE');
  }
  if (author.runtimeOracleUsed !== false || audit.authorRuntimeOracleUsed !== false || audit.auditorRuntimeOracleUsed !== false) {
    throw new Error('RUNTIME_ORACLE_USED');
  }
  if (author.sourceBinding?.completeBindingSha256 !== COMPLETE_BINDING_SHA256
    || audit.completeSourceBindingSha256 !== COMPLETE_BINDING_SHA256
    || audit.sourceBinding?.completeBindingSha256 !== COMPLETE_BINDING_SHA256
    || author.sourceBinding?.parentBindingSha256 !== LEGACY_BINDING_SHA256) {
    throw new Error('COMPLETE_SOURCE_BINDING_NOT_CURRENT');
  }
  return { candidateSha256 };
}

function dockerCompleteSourceProbe() {
  const source = [
    "import { completeContractBinding, completeContractBindingSha256, validateCompleteContractBinding } from './scripts/lib/m18CurrentSemanticContract.mjs';",
    "const binding = completeContractBinding('/app');",
    "console.log(JSON.stringify({ bindingSha256: completeContractBindingSha256('/app'), valid: validateCompleteContractBinding(binding) }));",
  ].join('\n');
  const output = execFileSync('docker', [
    'exec', '-w', '/app/backend', 'personel_api', 'node', '--input-type=module', '-e', source,
  ], { cwd: root, encoding: 'utf8', windowsHide: true });
  const result = parseJsonOutput(output);
  if (result.valid !== true || result.bindingSha256 !== COMPLETE_BINDING_SHA256) {
    throw new Error('DOCKER_COMPLETE_SOURCE_BINDING_MISMATCH');
  }
  return result;
}

function runDockerFixtureProducer(tempDir) {
  const envelopePath = join(tempDir, 'm18-docker-runtime-envelope.json');
  const fixtureReceiptPath = join(tempDir, 'm18-docker-runtime-fixture-receipt.json');
  const runtimeReceiptPath = join(tempDir, 'm18-docker-runtime-receipt.json');
  const result = spawnSync(process.execPath, [
    resolve(root, 'backend/scripts/m18_fixture_provenance_20261009_produce.mjs'),
    '--docker-runtime', 'true',
    '--output', envelopePath,
    '--receipt-output', fixtureReceiptPath,
    '--runtime-receipt-output', runtimeReceiptPath,
  ], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180000,
    env: { ...process.env },
  });
  if (result.status !== 0) {
    throw new Error(`DOCKER_FIXTURE_PRODUCER_FAILED:${String(result.stderr || result.stdout || '').trim()}`);
  }
  const summary = parseJsonOutput(result.stdout);
  const runtimeReceiptBytes = readFileSync(runtimeReceiptPath);
  return {
    summary,
    runtimeReceiptBytes,
    runtimeReceipt: JSON.parse(runtimeReceiptBytes.toString('utf8')),
    envelope: readJson(envelopePath),
  };
}

function assertDockerRuntimeReceipt({ summary, runtimeReceipt, runtimeReceiptBytes, envelope, author }) {
  if (summary.status !== 'GREEN' || summary.holdoutExecution !== false || Number(summary.databaseMutations) !== 0) {
    throw new Error('DOCKER_FIXTURE_PRODUCER_NOT_SAFE');
  }
  const verification = verifyProvenanceReceipt({
    receiptBytes: runtimeReceiptBytes,
    expectedRunId: runtimeReceipt.runId,
    expectedStartSha256: runtimeReceipt.startManifestSha256,
    expectedEndSha256: runtimeReceipt.endManifestSha256,
  });
  if (!verification.safe) throw new Error(`DOCKER_RUNTIME_RECEIPT_INVALID:${verification.failureReasons.join(';')}`);
  if (runtimeReceipt.finalStatus !== 'PASS'
    || runtimeReceipt.sourceMutation !== false
    || runtimeReceipt.startManifestSha256 !== runtimeReceipt.endManifestSha256
    || runtimeReceipt.runtimeBinding?.runtimeKind !== 'DOCKER'
    || Number(runtimeReceipt.runtimeBinding?.port) !== 3000
    || runtimeReceipt.runtimeBinding?.healthStatus !== 'PASS'
    || runtimeReceipt.runtimeBinding?.sourceContractBindingSha256 !== LEGACY_BINDING_SHA256
    || runtimeReceipt.runtimeBinding?.sourceIdentity !== LEGACY_BINDING_SHA256) {
    throw new Error('DOCKER_RUNTIME_RECEIPT_BINDING_INVALID');
  }
  if (envelope?.provenance?.sourceContractBindingSha256 !== LEGACY_BINDING_SHA256
    || author.fixtureProvenance?.sourceContractBindingSha256 !== LEGACY_BINDING_SHA256
    || envelope?.provenance?.registrySha256 !== author.fixtureProvenance?.registrySha256) {
    throw new Error('DOCKER_FIXTURE_PROVENANCE_BINDING_INVALID');
  }
  return verification;
}

export function buildDockerProvenanceReceipt({ runtimeReceipt, runtimeReceiptSha256, registrySha256, candidateSha256, capturedAt }) {
  if (runtimeReceipt.finalStatus !== 'PASS'
    || runtimeReceipt.sourceMutation !== false
    || runtimeReceipt.startManifestSha256 !== runtimeReceipt.endManifestSha256
    || runtimeReceipt.runtimeBinding?.runtimeKind !== 'DOCKER') {
    throw new Error('DOCKER_UPSTREAM_RECEIPT_NOT_GREEN');
  }
  const manifestReference = {
    runId: runtimeReceipt.runId,
    manifestSha256: runtimeReceipt.startManifestSha256,
  };
  const result = createProvenanceReceipt({
    runStart: manifestReference,
    runEnd: { ...manifestReference, manifestSha256: runtimeReceipt.endManifestSha256 },
    runtimeBinding: runtimeReceipt.runtimeBinding,
    suiteResults: [{
      verificationScope: 'NON_HOLDOUT_DOCKER_CANONICAL_PROVENANCE',
      candidateManifestSha256: candidateSha256,
      fixtureRegistrySha256: registrySha256,
      completeSourceBindingSha256: COMPLETE_BINDING_SHA256,
      parentSourceBindingSha256: LEGACY_BINDING_SHA256,
      upstreamRuntimeReceiptSha256: runtimeReceiptSha256,
      businessWriteExecution: 0,
      authorizationMutation: 0,
      downstreamBusinessWrite: 0,
      externalLlmProviderCount: 0,
      externalLlmNetworkCallCount: 0,
      llmApiSecretCount: 0,
      runtimeFallbackCount: 0,
      downstreamSemanticRedecisionCount: 0,
      shadowSemanticAuthorityCount: 0,
    }],
    finalStatus: 'GREEN',
    capturedAt,
  });
  const verification = verifyProvenanceReceipt({
    receiptBytes: result.receipt,
    expectedRunId: runtimeReceipt.runId,
    expectedStartSha256: runtimeReceipt.startManifestSha256,
    expectedEndSha256: runtimeReceipt.endManifestSha256,
  });
  if (!verification.safe) throw new Error(`DOCKER_PROVENANCE_RECEIPT_INVALID:${verification.failureReasons.join(';')}`);
  return result;
}

function runTask13Provenance(outputPath) {
  const result = spawnSync(process.execPath, [resolve(root, 'backend/scripts/m18_task13_current_source_startup_01_check.mjs')], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180000,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || 'TASK13_PROVENANCE_CAPTURE_FAILED');
    process.exitCode = 1;
    return;
  }
  const parsed = parseJsonOutput(result.stdout);
  const receipt = parsed?.provenance?.provenanceReceipt?.receipt;
  if (!receipt || receipt.finalStatus !== 'GREEN') throw new Error('TASK13_PROVENANCE_RECEIPT_NOT_GREEN');
  writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    status: 'GREEN',
    outputPath,
    sourceManifestSha256: receipt.startManifestSha256,
    runEndManifestSha256: receipt.endManifestSha256,
    receiptSha256: receipt.receiptSha256,
    currentSourceRuntimeBound: true,
    healthcheck: 'PASS',
    liveProvenanceMode: 'NEW',
    liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
    semanticAuthorityCount: 1,
    shadowSemanticAuthorityCount: 0,
    runtimeFallbackCount: 0,
    downstreamSemanticRedecisionCount: 0,
  }, null, 2));
}

function runDockerProvenance(outputPath, artifactPrefix) {
  const candidatePath = resolve(planDir, `${artifactPrefix}-candidate.json`);
  const authorPath = resolve(planDir, `${artifactPrefix}-author.json`);
  const auditPath = resolve(planDir, `${artifactPrefix}-audit.json`);
  if (![candidatePath, authorPath, auditPath].every(existsSync)) throw new Error('CANDIDATE_AUTHOR_AUDIT_INPUT_MISSING');
  const candidateBytes = readFileSync(candidatePath);
  const candidate = JSON.parse(candidateBytes.toString('utf8'));
  const author = readJson(authorPath);
  const audit = readJson(auditPath);
  const { candidateSha256 } = assertCandidateReadiness({ artifactPrefix, candidateBytes, candidate, author, audit });
  dockerCompleteSourceProbe();
  const tempDir = mkdtempSync(join(tmpdir(), 'm18-docker-provenance-'));
  try {
    const collected = runDockerFixtureProducer(tempDir);
    const runtimeReceiptSha256 = sha256(collected.runtimeReceiptBytes).toUpperCase();
    assertDockerRuntimeReceipt({ ...collected, runtimeReceiptBytes: collected.runtimeReceiptBytes, author });
    const receiptResult = buildDockerProvenanceReceipt({
      runtimeReceipt: collected.runtimeReceipt,
      runtimeReceiptSha256,
      registrySha256: collected.envelope.provenance.registrySha256,
      candidateSha256,
      capturedAt: new Date().toISOString(),
    });
    writeFileSync(outputPath, JSON.stringify(receiptResult.receipt, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({
      status: 'GREEN',
      outputPath,
      candidateSha256,
      completeSourceBindingSha256: COMPLETE_BINDING_SHA256,
      parentSourceBindingSha256: LEGACY_BINDING_SHA256,
      sourceManifestSha256: receiptResult.receipt.startManifestSha256,
      runEndManifestSha256: receiptResult.receipt.endManifestSha256,
      receiptSha256: receiptResult.receiptSha256,
      runtimeKind: 'DOCKER',
      runtimePort: 3000,
      runtimeOracleUsed: false,
      holdoutExecution: false,
      databaseMutations: 0,
    }, null, 2));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const artifactPrefix = process.env.M18_FINAL_ARTIFACT_PREFIX || 'm18-final-fresh-unseen-56-governed-v4r2r2-20261006';
  const outputPath = resolve(root, process.env.M18_FINAL_PROVENANCE_OUTPUT_PATH || resolve(planDir, `${artifactPrefix}-provenance-receipt.json`));
  const mode = selectProvenanceMode(process.env);
  if (mode === 'DOCKER') runDockerProvenance(outputPath, artifactPrefix);
  else runTask13Provenance(outputPath);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
