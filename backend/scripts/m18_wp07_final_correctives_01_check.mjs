#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import {
  commitCanonicalConversationState,
  getCanonicalConversationState,
} from '../src/ai/chat/canonicalConversationState.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { resolveCurrentSelection } from '../src/ai/chat/canonicalSemanticContext.js';
import { executeSemanticQueryPlan } from '../src/services/queryPlanExecutor.js';
import { resolveCopilotGuidedTarget } from '../src/ai/chat/copilotUiElementAnchor.js';
import { COMPANY as companyScreenCatalog } from '../src/ai/jobGuide/screenCatalog.roomCompany.js';
import { resolveFieldPrivacyPolicy } from '../src/ai/chat/fieldPrivacyPolicy.js';
import { shouldUseCurrentTargetRecoveryFallback } from '../src/ai/service.js';
import { buildAuthorizedProductAwarenessAnswer } from '../src/services/authorizedProductAwareness.js';

const user = { id: 980707, role: 'ROOM', roomId: 1, companyKind: 'ROOM' };

function shiftContext() {
  return {
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
    selectedEntityType: 'shift',
    selectedEntityId: 211,
    selectedEntity: { type: 'shift', id: 211, source: 'SCREEN_RECORD' },
  };
}

function offerContext(id) {
  return {
    path: '/room/offers',
    label: 'Teklifler',
    role: 'ROOM',
    selectedEntityType: 'offer',
    selectedEntityId: id,
    selectedEntity: { type: 'offer', id, source: 'SCREEN_RECORD' },
    uiHints: {
      semanticElements: [37, 36].map((offerId) => ({
        label: `Teklif #${offerId}`,
        targetKey: `room:offers:offer:${offerId}`,
        semanticId: `product:room:offer:${offerId}`,
        identitySource: 'CANONICAL',
        semanticType: 'disclosure',
      })),
    },
  };
}

function planFor(message, screenContext, conversationState = null) {
  const selectedEntity = screenContext.selectedEntity || null;
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user,
    selectedEntity,
    conversationState,
    screenContext,
  });
  const semanticPlan = resolveSemanticIntent({
    message,
    user,
    selectedEntity,
    conversationState,
    screenContext,
    canonicalRequest,
  });
  semanticPlan.canonicalRequest = canonicalRequest.request;
  return { canonicalRequest, semanticPlan };
}

function planForLiveServicePath(message, screenContext, conversationState = null) {
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user,
    conversationState,
    screenContext,
  });
  const semanticPlan = resolveSemanticIntent({
    message,
    user,
    conversationState,
    screenContext,
    canonicalRequest,
  });
  semanticPlan.canonicalRequest = canonicalRequest.request;
  return { canonicalRequest, semanticPlan };
}

async function execute(plan) {
  return executeSemanticQueryPlan({
    plan,
    allowedDomains: ['SHIFTS', 'DRIVERS'],
    readDomain: async (domain, { entities }) => ({
      domain,
      count: entities.length,
      facts: entities.map((entity) => ({
        entityType: entity.type,
        shiftId: entity.id,
        driverId: 301,
        driverName: 'Driver One',
        driver: 'Driver One',
        status: 'ACTIVE',
      })),
    }),
  });
}

const driverContext = shiftContext();
const driver = planFor('Bu vardiyadaki sürücü kim?', driverContext);
const driverExecution = await execute(driver.semanticPlan);
assert.equal(
  driverExecution.reply,
  'Vardiya #211 için bağlı sürücü: Sürücü Driver One.',
  'A driver relation must not repeat the same relation target as a field sentence',
);

const driverWithDistinctField = {
  ...driver.semanticPlan,
  requestedFields: [
    ...(driver.semanticPlan.requestedFields || []),
    { key: 'STATUS', domain: 'SHIFTS' },
  ],
};
const distinctExecution = await execute(driverWithDistinctField);
assert.match(distinctExecution.reply, /bağlı sürücü: Sürücü Driver One/u);
assert.match(distinctExecution.reply, /durum: ACTIVE/u);

const authSessionId = `wp07-final-correctives-${Date.now()}`;
const firstContext = offerContext(37);
const firstState = getCanonicalConversationState({ user, screenContext: firstContext, authSessionId });
const first = planFor('Bu teklifin tutarı nedir?', firstContext, firstState);
commitCanonicalConversationState({
  user,
  screenContext: firstContext,
  message: 'Bu teklifin tutarı nedir?',
  payload: { semanticPlan: first.semanticPlan, reply: 'Teklif #37 için tutar yetkili kayıtta bulundu.' },
  authSessionId,
});

const secondContext = offerContext(36);
const secondState = getCanonicalConversationState({ user, screenContext: secondContext, authSessionId });
const second = planFor('Bu teklifin tutarı nedir?', secondContext, secondState);
commitCanonicalConversationState({
  user,
  screenContext: secondContext,
  message: 'Bu teklifin tutarı nedir?',
  payload: { semanticPlan: second.semanticPlan, reply: 'Teklif #36 için tutar yetkili kayıtta bulundu.' },
  authSessionId,
});

const previousState = getCanonicalConversationState({ user, screenContext: secondContext, authSessionId });
assert.ok(
  previousState.recentEntityHistory?.some((entity) => entity.type === 'offer' && Number(entity.id) === 37),
  'same-auth offer history must retain the previous authorized offer',
);

const previous = planFor('Önceki teklife dön.', secondContext, previousState);
assert.equal(previous.semanticPlan.entity?.type, 'offer');
assert.equal(Number(previous.semanticPlan.entity?.id), 37);
assert.ok(
  previous.canonicalRequest.request.candidateEntityRefs?.some((candidate) => candidate.type === 'OFFER' && Number(candidate.id) === 37),
  'the previous offer must remain the canonical target candidate',
);
const previousTarget = resolveCopilotGuidedTarget({
  user,
  screenContext: secondContext,
  conversationState: previousState,
  semanticPlan: previous.semanticPlan,
  message: 'Önceki teklife dön.',
});
assert.equal(previousTarget.status, 'FOUND');
assert.equal(previousTarget.targetKey, 'room:offers:offer:37');
assert.equal(
  previousTarget.safeAction,
  'NAVIGATE',
  'restoring a previous offer must activate the existing record-bound target so the UI selection is restored',
);

// A route change with no live selected record must not revive the previous
// offer from the same-auth conversation history. The canonical state exposes
// the prior committed surface separately so semantic context can suppress it.
const routeChangedContext = { path: '/room/operation-health', label: 'Operasyon Sağlığı', role: 'ROOM' };
const routeChangedState = getCanonicalConversationState({ user, screenContext: routeChangedContext, authSessionId });
assert.equal(routeChangedState.lastScreenPath, '/room/offers', 'canonical state retains the prior committed screen for route-change invalidation');
const routeChangedSelection = resolveCurrentSelection({
  screenContext: routeChangedState.screenContext,
  conversationState: routeChangedState,
});
assert.equal(routeChangedSelection.entity, null, 'route changes without a live selection suppress historical record reuse');
assert.equal(routeChangedSelection.historicalSuppressed, true, 'route changes mark stale selected-record history as suppressed');

const livePathPrevious = planForLiveServicePath('Önceki teklife dön.', secondContext, previousState);
assert.ok(
  livePathPrevious.canonicalRequest.request.candidateEntityRefs?.some((candidate) => candidate.type === 'OFFER' && Number(candidate.id) === 37),
  'the live service path must use the previous record, not the current selection, as its target candidate',
);

const relationVariant = planFor('Sözleşmeden çıkan vardiyaları açar mısın?', shiftContext());
assert.equal(relationVariant.canonicalRequest.request.operation, 'LOOK_UP_RELATION');
assert.equal(relationVariant.canonicalRequest.request.capability, 'VIEW_SHIFTS');
assert.equal(relationVariant.semanticPlan.family, 'RELATION_LOOKUP');
assert.equal(relationVariant.semanticPlan.roleHelpIntent, false);

// COMPANY's selected-shift cause question must use the authorized shift fact
// instead of falling through to the generic field-lookup clarification.
const companyUser = { id: 980708, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
const companyShiftContext = {
  path: '/company/shifts',
  label: 'Vardiyalar',
  role: 'COMPANY',
  selectedEntityType: 'shift',
  selectedEntityId: 261,
  selectedEntity: { type: 'shift', id: 261, source: 'SCREEN_RECORD' },
};
const companyCauseMessage = 'Bu vardiya neden başlayamıyor?';
const companyCanonicalRequest = resolveCanonicalConversationRequest({
  message: companyCauseMessage,
  user: companyUser,
  selectedEntity: companyShiftContext.selectedEntity,
  screenContext: companyShiftContext,
});
const companyCausePlan = resolveSemanticIntent({
  message: companyCauseMessage,
  user: companyUser,
  selectedEntity: companyShiftContext.selectedEntity,
  screenContext: companyShiftContext,
  canonicalRequest: companyCanonicalRequest,
});
companyCausePlan.canonicalRequest = companyCanonicalRequest.request;
const companyCauseExecution = await executeSemanticQueryPlan({
  plan: companyCausePlan,
  allowedDomains: ['SHIFTS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      entityType: entity.type,
      id: entity.id,
      status: 'DONE',
      vehiclePlate: '34ABC123',
      driverName: 'Driver One',
      stopCount: 2,
    })),
  }),
});
assert.match(companyCauseExecution.reply, /Vardiya #261/u);
assert.match(companyCauseExecution.reply, /tamamlandı durumunda/u);
assert.match(companyCauseExecution.reply, /başlatılmayı bekleyen aktif vardiya değil/u);
assert.doesNotMatch(companyCauseExecution.reply, /başlangıç\/bitiş saati, durum veya başka alanı netleştir/u);

const companyAssignmentMessage = 'Atama eksik mi?';
const companyAssignmentCanonicalRequest = resolveCanonicalConversationRequest({
  message: companyAssignmentMessage,
  user: companyUser,
  selectedEntity: { type: 'shift', id: 317, source: 'SCREEN_RECORD' },
  screenContext: {
    ...companyShiftContext,
    selectedEntityId: 317,
    selectedEntity: { type: 'shift', id: 317, source: 'SCREEN_RECORD' },
  },
});
const companyAssignmentPlan = resolveSemanticIntent({
  message: companyAssignmentMessage,
  user: companyUser,
  selectedEntity: { type: 'shift', id: 317, source: 'SCREEN_RECORD' },
  screenContext: {
    ...companyShiftContext,
    selectedEntityId: 317,
    selectedEntity: { type: 'shift', id: 317, source: 'SCREEN_RECORD' },
  },
  canonicalRequest: companyAssignmentCanonicalRequest,
});
companyAssignmentPlan.canonicalRequest = companyAssignmentCanonicalRequest.request;
const companyAssignmentExecution = await executeSemanticQueryPlan({
  plan: companyAssignmentPlan,
  allowedDomains: ['SHIFTS', 'OPERATIONS'],
  readDomain: async (domain, { entities }) => ({
    domain,
    count: entities.length,
    facts: entities.map((entity) => ({
      entityType: entity.type,
      id: entity.id,
      status: 'REJECTED',
      vehiclePlate: null,
      driverName: null,
      stopCount: 2,
    })),
  }),
});
assert.match(companyAssignmentExecution.reply, /Vardiya #317/u);
assert.match(companyAssignmentExecution.reply, /araç ataması eksik|sürücü ataması eksik/u);
assert.doesNotMatch(companyAssignmentExecution.reply, /mevcut ürün kapsamının dışında|başlangıç\/bitiş saati, durum veya başka alanı netleştir/u);

const companyUnselectedAssignmentContext = {
  path: '/company/shifts',
  label: 'Vardiyalar',
  role: 'COMPANY',
};
const companyUnselectedAssignmentMessage = 'Atama eksik mi?';
const companyUnselectedAssignmentCanonicalRequest = resolveCanonicalConversationRequest({
  message: companyUnselectedAssignmentMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyUnselectedAssignmentContext,
});
assert.equal(companyUnselectedAssignmentCanonicalRequest.request.ambiguity?.reason, 'SHIFT_RECORD_NOT_SELECTED');
const companyUnselectedAssignmentPlan = resolveSemanticIntent({
  message: companyUnselectedAssignmentMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyUnselectedAssignmentContext,
  canonicalRequest: companyUnselectedAssignmentCanonicalRequest,
});
assert.equal(companyUnselectedAssignmentPlan.clarificationNeed, 'CANONICAL_REQUEST_UNRESOLVED');
assert.equal(companyUnselectedAssignmentPlan.typedRequest.ambiguity, 'SHIFT_RECORD_NOT_SELECTED');
const companyUnselectedAssignmentExecution = await executeSemanticQueryPlan({
  plan: companyUnselectedAssignmentPlan,
  allowedDomains: ['SHIFTS'],
  readDomain: async () => ({ domain: 'SHIFTS', count: 0, facts: [] }),
});
assert.match(companyUnselectedAssignmentExecution.reply, /hangi kayıt|vardiya.*seç/iu);
assert.doesNotMatch(companyUnselectedAssignmentExecution.reply, /ürün kapsamının dışında/u);

// A COMPANY selected-shift personnel question must not invent a count from
// the shift card, which has no personnel list. It must preserve the shift and
// expose the real read-only usage/personnel surface.
const companyPersonnelStatusMessage = 'Bu vardiyanın personel durumunu anlat.';
const companyPersonnelStatusContext = {
  path: '/company/shifts',
  label: 'Vardiyalar',
  role: 'COMPANY',
  selectedEntityType: 'shift',
  selectedEntityId: 301,
  selectedLabel: 'Vardiya #301',
  selectedSummary: 'Vardiya #301 • Onaylandı • Sözleşme #196 • Araç 34ABC123 • Sürücü Driver One • 2 durak',
  selectedEntity: { type: 'shift', id: 301, source: 'SCREEN_RECORD' },
};
const companyPersonnelStatusRequest = resolveCanonicalConversationRequest({
  message: companyPersonnelStatusMessage,
  user: companyUser,
  selectedEntity: companyPersonnelStatusContext.selectedEntity,
  screenContext: companyPersonnelStatusContext,
});
const companyPersonnelStatusPlan = resolveSemanticIntent({
  message: companyPersonnelStatusMessage,
  user: companyUser,
  selectedEntity: companyPersonnelStatusContext.selectedEntity,
  screenContext: companyPersonnelStatusContext,
  canonicalRequest: companyPersonnelStatusRequest,
});
companyPersonnelStatusPlan.canonicalRequest = companyPersonnelStatusRequest.request;
const companyPersonnelStatusResponse = buildChatHelpResponse({
  entityType: 'shift',
  entityId: 301,
  user: companyUser,
  message: companyPersonnelStatusMessage,
  context: {
    type: 'shift',
    id: 301,
    status: 'APPROVED',
    vehicle: { plate: '34ABC123' },
    driver: { fullName: 'Driver One' },
    vehicleId: 1,
    driverId: 1,
    stopCount: 2,
    openOfferCount: 0,
  },
  scope: { role: 'COMPANY', roleMode: 'OPERATIONS' },
  conversationState: null,
  semanticPlan: companyPersonnelStatusPlan,
  screenContext: companyPersonnelStatusContext,
  screenDefinition: { path: '/company/shifts', label: 'Vardiyalar', screenMenus: [] },
});
assert.match(companyPersonnelStatusResponse.reply, /personel listesi doğrudan görünmüyor/u);
assert.doesNotMatch(companyPersonnelStatusResponse.reply, /personel sayısı\s*\d+/iu);
assert.ok(
  companyPersonnelStatusResponse.quickActions?.some((action) => (
    action.label === 'Personel ve rota ayrıntısını aç'
    && /\/shifts$/u.test(action.routeKey)
    && Number(action.routeParams?.focusShiftId) === 301
    && action.routeParams?.focusTask === 'usage'
  )),
  'selected COMPANY shift personnel guidance must open the real usage/personnel surface with the selected shift',
);

// The live `/api/ai/copilot` path uses authorized product awareness rather
// than the legacy help composer. Keep the same selected-shift personnel
// contract covered at that canonical owner too.
const companyPersonnelAwareness = await buildAuthorizedProductAwarenessAnswer({
  user: companyUser,
  message: companyPersonnelStatusMessage,
  screenContext: companyPersonnelStatusContext,
  conversationState: null,
  semanticPlan: companyPersonnelStatusPlan,
});
assert.match(companyPersonnelAwareness.reply, /personel listesi doğrudan görünmüyor/u);
assert.doesNotMatch(companyPersonnelAwareness.reply, /personel sayısı\s*\d+/iu);
assert.equal(companyPersonnelAwareness.navigationTarget?.path, '/company/shifts');
assert.equal(Number(companyPersonnelAwareness.navigationTarget?.routeParams?.focusShiftId), 301);
assert.equal(companyPersonnelAwareness.navigationTarget?.routeParams?.focusTask, 'usage');

// The live authorized-product path must explain a selected agreement's
// low SeferPuanı from the same risk and missing-signal evidence shown by the
// agreement card; the generic agreement status is not a sufficient reason.
const companyAgreementScoreMessage = 'Bu sözleşmenin SeferPuanı neden düşük?';
const companyAgreementScoreContext = {
  path: '/company/agreements',
  label: 'Sözleşmeler',
  role: 'COMPANY',
  selectedEntityType: 'agreement',
  selectedEntityId: 202,
  selectedLabel: 'Sözleşme #202',
  selectedEntity: { type: 'agreement', id: 202, source: 'SCREEN_RECORD' },
};
const companyAgreementScoreRequest = resolveCanonicalConversationRequest({
  message: companyAgreementScoreMessage,
  user: companyUser,
  selectedEntity: companyAgreementScoreContext.selectedEntity,
  screenContext: companyAgreementScoreContext,
});
const companyAgreementScorePlan = resolveSemanticIntent({
  message: companyAgreementScoreMessage,
  user: companyUser,
  selectedEntity: companyAgreementScoreContext.selectedEntity,
  screenContext: companyAgreementScoreContext,
  canonicalRequest: companyAgreementScoreRequest,
});
companyAgreementScorePlan.canonicalRequest = companyAgreementScoreRequest.request;
const companyAgreementScoreAwareness = await buildAuthorizedProductAwarenessAnswer({
  user: companyUser,
  message: companyAgreementScoreMessage,
  screenContext: companyAgreementScoreContext,
  conversationState: null,
  semanticPlan: companyAgreementScorePlan,
});
assert.match(companyAgreementScoreAwareness.reply, /SeferPuanı:? 1\.44 \/ 5/u);
assert.match(companyAgreementScoreAwareness.reply, /risk nedenleri:/u);
assert.match(companyAgreementScoreAwareness.reply, /eksik sinyaller:/u);
assert.doesNotMatch(companyAgreementScoreAwareness.reply, /Gerekçe: onaylandı\.?$/u);

// A direct COMPANY request to show the current Operations Panel must resolve
// to the real role-owned surface instead of falling into generic clarification.
const companyOperationsMessage = 'Operasyon panelini göster.';
const companyOperationsContext = {
  path: '/company/operations',
  label: 'Operasyon Paneli',
  role: 'COMPANY',
  surfaceRole: 'COMPANY',
};
const companyOperationsRequest = resolveCanonicalConversationRequest({
  message: companyOperationsMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyOperationsContext,
});
const companyOperationsPlan = resolveSemanticIntent({
  message: companyOperationsMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyOperationsContext,
  canonicalRequest: companyOperationsRequest,
});
companyOperationsPlan.canonicalRequest = companyOperationsRequest.request;
assert.equal(companyOperationsPlan.family, 'UI_GUIDANCE');
assert.equal(companyOperationsPlan.clarificationNeed, null);
assert.equal(companyOperationsPlan.workflowIntent, 'OPEN_OPERATIONS_PANEL_SURFACE');
const companyOperationsAwareness = await buildAuthorizedProductAwarenessAnswer({
  user: companyUser,
  message: companyOperationsMessage,
  screenContext: companyOperationsContext,
  conversationState: null,
  semanticPlan: companyOperationsPlan,
});
assert.match(companyOperationsAwareness.reply, /Operasyon Paneli ekranındasın/u);
assert.equal(companyOperationsAwareness.navigationTarget, null);

// A COMPANY request to find/compare offers is a collection/surface task when
// no offer id is named. It must not inherit the selected agreement and send
// the user to the wrong Sözleşmeler surface.
const companyOfferCompareMessage = 'Teklifleri bulup karşılaştırmak istiyorum.';
const companyOfferCompareContext = {
  path: '/company/commercial-flow',
  label: 'Ticari Akışım',
  role: 'COMPANY',
  surfaceRole: 'COMPANY',
  selectedEntityType: 'agreement',
  selectedEntityId: 202,
  selectedLabel: 'Sözleşme #202',
  selectedEntity: { type: 'agreement', id: 202, source: 'SCREEN_RECORD' },
};
const companyOfferCompareRequest = resolveCanonicalConversationRequest({
  message: companyOfferCompareMessage,
  user: companyUser,
  selectedEntity: companyOfferCompareContext.selectedEntity,
  screenContext: companyOfferCompareContext,
});
const companyOfferComparePlan = resolveSemanticIntent({
  message: companyOfferCompareMessage,
  user: companyUser,
  selectedEntity: companyOfferCompareContext.selectedEntity,
  screenContext: companyOfferCompareContext,
  canonicalRequest: companyOfferCompareRequest,
});
companyOfferComparePlan.canonicalRequest = companyOfferCompareRequest.request;
assert.equal(companyOfferComparePlan.family, 'UI_GUIDANCE');
assert.equal(companyOfferComparePlan.workflowIntent, 'OPEN_SHIFT_SURFACE');
assert.equal(companyOfferComparePlan.entities.length, 0);
const companyOfferCompareAwareness = await buildAuthorizedProductAwarenessAnswer({
  user: companyUser,
  message: companyOfferCompareMessage,
  screenContext: companyOfferCompareContext,
  conversationState: null,
  semanticPlan: companyOfferComparePlan,
});
assert.equal(companyOfferCompareAwareness.navigationTarget?.path, '/company/shifts');
assert.doesNotMatch(companyOfferCompareAwareness.reply, /Sözleşmeler ekranına/u);

// COMPANY selected-agreement chips must stay bound to the visible agreement
// record. Payment/source fields must not fall through to a generic risk reply,
// and SeferPuanı must expose its evidence instead of an ungrounded summary.
const selectedAgreement = { type: 'agreement', id: 202, source: 'SCREEN_RECORD' };
const selectedAgreementFacts = {
  entityType: 'agreement',
  id: 202,
  paymentModeText: 'Kapalı',
  sourceStatusText: 'Kaynak kaydı mevcut',
  seferScoreText: '1.44 / 5',
  seferScoreStatusText: 'Kritik',
  seferScoreRiskReasons: ['Şikâyet / issue riski var.'],
  seferScoreMissingSignals: ['Zamanında hizmet', 'Görev tamamlama'],
};
const selectedAgreementPaymentExecution = await executeSemanticQueryPlan({
  plan: {
    family: 'RISK_RANKING',
    role: 'COMPANY',
    scopeTarget: 'SELECTED_RECORD',
    entity: selectedAgreement,
    entities: [selectedAgreement],
    requestedDomains: ['AGREEMENTS'],
    requestedFields: [{ key: 'PAYMENT_MODE', domain: 'AGREEMENTS' }],
  },
  allowedDomains: ['AGREEMENTS'],
  readDomain: async (domain) => ({ domain, count: 1, facts: [selectedAgreementFacts] }),
});
assert.match(selectedAgreementPaymentExecution.reply, /Sözleşme #202/u);
assert.match(selectedAgreementPaymentExecution.reply, /ödeme modeli: Kapalı/u);
assert.doesNotMatch(selectedAgreementPaymentExecution.reply, /genel risk|risk sinyali görünmüyor/u);

const selectedAgreementScoreExecution = await executeSemanticQueryPlan({
  plan: {
    family: 'RISK_RANKING',
    role: 'COMPANY',
    scopeTarget: 'SELECTED_RECORD',
    entity: selectedAgreement,
    entities: [selectedAgreement],
    requestedDomains: ['AGREEMENTS'],
    requestedFields: [{ key: 'SEFER_SCORE', domain: 'AGREEMENTS' }],
  },
  allowedDomains: ['AGREEMENTS'],
  readDomain: async (domain) => ({ domain, count: 1, facts: [selectedAgreementFacts] }),
});
assert.match(selectedAgreementScoreExecution.reply, /Sözleşme #202 için SeferPuanı 1\.44 \/ 5/u);
assert.match(selectedAgreementScoreExecution.reply, /Şikâyet \/ issue riski var/u);
assert.match(selectedAgreementScoreExecution.reply, /Eksik sinyaller: Zamanında hizmet, Görev tamamlama/u);
assert.match(selectedAgreementScoreExecution.reply, /salt-okunur önizlemedir/u);
assert.doesNotMatch(selectedAgreementScoreExecution.reply, /var\.,|\.{2}/u, 'risk evidence must not render doubled punctuation');

const selectedAgreementContinuationPlan = {
  family: 'CONTINUE_CURRENT_REASONING',
  continuationOfFamily: 'SCREEN_CONTEXT',
  continuationAction: 'CONTINUE',
  continuationDepth: 1,
  role: 'COMPANY',
  entity: selectedAgreement,
  entities: [selectedAgreement],
  requestedDomains: ['AGREEMENTS'],
  requestedFields: [],
};
const selectedAgreementContinuationExecution = await executeSemanticQueryPlan({
  plan: selectedAgreementContinuationPlan,
  allowedDomains: ['AGREEMENTS'],
  readDomain: async (domain) => ({
    domain,
    count: 1,
    facts: [{ entityType: 'agreement', id: 202, startAtText: '15.12.2026 06:30', stopCount: 2, passengerCount: 0, amountText: '-' }],
  }),
});
assert.match(selectedAgreementContinuationExecution.reply, /sonraki adım/u);
assert.match(selectedAgreementContinuationExecution.reply, /Tamamlanma adımlarını gör/u);
assert.doesNotMatch(selectedAgreementContinuationExecution.reply, /amount: -/u);

const selectedAgreementBackExecution = await executeSemanticQueryPlan({
  plan: { ...selectedAgreementContinuationPlan, continuationAction: 'BACK', continuationDepth: 2 },
  allowedDomains: ['AGREEMENTS'],
  readDomain: async (domain) => ({ domain, count: 1, facts: [{ entityType: 'agreement', id: 202 }] }),
});
assert.match(selectedAgreementBackExecution.reply, /önceki adıma döndüm/u);
assert.match(selectedAgreementBackExecution.reply, /Sözleşme #202/u);

// COMPANY finance guidance must remain in the COMPANY tenant and role scope;
// it must not advertise a ROOM-only finance destination.
const companyFinanceScreen = companyScreenCatalog.find((entry) => entry.path === '/company/financial-operations');
assert.ok(companyFinanceScreen, 'COMPANY finance screen must remain in the canonical catalog');
assert.doesNotMatch(companyFinanceScreen.nextStep, /room|oda finans/iu);
assert.ok(companyFinanceScreen.nextStep.includes('aynı şirket'), 'COMPANY finance next step must preserve company scope');
assert.ok(companyFinanceScreen.screenMenus.every((entry) => entry.path !== '/room/financial-operations'));

const companyPersonelAccessScreen = companyScreenCatalog.find((entry) => entry.path === '/company/personel-access');
assert.ok(companyPersonelAccessScreen, 'COMPANY personel-access screen must have canonical guidance metadata');
assert.equal(companyPersonelAccessScreen.id, 2120);
assert.match(companyPersonelAccessScreen.nextStep, /aynı şirket/iu);
assert.ok(companyPersonelAccessScreen.screenMenus.some((entry) => entry.path === '/company/access-links'));
assert.ok(companyPersonelAccessScreen.screenMenus.some((entry) => entry.path === '/company/shifts'));

// The COMPANY-owned Personel Erişimi surface must not be mistaken for the
// PERSONEL role simply because the Turkish noun is shared by both concepts.
// This assertion intentionally captures the D-Level reproduction before the
// canonical role-target disambiguation is corrected.
const companyPersonnelAccessMessage = 'Personel erişimlerini göster.';
const companyPersonnelAccessContext = {
  path: '/company/personel-access',
  label: 'Personel erişimi',
  role: 'COMPANY',
  surfaceRole: 'COMPANY',
  uiHints: {
    visibleButtons: [{
      label: 'Personel erişimi oluştur',
      targetKey: 'company:personel-access:create',
      semanticType: 'button',
      identitySource: 'CANONICAL',
    }],
  },
};
const companyPersonnelAccessRequest = resolveCanonicalConversationRequest({
  message: companyPersonnelAccessMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyPersonnelAccessContext,
});
const companyPersonnelAccessPlan = resolveSemanticIntent({
  message: companyPersonnelAccessMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyPersonnelAccessContext,
  canonicalRequest: companyPersonnelAccessRequest,
});
companyPersonnelAccessPlan.canonicalRequest = companyPersonnelAccessRequest.request;
assert.notEqual(companyPersonnelAccessPlan.roleTargetResolution, 'UNAUTHORIZED');
assert.equal(companyPersonnelAccessPlan.workflowIntent, 'OPEN_PERSONNEL_ACCESS_SURFACE');
const companyPersonnelAccessAwareness = await buildAuthorizedProductAwarenessAnswer({
  user: companyUser,
  message: companyPersonnelAccessMessage,
  screenContext: companyPersonnelAccessContext,
  conversationState: null,
  semanticPlan: companyPersonnelAccessPlan,
});
assert.equal(companyPersonnelAccessAwareness.navigationTarget, null, 'the current COMPANY personel-access screen must not claim a redundant route change');
assert.match(companyPersonnelAccessAwareness.reply, /Personel erişimi ekranındasın/u);

const companyPersonnelAccessOffSurfaceContext = {
  ...companyPersonnelAccessContext,
  path: '/company',
  label: 'Planlama Merkezi',
};
const companyPersonnelAccessOffSurfaceRequest = resolveCanonicalConversationRequest({
  message: companyPersonnelAccessMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyPersonnelAccessOffSurfaceContext,
});
const companyPersonnelAccessOffSurfacePlan = resolveSemanticIntent({
  message: companyPersonnelAccessMessage,
  user: companyUser,
  selectedEntity: null,
  screenContext: companyPersonnelAccessOffSurfaceContext,
  canonicalRequest: companyPersonnelAccessOffSurfaceRequest,
});
companyPersonnelAccessOffSurfacePlan.canonicalRequest = companyPersonnelAccessOffSurfaceRequest.request;
const companyPersonnelAccessOffSurfaceAwareness = await buildAuthorizedProductAwarenessAnswer({
  user: companyUser,
  message: companyPersonnelAccessMessage,
  screenContext: companyPersonnelAccessOffSurfaceContext,
  conversationState: null,
  semanticPlan: companyPersonnelAccessOffSurfacePlan,
});
assert.equal(companyPersonnelAccessOffSurfaceAwareness.navigationTarget?.path, '/company/personel-access');
const companyPersonnelAccessOffSurfaceTarget = resolveCopilotGuidedTarget({
  user: companyUser,
  message: companyPersonnelAccessMessage,
  conversationState: null,
  semanticPlan: companyPersonnelAccessOffSurfacePlan,
  screenContext: {
    ...companyPersonnelAccessOffSurfaceContext,
    uiHints: {
      visibleButtons: [
        { label: 'Personel Erişimi', targetKey: 'company:personel-access', identitySource: 'CANONICAL', semanticType: 'button' },
        { label: 'Ayrıntılı çalışma alanını göster', targetKey: 'disclosure:ayrıntılı çalışma alanını göster', identitySource: 'LEGACY_LABEL', semanticType: 'disclosure' },
      ],
    },
  },
});
assert.equal(companyPersonnelAccessOffSurfaceTarget.targetKey, 'company:personel-access', 'personel access navigation target must not be replaced by a nearby disclosure');
assert.equal(companyPersonnelAccessOffSurfaceTarget.safeAction, 'NAVIGATE', 'personel access navigation uses the safe route action');
assert.notEqual(companyPersonnelAccessOffSurfaceTarget.targetKey, 'disclosure:ayrıntılı çalışma alanını göster');

const gpsStatusPrivacy = resolveFieldPrivacyPolicy({
  user: companyUser,
  message: 'Sürücünün telefon GPS’i devrede mi?',
  plan: { family: 'DRIVER_PHONE_GPS' },
});
assert.equal(gpsStatusPrivacy.status, 'ALLOW', 'GPS status must remain a safe summary, not raw personal data');
const rawPhonePrivacy = resolveFieldPrivacyPolicy({
  user: companyUser,
  message: 'Sürücünün telefon numarasını göster.',
  plan: { family: 'DRIVER_PHONE_GPS' },
});
assert.equal(rawPhonePrivacy.status, 'DENY', 'raw phone number disclosure must remain blocked');
const kvkkVisibilityRequest = resolveCanonicalConversationRequest({
  message: 'Bu rolde ne görünür?',
  user: companyUser,
  selectedEntity: null,
  screenContext: { path: '/shared/kvkk', label: 'KVKK', role: 'COMPANY' },
});
assert.equal(kvkkVisibilityRequest.canonicalShape.screenKnowledgeKind, 'KVKK_VISIBILITY');

const companyFinancialCostRequest = resolveCanonicalConversationRequest({
  message: "Sözleşme #202'nin servis maliyeti neye göre hesaplandı?",
  user: companyUser,
  selectedEntity: null,
  screenContext: { path: '/company/financial-operations', label: 'Bütçe ve Servis Maliyeti', role: 'COMPANY' },
});
assert.equal(companyFinancialCostRequest.request.domain, 'FINANCE');
assert.equal(companyFinancialCostRequest.canonicalShape.taskType, 'RISK');
assert.equal(companyFinancialCostRequest.canonicalShape.scopeTarget, 'CURRENT_SCREEN');

const companyGuidedFieldHelpRequest = resolveCanonicalConversationRequest({
  message: 'Bu alanı nasıl dolduracağım?',
  user: companyUser,
  selectedEntity: null,
  conversationState: null,
  screenContext: {
    path: '/company',
    label: 'Planlama Merkezi',
    role: 'COMPANY',
    uiHints: {
      workflowState: {
        workflowId: 'COMPANY_GUIDED_NEW_PLAN',
        activeStepOrdinal: 1,
        currentTargetKey: '/company:button:Konumumu al',
        currentTargetLabel: 'Konumumu al',
        source: 'LIVE_UI',
      },
      modalTitles: ['Rehberli Mod → Yeni Plan'],
      visibleButtons: [
        { label: 'Konumumu al', targetKey: '/company:button:Konumumu al', identitySource: 'CANONICAL' },
        { label: 'Adresten bul', targetKey: '/company:button:Adresten bul', identitySource: 'CANONICAL' },
        { label: 'İleri', targetKey: '/company:button:İleri', identitySource: 'CANONICAL' },
      ],
      semanticElements: [
        { semanticType: 'field', label: 'Adresten konum al', targetKey: '/company:field:address', identitySource: 'CANONICAL' },
      ],
    },
  },
});
assert.equal(companyGuidedFieldHelpRequest.request.operation, 'EXPLAIN_CURRENT_TARGET');
assert.equal(companyGuidedFieldHelpRequest.canonicalShape.taskType, 'EXPLAIN_CURRENT_TARGET');
assert.equal(companyGuidedFieldHelpRequest.canonicalShape.currentTargetExplanationIntent, true);
const companyGuidedFieldHelpPlan = resolveSemanticIntent({
  message: 'Bu alanı nasıl dolduracağım?',
  user: companyUser,
  conversationState: null,
  screenContext: companyGuidedFieldHelpRequest.canonicalShape.uiContext,
  canonicalRequest: companyGuidedFieldHelpRequest,
});
const companyGuidedFieldHelpResponse = buildChatHelpResponse({
  entityType: 'screen',
  entityId: 2101,
  user: companyUser,
  message: 'Bu alanı nasıl dolduracağım?',
  scope: { role: 'COMPANY', roleMode: 'SIMPLE' },
  conversationState: null,
  semanticPlan: companyGuidedFieldHelpPlan,
  screenContext: {
    label: 'Planlama Merkezi',
    uiHints: {
      modalTitles: ['Rehberli Mod → Yeni Plan'],
      visibleButtons: [
        { label: 'Konumumu al' },
        { label: 'Adresten bul' },
        { label: 'İleri' },
      ],
      workflowState: {
        workflowId: 'COMPANY_GUIDED_NEW_PLAN',
        activeStepOrdinal: 1,
        currentTargetKey: '/company:button:Konumumu al',
        currentTargetLabel: 'Konumumu al',
      },
    },
  },
});
assert.match(companyGuidedFieldHelpResponse.reply, /Konumumu al/u);
assert.match(companyGuidedFieldHelpResponse.reply, /Adresten bul/u);
assert.match(companyGuidedFieldHelpResponse.reply, /İleri/u);
assert.equal(
  shouldUseCurrentTargetRecoveryFallback({
    message: 'Bu alanı nasıl dolduracağım?',
    semanticPlan: { currentTargetRecoveryIntent: true },
  }),
  false,
);
assert.equal(
  shouldUseCurrentTargetRecoveryFallback({
    message: 'Bulamadım.',
    semanticPlan: { currentTargetRecoveryIntent: true },
  }),
  true,
);

const companyExcelUser = { id: 980708, role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' };
const companyGuidedStepOneContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    workflowState: {
      workflowId: 'COMPANY_GUIDED_NEW_PLAN',
      activeStepOrdinal: 1,
      currentTargetKey: '/company:button:Konumumu al',
      currentTargetLabel: 'Konumumu al',
      source: 'LIVE_UI',
    },
    visibleButtons: [
      { label: 'Konumumu al', targetKey: '/company:button:Konumumu al', identitySource: 'CANONICAL' },
      { label: 'Adresten bul', identitySource: 'LEGACY_LABEL' },
      { label: 'İleri', identitySource: 'LEGACY_LABEL' },
    ],
  },
};
const companyExcelCanonicalRequest = resolveCanonicalConversationRequest({
  message: 'Personellerimi Excel\'den eklemek istiyorum.',
  user: companyExcelUser,
  conversationState: null,
  screenContext: companyGuidedStepOneContext,
});
const companyExcelPlan = resolveSemanticIntent({
  message: 'Personellerimi Excel\'den eklemek istiyorum.',
  user: companyExcelUser,
  conversationState: null,
  screenContext: companyGuidedStepOneContext,
  canonicalRequest: companyExcelCanonicalRequest,
});
assert.equal(companyExcelPlan.capabilityIntent, 'IMPORT_PERSONNEL');
assert.equal(companyExcelPlan.workflowStepReference?.key, 'PERSONNEL_STOPS');

const companySelectedShiftContext = {
  path: '/company/shifts',
  label: 'Vardiyalar',
  role: 'COMPANY',
  selectedEntityType: 'SHIFT',
  selectedEntityId: 301,
  selectedEntity: { type: 'shift', id: 301, source: 'SCREEN_RECORD' },
  uiHints: {
    visibleButtons: [
      { label: 'Operasyon Kaydı', targetKey: 'company:shift:301:operations', identitySource: 'CANONICAL' },
      { label: 'Detayları göster', identitySource: 'LEGACY_LABEL' },
    ],
  },
};
const companySelectedShiftImportCanonicalRequest = resolveCanonicalConversationRequest({
  message: 'Bu vardiyada personelleri Excel\'den eklemek istiyorum.',
  user: companyExcelUser,
  conversationState: null,
  screenContext: companySelectedShiftContext,
});
const companySelectedShiftImportPlan = resolveSemanticIntent({
  message: 'Bu vardiyada personelleri Excel\'den eklemek istiyorum.',
  user: companyExcelUser,
  conversationState: null,
  screenContext: companySelectedShiftContext,
  canonicalRequest: companySelectedShiftImportCanonicalRequest,
});
assert.notEqual(companySelectedShiftImportPlan.workflowIntent, 'CREATE_SHIFT');
assert.notEqual(companySelectedShiftImportPlan.family, 'UI_GUIDANCE');

const companySelectedShiftAgreementContext = {
  ...companySelectedShiftContext,
  selectedRelatedEntityType: 'AGREEMENT',
  selectedRelatedEntityId: 196,
};
const companySelectedShiftAgreementCanonicalRequest = resolveCanonicalConversationRequest({
  message: 'Bu vardiyanın sözleşmesini göster.',
  user: companyExcelUser,
  conversationState: null,
  screenContext: companySelectedShiftAgreementContext,
});
const companySelectedShiftAgreementPlan = resolveSemanticIntent({
  message: 'Bu vardiyanın sözleşmesini göster.',
  user: companyExcelUser,
  conversationState: null,
  screenContext: companySelectedShiftAgreementContext,
  canonicalRequest: companySelectedShiftAgreementCanonicalRequest,
});
assert.equal(companySelectedShiftAgreementPlan.family, 'RELATION_LOOKUP');
assert.equal(companySelectedShiftAgreementPlan.relationshipIntent?.kind, 'SHIFT_TO_AGREEMENT');
assert.equal(companySelectedShiftAgreementPlan.relationshipIntent?.toEntity?.id, 196);

console.log('WP-07 final bounded corrective regressions: PASS');
