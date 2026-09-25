/*
 * Test-first contract for the approved ROOT-HIT190 remaining-seven canary.
 * --red proves that the bounded profile/CLI path is absent before the
 * harness-only implementation.  Normal mode executes only validate-start;
 * neither mode may launch Chromium.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const redMode = process.argv.includes("--red");
const profileId = "ROOM_ROOT_HIT190_REMAINING7_CANARY";
const rootCliPath = path.join(repositoryRoot, "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs");
const profileUrl = new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url);
const runtimeUrl = new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url);
const [profiles, runtime] = await Promise.all([import(profileUrl.href), import(runtimeUrl.href)]);

const digest = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const clone = (value) => structuredClone(value);

async function parent() {
  return profiles.resolveRoomCanonicalReplaySelectionProfile({
    profileId: profiles.ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190,
    repositoryRoot,
  });
}

async function canary() {
  return profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId, repositoryRoot });
}

function canaryPayload(profile) {
  return clone(profile.RAW_SELECTION);
}

function expectCanaryReject(profile, mutate, pattern) {
  const payload = canaryPayload(profile);
  mutate(payload);
  assert.throws(
    () => profiles.validateRoomRootHit190Remaining7CanarySelection(payload, {
      parentSelection: profile.PARENT_SELECTION,
      priorResults: profile.PRIOR_ACCEPTED_RESULTS,
      priorResultsSha256: profile.SOURCE_RESULTS_SHA256,
    }),
    pattern,
  );
}

const checks = [
  ["RED-1 canonical CLI exposes an approved remaining7-only profile mode", async () => {
    const source = await fs.readFile(rootCliPath, "utf8");
    assert.match(source, /--profile=/u, "ROOT_HIT190_REMAINING7_APPROVED_PROFILE_CLI_ABSENT");
  }],
  ["RED-2 approved remaining7 profile resolves exactly seven identities", async () => {
    const profile = await canary();
    assert.equal(profile.FINAL_REPLAY_TARGET_COUNT, 7);
    assert.equal(profile.FINAL_REPLAY_SELECTION_UNIQUE_COUNT, 7);
  }],
  ["RED-3 wrong count rejects", async () => {
    const profile = await canary();
    expectCanaryReject(profile, (payload) => { payload.rows.pop(); }, /CARDINALITY|MISSING_EXPECTED/u);
  }],
  ["RED-4 duplicate identity rejects", async () => {
    const profile = await canary();
    expectCanaryReject(profile, (payload) => { payload.rows[6] = clone(payload.rows[0]); }, /DUPLICATE|CARDINALITY/u);
  }],
  ["RED-5 missing expected identity rejects", async () => {
    const profile = await canary();
    expectCanaryReject(profile, (payload) => { payload.rows = payload.rows.slice(1); }, /CARDINALITY|MISSING_EXPECTED/u);
  }],
  ["RED-6 unexpected eighth identity rejects", async () => {
    const profile = await canary();
    expectCanaryReject(profile, (payload) => { payload.rows.push(clone(profile.PARENT_SELECTION.contracts.find((row) => !payload.rows.some((entry) => entry.STABLE_CONTRACT_IDENTITY === row.ACTION_CONTRACT_ID)))); }, /CARDINALITY|OUTSIDE_BLOCKED7/u);
  }],
  ["RED-7 parent nonmember rejects", async () => {
    const profile = await canary();
    expectCanaryReject(profile, (payload) => { payload.rows[0].STABLE_CONTRACT_IDENTITY = JSON.stringify({ role: "ROOM", route: "/room", surfaceId: "NON_MEMBER", viewport: "desktop", actionRole: "button", actionName: "nonmember" }); }, /NON_ROOT_HIT190_MEMBER|NONMEMBER/u);
  }],
  ["RED-8 prior PASS identity cannot enter remaining7", async () => {
    const profile = await canary();
    const passId = profile.PARENT_SELECTION.contracts.find((row) => !profile.PRIOR_BLOCKED7_IDS.has(row.ACTION_CONTRACT_ID)).ACTION_CONTRACT_ID;
    expectCanaryReject(profile, (payload) => { payload.rows[0].STABLE_CONTRACT_IDENTITY = passId; }, /OUTSIDE_BLOCKED7|PASS_MEMBER/u);
  }],
  ["RED-9 OTHER423 identity cannot enter remaining7", async () => {
    const profile = await canary();
    expectCanaryReject(profile, (payload) => { payload.rows[0].STABLE_CONTRACT_IDENTITY = JSON.stringify({ role: "ROOM", route: "/room/other423", surfaceId: "OTHER423", viewport: "desktop", actionRole: "button", actionName: "other423" }); }, /NON_ROOT_HIT190_MEMBER|OTHER423/u);
  }],
  ["RED-10 wrong remaining7 digest rejects", async () => {
    const profile = await canary();
    expectCanaryReject(profile, (payload) => { payload.REMAINING7_CANARY_SELECTION_SHA256 = "0".repeat(64); }, /DIGEST/u);
  }],
  ["RED-11 full190 remains frozen while canary reports its parent", async () => {
    const [full, profile] = await Promise.all([parent(), canary()]);
    assert.equal(full.FINAL_REPLAY_TARGET_COUNT, 190);
    assert.equal(full.SELECTION_SHA256, profiles.ROOT_HIT190_FINAL_REPLAY_SELECTION_SHA256);
    assert.equal(profile.ROOT_HIT190_PARENT_SELECTION_COUNT, 190);
  }],
  ["RED-12 bounded profile reaches the same canonical runtime", async () => {
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.CANONICAL_SHARED_RUNTIME_REUSED, "YES");
    assert.equal(summary.FINAL_REPLAY_TARGET_COUNT, 7);
  }],
  ["RED-13 bounded profile reaches the same semantic resolver", async () => {
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.SHARED_SEMANTIC_RESOLVER_BOUND, "YES");
  }],
  ["RED-14 bounded profile reaches the same geometry executor", async () => {
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.SHARED_GEOMETRY_EXECUTOR_BOUND, "YES");
  }],
  ["RED-15 bounded profile reaches durable null-resolution diagnostics", async () => {
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.DURABLE_DIAGNOSTIC_PERSISTENCE_BOUND, "YES");
  }],
  ["RED-16 bounded CLI contains no execution implementation", async () => {
    const source = await fs.readFile(rootCliPath, "utf8");
    assert.match(source, /ROOM_ROOT_HIT190_REMAINING7_CANARY/u, "ROOT_HIT190_REMAINING7_CLI_MODE_ABSENT");
    assert.doesNotMatch(source, /chromium|createRoomSharedWorkerRuntime|executeOne/u);
  }],
  ["RED-17 actual bounded validate-start starts no browser", () => {
    const run = spawnSync(process.execPath, [rootCliPath, "--validate-start", `--profile=${profileId}`], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const summary = JSON.parse(run.stdout);
    assert.equal(summary.REAL_BROWSER_RUN_STARTED, "NO");
    assert.equal(summary.CHROMIUM_PROCESS_STARTED, "NO");
  }],
  ["RED-18 arbitrary unvalidated selection CLI input is rejected", () => {
    const run = spawnSync(process.execPath, [rootCliPath, "--validate-start", `--profile=${profileId}`, "--selection-file=arbitrary.json"], { cwd: repositoryRoot, encoding: "utf8" });
    assert.notEqual(run.status, 0);
    assert.match(`${run.stderr}\n${run.stdout}`, /ROOT_HIT190_ARBITRARY_SELECTION_REJECTED/u);
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
  CANARY_ENTRYPOINT_RED_TEST_COUNT: checks.length,
  CANARY_ENTRYPOINT_RED_OBSERVED_COUNT: observed,
  CANARY_ENTRYPOINT_RED_UNEXPECTED_PASS_COUNT: passed,
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
} : {
  FOCUSED_TEST_TOTAL: checks.length,
  FOCUSED_TEST_PASS: passed,
  FOCUSED_TEST_FAIL: 0,
  ACTUAL_REMAINING7_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
  ACTUAL_BOUNDED_PROFILE_CONSUMER_EXECUTED_IN_TEST: "YES",
  ACTUAL_SHARED_RUNTIME_PATH_EXECUTED_IN_TEST: "YES",
  ACTUAL_SHARED_SEMANTIC_RESOLVER_BINDING_PROVEN: "YES",
  ACTUAL_SHARED_GEOMETRY_EXECUTOR_BINDING_PROVEN: "YES",
  ACTUAL_DIAGNOSTIC_PERSISTENCE_BINDING_PROVEN: "YES",
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
}, null, 2));

if (redMode) process.exitCode = observed === checks.length && passed === 0 ? 1 : 2;
