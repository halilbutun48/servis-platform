import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { deriveAuthorExpectation } from './lib/m18HoldoutExpectationAuthor.mjs';
import {
  loadContractPacket,
  validateCandidateStaticSchema,
  sha256,
} from './lib/m18HoldoutGovernance.mjs';
import { validateCandidateFixtureProvenance } from './lib/m18ExecutionFixturePreconditions.mjs';
import {
  completeContractBinding,
  completeContractBindingSha256,
  currentContractBinding,
  SUPPORTED_CONTINUATION_FORMS,
} from './lib/m18CurrentSemanticContract.mjs';
import {
  SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
  CRITICAL_FAILURE_STOP_POLICY,
} from './lib/m18HoldoutExecutionAdapter.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const artifactPrefix = process.env.M18_FRESH_ARTIFACT_PREFIX || 'm18-post-r15-corrective-fresh-acceptance-20261009';
const manifestId = process.env.M18_FRESH_MANIFEST_ID || 'M18-POST-R15-CORRECTIVE-FRESH-ACCEPTANCE-56-20261009';
const caseIdPrefix = process.env.M18_FRESH_CASE_ID_PREFIX || 'M18-POST-R15-20261009';
const freshAuthoringVariant = process.env.M18_FRESH_AUTHORING_VARIANT === 'M18-POST-R15-FRESH-20261009';
const independentFreshAuthoringVariant = process.env.M18_FRESH_AUTHORING_VARIANT === 'M18-REAL-FIXTURE-INDEPENDENT-V2-20261009';
const postHoldoutFreshAuthoringVariant = process.env.M18_FRESH_AUTHORING_VARIANT === 'M18-POST-HOLDOUT-FRESH-20261010';
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, `${artifactPrefix}-candidate.json`);
const metadataPath = resolve(planDir, `${artifactPrefix}-author.json`);
const packetBytes = readFileSync(packetPath);
const packet = loadContractPacket(packetBytes);
const roles = ['ROOM', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
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
  ROOM: { role: 'ROOM', roomId: 1 },
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};
const tenants = {
  ROOM: { type: 'ROOM', companyKind: null },
  COMPANY: { type: 'COMPANY', companyKind: 'COMPANY' },
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

const authorContextId = `m18-post-r15-author-${randomUUID()}`;
const sourceContractBinding = currentContractBinding(root);
const sourceContractBindingSha256 = createHash('sha256').update(JSON.stringify(sourceContractBinding)).digest('hex').toUpperCase();
const completeSourceBinding = completeContractBinding(root);
const completeSourceBindingSha256 = completeContractBindingSha256(root);
const sourceBinding = {
  bindingVersion: completeSourceBinding.bindingVersion,
  completeBindingSha256: completeSourceBindingSha256,
  parentBindingSha256: sourceContractBindingSha256,
  sourceScope: completeSourceBinding.sourceScope,
};

function continuationStateSeed(role) {
  return {
    schemaVersion: 'M18-CONTINUATION-AUTHORING-STATE-V1',
    stateKind: 'ROLE_SEQUENTIAL_AUTH_SESSION',
    status: 'VALID',
    validated: true,
    priorCaseIds: [`M18-POST-R15-PRIOR-${role}`],
    priorCanonicalTask: 'SCREEN_CONTEXT',
    priorOperation: 'EXPLAIN_CURRENT_SURFACE',
    priorObjectClass: 'SURFACE',
    priorSemanticScope: 'PRODUCT_EXPLICIT',
    priorReference: 'ABSENT',
    priorResolutionStatus: 'RESOLVED',
    currentSurface: screens[role],
    selectedEntity: null,
    selectedRecord: null,
    priorGuidedTarget: null,
    priorGuidedTask: 'SCREEN_CONTEXT',
    sessionScope: { role, tenantContext: tenants[role] },
    continuationBaseObjectClass: 'RECORD',
    conversationStateRequired: true,
  };
}

function contextFor(role, scope, selectedEntity, seed = null) {
  return {
    source: 'AUTHORIZED_PRODUCT_CATALOG',
    role,
    tenantContext: tenants[role],
    screen: ['PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'].includes(scope) ? null : screens[role],
    selectedEntity: selectedEntity || null,
    ...(seed ? { continuationStateSeed: seed } : {}),
  };
}

function freshInputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput) {
  const label = screens[role].label;
  const selectedEntity = challengeIndex === 2
    ? selectedEntityForRole(role, fixtureProvenanceInput)
    : null;
  if (challengeIndex === 0) return {
    text: `${label} ekranının günlük kullanım amacını ve temel akıştaki yerini açıklar mısın?`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 1) return {
    text: `${label} bölümüne geçip ana görünümü açmama yardımcı olur musun?`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 2) return {
    text: 'Seçili vardiyanın planlama ayrıntısında tarih bilgisini hangi alanda görebilirim?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
    targetResolution: 'RESOLVED_RECORD',
  };
  if (challengeIndex === 3) {
    const seed = continuationStateSeed(role);
    return {
      text: 'Bu akışta sonraki adıma geçelim mi?',
      TURN_1: `${label} ekranındaki başlangıç adımlarını özetler misin?`,
      currentSurface: screens[role], targetAvailable: true, selectedEntity: null, continuationState: seed, seed,
    };
  }
  if (challengeIndex === 4) return {
    text: 'Yeni bir vardiya planı oluşturma yetkim var mı; hangi adımları izlemeliyim?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 5) return {
    text: 'Vardiya kaydındaki tarih alanının anlamı nedir?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity: null,
  };
  return {
    text: 'Hafta sonu için evde yapılabilecek sakin bir etkinlik önerir misin?',
    currentSurface: null, targetAvailable: true, selectedEntity: null,
  };
}

function freshIndependentV2InputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput) {
  const label = screens[role].label;
  const selectedEntity = challengeIndex === 2
    ? selectedEntityForRole(role, fixtureProvenanceInput)
    : null;
  if (challengeIndex === 0) return {
    text: `${label} ekranının temel kullanım amacını ve günlük iş akışındaki görevini açıklayabilir misin?`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 1) return {
    text: `${label} ekranını menüden bulup açmak için gereken adımları tarif eder misin?`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 2) return {
    text: 'Seçili vardiya için tarih ayrıntısına ulaşırken hangi bilgi alanını açmalıyım?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
    targetResolution: 'RESOLVED_RECORD',
  };
  if (challengeIndex === 3) {
    const seed = continuationStateSeed(role);
    return {
      text: 'Kaldığımız yerden devam edelim; sonraki açıklamayı aynı oturumda sürdürür müsün?',
      TURN_1: `${label} ekranında bu görevin başlangıç çerçevesini açıklar mısın?`,
      currentSurface: screens[role], targetAvailable: true, selectedEntity: null, continuationState: seed, seed,
    };
  }
  if (challengeIndex === 4) return {
    text: `${role} hesabıyla vardiya planlama yetkimin kapsamını ve izleyebileceğim adımları açıklar mısın?`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 5) return {
    text: 'Vardiya tarih alanının anlamını bağlam belirtmeden nasıl açıklarsın?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity: null,
  };
  return {
    text: 'Evdeki kitaplığımı düzenlemek için renk uyumu önerir misin?',
    currentSurface: null, targetAvailable: true, selectedEntity: null,
  };
}

function postHoldoutFreshInputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput) {
  const label = screens[role].label;
  const regressionNonce = String(process.env.M18_FRESH_AUTHORING_TEST_NONCE || '').trim();
  const nonceSuffix = regressionNonce ? ` (${regressionNonce})` : '';
  const selectedEntity = challengeIndex === 2
    ? selectedEntityForRole(role, fixtureProvenanceInput)
    : null;
  if (challengeIndex === 0) return {
    text: `${label} ekranında günlük işleri hangi sırayla yürüttüğümü anlatır mısın?${nonceSuffix}`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 1) return {
    text: `Menüdeki ${label} ekranına ulaşıp ilk görünümü açmak için ne yapmalıyım?${nonceSuffix}`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 2) return {
    text: `Seçtiğim vardiyanın tarih bilgisini açtığımda hangi alanda bulurum?${nonceSuffix}`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
    targetResolution: 'RESOLVED_RECORD',
  };
  if (challengeIndex === 3) {
    const seed = continuationStateSeed(role);
    const continuationText = String(process.env.M18_FRESH_CONTINUATION_TEXT || '').trim()
      || SUPPORTED_CONTINUATION_FORMS[roleIndex % SUPPORTED_CONTINUATION_FORMS.length];
    return {
      text: `${continuationText}?`,
      TURN_1: `${label} ekranının kullanım amacını anlatabilir misin?${nonceSuffix}`,
      currentSurface: screens[role], targetAvailable: true, selectedEntity: null, continuationState: seed, seed,
    };
  }
  if (challengeIndex === 4) return {
    text: `Yeni bir vardiya oluşturmak istiyorum; ${role} rolüyle oluşturma yetkim var mı?${nonceSuffix}`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 5) return {
    text: `Vardiya tarihini incelemek istiyorum ama hangi kaydı kastettiğimi belirtmeden önce hangi bilgiyi vermeliyim?${nonceSuffix}`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity: null,
    recordTargetRequired: true,
    targetResolution: 'MISSING_RECORD',
  };
  return {
    text: `Mutfaktaki kitaplarımı düzenlemek için renk sıralaması önerir misin?${nonceSuffix}`,
    currentSurface: null, targetAvailable: true, selectedEntity: null,
  };
}

function loadFixtureProvenanceInput() {
  const provenancePath = String(process.env.M18_FIXTURE_PROVENANCE_PATH || '').trim();
  if (!provenancePath) return { fixtureRegistry: null, registryProvenance: null, loadFailure: 'FIXTURE_PROVENANCE_PATH_MISSING' };
  try {
    const bytes = readFileSync(resolve(root, provenancePath));
    const envelope = JSON.parse(bytes.toString('utf8'));
    return {
      fixtureRegistry: envelope.fixtureRegistry || envelope.registry || null,
      registryProvenance: envelope.provenance || envelope,
      authorizationEvidence: envelope.registryPayload?.authorizationEvidence || [],
      provenanceReceiptSha256: sha256(bytes),
      provenancePath,
    };
  } catch (error) {
    return {
      fixtureRegistry: null,
      registryProvenance: null,
      provenancePath,
      loadFailure: `FIXTURE_PROVENANCE_LOAD_FAILED:${error?.code || error?.name || 'UNKNOWN'}`,
    };
  }
}

function selectedEntityForRole(role, fixtureProvenanceInput) {
  const registry = fixtureProvenanceInput?.fixtureRegistry;
  if (!registry) return null;
  const matches = Object.values(registry).filter((fixture) => (
    String(fixture?.type || '').toUpperCase() === 'SHIFT'
      && Array.isArray(fixture?.authorizedRoles)
      && fixture.authorizedRoles.includes(role)
      && Number.isInteger(Number(fixture.id))
      && Number(fixture.id) > 0
  ));
  if (matches.length !== 1) throw new Error(`AUTHOR_FIXTURE_REFERENCE_UNRESOLVED:${role}`);
  const fixture = matches[0];
  return {
    type: 'SHIFT',
    id: Number(fixture.id),
    tenantContextType: tenants[role].type,
  };
}

function contractSourceClass(challengeIndex) {
  return ['PRODUCT_SURFACE_CONTRACT', 'PRODUCT_SURFACE_CONTRACT', 'REFERENCE_CONTRACT', 'CONTINUATION_CONTRACT', 'ROLE_BOUNDARY', 'REFERENCE_CONTRACT', 'OOS_CONTRACT'][challengeIndex];
}

function inputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput) {
  if (postHoldoutFreshAuthoringVariant) return postHoldoutFreshInputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput);
  if (independentFreshAuthoringVariant) return freshIndependentV2InputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput);
  if (freshAuthoringVariant) return freshInputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput);
  const label = screens[role].label;
  const selectedEntity = challengeIndex === 2
    ? selectedEntityForRole(role, fixtureProvenanceInput)
    : null;
  if (challengeIndex === 0) return {
    text: `${label} ekranının kullanım amacını ve günlük akıştaki yerini özetler misin?`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 1) return {
    text: `${label} ekranına geçip ilgili görünümü açabilir misin?`,
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 2) return {
    text: 'Seçili vardiya kaydının tarih bilgisi hangi alanda yer alıyor?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
    targetResolution: 'RESOLVED_RECORD',
  };
  if (challengeIndex === 3) {
    const seed = continuationStateSeed(role);
    return {
      text: 'Aynı akışın devamını anlatır mısın?',
      TURN_1: `${label} ekranında ilk adımı açıklayabilir misin?`,
      currentSurface: screens[role], targetAvailable: true, selectedEntity, continuationState: seed, seed,
    };
  }
  if (challengeIndex === 4) return {
    text: 'Yeni vardiya kaydı oluşturmak istiyorum; oluşturma adımlarını gösterebilir misin?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity,
  };
  if (challengeIndex === 5) return {
    text: 'Bunu vardiya bağlamında nasıl anlamalıyım?',
    currentSurface: screens[role], targetAvailable: true, selectedEntity: null,
  };
  return {
    text: 'Yağmurlu hafta sonu için evde oynanabilecek sakin bir oyun önerir misin?',
    currentSurface: null, targetAvailable: true, selectedEntity: null,
  };
}

function toExpected(result) {
  const frame = result.frame;
  return {
    EXPECTED_SEMANTIC_SCOPE: frame.scope,
    EXPECTED_REQUEST_MODE: frame.action === 'CONTINUE' ? 'CONTINUE' : frame.requestMode,
    EXPECTED_SEMANTIC_ACTION: frame.action,
    EXPECTED_ACTION: frame.action,
    EXPECTED_OBJECT: frame.object,
    EXPECTED_REFERENCE_CLASS: frame.reference,
    EXPECTED_RESOLUTION_STATUS: frame.resolution,
    EXPECTED_TASK_OR_TASK_FAMILY: frame.scope === 'PRODUCT_AMBIGUOUS' ? 'NONE' : frame.task,
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: frame.operation,
    EXPECTED_AUTHORIZATION_CLASS: result.authorization.authorizationClass,
  };
}

const cases = [];
const authorEvidence = [];
const fixtureProvenanceInput = loadFixtureProvenanceInput();
for (const [roleIndex, role] of roles.entries()) {
  for (const [challengeIndex, challengeClass] of challengeClasses.entries()) {
    const base = inputFor(role, roleIndex, challengeIndex, fixtureProvenanceInput);
    const firstTurn = base.TURN_1 || base.text;
    const authorInput = challengeIndex === 3 ? { role, ...base, text: base.text } : { role, ...base, text: firstTurn };
    const author = deriveAuthorExpectation(authorInput);
    if (!author.safe) throw new Error(`AUTHOR_EXPECTATION_UNSAFE:${role}:${challengeClass}:${author.failures.join(',')}`);
    const expected = toExpected(author);
    const scope = expected.EXPECTED_SEMANTIC_SCOPE;
    const executableSeed = challengeIndex === 3 ? base.seed : null;
    cases.push({
      CASE_ID: `${caseIdPrefix}-${role}-${String(challengeIndex + 1).padStart(2, '0')}`,
      ROLE: role,
      TENANT_CONTEXT_TYPE: tenants[role].type,
      TURN_COUNT: challengeIndex === 3 ? 2 : 1,
      TURN_1: firstTurn,
      TURN_2: challengeIndex === 3 ? base.text : null,
      TURN_3: null,
      SURFACE_PRECONDITION: scope === 'OFF_TOPIC_GENUINE' ? 'Ürün ekranı bağlamı intentionally absent.' : `${screens[role].label} authorized catalog surface.`,
      STATE_PRECONDITION: challengeIndex === 3 ? 'TURN_1 establishes server-owned conversation state; continuationStateSeed is declarative authoring metadata only and is not transported as runtime conversation state.' : 'Isolated read-only semantic context; no business write.',
      REFERENCE_PRECONDITION: challengeIndex === 2 ? 'Selected SHIFT reference is resolved inside the active tenant.' : challengeIndex === 5 ? 'Deictic SHIFT reference is intentionally unresolved.' : 'No unrequested record reference is supplied.',
      CHALLENGE_CLASS: challengeClass,
      ...expected,
      EXPECTED_USER_BEHAVIOR: 'The current V3 task and authorization preconditions are preserved without a business write.',
      PROHIBITED_OUTCOMES: 'No invented capability, tenant leakage, record assumption, or silent write.',
      CONTRACT_RATIONALE: `Independent post-R15 contract derivation for ${challengeClass}; runtime output is not consulted.`,
      CONTRACT_SOURCE_CLASS: contractSourceClass(challengeIndex),
      EXECUTION_CONTEXT: contextFor(role, scope, base.selectedEntity, executableSeed),
    });
    authorEvidence.push({ role, challengeClass, frame: author.frame, authorization: author.authorization, source: 'M18-AUTHOR-CONTRACT-V2' });
  }
}

const candidate = {
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId,
  status: 'UNFROZEN_CANDIDATE',
  caseCount: cases.length,
  cases,
};
const candidateBytes = Buffer.from(JSON.stringify(candidate, null, 2) + '\n', 'utf8');
const structural = validateCandidateStaticSchema(candidate);
const fixturePreflight = validateCandidateFixtureProvenance({
  candidate,
  fixtureRegistry: fixtureProvenanceInput.fixtureRegistry,
  registryProvenance: fixtureProvenanceInput.registryProvenance,
  authorizationEvidence: fixtureProvenanceInput.authorizationEvidence,
  sourceContractBindingSha256,
});
if (fixtureProvenanceInput.loadFailure && fixturePreflight.safe) {
  fixturePreflight.safe = false;
  fixturePreflight.failureReasons.push(fixtureProvenanceInput.loadFailure);
}
const readyForFreeze = structural.safe && fixturePreflight.safe;
if (readyForFreeze) {
  writeFileSync(candidatePath, candidateBytes, 'utf8');
  writeFileSync(metadataPath, JSON.stringify({
    authorContextId,
    candidatePath,
    createdAt: new Date().toISOString(),
    caseCount: cases.length,
    roleCount: roles.length,
    casesPerRole: 7,
    sourceContractBindingSha256,
    sourceContractBinding,
    sourceBinding,
    completeSourceBinding,
    executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
    ordinaryMismatchPolicy: SAFE_ORDINARY_MISMATCH_COLLECTION_POLICY,
    criticalFailurePolicy: CRITICAL_FAILURE_STOP_POLICY,
    runtimeOracleUsed: false,
    originalR15Inspected: false,
    fixtureProvenance: {
      sourceKind: fixtureProvenanceInput.registryProvenance.sourceKind,
      sourceIdentity: fixtureProvenanceInput.registryProvenance.sourceIdentity,
      registrySha256: fixtureProvenanceInput.registryProvenance.registrySha256,
      sourceContractBindingSha256: fixtureProvenanceInput.registryProvenance.sourceContractBindingSha256,
      provenanceReceiptSha256: fixtureProvenanceInput.provenanceReceiptSha256,
    },
  }, null, 2) + '\n', 'utf8');
}
console.log(JSON.stringify({
  status: readyForFreeze ? 'GREEN' : 'BLOCKED_PRE_FREEZE_FIXTURE_PROVENANCE',
  authorContextId,
  candidatePath,
  metadataPath,
  candidateManifestSha256: sha256(candidateBytes),
  caseCount: cases.length,
  roleCount: roles.length,
  casesPerRole: 7,
  sourceContractBindingSha256,
  sourceBinding,
  completeSourceBindingSha256,
  executionProtocolId: SAFE_COLLECT_ALL_EXECUTION_PROTOCOL_ID,
  runtimeOracleUsed: false,
  originalR15Inspected: false,
  staticSchemaValidation: structural.safe ? '56/56 GREEN' : structural,
  fixturePreflight,
  fixtureProvenanceLoadFailure: fixtureProvenanceInput.loadFailure || null,
  authorEvidenceRows: authorEvidence.length,
}, null, 2));
if (!readyForFreeze) process.exitCode = 1;
