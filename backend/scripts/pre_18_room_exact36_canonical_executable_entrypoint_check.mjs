/*
 * No-browser contract for the canonical ROOM Exact36 executable boundary.
 * It exercises only short child-process commands and the entrypoint's
 * validation mode; it must never launch Chromium or contact an origin.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const cliPath = path.join(root, "backend/scripts/pre_18_room_exact36_acceptance_cli.mjs");
const runnerPath = path.join(root, "backend/scripts/pre_18_luna_full_hybrid_surface_state_completion.mjs");
process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";
const localEnvironment = {
  ...process.env,
  WEB_BASE_URL: "http://127.0.0.1:5173",
  API_BASE_URL: "http://127.0.0.1:3000",
  PRE18_LUNA_RUN_ID: "pre18-room-exact36-entrypoint-check",
};
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

function executeNode(args, environment = localEnvironment) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    windowsHide: true,
  });
}

function parseJsonOutput(result) {
  return JSON.parse(String(result.stdout || "").trim() || "{}");
}

test("ENTRYPOINT-1 short canonical CLI validates without Chromium", () => {
  const result = executeNode([cliPath, "--validate-start"]);
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const payload = parseJsonOutput(result);
  assert.equal(payload.ROOM_EXACT36_CANONICAL_EXECUTABLE, "READY");
  assert.equal(payload.REAL_BROWSER_RUN_STARTED, "NO");
  assert.equal(payload.CHROMIUM_PROCESS_STARTED, "NO");
});

test("ENTRYPOINT-2 high-level runner binds private adapters internally", async () => {
  const runner = await import(pathToFileURL(runnerPath).href);
  assert.equal(typeof runner.runRoomExact36Acceptance, "function");
  const result = await runner.runRoomExact36Acceptance({ validateStart: true });
  assert.equal(result.PRIVATE_ADAPTER_BINDING_SUCCESS, "YES");
  assert.equal(result.EXTERNAL_CALLER_MUST_SUPPLY_PRIVATE_ADAPTERS, "NO");
});

test("ENTRYPOINT-3 trusted-local validation resolves the frozen exact36 selection", () => {
  const result = executeNode([cliPath, "--validate-start"]);
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const payload = parseJsonOutput(result);
  assert.deepEqual([
    payload.TARGET_COUNT,
    payload.SELECTED_UNIQUE_CONTRACT_COUNT,
    payload.NEW_DISCOVERY_COUNT,
    payload.SUBSTITUTED_CONTRACT_COUNT,
    payload.FROZEN_SELECTION_RESOLUTION_SUCCESS,
  ], [36, 36, 0, 0, "YES"]);
});

test("ENTRYPOINT-4 public tunnel configuration is rejected before runtime setup", () => {
  const result = executeNode([cliPath, "--validate-start"], {
    ...localEnvironment,
    WEB_BASE_URL: "https://these-emotional-dow-firefox.trycloudflare.com",
    API_BASE_URL: "https://these-emotional-dow-firefox.trycloudflare.com",
  });
  assert.notEqual(result.status, 0, "public tunnel must not be an Exact36 acceptance origin");
  assert.match(`${result.stderr}\n${result.stdout}`, /EXACT36_TRUSTED_LOCAL_ORIGIN_REQUIRED/u);
});

test("ENTRYPOINT-5 CLI is bootstrap only and has no private lifecycle implementation", async () => {
  const source = await fs.readFile(cliPath, "utf8");
  assert.match(source, /runRoomExact36Acceptance/u);
  assert.doesNotMatch(source, /createWorkerRuntime|executeContractRuntime|persistRequestLifecycleSnapshot|createAuthenticatedRoleContext|resetRoomExact36CanonicalContract|createSharedAuthenticatedReadBudgetCoordinator/u);
});

test("ENTRYPOINT-6 no serialized or data-url lifecycle is selectable", async () => {
  const [cliSource, runnerSource] = await Promise.all([
    fs.readFile(cliPath, "utf8"),
    fs.readFile(runnerPath, "utf8"),
  ]);
  assert.doesNotMatch(cliSource, /data:text\/javascript|--serialized|serializedLifecycle/iu);
  assert.doesNotMatch(runnerSource, /data:text\/javascript/iu);
});

test("ENTRYPOINT-7 importing the CLI has no browser-start side effect", () => {
  const importExpression = `import(${JSON.stringify(pathToFileURL(cliPath).href)}).then(() => console.log('IMPORTED'))`;
  const result = executeNode(["-e", importExpression]);
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  assert.equal(String(result.stdout || "").trim(), "IMPORTED");
});

test("ENTRYPOINT-8 frozen hit-test inputs remain present without invoking a corrective", async () => {
  const runner = await import(pathToFileURL(runnerPath).href);
  const result = await runner.runRoomExact36Acceptance({ validateStart: true });
  assert.equal(result.KNOWN_HIT_TEST_INPUT_COUNT_PRESERVED, 190);
});

test("ENTRYPOINT-9 reset canary remains a canonical CLI delegation", async () => {
  const [cliSource, runnerSource] = await Promise.all([
    fs.readFile(cliPath, "utf8"),
    fs.readFile(runnerPath, "utf8"),
  ]);
  assert.match(cliSource, /--run-reset-canary/u);
  assert.match(runnerSource, /RESET_CANARY_MODE_READY/u);
  assert.match(runnerSource, /runRoomExact36DurableRuntime/u);
  assert.doesNotMatch(cliSource, /createWorkerRuntime|executeContractRuntime|persistRequestLifecycleSnapshot|createAuthenticatedRoleContext|resetRoomExact36CanonicalContract|createSharedAuthenticatedReadBudgetCoordinator/u);
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
  EXECUTABLE_ENTRYPOINT_TEST_COUNT: cases.length,
  EXECUTABLE_ENTRYPOINT_TEST_PASS: pass,
  EXECUTABLE_ENTRYPOINT_TEST_FAIL: fail,
  REAL_BROWSER_RUN_STARTED: "NO",
}, null, 2));
if (fail) process.exitCode = 1;
