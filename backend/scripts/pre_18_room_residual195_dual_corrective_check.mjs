/*
 * Harness-only RED/GREEN contract for the two independent ROOM residual roots.
 * It intentionally models worker lifecycle and route readiness descriptors;
 * it never launches Chromium, authenticates, or changes product state.
 */
import assert from "node:assert/strict";

const workerModule = "./lib/pre_18_room_worker_pool.mjs";
const routeModule = "./lib/pre_18_room_prehit_246_migration_v1.mjs";
const cases = [];
function test(group, name, fn) { cases.push({ group, name, fn }); }

async function workers() { return import(workerModule); }
async function routes() { return import(routeModule); }

const contracts = Array.from({ length: 246 }, (_, index) => ({
  ACTION_CONTRACT_ID: `room-residual-${String(index + 1).padStart(3, "0")}`,
  ROLE: "ROOM",
  TENANT_KEY: "room:17",
  ROUTE: index < 99 ? "/room/offers" : "/room",
}));

function readyRoute(route, marker, markerObservation = {}) {
  return {
    requestedRoute: route,
    observedRoute: route,
    shellMounted: true,
    routeContentMounted: true,
    routeMarkerPresent: true,
    routeMarkerDefined: marker?.kind !== "UNDEFINED",
    bodyText: "Hazır",
    ...markerObservation,
  };
}

// AUTH-RED-1..15
test("AUTH", "RED-1 246 contracts do not create 246 authenticated contexts", async () => {
  const lib = await workers();
  const plan = lib.createRoomWorkerPoolPlan({ contracts, maxWorkers: 6, role: "ROOM", tenantKey: "room:17" });
  assert.equal(plan.accounting.AUTHENTICATED_CONTEXT_COUNT, 6);
  assert.notEqual(plan.accounting.AUTHENTICATED_CONTEXT_COUNT, 246);
});

test("AUTH", "RED-2 worker count is capped at six", async () => {
  const lib = await workers();
  assert.throws(() => lib.createRoomWorkerPoolPlan({ contracts, maxWorkers: 7, role: "ROOM", tenantKey: "room:17" }), /WORKER_COUNT_MAX_EXCEEDED/);
});

test("AUTH", "RED-3 one legitimate login is modeled per run", async () => {
  const lib = await workers();
  const plan = lib.createRoomWorkerPoolPlan({ contracts, maxWorkers: 6, role: "ROOM", tenantKey: "room:17" });
  assert.equal(plan.accounting.LOGIN_COUNT_PER_RUN, 1);
});

test("AUTH", "RED-4 real api/me proofs are bounded by worker count", async () => {
  const lib = await workers();
  const plan = lib.createRoomWorkerPoolPlan({ contracts, maxWorkers: 6, role: "ROOM", tenantKey: "room:17" });
  assert.ok(plan.accounting.EXPECTED_MAX_API_ME_PROOFS <= plan.accounting.WORKER_COUNT);
});

test("AUTH", "RED-5 every contract is assigned exactly once", async () => {
  const lib = await workers();
  const plan = lib.createRoomWorkerPoolPlan({ contracts, maxWorkers: 6, role: "ROOM", tenantKey: "room:17" });
  assert.deepEqual(plan.accounting, {
    WORKER_COUNT: 6,
    WORKER_COUNT_MAX: 6,
    LOGIN_COUNT_PER_RUN: 1,
    AUTHENTICATED_CONTEXT_COUNT: 6,
    EXPECTED_MAX_API_ME_PROOFS: 6,
    CONTRACT_ASSIGNMENT_COUNT: 246,
    CONTRACT_ASSIGNMENT_DUPLICATE_COUNT: 0,
    CONTRACT_ASSIGNMENT_MISSING_COUNT: 0,
    CROSS_ROLE_CONTEXT_REUSE_COUNT: 0,
    CROSS_TENANT_CONTEXT_REUSE_COUNT: 0,
    TOKEN_ARTIFACT_PERSISTENCE_COUNT: 0,
    SUPPORTED_REPLAY_WORKER_CONCURRENCY: 6,
  });
});

test("AUTH", "RED-6 each worker processes its deterministic queue sequentially", async () => {
  const lib = await workers();
  const plan = lib.createRoomWorkerPoolPlan({ contracts, maxWorkers: 6, role: "ROOM", tenantKey: "room:17" });
  for (const worker of plan.workers) assert.equal(worker.EXECUTION_MODE, "SEQUENTIAL");
});

test("AUTH", "RED-7 worker reset must complete before next assignment", async () => {
  const lib = await workers();
  const result = lib.evaluateRoomWorkerReset({
    role: "ROOM", tenantKey: "room:17", expectedRole: "ROOM", expectedTenantKey: "room:17",
    route: "/room", modalOpen: false, drawerOpen: false, popoverOpen: false,
    detailsOpen: false, filterActive: false, temporaryInputPresent: false,
    transientAssistantOpen: false, scrollAtOrigin: true,
  });
  assert.deepEqual(result, { ready: true, reason: "ROOM_WORKER_RESET_COMPLETE" });
});

test("AUTH", "RED-8 worker reset preserves ROOM authentication identity", async () => {
  const lib = await workers();
  const result = lib.evaluateRoomWorkerReset({ role: "ROOM", tenantKey: "room:17", expectedRole: "ROOM", expectedTenantKey: "room:17", route: "/room" });
  assert.notEqual(result.reason, "WORKER_ROLE_IDENTITY_LOST");
});

test("AUTH", "RED-9 worker reset preserves tenant identity", async () => {
  const lib = await workers();
  const result = lib.evaluateRoomWorkerReset({ role: "ROOM", tenantKey: "room:17", expectedRole: "ROOM", expectedTenantKey: "room:17", route: "/room" });
  assert.notEqual(result.reason, "WORKER_TENANT_IDENTITY_LOST");
});

test("AUTH", "RED-10 transient UI cannot leak across assignments", async () => {
  const lib = await workers();
  const result = lib.evaluateRoomWorkerReset({
    role: "ROOM", tenantKey: "room:17", expectedRole: "ROOM", expectedTenantKey: "room:17", route: "/room",
    modalOpen: true, drawerOpen: false, popoverOpen: false, detailsOpen: false,
    filterActive: false, temporaryInputPresent: false, transientAssistantOpen: false, scrollAtOrigin: true,
  });
  assert.deepEqual(result, { ready: false, reason: "WORKER_TRANSIENT_STATE_REMAINS" });
});

test("AUTH", "RED-11 worker role reuse is rejected", async () => {
  const lib = await workers();
  const result = lib.assertRoomWorkerIdentity({ role: "ROOM", tenantKey: "room:17" }, { role: "SUPER_ADMIN", tenantKey: "room:17" });
  assert.deepEqual(result, { ok: false, reason: "WORKER_ROLE_REUSE_FORBIDDEN" });
});

test("AUTH", "RED-12 worker tenant reuse is rejected", async () => {
  const lib = await workers();
  const result = lib.assertRoomWorkerIdentity({ role: "ROOM", tenantKey: "room:17" }, { role: "ROOM", tenantKey: "room:18" });
  assert.deepEqual(result, { ok: false, reason: "WORKER_TENANT_REUSE_FORBIDDEN" });
});

test("AUTH", "RED-13 worker artifact is secret-safe", async () => {
  const lib = await workers();
  const artifact = lib.toSafeRoomWorkerArtifact({ WORKER_ID: "ROOM-W1", ROLE: "ROOM", TENANT_KEY: "room:17", token: "must-not-leak", secret: "must-not-leak" });
  assert.equal(JSON.stringify(artifact).includes("must-not-leak"), false);
  assert.deepEqual(artifact, { WORKER_ID: "ROOM-W1", ROLE: "ROOM", TENANT_SCOPE_PROVEN: true, AUTH_PROOF_REQUIRED: true });
});

test("AUTH", "RED-14 worker plan does not modify product rate-limit policy", async () => {
  const lib = await workers();
  assert.deepEqual(lib.assertRateLimitPolicyInvariant({ max: 120, windowMs: 60_000, localhostBypass: false, testBypass: false }), {
    ok: true, reason: "RATE_LIMIT_POLICY_UNCHANGED",
  });
});

test("AUTH", "RED-15 supported replay concurrency remains six", async () => {
  const lib = await workers();
  assert.equal(lib.ROOM_WORKER_CONCURRENCY_MAX, 6);
});

// ROUTE-RED-1..12
test("ROUTE", "RED-1 commercial flow is ready without main when its semantic descriptor is present", async () => {
  const lib = await routes();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/commercial-flow");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, { requiredSelectorsPresent: true, requiredSemanticEvidencePresent: true, genericMarkerPresent: false });
  assert.equal(marker.id, "ROOM_COMMERCIAL_FLOW");
  assert.equal(present, true);
  assert.deepEqual(lib.evaluatePositiveRouteReadiness(readyRoute("/room/commercial-flow", marker, { routeContentMounted: present, routeMarkerPresent: present })), { ready: true, reason: "READY" });
});

test("ROUTE", "RED-2 offers is ready without main when its semantic descriptor is present", async () => {
  const lib = await routes();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/offers");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, { requiredSelectorsPresent: true, requiredSemanticEvidencePresent: true, genericMarkerPresent: false });
  assert.equal(marker.id, "ROOM_OFFERS");
  assert.equal(present, true);
});

test("ROUTE", "RED-3 agreements is ready without main when its semantic descriptor is present", async () => {
  const lib = await routes();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/agreements");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, { requiredSelectorsPresent: true, requiredSemanticEvidencePresent: true, genericMarkerPresent: false });
  assert.equal(marker.id, "ROOM_AGREEMENTS");
  assert.equal(present, true);
});

test("ROUTE", "RED-4 wrong panel remains not ready", async () => {
  const lib = await routes();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/offers");
  assert.deepEqual(lib.evaluatePositiveRouteReadiness(readyRoute("/room/offers", marker, { routeContentMounted: false, routeMarkerPresent: false })), { ready: false, reason: "ROUTE_CONTENT_NOT_READY" });
});

test("ROUTE", "RED-5 blocking loading overrides a correct marker", async () => {
  const lib = await routes();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/offers");
  assert.deepEqual(lib.evaluatePositiveRouteReadiness(readyRoute("/room/offers", marker, { bodyText: "Yükleniyor..." })), { ready: false, reason: "BLOCKING_LOADING_FALLBACK_ACTIVE" });
});

test("ROUTE", "RED-6 known ROOM namespace route without a descriptor is explicit undefined", async () => {
  const lib = await routes();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/future-unregistered-surface");
  assert.equal(marker.kind, "UNDEFINED");
  assert.deepEqual(lib.evaluatePositiveRouteReadiness(readyRoute("/room/future-unregistered-surface", marker, { routeMarkerDefined: false, routeContentMounted: false, routeMarkerPresent: false })), { ready: false, reason: "ROUTE_MARKER_UNDEFINED" });
});

test("ROUTE", "RED-7 known ROOM routes never use generic main authority", async () => {
  const lib = await routes();
  assert.equal(lib.countKnownRoomRouteGenericMainAuthorities(), 0);
});

test("ROUTE", "RED-8 ROOM home marker is preserved", async () => {
  const lib = await routes();
  assert.equal(lib.resolveRoomRouteReadinessMarker("/room").id, "ROOM_HOME");
});

test("ROUTE", "RED-9 financial marker is preserved", async () => {
  const lib = await routes();
  assert.equal(lib.resolveRoomRouteReadinessMarker("/room/financial-operations").id, "ROOM_FINANCIAL_OPERATIONS");
});

test("ROUTE", "RED-10 shifts composite marker is preserved", async () => {
  const lib = await routes();
  assert.equal(lib.resolveRoomRouteReadinessMarker("/room/shifts").id, "ROOM_SHIFTS_CURRENT_CONTENT");
});

test("ROUTE", "RED-11 exact residual 99 IDs map to explicit route markers", async () => {
  const lib = await routes();
  const rows = [
    ...Array.from({ length: 39 }, (_, index) => ({ ACTION_CONTRACT_ID: `commercial-${index}`, ROUTE: "/room/commercial-flow" })),
    ...Array.from({ length: 36 }, (_, index) => ({ ACTION_CONTRACT_ID: `offers-${index}`, ROUTE: "/room/offers" })),
    ...Array.from({ length: 24 }, (_, index) => ({ ACTION_CONTRACT_ID: `agreements-${index}`, ROUTE: "/room/agreements" })),
  ];
  assert.deepEqual(lib.auditRoomRouteMarkerAssignments(rows), {
    TARGET_COUNT: 99,
    COMMERCIAL_FLOW_EXPLICIT_MARKER_COUNT: 39,
    OFFERS_EXPLICIT_MARKER_COUNT: 36,
    AGREEMENTS_EXPLICIT_MARKER_COUNT: 24,
    GENERIC_MAIN_MAPPING_COUNT: 0,
    UNDEFINED_MARKER_COUNT: 0,
  });
});

test("ROUTE", "RED-12 known route marker registry contains no generic main fallback", async () => {
  const lib = await routes();
  assert.equal(lib.listKnownRoomRouteMarkerDescriptors().some((marker) => marker.id === "GENERIC_MAIN"), false);
});

let failures = 0;
const observed = { AUTH: 0, ROUTE: 0 };
const unexpectedPass = { AUTH: 0, ROUTE: 0 };
for (const item of cases) {
  try {
    await item.fn();
    console.log(`PASS ${item.group}-${item.name}`);
    unexpectedPass[item.group] += 1;
  } catch (error) {
    failures += 1;
    observed[item.group] += 1;
    console.log(`RED ${item.group}-${item.name}: ${error.message}`);
  }
}

console.log(JSON.stringify({
  PRE_18_ROOM_RESIDUAL195_DUAL_CORRECTIVE_CHECK: failures ? "RED" : "PASS",
  AUTH_RED_TEST_COUNT: cases.filter((item) => item.group === "AUTH").length,
  AUTH_RED_OBSERVED_COUNT: observed.AUTH,
  AUTH_RED_UNEXPECTED_PASS_COUNT: unexpectedPass.AUTH,
  ROUTE_RED_TEST_COUNT: cases.filter((item) => item.group === "ROUTE").length,
  ROUTE_RED_OBSERVED_COUNT: observed.ROUTE,
  ROUTE_RED_UNEXPECTED_PASS_COUNT: unexpectedPass.ROUTE,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
}, null, 2));
if (failures) process.exitCode = 1;
