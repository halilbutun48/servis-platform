const KEY = "__psv1CopilotSelection";
const EVT = "psv1:copilot-selection";

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
  try {
    const next = detail && typeof detail === "object" ? detail : null;
    window[KEY] = next;
    window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
  } catch {
    // best effort: selection sync is non-critical
  }
}

export function clearCopilotSelection(scopeKey = "") {
  try {
    const current = window[KEY] || null;
    if (!scopeKey || !current || String(current.scopeKey || "") === String(scopeKey)) {
      window[KEY] = null;
      window.dispatchEvent(new CustomEvent(EVT, { detail: null }));
    }
  } catch {
    // best effort: selection clear is non-critical
  }
}

export function readCopilotSelection() {
  try {
    return window[KEY] || null;
  } catch {
    return null;
  }
}

export function copilotSelectionEventName() {
  return EVT;
}
