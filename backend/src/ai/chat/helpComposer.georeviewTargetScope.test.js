import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatHelpResponse } from './helpComposer.js';

test('GeoReview continuation ignores a stale guided target from another route', () => {
  const response = buildChatHelpResponse({
    entityType: 'screen',
    entityId: 2109,
    user: { role: 'COMPANY' },
    scope: { role: 'COMPANY', roleMode: 'OPERATIONS' },
    message: 'Devamını anlat',
    context: {},
    conversationState: {
      guidedTarget: {
        status: 'FOUND',
        label: 'Tamamlanma adımlarını gör',
        screenPath: '/organization/agreements',
        safeAction: 'HIGHLIGHT',
      },
    },
    semanticPlan: {
      family: 'EXPLAIN_CURRENT_TARGET',
      confidence: 0.99,
      guidedTargetReference: {
        status: 'FOUND',
        label: 'Tamamlanma adımlarını gör',
        screenPath: '/organization/agreements',
        safeAction: 'HIGHLIGHT',
      },
    },
    screenContext: {
      path: '/company/georeview',
      label: 'Konum İncele',
      selectedLabel: 'M18 DEMO Personel 49',
      selectedFields: [
        { label: 'Durum', value: 'OK' },
        { label: 'Koordinat', value: '41.02000, 29.02000' },
      ],
    },
  });

  assert.match(response.reply, /Konum İncele/);
  assert.match(response.reply, /akışından devam edelim/);
  assert.match(response.reply, /M18 DEMO Personel 49/);
  assert.doesNotMatch(response.reply, /Tamamlanma adımlarını gör/);
  assert.doesNotMatch(response.reply, /sözleşme|vardiya|kanıt önizlemesi/i);
});

test('GeoReview continuation stays on the selected location record', () => {
  const response = buildChatHelpResponse({
    entityType: 'screen',
    entityId: 2109,
    user: { role: 'COMPANY' },
    scope: { role: 'COMPANY', roleMode: 'OPERATIONS' },
    message: 'Devamını anlat',
    context: {},
    conversationState: {
      guidedTarget: {
        status: 'FOUND',
        label: 'Durum',
        screenPath: '/company/georeview',
      },
      lastScreenPath: '/company/georeview',
      selectedLabel: 'M18 DEMO Personel 49',
    },
    semanticPlan: {
      family: 'CONTINUE_CURRENT_REASONING',
      confidence: 0.98,
      continuationAction: 'EXPAND',
      continuationBasePlan: { family: 'SCREEN_CONTEXT' },
    },
    screenContext: {
      path: '/company/georeview',
      label: 'Konum İncele',
      selectedLabel: 'M18 DEMO Personel 49',
      selectedFields: [
        { label: 'Durum', value: 'OK' },
        { label: 'Koordinat', value: '41.02000, 29.02000' },
      ],
    },
  });

  assert.match(response.reply, /Konum İncele/);
  assert.match(response.reply, /akışından devam edelim/);
  assert.match(response.reply, /M18 DEMO Personel 49/);
  assert.doesNotMatch(response.reply, /Tamamlanma adımlarını gör/);
  assert.doesNotMatch(response.reply, /sözleşme|vardiya|kanıt önizlemesi/i);
});
