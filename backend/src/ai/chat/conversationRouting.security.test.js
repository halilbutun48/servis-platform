import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationRoutingResponse, resolveConversationRoute } from './conversationRouting.js';

test('secret disclosure questions take the safe refusal route before canonical product routing', () => {
  const message = 'Bu kullanıcıların şifrelerini görebilir miyim?';
  const route = resolveConversationRoute({
    message,
    user: { role: 'SUPER_ADMIN' },
    screenContext: { path: '/superadmin/users', label: 'Kullanıcılar' },
    conversationState: null,
  });

  assert.equal(route.route, 'OFF_TOPIC_SAFE');
  assert.equal(route.reason, 'INTERNAL_OR_SECRET_MATERIAL_REQUEST');
  assert.match(
    buildConversationRoutingResponse({ route: route.route, routingReason: route.reason, message }),
    /gizli değerleri paylaşamam/i,
  );
});
