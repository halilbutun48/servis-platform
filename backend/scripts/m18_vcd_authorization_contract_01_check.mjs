import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compareExpectedContract } from './lib/m18HoldoutExecutionAdapter.mjs';

const packetPath = new URL('../../.superpowers/sdd/2026-10-01-m18-typed-semantic-evidence-implementation-plan/m18-holdout-contract-packet-v2.json', import.meta.url);
const contractPacket = JSON.parse(await readFile(packetPath, 'utf8'));

const canonical = ({ authorizationClass, authorizationNativeStatus }) => ({
  semanticScope: 'PRODUCT_EXPLICIT',
  requestMode: 'CREATE',
  semanticAction: 'CREATE',
  action: 'CREATE',
  object: 'SHIFT',
  reference: 'ABSENT',
  resolutionStatus: 'RESOLVED',
  task: 'NONE',
  operation: 'CREATE_SHIFT',
  authorizationClass,
  authorizationNativeStatus,
});

const expected = (authorizationClass) => ({
  semanticScope: 'PRODUCT_EXPLICIT',
  requestMode: 'CREATE',
  semanticAction: 'CREATE',
  action: 'CREATE',
  object: 'SHIFT',
  reference: 'ABSENT',
  resolutionStatus: 'RESOLVED',
  task: 'NONE',
  operation: 'CREATE_SHIFT',
  authorizationClass,
});

const assertNoMismatch = (name, expectedContract, actualContract) => {
  assert.deepEqual(
    compareExpectedContract(expectedContract, actualContract, contractPacket),
    [],
    `${name} must compare authorization intent/policy independently from workflow clarification status`,
  );
};

assertNoMismatch(
  'authorized planning intent with incomplete create details',
  expected('AUTHORIZED_PLANNING_INTENT'),
  canonical({ authorizationClass: 'ALLOW', authorizationNativeStatus: 'REQUIRES_CLARIFICATION' }),
);

assertNoMismatch(
  'fully actionable authorized create',
  expected('AUTHORIZED_PLANNING_INTENT'),
  canonical({ authorizationClass: 'ALLOW', authorizationNativeStatus: 'AUTHORIZED' }),
);

assertNoMismatch(
  'unauthorized create remains denied',
  expected('UNAUTHORIZED_CREATE'),
  canonical({ authorizationClass: 'DENY', authorizationNativeStatus: 'DENIED' }),
);

assertNoMismatch(
  'authorized read remains authorized',
  { ...expected('AUTHORIZED_READ'), requestMode: 'VIEW', semanticAction: 'VIEW', action: 'VIEW', operation: 'VIEW_AUTHORIZED_SURFACE' },
  { ...canonical({ authorizationClass: 'ALLOW', authorizationNativeStatus: 'AUTHORIZED' }), requestMode: 'VIEW', semanticAction: 'VIEW', action: 'VIEW', operation: 'VIEW_AUTHORIZED_SURFACE' },
);

assertNoMismatch(
  'authorization-context clarification remains a clarification status',
  expected('AUTHORIZATION_CONTEXT_CLARIFICATION'),
  canonical({ authorizationClass: 'ALLOW', authorizationNativeStatus: 'REQUIRES_CLARIFICATION' }),
);

assert.notDeepEqual(
  compareExpectedContract(
    expected('AUTHORIZED_PLANNING_INTENT'),
    canonical({ authorizationClass: 'DENY', authorizationNativeStatus: 'DENIED' }),
    contractPacket,
  ),
  [],
  'authorized planning intent must still reject a denied policy decision',
);

console.log('M18_VCD_AUTHORIZATION_CONTRACT_CHECK=GREEN');
