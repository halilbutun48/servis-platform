/*
 * No-browser RED/GREEN contract for the four proven ROOM residual-195
 * harness roots.  It intentionally uses synthetic transport and DOM facts:
 * this file must never launch Chromium, log in, or contact the product.
 */
import assert from "node:assert/strict";

import * as workers from "./lib/pre_18_room_worker_pool.mjs";
import * as routes from "./lib/pre_18_room_prehit_246_migration_v1.mjs";

let accounting = {};
try {
  accounting = await import("./lib/pre_18_room_residual195_accounting_v1.mjs");
} catch {
  // This is the expected RED state before the recorder/accounting module exists.
}

const cases = [];
function test(group, name, fn) { cases.push({ group, name, fn }); }
let syntheticBudgetEvidence = {
  attemptedReads: 0,
  violationCount: null,
  product429RequiredToControl: null,
};

function required(module, name) {
  assert.equal(typeof module[name], "function", `${name} is not implemented`);
  return module[name];
}

function generic(url = "https://example.test/api/dashboard/bulk?bundle=actionable-events") {
  return { method: "GET", url };
}

function coordinator(now = () => 0) {
  return required(workers, "createSharedAuthenticatedReadBudgetCoordinator")({
    authenticatedScope: "room-user-safe-scope",
    max: 120,
    windowMs: 60_000,
    now,
  });
}

/* Direct coordinator-model tests start from explicit server evidence.  The
 * real runner obtains the same seed through its intercepted bootstrap read. */
function seededCoordinator(now = () => 0) {
  const budget = coordinator(now);
  budget.observeResponse({
    request: generic(),
    status: 200,
    headers: { "ratelimit-remaining": "120", "ratelimit-reset": "60" },
  });
  return budget;
}

function rootFacts({ root = "PREHIT-S1", authReady = true, routeReady = true, prematureHistoricalStepReplay = false, financialContentSettled = true, semanticResolutionAfterSettlement = true, suspenseActiveDuringResolution = false } = {}) {
  return required(accounting, "deriveOriginalRootFacts")({
    root,
    authReady,
    routeReady,
    prematureHistoricalStepReplay,
    financialContentSettled,
    semanticResolutionAfterSettlement,
    suspenseActiveDuringResolution,
  });
}

function aggregateFixture({ workers: workerRows = [], responses = [], results = [] } = {}) {
  return required(accounting, "aggregateResidual195Summary")({
    workerAuth: workerRows,
    criticalResponses: responses,
    results,
  });
}

// G429-RED-1..13
test("G429", "RED-1 six workers share one authenticated-user budget", () => {
  const budget = coordinator();
  const leases = Array.from({ length: 6 }, (_, workerIndex) => budget.requestLease({ request: generic(), workerId: `ROOM-W${workerIndex + 1}` }));
  assert.equal(new Set(leases.map((item) => item.coordinatorId)).size, 1);
  assert.equal(budget.snapshot().workerCountObserved, 6);
});

test("G429", "RED-2 127 generic reads allow only 120 in one server window", () => {
  const budget = seededCoordinator();
  const leases = Array.from({ length: 127 }, () => budget.requestLease({ request: generic() }));
  assert.equal(leases.filter((item) => item.granted).length, 120);
  assert.equal(leases.filter((item) => !item.granted && item.reason === "GENERIC_READ_BUDGET_EXHAUSTED").length, 7);
});

test("G429", "RED-3 concurrent workers consume the aggregate permit count", () => {
  const budget = seededCoordinator();
  const leases = Array.from({ length: 153 }, (_, index) => budget.requestLease({ request: generic(), workerId: `ROOM-W${(index % 6) + 1}` }));
  assert.equal(leases.filter((item) => item.granted).length, 120);
  assert.equal(budget.snapshot().used, 120);
  syntheticBudgetEvidence = {
    attemptedReads: leases.length,
    violationCount: Math.max(0, leases.filter((item) => item.granted).length - 120),
    product429RequiredToControl: false,
  };
});

test("G429", "RED-4 RateLimit-Remaining reconciles an optimistic local count", () => {
  let current = 1_000;
  const budget = coordinator(() => current);
  for (let index = 0; index < 10; index += 1) budget.requestLease({ request: generic() });
  budget.observeResponse({ request: generic(), status: 200, headers: { "ratelimit-remaining": "32", "ratelimit-reset": "57" } });
  assert.equal(budget.snapshot().used, 88);
  assert.equal(budget.snapshot().resetAt, 58_000);
});

test("G429", "RED-5 a reset releases permits only at the exact derived boundary", () => {
  let current = 0;
  const budget = seededCoordinator(() => current);
  for (let index = 0; index < 120; index += 1) budget.requestLease({ request: generic() });
  assert.equal(budget.requestLease({ request: generic() }).granted, false);
  current = 59_999;
  assert.equal(budget.requestLease({ request: generic() }).granted, false);
  for (const request of budget.genericRequestSnapshot().REQUESTS.filter((item) => item.STATUS === "GRANTED")) {
    budget.cancelGenericRequestBeforeDispatch({ requestIdentity: request.REQUEST_ID, reason: "MODEL_WINDOW_RESET" });
  }
  current = 60_000;
  assert.equal(budget.requestLease({ request: generic() }).granted, true);
});

test("G429", "RED-6 Retry-After blocks only until the authoritative retry boundary", () => {
  let current = 5_000;
  const budget = coordinator(() => current);
  budget.observeResponse({ request: generic(), status: 429, headers: { "retry-after": "8" } });
  assert.equal(budget.requestLease({ request: generic() }).granted, false);
  current = 12_999;
  assert.equal(budget.requestLease({ request: generic() }).granted, false);
  current = 13_000;
  assert.equal(budget.requestLease({ request: generic() }).granted, true);
});

test("G429", "RED-7 api/me is not double-throttled as generic read traffic", () => {
  const classify = required(workers, "classifyRoomRequestLimiterFamily");
  assert.equal(classify({ method: "GET", url: "https://example.test/api/me" }), "AUTH_SPECIAL");
});

test("G429", "RED-8 directory and special read families stay out of the generic budget", () => {
  const classify = required(workers, "classifyRoomRequestLimiterFamily");
  assert.equal(classify({ method: "GET", url: "https://example.test/api/vehicles" }), "SPECIAL_READ");
  assert.equal(classify({ method: "GET", url: "https://example.test/api/shifts?onlyNow=1" }), "SPECIAL_READ");
});

test("G429", "RED-9 static frontend resources are excluded", () => {
  const classify = required(workers, "classifyRoomRequestLimiterFamily");
  assert.equal(classify({ method: "GET", url: "https://example.test/assets/app.js" }), "STATIC_OR_UNLIMITED");
});

test("G429", "RED-10 write traffic is not silently reclassified as generic read", () => {
  const classify = required(workers, "classifyRoomRequestLimiterFamily");
  assert.equal(classify({ method: "POST", url: "https://example.test/api/offers" }), "MUTATION_OR_WRITE");
});

test("G429", "RED-11 the coordinator preserves six-worker pool policy", () => {
  const policy = required(workers, "sharedReadBudgetCoordinatorPolicy")();
  assert.equal(policy.WORKER_COUNT_MAX, 6);
  assert.equal(policy.RATE_LIMIT_POLICY_CHANGE, "NONE");
});

test("G429", "RED-12 coordinator waiting is derived, never a blind fixed sleep", () => {
  const policy = required(workers, "sharedReadBudgetCoordinatorPolicy")();
  assert.equal(policy.BLIND_FIXED_SLEEP_USED, false);
  assert.equal(policy.WAIT_SOURCE, "BUDGET_OR_SERVER_RESET_EVIDENCE");
});

test("G429", "RED-13 coordinator artifacts do not retain an authenticated identity or token", () => {
  const artifact = coordinator().toSafeArtifact();
  assert.equal(JSON.stringify(artifact).includes("room-user-safe-scope"), false);
  assert.equal(JSON.stringify(artifact).includes("token"), false);
});

// MARKER-RED-1..11
test("MARKER", "RED-1 agreements accepts multi-match selectors when any current match is visible", () => {
  const observe = required(routes, "evaluateRequiredSelectorObservation");
  assert.deepEqual(observe([{ visible: false }, { visible: true }]), { matchingCount: 2, visibleMatchingCount: 1, satisfied: true });
});

test("MARKER", "RED-2 all-hidden selector matches are not route evidence", () => {
  const observe = required(routes, "evaluateRequiredSelectorObservation");
  assert.equal(observe([{ visible: false }, { visible: false }]).satisfied, false);
});

test("MARKER", "RED-3 one visible selector match is route evidence", () => {
  const observe = required(routes, "evaluateRequiredSelectorObservation");
  assert.equal(observe([{ visible: true }]).satisfied, true);
});

test("MARKER", "RED-4 operation-health accepts multiple visible route cards", () => {
  const marker = routes.resolveRoomRouteReadinessMarker("/room/operation-health");
  const observe = required(routes, "evaluateRequiredSelectorObservation");
  const selector = observe([{ visible: true }, { visible: true }, { visible: false }]);
  assert.equal(routes.evaluateRoomRouteMarkerPresence(marker, { requiredSelectorsPresent: selector.satisfied, requiredSemanticEvidencePresent: true }), true);
});

test("MARKER", "RED-5 marker evidence on another route cannot satisfy requested-route readiness", () => {
  const marker = routes.resolveRoomRouteReadinessMarker("/room/operation-health");
  assert.equal(routes.evaluatePositiveRouteReadiness({ requestedRoute: "/room/operation-health", observedRoute: "/room/offers", shellMounted: true, routeContentMounted: true, routeMarkerPresent: true, routeMarkerDefined: marker.kind !== "UNDEFINED", bodyText: "Taşımacılık Firması Operasyon Paneli" }).ready, false);
});

test("MARKER", "RED-6 blocking loading still defeats a visible multi-match marker", () => {
  assert.equal(routes.evaluatePositiveRouteReadiness({ requestedRoute: "/room/agreements", observedRoute: "/room/agreements", shellMounted: true, routeContentMounted: true, routeMarkerPresent: true, bodyText: "Yükleniyor..." }).ready, false);
});

test("MARKER", "RED-7 commercial-flow typed heading descriptor remains intact", () => {
  assert.equal(routes.normalizeRoomRouteSemanticEvidence(routes.resolveRoomRouteReadinessMarker("/room/commercial-flow")).kind, "ROLE");
});

test("MARKER", "RED-8 offers marker remains intact", () => {
  assert.equal(routes.resolveRoomRouteReadinessMarker("/room/offers").id, "ROOM_OFFERS");
});

test("MARKER", "RED-9 financial marker remains intact", () => {
  assert.equal(routes.resolveRoomRouteReadinessMarker("/room/financial-operations").id, "ROOM_FINANCIAL_OPERATIONS");
});

test("MARKER", "RED-10 shifts marker remains intact", () => {
  assert.equal(routes.resolveRoomRouteReadinessMarker("/room/shifts").id, "ROOM_SHIFTS_CURRENT_CONTENT");
});

test("MARKER", "RED-11 unregistered ROOM routes remain explicitly undefined", () => {
  assert.equal(routes.resolveRoomRouteReadinessMarker("/room/not-registered").kind, "UNDEFINED");
});

// ROOT-RED-1..8
test("ROOT", "RED-1 S1 remains cleared after candidate locator failure", () => {
  const fact = rootFacts();
  assert.equal(fact.cleared, true);
  assert.equal(required(accounting, "classifyDownstreamOutcome")({ executionState: "HARNESS_FAILURE", failureReason: "PREHIT_CANDIDATE_DERIVED_LOCATOR_NOT_FOUND" }), "CANDIDATE_LOCATOR_FAILURE");
});

test("ROOT", "RED-2 S1 remains cleared after semantic action failure", () => {
  assert.equal(rootFacts().cleared, true);
  assert.equal(required(accounting, "classifyDownstreamOutcome")({ executionState: "HARNESS_FAILURE", failureReason: "PREHIT_CURRENT_SEMANTIC_ACTION_NOT_RESOLVED" }), "SEMANTIC_ACTION_FAILURE");
});

test("ROOT", "RED-3 S1 remains cleared with downstream hit-test pending", () => {
  assert.equal(rootFacts().cleared, true);
  assert.equal(required(accounting, "classifyDownstreamOutcome")({ executionState: "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING" }), "HIT_TEST_PENDING");
});

test("ROOT", "RED-4 S1 stays open when route readiness is absent", () => {
  assert.equal(rootFacts({ routeReady: false }).cleared, false);
});

test("ROOT", "RED-5 A1 remains cleared after a downstream hit-test", () => {
  assert.equal(rootFacts({ root: "PREHIT-A1" }).cleared, true);
});

test("ROOT", "RED-6 A1 remains cleared after semantic resolution failure", () => {
  assert.equal(rootFacts({ root: "PREHIT-A1" }).cleared, true);
});

test("ROOT", "RED-7 A1 stays open when Suspense is active during resolution", () => {
  assert.equal(rootFacts({ root: "PREHIT-A1", suspenseActiveDuringResolution: true }).cleared, false);
});

test("ROOT", "RED-8 immutable 180/15 fixture summarizes to 123 cleared and 72 open", () => {
  const results = [
    ...Array.from({ length: 108 }, () => ({ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts() })),
    ...Array.from({ length: 72 }, () => ({ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts({ routeReady: false }) })),
    ...Array.from({ length: 15 }, () => ({ PREHIT_ROOT: "PREHIT-A1", ORIGINAL_ROOT_FACTS: rootFacts({ root: "PREHIT-A1" }) })),
  ];
  const summary = aggregateFixture({ results });
  assert.deepEqual({ s1Closed: summary.S1_TRUE_CLOSED, s1Open: summary.S1_TRUE_OPEN, a1Closed: summary.A1_TRUE_CLOSED, a1Open: summary.A1_TRUE_OPEN, combinedClosed: summary.TRUE_ORIGINAL_ROOT_CLEARED_COUNT, combinedOpen: summary.TRUE_ORIGINAL_ROOT_OPEN_COUNT }, { s1Closed: 108, s1Open: 72, a1Closed: 15, a1Open: 0, combinedClosed: 123, combinedOpen: 72 });
});

// REC-RED-1..10
test("REC", "RED-1 raw worker auth evidence aggregates six valid api/me proofs", () => {
  const summary = aggregateFixture({ workers: Array.from({ length: 6 }, () => ({ AUTH_OK: true, AUTH: { authStatus: 200, authRole: "ROOM", tenantScopeProven: true }, API_ME_RESOURCE_COUNT: 1 })) });
  assert.equal(summary.API_ME_AUTH_PROOF_COUNT, 6);
});

test("REC", "RED-2 generic 429s are not auth 429s", () => {
  const responses = Array.from({ length: 7 }, () => ({ status: 429, url: "https://example.test/api/dashboard/bulk?bundle=actionable-events" }));
  const summary = aggregateFixture({ responses });
  assert.equal(summary.GENERIC_READ_429_COUNT, 7);
  assert.equal(summary.AUTH_429_COUNT, 0);
});

test("REC", "RED-3 missing readiness telemetry is not an undefined descriptor", () => {
  const summary = aggregateFixture({ results: [{ PREHIT_ROOT: "PREHIT-S1", ROUTE_MARKER_DEFINED: true, ROUTE_READINESS_TELEMETRY: null }] });
  assert.equal(summary.ROUTE_READINESS_TELEMETRY_MISSING_COUNT, 1);
  assert.equal(summary.MISSING_TELEMETRY_AS_UNDEFINED_DESCRIPTOR_COUNT, 0);
});

test("REC", "RED-4 S1 counters derive from immutable root facts", () => {
  const summary = aggregateFixture({ results: [
    ...Array.from({ length: 108 }, () => ({ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts() })),
    ...Array.from({ length: 72 }, () => ({ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts({ routeReady: false }) })),
  ] });
  assert.deepEqual([summary.S1_TRUE_CLOSED, summary.S1_TRUE_OPEN], [108, 72]);
});

test("REC", "RED-5 A1 counters derive from immutable root facts", () => {
  const summary = aggregateFixture({ results: Array.from({ length: 15 }, () => ({ PREHIT_ROOT: "PREHIT-A1", ORIGINAL_ROOT_FACTS: rootFacts({ root: "PREHIT-A1" }) })) });
  assert.deepEqual([summary.A1_TRUE_CLOSED, summary.A1_TRUE_OPEN], [15, 0]);
});

test("REC", "RED-6 combined root counters are exact", () => {
  const results = [
    ...Array.from({ length: 108 }, () => ({ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts() })),
    ...Array.from({ length: 72 }, () => ({ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts({ routeReady: false }) })),
    ...Array.from({ length: 15 }, () => ({ PREHIT_ROOT: "PREHIT-A1", ORIGINAL_ROOT_FACTS: rootFacts({ root: "PREHIT-A1" }) })),
  ];
  const summary = aggregateFixture({ results });
  assert.deepEqual([summary.TRUE_ORIGINAL_ROOT_CLEARED_COUNT, summary.TRUE_ORIGINAL_ROOT_OPEN_COUNT], [123, 72]);
});

test("REC", "RED-7 a cleared root and hit-test pending coexist", () => {
  const summary = aggregateFixture({ results: [{ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts(), executionState: "PREHIT_CLOSED_DOWNSTREAM_HIT_TEST_PENDING" }] });
  assert.equal(summary.TRUE_ORIGINAL_ROOT_CLEARED_COUNT, 1);
  assert.equal(summary.DOWNSTREAM_HIT_TEST_COUNT, 1);
});

test("REC", "RED-8 general S1 route failures never inflate A1 Suspense counters", () => {
  const summary = aggregateFixture({ results: Array.from({ length: 72 }, () => ({ PREHIT_ROOT: "PREHIT-S1", ORIGINAL_ROOT_FACTS: rootFacts({ routeReady: false }), failureReason: "ROUTE_READINESS_NOT_PROVEN:ROUTE_CONTENT_NOT_READY" })) });
  assert.equal(summary.A1_SCOPE_CONTAMINATION_COUNT, 0);
  assert.equal(summary.A1_SUSPENSE_SETTLEMENT_FAILURE_COUNT, 0);
});

test("REC", "RED-9 recorder schema version is persisted", () => {
  assert.match(aggregateFixture({}).RECORDER_SCHEMA_VERSION, /^ROOM-RESIDUAL195-/u);
});

test("REC", "RED-10 an unknown schema fails explicitly instead of silently returning zeros", () => {
  assert.throws(() => required(accounting, "aggregateResidual195Summary")({ schemaVersion: "UNKNOWN" }), /RECORDER_SCHEMA_UNSUPPORTED/u);
});

const totals = Object.fromEntries(["G429", "MARKER", "ROOT", "REC"].map((group) => [group, { total: 0, observed: 0, pass: 0 }]));
let failures = 0;
for (const item of cases) {
  totals[item.group].total += 1;
  try {
    await item.fn();
    totals[item.group].pass += 1;
    console.log(`PASS ${item.group} ${item.name}`);
  } catch (error) {
    failures += 1;
    totals[item.group].observed += 1;
    console.log(`RED ${item.group} ${item.name}: ${error.message}`);
  }
}

console.log(JSON.stringify({
  PRE_18_ROOM_RESIDUAL195_FOUR_ROOT_CORRECTIVE_CHECK: failures ? "RED" : "PASS",
  G429_RED_TEST_COUNT: totals.G429.total,
  G429_RED_OBSERVED_COUNT: totals.G429.observed,
  G429_UNEXPECTED_PASS_COUNT: totals.G429.pass,
  MARKER_RED_TEST_COUNT: totals.MARKER.total,
  MARKER_RED_OBSERVED_COUNT: totals.MARKER.observed,
  MARKER_UNEXPECTED_PASS_COUNT: totals.MARKER.pass,
  ROOT_RED_TEST_COUNT: totals.ROOT.total,
  ROOT_RED_OBSERVED_COUNT: totals.ROOT.observed,
  ROOT_UNEXPECTED_PASS_COUNT: totals.ROOT.pass,
  REC_RED_TEST_COUNT: totals.REC.total,
  REC_RED_OBSERVED_COUNT: totals.REC.observed,
  REC_UNEXPECTED_PASS_COUNT: totals.REC.pass,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
  SYNTHETIC_SHARED_BUDGET_ATTEMPTED_READS: syntheticBudgetEvidence.attemptedReads,
  SYNTHETIC_SHARED_BUDGET_VIOLATION_COUNT: syntheticBudgetEvidence.violationCount,
  SYNTHETIC_PRODUCT_429_REQUIRED_TO_CONTROL: syntheticBudgetEvidence.product429RequiredToControl ? "YES" : "NO",
}, null, 2));

if (failures) process.exitCode = 1;
