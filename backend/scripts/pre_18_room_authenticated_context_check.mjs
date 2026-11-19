/*
 * Focused RED/GREEN contract for fresh, isolated authenticated ROLE contexts.
 * This deliberately models harness lifecycle evidence only; it does not
 * fabricate product session data or interact with a live browser.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modulePath = "./lib/pre_18_authenticated_role_context.mjs";
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

async function auth() {
  return import(modulePath);
}

function baseline(overrides = {}) {
  return {
    expectedRole: "ROOM",
    tokenPresent: true,
    authRequestStarted: true,
    authResponse: { status: 200, role: "ROOM", tenantScopeProven: true, durationMs: 31 },
    clientSessionHydrated: true,
    roomShellRendered: true,
    sessionLoadingVisible: false,
    elapsedMs: 400,
    authTimeoutMs: 20_000,
    ...overrides,
  };
}

test("RED-AUTH-1 token presence is not authenticated-context readiness", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({
    authRequestStarted: false,
    authResponse: null,
    clientSessionHydrated: false,
    roomShellRendered: false,
    sessionLoadingVisible: true,
  }));
  assert.equal(result.ready, false);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, "AUTH_VERIFY_PENDING");
});

test("RED-AUTH-2 successful ROOM verification waits for client shell commit", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({
    clientSessionHydrated: false,
    roomShellRendered: false,
    sessionLoadingVisible: true,
  }));
  assert.equal(result.ready, false);
  assert.equal(result.reason, "AUTH_CLIENT_HYDRATION_PENDING");
});

test("RED-AUTH-3 old route deadline does not terminate a successful auth response", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({
    clientSessionHydrated: false,
    roomShellRendered: false,
    sessionLoadingVisible: true,
    elapsedMs: 15_000,
    authTimeoutMs: 20_000,
    oldRouteDeadlineElapsed: true,
  }));
  assert.equal(result.ready, false);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, "AUTH_CLIENT_HYDRATION_PENDING");
});

test("RED-AUTH-4 HTTP 401 has an explicit terminal", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: { status: 401 } }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_401"]);
});

test("RED-AUTH-5 HTTP 403 has an explicit terminal", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: { status: 403 } }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_403"]);
});

test("RED-AUTH-6 HTTP 429 has an explicit terminal", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: { status: 429 } }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_429"]);
});

test("RED-AUTH-7 server failures have an explicit terminal", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: { status: 503 } }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_SERVER_ERROR"]);
});

test("RED-AUTH-8 failed or aborted verification is explicit", async () => {
  const lib = await auth();
  const failed = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: null, requestFailed: true }));
  const aborted = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: null, requestAborted: true }));
  assert.deepEqual([failed.terminal, failed.reason], [true, "AUTH_REQUEST_FAILED"]);
  assert.deepEqual([aborted.terminal, aborted.reason], [true, "AUTH_REQUEST_ABORTED"]);
});

test("RED-AUTH-9 a verified different role cannot proceed", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: { status: 200, role: "SUPER_ADMIN", tenantScopeProven: true } }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_ROLE_MISMATCH"]);
});

test("RED-AUTH-9b a matching role without proven tenant scope cannot proceed", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({ authResponse: { status: 200, role: "ROOM", tenantScopeProven: false } }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_TENANT_SCOPE_MISSING"]);
});

test("RED-AUTH-10 a ROOM response without hydration hits an auth-specific timeout", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({
    clientSessionHydrated: false,
    roomShellRendered: false,
    sessionLoadingVisible: true,
    elapsedMs: 20_000,
    authTimeoutMs: 20_000,
  }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_CLIENT_HYDRATION_TIMEOUT"]);
});

test("RED-AUTH-11 fresh ROOM evidence rejects inherited SUPER_ADMIN state", async () => {
  const lib = await auth();
  const result = lib.evaluateAuthenticatedContextReadiness(baseline({ inheritedRole: "SUPER_ADMIN" }));
  assert.deepEqual([result.terminal, result.reason], [true, "AUTH_CROSS_ROLE_STATE"]);
});

test("RED-AUTH-12 contract route readiness may start only after authenticated context readiness", async () => {
  const lib = await auth();
  assert.equal(lib.mayStartContractRouteReadiness(baseline({ clientSessionHydrated: false, roomShellRendered: false })), false);
  assert.equal(lib.mayStartContractRouteReadiness(baseline()), true);
});

test("RED-AUTH-13 mutation interception is not installed during auth bootstrap", async () => {
  const lib = await auth();
  assert.deepEqual(lib.mutationInterceptionPolicy("AUTH_BOOTSTRAP"), { install: false, abortMutationMethods: false });
  assert.deepEqual(lib.mutationInterceptionPolicy("CONTRACT_ROUTE"), { install: true, abortMutationMethods: true });
});

test("RED-AUTH-14 telemetry is secret-free", async () => {
  const lib = await auth();
  const telemetry = lib.toSafeAuthTelemetry({
    expectedRole: "ROOM",
    token: "secret-token-must-not-appear",
    credentials: { password: "demo123" },
    authResponse: { status: 200, role: "ROOM", roomId: 17, tenantScopeProven: true, durationMs: 22 },
    clientSessionHydrated: true,
    roomShellRendered: true,
  });
  assert.equal(JSON.stringify(telemetry).includes("secret-token-must-not-appear"), false);
  assert.equal(JSON.stringify(telemetry).includes("demo123"), false);
  assert.deepEqual(telemetry, {
    expectedRole: "ROOM",
    authStatus: 200,
    authRole: "ROOM",
    tenantScopeProven: true,
    authDurationMs: 22,
    clientSessionHydrated: true,
    roomShellRendered: true,
  });
});

test("RED-AUTH-15 read-only browser policy allows transport posts but classifies business mutations", async () => {
  const lib = await auth();
  assert.equal(lib.classifyReadOnlyBrowserRequest({ method: "GET", url: "http://127.0.0.1:3000/api/room/shifts" }).isBusinessMutation, false);
  assert.equal(lib.classifyReadOnlyBrowserRequest({ method: "POST", url: "http://127.0.0.1:3000/api/auth/login" }).isBusinessMutation, false);
  assert.equal(lib.classifyReadOnlyBrowserRequest({ method: "POST", url: "http://127.0.0.1:3000/api/ai/copilot" }).isBusinessMutation, false);
  assert.equal(lib.classifyReadOnlyBrowserRequest({ method: "POST", url: "http://127.0.0.1:3000/api/agreements" }).isBusinessMutation, true);
  assert.equal(lib.classifyReadOnlyBrowserRequest({ method: "PUT", url: "http://127.0.0.1:3000/api/shifts/168" }).isBusinessMutation, true);
  const ledger = lib.createReadOnlyBrowserRequestLedger();
  ledger.record({ method: "POST", url: "http://127.0.0.1:3000/api/agreements", blocked: true });
  ledger.record({ method: "GET", url: "http://127.0.0.1:3000/api/room/shifts" });
  assert.deepEqual(ledger.snapshot(), {
    requestCount: 2,
    businessMutationAttemptCount: 1,
    businessMutationExecutionCount: 0,
    blockedMutationAttemptCount: 1,
  });
});

test("RED-AUTH-16 responsive acceptance accepts only the canonical exact viewports", async () => {
  const lib = await auth();
  assert.deepEqual(lib.resolveAcceptanceViewport("desktop"), { safe: true, name: "desktop", width: 1440, height: 900 });
  assert.deepEqual(lib.resolveAcceptanceViewport("mobile390"), { safe: true, name: "mobile390", width: 390, height: 844 });
  assert.deepEqual(lib.resolveAcceptanceViewport("mobile320"), { safe: true, name: "mobile320", width: 320, height: 844 });
  assert.deepEqual(lib.resolveAcceptanceViewport("mobile"), { safe: false, name: "mobile", reason: "UNSUPPORTED_VIEWPORT" });
});

test("RED-AUTH-17 browser acceptance fails closed without a verified current runtime receipt", async () => {
  const lib = await auth();
  assert.equal(lib.evaluateRuntimeFreshnessProof().safe, false);
  const valid = lib.evaluateRuntimeFreshnessProof({
    receiptVerified: true,
    receipt: {
      finalStatus: "PASS",
      sourceMutation: false,
      startManifestSha256: "A".repeat(64),
      endManifestSha256: "A".repeat(64),
      suiteResults: [{ businessWriteExecution: 0, authorizationMutation: 0, downstreamBusinessWrite: 0 }],
      runtimeBinding: {
        runtimeKind: "DOCKER",
        bindingSchemaVersion: "M18-DOCKER-RUNTIME-BINDING-V2",
        containerName: "personel_api",
        imageId: `sha256:${"b".repeat(64)}`,
        port: 3000,
        hostPort: 3000,
        containerPort: 3000,
        hostPortOwnerPids: [58340],
        hostPortOwnerProcesses: ["com.docker.backend"],
        hostPortOwnerSource: "WINDOWS_GET_NET_TCP_CONNECTION",
        hostPortOwnerObservation: "VERIFIED_HOST_SOCKET_OWNERS",
        hostPortForwardingMode: "DOCKER_DESKTOP_PROXY",
        hostPortBindingAddresses: ["0.0.0.0", "::"],
        hostPortListenerAddresses: [":::3000"],
        hostPortForwarders: [{ localAddress: ":::3000", owningProcess: 58340, process: "com.docker.backend" }],
        pidObservationSource: "docker-exec-procfs",
        processPidNamespace: "CONTAINER",
        pidStableAcrossProbe: true,
        containerLaunchCommand: "sh -lc npm run dev",
        containerPid: 31,
        healthStatus: "PASS",
        healthEndpoint: "http://127.0.0.1:3000/health",
        sourceManifestSha256: "A".repeat(64),
        sourceIdentity: "C".repeat(64),
        sourceContractBindingSha256: "D".repeat(64),
        containerSourceIdentity: "C".repeat(64),
        containerSourceContractBindingSha256: "D".repeat(64),
        containerId: "a".repeat(64),
        containerProcessCommand: "node src/server.js",
        containerProcessCwd: "/app/backend",
        containerProcessStartTime: "proc-stat-starttime:12345",
        containerProcessStartTimeTicks: 12345,
        containerProcessStartTimeSource: "PROC_STAT_STARTTIME",
        mountType: "bind",
        mountTarget: "/app",
        runtimeObservedAfterManifest: true,
        staleListener: false,
        startedAfterManifest: true,
      },
    },
  });
  assert.equal(valid.safe, true);
});

test("RED-AUTH-18 continuation browser defaults to the canonical Vite port", async () => {
  const source = readFileSync(resolve("backend/scripts/m18_dlevel_continue_browser_smoke_01.mjs"), "utf8");
  assert.match(source, /process\.env\.WEB_BASE_URL\s*\|\|\s*['"]http:\/\/127\.0\.0\.1:5173['"]/u);
});

test("RED-AUTH-19 runtime freshness rejects incomplete Docker binding identity", async () => {
  const lib = await auth();
  const proof = {
    finalStatus: "PASS",
    sourceMutation: false,
    startManifestSha256: "A".repeat(64),
    endManifestSha256: "A".repeat(64),
    suiteResults: [{ businessWriteExecution: 0, authorizationMutation: 0, downstreamBusinessWrite: 0 }],
      runtimeBinding: {
        runtimeKind: "DOCKER",
        bindingSchemaVersion: "M18-DOCKER-RUNTIME-BINDING-V2",
        containerName: "other_container",
        imageId: `sha256:${"b".repeat(64)}`,
        port: 3000,
        hostPort: 3000,
        containerPort: 3000,
        hostPortOwnerPids: [58340],
        hostPortOwnerProcesses: ["com.docker.backend"],
        hostPortOwnerSource: "WINDOWS_GET_NET_TCP_CONNECTION",
        hostPortOwnerObservation: "VERIFIED_HOST_SOCKET_OWNERS",
        hostPortForwardingMode: "DOCKER_DESKTOP_PROXY",
        hostPortBindingAddresses: ["0.0.0.0", "::"],
        hostPortListenerAddresses: [":::3000"],
        hostPortForwarders: [{ localAddress: ":::3000", owningProcess: 58340, process: "com.docker.backend" }],
        pidObservationSource: "docker-exec-procfs",
        processPidNamespace: "CONTAINER",
        pidStableAcrossProbe: true,
        containerLaunchCommand: "sh -lc npm run dev",
        containerPid: 31,
        healthStatus: "PASS",
        healthEndpoint: "http://127.0.0.1:3000/health",
        sourceManifestSha256: "A".repeat(64),
        sourceIdentity: "C".repeat(64),
        sourceContractBindingSha256: "D".repeat(64),
        containerSourceIdentity: "C".repeat(64),
        containerSourceContractBindingSha256: "D".repeat(64),
        containerId: "a".repeat(64),
        containerProcessCommand: "node src/server.js",
        containerProcessCwd: "/app/backend",
        containerProcessStartTime: "proc-stat-starttime:12345",
        containerProcessStartTimeTicks: 12345,
        containerProcessStartTimeSource: "PROC_STAT_STARTTIME",
        mountType: "bind",
        mountTarget: "/app",
        runtimeObservedAfterManifest: true,
        staleListener: false,
        startedAfterManifest: true,
      },
  };
  assert.equal(lib.evaluateRuntimeFreshnessProof({ receiptVerified: true, receipt: proof }).safe, false);
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
  PRE_18_ROOM_AUTHENTICATED_CONTEXT_CHECK: failures ? "RED" : "PASS",
  AUTH_RED_TEST_COUNT: cases.length,
  AUTH_RED_OBSERVED_COUNT: failures,
  FOCUSED_TEST_TOTAL: cases.length,
  FOCUSED_TEST_PASS: cases.length - failures,
  FOCUSED_TEST_FAIL: failures,
}, null, 2));
if (failures) process.exitCode = 1;
