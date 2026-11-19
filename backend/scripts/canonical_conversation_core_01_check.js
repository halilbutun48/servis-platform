#!/usr/bin/env node

import {
  resolveCanonicalConversationRequest,
  validateCanonicalConversationRequest,
} from '../src/ai/chat/canonicalSemanticRequest.js';
import {
  applyCanonicalConversationTransition,
  clearCanonicalConversationState,
  commitCanonicalConversationState,
  getCanonicalConversationState,
  projectPersistableConversationState,
} from '../src/ai/chat/canonicalConversationState.js';
import {
  SEFER_ABI_SEMANTIC_TRACE_VERSION,
  createSemanticTrace,
} from '../src/ai/chat/canonicalConversationTrace.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';
import { resolveConversationRoute } from '../src/ai/chat/conversationRouting.js';
import { applyRequestedStyleToAnswer, buildVisibleContextDiagnosticResponse, runCopilotFoundation } from '../src/ai/service.js';
import { buildCanonicalSemanticContext, resolveCurrentSelection } from '../src/ai/chat/canonicalSemanticContext.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { resolveCopilotGuidedTarget } from '../src/ai/chat/copilotUiElementAnchor.js';
import { executeSemanticQueryPlan } from '../src/services/queryPlanExecutor.js';
import { buildCurrentScreenNextActionAnswer } from '../src/services/authorizedProductAwareness.js';
import { normalizeTurkishComposition } from '../src/ai/chat/userFacingLanguageNormalizer.js';
import {
  MODEL_FALLBACK_FAILURE_CODES,
  evaluateSemanticFallbackEligibility,
  invokeProviderNeutralSemanticProposer,
  validateProviderNeutralInput,
  validateProviderNeutralProposal,
} from '../src/ai/chat/semanticCandidateFallback.js';

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
}

function buildRequest(message, conversationState = null) {
  return resolveCanonicalConversationRequest({
    message,
    user: { role: 'COMPANY', companyId: 1 },
    selectedEntity: null,
    conversationState,
    screenContext: {
      path: '/company/planning-center',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
    },
    interpreterMode: 'DETERMINISTIC',
  });
}

function buildSchoolOperationsRequest(message, screenContext = {}) {
  return resolveCanonicalConversationRequest({
    message,
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/school/operations',
      label: 'Okul Operasyon Paneli',
      role: 'COMPANY',
      ...screenContext,
    },
    interpreterMode: 'DETERMINISTIC',
  });
}

function assertScope(result, expected, label) {
  assert(result?.request?.semanticScope?.class === expected, `${label} semantic scope is ${expected}`);
  assert(typeof result?.request?.semanticScope?.evidence === 'string' && result.request.semanticScope.evidence, `${label} semantic scope evidence is present`);
}

function assertAction(result, actionClass, objectClass, label) {
  const action = result?.request?.semanticAction;
  assert(action?.actionClass === actionClass, `${label} semantic action is ${actionClass}`);
  assert(action?.objectClass === objectClass, `${label} semantic object is ${objectClass}`);
  assert(action?.resolutionStatus === 'RESOLVED', `${label} semantic action is resolved`);
  assert(action?.modifiers && !Array.isArray(action.modifiers)
    && ['new', 'current', 'next', 'explicitTarget'].every((key) => typeof action.modifiers[key] === 'boolean'), `${label} semantic action uses the frozen modifier object contract`);
  assert(Array.isArray(action?.evidence) && action.evidence.length > 0, `${label} semantic action has evidence`);
}

async function main() {
  console.log('=== SEFER ABI CANONICAL CONVERSATION CORE 01 ===');

  const roomFinancialScreenFocus = resolveCanonicalConversationRequest({
    message: 'Bu ekranda neye bakmalıyım?',
    user: { role: 'ROOM', companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialScreenFocus?.canonicalShape?.taskType === 'SCREEN_CONTEXT', 'ROOM financial screen-focus request remains screen-scoped');
  assert(roomFinancialScreenFocus?.canonicalShape?.screenKnowledgeIntent === true, 'ROOM financial screen-focus request is marked as screen knowledge');
  assert(roomFinancialScreenFocus?.canonicalShape?.screenKnowledgeKind === 'SCREEN_FOCUS', 'ROOM financial screen-focus request resolves to SCREEN_FOCUS');
  assert(roomFinancialScreenFocus?.canonicalShape?.scopeTarget === 'CURRENT_SCREEN', 'ROOM financial screen-focus request stays on current screen');

  // A deictic vehicle question must remain vehicle-scoped after a prior
  // financial answer. Historical quote-floor evidence is valid only when the
  // current request remains on the financial surface; it must not override a
  // live vehicle screen and selected vehicle.
  const roomVehicleGpsAfterFinancial = resolveCanonicalConversationRequest({
    message: 'Bu aracın GPS durumunu açıkla',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: { type: 'vehicle', id: 3 },
    conversationState: {
      lastScreenPath: '/room/financial-operations',
      lastSettledResult: {
        semanticPlan: {
          canonicalRequest: { typedEvidence: { specificity: { quoteFloorAnalysisEvidence: true } } },
        },
      },
      recentMessages: [{ role: 'assistant', text: 'doğrulanmış teklif tabanı toplamı: ₺81.250,00' }],
    },
    screenContext: {
      path: '/room/vehicles',
      label: 'Araçlar',
      role: 'ROOM',
      selectedEntityType: 'vehicle',
      selectedEntityId: 3,
      selectedLabel: '34 ABC 124',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomVehicleGpsAfterFinancial?.canonicalShape?.taskType === 'FIELD_LOOKUP', 'ROOM vehicle GPS question remains a vehicle field lookup after financial history');
  assert(roomVehicleGpsAfterFinancial?.request?.domain === 'VEHICLES', 'ROOM vehicle GPS question keeps the vehicle domain after financial history');
  assert(roomVehicleGpsAfterFinancial?.request?.operation === 'LOOK_UP_FIELD', 'ROOM vehicle GPS question keeps the field lookup operation after financial history');
  assert(roomVehicleGpsAfterFinancial?.request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence !== true, 'ROOM vehicle GPS question does not inherit quote-floor evidence from another surface');
  const roomVehicleGpsVisibleDiagnostic = buildVisibleContextDiagnosticResponse({
    user: { role: 'ROOM', roomId: 1, companyId: 1 },
    entityType: 'vehicle',
    entityId: 3,
    message: 'Bu aracın GPS durumunu açıkla',
    screenContext: {
      path: '/room/vehicles',
      label: 'Araçlar',
      selectedEntityType: 'vehicle',
      selectedEntityId: 3,
      selectedLabel: '34 ABC 124',
      selectedFields: [
        { label: 'Durum', value: 'Çevrim dışı' },
        { label: 'Son GPS', value: '-' },
      ],
    },
  });
  // Direct adapter calls without a canonical semantic plan retain the legacy
  // ROOT_CAUSE label; the production canonical-plan path is covered by CAP-40
  // and must expose ISSUE_DIAGNOSTIC instead.
  assert(roomVehicleGpsVisibleDiagnostic?.activeTopic === 'ROOT_CAUSE', 'ROOM selected vehicle GPS direct adapter retains legacy root-cause label');
  assert(/34 ABC 124.*(?:GPS|konum).*çevrim dışı/iu.test(String(roomVehicleGpsVisibleDiagnostic?.reply || '')), 'ROOM selected vehicle GPS answer uses the visible vehicle status');
  assert(!/teklif tabanı|hakediş|maliyet/iu.test(String(roomVehicleGpsVisibleDiagnostic?.reply || '')), 'ROOM selected vehicle GPS answer does not fall back to financial context');
  const roomVehicleGpsFreshnessDiagnostic = buildVisibleContextDiagnosticResponse({
    user: { role: 'ROOM', roomId: 1, companyId: 1 },
    entityType: 'vehicle',
    entityId: 3,
    message: 'GPS durumu güncel mi?',
    screenContext: {
      path: '/room/vehicles',
      label: 'Araçlar',
      selectedEntityType: 'vehicle',
      selectedEntityId: 3,
      selectedLabel: '34 ABC 124',
      selectedFields: [
        { label: 'GPS Durumu', value: 'Çevrim dışı' },
        { label: 'Son GPS', value: '-' },
      ],
    },
  });
  assert(roomVehicleGpsFreshnessDiagnostic?.activeTopic === 'ROOT_CAUSE', 'ROOM vehicle GPS freshness direct adapter retains legacy root-cause label');
  assert(/34 ABC 124.*(?:GPS|konum).*çevrim dışı/iu.test(String(roomVehicleGpsFreshnessDiagnostic?.reply || '')), 'ROOM vehicle GPS freshness answer keeps the selected vehicle and visible status');
  const roomVehicleLocationStatusDiagnostic = buildVisibleContextDiagnosticResponse({
    user: { role: 'ROOM', roomId: 1, companyId: 1 },
    entityType: 'vehicle',
    entityId: 3,
    message: 'Bu araçta konum ne durumda?',
    screenContext: {
      path: '/room/vehicles',
      label: 'Araçlar',
      selectedEntityType: 'vehicle',
      selectedEntityId: 3,
      selectedLabel: '34 ABC 124',
      selectedFields: [
        { label: 'Durum', value: 'Çevrim dışı' },
        { label: 'GPS Durumu', value: 'Çevrim dışı' },
      ],
    },
  });
  assert(roomVehicleLocationStatusDiagnostic?.activeTopic === 'ROOT_CAUSE', 'ROOM vehicle location-status direct adapter retains legacy root-cause label');
  assert(/34 ABC 124.*(?:GPS|konum).*çevrim dışı/iu.test(String(roomVehicleLocationStatusDiagnostic?.reply || '')), 'ROOM vehicle location-status answer keeps the selected vehicle and visible status');
  const roomVehicleStaleGpsVisibleDiagnostic = buildVisibleContextDiagnosticResponse({
    user: { role: 'ROOM', roomId: 1, companyId: 1 },
    entityType: 'vehicle',
    entityId: 3,
    message: 'Bu aracın GPS durumunu açıkla',
    screenContext: {
      path: '/room/vehicles',
      label: 'Araçlar',
      selectedEntityType: 'vehicle',
      selectedEntityId: 3,
      selectedLabel: '34ABC123',
      selectedFields: [
        { label: 'GPS Durumu', value: 'Güncel değil' },
        { label: 'Son GPS', value: '24.09.2026 09:07' },
      ],
    },
  });
  assert(/34ABC123.*GPS.*güncel değil/iu.test(String(roomVehicleStaleGpsVisibleDiagnostic?.reply || '')), 'ROOM selected stale vehicle GPS answer keeps the selected stale status');
  assert(!/çevrim dışı/iu.test(String(roomVehicleStaleGpsVisibleDiagnostic?.reply || '')), 'ROOM selected stale vehicle GPS answer does not inherit offline status from other rows');
  const roomVehicleVisibilityDiagnostic = buildVisibleContextDiagnosticResponse({
    user: { role: 'ROOM', roomId: 1, companyId: 1 },
    entityType: 'shift',
    entityId: 168,
    message: 'Bu araç neden haritada görünmüyor?',
    screenContext: {
      path: '/room/map',
      label: 'Canlı Takip',
      selectedEntityType: 'shift',
      selectedEntityId: 168,
      selectedLabel: 'Vardiya #168',
      structuredFacts: { vehiclePlate: '34 ABC 124', gpsStatus: 'Çevrim dışı', gpsFreshness: '-' },
    },
  });
  assert(roomVehicleVisibilityDiagnostic?.activeTopic === 'ROOT_CAUSE', 'ROOM map vehicle-visibility direct adapter retains legacy root-cause label');
  assert(/(?:GPS|konum).*çevrim dışı/iu.test(String(roomVehicleVisibilityDiagnostic?.reply || '')), 'ROOM map vehicle-visibility answer explains the visible offline signal');
  assert(/34 ABC 124/iu.test(String(roomVehicleVisibilityDiagnostic?.contextSummary || '')), 'ROOM map vehicle-visibility context retains the visible vehicle identity');

  const roomMapVehicleOneById = resolveCanonicalConversationRequest({
    message: 'Araç #1 hangi plakadır?',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/room/map',
      label: 'Canlı Takip',
      selectedEntityType: 'shift',
      selectedEntityId: 168,
      selectedLabel: 'Vardiya #168',
      structuredFacts: { vehicleId: 3, vehiclePlate: '34 ABC 124' },
    },
  });
  const roomMapVehicleOneReference = roomMapVehicleOneById?.request?.candidateEntityRefs?.find((ref) => ref?.source === 'EXPLICIT_QUERY');
  assert(roomMapVehicleOneReference?.type === 'VEHICLE', 'ROOM map Araç #1 must be an explicit vehicle reference');
  assert(Number(roomMapVehicleOneReference?.id) === 1, 'ROOM map Araç #1 must retain vehicleId 1');
  assert(!roomMapVehicleOneById?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'SHIFT' && Number(ref?.id) === 168), 'ROOM map Araç #1 must not fall back to selected shift 168');
  const roomMapVehicleOnePlan = resolveSemanticIntent({
    message: 'Araç #1 hangi plakadır?',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    screenContext: roomMapVehicleOneById?.canonicalShape?.uiContext,
    canonicalRequest: roomMapVehicleOneById,
  });
  assert(roomMapVehicleOnePlan?.entities?.some((entity) => entity?.type === 'vehicle' && Number(entity?.id) === 1), 'ROOM map Araç #1 semantic plan must retain vehicleId 1');
  assert(roomMapVehicleOnePlan?.requestedFields?.some((field) => field?.key === 'PLATE'), 'ROOM map Araç #1 semantic plan must request the plate field');

  const roomMapVehicleThreeById = resolveCanonicalConversationRequest({
    message: 'Araç #3 hangi plakadır?',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/room/map',
      label: 'Canlı Takip',
      selectedEntityType: 'shift',
      selectedEntityId: 168,
      selectedLabel: 'Vardiya #168',
      structuredFacts: { vehicleId: 3, vehiclePlate: '34 ABC 124' },
    },
  });
  const roomMapVehicleThreeReference = roomMapVehicleThreeById?.request?.candidateEntityRefs?.find((ref) => ref?.source === 'EXPLICIT_QUERY');
  assert(roomMapVehicleThreeReference?.type === 'VEHICLE', 'ROOM map Araç #3 must be an explicit vehicle reference');
  assert(Number(roomMapVehicleThreeReference?.id) === 3, 'ROOM map Araç #3 must retain vehicleId 3');
  assert(!roomMapVehicleThreeById?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'SHIFT' && Number(ref?.id) === 168), 'ROOM map Araç #3 must not fall back to selected shift 168');
  const roomMapVehicleThreePlan = resolveSemanticIntent({
    message: 'Araç #3 hangi plakadır?',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    screenContext: roomMapVehicleThreeById?.canonicalShape?.uiContext,
    canonicalRequest: roomMapVehicleThreeById,
  });
  assert(roomMapVehicleThreePlan?.entities?.some((entity) => entity?.type === 'vehicle' && Number(entity?.id) === 3), 'ROOM map Araç #3 semantic plan must retain vehicleId 3');
  assert(roomMapVehicleThreePlan?.requestedFields?.some((field) => field?.key === 'PLATE'), 'ROOM map Araç #3 semantic plan must request the plate field');

  const roomMapImplicitVehicle = resolveCanonicalConversationRequest({
    message: 'Bu araç hangi plakadır?',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/room/map',
      label: 'Canlı Takip',
      selectedEntityType: 'shift',
      selectedEntityId: 168,
      selectedLabel: 'Vardiya #168',
      structuredFacts: { vehicleId: 3, vehiclePlate: '34 ABC 124' },
    },
  });
  assert(!roomMapImplicitVehicle?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'VEHICLE' && Number(ref?.id) === 1), 'ROOM map deictic vehicle wording must not invent vehicleId 1');

  const roomDriverPhoneGpsBoundary = buildVisibleContextDiagnosticResponse({
    user: { role: 'ROOM', roomId: 1, companyId: 1 },
    entityType: 'shift',
    entityId: 168,
    message: 'Sürücünün telefon GPS’i devrede mi?',
    screenContext: {
      path: '/room/map',
      label: 'Canlı Takip',
      selectedEntityType: 'vehicle',
      selectedEntityId: 3,
      selectedLabel: '34 ABC 124',
      selectedRecordId: 168,
      structuredFacts: {
        vehiclePlate: '34 ABC 124',
        gpsStatus: 'Çevrim dışı',
        gpsFreshness: '-',
      },
    },
  });
  assert(roomDriverPhoneGpsBoundary?.activeTopic === 'ROOT_CAUSE', 'ROOM phone GPS direct adapter retains legacy root-cause label');
  assert(/ayrı, doğrulanmış.*sinyal|konum sinyalinin çevrim dışı/iu.test(String(roomDriverPhoneGpsBoundary?.reply || '')), 'ROOM phone GPS answer explains the authorized signal boundary');
  assert(!/ham kişisel bilgi paylaşılmaz/iu.test(String(roomDriverPhoneGpsBoundary?.reply || '')), 'ROOM phone GPS answer is not a generic privacy refusal');

  const roomFinancialQuoteFloorFollowUp = resolveCanonicalConversationRequest({
    message: 'Bu tutarın nasıl hesaplandığını açıkla',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: {
      lastScreenPath: '/room/financial-operations',
      lastSettledResult: {
        semanticPlan: {
          canonicalRequest: { typedEvidence: { specificity: { quoteFloorAnalysisEvidence: true } } },
        },
      },
      recentMessages: [{ role: 'assistant', text: 'doğrulanmış teklif tabanı toplamı: ₺81.250,00' }],
    },
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialQuoteFloorFollowUp?.canonicalShape?.taskType === 'RISK', 'ROOM financial deictic follow-up remains a quote-floor analysis');
  assert(roomFinancialQuoteFloorFollowUp?.request?.domain === 'BUDGET', 'ROOM financial deictic follow-up keeps the budget domain');
  assert(roomFinancialQuoteFloorFollowUp?.request?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true, 'ROOM financial deictic follow-up retains quote-floor evidence on the financial surface');
  assert(roomFinancialQuoteFloorFollowUp?.request?.semanticAction?.resolutionStatus === 'RESOLVED', 'ROOM financial deictic follow-up resolves from current financial surface and prior metric evidence');

  const roomFinancialQuoteFloorWithoutContext = resolveCanonicalConversationRequest({
    message: 'Bu tutarın nasıl hesaplandığını açıkla',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: null,
    screenContext: { path: '/room/operation-health', label: 'Operasyon Sağlığı', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialQuoteFloorWithoutContext?.request?.semanticAction?.resolutionStatus === 'UNRESOLVED', 'ROOM financial deictic without current financial context remains fail-closed');
  const roomFinancialAmountVariantWithStaleOffer = resolveCanonicalConversationRequest({
    message: 'Bu rakam neye göre hesaplandı?',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: {
      lastSettledResult: { semanticPlan: { entities: [{ type: 'offer', id: 37, source: 'LAST_SETTLED_PRODUCT_CONTEXT' }] } },
      recentMessages: [],
    },
    screenContext: { path: '/room/operation-health', label: 'Operasyon Sağlığı', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialAmountVariantWithStaleOffer?.request?.semanticAction?.resolutionStatus === 'UNRESOLVED', 'ROOM financial amount variant does not reuse a stale offer on a non-financial surface');
  const roomFinancialQuoteFloorSelectedRecord = resolveCanonicalConversationRequest({
    message: 'Bu tutarın nasıl hesaplandığını açıkla',
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: { type: 'offer', id: 36 },
    conversationState: null,
    screenContext: {
      path: '/room/offers',
      label: 'Teklifler',
      role: 'ROOM',
      selectedEntityType: 'offer',
      selectedEntityId: 36,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialQuoteFloorSelectedRecord?.request?.semanticAction?.resolutionStatus === 'RESOLVED', 'ROOM financial deictic keeps a live selected record scope');

  const roomFinancialMetricClarificationSession = `canonical-core-room-financial-metric-clarification-${Date.now()}`;
  const roomFinancialMetricClarificationContext = {
    id: 1110,
    path: '/room/financial-operations',
    label: 'Finansal Operasyonlar',
    role: 'ROOM',
    selectedEntityType: '',
    selectedEntityId: null,
  };
  const roomFinancialMetricClarification = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1110,
    user: { id: 3, role: 'ROOM', roomId: 1 },
    screenContext: roomFinancialMetricClarificationContext,
    message: 'Bu tutarın nasıl hesaplandığını açıkla',
    authSessionId: roomFinancialMetricClarificationSession,
  });
  assert(/birden fazla tutar|hangisinin kaynağını/iu.test(String(roomFinancialMetricClarification?.reply || '')), 'ROOM financial metric clarification names the visible financial choices');
  const roomFinancialMetricSourceFollowUp = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1110,
    user: { id: 3, role: 'ROOM', roomId: 1 },
    screenContext: roomFinancialMetricClarificationContext,
    message: 'Tahmini maliyetin kaynağını açıkla',
    authSessionId: roomFinancialMetricClarificationSession,
  });
  assert(roomFinancialMetricSourceFollowUp?.provider !== 'local-authorized-financial-screen-risk', 'ROOM financial metric follow-up does not fall into screen-risk fallback');
  // This static foundation call intentionally carries no selected financial
  // evidence. The canonical contract is therefore either a source-grounded
  // explanation (when evidence exists) or a truthful, domain-specific
  // clarification; it must never invent the metric's source.
  const roomFinancialMetricFollowUpReply = String(roomFinancialMetricSourceFollowUp?.reply || '');
  assert(/tahmini maliyet|operasyonel maliyet|kaynak|hesap|bağlamı netleştirmem|hangi oda|vardiya/iu.test(roomFinancialMetricFollowUpReply), 'ROOM financial metric follow-up explains the source or truthfully requests missing financial context');
  const hasGroundedMetricSource = /kaynak:|manuel maliyet girdisi|operasyonel maliyet model/iu.test(roomFinancialMetricFollowUpReply);
  if (!hasGroundedMetricSource) {
    assert(!/65[.,]000|619[.,]18|uydur|kanıtsız/iu.test(roomFinancialMetricFollowUpReply), 'ROOM financial metric follow-up does not fabricate unavailable metric evidence');
  }

  const roomKvkkVisibility = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 9003,
    user: { id: 3, role: 'ROOM', roomId: 1 },
    screenContext: { id: 9003, path: '/shared/kvkk', label: 'KVKK', role: 'ROOM' },
    message: 'KVKK sınırını açıkla',
    authSessionId: `canonical-core-room-kvkk-visibility-${Date.now()}`,
  });
  assert(roomKvkkVisibility?.provider !== 'local-static-product-help', 'ROOM KVKK visibility question does not fall into role-global product help');
  assert(/KVKK|görünürlük|yetki|rol/iu.test(String(roomKvkkVisibility?.reply || '')), 'ROOM KVKK visibility answer names the actual visibility boundary');
  const roomKvkkAccessBoundary = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 9003,
    user: { id: 3, role: 'ROOM', roomId: 1 },
    screenContext: {
      id: 9003,
      path: '/shared/kvkk',
      label: 'KVKK',
      role: 'ROOM',
      structuredFacts: {
        screenType: 'KVKK',
        kvkkAccess: { requiredCount: 0, acceptedCount: 0, blocking: false },
      },
    },
    message: 'Erişim neden kapalı?',
    authSessionId: `canonical-core-room-kvkk-access-boundary-${Date.now()}`,
  });
  assert(roomKvkkAccessBoundary?.questionType === 'KVKK_VISIBILITY', 'ROOM KVKK access boundary keeps the typed visibility question');
  assert(/KVKK erişimi kapalı görünmüyor/iu.test(String(roomKvkkAccessBoundary?.reply || '')), 'ROOM KVKK access boundary explains the verified open state');
  assert(!/kesin sebebi veriyle doğrulamak gerekir/iu.test(String(roomKvkkAccessBoundary?.reply || '')), 'ROOM KVKK access boundary does not fall into generic root-cause guidance');
  const hubHumanizedGps = normalizeTurkishComposition('Araç kayıtlarını, sürücü bağını ve cihaz GPS\'i bilgisini yönetmek için kullanılır.');
  assert(!/GPS\/konum['’]i/iu.test(hubHumanizedGps), 'ROOM Hub Turkish copy does not attach a malformed suffix to GPS/konum');
  assert(/GPS\/konum bilgisini/iu.test(hubHumanizedGps), 'ROOM Hub Turkish copy keeps the GPS/konum information phrase grammatical');

  // A live screen that explicitly reports no selected record is authoritative.
  // Historical conversation entities must not be revived for a new
  // operation-health request; explicit "previous record" requests remain on
  // the separate historical-reference path.
  const roomOperationHealthHistoricalAgreement = resolveCanonicalConversationRequest({
    message: 'Riskli cihazları göster',
    user: { role: 'ROOM', companyId: 1, roomId: 1 },
    selectedEntity: null,
    conversationState: {
      lastScreenPath: '/room/agreements',
      uniqueDiscourseReferent: { type: 'AGREEMENT', id: 184, validated: true },
      referenceState: { uniqueReferent: { type: 'AGREEMENT', id: 184 } },
    },
    screenContext: {
      path: '/room/operation-health',
      label: 'Operasyon Sağlığı',
      role: 'ROOM',
      selectedEntityType: '',
      selectedEntityId: null,
      selectedEntity: null,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomOperationHealthHistoricalAgreement?.canonicalShape?.targetEntityType !== 'AGREEMENT', 'ROOM operation-health empty selection does not revive historical agreement target');
  assert(roomOperationHealthHistoricalAgreement?.request?.domain === 'OPERATIONS', 'ROOM operation-health empty selection keeps operations domain');
  assert(!roomOperationHealthHistoricalAgreement?.request?.candidateEntityRefs?.some((candidate) => String(candidate?.type || '').toUpperCase() === 'AGREEMENT'), 'ROOM operation-health empty selection has no historical agreement candidate');
  const roomOperationHealthPlan = resolveSemanticIntent({
    message: 'Riskli cihazları göster',
    user: { role: 'ROOM', companyId: 1, roomId: 1 },
    selectedEntity: null,
    conversationState: {
      lastScreenPath: '/room/agreements',
      uniqueDiscourseReferent: { type: 'AGREEMENT', id: 184, validated: true },
      referenceState: { uniqueReferent: { type: 'AGREEMENT', id: 184 } },
    },
    screenContext: {
      path: '/room/operation-health',
      label: 'Operasyon Sağlığı',
      role: 'ROOM',
      selectedEntityType: '',
      selectedEntityId: null,
      selectedEntity: null,
    },
    canonicalRequest: roomOperationHealthHistoricalAgreement.request,
  });
  assert(roomOperationHealthPlan?.intentFamily === 'RISK_RANKING', 'ROOM operation-health empty selection resolves risk-ranking intent');
  assert(!roomOperationHealthPlan?.entities?.some((entity) => String(entity?.type || '').toUpperCase() === 'AGREEMENT'), 'ROOM operation-health plan has no historical agreement entity');

  // Screen-level Operation Health suggestions must remain scoped to the live
  // surface even when the chat session still carries Agreement #184 from the
  // preceding Agreements screen.  This exercises the complete service path,
  // including the visible response contract, for all three shipped chips.
  const roomOperationHealthChipMessages = [
    'Riskli cihazları göster',
    'GPS güncel değil / çevrim dışı satırını aç',
    'Açık sorunları sırala',
  ];
  for (const message of roomOperationHealthChipMessages) {
    const roomOperationHealthChipResponse = await runCopilotFoundation({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 1,
      user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
      screenContext: {
        path: '/room/operation-health',
        label: 'Operasyon Sağlığı',
        role: 'ROOM',
        selectedEntityType: 'agreement',
        selectedEntityId: 184,
      },
      message,
      authSessionId: `canonical-core-room-operation-health-chip-${Date.now()}-${message.length}`,
    });
    const chipPlan = roomOperationHealthChipResponse?.semanticPlan;
    assert(!chipPlan?.requestedDomains?.includes('AGREEMENTS'), `ROOM operation-health chip stays out of stale agreement domain: ${message}`);
    assert(!chipPlan?.entities?.some((entity) => String(entity?.type || '').toUpperCase() === 'AGREEMENT'), `ROOM operation-health chip has no stale agreement entity: ${message}`);
    assert(!/Sözleşme #184/iu.test(String(roomOperationHealthChipResponse?.reply || '')), `ROOM operation-health chip does not answer with stale agreement: ${message}`);
    assert(/(?:sorun|riskli cihaz|stale\/offline|GPS\/konum)/iu.test(String(roomOperationHealthChipResponse?.reply || '')), `ROOM operation-health chip gives an issue-oriented visible answer: ${message}`);
  }

  const roomOperationHealthUnseenRiskVariant = resolveCanonicalConversationRequest({
    message: 'Cihazlarda risk görünenleri bana özetler misin?',
    user: { role: 'ROOM', companyId: 1, roomId: 1 },
    selectedEntity: null,
    screenContext: {
      path: '/room/operation-health',
      label: 'Operasyon Sağlığı',
      role: 'ROOM',
      selectedEntityType: '',
      selectedEntityId: null,
      selectedEntity: null,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  const roomOperationHealthUnseenRiskPlan = resolveSemanticIntent({
    message: 'Cihazlarda risk görünenleri bana özetler misin?',
    user: { role: 'ROOM', companyId: 1, roomId: 1 },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/room/operation-health',
      label: 'Operasyon Sağlığı',
      role: 'ROOM',
      selectedEntityType: '',
      selectedEntityId: null,
      selectedEntity: null,
    },
    canonicalRequest: roomOperationHealthUnseenRiskVariant,
  });
  assert(roomOperationHealthUnseenRiskVariant?.canonicalShape?.operationHealthMetricMode === 'METRIC_DEFINITION', 'ROOM unseen device-risk paraphrase resolves to metric definition');
  assert(roomOperationHealthUnseenRiskPlan?.operationHealthMetricIntent === true, 'ROOM unseen device-risk paraphrase keeps operation-health metric intent');
  assert(roomOperationHealthUnseenRiskPlan?.operationHealthMetricMode === 'METRIC_DEFINITION', 'ROOM unseen device-risk paraphrase keeps metric definition mode');

  const roomOperationHealthGpsRow = resolveCanonicalConversationRequest({
    message: 'GPS güncel değil / çevrim dışı satırını aç',
    user: { role: 'ROOM', companyId: 1, roomId: 1 },
    selectedEntity: { type: 'shift', id: 214 },
    conversationState: null,
    screenContext: {
      path: '/room/operation-health',
      label: 'Operasyon Sağlığı',
      role: 'ROOM',
      surfaceRole: 'ROOM',
      selectedEntityType: 'shift',
      selectedEntityId: 214,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomOperationHealthGpsRow?.canonicalShape?.operationHealthMetricMode === 'GPS_ISSUE_SUBSET', 'ROOM GPS row request keeps operation-health subset owner');
  assert(roomOperationHealthGpsRow?.canonicalShape?.scopeTarget === 'CURRENT_SCREEN', 'ROOM GPS row request does not inherit a stale selected shift');

  const roomOperationHealthShortSummary = applyRequestedStyleToAnswer({
    reply: 'Açık sorun 3. Riskli cihaz 1, stale/offline sürücü 2. Günlük vardiya raporu 0.',
    summary: 'Açık sorun 3. Riskli cihaz 1, stale/offline sürücü 2. Günlük vardiya raporu 0.',
    semanticPlan: { requestedStyle: 'SHORT_SUMMARY', operationHealthMetricIntent: true },
    responseSections: [{ title: 'Özet', body: '' }],
  });
  assert(/Riskli cihaz 1/iu.test(String(roomOperationHealthShortSummary?.reply || ''))
    && /stale\/offline sürücü 2/iu.test(String(roomOperationHealthShortSummary?.reply || '')), 'ROOM operation-health short summary preserves metric facts');
  const nonMetricShortSummary = applyRequestedStyleToAnswer({
    reply: 'Birinci cümle. İkinci cümle.',
    summary: 'Birinci cümle. İkinci cümle.',
    semanticPlan: { requestedStyle: 'SHORT_SUMMARY', operationHealthMetricIntent: false },
    responseSections: [{ title: 'Özet', body: '' }],
  });
  assert(nonMetricShortSummary?.reply === 'Birinci cümle.', 'non-metric short summary remains sentence-limited');

  const roomFinancialScreenFocusVariant = resolveCanonicalConversationRequest({
    message: 'Bu finans ekranında önce neyi kontrol edeyim?',
    user: { role: 'ROOM', companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialScreenFocusVariant?.canonicalShape?.taskType === 'SCREEN_CONTEXT', 'ROOM financial screen-focus variant remains screen-scoped');
  assert(roomFinancialScreenFocusVariant?.canonicalShape?.screenKnowledgeKind === 'SCREEN_FOCUS', 'ROOM financial screen-focus variant resolves to SCREEN_FOCUS');
  assert(roomFinancialScreenFocusVariant?.canonicalShape?.scopeTarget === 'CURRENT_SCREEN', 'ROOM financial screen-focus variant stays on current screen');

  const roomFinancialNaturalVariant = resolveCanonicalConversationRequest({
    message: 'Finansal operasyonlarda önce neye bakılır?',
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialNaturalVariant?.request?.operation === 'EXPLAIN_CURRENT_SURFACE', 'ROOM financial natural focus variant remains current-surface explanation');
  assert(roomFinancialNaturalVariant?.canonicalShape?.screenKnowledgeKind === 'SCREEN_FOCUS', 'ROOM financial natural focus variant resolves to SCREEN_FOCUS');
  assert(roomFinancialScreenFocusVariant?.request?.semanticAction?.actionClass === 'EXPLAIN', 'ROOM financial screen-focus variant resolves an explain action');
  assert(roomFinancialScreenFocusVariant?.request?.semanticAction?.resolutionStatus === 'RESOLVED', 'ROOM financial screen-focus variant does not remain an unresolved deictic');
  const roomFinancialSelectedNextAction = resolveCanonicalConversationRequest({
    message: 'Sıradaki doğru işlem ne?',
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
      selectedEntityType: 'shift',
      selectedEntityId: 168,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialSelectedNextAction?.request?.operation === 'RESOLVE_NEXT_SAFE_ACTION', 'ROOM selected financial surface keeps next-action operation');
  assert(roomFinancialSelectedNextAction?.canonicalShape?.taskType === 'NEXT_ACTION', 'ROOM selected financial surface does not collapse next action into field lookup');
  const roomFinancialUnseenNextAction = resolveCanonicalConversationRequest({
    message: 'Bu kârlılık ekranında şimdi hangi güvenli adıma geçmeliyim?',
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
      selectedEntityType: 'shift',
      selectedEntityId: 168,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomFinancialUnseenNextAction?.request?.operation === 'RESOLVE_NEXT_SAFE_ACTION', 'ROOM unseen financial next-action paraphrase remains actionable');
  assert(roomFinancialUnseenNextAction?.canonicalShape?.taskType === 'NEXT_ACTION', 'ROOM unseen financial next-action paraphrase avoids field lookup');

  const roomShiftsSafetyNextAction = resolveCanonicalConversationRequest({
    message: 'Bu sayfada şimdi ne yapmam güvenli?',
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    selectedEntity: { type: 'shift', id: 214 },
    conversationState: null,
    screenContext: {
      path: '/room/shifts',
      label: 'Vardiyalar',
      role: 'ROOM',
      selectedEntityType: 'shift',
      selectedEntityId: 214,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomShiftsSafetyNextAction?.request?.operation === 'RESOLVE_NEXT_SAFE_ACTION', 'ROOM shifts safety question keeps next-action operation');
  assert(roomShiftsSafetyNextAction?.canonicalShape?.taskType === 'NEXT_ACTION', 'ROOM shifts safety question avoids screen-context fallback');

  const roomShiftsSafetyProgression = resolveCanonicalConversationRequest({
    message: 'Burada hangi güvenli adımla ilerleyeyim?',
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    selectedEntity: { type: 'shift', id: 214 },
    conversationState: null,
    screenContext: {
      path: '/room/shifts',
      label: 'Vardiyalar',
      role: 'ROOM',
      selectedEntityType: 'shift',
      selectedEntityId: 214,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomShiftsSafetyProgression?.request?.operation === 'RESOLVE_NEXT_SAFE_ACTION', 'ROOM shifts progression question keeps next-action operation');
  assert(roomShiftsSafetyProgression?.canonicalShape?.taskType === 'NEXT_ACTION', 'ROOM shifts progression question avoids screen-context fallback');

  // Without a selected entity or server-owned discourse state, the deictic
  // reference is not grounded.  The canonical contract must fail closed and
  // request clarification rather than manufacture PRODUCT_CONTEXTUAL scope.
  const result = buildRequest('bu sözleşmenin günü ne');
  const envelope = result?.request;
  assert(result?.requestId, 'canonical request has requestId');
  assert(envelope?.version === 'SEFER-ABI-CANONICAL-REQUEST-V3', 'canonical request uses V3 envelope');
  assertScope(result, 'UNRESOLVED', 'unresolved product referent without state');
  assert(result?.canonicalShape?.taskType === 'CLARIFY', 'unresolved product referent requests clarification');
  assert(result?.request?.semanticAction?.resolutionStatus === 'UNRESOLVED', 'unresolved product referent remains unresolved');
  assert(typeof envelope?.operation === 'string' && envelope.operation, 'canonical request has operation');
  assert(typeof envelope?.domain === 'string' && envelope.domain, 'canonical request has domain');
  assert(typeof envelope?.capability === 'string' && envelope.capability, 'canonical request has capability');
  assert(Array.isArray(envelope?.candidateEntityRefs), 'candidateEntityRefs are present before authorization');
  assert(Array.isArray(envelope?.requestedFields), 'requestedFields are present');
  assert(envelope?.safety?.actionPolicy === 'READ_ONLY' || envelope?.safety?.actionPolicy === 'SAFE_UI_ONLY', 'actionPolicy is deny-by-default');
  assert(envelope?.safety?.writeBoundary === 'NO_BUSINESS_WRITE', 'writeBoundary is no-business-write');
  assert(envelope?.ambiguity && typeof envelope.ambiguity.status === 'string', 'ambiguity state is explicit');
  assert(envelope?.provenance && typeof envelope.provenance.interpreter === 'string', 'provenance is explicit');
  assert(result?.validation?.status === 'VALID' || result?.validation?.status === 'SEMANTIC_UNRESOLVED', 'validation status is explicit');

  // V3 RED: semantic equivalents must carry one action/object meaning before
  // product policy and authorization. These are behavior classes, not
  // production routing phrases.
  const createShift = buildRequest('Vardiya oluşturmak istiyorum');
  const createShiftStart = buildRequest('yeni vardiya planı başlatmak istiyorum');
  for (const [label, candidate] of [['create shift', createShift], ['create shift start', createShiftStart]]) {
    assertScope(candidate, 'PRODUCT_EXPLICIT', label);
    assertAction(candidate, 'CREATE', 'SHIFT', label);
    assert(candidate?.request?.operation === 'CREATE_SHIFT', `${label} maps to CREATE_SHIFT`);
    assert(candidate?.request?.workflowRef?.workflowIntent === 'CREATE_SHIFT', `${label} maps to the COMPANY guided workflow requirement`);
  }

  // Attempt-03 RED: create meaning must be composed from a goal predicate,
  // the SHIFT object, and their relation. These are development/regression
  // cases; production must not branch on any literal utterance.
  const compositionalCreateCases = [
    ['create compositional kur goal', 'Yeni bir servis vardiyası kurmak istiyorum'],
    ['create compositional sefer kur goal', 'Yeni servis seferi kurmam gerekiyor'],
    ['create compositional vardiya ayarla goal', 'Sıfırdan bir vardiya ayarlamak istiyorum'],
  ];
  for (const [label, message] of compositionalCreateCases) {
    const candidate = buildRequest(message);
    assertScope(candidate, 'PRODUCT_EXPLICIT', label);
    assertAction(candidate, 'CREATE', 'SHIFT', label);
    assert(candidate?.request?.operation === 'CREATE_SHIFT', `${label} maps to CREATE_SHIFT`);
    assert(candidate?.request?.semanticAction?.evidence?.includes('COMPOSITIONAL_PREDICATE_OBJECT_GOAL'), `${label} records compositional predicate/object evidence`);
  }
  const negatedCreate = buildRequest('Yeni bir vardiya oluşturmak istemiyorum');
  assert(negatedCreate?.request?.semanticAction?.actionClass !== 'CREATE', 'negated shift creation does not become affirmative CREATE');
  assert(negatedCreate?.request?.operation !== 'CREATE_SHIFT', 'negated shift creation does not map to CREATE_SHIFT');

  const navigateAgreement = buildSchoolOperationsRequest('Sözleşmeler ekranını aç');
  assertAction(navigateAgreement, 'VIEW', 'AGREEMENT', 'agreement surface view');
  assert(navigateAgreement?.request?.operation === 'VIEW_AUTHORIZED_SURFACE', 'agreement surface uses authorized view operation');
  assert(navigateAgreement?.request?.workflowRef?.workflowIntent === 'OPEN_AGREEMENTS_SURFACE', 'agreement surface keeps the canonical workflow intent');
  assert(navigateAgreement?.request?.operation !== 'CREATE_SHIFT', 'agreement surface view does not become create');
  const viewShifts = buildRequest('Vardiyalar ekranını görüntüle');
  assertAction(viewShifts, 'VIEW', 'SHIFT', 'shift surface view');
  assert(viewShifts?.request?.operation !== 'CREATE_SHIFT', 'shift view does not become create');
  const explainScreen = buildRequest('Bu ekran ne işe yarıyor?');
  assertAction(explainScreen, 'EXPLAIN', 'SURFACE', 'current screen explanation');
  const driverExplanation = resolveCanonicalConversationRequest({
    message: "Operasyon Sağlığı ekranından geldim. Sürücünün telefon GPS'i uzun süredir veri göndermiyor. Bunun ne anlama geldiğini sade Türkçe ile açıkla.",
    user: { role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' },
    selectedEntity: null,
    conversationState: null,
    screenContext: { path: '/room/operation-health', label: 'Operasyon Sağlığı', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(driverExplanation?.canonicalShape?.requestedRoleTarget == null, 'driver explanation does not become a cross-role target');
  // An explicit GPS symptom is a current issue diagnosis, not generic
  // surface-purpose help.  Keep the operation-health metric contract
  // asserted here so the checker follows the canonical resolver.
  assert(driverExplanation?.request?.operation === 'DIAGNOSE_CURRENT_ISSUE', 'driver explanation resolves the current operation-health issue');
  assert(driverExplanation?.request?.domain === 'OPERATIONS', 'driver explanation stays in the operations domain');
  assert(driverExplanation?.canonicalShape?.operationHealthMetricMode === 'GPS_ISSUE_SUBSET', 'driver explanation preserves the GPS issue subset');
  const driverNavigation = buildRequest('Sürücü ekranını aç');
  assert(driverNavigation?.canonicalShape?.requestedRoleTarget?.roleKey === 'DRIVER', 'driver screen navigation keeps explicit role target');
  const continueTask = buildRequest('Devamını anlat', {
    activeGuidedTask: { taskId: 'task-v3-continue', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-continue', continuationDepth: 1 },
  });
  assertAction(continueTask, 'CONTINUE', 'SHIFT', 'guided continuation');
  const resumeTask = buildRequest('Nerede kaldık?', {
    activeGuidedTask: { taskId: 'task-v3-resume', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-resume', continuationDepth: 1 },
  });
  assertAction(resumeTask, 'RESUME', 'SHIFT', 'guided resume');

  // Frozen V3 action-frame contract: comparison is distinct from EXPLAIN,
  // and a missing object candidate remains nullable instead of becoming an
  // UNKNOWN product object. The action itself is retained for safe
  // clarification/grounding downstream.
  const compareRequest = buildRequest("A ile B'yi karşılaştır");
  const compareAction = compareRequest?.request?.semanticAction;
  assert(compareAction?.actionClass === 'COMPARE', 'comparison resolves to the frozen COMPARE action');
  assert(compareRequest?.request?.operation === 'COMPARE_AUTHORIZED_RECORDS', 'comparison maps to the canonical compare operation');
  assert(compareAction?.objectClass === null && compareAction?.targetCandidate === null, 'comparison keeps an unresolved object candidate nullable');
  assert(compareAction?.resolutionStatus === 'UNRESOLVED', 'comparison with insufficient object evidence stays unresolved without losing COMPARE');
  assert(compareRequest?.request?.ambiguity?.status === 'UNRESOLVED', 'insufficient comparison evidence stays explicitly unresolved');
  assert(compareAction?.modifiers && !Array.isArray(compareAction.modifiers)
    && compareAction.modifiers.current === true && compareAction.modifiers.new === false, 'comparison uses object-style modifiers');
  const ambiguousCompare = buildRequest('Hangisi daha iyi?', {
    activeComparisonSet: [{ type: 'OFFER', id: 1 }, { type: 'OFFER', id: 2 }, { type: 'OFFER', id: 3 }],
  });
  assert(ambiguousCompare?.request?.semanticAction?.actionClass === 'COMPARE', 'multiple comparison candidates retain COMPARE');
  assert(ambiguousCompare?.request?.semanticAction?.resolutionStatus === 'AMBIGUOUS', 'multiple comparison candidates use AMBIGUOUS status');
  assert(ambiguousCompare?.request?.ambiguity?.status === 'AMBIGUOUS', 'AMBIGUOUS action status is reflected in the request ambiguity state');
  const contradictoryCompare = { ...compareRequest.request, operation: 'EXPLAIN_CURRENT_SURFACE' };
  const contradictoryCompareValidation = validateCanonicalConversationRequest(contradictoryCompare);
  assert(!contradictoryCompareValidation.valid, 'COMPARE action cannot validate with an unrelated EXPLAIN operation');
  assert(contradictoryCompareValidation.failureClass === 'ACTION_MAPPING_FAILURE', 'action mapping failure stays distinct from product ambiguity');

  // Restart is a typed task transition represented by the existing
  // RETURN_TO_PRODUCT operation. It must not be collapsed into CONTINUE, and
  // “baştan anlat” remains an explanation request rather than a restart.
  const restartTask = buildRequest('Baştan al', {
    activeGuidedTask: { taskId: 'task-v3-restart', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-restart', continuationDepth: 1 },
  });
  assert(restartTask?.request?.semanticAction?.actionClass !== 'CONTINUE', 'restart request is not interpreted as CONTINUE');
  assert(restartTask?.request?.continuation?.mode === 'RESTART', 'restart request uses the typed restart continuation mode');
  assert(restartTask?.request?.semanticAction?.modifiers?.new === true, 'restart request marks a new-start modifier');
  const restartStartOver = buildRequest('Akışı sıfırdan başlatalım', {
    activeGuidedTask: { taskId: 'task-v3-restart-start-over', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-restart-start-over', continuationDepth: 1 },
  });
  assert(restartStartOver?.request?.continuation?.mode === 'RESTART', 'start-over wording uses the typed restart continuation mode');
  assert(restartStartOver?.request?.semanticAction?.modifiers?.new === true, 'start-over wording marks a new-start modifier');
  const explainFromBeginning = buildRequest('Baştan anlat', {
    activeGuidedTask: { taskId: 'task-v3-explain', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-explain', continuationDepth: 1 },
  });
  assert(explainFromBeginning?.request?.semanticAction?.actionClass === 'EXPLAIN', 'explain-from-beginning remains an explanation request');

  const contradictoryCreate = {
    ...createShiftStart.request,
    operation: 'EXPLAIN_CURRENT_SURFACE',
  };
  assert(!validateCanonicalConversationRequest(contradictoryCreate).valid, 'CREATE + SHIFT with surface explanation fails validation');
  const contradictoryNavigation = {
    ...navigateAgreement.request,
    operation: 'CREATE_SHIFT',
  };
  assert(!validateCanonicalConversationRequest(contradictoryNavigation).valid, 'NAVIGATE + AGREEMENT with create fails validation');
  const contradictoryOffTopic = {
    ...buildRequest('Pizza mı makarna mı?')?.request,
    operation: 'CREATE_SHIFT',
  };
  assert(!validateCanonicalConversationRequest(contradictoryOffTopic).valid, 'genuine OOS with create fails validation');
  const v2TransportOnlyRoute = resolveConversationRoute({
    message: 'Vardiya oluşturmak istiyorum',
    canonicalRequest: { request: { ...createShift.request, version: 'SEFER-ABI-CANONICAL-REQUEST-V2' }, validation: { status: 'VALID' } },
    canonicalShape: createShift.canonicalShape,
  });
  assert(v2TransportOnlyRoute?.route === 'UNCLEAR_OR_AMBIGUOUS', 'V2 transport compatibility cannot re-interpret V3 semantic action');

  const genuineOffTopic = buildRequest('Pizza mı makarna mı?');
  assertScope(genuineOffTopic, 'OFF_TOPIC_GENUINE', 'genuine off-topic request');
  assert(genuineOffTopic?.request?.operation === 'GENERAL_INFORMATION', 'genuine off-topic request maps to general information');

  const ambiguousProduct = buildRequest('Buradaki duruma bakabilir misin?');
  assert(['PRODUCT_AMBIGUOUS', 'UNRESOLVED'].includes(ambiguousProduct?.request?.semanticScope?.class), 'ambiguous product request remains clarification scope');
  assert(ambiguousProduct?.request?.semanticScope?.class !== 'OFF_TOPIC_GENUINE', 'ambiguous product request is not genuine OOS');

  const explicitProduct = buildSchoolOperationsRequest('Sözleşmeler ekranını aç');
  assertScope(explicitProduct, 'PRODUCT_EXPLICIT', 'explicit product navigation');

  const deicticProduct = buildRequest('Burası ne?', {
    activeGuidedTask: { taskId: 'task-deictic', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-deictic', continuationDepth: 0 },
  });
  assertScope(deicticProduct, 'PRODUCT_CONTEXTUAL', 'deictic live-surface request');
  assert(deicticProduct?.request?.operation === 'EXPLAIN_CURRENT_TARGET', 'deictic live-surface request maps to EXPLAIN_CURRENT_TARGET');

  const continuation = buildRequest('Devam et', {
    activeGuidedTask: { taskId: 'task-continuation', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-continuation', continuationDepth: 1 },
  });
  assertScope(continuation, 'PRODUCT_CONTEXTUAL', 'continuation request');

  // V3 continuation behavior-class RED: a natural request to continue from
  // the settled task must resolve as CONTINUE even when it does not contain
  // the shorter "devam et" cue.  The active task supplies context only; it
  // must not force unrelated requests into continuation.
  const activeContinuationState = {
    activeGuidedTask: { taskId: 'task-continuation-unseen', semanticPlan: { workflowIntent: 'CREATE_SHIFT', family: 'UI_GUIDANCE' } },
    lastSettledResult: { requestId: 'settled-continuation-unseen', continuationDepth: 1 },
  };
  const unseenContinuation = buildRequest('Kaldığımız yerden ilerleyelim', activeContinuationState);
  assertAction(unseenContinuation, 'CONTINUE', 'SHIFT', 'unseen active-task continuation');
  assert(unseenContinuation?.request?.continuation?.mode === 'CONTINUE', 'unseen active-task continuation keeps typed CONTINUE mode');
  const equivalentContinuation = buildRequest('Buradan sürdürelim, sıradaki adıma geçelim', activeContinuationState);
  assertAction(equivalentContinuation, 'CONTINUE', 'SHIFT', 'equivalent active-task continuation');
  const explicitNewIntentDuringTask = buildRequest('Sözleşmeler ekranına geçelim', activeContinuationState);
  assertAction(explicitNewIntentDuringTask, 'NAVIGATE', 'AGREEMENT', 'explicit new intent outranks continuation');
  const activeTaskCostQuestion = buildRequest('Maliyet ne kadar?', activeContinuationState);
  assert(activeTaskCostQuestion?.request?.operation !== 'CONTINUE_CURRENT_TASK', 'active task alone does not force cost question into continuation');
  assert(
    activeTaskCostQuestion?.canonicalShape?.taskType === 'RISK'
      || activeTaskCostQuestion?.request?.domain === 'BUDGET'
      || (activeTaskCostQuestion?.request?.domain === 'FINANCE'
        && activeTaskCostQuestion?.request?.operation === 'LOOK_UP_FIELD'),
    'active task does not steal genuine cost intent',
  );
  const activeTaskAmbiguity = buildRequest('Şu konuyu nasıl ele alalım?', activeContinuationState);
  assert(['UNRESOLVED', 'PRODUCT_AMBIGUOUS'].includes(activeTaskAmbiguity?.request?.semanticScope?.class), 'active task does not manufacture continuation for genuine ambiguity');
  const activeTaskOffTopic = buildRequest('Pizza mı makarna mı?', activeContinuationState);
  assertScope(activeTaskOffTopic, 'OFF_TOPIC_GENUINE', 'active-task genuine off-topic request');

  // Browser-originated SCHOOL operations canary: an authorized operational
  // planning/evidence question must be interpreted at the canonical boundary
  // before downstream routing.  This is intentionally a behavior-class
  // assertion; it must not depend on one literal utterance in production.
  const schoolPlanning = buildSchoolOperationsRequest('Bu servis planında neye bakmalıyım?');
  assert(schoolPlanning?.request?.operation === 'CHECK_EVIDENCE_SUFFICIENCY', 'SCHOOL operational planning question keeps evidence operation');
  assert(schoolPlanning?.request?.domain === 'OPERATIONS', 'SCHOOL operational planning question keeps operations domain');
  assert(schoolPlanning?.canonicalShape?.taskType === 'EVIDENCE_SUFFICIENCY', 'SCHOOL operational planning question keeps evidence task');
  assert(!schoolPlanning?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'ORGANIZATION_PLAN'), 'SCHOOL operations does not borrow organization-plan entity candidate');

  const schoolPlanningParaphrase = buildSchoolOperationsRequest('Bu operasyon planında hangi kanıtlara bakayım?');
  assert(schoolPlanningParaphrase?.request?.operation === 'CHECK_EVIDENCE_SUFFICIENCY', 'SCHOOL planning paraphrase keeps evidence operation');
  assert(schoolPlanningParaphrase?.request?.domain === 'OPERATIONS', 'SCHOOL planning paraphrase keeps operations domain');
  assert(schoolPlanningParaphrase?.canonicalShape?.taskType === 'EVIDENCE_SUFFICIENCY', 'SCHOOL planning paraphrase keeps evidence task');

  const schoolCost = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    screenContext: { path: '/school/operations', label: 'Okul Operasyon Paneli', role: 'COMPANY' },
    message: 'Maliyet ne kadar?',
    authSessionId: `canonical-core-school-cost-${Date.now()}`,
  });
  assert(
    schoolCost?.questionType === 'COST_REASONING_CLARIFICATION'
      && schoolCost?.costReasoning?.clarificationRequired === true
      && schoolCost?.costReasoning?.readOnly === true
      && schoolCost?.costReasoning?.writeAction === false
      && schoolCost?.costReasoning?.evidence?.canonical1 == null
      && schoolCost?.costReasoning?.evidence?.canonical2 == null
      && schoolCost?.costReasoning?.evidence?.canonical4 == null
      && !/[₺$€]|\b\d[\d.,]*\s*(?:TL|TRY)\b/iu.test(String(schoolCost?.reply || '')),
    'SCHOOL cost request requires safe clarification without unauthorized financial data',
  );

  // Attempt-02 RED coverage: an authorized School navigation request must
  // resolve to the canonical Agreements surface instead of generic clarify.
  const schoolAgreements = buildSchoolOperationsRequest('Sözleşmeler ekranını aç');
  assert(schoolAgreements?.canonicalShape?.taskType === 'SCREEN_CONTEXT', 'SCHOOL agreements navigation resolves as screen context');
  assert(schoolAgreements?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements navigation resolves to agreements domain');
  assert(schoolAgreements?.canonicalShape?.workflowIntent === 'OPEN_AGREEMENTS_SURFACE', 'SCHOOL agreements navigation has the authorized surface transition');
  const schoolAgreementsParaphrase = buildSchoolOperationsRequest('sözleşmelere git');
  assert(schoolAgreementsParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && schoolAgreementsParaphrase?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements navigation paraphrase keeps the same semantic class');
  const schoolAgreementsMovementParaphrase = buildSchoolOperationsRequest('Sözleşmelere geç');
  assert(schoolAgreementsMovementParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && schoolAgreementsMovementParaphrase?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements movement paraphrase keeps the same semantic class');
  assert(schoolAgreementsMovementParaphrase?.request?.semanticScope?.class === 'PRODUCT_EXPLICIT', 'SCHOOL agreements movement paraphrase is explicitly product scoped');
  const schoolAgreementsProgressionParaphrase = buildSchoolOperationsRequest('Sözleşme sayfasına ilerle');
  assert(schoolAgreementsProgressionParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && schoolAgreementsProgressionParaphrase?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements progression paraphrase keeps the same semantic class');
  const schoolAgreementStatusQuestion = buildSchoolOperationsRequest('Sözleşmelerin durumu nedir?');
  assert(schoolAgreementStatusQuestion?.canonicalShape?.workflowIntent !== 'OPEN_AGREEMENTS_SURFACE', 'agreement status question does not become navigation');
  const companyShiftProgressionParaphrase = buildRequest('Planlama Merkezi ekranına geçip vardiya akışını gösterir misin?');
  assert(companyShiftProgressionParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && companyShiftProgressionParaphrase?.request?.domain === 'SHIFTS', 'company shift progression paraphrase resolves to the shift surface');
  assert(companyShiftProgressionParaphrase?.canonicalShape?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'company shift progression paraphrase keeps the navigation workflow');
  assert(companyShiftProgressionParaphrase?.request?.candidateEntityRefs?.length === 0, 'resolved shift surface navigation does not manufacture a record candidate');
  const companyShiftSurfaceAuthorization = await authorizeSemanticRequest({ user: { role: 'COMPANY', companyId: 1 }, request: companyShiftProgressionParaphrase.request });
  assert(companyShiftSurfaceAuthorization?.authorizationStatus === 'AUTHORIZED', 'resolved shift surface navigation is authorized without a selected record');
  const vagueNavigation = buildSchoolOperationsRequest('oraya git');
  assert(vagueNavigation?.request?.semanticScope?.class !== 'PRODUCT_EXPLICIT', 'vague navigation without a unique target remains non-explicit');

  // Attempt-02 RED coverage: ROOM is operational/read-only for shifts and
  // must never inherit the COMPANY-only guided create workflow.
  const roomCreate = resolveCanonicalConversationRequest({
    message: 'vardiya oluşturmak istiyorum',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    selectedEntity: null,
    conversationState: null,
    screenContext: { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assertScope(roomCreate, 'PRODUCT_EXPLICIT', 'ROOM role-aware product request');
  assert(roomCreate?.canonicalShape?.workflowModel?.id !== 'COMPANY_GUIDED_NEW_PLAN', 'ROOM never selects the COMPANY guided workflow');
  assert(roomCreate?.canonicalShape?.workflowIntent !== 'CREATE_SHIFT', 'ROOM create intent remains outside COMPANY create workflow');
  assert(roomCreate?.canonicalShape?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'ROOM create request resolves to the existing-shift surface');
  assert(roomCreate?.canonicalShape?.roleCapabilityBoundary === 'ROOM_CREATE_UNSUPPORTED', 'ROOM create request carries the role capability boundary');
  const roomStartGoal = resolveCanonicalConversationRequest({
    message: 'yeni vardiya planı başlatmak istiyorum',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    screenContext: { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assertAction(roomStartGoal, 'CREATE', 'SHIFT', 'ROOM create semantic meaning before policy');
  assert(roomStartGoal?.request?.operation === 'OPEN_EXISTING_SHIFT_OPERATIONS', 'ROOM create semantic meaning maps to the truthful operational surface');
  assert(roomStartGoal?.canonicalShape?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'ROOM create semantic meaning never selects COMPANY_GUIDED_NEW_PLAN');

  // Concrete pending-shift collection requests must remain product-scoped;
  // the generic product-help classifier must not erase their temporal/domain
  // evidence before the planner can resolve the authorized collection.
  for (const [label, message, expectedFamily] of [
    ['ROOM pending-shift suggestion', 'Bekleyen vardiyaları açıkla', 'COUNT'],
    ['ROOM pending-shift paraphrase', 'Beklemede olan vardiyaları ve hangi ekranda görebileceğimi anlat.', 'COUNT'],
    ['ROOM pending-shift deictic question', 'Şu anda hangi vardiyalar bekliyor?', 'COUNT'],
  ]) {
    const pendingRequest = resolveCanonicalConversationRequest({
      message,
      user: { role: 'ROOM', roomId: 1 },
      selectedEntity: null,
      conversationState: null,
      screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
      interpreterMode: 'DETERMINISTIC',
    });
    assert(pendingRequest?.canonicalShape?.taskType !== 'OFF_TOPIC', `${label} remains a product request`);
    assert(pendingRequest?.request?.semanticScope?.class === 'PRODUCT_EXPLICIT', `${label} keeps product scope`);
    const pendingPlan = resolveSemanticIntent({
      message,
      user: { role: 'ROOM', roomId: 1 },
      selectedEntity: null,
      conversationState: null,
      screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
      canonicalRequest: pendingRequest,
    });
    assert(pendingPlan?.family === expectedFamily, `${label} keeps the canonical family`);
    if (expectedFamily === 'COUNT') {
      assert(pendingPlan?.temporalMode === 'PENDING', `${label} preserves pending temporal scope`);
      assert(pendingPlan?.requestedDomains?.includes('SHIFTS'), `${label} preserves shift domain`);
    }
  }
  const pendingScreenRequest = resolveCanonicalConversationRequest({
    message: 'Beklemede olan vardiyaları ve hangi ekranda görebileceğimi anlat.',
    user: { role: 'ROOM', roomId: 1 },
    selectedEntity: { id: 211, type: 'SHIFT' },
    conversationState: null,
    screenContext: {
      path: '/room/shifts',
      label: 'Vardiyalar',
      role: 'ROOM',
      selectedEntityId: 211,
      selectedRecordId: 211,
      selectedEntityType: 'SHIFT',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(pendingScreenRequest?.canonicalShape?.taskType === 'COUNT', 'pending-shift collection is not rewritten by selected-screen context');
  assert(pendingScreenRequest?.request?.operation === 'COUNT_AUTHORIZED_RECORDS', 'pending-shift collection keeps the count operation with a selected screen record');

  // ROOM contract-to-shift relation regression: a request to show shifts
  // produced from the selected agreement is a relation lookup, not generic
  // shift-surface navigation or creative/off-topic text.
  for (const [label, message] of [
    ['ROOM contract-produced shifts', 'Sözleşmeden üretilen vardiyaları göster'],
    ['ROOM contract-produced shifts paraphrase', 'Sözleşmeden çıkan vardiyaları aç'],
    ['ROOM contract-bound shifts question', 'Bu sözleşmeye bağlı vardiyalar hangileri?'],
  ]) {
    const relationRequest = resolveCanonicalConversationRequest({
      message,
      user: { role: 'ROOM', roomId: 1, companyId: 2 },
      selectedEntity: { id: 184, type: 'AGREEMENT' },
      screenContext: {
        path: '/room/agreements',
        label: 'Sözleşmeler',
        role: 'ROOM',
        selectedLabel: 'Sözleşme ID 184',
        selectedEntityType: 'agreement',
        selectedEntityId: 184,
        uiHints: {
          visibleButtons: [{ label: 'Vardiyalar' }],
          pageTitles: ['Sözleşmeler'],
          activeTabs: ['Operasyon Köprüsü 1'],
        },
      },
      interpreterMode: 'DETERMINISTIC',
    });
    assert(relationRequest?.canonicalShape?.taskType === 'RELATION_LOOKUP', `${label} keeps relation lookup semantics`);
    assert(relationRequest?.request?.operation === 'LOOK_UP_RELATION', `${label} maps to the relation operation`);
    assert(relationRequest?.request?.semanticScope?.class === 'PRODUCT_EXPLICIT', `${label} remains product scoped`);
    assert(relationRequest?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'AGREEMENT' && Number(ref.id) === 184), `${label} keeps the selected agreement identity`);
    assert(!relationRequest?.request?.validation?.errors?.includes('OFF_TOPIC_PRODUCT_OPERATION_CONTRADICTION'), `${label} has no off-topic contradiction`);
  }
  const typoShiftCollection = resolveCanonicalConversationRequest({
    message: 'Sözleşmeden çıkan vardılar nerede?',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(typoShiftCollection?.canonicalShape?.taskType === 'RELATION_LOOKUP', 'Turkish inflected shift variant keeps relation lookup semantics');
  assert(typoShiftCollection?.canonicalShape?.domain === 'SHIFTS', 'Turkish inflected shift variant keeps the shift domain');
  assert(typoShiftCollection?.request?.operation === 'LOOK_UP_RELATION', 'Turkish inflected shift variant keeps relation operation');
  const relationWithStaleVehicleContext = resolveCanonicalConversationRequest({
    message: 'Sözleşmeden çıkan vardılar nerede?',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    selectedEntity: { id: 1, type: 'VEHICLE' },
    conversationState: {
      selectedEntityType: 'vehicle',
      selectedEntityId: 1,
      lastExplicitEntitySet: { type: 'vehicle', id: 1 },
    },
    screenContext: {
      path: '/room/shifts',
      label: 'Vardiyalar',
      role: 'ROOM',
      selectedEntityType: 'vehicle',
      selectedEntityId: 1,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(!relationWithStaleVehicleContext?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'VEHICLE'), 'relation collection does not inherit stale vehicle context');
  assert(relationWithStaleVehicleContext?.request?.requestedFields?.every((field) => !['GPS', 'LOCATION', 'GPS_STATUS'].includes(String(field).toUpperCase())), 'relation collection does not inherit stale vehicle GPS fields');
  const plannedRelationWithStaleVehicleContext = resolveSemanticIntent({
    message: 'Sözleşmeden çıkan vardılar nerede?',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    selectedEntity: { entityId: 1, entityType: 'vehicle' },
    conversationState: { selectedEntityType: 'vehicle', selectedEntityId: 1, lastExplicitEntitySet: [{ type: 'vehicle', id: 1 }] },
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM', selectedEntityType: 'vehicle', selectedEntityId: 1 },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(plannedRelationWithStaleVehicleContext?.family === 'RELATION_LOOKUP', 'relation collection stays a relation after planning');
  assert(!plannedRelationWithStaleVehicleContext?.entities?.some((entity) => entity?.type === 'vehicle'), 'planner does not retain stale vehicle entity for relation collection');
  assert(!plannedRelationWithStaleVehicleContext?.requestedFields?.some((field) => String(field?.key || '').toUpperCase() === 'GPS'), 'planner does not retain stale GPS field for relation collection');
  const relationMessage = 'Sözleşmeden üretilen vardiyaları göster';
  const relationCanonical = resolveCanonicalConversationRequest({
    message: relationMessage,
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    selectedEntity: { id: 184, type: 'AGREEMENT' },
    conversationState: { selectedEntity: { id: 184, type: 'agreement' }, recentMessages: [] },
    screenContext: {
      path: '/room/agreements',
      label: 'Sözleşmeler',
      role: 'ROOM',
      selectedEntityType: 'agreement',
      selectedEntityId: 184,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  const relationPlan = resolveSemanticIntent({
    message: relationMessage,
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    selectedEntity: { id: 184, type: 'agreement' },
    conversationState: { selectedEntity: { id: 184, type: 'agreement' }, recentMessages: [] },
    screenContext: {
      path: '/room/agreements',
      label: 'Sözleşmeler',
      role: 'ROOM',
      selectedEntityType: 'agreement',
      selectedEntityId: 184,
    },
    canonicalRequest: relationCanonical,
  });
  assert(relationPlan?.relationshipIntent?.kind === 'AGREEMENT_TO_SHIFT', 'planner preserves agreement-to-generated-shift relation');
  assert(relationPlan?.relationshipIntent?.fromEntity?.id === 184, 'planner preserves relation source record');
  assert(relationPlan?.relationshipIntent?.toEntity?.type === 'shift', 'planner preserves relation target type without inventing a record');
  // ROOM agreement presentation regression: details -> relation must retain
  // the verified details target as a bounded canonical previous step.
  const roomAgreementBackUser = { id: 901, role: 'ROOM', roomId: 1, companyId: 1, companyKind: 'COMPANY' };
  const roomAgreementBackSession = `room-agreement-back-${Date.now()}`;
  const roomAgreementBackScreen = {
    path: '/room/agreements',
    label: 'Sözleşmeler',
    role: 'ROOM',
    selectedEntityType: 'agreement',
    selectedEntityId: 184,
    selectedRecordId: 184,
    selectedLabel: 'Sözleşme #184',
  };
  clearCanonicalConversationState(roomAgreementBackUser, roomAgreementBackSession);
  const agreementDetailsPlan = {
    family: 'UI_GUIDANCE',
    dialogueTopic: 'PRODUCT',
    requestedDomains: ['AGREEMENTS'],
    entities: [{ type: 'agreement', id: 184, source: 'SELECTED_RECORD' }],
    canonicalRequest: { operation: 'NAVIGATE_AUTHORIZED_SURFACE' },
  };
  const agreementDetailsTarget = {
    status: 'FOUND',
    targetKey: 'room:agreements:agreement:184:operation-bridge',
    semanticId: 'product:room:agreement:184:operation-bridge',
    label: 'Kanıtlar ve ayrıntılar',
    semanticType: 'button',
    screenPath: '/room/agreements',
    role: 'ROOM',
    authorizedContext: { role: 'ROOM', screenPath: '/room/agreements', agreementId: 184 },
  };
  commitCanonicalConversationState({
    user: roomAgreementBackUser,
    screenContext: roomAgreementBackScreen,
    authSessionId: roomAgreementBackSession,
    message: 'Ayrıntılarını göster',
    payload: { reply: 'Sözleşme #184 ayrıntıları.', summary: 'Sözleşme #184 ayrıntıları.', semanticPlan: agreementDetailsPlan, guidedTarget: agreementDetailsTarget },
  });
  commitCanonicalConversationState({
    user: roomAgreementBackUser,
    screenContext: roomAgreementBackScreen,
    authSessionId: roomAgreementBackSession,
    message: 'Bu sözleşmeden oluşturulan vardiyaları göster',
    payload: {
      reply: 'Sözleşme #184 için bağlı üretilmiş vardiya bulunmuyor.',
      summary: 'Sözleşme #184 için bağlı üretilmiş vardiya bulunmuyor.',
      semanticPlan: { ...relationPlan, family: 'RELATION_LOOKUP', dialogueTopic: 'PRODUCT' },
      guidedTarget: { ...agreementDetailsTarget, targetKey: 'room:shifts:tab:contract', semanticId: 'product:room:shifts:tab:contract', label: 'Sözleşmeden Üretilen', semanticType: 'tab' },
    },
  });
  const agreementBackState = getCanonicalConversationState({ user: roomAgreementBackUser, screenContext: roomAgreementBackScreen, authSessionId: roomAgreementBackSession });
  assert(agreementBackState.conversationStepHistory?.[0]?.guidedTarget?.targetKey === agreementDetailsTarget.targetKey, 'agreement details target is retained as the canonical previous step');
  const agreementBackRequest = resolveCanonicalConversationRequest({ message: 'Geri', user: roomAgreementBackUser, conversationState: agreementBackState, screenContext: roomAgreementBackScreen, interpreterMode: 'DETERMINISTIC' });
  // BACK is a canonical-shape transition. The request envelope carries the
  // normalized continuation operation/action, while the direction belongs to
  // canonicalShape.continuationAction; request.continuationAction is not part
  // of the frozen request contract.
  assert(agreementBackRequest?.canonicalShape?.continuationAction === 'BACK', 'agreement BACK keeps the canonical BACK action with a prior step');
  assert(agreementBackRequest?.request?.operation === 'CONTINUE_EXPLANATION', 'agreement BACK keeps the canonical continuation operation');
  assert(agreementBackRequest?.request?.semanticAction?.actionClass === 'CONTINUE', 'agreement BACK keeps the canonical continuation semantic action');
  commitCanonicalConversationState({
    user: roomAgreementBackUser,
    screenContext: roomAgreementBackScreen,
    authSessionId: roomAgreementBackSession,
    message: 'Geri',
    payload: {
      reply: 'Sözleşme #184 ayrıntıları.',
      summary: 'Sözleşme #184 ayrıntıları.',
      semanticPlan: agreementDetailsPlan,
      guidedTarget: agreementDetailsTarget,
      conversationStepRestore: agreementBackState.conversationStepHistory[0],
      conversationStepForward: {
        authScopeVersion: agreementBackState.authScopeVersion,
        screenPath: roomAgreementBackScreen.path,
        selectedEntity: agreementBackState.entityContext.selectedEntity,
        semanticPlan: { ...relationPlan, family: 'RELATION_LOOKUP', dialogueTopic: 'PRODUCT' },
        guidedTarget: agreementBackState.guidedTarget,
        reply: 'Sözleşme #184 için bağlı üretilmiş vardiya bulunmuyor.',
        summary: 'Sözleşme #184 için bağlı üretilmiş vardiya bulunmuyor.',
      },
    },
  });
  const agreementBackRestoredState = getCanonicalConversationState({ user: roomAgreementBackUser, screenContext: roomAgreementBackScreen, authSessionId: roomAgreementBackSession });
  assert(agreementBackRestoredState.conversationForwardStep?.guidedTarget?.targetKey === 'room:shifts:tab:contract', 'agreement BACK retains a verified forward step');

  // A new, independent answer on the same surface must not inherit the
  // previous relation target.  The user-visible target belongs to the
  // current turn unless the turn is an explicit continuation/explanation.
  const agreementTargetResetSession = `room-agreement-target-reset-${Date.now()}`;
  const agreementTargetResetScreen = {
    ...roomAgreementBackScreen,
    uiHints: { visibleButtons: [{ label: 'Sözleşmeden Üretilen', targetKey: 'room:shifts:tab:contract', identitySource: 'CANONICAL' }] },
  };
  clearCanonicalConversationState(roomAgreementBackUser, agreementTargetResetSession);
  commitCanonicalConversationState({
    user: roomAgreementBackUser,
    screenContext: agreementTargetResetScreen,
    authSessionId: agreementTargetResetSession,
    message: 'Bu sözleşmeden oluşturulan vardiyaları göster',
    payload: {
      reply: 'Sözleşme #184 için bağlı üretilmiş vardiya bulunmuyor.',
      summary: 'Sözleşme #184 için bağlı üretilmiş vardiya bulunmuyor.',
      semanticPlan: { family: 'RELATION_LOOKUP', dialogueTopic: 'PRODUCT', relationshipIntent: { kind: 'AGREEMENT_TO_SHIFT' } },
      guidedTarget: { ...agreementDetailsTarget, targetKey: 'room:shifts:tab:contract', semanticId: 'product:room:shifts:tab:contract', label: 'Sözleşmeden Üretilen', semanticType: 'tab' },
    },
  });
  commitCanonicalConversationState({
    user: roomAgreementBackUser,
    screenContext: agreementTargetResetScreen,
    authSessionId: agreementTargetResetSession,
    message: 'İnceleme bekleyen sözleşmem var mı?',
    payload: {
      reply: '1 sözleşme kaydı.',
      summary: '1 sözleşme kaydı.',
      semanticPlan: { family: 'FIELD_LOOKUP', dialogueTopic: 'PRODUCT', requestedDomains: ['AGREEMENTS'] },
    },
  });
  const agreementTargetResetState = getCanonicalConversationState({ user: roomAgreementBackUser, screenContext: agreementTargetResetScreen, authSessionId: agreementTargetResetSession });
  assert(agreementTargetResetState.guidedTarget === null, 'independent agreement question clears the previous relation target');

  // Service-boundary regression: the public failure occurred after the state
  // commit rule had already been tested.  The response composer/resolver must
  // carry the same current-turn target decision into the returned payload;
  // otherwise an independent question can rehydrate the prior Vardiyalar
  // target even when the canonical state commit is correct.
  const staleTargetServiceSession = `room-agreement-found-to-null-service-${Date.now()}`;
  const staleTargetServiceUser = { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' };
  const staleTargetServiceScreen = {
    ...roomAgreementBackScreen,
    uiHints: {
      visibleButtons: [
        { label: 'Vardiyalar', targetKey: 'room:shifts', identitySource: 'CANONICAL' },
      ],
    },
  };
  clearCanonicalConversationState(staleTargetServiceUser, staleTargetServiceSession);
  const staleTargetServiceFound = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1106,
    user: staleTargetServiceUser,
    screenContext: staleTargetServiceScreen,
    message: '184 numaralı sözleşmeye bağlı vardiyaları göster',
    authSessionId: staleTargetServiceSession,
  });
  assert(staleTargetServiceFound?.guidedTarget?.status === 'FOUND', 'service found-to-null regression creates a real guided target');
  assert(staleTargetServiceFound?.guidedTarget?.targetKey === 'room:shifts', 'service found-to-null regression creates the canonical Vardiyalar target');
  const staleTargetServiceIndependent = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1106,
    user: staleTargetServiceUser,
    screenContext: staleTargetServiceScreen,
    message: 'İnceleme bekleyen sözleşmem var mı?',
    authSessionId: staleTargetServiceSession,
  });
  assert(/1 sözleşme kaydı/iu.test(String(staleTargetServiceIndependent?.reply || '')), 'service found-to-null regression preserves the independent agreement answer');
  assert(!staleTargetServiceIndependent?.guidedTarget, 'service found-to-null regression clears the independent response target');
  assert(staleTargetServiceIndependent?.conversationState?.guidedTarget === null, 'service found-to-null regression clears the returned conversation target');
  const staleTargetServiceState = getCanonicalConversationState({ user: staleTargetServiceUser, screenContext: staleTargetServiceScreen, authSessionId: staleTargetServiceSession });
  assert(staleTargetServiceState.guidedTarget === null, 'service found-to-null regression clears the persisted target');

  const roomRelationContinuationState = {
    lastSettledResult: { semanticPlan: relationPlan },
    recentMessages: [],
  };
  const roomRelationContinuationRequest = resolveCanonicalConversationRequest({
    message: 'Adım adım anlat',
    user: { role: 'ROOM', roomId: 1, companyKind: 'COMPANY' },
    conversationState: roomRelationContinuationState,
    screenContext: {
      path: '/room/shifts',
      label: 'Vardiyalar',
      role: 'ROOM',
      selectedEntityType: 'agreement',
      selectedEntityId: 184,
    },
    interpreterMode: 'DETERMINISTIC',
  });
  const roomRelationContinuationPlan = resolveSemanticIntent({
    message: 'Adım adım anlat',
    user: { role: 'ROOM', roomId: 1, companyKind: 'COMPANY' },
    conversationState: roomRelationContinuationState,
    screenContext: {
      path: '/room/shifts',
      label: 'Vardiyalar',
      role: 'ROOM',
      selectedEntityType: 'agreement',
      selectedEntityId: 184,
    },
    canonicalRequest: roomRelationContinuationRequest,
  });
  assert(roomRelationContinuationRequest?.request?.operation === 'CONTINUE_EXPLANATION', 'ROOM relation follow-up keeps continuation operation');
  assert(roomRelationContinuationPlan?.family === 'CONTINUE_CURRENT_REASONING', 'ROOM relation follow-up stays in continuation family');
  assert(roomRelationContinuationPlan?.continuationBasePlan?.family === 'RELATION_LOOKUP', 'ROOM relation follow-up preserves the settled relation task');
  assert(roomRelationContinuationPlan?.requestedDomains?.includes('SHIFTS'), 'ROOM relation follow-up preserves the shift domain');
  const relationExecution = await executeSemanticQueryPlan({
    plan: {
      ...relationPlan,
      relationshipIntent: relationPlan.relationshipIntent,
      requestedDomains: ['AGREEMENTS', 'SHIFTS'],
      entities: [{ type: 'agreement', id: 184 }],
      allowedDomains: ['AGREEMENTS', 'SHIFTS'],
      typedRequest: relationCanonical.request,
    },
    allowedDomains: ['AGREEMENTS', 'SHIFTS'],
    readDomain: async (domain, { entities }) => domain === 'AGREEMENTS'
      ? { count: entities.length, facts: [{ type: 'agreement', id: 184, status: 'ACTIVE', sourceShiftId: 14, generatedShiftIds: [], text: 'Agreement #184' }] }
      : { count: 1, facts: [{ type: 'shift', id: 14, shiftId: 14, agreementId: 184, text: 'Shift #14' }] },
  });
  assert(relationExecution?.reply?.includes('bağlı üretilmiş vardiya bulunmuyor'), 'authorized empty relationship receives a truthful user-facing answer');
  assert(!relationExecution?.reply?.includes('yetkili kanıtla doğrulanamadı'), 'authorized empty relationship is not collapsed into generic evidence failure');
  const generatedRelationExecution = await executeSemanticQueryPlan({
    plan: {
      ...relationPlan,
      relationshipIntent: relationPlan.relationshipIntent,
      requestedDomains: ['AGREEMENTS', 'SHIFTS'],
      entities: [{ type: 'agreement', id: 184 }],
      allowedDomains: ['AGREEMENTS', 'SHIFTS'],
      typedRequest: relationCanonical.request,
    },
    allowedDomains: ['AGREEMENTS', 'SHIFTS'],
    readDomain: async (domain, { entities }) => domain === 'AGREEMENTS'
      ? { count: entities.length, facts: [{ type: 'agreement', id: 184, status: 'ACTIVE', sourceShiftId: 14, generatedShiftIds: [22], text: 'Agreement #184' }] }
      : { count: 0, facts: [] },
  });
  assert(generatedRelationExecution?.reply?.includes('Vardiya #22'), 'generated relationship remains visible when its canonical generated id exists');
  const generatedShiftCollectionCanonical = resolveCanonicalConversationRequest({
    message: relationMessage,
    user: { role: 'ROOM', roomId: 1 },
    selectedEntity: null,
    conversationState: null,
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  const generatedShiftCollectionPlan = resolveSemanticIntent({
    message: relationMessage,
    user: { role: 'ROOM', roomId: 1 },
    selectedEntity: null,
    conversationState: null,
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    canonicalRequest: generatedShiftCollectionCanonical,
  });
  assert(generatedShiftCollectionPlan?.relationshipIntent?.kind === 'AGREEMENT_TO_SHIFT_COLLECTION', 'shift surface relation uses a typed generated-shift collection');
  const generatedShiftCollectionWithStaleAgreementState = {
    lastSettledResult: {
      semanticPlan: {
        entities: [{ type: 'agreement', id: 184, source: 'LAST_SETTLED_PRODUCT_CONTEXT' }],
      },
    },
    recentMessages: [],
  };
  const generatedShiftCollectionWithStaleAgreementCanonical = resolveCanonicalConversationRequest({
    message: relationMessage,
    user: { role: 'ROOM', roomId: 1 },
    selectedEntity: null,
    conversationState: generatedShiftCollectionWithStaleAgreementState,
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  const generatedShiftCollectionWithStaleAgreementPlan = resolveSemanticIntent({
    message: relationMessage,
    user: { role: 'ROOM', roomId: 1 },
    selectedEntity: null,
    conversationState: generatedShiftCollectionWithStaleAgreementState,
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    canonicalRequest: generatedShiftCollectionWithStaleAgreementCanonical,
  });
  assert(generatedShiftCollectionWithStaleAgreementPlan?.relationshipIntent?.kind === 'AGREEMENT_TO_SHIFT_COLLECTION', 'shift collection ignores a stale agreement conversation entity');
  assert(!generatedShiftCollectionWithStaleAgreementPlan?.entities?.some((entity) => entity?.type === 'agreement'), 'shift collection does not retain stale agreement entity');
  const generatedShiftCollectionExecution = await executeSemanticQueryPlan({
    plan: {
      ...generatedShiftCollectionPlan,
      requestedDomains: ['AGREEMENTS', 'SHIFTS'],
      entities: [],
      allowedDomains: ['AGREEMENTS', 'SHIFTS'],
      typedRequest: generatedShiftCollectionCanonical.request,
    },
    allowedDomains: ['AGREEMENTS', 'SHIFTS'],
    readDomain: async (domain) => domain === 'AGREEMENTS'
      ? { count: 1, facts: [{ type: 'agreement', id: 184, generatedShiftIds: [22], text: 'Agreement #184' }] }
      : { count: 2, facts: [
        { type: 'shift', id: 22, shiftId: 22, agreementId: 184, text: 'Shift #22' },
        { type: 'shift', id: 23, shiftId: 23, agreementId: null, text: 'Shift #23' },
      ] },
  });
  assert(generatedShiftCollectionExecution?.reply?.includes('Vardiya #22'), 'generated-shift collection returns an authorized generated shift');
  assert(!generatedShiftCollectionExecution?.reply?.includes('Vardiya #23'), 'generated-shift collection excludes unrelated non-contract shift');
  assert(!generatedShiftCollectionExecution?.reply?.includes('yetkili kanıtla doğrulanamadı'), 'generated-shift collection avoids generic relation evidence failure');
  const generatedShiftContinuationState = {
    lastSettledResult: { semanticPlan: generatedShiftCollectionPlan },
    recentMessages: [],
  };
  const generatedShiftContinuationRequest = resolveCanonicalConversationRequest({
    message: 'Adım adım anlat',
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    conversationState: generatedShiftContinuationState,
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  const generatedShiftContinuationPlan = resolveSemanticIntent({
    message: 'Adım adım anlat',
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    conversationState: generatedShiftContinuationState,
    screenContext: { path: '/room/shifts', label: 'Vardiyalar', role: 'ROOM' },
    canonicalRequest: generatedShiftContinuationRequest,
  });
  const generatedShiftContinuationExecution = await executeSemanticQueryPlan({
    plan: {
      ...generatedShiftContinuationPlan,
      relationshipIntent: generatedShiftCollectionPlan.relationshipIntent,
      requestedDomains: ['AGREEMENTS', 'SHIFTS'],
      entities: [],
      allowedDomains: ['AGREEMENTS', 'SHIFTS'],
      typedRequest: generatedShiftContinuationRequest.request,
    },
    allowedDomains: ['AGREEMENTS', 'SHIFTS'],
    readDomain: async (domain) => domain === 'AGREEMENTS'
      ? { count: 1, facts: [{ type: 'agreement', id: 184, generatedShiftIds: [22], text: 'Agreement #184' }] }
      : { count: 2, facts: [
        { type: 'shift', id: 22, shiftId: 22, agreementId: 184, text: 'Shift #22' },
        { type: 'shift', id: 23, shiftId: 23, agreementId: null, text: 'Shift #23' },
      ] },
  });
  assert(generatedShiftContinuationExecution?.reply?.includes('Adım adım'), 'generated-shift relation continuation remains task-specific');
  assert(generatedShiftContinuationExecution?.reply?.includes('Vardiya #22'), 'generated-shift relation continuation keeps authorized records');
  assert(!generatedShiftContinuationExecution?.reply?.includes('tek bir kayıt seçili değil'), 'generated-shift relation continuation does not require a fabricated single record');
  const generatedShiftBackExecution = await executeSemanticQueryPlan({
    plan: {
      ...generatedShiftContinuationPlan,
      continuationAction: 'BACK',
      continuationDepth: 2,
      relationshipIntent: generatedShiftCollectionPlan.relationshipIntent,
      requestedDomains: ['AGREEMENTS', 'SHIFTS'],
      entities: [],
      allowedDomains: ['AGREEMENTS', 'SHIFTS'],
      typedRequest: generatedShiftContinuationRequest.request,
    },
    allowedDomains: ['AGREEMENTS', 'SHIFTS'],
    readDomain: async (domain) => domain === 'AGREEMENTS'
      ? { count: 1, facts: [{ type: 'agreement', id: 184, generatedShiftIds: [22], text: 'Agreement #184' }] }
      : { count: 2, facts: [
        { type: 'shift', id: 22, shiftId: 22, agreementId: 184, text: 'Shift #22' },
        { type: 'shift', id: 23, shiftId: 23, agreementId: null, text: 'Shift #23' },
      ] },
  });
  assert(generatedShiftBackExecution?.reply?.includes('önceki ilişki adımına döndüm'), 'generated-shift relation back returns to the prior task step');
  assert(generatedShiftBackExecution?.reply?.includes('Vardiya #22'), 'generated-shift relation back keeps the authorized collection');
  const generatedShiftRecoveryExecution = await executeSemanticQueryPlan({
    plan: {
      ...generatedShiftContinuationPlan,
      continuationAction: 'RECOVER',
      relationshipIntent: generatedShiftCollectionPlan.relationshipIntent,
      requestedDomains: ['AGREEMENTS', 'SHIFTS'],
      entities: [],
      allowedDomains: ['AGREEMENTS', 'SHIFTS'],
      typedRequest: generatedShiftContinuationRequest.request,
    },
    allowedDomains: ['AGREEMENTS', 'SHIFTS'],
    readDomain: async (domain) => domain === 'AGREEMENTS'
      ? { count: 1, facts: [{ type: 'agreement', id: 184, generatedShiftIds: [22], text: 'Agreement #184' }] }
      : { count: 2, facts: [
        { type: 'shift', id: 22, shiftId: 22, agreementId: 184, text: 'Shift #22' },
        { type: 'shift', id: 23, shiftId: 23, agreementId: null, text: 'Shift #23' },
      ] },
  });
  assert(generatedShiftRecoveryExecution?.reply?.includes('Sözleşmeden Üretilen sekmesinden'), 'generated-shift relation recovery points to the supported surface');
  assert(generatedShiftRecoveryExecution?.reply?.includes('Vardiya #22'), 'generated-shift relation recovery keeps the authorized collection');

  // ROOM selected-record relation regression: selected vehicle/driver
  // assignment questions must remain typed relation lookups rather than
  // generic surface help or status fields, and their read-only targets must
  // resolve to the existing canonical tabs.
  const relationTargetCases = [
    {
      label: 'selected vehicle shift relation',
      message: 'Vardiya bağını göster',
      path: '/room/vehicles',
      selectedEntityType: 'vehicle',
      selectedEntityId: 1,
      relationKind: 'VEHICLE_TO_SHIFT',
      targetKey: 'room:vehicles:tab:assignments',
      semanticId: 'product:room:vehicles:tab:assignments',
    },
    {
      label: 'selected driver assignment relation',
      message: 'Atama ve bağlantı durumunu göster',
      path: '/room/drivers',
      selectedEntityType: 'driver',
      selectedEntityId: 1,
      relationKind: 'DRIVER_TO_SHIFT',
      targetKey: 'room:drivers:tab:shifts',
      semanticId: 'product:room:drivers:tab:shifts',
    },
    {
      label: 'contract-produced shift collection target',
      message: 'Sözleşmeden üretilen vardiyaları göster',
      path: '/room/shifts',
      selectedEntityType: null,
      selectedEntityId: null,
      relationKind: 'AGREEMENT_TO_SHIFT_COLLECTION',
      targetKey: 'room:shifts:tab:contract',
      semanticId: 'product:room:shifts:tab:contract',
    },
  ];
  for (const relationCase of relationTargetCases) {
    const relationScreenContext = {
      path: relationCase.path,
      role: 'ROOM',
      selectedEntityType: relationCase.selectedEntityType,
      selectedEntityId: relationCase.selectedEntityId,
      uiHints: {
        activeTabs: [{
          identitySource: 'CANONICAL',
          targetKey: relationCase.targetKey,
          semanticId: relationCase.semanticId,
          label: relationCase.targetKey,
          semanticType: 'tab',
        }],
      },
    };
    const relationCanonical = resolveCanonicalConversationRequest({
      message: relationCase.message,
      user: { role: 'ROOM', companyId: 1 },
      screenContext: relationScreenContext,
    });
    const relationPlan = resolveSemanticIntent({
      message: relationCase.message,
      user: { role: 'ROOM', companyId: 1 },
      screenContext: relationScreenContext,
      canonicalRequest: relationCanonical.request,
    });
    assert(relationCanonical.request?.operation === 'LOOK_UP_RELATION', `${relationCase.label} keeps relation operation`);
    assert(relationPlan?.family === 'RELATION_LOOKUP', `${relationCase.label} keeps relation family`);
    assert(relationPlan?.relationshipIntent?.kind === relationCase.relationKind, `${relationCase.label} keeps typed relation kind`);
    const relationTarget = resolveCopilotGuidedTarget({
      user: { role: 'ROOM', companyId: 1 },
      screenContext: relationScreenContext,
      semanticPlan: relationPlan,
      message: relationCase.message,
    });
    assert(relationTarget?.status === 'FOUND', `${relationCase.label} resolves a canonical target`);
    assert(relationTarget?.targetKey === relationCase.targetKey, `${relationCase.label} preserves the canonical target key`);
    assert(relationTarget?.safeAction === 'NAVIGATE', `${relationCase.label} remains a read-only navigation action`);
  }
  const sparseVehicleRelationTarget = resolveCopilotGuidedTarget({
    user: { role: 'ROOM', companyId: 1 },
    screenContext: {
      path: '/room/vehicles',
      role: 'ROOM',
      selectedEntityType: 'vehicle',
      selectedEntityId: 1,
      // Only the currently active tab is transported. The canonical
      // relation target is an authorized inactive tab on this same surface.
      uiHints: { activeTabs: [{ identitySource: 'CANONICAL', targetKey: 'room:vehicles:tab:status', semanticId: 'product:room:vehicles:tab:status', label: 'Durum', semanticType: 'tab' }] },
    },
    // Exercise the production response boundary: the canonical relation
    // operation and selected source survive even when a reduced response
    // envelope omits the expanded relationshipIntent object.
    semanticPlan: {
      family: 'RELATION_LOOKUP',
      canonicalRequest: { operation: 'LOOK_UP_RELATION', typedEvidence: { entityType: 'vehicle' } },
      typedRequest: {},
    },
    message: 'Vardiya bağını göster',
  });
  assert(sparseVehicleRelationTarget?.status === 'FOUND', 'vehicle relation target survives sparse active-tab hints');
  assert(sparseVehicleRelationTarget?.targetKey === 'room:vehicles:tab:assignments', 'sparse vehicle relation keeps canonical assignments target');
  const genericProducedShifts = resolveCanonicalConversationRequest({
    message: 'Üretilen vardiyaları göster',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    selectedEntity: { id: 184, type: 'AGREEMENT' },
    screenContext: { path: '/room/agreements', label: 'Sözleşmeler', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(genericProducedShifts?.canonicalShape?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'generic produced-shifts request remains surface navigation');

  // Production-path regression: a valid canonical evidence request must not
  // be replaced by the independent raw-text cost classifier downstream.
  // This intentionally exercises runCopilotFoundation, the same service path
  // used by /api/ai/copilot, rather than asserting only the interpreter.
  const serviceSchoolEvidence = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    screenContext: { path: '/school/operations', label: 'School Operations' },
    message: 'Bu servis planında hangi kanıtlara bakmalıyım?',
    authSessionId: `canonical-core-school-${Date.now()}`,
  });
  assert(serviceSchoolEvidence?.semanticPlan?.canonicalRequest?.operation === 'CHECK_EVIDENCE_SUFFICIENCY', 'service keeps unseen SCHOOL evidence operation');
  assert(serviceSchoolEvidence?.semanticPlan?.canonicalRequest?.domain === 'OPERATIONS', 'service keeps unseen SCHOOL operations domain');
  assert(serviceSchoolEvidence?.semanticPlan?.canonicalRequest?.capability === 'EVIDENCE_SUFFICIENCY', 'service keeps unseen SCHOOL evidence capability');
  // With no selected plan or record, the canonical operation remains an
  // evidence-sufficiency request, but the user-facing route must fail closed
  // into safe clarification rather than inventing evidence or financial data.
  // The previous assertion required an EVIDENCE_SUFFICIENCY planner family
  // despite the canonical request carrying an unresolved referent; that was a
  // stale harness expectation, not a product authorization failure.
  assert(serviceSchoolEvidence?.semanticPlan?.family === 'UNCLEAR_OR_AMBIGUOUS', 'service keeps safe clarification for unseen SCHOOL evidence without a selected referent');
  assert(/hangi kayıt veya konuyu|kayıt türünü/iu.test(String(serviceSchoolEvidence?.reply || '')), 'service explains the missing SCHOOL evidence referent');
  assert(!/₺|\b(?:tl|tutar|maliyet|fatura|hakediş)\b/iu.test(String(serviceSchoolEvidence?.reply || '')), 'service does not expose unauthorized SCHOOL financial evidence');
  assert(serviceSchoolEvidence?.questionType !== 'COST_REASONING', 'service does not replace canonical SCHOOL evidence with cost reasoning');

  const serviceSchoolAgreements = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    screenContext: { path: '/school/operations', label: 'Okul Operasyon Paneli' },
    message: 'Sözleşmeler ekranını aç',
    authSessionId: `canonical-core-school-agreements-${Date.now()}`,
  });
  assert(serviceSchoolAgreements?.semanticPlan?.workflowIntent === 'OPEN_AGREEMENTS_SURFACE', 'service resolves SCHOOL agreements navigation');
  assert(serviceSchoolAgreements?.questionType === 'AUTHORIZED_DOMAIN_UI_GUIDANCE', 'SCHOOL agreements navigation remains authorized UI guidance');
  assert(serviceSchoolAgreements?.readOnly === true, 'SCHOOL agreements navigation remains read-only');

  // ROOM real-user continuity RED: after a screen suggestion has established
  // the current surface, a natural screen-focus paraphrase must remain a
  // screen explanation.  The follow-up expander must not rewrite it into a
  // selected-record next-action question when no record is selected.
  const roomFinancialSequenceSession = `canonical-core-room-financial-sequence-${Date.now()}`;
  const roomFinancialSequenceBase = {
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    screenContext: { path: '/room/financial-operations', label: 'Finansal Operasyonlar', role: 'ROOM' },
    authSessionId: roomFinancialSequenceSession,
  };
  await runCopilotFoundation({ ...roomFinancialSequenceBase, message: 'Bu ekranda neye bakmalıyım?' });
  const roomFinancialSequenceVariant = await runCopilotFoundation({
    ...roomFinancialSequenceBase,
    message: 'Bu finans ekranında önce neyi kontrol edeyim?',
  });
  assert(roomFinancialSequenceVariant?.semanticPlan?.canonicalRequest?.operation === 'EXPLAIN_CURRENT_SURFACE', 'ROOM financial follow-up keeps current-surface explanation operation');
  assert(!/bu seçili kayıt için şimdi ne yapmalıyım\??/iu.test(String(roomFinancialSequenceVariant?.reply || '')), 'ROOM financial follow-up does not collapse to unselected-record next action');
  assert(/(?:karlılık|teklif tabanı|bütçe)/iu.test(String(roomFinancialSequenceVariant?.reply || '')), 'ROOM financial follow-up names the financial screen purpose');
  assert(!/seçili kayıt/iu.test(String(roomFinancialSequenceVariant?.reply || '')), 'ROOM financial follow-up does not invent a selected record without one');
  const roomFinancialNaturalServiceVariant = await runCopilotFoundation({
    ...roomFinancialSequenceBase,
    message: 'Finansal operasyonlarda önce neye bakılır?',
  });
  assert(roomFinancialNaturalServiceVariant?.semanticPlan?.canonicalRequest?.operation === 'EXPLAIN_CURRENT_SURFACE', 'ROOM financial natural variant keeps current-surface explanation operation');
  // The service response exposes the canonical screen-knowledge projection on
  // semanticPlan itself; canonicalRequest is the transport envelope and does
  // not carry the legacy nested canonicalShape projection.
  assert(roomFinancialNaturalServiceVariant?.semanticPlan?.screenKnowledgeKind === 'SCREEN_FOCUS', 'ROOM financial natural variant remains screen-focused');
  assert(/(?:karlılık|teklif tabanı|bütçe)/iu.test(String(roomFinancialNaturalServiceVariant?.reply || '')), 'ROOM financial natural variant names the financial screen purpose');
  assert(!/seçili kayıt/iu.test(String(roomFinancialNaturalServiceVariant?.reply || '')), 'ROOM financial natural variant does not invent a selected record without one');
  const roomFinancialUnseenNextActionService = await runCopilotFoundation({
    ...roomFinancialSequenceBase,
    screenContext: {
      ...roomFinancialSequenceBase.screenContext,
      selectedEntityType: 'shift',
      selectedEntityId: 168,
    },
    message: 'Bu kârlılık ekranında şimdi hangi güvenli adıma geçmeliyim?',
  });
  assert(roomFinancialUnseenNextActionService?.semanticPlan?.canonicalRequest?.operation === 'RESOLVE_NEXT_SAFE_ACTION', 'ROOM unseen financial next-action service keeps safe-action operation');
  assert(roomFinancialUnseenNextActionService?.semanticPlan?.family === 'UI_GUIDANCE', 'ROOM unseen financial next-action service stays UI guidance');
  assert(/(?:karlılık|teklif tabanı|bütçe)/iu.test(String(roomFinancialUnseenNextActionService?.reply || '')), 'ROOM unseen financial next-action service uses the current screen catalog');
  assert(!/\d+\s+(?:bütçe ve maliyet|vardiya|mali kayıt).*kayıt/iu.test(String(roomFinancialUnseenNextActionService?.reply || '')), 'ROOM unseen financial next-action service does not prepend unrelated domain counts');
  assert(!/İlgili yetkili kaydı açıp eksik bağı doğrula/iu.test(String(roomFinancialUnseenNextActionService?.reply || '')), 'ROOM unseen financial next-action service does not fall back to generic record guidance');
  const roomFinancialChipNextActionWithoutSelection = await runCopilotFoundation({
    ...roomFinancialSequenceBase,
    message: 'Sıradaki doğru işlem ne?',
  });
  assert(roomFinancialChipNextActionWithoutSelection?.semanticPlan?.canonicalRequest?.operation === 'RESOLVE_NEXT_SAFE_ACTION', 'ROOM financial chip next-action keeps safe-action operation without selected record');
  assert(roomFinancialChipNextActionWithoutSelection?.semanticPlan?.family === 'UI_GUIDANCE', 'ROOM financial chip next-action stays UI guidance without selected record');
  assert(/(?:karlılık|teklif tabanı|bütçe)/iu.test(String(roomFinancialChipNextActionWithoutSelection?.reply || '')), 'ROOM financial chip next-action uses the current screen catalog without selected record');
  assert(!/Karar önceliği|Bunu şu yetkili kayıtları birlikte okuyarak söylüyorum/iu.test(String(roomFinancialChipNextActionWithoutSelection?.reply || '')), 'ROOM financial chip next-action does not fall back to cross-domain priority synthesis');

  // ROOM real-user offer continuity regression: a settled offer-surface task
  // must remain the semantic base for step-by-step teaching even when it is
  // stored as the latest product result rather than an active guided task.
  const roomOfferContinuityUser = { role: 'ROOM', roomId: 1, companyKind: 'COMPANY' };
  const roomOfferContinuityScreen = {
    path: '/room/offers',
    label: 'Teklifler',
    role: 'ROOM',
    selectedEntityType: 'offer',
    selectedEntityId: 37,
  };
  const roomOfferSurfacePlan = {
    family: 'UI_GUIDANCE',
    workflowIntent: 'OPEN_OFFER_SURFACE',
    dialogueTopic: 'PRODUCT',
    requestedDomains: ['OFFERS'],
    entities: [{ type: 'offer', id: 37, source: 'SELECTED_RECORD' }],
    workflowModel: null,
  };
  const roomOfferSettledState = {
    lastSettledResult: { semanticPlan: roomOfferSurfacePlan },
    recentMessages: [],
  };
  const roomOfferStepByStepRequest = resolveCanonicalConversationRequest({
    message: 'Adım adım anlat',
    user: roomOfferContinuityUser,
    conversationState: roomOfferSettledState,
    screenContext: roomOfferContinuityScreen,
    interpreterMode: 'DETERMINISTIC',
  });
  const roomOfferStepByStepPlan = resolveSemanticIntent({
    message: 'Adım adım anlat',
    user: roomOfferContinuityUser,
    conversationState: roomOfferSettledState,
    screenContext: roomOfferContinuityScreen,
    canonicalRequest: roomOfferStepByStepRequest,
  });
  assert(roomOfferStepByStepPlan?.family === 'CONTINUE_CURRENT_REASONING', 'ROOM offer step-by-step follow-up stays in the continuation family');
  assert(roomOfferStepByStepPlan?.workflowIntent === 'OPEN_OFFER_SURFACE', 'ROOM offer step-by-step follow-up preserves the settled offer-surface task');
  assert(roomOfferStepByStepRequest?.request?.operation === 'CONTINUE_EXPLANATION', 'ROOM offer step-by-step follow-up keeps the canonical continuation operation');

  const roomOfferStageReviewRequest = resolveCanonicalConversationRequest({
    message: 'Teklifleri aşama aşama inceleyelim.',
    user: roomOfferContinuityUser,
    conversationState: roomOfferSettledState,
    screenContext: roomOfferContinuityScreen,
    interpreterMode: 'DETERMINISTIC',
  });
  const roomOfferStageReviewPlan = resolveSemanticIntent({
    message: 'Teklifleri aşama aşama inceleyelim.',
    user: roomOfferContinuityUser,
    conversationState: roomOfferSettledState,
    screenContext: roomOfferContinuityScreen,
    canonicalRequest: roomOfferStageReviewRequest,
  });
  assert(roomOfferStageReviewPlan?.family === 'CONTINUE_CURRENT_REASONING', 'ROOM offer stage-by-stage review stays in the continuation family');
  assert(roomOfferStageReviewPlan?.workflowIntent === 'OPEN_OFFER_SURFACE', 'ROOM offer stage-by-stage review preserves the settled offer-surface task');
  assert(roomOfferStageReviewRequest?.request?.operation === 'CONTINUE_EXPLANATION', 'ROOM offer stage-by-stage review keeps the canonical continuation operation');

  // ROOM offer collection regression: an explicit collection/surface request
  // must not inherit the currently selected offer as a record target. A
  // concrete "bu teklif" or "Teklif #37" request remains record-specific.
  const roomOfferCollectionScreen = {
    ...roomOfferContinuityScreen,
    selectedLabel: 'Teklif #37',
  };
  const roomOfferCollectionRequest = resolveCanonicalConversationRequest({
    message: 'Tekliflerimi görmek istiyorum.',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: roomOfferCollectionScreen,
    interpreterMode: 'DETERMINISTIC',
  });
  assert(!roomOfferCollectionRequest?.request?.candidateEntityRefs?.some((ref) => ref?.source === 'LIVE_CONTEXT_CANDIDATE'), 'ROOM offer collection does not inherit the selected offer as a live record candidate');
  const roomOfferCollectionPlan = resolveSemanticIntent({
    message: 'Tekliflerimi görmek istiyorum.',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: roomOfferCollectionScreen,
    canonicalRequest: roomOfferCollectionRequest,
  });
  assert(roomOfferCollectionPlan?.family === 'UI_GUIDANCE', 'ROOM offer collection remains surface guidance with a selected offer visible');
  assert(roomOfferCollectionPlan?.workflowIntent === 'OPEN_OFFER_SURFACE', 'ROOM offer collection preserves the offer-surface workflow');
  const roomOfferCollectionVisibleAnswer = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: roomOfferContinuityUser,
    message: 'Tekliflerimi gösterir misin?',
    screenContext: {
      path: '/room/offers',
      label: 'Teklifler',
      role: 'ROOM',
      selectedEntityType: null,
      selectedEntityId: null,
      selectedRecordId: null,
    },
    authSessionId: 'canonical-room-offer-collection-regression',
  });
  assert(roomOfferCollectionVisibleAnswer?.semanticPlan?.canonicalRequest?.operation === 'VIEW_AUTHORIZED_SURFACE', 'ROOM unseen offer collection keeps the canonical view operation');
  assert(Number(roomOfferCollectionVisibleAnswer?.count || 0) >= 0, 'ROOM offer collection returns a bounded authorized count');
  assert(!/^Şu anda Teklifler ekranındasın\./u.test(String(roomOfferCollectionVisibleAnswer?.reply || '')), 'ROOM offer collection does not stop at generic same-screen guidance');
  assert(/(?:yetkili teklif kaydı|teklif #)/iu.test(String(roomOfferCollectionVisibleAnswer?.reply || '')), 'ROOM offer collection visibly answers with the authorized collection result');
  const roomOfferNamedCollectionPlan = resolveSemanticIntent({
    message: 'Bana gelen teklifler hangileri?',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      ...roomOfferCollectionScreen,
      path: '/room/offers',
      label: 'Teklifler',
      selectedEntityType: null,
      selectedEntityId: null,
    },
  });
  assert(roomOfferNamedCollectionPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT', 'ROOM named offer collection is not reduced to scalar COUNT');
  assert(roomOfferNamedCollectionPlan?.typedRequest?.collectionSummaryIntent === true, 'ROOM named offer collection preserves collection summary intent');
  assert(roomOfferNamedCollectionPlan?.workflowIntent === 'OPEN_OFFER_SURFACE', 'ROOM named offer collection preserves the offer-surface workflow');
  const roomOfferNaturalNavigationScreen = {
    ...roomOfferContinuityScreen,
    path: '/room/shifts',
    label: 'Vardiyalar',
    selectedEntityType: null,
    selectedEntityId: null,
  };
  for (const message of ['Teklifleri açar mısın?', 'Tekliflere bakabilir miyiz?']) {
    const naturalOfferNavigationRequest = resolveCanonicalConversationRequest({
      message,
      user: roomOfferContinuityUser,
      conversationState: null,
      screenContext: roomOfferNaturalNavigationScreen,
      interpreterMode: 'DETERMINISTIC',
    });
    // Opening a different authorized surface is a navigation operation. The
    // later polite-opening regression already uses this canonical operation;
    // requiring VIEW here was a stale duplicate expectation.
    assert(naturalOfferNavigationRequest?.request?.operation === 'NAVIGATE_AUTHORIZED_SURFACE', `ROOM unseen offer navigation keeps a navigation operation: ${message}`);
    const naturalOfferNavigationPlan = resolveSemanticIntent({
      message,
      user: roomOfferContinuityUser,
      conversationState: null,
      screenContext: roomOfferNaturalNavigationScreen,
      canonicalRequest: naturalOfferNavigationRequest,
    });
    assert(naturalOfferNavigationPlan?.workflowIntent === 'OPEN_OFFER_SURFACE', `ROOM unseen offer navigation preserves the offer-surface workflow: ${message}`);
    assert(naturalOfferNavigationPlan?.family === 'UI_GUIDANCE', `ROOM unseen offer navigation remains user guidance: ${message}`);
  }
  const naturalOfferCollectionRequest = resolveCanonicalConversationRequest({
    message: 'Teklifleri bir açar mısın?',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: roomOfferCollectionScreen,
    interpreterMode: 'DETERMINISTIC',
  });
  assert(naturalOfferCollectionRequest?.request?.operation === 'NAVIGATE_AUTHORIZED_SURFACE', 'ROOM polite offer opening keeps navigation operation');
  assert(naturalOfferCollectionRequest?.request?.capability === 'OPEN_OFFER_SURFACE', 'ROOM polite offer opening keeps offer surface capability');
  const naturalOfferCollectionPlan = resolveSemanticIntent({
    message: 'Teklifleri bir açar mısın?',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: roomOfferCollectionScreen,
    canonicalRequest: naturalOfferCollectionRequest,
  });
  assert(naturalOfferCollectionPlan?.workflowIntent === 'OPEN_OFFER_SURFACE', 'ROOM polite offer opening preserves offer workflow');
  assert(naturalOfferCollectionPlan?.family === 'UI_GUIDANCE', 'ROOM polite offer opening remains user guidance');
  const explicitOfferDetailRequest = resolveCanonicalConversationRequest({
    message: 'Bu teklifin detayını göster.',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: roomOfferCollectionScreen,
    interpreterMode: 'DETERMINISTIC',
  });
  assert(explicitOfferDetailRequest?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'OFFER' && Number(ref.id) === 37), 'ROOM explicit selected-offer detail keeps the selected offer identity');

  const roomOfferBackRequest = resolveCanonicalConversationRequest({
    message: 'Geri',
    user: roomOfferContinuityUser,
    conversationState: {
      lastSettledResult: { semanticPlan: roomOfferSurfacePlan },
      recentMessages: [{ role: 'assistant', text: 'Şu anda Teklifler ekranındasın.', semanticPlan: roomOfferSurfacePlan }],
    },
    screenContext: roomOfferContinuityScreen,
    interpreterMode: 'DETERMINISTIC',
  });
  const roomOfferBackPlan = resolveSemanticIntent({
    message: 'Geri',
    user: roomOfferContinuityUser,
    conversationState: {
      lastSettledResult: { semanticPlan: roomOfferSurfacePlan },
      recentMessages: [{ role: 'assistant', text: 'Şu anda Teklifler ekranındasın.', semanticPlan: roomOfferSurfacePlan }],
    },
    screenContext: roomOfferContinuityScreen,
    canonicalRequest: roomOfferBackRequest,
  });
  assert(roomOfferBackPlan?.family === 'CONTINUE_CURRENT_REASONING', 'ROOM offer back stays in the continuation family');
  assert(roomOfferBackPlan?.continuationAction === 'BACK', 'ROOM offer back preserves the BACK continuation action');
  assert(roomOfferBackPlan?.workflowIntent === 'OPEN_OFFER_SURFACE', 'ROOM offer back preserves the offer-surface workflow');

  // ROOM selected-offer next action regression: a valid selected offer must
  // retain its record identity in the visible answer instead of collapsing to
  // generic offers-screen help.
  const roomSelectedOfferNextAction = buildCurrentScreenNextActionAnswer({
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    semanticPlan: {
      family: 'UI_GUIDANCE',
      scopeTarget: 'CURRENT_SCREEN',
      typedRequest: { taskType: 'NEXT_ACTION' },
      entities: [{ type: 'offer', id: 36, source: 'SCREEN_RECORD' }],
    },
    screenContext: {
      path: '/room/offers',
      label: 'Teklifler',
      selectedEntityType: 'offer',
      selectedEntityId: 36,
      selectedRecordSummary: 'Teklif #36 • Açık • DemoCompany',
    },
    role: 'ROOM',
    domainMap: { domains: ['OFFERS'] },
  });
  assert(/Teklif #36/iu.test(String(roomSelectedOfferNextAction?.reply || '')), 'ROOM selected-offer next action keeps selected offer identity');
  assert(/bağlı vardiya|araç\/sürücü|kabul.*karşı teklif/iu.test(String(roomSelectedOfferNextAction?.reply || '')), 'ROOM selected-offer next action stays concrete and read-only');
  assert(!/^Teklifler ekranındasın\./iu.test(String(roomSelectedOfferNextAction?.reply || '')), 'ROOM selected-offer next action does not collapse to generic screen guidance');
  const roomSelectedOfferUnseenNextAction = resolveCanonicalConversationRequest({
    message: 'Bu teklif için bundan sonra hangi güvenli kontrolü yapmalıyım?',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      ...roomOfferContinuityScreen,
      selectedEntityId: 36,
      selectedRecordId: 36,
      selectedRecordType: 'offer',
      selectedRecordSummary: 'Teklif #36 • Açık • DemoCompany',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(roomSelectedOfferUnseenNextAction?.request?.operation === 'RESOLVE_NEXT_SAFE_ACTION', 'ROOM unseen selected-offer next-action paraphrase keeps safe-action operation');
  assert(roomSelectedOfferUnseenNextAction?.canonicalShape?.taskType === 'NEXT_ACTION', 'ROOM unseen selected-offer next-action paraphrase stays actionable');
  const roomSelectedOfferRiskRequest = resolveCanonicalConversationRequest({
    message: 'Riskleri sırala',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      ...roomOfferContinuityScreen,
      selectedEntityId: 36,
      selectedRecordId: 36,
      selectedRecordType: 'offer',
      selectedRecordSummary: 'Teklif #36 • Açık • DemoCompany',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  const roomSelectedOfferRiskPlan = resolveSemanticIntent({
    message: 'Riskleri sırala',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      ...roomOfferContinuityScreen,
      selectedEntityId: 36,
      selectedRecordId: 36,
      selectedRecordType: 'offer',
      selectedRecordSummary: 'Teklif #36 • Açık • DemoCompany',
    },
    canonicalRequest: roomSelectedOfferRiskRequest,
  });
  assert(roomSelectedOfferRiskRequest?.request?.operation === 'ASSESS_CURRENT_RISK', 'ROOM selected-offer risk request keeps risk operation');
  assert(roomSelectedOfferRiskPlan?.scopeTarget === 'SELECTED_RECORD', 'ROOM selected-offer risk stays selected-record scoped');
  assert(roomSelectedOfferRiskPlan?.family === 'RISK_RANKING', 'ROOM selected-offer risk keeps risk-ranking family');

  const roomOfferRiskWithoutSelection = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: roomOfferContinuityUser,
    screenContext: {
      ...roomOfferContinuityScreen,
      selectedEntityId: null,
      selectedRecordId: null,
      selectedRecordType: '',
      selectedRecordSummary: '',
    },
    message: 'Riskleri sırala',
    authSessionId: `canonical-core-room-offer-risk-no-selection-${Date.now()}`,
  });
  assert(roomOfferRiskWithoutSelection?.semanticPlan?.family === 'RISK_RANKING', 'ROOM no-selection offer risk keeps risk-ranking family');
  assert(roomOfferRiskWithoutSelection?.reply?.includes('önce listeden bir teklif seçmelisin'), 'ROOM no-selection offer risk requests a selected offer');
  assert(!/Vardiya #165|Vardiya #167|en pahalı doğrulanmış rota/iu.test(roomOfferRiskWithoutSelection?.reply || ''), 'ROOM no-selection offer risk does not substitute a role-global route result');

  const roomFinancialRiskWithoutSelection = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: roomOfferContinuityUser,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
    },
    message: 'Riskleri sırala',
    authSessionId: `canonical-core-room-financial-risk-${Date.now()}`,
  });
  assert(roomFinancialRiskWithoutSelection?.provider === 'local-authorized-financial-screen-risk', 'ROOM financial screen risk stays with the financial screen owner');
  assert(/Finansal Operasyonlar ekranındaki riskleri/iu.test(String(roomFinancialRiskWithoutSelection?.reply || '')), 'ROOM financial screen risk answer names the current surface');
  assert(!/Vardiya #165|Vardiya #167|en pahalı doğrulanmış rota/iu.test(String(roomFinancialRiskWithoutSelection?.reply || '')), 'ROOM financial screen risk does not substitute a route comparison');
  assert(roomFinancialRiskWithoutSelection?.readOnly === true, 'ROOM financial screen risk remains read-only');

  const sharedNotificationRiskRequest = resolveCanonicalConversationRequest({
    message: 'Riskleri sırala',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      path: '/shared/notifications',
      label: 'Bildirimler',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
      selectedRecordType: '',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  const sharedNotificationRiskPlan = resolveSemanticIntent({
    message: 'Riskleri sırala',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      path: '/shared/notifications',
      label: 'Bildirimler',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
      selectedRecordType: '',
    },
    canonicalRequest: sharedNotificationRiskRequest,
  });
  assert(sharedNotificationRiskRequest?.canonicalShape?.domain === null, 'shared-screen generic risk has no invented financial domain');
  assert(sharedNotificationRiskPlan?.requestedDomains?.length === 0, 'shared-screen generic risk remains screen-scoped without a synthetic domain');
  assert(sharedNotificationRiskPlan?.family === 'RISK_RANKING', 'shared-screen generic risk keeps the risk task family');
  const sharedNotificationRiskResponse = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: roomOfferContinuityUser,
    screenContext: {
      path: '/shared/notifications',
      label: 'Bildirimler',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
    },
    message: 'Riskleri sırala',
    authSessionId: `canonical-core-shared-risk-${Date.now()}`,
  });
  assert(!/Vardiya #165|Vardiya #167|rota maliyet|en pahalı doğrulanmış/iu.test(String(sharedNotificationRiskResponse?.reply || '')), 'shared-screen generic risk does not leak unrelated finance/route analysis');
  assert(sharedNotificationRiskResponse?.semanticPlan?.requestedDomains?.length === 0, 'shared-screen generic risk response keeps empty domain scope');

  const sharedFeedbackRiskResponse = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: roomOfferContinuityUser,
    screenContext: {
      path: '/shared/feedback',
      label: 'Geri Bildirim',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
    },
    message: 'Riskleri sırala',
    authSessionId: `canonical-core-feedback-risk-${Date.now()}`,
  });
  assert(sharedFeedbackRiskResponse?.screenPath === '/shared/feedback', 'shared-feedback generic risk preserves the authorized current screen');
  assert(!/Operasyon Sağlığı tarafında|GPS güncel değil|çevrim dışı/iu.test(String(sharedFeedbackRiskResponse?.reply || '')), 'shared-feedback generic risk does not borrow operation-health guidance');
  assert(sharedFeedbackRiskResponse?.semanticPlan?.requestedDomains?.length === 0, 'shared-feedback generic risk keeps empty domain scope');

  const roomFinancialRiskNaturalVariantRequest = resolveCanonicalConversationRequest({
    message: 'Bu finans ekranında hangi risklere dikkat etmeliyim?',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
      selectedRecordType: '',
    },
    interpreterMode: 'DETERMINISTIC',
  });
  const roomFinancialRiskNaturalVariantPlan = resolveSemanticIntent({
    message: 'Bu finans ekranında hangi risklere dikkat etmeliyim?',
    user: roomOfferContinuityUser,
    conversationState: null,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
      selectedRecordType: '',
    },
    canonicalRequest: roomFinancialRiskNaturalVariantRequest,
  });
  assert(roomFinancialRiskNaturalVariantRequest?.request?.operation === 'ASSESS_CURRENT_RISK', 'ROOM unseen financial risk paraphrase keeps risk operation');
  assert(roomFinancialRiskNaturalVariantRequest?.request?.domain === 'FINANCE', 'ROOM unseen financial risk paraphrase keeps finance domain');
  assert(roomFinancialRiskNaturalVariantRequest?.request?.ambiguity?.status === 'NONE', 'ROOM unseen financial risk paraphrase is not left as unresolved deictic');
  assert(roomFinancialRiskNaturalVariantRequest?.canonicalShape?.scopeTarget === 'CURRENT_SCREEN', 'ROOM unseen financial risk paraphrase stays current-screen scoped');
  assert(roomFinancialRiskNaturalVariantPlan?.family === 'RISK_RANKING', 'ROOM unseen financial risk paraphrase reaches risk-ranking planner family');
  assert(roomFinancialRiskNaturalVariantPlan?.planStatus === 'READY', 'ROOM unseen financial risk paraphrase is planner-ready');
  assert(roomFinancialRiskNaturalVariantPlan?.requestedDomains?.includes('FINANCE'), 'ROOM unseen financial risk paraphrase requests finance evidence');

  const roomFinancialRiskNaturalVariant = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: roomOfferContinuityUser,
    screenContext: {
      path: '/room/financial-operations',
      label: 'Finansal Operasyonlar',
      role: 'ROOM',
      selectedEntityId: null,
      selectedRecordId: null,
      selectedRecordType: '',
    },
    message: 'Bu finans ekranında hangi risklere dikkat etmeliyim?',
    authSessionId: `canonical-core-room-financial-risk-natural-${Date.now()}`,
  });
  assert(roomFinancialRiskNaturalVariant?.provider === 'local-authorized-financial-screen-risk', 'ROOM unseen financial risk paraphrase stays with the financial screen owner');
  assert(/Finansal Operasyonlar ekranındaki riskleri/iu.test(String(roomFinancialRiskNaturalVariant?.reply || '')), 'ROOM unseen financial risk paraphrase gives a current-surface answer');
  assert(!/Vardiya #165|Vardiya #167|en pahalı doğrulanmış rota/iu.test(String(roomFinancialRiskNaturalVariant?.reply || '')), 'ROOM unseen financial risk paraphrase does not substitute a route comparison');
  assert(roomFinancialRiskNaturalVariant?.readOnly === true, 'ROOM unseen financial risk paraphrase remains read-only');

  const roomOperationHealthHint = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1114,
    user: { role: 'ROOM', roomId: 1, companyId: 2, companyKind: 'COMPANY' },
    screenContext: {
      path: '/room/operation-health',
      label: 'Operasyon Sağlığı',
      role: 'ROOM',
      selectedEntityType: 'screen',
      selectedEntityId: 1114,
    },
    authSessionId: `canonical-core-room-operation-health-hint-${Date.now()}`,
    message: 'Operasyon Sağlığı ekranından geldim. Başlık: Canlılık akışı zayıf. Detay: 2 sürücüde stale/offline davranışı görünüyor. Bunun ne anlama geldiğini sade Türkçe ile açıkla.',
  });
  assert(/2 sürücüde stale\/offline davranışı görünüyor/iu.test(String(roomOperationHealthHint?.reply || '')), 'ROOM operation-health visible warning remains in the answer');
  assert(/Sürücü & Sorunlar sekmesinde/iu.test(String(roomOperationHealthHint?.reply || '')), 'ROOM operation-health hint gives a usable next target');
  assert(roomOperationHealthHint?.semanticPlan?.authorizationDecision?.status !== 'DENY', 'ROOM operation-health visible warning does not trigger role-target denial');

  const roomOperationHealthEmptySelection = resolveCurrentSelection({
    screenContext: {
      path: '/room/operation-health',
      selectedEntityType: '',
      selectedEntityId: null,
    },
    conversationState: {
      lastScreenPath: '/room/operation-health',
      selectedEntityType: 'agreement',
      selectedEntityId: 184,
    },
  });
  assert(!roomOperationHealthEmptySelection?.entity, 'ROOM operation-health empty live selection suppresses historical agreement');
  const roomOperationHealthLiveSelection = resolveCurrentSelection({
    screenContext: {
      path: '/room/operation-health',
      selectedEntityType: 'driver',
      selectedEntityId: 7,
    },
    conversationState: {
      lastScreenPath: '/room/operation-health',
      selectedEntityType: 'agreement',
      selectedEntityId: 184,
    },
  });
  assert(roomOperationHealthLiveSelection?.entity?.type === 'DRIVER' && roomOperationHealthLiveSelection?.entity?.id === 7, 'ROOM operation-health live selection remains authoritative');

  const serviceCost = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/financial-operations', label: 'Finans ve Maliyet' },
    message: 'Maliyet ne kadar?',
    authSessionId: `canonical-core-cost-${Date.now()}`,
  });
  const canonicalCost = resolveCanonicalConversationRequest({
    message: 'Maliyet ne kadar?',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/financial-operations', label: 'Finans ve Maliyet' },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(canonicalCost?.request?.operation === 'ASSESS_CURRENT_RISK', 'canonical cost request keeps cost operation');
  assert(serviceCost?.questionType === 'COST_REASONING', 'canonical cost request reaches cost reasoning');

  const serviceCreateShift = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi' },
    message: 'Vardiya oluşturmak istiyorum',
    authSessionId: `canonical-core-create-shift-${Date.now()}`,
  });
  assert(serviceCreateShift?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'CREATE_SHIFT request keeps workflow authority');
  assert(serviceCreateShift?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CREATE', 'service keeps V3 CREATE action through authorization and routing');
  assert(serviceCreateShift?.questionType !== 'COST_REASONING', 'CREATE_SHIFT request is not stolen by cost reasoning');

  const serviceCreateShiftStart = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi' },
    message: 'yeni vardiya planı başlatmak istiyorum',
    authSessionId: `canonical-core-create-start-${Date.now()}`,
  });
  assert(serviceCreateShiftStart?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CREATE', 'service keeps equivalent V3 CREATE action');
  assert(serviceCreateShiftStart?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'equivalent V3 CREATE action maps to COMPANY guided workflow');
  assert(serviceCreateShiftStart?.readOnly === true, 'equivalent V3 CREATE guidance remains read-only');

  // Production-path continuation regression: the browser/API service must
  // carry the settled guided task into a natural continuation request rather
  // than returning the canonical clarification fallback.
  const serviceContinuationSession = `canonical-core-continuation-${Date.now()}`;
  const serviceContinuationBase = {
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    authSessionId: serviceContinuationSession,
  };
  const serviceContinuationStart = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Vardiya oluşturmak istiyorum',
  });
  assert(serviceContinuationStart?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'service continuation setup establishes the COMPANY guided task');
  const serviceNaturalContinuation = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Kaldığımız yerden ilerleyelim',
  });
  assert(serviceNaturalContinuation?.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'service keeps natural continuation in the continuation family');
  assert(serviceNaturalContinuation?.semanticPlan?.canonicalRequest?.operation === 'CONTINUE_EXPLANATION', 'service maps natural continuation to the canonical continuation operation');
  assert(serviceNaturalContinuation?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CONTINUE', 'service preserves the canonical CONTINUE action');
  assert(serviceNaturalContinuation?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'service preserves the active guided workflow during continuation');
  assert(!/Hangi kayıt veya konuyu/iu.test(String(serviceNaturalContinuation?.reply || '')), 'service natural continuation does not fall into generic clarification');
  assert(String(serviceNaturalContinuation?.reply || '') !== String(serviceContinuationStart?.reply || ''), 'service continuation does not repeat the settled Step-1 response');
  assert(/devam|kaldık|aynı/iu.test(String(serviceNaturalContinuation?.reply || '')), 'service continuation response names the current continuation state');

  const serviceRestart = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Baştan al',
  });
  assert(serviceRestart?.semanticPlan?.canonicalRequest?.continuation?.mode === 'RESTART', 'service restart keeps the typed RESTART mode');
  assert(serviceRestart?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass !== 'CONTINUE', 'service restart is not downgraded to CONTINUE');
  assert(String(serviceRestart?.reply || '') !== String(serviceNaturalContinuation?.reply || ''), 'service restart does not reuse the continuation response');
  assert(/baştan|yeniden|sıfırdan/iu.test(String(serviceRestart?.reply || '')), 'service restart response names the restart transition');

  const serviceInterveningSession = `canonical-core-intervening-${Date.now()}`;
  const serviceInterveningBase = { ...serviceContinuationBase, authSessionId: serviceInterveningSession };
  const serviceInterveningStart = await runCopilotFoundation({
    ...serviceInterveningBase,
    message: 'Vardiya oluşturmak istiyorum',
  });
  await runCopilotFoundation({
    ...serviceInterveningBase,
    message: 'Bu ekran ne işe yarıyor?',
  });
  const serviceContinuationAfterInfo = await runCopilotFoundation({
    ...serviceInterveningBase,
    message: 'Kaldığımız yerden ilerleyelim',
  });
  assert(serviceContinuationAfterInfo?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CONTINUE', 'continuation after an informational turn keeps CONTINUE');
  assert(String(serviceContinuationAfterInfo?.reply || '') !== String(serviceInterveningStart?.reply || ''), 'continuation after an informational turn does not reuse stale Step-1 prose');
  assert(/devam|kaldık|aynı/iu.test(String(serviceContinuationAfterInfo?.reply || '')), 'continuation after an informational turn names the current task state');

  const serviceNewIntent = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Sözleşmeler ekranını aç',
  });
  assert(serviceNewIntent?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'NAVIGATE', 'service new intent remains an explicit navigation');
  assert(!/Vardiya oluşturma akışında 1\. adım/iu.test(String(serviceNewIntent?.reply || '')), 'service new intent does not reuse stale Step-1 prose');

  // An explicit object named by the user must outrank stale SHIFT task
  // context even when the current route is still Planlama Merkezi.
  const explicitAgreementSession = `canonical-core-explicit-agreement-${Date.now()}`;
  const explicitAgreementBase = { ...serviceContinuationBase, authSessionId: explicitAgreementSession };
  await runCopilotFoundation({
    ...explicitAgreementBase,
    message: 'Vardiya oluşturmak istiyorum',
  });
  const serviceExplicitAgreement = await runCopilotFoundation({
    ...explicitAgreementBase,
    message: 'Sözleşmeleri görmek istiyorum',
  });
  const agreementRequest = serviceExplicitAgreement?.semanticPlan?.canonicalRequest;
  assert(agreementRequest?.semanticAction?.actionClass === 'VIEW', 'explicit agreement intent remains VIEW');
  assert(agreementRequest?.semanticAction?.objectClass === 'AGREEMENT', 'explicit agreement object outranks stale SHIFT context');
  assert(agreementRequest?.operation === 'VIEW_AUTHORIZED_SURFACE', 'explicit agreement intent keeps authorized surface operation');
  assert(!/İstenen alanı bu ifadeden güvenle çıkaramadım/iu.test(String(serviceExplicitAgreement?.reply || '')), 'explicit agreement view does not fall into field clarification');
  assert(/sözleşme|sozlesme/iu.test(String(serviceExplicitAgreement?.reply || '')), 'explicit agreement view names the agreement surface');

  // Browser-originated pre-wizard regression: Planlama Merkezi can keep its
  // guided-entry control inside the ordinary collapsed work-area disclosure.
  // The live route proves the entry surface and the absence of a workflow
  // marker proves that Step 1 is not current. The exact child control still
  // has to be resolved by the existing guided-target owner before display.
  const serviceCompanyPreWizard = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      uiHints: {
        visibleButtons: [{
          label: 'Ayrıntılı çalışma alanını göster',
          targetKey: 'company:task-workspace-disclosure',
          semanticType: 'disclosure',
          identitySource: 'CANONICAL',
        }],
        workflowState: null,
        guidedDraftAvailability: {
          state: 'SAVED_DRAFT_CHOOSER',
          count: 1,
          maxResumeStep: 3,
          source: 'SERVER_GUIDED_DRAFTS',
        },
      },
    },
    message: 'yeni vardiya planı başlatmak istiyorum',
    authSessionId: `canonical-core-pre-wizard-${Date.now()}`,
  });
  assert(serviceCompanyPreWizard?.semanticPlan?.workflowEntryState === 'PRE_WIZARD', 'collapsed Planlama Merkezi entry remains pre-wizard');
  assert(serviceCompanyPreWizard?.semanticPlan?.workflowStepReference == null, 'collapsed Planlama Merkezi does not manufacture Step 1 as current');
  assert(serviceCompanyPreWizard?.semanticPlan?.workflowEntryTarget?.targetKey === 'company:guided-plan-start', 'pre-wizard entry keeps the exact canonical guided-start target');
  assert(!/Vardiya oluşturma akışında 1\. adım/iu.test(String(serviceCompanyPreWizard?.reply || '')), 'pre-wizard response does not describe future Step 1 as current');
  assert(/Rehberi Başlat/iu.test(String(serviceCompanyPreWizard?.reply || '')), 'pre-wizard response identifies the current safe entry action');

  const serviceCompanyEntryRecovery = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      uiHints: {
        visibleButtons: [{
          label: 'Ayrıntılı çalışma alanını göster',
          targetKey: 'company:task-workspace-disclosure',
          semanticType: 'disclosure',
          identitySource: 'CANONICAL',
        }],
        workflowState: null,
        guidedDraftAvailability: {
          state: 'SAVED_DRAFT_CHOOSER',
          count: 1,
          maxResumeStep: 3,
          source: 'SERVER_GUIDED_DRAFTS',
        },
      },
    },
    message: 'Bu düğme açılmıyor.',
    authSessionId: `canonical-core-pre-wizard-recovery-${Date.now()}`,
  });
  assert(serviceCompanyEntryRecovery?.semanticPlan?.continuationAction === 'RECOVER', 'generic failure language recovers the canonical pre-wizard target');
  assert(serviceCompanyEntryRecovery?.semanticPlan?.workflowEntryTarget?.targetKey === 'company:guided-plan-start', 'pre-wizard recovery keeps the exact guided-start target');
  assert(!/Hangi kayıt veya konuyu/iu.test(String(serviceCompanyEntryRecovery?.reply || '')), 'pre-wizard recovery does not become generic clarification');
  assert(/Rehberi Başlat/iu.test(String(serviceCompanyEntryRecovery?.reply || '')), 'pre-wizard recovery names the current safe entry action');

  // A foreground server-backed chooser is more specific than its containing
  // Planlama Merkezi route. A deictic screen question must explain the
  // chooser's real actions without treating Step 1 as current or suggesting
  // an implicit destructive discard.
  const serviceGuidedDraftChooser = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      uiHints: {
        foregroundSurface: { key: 'company:guided-draft-chooser', kind: 'SAVED_DRAFT_CHOOSER', source: 'LIVE_UI' },
        visibleButtons: [
          { label: 'Devam et', targetKey: 'company:guided-draft-resume', semanticType: 'button', identitySource: 'CANONICAL' },
          { label: 'Yeni plan', targetKey: 'company:guided-draft-new', semanticType: 'button', identitySource: 'CANONICAL' },
          { label: 'Taslağı sil', targetKey: 'company:guided-draft-discard', semanticType: 'button', identitySource: 'CANONICAL' },
        ],
        workflowState: null,
        guidedDraftAvailability: {
          state: 'SAVED_DRAFT_CHOOSER',
          count: 1,
          maxResumeStep: 2,
          source: 'SERVER_GUIDED_DRAFTS',
        },
      },
    },
    message: 'Bu ekran ne işe yarıyor?',
    authSessionId: `canonical-core-guided-draft-chooser-${Date.now()}`,
  });
  assert(serviceGuidedDraftChooser?.semanticPlan?.guidedDraftChooserIntent === true, 'foreground saved-draft chooser is the canonical current surface');
  assert(/Kayıtlı taslaklar/iu.test(String(serviceGuidedDraftChooser?.reply || '')), 'foreground chooser explanation names the live chooser');
  assert(/Devam et/iu.test(String(serviceGuidedDraftChooser?.reply || '')), 'foreground chooser explanation describes the safe resume action');
  assert(!/Vardiya oluşturma akışında 1\. adım/iu.test(String(serviceGuidedDraftChooser?.reply || '')), 'foreground chooser does not manufacture Step 1 as current');
  assert(serviceGuidedDraftChooser?.guidedTarget?.targetKey !== 'company:guided-plan-start', 'foreground chooser clears the stale pre-wizard target instead of retaining Rehberi Başlat');

  const roomCreateSessionId = `canonical-core-room-${Date.now()}`;
  const serviceRoomCreate = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    screenContext: { path: '/room', label: 'Taşımacılık Firması Merkezi' },
    message: 'vardiya oluşturmak istiyorum',
    authSessionId: roomCreateSessionId,
  });
  assert(serviceRoomCreate?.semanticPlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'ROOM service path resolves to existing-shift guidance');
  assert(serviceRoomCreate?.semanticPlan?.workflowIntent !== 'CREATE_SHIFT', 'ROOM service path never exposes create workflow');
  assert(serviceRoomCreate?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CREATE', 'ROOM semantic action remains CREATE before policy and authorization');
  assert(/yeni vardiya veya talep kaydı oluşturulmaz/iu.test(String(serviceRoomCreate?.reply || '')), 'ROOM service guidance states the create boundary');
  assert(serviceRoomCreate?.readOnly === true, 'ROOM create guidance remains read-only');

  const serviceRoomCreateGuided = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1103,
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    screenContext: {
      path: '/room/shifts',
      label: 'Vardiyalar',
      role: 'ROOM',
      selectedEntityType: 'shift',
      selectedEntityId: 210,
      selectedRecordId: 210,
      uiHints: {
        currentTarget: {
          label: 'Vardiyalar',
          targetKey: 'room:shifts',
          identitySource: 'CANONICAL',
        },
        visibleButtons: [
          { label: 'Operasyon Merkezi', semanticType: 'button', targetKey: 'room:home', identitySource: 'CANONICAL' },
          { label: 'Detayları göster', semanticType: 'disclosure', targetKey: 'room-shifts:shift:210:details', identitySource: 'CANONICAL' },
        ],
      },
    },
    message: 'Adım adım anlat',
    authSessionId: roomCreateSessionId,
  });
  assert(
    /yeni vardiya veya talep kaydı oluşturulmaz/iu.test(String(serviceRoomCreateGuided?.reply || ''))
      && /1\.|önce|seç|kontrol/iu.test(String(serviceRoomCreateGuided?.reply || ''))
      && /Detayları göster|mevcut vardiya|Vardiyalar/iu.test(String(serviceRoomCreateGuided?.reply || '')),
    'ROOM denied create follow-up gives an authorized step-by-step alternative',
  );
  assert(
    String(serviceRoomCreateGuided?.reply || '').trim() !== String(serviceRoomCreate?.reply || '').trim(),
    'ROOM denied create follow-up does not repeat the generic boundary reply',
  );
  assert(serviceRoomCreateGuided?.guidedTarget?.status === 'FOUND', 'ROOM denied create follow-up resolves a live selected-record target');
  assert(serviceRoomCreateGuided?.guidedTarget?.targetKey === 'room-shifts:shift:210:details', 'ROOM denied create follow-up keeps the selected Vardiya #210 target');
  assert(!/Operasyon Merkezi/iu.test(String(serviceRoomCreateGuided?.reply || '')), 'ROOM denied create follow-up does not choose a global navigation target');
  assert(serviceRoomCreateGuided?.readOnly === true, 'ROOM denied create follow-up remains read-only');

  const ambiguousWithoutSurface = resolveCanonicalConversationRequest({
    message: 'Neye bakmalıyım?',
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    screenContext: null,
    conversationState: null,
    interpreterMode: 'DETERMINISTIC',
  });
  assert(ambiguousWithoutSurface?.canonicalShape?.taskType !== 'EVIDENCE_SUFFICIENCY', 'passive context cannot fabricate SCHOOL evidence intent');

  const malformed = resolveCanonicalConversationRequest({
    message: 'malformed contract probe',
    user: { role: 'COMPANY', companyId: 1 },
    screenContext: null,
    conversationState: null,
    interpreterMode: 'DETERMINISTIC',
  });
  if (malformed?.validation?.status === 'SEMANTIC_UNRESOLVED') {
    assert(malformed?.failureClass === 'SAFE_CLARIFICATION' || malformed?.request?.ambiguity?.status === 'UNRESOLVED', 'invalid envelope maps to safe clarification');
  }

  assert(!Object.prototype.hasOwnProperty.call(envelope || {}, 'authorizationStatus'), 'authorization is separate from pre-auth envelope');
  assert(!Object.prototype.hasOwnProperty.call(envelope || {}, 'authorizedEntityRefs'), 'authorized refs are not embedded in candidate envelope');
  const authorization = await authorizeSemanticRequest({ user: { role: 'COMPANY', companyId: 1 }, request: envelope });
  assert(['AUTHORIZED', 'DENIED', 'NOT_FOUND', 'REQUIRES_CLARIFICATION'].includes(authorization?.authorizationStatus), 'authorization result has deterministic status');
  assert(Array.isArray(authorization?.authorizedEntityRefs), 'authorization result separates authorized refs');
  assert(Array.isArray(authorization?.deniedCandidateRefs), 'authorization result separates denied candidates');
  const state = {
    activeGuidedTask: { taskId: 'task-1', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    guidedTarget: { targetKey: 'company:guided-plan-start' },
    productContext: { semanticPlan: { family: 'UI_GUIDANCE' }, screenPath: '/company' },
    uniqueDiscourseReferent: { type: 'agreement', id: 184 },
    lastSettledResult: { requestId: result.requestId, reply: 'redacted result' },
  };
  const suspended = applyCanonicalConversationTransition({ state, transition: 'SUSPEND_TASK', reason: 'EXPLICIT_NEW_DOMAIN' });
  assert(suspended?.transition?.type === 'SUSPEND_TASK', 'task suspension is typed');
  assert(suspended?.productContext?.suspended === true, 'explicit new intent suspends product context');
  const invalidated = applyCanonicalConversationTransition({ state: suspended, transition: 'INVALIDATE_STALE_CONTEXT', reason: 'ROUTE_CHANGED' });
  assert(invalidated?.guidedTarget === null, 'stale target is invalidated by typed transition');
  const persisted = projectPersistableConversationState(state);
  assert(!persisted?.rawEnvelope && !persisted?.rawMessage, 'persisted state excludes unrestricted raw envelope/message');
  const trace = createSemanticTrace({
    requestId: result.requestId,
    authScope: { role: 'COMPANY', companyId: 1 },
    canonicalRequest: envelope,
    contextResolution: { source: 'LIVE_UI', status: 'RESOLVED' },
    entityResolution: { status: 'CANDIDATE_ONLY' },
    authorizationDecision: { status: 'ALLOW' },
    groundingSources: [{ source: 'CURRENT_RUNTIME', status: 'KNOWN' }],
    semanticOutcome: { operation: envelope.operation, domain: envelope.domain },
    targetResolution: { status: 'NOT_REQUESTED' },
    responseRenderer: { status: 'PENDING' },
    failureClass: null,
  });
  assert(trace?.schemaVersion === SEFER_ABI_SEMANTIC_TRACE_VERSION, 'semantic trace uses V1 schema');
  assert(!trace?.rawText && !trace?.canonicalRequest?.currentRequest?.rawText, 'semantic trace is redacted');
  assert(trace?.canonicalRequest?.semanticAction?.actionClass === envelope.semanticAction?.actionClass, 'semantic trace preserves the redacted V3 action result');

  // Stage-A RED matrix: provider-neutral seam, strict proposal validation,
  // fail-closed behavior, and deterministic-first eligibility.
  const highConfidenceEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'PRODUCT_EXPLICIT',
    resolutionStatus: 'RESOLVED',
    hasProductEvidence: true,
  });
  assert(highConfidenceEligibility.eligible === false, 'high-confidence deterministic result is not fallback eligible');
  assert(highConfidenceEligibility.reasonCode === 'HIGH_CONFIDENCE_DETERMINISTIC', 'high-confidence eligibility reason is explicit');

  const b02Regression = buildRequest('Bugünkü sefer kayıtlarına göz atabilir miyim?');
  const b02Eligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: b02Regression?.request?.semanticScope?.class,
    resolutionStatus: b02Regression?.request?.semanticAction?.resolutionStatus,
    confidence: b02Regression?.request?.semanticScope?.confidence <= 0.65 ? 'LOW' : 'HIGH',
    hasProductEvidence: true,
  });
  assertAction(b02Regression, 'VIEW', 'SHIFT', 'B02 internal contextual regression');
  assert(b02Eligibility.eligible === false, 'B02 resolved internal context does not invoke fallback');
  assert(b02Eligibility.reasonCode === 'HIGH_CONFIDENCE_DETERMINISTIC', 'B02 uses the deterministic internal context path');
  const unresolvedEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'UNRESOLVED',
    resolutionStatus: 'UNRESOLVED',
    hasProductEvidence: true,
  });
  assert(unresolvedEligibility.eligible === true, 'unresolved product evidence reaches the bounded fallback seam');
  const b02Service = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?',
    authSessionId: `canonical-core-stage-a-b02-${Date.now()}`,
  });
  assert(b02Service?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'VIEW', 'service path resolves B02 through internal context');
  assert(b02Service?.semanticPlan?.canonicalFallbackEligibility?.eligible === false, 'service path keeps B02 provider-free after internal resolution');
  assert(b02Service?.semanticPlan?.canonicalFallbackEligibility?.invoked === false, 'service path keeps provider invocation disabled');

  const ambiguousEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'PRODUCT_AMBIGUOUS',
    resolutionStatus: 'AMBIGUOUS',
    hasProductEvidence: true,
  });
  assert(ambiguousEligibility.eligible === false, 'genuine ambiguity does not invoke fallback');
  const oosEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'OFF_TOPIC_GENUINE',
    resolutionStatus: 'NOT_APPLICABLE',
    hasProductEvidence: false,
  });
  assert(oosEligibility.eligible === false, 'genuine OOS does not invoke fallback');

  const validProposal = {
    actionClass: 'VIEW',
    objectClass: 'SHIFT',
    targetCandidate: null,
    modifiers: { new: false, current: true, next: false, explicitTarget: false },
    explicitness: 'EXPLICIT',
    evidence: ['MOCK_COMPOSITIONAL_VIEW'],
    confidence: 'HIGH',
    resolutionStatus: 'RESOLVED',
  };
  assert(validateProviderNeutralProposal(validProposal).valid === true, 'valid typed proposal passes provider-neutral validation');
  assert(validateProviderNeutralProposal({ ...validProposal, actionClass: 'INVENTED' }).failureCode === 'UNSUPPORTED_ENUM', 'unsupported action enum fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, objectClass: 'INVENTED' }).failureCode === 'UNSUPPORTED_ENUM', 'unsupported object enum fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, operation: 'CREATE_SHIFT' }).failureCode === 'UNEXPECTED_AUTHORITY_FIELD', 'unexpected authoritative field fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, confidence: 'LOW' }).failureCode === 'LOW_CONFIDENCE', 'low-confidence proposal fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, resolutionStatus: 'AMBIGUOUS' }).failureCode === 'AMBIGUOUS_PROPOSAL', 'ambiguous proposal fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, targetCandidate: { objectClass: 'AGREEMENT' } }).failureCode === 'SCHEMA_INVALID', 'candidate/object mismatch fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, targetCandidate: { objectClass: 'SHIFT', semanticId: '12345' } }).failureCode === 'SCHEMA_INVALID', 'record-like semantic id fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, actionClass: 'NONE', objectClass: null }).failureCode === 'SCHEMA_INVALID', 'resolved NONE proposal fails closed');
  for (const authorityField of ['authorization', 'tenant', 'entityId', 'workflow', 'route', 'uiTarget', 'recordId', 'writeAction']) {
    assert(validateProviderNeutralProposal({ ...validProposal, [authorityField]: 'forbidden' }).valid === false, `${authorityField} authority field fails closed`);
  }
  assert(validateProviderNeutralInput({
    utterance: 'bounded input',
    tenantRecords: [{ id: 1 }],
  }).valid === false, 'forbidden tenant data is rejected from proposer input');
  assert(validateProviderNeutralInput({
    utterance: 'bounded input',
    roleContext: { role: 'COMPANY' },
    surfaceMetadata: { key: 'company:planning-center' },
  }).valid === true, 'least-context proposer input remains accepted');

  const eligibleProposal = await invokeProviderNeutralSemanticProposer({
    proposer: async () => validProposal,
    input: { utterance: 'bounded product coverage gap', roleContext: { role: 'COMPANY' } },
  });
  assert(eligibleProposal.result?.status === 'PROPOSAL_ACCEPTED', 'eligible low-confidence seam accepts only a validated proposal');
  assert(eligibleProposal.trace?.invoked === true && eligibleProposal.trace?.proposerKind === 'MOCK', 'injected proposer is the only Stage-A invocation');

  const deterministicResult = { actionClass: 'VIEW', objectClass: 'SHIFT', resolutionStatus: 'RESOLVED', confidence: 'HIGH' };
  const conflict = await invokeProviderNeutralSemanticProposer({
    proposer: async () => ({ ...validProposal, actionClass: 'CREATE' }),
    input: { utterance: 'mock conflict', semanticContext: { productEvidence: true } },
    deterministicResult,
  });
  assert(conflict.result?.status === 'SAFE_CLARIFICATION' || conflict.result?.status === 'DETERMINISTIC_PRESERVED', 'deterministic/proposal conflict fails closed or preserves deterministic result');

  for (const failureCode of Object.values(MODEL_FALLBACK_FAILURE_CODES)) {
    const failure = await invokeProviderNeutralSemanticProposer({
      proposer: async () => ({ failureCode }),
      input: { utterance: 'mock failure', semanticContext: { productEvidence: true } },
    });
    assert(failure.result?.status === 'SAFE_CLARIFICATION', `${failureCode} maps to safe clarification`);
  }
  assert(b02Regression?.fallbackEligibility?.eligible === false, 'canonical result keeps B02 on the internal deterministic path');
  assert(b02Regression?.fallbackEligibility?.invoked === false, 'Stage-A default path does not invoke a proposer');

  // Internal contextual semantic regression: product-domain, temporal,
  // inspection and foreground context are composed before the canonical
  // action is formed. This is deliberately a structural B02 development
  // regression, not an exact phrase rule.
  const b02Context = buildCanonicalSemanticContext({
    message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
  });
  assert(b02Context?.currentDomain === 'SHIFTS', 'canonical context derives the current shift domain');
  assert(b02Context?.evidence?.temporal?.includes('CURRENT_TIME_WINDOW'), 'canonical context preserves bounded temporal evidence');
  assert(b02Context?.evidence?.object?.includes('PRODUCT_SHIFT_RECORD'), 'canonical context derives typed shift-record evidence');
  assert(b02Context?.evidence?.action?.includes('NON_MUTATING_INSPECTION'), 'canonical context derives non-mutating inspection evidence');
  const staleContext = buildCanonicalSemanticContext({
    message: 'Buna bak',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/agreements', label: 'Sözleşmeler', role: 'COMPANY' },
    conversationState: {
      activeDomain: 'SHIFTS',
      uniqueDiscourseReferent: { type: 'SHIFT', id: 99 },
      activeGuidedTask: { taskId: 'stale-shift', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    },
  });
  assert(staleContext?.currentDomain === 'AGREEMENTS', 'live foreground surface outranks stale stored domain');
  assert(staleContext?.referenceState?.uniqueReferent === null, 'incompatible discourse referent is rejected as stale');
  const b02Contextual = resolveCanonicalConversationRequest({
    message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
    semanticContext: b02Context,
  });
  assertAction(b02Contextual, 'VIEW', 'SHIFT', 'B02 contextual view');
  assert(b02Contextual?.request?.operation === 'VIEW_AUTHORIZED_SURFACE', 'B02 contextual view maps to authorized view operation');
  assert(b02Contextual?.request?.semanticScope?.class === 'PRODUCT_CONTEXTUAL' || b02Contextual?.request?.semanticScope?.class === 'PRODUCT_EXPLICIT', 'B02 contextual view remains product-scoped');

  const contextualContrastCases = [
    ['Bugünkü servisleri görmek istiyorum', 'VIEW', 'SHIFT'],
    ['Aktif seferlere bakabilir miyim?', 'VIEW', 'SHIFT'],
    ['Şu anki vardiyaları incele', 'VIEW', 'SHIFT'],
  ];
  for (const [message, expectedAction, expectedObject] of contextualContrastCases) {
    const context = buildCanonicalSemanticContext({
      message,
      user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
      screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
      conversationState: null,
    });
    const contextual = resolveCanonicalConversationRequest({
      message,
      user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
      screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
      conversationState: null,
      semanticContext: context,
    });
    assertAction(contextual, expectedAction, expectedObject, `contextual contrast ${message}`);
  }

  const negatedContext = buildCanonicalSemanticContext({
    message: 'Bugünkü vardiyaları görmek istemiyorum',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
  });
  const negatedContextual = resolveCanonicalConversationRequest({
    message: 'Bugünkü vardiyaları görmek istemiyorum',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
    semanticContext: negatedContext,
  });
  assert(negatedContextual?.request?.semanticAction?.actionClass !== 'VIEW', 'contextual negation vetoes affirmative view');
  console.log('PASS canonical envelope structural contract');
  console.log('PASS canonical conversation core structural checks');
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
