// backend/src/notifications/payloadV1.js
import { isoOffsetTR } from "../time/tr.js";
export function buildNotifPayloadV1({ title, message, vehicleId, at, ageSec, status, kind }) {
  return {
    v: 1,
    title,
    message,
    vehicleId,
    at: at ?? isoOffsetTR(),
    ageSec: typeof ageSec === "number" ? ageSec : null,
    status: status ?? null,
    kind: kind ?? null,
  };
}