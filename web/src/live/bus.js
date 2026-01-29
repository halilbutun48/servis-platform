// web/src/live/bus.js
// Çok küçük bir pub-sub: invalidate("shifts") => useAutoReload("shifts") tetikler.

const et = new EventTarget();

/**
 * topic: "shifts" | "vehicles" | "drivers" | "rooms" | ...
 * payload: opsiyonel debug/info
 */
export function invalidate(topic, payload) {
  const t = String(topic || "").trim();
  if (!t) return;

  et.dispatchEvent(
    new CustomEvent(t, {
      detail: {
        topic: t,
        ts: Date.now(),
        payload: payload ?? null,
      },
    })
  );
}

export function on(topic, handler) {
  const t = String(topic || "").trim();
  if (!t) return () => {};

  const fn = (e) => handler?.(e?.detail);
  et.addEventListener(t, fn);

  return () => et.removeEventListener(t, fn);
}