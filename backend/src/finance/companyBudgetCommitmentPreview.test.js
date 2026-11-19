import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompanyBudgetCommitmentPreview,
  buildCompanyBudgetFinancialEvidenceSummary,
} from "./companyBudgetCommitmentPreview.js";

function included(agreementId, amountMinor = 1_500_000) {
  return [{
    agreementId,
    amountMinor,
    commercialAmountMinor: amountMinor,
    commercialPriceSource: "TEST_CANONICAL_ACCEPTED_PRICE",
    commercialPriceStatus: "READY",
    currencyCode: "TRY",
  }];
}

function reconciliation207(overrides = {}) {
  return {
    status: "NO_HAKEDIS",
    statusLabel: "Hakediş verisi yok",
    period: { start: "2026-11-03", end: "2026-11-09" },
    expectedAmount: null,
    hakedisPreview: { exists: false, amountMinor: null, status: null },
    invoice: { exists: false, amountMinor: null, status: null },
    evidence: {
      operations: { eligibleCount: 2, completedCount: 0, partialCount: 2 },
    },
    missingData: [{ code: "NO_HAKEDIS", label: "Hakediş verisi yok" }],
    payment: { status: "UNAVAILABLE", amountMinor: null, reason: "Fatura kaydı yok." },
    ...overrides,
  };
}

test("#207 kanıt yokken tamamlanmış finans veya sıfır tutar uydurmaz", () => {
  const result = buildCompanyBudgetFinancialEvidenceSummary({
    included: included(207),
    reconciliationByAgreementId: { "207": reconciliation207() },
  });

  assert.equal(result.status, "EVIDENCE_MISSING");
  assert.equal(result.evidenceTotals.serviceEligibleCount, 2);
  assert.equal(result.evidenceTotals.serviceCompletedCount, 0);
  assert.equal(result.evidenceTotals.hakedisAmountMinor, null);
  assert.equal(result.evidenceTotals.invoiceAmountMinor, null);
  assert.equal(result.evidenceTotals.paidAmountMinor, null);
  assert.equal(result.evidenceTotals.realizedServiceAmountMinor, null);
  assert.equal(result.items[0].hakedis.amountMinor, null);
  assert.match(result.items[0].missingDataText, /Hakediş|fatura|ödeme/i);
});

test("#195 eşleşen hakediş/faturayı tek kanıt satırı, tahsilatı ayrı tutar", () => {
  const result = buildCompanyBudgetFinancialEvidenceSummary({
    included: included(195, 15_000_000),
    reconciliationByAgreementId: {
      "195": {
        status: "MATCHED",
        statusLabel: "Uyumlu",
        period: { start: "2026-09-01", end: "2026-09-30" },
        expectedAmount: { amountMinor: 14_000_000, currencyCode: "TRY" },
        hakedisPreview: { exists: true, amountMinor: 14_000_000, currencyCode: "TRY", status: "FINALIZED" },
        invoice: { exists: true, amountMinor: 14_000_000, currencyCode: "TRY", status: "ISSUED" },
        evidence: { operations: { eligibleCount: 1, completedCount: 1, partialCount: 0 } },
        missingData: [],
        payment: { status: "AVAILABLE", amountMinor: 8_000_000, currencyCode: "TRY", recordCount: 1, collectionDates: ["2026-10-05"] },
      },
    },
  });

  assert.equal(result.status, "MATCHED");
  assert.equal(result.evidenceTotals.financialLineCount, 1);
  assert.equal(result.evidenceTotals.hakedisAmountMinor, 14_000_000);
  assert.equal(result.evidenceTotals.invoiceAmountMinor, 14_000_000);
  assert.equal(result.evidenceTotals.paidAmountMinor, 8_000_000);
  assert.equal(result.evidenceTotals.realizedServiceAmountMinor, 15_000_000);
  assert.equal(result.items[0].invoice.matchStatus, "MATCHED");
  assert.deepEqual(result.items[0].payment.collectionDates, ["2026-10-05"]);
});

test("kısmi veya doğrulanmamış ödeme ödenen tutarı kesinleştirmez", () => {
  const result = buildCompanyBudgetFinancialEvidenceSummary({
    included: included(195, 15_000_000),
    reconciliationByAgreementId: {
      "195": {
        status: "MATCHED",
        statusLabel: "Uyumlu",
        period: { start: "2026-09-01", end: "2026-09-30" },
        expectedAmount: { amountMinor: 14_000_000, currencyCode: "TRY" },
        hakedisPreview: { exists: true, amountMinor: 14_000_000, currencyCode: "TRY", status: "FINALIZED" },
        invoice: { exists: true, amountMinor: 14_000_000, currencyCode: "TRY", status: "ISSUED" },
        evidence: { operations: { eligibleCount: 1, completedCount: 1, partialCount: 0 } },
        missingData: [],
        payment: { status: "UNAVAILABLE", amountMinor: null, reason: "Doğrulanmış tahsilat kaydı yok." },
      },
    },
  });

  assert.equal(result.status, "PAYMENT_UNPROVEN");
  assert.equal(result.evidenceTotals.hakedisAmountMinor, 14_000_000);
  assert.equal(result.evidenceTotals.invoiceAmountMinor, 14_000_000);
  assert.equal(result.evidenceTotals.paidAmountMinor, null);
  assert.equal(result.evidenceTotals.realizedServiceAmountMinor, 15_000_000);
});

test("tamamlanmamış veya eşleşmemiş hizmet gerçekleşen harcamayı kapalı tutar", () => {
  const result = buildCompanyBudgetFinancialEvidenceSummary({
    included: included(195, 15_000_000),
    reconciliationByAgreementId: {
      "195": {
        status: "UNDER_INVOICED",
        statusLabel: "Fark var",
        period: { start: "2026-09-01", end: "2026-09-30" },
        expectedAmount: { amountMinor: 14_000_000, currencyCode: "TRY" },
        hakedisPreview: { exists: true, amountMinor: 14_000_000, currencyCode: "TRY", status: "FINALIZED" },
        invoice: { exists: true, amountMinor: 13_000_000, currencyCode: "TRY", status: "ISSUED" },
        evidence: { operations: { eligibleCount: 2, completedCount: 1, partialCount: 1 } },
        missingData: [],
        payment: { status: "AVAILABLE", amountMinor: 8_000_000, currencyCode: "TRY", recordCount: 1 },
      },
    },
  });

  assert.equal(result.evidenceTotals.realizedServiceAmountMinor, null);
});

test("aynı sözleşme tekrar gelse bile kanıt satırı ve tutarı iki kez sayılmaz", () => {
  const result = buildCompanyBudgetFinancialEvidenceSummary({
    included: [
      ...included(195, 15_000_000),
      ...included(195, 15_000_000),
    ],
    reconciliationByAgreementId: {
      "195": {
        status: "MATCHED",
        statusLabel: "Uyumlu",
        period: { start: "2026-09-01", end: "2026-09-30" },
        expectedAmount: { amountMinor: 14_000_000, currencyCode: "TRY" },
        hakedisPreview: { exists: true, amountMinor: 14_000_000, currencyCode: "TRY", status: "FINALIZED" },
        invoice: { exists: true, amountMinor: 14_000_000, currencyCode: "TRY", status: "ISSUED" },
        evidence: { operations: { eligibleCount: 1, completedCount: 1, partialCount: 0 } },
        missingData: [],
        payment: { status: "AVAILABLE", amountMinor: 8_000_000, currencyCode: "TRY", recordCount: 1 },
      },
    },
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.evidenceTotals.financialLineCount, 1);
  assert.equal(result.evidenceTotals.hakedisAmountMinor, 14_000_000);
  assert.equal(result.evidenceTotals.paidAmountMinor, 8_000_000);
});

test("COMPANY gerçekleşen gideri ROOM tedarikçi faturasına değil şirket sözleşme bedeline bağlanır", () => {
  const result = buildCompanyBudgetFinancialEvidenceSummary({
    included: included(6, 12_000_000),
    reconciliationByAgreementId: {
      "6": {
        status: "MATCHED",
        statusLabel: "Uyumlu",
        period: { start: "2026-11-02", end: "2026-11-02" },
        expectedAmount: { amountMinor: 1_000_000, currencyCode: "TRY" },
        hakedisPreview: { exists: true, amountMinor: 1_000_000, currencyCode: "TRY", status: "FINALIZED" },
        invoice: { exists: true, amountMinor: 1_000_000, currencyCode: "TRY", status: "ISSUED" },
        evidence: { operations: { eligibleCount: 1, completedCount: 1, partialCount: 0 } },
        missingData: [],
        payment: { status: "AVAILABLE", amountMinor: 400_000, currencyCode: "TRY", recordCount: 1 },
      },
    },
  });

  assert.equal(result.items[0].companyContractAmountMinor, 12_000_000);
  assert.equal(result.items[0].invoice.amountMinor, 1_000_000);
  assert.equal(result.evidenceTotals.realizedServiceAmountMinor, 12_000_000);
  assert.equal(result.evidenceTotals.invoiceAmountMinor, 1_000_000);
});

test("kabul edilmiş ROOM fiyatı eski COMPANY teklif snapshot'ının yerine geçer", () => {
  const result = buildCompanyBudgetFinancialEvidenceSummary({
    included: [{
      agreementId: 6,
      amountMinor: 12_000_000,
      companyOfferAmountMinor: 12_000_000,
      roomOfferAmountMinor: 10_000_000,
      commercialAmountMinor: 10_000_000,
      commercialPriceSource: "AGREEMENT_ROOM_OFFER",
      commercialPriceStatus: "READY",
      currencyCode: "TRY",
    }],
    reconciliationByAgreementId: {
      "6": {
        status: "MATCHED",
        statusLabel: "Uyumlu",
        period: { start: "2026-11-02", end: "2026-11-02" },
        expectedAmount: { amountMinor: 1_000_000, currencyCode: "TRY" },
        hakedisPreview: { exists: true, amountMinor: 1_000_000, currencyCode: "TRY", status: "FINALIZED" },
        invoice: { exists: true, amountMinor: 1_000_000, currencyCode: "TRY", status: "ISSUED" },
        evidence: { operations: { eligibleCount: 1, completedCount: 1, partialCount: 0 } },
        missingData: [],
        payment: { status: "AVAILABLE", amountMinor: 400_000, currencyCode: "TRY", recordCount: 1 },
      },
    },
  });

  assert.equal(result.items[0].companyContractAmountMinor, 10_000_000);
  assert.equal(result.items[0].companyContractAmountSource, "AGREEMENT_ROOM_OFFER");
  assert.equal(result.evidenceTotals.realizedServiceAmountMinor, 10_000_000);
  assert.equal(result.evidenceTotals.invoiceAmountMinor, 1_000_000);
});

test("kabul edilmiş fiyat kanıtı yoksa eski COMPANY teklif snapshot'ı taahhüt sayılmaz", () => {
  const result = buildCompanyBudgetCommitmentPreview({
    budgetPlan: {
      id: 1,
      companyId: 21,
      budgetAmountMinor: 20_000_000,
      currencyCode: "TRY",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      agreementIds: [6],
    },
    agreements: [{
      id: 6,
      companyId: 21,
      status: "APPROVED",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      companyOfferAmount: 12_000_000,
      commercialAmountMinor: null,
      commercialPriceStatus: "NOT_PROVEN",
    }],
  });

  assert.equal(result.included.length, 0);
  assert.equal(result.committedAmountMinor, null);
  assert.equal(result.excluded[0].reasonCode, "COMMERCIAL_PRICE_NOT_PROVEN");
});
