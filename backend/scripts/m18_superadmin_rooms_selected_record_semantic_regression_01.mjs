import { inferCanonicalSemanticRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import { resolveCopilotGuidedTarget } from '../src/ai/chat/copilotUiElementAnchor.js';

const semanticScreenContext = {
  id: 6105,
  path: '/superadmin/rooms',
  label: 'Taşımacılık Firmaları',
  role: 'SUPER_ADMIN',
  uiHints: {
    visibleButtons: [
      { label: 'Kapat' },
      { label: 'İptal' },
      { label: 'Kaydet' },
      { label: 'Menüyü aç' },
      { label: 'Çıkış' },
    ],
    visibleMenus: [
      { label: 'Güven ve Kalite', targetKey: 'superadmin:trust-quality', identitySource: 'CANONICAL' },
    ],
    modalTitles: ['Taşımacılık Firması Profili — #1 DemoRoomKapatYetkili Ad SoyadTelefonE-postaAdresNotlarİptalKaydet'],
  },
};

const semantic = inferCanonicalSemanticRequest({
  message: 'Peki DemoRoom kaydını güvenli biçimde nereden incelerim?',
  user: { role: 'SUPER_ADMIN' },
  screenContext: semanticScreenContext,
  conversationState: { lastScreenPath: '/superadmin/rooms', lastScreenLabel: 'Taşımacılık Firmaları' },
});
const canonicalShape = semantic?.canonicalShape || semantic?.shape || semantic;
if (canonicalShape?.currentTargetReference?.targetKey === 'superadmin:trust-quality') {
  throw new Error('Canonical semantic request still resolves DemoRoom inspection to Güven ve Kalite');
}
if (canonicalShape?.taskType !== 'SCREEN_CONTEXT' || canonicalShape?.targetEntityType !== 'SURFACE') {
  throw new Error('DemoRoom inspection must remain a current authorized surface context');
}
if (canonicalShape?.generalProductHelpIntent || canonicalShape?.roleHelpIntent) {
  throw new Error('DemoRoom inspection must not fall back to generic role help');
}
if (!canonicalShape?.screenDetailIntent || canonicalShape?.screenKnowledgeKind !== 'RECORD_DETAILS') {
  throw new Error('DemoRoom inspection must remain record-scoped screen detail guidance');
}
const guidedTarget = resolveCopilotGuidedTarget({
  user: { role: 'SUPER_ADMIN' },
  screenContext: semanticScreenContext,
  conversationState: { guidedTarget: null, lastScreenPath: '/superadmin/rooms' },
  semanticPlan: {
    family: 'UI_GUIDANCE',
    explicitUiGuidance: true,
    currentTargetReference: canonicalShape.currentTargetReference,
    canonicalRequest: { operation: 'VIEW_AUTHORIZED_SURFACE' },
  },
  message: 'Peki DemoRoom kaydını güvenli biçimde nereden incelerim?',
});
if (guidedTarget !== null) {
  throw new Error('DemoRoom inspection must not create an unrelated guided target');
}

console.log('PASS M18 SUPER_ADMIN rooms selected-record semantic regression');
