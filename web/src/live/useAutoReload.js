// web/src/live/useAutoReload.js
import { useEffect, useRef } from "react";
import { on } from "./bus";

/**
 * useAutoReload("shifts", loadAll)
 * useAutoReload("rooms", load, !isCompany)  // enabled gate
 *
 * ✅ M77.1: in-flight guard
 * - Aynı topic art arda invalidate alırsa, load() concurrent çalışmaz.
 * - Sadece en son invalidate detayı saklanır; mevcut load bitince 1 kez daha çalışır.
 */
export function useAutoReload(topic, fn, enabled = true, debounceMs = 180) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const inFlightRef = useRef(false);
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    function runQueued() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (inFlightRef.current) return;
        if (!pendingRef.current) return;
        inFlightRef.current = true;
        (async () => {
          try {
            while (pendingRef.current) {
              const d = pendingRef.current;
              pendingRef.current = null;
              try {
                await Promise.resolve(fnRef.current?.(d));
              } catch (e) {
                console.warn("useAutoReload handler error:", e);
              }
            }
          } finally {
            inFlightRef.current = false;
            if (pendingRef.current) runQueued();
          }
        })();
      }, Math.max(0, Number(debounceMs || 0)));
    }

    const off = on(topic, (detail) => {
      pendingRef.current = detail || {};
      runQueued();
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      off?.();
    };
  }, [topic, enabled, debounceMs]);
}
