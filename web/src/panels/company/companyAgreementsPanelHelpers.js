import { toHHMM } from "../../utils/agreementUi";
import { ymdTR } from "../../utils/time";

export function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999+03:00");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}

export function todayYmd() {
  return ymdTR();
}

export function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}

export function buildRouteRefreshLaunch({ agreement, room, origin }) {
  const sourceShiftId = Number(origin?.sourceShiftId || 0);
  if (!sourceShiftId) return null;

  const agreementId = Number(agreement?.id || 0);
  const roomId = Number(agreement?.roomId || room?.id || 0);
  const startDate = String(agreement?.startDate || "").slice(0, 10);
  const endDate = String(agreement?.endDate || "").slice(0, 10);
  const today = todayYmd();
  const refreshStartDate = isYmd(startDate) && startDate > today ? startDate : today;
  const startHHMM = toHHMM(agreement?.startMin) || "08:00";
  const endHHMM = toHHMM(agreement?.endMin) || "10:00";

  return {
    mode: "ROUTE_REFRESH",
    agreementId,
    roomId: roomId || null,
    roomName: room?.name || null,
    sourceShiftId,
    sourceSummary: String(origin?.sourceSummary || "").trim() || null,
    startDate: refreshStartDate,
    agreementStartDate: isYmd(startDate) ? startDate : null,
    agreementEndDate: isYmd(endDate) ? endDate : null,
    durationKey: "1w",
    weekMask: Number(agreement?.weekMask || 62) || 62,
    startHHMM,
    endHHMM,
    direction: String(agreement?.direction || "INBOUND").toUpperCase(),
    pattern: String(agreement?.pattern || "ONE_WAY").toUpperCase(),
    hubLat: agreement?.hubLat ?? null,
    hubLng: agreement?.hubLng ?? null,
    currentCompanyOfferAmount: agreement?.companyOfferAmount ?? null,
    currentRoomOfferAmount: agreement?.roomOfferAmount ?? null,
  };
}

export function canRouteRefresh(agreement, origin) {
  const status = String(agreement?.status || "").toUpperCase();
  if (!["APPROVED", "ACTIVE"].includes(status)) return false;
  return Number(origin?.sourceShiftId || 0) > 0;
}

export function isActiveRouteRefreshStatus(status) {
  return ["PENDING", "COUNTERED"].includes(String(status || "").toUpperCase());
}

export function moneyTry(value) {
  const n = Number(value || 0);
  return `${new Intl.NumberFormat("tr-TR").format(Number.isFinite(n) ? n : 0)} ₺`;
}

export function trDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}/.test(text)) return text.replace(/\s*[—–-]\s*/g, " - ");
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.day}.${map.month}.${map.year} ${map.hour}:${map.minute}`;
}

export function compactText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || String(fallback || "").trim();
}
