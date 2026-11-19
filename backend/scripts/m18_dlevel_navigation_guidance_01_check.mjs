#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = 'NEW';

const user = { id: 880701, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
const screenContext = {
  id: 2101,
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  companyKind: 'COMPANY',
  uiHints: {
    visibleButtons: [
      { label: 'Planlama Merkezi' },
      { label: 'Vardiyalar' },
      { label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start' },
    ],
  },
};

const cases = [
  // Asking where a workflow starts is explanatory guidance: the canonical
  // operation remains GENERAL_INFORMATION while workflowIntent preserves the
  // CREATE_SHIFT context for the guided response/target.
  { id: 'CREATE_GUIDANCE_WHERE', message: 'Yeni vardiya nereden açılıyor?', family: 'UI_GUIDANCE', operation: 'GENERAL_INFORMATION', workflowIntent: 'CREATE_SHIFT' },
  { id: 'CREATE_GUIDANCE_GOAL', message: 'Vardiya oluşturmak istiyorum', family: 'UI_GUIDANCE', operation: 'CREATE_SHIFT' },
  { id: 'NAVIGATION_GUIDANCE', message: 'Vardiya eklemeyi göster', family: 'UI_GUIDANCE', operation: 'NAVIGATE_AUTHORIZED_SURFACE' },
  { id: 'CREATE_GUIDANCE_ROUTE', message: 'Beni vardiya oluşturma ekranına göt', family: 'UI_GUIDANCE', operation: 'CREATE_SHIFT' },
  { id: 'SURFACE_EXPLANATION_CONTROL', message: 'Planlama Merkezi ekranı ne işe yarıyor?', family: 'SCREEN_CONTEXT', operation: 'EXPLAIN_CURRENT_SURFACE' },
];

const rows = [];
for (const item of cases) {
  const payload = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    user,
    message: item.message,
    screenContext,
    authSessionId: `m18-navigation-guidance-${item.id}`,
  });
  const row = {
    ...item,
    actualFamily: payload.semanticPlan?.family || null,
    actualOperation: payload.semanticPlan?.canonicalRequest?.operation || null,
    actualAction: payload.semanticPlan?.canonicalRequest?.semanticAction?.actionClass || null,
    actualObject: payload.semanticPlan?.canonicalRequest?.semanticAction?.objectClass || null,
    guidedTarget: payload.guidedTarget?.status || null,
  };
  rows.push(row);
  assert.equal(row.actualFamily, item.family, `${item.id} family must remain structurally guided`);
  assert.equal(row.actualOperation, item.operation, `${item.id} operation must remain canonical`);
  if (item.workflowIntent) assert.equal(payload.semanticPlan?.workflowIntent, item.workflowIntent, `${item.id} workflow context must remain canonical`);
  assert.notEqual(row.actualFamily, 'GENERIC_PRODUCT_HELP', `${item.id} must not fall back to generic product help`);
}

const guidedSession = `m18-navigation-guidance-active-${Date.now()}`;
await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 2101,
  user,
  message: 'Vardiya oluşturmak istiyorum',
  screenContext,
  authSessionId: guidedSession,
});
for (const message of ['Adım adım anlat', 'Bana adım adım göster']) {
  const payload = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    user,
    message,
    screenContext,
    authSessionId: guidedSession,
  });
  assert.equal(payload.semanticPlan?.family, 'EXPLAIN_CURRENT_TARGET', `${message} must explain the active guided step`);
  assert.equal(payload.semanticPlan?.workflowIntent, 'CREATE_SHIFT', `${message} must retain CREATE_SHIFT workflow`);
  assert.equal(payload.semanticPlan?.canonicalRequest?.operation, 'EXPLAIN_CURRENT_TARGET', `${message} must use the current-target explanation operation`);
  rows.push({
    id: 'ACTIVE_WORKFLOW_STEP_GUIDANCE',
    message,
    family: 'EXPLAIN_CURRENT_TARGET',
    operation: 'EXPLAIN_CURRENT_TARGET',
    actualFamily: payload.semanticPlan?.family || null,
    actualOperation: payload.semanticPlan?.canonicalRequest?.operation || null,
    actualAction: payload.semanticPlan?.canonicalRequest?.semanticAction?.actionClass || null,
    actualObject: payload.semanticPlan?.canonicalRequest?.semanticAction?.objectClass || null,
    guidedTarget: payload.guidedTarget?.status || null,
  });
}

console.log(JSON.stringify({ M18_DLEVEL_NAVIGATION_GUIDANCE: 'GREEN', CASE_COUNT: rows.length, rows }));
