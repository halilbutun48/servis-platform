export const ACCOUNTING_PERIOD_STATUS = Object.freeze({
  OPEN: "OPEN",
  REVIEW: "REVIEW",
  READY_TO_CLOSE: "READY_TO_CLOSE",
  CLOSED: "CLOSED",
  REOPEN_REQUESTED: "REOPEN_REQUESTED",
  REOPENED: "REOPENED",
});

const STATUS_VALUES = new Set(Object.values(ACCOUNTING_PERIOD_STATUS));

function normalizedStatus(value) {
  const status = String(value || ACCOUNTING_PERIOD_STATUS.OPEN).trim().toUpperCase();
  return STATUS_VALUES.has(status) ? status : ACCOUNTING_PERIOD_STATUS.OPEN;
}

function normalizedBlockers(blockers) {
  return [...new Set((Array.isArray(blockers) ? blockers : [])
    .map((value) => String(value || "").trim().toUpperCase())
    .filter(Boolean))];
}

export function buildAccountingPeriodReadiness({ status = ACCOUNTING_PERIOD_STATUS.OPEN, blockers = [], missing = [] } = {}) {
  const normalizedBlockerList = normalizedBlockers([...blockers, ...missing]);
  return Object.freeze({
    status: normalizedStatus(status),
    blockers: Object.freeze(normalizedBlockerList),
    readyForClose: normalizedBlockerList.length === 0,
  });
}

export function buildAccountingPeriodReadinessFromSources({ costSummary = null, incomeEvidence = null, status = ACCOUNTING_PERIOD_STATUS.OPEN } = {}) {
  const blockers = [];
  const add = (value) => {
    const code = String(value || "").trim().toUpperCase();
    if (code && !blockers.includes(code)) blockers.push(code);
  };
  const costBlockers = Array.isArray(costSummary?.blockers) ? costSummary.blockers : [];
  if (costBlockers.some((value) => String(value).toUpperCase() === "VAT_UNKNOWN_NET_ROLLUP")) add("VAT_UNKNOWN");
  if (costBlockers.some((value) => String(value).toUpperCase() === "MIXED_CURRENCIES")) add("MIXED_CURRENCIES");
  const excluded = Array.isArray(costSummary?.excluded) ? costSummary.excluded : [];
  if (excluded.some((item) => /ALLOCATION|DISTRIBUT/i.test(String(item?.reason || "")))) add("COST_ALLOCATION_PENDING");
  const known = Array.isArray(costSummary?.known) ? costSummary.known : [];
  if (known.some((item) => String(item?.recordKind || "").toUpperCase() === "ACCRUAL")) add("ACCRUAL_RECONCILIATION_REQUIRED");
  if (String(incomeEvidence?.status || "").toUpperCase() !== "AVAILABLE") add("INCOME_EVIDENCE_MISSING");
  return buildAccountingPeriodReadiness({ status, blockers });
}

function denied(reason, extra = {}) {
  return { allowed: false, reason, ...extra };
}

export function transitionAccountingPeriod({
  fromStatus,
  toStatus,
  actorRole,
  confirmed = false,
  reason = null,
  readiness = null,
  policyApproved = false,
} = {}) {
  const from = normalizedStatus(fromStatus);
  const to = normalizedStatus(toStatus);
  const role = String(actorRole || "").trim().toUpperCase();
  if (role !== "ROOM") return denied("ROOM_ROLE_REQUIRED");
  if (confirmed !== true) return denied("EXPLICIT_CONFIRMATION_REQUIRED");
  if (from === to) return { allowed: true, status: to, idempotent: true };

  const transitionKey = `${from}->${to}`;
  if (transitionKey === "OPEN->REVIEW") return { allowed: true, status: to };
  if (transitionKey === "REVIEW->OPEN") return { allowed: true, status: to };
  if (transitionKey === "REVIEW->READY_TO_CLOSE") {
    const currentReadiness = readiness || buildAccountingPeriodReadiness({ status: from });
    if (!currentReadiness.readyForClose) {
      return denied("PERIOD_BLOCKERS_REMAIN", { blockers: [...currentReadiness.blockers] });
    }
    return { allowed: true, status: to };
  }
  if (transitionKey === "READY_TO_CLOSE->REVIEW") return { allowed: true, status: to };
  if (transitionKey === "CLOSED->REOPEN_REQUESTED") {
    if (!String(reason || "").trim()) return denied("REOPEN_REASON_REQUIRED");
    return policyApproved === true
      ? { allowed: true, status: to }
      : denied("ACCOUNTING_POLICY_APPROVAL_REQUIRED");
  }
  if (transitionKey === "REOPEN_REQUESTED->REOPENED") {
    return policyApproved === true
      ? { allowed: true, status: to }
      : denied("ACCOUNTING_POLICY_APPROVAL_REQUIRED");
  }
  if (transitionKey === "REOPENED->REVIEW") return { allowed: true, status: to };
  if (transitionKey === "READY_TO_CLOSE->CLOSED") {
    const currentReadiness = readiness || buildAccountingPeriodReadiness({ status: from });
    if (!currentReadiness.readyForClose) {
      return denied("PERIOD_BLOCKERS_REMAIN", { blockers: [...currentReadiness.blockers] });
    }
    return policyApproved === true
      ? { allowed: true, status: to }
      : denied("ACCOUNTING_POLICY_APPROVAL_REQUIRED");
  }
  return denied("ACCOUNTING_PERIOD_TRANSITION_NOT_ALLOWED");
}
