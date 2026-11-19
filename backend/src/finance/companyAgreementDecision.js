export const COMPANY_DECISION_CONFIRMATION_TOKEN = "ONAYLA";

const DECISIONS = new Set(["ACCEPT", "REJECT"]);

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizedDate(value) {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function samePositiveInteger(left, right) {
  const a = positiveInteger(left);
  const b = positiveInteger(right);
  return a !== null && b !== null && a === b;
}

export function buildCompanyAgreementDecisionMutation({ decision, roomOfferAmountMinor = null, roomOfferNote = null } = {}) {
  const normalizedDecision = String(decision || "").trim().toUpperCase();
  if (normalizedDecision === "ACCEPT") {
    return {
      companyOfferAmount: positiveInteger(roomOfferAmountMinor),
      companyOfferNote: roomOfferNote == null || roomOfferNote === "" ? null : String(roomOfferNote),
      status: "REQUESTED",
    };
  }
  if (normalizedDecision === "REJECT") {
    return {
      roomOfferAmount: null,
      roomOfferNote: null,
      status: "REQUESTED",
    };
  }
  return null;
}

export function buildCompanyAgreementDecisionReplayKey({
  agreementId,
  decision,
  roomOfferAmountMinor,
  expectedUpdatedAt,
} = {}) {
  return [
    "company-agreement-decision-v1",
    positiveInteger(agreementId) || "-",
    String(decision || "").trim().toUpperCase() || "-",
    positiveInteger(roomOfferAmountMinor) || "-",
    normalizedDate(expectedUpdatedAt) || "-",
  ].join(":");
}

export function buildCompanyAgreementDecisionReplaySnapshot({ agreement = null, expectedRoomOfferAmountMinor = null, expectedUpdatedAt = null } = {}) {
  return {
    ...(agreement || {}),
    status: "COUNTERED",
    roomOfferAmount: positiveInteger(expectedRoomOfferAmountMinor) || agreement?.roomOfferAmount,
    updatedAt: expectedUpdatedAt,
  };
}

export function validateCompanyAgreementDecisionSnapshot({
  agreement = null,
  actor = null,
  decision = "",
  expectedStatus = "COUNTERED",
  expectedRoomOfferAmountMinor = null,
  expectedUpdatedAt = null,
  confirmed = false,
  confirmationToken = "",
} = {}) {
  const normalizedDecision = String(decision || "").trim().toUpperCase();
  if (String(actor?.role || "").toUpperCase() !== "COMPANY" || !samePositiveInteger(actor?.companyId, agreement?.companyId)) {
    return { ok: false, code: "AGREEMENT_DECISION_FORBIDDEN" };
  }

  if (confirmed !== true || String(confirmationToken || "").trim().toUpperCase() !== COMPANY_DECISION_CONFIRMATION_TOKEN) {
    return { ok: false, code: "AGREEMENT_DECISION_CONFIRMATION_REQUIRED" };
  }

  if (!DECISIONS.has(normalizedDecision)) {
    return { ok: false, code: "AGREEMENT_DECISION_INVALID" };
  }

  if (String(agreement?.status || "").toUpperCase() !== String(expectedStatus || "COUNTERED").toUpperCase()) {
    return { ok: false, code: "AGREEMENT_DECISION_INVALID_STATE" };
  }

  if (!samePositiveInteger(agreement?.roomOfferAmount, expectedRoomOfferAmountMinor)) {
    return { ok: false, code: "AGREEMENT_DECISION_STALE_OFFER" };
  }

  if (expectedUpdatedAt == null || expectedUpdatedAt === "") {
    return { ok: false, code: "AGREEMENT_DECISION_VERSION_REQUIRED" };
  }

  if (normalizedDate(agreement?.updatedAt) !== normalizedDate(expectedUpdatedAt)) {
    return { ok: false, code: "AGREEMENT_DECISION_STALE_VERSION" };
  }

  const agreementId = positiveInteger(agreement?.id);
  const roomOfferAmountMinor = positiveInteger(agreement?.roomOfferAmount);
  const replayKey = buildCompanyAgreementDecisionReplayKey({
    agreementId,
    decision: normalizedDecision,
    roomOfferAmountMinor,
    expectedUpdatedAt: agreement?.updatedAt,
  });

  return {
    ok: true,
    agreementId,
    decision: normalizedDecision,
    previousStatus: String(agreement.status).toUpperCase(),
    nextStatus: "REQUESTED",
    roomOfferAmountMinor,
    replayKey,
  };
}

export function buildCompanyAgreementDecisionAuditMeta({
  validation = null,
  actorUserId = null,
  actorCompanyId = null,
  finalStatus = null,
  idempotent = false,
} = {}) {
  if (!validation?.ok) return null;
  return {
    replayKey: validation.replayKey,
    agreementId: validation.agreementId,
    actorUserId: positiveInteger(actorUserId),
    actorCompanyId: positiveInteger(actorCompanyId),
    decision: validation.decision,
    previousStatus: validation.previousStatus,
    finalStatus: finalStatus == null ? null : String(finalStatus).toUpperCase(),
    roomOfferAmountMinor: validation.roomOfferAmountMinor,
    idempotent: idempotent === true,
  };
}
