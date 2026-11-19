const KEY = "__psv1CopilotSelection";
const EVT = "psv1:copilot-selection";
let inMemorySelection = null;
let hasInMemorySelection = false;

function documentSelectionMirror() {
  try {
    const root = typeof document !== "undefined" ? document.documentElement : null;
    return root && typeof root === "object" ? root : null;
  } catch {
    return null;
  }
}

function writeSelectionMirror(next) {
  try {
    if (typeof window !== "undefined" && Object.isExtensible(window)) {
      window[KEY] = next;
      return;
    }
    const root = documentSelectionMirror();
    if (root) root[KEY] = next;
  } catch {
    // The in-memory value remains the same-bundle fallback.
  }
}

function clearSelectionMirror() {
  try {
    if (typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, KEY)) {
      delete window[KEY];
    }
    const root = documentSelectionMirror();
    if (root && Object.prototype.hasOwnProperty.call(root, KEY)) delete root[KEY];
  } catch {
    // The in-memory value remains the same-bundle fallback.
  }
}

function currentRoutePath() {
  if (typeof window === "undefined") return "";
  const hash = String(window.location?.hash || "").replace(/^#/, "");
  const rawPath = (hash.split("?", 1)[0] || window.location?.pathname || "").trim();
  if (!rawPath) return "";
  return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
}

// A visible table row is not a user selection. Consumers may publish an
// entity only after an explicit focus/modal/selection path supplies its id.
// Keeping this derivation here makes the same contract testable without a
// browser-global selection side effect.
export function resolveExplicitCopilotRecord(items, entityId) {
  const id = Number(entityId || 0);
  if (!Number.isInteger(id) || id <= 0 || !Array.isArray(items)) return null;
  return items.find((item) => Number(item?.id || 0) === id) || null;
}

export function buildNotificationCopilotSelection(notification) {
  const id = Number(notification?.id || 0);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const clean = (value, limit = 240) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
  const label = `Bildirim #${id}`;
  const summary = [
    clean(notification?.title),
    clean(notification?.message),
    clean(notification?.regionLabel),
  ].filter(Boolean).join(" • ").slice(0, 420);
  const selectedRecordStatus = clean(notification?.status, 120);
  return {
    scopeKey: "/shared/notifications",
    entityType: "notification",
    entityId: id,
    selectedRecordType: "notification",
    selectedRecordId: id,
    label,
    selectedRecordLabel: label,
    selectedRecordStatus,
    selectedRecordSummary: summary,
    facts: {
      screenType: "SHARED_NOTIFICATIONS",
      selectedRecordType: "notification",
      selectedRecordId: id,
      selectedRecordLabel: label,
      selectedRecordStatus,
      selectedRecordSummary: summary,
    },
  };
}

// Conversation history is scoped to the authorized record context, not only
// to the authenticated user.  A parent changing the selected child must not
// carry the previous child's transcript into the new context.
export function copilotSelectionContextKey(selection) {
  if (!selection || typeof selection !== "object") return "";
  const positiveId = (value) => {
    const parsed = Number(value || 0);
    return Number.isSafeInteger(parsed) && parsed > 0 ? String(parsed) : "";
  };
  const fallbackLabel = String(selection.selectedRecordLabel || selection.label || "").trim();
  return [
    String(selection.scopeKey || "").trim(),
    String(selection.entityType || "").trim(),
    positiveId(selection.entityId),
    String(selection.selectedRecordType || "").trim(),
    positiveId(selection.selectedRecordId),
    String(selection.relatedEntityType || "").trim(),
    positiveId(selection.relatedEntityId),
    fallbackLabel && !positiveId(selection.entityId) && !positiveId(selection.selectedRecordId) ? fallbackLabel : "",
  ].join("|");
}

export function copilotSelectionContextChanged(previousSelection, nextSelection) {
  const previousKey = copilotSelectionContextKey(previousSelection);
  const nextKey = copilotSelectionContextKey(nextSelection);
  return Boolean(previousKey && previousKey !== nextKey);
}

// The finance panel is hash-routed. When the drawer and the lazy-loaded
// panel do not share the same in-memory module instance, preserve the
// already-visible route focus in the copilot request. This is only a
// selection hint; the API still re-resolves the shift, vehicle and draft
// against the authenticated ROOM tenant before using any value.
export function resolveRouteBoundFinancialSelection({ path = "", hash = "" } = {}) {
  const normalizedPath = String(path || "").split("?", 1)[0];
  if (normalizedPath !== "/room/financial-operations") return null;
  const rawHash = String(hash || (typeof window !== "undefined" ? window.location?.hash || "" : ""));
  const query = rawHash.includes("?") ? rawHash.slice(rawHash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const positiveId = (value) => {
    const parsed = Number(value || 0);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const selectedShiftId = positiveId(params.get("focusShiftId"));
  const selectedVehicleId = positiveId(params.get("focusVehicleId"));
  const periodStart = String(params.get("focusPeriodStart") || "").slice(0, 10) || null;
  const periodEnd = String(params.get("focusPeriodEnd") || "").slice(0, 10) || null;
  const financeView = String(params.get("view") || "").trim() || null;
  if (!selectedShiftId && !selectedVehicleId && !periodStart && !periodEnd && !financeView) return null;
  return {
    selectedEntityType: selectedShiftId ? "shift" : "screen",
    selectedEntityId: selectedShiftId,
    selectedShiftId,
    selectedVehicleId,
    periodStart,
    periodEnd,
    financeView,
    activeTab: financeView,
    screenType: "ROOM_FINANCIAL_OPERATIONS",
  };
}

export function setCopilotSelection(detail) {
  const next = detail && typeof detail === "object" ? detail : null;
  // The drawer applies the same route-bound check when it consumes this
  // envelope. Keep publishing the live panel selection even when a browser
  // host reports a transient hash/path mismatch during lazy-route mounting;
  // dropping it here loses an otherwise explicit current-record selection.
  // Cross-route use remains blocked by selectionApplies in the drawer and by
  // the server-side screen/tenant authorization checks.
  inMemorySelection = next;
  hasInMemorySelection = true;
  try {
    // Some real browser hosts freeze the Window object. Keep the canonical
    // selection envelope available to lazy-loaded consumers through a
    // page-memory mirror without persisting financial context in storage.
    writeSelectionMirror(next);
    window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
  } catch {
    // best effort: selection sync is non-critical
  }
}

export function clearCopilotSelection(scopeKey = "", options = {}) {
  try {
    const current = readCopilotSelection();
    const currentScope = String(current?.scopeKey || "").trim();
    const route = currentRoutePath();
    const staleFromAnotherRoute = Boolean(current && route && currentScope && currentScope !== route);
    if (!scopeKey || !current || currentScope === String(scopeKey) || staleFromAnotherRoute) {
      inMemorySelection = null;
      hasInMemorySelection = true;
      clearSelectionMirror();
      window.dispatchEvent(new CustomEvent(EVT, {
        detail: options?.resetConversation ? { resetConversation: true } : null,
      }));
    }
  } catch {
    // best effort: selection clear is non-critical
  }
}

export function readCopilotSelection() {
  try {
    // Lazy-loaded panels and the drawer can have separate module instances.
    // The window/document mirror is the shared same-tab source of truth;
    // prefer it so a stale in-memory copy cannot restore an old service/shift
    // context when the browser host freezes window extension.
    if (typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, KEY)) return window[KEY] || null;
    const root = documentSelectionMirror();
    if (root && Object.prototype.hasOwnProperty.call(root, KEY)) return root[KEY] || null;
  } catch {
    // Fall through to the same-bundle value below.
  }
  if (hasInMemorySelection) return inMemorySelection;
  return inMemorySelection;
}

// A dedicated copilot route may be reached through a full-page navigation
// where the in-memory/window selection event is lost for one render.  Carry
// only the selected record identity in the hash; the backend still resolves
// the record against the authenticated tenant before using it.
export function readCopilotRouteSelection() {
  try {
    if (typeof window === "undefined") return null;
    const hash = String(window.location?.hash || "").replace(/^#/, "");
    const [path, queryText = ""] = hash.split("?");
    if (!/\/copilot$/.test(String(path || ""))) return null;
    const params = new URLSearchParams(queryText);
    const scopeKey = String(params.get("copilotScope") || "").trim();
    const entityType = String(params.get("copilotEntityType") || "").trim();
    const entityId = Number(params.get("copilotEntityId") || 0);
    if (!scopeKey.startsWith("/") || !entityType || !Number.isSafeInteger(entityId) || entityId <= 0) return null;
    return {
      scopeKey,
      entityType,
      entityId,
      ...(params.get("copilotLabel") ? { label: String(params.get("copilotLabel")).slice(0, 180) } : {}),
    };
  } catch {
    return null;
  }
}

// A dedicated copilot route carries only a bounded identity in its URL. When
// the originating panel is still in the same tab, prefer its richer,
// tenant-scoped facts for the same record without ever merging a different
// route or entity into the URL handoff.
export function mergeCopilotSelection(routeSelection, storedSelection) {
  if (!routeSelection) return storedSelection || null;
  if (!storedSelection) return routeSelection;
  const sameRecord = String(routeSelection.scopeKey || "") === String(storedSelection.scopeKey || "")
    && String(routeSelection.entityType || "") === String(storedSelection.entityType || "")
    && Number(routeSelection.entityId || 0) === Number(storedSelection.entityId || 0);
  if (!sameRecord) return routeSelection;
  return {
    ...routeSelection,
    ...storedSelection,
    scopeKey: routeSelection.scopeKey || storedSelection.scopeKey,
    entityType: routeSelection.entityType || storedSelection.entityType,
    entityId: routeSelection.entityId || storedSelection.entityId,
    label: routeSelection.label || storedSelection.label,
  };
}

export function copilotSelectionEventName() {
  return EVT;
}
