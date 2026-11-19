#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';

const user = { id: 4, role: 'ROOM', roomId: 1, companyKind: 'DEMO' };
const screenContext = {
  id: 1106,
  path: '/room/agreements',
  label: 'Sözleşmeler',
  role: 'ROOM',
  uiHints: { activeTabs: ['bridge'], visibleButtons: ['Detayı aç'], semanticBlocks: [] },
};

function plan(message, context = screenContext) {
  const canonical = resolveCanonicalConversationRequest({ message, user, screenContext: context });
  return {
    canonical,
    semantic: resolveSemanticIntent({ message, user, screenContext: context, canonicalRequest: canonical }),
  };
}

function assertAgreementCollection(message, label) {
  const { canonical, semantic } = plan(message);
  assert.equal(canonical.request?.operation, 'COUNT_AUTHORIZED_RECORDS', `${label}: canonical operation`);
  assert.equal(canonical.canonicalShape?.taskType, 'COUNT', `${label}: canonical task`);
  assert.equal(semantic.family, 'COUNT', `${label}: semantic family`);
  assert.ok(semantic.requestedDomains?.includes('AGREEMENTS'), `${label}: agreement domain`);
  assert.equal(semantic.clarificationNeed, null, `${label}: no clarification`);
  assert.equal(semantic.retrieveProductData, true, `${label}: retrieval enabled`);
}

function assertAgreementCollectionSummary(message, label) {
  const { canonical, semantic } = plan(message);
  assert.equal(canonical.request?.operation, 'COUNT_AUTHORIZED_RECORDS', `${label}: canonical operation`);
  assert.equal(canonical.canonicalShape?.taskType, 'COUNT', `${label}: canonical task`);
  assert.equal(canonical.canonicalShape?.collectionSummaryIntent, true, `${label}: collection summary intent`);
  assert.equal(semantic.family, 'COUNT', `${label}: semantic family`);
  assert.equal(semantic.typedRequest?.collectionSummaryIntent, true, `${label}: typed collection summary intent`);
  assert.equal(semantic.clarificationNeed, null, `${label}: no clarification`);
}

assertAgreementCollection('Mevcut sözleşmelerim neler?', 'inventory list');
assertAgreementCollection('Kaç sözleşmem var?', 'inventory count');
assertAgreementCollection('Hangi sözleşmeler inceleme bekliyor?', 'pending inventory');
assertAgreementCollection('Bekleyen kontrat var mı?', 'contract alias inventory');
assertAgreementCollectionSummary('Mevcut sözleşmelerim neler?', 'inventory list summary');
assertAgreementCollectionSummary('Hangi sözleşmeler inceleme bekliyor?', 'pending inventory summary');
assertAgreementCollectionSummary('Room kapsamındaki anlaşmaların özeti nedir?', 'agreement summary transport');

const screenHelp = plan('Sözleşmeleri nereden inceleyebilirim?');
assert.equal(screenHelp.semantic.family, 'UI_GUIDANCE', 'screen-help remains guidance');
assert.equal(screenHelp.semantic.requestedDomains?.includes('AGREEMENTS'), true, 'screen-help retains agreement domain');

const selectedContext = {
  ...screenContext,
  selectedEntity: { type: 'agreement', id: 184 },
  selectedEntityType: 'agreement',
  selectedEntityId: 184,
};
const selected = plan('Bu sözleşmenin durumu ne?', selectedContext);
assert.equal(selected.semantic.family, 'ENTITY_LOOKUP', 'selected status remains entity lookup');
assert.equal(selected.semantic.scopeTarget, 'SELECTED_RECORD', 'selected status remains selected-record scoped');

const selectedDetails = plan('Bu sözleşmenin detaylarını anlat.', selectedContext);
assert.equal(selectedDetails.canonical.canonicalShape?.taskType, 'RECORD_DETAILS', 'selected details keeps record-details task');
assert.equal(selectedDetails.canonical.request?.operation, 'EXPLAIN_RECORD_DETAILS', 'selected details keeps record-details operation');
assert.equal(selectedDetails.semantic.family, 'RECORD_DETAILS', 'selected details remains record-details semantic family');
assert.equal(selectedDetails.semantic.clarificationNeed, null, 'selected details does not clarify a valid selected record');
assert.equal(selectedDetails.canonical.canonicalShape?.targetEntityType, 'AGREEMENT', 'selected details targets the selected agreement');
assert.equal(selectedDetails.canonical.canonicalShape?.scopeTarget, 'SELECTED_RECORD', 'selected details remains selected-record scoped');

for (const [message, label] of [
  ['Bu sözleşmeyi biraz anlatır mısın?', 'selected details natural explanation'],
  ['Sözleşme 184 detaylarına bakabilir miyiz?', 'selected details explicit record variation'],
]) {
  const variation = plan(message, selectedContext);
  assert.equal(variation.canonical.canonicalShape?.taskType, 'RECORD_DETAILS', `${label}: record-details task`);
  assert.equal(variation.canonical.request?.operation, 'EXPLAIN_RECORD_DETAILS', `${label}: record-details operation`);
  assert.equal(variation.semantic.family, 'RECORD_DETAILS', `${label}: semantic family`);
  assert.equal(variation.canonical.canonicalShape?.targetEntityType, 'AGREEMENT', `${label}: agreement target`);
  assert.equal(variation.canonical.canonicalShape?.scopeTarget, 'SELECTED_RECORD', `${label}: selected-record scope`);
  assert.equal(variation.canonical.request?.ambiguity?.status, 'NONE', `${label}: no ambiguity`);
}

const stale = plan('Bu sözleşmenin detayını göster', { ...screenContext, path: '/room/shifts', label: 'Vardiyalar', selectedEntity: null });
assert.notEqual(stale.semantic.family, 'COUNT', 'stale route is not agreement inventory');

const operationClassification = plan('İnceleme bekleyen sözleşme operasyon arızası mı?', {
  ...screenContext,
  path: '/room/operation-health',
  label: 'Operasyon Sağlığı',
  uiHints: { activeTab: 'issues', activeTabs: ['issues'] },
});
assert.notEqual(operationClassification.semantic.family, 'COUNT', 'agreement incident classification is not inventory count');

console.log(JSON.stringify({
  status: 'PASS',
  cases: 11,
  inventoryFamilies: ['COUNT'],
  preserved: ['screen-help UI_GUIDANCE', 'selected status ENTITY_LOOKUP', 'stale route not inventory'],
}, null, 2));
