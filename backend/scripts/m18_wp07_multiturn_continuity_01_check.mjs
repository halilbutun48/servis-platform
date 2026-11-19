#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  inferRoleScopedUiTarget,
  resolveCanonicalConversationRequest,
  resolveProductNoteFields,
} from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { buildSeferAbiCostAnalysisResponse } from '../src/ai/chat/seferAbiCostAnalysisAssistant.js';

const companyNoteRequest = 'Hizmet Alan Firma notunu göster';
const carrierNoteRequest = 'Taşımacılık Firması notunu göster';
const companyScreenRequest = 'Hizmet Alan Firma ekranını göster';

// A party-qualified offer note is a field read on the selected offer. It must
// not be promoted to a cross-role UI target before the OFFERS evidence path
// can resolve the requested NOTE_COMPANY field.
assert.equal(inferRoleScopedUiTarget(companyNoteRequest), null);
assert.deepEqual(resolveProductNoteFields(companyNoteRequest), [
  { key: 'NOTE_COMPANY', domain: 'OFFERS' },
]);

// The same rule must preserve the carrier note field and the genuine
// role-scoped screen contract.
assert.equal(inferRoleScopedUiTarget(carrierNoteRequest), null);
assert.deepEqual(resolveProductNoteFields(carrierNoteRequest), [
  { key: 'NOTE_ROOM', domain: 'OFFERS' },
]);
assert.equal(inferRoleScopedUiTarget(companyScreenRequest)?.roleKey, 'COMPANY');

// A selected-shift relation question with a named target must produce the
// canonical relation intent. Without this contract the executor emits its
// relation-missing warning before the verified DRIVER field, creating a
// contradictory user-visible answer.
const driverRelationPlan = resolveSemanticIntent({
  message: 'Bu vardiyadaki sürücü kim?',
  user: { role: 'ROOM', roomId: 1 },
  selectedEntity: { entityType: 'SHIFT', entityId: 211 },
  screenContext: { path: '/room/shifts', role: 'ROOM', selectedEntity: { type: 'shift', id: 211 } },
  conversationState: { selectedEntity: { type: 'shift', id: 211 }, entities: [{ type: 'shift', id: 211 }] },
});
assert.equal(driverRelationPlan.family, 'RELATION_LOOKUP');
assert.equal(driverRelationPlan.relationshipIntent?.fromEntity?.type, 'shift');
assert.equal(driverRelationPlan.relationshipIntent?.toEntity?.type, 'driver');

// Financial continuation must remain on the same authorized agreement and
// retain a real UI target. BACK returns to the prior step; RECOVER gives an
// actionable target-preserving instruction rather than an empty composer.
const financialScreen = {
  path: '/room/commercial-flow',
  label: 'Commercial Flow',
  role: 'ROOM',
  selectedEntityType: 'agreement',
  selectedEntityId: 186,
  selectedLabel: 'Sözleşme #186',
  uiHints: { activeTabs: ['Hakediş önizleme'], currentTarget: null },
};
const financialUser = { id: 880607, role: 'ROOM', roomId: 1, companyKind: 'ROOM', companyId: 2 };
const initialState = { recentMessages: [], selectedEntity: { type: 'agreement', id: 186 }, uiSurface: financialScreen };
const initialRequest = resolveCanonicalConversationRequest({
  message: 'Seçili sözleşme #186 için hakediş ve fatura farkını açıkla.',
  user: financialUser,
  screenContext: financialScreen,
  conversationState: initialState,
  interpreterMode: 'DETERMINISTIC',
});
const initialPlan = resolveSemanticIntent({
  message: 'Seçili sözleşme #186 için hakediş ve fatura farkını açıkla.',
  user: financialUser,
  screenContext: financialScreen,
  conversationState: initialState,
  canonicalRequest: initialRequest,
});
assert.equal(initialPlan.entity?.id, 186, 'financial entry is grounded in the selected agreement');
const stepState = {
  ...initialState,
  lastSettledResult: {
    semanticPlan: initialPlan,
    reply: 'Seçili Sözleşme #186 için finansal açıklama başladı.',
  },
};
const stepRequest = resolveCanonicalConversationRequest({ message: 'Adım adım anlat.', user: financialUser, screenContext: financialScreen, conversationState: stepState, interpreterMode: 'DETERMINISTIC' });
const stepPlan = resolveSemanticIntent({ message: 'Adım adım anlat.', user: financialUser, screenContext: financialScreen, conversationState: stepState, canonicalRequest: stepRequest });
const backState = { ...stepState, lastSettledResult: { semanticPlan: stepPlan, reply: 'Seçili Sözleşme #186 için önce hakediş ve fatura kanıtını karşılaştır.' } };
const backRequest = resolveCanonicalConversationRequest({ message: 'Geri', user: financialUser, screenContext: financialScreen, conversationState: backState, interpreterMode: 'DETERMINISTIC' });
const financialBackPlan = resolveSemanticIntent({ message: 'Geri', user: financialUser, screenContext: financialScreen, conversationState: backState, canonicalRequest: backRequest });
assert.equal(financialBackPlan.continuationAction, 'BACK', 'financial BACK is canonical');
assert.equal(financialBackPlan.entity?.id, 186, 'financial BACK preserves the selected agreement');
const financialBack = await buildSeferAbiCostAnalysisResponse({
  baseResponse: { reply: '', summary: '', semanticPlan: financialBackPlan },
  user: financialUser,
  message: 'Geri',
  screenContext: financialScreen,
  conversationState: backState,
});
assert.ok(String(financialBack?.reply || '').trim(), 'financial BACK must produce a non-empty product response');
assert.match(String(financialBack?.reply || ''), /#186|önceki|adım|mutabakat|sözleşme/iu, 'financial BACK returns to the prior selected-record step');
assert.match(String(financialBack?.nextAction || financialBack?.safeNextStep || ''), /Hakediş önizleme|hedef|kontrol/iu, 'financial BACK retains the real UI target');

const recoverRequest = resolveCanonicalConversationRequest({ message: 'Bulamadım', user: financialUser, screenContext: financialScreen, conversationState: backState, interpreterMode: 'DETERMINISTIC' });
const financialRecoverPlan = resolveSemanticIntent({ message: 'Bulamadım', user: financialUser, screenContext: financialScreen, conversationState: backState, canonicalRequest: recoverRequest });
assert.equal(financialRecoverPlan.continuationAction, 'RECOVER', 'financial RECOVER is canonical');
assert.equal(financialRecoverPlan.entity?.id, 186, 'financial RECOVER preserves the selected agreement');
const financialRecover = await buildSeferAbiCostAnalysisResponse({
  baseResponse: { reply: '', summary: '', semanticPlan: financialRecoverPlan },
  user: financialUser,
  message: 'Bulamadım',
  screenContext: financialScreen,
  conversationState: backState,
});
assert.ok(String(financialRecover?.reply || '').trim(), 'financial RECOVER must produce a non-empty product response');
assert.match(String(financialRecover?.reply || ''), /#186|hedef|kart|mutabakat|sözleşme|kontrol/iu, 'financial RECOVER gives a concrete selected-record recovery instruction');
assert.match(String(financialRecover?.nextAction || financialRecover?.safeNextStep || ''), /Hakediş önizleme|hedef|kontrol/iu, 'financial RECOVER retains the real UI target');

// A selected agreement remains the active financial task even when the
// immediately preceding turn was a fail-closed authorization boundary.  This
// is the public regression: the current screen is financial, but the old
// planner promoted "Adım adım anlat" to role-global help before the financial
// continuation path could consume it.
const financialGuidedScreen = {
  ...financialScreen,
  path: '/room/agreements',
  selectedEntityId: 187,
  selectedLabel: 'Sözleşme #187',
  uiHints: {
    activeTabs: ['Operasyon Köprüsü'],
    currentTarget: null,
    visibleButtons: [
      { label: 'Farkı incele', status: 'FOUND', targetKey: 'agreement-invoice-difference' },
      { label: 'Kalite / hakediş önizlemesi', status: 'FOUND', targetKey: 'agreement-hakedis-preview' },
    ],
  },
};
const authorizationBoundaryState = {
  recentMessages: [{ role: 'assistant', text: 'Bu kayda bu oturumda erişim yetkin yok.' }],
  selectedEntity: { type: 'agreement', id: 187 },
  lastSettledResult: {
    semanticPlan: {
      family: 'AUTHORIZATION_BOUNDARY',
      intentFamily: 'AUTHORIZATION_BOUNDARY',
      authorizationDecision: { status: 'DENY' },
      entity: null,
      entities: [],
      requestedDomains: [],
    },
    reply: 'Bu kayda bu oturumda erişim yetkin yok.',
  },
  uiSurface: financialGuidedScreen,
};
const guidedEntryRequest = resolveCanonicalConversationRequest({
  message: 'Adım adım anlat',
  user: financialUser,
  screenContext: financialGuidedScreen,
  conversationState: authorizationBoundaryState,
  interpreterMode: 'DETERMINISTIC',
});
const guidedEntryPlan = resolveSemanticIntent({
  message: 'Adım adım anlat',
  user: financialUser,
  screenContext: financialGuidedScreen,
  conversationState: authorizationBoundaryState,
  canonicalRequest: guidedEntryRequest,
});
assert.notEqual(guidedEntryPlan.family, 'ROLE_EXPLANATION_HELP', 'selected financial guided entry must not fall back to role-global help');
assert.equal(guidedEntryPlan.entity?.id, 187, 'guided entry preserves the selected agreement');
assert.equal(guidedEntryPlan.requestedDomains?.includes('FINANCE'), true, 'guided entry remains financial');
assert.equal(guidedEntryPlan.financialContinuationState?.agreementId, 187, 'guided entry records the selected financial agreement');
assert.equal(guidedEntryPlan.financialContinuationState?.stepKey, 'EXPLAIN_RESULT', 'guided entry starts the financial explanation step');
assert.equal(guidedEntryPlan.financialContinuationState?.stepIndex, 1, 'guided entry starts at the first financial step');

const guidedEntryResponse = await buildSeferAbiCostAnalysisResponse({
  baseResponse: { reply: '', summary: '', semanticPlan: guidedEntryPlan },
  user: financialUser,
  message: 'Adım adım anlat',
  screenContext: financialGuidedScreen,
  conversationState: authorizationBoundaryState,
});
assert.match(String(guidedEntryResponse?.reply || ''), /#187|fark|hakediş|fatura/iu, 'guided entry explains the selected financial task');
assert.match(String(guidedEntryResponse?.reply || ''), /Farkı incele|Kalite.*hakediş.*önizleme/iu, 'guided entry names a real financial UI target');
assert.equal(guidedEntryResponse?.financialContinuationState?.stepKey, 'EXPLAIN_RESULT', 'guided entry response exposes its canonical step');

// Keep the exact selected-record user chain covered as a durable regression,
// not only the authorization-boundary recovery that exposed the defect.
const selectedInvoiceQuestion = resolveCanonicalConversationRequest({
  message: 'Bu faturada neden 20.000 TL fark var?',
  user: financialUser,
  screenContext: financialGuidedScreen,
  conversationState: authorizationBoundaryState,
  interpreterMode: 'DETERMINISTIC',
});
const selectedInvoicePlan = resolveSemanticIntent({
  message: 'Bu faturada neden 20.000 TL fark var?',
  user: financialUser,
  screenContext: financialGuidedScreen,
  conversationState: authorizationBoundaryState,
  canonicalRequest: selectedInvoiceQuestion,
});
assert.equal(selectedInvoicePlan.entity?.id, 187, 'invoice question remains on agreement #187');
assert.equal(selectedInvoicePlan.requestedDomains?.includes('FINANCE'), true, 'invoice question remains financial');

const guidedChainState = {
  ...authorizationBoundaryState,
  lastSettledResult: { semanticPlan: guidedEntryPlan, reply: guidedEntryResponse.reply },
};
const nextRequest = resolveCanonicalConversationRequest({ message: 'Devam', user: financialUser, screenContext: financialGuidedScreen, conversationState: guidedChainState, interpreterMode: 'DETERMINISTIC' });
const nextPlan = resolveSemanticIntent({ message: 'Devam', user: financialUser, screenContext: financialGuidedScreen, conversationState: guidedChainState, canonicalRequest: nextRequest });
assert.equal(nextPlan.continuationAction, 'CONTINUE', 'financial Devam stays in the same task');
assert.equal(nextPlan.entity?.id, 187, 'financial Devam preserves agreement #187');
assert.equal(nextPlan.requestedDomains?.includes('FINANCE'), true, 'financial Devam remains financial');
assert.equal(nextPlan.financialContinuationState?.agreementId, 187, 'financial Devam keeps the selected agreement in state');
assert.equal(nextPlan.financialContinuationState?.stepKey, 'INSPECT_DIFFERENCE', 'financial Devam advances to the target inspection step');
assert.equal(nextPlan.financialContinuationState?.stepIndex, 2, 'financial Devam advances the canonical step index');
assert.equal(nextPlan.financialContinuationState?.previousStepKey, 'EXPLAIN_RESULT', 'financial Devam records the prior step');
const nextResponse = await buildSeferAbiCostAnalysisResponse({
  baseResponse: { reply: '', summary: '', semanticPlan: nextPlan },
  user: financialUser,
  message: 'Devam',
  screenContext: financialGuidedScreen,
  conversationState: guidedChainState,
});
assert.match(String(nextResponse?.reply || ''), /#187|fark|hakediş|fatura/iu, 'financial Devam answers the selected task');
assert.match(String(nextResponse?.nextAction || nextResponse?.safeNextStep || ''), /Farkı incele|Kalite.*hakediş.*önizleme/iu, 'financial Devam retains a real UI target');
assert.equal(nextResponse?.financialContinuationState?.stepKey, 'INSPECT_DIFFERENCE', 'financial Devam response exposes the advanced step');
assert.notEqual(nextResponse?.reply, guidedEntryResponse?.reply, 'financial Devam must not merely repeat the entry response');

const backChainState = { ...guidedChainState, lastSettledResult: { semanticPlan: nextPlan, reply: 'Sözleşme #187 farkı inceleme adımına geçildi.' } };
const backChainRequest = resolveCanonicalConversationRequest({ message: 'Geri', user: financialUser, screenContext: financialGuidedScreen, conversationState: backChainState, interpreterMode: 'DETERMINISTIC' });
const backChainPlan = resolveSemanticIntent({ message: 'Geri', user: financialUser, screenContext: financialGuidedScreen, conversationState: backChainState, canonicalRequest: backChainRequest });
assert.equal(backChainPlan.continuationAction, 'BACK', 'financial Geri is a canonical previous-step transition');
assert.equal(backChainPlan.entity?.id, 187, 'financial Geri preserves agreement #187');
assert.equal(backChainPlan.financialContinuationState?.agreementId, 187, 'financial Geri keeps the selected agreement in state');
assert.equal(backChainPlan.financialContinuationState?.stepKey, 'EXPLAIN_RESULT', 'financial Geri restores the prior financial step');
assert.equal(backChainPlan.financialContinuationState?.stepIndex, 1, 'financial Geri restores the prior step index');
assert.equal(backChainPlan.financialContinuationState?.nextStepKey, 'INSPECT_DIFFERENCE', 'financial Geri restores the next valid step');
const backChainResponse = await buildSeferAbiCostAnalysisResponse({
  baseResponse: { reply: '', summary: '', semanticPlan: backChainPlan },
  user: financialUser,
  message: 'Geri',
  screenContext: financialGuidedScreen,
  conversationState: backChainState,
});
assert.match(String(backChainResponse?.reply || ''), /#187|önceki|adım|fark|hakediş/iu, 'financial Geri returns to the prior selected-record step');
assert.equal(backChainResponse?.financialContinuationState?.stepKey, 'EXPLAIN_RESULT', 'financial Geri response exposes the restored step');
assert.notEqual(backChainResponse?.reply, nextResponse?.reply, 'financial Geri must not merely repeat the advanced-step response');

const recoverChainRequest = resolveCanonicalConversationRequest({ message: 'Bulamadım', user: financialUser, screenContext: financialGuidedScreen, conversationState: backChainState, interpreterMode: 'DETERMINISTIC' });
const recoverChainPlan = resolveSemanticIntent({ message: 'Bulamadım', user: financialUser, screenContext: financialGuidedScreen, conversationState: backChainState, canonicalRequest: recoverChainRequest });
assert.equal(recoverChainPlan.continuationAction, 'RECOVER', 'financial Bulamadım is a canonical recovery transition');
assert.equal(recoverChainPlan.entity?.id, 187, 'financial Bulamadım preserves agreement #187');
const recoverChainResponse = await buildSeferAbiCostAnalysisResponse({
  baseResponse: { reply: '', summary: '', semanticPlan: recoverChainPlan },
  user: financialUser,
  message: 'Bulamadım',
  screenContext: financialGuidedScreen,
  conversationState: backChainState,
});
assert.match(String(recoverChainResponse?.reply || ''), /#187|Farkı incele|Kalite.*hakediş.*önizleme|hedef/iu, 'financial Bulamadım gives target-based recovery');

for (const agreementId of [186, 187, 188]) {
  const screen = { ...financialGuidedScreen, selectedEntityId: agreementId, selectedLabel: `Sözleşme #${agreementId}` };
  const state = { ...authorizationBoundaryState, selectedEntity: { type: 'agreement', id: agreementId }, uiSurface: screen };
  const request = resolveCanonicalConversationRequest({
    message: 'Adım adım anlat', user: financialUser, screenContext: screen, conversationState: state, interpreterMode: 'DETERMINISTIC',
  });
  const plan = resolveSemanticIntent({ message: 'Adım adım anlat', user: financialUser, screenContext: screen, conversationState: state, canonicalRequest: request });
  assert.equal(plan.entity?.id, agreementId, `guided entry keeps agreement #${agreementId}`);
  assert.equal(plan.requestedDomains?.includes('FINANCE'), true, `guided entry keeps FINANCE for agreement #${agreementId}`);
}

console.log(JSON.stringify({
  financialContinuationEvidence: {
    entry: guidedEntryPlan.financialContinuationState,
    continue: nextPlan.financialContinuationState,
    back: backChainPlan.financialContinuationState,
    selectedRecord: 187,
    domain: nextPlan.requestedDomains?.find((domain) => domain === 'FINANCE') || null,
    targets: {
      entry: guidedEntryResponse.nextAction,
      continue: nextResponse.nextAction,
      back: backChainResponse.nextAction,
    },
  },
}, null, 2));
console.log('WP-07 offer-note semantic continuation regression: PASS');
