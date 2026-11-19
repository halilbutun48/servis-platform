const STATUS_LABELS = Object.freeze({
  OPEN: "Açık teklif bekleniyor",
  COUNTERED: "Karşı teklif bekliyor",
  ACCEPTED: "Kabul edildi",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
});

function toMinor(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function companyOfferStatusLabel(status) {
  const key = String(status || "").trim().toUpperCase();
  return STATUS_LABELS[key] || "Durum doğrulanıyor";
}

export function companyOfferServiceAmountMinor(offer) {
  return toMinor(offer?.amountRoom);
}

export function companyOfferBudgetDifferenceMinor(offer, budgetMinor) {
  const offerAmountMinor = companyOfferServiceAmountMinor(offer);
  const budgetAmountMinor = toMinor(budgetMinor);
  if (offerAmountMinor == null || budgetAmountMinor == null) return null;
  return offerAmountMinor - budgetAmountMinor;
}

export function buildCompanyOfferEvaluationPresentation({ offers = [], budgetMinor = null, context = null } = {}) {
  const items = (Array.isArray(offers) ? offers : [])
    .filter((offer) => offer && Number(offer.id || 0) > 0)
    .map((offer) => ({
      ...offer,
      statusLabel: companyOfferStatusLabel(offer.status),
      serviceAmountMinor: companyOfferServiceAmountMinor(offer),
      budgetDifferenceMinor: companyOfferBudgetDifferenceMinor(offer, budgetMinor),
      shiftId: Number(offer.shiftId || offer.shift?.id || 0) || null,
      providerName: String(offer.room?.name || `Taşımacılık Firması #${offer.roomId || "-"}`).trim(),
    }));
  const pricedOffers = items.filter((offer) => offer.serviceAmountMinor != null);
  const period = context?.period || {};
  const hasServiceContext = Boolean(
    context
      && (period.start || period.end || context.participantCount != null || context.stopCount != null || context.route),
  );
  const referenceMinMinor = pricedOffers.length
    ? Math.min(...pricedOffers.map((offer) => offer.serviceAmountMinor))
    : null;
  const referenceMaxMinor = pricedOffers.length
    ? Math.max(...pricedOffers.map((offer) => offer.serviceAmountMinor))
    : null;

  return {
    items,
    pricedOffers,
    activeCount: items.filter((offer) => ["OPEN", "COUNTERED"].includes(String(offer.status || "").toUpperCase())).length,
    referenceMinMinor,
    referenceMaxMinor,
    hasServiceContext,
    hasComparablePriceReference: pricedOffers.length >= 1,
    recommendationStatus: pricedOffers.length >= 2 ? "REFERENCE_AVAILABLE" : "NOT_PROVEN",
  };
}
