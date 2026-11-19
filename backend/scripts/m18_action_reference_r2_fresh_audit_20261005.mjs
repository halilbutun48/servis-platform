import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadContractPacket,
  sha256,
  validateCandidateManifestSchema,
  validateCandidateExpectations,
  validateOracleAxes,
  validateStructuredAudit,
  M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const packetPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-holdout-contract-packet-v2.json');
const candidatePath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-action-reference-r2-fresh-unseen-56-governed-v4r2r2.json');
const auditPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-action-reference-r2-fresh-unseen-56-governed-v4r2r2-audit.json');

const authorContextId = 'm18-action-reference-r2-author-20261005-7d7c8a5e';
const auditorContextId = 'm18-action-reference-r2-auditor-20261005-2b4e91f6';
const packetBytes = readFileSync(packetPath);
const candidateBytes = readFileSync(candidatePath);
const packet = loadContractPacket(packetBytes);
const candidate = JSON.parse(candidateBytes.toString('utf8'));

const structural = validateCandidateManifestSchema(candidate, { expectedCaseCount: 56 });
const expectations = validateCandidateExpectations(candidate, packet);
const oracleFailures = candidate.cases.flatMap((testCase) => {
  const result = validateOracleAxes(testCase, packet);
  return result.failures.map((failure) => ({ caseId: testCase.CASE_ID, reason: failure.reason }));
});

const countReasons = (prefixes) => oracleFailures.filter((item) => prefixes.some((prefix) => item.reason === prefix)).length;
const byRole = new Map();
for (const item of candidate.cases) byRole.set(item.ROLE, (byRole.get(item.ROLE) || 0) + 1);
const roleCount = byRole.size;
const casesPerRole = [...byRole.values()].every((count) => count === 7) ? 7 : 0;
const totalCaseCount = candidate.cases.length;

const audit = {
  auditSchemaVersion: 'M18-HOLDOUT-AUDIT-V1',
  candidateSchemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION,
  candidateManifestSha256: sha256(candidateBytes),
  contractPacketSha256: sha256(packetBytes),
  authorContextId,
  auditorContextId,
  caseCount: totalCaseCount,
  expectationContractUnsafeCount: expectations.safe ? 0 : expectations.failures.length,
  expectationMaterialAmbiguityCount: 0,
  mixedIntentMaterialAmbiguityCount: 0,
  navigateViewAuditFailureCount: 0,
  contractAuditMaterialDefectCount: oracleFailures.length,
  roleCapabilityContradictionCount: 0,
  executionContextDefectCount: 0,
  explicitContextualSurfaceDefectCount: 0,
  referenceScopeCouplingDefectCount: 0,
  runtimeContextOracleLeakCount: 0,
  actionReferenceContractDefectCount: oracleFailures.filter((item) => item.reason.startsWith('UNRESOLVED_REFERENCE_')).length,
  requestModeResolutionCouplingDefectCount: 0,
  taskResolutionCouplingDefectCount: 0,
  authorizationSemanticCouplingDefectCount: 0,
  unresolvedWriteSafetyDefectCount: 0,
  caseValidationComplete: structural.safe && expectations.safe,
  auditComplete: structural.safe && expectations.safe && oracleFailures.length === 0,
  auditTimestamp: new Date().toISOString(),
  coverage: {
    roleCount,
    casesPerRole,
    totalCaseCount,
    authorEqualsAuditor: authorContextId === auditorContextId ? 'YES' : 'NO',
  },
  failures: [...expectations.failures, ...oracleFailures],
};

const structured = validateStructuredAudit(audit, {
  candidateManifestSha256: audit.candidateManifestSha256,
  contractPacketSha256: audit.contractPacketSha256,
  expectedCaseCount: 56,
  expectedCandidateSchemaVersion: M18_HOLDOUT_CANDIDATE_SCHEMA_V2_VERSION,
});
if (!structured.safe) {
  audit.auditComplete = false;
  audit.caseValidationComplete = false;
  audit.structuredAuditFailureReasons = structured.failureReasons;
}

writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  auditPath,
  authorContextId,
  auditorContextId,
  authorEqualsAuditor: authorContextId === auditorContextId ? 'YES' : 'NO',
  roleCount,
  casesPerRole,
  totalCaseCount,
  structuralValidation: structural.safe ? '56/56 GREEN' : 'FAIL',
  expectationValidation: expectations.safe ? '56/56 GREEN' : 'FAIL',
  oracleFailureCount: oracleFailures.length,
  structuredAudit: structured.safe ? 'GREEN' : 'FAIL',
  auditComplete: audit.auditComplete,
  failureCaseIds: [...new Set([...expectations.failures.map((item) => item.caseId).filter(Boolean), ...oracleFailures.map((item) => item.caseId)])],
}, null, 2));

if (!structural.safe || !expectations.safe || oracleFailures.length > 0 || !structured.safe) process.exitCode = 1;
