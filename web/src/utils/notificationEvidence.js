import {
  normalizeNotifV1,
  notificationKindLabel,
  notificationStatusLabel,
  notificationTitleLabel,
} from "./notificationV1.js";

function ageLabel(ageSec) {
  if (ageSec == null || ageSec === "") return "";
  const seconds = Number(ageSec);
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const rounded = Math.floor(seconds);
  if (rounded < 60) return `${rounded} saniye önce`;
  const minutes = Math.floor(rounded / 60);
  if (minutes < 60) return `${minutes} dakika önce`;
  return `${Math.floor(minutes / 60)} saat önce`;
}

export function buildNotificationEvidenceSummary(payload) {
  const normalized = normalizeNotifV1(payload);
  const title = notificationTitleLabel(normalized.title, normalized.kind) || "Bildirim ayrıntısı";
  const lines = [];
  const kindLabel = notificationKindLabel(normalized.kind);
  const rawKind = String(normalized.kind || "").trim();
  const rawStatus = String(normalized.status || "").trim();
  const statusLabel = notificationStatusLabel(rawStatus);

  if (kindLabel && kindLabel !== rawKind) lines.push(`Tür: ${kindLabel}`);
  else if (rawKind) lines.push("Tür: Sistem bildirimi");
  if (statusLabel) lines.push(`Durum: ${statusLabel}`);
  if (normalized.vehicleId != null && String(normalized.vehicleId).trim()) {
    lines.push(`Araç: ${String(normalized.vehicleId).trim()}`);
  }
  const ageText = ageLabel(normalized.ageSec);
  if (ageText) lines.push(`Güncellik: ${ageText}`);
  if (!lines.length) lines.push("Bu bildirim için ek ayrıntı bulunmuyor.");

  return {
    title,
    lines,
    evidence: normalized,
  };
}
