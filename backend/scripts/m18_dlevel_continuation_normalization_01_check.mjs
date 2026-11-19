import assert from 'node:assert/strict';
import { normalizeCopilotRequestInput } from '../src/ai/schemas.js';
import { runCopilotFoundation } from '../src/ai/service.js';

const user = {
  id: 2,
  role: 'COMPANY',
  companyId: 1,
  companyKind: 'COMPANY',
};

const screenContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    currentTarget: {
      status: 'FOUND',
      targetKind: 'CONTROL',
      targetKey: '/company:button:Taslak vardiya oluştur',
      label: 'Taslak vardiya oluştur',
      semanticType: 'button',
      screenPath: '/company',
      role: 'Hizmet Alan Firma',
    },
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 2,
      completedThroughOrdinal: 1,
      currentTargetKey: '/company:button:Taslak vardiya oluştur',
      currentTargetLabel: 'Taslak vardiya oluştur',
      source: 'LIVE_UI',
    },
    visibleButtons: [{
      label: 'Rehberi Başlat',
      semanticType: 'button',
      targetKey: 'company:guided-plan-start',
      disabled: false,
    }],
    activeTabs: [],
  },
};

const raw = 'sonra ne yapayım';
const normalized = normalizeCopilotRequestInput({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  message: raw,
  screenContext,
});

assert.equal(normalized.message, raw, 'continuation + next-step wording must not be rewritten into a different prompt');

const payload = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: normalized.message,
  screenContext,
  authSessionId: 'm18-dlevel-continuation-normalization-red',
});

assert.equal(payload.semanticPlan?.family, 'CONTINUE_CURRENT_REASONING');
assert.equal(payload.semanticPlan?.continuationAction, 'NEXT');
assert.equal(payload.semanticPlan?.canonicalRequest?.operation, 'CONTINUE_EXPLANATION');
assert.equal(payload.semanticPlan?.workflowIntent, 'CREATE_SHIFT');

const resumeSession = 'm18-dlevel-continuation-role-help-precedence';
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: 'vardiya oluşturmak istiyorum',
  screenContext,
  authSessionId: resumeSession,
});
const resumePayload = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: 'vardiya oluşturacaktık ne oldu',
  screenContext,
  authSessionId: resumeSession,
});
assert.equal(resumePayload.semanticPlan?.family, 'CONTINUE_CURRENT_REASONING');
assert.equal(resumePayload.semanticPlan?.continuationAction, 'CONTINUE');
assert.equal(resumePayload.semanticPlan?.canonicalRequest?.operation, 'CONTINUE_EXPLANATION');
assert.equal(resumePayload.semanticPlan?.workflowIntent, 'CREATE_SHIFT');

const recoverySession = 'm18-dlevel-back-recover-contract';
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: 'vardiya oluşturmak istiyorum',
  screenContext,
  authSessionId: recoverySession,
});
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: 'adım adım anlat',
  screenContext,
  authSessionId: recoverySession,
});
const backPayload = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: 'Geri.',
  screenContext,
  authSessionId: recoverySession,
});
const recoverPayload = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: 'Bulamadım.',
  screenContext,
  authSessionId: recoverySession,
});
assert.equal(backPayload.semanticPlan?.continuationAction, 'BACK', 'Geri keeps the canonical BACK continuation action');
assert.match(String(backPayload.reply || ''), /geri|önceki|ilk adım|başlangıç/iu, 'Geri produces a previous-step or first-step boundary explanation');
assert.doesNotMatch(String(backPayload.reply || ''), /\d+\. devam açıklaması/iu, 'Geri is not rendered as another continuation explanation');
assert.equal(recoverPayload.semanticPlan?.continuationAction, 'RECOVER', 'Bulamadım keeps the canonical RECOVER continuation action');
assert.match(String(recoverPayload.reply || ''), /bul|hedef|kontrol|yeniden|göster/iu, 'Bulamadım produces target recovery guidance');
assert.doesNotMatch(String(recoverPayload.reply || ''), /\d+\. devam açıklaması/iu, 'Bulamadım is not rendered as another continuation explanation');

const roomTeachingUser = {
  id: 1,
  role: 'ROOM',
  companyId: 1,
  roomId: 1,
  companyKind: 'COMPANY',
};
const roomTeachingContext = {
  path: '/room/shifts',
  label: 'Vardiyalar',
  role: 'ROOM',
  uiHints: { visibleButtons: [{ label: 'Vardiyalar', targetKey: 'room:shifts', identitySource: 'CANONICAL' }] },
};
const roomTeachingSession = 'm18-dlevel-room-recovery-contract';
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user: roomTeachingUser,
  message: 'Vardiyalar ekranında ne yapmalıyım?',
  screenContext: roomTeachingContext,
  authSessionId: roomTeachingSession,
});
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user: roomTeachingUser,
  message: 'Devam.',
  screenContext: roomTeachingContext,
  authSessionId: roomTeachingSession,
});
const roomBackPayload = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user: roomTeachingUser,
  message: 'Geri.',
  screenContext: roomTeachingContext,
  authSessionId: roomTeachingSession,
});
const roomRecoverPayload = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user: roomTeachingUser,
  message: 'Bulamadım.',
  screenContext: roomTeachingContext,
  authSessionId: roomTeachingSession,
});
assert.equal(roomBackPayload.semanticPlan?.continuationAction, 'BACK', 'ROOM teaching keeps BACK');
assert.equal(roomRecoverPayload.semanticPlan?.continuationAction, 'RECOVER', 'ROOM teaching keeps RECOVER');
assert.match(String(roomRecoverPayload.reply || ''), /bulamad|hangi|ekran|kay[ıi]t/iu, 'ROOM recovery gives a target-finding route');

const analyticUser = {
  id: 1,
  role: 'ROOM',
  companyId: 1,
  roomId: 1,
  companyKind: 'COMPANY',
};
const analyticScreen = {
  path: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  role: 'ROOM',
  uiHints: { visibleButtons: [] },
};
const analyticSession = 'm18-dlevel-analytic-step-state-red';
const analyticInitial = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Operasyon risklerini sırala ve adım adım anlat.',
  screenContext: analyticScreen,
  authSessionId: analyticSession,
});
const analyticContinue = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Devam.',
  screenContext: analyticScreen,
  authSessionId: analyticSession,
});
const analyticBack = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Geri.',
  screenContext: analyticScreen,
  authSessionId: analyticSession,
});
const analyticContinueAfterBack = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Devam.',
  screenContext: analyticScreen,
  authSessionId: analyticSession,
});
assert.equal(analyticInitial.semanticPlan?.family, 'RISK_RANKING', 'operation-health starts from the canonical risk task');
assert.equal(analyticContinue.semanticPlan?.continuationAction, 'CONTINUE', 'analytic Devam advances the current task');
assert.equal(analyticBack.semanticPlan?.continuationAction, 'BACK', 'analytic Geri is a canonical BACK action');
assert.equal(String(analyticBack.reply || ''), String(analyticInitial.reply || ''), 'analytic BACK restores the previously shown step content');
assert.equal(String(analyticContinueAfterBack.reply || ''), String(analyticContinue.reply || ''), 'analytic Devam after BACK resumes the next previously shown step');

const naturalBackSession = 'm18-dlevel-natural-back-intent';
const naturalBackInitial = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Operasyon risklerini sırala.',
  screenContext: analyticScreen,
  authSessionId: naturalBackSession,
});
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Devam.',
  screenContext: analyticScreen,
  authSessionId: naturalBackSession,
});
const naturalBack = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Önceki adıma dön.',
  screenContext: analyticScreen,
  authSessionId: naturalBackSession,
});
assert.equal(naturalBack.semanticPlan?.family, 'CONTINUE_CURRENT_REASONING', 'natural previous-step wording stays in canonical continuation');
assert.equal(naturalBack.semanticPlan?.continuationAction, 'BACK', 'natural previous-step wording resolves to BACK');
assert.equal(String(naturalBack.reply || ''), String(naturalBackInitial.reply || ''), 'natural BACK restores the previous analytical content');

const previousInformationSession = 'm18-dlevel-previous-information-negative';
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Operasyon risklerini sırala.',
  screenContext: analyticScreen,
  authSessionId: previousInformationSession,
});
const previousInformation = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: analyticUser,
  message: 'Önceki riskler hakkında bilgi verir misin?',
  screenContext: analyticScreen,
  authSessionId: previousInformationSession,
});
assert.notEqual(previousInformation.semanticPlan?.continuationAction, 'BACK', 'previous-information question is not treated as BACK');

console.log(JSON.stringify({
  CHECK: 'M18_DLEVEL_CONTINUATION_NORMALIZATION_01',
  CONTINUATION_PROMPT_PRESERVED: normalized.message === raw,
  FAMILY: payload.semanticPlan?.family,
  ACTION: payload.semanticPlan?.continuationAction,
  OPERATION: payload.semanticPlan?.canonicalRequest?.operation,
  WORKFLOW: payload.semanticPlan?.workflowIntent,
  RESUME_ROLE_HELP_PRECEDENCE: resumePayload.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING'
    && resumePayload.semanticPlan?.continuationAction === 'CONTINUE'
    && resumePayload.semanticPlan?.canonicalRequest?.operation === 'CONTINUE_EXPLANATION',
  BACK_ACTION: backPayload.semanticPlan?.continuationAction,
  RECOVER_ACTION: recoverPayload.semanticPlan?.continuationAction,
  ROOM_BACK_ACTION: roomBackPayload.semanticPlan?.continuationAction,
  ROOM_RECOVER_ACTION: roomRecoverPayload.semanticPlan?.continuationAction,
  ANALYTIC_BACK_RESTORES_CONTENT: String(analyticBack.reply || '') === String(analyticInitial.reply || ''),
  ANALYTIC_CONTINUE_AFTER_BACK_RESTORES_NEXT: String(analyticContinueAfterBack.reply || '') === String(analyticContinue.reply || ''),
  NATURAL_BACK_ACTION: naturalBack.semanticPlan?.continuationAction,
  NATURAL_BACK_RESTORES_CONTENT: String(naturalBack.reply || '') === String(naturalBackInitial.reply || ''),
  PREVIOUS_INFORMATION_NOT_BACK: previousInformation.semanticPlan?.continuationAction !== 'BACK',
  BUSINESS_WRITE_EXECUTION: 0,
  STATUS: 'GREEN',
}, null, 2));
