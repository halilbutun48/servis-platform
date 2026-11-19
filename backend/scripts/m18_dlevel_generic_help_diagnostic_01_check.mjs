#!/usr/bin/env node

import { runCopilotFoundation } from '../src/ai/service.js';

const roles = [
  { id: 'ROOM', user: { id: 881001, role: 'ROOM', roomId: 1 }, screen: { path: '/room', label: 'Görev Merkezi', role: 'ROOM', uiHints: { visibleButtons: [{ label: 'Vardiyalar ekranını aç', targetKey: 'room:shifts' }] } } },
  { id: 'COMPANY', user: { id: 881002, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY', uiHints: { visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-entry' }] } } },
  { id: 'SCHOOL', user: { id: 881003, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 2 }, screen: { path: '/school', label: 'Okul Merkezi', role: 'SCHOOL', uiHints: { visibleButtons: [{ label: 'Planları aç', targetKey: 'school:plans' }] } } },
  { id: 'ORGANIZATION', user: { id: 881004, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 3 }, screen: { path: '/organization', label: 'Gezi / Planlama Merkezi', role: 'ORGANIZATION', uiHints: { visibleButtons: [{ label: 'Planları aç', targetKey: 'organization:plans' }] } } },
  { id: 'DRIVER', user: { id: 881005, role: 'DRIVER', roomId: 1 }, screen: { path: '/driver/today', label: 'Bugünkü Rota', role: 'DRIVER', uiHints: { visibleButtons: [{ label: 'Canlı rotayı aç', targetKey: 'driver:route' }] } } },
  { id: 'PERSONEL', user: { id: 881006, role: 'PERSONEL', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/personel/live', label: 'Canlı', role: 'PERSONEL', uiHints: { visibleButtons: [{ label: 'Servisimi aç', targetKey: 'personel:my' }] } } },
  { id: 'PARENT', user: { id: 881007, role: 'PARENT', companyId: 1 }, screen: { path: '/parent/live', label: 'Canlı', role: 'PARENT', uiHints: { visibleButtons: [{ label: 'Canlı durumu aç', targetKey: 'parent:live' }] } } },
  { id: 'SUPER_ADMIN', user: { id: 881008, role: 'SUPER_ADMIN' }, screen: { path: '/superadmin', label: 'Genel Bakış', role: 'SUPER_ADMIN', uiHints: { visibleButtons: [{ label: 'Denetim durumunu aç', targetKey: 'superadmin:operations' }] } } },
];

const messages = [
  ['GENERIC_HELP', 'bu program ne işe yarıyor'],
  ['GENERIC_HELP_TYPO_1', 'bu promram ne işe yarıyor'],
  ['GENERIC_HELP_TYPO_2', 'bu promgram ne işe yarıyor'],
  ['SURFACE_HELP', 'bu ekran ne işe yarıyor'],
  ['WHAT_TO_DO', 'burada ne yapabilirim'],
  ['WHAT_TO_LOOK_AT', 'nerelere bakmam gerek'],
  ['HELP', 'bana yardım et'],
  ['HOW_TO_USE', 'bu programı kullanmayı bana öğret'],
  ['HOW_TO_USE_2', 'bu programı nasıl kullanacağım'],
  ['WHERE_TO_START', 'burada nereden başlamalıyım'],
  ['RISK_HELP', 'burda sorun var mı'],
  ['RISK_HELP_2', 'burada dikkat etmem gereken bir şey var mı'],
  ['NEXT_STEP', 'ne yapmam gerekiyor'],
  ['STEP_GUIDANCE', 'bana adım adım göster'],
];

function compact(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    questionType: payload?.questionType || null,
    intent: plan.intent || plan.conversationRoute || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    clarification: plan.clarificationNeed || null,
    reply: String(payload?.reply || '').slice(0, 180),
  };
}

const failures = [];
for (const role of roles) {
  for (const [id, message] of messages) {
    const payload = await runCopilotFoundation({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      user: role.user,
      message,
      screenContext: role.screen,
      authSessionId: `m18-dlevel-generic-${role.id}-${id}`,
    });
    const actual = compact(payload);
    const reply = actual.reply;
    const recordClarification = /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu.test(reply)
      || /RECORD|ENTITY_LOOKUP|LOOK_UP_FIELD/.test(`${actual.object} ${actual.operation} ${actual.clarification}`);
    const surfaceGrounded = actual.object === 'SURFACE'
      || /Planlama Merkezi|Okul Merkezi|Organizasyon|Vardiya|Canlı|rota|servis|denetim|SeferPakt/iu.test(reply);
    if (recordClarification || !surfaceGrounded) failures.push({ role: role.id, id, message, actual });
    console.log(JSON.stringify({ role: role.id, id, message, actual }));
  }
}
console.error(JSON.stringify({
  GENERIC_HELP_8_ROLE_MATRIX: failures.length ? 'RED' : 'GREEN',
  TOTAL_CASES: roles.length * messages.length,
  FAILURE_COUNT: failures.length,
  RECORD_CLARIFICATION_FALSE_POSITIVE_COUNT: failures.filter((item) => /kayıt|RECORD|ENTITY_LOOKUP|LOOK_UP_FIELD/iu.test(JSON.stringify(item.actual))).length,
}));
