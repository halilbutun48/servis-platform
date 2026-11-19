import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadContractPacket,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
  validateCanonicalComparisonContract,
  validateExecutionContext,
  validateOracleAxes,
} from './lib/m18HoldoutGovernance.mjs';
import { verifyProvenanceReceipt } from './lib/m18RunScopedProvenance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const candidate = JSON.parse(readFileSync(resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-candidate.json'), 'utf8'));
const packetBytes = readFileSync(resolve(planDir, 'm18-holdout-contract-packet-v2.json'));
const packet = loadContractPacket(packetBytes);
const audit = JSON.parse(readFileSync(resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-audit.json'), 'utf8'));
const provenanceReceipt = JSON.parse(readFileSync(resolve(planDir, 'm18-vcd-replacement-fresh-unseen-56-governed-20261006-provenance-receipt.json'), 'utf8'));
const structural = validateCandidateManifestSchema(candidate, { expectedCaseCount: 56 });
const expectation = validateCandidateExpectations(candidate, packet);
const executionContextFailures = [];
const comparisonFailures = [];
const oracleFailures = [];
for (const testCase of candidate.cases) {
  executionContextFailures.push(...validateExecutionContext(testCase.EXECUTION_CONTEXT, {
    role: testCase.ROLE,
    semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE,
  }).failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
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
const provenance = verifyProvenanceReceipt({
  receiptBytes: provenanceReceipt,
  expectedRunId: provenanceReceipt.runId,
  expectedStartSha256: provenanceReceipt.startManifestSha256,
  expectedEndSha256: provenanceReceipt.endManifestSha256,
});
const result = {
  status: structural.safe && expectation.safe && executionContextFailures.length === 0
    && comparisonFailures.length === 0 && oracleFailures.length === 0 && provenance.safe && audit.auditComplete === true
    ? 'GREEN' : 'BLOCKED_PRE_FREEZE_VALIDATION',
  structuralValidation: structural.safe ? '56/56 GREEN' : structural,
  expectationValidation: expectation.safe ? '56/56 GREEN' : expectation,
  executionContextValidation: executionContextFailures.length === 0 ? '56/56 GREEN' : executionContextFailures,
  canonicalComparisonContractValidation: comparisonFailures.length === 0 ? '56/56 GREEN' : comparisonFailures,
  surfaceObjectContractValidation: oracleFailures.length === 0 ? '56/56 GREEN' : oracleFailures,
  actionReferenceContractValidation: oracleFailures.length === 0 ? '56/56 GREEN' : oracleFailures,
  provenanceValidation: provenance.safe ? '56/56 GREEN' : provenance,
  auditComplete: audit.auditComplete === true,
  defectCounts: {
    structural: structural.failures.length,
    expectation: expectation.failures.length,
    executionContext: executionContextFailures.length,
    canonicalComparison: comparisonFailures.length,
    surfaceObject: oracleFailures.length,
    actionReference: oracleFailures.length,
    provenance: provenance.safe ? 0 : 1,
  },
  preFreezeBatchCorrectionCount: 0,
};
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'GREEN') process.exitCode = 1;
