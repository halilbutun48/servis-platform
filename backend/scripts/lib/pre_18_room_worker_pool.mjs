/*
 * Harness-only worker-pool contract for the ROOM residual-195 replay.
 * The model deliberately separates a single genuine login from up to six
 * authenticated browser contexts.  It contains no credential, token, or
 * product-state storage and does not change rate-limit behavior.
 */

export const ROOM_WORKER_CONCURRENCY_MAX = 6;
export const ROOM_GENERIC_READ_BUDGET_POLICY = Object.freeze({
  MAX: 120,
  WINDOW_MS: 60_000,
  COORDINATOR_ID: "RUN_LOCAL_GENERIC_READ_BUCKET",
});

let sharedCoordinatorInstanceSequence = 0;

function clean(value) {
  return String(value || "").trim();
}

function required(value, reason) {
  if (!clean(value)) throw new Error(reason);
  return clean(value);
}

function contractId(contract) {
  return required(contract?.ACTION_CONTRACT_ID || contract?.CONTRACT_ID, "WORKER_CONTRACT_ID_MISSING");
}

function normalizeWorkerCount(value, contractCount) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1) throw new Error("WORKER_COUNT_INVALID");
  if (count > ROOM_WORKER_CONCURRENCY_MAX) throw new Error("WORKER_COUNT_MAX_EXCEEDED");
  return Math.min(count, Math.max(1, contractCount));
}

export function assertRoomWorkerIdentity(worker = {}, expected = {}) {
  if (clean(worker.role).toUpperCase() !== clean(expected.role).toUpperCase()) {
    return { ok: false, reason: "WORKER_ROLE_REUSE_FORBIDDEN" };
  }
  if (clean(worker.tenantKey) !== clean(expected.tenantKey)) {
    return { ok: false, reason: "WORKER_TENANT_REUSE_FORBIDDEN" };
  }
  return { ok: true, reason: "WORKER_IDENTITY_MATCHES" };
}

export function deriveRoomWorkerResetExpectedIdentity(worker = {}) {
  return {
    expectedRole: required(worker?.ROLE || worker?.role, "WORKER_ROLE_MISSING").toUpperCase(),
    expectedTenantKey: required(worker?.TENANT_KEY || worker?.tenantKey, "WORKER_TENANT_KEY_MISSING"),
    source: "WORKER_POOL_AUTHENTICATED_IDENTITY",
  };
}

export function createRoomWorkerPoolPlan({ contracts = [], maxWorkers = ROOM_WORKER_CONCURRENCY_MAX, role = "ROOM", tenantKey } = {}) {
  const expectedRole = required(role, "WORKER_ROLE_MISSING").toUpperCase();
  const expectedTenantKey = required(tenantKey, "WORKER_TENANT_KEY_MISSING");
  if (!Array.isArray(contracts) || !contracts.length) throw new Error("WORKER_CONTRACTS_MISSING");
  const workerCount = normalizeWorkerCount(maxWorkers, contracts.length);
  const ids = new Set();
  const workers = Array.from({ length: workerCount }, (_, index) => ({
    WORKER_ID: `${expectedRole}-W${index + 1}`,
    ROLE: expectedRole,
    TENANT_KEY: expectedTenantKey,
    EXECUTION_MODE: "SEQUENTIAL",
    ASSIGNMENTS: [],
  }));

  let duplicateCount = 0;
  for (const contract of contracts) {
    const id = contractId(contract);
    if (ids.has(id)) {
      duplicateCount += 1;
      continue;
    }
    ids.add(id);
    const contractRole = clean(contract?.ROLE || expectedRole).toUpperCase();
    const contractTenant = clean(contract?.TENANT_KEY || expectedTenantKey);
    if (contractRole !== expectedRole) throw new Error("WORKER_CONTRACT_ROLE_MISMATCH");
    if (contractTenant !== expectedTenantKey) throw new Error("WORKER_CONTRACT_TENANT_MISMATCH");
    const worker = workers[(ids.size - 1) % workerCount];
    worker.ASSIGNMENTS.push({ ACTION_CONTRACT_ID: id, ROUTE: clean(contract?.ROUTE) });
  }

  const assignmentIds = workers.flatMap((worker) => worker.ASSIGNMENTS.map((assignment) => assignment.ACTION_CONTRACT_ID));
  const assignmentUnique = new Set(assignmentIds);
  const missingCount = [...ids].filter((id) => !assignmentUnique.has(id)).length;
  const assignmentDuplicateCount = assignmentIds.length - assignmentUnique.size + duplicateCount;
  return {
    ROLE: expectedRole,
    TENANT_KEY: expectedTenantKey,
    workers,
    accounting: {
      WORKER_COUNT: workerCount,
      WORKER_COUNT_MAX: ROOM_WORKER_CONCURRENCY_MAX,
      LOGIN_COUNT_PER_RUN: 1,
      AUTHENTICATED_CONTEXT_COUNT: workerCount,
      EXPECTED_MAX_API_ME_PROOFS: workerCount,
      CONTRACT_ASSIGNMENT_COUNT: assignmentIds.length,
      CONTRACT_ASSIGNMENT_DUPLICATE_COUNT: assignmentDuplicateCount,
      CONTRACT_ASSIGNMENT_MISSING_COUNT: missingCount,
      CROSS_ROLE_CONTEXT_REUSE_COUNT: 0,
      CROSS_TENANT_CONTEXT_REUSE_COUNT: 0,
      TOKEN_ARTIFACT_PERSISTENCE_COUNT: 0,
      SUPPORTED_REPLAY_WORKER_CONCURRENCY: ROOM_WORKER_CONCURRENCY_MAX,
    },
  };
}

export function evaluateRoomWorkerReset({
  role = "",
  tenantKey = "",
  expectedRole = "",
  expectedTenantKey = "",
  route = "",
  modalOpen = false,
  drawerOpen = false,
  popoverOpen = false,
  detailsOpen = false,
  filterActive = false,
  temporaryInputPresent = false,
  transientAssistantOpen = false,
  scrollAtOrigin = true,
} = {}) {
  const identity = assertRoomWorkerIdentity({ role, tenantKey }, { role: expectedRole, tenantKey: expectedTenantKey });
  if (!identity.ok) return { ready: false, reason: identity.reason === "WORKER_ROLE_REUSE_FORBIDDEN" ? "WORKER_ROLE_IDENTITY_LOST" : "WORKER_TENANT_IDENTITY_LOST" };
  if (clean(route) !== "/room") return { ready: false, reason: "WORKER_ROUTE_NOT_CLEAN" };
  if (modalOpen || drawerOpen || popoverOpen || detailsOpen || filterActive || temporaryInputPresent || transientAssistantOpen || !scrollAtOrigin) {
    return { ready: false, reason: "WORKER_TRANSIENT_STATE_REMAINS" };
  }
  return { ready: true, reason: "ROOM_WORKER_RESET_COMPLETE" };
}

function resetLeakageFromObserved(observed = {}) {
  const overlayDirty = Boolean(observed.modalOpen || observed.drawerOpen || observed.popoverOpen);
  const filterDirty = Boolean(observed.filterActive);
  const formDirty = Boolean(observed.temporaryInputPresent);
  const disclosureDirty = Boolean(observed.detailsOpen);
  const scrollDirty = observed.scrollAtOrigin === false;
  const assistantDirty = Boolean(observed.transientAssistantOpen);
  const harnessLocalDirty = Boolean(observed.harnessLocalDirty);
  const leakage = {
    CROSS_CONTRACT_OVERLAY_LEAK_COUNT: Number(overlayDirty),
    CROSS_CONTRACT_FILTER_LEAK_COUNT: Number(filterDirty),
    CROSS_CONTRACT_FORM_STATE_LEAK_COUNT: Number(formDirty),
    CROSS_CONTRACT_DISCLOSURE_LEAK_COUNT: Number(disclosureDirty),
    CROSS_CONTRACT_SCROLL_STATE_LEAK_COUNT: Number(scrollDirty),
    CROSS_CONTRACT_ASSISTANT_STATE_LEAK_COUNT: Number(assistantDirty),
    CONTRACT_LOCAL_HARNESS_STATE_LEAK_COUNT: Number(harnessLocalDirty),
  };
  leakage.CROSS_CONTRACT_STATE_LEAK_COUNT = Object.values(leakage).reduce((sum, value) => sum + Number(value || 0), 0);
  return {
    leakage,
    actualTransientStateLeak: leakage.CROSS_CONTRACT_STATE_LEAK_COUNT > 0,
    firstDirtyClass: overlayDirty ? "OVERLAY_DIRTY"
      : filterDirty ? "FILTER_DIRTY"
        : formDirty ? "FORM_DIRTY"
          : disclosureDirty ? "DISCLOSURE_DIRTY"
            : scrollDirty ? "SCROLL_DIRTY"
              : assistantDirty ? "ASSISTANT_STATE_DIRTY"
                : harnessLocalDirty ? "OTHER_RESET_PROOF_FAILURE"
                  : null,
  };
}

function resetFailureClass(reset, observed) {
  if (reset?.ready) return "RESET_COMPLETE";
  if (reset?.reason === "WORKER_ROLE_IDENTITY_LOST") return "ROLE_IDENTITY_FAILURE";
  if (reset?.reason === "WORKER_TENANT_IDENTITY_LOST") return "TENANT_IDENTITY_PROOF_FAILURE";
  if (reset?.reason === "WORKER_ROUTE_NOT_CLEAN") return "ROUTE_RESET_FAILURE";
  const state = resetLeakageFromObserved(observed);
  return state.firstDirtyClass || "OTHER_RESET_PROOF_FAILURE";
}

/*
 * The route99 runner consumes this wrapper rather than separately inventing
 * its expected tenant key.  It leaves evaluateRoomWorkerReset's policy and
 * compact return value intact for existing callers while persisting a precise
 * proof/failure classification for immutable canary evidence.
 */
export function evaluateRoomWorkerResetForPoolWorker({ worker = {}, observed = {} } = {}) {
  const identity = deriveRoomWorkerResetExpectedIdentity(worker);
  const actualRole = clean(observed.role || worker?.ROLE || worker?.role);
  const actualTenantKey = clean(observed.tenantKey || worker?.TENANT_KEY || worker?.tenantKey);
  const reset = evaluateRoomWorkerReset({
    ...observed,
    role: actualRole,
    tenantKey: actualTenantKey,
    expectedRole: identity.expectedRole,
    expectedTenantKey: identity.expectedTenantKey,
  });
  const state = resetLeakageFromObserved(observed);
  const failureClass = resetFailureClass(reset, observed);
  return {
    WORKER_ID: clean(worker?.WORKER_ID),
    RESET_EXPECTED_TENANT_SOURCE: identity.source,
    ACTUAL_ROLE: actualRole,
    EXPECTED_ROLE: identity.expectedRole,
    ACTUAL_TENANT_KEY: actualTenantKey,
    EXPECTED_TENANT_KEY: identity.expectedTenantKey,
    RESET_COMPLETED: reset.ready === true,
    RESET_REASON: reset.reason,
    RESET_FAILURE_CLASS: failureClass,
    ACTUAL_TRANSIENT_STATE_LEAK: state.actualTransientStateLeak,
    leakage: state.leakage,
  };
}

export function toSafeRoomWorkerArtifact(worker = {}) {
  return {
    WORKER_ID: clean(worker.WORKER_ID),
    ROLE: clean(worker.ROLE).toUpperCase(),
    TENANT_SCOPE_PROVEN: Boolean(clean(worker.TENANT_KEY)),
    AUTH_PROOF_REQUIRED: true,
  };
}

export function assertRateLimitPolicyInvariant({ max, windowMs, localhostBypass = false, testBypass = false } = {}) {
  if (Number(max) !== 120 || Number(windowMs) !== 60_000 || localhostBypass === true || testBypass === true) {
    return { ok: false, reason: "RATE_LIMIT_POLICY_CHANGED" };
  }
  return { ok: true, reason: "RATE_LIMIT_POLICY_UNCHANGED" };
}

function requestUrl(value) {
  try { return new URL(String(value || ""), "https://pre18.invalid"); } catch { return null; }
}

/*
 * This mirrors only the limiter-family routing in bootstrap/rateLimits.js.
 * It deliberately does not modify, bypass, or otherwise simulate product
 * rate limiting; it decides whether a harness request consumes the one
 * generic authenticated-read bucket shared by ROOM workers.
 */
export function classifyRoomRequestLimiterFamily({ method = "GET", url = "" } = {}) {
  const parsed = requestUrl(url);
  const verb = String(method || "GET").toUpperCase();
  const pathname = parsed?.pathname || "";
  if (!pathname.startsWith("/api/")) return "STATIC_OR_UNLIMITED";
  if (pathname === "/api/me" || pathname.startsWith("/api/auth/")) return "AUTH_SPECIAL";
  if (pathname.startsWith("/api/gps") || pathname.startsWith("/api/telematics")) return "SPECIAL_READ";
  if (verb !== "GET") return "MUTATION_OR_WRITE";

  const relative = pathname.slice("/api".length);
  const liveShiftRead = relative === "/shifts" && (
    parsed?.searchParams.get("onlyNow") === "1"
    || /(?:APPROVED|ACTIVE)/u.test(String(parsed?.searchParams.get("status") || ""))
  );
  const specialRead = relative === "/rooms"
    || relative === "/vehicles"
    || relative === "/agreements"
    || relative === "/offers/company"
    || relative === "/company/personels"
    || liveShiftRead
    || /^\/shifts\/\d+\/route-preview$/u.test(relative)
    || /^\/reports\/(shifts|drivers|vehicles|stops)\/summary$/u.test(relative)
    || relative === "/trust-quality/provider-scores"
    || relative === "/company/overview/workflow-summary"
    || relative === "/company/overview/commercial-flow-summary"
    || relative === "/trust-quality/company/summary"
    || relative === "/commercial-core"
    || relative.startsWith("/commercial-core/")
    || relative === "/trust-quality"
    || relative.startsWith("/trust-quality/")
    || relative === "/operation-proof"
    || relative.startsWith("/operation-proof/");
  return specialRead ? "SPECIAL_READ" : "GENERIC_READ";
}

function normalizedHeaders(headers = {}) {
  if (!headers || typeof headers !== "object") return {};
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [String(key).toLowerCase(), String(value ?? "").trim()]));
}

function positiveInteger(value) {
  const number = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/*
 * A run-local permit coordinator for the one user-keyed generic read bucket.
 * The only waits it can request are the exact local/server reset boundaries.
 * It stores no token or identity value and is intentionally ephemeral.
 */
export function createSharedAuthenticatedReadBudgetCoordinator({
  authenticatedScope = "",
  max = ROOM_GENERIC_READ_BUDGET_POLICY.MAX,
  windowMs = ROOM_GENERIC_READ_BUDGET_POLICY.WINDOW_MS,
  now = () => Date.now(),
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!clean(authenticatedScope)) throw new Error("SHARED_READ_BUDGET_AUTH_SCOPE_REQUIRED");
  if (Number(max) !== ROOM_GENERIC_READ_BUDGET_POLICY.MAX || Number(windowMs) !== ROOM_GENERIC_READ_BUDGET_POLICY.WINDOW_MS) {
    throw new Error("SHARED_READ_BUDGET_POLICY_MISMATCH");
  }
  /*
   * `confirmedUsed` is server evidence. `reservations` are permits already
   * granted by this harness but not yet reconciled by a terminal response.
   * Keeping them separate prevents a late response header from reopening
   * capacity that belongs to another in-flight worker request.
   */
  const state = {
    coordinatorInstanceId: `ROOM-GENERIC-COORDINATOR-${++sharedCoordinatorInstanceSequence}`,
    coordinatorInstances: new Set(),
    windowStartedAt: null,
    resetAt: null,
    confirmedUsed: 0,
    blockedUntil: null,
    seeded: false,
    headerPolicy: null,
    requestSequence: 0,
    resetOperationSequence: 0,
    requests: new Map(),
    resetOperations: new Map(),
    reservations: new Map(),
    waiters: new Map(),
    cancellationWaiters: new Map(),
    closingWorkers: new Set(),
    seedWaiters: new Set(),
    drainWaiters: new Set(),
    resetBarrierWaiters: new Set(),
    genericBudgetViolationCount: 0,
    unaccountedServerReadCount: 0,
    demandCount: 0,
    permitOutcomeCount: 0,
    responseReconciliationCount: 0,
    cancellationCount: 0,
    permitWaitCount: 0,
    reservationCreatedCount: 0,
    reservationReleasedCount: 0,
    reservationLossCount: 0,
    doubleReleaseCount: 0,
    staleRemainingOvergrantCount: 0,
    peakInFlightReservationCount: 0,
    drainCount: 0,
  };
  state.coordinatorInstances.add(state.coordinatorInstanceId);
  const workers = new Set();
  const clock = () => Number(now());

  function requestUrlFamily(request = {}) {
    const parsed = requestUrl(request?.url);
    return parsed?.pathname || "UNKNOWN";
  }

  function safeRequestUrl(request = {}) {
    const parsed = requestUrl(request?.url);
    if (!parsed) return "UNKNOWN";
    parsed.username = "";
    parsed.password = "";
    for (const key of ["token", "access_token", "authorization", "auth", "session", "cookie"]) parsed.searchParams.delete(key);
    return parsed.toString();
  }

  function safeFailureTextClass(value) {
    const text = clean(value).toUpperCase();
    if (!text) return null;
    if (/ABORT/u.test(text)) return "ABORTED";
    if (/CONTEXT|CLOSED/u.test(text)) return "CONTEXT_CLOSED";
    if (/TIMEOUT/u.test(text)) return "TIMEOUT";
    if (/NET|FAILED|CONNECTION/u.test(text)) return "NETWORK_FAILURE";
    return "OTHER_FAILURE";
  }

  function finalTerminalClassForFailure(reason = "") {
    const failureClass = safeFailureTextClass(reason);
    if (failureClass === "ABORTED") return "ABORTED_AFTER_DISPATCH";
    if (failureClass === "CONTEXT_CLOSED") return "CONTEXT_CLOSED_AFTER_DISPATCH";
    return "REQUEST_FAILED_AFTER_DISPATCH";
  }

  function releaseReservation(record) {
    if (state.reservations.has(record.REQUEST_ID)) {
      state.reservations.delete(record.REQUEST_ID);
      record.RESERVATION_RELEASED = true;
      state.reservationReleasedCount += 1;
    } else if (!record.RESERVATION_RELEASED && record.DISPATCH_TIMESTAMP != null) {
      /* A terminal dispatched request without either a live or previously
       * released reservation is a real coordinator invariant loss. */
      state.reservationLossCount += 1;
    }
    state.waiters.delete(record.REQUEST_ID);
  }

  function finaliseDispatchedRecord(record, terminalClass, { failureText = null } = {}) {
    if (record.FINAL_TERMINAL_CLASS) return false;
    releaseReservation(record);
    record.FINAL_TERMINAL_CLASS = terminalClass;
    record.TERMINAL_TIMESTAMP = clock();
    record.FAILURE_TEXT_CLASS = failureText == null ? record.FAILURE_TEXT_CLASS : safeFailureTextClass(failureText);
    record.STATUS = terminalClass;
    notifyDrainWaiters();
    notifyResetBarrierWaiters();
    return true;
  }

  function currentReservationCount() {
    return state.reservations.size;
  }

  function effectiveUsed() {
    return Math.min(max, Math.max(0, state.confirmedUsed) + currentReservationCount());
  }

  function notifyDrainWaiters() {
    for (const waiter of [...state.drainWaiters]) {
      const current = genericRequestSnapshot({ workerId: waiter.workerId });
      if (current.ACTIVE_GENERIC_REQUEST_COUNT || current.IN_FLIGHT_RESERVATION_COUNT || current.PENDING_GENERIC_WAITER_COUNT) continue;
      state.drainWaiters.delete(waiter);
      waiter.resolve(current);
    }
  }

  function resetOperationRecord(resetOperationId) {
    const id = clean(resetOperationId);
    const operation = state.resetOperations.get(id);
    if (!operation) throw new Error(`RESET_OPERATION_IDENTITY_NOT_FOUND:${id || "MISSING"}`);
    return operation;
  }

  function resetScopedRecords(operation) {
    return [...state.requests.values()].filter((record) => (
      record.RESET_OPERATION_ID === operation.RESET_OPERATION_ID
      && record.LIFECYCLE_PHASE === "RESET"
      && record.WORKER_ID === operation.WORKER_ID
      && record.ACTIVE_CONTRACT_ID === operation.CONTRACT_ID
      && record.BOOTSTRAP !== true
    ));
  }

  function resetOperationEvidence(operation) {
    const allRecords = [...state.requests.values()];
    const operationBound = allRecords.filter((record) => record.RESET_OPERATION_ID === operation.RESET_OPERATION_ID);
    const localResetPhase = allRecords.filter((record) => (
      record.LIFECYCLE_PHASE === "RESET"
      && record.WORKER_ID === operation.WORKER_ID
      && record.ACTIVE_CONTRACT_ID === operation.CONTRACT_ID
    ));
    const candidates = [...new Set([...operationBound, ...localResetPhase])];
    const records = resetScopedRecords(operation);
    const bootstrapMisassociationCount = operationBound.filter((record) => record.BOOTSTRAP === true).length;
    const permitted = records.filter((record) => record.PERMIT_TIMESTAMP != null);
    const dispatched = records.filter((record) => record.DISPATCH_TIMESTAMP != null);
    const playwrightRequests = dispatched.filter((record) => record.PLAYWRIGHT_REQUEST_TIMESTAMP != null);
    const terminal = dispatched.filter((record) => record.FINAL_TERMINAL_CLASS && record.FINAL_TERMINAL_CLASS !== "UNKNOWN_TERMINAL");
    const unknownTerminal = dispatched.filter((record) => record.FINAL_TERMINAL_CLASS === "UNKNOWN_TERMINAL");
    let reason = "RESET_OPERATION_TERMINAL_PROVEN";
    if (candidates.some((record) => record.LIFECYCLE_PHASE === "RESET" && !record.RESET_OPERATION_ID)) reason = "RESET_SCOPED_OPERATION_ID_MISSING";
    else if (bootstrapMisassociationCount) reason = "RESET_SCOPED_BOOTSTRAP_MISASSOCIATION";
    else if (operationBound.some((record) => record.LIFECYCLE_PHASE !== "RESET")) reason = "RESET_SCOPED_PHASE_INVALID";
    else if (operationBound.some((record) => record.WORKER_ID !== operation.WORKER_ID)) reason = "RESET_SCOPED_WRONG_WORKER";
    else if (operationBound.some((record) => record.ACTIVE_CONTRACT_ID !== operation.CONTRACT_ID)) reason = "RESET_SCOPED_WRONG_CONTRACT";
    else if (localResetPhase.some((record) => record.RESET_OPERATION_ID !== operation.RESET_OPERATION_ID)) reason = "RESET_SCOPED_WRONG_OPERATION";
    else if (records.length && permitted.length !== records.length) reason = "RESET_SCOPED_PERMIT_MISSING";
    else if (records.length && (!dispatched.length || dispatched.length !== records.length)) reason = "RESET_SCOPED_DISPATCH_MISSING";
    else if (records.length && playwrightRequests.length !== dispatched.length) reason = "RESET_SCOPED_PLAYWRIGHT_REQUEST_MISSING";
    else if (records.length && unknownTerminal.length) reason = "RESET_SCOPED_UNKNOWN_TERMINAL";
    else if (records.length && terminal.length !== dispatched.length) reason = "RESET_SCOPED_TERMINAL_INCOMPLETE";
    const zeroRequests = records.length === 0 && candidates.length === 0;
    const evidencePasses = reason === "RESET_OPERATION_TERMINAL_PROVEN";
    return {
      RESET_OPERATION_ID: operation.RESET_OPERATION_ID,
      LIFECYCLE_PHASE: operation.LIFECYCLE_PHASE,
      WORKER_ID: operation.WORKER_ID,
      CONTRACT_ID: operation.CONTRACT_ID,
      CONTRACT_ROUTE: operation.CONTRACT_ROUTE,
      RESET_NAVIGATION_ROUTE: operation.RESET_NAVIGATION_ROUTE,
      RESET_START_TIMESTAMP: operation.RESET_START_TIMESTAMP,
      RESET_END_TIMESTAMP: operation.RESET_END_TIMESTAMP,
      RESET_SCOPED_REQUEST_COUNT: records.length,
      RESET_SCOPED_PERMIT_COUNT: permitted.length,
      RESET_SCOPED_DISPATCH_COUNT: dispatched.length,
      RESET_SCOPED_PLAYWRIGHT_REQUEST_COUNT: playwrightRequests.length,
      RESET_SCOPED_RESPONSE_COUNT: records.filter((record) => record.RESPONSE_TIMESTAMP != null).length,
      RESET_SCOPED_REQUESTFINISHED_COUNT: records.filter((record) => record.REQUEST_FINISHED_TIMESTAMP != null).length,
      RESET_SCOPED_REQUESTFAILED_COUNT: records.filter((record) => record.REQUEST_FAILED_TIMESTAMP != null).length,
      RESET_SCOPED_TERMINAL_COUNT: terminal.length,
      RESET_SCOPED_UNKNOWN_TERMINAL_COUNT: unknownTerminal.length,
      RESET_SCOPED_VALIDATED_REQUEST_COUNT: evidencePasses ? records.length : 0,
      RESET_SCOPED_INVALID_REQUEST_COUNT: evidencePasses ? 0 : candidates.length,
      BOOTSTRAP_REQUEST_CAN_SATISFY_RESET: "NO",
      BOOTSTRAP_MISASSOCIATION_COUNT: bootstrapMisassociationCount,
      RESET_NETWORK_REQUIREMENT_MODE: "OPTIONAL_BUT_IF_PRESENT_MUST_BE_COORDINATED",
      RESET_NETWORK_VALIDATION_STATUS: zeroRequests
        ? "NOT_APPLICABLE_ZERO_REQUESTS"
        : evidencePasses ? "COORDINATED" : "FAIL_COORDINATION",
      RESET_LIFECYCLE_EVIDENCE: evidencePasses ? "PASS" : "FAIL",
      REASON: reason,
    };
  }

  function notifyResetBarrierWaiters() {
    for (const waiter of [...state.resetBarrierWaiters]) {
      const evidence = resetOperationEvidence(waiter.operation);
      if (evidence.RESET_LIFECYCLE_EVIDENCE !== "PASS") continue;
      state.resetBarrierWaiters.delete(waiter);
      waiter.resolve(evidence);
    }
  }

  function wakeSeedWaiters() {
    if (!state.seeded) return;
    for (const resolve of state.seedWaiters) resolve(snapshot());
    state.seedWaiters.clear();
  }

  function refresh(current) {
    if (state.resetAt != null && current >= state.resetAt) {
      state.windowStartedAt = null;
      state.resetAt = null;
      state.confirmedUsed = 0;
      state.blockedUntil = null;
    }
  }

  function ensureWindow(current) {
    if (state.windowStartedAt == null) {
      state.windowStartedAt = current;
      state.resetAt = current + windowMs;
    }
  }

  function requestRecord(requestIdentity) {
    const id = clean(requestIdentity);
    const record = state.requests.get(id);
    if (!record) throw new Error(`GENERIC_READ_REQUEST_IDENTITY_NOT_FOUND:${id || "MISSING"}`);
    return record;
  }

  function beginResetOperation({ workerId = "", contractId = "", contractRoute = "", resetNavigationRoute = "/room" } = {}) {
    const worker = required(workerId, "RESET_OPERATION_WORKER_ID_REQUIRED");
    const contract = required(contractId, "RESET_OPERATION_CONTRACT_ID_REQUIRED");
    const resetOperationId = `RESET-${String(++state.resetOperationSequence).padStart(5, "0")}`;
    const operation = {
      RESET_OPERATION_ID: resetOperationId,
      LIFECYCLE_PHASE: "RESET",
      WORKER_ID: worker,
      CONTRACT_ID: contract,
      CONTRACT_ROUTE: clean(contractRoute) || "UNKNOWN",
      RESET_NAVIGATION_ROUTE: clean(resetNavigationRoute) || "/room",
      RESET_START_TIMESTAMP: clock(),
      RESET_END_TIMESTAMP: null,
    };
    workers.add(worker);
    state.resetOperations.set(resetOperationId, operation);
    return { ...operation };
  }

  function endResetOperation({ resetOperationId = "" } = {}) {
    const operation = resetOperationRecord(resetOperationId);
    operation.RESET_END_TIMESTAMP ??= clock();
    return { ...operation, ...resetOperationEvidence(operation) };
  }

  function evaluateResetOperationLifecycle({ resetOperationId = "" } = {}) {
    return resetOperationEvidence(resetOperationRecord(resetOperationId));
  }

  function waitForResetOperationTerminal({ resetOperationId = "", timeoutMs = 0 } = {}) {
    const operation = resetOperationRecord(resetOperationId);
    const current = resetOperationEvidence(operation);
    if (current.RESET_LIFECYCLE_EVIDENCE === "PASS") return Promise.resolve(current);
    return new Promise((resolve, reject) => {
      let timer = null;
      const finish = (evidence) => {
        if (timer != null) clearTimeout(timer);
        resolve(evidence);
      };
      const waiter = { operation, resolve: finish };
      state.resetBarrierWaiters.add(waiter);
      if (Number(timeoutMs) > 0) {
        /* This is a lifecycle evidence deadline, never a reset pacing sleep. */
        timer = setTimeout(() => {
          state.resetBarrierWaiters.delete(waiter);
          const evidence = resetOperationEvidence(operation);
          reject(new Error(`RESET_OPERATION_LIFECYCLE_NOT_PROVEN:${operation.RESET_OPERATION_ID}:${evidence.REASON}`));
        }, Number(timeoutMs));
      }
    });
  }

  function beginGenericRequest({
    request = {}, workerId = "", contractId = null, route = "", bootstrap = false,
    lifecyclePhase = "NONE", resetOperationId = "", contractRoute = "", resetNavigationRoute = "",
  } = {}) {
    const family = classifyRoomRequestLimiterFamily(request);
    if (family !== "GENERIC_READ") return null;
    const current = clock();
    refresh(current);
    ensureWindow(current);
    const worker = clean(workerId) || "ROOM-WORKER-UNKNOWN";
    workers.add(worker);
    const requestId = `GENERIC-${String(++state.requestSequence).padStart(5, "0")}`;
    state.requests.set(requestId, {
      REQUEST_ID: requestId,
      WORKER_ID: worker,
      ACTIVE_CONTRACT_ID: clean(contractId) || "NONE",
      ROUTE: clean(route) || "UNKNOWN",
      LIFECYCLE_PHASE: clean(lifecyclePhase).toUpperCase() || "NONE",
      RESET_OPERATION_ID: clean(resetOperationId) || null,
      CONTRACT_ROUTE: clean(contractRoute) || null,
      RESET_NAVIGATION_ROUTE: clean(resetNavigationRoute) || null,
      METHOD: String(request?.method || "GET").toUpperCase(),
      URL: safeRequestUrl(request),
      URL_FAMILY: requestUrlFamily(request),
      LIMITER_FAMILY: family,
      DEMAND_TIMESTAMP: current,
      PERMIT_TIMESTAMP: null,
      RESERVATION_TIMESTAMP: null,
      DISPATCH_TIMESTAMP: null,
      PLAYWRIGHT_REQUEST_TIMESTAMP: null,
      PLAYWRIGHT_RESPONSE_TIMESTAMP: null,
      RESPONSE_TIMESTAMP: null,
      REQUEST_FINISHED_TIMESTAMP: null,
      REQUEST_FAILED_TIMESTAMP: null,
      TERMINAL_TIMESTAMP: null,
      FAILURE_TEXT_CLASS: null,
      HTTP_STATUS: null,
      FINAL_TERMINAL_CLASS: null,
      STATUS: "DEMANDED",
      BOOTSTRAP: bootstrap === true,
      CANCELLED: false,
      RESPONDED: false,
      RESERVATION_RELEASED: false,
    });
    state.demandCount += 1;
    notifyResetBarrierWaiters();
    return requestId;
  }

  function resolveGenericRequest(input = {}) {
    const supplied = clean(input.requestIdentity || input.requestId);
    if (supplied) return requestRecord(supplied);
    const requestId = beginGenericRequest(input);
    return requestId ? requestRecord(requestId) : null;
  }

  function waitForAuthoritativeSeed({ timeoutMs = 0 } = {}) {
    if (state.seeded) return Promise.resolve(snapshot());
    return new Promise((resolve, reject) => {
      let timer = null;
      const finish = (value) => {
        if (timer != null) clearTimeout(timer);
        resolve(value);
      };
      state.seedWaiters.add(finish);
      if (Number(timeoutMs) > 0) {
        /* This is an explicit readiness deadline, never a pacing sleep. */
        timer = setTimeout(() => {
          state.seedWaiters.delete(finish);
          reject(new Error("AUTHORITATIVE_GENERIC_READ_HEADER_NOT_OBSERVED"));
        }, Number(timeoutMs));
      }
    });
  }

  function requestLease(input = {}) {
    const { request = {}, workerId = "" } = input;
    const family = classifyRoomRequestLimiterFamily(request);
    if (clean(workerId)) workers.add(clean(workerId));
    if (family !== "GENERIC_READ") {
      return { granted: true, family, coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID, reason: "NOT_GENERIC_READ_LIMITER_TRAFFIC", waitMs: 0 };
    }
    const record = resolveGenericRequest(input);
    if (record.CANCELLED) {
      return { granted: false, family, requestId: record.REQUEST_ID, coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID, reason: "GENERIC_READ_REQUEST_CANCELLED", waitMs: 0 };
    }
    if (record.STATUS === "GRANTED" || record.STATUS === "DISPATCHED") {
      return { granted: true, family, requestId: record.REQUEST_ID, coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID, reason: "GENERIC_READ_PERMIT_ALREADY_GRANTED", waitMs: 0 };
    }
    const current = clock();
    refresh(current);
    ensureWindow(current);
    if (!state.seeded && !record.BOOTSTRAP) {
      return { granted: false, family, requestId: record.REQUEST_ID, coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID, reason: "AUTHORITATIVE_HEADER_SEED_REQUIRED", waitMs: 0 };
    }
    if (state.closingWorkers.has(record.WORKER_ID)) {
      return { granted: false, family, requestId: record.REQUEST_ID, coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID, reason: "GENERIC_READ_WORKER_TEARDOWN", waitMs: 0 };
    }
    const waitUntil = Math.max(Number(state.blockedUntil || 0), effectiveUsed() >= max ? Number(state.resetAt || current) : 0);
    if (waitUntil > current) {
      state.permitWaitCount += 1;
      return {
        granted: false,
        family,
        requestId: record.REQUEST_ID,
        coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID,
        reason: "GENERIC_READ_BUDGET_EXHAUSTED",
        waitUntil,
        waitMs: waitUntil - current,
      };
    }
    record.STATUS = "GRANTED";
    record.PERMIT_TIMESTAMP = current;
    record.RESERVATION_TIMESTAMP = current;
    state.reservations.set(record.REQUEST_ID, record);
    state.reservationCreatedCount += 1;
    state.peakInFlightReservationCount = Math.max(state.peakInFlightReservationCount, currentReservationCount());
    state.permitOutcomeCount += 1;
    notifyResetBarrierWaiters();
    return { granted: true, family, requestId: record.REQUEST_ID, coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID, reason: "GENERIC_READ_PERMIT_GRANTED", waitMs: 0 };
  }

  function markGenericRequestDispatched({ requestIdentity, requestId } = {}) {
    const record = requestRecord(requestIdentity || requestId);
    if (record.STATUS !== "GRANTED" || !state.reservations.has(record.REQUEST_ID)) {
      throw new Error(`GENERIC_READ_DISPATCH_WITHOUT_GRANTED_PERMIT:${record.REQUEST_ID}`);
    }
    record.STATUS = "DISPATCHED";
    record.DISPATCH_TIMESTAMP = clock();
    notifyResetBarrierWaiters();
    return { requestId: record.REQUEST_ID, dispatched: true };
  }

  function recordPlaywrightRequest({ request = {}, requestIdentity, requestId } = {}) {
    const record = requestRecord(requestIdentity || requestId);
    if (classifyRoomRequestLimiterFamily(request) !== "GENERIC_READ") return { observed: false, family: classifyRoomRequestLimiterFamily(request) };
    if (record.PLAYWRIGHT_REQUEST_TIMESTAMP == null) record.PLAYWRIGHT_REQUEST_TIMESTAMP = clock();
    notifyResetBarrierWaiters();
    return { observed: true, requestId: record.REQUEST_ID };
  }

  function cancelGenericRequestBeforeDispatch({ requestIdentity, requestId, reason = "HARNESS_TEARDOWN" } = {}) {
    const record = requestRecord(requestIdentity || requestId);
    if (record.RESPONDED || record.CANCELLED) return { requestId: record.REQUEST_ID, released: false, reason: "ALREADY_TERMINAL" };
    if (record.STATUS === "DISPATCHED") return { requestId: record.REQUEST_ID, released: false, reason: "ALREADY_DISPATCHED" };
    releaseReservation(record);
    for (const reject of state.cancellationWaiters.get(record.REQUEST_ID) || []) reject(new Error(`GENERIC_READ_PERMIT_CANCELLED:${record.REQUEST_ID}`));
    state.cancellationWaiters.delete(record.REQUEST_ID);
    record.STATUS = "CANCELLED_BEFORE_DISPATCH";
    record.CANCELLED = true;
    record.CANCELLATION_REASON = clean(reason) || "HARNESS_TEARDOWN";
    record.FINAL_TERMINAL_CLASS = "CANCELLED_BEFORE_DISPATCH";
    record.TERMINAL_TIMESTAMP = clock();
    state.cancellationCount += 1;
    notifyDrainWaiters();
    return { requestId: record.REQUEST_ID, released: true, reason: record.CANCELLATION_REASON };
  }

  function cancelGenericRequestAfterDispatch({ requestIdentity, requestId, reason = "REQUEST_FAILED_OR_CONTEXT_CLOSED" } = {}) {
    const record = requestRecord(requestIdentity || requestId);
    if (record.FINAL_TERMINAL_CLASS || record.CANCELLED) return { requestId: record.REQUEST_ID, released: false, reason: "ALREADY_TERMINAL" };
    record.REQUEST_FAILED_TIMESTAMP ??= clock();
    const terminalClass = finalTerminalClassForFailure(reason);
    finaliseDispatchedRecord(record, terminalClass, { failureText: reason });
    record.CANCELLED = true;
    record.CANCELLATION_REASON = clean(reason) || "REQUEST_FAILED_OR_CONTEXT_CLOSED";
    state.cancellationCount += 1;
    notifyDrainWaiters();
    return { requestId: record.REQUEST_ID, released: true, reason: record.CANCELLATION_REASON };
  }

  function observeResponse({ request = {}, status = 0, headers = {}, requestIdentity, requestId } = {}) {
    const family = classifyRoomRequestLimiterFamily(request);
    if (family !== "GENERIC_READ") return { observed: false, family };
    let record = null;
    const identity = clean(requestIdentity || requestId);
    if (identity) record = requestRecord(identity);
    if (!record) {
      /* Compatibility only: direct model callers are visibly recorded as an
       * unowned server read rather than silently reconciling it away. */
      const generated = beginGenericRequest({ request, workerId: "EXTERNAL_OBSERVER", bootstrap: true });
      record = requestRecord(generated);
      record.UNACCOUNTED_SERVER_READ = true;
      state.unaccountedServerReadCount += 1;
    }
    if (record.RESPONDED) return { observed: false, family, requestId: record.REQUEST_ID, reason: "DUPLICATE_RESPONSE_IGNORED" };
    const current = clock();
    refresh(current);
    const normalized = normalizedHeaders(headers);
    const remaining = positiveInteger(normalized["ratelimit-remaining"]);
    const resetSeconds = positiveInteger(normalized["ratelimit-reset"]);
    const retryAfter = positiveInteger(normalized["retry-after"]);
    if (remaining != null) {
      if (remaining > max) state.staleRemainingOvergrantCount += 1;
      state.confirmedUsed = Math.max(state.confirmedUsed, Math.max(0, Math.min(max, max - remaining)));
      state.seeded = true;
      state.headerPolicy = normalized["ratelimit-policy"] || state.headerPolicy || "SERVER_RATE_LIMIT_HEADER";
      wakeSeedWaiters();
    }
    if (resetSeconds != null) {
      state.windowStartedAt = current;
      state.resetAt = current + (resetSeconds * 1000);
    }
    if (Number(status) === 429) {
      state.confirmedUsed = max;
      state.seeded = true;
      state.headerPolicy = state.headerPolicy || "SERVER_RATE_LIMIT_429";
      wakeSeedWaiters();
      state.genericBudgetViolationCount += 1;
      const retryUntil = retryAfter == null ? null : current + (retryAfter * 1000);
      // Retry-After is the server's more current window evidence.  A local
      // optimistic window must not keep the harness blocked beyond it.
      if (retryUntil != null) {
        state.windowStartedAt = current;
        state.resetAt = retryUntil;
        state.blockedUntil = retryUntil;
      } else {
        state.blockedUntil = Math.max(Number(state.blockedUntil || 0), Number(state.resetAt || 0)) || null;
      }
    }
    releaseReservation(record);
    record.RESPONDED = true;
    record.STATUS = "RESPONSE_OBSERVED";
    record.PLAYWRIGHT_RESPONSE_TIMESTAMP = current;
    record.RESPONSE_TIMESTAMP = current;
    record.HTTP_STATUS = Number(status);
    state.responseReconciliationCount += 1;
    /* Direct no-browser coordinator callers do not have Playwright lifecycle
     * events.  Preserve their legacy response-terminal model while real
     * intercepted browser requests remain open until finished/failed. */
    if (record.PLAYWRIGHT_REQUEST_TIMESTAMP == null) {
      finaliseDispatchedRecord(record, "RESPONDED");
    }
    notifyDrainWaiters();
    notifyResetBarrierWaiters();
    return { observed: true, family, requestId: record.REQUEST_ID, remaining, resetSeconds, retryAfter, status: Number(status) };
  }

  function recordRequestFinished({ request = {}, requestIdentity, requestId } = {}) {
    const family = classifyRoomRequestLimiterFamily(request);
    if (family !== "GENERIC_READ") return { observed: false, family };
    const record = requestRecord(requestIdentity || requestId);
    if (record.REQUEST_FINISHED_TIMESTAMP != null) return { observed: false, family, requestId: record.REQUEST_ID, reason: "DUPLICATE_REQUESTFINISHED_IGNORED" };
    record.REQUEST_FINISHED_TIMESTAMP = clock();
    finaliseDispatchedRecord(record, record.RESPONDED ? "REQUEST_FINISHED_WITH_RESPONSE" : "UNKNOWN_TERMINAL");
    return { observed: true, family, requestId: record.REQUEST_ID, terminalClass: record.FINAL_TERMINAL_CLASS };
  }

  function recordRequestFailed({ request = {}, requestIdentity, requestId, reason = "PLAYWRIGHT_REQUEST_FAILED" } = {}) {
    const family = classifyRoomRequestLimiterFamily(request);
    if (family !== "GENERIC_READ") return { observed: false, family };
    const record = requestRecord(requestIdentity || requestId);
    if (record.REQUEST_FAILED_TIMESTAMP != null || record.FINAL_TERMINAL_CLASS) return { observed: false, family, requestId: record.REQUEST_ID, reason: "DUPLICATE_REQUESTFAILED_IGNORED" };
    record.REQUEST_FAILED_TIMESTAMP = clock();
    const terminalClass = finalTerminalClassForFailure(reason);
    finaliseDispatchedRecord(record, terminalClass, { failureText: reason });
    record.CANCELLED = true;
    record.CANCELLATION_REASON = clean(reason) || "PLAYWRIGHT_REQUEST_FAILED";
    state.cancellationCount += 1;
    return { observed: true, family, requestId: record.REQUEST_ID, terminalClass };
  }

  async function waitForPermit(input = {}) {
    const record = resolveGenericRequest(input);
    const awaitWithCancellation = async (promise) => {
      if (record.CANCELLED) throw new Error(`GENERIC_READ_PERMIT_CANCELLED:${record.REQUEST_ID}`);
      let rejectCancellation = null;
      const cancellation = new Promise((_, reject) => { rejectCancellation = reject; });
      const registered = state.cancellationWaiters.get(record.REQUEST_ID) || new Set();
      registered.add(rejectCancellation);
      state.cancellationWaiters.set(record.REQUEST_ID, registered);
      try { return await Promise.race([promise, cancellation]); }
      finally {
        registered.delete(rejectCancellation);
        if (!registered.size) state.cancellationWaiters.delete(record.REQUEST_ID);
      }
    };
    for (;;) {
      const lease = requestLease({ ...input, requestIdentity: record.REQUEST_ID });
      if (lease.granted) return lease;
      if (["GENERIC_READ_REQUEST_CANCELLED", "GENERIC_READ_WORKER_TEARDOWN"].includes(lease.reason)) {
        throw new Error(`GENERIC_READ_PERMIT_CANCELLED:${record.REQUEST_ID}`);
      }
      if (lease.reason === "AUTHORITATIVE_HEADER_SEED_REQUIRED") {
        state.waiters.set(record.REQUEST_ID, record);
        try { await awaitWithCancellation(waitForAuthoritativeSeed(input)); } finally { state.waiters.delete(record.REQUEST_ID); }
        continue;
      }
      if (!Number.isFinite(lease.waitMs) || lease.waitMs <= 0) throw new Error("SHARED_READ_BUDGET_WAIT_EVIDENCE_INVALID");
      state.waiters.set(record.REQUEST_ID, record);
      try { await awaitWithCancellation(wait(lease.waitMs)); } finally { state.waiters.delete(record.REQUEST_ID); }
    }
  }

  function beginGenericRequestTeardown({ workerId = "" } = {}) {
    const worker = clean(workerId);
    if (worker) state.closingWorkers.add(worker);
    for (const record of state.requests.values()) {
      if (worker && record.WORKER_ID !== worker) continue;
      if (["DEMANDED", "GRANTED"].includes(record.STATUS)) cancelGenericRequestBeforeDispatch({ requestIdentity: record.REQUEST_ID, reason: "WORKER_CONTEXT_TEARDOWN" });
    }
    notifyDrainWaiters();
    return genericRequestSnapshot({ workerId: worker });
  }

  function genericRequestSnapshot({ workerId = "" } = {}) {
    const worker = clean(workerId);
    const records = [...state.requests.values()].filter((record) => !worker || record.WORKER_ID === worker);
    const reservations = records.filter((record) => state.reservations.has(record.REQUEST_ID));
    const waiters = records.filter((record) => state.waiters.has(record.REQUEST_ID));
    const dispatched = records.filter((record) => record.DISPATCH_TIMESTAMP != null);
    const terminalDispatched = dispatched.filter((record) => record.FINAL_TERMINAL_CLASS && record.FINAL_TERMINAL_CLASS !== "UNKNOWN_TERMINAL");
    const unknownDispatched = dispatched.filter((record) => record.FINAL_TERMINAL_CLASS === "UNKNOWN_TERMINAL");
    const active = records.filter((record) => !record.FINAL_TERMINAL_CLASS);
    const coordinatorTelemetry = {
      COORDINATOR_INSTANCE_ID: state.coordinatorInstanceId,
      COORDINATOR_INSTANCE_COUNT: state.coordinatorInstances.size,
      DEMAND_COUNT: state.demandCount,
      PERMIT_GRANTED_COUNT: state.permitOutcomeCount,
      PERMIT_WAIT_COUNT: state.permitWaitCount,
      RESERVATION_CREATED_COUNT: state.reservationCreatedCount,
      RESERVATION_RELEASED_COUNT: state.reservationReleasedCount,
      RESERVATION_LOSS_COUNT: state.reservationLossCount,
      DOUBLE_RELEASE_COUNT: state.doubleReleaseCount,
      STALE_REMAINING_OVERGRANT_COUNT: state.staleRemainingOvergrantCount,
      OUTSTANDING_RESERVATION_COUNT: state.reservations.size,
      PEAK_IN_FLIGHT_RESERVATION_COUNT: state.peakInFlightReservationCount,
      DRAIN_COUNT: state.drainCount,
      PENDING_WAITER_COUNT: state.waiters.size,
      ACTIVE_HANDLER_COUNT: active.length,
      IN_FLIGHT_GENERIC_REQUEST_COUNT: records.filter((record) => record.DISPATCH_TIMESTAMP != null && !record.FINAL_TERMINAL_CLASS).length,
    };
    return {
      REQUEST_IDENTITY_COUNT: records.length,
      GENERIC_DEMAND_COUNT: records.length,
      GENERIC_PERMIT_OUTCOME_COUNT: records.filter((record) => record.PERMIT_TIMESTAMP != null || record.CANCELLED).length,
      GENERIC_RESPONSE_RECONCILIATION_COUNT: records.filter((record) => record.RESPONDED).length,
      GENERIC_DISPATCH_COUNT: dispatched.length,
      PLAYWRIGHT_GENERIC_REQUEST_EVENT_COUNT: records.filter((record) => record.PLAYWRIGHT_REQUEST_TIMESTAMP != null).length,
      GENERIC_RESPONSE_EVENT_COUNT: records.filter((record) => record.PLAYWRIGHT_RESPONSE_TIMESTAMP != null).length,
      GENERIC_REQUESTFINISHED_COUNT: records.filter((record) => record.REQUEST_FINISHED_TIMESTAMP != null).length,
      GENERIC_REQUESTFAILED_COUNT: records.filter((record) => record.REQUEST_FAILED_TIMESTAMP != null).length,
      GENERIC_TERMINAL_COUNT: terminalDispatched.length,
      GENERIC_UNKNOWN_TERMINAL_COUNT: unknownDispatched.length,
      CANCELLED_BEFORE_DISPATCH_COUNT: records.filter((record) => record.FINAL_TERMINAL_CLASS === "CANCELLED_BEFORE_DISPATCH").length,
      ACTIVE_GENERIC_REQUEST_COUNT: active.length,
      IN_FLIGHT_RESERVATION_COUNT: reservations.length,
      PENDING_GENERIC_WAITER_COUNT: waiters.length,
      PRE_COORDINATOR_UNACCOUNTED_COUNT: records.filter((record) => record.UNACCOUNTED_SERVER_READ).length,
      GENERIC_BUDGET_VIOLATION_COUNT: state.genericBudgetViolationCount,
      AUTHORITATIVE_HEADER_SEEDED: state.seeded,
      COORDINATOR_TELEMETRY: coordinatorTelemetry,
      RESET_OPERATIONS: [...state.resetOperations.values()].map((operation) => resetOperationEvidence(operation)),
      REQUESTS: records.map((record) => ({
        REQUEST_ID: record.REQUEST_ID,
        WORKER_ID: record.WORKER_ID,
        ACTIVE_CONTRACT_ID: record.ACTIVE_CONTRACT_ID,
        ROUTE: record.ROUTE,
        LIFECYCLE_PHASE: record.LIFECYCLE_PHASE,
        RESET_OPERATION_ID: record.RESET_OPERATION_ID,
        CONTRACT_ROUTE: record.CONTRACT_ROUTE,
        RESET_NAVIGATION_ROUTE: record.RESET_NAVIGATION_ROUTE,
        METHOD: record.METHOD,
        URL: record.URL,
        URL_FAMILY: record.URL_FAMILY,
        LIMITER_FAMILY: record.LIMITER_FAMILY,
        DEMAND_TIMESTAMP: record.DEMAND_TIMESTAMP,
        PERMIT_TIMESTAMP: record.PERMIT_TIMESTAMP,
        RESERVATION_TIMESTAMP: record.RESERVATION_TIMESTAMP,
        DISPATCH_TIMESTAMP: record.DISPATCH_TIMESTAMP,
        PLAYWRIGHT_REQUEST_TIMESTAMP: record.PLAYWRIGHT_REQUEST_TIMESTAMP,
        PLAYWRIGHT_RESPONSE_TIMESTAMP: record.PLAYWRIGHT_RESPONSE_TIMESTAMP,
        RESPONSE_TIMESTAMP: record.RESPONSE_TIMESTAMP,
        REQUEST_FINISHED_TIMESTAMP: record.REQUEST_FINISHED_TIMESTAMP,
        REQUEST_FAILED_TIMESTAMP: record.REQUEST_FAILED_TIMESTAMP,
        TERMINAL_TIMESTAMP: record.TERMINAL_TIMESTAMP,
        FAILURE_TEXT_CLASS: record.FAILURE_TEXT_CLASS,
        HTTP_STATUS: record.HTTP_STATUS,
        FINAL_TERMINAL_CLASS: record.FINAL_TERMINAL_CLASS,
        STATUS: record.STATUS,
      })),
    };
  }

  function activeReservationCount() { return currentReservationCount(); }
  function pendingGenericWaiterCount() { return state.waiters.size; }
  function activeGenericRequestCount() { return genericRequestSnapshot().ACTIVE_GENERIC_REQUEST_COUNT; }
  function genericRequestIdentityCount() { return state.requests.size; }
  function genericDemandCount() { return state.demandCount; }
  function genericPermitOutcomeCount() { return state.permitOutcomeCount; }
  function genericResponseReconciliationCount() { return state.responseReconciliationCount; }
  function authoritativeHeaderSeeded() { return state.seeded; }
  function server429ForcesBudgetViolation() { return state.genericBudgetViolationCount > 0; }

  function drainGenericRequestLifecycle({ workerId = "", timeoutMs = 0 } = {}) {
    state.drainCount += 1;
    const current = genericRequestSnapshot({ workerId });
    if (!current.ACTIVE_GENERIC_REQUEST_COUNT && !current.IN_FLIGHT_RESERVATION_COUNT && !current.PENDING_GENERIC_WAITER_COUNT) {
      return Promise.resolve({ drained: true, ...current });
    }
    return new Promise((resolve, reject) => {
      let timer = null;
      const finish = (snapshotValue) => {
        if (timer != null) clearTimeout(timer);
        resolve({ drained: true, ...snapshotValue });
      };
      const waiter = { workerId: clean(workerId), resolve: finish };
      state.drainWaiters.add(waiter);
      if (Number(timeoutMs) > 0) {
        timer = setTimeout(() => {
          state.drainWaiters.delete(waiter);
          reject(new Error("GENERIC_REQUEST_DRAIN_NOT_PROVEN"));
        }, Number(timeoutMs));
      }
    });
  }

  function snapshot() {
    refresh(clock());
    return {
      coordinatorId: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID,
      used: effectiveUsed(),
      confirmedUsed: state.confirmedUsed,
      activeReservations: currentReservationCount(),
      resetAt: state.resetAt,
      authoritativeHeaderSeeded: state.seeded,
      workerCountObserved: workers.size,
      coordinatorInstanceId: state.coordinatorInstanceId,
      coordinatorInstanceCount: state.coordinatorInstances.size,
    };
  }

  function toSafeArtifact() {
    return {
      COORDINATOR_ID: ROOM_GENERIC_READ_BUDGET_POLICY.COORDINATOR_ID,
      MAX: max,
      WINDOW_MS: windowMs,
      WORKER_COUNT_OBSERVED: workers.size,
      IDENTITY_PERSISTED: false,
      REQUEST_IDENTITY_PERSISTED: true,
      TOKEN_PERSISTED: false,
      AUTHORITATIVE_HEADER_SEEDED: state.seeded,
      GENERIC_BUDGET_VIOLATION_COUNT: state.genericBudgetViolationCount,
    };
  }

  return {
    beginGenericRequest,
    beginResetOperation,
    endResetOperation,
    evaluateResetOperationLifecycle,
    waitForResetOperationTerminal,
    requestLease,
    waitForPermit,
    waitForAuthoritativeSeed,
    markGenericRequestDispatched,
    recordPlaywrightRequest,
    cancelGenericRequestBeforeDispatch,
    cancelGenericRequestAfterDispatch,
    observeResponse,
    recordRequestFinished,
    recordRequestFailed,
    beginGenericRequestTeardown,
    drainGenericRequestLifecycle,
    genericRequestSnapshot,
    activeReservationCount,
    pendingGenericWaiterCount,
    activeGenericRequestCount,
    genericRequestIdentityCount,
    genericDemandCount,
    genericPermitOutcomeCount,
    genericResponseReconciliationCount,
    authoritativeHeaderSeeded,
    server429ForcesBudgetViolation,
    snapshot,
    toSafeArtifact,
  };
}

export function sharedReadBudgetCoordinatorPolicy() {
  return {
    WORKER_COUNT_MAX: ROOM_WORKER_CONCURRENCY_MAX,
    RATE_LIMIT_POLICY_CHANGE: "NONE",
    BLIND_FIXED_SLEEP_USED: false,
    WAIT_SOURCE: "BUDGET_OR_SERVER_RESET_EVIDENCE",
    LOCALHOST_RATE_LIMIT_BYPASS_ADDED: false,
    TEST_MODE_RATE_LIMIT_BYPASS_ADDED: false,
  };
}
