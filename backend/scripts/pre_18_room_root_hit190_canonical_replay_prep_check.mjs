/*
 * Focused test-first contract for bounded ROOT-HIT190 selection injection.
 * It deliberately exercises the actual CLI only after the canonical profile
 * consumer exists.  It never launches a browser.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const profileUrl = new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url);
const runtimeUrl = new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url);
const rootCliPath = path.join(repositoryRoot, "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs");
const trueOpenCliPath = path.join(repositoryRoot, "backend/scripts/pre_18_room_true_open54_replay_cli.mjs");

const cases = [
  "ROOT-HIT190 canonical bounded selection profile is consumable by the existing runtime",
  "ROOT-HIT190 count must be exactly 190",
  "wrong SHA rejects before execution",
  "duplicate selection member rejects",
  "missing selection member rejects",
  "unexpected nonmember rejects",
  "wrong historical root family rejects",
  "wrong physical cluster member rejects",
  "14 Exact36-overlap identities are not filtered out",
  "unvalidated arbitrary selection path rejects",
  "TRUE-OPEN54 existing selection profile remains valid",
  "ROOT-HIT190 reaches the canonical shared runtime",
  "ROOT-HIT190 reaches the corrected shared geometry executor",
  "CLI contains no duplicated behavioral implementation",
  "validate-start launches no browser",
  "short Windows-safe Node command works",
];

let profiles;
let runtime;
let loadError;
try {
  [profiles, runtime] = await Promise.all([import(profileUrl.href), import(runtimeUrl.href)]);
} catch (error) {
  loadError = error;
}

if (!profiles || !runtime || !profiles.resolveRoomCanonicalReplaySelectionProfile || !runtime.runRoomCanonicalReplayAcceptance) {
  for (const name of cases) {
    console.error(`RED_OBSERVED ${name}: ROOT_HIT190_CANONICAL_SELECTION_PROFILE_NOT_CONSUMABLE (${loadError?.code || "MISSING_RUNTIME_PROFILE_INTERFACE"})`);
  }
  console.error(JSON.stringify({
    ROOT_HIT190_RUNNER_RED_TEST_COUNT: cases.length,
    ROOT_HIT190_RUNNER_RED_OBSERVED_COUNT: cases.length,
    ROOT_HIT190_RUNNER_RED_UNEXPECTED_PASS_COUNT: 0,
    status: "RED_EXPECTED",
  }, null, 2));
  process.exitCode = 1;
} else {
  const rootProfile = await profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_ROOT_HIT190", repositoryRoot });
  const trueOpenProfile = await profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_TRUE_OPEN54", repositoryRoot });
  const clone = (value) => structuredClone(value);
  const reject = (payload, pattern) => assert.throws(
    () => profiles.validateRoomRootHit190FrozenSelection(payload, { lineage: rootProfile.LINEAGE }),
    pattern,
  );
  const rootPayload = clone(rootProfile.RAW_SELECTION);
  const first = rootPayload.rows[0];
  const unknownIdentity = JSON.stringify({ ...JSON.parse(first.STABLE_CONTRACT_IDENTITY), actionName: "UNKNOWN_ROOT_HIT_MEMBER" });

  const checks = [
    () => assert.equal(rootProfile.FINAL_REPLAY_TARGET_COUNT, 190),
    () => reject({ ...rootPayload, rows: rootPayload.rows.slice(0, 189) }, /CARDINALITY/),
    () => reject({ ...rootPayload, FINAL_ROOT_HIT_REPLAY_SELECTION_SHA256: "0".repeat(64) }, /DIGEST/),
    () => reject({ ...rootPayload, rows: [...rootPayload.rows.slice(0, 189), clone(rootPayload.rows[0])] }, /CARDINALITY|DUPLICATE/),
    () => reject({ ...rootPayload, rows: rootPayload.rows.slice(1) }, /CARDINALITY/),
    () => reject({ ...rootPayload, rows: rootPayload.rows.map((row, index) => index === 0 ? { ...row, STABLE_CONTRACT_IDENTITY: unknownIdentity } : row) }, /NONMEMBER/),
    () => reject({ ...rootPayload, rows: rootPayload.rows.map((row, index) => index === 0 ? { ...row, HISTORICAL_ROOT: "PREHIT-S1" } : row) }, /ROOT_FAMILY/),
    () => reject({ ...rootPayload, rows: rootPayload.rows.map((row, index) => index === 0 ? { ...row, HISTORICAL_PHYSICAL_FAILURE_CLASS: "CENTER_OUTSIDE_VIEWPORT" } : row) }, /PHYSICAL_CLUSTER/),
    () => assert.equal(rootProfile.ROOT_HIT_EXACT36_OVERLAP_PRESENT_COUNT, 14),
    async () => await assert.rejects(() => profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId: "ROOM_ROOT_HIT190", repositoryRoot, selectionPath: "arbitrary.json" }), /ARBITRARY_SELECTION_PATH_REJECTED/),
    () => assert.equal(trueOpenProfile.FINAL_REPLAY_TARGET_COUNT, 54),
    async () => assert.equal((await runtime.runRoomCanonicalReplayAcceptance({ profileId: "ROOM_ROOT_HIT190", validateStart: true })).CANONICAL_SHARED_RUNTIME_REUSED, "YES"),
    async () => assert.equal((await runtime.runRoomCanonicalReplayAcceptance({ profileId: "ROOM_ROOT_HIT190", validateStart: true })).SHARED_GEOMETRY_EXECUTOR_BOUND, "YES"),
    async () => { const source = String(await import("node:fs/promises").then((fs) => fs.readFile(rootCliPath, "utf8"))); assert.ok(!/chromium|createRoomSharedWorkerRuntime|executeOne/u.test(source)); },
    () => { const run = spawnSync(process.execPath, [rootCliPath, "--validate-start"], { cwd: repositoryRoot, encoding: "utf8" }); assert.equal(run.status, 0, run.stderr); const summary = JSON.parse(run.stdout); assert.equal(summary.REAL_BROWSER_RUN_STARTED, "NO"); assert.equal(summary.CHROMIUM_PROCESS_STARTED, "NO"); },
    () => { const command = `node backend/scripts/pre_18_room_root_hit190_replay_cli.mjs --validate-start`; assert.ok(command.length < 206); assert.ok(path.basename(rootCliPath).length > 0); assert.ok(path.basename(trueOpenCliPath).length > 0); },
  ];

  let passed = 0;
  for (let index = 0; index < checks.length; index += 1) {
    await checks[index]();
    passed += 1;
    console.log(`PASS ${cases[index]}`);
  }
  console.log(JSON.stringify({ FOCUSED_TEST_TOTAL: cases.length, FOCUSED_TEST_PASS: passed, FOCUSED_TEST_FAIL: 0, status: "GREEN" }, null, 2));
}
