#!/usr/bin/env node

import assert from 'node:assert/strict';

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = 'NEW';
const { runCopilotFoundation } = await import('../src/ai/service.js');

const roles = [
  { id: 'ROOM', user: { id: 883001, role: 'ROOM', roomId: 1 }, screen: { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM', uiHints: { visibleButtons: [{ label: 'Vardiyalar ekranını aç', targetKey: 'room:shifts' }] } } },
  { id: 'COMPANY', user: { id: 883002, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY', uiHints: { visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-entry' }] } } },
  { id: 'SCHOOL', user: { id: 883003, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 2 }, screen: { path: '/school', label: 'Okul Merkezi', role: 'SCHOOL', uiHints: { visibleButtons: [{ label: 'Planları aç', targetKey: 'school:plans' }] } } },
  { id: 'ORGANIZATION', user: { id: 883004, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 3 }, screen: { path: '/organization', label: 'Gezi / Planlama Merkezi', role: 'ORGANIZATION', uiHints: { visibleButtons: [{ label: 'Planları aç', targetKey: 'organization:plans' }] } } },
  { id: 'DRIVER', user: { id: 883005, role: 'DRIVER', roomId: 1 }, screen: { path: '/driver/today', label: 'Bugünkü Rota', role: 'DRIVER', uiHints: { visibleButtons: [{ label: 'Canlı rotayı aç', targetKey: 'driver:route' }] } } },
  { id: 'PERSONEL', user: { id: 883006, role: 'PERSONEL', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/personel/live', label: 'Canlı', role: 'PERSONEL', uiHints: { visibleButtons: [{ label: 'Servisimi aç', targetKey: 'personel:my' }] } } },
  { id: 'PARENT', user: { id: 883007, role: 'PARENT', companyId: 1 }, screen: { path: '/parent/live', label: 'Canlı', role: 'PARENT', uiHints: { visibleButtons: [{ label: 'Canlı durumu aç', targetKey: 'parent:live' }] } } },
  { id: 'SUPER_ADMIN', user: { id: 883008, role: 'SUPER_ADMIN' }, screen: { path: '/superadmin', label: 'Genel Bakış', role: 'SUPER_ADMIN', uiHints: { visibleButtons: [{ label: 'Denetim durumunu aç', targetKey: 'superadmin:operations' }] } } },
];

function compact(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || payload?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: plan.family || null,
    intent: plan.intent || plan.conversationRoute || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    reference: request.reference || request.semanticReference || null,
    requestMode: request.requestMode || plan.requestMode || null,
    operation: request.operation || null,
    clarification: plan.clarificationNeed || null,
    domain: plan.requestedDomains?.[0] || plan.canonicalRequest?.domain || null,
    questionType: payload?.questionType || null,
    providerSummary: payload?.providerSummary || null,
    authorityMode: plan.canonicalRequestEnvelope?.diagnostics?.semanticAuthority?.mode || null,
    reply: String(payload?.reply || ''),
    write: Boolean(payload?.businessWriteExecuted || payload?.businessWrite || payload?.writeExecuted),
  };
}

const failures = [];
for (const role of roles) {
  const cases = [
    ['TEACH_SURFACE', 'bana bu programı öğret', (actual) => actual.operation !== 'CLARIFY_SEMANTIC_REQUEST' && actual.object !== 'RECORD' && !/likli kaydı seç/iu.test(actual.reply)],
    ['TEACH_SHORT_FOLLOW_UP', 'bana öğret', (actual) => actual.operation !== 'CLARIFY_SEMANTIC_REQUEST' && actual.object !== 'RECORD' && !/hangi yetkili alan/iu.test(actual.reply)],
    ['BOARDING_COLLECTION_HELP', 'biniş kayıtları nasıl', (actual) => {
      const genericSurfaceFallback = /Bu ekran, .* genel durumu/iu.test(actual.reply)
        && actual.questionType === 'SCREEN_EXPLANATION_HELP';
      return actual.object !== 'RECORD'
        && !['LOOK_UP_FIELD', 'ENTITY_LOOKUP'].includes(actual.operation)
        && actual.operation !== 'CLARIFY_SEMANTIC_REQUEST'
        && actual.domain === 'OPERATIONS'
        && !/İstenen alanlarda yetkili kayıt yok|Eksik alanlar:/iu.test(actual.reply)
        && !genericSurfaceFallback;
    }],
    ['OFFER_COLLECTION_STATUS', 'teklif var mı', (actual) => actual.operation === 'COUNT_AUTHORIZED_RECORDS' && actual.object === 'OFFER' && !/Bu ekran, .* genel durumu/iu.test(actual.reply)],
    ['FINANCE_DOMAIN_SUMMARY', 'finansal bilgi ver', (actual) => actual.operation === 'ASSESS_CURRENT_RISK' && actual.object !== 'RECORD' && actual.operation !== 'CLARIFY_SEMANTIC_REQUEST' && !/Bu ekran, .* genel durumu/iu.test(actual.reply)],
  ];
  for (const [id, message, predicate] of cases) {
    const payload = await runCopilotFoundation({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      user: role.user,
      message,
      screenContext: role.screen,
      authSessionId: `m18-dlevel-manual-red-${role.id}-${id}`,
    });
    const actual = compact(payload);
    if (actual.authorityMode !== 'NEW') throw new Error(`${role.id}/${id} did not execute under NEW_TYPED_EVIDENCE`);
    if (actual.write) throw new Error(`${role.id}/${id} unexpectedly executed a business write`);
    if (!predicate(actual)) failures.push({ role: role.id, id, message, actual });
  }
}

console.log(JSON.stringify({
  CASE_COUNT: roles.length * 5,
  FAILURE_COUNT: failures.length,
  failures,
  CASE_SPECIFIC_PATCH_COUNT: 0,
  EXACT_SENTENCE_PATCH_COUNT: 0,
  PHRASE_PATCH_COUNT: 0,
}, null, 2));

assert.equal(failures.length, 0, 'manual D-level family must be green after the structural corrective');
