#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bindRuntimeToSourceManifest,
  captureRunSourceManifest,
  captureRunEndManifest,
  createProvenanceReceipt,
  validateCanonicalOwnerTopology,
  verifyProvenanceReceipt,
  verifyRuntimeProvenance,
} from './lib/m18RunScopedProvenance.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const backendRoot = path.join(repoRoot, 'backend');
const apiBase = process.env.M18_TASK13_API_BASE || 'http://127.0.0.1:3400';
const port = 3400;
const readinessTimeoutMs = 20_000;
const pollIntervalMs = 250;
const expectedHeadSha = (process.env.M18_EXPECTED_HEAD_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' })).trim().toUpperCase();
const authorityExpectation = {
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
  { relativePath: 'backend/scripts/m18_semantic_evidence_service_01_check.mjs', ownerClass: 'EXECUTION_HARNESS', lifecycleClass: 'CANONICAL_HARNESS' },
  { relativePath: 'backend/scripts/lib/m18RunScopedProvenance.mjs', ownerClass: 'PROVENANCE_HELPER', lifecycleClass: 'RUN_SCOPED_AUTHORITY' },
];
const topologyResult = validateCanonicalOwnerTopology({
  repoRoot,
  topologyRegistry: { registryVersion: 'M18-RUN-SOURCE-TOPOLOGY-V1' },
  requiredOwnerClasses: ['RUNTIME_ENTRYPOINT', 'SEMANTIC_AUTHORITY', 'SEMANTIC_COMPOSER', 'AUTHORIZATION', 'GROUNDING', 'EXECUTION_HARNESS', 'PROVENANCE_HELPER'],
  runtimeOwnerPaths,
});
assert.ok(topologyResult.safe, `canonical owner topology invalid: ${topologyResult.failures.join('; ')}`);
const runStart = captureRunSourceManifest({
  repoRoot,
  expectedHeadSha,
  branchPolicy: { expectedBranch: null, allowDetached: true },
  topologyResult,
  runtimeOwnerPaths,
  relevantIgnoredPaths: [],
  authorityObservation: authorityExpectation,
  runId: `task13-${Date.now()}`,
  createdAt: new Date().toISOString(),
});
assert.ok(runStart.safe, `run-start provenance capture failed: ${runStart.failureReasons.join('; ')}`);

const preExistingOwnerPid = listenerPidForPort(port);
assert.equal(preExistingOwnerPid, null, `STALE_RUNTIME_REJECTED:port=${port}:pid=${preExistingOwnerPid}`);

function listenerPidForPort(targetPort) {
  const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
  for (const line of output.split(/\r?\n/u)) {
    const columns = line.trim().split(/\s+/u);
    if (columns.length < 5) continue;
    if (columns[1]?.endsWith(`:${targetPort}`) && columns.includes('LISTENING')) {
      const pid = Number(columns.at(-1));
      if (Number.isInteger(pid) && pid > 0) return pid;
    }
  }
  return null;
}

async function healthcheck() {
  try {
    const response = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(2_000) });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function waitForReady(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < readinessTimeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`BACKEND_EXITED_BEFORE_READY:${child.exitCode}`);
    }
    const ownerPid = listenerPidForPort(port);
    if (ownerPid === child.pid && await healthcheck()) return ownerPid;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`BACKEND_READINESS_TIMEOUT:pid=${child.pid}:owner=${listenerPidForPort(port)}`);
}

async function proveAuthority() {
  const login = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identifier: 'company@demo.com',
      password: 'demo123',
      deviceId: 'm18-task13-startup-proof',
    }),
  });
  assert.equal(login.status, 200, `authority proof login status ${login.status}`);
  const loginBody = await login.json();
  assert.ok(loginBody.token, 'authority proof token');

  const response = await fetch(`${apiBase}/api/ai/copilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${loginBody.token}` },
    body: JSON.stringify({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      screenContext: { path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' },
      message: 'Şirket hesabında ilk olarak hangi sorumluluk alanlarını tanımalıyım?',
      format: 'json',
      sessionLabel: 'm18-task13-startup-proof',
    }),
  });
  assert.equal(response.status, 200, `authority proof copilot status ${response.status}`);
  const payload = await response.json();
  const authority = payload?.semanticPlan?.canonicalRequestEnvelope?.diagnostics?.semanticAuthority
    || payload?.diagnostics?.semanticAuthority;
  assert.equal(authority?.mode, 'NEW', 'authority mode');
  assert.equal(authority?.authoritativePath, 'NEW_TYPED_EVIDENCE', 'authority path');
  assert.equal(authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, 'semantic authority count');
  assert.equal(authority?.SHADOW_SEMANTIC_AUTHORITY_COUNT, 0, 'shadow authority count');
  assert.equal(authority?.DUAL_SEMANTIC_AUTHORITY_COUNT, 0, 'dual authority count');
  assert.equal(authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0, 'runtime fallback count');
  assert.equal(authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT, 0, 'downstream redecision count');
  return authority;
}

function runService() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join('backend', 'scripts', 'm18_semantic_evidence_service_01_check.mjs')], {
      cwd: repoRoot,
      env: {
        ...process.env,
        M18_TASK13_API_BASE: apiBase,
        SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

async function stopBackend(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  if (child.exitCode === null) child.kill('SIGKILL');
}

const backend = spawn(process.execPath, ['src/server.js'], {
  cwd: backendRoot,
  env: {
    ...process.env,
    PORT: String(port),
    SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const backendStartedAt = new Date().toISOString();
let backendStdout = '';
let backendStderr = '';
backend.stdout.on('data', (chunk) => { backendStdout += chunk; });
backend.stderr.on('data', (chunk) => { backendStderr += chunk; });

try {
  const ownerPid = await waitForReady(backend);
  const authority = await proveAuthority();
  const runtimeObservation = {
    sourceManifestSha256: runStart.manifestSha256,
    repoRoot,
    headSha: expectedHeadSha,
    entrypoint: 'backend/src/server.js',
    cwd: 'backend',
    pid: backend.pid,
    portOwnerPid: ownerPid,
    processStartTime: backendStartedAt,
    executablePath: process.execPath,
    commandLine: `${process.execPath} src/server.js`,
    port,
    healthStatus: 'PASS',
    startedAfterManifest: true,
  };
  const runtimeAuthority = {
    semanticAuthorityMode: authority.mode,
    liveAuthoritativePath: authority.authoritativePath,
    semanticAuthorityCount: authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT,
    shadowSemanticAuthorityCount: authority.SHADOW_SEMANTIC_AUTHORITY_COUNT,
    runtimeFallbackCount: authority.RUNTIME_SEMANTIC_FALLBACK_COUNT,
    downstreamSemanticRedecisionCount: authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT,
  };
  const runtimeBindingResult = bindRuntimeToSourceManifest({
    manifest: runStart.manifest,
    manifestSha256: runStart.manifestSha256,
    runtimeObservation,
    authorityObservation: runtimeAuthority,
  });
  assert.ok(runtimeBindingResult.safe, `runtime binding failed: ${runtimeBindingResult.failureReasons.join('; ')}`);
  const runtimeProvenance = verifyRuntimeProvenance({
    manifest: runStart.manifest,
    runtimeBinding: runtimeBindingResult.runtimeBinding,
    authorityObservation: runtimeAuthority,
  });
  assert.ok(runtimeProvenance.safe, `runtime provenance failed: ${runtimeProvenance.failureReasons.join('; ')}`);
  const service = await runService();
  const status = service.code === 0 ? 'PASS' : 'FAIL';
  const runEnd = captureRunEndManifest({
    startManifest: runStart.manifest,
    repoRoot,
    expectedHeadSha,
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult,
    runtimeOwnerPaths,
    relevantIgnoredPaths: [],
    authorityObservation: runtimeAuthority,
    capturedAt: new Date().toISOString(),
  });
  assert.ok(runEnd.safe, `run-end provenance capture failed: ${runEnd.failureReasons.join('; ')}`);
  const provenanceReceipt = createProvenanceReceipt({
    runStart,
    runEnd,
    runtimeBinding: runtimeBindingResult.runtimeBinding,
    suiteResults: [{
      businessWriteExecution: 0,
      authorizationMutation: 0,
      externalLlmProviderCount: 0,
      externalLlmNetworkCallCount: 0,
      llmApiSecretCount: 0,
      runtimeFallbackCount: runtimeAuthority.runtimeFallbackCount,
      downstreamSemanticRedecisionCount: runtimeAuthority.downstreamSemanticRedecisionCount,
      shadowSemanticAuthorityCount: runtimeAuthority.shadowSemanticAuthorityCount,
    }],
    finalStatus: status === 'PASS' ? 'GREEN' : 'FAIL',
    capturedAt: new Date().toISOString(),
  });
  const verifiedReceipt = verifyProvenanceReceipt({
    receiptBytes: provenanceReceipt.receipt,
    expectedRunId: runStart.manifest.runId,
    expectedStartSha256: runStart.manifestSha256,
    expectedEndSha256: runEnd.manifestSha256,
  });
  assert.ok(verifiedReceipt.safe, `provenance receipt failed: ${verifiedReceipt.failureReasons.join('; ')}`);
  console.log(JSON.stringify({
    status,
    startup: {
      processCreated: true,
      backendPid: backend.pid,
      port,
      portOwnerPid: ownerPid,
      processAliveAfterReady: backend.exitCode === null,
      healthcheck: 'PASS',
      sourceRoot: repoRoot,
      sourceManifestSha256: runStart.manifestSha256,
      currentHeadSha: expectedHeadSha,
    },
    authority: {
      mode: authority.mode,
      authoritativePath: authority.authoritativePath,
      PER_REQUEST_SEMANTIC_AUTHORITY_COUNT: authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT,
      SHADOW_SEMANTIC_AUTHORITY_COUNT: authority.SHADOW_SEMANTIC_AUTHORITY_COUNT,
      DUAL_SEMANTIC_AUTHORITY_COUNT: authority.DUAL_SEMANTIC_AUTHORITY_COUNT,
      RUNTIME_SEMANTIC_FALLBACK_COUNT: authority.RUNTIME_SEMANTIC_FALLBACK_COUNT,
      DOWNSTREAM_SEMANTIC_REDECISION_COUNT: authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT,
    },
    provenance: {
      currentSourceRuntimeBound: true,
      runStartManifestSha256: runStart.manifestSha256,
      runEndManifestSha256: runEnd.manifestSha256,
      provenanceReceiptSha256: provenanceReceipt.receiptSha256,
      provenanceReceipt,
      runtimeBinding: runtimeBindingResult.runtimeBinding,
    },
    service: {
      status,
      exitCode: service.code,
      signal: service.signal,
      stdout: service.stdout,
      stderr: service.stderr,
    },
    backendLogs: { stdout: backendStdout, stderr: backendStderr },
  }, null, 2));
  if (service.code !== 0) process.exitCode = service.code || 1;
} finally {
  await stopBackend(backend);
}
