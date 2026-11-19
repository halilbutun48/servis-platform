#!/usr/bin/env node

import assert from 'node:assert/strict';
import * as provenanceProducer from './m18_fixture_provenance_20261009_produce.mjs';
import { sha256 } from './lib/m18HoldoutGovernance.mjs';
import { validateCandidateFixtureProvenance } from './lib/m18ExecutionFixturePreconditions.mjs';
import { mapDockerForwarderAddress } from './lib/m18RunScopedProvenance.mjs';
import { normalizeAuthorizationEntityType } from '../src/ai/chat/authorizationGate.js';
import { currentContractBinding, provenanceOwnerRecords } from './lib/m18CurrentSemanticContract.mjs';

const {
  buildFixtureProvenanceEnvelope,
  selectCanonicalHostPortForwarders,
  selectCanonicalContainerNodeProcess,
  verifyFixtureProvenanceEnvelope,
} = provenanceProducer;

const binding = {
  contractId: 'M18-SEMANTIC-SPECIFICITY-RESOLVER-AND-ANTI-LOOP-01',
  contractVersion: 'M18-CURRENT-CONTRACT-V1',
  sourceOwners: [],
  selectedEntityTypes: ['SHIFT', 'VEHICLE'],
  continuationForms: ['devam et'],
  authoringAuthority: 'WRITTEN_CURRENT_M18_CONTRACT',
  targetRuntimeOracleUsed: false,
};

function validInput() {
  const sourceContractBindingSha256 = sha256(Buffer.from(JSON.stringify(binding), 'utf8'));
  const fixture = (id, companyKind, authorizedRoles, relatedPersonelIds = [], companyId = id) => ({
    type: 'SHIFT',
    id,
    exists: true,
    reachable: true,
    status: 'PROVEN',
    readOnly: true,
    authorizationStatus: 'AUTHORIZED',
    authorizedRoles,
    tenantContext: { type: 'COMPANY', companyKind },
    tenantIsolation: 'PROVEN',
    recordEvidence: { companyId, roomId: 1, driverId: 1, relatedPersonelIds },
  });
  const roleFixture = {
    ROOM: [1, 'COMPANY'], COMPANY: [1, 'COMPANY'], DRIVER: [1, 'COMPANY'],
    PERSONEL: [1, 'COMPANY'], SUPER_ADMIN: [1, 'COMPANY'], SCHOOL: [2, 'SCHOOL'],
    PARENT: [2, 'SCHOOL'], ORGANIZATION: [208, 'ORGANIZATION'],
  };
  const userByRole = {
    ROOM: { id: 10, databaseRole: 'ROOM', roomId: 1 },
    COMPANY: { id: 11, databaseRole: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    DRIVER: { id: 12, databaseRole: 'DRIVER', roomId: 1, driverId: 1 },
    PERSONEL: { id: 13, databaseRole: 'PERSONEL', companyId: 1, personelId: 1 },
    SUPER_ADMIN: { id: 14, databaseRole: 'SUPER_ADMIN' },
    SCHOOL: { id: 15, databaseRole: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    PARENT: { id: 16, databaseRole: 'PARENT', parentPersonelIds: [2] },
    ORGANIZATION: { id: 17, databaseRole: 'COMPANY', companyId: 3, companyKind: 'ORGANIZATION' },
  };
  const authorizationEvidence = Object.entries(roleFixture).map(([role, [id, companyKind]]) => ({
    role,
    user: userByRole[role],
    fixtureRef: { type: 'SHIFT', id },
    tenantContext: { type: 'COMPANY', companyKind },
    positive: { authorizationStatus: 'AUTHORIZED', status: 'ALLOW', tenantContext: { type: 'COMPANY', companyKind } },
    negative: { authorizationStatus: 'DENIED', status: 'DENY' },
  }));
  return {
    sourceIdentity: 'A'.repeat(64),
    sourceContractBinding: binding,
    runtimeBinding: {
      sourceManifestSha256: 'B'.repeat(64),
      headSha: 'c'.repeat(40).toUpperCase(),
      entrypoint: 'backend/src/server.js',
      cwd: 'backend',
      pid: 1234,
      port: 3400,
      portOwnerPid: 1234,
      healthStatus: 'PASS',
      processStartTime: '2026-10-09T00:00:00.000Z',
      sourceIdentity: 'A'.repeat(64),
      sourceContractBindingSha256,
    },
    fixtures: [
      fixture(1, 'COMPANY', ['ROOM', 'COMPANY', 'DRIVER', 'PERSONEL', 'SUPER_ADMIN'], [1]),
      fixture(2, 'SCHOOL', ['SCHOOL', 'PARENT'], [2]),
      fixture(208, 'ORGANIZATION', ['ORGANIZATION'], [], 3),
    ],
    authorizationEvidence,
    sourceContractBindingSha256,
    capturedAt: '2026-10-09T00:00:00.000Z',
  };
}

function validDockerInput() {
  const input = validInput();
  const sourceContractBindingSha256 = input.sourceContractBindingSha256;
  input.runtimeBinding = {
    runtimeKind: 'DOCKER',
    bindingSchemaVersion: 'M18-DOCKER-RUNTIME-BINDING-V2',
    containerName: 'personel_api',
    containerId: 'a'.repeat(64),
    imageId: `sha256:${'b'.repeat(64)}`,
    hostPort: 3000,
    containerPort: 3000,
    port: 3000,
    hostPortOwnerPids: [22120, 58340],
    hostPortOwnerProcesses: ['com.docker.backend', 'wslrelay'],
    hostPortOwnerSource: 'WINDOWS_GET_NET_TCP_CONNECTION',
    hostPortOwnerObservation: 'VERIFIED_HOST_SOCKET_OWNERS',
    hostPortForwardingMode: 'DOCKER_DESKTOP_PROXY',
    hostPortBindingAddresses: ['0.0.0.0'],
    hostPortListenerAddresses: ['::', '::1'],
    hostPortForwarders: [
      { localAddress: '::', owningProcess: 58340, process: 'com.docker.backend', processKind: 'DOCKER_DESKTOP_BACKEND', bindingAddress: '0.0.0.0', mappingReason: 'IPV6_WILDCARD_EQUIVALENT_TO_IPV4_WILDCARD' },
      { localAddress: '::1', owningProcess: 22120, process: 'wslrelay', processKind: 'DOCKER_DESKTOP_WSL_RELAY', bindingAddress: '0.0.0.0', mappingReason: 'LOOPBACK_RELAY_FOR_DOCKER_WILDCARD' },
    ],
    containerLaunchCommand: 'sh -lc npm run dev',
    pidObservationSource: 'docker-exec-procfs',
    processPidNamespace: 'CONTAINER',
    pidStableAcrossProbe: true,
    containerPid: 17,
    containerProcessCommand: 'node src/server.js',
    containerProcessCwd: '/app/backend',
    containerProcessStartTime: 'proc-stat-starttime:12345',
    containerProcessStartTimeTicks: 12345,
    containerProcessStartTimeSource: 'PROC_STAT_STARTTIME',
    containerStartTime: '2026-10-08T23:59:00.000Z',
    mountType: 'bind',
    mountSource: 'D:/servis-platform',
    mountTarget: '/app',
    buildContext: 'D:/servis-platform',
    containerSourceIdentity: input.sourceIdentity,
    containerSourceContractBindingSha256: sourceContractBindingSha256,
    sourceManifestSha256: input.runtimeBinding.sourceManifestSha256,
    sourceMutation: false,
    headSha: input.runtimeBinding.headSha,
    entrypoint: 'backend/src/server.js',
    cwd: 'backend',
    processStartTime: '2026-10-09T00:00:00.000Z',
    healthStatus: 'PASS',
    healthEndpoint: 'http://127.0.0.1:3000/health',
    runtimeObservedAfterManifest: true,
    startedAfterManifest: false,
    staleListener: false,
    sourceIdentity: input.sourceIdentity,
    sourceContractBindingSha256,
  };
  return input;
}

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'RED', message: error.message });
  }
}

check('MISSING_RECORD_FAILS_CLOSED', () => {
  const input = validInput();
  input.fixtures[0].exists = false;
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /FIXTURE_RECORD_NOT_FOUND/);
});

check('ALTERED_REGISTRY_DIGEST_IS_REJECTED', () => {
  const envelope = buildFixtureProvenanceEnvelope(validInput());
  envelope.fixtureRegistry['SHIFT:1'].registrySha256 = 'F'.repeat(64);
  assert.equal(verifyFixtureProvenanceEnvelope(envelope).safe, false);
  assert.match(verifyFixtureProvenanceEnvelope(envelope).failureReasons.join(';'), /FIXTURE_REGISTRY_DIGEST_MISMATCH/);
});

check('VALID_ENVELOPE_PASSES_EXISTING_PROVENANCE_RULES', () => {
  const envelope = buildFixtureProvenanceEnvelope(validInput());
  assert.equal(verifyFixtureProvenanceEnvelope(envelope).safe, true);
});

check('EXISTING_CANDIDATE_PREFREEZE_VALIDATOR_ACCEPTS_ENVELOPE', () => {
  const envelope = buildFixtureProvenanceEnvelope(validInput());
  const candidate = {
    cases: envelope.registryPayload.authorizationEvidence.map((row) => ({
      CASE_ID: `FIXTURE-${row.role}`,
      ROLE: row.role,
      EXECUTION_CONTEXT: {
        tenantContext: row.tenantContext,
        selectedEntity: row.fixtureRef,
      },
    })),
  };
  const result = validateCandidateFixtureProvenance({
    candidate,
    fixtureRegistry: envelope.fixtureRegistry,
    registryProvenance: envelope.provenance,
    sourceContractBindingSha256: envelope.provenance.sourceContractBindingSha256,
  });
  assert.equal(result.safe, true);
  assert.equal(result.requiredCount, 8);
  assert.equal(result.validatedCount, 8);
});

check('CANONICAL_SHIFT_SCOPE_TYPE_NORMALIZES_FOR_SEVEN_ROLE_MATRIX', () => {
  for (const role of ['ROOM', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT']) {
    assert.equal(normalizeAuthorizationEntityType('SHIFT'), 'shift', `${role} SHIFT scope type`);
  }
  assert.equal(normalizeAuthorizationEntityType('VEHICLE'), 'vehicle');
  assert.equal(normalizeAuthorizationEntityType('student'), 'student');
  assert.equal(normalizeAuthorizationEntityType('SERVICE_REQUEST'), 'serviceRequest');
  assert.equal(normalizeAuthorizationEntityType('serviceRequest'), 'serviceRequest');
  assert.equal(normalizeAuthorizationEntityType('UNKNOWN_TYPE'), 'unknown_type');
});

check('CROSS_TENANT_POSITIVE_AUTHORIZATION_FAILS_CLOSED', () => {
  const input = validInput();
  input.authorizationEvidence[0].positive.tenantContext = { type: 'COMPANY', companyKind: 'SCHOOL' };
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /FIXTURE_AUTHORIZATION_CONTEXT_MISMATCH/);
});

check('UNSUPPORTED_ROLE_FAILS_CLOSED', () => {
  const input = validInput();
  input.fixtures[0].authorizedRoles = ['UNSUPPORTED_ROLE'];
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /FIXTURE_ROLE_UNSUPPORTED/);
});

check('DOCKER_RUNTIME_BINDING_V2_ACCEPTS_VALID_MULTI_OWNER_BINDING', () => {
  const envelope = buildFixtureProvenanceEnvelope(validDockerInput());
  assert.equal(verifyFixtureProvenanceEnvelope(envelope).safe, true);
});

check('DOCKER_PORT_MAPPING_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.hostPort = 3400;
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_PORT_MISMATCH/);
});

check('DOCKER_CONTAINER_ID_OR_IMAGE_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.imageId = 'sha256:invalid';
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_IMAGE_ID_INVALID/);
});

check('DOCKER_MOUNT_SOURCE_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.mountSource = 'D:/other-project';
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_MOUNT_SOURCE_MISMATCH/);
});

check('DOCKER_PROCESS_IDENTITY_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.containerProcessCommand = 'node unrelated.js';
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_PROCESS_IDENTITY_INVALID/);
});

check('DOCKER_SOURCE_IDENTITY_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.containerSourceIdentity = 'F'.repeat(64);
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_SOURCE_IDENTITY_MISMATCH/);
});

check('DOCKER_PID_NAMESPACE_MISMATCH_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.processPidNamespace = 'HOST';
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_PID_NAMESPACE_INVALID/);
});

check('DOCKER_STALE_PID_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.pidStableAcrossProbe = false;
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_PID_NOT_STABLE/);
});

check('DOCKER_NODEMON_PROCESS_SELECTION_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.containerProcessCommand = 'node /app/node_modules/nodemon/bin/nodemon.js src/server.js';
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_PROCESS_IDENTITY_INVALID/);
});

check('DOCKER_CONTAINER_NAMESPACE_SELECTS_LIVE_NODE_PROCESS', () => {
  const selected = selectCanonicalContainerNodeProcess([
    '1 npm run dev',
    '19 node /app/node_modules/nodemon/bin/nodemon.js src/server.js',
    '31 node src/server.js',
  ].join('\n'));
  assert.deepEqual(selected, { pid: 31, command: 'node src/server.js' });
});

check('DOCKER_CONTAINER_NAMESPACE_REJECTS_STALE_OR_AMBIGUOUS_PROCESS', () => {
  assert.throws(() => selectCanonicalContainerNodeProcess('1 npm run dev\n19 node /app/node_modules/nodemon/bin/nodemon.js src/server.js'), /DOCKER_NODE_PROCESS_NOT_FOUND/);
  assert.throws(() => selectCanonicalContainerNodeProcess('31 node src/server.js\n32 node src/server.js'), /DOCKER_NODE_PROCESS_AMBIGUOUS/);
});

check('DOCKER_PROC_STAT_STARTTIME_IS_STABLE_AND_CANONICAL', () => {
  const snapshot = {
    pid: 31,
    command: 'node src/server.js',
    cwd: '/app/backend',
    startTimeTicks: 12345,
  };
  const result = provenanceProducer.validateContainerProcessSnapshot(snapshot, { ...snapshot });
  assert.equal(result.containerProcessStartTime, 'proc-stat-starttime:12345');
  assert.equal(result.containerProcessStartTimeSource, 'PROC_STAT_STARTTIME');
});

check('DOCKER_PROC_STAT_STARTTIME_CHANGE_FAILS_CLOSED', () => {
  const first = { pid: 31, command: 'node src/server.js', cwd: '/app/backend', startTimeTicks: 12345 };
  const second = { ...first, startTimeTicks: 12346 };
  assert.throws(() => provenanceProducer.validateContainerProcessSnapshot(first, second), /DOCKER_NODE_PROCESS_START_CHANGED/);
});

check('DOCKER_PROC_STAT_STARTTIME_TOKEN_MISMATCH_FAILS_CLOSED', () => {
  const input = validDockerInput();
  input.runtimeBinding.containerProcessStartTime = 'proc-stat-starttime:99999';
  assert.throws(() => buildFixtureProvenanceEnvelope(input), /RUNTIME_DOCKER_START_TIME_INVALID/);
});

check('DOCKER_WILDCARD_IPV6_AND_WSLRELAY_FORWARDERS_ARE_PRESERVED', () => {
  const result = selectCanonicalHostPortForwarders([
    { localAddress: '::1', localPort: 3000, state: 'Listen', owningProcess: 22120, process: 'wslrelay', processLookup: 'VERIFIED' },
    { localAddress: '::', localPort: 3000, state: 'Listen', owningProcess: 58340, process: 'com.docker.backend', processLookup: 'VERIFIED' },
  ], ['0.0.0.0']);
  assert.deepEqual(result, {
    hostPortOwnerPids: [22120, 58340],
    hostPortOwnerProcesses: ['com.docker.backend', 'wslrelay'],
    hostPortOwnerSource: 'WINDOWS_GET_NET_TCP_CONNECTION',
    hostPortOwnerObservation: 'VERIFIED_HOST_SOCKET_OWNERS',
    hostPortForwardingMode: 'DOCKER_DESKTOP_PROXY',
    hostPortBindingAddresses: ['0.0.0.0'],
    hostPortListenerAddresses: ['::', '::1'],
    hostPortForwarders: [
      { localAddress: '::', owningProcess: 58340, process: 'com.docker.backend', processKind: 'DOCKER_DESKTOP_BACKEND', bindingAddress: '0.0.0.0', mappingReason: 'IPV6_WILDCARD_EQUIVALENT_TO_IPV4_WILDCARD' },
      { localAddress: '::1', owningProcess: 22120, process: 'wslrelay', processKind: 'DOCKER_DESKTOP_WSL_RELAY', bindingAddress: '0.0.0.0', mappingReason: 'LOOPBACK_RELAY_FOR_DOCKER_WILDCARD' },
    ],
  });
});

check('DOCKER_LOOPBACK_LISTENER_ACCEPTS_WHEN_BINDING_IS_LOOPBACK', () => {
  const result = selectCanonicalHostPortForwarders([
    { localAddress: '127.0.0.1', localPort: 3000, state: 'Listen', owningProcess: 4567, process: 'com.docker.backend', processLookup: 'VERIFIED' },
    { localAddress: '::1', localPort: 3000, state: 'Listen', owningProcess: 4567, process: 'com.docker.backend', processLookup: 'VERIFIED' },
  ], ['127.0.0.1', '::1']);
  assert.deepEqual(result.hostPortListenerAddresses, ['127.0.0.1', '::1']);
});

check('DOCKER_SOCKET_OWNER_NOT_VISIBLE_FAILS_CLOSED_SEPARATELY', () => {
  assert.throws(() => selectCanonicalHostPortForwarders([
    { localAddress: '0.0.0.0', localPort: 3000, state: 'Listen', owningProcess: 0, process: '' },
  ], ['0.0.0.0']), /DOCKER_HOST_PORT_FORWARDER_OWNER_UNVERIFIABLE/);
});

check('DOCKER_SOCKET_OWNER_AMBIGUITY_FAILS_CLOSED', () => {
  assert.throws(() => selectCanonicalHostPortForwarders([
    { localAddress: '::', localPort: 3000, state: 'Listen', owningProcess: 4567, process: 'com.docker.backend', processLookup: 'VERIFIED' },
    { localAddress: '::', localPort: 3000, state: 'Listen', owningProcess: 4568, process: 'docker-proxy', processLookup: 'VERIFIED' },
  ], ['0.0.0.0']), /DOCKER_HOST_PORT_OWNER_AMBIGUOUS/);
});

check('DOCKER_HOST_ADDRESS_MISMATCH_FAILS_CLOSED', () => {
  assert.throws(() => selectCanonicalHostPortForwarders([
    { localAddress: '127.0.0.1', localPort: 3000, state: 'Listen', owningProcess: 4567, process: 'com.docker.backend', processLookup: 'VERIFIED' },
  ], ['0.0.0.0', '::']), /DOCKER_HOST_PORT_ADDRESS_MISMATCH/);
});

check('DOCKER_NON_DOCKER_FORWARDER_STATE_IS_NOT_SILENTLY_ACCEPTED', () => {
  assert.throws(() => selectCanonicalHostPortForwarders([
    { localAddress: '0.0.0.0', localPort: 3000, state: 'Listen', owningProcess: 4567, process: 'com.docker.backend', processLookup: 'VERIFIED' },
  ], ['127.0.0.1']), /DOCKER_HOST_PORT_ADDRESS_MISMATCH/);
});

check('DOCKER_WILDCARD_FORWARDER_REQUIRES_DOCKER_BACKEND_IDENTITY', () => {
  assert.throws(() => selectCanonicalHostPortForwarders([
    { localAddress: '::1', localPort: 3000, state: 'Listen', owningProcess: 22120, process: 'wslrelay', processLookup: 'VERIFIED' },
  ], ['0.0.0.0']), /DOCKER_HOST_PORT_FORWARDER_IDENTITY_INCOMPLETE/);
});

check('DOCKER_UNKNOWN_FORWARDER_PROCESS_FAILS_CLOSED', () => {
  assert.throws(() => selectCanonicalHostPortForwarders([
    { localAddress: '::', localPort: 3000, state: 'Listen', owningProcess: 58340, process: 'unknown-forwarder', processLookup: 'VERIFIED' },
  ], ['0.0.0.0']), /DOCKER_HOST_PORT_FORWARDER_PROCESS_UNTRUSTED/);
});

check('SHARED_MAPPING_TREATS_IPV6_WILDCARD_AS_IPV4_DOCKER_WILDCARD', () => {
  assert.deepEqual(mapDockerForwarderAddress({
    localAddress: '::',
    process: 'com.docker.backend',
    processKind: 'DOCKER_DESKTOP_BACKEND',
  }, ['0.0.0.0', '::']), {
    localAddress: '::',
    bindingAddress: '0.0.0.0',
    process: 'com.docker.backend',
    processKind: 'DOCKER_DESKTOP_BACKEND',
    mappingReason: 'IPV6_WILDCARD_EQUIVALENT_TO_IPV4_WILDCARD',
  });
});

check('SHARED_MAPPING_PRESERVES_WSLRELAY_AS_AUXILIARY_FORWARDER', () => {
  assert.deepEqual(mapDockerForwarderAddress({
    localAddress: '::1',
    process: 'wslrelay',
    processKind: 'DOCKER_DESKTOP_WSL_RELAY',
  }, ['0.0.0.0', '::']), {
    localAddress: '::1',
    bindingAddress: '0.0.0.0',
    process: 'wslrelay',
    processKind: 'DOCKER_DESKTOP_WSL_RELAY',
    mappingReason: 'LOOPBACK_RELAY_FOR_DOCKER_WILDCARD',
  });
});

check('SHARED_MAPPING_REJECTS_RELAY_AS_WILDCARD_OWNER', () => {
  assert.throws(() => mapDockerForwarderAddress({
    localAddress: '::',
    process: 'wslrelay',
    processKind: 'DOCKER_DESKTOP_WSL_RELAY',
  }, ['0.0.0.0', '::']), /DOCKER_HOST_PORT_FORWARDER_IDENTITY_INCOMPLETE/);
});

check('CURRENT_ACCEPTANCE_CORRECTIVE_SCOPE_IS_BOUND_WITH_TEST_LIFECYCLE', () => {
  const binding = currentContractBinding(process.cwd());
  const correctivePaths = [
    'web/src/panels/room/AgreementsPanel.jsx',
    'backend/src/ai/chat/helpComposerEntityRuntime.js',
    'backend/src/ai/chat/canonicalSemanticRequest.js',
    'backend/src/ai/chat/semanticIntentPlanner.js',
    'backend/src/services/queryPlanExecutor.js',
    'backend/src/services/authorizedProductAwareness.js',
    'backend/src/ai/tools.js',
    'backend/src/ai/chat/helpComposer.js',
    'backend/scripts/m71_8_copilot_selected_entity_resolve_check.js',
  ];
  const records = provenanceOwnerRecords(binding);
  const byPath = new Map(records.map((entry) => [entry.relativePath, entry]));
  for (const relativePath of correctivePaths) {
    assert(byPath.has(relativePath), `missing corrective source owner ${relativePath}`);
    assert.match(String(byPath.get(relativePath).sha256 || ''), /^[A-F0-9]{64}$/u, `missing source hash ${relativePath}`);
  }
  assert.equal(byPath.get('backend/scripts/m71_8_copilot_selected_entity_resolve_check.js').lifecycleClass, 'CURRENT_HARNESS');
});

const red = checks.filter((checkResult) => checkResult.status === 'RED');
console.log(JSON.stringify({
  status: red.length ? 'RED' : 'GREEN',
  checks,
}, null, 2));
process.exitCode = red.length ? 1 : 0;
