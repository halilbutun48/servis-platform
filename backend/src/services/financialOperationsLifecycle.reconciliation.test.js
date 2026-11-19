import test from "node:test";
import assert from "node:assert/strict";
import { buildCompanyBudgetAgreementEvidenceRecord } from "./financialOperationsLifecycle.js";

const matchedReconciliation = {
  status: "MATCHED",
  statusLabel: "Uyumlu",
  hakedisPreview: { exists: true, id: 191, amountMinor: 14_000_000, currencyCode: "TRY", status: "FINALIZED" },
  expectedAmount: { amountMinor: 14_000_000, currencyCode: "TRY" },
  invoice: { exists: true, id: 176, amountMinor: 14_000_000, currencyCode: "TRY", status: "ISSUED" },
  evidence: { operations: { eligibleCount: 1, completedCount: 1, partialCount: 0 } },
  missingData: [],
};

test("canonical eşleşmede hakediş ve fatura tek kanıt, tahsilat ayrı tutar", () => {
  const result = buildCompanyBudgetAgreementEvidenceRecord({
    companyId: 1,
    agreement: { id: 195, companyId: 1, roomId: 1 },
    reconciliation: matchedReconciliation,
    paymentRows: [{ id: 5, invoiceId: 176, companyId: 1, roomId: 1, amountMinor: 8_000_000, currencyCode: "TRY", status: "CONFIRMED", direction: "COLLECTION", collectedAt: new Date("2026-10-05T00:00:00.000Z") }],
  });

  assert.equal(result.status, "MATCHED");
  assert.equal(result.hakedisCount, 1);
  assert.equal(result.invoiceCount, 1);
  assert.equal(result.paymentCount, 1);
  assert.equal(result.payment.status, "AVAILABLE");
  assert.equal(result.payment.amountMinor, 8_000_000);
  assert.deepEqual(result.payment.collectionDates, ["2026-10-05"]);
  assert.equal(result.reconciliation.expectedAmount.amountMinor, 14_000_000);
});

test("farklı COMPANY sözleşmesi için mutabakat kanıtı fail-closed kalır", () => {
  const result = buildCompanyBudgetAgreementEvidenceRecord({
    companyId: 1,
    agreement: { id: 195, companyId: 2, roomId: 1 },
    reconciliation: matchedReconciliation,
    paymentRows: [],
  });

  assert.equal(result.status, "TENANT_MISMATCH");
  assert.equal(result.reconciliation, null);
  assert.equal(result.payment.amountMinor, null);
});

test("fatura veya doğrulanmış tahsilat yoksa ödeme tutarı bilinmiyor kalır", () => {
  const result = buildCompanyBudgetAgreementEvidenceRecord({
    companyId: 1,
    agreement: { id: 207, companyId: 1, roomId: 1 },
    reconciliation: {
      status: "NO_HAKEDIS",
      statusLabel: "Hakediş verisi yok",
      hakedisPreview: { exists: false },
      invoice: { exists: false },
      evidence: { operations: { eligibleCount: 2, completedCount: 0, partialCount: 2 } },
      missingData: [{ code: "NO_HAKEDIS", label: "Hakediş verisi yok" }],
    },
    paymentRows: [],
  });

  assert.equal(result.status, "NO_HAKEDIS");
  assert.equal(result.hakedisCount, 0);
  assert.equal(result.invoiceCount, 0);
  assert.equal(result.paymentCount, 0);
  assert.equal(result.payment.status, "UNAVAILABLE");
  assert.equal(result.payment.amountMinor, null);
});
