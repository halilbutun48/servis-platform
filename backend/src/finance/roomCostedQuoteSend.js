export const COSTED_QUOTE_CONFIRMATION_TOKEN = "ONAYLA";
export const COSTED_QUOTE_BELOW_COST_WARNING = "Bu teklif, hesaplanan tahmini maliyetin altında.";

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function nullableInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function sameInteger(left, right) {
  const a = nullableInteger(left);
  const b = nullableInteger(right);
  return a !== null && b !== null && a === b;
}

export function classifyCostedQuoteOffer({ offerAmountMinor, periodCostMinor, quoteFloorMinor } = {}) {
  const offer = nullableInteger(offerAmountMinor);
  const periodCost = nullableInteger(periodCostMinor);
  const quoteFloor = nullableInteger(quoteFloorMinor);
  if (offer === null || offer <= 0 || periodCost === null || periodCost < 0 || quoteFloor === null || quoteFloor < 0) {
    return {
      ready: false,
      classification: "PERIOD_COST_NOT_READY",
      belowEstimatedCost: false,
      belowRecommendedFloor: false,
      differenceToCostMinor: null,
      differenceToFloorMinor: null,
      warningText: null,
    };
  }

  const differenceToCostMinor = offer - periodCost;
  const differenceToFloorMinor = offer - quoteFloor;
  const belowEstimatedCost = differenceToCostMinor < 0;
  const belowRecommendedFloor = differenceToFloorMinor < 0;
  return {
    ready: true,
    classification: belowEstimatedCost
      ? "BELOW_ESTIMATED_COST"
      : belowRecommendedFloor
        ? "BELOW_RECOMMENDED_FLOOR"
        : "ABOVE_RECOMMENDED_FLOOR",
    belowEstimatedCost,
    belowRecommendedFloor,
    differenceToCostMinor,
    differenceToFloorMinor,
    warningText: belowEstimatedCost ? COSTED_QUOTE_BELOW_COST_WARNING : null,
  };
}

function savedPeriodPlanning(draft) {
  return draft?.inputSnapshot?.computed?.periodPlanning
    || draft?.inputSnapshot?.computed?.periodFinancialPreview?.periodPlanning
    || null;
}

function draftServiceContext(draft) {
  return draft?.inputSnapshot?.serviceContext || null;
}

export function validateCostedQuoteSendSnapshot({
  agreement = null,
  draft = null,
  currentScopeHash = "",
  expectedVersion = null,
  expectedContextHash = "",
  currentPeriodPlanning = null,
  currentPeriodQuoteFloorMinor = null,
  requestedAmountMinor = null,
  confirmed = false,
  confirmationToken = "",
  allowAlreadyCountered = false,
} = {}) {
  if (confirmed !== true || String(confirmationToken || "").trim().toUpperCase() !== COSTED_QUOTE_CONFIRMATION_TOKEN) {
    return { ok: false, code: "ROOM_QUOTE_SEND_CONFIRMATION_REQUIRED" };
  }

  const agreementStatus = String(agreement?.status || "").toUpperCase();
  const requestedOffer = positiveInteger(requestedAmountMinor);
  const isVerifiedCounteredReplay = allowAlreadyCountered
    && agreementStatus === "COUNTERED"
    && requestedOffer !== null
    && sameInteger(agreement?.roomOfferAmount, requestedOffer)
    && (agreement?.roomOfferNote === null || agreement?.roomOfferNote === undefined || agreement?.roomOfferNote === "");
  if (!agreement || (agreementStatus !== "REQUESTED" && !isVerifiedCounteredReplay)) {
    return { ok: false, code: "ROOM_QUOTE_SEND_AGREEMENT_NOT_READY" };
  }
  if (!draft || String(draft.status || "").toUpperCase() !== "DRAFT") {
    return { ok: false, code: "ROOM_QUOTE_SEND_DRAFT_NOT_READY" };
  }

  const agreementId = positiveInteger(agreement.id);
  const draftId = positiveInteger(draft.id);
  const roomId = positiveInteger(agreement.roomId);
  const draftRoomId = positiveInteger(draft.roomId);
  if (!agreementId || !draftId || !roomId || !draftRoomId || roomId !== draftRoomId) {
    return { ok: false, code: "ROOM_QUOTE_SEND_SCOPE_MISMATCH" };
  }

  const context = draftServiceContext(draft);
  if (positiveInteger(context?.roomId) !== roomId || positiveInteger(context?.agreementId) !== agreementId) {
    return { ok: false, code: "ROOM_QUOTE_SEND_SCOPE_MISMATCH" };
  }

  const version = positiveInteger(draft.version);
  if (!version || (expectedVersion !== null && expectedVersion !== undefined && Number(expectedVersion) !== version)) {
    return { ok: false, code: "ROOM_QUOTE_SEND_STALE_DRAFT" };
  }

  const savedScopeHash = String(context?.scopeHash || "").trim();
  const currentHash = String(currentScopeHash || "").trim();
  const requestedHash = String(expectedContextHash || "").trim();
  if (!savedScopeHash || !currentHash || savedScopeHash !== currentHash || (requestedHash && requestedHash !== currentHash)) {
    return { ok: false, code: "ROOM_QUOTE_SEND_STALE_CONTEXT" };
  }

  const current = currentPeriodPlanning || {};
  const saved = savedPeriodPlanning(draft) || {};
  const currentMovementCount = positiveInteger(current.plannedMovementCount);
  const savedMovementCount = positiveInteger(saved.plannedMovementCount);
  const currentPeriodCost = nullableInteger(current.periodPlanningCostMinor);
  const savedPeriodCost = nullableInteger(saved.periodPlanningCostMinor);
  const currentQuoteFloor = nullableInteger(currentPeriodQuoteFloorMinor ?? current.periodQuoteFloorMinor);
  const savedQuoteFloor = nullableInteger(draft.quoteFloorMinor ?? saved.periodQuoteFloorMinor);
  if (
    String(current.status || "").toUpperCase() !== "READY"
    || current.periodCostReady !== true
    || current.comparisonAllowed !== true
    || currentMovementCount === null
    || currentPeriodCost === null
    || currentQuoteFloor === null
    || !sameInteger(savedMovementCount, currentMovementCount)
    || !sameInteger(savedPeriodCost, currentPeriodCost)
    || !sameInteger(savedQuoteFloor, currentQuoteFloor)
  ) {
    return { ok: false, code: currentMovementCount !== savedMovementCount ? "ROOM_QUOTE_SEND_SCOPE_CHANGED" : "ROOM_QUOTE_SEND_PERIOD_NOT_READY" };
  }

  const offer = positiveInteger(requestedAmountMinor);
  const classification = classifyCostedQuoteOffer({
    offerAmountMinor: offer,
    periodCostMinor: currentPeriodCost,
    quoteFloorMinor: currentQuoteFloor,
  });
  if (!classification.ready) return { ok: false, code: "ROOM_QUOTE_SEND_PERIOD_NOT_READY" };

  return {
    ok: true,
    agreementId,
    draftId,
    draftVersion: version,
    roomId,
    quoteContextHash: currentHash,
    periodStart: current.periodStart || agreement.startDate || null,
    periodEnd: current.periodEnd || agreement.endDate || null,
    plannedMovementCount: currentMovementCount,
    periodPlanningCostMinor: currentPeriodCost,
    quoteFloorMinor: currentQuoteFloor,
    offerAmountMinor: offer,
    ...classification,
  };
}

export function costedQuoteReplayKey({ agreementId, draftId, draftVersion, quoteContextHash, offerAmountMinor } = {}) {
  return [
    positiveInteger(agreementId) || "-",
    positiveInteger(draftId) || "-",
    positiveInteger(draftVersion) || "-",
    String(quoteContextHash || "").trim() || "-",
    positiveInteger(offerAmountMinor) || "-",
  ].join(":");
}
