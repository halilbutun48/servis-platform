import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';

const roomUser = {
  id: 995001,
  role: 'ROOM',
  roomId: 1,
  companyId: null,
  sessionVersion: 1,
};

const roomScreen = {
  id: 1100,
  path: '/room',
  label: 'Taşımacılık Firması Merkezi',
  role: 'ROOM',
};

const roleTargetBoundary = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: roomUser,
  screenContext: roomScreen,
  message: 'Şirket yönetim ekranına geçmek istiyorum.',
  authSessionId: 'm18-room-role-target-service-red',
});

assert.equal(
  roleTargetBoundary?.semanticPlan?.roleTargetResolution,
  'UNAUTHORIZED',
  'cross-role UI target must remain structurally unauthorized',
);
assert.equal(
  roleTargetBoundary?.semanticPlan?.authorizationDecision?.status,
  'DENY',
  'role-target denial must not be overwritten by generic domain authorization',
);
assert.equal(
  roleTargetBoundary?.semanticPlan?.authorizationDecision?.authorizationStatus,
  'DENIED',
  'role-target denial must expose the canonical denied native status',
);
assert.equal(
  roleTargetBoundary?.guidedTarget?.status,
  'UNAUTHORIZED',
  'role-target response must remain an authorization boundary',
);

const genericRoomSurface = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: roomUser,
  screenContext: roomScreen,
  message: 'Yönetim ekranına geçip ilk adımı anlatır mısın?',
  authSessionId: 'm18-room-role-target-service-room-control',
});

assert.equal(
  genericRoomSurface?.semanticPlan?.authorizationDecision?.status,
  'ALLOW',
  'generic ROOM surface navigation must remain authorized',
);
assert.equal(
  genericRoomSurface?.semanticPlan?.authorizationDecision?.authorizationStatus,
  'AUTHORIZED',
  'generic ROOM surface navigation must retain authorized native status',
);

console.log('M18_ROOM_ROLE_TARGET_AUTHORIZATION_SERVICE_CHECK=GREEN');
