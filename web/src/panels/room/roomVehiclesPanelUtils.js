import { formatDateTimeTR, formatDateTR, formatTimeTR, toDateInputTR, toDatetimeLocalTR } from "../../utils/time";
import { getApiErrorInfo } from "../../utils/apiContract";
import { formatRegionOwnership } from "../../utils/regionOwnership";
import { pillKeyFromUi } from "../../utils/uiStatus";

export const VEHICLE_TYPES = [
  { value: "", label: "Seç (opsiyonel)" },
  { value: "MINIBUS", label: "Minibüs" },
  { value: "MIDIBUS", label: "Midibüs" },
  { value: "OTOBUS", label: "Otobüs" },
];

export const VEHICLE_TEMPLATES_TR = [
  { id: "mb-travego-15shd", label: "Mercedes-Benz Travego 15 SHD", type: "OTOBUS", capacity: 46, brand: "Mercedes-Benz", model: "Travego 15 SHD" },
  { id: "mb-travego-16shd-2-1", label: "Mercedes-Benz Travego 16 SHD 2+1", type: "OTOBUS", capacity: 41, brand: "Mercedes-Benz", model: "Travego 16 SHD 2+1" },
  { id: "temsa-safir-plus", label: "Temsa Safir Plus", type: "OTOBUS", capacity: 50, brand: "Temsa", model: "Safir Plus" },
  { id: "temsa-safir-plus-vip-13m", label: "Temsa Safir Plus VIP (13 m)", type: "OTOBUS", capacity: 54, brand: "Temsa", model: "Safir Plus VIP (13 m)" },
  { id: "isuzu-novo-s-29", label: "Isuzu Novo S (29)", type: "MIDIBUS", capacity: 29, brand: "Isuzu", model: "Novo S" },
  { id: "otokar-sultan-maxi-31", label: "Otokar Sultan Maxi (31)", type: "MIDIBUS", capacity: 31, brand: "Otokar", model: "Sultan Maxi" },
  { id: "mb-sprinter-16", label: "Mercedes-Benz Sprinter (16)", type: "MINIBUS", capacity: 16, brand: "Mercedes-Benz", model: "Sprinter" },
  { id: "vw-crafter-16", label: "Volkswagen Crafter (16)", type: "MINIBUS", capacity: 16, brand: "Volkswagen", model: "Crafter" },
  { id: "ford-transit-16", label: "Ford Transit (16)", type: "MINIBUS", capacity: 16, brand: "Ford", model: "Transit" },
  { id: "renault-master-16", label: "Renault Master (16)", type: "MINIBUS", capacity: 16, brand: "Renault", model: "Master" },
];

export const TABS = [
  { key: "status", label: "Durum" },
  { key: "manage", label: "Yönetim" },
  { key: "assign", label: "Atamalar" },
  { key: "avail", label: "Müsaitlik" },
  { key: "telematics", label: "Konum cihazı" },
  { key: "link", label: "Bağlantı" },
];

export function isoToDateInput(v) { return toDateInputTR(v); }
export function isoToDatetimeLocal(v) { return toDatetimeLocalTR(v); }
export function fmtDate(v) { return formatDateTR(v); }

export function hasGpsFix(v) {
  const lat = v?.gpsLast?.lat;
  const lng = v?.gpsLast?.lng;
  return typeof lat === "number" && typeof lng === "number";
}

export function gpsAtLabel(v) {
  const at = v?.gpsLast?.at || v?.gpsLast?.ts || v?.gpsLast?.updatedAt || null;
  if (!at) return "-";
  try {
    return formatDateTimeTR(at);
  } catch {
    return String(at);
  }
}

export function normalizeList(resp) {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.items)) return resp.items;
  return [];
}

export function pickRoomVehicleError(error, fallbackMessage = "İşlem başarısız") {
  const info = getApiErrorInfo(error, fallbackMessage);
  return {
    msg: info.message,
    status: info.status,
    code: info.code,
    payload: info.payload,
    details: info.details,
  };
}

export function fmtDriverHuman(d) {
  if (!d) return "-";
  const name = d.fullName || [d.firstName, d.lastName].filter(Boolean).join(" ").trim() || (d.id ? `#${d.id}` : "-");
  const phone = d.phone || d.tel || d.mobile || d.gsm || "";
  return phone ? `${name} • ${phone}` : name;
}

export function fmtTR(dt) {
  if (!dt) return "-";
  try { return formatDateTimeTR(dt); } catch { return String(dt); }
}

export function fmtHm(dt) {
  if (!dt) return "-";
  try { return formatTimeTR(dt); } catch { return String(dt); }
}

export function shiftWindowLabel(s) {
  if (!s) return "-";
  return `${fmtHm(s.startAt)}–${fmtHm(s.endAt)}`;
}

export function pickCurrentShift(shifts, now = new Date()) {
  const arr = Array.isArray(shifts) ? shifts : [];
  const active = arr.find((x) => x?.status === "ACTIVE" && new Date(x.endAt).getTime() > now.getTime());
  if (active) return active;
  return arr.find((x) => {
    const st = new Date(x.startAt).getTime();
    const en = new Date(x.endAt).getTime();
    return ["APPROVED", "ACTIVE"].includes(x?.status) && st <= now.getTime() && en > now.getTime();
  }) || null;
}

export function pickNextShift(shifts, now = new Date()) {
  const arr = (Array.isArray(shifts) ? shifts : [])
    .filter((x) => x && new Date(x.endAt).getTime() > now.getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return arr.find((x) => new Date(x.startAt).getTime() > now.getTime()) || null;
}

export function conflictCodeLabel(payload) {
  if (!payload) return "CONFLICT";
  return payload.code || payload.kind || payload.error || "CONFLICT";
}

export function expKey(vehicleId, which) { return `${vehicleId}:${which}`; }
export function toggleExp(setter, key) { setter((prev) => ({ ...prev, [key]: !prev[key] })); }

export function shiftOneLine(s) {
  if (!s) return "—";
  const start = new Date(s.startAt);
  const end = new Date(s.endAt);
  const hhmm = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const win = `${hhmm(start)}–${hhmm(end)}`;
  const st = s.status || "";
  return `#${s.id} ${st} • ${win}`;
}

export function toggleSel(setter, id) {
  setter((prev) => ({ ...prev, [id]: !prev[id] }));
}

export function setSelMany(setter, ids, val) {
  setter((prev) => {
    const next = { ...prev };
    for (const id of ids) {
      if (val) next[id] = true;
      else delete next[id];
    }
    return next;
  });
}

export function buildVehicleCopilotSelection({ focusVehicle, focusDriverLabel, focusHasDriver, ui }) {
  return {
    scopeKey: "/room/vehicles",
    entityType: "vehicle",
    entityId: Number(focusVehicle?.id || 1104) || 1104,
    label: focusVehicle?.plate || `Araç #${focusVehicle?.id || "-"}`,
    summary: [focusVehicle?.plate, focusVehicle?.brand, focusVehicle?.model, focusVehicle?.type].filter(Boolean).join(" • "),
    fields: [
      { label: "Plaka", value: focusVehicle?.plate || "-", help: "Seçili aracın plakasını gösterir." },
      { label: "Tip", value: focusVehicle?.type || "-", help: "Araç tipini gösterir." },
      { label: "Kapasite", value: String(focusVehicle?.capacity || "-"), help: "Araç kapasitesini gösterir." },
      { label: "Bölge", value: formatRegionOwnership(focusVehicle?.regionOwnership), help: "Aracın bağlı olduğu il / ilçe bilgisini gösterir." },
      { label: "Sürücü", value: focusDriverLabel || "-", help: "Araca bağlı sürücüyü gösterir." },
      { label: "Durum", value: ui?.label || "-", help: "Aracın operasyon/GPS durumunu gösterir." },
    ],
    badges: [
      { label: "Bağ", value: focusHasDriver ? "Sürücü bağlı" : "Sürücü yok", help: "Araç-sürücü bağının olup olmadığını gösterir." },
    ],
    facts: {
      screenType: "VEHICLES",
      stage: pillKeyFromUi(ui),
      nextBestAction: focusHasDriver
        ? "Önce GPS ve durum satırını oku. Sonra gerekiyorsa konum cihazı veya atama sekmesine geç."
        : "Önce sürücü bağı var mı kontrol et. Sonra durum alanını oku.",
    },
  };
}
