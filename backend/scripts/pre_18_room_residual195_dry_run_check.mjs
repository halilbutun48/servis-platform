/*
 * Immutable-artifact, no-browser proof for the exact ROOM residual-195
 * population.  It neither creates a context nor writes a replay artifact.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRoomWorkerPoolPlan } from "./lib/pre_18_room_worker_pool.mjs";
import { auditRoomRouteMarkerAssignments } from "./lib/pre_18_room_prehit_246_migration_v1.mjs";

const root = process.cwd();
const resultsPath = path.join(
  root,
  "backend/artifacts/browser-smoke/pre-18-luna-full-hybrid-surface-state-completion/runs/pre18-room-prehit-246-20260912-luna-local-final/room-prehit-246-migration/results.json",
);
const replay = JSON.parse(await fs.readFile(resultsPath, "utf8"));
const rows = Array.isArray(replay?.results) ? replay.results : [];
const contracts = rows.map((row) => ({
  ACTION_CONTRACT_ID: row.ACTION_CONTRACT_ID,
  ROLE: row.ROLE,
  TENANT_KEY: "ROOM_AUTH_SCOPE",
  ROUTE: row.ROUTE,
}));
const plan = createRoomWorkerPoolPlan({ contracts, maxWorkers: 6, role: "ROOM", tenantKey: "ROOM_AUTH_SCOPE" });
const route99 = rows.filter((row) => String(row.failureReason || "") === "ROUTE_READINESS_NOT_PROVEN:ROUTE_CONTENT_NOT_READY");
const routeAudit = auditRoomRouteMarkerAssignments(route99);

assert.equal(rows.length, 246);
assert.equal(new Set(rows.map((row) => row.ACTION_CONTRACT_ID)).size, 246);
assert.equal(plan.accounting.CONTRACT_ASSIGNMENT_COUNT, 246);
assert.equal(plan.accounting.CONTRACT_ASSIGNMENT_DUPLICATE_COUNT, 0);
assert.equal(plan.accounting.CONTRACT_ASSIGNMENT_MISSING_COUNT, 0);
assert.ok(plan.accounting.WORKER_COUNT <= 6);
assert.ok(plan.accounting.EXPECTED_MAX_API_ME_PROOFS <= 6);
assert.deepEqual(routeAudit, {
  TARGET_COUNT: 99,
  COMMERCIAL_FLOW_EXPLICIT_MARKER_COUNT: 39,
  OFFERS_EXPLICIT_MARKER_COUNT: 36,
  AGREEMENTS_EXPLICIT_MARKER_COUNT: 24,
  GENERIC_MAIN_MAPPING_COUNT: 0,
  UNDEFINED_MARKER_COUNT: 0,
});

console.log(JSON.stringify({
  PRE_18_ROOM_RESIDUAL195_DRY_RUN_CHECK: "PASS",
  DRY_RUN_CONTRACT_COUNT: rows.length,
  DRY_RUN_WORKER_COUNT: plan.accounting.WORKER_COUNT,
  DRY_RUN_ASSIGNMENT_COUNT: plan.accounting.CONTRACT_ASSIGNMENT_COUNT,
  DRY_RUN_DUPLICATE_ASSIGNMENT_COUNT: plan.accounting.CONTRACT_ASSIGNMENT_DUPLICATE_COUNT,
  DRY_RUN_MISSING_ASSIGNMENT_COUNT: plan.accounting.CONTRACT_ASSIGNMENT_MISSING_COUNT,
  EXPECTED_MAX_API_ME_PROOFS: plan.accounting.EXPECTED_MAX_API_ME_PROOFS,
  ROUTE99_DRY_RUN_TARGET_COUNT: routeAudit.TARGET_COUNT,
  COMMERCIAL_FLOW_EXPLICIT_MARKER_COUNT: routeAudit.COMMERCIAL_FLOW_EXPLICIT_MARKER_COUNT,
  OFFERS_EXPLICIT_MARKER_COUNT: routeAudit.OFFERS_EXPLICIT_MARKER_COUNT,
  AGREEMENTS_EXPLICIT_MARKER_COUNT: routeAudit.AGREEMENTS_EXPLICIT_MARKER_COUNT,
  GENERIC_MAIN_MAPPING_COUNT: routeAudit.GENERIC_MAIN_MAPPING_COUNT,
  UNDEFINED_MARKER_COUNT: routeAudit.UNDEFINED_MARKER_COUNT,
}, null, 2));
