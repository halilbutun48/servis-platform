import { dateOnlyUTCFromYmd } from "../time/tr.js";
import { createAndEmitNotification } from "../notifications/service.js";

export function parseDateOnly(s) {
  const v = String(s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return dateOnlyUTCFromYmd(v);
}

export function toInt(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function toFloat(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function clampMin(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n < 0 || n > 1439) return null;
  return n;
}

export function clampWeekMask(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n < 1 || n > 127) return null;
  return n;
}

export function trimOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export function offerSummary(amount, note) {
  return `${amount ?? "-"}${note ? " — " + note : ""}`;
}

export function routeRefreshWindowSummary(item) {
  const startDate = String(item?.startDate || "").slice(0, 10) || "-";
  const endDate = String(item?.endDate || "").slice(0, 10) || "-";
  const shiftCount = Number(item?.shiftCount || 0);
  const stopCount = Number(item?.stopCount || 0);
  const peopleCount = Number(item?.peopleCount || 0);
  return `${startDate} → ${endDate} • ${shiftCount} taslak vardiya • ${stopCount} durak • ${peopleCount} personel`;
}

export async function emitAgreementNotification(io, { type, scope, companyId = null, roomId = null, kind, title, message, dedupeKey }) {
  return createAndEmitNotification({
    io,
    type,
    scope,
    companyId,
    roomId,
    payload: {
      v: 1,
      kind,
      title,
      message,
    },
    dedupeKey,
  });
}

export function parseRouteRefreshDecision(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (["ACCEPT", "ACCEPTED", "APPROVE", "APPROVED", "KABUL"].includes(raw)) return "ACCEPTED";
  if (["REJECT", "REJECTED", "DECLINE", "DECLINED", "REDDET"].includes(raw)) return "REJECTED";
  if (["CANCEL", "CANCELLED", "CANCELED", "IPTAL", "İPTAL"].includes(raw)) return "CANCELLED";
  return null;
}

export function parseOfferAmount(v) {
  const n = toInt(v, null);
  if (n == null) return null;
  if (n <= 0) return null;
  return n;
}

export function parseOfferAmountNullable(v) {
  const raw = v == null ? "" : String(v).trim();
  if (!raw) return null;
  return parseOfferAmount(raw);
}

export function normDirection(v) {
  const s = String(v || "INBOUND").trim().toUpperCase();
  if (s === "INBOUND" || s === "OUTBOUND") return s;
  return null;
}

export function normPattern(v) {
  const s = String(v || "ONE_WAY").trim().toUpperCase();
  if (s === "ONE_WAY" || s === "LOOP") return s;
  return null;
}

export function parseHub(body) {
  const lat = body?.hubLat == null || body?.hubLat === "" ? null : toFloat(body.hubLat, null);
  const lng = body?.hubLng == null || body?.hubLng === "" ? null : toFloat(body.hubLng, null);
  if (lat == null && lng == null) return { hubLat: null, hubLng: null };
  if (lat == null || lng == null) return { error: "hubLat+hubLng birlikte olmalı" };
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: "hubLat/hubLng range invalid" };
  return { hubLat: lat, hubLng: lng };
}
