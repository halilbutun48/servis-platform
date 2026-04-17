const STATUS_TEXT = {
  REQUESTED: "Bekliyor",
  COUNTERED: "Karşı Teklif",
  APPROVED: "Kabul Edildi",
  ACTIVE: "Devam Ediyor",
  DONE: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  REJECTED: "Reddedildi",
};

const STATUS_ICON = {
  REQUESTED: "⏳",
  COUNTERED: "💬",
  APPROVED: "✅",
  ACTIVE: "🟢",
  DONE: "🏁",
  CANCELLED: "⛔",
  REJECTED: "🚫",
};

const EXTEND_STATUS_TEXT = {
  PENDING: "Uzatma Bekliyor",
  COUNTERED: "Uzatma Karşı Teklif",
  ACCEPTED: "Uzatma Kabul Edildi",
  REJECTED: "Uzatma Reddedildi",
};

export const AGREEMENT_STATUS_OPTIONS = [
  { value: "REQUESTED", label: STATUS_TEXT.REQUESTED },
  { value: "COUNTERED", label: STATUS_TEXT.COUNTERED },
  { value: "APPROVED", label: STATUS_TEXT.APPROVED },
  { value: "ACTIVE", label: STATUS_TEXT.ACTIVE },
  { value: "DONE", label: STATUS_TEXT.DONE },
  { value: "CANCELLED", label: STATUS_TEXT.CANCELLED },
  { value: "REJECTED", label: STATUS_TEXT.REJECTED },
];

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

export function agreementStatusText(status) {
  const key = upper(status);
  return STATUS_TEXT[key] || key || "-";
}

export function agreementStatusPillLabel(status) {
  const key = upper(status);
  const text = agreementStatusText(key);
  const icon = STATUS_ICON[key];
  return icon ? `${icon} ${text}` : text;
}

export function agreementExtendStatusText(status) {
  const key = upper(status);
  return EXTEND_STATUS_TEXT[key] || key || "-";
}

export function agreementExtendStatusPillLabel(status) {
  const key = upper(status);
  const text = agreementExtendStatusText(key);
  if (!key || key === "NONE") return "";
  const icon = key === "PENDING" ? "⏳" : key === "COUNTERED" ? "💬" : key == "ACCEPTED" ? "✅" : key === "REJECTED" ? "🚫" : "";
  return icon ? `${icon} ${text}` : text;
}
