#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createProvenanceReceipt } from './lib/m18RunScopedProvenance.mjs';
import {
  buildDockerProvenanceReceipt,
  selectProvenanceMode,
} from './m18_final_fresh_20261006_provenance.mjs';
import {
  createV2ProtocolBinding,
  loadDockerFixtureRegistry,
  resolveExecutionRuntime,
  validateDockerExecutionProvenance,
} from './m18_final_fresh_20261006_execute.mjs';
import { proveRuntimeStartedAfterManifest } from './m18_fixture_provenance_20261009_produce.mjs';
import { buildPreCapturedAuthorityObservation } from './m18_fixture_provenance_20261009_produce.mjs';

const provenancePath = resolve(process.cwd(), 'backend/scripts/m18_final_fresh_20261006_provenance.mjs');
const source = readFileSync(provenancePath, 'utf8');
const fixtureProducerSource = readFileSync(resolve(process.cwd(), 'backend/scripts/m18_fixture_provenance_20261009_produce.mjs'), 'utf8');

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'RED', message: error.message });
  }
}

check('DOCKER_PROVENANCE_MODE_IS_EXPLICIT', () => {
  assert.match(source, /M18_PROVENANCE_RUNTIME/u);
  assert.match(source, /DOCKER/u);
});

check('DOCKER_PATH_REUSES_CANONICAL_FIXTURE_RUNTIME_OWNER', () => {
  assert.match(source, /m18_fixture_provenance_20261009_produce\.mjs/u);
});

check('DOCKER_PATH_DOES_NOT_USE_TASK13_STARTUP', () => {
  assert.match(source, /collectDockerRuntimeBinding|m18_fixture_provenance_20261009_produce/u);
});

check('DOCKER_RUNTIME_PRODUCER_ACCEPTS_PRECAPTURED_SOURCE_MANIFEST', () => {
  assert.match(fixtureProducerSource, /source-manifest-input/u);
  assert.match(fixtureProducerSource, /startedAfterManifest/u);
  assert.equal(proveRuntimeStartedAfterManifest({
    containerStartTime: '2026-10-10T17:00:01.000Z',
    manifestCreatedAt: '2026-10-10T17:00:00.000Z',
  }), true);
  assert.equal(proveRuntimeStartedAfterManifest({
    containerStartTime: '2026-10-10T17:00:00.000Z',
    manifestCreatedAt: '2026-10-10T17:00:01.000Z',
  }), false);
  assert.equal(proveRuntimeStartedAfterManifest({
    containerStartTime: 'not-a-timestamp',
    manifestCreatedAt: '2026-10-10T17:00:00.000Z',
  }), false);
});

check('DOCKER_PRECAPTURED_MANIFEST_PRESERVES_CANONICAL_RUNTIME_LAUNCH', () => {
  const authorityObservation = {
      semanticAuthorityMode: 'NEW',
      liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
      semanticAuthorityCount: 1,
      shadowSemanticAuthorityCount: 0,
      runtimeFallbackCount: 0,
      downstreamSemanticRedecisionCount: 0,
      runtimeLaunch: {
        entrypoint: 'backend/src/server.js',
        workingDirectory: 'backend',
        port: 3000,
        authorityMode: 'NEW',
        launchCommand: 'npm run dev (docker:personel_api)',
      },
  };
  const merged = buildPreCapturedAuthorityObservation({
    supplied: {
      authority: {
        semanticAuthorityMode: 'NEW',
        liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
        semanticAuthorityCount: 1,
        shadowSemanticAuthorityCount: 0,
        runtimeFallbackCount: 0,
        downstreamSemanticRedecisionCount: 0,
      },
      runtimeLaunch: authorityObservation.runtimeLaunch,
    },
    authorityObservation,
  });
  assert.equal(merged.runtimeLaunch.port, 3000);
  assert.equal(merged.runtimeLaunch.launchCommand, 'npm run dev (docker:personel_api)');
});

check('DOCKER_UPSTREAM_RECEIPT_MUST_BE_VERIFIED_BEFORE_GREEN', () => {
  assert.match(source, /finalStatus.{0,80}PASS|verifyProvenanceReceipt/u);
  assert.match(source, /sourceMutation/u);
  assert.match(source, /startManifestSha256/u);
  assert.match(source, /endManifestSha256/u);
});

check('DOCKER_PROVENANCE_DOES_NOT_PIN_HISTORICAL_CANDIDATE_DIGEST', () => {
  assert.match(source, /candidateSha256\s*=\s*sha256\(candidateBytes\)/u);
  assert.match(source, /candidate\.manifestId\s*!==\s*artifactPrefix\.toUpperCase\(\)/u);
  assert.doesNotMatch(source, /B357C2975878DB5E3001D7DD8494D42E56748FB20363B9B17E23AF3CC86DD1B7/u);
});

function upstreamReceipt(finalStatus = 'PASS') {
  const manifest = { runId: 'm18-docker-test-run', manifestSha256: 'A'.repeat(64) };
  const result = createProvenanceReceipt({
    runStart: manifest,
    runEnd: manifest,
    runtimeBinding: { runtimeKind: 'DOCKER', sourceManifestSha256: manifest.manifestSha256 },
    suiteResults: [{ businessWriteExecution: 0 }],
    finalStatus,
    capturedAt: '2026-10-09T00:00:00.000Z',
  });
  return result.receipt;
}

check('DOCKER_MODE_IS_SELECTED_WITHOUT_TASK13', () => {
  assert.equal(selectProvenanceMode({ M18_PROVENANCE_RUNTIME: 'DOCKER' }), 'DOCKER');
  assert.equal(selectProvenanceMode({}), 'TASK13');
});

check('VERIFIED_DOCKER_RUNTIME_RECEIPT_BECOMES_NEW_GREEN_GENERIC_RECEIPT', () => {
  const upstream = upstreamReceipt('PASS');
  const result = buildDockerProvenanceReceipt({
    runtimeReceipt: upstream,
    runtimeReceiptSha256: 'B'.repeat(64),
    registrySha256: 'D'.repeat(64),
    candidateSha256: 'C'.repeat(64),
    capturedAt: '2026-10-09T00:00:00.000Z',
  });
  assert.equal(result.receipt.finalStatus, 'GREEN');
  assert.equal(result.receipt.sourceMutation, false);
  assert.equal(result.receipt.startManifestSha256, upstream.startManifestSha256);
  assert.equal(result.receipt.suiteResults[0].fixtureRegistrySha256, 'D'.repeat(64));
  assert.equal(result.receipt.suiteResults[0].candidateManifestSha256, 'C'.repeat(64));
});

check('FAILED_DOCKER_RUNTIME_RECEIPT_CANNOT_BE_PROMOTED', () => {
  assert.throws(() => buildDockerProvenanceReceipt({
    runtimeReceipt: upstreamReceipt('FAIL'),
    runtimeReceiptSha256: 'B'.repeat(64),
    registrySha256: 'D'.repeat(64),
    candidateSha256: 'C'.repeat(64),
    capturedAt: '2026-10-09T00:00:00.000Z',
}), /DOCKER_UPSTREAM_RECEIPT_NOT_GREEN/);
});

check('DOCKER_EXECUTION_MODE_REUSES_EXISTING_RUNTIME_WITHOUT_3400_STARTUP', () => {
  const runtime = resolveExecutionRuntime({
    M18_RUNTIME_MODE: 'DOCKER',
    M18_RUNTIME_API_BASE: 'http://127.0.0.1:3000',
  });
  assert.deepEqual(runtime, {
    mode: 'DOCKER',
    apiBase: 'http://127.0.0.1:3000',
    port: 3000,
    requiresOwnedStartup: false,
  });
});

check('DOCKER_EXECUTION_PROVENANCE_REQUIRES_CURRENT_SOURCE_AND_RUNTIME_BINDING', () => {
  const receipt = buildDockerProvenanceReceipt({
    runtimeReceipt: upstreamReceipt('PASS'),
    runtimeReceiptSha256: 'B'.repeat(64),
    registrySha256: 'D'.repeat(64),
    candidateSha256: 'C'.repeat(64),
    capturedAt: '2026-10-09T00:00:00.000Z',
  }).receipt;
  const verified = validateDockerExecutionProvenance({
    provenance: receipt,
    candidateSha256: 'C'.repeat(64),
    completeSourceBindingSha256: 'E'.repeat(64),
    expectedPort: 3000,
  });
  assert.equal(verified.safe, false);
  assert.ok(verified.failureReasons.includes('DOCKER_RUNTIME_PROCESS_IDENTITY_INCOMPLETE'));
});

check('V2_BINDING_PRESERVES_RUNTIME_AND_COMPLETE_SOURCE_IDENTITIES', () => {
  const manifest = Buffer.from(JSON.stringify({ manifestId: 'SYNTHETIC-DOCKER-V2', caseCount: 1, status: 'FROZEN_NOT_EXECUTED' }) + '\n');
  const freezeReceipt = Buffer.from(JSON.stringify({ manifestSha256: 'A'.repeat(64) }) + '\n');
  const packet = Buffer.from('{}\n');
  const binding = createV2ProtocolBinding({
    acceptanceId: 'SYNTHETIC-DOCKER-V2',
    frozenManifestBytes: manifest,
    freezeReceiptBytes: freezeReceipt,
    contractPacketBytes: packet,
    sourceIdentity: 'F'.repeat(64),
    completeSourceBindingSha256: 'E'.repeat(64),
    executorIdentity: 'B'.repeat(64),
    runtimeProvenanceReceiptSha256: 'D'.repeat(64),
    fixtureRegistrySha256: 'C'.repeat(64),
  });
  assert.equal(binding.completeSourceBindingSha256, 'E'.repeat(64));
  assert.equal(binding.runtimeProvenanceReceiptSha256, 'D'.repeat(64));
  assert.equal(binding.fixtureRegistrySha256, 'C'.repeat(64));
});

check('DOCKER_EXECUTION_REQUIRES_VERIFIED_FIXTURE_ENVELOPE', () => {
  assert.throws(() => loadDockerFixtureRegistry({}), /DOCKER_FIXTURE_ENVELOPE_REQUIRED/);
});

check('V2_SUCCESSOR_VALIDATES_PREVIOUS_RUNTIME_BINDING_WITH_ITS_OWN_RECEIPT', () => {
  const finalExecutor = readFileSync(resolve(process.cwd(), 'backend/scripts/m18_final_fresh_20261006_execute.mjs'), 'utf8');
  assert.match(finalExecutor, /runtimeProvenanceReceiptSha256:\s*previousBinding\.runtimeProvenanceReceiptSha256/u);
  assert.match(finalExecutor, /fixtureRegistrySha256:\s*previousBinding\.fixtureRegistrySha256/u);
});

const red = checks.filter((item) => item.status === 'RED');
console.log(JSON.stringify({ status: red.length ? 'RED' : 'GREEN', checks }, null, 2));
process.exitCode = red.length ? 1 : 0;
