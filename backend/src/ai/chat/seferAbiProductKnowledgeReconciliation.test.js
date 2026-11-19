import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatHelpResponse } from './helpComposer.js';
import { detectQuestionIntent } from './intentRouter.js';
import { getScreenDefinitionForUser } from '../jobGuide/screenCatalog.js';

function responseFor({ role, path, message, selectedLabel = '', selectedEntityType = '', selectedEntityId = 0, selectedFields = [], conversationState = {} }) {
  const user = { role };
  const screenContext = {
    path,
    label: path,
    selectedLabel,
    selectedEntityType,
    selectedEntityId,
    selectedFields,
  };
  return buildChatHelpResponse({
    entityType: 'screen',
    entityId: Number(selectedEntityId || 0),
    user,
    message,
    context: null,
    entityLabel: selectedLabel || path,
    scope: { roleMode: ['DRIVER', 'PERSONEL', 'PARENT'].includes(role) ? 'SIMPLE' : 'OPERATIONS' },
    conversationState,
    screenContext,
    screenDefinition: getScreenDefinitionForUser(user, screenContext, 0),
  });
}

test('product guidance keeps operational answers concise and actionable', () => {
  const cases = [
    responseFor({
      role: 'ROOM',
      path: '/room/map',
      message: 'hangi ekrana geçeyim?',
      selectedLabel: 'Araç 20 ABC 123',
      selectedEntityType: 'vehicle',
      selectedEntityId: 20,
      selectedFields: [{ label: 'Son konum bilgisi', value: '2 dk önce' }],
    }),
    responseFor({
      role: 'ROOM',
      path: '/room/operation-health',
      message: 'Neden sorunlu görünüyor?',
      selectedLabel: 'Araç 20 ABC 123',
      selectedEntityType: 'vehicle',
      selectedEntityId: 20,
      selectedFields: [{ label: 'Canlılık', value: 'Yok' }],
    }),
    responseFor({
      role: 'SUPER_ADMIN',
      path: '/superadmin/users',
      message: 'Bu rolde burada neyi yönetebilirim?',
    }),
  ];

  for (const response of cases) {
    assert.ok(String(response.reply || '').trim());
    assert.ok(String(response.reply || '').length <= 720);
  }
  assert.ok((cases[0].quickActions || []).some((action) => action.actionKind === 'OPEN_ROUTE'));
  assert.ok((cases[2].quickActions || []).some((action) => action.actionKind === 'OPEN_ROUTE'));
});

test('product guidance preserves selected-record follow-up intent and uncertainty', () => {
  const followUp = responseFor({
    role: 'ROOM',
    path: '/room/operation-health',
    message: 'peki sonra?',
    selectedLabel: 'Vardiya #710',
    selectedEntityType: 'shift',
    selectedEntityId: 710,
    selectedFields: [{ label: 'Durum', value: 'RISKLI' }],
    conversationState: {
      lastQuestionType: 'WHY_BLOCKED',
      lastSelectedEntityType: 'shift',
      lastSelectedEntityId: 710,
      lastSelectedLabel: 'Vardiya #710',
      lastScreenPath: '/room/operation-health',
      recentMessages: [{ role: 'user', text: 'neden riskli?' }],
    },
  });
  assert.equal(followUp.questionType, 'NEXT_STEP');
  assert.equal(followUp.continuity?.sameEntity, true);

  const uncertain = responseFor({
    role: 'ROOM',
    path: '/room/operation-health',
    message: 'eee?',
    selectedLabel: 'Vardiya #999',
    selectedEntityType: 'shift',
    selectedEntityId: 999,
  });
  assert.equal(uncertain.uncertaintyMeta?.cautionLevel, 'HIGH');
  assert.equal(uncertain.uncertaintyMeta?.needsVerification, true);
});

test('product phrasing adapter retains the canonical first-control and blockage intents', () => {
  assert.equal(
    detectQuestionIntent('önce neyi kontrol edeyim?', {
      entityType: 'screen',
      screenPath: '/superadmin/operation-verification',
    }).questionType,
    'FIRST_CONTROL',
  );
  assert.equal(
    detectQuestionIntent('niye pasif bu', {
      entityType: 'screen',
      screenPath: '/room/operation-health',
    }).questionType,
    'WHY_BLOCKED',
  );
});
