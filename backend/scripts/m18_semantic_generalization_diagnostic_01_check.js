import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = path.join(REPO_ROOT, "backend", "artifacts", "harness-topology", "m18-typed-semantic-evidence-independent-diagnostic-20261001.json");
const EXPOSED_CORPUS_PATH = path.join(REPO_ROOT, "backend", "artifacts", "harness-topology", "m18-role-help-architecture-diagnostic-20261001.json");
const EXPOSED_RESULTS_PATH = path.join(REPO_ROOT, "backend", "artifacts", "harness-topology", "m18-role-help-architecture-diagnostic-20261001-results.json");
const EXPOSED_REPORT_PATH = path.join(REPO_ROOT, "backend", "artifacts", "harness-topology", "m18-role-help-architecture-diagnostic-20261001-report.json");
const EXPECTED_EXPOSED_HASHES = Object.freeze({
  corpus: "0400ED06D4596518CCAB60782D0FA0DD7370FA312141E48C750F9A6033664247",
  results: "B1F72572CC653C55A78AD9DC08EE257CE03AA936076306FF090DB44D727AB749",
  report: "F63F0A86E12A85B755C56BDF575FACD0DB8B9AA42C8CA8FCFE13E4E0C98FCBB6",
});
const ROLES = Object.freeze(["COMPANY", "ROOM", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT", "SUPER_ADMIN"]);
const CONCEPT_FAMILIES = Object.freeze([
  "capability", "responsibility", "boundary", "purpose", "orientation", "ownership", "limitation",
  "decision_responsibility", "starting_guidance",
]);
const EXPECTED_MANIFEST_COUNTS = Object.freeze({ caseCount: 112, positiveRoleHelpCount: 80, negativeControlCount: 32 });
const QUALITY_LEVELS = Object.freeze(["HIGH", "MEDIUM", "LOW"]);
const SUPPORT_VALUES = Object.freeze(["SUPPORT", "CONTRADICTION"]);
const EVIDENCE_COMPLETENESS = Object.freeze(["COMPLETE", "PARTIAL"]);
const PROVENANCE_SOURCE_CLASSES = Object.freeze(["RAW_TEXT", "MORPHOLOGY", "STRUCTURE", "AUTH_CONTEXT", "SURFACE_CONTEXT", "ACTIVE_TASK", "REFERENCE_HISTORY", "INFERENCE"]);
const CANONICAL_OBJECT_CLASSES = Object.freeze(["SHIFT", "AGREEMENT", "OFFER", "ROUTE", "PERSONNEL", "SURFACE", "RECORD"]);
const REQUIRED_COUNTER_FIELDS = Object.freeze([
  "businessWriteExecution", "draftCreation", "offerSend", "dispatchExecution", "financialWrite",
  "authorizationMutation", "downstreamBusinessWrite", "externalLlmProviderCount",
  "externalLlmNetworkCallCount", "llmApiSecretCount",
]);
const REQUIRED_CANONICAL_FIELDS = Object.freeze([
  "version", "semanticScope", "semanticScopeEvidence", "action", "object", "operation", "capability", "resolution",
  "authorization", "groundingRequirement", "ambiguity", "responseFamily", "conversationRoute", "workflow", "clarification",
  "roleHelpIntent", "generalProductHelpIntent", "explicitTaskIntent", "targetCandidate", "authority",
]);
const REQUIRED_THRESHOLD_FIELDS = Object.freeze([
  "overallRoleHelpRecall", "eachRoleRecall", "eachConceptFamilyRecall", "precision", "falsePositiveRate",
  "clearRoleHelpAmbiguityRate", "crossRoleRecallSpread", "actionDistinction", "authorization", "tenant", "grounding",
  "businessWrites", "externalAi", "executionErrors",
]);
const REQUIRED_SAFETY_GATE_FIELDS = Object.freeze(["fabricatedTargetControls", "businessWrites", "externalAi", "executionErrors"]);

const sha256File = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
const text = (value) => String(value ?? "");
const finiteNumber = (value) => typeof value === "number" && Number.isFinite(value);

function loadJson(filePath) {
  assert.equal(fs.existsSync(filePath), true, `REQUIRED_ARTIFACT_MISSING ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateManifest(manifest) {
  assert.ok(manifest && typeof manifest === "object" && !Array.isArray(manifest), "DIAGNOSTIC_MANIFEST_SCHEMA_INVALID");
  assert.equal(manifest.contract, "SEFER-ABI-CANONICAL-REQUEST-V3", "DIAGNOSTIC_CONTRACT_MISMATCH");
  assert.equal(manifest.epoch, "M18-ARCH-EPOCH-SEFER-ABI-SEMANTIC-ACTION-V1", "DIAGNOSTIC_EPOCH_MISMATCH");
  assert.equal(manifest.authoredContractFirst, true, "DIAGNOSTIC_AUTHORING_CONTRACT_FIRST_REQUIRED");
  assert.equal(manifest.implementationCueSourceUsedForAuthoring, false, "DIAGNOSTIC_AUTHORING_ISOLATION_FAILED");
  assert.equal(manifest.priorCorpusReuseForbidden, true, "DIAGNOSTIC_PRIOR_CORPUS_REUSE_MUST_BE_FORBIDDEN");
  assert.ok(Array.isArray(manifest.cases), "DIAGNOSTIC_CASES_REQUIRED");
  assert.equal(manifest.cases.length, EXPECTED_MANIFEST_COUNTS.caseCount, "DIAGNOSTIC_CASE_COUNT_EXACT_REQUIRED");
  const positive = manifest.cases.filter((item) => item?.EXPECTED_ROLE_HELP === true);
  const negative = manifest.cases.filter((item) => item?.EXPECTED_ROLE_HELP === false);
  assert.equal(positive.length, EXPECTED_MANIFEST_COUNTS.positiveRoleHelpCount, "DIAGNOSTIC_POSITIVE_CASE_COUNT_EXACT_REQUIRED");
  assert.equal(negative.length, EXPECTED_MANIFEST_COUNTS.negativeControlCount, "DIAGNOSTIC_NEGATIVE_CASE_COUNT_EXACT_REQUIRED");
  assert.equal(manifest.caseCount, EXPECTED_MANIFEST_COUNTS.caseCount, "DIAGNOSTIC_DECLARED_CASE_COUNT_EXACT_REQUIRED");
  assert.equal(manifest.roleCaseCount, EXPECTED_MANIFEST_COUNTS.positiveRoleHelpCount, "DIAGNOSTIC_DECLARED_POSITIVE_COUNT_EXACT_REQUIRED");
  assert.equal(manifest.negativeControlCount, EXPECTED_MANIFEST_COUNTS.negativeControlCount, "DIAGNOSTIC_DECLARED_NEGATIVE_COUNT_EXACT_REQUIRED");
  assert.ok(negative.length >= 30, "DIAGNOSTIC_NEGATIVE_CONTROLS_MINIMUM_NOT_MET");
  assert.deepEqual([...new Set(positive.map((item) => item.ROLE))].sort(), [...ROLES].sort(), "DIAGNOSTIC_ALL_ROLES_REQUIRED");
  assert.deepEqual([...new Set(positive.map((item) => item.EXPECTED_CONCEPT_FAMILY))].sort(), [...CONCEPT_FAMILIES].sort(), "DIAGNOSTIC_ALL_CONCEPT_FAMILIES_REQUIRED");
  for (const item of manifest.cases) {
    assert.ok(text(item?.CASE_ID).length > 0, "DIAGNOSTIC_CASE_ID_REQUIRED");
    assert.ok(ROLES.includes(item?.ROLE), `DIAGNOSTIC_ROLE_INVALID ${item?.CASE_ID}`);
    assert.ok(item?.PRECONDITION && typeof item.PRECONDITION === "object", `DIAGNOSTIC_PRESTATE_REQUIRED ${item?.CASE_ID}`);
    for (const key of ["route", "surface", "foreground", "activeTask"]) {
      assert.equal(typeof item.PRECONDITION[key], "string", `DIAGNOSTIC_PRESTATE_${key.toUpperCase()}_REQUIRED ${item?.CASE_ID}`);
      assert.ok(item.PRECONDITION[key].trim().length > 0, `DIAGNOSTIC_PRESTATE_${key.toUpperCase()}_EMPTY ${item?.CASE_ID}`);
    }
    assert.ok(text(item?.UTTERANCE).trim().length > 0, `DIAGNOSTIC_UTTERANCE_REQUIRED ${item?.CASE_ID}`);
    assert.ok(text(item?.EXPECTED_CONCEPT_FAMILY).trim().length > 0, `DIAGNOSTIC_CONCEPT_FAMILY_REQUIRED ${item?.CASE_ID}`);
    assert.equal(typeof item?.EXPECTED_ROLE_HELP, "boolean", `DIAGNOSTIC_EXPECTED_ROLE_HELP_REQUIRED ${item?.CASE_ID}`);
    assert.ok(text(item?.CONTEXT_RELATION).length > 0, `DIAGNOSTIC_CONTEXT_RELATION_REQUIRED ${item?.CASE_ID}`);
  }
  return { positive, negative };
}

function userFor(role) {
  return { id: 994003, role, companyId: role === "COMPANY" ? 1 : null, roomId: role === "ROOM" ? 1 : null, schoolId: role === "SCHOOL" ? 1 : null, organizationId: role === "ORGANIZATION" ? 1 : null, sessionVersion: 1 };
}

function prestateFor(item) {
  const source = item.PRECONDITION || {};
  return { route: source.route, surface: source.surface, foreground: source.foreground, activeTask: source.activeTask };
}

function screenFor(item, state) {
  return { path: state.route, label: state.surface, role: item.ROLE, companyKind: item.ROLE === "COMPANY" ? "COMPANY" : "", uiHints: { foregroundSurface: { key: state.foreground, kind: state.foreground } } };
}

function conversationFor(item, state) {
  return { recentMessages: item.CONTEXT_RELATION === "CONTINUATION" ? [{ role: "user", content: "Önceki açıklamayı sürdürelim." }] : [], activeGuidedTask: state.activeTask !== "NONE" ? { taskId: `diagnostic-${item.CASE_ID}`, workflowIntent: state.activeTask, semanticPlan: { workflowIntent: state.activeTask, requestedDomains: state.activeTask === "CREATE_SHIFT" ? ["SHIFTS"] : [] } } : null };
}

function assertPrestateExact(item, state, conversationState) {
  for (const key of ["route", "surface", "foreground", "activeTask"]) assert.equal(state[key], item.PRECONDITION[key], `DIAGNOSTIC_PRESTATE_${key.toUpperCase()}_MISMATCH ${item.CASE_ID}`);
  const guidedTask = conversationState?.activeGuidedTask || null;
  if (item.PRECONDITION.activeTask === "NONE") {
    assert.equal(guidedTask, null, `DIAGNOSTIC_PRESTATE_ACTIVE_TASK_MISMATCH ${item.CASE_ID}`);
    return;
  }
  assert.ok(guidedTask && typeof guidedTask === "object", `DIAGNOSTIC_PRESTATE_ACTIVE_TASK_MISSING ${item.CASE_ID}`);
  assert.equal(guidedTask.workflowIntent, item.PRECONDITION.activeTask, `DIAGNOSTIC_PRESTATE_ACTIVE_TASK_MISMATCH ${item.CASE_ID}`);
  assert.equal(guidedTask.semanticPlan?.workflowIntent, item.PRECONDITION.activeTask, `DIAGNOSTIC_PRESTATE_ACTIVE_TASK_PLAN_MISMATCH ${item.CASE_ID}`);
}

function actualCanonicalFields(canonical, foundation) {
  const request = canonical?.request || {};
  const action = request.semanticAction || {};
  const typedEvidence = request.typedEvidence || {};
  const plan = foundation?.semanticPlan || {};
  const auth = plan.authorizationDecision?.status || foundation?.authorizationBoundary?.status || null;
  return {
    version: request.version || null, semanticScope: request.semanticScope?.class || null, semanticScopeEvidence: request.semanticScope?.evidence || null,
    action: action.actionClass || null, object: action.objectClass ?? null, operation: request.operation || null, capability: request.capability || null,
    resolution: action.resolutionStatus || null, authorization: auth, groundingRequirement: request.groundingRequirement || null,
    ambiguity: request.ambiguity?.status || null, responseFamily: foundation?.family || plan.family || null,
    conversationRoute: foundation?.conversationRoute || plan.conversationRoute || null, workflow: plan.workflowIntent || null, clarification: plan.clarificationNeed || null,
    roleHelpIntent: canonical?.canonicalShape?.roleHelpIntent === true, generalProductHelpIntent: canonical?.canonicalShape?.generalProductHelpIntent === true,
    explicitTaskIntent: canonical?.canonicalShape?.explicitTaskIntent === true, targetCandidate: action.targetCandidate || null,
    subject: typedEvidence.subject?.value ?? typedEvidence.subject ?? null,
    requestMode: typedEvidence.requestMode?.value ?? typedEvidence.requestMode ?? null,
    roleAspect: typedEvidence.roleAspect?.value ?? typedEvidence.roleAspect ?? null,
    productHelpStatus: typedEvidence.productHelp?.value ?? typedEvidence.productHelp ?? null,
    targetRequest: typedEvidence.targetRequest?.value ?? typedEvidence.targetRequest ?? null,
    reference: typedEvidence.reference?.value ?? typedEvidence.reference ?? null,
    explicitness: action.explicitness || request.currentRequest?.explicitness || null,
    authority: canonical?.diagnostics?.semanticAuthority || null,
  };
}

function isRoleHelpLike(actual) {
  return actual.roleHelpIntent || (actual.semanticScope === "PRODUCT_EXPLICIT" && actual.action === "EXPLAIN" && actual.object === "SURFACE" && actual.operation === "GENERAL_INFORMATION" && actual.resolution === "RESOLVED");
}

function isRoleHelpCorrect(actual) {
  const nullableRoleHelpObject = actual.object === null || actual.object === "SURFACE";
  const hasTypedRoleSubject = actual.subject === "ROLE";
  const hasTypedRoleAspect = typeof actual.roleAspect === "string" && actual.roleAspect !== "NONE";
  const hasProductHelpEvidence = typeof actual.productHelpStatus === "string" && actual.productHelpStatus !== "NONE";
  // `roleHelpIntent` is a legacy-shaped projection and is intentionally false
  // for surface-grounded role help.  The typed evidence and canonical action
  // are the authoritative comparison contract for both global and situated
  // role guidance.
  const canonicalRoleGuidanceOperation = ["GENERAL_INFORMATION", "EXPLAIN_CURRENT_SURFACE"].includes(actual.operation);
  const canonicalRoleGuidanceCapability = ["GENERAL_INFORMATION", "SCREEN_CONTEXT"].includes(actual.capability);
  const structuralRoleHelp = actual.semanticScope === "PRODUCT_EXPLICIT"
    && actual.action === "EXPLAIN"
    && nullableRoleHelpObject
    && canonicalRoleGuidanceOperation
    && canonicalRoleGuidanceCapability && actual.resolution === "RESOLVED" && actual.authorization === "ALLOW"
    && actual.groundingRequirement === "CURRENT_AUTHORIZED_RUNTIME"
    && hasTypedRoleSubject && hasTypedRoleAspect && hasProductHelpEvidence
    && actual.requestMode === "EXPLAIN" && actual.targetRequest === "PRODUCT_AREA";
  return structuralRoleHelp;
}

function isAmbiguous(actual) {
  return actual.semanticScope === "UNRESOLVED" || actual.semanticScope === "PRODUCT_AMBIGUOUS" || actual.resolution === "UNRESOLVED" || actual.ambiguity === "UNRESOLVED";
}

function createSafetyGuard() {
  const evidence = Object.fromEntries(REQUIRED_COUNTER_FIELDS.map((field) => [field, { observed: false, value: null, source: "RUNTIME_GUARD" }]));
  const counters = { evidence, prismaGuardInstalled: false, providerGuardInstalled: true, networkGuardInstalled: false, blockedBusinessMutationAttempts: 0, blockedMutationNames: [], observationEvents: [] };
  const observe = (field, value, observation = "RUNTIME_GUARD_EVENT") => {
    assert.ok(evidence[field], `UNKNOWN_RUNTIME_COUNTER ${field}`);
    const numericValue = value;
    assert.ok(Number.isFinite(numericValue) && numericValue >= 0, `MALFORMED_RUNTIME_COUNTER ${field}`);
    const previous = evidence[field].observed ? Number(evidence[field].value) : 0;
    evidence[field] = { observed: true, value: previous + numericValue, source: "RUNTIME_GUARD", observation };
    counters.observationEvents.push({ field, delta: numericValue, observation });
  };
  const observeBaseline = () => {
    for (const field of REQUIRED_COUNTER_FIELDS) if (!evidence[field].observed) observe(field, 0, "RUNTIME_GUARD_BOUNDARY");
  };
  const failWrite = (name) => { counters.blockedBusinessMutationAttempts += 1; counters.blockedMutationNames.push(name); throw new Error(`M18_RUNTIME_WRITE_GUARD_BLOCKED:${name}`); };
  return { counters, observe, observeBaseline, failWrite };
}

function guardPrisma(prisma, guard) {
  if (!prisma || prisma.__m18T12Guarded) return;
  const mutationMethods = ["create", "createMany", "createManyAndReturn", "delete", "deleteMany", "update", "updateMany", "updateManyAndReturn", "upsert"];
  for (const modelName of Object.keys(prisma)) {
    if (modelName.startsWith("_") || modelName.startsWith("$")) continue;
    const delegate = prisma[modelName];
    if (!delegate || typeof delegate !== "object") continue;
    for (const method of mutationMethods) if (typeof delegate[method] === "function") delegate[method] = () => guard.failWrite(`${modelName}.${method}`);
  }
  for (const method of ["$executeRaw", "$executeRawUnsafe", "$runCommandRaw", "$transaction"]) if (typeof prisma[method] === "function") prisma[method] = () => guard.failWrite(method);
  prisma.__m18T12Guarded = true;
  guard.counters.prismaGuardInstalled = true;
}

function validateRuntimeCounters(counters) {
  assert.ok(counters && typeof counters === "object" && !Array.isArray(counters), "RUNTIME_COUNTERS_REQUIRED");
  for (const key of ["prismaGuardInstalled", "providerGuardInstalled", "networkGuardInstalled"]) assert.equal(typeof counters[key], "boolean", `RUNTIME_${key.toUpperCase()}_MALFORMED`);
  assert.ok(Number.isInteger(counters.blockedBusinessMutationAttempts) && counters.blockedBusinessMutationAttempts >= 0, "RUNTIME_BLOCKED_MUTATION_COUNT_MALFORMED");
  assert.ok(Array.isArray(counters.blockedMutationNames), "RUNTIME_BLOCKED_MUTATION_NAMES_MALFORMED");
  assert.ok(Array.isArray(counters.observationEvents), "RUNTIME_OBSERVATION_EVENTS_MALFORMED");
  assert.equal(counters?.prismaGuardInstalled, true, "RUNTIME_PRISMA_GUARD_NOT_INSTALLED");
  assert.equal(counters?.providerGuardInstalled, true, "RUNTIME_PROVIDER_GUARD_NOT_INSTALLED");
  assert.equal(counters?.networkGuardInstalled, true, "RUNTIME_NETWORK_GUARD_NOT_INSTALLED");
  for (const field of REQUIRED_COUNTER_FIELDS) {
    const item = counters?.evidence?.[field];
    assert.ok(item && typeof item === "object" && !Array.isArray(item), `${field} runtime evidence malformed`);
    assert.equal(item?.observed, true, `${field} runtime observation missing`);
    assert.ok(finiteNumber(item?.value), `${field} runtime value malformed`);
    assert.equal(item?.source, "RUNTIME_GUARD", `${field} runtime source malformed`);
    assert.equal(typeof item?.observation, "string", `${field} runtime observation label malformed`);
  }
}

function classifySafety(row) {
  const expected = row.caseData;
  const actual = row.actualCanonicalFields || {};
  return {
    actionDistinction: expected.NEGATIVE_KIND?.includes("ACTION") ? (actual.action === "EXPLAIN" ? 1 : 0) : 0,
    authorization: expected.NEGATIVE_KIND === "AUTHORIZATION" ? (actual.authorization === "DENY" || actual.resolution === "UNRESOLVED" ? 0 : 1) : 0,
    tenant: expected.TENANT_NEGATIVE === true ? (actual.authorization === "DENY" || actual.resolution === "UNRESOLVED" ? 0 : 1) : 0,
    grounding: expected.EXPECTED_ROLE_HELP === true && actual.groundingRequirement !== "CURRENT_AUTHORIZED_RUNTIME" ? 1 : 0,
    fabricatedTarget: row.groundingContradiction === true ? 1 : 0,
  };
}

function assertEnum(value, allowed, label) {
  assert.ok(allowed.includes(value), `${label}_INVALID`);
}

function assertTypedText(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  assert.equal(typeof value, "string", `${label}_MALFORMED`);
  assert.ok(value.length > 0, `${label}_EMPTY`);
}

function validateFeatureToken(feature, label) {
  assert.ok(feature && typeof feature === "object" && !Array.isArray(feature), `${label}_OBJECT_REQUIRED`);
  for (const key of ["featureKind", "value", "normalizationForm", "producer", "supportOrContradiction", "quality", "sourceSpan"]) assert.ok(Object.hasOwn(feature, key), `${label}_${key}_REQUIRED`);
  assert.equal(typeof feature.featureKind, "string", `${label}_FEATURE_KIND_MALFORMED`);
  assert.equal(typeof feature.value, "string", `${label}_VALUE_MALFORMED`);
  assert.equal(feature.normalizationForm, "TURKISH_LOWERCASE_NFC", `${label}_NORMALIZATION_MALFORMED`);
  assert.equal(feature.producer, "deterministic-turkish-feature-producer", `${label}_PRODUCER_MALFORMED`);
  assertEnum(feature.supportOrContradiction, SUPPORT_VALUES, `${label}_SUPPORT`);
  assertEnum(feature.quality, QUALITY_LEVELS, `${label}_QUALITY`);
  assert.ok(feature.sourceSpan && typeof feature.sourceSpan === "object" && !Array.isArray(feature.sourceSpan), `${label}_SOURCE_SPAN_REQUIRED`);
  assert.ok(Number.isInteger(feature.sourceSpan.start) && feature.sourceSpan.start >= 0, `${label}_SOURCE_SPAN_START_MALFORMED`);
  assert.ok(Number.isInteger(feature.sourceSpan.end) && feature.sourceSpan.end >= feature.sourceSpan.start, `${label}_SOURCE_SPAN_END_MALFORMED`);
}

function validateEvidenceFeatures(evidenceFeatures, caseId) {
  assert.ok(evidenceFeatures && typeof evidenceFeatures === "object" && !Array.isArray(evidenceFeatures), `DIAGNOSTIC_RESULT_EVIDENCE_OBJECT_REQUIRED ${caseId}`);
  for (const key of ["normalizedText", "tokenCount", "recognizedFeatureCount", "question", "polarity", "relations", "structure", "quality"]) assert.ok(Object.hasOwn(evidenceFeatures, key), `DIAGNOSTIC_RESULT_EVIDENCE_FIELD_MISSING ${key} ${caseId}`);
  assert.equal(typeof evidenceFeatures.normalizedText, "string", `DIAGNOSTIC_RESULT_EVIDENCE_NORMALIZED_TEXT_MALFORMED ${caseId}`);
  assert.ok(Number.isInteger(evidenceFeatures.tokenCount) && evidenceFeatures.tokenCount >= 0, `DIAGNOSTIC_RESULT_EVIDENCE_TOKEN_COUNT_MALFORMED ${caseId}`);
  assert.ok(Number.isInteger(evidenceFeatures.recognizedFeatureCount) && evidenceFeatures.recognizedFeatureCount >= 0, `DIAGNOSTIC_RESULT_EVIDENCE_RECOGNIZED_COUNT_MALFORMED ${caseId}`);
  assert.ok(evidenceFeatures.question && typeof evidenceFeatures.question === "object", `DIAGNOSTIC_RESULT_EVIDENCE_QUESTION_REQUIRED ${caseId}`);
  assert.equal(typeof evidenceFeatures.question.isQuestion, "boolean", `DIAGNOSTIC_RESULT_EVIDENCE_QUESTION_FLAG_MALFORMED ${caseId}`);
  assert.ok(Array.isArray(evidenceFeatures.question.markers), `DIAGNOSTIC_RESULT_EVIDENCE_QUESTION_MARKERS_MALFORMED ${caseId}`);
  assertTypedText(evidenceFeatures.question.form, `DIAGNOSTIC_RESULT_EVIDENCE_QUESTION_FORM`);
  for (const [index, marker] of evidenceFeatures.question.markers.entries()) validateFeatureToken(marker, `DIAGNOSTIC_RESULT_EVIDENCE_QUESTION_MARKER_${index}`);
  for (const group of ["polarity", "relations", "structure"]) assert.ok(evidenceFeatures[group] && typeof evidenceFeatures[group] === "object", `DIAGNOSTIC_RESULT_EVIDENCE_${group.toUpperCase()}_REQUIRED ${caseId}`);
  for (const key of ["negation", "modality"]) { assert.ok(Array.isArray(evidenceFeatures.polarity[key]), `DIAGNOSTIC_RESULT_EVIDENCE_POLARITY_${key.toUpperCase()}_MALFORMED ${caseId}`); for (const [index, item] of evidenceFeatures.polarity[key].entries()) validateFeatureToken(item, `DIAGNOSTIC_RESULT_EVIDENCE_POLARITY_${key}_${index}`); }
  for (const key of ["actorObject", "ownership", "process", "local"]) { assert.ok(Array.isArray(evidenceFeatures.relations[key]), `DIAGNOSTIC_RESULT_EVIDENCE_RELATIONS_${key.toUpperCase()}_MALFORMED ${caseId}`); for (const [index, item] of evidenceFeatures.relations[key].entries()) validateFeatureToken(item, `DIAGNOSTIC_RESULT_EVIDENCE_RELATIONS_${key}_${index}`); }
  assert.ok(Array.isArray(evidenceFeatures.structure.local), `DIAGNOSTIC_RESULT_EVIDENCE_STRUCTURE_LOCAL_MALFORMED ${caseId}`);
  for (const [index, item] of evidenceFeatures.structure.local.entries()) validateFeatureToken(item, `DIAGNOSTIC_RESULT_EVIDENCE_STRUCTURE_LOCAL_${index}`);
  const quality = evidenceFeatures.quality;
  assert.ok(quality && typeof quality === "object", `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_REQUIRED ${caseId}`);
  assertEnum(quality.overall, QUALITY_LEVELS, `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_OVERALL`);
  assert.equal(typeof quality.partial, "boolean", `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_PARTIAL_MALFORMED ${caseId}`);
  assert.equal(typeof quality.bounded, "boolean", `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_BOUNDED_MALFORMED ${caseId}`);
  assert.ok(Number.isInteger(quality.recognizedFeatureCount) && quality.recognizedFeatureCount >= 0, `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_COUNT_MALFORMED ${caseId}`);
}

function validateProvenance(provenance, caseId) {
  assert.ok(provenance && typeof provenance === "object" && !Array.isArray(provenance), `DIAGNOSTIC_RESULT_PROVENANCE_REQUIRED ${caseId}`);
  assert.equal(provenance.producer, "deterministic-turkish-feature-producer", `DIAGNOSTIC_RESULT_PRODUCER_INVALID ${caseId}`);
  assert.ok(Array.isArray(provenance.evidence) && provenance.evidence.length > 0, `DIAGNOSTIC_RESULT_PROVENANCE_EMPTY ${caseId}`);
  for (const [index, item] of provenance.evidence.entries()) {
    assert.ok(item && typeof item === "object" && !Array.isArray(item), `DIAGNOSTIC_RESULT_PROVENANCE_EVIDENCE_${index}_MALFORMED ${caseId}`);
    assertTypedText(item.dimension, `DIAGNOSTIC_RESULT_PROVENANCE_DIMENSION`);
    assertEnum(item.source, PROVENANCE_SOURCE_CLASSES, `DIAGNOSTIC_RESULT_PROVENANCE_SOURCE`);
    assertEnum(item.quality, QUALITY_LEVELS, `DIAGNOSTIC_RESULT_PROVENANCE_QUALITY`);
    assert.equal(item.authorizationEffect, "NONE", `DIAGNOSTIC_RESULT_PROVENANCE_AUTHORIZATION_EFFECT ${caseId}`);
    if (Object.hasOwn(item, "contextRef")) assert.equal(typeof item.contextRef, "string", `DIAGNOSTIC_RESULT_PROVENANCE_CONTEXT_REF_MALFORMED ${caseId}`);
  }
  const quality = provenance.evidenceQuality;
  assert.ok(quality && typeof quality === "object" && !Array.isArray(quality), `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_REQUIRED ${caseId}`);
  for (const key of ["value", "confidence", "completeness", "evidenceCount", "roleHelpCandidate", "authorizationEffect"]) assert.ok(Object.hasOwn(quality, key), `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_FIELD_MISSING ${key} ${caseId}`);
  assertEnum(quality.value, QUALITY_LEVELS, "DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_VALUE");
  assertEnum(quality.confidence, QUALITY_LEVELS, "DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_CONFIDENCE");
  assertEnum(quality.completeness, EVIDENCE_COMPLETENESS, "DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_COMPLETENESS");
  assert.ok(Number.isInteger(quality.evidenceCount) && quality.evidenceCount >= 0, `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_COUNT_MALFORMED ${caseId}`);
  assert.equal(typeof quality.roleHelpCandidate, "boolean", `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_ROLE_HELP_MALFORMED ${caseId}`);
  assert.equal(quality.authorizationEffect, "NONE", `DIAGNOSTIC_RESULT_EVIDENCE_QUALITY_AUTHORIZATION_EFFECT ${caseId}`);
  const canonical = provenance.canonical;
  assert.ok(canonical && typeof canonical === "object" && !Array.isArray(canonical), `DIAGNOSTIC_RESULT_CANONICAL_PROVENANCE_REQUIRED ${caseId}`);
  assert.equal(canonical.interpreter, "TYPED_SEMANTIC_EVIDENCE", `DIAGNOSTIC_RESULT_CANONICAL_INTERPRETER_INVALID ${caseId}`);
  assert.equal(canonical.interpreterMode, "DETERMINISTIC", `DIAGNOSTIC_RESULT_CANONICAL_MODE_INVALID ${caseId}`);
  assert.equal(canonical.source, "semanticEvidenceComposer.composeSemanticEvidence", `DIAGNOSTIC_RESULT_CANONICAL_SOURCE_INVALID ${caseId}`);
  assert.equal(typeof canonical.createdAt, "string", `DIAGNOSTIC_RESULT_CANONICAL_TIMESTAMP_MALFORMED ${caseId}`);
  assert.ok(Number.isFinite(Date.parse(canonical.createdAt)), `DIAGNOSTIC_RESULT_CANONICAL_TIMESTAMP_INVALID ${caseId}`);
}

function validateCanonicalFields(canonical, caseId) {
  assert.equal(canonical.version, "SEFER-ABI-CANONICAL-REQUEST-V3", `DIAGNOSTIC_RESULT_CANONICAL_VERSION_INVALID ${caseId}`);
  for (const key of ["semanticScope", "semanticScopeEvidence", "action", "operation", "capability", "resolution", "authorization", "groundingRequirement", "ambiguity", "responseFamily", "conversationRoute", "workflow", "clarification"]) assertTypedText(canonical[key], `DIAGNOSTIC_RESULT_CANONICAL_${key.toUpperCase()}`, { nullable: true });
  assertEnum(canonical.object, [...CANONICAL_OBJECT_CLASSES, null], `DIAGNOSTIC_RESULT_CANONICAL_OBJECT`);
  for (const key of ["roleHelpIntent", "generalProductHelpIntent", "explicitTaskIntent"]) assert.equal(typeof canonical[key], "boolean", `DIAGNOSTIC_RESULT_CANONICAL_${key.toUpperCase()}_MALFORMED ${caseId}`);
  if (canonical.targetCandidate !== null) {
    assert.ok(canonical.targetCandidate && typeof canonical.targetCandidate === "object" && !Array.isArray(canonical.targetCandidate), `DIAGNOSTIC_RESULT_CANONICAL_TARGET_MALFORMED ${caseId}`);
    assertEnum(canonical.targetCandidate.objectClass, CANONICAL_OBJECT_CLASSES, `DIAGNOSTIC_RESULT_CANONICAL_TARGET_CLASS`);
  }
  const authority = canonical.authority;
  assert.ok(authority && typeof authority === "object" && !Array.isArray(authority), `DIAGNOSTIC_RESULT_AUTHORITY_REQUIRED ${caseId}`);
  assert.equal(authority.mode, "NEW", `DIAGNOSTIC_RESULT_AUTHORITY_MODE_MALFORMED ${caseId}`);
  assert.equal(authority.authoritativePath, "NEW_TYPED_EVIDENCE", `DIAGNOSTIC_RESULT_AUTHORITY_PATH_MALFORMED ${caseId}`);
  for (const [key, expected] of [["oldAuthorityInvocationCount", 0], ["newAuthorityInvocationCount", 1], ["PER_REQUEST_SEMANTIC_AUTHORITY_COUNT", 1], ["RUNTIME_SEMANTIC_FALLBACK_COUNT", 0], ["SHADOW_SEMANTIC_AUTHORITY_COUNT", 0], ["DUAL_SEMANTIC_AUTHORITY_COUNT", 0], ["DOWNSTREAM_SEMANTIC_REDECISION_COUNT", 0]]) assert.equal(authority[key], expected, `DIAGNOSTIC_RESULT_AUTHORITY_${key}_MALFORMED ${caseId}`);
  assert.ok(authority.trace && typeof authority.trace === "object", `DIAGNOSTIC_RESULT_AUTHORITY_TRACE_REQUIRED ${caseId}`);
  assert.equal(authority.trace.mode, "NEW", `DIAGNOSTIC_RESULT_AUTHORITY_TRACE_MODE_INVALID ${caseId}`);
  assert.equal(authority.trace.selectedAuthority, "NEW_TYPED_EVIDENCE", `DIAGNOSTIC_RESULT_AUTHORITY_TRACE_PATH_INVALID ${caseId}`);
  assert.ok(Array.isArray(authority.trace.events) && authority.trace.events.length > 0, `DIAGNOSTIC_RESULT_AUTHORITY_TRACE_EVENTS_REQUIRED ${caseId}`);
  for (const event of authority.trace.events) { assert.equal(event.path, "NEW_TYPED_EVIDENCE", `DIAGNOSTIC_RESULT_AUTHORITY_EVENT_PATH_INVALID ${caseId}`); assert.equal(event.role, "AUTHORITY", `DIAGNOSTIC_RESULT_AUTHORITY_EVENT_ROLE_INVALID ${caseId}`); }
  assert.ok(Array.isArray(authority.trace.fallbackAttempts), `DIAGNOSTIC_RESULT_AUTHORITY_FALLBACK_TRACE_MALFORMED ${caseId}`);
  assert.ok(Array.isArray(authority.trace.downstreamRedecisions), `DIAGNOSTIC_RESULT_AUTHORITY_REDECISION_TRACE_MALFORMED ${caseId}`);
}

function validateRow(row) {
  assert.notEqual(row.executionError, true, `DIAGNOSTIC_RESULT_EXECUTION_ERROR_ROW_REJECTED ${row.caseId}`);
  assert.ok(text(row.caseId), "DIAGNOSTIC_RESULT_CASE_ID_REQUIRED");
  assert.ok(ROLES.includes(row.role), `DIAGNOSTIC_RESULT_ROLE_INVALID ${row.caseId}`);
  assert.ok(text(row.utterance), `DIAGNOSTIC_RESULT_UTTERANCE_REQUIRED ${row.caseId}`);
  assert.ok(text(row.expectedConceptFamily), `DIAGNOSTIC_RESULT_CONCEPT_FAMILY_REQUIRED ${row.caseId}`);
  assert.ok(row.prestate && typeof row.prestate === "object", `DIAGNOSTIC_RESULT_PRESTATE_REQUIRED ${row.caseId}`);
  assert.ok(row.actualCanonicalFields && typeof row.actualCanonicalFields === "object", `DIAGNOSTIC_RESULT_CANONICAL_FIELDS_REQUIRED ${row.caseId}`);
  for (const key of REQUIRED_CANONICAL_FIELDS) assert.ok(Object.hasOwn(row.actualCanonicalFields, key), `DIAGNOSTIC_RESULT_CANONICAL_FIELD_MISSING ${key} ${row.caseId}`);
  validateCanonicalFields(row.actualCanonicalFields, row.caseId);
  validateEvidenceFeatures(row.evidenceFeatures, row.caseId);
  validateProvenance(row.extractionProvenance, row.caseId);
  assert.ok(row.clarification && typeof row.clarification === "object", `DIAGNOSTIC_RESULT_CLARIFICATION_REQUIRED ${row.caseId}`);
  for (const key of ["need", "ambiguity", "resolution"]) assert.ok(Object.hasOwn(row.clarification, key), `DIAGNOSTIC_RESULT_CLARIFICATION_FIELD_MISSING ${key} ${row.caseId}`);
  assert.ok(text(row.responseFamily), `DIAGNOSTIC_RESULT_RESPONSE_FAMILY_REQUIRED ${row.caseId}`);
  validateRuntimeCounters(row.safetyCounters);
  for (const key of ["manifestId", "corpusHash", "caseId", "authorityMode", "canonicalAuthority"]) assert.ok(Object.hasOwn(row.sourceIdentity || {}, key), `DIAGNOSTIC_RESULT_SOURCE_IDENTITY_MISSING ${key} ${row.caseId}`);
  assert.equal(typeof row.sourceIdentity.manifestId, "string", `DIAGNOSTIC_RESULT_SOURCE_MANIFEST_ID_MALFORMED ${row.caseId}`);
  assert.match(row.sourceIdentity.corpusHash, /^[A-F0-9]{64}$/u, `DIAGNOSTIC_RESULT_SOURCE_CORPUS_HASH_MALFORMED ${row.caseId}`);
  assert.equal(row.sourceIdentity.caseId, row.caseId, `DIAGNOSTIC_RESULT_SOURCE_CASE_ID_MISMATCH ${row.caseId}`);
  assert.equal(row.sourceIdentity?.authorityMode, "NEW", `DIAGNOSTIC_RESULT_AUTHORITY_MODE_REQUIRED ${row.caseId}`);
  assert.ok(row.sourceIdentity.canonicalAuthority && typeof row.sourceIdentity.canonicalAuthority === "object", `DIAGNOSTIC_RESULT_SOURCE_AUTHORITY_REQUIRED ${row.caseId}`);
  assert.equal(row.sourceIdentity.canonicalAuthority.mode, row.actualCanonicalFields.authority.mode, `DIAGNOSTIC_RESULT_SOURCE_AUTHORITY_MODE_MISMATCH ${row.caseId}`);
  assert.equal(row.sourceIdentity.canonicalAuthority.authoritativePath, row.actualCanonicalFields.authority.authoritativePath, `DIAGNOSTIC_RESULT_SOURCE_AUTHORITY_PATH_MISMATCH ${row.caseId}`);
  assert.equal(typeof row.groundingContradiction, "boolean", `DIAGNOSTIC_RESULT_GROUNDING_CONTRADICTION_FLAG_REQUIRED ${row.caseId}`);
  const fabricatedTarget = row.expectedRoleHelp === false && row.actualCanonicalFields.targetCandidate !== null;
  assert.equal(row.groundingContradiction, fabricatedTarget, `DIAGNOSTIC_RESULT_GROUNDING_CONTROL_CONTRADICTION ${row.caseId}`);
}

function countsBy(rows, key) {
  const output = {};
  for (const row of rows) {
    const value = row[key] || "UNKNOWN";
    output[value] ||= { total: 0, correct: 0, falseNegative: 0, ambiguity: 0 };
    output[value].total += 1;
    if (row.roleHelpCorrect) output[value].correct += 1;
    if (!row.roleHelpCorrect) output[value].falseNegative += 1;
    if (row.ambiguous) output[value].ambiguity += 1;
  }
  return output;
}

function observedSafetyFixture(overrides = {}) {
  const evidence = Object.fromEntries(REQUIRED_COUNTER_FIELDS.map((field) => [field, { observed: true, value: 0, source: "RUNTIME_GUARD", observation: "TEST_FIXTURE" }]));
  for (const [field, value] of Object.entries(overrides)) evidence[field] = { observed: true, value, source: "RUNTIME_GUARD", observation: "TEST_FIXTURE" };
  return { evidence, prismaGuardInstalled: true, providerGuardInstalled: true, networkGuardInstalled: true, blockedBusinessMutationAttempts: 0, blockedMutationNames: [], observationEvents: [] };
}

function thresholdPassFixture() {
  return {
    authorityMode: "NEW",
    thresholds: Object.fromEntries(REQUIRED_THRESHOLD_FIELDS.map((name) => [name, { measured: 0, pass: true }])),
    safetyGates: Object.fromEntries(REQUIRED_SAFETY_GATE_FIELDS.map((name) => [name, { measured: 0, pass: true }])),
    safetyCounters: observedSafetyFixture(),
  };
}

function validRowFixture() {
  return {
    caseId: "FIXTURE", role: "COMPANY", utterance: "fixture", expectedConceptFamily: "capability", expectedRoleHelp: true, caseData: { EXPECTED_ROLE_HELP: true }, prestate: { route: "/company", surface: "PLANNING_CENTER", foreground: "PLANNING_CENTER", activeTask: "NONE" },
    actualCanonicalFields: { version: "SEFER-ABI-CANONICAL-REQUEST-V3", semanticScope: "PRODUCT_EXPLICIT", semanticScopeEvidence: "TYPED_SEMANTIC_ROLE_HELP", action: "EXPLAIN", object: "SURFACE", operation: "GENERAL_INFORMATION", capability: "GENERAL_INFORMATION", resolution: "RESOLVED", authorization: "ALLOW", groundingRequirement: "CURRENT_AUTHORIZED_RUNTIME", ambiguity: "NONE", responseFamily: "GENERIC_PRODUCT_HELP", conversationRoute: "GENERIC_PRODUCT_HELP", workflow: null, clarification: null, roleHelpIntent: true, generalProductHelpIntent: true, explicitTaskIntent: true, targetCandidate: { objectClass: "SURFACE" }, authority: { mode: "NEW", authoritativePath: "NEW_TYPED_EVIDENCE", oldAuthorityInvocationCount: 0, newAuthorityInvocationCount: 1, PER_REQUEST_SEMANTIC_AUTHORITY_COUNT: 1, RUNTIME_SEMANTIC_FALLBACK_COUNT: 0, SHADOW_SEMANTIC_AUTHORITY_COUNT: 0, DUAL_SEMANTIC_AUTHORITY_COUNT: 0, DOWNSTREAM_SEMANTIC_REDECISION_COUNT: 0, trace: { mode: "NEW", selectedAuthority: "NEW_TYPED_EVIDENCE", events: [{ path: "NEW_TYPED_EVIDENCE", role: "AUTHORITY" }], fallbackAttempts: [], downstreamRedecisions: [] } } },
    evidenceFeatures: { normalizedText: "fixture", tokenCount: 1, recognizedFeatureCount: 1, question: { isQuestion: false, markers: [], form: "NONE" }, polarity: { negation: [], modality: [] }, relations: { actorObject: [], ownership: [], process: [], local: [] }, structure: { local: [] }, quality: { overall: "HIGH", partial: false, bounded: true, recognizedFeatureCount: 1 } },
    extractionProvenance: { producer: "deterministic-turkish-feature-producer", evidence: [{ dimension: "subject", source: "AUTH_CONTEXT", quality: "HIGH", authorizationEffect: "NONE" }], evidenceQuality: { value: "HIGH", confidence: "HIGH", completeness: "COMPLETE", evidenceCount: 1, roleHelpCandidate: true, authorizationEffect: "NONE" }, canonical: { interpreter: "TYPED_SEMANTIC_EVIDENCE", interpreterMode: "DETERMINISTIC", source: "semanticEvidenceComposer.composeSemanticEvidence", createdAt: new Date().toISOString() } }, evidenceStatus: "OBSERVED", clarification: { need: null, ambiguity: "NONE", resolution: "RESOLVED" }, responseFamily: "GENERIC_PRODUCT_HELP", safetyCounters: observedSafetyFixture(), sourceIdentity: { manifestId: "fixture", corpusHash: "A".repeat(64), caseId: "FIXTURE", authorityMode: "NEW", canonicalAuthority: { mode: "NEW", authoritativePath: "NEW_TYPED_EVIDENCE" } }, groundingContradiction: false,
  };
}

function runtimeCounterValue(counters, field) {
  const item = counters?.evidence?.[field];
  assert.equal(item?.observed, true, `${field} runtime observation missing`);
  assert.ok(finiteNumber(item?.value), `${field} runtime value malformed`);
  assert.equal(item?.source, "RUNTIME_GUARD", `${field} runtime source malformed`);
  return item.value;
}

function calculateMetrics(rows, manifest, authorityMode, corpusHash, exposedEvidence, safetyCounters) {
  const positives = rows.filter((row) => row.expectedRoleHelp);
  const negatives = rows.filter((row) => !row.expectedRoleHelp);
  const correct = positives.filter((row) => row.roleHelpCorrect).length;
  const falsePositives = negatives.filter((row) => row.roleHelpLike).length;
  const predicted = correct + falsePositives;
  const roleRecall = Object.fromEntries(ROLES.map((role) => { const roleRows = positives.filter((row) => row.role === role); return [role, roleRows.length ? roleRows.filter((row) => row.roleHelpCorrect).length / roleRows.length : 0]; }));
  const familyRecall = Object.fromEntries(CONCEPT_FAMILIES.map((family) => { const familyRows = positives.filter((row) => row.expectedConceptFamily === family); return [family, familyRows.length ? familyRows.filter((row) => row.roleHelpCorrect).length / familyRows.length : 0]; }));
  const roleValues = Object.values(roleRecall);
  const safetyFailures = rows.reduce((acc, row) => { const current = classifySafety(row); for (const [key, value] of Object.entries(current)) acc[key] += value; return acc; }, { actionDistinction: 0, authorization: 0, tenant: 0, grounding: 0, fabricatedTarget: 0 });
  const recall = positives.length ? correct / positives.length : 0;
  const precision = predicted ? correct / predicted : 0;
  const fpr = negatives.length ? falsePositives / negatives.length : 0;
  const ambiguity = positives.length ? positives.filter((row) => row.ambiguous).length / positives.length : 0;
  const executionErrors = rows.filter((row) => row.executionError === true).length;
  const spread = roleValues.length ? Math.max(...roleValues) - Math.min(...roleValues) : 0;
  const writeValues = Object.fromEntries(["businessWriteExecution", "draftCreation", "offerSend", "dispatchExecution", "financialWrite", "authorizationMutation", "downstreamBusinessWrite"].map((field) => [field, runtimeCounterValue(safetyCounters, field)]));
  const externalAiValues = Object.fromEntries(["externalLlmProviderCount", "externalLlmNetworkCallCount", "llmApiSecretCount"].map((field) => [field, runtimeCounterValue(safetyCounters, field)]));
  const writePass = Object.values(writeValues).every((value) => value === 0);
  const externalAiPass = Object.values(externalAiValues).every((value) => value === 0);
  const thresholds = {
    overallRoleHelpRecall: { measured: recall, minimum: 0.95, pass: recall >= 0.95 },
    eachRoleRecall: { measured: roleRecall, minimum: 0.9, pass: Object.values(roleRecall).every((value) => value >= 0.9) },
    eachConceptFamilyRecall: { measured: familyRecall, minimum: 0.9, pass: Object.values(familyRecall).every((value) => value >= 0.9) },
    precision: { measured: precision, minimum: 0.99, pass: precision >= 0.99 },
    falsePositiveRate: { measured: fpr, maximum: 0.01, pass: fpr <= 0.01 },
    clearRoleHelpAmbiguityRate: { measured: ambiguity, maximum: 0.03, pass: ambiguity <= 0.03 },
    crossRoleRecallSpread: { measured: spread, maximum: 0.1, pass: spread <= 0.1 },
    actionDistinction: { failures: safetyFailures.actionDistinction, pass: safetyFailures.actionDistinction === 0 },
    authorization: { failures: safetyFailures.authorization, pass: safetyFailures.authorization === 0 },
    tenant: { failures: safetyFailures.tenant, pass: safetyFailures.tenant === 0 },
    grounding: { failures: safetyFailures.grounding + safetyFailures.fabricatedTarget, pass: safetyFailures.grounding === 0 && safetyFailures.fabricatedTarget === 0 },
    businessWrites: { values: writeValues, pass: writePass }, externalAi: { values: externalAiValues, pass: externalAiPass },
    executionErrors: { measured: executionErrors, maximum: 0, pass: executionErrors === 0 },
  };
  const safetyGates = {
    fabricatedTargetControls: { failures: safetyFailures.fabricatedTarget, cases: rows.filter((row) => row.groundingContradiction === true).map((row) => row.caseId), pass: safetyFailures.fabricatedTarget === 0 },
    businessWrites: { values: writeValues, pass: writePass },
    externalAi: { values: externalAiValues, pass: externalAiPass },
    executionErrors: { measured: executionErrors, maximum: 0, pass: executionErrors === 0 },
  };
  const roleHelpThresholdNames = ["overallRoleHelpRecall", "eachRoleRecall", "eachConceptFamilyRecall", "precision", "falsePositiveRate", "clearRoleHelpAmbiguityRate", "crossRoleRecallSpread"];
  const roleHelpThresholdFailures = roleHelpThresholdNames.filter((name) => thresholds[name].pass !== true);
  const safetyGateFailures = Object.entries(safetyGates).filter(([, gate]) => gate.pass !== true).map(([name]) => name);
  const fabricatedTargetCases = rows.filter((row) => row.groundingContradiction === true).map((row) => row.caseId);
  const failureClassification = safetyGateFailures.length === 0
    ? (roleHelpThresholdFailures.length === 0 ? "PASS" : "ROLE_HELP_THRESHOLD_FAILURE_ONLY")
    : "SAFETY_OR_INTEGRITY_GATE_FAILURE";
  const { cases: _exposedCases, ...exposedEvidenceSummary } = exposedEvidence;
  return {
    manifestId: manifest.manifestId, corpusHash, caseCount: rows.length, positiveRoleHelpCount: positives.length, negativeControlCount: negatives.length, executionErrors,
    correctRoleHelpCount: correct, falseNegativeCount: positives.length - correct, falsePositiveCount: falsePositives, ambiguityCount: positives.filter((row) => row.ambiguous).length,
    overallRoleHelpRecall: recall, precision, falsePositiveRate: fpr, clearRoleHelpAmbiguityRate: ambiguity, roleRecall, conceptFamilyRecall: familyRecall, crossRoleRecallSpread: spread,
    safetyRegressionFailures: safetyFailures,
    thresholds, safetyGates, roleHelpThresholdFailures, safetyGateFailures, fabricatedTargetCases, failureClassification,
    authorityMode, exposedRegressionEvidence: exposedEvidenceSummary, generatedAt: new Date().toISOString(),
  };
}

function validateThresholdEntry(name, entry) {
  assert.ok(entry && typeof entry === "object" && !Array.isArray(entry), `THRESHOLD_${name}_MALFORMED`);
  assert.equal(typeof entry.pass, "boolean", `THRESHOLD_${name}_PASS_MALFORMED`);
  const observedKeys = ["measured", "failures", "values"].filter((key) => Object.hasOwn(entry, key));
  assert.ok(observedKeys.length > 0, `THRESHOLD_${name}_OBSERVATION_MISSING`);
  if (Object.hasOwn(entry, "measured")) {
    if (entry.measured && typeof entry.measured === "object" && !Array.isArray(entry.measured)) {
      for (const value of Object.values(entry.measured)) assert.ok(finiteNumber(value), `THRESHOLD_${name}_MEASURED_VALUE_MALFORMED`);
    } else assert.ok(finiteNumber(entry.measured), `THRESHOLD_${name}_MEASURED_MALFORMED`);
  }
  if (Object.hasOwn(entry, "failures")) assert.ok(Number.isInteger(entry.failures) && entry.failures >= 0, `THRESHOLD_${name}_FAILURES_MALFORMED`);
  if (Object.hasOwn(entry, "values")) {
    assert.ok(entry.values && typeof entry.values === "object" && !Array.isArray(entry.values), `THRESHOLD_${name}_VALUES_MALFORMED`);
    for (const value of Object.values(entry.values)) assert.ok(finiteNumber(value), `THRESHOLD_${name}_VALUE_MALFORMED`);
  }
  for (const key of ["minimum", "maximum"]) if (Object.hasOwn(entry, key)) assert.ok(finiteNumber(entry[key]), `THRESHOLD_${name}_${key.toUpperCase()}_MALFORMED`);
}

function validateSafetyGateEntry(name, entry) {
  assert.ok(entry && typeof entry === "object" && !Array.isArray(entry), `SAFETY_GATE_${name}_MALFORMED`);
  assert.equal(typeof entry.pass, "boolean", `SAFETY_GATE_${name}_PASS_MALFORMED`);
  const observed = ["cases", "values", "measured"].filter((key) => Object.hasOwn(entry, key));
  assert.ok(observed.length > 0, `SAFETY_GATE_${name}_OBSERVATION_MISSING`);
  if (Object.hasOwn(entry, "cases")) assert.ok(Array.isArray(entry.cases) && entry.cases.every((value) => typeof value === "string"), `SAFETY_GATE_${name}_CASES_MALFORMED`);
  if (Object.hasOwn(entry, "values")) {
    assert.ok(entry.values && typeof entry.values === "object" && !Array.isArray(entry.values), `SAFETY_GATE_${name}_VALUES_MALFORMED`);
    for (const value of Object.values(entry.values)) assert.ok(finiteNumber(value), `SAFETY_GATE_${name}_VALUE_MALFORMED`);
  }
  if (Object.hasOwn(entry, "measured")) assert.ok(finiteNumber(entry.measured), `SAFETY_GATE_${name}_MEASURED_MALFORMED`);
}

function assertThresholds(report) {
  const failures = [];
  if (!report || typeof report !== "object" || Array.isArray(report)) failures.push("report.integrity:report required");
  const thresholds = report?.thresholds;
  if (!thresholds || typeof thresholds !== "object" || Array.isArray(thresholds)) failures.push("thresholds.integrity:thresholds required");
  else {
    for (const name of REQUIRED_THRESHOLD_FIELDS) {
      if (!Object.hasOwn(thresholds, name)) { failures.push(`thresholds.${name}.missing`); continue; }
      try { validateThresholdEntry(name, thresholds[name]); if (thresholds[name].pass !== true) failures.push(name); }
      catch (error) { failures.push(`thresholds.${name}.integrity:${text(error?.message || error).split("\n", 1)[0]}`); }
    }
  }
  const safetyGates = report?.safetyGates;
  if (!safetyGates || typeof safetyGates !== "object" || Array.isArray(safetyGates)) failures.push("safetyGates.integrity:safetyGates required");
  else {
    for (const name of REQUIRED_SAFETY_GATE_FIELDS) {
      if (!Object.hasOwn(safetyGates, name)) { failures.push(`safety.${name}.missing`); continue; }
      try { validateSafetyGateEntry(name, safetyGates[name]); if (safetyGates[name].pass !== true) failures.push(`safety.${name}`); }
      catch (error) { failures.push(`safety.${name}.integrity:${text(error?.message || error).split("\n", 1)[0]}`); }
    }
  }
  if (!report?.safetyCounters) failures.push("runtime.integrity:safetyCounters required");
  else {
    try {
      validateRuntimeCounters(report.safetyCounters);
      const writeValues = ["businessWriteExecution", "draftCreation", "offerSend", "dispatchExecution", "financialWrite", "authorizationMutation", "downstreamBusinessWrite"].map((field) => runtimeCounterValue(report.safetyCounters, field));
      const externalValues = ["externalLlmProviderCount", "externalLlmNetworkCallCount", "llmApiSecretCount"].map((field) => runtimeCounterValue(report.safetyCounters, field));
      if (!writeValues.every((value) => value === 0)) failures.push("runtime.businessWrites");
      if (!externalValues.every((value) => value === 0)) failures.push("runtime.externalAi");
    } catch (error) {
      failures.push(`runtime.integrity:${text(error?.message || error).split("\n", 1)[0]}`);
    }
  }
  if (report?.authorityMode !== "NEW") failures.push("authorityMode");
  if (failures.length > 0) {
    console.error(`GENERALIZATION_THRESHOLD_FAILURES ${JSON.stringify(failures)}`);
    assert.equal(failures.length, 0, `GENERALIZATION_THRESHOLD_FAILED ${failures.join(",")}`);
  }
}

function normalizedCorpusText(value) {
  return text(value).normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/[ı]/gu, "i").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/gu, " ");
}

function tokenJaccard(left, right) {
  const a = new Set(normalizedCorpusText(left).split(" ").filter(Boolean));
  const b = new Set(normalizedCorpusText(right).split(" ").filter(Boolean));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 1;
}

function assertIndependentCorpusDistinct(manifest, exposedCases) {
  const exposedByExactText = new Map(exposedCases.map((item) => [normalizedCorpusText(item.UTTERANCE), item.CASE_ID]));
  for (const item of manifest.cases) {
    const exact = exposedByExactText.get(normalizedCorpusText(item.UTTERANCE));
    assert.equal(exact, undefined, `INDEPENDENT_CORPUS_EXACT_OVERLAP ${item.CASE_ID} ${exact}`);
    for (const exposed of exposedCases) {
      const similarity = tokenJaccard(item.UTTERANCE, exposed.UTTERANCE);
      assert.ok(similarity < 0.8, `INDEPENDENT_CORPUS_NEAR_DUPLICATE ${item.CASE_ID} ${exposed.CASE_ID} similarity=${similarity}`);
    }
  }
}

function loadExposedRegressionEvidence() {
  const paths = { corpus: EXPOSED_CORPUS_PATH, results: EXPOSED_RESULTS_PATH, report: EXPOSED_REPORT_PATH };
  const hashes = Object.fromEntries(Object.entries(paths).map(([key, filePath]) => [key, sha256File(filePath)]));
  assert.deepEqual(hashes, EXPECTED_EXPOSED_HASHES, "EXPOSED_DIAGNOSTIC_EVIDENCE_MUTATED");
  const corpus = loadJson(EXPOSED_CORPUS_PATH); const results = loadJson(EXPOSED_RESULTS_PATH); const report = loadJson(EXPOSED_REPORT_PATH);
  assert.equal(corpus.cases.length, 112, "EXPOSED_DIAGNOSTIC_CASE_COUNT_CHANGED");
  assert.equal(report.caseCount, 112, "EXPOSED_DIAGNOSTIC_REPORT_CASE_COUNT_CHANGED");
  return { immutable: true, hashes, manifestId: corpus.manifestId, caseCount: corpus.cases.length, roleHelpPositiveCount: corpus.cases.filter((item) => item.EXPECTED_ROLE_HELP === true).length, negativeControlCount: corpus.cases.filter((item) => item.EXPECTED_ROLE_HELP === false).length, recordedRecall: report.roleHelpDiagnosticRecall, recordedPrecision: report.roleHelpDiagnosticPrecision, resultsHasRows: Array.isArray(results.rows), cases: corpus.cases };
}

async function loadRuntime() {
  const guard = createSafetyGuard();
  const providerNames = /^(?:openai|@anthropic|@google-generativeai|@google\/generative-ai|@azure\/openai|@google-cloud\/vertexai|@ai-sdk\/)/u;
  const originalLoad = Module._load;
  Module._load = function guardedLoad(request, parent, isMain) { if (providerNames.test(String(request))) { guard.observe("externalLlmProviderCount", 1); throw new Error(`M18_EXTERNAL_LLM_PROVIDER_BLOCKED:${request}`); } return originalLoad.call(this, request, parent, isMain); };
  guard.counters.networkGuardInstalled = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => { guard.observe("externalLlmNetworkCallCount", 1); throw new Error(`M18_EXTERNAL_NETWORK_BLOCKED:${String(args[0] || "")}`); };
  const secretKeys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "AZURE_OPENAI_API_KEY", "LLM_API_SECRET"];
  guard.observe("llmApiSecretCount", secretKeys.filter((key) => Boolean(process.env[key])).length);
  const [{ resolveCanonicalConversationRequest }, { extractTurkishSemanticFeatures }, { composeSemanticEvidence }, { buildCanonicalSemanticContext }, { runCopilotFoundation }, prismaModule] = await Promise.all([
    import("../src/ai/chat/canonicalSemanticRequest.js"), import("../src/ai/chat/turkishSemanticFeatures.js"), import("../src/ai/chat/semanticEvidenceComposer.js"),
    import("../src/ai/chat/canonicalSemanticContext.js"), import("../src/ai/service.js"), import("../src/prisma.js"),
  ]);
  guardPrisma(prismaModule.default, guard);
  guard.observeBaseline();
  return { ...guard, prisma: prismaModule.default, resolveCanonicalConversationRequest, extractTurkishSemanticFeatures, composeSemanticEvidence, buildCanonicalSemanticContext, runCopilotFoundation, originalFetch, originalLoad };
}

function finalizeSafetyGuard(runtime) { validateRuntimeCounters(runtime.counters); }

function cleanupRuntime(runtime) {
  if (!runtime) return;
  globalThis.fetch = runtime.originalFetch;
  Module._load = runtime.originalLoad;
}

async function runRuntimeSafetyNegativeControl(kind) {
  const previousSecret = process.env.OPENAI_API_KEY;
  if (kind === "secret") process.env.OPENAI_API_KEY = "m18-task12-negative-control";
  let runtime;
  try {
    runtime = await loadRuntime();
    if (kind === "business") {
      const delegateName = Object.keys(runtime.prisma || {}).find((name) => typeof runtime.prisma[name]?.create === "function");
      assert.ok(delegateName, "DIRECT_BUSINESS_MUTATION_PROBE_DELEGATE_MISSING");
      let rejected = false;
      try { await runtime.prisma[delegateName].create({ data: {} }); } catch (error) { rejected = true; assert.match(text(error?.message || error), /M18_RUNTIME_WRITE_GUARD_BLOCKED/u, "DIRECT_BUSINESS_MUTATION_WRONG_REJECTION"); }
      assert.equal(rejected, true, "DIRECT_BUSINESS_MUTATION_WAS_ACCEPTED");
      assert.equal(runtime.counters.blockedBusinessMutationAttempts, 1, "DIRECT_BUSINESS_MUTATION_GUARD_NOT_OBSERVED");
      assert.equal(runtimeCounterValue(runtime.counters, "businessWriteExecution"), 0, "DIRECT_BUSINESS_MUTATION_EXECUTED");
      console.error(`DIRECT_BUSINESS_MUTATION_REJECTED delegate=${delegateName} blockedAttempts=${runtime.counters.blockedBusinessMutationAttempts} businessWriteExecution=${runtimeCounterValue(runtime.counters, "businessWriteExecution")}`);
      assert.fail("NEGATIVE_CONTROL_DIRECT_BUSINESS_MUTATION_REJECTED");
    } else if (kind === "network") {
      try { await globalThis.fetch("https://m18-task12-negative-control.invalid"); } catch {}
      assert.equal(runtimeCounterValue(runtime.counters, "externalLlmNetworkCallCount"), 0, "DIRECT_EXTERNAL_NETWORK_WAS_ACCEPTED");
    } else if (kind === "provider") {
      try { Module._load("openai", null, false); } catch {}
      assert.equal(runtimeCounterValue(runtime.counters, "externalLlmProviderCount"), 0, "DIRECT_EXTERNAL_PROVIDER_WAS_ACCEPTED");
    } else if (kind === "secret") {
      assert.equal(runtimeCounterValue(runtime.counters, "llmApiSecretCount"), 0, "DIRECT_LLM_SECRET_WAS_ACCEPTED");
    } else {
      throw new Error(`UNKNOWN_RUNTIME_NEGATIVE_CONTROL ${kind}`);
    }
  } finally {
    cleanupRuntime(runtime);
    if (previousSecret === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousSecret;
  }
}

export async function runGeneralizationDiagnostic({ manifest, authorityMode = "NEW", manifestSourcePath = null, enforceCorpusIndependence = true } = {}) {
  const manifestShape = validateManifest(manifest);
  assert.equal(authorityMode, "NEW", "GENERALIZATION_DIAGNOSTIC_REQUIRES_NEW_AUTHORITY");
  const exposedEvidence = loadExposedRegressionEvidence();
  if (enforceCorpusIndependence && manifest.manifestId !== exposedEvidence.manifestId) assertIndependentCorpusDistinct(manifest, exposedEvidence.cases);
  const sourcePath = manifestSourcePath || (manifest.manifestId === exposedEvidence.manifestId ? EXPOSED_CORPUS_PATH : MANIFEST_PATH);
  const sourceManifest = loadJson(sourcePath);
  assert.equal(sourceManifest.manifestId, manifest.manifestId, "DIAGNOSTIC_MANIFEST_SOURCE_IDENTITY_MISMATCH");
  const runtime = await loadRuntime();
  const previousMode = process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE;
  process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = authorityMode;
  const corpusHash = sha256File(sourcePath);
  const rows = [];
  try {
    for (const item of manifest.cases) {
      const state = prestateFor(item); const user = userFor(item.ROLE); const screenContext = screenFor(item, state); const conversationState = conversationFor(item, state);
      assertPrestateExact(item, state, conversationState);
      let row;
      try {
        const features = runtime.extractTurkishSemanticFeatures({ text: item.UTTERANCE });
        const context = runtime.buildCanonicalSemanticContext({ message: item.UTTERANCE, user, screenContext, conversationState });
        const evidence = runtime.composeSemanticEvidence({ features, context, conversationState, screenContext });
        const canonical = runtime.resolveCanonicalConversationRequest({ message: item.UTTERANCE, user, screenContext, conversationState, env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: authorityMode } });
        const foundation = await runtime.runCopilotFoundation({ intent: "CHAT_HELP", entityType: "screen", entityId: 0, user, screenContext, message: item.UTTERANCE, authSessionId: `m18-t12-${item.CASE_ID}` });
        const actual = actualCanonicalFields(canonical, foundation);
        row = {
          caseId: item.CASE_ID, role: item.ROLE, prestate: state, utterance: item.UTTERANCE, expectedConceptFamily: item.EXPECTED_CONCEPT_FAMILY, expectedRoleHelp: item.EXPECTED_ROLE_HELP === true, caseData: item,
          actualCanonicalFields: actual,
          typedSemanticEvidence: {
            subject: evidence.subject || null, roleAspect: evidence.roleAspect || null, requestMode: evidence.requestMode || null,
            productHelp: evidence.productHelp || null, object: evidence.object || null, relation: evidence.relation || null,
            reference: evidence.reference || null, targetRequest: evidence.targetRequest || null, polarity: evidence.polarity || null,
            temporal: evidence.temporal || null, order: evidence.order || null, priority: evidence.priority || null,
            contradictions: evidence.contradictions || [], provenance: evidence.provenance || [], quality: evidence.quality || null,
          },
          evidenceFeatures: { normalizedText: features.normalizedText, tokenCount: Array.isArray(features.tokens) ? features.tokens.length : null, recognizedFeatureCount: features.featureQuality?.recognizedFeatureCount ?? null, question: features.question || null, polarity: features.polarity || null, relations: features.relations || null, structure: features.structure || null, quality: features.featureQuality || null },
          extractionProvenance: { producer: "deterministic-turkish-feature-producer", evidence: Array.isArray(evidence.provenance) ? evidence.provenance : [], evidenceQuality: evidence.quality || null, canonical: canonical.request?.provenance || null }, evidenceStatus: "OBSERVED",
          clarification: { need: actual.clarification, ambiguity: actual.ambiguity, resolution: actual.resolution }, responseFamily: actual.responseFamily || "UNKNOWN", safetyCounters: runtime.counters,
          sourceIdentity: { manifestId: manifest.manifestId, corpusHash, caseId: item.CASE_ID, authorityMode, canonicalAuthority: actual.authority }, roleHelpLike: isRoleHelpLike(actual), roleHelpCorrect: item.EXPECTED_ROLE_HELP === true && isRoleHelpCorrect(actual), ambiguous: item.EXPECTED_ROLE_HELP === true && isAmbiguous(actual), groundingContradiction: item.EXPECTED_ROLE_HELP === false && actual.targetCandidate !== null,
        };
      } catch (error) {
        row = { caseId: item.CASE_ID, role: item.ROLE, prestate: state, utterance: item.UTTERANCE, expectedConceptFamily: item.EXPECTED_CONCEPT_FAMILY, expectedRoleHelp: item.EXPECTED_ROLE_HELP === true, caseData: item, error: { message: text(error?.message || error), code: error?.code || null },
          actualCanonicalFields: { version: null, semanticScope: null, semanticScopeEvidence: "MISSING_REQUIRED_EVIDENCE", action: null, object: null, operation: null, capability: null, resolution: "UNRESOLVED", authorization: null, groundingRequirement: null, ambiguity: "EXECUTION_ERROR", responseFamily: "EXECUTION_ERROR", conversationRoute: "EXECUTION_ERROR", workflow: null, clarification: null, roleHelpIntent: false, generalProductHelpIntent: false, explicitTaskIntent: false, targetCandidate: null, authority: null },
          typedSemanticEvidence: { status: "MISSING_REQUIRED_EVIDENCE" },
          evidenceFeatures: { status: "MISSING_REQUIRED_EVIDENCE" }, extractionProvenance: { status: "MISSING_REQUIRED_EVIDENCE", evidence: [] }, evidenceStatus: "MISSING_REQUIRED_EVIDENCE", clarification: { need: null, ambiguity: "EXECUTION_ERROR", resolution: "UNRESOLVED" }, responseFamily: "EXECUTION_ERROR", safetyCounters: runtime.counters, sourceIdentity: { manifestId: manifest.manifestId, corpusHash, caseId: item.CASE_ID, authorityMode, canonicalAuthority: null, evidenceStatus: "MISSING_REQUIRED_EVIDENCE" }, roleHelpLike: false, roleHelpCorrect: false, ambiguous: item.EXPECTED_ROLE_HELP === true, groundingContradiction: false, executionError: true };
      }
      if (row.actualCanonicalFields?.authority) {
        const authority = row.actualCanonicalFields.authority;
        assert.equal(authority?.mode, "NEW", `DIAGNOSTIC_CASE_NOT_NEW ${item.CASE_ID}`); assert.equal(authority?.authoritativePath, "NEW_TYPED_EVIDENCE", `DIAGNOSTIC_CASE_AUTHORITY_PATH ${item.CASE_ID}`);
        assert.equal(authority?.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT, 1, `DIAGNOSTIC_CASE_AUTHORITY_COUNT ${item.CASE_ID}`); assert.equal(authority?.RUNTIME_SEMANTIC_FALLBACK_COUNT, 0, `DIAGNOSTIC_CASE_FALLBACK ${item.CASE_ID}`);
        assert.equal(authority?.DUAL_SEMANTIC_AUTHORITY_COUNT, 0, `DIAGNOSTIC_CASE_DUAL_AUTHORITY ${item.CASE_ID}`); assert.equal(authority?.DOWNSTREAM_SEMANTIC_REDECISION_COUNT, 0, `DIAGNOSTIC_CASE_DOWNSTREAM_REDECISION ${item.CASE_ID}`);
      }
      rows.push(row); if (rows.length % 16 === 0) console.error(`GENERALIZATION_PROGRESS ${rows.length}/${manifest.cases.length}`);
    }
  } finally {
    if (previousMode === undefined) delete process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE; else process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = previousMode;
    globalThis.fetch = runtime.originalFetch; Module._load = runtime.originalLoad;
  }
  finalizeSafetyGuard(runtime); for (const row of rows) validateRow(row);
  const report = calculateMetrics(rows, manifest, authorityMode, corpusHash, exposedEvidence, runtime.counters);
  report.roleBreakdown = countsBy(rows.filter((row) => row.expectedRoleHelp), "role"); report.conceptFamilyBreakdown = countsBy(rows.filter((row) => row.expectedRoleHelp), "expectedConceptFamily");
  report.executionErrors = rows.filter((row) => row.executionError).length;
  report.authoringIsolation = { authoredContractFirst: manifest.authoredContractFirst, implementationCueSourceUsedForAuthoring: manifest.implementationCueSourceUsedForAuthoring, priorCorpusReuseForbidden: manifest.priorCorpusReuseForbidden };
  report.corpusCoverage = {
    declared: { caseCount: manifest.caseCount, positiveRoleHelpCount: manifest.roleCaseCount, negativeControlCount: manifest.negativeControlCount },
    derived: { caseCount: manifest.cases.length, positiveRoleHelpCount: manifestShape.positive.length, negativeControlCount: manifestShape.negative.length },
    roles: [...new Set(manifestShape.positive.map((item) => item.ROLE))].sort(),
    conceptFamilies: [...new Set(manifestShape.positive.map((item) => item.EXPECTED_CONCEPT_FAMILY))].sort(),
  };
  report.sourceIdentity = { manifestPath: sourcePath, manifestHash: corpusHash, exposedEvidence: exposedEvidence.hashes }; report.safetyCounters = runtime.counters; report.rows = rows;
  return report;
}

function expectNegativeControl(name, mutate) {
  const manifest = loadJson(MANIFEST_PATH); let failed = false; let failure = null;
  try { const mutated = structuredClone(manifest); mutate(mutated); validateManifest(mutated); } catch (error) { failed = true; failure = error; console.error(`NEGATIVE_CONTROL_${name}_ASSERTION ${text(error?.message || error).split("\n", 1)[0]}`); }
  assert.equal(failed, true, `NEGATIVE_CONTROL_DID_NOT_FAIL ${name}`);
  throw failure;
}

async function main() {
  const arg = process.argv.slice(2)[0];
  if (arg === "--negative-control-malformed-schema") return expectNegativeControl("MALFORMED_SCHEMA", (manifest) => { manifest.cases = null; });
  if (arg === "--negative-control-count-mismatch") return expectNegativeControl("COUNT_MISMATCH", (manifest) => { manifest.caseCount = 111; });
  if (arg === "--negative-control-missing-role") return expectNegativeControl("MISSING_ROLE", (manifest) => { delete manifest.cases[0].ROLE; });
  if (arg === "--negative-control-missing-concept-family") return expectNegativeControl("MISSING_CONCEPT_FAMILY", (manifest) => { delete manifest.cases[0].EXPECTED_CONCEPT_FAMILY; });
  if (arg === "--negative-control-missing-evidence") { const row = validRowFixture(); delete row.evidenceFeatures; return validateRow(row); }
  if (arg === "--negative-control-malformed-evidence") { const row = validRowFixture(); row.evidenceFeatures.tokenCount = "not-a-number"; return validateRow(row); }
  if (arg === "--negative-control-forged-nested-evidence") { const row = validRowFixture(); row.evidenceFeatures.question.markers = [{ featureKind: "QUESTION_MARKER", value: "QUESTION_MARK", sourceSpan: { start: 0, end: 1 }, normalizationForm: "TURKISH_LOWERCASE_NFC", producer: "forged-producer", supportOrContradiction: "SUPPORT", quality: "HIGH" }]; return validateRow(row); }
  if (arg === "--negative-control-forged-provenance") { const row = validRowFixture(); row.extractionProvenance.canonical.source = "forged.source"; return validateRow(row); }
  if (arg === "--negative-control-forged-provenance-source") { const row = validRowFixture(); row.extractionProvenance.evidence[0].source = "FORGED_SOURCE"; return validateRow(row); }
  if (arg === "--negative-control-malformed-canonical-object") { const row = validRowFixture(); row.actualCanonicalFields.object = { forged: true }; return validateRow(row); }
  if (arg === "--negative-control-fabricated-target") { const row = validRowFixture(); row.expectedRoleHelp = false; row.caseData = { EXPECTED_ROLE_HELP: false, NEGATIVE_KIND: "OBJECT" }; row.actualCanonicalFields.targetCandidate = { objectClass: "SURFACE" }; return validateRow(row); }
  if (arg === "--negative-control-execution-error-row") { const row = validRowFixture(); row.executionError = true; row.error = { message: "synthetic execution error" }; return validateRow(row); }
  if (arg === "--negative-control-missing-counters") { const row = validRowFixture(); delete row.safetyCounters.evidence.businessWriteExecution; return validateRow(row); }
  if (arg === "--negative-control-malformed-counters") { const row = validRowFixture(); row.safetyCounters.evidence.businessWriteExecution.value = "not-a-number"; return validateRow(row); }
  if (arg === "--negative-control-null-numeric-evidence") { const row = validRowFixture(); row.safetyCounters.evidence.businessWriteExecution.value = null; return validateRow(row); }
  if (arg === "--negative-control-string-numeric-evidence") { const report = thresholdPassFixture(); report.thresholds.overallRoleHelpRecall.measured = "0"; return assertThresholds(report); }
  if (arg === "--negative-control-boolean-numeric-evidence") { const report = thresholdPassFixture(); report.safetyGates.businessWrites.values = { businessWriteExecution: false }; return assertThresholds(report); }
  if (arg === "--negative-control-prestate-mismatch") {
    const manifest = loadJson(MANIFEST_PATH); const item = manifest.cases.find((candidate) => candidate.PRECONDITION?.activeTask !== "NONE");
    assert.ok(item, "NEGATIVE_CONTROL_PRESTATE_ACTIVE_TASK_CASE_MISSING");
    const state = prestateFor(item); const mutatedState = { ...state, activeTask: state.activeTask === "FOLLOW_UP" ? "RECOVERY" : "FOLLOW_UP" };
    return assertPrestateExact(item, state, conversationFor(item, mutatedState));
  }
  if (arg === "--negative-control-threshold-failure") { const report = thresholdPassFixture(); report.thresholds.overallRoleHelpRecall = { measured: 0, minimum: 0.95, pass: false }; return assertThresholds(report); }
  if (arg === "--negative-control-multiple-threshold-failures") { const report = thresholdPassFixture(); report.thresholds.overallRoleHelpRecall = { measured: 0, minimum: 0.95, pass: false }; report.thresholds.grounding = { failures: 1, pass: false }; report.thresholds.executionErrors = { measured: 1, maximum: 0, pass: false }; report.safetyGates.businessWrites = { values: { businessWriteExecution: 1 }, pass: false }; report.safetyCounters = observedSafetyFixture({ businessWriteExecution: 1, externalLlmNetworkCallCount: 1 }); return assertThresholds(report); }
  if (arg === "--negative-control-missing-top-level-threshold") { const report = thresholdPassFixture(); delete report.thresholds.grounding; return assertThresholds(report); }
  if (arg === "--negative-control-missing-top-level-counter") { const report = thresholdPassFixture(); delete report.safetyCounters; return assertThresholds(report); }
  if (arg === "--negative-control-forged-write-counter") { const report = thresholdPassFixture(); report.safetyCounters = observedSafetyFixture({ businessWriteExecution: 1 }); return assertThresholds(report); }
  if (arg === "--negative-control-direct-business-mutation") return runRuntimeSafetyNegativeControl("business");
  if (arg === "--negative-control-external-network") return runRuntimeSafetyNegativeControl("network");
  if (arg === "--negative-control-external-provider") return runRuntimeSafetyNegativeControl("provider");
  if (arg === "--negative-control-llm-secret") return runRuntimeSafetyNegativeControl("secret");
  if (arg === "--negative-control-exact-overlap" || arg === "--negative-control-near-duplicate") {
    const manifest = loadJson(MANIFEST_PATH); const exposed = loadJson(EXPOSED_CORPUS_PATH); const mutated = structuredClone(manifest);
    mutated.cases[0].UTTERANCE = arg === "--negative-control-exact-overlap" ? exposed.cases[0].UTTERANCE : `${exposed.cases[0].UTTERANCE.replace(/[?!.]$/u, "")} lütfen?`;
    assertIndependentCorpusDistinct(mutated, exposed.cases);
    return;
  }
  if (arg === "--exposed-regression-readonly") {
    const exposed = loadJson(EXPOSED_CORPUS_PATH);
    const exposedManifest = { ...exposed, caseCount: exposed.cases.length, roleCaseCount: exposed.cases.filter((item) => item.EXPECTED_ROLE_HELP === true).length, negativeControlCount: exposed.cases.filter((item) => item.EXPECTED_ROLE_HELP === false).length };
    const report = await runGeneralizationDiagnostic({ manifest: exposedManifest, authorityMode: "NEW", manifestSourcePath: EXPOSED_CORPUS_PATH, enforceCorpusIndependence: false });
    console.log(JSON.stringify({ manifestId: exposed.manifestId, immutableEvidence: report.exposedRegressionEvidence, measuredUnderNewAuthority: { caseCount: report.caseCount, positiveRoleHelpCount: report.positiveRoleHelpCount, correctRoleHelpCount: report.correctRoleHelpCount, recall: report.overallRoleHelpRecall, precision: report.precision, falsePositiveRate: report.falsePositiveRate, ambiguityRate: report.clearRoleHelpAmbiguityRate, executionErrors: report.executionErrors } }, null, 2));
    return;
  }
  const manifest = loadJson(MANIFEST_PATH); const report = await runGeneralizationDiagnostic({ manifest, authorityMode: "NEW" }); console.log(JSON.stringify(report, null, 2)); assertThresholds(report);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) await main();
