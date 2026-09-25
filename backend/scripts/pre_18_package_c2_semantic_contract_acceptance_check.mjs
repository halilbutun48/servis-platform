#!/usr/bin/env node

/*
 * Bounded PRE-#18 Package C2 acceptance.
 *
 * This check exercises the existing canonical semantic chain. It deliberately
 * does not start a browser, fetch product data, or create a second intent
 * classifier. Its role is to prove that dynamic follow-ups are downstream
 * presentation, while clarification and root-cause public types originate
 * in the canonical planner/adapter pair.
 */
import { resolveIncomingCopilotScreenContext } from '../src/ai/service.js';
import { inferCanonicalSemanticRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent, toPublicQuestionType } from '../src/ai/chat/semanticIntentPlanner.js';
import { resolveConversationRoute } from '../src/ai/chat/conversationRouting.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';

const failures = [];
const failedCases = new Set();
let passCount = 0;
let currentCase = '';

function check(condition, label, detail = '') {
  if (condition) {
    passCount += 1;
    console.log(`PASS ${label}`);
    return;
  }
  const failure = `${label}${detail ? ` :: ${detail}` : ''}`;
  failures.push(failure);
  failedCases.add(currentCase || label);
  console.error(`FAIL ${failure}`);
}

function userFor(role) {
  const identity = { id: 92000 + role.length, role, sessionVersion: 1 };
  if (role === 'COMPANY') return { ...identity, companyId: 1, companyKind: 'COMPANY' };
  if (role === 'ROOM') return { ...identity, roomId: 1 };
  if (role === 'PERSONEL') return { ...identity, companyId: 1, companyKind: 'COMPANY' };
  return identity;
}

function fixture(role, path, { selectedEntityType = '', selectedEntityId = 0 } = {}) {
  const label = path.split('/').filter(Boolean).at(-1) || 'Ekran';
  const screenDefinition = {
    path,
    label,
    menuPurpose: `${label} için yetkili operasyon özeti.`,
    screenExplanation: `${label} için yetkili operasyon özeti.`,
    plainSummary: `${label} için yetkili operasyon özeti.`,
    summary: `${label} için yetkili operasyon özeti.`,
    firstStep: 'İlk güvenli kontrolü aç.',
    nextStep: 'Durumu doğrula.',
  };
  return {
    user: userFor(role),
    screenDefinition,
    screenContext: {
      path,
      label,
      authorizedRole: role,
      selectedEntityType,
      selectedEntityId,
      structuredFacts: {
        reasoningLead: `${label} için yetkili operasyon özeti.`,
        nextBestAction: 'Durumu doğrula.',
      },
    },
  };
}

function evaluate({ role, path, message, selectedEntityType = '', selectedEntityId = 0, conversationState = null }) {
  const current = fixture(role, path, { selectedEntityType, selectedEntityId });
  const canonical = inferCanonicalSemanticRequest({
    message,
    screenContext: current.screenContext,
    conversationState,
  });
  const plan = resolveSemanticIntent({
    message,
    user: current.user,
    screenContext: current.screenContext,
    conversationState,
  });
  const publicType = toPublicQuestionType(plan);
  const routerIntent = detectQuestionIntent(message, {
    entityType: 'screen',
    screenPath: path,
    userRole: role,
    originalMessage: message,
    conversationState,
    semanticResolutionContext: {
      authorizedRole: role,
      requestEntityType: 'screen',
      sourceScreenPath: path,
      effectiveScreenPath: path,
      sourceScreenLabel: current.screenContext.label,
      effectiveScreenLabel: current.screenDefinition.label,
      selectedEntityType,
    },
  });
  const response = buildChatHelpResponse({
    entityType: 'screen',
    entityId: 1,
    user: current.user,
    message,
    context: null,
    entityLabel: current.screenContext.label,
    scope: { role, roleMode: 'OPERATIONS' },
    conversationState,
    screenContext: current.screenContext,
    screenDefinition: current.screenDefinition,
  });
  return { canonical, plan, publicType, routerIntent, response };
}

function assertTypeContract({ id, role, path, message, expectedTask = null, expectedFamily, expectedPublic, selectedEntityType = '', selectedEntityId = 0, conversationState = null }) {
  currentCase = id;
  const result = evaluate({ role, path, message, selectedEntityType, selectedEntityId, conversationState });
  if (expectedTask) {
    check(result.canonical.taskType === expectedTask, `${id} canonical typed task`, `expected=${expectedTask} actual=${result.canonical.taskType || '<empty>'}`);
  }
  check(result.plan.family === expectedFamily, `${id} planner family`, `expected=${expectedFamily} actual=${result.plan.family || '<empty>'}`);
  check(result.publicType === expectedPublic, `${id} public adapter`, `expected=${expectedPublic} actual=${result.publicType || '<empty>'}`);
  check(result.routerIntent.questionType === expectedPublic, `${id} router consumes adapter`, `expected=${expectedPublic} actual=${result.routerIntent.questionType || '<empty>'}`);
  check(result.response.questionType === expectedPublic, `${id} composer preserves adapter`, `expected=${expectedPublic} actual=${result.response.questionType || '<empty>'}`);
  return result;
}

// Dynamic follow-ups are downstream presentation only: the underlying public
// semantic type remains intact for normal risk and screen-help answers.
const dynamicRisk = assertTypeContract({
  id: 'DYNAMIC_RISK_FOLLOWUP_PRESERVES_TYPE',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Hangi konu acil?',
  expectedTask: 'RISK',
  expectedFamily: 'RISK_RANKING',
  expectedPublic: 'RISK_LIST',
});
check(Array.isArray(dynamicRisk.response.contextualSuggestedChips) || Array.isArray(dynamicRisk.response.suggestedChips), 'DYNAMIC_RISK_FOLLOWUP_PRESERVES_TYPE exposes post-answer suggestions only');

assertTypeContract({
  id: 'DYNAMIC_SCREEN_HELP_PRESERVES_TYPE',
  role: 'COMPANY',
  path: '/company/shifts',
  message: 'Bu ekranı detaylı anlat',
  expectedTask: 'SCREEN_CONTEXT',
  expectedFamily: 'SCREEN_CONTEXT',
  expectedPublic: 'SCREEN_PURPOSE',
});

assertTypeContract({
  id: 'DYNAMIC_NEXT_STEP_PRESERVES_TYPE',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Sıradaki doğru işlem ne?',
  expectedTask: 'NEXT_ACTION',
  expectedFamily: 'NEXT_STEP',
  expectedPublic: 'NEXT_BEST_ACTION',
});

// Clarification is a canonical task only when a material target is absent or
// ambiguous. It must ask for one missing piece rather than invent context.
const ambiguousHow = assertTypeContract({
  id: 'CLARIFY_AMBIGUOUS_HOW',
  role: 'COMPANY',
  path: '/company/planning-center',
  message: 'Bunu nasıl yapacağım?',
  expectedTask: 'CLARIFY',
  expectedFamily: 'UNCLEAR_OR_AMBIGUOUS',
  expectedPublic: 'CLARIFYING_QUESTION',
});
check(/netleştirelim/i.test(String(ambiguousHow.response.reply || '')), 'CLARIFY_AMBIGUOUS_HOW asks for a specific missing piece');

// The same already-adjudicated clarification must retain its visible
// clarification response on a guided room-shift surface. A guided-task
// presentation shortcut may not replace the canonical question with advice.
currentCase = 'CLARIFY_AMBIGUOUS_HOW';
const roomAmbiguousHow = evaluate({
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Bunu nasıl yapacağım?',
});
check(roomAmbiguousHow.publicType === 'CLARIFYING_QUESTION', 'CLARIFY_AMBIGUOUS_HOW room variant preserves the canonical public type', `actual=${roomAmbiguousHow.publicType || '<empty>'}`);
check(/netleştirelim/i.test(String(roomAmbiguousHow.response.reply || '')), 'CLARIFY_AMBIGUOUS_HOW room variant renders its specific missing-piece question', `reply=${String(roomAmbiguousHow.response.reply || '<empty>')}`);

assertTypeContract({
  id: 'CLARIFY_AMBIGUOUS_OPERATION_ACTION',
  role: 'COMPANY',
  path: '/company/operations',
  message: 'Bunu ne yapacağım?',
  expectedTask: 'CLARIFY',
  expectedFamily: 'UNCLEAR_OR_AMBIGUOUS',
  expectedPublic: 'CLARIFYING_QUESTION',
});

assertTypeContract({
  id: 'CLARIFY_UNSPECIFIED_SELECTION',
  role: 'COMPANY',
  path: '/company/agreements',
  message: 'Hangisini seçeyim?',
  expectedTask: 'CLARIFY',
  expectedFamily: 'UNCLEAR_OR_AMBIGUOUS',
  expectedPublic: 'CLARIFYING_QUESTION',
});

const parentMissingTarget = assertTypeContract({
  id: 'CLARIFY_PARENT_MISSING_TARGET',
  role: 'PARENT',
  path: '/parent/live',
  message: 'Gelmedi mi?',
  expectedTask: 'CLARIFY',
  expectedFamily: 'UNCLEAR_OR_AMBIGUOUS',
  expectedPublic: 'CLARIFYING_QUESTION',
});
check(/netleştirelim/i.test(String(parentMissingTarget.response.reply || '')), 'CLARIFY_PARENT_MISSING_TARGET asks to clarify instead of inferring a child or service');
check(/hangi\s+(?:öğrenci|ogrenci)\s+servisi/i.test(String(parentMissingTarget.response.reply || '')), 'CLARIFY_PARENT_MISSING_TARGET requests the one missing parent-live target');

// The same canonical clarification must render for another parent-live
// ambiguity. Both variants remain one focused C2 policy case.
currentCase = 'CLARIFY_PARENT_MISSING_TARGET';
const parentMissingTargetVariant = evaluate({
  role: 'PARENT',
  path: '/parent/live',
  message: 'Niye yok?',
});
check(parentMissingTargetVariant.plan.family === 'UNCLEAR_OR_AMBIGUOUS', 'CLARIFY_PARENT_MISSING_TARGET second variant keeps the canonical clarification family', `actual=${parentMissingTargetVariant.plan.family || '<empty>'}`);
check(parentMissingTargetVariant.publicType === 'CLARIFYING_QUESTION', 'CLARIFY_PARENT_MISSING_TARGET second variant keeps the canonical public type', `actual=${parentMissingTargetVariant.publicType || '<empty>'}`);
check(/netleştirelim/i.test(String(parentMissingTargetVariant.response.reply || '')), 'CLARIFY_PARENT_MISSING_TARGET second variant asks to clarify instead of inferring a child or service');
check(/hangi\s+(?:öğrenci|ogrenci)\s+servisi/i.test(String(parentMissingTargetVariant.response.reply || '')), 'CLARIFY_PARENT_MISSING_TARGET second variant requests the one missing parent-live target');

// A non-clarifying parent live lookup retains the established safe fallback;
// the C2 precedence change must not remove it globally.
currentCase = 'CLARIFY_PARENT_MISSING_TARGET';
const parentNoSelectionFallback = evaluate({
  role: 'PARENT',
  path: '/parent/live',
  message: 'Canlı konum nerede?',
});
check(parentNoSelectionFallback.plan.family === 'ENTITY_LOOKUP', 'PARENT_NON_CLARIFYING_NO_SELECTION retains its canonical non-clarifying family', `actual=${parentNoSelectionFallback.plan.family || '<empty>'}`);
check(/seçili canlı bilgi net görünmüyor/i.test(String(parentNoSelectionFallback.response.reply || '')), 'PARENT_NON_CLARIFYING_NO_SELECTION retains the safe fallback response');

assertTypeContract({
  id: 'CLARIFY_NOT_NEEDED_WITH_SCREEN_CONTEXT',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Bu ekranı detaylı anlat',
  expectedTask: 'SCREEN_CONTEXT',
  expectedFamily: 'SCREEN_CONTEXT',
  expectedPublic: 'SCREEN_PURPOSE',
});

// A PARENT live surface with an already-authorized selected service is not
// ambiguous. The transport projection intentionally carries the selected
// type (but never a client-controlled record id), so the canonical planner
// must preserve the causal task rather than let a legacy router fallback
// turn it back into a clarification.
assertTypeContract({
  id: 'PARENT_SELECTED_CONTEXT_DOES_NOT_CLARIFY_ROOT_CAUSE',
  role: 'PARENT',
  path: '/parent/live',
  message: 'Niye yok?',
  selectedEntityType: 'student_service',
  selectedEntityId: 21,
  expectedTask: 'CAUSE',
  expectedFamily: 'CAUSE_WHY',
  expectedPublic: 'ROOT_CAUSE',
});

// STATUS is an already-resolved canonical task. The routing layer must admit
// it through its task set; this test deliberately passes a literal typed task
// so it cannot be satisfied by phrase matching in the routing layer.
currentCase = 'PARENT_SELECTED_CONTEXT_STATUS_ADMISSION';
const statusAdmission = resolveConversationRoute({
  message: 'Gelmedi mi?',
  user: { role: 'PARENT' },
  screenContext: {
    path: '/parent/live',
    selectedEntityType: 'student_service',
    selectedEntityId: 21,
  },
  canonicalShape: {
    taskType: 'STATUS',
    domain: 'PERSONNEL',
    targetEntityType: 'STUDENT',
    explicitUserTarget: true,
  },
});
check(statusAdmission.route === 'RETURN_TO_PRODUCT_TASK', 'PARENT_SELECTED_CONTEXT_STATUS_ADMISSION admits the canonical STATUS task', `actual=${statusAdmission.route || '<empty>'} reason=${statusAdmission.reason || '<empty>'}`);

assertTypeContract({
  id: 'PARENT_SELECTED_CONTEXT_STATUS_ADMISSION',
  role: 'PARENT',
  path: '/parent/live',
  message: 'Gelmedi mi?',
  selectedEntityType: 'student_service',
  selectedEntityId: 21,
  expectedTask: 'STATUS',
  expectedFamily: 'STATUS',
  expectedPublic: 'STATUS_HELP',
});

assertTypeContract({
  id: 'PARENT_SELECTED_CONTEXT_STATUS_ADMISSION',
  role: 'PARENT',
  path: '/parent/live',
  message: 'Görünüyor mu?',
  selectedEntityType: 'student_service',
  selectedEntityId: 21,
  expectedTask: 'STATUS',
  expectedFamily: 'STATUS',
  expectedPublic: 'STATUS_HELP',
});

currentCase = 'STATUS_WITHOUT_PRODUCT_CONTEXT_STAYS_SAFE';
const statusWithoutContext = evaluate({
  role: 'PARENT',
  path: '',
  message: 'Gelmedi mi?',
});
check(statusWithoutContext.plan.family === 'OFF_TOPIC_SAFE', 'STATUS_WITHOUT_PRODUCT_CONTEXT_STAYS_SAFE does not manufacture product admission');

// Root cause retains an evidence-bound typed task and is the only source of
// the ROOT_CAUSE public type. It must not steal risk, next-step, or screen help.
const rootCause = assertTypeContract({
  id: 'ROOT_CAUSE_EXPLICIT_RECURRING',
  role: 'PERSONEL',
  path: '/personel/live',
  message: 'Neden bu servis görünmüyor?',
  expectedTask: 'CAUSE',
  expectedFamily: 'CAUSE_WHY',
  expectedPublic: 'ROOT_CAUSE',
});
check(/kesin sebebi|olası neden|olasi neden/i.test(String(rootCause.response.reply || '')), 'ROOT_CAUSE_EXPLICIT_RECURRING preserves uncertainty');
check(/kontrol/i.test(String(rootCause.response.reply || '')), 'ROOT_CAUSE_EXPLICIT_RECURRING includes a safe validation check');

// ROOT_CAUSE needs an underlying or recurring causal pattern. A direct blocked
// control and a field-definition request retain their established non-causal
// public types rather than being captured by generic "neden"/"kanıt" words.
currentCase = 'ROOT_CAUSE_EXPLICIT_RECURRING';
const blockedControl = evaluate({
  role: 'ROOM',
  path: '/room/operation-health',
  message: 'niye pasif bu?',
});
check(blockedControl.response.questionType === 'WHY_BLOCKED', 'ROOT_CAUSE_EXPLICIT_RECURRING does not capture a direct blocked-control question', `actual=${blockedControl.response.questionType || '<empty>'}`);
const fieldDefinition = evaluate({
  role: 'SUPER_ADMIN',
  path: '/superadmin/commercial-core',
  message: 'Servis kanıtı ne işe yarar?',
});
check(fieldDefinition.response.questionType === 'FIELD_BUTTON_HELP', 'ROOT_CAUSE_EXPLICIT_RECURRING does not capture a field-definition question', `actual=${fieldDefinition.response.questionType || '<empty>'}`);

assertTypeContract({
  id: 'ROOT_CAUSE_CAUSAL_PATTERN',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Bunu ne bozuyor olabilir?',
  expectedTask: 'CAUSE',
  expectedFamily: 'CAUSE_WHY',
  expectedPublic: 'ROOT_CAUSE',
});

assertTypeContract({
  id: 'ROOT_CAUSE_DOES_NOT_CAPTURE_RISK',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Hangi konu acil?',
  expectedTask: 'RISK',
  expectedFamily: 'RISK_RANKING',
  expectedPublic: 'RISK_LIST',
});

assertTypeContract({
  id: 'ROOT_CAUSE_DOES_NOT_CAPTURE_NEXT_STEP',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Sıradaki doğru işlem ne?',
  expectedTask: 'NEXT_ACTION',
  expectedFamily: 'NEXT_STEP',
  expectedPublic: 'NEXT_BEST_ACTION',
});

assertTypeContract({
  id: 'ROOT_CAUSE_DOES_NOT_CAPTURE_SCREEN_HELP',
  role: 'COMPANY',
  path: '/company/shifts',
  message: 'Bu ekranı detaylı anlat',
  expectedTask: 'SCREEN_CONTEXT',
  expectedFamily: 'SCREEN_CONTEXT',
  expectedPublic: 'SCREEN_PURPOSE',
});

// C1 / generic / role / continuation preservation.
assertTypeContract({
  id: 'PRESERVE_GENERIC_PRODUCT_HELP',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Bu program ne işe yarıyor?',
  expectedFamily: 'GENERIC_PRODUCT_HELP',
  expectedPublic: 'PRODUCT_OVERVIEW_HELP',
});

assertTypeContract({
  id: 'PRESERVE_C1_START_READINESS',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Başlatma zamanı uygun mu?',
  expectedTask: 'SHIFT_START_READINESS',
  expectedFamily: 'SHIFT_START_READINESS',
  expectedPublic: 'READINESS_CHECK',
});

assertTypeContract({
  id: 'PRESERVE_ROLE_HELP',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'ROOM rolü ne yapar?',
  expectedFamily: 'ROLE_EXPLANATION_HELP',
  expectedPublic: 'ROLE_EXPLANATION_HELP',
});

assertTypeContract({
  id: 'PRESERVE_CONTINUATION',
  role: 'ROOM',
  path: '/room/shifts',
  message: 'Devamını anlat',
  expectedTask: 'CONTINUE_CURRENT_REASONING',
  expectedFamily: 'CONTINUE_CURRENT_REASONING',
  expectedPublic: 'CONTINUE_FLOW',
  conversationState: {
    authorizedProductContext: {
      semanticPlan: { family: 'NEXT_STEP', intentFamily: 'NEXT_STEP', dialogueTopic: 'PRODUCT', requestedDomains: ['SHIFTS'], entities: [] },
    },
  },
});

currentCase = 'CLARIFY_DOES_NOT_BYPASS_SCREEN_AUTHORIZATION';
let screenAdmissionError = null;
try {
  resolveIncomingCopilotScreenContext({
    user: userFor('COMPANY'),
    screenContext: { path: '/room/shifts' },
    entityType: 'screen',
    entityId: null,
  });
} catch (error) {
  screenAdmissionError = error;
}
check(screenAdmissionError?.code === 'SCREEN_CONTEXT_NOT_AUTHORIZED', 'CLARIFY_DOES_NOT_BYPASS_SCREEN_AUTHORIZATION keeps the service admission deny', `actual=${screenAdmissionError?.code || '<none>'}`);

console.log(`PACKAGE_C2_FOCUSED_CASES=16`);
console.log(`PACKAGE_C2_FOCUSED_PASS_ASSERTIONS=${passCount}`);
console.log(`PACKAGE_C2_FOCUSED_FAIL_ASSERTIONS=${failures.length}`);
console.log(`PACKAGE_C2_FOCUSED_FAIL_CASES=${failedCases.size}`);
if (failures.length) {
  console.error('PACKAGE_C2_FOCUSED_ACCEPTANCE_FAILED');
  process.exitCode = 1;
} else {
  console.log('PACKAGE_C2_FOCUSED_ACCEPTANCE_GREEN');
}
