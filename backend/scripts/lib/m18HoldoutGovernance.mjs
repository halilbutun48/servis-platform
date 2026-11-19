import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { listScreensForUser } from '../../src/ai/jobGuide/screenCatalog.js';
import { resolveCanonicalConversationRequest } from '../../src/ai/chat/canonicalSemanticRequest.js';
import { validateExecutableContinuationState } from './m18ContinuationAuthoringContract.mjs';
import { isSupportedSelectedEntityType } from './m18CurrentSemanticContract.mjs';

export const REQUIRED_AUDIT_COUNT_FIELDS = Object.freeze([
  'expectationContractUnsafeCount',
  'expectationMaterialAmbiguityCount',
  'mixedIntentMaterialAmbiguityCount',
  'navigateViewAuditFailureCount',
  'contractAuditMaterialDefectCount',
  'roleCapabilityContradictionCount'
]);

export const REQUIRED_V2_AUDIT_COUNT_FIELDS = Object.freeze([
  'executionContextDefectCount',
  'explicitContextualSurfaceDefectCount',
  'referenceScopeCouplingDefectCount',
  'runtimeContextOracleLeakCount',
  'contaminationKnownArtifactOverlapCount'
]);

const REQUIRED_CANONICAL_FIELDS = Object.freeze([
  'semanticScope',
  'requestMode',
  'semanticAction',
  'action',
  'object',
  'reference',
  'resolutionStatus',
  'task',
  'operation',
  'authorizationClass',
  'contractSourceClass'
]);

const HASH_PATTERN = /^[0-9A-F]{64}$/u;
const NON_EMPTY_STRING = (value) => typeof value === 'string' && value.trim().length > 0;
const toConstantName = (value) => value.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').toUpperCase();

const CANDIDATE_SCHEMA_V1_BYTES = readFileSync(new URL('./m18HoldoutCandidateSchemaV1.json', import.meta.url));
const CANDIDATE_SCHEMA_V2_BYTES = readFileSync(new URL('./m18HoldoutCandidateSchemaV2.json', import.meta.url));
const CANDIDATE_SCHEMA_V1 = JSON.parse(CANDIDATE_SCHEMA_V1_BYTES.toString('utf8'));
const CANDIDATE_SCHEMA_V2 = JSON.parse(CANDIDATE_SCHEMA_V2_BYTES.toString('utf8'));

export const M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION = CANDIDATE_SCHEMA_V1.schemaVersion;
export const M18_HOLDOUT_CANDIDATE_SCHEMA_SHA256 = createHash('sha256').update(CANDIDATE_SCHEMA_V1_BYTES).digest('hex').toUpperCase();
export const M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION = CANDIDATE_SCHEMA_V2.schemaVersion;
export const M18_HOLDOUT_CANDIDATE_SCHEMA_V2_SHA256 = createHash('sha256').update(CANDIDATE_SCHEMA_V2_BYTES).digest('hex').toUpperCase();
export const M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION = 'M18-HOLDOUT-CONTRACT-PACKET-V2';

const ROLE_TENANT_CONTRACT = Object.freeze({
  COMPANY: { type: 'COMPANY', companyKind: 'COMPANY', runtimeRole: 'COMPANY' },
  ROOM: { type: 'ROOM', companyKind: null, runtimeRole: 'ROOM' },
  SCHOOL: { type: 'COMPANY', companyKind: 'SCHOOL', runtimeRole: 'COMPANY' },
  ORGANIZATION: { type: 'COMPANY', companyKind: 'ORGANIZATION', runtimeRole: 'COMPANY' },
  DRIVER: { type: 'COMPANY', companyKind: 'COMPANY', runtimeRole: 'DRIVER' },
  PERSONEL: { type: 'COMPANY', companyKind: 'COMPANY', runtimeRole: 'PERSONEL' },
  PARENT: { type: 'PARENT', companyKind: null, runtimeRole: 'PARENT' },
  SUPER_ADMIN: { type: 'SUPER_ADMIN', companyKind: null, runtimeRole: 'SUPER_ADMIN' },
});

function candidateSchemaFor(manifestOrVersion) {
  const version = typeof manifestOrVersion === 'string' ? manifestOrVersion : manifestOrVersion?.schemaVersion;
  if (version === M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION) return CANDIDATE_SCHEMA_V2;
  return CANDIDATE_SCHEMA_V1;
}

function runtimeCatalogUser(role, tenantContext) {
  const contract = ROLE_TENANT_CONTRACT[role];
  if (!contract) return null;
  if (role === 'SCHOOL' || role === 'ORGANIZATION') {
    return { role: 'COMPANY', companyKind: role, companyId: 1 };
  }
  if (role === 'COMPANY') return { role: 'COMPANY', companyKind: tenantContext?.companyKind || 'COMPANY', companyId: 1 };
  if (role === 'ROOM') return { role: 'ROOM', roomId: 1 };
  if (role === 'DRIVER' || role === 'PERSONEL') return { role, companyId: 1 };
  if (role === 'PARENT') return { role: 'PARENT' };
  return { role: 'SUPER_ADMIN' };
}

export function validateExecutionContext(executionContext, { role, semanticScope } = {}) {
  const failures = [];
  if (!isPlainObject(executionContext)) return { safe: false, failureReasons: ['EXECUTION_CONTEXT_MISSING'], failures: [{ reason: 'EXECUTION_CONTEXT_MISSING' }] };
  const requiredKeys = ['source', 'role', 'tenantContext', 'screen', 'selectedEntity'];
  if (!exactKeysWithOptional(executionContext, requiredKeys, ['continuationStateSeed'])) addFailure(failures, 'EXECUTION_CONTEXT_SCHEMA_MISMATCH');
  if (executionContext.source !== 'AUTHORIZED_PRODUCT_CATALOG') addFailure(failures, 'EXECUTION_CONTEXT_SOURCE_INVALID');
  if (executionContext.role !== role) addFailure(failures, 'EXECUTION_CONTEXT_ROLE_MISMATCH');
  const roleContract = ROLE_TENANT_CONTRACT[role];
  if (!roleContract) addFailure(failures, 'EXECUTION_CONTEXT_ROLE_INVALID');

  const tenant = executionContext.tenantContext;
  if (!isPlainObject(tenant) || !exactKeys(tenant, ['type', 'companyKind'])) {
    addFailure(failures, 'TENANT_CONTEXT_SCHEMA_INVALID');
  } else if (roleContract && (tenant.type !== roleContract.type || tenant.companyKind !== roleContract.companyKind)) {
    addFailure(failures, 'TENANT_CONTEXT_ROLE_MISMATCH');
  }

  const screenMayBeNull = ['PRODUCT_AMBIGUOUS', 'OFF_TOPIC_GENUINE'].includes(semanticScope);
  const screen = executionContext.screen;
  if (screen === null) {
    if (!screenMayBeNull) addFailure(failures, 'EXECUTION_SCREEN_REQUIRED');
  } else if (!isPlainObject(screen) || !exactKeys(screen, ['id', 'path', 'label', 'role'])) {
    addFailure(failures, 'EXECUTION_SCREEN_SCHEMA_INVALID');
  } else {
    if (!Number.isInteger(screen.id) || screen.id <= 0) addFailure(failures, 'EXECUTION_SCREEN_ID_INVALID');
    if (!NON_EMPTY_STRING(screen.path) || !screen.path.startsWith('/')) addFailure(failures, 'EXECUTION_SCREEN_PATH_INVALID');
    if (!NON_EMPTY_STRING(screen.label)) addFailure(failures, 'EXECUTION_SCREEN_LABEL_INVALID');
    if (roleContract && screen.role !== roleContract.runtimeRole) addFailure(failures, 'EXECUTION_SCREEN_ROLE_INVALID');
    if (roleContract && isPlainObject(tenant)) {
      const user = runtimeCatalogUser(role, tenant);
      const allowed = user ? listScreensForUser(user) : [];
      const found = allowed.find((item) => item.id === screen.id && item.path === screen.path && item.label === screen.label);
      if (!found) addFailure(failures, 'EXECUTION_SCREEN_NOT_AUTHORIZED_OR_MISMATCHED');
    }
  }

  const selected = executionContext.selectedEntity;
  if (selected !== null && (!isPlainObject(selected) || !exactKeys(selected, ['type', 'id', 'tenantContextType']))) {
    addFailure(failures, 'SELECTED_ENTITY_SCHEMA_INVALID');
  } else if (isPlainObject(selected)) {
    if (!NON_EMPTY_STRING(selected.type)) addFailure(failures, 'SELECTED_ENTITY_TYPE_INVALID');
    else if (!isSupportedSelectedEntityType(selected.type)) addFailure(failures, 'SELECTED_ENTITY_TYPE_UNSUPPORTED');
    if (!Number.isInteger(selected.id) || selected.id <= 0) addFailure(failures, 'SELECTED_ENTITY_ID_INVALID');
    if (!isPlainObject(tenant) || selected.tenantContextType !== tenant.type) addFailure(failures, 'SELECTED_ENTITY_TENANT_MISMATCH');
  }
  if (Object.prototype.hasOwnProperty.call(executionContext, 'continuationStateSeed')) {
    const continuationValidation = validateExecutableContinuationState(executionContext.continuationStateSeed);
    failures.push(...continuationValidation.failures.map((reason) => ({ reason })));
  }
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase();
}

function hasOwn(value, key) {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTextOrStringArray(value) {
  return NON_EMPTY_STRING(value) || (Array.isArray(value) && value.length > 0 && value.every((item) => NON_EMPTY_STRING(item)));
}

function exactKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value).sort();
  const requiredKeys = [...expectedKeys].sort();
  return actualKeys.length === requiredKeys.length && actualKeys.every((key, index) => key === requiredKeys[index]);
}

function exactKeysWithOptional(value, requiredKeys, optionalKeys = []) {
  const actualKeys = Object.keys(value);
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  return requiredKeys.every((key) => actualKeys.includes(key)
    && actualKeys.every((key) => allowedKeys.has(key)));
}

function addFailure(failures, reason, details = undefined) {
  failures.push(details ? { reason, details } : { reason });
}

function validatePacketShape(packet) {
  const failures = [];
  if (!isPlainObject(packet)) return [{ reason: 'INCOMPLETE_CONTRACT_PACKET' }];
  if (!['M18-HOLDOUT-CONTRACT-PACKET-V1', M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION].includes(packet.schemaVersion)) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
  if (!NON_EMPTY_STRING(packet.packetId)) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
  if (!Number.isInteger(packet.expectedCaseCount) || packet.expectedCaseCount !== 56) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
  if (!Array.isArray(packet.requiredCanonicalFields) || !REQUIRED_CANONICAL_FIELDS.every((field) => packet.requiredCanonicalFields.includes(field))) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
  const projections = packet.canonicalProjections;
  const oos = projections?.genuineOos;
  const ambiguous = projections?.productAmbiguous;
  if (!isPlainObject(oos) || !isPlainObject(ambiguous)) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
  if (isPlainObject(oos)) {
    const required = {
      semanticScope: 'OFF_TOPIC_GENUINE',
      requestMode: 'GENUINE_OOS',
      semanticAction: 'NONE',
      action: 'NONE',
      object: null,
      reference: 'ABSENT',
      resolutionStatus: 'NOT_APPLICABLE',
      task: 'OFF_TOPIC',
      operation: 'GENERAL_INFORMATION'
    };
    for (const [key, expected] of Object.entries(required)) if (oos[key] !== expected) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
  }
  if (isPlainObject(ambiguous)) {
    const required = {
      semanticScope: 'PRODUCT_AMBIGUOUS',
      object: null,
      clarificationAction: 'NONE',
      clarificationResolutionStatus: 'UNRESOLVED',
      clarificationTask: packet.schemaVersion === M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION ? 'NONE' : 'CLARIFY',
      clarificationOperation: 'CLARIFY_SEMANTIC_REQUEST',
      unresolvedReference: 'UNRESOLVED'
    };
    for (const [key, expected] of Object.entries(required)) if (ambiguous[key] !== expected) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
    if (packet.schemaVersion === M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION) {
      if (ambiguous.clarificationAuthorizationClass !== 'NOT_APPLICABLE') addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
      if (!Array.isArray(ambiguous.knownActionRequestModes) || ambiguous.knownActionRequestModes.length === 0) addFailure(failures, 'INCOMPLETE_REFERENCE_ACTION_CONTRACT');
      if (Array.isArray(ambiguous.knownActionRequestModes) && ambiguous.knownActionRequestModes.some((value) => ['UNRESOLVED', 'GENUINE_OOS'].includes(value))) addFailure(failures, 'INVALID_REFERENCE_ACTION_CONTRACT');
    }
  }
  if (!Array.isArray(packet.allowedContractSourceClasses) || packet.allowedContractSourceClasses.length === 0) addFailure(failures, 'INCOMPLETE_CONTRACT_PACKET');
  if (packet.schemaVersion === M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION) {
    if (!isPlainObject(packet.authorizationContract) || !isPlainObject(packet.authorizationContract.classes)) addFailure(failures, 'INCOMPLETE_AUTHORIZATION_CONTRACT');
    if (!isPlainObject(packet.roleCapabilityMapping)) addFailure(failures, 'INCOMPLETE_ROLE_CAPABILITY_MAPPING');
    const classes = packet.authorizationContract?.classes || {};
    for (const requiredClass of ['SEMANTIC_CLARIFICATION', 'AUTHORIZATION_CONTEXT_CLARIFICATION', 'AUTHORIZED_OPERATION', 'AUTHORIZATION_DENIAL', 'NOT_APPLICABLE']) {
      if (!isPlainObject(classes[requiredClass]) || !NON_EMPTY_STRING(classes[requiredClass].meaning)) addFailure(failures, 'INCOMPLETE_AUTHORIZATION_CONTRACT');
    }
    for (const role of CANDIDATE_SCHEMA_V1.allowedRoles) if (!isPlainObject(packet.roleCapabilityMapping?.[role])) addFailure(failures, 'INCOMPLETE_ROLE_CAPABILITY_MAPPING');
    const oracle = packet.oracleContract;
    if (!isPlainObject(oracle) || oracle.productScopeReferenceAxesIndependent !== true) addFailure(failures, 'INCOMPLETE_ORACLE_CONTRACT');
    if (!isPlainObject(oracle?.explicitNamedSurface) || oracle.explicitNamedSurface.scope !== 'PRODUCT_EXPLICIT') addFailure(failures, 'INCOMPLETE_ORACLE_CONTRACT');
    if (!isPlainObject(oracle?.contextualDeicticSurface) || oracle.contextualDeicticSurface.requiresDeicticEvidence !== true) addFailure(failures, 'INCOMPLETE_ORACLE_CONTRACT');
    if (!isPlainObject(oracle?.explicitSurfaceWithDeicticSubreference) || oracle.explicitSurfaceWithDeicticSubreference.scope !== 'PRODUCT_EXPLICIT') addFailure(failures, 'INCOMPLETE_ORACLE_CONTRACT');
    const surfaceObject = oracle?.surfaceObject;
    if (!isPlainObject(surfaceObject)
      || surfaceObject.authority !== 'CANONICAL_SEMANTIC_ACTION_AND_OPERATION'
      || surfaceObject.namedSurfaceDoesNotImplyObject !== true
      || surfaceObject.screenContextDoesNotImplyObject !== true
      || surfaceObject.surfaceObjectRequiresCanonicalSurfaceTarget !== true
      || surfaceObject.surfaceOperationRequiresSurfaceObject !== true) {
      addFailure(failures, 'INCOMPLETE_SURFACE_OBJECT_CONTRACT');
    }
    if (!Array.isArray(oracle?.deicticMarkers) || oracle.deicticMarkers.length === 0) addFailure(failures, 'INCOMPLETE_ORACLE_CONTRACT');
    if (!Array.isArray(oracle?.temporalNonReferenceMarkers) || oracle.temporalNonReferenceMarkers.length === 0) addFailure(failures, 'INCOMPLETE_ORACLE_CONTRACT');
    for (const field of ['namedSurfaceAloneDoesNotCreateContextualReference', 'contextualReferenceRequiresDeicticEvidence', 'currentSurfaceDoesNotForceContextualScope', 'screenContextIsGroundingNotLexicalEvidence', 'runtimeContextCannotChangeLinguisticScopeOrReference', 'temporalModifierIsNotContextualReference', 'knownActionMayCoexistWithUnresolvedReference', 'unresolvedReferenceDoesNotRewriteRequestMode', 'unresolvedReferenceDoesNotForceTaskClarify', 'authorizationIsIndependentOfSemanticResolution', 'clarificationOperationDoesNotImplyAuthorizationClass']) {
      if (oracle?.rules?.[field] !== true) addFailure(failures, 'INCOMPLETE_ORACLE_CONTRACT');
    }
    const comparison = packet.comparisonContract;
    if (!isPlainObject(comparison) || comparison.version !== 'M18-CANONICAL-COMPARISON-CONTRACT-V1') addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    if (comparison?.textDrivenMappingCount !== 0 || comparison?.caseIdMappingCount !== 0) addFailure(failures, 'COMPARISON_CONTRACT_MAPPING_FORBIDDEN');
    for (const field of REQUIRED_CANONICAL_FIELDS.filter((name) => name !== 'contractSourceClass')) {
      if (!isPlainObject(comparison?.fields?.[field]) || comparison.fields[field].hardComparison !== true) addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    }
    if (!Array.isArray(comparison?.fields?.requestMode?.canonicalValues) || comparison.fields.requestMode.canonicalValues.length === 0) addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    if (!Array.isArray(comparison?.fields?.object?.canonicalValues) || !comparison.fields.object.canonicalValues.includes(null)) addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    if (!Array.isArray(comparison?.fields?.task?.canonicalValues) || comparison.fields.task.absentCanonicalValue !== 'NONE') addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    if (!Array.isArray(comparison?.fields?.operation?.canonicalValues) || comparison.fields.operation.canonicalValues.length === 0) addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    if (comparison?.fields?.authorizationClass?.comparisonField !== 'authorizationNativeStatus') addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    for (const rule of ['rawRuntimeLabelsAreNotExpectationVocabulary', 'legacyDirectIsNotCanonicalRequestMode', 'legacyCurrentSurfaceIsNotCanonicalObject', 'legacyScreenGuidanceIsNotCanonicalTask', 'absentTaskUsesNone', 'authorizationClassComparesThroughNativeStatus', 'knownActionMayCoexistWithUnresolvedReference', 'unresolvedReferenceDoesNotRewriteRequestMode', 'unresolvedReferenceDoesNotForceClarifyTask', 'semanticResolutionDoesNotDetermineAuthorizationClass', 'clarificationOperationDoesNotDetermineAuthorizationClass']) {
      if (comparison?.rules?.[rule] !== true) addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    }
  }
  return failures;
}

export function loadContractPacket(bytes) {
  const rawBytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const parsed = JSON.parse(rawBytes.toString('utf8'));
  const failures = validatePacketShape(parsed);
  if (failures.length > 0) throw new Error(`Invalid M18 contract packet: ${failures.map((failure) => failure.reason).join(',')}`);
  Object.defineProperty(parsed, '__m18PacketSha256', { value: sha256(rawBytes), enumerable: false, configurable: false });
  return parsed;
}

export function validateContractPacket(packet) {
  const failures = validatePacketShape(packet);
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
}

export function validateCandidateManifestSchema(manifest, { expectedCaseCount } = {}) {
  const failures = [];
  if (!isPlainObject(manifest)) {
    return { safe: false, failureReasons: ['CANDIDATE_MANIFEST_NOT_OBJECT'], failures: [{ reason: 'CANDIDATE_MANIFEST_NOT_OBJECT' }] };
  }
  const schema = candidateSchemaFor(manifest);
  const caseCount = expectedCaseCount ?? schema.expectedCaseCount;
  if (!exactKeys(manifest, schema.requiredTopLevelFields)) addFailure(failures, 'CANDIDATE_TOP_LEVEL_SCHEMA_MISMATCH');
  if (![M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION, M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION].includes(manifest.schemaVersion)) addFailure(failures, 'UNKNOWN_OR_MISSING_CANDIDATE_SCHEMA_VERSION');
  if (!NON_EMPTY_STRING(manifest.manifestId)) addFailure(failures, 'MANIFEST_ID_MISSING');
  if (manifest.status !== schema.manifestStatus) addFailure(failures, 'CANDIDATE_STATUS_INVALID');
  if (!Number.isInteger(manifest.caseCount) || manifest.caseCount !== caseCount) addFailure(failures, 'CASE_COUNT_METADATA_INVALID');
  if (!Array.isArray(manifest.cases) || manifest.cases.length !== caseCount) addFailure(failures, 'CASE_ARRAY_COUNT_MISMATCH');

  const roleCounts = new Map(schema.allowedRoles.map((role) => [role, 0]));
  const challengeByRole = new Map(schema.allowedRoles.map((role) => [role, new Set()]));
  const seenCaseIds = new Set();
  const candidateCases = Array.isArray(manifest.cases) ? manifest.cases : [];
  for (const [index, testCase] of candidateCases.entries()) {
    if (!isPlainObject(testCase)) {
      addFailure(failures, 'CASE_NOT_OBJECT', index);
      continue;
    }
    if (!exactKeys(testCase, schema.requiredCaseFields)) addFailure(failures, 'CASE_SCHEMA_MISMATCH', index);
    if (!NON_EMPTY_STRING(testCase.CASE_ID)) addFailure(failures, 'CASE_ID_MISSING', index);
    if (seenCaseIds.has(testCase.CASE_ID)) addFailure(failures, 'CASE_ID_DUPLICATE', testCase.CASE_ID);
    seenCaseIds.add(testCase.CASE_ID);
    if (!schema.allowedRoles.includes(testCase.ROLE)) addFailure(failures, 'ROLE_INVALID', index);
    else roleCounts.set(testCase.ROLE, roleCounts.get(testCase.ROLE) + 1);
    if (!schema.allowedChallengeClasses.includes(testCase.CHALLENGE_CLASS)) addFailure(failures, 'CHALLENGE_CLASS_INVALID', index);
    else if (schema.allowedRoles.includes(testCase.ROLE)) challengeByRole.get(testCase.ROLE).add(testCase.CHALLENGE_CLASS);
    if (!NON_EMPTY_STRING(testCase.TENANT_CONTEXT_TYPE)) addFailure(failures, 'TENANT_CONTEXT_TYPE_INVALID', index);
    if (!Number.isInteger(testCase.TURN_COUNT) || testCase.TURN_COUNT < 1 || testCase.TURN_COUNT > 3) addFailure(failures, 'TURN_COUNT_INVALID', index);
    if (!NON_EMPTY_STRING(testCase.TURN_1)) addFailure(failures, 'TURN_1_INVALID', index);
    for (const field of ['TURN_2', 'TURN_3']) if (testCase[field] !== null && !NON_EMPTY_STRING(testCase[field])) addFailure(failures, `${field}_INVALID`, index);
    for (const field of ['SURFACE_PRECONDITION', 'STATE_PRECONDITION', 'REFERENCE_PRECONDITION', 'EXPECTED_SEMANTIC_SCOPE', 'EXPECTED_REQUEST_MODE', 'EXPECTED_SEMANTIC_ACTION', 'EXPECTED_ACTION', 'EXPECTED_REFERENCE_CLASS', 'EXPECTED_RESOLUTION_STATUS', 'EXPECTED_TASK_OR_TASK_FAMILY', 'EXPECTED_OPERATION_OR_OPERATION_FAMILY', 'EXPECTED_AUTHORIZATION_CLASS']) {
      if (!NON_EMPTY_STRING(testCase[field])) addFailure(failures, `${field}_INVALID`, index);
    }
    if (testCase.EXPECTED_OBJECT !== null && !NON_EMPTY_STRING(testCase.EXPECTED_OBJECT)) addFailure(failures, 'EXPECTED_OBJECT_INVALID', index);
    if (!isTextOrStringArray(testCase.EXPECTED_USER_BEHAVIOR)) addFailure(failures, 'EXPECTED_USER_BEHAVIOR_INVALID', index);
    if (!isTextOrStringArray(testCase.PROHIBITED_OUTCOMES)) addFailure(failures, 'PROHIBITED_OUTCOMES_INVALID', index);
    if (!NON_EMPTY_STRING(testCase.CONTRACT_RATIONALE)) addFailure(failures, 'CONTRACT_RATIONALE_INVALID', index);
    if (!schema.allowedContractSourceClasses.includes(testCase.CONTRACT_SOURCE_CLASS)) addFailure(failures, 'CONTRACT_SOURCE_CLASS_INVALID', index);
    if (!schema.allowedSemanticScopes.includes(testCase.EXPECTED_SEMANTIC_SCOPE)) addFailure(failures, 'SEMANTIC_SCOPE_INVALID', index);
    if (!schema.allowedRequestModes.includes(testCase.EXPECTED_REQUEST_MODE)) addFailure(failures, 'REQUEST_MODE_INVALID', index);
    if (!schema.allowedActions.includes(testCase.EXPECTED_SEMANTIC_ACTION)) addFailure(failures, 'SEMANTIC_ACTION_INVALID', index);
    if (!schema.allowedActions.includes(testCase.EXPECTED_ACTION)) addFailure(failures, 'ACTION_INVALID', index);
    if (!schema.allowedReferenceClasses.includes(testCase.EXPECTED_REFERENCE_CLASS)) addFailure(failures, 'REFERENCE_CLASS_INVALID', index);
    if (!schema.allowedResolutionStatuses.includes(testCase.EXPECTED_RESOLUTION_STATUS)) addFailure(failures, 'RESOLUTION_STATUS_INVALID', index);
    if (manifest.schemaVersion === M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION) {
      const contextValidation = validateExecutionContext(testCase.EXECUTION_CONTEXT, {
        role: testCase.ROLE,
        semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE,
      });
      failures.push(...contextValidation.failures.map((failure) => ({ ...failure, caseId: testCase.CASE_ID })));
      if (testCase.EXPECTED_REQUEST_MODE === 'CONTINUE'
        && !Object.prototype.hasOwnProperty.call(testCase.EXECUTION_CONTEXT || {}, 'continuationStateSeed')) {
        addFailure(failures, 'CONTINUATION_EXECUTABLE_STATE_REQUIRED', testCase.CASE_ID);
      }
    }
    if (testCase.ROLE === 'ROOM' && testCase.EXPECTED_AUTHORIZATION_CLASS === 'ALLOW_BUYER_CREATE') addFailure(failures, 'ROOM_BUYER_CREATE_BOUNDARY_INVALID', index);
  }
  for (const [role, count] of roleCounts) if (count !== 7) addFailure(failures, 'ROLE_DISTRIBUTION_INVALID', { role, count });
  for (const [role, challenges] of challengeByRole) if (challenges.size !== schema.allowedChallengeClasses.length) addFailure(failures, 'ROLE_CHALLENGE_DISTRIBUTION_INVALID', { role, count: challenges.size });
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
}

// Static authoring validation is intentionally limited to manifest/schema and
// executable-context invariants.  Semantic expectation truth belongs to the
// independent current-runtime oracle and must never be masked by a second
// projection inside the static validator.
export function validateCandidateStaticSchema(manifest, { expectedCaseCount } = {}) {
  return validateCandidateManifestSchema(manifest, { expectedCaseCount });
}

export function validateCanonicalComparisonContract(expected, packet) {
  const failures = [];
  const comparison = packet?.comparisonContract;
  if (!isPlainObject(comparison?.fields)) {
    addFailure(failures, 'INCOMPLETE_COMPARISON_CONTRACT');
    return { safe: false, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
  }
  const requestModeValues = new Set(comparison.fields.requestMode?.canonicalValues || []);
  if (!requestModeValues.has(expected.requestMode)) addFailure(failures, 'NON_CANONICAL_REQUEST_MODE', expected.requestMode);
  const objectValues = comparison.fields.object?.canonicalValues || [];
  if (!objectValues.includes(expected.object)) addFailure(failures, 'NON_CANONICAL_OBJECT', expected.object);
  const taskValues = new Set(comparison.fields.task?.canonicalValues || []);
  if (!taskValues.has(expected.task)) addFailure(failures, 'NON_CANONICAL_TASK', expected.task);
  const operationValues = new Set(comparison.fields.operation?.canonicalValues || []);
  if (!operationValues.has(expected.operation)) addFailure(failures, 'NON_CANONICAL_OPERATION', expected.operation);
  if (expected.semanticScope === 'PRODUCT_AMBIGUOUS') {
    const projection = packet.canonicalProjections.productAmbiguous;
    const allowedModes = new Set([projection.requestMode, ...(projection.knownActionRequestModes || [])]);
    if (!allowedModes.has(expected.requestMode)) addFailure(failures, 'AMBIGUOUS_REQUEST_MODE_NOT_CANONICAL');
  }
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
}

export function validateExpectationContract(expected, packet) {
  const failures = [];
  const packetFailures = validatePacketShape(packet);
  if (packetFailures.length > 0) return { safe: false, failureReasons: ['INCOMPLETE_CONTRACT_PACKET'], failures: packetFailures };
  if (!isPlainObject(expected)) return { safe: false, failureReasons: ['EXPECTATION_NOT_OBJECT'], failures: [{ reason: 'EXPECTATION_NOT_OBJECT' }] };
  for (const field of REQUIRED_CANONICAL_FIELDS) if (!hasOwn(expected, field)) addFailure(failures, 'MISSING_EXPECTATION_FIELD', field);
  if (!packet.allowedContractSourceClasses.includes(expected.contractSourceClass)) addFailure(failures, 'INVALID_CONTRACT_SOURCE_CLASS');

  if (expected.semanticScope === 'OFF_TOPIC_GENUINE') {
    const projection = packet.canonicalProjections.genuineOos;
    for (const field of ['semanticScope', 'requestMode', 'semanticAction', 'action', 'object', 'reference', 'resolutionStatus', 'task', 'operation']) {
      if (expected[field] !== projection[field]) addFailure(failures, 'INVALID_GENUINE_OOS_PROJECTION', field);
    }
  }

  if (expected.semanticScope === 'PRODUCT_AMBIGUOUS') {
    const projection = packet.canonicalProjections.productAmbiguous;
    if (expected.object !== projection.object) addFailure(failures, 'AMBIGUOUS_OBJECT_MUST_BE_NULL');
    if (expected.action !== projection.clarificationAction) addFailure(failures, 'AMBIGUOUS_ACTION_MUST_BE_NONE');
    if (expected.resolutionStatus !== projection.clarificationResolutionStatus) addFailure(failures, 'AMBIGUOUS_RESOLUTION_MUST_BE_UNRESOLVED');
    if (expected.task !== projection.clarificationTask) addFailure(failures, 'AMBIGUOUS_TASK_MUST_BE_NONE');
    if (expected.operation !== projection.clarificationOperation) addFailure(failures, 'AMBIGUOUS_OPERATION_MUST_CLARIFY');
    if (packet.schemaVersion === M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION
      && expected.authorizationClass !== projection.clarificationAuthorizationClass) addFailure(failures, 'AMBIGUOUS_AUTHORIZATION_CLASS_MUST_BE_NOT_APPLICABLE');
    if (expected.reference !== projection.unresolvedReference && expected.reference !== 'ABSENT') addFailure(failures, 'AMBIGUOUS_REFERENCE_INVALID');
    if (expected.object === 'UNKNOWN') addFailure(failures, 'AMBIGUOUS_OBJECT_MUST_BE_NULL');
  }

  if (expected.reference === 'UNRESOLVED') {
    if (expected.resolutionStatus !== 'UNRESOLVED') addFailure(failures, 'UNRESOLVED_REFERENCE_REQUIRES_UNRESOLVED_RESOLUTION');
    if (expected.action !== 'NONE') addFailure(failures, 'UNRESOLVED_REFERENCE_REQUIRES_NONE_ACTION');
    if (expected.object !== null) addFailure(failures, 'UNRESOLVED_REFERENCE_OBJECT_MUST_BE_NULL');
  }
  if (expected.resolutionStatus === 'NOT_APPLICABLE' && expected.semanticScope !== 'OFF_TOPIC_GENUINE') addFailure(failures, 'NOT_APPLICABLE_REQUIRES_GENUINE_OOS');
  if (packet.schemaVersion === M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION) {
    const comparisonResult = validateCanonicalComparisonContract(expected, packet);
    failures.push(...comparisonResult.failures);
    validateAuthorizationExpectation(expected, packet, failures);
  }
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
}

function validateAuthorizationExpectation(expected, packet, failures) {
  const classes = packet.authorizationContract?.classes || {};
  const authorizationClass = expected.authorizationClass;
  if (!NON_EMPTY_STRING(authorizationClass)) {
    addFailure(failures, 'AUTHORIZATION_CLASS_MISSING');
    return;
  }
  const definition = classes[authorizationClass];
  if (!isPlainObject(definition)) {
    addFailure(failures, 'UNKNOWN_AUTHORIZATION_CLASS', authorizationClass);
    return;
  }
  if (definition.allowedForNewExpectation !== true) addFailure(failures, 'RETIRED_AUTHORIZATION_CLASS', authorizationClass);
  if (expected.semanticScope === 'OFF_TOPIC_GENUINE' && authorizationClass !== 'NOT_APPLICABLE') addFailure(failures, 'GENUINE_OOS_AUTHORIZATION_MUST_BE_NOT_APPLICABLE');
  if (expected.semanticScope === 'PRODUCT_AMBIGUOUS' && authorizationClass !== packet.canonicalProjections.productAmbiguous.clarificationAuthorizationClass) addFailure(failures, 'SEMANTIC_AMBIGUITY_CANNOT_BE_AUTHORIZATION_DECISION');
  if (expected.requestMode === 'CONTINUE' && ['CONTINUE', 'NEXT', 'PREVIOUS'].includes(expected.action)
    && expected.resolutionStatus === 'RESOLVED'
    && ['VALID_CONTEXTUAL_REFERENCE', 'VALID_UNIQUE'].includes(expected.reference)
    && ['SEMANTIC_CLARIFICATION', 'AUTHORIZATION_CONTEXT_CLARIFICATION', 'CLARIFICATION_REQUIRED'].includes(authorizationClass)) {
    addFailure(failures, 'RESOLVED_CONTINUATION_CANNOT_REQUIRE_CLARIFICATION');
  }
  if (expected.role === 'ORGANIZATION' && expected.requestMode === 'CONTINUE' && expected.action === 'NEXT'
    && expected.resolutionStatus === 'RESOLVED' && expected.reference === 'VALID_CONTEXTUAL_REFERENCE'
    && authorizationClass !== packet.roleCapabilityMapping.ORGANIZATION.continuationNextAuthorizationClass) {
    addFailure(failures, 'ORGANIZATION_CONTINUATION_AUTHORIZATION_CLASS_INVALID');
  }
  const roomCreateBoundaryGuidance = expected.role === 'ROOM'
    && expected.action === 'CREATE'
    && expected.operation === 'OPEN_EXISTING_SHIFT_OPERATIONS'
    && authorizationClass === 'ALLOW_GUIDANCE';
  if (expected.role === 'ROOM' && expected.action === 'CREATE' && expected.semanticScope !== 'PRODUCT_AMBIGUOUS'
    && !roomCreateBoundaryGuidance
    && authorizationClass !== 'UNAUTHORIZED_CREATE' && authorizationClass !== 'AUTHORIZATION_DENIAL') {
    addFailure(failures, 'ROOM_CREATE_MUST_BE_AUTHORIZATION_BOUNDARY');
  }
  if (expected.role === 'COMPANY' && expected.action === 'CREATE' && expected.semanticScope !== 'PRODUCT_AMBIGUOUS'
    && authorizationClass !== 'AUTHORIZED_PLANNING_INTENT') {
    addFailure(failures, 'COMPANY_CREATE_MUST_BE_PLANNING_INTENT');
  }
}

function normalizeTurkishText(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

function containsWord(text, marker) {
  const normalizedMarker = normalizeTurkishText(marker).trim();
  if (!normalizedMarker) return false;
  if (normalizedMarker.includes(' ')) return text.includes(normalizedMarker);
  return new RegExp(`(?:^|[^\\p{L}])${normalizedMarker}(?:$|[^\\p{L}])`, 'iu').test(text);
}

function caseTurnText(testCase) {
  return normalizeTurkishText([testCase.TURN_1, testCase.TURN_2, testCase.TURN_3].filter(Boolean).join(' '));
}

function isStateDependentContinuationCase(testCase) {
  return testCase.EXPECTED_REQUEST_MODE === 'CONTINUE'
    && testCase.EXPECTED_SEMANTIC_ACTION === 'CONTINUE'
    && testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY === 'CONTINUE_EXPLANATION'
    && testCase.EXPECTED_RESOLUTION_STATUS === 'RESOLVED'
    && Object.prototype.hasOwnProperty.call(testCase.EXECUTION_CONTEXT || {}, 'continuationStateSeed');
}

function hasCanonicalNamedSurface(testCase) {
  const tenantContext = testCase.EXECUTION_CONTEXT?.tenantContext;
  const user = runtimeCatalogUser(testCase.ROLE, tenantContext);
  const labels = user ? listScreensForUser(user).map((screen) => normalizeTurkishText(screen.label).trim()).filter((label) => label.length >= 4) : [];
  const text = caseTurnText(testCase);
  return [...new Set(labels)].sort((a, b) => b.length - a.length).some((label) => text.includes(label));
}

function hasTemporalNonReferenceEvidence(text, oracleContract) {
  return (oracleContract?.temporalNonReferenceMarkers || []).some((marker) => text.includes(normalizeTurkishText(marker)));
}

function hasDeicticReferenceEvidence(testCase, packet) {
  const text = caseTurnText(testCase);
  const oracleContract = packet.oracleContract;
  const temporal = hasTemporalNonReferenceEvidence(text, oracleContract);
  for (const marker of oracleContract?.deicticMarkers || []) {
    const normalizedMarker = normalizeTurkishText(marker);
    if (normalizedMarker === 'bu' || normalizedMarker === 'şu') {
      if (temporal && oracleContract.temporalNonReferenceMarkers.some((temporalMarker) => text.includes(normalizeTurkishText(temporalMarker)) && text.includes(`${normalizedMarker} `))) continue;
      if (containsWord(text, normalizedMarker)) return true;
      continue;
    }
    if (containsWord(text, normalizedMarker)) return true;
  }
  return false;
}

function canonicalSurfaceObjectProjection(testCase) {
  const executionContext = testCase.EXECUTION_CONTEXT || {};
  const tenantContext = executionContext.tenantContext;
  const user = runtimeCatalogUser(testCase.ROLE, tenantContext);
  const message = [testCase.TURN_1, testCase.TURN_2, testCase.TURN_3].filter(Boolean).join(' ');
  const result = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext: executionContext.screen || null,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  return {
    object: result.request?.semanticAction?.objectClass || null,
    operation: result.request?.operation || null,
  };
}

function validateSurfaceObjectAxes(testCase, packet) {
  const failures = [];
  const contract = packet?.oracleContract?.surfaceObject;
  if (!contract) return failures;
  const stateDependentContinuation = isStateDependentContinuationCase(testCase);
  if (stateDependentContinuation) return failures;
  const expectedObject = testCase.EXPECTED_OBJECT || null;
  const expectedOperation = testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY;
  const actual = canonicalSurfaceObjectProjection(testCase);

  if (contract.surfaceObjectRequiresCanonicalSurfaceTarget === true
    && expectedObject === 'SURFACE'
    && actual.object !== 'SURFACE') {
    addFailure(failures, 'SURFACE_OBJECT_NOT_SUPPORTED_BY_CANONICAL_SEMANTICS', {
      expectedObject,
      actualObject: actual.object,
      actualOperation: actual.operation,
    });
  }
  if (contract.surfaceOperationRequiresSurfaceObject === true
    && expectedOperation === 'EXPLAIN_CURRENT_SURFACE'
    && (expectedObject !== 'SURFACE' || actual.object !== 'SURFACE' || actual.operation !== 'EXPLAIN_CURRENT_SURFACE')) {
    addFailure(failures, 'SURFACE_OPERATION_NOT_SUPPORTED_BY_CANONICAL_SEMANTICS', {
      expectedObject,
      actualObject: actual.object,
      actualOperation: actual.operation,
    });
  }
  return failures;
}

export function validateOracleAxes(testCase, packet) {
  const failures = [];
  if (!isPlainObject(testCase) || !isPlainObject(packet?.oracleContract)) return { safe: false, failureReasons: ['INCOMPLETE_ORACLE_CONTRACT'], failures: [{ reason: 'INCOMPLETE_ORACLE_CONTRACT' }] };
  // A continuation is a stateful second turn. Its lexical surface/deictic
  // evidence must not be reconstructed by concatenating the setup turn with
  // the continuation utterance; the executable continuation seed is the
  // authoritative precondition for this axis.
  if (isStateDependentContinuationCase(testCase)) {
    return {
      safe: true,
      failureReasons: [],
      failures: [],
      evidence: { stateDependentContinuation: true, lexicalSurfaceReferenceChecks: 'NOT_APPLICABLE' },
    };
  }
  const text = caseTurnText(testCase);
  const namedSurface = hasCanonicalNamedSurface(testCase);
  const deicticReference = hasDeicticReferenceEvidence(testCase, packet);
  const temporalNonReference = hasTemporalNonReferenceEvidence(text, packet.oracleContract);
  const scope = testCase.EXPECTED_SEMANTIC_SCOPE;
  const reference = testCase.EXPECTED_REFERENCE_CLASS;
  const screen = testCase.EXECUTION_CONTEXT?.screen;

  if (namedSurface && !deicticReference && !temporalNonReference && scope === 'PRODUCT_CONTEXTUAL') addFailure(failures, 'EXPLICIT_SURFACE_MUST_BE_PRODUCT_EXPLICIT');
  if (namedSurface && !deicticReference && !temporalNonReference && reference === 'VALID_CONTEXTUAL_REFERENCE') addFailure(failures, 'NAMED_SURFACE_WITHOUT_DEICTIC_REFERENCE');
  if (!namedSurface && deicticReference && scope === 'PRODUCT_EXPLICIT') addFailure(failures, 'DEICTIC_SURFACE_CANNOT_BE_PRODUCT_EXPLICIT');
  if (deicticReference && !temporalNonReference && reference === 'ABSENT') addFailure(failures, 'DEICTIC_REFERENCE_CANNOT_BE_ABSENT');
  if (namedSurface && deicticReference && !temporalNonReference && scope === 'PRODUCT_CONTEXTUAL') addFailure(failures, 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_SCOPE_INVALID');
  if (namedSurface && deicticReference && !temporalNonReference && reference !== 'VALID_CONTEXTUAL_REFERENCE') addFailure(failures, 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_REFERENCE_INVALID');
  if (deicticReference && scope === 'PRODUCT_CONTEXTUAL' && testCase.EXPECTED_RESOLUTION_STATUS === 'RESOLVED' && screen === null) addFailure(failures, 'CONTEXTUAL_REFERENCE_REQUIRES_RESOLVABLE_SCREEN_CONTEXT');
  failures.push(...validateSurfaceObjectAxes(testCase, packet));
  failures.push(...validateActionReferenceAxes(testCase, packet));

  return {
    safe: failures.length === 0,
    failureReasons: [...new Set(failures.map((failure) => failure.reason))],
    failures,
    evidence: { namedSurface, deicticReference, temporalNonReference }
  };
}

function validateActionReferenceAxes(testCase, packet) {
  const failures = [];
  const projection = packet?.canonicalProjections?.productAmbiguous;
  if (!isPlainObject(projection)) return [{ reason: 'INCOMPLETE_REFERENCE_ACTION_CONTRACT' }];
  if (testCase.EXPECTED_REFERENCE_CLASS !== 'UNRESOLVED') return failures;
  const allowedModes = new Set([projection.requestMode, ...(projection.knownActionRequestModes || [])]);
  if (!allowedModes.has(testCase.EXPECTED_REQUEST_MODE)) addFailure(failures, 'UNRESOLVED_REFERENCE_REQUEST_MODE_INVALID');
  if (testCase.EXPECTED_ACTION !== projection.clarificationAction) addFailure(failures, 'UNRESOLVED_REFERENCE_ACTION_INVALID');
  if (testCase.EXPECTED_OBJECT !== projection.object) addFailure(failures, 'UNRESOLVED_REFERENCE_OBJECT_INVALID');
  if (testCase.EXPECTED_RESOLUTION_STATUS !== projection.clarificationResolutionStatus) addFailure(failures, 'UNRESOLVED_REFERENCE_RESOLUTION_INVALID');
  if (testCase.EXPECTED_TASK_OR_TASK_FAMILY !== projection.clarificationTask) addFailure(failures, 'UNRESOLVED_REFERENCE_TASK_INVALID');
  if (testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY !== projection.clarificationOperation) addFailure(failures, 'UNRESOLVED_REFERENCE_OPERATION_INVALID');
  if (testCase.EXPECTED_AUTHORIZATION_CLASS !== projection.clarificationAuthorizationClass) addFailure(failures, 'UNRESOLVED_REFERENCE_AUTHORIZATION_INVALID');
  return failures;
}

export function validateCandidateExpectations(manifest, packet) {
  const structuralValidation = validateCandidateManifestSchema(manifest, { expectedCaseCount: packet?.expectedCaseCount || CANDIDATE_SCHEMA_V1.expectedCaseCount });
  if (!structuralValidation.safe) {
    return {
      safe: false,
      failureReasons: ['CANDIDATE_MANIFEST_SCHEMA_INVALID', ...structuralValidation.failureReasons],
      failures: structuralValidation.failures
    };
  }
  const failures = [];
  const seen = new Set();
  for (const testCase of manifest.cases) {
    const caseId = testCase.CASE_ID;
    if (seen.has(caseId)) addFailure(failures, 'CASE_ID_DUPLICATE', caseId);
    seen.add(caseId);
    const expected = {
      semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE,
      requestMode: testCase.EXPECTED_REQUEST_MODE,
      semanticAction: testCase.EXPECTED_SEMANTIC_ACTION,
      action: testCase.EXPECTED_ACTION,
      object: testCase.EXPECTED_OBJECT,
      reference: testCase.EXPECTED_REFERENCE_CLASS,
      resolutionStatus: testCase.EXPECTED_RESOLUTION_STATUS,
      task: testCase.EXPECTED_TASK_OR_TASK_FAMILY,
      operation: testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY,
      authorizationClass: testCase.EXPECTED_AUTHORIZATION_CLASS,
      contractSourceClass: testCase.CONTRACT_SOURCE_CLASS,
      role: testCase.ROLE
    };
    const result = validateExpectationContract(expected, packet);
    failures.push(...result.failures.map((failure) => ({ ...failure, caseId })));
    if (packet.schemaVersion === M18_HOLDOUT_CONTRACT_PACKET_V2_SCHEMA_VERSION) {
      const oracleResult = validateOracleAxes(testCase, packet);
      failures.push(...oracleResult.failures.map((failure) => ({ ...failure, caseId })));
    }
  }
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
}

export function validateStructuredAudit(audit, { candidateManifestSha256, contractPacketSha256, expectedCaseCount = 56, expectedCandidateSchemaVersion = M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION } = {}) {
  const failures = [];
  if (!isPlainObject(audit)) return { safe: false, failureReasons: ['MISSING_STRUCTURED_AUDIT'], failures: [{ reason: 'MISSING_STRUCTURED_AUDIT' }] };
  if (audit.auditSchemaVersion !== 'M18-HOLDOUT-AUDIT-V1') addFailure(failures, 'INVALID_AUDIT_SCHEMA');
  if (audit.candidateSchemaVersion !== expectedCandidateSchemaVersion) addFailure(failures, 'INVALID_CANDIDATE_SCHEMA_VERSION');
  if (!HASH_PATTERN.test(String(candidateManifestSha256 || '').toUpperCase())) addFailure(failures, 'MISSING_CANDIDATE_MANIFEST_HASH');
  if (!HASH_PATTERN.test(String(contractPacketSha256 || '').toUpperCase())) addFailure(failures, 'MISSING_CONTRACT_PACKET_HASH');
  if (String(audit.candidateManifestSha256 || '').toUpperCase() !== String(candidateManifestSha256 || '').toUpperCase()) addFailure(failures, 'AUDIT_MANIFEST_HASH_MISMATCH');
  if (String(audit.contractPacketSha256 || '').toUpperCase() !== String(contractPacketSha256 || '').toUpperCase()) addFailure(failures, 'AUDIT_CONTRACT_PACKET_HASH_MISMATCH');
  if (!Number.isInteger(audit.caseCount) || audit.caseCount !== expectedCaseCount) addFailure(failures, 'AUDIT_CASE_COUNT_INVALID');
  if (!NON_EMPTY_STRING(audit.authorContextId)) addFailure(failures, 'MISSING_AUTHOR_CONTEXT_ID');
  if (!NON_EMPTY_STRING(audit.auditorContextId)) addFailure(failures, 'MISSING_AUDITOR_CONTEXT_ID');
  if (NON_EMPTY_STRING(audit.authorContextId) && NON_EMPTY_STRING(audit.auditorContextId) && audit.authorContextId === audit.auditorContextId) addFailure(failures, 'AUTHOR_AUDITOR_NOT_INDEPENDENT');
  for (const field of REQUIRED_AUDIT_COUNT_FIELDS) {
    if (!hasOwn(audit, field) || !Number.isInteger(audit[field]) || audit[field] < 0) addFailure(failures, 'MISSING_REQUIRED_AUDIT_COUNT', field);
  }
  if (expectedCandidateSchemaVersion === M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION) {
    for (const field of REQUIRED_V2_AUDIT_COUNT_FIELDS) {
      if (!hasOwn(audit, field) || !Number.isInteger(audit[field]) || audit[field] < 0) addFailure(failures, 'MISSING_REQUIRED_AUDIT_COUNT', field);
    }
  }
  if (audit.caseValidationComplete !== true) addFailure(failures, 'CASE_VALIDATION_INCOMPLETE');
  if (audit.auditComplete !== true) addFailure(failures, 'AUDIT_INCOMPLETE');
  if (!NON_EMPTY_STRING(audit.auditTimestamp)) addFailure(failures, 'MISSING_AUDIT_TIMESTAMP');
  return { safe: failures.length === 0, failureReasons: [...new Set(failures.map((failure) => failure.reason))], failures };
}

export function evaluateFreezeEligibility({ contractPacket, contractPacketSha256, candidateManifestSha256, candidateSchemaVersion = M18_HOLDOUT_CANDIDATE_SCHEMA_VERSION, audit } = {}) {
  const failures = [];
  if (!contractPacket) addFailure(failures, 'MISSING_CONTRACT_PACKET');
  const packetFailures = validatePacketShape(contractPacket);
  if (contractPacket && packetFailures.length > 0) failures.push(...packetFailures);
  if (contractPacket && !HASH_PATTERN.test(String(contractPacketSha256 || '').toUpperCase())) addFailure(failures, 'MISSING_CONTRACT_PACKET_HASH');
  if (contractPacket && !contractPacket.__m18PacketSha256) addFailure(failures, 'CONTRACT_PACKET_HASH_UNVERIFIABLE');
  if (contractPacket && contractPacket.__m18PacketSha256 && String(contractPacketSha256).toUpperCase() !== contractPacket.__m18PacketSha256) addFailure(failures, 'CONTRACT_PACKET_HASH_MISMATCH');
  if (!HASH_PATTERN.test(String(candidateManifestSha256 || '').toUpperCase())) addFailure(failures, 'MISSING_CANDIDATE_MANIFEST_HASH');
  const auditResult = validateStructuredAudit(audit, {
    candidateManifestSha256,
    contractPacketSha256,
    expectedCaseCount: contractPacket?.expectedCaseCount || 56,
    expectedCandidateSchemaVersion: candidateSchemaVersion,
  });
  failures.push(...auditResult.failures);
  for (const field of REQUIRED_AUDIT_COUNT_FIELDS) {
    if (audit && audit[field] === 0) continue;
    if (audit && Number.isInteger(audit[field]) && audit[field] > 0) addFailure(failures, `NONZERO_${toConstantName(field)}`);
  }
  if (candidateSchemaVersion === M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION) {
    for (const field of REQUIRED_V2_AUDIT_COUNT_FIELDS) {
      if (audit && audit[field] === 0) continue;
      if (audit && Number.isInteger(audit[field]) && audit[field] > 0) addFailure(failures, `NONZERO_${toConstantName(field)}`);
    }
  }
  const failureReasons = [...new Set(failures.map((failure) => failure.reason))];
  return { safe: failureReasons.length === 0, freezeEligible: failureReasons.length === 0, failureReasons, failures };
}

export function freezeManifestIfEligible({ manifestBytes, contractPacketBytes, audit } = {}) {
  if (!Buffer.isBuffer(manifestBytes) && !(manifestBytes instanceof Uint8Array)) {
    return { safe: false, freezeEligible: false, written: false, failureReasons: ['MISSING_CANDIDATE_MANIFEST_BYTES'] };
  }
  if (!Buffer.isBuffer(contractPacketBytes) && !(contractPacketBytes instanceof Uint8Array)) {
    return { safe: false, freezeEligible: false, written: false, failureReasons: ['MISSING_CONTRACT_PACKET_BYTES'] };
  }
  const manifestBuffer = Buffer.from(manifestBytes);
  const packetBuffer = Buffer.from(contractPacketBytes);
  let contractPacket;
  try {
    contractPacket = loadContractPacket(packetBuffer);
  } catch (error) {
    return { safe: false, freezeEligible: false, written: false, failureReasons: ['INCOMPLETE_CONTRACT_PACKET'], errorMessage: error.message };
  }
  let manifest;
  try {
    manifest = JSON.parse(manifestBuffer.toString('utf8'));
  } catch {
    return { safe: false, freezeEligible: false, written: false, failureReasons: ['CANDIDATE_MANIFEST_NOT_JSON'] };
  }
  if (!isPlainObject(manifest)) return { safe: false, freezeEligible: false, written: false, failureReasons: ['CANDIDATE_MANIFEST_NOT_OBJECT'] };
  const candidateValidation = validateCandidateExpectations(manifest, contractPacket);
  if (!candidateValidation.safe) {
    return {
      safe: false,
      freezeEligible: false,
      written: false,
      failureReasons: ['CANDIDATE_EXPECTATION_SCHEMA_INVALID', ...candidateValidation.failureReasons],
      candidateValidation
    };
  }
  const gate = evaluateFreezeEligibility({
    contractPacket,
    contractPacketSha256: sha256(packetBuffer),
    candidateManifestSha256: sha256(manifestBuffer),
    candidateSchemaVersion: manifest.schemaVersion,
    audit
  });
  if (!gate.safe) return { ...gate, written: false };
  const frozenManifest = {
    ...manifest,
    status: 'FROZEN_NOT_EXECUTED',
    freezeEligibility: 'GREEN',
    contractPacketSha256: sha256(packetBuffer),
    candidateManifestSha256: sha256(manifestBuffer)
  };
  return {
    ...gate,
    written: true,
    frozenManifest,
    frozenBytes: Buffer.from(JSON.stringify(frozenManifest, null, 2) + '\n', 'utf8')
  };
}
