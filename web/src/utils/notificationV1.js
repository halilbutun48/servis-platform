import { safeParseJson } from "./safeParseJson";

const NOTIFICATION_KIND_LABELS = {
  GPS_OFFLINE: "Konum sinyali yok",
  GPS_STALE: "Konum sinyali güncellenmedi",
  GPS_LIVE: "Konum sinyali yeniden geldi",
  OVERSPEED: "Hız sınırı aşıldı",
  OVER_SPEED: "Hız sınırı aşıldı",
  MAINTENANCE: "Bakım bildirimi",
  NO_SHOW: "Biniş değişikliği",
  BOARDING_CHANGE: "Biniş değişikliği",
};

export function notificationKindLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw.toUpperCase();
  return NOTIFICATION_KIND_LABELS[key] || (key.includes("_") ? "Bildirim" : raw);
}

export function notificationTitleLabel(title, kind) {
  const rawTitle = String(title || "").trim();
  const key = String(kind || "").trim().toUpperCase();
  if (key === "GPS_OFFLINE" || rawTitle.toUpperCase() === "GPS OFFLINE") return "Konum sinyali yok";
  if (key === "GPS_STALE" || rawTitle.toUpperCase() === "GPS STALE") return "Konum sinyali güncellenmedi";
  return rawTitle;
}

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
