// web/src/live/bus.js
// Çok küçük bir pub-sub: invalidate("shifts") => useAutoReload("shifts") tetikler.

const et = new EventTarget();

// ✅ M77: WS spam → HTTP spam zincirini kırmak için topic bazlı debounce.
// Sadece {source:"ws"} invalidate'lerini coalesce eder (local invalidate anında çalışır).
// ✅ M77.1: sliding debounce (her event timer'ı resetler → quiet window sonrası 1 dispatch)
const deb = new Map(); // topic -> { timer, lastPayload }

/**
 * topic: "shifts" | "vehicles" | "drivers" | "rooms" | ...
 * payload: opsiyonel debug/info
 */
export function invalidate(topic, payload) {
  const t = String(topic || "").trim();
  if (!t) return;

  const isWs = payload && typeof payload === "object" && payload.source === "ws";
  const ms = isWs ? Number(payload.debounceMs ?? 1000) : 0;

  if (isWs && Number.isFinite(ms) && ms > 0) {
    const prev = deb.get(t);
    const rec = prev || { timer: null, lastPayload: null };

    // sliding: reset timer
    if (rec.timer) {
      try { clearTimeout(rec.timer); } catch {
        // best effort: stale debounce timer cleanup
      }
      rec.timer = null;
    }

    rec.lastPayload = payload ?? null;
    rec.timer = window.setTimeout(() => {
      try { deb.delete(t); } catch {
        // best effort: debounce map cleanup
      }

      et.dispatchEvent(
        new CustomEvent(t, {
          detail: {
            topic: t,
            ts: Date.now(),
            payload: rec.lastPayload ?? null,
          },
        })
      );
    }, ms);

    deb.set(t, rec);
    return;
  }

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
