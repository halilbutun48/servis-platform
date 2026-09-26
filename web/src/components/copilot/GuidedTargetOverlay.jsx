import { useEffect, useRef, useState } from 'react';
import { clearGuidedTarget, getGuidedTarget, subscribeGuidedTarget } from '../../copilot/guidedTargetState';

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

function findTarget(target) {
  if (!target?.label) return null;
  const exact = normalize(target.label);
  const nodes = Array.from(document.querySelectorAll('button,[role="button"],a[href],[role="tab"],input,select,summary,[data-copilot-label],h1,h2,h3,[data-page-title]'))
    .filter((el) => !el.closest?.('.copilotDrawer,.copilotFab,.copilotPanel,[data-copilot-ignore="true"]'))
    .filter(visible);
  const explicit = nodes.find((el) => String(el.getAttribute?.('data-copilot-target') || '') === String(target.targetKey || ''));
  if (explicit) return explicit;
  const sameType = target.semanticType ? nodes.filter((el) => semanticTypeOf(el) === target.semanticType) : nodes;
  return sameType.find((el) => `${slug(target.screenPath)}:${slug(semanticTypeOf(el))}:${slug(labelOf(el))}` === String(target.targetKey || ''))
    || sameType.find((el) => normalize(labelOf(el)) === exact)
    || nodes.find((el) => normalize(labelOf(el)).includes(exact) || exact.includes(normalize(labelOf(el))))
    || null;
}

export default function GuidedTargetOverlay() {
  const [target, setTarget] = useState(() => getGuidedTarget());
  const [rect, setRect] = useState(null);
  const targetRef = useRef(null);
  const placedRef = useRef(false);

  useEffect(() => subscribeGuidedTarget((next) => {
    placedRef.current = false;
    targetRef.current = null;
    setRect(null);
    setTarget(next);
  }), []);

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
        const hadTarget = Boolean(targetRef.current);
        targetRef.current = null;
        setRect(null);
        if (hadTarget) clearGuidedTarget('TARGET_DISAPPEARED');
        return;
      }
      targetRef.current = el;
      if (!placedRef.current) {
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
    observer?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-selected', 'aria-expanded', 'disabled'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    place();
    return () => {
      disposed = true;
      observer?.disconnect();
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
      <div aria-hidden="true" style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, zIndex: 2147482998, pointerEvents: 'none', border: '3px solid #175cd3', borderRadius: 10, boxShadow: '0 0 0 4px rgba(23,92,211,.18)', transition: 'left .18s ease, top .18s ease, width .18s ease, height .18s ease' }} />
      <div role="status" aria-live="polite" style={{ position: 'fixed', left: Math.max(8, rect.left), top: Math.max(8, rect.top - 34), zIndex: 2147482999, pointerEvents: 'none', padding: '6px 9px', borderRadius: 8, background: '#175cd3', color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 4px 14px rgba(16,24,40,.18)' }}>Buraya bak: {target.label}</div>
    </>
  ) : null;
}
