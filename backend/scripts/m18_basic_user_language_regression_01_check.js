#!/usr/bin/env node

import assert from 'node:assert/strict';
import { runCopilotFoundation } from '../src/ai/service.js';

const BASE_MESSAGE = 'Bana bu programı öğret';

function canonical(payload) {
  const request = payload?.semanticPlan?.canonicalRequest || {};
  const action = request.semanticAction || {};
  return {
    family: payload?.semanticPlan?.family || null,
    route: payload?.conversationRoute || null,
    scope: request.semanticScope?.class || null,
    action: action.actionClass || null,
    object: action.objectClass || null,
    operation: request.operation || null,
    capability: request.capability || null,
    authorization: payload?.semanticPlan?.authorizationDecision?.status || null,
    resolution: action.resolutionStatus || null,
  };
}

function companyUser(id = 993001) {
  return { id, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1, roomId: null, sessionVersion: 1 };
}

function screen(id, path, label, role) {
  return { id, path, label, role };
}

async function ask({ user, screenContext, message, id }) {
  return runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    screenContext,
    message,
    authSessionId: `m18-basic-help-regression-${id}`,
  });
}

const company = companyUser();
const companyScreen = screen(1, '/company/operations', 'Operasyon Paneli', 'COMPANY');

const general = await ask({ user: company, screenContext: companyScreen, message: BASE_MESSAGE, id: 'general' });
const generalShape = canonical(general);
assert.deepEqual(generalShape, {
  family: 'GENERIC_PRODUCT_HELP',
  route: 'GENERIC_PRODUCT_HELP',
  scope: 'PRODUCT_EXPLICIT',
  action: 'EXPLAIN',
  object: 'SURFACE',
  operation: 'GENERAL_INFORMATION',
  capability: 'GENERAL_INFORMATION',
  authorization: 'ALLOW',
  resolution: 'RESOLVED',
});
assert.ok(general.reply.length >= 80);
assert.doesNotMatch(general.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu);
assert.match(general.reply, /seferpakt|planlama|vardiya|teklif|sözleşme/iu);

const screenHelp = await ask({ user: company, screenContext: companyScreen, message: 'Bu ekranı nasıl kullanacağım?', id: 'screen' });
const screenShape = canonical(screenHelp);
assert.equal(screenShape.family, 'SCREEN_CONTEXT');
assert.equal(screenShape.route, 'RETURN_TO_PRODUCT_TASK');
assert.equal(screenShape.scope, 'PRODUCT_EXPLICIT');
assert.equal(screenShape.action, 'EXPLAIN');
assert.equal(screenShape.object, 'SURFACE');
assert.equal(screenShape.operation, 'EXPLAIN_CURRENT_SURFACE');
assert.equal(screenShape.resolution, 'RESOLVED');
assert.ok(screenHelp.reply.length >= 50);
assert.doesNotMatch(screenHelp.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu);

const screenUsageVariants = [
  'Bu ekran nasıl kullanılır?',
  'Bu panelde nasıl ilerlemeliyim?',
  'Bu sayfada nereden başlamalıyım?',
];
for (const [index, message] of screenUsageVariants.entries()) {
  const response = await ask({ user: company, screenContext: companyScreen, message, id: `screen-usage-${index}` });
  const shape = canonical(response);
  assert.equal(shape.family, 'SCREEN_CONTEXT', `${message} family`);
  assert.equal(shape.route, 'RETURN_TO_PRODUCT_TASK', `${message} route`);
  assert.equal(shape.scope, 'PRODUCT_EXPLICIT', `${message} scope`);
  assert.equal(shape.action, 'EXPLAIN', `${message} action`);
  assert.equal(shape.object, 'SURFACE', `${message} object`);
  assert.equal(shape.operation, 'EXPLAIN_CURRENT_SURFACE', `${message} operation`);
  assert.equal(shape.resolution, 'RESOLVED', `${message} resolution`);
  assert.ok(response.reply.length >= 50, `${message} useful reply`);
  assert.doesNotMatch(response.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${message} record clarification`);
}

const longVisibleAnswerCases = [
  { name: 'NOTIFICATIONS_RISK', path: '/shared/notifications', label: 'Bildirimler', message: 'Riskleri sırala' },
  { name: 'LOGS_RISK', path: '/shared/logs', label: 'Loglar', message: 'Riskleri sırala' },
  { name: 'FEEDBACK_RISK', path: '/shared/feedback', label: 'Geri Bildirim', message: 'Riskleri sırala' },
];
for (const item of longVisibleAnswerCases) {
  const response = await ask({
    user: { id: 993010, role: 'ROOM', companyId: null, roomId: 1, sessionVersion: 1 },
    screenContext: screen(1114, item.path, item.label, 'ROOM'),
    message: item.message,
    id: item.name.toLowerCase(),
  });
  assert.ok(response.reply.length <= 1000, `${item.name} bounded visible reply`);
  assert.doesNotMatch(response.reply, /…\s*$/u, `${item.name} does not end with an ellipsis truncation marker`);
}

const roomRiskGuidance = await ask({
  user: { id: 993009, role: 'ROOM', companyId: null, roomId: 1, sessionVersion: 1 },
  screenContext: screen(1114, '/room/operation-health', 'Operasyon Sağlığı', 'ROOM'),
  message: 'Operasyon risklerini sırala ve bana adım adım açıkla.',
  id: 'room-operation-health-risk-guidance-precedence',
});
const roomRiskShape = canonical(roomRiskGuidance);
assert.equal(roomRiskShape.family, 'RISK_RANKING');
assert.equal(roomRiskShape.action, 'ANALYZE');
assert.equal(roomRiskShape.operation, 'ASSESS_CURRENT_RISK');
assert.notEqual(roomRiskShape.family, 'ROLE_EXPLANATION_HELP');

const clarification = await ask({ user: company, screenContext: companyScreen, message: 'Şu kaydı anlat.', id: 'clarification' });
const clarificationShape = canonical(clarification);
assert.equal(clarificationShape.family, 'UNCLEAR_OR_AMBIGUOUS');
assert.equal(clarificationShape.route, 'UNCLEAR_OR_AMBIGUOUS');
assert.equal(clarificationShape.operation, 'CLARIFY_SEMANTIC_REQUEST');
assert.equal(clarificationShape.resolution, 'UNRESOLVED');
assert.match(clarification.reply, /hangi kayıt|konuyu kastettiğini|numarasını/iu);

const roleCases = [
  {
    name: 'COMPANY',
    user: company,
    screenContext: companyScreen,
    message: 'Şirket olarak ne yapabilirim?',
    anchor: /hizmet alan firma/iu,
  },
  {
    name: 'ROOM',
    user: { id: 993002, role: 'ROOM', companyId: null, roomId: 1, sessionVersion: 1 },
    screenContext: screen(1103, '/room/shifts', 'Vardiyalar', 'ROOM'),
    message: 'Oda yöneticisi olarak neleri yönetebilirim?',
    anchor: /taşımacılık firması/iu,
  },
  {
    name: 'SCHOOL',
    user: { id: 993003, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1, roomId: null, sessionVersion: 1 },
    screenContext: screen(1, '/school/operations', 'Okul Operasyonları', 'SCHOOL'),
    message: 'Okul rolümle hangi işleri yürütebilirim?',
    anchor: /okul rolünde/iu,
  },
  {
    name: 'DRIVER',
    user: { id: 993004, role: 'DRIVER', companyId: 1, roomId: null, sessionVersion: 1 },
    screenContext: screen(1, '/driver/today', 'Bugün', 'DRIVER'),
    message: 'Sürücü olarak ne yapabilirim?',
    anchor: /sürücü rolünde/iu,
  },
  {
    name: 'PARENT',
    user: { id: 993005, role: 'PARENT', companyId: null, roomId: null, sessionVersion: 1 },
    screenContext: screen(5101, '/parent/live', 'Canlı', 'PARENT'),
    message: 'Veli olarak ne yapabilirim?',
    anchor: /veli rolünde/iu,
  },
  {
    name: 'ORGANIZATION',
    user: { id: 993006, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1, roomId: null, sessionVersion: 1 },
    screenContext: screen(1, '/organization/operations', 'Organizasyon Operasyonları', 'ORGANIZATION'),
    message: 'Organizasyon tarafında ne yapabilirim?',
    anchor: /organizasyon/iu,
  },
  {
    name: 'PERSONEL',
    user: { id: 993007, role: 'PERSONEL', companyId: 1, roomId: null, sessionVersion: 1 },
    screenContext: screen(1, '/personel/live', 'Canlı', 'PERSONEL'),
    message: 'Personel rolünde neleri yönetebilirim?',
    anchor: /personel/iu,
  },
  {
    name: 'SUPER_ADMIN',
    user: { id: 993008, role: 'SUPER_ADMIN', companyId: null, roomId: null, sessionVersion: 1 },
    screenContext: screen(6117, '/superadmin/operations', 'Denetim Paneli', 'SUPER_ADMIN'),
    message: 'Sistem yöneticisi olarak ne yapabilirim?',
    anchor: /süper yönetici|super admin|sistem yöneticisi/iu,
  },
];

for (const item of roleCases) {
  const response = await ask({ ...item, id: item.name.toLowerCase() });
  const shape = canonical(response);
  assert.equal(shape.family, 'GENERIC_PRODUCT_HELP', `${item.name} family`);
  assert.equal(shape.scope, 'PRODUCT_EXPLICIT', `${item.name} scope`);
  assert.equal(shape.authorization, 'ALLOW', `${item.name} authorization`);
  assert.ok(response.reply.length >= 80, `${item.name} useful role help`);
  assert.match(response.reply, item.anchor, `${item.name} role-aware product truth`);
  assert.doesNotMatch(response.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.name} record clarification`);
}

const roleOrientationCases = [
  { name: 'COMPANY_ORIENTATION', user: company, screenContext: companyScreen, message: 'Şirket işleyişinde ilk olarak hangi sorumlulukları öğrenmeliyim?' },
  { name: 'ROOM_ORIENTATION', user: roleCases[1].user, screenContext: roleCases[1].screenContext, message: 'Taşıma firması hesabımda günlük görevlerimi anlamak için nereden başlamalıyım?' },
  { name: 'SCHOOL_ORIENTATION', user: roleCases[2].user, screenContext: roleCases[2].screenContext, message: 'Okul tarafında önce hangi görev alanlarını tanımalıyım?' },
  { name: 'ORGANIZATION_ORIENTATION', user: roleCases[5].user, screenContext: roleCases[5].screenContext, message: 'Organizasyon hesabımda başlangıçta hangi işleri öğrenmeliyim?' },
  { name: 'DRIVER_ORIENTATION', user: roleCases[3].user, screenContext: roleCases[3].screenContext, message: 'Sürücü olarak günlük adımlarımı anlamak için nereden başlamalıyım?' },
  { name: 'PERSONEL_ORIENTATION', user: roleCases[6].user, screenContext: roleCases[6].screenContext, message: 'Personel tarafında bana düşen işleri nasıl kavramalıyım?' },
  { name: 'PARENT_ORIENTATION', user: roleCases[4].user, screenContext: roleCases[4].screenContext, message: 'Veli olarak benden beklenen görevleri nasıl öğrenmeliyim?' },
  { name: 'SUPER_ADMIN_ORIENTATION', user: roleCases[7].user, screenContext: roleCases[7].screenContext, message: 'Yönetici hesabında başlangıç sorumluluklarını nereden tanımalıyım?' },
];

for (const item of roleOrientationCases) {
  const response = await ask({ ...item, id: item.name.toLowerCase() });
  const shape = canonical(response);
  assert.equal(shape.family, 'GENERIC_PRODUCT_HELP', `${item.name} family`);
  assert.equal(shape.scope, 'PRODUCT_EXPLICIT', `${item.name} scope`);
  assert.equal(shape.action, 'EXPLAIN', `${item.name} action`);
  assert.equal(shape.operation, 'GENERAL_INFORMATION', `${item.name} operation`);
  assert.equal(shape.authorization, 'ALLOW', `${item.name} authorization`);
  assert.equal(shape.resolution, 'RESOLVED', `${item.name} resolution`);
  assert.ok(response.reply.length >= 80, `${item.name} useful role orientation`);
  assert.doesNotMatch(response.reply, /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${item.name} record clarification`);
}

console.log(JSON.stringify({
  status: 'PASS',
  manualDefect: { message: BASE_MESSAGE, canonical: generalShape },
  serviceGeneralHelp: generalShape,
  serviceScreenHelp: screenShape,
  serviceRoomRiskGuidance: roomRiskShape,
  serviceTrueClarification: clarificationShape,
  roleCases: roleCases.map(({ name }) => name),
  roleOrientationCases: roleOrientationCases.map(({ name }) => name),
  businessWriteExecution: 0,
  externalLlmProviderCount: 0,
  externalLlmNetworkCallCount: 0,
}, null, 2));
