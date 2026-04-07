export const COMPANY_FINAL_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"]);

export function getCompanyMarketItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return (items || []).filter((s) => !finalStatuses.has(String(s?.status)) && (s?.roomId == null || s?.roomId === ""));
}

export function getCompanyPendingItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return (items || []).filter((s) => {
    const status = String(s?.status || "");
    const isSplitRoot = status === "SPLIT" && !Number(s?.splitRootId || 0);
    if (isSplitRoot) return false;
    return !finalStatuses.has(status) && s?.roomId != null && s?.roomId !== "";
  });
}

export function getCompanyFinalItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return (items || []).filter((s) => finalStatuses.has(String(s?.status)));
}

export function filterCompanyPendingItems({
  items,
  pendingQ,
  pendingOnlyRoomOffer,
  onlyAgreement,
  pendingFocusIds,
  dayYmd,
  isSameDayIstanbul,
}) {
  const q = String(pendingQ || "").trim().toLowerCase();
  const pendingFocusSet = new Set((pendingFocusIds || []).map(Number));
  return (items || [])
    .filter((s) => (!onlyAgreement ? true : Number(s?.agreementId) > 0))
    .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s?.startAt, dayYmd)))
    .filter((s) => (pendingFocusSet.size ? pendingFocusSet.has(Number(s?.id)) : true))
    .filter((s) => {
      if (!pendingOnlyRoomOffer) return true;
      const hasRoomOffer =
        Boolean(s?.roomOfferVehicleId) ||
        s?.roomOfferAmount != null ||
        Boolean(s?.roomOfferNote) ||
        Boolean(s?.roomOfferToDriver) ||
        Boolean(s?.roomOfferDriverNote);
      return hasRoomOffer;
    })
    .filter((s) => {
      if (!q) return true;
      const hay = [s?.id, s?.status, s?.roomId, s?.companyId, s?.roomOfferNote, s?.companyOfferNote]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
}

export function filterCompanyMarketItems({
  items,
  marketQ,
  onlyAgreement,
  marketFocusIds,
  dayYmd,
  isSameDayIstanbul,
}) {
  const q = String(marketQ || "").trim().toLowerCase();
  const marketFocusSet = new Set((marketFocusIds || []).map(Number));
  return (items || [])
    .filter((s) => (onlyAgreement ? Number(s?.agreementId) > 0 : true))
    .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s?.startAt, dayYmd)))
    .filter((s) => (marketFocusSet.size ? marketFocusSet.has(Number(s?.id)) : true))
    .filter((s) => {
      if (!q) return true;
      const hay = [s?.id, s?.status, s?.companyId].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
}

export function filterCompanyFinalItems({
  items,
  finalQ,
  finalStatus,
  onlyAgreement,
  dayYmd,
  isSameDayIstanbul,
}) {
  const q = String(finalQ || "").trim().toLowerCase();
  return (items || [])
    .filter((s) => (!onlyAgreement ? true : Number(s?.agreementId) > 0))
    .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s?.startAt, dayYmd)))
    .filter((s) => {
      const st = String(s?.status);
      if (finalStatus === "ALL") return true;
      if (finalStatus === "OPEN") return st === "APPROVED" || st === "ACTIVE";
      return st === finalStatus;
    })
    .filter((s) => {
      if (!q) return true;
      const hay = [s?.id, s?.status, s?.roomId, s?.companyId, s?.roomOfferNote, s?.companyOfferNote, s?.vehicle?.plate, s?.driver?.fullName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
}

export function getCompanyRoomScoreIds({ shouldLoadRoomScores, offersModalItems, offerModalOpen, rooms }) {
  if (!shouldLoadRoomScores) return [];
  const ids = new Set();
  for (const offer of offersModalItems || []) {
    const rid = Number(offer?.room?.id || offer?.roomId || 0);
    if (rid > 0) ids.add(rid);
  }
  if (offerModalOpen) {
    for (const r of rooms || []) {
      const rid = Number(r?.id || 0);
      if (rid > 0) ids.add(rid);
    }
  }
  return Array.from(ids);
}

export function getCompanyCanonicalCounts({ commercialSummary, marketCount, pendingCount, finalCount, pickCount }) {
  const cards = commercialSummary?.cards || {};
  return {
    market: pickCount(cards.marketShiftCount, cards.marketOffers, marketCount, 0),
    pending: pickCount(cards.pendingShiftCount, cards.acceptedOffers, pendingCount, 0),
    final: pickCount(cards.finalShiftCount, cards.listCount, finalCount, 0),
    active: pickCount(cards.activeShiftCount, cards.activeOps, 0),
    counter: pickCount(cards.counterShiftCount, cards.counterOffers, 0),
  };
}
