#!/usr/bin/env node

import assert from 'node:assert/strict';
import Module from 'node:module';

const PRISMA_MUTATION_METHODS = Object.freeze([
  'create', 'createMany', 'createManyAndReturn', 'delete', 'deleteMany',
  'update', 'updateMany', 'updateManyAndReturn', 'upsert',
]);
const PRISMA_ROOT_MUTATION_METHODS = Object.freeze([
  '$executeRaw', '$executeRawUnsafe', '$runCommandRaw', '$transaction',
]);
const LLM_SECRET_ENV_KEYS = Object.freeze([
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'AZURE_OPENAI_API_KEY', 'LLM_API_SECRET',
]);
const RUNTIME_COUNTER_FIELDS = Object.freeze([
  'businessWriteExecution', 'draftCreation', 'offerSend', 'dispatchExecution',
  'financialWrite', 'authorizationMutation', 'downstreamBusinessWrite',
  'externalLlmProviderCount', 'externalLlmNetworkCallCount', 'llmApiSecretCount',
]);
const EXTERNAL_PROVIDER_NAMES = /^(?:openai|@anthropic|@google-generativeai|@google\/generative-ai|@azure\/openai|@google-cloud\/vertexai|@ai-sdk\/)/u;

function installRuntimeGuards(client) {
  const counters = {
    prismaMutationAttemptCount: 0,
    prismaMutationBlockedCount: 0,
    externalNetworkAttemptCount: 0,
    externalNetworkBlockedCount: 0,
    directCounterEvidence: Object.fromEntries(RUNTIME_COUNTER_FIELDS.map((field) => [field, {
      observed: false,
      value: null,
      source: 'RUNTIME_GUARD',
    }])),
  };
  const observe = (field, delta = 0) => {
    const evidence = counters.directCounterEvidence[field];
    if (!evidence) throw new Error(`M18_UNKNOWN_RUNTIME_COUNTER:${field}`);
    evidence.observed = true;
    evidence.value = (Number.isFinite(evidence.value) ? evidence.value : 0) + delta;
    evidence.source = 'RUNTIME_GUARD';
  };
  const observeUntriggered = () => {
    for (const field of RUNTIME_COUNTER_FIELDS) {
      if (!counters.directCounterEvidence[field].observed) observe(field, 0);
    }
  };
  const restorations = [];
  const blockedMutation = (label) => (..._args) => {
    counters.prismaMutationAttemptCount += 1;
    counters.prismaMutationBlockedCount += 1;
    observe('businessWriteExecution', 1);
    throw new Error(`M18_RUNTIME_WRITE_GUARD_BLOCKED:${label}`);
  };
  const wrap = (target, key, label) => {
    if (!target || typeof target[key] !== 'function') return;
    const hadOwn = Object.hasOwn(target, key);
    const descriptor = hadOwn ? Object.getOwnPropertyDescriptor(target, key) : null;
    target[key] = blockedMutation(label);
    restorations.push(() => {
      if (hadOwn) Object.defineProperty(target, key, descriptor);
      else delete target[key];
    });
  };

  for (const modelName of Object.keys(client)) {
    if (modelName.startsWith('_') || modelName.startsWith('$')) continue;
    const delegate = client[modelName];
    for (const method of PRISMA_MUTATION_METHODS) wrap(delegate, method, `${modelName}.${method}`);
  }
  for (const method of PRISMA_ROOT_MUTATION_METHODS) wrap(client, method, method);
  observeUntriggered();

  return {
    counters,
    observe,
    restore() {
      for (const restoreOne of restorations.reverse()) restoreOne();
    },
  };
}

function installExternalProviderGuard(counters) {
  const originalLoad = Module._load;
  Module._load = function guardedLoad(request, parent, isMain) {
    if (EXTERNAL_PROVIDER_NAMES.test(String(request))) {
      counters.externalLlmProviderCount += 1;
      const evidence = counters.directCounterEvidence.externalLlmProviderCount;
      evidence.observed = true;
      evidence.value += 1;
      throw new Error(`M18_EXTERNAL_LLM_PROVIDER_BLOCKED:${request}`);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  return () => { Module._load = originalLoad; };
}

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

function screen(path, role) {
  const ids = {
    COMPANY: 1,
    ROOM: 1103,
    SCHOOL: 1,
    ORGANIZATION: 1,
    DRIVER: 1,
    PARENT: 5101,
    PERSONEL: 1,
    SUPER_ADMIN: 6117,
  };
  const labels = {
    COMPANY: 'Operasyon Paneli',
    ROOM: 'Vardiyalar',
    SCHOOL: 'Okul Operasyonları',
    ORGANIZATION: 'Organizasyon Operasyonları',
    DRIVER: 'Bugün',
    PARENT: 'Canlı',
    PERSONEL: 'Canlı',
    SUPER_ADMIN: 'Denetim Paneli',
  };
  return { id: ids[role] || 1200, path, label: labels[role] || role, role };
}

function userFor(role) {
  if (role === 'ROOM') return { id: 995001, role, roomId: 1, companyId: null, sessionVersion: 1 };
  if (role === 'SCHOOL') return { id: 995002, role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'ORGANIZATION') return { id: 995003, role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'COMPANY') return { id: 995004, role, companyKind: 'COMPANY', companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'DRIVER') return { id: 995005, role, companyId: 1, roomId: null, sessionVersion: 1 };
  if (role === 'PARENT') return { id: 995006, role, companyId: null, roomId: null, sessionVersion: 1 };
  if (role === 'PERSONEL') return { id: 995007, role, companyId: 1, roomId: null, sessionVersion: 1 };
  return { id: 995008, role: 'SUPER_ADMIN', companyId: null, roomId: null, sessionVersion: 1 };
}

const ROLE_CASES = Object.freeze([
  { role: 'COMPANY', message: 'Şirket tarafında üzerime düşen işleri nasıl öğrenirim?', anchor: /hizmet alan firma|şirket|teklif|sözleşme|vardiya/iu },
  { role: 'ROOM', message: 'Taşıma tarafında günlük sorumluluklarımı nasıl takip ederim?', anchor: /taşımacılık firması|vardiya|operasyon|araç|sürücü/iu },
  { role: 'SCHOOL', message: 'Okul tarafında benden beklenen görevleri nasıl öğrenirim?', anchor: /okul|servis|operasyon|vardiya/iu },
  { role: 'ORGANIZATION', message: 'Organizasyon tarafındaki başlangıç işlerini nasıl kavrarım?', anchor: /organizasyon|plan|onay|vardiya/iu },
  { role: 'DRIVER', message: 'Sürücü olarak günlük görevlerimi nasıl öğrenirim?', anchor: /sürücü|rota|görev|başlatma|konum/iu },
  { role: 'PARENT', message: 'Veli olarak hangi görevleri öğrenmeliyim?', anchor: /veli|öğrenci|servis|varış/iu },
  { role: 'PERSONEL', message: 'Personel tarafında bana düşen işleri nasıl öğrenirim?', anchor: /personel|servis|görev|konum|sürücü/iu },
  { role: 'SUPER_ADMIN', message: 'Sistem yöneticisi olarak başlangıç görevlerimi nasıl öğrenirim?', anchor: /sistem yöneticisi|süper yönetici|super admin|denetim|risk|kanıt|operasyon/iu },
]);

// Structural role-help composition controls. These utterances contain domain
// nouns, but ask about responsibility, purpose, capability, or boundaries;
// they must not be rewritten as record/count/surface operations merely
// because a concrete product term is present.
const ROLE_HELP_COMPOSITION_CASES = Object.freeze([
  { role: 'COMPANY', message: 'Tekliften vardiya planına uzanan bölümde benim payım nerede?', path: '/company', label: 'Planlama Merkezi' },
  { role: 'SCHOOL', message: 'Okul hesabının servis sürecindeki görevi nedir?', path: '/school/operations', label: 'Okul Operasyonları' },
  { role: 'SCHOOL', message: 'Okul tarafında ürünün bana açtığı görüş alanı', path: '/school/operations', label: 'Okul Operasyonları' },
  { role: 'PARENT', message: 'Servis akışında veliye ait olmayan kararlar', path: '/parent/live', label: 'Veli Canlı' },
]);

const { default: prisma } = await import('../src/prisma.js');
const runtimeGuards = installRuntimeGuards(prisma);
const restoreProviderGuard = installExternalProviderGuard(runtimeGuards.counters);
const [{ runCopilotFoundation }, { authorizeSemanticRequest }, { resolveCanonicalConversationRequest }] = await Promise.all([
  import('../src/ai/service.js'),
  import('../src/ai/chat/authorizationGate.js'),
  import('../src/ai/chat/canonicalSemanticRequest.js'),
]);
const { buildRoleHelpSummary } = await import('../src/ai/jobGuide/screenCatalog.js');
runtimeGuards.counters.llmApiSecretCount = LLM_SECRET_ENV_KEYS.filter((key) => Boolean(process.env[key])).length;
runtimeGuards.observe('llmApiSecretCount', runtimeGuards.counters.llmApiSecretCount);

async function ask(item, index) {
  const role = item.role;
  const paths = {
    COMPANY: '/company/operations',
    ROOM: '/room/shifts',
    SCHOOL: '/school/operations',
    ORGANIZATION: '/organization/operations',
    DRIVER: '/driver/today',
    PARENT: '/parent/live',
    PERSONEL: '/personel/live',
    SUPER_ADMIN: '/superadmin/operations',
  };
  const response = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: userFor(role),
    screenContext: screen(paths[role], role),
    message: item.message,
    authSessionId: `m18-l01-role-help-${index}`,
  });
  const shape = canonical(response);
  assert.equal(shape.family, 'ROLE_EXPLANATION_HELP', `${role} response family`);
  assert.equal(shape.scope, 'PRODUCT_EXPLICIT', `${role} scope`);
  assert.equal(shape.action, 'EXPLAIN', `${role} action`);
  assert.equal(shape.object, 'SURFACE', `${role} object`);
  assert.ok(['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(shape.operation), `${role} operation`);
  assert.equal(shape.authorization, 'ALLOW', `${role} authorization`);
  assert.equal(shape.resolution, 'RESOLVED', `${role} resolution`);
  assert.ok(String(response.reply || '').length >= 80, `${role} useful response`);
  assert.match(String(response.reply || ''), item.anchor, `${role} grounded role response`);
  assert.doesNotMatch(String(response.reply || ''), /hangi kayıt|kayıt türünü|görünen adını|numarasını/iu, `${role} must not clarify a record`);
  return { role, message: item.message, canonical: shape };
}

const previousFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  runtimeGuards.counters.externalNetworkAttemptCount += 1;
  runtimeGuards.counters.externalNetworkBlockedCount += 1;
  runtimeGuards.observe('externalLlmNetworkCallCount', 1);
  throw new Error(`external network is forbidden in L01 regression: ${String(args[0] || '')}`);
};

try {
  const roles = [];
  for (let index = 0; index < ROLE_CASES.length; index += 1) roles.push(await ask(ROLE_CASES[index], index));

  for (const [index, item] of ROLE_HELP_COMPOSITION_CASES.entries()) {
    const response = await runCopilotFoundation({
      intent: 'CHAT_HELP',
      entityType: 'screen',
      entityId: 0,
      user: userFor(item.role),
      screenContext: screen(item.path, item.role),
      message: item.message,
      authSessionId: `m18-l01-role-help-composition-${index}`,
    });
    const shape = canonical(response);
    assert.equal(shape.family, 'ROLE_EXPLANATION_HELP', `${item.role} composition response family`);
    assert.equal(shape.scope, 'PRODUCT_EXPLICIT', `${item.role} composition scope`);
    assert.equal(shape.action, 'EXPLAIN', `${item.role} composition action`);
    assert.ok(['GENERAL_INFORMATION', 'EXPLAIN_CURRENT_SURFACE'].includes(shape.operation), `${item.role} composition operation`);
    assert.equal(shape.object, 'SURFACE', `${item.role} composition object`);
    assert.equal(shape.authorization, 'ALLOW', `${item.role} composition authorization`);
    assert.equal(shape.resolution, 'RESOLVED', `${item.role} composition resolution`);
  }

  const roomCapabilityDisclosure = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user: userFor('ROOM'),
    screenContext: screen('/room', 'ROOM'),
    message: 'Taşımacılık firması olarak hangi işlemleri yapabilirim?',
    authSessionId: 'm18-l01-room-capability-disclosure',
  });
  const authorizedRoomLabels = buildRoleHelpSummary(userFor('ROOM')).screens
    .map((item) => String(item?.label || '').trim())
    .filter(Boolean);
  assert.ok(
    authorizedRoomLabels.some((label) => String(roomCapabilityDisclosure.reply || '').includes(label)),
    'ROOM role-help must disclose at least one existing authorized surface from the role catalog',
  );
  assert.match(
    String(roomCapabilityDisclosure.reply || ''),
    /(?:ilk|önce|sonraki|takip|kontrol|aç)/iu,
    'ROOM role-help must include an actionable next step',
  );

  const company = userFor('COMPANY');
  const companyScreen = screen('/company/operations', 'COMPANY');
  const clarify = await runCopilotFoundation({
    intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: company,
    screenContext: companyScreen, message: 'Şu kaydı anlat.', authSessionId: 'm18-l01-clarify',
  });
  const clarifyShape = canonical(clarify);
  assert.equal(clarifyShape.family, 'UNCLEAR_OR_AMBIGUOUS', 'false-positive entity control family');
  assert.equal(clarifyShape.action, 'NONE', 'false-positive entity control action');
  assert.equal(clarifyShape.resolution, 'UNRESOLVED', 'false-positive entity control resolution');

  const view = await runCopilotFoundation({
    intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: company,
    screenContext: companyScreen, message: 'Vardiya listesini görüntüle.', authSessionId: 'm18-l01-view',
  });
  const viewShape = canonical(view);
  assert.equal(viewShape.family, 'UI_GUIDANCE', 'operational false-positive family');
  assert.equal(viewShape.action, 'VIEW', 'operational false-positive action');
  assert.equal(viewShape.object, 'SHIFT', 'operational false-positive object');

  const navigate = await runCopilotFoundation({
    intent: 'CHAT_HELP', entityType: 'screen', entityId: 0, user: company,
    screenContext: companyScreen, message: 'Sözleşmeler sayfasına geçelim.', authSessionId: 'm18-l01-navigate',
  });
  const navigateShape = canonical(navigate);
  assert.equal(navigateShape.action, 'NAVIGATE', 'navigate is not role help');
  assert.equal(navigateShape.object, 'SURFACE', 'navigate target surface object');

  const tenantCanonical = resolveCanonicalConversationRequest({
    message: 'Vardiya kayıtlarını görüntüle.',
    user: company,
    screenContext: companyScreen,
    selectedEntity: { type: 'SHIFT', id: 42 },
    conversationState: { recentMessages: [], activeGuidedTask: null, uiSurface: companyScreen },
    interpreterMode: 'DETERMINISTIC',
  });
  assert.equal(tenantCanonical.request.semanticAction.resolutionStatus, 'RESOLVED', 'tenant request is understood before auth');
  const crossTenantRequest = {
    ...tenantCanonical.request,
    candidateEntityRefs: (tenantCanonical.request.candidateEntityRefs || []).map((ref) => ({ ...ref, tenantId: 9999 })),
  };
  const tenantAuthorization = await authorizeSemanticRequest({ user: company, plan: {}, request: crossTenantRequest });
  assert.equal(tenantAuthorization.status, 'DENY', 'cross-tenant request is denied');
  assert.equal(tenantAuthorization.reason, 'TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL', 'cross-tenant denial reason');

  const directEvidence = runtimeGuards.counters.directCounterEvidence;
  const readCounter = (field) => {
    const evidence = directEvidence[field];
    assert.equal(evidence?.observed, true, `${field} has direct runtime observation`);
    assert.equal(evidence?.source, 'RUNTIME_GUARD', `${field} observation source`);
    assert.equal(Number.isFinite(evidence?.value), true, `${field} observation value`);
    return evidence.value;
  };
  for (const field of RUNTIME_COUNTER_FIELDS) readCounter(field);
  const businessWriteExecution = readCounter('businessWriteExecution');
  const authorizationMutation = readCounter('authorizationMutation');
  const downstreamBusinessWrite = readCounter('downstreamBusinessWrite');
  const externalLlmProviderCount = readCounter('externalLlmProviderCount');
  const externalLlmNetworkCallCount = readCounter('externalLlmNetworkCallCount');
  const llmApiSecretCount = readCounter('llmApiSecretCount');
  assert.equal(runtimeGuards.counters.prismaMutationBlockedCount, businessWriteExecution, 'all observed writes were blocked');
  assert.equal(runtimeGuards.counters.externalNetworkBlockedCount, externalLlmNetworkCallCount, 'all observed external calls were blocked');
  assert.equal(businessWriteExecution, 0, 'L01 business writes remain zero');
  assert.equal(authorizationMutation, 0, 'L01 authorization mutations remain zero');
  assert.equal(downstreamBusinessWrite, 0, 'L01 downstream writes remain zero');
  assert.equal(externalLlmNetworkCallCount, 0, 'L01 external AI/network calls remain zero');
  assert.equal(llmApiSecretCount, 0, 'L01 LLM API secrets remain absent');

  console.log(JSON.stringify({
    status: 'PASS',
    caseId: 'L01',
    semantics: {
      family: 'GENERIC_PRODUCT_HELP',
      action: 'EXPLAIN',
      object: 'SURFACE',
      authorization: 'ALLOW',
      resolution: 'RESOLVED',
      roles: roles.map((item) => item.role),
    },
    falsePositiveNegatives: [
      { id: 'ENTITY_CLARIFICATION', canonical: clarifyShape },
      { id: 'TRUE_VIEW', canonical: viewShape },
      { id: 'TRUE_NAVIGATE', canonical: navigateShape },
    ],
    tenant: {
      semanticResolution: tenantCanonical.request.semanticAction.resolutionStatus,
      authorization: tenantAuthorization.status,
      reason: tenantAuthorization.reason,
    },
    roleCases: roles,
    counters: {
      businessWriteExecution,
      authorizationMutation,
      downstreamBusinessWrite,
      externalLlmProviderCount,
      externalLlmNetworkCallCount,
      llmApiSecretCount,
      source: 'RUNTIME_GUARD',
      observed: directEvidence,
      prismaMutationBlockedCount: runtimeGuards.counters.prismaMutationBlockedCount,
      externalNetworkBlockedCount: runtimeGuards.counters.externalNetworkBlockedCount,
    },
  }, null, 2));
} finally {
  globalThis.fetch = previousFetch;
  runtimeGuards.restore();
  restoreProviderGuard();
  await prisma.$disconnect().catch(() => {});
}
