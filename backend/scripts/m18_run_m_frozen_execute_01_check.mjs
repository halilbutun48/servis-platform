import Module from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const manifestPath = resolve(process.env.M18_RUN_MANIFEST_PATH || join(root, 'backend', 'artifacts', 'holdout', 'm18-run-m-fresh-unseen-20261003.json'));
const manifestHashPath = manifestPath + '.sha256';
const resultPath = resolve(process.env.M18_RUN_RESULT_PATH || manifestPath.replace(/\.json$/u, '-execution.json'));
const digest = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const PRISMA_MUTATION_METHODS = ['create', 'createMany', 'createManyAndReturn', 'delete', 'deleteMany', 'update', 'updateMany', 'updateManyAndReturn', 'upsert'];
const PRISMA_ROOT_MUTATION_METHODS = ['$executeRaw', '$executeRawUnsafe', '$runCommandRaw', '$transaction'];
const LLM_SECRET_ENV_KEYS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'AZURE_OPENAI_API_KEY', 'LLM_API_SECRET'];
const EXTERNAL_PROVIDER_NAMES = /^(?:openai|@anthropic|@google-generativeai|@google\/generative-ai|@azure\/openai|@google-cloud\/vertexai|@ai-sdk\/)/u;
const SELF_TEST = process.argv.includes('--self-test');

if (SELF_TEST) {
  const observed = canonical({
    semanticPlan: {
      canonicalRequest: {
        semanticScope: { class: 'PRODUCT_EXPLICIT' },
        semanticAction: { actionClass: 'EXPLAIN', objectClass: 'SURFACE', resolutionStatus: 'RESOLVED' },
        operation: 'GENERAL_INFORMATION',
        capability: 'GENERAL_INFORMATION',
      },
      canonicalRequestEnvelope: {
        diagnostics: {
          semanticAuthority: { mode: 'SHADOW' },
          shadowSemanticEvidence: {
            newEvidence: {
              requestMode: { value: 'EXPLAIN' },
              roleAspect: { value: 'STARTING_GUIDANCE' },
            },
          },
        },
      },
    },
  });
  const expectedItem = {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT',
    EXPECTED_ACTION_CLASS: 'EXPLAIN',
    EXPECTED_OBJECT_CLASS: 'SURFACE',
    EXPECTED_RESOLUTION_STATUS: 'RESOLVED',
    EXPECTED_AUTHORIZATION: 'ALLOW',
    EXPECTED_OPERATION: 'GENERAL_INFORMATION',
    EXPECTED_CAPABILITY: 'GENERAL_INFORMATION',
    IMMEDIATE_REQUESTED_ACTION: 'EXPLAIN',
    EXPECTED_WORKFLOW: null,
    EXPECTED_TARGET_CLASS: 'NONE',
  };
  const observedFailures = evaluate(expectedItem, { ...observed, authorization: 'ALLOW' }, 'plain response');
  const missing = canonical({
    semanticPlan: {
      canonicalRequest: {
        semanticScope: { class: 'PRODUCT_EXPLICIT' },
        semanticAction: { actionClass: 'EXPLAIN', objectClass: 'SURFACE', resolutionStatus: 'RESOLVED' },
        operation: 'GENERAL_INFORMATION',
        capability: 'GENERAL_INFORMATION',
      },
      canonicalRequestEnvelope: { diagnostics: { semanticAuthority: { mode: 'SHADOW' } } },
    },
  });
  const missingFailures = evaluate(expectedItem, { ...missing, authorization: 'ALLOW' }, 'plain response');
  const newAuthority = canonical({
    semanticPlan: {
      canonicalRequest: {
        semanticScope: { class: 'PRODUCT_EXPLICIT' },
        semanticAction: { actionClass: 'EXPLAIN', objectClass: 'SURFACE', resolutionStatus: 'RESOLVED' },
        operation: 'GENERAL_INFORMATION',
        capability: 'GENERAL_INFORMATION',
        typedEvidence: {
          requestMode: { value: 'EXPLAIN' },
          roleAspect: { value: 'STARTING_GUIDANCE' },
        },
      },
      canonicalRequestEnvelope: { diagnostics: { semanticAuthority: { mode: 'NEW' } } },
    },
  });
  const rawOnly = canonical({
    semanticPlan: {
      canonicalRequest: {
        semanticScope: { class: 'PRODUCT_EXPLICIT' },
        semanticAction: { actionClass: 'EXPLAIN', objectClass: 'SURFACE', resolutionStatus: 'RESOLVED' },
        operation: 'GENERAL_INFORMATION',
        capability: 'GENERAL_INFORMATION',
      },
      rawText: 'açıklama isteği',
    },
  });
  if (observed.requestMode !== 'EXPLAIN' || observed.typedEvidenceObserved !== true || observedFailures.length !== 0) {
    throw new Error(`RED: authoritative typed evidence was not observed correctly: ${JSON.stringify({ observed, observedFailures })}`);
  }
  if (missing.typedEvidenceObserved !== false || !missingFailures.some((failure) => failure.classification === 'MISSING_TYPED_EVIDENCE')) {
    throw new Error(`RED: missing typed evidence did not fail closed: ${JSON.stringify({ missing, missingFailures })}`);
  }
  if (newAuthority.requestMode !== 'EXPLAIN' || newAuthority.typedEvidenceSource !== 'CANONICAL_REQUEST_TYPED_EVIDENCE' || rawOnly.requestMode !== null || rawOnly.typedEvidenceObserved !== false) {
    throw new Error(`RED: evidence adapter reinterpreted or misread a non-authoritative source: ${JSON.stringify({ newAuthority, rawOnly })}`);
  }
  console.log(JSON.stringify({ status: 'GREEN', observed, missing, missingFailures }, null, 2));
  process.exit(0);
}

if (!existsSync(manifestPath) || !existsSync(manifestHashPath)) throw new Error('Frozen Run M manifest or its SHA-256 sidecar is missing.');
if (existsSync(resultPath)) throw new Error('Run M execution artifact already exists; refusing to re-execute a frozen holdout.');
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const expectedManifestHash = readFileSync(manifestHashPath, 'utf8').trim().split(/\s+/u)[0];
const actualManifestHash = digest(manifestBytes);
if (actualManifestHash !== expectedManifestHash) throw new Error('Frozen manifest SHA-256 mismatch; execution is prohibited.');

function userFor(role) {
  if (role === 'ROOM') return { id: 995001, role, roomId: 1, companyId: null, sessionVersion: 1 };
  if (role === 'SCHOOL') return { id: 995002, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'ORGANIZATION') return { id: 995003, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'COMPANY') return { id: 995004, role, companyKind: 'COMPANY', companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'DRIVER') return { id: 995005, role, companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'PARENT') return { id: 995006, role, companyId: null, roomId: null, sessionVersion: 1 };
  if (role === 'PERSONEL') return { id: 995007, role, companyId: 1, roomId: null, sessionVersion: 1 };
  return { id: 995008, role: 'SUPER_ADMIN', companyId: null, roomId: null, sessionVersion: 1 };
}
function screen(path, role) {
  const ids = { COMPANY: 1, ROOM: 1103, SCHOOL: 1, ORGANIZATION: 1, DRIVER: 1, PARENT: 5101, PERSONEL: 1, SUPER_ADMIN: 6117 };
  const labels = { COMPANY: 'Operasyon Paneli', ROOM: 'Vardiyalar', SCHOOL: 'Okul Operasyonları', ORGANIZATION: 'Organizasyon Operasyonları', DRIVER: 'Bugün', PARENT: 'Canlı', PERSONEL: 'Canlı', SUPER_ADMIN: 'Denetim Paneli' };
  return { id: ids[role], path, label: labels[role], role };
}
function activeGuidedTask(item) {
  if (!item.ACTIVE_TASK_CONTEXT) return null;
  return {
    taskId: `${String(manifest.runId || 'run').toLowerCase()}-${item.CASE_ID.toLowerCase()}`,
    workflowIntent: item.ACTIVE_TASK_CONTEXT,
    semanticPlan: {
      workflowIntent: item.ACTIVE_TASK_CONTEXT,
      requestedDomains: item.ACTIVE_TASK_CONTEXT === 'CREATE_SHIFT' ? ['SHIFTS'] : [],
      family: 'GENERIC_PRODUCT_HELP',
      dialogueTopic: 'PRODUCT'
    }
  };
}
function readEvidenceValue(item) {
  if (typeof item === 'string') return item || null;
  if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'value')) return item.value || null;
  return null;
}
function authoritativeTypedEvidence(payload, request) {
  const envelope = payload?.semanticPlan?.canonicalRequestEnvelope;
  const mode = envelope?.diagnostics?.semanticAuthority?.mode;
  if (mode === 'SHADOW') {
    return {
      evidence: envelope?.diagnostics?.shadowSemanticEvidence?.newEvidence || null,
      source: 'CANONICAL_REQUEST_ENVELOPE_SHADOW_TYPED_EVIDENCE',
    };
  }
  if (request?.typedEvidence) return { evidence: request.typedEvidence, source: 'CANONICAL_REQUEST_TYPED_EVIDENCE' };
  return { evidence: null, source: 'MISSING' };
}
function canonical(payload) {
  const request = payload?.semanticPlan?.canonicalRequest || {};
  const semanticAction = request.semanticAction || {};
  const typed = authoritativeTypedEvidence(payload, request);
  const target = payload?.semanticPlan?.guidedTarget || payload?.semanticPlan?.target || payload?.guidedTarget || null;
  return {
    family: payload?.semanticPlan?.family || null,
    scope: request.semanticScope?.class || null,
    action: semanticAction.actionClass || null,
    object: semanticAction.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: payload?.semanticPlan?.authorizationDecision?.status || null,
    resolution: semanticAction.resolutionStatus || null,
    requestMode: readEvidenceValue(typed.evidence?.requestMode),
    roleAspect: readEvidenceValue(typed.evidence?.roleAspect),
    typedEvidenceObserved: Boolean(typed.evidence),
    typedEvidenceSource: typed.source,
    workflow: payload?.semanticPlan?.workflowIntent || request.workflowIntent || null,
    targetStatus: target?.status || null,
    targetKey: target?.targetKey || target?.key || null
  };
}
function installRuntimeGuards(client) {
  const counters = {
    businessWriteExecution: 0, draftCreation: 0, offerSend: 0, dispatchExecution: 0, financialWrite: 0, authorizationMutation: 0,
    externalLlmProviderCount: 0, externalLlmNetworkCallCount: 0, llmApiSecretCount: LLM_SECRET_ENV_KEYS.filter((key) => Boolean(process.env[key])).length,
    prismaMutationAttemptCount: 0, prismaMutationBlockedCount: 0, externalNetworkAttemptCount: 0, externalNetworkBlockedCount: 0
  };
  const restorations = [];
  const blockWrite = (label) => () => {
    counters.prismaMutationAttemptCount += 1;
    counters.prismaMutationBlockedCount += 1;
    counters.businessWriteExecution += 1;
    throw new Error('RUN_M_RUNTIME_WRITE_GUARD_BLOCKED:' + label);
  };
  const wrap = (target, key, label) => {
    if (!target || typeof target[key] !== 'function') return;
    const hadOwn = Object.hasOwn(target, key);
    const descriptor = hadOwn ? Object.getOwnPropertyDescriptor(target, key) : null;
    target[key] = blockWrite(label);
    restorations.push(() => {
      if (hadOwn) Object.defineProperty(target, key, descriptor);
      else delete target[key];
    });
  };
  for (const modelName of Object.keys(client)) {
    if (modelName.startsWith('_') || modelName.startsWith('$')) continue;
    const delegate = client[modelName];
    for (const method of PRISMA_MUTATION_METHODS) wrap(delegate, method, modelName + '.' + method);
  }
  for (const method of PRISMA_ROOT_MUTATION_METHODS) wrap(client, method, method);
  const originalLoad = Module._load;
  Module._load = function guardedLoad(request, parent, isMain) {
    if (EXTERNAL_PROVIDER_NAMES.test(String(request))) {
      counters.externalLlmProviderCount += 1;
      throw new Error('RUN_M_EXTERNAL_LLM_PROVIDER_BLOCKED:' + request);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (...args) => {
    counters.externalNetworkAttemptCount += 1;
    counters.externalNetworkBlockedCount += 1;
    counters.externalLlmNetworkCallCount += 1;
    throw new Error('RUN_M_EXTERNAL_NETWORK_BLOCKED:' + String(args[0] || ''));
  };
  return {
    counters,
    restore() {
      for (const restoreOne of restorations.reverse()) restoreOne();
      Module._load = originalLoad;
      globalThis.fetch = previousFetch;
    }
  };
}
function mismatch(field, expected, actual, type) {
  return { field, expected, actual, classification: type };
}
function evaluate(item, actual, reply) {
  const failures = [];
  const comparisons = [
    ['scope', item.EXPECTED_SEMANTIC_SCOPE, actual.scope, 'WRONG_SCOPE'],
    ['action', item.EXPECTED_ACTION_CLASS, actual.action, 'WRONG_ACTION'],
    ['object', item.EXPECTED_OBJECT_CLASS, actual.object, 'WRONG_OBJECT'],
    ['resolution', item.EXPECTED_RESOLUTION_STATUS, actual.resolution, 'WRONG_RESOLUTION'],
    ['authorization', item.EXPECTED_AUTHORIZATION, actual.authorization, 'AUTHORIZATION_OR_TENANT_FAILURE']
  ];
  for (const [field, expected, observed, classification] of comparisons) if (expected !== observed) failures.push(mismatch(field, expected, observed, classification));
  if (item.EXPECTED_OPERATION !== null && item.EXPECTED_OPERATION !== actual.operation) failures.push(mismatch('operation', item.EXPECTED_OPERATION, actual.operation, 'WRONG_OPERATION'));
  if (item.EXPECTED_CAPABILITY !== null && item.EXPECTED_CAPABILITY !== actual.capability) failures.push(mismatch('capability', item.EXPECTED_CAPABILITY, actual.capability, 'WRONG_CAPABILITY'));
  if (item.IMMEDIATE_REQUESTED_ACTION !== 'NONE') {
    if (actual.typedEvidenceObserved !== true) failures.push(mismatch('typedEvidence', 'OBSERVED', actual.typedEvidenceSource, 'MISSING_TYPED_EVIDENCE'));
    else if (actual.requestMode !== item.IMMEDIATE_REQUESTED_ACTION) failures.push(mismatch('requestMode', item.IMMEDIATE_REQUESTED_ACTION, actual.requestMode, 'WRONG_REQUEST_MODE'));
  }
  if (item.EXPECTED_WORKFLOW !== null && item.EXPECTED_WORKFLOW !== actual.workflow) failures.push(mismatch('workflow', item.EXPECTED_WORKFLOW, actual.workflow, 'WRONG_WORKFLOW'));
  if (item.EXPECTED_TARGET_CLASS === 'CURRENT_UI' && (!actual.targetStatus || actual.targetStatus !== 'FOUND' || !actual.targetKey)) failures.push(mismatch('target', 'FOUND grounded current-UI target', { status: actual.targetStatus, targetKey: actual.targetKey }, 'UI_TARGET_IDENTITY_OR_GROUNDING_FAILURE'));
  if (/(?:NEEDS_REVIEW|OFF_TOPIC_GENUINE|PRODUCT_EXPLICIT|GENERAL_INFORMATION|CREATE_AUTHORIZED_RECORD)/u.test(String(reply || ''))) failures.push(mismatch('visibleLanguage', 'no raw internal token', String(reply || ''), 'VISIBLE_LANGUAGE_LEAK'));
  return failures;
}
function earliestOwner(failure) {
  const owner = {
    WRONG_REQUEST_MODE: 'typed semantic evidence / request-mode composition',
    MISSING_TYPED_EVIDENCE: 'Run-M evidence extractor / canonical typed-evidence observer',
    WRONG_SCOPE: 'semantic evidence composition',
    WRONG_ACTION: 'canonical semantic action mapping',
    WRONG_OBJECT: 'canonical object resolution',
    WRONG_RESOLUTION: 'canonical resolution validation',
    WRONG_OPERATION: 'canonical operation inference',
    WRONG_CAPABILITY: 'canonical capability inference',
    WRONG_WORKFLOW: 'workflow grounding',
    AUTHORIZATION_OR_TENANT_FAILURE: 'authorization gate',
    UI_TARGET_IDENTITY_OR_GROUNDING_FAILURE: 'grounding target resolver',
    VISIBLE_LANGUAGE_LEAK: 'visible-language renderer'
  };
  return owner[failure.classification] || 'unknown';
}
function writeResult(result) {
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

const preExecutionHashMismatches = Object.entries({ ...manifest.sourceOwnerHashes, ...(manifest.harnessSourceHashes || {}) }).flatMap(([relativePath, expectedHash]) => {
  const path = join(root, relativePath);
  if (!existsSync(path)) return [mismatch(relativePath, expectedHash, 'MISSING', 'STALE_RUNTIME')];
  const actualHash = digest(readFileSync(path));
  return actualHash === expectedHash ? [] : [mismatch(relativePath, expectedHash, actualHash, 'STALE_RUNTIME')];
});
if (preExecutionHashMismatches.length > 0) {
  writeResult({
    runId: manifest.runId, manifestSha256: actualManifestHash, executionStatus: 'FROZEN_FAIL',
    firstMaterialFail: { caseId: null, classification: 'STALE_RUNTIME', failures: preExecutionHashMismatches, earliestOwner: 'product source identity' },
    executedCaseCount: 0, unexecutedCaseCount: manifest.frozenExecutionOrder.length,
    executionOrderPreserved: true, sourceHashParity: 'FAIL'
  });
  process.exitCode = 1;
} else {
  const { default: prisma } = await import('../src/prisma.js');
  const runtimeGuards = installRuntimeGuards(prisma);
  try {
    const { runCopilotFoundation } = await import('../src/ai/service.js');
    const rows = [];
    let firstMaterialFail = null;
    for (let index = 0; index < manifest.frozenExecutionOrder.length; index += 1) {
      const caseId = manifest.frozenExecutionOrder[index];
      const item = manifest.cases.find((testCase) => testCase.CASE_ID === caseId);
      if (!item) throw new Error('Frozen execution order references a missing case: ' + caseId);
      const screenContext = screen(item.SURFACE_CONTEXT, item.ROLE);
      let payload;
      try {
        payload = await runCopilotFoundation({
          intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: userFor(item.ROLE), screenContext,
          message: item.UTTERANCE, authSessionId: 'run-m-' + item.CASE_ID.toLowerCase(),
          conversationState: { recentMessages: [], activeGuidedTask: activeGuidedTask(item), uiSurface: screenContext },
          interpreterMode: 'DETERMINISTIC'
        });
      } catch (error) {
        firstMaterialFail = {
          caseId: item.CASE_ID, classification: String(error?.message || '').includes('RUNTIME_WRITE_GUARD') ? 'BUSINESS_WRITE_ATTEMPT' : 'EXECUTION_ERROR',
          failures: [{ field: 'execution', expected: 'successful deterministic semantic evaluation', actual: String(error?.stack || error), classification: 'EXECUTION_ERROR' }],
          earliestOwner: 'runtime semantic path'
        };
        break;
      }
      const actual = canonical(payload);
      const failures = evaluate(item, actual, payload?.reply);
      rows.push({ caseId: item.CASE_ID, actual, failures, replyLength: String(payload?.reply || '').length });
      if (failures.length > 0) {
        firstMaterialFail = { caseId: item.CASE_ID, classification: failures[0].classification, failures, earliestOwner: earliestOwner(failures[0]) };
        break;
      }
    }
    const safetyFailures = Object.entries(runtimeGuards.counters).filter(([key, value]) => ['businessWriteExecution', 'externalLlmProviderCount', 'externalLlmNetworkCallCount', 'llmApiSecretCount'].includes(key) && value !== 0);
    if (!firstMaterialFail && safetyFailures.length > 0) firstMaterialFail = { caseId: null, classification: 'SAFETY_POLICY_FAILURE', failures: safetyFailures.map(([field, value]) => mismatch(field, 0, value, 'SAFETY_POLICY_FAILURE')), earliestOwner: 'runtime guard' };
    writeResult({
      runId: manifest.runId, manifestSha256: actualManifestHash,
      executionStatus: firstMaterialFail ? 'FROZEN_FAIL' : 'COMPLETE',
      firstMaterialFail, executedCaseCount: rows.length,
      unexecutedCaseCount: manifest.frozenExecutionOrder.length - rows.length,
      executionOrderPreserved: true, sourceHashParity: 'PASS',
      rows, safety: runtimeGuards.counters,
      postFreezeManifestMutationCount: 0, postFreezeExpectationMutationCount: 0, postFreezeProductSemanticMutationCount: 0, postFreezeHarnessSemanticRepairCount: 0
    });
    process.exitCode = firstMaterialFail ? 1 : 0;
  } finally {
    runtimeGuards.restore();
  }
}
