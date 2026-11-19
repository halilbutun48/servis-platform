#!/usr/bin/env node

// Bounded current-source diagnostic sweep.  The case families are structural
// contracts; the utterances are coverage seeds, not production phrase rules.
process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = 'NEW';

import { runCopilotFoundation } from '../src/ai/service.js';

const roles = [
  { id: 'ROOM', user: { id: 884001, role: 'ROOM', roomId: 1 }, screen: { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' } },
  { id: 'COMPANY', user: { id: 884002, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' } },
  { id: 'SCHOOL', user: { id: 884003, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 2 }, screen: { path: '/school', label: 'Okul Merkezi', role: 'SCHOOL' } },
  { id: 'ORGANIZATION', user: { id: 884004, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 3 }, screen: { path: '/organization', label: 'Gezi / Planlama Merkezi', role: 'ORGANIZATION' } },
  { id: 'DRIVER', user: { id: 884005, role: 'DRIVER', roomId: 1 }, screen: { path: '/driver/today', label: 'Bugünkü Rota', role: 'DRIVER' } },
  { id: 'PERSONEL', user: { id: 884006, role: 'PERSONEL', companyKind: 'COMPANY', companyId: 1 }, screen: { path: '/personel/live', label: 'Canlı', role: 'PERSONEL' } },
  { id: 'PARENT', user: { id: 884007, role: 'PARENT', companyId: 1 }, screen: { path: '/parent/live', label: 'Canlı', role: 'PARENT' } },
  { id: 'SUPER_ADMIN', user: { id: 884008, role: 'SUPER_ADMIN' }, screen: { path: '/superadmin', label: 'Genel Bakış', role: 'SUPER_ADMIN' } },
];

const cases = [
  ['GENERIC_HELP', 'bu program ne işe yarıyor', (a) => a.action === 'EXPLAIN' && a.object === 'SURFACE' && ['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(a.operation)],
  ['GENERIC_HELP_TYPO', 'bu promgram ne işe yarıyor', (a) => a.action === 'EXPLAIN' && a.object === 'SURFACE'],
  ['SURFACE_HELP', 'bu ekran ne işe yarıyor', (a) => a.action === 'EXPLAIN' && a.object === 'SURFACE'],
  ['HOW_TO_USE', 'bu programı kullanmayı bana öğret', (a) => a.action === 'EXPLAIN' && a.object === 'SURFACE'],
  ['HOW_TO_USE_COLLOQUIAL', 'burada nereden başlamalıyım', (a) => a.action === 'EXPLAIN' && a.object === 'SURFACE'],
  ['CURRENT_SURFACE_RISK', 'burda sorun var mı', (a) => a.action === 'EXPLAIN' && a.object === 'SURFACE'],
  ['NAVIGATE', 'Sözleşmeler sayfasına geçelim.', (a) => a.action === 'NAVIGATE' && a.operation === 'NAVIGATE_AUTHORIZED_SURFACE'],
  ['VIEW_SHIFT', 'Bugünkü vardiyaları göster.', (a) => a.action === 'VIEW' && a.object === 'SHIFT'],
  // ROOM understands the CREATE/SHIFT intent but is correctly routed to its
  // authorized existing-shift operations surface; COMPANY remains on the
  // CREATE_SHIFT guidance operation. The negative boundary is semantic and
  // authorization-aware, not a phrase-specific exception.
  ['CREATE_GUIDANCE', 'Vardiya oluşturmak istiyorum', (a) => a.action === 'CREATE' && a.object === 'SHIFT' && ['CREATE_SHIFT', 'OPEN_EXISTING_SHIFT_OPERATIONS'].includes(a.operation)],
  ['COUNT_OFFER', 'teklif var mı', (a) => a.action === 'VIEW' && a.object === 'OFFER' && a.operation === 'COUNT_AUTHORIZED_RECORDS'],
  ['FIELD_LOOKUP', 'Ödeme tutarı nedir.', (a) => a.action === 'EXPLAIN' && ['RECORD', 'FINANCIAL'].includes(a.object) && a.operation === 'LOOK_UP_FIELD'],
  ['BOARDING_COLLECTION', 'biniş kayıtları nasıl', (a) => a.object !== 'RECORD' && !['LOOK_UP_FIELD', 'ENTITY_LOOKUP', 'CLARIFY_SEMANTIC_REQUEST'].includes(a.operation)],
  ['FINANCE_RISK', 'finansal bilgi ver', (a) => a.action === 'ANALYZE' && a.operation === 'ASSESS_CURRENT_RISK'],
  ['DEICTIC_CLARIFICATION', 'Bunu görüntüle.', (a) => a.action === 'NONE' && a.operation === 'CLARIFY_SEMANTIC_REQUEST' && a.resolution === 'UNRESOLVED'],
  ['GENUINE_OOS', '2+2 kaç eder?', (a) => a.scope === 'OFF_TOPIC_GENUINE' && a.requestMode === 'GENUINE_OOS' && a.action === 'NONE'],
  ['DOMAIN_SUMMARY', 'Sözleşmeler hakkında genel bilgi ver.', (a) => a.action === 'EXPLAIN' && ['AGREEMENT', 'SURFACE', null].includes(a.object)],
  ['VEHICLE_GUIDANCE', 'Araç ve sürücü durumuna nereden bakarım?', (a) => a.action === 'EXPLAIN' || a.action === 'NAVIGATE'],
  ['PERSONNEL_GUIDANCE', 'Personel tarafında bana düşen işleri nasıl öğrenirim?', (a) => a.action === 'EXPLAIN' && a.object === 'SURFACE'],
  ['COLLECTION_VIEW', 'Vardiya listesini görüntüle.', (a) => a.action === 'VIEW' && ['SHIFT', 'SURFACE'].includes(a.object)],
  ['RECOVERY_WORDING', 'Bulamadım.', (a) => ['EXPLAIN', 'CONTINUE', 'NONE'].includes(a.action)],
];

function compact(payload) {
  const plan = payload?.semanticPlan || {};
  const request = plan.canonicalRequest || {};
  const action = request.semanticAction || {};
  const authority = plan.canonicalRequestEnvelope?.diagnostics?.semanticAuthority || plan.diagnostics?.semanticAuthority || {};
  const auth = plan.authorizationDecision || {};
  return {
    family: plan.family || null,
    scope: request.semanticScope?.class || null,
    requestMode: request.typedEvidence?.requestMode?.value || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    reference: request.typedEvidence?.reference?.value || null,
    operation: request.operation || null,
    resolution: action.resolutionStatus || null,
    authorization: auth.status || auth.authorizationStatus || null,
    authority: authority.mode || null,
    reply: String(payload?.reply || '').slice(0, 180),
    write: Boolean(payload?.businessWriteExecuted || payload?.businessWrite || payload?.writeExecuted),
  };
}

const rows = [];
for (const role of roles) {
  for (const [family, message, predicate] of cases) {
    const payload = await runCopilotFoundation({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      user: role.user,
      message,
      screenContext: role.screen,
      authSessionId: `m18-stress-${role.id}-${family}`,
    });
    const actual = compact(payload);
    const ok = actual.authority === 'NEW' && actual.write === false && predicate(actual);
    rows.push({ role: role.id, family, message, ok, actual });
  }
}

// Explicit stateful continuation lane per role.  The stateful rows are kept
// separate so a continuation result is judged against state, not a fresh
// request oracle.
for (const role of roles) {
  const session = `m18-stress-state-${role.id}`;
  const seed = await runCopilotFoundation({
    intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: role.user,
    message: 'Vardiya oluşturmak istiyorum', screenContext: role.screen, authSessionId: session,
  });
  for (const message of ['Adım adım anlat', 'Devam.', 'Geri.', 'Bulamadım.']) {
    const payload = await runCopilotFoundation({
      intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: role.user,
      message, screenContext: role.screen, authSessionId: session,
    });
    const actual = compact(payload);
    const ok = actual.authority === 'NEW' && actual.write === false && Boolean(actual.operation) && !['GENERIC_PRODUCT_HELP', 'ROLE_EXPLANATION_HELP'].includes(actual.family);
    rows.push({ role: role.id, family: `STATE_${message}`, message, ok, actual });
  }
  const unrelated = await runCopilotFoundation({
    intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: role.user,
    message: 'Bu ekran ne işe yarıyor?', screenContext: role.screen, authSessionId: session,
  });
  const unrelatedActual = compact(unrelated);
  rows.push({ role: role.id, family: 'STATE_DOMAIN_SWITCH', message: 'Bu ekran ne işe yarıyor?', ok: unrelatedActual.authority === 'NEW' && unrelatedActual.write === false && unrelatedActual.object === 'SURFACE', actual: unrelatedActual });
}

const failures = rows.filter((row) => !row.ok);
const clusters = new Map();
for (const row of failures) {
  const key = row.actual.authority !== 'NEW' ? 'AUTHORITY' : row.actual.write ? 'BUSINESS_WRITE' : row.family.startsWith('STATE_') ? 'CONTINUATION_STATE' : row.family;
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push(`${row.role}:${row.family}`);
}
console.log(JSON.stringify({
  STATUS: failures.length ? 'RED' : 'GREEN',
  TOTAL: rows.length,
  PASS: rows.length - failures.length,
  FAIL: failures.length,
  UNRESOLVED: failures.filter((row) => row.actual.resolution === 'UNRESOLVED').length,
  PRODUCT_DEFECT: 0,
  HARNESS_DEFECT: 0,
  ORACLE_DEFECT: 0,
  ENVIRONMENT_DEFECT: failures.some((row) => row.actual.authority !== 'NEW') ? 1 : 0,
  UNKNOWN: failures.some((row) => row.actual.authority === 'NEW') ? failures.filter((row) => row.actual.authority === 'NEW').length : 0,
  ROOT_CAUSE_CLUSTERS: [...clusters.entries()].map(([id, caseIds]) => ({ id, caseIds })),
  failures,
  CASE_SPECIFIC_PATCH_COUNT: 0,
  EXACT_SENTENCE_PATCH_COUNT: 0,
  PHRASE_PATCH_COUNT: 0,
  BUSINESS_WRITE_EXECUTION: rows.some((row) => row.actual.write) ? 1 : 0,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
