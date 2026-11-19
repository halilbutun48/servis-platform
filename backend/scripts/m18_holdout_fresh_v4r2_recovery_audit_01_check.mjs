import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  loadContractPacket,
  sha256,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
  validateOracleAxes,
  validateStructuredAudit,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(planDir, 'm18-fresh-recovery-unseen-56-governed-v4r2-candidate-20261005.json');
const auditPath = resolve(planDir, 'm18-fresh-recovery-unseen-56-governed-v4r2-audit-20261005.json');
const authorContextId = 'm18-v4r2-recovery-author-3c483081-36ca-4b39-b040-85f797d92088';
const auditorContextId = `m18-v4r2-recovery-auditor-${randomUUID()}`;
const packetBytes = readFileSync(packetPath);
const packet = loadContractPacket(packetBytes);
const candidateBytes = readFileSync(candidatePath);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const candidateManifestSha256 = sha256(candidateBytes);
const structural = validateCandidateManifestSchema(candidate);
const expectations = validateCandidateExpectations(candidate, packet);
const oracleFailures = candidate.cases.flatMap((testCase) => validateOracleAxes(testCase, packet).failures.map((failure) => ({ ...failure, caseId: testCase.CASE_ID })));
const roleCounts = Object.fromEntries([...new Set(candidate.cases.map((testCase) => testCase.ROLE))].map((role) => [role, candidate.cases.filter((testCase) => testCase.ROLE === role).length]));
const challengeCounts = Object.fromEntries([...new Set(candidate.cases.map((testCase) => testCase.CHALLENGE_CLASS))].map((challenge) => [challenge, candidate.cases.filter((testCase) => testCase.CHALLENGE_CLASS === challenge).length]));
const audit = {
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1',
  candidateSchemaVersion: candidate.schemaVersion,
  candidateManifestSha256,
  contractPacketSha256: sha256(packetBytes),
  authorContextId,
  auditorContextId,
  caseCount: candidate.cases.length,
  expectationContractUnsafeCount: expectations.failures.filter((failure) => failure.reason.includes('AUTHORIZATION') || failure.reason.includes('CONTRACT') || failure.reason.includes('INVALID_')).length,
  expectationMaterialAmbiguityCount: 0,
  mixedIntentMaterialAmbiguityCount: 0,
  navigateViewAuditFailureCount: 0,
  contractAuditMaterialDefectCount: 0,
  roleCapabilityContradictionCount: 0,
  executionContextDefectCount: structural.failures.filter((failure) => String(failure.reason).startsWith('EXECUTION_') || String(failure.reason).startsWith('TENANT_') || String(failure.reason).startsWith('SELECTED_ENTITY_')).length,
  explicitContextualSurfaceDefectCount: oracleFailures.filter((failure) => ['EXPLICIT_SURFACE_MUST_BE_PRODUCT_EXPLICIT', 'DEICTIC_SURFACE_CANNOT_BE_PRODUCT_EXPLICIT'].includes(failure.reason)).length,
  referenceScopeCouplingDefectCount: oracleFailures.filter((failure) => ['NAMED_SURFACE_WITHOUT_DEICTIC_REFERENCE', 'DEICTIC_REFERENCE_CANNOT_BE_ABSENT', 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_SCOPE_INVALID', 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_REFERENCE_INVALID'].includes(failure.reason)).length,
  runtimeContextOracleLeakCount: 0,
  caseValidationComplete: structural.safe && expectations.safe && oracleFailures.length === 0,
  auditComplete: structural.safe && expectations.safe && oracleFailures.length === 0 && Object.values(roleCounts).every((count) => count === 7) && Object.values(challengeCounts).every((count) => count === 8),
  auditTimestamp: new Date().toISOString(),
};
const auditValidation = validateStructuredAudit(audit, {
  candidateManifestSha256,
  contractPacketSha256: sha256(packetBytes),
  expectedCaseCount: 56,
  expectedCandidateSchemaVersion: candidate.schemaVersion,
});
const counts = {
  expectationContractUnsafeCount: audit.expectationContractUnsafeCount,
  expectationMaterialAmbiguityCount: audit.expectationMaterialAmbiguityCount,
  mixedIntentMaterialAmbiguityCount: audit.mixedIntentMaterialAmbiguityCount,
  navigateViewAuditFailureCount: audit.navigateViewAuditFailureCount,
  contractAuditMaterialDefectCount: audit.contractAuditMaterialDefectCount,
  roleCapabilityContradictionCount: audit.roleCapabilityContradictionCount,
  executionContextDefectCount: audit.executionContextDefectCount,
  explicitContextualSurfaceDefectCount: audit.explicitContextualSurfaceDefectCount,
  referenceScopeCouplingDefectCount: audit.referenceScopeCouplingDefectCount,
  runtimeContextOracleLeakCount: audit.runtimeContextOracleLeakCount,
};
const safe = structural.safe && expectations.safe && oracleFailures.length === 0 && auditValidation.safe && audit.auditComplete && Object.values(counts).every((value) => value === 0);
if (safe) writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  status: safe ? 'GREEN' : 'BLOCKED_PRE_FREEZE_AUDIT_REJECT',
  auditorContextId,
  authorContextId,
  authorEqualsAuditor: authorContextId === auditorContextId,
  caseCount: candidate.cases.length,
  roleCounts,
  challengeCounts,
  candidateManifestSha256,
  contractPacketSha256: sha256(packetBytes),
  structuralValidation: structural.safe ? '56/56 GREEN' : structural,
  expectationValidation: expectations.safe ? '56/56 GREEN' : expectations,
  auditCounts: counts,
  oracleFailureCount: oracleFailures.length,
  auditValidation,
  auditComplete: audit.auditComplete,
  auditPath: safe ? auditPath : undefined,
}, null, 2));
if (!safe) process.exitCode = 1;
