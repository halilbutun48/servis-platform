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
export function useAutoReload(topic, fn, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const inFlightRef = useRef(false);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    return on(topic, (detail) => {
      pendingRef.current = detail;
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      (async () => {
        try {
          while (pendingRef.current) {
            const d = pendingRef.current;
            pendingRef.current = null;
            try {
              await Promise.resolve(fnRef.current?.(d));
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn("useAutoReload handler error:", e);
            }
          }
        } finally {
          inFlightRef.current = false;
        }
      })();
    });
  }, [topic, enabled]);
}
