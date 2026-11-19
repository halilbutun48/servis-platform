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
const candidatePath = resolve(planDir, 'm18-replacement-fresh-unseen-56-governed-v4r2-candidate-20261005.json');
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
const screenFor = (role) => {
  const screen = listScreensForUser(users[role])[0];
  if (!screen) throw new Error(`NO_AUTHORIZED_SCREEN:${role}`);
  return { ...screen, role: runtimeRole(role) };
};
const authorContextId = `m18-v4r2-author-${randomUUID()}`;
const freshScreens = Object.fromEntries(roles.map((role) => [role, screenFor(role)]));

function contextFor(role, scope, selectedEntity = null) {
  return {
    source: 'AUTHORIZED_PRODUCT_CATALOG',
    role,
    tenantContext: tenants[role],
    screen: ['PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'].includes(scope) ? null : freshScreens[role],
    selectedEntity,
  };
}

function expectedFor(kind, role, roleIndex) {
  if (kind === 'explain') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'navigate') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'NAVIGATE', EXPECTED_SEMANTIC_ACTION: 'NAVIGATE', EXPECTED_ACTION: 'NAVIGATE', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'NAVIGATE_AUTHORIZED_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'view') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'VIEW', EXPECTED_SEMANTIC_ACTION: 'VIEW', EXPECTED_ACTION: 'VIEW', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'VIEW_AUTHORIZED_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'contextExplain') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'VALID_CONTEXTUAL_REFERENCE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'uniqueRecord') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'RECORD', EXPECTED_REFERENCE_CLASS: 'VALID_UNIQUE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'RECORD_DETAILS', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_RECORD_DETAILS', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'compare') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'COMPARE', EXPECTED_SEMANTIC_ACTION: 'COMPARE', EXPECTED_ACTION: 'COMPARE', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'TEMPORAL_NON_REFERENCE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'COMPARISON', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'COMPARE_AUTHORIZED_RECORDS', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'continuation') {
    const action = ['CONTINUE', 'NEXT', 'PREVIOUS'][roleIndex % 3];
    const operation = action === 'CONTINUE' ? 'CONTINUE_EXPLANATION' : action === 'NEXT' ? 'RESOLVE_NEXT_SAFE_ACTION' : 'RETURN_TO_PRODUCT';
    const task = action === 'CONTINUE' ? 'CONTINUE_CURRENT_REASONING' : action === 'NEXT' ? 'NEXT_ACTION' : 'RETURN_TO_PRODUCT';
    return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_CONTEXTUAL', EXPECTED_REQUEST_MODE: action, EXPECTED_SEMANTIC_ACTION: action, EXPECTED_ACTION: action, EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'VALID_CONTEXTUAL_REFERENCE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: task, EXPECTED_OPERATION_OR_OPERATION_FAMILY: operation, EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_OPERATION', CONTRACT_SOURCE_CLASS: 'CONTINUATION_CONTRACT',
    };
  }
  if (kind === 'boundary') {
    if (role === 'COMPANY') return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'CREATE', EXPECTED_SEMANTIC_ACTION: 'CREATE', EXPECTED_ACTION: 'CREATE', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CREATE_SHIFT', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_PLANNING_INTENT', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY',
    };
    if (role === 'SUPER_ADMIN') return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'UPDATE', EXPECTED_SEMANTIC_ACTION: 'UPDATE', EXPECTED_ACTION: 'UPDATE', EXPECTED_OBJECT: 'RECORD', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'OPEN_EXISTING_SHIFT_OPERATIONS', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_OPERATION', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY',
    };
    return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'CREATE', EXPECTED_SEMANTIC_ACTION: 'CREATE', EXPECTED_ACTION: 'CREATE', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CREATE_SHIFT', EXPECTED_AUTHORIZATION_CLASS: role === 'ROOM' ? 'UNAUTHORIZED_CREATE' : 'AUTHORIZATION_DENIAL', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY',
    };
  }
  if (kind === 'ambiguous') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'UNRESOLVED', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'CLARIFY', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'SEMANTIC_CLARIFICATION', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  return {
    EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE', EXPECTED_REQUEST_MODE: 'GENUINE_OOS', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE', EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'OOS_CONTRACT',
  };
}

function defineCase(role, roleIndex, challengeIndex) {
  const label = freshScreens[role].label;
  const challenge = challengeClasses[challengeIndex];
  let kind;
  let turns;
  let surface = `${label} bu rol için yetkili katalog yüzeyidir.`;
  let state = 'Taze, yazma yapılmayan yetkili yüzey durumu.';
  let reference = 'Seçili kayıt yok; yüzey bağlamı korunur.';
  let selectedEntity = null;
  if (challengeIndex === 0) {
    kind = 'explain';
    turns = [`${label} ekranında hangi işleri takip edebileceğimi özetler misin?`];
  } else if (challengeIndex === 1) {
    kind = roleIndex % 2 === 0 ? 'navigate' : 'view';
    turns = [kind === 'navigate' ? `${label} sayfasına geçip nereden başlayacağımı gösterir misin?` : `${label} ekranındaki güncel bilgileri inceleyebilir miyim?`];
  } else if (challengeIndex === 2) {
    if (roleIndex === 1) {
      kind = 'uniqueRecord';
      turns = [`${label} içinde 42 numaralı kaydın ayrıntılarını açıklar mısın?`];
      selectedEntity = { type: 'RECORD', id: 42, tenantContextType: tenants[role].type };
      reference = '42 numaralı kayıt açıkça seçili ve tekil referanstır.';
    } else if (roleIndex % 2 === 0) {
      kind = 'compare';
      turns = [`${label} içinde bu ayın durumunu geçen ayla karşılaştırır mısın?`];
      reference = 'Bu ay ve geçen ay zaman belirtecidir; kayıt referansı değildir.';
    } else {
      kind = 'contextExplain';
      turns = [`${label} içindeki bu bölümü anlaşılır biçimde açıklar mısın?`];
      reference = 'Bu bölüm, adı geçen yüzey içindeki çözümlenebilir bağlamsal alt referanstır.';
    }
  } else if (challengeIndex === 3) {
    kind = 'continuation';
    const continuationText = ['Devam edelim.', 'Sıradaki adıma geçelim.', 'Bir önceki adıma dönelim.'][roleIndex % 3];
    turns = ['Bu ekranda ilk kontrolü tamamladım.', continuationText];
    state = 'Aynı vaka içinde taze ve geçerli devam durumu; yazma yoktur.';
    reference = 'İkinci tur aynı konuşmadaki geçerli yüzey bağlamına dayanır.';
  } else if (challengeIndex === 4) {
    kind = 'boundary';
    turns = [role === 'COMPANY'
      ? 'Yeni bir servis planını hazırlamaya hangi bilgilerle başlayayım?'
      : role === 'SUPER_ADMIN'
        ? 'Mevcut sistem kaydının durumunu güncellemek için güvenli adımlar neler?'
        : 'Yetkim dahilinde yeni bir vardiya kaydını doğrudan oluşturabilir miyim?'];
  } else if (challengeIndex === 5) {
    kind = 'ambiguous';
    turns = ['Bir işi tamamlamam gerekiyor; hangi ekrandan başlamalıyım?'];
    surface = 'Belirsiz istek için ekran bağlamı bilinçli olarak yoktur.';
    state = 'Nesne ve hedef ekran çözülmemiştir.';
    reference = 'Çözülmemiş görev ifadesi; sahte kayıt bağlanmaz.';
  } else {
    kind = 'oos';
    turns = [roleIndex % 2 === 0 ? 'İstanbulda yarın sabah hava nasıl olacak?' : 'Ege bölgesinde kısa bir gezi için öneri verir misin?'];
    surface = 'Ürün yüzeyi gerektirmeyen dış alan isteği.';
    state = 'Ürün dışı genel bilgi isteği.';
    reference = 'Ürüne ait referans yoktur.';
  }
  const expected = expectedFor(kind, role, roleIndex);
  return {
    CASE_ID: `M18-R2-${role}-${String(challengeIndex + 1).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: tenants[role].type,
    TURN_COUNT: turns.length,
    TURN_1: turns[0] || null,
    TURN_2: turns[1] || null,
    TURN_3: null,
    SURFACE_PRECONDITION: surface,
    STATE_PRECONDITION: state,
    REFERENCE_PRECONDITION: reference,
    CHALLENGE_CLASS: challenge,
    ...expected,
    EXPECTED_USER_BEHAVIOR: 'Gerçek iş yazmadan, doğru semantik kapsam ve güvenli yetki sınırıyla açıklama sağlanır.',
    PROHIBITED_OUTCOMES: 'Uydurma kayıt, yetkisiz iş yazımı ve metinden çalışma zamanı rotası çıkarımı yasaktır.',
    CONTRACT_RATIONALE: `Yeni ${role} vakası; V4R2 kanonik karşılaştırma sözlüğü ve yetkili katalog yüzeyiyle bağımsız olarak yazıldı.`,
    EXECUTION_CONTEXT: contextFor(role, expected.EXPECTED_SEMANTIC_SCOPE, selectedEntity),
  };
}

const cases = roles.flatMap((role, roleIndex) => challengeClasses.map((_, challengeIndex) => defineCase(role, roleIndex, challengeIndex)));
const candidate = {
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId: 'M18-REPLACEMENT-FRESH-UNSEEN-56-GOVERNED-V4R2-20261005',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: cases.length,
  cases,
};
const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
const structural = validateCandidateManifestSchema(candidate);
const expectations = validateCandidateExpectations(candidate, packet);
const candidateManifestSha256 = sha256(candidateBytes);

if (!structural.safe || !expectations.safe) {
  console.log(JSON.stringify({ status: 'BLOCKED_PRE_FREEZE', authorContextId, structural, expectations }, null, 2));
  process.exitCode = 1;
} else {
  writeFileSync(candidatePath, candidateBytes);
  console.log(JSON.stringify({
    status: 'GREEN',
    authorContextId,
    candidatePath,
    candidateManifestSha256,
    caseCount: cases.length,
    roleCount: roles.length,
    casesPerRole: 7,
    structuralValidation: '56/56 GREEN',
    expectationValidation: '56/56 GREEN',
    preFreezeBatchCorrectionCount: 0,
  }, null, 2));
}
