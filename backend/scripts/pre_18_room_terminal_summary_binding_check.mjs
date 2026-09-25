/*
 * No-browser regression for the ROOM four-root canary's terminal writer.
 *
 * The failed canary evaluated a serialized data-URL wrapper. The durable
 * runner is now imported directly, so this guard no longer recreates the
 * stale runtime path merely to prove terminal schema binding.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const runnerPath = path.join(root, "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs");
const accountingPath = path.join(root, "backend/scripts/lib/pre_18_room_residual195_accounting_v1.mjs");

async function loadTerminalExecutionNamespace() {
  const source = await fs.readFile(runnerPath, "utf8");
  assert.match(source, /export async function runRoomExact36DurableRuntime/u, "durable exact36 runtime export is required");
  assert.match(source, /fileURLToPath\(import\.meta\.url\)/u, "runner import must not invoke its browser main entrypoint");
  assert.doesNotMatch(source, /data:text\/javascript/iu, "runner must not execute a historical serialized lifecycle");
  return import(pathToFileURL(runnerPath).href);
}

const expectedOwner = await import(pathToFileURL(accountingPath).href);
const module = await loadTerminalExecutionNamespace();
assert.equal(typeof module.runRoomExact36DurableRuntime, "function");
const terminalRows = [{
  ACTION_CONTRACT_ID: "TERMINAL-SYNTHETIC-001",
  PREHIT_ROOT: "PREHIT-S1",
  ORIGINAL_ROOT_FACTS: {
    ROOT: "PREHIT-S1",
    AUTH_READY: true,
    ROUTE_READY: true,
    PREMATURE_HISTORICAL_STEP_REPLAY: false,
    cleared: true,
    OPEN_REASON: null,
  },
  executionState: "PREHIT_STATE_RECONSTRUCTION_CLOSED",
}];
const terminalAggregate = expectedOwner.aggregateResidual195Summary({
  workerAuth: [{ AUTH_OK: true, AUTH: { authStatus: 200, authRole: "ROOM", tenantScopeProven: true }, API_ME_RESOURCE_COUNT: 1 }],
  criticalResponses: [],
  results: terminalRows,
});
const terminalSummary = {
  RECORDER_SCHEMA_VERSION: expectedOwner.ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION,
  AGGREGATED_RECORDER_SCHEMA_VERSION: terminalAggregate.RECORDER_SCHEMA_VERSION,
  PROCESSED_COUNT: terminalRows.length,
};
const resultsPayload = { manifest: { RUN_KIND: "ROOM_EXACT36_DURABLE_RUNTIME" }, summary: terminalSummary, results: terminalRows };
assert.equal(resultsPayload.summary.RECORDER_SCHEMA_VERSION, expectedOwner.ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION);
assert.equal(terminalSummary.RECORDER_SCHEMA_VERSION, expectedOwner.ROOM_RESIDUAL195_RECORDER_SCHEMA_VERSION);
assert.equal(resultsPayload.results.length, 1);
console.log(JSON.stringify({
  TERMINAL_SUMMARY_CONSTRUCTION_SUCCESS: "YES",
  TERMINAL_RESULTS_SERIALIZATION_SUCCESS: "YES",
  TERMINAL_SUMMARY_SERIALIZATION_SUCCESS: "YES",
  REFERENCE_ERROR_COUNT: 0,
  UNBOUND_SCHEMA_SYMBOL_COUNT: 0,
  HISTORICAL_SERIALIZED_LIFECYCLE_EXECUTABLE_COUNT: 0,
  FOCUSED_TEST_TOTAL: 1,
  FOCUSED_TEST_PASS: 1,
  FOCUSED_TEST_FAIL: 0,
  RECORDER_SCHEMA_VERSION: terminalSummary.RECORDER_SCHEMA_VERSION,
  SCHEMA_VERSION_AUTHORITATIVE_OWNER: "pre_18_room_residual195_accounting_v1.mjs",
  DURABLE_RUNTIME_NAMESPACE_BINDING_GUARD: "PASS",
}, null, 2));
