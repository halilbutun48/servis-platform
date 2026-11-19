import { cachedGet, clearUiDataCache } from "./uiDataCache";
import { buildDashboardBulkQuery, dashboardBulkCachePrefix } from "./dashboardBulkQuery.js";

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_DELAY_MS = 120;
let actionableEventsSnapshot = null;
const actionableEventsListeners = new Set();

function publishActionableEventsSnapshot(snapshot) {
  actionableEventsSnapshot = snapshot;
  actionableEventsListeners.forEach((listener) => {
    try { listener(snapshot); } catch { /* one subscriber must not affect the others */ }
  });
}

export function getActionableEventsSnapshot() {
  return actionableEventsSnapshot;
}

export function subscribeActionableEventsSnapshot(listener) {
  if (typeof listener !== "function") return () => {};
  actionableEventsListeners.add(listener);
  listener(actionableEventsSnapshot);
  return () => actionableEventsListeners.delete(listener);
}

function normalizeItems(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

async function loadDashboardBulkBundle(bundle, { token, force = false, signal, ttlMs = DEFAULT_TTL_MS, delayMs = DEFAULT_DELAY_MS, query = {} } = {}) {
  if (force) clearUiDataCache(dashboardBulkCachePrefix(bundle));
  const qs = buildDashboardBulkQuery(bundle, query, force);
  try {
    return await cachedGet(`/api/dashboard/bulk${qs}`, { token, force, signal, ttlMs, delayMs });
  } catch {
    return null;
  }
}

export async function loadCompanyOperationsBundle({ token, force = false, signal, from, to, companyId } = {}) {
  const payload = await loadDashboardBulkBundle("company-operations", {
    token,
    force,
    signal,
    query: {
      from,
      to,
      companyId,
    },
  });
  if (!payload) return null;
  return {
    ...payload,
    personels: normalizeItems(payload.personels),
    shifts: normalizeItems(payload.shifts),
    requests: normalizeItems(payload.requests),
    notifications: normalizeItems(payload.notifications),
    shiftSummary: payload.shiftSummary ?? null,
  };
}

export async function loadSchoolOperationsBundle({ token, force = false, signal, companyId } = {}) {
  const payload = await loadDashboardBulkBundle("school-operations", {
    token,
    force,
    signal,
    query: {
      companyId,
    },
  });
  if (!payload) return null;
  return {
    ...payload,
    students: normalizeItems(payload.students),
    invites: normalizeItems(payload.invites),
    requests: normalizeItems(payload.requests),
    notifications: normalizeItems(payload.notifications),
  };
}

export async function loadRoomOperationHealthBundle({ token, force = false, signal, roomId, from, to } = {}) {
  const payload = await loadDashboardBulkBundle("room-operation-health", {
    token,
    force,
    signal,
    query: {
      roomId,
      from,
      to,
    },
  });
  if (!payload) return null;
  return {
    ...payload,
    summary: payload.summary ?? null,
    drivers: normalizeItems(payload.drivers),
    issues: normalizeItems(payload.issues),
    roomOperations: {
      driverSignals: normalizeItems(payload.roomOperations?.driverSignals),
      shiftSummary: payload.roomOperations?.shiftSummary ?? null,
      vehicleSummary: payload.roomOperations?.vehicleSummary ?? null,
      driverSummary: payload.roomOperations?.driverSummary ?? null,
      requests: normalizeItems(payload.roomOperations?.requests),
    },
  };
}

export async function loadRoomCommercialFlowBundle({ token, force = false, signal, roomId } = {}) {
  const payload = await loadDashboardBulkBundle("room-commercial-flow", {
    token,
    force,
    signal,
    query: {
      roomId,
    },
  });
  if (!payload) return null;
  return {
    ...payload,
    summary: payload.summary ?? null,
    items: normalizeItems(payload.items),
  };
}

export async function loadSuperAdminOverviewBundle({ token, force = false, signal } = {}) {
  const payload = await loadDashboardBulkBundle("superadmin-overview", {
    token,
    force,
    signal,
  });
  if (!payload) return null;
  return {
    ...payload,
    stats: payload.stats ?? null,
    feedbackRecords: normalizeItems(payload.feedbackRecords),
    feedbackSummary: payload.feedbackSummary ?? { total: 0, active: 0, latestAt: null },
  };
}

export async function loadActionableEventsBundle({ token, force = false, signal } = {}) {
  const payload = await loadDashboardBulkBundle("actionable-events", {
    token,
    force,
    signal,
  });
  if (!payload) {
    publishActionableEventsSnapshot(null);
    return null;
  }
  const normalized = {
    ...payload,
    events: normalizeItems(payload.events),
    summary: payload.summary ?? { total: 0, byGroup: {}, primaryEventId: null, primaryAction: null },
  };
  publishActionableEventsSnapshot(normalized);
  return normalized;
}

export { loadDashboardBulkBundle };
