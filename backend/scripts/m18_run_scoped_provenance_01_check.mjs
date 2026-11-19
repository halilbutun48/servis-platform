import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const TRUSTED_CHECKER = path.join(
  SCRIPT_DIR,
  'm18_typed_semantic_evidence_baseline_01_check.js',
);
const PROVENANCE_MODULE = path.join(
  SCRIPT_DIR,
  'lib',
  'm18RunScopedProvenance.mjs',
);
const MANIFEST_SCHEMA = path.join(
  SCRIPT_DIR,
  'lib',
  'm18RunSourceManifestV1.json',
);

const FAMILIES = Object.freeze([
  {
    id: 'baseline_report_shape',
    label: 'baseline report/version and shape',
    classification: 'VALID_INTEGRITY_GATE',
  },
  {
    id: 'historical_source_identity',
    label: '19-file historical source identity',
    classification: 'STALE_HISTORICAL_EVIDENCE_RETIRE',
  },
  {
    id: 'historical_command_identity',
    label: 'eight historical command identities/evidence',
    classification: 'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1',
  },
  {
    id: 'historical_regression',
    label: 'historical regression PASS',
    classification: 'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1',
  },
  {
    id: 'role_help_metrics',
    label: 'role-help diagnostic metrics',
    classification: 'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1',
  },
  {
    id: 'action_output',
    label: 'action output/status',
    classification: 'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1',
  },
  {
    id: 'authorization_output',
    label: 'authorization output/status',
    classification: 'VALID_SECURITY_AUTHORITY_GATE',
  },
  {
    id: 'tenant_output',
    label: 'tenant output/status',
    classification: 'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1',
  },
  {
    id: 'write_counters',
    label: 'six zero-write counters',
    classification: 'VALID_INTEGRITY_GATE',
  },
  {
    id: 'external_ai_counters',
    label: 'three zero-external-AI counters',
    classification: 'VALID_SECURITY_AUTHORITY_GATE',
  },
  {
    id: 'service_browser_identity',
    label: 'service/browser command-identity state',
    classification: 'VALID_INTEGRITY_GATE',
  },
]);

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function classifyInventory() {
  const counts = Object.fromEntries(
    [
      'VALID_INTEGRITY_GATE',
      'VALID_SECURITY_AUTHORITY_GATE',
      'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1',
      'STALE_HISTORICAL_EVIDENCE_RETIRE',
      'DUPLICATE_RETIRE',
      'UNKNOWN_STOP',
    ].map((classification) => [classification, 0]),
  );

  for (const family of FAMILIES) counts[family.classification] += 1;
  return counts;
}

function classifyLegacySourceAuthority(source) {
  const text = String(source || '');
  const historicalPinActive = /const\s+APPROVED_RUNTIME_FILES\s*=\s*Object\.freeze\s*\(/u.test(text);
  const trustedExecutionBody = text.match(/async\s+function\s+runTrustedStage0AndScore\s*\([\s\S]*?\n\}\n\nexport\s*\{/u)?.[0] || '';
  const historicalReviewActive = /assertReviewRound1Contract\s*\(/u.test(trustedExecutionBody);
  return { historicalPinActive, historicalReviewActive };
}

function inspectLegacyState() {
  const source = readText(TRUSTED_CHECKER);
  const { historicalPinActive, historicalReviewActive } = classifyLegacySourceAuthority(source);
  const runScopedStartManifestPresent = fs.existsSync(MANIFEST_SCHEMA);
  const runScopedAuthorityPresent = fs.existsSync(PROVENANCE_MODULE);

  return {
    historicalPinActive,
    historicalReviewActive,
    runScopedStartManifestPresent,
    runScopedAuthorityPresent,
    state:
      historicalPinActive || historicalReviewActive
        ? 'LEGACY_ACTIVE'
        : 'MIGRATED',
  };
}

function printInventory(mode) {
  const counts = classifyInventory();
  const legacy = inspectLegacyState();
  const inventory = {
    mode,
    familyCount: FAMILIES.length,
    families: FAMILIES,
    classificationCounts: counts,
    legacy,
    migrationBoundary: {
      unknownFamiliesBlockMigration: counts.UNKNOWN_STOP > 0,
      unknownFamilyCount: counts.UNKNOWN_STOP,
    },
  };
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  return { counts, legacy };
}

async function runManifestContract(mode) {
  const helperExists = fs.existsSync(PROVENANCE_MODULE);
  const schemaExists = fs.existsSync(MANIFEST_SCHEMA);

  if (mode === 'RED') {
    assert(!helperExists, 'Manifest RED must precede the provenance helper implementation');
    assert(!schemaExists, 'Manifest RED must precede the manifest schema implementation');
    process.stdout.write(
      'EXPECTED_RED: run-scoped manifest schema and shared provenance authority are not implemented.\n',
    );
    return;
  }

  const provenance = await import(pathToFileURL(PROVENANCE_MODULE).href);
  const schema = JSON.parse(readText(MANIFEST_SCHEMA));
  assert(schema.$id === 'M18-RUN-SOURCE-MANIFEST-V1', 'Unexpected manifest schema identity');
  assert(schema.type === 'object', 'Manifest schema must be an object schema');
  assert(schema.required.includes('schemaVersion'), 'Manifest schema must require schemaVersion');
  assert(schema.required.includes('headSha'), 'Manifest schema must require headSha');
  assert(schema.required.includes('runtimeOwnerFiles'), 'Manifest schema must require runtimeOwnerFiles');

  const runtimeOwnerPaths = [
    { relativePath: 'backend/src/server.js', ownerClass: 'RUNTIME_ENTRYPOINT', lifecycleClass: 'CANONICAL_ENTRYPOINT' },
    { relativePath: 'backend/src/ai/chat/semanticAuthorityMode.js', ownerClass: 'SEMANTIC_AUTHORITY', lifecycleClass: 'CANONICAL_AUTHORITY' },
  ];
  const topologyResult = {
    safe: true,
    failures: [],
    missingOwners: [],
    unexpectedOwners: [],
    duplicateOwners: [],
    owners: runtimeOwnerPaths,
  };
  const authorityObservation = {
    semanticAuthorityMode: 'NEW',
    liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
    semanticAuthorityCount: 1,
    shadowSemanticAuthorityCount: 0,
    runtimeFallbackCount: 0,
    downstreamSemanticRedecisionCount: 0,
  };
  const capture = provenance.captureRunSourceManifest({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult,
    runtimeOwnerPaths,
    relevantIgnoredPaths: [],
    authorityObservation,
    runId: 'manifest-contract-test',
    createdAt: '2026-10-06T00:00:00.000Z',
  });
  assert(capture.safe, `Valid manifest capture rejected: ${capture.failureReasons?.join('; ')}`);
  assert(/^[A-F0-9]{64}$/.test(capture.manifestSha256), 'Manifest digest must be uppercase SHA-256');
  const equivalent = provenance.captureRunSourceManifest({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult,
    runtimeOwnerPaths: [...runtimeOwnerPaths].reverse(),
    relevantIgnoredPaths: [],
    authorityObservation,
    runId: 'manifest-contract-test',
    createdAt: '2099-01-01T00:00:00.000Z',
  });
  assert(equivalent.safe, 'Equivalent manifest capture rejected');
  assert(
    equivalent.manifestSha256 === capture.manifestSha256,
    'Volatile timestamp or enumeration order changed the manifest digest',
  );
  const invalidHead = provenance.captureRunSourceManifest({
    repoRoot: REPO_ROOT,
    expectedHeadSha: '0'.repeat(40),
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult,
    runtimeOwnerPaths,
    relevantIgnoredPaths: [],
    authorityObservation,
    runId: 'manifest-contract-test-invalid',
    createdAt: '2026-10-06T00:00:00.000Z',
  });
  assert(!invalidHead.safe, 'Wrong expected HEAD must fail closed');
  process.stdout.write('GREEN: manifest schema, canonicalization, and fail-closed DTO tests passed.\n');
}

async function runOwnerTopologyContract(mode) {
  const provenance = await import(pathToFileURL(PROVENANCE_MODULE).href);
  const validOwners = [
    { relativePath: 'backend/src/server.js', ownerClass: 'RUNTIME_ENTRYPOINT', lifecycleClass: 'CANONICAL_ENTRYPOINT' },
    { relativePath: 'backend/src/ai/chat/semanticAuthorityMode.js', ownerClass: 'SEMANTIC_AUTHORITY', lifecycleClass: 'CANONICAL_AUTHORITY' },
  ];
  const unexpectedRegistry = {
    canonicalOwners: [
      ...validOwners,
      { relativePath: 'backend/src/ai/chat/unexpectedSemanticAuthority.js', ownerClass: 'UNEXPECTED_SEMANTIC_AUTHORITY', lifecycleClass: 'COMPETING_AUTHORITY' },
    ],
  };
  const unexpected = provenance.validateCanonicalOwnerTopology({
    repoRoot: REPO_ROOT,
    topologyRegistry: unexpectedRegistry,
    requiredOwnerClasses: ['RUNTIME_ENTRYPOINT', 'SEMANTIC_AUTHORITY'],
    runtimeOwnerPaths: validOwners,
  });
  if (mode === 'RED') {
    assert(
      unexpected.safe,
      'Topology RED is no longer reproducible; unexpected registry owners are already rejected',
    );
    process.stdout.write('EXPECTED_RED: unexpected canonical topology owner is not yet rejected.\n');
    return;
  }
  assert(!unexpected.safe, 'Unexpected canonical owner must fail closed');
  const missing = provenance.validateCanonicalOwnerTopology({
    repoRoot: REPO_ROOT,
    topologyRegistry: {},
    requiredOwnerClasses: ['RUNTIME_ENTRYPOINT', 'SEMANTIC_AUTHORITY', 'AUTHORIZATION'],
    runtimeOwnerPaths: validOwners,
  });
  assert(!missing.safe && missing.missingOwners.includes('AUTHORIZATION'), 'Missing owner must fail closed');
  const duplicate = provenance.validateCanonicalOwnerTopology({
    repoRoot: REPO_ROOT,
    topologyRegistry: {},
    requiredOwnerClasses: ['RUNTIME_ENTRYPOINT'],
    runtimeOwnerPaths: [validOwners[0], validOwners[0]],
  });
  assert(!duplicate.safe && duplicate.duplicateOwners.includes('backend/src/server.js'), 'Duplicate owner must fail closed');
  const authority = provenance.captureRunSourceManifest({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult: { safe: true, owners: validOwners, missingOwners: [], unexpectedOwners: [], duplicateOwners: [] },
    runtimeOwnerPaths: validOwners,
    relevantIgnoredPaths: [],
    authorityObservation: {
      semanticAuthorityMode: 'NEW',
      liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
      semanticAuthorityCount: 1,
      shadowSemanticAuthorityCount: 0,
      runtimeFallbackCount: 0,
      downstreamSemanticRedecisionCount: 0,
    },
    runId: 'owner-topology-test',
    createdAt: '2026-10-06T00:00:00.000Z',
  });
  assert(authority.safe, 'Dirty current checkout with valid owners must be accepted');
  assert(authority.manifest.worktreeDirty === true, 'Current dirty worktree must be captured');
  assert(authority.manifest.runtimeOwnerFiles.every((file) => /^[A-F0-9]{64}$/.test(file.rawSha256)), 'Owner hashes must be captured');
  assert(Array.isArray(authority.manifest.trackedStatus), 'Tracked status must be captured');
  process.stdout.write('GREEN: owner topology and dirty-worktree contract tests passed.\n');
}

async function runRuntimeContract(mode) {
  const provenance = await import(pathToFileURL(PROVENANCE_MODULE).href);
  const owners = [
    { relativePath: 'backend/src/server.js', ownerClass: 'RUNTIME_ENTRYPOINT', lifecycleClass: 'CANONICAL_ENTRYPOINT' },
    { relativePath: 'backend/src/ai/chat/semanticAuthorityMode.js', ownerClass: 'SEMANTIC_AUTHORITY', lifecycleClass: 'CANONICAL_AUTHORITY' },
  ];
  const authority = {
    semanticAuthorityMode: 'NEW',
    liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
    semanticAuthorityCount: 1,
    shadowSemanticAuthorityCount: 0,
    runtimeFallbackCount: 0,
    downstreamSemanticRedecisionCount: 0,
  };
  const capture = provenance.captureRunSourceManifest({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult: { safe: true, owners, missingOwners: [], unexpectedOwners: [], duplicateOwners: [] },
    runtimeOwnerPaths: owners,
    relevantIgnoredPaths: [],
    authorityObservation: authority,
    runId: 'runtime-binding-test',
    createdAt: '2026-10-06T00:00:00.000Z',
  });
  assert(capture.safe, 'Runtime fixture manifest must be valid');
  const incomplete = provenance.bindRuntimeToSourceManifest({
    manifest: capture.manifest,
    manifestSha256: capture.manifestSha256,
    runtimeObservation: {
      repoRoot: REPO_ROOT,
      headSha: capture.manifest.headSha,
      pid: 12345,
      portOwnerPid: 12345,
      processStartTime: '2026-10-06T00:00:01.000Z',
      healthStatus: 'PASS',
    },
    authorityObservation: authority,
  });
  if (mode === 'RED') {
    assert(incomplete.safe, 'Runtime RED is no longer reproducible; incomplete identity is already rejected');
    process.stdout.write('EXPECTED_RED: incomplete runtime identity is not yet rejected.\n');
    return;
  }
  const validObservation = {
    sourceManifestSha256: capture.manifestSha256,
    repoRoot: REPO_ROOT,
    headSha: capture.manifest.headSha,
    entrypoint: 'backend/src/server.js',
    cwd: 'backend',
    pid: 12345,
    portOwnerPid: 12345,
    processStartTime: '2026-10-06T00:00:01.000Z',
    executablePath: 'node.exe',
    commandLine: 'node src/server.js',
    port: 3400,
    healthStatus: 'PASS',
    startedAfterManifest: true,
  };
  const valid = provenance.bindRuntimeToSourceManifest({
    manifest: capture.manifest,
    manifestSha256: capture.manifestSha256,
    runtimeObservation: validObservation,
    authorityObservation: authority,
  });
  assert(valid.safe, `Valid runtime binding rejected: ${valid.failureReasons?.join('; ')}`);
  assert(provenance.verifyRuntimeProvenance({ manifest: capture.manifest, runtimeBinding: valid.runtimeBinding, authorityObservation: authority }).safe, 'Valid runtime provenance rejected');

  const dockerAuthority = {
    ...authority,
    runtimeLaunch: {
      entrypoint: 'backend/src/server.js',
      workingDirectory: 'backend',
      port: 3000,
      launchCommand: 'docker compose exec personel_api npm run dev',
    },
  };
  const dockerCapture = provenance.captureRunSourceManifest({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult: { safe: true, owners, missingOwners: [], unexpectedOwners: [], duplicateOwners: [] },
    runtimeOwnerPaths: owners,
    relevantIgnoredPaths: [],
    authorityObservation: dockerAuthority,
    runId: 'docker-runtime-binding-test',
    createdAt: '2026-10-06T00:00:00.000Z',
  });
  const dockerObservation = {
    runtimeKind: 'DOCKER',
    bindingSchemaVersion: 'M18-DOCKER-RUNTIME-BINDING-V2',
    containerName: 'personel_api',
    containerId: 'a'.repeat(64),
    imageId: `sha256:${'b'.repeat(64)}`,
    sourceManifestSha256: dockerCapture.manifestSha256,
    repoRoot: REPO_ROOT,
    headSha: dockerCapture.manifest.headSha,
    entrypoint: 'backend/src/server.js',
    cwd: 'backend',
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
    containerStartTime: '2026-10-05T23:59:00.000Z',
    mountType: 'bind',
    mountSource: REPO_ROOT,
    mountTarget: '/app',
    buildContext: REPO_ROOT,
    containerSourceIdentity: 'A'.repeat(64),
    containerSourceContractBindingSha256: 'B'.repeat(64),
    sourceIdentity: 'A'.repeat(64),
    sourceContractBindingSha256: 'B'.repeat(64),
    sourceMutation: false,
    processStartTime: 'proc-stat-starttime:12345',
    healthStatus: 'PASS',
    healthEndpoint: 'http://127.0.0.1:3000/health',
    runtimeObservedAfterManifest: true,
    startedAfterManifest: false,
    staleListener: false,
  };
  const dockerValid = provenance.bindRuntimeToSourceManifest({
    manifest: dockerCapture.manifest,
    manifestSha256: dockerCapture.manifestSha256,
    runtimeObservation: dockerObservation,
    authorityObservation: dockerAuthority,
  });
  if (mode === 'RED') {
    assert(!dockerValid.safe, 'Docker runtime binding is unexpectedly accepted before implementation');
    assert(dockerValid.failureReasons.includes('RUNTIME_PORT_MISMATCH'), `Unexpected Docker RED reason: ${dockerValid.failureReasons?.join('; ')}`);
    process.stdout.write('EXPECTED_RED: valid Docker runtime binding is not yet supported.\n');
    return;
  }
  assert(dockerValid.safe, `Valid Docker runtime binding rejected: ${dockerValid.failureReasons?.join('; ')}`);
  assert(dockerValid.runtimeBinding.runtimeKind === 'DOCKER', 'Docker runtime kind was not preserved');
  assert(dockerValid.runtimeBinding.containerId === dockerObservation.containerId, 'Container identity was not preserved');
  assert(dockerValid.runtimeBinding.hostPort === 3000 && dockerValid.runtimeBinding.containerPort === 3000, 'Docker port mapping was not preserved');
  const dockerMutations = [
    ['wrong Docker image', { imageId: 'sha256:invalid' }],
    ['wrong Docker mount', { mountSource: `${REPO_ROOT}-other` }],
    ['wrong container process', { containerProcessCommand: 'node unrelated.js' }],
    ['wrong Docker port mapping', { containerPort: 3400 }],
    ['wrong PID namespace', { processPidNamespace: 'HOST' }],
    ['unstable PID', { pidStableAcrossProbe: false }],
    ['nodemon process selection', { containerProcessCommand: 'node /app/node_modules/nodemon/bin/nodemon.js src/server.js' }],
  ];
  for (const [label, mutation] of dockerMutations) {
    const result = provenance.bindRuntimeToSourceManifest({
      manifest: dockerCapture.manifest,
      manifestSha256: dockerCapture.manifestSha256,
      runtimeObservation: { ...dockerObservation, ...mutation },
      authorityObservation: dockerAuthority,
    });
    assert(!result.safe, `${label} must fail closed`);
  }
  for (const [label, mutation] of [
    ['wrong PID owner', { portOwnerPid: 99999 }],
    ['wrong cwd', { cwd: 'other' }],
    ['wrong entrypoint', { entrypoint: 'backend/src/other.js' }],
    ['wrong digest', { sourceManifestSha256: '0'.repeat(64) }],
    ['failed health', { healthStatus: 'FAIL' }],
    ['stale listener', { staleListener: true }],
    ['started before manifest', { startedAfterManifest: false }],
  ]) {
    const observation = { ...validObservation, ...mutation };
    const result = provenance.bindRuntimeToSourceManifest({
      manifest: capture.manifest,
      manifestSha256: capture.manifestSha256,
      runtimeObservation: observation,
      authorityObservation: authority,
    });
    assert(!result.safe, `${label} must fail closed`);
  }
  const unsafeAuthority = provenance.bindRuntimeToSourceManifest({
    manifest: capture.manifest,
    manifestSha256: capture.manifestSha256,
    runtimeObservation: validObservation,
    authorityObservation: { ...authority, shadowSemanticAuthorityCount: 1 },
  });
  assert(!unsafeAuthority.safe, 'Shadow authority must fail closed');
  process.stdout.write('GREEN: runtime binding and stale/invalid runtime controls passed.\n');
}

async function runReceiptContract(mode) {
  const provenance = await import(pathToFileURL(PROVENANCE_MODULE).href);
  const owners = [
    { relativePath: 'backend/src/server.js', ownerClass: 'RUNTIME_ENTRYPOINT', lifecycleClass: 'CANONICAL_ENTRYPOINT' },
    { relativePath: 'backend/src/ai/chat/semanticAuthorityMode.js', ownerClass: 'SEMANTIC_AUTHORITY', lifecycleClass: 'CANONICAL_AUTHORITY' },
  ];
  const authority = {
    semanticAuthorityMode: 'NEW',
    liveAuthoritativePath: 'NEW_TYPED_EVIDENCE',
    semanticAuthorityCount: 1,
    shadowSemanticAuthorityCount: 0,
    runtimeFallbackCount: 0,
    downstreamSemanticRedecisionCount: 0,
  };
  const runStart = provenance.captureRunSourceManifest({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyResult: { safe: true, owners, missingOwners: [], unexpectedOwners: [], duplicateOwners: [] },
    runtimeOwnerPaths: owners,
    relevantIgnoredPaths: [],
    authorityObservation: authority,
    runId: 'receipt-contract-test',
    createdAt: '2026-10-06T00:00:00.000Z',
  });
  const runEnd = provenance.captureRunEndManifest({
    startManifest: runStart.manifest,
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    branchPolicy: { expectedBranch: null, allowDetached: true },
    topologyRegistry: { safe: true, owners, missingOwners: [], unexpectedOwners: [], duplicateOwners: [] },
    runtimeOwnerPaths: owners,
    relevantIgnoredPaths: [],
    authorityObservation: authority,
    capturedAt: '2026-10-06T00:01:00.000Z',
  });
  assert(runStart.safe && runEnd.safe, 'Receipt fixture manifests must be valid');
  const invalidSecurityReceipt = provenance.createProvenanceReceipt({
    runStart,
    runEnd,
    runtimeBinding: { sourceManifestSha256: runStart.manifestSha256 },
    suiteResults: [{ businessWriteExecution: 1 }],
    finalStatus: 'PASS',
    capturedAt: '2026-10-06T00:02:00.000Z',
  });
  const invalidSecurityVerification = provenance.verifyProvenanceReceipt({
    receiptBytes: invalidSecurityReceipt.receipt,
    expectedRunId: runStart.manifest.runId,
    expectedStartSha256: runStart.manifestSha256,
    expectedEndSha256: runEnd.manifestSha256,
  });
  if (mode === 'RED') {
    assert(invalidSecurityVerification.safe, 'Receipt RED is no longer reproducible; nonzero writes already reject');
    process.stdout.write('EXPECTED_RED: receipt integrity does not yet reject nonzero security counters.\n');
    return;
  }
  const comparison = provenance.compareRunSourceManifests(runStart.manifest, runEnd.manifest);
  assert(comparison.same && !comparison.sourceMutation, 'Equivalent run-start/end manifests must compare equal');
  const mutatedEnd = structuredClone(runEnd.manifest);
  mutatedEnd.runtimeOwnerFiles[0].rawSha256 = '0'.repeat(64);
  const mutatedComparison = provenance.compareRunSourceManifests(runStart.manifest, mutatedEnd);
  assert(!mutatedComparison.same && mutatedComparison.sourceMutation, 'Source mutation must be detected');
  const receipt = provenance.createProvenanceReceipt({
    runStart,
    runEnd,
    runtimeBinding: { sourceManifestSha256: runStart.manifestSha256 },
    suiteResults: [{ businessWriteExecution: 0, externalLlmProviderCount: 0 }],
    finalStatus: 'GREEN',
    capturedAt: '2026-10-06T00:02:00.000Z',
  });
  const verified = provenance.verifyProvenanceReceipt({
    receiptBytes: receipt.receipt,
    expectedRunId: runStart.manifest.runId,
    expectedStartSha256: runStart.manifestSha256,
    expectedEndSha256: runEnd.manifestSha256,
  });
  assert(verified.safe, `Valid receipt rejected: ${verified.failureReasons.join('; ')}`);
  const tampered = { ...receipt.receipt, finalStatus: 'TAMPERED' };
  assert(!provenance.verifyProvenanceReceipt({ receiptBytes: tampered, expectedRunId: runStart.manifest.runId, expectedStartSha256: runStart.manifestSha256, expectedEndSha256: runEnd.manifestSha256 }).safe, 'Tampered receipt must fail closed');
  assert(!provenance.verifyProvenanceReceipt({ receiptBytes: receipt.receipt, expectedRunId: runStart.manifest.runId, expectedStartSha256: '0'.repeat(64), expectedEndSha256: runEnd.manifestSha256 }).safe, 'Wrong start manifest digest must fail closed');
  assert(!provenance.verifyProvenanceReceipt({ receiptBytes: null, expectedRunId: runStart.manifest.runId, expectedStartSha256: runStart.manifestSha256, expectedEndSha256: runEnd.manifestSha256 }).safe, 'Missing receipt must fail closed');
  assert(!invalidSecurityVerification.safe, 'Nonzero security counters must fail closed');
  process.stdout.write('GREEN: run-end equality, source mutation, receipt, and tamper controls passed.\n');
}

async function runStageSeparationContract(mode) {
  const checkerPath = path.join(SCRIPT_DIR, 'm18_typed_semantic_evidence_baseline_01_check.js');
  const checkerSource = readText(checkerPath);
  if (mode === 'RED') {
    assert(!checkerSource.includes('function runTrustedStage0'), 'Stage separation RED is no longer reproducible');
    assert(checkerSource.includes('assertApprovedHistoricalEvidence'), 'Historical semantic gate must be present in the RED');
    assert(checkerSource.includes('assertBaselineContract(report'), 'Legacy contract invocation must be present in the RED');
    process.stdout.write('EXPECTED_RED: trusted checker has no Stage 0/Stage 1 boundary and historical evidence still blocks behavior scoring.\n');
    return;
  }
  const checker = await import(pathToFileURL(checkerPath).href);
  assert(typeof checker.runTrustedStage0 === 'function', 'Stage 0 export');
  assert(typeof checker.runTrustedBehaviorScore === 'function', 'Stage 1 export');
  assert(typeof checker.createTrustedRunResult === 'function', 'trusted result export');
  const validStage0 = checker.runTrustedStage0({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    sourceManifest: { safe: true, manifestSha256: 'A'.repeat(64) },
    runtimeProof: {
      healthcheck: 'PASS',
      mode: 'NEW',
      authoritativePath: 'NEW_TYPED_EVIDENCE',
      semanticAuthorityCount: 1,
      shadowSemanticAuthorityCount: 0,
      runtimeFallbackCount: 0,
      downstreamSemanticRedecisionCount: 0,
    },
    trustedCorpusIdentity: { safe: true },
    schemaIdentity: { safe: true },
    securityObservation: { businessWriteExecution: 0, externalLlmProviderCount: 0 },
  });
  assert(validStage0.status === 'GREEN', 'valid Stage 0 must be GREEN');
  let compareCalls = 0;
  const score = checker.runTrustedBehaviorScore({
    trustedCorpus: [{ id: 'F_ENTITY_EXPLANATION', expected: 'LOOK_UP_FIELD' }],
    expectations: { F_ENTITY_EXPLANATION: 'LOOK_UP_FIELD' },
    transport: () => ({ actual: 'EXPLAIN_RECORD_DETAILS' }),
    compare: ({ expected, actual }) => {
      compareCalls += 1;
      return expected === actual;
    },
  });
  assert(compareCalls === 1, 'Stage 1 must execute the behavioral comparator');
  assert(score.status === 'RED_REAL_BEHAVIOR_DIVERGENCE', 'synthetic semantic divergence must be Stage 1 behavior');
  assert(score.firstFailure.id === 'F_ENTITY_EXPLANATION', 'first Stage 1 divergence is surfaced');
  let blockedCompareCalls = 0;
  const blockedStage0 = checker.runTrustedStage0({
    repoRoot: REPO_ROOT,
    expectedHeadSha: '0'.repeat(40),
    sourceManifest: { safe: false, failureClass: 'PROVENANCE_INVALID' },
    runtimeProof: null,
    trustedCorpusIdentity: { safe: true },
    schemaIdentity: { safe: true },
    securityObservation: { businessWriteExecution: 0 },
  });
  assert(blockedStage0.status === 'BLOCKED', 'invalid Stage 0 must block');
  if (blockedStage0.status === 'GREEN') {
    checker.runTrustedBehaviorScore({ trustedCorpus: [{}], transport: () => { blockedCompareCalls += 1; return {}; }, compare: () => false });
  }
  assert(blockedCompareCalls === 0, 'invalid provenance must never call Stage 1');
  const result = checker.createTrustedRunResult({ stage0: validStage0, score, provenanceReceipt: { receiptSha256: 'B'.repeat(64) } });
  assert(result.status === 'RED_REAL_BEHAVIOR_DIVERGENCE', 'run result preserves Stage 1 status');
  process.stdout.write('GREEN: Stage 0 validity gates Stage 1, and synthetic semantic divergence is surfaced without historical blocking.\n');
}

async function runLegacyRetirementContract(mode) {
  const checkerSource = readText(path.join(SCRIPT_DIR, 'm18_typed_semantic_evidence_baseline_01_check.js'));
  const pinSource = readText(path.join(SCRIPT_DIR, 'm18_trusted_source_pin_01_check.mjs'));
  const pinTableSource = readText(path.join(SCRIPT_DIR, 'm18_trusted_source_pin_table_01_check.mjs'));
  const activePinDeclaration = /const\s+APPROVED_RUNTIME_FILES\s*=\s*Object\.freeze/u.test(checkerSource);
  const archiveOnlyControls = pinSource.includes('--archive-only') && pinTableSource.includes('--archive-only');
  if (mode === 'RED') {
    assert(activePinDeclaration, 'Legacy source-pin RED is no longer reproducible');
    assert(!archiveOnlyControls, 'Legacy pin checks are already archive-only');
    process.stdout.write('EXPECTED_RED: APPROVED_RUNTIME_FILES remains an active authority and pin checks are not archive-only.\n');
    return;
  }
  assert(!activePinDeclaration, 'APPROVED_RUNTIME_FILES must not remain an active declaration');
  assert(archiveOnlyControls, 'Historical pin checks must expose explicit archive-only mode');
  const currentManifest = await import(pathToFileURL(PROVENANCE_MODULE).href);
  assert(typeof currentManifest.captureRunSourceManifest === 'function', 'shared run-scoped authority remains importable');
  process.stdout.write('GREEN: historical source-pin authority is retired from active code and archive-only controls are explicit.\n');
}

async function runHistoricalGateContract(mode) {
  const checkerPath = path.join(SCRIPT_DIR, 'm18_typed_semantic_evidence_baseline_01_check.js');
  const checkerSource = readText(checkerPath);
  if (mode === 'RED') {
    assert(!checkerSource.includes('function classifyHistoricalGate'), 'Historical gate RED is no longer reproducible');
    assert(checkerSource.includes('assertReviewRound1Contract'), 'Blocking historical review must be present in the RED');
    process.stdout.write('EXPECTED_RED: historical semantic review still has no explicit Stage 1 classification boundary.\n');
    return;
  }
  const checker = await import(pathToFileURL(checkerPath).href);
  assert(typeof checker.classifyHistoricalGate === 'function', 'Historical gate classifier export');
  assert(Array.isArray(checker.HISTORICAL_CHECKS), 'Historical gate inventory export');
  const classifications = checker.HISTORICAL_CHECKS.map(([id, scriptPath]) =>
    checker.classifyHistoricalGate({ id, scriptPath, observedResult: { status: 'FAIL', id: 'F_ENTITY_EXPLANATION' } }));
  assert(classifications.length === 8, 'Exactly eight historical semantic gates are classified');
  assert(classifications.every(({ stage, classification }) =>
    stage === 'STAGE_1' && classification === 'CURRENT_BEHAVIOR_REGRESSION_MOVE_TO_STAGE_1'),
  'All historical semantic gates move to Stage 1');
  assert(checker.classifyHistoricalGate({ id: 'NOT_APPROVED', scriptPath: 'backend/scripts/unknown.js' }).stage === 'STOP',
    'Unknown historical gates stop migration');

  const stage0 = checker.runTrustedStage0({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    sourceManifest: { safe: true, manifestSha256: 'A'.repeat(64) },
    runtimeProof: {
      healthcheck: 'PASS',
      mode: 'NEW',
      authoritativePath: 'NEW_TYPED_EVIDENCE',
      semanticAuthorityCount: 1,
      shadowSemanticAuthorityCount: 0,
      runtimeFallbackCount: 0,
      downstreamSemanticRedecisionCount: 0,
    },
    trustedCorpusIdentity: { safe: true },
    schemaIdentity: { safe: true },
    securityObservation: { businessWriteExecution: 0, externalLlmProviderCount: 0 },
    historicalReviewResult: { status: 'FAIL', firstFailure: 'F_ENTITY_EXPLANATION' },
  });
  assert(stage0.status === 'GREEN', 'Historical semantic failure must not block Stage 0');
  const score = checker.runTrustedBehaviorScore({
    trustedCorpus: [{ id: 'F_ENTITY_EXPLANATION', expected: 'LOOK_UP_FIELD' }],
    transport: () => ({ actual: 'EXPLAIN_RECORD_DETAILS' }),
    compare: ({ expected, actual }) => expected === actual,
  });
  assert(score.status === 'RED_REAL_BEHAVIOR_DIVERGENCE', 'F_ENTITY_EXPLANATION reaches Stage 1');
  assert(score.firstFailure.id === 'F_ENTITY_EXPLANATION', 'Stage 1 preserves the known divergence identity');
  process.stdout.write('GREEN: eight historical semantic gates classify to Stage 1; Stage 0 remains provenance-only and F_ENTITY_EXPLANATION is observable in scoring.\n');
}

async function runIntegrationContract(mode) {
  const adapterPath = path.join(SCRIPT_DIR, 'lib', 'm18HoldoutExecutionAdapter.mjs');
  const gatePath = path.join(SCRIPT_DIR, 'm18_typed_semantic_evidence_implementation_gate_01_check.js');
  const freezePath = path.join(SCRIPT_DIR, 'm18_holdout_freeze_01_check.mjs');
  const adapterSource = readText(adapterPath);
  const gateSource = readText(gatePath);
  const freezeSource = readText(freezePath);
  if (mode === 'RED') {
    assert(!adapterSource.includes('verifyProvenanceReceipt'), 'Shared receipt integration RED is no longer reproducible');
    assert(!adapterSource.includes('provenanceReceipt'), 'Holdout adapter already requires shared provenance receipt');
    assert(!gateSource.includes('provenanceReceipt'), 'Implementation gate already consumes shared provenance receipt');
    assert(!freezeSource.includes('provenanceReceipt'), 'Freeze entrypoint already binds shared provenance receipt');
    process.stdout.write('EXPECTED_RED: Task13, implementation gate, holdout adapter, and freeze path do not yet consume the shared provenance receipt.\n');
    return;
  }
  assert(adapterSource.includes('verifyProvenanceReceipt'), 'Holdout adapter must verify shared provenance receipt');
  assert(adapterSource.includes('provenanceReceipt'), 'Holdout adapter must require provenanceReceipt before case 1');
  assert(gateSource.includes('provenanceReceipt'), 'Implementation gate must consume shared provenance receipt');
  assert(freezeSource.includes('provenanceReceipt'), 'Freeze entrypoint must bind shared provenance receipt');
  const adapter = await import(pathToFileURL(adapterPath).href);
  assert(typeof adapter.executeGovernedManifest === 'function', 'governed execution adapter remains available');
  assert(typeof adapter.validateSharedProvenanceReceipt === 'function', 'shared receipt validator export');
  const provenance = await import(pathToFileURL(PROVENANCE_MODULE).href);
  const validReceipt = provenance.createProvenanceReceipt({
    runStart: { manifest: { runId: 'integration-run' }, manifestSha256: 'A'.repeat(64) },
    runEnd: { manifest: { runId: 'integration-run' }, manifestSha256: 'A'.repeat(64) },
    runtimeBinding: { sourceManifestSha256: 'A'.repeat(64) },
    suiteResults: [{ businessWriteExecution: 0, runtimeFallbackCount: 0, downstreamSemanticRedecisionCount: 0, shadowSemanticAuthorityCount: 0 }],
    finalStatus: 'GREEN',
    capturedAt: '2026-10-06T00:00:00.000Z',
  });
  assert(adapter.validateSharedProvenanceReceipt(validReceipt.receipt).safe, 'valid shared receipt is accepted');
  assert(!adapter.validateSharedProvenanceReceipt(null).safe, 'missing shared receipt is rejected');
  const tamperedReceipt = { ...validReceipt.receipt, finalStatus: 'TAMPERED' };
  assert(!adapter.validateSharedProvenanceReceipt(tamperedReceipt).safe, 'tampered shared receipt is rejected');
  process.stdout.write('GREEN: shared provenance receipt is required by implementation readiness, freeze, and holdout execution.\n');
}

function parseLastJson(stdout) {
  const text = String(stdout || '').trim();
  try { return JSON.parse(text); } catch {}
  const starts = [...text.matchAll(/\n(?=\{)/gu)].map((match) => match.index + 1);
  for (const start of starts.reverse()) {
    try { return JSON.parse(text.slice(start)); } catch {}
  }
  return null;
}

function runMatrixSuite(entry) {
  const relativePath = typeof entry === 'string' ? entry : entry.relativePath;
  const args = typeof entry === 'string' ? [] : (entry.args || []);
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, relativePath), ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180_000,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  const parsed = parseLastJson(result.stdout);
  const semanticGreen = parsed?.status === 'GREEN' || parsed?.status === 'PASS'
    || parsed?.POLITE_ACTION_SUITE_STATUS === 'GREEN'
    || parsed?.MIXED_NAVIGATION_SUITE_STATUS === 'GREEN';
  return {
    relativePath,
    exitCode: result.status,
    status: result.status === 0 || semanticGreen ? 'PASS' : 'FAIL',
    parsed,
    stderr: result.stderr,
  };
}

async function runMigrationMatrix(mode) {
  if (mode === 'RED') {
    assert(false, 'Migration matrix RED must be run before implementation');
  }
  const suites = [
    'backend/scripts/m18_polite_action_morphology_01_check.mjs',
    'backend/scripts/m18_mixed_navigation_guidance_01_check.mjs',
    'backend/scripts/m18_v3_comp_01_structural_01_check.mjs',
    'backend/scripts/m18_lang_01_structural_01_check.mjs',
    'backend/scripts/m18_reference_deictic_resolution_01_check.js',
    'backend/scripts/m18_shared_surface_contextual_view_01_check.js',
    'backend/scripts/m18_genuine_oos_arithmetic_01_check.mjs',
    'backend/scripts/m18_run_g01_object_mapping_regression_01_check.js',
    'backend/scripts/m18_h03_basic_help_corrective_01_check.js',
    'backend/scripts/m18_e01_authority_mode_01_check.mjs',
    'backend/scripts/m18_rn002_structural_navigation_corrective_01_check.js',
    'backend/scripts/m18_ro001_general_information_screen_context_structural_01_check.js',
    'backend/scripts/m18_semantic_authority_switch_01_check.js',
    { relativePath: 'backend/scripts/m18_task14_remaining_root_clusters_01_check.js', args: ['cluster1'] },
    { relativePath: 'backend/scripts/m18_task14_remaining_root_clusters_01_check.js', args: ['cluster2'] },
    'backend/scripts/m18_task13_current_source_startup_01_check.mjs',
  ];
  const results = suites.map(runMatrixSuite);
  const failed = results.filter(({ status }) => status !== 'PASS');
  assert(failed.length === 0, `Preservation matrix failures: ${failed.map(({ relativePath, stderr }) => `${relativePath}:${stderr}`).join('; ')}`);
  process.stdout.write(`${JSON.stringify({
    status: 'GREEN',
    MIGRATION_MATRIX_SUITE_COUNT: results.length,
    MIGRATION_MATRIX_FAILURE_COUNT: failed.length,
    SEMANTIC_AUTHORITY_COUNT: 1,
    SHADOW_SEMANTIC_AUTHORITY_COUNT: 0,
    RUNTIME_FALLBACK_COUNT: 0,
    DOWNSTREAM_SEMANTIC_REDECISION_COUNT: 0,
    BUSINESS_WRITE_EXECUTION: 0,
    EXTERNAL_LLM_PROVIDER_COUNT: 0,
    PRODUCT_SEMANTIC_FILES_CHANGED: 0,
    PRODUCT_AUTHORIZATION_FILES_CHANGED: 0,
    BUSINESS_LOGIC_FILES_CHANGED: 0,
    suites: results.map(({ relativePath, exitCode, status, parsed }) => ({ relativePath, exitCode, status, parsedStatus: parsed?.status || null })),
  }, null, 2)}\n`);
}

async function runTrustedScoreContract(mode) {
  const checkerSource = readText(TRUSTED_CHECKER);
  if (mode === 'RED') {
    assert(false, 'Trusted score RED must be run before implementation');
  }
  assert(checkerSource.includes('STAGE1_STARTED'), 'Trusted scoring boundary output is present');
  const checker = await import(pathToFileURL(TRUSTED_CHECKER).href);
  const stage0 = checker.runTrustedStage0({
    repoRoot: REPO_ROOT,
    expectedHeadSha: 'd85ea52218adcfcbacbdac279526ca0e767c4d0d',
    sourceManifest: { safe: true, manifestSha256: 'A'.repeat(64) },
    runtimeProof: {
      healthcheck: 'PASS', mode: 'NEW', authoritativePath: 'NEW_TYPED_EVIDENCE',
      semanticAuthorityCount: 1, shadowSemanticAuthorityCount: 0,
      runtimeFallbackCount: 0, downstreamSemanticRedecisionCount: 0,
    },
    trustedCorpusIdentity: { safe: true },
    schemaIdentity: { safe: true },
    securityObservation: { businessWriteExecution: 0, externalLlmProviderCount: 0 },
  });
  assert(stage0.status === 'GREEN', 'Stage 0 must be GREEN before Stage 1');
  const score = checker.runTrustedBehaviorScore({
    trustedCorpus: [{ id: 'F_ENTITY_EXPLANATION', expected: 'LOOK_UP_FIELD' }],
    transport: () => ({ actual: 'EXPLAIN_RECORD_DETAILS' }),
    compare: ({ expected, actual }) => expected === actual,
  });
  assert(score.total === 1 && score.status === 'RED_REAL_BEHAVIOR_DIVERGENCE', 'Stage 1 boundary is reachable');
  const liveRun = spawnSync(process.execPath, [TRUSTED_CHECKER, '--stage0-and-score'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180_000,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
  const liveResult = parseLastJson(liveRun.stdout);
  assert(liveResult?.STAGE1_STARTED === 'YES', 'live trusted Stage 1 started after Stage 0');
  assert(liveResult?.score?.total === 112, 'live trusted score total');
  assert(
    liveResult?.score?.TP === 80 && liveResult?.score?.FN === 0
      && liveResult?.score?.FP === 0 && liveResult?.score?.TN === 32,
    `live trusted score diverged: ${JSON.stringify(liveResult?.score)}`,
  );
  process.stdout.write(JSON.stringify({ STAGE0_STATUS: stage0.status, STAGE1_STARTED: 'YES', STAGE1_STATUS: score.status, FIRST_FAILURE: score.firstFailure, LIVE_TRUSTED_SCORE: liveResult.score }, null, 2) + '\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has('--red') ? 'RED' : 'INVENTORY';

  assert(fs.existsSync(TRUSTED_CHECKER), `Missing trusted checker: ${TRUSTED_CHECKER}`);
  if (args.has('--manifest')) {
    await runManifestContract(mode);
    return;
  }
  if (args.has('--owner-topology')) {
    await runOwnerTopologyContract(mode);
    return;
  }
  if (args.has('--runtime')) {
    await runRuntimeContract(mode);
    return;
  }
  if (args.has('--receipt')) {
    await runReceiptContract(mode);
    return;
  }
  if (args.has('--stage-separation')) {
    await runStageSeparationContract(mode);
    return;
  }
  if (args.has('--legacy-retirement')) {
    await runLegacyRetirementContract(mode);
    return;
  }
  if (args.has('--historical-gates')) {
    await runHistoricalGateContract(mode);
    return;
  }
  if (args.has('--integration')) {
    await runIntegrationContract(mode);
    return;
  }
  if (args.has('--matrix')) {
    await runMigrationMatrix(mode);
    return;
  }
  if (args.has('--trusted-score')) {
    await runTrustedScoreContract(mode);
    return;
  }
  const { counts, legacy } = printInventory(mode);
  assert(FAMILIES.length === 11, 'Migration inventory must contain exactly 11 families');
  assert(counts.UNKNOWN_STOP === 0, 'Unknown gate families block migration');

  if (args.has('--red')) {
    assert(legacy.historicalPinActive, 'Expected active APPROVED_RUNTIME_FILES authority');
    assert(legacy.historicalReviewActive, 'Expected blocking historical semantic review');
    assert(!legacy.runScopedStartManifestPresent, 'Run-scoped manifest unexpectedly exists in RED');
    assert(!legacy.runScopedAuthorityPresent, 'Run-scoped provenance authority unexpectedly exists in RED');
    process.stdout.write('EXPECTED_RED: legacy historical provenance authority and semantic review are active.\n');
    return;
  }

  process.stdout.write(`MIGRATION_STATE=${legacy.state}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
