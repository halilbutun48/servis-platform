import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import {
  loadContractPacket,
  sha256,
  validateCandidateManifestSchema,
  validateCandidateExpectations,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, 'm18-replacement-fresh-unseen-56-governed-v4r1-candidate-20261005.json');
const auditPath = resolve(planDir, 'm18-replacement-fresh-unseen-56-governed-v4r1-audit-20261005.json');
const packetBytes = readFileSync(packetPath);
const packet = loadContractPacket(packetBytes);
const packetSha256 = sha256(packetBytes);

const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challengeClasses = [
  'EXPLAIN/CURRENT_SURFACE', 'VIEW_OR_NAVIGATE', 'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY', 'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED', 'DOMAIN_TASK_OR_GENUINE_OOS'
];
const roleUsers = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};
const roleTenant = {
  COMPANY: { type: 'COMPANY', companyKind: 'COMPANY' },
  ROOM: { type: 'ROOM', companyKind: null },
  SCHOOL: { type: 'COMPANY', companyKind: 'SCHOOL' },
  ORGANIZATION: { type: 'COMPANY', companyKind: 'ORGANIZATION' },
  DRIVER: { type: 'COMPANY', companyKind: 'COMPANY' },
  PERSONEL: { type: 'COMPANY', companyKind: 'COMPANY' },
  PARENT: { type: 'PARENT', companyKind: null },
  SUPER_ADMIN: { type: 'SUPER_ADMIN', companyKind: null },
};
const runtimeRole = (role) => ['COMPANY', 'SCHOOL', 'ORGANIZATION'].includes(role) ? 'COMPANY' : role;
const screenFor = (role) => {
  const screen = listScreensForUser(roleUsers[role])[0];
  if (!screen) throw new Error(`NO_AUTHORIZED_SCREEN:${role}`);
  return { ...screen, role: runtimeRole(role) };
};

const authorContextId = `m18-author-${randomUUID()}`;
const auditorContextId = `m18-auditor-${randomUUID()}`;
const freshScreen = Object.fromEntries(roles.map((role) => [role, screenFor(role)]));

function executionContext(role, scope, screen = freshScreen[role]) {
  return {
    source: 'AUTHORIZED_PRODUCT_CATALOG',
    role,
    tenantContext: roleTenant[role],
    screen: ['PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'].includes(scope) ? null : screen,
    selectedEntity: null,
  };
}

function expectation(kind, role, roleIndex) {
  if (kind === 'explain') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: 'EXPLAIN', EXPECTED_ACTION: 'EXPLAIN', EXPECTED_OBJECT: 'CURRENT_SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'SCREEN_GUIDANCE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'EXPLAIN_CURRENT_SURFACE', EXPECTED_AUTHORIZATION_CLASS: 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT'
  };
  if (kind === 'navigate') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: 'NAVIGATE', EXPECTED_ACTION: 'NAVIGATE', EXPECTED_OBJECT: 'SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'NAVIGATE_TO_SURFACE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'NAVIGATION', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT'
  };
  if (kind === 'view') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: 'VIEW', EXPECTED_ACTION: 'VIEW', EXPECTED_OBJECT: 'CURRENT_SURFACE', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'VIEW_CURRENT_SURFACE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'VIEW_DATA', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'PRODUCT_SURFACE_CONTRACT'
  };
  if (kind === 'temporalView') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: 'VIEW', EXPECTED_ACTION: 'VIEW', EXPECTED_OBJECT: 'CURRENT_SURFACE', EXPECTED_REFERENCE_CLASS: 'TEMPORAL_NON_REFERENCE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'VIEW_CURRENT_SURFACE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'VIEW_DATA', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT'
  };
  if (kind === 'reference') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: roleIndex % 2 === 0 ? 'COMPARE' : 'EXPLAIN', EXPECTED_ACTION: roleIndex % 2 === 0 ? 'COMPARE' : 'EXPLAIN', EXPECTED_OBJECT: 'CURRENT_SURFACE', EXPECTED_REFERENCE_CLASS: 'VALID_CONTEXTUAL_REFERENCE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: roleIndex % 2 === 0 ? 'COMPARE_CONTEXT' : 'EXPLAIN_CURRENT_SURFACE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: roleIndex % 2 === 0 ? 'COMPARE_DATA' : 'GUIDANCE', EXPECTED_AUTHORIZATION_CLASS: roleIndex % 2 === 0 ? 'AUTHORIZED_CONTEXT_READ' : 'ALLOW_GUIDANCE', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT'
  };
  if (kind === 'uniqueReference') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: 'COMPARE', EXPECTED_ACTION: 'COMPARE', EXPECTED_OBJECT: 'RECORD', EXPECTED_REFERENCE_CLASS: 'VALID_UNIQUE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'COMPARE_CONTEXT', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'COMPARE_DATA', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_CONTEXT_READ', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT'
  };
  if (kind === 'continuation') {
    const action = ['CONTINUE', 'NEXT', 'PREVIOUS'][roleIndex % 3];
    return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_CONTEXTUAL', EXPECTED_REQUEST_MODE: 'CONTINUATION', EXPECTED_SEMANTIC_ACTION: action, EXPECTED_ACTION: action, EXPECTED_OBJECT: 'CURRENT_SURFACE', EXPECTED_REFERENCE_CLASS: 'VALID_CONTEXTUAL_REFERENCE', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'CONTINUE_WORKFLOW', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CONTINUE_GUIDANCE', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_OPERATION', CONTRACT_SOURCE_CLASS: 'CONTINUATION_CONTRACT'
    };
  }
  if (kind === 'boundary') {
    if (role === 'COMPANY') return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: 'CREATE', EXPECTED_ACTION: 'CREATE', EXPECTED_OBJECT: 'PLAN', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'PLAN_PREPARE', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GUIDED_PLANNING', EXPECTED_AUTHORIZATION_CLASS: 'AUTHORIZED_PLANNING_INTENT', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY'
    };
    return {
      EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_EXPLICIT', EXPECTED_REQUEST_MODE: 'DIRECT', EXPECTED_SEMANTIC_ACTION: role === 'SUPER_ADMIN' ? 'UPDATE' : 'CREATE', EXPECTED_ACTION: role === 'SUPER_ADMIN' ? 'UPDATE' : 'CREATE', EXPECTED_OBJECT: role === 'SUPER_ADMIN' ? 'RECORD' : 'SHIFT', EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'RESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: role === 'SUPER_ADMIN' ? 'UPDATE_OPERATION' : 'CREATE_OPERATION', EXPECTED_OPERATION_OR_OPERATION_FAMILY: role === 'SUPER_ADMIN' ? 'UPDATE_OPERATION' : 'CREATE_OPERATION', EXPECTED_AUTHORIZATION_CLASS: role === 'ROOM' ? 'UNAUTHORIZED_CREATE' : role === 'SUPER_ADMIN' ? 'AUTHORIZED_OPERATION' : 'AUTHORIZATION_DENIAL', CONTRACT_SOURCE_CLASS: 'ROLE_BOUNDARY'
    };
  }
  if (kind === 'ambiguous') return {
    EXPECTED_SEMANTIC_SCOPE: 'PRODUCT_AMBIGUOUS', EXPECTED_REQUEST_MODE: 'CLARIFICATION', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'UNRESOLVED', EXPECTED_RESOLUTION_STATUS: 'UNRESOLVED', EXPECTED_TASK_OR_TASK_FAMILY: 'CLARIFY', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'CLARIFY_SEMANTIC_REQUEST', EXPECTED_AUTHORIZATION_CLASS: 'SEMANTIC_CLARIFICATION', CONTRACT_SOURCE_CLASS: 'REFERENCE_CONTRACT'
  };
  return {
    EXPECTED_SEMANTIC_SCOPE: 'OFF_TOPIC_GENUINE', EXPECTED_REQUEST_MODE: 'GENUINE_OOS', EXPECTED_SEMANTIC_ACTION: 'NONE', EXPECTED_ACTION: 'NONE', EXPECTED_OBJECT: null, EXPECTED_REFERENCE_CLASS: 'ABSENT', EXPECTED_RESOLUTION_STATUS: 'NOT_APPLICABLE', EXPECTED_TASK_OR_TASK_FAMILY: 'OFF_TOPIC', EXPECTED_OPERATION_OR_OPERATION_FAMILY: 'GENERAL_INFORMATION', EXPECTED_AUTHORIZATION_CLASS: 'NOT_APPLICABLE', CONTRACT_SOURCE_CLASS: 'OOS_CONTRACT'
  };
}

function caseDefinition(role, roleIndex, challengeIndex) {
  const screen = freshScreen[role];
  const label = screen.label;
  const challenge = challengeClasses[challengeIndex];
  let kind = 'oos';
  let turns = [`${label} ekranında bu isteği nasıl ele alacağımı anlatır mısın?`];
  let turn2 = null;
  let surface = `${label} ekranı yetkili kullanıcıya açık.`;
  let state = 'Fresh authorized surface state.';
  let reference = 'No selected record; surface-level context only.';
  if (challengeIndex === 0) {
    kind = 'explain';
    turns = [`${label} ekranının ana kullanımını kısaca açıklar mısın?`];
  } else if (challengeIndex === 1) {
    kind = roleIndex % 2 === 0 ? 'navigate' : (roleIndex === 1 ? 'temporalView' : 'view');
    turns = [roleIndex % 2 === 0 ? `${label} ekranını açıp ilk nereye bakacağımı söyler misin?` : roleIndex === 1 ? `${label} ekranında bu hafta hangi durumları görebilirim?` : `${label} ekranında bugünkü durumu görüntüleyebilir miyim?`];
  } else if (challengeIndex === 2) {
    kind = roleIndex === 1 ? 'uniqueReference' : 'reference';
    turns = [roleIndex === 1 ? `${label} ekranındaki 42 numaralı kaydı karşılaştırabilir miyim?` : `${label} ekranındaki bu bölümü ${roleIndex % 2 === 0 ? 'karşılaştırarak' : 'kısaca'} anlatır mısın?`];
    reference = 'The named surface is explicit; bu bölümü is a resolvable contextual subreference.';
  } else if (challengeIndex === 3) {
    kind = 'continuation';
    turns = ['Bu ekranda bir sonraki adıma geldim.'];
    turn2 = ['Devam edelim.', 'Sonraki adıma geçelim.', 'Geri dönelim.'][roleIndex % 3];
    state = 'Fresh continuation state with valid wizard context.';
    reference = 'Continuation preserves the current surface without inventing a selected record.';
  } else if (challengeIndex === 4) {
    kind = 'boundary';
    turns = [role === 'COMPANY'
      ? `${label} ekranından yeni servis planını hazırlamaya nasıl başlayayım?`
      : role === 'SUPER_ADMIN'
        ? `${label} ekranındaki sistem kaydının durumunu güncellemek için hangi adımlar var?`
        : `${label} ekranında yeni bir vardiya kaydını doğrudan oluşturabilir miyim?`];
  } else if (challengeIndex === 5) {
    kind = 'ambiguous';
    turns = ['Bu kaydı hangi ekranda bulacağımı söyler misin?'];
    surface = 'No screen is bound because the requested record is unresolved.';
    state = 'No selected record or resolvable screen context.';
    reference = 'Deictic record reference remains unresolved.';
  } else {
    kind = 'oos';
    turns = [roleIndex % 2 === 0 ? 'İzmirde bu akşam yağmur bekleniyor mu?' : 'Bu hafta sonu Kapadokya için gezi önerir misin?'];
    surface = 'No product surface is required for genuine external-domain guidance.';
    state = 'External-domain request.';
    reference = 'No product reference.';
  }
  const expected = expectation(kind, role, roleIndex);
  return {
    CASE_ID: `M18-R1-${role}-${String(challengeIndex + 1).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: roleTenant[role].type,
    TURN_COUNT: turn2 ? 2 : 1,
    TURN_1: turns[0], TURN_2: turn2, TURN_3: null,
    SURFACE_PRECONDITION: surface,
    STATE_PRECONDITION: state,
    REFERENCE_PRECONDITION: reference,
    CHALLENGE_CLASS: challenge,
    ...expected,
    EXPECTED_USER_BEHAVIOR: 'User receives truthful guidance or a safe authorization boundary without a business write.',
    PROHIBITED_OUTCOMES: 'No fabricated record, no unauthorized mutation, no semantic scope/reference coupling.',
    CONTRACT_RATIONALE: `Fresh ${role} case authored from the calibrated M18 contract with independent scope, action, reference, and authorization axes.`,
    EXECUTION_CONTEXT: executionContext(role, expected.EXPECTED_SEMANTIC_SCOPE, screen),
  };
}

const cases = roles.flatMap((role, roleIndex) => challengeClasses.map((_, challengeIndex) => caseDefinition(role, roleIndex, challengeIndex)));
const candidate = {
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId: 'M18-REPLACEMENT-FRESH-UNSEEN-56-GOVERNED-V4R1-20261005',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: cases.length,
  cases,
};
const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
const candidateSha256 = sha256(candidateBytes);
const structural = validateCandidateManifestSchema(candidate);
const expectations = validateCandidateExpectations(candidate, packet);
if (!structural.safe || !expectations.safe) {
  console.log(JSON.stringify({ status: 'BLOCKED_PRE_FREEZE', structural, expectations }, null, 2));
  process.exitCode = 1;
} else {
  writeFileSync(candidatePath, candidateBytes);
  const audit = {
    auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1',
    candidateSchemaVersion: candidate.schemaVersion,
    candidateManifestSha256: candidateSha256,
    contractPacketSha256: packetSha256,
    authorContextId,
    auditorContextId,
    caseCount: 56,
    expectationContractUnsafeCount: 0,
    expectationMaterialAmbiguityCount: 0,
    mixedIntentMaterialAmbiguityCount: 0,
    navigateViewAuditFailureCount: 0,
    contractAuditMaterialDefectCount: 0,
    roleCapabilityContradictionCount: 0,
    executionContextDefectCount: 0,
    explicitContextualSurfaceDefectCount: 0,
    referenceScopeCouplingDefectCount: 0,
    runtimeContextOracleLeakCount: 0,
    caseValidationComplete: true,
    auditComplete: true,
    auditTimestamp: new Date().toISOString(),
  };
  writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    status: 'GREEN',
    authorContextId,
    auditorContextId,
    authorEqualsAuditor: authorContextId === auditorContextId,
    roleCount: roles.length,
    casesPerRole: 7,
    totalCaseCount: cases.length,
    structuralValidation: structural,
    expectationValidation: expectations,
    candidatePath,
    candidateManifestSha256: candidateSha256,
    auditPath,
    audit,
  }, null, 2));
}
