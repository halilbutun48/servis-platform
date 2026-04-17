export const STATUS_LABELS = {
  DRAFT: "Taslak",
  OPEN: "Açık",
  PENDING: "Bekliyor",
  REQUESTED: "Bekliyor",
  COUNTERED: "Karşı Teklif",
  ACCEPTED: "Kabul Edildi",
  APPROVED: "Kabul Edildi",
  ACTIVE: "Aktif",
  DONE: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  REJECTED: "Reddedildi",
  DISABLED: "Devre Dışı",
  SHIFT_PUBLISHED: "Teklif / Vardiya Açıldı",
  AGREEMENT_REQUESTED: "Sözleşme Talebi",
};

export function displayStatusLabel(status) {
  const key = String(status || '').trim().toUpperCase();
  return STATUS_LABELS[key] || (key || '-');
}
