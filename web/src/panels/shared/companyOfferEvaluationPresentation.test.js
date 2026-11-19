import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompanyOfferEvaluationPresentation,
  companyOfferBudgetDifferenceMinor,
  companyOfferServiceAmountMinor,
  companyOfferStatusLabel,
} from "./companyOfferEvaluationPresentation.js";

test("COMPANY incoming offer uses ROOM amount as supplier price", () => {
  const offer = { id: 10, amountCompany: 10000, amountRoom: 1000000, status: "COUNTERED" };
  assert.equal(companyOfferServiceAmountMinor(offer), 1000000);
  assert.equal(companyOfferBudgetDifferenceMinor(offer, 1000000), 0);
  assert.equal(companyOfferStatusLabel(offer.status), "Karşı teklif bekliyor");
});

test("COMPANY does not turn a request budget into a supplier offer", () => {
  const presentation = buildCompanyOfferEvaluationPresentation({
    offers: [{ id: 11, amountCompany: 1000000, amountRoom: null, status: "OPEN" }],
    budgetMinor: 1000000,
  });
  assert.equal(presentation.items[0].serviceAmountMinor, null);
  assert.equal(presentation.items[0].budgetDifferenceMinor, null);
  assert.equal(presentation.recommendationStatus, "NOT_PROVEN");
});

test("COMPANY budget reference is derived only from actual supplier prices", () => {
  const presentation = buildCompanyOfferEvaluationPresentation({
    offers: [
      { id: 12, amountCompany: 1000000, amountRoom: 950000, status: "COUNTERED" },
      { id: 13, amountCompany: 1000000, amountRoom: 1100000, status: "COUNTERED" },
    ],
    budgetMinor: 1000000,
    context: { period: { start: "2026-11-10", end: "2026-11-16" }, participantCount: 2 },
  });
  assert.equal(presentation.referenceMinMinor, 950000);
  assert.equal(presentation.referenceMaxMinor, 1100000);
  assert.equal(presentation.recommendationStatus, "REFERENCE_AVAILABLE");
  assert.equal(presentation.hasServiceContext, true);
  assert.equal(presentation.items[0].budgetDifferenceMinor, -50000);
});
