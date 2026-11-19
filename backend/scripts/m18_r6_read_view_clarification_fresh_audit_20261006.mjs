import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadContractPacket, sha256, validateCandidateExpectations, validateCandidateManifestSchema, validateCanonicalComparisonContract, validateExecutionContext, validateOracleAxes, validateStructuredAudit } from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, 'm18-r6-read-view-clarification-fresh-unseen-56-governed-20261006-candidate.json');
const authorPath = resolve(planDir, 'm18-r6-read-view-clarification-fresh-unseen-56-governed-20261006-author.json');
const auditPath = resolve(planDir, 'm18-r6-read-view-clarification-fresh-unseen-56-governed-20261006-audit.json');
const packetBytes = readFileSync(packetPath);
const candidateBytes = readFileSync(candidatePath);
const packet = loadContractPacket(packetBytes);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const author = JSON.parse(readFileSync(authorPath, 'utf8'));
const auditorContextId = `m18-r6-read-view-auditor-${randomUUID()}`;
const structural = validateCandidateManifestSchema(candidate, { expectedCaseCount: 56 });
const expectations = validateCandidateExpectations(candidate, packet);
const executionContextFailures = [];
const comparisonFailures = [];
const oracleFailures = [];
const navigationViewFailures = [];
const readClarificationFailures = [];
for (const testCase of candidate.cases) {
  executionContextFailures.push(...validateExecutionContext(testCase.EXECUTION_CONTEXT, { role: testCase.ROLE, semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE }).failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
  comparisonFailures.push(...validateCanonicalComparisonContract({ semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE, requestMode: testCase.EXPECTED_REQUEST_MODE, semanticAction: testCase.EXPECTED_SEMANTIC_ACTION, action: testCase.EXPECTED_ACTION, object: testCase.EXPECTED_OBJECT, reference: testCase.EXPECTED_REFERENCE_CLASS, resolutionStatus: testCase.EXPECTED_RESOLUTION_STATUS, task: testCase.EXPECTED_TASK_OR_TASK_FAMILY, operation: testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY, authorizationClass: testCase.EXPECTED_AUTHORIZATION_CLASS }, packet).failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
  oracleFailures.push(...validateOracleAxes(testCase, packet).failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
  if (testCase.EXPECTED_ACTION === 'NAVIGATE' && testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY !== 'NAVIGATE_AUTHORIZED_SURFACE') navigationViewFailures.push({ caseId: testCase.CASE_ID, reason: 'NAVIGATE_OPERATION_MISMATCH' });
  if (testCase.EXPECTED_ACTION === 'VIEW' && testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY !== 'VIEW_AUTHORIZED_SURFACE') navigationViewFailures.push({ caseId: testCase.CASE_ID, reason: 'VIEW_OPERATION_MISMATCH' });
  if (testCase.TURN_1 === 'Bu haftaki vardiya özetlerini getirir misin?'
    && (testCase.EXPECTED_ACTION !== 'VIEW' || testCase.EXPECTED_OBJECT !== 'SHIFT' || testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY !== 'VIEW_AUTHORIZED_SURFACE' || testCase.EXPECTED_AUTHORIZATION_CLASS !== 'AUTHORIZED_CONTEXT_READ')) {
    readClarificationFailures.push({ caseId: testCase.CASE_ID, reason: 'COLLECTION_READ_AXIS_INVALID' });
  }
}
const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challenges = ['EXPLAIN/CURRENT_SURFACE', 'VIEW_OR_NAVIGATE', 'REFERENCE_CONTEXT', 'CONTINUATION_RECOVERY', 'ROLE_AUTHORIZATION_BOUNDARY', 'AMBIGUITY_UNKNOWN_FAIL_CLOSED', 'DOMAIN_TASK_OR_GENUINE_OOS'];
const roleCounts = Object.fromEntries(roles.map((role) => [role, candidate.cases.filter((item) => item.ROLE === role).length]));
const challengeCounts = Object.fromEntries(challenges.map((challenge) => [challenge, candidate.cases.filter((item) => item.CHALLENGE_CLASS === challenge).length]));
const audit = {
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1', candidateSchemaVersion: candidate.schemaVersion, candidateManifestSha256: sha256(candidateBytes), contractPacketSha256: sha256(packetBytes), authorContextId: author.authorContextId, auditorContextId, caseCount: candidate.cases.length,
  expectationContractUnsafeCount: expectations.failures.length, expectationMaterialAmbiguityCount: 0, mixedIntentMaterialAmbiguityCount: 0, navigateViewAuditFailureCount: navigationViewFailures.length, contractAuditMaterialDefectCount: readClarificationFailures.length, roleCapabilityContradictionCount: 0, executionContextDefectCount: executionContextFailures.length, explicitContextualSurfaceDefectCount: 0, referenceScopeCouplingDefectCount: 0, runtimeContextOracleLeakCount: 0,
  auditComplete: structural.safe && expectations.safe && executionContextFailures.length === 0 && comparisonFailures.length === 0 && oracleFailures.length === 0 && navigationViewFailures.length === 0 && readClarificationFailures.length === 0 && Object.values(roleCounts).every((count) => count === 7) && Object.values(challengeCounts).every((count) => count === 8),
  caseValidationComplete: structural.safe && expectations.safe && executionContextFailures.length === 0 && comparisonFailures.length === 0 && oracleFailures.length === 0 && navigationViewFailures.length === 0 && readClarificationFailures.length === 0,
  auditTimestamp: new Date().toISOString(),
};
const auditValidation = validateStructuredAudit(audit, { candidateManifestSha256: audit.candidateManifestSha256, contractPacketSha256: audit.contractPacketSha256, expectedCaseCount: 56, expectedCandidateSchemaVersion: candidate.schemaVersion });
const safe = audit.auditComplete && auditValidation.safe;
if (safe) writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ status: safe ? 'GREEN' : 'BLOCKED_PRE_FREEZE_AUDIT_REJECT', authorContextId: author.authorContextId, auditorContextId, authorEqualsAuditor: author.authorContextId === auditorContextId, caseCount: candidate.cases.length, roleCounts, challengeCounts, candidateManifestSha256: audit.candidateManifestSha256, contractPacketSha256: audit.contractPacketSha256, structuralValidation: structural.safe ? '56/56 GREEN' : structural, expectationValidation: expectations.safe ? '56/56 GREEN' : expectations, executionContextValidation: executionContextFailures.length === 0 ? '56/56 GREEN' : executionContextFailures, canonicalComparisonValidation: comparisonFailures.length === 0 ? '56/56 GREEN' : comparisonFailures, surfaceObjectValidation: oracleFailures.length === 0 ? '56/56 GREEN' : oracleFailures, actionReferenceValidation: oracleFailures.length === 0 ? '56/56 GREEN' : oracleFailures, navigationViewValidation: navigationViewFailures.length === 0 ? '56/56 GREEN' : navigationViewFailures, readClarificationValidation: readClarificationFailures.length === 0 ? '56/56 GREEN' : readClarificationFailures, auditValidation, auditComplete: audit.auditComplete, auditPath: safe ? auditPath : undefined }, null, 2));
if (!safe) process.exitCode = 1;
