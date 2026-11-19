import test from "node:test";
import assert from "node:assert/strict";

import { adaptForecastLedgerEntriesToOperationalInputs, adaptLedgerEntriesToOperationalInputs } from "./roomCostPreviewAdapter.js";
import { buildCostAllocationProjection } from "./roomCostAllocation.js";

test("operational cost adapter carries VAT evidence into cost math inputs", () => {
  const entry = {
    id: 9001,
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    amountMinor: 36000,
    currencyCode: "TRY",
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "DEDUCTIBLE",
    vatAmountMinor: 6000,
    vatEvidenceRef: "DEMO-VAT-FUEL",
    vatClassificationReason: "Kontrollü DEMO belge kanıtı",
    categoryKey: "FUEL",
    sourceRef: "DEMO-SOURCE-FUEL",
    allocation: "DIRECT",
    isReversal: false,
    vehicleId: 8,
    driverId: 5,
    shiftId: 367,
    agreementId: 209,
  };

  const result = adaptLedgerEntriesToOperationalInputs([entry]);
  const input = result.inputs[0];

  assert.equal(input.vatDeductibility, "DEDUCTIBLE");
  assert.equal(input.vatAmountMinor, 6000);
  assert.equal(input.vatEvidenceRef, "DEMO-VAT-FUEL");
  assert.equal(input.vatClassificationReason, "Kontrollü DEMO belge kanıtı");
  assert.equal(input.netEligible, true);
});

test("allocation projection preserves VAT evidence for profitability inputs", () => {
  const projection = buildCostAllocationProjection([{
    id: 9002,
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    amountMinor: 36000,
    currencyCode: "TRY",
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "DEDUCTIBLE",
    vatAmountMinor: 6000,
    vatEvidenceRef: "DEMO-VAT-FUEL",
    vatClassificationReason: "Kontrollü DEMO belge kanıtı",
    categoryKey: "FUEL",
    sourceRef: "DEMO-SOURCE-FUEL",
    allocation: "DIRECT",
    isReversal: false,
    occurredAt: "2026-10-30T08:00:00.000Z",
  }]);

  const input = projection.operationalInputs.inputs[0];
  assert.equal(projection.netRollupBlocked, false);
  assert.equal(input.vatDeductibility, "DEDUCTIBLE");
  assert.equal(input.vatAmountMinor, 6000);
  assert.equal(input.vatEvidenceRef, "DEMO-VAT-FUEL");
  assert.equal(input.vatClassificationReason, "Kontrollü DEMO belge kanıtı");
});

test("confirmed forecast ledger rows become planning-model inputs without becoming actual inputs", () => {
  const forecast = {
    id: 9003,
    lifecycle: "CONFIRMED",
    recordKind: "FORECAST",
    amountMinor: 125000,
    currencyCode: "TRY",
    categoryKey: "OTHER_OPERATION",
    sourceRef: "ROOM-QUOTE-FORECAST-OFFER-16-OTHER_OPERATION",
    sourceType: "ROOM_QUOTE_FORECAST",
    shiftId: 21,
    occurredAt: "2026-11-07T00:00:00.000Z",
  };

  assert.equal(adaptLedgerEntriesToOperationalInputs([forecast]).inputs.length, 0);
  const inputs = adaptForecastLedgerEntriesToOperationalInputs([forecast]);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].recordKind, "FORECAST");
  assert.equal(inputs[0].componentKey, "other_direct_cost");
  assert.equal(inputs[0].sourceType, "ROOM_QUOTE_FORECAST");
});
