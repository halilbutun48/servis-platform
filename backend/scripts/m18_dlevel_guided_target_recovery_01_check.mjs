#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';
import { resolveCopilotGuidedTarget, GUIDED_TARGET_STATUSES } from '../src/ai/chat/copilotUiElementAnchor.js';

const user = { id: 990801, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
const screenContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Rehberi Başlat', semanticType: 'button', targetKey: 'company:rehberi-baslat', identitySource: 'CANONICAL' },
    ],
  },
};

const activeSession = `m18-dlevel-guided-recovery-${Date.now()}`;
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user,
  message: 'Ben vardiya oluşturmak istiyorum',
  screenContext,
  authSessionId: activeSession,
});

for (const message of ['Bulamadım', 'Göremiyorum', 'O menü yok', 'Bu sekmeyi bulamıyorum']) {
  const response = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    message,
    screenContext,
    authSessionId: activeSession,
  });
  assert.equal(response.semanticPlan?.family, 'CONTINUE_CURRENT_REASONING', `${message} stays on canonical continuation`);
  assert.equal(response.semanticPlan?.continuationAction, 'RECOVER', `${message} is a recovery action`);
  assert.equal(response.semanticPlan?.workflowIntent, 'CREATE_SHIFT', `${message} preserves CREATE_SHIFT`);
  assert.equal(response.guidedTarget?.status, GUIDED_TARGET_STATUSES.FOUND, `${message} resolves a live target`);
  assert.equal(response.guidedTarget?.targetKey, 'company:rehberi-baslat', `${message} keeps canonical target identity`);
}

for (const message of ['Bulamadım', 'O menü yok']) {
  const inactiveResponse = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    message,
    screenContext,
    authSessionId: `m18-dlevel-guided-recovery-inactive-${message}-${Date.now()}`,
  });
  assert.notEqual(inactiveResponse.guidedTarget?.status, GUIDED_TARGET_STATUSES.FOUND, `inactive ${message} does not invent a target`);
  assert.equal((inactiveResponse.quickActions || []).some((item) => item?.actionKind === 'OPEN_ROUTE'), false, `inactive ${message} exposes no route action`);
}

const staleSession = `m18-dlevel-guided-recovery-stale-${Date.now()}`;
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user,
  message: 'Ben vardiya oluşturmak istiyorum',
  screenContext,
  authSessionId: staleSession,
});
const staleResponse = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user,
  message: 'O menü yok',
  screenContext: { path: '/company/shifts', label: 'Vardiyalar', role: 'COMPANY', uiHints: { visibleButtons: [] } },
  authSessionId: staleSession,
});
assert.notEqual(staleResponse.guidedTarget?.status, GUIDED_TARGET_STATUSES.FOUND, 'stale route recovery does not reuse the old target');
assert.equal(staleResponse.guidedTarget?.targetKey || null, null, 'stale route recovery clears the old target identity');
assert.equal((staleResponse.quickActions || []).some((item) => item?.path === '/company'), false, 'stale route recovery exposes no stale route action');

const unauthorized = resolveCopilotGuidedTarget({
  user: { id: 990802, role: 'ROOM', roomId: 1 },
  screenContext: { ...screenContext, role: 'COMPANY' },
  message: 'O menü yok',
});
assert.equal(unauthorized.status, GUIDED_TARGET_STATUSES.UNAUTHORIZED, 'unauthorized recovery has no cross-role target');

console.log('M18_DLEVEL_GUIDED_TARGET_RECOVERY=GREEN');
