const KEY = "__psv1CopilotSelection";
const EVT = "psv1:copilot-selection";
let inMemorySelection = null;
let hasInMemorySelection = false;

function currentRoutePath() {
  if (typeof window === "undefined") return "";
  const hash = String(window.location?.hash || "").replace(/^#/, "");
  const rawPath = (hash.split("?", 1)[0] || window.location?.pathname || "").trim();
  if (!rawPath) return "";
  return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
}

function selectionBelongsToCurrentRoute(selection) {
  const scope = String(selection?.scopeKey || "").trim();
  const route = currentRoutePath();
  // Non-browser consumers and screen-less diagnostics have no route to bind.
  if (!scope || !route) return true;
  return scope === route;
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

export function setCopilotSelection(detail) {
  const next = detail && typeof detail === "object" ? detail : null;
  if (!selectionBelongsToCurrentRoute(next)) return;
  inMemorySelection = next;
  hasInMemorySelection = true;
  try {
    // Some real browser hosts freeze the Window object. Keep the canonical
    // selection envelope available to same-bundle consumers even when the
    // optional browser-global mirror cannot be assigned.
    if (typeof window !== "undefined" && Object.isExtensible(window)) window[KEY] = next;
    window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
  } catch {
    // best effort: selection sync is non-critical
  }
}

export function clearCopilotSelection(scopeKey = "") {
  try {
    const current = readCopilotSelection();
    if (!scopeKey || !current || String(current.scopeKey || "") === String(scopeKey)) {
      inMemorySelection = null;
      hasInMemorySelection = true;
      if (typeof window !== "undefined" && Object.isExtensible(window)) window[KEY] = null;
      window.dispatchEvent(new CustomEvent(EVT, { detail: null }));
    }
  } catch {
    // best effort: selection clear is non-critical
  }
}

export function readCopilotSelection() {
  if (hasInMemorySelection) return inMemorySelection;
  try {
    if (typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, KEY)) return window[KEY] || null;
  } catch {
    // Fall through to the same-bundle value below.
  }
  return inMemorySelection;
}

export function copilotSelectionEventName() {
  return EVT;
}
