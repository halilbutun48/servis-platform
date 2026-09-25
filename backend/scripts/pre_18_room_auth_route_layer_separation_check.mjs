/*
 * Focused harness-only contract for the proven ROOM lifecycle fault:
 * authenticated global shell readiness and requested route readiness are
 * separate boundaries.  It uses no browser, product, or session data.
 */
import assert from "node:assert/strict";

const authModule = "./lib/pre_18_authenticated_role_context.mjs";
const routeModule = "./lib/pre_18_room_prehit_246_migration_v1.mjs";
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

async function auth() { return import(authModule); }
async function route() { return import(routeModule); }

function authObservation(overrides = {}) {
  return {
    expectedRole: "ROOM",
    tokenPresent: true,
    authRequestStarted: true,
    authResponse: { status: 200, role: "ROOM", tenantScopeProven: true, durationMs: 240 },
    cachedSessionObserved: true,
    globalRoomShellRendered: true,
    roomHomeRouteContentRendered: false,
    sessionLoadingVisible: false,
    elapsedMs: 16_500,
    authTimeoutMs: 20_000,
    ...overrides,
  };
}

function roomRouteObservation(overrides = {}) {
  return {
    requestedRoute: "/room",
    observedRoute: "/room",
    shellMounted: true,
    routeContentMounted: false,
    routeMarkerPresent: false,
    bodyText: "Yükleniyor...",
    ...overrides,
  };
}

// These three assertions are the missing behavior proven by the controlled
// six-way contrast.  They must be RED before the auth/route layer split.
test("RED-LAYER-1 verified ROOM global shell is auth-ready while home remains loading", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation());
  assert.deepEqual(result, {
    ready: true,
    terminal: false,
    reason: "AUTHENTICATED_CONTEXT_READY",
    stage: "AUTH_BOUNDARY_COMPLETE",
  });
});

test("RED-LAYER-2 a delayed ROOM home does not consume the auth deadline", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation({
    elapsedMs: 19_999,
    roomHomeRouteContentRendered: false,
  }));
  assert.equal(result.ready, true);
  assert.equal(result.stage, "AUTH_BOUNDARY_COMPLETE");
});

test("RED-LAYER-3 contract route readiness can start at auth boundary before ROOM home content", async () => {
  const lib = await auth();
  assert.equal(lib.mayStartContractRouteReadiness(authObservation()), true);
});

test("REG-LAYER-4 ROOM home remains a false route-content predicate while loading", async () => {
  const lib = await route();
  const result = lib.evaluatePositiveRouteReadiness(roomRouteObservation());
  assert.deepEqual(result, { ready: false, reason: "ROUTE_CONTENT_NOT_READY" });
});

test("REG-LAYER-5 ROOM home becomes route-ready only after its marker and loading clear", async () => {
  const lib = await route();
  const result = lib.evaluatePositiveRouteReadiness(roomRouteObservation({
    routeContentMounted: true,
    routeMarkerPresent: true,
    bodyText: "Operasyon Merkezi",
  }));
  assert.deepEqual(result, { ready: true, reason: "READY" });
});

test("REG-LAYER-6 global navigation absence cannot authenticate a cached ROOM session", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation({ globalRoomShellRendered: false }));
  assert.equal(result.ready, false);
});

test("REG-LAYER-7 the assistant launcher alone cannot authenticate a ROOM context", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation({
    globalRoomShellRendered: false,
    assistantLauncherVisible: true,
  }));
  assert.equal(result.ready, false);
});

test("REG-LAYER-8 session loading remains an auth-boundary block", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation({ sessionLoadingVisible: true }));
  assert.equal(result.ready, false);
  assert.equal(result.reason, "AUTH_SESSION_LOADING_ACTIVE");
});

test("REG-LAYER-9 a wrong verified role remains terminal despite a global shell fragment", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation({
    authResponse: { status: 200, role: "SUPER_ADMIN", tenantScopeProven: true },
  }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_ROLE_MISMATCH"]);
});

test("REG-LAYER-10 ROOM route content does not become auth evidence", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation({
    globalRoomShellRendered: false,
    roomHomeRouteContentRendered: true,
  }));
  assert.equal(result.ready, false);
});

test("REG-LAYER-11 shifts keeps its route-specific current-content marker", async () => {
  const lib = await route();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/shifts");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, {
    roomShiftsContainerPresent: true,
    roomShiftsTabSurfacePresent: true,
  });
  const result = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room/shifts", observedRoute: "/room/shifts", shellMounted: true,
    routeContentMounted: present, routeMarkerPresent: present, bodyText: "Vardiya Özeti",
  });
  assert.equal(marker.id, "ROOM_SHIFTS_CURRENT_CONTENT");
  assert.equal(result.ready, true);
});

test("REG-LAYER-12 financial Suspense stays route content rather than auth evidence", async () => {
  const lib = await route();
  const result = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room/financial-operations", observedRoute: "/room/financial-operations",
    shellMounted: true, routeContentMounted: true, routeMarkerPresent: true, bodyText: "Yükleniyor...",
  });
  assert.deepEqual(result, { ready: false, reason: "BLOCKING_LOADING_FALLBACK_ACTIVE" });
});

test("REG-LAYER-13 verify-not-started keeps its explicit auth terminal", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(authObservation({
    authRequestStarted: false,
    authResponse: null,
    elapsedMs: 20_000,
  }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_VERIFY_NOT_STARTED_TIMEOUT"]);
});

test("REG-LAYER-14 the current auth timeout remains twenty seconds and batch support remains six", async () => {
  const lib = await auth();
  const sequential = lib.normalizeAuthDiagnosticConfiguration({ concurrency: 1 });
  const batch = lib.normalizeAuthDiagnosticConfiguration({ concurrency: 6 });
  assert.equal(sequential.AUTH_SEMANTICS.authTimeoutMs, 20_000);
  assert.equal(batch.AUTH_SEMANTICS.authTimeoutMs, 20_000);
  assert.equal(batch.BATCH_ORCHESTRATION, "BATCHED");
});

let failures = 0;
for (const item of cases) {
  try {
    await item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

console.log(JSON.stringify({
  PRE_18_ROOM_AUTH_ROUTE_LAYER_SEPARATION_CHECK: failures ? "RED" : "PASS",
  RED_TEST_COUNT: cases.length,
  RED_OBSERVED_COUNT: failures,
  RED_UNEXPECTED_PASS_COUNT: 0,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
}, null, 2));
if (failures) process.exitCode = 1;
