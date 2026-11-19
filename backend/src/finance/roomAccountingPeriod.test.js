import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNTING_PERIOD_STATUS,
  buildAccountingPeriodReadiness,
  buildAccountingPeriodReadinessFromSources,
  transitionAccountingPeriod,
} from "./roomAccountingPeriod.js";

test("open period moves to review only with an explicit user action", () => {
  const result = transitionAccountingPeriod({
    fromStatus: ACCOUNTING_PERIOD_STATUS.OPEN,
    toStatus: ACCOUNTING_PERIOD_STATUS.REVIEW,
    actorRole: "ROOM",
    confirmed: true,
  });

  assert.deepEqual(result, { allowed: true, status: ACCOUNTING_PERIOD_STATUS.REVIEW });
});

test("review period is ready to close only when readiness has no blockers", () => {
  const ready = buildAccountingPeriodReadiness({
    status: ACCOUNTING_PERIOD_STATUS.REVIEW,
    blockers: [],
  });
  const result = transitionAccountingPeriod({
    fromStatus: ACCOUNTING_PERIOD_STATUS.REVIEW,
    toStatus: ACCOUNTING_PERIOD_STATUS.READY_TO_CLOSE,
    actorRole: "ROOM",
    confirmed: true,
    readiness: ready,
  });

  assert.equal(ready.readyForClose, true);
  assert.deepEqual(result, { allowed: true, status: ACCOUNTING_PERIOD_STATUS.READY_TO_CLOSE });
});

test("period with unresolved evidence cannot become ready to close", () => {
  const readiness = buildAccountingPeriodReadiness({
    status: ACCOUNTING_PERIOD_STATUS.REVIEW,
    blockers: ["VAT_UNKNOWN", "COST_ALLOCATION_PENDING"],
  });
  const result = transitionAccountingPeriod({
    fromStatus: ACCOUNTING_PERIOD_STATUS.REVIEW,
    toStatus: ACCOUNTING_PERIOD_STATUS.READY_TO_CLOSE,
    actorRole: "ROOM",
    confirmed: true,
    readiness,
  });

  assert.equal(readiness.readyForClose, false);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "PERIOD_BLOCKERS_REMAIN");
  assert.deepEqual(result.blockers, ["VAT_UNKNOWN", "COST_ALLOCATION_PENDING"]);
});

test("closed transition stays blocked until an approved accounting policy is supplied", () => {
  const result = transitionAccountingPeriod({
    fromStatus: ACCOUNTING_PERIOD_STATUS.READY_TO_CLOSE,
    toStatus: ACCOUNTING_PERIOD_STATUS.CLOSED,
    actorRole: "ROOM",
    confirmed: true,
    readiness: buildAccountingPeriodReadiness({ status: ACCOUNTING_PERIOD_STATUS.READY_TO_CLOSE, blockers: [] }),
    policyApproved: false,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "ACCOUNTING_POLICY_APPROVAL_REQUIRED");
});

test("reopening a closed period requires an approved reason and remains unavailable without policy authority", () => {
  const result = transitionAccountingPeriod({
    fromStatus: ACCOUNTING_PERIOD_STATUS.CLOSED,
    toStatus: ACCOUNTING_PERIOD_STATUS.REOPEN_REQUESTED,
    actorRole: "ROOM",
    confirmed: true,
    reason: "Belge düzeltmesi gerekiyor",
    policyApproved: false,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "ACCOUNTING_POLICY_APPROVAL_REQUIRED");
});

test("period readiness exposes VAT, allocation, accrual and income evidence blockers without inventing zero values", () => {
  const result = buildAccountingPeriodReadinessFromSources({
    costSummary: {
      blockers: ["VAT_UNKNOWN_NET_ROLLUP"],
      excluded: [{ entryId: 318, reason: "ALLOCATION_EVIDENCE_INCOMPLETE" }],
      known: [{ recordKind: "ACCRUAL" }],
    },
    incomeEvidence: { status: "UNAVAILABLE" },
  });

  assert.equal(result.readyForClose, false);
  assert.deepEqual(result.blockers, [
    "VAT_UNKNOWN",
    "COST_ALLOCATION_PENDING",
    "ACCRUAL_RECONCILIATION_REQUIRED",
    "INCOME_EVIDENCE_MISSING",
  ]);
});
