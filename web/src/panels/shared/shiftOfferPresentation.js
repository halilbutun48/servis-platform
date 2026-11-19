const ACTIVE_OFFER_STATUSES = new Set(["OPEN", "COUNTERED", "ACCEPTED"]);

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function displayNote(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const cleaned = text
    .replace(/\s+(?:teklif tabanı|teklif tabani)\s+(?:null|undefined)\b/gi, "")
    .replace(/\b(?:null|undefined)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([·.,])/g, "$1")
    .replace(/\s*[·.,]\s*$/g, "")
    .trim();
  return cleaned || null;
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
    companyOfferNote: hasValue(shift?.companyOfferNote) ? displayNote(shift.companyOfferNote) : displayNote(offer?.noteCompany),
    roomOfferNote: hasValue(shift?.roomOfferNote) ? displayNote(shift.roomOfferNote) : displayNote(offer?.noteRoom),
    roomOfferDecision: hasValue(shift?.roomOfferDecision) ? shift.roomOfferDecision : offer?.status ?? null,
  };
}
