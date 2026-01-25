// backend/src/notifications/payloadV1.js
export function buildNotifPayloadV1({ title, message, vehicleId, at, ageSec, status, kind }) {
  return {
    v: 1,
    title,
    message,
    vehicleId,
    at: at ?? new Date().toISOString(),
    ageSec: typeof ageSec === "number" ? ageSec : null,
    status: status ?? null,
    kind: kind ?? null,
  };
}