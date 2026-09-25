/*
 * Focused, harness-only regression contract for ROOM /room/shifts route
 * readiness.  It models current DOM semantics rather than an invented <main>
 * landmark: the real panel mounts a ROOM shifts container and its tab surface.
 */
import assert from "node:assert/strict";

const readinessModule = "./lib/pre_18_room_prehit_246_migration_v1.mjs";
const authModule = "./lib/pre_18_authenticated_role_context.mjs";
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

async function readiness() { return import(readinessModule); }
async function auth() { return import(authModule); }

function routeObservation(overrides = {}) {
  return {
    requestedRoute: "/room/shifts",
    observedRoute: "/room/shifts",
    shellMounted: true,
    routeContentMounted: true,
    routeMarkerPresent: true,
    bodyText: "Vardiya Özeti Bekleyen Talepler",
    ...overrides,
  };
}

test("RED-SHIFTS-1 current shifts content is ready without a main landmark", async () => {
  const lib = await readiness();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/shifts");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, {
    roomShiftsContainerPresent: true,
    roomShiftsTabSurfacePresent: true,
    genericMarkerPresent: false,
  });
  const result = lib.evaluatePositiveRouteReadiness(routeObservation({
    routeContentMounted: present,
    routeMarkerPresent: present,
  }));
  assert.equal(marker.id, "ROOM_SHIFTS_CURRENT_CONTENT");
  assert.equal(present, true);
  assert.equal(result.ready, true);
});

test("RED-SHIFTS-2 a ROOM shell on another route is not shifts readiness", async () => {
  const lib = await readiness();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/shifts");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, {
    roomShiftsContainerPresent: true,
    roomShiftsTabSurfacePresent: true,
  });
  const result = lib.evaluatePositiveRouteReadiness(routeObservation({
    observedRoute: "/room/offers",
    routeContentMounted: present,
    routeMarkerPresent: present,
  }));
  assert.equal(result.ready, false);
  assert.equal(result.reason, "ROUTE_SHELL_NOT_READY");
});

test("RED-SHIFTS-3 blocking loading prevents shifts readiness", async () => {
  const lib = await readiness();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/shifts");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, {
    roomShiftsContainerPresent: true,
    roomShiftsTabSurfacePresent: true,
  });
  const result = lib.evaluatePositiveRouteReadiness(routeObservation({
    routeContentMounted: present,
    routeMarkerPresent: present,
    bodyText: "Yükleniyor...",
  }));
  assert.equal(result.ready, false);
  assert.equal(result.reason, "BLOCKING_LOADING_FALLBACK_ACTIVE");
});

test("RED-SHIFTS-4 the generic shell cannot replace route-specific shifts content", async () => {
  const lib = await readiness();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/shifts");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, {
    roomShiftsContainerPresent: false,
    roomShiftsTabSurfacePresent: false,
    genericMarkerPresent: true,
  });
  const result = lib.evaluatePositiveRouteReadiness(routeObservation({
    routeContentMounted: present,
    routeMarkerPresent: present,
  }));
  assert.equal(present, false);
  assert.equal(result.ready, false);
  assert.equal(result.reason, "ROUTE_CONTENT_NOT_READY");
});

test("RED-SHIFTS-5 existing ROOM home marker remains route-ready", async () => {
  const lib = await readiness();
  const marker = lib.resolveRoomRouteReadinessMarker("/room");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, { genericMarkerPresent: true });
  const result = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room", observedRoute: "/room", shellMounted: true,
    routeContentMounted: present, routeMarkerPresent: present, bodyText: "Operasyon",
  });
  assert.equal(marker.id, "ROOM_HOME");
  assert.equal(result.ready, true);
});

test("RED-SHIFTS-6 financial operations marker remains route-ready", async () => {
  const lib = await readiness();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/financial-operations");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, { genericMarkerPresent: true });
  const result = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room/financial-operations", observedRoute: "/room/financial-operations", shellMounted: true,
    routeContentMounted: present, routeMarkerPresent: present, bodyText: "Finansal operasyon",
  });
  assert.equal(marker.id, "ROOM_FINANCIAL_OPERATIONS");
  assert.equal(result.ready, true);
});

test("GREEN-MAP-1 current ROOM map route requires its map surface and exact heading", async () => {
  const lib = await readiness();
  const marker = lib.resolveRoomRouteReadinessMarker("/room/map");
  const present = lib.evaluateRoomRouteMarkerPresence(marker, {
    requiredSelectorsPresent: true,
    requiredSemanticEvidencePresent: true,
  });
  const result = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room/map", observedRoute: "/room/map", shellMounted: true,
    routeContentMounted: present, routeMarkerPresent: present, bodyText: "Taşımacılık Firması Canlı Takip",
  });
  assert.equal(marker.id, "ROOM_MAP_CURRENT_CONTENT");
  assert.equal(present, true);
  assert.equal(result.ready, true);
});

test("RED-SHIFTS-7 auth lifecycle remains a separate gate", async () => {
  const lib = await auth();
  assert.equal(lib.mayStartContractRouteReadiness({
    expectedRole: "ROOM", tokenPresent: true, authRequestStarted: true,
    authResponse: { status: 200, role: "ROOM", tenantScopeProven: true },
    clientSessionHydrated: false, roomShellRendered: false, sessionLoadingVisible: true,
  }), false);
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
  PRE_18_ROOM_SHIFTS_ROUTE_READINESS_CHECK: failures ? "RED" : "PASS",
  SHIFTS_RED_TEST_COUNT: cases.length,
  SHIFTS_RED_OBSERVED_COUNT: failures,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
}, null, 2));
if (failures) process.exitCode = 1;
