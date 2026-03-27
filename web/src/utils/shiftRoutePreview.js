import { cachedGet } from "./uiDataCache";

export async function getShiftRoutePreview(token, shiftId, { signal, force = false, ttlMs = 30000, delayMs = 80 } = {}) {
  const sid = Number(shiftId || 0);
  if (!token || !sid) return null;
  return cachedGet(`/api/shifts/${sid}/route-preview`, { token, signal, force, ttlMs, delayMs });
}
