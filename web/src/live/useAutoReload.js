import { useEffect } from "react";
import { onInvalidate } from "./bus";

// Re-run `load` when `key` is invalidated.
export function useAutoReload(key, load) {
  useEffect(() => {
    if (!key || !load) return;
    return onInvalidate(key, () => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
