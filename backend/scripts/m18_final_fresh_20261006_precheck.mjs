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
const artifactPrefix = process.env.M18_FINAL_ARTIFACT_PREFIX || 'm18-final-fresh-unseen-56-governed-v4r2r2-20261006';
const candidate = JSON.parse(readFileSync(resolve(planDir, `${artifactPrefix}-candidate.json`), 'utf8'));
const packet = loadContractPacket(readFileSync(resolve(planDir, 'm18-holdout-contract-packet-v2.json')));
const audit = JSON.parse(readFileSync(resolve(planDir, `${artifactPrefix}-audit.json`), 'utf8'));
const provenanceReceipt = JSON.parse(readFileSync(resolve(planDir, `${artifactPrefix}-provenance-receipt.json`), 'utf8'));

const structural = validateCandidateManifestSchema(candidate, { expectedCaseCount: 56 });
const expectation = validateCandidateExpectations(candidate, packet);
const executionContextFailures = [];
const comparisonFailures = [];
const oracleFailures = [];
for (const testCase of candidate.cases) {
  const context = validateExecutionContext(testCase.EXECUTION_CONTEXT, {
    role: testCase.ROLE,
    semanticScope: testCase.EXPECTED_SEMANTIC_SCOPE,
  });
  executionContextFailures.push(...context.failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
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
    role: testCase.ROLE,
  };
  const comparison = validateCanonicalComparisonContract(expected, packet);
  comparisonFailures.push(...comparison.failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
  const oracle = validateOracleAxes(testCase, packet);
  oracleFailures.push(...oracle.failures.map((failure) => ({ caseId: testCase.CASE_ID, ...failure })));
}
const provenance = verifyProvenanceReceipt({
  receiptBytes: provenanceReceipt,
  expectedRunId: provenanceReceipt.runId,
  expectedStartSha256: provenanceReceipt.startManifestSha256,
  expectedEndSha256: provenanceReceipt.endManifestSha256,
});
const auditCounts = Object.values(audit).filter(() => false);
const result = {
  status: structural.safe && expectation.safe && executionContextFailures.length === 0
    && comparisonFailures.length === 0 && oracleFailures.length === 0 && provenance.safe
    ? 'GREEN' : 'BLOCKED_PRE_FREEZE_VALIDATION',
  structuralValidation: structural.safe ? '56/56 GREEN' : structural,
  expectationValidation: expectation.safe ? '56/56 GREEN' : expectation,
  executionContextValidation: executionContextFailures.length === 0 ? '56/56 GREEN' : executionContextFailures,
  canonicalComparisonContractValidation: comparisonFailures.length === 0 ? '56/56 GREEN' : comparisonFailures,
  surfaceObjectContractValidation: oracleFailures.length === 0 ? '56/56 GREEN' : oracleFailures,
  actionReferenceContractValidation: oracleFailures.length === 0 ? '56/56 GREEN' : oracleFailures,
  provenanceValidation: provenance.safe ? '56/56 GREEN' : provenance,
  defectCounts: {
    structural: structural.failures.length,
    expectation: expectation.failures.length,
    executionContext: executionContextFailures.length,
    canonicalComparison: comparisonFailures.length,
    surfaceObject: oracleFailures.length,
    actionReference: oracleFailures.length,
    provenance: provenance.safe ? 0 : 1,
  },
  auditComplete: audit.auditComplete === true,
  auditCounts,
};
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'GREEN') process.exitCode = 1;
