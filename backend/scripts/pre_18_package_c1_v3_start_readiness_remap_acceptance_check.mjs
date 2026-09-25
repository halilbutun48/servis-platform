#!/usr/bin/env node

import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { resolveIncomingCopilotScreenContext } from '../src/ai/service.js';
import { inferCanonicalSemanticRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveConversationRoute } from '../src/ai/chat/conversationRouting.js';
import { resolveSemanticIntent, toPublicQuestionType } from '../src/ai/chat/semanticIntentPlanner.js';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';

const failures = [];
const failedCases = new Set();
let passes = 0;
let currentCase = '';

function check(condition, label, detail = '') {
  if (condition) {
    passes += 1;
    console.log(`PASS ${label}`);
    return;
  }
  const failure = `${label}${detail ? ` :: ${detail}` : ''}`;
  failures.push(failure);
  failedCases.add(currentCase || label);
  console.error(`FAIL ${failure}`);
}

function userFor(role) {
  return role === 'COMPANY'
    ? { id: 91801, role, companyId: 1, companyKind: 'COMPANY', sessionVersion: 1 }
    : { id: 91802, role, roomId: 1, sessionVersion: 1 };
}

function fixture(role, path) {
  const user = userFor(role);
  const screenDefinition = getScreenDefinitionForUser(user, { path });
  check(Boolean(screenDefinition), `${role} ${path} resolves through the real catalog`);
  return {
    user,
    screenDefinition,
    screenContext: {
      path: screenDefinition?.path || path,
      label: screenDefinition?.label || '',
      menuPurpose: screenDefinition?.menuPurpose || '',
      screenTitle: screenDefinition?.label || '',
      selectedEntityType: 'screen',
      selectedEntityId: 0,
    },
  };
}

function evaluate({ role, path, message }) {
  const current = fixture(role, path);
  const canonical = inferCanonicalSemanticRequest({ message, screenContext: current.screenContext });
  const route = resolveConversationRoute({
    message,
    user: current.user,
    screenContext: current.screenContext,
    canonicalShape: canonical,
  });
  const plan = resolveSemanticIntent({
    message,
    user: current.user,
    screenContext: current.screenContext,
  });
  const response = buildChatHelpResponse({
    entityType: 'screen',
    entityId: current.screenDefinition?.id || 0,
    user: current.user,
    message,
    context: null,
    entityLabel: current.screenDefinition?.label || '',
    scope: { role, roleMode: 'OPERATIONS' },
    conversationState: null,
    screenContext: current.screenContext,
    screenDefinition: current.screenDefinition,
  });
  return { ...current, canonical, route, plan, publicType: toPublicQuestionType(plan), response };
}

function assertReadinessCase({ id, role, path, message }) {
  currentCase = id;
  const result = evaluate({ role, path, message });
  check(result.canonical.taskType === 'SHIFT_START_READINESS', `${id} canonical task`, `actual=${result.canonical.taskType || '<empty>'}`);
  check(result.canonical.domain === 'SHIFTS', `${id} canonical domain`, `actual=${result.canonical.domain || '<empty>'}`);
  check(result.canonical.targetEntityType === 'SHIFT', `${id} canonical entity`, `actual=${result.canonical.targetEntityType || '<empty>'}`);
  check(result.route.route !== 'OFF_TOPIC_SAFE', `${id} routing admits canonical product task`, `route=${result.route.route} reason=${result.route.reason}`);
  check(result.plan.family === 'SHIFT_START_READINESS', `${id} typed semantic plan`, `actual=${result.plan.family}`);
  check(result.publicType === 'READINESS_CHECK', `${id} public type`, `actual=${result.publicType || '<empty>'}`);
  check(result.response.screenPath === path, `${id} preserves authorized current screen`, `actual=${result.response.screenPath || '<empty>'}`);
  check(result.response.questionType === 'READINESS_CHECK', `${id} composed public type`, `actual=${result.response.questionType || '<empty>'}`);
}

function assertUrgentRiskCase({ id, role, path }) {
  currentCase = id;
  const result = evaluate({ role, path, message: 'Hangi konu acil?' });
  check(result.canonical.taskType === 'RISK', `${id} canonical task`, `actual=${result.canonical.taskType || '<empty>'}`);
  check(result.route.route !== 'OFF_TOPIC_SAFE', `${id} routing admits authorized risk context`, `route=${result.route.route} reason=${result.route.reason}`);
  check(result.plan.family === 'RISK_RANKING', `${id} typed semantic plan`, `actual=${result.plan.family}`);
  check(result.plan.taskVariant === 'URGENT_ISSUES', `${id} urgent-risk variant`, `actual=${result.plan.taskVariant || '<empty>'}`);
  check(result.publicType === 'RISK_LIST', `${id} public type`, `actual=${result.publicType || '<empty>'}`);
}

// Four intended RED groups: two ROOM readiness wordings, one COMPANY parity
// case, and the canonical urgent-risk family on both authorized shift surfaces.
assertReadinessCase({
  id: 'ROOM_READINESS_REAL_CATALOG',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Başlatma zamanı uygun mu?',
});
assertReadinessCase({
  id: 'ROOM_READINESS_PARAPHRASE',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Başlangıç için hazır mıyız?',
});
assertReadinessCase({
  id: 'COMPANY_READINESS_PARITY',
  role: 'COMPANY',
  path: '/company/shifts',
  message: 'Başlatma zamanı uygun mu?',
});
assertUrgentRiskCase({ id: 'ROOM_URGENT_RISK', role: 'ROOM', path: '/room/shifts' });
assertUrgentRiskCase({ id: 'COMPANY_URGENT_RISK', role: 'COMPANY', path: '/company/shifts' });

currentCase = 'EXPLICIT_DRIVER_REMAP_PRESERVED';
{
  const result = evaluate({ role: 'ROOM', path: '/room/shifts', message: 'Sürücü ekranındaki görev uygunluğunu anlat' });
  check(result.response.screenPath === '/room/drivers', 'EXPLICIT_DRIVER_REMAP_PRESERVED uses the explicitly referenced authorized screen', `actual=${result.response.screenPath || '<empty>'}`);
}

currentCase = 'EXPLICIT_OFFER_REMAP_PRESERVED';
{
  const result = evaluate({ role: 'ROOM', path: '/room/shifts', message: 'Teklifler ekranını anlat' });
  check(result.response.screenPath === '/room/offers', 'EXPLICIT_OFFER_REMAP_PRESERVED uses the explicitly referenced authorized screen', `actual=${result.response.screenPath || '<empty>'}`);
}

currentCase = 'UNKNOWN_REFERENCE_STAYS_ON_CURRENT_SCREEN';
{
  const result = evaluate({ role: 'ROOM', path: '/room/shifts', message: 'Bilmediğim dış ekranı aç' });
  check(result.response.screenPath === '/room/shifts', 'UNKNOWN_REFERENCE_STAYS_ON_CURRENT_SCREEN does not use overlap fallback as an authority', `actual=${result.response.screenPath || '<empty>'}`);
}

currentCase = 'OUT_OF_CONTEXT_READINESS_SAFE';
{
  const user = userFor('ROOM');
  const screenContext = { path: '/room/not-a-screen', label: 'Bilinmeyen ekran' };
  const canonical = inferCanonicalSemanticRequest({ message: 'Başlatma zamanı uygun mu?', screenContext });
  const route = resolveConversationRoute({ message: 'Başlatma zamanı uygun mu?', user, screenContext, canonicalShape: canonical });
  check(canonical.taskType !== 'SHIFT_START_READINESS', 'OUT_OF_CONTEXT_READINESS_SAFE does not manufacture a shift task', `task=${canonical.taskType || '<empty>'}`);
  check(route.route === 'OFF_TOPIC_SAFE' || route.route === 'UNCLEAR_OR_AMBIGUOUS', 'OUT_OF_CONTEXT_READINESS_SAFE remains non-fabricated', `route=${route.route}`);
}

currentCase = 'OUT_OF_CONTEXT_URGENT_RISK_SAFE';
{
  const user = userFor('ROOM');
  const screenContext = { path: '', label: '' };
  const canonical = inferCanonicalSemanticRequest({ message: 'Hangi konu acil?', screenContext });
  const route = resolveConversationRoute({ message: 'Hangi konu acil?', user, screenContext, canonicalShape: canonical });
  check(canonical.taskType !== 'RISK', 'OUT_OF_CONTEXT_URGENT_RISK_SAFE does not manufacture an observed risk list', `task=${canonical.taskType || '<empty>'}`);
  check(route.route === 'OFF_TOPIC_SAFE' || route.route === 'UNCLEAR_OR_AMBIGUOUS', 'OUT_OF_CONTEXT_URGENT_RISK_SAFE remains non-fabricated', `route=${route.route}`);
}

currentCase = 'FOREIGN_ROLE_CATALOG_REJECTED';
{
  const companyUser = userFor('COMPANY');
  const foreignDefinition = getScreenDefinitionForUser(companyUser, { path: '/room/shifts' });
  check(foreignDefinition === null, 'FOREIGN_ROLE_CATALOG_REJECTED cannot resolve a ROOM screen for COMPANY');
  let rejection = null;
  try {
    resolveIncomingCopilotScreenContext({
      user: companyUser,
      screenContext: { path: '/room/shifts' },
      entityType: 'screen',
      entityId: null,
    });
  } catch (error) {
    rejection = error;
  }
  check(rejection?.code === 'SCREEN_CONTEXT_NOT_AUTHORIZED', 'FOREIGN_ROLE_CATALOG_REJECTED blocks the forged path at the real service admission gate', `code=${rejection?.code || '<none>'}`);
}

currentCase = 'GENERIC_HELP_PRESERVED';
{
  const result = evaluate({ role: 'ROOM', path: '/room/shifts', message: 'Bu program ne işe yarıyor?' });
  check(result.publicType === 'PRODUCT_OVERVIEW_HELP', 'GENERIC_HELP_PRESERVED remains separate from route-bound readiness', `actual=${result.publicType || '<empty>'}`);
}

currentCase = 'ROLE_HELP_PRESERVED';
{
  const result = evaluate({ role: 'ROOM', path: '/room/shifts', message: 'ROOM rolü ne yapar?' });
  check(result.publicType === 'ROLE_EXPLANATION_HELP', 'ROLE_HELP_PRESERVED remains canonical', `actual=${result.publicType || '<empty>'}`);
}

currentCase = 'SCREEN_HELP_PRESERVED';
{
  const result = evaluate({ role: 'ROOM', path: '/room/shifts', message: 'Bu ekranı detaylı anlat' });
  check(result.publicType === 'SCREEN_PURPOSE', 'SCREEN_HELP_PRESERVED remains canonical', `actual=${result.publicType || '<empty>'}`);
}

currentCase = 'NEXT_STEP_PRESERVED';
{
  const result = evaluate({ role: 'ROOM', path: '/room/shifts', message: 'Sıradaki doğru işlem ne?' });
  check(result.publicType === 'NEXT_BEST_ACTION', 'NEXT_STEP_PRESERVED remains canonical', `actual=${result.publicType || '<empty>'}`);
}

console.log(`SUMMARY CASES=14 PASS_ASSERTIONS=${passes} FAIL_ASSERTIONS=${failures.length} FAIL_CASES=${failedCases.size}`);
if (failures.length) {
  console.error('C1_V3_ACCEPTANCE_FAILED');
  process.exitCode = 1;
} else {
  console.log('C1_V3_ACCEPTANCE_GREEN');
}
