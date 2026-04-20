function moneyTry(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `₺${n}`;
}

export function buildAgreementCopilotFacts(item, summary = {}) {
  const status = String(item?.status || "").toUpperCase();
  const hasVehicle = Boolean(item?.vehicleId);
  const hasDriver = Boolean(item?.driverId);
  const shiftOpen = Number(item?.shiftCount ?? summary.shiftCount ?? 0) > 0;
  const blockers = [];
  const missing = [];
  if (!item?.id) blockers.push("Önce odak sözleşme seçilmeden yorum genel kalır.");
  if (!hasVehicle) missing.push("Araç seçilmemiş");
  if (!hasDriver) missing.push("Sürücü seçilmemiş");
  if (["ACTIVE", "APPROVED"].includes(status) && (!hasVehicle || !hasDriver)) blockers.push("Sözleşme aktif görünse de araç veya sürücü eksikse saha için tam hazır değildir.");
  if (["REQUESTED", "COUNTERED"].includes(status)) blockers.push("Karar bekleyen sözleşmede önce onay / karşı teklif yönü netleşmelidir.");
  return {
    screenType: "AGREEMENTS",
    stage: status || "-",
    readiness: blockers.length ? "REVIEW_NEEDED" : (["ACTIVE", "APPROVED"].includes(status) ? "READY" : "REVIEW_NEEDED"),
    readinessScore: blockers.length ? 48 : (["ACTIVE", "APPROVED"].includes(status) ? 84 : 66),
    blockers,
    missing,
    counters: {
      pending: Number(summary.pendingCount || 0),
      other: Number(summary.otherCount || 0),
      extend: Number(summary.extendCount || 0),
      shifts: Number(item?.shiftCount ?? 0),
    },
    evidence: [
      `Durum: ${status || "-"}`,
      `Tutar: ${moneyTry(item?.companyOfferAmount ?? item?.amount ?? "-")}`,
      `Araç: ${hasVehicle ? `#${item.vehicleId}` : "Yok"}`,
      `Sürücü: ${hasDriver ? `#${item.driverId}` : "Yok"}`,
      `Vardiya: ${shiftOpen ? "Var" : "Yok"}`,
    ],
    reasoningLead: blockers.length
      ? "Bu sözleşmede ana risk karar veya atama tarafında görünüyor."
      : "Bu sözleşmede önce durum, sonra tarih ve araç-sürücü bağı okunmalı.",
    nextBestAction: status === "REQUESTED"
      ? "Önce sözleşmeyi onaylayacaksan araç ve sürücü seç. Karşı teklif vereceksen tutar ve notu netleştir."
      : status === "COUNTERED"
        ? "Önce karşı teklif notunu ve tutarı tekrar kontrol et. Sonra karar yönünü netleştir."
        : (["ACTIVE", "APPROVED"].includes(status)
          ? "Önce bağlı vardiya ve ufukta üretilen iş sayısını kontrol et."
          : "Önce durum ve tarih aralığını doğrula. Sonra bağlı işi görmek için vardiya tarafına geç."),
    safestNextStep: "En risksiz adım, seçili sözleşmenin tarih aralığı ile araç-sürücü bağını birlikte doğrulamaktır.",
    compareHint: "Sözleşme onayı ile saha hazırlığı aynı şey değildir; araç ve sürücü eksikse iş hâlâ operasyona tam hazır sayılmaz.",
  };
}
