const ACTIVE_OFFER_STATUSES = new Set(["OPEN", "COUNTERED", "ACCEPTED"]);

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function latestActiveOffer(shift) {
  if (!Array.isArray(shift?.offers)) return null;
  return shift.offers
    .filter((offer) => ACTIVE_OFFER_STATUSES.has(String(offer?.status || "").trim().toUpperCase()))
    .sort((left, right) => Number(right?.id || 0) - Number(left?.id || 0))[0] || null;
}

export function getShiftOfferPresentation(shift) {
  const offer = latestActiveOffer(shift);
  return {
    companyOfferAmount: hasValue(shift?.companyOfferAmount) ? shift.companyOfferAmount : offer?.amountCompany ?? null,
    roomOfferAmount: hasValue(shift?.roomOfferAmount) ? shift.roomOfferAmount : offer?.amountRoom ?? null,
    companyOfferNote: hasValue(shift?.companyOfferNote) ? shift.companyOfferNote : offer?.noteCompany ?? null,
    roomOfferNote: hasValue(shift?.roomOfferNote) ? shift.roomOfferNote : offer?.noteRoom ?? null,
    roomOfferDecision: hasValue(shift?.roomOfferDecision) ? shift.roomOfferDecision : offer?.status ?? null,
  };
}
