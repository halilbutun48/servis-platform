import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  loadContractPacket,
  sha256,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-candidate.json');
const metadataPath = resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-author.json');
const packetBytes = readFileSync(packetPath);
const packet = loadContractPacket(packetBytes);

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
const screens = Object.fromEntries(roles.map((role) => {
  const screen = listScreensForUser(users[role])[0];
  if (!screen) throw new Error(`NO_AUTHORIZED_SCREEN:${role}`);
  return [role, { ...screen, role: runtimeRole(role) }];
}));
const authorContextId = `m18-vcd-author-${randomUUID()}`;

function contextFor(role, scope) {
  return {
    source: 'AUTHORIZED_PRODUCT_CATALOG',
    role,
    tenantContext: tenants[role],
    screen: ['PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'].includes(scope) ? null : screens[role],
    selectedEntity: null,
  };
}

function expected(kind, role) {
  if (kind === 'surfaceExplain') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'navigate') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'NAVIGATE', EXPECTED_SEMANTIC_ACTION: 'NAVIGATE', EXPECTED_ACTION: 'NAVIGATE', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'NAVIGATE_AUTHORIZED_SURFACE', EXPECTED_AUTHORIZATION_CLASS: role === 'ROOM' ? 'AUTHORIZATION_DENIAL' : 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY',
  };
  if (kind === 'view') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'VIEW', EXPECTED_SEMANTIC_ACTION: 'VIEW', EXPECTED_ACTION: 'VIEW', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'VIEW_AUTHORIZED_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'updateUnresolved') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'UPDATE', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'genericHelp') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'CONTINUATION_CONTRACT',
  };
  if (kind === 'create') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'CREATE', EXPECTED_SEMANTIC_ACTION: 'CREATE', EXPECTED_ACTION: 'CREATE', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CREATE_SHIFT', EXPECTED_AUTHORIZATION_CLASS: role === 'COMPANY' ? 'AUTHORIZED_PLANNING_INTENT' : 'AUTHORIZATION_CONTEXT_CLARIFICATION', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY',
  };
  if (kind === 'ambiguity') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  return {
    EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE', EXPECTED_REQUEST_MODE: 'GENUINE_OOS', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE', EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'OOS_CONTRACT',
  };
}

function defineCase(role, roleIndex, challengeIndex) {
  const label = screens[role].label;
  let kind;
  let scope = 'PRODUCT_EXPLICIT';
  let turn;
  if (challengeIndex === 0) {
    kind = 'surfaceExplain';
    turn = `${label} ekranını açıklayabilir misin?`;
  } else if (challengeIndex === 1) {
    kind = 'navigate';
    turn = 'Yönetim ekranına geçip ilk adımı anlatır mısın?';
  } else if (challengeIndex === 2) {
    kind = 'view';
    turn = 'Bugünkü vardiyaları görmek istiyorum.';
  } else if (challengeIndex === 3) {
    kind = 'updateUnresolved';
    scope = 'PRODUCT_AMBIGUOUS';
    turn = 'Şu vardiyanın tarihini değiştirmek istiyorum.';
  } else if (challengeIndex === 4) {
    kind = 'genericHelp';
    turn = 'İlk adımı nasıl belirlemeliyim?';
  } else if (challengeIndex === 5) {
    kind = role === 'ROOM' ? 'navigate' : 'create';
    turn = role === 'ROOM' ? 'Şirket yönetim ekranına geçmek istiyorum.' : 'Sıfırdan vardiya kurmak istiyorum.';
  } else if (roleIndex % 2 === 0) {
    kind = 'oos';
    scope = 'OFF_TOPIC_GENUINE';
    turn = 'Kamp için bir film seçmeme yardım eder misin?';
  } else {
    kind = 'ambiguity';
    scope = 'PRODUCT_AMBIGUOUS';
    turn = 'Bu kaydı açıklar mısın?';
  }
  const expectation = expected(kind, role);
  const surfaceText = scope === 'OFF_TOPIC_GENUINE'
    ? 'Ürün dışı bir istek; ürün yüzeyi kullanılmayacaktır.'
    : scope === 'PRODUCT_AMBIGUOUS'
      ? 'Deiktik kayıt hedefi bilerek çözümsüz bırakılmıştır; yazma yapılmayacaktır.'
      : `${label} yetkili ürün kataloğundan seçilmiştir.`;
  return {
    CASE_ID: `M18-VCD-${role}-${String(challengeIndex + 1).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: tenants[role].type,
    TURN_COUNT: 1,
    TURN_1: turn,
    TURN_2: null,
    TURN_3: null,
    SURFACE_PRECONDITION: surfaceText,
    STATE_PRECONDITION: 'İzole ve yazmasız değerlendirme durumu.',
    REFERENCE_PRECONDITION: scope === 'PRODUCT_AMBIGUOUS' ? 'Hedef referans çözümsüz bırakılmıştır.' : 'Ek bir seçili kayıt sağlanmamıştır.',
    CHALLENGE_CLASS: challengeClasses[challengeIndex],
    ...expectation,
    EXPECTED_USER_BEHAVIOR: 'Kanonik anlam korunur; iş yazımı yapılmaz.',
    PROHIBITED_OUTCOMES: 'Yetkisiz, belirsiz veya ürün dışı istek yazma işlemine dönüşemez.',
    CONTRACT_RATIONALE: 'Yeni yazar bağlamı; V4R2R2 sözleşmesi ve yetkili ürün kataloğu kullanılarak bağımsız oluşturuldu.',
    EXECUTION_CONTEXT: contextFor(role, scope),
  };
}

const cases = roles.flatMap((role, roleIndex) => challengeClasses.map((_, challengeIndex) => defineCase(role, roleIndex, challengeIndex)));
const candidate = {
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId: 'M18-VCD-REPLACEMENT-FRESH-UNSEEN-56-20261006',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: cases.length,
  cases,
};
const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
const structural = validateCandidateManifestSchema(candidate);
const expectations = validateCandidateExpectations(candidate, packet);
const metadata = { authorContextId, candidatePath, createdAt: new Date().toISOString(), caseCount: cases.length, roleCount: roles.length };
if (structural.safe && expectations.safe) {
  writeFileSync(candidatePath, candidateBytes);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}
console.log(JSON.stringify({
  status: structural.safe && expectations.safe ? 'GREEN' : 'BLOCKED_PRE_FREEZE',
  authorContextId,
  candidatePath,
  metadataPath,
  candidateManifestSha256: sha256(candidateBytes),
  caseCount: cases.length,
  roleCount: roles.length,
  casesPerRole: 7,
  structuralValidation: structural.safe ? '56/56 GREEN' : structural,
  expectationValidation: expectations.safe ? '56/56 GREEN' : expectations,
  preFreezeBatchCorrectionCount: 0,
}, null, 2));
if (!structural.safe || !expectations.safe) process.exitCode = 1;
