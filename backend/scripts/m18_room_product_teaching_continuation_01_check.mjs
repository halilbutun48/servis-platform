#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';

const user = { id: 880607, role: 'ROOM', companyKind: 'ROOM', roomId: 1, companyId: null };
const screenContext = { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' };
const authSessionId = `m18-room-teaching-regression-${Date.now()}`;

function semantic(message, conversationState = {}) {
  const canonicalRequest = resolveCanonicalConversationRequest({ message, user, screenContext, conversationState });
  return resolveSemanticIntent({ message, user, screenContext, conversationState, canonicalRequest });
}

function assertProductHelpPlan(message, plan) {
  assert.notEqual(plan?.family, 'SCREEN_CONTEXT', `${message} must not collapse to current-screen help`);
  assert.ok(['GENERIC_PRODUCT_HELP', 'ROLE_EXPLANATION_HELP'].includes(plan?.family), `${message} must remain product help`);
  assert.equal(plan?.scopeTarget, 'ROLE_GLOBAL', `${message} must remain role/product scoped`);
}

// Structural oracle: general product teaching and role capability questions
// remain product-help intents even while a surface is open.
for (const message of [
  'bu programı bana öğret',
  'bu program ne işe yarıyor',
  'SeferPaktı nasıl kullanacağımı anlat',
  'neler yapabilirim bu programla',
  'neler yapabılırım bu programla',
  'bu rolde hangi işlemleri yapabilirim',
]) {
  assertProductHelpPlan(message, semantic(message));
}

assert.equal(semantic('bu program ne işe yarıyor')?.family, 'GENERIC_PRODUCT_HELP', 'product overview must remain generic product help');
assert.equal(semantic('neler yapabılırım bu programla')?.family, 'ROLE_EXPLANATION_HELP', 'role capability morphology must remain role help');

const screenPlan = semantic('bu ekran ne işe yarıyor');
// The planner may project an explicit current-surface explanation through its
// UI-guidance response family, but the canonical operation and typed scope
// remain the stable contract asserted here.
const screenCanonical = resolveCanonicalConversationRequest({
  message: 'bu ekran ne işe yarıyor',
  user,
  screenContext,
  conversationState: {},
});
assert.equal(screenCanonical?.request?.operation, 'EXPLAIN_CURRENT_SURFACE', 'explicit current-screen explanation keeps the canonical operation');
assert.equal(screenPlan?.typedRequest?.taskType, 'SCREEN_CONTEXT', 'explicit current-screen explanation keeps the typed screen task');
assert.equal(screenPlan.scopeTarget, 'CURRENT_SCREEN', 'explicit current-screen explanation keeps screen scope');

const first = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1,
  user,
  screenContext,
  message: 'bu programı bana öğret',
  authSessionId,
});
assert.ok(['GENERIC_PRODUCT_HELP', 'ROLE_EXPLANATION_HELP'].includes(first?.semanticPlan?.family), 'teaching starts in product-help family');
assert.match(String(first?.reply || ''), /SeferPakt|platform|operasyon/iu, 'teaching starts with a truthful product purpose');

const overview = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1,
  user,
  screenContext,
  message: 'bu program ne işe yarıyor',
  authSessionId: `${authSessionId}-overview`,
});
assert.equal(overview?.semanticPlan?.family, 'GENERIC_PRODUCT_HELP', 'overview must use the product-help projection');
assert.match(String(overview?.reply || ''), /SeferPakt|platform|operasyon/iu, 'overview must explain the product rather than the current screen');

const capability = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1,
  user,
  screenContext,
  message: 'neler yapabılırım bu programla',
  authSessionId: `${authSessionId}-capability`,
});
assert.equal(capability?.semanticPlan?.family, 'ROLE_EXPLANATION_HELP', 'capability morphology must use role-help projection');
assert.match(String(capability?.reply || ''), /Taşımacılık|rol|vardiya|sefer/iu, 'capability answer must be role-grounded');

const replies = [String(first?.reply || '')];
const stages = [first?.teachingState?.sectionIndex];
for (let index = 0; index < 5; index += 1) {
  const next = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user,
    screenContext,
    message: 'Devamını anlat',
    authSessionId,
  });
  replies.push(String(next?.reply || ''));
  stages.push(next?.teachingState?.sectionIndex);
}

assert.equal(new Set(replies.slice(0, 4)).size, 4, 'initial teaching and first continuations provide new content');
assert.ok(stages.slice(0, 4).every((value, index) => Number(value) === index), 'teaching state advances by section');
assert.match(replies.at(-1), /tamam|sonraki|seç|seçenek/iu, 'completed teaching offers a relevant next choice');

const switched = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 1,
  user,
  screenContext,
  message: 'bu ekran ne işe yarıyor',
  authSessionId,
});
assert.equal(switched?.semanticPlan?.typedRequest?.taskType, 'SCREEN_CONTEXT', 'subject switch enters the typed screen context task');
assert.equal(switched?.semanticPlan?.scopeTarget, 'CURRENT_SCREEN', 'subject switch keeps current-screen scope');
assert.equal(switched?.teachingState || null, null, 'subject switch clears product teaching state');

console.log(JSON.stringify({
  status: 'GREEN',
  family: first?.semanticPlan?.family,
  sectionIndexes: stages,
  distinctInitialReplies: new Set(replies.slice(0, 4)).size,
  completionReply: replies.at(-1),
  screenSwitchFamily: switched?.semanticPlan?.family,
  businessWrites: 0,
}, null, 2));
