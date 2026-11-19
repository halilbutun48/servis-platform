function text(value) {
  return String(value ?? "").trim();
}

function positiveId(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function normalizeRoomCollectionOptions(links = []) {
  const seen = new Set();
  return (Array.isArray(links) ? links : [])
    .map((link) => {
      const invoiceId = positiveId(link?.invoiceId);
      if (!invoiceId) return null;
      const companyId = positiveId(link?.companyId);
      const customerLabel = text(link?.customerLabel) || "Müşteri bilgisi bulunamadı";
      const customerKey = companyId ? `company:${companyId}` : `customer:${customerLabel}`;
      const agreementId = positiveId(link?.agreementId);
      const hakedisId = positiveId(link?.hakedisId);
      const key = `invoice:${invoiceId}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        ...link,
        invoiceId,
        companyId,
        customerLabel,
        customerKey,
        invoiceLabel: [
          `Fatura #${invoiceId}`,
          agreementId ? `Sözleşme #${agreementId}` : null,
          hakedisId ? `Hakediş #${hakedisId}` : null,
        ].filter(Boolean).join(" · "),
      };
    })
    .filter(Boolean);
}

export function roomCollectionCustomers(options = []) {
  const seen = new Set();
  return (Array.isArray(options) ? options : []).filter((option) => {
    if (!option?.customerKey || seen.has(option.customerKey)) return false;
    seen.add(option.customerKey);
    return true;
  }).map((option) => ({ key: option.customerKey, label: option.customerLabel }));
}

export function roomCollectionInvoicesForCustomer(options = [], customerKey = "") {
  return (Array.isArray(options) ? options : []).filter((option) => option?.customerKey === customerKey);
}

export function invoiceLineageLabel(option = {}) {
  switch (String(option?.offerLineageStatus || "NOT_PROVEN").toUpperCase()) {
    case "READY":
      return `Kaynak teklif: Teklif #${option.offerId}${option.offerShiftId ? ` · Vardiya #${option.offerShiftId}` : ""}`;
    case "AMBIGUOUS":
      return "Birden fazla teklif adayı bulundu; tahsilat seçilen faturaya kaydedilir.";
    default:
      return "Teklif bağlantısı doğrulanamadı; tahsilat seçilen faturaya kaydedilir.";
  }
}
