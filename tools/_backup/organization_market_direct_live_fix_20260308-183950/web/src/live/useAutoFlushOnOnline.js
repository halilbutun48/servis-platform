import { useEffect, useRef } from "react";

/**
 * M72.1 — Online olunca otomatik flush
 *
 * Kullanım:
 *   const isOnline = useOnlineStatus();
 *   useAutoFlushOnOnline({ isOnline, queueLength: queue.length, flush: flushQueue });
 */
export function useAutoFlushOnOnline({ isOnline, queueLength, flush }) {
  const wasOnlineRef = useRef(isOnline);
  const busyRef = useRef(false);

  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    // offline->online geçişinde ve kuyruk varsa flush
    if (!wasOnline && isOnline && queueLength > 0) {
      if (busyRef.current) return;

      busyRef.current = true;
      Promise.resolve()
        .then(() => flush?.())
        .catch(() => {})
        .finally(() => {
          busyRef.current = false;
        });
    }
  }, [isOnline, queueLength, flush]);
}
