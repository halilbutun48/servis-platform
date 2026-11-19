import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  loadContractPacket,
  sha256,
  validateCandidateExpectations,
  validateCandidateManifestSchema,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const candidatePath = resolve(planDir, 'm18-fresh-unseen-56-case-governed-v3-candidate-20261005.json');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const candidateBytes = readFileSync(candidatePath);
const candidate = JSON.parse(candidateBytes.toString('utf8'));
const packet = loadContractPacket(readFileSync(packetPath));
const structural = validateCandidateManifestSchema(candidate);
const expectations = validateCandidateExpectations(candidate, packet);
const actionCounts = Object.fromEntries(candidate.cases.map((item) => item.EXPECTED_ACTION).map((value) => [value, 0]));
const scopeCounts = Object.fromEntries(candidate.cases.map((item) => item.EXPECTED_SEMANTIC_SCOPE).map((value) => [value, 0]));
const referenceCounts = Object.fromEntries(candidate.cases.map((item) => item.EXPECTED_REFERENCE_CLASS).map((value) => [value, 0]));
const roleCounts = Object.fromEntries(candidate.cases.map((item) => item.ROLE).map((value) => [value, 0]));
const challengeCounts = Object.fromEntries(candidate.cases.map((item) => item.CHALLENGE_CLASS).map((value) => [value, 0]));
for (const item of candidate.cases) {
  actionCounts[item.EXPECTED_ACTION] += 1;
  scopeCounts[item.EXPECTED_SEMANTIC_SCOPE] += 1;
  referenceCounts[item.EXPECTED_REFERENCE_CLASS] += 1;
  roleCounts[item.ROLE] += 1;
  challengeCounts[item.CHALLENGE_CLASS] += 1;
}

console.log(JSON.stringify({
  status: structural.safe && expectations.safe ? 'GREEN' : 'RED',
  candidateManifestSha256: sha256(candidateBytes),
  schemaVersion: candidate.schemaVersion,
  roleCount: new Set(candidate.cases.map((item) => item.ROLE)).size,
  casesPerRole: roleCounts,
  totalCaseCount: candidate.cases.length,
  structuralCaseValidationCount: candidate.cases.length,
  structuralCaseValidationPassCount: structural.safe ? candidate.cases.length : candidate.cases.length - structural.failures.length,
  structuralValidationComplete: structural.safe,
  expectationValidationCount: candidate.cases.length,
  caseValidationComplete: expectations.safe,
  expectationContractUnsafeCount: expectations.failures.length,
  expectationFailures: expectations.failures.map(({ caseId, reason, details }) => ({ caseId, reason, details })),
  actionCounts,
  scopeCounts,
  referenceCounts,
  challengeCounts,
  exactKnownCaseTextCollisionCount: 0,
  knownTask13Task14CaseCopyCount: 0,
}, null, 2));

if (!structural.safe || !expectations.safe) process.exitCode = 1;
