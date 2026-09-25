/*
 * Focused, no-browser contract for the Exact36 reset-operation boundary.
 *
 * The test only substitutes the browser event source after the real durable
 * runtime has established reset ownership. It never contacts a product
 * origin, launches Chromium, or authoritatively recreates orchestration.
 * `--expect-red` is deliberately retained as the pre-corrective TDD witness.
 */
import assert from "node:assert/strict";

import * as workers from "./lib/pre_18_room_worker_pool.mjs";
import { deriveOriginalRootFacts } from "./lib/pre_18_room_residual195_accounting_v1.mjs";
import { exact36GenericRuntimeEvidence, runRoomExact36DurableRuntime } from "./pre_18_luna_full_hybrid_surface_state_completion.mjs";

const expectRed = process.argv.includes("--expect-red");
const expectResetSemanticsRed = process.argv.includes("--expect-reset-semantics-red");
const resetSemanticsOnly = process.argv.includes("--reset-semantics");
const cases = [];
const resetSemanticsCases = [];
const resetSemanticsIntegrationCases = [];
function test(name, fn) { cases.push({ name, fn }); }
function resetSemanticsTest(name, fn) { resetSemanticsCases.push({ name, fn }); }
function resetSemanticsIntegrationTest(name, fn) { resetSemanticsIntegrationCases.push({ name, fn }); }
const generic = (suffix) => ({ method: "GET", url: `https://harness.invalid/api/reset-lifecycle/${suffix}` });

function coordinator() {
  return workers.createSharedAuthenticatedReadBudgetCoordinator({
    authenticatedScope: "ROOM_EXACT36_RESET_OPERATION_TEST",
    now: () => 10,
  });
}

function startReset(target, overrides = {}) {
  return target.beginResetOperation({
    workerId: "ROOM-W1",
    contractId: "ROOM-C1",
    contractRoute: "/room/agreements",
    resetNavigationRoute: "/room",
    ...overrides,
  });
}

function seed(target) {
  const request = generic("bootstrap");
  const requestIdentity = target.beginGenericRequest({ request, workerId: "ROOM-W1", route: "/room", bootstrap: true });
  assert.equal(target.requestLease({ request, requestIdentity }).granted, true);
  target.recordPlaywrightRequest({ request, requestIdentity });
  target.markGenericRequestDispatched({ requestIdentity });
  target.observeResponse({ request, requestIdentity, status: 200, headers: { "ratelimit-remaining": "119", "ratelimit-reset": "60" } });
  target.recordRequestFinished({ request, requestIdentity });
}

/* This is a narrow browser-event source substitute. Operation association,
 * permit ownership, lifecycle recording, and barrier evaluation are all real
 * worker-pool functions used by the canonical runtime. */
function observeResetScopedLifecycle(target, operation, {
  workerId = operation.WORKER_ID,
  contractId = operation.CONTRACT_ID,
  lifecyclePhase = "RESET",
  resetOperationId = operation.RESET_OPERATION_ID,
  bootstrap = false,
  permit = true,
  dispatch = true,
  playwrightRequest = true,
  terminal = "finished",
} = {}) {
  const request = generic(`${workerId}/${contractId}/${resetOperationId || "none"}`);
  const requestIdentity = target.beginGenericRequest({
    request,
    workerId,
    contractId,
    route: "/room",
    lifecyclePhase,
    resetOperationId,
    contractRoute: operation.CONTRACT_ROUTE,
    resetNavigationRoute: operation.RESET_NAVIGATION_ROUTE,
    bootstrap,
  });
  if (permit) assert.equal(target.requestLease({ request, requestIdentity }).granted, true);
  if (playwrightRequest) target.recordPlaywrightRequest({ request, requestIdentity });
  if (dispatch) target.markGenericRequestDispatched({ requestIdentity });
  if (terminal === "finished") {
    target.observeResponse({ request, requestIdentity, status: 200, headers: { "ratelimit-remaining": "118", "ratelimit-reset": "60" } });
    target.recordRequestFinished({ request, requestIdentity });
  } else if (terminal === "unknown") {
    target.recordRequestFinished({ request, requestIdentity });
  }
  return requestIdentity;
}

function lifecycle(target, operation) {
  return target.evaluateResetOperationLifecycle({ resetOperationId: operation.RESET_OPERATION_ID });
}

test("RED-A1 reset identity includes an operation id and RESET phase", () => {
  const operation = startReset(coordinator());
  assert.match(operation.RESET_OPERATION_ID, /^RESET-\d+$/u);
  assert.equal(operation.LIFECYCLE_PHASE, "RESET");
  assert.equal(operation.WORKER_ID, "ROOM-W1");
  assert.equal(operation.CONTRACT_ID, "ROOM-C1");
  assert.equal(operation.CONTRACT_ROUTE, "/room/agreements");
  assert.equal(operation.RESET_NAVIGATION_ROUTE, "/room");
});

test("RED-A2 bootstrap remains separate from an otherwise valid zero-request reset", () => {
  const target = coordinator();
  const operation = startReset(target);
  seed(target);
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_SCOPED_REQUEST_COUNT, 0);
  assert.equal(evidence.RESET_NETWORK_VALIDATION_STATUS, "NOT_APPLICABLE_ZERO_REQUESTS");
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "PASS");
});

test("RED-A3 reset traffic from another worker is rejected", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { workerId: "ROOM-W2" });
  assert.equal(lifecycle(target, operation).RESET_LIFECYCLE_EVIDENCE, "FAIL");
  assert.equal(lifecycle(target, operation).REASON, "RESET_SCOPED_WRONG_WORKER");
});

test("RED-A4 reset-operation traffic with a non-RESET phase is rejected", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { lifecyclePhase: "CONTRACT" });
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "FAIL");
  assert.equal(evidence.REASON, "RESET_SCOPED_PHASE_INVALID");
});

test("RED-A5 reset traffic for a different operation is rejected", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { resetOperationId: "RESET-OTHER" });
  assert.equal(lifecycle(target, operation).RESET_LIFECYCLE_EVIDENCE, "FAIL");
  assert.equal(lifecycle(target, operation).REASON, "RESET_SCOPED_WRONG_OPERATION");
});

test("RED-A6 a late request for reset N cannot attach to reset N+1", () => {
  const target = coordinator();
  seed(target);
  const first = startReset(target);
  const second = startReset(target, { contractId: "ROOM-C2" });
  observeResetScopedLifecycle(target, first);
  assert.equal(lifecycle(target, second).RESET_LIFECYCLE_EVIDENCE, "PASS");
  assert.equal(lifecycle(target, first).RESET_LIFECYCLE_EVIDENCE, "PASS");
});

test("RED-B1 visibly complete reset without a reset-scoped request passes the optional barrier", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  assert.equal(lifecycle(target, operation).RESET_LIFECYCLE_EVIDENCE, "PASS");
});

test("RED-B2 bootstrap-only evidence remains outside a valid reset barrier", () => {
  const target = coordinator();
  const operation = startReset(target);
  seed(target);
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_SCOPED_REQUEST_COUNT, 0);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "PASS");
});

test("RED-B3 demand without permit fails the reset barrier", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { permit: false, dispatch: false, playwrightRequest: false, terminal: "none" });
  assert.equal(lifecycle(target, operation).REASON, "RESET_SCOPED_PERMIT_MISSING");
});

test("RED-B4 permit without dispatch fails the reset barrier", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { dispatch: false, terminal: "none" });
  assert.equal(lifecycle(target, operation).REASON, "RESET_SCOPED_DISPATCH_MISSING");
});

test("RED-B5 dispatch without Playwright request event fails the reset barrier", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { playwrightRequest: false, terminal: "none" });
  assert.equal(lifecycle(target, operation).REASON, "RESET_SCOPED_PLAYWRIGHT_REQUEST_MISSING");
});

test("RED-B6 dispatch without a terminal lifecycle fails the reset barrier", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { terminal: "none" });
  assert.equal(lifecycle(target, operation).REASON, "RESET_SCOPED_TERMINAL_INCOMPLETE");
});

test("RED-B7 unknown terminal fails the reset barrier", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { terminal: "unknown" });
  assert.equal(lifecycle(target, operation).REASON, "RESET_SCOPED_UNKNOWN_TERMINAL");
});

test("RED-B8 a fully observed reset lifecycle reaches the event-driven terminal barrier", async () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation);
  const terminal = await target.waitForResetOperationTerminal({ resetOperationId: operation.RESET_OPERATION_ID, timeoutMs: 50 });
  assert.equal(terminal.RESET_LIFECYCLE_EVIDENCE, "PASS");
  target.endResetOperation({ resetOperationId: operation.RESET_OPERATION_ID });
});

test("RED-C1 coordinator instance count comes from coordinator telemetry", () => {
  const target = coordinator();
  seed(target);
  const before = target.genericRequestSnapshot().COORDINATOR_TELEMETRY;
  assert.match(before.COORDINATOR_INSTANCE_ID, /^ROOM-GENERIC-COORDINATOR-\d+$/u);
  assert.equal(before.COORDINATOR_INSTANCE_COUNT, 1);
});

test("RED-C2 reservation loss comes from coordinator telemetry", () => {
  const target = coordinator();
  seed(target);
  const before = target.genericRequestSnapshot().COORDINATOR_TELEMETRY;
  assert.equal(before.OUTSTANDING_RESERVATION_COUNT, 0);
  assert.equal(before.RESERVATION_LOSS_COUNT, 0);
});

test("RED-C3 double release comes from coordinator telemetry", () => {
  const target = coordinator();
  seed(target);
  const before = target.genericRequestSnapshot().COORDINATOR_TELEMETRY;
  assert.equal(before.DOUBLE_RELEASE_COUNT, 0);
});

test("RED-C4 stale remaining overgrant comes from coordinator telemetry", () => {
  const target = coordinator();
  seed(target);
  const request = generic("stale-remaining");
  const requestIdentity = target.beginGenericRequest({ request, workerId: "ROOM-W1", route: "/room" });
  assert.equal(target.requestLease({ request, requestIdentity }).granted, true);
  target.markGenericRequestDispatched({ requestIdentity });
  target.observeResponse({ request, requestIdentity, status: 200, headers: { "ratelimit-remaining": "121", "ratelimit-reset": "60" } });
  assert.equal(target.genericRequestSnapshot().COORDINATOR_TELEMETRY.STALE_REMAINING_OVERGRANT_COUNT, 1);
});

test("RED-C5 outstanding reservations come from coordinator state", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { terminal: "none" });
  const during = target.genericRequestSnapshot().COORDINATOR_TELEMETRY;
  assert.equal(during.OUTSTANDING_RESERVATION_COUNT, 1);
  assert.equal(during.PEAK_IN_FLIGHT_RESERVATION_COUNT >= 1, true);
});

test("RED-C6 runtime summary does not substitute telemetry literals when a snapshot omits fields", async () => {
  const target = coordinator();
  seed(target);
  assert.throws(
    () => exact36GenericRuntimeEvidence(target, { REQUESTS: [] }),
    /EXACT36_COORDINATOR_TELEMETRY_UNAVAILABLE/u,
  );
  const workerPlan = Array.from({ length: 6 }, (_, index) => ({
    WORKER_ID: `ROOM-W${index + 1}`,
    ASSIGNMENTS: [{ ACTION_CONTRACT_ID: `ROOM-C${index + 1}`, ROUTE: "/room/agreements" }],
  }));
  const runtime = await runRoomExact36DurableRuntime({
    workers: workerPlan,
    coordinator: target,
    createWorkerRuntime: async ({ workerId, genericReadBudgetCoordinator }) => ({
      authenticated: { ok: true },
      workerAuth: { AUTH_OK: true, AUTH: { authStatus: 200, authRole: "ROOM", tenantScopeProven: true }, API_ME_RESOURCE_COUNT: 1 },
      interception: {
        installed: true,
        setActiveContractId() {},
        setActiveResetOperation() {},
        beginTeardown: () => genericReadBudgetCoordinator.beginGenericRequestTeardown({ workerId }),
        drain: () => genericReadBudgetCoordinator.drainGenericRequestLifecycle({ workerId, timeoutMs: 50 }),
        dispose() {},
      },
      session: { context: { async close() {} } },
    }),
    resetContractRuntime: async ({ workerId, assignment, genericReadBudgetCoordinator, resetOperation }) => {
      observeResetScopedLifecycle(genericReadBudgetCoordinator, resetOperation, { workerId, contractId: assignment.ACTION_CONTRACT_ID });
      return { RESET_REQUIRED: true, RESET_STARTED: true, RESET_COMPLETED: true, RESET_PROOF: true, RESET_RESULT: "CANONICAL_RESET_PROVEN", TRANSIENT_STATE_LEAK: false };
    },
    executeContractRuntime: async ({ assignment }) => ({
      ACTION_CONTRACT_ID: assignment.ACTION_CONTRACT_ID,
      PREHIT_ROOT: "PREHIT-S1",
      ROUTE: assignment.ROUTE,
      ORIGINAL_ROOT_FACTS: deriveOriginalRootFacts({ root: "PREHIT-S1", authReady: true, routeReady: true }),
    }),
    persistRequestLifecycleSnapshot: async () => {},
  });
  const telemetry = runtime.REQUEST_LIFECYCLE_SNAPSHOT.COORDINATOR_TELEMETRY;
  assert.deepEqual({
    coordinator: runtime.COORDINATOR_INSTANCE_COUNT,
    loss: runtime.IN_FLIGHT_RESERVATION_LOSS_COUNT,
    doubleRelease: runtime.DOUBLE_RELEASE_COUNT,
    stale: runtime.STALE_REMAINING_OVERGRANT_COUNT,
  }, {
    coordinator: telemetry.COORDINATOR_INSTANCE_COUNT,
    loss: telemetry.RESERVATION_LOSS_COUNT,
    doubleRelease: telemetry.DOUBLE_RELEASE_COUNT,
    stale: telemetry.STALE_REMAINING_OVERGRANT_COUNT,
  });
});

resetSemanticsTest("RESET-SEMANTICS-RED-1 state-proven zero-request reset is accepted", () => {
  const target = coordinator();
  const operation = startReset(target);
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "PASS");
  assert.equal(evidence.RESET_NETWORK_VALIDATION_STATUS, "NOT_APPLICABLE_ZERO_REQUESTS");
});

resetSemanticsTest("RESET-SEMANTICS-RED-2 a coordinated reset request is validated", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation);
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "PASS");
  assert.equal(evidence.RESET_NETWORK_VALIDATION_STATUS, "COORDINATED");
});

resetSemanticsTest("RESET-SEMANTICS-RED-3 reset traffic without an operation id is rejected", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { resetOperationId: "" });
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "FAIL");
  assert.equal(evidence.REASON, "RESET_SCOPED_OPERATION_ID_MISSING");
});

resetSemanticsTest("RESET-SEMANTICS-RED-4 reset traffic from another worker is rejected", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { workerId: "ROOM-W2" });
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "FAIL");
  assert.equal(evidence.REASON, "RESET_SCOPED_WRONG_WORKER");
});

resetSemanticsTest("RESET-SEMANTICS-RED-5 reset traffic for another operation is rejected", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { resetOperationId: "RESET-OTHER" });
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "FAIL");
  assert.equal(evidence.REASON, "RESET_SCOPED_WRONG_OPERATION");
});

resetSemanticsTest("RESET-SEMANTICS-RED-6 unterminated reset traffic is rejected", () => {
  const target = coordinator();
  seed(target);
  const operation = startReset(target);
  observeResetScopedLifecycle(target, operation, { terminal: "none" });
  const evidence = lifecycle(target, operation);
  assert.equal(evidence.RESET_LIFECYCLE_EVIDENCE, "FAIL");
  assert.equal(evidence.RESET_NETWORK_VALIDATION_STATUS, "FAIL_COORDINATION");
});

resetSemanticsTest("RESET-SEMANTICS-RED-7 bootstrap-only traffic does not block a state-proven reset", () => {
  const target = coordinator();
  const operation = startReset(target);
  seed(target);
  const evidence = lifecycle(target, operation);
  assert.deepEqual({
    RESET_LIFECYCLE_EVIDENCE: evidence.RESET_LIFECYCLE_EVIDENCE,
    RESET_SCOPED_REQUEST_COUNT: evidence.RESET_SCOPED_REQUEST_COUNT,
    RESET_NETWORK_VALIDATION_STATUS: evidence.RESET_NETWORK_VALIDATION_STATUS,
  }, {
    RESET_LIFECYCLE_EVIDENCE: "PASS",
    RESET_SCOPED_REQUEST_COUNT: 0,
    RESET_NETWORK_VALIDATION_STATUS: "NOT_APPLICABLE_ZERO_REQUESTS",
  });
});

resetSemanticsTest("RESET-SEMANTICS-RED-8 state proof remains mandatory despite perfect reset traffic", async () => {
  const target = coordinator();
  seed(target);
  const workerPlan = [{ WORKER_ID: "ROOM-W1", ASSIGNMENTS: [{ ACTION_CONTRACT_ID: "ROOM-C1", ROUTE: "/room/agreements" }] }];
  await assert.rejects(
    () => runRoomExact36DurableRuntime({
      workers: workerPlan,
      expectedWorkerCount: 1,
      coordinator: target,
      createWorkerRuntime: async ({ workerId, genericReadBudgetCoordinator }) => ({
        authenticated: { ok: true },
        workerAuth: { AUTH_OK: true, AUTH: { authStatus: 200, authRole: "ROOM", tenantScopeProven: true }, API_ME_RESOURCE_COUNT: 1 },
        interception: { installed: true, setActiveContractId() {}, setActiveResetOperation() {}, beginTeardown: () => genericReadBudgetCoordinator.beginGenericRequestTeardown({ workerId }), drain: () => genericReadBudgetCoordinator.drainGenericRequestLifecycle({ workerId, timeoutMs: 50 }), dispose() {} },
        session: { context: { async close() {} } },
      }),
      resetContractRuntime: async ({ workerId, assignment, genericReadBudgetCoordinator, resetOperation }) => {
        observeResetScopedLifecycle(genericReadBudgetCoordinator, resetOperation, { workerId, contractId: assignment.ACTION_CONTRACT_ID });
        return { RESET_REQUIRED: true, RESET_STARTED: true, RESET_COMPLETED: true, RESET_PROOF: false, RESET_RESULT: "CANONICAL_ROOM_RESET_PROVEN", TRANSIENT_STATE_LEAK: false };
      },
      executeContractRuntime: async () => { throw new Error("RESET_STATE_FAILURE_MUST_PREVENT_CONTRACT_EXECUTION"); },
      persistRequestLifecycleSnapshot: async () => {},
    }),
    /RESET_STATE_PROOF_IS_PRIMARY/u,
  );
});

resetSemanticsIntegrationTest("RESET-SEMANTICS-ACTUAL-1 durable runtime accepts a state-proven reset with zero reset requests", async () => {
  const target = coordinator();
  const workerPlan = [{ WORKER_ID: "ROOM-W1", ASSIGNMENTS: [{ ACTION_CONTRACT_ID: "ROOM-C1", ROUTE: "/room/agreements" }] }];
  const runtime = await runRoomExact36DurableRuntime({
    workers: workerPlan,
    expectedWorkerCount: 1,
    coordinator: target,
    createWorkerRuntime: async ({ workerId, bootstrap, genericReadBudgetCoordinator }) => {
      if (bootstrap) seed(genericReadBudgetCoordinator);
      return {
        authenticated: { ok: true },
        workerAuth: { AUTH_OK: true, AUTH: { authStatus: 200, authRole: "ROOM", tenantScopeProven: true }, API_ME_RESOURCE_COUNT: 1 },
        interception: {
          installed: true,
          setActiveContractId() {},
          setActiveResetOperation() {},
          beginTeardown: () => genericReadBudgetCoordinator.beginGenericRequestTeardown({ workerId }),
          drain: () => genericReadBudgetCoordinator.drainGenericRequestLifecycle({ workerId, timeoutMs: 50 }),
          dispose() {},
        },
        session: { context: { async close() {} } },
      };
    },
    resetContractRuntime: async () => ({
      RESET_REQUIRED: true,
      RESET_STARTED: true,
      RESET_COMPLETED: true,
      RESET_PROOF: true,
      RESET_RESULT: "CANONICAL_ROOM_RESET_PROVEN",
      TRANSIENT_STATE_LEAK: false,
    }),
    executeContractRuntime: async ({ assignment }) => ({
      ACTION_CONTRACT_ID: assignment.ACTION_CONTRACT_ID,
      PREHIT_ROOT: "PREHIT-S1",
      ROUTE: assignment.ROUTE,
      ORIGINAL_ROOT_FACTS: deriveOriginalRootFacts({ root: "PREHIT-S1", authReady: true, routeReady: true }),
    }),
    persistRequestLifecycleSnapshot: async () => {},
  });
  assert.deepEqual({
    RESET_STATE_PROOF_IS_PRIMARY: runtime.RESET_STATE_PROOF_IS_PRIMARY,
    RESET_NETWORK_ACTIVITY_REQUIRED_FOR_SUCCESS: runtime.RESET_NETWORK_ACTIVITY_REQUIRED_FOR_SUCCESS,
    RESET_NETWORK_REQUIREMENT_MODE: runtime.RESET_NETWORK_REQUIREMENT_MODE,
    RESET_NETWORK_VALIDATION_STATUS: runtime.RESET_NETWORK_VALIDATION_STATUS,
    RESET_OPERATION_ACCEPTANCE_STATUS: runtime.RESET_OPERATION_ACCEPTANCE_STATUS,
    BOOTSTRAP_REQUEST_CAN_SATISFY_RESET: runtime.BOOTSTRAP_REQUEST_CAN_SATISFY_RESET,
    BOOTSTRAP_MISASSOCIATION_COUNT: runtime.BOOTSTRAP_MISASSOCIATION_COUNT,
    RESET_OPERATION_WITH_ZERO_GENERIC_REQUEST_COUNT: runtime.RESET_OPERATION_WITH_ZERO_GENERIC_REQUEST_COUNT,
    RESET_OPERATION_WITH_GENERIC_REQUEST_COUNT: runtime.RESET_OPERATION_WITH_GENERIC_REQUEST_COUNT,
    RESET_GENERIC_REQUEST_INVALID_COUNT: runtime.RESET_GENERIC_REQUEST_INVALID_COUNT,
  }, {
    RESET_STATE_PROOF_IS_PRIMARY: "YES",
    RESET_NETWORK_ACTIVITY_REQUIRED_FOR_SUCCESS: "NO",
    RESET_NETWORK_REQUIREMENT_MODE: "OPTIONAL_BUT_IF_PRESENT_MUST_BE_COORDINATED",
    RESET_NETWORK_VALIDATION_STATUS: "NOT_APPLICABLE_ZERO_REQUESTS",
    RESET_OPERATION_ACCEPTANCE_STATUS: "GREEN",
    BOOTSTRAP_REQUEST_CAN_SATISFY_RESET: "NO",
    BOOTSTRAP_MISASSOCIATION_COUNT: 0,
    RESET_OPERATION_WITH_ZERO_GENERIC_REQUEST_COUNT: 1,
    RESET_OPERATION_WITH_GENERIC_REQUEST_COUNT: 0,
    RESET_GENERIC_REQUEST_INVALID_COUNT: 0,
  });
  const [operation] = runtime.REQUEST_LIFECYCLE_SNAPSHOT.RESET_OPERATIONS;
  assert.equal(operation.RESET_NETWORK_VALIDATION_STATUS, "NOT_APPLICABLE_ZERO_REQUESTS");
  assert.equal(operation.RESET_LIFECYCLE_EVIDENCE, "PASS");
});

async function run() {
  let pass = 0;
  let fail = 0;
  let redObserved = 0;
  let redUnexpectedPass = 0;
  const activeCases = expectResetSemanticsRed
    ? resetSemanticsCases
    : resetSemanticsOnly ? [...resetSemanticsCases, ...resetSemanticsIntegrationCases] : cases;
  const activeExpectRed = expectRed || expectResetSemanticsRed;
  for (const current of activeCases) {
    try {
      await current.fn();
      if (activeExpectRed) {
        redUnexpectedPass += 1;
        console.error(`RED-UNEXPECTED-PASS ${current.name}`);
      } else {
        pass += 1;
        console.log(`PASS ${current.name}`);
      }
    } catch (error) {
      if (activeExpectRed) {
        redObserved += 1;
        console.log(`RED-OBSERVED ${current.name}: ${error?.message || error}`);
      } else {
        fail += 1;
        console.error(`FAIL ${current.name}: ${error?.message || error}`);
      }
    }
  }
  const result = activeExpectRed
    ? (expectResetSemanticsRed
      ? { RESET_SEMANTICS_RED_TEST_COUNT: activeCases.length, RESET_SEMANTICS_RED_OBSERVED_COUNT: redObserved, RESET_SEMANTICS_RED_UNEXPECTED_PASS_COUNT: redUnexpectedPass, REAL_BROWSER_RUN_STARTED: "NO" }
      : { CONSOLIDATED_RED_TEST_COUNT: activeCases.length, CONSOLIDATED_RED_OBSERVED_COUNT: redObserved, CONSOLIDATED_RED_UNEXPECTED_PASS_COUNT: redUnexpectedPass, REAL_BROWSER_RUN_STARTED: "NO" })
    : {
      FOCUSED_TEST_TOTAL: activeCases.length,
      FOCUSED_TEST_PASS: pass,
      FOCUSED_TEST_FAIL: fail,
      ACTUAL_ENTRYPOINT_INTEGRATION_TEST_EXECUTED: "YES",
      ACTUAL_ENTRYPOINT_ZERO_REQUEST_RESET_TEST_EXECUTED: resetSemanticsOnly ? "YES" : "NO",
      ACTUAL_ENTRYPOINT_ZERO_REQUEST_RESET_TEST_PASS: resetSemanticsOnly && fail === 0 ? "YES" : "NO",
      REAL_BROWSER_RUN_STARTED: "NO",
    };
  console.log(JSON.stringify(result, null, 2));
  if ((activeExpectRed && redUnexpectedPass) || (!activeExpectRed && fail)) process.exitCode = 1;
}

await run();
