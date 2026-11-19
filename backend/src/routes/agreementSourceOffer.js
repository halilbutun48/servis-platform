function nullableInteger(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : null;
}

/**
 * Preserve the accepted market offer as the commercial source of a contract
 * created from a shift. Once a ROOM counter is accepted, that counter is the
 * agreed commercial amount for both sides of the resulting agreement. The
 * buyer may still override its own amount in the generic wizard, but the
 * normal accepted-offer path must not fall back to the superseded opening
 * company amount.
 */
export function agreementCommercialFieldsFromSourceOffer({
  sourceOffer = null,
  companyOfferAmount = null,
  companyOfferNote = null,
} = {}) {
  const explicitCompanyAmount = nullableInteger(companyOfferAmount);
  const sourceCompanyAmount = nullableInteger(sourceOffer?.amountCompany);
  const sourceRoomAmount = nullableInteger(sourceOffer?.amountRoom);
  const acceptedSourceAmount = sourceRoomAmount ?? sourceCompanyAmount;
  const explicitCompanyNote = String(companyOfferNote ?? "").trim();

  return {
    companyOfferAmount: explicitCompanyAmount ?? acceptedSourceAmount,
    companyOfferNote: explicitCompanyNote || null,
    roomOfferAmount: sourceRoomAmount,
    roomOfferNote: String(sourceOffer?.noteRoom ?? "").trim() || null,
  };
}
