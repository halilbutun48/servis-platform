#!/usr/bin/env node

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { resolveSemanticIntent, toPublicQuestionType } from '../src/ai/chat/semanticIntentPlanner.js';

const __filename = fileURLToPath(import.meta.url);
const root = new URL('../..', import.meta.url);
const intentRouterSource = fs.readFileSync(new URL('../src/ai/chat/intentRouter.js', import.meta.url), 'utf8');

let assertionCount = 0;
let passCount = 0;
let failCount = 0;
const failures = [];

function check(condition, message) {
  assertionCount += 1;
  if (condition) {
    passCount += 1;
    console.log(`OK ${message}`);
    return;
  }
  failCount += 1;
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function semanticContext({ role, path, selectedEntityType = '' }) {
  return {
    authorizedRole: role,
    requestEntityType: 'screen',
    sourceScreenPath: path,
    effectiveScreenPath: path,
    sourceScreenLabel: path,
    effectiveScreenLabel: path,
    selectedEntityType,
    selectedEntityPresent: Boolean(selectedEntityType),
    planningSurfaceText: path,
  };
}

function runCase({ label, message, role, path, selectedEntityType = '', expectedPublic = null, forbidPlanReview = false }) {
  const screenContext = {
    path,
    semanticResolutionContext: semanticContext({ role, path, selectedEntityType }),
  };
  const routed = detectQuestionIntent(message, {
    userRole: role,
    roleMode: 'OPERATIONS',
    screenPath: path,
    originalMessage: message,
    screenContext,
    semanticResolutionContext: screenContext.semanticResolutionContext,
    conversationState: null,
    entityType: 'screen',
  });
  const plan = resolveSemanticIntent({
    message,
    user: { role },
    conversationState: null,
    screenContext,
  });
  const publicType = toPublicQuestionType(plan) || routed.questionType;
  console.log(JSON.stringify({ label, family: plan.family, taskType: plan.typedRequest?.taskType || plan.taskType || null, publicType, routed: routed.questionType }, null, 2));
  if (expectedPublic) check(publicType === expectedPublic, `${label} resolves to ${expectedPublic}`);
  if (forbidPlanReview) check(publicType !== 'PLAN_REVIEW', `${label} does not fabricate PLAN_REVIEW`);
  return { routed, plan, publicType };
}

function runComposedCase({ label, message, role, path, selectedEntityType = '', expectedPublic }) {
  const screenDefinition = {
    path,
    label: path,
    menuPurpose: path,
    summary: path,
    screenExplanation: path,
    firstStep: 'İlk güvenli kontrolü aç.',
    nextStep: 'Durumu doğrula.',
  };
  const screenContext = {
    ...screenDefinition,
    selectedEntityType,
    selectedEntityId: selectedEntityType ? 1 : 0,
    selectedEntityPresent: Boolean(selectedEntityType),
    selectedSummary: selectedEntityType ? 'Yetkili seçili kayıt' : '',
    selectedRecordStatus: selectedEntityType ? 'Hazır' : '',
  };
  const response = buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user: { role },
    message,
    context: null,
    entityLabel: screenDefinition.label,
    scope: { role, roleMode: 'OPERATIONS' },
    conversationState: selectedEntityType
      ? { selectedEntityId: 1, selectedEntityType, screenContext }
      : null,
    screenContext,
    screenDefinition,
  });
  check(response.questionType === expectedPublic, `${label} real composer resolves to ${expectedPublic}`);
  return response;
}

check(!intentRouterSource.includes('looksLikePlanReviewQuestion'), 'intentRouter has no legacy Plan Review heuristic authority');
check(!intentRouterSource.includes("questionType: 'PLAN_REVIEW'"), 'intentRouter has no direct PLAN_REVIEW return authority');
check(intentRouterSource.includes('selectedEntityPresent'), 'intentRouter transports selectedEntityPresent');
check(!/semanticResolutionContext\s*:\s*\{[^}]*selectedEntityId/su.test(intentRouterSource), 'semanticResolutionContext projection does not copy an entity id');

const authorizedPlan = runCase({
  label: 'authorized-plan-review',
  message: 'Bu plan doğru mu?',
  role: 'SUPER_ADMIN',
  path: '/superadmin/trust-quality',
  selectedEntityType: 'organizationPlan',
  expectedPublic: 'PLAN_REVIEW',
});
check(authorizedPlan.plan.family === 'PLAN_REVIEW', 'authorized plan uses canonical PLAN_REVIEW family');

const authorizedAgreement = runCase({
  label: 'authorized-agreement-review',
  message: 'Bu sözleşme onaylanmadan önce ne kontrol edilmeli?',
  role: 'COMPANY',
  path: '/company/agreements',
  selectedEntityType: 'agreement',
  expectedPublic: 'PLAN_REVIEW',
});
check(authorizedAgreement.plan.family === 'PLAN_REVIEW', 'authorized agreement uses canonical PLAN_REVIEW family');

runComposedCase({
  label: 'authorized-plan-review',
  message: 'Bu plan doğru mu?',
  role: 'SUPER_ADMIN',
  path: '/superadmin/trust-quality',
  selectedEntityType: 'organizationPlan',
  expectedPublic: 'PLAN_REVIEW',
});

runComposedCase({
  label: 'authorized-agreement-review',
  message: 'Bu sözleşme onaylanmadan önce ne kontrol edilmeli?',
  role: 'COMPANY',
  path: '/company/agreements',
  selectedEntityType: 'agreement',
  expectedPublic: 'PLAN_REVIEW',
});

runComposedCase({
  label: 'objectless-review',
  message: 'Bu plan doğru mu?',
  role: 'SUPER_ADMIN',
  path: '/superadmin/trust-quality',
  expectedPublic: 'CLARIFYING_QUESTION',
});

const objectless = runCase({
  label: 'objectless-review',
  message: 'Bu plan doğru mu?',
  role: 'SUPER_ADMIN',
  path: '/superadmin/trust-quality',
  forbidPlanReview: true,
});
check(objectless.plan.family !== 'PLAN_REVIEW', 'objectless review remains outside PLAN_REVIEW');

runCase({
  label: 'c1-start-readiness-preserved',
  message: 'Başlatma zamanı uygun mu?',
  role: 'COMPANY',
  path: '/company/shifts',
  selectedEntityType: 'shift',
  expectedPublic: 'READINESS_CHECK',
});

runCase({
  label: 'c1-urgent-risk-preserved',
  message: 'Hangi konu acil?',
  role: 'ROOM',
  path: '/room/shifts',
  selectedEntityType: 'shift',
  expectedPublic: 'RISK_LIST',
});

runCase({
  label: 'c2-root-cause-preserved',
  message: 'Bu sorun neden tekrar ediyor?',
  role: 'ROOM',
  path: '/room/shifts',
  selectedEntityType: 'shift',
  expectedPublic: 'ROOT_CAUSE',
});

runCase({
  label: 'generic-help-preserved',
  message: 'Bu program ne işe yarıyor?',
  role: 'COMPANY',
  path: '/company',
  expectedPublic: 'PRODUCT_OVERVIEW_HELP',
});

console.log(`SUMMARY assertions=${assertionCount} pass=${passCount} fail=${failCount}`);
if (failCount) {
  console.error(`FAILURES ${failures.join(' | ')}`);
  process.exitCode = 1;
} else {
  console.log('PASS PRE-18 PACKAGE C3 V2 PLAN REVIEW ACCEPTANCE');
}
