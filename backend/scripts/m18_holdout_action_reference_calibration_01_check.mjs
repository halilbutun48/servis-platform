import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadContractPacket,
  validateExpectationContract,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const planDir = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan');
const packetPath = resolve(planDir, 'm18-holdout-contract-packet-v2.json');
const packet = loadContractPacket(readFileSync(packetPath));

const base = (overrides = {}) => ({
  semanticScope: 'PRODUCT_AMBIGUOUS',
  requestMode: 'UPDATE',
  semanticAction: 'NONE',
  action: 'NONE',
  object: null,
  reference: 'UNRESOLVED',
  resolutionStatus: 'UNRESOLVED',
  task: 'NONE',
  operation: 'CLARIFY_SEMANTIC_REQUEST',
  authorizationClass: 'NOT_APPLICABLE',
  contractSourceClass: 'REFERENCE_CONTRACT',
  role: 'COMPANY',
  ...overrides,
});

const cases = [
  ['UPDATE + unresolved reference preserves known mode', base()],
  ['VIEW + unresolved reference preserves known mode', base({ requestMode: 'VIEW' })],
  ['NAVIGATE + unresolved target preserves known mode', base({ requestMode: 'NAVIGATE' })],
  ['CREATE + unresolved target preserves known mode', base({ requestMode: 'CREATE' })],
  ['DELETE + unresolved target preserves known mode', base({ requestMode: 'DELETE' })],
  ['no known action keeps unresolved mode', base({ requestMode: 'UNRESOLVED' })],
  ['pure ambiguity uses absent task metadata', base({ requestMode: 'UNRESOLVED' })],
  ['pure ambiguity is not authorization denial', base({ requestMode: 'UNRESOLVED' })],
  ['unresolved reference does not force unresolved mode', base({ requestMode: 'UPDATE' })],
  ['unresolved reference does not force clarify task', base({ requestMode: 'UPDATE', task: 'NONE' })],
  ['semantic resolution and authorization remain distinct', base({ requestMode: 'UPDATE', authorizationClass: 'NOT_APPLICABLE' })],
  ['native allow cannot execute unresolved write', base({ requestMode: 'UPDATE', operation: 'CLARIFY_SEMANTIC_REQUEST' })],
  ['clarification operation remains write-blocked', base({ requestMode: 'DELETE', operation: 'CLARIFY_SEMANTIC_REQUEST' })],
  ['resolved authorized UPDATE remains authorized', base({
    semanticScope: 'PRODUCT_EXPLICIT', requestMode: 'UPDATE', semanticAction: 'UPDATE', action: 'UPDATE', object: 'RECORD',
    reference: 'VALID_UNIQUE', resolutionStatus: 'RESOLVED', task: 'NONE', operation: 'EXPLAIN_RECORD_DETAILS', authorizationClass: 'AUTHORIZED_OPERATION',
  })],
  ['unauthorized UPDATE remains semantic intent with denial', base({
    semanticScope: 'PRODUCT_EXPLICIT', requestMode: 'UPDATE', semanticAction: 'UPDATE', action: 'UPDATE', object: 'RECORD',
    reference: 'VALID_UNIQUE', resolutionStatus: 'RESOLVED', task: 'NONE', operation: 'EXPLAIN_RECORD_DETAILS', authorizationClass: 'AUTHORIZATION_DENIAL',
  })],
  ['negated UPDATE does not invent a resolved target', base({ requestMode: 'UPDATE' })],
  ['permission question does not require unresolved mode', base({ requestMode: 'UPDATE' })],
  ['explicit record reference remains a separate axis', base({
    semanticScope: 'PRODUCT_EXPLICIT', requestMode: 'UPDATE', semanticAction: 'UPDATE', action: 'UPDATE', object: 'RECORD',
    reference: 'VALID_UNIQUE', resolutionStatus: 'RESOLVED', task: 'NONE', operation: 'EXPLAIN_RECORD_DETAILS', authorizationClass: 'AUTHORIZED_OPERATION',
  })],
  ['contextual record reference remains a separate axis', base({
    semanticScope: 'PRODUCT_CONTEXTUAL', requestMode: 'UPDATE', semanticAction: 'UPDATE', action: 'UPDATE', object: 'RECORD',
    reference: 'VALID_CONTEXTUAL_REFERENCE', resolutionStatus: 'RESOLVED', task: 'NONE', operation: 'EXPLAIN_RECORD_DETAILS', authorizationClass: 'AUTHORIZED_OPERATION',
  })],
  ['structural case family is independent of wording and case id', base({ requestMode: 'UPDATE' })],
];

const failures = [];
for (const [name, expected] of cases) {
  const result = validateExpectationContract(expected, packet);
  if (!result.safe) failures.push({ name, reasons: result.failureReasons, failures: result.failures });
}

const report = {
  status: failures.length === 0 ? 'GREEN' : 'RED',
  testCount: cases.length,
  passCount: cases.length - failures.length,
  relevantRedFailureCount: failures.length,
  relevantRedProven: failures.length > 0,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
