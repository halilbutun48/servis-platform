/*
 * Focused RED/GREEN contract for the ROOM pre-hit 246 migration.
 *
 * The production change that must make these tests fail is removal of
 * positive route readiness, migration-first current-state reconstruction, or
 * identity-preserving reconciliation.  These are harness behaviours, not
 * source-text checks.
 */
import assert from "node:assert/strict";

const migrationModule = "./lib/pre_18_room_prehit_246_migration_v1.mjs";
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

async function migration() {
  return import(migrationModule);
}

function target(index, route = "/room") {
  return {
    ACTION_CONTRACT_ID: `room-prehit-${index}`,
    ROLE: "ROOM",
    ROUTE: route,
    VIEWPORT: "desktop",
    SURFACE_ID: `ROOM|${route}|desktop|base`,
    ACTION_ROLE: "button",
    ACTION_NAME: `Action ${index}`,
    MATERIAL_STATE_SIGNATURE: "{}",
    EXPECTED_EFFECT_CLASS: "RENDERED_TRANSITION",
    SAFETY_CLASS: "SAFE",
  };
}

function diagnostic(contract, reason) {
  return { CONTRACT_ID: contract.ACTION_CONTRACT_ID, FAILURE_REASON: reason };
}

test("RED-1 session-loading screen cannot satisfy positive route readiness", async () => {
  const lib = await migration();
  const readiness = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room",
    observedRoute: "/room",
    shellMounted: true,
    routeContentMounted: true,
    routeMarkerPresent: true,
    bodyText: "YÜKLENİYOR Oturum bilgileri doğrulanıyor",
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, "SESSION_LOADING_ACTIVE");
});

test("RED-2 a polling deadline with loading still rendered is not route readiness", async () => {
  const lib = await migration();
  const readiness = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room/offers",
    observedRoute: "/room/offers",
    shellMounted: true,
    routeContentMounted: true,
    routeMarkerPresent: true,
    bodyText: "Yükleniyor...",
    deadlineElapsed: true,
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, "BLOCKING_LOADING_FALLBACK_ACTIVE");
});

test("RED-3 a mounted shell with Suspense fallback is not financial route readiness", async () => {
  const lib = await migration();
  const readiness = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room/financial-operations",
    observedRoute: "/room/financial-operations",
    shellMounted: true,
    routeContentMounted: false,
    routeMarkerPresent: false,
    bodyText: "Yükleniyor...",
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason, "ROUTE_CONTENT_NOT_READY");
});

test("RED-4 readiness requires all positive session, route, content, and marker proofs", async () => {
  const lib = await migration();
  const readiness = lib.evaluatePositiveRouteReadiness({
    requestedRoute: "/room/offers",
    observedRoute: "/room/offers",
    shellMounted: true,
    routeContentMounted: true,
    routeMarkerPresent: true,
    bodyText: "Teklifler",
  });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.reason, "READY");
});

test("RED-5 migration accounts for the exact 219 + 12 + 15 pre-hit partition", async () => {
  const lib = await migration();
  const s1 = Array.from({ length: 219 }, (_, index) => target(index, "/room/offers"));
  const l1 = Array.from({ length: 12 }, (_, index) => target(219 + index, "/room"));
  const a1 = Array.from({ length: 15 }, (_, index) => target(231 + index, "/room/financial-operations"));
  const result = lib.buildRoomPrehit246Migration({
    targets: [...s1, ...l1, ...a1],
    diagnosticRecords: [
      ...s1.map((item) => diagnostic(item, "SURFACE_REPLAY_FAILED:missing replay step: Araçlar")),
      ...l1.map((item) => diagnostic(item, "CURRENT_SEMANTIC_TARGET_NOT_FOUND:surface:root:Harita")),
      ...a1.map((item) => diagnostic(item, "CURRENT_SEMANTIC_ACTION_NOT_RESOLVED:button:Senaryoyu Karşılaştır")),
    ],
    surfaces: [],
  });
  assert.deepEqual(result.accounting, { PREHIT_S1: 219, PREHIT_L1: 12, PREHIT_A1: 15, TOTAL: 246, DUPLICATE_ID_COUNT: 0, MISSING_ID_COUNT: 0, BALANCED: true });
});

test("RED-6 migrated ROOM state recipes always establish readiness before legacy evidence fallback", async () => {
  const lib = await migration();
  const result = lib.buildRoomPrehit246Migration({
    targets: [target(1)],
    diagnosticRecords: [diagnostic(target(1), "SURFACE_REPLAY_FAILED:missing replay step: Araçlar")],
    surfaces: [{ role: "ROOM", route: "/room", viewport: "desktop", state: "base", steps: [{ role: "button", label: "Araçlar" }] }],
    allowPartial: true,
  });
  const row = result.rows[0];
  assert.equal(row.HISTORICAL_SETUP_POLICY, "MIGRATION_FIRST_CURRENT_STATE_THEN_BOUNDED_FALLBACK");
  assert.deepEqual(row.STATE_RECIPE.produce.slice(0, 2).map((step) => step.type), ["AUTH_SESSION_READY", "ROUTE_CONTENT_READY"]);
  assert.equal(row.LEGACY_PRESENTATION_STEPS.length, 1);
});

test("RED-7 ROOM workspace contracts require native task-workspace reconstruction", async () => {
  const lib = await migration();
  const result = lib.buildRoomPrehit246Migration({
    targets: [target(1, "/room")],
    diagnosticRecords: [diagnostic(target(1, "/room"), "CURRENT_SEMANTIC_TARGET_NOT_FOUND:surface:root:Harita")],
    surfaces: [],
    allowPartial: true,
  });
  assert.ok(result.rows[0].STATE_RECIPE.produce.some((step) => step.type === "ROOM_TASK_WORKSPACE_OPEN"));
});

test("RED-8 closed details cannot pass a current workspace assertion on collector-only evidence", async () => {
  const lib = await migration();
  const assertion = lib.evaluateRoomTaskWorkspaceAssertion({
    detailsOpen: false,
    descendantCollectorPresent: true,
    descendantPlaywrightVisible: false,
  });
  assert.equal(assertion.ok, false);
  assert.equal(assertion.reason, "ROOM_TASK_WORKSPACE_NOT_OPEN");
});

test("RED-9 financial routes require settled content before semantic enumeration", async () => {
  const lib = await migration();
  const result = lib.buildRoomPrehit246Migration({
    targets: [target(1, "/room/financial-operations")],
    diagnosticRecords: [diagnostic(target(1, "/room/financial-operations"), "CURRENT_SEMANTIC_ACTION_NOT_RESOLVED:button:Senaryoyu Karşılaştır")],
    surfaces: [],
    allowPartial: true,
  });
  assert.ok(result.rows[0].STATE_RECIPE.produce.some((step) => step.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED"));
});

test("RED-10 empty historical summary descriptors reconcile to state rather than disappearing", async () => {
  const lib = await migration();
  const reconciliation = lib.reconcileEmptyHistoricalStep({
    route: "/room/financial-operations",
    step: { tag: "SUMMARY", role: "summary", label: "", occurrence: 2 },
    materialState: { systemNavigationDisclosure: "SİSTEM_OPEN" },
  });
  assert.equal(reconciliation.status, "CURRENT_STATE_SUCCESSOR");
  assert.equal(reconciliation.stateProducer.type, "NAV_GROUP_OPEN");
  assert.equal(reconciliation.dropped, false);
});

test("RED-11 the 54 physical hit-test records remain outside the pre-hit target set", async () => {
  const lib = await migration();
  const partition = lib.partitionRoomPrehitDiagnostics([
    diagnostic(target(1), "SURFACE_REPLAY_FAILED:missing replay step: Araçlar"),
    diagnostic(target(2), "SEMANTIC_STABILITY_NOT_PROVEN:MODAL_ABSENT,DRAWER_ABSENT,BACKDROP_ABSENT,TARGET_HIT_TEST"),
  ]);
  assert.equal(partition.prehit.length, 1);
  assert.equal(partition.preservedHitTest.length, 1);
});

test("RED-12 migration dry-run rejects checkpoint identity loss", async () => {
  const lib = await migration();
  const integrity = lib.assertRoomPrehitCheckpointIntegrity({
    knownIds: ["a", "b", "c"],
    replayIds: ["a", "b"],
  });
  assert.equal(integrity.identityLossCount, 1);
  assert.equal(integrity.preserved, false);
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
  PRE_18_ROOM_PREHIT_246_MIGRATION_CHECK: failures ? "RED" : "PASS",
  RED_REAL_SHAPE_TEST_COUNT: cases.length,
  RED_OBSERVED_COUNT: failures,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
}, null, 2));
if (failures) process.exitCode = 1;
