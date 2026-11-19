const OPEN_OFFER_STATUSES = new Set(["OPEN", "COUNTERED"]);
const CLOSED_OFFER_STATUSES = new Set(["ACCEPTED"]);
const TERMINAL_SHIFT_STATUSES = new Set([
  "DONE",
  "COMPLETED",
  "CANCELLED",
  "CANCELED",
  "REJECTED",
  "CLOSED",
]);
const REQUESTABLE_SHIFT_STATUSES = new Set(["DRAFT", "REQUESTED"]);

function positiveId(value) {
  const number = Number(value || 0);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function statusOf(value) {
  return String(value || "").trim().toUpperCase();
}

function shiftForOffer(offer, shiftsById) {
  const shiftId = positiveId(offer?.shiftId || offer?.shift?.id);
  return shiftId ? shiftsById.get(shiftId) || offer?.shift || null : offer?.shift || null;
}

export function isRoomFinanceOfferSelectable(offer, shift = null) {
  const offerStatus = statusOf(offer?.status);
  const shiftStatus = statusOf(shift?.status);
  if (!OPEN_OFFER_STATUSES.has(offerStatus)) return false;
  if (TERMINAL_SHIFT_STATUSES.has(shiftStatus)) return false;
  if (positiveId(shift?.agreementId)) return false;
  return true;
}

export function isRoomFinanceRequestSelectable(shift) {
  const shiftStatus = statusOf(shift?.status);
  if (!REQUESTABLE_SHIFT_STATUSES.has(shiftStatus)) return false;
  if (TERMINAL_SHIFT_STATUSES.has(shiftStatus)) return false;
  if (positiveId(shift?.agreementId)) return false;
  return positiveId(shift?.id) != null;
}

function optionFromOffer(offer, shift) {
  return {
    id: positiveId(offer?.id),
    kind: "OFFER",
    offerId: positiveId(offer?.id),
    shiftId: positiveId(offer?.shiftId || shift?.id),
    status: statusOf(offer?.status),
    companyName: String(shift?.company?.name || offer?.shift?.company?.name || "Müşteri bilgisi yok").trim(),
    workName: String(shift?.routeName || shift?.serviceName || shift?.name || shift?.title || `İş #${offer?.shiftId || shift?.id}`).trim(),
    startAt: shift?.startAt || offer?.shift?.startAt || null,
    endAt: shift?.endAt || offer?.shift?.endAt || null,
    shift,
  };
}

function optionFromRequest(shift) {
  return {
    id: `SHIFT-${positiveId(shift?.id)}`,
    kind: "REQUEST",
    offerId: null,
    shiftId: positiveId(shift?.id),
    status: statusOf(shift?.status),
    companyName: String(shift?.company?.name || shift?.companyName || "Müşteri bilgisi yok").trim(),
    workName: String(shift?.routeName || shift?.serviceName || shift?.name || shift?.title || `İş #${shift?.id}`).trim(),
    startAt: shift?.startAt || null,
    endAt: shift?.endAt || null,
    shift,
  };
}

export function buildRoomFinanceOfferOptions({ offers = [], shifts = [] } = {}) {
  const shiftRows = Array.isArray(shifts) ? shifts : [];
  const shiftsById = new Map(shiftRows.map((shift) => [positiveId(shift?.id), shift]).filter(([id]) => id));
  const options = [];
  const offerShiftIds = new Set();

  for (const offer of Array.isArray(offers) ? offers : []) {
    const shift = shiftForOffer(offer, shiftsById);
    const shiftId = positiveId(offer?.shiftId || shift?.id);
    if (!shiftId) continue;
    // An accepted offer closes its source request even while the agreement
    // projection is still being completed. Do not re-add that shift below as
    // a "new job" simply because the offer itself is not selectable anymore.
    if (CLOSED_OFFER_STATUSES.has(statusOf(offer?.status))) {
      offerShiftIds.add(shiftId);
      continue;
    }
    if (!isRoomFinanceOfferSelectable(offer, shift)) continue;
    offerShiftIds.add(shiftId);
    options.push(optionFromOffer(offer, shift));
  }

  // A newly requestable service may be visible in the ROOM-scoped shift list
  // before a ShiftOffer exists. Keep it selectable without inventing an offer.
  for (const shift of shiftRows) {
    const shiftId = positiveId(shift?.id);
    if (!shiftId || offerShiftIds.has(shiftId) || !isRoomFinanceRequestSelectable(shift)) continue;
    options.push(optionFromRequest(shift));
  }

  return options.sort((left, right) => {
    const rightTime = Date.parse(String(right.startAt || ""));
    const leftTime = Date.parse(String(left.startAt || ""));
    if (Number.isFinite(rightTime) && Number.isFinite(leftTime) && rightTime !== leftTime) return rightTime - leftTime;
    return Number(right.shiftId || 0) - Number(left.shiftId || 0);
  });
}

export function roomFinanceOfferSearchText(option) {
  return [
    option?.offerId,
    option?.shiftId,
    option?.companyName,
    option?.workName,
    option?.status,
  ].filter((value) => value != null && String(value).trim()).join(" ").toLocaleUpperCase("tr-TR");
}

export function roomFinanceOfferDateLabel(option) {
  const start = String(option?.startAt || "").slice(0, 10);
  const end = String(option?.endAt || option?.startAt || "").slice(0, 10);
  if (!start) return "Tarih belirtilmedi";
  return start === end ? start : `${start} – ${end}`;
}
