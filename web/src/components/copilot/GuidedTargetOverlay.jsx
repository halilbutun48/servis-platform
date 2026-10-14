import { useEffect, useRef, useState } from 'react';
import { getPath } from '../../router';
import { clearGuidedTarget, getGuidedTarget, setGuidedTarget, shouldRestoreGuidedTargetAfterRouteChange, subscribeGuidedTarget } from '../../copilot/guidedTargetState';

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr-TR');
}

function visible(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
}

function topmostActionable(el) {
  if (!el || typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return false;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return true;
  const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return Boolean(top && (top === el || el.contains(top)));
}

function labelOf(el) {
  return [el?.getAttribute?.('data-copilot-label'), el?.getAttribute?.('aria-label'), el?.getAttribute?.('title'), el?.textContent, el?.value]
    .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
    .find(Boolean) || '';
}

function slug(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function semanticTypeOf(el) {
  if (el?.getAttribute?.('role') === 'tab') return 'tab';
  if (el?.matches?.('h1,h2,h3,[data-page-title]')) return 'section';
  if (el?.matches?.('summary')) return 'disclosure';
  return 'button';
}

function scrollTargetContainer(el, delta) {
  let node = el?.parentElement || null;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const scrollable = /(auto|scroll)/i.test(`${style.overflowY} ${style.overflow}`) && node.scrollHeight > node.clientHeight;
    if (scrollable) {
      node.scrollTop += delta;
      return true;
    }
    node = node.parentElement;
  }
  try {
    window.scrollBy({ top: delta, behavior: 'auto' });
    return true;
  } catch {
    return false;
  }
}

function keepTargetAboveMobileDrawer(el) {
  if (!el || typeof window === 'undefined' || window.innerWidth > 720) return;
  const drawer = document.querySelector('.copilotDrawer');
  if (!drawer) return;
  const targetRect = el.getBoundingClientRect();
  const drawerRect = drawer.getBoundingClientRect();
  if (!targetRect.width || !targetRect.height || !drawerRect.width || !drawerRect.height) return;
  const safeBottom = drawerRect.top - 16;
  if (targetRect.bottom > safeBottom && targetRect.top < drawerRect.bottom) {
    // The drawer is a fixed mobile surface. A semantic target must remain
    // visible above it after the normal center scroll; correct only the
    // bounded overlap and leave the target's own container untouched.
    scrollTargetContainer(el, targetRect.bottom - safeBottom);
  }
}

function targetNeedsReveal(el) {
  if (!el || typeof window === 'undefined') return false;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  if (rect.top < 0 || rect.bottom > window.innerHeight || rect.left < 0 || rect.right > window.innerWidth) return true;
  if (window.innerWidth > 720) return false;
  const drawer = document.querySelector('.copilotDrawer');
  if (!drawer) return false;
  const drawerRect = drawer.getBoundingClientRect();
  const safeBottom = drawerRect.top - 16;
  return rect.bottom > safeBottom && rect.top < drawerRect.bottom;
}

function findTarget(target) {
  if (!target?.label) return null;
  // A target from the pre-navigation surface is never allowed to remain
  // visually active while the destination route is live.  The destination
  // workflow must publish a fresh canonical target before it can be shown.
  if (!shouldRestoreGuidedTargetAfterRouteChange(target, getPath())) return null;
  const exact = normalize(target.label);
  const nodes = Array.from(document.querySelectorAll('button,[role="button"],a[href],[role="tab"],input,select,summary,[data-copilot-label],[data-copilot-block-key],[data-copilot-semantic-id],h1,h2,h3,[data-page-title]'))
    .filter((el) => !el.closest?.('.copilotDrawer,.copilotFab,.copilotPanel,[data-copilot-ignore="true"]'))
    .filter(visible);
  const canonicalIdentity = String(target.targetKey || target.blockKey || target.semanticId || '').trim();
  const isBlock = String(target.targetKind || '').toUpperCase() === 'BLOCK' || Boolean(target.blockKey);
  const candidates = isBlock ? nodes : nodes.filter(topmostActionable);
  const canonicalEnvelope = target.identitySource === 'CANONICAL' || isBlock;
  if (canonicalIdentity && canonicalEnvelope) {
    // Canonical identity wins before viewport/occlusion filtering. A real
    // target may be below the fold or inside a closed <details>; it must be
    // revealed and re-resolved rather than replaced by a nearby control.
    const expectedSemanticId = String(target.semanticId || '').trim();
    const expectedBlockKey = String(target.blockKey || '').trim();
    const exactIdentity = nodes.find((el) => {
      const targetKey = String(el.getAttribute?.(isBlock ? 'data-copilot-block-key' : 'data-copilot-target') || '').trim();
      const semanticId = String(el.getAttribute?.('data-copilot-semantic-id') || '').trim();
      const blockKey = String(el.getAttribute?.('data-copilot-block-key') || '').trim();
      return targetKey === canonicalIdentity
        || (expectedSemanticId && semanticId === expectedSemanticId)
        || (isBlock && expectedBlockKey && blockKey === expectedBlockKey);
    });
    // A canonical identity is authoritative. Never substitute a label or a
    // nearby node when the exact semantic target is absent.
    if (exactIdentity) return exactIdentity;
    return null;
  }
  const actionable = candidates;
  const sameType = target.semanticType ? actionable.filter((el) => semanticTypeOf(el) === target.semanticType) : actionable;
  return sameType.find((el) => `${slug(target.screenPath)}:${slug(semanticTypeOf(el))}:${slug(labelOf(el))}` === String(target.targetKey || ''))
    || sameType.find((el) => normalize(labelOf(el)) === exact)
    || actionable.find((el) => normalize(labelOf(el)).includes(exact) || exact.includes(normalize(labelOf(el))))
    || null;
}

function revealClosedContainingSurface(el) {
  if (!el || typeof el.closest !== 'function') return false;
  const details = el.closest('details');
  if (!details || details.open) return false;
  const summary = details.querySelector(':scope > summary');
  if (!summary || summary.disabled || summary.getAttribute?.('aria-disabled') === 'true') return false;
  summary.click();
  return true;
}

function revealMobileNavigationForTarget(target) {
  if (typeof window === 'undefined' || window.innerWidth > 720) return false;
  const targetKey = String(target?.targetKey || '').trim();
  if (!/^room:[^:]+$/u.test(targetKey)) return false;
  const trigger = document.querySelector('.shellTopMenu[aria-controls="shell-nav-dock"]');
  if (!trigger || String(trigger.getAttribute('aria-expanded') || '').toLowerCase() === 'true') return false;
  trigger.click();
  return true;
}

function mobileNavigationTargetReady(target, el) {
  const targetKey = String(target?.targetKey || '').trim();
  if (typeof window === 'undefined' || window.innerWidth > 720 || !/^room:[^:]+$/u.test(targetKey)) return true;
  const nav = document.querySelector('#shell-nav-dock.navDock--mobileOpen');
  if (!nav || !el) return false;
  const navRect = nav.getBoundingClientRect();
  const targetRect = el.getBoundingClientRect();
  // Wait for the existing drawer transition to expose the canonical target;
  // resolving during the transform would freeze the overlay off-screen.
  return navRect.right > 0 && targetRect.right > 0;
}

export default function GuidedTargetOverlay() {
  const [target, setTarget] = useState(() => getGuidedTarget());
  const [rect, setRect] = useState(null);
  const targetRef = useRef(null);
  const placedRef = useRef(false);
  const activatedNavigationRef = useRef(null);

  useEffect(() => subscribeGuidedTarget((next) => {
    placedRef.current = false;
    targetRef.current = null;
    activatedNavigationRef.current = null;
    setRect(null);
    setTarget(next);
  }), []);

  useEffect(() => {
    if (!target || target.status === 'FOUND' || target.status === 'UNAUTHORIZED') return undefined;
    const workflow = document.querySelector('[data-copilot-workflow-id]');
    const workflowTargetKey = String(workflow?.getAttribute?.('data-copilot-workflow-target-key') || '').trim();
    const workflowTargetLabel = String(workflow?.getAttribute?.('data-copilot-workflow-target-label') || '').replace(/\s+/g, ' ').trim();
    if (!workflowTargetKey || !workflowTargetLabel) return undefined;
    setGuidedTarget(target ? {
      ...target,
      status: 'FOUND',
      targetKey: workflowTargetKey,
      label: workflowTargetLabel,
      semanticType: target.semanticType || 'button',
    } : null);
    return undefined;
  }, [target]);

  useEffect(() => {
    const clearOnRouteChange = () => {
      const active = getGuidedTarget();
      if (active?.status === 'FOUND') clearGuidedTarget('STATE_CHANGED');
    };
    window.addEventListener('hashchange', clearOnRouteChange);
    return () => window.removeEventListener('hashchange', clearOnRouteChange);
  }, []);

  useEffect(() => {
    if (!target || target.status !== 'FOUND') return undefined;
    let disposed = false;
    const place = () => {
      if (disposed) return;
      const el = findTarget(target);
      if (!el) {
        if (revealMobileNavigationForTarget(target)) {
          targetRef.current = null;
          placedRef.current = false;
          setRect(null);
          return;
        }
        const workflow = document.querySelector('[data-copilot-workflow-id]');
        const workflowTargetKey = String(workflow?.getAttribute?.('data-copilot-workflow-target-key') || '').trim();
        const workflowTargetLabel = String(workflow?.getAttribute?.('data-copilot-workflow-target-label') || '').replace(/\s+/g, ' ').trim();
        // A guided modal can replace its step target in the same render that
        // removes the previous step's control. Re-resolve from the live
        // workflow marker before reporting recovery so a transient DOM gap
        // never leaves the assistant attached to a stale step.
        if (workflowTargetKey && workflowTargetLabel && workflowTargetKey !== String(target.targetKey || '')) {
          targetRef.current = null;
          placedRef.current = false;
          setRect(null);
          setGuidedTarget(target ? {
            ...target,
            status: 'FOUND',
            targetKey: workflowTargetKey,
            label: workflowTargetLabel,
          } : null);
          return;
        }
        const hadTarget = Boolean(targetRef.current);
        targetRef.current = null;
        setRect(null);
        if (hadTarget) clearGuidedTarget('TARGET_DISAPPEARED');
        return;
      }
      if (!mobileNavigationTargetReady(target, el)) {
        targetRef.current = null;
        placedRef.current = false;
        setRect(null);
        return;
      }
      const navigationKey = `${String(target.targetKey || target.semanticId || '')}:${String(target.screenPath || '')}`;
      const canonicalTabNavigation = target.identitySource === 'CANONICAL'
        && String(target.semanticType || '').toLowerCase() === 'tab';
      if ((target.safeAction === 'NAVIGATE' || canonicalTabNavigation)
        && activatedNavigationRef.current !== navigationKey) {
        activatedNavigationRef.current = navigationKey;
        targetRef.current = null;
        placedRef.current = false;
        setRect(null);
        el.click();
        return;
      }
      targetRef.current = el;
      if (revealClosedContainingSurface(el)) {
        // The disclosure click is an M18-safe presentation action. Wait for
        // its DOM settlement, then resolve the same canonical child again.
        targetRef.current = null;
        placedRef.current = false;
        setRect(null);
        return;
      }
      if (!placedRef.current || targetNeedsReveal(el)) {
        placedRef.current = true;
        const behavior = typeof window !== 'undefined' && window.innerWidth <= 720 ? 'auto' : 'smooth';
        try { el.scrollIntoView({ behavior, block: 'center', inline: 'nearest' }); } catch { /* no-op */ }
      }
      keepTargetAboveMobileDrawer(el);
      const next = el.getBoundingClientRect();
      setRect({ left: next.left - 6, top: next.top - 6, width: next.width + 12, height: next.height + 12 });
    };
    let frame = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => { frame = null; place(); });
    };
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null;
    observer?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-selected', 'aria-expanded', 'disabled', 'open'] });
    const handleTransitionEnd = (event) => {
      if (event.target?.matches?.('#shell-nav-dock')) schedule();
    };
    document.addEventListener('transitionend', handleTransitionEnd, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    place();
    return () => {
      disposed = true;
      observer?.disconnect();
      document.removeEventListener('transitionend', handleTransitionEnd, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [target]);

  if (!target || target.status === 'CLEARED') return null;
  // Recovery feedback is rendered inside the active Sefer Abi drawer so it
  // stays attached to the guided conversation instead of becoming a detached
  // global toast over the product surface.
  if (target.status !== 'FOUND') return null;
  return rect ? (
    <>
      <div aria-hidden="true" data-copilot-resolved-target-key={target.targetKey || target.blockKey || target.semanticId || ''} data-copilot-resolved-identity-source={target.identitySource || ''} style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, zIndex: 2147482998, pointerEvents: 'none', border: '3px solid #175cd3', borderRadius: 10, boxShadow: '0 0 0 4px rgba(23,92,211,.18)', transition: 'left .18s ease, top .18s ease, width .18s ease, height .18s ease' }} />
      <div role="status" aria-live="polite" data-copilot-resolved-target-key={target.targetKey || target.blockKey || target.semanticId || ''} data-copilot-resolved-identity-source={target.identitySource || ''} style={{ position: 'fixed', left: Math.max(8, rect.left), top: Math.max(8, rect.top - 34), zIndex: 2147482999, pointerEvents: 'none', padding: '6px 9px', borderRadius: 8, background: '#175cd3', color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 14px rgba(16,24,40,.18)' }}>Buraya bak: {target.label}</div>
    </>
  ) : null;
}
