const ACCEPTED_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);
const REPLAY_ACTIONS = new Set([
  "ROOM_COSTED_QUOTE_SEND_REPLAYED",
  "COMPANY_AGREEMENT_DECISION_REPLAYED",
]);
const NEGOTIATION_ACTIONS = new Set([
  "ROOM_COSTED_QUOTE_SENT",
  "COMPANY_AGREEMENT_DECISION",
  "AGREEMENT_ROOM_APPROVED",
]);
const COMPANY_INITIAL_OFFER_ACTIONS = new Set([
  "COMPANY_AGREEMENT_OFFERED",
  "COMPANY_AGREEMENT_INITIAL_OFFER",
]);

function positiveMinor(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function text(value) {
  return String(value || "").trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function dateText(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function metaOf(log) {
  return log?.meta && typeof log.meta === "object" ? log.meta : {};
}

function amountFromAudit(log) {
  const meta = metaOf(log);
  return positiveMinor(meta.roomOfferAmountMinor ?? meta.offerAmountMinor ?? meta.amountMinor);
}

function acceptedAuditCandidates(auditLogs) {
  return (Array.isArray(auditLogs) ? auditLogs : [])
    .filter((log) => upper(log?.action) === "COMPANY_AGREEMENT_DECISION" && metaOf(log).idempotent !== true)
    .filter((log) => upper(metaOf(log).decision) === "ACCEPT")
    .map((log) => ({ amountMinor: amountFromAudit(log), log, auditId: Number(log?.id) || null }))
    .filter((item) => item.amountMinor != null)
    .sort((left, right) => String(left.log?.createdAt || "").localeCompare(String(right.log?.createdAt || "")));
}

function negotiationStep(log) {
  const action = upper(log?.action);
  if (!NEGOTIATION_ACTIONS.has(action) || REPLAY_ACTIONS.has(action)) return null;
  const meta = metaOf(log);
  return {
    action,
    decision: upper(meta.decision) || null,
    amountMinor: amountFromAudit(log),
    createdAt: dateText(log?.createdAt),
  };
}

function isNonReplayLog(log) {
  return metaOf(log).idempotent !== true && !REPLAY_ACTIONS.has(upper(log?.action));
}

function explicitCompanyInitialOffer(auditLogs) {
  return (Array.isArray(auditLogs) ? auditLogs : [])
    .filter((log) => isNonReplayLog(log) && COMPANY_INITIAL_OFFER_ACTIONS.has(upper(log?.action)))
    .map((log) => ({ amountMinor: amountFromAudit(log), log }))
    .filter((item) => item.amountMinor != null)
    .sort((left, right) => String(left.log?.createdAt || "").localeCompare(String(right.log?.createdAt || "")))[0] || null;
}

function buildNegotiationEvidence({ agreement, auditLogs, acceptedMinor }) {
  const steps = (Array.isArray(auditLogs) ? auditLogs : [])
    .map(negotiationStep)
    .filter(Boolean)
    .filter((step, index, all) => all.findIndex((candidate) => (
      candidate.action === step.action
      && candidate.decision === step.decision
      && candidate.amountMinor === step.amountMinor
      && candidate.createdAt === step.createdAt
    )) === index)
    .sort((left, right) => String(left.createdAt || "").localeCompare(String(right.createdAt || "")));
  const initialCompanyOffer = explicitCompanyInitialOffer(auditLogs);
  const initialCompanyOfferMinor = initialCompanyOffer?.amountMinor || null;
  const roomCounterMinor = steps.find((step) => step.action === "ROOM_COSTED_QUOTE_SENT")?.amountMinor
    || positiveMinor(agreement?.roomOfferAmount)
    || null;
  const hasAcceptDecision = steps.some((step) => step.action === "COMPANY_AGREEMENT_DECISION" && step.decision === "ACCEPT");
  const missing = [];
  if (initialCompanyOfferMinor == null) missing.push("ilk COMPANY teklifi");
  if (roomCounterMinor == null) missing.push("ROOM karşı teklifi");
  if (!hasAcceptDecision) missing.push("COMPANY kabul kararı");
  const status = hasAcceptDecision && initialCompanyOfferMinor != null && roomCounterMinor != null
    ? "RECORDED"
    : steps.length || initialCompanyOfferMinor != null || roomCounterMinor != null
      ? "PARTIAL"
      : "NOT_PROVEN";
  return {
    status,
    initialCompanyOfferMinor,
    roomCounterMinor,
    acceptedMinor: acceptedMinor ?? null,
    steps,
    missing: [...new Set(missing)],
  };
}

function buildOperationalEvidence(agreement) {
  const shifts = Array.isArray(agreement?.shifts) ? agreement.shifts : [];
  const doneShiftCount = shifts.filter((shift) => upper(shift?.status) === "DONE").length;
  const linkedShiftCount = shifts.length;
  const actualCostEntryCount = (Array.isArray(agreement?.actualCostEntries) ? agreement.actualCostEntries : [])
    .filter((entry) => upper(entry?.recordKind) === "ACTUAL")
    .filter((entry) => upper(entry?.lifecycle) === "CONFIRMED")
    .filter((entry) => positiveMinor(entry?.amountMinor) != null)
    .filter((entry) => upper(entry?.currencyCode || "TRY") === "TRY")
    .length;
  const actualCostEvidence = actualCostEntryCount > 0 ? "VERIFIED" : "NOT_PROVEN";
  const missing = [];
  if (linkedShiftCount === 0) missing.push("bağlı hizmet vardiyası");
  if (doneShiftCount === 0) missing.push("tamamlanmış hizmet");
  if (actualCostEvidence !== "VERIFIED") missing.push("doğrulanmış gerçekleşmiş gider");
  return {
    status: doneShiftCount > 0 && actualCostEvidence === "VERIFIED"
      ? "VERIFIED"
      : linkedShiftCount > 0 || doneShiftCount > 0
        ? "PARTIAL"
        : "NOT_PROVEN",
    agreementStatus: upper(agreement?.status) || "UNKNOWN",
    linkedShiftCount,
    doneShiftCount,
    actualCostEntryCount,
    actualCostEvidence,
    missing,
  };
}

export function resolveAgreementCommercialEvidence({ agreement = null, auditLogs = [] } = {}) {
  const status = upper(agreement?.status);
  const currencyRaw = agreement?.currencyCode == null ? "TRY" : upper(agreement.currencyCode);
  const currencyCode = currencyRaw === "TRY" ? "TRY" : null;
  const roomOfferAmountMinor = positiveMinor(agreement?.roomOfferAmount);
  const acceptedCandidates = acceptedAuditCandidates(auditLogs);
  const acceptedAmounts = [...new Set(acceptedCandidates.map((candidate) => candidate.amountMinor))];
  const acceptedCandidate = acceptedCandidates[acceptedCandidates.length - 1] || null;
  const conflicts = [];
  if (acceptedCandidate && roomOfferAmountMinor != null && acceptedCandidate.amountMinor !== roomOfferAmountMinor) {
    conflicts.push("Agreement snapshot fiyatı kabul audit fiyatından farklı; audit kaydı canonical tutuldu");
  }
  if (acceptedAmounts.length > 1) conflicts.push("Birden fazla farklı kabul fiyatı kayıtlı");

  let amountMinor = null;
  let source = null;
  let authority = null;
  const missing = [];
  if (!ACCEPTED_STATUSES.has(status)) {
    missing.push("anlaşma kabul edilmiş durumda değil");
  } else if (!currencyCode) {
    missing.push("TRY para birimi kanıtı");
  } else if (acceptedAmounts.length > 1) {
    // Never choose a winner between multiple accepted decisions.
  } else if (acceptedCandidate) {
    amountMinor = acceptedCandidate.amountMinor;
    source = "COMPANY_ACCEPT_AUDIT";
    authority = "ACCEPT_AUDIT";
  } else if (roomOfferAmountMinor != null) {
    amountMinor = roomOfferAmountMinor;
    source = "AGREEMENT_ROOM_OFFER";
    authority = "APPROVED_STATUS";
  } else {
    const companyOfferAmountMinor = positiveMinor(agreement?.companyOfferAmount);
    const hasCounterEvidence = (Array.isArray(auditLogs) ? auditLogs : []).some((log) => (
      isNonReplayLog(log) && upper(log?.action) === "ROOM_COSTED_QUOTE_SENT" && amountFromAudit(log) != null
    ));
    const hasRoomApproval = (Array.isArray(auditLogs) ? auditLogs : []).some((log) => (
      isNonReplayLog(log)
      && upper(log?.action) === "AGREEMENT_ROOM_APPROVED"
      && upper(metaOf(log).finalStatus) === "APPROVED"
    ));
    if (companyOfferAmountMinor != null && hasRoomApproval && !hasCounterEvidence) {
      amountMinor = companyOfferAmountMinor;
      source = "COMPANY_OFFER_ROOM_APPROVAL";
      authority = "ROOM_APPROVED_COMPANY_OFFER";
    } else {
      missing.push("kabul edilmiş nihai ticari fiyat");
    }
  }
  if (currencyCode == null) missing.push("desteklenmeyen veya doğrulanamayan para birimi");
  if (conflicts.length === 0 && amountMinor == null && status && ACCEPTED_STATUSES.has(status) && !missing.includes("kabul edilmiş nihai ticari fiyat")) {
    missing.push("kabul edilmiş nihai ticari fiyat");
  }

  const commercialReference = {
    status: amountMinor != null ? "READY" : "NOT_PROVEN",
    agreementId: Number(agreement?.id) || null,
    amountMinor,
    currencyCode: amountMinor != null ? currencyCode : null,
    source,
    authority,
    sourceAuditId: source === "COMPANY_ACCEPT_AUDIT" ? acceptedCandidate?.auditId || null : null,
    periodStart: dateText(agreement?.startDate),
    periodEnd: dateText(agreement?.endDate),
    immutableAfterApproval: true,
    missing: [...new Set(missing)],
    conflicts: [...new Set(conflicts)],
  };
  const negotiationEvidence = buildNegotiationEvidence({ agreement, auditLogs, acceptedMinor: amountMinor });
  const operationalEvidence = buildOperationalEvidence(agreement);
  return Object.freeze({
    commercialReference: Object.freeze(commercialReference),
    negotiationEvidence: Object.freeze(negotiationEvidence),
    operationalEvidence: Object.freeze(operationalEvidence),
  });
}

export { ACCEPTED_STATUSES };
