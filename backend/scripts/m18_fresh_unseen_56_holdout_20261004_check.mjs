import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const manifestPath = process.env.M18_HOLDOUT_MANIFEST
  ? path.resolve(repoRoot, process.env.M18_HOLDOUT_MANIFEST)
  : path.join(repoRoot, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-fresh-unseen-56-case-holdout-20261004.json');
const defaultApiBase = process.env.M18_HOLDOUT_API_BASE || 'http://127.0.0.1:3400';
const authorityMode = 'NEW';
const roleCredentials = {
  COMPANY: 'company@demo.com',
  ROOM: 'room@demo.com',
  SCHOOL: 'school@demo.com',
  ORGANIZATION: 'organization@demo.com',
  DRIVER: 'driver@demo.com',
  PERSONEL: 'personel@demo.com',
  PARENT: 'parent@demo.com',
  SUPER_ADMIN: 'superadmin@demo.com',
};
const requiredRoles = Object.keys(roleCredentials);
const requiredChallenges = [
  'EXPLAIN_CURRENT_SURFACE',
  'VIEW_OR_NAVIGATE',
  'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY',
  'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_FAIL_CLOSED',
  'DOMAIN_OR_GENUINE_OOS',
];
const requiredActions = ['EXPLAIN', 'NAVIGATE', 'VIEW', 'CREATE', 'UPDATE', 'COMPARE', 'CONTINUE', 'NEXT', 'PREVIOUS', 'NONE'];
const requiredScopes = ['PRODUCT_EXPLICIT', 'PRODUCT_CONTEXTUAL', 'PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'];
const requiredReferencePreconditions = ['ABSENT', 'UNRESOLVED_DEICTIC', 'VALID_UNIQUE', 'TEMPORAL_NONE'];

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function auditManifest(manifest) {
  const errors = [];
  const cases = Array.isArray(manifest.cases) ? manifest.cases : [];
  const order = Array.isArray(manifest.executionOrder) ? manifest.executionOrder : [];
  const counts = {};
  const challengeCounts = {};
  const actionCounts = {};
  const scopeCounts = {};
  const referenceCounts = {};
  const ids = new Set();
  for (const role of requiredRoles) counts[role] = 0;
  for (const challenge of requiredChallenges) challengeCounts[challenge] = 0;
  for (const action of requiredActions) actionCounts[action] = 0;
  for (const scope of requiredScopes) scopeCounts[scope] = 0;
  for (const reference of requiredReferencePreconditions) referenceCounts[reference] = 0;
  for (const item of cases) {
    if (!item || typeof item !== 'object') { errors.push('CASE_NOT_OBJECT'); continue; }
    if (ids.has(item.caseId)) errors.push(`DUPLICATE_CASE_ID:${item.caseId}`);
    ids.add(item.caseId);
    counts[item.role] = (counts[item.role] || 0) + 1;
    challengeCounts[item.challengeClass] = (challengeCounts[item.challengeClass] || 0) + 1;
    actionCounts[item.expected?.action] = (actionCounts[item.expected?.action] || 0) + 1;
    scopeCounts[item.expected?.semanticScope] = (scopeCounts[item.expected?.semanticScope] || 0) + 1;
    referenceCounts[item.referencePrecondition] = (referenceCounts[item.referencePrecondition] || 0) + 1;
    if (!Array.isArray(item.turns) || item.turns.length !== item.turnCount) errors.push(`TURN_COUNT:${item.caseId}`);
    if (!item.expected || typeof item.expected !== 'object') errors.push(`EXPECTED_MISSING:${item.caseId}`);
    if (!requiredRoles.includes(item.role)) errors.push(`ROLE_INVALID:${item.caseId}`);
    if (!requiredChallenges.includes(item.challengeClass)) errors.push(`CHALLENGE_INVALID:${item.caseId}`);
    for (const field of ['semanticScope', 'requestMode', 'semanticAction', 'action', 'object', 'reference', 'resolutionStatus', 'task', 'operation', 'authorizationClass']) {
      if (!Object.prototype.hasOwnProperty.call(item.expected || {}, field)) errors.push(`EXPECTED_FIELD:${item.caseId}:${field}`);
    }
  }
  if (manifest.roles?.length !== 8) errors.push('ROLE_COUNT');
  if (manifest.casesPerRole !== 7) errors.push('CASES_PER_ROLE');
  if (manifest.totalCaseCount !== 56 || cases.length !== 56) errors.push('TOTAL_CASE_COUNT');
  if (order.length !== 56 || order.some((id, index) => id !== cases[index]?.caseId)) errors.push('EXECUTION_ORDER');
  for (const role of requiredRoles) if (counts[role] !== 7) errors.push(`ROLE_CASE_COUNT:${role}`);
  for (const challenge of requiredChallenges) if (challengeCounts[challenge] < 8) errors.push(`CHALLENGE_COVERAGE:${challenge}`);
  for (const action of requiredActions) if ((actionCounts[action] || 0) < 1) errors.push(`ACTION_COVERAGE:${action}`);
  for (const scope of requiredScopes) if ((scopeCounts[scope] || 0) < 1) errors.push(`SCOPE_COVERAGE:${scope}`);
  for (const reference of requiredReferencePreconditions) if ((referenceCounts[reference] || 0) < 1) errors.push(`REFERENCE_COVERAGE:${reference}`);
  return { errors, counts, challengeCounts, actionCounts, scopeCounts, referenceCounts, caseCount: cases.length, executionOrderCount: order.length };
}

function screenContextFor(item) {
  const surface = item.surfacePrecondition || {};
  const context = {
    path: surface.route || null,
    route: surface.route || null,
    label: surface.label || null,
    role: surface.role || item.role,
    surfaceId: surface.id ?? null,
  };
  if (surface.selectedEntity) {
    context.selectedEntityId = surface.selectedEntity.id;
    context.selectedEntityType = surface.selectedEntity.type;
    context.selectedEntity = { ...surface.selectedEntity };
  }
  if (Array.isArray(surface.selectedEntitySet)) {
    context.selectedEntitySet = surface.selectedEntitySet.map((entity) => ({ ...entity }));
  }
  return context;
}

function normalizeReference(value) {
  if (value === null || value === undefined || value === '' || value === 'NONE') return 'ABSENT';
  if (typeof value === 'object') {
    const status = String(value.status || value.class || value.kind || value.type || '').toUpperCase();
    if (status.includes('UNRESOLVED') || status.includes('AMBIG')) return 'UNRESOLVED';
    if (status.includes('ABSENT') || status === 'NONE') return 'ABSENT';
    if (status.includes('UNIQUE') || value.id !== undefined || value.entityId !== undefined) return 'UNIQUE';
  }
  const text = String(value).toUpperCase();
  if (text.includes('UNRESOLVED') || text.includes('AMBIG')) return 'UNRESOLVED';
  if (text.includes('ABSENT') || text === 'NONE' || text === 'NULL') return 'ABSENT';
  if (text.includes('UNIQUE') || text.includes('SELECTED') || text.includes('VALID')) return 'UNIQUE';
  return value;
}

function canonicalFields(payload) {
  const foundation = payload?.semanticPlan ? payload : { semanticPlan: payload?.semanticPlan || {} };
  const envelope = payload?.semanticPlan?.canonicalRequestEnvelope || payload?.canonicalRequestEnvelope || null;
  const canonical = envelope || payload?.semanticPlan?.canonicalRequest || payload?.canonicalRequest || {};
  const request = canonical?.request || {};
  const semanticAction = request.semanticAction || {};
  const typedEvidence = request.typedEvidence || {};
  const shape = canonical?.canonicalShape || {};
  const plan = foundation?.semanticPlan || {};
  const authority = envelope?.diagnostics?.semanticAuthority
    || canonical?.diagnostics?.semanticAuthority
    || plan?.diagnostics?.semanticAuthority
    || payload?.diagnostics?.semanticAuthority
    || null;
  const rawReference = typedEvidence.reference?.value ?? typedEvidence.reference
    ?? semanticAction.referenceClass ?? semanticAction.reference ?? request.reference;
  return {
    semanticScope: request.semanticScope?.class ?? request.semanticScope ?? null,
    requestMode: typedEvidence.requestMode?.value ?? typedEvidence.requestMode ?? request.requestMode ?? null,
    semanticAction: semanticAction.actionClass ?? request.semanticActionClass ?? null,
    action: semanticAction.actionClass ?? request.action ?? null,
    object: semanticAction.objectClass ?? request.object ?? null,
    reference: normalizeReference(rawReference),
    resolutionStatus: semanticAction.resolutionStatus ?? request.resolutionStatus ?? null,
    task: shape.taskType ?? request.task ?? request.taskType ?? plan.taskType ?? null,
    operation: request.operation ?? plan.operation ?? null,
    authorizationClass: plan.authorizationDecision?.status ?? payload?.authorizationBoundary?.status ?? null,
    clarificationReason: plan.clarificationNeed ?? request.clarificationReason ?? null,
    authority,
  };
}

function responseConversationState(payload) {
  return payload?.conversationState || payload?.semanticPlan?.conversationState || payload?.semanticPlan?.canonicalRequestEnvelope?.conversationState || null;
}

function responseCounters(payload) {
  return payload?.counters?.observed || payload?.diagnostics?.counters?.observed || payload?.semanticPlan?.counters?.observed || payload?.safetyCounters || null;
}

function compareExpected(expected, actual) {
  const fields = ['semanticScope', 'requestMode', 'semanticAction', 'action', 'object', 'reference', 'resolutionStatus', 'task', 'operation'];
  const mismatches = [];
  for (const field of fields) if (expected[field] !== actual[field]) mismatches.push({ field, expected: expected[field], actual: actual[field] });
  if (expected.authorizationClass && actual.authorizationClass && expected.authorizationClass !== actual.authorizationClass) {
    mismatches.push({ field: 'authorizationClass', expected: expected.authorizationClass, actual: actual.authorizationClass });
  }
  return mismatches;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function health(apiBase) {
  const result = await fetchJson(`${apiBase}/health`);
  return result.status === 200;
}

async function login(apiBase, role, caseId) {
  const result = await fetchJson(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: roleCredentials[role], password: 'demo123', deviceId: `m18-h56-${caseId}-${Date.now()}` }),
  });
  if (result.status !== 200 || !result.body?.token) throw new Error(`LOGIN_FAILED:${role}:${result.status}`);
  return result.body.token;
}

async function copilot(apiBase, token, item, message, conversationState) {
  const result = await fetchJson(`${apiBase}/api/ai/copilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      screenContext: screenContextFor(item),
      conversationState: conversationState || undefined,
      message,
      format: 'json',
    }),
  });
  return result;
}

async function authorityProof(apiBase) {
  const token = await login(apiBase, 'COMPANY', 'AUTHORITY-PROOF');
  const result = await copilot(apiBase, token, {
    role: 'COMPANY',
    surfacePrecondition: { route: '/company/operations', id: 2117, label: 'Operasyon Paneli', role: 'COMPANY' },
  }, 'Bu çalışma alanında hangi bölümler ne işe yarar?', null);
  if (result.status !== 200) throw new Error(`AUTHORITY_PROOF_STATUS:${result.status}`);
  const actual = canonicalFields(result.body);
  const authority = actual.authority || {};
  assert.equal(authority.mode, 'NEW', 'authority mode');
  assert.equal(authority.authoritativePath, 'NEW_TYPED_EVIDENCE', 'authority path');
  assert.equal(authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, 'per-request authority count');
  assert.equal(authority.SEMANTIC_AUTHORITY_COUNT ?? authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, 'semantic authority count');
  assert.equal(authority.SHADOW_SEMANTIC_AUTHORITY_COUNT, 0, 'shadow authority count');
  assert.equal(authority.DUAL_SEMANTIC_AUTHORITY_COUNT, 0, 'dual authority count');
  assert.equal(authority.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0, 'fallback count');
  assert.equal(authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT, 0, 'downstream redecision count');
  return { health: 'PASS', authority, canonical: actual };
}

function gitHead() {
  return execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function classifyFailure(error, mismatches, result) {
  if (error?.message?.startsWith('LOGIN_FAILED') || error?.message?.startsWith('AUTHORITY_PROOF') || error?.name === 'AbortError') return 'ENVIRONMENT_DEFECT';
  if (result && result.status >= 500) return 'ENVIRONMENT_DEFECT';
  if (mismatches?.length) return 'STALE_OR_INVALID_HOLDOUT_EXPECTATION';
  return 'HARNESS_DEFECT';
}

async function runHoldout(manifest, initialHash) {
  const apiBase = defaultApiBase;
  const report = {
    manifestPath: path.relative(repoRoot, manifestPath).replaceAll('\\', '/'),
    preExecutionManifestHash: initialHash,
    executionOrderSha256: sha256Text(manifest.executionOrder.join('\n')),
    sourceHead: gitHead(),
    authorityMode,
    currentSourceRuntimeProven: false,
    healthcheck: 'NOT_RUN',
    executed: [],
    firstFailure: null,
    businessWriteExecution: 0,
  };
  if (report.sourceHead !== 'd85ea52218adcfcbacbdac279526ca0e767c4d0d') throw new Error(`HEAD_MISMATCH:${report.sourceHead}`);
  report.healthcheck = (await health(apiBase)) ? 'PASS' : 'FAIL';
  if (report.healthcheck !== 'PASS') throw new Error('HEALTHCHECK_FAILED');
  const proof = await authorityProof(apiBase);
  report.currentSourceRuntimeProven = true;
  report.liveProvenanceMode = proof.authority.mode;
  report.liveAuthoritativePath = proof.authority.authoritativePath;
  report.semanticAuthorityCount = proof.authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT;
  report.shadowSemanticAuthorityCount = proof.authority.SHADOW_SEMANTIC_AUTHORITY_COUNT;
  report.runtimeFallbackCount = proof.authority.RUNTIME_SEMANTIC_FALLBACK_COUNT;
  report.downstreamRedecisionCount = proof.authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT;

  for (let index = 0; index < manifest.executionOrder.length; index += 1) {
    const caseId = manifest.executionOrder[index];
    const item = manifest.cases.find((candidate) => candidate.caseId === caseId);
    const row = { index: index + 1, caseId, role: item.role, sessionIsolationProven: false, turns: [] };
    let result = null;
    let mismatches = [];
    try {
      const token = await login(apiBase, item.role, item.caseId);
      row.sessionIsolationProven = true;
      let conversationState = null;
      for (let turnIndex = 0; turnIndex < item.turns.length; turnIndex += 1) {
        result = await copilot(apiBase, token, item, item.turns[turnIndex], conversationState);
        const actual = result.body ? canonicalFields(result.body) : null;
        row.turns.push({ turnIndex: turnIndex + 1, rawInput: item.turns[turnIndex], status: result.status, actual });
        if (result.status !== 200 || !actual) throw new Error(`COPILOT_FAILED:${result.status}`);
        const authority = actual.authority || {};
        if (authority.mode !== 'NEW' || authority.authoritativePath !== 'NEW_TYPED_EVIDENCE' || authority.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT !== 1 || authority.SHADOW_SEMANTIC_AUTHORITY_COUNT !== 0 || authority.RUNTIME_SEMANTIC_FALLBACK_COUNT !== 0 || authority.DOWNSTREAM_SEMANTIC_REDECISION_COUNT !== 0) throw new Error('CASE_AUTHORITY_PROOF_FAILED');
        const counters = responseCounters(result.body);
        if (counters && Number(counters.businessWriteExecution ?? counters.businessWriteExecutions ?? counters.businessWrites ?? 0) !== 0) throw new Error('BUSINESS_WRITE_EXECUTION_NONZERO');
        if (turnIndex < item.turns.length - 1) {
          conversationState = responseConversationState(result.body);
          if (!conversationState) throw new Error('CONTINUATION_STATE_MISSING');
        }
      }
      const finalActual = row.turns[row.turns.length - 1].actual;
      mismatches = compareExpected(item.expected, finalActual);
      if (mismatches.length) throw new Error(`EXPECTED_CONTRACT_MISMATCH:${mismatches[0].field}`);
      row.status = 'PASS';
      report.executed.push(row);
    } catch (error) {
      row.status = 'FAIL';
      row.error = error.message;
      row.classification = classifyFailure(error, mismatches, result);
      row.expected = item.expected;
      row.actual = row.turns.at(-1)?.actual || null;
      report.executed.push(row);
      report.firstFailure = row;
      break;
    }
  }
  report.postExecutionManifestHash = sha256File(manifestPath);
  report.manifestMutationAfterFreeze = report.postExecutionManifestHash === initialHash ? 'NO' : 'YES';
  report.status = report.firstFailure ? 'RED' : (report.executed.length === 56 && report.manifestMutationAfterFreeze === 'NO' ? 'GREEN' : 'BLOCKED');
  report.holdoutExecutedCount = report.executed.length;
  report.holdoutPassCount = report.executed.filter((item) => item.status === 'PASS').length;
  report.holdoutFailCount = report.executed.filter((item) => item.status === 'FAIL').length;
  report.holdoutNotRunCount = 56 - report.holdoutExecutedCount;
  return report;
}

const mode = process.argv[2] || '--audit';
if (mode === '--audit') {
  const manifest = readManifest();
  const audit = auditManifest(manifest);
  console.log(JSON.stringify({ mode, manifestPath: path.relative(repoRoot, manifestPath).replaceAll('\\', '/'), manifestSha256: sha256File(manifestPath), executionOrderSha256: sha256Text(manifest.executionOrder.join('\n')), audit }, null, 2));
  process.exitCode = audit.errors.length ? 1 : 0;
} else if (mode === '--execute') {
  const manifest = readManifest();
  const audit = auditManifest(manifest);
  if (audit.errors.length) {
    console.error(JSON.stringify({ mode, status: 'BLOCKED', audit }, null, 2));
    process.exitCode = 2;
  } else {
    const initialHash = sha256File(manifestPath);
    try {
      const report = await runHoldout(manifest, initialHash);
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.status === 'GREEN' ? 0 : 1;
    } catch (error) {
      console.error(JSON.stringify({ mode, status: 'BLOCKED', sourceHead: (() => { try { return gitHead(); } catch { return null; } })(), error: error.message, manifestSha256: sha256File(manifestPath), preExecutionManifestHash: initialHash }, null, 2));
      process.exitCode = 2;
    }
  }
} else {
  console.error(`UNKNOWN_MODE:${mode}`);
  process.exitCode = 2;
}
