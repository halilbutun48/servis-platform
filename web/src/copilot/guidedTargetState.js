const EVENT_NAME = 'seferpakt:copilot-guided-target';
let currentTarget = null;

export function getGuidedTarget() {
  return currentTarget;
}

export function setGuidedTarget(target) {
  currentTarget = target && typeof target === 'object' ? { ...target } : null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: currentTarget }));
  }
  return currentTarget;
}

export function clearGuidedTarget(status = 'CLEARED') {
  return setGuidedTarget(status ? { status } : null);
}

export function subscribeGuidedTarget(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener(event?.detail || null);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export { EVENT_NAME as GUIDED_TARGET_EVENT };
