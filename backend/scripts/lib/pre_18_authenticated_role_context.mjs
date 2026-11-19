/*
 * Shared, harness-only contract for a fresh authenticated role context.
 * A browser token is merely bootstrap material; it does not become an
 * authenticated context until the real profile response and client shell are
 * both observed.  Values returned from this module are deliberately safe to
 * persist in evidence artifacts.
 */

function normalizedRole(value) {
  return String(value || "").trim().toUpperCase();
}

function statusOf(response) {
  const value = Number(response?.status || 0);
  return Number.isFinite(value) ? value : 0;
}

/* Exact36's trusted-local browser topology is deliberately finite.  The
 * browser may see the Vite proxy while the same /api/me request is served by
 * the direct local API behind it.  This is harness evidence only: it neither
 * changes product authorization nor treats arbitrary localhost origins as
 * trusted. */
export const TRUSTED_LOCAL_API_ME_ORIGINS = Object.freeze([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
]);

function trustedLocalApiMeRequest({ method = "GET", url = "" } = {}) {
  let parsed = null;
  try { parsed = new URL(String(url || "")); } catch {}
  const origin = parsed?.origin || "";
  const pathname = parsed?.pathname || "";
  const methodAccepted = String(method || "GET").toUpperCase() === "GET";
  const trustedOrigin = TRUSTED_LOCAL_API_ME_ORIGINS.includes(origin);
  const exactPath = pathname === "/api/me";
  return {
    accepted: methodAccepted && trustedOrigin && exactPath,
    origin,
    pathname,
    methodAccepted,
    trustedOrigin,
    exactPath,
  };
}

function tenantScopeFromApiMe(expectedRole, payload) {
  const role = normalizedRole(expectedRole);
  if (role === "ROOM") return Number(payload?.roomId || 0) > 0;
  return Number(payload?.companyId || 0) > 0 || Number(payload?.roomId || 0) > 0;
}

export function evaluateTrustedLocalApiMeRequest(value = {}) {
  return trustedLocalApiMeRequest(value);
}

/* A URL match is only the first boundary.  Readiness accepts an observed
 * profile response only when status, role, and tenant proof independently
 * satisfy the requested role contract. */
export function evaluateTrustedLocalApiMeAuthResponse({
  method = "GET",
  url = "",
  status = 0,
  payload = null,
  expectedRole = "",
} = {}) {
  const request = trustedLocalApiMeRequest({ method, url });
  const numericStatus = Number(status || 0);
  const authRole = normalizedRole(payload?.role) || null;
  const expected = normalizedRole(expectedRole);
  const successful = numericStatus === 200;
  const roleMatches = Boolean(expected && authRole === expected);
  const tenantScopeProven = successful && roleMatches && tenantScopeFromApiMe(expected, payload);
  return {
    accepted: request.accepted && successful && roleMatches && tenantScopeProven,
    requestAccepted: request.accepted,
    trustedOrigin: request.trustedOrigin,
    exactPath: request.exactPath,
    successful,
    authRole,
    tenantScopeProven,
    status: Number.isFinite(numericStatus) ? numericStatus : 0,
  };
}

function terminal(reason) {
  return { ready: false, terminal: true, reason };
}

function pending(reason) {
  return { ready: false, terminal: false, reason };
}

function toFiniteMs(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function relativeMs(startedAt, at) {
  return Math.max(0, toFiniteMs(at, Date.now()) - toFiniteMs(startedAt, 0));
}

function cloneSafe(value) {
  try { return JSON.parse(JSON.stringify(value ?? null)); } catch { return null; }
}

function safeUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "";
  }
}

function requestClassifications({ url, resourceType } = {}) {
  const safe = safeUrl(url);
  let pathname = "";
  try { pathname = new URL(String(url || "")).pathname; } catch {}
  const type = String(resourceType || "").toLowerCase();
  const isApiMe = pathname === "/api/me";
  const resource = isApiMe
    ? "API"
    : type === "document"
      ? "HTML_DOCUMENT"
      : type === "script" || /\.m?js$/iu.test(pathname)
        ? "JS_BUNDLE"
        : type === "stylesheet" || /\.css$/iu.test(pathname)
          ? "CSS"
          : /^(image|font|media)$/iu.test(type) || /\.(?:png|jpe?g|svg|webp|gif|woff2?|ttf)$/iu.test(pathname)
            ? "ASSET"
            : pathname.startsWith("/api/")
              ? "OTHER_API"
              : "OTHER";
  return {
    SAFE_URL: safe,
    URL_CLASSIFICATION: isApiMe ? "API_ME" : pathname.startsWith("/api/") ? "OTHER_API" : "NON_API",
    RESOURCE_CLASSIFICATION: resource,
  };
}

/*
 * Harness-only recorder for a controlled auth/bootstrap diagnostic.  It is
 * deliberately passive: callers record observations, while the original
 * readiness verdict remains the source of truth.  No token, response body,
 * request query, or credentials are accepted into persisted output.
 */
export function createAuthDiagnosticRecorder({ startedAt = Date.now(), tailMs = 5_000 } = {}) {
  const origin = toFiniteMs(startedAt, Date.now());
  const events = [];
  const requestLifecycle = [];
  const first = Object.create(null);
  const last = Object.create(null);
  let deadline = null;
  let lastObservation = null;

  const mark = (name, at = Date.now(), extra = {}) => {
    const event = { EVENT: String(name || "UNKNOWN"), MS: relativeMs(origin, at), ...cloneSafe(extra) };
    events.push(event);
    first[event.EVENT] ??= event.MS;
    last[event.EVENT] = event.MS;
    return event;
  };

  const afterDeadline = (at) => deadline && relativeMs(origin, at) > deadline.MS;

  const recordObservation = ({ at = Date.now(), snapshot = {} } = {}) => {
    const observed = cloneSafe(snapshot) || {};
    lastObservation = observed;
    const eventAt = toFiniteMs(at, Date.now());
    if (observed.TOKEN_DEVICE_SEEDED === true) mark("TOKEN_DEVICE_SEEDED", eventAt);
    if (observed.NAV_DOCK_VISIBLE === true) mark("AUTH_NAV_MARKER_FIRST_VISIBLE", eventAt);
    if (observed.ROOM_TASK_HOME_VISIBLE === true) mark("ROOM_HOME_MARKER_FIRST_VISIBLE", eventAt);
    if (observed.CACHED_SESSION_PRESENT === true) mark("CACHED_SESSION_WRITE_OBSERVED", eventAt);
    if (observed.GENERIC_LOADING_PRESENT === true) {
      mark("GENERIC_LOADING_FIRST_VISIBLE", eventAt);
      mark("GENERIC_LOADING_LAST_VISIBLE", eventAt);
    }
    if (observed.SESSION_LOADING_PRESENT === true) {
      mark("SESSION_LOADING_FIRST_VISIBLE", eventAt);
      mark("SESSION_LOADING_LAST_VISIBLE", eventAt);
    }
    if (observed.ROOM_SHELL_PREDICATE_RESULT === true) mark("ROOM_SHELL_PREDICATE_TRUE", eventAt);
    if (observed.ROUTE_CONTENT_PREDICATE_RESULT === true) mark("ROUTE_CONTENT_PREDICATE_TRUE", eventAt);
    if (afterDeadline(eventAt)) {
      const navAppeared = deadline.BASELINE.NAV_DOCK_VISIBLE !== true && observed.NAV_DOCK_VISIBLE === true;
      const homeAppeared = deadline.BASELINE.ROOM_TASK_HOME_VISIBLE !== true && observed.ROOM_TASK_HOME_VISIBLE === true;
      const loadingCleared = deadline.BASELINE.GENERIC_LOADING_PRESENT === true && observed.GENERIC_LOADING_PRESENT === false;
      deadline.POST_DEADLINE.NAV_SHELL_APPEARED_AFTER_DEADLINE ||= navAppeared;
      deadline.POST_DEADLINE.ROOM_HOME_APPEARED_AFTER_DEADLINE ||= homeAppeared;
      deadline.POST_DEADLINE.GENERIC_LOADING_CLEARED_AFTER_DEADLINE ||= loadingCleared;
      if (deadline.POST_DEADLINE.TIME_TO_EVENT_MS == null && (navAppeared || homeAppeared || loadingCleared)) {
        deadline.POST_DEADLINE.TIME_TO_EVENT_MS = relativeMs(origin, eventAt) - deadline.MS;
      }
    }
  };

  const recordRequest = (eventName, { at = Date.now(), url, resourceType, status = null, aborted = false } = {}) => {
    const eventAt = toFiniteMs(at, Date.now());
    const classifications = requestClassifications({ url, resourceType });
    const event = {
      EVENT: eventName,
      MS: relativeMs(origin, eventAt),
      RESOURCE_TYPE: String(resourceType || "unknown"),
      ...classifications,
      STATUS: Number.isFinite(Number(status)) ? Number(status) : null,
      ABORTED: aborted === true,
    };
    requestLifecycle.push(event);
    mark(`REQUEST_${eventName}`, eventAt, { RESOURCE_CLASSIFICATION: event.RESOURCE_CLASSIFICATION, URL_CLASSIFICATION: event.URL_CLASSIFICATION });
    if (eventName === "START") first.FIRST_RESOURCE_REQUEST ??= event.MS;
    if (event.URL_CLASSIFICATION === "API_ME") {
      if (eventName === "START") mark("AUTH_ME_REQUEST_START", eventAt);
      if (eventName === "HEADERS") mark("AUTH_ME_RESPONSE_HEADERS", eventAt, { STATUS: event.STATUS });
      if (eventName === "END") mark("AUTH_ME_RESPONSE_END", eventAt, { STATUS: event.STATUS });
    }
    if (event.URL_CLASSIFICATION === "API_ME" && afterDeadline(eventAt)) {
      deadline.POST_DEADLINE.AUTH_ME_STARTED_AFTER_DEADLINE ||= eventName === "START";
      deadline.POST_DEADLINE.AUTH_ME_COMPLETED_AFTER_DEADLINE ||= eventName === "END" && event.STATUS === 200;
      if (deadline.POST_DEADLINE.TIME_TO_EVENT_MS == null) deadline.POST_DEADLINE.TIME_TO_EVENT_MS = event.MS - deadline.MS;
    }
    return event;
  };

  const captureDeadline = ({ at = Date.now(), verdict, sample } = {}) => {
    const eventAt = toFiniteMs(at, Date.now());
    deadline = {
      MS: relativeMs(origin, eventAt),
      VERDICT_AT_20S: cloneSafe(verdict),
      FINAL_TIMEOUT_SAMPLE: cloneSafe(sample),
      BASELINE: {
        NAV_DOCK_VISIBLE: sample?.NAV_DOCK_VISIBLE === true,
        ROOM_TASK_HOME_VISIBLE: sample?.ROOM_TASK_HOME_VISIBLE === true,
        GENERIC_LOADING_PRESENT: sample?.GENERIC_LOADING_PRESENT === true,
      },
      POST_DEADLINE: {
        AUTH_ME_STARTED_AFTER_DEADLINE: false,
        AUTH_ME_COMPLETED_AFTER_DEADLINE: false,
        NAV_SHELL_APPEARED_AFTER_DEADLINE: false,
        ROOM_HOME_APPEARED_AFTER_DEADLINE: false,
        GENERIC_LOADING_CLEARED_AFTER_DEADLINE: false,
        TIME_TO_EVENT_MS: null,
      },
    };
    mark("DEADLINE_REACHED", eventAt);
    return deadline;
  };

  const finish = ({ at = Date.now() } = {}) => {
    mark("DIAGNOSTIC_FINISHED", at);
    const deadlineMs = deadline?.MS ?? null;
    const apiMe = requestLifecycle.filter((item) => item.URL_CLASSIFICATION === "API_ME");
    const starts = apiMe.filter((item) => item.EVENT === "START");
    const ends = apiMe.filter((item) => item.EVENT === "END");
    const failed = apiMe.filter((item) => item.EVENT === "FAILED");
    const startedBeforeDeadline = deadlineMs == null ? starts : starts.filter((item) => item.MS <= deadlineMs);
    const completedBeforeDeadline = deadlineMs == null ? ends : ends.filter((item) => item.MS <= deadlineMs);
    const firstStart = starts[0] || null;
    const lastEnd = ends.at(-1) || null;
    const pendingAtDeadline = deadlineMs != null && startedBeforeDeadline.length > completedBeforeDeadline.length;
    return {
      TIMELINE: { EVENTS: events, FIRST_MS: first, LAST_MS: last },
      REQUEST_LIFECYCLE: requestLifecycle,
      VERDICT_AT_20S: deadline?.VERDICT_AT_20S || null,
      FINAL_TIMEOUT_SAMPLE: deadline?.FINAL_TIMEOUT_SAMPLE || null,
      POST_DEADLINE: deadline?.POST_DEADLINE || null,
      AUTH_ME: {
        REQUEST_STARTED: starts.length > 0,
        REQUEST_START_MS: firstStart?.MS ?? null,
        RESPONSE_STATUS: lastEnd?.STATUS ?? null,
        RESPONSE_END_MS: lastEnd?.MS ?? null,
        REQUEST_FAILED: failed.length > 0,
        REQUEST_ABORTED: failed.some((item) => item.ABORTED === true),
        REQUEST_PENDING_AT_DEADLINE: pendingAtDeadline,
        REQUEST_STARTED_AFTER_OLD_DEADLINE: deadline?.POST_DEADLINE?.AUTH_ME_STARTED_AFTER_DEADLINE === true,
      },
      LAST_OBSERVATION: lastObservation,
      TAIL_CAN_RECLASSIFY_VERDICT: false,
    };
  };

  return {
    startedAt: origin,
    tailMs: Math.max(0, toFiniteMs(tailMs, 5_000)),
    mark,
    recordObservation,
    recordRequestStart: (value) => recordRequest("START", value),
    recordResponseHeaders: (value) => recordRequest("HEADERS", value),
    recordResponseEnd: (value) => recordRequest("END", value),
    recordRequestFailed: (value) => recordRequest("FAILED", value),
    captureDeadline,
    finish,
  };
}

export function normalizeAuthDiagnosticConfiguration({ concurrency = 1, authTimeoutMs = 20_000, tailMs = 5_000 } = {}) {
  return {
    AUTH_SEMANTICS: {
      bootstrapRoute: "/room",
      authTimeoutMs: Math.max(1, toFiniteMs(authTimeoutMs, 20_000)),
      readinessContract: "AUTH_VERIFY+CACHED_SESSION+SESSION_LOADING_ABSENT+GLOBAL_AUTHENTICATED_ROOM_SHELL",
      requestInterceptionDuringAuth: false,
    },
    BATCH_ORCHESTRATION: Number(concurrency) === 1 ? "SEQUENTIAL" : "BATCHED",
    DIAGNOSTIC_TAIL_MS: Math.max(0, toFiniteMs(tailMs, 5_000)),
  };
}

export function evaluateAuthenticatedContextReadiness({
  expectedRole,
  tokenPresent,
  authRequestStarted,
  authResponse,
  requestFailed = false,
  requestAborted = false,
  inheritedRole = null,
  clientSessionHydrated = false,
  roomShellRendered = false,
  cachedSessionObserved = clientSessionHydrated,
  globalRoomShellRendered = roomShellRendered,
  sessionLoadingVisible = true,
  elapsedMs = 0,
  authTimeoutMs = 20_000,
} = {}) {
  const role = normalizedRole(expectedRole);
  const elapsed = Math.max(0, Number(elapsedMs || 0) || 0);
  const timeout = Math.max(1, Number(authTimeoutMs || 0) || 20_000);
  const responseStatus = statusOf(authResponse);

  if (!tokenPresent) return terminal("AUTH_TOKEN_MISSING");
  if (inheritedRole && normalizedRole(inheritedRole) !== role) return terminal("AUTH_CROSS_ROLE_STATE");
  if (requestFailed) return terminal("AUTH_REQUEST_FAILED");
  if (requestAborted) return terminal("AUTH_REQUEST_ABORTED");

  if (responseStatus === 401) return terminal("AUTH_401");
  if (responseStatus === 403) return terminal("AUTH_403");
  if (responseStatus === 429) return terminal("AUTH_429");
  if (responseStatus >= 500) return terminal("AUTH_SERVER_ERROR");
  if (responseStatus && responseStatus !== 200) return terminal("AUTH_UNEXPECTED_RESPONSE");

  if (!authRequestStarted) {
    return elapsed >= timeout ? terminal("AUTH_VERIFY_NOT_STARTED_TIMEOUT") : pending("AUTH_VERIFY_PENDING");
  }
  if (!responseStatus) {
    return elapsed >= timeout ? terminal("AUTH_VERIFY_PENDING_TIMEOUT") : pending("AUTH_VERIFY_PENDING");
  }
  if (normalizedRole(authResponse?.role) !== role) return terminal("AUTH_ROLE_MISMATCH");
  if (authResponse?.tenantScopeProven !== true) return terminal("AUTH_TENANT_SCOPE_MISSING");

  if (!cachedSessionObserved) {
    return elapsed >= timeout ? terminal("AUTH_CLIENT_HYDRATION_TIMEOUT") : pending("AUTH_CLIENT_HYDRATION_PENDING");
  }
  if (sessionLoadingVisible) {
    return elapsed >= timeout ? terminal("AUTH_SESSION_LOADING_TIMEOUT") : pending("AUTH_SESSION_LOADING_ACTIVE");
  }
  if (!globalRoomShellRendered) {
    return elapsed >= timeout ? terminal("AUTH_ROOM_SHELL_TIMEOUT") : pending("AUTH_ROOM_SHELL_PENDING");
  }
  return { ready: true, terminal: false, reason: "AUTHENTICATED_CONTEXT_READY", stage: "AUTH_BOUNDARY_COMPLETE" };
}

export function mayStartContractRouteReadiness(observation = {}) {
  return evaluateAuthenticatedContextReadiness(observation).ready === true;
}

export function mutationInterceptionPolicy(stage) {
  if (String(stage || "") === "CONTRACT_ROUTE") {
    return { install: true, abortMutationMethods: true };
  }
  return { install: false, abortMutationMethods: false };
}

const READ_ONLY_METHODS = Object.freeze(["GET", "HEAD", "OPTIONS"]);
const READ_ONLY_TRANSPORT_PATHS = Object.freeze([
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/ai/copilot",
]);

function safeRequestPath(url) {
  try {
    const pathname = new URL(String(url || "")).pathname || "/";
    return pathname.replace(/\/+$/u, "") || "/";
  } catch {
    return "";
  }
}

export function classifyReadOnlyBrowserRequest({ method = "GET", url = "" } = {}) {
  const normalizedMethod = String(method || "GET").trim().toUpperCase();
  const pathname = safeRequestPath(url);
  const methodIsReadOnly = READ_ONLY_METHODS.includes(normalizedMethod);
  const transportPostAllowed = normalizedMethod === "POST" && READ_ONLY_TRANSPORT_PATHS.includes(pathname);
  return {
    method: normalizedMethod,
    pathname,
    transportPostAllowed,
    isBusinessMutation: !methodIsReadOnly && !transportPostAllowed,
  };
}

export function createReadOnlyBrowserRequestLedger() {
  const entries = [];
  return {
    record({ method = "GET", url = "", blocked = false } = {}) {
      const classification = classifyReadOnlyBrowserRequest({ method, url });
      entries.push({ ...classification, blocked: blocked === true });
      return classification;
    },
    snapshot() {
      const mutationEntries = entries.filter((entry) => entry.isBusinessMutation);
      return {
        requestCount: entries.length,
        businessMutationAttemptCount: mutationEntries.length,
        businessMutationExecutionCount: mutationEntries.filter((entry) => !entry.blocked).length,
        blockedMutationAttemptCount: mutationEntries.filter((entry) => entry.blocked).length,
      };
    },
  };
}

const ACCEPTANCE_VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 900 }),
  mobile390: Object.freeze({ width: 390, height: 844 }),
  mobile320: Object.freeze({ width: 320, height: 844 }),
});

export function resolveAcceptanceViewport(name = "desktop") {
  const normalized = String(name || "").trim().toLowerCase();
  const viewport = ACCEPTANCE_VIEWPORTS[normalized];
  return viewport
    ? { safe: true, name: normalized, ...viewport }
    : { safe: false, name: normalized, reason: "UNSUPPORTED_VIEWPORT" };
}

export function evaluateRuntimeFreshnessProof({
  receiptVerified = false,
  receipt = null,
  expectedRuntimeKind = "DOCKER",
  expectedPort = 3000,
} = {}) {
  const reasons = [];
  const runtime = receipt?.runtimeBinding || {};
  const expectedKind = String(expectedRuntimeKind || "DOCKER").trim().toUpperCase();
  const expectedPortNumber = Number(expectedPort);
  if (receiptVerified !== true) reasons.push("RUNTIME_PROVENANCE_RECEIPT_NOT_VERIFIED");
  if (receipt?.finalStatus !== "PASS") reasons.push("RUNTIME_PROVENANCE_NOT_PASS");
  if (receipt?.sourceMutation !== false) reasons.push("RUNTIME_SOURCE_MUTATION_PRESENT");
  if (!receipt?.startManifestSha256 || receipt.startManifestSha256 !== receipt.endManifestSha256) {
    reasons.push("RUNTIME_SOURCE_MANIFEST_NOT_STABLE");
  }
  if (runtime.sourceManifestSha256 !== receipt?.startManifestSha256) reasons.push("RUNTIME_SOURCE_MANIFEST_BINDING_MISMATCH");
  if (String(runtime.runtimeKind || "").toUpperCase() !== expectedKind) reasons.push("RUNTIME_KIND_MISMATCH");
  if (Number(runtime.port) !== expectedPortNumber
    || Number(runtime.hostPort) !== expectedPortNumber
    || Number(runtime.containerPort) !== expectedPortNumber) reasons.push("RUNTIME_PORT_MISMATCH");
  if (runtime.healthStatus !== "PASS") reasons.push("RUNTIME_HEALTH_NOT_PASS");
  if (runtime.containerName !== "personel_api") reasons.push("RUNTIME_CONTAINER_NAME_MISMATCH");
  if (!/^[a-f0-9]{64}$/iu.test(String(runtime.containerId || ""))) reasons.push("RUNTIME_CONTAINER_ID_INVALID");
  if (!/^sha256:[a-f0-9]{64}$/iu.test(String(runtime.imageId || ""))) reasons.push("RUNTIME_IMAGE_ID_INVALID");
  if (!runtime.containerProcessCommand || !runtime.containerProcessCwd || !runtime.containerProcessStartTime) {
    reasons.push("RUNTIME_PROCESS_IDENTITY_INCOMPLETE");
  }
  if (/\bnodemon\b/iu.test(String(runtime.containerProcessCommand || ""))
    || !/\bnode(?:\.exe)?\b/iu.test(String(runtime.containerProcessCommand || ""))
    || !/src[\\/]server\.js\b/iu.test(String(runtime.containerProcessCommand || ""))) {
    reasons.push("RUNTIME_PROCESS_COMMAND_INVALID");
  }
  if (String(runtime.containerProcessCwd || "") !== "/app/backend") reasons.push("RUNTIME_PROCESS_CWD_INVALID");
  if (runtime.containerProcessStartTimeSource !== "PROC_STAT_STARTTIME") reasons.push("RUNTIME_PROCESS_START_TIME_SOURCE_INVALID");
  if (!Number.isInteger(Number(runtime.containerProcessStartTimeTicks)) || Number(runtime.containerProcessStartTimeTicks) <= 0) {
    reasons.push("RUNTIME_PROCESS_START_TIME_TICKS_INVALID");
  }
  if (String(runtime.containerProcessStartTime || "") !== `proc-stat-starttime:${runtime.containerProcessStartTimeTicks}`) {
    reasons.push("RUNTIME_PROCESS_START_TIME_INVALID");
  }
  if (runtime.containerLaunchCommand && !/npm\s+run\s+dev/iu.test(String(runtime.containerLaunchCommand))) {
    reasons.push("RUNTIME_LAUNCH_COMMAND_INVALID");
  }
  if (runtime.pidObservationSource !== "docker-exec-procfs") reasons.push("RUNTIME_PID_OBSERVATION_SOURCE_INVALID");
  if (runtime.processPidNamespace !== "CONTAINER") reasons.push("RUNTIME_PID_NAMESPACE_INVALID");
  if (runtime.pidStableAcrossProbe !== true) reasons.push("RUNTIME_PID_NOT_STABLE");
  if (runtime.mountType !== "bind" || String(runtime.mountTarget || "") !== "/app") reasons.push("RUNTIME_MOUNT_BINDING_INVALID");
  if (runtime.healthEndpoint !== "http://127.0.0.1:3000/health") reasons.push("RUNTIME_HEALTH_ENDPOINT_INVALID");
  if (runtime.runtimeObservedAfterManifest !== true) reasons.push("RUNTIME_OBSERVATION_ORDER_INVALID");
  if (runtime.staleListener !== false) reasons.push("RUNTIME_STALE_LISTENER_NOT_CLEARED");
  if (!/^[A-F0-9]{64}$/u.test(String(runtime.sourceIdentity || ""))) reasons.push("RUNTIME_SOURCE_IDENTITY_INVALID");
  if (!/^[A-F0-9]{64}$/u.test(String(runtime.sourceContractBindingSha256 || ""))) reasons.push("RUNTIME_CONTRACT_BINDING_INVALID");
  if (runtime.containerSourceIdentity !== runtime.sourceIdentity) reasons.push("RUNTIME_CONTAINER_SOURCE_IDENTITY_MISMATCH");
  if (runtime.containerSourceContractBindingSha256 !== runtime.sourceContractBindingSha256) reasons.push("RUNTIME_CONTAINER_CONTRACT_BINDING_MISMATCH");
  if (!Array.isArray(runtime.hostPortOwnerPids) || !runtime.hostPortOwnerPids.length
    || !Array.isArray(runtime.hostPortOwnerProcesses) || !runtime.hostPortOwnerProcesses.length
    || runtime.hostPortOwnerSource !== "WINDOWS_GET_NET_TCP_CONNECTION"
    || runtime.hostPortOwnerObservation !== "VERIFIED_HOST_SOCKET_OWNERS"
    || runtime.hostPortForwardingMode !== "DOCKER_DESKTOP_PROXY") {
    reasons.push("RUNTIME_HOST_FORWARDER_IDENTITY_INCOMPLETE");
  }
  if (!Array.isArray(runtime.hostPortBindingAddresses) || !runtime.hostPortBindingAddresses.length
    || !Array.isArray(runtime.hostPortListenerAddresses) || !runtime.hostPortListenerAddresses.length
    || !Array.isArray(runtime.hostPortForwarders) || !runtime.hostPortForwarders.length) {
    reasons.push("RUNTIME_HOST_ADDRESS_BINDING_INCOMPLETE");
  }
  if (runtime.startedAfterManifest !== true) reasons.push("RUNTIME_START_ORDER_UNPROVEN");
  const suiteResults = Array.isArray(receipt?.suiteResults) ? receipt.suiteResults : [];
  if (!suiteResults.length) reasons.push("RUNTIME_SUITE_RESULT_MISSING");
  for (const [index, result] of suiteResults.entries()) {
    for (const counter of [
      "businessWriteExecution",
      "authorizationMutation",
      "downstreamBusinessWrite",
      "externalLlmProviderCount",
      "externalLlmNetworkCallCount",
      "llmApiSecretCount",
      "runtimeFallbackCount",
      "downstreamSemanticRedecisionCount",
      "shadowSemanticAuthorityCount",
    ]) {
      if (Number(result?.[counter] || 0) !== 0) reasons.push(`RUNTIME_NONZERO_${counter.toUpperCase()}_${index}`);
    }
  }
  return {
    safe: reasons.length === 0,
    failureReasons: [...new Set(reasons)],
    runtimeKind: String(runtime.runtimeKind || ""),
    port: Number(runtime.port || 0),
    sourceManifestSha256: String(receipt?.startManifestSha256 || ""),
  };
}

export function toSafeAuthTelemetry({
  expectedRole,
  authResponse,
  clientSessionHydrated = false,
  roomShellRendered = false,
} = {}) {
  return {
    expectedRole: normalizedRole(expectedRole),
    authStatus: statusOf(authResponse) || null,
    authRole: normalizedRole(authResponse?.role) || null,
    tenantScopeProven: authResponse?.tenantScopeProven === true,
    authDurationMs: Number.isFinite(Number(authResponse?.durationMs)) ? Number(authResponse.durationMs) : null,
    clientSessionHydrated: clientSessionHydrated === true,
    roomShellRendered: roomShellRendered === true,
  };
}
