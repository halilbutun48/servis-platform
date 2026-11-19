#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCopilotFoundation } from '../src/ai/service.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { normalizeCopilotRequestInput } from '../src/ai/schemas.js';

const uniqueSession = (label) => `m18-dlevel-roots-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function request({ label, user, message, screenContext }) {
  return runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    message,
    screenContext,
    authSessionId: uniqueSession(label),
  });
}

const schoolHelp = await request({
  label: 'school-help',
  user: { id: 880601, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 2 },
  message: 'Bu ekran ne işe yarıyor?',
  screenContext: {
    path: '/school',
    label: 'Okul Merkezi',
    role: 'COMPANY',
    uiHints: { pageTitles: ['Planlama Merkezi'], visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'school:guided-entry' }] },
  },
});
assert.doesNotMatch(String(schoolHelp.reply || ''), /Hizmet Alan Firma|Planlama Merkezi yeni işi kurma/i, 'school help must not use COMPANY planning copy');

const organizationHelp = await request({
  label: 'organization-help',
  user: { id: 880602, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 3 },
  message: 'Bu ekran ne işe yarıyor?',
  screenContext: {
    path: '/organization',
    label: 'Gezi / Planlama Merkezi',
    role: 'COMPANY',
    uiHints: { pageTitles: ['Planlama Merkezi'], visibleButtons: [{ label: 'Planları aç', targetKey: 'organization:plans' }] },
  },
});
assert.doesNotMatch(String(organizationHelp.reply || ''), /Hizmet Alan Firma|Planlama Merkezi yeni işi kurma/i, 'organization help must not use COMPANY planning copy');

const deicticCurrentSurfaceHelp = await request({
  label: 'company-deictic-current-surface-help',
  user: { id: 880605, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  message: 'Nasıl çalışıyor bu?',
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
   uiHints: { pageTitles: ['Planlama Merkezi'], visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL' }] },
  },
});
assert.equal(deicticCurrentSurfaceHelp.semanticPlan?.family, 'SCREEN_CONTEXT', 'deictic current-surface help must use screen context');
assert.notEqual(deicticCurrentSurfaceHelp.semanticPlan?.conversationRoute, 'GENERIC_PRODUCT_HELP', 'deictic current-surface help must not fall back to generic help');
assert.match(String(deicticCurrentSurfaceHelp.reply || ''), /Planlama Merkezi|planlama/i, 'deictic current-surface help must be grounded in the current surface');

for (const message of [
  'nerelere bakmam gerek',
  'bana yardım et',
  'bu programı kullanmayı bana öğret',
  'burada ne yapabilirim',
  'burada nereden başlamalıyım',
  'burda sorun var mı',
  'burada dikkat etmem gereken bir şey var mı',
  'ne yapmam gerekiyor',
  'bana adım adım göster',
]) {
  const genericSurfaceHelp = await request({
    label: `company-generic-surface-${message}`,
    user: { id: 880606, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
    message,
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
   uiHints: { pageTitles: ['Planlama Merkezi'], visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL' }] },
    },
  });
  assert.notEqual(genericSurfaceHelp.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', `${message} must remain grounded in current surface`);
  assert.notEqual(genericSurfaceHelp.semanticPlan?.family, 'GENERIC_PRODUCT_HELP', `${message} must not fall back to generic product help while an authorized surface is active`);
  assert.doesNotMatch(String(genericSurfaceHelp.reply || ''), /hangi yetkili alanı|hangi kayıt|kayıt türünü/iu, `${message} must not ask for an unrelated record or area`);
  assert.match(String(genericSurfaceHelp.reply || ''), /Planlama Merkezi|planlama|vardiya|Rehberi|güvenli adım|sorun|ekran|SeferPakt/iu, `${message} must remain grounded in the authorized current surface`);
}

const roomSituatedHelpSession = uniqueSession('room-situated-help-sequence');
const roomSituatedHelpUser = { id: 880607, role: 'ROOM', roomId: 1 };
const roomSituatedHelpContext = {
  path: '/room/shifts',
  label: 'Vardiyalar',
  role: 'ROOM',
  uiHints: {
    pageTitles: ['Vardiyalar'],
    visibleButtons: [
      { label: 'Vardiya oluştur', targetKey: 'room:shift-create' },
      { label: 'Vardiya detayları', targetKey: 'room:shift-details' },
    ],
  },
};
for (const message of [
  'bu program ne işe yarıyor',
  'bu promram ne işe yarıyor',
  'bu promgram ne işe yarıyor',
  'bu ekran ne işe yarıyor',
  'burada ne yapabilirim',
]) {
  await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: roomSituatedHelpUser,
    message,
    screenContext: roomSituatedHelpContext,
    authSessionId: roomSituatedHelpSession,
  });
}
const roomSituatedHelp = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: roomSituatedHelpUser,
  message: 'nerelere bakmam gerek',
  screenContext: roomSituatedHelpContext,
  authSessionId: roomSituatedHelpSession,
});
assert.notEqual(roomSituatedHelp.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'situated ROOM help must not become unclear after prior surface-help turns');
assert.notEqual(roomSituatedHelp.semanticPlan?.canonicalRequest?.clarificationNeed, 'CANONICAL_REQUEST_UNRESOLVED', 'situated ROOM help must not require record clarification');
assert.notEqual(roomSituatedHelp.semanticPlan?.canonicalRequest?.semanticAction?.objectClass, 'RECORD', 'situated ROOM help must remain surface-grounded');
assert.match(String(roomSituatedHelp.reply || ''), /Vardiyalar|vardiya|ekran|alan|başla|göster|bak/iu, 'situated ROOM help must identify current-surface areas');

const preWizardRecoverySession = uniqueSession('company-prewizard-recovery');
const preWizardRecoveryUser = { id: 880611, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
const preWizardRecoveryContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Ayrıntılı çalışma alanını göster', targetKey: '' },
       { label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL' },
    ],
    guidedDraftAvailability: { state: 'SAVED_DRAFT_CHOOSER', count: 1, maxResumeStep: 1 },
  },
};
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: preWizardRecoveryUser,
  message: 'Vardiya oluşturmak istiyorum',
  screenContext: preWizardRecoveryContext,
  authSessionId: preWizardRecoverySession,
});
const preWizardRecovery = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: preWizardRecoveryUser,
  message: 'Rehberi başlatamıyorum',
  screenContext: preWizardRecoveryContext,
  authSessionId: preWizardRecoverySession,
});
assert.notEqual(preWizardRecovery.semanticPlan?.family, 'GENERIC_PRODUCT_HELP', 'pre-wizard recovery must not be downgraded to generic product help');
assert.equal(preWizardRecovery.semanticPlan?.workflowIntent, 'CREATE_SHIFT', 'pre-wizard recovery must retain CREATE_SHIFT');
assert.equal(preWizardRecovery.guidedTarget?.targetKey, 'company:guided-plan-start', 'pre-wizard recovery must retain the real entry target');
assert.match(String(preWizardRecovery.reply || ''), /takıldığını anlıyorum|yeniden dokun|görünür ve etkin|Rehberi Başlat/iu, 'pre-wizard recovery must provide a concrete retry action');

const explicitWorkflowNavigation = await request({
  label: 'company-workflow-navigation',
  user: { id: 880608, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  message: 'Beni vardiya oluşturma ekranına göt',
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: { pageTitles: ['Planlama Merkezi'], visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start' }] },
  },
});
assert.equal(explicitWorkflowNavigation.semanticPlan?.workflowIntent, 'CREATE_SHIFT', 'explicit workflow navigation must retain CREATE_SHIFT');
assert.notEqual(explicitWorkflowNavigation.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'explicit workflow navigation must not become unclear');

const recoverySession = uniqueSession('company-workflow-recovery');
const recoveryContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: { pageTitles: ['Planlama Merkezi'], visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL' }] },
};
const recoveryUser = { id: 880609, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Ben vardiya oluşturmak istiyorum', screenContext: recoveryContext, authSessionId: recoverySession });
const recovery = await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Vardiya oluşturma yerini bulamadım', screenContext: recoveryContext, authSessionId: recoverySession });
assert.equal(recovery.semanticPlan?.workflowIntent, 'CREATE_SHIFT', 'workflow recovery must retain CREATE_SHIFT');
assert.notEqual(recovery.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'workflow recovery must not become unclear');
assert.equal(recovery.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'workflow recovery must remain a continuation action');
assert.equal(recovery.semanticPlan?.canonicalRequest?.operation, 'CONTINUE_EXPLANATION', 'workflow recovery must use the canonical recovery operation');
assert.notEqual(recovery.guidedTarget?.status, 'NOT_FOUND', 'workflow recovery must resolve a truthful current target');

const backSession = uniqueSession('company-workflow-back');
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: recoveryUser,
  message: 'Ben vardiya oluşturmak istiyorum',
  screenContext: recoveryContext,
  authSessionId: backSession,
});
const back = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: recoveryUser,
  message: 'Geri.',
  screenContext: recoveryContext,
  authSessionId: backSession,
});
assert.equal(back.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'workflow back must remain a continuation action');
assert.equal(back.semanticPlan?.canonicalRequest?.operation, 'CONTINUE_EXPLANATION', 'workflow back must use the canonical continuation operation');
assert.equal(back.semanticPlan?.continuationAction, 'BACK', 'workflow back must preserve the BACK transition');
assert.notEqual(back.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'workflow back must not become unclear');
assert.notEqual(back.guidedTarget?.status, 'UNAUTHORIZED', 'workflow back must not expose an unauthorized target');

const backAfterContinueSession = uniqueSession('company-workflow-back-after-continue');
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Ben vardiya oluşturmak istiyorum', screenContext: recoveryContext, authSessionId: backAfterContinueSession });
const continuedBeforeBack = await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Devam.', screenContext: recoveryContext, authSessionId: backAfterContinueSession });
assert.equal(continuedBeforeBack.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'workflow continue before back must remain a continuation action');
const backAfterContinue = await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Geri.', screenContext: recoveryContext, authSessionId: backAfterContinueSession });
assert.equal(backAfterContinue.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'workflow back after continue must remain a continuation action');
assert.equal(backAfterContinue.semanticPlan?.continuationAction, 'BACK', 'workflow back after continue must preserve the BACK transition');
assert.notEqual(backAfterContinue.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'workflow back after continue must not become unclear');

const backAfterGuidanceSession = uniqueSession('company-workflow-back-after-guidance');
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Ben vardiya oluşturmak istiyorum', screenContext: recoveryContext, authSessionId: backAfterGuidanceSession });
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Adım adım anlat', screenContext: recoveryContext, authSessionId: backAfterGuidanceSession });
const guidedContinueBeforeBack = await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Devam.', screenContext: recoveryContext, authSessionId: backAfterGuidanceSession });
assert.equal(guidedContinueBeforeBack.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'workflow guided continue before back must remain a continuation action');
const backAfterGuidance = await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Geri.', screenContext: recoveryContext, authSessionId: backAfterGuidanceSession });
assert.equal(backAfterGuidance.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'workflow back after guidance must remain a continuation action');
assert.equal(backAfterGuidance.semanticPlan?.continuationAction, 'BACK', 'workflow back after guidance must preserve the BACK transition');
assert.notEqual(backAfterGuidance.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'workflow back after guidance must not become unclear');

// Browser parity control: the real Planlama Merkezi sends the full authorized
// live-surface envelope, including the current target and saved-draft hints.
// BACK must remain a continuation under that same envelope.
const browserParityContext = {
  id: 2101,
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  companyKind: 'COMPANY',
  uiHints: {
    visibleButtons: [
      'Planlama Merkezi', 'Operasyon Paneli', 'Vardiyalar', 'Sözleşmeler',
      'Bütçe ve Servis Maliyeti', 'Ticari Akış', 'Hizmet Değerlendirme',
      'Personel Erişimi', 'Personel bağlantıları', 'SİSTEM ▸', 'Çıkış',
      'Operasyonu aç', 'Ana adıma git', 'Sözleşmeleri incele',
      'Ayrıntılı çalışma alanını göster', 'Rehberi Başlat',
    ].map((label) => ({ label, semanticType: label === 'Ayrıntılı çalışma alanını göster' ? 'disclosure' : 'button', targetKey: label === 'Rehberi Başlat' ? 'company:guided-plan-start' : '' })),
    activeTabs: ['Planlama Merkezi'],
    semanticElements: [{ semanticType: 'disclosure', label: 'Ayrıntılı çalışma alanını göster', targetKey: 'disclosure:ayrıntılı çalışma alanını göster' }],
    guidedDraftAvailability: { state: 'SAVED_DRAFT_CHOOSER', count: 1, maxResumeStep: 1, source: 'SERVER_GUIDED_DRAFTS' },
    currentTarget: { status: 'FOUND', targetKind: 'CONTROL', targetKey: 'company:guided-plan-start', label: 'Rehberi Başlat', semanticType: 'button', screenPath: '/company', role: 'Hizmet Alan Firma' },
  },
};
const browserParitySession = uniqueSession('company-workflow-browser-parity-back');
const browserParityUser = { id: 2, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 2101, user: browserParityUser, message: 'Ben vardiya oluşturmak istiyorum', screenContext: browserParityContext, authSessionId: browserParitySession });
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 2101, user: browserParityUser, message: 'Adım adım anlat', screenContext: browserParityContext, authSessionId: browserParitySession });
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 2101, user: browserParityUser, message: 'Devam.', screenContext: { ...browserParityContext, uiHints: { ...browserParityContext.uiHints, currentTarget: null } }, authSessionId: browserParitySession });
const browserParityBack = await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 2101, user: browserParityUser, message: 'Geri.', screenContext: browserParityContext, authSessionId: browserParitySession });
assert.equal(browserParityBack.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'browser-parity back must remain a continuation action');
assert.equal(browserParityBack.semanticPlan?.continuationAction, 'BACK', 'browser-parity back must preserve the BACK transition');
assert.notEqual(browserParityBack.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'browser-parity back must not become unclear');

const liveWorkflowBackContext = {
  ...recoveryContext,
  uiHints: {
    ...recoveryContext.uiHints,
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 1,
      completedThroughOrdinal: 0,
      currentTargetKey: 'company:guided-plan-start',
      currentTargetLabel: 'Rehberi Başlat',
      source: 'LIVE_UI',
    },
  },
};
const liveWorkflowBackSession = uniqueSession('company-live-workflow-back');
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Ben vardiya oluşturmak istiyorum', screenContext: liveWorkflowBackContext, authSessionId: liveWorkflowBackSession });
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Adım adım anlat', screenContext: liveWorkflowBackContext, authSessionId: liveWorkflowBackSession });
await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Devam.', screenContext: liveWorkflowBackContext, authSessionId: liveWorkflowBackSession });
const liveWorkflowBack = await runCopilotFoundation({ intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: recoveryUser, message: 'Geri.', screenContext: liveWorkflowBackContext, authSessionId: liveWorkflowBackSession });
assert.equal(liveWorkflowBack.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'live workflow back must remain a continuation action');
assert.equal(liveWorkflowBack.semanticPlan?.continuationAction, 'BACK', 'live workflow back must preserve the BACK transition');
assert.notEqual(liveWorkflowBack.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'live workflow back must not become unclear');

const routeRecoverySession = uniqueSession('company-workflow-route-recovery');
const routeRecoveryUser = { id: 880610, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
const shiftsRouteContext = {
  path: '/company/shifts',
  label: 'Vardiyalar',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Planlama Merkezi', targetKey: '' },
      { label: 'Detayları göster', targetKey: '' },
    ],
  },
};
const companyRouteContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Ayrıntılı çalışma alanını göster', targetKey: '' },
      { label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL' },
    ],
  },
};
for (const message of [
  'Ben vardiya oluşturmak istiyorum',
  'Yeni vardiya nereden açılıyor?',
  'Vardiya eklemeyi göster',
  'Beni vardiya oluşturma ekranına göt',
  'Vardiya oluşturma yerini bulamadım',
]) {
  await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: routeRecoveryUser,
    message,
    screenContext: shiftsRouteContext,
    authSessionId: routeRecoverySession,
  });
}
const routeRecovery = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: routeRecoveryUser,
  message: 'Vardiya oluşturma yerini bulamadım',
  screenContext: companyRouteContext,
  authSessionId: routeRecoverySession,
});
assert.equal(routeRecovery.semanticPlan?.workflowIntent, 'CREATE_SHIFT', 'route-change recovery must retain CREATE_SHIFT');
assert.notEqual(routeRecovery.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'route-change recovery must not become unclear');
assert.equal(routeRecovery.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'CONTINUE', 'route-change recovery must remain a continuation action');
assert.equal(routeRecovery.semanticPlan?.canonicalRequest?.operation, 'CONTINUE_EXPLANATION', 'route-change recovery must use the canonical recovery operation');
assert.equal(routeRecovery.guidedTarget?.status, 'FOUND', 'route-change recovery must resolve the current parent-surface target');
assert.equal(routeRecovery.guidedTarget?.targetKey, 'company:guided-plan-start', 'route-change recovery must resolve Rehberi Başlat');

const liveWorkflowStepGuidance = await request({
  label: 'company-live-workflow-step-guidance',
  user: { id: 880612, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  message: 'bu adımda ne yapacağım',
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      pageTitles: ['Planlama Merkezi'],
      workflowState: {
        workflowId: 'COMPANY_GUIDED_NEW_PLAN',
        activeStepOrdinal: 2,
        completedThroughOrdinal: 1,
        currentTargetKey: '/company:button:Taslak vardiya oluştur',
        currentTargetLabel: 'Taslak vardiya oluştur',
        source: 'LIVE_UI',
      },
      currentTarget: {
        status: 'FOUND',
        targetKind: 'CONTROL',
        targetKey: '/company:button:Taslak vardiya oluştur',
        label: 'Taslak vardiya oluştur',
        semanticType: 'button',
        screenPath: '/company',
        role: 'COMPANY',
      },
      visibleButtons: [
        { label: 'Taslak vardiya oluştur', targetKey: '/company:button:Taslak vardiya oluştur', identitySource: 'LEGACY_LABEL' },
      ],
    },
  },
});
assert.notEqual(liveWorkflowStepGuidance.semanticPlan?.family, 'GENERIC_PRODUCT_HELP', 'live workflow step guidance must not fall back to generic product help');
assert.notEqual(liveWorkflowStepGuidance.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'live workflow step guidance must remain actionable');
assert.equal(liveWorkflowStepGuidance.semanticPlan?.workflowIntent, 'CREATE_SHIFT', 'live workflow step guidance must retain CREATE_SHIFT');
assert.equal(liveWorkflowStepGuidance.semanticPlan?.workflowStepReference?.ordinal, 2, 'live workflow step guidance must use the live step ordinal');
assert.equal(liveWorkflowStepGuidance.semanticPlan?.canonicalRequest?.operation, 'EXPLAIN_CURRENT_TARGET', 'live workflow step guidance must explain the current target');

const liveWorkflowEvidenceSession = uniqueSession('company-live-workflow-evidence');
const liveWorkflowEntryContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: { visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start', identitySource: 'CANONICAL' }] },
};
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: { id: 880613, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  message: 'Vardiya oluşturmak istiyorum',
  screenContext: liveWorkflowEntryContext,
  authSessionId: liveWorkflowEvidenceSession,
});
const liveWorkflowEvidenceStep = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: { id: 880613, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  message: 'bu adımda ne yapacağım',
  screenContext: {
    ...liveWorkflowEntryContext,
    uiHints: {
      workflowState: {
        workflowId: 'COMPANY_GUIDED_NEW_PLAN',
        activeStepOrdinal: 2,
        completedThroughOrdinal: 1,
        currentTargetKey: '/company:button:Taslak vardiya oluştur',
        currentTargetLabel: 'Taslak vardiya oluştur',
        source: 'LIVE_UI',
      },
      currentTarget: {
        status: 'FOUND',
        targetKind: 'CONTROL',
        targetKey: '/company:button:Taslak vardiya oluştur',
        label: 'Taslak vardiya oluştur',
        semanticType: 'button',
        screenPath: '/company',
        role: 'COMPANY',
      },
      visibleButtons: [
        { label: 'Taslak vardiya oluştur', targetKey: '/company:button:Taslak vardiya oluştur', identitySource: 'LEGACY_LABEL' },
      ],
    },
  },
  authSessionId: liveWorkflowEvidenceSession,
});
assert.notEqual(liveWorkflowEvidenceStep.semanticPlan?.family, 'UNCLEAR_OR_AMBIGUOUS', 'live workflow evidence must support current-step guidance');
assert.equal(liveWorkflowEvidenceStep.semanticPlan?.canonicalRequest?.operation, 'EXPLAIN_CURRENT_TARGET', 'live workflow current-step guidance must emit the target-explanation operation');
assert.equal(liveWorkflowEvidenceStep.semanticPlan?.workflowStepReference?.ordinal, 2, 'active workflow state must remain bound to the live step');
const liveWorkflowDeicticStep = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: { id: 880613, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  message: 'Burası ne',
  screenContext: {
    ...liveWorkflowEntryContext,
    uiHints: {
      workflowState: {
        workflowId: 'COMPANY_GUIDED_NEW_PLAN',
        activeStepOrdinal: 2,
        completedThroughOrdinal: 1,
        currentTargetKey: '/company:button:Taslak vardiya oluştur',
        currentTargetLabel: 'Taslak vardiya oluştur',
        source: 'LIVE_UI',
      },
      currentTarget: {
        status: 'FOUND',
        targetKind: 'CONTROL',
        targetKey: '/company:button:Taslak vardiya oluştur',
        label: 'Taslak vardiya oluştur',
        semanticType: 'button',
        screenPath: '/company',
        role: 'COMPANY',
      },
      visibleButtons: [{ label: 'Taslak vardiya oluştur', targetKey: '/company:button:Taslak vardiya oluştur', identitySource: 'LEGACY_LABEL' }],
    },
  },
  authSessionId: liveWorkflowEvidenceSession,
});
assert.equal(liveWorkflowDeicticStep.semanticPlan?.family, 'EXPLAIN_CURRENT_TARGET', 'deictic workflow guidance must explain the live step');
assert.equal(liveWorkflowDeicticStep.semanticPlan?.canonicalRequest?.operation, 'EXPLAIN_CURRENT_TARGET', 'deictic workflow guidance must preserve the target-explanation operation');
assert.equal(liveWorkflowDeicticStep.semanticPlan?.workflowStepReference?.ordinal, 2, 'deictic workflow guidance must remain bound to the live step');

const liveWorkflowLocationStep = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: { id: 880613, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  message: 'Şu an neredeyim',
  screenContext: {
    ...liveWorkflowEntryContext,
    uiHints: {
      workflowState: {
        workflowId: 'COMPANY_GUIDED_NEW_PLAN',
        activeStepOrdinal: 2,
        completedThroughOrdinal: 1,
        currentTargetKey: '/company:button:Taslak vardiya oluştur',
        currentTargetLabel: 'Taslak vardiya oluştur',
        source: 'LIVE_UI',
      },
      currentTarget: {
        status: 'FOUND',
        targetKind: 'CONTROL',
        targetKey: '/company:button:Taslak vardiya oluştur',
        label: 'Taslak vardiya oluştur',
        semanticType: 'button',
        screenPath: '/company',
        role: 'COMPANY',
      },
    },
  },
  authSessionId: liveWorkflowEvidenceSession,
});
assert.equal(liveWorkflowLocationStep.semanticPlan?.family, 'EXPLAIN_CURRENT_TARGET', 'current-location workflow guidance must explain the live step');
assert.equal(liveWorkflowLocationStep.semanticPlan?.workflowStepReference?.ordinal, 2, 'current-location workflow guidance must remain bound to the live step');

const routeNormalizedLiveWorkflowDeictic = normalizeCopilotRequestInput({
  message: 'Burası ne',
  screenContext: {
    uiHints: {
      workflowState: {
        workflowId: 'COMPANY_GUIDED_NEW_PLAN',
        activeStepOrdinal: 2,
      },
    },
  },
});
assert.equal(routeNormalizedLiveWorkflowDeictic.message, 'Burası ne', 'live workflow deictic input must not be rewritten into broad screen-purpose text');

const personelNavigation = resolveCanonicalConversationRequest({
  message: 'Servisim ekranını aç.',
  user: { role: 'PERSONEL', companyKind: 'COMPANY', companyId: 1 },
  screenContext: {
    path: '/personel/live',
    label: 'Canlı',
    role: 'PERSONEL',
    uiHints: { visibleButtons: [{ label: 'Servisimi aç', targetKey: 'personel:my' }] },
  },
});
assert.equal(personelNavigation.request.operation, 'NAVIGATE_AUTHORIZED_SURFACE', 'PERSONEL surface request must be navigation');
assert.equal(personelNavigation.request.semanticAction.actionClass, 'NAVIGATE', 'PERSONEL surface request must preserve NAVIGATE');

const personelTypedNavigation = await request({
  label: 'personel-typed-navigation',
  user: { id: 880603, role: 'PERSONEL', companyKind: 'COMPANY', companyId: 1 },
  message: 'Servisim ekranını aç.',
  screenContext: {
    path: '/personel/live',
    label: 'Canlı',
    role: 'PERSONEL',
    selectedEntityId: 1,
    selectedEntityType: 'SHIFT',
    semanticResolutionContext: {
      authorizedRole: 'PERSONEL',
      selectedEntityType: 'SHIFT',
      selectedEntityPresent: true,
    },
    uiHints: {
      visibleButtons: [{ label: 'Servisimi aç', targetKey: 'personel:my' }],
    },
  },
});
assert.equal(personelTypedNavigation.semanticPlan?.canonicalRequest?.operation, 'NAVIGATE_AUTHORIZED_SURFACE', 'typed PERSONEL surface request must navigate');
assert.equal(personelTypedNavigation.semanticPlan?.canonicalRequest?.semanticAction?.actionClass, 'NAVIGATE', 'typed PERSONEL surface request must preserve NAVIGATE');
assert.equal(personelTypedNavigation.semanticPlan?.canonicalRequest?.semanticAction?.objectClass, 'SURFACE', 'typed PERSONEL surface request must target a surface');
assert.equal(personelTypedNavigation.semanticPlan?.authorizationDecision?.status, 'ALLOW', 'typed PERSONEL surface navigation must not inherit selected-record denial');
assert.equal(personelTypedNavigation.guidedTarget?.status, 'FOUND', 'typed PERSONEL surface navigation must resolve a real target');

const superAdminNavigation = resolveCanonicalConversationRequest({
  message: 'Denetim Paneli aç.',
  user: { role: 'SUPER_ADMIN' },
  screenContext: {
    path: '/superadmin',
    label: 'Genel Bakış',
    role: 'SUPER_ADMIN',
    uiHints: { visibleButtons: [{ label: 'Denetim durumunu aç', targetKey: 'superadmin:operations' }] },
  },
});
assert.equal(superAdminNavigation.request.operation, 'NAVIGATE_AUTHORIZED_SURFACE', 'SUPER_ADMIN target request must be navigation');
assert.equal(superAdminNavigation.request.semanticAction.actionClass, 'NAVIGATE', 'SUPER_ADMIN target request must preserve NAVIGATE');

const loginSource = readFileSync(new URL('../../web/src/App.jsx', import.meta.url), 'utf8');
assert.doesNotMatch(loginSource, /Final marka sistemi|SP \+ kalkan \+ iş birliği/iu, 'login surface must not expose internal annotation copy');

console.log('M18_DLEVEL_REAL_UI_ROOTS=GREEN');
