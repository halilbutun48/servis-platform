import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  loadContractPacket,
  validateExpectationContract,
} from './lib/m18HoldoutGovernance.mjs';

const root = resolve(process.cwd());
const packetPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-holdout-contract-packet-v2.json');
const packet = loadContractPacket(readFileSync(packetPath));
const failures = [];
const check = (name, predicate, details) => {
  if (!predicate()) failures.push({ name, details });
};

const resolvedContinuation = {
  semanticScope: 'PRODUCT_CONTEXTUAL',
  requestMode: 'CONTINUE',
  semanticAction: 'NEXT',
  action: 'NEXT',
  object: 'SURFACE',
  reference: 'VALID_CONTEXTUAL_REFERENCE',
  resolutionStatus: 'RESOLVED',
  task: 'CONTINUE_CURRENT_REASONING',
  operation: 'CONTINUE_EXPLANATION',
  authorizationClass: 'CLARIFICATION_REQUIRED',
  contractSourceClass: 'CONTINUATION_CONTRACT',
};

const validOrganizationContinuation = {
  ...resolvedContinuation,
  authorizationClass: 'AUTHORIZED_OPERATION',
  role: 'ORGANIZATION',
};

check('canonical authorization taxonomy is present', () => Boolean(packet.authorizationContract?.classes), 'packet.authorizationContract.classes missing');
check('resolved continuation cannot use clarification', () => !validateExpectationContract(resolvedContinuation, packet).safe, validateExpectationContract(resolvedContinuation, packet));
check('unknown authorization class is rejected', () => !validateExpectationContract({ ...resolvedContinuation, authorizationClass: 'UNKNOWN_AUTHORIZATION_CLASS' }, packet).safe, validateExpectationContract({ ...resolvedContinuation, authorizationClass: 'UNKNOWN_AUTHORIZATION_CLASS' }, packet));
check('missing authorization class is rejected', () => !validateExpectationContract({ ...resolvedContinuation, authorizationClass: undefined }, packet).safe, validateExpectationContract({ ...resolvedContinuation, authorizationClass: undefined }, packet));
check('semantic clarification is distinct from authorization clarification', () => packet.authorizationContract?.classes?.SEMANTIC_CLARIFICATION && packet.authorizationContract?.classes?.AUTHORIZATION_CONTEXT_CLARIFICATION, packet.authorizationContract);
check('authorization denial is distinct from clarification', () => packet.authorizationContract?.classes?.AUTHORIZATION_DENIAL, packet.authorizationContract);
check('ROOM boundary is contractually represented', () => packet.roleCapabilityMapping?.ROOM?.buyerSideNewDemandOrShiftCreation === false, packet.roleCapabilityMapping);
check('COMPANY planning is contractually represented', () => packet.roleCapabilityMapping?.COMPANY?.buyerSidePlanningOrCreateIntentAllowed === true, packet.roleCapabilityMapping);
check('ORGANIZATION continuation class is explicit', () => packet.roleCapabilityMapping?.ORGANIZATION?.continuationNextAuthorizationClass === 'AUTHORIZED_OPERATION', packet.roleCapabilityMapping);
check('valid ORGANIZATION continuation is accepted', () => validateExpectationContract(validOrganizationContinuation, packet).safe, validateExpectationContract(validOrganizationContinuation, packet));
check('every authorization class has a meaning', () => Object.values(packet.authorizationContract?.classes || {}).every((item) => typeof item.meaning === 'string' && item.meaning.length > 0), packet.authorizationContract);

console.log(JSON.stringify({
  status: failures.length ? 'RED' : 'GREEN',
  AUTH_CONTRACT_RED_TEST_COUNT: 11,
  AUTH_CONTRACT_RELEVANT_FAILURE_COUNT: failures.length,
  AUTH_CONTRACT_RED_PROVEN: failures.length > 0 ? 'YES' : 'NO',
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
