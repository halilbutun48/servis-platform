function positiveInteger(value) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0;
}

/**
 * A ROOM counter offer may be prepared from a selected open request and a
 * canonical vehicle scenario. Full period planning is a separate evidence
 * boundary; it must not block the commercial action when that period is not
 * known yet. A partial scenario total proves that the canonical motor ran;
 * missing components remain NOT_PROVEN and are never turned into a fabricated
 * total. The API remains the final tenant/status/vehicle authority.
 */
export function roomMarketOfferQuoteReady({
  canManageRoomCosts = false,
  offerId = 0,
  offerKind = "",
  offerStatus = "",
  shiftStatus = "",
  vehicleId = 0,
  scenarioCostMinor = null,
  offerAmountMinor = null,
} = {}) {
  return Boolean(
    canManageRoomCosts
      && positiveInteger(offerId)
      && String(offerKind || "").toUpperCase() === "OFFER"
      && ["OPEN", "COUNTERED"].includes(String(offerStatus || "").toUpperCase())
      && ["DRAFT", "REQUESTED"].includes(String(shiftStatus || "").toUpperCase())
      && positiveInteger(vehicleId)
      && positiveInteger(scenarioCostMinor)
      && positiveInteger(offerAmountMinor),
  );
}
