#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { getSemanticAuthorityMode } from '../src/ai/chat/semanticAuthorityMode.js';

const REQUESTED_AUTHORITY_MODE = 'NEW';
process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = REQUESTED_AUTHORITY_MODE;

function user(role = 'COMPANY', id = 994001) {
  return {
    id,
    role,
    companyKind: role === 'COMPANY' ? 'COMPANY' : null,
    companyId: role === 'ROOM' ? null : 1,
    roomId: role === 'ROOM' ? 1 : null,
    sessionVersion: 1,
  };
}

function screen(path, label, role = 'COMPANY') {
  return { id: 2101, path, label, role };
}

function shape(payload) {
  const request = payload?.semanticPlan?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: payload?.semanticPlan?.family || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: payload?.semanticPlan?.authorizationDecision?.status || null,
    resolution: action.resolutionStatus || null,
  };
}

function directShape(message, role, screenContext) {
  const result = resolveCanonicalConversationRequest({
    message,
    user: user(role, 994001),
    screenContext,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  return {
    family: result.canonicalShape?.taskType || null,
    scope: result.request?.semanticScope?.class || null,
    action: result.request?.semanticAction?.actionClass || null,
    object: result.request?.semanticAction?.objectClass || null,
    operation: result.request?.operation || null,
    capability: result.request?.capability || null,
    authorization: null,
    resolution: result.request?.semanticAction?.resolutionStatus || null,
  };
}

const authorityProbe = resolveCanonicalConversationRequest({
  message: 'Burayı nasıl kullanırım',
  user: user('COMPANY', 994001),
  screenContext: screen('/company/operations', 'Operasyon Paneli', 'COMPANY'),
  env: process.env,
});
const authorityDiagnostics = authorityProbe.diagnostics?.semanticAuthority || {};
if (getSemanticAuthorityMode({ env: process.env }) !== REQUESTED_AUTHORITY_MODE
  || authorityDiagnostics.mode !== REQUESTED_AUTHORITY_MODE
  || authorityDiagnostics.authoritativePath !== 'NEW_TYPED_EVIDENCE'
  || authorityDiagnostics.SHADOW_SEMANTIC_AUTHORITY_COUNT !== 0
  || authorityDiagnostics.RUNTIME_SEMANTIC_FALLBACK_COUNT !== 0) {
  throw new Error('M18 authority propagation proof failed');
}

async function ask({ id, message, role = 'COMPANY', path = '/company/operations', label = 'Operasyon Paneli', screenRole = role }) {
  const screenContext = path ? screen(path, label, screenRole) : undefined;
  return runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: user(role, 994001 + id.length),
    ...(screenContext ? { screenContext } : {}),
    message,
    authSessionId: `m18-shared-surface-${id}`,
  });
}

const actual = {
  genericUsage: shape(await ask({ id: 'generic-usage', message: 'Nasıl kullanırım?' })),
  genericRoleHelp: shape(await ask({ id: 'generic-role-help', message: 'Bu rolde ne yapabilirim?' })),
  surfacePurpose: shape(await ask({ id: 'surface-purpose', message: 'Bu ekran ne işe yarıyor?' })),
  surfaceFields: shape(await ask({ id: 'surface-fields', message: 'Bu ekrandaki alanları anlat.' })),
  validDeictic: shape(await ask({ id: 'valid-deictic', message: 'Burayı nasıl kullanırım' })),
  invalidDeictic: shape(await ask({ id: 'invalid-deictic', message: 'Burayı nasıl kullanırım', path: null, label: null })),
  contextualView: shape(await ask({ id: 'contextual-view', message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?' })),
  explicitView: shape(await ask({ id: 'explicit-view', message: 'Vardiya listesini görüntüle.' })),
  explicitNavigate: shape(await ask({ id: 'explicit-navigate', message: 'Sözleşmeler sayfasına geçelim.' })),
  roomCreate: directShape('Yeni vardiya planlamak istiyorum.', 'ROOM', { path: '/role-boundary', label: 'ROLE_BOUNDARY', role: 'ROOM', companyKind: 'ROOM' }),
};

const expected = {
  genericUsage: { action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
  genericRoleHelp: { action: 'EXPLAIN', object: 'SURFACE', operation: 'GENERAL_INFORMATION' },
  surfacePurpose: { action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
  surfaceFields: { action: 'EXPLAIN', object: 'SURFACE', operation: 'EXPLAIN_CURRENT_SURFACE' },
  validDeictic: { action: 'EXPLAIN', object: 'SURFACE', scope: 'PRODUCT_EXPLICIT' },
  invalidDeictic: { action: 'NONE', object: null, scope: 'UNRESOLVED' },
  contextualView: { action: 'VIEW', object: 'SHIFT', operation: 'VIEW_AUTHORIZED_SURFACE' },
  explicitView: { action: 'VIEW', object: 'SHIFT' },
  explicitNavigate: { action: 'NAVIGATE', object: 'SURFACE' },
  roomCreate: { action: 'CREATE', object: 'SHIFT' },
};

const failures = [];
for (const [caseId, contract] of Object.entries(expected)) {
  for (const [field, value] of Object.entries(contract)) {
    if (actual[caseId][field] !== value) failures.push({ caseId, field, expected: value, actual: actual[caseId][field] });
  }
}

assert.equal(actual.genericUsage.object, 'SURFACE', 'generic usage must be grounded in the authorized current surface');
assert.equal(actual.genericUsage.operation, 'EXPLAIN_CURRENT_SURFACE', 'generic usage must use current-surface explanation');
assert.equal(actual.genericRoleHelp.object, 'SURFACE', 'generic role help may be grounded in the authorized current surface');
assert.equal(actual.genericRoleHelp.operation, 'GENERAL_INFORMATION', 'generic role help remains informational');
assert.equal(actual.invalidDeictic.object, null, 'invalid deictic must not fabricate a surface target');

console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'EXPECTED_RED',
  requestedAuthorityMode: REQUESTED_AUTHORITY_MODE,
  selectedAuthoritativePath: authorityDiagnostics.authoritativePath,
  shadowAuthorityCount: authorityDiagnostics.SHADOW_SEMANTIC_AUTHORITY_COUNT,
  runtimeFallbackCount: authorityDiagnostics.RUNTIME_SEMANTIC_FALLBACK_COUNT,
  actual,
  failures,
  businessWriteExecution: 0,
  authorizationMutationCount: 0,
  tenantPolicyMutationCount: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
