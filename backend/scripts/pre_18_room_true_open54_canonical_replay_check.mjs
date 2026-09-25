/*
 * No-browser executable contract for the canonical TRUE-OPEN54 replay
 * boundary. It runs the real CLI and the real high-level validation entrypoint
 * only; it never starts Chromium or contacts a runtime origin.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const runnerPath = path.join(root, "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs");
const cliPath = path.join(root, "backend/scripts/pre_18_room_true_open54_replay_cli.mjs");
const selectionPath = path.join(
  root,
  "backend/artifacts/browser-smoke/pre-18-room-true-open72-selection-reconciliation/runs/pre18-room-true-open72-lineage-run2-v1/room-true-open72-selection-lineage/final-replay-selection.json",
);
const expectedSelectionDigest = "0a3da6a35da5ad2540ccb65c79a0e481217f446db7cb815a4713d46f0b439abc";
const localEnvironment = {
  ...process.env,
  WEB_BASE_URL: "http://127.0.0.1:5173",
  API_BASE_URL: "http://127.0.0.1:3000",
  PRE18_LUNA_RUN_ID: "pre18-room-true-open54-entrypoint-check",
};
process.env.WEB_BASE_URL = localEnvironment.WEB_BASE_URL;
process.env.API_BASE_URL = localEnvironment.API_BASE_URL;
process.env.PRE18_LUNA_RUN_ID = localEnvironment.PRE18_LUNA_RUN_ID;

const runner = await import(pathToFileURL(runnerPath).href);
const frozenSelection = JSON.parse(fs.readFileSync(selectionPath, "utf8"));
const cases = [];
function test(name, run) { cases.push({ name, run }); }
function clone(value) { return structuredClone(value); }
function executeNode(args, environment = localEnvironment) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    windowsHide: true,
  });
}
function parseJsonOutput(result) {
  return JSON.parse(String(result.stdout || "").trim() || "{}");
}
function safeTerminal(overrides = {}) {
  return {
    ROUTE_PREPARED: true,
    SURFACE_STATE_PREPARED: true,
    SEMANTIC_ACTION_RESOLVED: true,
    BUSINESS_TARGET_RESOLVED: true,
    CANDIDATE_ENUMERATED_FROM_CURRENT_DOM: true,
    LOCATOR_DERIVED_FROM_CURRENT_CANDIDATE: true,
    ACTIONABILITY_PROVEN: true,
    VIEWPORT_REPRESENTATION_MATCH: true,
    OVERLAY_CONTAINMENT_PROVEN: true,
    CANDIDATE_COUNT: 1,
    CURRENT_CANDIDATE_SELECTED: true,
    SAFETY_CLASS: "SAFE",
    ACTION_EXECUTION_CLASS: "SAFE_ACTION_DISPATCH_SUCCEEDED",
    ACTION_ATTEMPTED: true,
    ACTION_DISPATCH_STARTED: true,
    ACTION_DISPATCH_SUCCEEDED: true,
    ACTION_DISPATCH_FAILED: false,
    RAW_HARNESS_FAILURE: false,
    UNSAFE_MUTATION_EXECUTED: false,
    POST_ACTION_OBSERVER_VALID: true,
    EXPECTED_EFFECT_OBSERVED: true,
    EXPECTED_EFFECT_ABSENT: false,
    ORIGINAL_ROOT_FACTS: {
      ROOT: "PREHIT-S1",
      AUTH_READY: true,
      ROUTE_READY: true,
      PREMATURE_HISTORICAL_STEP_REPLAY: false,
      cleared: true,
    },
    ...overrides,
  };
}

test("RED-1 canonical TRUE-OPEN54 validation entrypoint is absent before the corrective", async () => {
  assert.equal(typeof runner.runRoomTrueOpen54Acceptance, "function");
  const validation = await runner.runRoomTrueOpen54Acceptance({ validateStart: true });
  assert.equal(validation.ROOM_TRUE_OPEN54_CANONICAL_REPLAY_RUNNER, "READY");
});

test("RED-2 frozen selection digest is enforced by the real selection validator", () => {
  const selection = runner.validateRoomTrueOpen54FrozenSelection(frozenSelection);
  assert.equal(selection.FINAL_REPLAY_TARGET_COUNT, 54);
  assert.equal(selection.SELECTION_SHA256, expectedSelectionDigest);
  assert.equal(selection.SELECTION_DIGEST_MATCH, "YES");
});

test("RED-3 route-only CONTRACT_ACTION_EXECUTION NONE cannot terminalize a replay contract", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    ACTION_EXECUTION_CLASS: "NONE",
    ACTION_ATTEMPTED: false,
    ACTION_DISPATCH_STARTED: false,
    ACTION_DISPATCH_SUCCEEDED: false,
    POST_ACTION_OBSERVER_VALID: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
  assert.equal(result.REPLAY_ROOT_CLOSURE, "NO");
});

test("RED-4 validation binds the shared hybrid executor instead of a private action engine", async () => {
  const validation = await runner.runRoomTrueOpen54Acceptance({ validateStart: true });
  assert.equal(validation.HYBRID_EXECUTOR_REUSED, "YES");
  assert.equal(validation.EXACT36_SHARED_WORKER_RUNTIME_REUSED, "YES");
  assert.equal(validation.PRIVATE_ADAPTER_DUPLICATION_COUNT, 0);
});

test("RED-5 Exact36-satisfied membership cannot enter the frozen TRUE-OPEN54 selection", () => {
  const invalid = clone(frozenSelection);
  invalid.ROWS[0].FINAL_MEMBERSHIP_CLASS = "SATISFIED_BY_ACCEPTED_EXACT36";
  assert.throws(
    () => runner.validateRoomTrueOpen54FrozenSelection(invalid),
    /EXACT36_SATISFIED_MEMBER_INCLUDED/u,
  );
});

test("RED-6 selection digest mismatch blocks execution before a browser can start", () => {
  const invalid = clone(frozenSelection);
  invalid.FINAL_REPLAY_SELECTION_SHA256 = "deadbeef";
  assert.throws(
    () => runner.validateRoomTrueOpen54FrozenSelection(invalid),
    /TRUE_OPEN54_SELECTION_DIGEST_MISMATCH/u,
  );
});

test("RED-7 new discovery or substitution metadata blocks frozen replay", () => {
  const invalid = clone(frozenSelection);
  invalid.NEW_DISCOVERY_COUNT = 1;
  assert.throws(
    () => runner.validateRoomTrueOpen54FrozenSelection(invalid),
    /TRUE_OPEN54_SELECTION_NONFROZEN_MUTATION/u,
  );
});

test("RED-8 unsafe contracts terminalize without an unsafe write", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    SAFETY_CLASS: "UNSAFE",
    ACTION_EXECUTION_CLASS: "EXPECTED_NON_EXECUTION_TERMINALIZED",
    ACTION_ATTEMPTED: false,
    UNSAFE_MUTATION_EXECUTED: false,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "NOT_SAFE_TO_EXECUTE");
  assert.equal(result.ACCIDENTAL_UNSAFE_EXECUTION, "NO");
});

test("RED-9 expected-disabled contracts terminalize without a click", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    ACTIONABILITY_PROVEN: false,
    EXPECTED_DISABLED: true,
    ACTION_EXECUTION_CLASS: "EXPECTED_NON_EXECUTION_TERMINALIZED",
    ACTION_ATTEMPTED: false,
    ACTION_DISPATCH_STARTED: false,
    ACTION_DISPATCH_SUCCEEDED: false,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "EXPECTED_DISABLED");
  assert.equal(result.ACTION_ATTEMPT_REQUIRED, "NO");
});

test("RED-10 fresh current-DOM enumeration and locator derivation are mandatory", () => {
  const staleLocator = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    CANDIDATE_ENUMERATED_FROM_CURRENT_DOM: false,
    LOCATOR_DERIVED_FROM_CURRENT_CANDIDATE: false,
  }));
  assert.equal(staleLocator.TERMINAL_CLASS, "HARNESS_BLOCK");
  assert.match(staleLocator.REASON_CODE, /CURRENT_DOM|STALE_LOCATOR/u);
});

test("RED-11 expected rendered effect participates in safe-action terminal success", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    EXPECTED_EFFECT_OBSERVED: false,
    EXPECTED_EFFECT_ABSENT: true,
  }));
  assert.equal(result.TERMINAL_CLASS, "PRODUCT_DEFECT");
  assert.equal(result.REPLAY_ROOT_CLOSURE, "NO");
});

test("RED-12 viewport representation mismatch blocks the action before execution", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    VIEWPORT_REPRESENTATION_MATCH: false,
    ACTION_ATTEMPTED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
  assert.equal(result.ACTION_ATTEMPT_REQUIRED, "NO");
});

test("RED-13 a multi-match can use current contextual selection without strict-single-match failure", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    CANDIDATE_COUNT: 2,
    CURRENT_CANDIDATE_SELECTED: true,
  }));
  assert.equal(result.TERMINAL_CLASS, "PASS");
  assert.equal(result.STRICT_MULTI_MATCH_FALSE_NEGATIVE, "NO");
});

test("RED-14 overlay containment is a required current-surface proof", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    OVERLAY_CONTAINMENT_PROVEN: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
  assert.match(result.REASON_CODE, /OVERLAY_CONTAINMENT/u);
});

test("RED-15 root closure needs both original-root proof and an accepted interaction terminal", () => {
  const noInteraction = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal({
    ACTION_EXECUTION_CLASS: "NONE",
    ACTION_ATTEMPTED: false,
    ACTION_DISPATCH_STARTED: false,
    ACTION_DISPATCH_SUCCEEDED: false,
    POST_ACTION_OBSERVER_VALID: false,
  }));
  assert.equal(noInteraction.REPLAY_ROOT_CLOSURE, "NO");
  const acceptedInteraction = runner.evaluateRoomTrueOpen54ContractTerminal(safeTerminal());
  assert.equal(acceptedInteraction.REPLAY_ROOT_CLOSURE, "YES");
});

test("RED-16 CLI contains no private behavioral, auth, reset, budget, or executor implementation", () => {
  const source = fs.readFileSync(cliPath, "utf8");
  assert.match(source, /runRoomTrueOpen54Acceptance/u);
  assert.doesNotMatch(source, /createWorkerRuntime|executeContractRuntime|persistRequestLifecycleSnapshot|createAuthenticatedRoleContext|resetRoomExact36CanonicalContract|createSharedAuthenticatedReadBudgetCoordinator|data:text\/javascript/iu);
});

test("RED-17 actual TRUE-OPEN54 entrypoint delegates lifecycle, action, and safety to shared implementations", () => {
  const source = fs.readFileSync(runnerPath, "utf8");
  assert.match(source, /export async function runRoomTrueOpen54Acceptance/u);
  assert.match(source, /runRoomExact36DurableRuntime\(\{/u);
  assert.match(source, /action = await executeOne\(page, "ROOM"/u);
  assert.match(source, /evaluateRoomTrueOpen54ContractTerminal\(/u);
  assert.doesNotMatch(source, /TRUE_OPEN54.*force:\s*true/iu);
});

test("RED-18 short Windows-safe CLI process invocation delegates to canonical validation", () => {
  const processResult = executeNode([cliPath, "--validate-start"]);
  assert.equal(processResult.status, 0, `${processResult.stderr}\n${processResult.stdout}`);
  const payload = parseJsonOutput(processResult);
  assert.equal(payload.ROOM_TRUE_OPEN54_CANONICAL_REPLAY_RUNNER, "READY");
  assert.equal(payload.CLI_BEHAVIORAL_IMPLEMENTATION_COUNT, 0);
  assert.equal(payload.REAL_BROWSER_RUN_STARTED, "NO");
});

let pass = 0;
let fail = 0;
for (const current of cases) {
  try {
    await current.run();
    pass += 1;
    console.log(`PASS ${current.name}`);
  } catch (error) {
    fail += 1;
    console.error(`FAIL ${current.name}: ${error?.message || error}`);
  }
}

console.log(JSON.stringify({
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: pass,
  FOCUSED_TEST_FAIL: fail,
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
}, null, 2));
if (fail) process.exitCode = 1;
