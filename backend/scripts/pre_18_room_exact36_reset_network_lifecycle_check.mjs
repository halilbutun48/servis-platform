/*
 * No-browser contract for the ROOM exact36 canonical-reset and generic
 * request-lifecycle boundary.  It drives the durable runtime entrypoint with
 * deterministic adapters; no product origin, browser, or persisted runtime
 * data is touched.
 */
import assert from "node:assert/strict";

import * as workers from "./lib/pre_18_room_worker_pool.mjs";
import { deriveOriginalRootFacts } from "./lib/pre_18_room_residual195_accounting_v1.mjs";
import * as exact36Runtime from "./pre_18_luna_full_hybrid_surface_state_completion.mjs";

const { runRoomExact36DurableRuntime } = exact36Runtime;

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

const generic = (suffix) => ({ method: "GET", url: `https://harness.invalid/api/exact36/${suffix}` });

function seedCoordinator(coordinator) {
  const request = generic("seed");
  const requestIdentity = coordinator.beginGenericRequest({ request, workerId: "ROOM-W1", route: "/room", bootstrap: true });
  assert.equal(coordinator.requestLease({ request, requestIdentity }).granted, true);
  coordinator.recordPlaywrightRequest({ request, requestIdentity });
  coordinator.markGenericRequestDispatched({ requestIdentity });
  coordinator.observeResponse({ request, requestIdentity, status: 200, headers: { "ratelimit-remaining": "119", "ratelimit-reset": "60" } });
  coordinator.recordRequestFinished({ request, requestIdentity });
  return requestIdentity;
}

function grantAndDispatch(coordinator, { workerId, contractId, suffix }) {
  const request = generic(suffix);
  const requestIdentity = coordinator.beginGenericRequest({ request, workerId, contractId, route: "/room/offers" });
  coordinator.recordPlaywrightRequest({ request, requestIdentity });
  assert.equal(coordinator.requestLease({ request, workerId, requestIdentity }).granted, true);
  coordinator.markGenericRequestDispatched({ requestIdentity });
  return { request, requestIdentity };
}

function workerPlan() {
  return Array.from({ length: 6 }, (_, workerIndex) => ({
    WORKER_ID: `ROOM-W${workerIndex + 1}`,
    ASSIGNMENTS: Array.from({ length: 6 }, (_, assignmentIndex) => ({
      ACTION_CONTRACT_ID: `EXACT36-${workerIndex + 1}-${assignmentIndex + 1}`,
      RESET_REQUIRED: true,
      ROUTE: assignmentIndex % 2 === 0 ? "/room/agreements" : "/room/financial-operations",
    })),
  }));
}

function resultFor(assignment) {
  return {
    ACTION_CONTRACT_ID: assignment.ACTION_CONTRACT_ID,
    PREHIT_ROOT: "PREHIT-S1",
    ROUTE: assignment.ROUTE,
    executionState: "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING",
    ORIGINAL_ROOT_FACTS: deriveOriginalRootFacts({ root: "PREHIT-S1", authReady: true, routeReady: true }),
  };
}

async function runActualEntrypoint({ resetBehavior = "PROVEN" } = {}) {
  const coordinator = workers.createSharedAuthenticatedReadBudgetCoordinator({
    authenticatedScope: "ROOM_EXACT36_RESET_NETWORK_TEST",
    now: () => 10,
  });
  const resets = [];
  const persisted = [];
  const plan = workerPlan();
  const createWorkerRuntime = async ({ worker, workerId, genericReadBudgetCoordinator, bootstrap }) => {
    const bootstrapRequest = generic(`${workerId}/bootstrap`);
    const requestIdentity = genericReadBudgetCoordinator.beginGenericRequest({
      request: bootstrapRequest,
      workerId,
      route: "/room",
      bootstrap,
    });
    assert.equal(genericReadBudgetCoordinator.requestLease({ request: bootstrapRequest, workerId, requestIdentity }).granted, true);
    genericReadBudgetCoordinator.recordPlaywrightRequest({ request: bootstrapRequest, requestIdentity });
    genericReadBudgetCoordinator.markGenericRequestDispatched({ requestIdentity });
    genericReadBudgetCoordinator.observeResponse({
      request: bootstrapRequest,
      requestIdentity,
      status: 200,
      headers: bootstrap
        ? { "ratelimit-remaining": "119", "ratelimit-reset": "60", "ratelimit-policy": "120;w=60" }
        : { "ratelimit-remaining": "118", "ratelimit-reset": "60" },
    });
    genericReadBudgetCoordinator.recordRequestFinished({ request: bootstrapRequest, requestIdentity });
    return {
      workerAuth: { AUTH_OK: true, AUTH: { authStatus: 200, authRole: "ROOM", tenantScopeProven: true }, API_ME_RESOURCE_COUNT: 1 },
      authenticated: { ok: true },
      interception: {
        installed: true,
        beginTeardown: () => genericReadBudgetCoordinator.beginGenericRequestTeardown({ workerId }),
        drain: () => genericReadBudgetCoordinator.drainGenericRequestLifecycle({ workerId, timeoutMs: 50 }),
        dispose() {},
      },
      session: { context: { async close() {} } },
    };
  };
  const resetContractRuntime = async ({ workerId, assignment, resetOperation, genericReadBudgetCoordinator }) => {
    resets.push({ workerId, contractId: assignment.ACTION_CONTRACT_ID });
    if (resetBehavior === "NOT_ATTEMPTED") return { RESET_REQUIRED: true, RESET_RESULT: "NOT_ATTEMPTED" };
    const request = generic(`${workerId}/reset/${assignment.ACTION_CONTRACT_ID}`);
    const requestIdentity = genericReadBudgetCoordinator.beginGenericRequest({
      request,
      workerId,
      contractId: assignment.ACTION_CONTRACT_ID,
      route: "/room",
      lifecyclePhase: resetOperation?.LIFECYCLE_PHASE,
      resetOperationId: resetOperation?.RESET_OPERATION_ID,
      contractRoute: resetOperation?.CONTRACT_ROUTE,
      resetNavigationRoute: resetOperation?.RESET_NAVIGATION_ROUTE,
    });
    assert.equal(genericReadBudgetCoordinator.requestLease({ request, workerId, requestIdentity }).granted, true);
    genericReadBudgetCoordinator.recordPlaywrightRequest({ request, requestIdentity });
    genericReadBudgetCoordinator.markGenericRequestDispatched({ requestIdentity });
    genericReadBudgetCoordinator.observeResponse({ request, requestIdentity, status: 200, headers: { "ratelimit-remaining": "117", "ratelimit-reset": "60" } });
    genericReadBudgetCoordinator.recordRequestFinished({ request, requestIdentity });
    return {
      RESET_REQUIRED: true,
      RESET_STARTED: true,
      RESET_COMPLETED: true,
      RESET_PROOF: true,
      RESET_RESULT: "CANONICAL_RESET_PROVEN",
      TRANSIENT_STATE_LEAK: false,
    };
  };
  const executeContractRuntime = async ({ assignment }) => resultFor(assignment);
  const runtime = await runRoomExact36DurableRuntime({
    workers: plan,
    createWorkerRuntime,
    executeWorkerRuntime: async ({ worker }) => worker.ASSIGNMENTS.map(resultFor),
    executeContractRuntime,
    resetContractRuntime,
    persistRequestLifecycleSnapshot: async (snapshot) => { persisted.push(snapshot); },
    coordinator,
  });
  return { coordinator, plan, resets, persisted, runtime };
}

test("RESET-RED-1 durable exact36 invokes the canonical reset once for every reset-required contract", async () => {
  const { resets, runtime } = await runActualEntrypoint();
  assert.equal(resets.length, 36, "each selected contract must receive one actual canonical reset");
  assert.deepEqual([runtime.RESET_REQUIRED_COUNT, runtime.RESET_STARTED_COUNT, runtime.RESET_COMPLETED_COUNT], [36, 36, 36]);
});

test("RESET-RED-2 a not-attempted reset cannot produce a ready worker summary", async () => {
  await assert.rejects(
    () => runActualEntrypoint({ resetBehavior: "NOT_ATTEMPTED" }),
    /RESET_STATE_PROOF_IS_PRIMARY|RESET_RESULT_NOT_ATTEMPTED|WORKER_RESET_SYNTHESIZED_WITHOUT_EXECUTION|RESET_OPERATION_LIFECYCLE_NOT_PROVEN/u,
  );
});

test("RESET-RED-3 reset-generated generic reads have coordinator identity and contract attribution", async () => {
  const { runtime } = await runActualEntrypoint();
  const resetRequests = runtime.REQUEST_LIFECYCLE_SNAPSHOT.REQUESTS.filter((item) => item.ACTIVE_CONTRACT_ID !== "NONE");
  assert.equal(resetRequests.length, 36);
  assert.equal(resetRequests.every((item) => item.REQUEST_ID && item.PERMIT_TIMESTAMP != null && item.DISPATCH_TIMESTAMP != null), true);
});

test("RESET-RED-4 each sequential assignment on the same worker receives a separate reset lifecycle", async () => {
  const { resets } = await runActualEntrypoint();
  const workerOne = resets.filter((item) => item.workerId === "ROOM-W1");
  assert.equal(workerOne.length, 6);
  assert.equal(new Set(workerOne.map((item) => item.contractId)).size, 6);
});

test("RESET-RED-5 lifecycle snapshot is persisted before runtime teardown", async () => {
  const { persisted, runtime } = await runActualEntrypoint();
  assert.equal(persisted.length, 1);
  assert.strictEqual(persisted[0], runtime.REQUEST_LIFECYCLE_SNAPSHOT);
  assert.equal(persisted[0].REQUESTS.length, runtime.GENERIC_DISPATCH_COUNT);
});

test("RESET-RED-6 durable exact36 exposes the canonical ROOM reset adapter for real browser execution", () => {
  assert.equal(typeof exact36Runtime.resetRoomExact36CanonicalContract, "function");
});

test("NETWORK-RED-1 durable output separates grant, dispatch, request, response, and terminal counters", async () => {
  const { runtime } = await runActualEntrypoint();
  assert.equal(runtime.REQUEST_LIFECYCLE_SNAPSHOT_WRITTEN, "YES");
  assert.equal(runtime.GENERIC_DISPATCH_COUNT, runtime.PLAYWRIGHT_GENERIC_REQUEST_EVENT_COUNT);
  assert.equal(runtime.GENERIC_TERMINAL_COUNT + runtime.GENERIC_UNKNOWN_TERMINAL_COUNT, runtime.GENERIC_DISPATCH_COUNT);
});

test("NETWORK-RED-2 request lifecycle records a distinct browser event and final terminal for each same-url worker request", () => {
  const coordinator = workers.createSharedAuthenticatedReadBudgetCoordinator({ authenticatedScope: "ROOM_EXACT36_NETWORK_IDENTITY_TEST", now: () => 10 });
  assert.equal(typeof coordinator.recordPlaywrightRequest, "function", "the coordinator must record a browser request against its request identity");
  assert.equal(typeof coordinator.recordRequestFinished, "function", "the coordinator must retain the requestfinished lifecycle event");
  seedCoordinator(coordinator);
  const ids = Array.from({ length: 6 }, (_, index) => {
    const request = generic("same-url");
    const requestIdentity = coordinator.beginGenericRequest({ request, workerId: `ROOM-W${index + 1}`, contractId: `CONTRACT-${index + 1}`, route: "/room/offers" });
    assert.equal(coordinator.requestLease({ request, requestIdentity }).granted, true);
    coordinator.recordPlaywrightRequest({ request, requestIdentity });
    coordinator.markGenericRequestDispatched({ requestIdentity });
    coordinator.observeResponse({ request, requestIdentity, status: 200, headers: { "ratelimit-remaining": "119", "ratelimit-reset": "60" } });
    coordinator.recordRequestFinished({ request, requestIdentity });
    return requestIdentity;
  });
  const snapshot = coordinator.genericRequestSnapshot();
  const sameUrlRequests = snapshot.REQUESTS.filter((item) => item.URL.endsWith("/same-url"));
  assert.equal(new Set(ids).size, 6);
  assert.equal(sameUrlRequests.length, 6);
  assert.equal(new Set(sameUrlRequests.map((item) => item.REQUEST_ID)).size, 6);
  assert.deepEqual([
    snapshot.GENERIC_DISPATCH_COUNT,
    snapshot.PLAYWRIGHT_GENERIC_REQUEST_EVENT_COUNT,
    snapshot.GENERIC_RESPONSE_EVENT_COUNT,
    snapshot.GENERIC_REQUESTFINISHED_COUNT,
    snapshot.GENERIC_REQUESTFAILED_COUNT,
    snapshot.GENERIC_TERMINAL_COUNT,
    snapshot.GENERIC_UNKNOWN_TERMINAL_COUNT,
  ], [7, 7, 7, 7, 0, 7, 0]);
});

test("NETWORK-RED-3 thirty-seven dispatches remain reconstructable when only thirty-one receive response events", () => {
  const coordinator = workers.createSharedAuthenticatedReadBudgetCoordinator({ authenticatedScope: "ROOM_EXACT36_NETWORK_37_TEST", now: () => 10 });
  seedCoordinator(coordinator);
  for (let index = 0; index < 36; index += 1) {
    const { request, requestIdentity } = grantAndDispatch(coordinator, {
      workerId: `ROOM-W${(index % 6) + 1}`,
      contractId: `CONTRACT-${index + 1}`,
      suffix: `lifecycle-${index + 1}`,
    });
    if (index < 30) {
      coordinator.observeResponse({ request, requestIdentity, status: 200, headers: { "ratelimit-remaining": "110", "ratelimit-reset": "60" } });
      coordinator.recordRequestFinished({ request, requestIdentity });
    } else if (index < 33) {
      coordinator.recordRequestFailed({ request, requestIdentity, reason: "net::ERR_FAILED" });
    } else {
      coordinator.recordRequestFailed({ request, requestIdentity, reason: index % 2 === 0 ? "net::ERR_ABORTED" : "CONTEXT_CLOSED" });
    }
  }
  const snapshot = coordinator.genericRequestSnapshot();
  assert.deepEqual([
    snapshot.GENERIC_PERMIT_OUTCOME_COUNT,
    snapshot.GENERIC_DISPATCH_COUNT,
    snapshot.PLAYWRIGHT_GENERIC_REQUEST_EVENT_COUNT,
    snapshot.GENERIC_RESPONSE_EVENT_COUNT,
    snapshot.GENERIC_REQUESTFINISHED_COUNT,
    snapshot.GENERIC_REQUESTFAILED_COUNT,
    snapshot.GENERIC_TERMINAL_COUNT,
    snapshot.GENERIC_UNKNOWN_TERMINAL_COUNT,
  ], [37, 37, 37, 31, 31, 6, 37, 0]);
  assert.equal(snapshot.REQUESTS.filter((item) => item.REQUEST_ID && item.FINAL_TERMINAL_CLASS).length, 37);
});

test("NETWORK-RED-4 a pre-dispatch cancellation releases its reservation without becoming a dispatch", () => {
  const coordinator = workers.createSharedAuthenticatedReadBudgetCoordinator({ authenticatedScope: "ROOM_EXACT36_CANCEL_TEST", now: () => 10 });
  seedCoordinator(coordinator);
  const request = generic("cancel-before-dispatch");
  const requestIdentity = coordinator.beginGenericRequest({ request, workerId: "ROOM-W2", contractId: "CANCEL-1", route: "/room/offers" });
  coordinator.recordPlaywrightRequest({ request, requestIdentity });
  assert.equal(coordinator.requestLease({ request, requestIdentity }).granted, true);
  assert.equal(coordinator.cancelGenericRequestBeforeDispatch({ requestIdentity, reason: "TEST_CANCEL" }).released, true);
  const snapshot = coordinator.genericRequestSnapshot();
  assert.deepEqual([snapshot.GENERIC_DISPATCH_COUNT, snapshot.CANCELLED_BEFORE_DISPATCH_COUNT, snapshot.IN_FLIGHT_RESERVATION_COUNT], [1, 1, 0]);
});

test("NETWORK-RED-5 a finished request without a response is visible as unknown rather than silently lost", () => {
  const coordinator = workers.createSharedAuthenticatedReadBudgetCoordinator({ authenticatedScope: "ROOM_EXACT36_UNKNOWN_TEST", now: () => 10 });
  seedCoordinator(coordinator);
  const { request, requestIdentity } = grantAndDispatch(coordinator, { workerId: "ROOM-W3", contractId: "UNKNOWN-1", suffix: "unknown-terminal" });
  coordinator.recordRequestFinished({ request, requestIdentity });
  const snapshot = coordinator.genericRequestSnapshot();
  assert.deepEqual([snapshot.GENERIC_TERMINAL_COUNT, snapshot.GENERIC_UNKNOWN_TERMINAL_COUNT], [1, 1]);
  assert.equal(snapshot.REQUESTS.find((item) => item.REQUEST_ID === requestIdentity).FINAL_TERMINAL_CLASS, "UNKNOWN_TERMINAL");
});

test("NETWORK-RED-6 durable legacy naming maps to dispatch rather than response-terminal parity", async () => {
  const { runtime } = await runActualEntrypoint();
  assert.equal(runtime.SERVER_GENERIC_REQUEST_COUNT_SEMANTICS, "GENERIC_DISPATCH_COUNT");
  assert.equal(runtime.SERVER_GENERIC_REQUEST_COUNT, runtime.GENERIC_DISPATCH_COUNT);
  assert.equal(runtime.GENERIC_RESPONSE_EVENT_COUNT, runtime.GENERIC_DISPATCH_COUNT);
});

let pass = 0;
let fail = 0;
for (const current of cases) {
  try {
    await current.fn();
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
  ACTUAL_EXACT36_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
  REAL_BROWSER_RUN_STARTED: "NO",
}, null, 2));
if (fail) process.exitCode = 1;
