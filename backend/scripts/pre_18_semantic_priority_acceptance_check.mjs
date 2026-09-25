#!/usr/bin/env node

/*
 * Bounded PRE-#18 semantic-priority acceptance.  It calls the real planner
 * and public intent adapter; it does not start a browser or read product data.
 */
import * as semanticIntentPlanner from '../src/ai/chat/semanticIntentPlanner.js';
import { inferCanonicalSemanticRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';
import { isGenericProductHelpIntent } from '../src/ai/chat/conversationRouting.js';

const { resolveSemanticIntent } = semanticIntentPlanner;
// The fallback keeps the RED test executable before the shared public adapter
// exists.  It exposes the current raw planner family as the failing contract.
const toPublicQuestionType = semanticIntentPlanner.toPublicQuestionType || ((plan) => plan?.family || '');

const failures = [];
const cases = [];

function check(id, actual, expected) {
  const pass = actual === expected;
  cases.push({ id, actual, expected, pass });
  if (!pass) failures.push({ id, actual, expected });
  process.stdout.write(`${pass ? 'PASS' : 'FAIL'} ${id}\n  expected: ${expected}\n  actual: ${actual}\n`);
}

function checkObject(id, actual, expected) {
  check(id, JSON.stringify(actual), JSON.stringify(expected));
}

function resolve(message, user = { id: 901001, role: 'ROOM', roomId: 1, sessionVersion: 1 }, conversationState = null, screenContext = { path: '/room/shifts', label: 'Vardiyalar' }) {
  return resolveSemanticIntent({ message, user, conversationState, screenContext });
}

const genericExamples = [
  'SeferPakt ne yapar?',
  'Bu program ne işe yarıyor?',
  'Sistem genel olarak ne yapıyor?',
  'Platformu genel olarak anlat.',
];
for (const [index, message] of genericExamples.entries()) {
  check(`GENERIC_${index + 1}_MATCHER`, isGenericProductHelpIntent(message), true);
  check(`GENERIC_${index + 1}_PLAN`, resolve(message).family, 'GENERIC_PRODUCT_HELP');
}

const explicitRoleExamples = [
  'ROOM tarafında ne yapabilirim?',
  'SeferPakt ROOM rolünde ne yapar?',
  'COMPANY rolünde hangi işlemler var?',
  'Bu rolde ne yapmam gerekiyor?',
  'Bana bu rolün işlevlerini anlat.',
  'COMPANY olarak ne yapmam gerekiyor?',
];
for (const [index, message] of explicitRoleExamples.entries()) {
  check(`ROLE_${index + 1}_NOT_GENERIC`, isGenericProductHelpIntent(message), false);
  const plan = resolve(message);
  check(`ROLE_${index + 1}_PLAN`, plan.family, 'ROLE_EXPLANATION_HELP');
  check(`ROLE_${index + 1}_PUBLIC`, toPublicQuestionType(plan), 'ROLE_EXPLANATION_HELP');
  check(`ROLE_${index + 1}_DIRECT`, detectQuestionIntent(message, { userRole: 'ROOM', screenPath: '/room/shifts' }).questionType, 'ROLE_EXPLANATION_HELP');
}

const riskPlan = resolve('Riskleri sırala');
check('RISK_PLAN', riskPlan.family, 'RISK_RANKING');
check('RISK_PUBLIC_ADAPTER', toPublicQuestionType(riskPlan), 'RISK_LIST');
check('RISK_DIRECT', detectQuestionIntent('Riskleri sırala', { userRole: 'ROOM', screenPath: '/room/shifts' }).questionType, 'RISK_LIST');

const continuationState = {
  authorizedProductContext: {
    semanticPlan: {
      family: 'NEXT_STEP',
      intentFamily: 'NEXT_STEP',
      dialogueTopic: 'PRODUCT',
      requestedDomains: ['SHIFTS'],
      entities: [],
    },
  },
  recentMessages: [{ role: 'user', text: 'Şimdi ne yapayım?' }, { role: 'assistant', text: 'Önce vardiya durumunu kontrol et.' }],
};
const continuationPlan = resolve('Devamını anlat', { id: 901002, role: 'ROOM', roomId: 1, sessionVersion: 1 }, continuationState);
check('CONTINUE_PLAN', continuationPlan.family, 'CONTINUE_CURRENT_REASONING');
check('CONTINUE_PUBLIC_ADAPTER', toPublicQuestionType(continuationPlan), 'CONTINUE_FLOW');
check('CONTINUE_DIRECT', detectQuestionIntent('Devamını anlat', { userRole: 'ROOM', screenPath: '/room/shifts', conversationState: continuationState }).questionType, 'CONTINUE_FLOW');

const nextStepPlan = resolve('Sıradaki doğru işlem ne?');
check('NEXT_STEP_PLAN', nextStepPlan.family, 'NEXT_STEP');
check('NEXT_STEP_PUBLIC_ADAPTER', toPublicQuestionType(nextStepPlan), 'NEXT_BEST_ACTION');
check('NEXT_STEP_DIRECT', detectQuestionIntent('Sıradaki doğru işlem ne?', { userRole: 'COMPANY', screenPath: '/company' }).questionType, 'NEXT_BEST_ACTION');

const companyShiftsUser = { id: 901003, role: 'COMPANY', companyId: 1, companyKind: 'COMPANY', sessionVersion: 1 };
const companyShiftsScreen = { path: '/company/shifts', label: 'Vardiyalar', screenExplanation: 'Vardiya planlama ve takip için kullanılır.' };

function inspectCompanyShiftsSemanticContract(message) {
  const canonical = inferCanonicalSemanticRequest({ message, screenContext: companyShiftsScreen });
  const plan = resolveSemanticIntent({ message, user: companyShiftsUser, screenContext: companyShiftsScreen });
  const intent = detectQuestionIntent(message, {
    userRole: 'COMPANY',
    screenPath: '/company/shifts',
    screenContext: companyShiftsScreen,
  });
  return {
    canonicalTask: canonical.taskType,
    typedTask: plan.typedRequest?.taskType,
    family: plan.family,
    publicIntent: intent.questionType,
    currentScreen: plan.scopeTarget === 'CURRENT_SCREEN',
    etaRequested: plan.family === 'ETA' || plan.requestedFields?.some((field) => field.key === 'ETA'),
  };
}

const screenDetailContract = {
  canonicalTask: 'SCREEN_CONTEXT',
  typedTask: 'SCREEN_CONTEXT',
  family: 'SCREEN_CONTEXT',
  publicIntent: 'SCREEN_PURPOSE',
  currentScreen: true,
  etaRequested: false,
};

checkObject('COMPANY_SHIFTS_SCREEN_DETAIL_ANLAT_PARITY', inspectCompanyShiftsSemanticContract('Bu ekranı detaylı anlat'), screenDetailContract);
checkObject('COMPANY_SHIFTS_SCREEN_DETAIL_ACIKLA_PARITY', inspectCompanyShiftsSemanticContract('Bu ekranı detaylı açıkla'), screenDetailContract);
checkObject('COMPANY_SHIFTS_SCREEN_EXPLANATION_ANLAT', inspectCompanyShiftsSemanticContract('Bu ekranı anlat'), screenDetailContract);
checkObject('COMPANY_SHIFTS_SCREEN_EXPLANATION_ACIKLA', inspectCompanyShiftsSemanticContract('Bu ekranı açıkla'), screenDetailContract);

check('COMPANY_SHIFTS_DETAIL_ANLAT_NOT_ETA', inspectCompanyShiftsSemanticContract('Bu ekranı detaylı anlat').etaRequested, false);
check('COMPANY_SHIFTS_DETAIL_ACIKLA_NOT_ETA', inspectCompanyShiftsSemanticContract('Bu ekranı detaylı açıkla').etaRequested, false);
check('COMPANY_SHIFTS_VARDIYA_DETAYLARINI_NOT_ETA', inspectCompanyShiftsSemanticContract('Vardiyanın detaylarını anlat').etaRequested, false);
check('COMPANY_SHIFTS_ETA_TOKEN', inspectCompanyShiftsSemanticContract('ETA nedir?').family, 'ETA');
check('COMPANY_SHIFTS_ETA_TURKISH_ARRIVAL', inspectCompanyShiftsSemanticContract('Vardiyanın tahmini süresi nedir?').family, 'ETA');
check('COMPANY_SHIFTS_ETA_KAC_DAKIKA', inspectCompanyShiftsSemanticContract('Servisin gelmesine kaç dakika kaldı?').family, 'ETA');
checkObject('COMPANY_SHIFTS_SCREEN_FOCUS_PRESERVED', inspectCompanyShiftsSemanticContract('Bu ekranda neye bakmalıyım?'), {
  canonicalTask: 'SCREEN_CONTEXT',
  typedTask: 'SCREEN_CONTEXT',
  family: 'SCREEN_CONTEXT',
  publicIntent: 'SCREEN_FOCUS',
  currentScreen: true,
  etaRequested: false,
});
checkObject('COMPANY_SHIFTS_ROLE_HELP_PRESERVED', inspectCompanyShiftsSemanticContract('COMPANY rolünde hangi işlemler var?'), {
  canonicalTask: null,
  typedTask: 'OFF_TOPIC',
  family: 'ROLE_EXPLANATION_HELP',
  publicIntent: 'ROLE_EXPLANATION_HELP',
  currentScreen: false,
  etaRequested: false,
});
checkObject('SEMANTIC_PRIORITY_RISKLERI_ANLAT_PRESERVED', inspectCompanyShiftsSemanticContract('Riskleri anlat'), {
  canonicalTask: 'RISK',
  typedTask: 'RISK',
  family: 'RISK_RANKING',
  publicIntent: 'RISK_LIST',
  currentScreen: true,
  etaRequested: false,
});
checkObject('SEMANTIC_PRIORITY_ROLU_ANLAT_PRESERVED', inspectCompanyShiftsSemanticContract('Rolü anlat'), {
  canonicalTask: null,
  typedTask: 'OFF_TOPIC',
  family: 'OFF_TOPIC_SAFE',
  publicIntent: 'SEMANTIC_OFF_TOPIC_SAFE',
  currentScreen: false,
  etaRequested: false,
});
checkObject('SEMANTIC_PRIORITY_TEKLIFI_ANLAT_PRESERVED', inspectCompanyShiftsSemanticContract('Teklifi anlat'), {
  canonicalTask: null,
  typedTask: 'FIELD_LOOKUP',
  family: 'COMMERCIAL_SUMMARY',
  publicIntent: 'SEMANTIC_COMMERCIAL_SUMMARY',
  currentScreen: true,
  etaRequested: false,
});

process.stdout.write(`SEMANTIC_PRIORITY_ACCEPTANCE_CASES=${cases.length}\n`);
process.stdout.write(`SEMANTIC_PRIORITY_ACCEPTANCE_PASS=${cases.length - failures.length}\n`);
process.stdout.write(`SEMANTIC_PRIORITY_ACCEPTANCE_FAIL=${failures.length}\n`);
if (failures.length) process.exitCode = 1;
