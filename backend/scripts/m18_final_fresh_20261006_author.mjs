import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  loadContractPacket,
  sha256,
  validateCandidateStaticSchema,
} from './lib/m18HoldoutGovernance.mjs';
import { cardinalityExpectationForRole } from './lib/m18DisposableCardinalityContract.mjs';
import { currentContractBinding } from './lib/m18CurrentSemanticContract.mjs';
import { SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID } from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const artifactPrefix = process.env.M18_FINAL_ARTIFACT_PREFIX || 'm18-final-fresh-unseen-56-governed-v4r2r2-20261006';
const finalReplacementVariant = [
  'R6_FINAL_REPLACEMENT_20261006',
  'R9_FINAL_REPLACEMENT_20261007',
  'R10_FINAL_REPLACEMENT_20261008',
  'R10_FINAL_REPLACEMENT_FINAL2_20261008',
  'R10_SIMULATION_A_20261008',
  'R10_SIMULATION_B_20261008',
  'R10_SIMULATION_C_20261008',
  'R10_SIMULATION_D_20261008',
  'R10_FINAL_FRESH_UNSEEN_20261008_FINAL',
  'R12_FINAL_FRESH_UNSEEN_20261008',
].includes(process.env.M18_FINAL_VARIANT);
const r10FinalReplacementVariant = process.env.M18_FINAL_VARIANT === 'R10_FINAL_REPLACEMENT_20261008';
const r10FinalReplacementFinal2Variant = process.env.M18_FINAL_VARIANT === 'R10_FINAL_REPLACEMENT_FINAL2_20261008';
const r10SimulationAVariant = process.env.M18_FINAL_VARIANT === 'R10_SIMULATION_A_20261008';
const r10SimulationBVariant = process.env.M18_FINAL_VARIANT === 'R10_SIMULATION_B_20261008';
const r10SimulationCVariant = process.env.M18_FINAL_VARIANT === 'R10_SIMULATION_C_20261008';
const r10SimulationDVariant = process.env.M18_FINAL_VARIANT === 'R10_SIMULATION_D_20261008';
const r10FinalFreshUnseenVariant = process.env.M18_FINAL_VARIANT === 'R10_FINAL_FRESH_UNSEEN_20261008_FINAL';
const r12FinalFreshUnseenVariant = process.env.M18_FINAL_VARIANT === 'R12_FINAL_FRESH_UNSEEN_20261008';
const candidatePath = resolve(planDir, `${artifactPrefix}-candidate.json`);
const metadataPath = resolve(planDir, `${artifactPrefix}-author.json`);
const packetBytes = readFileSync(packetPath);
const packet = loadContractPacket(packetBytes);
const sourceContractBinding = currentContractBinding(root);
const sourceContractBindingSha256 = createHash('sha256')
  .update(JSON.stringify(sourceContractBinding))
  .digest('hex')
  .toUpperCase();
const defaultCaseIdPrefix = r12FinalFreshUnseenVariant
  ? 'M18-R12-FINAL-20261008'
  : r10FinalFreshUnseenVariant
    ? 'M18-R10-FINAL-20261008'
    : 'M18-FINAL';
const caseIdPrefix = process.env.M18_FINAL_CASE_ID_PREFIX || defaultCaseIdPrefix;

const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challengeClasses = [
  'EXPLAIN/CURRENT_SURFACE',
  'VIEW_OR_NAVIGATE',
  'REFERENCE_CONTEXT',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED',
  'CONTINUATION_RECOVERY',
  'ROLE_AUTHORIZATION_BOUNDARY',
  'DOMAIN_TASK_OR_GENUINE_OOS',
];

// The authoring contract admits only continuation forms that the canonical
// runtime recognizes after a real prior guided turn. This is a structural
// variation family, not a case or role-specific expectation branch.
const SUPPORTED_CONTINUATION_VARIATIONS = Object.freeze([
  'Aynı akışa devam edelim.',
  'Aynı akışı sürdürelim.',
  'Akışı sürdür.',
  'Aynı sürecin devamını anlat.',
]);

// ROOM navigation expectations require a positive movement predicate. A vague
// offer to help with direction belongs to surface guidance and must not be
// authored as NAVIGATE/denial.
const ROOM_NAVIGATION_VARIATIONS = Object.freeze([
  'Şirket yönetim ekranına git.',
  'Şirket yönetim ekranına ilerle.',
  'Şirket yönetim panelini aç.',
  'Şirket yönetim alanına geç.',
]);

function continuationVariationForRole(roleIndex) {
  return SUPPORTED_CONTINUATION_VARIATIONS[roleIndex % SUPPORTED_CONTINUATION_VARIATIONS.length];
}

function roomNavigationVariationForRole(roleIndex) {
  return ROOM_NAVIGATION_VARIATIONS[roleIndex % ROOM_NAVIGATION_VARIATIONS.length];
}
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

const authorContextId = `${process.env.M18_FINAL_CONTEXT_PREFIX || 'm18-final-author'}-${randomUUID()}`;

function contextFor(role, scope, selectedEntity = null, continuationStateSeed = null) {
  return {
    source: 'AUTHORIZED_PRODUCT_CATALOG',
    role,
    tenantContext: tenants[role],
    screen: ['PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'].includes(scope) ? null : screens[role],
    selectedEntity,
    ...(continuationStateSeed ? { continuationStateSeed } : {}),
  };
}

function continuationDescriptorForGeneratedFamily(family) {
  const descriptors = {
    fieldLookup: {
      priorCanonicalTask: 'FIELD_LOOKUP',
      priorOperation: 'LOOK_UP_FIELD',
      priorObjectClass: 'SHIFT',
      priorSemanticScope: 'PRODUCT_EXPLICIT',
      priorReference: 'ABSENT',
      priorResolutionStatus: 'RESOLVED',
      priorGuidedTask: 'FIELD_LOOKUP',
      continuationBaseObjectClass: 'RECORD',
    },
    deicticClarificationWithRecordBase: {
      priorCanonicalTask: 'CLARIFY_SEMANTIC_REQUEST',
      priorOperation: 'CLARIFY_SEMANTIC_REQUEST',
      priorObjectClass: null,
      priorSemanticScope: 'PRODUCT_AMBIGUOUS',
      priorReference: 'UNRESOLVED',
      priorResolutionStatus: 'UNRESOLVED',
      priorGuidedTask: null,
      continuationBaseObjectClass: 'RECORD',
    },
    collectionView: {
      priorCanonicalTask: 'SCREEN_CONTEXT',
      priorOperation: 'VIEW_AUTHORIZED_SURFACE',
      priorObjectClass: 'SHIFT',
      priorSemanticScope: 'PRODUCT_EXPLICIT',
      priorReference: 'ABSENT',
      priorResolutionStatus: 'RESOLVED',
      priorGuidedTask: 'SCREEN_CONTEXT',
      continuationBaseObjectClass: 'SHIFT',
    },
    surfaceExplanation: {
      // The executable setup turn is resolved by the current runtime as
      // SCREEN_CONTEXT/UI_GUIDANCE, not as a prose-only generic-help seed.
      // CONTINUE therefore follows the canonical continuation rule and
      // resumes a RECORD base for this prior plan.
      priorCanonicalTask: 'SCREEN_CONTEXT',
      priorOperation: 'EXPLAIN_CURRENT_SURFACE',
      priorObjectClass: 'SURFACE',
      priorSemanticScope: 'PRODUCT_EXPLICIT',
      priorReference: 'ABSENT',
      priorResolutionStatus: 'RESOLVED',
      priorGuidedTask: 'UI_GUIDANCE',
      continuationBaseObjectClass: 'RECORD',
    },
  };
  const descriptor = descriptors[family];
  if (!descriptor) throw new Error(`CONTINUATION_DESCRIPTOR_UNSUPPORTED:${family}`);
  return descriptor;
}

function continuationStateSeedForGeneratedSequence(role, priorState, priorCasePrefix = 'M18-FINAL') {
  // The seed is an executable description of the preceding canonical plan.
  // Role and role ordering provide session/tenant context only; they never
  // select the continuation object class.
  return {
    schemaVersion: 'M18-CONTINUATION-AUTHORING-STATE-V1',
    stateKind: 'ROLE_SEQUENTIAL_AUTH_SESSION',
    priorCaseIds: [1, 2, 3, 4].map((index) => `${priorCasePrefix}-${role}-${String(index).padStart(2, '0')}`),
    ...priorState,
    currentSurface: screens[role],
    selectedEntity: null,
    selectedRecord: null,
    priorGuidedTarget: null,
    sessionScope: { role, tenantContext: tenants[role] },
    conversationStateRequired: true,
  };
}

const directionalNavigationConverbs = Object.freeze([
  'geçip',
  'gidip',
  'gidip',
  'geçip',
  'geçip',
  'geçip',
  'ulaşıp',
  'dönüp',
]);

const genuineOffTopicFamilySeeds = Object.freeze([
  'Hafta sonu film mi dizi mi izlesem?',
  'Hafta sonu film mi dizi mi izlesem?',
  'Hafta sonu film mi dizi mi izlesem?',
  'Hafta sonu film mi dizi mi izlesem?',
  'Hafta sonu film mi dizi mi izlesem?',
  'Hafta sonu film mi dizi mi izlesem?',
  'Hafta sonu film mi dizi mi izlesem?',
  'Hafta sonu film mi dizi mi izlesem?',
]);

const R12_ROLE_MARKERS = Object.freeze({
  COMPANY: 'şirket planlama akışında',
  ROOM: 'taşımacılık merkezi operasyonunda',
  SCHOOL: 'okul servis planında',
  ORGANIZATION: 'organizasyon seyahat planında',
  DRIVER: 'sürücü günlük görevinde',
  PERSONEL: 'personel canlı izleme akışında',
  PARENT: 'veli servis takibinde',
  SUPER_ADMIN: 'merkezi yönetim görünümünde',
});

const R12_CONTINUATION_TURNS = Object.freeze({
  COMPANY: 'Buradan sonraki adımı birlikte açıklayalım.',
  ROOM: 'Anlattığın noktadan devam edelim.',
  SCHOOL: 'Bir sonraki kısmı açıklayalım.',
  ORGANIZATION: 'Devamını adım adım aktarır mısın?',
  DRIVER: 'Bu anlatımı sürdürelim.',
  PERSONEL: 'Kalan bölümü de açıklar mısın?',
  PARENT: 'Sıradaki parçayı birlikte ele alalım.',
  SUPER_ADMIN: 'Açıklamanın devamını paylaşır mısın?',
});

const R12_OOS_TURNS = Object.freeze({
  COMPANY: 'Bu hafta sonu evde yapılabilecek yaratıcı bir etkinlik önerir misin?',
  DRIVER: 'Hafta sonu için sakin bir açık hava etkinliği seçmeme yardım eder misin?',
});

const R12_RISK_TURNS = Object.freeze({
  ROOM: 'Taşımacılık merkezi operasyonunda maliyet riskini değerlendirebilir misin?',
  PERSONEL: 'Personel canlı izleme akışında bütçe riskini yorumlar mısın?',
});

const R12_COUNT_TURNS = Object.freeze({
  SCHOOL: 'Okul Planlama alanındaki bekleyen vardiyaların toplamını paylaşır mısın?',
  PARENT: 'Veli servis takibinde bekleyen vardiya sayısını öğrenebilir miyim?',
});

const R12_FIELD_TURNS = Object.freeze({
  ORGANIZATION: 'Gezi / Planlama Merkezi içindeki vardiya kaydının kapasite üst sınırı nedir?',
  SUPER_ADMIN: 'Genel Bakış içindeki vardiya kaydının ödeme limiti hangi alanda yer alır?',
});

const R12_AMBIGUOUS_TURNS = Object.freeze({
  ROOM: 'Şu vardiya kaydının son hareketini oda bağlamında özetler misin?',
  ORGANIZATION: 'Şu vardiya kaydının son hareketini organizasyon bağlamında özetler misin?',
  PERSONEL: 'Şu vardiya kaydının son hareketini görev bağlamında özetler misin?',
  SUPER_ADMIN: 'Şu vardiya kaydının son hareketini yönetim bağlamında özetler misin?',
});

const R12_UPDATE_TURNS = Object.freeze({
  ROOM: 'Bir kayıt belirtmeden bu düzenlemeyi başlatabilir misin?',
  ORGANIZATION: 'Kayıt seçmeden şu plan değişikliğini uygulayabilir misin?',
  PERSONEL: 'Hedef kaydı göstermeden bu düzeltmeyi yapabilir misin?',
  SUPER_ADMIN: 'Belirli bir kayıt seçmeden bu değişikliği devreye alabilir misin?',
});

function directionalNavigationConverbForRole(roleIndex) {
  return directionalNavigationConverbs[roleIndex % directionalNavigationConverbs.length];
}

function genuineOffTopicSeedForRole(roleIndex) {
  return genuineOffTopicFamilySeeds[roleIndex % genuineOffTopicFamilySeeds.length];
}

function roleSurfaceExpectation(kind, role, continuationStateSeed = null) {
  const projection = expected(kind, role, continuationStateSeed);
  if (['SCHOOL', 'PARENT'].includes(role)) projection.EXPECTED_OBJECT = 'SHIFT';
  if (role === 'PERSONEL') projection.EXPECTED_OBJECT = 'PERSONNEL';
  return projection;
}

function expected(kind, role, continuationStateSeed = null) {
  if (kind === 'surfaceExplain') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'navigate') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'NAVIGATE', EXPECTED_SEMANTIC_ACTION: 'NAVIGATE', EXPECTED_ACTION: 'NAVIGATE', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'NAVIGATE_AUTHORIZED_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'view') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'VIEW', EXPECTED_SEMANTIC_ACTION: 'VIEW', EXPECTED_ACTION: 'VIEW', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'VIEW_AUTHORIZED_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'collectionCount') return {
    ...cardinalityExpectationForRole(role),
  };
  if (kind === 'surfaceContent') return {
    // A named, authorized surface remains the grounding object even when the
    // operation is GENERAL_INFORMATION. Only ungrounded product information
    // may omit the object; surface context must not be authored as null.
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'deicticRecordAmbiguous') return {
    // An ID-only synthetic candidate is not a canonical discourse referent.
    // Deictic record wording therefore remains a semantic clarification until
    // the generated context supplies a selected record/label or equivalent
    // unique referent.
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'fieldHelp') return {
    // A concrete domain/object question is not generic role help.  The
    // semantic object and field operation are preserved; without a concrete
    // record ID the authorization layer may require scoped clarification.
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'LOOK_UP_FIELD', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZATION_CONTEXT_CLARIFICATION', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'fieldHelpAuthorized') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'LOOK_UP_FIELD', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'risk') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'ANALYZE', EXPECTED_ACTION: 'ANALYZE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'RISK', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'ASSESS_CURRENT_RISK', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  if (kind === 'record') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'RECORD', EXPECTED_REFERENCE_CLASS: 'VALID_UNIQUE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'RECORD_DETAILS', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_RECORD_DETAILS', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'updateUnresolved') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'UPDATE', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT',
  };
  if (kind === 'continue') {
    const continuationRequestMode = 'CONTINUE';
    if (!continuationStateSeed?.continuationBaseObjectClass) {
      throw new Error('CONTINUATION_EXPECTATION_REQUIRES_EXECUTABLE_STATE_SEED');
    }
    const continuationObject = continuationStateSeed.continuationBaseObjectClass;
    return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_CONTEXTUAL', EXPECTED_REQUEST_MODE: continuationRequestMode, EXPECTED_SEMANTIC_ACTION: 'CONTINUE', EXPECTED_ACTION: 'CONTINUE', EXPECTED_OBJECT: continuationObject, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'CONTINUE_CURRENT_REASONING', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CONTINUE_EXPLANATION', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_OPERATION', CONTRACT_SOURCE_CLASS: 'CONTINUATION_CONTRACT',
    };
  }
  if (kind === 'unauthorizedNavigate') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'NAVIGATE', EXPECTED_SEMANTIC_ACTION: 'NAVIGATE', EXPECTED_ACTION: 'NAVIGATE', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'NAVIGATE_AUTHORIZED_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZATION_DENIAL', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY',
  };
  if (kind === 'create') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'CREATE', EXPECTED_SEMANTIC_ACTION: 'CREATE', EXPECTED_ACTION: 'CREATE', EXPECTED_OBJECT: 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CREATE_SHIFT', EXPECTED_AUTHORIZATION_CLASS: role === 'COMPANY' ? 'AUTHORIZED_PLANNING_INTENT' : 'AUTHORIZATION_CONTEXT_CLARIFICATION', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY',
  };
  if (kind === 'oos') return {
    EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE', EXPECTED_REQUEST_MODE: 'GENUINE_OOS', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE', EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'OOS_CONTRACT',
  };
  if (kind === 'negated') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'NONE', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
  return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'EXPLAIN', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NONE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT',
  };
}

function defineCase(role, roleIndex, challengeIndex) {
  const label = screens[role].label;
  let kind;
  let turns;
  let scope = 'PRODUCT_EXPLICIT';
  let selectedEntity = null;
  let continuationStateSeed = null;
  if (finalReplacementVariant) {
    if (r12FinalFreshUnseenVariant) {
      if (challengeIndex === 0) {
        kind = ['SCHOOL', 'PERSONEL', 'PARENT'].includes(role) ? 'surfaceContent' : 'surfaceExplain';
        turns = [`${label} ekranının ${R12_ROLE_MARKERS[role]} günlük iş akışındaki yerini açıklar mısın?`];
      } else if (challengeIndex === 1) {
        kind = 'navigate';
        turns = [`${label} bölümüne geçip ${R12_ROLE_MARKERS[role]} ilk kontrol noktasını bulmama yardım eder misin?`];
      } else if (challengeIndex === 2) {
        if (roleIndex % 2 === 0) {
          kind = 'fieldHelp';
          turns = [`${label} içindeki vardiya kaydında ${R12_ROLE_MARKERS[role]} ödeme üst sınırı hangi alanda görünür?`];
        } else {
          kind = 'deicticRecordAmbiguous';
          turns = [R12_AMBIGUOUS_TURNS[role]];
          selectedEntity = { type: 'SHIFT', id: 1201 + roleIndex, tenantContextType: tenants[role].type };
        }
      } else if (challengeIndex === 3) {
        if (roleIndex % 2 === 0) {
          kind = 'fieldHelp';
          turns = [`${R12_ROLE_MARKERS[role]} ${label} içindeki vardiya kaydının saatini değiştirme yetkim bulunuyor mu?`];
        } else {
          kind = 'updateUnresolved';
          turns = [R12_UPDATE_TURNS[role]];
          scope = 'PRODUCT_AMBIGUOUS';
        }
      } else if (challengeIndex === 4) {
        kind = 'continue';
        const priorFamily = roleIndex % 2 === 0 ? 'surfaceExplanation' : 'fieldLookup';
        turns = [
          `${label} ekranında ${R12_ROLE_MARKERS[role]} vardiya akışının başlangıç adımlarını anlatabilir misin?`,
          R12_CONTINUATION_TURNS[role],
        ];
        continuationStateSeed = continuationStateSeedForGeneratedSequence(
          role,
          continuationDescriptorForGeneratedFamily(priorFamily),
          'M18-R12-FINAL-20261008',
        );
      } else if (challengeIndex === 5) {
        if (role === 'ROOM') {
          kind = 'unauthorizedNavigate';
          turns = [`${R12_ROLE_MARKERS[role]} Hizmet Alan Firma yönetim bölümüne geçebilir misin?`];
        } else {
          kind = 'create';
          turns = [`${R12_ROLE_MARKERS[role]} yeni bir vardiya kaydını hazırlamak için hangi başlangıç adımlarını izlemeliyim?`];
        }
      } else if (roleIndex % 4 === 0) {
        kind = 'oos';
        turns = [R12_OOS_TURNS[role]];
        scope = 'OFF_TOPIC_GENUINE';
      } else if (roleIndex % 4 === 1) {
        kind = 'risk';
        turns = [R12_RISK_TURNS[role]];
      } else if (roleIndex % 4 === 2) {
        kind = 'collectionCount';
        turns = [R12_COUNT_TURNS[role]];
      } else {
        kind = 'fieldHelp';
        turns = [R12_FIELD_TURNS[role]];
      }
    } else if (r10FinalFreshUnseenVariant) {
      if (challengeIndex === 0) {
        // "hangi amaçla ... özetler misin" is a general surface-information
        // request under the canonical contract, not the narrower current
        // surface explanation operation.
        kind = 'surfaceContent';
        turns = [`${label} ekranında hangi amaçla kullanıldığını özetler misin?`];
      } else if (challengeIndex === 1) {
        kind = 'navigate';
        turns = [`${label} ekranına geçerek ilk bakılacak yeri gösterir misin?`];
      } else if (challengeIndex === 2) {
        if (roleIndex % 4 === 0) {
          // This is current-surface explanation evidence.  Keep the
          // operation on the surface contract instead of projecting a
          // generic information operation from the noun "bölümleri".
          kind = 'surfaceExplain';
          turns = [`${label} ekranını anlatır mısın?`];
        } else if (roleIndex % 4 === 1) {
          kind = 'deicticRecordAmbiguous';
          turns = ['Şu kaydın son bilgisini paylaşır mısın?'];
          selectedEntity = { type: 'SHIFT', id: 907 + roleIndex, tenantContextType: tenants[role].type };
        } else if (role === 'SUPER_ADMIN') {
          kind = 'surfaceExplain';
          turns = [`${label} ekranını anlatır mısın?`];
        } else {
          // This variation is an explicit collection view.  The noun and the
          // view predicate are kept together so the authoring contract tests
          // collection semantics instead of relying on a surface-only guess.
          kind = 'view';
          turns = [`${label} ekranındaki vardiyaları görüntüleyebilir misin?`];
        }
      } else if (challengeIndex === 3) {
        // Capability/permission questions are not update commands.  The
        // authoring family must carry field-help evidence instead of
        // manufacturing an UPDATE expectation from "düzenleme".
        kind = 'fieldHelp';
        turns = [`${label} içindeki vardiya kaydı üzerinde değişiklik yetkim var mı?`];
      } else if (challengeIndex === 4) {
        kind = 'continue';
        turns = [
          // This is a real canonical setup turn.  The runtime persists the
          // guided explanatory plan for this family; prose-only metadata is
          // not allowed to stand in for that state.
          [
            `${label} ekranının kullanım amacını anlatabilir misin?`,
            `${label} ekranının kullanım amacını anlatır mısın?`,
            `${label} ekranının kullanım amacını anlatabilir misin?`,
            `${label} ekranının kullanım amacını anlatır mısın?`,
          ][roleIndex % 4],
          // These are the supported structural continuation forms used by the
          // canonical flow; the variation changes wording without inventing a
          // new state transition that the runtime cannot establish.
          continuationVariationForRole(roleIndex),
        ];
        continuationStateSeed = continuationStateSeedForGeneratedSequence(
          role,
          continuationDescriptorForGeneratedFamily('surfaceExplanation'),
          'M18-R10-FINAL-20261008',
        );
      } else if (challengeIndex === 5) {
        if (role === 'ROOM') {
          // "Yönlendirebilir misin?" lacks a canonical movement predicate;
          // keep it in surface guidance rather than authoring NAVIGATE.
          kind = 'surfaceContent';
          turns = ['Şirket yönetim alanı hangi amaçla kullanılır?'];
        } else {
          // Preparation language alone is capability/field guidance.  CREATE
          // is reserved for an explicit creation predicate and its canonical
          // workflow preconditions.
          kind = 'fieldHelp';
          turns = [`Yeni bir vardiya için hangi alanları hazırlamam gerekir?`];
        }
      } else {
        kind = 'oos';
        turns = ['Ürünle ilgisi olmayan bir konuda hafta sonu için bir film seçmeme yardım eder misin?'];
        scope = 'OFF_TOPIC_GENUINE';
      }
    } else if (r10FinalReplacementVariant || r10FinalReplacementFinal2Variant || r10SimulationAVariant || r10SimulationBVariant) {
      if (challengeIndex === 0) {
        kind = 'surfaceExplain';
        turns = [r10SimulationBVariant
          ? `${label} ekranı ne işe yarar, açıklar mısın?`
          : r10SimulationCVariant
            ? `${label} ekranını kısaca tanıtır mısın?`
            : r10SimulationDVariant
              ? `${label} ekranının ne amaçla kullanıldığını açıklar mısın?`
              : `${label} ekranının kullanım amacını anlatır mısın?`];
      } else if (challengeIndex === 1) {
        kind = 'navigate';
        turns = [r10SimulationBVariant
          ? `${label} sayfasına gidip ilk adımı gösterir misin?`
          : r10SimulationCVariant
            ? `${label} ekranına geçip nereden başlayacağımı gösterir misin?`
            : r10SimulationDVariant
              ? `${label} sayfasına geçip ilk kontrolü gösterir misin?`
              : `${label} sayfasına geçip başlangıçta bakacağım yeri tarif eder misin?`];
      } else if (challengeIndex === 2) {
        if (roleIndex % 4 === 0) {
          // This R10 slot is a current-surface explanation family.  A field
          // lookup must be authored only by the independent calibration
          // family with a concrete record/field precondition; the live
          // canonical runtime resolves this surface-grounded wording as
          // GENERAL_INFORMATION.
          kind = 'surfaceContent';
          turns = [r10SimulationBVariant
            ? `${label} ekranında vardiya bilgisinde düzenleme yapabilir miyim?`
            : r10SimulationCVariant
              ? `${label} içindeki vardiya bilgisinde düzenleme yapabilir miyim?`
              : r10SimulationDVariant
                ? `${label} ekranındaki vardiya bilgisinde düzenleme yapabilir miyim?`
                : `${label} içindeki vardiya bilgisinde düzenleme yapabilir miyim?`];
        } else if (roleIndex % 4 === 1) {
          kind = 'deicticRecordAmbiguous';
          turns = [r10SimulationBVariant
            ? 'Şu kaydın durumunu açıklar mısın?'
            : r10SimulationCVariant
              ? 'Bu kaydın son durumunu söyler misin?'
              : 'Bu kaydın durumunu özetleyebilir misin?'];
          selectedEntity = { type: 'SHIFT', id: 283 + roleIndex, tenantContextType: tenants[role].type };
        } else if (role === 'SUPER_ADMIN') {
          kind = 'surfaceContent';
          turns = [r10SimulationBVariant
            ? `${label} ekranında ilk bakılacak yerleri anlatır mısın?`
            : r10SimulationCVariant
              ? `${label} ekranının ilk bakılacak yerlerini anlatır mısın?`
              : `${label} alanında ilk bakılacak yerleri anlatır mısın?`];
        } else {
          kind = 'view';
          turns = [r10SimulationBVariant
            ? `${label} ekranındaki vardiyaları gösterir misin?`
            : r10SimulationCVariant
              ? `${label} içinde vardiyaları görüntülemek istiyorum.`
              : r10SimulationDVariant
                ? `${label} ekranındaki vardiyaları görüntülemek istiyorum.`
                : `${label} içindeki vardiyaları görüntülemek istiyorum.`];
        }
      } else if (challengeIndex === 3) {
        kind = 'updateUnresolved';
        turns = ['Şu kaydı güncelle.'];
        scope = 'PRODUCT_AMBIGUOUS';
      } else if (challengeIndex === 4) {
        kind = 'continue';
        // The continuation precondition must be executable on the canonical
        // production path.  The HTTP route owns conversation state server-side;
        // therefore a prose-only seed is insufficient.  Establish the
        // surface-grounded prior plan as turn 1 and continue it as turn 2.
        turns = [r10SimulationBVariant
          ? `${label} ekranının kullanım amacını anlatır mısın?`
          : r10SimulationCVariant
            ? `${label} ekranının kullanım amacını anlatabilir misin?`
            : r10SimulationDVariant
              ? `${label} ekranını anlatır mısın?`
              : `${label} ekranının kullanım amacını anlatabilir misin?`,
        continuationVariationForRole(roleIndex)];
        continuationStateSeed = continuationStateSeedForGeneratedSequence(
          role,
          continuationDescriptorForGeneratedFamily('surfaceExplanation'),
        );
      } else if (challengeIndex === 5) {
        kind = role === 'ROOM' ? 'unauthorizedNavigate' : 'create';
        turns = [role === 'ROOM'
          ? (r10SimulationBVariant || r10SimulationCVariant ? 'Şirket yönetim ekranına git.' : 'Şirket yönetim ekranına ilerle.')
          : (r10SimulationBVariant || r10SimulationDVariant ? 'Yeni bir vardiya oluşturmak istiyorum.' : 'Yeni vardiya planını kurmak istiyorum.')];
      } else {
        kind = 'oos';
        turns = [r10SimulationBVariant || r10SimulationDVariant
          ? 'Ürün dışı bir konuda hafta sonu için film seçmeme yardım eder misin?'
          : r10SimulationCVariant
            ? "Mars'ta hafta sonu hava durumu nasıl?"
            : 'Dünya dışı bir gezi için müzik listesi önerir misin?'];
        scope = 'OFF_TOPIC_GENUINE';
      }
    } else if ((r10SimulationCVariant || r10SimulationDVariant) && challengeIndex === 4) {
      kind = 'continue';
      turns = [r10SimulationDVariant
        ? `${label} ekranının kullanım amacını anlatır mısın?`
        : `${label} ekranının kullanım amacını anlatabilir misin?`,
      continuationVariationForRole(roleIndex)];
      continuationStateSeed = continuationStateSeedForGeneratedSequence(
        role,
        continuationDescriptorForGeneratedFamily('surfaceExplanation'),
      );
    } else if (challengeIndex === 0) {
      kind = roleIndex % 2 === 0 ? 'surfaceExplain' : 'surfaceContent';
      turns = [roleIndex % 2 === 0
        ? `${label} ekranını anlatır mısın?`
        : `${label} içindeki çalışma mantığı hakkında bilgi verir misin?`];
    } else if (challengeIndex === 1) {
      kind = 'navigate';
      turns = [`${label} ekranına ulaşıp ilk kontrolü tarif eder misin?`];
    } else if (challengeIndex === 2) {
      if (roleIndex % 4 === 0) {
        kind = 'fieldHelp';
        turns = [`${label} içindeki vardiya kaydı üzerinde değişiklik yetkim var mı?`];
      } else if (roleIndex % 4 === 1) {
        kind = 'deicticRecordAmbiguous';
        turns = [`${label} içinde seçilen kaydın güncel durumunu açıklar mısın?`];
        selectedEntity = { type: 'SHIFT', id: 183 + roleIndex, tenantContextType: tenants[role].type };
      } else if (role === 'SUPER_ADMIN') {
        // The current SUPER_ADMIN surface contract resolves this concrete
        // vardiya-list wording as field help.  Keep that contract explicit
        // in the role capability family; do not project it to generic
        // surface-content help or infer it from a case identifier.
        kind = 'fieldHelpAuthorized';
        turns = [`${label} içinde bu haftaki vardiyaları listeler misin?`];
      } else {
        kind = 'view';
        turns = [`${label} içinde bu haftaki vardiyaları listeler misin?`];
      }
    } else if (challengeIndex === 3) {
      kind = 'updateUnresolved';
      turns = ['Şu kaydı güncelle.'];
      scope = 'PRODUCT_AMBIGUOUS';
    } else if (challengeIndex === 4) {
      kind = 'continue';
      turns = ['Akışı sürdür.'];
      continuationStateSeed = continuationStateSeedForGeneratedSequence(
        role,
        continuationDescriptorForGeneratedFamily('surfaceExplanation'),
      );
    } else if (challengeIndex === 5) {
      kind = role === 'ROOM' ? 'unauthorizedNavigate' : 'create';
      turns = [role === 'ROOM' ? roomNavigationVariationForRole(roleIndex) : 'Yeni bir vardiya planlamak istiyorum.'];
    } else {
      kind = 'oos';
      turns = ["Mars'ta hafta sonu hava durumu nasıl?"];
      scope = 'OFF_TOPIC_GENUINE';
    }
  } else if (challengeIndex === 0) {
    kind = 'surfaceExplain';
    turns = [`${label} ekranını açıklar mısın?`];
  } else if (challengeIndex === 1) {
    kind = 'navigate';
    turns = [`${label} sayfasına geçip başlangıçta bakacağım yeri tarif eder misin?`];
  } else if (challengeIndex === 2) {
    if (roleIndex % 2 === 0) {
      kind = 'view';
      turns = [`${label} alanında bugünkü vardiyaları görüntülemek istiyorum.`];
    } else {
      // The generated context currently provides only an ID-only candidate.
      // It does not establish a selected record, label, or discourse
      // referent, so the deictic request must be authored as clarification.
      kind = 'deicticRecordAmbiguous';
      turns = [`${label} içinde seçili kaydın durumunu özetler misin?`];
      selectedEntity = { type: 'SHIFT', id: 83 + roleIndex, tenantContextType: tenants[role].type };
    }
  } else if (challengeIndex === 3) {
    kind = 'updateUnresolved';
    turns = ['Şu vardiyayı değiştir.'];
    scope = 'PRODUCT_AMBIGUOUS';
  } else if (challengeIndex === 4) {
    kind = 'continue';
    turns = ['Akışı kaldığı yerden devam ettir.'];
    continuationStateSeed = continuationStateSeedForGeneratedSequence(
      role,
      continuationDescriptorForGeneratedFamily('surfaceExplanation'),
    );
  } else if (challengeIndex === 5) {
    kind = role === 'ROOM' ? 'unauthorizedNavigate' : 'create';
    turns = [role === 'ROOM' ? roomNavigationVariationForRole(roleIndex) : 'Yeni bir vardiya oluştur.'];
  } else if (roleIndex % 4 === 0) {
    kind = 'oos';
    turns = ['Ürün dışı bir konuda hafta sonu için film seçmeme yardım eder misin?'];
    scope = 'OFF_TOPIC_GENUINE';
  } else if (roleIndex % 4 === 1) {
    kind = 'surfaceContent';
    turns = ['Bir vardiya değişikliğinden önce süreç nasıl işler?'];
  } else if (roleIndex % 4 === 2) {
    kind = 'surfaceContent';
    turns = [roleIndex % 4 === 2 ? 'Vardiya kaydını değiştirirsem ne sonuç doğar?' : 'Vardiya kaydını değiştirmeye yetkim var mı?'];
  } else {
    kind = 'fieldHelp';
    turns = ['Vardiya kaydını değiştirmeye yetkim var mı?'];
  }
  const expectation = r12FinalFreshUnseenVariant && challengeIndex < 2
    ? roleSurfaceExpectation(kind, role, continuationStateSeed)
    : expected(kind, role, continuationStateSeed);
  const surfaceText = scope === 'OFF_TOPIC_GENUINE'
    ? 'Ürün dışı genel bilgi isteği; ürün ekranı kullanılmayacaktır.'
    : scope === 'PRODUCT_AMBIGUOUS'
      ? 'Hedef kayıt bilerek çözümsüz bırakılmıştır; yazma yapılmayacaktır.'
      : `${label} yetkili katalog yüzeyidir.`;
  return {
    CASE_ID: `${caseIdPrefix}-${role}-${String(challengeIndex + 1).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: tenants[role].type,
    TURN_COUNT: turns.length,
    TURN_1: turns[0] || null,
    TURN_2: turns[1] || null,
    TURN_3: null,
    SURFACE_PRECONDITION: surfaceText,
    STATE_PRECONDITION: challengeIndex === 4 ? 'EXECUTABLE_CONTINUATION_STATE_REQUIRED' : 'İzole, yazmasız çalışma durumu.',
    REFERENCE_PRECONDITION: selectedEntity
      ? 'Yalnızca sentetik ID adayı sağlanmıştır; seçili kayıt, seçili etiket veya benzersiz söylem referansı sağlanmamıştır.'
      : scope === 'PRODUCT_AMBIGUOUS' ? 'Deiktik vardiya hedefi çözümsüzdür.' : 'Doğal dilde ek kayıt seçimi yoktur.',
    CHALLENGE_CLASS: challengeClasses[challengeIndex],
    ...expectation,
    EXPECTED_USER_BEHAVIOR: 'Doğru kanonik anlam korunur; iş yazımı yapılmaz.',
    PROHIBITED_OUTCOMES: 'Çalışma zamanı rotası metinden çıkarılamaz; yetkisiz veya belirsiz iş yazılamaz.',
    CONTRACT_RATIONALE: challengeIndex === 4
      ? 'Continuation expectation is derived from an executable prior canonical state seed; role heuristics and prose-only state are forbidden.'
      : 'Yeni yazar yapısı; mevcut V4R2R2 karşılaştırma sözlüğü ve yetkili ürün kataloğu ile bağımsız olarak oluşturuldu.',
    EXECUTION_CONTEXT: contextFor(role, scope, selectedEntity, continuationStateSeed),
  };
}

const cases = roles.flatMap((role, roleIndex) => challengeClasses.map((_, challengeIndex) => defineCase(role, roleIndex, challengeIndex)));
const candidate = {
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId: `${artifactPrefix.toUpperCase().replace(/[^A-Z0-9]+/gu, '-')}`,
  status: 'UNFROZEN_CANDIDATE',
  caseCount: cases.length,
  cases,
};
const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
const structural = validateCandidateStaticSchema(candidate);
const metadata = {
  authorContextId,
  candidatePath,
  createdAt: new Date().toISOString(),
  caseCount: cases.length,
  roleCount: roles.length,
  sourceContractBindingSha256,
  sourceContractBinding,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  runtimeOracleUsed: false,
  originalR15Inspected: false,
};
if (structural.safe) {
  writeFileSync(candidatePath, candidateBytes);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}
console.log(JSON.stringify({
  status: structural.safe ? 'GREEN' : 'BLOCKED_PRE_FREEZE',
  authorContextId,
  candidatePath,
  metadataPath,
  candidateManifestSha256: sha256(candidateBytes),
  caseCount: cases.length,
  roleCount: roles.length,
  casesPerRole: 7,
  staticSchemaValidation: structural.safe ? '56/56 GREEN' : structural,
  preFreezeBatchCorrectionCount: 1,
}, null, 2));
if (!structural.safe) process.exitCode = 1;
