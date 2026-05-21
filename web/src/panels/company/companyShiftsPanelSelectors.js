export const COMPANY_FINAL_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"]);

function isAgreementShift(item) {
  return Number(item?.agreementId || 0) > 0;
}

function isFinalShift(item, finalStatuses = COMPANY_FINAL_STATUSES) {
  return finalStatuses.has(String(item?.status || ""));
}

function getCompanyTrackBuckets(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  const buckets = { market: [], pending: [], contract: [], other: [] };
  for (const item of items || []) {
    if (!item) continue;
    const status = String(item?.status || "");
    if (status === "DRAFT") continue;
    if (isAgreementShift(item)) {
      buckets.contract.push(item);
      continue;
    }
    if (isFinalShift(item, finalStatuses)) {
      buckets.other.push(item);
      continue;
    }
    if (item?.roomId == null || item?.roomId === "") buckets.market.push(item);
    else buckets.pending.push(item);
  }
  return buckets;
}

export function getCompanyTrackCounts(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  const buckets = getCompanyTrackBuckets(items, finalStatuses);
  return {
    market: buckets.market.length,
    pending: buckets.pending.length,
    contract: buckets.contract.length,
    other: buckets.other.length,
    total: buckets.market.length + buckets.pending.length + buckets.contract.length + buckets.other.length,
  };
}

export function getCompanyTrackDefaultTab() {
  return "other";
}

export function getCompanyMarketItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return getCompanyTrackBuckets(items, finalStatuses).market;
}

export function getCompanyPendingItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return getCompanyTrackBuckets(items, finalStatuses).pending;
}

export function getCompanyContractItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return getCompanyTrackBuckets(items, finalStatuses).contract;
}

export function getCompanyOtherItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return getCompanyTrackBuckets(items, finalStatuses).other;
}

export function getCompanyFinalItemsRaw(items, finalStatuses = COMPANY_FINAL_STATUSES) {
  return getCompanyOtherItemsRaw(items, finalStatuses);
}

export function filterCompanyPendingItems({
  items,
  pendingQ,
  pendingOnlyRoomOffer,
  pendingFocusIds,
  dayYmd,
  isSameDayIstanbul,
}) {
  const q = String(pendingQ || "").trim().toLowerCase();
  const pendingFocusSet = new Set((pendingFocusIds || []).map(Number));
  return (items || [])
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
  marketFocusIds,
  dayYmd,
  isSameDayIstanbul,
}) {
  const q = String(marketQ || "").trim().toLowerCase();
  const marketFocusSet = new Set((marketFocusIds || []).map(Number));
  return (items || [])
    .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s?.startAt, dayYmd)))
    .filter((s) => (marketFocusSet.size ? marketFocusSet.has(Number(s?.id)) : true))
    .filter((s) => {
      if (!q) return true;
      const hay = [s?.id, s?.status, s?.companyId].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
}

function matchesCompanyStatusFilter(status, statusFilter) {
  const st = String(status || "").toUpperCase();
  const filter = String(statusFilter || "ALL").toUpperCase();
  if (filter === "ALL") return true;
  if (filter === "ACTIVE") return st === "APPROVED" || st === "ACTIVE";
  if (filter === "DONE") return st === "DONE";
  if (filter === "REJECTED") return st === "REJECTED";
  return true;
}

function filterCompanyShiftStatusItems({
  items,
  q,
  statusFilter,
  dayYmd,
  isSameDayIstanbul,
}) {
  const needle = String(q || "").trim().toLowerCase();
  return (items || [])
    .filter((s) => (!dayYmd ? true : isSameDayIstanbul(s?.startAt, dayYmd)))
    .filter((s) => matchesCompanyStatusFilter(s?.status, statusFilter))
    .filter((s) => {
      if (!needle) return true;
      const hay = [s?.id, s?.status, s?.roomId, s?.companyId, s?.roomOfferNote, s?.companyOfferNote, s?.vehicle?.plate, s?.driver?.fullName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
}

export function filterCompanyContractItems({ items, contractQ, contractStatus, dayYmd, isSameDayIstanbul }) {
  return filterCompanyShiftStatusItems({
    items,
    q: contractQ,
    statusFilter: contractStatus,
    dayYmd,
    isSameDayIstanbul,
  });
}

export function filterCompanyOtherItems({ items, otherQ, otherStatus, dayYmd, isSameDayIstanbul }) {
  return filterCompanyShiftStatusItems({
    items,
    q: otherQ,
    statusFilter: otherStatus,
    dayYmd,
    isSameDayIstanbul,
  });
}

export function filterCompanyFinalItems({ items, finalQ, finalStatus, dayYmd, isSameDayIstanbul }) {
  return filterCompanyShiftStatusItems({
    items,
    q: finalQ,
    statusFilter: finalStatus,
    dayYmd,
    isSameDayIstanbul,
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
