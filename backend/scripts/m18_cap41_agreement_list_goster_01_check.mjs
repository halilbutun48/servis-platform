#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveSemanticIntent } from '../src/ai/chat/semanticIntentPlanner.js';
import { resolveCopilotGuidedTarget } from '../src/ai/chat/copilotUiElementAnchor.js';

const user = { id: 4, role: 'ROOM', roomId: 1, companyKind: 'DEMO' };
const listTarget = 'room:agreements:list';

function buildContext({ path = '/room/agreements', selectedAgreementId = 184, includeListTarget = true, role = 'ROOM' } = {}) {
  const semanticElements = includeListTarget
    ? [{
      label: 'Sözleşme listesi',
      targetKey: listTarget,
      semanticId: 'product:room:agreements:list',
      identitySource: 'CANONICAL',
      semanticType: 'section',
      source: 'LIVE_UI',
    }]
    : [];
  return {
    id: 1106,
    path,
    label: path === '/room/agreements' ? 'Sözleşmeler' : 'Vardiyalar',
    role,
    selectedEntityType: selectedAgreementId > 0 ? 'agreement' : '',
    selectedEntityId: selectedAgreementId || null,
    uiHints: {
      visibleButtons: [
        { label: 'Sözleşmeler', targetKey: 'room:agreements', identitySource: 'CANONICAL', semanticType: 'button' },
        ...(selectedAgreementId > 0 ? [{
          label: 'Detayı aç',
          targetKey: `room:agreements:agreement:${selectedAgreementId}:operation-bridge`,
          semanticId: `product:room:agreement:${selectedAgreementId}:operation-bridge`,
          identitySource: 'CANONICAL',
          semanticType: 'button',
        }] : []),
      ],
      activeTabs: ['Sözleşmeler', 'Operasyon Köprüsü1'],
      semanticElements,
      visibleMenus: [],
    },
  };
}

function resolve(message, context = buildContext()) {
  const canonical = resolveCanonicalConversationRequest({ message, user, screenContext: context });
  const semantic = resolveSemanticIntent({ message, user, screenContext: context, canonicalRequest: canonical });
  const target = resolveCopilotGuidedTarget({ user, screenContext: context, semanticPlan: semantic, message });
  return { canonical, semantic, target };
}

for (const message of [
  'Bütün sözleşmelerimi göster.',
  'Tüm sözleşmeleri aç.',
  'Sözleşme listesini göster.',
]) {
  const result = resolve(message);
  assert.equal(result.semantic?.agreementCollectionViewIntent, true, `${message}: collection-view intent`);
  assert.equal(result.target?.status, 'FOUND', `${message}: target found`);
  assert.equal(result.target?.targetKey, listTarget, `${message}: collection target`);
  assert.equal(result.target?.identitySource, 'CANONICAL', `${message}: canonical target`);
}

const genericSurface = resolve('Sözleşmeler ekranına götür.');
assert.notEqual(genericSurface.semantic?.agreementCollectionViewIntent, true, 'generic surface is not collection list intent');
assert.equal(genericSurface.target?.targetKey, 'room:agreements', 'generic surface keeps navigation target');

const selectedDetail = resolve('Bu sözleşmenin detayını göster.');
assert.equal(selectedDetail.target?.targetKey, 'room:agreements:agreement:184:operation-bridge', 'selected detail remains record scoped');

const absentTarget = resolve('Bütün sözleşmelerimi göster.', buildContext({ includeListTarget: false }));
assert.equal(absentTarget.target?.status, 'NOT_FOUND', 'missing collection target fails closed');
assert.equal(absentTarget.target?.targetKey, null, 'missing collection target does not fall back to menu');

const wrongRole = resolve('Bütün sözleşmelerimi göster.', buildContext({ role: 'COMPANY' }));
assert.equal(wrongRole.target?.status, 'UNAUTHORIZED', 'wrong role fails closed');

const staleScreen = resolve('Bütün sözleşmelerimi göster.', buildContext({ path: '/room/shifts' }));
assert.equal(staleScreen.target?.status, 'FOUND', 'other authorized screen can navigate to agreements');
assert.equal(staleScreen.target?.targetKey, 'room:agreements', 'other screen uses the authorized agreements navigation target');
assert.equal(staleScreen.target?.safeAction, 'NAVIGATE', 'other screen navigation is explicit and safe');

console.log(JSON.stringify({
  status: 'PASS',
  cases: 8,
  targetKey: listTarget,
  preserved: ['generic agreements navigation', 'selected agreement detail', 'missing-target fail-closed', 'wrong-role fail-closed'],
}, null, 2));
