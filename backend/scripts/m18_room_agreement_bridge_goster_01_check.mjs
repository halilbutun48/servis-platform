#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { resolveCopilotGuidedTarget } from '../src/ai/chat/copilotUiElementAnchor.js';

const user = { id: 4, role: 'ROOM', roomId: 1, companyKind: 'DEMO' };
const bridgeTarget = (agreementId) => `room:agreements:agreement:${agreementId}:operation-bridge`;

function buildContext({ selectedAgreementId = 184, path = '/room/agreements', role = 'ROOM', includeBridge = true } = {}) {
  const visibleButtons = [
    { label: 'Operasyon Merkezi', targetKey: 'room:home', identitySource: 'CANONICAL', semanticType: 'button' },
    { label: 'Sözleşmeler', targetKey: 'room:agreements', identitySource: 'CANONICAL', semanticType: 'button' },
  ];
  if (includeBridge && selectedAgreementId > 0) {
    visibleButtons.push({
      label: 'Detayı aç',
      targetKey: bridgeTarget(selectedAgreementId),
      semanticId: `product:room:agreement:${selectedAgreementId}:operation-bridge`,
      identitySource: 'CANONICAL',
      semanticType: 'button',
    });
  }
  return {
    id: 1106,
    path,
    label: path === '/room/agreements' ? 'Sözleşmeler' : 'Vardiyalar',
    role,
    selectedEntityType: selectedAgreementId > 0 ? 'agreement' : '',
    selectedEntityId: selectedAgreementId || null,
    uiHints: { visibleButtons, activeTabs: ['bridge'], semanticBlocks: [] },
  };
}

function resolve(message, context = buildContext()) {
  const canonical = resolveCanonicalConversationRequest({ message, user, screenContext: context });
  const semantic = resolveSemanticIntent({ message, user, screenContext: context, canonicalRequest: canonical });
  const target = resolveCopilotGuidedTarget({ user, screenContext: context, semanticPlan: semantic, message });
  return { canonical, semantic, target };
}

const bridge = resolve('Sözleşmenin operasyonla ilişkisini göster.');
assert.equal(bridge.canonical.request?.semanticAction?.objectClass, 'AGREEMENT', 'bridge object is agreement');
assert.equal(bridge.canonical.request?.typedEvidence?.relation?.value, 'PROCESS', 'bridge relation is process');
assert.equal(bridge.semantic.typedRequest?.taskType, 'SCREEN_CONTEXT', 'bridge does not collapse to CLARIFY');
assert.equal(bridge.semantic.entity?.id, 184, 'bridge keeps selected agreement');
assert.equal(bridge.semantic.entity?.type, 'agreement', 'bridge keeps selected agreement type');
assert.equal(bridge.target?.status, 'FOUND', 'bridge target found');
assert.equal(bridge.target?.targetKey, bridgeTarget(184), 'bridge target is selected-record bound');
assert.equal(bridge.target?.identitySource, 'CANONICAL', 'bridge target is canonical');
assert.equal(bridge.target?.authorizedContext?.agreementId, 184, 'bridge target authorization carries agreement');

const alternate = resolve('Sözleşmenin operasyon bağlantısını göster.', buildContext({ selectedAgreementId: 211 }));
assert.equal(alternate.target?.status, 'FOUND', 'alternate selected agreement target found');
assert.equal(alternate.target?.targetKey, bridgeTarget(211), 'alternate target follows selected agreement');

const explanationContext = buildContext({ selectedAgreementId: 187 });
explanationContext.uiHints.visibleButtons = [{
  label: 'Detayı aç',
  targetKey: bridgeTarget(187),
  semanticId: 'product:room:agreement:187:operation-bridge',
  identitySource: 'CANONICAL',
  semanticType: 'button',
}];
explanationContext.uiHints.activeTabs = ['Operasyon Köprüsü1'];
const explanationFamily = resolve('Seçtiğim sözleşmenin operasyonla ilişkisini nereden görebilirim?', explanationContext);
assert.equal(explanationFamily.semantic?.family, 'RELATION_LOOKUP', 'natural bridge paraphrase keeps the canonical relation family');
assert.equal(explanationFamily.semantic?.agreementOperationBridgeIntent, true, 'natural bridge paraphrase keeps bridge intent');
assert.equal(explanationFamily.target?.status, 'FOUND', 'bridge intent resolves even under explanation family');
assert.equal(explanationFamily.target?.targetKey, bridgeTarget(187), 'explanation-family target follows selected agreement');

const missing = resolve('Sözleşmenin operasyon bağlantısını göster.', buildContext({ selectedAgreementId: 0, includeBridge: false }));
assert.equal(missing.target?.status, 'NOT_FOUND', 'missing selected agreement fails closed');

const unauthorized = resolve('Sözleşmenin operasyon bağlantısını göster.', buildContext({ selectedAgreementId: 184, role: 'COMPANY', includeBridge: false }));
assert.equal(unauthorized.target?.status, 'UNAUTHORIZED', 'wrong role fails closed');

const stale = resolve('Sözleşmenin operasyon bağlantısını göster.', buildContext({ selectedAgreementId: 184, path: '/room/shifts', includeBridge: false }));
assert.notEqual(stale.target?.targetKey, bridgeTarget(184), 'route change cannot reuse bridge target');

const genericNavigation = resolve('Operasyon merkezine gitmek istiyorum.', buildContext({ selectedAgreementId: 184 }));
assert.equal(genericNavigation.target?.targetKey, 'room:home', 'generic operations navigation remains generic');

const mobileNavigationContext = buildContext({ selectedAgreementId: 184 });
mobileNavigationContext.uiHints.visibleButtons = [{
  label: 'Menü',
  targetKey: 'room:navigation:menu',
  identitySource: 'CANONICAL',
  semanticType: 'button',
}];
mobileNavigationContext.uiHints.visibleMenus = [{
  label: 'Operasyon Merkezi',
  targetKey: 'room:home',
  identitySource: 'CANONICAL',
  semanticType: 'button',
}];
const mobileNavigation = resolve('Operasyon merkezine gitmek istiyorum.', mobileNavigationContext);
assert.equal(mobileNavigation.target?.status, 'FOUND', 'mobile menu navigation target found from authorized menu inventory');
assert.equal(mobileNavigation.target?.targetKey, 'room:home', 'mobile navigation remains canonical room home');
assert.equal(mobileNavigation.target?.identitySource, 'CANONICAL', 'mobile navigation target is canonical');

console.log(JSON.stringify({
  status: 'PASS',
  cases: 13,
  targetKeyPattern: 'room:agreements:agreement:<selectedAgreementId>:operation-bridge',
  preserved: ['generic operations navigation', 'missing-context fail-closed', 'wrong-role fail-closed', 'route-change stale protection'],
}, null, 2));
