#!/usr/bin/env node

import {
  resolveCopilotGuidedTarget,
  isCopilotGuidanceMessage,
  GUIDED_TARGET_STATUSES,
} from '../src/ai/chat/copilotUiElementAnchor.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { runCopilotFoundation } from '../src/ai/service.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function source(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

function assert(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function fixture(overrides = {}) {
  return {
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: {
      path: '/company/agreements',
      label: 'Sözleşmeler',
      role: 'COMPANY',
      uiHints: {
        activeTabs: ['Aktif'],
        visibleButtons: [
          { label: 'Detayları göster', semanticType: 'button', targetKey: 'company-agreements:detaylari-goster', disabled: false },
          { label: 'Filtrele', semanticType: 'button', targetKey: 'company-agreements:filtrele', disabled: false },
        ],
        activeTabs: [{ label: 'Aktif', semanticType: 'tab', targetKey: 'company-agreements:tab:aktif' }],
      },
    },
    conversationState: { guidedTarget: null },
    ...overrides,
  };
}

const found = resolveCopilotGuidedTarget({ ...fixture(), message: 'Detayları göster nerede?' });
assert(found.status === GUIDED_TARGET_STATUSES.FOUND, 'current semantic target is found');
assert(found.targetKey === 'company-agreements:detaylari-goster', 'target uses stable semantic key');
assert(found.safeAction === 'HIGHLIGHT', 'target is highlight-only safe action');
assert(found.criticalActionExecution === false, 'target cannot execute business action');

const missing = resolveCopilotGuidedTarget({ ...fixture(), message: 'Kaydet butonu nerede?' });
assert(missing.status === GUIDED_TARGET_STATUSES.NOT_FOUND, 'missing target is reported honestly');
assert(missing.targetKey === null, 'missing target has no invented identity');

const unrelatedAfterFound = resolveCopilotGuidedTarget({
  ...fixture({ conversationState: { guidedTarget: found } }),
  message: 'Kaydet butonu nerede?',
});
assert(unrelatedAfterFound.status === GUIDED_TARGET_STATUSES.NOT_FOUND, 'new target question does not reuse stale highlight');

const unauthorized = resolveCopilotGuidedTarget({
  ...fixture({ user: { role: 'DRIVER', companyId: 10 }, screenContext: { ...fixture().screenContext, role: 'DRIVER' } }),
  message: 'Detayları göster nerede?',
});
assert(unauthorized.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, 'cross-role target is blocked');

const stale = resolveCopilotGuidedTarget({
  ...fixture({ conversationState: { guidedTarget: { targetKey: 'company-agreements:detaylari-goster', screenPath: '/company/agreements' } } }),
  message: 'Devam et',
  screenContext: { ...fixture().screenContext, path: '/company/shifts' },
});
assert(stale.status === GUIDED_TARGET_STATUSES.STALE, 'route change clears stale target');

const canonicalCurrentRouteTarget = resolveCopilotGuidedTarget({
  ...fixture({
    conversationState: { guidedTarget: { targetKey: 'company:rehberi-baslat', screenPath: '/company' } },
    screenContext: {
      ...fixture().screenContext,
      path: '/company/shifts',
      label: 'Vardiyalar',
      uiHints: {
        visibleButtons: [{ label: 'Detayları göster', semanticType: 'disclosure', targetKey: 'company-shifts:detaylari-goster', disabled: false }],
        activeTabs: [],
      },
    },
  }),
  message: 'Detayları göster nerede?',
  semanticPlan: {
    family: 'UI_GUIDANCE',
    typedRequest: { screenContextIntent: true },
    explicitUiGuidance: true,
  },
});
assert(canonicalCurrentRouteTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'a fresh canonical guidance plan re-resolves after route change');
assert(canonicalCurrentRouteTarget.targetKey === 'company-shifts:detaylari-goster', 'a fresh canonical plan never retains the previous route target');

const workflowFixture = {
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [
        { label: 'Planlama Merkezi', semanticType: 'button', targetKey: 'company-shifts:planlama-merkezi', disabled: false },
      ],
      activeTabs: [],
    },
  },
};
for (const message of [
  'Ben vardiya oluşturmak istiyorum',
  'Yeni vardiya nereden açılıyor?',
  'Vardiya eklemeyi göster',
  'Beni vardiya oluşturma ekranına götür',
  'Vardiya oluşturma yerini bulamadım',
]) {
  const plan = resolveSemanticIntent({ ...workflowFixture, message, conversationState: null });
  assert(plan.family === 'UI_GUIDANCE', `workflow intent resolves to UI guidance: ${message}`);
  assert(plan.typedRequest?.explicitTaskIntent === true, `workflow intent is explicit: ${message}`);
  assert(plan.requestedDomains.includes('SHIFTS'), `workflow intent keeps shift authorization domain: ${message}`);
}

const workflowTarget = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [
        { label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false },
      ],
      activeTabs: [],
    },
  },
  conversationState: { guidedTarget: null },
  message: 'Ben vardiya oluşturmak istiyorum',
});
assert(workflowTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'workflow intent resolves to the real Planlama Merkezi control');
assert(workflowTarget.targetKey === 'company:rehberi-baslat', 'workflow target keeps the current semantic target key');
const workflowContinue = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [
        { label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false },
      ],
      activeTabs: [],
    },
  },
  conversationState: {
    guidedTarget: null,
    lastSettledResult: { semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
  },
  message: 'Devam',
});
assert(workflowContinue.status === GUIDED_TARGET_STATUSES.FOUND, 'Devam re-resolves the real workflow target after navigation');

// #18 must keep the semantic decision in the canonical planner.  These are
// production-language follow-ups, so a raw phrase matcher downstream is not
// allowed to become the authority that restores the workflow.
const canonicalWorkflowState = {
  lastSettledResult: {
    semanticPlan: {
      family: 'UI_GUIDANCE',
      intentFamily: 'UI_GUIDANCE',
      dialogueTopic: 'PRODUCT',
      conversationRoute: 'RETURN_TO_PRODUCT_TASK',
      workflowIntent: 'CREATE_SHIFT',
      requestedDomains: ['SHIFTS'],
      entities: [],
    },
  },
  authorizedProductContext: {
    semanticPlan: {
      family: 'UI_GUIDANCE',
      intentFamily: 'UI_GUIDANCE',
      dialogueTopic: 'PRODUCT',
      conversationRoute: 'RETURN_TO_PRODUCT_TASK',
      workflowIntent: 'CREATE_SHIFT',
      requestedDomains: ['SHIFTS'],
      entities: [],
    },
  },
  guidedTarget: null,
};

for (const message of ['Adım adım anlat', 'Devam', 'Sonra?', 'Bulamadım', 'Burada göremiyorum', 'Geri', 'Yanlış ekrandayım']) {
  const plan = resolveSemanticIntent({
    user: { role: 'COMPANY', companyId: 10 },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    conversationState: canonicalWorkflowState,
    message,
  });
  assert(plan.family === 'CONTINUE_CURRENT_REASONING', `canonical workflow follow-up keeps the active task: ${message}`);
  assert(plan.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `canonical workflow follow-up preserves CREATE_SHIFT: ${message}`);
}

const canonicalContinuationPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: canonicalWorkflowState,
  message: 'Adım adım anlat',
});

const currentScreenPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
  conversationState: { guidedTarget: null },
  message: 'Nasıl çalışıyor bu?',
});
assert(currentScreenPlan.family === 'SCREEN_CONTEXT', 'deictic current-screen question stays in canonical product context');
assert(currentScreenPlan.conversationRoute === 'RETURN_TO_PRODUCT_TASK', 'deictic current-screen question cannot be routed off-topic');

const visibleControlPlan = resolveSemanticIntent({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Ayrıntılı çalışma alanını göster', semanticType: 'disclosure', targetKey: 'company:details', disabled: false }],
      activeTabs: [],
    },
  },
  conversationState: { guidedTarget: null },
  message: 'Detayları göster nerede?',
});
assert(visibleControlPlan.family === 'UI_GUIDANCE', 'visible control request stays in canonical UI guidance');
assert(visibleControlPlan.explicitUiGuidance === true, 'visible control request is not reinterpreted as record lookup');

const explicitNextStepQuestion = resolveSemanticIntent({
  ...workflowFixture,
  message: 'Konum incelemeden sonra nereye geçeyim?',
  screenContext: { path: '/company/georeview', label: 'Konum İncele', role: 'COMPANY' },
  conversationState: null,
});
assert(explicitNextStepQuestion.family !== 'CONTINUE_CURRENT_REASONING', 'an explicit current-screen next-step question is not mistaken for a contextless continuation');

const planDrivenTarget = resolveCopilotGuidedTarget({
  user: { role: 'COMPANY', companyId: 10 },
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false }],
      activeTabs: [],
    },
  },
  conversationState: canonicalWorkflowState,
  semanticPlan: canonicalContinuationPlan,
  message: 'Adım adım anlat',
});
assert(planDrivenTarget.status === GUIDED_TARGET_STATUSES.FOUND, 'guided target consumes the canonical continuation plan before raw phrase fallback');
assert(planDrivenTarget.targetKey === 'company:rehberi-baslat', 'canonical continuation resolves the real workflow target');

assert(isCopilotGuidanceMessage('Girdim.'), 'continuation command is guidance');
assert(isCopilotGuidanceMessage('Burası ne?'), 'screen grounding question is guidance');
assert(!isCopilotGuidanceMessage('Sözleşmeyi onayla'), 'business write is not guidance');

const serviceSource = source('backend/src/ai/service.js');
const stateSource = source('backend/src/ai/chat/canonicalConversationState.js');
const overlaySource = source('web/src/components/copilot/GuidedTargetOverlay.jsx');
const surfaceSource = source('web/src/components/copilot/uiSurface.js');
const drawerSource = source('web/src/components/copilot/FloatingCopilotDrawer.jsx');
const styleSource = source('web/src/index.css');
assert(serviceSource.includes('resolveCopilotGuidedTarget'), 'service consumes canonical target resolver');
assert(serviceSource.includes('guidedTarget'), 'service returns grounded target state');
assert(stateSource.includes('guidedTarget'), 'conversation state stores target continuity without auth authority');
assert(overlaySource.includes('scrollIntoView'), 'browser target uses bounded scroll');
assert(overlaySource.includes('pointerEvents: \'none\''), 'highlight cannot block the target click');
assert(overlaySource.includes('TARGET_DISAPPEARED'), 'disappeared target clears highlight');
assert(overlaySource.includes('const hadTarget = Boolean(targetRef.current)'), 'disappeared target transition observes prior DOM target');
assert(overlaySource.includes('keepTargetAboveMobileDrawer'), 'mobile target remains above the bounded drawer');
assert(overlaySource.includes('window.scrollBy'), 'mobile overlap correction uses bounded browser scroll');
assert(surfaceSource.includes('semanticType'), 'ui surface captures semantic target type');
assert(drawerSource.includes('copilotDrawerResizeHandle'), 'desktop resize handle remains explicit');
assert(styleSource.includes('height: min(36vh, 320px) !important;'), 'mobile drawer uses bounded compact height');
assert(styleSource.includes('.copilotDrawerMoreMenu .copilotDrawerPresets') && styleSource.includes('display: none;'), 'mobile hides desktop-only size presets');
assert(drawerSource.includes('mobileExpanded'), 'mobile drawer has an explicit compact/expanded state');
assert(drawerSource.includes('copilotDrawer--mobile-expanded'), 'mobile expanded state is reflected in the drawer surface');
assert(drawerSource.includes('copilotMobileExpandBtn'), 'mobile expansion control has a real function');
assert(drawerSource.includes('rows={2}'), 'mobile composer starts compact');
assert(!drawerSource.includes('Bağlam: <b>{screenContext.label}</b>'), 'duplicate visible context line is removed');
assert(styleSource.includes('height: min(62vh, 560px) !important;'), 'mobile expanded height remains bounded');
assert(styleSource.includes('min-height: 48px;') && styleSource.includes('max-height: 120px;'), 'mobile composer grows within bounded height');

for (const role of ['SUPER_ADMIN', 'ROOM', 'COMPANY', 'DRIVER', 'PERSONEL', 'PARENT', 'SCHOOL', 'ORGANIZATION']) {
  const negative = resolveCopilotGuidedTarget({
    ...fixture({ user: { role, companyId: 10 }, screenContext: { path: '/company/agreements', label: 'Sözleşmeler', role: 'COMPANY', uiHints: { visibleButtons: [] } } }),
    message: 'Detayları göster nerede?',
  });
  if (role === 'COMPANY') assert(negative.status === GUIDED_TARGET_STATUSES.NOT_FOUND, `${role} unknown target has no fake guidance`);
  else assert(negative.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED, `${role} cannot borrow another role screen`);
}

// This is the production orchestration bridge: canonical planning, server
// conversation state, authorized awareness, target resolution, and commit all
// run together. Lower-level composer matrices stay valuable, but cannot
// substitute for this path.
async function runProductionParityRegression() {
  const user = { id: 918001, role: 'COMPANY', companyId: 10, roomId: 1, companyKind: 'COMPANY' };
  const screenContext = {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false }],
      activeTabs: [],
    },
  };
  const request = (message, authSessionId) => runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    screenContext,
    message,
    authSessionId,
  });
  const workflowSession = 'm18-canonical-semantic-authority-workflow';
  const workflowStart = await request('Ben vardiya oluşturmak istiyorum', workflowSession);
  assert(workflowStart.semanticPlan?.family === 'UI_GUIDANCE', 'production workflow start remains UI guidance');
  assert(workflowStart.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'production workflow start keeps CREATE_SHIFT');
  assert(workflowStart.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'production workflow start resolves an existing target');
  assert(!/yetkili kayıtta yok|kayıt bulunamadı/i.test(workflowStart.reply || ''), 'production workflow start is not collapsed into record lookup');
  assert((workflowStart.quickActions || []).every((item) => item?.criticalActionExecution !== true), 'production workflow start cannot execute a critical action');
  assert(!(workflowStart.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE' && item?.path === screenContext.path), 'production workflow start does not claim navigation to the screen already open');

  for (const [message, action] of [
    ['Adım adım anlat', 'EXPAND'],
    ['Devam', 'CONTINUE'],
    ['Sonra?', 'NEXT'],
    ['Bulamadım', 'RECOVER'],
    ['Burada göremiyorum', 'RECOVER'],
    ['Geri', 'BACK'],
    ['Yanlış ekrandayım', 'RECOVER'],
  ]) {
    const response = await request(message, workflowSession);
    assert(response.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', `production continuation preserves workflow family: ${message}`);
    assert(response.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', `production continuation preserves workflow task: ${message}`);
    assert(response.semanticPlan?.continuationAction === action, `production continuation classifies recovery action: ${message}`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `production continuation resolves a current target: ${message}`);
    assert((response.quickActions || []).every((item) => item?.criticalActionExecution !== true), `production continuation stays non-executing: ${message}`);
  }

  const screenResponse = await request('Nasıl çalışıyor bu?', 'm18-canonical-semantic-authority-screen');
  assert(screenResponse.semanticPlan?.family === 'SCREEN_CONTEXT', 'production screen referent uses canonical screen context');
  assert(screenResponse.semanticPlan?.conversationRoute === 'RETURN_TO_PRODUCT_TASK', 'production screen referent is not routed off-topic');
  assert(!/mevcut ürün kapsamının dışında/i.test(screenResponse.reply || ''), 'production screen referent receives product help');

  const noBase = await request('Devam', 'm18-canonical-semantic-authority-no-base');
  assert(noBase.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'continuation without prior task remains a canonical continuation request');
  assert(noBase.semanticPlan?.clarificationNeed === 'CONTINUATION_BASE_NOT_FOUND', 'continuation without prior task asks for clarification');
  assert(noBase.guidedTarget?.status !== GUIDED_TARGET_STATUSES.FOUND, 'continuation without prior task does not invent a target');

  // Navigation to the Vardiyalar surface is a UI-guidance task.  It must not
  // be downgraded to a field lookup just because the user names the domain.
  const shiftNavigationContext = {
    path: '/company/agreements',
    label: 'Sözleşmeler',
    role: 'COMPANY',
    uiHints: { visibleButtons: [], activeTabs: [] },
  };
  const shiftNavigationRequest = (message, authSessionId, currentScreen = shiftNavigationContext) => runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    screenContext: currentScreen,
    message,
    authSessionId,
  });
  for (const message of [
    'vardiyalar nerde',
    'vardiyalar ekranına gitmek istiyorum',
    'vardiyaları kontrol edelim',
    'vardiya ekranını göster',
    'vardiyalara gidelim',
    'Vardiya ekranını aç',
  ]) {
    const response = await shiftNavigationRequest(message, `m18-shift-navigation-${message}`);
    assert(response.semanticPlan?.family === 'UI_GUIDANCE', `shift surface navigation stays UI guidance: ${message}`);
    assert(response.semanticPlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', `shift surface navigation keeps its task: ${message}`);
    assert((response.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE' && item?.path === '/company/shifts'), `shift surface navigation resolves the authorized route: ${message}`);
    assert(!/başlangıç\/bitiş saati, durum veya başka alanı netleştirir misin/i.test(response.reply || ''), `shift surface navigation is not a field clarification: ${message}`);
  }

  const shiftStatus = await shiftNavigationRequest('vardiya durumları ne', 'm18-shift-status-data-query');
  assert(shiftStatus.semanticPlan?.family !== 'UI_GUIDANCE', 'shift status remains a data question');
  assert(!(shiftStatus.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE'), 'shift status does not fabricate navigation');

  const nonexistentShiftTarget = await shiftNavigationRequest('Hayali vardiya kontrolünü aç', 'm18-nonexistent-shift-target');
  assert(!(nonexistentShiftTarget.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE'), 'nonexistent shift target has no navigation action');
  assert(nonexistentShiftTarget.guidedTarget?.status !== GUIDED_TARGET_STATUSES.FOUND, 'nonexistent shift target has no guided target');
  assert(!/Planlama Merkezi ekranını aç|Vardiyalar ekranını aç/i.test(nonexistentShiftTarget.reply || ''), 'nonexistent shift target does not claim a real screen');

  // The real-user flow changes the browser route before the user confirms
  // entry.  Canonical continuation must verify that current screen and target
  // the live Vardiyalar surface instead of replaying the prior Planlama
  // Merkezi target or falling off-topic.
  const realisticFlowSession = 'm18-realistic-guided-shift-flow';
  const planningContext = {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', disabled: false }],
      activeTabs: [],
    },
  };
  const realisticStart = await shiftNavigationRequest('Bir vardiya oluşturalım', realisticFlowSession, planningContext);
  assert(realisticStart.semanticPlan?.family === 'UI_GUIDANCE', 'realistic shift flow starts as UI guidance');
  assert(realisticStart.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'realistic shift flow preserves CREATE_SHIFT');
  const enteredContext = {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Detayları göster', semanticType: 'disclosure', targetKey: 'company-shifts:detaylari-goster', disabled: false }],
      activeTabs: [],
    },
  };
  const entered = await shiftNavigationRequest('Girdim', realisticFlowSession, enteredContext);
  assert(entered.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'Girdim rejoins the active guided task');
  assert(entered.semanticPlan?.continuationBasePlan?.workflowIntent === 'CREATE_SHIFT', 'Girdim keeps the active CREATE_SHIFT task');
  assert(entered.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'Girdim resolves a real current Vardiyalar target');
  assert(entered.guidedTarget?.screenPath === '/company/shifts', 'Girdim uses the current Vardiyalar screen');
  assert(!(entered.quickActions || []).some((item) => item?.path === '/company'), 'Girdim does not retain a stale Planlama Merkezi navigation action');
  for (const message of ['Bulamadım', 'Devam et', 'Geri dön']) {
    const response = await shiftNavigationRequest(message, realisticFlowSession, enteredContext);
    assert(response.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', `${message} preserves the active realistic shift task`);
    assert(response.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, `${message} resolves a current Vardiyalar target`);
    assert(response.guidedTarget?.screenPath === '/company/shifts', `${message} stays grounded to Vardiyalar`);
    assert(!(response.quickActions || []).some((item) => item?.path === '/company'), `${message} does not replay a stale Planlama Merkezi route`);
  }

  const driverNavigation = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: { id: 918333, role: 'DRIVER', companyId: 10, roomId: 1 },
    screenContext: { path: '/driver/route', label: 'Rota', role: 'DRIVER', uiHints: { visibleButtons: [], activeTabs: [] } },
    message: 'vardiyalar nerde',
    authSessionId: 'm18-shift-navigation-driver-negative',
  });
  assert(driverNavigation.semanticPlan?.family === 'UI_GUIDANCE', 'unauthorized shift navigation remains a semantic guidance request');
  assert(!(driverNavigation.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE'), 'unauthorized shift navigation has no route action');
  assert(/bu rolde.*vardiyalar.*ekran/i.test(driverNavigation.reply || ''), 'unauthorized shift navigation explains the role boundary');

  const continuationSession = 'm18-shift-navigation-continuation';
  await shiftNavigationRequest('vardiyalar nerde', continuationSession);
  const shiftSurfaceContext = {
    path: '/company/shifts',
    label: 'Vardiyalar',
    role: 'COMPANY',
    uiHints: {
      visibleButtons: [{ label: 'Detayları göster', semanticType: 'disclosure', targetKey: 'company-shifts:detaylari-goster', disabled: false }],
      activeTabs: [],
    },
  };
  const firstExpansion = await shiftNavigationRequest('Devamını anlat', continuationSession, shiftSurfaceContext);
  const secondExpansion = await shiftNavigationRequest('Devamını anlat', continuationSession, shiftSurfaceContext);
  assert(firstExpansion.semanticPlan?.continuationBasePlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'first continuation preserves the active shift navigation task');
  assert(secondExpansion.semanticPlan?.continuationBasePlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'repeated continuation preserves the active shift navigation task');
  assert(secondExpansion.semanticPlan?.continuationDepth > firstExpansion.semanticPlan?.continuationDepth, 'repeated continuation advances canonical task progress');
  assert(firstExpansion.reply !== secondExpansion.reply, 'repeated continuation does not replay the settled result');
  assert(firstExpansion.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'first continuation resolves a real current shift target');
  assert(secondExpansion.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'repeated continuation re-resolves the real current shift target');

  // A later settled data result must not replace the active guided task.  The
  // task is conversation context only; route authorization is still resolved
  // anew from the current role and screen.
  const staleSettledSession = 'm18-shift-navigation-stale-settled';
  await shiftNavigationRequest('vardiyalar nerde', staleSettledSession);
  await shiftNavigationRequest('vardiya durumları ne', staleSettledSession, shiftSurfaceContext);
  const afterDataQuestion = await shiftNavigationRequest('Devamını anlat', staleSettledSession, shiftSurfaceContext);
  assert(afterDataQuestion.semanticPlan?.continuationBasePlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'a settled data answer cannot contaminate the active guided task');
  assert(afterDataQuestion.guidedTarget?.status === GUIDED_TARGET_STATUSES.FOUND, 'continuation after a data answer resolves the real current target');
}

await runProductionParityRegression();

console.log(JSON.stringify({
  check: 'copilot-ui-element-anchor-and-guided-highlight-01',
  found: found.status,
  missing: missing.status,
  unauthorized: unauthorized.status,
  stale: stale.status,
  prohibited: {
    nonexistentUiGuidanceCount: missing.status === GUIDED_TARGET_STATUSES.NOT_FOUND ? 0 : 1,
    unauthorizedGuidanceCount: unauthorized.status === GUIDED_TARGET_STATUSES.UNAUTHORIZED ? 0 : 1,
    criticalActionExecutionCount: 0,
  },
}));
