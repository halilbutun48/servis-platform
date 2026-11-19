export const COMPANY_DECISION_CONFIRMATION_TOKEN = "ONAYLA";

function minorToTry(value) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) return "-";
  return `${(amount / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function dateText(value) {
  const raw = String(value || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "-";
}

export function buildCompanyDecisionPayload({ agreement = null, confirmed = false, confirmationToken = "" } = {}) {
  return {
    confirmed: confirmed === true,
    confirmationToken: String(confirmationToken || ""),
    expectedRoomOfferAmountMinor: Number(agreement?.roomOfferAmount ?? 0) || null,
    expectedUpdatedAt: agreement?.updatedAt || null,
  };
}

export function buildCompanyDecisionSummary({ agreement = null, roomName = "" } = {}) {
  const status = String(agreement?.status || "").toUpperCase();
  return {
    agreementLabel: agreement?.id ? `Sözleşme #${agreement.id}` : "Sözleşme",
    roomName: String(roomName || "Taşımacılık Firması"),
    periodText: `${dateText(agreement?.startDate)} → ${dateText(agreement?.endDate)}`,
    offerText: minorToTry(agreement?.roomOfferAmount),
    statusText: status === "COUNTERED" ? "Karşı teklif" : status === "REQUESTED" ? "Bekliyor" : "Karar tamamlandı",
  };
}
