import { safeParseJson } from "./safeParseJson";

export function normalizeNotifV1(payloadJsonOrObj) {
  const p = safeParseJson(payloadJsonOrObj, {}) ?? {};
  return {
    v: 1,
    title: p.title ?? "",
    message: p.message ?? "",
    vehicleId: p.vehicleId ?? null,
    at: p.at ?? null,
    ageSec: typeof p.ageSec === "number" ? p.ageSec : null,
    status: p.status ?? null, // LIVE|STALE|OFFLINE
    kind: p.kind ?? null,     // GPS_STALE|OVERSPEED|MAINTENANCE...
  };
}