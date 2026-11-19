#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';
import { buildAuthorizedProductAwarenessAnswer } from '../src/services/authorizedProductAwareness.js';

const roles = [
  { id: 'ROOM', user: { id: 882001, role: 'ROOM', roomId: 1 }, screen: { path: '/room', label: 'Görev Merkezi', role: 'ROOM', uiHints: { visibleButtons: [{ label: 'Vardiyalar ekranını aç', targetKey: 'room:shifts' }] } } },
  { id: 'COMPANY', user: { id: 882002, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY', uiHints: { visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-entry' }] } } },
  { id: 'SCHOOL', user: { id: 882003, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 2 }, screen: { path: '/school', label: 'Okul Merkezi', role: 'SCHOOL', uiHints: { visibleButtons: [{ label: 'Planları aç', targetKey: 'school:plans' }] } } },
  { id: 'ORGANIZATION', user: { id: 882004, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 3 }, screen: { path: '/organization', label: 'Gezi / Planlama Merkezi', role: 'ORGANIZATION', uiHints: { visibleButtons: [{ label: 'Planları aç', targetKey: 'organization:plans' }] } } },
  { id: 'DRIVER', user: { id: 882005, role: 'DRIVER', roomId: 1 }, screen: { path: '/driver/today', label: 'Bugünkü Rota', role: 'DRIVER', uiHints: { visibleButtons: [{ label: 'Canlı rotayı aç', targetKey: 'driver:route' }] } } },
  { id: 'PERSONEL', user: { id: 882006, role: 'PERSONEL', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/personel/live', label: 'Canlı', role: 'PERSONEL', uiHints: { visibleButtons: [{ label: 'Servisimi aç', targetKey: 'personel:my' }] } } },
  { id: 'PARENT', user: { id: 882007, role: 'PARENT', companyId: 1 }, screen: { path: '/parent/live', label: 'Canlı', role: 'PARENT', uiHints: { visibleButtons: [{ label: 'Canlı durumu aç', targetKey: 'parent:live' }] } } },
  { id: 'SUPER_ADMIN', user: { id: 882008, role: 'SUPER_ADMIN' }, screen: { path: '/superadmin', label: 'Genel Bakış', role: 'SUPER_ADMIN', uiHints: { visibleButtons: [{ label: 'Denetim durumunu aç', targetKey: 'superadmin:operations' }] } } },
];

const messages = [
  'bana yardım et',
  'nerelere bakmam gerek',
  'bu program ne işe yarıyor',
  'bu promram ne işe yarıyor',
  'bu promgram ne işe yarıyor',
  'bu ekran ne işe yarıyor',
  'bu programı kullanmayı bana öğret',
  'bu programı nasıl kullanacağım',
  'burada nereden başlamalıyım',
  'burda sorun var mı',
  'burada dikkat etmem gereken bir şey var mı',
  'ne yapmam gerekiyor',
  'bana adım adım göster',
];

function canonical(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    clarification: plan.clarificationNeed || null,
    reply: String(payload?.reply || ''),
  };
}

for (const role of roles) {
  for (const message of messages) {
    const result = await runCopilotFoundation({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      user: role.user,
      message,
      screenContext: role.screen,
      authSessionId: `m18-dlevel-generic-red-${role.id}-${message}`,
    });
    const actual = canonical(result);
    assert.notEqual(actual.operation, 'CLARIFY_SEMANTIC_REQUEST', `${role.id}/${message} must not clarify generic help`);
    assert.notEqual(actual.object, 'RECORD', `${role.id}/${message} must not become record help`);
    assert.doesNotMatch(actual.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${role.id}/${message} must not ask for record identity`);
  }
}

const roomShiftsSurfaceCapability = await buildAuthorizedProductAwarenessAnswer({
  user: { id: 882009, role: 'ROOM', roomId: 1 },
  message: 'Bu bölümde hangi görevleri yürütebilirim?',
  screenContext: {
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
    id: 1103,
    selectedEntityType: 'shift',
    selectedEntityId: 211,
  },
  conversationState: {},
  semanticPlan: {
    planVersion: 'SEFER_ABI_QUERY_PLAN_V2',
    planStatus: 'READY',
    family: 'UI_GUIDANCE',
    scopeTarget: 'SELECTED_RECORD',
    requestedDomains: ['SHIFTS'],
    typedRequest: {
      taskType: 'SCREEN_CONTEXT',
      screenKnowledgeKind: 'SCREEN_PURPOSE',
      screenContextIntent: true,
      selectedRecordIntent: false,
      recordDetailsIntent: false,
    },
    canonicalRequest: {
      version: 'SEFER-ABI-CANONICAL-REQUEST-V3',
      operation: 'VIEW_AUTHORIZED_SURFACE',
      domain: 'PRODUCT',
      capability: 'SCREEN_CONTEXT',
      semanticAction: { actionClass: 'VIEW', objectClass: 'SURFACE' },
      candidateEntityRefs: [],
    },
  },
});
assert.match(String(roomShiftsSurfaceCapability.reply || ''), /Vardiyalar|vardiya/iu, 'selected-record screen-purpose reply stays grounded to the current surface');
assert.doesNotMatch(String(roomShiftsSurfaceCapability.reply || ''), /doğrulanabilir güvenli adımdan devam et/iu, 'screen-purpose reply does not collapse to generic safe-step navigation');

const roomSelectedShiftStopAnswer = await runCopilotFoundation({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  user: { id: 882009, role: 'ROOM', roomId: 1 },
  message: 'Bu vardiyada kaç durak var?',
  screenContext: {
    path: '/room/shifts',
    label: 'Vardiyalar',
    role: 'ROOM',
    selectedEntityType: 'shift',
    selectedEntityId: 168,
    selectedLabel: 'Vardiya ID 168',
  },
  authSessionId: 'm18-dlevel-stop-count-regression',
});
assert.match(String(roomSelectedShiftStopAnswer.reply || ''), /durak\s*sayısı:\s*18/iu, 'selected ROOM shift stop count must use the complete authorized stop count');
assert.doesNotMatch(String(roomSelectedShiftStopAnswer.reply || ''), /10\s*durak/iu, 'selected ROOM shift stop count must not use the limited operations preview length');

console.log('M18_DLEVEL_GENERIC_HELP=GREEN');
