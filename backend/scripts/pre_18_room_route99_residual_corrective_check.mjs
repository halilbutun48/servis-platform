/*
 * Focused, no-browser RED/GREEN contract for the two ROUTE99 residuals.
 * It uses only harness models and immutable artifacts; no product route or
 * browser context is opened from this file.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import * as route from "./lib/pre_18_room_prehit_246_migration_v1.mjs";
import * as workers from "./lib/pre_18_room_worker_pool.mjs";
import {
  buildRoute99CommercialFlowDryRun,
  evaluateRoute99WorkerReset,
} from "./lib/pre_18_room_route99_canary_contract.mjs";

const cases = [];
function test(group, name, fn) { cases.push({ group, name, fn }); }

function commercialMarker() {
  return route.resolveRoomRouteReadinessMarker("/room/commercial-flow");
}

function readyObservation(overrides = {}) {
  return {
    requestedRoute: "/room/commercial-flow",
    observedRoute: "/room/commercial-flow",
    shellMounted: true,
    routeContentMounted: true,
    routeMarkerPresent: true,
    routeMarkerDefined: true,
    bodyText: "Ticari Akış Özeti",
    ...overrides,
  };
}

function semanticFixture(overrides = {}) {
  return {
    exactTextMatchCount: 2,
    visibleRoles: [
      { role: "button", name: "Ticari Çalışma Alanı", visible: true },
      { role: "heading", name: "Ticari Çalışma Alanı", visible: true },
    ],
    ...overrides,
  };
}

function cleanResetObserved(overrides = {}) {
  return {
    role: "ROOM",
    tenantKey: "ROOM_AUTH_SCOPE",
    route: "/room",
    modalOpen: false,
    drawerOpen: false,
    popoverOpen: false,
    detailsOpen: false,
    filterActive: false,
    temporaryInputPresent: false,
    transientAssistantOpen: false,
    scrollAtOrigin: true,
    ...overrides,
  };
}

const roomWorker = { WORKER_ID: "ROOM-W1", ROLE: "ROOM", TENANT_KEY: "ROOM_AUTH_SCOPE" };

// CF-RED-1..11
test("CF", "RED-1 commercial-flow describes secondary evidence as an exact heading", () => {
  const descriptor = route.normalizeRoomRouteSemanticEvidence(commercialMarker());
  assert.deepEqual(descriptor, { kind: "ROLE", role: "heading", name: "Ticari Çalışma Alanı", exact: true });
});

test("CF", "RED-2 duplicate navigation text and one matching heading satisfy the typed marker", () => {
  const semanticPresent = route.evaluateRoomRouteSemanticEvidencePresence(
    route.normalizeRoomRouteSemanticEvidence(commercialMarker()),
    semanticFixture(),
  );
  assert.equal(semanticPresent, true);
  assert.equal(route.evaluateRoomRouteMarkerPresence(commercialMarker(), {
    requiredSelectorsPresent: true,
    requiredSemanticEvidencePresent: semanticPresent,
  }), true);
});

test("CF", "RED-3 navigation text without the matching heading does not satisfy commercial-flow", () => {
  const semanticPresent = route.evaluateRoomRouteSemanticEvidencePresence(
    route.normalizeRoomRouteSemanticEvidence(commercialMarker()),
    semanticFixture({ visibleRoles: [{ role: "button", name: "Ticari Çalışma Alanı", visible: true }] }),
  );
  assert.equal(semanticPresent, false);
});

test("CF", "RED-4 heading without the commercial root selector is not ready", () => {
  const semanticPresent = route.evaluateRoomRouteSemanticEvidencePresence(
    route.normalizeRoomRouteSemanticEvidence(commercialMarker()), semanticFixture(),
  );
  const present = route.evaluateRoomRouteMarkerPresence(commercialMarker(), {
    requiredSelectorsPresent: false,
    requiredSemanticEvidencePresent: semanticPresent,
  });
  assert.equal(present, false);
});

test("CF", "RED-5 blocking loading still wins over a correct typed marker", () => {
  const result = route.evaluatePositiveRouteReadiness(readyObservation({ bodyText: "Yükleniyor..." }));
  assert.deepEqual(result, { ready: false, reason: "BLOCKING_LOADING_FALLBACK_ACTIVE" });
});

test("CF", "RED-6 a correct commercial marker on a wrong route is not ready", () => {
  const result = route.evaluatePositiveRouteReadiness(readyObservation({ observedRoute: "/room/offers" }));
  assert.deepEqual(result, { ready: false, reason: "ROUTE_SHELL_NOT_READY" });
});

test("CF", "RED-7 offers retains its existing text marker", () => {
  assert.deepEqual(route.normalizeRoomRouteSemanticEvidence(route.resolveRoomRouteReadinessMarker("/room/offers")), {
    kind: "TEXT", text: "Teklifler (Gelen Teklifler)", exact: true,
  });
});

test("CF", "RED-8 agreements retains its existing text marker", () => {
  assert.deepEqual(route.normalizeRoomRouteSemanticEvidence(route.resolveRoomRouteReadinessMarker("/room/agreements")), {
    kind: "TEXT", text: "Taşımacılık Firması / Sözleşmeler", exact: true,
  });
});

test("CF", "RED-9 room home marker is unchanged", () => {
  assert.equal(route.resolveRoomRouteReadinessMarker("/room").id, "ROOM_HOME");
});

test("CF", "RED-10 financial marker is unchanged", () => {
  assert.equal(route.resolveRoomRouteReadinessMarker("/room/financial-operations").id, "ROOM_FINANCIAL_OPERATIONS");
});

test("CF", "RED-11 shifts marker is unchanged", () => {
  assert.equal(route.resolveRoomRouteReadinessMarker("/room/shifts").id, "ROOM_SHIFTS_CURRENT_CONTENT");
});

// RST-RED-1..12
test("RST", "RED-1 tenant expectation mismatch is an identity proof failure, not a state leak", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({
    worker: roomWorker,
    observed: cleanResetObserved({ tenantKey: "ROOM" }),
  });
  assert.equal(result.RESET_COMPLETED, false);
  assert.equal(result.RESET_FAILURE_CLASS, "TENANT_IDENTITY_PROOF_FAILURE");
  assert.equal(result.ACTUAL_TRANSIENT_STATE_LEAK, false);
  assert.equal(result.leakage.CROSS_CONTRACT_STATE_LEAK_COUNT, 0);
});

test("RST", "RED-2 canonical worker tenant identity completes a clean reset", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({ worker: roomWorker, observed: cleanResetObserved() });
  assert.equal(result.EXPECTED_TENANT_KEY, "ROOM_AUTH_SCOPE");
  assert.equal(result.RESET_COMPLETED, true);
  assert.equal(result.RESET_REASON, "ROOM_WORKER_RESET_COMPLETE");
});

test("RST", "RED-3 a clean tenant mismatch remains non-leaking", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({
    worker: roomWorker,
    observed: cleanResetObserved({ tenantKey: "ROOM" }),
  });
  assert.equal(result.ACTUAL_TRANSIENT_STATE_LEAK, false);
  assert.equal(result.leakage.CROSS_CONTRACT_OVERLAY_LEAK_COUNT, 0);
  assert.equal(result.leakage.CROSS_CONTRACT_FILTER_LEAK_COUNT, 0);
  assert.equal(result.leakage.CROSS_CONTRACT_FORM_STATE_LEAK_COUNT, 0);
  assert.equal(result.leakage.CROSS_CONTRACT_DISCLOSURE_LEAK_COUNT, 0);
  assert.equal(result.leakage.CROSS_CONTRACT_SCROLL_STATE_LEAK_COUNT, 0);
});

test("RST", "RED-4 an actual overlay remains an overlay leak", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({ worker: roomWorker, observed: cleanResetObserved({ modalOpen: true }) });
  assert.equal(result.RESET_FAILURE_CLASS, "OVERLAY_DIRTY");
  assert.equal(result.leakage.CROSS_CONTRACT_OVERLAY_LEAK_COUNT, 1);
});

test("RST", "RED-5 an actual filter remains a filter leak", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({ worker: roomWorker, observed: cleanResetObserved({ filterActive: true }) });
  assert.equal(result.RESET_FAILURE_CLASS, "FILTER_DIRTY");
  assert.equal(result.leakage.CROSS_CONTRACT_FILTER_LEAK_COUNT, 1);
});

test("RST", "RED-6 a transient form remains a form leak", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({ worker: roomWorker, observed: cleanResetObserved({ temporaryInputPresent: true }) });
  assert.equal(result.RESET_FAILURE_CLASS, "FORM_DIRTY");
  assert.equal(result.leakage.CROSS_CONTRACT_FORM_STATE_LEAK_COUNT, 1);
});

test("RST", "RED-7 an open details disclosure remains a disclosure leak", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({ worker: roomWorker, observed: cleanResetObserved({ detailsOpen: true }) });
  assert.equal(result.RESET_FAILURE_CLASS, "DISCLOSURE_DIRTY");
  assert.equal(result.leakage.CROSS_CONTRACT_DISCLOSURE_LEAK_COUNT, 1);
});

test("RST", "RED-8 non-origin scroll remains a scroll leak", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({ worker: roomWorker, observed: cleanResetObserved({ scrollAtOrigin: false }) });
  assert.equal(result.RESET_FAILURE_CLASS, "SCROLL_DIRTY");
  assert.equal(result.leakage.CROSS_CONTRACT_SCROLL_STATE_LEAK_COUNT, 1);
});

test("RST", "RED-9 clean worker reset has no state leakage counters", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({ worker: roomWorker, observed: cleanResetObserved() });
  assert.equal(result.leakage.CROSS_CONTRACT_STATE_LEAK_COUNT, 0);
});

test("RST", "RED-10 role mismatch remains a hard identity failure", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({
    worker: roomWorker,
    observed: cleanResetObserved({ role: "SUPER_ADMIN" }),
  });
  assert.equal(result.RESET_COMPLETED, false);
  assert.equal(result.RESET_FAILURE_CLASS, "ROLE_IDENTITY_FAILURE");
});

test("RST", "RED-11 worker-pool limits and isolation remain unchanged", () => {
  const plan = workers.createRoomWorkerPoolPlan({
    contracts: [
      { ACTION_CONTRACT_ID: "a", ROLE: "ROOM", TENANT_KEY: "ROOM_AUTH_SCOPE" },
      { ACTION_CONTRACT_ID: "b", ROLE: "ROOM", TENANT_KEY: "ROOM_AUTH_SCOPE" },
    ],
    maxWorkers: 6,
    role: "ROOM",
    tenantKey: "ROOM_AUTH_SCOPE",
  });
  assert.equal(workers.ROOM_WORKER_CONCURRENCY_MAX, 6);
  assert.equal(plan.accounting.LOGIN_COUNT_PER_RUN, 1);
  assert.equal(plan.accounting.CROSS_ROLE_CONTEXT_REUSE_COUNT, 0);
  assert.equal(plan.accounting.CROSS_TENANT_CONTEXT_REUSE_COUNT, 0);
});

test("RST", "RED-12 reset artifact persists exact reason and classification", () => {
  const result = workers.evaluateRoomWorkerResetForPoolWorker({
    worker: roomWorker,
    observed: cleanResetObserved({ tenantKey: "ROOM" }),
  });
  for (const key of ["RESET_REASON", "RESET_FAILURE_CLASS", "ACTUAL_TRANSIENT_STATE_LEAK", "leakage"]) assert.ok(Object.hasOwn(result, key), key);
});

let failures = 0;
const counts = {
  CF: { total: 0, observed: 0, pass: 0 },
  RST: { total: 0, observed: 0, pass: 0 },
};
for (const item of cases) {
  counts[item.group].total += 1;
  try {
    item.fn();
    counts[item.group].pass += 1;
    console.log(`PASS ${item.group}-${item.name}`);
  } catch (error) {
    failures += 1;
    counts[item.group].observed += 1;
    console.log(`RED ${item.group}-${item.name}: ${error.message}`);
  }
}

let dryRunFailure = null;
let commercialDryRun = null;
let resetDryRun = [];
try {
  const artifactPath = path.join(
    process.cwd(),
    "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-route99-stratified-canary-1789270395463/room-route99-stratified-canary/results.json",
  );
  const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  commercialDryRun = buildRoute99CommercialFlowDryRun(artifact.ROUTE_RESULTS);
  assert.deepEqual(commercialDryRun, {
    COMMERCIAL_FLOW_DRY_RUN_TARGET_COUNT: 3,
    TYPED_HEADING_MARKER_MAPPING_COUNT: 3,
    BARE_TEXT_MARKER_MAPPING_COUNT: 0,
    GENERIC_MAIN_MAPPING_COUNT: 0,
    UNDEFINED_MARKER_COUNT: 0,
    UNIQUE_CONTRACT_ID_COUNT: 3,
    MISSING_EXPECTED_CONTRACT_COUNT: 0,
    MARKER_ID: "ROOM_COMMERCIAL_FLOW",
  });
  resetDryRun = ["ROOM-W1", "ROOM-W2", "ROOM-W3"].map((WORKER_ID) => evaluateRoute99WorkerReset({
    worker: { WORKER_ID, ROLE: "ROOM", TENANT_KEY: "ROOM_AUTH_SCOPE" },
    observed: cleanResetObserved(),
  }));
  assert.equal(resetDryRun.filter((item) => item.ACTUAL_TENANT_KEY === item.EXPECTED_TENANT_KEY).length, 3);
  assert.equal(resetDryRun.filter((item) => item.ACTUAL_TRANSIENT_STATE_LEAK).length, 0);
  assert.equal(resetDryRun.filter((item) => item.RESET_FAILURE_CLASS !== "RESET_COMPLETE").length, 0);
} catch (error) {
  dryRunFailure = error;
  failures += 1;
  console.log(`FAIL DRY-RUN: ${error.message}`);
}

console.log(JSON.stringify({
  PRE_18_ROOM_ROUTE99_RESIDUAL_CORRECTIVE_CHECK: failures ? "RED" : "PASS",
  CF_RED_TEST_COUNT: counts.CF.total,
  CF_RED_OBSERVED_COUNT: counts.CF.observed,
  CF_RED_UNEXPECTED_PASS_COUNT: counts.CF.pass,
  RST_RED_TEST_COUNT: counts.RST.total,
  RST_RED_OBSERVED_COUNT: counts.RST.observed,
  RST_RED_UNEXPECTED_PASS_COUNT: counts.RST.pass,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
  COMMERCIAL_FLOW_DRY_RUN_TARGET_COUNT: commercialDryRun?.COMMERCIAL_FLOW_DRY_RUN_TARGET_COUNT ?? 0,
  TYPED_HEADING_MARKER_MAPPING_COUNT: commercialDryRun?.TYPED_HEADING_MARKER_MAPPING_COUNT ?? 0,
  BARE_TEXT_MARKER_MAPPING_COUNT: commercialDryRun?.BARE_TEXT_MARKER_MAPPING_COUNT ?? 0,
  GENERIC_MAIN_MAPPING_COUNT: commercialDryRun?.GENERIC_MAIN_MAPPING_COUNT ?? 0,
  UNDEFINED_MARKER_COUNT: commercialDryRun?.UNDEFINED_MARKER_COUNT ?? 0,
  RESET_DRY_RUN_WORKER_COUNT: resetDryRun.length,
  EXPECTED_TENANT_MATCH_COUNT: resetDryRun.filter((item) => item.ACTUAL_TENANT_KEY === item.EXPECTED_TENANT_KEY).length,
  EXPECTED_TENANT_MISMATCH_COUNT: resetDryRun.filter((item) => item.ACTUAL_TENANT_KEY !== item.EXPECTED_TENANT_KEY).length,
  ACTUAL_TRANSIENT_STATE_LEAK_COUNT: resetDryRun.filter((item) => item.ACTUAL_TRANSIENT_STATE_LEAK).length,
  RESET_PROOF_FALSE_NEGATIVE_COUNT: resetDryRun.filter((item) => item.RESET_FAILURE_CLASS !== "RESET_COMPLETE").length,
  DRY_RUN_FAIL: dryRunFailure ? 1 : 0,
}, null, 2));

if (failures) process.exitCode = 1;
