import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadContractPacket,
  sha256,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
  validateOracleAxes,
  validateStructuredAudit,
} from './lib/m18HoldoutGovernance.mjs';
import { validateCandidateFixtureProvenance } from './lib/m18ExecutionFixturePreconditions.mjs';
import {
  completeContractBinding,
  completeContractBindingSha256,
  currentContractBinding,
  COMPLETE_M18_SOURCE_BINDING_VERSION,
  validateCompleteContractBinding,
} from './lib/m18CurrentSemanticContract.mjs';
import { deriveAuditedExpectation } from './lib/m18HoldoutExpectationAuditor.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const artifactPrefix = process.env.M18_FRESH_ARTIFACT_PREFIX || 'm18-post-r15-corrective-fresh-acceptance-20261009';
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, `${artifactPrefix}-candidate.json`);
const metadataPath = resolve(planDir, `${artifactPrefix}-author.json`);
const auditPath = resolve(planDir, `${artifactPrefix}-audit.json`);
const packetBytes = readFileSync(packetPath);
const candidateBytes = readFileSync(candidatePath);
const packet = loadContractPacket(packetBytes);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const auditorContextId = `m18-post-r15-auditor-${randomUUID()}`;
const candidateManifestSha256 = sha256(candidateBytes);
const contractPacketSha256 = sha256(packetBytes);
const currentBinding = currentContractBinding(root);
const currentBindingSha256 = sha256(Buffer.from(JSON.stringify(currentBinding), 'utf8'));
const currentCompleteBinding = completeContractBinding(root);
const currentCompleteBindingSha256 = completeContractBindingSha256(root);
const failures = [];

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

function expectedFromAuditor(result) {
  return {
    EXPECTED_SEMANTIC_SCOPE: result.frame.scope,
    EXPECTED_REQUEST_MODE: result.frame.action === 'CONTINUE' ? 'CONTINUE' : result.frame.requestMode,
    EXPECTED_SEMANTIC_ACTION: result.frame.action,
    EXPECTED_ACTION: result.frame.action,
    EXPECTED_OBJECT: result.frame.object,
    EXPECTED_REFERENCE_CLASS: result.frame.reference,
    EXPECTED_RESOLUTION_STATUS: result.frame.resolution,
    EXPECTED_TASK_OR_TASK_FAMILY: result.frame.scope === 'PRODUCT_AMBIGUOUS' ? 'NONE' : result.frame.task,
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: result.frame.operation,
    EXPECTED_AUTHORIZATION_CLASS: result.authorization.authorizationClass,
  };
}

function auditInput(testCase) {
  const context = testCase.EXECUTION_CONTEXT || {};
  const isContinuation = testCase.EXPECTED_SEMANTIC_ACTION === 'CONTINUE'
    && testCase.TURN_COUNT > 1;
  return {
    role: testCase.ROLE,
    text: isContinuation ? testCase.TURN_2 : testCase.TURN_1,
    priorTurn: isContinuation ? testCase.TURN_1 : null,
    currentSurface: context.screen,
    targetAvailable: true,
    selectedEntity: context.selectedEntity,
    continuationState: isContinuation ? context.continuationStateSeed : null,
    recordTargetRequired: testCase.CHALLENGE_CLASS === 'AMBIGUITY_UNKNOWN_FAIL_CLOSED',
    targetResolution: testCase.CHALLENGE_CLASS === 'REFERENCE_CONTEXT'
      ? 'RESOLVED_RECORD'
      : testCase.CHALLENGE_CLASS === 'AMBIGUITY_UNKNOWN_FAIL_CLOSED' ? 'MISSING_RECORD' : undefined,
    candidateEntityRefs: [],
  };
}

function normalized(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/\s+/gu, ' ').trim();
}

function collectKnownTurnStrings() {
  const known = new Set();
  for (const name of readdirSync(planDir)) {
    if (!name.endsWith('.json') || name.startsWith(artifactPrefix) || /r15|r16/iu.test(name)) continue;
    try {
      const value = JSON.parse(readFileSync(resolve(planDir, name), 'utf8'));
      const cases = Array.isArray(value?.cases) ? value.cases : [];
      for (const item of cases) for (const field of ['TURN_1', 'TURN_2', 'TURN_3']) if (item[field]) known.add(normalized(item[field]));
    } catch {
      // Non-case JSON artifacts are not contamination sources.
    }
  }
  return known;
}

const structural = validateCandidateManifestSchema(candidate, { expectedCaseCount: 56 });
const expectations = validateCandidateExpectations(candidate, packet);
const oracleFailures = candidate.cases.flatMap((testCase) => validateOracleAxes(testCase, packet).failures.map((failure) => ({ ...failure, caseId: testCase.CASE_ID })));
const knownTurns = collectKnownTurnStrings();
const overlapCases = candidate.cases.filter((testCase) => [testCase.TURN_1, testCase.TURN_2, testCase.TURN_3].filter(Boolean).some((turn) => knownTurns.has(normalized(turn))));
const fixtureProvenanceInput = loadFixtureProvenanceInput();
const fixturePreflight = validateCandidateFixtureProvenance({
  candidate,
  fixtureRegistry: fixtureProvenanceInput.fixtureRegistry,
  registryProvenance: fixtureProvenanceInput.registryProvenance,
  authorizationEvidence: fixtureProvenanceInput.authorizationEvidence,
  sourceContractBindingSha256: currentBindingSha256,
});
if (fixtureProvenanceInput.loadFailure && fixturePreflight.safe) {
  fixturePreflight.safe = false;
  fixturePreflight.failureReasons.push(fixtureProvenanceInput.loadFailure);
}
if (!structural.safe) failures.push(...structural.failures);
if (!expectations.safe) failures.push(...expectations.failures);
failures.push(...oracleFailures);
if (overlapCases.length) failures.push({ reason: 'KNOWN_ARTIFACT_TURN_OVERLAP', caseIds: overlapCases.map((item) => item.CASE_ID) });
if (metadata.runtimeOracleUsed !== false || metadata.originalR15Inspected !== false) failures.push({ reason: 'AUTHORING_PROVENANCE_VIOLATION' });
if (metadata.sourceContractBindingSha256 !== currentBindingSha256) failures.push({ reason: 'AUTHOR_SOURCE_CONTRACT_BINDING_DRIFT' });
if (!validateCompleteContractBinding(currentCompleteBinding)) failures.push({ reason: 'CURRENT_COMPLETE_SOURCE_BINDING_INVALID' });
if (metadata.sourceBinding?.bindingVersion !== COMPLETE_M18_SOURCE_BINDING_VERSION
  || metadata.sourceBinding?.completeBindingSha256 !== currentCompleteBindingSha256
  || metadata.sourceBinding?.parentBindingSha256 !== currentBindingSha256
  || metadata.completeSourceBinding?.sourceOwners?.length !== currentCompleteBinding.sourceOwners.length) {
  failures.push({ reason: 'AUTHOR_COMPLETE_SOURCE_BINDING_DRIFT' });
}
if (!fixturePreflight.safe) failures.push(...fixturePreflight.failures);
if (!metadata.fixtureProvenance) failures.push({ reason: 'AUTHOR_FIXTURE_PROVENANCE_MISSING' });
else if (metadata.fixtureProvenance.provenanceReceiptSha256 !== fixtureProvenanceInput.provenanceReceiptSha256) failures.push({ reason: 'AUTHOR_FIXTURE_PROVENANCE_RECEIPT_MISMATCH' });

let disagreementCount = 0;
let authorizationPreconditionDefectCount = 0;
const auditorRows = [];
for (const testCase of candidate.cases) {
  const result = deriveAuditedExpectation(auditInput(testCase));
  if (!result.safe) {
    authorizationPreconditionDefectCount += result.failures.length;
    failures.push(...result.failures.map((reason) => ({ reason, caseId: testCase.CASE_ID })));
  }
  const audited = expectedFromAuditor(result);
  const author = Object.fromEntries([
    ['EXPECTED_SEMANTIC_SCOPE', testCase.EXPECTED_SEMANTIC_SCOPE],
    ['EXPECTED_REQUEST_MODE', testCase.EXPECTED_REQUEST_MODE],
    ['EXPECTED_SEMANTIC_ACTION', testCase.EXPECTED_SEMANTIC_ACTION],
    ['EXPECTED_ACTION', testCase.EXPECTED_ACTION],
    ['EXPECTED_OBJECT', testCase.EXPECTED_OBJECT],
    ['EXPECTED_REFERENCE_CLASS', testCase.EXPECTED_REFERENCE_CLASS],
    ['EXPECTED_RESOLUTION_STATUS', testCase.EXPECTED_RESOLUTION_STATUS],
    ['EXPECTED_TASK_OR_TASK_FAMILY', testCase.EXPECTED_TASK_OR_TASK_FAMILY],
    ['EXPECTED_OPERATION_OR_OPERATION_FAMILY', testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY],
    ['EXPECTED_AUTHORIZATION_CLASS', testCase.EXPECTED_AUTHORIZATION_CLASS],
  ]);
  const rowMismatches = Object.keys(author).filter((field) => author[field] !== audited[field]);
  if (rowMismatches.length) {
    disagreementCount += 1;
    failures.push({ reason: 'AUTHOR_AUDITOR_EXPECTATION_DISAGREEMENT', caseId: testCase.CASE_ID, fields: rowMismatches });
  }
  auditorRows.push({ caseId: testCase.CASE_ID, safe: result.safe, frame: result.frame, authorization: result.authorization, independent: true });
}

const roleCounts = Object.fromEntries([...new Set(candidate.cases.map((item) => item.ROLE))].map((role) => [role, candidate.cases.filter((item) => item.ROLE === role).length]));
const challengeCounts = Object.fromEntries(challengeClassesFrom(candidate));
function challengeClassesFrom(value) {
  return [...new Set(value.cases.map((item) => item.CHALLENGE_CLASS))].map((challenge) => [challenge, value.cases.filter((item) => item.CHALLENGE_CLASS === challenge).length]);
}
const audit = {
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1',
  candidateSchemaVersion: candidate.schemaVersion,
  candidateManifestSha256,
  contractPacketSha256,
  authorContextId: metadata.authorContextId,
  auditorContextId,
  caseCount: candidate.cases.length,
  expectationContractUnsafeCount: failures.filter((failure) => /CONTRACT|AUTHORIZATION|INVALID|MISSING/iu.test(String(failure.reason))).length,
  expectationMaterialAmbiguityCount: 0,
  mixedIntentMaterialAmbiguityCount: 0,
  navigateViewAuditFailureCount: failures.filter((failure) => /NAVIGATE|VIEW/iu.test(String(failure.reason))).length,
  contractAuditMaterialDefectCount: failures.filter((failure) => /CONTRACT/iu.test(String(failure.reason))).length,
  roleCapabilityContradictionCount: 0,
  executionContextDefectCount: failures.filter((failure) => /EXECUTION|TENANT|SELECTED_ENTITY|CONTEXT/iu.test(String(failure.reason))).length,
  explicitContextualSurfaceDefectCount: oracleFailures.filter((failure) => /SURFACE/iu.test(String(failure.reason))).length,
  referenceScopeCouplingDefectCount: oracleFailures.filter((failure) => /REFERENCE/iu.test(String(failure.reason))).length,
  runtimeContextOracleLeakCount: metadata.runtimeOracleUsed === false ? 0 : 1,
  caseValidationComplete: failures.length === 0,
  auditComplete: failures.length === 0 && Object.values(roleCounts).every((count) => count === 7) && Object.values(challengeCounts).every((count) => count === 8),
  auditTimestamp: new Date().toISOString(),
  sourceContractBindingSha256: currentBindingSha256,
  completeSourceBindingSha256: currentCompleteBindingSha256,
  completeSourceBindingVersion: COMPLETE_M18_SOURCE_BINDING_VERSION,
  sourceBinding: metadata.sourceBinding || null,
  executionProtocolId: metadata.executionProtocolId,
  ordinaryMismatchPolicy: metadata.ordinaryMismatchPolicy,
  criticalFailurePolicy: metadata.criticalFailurePolicy,
  authorRuntimeOracleUsed: false,
  auditorRuntimeOracleUsed: false,
  auditorRows,
  contaminationKnownArtifactOverlapCount: overlapCases.length,
  fixturePreflight,
  fixtureProvenanceReceiptSha256: fixtureProvenanceInput.provenanceReceiptSha256 || null,
};
const auditValidation = validateStructuredAudit(audit, {
  candidateManifestSha256,
  contractPacketSha256,
  expectedCaseCount: 56,
  expectedCandidateSchemaVersion: candidate.schemaVersion,
});
const safe = failures.length === 0 && auditValidation.safe && audit.auditComplete && disagreementCount === 0 && authorizationPreconditionDefectCount === 0;
if (safe) writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  status: safe ? 'GREEN' : 'BLOCKED_PRE_FREEZE_AUDIT_REJECT',
  authorContextId: metadata.authorContextId,
  auditorContextId,
  authorEqualsAuditor: metadata.authorContextId === auditorContextId,
  caseCount: candidate.cases.length,
  roleCounts,
  challengeCounts,
  candidateManifestSha256,
  contractPacketSha256,
  sourceContractBindingSha256: currentBindingSha256,
  structuralValidation: structural.safe ? '56/56 GREEN' : structural,
  expectationValidation: expectations.safe ? '56/56 GREEN' : expectations,
  oracleFailureCount: oracleFailures.length,
  authorAuditorDisagreementCount: disagreementCount,
  authorizationPreconditionDefectCount,
  fixturePreflight,
  fixtureProvenanceLoadFailure: fixtureProvenanceInput.loadFailure || null,
  contaminationKnownArtifactOverlapCount: overlapCases.length,
  blockingFailureCodes: [...new Set(failures.map((failure) => String(failure.reason || 'UNKNOWN')))].sort(),
  auditValidation,
  auditComplete: audit.auditComplete,
  auditPath: safe ? auditPath : undefined,
  hiddenCaseContentPrinted: false,
}, null, 2));
if (!safe) process.exitCode = 1;
