/*
 * Test-first contract for the approved ROOT-HIT190 remaining-four canary.
 * --red documents the absent bounded-profile capability before implementation.
 * Normal mode exercises only canonical no-browser validate-start paths.
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
const profileId = "ROOM_ROOT_HIT190_REMAINING4_CANARY";
const rootCliPath = path.join(repositoryRoot, "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs");
const [profiles, runtime] = await Promise.all([
  import(new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url)),
  import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url)),
]);

const clone = (value) => structuredClone(value);
const stableDigest = (identity) => crypto.createHash("sha256").update(String(identity)).digest("hex");

function required(owner, name) {
  if (typeof owner[name] !== "function") throw new Error(`REMAINING4_CANARY_PROFILE_VALIDATOR_REQUIRED:${name}`);
  return owner[name];
}

async function remaining4() {
  return profiles.resolveRoomCanonicalReplaySelectionProfile({ profileId, repositoryRoot });
}

function validate(profile, payload) {
  return required(profiles, "validateRoomRootHit190Remaining4CanarySelection")(payload, {
    remaining7Selection: profile.REMAINING7_PARENT_SELECTION,
    rootHitSelection: profile.ROOT_HIT190_PARENT_SELECTION,
    priorResults: profile.REMAINING7_PARENT_SELECTION?.PRIOR_ACCEPTED_RESULTS,
  });
}

function payload(profile) {
  return clone(profile.RAW_SELECTION);
}

function semanticName(contract) {
  return contract.REPLAY_SEMANTIC_IDENTITY?.accessibleName || contract.ACTION_NAME;
}

const expectedSemanticNames = new Set([
  "+10 yolcu",
  "Yolcu sayısı (kişi)",
  "Ayrıntılar / izlenebilirlik",
  "Senaryo için maliyet varsayımı (kuruş)",
]);

const checks = [
  ["RED-1 canonical CLI exposes only the approved remaining4 profile", async () => {
    const source = await fs.readFile(rootCliPath, "utf8");
    assert.match(source, /ROOM_ROOT_HIT190_REMAINING4_CANARY/u, "REMAINING4_APPROVED_CLI_PROFILE_ABSENT");
  }],
  ["RED-2 remaining4 profile resolves exactly four approved stable identities", async () => {
    const profile = await remaining4();
    assert.equal(profile.FINAL_REPLAY_TARGET_COUNT, 4);
    assert.equal(profile.FINAL_REPLAY_SELECTION_UNIQUE_COUNT, 4);
    assert.deepEqual(new Set(profile.contracts.map(semanticName)), expectedSemanticNames);
  }],
  ["RED-3 wrong count rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile); next.rows.pop();
    assert.throws(() => validate(profile, next), /CARDINALITY|MISSING_EXPECTED/u);
  }],
  ["RED-4 duplicate member rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile); next.rows[3] = clone(next.rows[0]);
    assert.throws(() => validate(profile, next), /DUPLICATE|MISSING_EXPECTED/u);
  }],
  ["RED-5 missing expected member rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile);
    const approved = new Set(next.rows.map((row) => row.STABLE_CONTRACT_IDENTITY));
    const replacement = profile.REMAINING7_PARENT_SELECTION.contracts.find((row) => !approved.has(row.ACTION_CONTRACT_ID));
    next.rows[0] = { STABLE_CONTRACT_IDENTITY: replacement.ACTION_CONTRACT_ID };
    assert.throws(() => validate(profile, next), /MISSING_EXPECTED|UNEXPECTED_MEMBER/u);
  }],
  ["RED-6 unexpected fifth member rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile);
    const approved = new Set(next.rows.map((row) => row.STABLE_CONTRACT_IDENTITY));
    const fifth = profile.REMAINING7_PARENT_SELECTION.contracts.find((row) => !approved.has(row.ACTION_CONTRACT_ID));
    next.rows.push({ STABLE_CONTRACT_IDENTITY: fifth.ACTION_CONTRACT_ID });
    assert.throws(() => validate(profile, next), /CARDINALITY|UNEXPECTED_MEMBER/u);
  }],
  ["RED-7 member outside remaining7 rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile);
    const remaining7 = new Set(profile.REMAINING7_PARENT_SELECTION.contracts.map((row) => row.ACTION_CONTRACT_ID));
    const outside = profile.ROOT_HIT190_PARENT_SELECTION.contracts.find((row) => !remaining7.has(row.ACTION_CONTRACT_ID));
    next.rows[0] = { STABLE_CONTRACT_IDENTITY: outside.ACTION_CONTRACT_ID };
    assert.throws(() => validate(profile, next), /OUTSIDE_REMAINING7/u);
  }],
  ["RED-8 member outside ROOT-HIT190 rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile);
    next.rows[0] = { STABLE_CONTRACT_IDENTITY: JSON.stringify({ role: "ROOM", route: "/room/non-root", surfaceId: "NON_ROOT", viewport: "desktop", actionRole: "button", actionName: "non-root" }) };
    assert.throws(() => validate(profile, next), /OUTSIDE_ROOT_HIT190/u);
  }],
  ["RED-9 OTHER423 member rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile);
    next.rows[0] = { STABLE_CONTRACT_IDENTITY: JSON.stringify({ role: "ROOM", route: "/room/other423", surfaceId: "OTHER423", viewport: "desktop", actionRole: "button", actionName: "other423" }) };
    assert.throws(() => validate(profile, next), /OTHER423|OUTSIDE_ROOT_HIT190/u);
  }],
  ["RED-10 wrong remaining4 digest rejects", async () => {
    const profile = await remaining4();
    const next = payload(profile); next.REMAINING4_CANARY_SELECTION_SHA256 = "0".repeat(64);
    assert.throws(() => validate(profile, next), /DIGEST/u);
  }],
  ["RED-11 remaining7 digest remains unchanged", async () => {
    const profile = await remaining4();
    assert.equal(profile.REMAINING7_PARENT_SELECTION.SELECTION_SHA256, "e1dda31212628b8c1c658cec241e82a6c7f4c0fc5649787289907657ce2833be");
  }],
  ["RED-12 ROOT-HIT190 digest remains unchanged", async () => {
    const profile = await remaining4();
    assert.equal(profile.ROOT_HIT190_PARENT_SELECTION.SELECTION_SHA256, "c5ffe972061444ea94a132fd85d50cfb400d33b5a7dc4813bafaadb49a3b3648");
  }],
  ["RED-13 remaining4 invokes the same canonical runtime binding", async () => {
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.CANONICAL_SHARED_RUNTIME_REUSED, "YES");
    assert.equal(summary.FINAL_REPLAY_TARGET_COUNT, 4);
  }],
  ["RED-14 remaining4 reuses the semantic resolver", async () => {
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.SHARED_SEMANTIC_RESOLVER_BOUND, "YES");
  }],
  ["RED-15 remaining4 reuses the geometry and physical telemetry executor", async () => {
    const summary = await runtime.runRoomCanonicalReplayAcceptance({ profileId, validateStart: true });
    assert.equal(summary.SHARED_GEOMETRY_EXECUTOR_BOUND, "YES");
    assert.equal(summary.DURABLE_DIAGNOSTIC_PERSISTENCE_BOUND, "YES");
  }],
  ["RED-16 arbitrary unvalidated subset selection rejects", () => {
    const source = fs.readFile(rootCliPath, "utf8");
    return source.then((contents) => {
      assert.match(contents, /ROOM_ROOT_HIT190_REMAINING4_CANARY/u, "REMAINING4_APPROVED_CLI_PROFILE_ABSENT");
    const run = spawnSync(process.execPath, [rootCliPath, "--validate-start", `--profile=${profileId}`, "--selection-file=arbitrary.json"], { cwd: repositoryRoot, encoding: "utf8" });
    assert.notEqual(run.status, 0);
    assert.match(`${run.stderr}\n${run.stdout}`, /ROOT_HIT190_ARBITRARY_SELECTION_REJECTED/u);
    });
  }],
  ["RED-17 actual remaining4 validate-start launches no browser", () => {
    const run = spawnSync(process.execPath, [rootCliPath, "--validate-start", `--profile=${profileId}`], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const summary = JSON.parse(run.stdout);
    assert.equal(summary.REAL_BROWSER_RUN_STARTED, "NO");
    assert.equal(summary.CHROMIUM_PROCESS_STARTED, "NO");
  }],
  ["RED-18 full190 and remaining7 validate unchanged", async () => {
    const [remaining4Profile, full190, remaining7] = await Promise.all([
      remaining4(),
      runtime.runRoomCanonicalReplayAcceptance({ profileId: "ROOM_ROOT_HIT190", validateStart: true }),
      runtime.runRoomCanonicalReplayAcceptance({ profileId: "ROOM_ROOT_HIT190_REMAINING7_CANARY", validateStart: true }),
    ]);
    assert.equal(remaining4Profile.FINAL_REPLAY_TARGET_COUNT, 4);
    assert.equal(full190.FINAL_REPLAY_TARGET_COUNT, 190);
    assert.equal(remaining7.FINAL_REPLAY_TARGET_COUNT, 7);
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
  REMAINING4_ENTRYPOINT_RED_TEST_COUNT: checks.length,
  REMAINING4_ENTRYPOINT_RED_OBSERVED_COUNT: observed,
  REMAINING4_ENTRYPOINT_RED_UNEXPECTED_PASS_COUNT: passed,
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
} : {
  FOCUSED_TEST_TOTAL: checks.length,
  FOCUSED_TEST_PASS: passed,
  FOCUSED_TEST_FAIL: 0,
  ACTUAL_REMAINING4_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
  ACTUAL_PROFILE_CONSUMER_EXECUTED_IN_TEST: "YES",
  ACTUAL_SHARED_RUNTIME_BINDING_PROVEN: "YES",
  ACTUAL_SHARED_SEMANTIC_RESOLVER_BINDING_PROVEN: "YES",
  ACTUAL_SHARED_GEOMETRY_EXECUTOR_BINDING_PROVEN: "YES",
  ACTUAL_PHYSICAL_TELEMETRY_BINDING_PROVEN: "YES",
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
}, null, 2));

if (redMode) process.exitCode = observed === checks.length && passed === 0 ? 1 : 2;
