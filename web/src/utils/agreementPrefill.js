import { addDaysISO } from "./agreementUi";
import { formatDateTR, formatTimeTR, weekdayBitFromYmdTR, ymdTR } from "./time";

const STORAGE_KEY = "company:agreementPrefill:v1";

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasCoord(lat, lng) {
  return safeNum(lat) != null && safeNum(lng) != null;
}

function buildSourceSummary({ shift, room, sourceDate, startHHMM, endHHMM, stopCount, peopleCount }) {
  const parts = [];
  parts.push(`Vardiya #${Number(shift?.id || 0) || "?"}`);
  if (room?.name) {
    const roomName = String(room.name).replace(/^(Room|Oda)\s+/i, "").trim();
    parts.push(`Taşımacılık Firması ${roomName}`);
  }
  parts.push(`${formatDateTR(shift?.startAt || sourceDate)} ${startHHMM} → ${endHHMM}`);
  if (stopCount > 0) parts.push(`${stopCount} durak`);
  if (peopleCount > 0) parts.push(`${peopleCount} personel`);
  return parts.join(" • ");
}

export function buildAgreementPrefillFromShift({ shift, room } = {}) {
  const shiftId = Number(shift?.id || 0);
  const roomId = Number(shift?.roomId || room?.id || 0);
  if (!shiftId || !roomId) return null;

  const sourceDate = ymdTR(shift?.startAt || new Date());
  const startDate = addDaysISO(sourceDate, 1);
  const startHHMM = formatTimeTR(shift?.startAt || new Date(), { hour: "2-digit", minute: "2-digit", hour12: false });
  const endHHMM = formatTimeTR(shift?.endAt || shift?.startAt || new Date(), { hour: "2-digit", minute: "2-digit", hour12: false });
  const stopCount = Array.isArray(shift?.stops)
    ? shift.stops.filter((s) => String(s?.kind || "").toUpperCase() !== "HUB").length
    : Number(shift?.stopCountWithoutHub || shift?.stopCount || 0);
  const peopleCount = Number(shift?.passengerCount || shift?.assignmentCount || shift?.peopleCount || 0);
  const hasShiftHub = hasCoord(shift?.hubLat, shift?.hubLng);

  return {
    source: "SHIFT",
    sourceShiftId: shiftId,
    sourceSummary: buildSourceSummary({ shift, room, sourceDate, startHHMM, endHHMM, stopCount, peopleCount }),
    roomId,
    roomName: room?.name || null,
    startDate,
    endDate: addDaysISO(startDate, 6),
    durationKey: "1w",
    weekMask: weekdayBitFromYmdTR(sourceDate),
    startHHMM,
    endHHMM,
    direction: String(shift?.direction || "INBOUND").toUpperCase(),
    pattern: String(shift?.pattern || "ONE_WAY").toUpperCase(),
    useRoomHub: !hasShiftHub,
    hubLat: hasShiftHub ? safeNum(shift?.hubLat) : null,
    hubLng: hasShiftHub ? safeNum(shift?.hubLng) : null,
    routeSummary: {
      stopCount: Number.isFinite(stopCount) ? stopCount : 0,
      peopleCount: Number.isFinite(peopleCount) ? peopleCount : 0,
    },
  };
}

export function stashAgreementPrefill(prefill) {
  try {
    if (!prefill || typeof window === "undefined") return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
    return true;
  } catch {
    return false;
  }
}

export function consumeAgreementPrefill() {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}
