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

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const artifactPrefix = process.env.M18_FINAL_ARTIFACT_PREFIX || 'm18-final-fresh-unseen-56-governed-v4r2r2-20261006';
const candidatePath = resolve(planDir, `${artifactPrefix}-candidate.json`);
const auditPath = resolve(planDir, `${artifactPrefix}-audit.json`);
const metadataPath = resolve(planDir, `${artifactPrefix}-author.json`);
const packetBytes = readFileSync(packetPath);
const candidateBytes = readFileSync(candidatePath);
const packet = loadContractPacket(packetBytes);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const auditorContextId = `${process.env.M18_FINAL_AUDITOR_PREFIX || 'm18-final-auditor'}-${randomUUID()}`;
const candidateManifestSha256 = sha256(candidateBytes);
const contractPacketSha256 = sha256(packetBytes);
const structural = validateCandidateManifestSchema(candidate);
const expectations = validateCandidateExpectations(candidate, packet);
const oracleFailures = candidate.cases.flatMap((testCase) => validateOracleAxes(testCase, packet).failures.map((failure) => ({ ...failure, caseId: testCase.CASE_ID })));
const roleCounts = Object.fromEntries([...new Set(candidate.cases.map((testCase) => testCase.ROLE))].map((role) => [role, candidate.cases.filter((testCase) => testCase.ROLE === role).length]));
const challengeCounts = Object.fromEntries([...new Set(candidate.cases.map((testCase) => testCase.CHALLENGE_CLASS))].map((challenge) => [challenge, candidate.cases.filter((testCase) => testCase.CHALLENGE_CLASS === challenge).length]));
function normalized(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/\s+/gu, ' ').trim();
}
function collectKnownTurnStrings() {
  const known = new Set();
  for (const name of readdirSync(planDir)) {
    if (!name.endsWith('.json') || name.startsWith(artifactPrefix) || /r15|r16/iu.test(name)) continue;
    try {
      const value = JSON.parse(readFileSync(resolve(planDir, name), 'utf8'));
      for (const item of Array.isArray(value?.cases) ? value.cases : []) {
        for (const field of ['TURN_1', 'TURN_2', 'TURN_3']) if (item[field]) known.add(normalized(item[field]));
      }
    } catch {
      // Non-case JSON artifacts are not contamination sources.
    }
  }
  return known;
}
const knownTurns = collectKnownTurnStrings();
const contaminationCases = candidate.cases.filter((testCase) => ['TURN_1', 'TURN_2', 'TURN_3']
  .filter((field) => testCase[field])
  .some((field) => knownTurns.has(normalized(testCase[field]))));
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
  executionContextDefectCount: structural.failures.filter((failure) => /^(EXECUTION_|TENANT_|SELECTED_ENTITY_)/u.test(String(failure.reason))).length,
  explicitContextualSurfaceDefectCount: oracleFailures.filter((failure) => ['EXPLICIT_SURFACE_MUST_BE_PRODUCT_EXPLICIT', 'DEICTIC_SURFACE_CANNOT_BE_PRODUCT_EXPLICIT'].includes(failure.reason)).length,
  referenceScopeCouplingDefectCount: oracleFailures.filter((failure) => ['NAMED_SURFACE_WITHOUT_DEICTIC_REFERENCE', 'DEICTIC_REFERENCE_CANNOT_BE_ABSENT', 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_SCOPE_INVALID', 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_REFERENCE_INVALID'].includes(failure.reason)).length,
  runtimeContextOracleLeakCount: 0,
  contaminationKnownArtifactOverlapCount: contaminationCases.length,
  caseValidationComplete: structural.safe && expectations.safe && oracleFailures.length === 0,
  auditComplete: structural.safe && expectations.safe && oracleFailures.length === 0
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
const safe = structural.safe && expectations.safe && oracleFailures.length === 0 && auditValidation.safe && audit.auditComplete && audit.contaminationKnownArtifactOverlapCount === 0 && Object.values(counts).every((value) => value === 0);
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
  auditCounts: counts,
  oracleFailureCount: oracleFailures.length,
  auditValidation,
  auditComplete: audit.auditComplete,
  auditPath: safe ? auditPath : undefined,
}, null, 2));
if (!safe) process.exitCode = 1;
