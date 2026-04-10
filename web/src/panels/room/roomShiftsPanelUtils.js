import { getApiErrorInfo } from "../../utils/apiContract";

const TYPE_TR = { MINIBUS: "Minibüs", MIDIBUS: "Midibüs", OTOBUS: "Otobüs" };

export function trimOrNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

export function formatTRY(amount) {
  if (amount == null) return "";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("tr-TR").format(n);
}

export function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function vehicleMetaLine(v) {
  const type = TYPE_TR[v?.type] || (v?.type ? String(v.type) : "");
  const bmy = [v?.brand, v?.model, v?.modelYear].filter(Boolean).join(" ");
  const cap = Number.isFinite(v?.capacity) ? `${v.capacity} koltuk` : "";
  return [type, bmy, cap].filter(Boolean).join(" • ");
}

export function roomLabel(r) {
  if (!r) return "";
  return r.name || r.title || `Room #${r.id}`;
}

export function toPositiveIntOrZero(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

export function shiftRequiredPax(shift) {
  return Math.max(
    toPositiveIntOrZero(shift?.requiredPax),
    toPositiveIntOrZero(shift?.assignmentCount),
    toPositiveIntOrZero(shift?.peopleCount),
    toPositiveIntOrZero(shift?.orgPassengerCount),
    0
  );
}

export function vehicleCapacityValue(vehicle) {
  return toPositiveIntOrZero(vehicle?.capacity);
}

export function buildCapacityMeta({ shift, vehicle, roomVehicles = [] }) {
  const requiredPax = shiftRequiredPax(shift);
  const vehicleCapacity = vehicleCapacityValue(vehicle);
  const missingCapacity = requiredPax > 0 ? Math.max(0, requiredPax - vehicleCapacity) : 0;
  const insufficient = requiredPax > 0 && vehicleCapacity < requiredPax;
  const minVehicleCount = requiredPax > 0 && vehicleCapacity > 0 ? Math.ceil(requiredPax / vehicleCapacity) : null;

  const roomCaps = (roomVehicles || []).map((v) => vehicleCapacityValue(v)).filter((n) => n > 0);
  const roomMaxCapacity = roomCaps.length ? Math.max(...roomCaps) : 0;
  const roomMinVehicleCount = requiredPax > 0 && roomMaxCapacity > 0 ? Math.ceil(requiredPax / roomMaxCapacity) : null;
  const singleVehiclePossible = requiredPax > 0 && roomMaxCapacity > 0 && roomMaxCapacity >= requiredPax;
  const dispatchRequired = requiredPax > 0 && roomMaxCapacity > 0 && roomMaxCapacity < requiredPax;

  let blockCode = null;
  let blockMessage = "";
  if (requiredPax > 0 && vehicle && vehicleCapacity <= 0) {
    blockCode = "VEHICLE_CAPACITY_MISSING";
    blockMessage = `Araç kapasitesi tanımsız. Gerekli yolcu: ${requiredPax}.`;
  } else if (vehicle && insufficient) {
    blockCode = "CAPACITY_INSUFFICIENT";
    blockMessage = `Yetersiz kapasite. Gerekli: ${requiredPax}, araç: ${vehicleCapacity}, eksik: ${missingCapacity}.`;
  }

  return {
    requiredPax,
    vehicleCapacity,
    missingCapacity,
    insufficient,
    minVehicleCount,
    roomMaxCapacity,
    roomMinVehicleCount,
    singleVehiclePossible,
    dispatchRequired,
    blockCode,
    blockMessage,
  };
}

export function formatShiftDateTimeTR(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  const a0 = new Date(aStart).getTime();
  const a1 = new Date(aEnd).getTime();
  const b0 = new Date(bStart).getTime();
  const b1 = new Date(bEnd).getTime();
  if (![a0, a1, b0, b1].every(Number.isFinite)) return false;
  return a0 < b1 && b0 < a1;
}

function parsePossibleJson(text) {
  try {
    if (!text) return null;
    const t = String(text).trim();
    if (!t) return null;
    if (t.startsWith("{") || t.startsWith("[")) return JSON.parse(t);
  } catch { /* no-op */ }
  return null;
}

export function normalizeRoomShiftError(error, fallbackMessage = "İşlem başarısız") {
  const info = getApiErrorInfo(error, fallbackMessage);
  const msg = String(error?.message || "");
  const parsed = parsePossibleJson(msg);
  const parsedError = parsed?.error && typeof parsed.error === "object" ? parsed.error : null;
  const parsedData = parsedError || (parsed && typeof parsed === "object" ? parsed : null);

  const payloadError = info.payload?.error && typeof info.payload.error === "object" ? info.payload.error : null;
  return {
    status: info.status || Number(parsedData?.status || 0) || 0,
    code: info.code || payloadError?.code || parsedError?.code || parsedData?.code || null,
    message: info.message || payloadError?.message || parsedError?.message || parsedData?.message || fallbackMessage,
    details: info.details || payloadError?.details || parsedError?.details || parsedData?.details || null,
    data: payloadError || parsedError || parsedData || info.payload || null,
  };
}
