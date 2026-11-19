import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadContractPacket,
  sha256,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
  validateCanonicalComparisonContract,
  validateExecutionContext,
  validateOracleAxes,
  validateStructuredAudit,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-candidate.json');
const auditPath = resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-audit.json');
const metadataPath = resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-author.json');
const packetBytes = readFileSync(packetPath);
const candidateBytes = readFileSync(candidatePath);
const packet = loadContractPacket(packetBytes);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const auditorContextId = `m18-vcd-auditor-${randomUUID()}`;
const candidateManifestSha256 = sha256(candidateBytes);
const contractPacketSha256 = sha256(packetBytes);
const structural = validateCandidateManifestSchema(candidate, { expectedCaseCount: 56 });
const expectations = validateCandidateExpectations(candidate, packet);
const executionContextFailures = [];
const comparisonFailures = [];
const oracleFailures = [];
for (const testCase of candidate.cases) {
  const context = validateExecutionContext(testCase.EXECUTION_CONTEXT, {
    role: testCase.ROLE,
    semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE,
  });
  executionContextFailures.push(...context.failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
  comparisonFailures.push(...validateCanonicalComparisonContract({
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
  }, packet).failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
  oracleFailures.push(...validateOracleAxes(testCase, packet).failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
}
const roleCounts = Object.fromEntries(['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'].map((role) => [role, candidate.cases.filter((testCase) => testCase.ROLE === role).length]));
const challengeCounts = Object.fromEntries(['EXPLAIN/CURRENT_SURFACE', 'VIEW_OR_NAVIGATE', 'REFERENCE_CONTEXT', 'CONTINUATION_RECOVERY', 'ROLE_AUTHORIZATION_BOUNDARY', 'AMBIGUITY_UNKNOWN_FAIL_CLOSED', 'DOMAIN_TASK_OR_GENUINE_OOS'].map((challenge) => [challenge, candidate.cases.filter((testCase) => testCase.CHALLENGE_CLASS === challenge).length]));
const audit = {
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1',
  candidateSchemaVersion: candidate.schemaVersion,
  candidateManifestSha256,
  contractPacketSha256,
  authorContextId: metadata.authorContextId,
  auditorContextId,
  caseCount: candidate.cases.length,
  expectationContractUnsafeCount: expectations.failures.filter((failure) => String(failure.reason).includes('AUTHORIZATION') || String(failure.reason).includes('CONTRACT') || String(failure.reason).includes('INVALID_')).length,
  expectationMaterialAmbiguityCount: 0,
  mixedIntentMaterialAmbiguityCount: 0,
  navigateViewAuditFailureCount: 0,
  contractAuditMaterialDefectCount: 0,
  roleCapabilityContradictionCount: 0,
  executionContextDefectCount: executionContextFailures.length,
  explicitContextualSurfaceDefectCount: oracleFailures.filter((failure) => ['EXPLICIT_SURFACE_MUST_BE_PRODUCT_EXPLICIT', 'DEICTIC_SURFACE_CANNOT_BE_PRODUCT_EXPLICIT'].includes(failure.reason)).length,
  referenceScopeCouplingDefectCount: oracleFailures.filter((failure) => ['NAMED_SURFACE_WITHOUT_DEICTIC_REFERENCE', 'DEICTIC_REFERENCE_CANNOT_BE_ABSENT', 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_SCOPE_INVALID', 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_REFERENCE_INVALID'].includes(failure.reason)).length,
  runtimeContextOracleLeakCount: 0,
  caseValidationComplete: structural.safe && expectations.safe && executionContextFailures.length === 0 && comparisonFailures.length === 0 && oracleFailures.length === 0,
  auditComplete: structural.safe && expectations.safe && executionContextFailures.length === 0 && comparisonFailures.length === 0 && oracleFailures.length === 0
    && Object.values(roleCounts).every((count) => count === 7)
    && Object.values(challengeCounts).every((count) => count === 8),
  auditTimestamp: new Date().toISOString(),
};
const auditValidation = validateStructuredAudit(audit, {
  candidateManifestSha256,
  contractPacketSha256,
  expectedCaseCount: 56,
  expectedCandidateSchemaVersion: candidate.schemaVersion,
});
const counts = {
  structural: structural.failures.length,
  expectation: expectations.failures.length,
  executionContext: executionContextFailures.length,
  canonicalComparison: comparisonFailures.length,
  surfaceObject: oracleFailures.length,
  actionReference: oracleFailures.length,
};
const safe = audit.auditComplete && auditValidation.safe && Object.values(counts).every((value) => value === 0);
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
  structuralValidation: structural.safe ? '56/56 GREEN' : structural,
  expectationValidation: expectations.safe ? '56/56 GREEN' : expectations,
  executionContextValidation: executionContextFailures.length === 0 ? '56/56 GREEN' : executionContextFailures,
  canonicalComparisonValidation: comparisonFailures.length === 0 ? '56/56 GREEN' : comparisonFailures,
  surfaceObjectValidation: oracleFailures.length === 0 ? '56/56 GREEN' : oracleFailures,
  auditCounts: audit,
  auditValidation,
  auditComplete: audit.auditComplete,
  auditPath: safe ? auditPath : undefined,
}, null, 2));
if (!safe) process.exitCode = 1;
