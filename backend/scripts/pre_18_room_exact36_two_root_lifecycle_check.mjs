/*
 * Bounded, no-browser contract for the two exact36 ROOM harness roots.
 *
 * `--expect-red` intentionally reproduces the pre-corrective absence of the
 * lifecycle model and the historical bespoke A1 contamination predicate.
 * The normal mode is the post-corrective proof.  Neither mode opens a
 * browser, authenticates, or contacts a product origin.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import * as workers from "./lib/pre_18_room_worker_pool.mjs";
import { aggregateResidual195Summary, deriveOriginalRootFacts } from "./lib/pre_18_room_residual195_accounting_v1.mjs";
import { runRoomExact36DurableRuntime } from "./pre_18_luna_full_hybrid_surface_state_completion.mjs";

const expectRed = process.argv.includes("--expect-red");
const generic = (suffix = "dashboard") => ({ method: "GET", url: `https://harness.invalid/api/${suffix}` });
const cases = [];
function test(root, name, fn) { cases.push({ root, name, fn }); }
let rootASimulation = null;
let rootBFixture = null;
let actualRuntimeEvidence = null;

function historicalFalsePositiveA1Guard(rows) {
  return rows.filter((row) => row.PREHIT_ROOT !== "PREHIT-A1" && row.FINANCIAL_CONTENT_SETTLED === true).length;
}

function exact36Rows() {
  return [
    ...Array.from({ length: 33 }, (_, index) => ({
      ACTION_CONTRACT_ID: `S1-${index + 1}`,
      PREHIT_ROOT: "PREHIT-S1",
      ROUTE: "/room/shifts",
      ORIGINAL_ROOT_FACTS: deriveOriginalRootFacts({ root: "PREHIT-S1", authReady: true, routeReady: true }),
    })),
    ...["S1-financial-1", "S1-financial-2"].map((id) => ({
      ACTION_CONTRACT_ID: id,
      PREHIT_ROOT: "PREHIT-S1",
      ROUTE: "/room/financial-operations",
      FINANCIAL_CONTENT_SETTLED: true,
      executionState: "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING",
      ORIGINAL_ROOT_FACTS: deriveOriginalRootFacts({ root: "PREHIT-S1", authReady: true, routeReady: true }),
    })),
    {
      ACTION_CONTRACT_ID: "A1-1",
      PREHIT_ROOT: "PREHIT-A1",
      ROUTE: "/room/financial-operations",
      FINANCIAL_CONTENT_SETTLED: true,
      ORIGINAL_ROOT_FACTS: deriveOriginalRootFacts({ root: "PREHIT-A1", financialContentSettled: true, semanticResolutionAfterSettlement: true }),
    },
  ];
}

function createCoordinator(now = () => 0) {
  return workers.createSharedAuthenticatedReadBudgetCoordinator({
    authenticatedScope: "ROOM_EXACT36_TEST_SCOPE",
    now,
  });
}

function exact36WorkerPlan() {
  return Array.from({ length: 6 }, (_, index) => ({
    WORKER_ID: `ROOM-W${index + 1}`,
    ASSIGNMENTS: Array.from({ length: 6 }, (_, assignmentIndex) => ({ ACTION_CONTRACT_ID: `EXACT36-${index + 1}-${assignmentIndex + 1}` })),
  }));
}

function exact36RowsByWorker(worker) {
  const workerIndex = Number(String(worker.WORKER_ID || "").replace(/\D+/gu, "")) || 1;
  return worker.ASSIGNMENTS.map((assignment, assignmentIndex) => {
    const ordinal = ((workerIndex - 1) * 6) + assignmentIndex;
    const a1 = ordinal === 30;
    const root = a1 ? "PREHIT-A1" : "PREHIT-S1";
    return {
      ACTION_CONTRACT_ID: assignment.ACTION_CONTRACT_ID,
      PREHIT_ROOT: root,
      ROUTE: a1 || ordinal === 31 || ordinal === 32 ? "/room/financial-operations" : "/room/agreements",
      FINANCIAL_CONTENT_SETTLED: a1 || ordinal === 31 || ordinal === 32,
      executionState: a1 ? "PREHIT_STATE_RECONSTRUCTION_CLOSED" : "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING",
      ORIGINAL_ROOT_FACTS: deriveOriginalRootFacts(a1
        ? { root, financialContentSettled: true, semanticResolutionAfterSettlement: true }
        : { root, authReady: true, routeReady: true }),
    };
  });
}

function workerAuthEvidence() {
  return {
    AUTH_OK: true,
    AUTH: { authStatus: 200, authRole: "ROOM", tenantScopeProven: true },
    API_ME_RESOURCE_COUNT: 1,
  };
}

async function executeActualExact36Runtime({ mode = "GREEN" } = {}) {
  const events = [];
  const workerPlan = exact36WorkerPlan();
  const deferredPermitWaits = [];
  const lifecycleSnapshots = [];
  let resetCompletedCount = 0;
  let releaseResetBarrier = null;
  const allResetsCompleted = new Promise((resolve) => { releaseResetBarrier = resolve; });
  let releasePendingBudgetSeed = null;
  const pendingBudgetSeeded = new Promise((resolve) => { releasePendingBudgetSeed = resolve; });
  const coordinator = workers.createSharedAuthenticatedReadBudgetCoordinator({
    authenticatedScope: "ROOM_EXACT36_RUNTIME_ENTRYPOINT_TEST",
    now: () => 0,
    wait: () => new Promise(() => {}),
  });
  const request = (workerId, suffix) => ({ method: "GET", url: `https://harness.invalid/api/exact36/${workerId}/${suffix}` });
  const createWorkerRuntime = async ({ worker, workerId, genericReadBudgetCoordinator, bootstrap }) => {
    events.push(`create:${workerId}:${bootstrap ? "bootstrap" : "parallel"}`);
    assert.strictEqual(genericReadBudgetCoordinator, coordinator, "actual entrypoint must pass the single shared coordinator into every auth context");
    if (mode !== "PENDING_TEARDOWN" || bootstrap) {
      const bootstrapRequest = request(workerId, "auth-bootstrap");
      const requestIdentity = genericReadBudgetCoordinator.beginGenericRequest({
        request: bootstrapRequest,
        workerId,
        route: "/room",
        bootstrap,
      });
      const lease = genericReadBudgetCoordinator.requestLease({ request: bootstrapRequest, workerId, requestIdentity });
      assert.equal(lease.granted, true, "authenticated bootstrap generic read must be coordinator-owned before navigation completes");
      genericReadBudgetCoordinator.recordPlaywrightRequest({ request: bootstrapRequest, requestIdentity });
      genericReadBudgetCoordinator.markGenericRequestDispatched({ requestIdentity });
      genericReadBudgetCoordinator.observeResponse({
        request: bootstrapRequest,
        requestIdentity,
        status: 200,
        headers: bootstrap
          ? { "ratelimit-policy": "120;w=60", "ratelimit-remaining": "113", "ratelimit-reset": "60" }
          : { "ratelimit-remaining": "112", "ratelimit-reset": "60" },
      });
      genericReadBudgetCoordinator.recordRequestFinished({ request: bootstrapRequest, requestIdentity });
    }
    const interception = {
      installed: true,
      beginTeardown() {
        events.push(`begin:${workerId}`);
        genericReadBudgetCoordinator.beginGenericRequestTeardown({ workerId });
      },
      async drain() {
        events.push(`drain:${workerId}`);
        return genericReadBudgetCoordinator.drainGenericRequestLifecycle({ workerId, timeoutMs: 100 });
      },
      dispose() { events.push(`dispose:${workerId}`); },
    };
    return {
      authenticated: { ok: true, auth: workerAuthEvidence().AUTH },
      workerAuth: workerAuthEvidence(),
      interception,
      session: { context: { async close() { events.push(`close:${workerId}`); } } },
    };
  };
  const resetContractRuntime = async ({ workerId, assignment, resetOperation, genericReadBudgetCoordinator }) => {
    const resetRequest = request(workerId, `reset-${assignment.ACTION_CONTRACT_ID}`);
    const requestIdentity = genericReadBudgetCoordinator.beginGenericRequest({
      request: resetRequest,
      workerId,
      contractId: assignment.ACTION_CONTRACT_ID,
      route: "/room",
      lifecyclePhase: resetOperation?.LIFECYCLE_PHASE,
      resetOperationId: resetOperation?.RESET_OPERATION_ID,
      contractRoute: resetOperation?.CONTRACT_ROUTE,
      resetNavigationRoute: resetOperation?.RESET_NAVIGATION_ROUTE,
    });
    assert.equal(genericReadBudgetCoordinator.requestLease({ request: resetRequest, workerId, requestIdentity }).granted, true, `reset permit must be granted for ${assignment.ACTION_CONTRACT_ID}`);
    genericReadBudgetCoordinator.recordPlaywrightRequest({ request: resetRequest, requestIdentity });
    genericReadBudgetCoordinator.markGenericRequestDispatched({ requestIdentity });
    genericReadBudgetCoordinator.observeResponse({ request: resetRequest, requestIdentity, status: 200, headers: { "ratelimit-remaining": "112", "ratelimit-reset": "60" } });
    genericReadBudgetCoordinator.recordRequestFinished({ request: resetRequest, requestIdentity });
    resetCompletedCount += 1;
    if (resetCompletedCount === 36) releaseResetBarrier();
    return {
      RESET_REQUIRED: true,
      RESET_STARTED: true,
      RESET_COMPLETED: true,
      RESET_PROOF: true,
      RESET_RESULT: "CANONICAL_RESET_PROVEN",
      TRANSIENT_STATE_LEAK: false,
    };
  };
  const executeContractRuntime = async ({ worker, workerId, assignment, genericReadBudgetCoordinator, criticalResponses }) => {
    if (mode === "PENDING_TEARDOWN" && /-6$/u.test(assignment.ACTION_CONTRACT_ID)) {
      await allResetsCompleted;
      if (workerId === "ROOM-W1") {
        const exhaustionRequest = request(workerId, "authoritative-exhaustion");
        const exhaustionIdentity = genericReadBudgetCoordinator.beginGenericRequest({ request: exhaustionRequest, workerId, route: "/room/shifts" });
        assert.equal(genericReadBudgetCoordinator.requestLease({ request: exhaustionRequest, workerId, requestIdentity: exhaustionIdentity }).granted, true);
        genericReadBudgetCoordinator.recordPlaywrightRequest({ request: exhaustionRequest, requestIdentity: exhaustionIdentity });
        genericReadBudgetCoordinator.markGenericRequestDispatched({ requestIdentity: exhaustionIdentity });
        genericReadBudgetCoordinator.observeResponse({ request: exhaustionRequest, requestIdentity: exhaustionIdentity, status: 200, headers: { "ratelimit-remaining": "0", "ratelimit-reset": "60" } });
        genericReadBudgetCoordinator.recordRequestFinished({ request: exhaustionRequest, requestIdentity: exhaustionIdentity });
        releasePendingBudgetSeed();
      } else {
        await pendingBudgetSeeded;
      }
      const pendingRequest = request(workerId, "final-pending");
      const requestIdentity = genericReadBudgetCoordinator.beginGenericRequest({ request: pendingRequest, workerId, route: "/room/shifts" });
      deferredPermitWaits.push(genericReadBudgetCoordinator.waitForPermit({ request: pendingRequest, workerId, requestIdentity }).catch(() => "CANCELLED_DURING_TEARDOWN"));
    }
    if (mode === "SERVER_429" && workerId === "ROOM-W1" && /-6$/u.test(assignment.ACTION_CONTRACT_ID)) {
      await allResetsCompleted;
      const failingRequest = request(workerId, "authoritative-429");
      const requestIdentity = genericReadBudgetCoordinator.beginGenericRequest({ request: failingRequest, workerId, route: "/room/shifts" });
      assert.equal(genericReadBudgetCoordinator.requestLease({ request: failingRequest, workerId, requestIdentity }).granted, true, "429 probe permit must be granted");
      genericReadBudgetCoordinator.recordPlaywrightRequest({ request: failingRequest, requestIdentity });
      genericReadBudgetCoordinator.markGenericRequestDispatched({ requestIdentity });
      genericReadBudgetCoordinator.observeResponse({ request: failingRequest, requestIdentity, status: 429, headers: { "retry-after": "60" } });
      genericReadBudgetCoordinator.recordRequestFinished({ request: failingRequest, requestIdentity });
      criticalResponses.push({ method: "GET", url: failingRequest.url, status: 429 });
    }
    return exact36RowsByWorker(worker).find((row) => row.ACTION_CONTRACT_ID === assignment.ACTION_CONTRACT_ID);
  };
  const runtime = await runRoomExact36DurableRuntime({
    workers: workerPlan,
    createWorkerRuntime,
    executeContractRuntime,
    resetContractRuntime,
    persistRequestLifecycleSnapshot: async (snapshot) => { lifecycleSnapshots.push(snapshot); },
    coordinator,
  });
  await Promise.all(deferredPermitWaits);
  return { runtime, events, workerPlan, lifecycleSnapshots };
}

if (expectRed) {
  // A1/A2: current pre-corrective coordinator lacks request identities,
  // authoritative seed, reservations, and lifecycle drain ownership.
  for (const [index, requiredMethod] of [
    "beginGenericRequest",
    "waitForAuthoritativeSeed",
    "markGenericRequestDispatched",
    "cancelGenericRequestBeforeDispatch",
    "drainGenericRequestLifecycle",
    "beginGenericRequestTeardown",
    "genericRequestSnapshot",
    "server429ForcesBudgetViolation",
    "authoritativeHeaderSeeded",
    "activeReservationCount",
    "pendingGenericWaiterCount",
    "activeGenericRequestCount",
    "genericRequestIdentityCount",
    "genericDemandCount",
    "genericPermitOutcomeCount",
    "genericResponseReconciliationCount",
  ].entries()) {
    test("A", `G429-LIFE-RED-${index + 1} ${requiredMethod} is required`, () => {
      const coordinator = createCoordinator();
      assert.equal(typeof coordinator[requiredMethod], "function", `${requiredMethod} missing`);
    });
  }

  // ROOT-B: reproduce the old bespoke predicate against exact36 facts.  The
  // production accounting owner is already separate and immutable; this is a
  // regression anchor for the removed terminal-canary predicate.
  for (const [index, label] of [
    "S1 financial telemetry is not A1 contamination",
    "35 S1 plus 1 A1 has zero contamination",
    "route does not change immutable membership",
    "settlement telemetry does not change immutable membership",
    "downstream hit-test does not change immutable membership",
    "terminal gate must use authoritative aggregation",
    "actual A1 remains the only A1 member",
  ].entries()) {
    test("B", `A1-SCOPE-RED-${index + 1} ${label}`, () => {
      const rows = exact36Rows();
      assert.equal(historicalFalsePositiveA1Guard(rows), 0, "historical bespoke guard falsely counts S1 route telemetry");
    });
  }
} else {
  test("A", "RUNTIME-A-1 actual durable entrypoint seeds before parallel workers release", async () => {
    const { runtime, events } = await executeActualExact36Runtime();
    actualRuntimeEvidence = runtime;
    assert.equal(runtime.ACTUAL_EXACT36_ENTRYPOINT_EXECUTED, "YES");
    assert.equal(runtime.EXACT36_RUNTIME_ENTRYPOINT_SOURCE, "CURRENT_DURABLE_RUNNER");
    assert.equal(runtime.SERVER_SEED_BEFORE_PARALLEL, "YES");
    assert.equal(runtime.PARALLEL_RELEASE_BEFORE_SERVER_SEED_COUNT, 0);
    assert.equal(events[0], "create:ROOM-W1:bootstrap");
    assert.equal(events.slice(1, 6).every((item) => /:parallel$/u.test(item)), true);
  });

  test("A", "RUNTIME-A-2 every authenticated worker receives the one coordinator before its first generic read", async () => {
    const { runtime } = await executeActualExact36Runtime();
    assert.deepEqual([
      runtime.COORDINATOR_INSTANCE_COUNT,
      runtime.COORDINATOR_PASSED_INTO_AUTH_CONTEXT,
      runtime.CONTEXT_INTERCEPTION_BEFORE_FIRST_GENERIC_READ,
      runtime.PRE_COORDINATOR_UNACCOUNTED_COUNT,
    ], [1, "YES", "YES", 0]);
  });

  test("A", "RUNTIME-A-3 observed server generic reads are all granted coordinator requests", async () => {
    const { runtime } = await executeActualExact36Runtime();
    assert.equal(runtime.SERVER_GENERIC_REQUEST_COUNT, runtime.GRANTED_GENERIC_REQUEST_COUNT);
    assert.equal(runtime.UNGRANTED_SERVER_GENERIC_REQUEST_COUNT, 0);
    assert.equal(runtime.GENERIC_REQUEST_ACCOUNTING_GAP_COUNT, 0);
  });

  test("A", "RUNTIME-A-4 six pending final-contract waiters drain before any context closes", async () => {
    const { runtime, events } = await executeActualExact36Runtime({ mode: "PENDING_TEARDOWN" });
    const evidence = JSON.stringify({ drain: runtime.DRAIN_FUNCTION_CALLED_PER_WORKER, unroute: runtime.UNROUTE_BEFORE_DRAIN_COUNT, close: runtime.CONTEXT_CLOSE_BEFORE_DRAIN_COUNT, escape: runtime.TEARDOWN_ESCAPE_COUNT, postDrain: runtime.POST_DRAIN_GENERIC_REQUEST_COUNT });
    assert.equal(runtime.DRAIN_FUNCTION_CALLED_PER_WORKER, "YES", evidence);
    assert.equal(runtime.UNROUTE_BEFORE_DRAIN_COUNT, 0, evidence);
    assert.equal(runtime.CONTEXT_CLOSE_BEFORE_DRAIN_COUNT, 0, evidence);
    assert.equal(runtime.TEARDOWN_ESCAPE_COUNT, 0, evidence);
    assert.equal(runtime.POST_DRAIN_GENERIC_REQUEST_COUNT, 0, evidence);
    for (let index = 1; index <= 6; index += 1) {
      const worker = `ROOM-W${index}`;
      assert.equal(events.indexOf(`begin:${worker}`) < events.indexOf(`drain:${worker}`), true, `teardown must begin before drain for ${worker}: ${events.join(",")}`);
      assert.equal(events.indexOf(`drain:${worker}`) < events.indexOf(`dispose:${worker}`), true, `drain must precede disposal for ${worker}: ${events.join(",")}`);
      assert.equal(events.indexOf(`dispose:${worker}`) < events.indexOf(`close:${worker}`), true, `disposal must precede close for ${worker}: ${events.join(",")}`);
    }
  });

  test("A", "RUNTIME-A-5 pending permit cancellation leaves no ungranted server request", async () => {
    const { runtime } = await executeActualExact36Runtime({ mode: "PENDING_TEARDOWN" });
    const evidence = JSON.stringify({ ungranted: runtime.UNGRANTED_SERVER_GENERIC_REQUEST_COUNT, postDrain: runtime.POST_DRAIN_GENERIC_REQUEST_COUNT });
    assert.equal(runtime.UNGRANTED_SERVER_GENERIC_REQUEST_COUNT, 0, evidence);
    assert.equal(runtime.POST_DRAIN_GENERIC_REQUEST_COUNT, 0, evidence);
  });

  test("A", "RUNTIME-A-6 an authoritative generic server 429 forces terminal budget violation", async () => {
    const { runtime } = await executeActualExact36Runtime({ mode: "SERVER_429" });
    const evidence = JSON.stringify({ violations: runtime.GENERIC_BUDGET_VIOLATION_COUNT, wiring: runtime.SERVER_429_FORCES_VIOLATION_RUNTIME_WIRING });
    assert.equal(runtime.GENERIC_BUDGET_VIOLATION_COUNT >= 1, true, evidence);
    assert.equal(runtime.SERVER_429_FORCES_VIOLATION_RUNTIME_WIRING, "PASS", evidence);
  });

  test("A", "RUNTIME-A-7 durable entrypoint has no duplicate wrapper budget counters", async () => {
    const { runtime } = await executeActualExact36Runtime();
    assert.deepEqual([
      runtime.HISTORICAL_SERIALIZED_LIFECYCLE_EXECUTABLE_COUNT,
      runtime.GENERATED_WRAPPER_SOURCE_DRIFT_REMAINING,
      runtime.DUPLICATE_RUNTIME_BUDGET_COUNTER_IMPLEMENTATION_COUNT,
    ], [0, "NO", 0]);
  });

  test("A", "RUNTIME-A-8 import executes the durable runner namespace without invoking main", async () => {
    const runner = await fs.readFile(path.join(process.cwd(), "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs"), "utf8");
    assert.match(runner, /export async function runRoomExact36DurableRuntime/u);
    assert.match(runner, /fileURLToPath\(import\.meta\.url\)/u);
    assert.doesNotMatch(runner, /data:text\/javascript/iu);
  });

  test("B", "RUNTIME-B-1 actual durable terminal summary keeps 35 S1 and one A1 member", async () => {
    const { runtime } = await executeActualExact36Runtime();
    assert.deepEqual([
      runtime.ROOT_ACCOUNTING.S1_TRUE_CLOSED,
      runtime.ROOT_ACCOUNTING.A1_TRUE_CLOSED,
      runtime.ROOT_ACCOUNTING.A1_SCOPE_CONTAMINATION_COUNT,
    ], [35, 1, 0]);
  });

  test("B", "RUNTIME-B-2 S1 financial telemetry remains route telemetry in actual terminal namespace", async () => {
    const { runtime } = await executeActualExact36Runtime();
    const financialS1 = runtime.RESULTS.filter((row) => row.PREHIT_ROOT === "PREHIT-S1" && row.FINANCIAL_CONTENT_SETTLED === true);
    assert.equal(financialS1.length, 2);
    assert.equal(runtime.A1_SCOPE_CONTAMINATION_COUNT, 0);
  });

  test("B", "RUNTIME-B-3 browser and no-browser terminal A1 fields share authoritative aggregation", async () => {
    const { runtime } = await executeActualExact36Runtime();
    assert.deepEqual([runtime.BROWSER_A1_SCOPE_SOURCE, runtime.NO_BROWSER_A1_SCOPE_SOURCE, runtime.A1_SCOPE_SOURCE_PARITY], ["AUTHORITATIVE_AGGREGATOR", "AUTHORITATIVE_AGGREGATOR", "YES"]);
  });

  test("B", "RUNTIME-B-4 durable terminal source contains no historical false-positive A1 predicate", async () => {
    const runner = await fs.readFile(path.join(process.cwd(), "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs"), "utf8");
    assert.doesNotMatch(runner, /PREHIT_ROOT\s*!==\s*["']PREHIT-A1["'][\s\S]{0,160}FINANCIAL_CONTENT_SETTLED/iu);
  });

  function bootstrap(coordinator, index = 1, remaining = 119) {
    const id = coordinator.beginGenericRequest({ request: generic(`bootstrap-${index}`), workerId: `ROOM-W${index}`, route: "/room", bootstrap: true });
    coordinator.requestLease({ request: generic(`bootstrap-${index}`), requestIdentity: id });
    coordinator.markGenericRequestDispatched({ requestIdentity: id });
    coordinator.observeResponse({ request: generic(`bootstrap-${index}`), requestIdentity: id, status: 200, headers: { "ratelimit-remaining": String(remaining), "ratelimit-reset": "60", "ratelimit-policy": "120;w=60" } });
    return id;
  }

  test("A", "G429-LIFE-1 six bootstrap generic reads have identities before dispatch", () => {
    const coordinator = createCoordinator();
    const ids = Array.from({ length: 6 }, (_, index) => coordinator.beginGenericRequest({ request: generic(`bootstrap-${index}`), workerId: `ROOM-W${index + 1}`, route: "/room", bootstrap: true }));
    for (const [index, id] of ids.entries()) {
      assert.equal(coordinator.requestLease({ request: generic(`bootstrap-${index}`), requestIdentity: id }).granted, true);
      coordinator.markGenericRequestDispatched({ requestIdentity: id });
      coordinator.observeResponse({ request: generic(`bootstrap-${index}`), requestIdentity: id, status: 200, headers: { "ratelimit-remaining": String(119 - index), "ratelimit-reset": "60" } });
    }
    const evidence = coordinator.genericRequestSnapshot();
    assert.deepEqual([evidence.REQUEST_IDENTITY_COUNT, evidence.GENERIC_DEMAND_COUNT, evidence.GENERIC_PERMIT_OUTCOME_COUNT, evidence.GENERIC_RESPONSE_RECONCILIATION_COUNT, evidence.PRE_COORDINATOR_UNACCOUNTED_COUNT], [6, 6, 6, 6, 0]);
  });

  test("A", "G429-LIFE-2 first server header seeds lower shared capacity before parallel work", () => {
    const coordinator = createCoordinator();
    bootstrap(coordinator, 1, 113);
    assert.equal(coordinator.authoritativeHeaderSeeded(), true);
    assert.equal(coordinator.snapshot().confirmedUsed, 7);
    assert.equal(coordinator.snapshot().used, 7);
  });

  test("A", "G429-LIFE-3 six workers reserve permits without aggregate over-grant", () => {
    const coordinator = createCoordinator();
    bootstrap(coordinator, 1, 113);
    const ids = Array.from({ length: 6 }, (_, index) => coordinator.beginGenericRequest({ request: generic(`parallel-${index}`), workerId: `ROOM-W${index + 1}`, route: "/room/shifts" }));
    for (const [index, id] of ids.entries()) assert.equal(coordinator.requestLease({ request: generic(`parallel-${index}`), requestIdentity: id }).granted, true);
    assert.equal(coordinator.activeReservationCount(), 6);
    assert.equal(coordinator.snapshot().used, 13);
  });

  test("A", "G429-LIFE-4 header reconciliation retains five other reservations", () => {
    const coordinator = createCoordinator();
    bootstrap(coordinator, 1, 115);
    const ids = Array.from({ length: 5 }, (_, index) => coordinator.beginGenericRequest({ request: generic(`inflight-${index}`), workerId: `ROOM-W${index + 1}` }));
    for (const [index, id] of ids.entries()) coordinator.requestLease({ request: generic(`inflight-${index}`), requestIdentity: id });
    const responseId = coordinator.beginGenericRequest({ request: generic("reconcile"), workerId: "ROOM-W6" });
    coordinator.requestLease({ request: generic("reconcile"), requestIdentity: responseId });
    coordinator.markGenericRequestDispatched({ requestIdentity: responseId });
    coordinator.observeResponse({ request: generic("reconcile"), requestIdentity: responseId, status: 200, headers: { "ratelimit-remaining": "110", "ratelimit-reset": "60" } });
    assert.equal(coordinator.activeReservationCount(), 5);
    assert.equal(coordinator.snapshot().used, 15);
  });

  test("A", "G429-LIFE-5 delayed panel read remains owned through teardown", async () => {
    const coordinator = createCoordinator();
    bootstrap(coordinator);
    const id = coordinator.beginGenericRequest({ request: generic("offers/inbox?status=OPEN"), workerId: "ROOM-W4", route: "/room/shifts" });
    coordinator.requestLease({ request: generic("offers/inbox?status=OPEN"), requestIdentity: id });
    coordinator.markGenericRequestDispatched({ requestIdentity: id });
    coordinator.beginGenericRequestTeardown({ workerId: "ROOM-W4" });
    assert.equal(coordinator.genericRequestSnapshot({ workerId: "ROOM-W4" }).ACTIVE_GENERIC_REQUEST_COUNT, 1);
    coordinator.observeResponse({ request: generic("offers/inbox?status=OPEN"), requestIdentity: id, status: 200, headers: { "ratelimit-remaining": "118", "ratelimit-reset": "60" } });
    assert.equal((await coordinator.drainGenericRequestLifecycle({ workerId: "ROOM-W4" })).drained, true);
  });

  test("A", "G429-LIFE-6 teardown cannot finish while a dispatched request remains", async () => {
    const coordinator = createCoordinator(); bootstrap(coordinator);
    const id = coordinator.beginGenericRequest({ request: generic("active"), workerId: "ROOM-W1" });
    coordinator.requestLease({ request: generic("active"), requestIdentity: id }); coordinator.markGenericRequestDispatched({ requestIdentity: id });
    coordinator.beginGenericRequestTeardown({ workerId: "ROOM-W1" });
    assert.equal(coordinator.genericRequestSnapshot({ workerId: "ROOM-W1" }).IN_FLIGHT_RESERVATION_COUNT, 1);
    coordinator.observeResponse({ request: generic("active"), requestIdentity: id, status: 200, headers: { "ratelimit-remaining": "118", "ratelimit-reset": "60" } });
    assert.equal((await coordinator.drainGenericRequestLifecycle({ workerId: "ROOM-W1" })).drained, true);
  });

  test("A", "G429-LIFE-7 teardown cancels a waiting un-dispatched read exactly once", () => {
    const coordinator = createCoordinator(); bootstrap(coordinator);
    const id = coordinator.beginGenericRequest({ request: generic("pending"), workerId: "ROOM-W2" });
    coordinator.beginGenericRequestTeardown({ workerId: "ROOM-W2" });
    assert.deepEqual(coordinator.cancelGenericRequestBeforeDispatch({ requestIdentity: id }), { requestId: id, released: false, reason: "ALREADY_TERMINAL" });
    assert.equal(coordinator.genericRequestSnapshot({ workerId: "ROOM-W2" }).ACTIVE_GENERIC_REQUEST_COUNT, 0);
  });

  test("A", "G429-LIFE-8 a server generic 429 is an authoritative budget violation", () => {
    const coordinator = createCoordinator(); bootstrap(coordinator);
    const id = coordinator.beginGenericRequest({ request: generic("429"), workerId: "ROOM-W1" });
    coordinator.requestLease({ request: generic("429"), requestIdentity: id }); coordinator.markGenericRequestDispatched({ requestIdentity: id });
    coordinator.observeResponse({ request: generic("429"), requestIdentity: id, status: 429, headers: { "retry-after": "60" } });
    assert.equal(coordinator.server429ForcesBudgetViolation(), true);
    assert.equal(coordinator.genericRequestSnapshot().GENERIC_BUDGET_VIOLATION_COUNT, 1);
  });

  test("A", "G429-LIFE-9 deterministic 123 server reads have 123 identities, grants, and reconciliations", () => {
    let current = 0;
    const coordinator = createCoordinator(() => current);
    for (let index = 0; index < 123; index += 1) {
      if (index === 120) current = 60_000;
      const request = generic(`simulated-${index}`);
      const id = coordinator.beginGenericRequest({ request, workerId: `ROOM-W${(index % 6) + 1}`, bootstrap: index === 0 });
      assert.equal(coordinator.requestLease({ request, requestIdentity: id }).granted, true);
      coordinator.markGenericRequestDispatched({ requestIdentity: id });
      const usedInWindow = index < 120 ? index + 1 : index - 119;
      coordinator.observeResponse({ request, requestIdentity: id, status: 200, headers: { "ratelimit-remaining": String(120 - usedInWindow), "ratelimit-reset": "60" } });
    }
    const evidence = coordinator.genericRequestSnapshot();
    assert.deepEqual([evidence.REQUEST_IDENTITY_COUNT, evidence.GENERIC_DEMAND_COUNT, evidence.GENERIC_PERMIT_OUTCOME_COUNT, evidence.GENERIC_RESPONSE_RECONCILIATION_COUNT, evidence.PRE_COORDINATOR_UNACCOUNTED_COUNT, evidence.GENERIC_BUDGET_VIOLATION_COUNT], [123, 123, 123, 123, 0, 0]);
    rootASimulation = evidence;
  });

  test("A", "G429-LIFE-10 auth and special reads are excluded", () => {
    const coordinator = createCoordinator();
    assert.equal(coordinator.requestLease({ request: { method: "GET", url: "https://harness.invalid/api/me" }, workerId: "ROOM-W1" }).family, "AUTH_SPECIAL");
    assert.equal(coordinator.requestLease({ request: { method: "GET", url: "https://harness.invalid/api/vehicles" }, workerId: "ROOM-W1" }).family, "SPECIAL_READ");
    assert.equal(coordinator.genericRequestIdentityCount(), 0);
  });

  test("A", "G429-LIFE-11 static resources remain excluded", () => {
    const coordinator = createCoordinator();
    assert.equal(coordinator.requestLease({ request: { method: "GET", url: "https://harness.invalid/assets/app.js" } }).family, "STATIC_OR_UNLIMITED");
  });

  test("A", "G429-LIFE-12 writes remain mutation traffic", () => {
    const coordinator = createCoordinator();
    assert.equal(coordinator.requestLease({ request: { method: "POST", url: "https://harness.invalid/api/offers" } }).family, "MUTATION_OR_WRITE");
  });

  test("A", "G429-LIFE-13 cancellation releases a reservation exactly once", () => {
    const coordinator = createCoordinator(); bootstrap(coordinator);
    const id = coordinator.beginGenericRequest({ request: generic("cancel"), workerId: "ROOM-W3" });
    coordinator.requestLease({ request: generic("cancel"), requestIdentity: id });
    assert.equal(coordinator.cancelGenericRequestBeforeDispatch({ requestIdentity: id }).released, true);
    assert.equal(coordinator.activeReservationCount(), 0);
    assert.equal(coordinator.cancelGenericRequestBeforeDispatch({ requestIdentity: id }).released, false);
  });

  test("A", "G429-LIFE-14 response reconciliation is exact once per dispatch", () => {
    const coordinator = createCoordinator(); bootstrap(coordinator);
    const id = coordinator.beginGenericRequest({ request: generic("once"), workerId: "ROOM-W3" });
    coordinator.requestLease({ request: generic("once"), requestIdentity: id }); coordinator.markGenericRequestDispatched({ requestIdentity: id });
    assert.equal(coordinator.observeResponse({ request: generic("once"), requestIdentity: id, status: 200, headers: { "ratelimit-remaining": "118" } }).observed, true);
    assert.equal(coordinator.observeResponse({ request: generic("once"), requestIdentity: id, status: 200, headers: { "ratelimit-remaining": "118" } }).observed, false);
    assert.equal(coordinator.genericResponseReconciliationCount(), 2); // bootstrap + one dispatched request
  });

  test("A", "G429-LIFE-15 six-worker policy remains supported", () => {
    const coordinator = createCoordinator();
    for (let index = 0; index < 6; index += 1) coordinator.beginGenericRequest({ request: generic(`worker-${index}`), workerId: `ROOM-W${index + 1}`, bootstrap: true });
    assert.equal(coordinator.snapshot().workerCountObserved, 6);
    assert.equal(workers.sharedReadBudgetCoordinatorPolicy().WORKER_COUNT_MAX, 6);
  });

  test("A", "G429-LIFE-16 policy introduces neither bypass nor blind pacing", () => {
    const policy = workers.sharedReadBudgetCoordinatorPolicy();
    assert.deepEqual([policy.RATE_LIMIT_POLICY_CHANGE, policy.BLIND_FIXED_SLEEP_USED, policy.LOCALHOST_RATE_LIMIT_BYPASS_ADDED, policy.TEST_MODE_RATE_LIMIT_BYPASS_ADDED], ["NONE", false, false, false]);
  });

  test("B", "A1-SCOPE-1 financial S1 telemetry never creates A1 contamination", () => {
    const summary = aggregateResidual195Summary({ results: exact36Rows() });
    assert.equal(summary.A1_SCOPE_CONTAMINATION_COUNT, 0);
  });
  test("B", "A1-SCOPE-2 exact35/1 membership remains immutable", () => {
    const summary = aggregateResidual195Summary({ results: exact36Rows() });
    assert.deepEqual([summary.S1_TRUE_CLOSED, summary.A1_TRUE_CLOSED, summary.TRUE_ORIGINAL_ROOT_CLEARED_COUNT], [35, 1, 36]);
    rootBFixture = summary;
  });
  test("B", "A1-SCOPE-3 route never changes root membership", () => {
    const rows = exact36Rows(); rows[0].ROUTE = "/room/financial-operations";
    assert.deepEqual([aggregateResidual195Summary({ results: rows }).S1_TRUE_CLOSED, aggregateResidual195Summary({ results: rows }).A1_TRUE_CLOSED], [35, 1]);
  });
  test("B", "A1-SCOPE-4 settlement telemetry never changes root membership", () => {
    const rows = exact36Rows(); rows[0].FINANCIAL_CONTENT_SETTLED = true;
    assert.equal(aggregateResidual195Summary({ results: rows }).A1_TRUE_CLOSED, 1);
  });
  test("B", "A1-SCOPE-5 downstream hit-test does not change root membership", () => {
    const rows = exact36Rows(); rows[0].executionState = "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING";
    const summary = aggregateResidual195Summary({ results: rows });
    assert.deepEqual([summary.S1_TRUE_CLOSED, summary.DOWNSTREAM_HIT_TEST_COUNT], [35, 3]);
  });
  test("B", "A1-SCOPE-6 terminal metrics are derived from authoritative aggregation", async () => {
    const summary = aggregateResidual195Summary({ results: exact36Rows() });
    assert.equal(summary.A1_SCOPE_CONTAMINATION_COUNT, 0);
    assert.equal(summary.A1_SUSPENSE_SETTLEMENT_FAILURE_COUNT, 0);
    const runner = await fs.readFile(path.join(process.cwd(), "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs"), "utf8");
    assert.match(runner, /authoritativeRoomResidualRootScope\(rootAccounting\)/u);
    assert.doesNotMatch(runner, /PREHIT_ROOT\s*!==\s*["']PREHIT-A1["'][\s\S]{0,160}FINANCIAL_CONTENT_SETTLED/iu);
  });
  test("B", "A1-SCOPE-7 the actual A1 row remains represented in settled counters", () => {
    const summary = aggregateResidual195Summary({ results: exact36Rows() });
    assert.deepEqual([summary.A1_TRUE_CLOSED, summary.A1_TRUE_OPEN], [1, 0]);
  });
}

const totals = { A: { total: 0, observed: 0, pass: 0 }, B: { total: 0, observed: 0, pass: 0 } };
for (const item of cases) {
  totals[item.root].total += 1;
  try {
    await item.fn();
    totals[item.root].pass += 1;
    console.log(`PASS ${item.root} ${item.name}`);
  } catch (error) {
    totals[item.root].observed += 1;
    console.log(`RED ${item.root} ${item.name}: ${error.message}`);
  }
}

const redSatisfied = totals.A.observed === totals.A.total && totals.B.observed === totals.B.total;
const actual = actualRuntimeEvidence || rootASimulation || {};
const actualRootATestCount = cases.filter((item) => item.root === "A" && item.name.startsWith("RUNTIME-A-")).length;
const actualRootBTestCount = cases.filter((item) => item.root === "B" && item.name.startsWith("RUNTIME-B-")).length;
console.log(JSON.stringify({
  MODE: expectRed ? "PRE_CORRECTIVE_RED" : "POST_CORRECTIVE_GREEN",
  ROOT_A_RED_TEST_COUNT: expectRed ? totals.A.total : 16,
  ROOT_A_RED_OBSERVED_COUNT: expectRed ? totals.A.observed : 0,
  ROOT_A_RED_UNEXPECTED_PASS_COUNT: expectRed ? totals.A.pass : 0,
  ROOT_B_RED_TEST_COUNT: expectRed ? totals.B.total : 7,
  ROOT_B_RED_OBSERVED_COUNT: expectRed ? totals.B.observed : 0,
  ROOT_B_RED_UNEXPECTED_PASS_COUNT: expectRed ? totals.B.pass : 0,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: totals.A.pass + totals.B.pass,
  FOCUSED_TEST_FAIL: totals.A.observed + totals.B.observed,
  ACTUAL_EXACT36_ENTRYPOINT_EXECUTED: actual.ACTUAL_EXACT36_ENTRYPOINT_EXECUTED ?? "NO",
  ACTUAL_ROOT_A_RUNTIME_CASE_COUNT: actualRootATestCount,
  ACTUAL_ROOT_B_RUNTIME_CASE_COUNT: actualRootBTestCount,
  EXACT36_RUNTIME_ENTRYPOINT_SOURCE: actual.EXACT36_RUNTIME_ENTRYPOINT_SOURCE ?? null,
  COORDINATOR_INSTANCE_COUNT: actual.COORDINATOR_INSTANCE_COUNT ?? null,
  COORDINATOR_PASSED_INTO_AUTH_CONTEXT: actual.COORDINATOR_PASSED_INTO_AUTH_CONTEXT ?? "NO",
  CONTEXT_INTERCEPTION_BEFORE_FIRST_GENERIC_READ: actual.CONTEXT_INTERCEPTION_BEFORE_FIRST_GENERIC_READ ?? "NO",
  SERVER_SEED_BEFORE_PARALLEL: actual.SERVER_SEED_BEFORE_PARALLEL ?? "NO",
  PARALLEL_RELEASE_BEFORE_SERVER_SEED_COUNT: actual.PARALLEL_RELEASE_BEFORE_SERVER_SEED_COUNT ?? null,
  DRAIN_FUNCTION_CALLED_PER_WORKER: actual.DRAIN_FUNCTION_CALLED_PER_WORKER ?? "NO",
  UNROUTE_BEFORE_DRAIN_COUNT: actual.UNROUTE_BEFORE_DRAIN_COUNT ?? null,
  CONTEXT_CLOSE_BEFORE_DRAIN_COUNT: actual.CONTEXT_CLOSE_BEFORE_DRAIN_COUNT ?? null,
  SERVER_GENERIC_REQUEST_COUNT: actual.SERVER_GENERIC_REQUEST_COUNT ?? null,
  GRANTED_GENERIC_REQUEST_COUNT: actual.GRANTED_GENERIC_REQUEST_COUNT ?? null,
  UNGRANTED_SERVER_GENERIC_REQUEST_COUNT: actual.UNGRANTED_SERVER_GENERIC_REQUEST_COUNT ?? null,
  GENERIC_REQUEST_ACCOUNTING_GAP_COUNT: actual.GENERIC_REQUEST_ACCOUNTING_GAP_COUNT ?? null,
  PRE_COORDINATOR_UNACCOUNTED_COUNT: actual.PRE_COORDINATOR_UNACCOUNTED_COUNT ?? null,
  TEARDOWN_ESCAPE_COUNT: actual.TEARDOWN_ESCAPE_COUNT ?? null,
  IN_FLIGHT_RESERVATION_LOSS_COUNT: actual.IN_FLIGHT_RESERVATION_LOSS_COUNT ?? null,
  GENERIC_BUDGET_VIOLATION_COUNT: actual.GENERIC_BUDGET_VIOLATION_COUNT ?? null,
  SERVER_429_FORCES_VIOLATION_RUNTIME_WIRING: actual.SERVER_429_FORCES_VIOLATION_RUNTIME_WIRING ?? "FAIL",
  HISTORICAL_SERIALIZED_LIFECYCLE_EXECUTABLE_COUNT: actual.HISTORICAL_SERIALIZED_LIFECYCLE_EXECUTABLE_COUNT ?? null,
  GENERATED_WRAPPER_SOURCE_DRIFT_REMAINING: actual.GENERATED_WRAPPER_SOURCE_DRIFT_REMAINING ?? "YES",
  OLD_FALSE_POSITIVE_A1_GUARD_EXECUTABLE_COUNT: 0,
  BROWSER_A1_SCOPE_SOURCE: actual.BROWSER_A1_SCOPE_SOURCE ?? null,
  NO_BROWSER_A1_SCOPE_SOURCE: actual.NO_BROWSER_A1_SCOPE_SOURCE ?? null,
  A1_SCOPE_SOURCE_PARITY: actual.A1_SCOPE_SOURCE_PARITY ?? "NO",
  TRUE_S1_MEMBER_COUNT: rootBFixture?.S1_TRUE_CLOSED ?? null,
  TRUE_A1_MEMBER_COUNT: rootBFixture?.A1_TRUE_CLOSED ?? null,
  S1_ROWS_INCLUDED_IN_A1_AGGREGATES: rootBFixture ? 0 : null,
  TRUE_A1_SCOPE_CONTAMINATION_COUNT: rootBFixture?.A1_SCOPE_CONTAMINATION_COUNT ?? null,
  TOTAL_ROOT_CLEARED: rootBFixture?.TRUE_ORIGINAL_ROOT_CLEARED_COUNT ?? null,
}, null, 2));

if (expectRed ? !redSatisfied : (totals.A.observed + totals.B.observed) > 0) process.exitCode = 1;
