// Tiny global invalidation bus: panels can reload without tight coupling.
const bus = new EventTarget();

export function invalidate(key, detail) {
  bus.dispatchEvent(new CustomEvent(key, { detail }));
}

export function onInvalidate(key, handler) {
  const cb = (e) => handler(e.detail);
  bus.addEventListener(key, cb);
  return () => bus.removeEventListener(key, cb);
}
