import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';
import {
  extractCanonicalActual,
} from './lib/m18HoldoutExecutionAdapter.mjs';
import {
  loadContractPacket,
  validateCandidateExpectations,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const manifestPath = resolve(planDir, 'm18-surface-object-r1-fresh-unseen-56-governed-v4r2r1-frozen-20261005.json');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const packet = loadContractPacket(readFileSync(packetPath));

const users = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};
const knownRequestModes = new Set(packet.canonicalProjections.productAmbiguous.knownActionRequestModes);
const rows = [];

for (const testCase of manifest.cases) {
  const message = [testCase.TURN_1, testCase.TURN_2, testCase.TURN_3].filter(Boolean).join(' ');
  const user = users[testCase.ROLE];
  const resolved = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext: testCase.EXECUTION_CONTEXT?.screen || null,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  const authorization = await authorizeSemanticRequest({ user, request: resolved.request, plan: {} });
  const actual = extractCanonicalActual({
    semanticPlan: {
      canonicalRequestEnvelope: { request: resolved.request, canonicalShape: resolved.canonicalShape },
      authorizationDecision: authorization,
    },
  });
  const defectSet = new Set();
  const ambiguous = testCase.EXPECTED_SEMANTIC_SCOPE === 'PRODUCT_AMBIGUOUS' && testCase.EXPECTED_REFERENCE_CLASS === 'UNRESOLVED';
  const knownAction = ambiguous && knownRequestModes.has(String(actual.requestMode).toUpperCase());
  if (knownAction && testCase.EXPECTED_REQUEST_MODE === 'UNRESOLVED') defectSet.add('KNOWN_ACTION_AS_UNRESOLVED_MODE');
  if (ambiguous && testCase.EXPECTED_TASK_OR_TASK_FAMILY === 'CLARIFY' && actual.task === 'NONE') defectSet.add('UNRESOLVED_REFERENCE_TASK_COUPLING');
  if (ambiguous && testCase.EXPECTED_AUTHORIZATION_CLASS === 'SEMANTIC_CLARIFICATION' && actual.authorizationNativeStatus === 'AUTHORIZED') defectSet.add('UNRESOLVED_REFERENCE_AUTH_COUPLING');
  if (ambiguous && testCase.EXPECTED_AUTHORIZATION_CLASS === 'SEMANTIC_CLARIFICATION' && actual.authorizationNativeStatus === 'AUTHORIZED') defectSet.add('AUTH_SEMANTIC_RESOLUTION_COUPLING');
  if (ambiguous && !knownAction && testCase.EXPECTED_REQUEST_MODE === 'UNRESOLVED' && actual.requestMode !== 'UNRESOLVED') defectSet.add('PURE_AMBIGUITY_MODE');
  if (knownAction) defectSet.add('KNOWN_ACTION_REFERENCE_AXIS');
  if (ambiguous && testCase.EXPECTED_OPERATION_OR_OPERATION_FAMILY === 'CLARIFY_SEMANTIC_REQUEST' && actual.operation !== 'CLARIFY_SEMANTIC_REQUEST') defectSet.add('CLARIFICATION_OPERATION_CONTRACT');
  if (ambiguous && actual.operation !== 'CLARIFY_SEMANTIC_REQUEST') defectSet.add('UNRESOLVED_WRITE_SAFETY');
  rows.push({ caseId: testCase.CASE_ID, actual, defectSet: [...defectSet] });
}

const count = (name) => rows.filter((row) => row.defectSet.includes(name)).length;
const affected = (name) => rows.filter((row) => row.defectSet.includes(name)).map((row) => row.caseId);
const unique = new Set(rows.filter((row) => row.defectSet.length > 0).map((row) => row.caseId));
const validation = validateCandidateExpectations(manifest, packet);

const report = {
  diagnosticCaseCount: manifest.cases.length,
  knownActionAsUnresolvedModeDefectCount: count('KNOWN_ACTION_AS_UNRESOLVED_MODE'),
  unresolvedReferenceTaskCouplingDefectCount: count('UNRESOLVED_REFERENCE_TASK_COUPLING'),
  unresolvedReferenceAuthCouplingDefectCount: count('UNRESOLVED_REFERENCE_AUTH_COUPLING'),
  authSemanticResolutionCouplingDefectCount: count('AUTH_SEMANTIC_RESOLUTION_COUPLING'),
  pureAmbiguityModeDefectCount: count('PURE_AMBIGUITY_MODE'),
  knownActionReferenceAxisDefectCount: count('KNOWN_ACTION_REFERENCE_AXIS'),
  clarificationOperationContractDefectCount: count('CLARIFICATION_OPERATION_CONTRACT'),
  unresolvedWriteSafetyDefectCount: count('UNRESOLVED_WRITE_SAFETY'),
  totalUniqueReferenceActionContractDefectCaseCount: unique.size,
  affectedCaseIds: {
    knownActionAsUnresolvedMode: affected('KNOWN_ACTION_AS_UNRESOLVED_MODE'),
    unresolvedReferenceTaskCoupling: affected('UNRESOLVED_REFERENCE_TASK_COUPLING'),
    unresolvedReferenceAuthCoupling: affected('UNRESOLVED_REFERENCE_AUTH_COUPLING'),
    authSemanticResolutionCoupling: affected('AUTH_SEMANTIC_RESOLUTION_COUPLING'),
    knownActionReferenceAxis: affected('KNOWN_ACTION_REFERENCE_AXIS'),
  },
  m18R4Case3NowRejectedPreFreeze: validation.safe ? 'NO' : 'YES',
  validatorFailureCount: validation.failures.length,
  validatorFailureCaseIds: [...new Set(validation.failures.map((failure) => failure.caseId).filter(Boolean))],
};
console.log(JSON.stringify(report, null, 2));
