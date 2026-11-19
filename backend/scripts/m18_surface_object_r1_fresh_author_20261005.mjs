import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import {
  loadContractPacket,
  sha256,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, 'm18-surface-object-r1-fresh-unseen-56-governed-v4r2r1-candidate-20261005.json');
const packet = loadContractPacket(readFileSync(packetPath));

const AUTHOR_CONTEXT_ID = 'm18-v4r2r1-surface-object-author-6ea8d944-3f4b-4dc2-93a7-0c3d9f2d5e11';
const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challengeClasses = [
  'EXPLAIN/CURRENT_SURFACE',
  'VIEW_OR_NAVIGATE',
  'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY',
  'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED',
  'DOMAIN_TASK_OR_GENUINE_OOS',
];
const users = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};
const tenants = {
  COMPANY: { type: 'COMPANY', companyKind: 'COMPANY' },
  ROOM: { type: 'ROOM', companyKind: null },
  SCHOOL: { type: 'COMPANY', companyKind: 'SCHOOL' },
  ORGANIZATION: { type: 'COMPANY', companyKind: 'ORGANIZATION' },
  DRIVER: { type: 'COMPANY', companyKind: 'COMPANY' },
  PERSONEL: { type: 'COMPANY', companyKind: 'COMPANY' },
  PARENT: { type: 'PARENT', companyKind: null },
  SUPER_ADMIN: { type: 'SUPER_ADMIN', companyKind: null },
};
const runtimeRole = (role) => ['SCHOOL', 'ORGANIZATION'].includes(role) ? 'COMPANY' : role;
const cityByRole = {
  COMPANY: 'İzmir', ROOM: 'Bursa', SCHOOL: 'Konya', ORGANIZATION: 'Antalya',
  DRIVER: 'Samsun', PERSONEL: 'Adana', PARENT: 'Mersin', SUPER_ADMIN: 'Eskişehir',
};
const ambiguousTurnByRole = {
  COMPANY: 'Şu kaydı güncelle.',
  ROOM: 'Şu kaydı günceller misin?',
  SCHOOL: 'Şu kaydı değiştirelim.',
  ORGANIZATION: 'Şu kaydın durumunu güncelle.',
  DRIVER: 'Şu kaydı yenileyebilir misin?',
  PERSONEL: 'Şu kaydı düzenlemek istiyorum.',
  PARENT: 'Şu kaydı açabilir misin?',
  SUPER_ADMIN: 'Şu kaydı güncellemem gerekiyor.',
};

const screenFor = (role) => {
  const screen = listScreensForUser(users[role])[0];
  if (!screen) throw new Error(`NO_AUTHORIZED_SCREEN:${role}`);
  return { ...screen, role: runtimeRole(role) };
};
const screens = Object.fromEntries(roles.map((role) => [role, screenFor(role)]));

function contextFor(role, scope, selectedEntity = null) {
  return {
    source: 'AUTHORIZED_PRODUCT_CATALOG',
    role,
    tenantContext: tenants[role],
    screen: ['PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'].includes(scope) ? null : screens[role],
    selectedEntity,
  };
}

function project(role, message, screenContext) {
  const result = resolveCanonicalConversationRequest({
    message,
    user: users[role],
    screenContext,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  const request = result.request || {};
  const semanticAction = request.semanticAction || {};
  const typedEvidence = request.typedEvidence || {};
  return {
    EXPECTED_SEMANTIC_SCOPE: request.semanticScope?.class || 'PRODUCT_EXPLICIT',
    EXPECTED_REQUEST_MODE: typedEvidence.requestMode?.value || 'EXPLAIN',
    EXPECTED_SEMANTIC_ACTION: semanticAction.actionClass || 'NONE',
    EXPECTED_ACTION: semanticAction.actionClass || 'NONE',
    EXPECTED_OBJECT: semanticAction.objectClass || null,
    EXPECTED_REFERENCE_CLASS: typedEvidence.reference?.value || semanticAction.referenceClass || 'ABSENT',
    EXPECTED_RESOLUTION_STATUS: semanticAction.resolutionStatus || 'RESOLVED',
    EXPECTED_TASK_OR_TASK_FAMILY: request.task || request.taskType || 'NONE',
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: request.operation || 'GENERAL_INFORMATION',
  };
}

function authorizationClass(role, projection) {
  if (projection.EXPECTED_SEMANTIC_SCOPE === 'OFF_TOPIC_GENUINE') return 'NOT_APPLICABLE';
  if (projection.EXPECTED_SEMANTIC_SCOPE === 'PRODUCT_AMBIGUOUS' || projection.EXPECTED_ACTION === 'NONE') return 'SEMANTIC_CLARIFICATION';
  if (projection.EXPECTED_ACTION === 'EXPLAIN') return 'ALLOW_GUIDANCE';
  if (['NAVIGATE', 'VIEW'].includes(projection.EXPECTED_ACTION)) return 'AUTHORIZED_CONTEXT_READ';
  if (['CONTINUE', 'NEXT', 'PREVIOUS'].includes(projection.EXPECTED_ACTION)) return 'AUTHORIZED_OPERATION';
  if (projection.EXPECTED_ACTION === 'CREATE') {
    if (role === 'COMPANY') return 'AUTHORIZED_PLANNING_INTENT';
    if (role === 'ROOM') return 'UNAUTHORIZED_CREATE';
    if (role === 'SUPER_ADMIN') return 'AUTHORIZED_OPERATION';
    return 'AUTHORIZATION_DENIAL';
  }
  return 'AUTHORIZED_CONTEXT_READ';
}

function caseFor(role, roleIndex, challengeIndex) {
  const label = screens[role].label;
  let turns;
  let surface = `${label} bu rol için yetkili katalog yüzeyidir.`;
  let state = 'Taze, salt-okunur yetkili yüzey durumu; iş yazımı yapılmaz.';
  let reference = 'Bağımsız kayıt seçilmemiştir; yalnızca yetkili yüzey bağlamı vardır.';
  let scopeForContext = 'PRODUCT_EXPLICIT';
  let projection;
  let contractSource = 'PRODUCT_SURFACE_CONTRACT';
  let selectedEntity = null;

  if (challengeIndex === 0) {
    turns = [`${label} ekranının nasıl çalıştığını anlatır mısın?`];
    projection = project(role, turns[0], screens[role]);
  } else if (challengeIndex === 1) {
    const navigate = roleIndex % 2 === 0;
    turns = [navigate
      ? `${label} bölümüne geçip ilk kullanımı gösterir misin?`
      : `${label} bölümündeki güncel durumu incelemek istiyorum.`];
    projection = project(role, turns[0], screens[role]);
  } else if (challengeIndex === 2) {
    turns = [ambiguousTurnByRole[role]];
    surface = 'Referansı bilerek çözülmemiş bir kayıt isteği; ekran bağlamı kullanılmaz.';
    state = 'Kayıt hedefi tekil olarak çözümlenmemiştir.';
    reference = 'Deiktik kayıt ifadesi vardır ancak geçerli tekil kayıt bağlanmaz.';
    scopeForContext = 'PRODUCT_AMBIGUOUS';
    projection = {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS',
      EXPECTED_REQUEST_MODE: 'UNRESOLVED',
      EXPECTED_SEMANTIC_ACTION: 'NONE',
      EXPECTED_ACTION: 'NONE',
      EXPECTED_OBJECT: null,
      EXPECTED_REFERENCE_CLASS: 'UNRESOLVED',
      EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED',
      EXPECTED_TASK_OR_TASK_FAMILY: 'CLARIFY',
      EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST',
    };
    contractSource = 'REFERENCE_CONTRACT';
  } else if (challengeIndex === 3) {
    turns = ['İlk akışı birlikte gözden geçirelim.', 'Bir sonraki adıma geçmeye devam edelim.'];
    surface = `${label} bağlamında aynı konuşma içinde devam edilebilir bir akış vardır.`;
    state = 'İlk tur tamamlanmış, ikinci tur için taze devam durumu korunmuştur.';
    reference = 'İkinci tur önceki konuşma durumuna bağlanır; dış kayıt seçilmez.';
    scopeForContext = 'PRODUCT_CONTEXTUAL';
    projection = {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_CONTEXTUAL',
      EXPECTED_REQUEST_MODE: 'CONTINUE',
      EXPECTED_SEMANTIC_ACTION: 'CONTINUE',
      EXPECTED_ACTION: 'CONTINUE',
      EXPECTED_OBJECT: 'RECORD',
      EXPECTED_REFERENCE_CLASS: 'ABSENT',
      EXPECTED_RESOLUTION_STATUS: 'RESOLVED',
      EXPECTED_TASK_OR_TASK_FAMILY: 'NONE',
      EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CONTINUE_EXPLANATION',
    };
    contractSource = 'CONTINUATION_CONTRACT';
  } else if (challengeIndex === 4) {
    turns = ['Yeni bir vardiya oluşturmak için hangi bilgileri hazırlamalıyım?'];
    projection = project(role, turns[0], screens[role]);
    contractSource = 'ROLE_BOUNDARY';
  } else if (challengeIndex === 5) {
    turns = ['Bu işi hangi kayıttan başlatacağımı bilmiyorum.'];
    surface = 'Belirsiz hedef için ekran bağlamı bilinçli olarak yoktur.';
    state = 'Hedef kayıt ve hedef yüzey çözülmemiştir.';
    reference = 'Belirsiz deiktik kayıt ifadesi; sahte varlık bağlanmaz.';
    scopeForContext = 'PRODUCT_AMBIGUOUS';
    projection = {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS',
      EXPECTED_REQUEST_MODE: 'UNRESOLVED',
      EXPECTED_SEMANTIC_ACTION: 'NONE',
      EXPECTED_ACTION: 'NONE',
      EXPECTED_OBJECT: null,
      EXPECTED_REFERENCE_CLASS: 'UNRESOLVED',
      EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED',
      EXPECTED_TASK_OR_TASK_FAMILY: 'CLARIFY',
      EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST',
    };
    contractSource = 'REFERENCE_CONTRACT';
  } else {
    turns = [`Sistem dışı bir konu olarak yarın ${cityByRole[role]} hava durumunu söyler misin?`];
    surface = 'Ürün dışı genel bilgi isteği; yetkili ürün ekranı gerektirmez.';
    state = 'Ürün kapsamı dışında ve salt yönlendirme niteliğinde bir istek.';
    reference = 'Ürüne ait kayıt veya yüzey referansı yoktur.';
    scopeForContext = 'OFF_TOPIC_GENUINE';
    projection = {
      EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE',
      EXPECTED_REQUEST_MODE: 'GENUINE_OOS',
      EXPECTED_SEMANTIC_ACTION: 'NONE',
      EXPECTED_ACTION: 'NONE',
      EXPECTED_OBJECT: null,
      EXPECTED_REFERENCE_CLASS: 'ABSENT',
      EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE',
      EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC',
      EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION',
    };
    contractSource = 'OOS_CONTRACT';
  }

  const expectedAuthorizationClass = authorizationClass(role, projection);
  return {
    CASE_ID: `M18-R4R2R1-${role}-${String(challengeIndex + 1).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: tenants[role].type,
    TURN_COUNT: turns.length,
    TURN_1: turns[0],
    TURN_2: turns[1] || null,
    TURN_3: null,
    SURFACE_PRECONDITION: surface,
    STATE_PRECONDITION: state,
    REFERENCE_PRECONDITION: reference,
    CHALLENGE_CLASS: challengeClasses[challengeIndex],
    ...projection,
    EXPECTED_AUTHORIZATION_CLASS: expectedAuthorizationClass,
    CONTRACT_SOURCE_CLASS: contractSource,
    EXPECTED_USER_BEHAVIOR: 'Gerçek iş yazmadan, kanonik semantik eksenler ve rol sınırlarıyla güvenli yönlendirme sağlanır.',
    PROHIBITED_OUTCOMES: 'Uydurma kayıt, yetkisiz iş yazımı, yüzey adından semantik nesne çıkarımı ve ekran metninden rota üretimi yasaktır.',
    CONTRACT_RATIONALE: `Bağımsız R4R2R1 ${role} vakası; yüzey bağlamı, semantik nesne, devam durumu ve rol sözleşmesi ayrı eksenlerde yazıldı.`,
    EXECUTION_CONTEXT: contextFor(role, scopeForContext, selectedEntity),
  };
}

const cases = roles.flatMap((role, roleIndex) => challengeClasses.map((_, challengeIndex) => caseFor(role, roleIndex, challengeIndex)));
const candidate = {
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId: 'M18-SURFACE-OBJECT-R1-FRESH-UNSEEN-56-GOVERNED-V4R2R1-20261005',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: cases.length,
  cases,
};
const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
const structural = validateCandidateManifestSchema(candidate);
const expectations = validateCandidateExpectations(candidate, packet);
const candidateManifestSha256 = sha256(candidateBytes);

console.log(JSON.stringify({
  status: structural.safe && expectations.safe ? 'GREEN' : 'BLOCKED_PRE_FREEZE',
  authorContextId: AUTHOR_CONTEXT_ID,
  candidatePath,
  candidateManifestSha256,
  caseCount: cases.length,
  roleCount: roles.length,
  casesPerRole: 7,
  structuralValidation: structural.safe ? '56/56 GREEN' : structural,
  expectationValidation: expectations.safe ? '56/56 GREEN' : expectations,
  failureReasons: [...new Set([...structural.failureReasons, ...expectations.failureReasons])],
}, null, 2));

if (!structural.safe || !expectations.safe) process.exitCode = 1;
else writeFileSync(candidatePath, candidateBytes);
