const KEY = "__psv1CopilotSelection";
const EVT = "psv1:copilot-selection";

export function setCopilotSelection(detail) {
  try {
    const next = detail && typeof detail === "object" ? detail : null;
    window[KEY] = next;
    window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
  } catch {}
}

export function clearCopilotSelection(scopeKey = "") {
  try {
    const current = window[KEY] || null;
    if (!scopeKey || !current || String(current.scopeKey || "") === String(scopeKey)) {
      window[KEY] = null;
      window.dispatchEvent(new CustomEvent(EVT, { detail: null }));
    }
  } catch {}
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
