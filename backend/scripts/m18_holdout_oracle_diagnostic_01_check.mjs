import { readFileSync } from 'node:fs';
import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { loadContractPacket, validateCandidateExpectations, validateOracleAxes } from './lib/m18HoldoutGovernance.mjs';

const manifestPath = 'D:/servis-platform/.superpowers/sdd/2026-10-01-m18-typed-semantic-evidence-implementation-plan/m18-fresh-unseen-56-case-governed-v4-frozen-20261005.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const packetPath = 'D:/servis-platform/.superpowers/sdd/2026-10-01-m18-typed-semantic-evidence-implementation-plan/m18-holdout-contract-packet-v2.json';
const packet = loadContractPacket(readFileSync(packetPath));

const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const catalogUsers = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};

const labels = [...new Set(roles.flatMap((role) => listScreensForUser(catalogUsers[role]).map((screen) => screen.label.trim()).filter((label) => label.length >= 4)))]
  .sort((a, b) => b.length - a.length)
  .map((label) => label.toLocaleLowerCase('tr-TR'));
const defects = {
  explicitAsContextual: [],
  contextualAsExplicit: [],
  absentAsContextualReference: [],
  contextualReferenceAsAbsent: [],
  scopeReferenceCoupling: [],
  runtimeContextLeak: [],
  adjacent: [],
};

for (const testCase of manifest.cases) {
  const id = testCase.CASE_ID;
  const oracle = validateOracleAxes(testCase, packet);
  const reasons = new Set(oracle.failureReasons);
  if (reasons.has('EXPLICIT_SURFACE_MUST_BE_PRODUCT_EXPLICIT')) defects.explicitAsContextual.push(id);
  if (reasons.has('DEICTIC_SURFACE_CANNOT_BE_PRODUCT_EXPLICIT')) defects.contextualAsExplicit.push(id);
  if (reasons.has('NAMED_SURFACE_WITHOUT_DEICTIC_REFERENCE')) defects.absentAsContextualReference.push(id);
  if (reasons.has('DEICTIC_REFERENCE_CANNOT_BE_ABSENT')) defects.contextualReferenceAsAbsent.push(id);
  if (reasons.has('EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_SCOPE_INVALID') || reasons.has('EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_REFERENCE_INVALID')) defects.scopeReferenceCoupling.push(id);
  if (reasons.has('EXPLICIT_SURFACE_MUST_BE_PRODUCT_EXPLICIT') && testCase.EXECUTION_CONTEXT?.screen) defects.runtimeContextLeak.push(id);
  if (reasons.has('EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_SCOPE_INVALID') || reasons.has('EXPLICIT_SURFACE_DEICTIC_SUBREFERENCE_REFERENCE_INVALID')) defects.adjacent.push(id);
}

for (const key of Object.keys(defects)) defects[key] = [...new Set(defects[key])];
const allDefectIds = new Set(Object.values(defects).flat());
const candidateShape = {
  schemaVersion: manifest.schemaVersion,
  manifestId: manifest.manifestId,
  status: 'UNFROZEN_CANDIDATE',
  caseCount: manifest.caseCount,
  cases: manifest.cases,
};
const qualityGate = validateCandidateExpectations(candidateShape, packet);
const qualityGateCaseIds = new Set(qualityGate.failures.map((failure) => failure.caseId).filter(Boolean));
console.log(JSON.stringify({
  diagnosticCaseCount: manifest.cases.length,
  labelsDerivedFromCatalogCount: labels.length,
  explicitAsContextualDefectCount: defects.explicitAsContextual.length,
  contextualAsExplicitDefectCount: defects.contextualAsExplicit.length,
  absentAsContextualReferenceDefectCount: defects.absentAsContextualReference.length,
  contextualReferenceAsAbsentDefectCount: defects.contextualReferenceAsAbsent.length,
  scopeReferenceCouplingDefectCount: defects.scopeReferenceCoupling.length,
  runtimeContextLeakIntoOracleCount: defects.runtimeContextLeak.length,
  adjacentOracleDefectCount: defects.adjacent.length,
  totalOracleDefectCount: allDefectIds.size,
  correctedQualityGateRejected: qualityGate.safe === false,
  correctedQualityGateDefectCaseCount: qualityGateCaseIds.size,
  correctedQualityGateFailureReasonCount: qualityGate.failureReasons.length,
  case1NowRejectedPreFreeze: qualityGateCaseIds.has('M18-FRESH-001'),
  correctedQualityGateDetectedAllDiagnosticCases: [...allDefectIds].every((caseId) => qualityGateCaseIds.has(caseId)),
  knownV4OracleDefectDetectionRate: [...allDefectIds].every((caseId) => qualityGateCaseIds.has(caseId)) ? '100_PERCENT' : 'BELOW_100_PERCENT',
  affectedCaseIds: Object.fromEntries(Object.entries(defects).map(([key, value]) => [key, value])),
}, null, 2));
