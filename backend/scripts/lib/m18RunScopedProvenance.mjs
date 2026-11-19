import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const PROVENANCE_SCHEMA_VERSION = 'M18-RUN-SOURCE-MANIFEST-V1';
export const PROVENANCE_FAILURE_CLASSES = Object.freeze([
  'PROVENANCE_INVALID',
  'ENVIRONMENT_INVALID',
  'SECURITY_FAILURE',
  'HARNESS_DEFECT',
]);
export const DOCKER_RUNTIME_BINDING_SCHEMA_VERSION = 'M18-DOCKER-RUNTIME-BINDING-V2';

const RECEIPT_SCHEMA_VERSION = 'M18-RUN-PROVENANCE-RECEIPT-V1';
const SHA40 = /^[A-F0-9]{40}$/;
const SHA64 = /^[A-F0-9]{64}$/;
const DEFAULT_RUNTIME_LAUNCH = Object.freeze({
  entrypoint: 'backend/src/server.js',
  workingDirectory: 'backend',
  port: 3400,
  authorityMode: 'NEW',
  launchCommand: 'node src/server.js',
});
export const DOCKER_FORWARDER_PROCESS_KINDS = Object.freeze({
  'com.docker.backend': 'DOCKER_DESKTOP_BACKEND',
  'docker-proxy': 'DOCKER_DESKTOP_PROXY',
  wslrelay: 'DOCKER_DESKTOP_WSL_RELAY',
});

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function normalizeRoot(value) {
  return path.resolve(String(value || '')).replace(/\\/g, '/');
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b, 'en'))
        .map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
}

function runGit(repoRoot, args) {
  return execFileSync('git', ['-c', `safe.directory=${repoRoot}`, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function safeGit(repoRoot, args, fallback = '') {
  try {
    return runGit(repoRoot, args);
  } catch {
    return fallback;
  }
}

function failure(failureClass, ...failureReasons) {
  return {
    safe: false,
    failureClass,
    failureReasons: failureReasons.filter(Boolean),
  };
}

function success(extra = {}) {
  return { safe: true, failureClass: null, failureReasons: [], ...extra };
}

function dockerHostPath(value) {
  let normalized = String(value || '').replace(/\\/g, '/');
  const hostMnt = normalized.match(/^\/host_mnt\/([a-z])\/(.*)$/i);
  if (hostMnt) normalized = `${hostMnt[1]}:/${hostMnt[2]}`;
  return normalizeRoot(normalized).toLowerCase();
}

function validTimestamp(value) {
  return Boolean(String(value || '').trim()) && Number.isFinite(Date.parse(String(value)));
}

export function normalizeDockerHostAddress(value) {
  let normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('[') && normalized.endsWith(']')) normalized = normalized.slice(1, -1);
  if (normalized === '*') normalized = '0.0.0.0';
  return normalized;
}

function normalizedAddressList(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map(normalizeDockerHostAddress)
    .filter(Boolean))].sort();
}

function normalizedForwarderProcess(value) {
  return String(value || '').trim().toLowerCase().replace(/\.exe$/u, '');
}

export function mapDockerForwarderAddress(record = {}, bindingAddresses = []) {
  const expectedAddresses = normalizedAddressList(bindingAddresses);
  const localAddress = normalizeDockerHostAddress(record.localAddress);
  const process = String(record.process || '').trim();
  const processKind = DOCKER_FORWARDER_PROCESS_KINDS[normalizedForwarderProcess(process)];
  const declaredProcessKind = String(record.processKind || '').trim();

  if (!expectedAddresses.length) throw new Error('DOCKER_HOST_PORT_BINDING_ADDRESS_MISSING');
  if (!localAddress) throw new Error('DOCKER_HOST_PORT_ADDRESS_MISMATCH');
  if (!processKind || (declaredProcessKind && declaredProcessKind !== processKind)) {
    throw new Error('DOCKER_HOST_PORT_FORWARDER_PROCESS_UNTRUSTED');
  }

  if (localAddress === '::' && expectedAddresses.includes('0.0.0.0')) {
    if (!['DOCKER_DESKTOP_BACKEND', 'DOCKER_DESKTOP_PROXY'].includes(processKind)) {
      throw new Error('DOCKER_HOST_PORT_FORWARDER_IDENTITY_INCOMPLETE');
    }
    return {
      localAddress,
      bindingAddress: '0.0.0.0',
      process,
      processKind,
      mappingReason: 'IPV6_WILDCARD_EQUIVALENT_TO_IPV4_WILDCARD',
    };
  }

  if (expectedAddresses.includes('0.0.0.0')
    && ['::1', '127.0.0.1'].includes(localAddress)
    && processKind === 'DOCKER_DESKTOP_WSL_RELAY') {
    return {
      localAddress,
      bindingAddress: '0.0.0.0',
      process,
      processKind,
      mappingReason: 'LOOPBACK_RELAY_FOR_DOCKER_WILDCARD',
    };
  }

  if (expectedAddresses.includes(localAddress)) {
    return {
      localAddress,
      bindingAddress: localAddress,
      process,
      processKind,
      mappingReason: 'EXACT_DOCKER_BINDING',
    };
  }

  throw new Error('DOCKER_HOST_PORT_ADDRESS_MISMATCH');
}

function validateDockerRuntimeObservation(runtime, manifest) {
  const reasons = [];
  const expectedPort = Number(manifest?.runtimeLaunch?.port);
  if (runtime.bindingSchemaVersion !== DOCKER_RUNTIME_BINDING_SCHEMA_VERSION) reasons.push('RUNTIME_DOCKER_BINDING_SCHEMA_INVALID');
  if (runtime.containerName !== 'personel_api') reasons.push('RUNTIME_DOCKER_CONTAINER_NAME_INVALID');
  if (!/^[A-F0-9]{64}$/i.test(String(runtime.containerId || ''))) reasons.push('RUNTIME_DOCKER_CONTAINER_ID_INVALID');
  if (!/^sha256:[A-F0-9]{64}$/i.test(String(runtime.imageId || ''))) reasons.push('RUNTIME_DOCKER_IMAGE_ID_INVALID');
  if (Number(runtime.hostPort) !== expectedPort || Number(runtime.port) !== expectedPort) reasons.push('RUNTIME_DOCKER_HOST_PORT_MISMATCH');
  if (Number(runtime.containerPort) !== 3000) reasons.push('RUNTIME_DOCKER_CONTAINER_PORT_MISMATCH');
  if (!Number.isInteger(Number(runtime.containerPid)) || Number(runtime.containerPid) <= 0) reasons.push('RUNTIME_DOCKER_CONTAINER_PID_INVALID');
  const ownerPids = [...new Set((Array.isArray(runtime.hostPortOwnerPids) ? runtime.hostPortOwnerPids : []).map(Number).filter((value) => Number.isInteger(value) && value > 0))].sort((left, right) => left - right);
  const ownerProcesses = [...new Set((Array.isArray(runtime.hostPortOwnerProcesses) ? runtime.hostPortOwnerProcesses : []).map((value) => String(value || '').trim()).filter(Boolean))].sort();
  if (!ownerPids.length) reasons.push('RUNTIME_DOCKER_HOST_PORT_OWNER_INVALID');
  if (!ownerProcesses.length) reasons.push('RUNTIME_DOCKER_HOST_PORT_PROCESS_MISSING');
  if (runtime.hostPortOwnerSource !== 'WINDOWS_GET_NET_TCP_CONNECTION') reasons.push('RUNTIME_DOCKER_HOST_PORT_OWNER_SOURCE_INVALID');
  if (runtime.hostPortOwnerObservation !== 'VERIFIED_HOST_SOCKET_OWNERS') reasons.push('RUNTIME_DOCKER_HOST_PORT_OWNER_OBSERVATION_INVALID');
  if (runtime.hostPortForwardingMode !== 'DOCKER_DESKTOP_PROXY') reasons.push('RUNTIME_DOCKER_FORWARDING_MODE_INVALID');
  const bindingAddresses = normalizedAddressList(runtime.hostPortBindingAddresses);
  const listenerAddresses = normalizedAddressList(runtime.hostPortListenerAddresses);
  if (!bindingAddresses.length || !listenerAddresses.length) reasons.push('RUNTIME_DOCKER_HOST_PORT_ADDRESSES_MISSING');
  const forwarders = Array.isArray(runtime.hostPortForwarders) ? runtime.hostPortForwarders : [];
  const forwarderPids = [...new Set(forwarders.map((row) => Number(row?.owningProcess)).filter((value) => Number.isInteger(value) && value > 0))].sort((left, right) => left - right);
  const forwarderProcesses = [...new Set(forwarders.map((row) => String(row?.process || '').trim()).filter(Boolean))].sort();
  if (forwarders.length !== listenerAddresses.length) reasons.push('RUNTIME_DOCKER_FORWARDER_COUNT_MISMATCH');
  if (JSON.stringify(normalizedAddressList(forwarders.map((row) => row?.localAddress))) !== JSON.stringify(listenerAddresses)) reasons.push('RUNTIME_DOCKER_HOST_PORT_ADDRESS_MISMATCH');
  if (JSON.stringify(forwarderPids) !== JSON.stringify(ownerPids) || JSON.stringify(forwarderProcesses) !== JSON.stringify(ownerProcesses)) reasons.push('RUNTIME_DOCKER_FORWARDER_OWNER_SET_MISMATCH');
  for (const row of forwarders) {
    try {
      const mapped = mapDockerForwarderAddress(row, bindingAddresses);
      if (mapped.localAddress !== normalizeDockerHostAddress(row?.localAddress)
        || mapped.bindingAddress !== normalizeDockerHostAddress(row?.bindingAddress)
        || mapped.process !== String(row?.process || '').trim()
        || mapped.processKind !== row?.processKind
        || mapped.mappingReason !== row?.mappingReason) {
        reasons.push('RUNTIME_DOCKER_FORWARDER_MAPPING_INVALID');
      }
    } catch (error) {
      reasons.push(String(error?.message || 'RUNTIME_DOCKER_FORWARDER_MAPPING_INVALID'));
    }
  }
  if (bindingAddresses.includes('0.0.0.0') && !forwarders.some((row) => ['DOCKER_DESKTOP_BACKEND', 'DOCKER_DESKTOP_PROXY'].includes(row?.processKind) && normalizedAddressList([row?.bindingAddress])[0] === '0.0.0.0')) reasons.push('RUNTIME_DOCKER_FORWARDER_IDENTITY_INCOMPLETE');
  if (runtime.pidObservationSource !== 'docker-exec-procfs') reasons.push('RUNTIME_DOCKER_PID_OBSERVATION_SOURCE_INVALID');
  if (runtime.processPidNamespace !== 'CONTAINER') reasons.push('RUNTIME_DOCKER_PID_NAMESPACE_INVALID');
  if (runtime.pidStableAcrossProbe !== true) reasons.push('RUNTIME_DOCKER_PID_NOT_STABLE');
  if (!/npm\s+run\s+dev/iu.test(String(runtime.containerLaunchCommand || ''))) reasons.push('RUNTIME_DOCKER_LAUNCH_COMMAND_INVALID');
  const processCommand = String(runtime.containerProcessCommand || '');
  if (/\bnodemon\b/i.test(processCommand) || !/\bnode(?:\.exe)?\b/i.test(processCommand) || !/src[\\/]server\.js\b/i.test(processCommand)) reasons.push('RUNTIME_DOCKER_PROCESS_IDENTITY_INVALID');
  if (normalizePath(runtime.containerProcessCwd) !== '/app/backend') reasons.push('RUNTIME_DOCKER_PROCESS_CWD_INVALID');
  if (runtime.containerProcessStartTimeSource !== 'PROC_STAT_STARTTIME') reasons.push('RUNTIME_DOCKER_START_TIME_SOURCE_INVALID');
  if (!Number.isInteger(Number(runtime.containerProcessStartTimeTicks)) || Number(runtime.containerProcessStartTimeTicks) <= 0) reasons.push('RUNTIME_DOCKER_START_TIME_TICKS_INVALID');
  if (String(runtime.containerProcessStartTime || '') !== `proc-stat-starttime:${runtime.containerProcessStartTimeTicks}`) reasons.push('RUNTIME_DOCKER_START_TIME_INVALID');
  if (!validTimestamp(runtime.containerStartTime)) reasons.push('RUNTIME_DOCKER_CONTAINER_START_TIME_INVALID');
  if (String(runtime.mountType || '').toLowerCase() !== 'bind') reasons.push('RUNTIME_DOCKER_MOUNT_TYPE_INVALID');
  if (!String(runtime.mountSource || '').trim() || dockerHostPath(runtime.mountSource) !== dockerHostPath(manifest?.repoRoot)) reasons.push('RUNTIME_DOCKER_MOUNT_SOURCE_MISMATCH');
  if (normalizePath(runtime.mountTarget) !== '/app') reasons.push('RUNTIME_DOCKER_MOUNT_TARGET_MISMATCH');
  if (!String(runtime.buildContext || '').trim() || dockerHostPath(runtime.buildContext) !== dockerHostPath(manifest?.repoRoot)) reasons.push('RUNTIME_DOCKER_BUILD_CONTEXT_MISMATCH');
  if (!SHA64.test(String(runtime.sourceIdentity || ''))) reasons.push('RUNTIME_DOCKER_SOURCE_IDENTITY_INVALID');
  if (!SHA64.test(String(runtime.sourceContractBindingSha256 || ''))) reasons.push('RUNTIME_DOCKER_CONTRACT_BINDING_INVALID');
  if (runtime.containerSourceIdentity !== runtime.sourceIdentity) reasons.push('RUNTIME_DOCKER_SOURCE_IDENTITY_MISMATCH');
  if (runtime.containerSourceContractBindingSha256 !== runtime.sourceContractBindingSha256) reasons.push('RUNTIME_DOCKER_CONTRACT_BINDING_MISMATCH');
  if (runtime.sourceMutation === true) reasons.push('RUNTIME_DOCKER_SOURCE_MUTATED');
  if (runtime.healthStatus !== 'PASS') reasons.push('RUNTIME_DOCKER_HEALTH_NOT_PASS');
  if (String(runtime.healthEndpoint || '') !== 'http://127.0.0.1:3000/health') reasons.push('RUNTIME_DOCKER_HEALTH_ENDPOINT_INVALID');
  if (runtime.runtimeObservedAfterManifest !== true) reasons.push('RUNTIME_DOCKER_OBSERVATION_ORDER_INVALID');
  if (runtime.staleListener === true) reasons.push('RUNTIME_DOCKER_STALE_LISTENER');
  return reasons;
}

function normalizeSha(value, { allowNull = false } = {}) {
  if (value == null && allowNull) return null;
  const normalized = String(value || '').trim().toUpperCase();
  return normalized;
}

function parseStatusLine(line) {
  const raw = String(line || '');
  const status = raw.slice(0, 2);
  const detail = raw.slice(3).trim();
  const pathText = detail.includes(' -> ')
    ? detail.split(' -> ').at(-1)
    : detail;
  return {
    status,
    path: normalizePath(pathText),
    raw: raw.replace(/\\/g, '/'),
  };
}

function gitStatusEntries(repoRoot) {
  return safeGit(repoRoot, ['status', '--porcelain=v1', '--untracked-files=all'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseStatusLine)
    .sort((a, b) => `${a.path}:${a.status}`.localeCompare(`${b.path}:${b.status}`, 'en'));
}

function relevantPath(filePath) {
  const normalized = normalizePath(filePath);
  return (
    normalized.startsWith('backend/src/') ||
    normalized.startsWith('backend/scripts/') ||
    normalized.startsWith('web/src/') ||
    normalized === 'package.json' ||
    normalized === 'backend/package.json' ||
    normalized === 'backend/Dockerfile'
  );
}

function rawSha256(repoRoot, relativePath) {
  const absolute = path.join(repoRoot, normalizePath(relativePath));
  if (!fs.existsSync(absolute)) return null;
  return sha256(fs.readFileSync(absolute));
}

function currentGitState(statusEntries, relativePath) {
  const match = statusEntries.find((entry) => entry.path === normalizePath(relativePath));
  if (!match) return 'CLEAN';
  if (match.status === '??') return 'UNTRACKED';
  if (match.status.includes('!')) return 'IGNORED';
  return 'TRACKED_MODIFIED';
}

function ownerRecord(value) {
  if (typeof value === 'string') {
    return {
      relativePath: normalizePath(value),
      ownerClass: 'RUNTIME_SOURCE',
      lifecycleClass: 'CURRENT_SOURCE',
    };
  }
  return {
    relativePath: normalizePath(value?.relativePath || value?.path || value?.file),
    ownerClass: String(value?.ownerClass || 'RUNTIME_SOURCE'),
    lifecycleClass: String(value?.lifecycleClass || 'CURRENT_SOURCE'),
  };
}

function sortedOwnerRecords(values = []) {
  return values
    .map(ownerRecord)
    .sort((a, b) => `${a.relativePath}:${a.ownerClass}`.localeCompare(`${b.relativePath}:${b.ownerClass}`, 'en'));
}

function validateAuthority(authorityObservation) {
  const authority = authorityObservation || {};
  const expected = {
    semanticAuthorityMode: 'NEW',
    liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
    semanticAuthorityCount: 1,
    shadowSemanticAuthorityCount: 0,
    runtimeFallbackCount: 0,
    downstreamSemanticRedecisionCount: 0,
  };
  const reasons = Object.entries(expected)
    .filter(([key, value]) => authority[key] !== value)
    .map(([key, value]) => `${key} expected ${value} got ${authority[key]}`);
  return reasons.length === 0 ? success({ authority: expected }) : failure('SECURITY_FAILURE', ...reasons);
}

function extractCanonicalOwners(topologyRegistry, fallbackOwners) {
  if (Array.isArray(topologyRegistry?.canonicalOwners)) return topologyRegistry.canonicalOwners;
  if (Array.isArray(topologyRegistry?.owners)) return topologyRegistry.owners;
  if (Array.isArray(topologyRegistry?.topology?.canonicalOwners)) return topologyRegistry.topology.canonicalOwners;
  return sortedOwnerRecords(fallbackOwners);
}

export function validateCanonicalOwnerTopology({
  repoRoot,
  topologyRegistry,
  requiredOwnerClasses = [],
  runtimeOwnerPaths = [],
}) {
  const failures = [];
  const records = sortedOwnerRecords(runtimeOwnerPaths);
  const owners = extractCanonicalOwners(topologyRegistry, records);
  const topologyOwners = sortedOwnerRecords(owners);
  const seenPaths = new Map();
  const duplicateOwners = [];
  for (const owner of records) {
    if (!owner.relativePath || !fs.existsSync(path.join(repoRoot, owner.relativePath))) {
      failures.push(`missing runtime owner ${owner.relativePath || '<empty>'}`);
    }
    if (seenPaths.has(owner.relativePath)) duplicateOwners.push(owner.relativePath);
    seenPaths.set(owner.relativePath, true);
  }

  const missingOwners = requiredOwnerClasses.filter(
    (required) => !records.some((record) => record.ownerClass === required),
  );
  const unknownOwners = [
    ...(Array.isArray(topologyRegistry?.unknownOwners) ? topologyRegistry.unknownOwners : []),
    ...topologyOwners.filter((record) => !record.ownerClass || !record.lifecycleClass),
  ];
  const unexpectedOwners = [
    ...(Array.isArray(topologyRegistry?.unexpectedOwners) ? topologyRegistry.unexpectedOwners : []),
    ...records.filter((record) => record.ownerClass === 'UNEXPECTED_SEMANTIC_AUTHORITY'),
    ...topologyOwners.filter((record) => record.ownerClass === 'UNEXPECTED_SEMANTIC_AUTHORITY'),
  ];
  if (missingOwners.length) failures.push(`missing owners: ${missingOwners.join(', ')}`);
  if (unknownOwners.length) failures.push('unknown owner records are not allowed');
  if (unexpectedOwners.length) failures.push('unexpected owner records are not allowed');
  if (duplicateOwners.length) failures.push(`duplicate owners: ${duplicateOwners.join(', ')}`);

  return {
    safe: failures.length === 0,
    failures,
    missingOwners,
    unexpectedOwners,
    duplicateOwners,
    owners,
  };
}

function buildManifest({
  repoRoot,
  expectedHeadSha,
  branchPolicy,
  topologyResult,
  runtimeOwnerPaths,
  relevantIgnoredPaths,
  authorityObservation,
  runId,
  createdAt,
}) {
  const normalizedRoot = normalizeRoot(repoRoot);
  const headSha = normalizeSha(safeGit(normalizedRoot, ['rev-parse', 'HEAD']));
  const expected = normalizeSha(expectedHeadSha, { allowNull: true });
  const statusEntries = gitStatusEntries(normalizedRoot);
  const branchName = safeGit(normalizedRoot, ['symbolic-ref', '--quiet', '--short', 'HEAD']).trim();
  const branch = branchName || `DETACHED@${headSha}`;
  const branchFailure =
    branchPolicy?.expectedBranch && branch !== branchPolicy.expectedBranch
      ? `branch expected ${branchPolicy.expectedBranch} got ${branch}`
      : !branchName && branchPolicy?.allowDetached === false
        ? 'detached HEAD is not permitted by branch policy'
        : null;
  const ownerRecords = sortedOwnerRecords(runtimeOwnerPaths);
  const ownerFiles = ownerRecords.map((owner) => ({
    ...owner,
    gitState: currentGitState(statusEntries, owner.relativePath),
    rawSha256: rawSha256(normalizedRoot, owner.relativePath),
  }));
  const missingHashes = ownerFiles.filter((owner) => !owner.rawSha256).map((owner) => owner.relativePath);
  const ignoredPaths = [...new Set((relevantIgnoredPaths || []).map(normalizePath))].sort((a, b) => a.localeCompare(b, 'en'));
  const ignoredRelevantFiles = ignoredPaths.map((relativePath) => ({
    relativePath,
    rawSha256: rawSha256(normalizedRoot, relativePath),
    gitState: currentGitState(statusEntries, relativePath),
  }));
  const authorityResult = validateAuthority(authorityObservation);
  const launchInput = {
    ...DEFAULT_RUNTIME_LAUNCH,
    ...(authorityObservation?.runtimeLaunch || {}),
  };
  const runtimeLaunch = {
    ...launchInput,
    launchCommandSha256: sha256(launchInput.launchCommand),
  };
  const trackedStatus = statusEntries
    .filter((entry) => entry.status !== '??')
    .map((entry) => ({ status: entry.status, path: entry.path, raw: entry.raw }));
  const untrackedRepoOwnedFiles = statusEntries
    .filter((entry) => entry.status === '??' && relevantPath(entry.path))
    .map((entry) => ({ path: entry.path, raw: entry.raw }));
  const sourcePayload = {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    runId: String(runId || ''),
    repoRoot: normalizedRoot,
    branch,
    headSha,
    expectedHeadSha: expected,
    worktreeDirty: statusEntries.length > 0,
    trackedStatus,
    untrackedRepoOwnedFiles,
    ignoredRelevantFiles,
    ownerTopology: {
      registryVersion: String(topologyResult?.registryVersion || topologyResult?.topology?.registryVersion || 'M18-RUN-TOPOLOGY-INPUT'),
      canonicalOwners: sortedOwnerRecords(topologyResult?.owners || topologyResult?.canonicalOwners || topologyResult?.topology?.canonicalOwners || ownerRecords),
      unknownOwners: topologyResult?.unknownOwners || [],
      unexpectedOwners: topologyResult?.unexpectedOwners || [],
      missingOwners: topologyResult?.missingOwners || [],
      duplicateOwners: topologyResult?.duplicateOwners || [],
    },
    runtimeOwnerFiles: ownerFiles,
    runtimeLaunch,
    authority: authorityResult.authority || authorityObservation,
  };
  const failures = [];
  if (!SHA40.test(headSha)) failures.push(`current HEAD is not a 40-character SHA: ${headSha}`);
  if (expected && (!SHA40.test(expected) || expected !== headSha)) failures.push(`expected HEAD ${expected} does not match current HEAD ${headSha}`);
  if (branchFailure) failures.push(branchFailure);
  if (!topologyResult?.safe) failures.push(...(topologyResult?.failures || ['owner topology is unsafe']));
  if (missingHashes.length) failures.push(`runtime owner files missing: ${missingHashes.join(', ')}`);
  if (!authorityResult.safe) failures.push(...authorityResult.failureReasons);
  const canonicalBytes = canonicalJson(sourcePayload);
  const manifestSha256 = sha256(canonicalBytes);
  const manifest = {
    ...sourcePayload,
    sourceIdentityDigest: manifestSha256,
    createdAt: String(createdAt || new Date().toISOString()),
    manifestSha256,
  };
  if (failures.length) return { ...failure('PROVENANCE_INVALID', ...failures), manifest, canonicalBytes, manifestSha256 };
  return success({ manifest, canonicalBytes, manifestSha256 });
}

export function captureRunSourceManifest(input) {
  try {
    return buildManifest(input);
  } catch (error) {
    return failure('HARNESS_DEFECT', error instanceof Error ? error.message : String(error));
  }
}

export function bindRuntimeToSourceManifest({ manifest, manifestSha256, runtimeObservation, authorityObservation }) {
  const reasons = [];
  const runtime = runtimeObservation || {};
  const dockerRuntime = runtime.runtimeKind === 'DOCKER';
  if (!manifest || manifest.schemaVersion !== PROVENANCE_SCHEMA_VERSION) reasons.push('invalid or missing source manifest');
  if (!SHA64.test(String(manifestSha256 || ''))) reasons.push('invalid source manifest digest');
  if (runtime.sourceManifestSha256 !== manifestSha256) reasons.push('runtime manifest digest mismatch');
  if (!runtime.repoRoot || normalizeRoot(runtime.repoRoot) !== manifest.repoRoot) reasons.push('runtime repository root mismatch');
  if (!runtime.headSha || normalizeSha(runtime.headSha) !== manifest.headSha) reasons.push('runtime HEAD mismatch');
  if (!runtime.entrypoint || normalizePath(runtime.entrypoint) !== manifest.runtimeLaunch.entrypoint) reasons.push('runtime entrypoint mismatch');
  if (!runtime.cwd || normalizePath(runtime.cwd) !== normalizePath(manifest.runtimeLaunch.workingDirectory)) reasons.push('runtime working directory mismatch');
  if (dockerRuntime) {
    reasons.push(...validateDockerRuntimeObservation(runtime, manifest));
  } else {
    if (runtime.port == null || Number(runtime.port) !== Number(manifest.runtimeLaunch.port)) reasons.push('runtime port mismatch');
    if (runtime.portOwnerPid == null || Number(runtime.portOwnerPid) !== Number(runtime.pid)) reasons.push('runtime PID does not own the configured port');
    if (!Number.isInteger(Number(runtime.pid)) || Number(runtime.pid) <= 0) reasons.push('runtime PID is missing');
    if (!runtime.processStartTime) reasons.push('runtime process start time is missing');
    if (runtime.healthStatus !== 'PASS') reasons.push('runtime health is not PASS');
    if (runtime.staleListener === true) reasons.push('pre-existing stale listener is not accepted');
    if (runtime.startedAfterManifest !== true) reasons.push('runtime was not proven to start after manifest capture');
  }
  const authorityResult = validateAuthority(authorityObservation || runtime.authority);
  if (!authorityResult.safe) reasons.push(...authorityResult.failureReasons);
  if (reasons.length) return failure(reasons.some((reason) => reason.includes('authority')) ? 'SECURITY_FAILURE' : 'ENVIRONMENT_INVALID', ...reasons);
  const dockerBindingAddresses = normalizedAddressList(runtime.hostPortBindingAddresses);
  const dockerListenerAddresses = normalizedAddressList(runtime.hostPortListenerAddresses);
  const dockerOwnerPids = [...new Set((Array.isArray(runtime.hostPortOwnerPids) ? runtime.hostPortOwnerPids : []).map(Number).filter((value) => Number.isInteger(value) && value > 0))].sort((left, right) => left - right);
  const dockerOwnerProcesses = [...new Set((Array.isArray(runtime.hostPortOwnerProcesses) ? runtime.hostPortOwnerProcesses : []).map((value) => String(value || '').trim()).filter(Boolean))].sort();
  const dockerForwarders = Array.isArray(runtime.hostPortForwarders) ? runtime.hostPortForwarders : [];
  const runtimeBinding = {
    ...(dockerRuntime ? {
      runtimeKind: 'DOCKER',
      bindingSchemaVersion: DOCKER_RUNTIME_BINDING_SCHEMA_VERSION,
      containerName: String(runtime.containerName),
      containerId: String(runtime.containerId).toLowerCase(),
      imageId: String(runtime.imageId).toLowerCase(),
      hostPort: Number(runtime.hostPort),
      containerPort: Number(runtime.containerPort),
      hostPortOwnerPids: dockerOwnerPids,
      hostPortOwnerProcesses: dockerOwnerProcesses,
      hostPortOwnerSource: 'WINDOWS_GET_NET_TCP_CONNECTION',
      hostPortOwnerObservation: 'VERIFIED_HOST_SOCKET_OWNERS',
      hostPortForwardingMode: 'DOCKER_DESKTOP_PROXY',
      hostPortBindingAddresses: dockerBindingAddresses,
      hostPortListenerAddresses: dockerListenerAddresses,
      hostPortForwarders: dockerForwarders,
      pidObservationSource: 'docker-exec-procfs',
      processPidNamespace: 'CONTAINER',
      pidStableAcrossProbe: true,
      containerLaunchCommand: String(runtime.containerLaunchCommand),
      containerPid: Number(runtime.containerPid),
      containerProcessCommand: String(runtime.containerProcessCommand),
      containerProcessCwd: normalizePath(runtime.containerProcessCwd),
      containerProcessStartTime: String(runtime.containerProcessStartTime),
      containerProcessStartTimeTicks: Number(runtime.containerProcessStartTimeTicks),
      containerProcessStartTimeSource: 'PROC_STAT_STARTTIME',
      containerStartTime: String(runtime.containerStartTime),
      mountType: 'bind',
      mountSource: normalizeRoot(runtime.mountSource),
      mountTarget: '/app',
      buildContext: normalizeRoot(runtime.buildContext),
      containerSourceIdentity: String(runtime.containerSourceIdentity).toUpperCase(),
      containerSourceContractBindingSha256: String(runtime.containerSourceContractBindingSha256).toUpperCase(),
      sourceIdentity: String(runtime.sourceIdentity).toUpperCase(),
      sourceContractBindingSha256: String(runtime.sourceContractBindingSha256).toUpperCase(),
      sourceMutation: false,
      healthEndpoint: 'http://127.0.0.1:3000/health',
      runtimeObservedAfterManifest: true,
      startedAfterManifest: runtime.startedAfterManifest === true,
      staleListener: false,
    } : {}),
    sourceManifestSha256: manifestSha256,
    repoRoot: manifest.repoRoot,
    headSha: manifest.headSha,
    entrypoint: manifest.runtimeLaunch.entrypoint,
    cwd: manifest.runtimeLaunch.workingDirectory,
    pid: Number(dockerRuntime ? runtime.containerPid : runtime.pid),
    executablePath: String(runtime.executablePath || ''),
    commandLine: String(runtime.commandLine || ''),
    port: Number(runtime.port ?? runtime.hostPort ?? manifest.runtimeLaunch.port),
    ...(dockerRuntime
      ? { portOwnerPids: dockerOwnerPids }
      : { portOwnerPid: Number(runtime.portOwnerPid ?? runtime.pid) }),
    processStartTime: String(runtime.processStartTime || runtime.containerProcessStartTime),
    healthStatus: String(runtime.healthStatus || 'PASS'),
    authority: authorityResult.authority,
  };
  return success({ runtimeBinding });
}

export function verifyRuntimeProvenance({ manifest, runtimeBinding, authorityObservation }) {
  const reasons = [];
  const dockerRuntime = runtimeBinding?.runtimeKind === 'DOCKER';
  if (!manifest || !runtimeBinding) reasons.push('manifest and runtime binding are required');
  if (manifest && runtimeBinding?.sourceManifestSha256 !== manifest.manifestSha256) reasons.push('runtime binding is not bound to manifest digest');
  if (manifest && runtimeBinding?.repoRoot !== manifest.repoRoot) reasons.push('runtime binding repository root mismatch');
  if (manifest && runtimeBinding?.headSha !== manifest.headSha) reasons.push('runtime binding HEAD mismatch');
  if (dockerRuntime) {
    reasons.push(...validateDockerRuntimeObservation(runtimeBinding, manifest));
  } else {
    if (manifest && runtimeBinding?.pid !== runtimeBinding?.portOwnerPid) reasons.push('runtime binding PID does not own port');
    if (runtimeBinding?.healthStatus !== 'PASS') reasons.push('runtime health is not PASS');
  }
  const authorityResult = validateAuthority(authorityObservation || runtimeBinding?.authority);
  if (!authorityResult.safe) reasons.push(...authorityResult.failureReasons);
  return reasons.length
    ? failure(reasons.some((reason) => reason.includes('authority')) ? 'SECURITY_FAILURE' : 'PROVENANCE_INVALID', ...reasons)
    : success();
}

export function captureRunEndManifest({ startManifest, ...input }) {
  return captureRunSourceManifest({
    ...input,
    topologyResult: input.topologyRegistry || input.topologyResult,
    runId: startManifest?.runId,
    createdAt: input.capturedAt,
  });
}

function sourcePayloadFromManifest(manifest) {
  if (!manifest) return null;
  const { manifestSha256, sourceIdentityDigest, createdAt, ...payload } = manifest;
  return payload;
}

function diffValues(left, right, prefix = '') {
  if (canonicalJson(left) === canonicalJson(right)) return [];
  if (
    left == null ||
    right == null ||
    typeof left !== 'object' ||
    typeof right !== 'object' ||
    Array.isArray(left) !== Array.isArray(right)
  ) {
    return [{ path: prefix || '$', start: left, end: right }];
  }
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort((a, b) => a.localeCompare(b, 'en'));
  return keys.flatMap((key) => diffValues(left[key], right[key], prefix ? `${prefix}.${key}` : key));
}

export function compareRunSourceManifests(startManifest, endManifest) {
  const startPayload = sourcePayloadFromManifest(startManifest);
  const endPayload = sourcePayloadFromManifest(endManifest);
  const differences = diffValues(startPayload, endPayload);
  return {
    same: differences.length === 0,
    sourceMutation: differences.length > 0,
    differences,
    failureClass: differences.length > 0 ? 'PROVENANCE_INVALID' : null,
    failureReasons: differences.length > 0 ? ['run-start and run-end source identity differ'] : [],
  };
}

export function createProvenanceReceipt({ runStart, runEnd, runtimeBinding, suiteResults, finalStatus, capturedAt }) {
  const comparison = compareRunSourceManifests(runStart?.manifest || runStart, runEnd?.manifest || runEnd);
  const startSha = runStart?.manifestSha256 || runStart?.manifest?.manifestSha256 || runStart?.manifestSha256;
  const endSha = runEnd?.manifestSha256 || runEnd?.manifest?.manifestSha256 || runEnd?.manifestSha256;
  const payload = {
    receiptSchemaVersion: RECEIPT_SCHEMA_VERSION,
    runId: runStart?.manifest?.runId || runStart?.runId,
    startManifestSha256: startSha,
    endManifestSha256: endSha,
    runtimeBinding: runtimeBinding || null,
    suiteResults: suiteResults || [],
    sourceMutation: comparison.sourceMutation,
    sourceDifferences: comparison.differences,
    finalStatus: String(finalStatus || ''),
    capturedAt: String(capturedAt || new Date().toISOString()),
  };
  const canonicalBytes = canonicalJson(payload);
  const receiptSha256 = sha256(canonicalBytes);
  return {
    receipt: { ...payload, receiptSha256 },
    canonicalBytes,
    receiptSha256,
  };
}

export function verifyProvenanceReceipt({ receiptBytes, expectedRunId, expectedStartSha256, expectedEndSha256 }) {
  let receipt;
  try {
    receipt = typeof receiptBytes === 'string' || Buffer.isBuffer(receiptBytes)
      ? JSON.parse(String(receiptBytes))
      : receiptBytes;
  } catch (error) {
    return failure('PROVENANCE_INVALID', `receipt JSON is invalid: ${error.message}`);
  }
  if (!receipt || typeof receipt !== 'object') return failure('PROVENANCE_INVALID', 'receipt is missing');
  const { receiptSha256, ...payload } = receipt;
  const reasons = [];
  if (receipt.receiptSchemaVersion !== RECEIPT_SCHEMA_VERSION) reasons.push('receipt schema version mismatch');
  if (expectedRunId && receipt.runId !== expectedRunId) reasons.push('receipt run ID mismatch');
  if (expectedStartSha256 && receipt.startManifestSha256 !== expectedStartSha256) reasons.push('receipt start manifest mismatch');
  if (expectedEndSha256 && receipt.endManifestSha256 !== expectedEndSha256) reasons.push('receipt end manifest mismatch');
  if (receipt.runtimeBinding?.sourceManifestSha256 && receipt.runtimeBinding.sourceManifestSha256 !== receipt.startManifestSha256) reasons.push('receipt runtime binding manifest mismatch');
  if (receipt.sourceMutation === true && ['PASS', 'GREEN'].includes(String(receipt.finalStatus).toUpperCase())) reasons.push('mutated source cannot have a passing receipt');
  for (const [index, suiteResult] of (Array.isArray(receipt.suiteResults) ? receipt.suiteResults : []).entries()) {
    for (const counter of [
      'businessWriteExecution',
      'authorizationMutation',
      'downstreamBusinessWrite',
      'externalLlmProviderCount',
      'externalLlmNetworkCallCount',
      'llmApiSecretCount',
      'runtimeFallbackCount',
      'downstreamSemanticRedecisionCount',
      'shadowSemanticAuthorityCount',
    ]) {
      if (Number(suiteResult?.[counter] || 0) !== 0) reasons.push(`suite result ${index} has nonzero ${counter}`);
    }
  }
  if (!SHA64.test(String(receiptSha256 || ''))) reasons.push('receipt digest is invalid');
  if (sha256(canonicalJson(payload)) !== receiptSha256) reasons.push('receipt digest mismatch');
  return reasons.length ? failure('PROVENANCE_INVALID', ...reasons) : success({ receipt });
}
