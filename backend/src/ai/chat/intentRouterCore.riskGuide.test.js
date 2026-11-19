import test from 'node:test';
import assert from 'node:assert/strict';
import { selectGuideJobType } from './intentRouterCore.js';
import { buildChatHelpResponse } from './helpComposer.js';
import { getScreenDefinitionForUser } from '../jobGuide/screenCatalog.js';

test('selected shift risk questions use the shift readiness guide', () => {
  const jobType = selectGuideJobType({
    entityType: 'shift',
    questionType: 'RISK_LIST',
    message: 'Yaklaşık maliyet etkisi nedir?',
    screenPath: '/company/agreements',
  });

  assert.equal(jobType, 'ASSIGNMENT_READINESS_GUIDE');
});

test('commercial flow blocker questions keep the current commercial surface', () => {
  const user = { role: 'COMPANY' };
  const screenContext = {
    path: '/company/commercial-flow',
    label: 'Ticari Akışım',
    selectedLabel: 'Talep #88',
    selectedFields: [{ label: 'Durum', value: 'Kontrol gerekli' }],
  };
  const response = buildChatHelpResponse({
    entityType: 'screen',
    entityId: 0,
    user,
    message: 'Bu kayıt neden ilerlemiyor?',
    context: null,
    entityLabel: 'Ticari Akışım',
    scope: { roleMode: 'OPERATIONS' },
    conversationState: null,
    screenContext,
    screenDefinition: getScreenDefinitionForUser(user, screenContext, 0),
  });

  assert.equal(response.questionType, 'ROOT_CAUSE');
  assert.equal(response.screenPath, '/company/commercial-flow');
});
