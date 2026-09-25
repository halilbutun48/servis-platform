/*
 * Test-first contract for the approved OTHER423 Batch01 profile.
 * --red proves materialization/profile wiring is absent before implementation.
 * Normal mode executes selection validation and validate-start only; Chromium
 * is never launched by this check.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const redMode = process.argv.includes("--red");
const profileId = "ROOM_OTHER423_BATCH01_SHARED_CORE_CANARY";
const batchId = "OTHER423-BATCH-01-SHARED-CORE";
const expectedClusters = [
  "OTHER423-0DAD48B8BCAD",
  "OTHER423-0F18FEA40174",
  "OTHER423-23EB541C61DF",
  "OTHER423-402478959056",
  "OTHER423-92F21E83F868",
];
const selectionPath = path.join(repositoryRoot, "backend/artifacts/browser-smoke/pre-18-room-other423-batch01-shared-core/approved-selection-v1/batch01-shared-core-selection.json");
const designPath = path.join(repositoryRoot, "backend/artifacts/browser-smoke/pre-18-room-other423-representative-profile-design/representative-profile-design.json");
const cliPath = path.join(repositoryRoot, "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs");
const [profiles, runtime] = await Promise.all([
  import(new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url).href),
  import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url).href),
]);

const clone = (value) => structuredClone(value);

async function batch() {
  return profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId, repositoryRoot });
}

function expectSelectionReject(profile, mutate, pattern) {
  const payload = clone(profile.RAW_SELECTION);
  const sources = clone(profile.VALIDATION_SOURCES);
  mutate({ payload, sources });
  assert.throws(
    () => profiles.validateRoomOther423Batch01Selection(payload, sources),
    pattern,
  );
}

const checks = [
  ["RED-1 approved Batch01 profile resolves", async () => {
    const profile = await batch();
    assert.equal(profile.PROFILE_ID, profileId);
  }],
  ["RED-2 approved Batch01 selection artifact exists", async () => {
    await fs.access(selectionPath);
    const profile = await batch();
    assert.equal(profile.SOURCE_SELECTION_PATH.endsWith("batch01-shared-core-selection.json"), true);
  }],
  ["RED-3 selection contains exactly five representatives", async () => {
    const profile = await batch();
    assert.equal(profile.FINAL_REPLAY_TARGET_COUNT, 5);
    assert.equal(profile.FINAL_REPLAY_SELECTION_UNIQUE_COUNT, 5);
  }],
  ["RED-4 all full identities come from durable design", async () => {
    const [profile, design] = await Promise.all([batch(), fs.readFile(designPath, "utf8").then(JSON.parse)]);
    const approved = design.batches.find((entry) => entry.batchId === batchId).representatives.map((entry) => entry.representativeStableIdentity);
    assert.deepEqual(profile.contracts.map((row) => row.ACTION_CONTRACT_ID), approved);
  }],
  ["RED-5 all selected identities belong to OTHER423 inventory", async () => {
    const profile = await batch();
    assert.equal(profile.OUTSIDE_OTHER423_COUNT, 0);
  }],
  ["RED-6 all selected identities map to approved cluster IDs", async () => {
    const profile = await batch();
    assert.deepEqual(profile.CLUSTER_IDS, expectedClusters);
  }],
  ["RED-7 ROOT-HIT190 and TRUE-OPEN54 overlap remains zero", async () => {
    const profile = await batch();
    assert.equal(profile.ROOT_HIT190_OVERLAP_COUNT, 0);
    assert.equal(profile.TRUE_OPEN54_OVERLAP_COUNT, 0);
  }],
  ["RED-8 duplicate identity is rejected", async () => {
    const profile = await batch();
    expectSelectionReject(profile, ({ payload }) => { payload.rows[4] = clone(payload.rows[0]); }, /DUPLICATE|CARDINALITY|MISSING_APPROVED/u);
  }],
  ["RED-9 missing representative is rejected", async () => {
    const profile = await batch();
    expectSelectionReject(profile, ({ payload }) => { payload.rows.pop(); }, /CARDINALITY|MISSING_APPROVED/u);
  }],
  ["RED-10 unapproved sixth representative is rejected", async () => {
    const profile = await batch();
    expectSelectionReject(profile, ({ payload, sources }) => {
      const approved = new Set(payload.rows.map((row) => row.STABLE_CONTRACT_IDENTITY));
      const extra = sources.inventory.members.find((row) => !approved.has(row.stableIdentity));
      payload.rows.push({ ...clone(payload.rows[0]), STABLE_CONTRACT_IDENTITY: extra.stableIdentity, STABLE_IDENTITY_SHA256: extra.stableIdentitySha256 });
    }, /CARDINALITY|UNAPPROVED/u);
  }],
  ["RED-11 design digest mismatch rejects validation", async () => {
    const profile = await batch();
    expectSelectionReject(profile, ({ sources }) => { sources.design.batches[0].intent = "TAMPERED"; }, /DESIGN.*DIGEST/u);
  }],
  ["RED-12 inventory digest mismatch rejects validation", async () => {
    const profile = await batch();
    expectSelectionReject(profile, ({ sources }) => { sources.inventory.members[0].actionName = "TAMPERED"; }, /INVENTORY.*DIGEST/u);
  }],
  ["RED-13 cluster assignment digest mismatch rejects validation", async () => {
    const profile = await batch();
    expectSelectionReject(profile, ({ sources }) => { sources.clusters.clusters[0].confidence = "TAMPERED"; }, /CLUSTER.*DIGEST/u);
  }],
  ["RED-14 representative plan digest mismatch rejects validation", async () => {
    const profile = await batch();
    expectSelectionReject(profile, ({ sources }) => { sources.representativePlan.representatives[0].whyRepresentative = "TAMPERED"; }, /REPRESENTATIVE.*DIGEST/u);
  }],
  ["RED-15 arbitrary identity override remains rejected", async () => {
    await batch();
    const valid = spawnSync(process.execPath, [cliPath, "--validate-start", `--profile=${profileId}`], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(valid.status, 0, valid.stderr || valid.stdout);
    const invalid = spawnSync(process.execPath, [cliPath, "--validate-start", `--profile=${profileId}`, "--ids=arbitrary"], { cwd: repositoryRoot, encoding: "utf8" });
    assert.notEqual(invalid.status, 0);
    assert.match(`${invalid.stderr}\n${invalid.stdout}`, /ARBITRARY_SELECTION_REJECTED/u);
  }],
  ["RED-16 unknown profile remains rejected", async () => {
    await batch();
    await assert.rejects(
      profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_OTHER423_UNKNOWN", repositoryRoot }),
      /PROFILE_UNSUPPORTED/u,
    );
  }],
  ["RED-17 existing approved profiles remain unchanged", async () => {
    await batch();
    const [full, remaining7, remaining4, financial] = await Promise.all([
      profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_ROOT_HIT190", repositoryRoot }),
      profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_ROOT_HIT190_REMAINING7_CANARY", repositoryRoot }),
      profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_ROOT_HIT190_REMAINING4_CANARY", repositoryRoot }),
      profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_ROOT_HIT190_FINAL_FINANCIAL_CANARY", repositoryRoot }),
    ]);
    assert.equal(full.SELECTION_SHA256, "c5ffe972061444ea94a132fd85d50cfb400d33b5a7dc4813bafaadb49a3b3648");
    assert.equal(remaining7.SELECTION_SHA256, "e1dda31212628b8c1c658cec241e82a6c7f4c0fc5649787289907657ce2833be");
    assert.equal(remaining4.SELECTION_SHA256, "383cec75c1c91701bb25c63f29016fd976c8ac2f15f68b7a5cfb8b53efa22763");
    assert.equal(financial.SELECTION_SHA256, "9b34962b50d35fc5f04f16efb170f93a28f1623393675747e116a2e36c04e717");
  }],
  ["RED-18 canonical validate-start accepts only the materialized profile", async () => {
    const profile = await batch();
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.CANONICAL_SELECTION_PROFILE_ID, profile.PROFILE_ID);
    assert.equal(summary.ROOM_OTHER423_BATCH01_PROFILE_RUNNER, "READY");
    assert.equal(summary.VALIDATE_START_PASS, "YES");
  }],
  ["RED-19 selection order exactly matches approved design", async () => {
    const profile = await batch();
    assert.equal(profile.SELECTION_ORDER_MATCHES_APPROVED_DESIGN, "YES");
  }],
  ["RED-20 Batch02 and later profiles remain unimplemented", async () => {
    await batch();
    await assert.rejects(
      profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_OTHER423_PROVEN_SHARED_CORRECTIVE_BATCH_02_CANARY", repositoryRoot }),
      /PROFILE_UNSUPPORTED/u,
    );
  }],
];

let passed = 0;
let observed = 0;
for (const [name, check] of checks) {
  if (redMode) {
    try {
      await check();
      passed += 1;
      console.error(`RED_UNEXPECTED_PASS ${name}`);
    } catch (error) {
      observed += 1;
      console.log(`RED_OBSERVED ${name}: ${error.message}`);
    }
  } else {
    await check();
    passed += 1;
    console.log(`PASS ${name}`);
  }
}

console.log(JSON.stringify(redMode ? {
  BATCH01_PROFILE_RED_TEST_COUNT: checks.length,
  BATCH01_PROFILE_RED_OBSERVED_COUNT: observed,
  BATCH01_PROFILE_RED_UNEXPECTED_PASS_COUNT: passed,
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
} : {
  FOCUSED_TEST_TOTAL: checks.length,
  FOCUSED_TEST_PASS: passed,
  FOCUSED_TEST_FAIL: 0,
  ACTUAL_CANONICAL_PROFILE_RESOLVER_EXECUTED_IN_TEST: "YES",
  ACTUAL_CANONICAL_VALIDATE_START_EXECUTED_IN_TEST: "YES",
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
}, null, 2));

if (redMode) process.exitCode = observed === checks.length && passed === 0 ? 1 : 2;
