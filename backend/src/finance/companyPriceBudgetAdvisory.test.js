import test from "node:test";
import assert from "node:assert/strict";
import { buildCompanyPriceBudgetAdvisory } from "./companyPriceBudgetAdvisory.js";

const budgetPlan = {
  id: 3,
  companyId: 1,
  status: "DRAFT",
  currencyCode: "TRY",
  budgetAmountMinor: 300000,
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
};

test("company advisory keeps commitment, offer possibility, and realized evidence separate", () => {
  const result = buildCompanyPriceBudgetAdvisory({
    companyId: 1,
    budgetPlan,
    commitmentSummary: {
      status: "complete",
      committedAmountMinor: 1500000,
      remainingBudgetMinor: -1200000,
      currencyCode: "TRY",
    },
    offerBudgetComparison: {
      status: "scope_unproven",
      candidates: [{
        offerId: 271,
        amountMinor: 15000,
        amountCurrency: "TRY",
        scopeStatus: "shift_only",
        isCommitment: false,
        isActualSpend: false,
      }],
    },
    selectedAgreement: {
      id: 207,
      companyId: 1,
      status: "APPROVED",
      amountMinor: 1500000,
      currencyCode: "TRY",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      metrics: { serviceDays: 5, shiftCount: 2, distanceKm: 12, vehicleType: "MINIBUS", vehicleCapacity: 16 },
    },
    agreementHistory: [],
  });

  assert.equal(result.status, "BUDGET_RISK_HISTORY_NOT_PROVEN");
  assert.deepEqual(result.budgetEffect, {
    budgetAmountMinor: 300000,
    committedAmountMinor: 1500000,
    remainingBudgetMinor: -1200000,
    currencyCode: "TRY",
    budgetStatus: "DRAFT",
    status: "OVER_BUDGET",
  });
  assert.equal(result.offerEffect.status, "NOT_PROVEN");
  assert.equal(result.offerEffect.amountMinor, 15000);
  assert.equal(result.offerEffect.possibleRemainingBudgetMinor, null);
  assert.equal(result.offerEffect.isActualSpend, false);
  assert.equal(result.historyComparison.status, "NOT_PROVEN");
  assert.equal(result.readOnly, true);
  assert.equal(result.noRoomInternalCost, true);
});

test("company advisory does not double count an offer already covered by the agreement", () => {
  const result = buildCompanyPriceBudgetAdvisory({
    companyId: 1,
    budgetPlan: { ...budgetPlan, agreementIds: [207] },
    commitmentSummary: { status: "complete", committedAmountMinor: 1500000, remainingBudgetMinor: -1200000, currencyCode: "TRY" },
    offerBudgetComparison: {
      status: "no_comparable_offer",
      candidates: [],
      excluded: [{ offerId: 271, agreementId: 207, reasonCode: "ALREADY_COMMITTED" }],
    },
    selectedAgreement: null,
    agreementHistory: [],
  });

  assert.equal(result.offerEffect.status, "ALREADY_COMMITTED");
  assert.equal(result.offerEffect.amountMinor, null);
  assert.equal(result.offerEffect.isCommitment, false);
  assert.equal(result.budgetEffect.committedAmountMinor, 1500000);
});

test("company advisory refuses an incomparable historical price", () => {
  const result = buildCompanyPriceBudgetAdvisory({
    companyId: 1,
    budgetPlan: { ...budgetPlan, id: 4, periodStart: "2026-09-01", periodEnd: "2026-09-30", budgetAmountMinor: 15000000 },
    commitmentSummary: { status: "complete", committedAmountMinor: 15000000, remainingBudgetMinor: 0, currencyCode: "TRY" },
    selectedAgreement: {
      id: 207,
      companyId: 1,
      status: "APPROVED",
      amountMinor: 1500000,
      currencyCode: "TRY",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      metrics: { serviceDays: 5, shiftCount: 2, distanceKm: 12, vehicleType: "MINIBUS", vehicleCapacity: 16 },
    },
    agreementHistory: [{
      id: 195,
      companyId: 1,
      status: "APPROVED",
      amountMinor: 15000000,
      currencyCode: "TRY",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      metrics: { serviceDays: 30, shiftCount: 1, distanceKm: 257.6, vehicleType: "BUS", vehicleCapacity: 45 },
    }],
  });

  assert.equal(result.historyComparison.status, "NOT_PROVEN");
  assert.equal(result.historyComparison.comparableCount, 0);
  assert.match(result.historyComparison.reason, /aynı kapsam|karşılaştırılabilir/i);
});
