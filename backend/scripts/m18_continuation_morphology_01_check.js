#!/usr/bin/env node

import { extractTurkishSemanticFeatures } from '../src/ai/chat/turkishSemanticFeatures.js';
import { composeSemanticEvidence } from '../src/ai/chat/semanticEvidenceComposer.js';
import { buildCanonicalSemanticContext } from '../src/ai/chat/canonicalSemanticContext.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';

const user = { id: 995001, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1, sessionVersion: 1 };
const screenContext = { id: 2101, path: '/company/operations', label: 'Operasyon Paneli', role: 'COMPANY' };

const settledCanonicalRequest = {
  version: 'SEFER-ABI-CANONICAL-REQUEST-V3',
  operation: 'GENERAL_INFORMATION',
  domain: 'PRODUCT',
  capability: 'GENERAL_INFORMATION',
  semanticScope: { class: 'PRODUCT_EXPLICIT', explicit: true },
  semanticAction: { actionClass: 'EXPLAIN', objectClass: null, resolutionStatus: 'RESOLVED' },
  continuation: { mode: 'NEW_REQUEST', baseRequestId: null, depth: 0 },
};

const settledPlan = {
  family: 'GENERIC_PRODUCT_HELP',
  conversationRoute: 'GENERIC_PRODUCT_HELP',
  canonicalRequest: settledCanonicalRequest,
  typedRequest: { taskType: 'OFF_TOPIC', continuationIntent: false },
};

function stateWith({ active = false, stale = false, settled = true } = {}) {
  return {
    activeGuidedTask: active
      ? {
        taskId: 'synthetic-active-task',
        workflowIntent: 'CREATE_SHIFT',
        taskState: stale ? 'STALE' : 'ACTIVE',
        semanticPlan: { workflowIntent: 'CREATE_SHIFT', requestedDomains: ['SHIFTS'] },
      }
      : null,
    activeTask: null,
    revalidationRequired: stale,
    transition: stale ? { type: 'INVALIDATE_STALE_CONTEXT' } : null,
    lastSettledResult: active || !settled ? null : { semanticPlan: settledPlan, requestId: 'settled-help-1' },
    productContext: active || !settled ? null : { semanticPlan: settledPlan, screenPath: screenContext.path, suspended: false },
    entityContext: { conversationEntities: [], selectedEntity: null, selectedRelatedEntity: null, referentConfidence: 0 },
    recentMessages: active ? [{ role: 'user', content: 'Önceki açıklamayı sürdürelim.' }] : [],
    updatedAt: Date.now(),
  };
}

function observe(message, conversationState) {
  const features = extractTurkishSemanticFeatures({ text: message });
  const context = buildCanonicalSemanticContext({ message, user, screenContext, conversationState });
  const evidence = composeSemanticEvidence({ features, context, conversationState, screenContext });
  const resolved = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  return {
    action: resolved.request.semanticAction?.actionClass || null,
    continuation: resolved.request.continuation?.mode || null,
    taskType: resolved.canonicalShape?.taskType || null,
    requestMode: evidence.requestMode?.value || null,
    continuityStatus: context.continuity?.continuation?.status || null,
  };
}

const cases = [
  { id: 'BARE_CONTINUE', input: 'Devam.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING' } },
  { id: 'CONTINUE_ET', input: 'Devam et.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING' } },
  { id: 'INFLECTED_CONTINUE', input: 'Devamını anlat.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING' } },
  { id: 'INFLECTED_CONTINUE_VIEW', input: 'Devamını göster.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING' } },
  { id: 'INFLECTED_CONTINUE_NEXT', input: 'Devamına geç.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING' } },
  { id: 'CONTINUE_FROM_POINT', input: 'Kaldığımız yerden devam edelim.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING' } },
  { id: 'NO_STATE_CONTINUATION', input: 'Devamını anlat.', state: stateWith({ settled: false }), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING', negate: true } },
  { id: 'STALE_STATE_CONTINUATION', input: 'Devamını anlat.', state: stateWith({ active: true, stale: true }), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING', negate: true } },
  { id: 'NON_CONTINUATION_SHIFT', input: 'Devam eden vardiyaları göster.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING', negate: true } },
  { id: 'NON_CONTINUATION_AGREEMENT', input: 'Devam eden sözleşmeleri listele.', state: stateWith(), expected: { action: 'CONTINUE', taskType: 'CONTINUE_CURRENT_REASONING', negate: true } },
  { id: 'EXPLICIT_NEW_CREATE', input: 'Yeni vardiya oluştur.', state: stateWith(), expected: { action: 'CREATE' } },
];

const results = cases.map((candidate) => {
  const actual = observe(candidate.input, candidate.state);
  const actionMatches = candidate.expected.negate
    ? actual.action !== candidate.expected.action && actual.taskType !== candidate.expected.taskType
    : actual.action === candidate.expected.action
      && (!candidate.expected.taskType || actual.taskType === candidate.expected.taskType);
  return { id: candidate.id, input: candidate.input, pass: actionMatches, actual, expected: candidate.expected };
});

const failures = results.filter((candidate) => !candidate.pass);
console.log(JSON.stringify({
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  focusedRedCaseCount: failures.length,
  results,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
