// web/src/live/useAutoReload.js
import { useEffect, useRef } from "react";
import { on } from "./bus";

/**
 * useAutoReload("shifts", loadAll)
 * useAutoReload("rooms", load, !isCompany)  // enabled gate
 */
export function useAutoReload(topic, fn, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;

    return on(topic, () => {
      try {
        fnRef.current?.();
      } catch (e) {
        // sessizce geç
        // eslint-disable-next-line no-console
        console.warn("useAutoReload handler error:", e);
      }
    });
  }, [topic, enabled]);
}