#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const apiBase = process.env.M18_TASK13_API_BASE || 'http://127.0.0.1:3400';

async function loginSharedCompanySession() {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identifier: 'company@demo.com',
      password: 'demo123',
      deviceId: 'm18-task13-service-shared-company',
    }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `shared company login status ${response.status}`);
  assert.ok(body.token, 'shared company login token');
  return body.token;
}

function runCheck(label, script, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join('backend', 'scripts', script)], {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...extraEnv,
        M18_J02_API_BASE: apiBase,
        M18_K02_API_BASE: apiBase,
        M18_I01_API_BASE: apiBase,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ label, script, code, signal, stdout, stderr }));
  });
}

function parseLastJson(text, label) {
  const source = String(text || '').trim();
  for (let index = source.lastIndexOf('{'); index >= 0; index = source.lastIndexOf('{', index - 1)) {
    try { return JSON.parse(source.slice(index)); } catch {}
  }
  throw new Error(`${label} did not emit a JSON report`);
}

const checks = [
  ['L01_DIRECT_CANONICAL', 'm18_run_l01_role_help_regression_01_check.js'],
  ['J02_SERVICE', 'm18_run_j02_role_help_service_01_check.mjs'],
  ['K02_SERVICE', 'm18_run_k02_role_concept_service_01_check.mjs'],
  ['I01_SERVICE', 'm18_run_i01_action_authority_service_01_check.mjs'],
];
const sharedCompanyToken = await loginSharedCompanySession();
const executions = [];
for (const [label, script] of checks) {
  const execution = await runCheck(label, script, { M18_SHARED_COMPANY_TOKEN: sharedCompanyToken });
  assert.equal(execution.code, 0, `${label} exit code`);
  executions.push({
    label,
    script,
    exitCode: execution.code,
    report: parseLastJson(execution.stdout, label),
    stderr: execution.stderr.trim(),
  });
}

const l01 = executions.find(({ label }) => label === 'L01_DIRECT_CANONICAL').report;
assert.equal(l01.status, 'PASS', 'L01 direct canonical status');
assert.equal(l01.tenant.authorization, 'DENY', 'tenant boundary authorization');
assert.equal(l01.tenant.reason, 'TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL', 'tenant boundary reason');
const safety = l01.counters?.observed || {};
for (const field of [
  'businessWriteExecution',
  'authorizationMutation',
  'externalLlmProviderCount',
  'externalLlmNetworkCallCount',
  'llmApiSecretCount',
]) {
  assert.equal(safety[field]?.observed, true, `${field} observed`);
  assert.equal(safety[field]?.value, 0, `${field} observed zero`);
}

console.log(JSON.stringify({
  status: 'PASS',
  task: 'TASK12_SERVICE_BROWSER_RESPONSIVE_ACCEPTANCE',
  sourceBuild: { apiBase, repoRoot },
  coverage: [
    'K02 role-help and role-concept service cases',
    'L01 exact canonical role and tenant boundary cases',
    'I01 EXPLAIN/VIEW/NAVIGATE/GUIDED_SHOW service distinctions',
    'true clarification and false-positive controls',
  ],
  executions,
  safety: {
    businessWriteExecution: 0,
    authorizationMutation: 0,
    externalLlmProviderCount: 0,
    externalLlmNetworkCallCount: 0,
    llmApiSecretCount: 0,
    evidenceSource: 'L01_RUNTIME_GUARD_AND_DIRECT_SERVICE_OBSERVATION',
  },
}, null, 2));
