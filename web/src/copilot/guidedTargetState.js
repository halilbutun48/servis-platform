const EVENT_NAME = 'seferpakt:copilot-guided-target';
let currentTarget = null;

function normalizeGuidedTarget(target) {
  if (!target || typeof target !== 'object') return null;
  return {
    ...target,
    targetKind: String(target.targetKind || 'CONTROL').toUpperCase(),
    targetKey: target.targetKey ? String(target.targetKey) : null,
    semanticId: target.semanticId ? String(target.semanticId) : null,
    blockKey: target.blockKey ? String(target.blockKey) : null,
    identitySource: String(target.identitySource || 'LEGACY_LABEL'),
    authorizedContext: target.authorizedContext && typeof target.authorizedContext === 'object' ? { ...target.authorizedContext } : null,
    anchor: target.anchor && typeof target.anchor === 'object' ? { ...target.anchor } : null,
    locator: target.locator && typeof target.locator === 'object' ? { ...target.locator } : null,
    callout: target.callout && typeof target.callout === 'object' ? { ...target.callout } : null,
  };
}

export function getGuidedTarget() {
  return currentTarget;
}

// A target captured before a guided surface transition may be restored only
// while it still belongs to the live route.  Route changes invalidate the
// pre-navigation target; the destination surface must resolve its own
// canonical target instead of inheriting stale visual state.
export function shouldRestoreGuidedTargetAfterRouteChange(target, currentPath) {
  if (!target || target.status !== 'FOUND') return false;
  const targetPath = String(target.screenPath || '').trim();
  const routePath = String(currentPath || '').trim();
  return !targetPath || !routePath || targetPath === routePath;
}

// A canonical navigation target may intentionally belong to a different
// route.  It is safe to start that transition only when the backend supplied
// an explicit navigation action and canonical identity; legacy labels must
// never become arbitrary client-side routes.
export function shouldNavigateGuidedTarget(target, currentPath) {
  if (!target || target.status !== 'FOUND') return false;
  if (String(target.safeAction || '').toUpperCase() !== 'NAVIGATE') return false;
  if (String(target.identitySource || '').toUpperCase() !== 'CANONICAL') return false;
  const targetPath = String(target.screenPath || '').trim();
  const routePath = String(currentPath || '').trim();
  return Boolean(targetPath && routePath && targetPath !== routePath);
}

export function setGuidedTarget(target) {
  currentTarget = normalizeGuidedTarget(target);
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
