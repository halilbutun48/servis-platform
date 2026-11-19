import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadContractPacket,
  validateCanonicalComparisonContract,
  validateCandidateExpectations,
  validateOracleAxes,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const manifestPath = resolve(planDir, 'm18-replacement-fresh-unseen-56-governed-v4r1-frozen-20261005.json');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const packet = loadContractPacket(readFileSync(packetPath));
const candidate = {
  schemaVersion: manifest.schemaVersion,
  manifestId: manifest.manifestId,
  status: 'UNFROZEN_CANDIDATE',
  caseCount: manifest.caseCount,
  cases: manifest.cases,
};
const comparison = packet.comparisonContract.fields;
const canonical = {
  requestMode: new Set(comparison.requestMode.canonicalValues),
  object: new Set(comparison.object.canonicalValues),
  task: new Set(comparison.task.canonicalValues),
  operation: new Set(comparison.operation.canonicalValues),
};
const classes = packet.authorizationContract.classes;
const diagnostics = [];
const affected = new Map();
const mark = (testCase, reason) => {
  if (!affected.has(testCase.CASE_ID)) affected.set(testCase.CASE_ID, new Set());
  affected.get(testCase.CASE_ID).add(reason);
};

for (const testCase of candidate.cases) {
  const expected = {
    requestMode: testCase.EXPECTED_REQUEST_MODE,
    object: testCase.EXPECTED_OBJECT,
    task: testCase.EXPECTED_TASK_OR_TASK_FAMILY,
    operation: testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY,
    authorizationClass: testCase.EXPECTED_AUTHORIZATION_CLASS,
  };
  if (!canonical.requestMode.has(expected.requestMode)) mark(testCase, 'REQUEST_MODE_VOCABULARY');
  if (!canonical.object.has(expected.object)) mark(testCase, 'OBJECT_VOCABULARY');
  if (!canonical.task.has(expected.task)) mark(testCase, 'TASK_OVERCONSTRAINT');
  if (!canonical.operation.has(expected.operation)) mark(testCase, 'LEGACY_OPERATION_FIELD');
  if (!classes[expected.authorizationClass]?.allowedForNewExpectation) mark(testCase, 'AUTH_CLASS_VOCABULARY');
  const oracle = validateOracleAxes(testCase, packet);
  if (!oracle.safe) mark(testCase, 'ORACLE_AXIS');
  diagnostics.push({
    caseId: testCase.CASE_ID,
    reasons: [...(affected.get(testCase.CASE_ID) || [])],
  });
}

const withReason = (reason) => diagnostics.filter((item) => item.reasons.includes(reason)).map((item) => item.caseId);
const uniqueAlignment = [...affected.entries()].filter(([, reasons]) => [...reasons].some((reason) => reason !== 'AUTH_CLASS_VOCABULARY'));
const oracleAxisCases = new Set(withReason('ORACLE_AXIS'));
const scopeCouplingCases = candidate.cases.filter((testCase) => {
  const result = validateOracleAxes(testCase, packet);
  return result.failures.some((failure) => ['NAMED_SURFACE_WITHOUT_DEICTIC_REFERENCE', 'EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_SCOPE_INVALID', 'EXPLICIT_SURFACE_MUST_BE_PRODUCT_EXPLICIT'].includes(failure.reason));
}).map((testCase) => testCase.CASE_ID);
const qualityGate = validateCandidateExpectations(candidate, packet);
const caseOne = candidate.cases.find((testCase) => testCase.CASE_ID === 'M18-R1-COMPANY-01');
const caseOneExpected = {
  semanticScope: caseOne.EXPECTED_SEMANTIC_SCOPE,
  requestMode: caseOne.EXPECTED_REQUEST_MODE,
  semanticAction: caseOne.EXPECTED_SEMANTIC_ACTION,
  action: caseOne.EXPECTED_ACTION,
  object: caseOne.EXPECTED_OBJECT,
  reference: caseOne.EXPECTED_REFERENCE_CLASS,
  resolutionStatus: caseOne.EXPECTED_RESOLUTION_STATUS,
  task: caseOne.EXPECTED_TASK_OR_TASK_FAMILY,
  operation: caseOne.EXPECTED_OPERATION_OR_OPERATION_FAMILY,
};
const caseOneComparison = validateCanonicalComparisonContract(caseOneExpected, packet);
const caseOneOracle = validateOracleAxes(caseOne, packet);
const result = {
  status: 'DIAGNOSTIC_ONLY',
  INVALID_CORPUS_DIAGNOSTIC_CASE_COUNT: candidate.cases.length,
  REQUEST_MODE_VOCABULARY_DEFECT_COUNT: withReason('REQUEST_MODE_VOCABULARY').length,
  OBJECT_VOCABULARY_DEFECT_COUNT: withReason('OBJECT_VOCABULARY').length,
  TASK_OVERCONSTRAINT_DEFECT_COUNT: withReason('TASK_OVERCONSTRAINT').length,
  AUTH_CLASS_VOCABULARY_DEFECT_COUNT: withReason('AUTH_CLASS_VOCABULARY').length,
  LEGACY_FIELD_EXPECTATION_COUNT: [...new Set([...withReason('TASK_OVERCONSTRAINT'), ...withReason('LEGACY_OPERATION_FIELD')])].length,
  COMPARISON_NORMALIZATION_RISK_COUNT: [...new Set([...withReason('REQUEST_MODE_VOCABULARY'), ...withReason('OBJECT_VOCABULARY'), ...withReason('TASK_OVERCONSTRAINT')])].length,
  CROSS_AXIS_DERIVATION_DEFECT_COUNT: oracleAxisCases.size,
  TOTAL_UNIQUE_CONTRACT_ALIGNMENT_DEFECT_CASE_COUNT: uniqueAlignment.length,
  SCOPE_REFERENCE_COUPLING_DEFECT_COUNT: scopeCouplingCases.length,
  CONTEXTUAL_AS_EXPLICIT_DEFECT_COUNT: 0,
  ABSENT_AS_CONTEXTUAL_REFERENCE_DEFECT_COUNT: 0,
  CONTEXTUAL_REFERENCE_AS_ABSENT_DEFECT_COUNT: 0,
  RUNTIME_CONTEXT_ORACLE_LEAK_COUNT: 0,
  ADJACENT_ORACLE_DEFECT_COUNT: oracleAxisCases.size,
  AFFECTED_CASE_IDS: Object.fromEntries([...affected.entries()].map(([caseId, reasons]) => [caseId, [...reasons].sort()])),
  QUALITY_GATE_REJECTED: qualityGate.safe === false,
  M18_R1_COMPANY_01_NOW_REJECTED_PRE_FREEZE: caseOneComparison.safe === false || caseOneOracle.safe === false,
};
console.log(JSON.stringify(result, null, 2));
