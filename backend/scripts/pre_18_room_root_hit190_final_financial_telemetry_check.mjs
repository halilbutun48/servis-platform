import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as completionRuntime from './pre_18_luna_full_hybrid_surface_state_completion.mjs';
import {
  resolveRoomCanonicalReplaySelectionProfile,
} from './lib/pre_18_room_canonical_replay_selection_profile.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..', '..');
const targetIdentity = '95ad8d938b72ba99c62fea7c45f64432ff450bf5074c83c3eb6e55b2fe6f324a';
const targetName = 'Senaryo için maliyet varsayımı (kuruş)';
const expectedProfile = 'ROOM_ROOT_HIT190_FINAL_FINANCIAL_CANARY';
const expectedParents = {
  rootHit190: 'c5ffe972061444ea94a132fd85d50cfb400d33b5a7dc4813bafaadb49a3b3648',
  remaining7: 'e1dda31212628b8c1c658cec241e82a6c7f4c0fc5649787289907657ce2833be',
  remaining4: '383cec75c1c91701bb25c63f29016fd976c8ac2f15f68b7a5cfb8b53efa22763',
};

const rawCandidates = [
  {
    action: { role: 'spinbutton', name: targetName },
    ownerCandidates: [],
    control: {
      tag: 'INPUT', type: 'number', dataTestId: null, visible: true, enabled: true,
      diagnostic: {
        accessibleName: targetName,
        normalizedAccessibleName: 'senaryo icin maliyet varsayimi kurus',
        ariaLabel: null, ariaLabelledBy: null, labelText: targetName,
        nameSource: 'wrapping-label', descriptorOrdinal: 17,
      },
    },
    owner: { type: 'section', label: 'Gelişmiş maliyet varsayımları' },
    semanticIdentity: {
      structuralContext: { formControl: 'input', tag: 'input' },
      businessTarget: { type: 'financial-scenario', stableKey: 'cost-assumption' },
    },
  },
  {
    action: { role: 'spinbutton', name: 'Yolcu sayısı (kişi)' },
    ownerCandidates: [],
    control: { tag: 'INPUT', type: 'number', dataTestId: null, visible: true, enabled: true },
    owner: { type: 'section', label: 'Planlama' },
    semanticIdentity: { structuralContext: { formControl: 'input', tag: 'input' } },
  },
];

const historicalMeta = {
  route: '/room/financial-operations',
  action: { role: 'spinbutton', name: targetName },
  stableIdentitySha256: targetIdentity,
  semanticIdentity: {
    structuralContext: { formControl: 'input', tag: 'input' },
    businessTarget: { type: 'financial-scenario', stableKey: 'cost-assumption' },
  },
  financialContinuityRow: { telemetryOnly: true },
};

function buildTelemetry() {
  assert.equal(typeof completionRuntime.buildBoundedFinancialSemanticFailureTelemetry, 'function',
    'bounded financial semantic-failure telemetry builder is absent');
  return completionRuntime.buildBoundedFinancialSemanticFailureTelemetry({
    historicalMeta,
    rawCandidates,
    resolutionDiagnostics: { FINAL_COMPATIBLE_COUNT: 0 },
    assertionTarget: {
      role: 'spinbutton', accessibleName: targetName, tag: 'input', inputType: 'number',
      visible: true, signature: 'native-target-signature',
    },
  });
}

const redCases = [
  ['RED-1 raw role-compatible descriptors are absent', telemetry => assert.ok(telemetry.ROLE_COMPATIBLE_DESCRIPTORS?.length)],
  ['RED-2 accessible names are absent', telemetry => assert.equal(telemetry.ROLE_COMPATIBLE_DESCRIPTORS?.[0]?.accessibleName, targetName)],
  ['RED-3 tag/inputType evidence is absent', telemetry => assert.equal(telemetry.ROLE_COMPATIBLE_DESCRIPTORS?.[0]?.inputType, 'number')],
  ['RED-4 independent pipeline counts are absent', telemetry => assert.equal(telemetry.PIPELINE_STAGE_COUNTS?.RAW_ENUMERATED_COUNT, 2)],
  ['RED-5 role/name rejections are not separated', telemetry => assert.ok(telemetry.REJECTION_STAGE)],
  ['RED-6 structural rejection is not separated', telemetry => assert.ok('STRUCTURAL_COMPATIBLE_COUNT' in (telemetry.PIPELINE_STAGE_COUNTS ?? {}))],
  ['RED-7 native assertion signature is absent', telemetry => assert.equal(telemetry.ASSERTION_TARGET_SIGNATURE, 'native-target-signature')],
  ['RED-8 assertion/enumeration comparison is absent', telemetry => assert.equal(telemetry.ASSERTION_TARGET_PRESENT_IN_RAW_ENUMERATION, 'YES')],
  ['RED-9 successful continuity is dropped on semantic throw', telemetry => assert.equal(telemetry.CONTINUITY_CAN_SURVIVE_SEMANTIC_THROW, true)],
  ['RED-10 pre-enumeration readiness is absent', telemetry => assert.ok('PRE_ENUMERATION_READY_CHECK' in telemetry)],
  ['RED-11 post-enumeration readiness is absent', telemetry => assert.ok('POST_ENUMERATION_READY_CHECK' in telemetry)],
  ['RED-12 expected-control assertion evidence is absent', telemetry => assert.ok('EXPECTED_CONTROL_ASSERTION_RESULT' in telemetry)],
  ['RED-13 snapshot-boundary proof is absent', telemetry => assert.equal(telemetry.RAW_DESCRIPTOR_SNAPSHOT_BOUNDED, true)],
  ['RED-14 telemetry acceptance isolation is absent', telemetry => assert.equal(telemetry.FUZZY_MATCH_USED_FOR_ACCEPTANCE, false)],
  ['RED-15 original terminal preservation proof is absent', telemetry => assert.equal(telemetry.ORIGINAL_TERMINAL_CLASS_PRESERVED, true)],
  ['RED-16 frozen parent integrity telemetry is absent', telemetry => assert.equal(telemetry.PARENT_SELECTIONS_UNCHANGED, true)],
  ['RED-17 exact1 profile resolver is absent', async () => {
    const profile = await resolveRoomCanonicalReplaySelectionProfile({ profileId: expectedProfile, repositoryRoot: rootDir });
    assert.equal(profile.contracts.length, 1);
    assert.equal(profile.STABLE_IDENTITY_SHA256, targetIdentity);
  }],
  ['RED-18 canonical CLI allowlist lacks exact1 profile', () => {
    const outcome = spawnSync(process.execPath, [
      path.join(rootDir, 'backend/scripts/pre_18_room_root_hit190_replay_cli.mjs'),
      '--validate-start', `--profile=${expectedProfile}`,
    ], {
      cwd: rootDir,
      env: { ...process.env, WEB_BASE_URL: 'http://127.0.0.1:5173', API_BASE_URL: 'http://127.0.0.1:3000' },
      encoding: 'utf8',
    });
    assert.equal(outcome.status, 0, outcome.stderr || outcome.stdout);
  }],
];

async function runRed() {
  let observed = 0;
  let unexpectedPass = 0;
  for (const [name, check] of redCases) {
    try {
      const value = check.length === 0 ? await check() : await check(buildTelemetry());
      void value;
      unexpectedPass += 1;
      console.log(`UNEXPECTED_PASS ${name}`);
    } catch (error) {
      observed += 1;
      console.log(`RED_OBSERVED ${name}: ${error.message}`);
    }
  }
  console.log(JSON.stringify({ TELEMETRY_RED_TEST_COUNT: redCases.length, TELEMETRY_RED_OBSERVED_COUNT: observed, TELEMETRY_RED_UNEXPECTED_PASS_COUNT: unexpectedPass }));
  process.exitCode = unexpectedPass === 0 && observed === redCases.length ? 1 : 2;
}

async function runGreen() {
  const telemetry = buildTelemetry();
  for (const [, check] of redCases.slice(0, 16)) await check(telemetry);
  const page = { evaluate: async () => rawCandidates };
  const enumerated = await completionRuntime.enumerate(page, { route: historicalMeta.route });
  assert.equal(enumerated.length, rawCandidates.length);
  let actualDiagnostics = null;
  let actualEvidence = null;
  await completionRuntime.resolveFreshSemanticAction(page, { route: historicalMeta.route }, historicalMeta, {
    onDiagnostics: (value) => { actualDiagnostics = value; },
    onDiagnosticEvidence: (value) => { actualEvidence = value; },
  });
  assert.ok(actualDiagnostics);
  assert.ok(actualEvidence?.ROLE_COMPATIBLE_DESCRIPTORS?.length);
  const financialRow = {
    ROUTE: historicalMeta.route,
    STATE_RECIPE: { produce: [{ type: 'NATIVE_DISCLOSURE_OPEN', expectedControl: { role: 'spinbutton', name: targetName } }], assert: [] },
  };
  let continuityEvidence = null;
  const continuity = await completionRuntime.resolveFinancialSemanticActionWithContinuity({
    page,
    row: financialRow,
    surface: { route: historicalMeta.route },
    historicalMeta,
    initialStateRecipe: { produced: [{ disclosure: { assertionTarget: { role: 'spinbutton', accessibleName: targetName, tag: 'input', inputType: 'number', visible: true, signature: 'native-target-signature' } } }], asserted: [] },
    adapters: {
      observeFinancial: async () => ({
        routeReadiness: { ready: true }, financialSurfacePresent: true, workspacePresent: true,
        loadingPresentationPresent: false, baselineResolved: true, terminalNoBaselinePresent: false,
        planVerisiOkunuyorPresent: false, yenileniyorPresent: false,
      }),
      resolveFreshSemanticAction: async (_page, _surface, _meta, options) => {
        await completionRuntime.resolveFreshSemanticAction(page, { route: historicalMeta.route }, historicalMeta, options);
        return null;
      },
    },
    onDiagnosticEvidence: (value) => { continuityEvidence = value; },
  });
  assert.equal(continuity.CONTINUITY_VALID, true);
  assert.equal(continuityEvidence.CONTINUITY_GUARD_ENTERED, true);
  const semanticFailure = new Error('CURRENT_SEMANTIC_ACTION_NOT_RESOLVED:spinbutton:financial');
  semanticFailure.semanticResolutionDiagnostics = actualDiagnostics;
  semanticFailure.semanticResolutionDiagnosticEvidence = continuityEvidence;
  semanticFailure.financialContinuity = continuity;
  const persisted = await completionRuntime.executeOne(page, 'ROOM', { route: historicalMeta.route, viewport: 'desktop', state: 'base' }, historicalMeta, {}, 0, {
    adapters: { establishSurfaceStateStabilityBarrier: async () => { throw semanticFailure; } },
  });
  assert.equal(persisted.executionState, 'HARNESS_FAILURE');
  assert.equal(persisted.FINANCIAL_READINESS_CONTINUITY.CONTINUITY_VALID, true);
  assert.equal(persisted.SEMANTIC_RESOLUTION_DIAGNOSTIC_EVIDENCE.ASSERTION_TARGET_SIGNATURE, 'native-target-signature');
  const profile = await resolveRoomCanonicalReplaySelectionProfile({ profileId: expectedProfile, repositoryRoot: rootDir });
  assert.equal(profile.contracts.length, 1);
  assert.equal(profile.STABLE_IDENTITY_SHA256, targetIdentity);
  assert.equal(profile.PARENT_SELECTION_SHA256, expectedParents.remaining4);
  assert.equal(profile.ROOT_HIT190_SELECTION_SHA256, expectedParents.rootHit190);
  assert.equal(profile.REMAINING7_SELECTION_SHA256, expectedParents.remaining7);
  assert.equal(crypto.createHash('sha256').update(String(profile.contracts[0].ACTION_CONTRACT_ID)).digest('hex'), targetIdentity);
  const cliOutcome = spawnSync(process.execPath, [
    path.join(rootDir, 'backend/scripts/pre_18_room_root_hit190_replay_cli.mjs'),
    '--validate-start', `--profile=${expectedProfile}`,
  ], { cwd: rootDir, env: { ...process.env, WEB_BASE_URL: 'http://127.0.0.1:5173', API_BASE_URL: 'http://127.0.0.1:3000' }, encoding: 'utf8' });
  assert.equal(cliOutcome.status, 0, cliOutcome.stderr || cliOutcome.stdout);
  console.log(JSON.stringify({
    FOCUSED_TEST_TOTAL: redCases.length,
    FOCUSED_TEST_PASS: redCases.length,
    FOCUSED_TEST_FAIL: 0,
    ACTUAL_ENUMERATE_FUNCTION_EXECUTED_IN_TEST: 'YES',
    ACTUAL_SEMANTIC_FILTER_PIPELINE_EXECUTED_IN_TEST: 'YES',
    ACTUAL_FINANCIAL_CONTINUITY_WRAPPER_EXECUTED_IN_TEST: 'YES',
    ACTUAL_SEMANTIC_EARLY_THROW_PERSISTENCE_PATH_EXECUTED_IN_TEST: 'YES',
  }));
}

if (process.argv.includes('--red')) {
  await runRed();
} else {
  await runGreen();
}
