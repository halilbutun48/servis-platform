/*
 * Focused contract for the controlled ROOM replay-parity diagnostic.
 *
 * The production changes that must make these checks fail are: allowing the
 * diagnostic tail to change the original verdict, losing the atomic timeout
 * sample, or persisting a request URL with credentials/query secrets.
 */
import assert from "node:assert/strict";
import {
  createAuthDiagnosticRecorder,
  normalizeAuthDiagnosticConfiguration,
} from "./lib/pre_18_authenticated_role_context.mjs";

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

function timeoutSample(overrides = {}) {
  return {
    CURRENT_URL: "https://example.test/#/room",
    DOCUMENT_READY_STATE: "interactive",
    BODY_TEXT_SAFE_EXCERPT: "Yükleniyor...",
    NAV_DOCK_PRESENT: true,
    NAV_DOCK_VISIBLE: true,
    ROOM_TASK_HOME_PRESENT: false,
    ROOM_TASK_HOME_VISIBLE: false,
    SESSION_LOADING_PRESENT: false,
    GENERIC_LOADING_PRESENT: true,
    MAIN_COUNT: 0,
    ROLE_MAIN_COUNT: 0,
    ROOM_SHELL_PREDICATE_RESULT: false,
    ROUTE_CONTENT_PREDICATE_RESULT: false,
    AUTH_ME_STARTED: true,
    AUTH_ME_COMPLETED: true,
    AUTH_ME_STATUS: 200,
    CACHED_SESSION_PRESENT: true,
    CACHED_ROLE_ROOM: true,
    CACHED_ROOM_ID_PRESENT: true,
    SCREENSHOT_PATH: null,
    ...overrides,
  };
}

test("RED-PARITY-1 diagnostic tail cannot turn the original timeout verdict into PASS", () => {
  const recorder = createAuthDiagnosticRecorder({ startedAt: 0, tailMs: 5_000 });
  recorder.captureDeadline({
    at: 20_000,
    verdict: { ready: false, terminal: true, reason: "AUTH_ROOM_SHELL_TIMEOUT" },
    sample: timeoutSample(),
  });
  recorder.mark("AUTH_READY_PREDICATE_FIRST_TRUE", 20_100);
  const report = recorder.finish({ at: 25_000 });
  assert.deepEqual(report.VERDICT_AT_20S, {
    ready: false,
    terminal: true,
    reason: "AUTH_ROOM_SHELL_TIMEOUT",
  });
  assert.equal(report.TAIL_CAN_RECLASSIFY_VERDICT, false);
});

test("RED-PARITY-2 deadline sample remains atomic when the tail observes a later shell", () => {
  const recorder = createAuthDiagnosticRecorder({ startedAt: 0, tailMs: 5_000 });
  recorder.captureDeadline({
    at: 20_000,
    verdict: { ready: false, terminal: true, reason: "AUTH_ROOM_SHELL_TIMEOUT" },
    sample: timeoutSample({ NAV_DOCK_VISIBLE: false, ROOM_TASK_HOME_VISIBLE: false }),
  });
  recorder.recordObservation({
    at: 20_500,
    snapshot: timeoutSample({ NAV_DOCK_VISIBLE: true, ROOM_TASK_HOME_VISIBLE: true, GENERIC_LOADING_PRESENT: false }),
  });
  const report = recorder.finish({ at: 25_000 });
  assert.equal(report.FINAL_TIMEOUT_SAMPLE.NAV_DOCK_VISIBLE, false);
  assert.equal(report.FINAL_TIMEOUT_SAMPLE.ROOM_TASK_HOME_VISIBLE, false);
  assert.equal(report.POST_DEADLINE.NAV_SHELL_APPEARED_AFTER_DEADLINE, true);
  assert.equal(report.POST_DEADLINE.ROOM_HOME_APPEARED_AFTER_DEADLINE, true);
});

test("RED-PARITY-3 observes an api-me request beginning after the preserved deadline", () => {
  const recorder = createAuthDiagnosticRecorder({ startedAt: 0, tailMs: 5_000 });
  recorder.captureDeadline({
    at: 20_000,
    verdict: { ready: false, terminal: true, reason: "AUTH_VERIFY_NOT_STARTED_TIMEOUT" },
    sample: timeoutSample({ AUTH_ME_STARTED: false, AUTH_ME_COMPLETED: false, AUTH_ME_STATUS: null }),
  });
  recorder.recordRequestStart({
    at: 20_040,
    url: "https://example.test/api/me?token=must-not-persist",
    resourceType: "fetch",
  });
  recorder.recordResponseEnd({
    at: 20_090,
    url: "https://example.test/api/me?token=must-not-persist",
    status: 200,
  });
  const report = recorder.finish({ at: 25_000 });
  assert.equal(report.POST_DEADLINE.AUTH_ME_STARTED_AFTER_DEADLINE, true);
  assert.equal(report.POST_DEADLINE.AUTH_ME_COMPLETED_AFTER_DEADLINE, true);
  assert.equal(JSON.stringify(report).includes("must-not-persist"), false);
  assert.equal(report.REQUEST_LIFECYCLE[0].URL_CLASSIFICATION, "API_ME");
});

test("RED-PARITY-4 tail does not call an already-absent loading fallback cleared", () => {
  const recorder = createAuthDiagnosticRecorder({ startedAt: 0, tailMs: 5_000 });
  recorder.captureDeadline({
    at: 20_000,
    verdict: { ready: false, terminal: true, reason: "AUTH_ROOM_SHELL_TIMEOUT" },
    sample: timeoutSample({ GENERIC_LOADING_PRESENT: false }),
  });
  recorder.recordObservation({
    at: 20_080,
    snapshot: timeoutSample({ GENERIC_LOADING_PRESENT: false }),
  });
  const report = recorder.finish({ at: 25_000 });
  assert.equal(report.POST_DEADLINE.GENERIC_LOADING_CLEARED_AFTER_DEADLINE, false);
});

test("RED-PARITY-5 diagnostics classify resources without retaining URL query data", () => {
  const recorder = createAuthDiagnosticRecorder({ startedAt: 0 });
  recorder.recordRequestStart({
    at: 11,
    url: "https://example.test/assets/main.js?signature=private-value",
    resourceType: "script",
  });
  const report = recorder.finish({ at: 12 });
  assert.equal(report.REQUEST_LIFECYCLE[0].RESOURCE_CLASSIFICATION, "JS_BUNDLE");
  assert.equal(report.REQUEST_LIFECYCLE[0].SAFE_URL, "https://example.test/assets/main.js");
  assert.equal(JSON.stringify(report).includes("private-value"), false);
});

test("RED-PARITY-6 sequential and six-way wrappers normalize to identical auth semantics", () => {
  const sequential = normalizeAuthDiagnosticConfiguration({ concurrency: 1, authTimeoutMs: 20_000, tailMs: 5_000 });
  const batch = normalizeAuthDiagnosticConfiguration({ concurrency: 6, authTimeoutMs: 20_000, tailMs: 5_000 });
  assert.deepEqual(sequential.AUTH_SEMANTICS, batch.AUTH_SEMANTICS);
  assert.notEqual(sequential.BATCH_ORCHESTRATION, batch.BATCH_ORCHESTRATION);
});

let failures = 0;
for (const item of cases) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

console.log(JSON.stringify({
  PRE_18_ROOM_REPLAY_PARITY_DIAGNOSTIC_CHECK: failures ? "RED" : "PASS",
  DIAGNOSTIC_TEST_TOTAL: cases.length,
  DIAGNOSTIC_TEST_PASS: cases.length - failures,
  DIAGNOSTIC_TEST_FAIL: failures,
}, null, 2));
if (failures) process.exitCode = 1;
