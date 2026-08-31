const SHARED_COPILOT_STATE_KEY = "psv1:copilot:shared-state:v1";
const SHARED_COPILOT_STATE_EVENT = "psv1:copilot:shared-state";
let memoryState = null;

export function readCopilotSharedState() {
  if (memoryState) return memoryState;
  try {
    const raw = localStorage.getItem(SHARED_COPILOT_STATE_KEY);
    const value = raw ? JSON.parse(raw) : null;
    memoryState = value && typeof value === "object" ? value : null;
    return memoryState;
  } catch {
    return null;
  }
}

export function writeCopilotSharedState(next = {}) {
  const previous = readCopilotSharedState() || {};
  const value = {
    ...previous,
    ...next,
    updatedAt: new Date().toISOString(),
    messages: Array.isArray(next.messages) ? next.messages.slice(-20) : Array.isArray(previous.messages) ? previous.messages.slice(-20) : [],
  };
  memoryState = value;
  try { localStorage.setItem(SHARED_COPILOT_STATE_KEY, JSON.stringify(value)); } catch { /* best effort */ }
  try { window.dispatchEvent(new CustomEvent(SHARED_COPILOT_STATE_EVENT, { detail: value })); } catch { /* best effort */ }
  return value;
}

export function copilotSharedStateEventName() {
  return SHARED_COPILOT_STATE_EVENT;
}
