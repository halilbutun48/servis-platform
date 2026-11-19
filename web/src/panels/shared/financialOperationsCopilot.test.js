import test from "node:test";
import assert from "node:assert/strict";
import { buildCompanyFinancialCopilotSelection, buildCompanyFinancialInvoiceCopilotSelection, buildFinancialCopilotSelection, buildRoomIncomeFinanceCopilotSelection, financialCopilotContextKey, isRoomIncomeFinanceCopilotSelection } from "./financialOperationsCopilot.js";

test("ROOM overview binds a single visible invoice to the authorized copilot context", () => {
  const selection = buildRoomIncomeFinanceCopilotSelection({
    baseSelection: buildFinancialCopilotSelection({ financeView: "overview" }),
    invoiceLinks: [{
      agreementId: 9,
      hakedisId: 4,
      invoiceId: 4,
      customerLabel: "DemoCompany",
      agreementLabel: "Sözleşme #9",
      sourceLabel: "Kontrollü DEMO simülasyonu · saha/banka kanıtı değil",
    }],
  });

  assert.equal(selection.entityType, "agreement");
  assert.equal(selection.entityId, 9);
  assert.equal(selection.facts.selectedAgreementId, 9);
  assert.equal(selection.facts.selectedInvoiceId, 4);
  assert.equal(selection.facts.selectedHakedisId, 4);
  assert.match(selection.label, /Fatura #4/);
  assert.match(selection.label, /Sözleşme #9/);
  assert.equal(isRoomIncomeFinanceCopilotSelection(selection), true);
});

test("ROOM overview keeps generic ledger context when multiple invoices are visible", () => {
  const baseSelection = buildFinancialCopilotSelection({ financeView: "overview" });
  const selection = buildRoomIncomeFinanceCopilotSelection({
    baseSelection,
    invoiceLinks: [{ agreementId: 9, invoiceId: 4 }, { agreementId: 10, invoiceId: 5 }],
  });

  assert.equal(selection, baseSelection);
  assert.equal(selection.entityType, "screen");
  assert.equal(selection.entityId, null);
  assert.equal(isRoomIncomeFinanceCopilotSelection(selection), false);
});

test("ROOM overview binds the explicitly selected invoice when multiple invoices are visible", () => {
  const selection = buildRoomIncomeFinanceCopilotSelection({
    baseSelection: buildFinancialCopilotSelection({ financeView: "overview" }),
    selectedInvoiceId: 5,
    invoiceLinks: [
      { agreementId: 9, hakedisId: 4, invoiceId: 4, customerLabel: "DemoCompany" },
      { agreementId: 16, hakedisId: 5, invoiceId: 5, customerLabel: "DemoCompany" },
    ],
  });

  assert.equal(selection.entityType, "agreement");
  assert.equal(selection.entityId, 16);
  assert.equal(selection.facts.selectedInvoiceId, 5);
  assert.equal(selection.facts.selectedHakedisId, 5);
  assert.match(selection.label, /Fatura #5/);
  assert.match(selection.label, /Sözleşme #16/);
  assert.equal(isRoomIncomeFinanceCopilotSelection(selection), true);
});

test("finance copilot context changes when vehicle or period changes", () => {
  const base = {
    facts: {
      screenType: "ROOM_FINANCIAL_OPERATIONS",
      financeView: "expenses",
      selectedVehicleId: 1,
      ledgerVehicleId: 1,
      selectedAgreementId: null,
      selectedShiftId: null,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      ledgerPeriodStart: "2026-09-01",
      ledgerPeriodEnd: "2026-09-30",
    },
  };

  assert.notEqual(
    financialCopilotContextKey(base),
    financialCopilotContextKey({ facts: { ...base.facts, selectedVehicleId: 2, ledgerVehicleId: 2 } }),
  );
  assert.notEqual(
    financialCopilotContextKey(base),
    financialCopilotContextKey({ facts: { ...base.facts, periodStart: "2026-10-01", periodEnd: "2026-10-31" } }),
  );
  assert.equal(financialCopilotContextKey({ facts: { screenType: "COMPANY_FINANCIAL_OPERATIONS" } }), "");
});

test("finance copilot selection carries the selected service and canonical evidence", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "service-cost",
    roomCostFocus: {
      vehicleId: 1,
      shiftId: 257,
      agreementId: 195,
      focusOfferId: 10,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    },
    preview: {
      snapshot: {
        companyName: "DemoCompany",
        shiftId: 257,
        agreementId: 195,
        routeDistanceKm: 6.25,
        routeDurationMin: 12,
        passengerCount: 20,
        vehicleCapacity: 29,
        vehicleType: "MIDIBUS",
      },
      serviceCostScope: {
        grossAmountMinor: 2390000,
        provenDistributedAmountMinor: 2390000,
        pendingAmountMinor: 0,
        sourceEntryCount: 9,
        allocationStatus: "READY",
      },
      serviceCostSourceEntries: [
        { entryId: 265, amountMinor: 240000, periodStart: "2026-09-01", periodEnd: "2026-09-30", sourceRef: "FUEL" },
      ],
      commercialOffer: { amountMinor: 14000000, agreementId: 195, shiftId: 257 },
    },
    sourceRows: [],
  });

  assert.equal(selection.scopeKey, "/room/financial-operations");
  assert.equal(selection.entityType, "shift");
  assert.equal(selection.entityId, 257);
  assert.match(selection.label, /DemoCompany/);
  assert.equal(selection.facts.selectedAgreementId, 195);
  assert.equal(selection.facts.selectedShiftId, 257);
  assert.equal(selection.facts.selectedOfferId, 10);
  assert.match(selection.label, /Teklif #10/);
  assert.match(selection.label, /Araç #1/);
  assert.equal(selection.facts.actualCostMinor, 2390000);
  assert.equal(selection.facts.selectedOfferMinor, 14000000);
  assert.deepEqual(selection.facts.sourceEntryIds, [265]);
  assert.equal(selection.facts.routeDistanceKm, 6.25);
  assert.equal(selection.facts.passengerCount, 20);
  assert.equal(selection.facts.periodStart, "2026-09-01");
  assert.equal(selection.facts.periodEnd, "2026-09-30");
  assert.match(selection.summary, /Görünüm: Servis maliyeti/);
  assert.equal(selection.badges[0].value, "Servis maliyeti");
  assert.doesNotMatch(selection.summary, /service-cost/);
});

test("COMPANY copilot selection carries separate financial evidence without ROOM details", () => {
  const selection = buildCompanyFinancialCopilotSelection({
    preview: {
      budgetPlan: { current: { id: 4, budgetAmountMinor: 20000000, currencyCode: "TRY", periodStart: "2026-09-01", periodEnd: "2026-09-30" } },
      commitmentSummary: {
        committedAmountMinor: 15000000,
        remainingBudgetMinor: 5000000,
        evidenceTotals: { hakedisAmountMinor: 14000000, invoiceAmountMinor: 14000000, paidAmountMinor: 8000000 },
        serviceEvidence: { eligibleCount: 1, completedCount: 1 },
      },
    },
  });

  assert.match(selection.summary, /Hakediş 140\.000(?:,00)? TL/iu);
  assert.match(selection.summary, /Fatura 140\.000(?:,00)? TL/iu);
  assert.match(selection.summary, /Ödenen 80\.000(?:,00)? TL/iu);
  assert.doesNotMatch(selection.summary, /ROOM iç maliyeti|oda iç maliyeti/iu);
});

test("COMPANY explicit invoice selection moves Sefer Abi context from budget to the authorized agreement", () => {
  const baseSelection = buildCompanyFinancialCopilotSelection({
    financeView: "overview",
    preview: {
      budgetPlan: { current: { id: 4, status: "DRAFT", budgetAmountMinor: 8000000 } },
      commitmentSummary: { evidenceTotals: { invoiceAmountMinor: 100000000, paidAmountMinor: 2000000 } },
    },
  });
  const selection = buildCompanyFinancialInvoiceCopilotSelection({
    baseSelection,
    invoiceLink: {
      agreementId: 14,
      hakedisId: 6,
      invoiceId: 6,
      customerLabel: "DemoCompany",
      agreementLabel: "Sözleşme #14",
      sourceLabel: "Kontrollü DEMO simülasyonu · gerçek saha/banka kanıtı değil",
    },
  });

  assert.equal(selection.entityType, "agreement");
  assert.equal(selection.entityId, 14);
  assert.equal(selection.facts.selectedEntityType, "agreement");
  assert.equal(selection.facts.selectedAgreementId, 14);
  assert.equal(selection.facts.selectedHakedisId, 6);
  assert.equal(selection.facts.selectedInvoiceId, 6);
  assert.equal(selection.facts.selectedBudgetPlanId, null);
  assert.match(selection.label, /Fatura #6/);
  assert.match(selection.label, /Sözleşme #14/);
  assert.match(selection.summary, /gerçek saha\/banka kanıtı değil/iu);
});

test("finance starter context distinguishes missing evidence without inventing zero values", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "vehicle-comparison",
    roomCostFocus: { shiftId: 303, agreementId: 198 },
    preview: {
      snapshot: { companyName: "DemoOkul", shiftId: 303, agreementId: 198 },
      serviceCostScope: { allocationStatus: "MISSING", sourceEntryCount: 0 },
      serviceCostSourceEntries: [],
    },
  });

  assert.equal(selection.facts.routeDistanceKm, null);
  assert.equal(selection.facts.actualCostMinor, null);
  assert.equal(selection.facts.dataStatus, "MISSING");
  assert.match(selection.facts.missingData.join(" "), /rota|maliyet/i);
});

test("finance copilot does not treat pending allocation as realized service cost", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "profitability",
    roomCostFocus: { vehicleId: 2, shiftId: 43 },
    preview: {
      snapshot: { companyName: "DemoOrganizasyon", shiftId: 43, routeDistanceKm: 7.07, passengerCount: 4, vehicleId: 2 },
      serviceCostScope: {
        grossAmountMinor: 5611,
        provenDistributedAmountMinor: 5611,
        allocationStatus: "PENDING",
      },
    },
  });

  assert.equal(selection.facts.actualCostMinor, null);
  assert.equal(selection.facts.dataStatus, "MISSING");
  assert.match(selection.facts.missingData.join(" "), /gerçekleşen maliyet/i);
});

test("Giderlerim selection ignores stale service context", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "expenses",
    roomCostFocus: { vehicleId: 1, shiftId: 279, agreementId: 199 },
    preview: {
      snapshot: { companyName: "DemoOrganizasyon", shiftId: 279, agreementId: 199, routeDistanceKm: 84.795, passengerCount: 4 },
      serviceCostScope: { grossAmountMinor: 900000, provenDistributedAmountMinor: 900000, sourceEntryCount: 2, allocationStatus: "READY" },
      serviceCostSourceEntries: [{ entryId: 278, amountMinor: 380000 }],
    },
  });

  assert.equal(selection.entityType, "screen");
  assert.equal(selection.entityId, null);
  assert.equal(selection.facts.selectedAgreementId, null);
  assert.equal(selection.facts.selectedShiftId, null);
  assert.equal(selection.facts.actualCostMinor, null);
  assert.equal(selection.facts.routeDistanceKm, null);
  assert.equal(selection.facts.dataStatus, "LEDGER_SCOPE");
  assert.match(selection.label, /Firma geneli/);
});

test("independent ledger context remains explicit for vehicle questions", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "expenses",
    roomCostFocus: {
      filterVehicleId: 1,
      filterPeriodStart: "2026-09-01",
      filterPeriodEnd: "2026-09-30",
    },
    preview: { snapshot: { vehicleId: 1, companyName: "Demo ROOM" } },
  });

  assert.equal(selection.facts.selectedVehicleId, null);
  assert.equal(selection.facts.ledgerVehicleId, 1);
  assert.equal(selection.facts.ledgerPeriodStart, "2026-09-01");
  assert.equal(selection.facts.ledgerPeriodEnd, "2026-09-30");
  assert.equal(selection.facts.dataStatus, "LEDGER_SCOPE");
});

test("independent ledger context publishes the selected vehicle and period to Sefer Abi", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "overview",
    roomCostFocus: {
      filterVehicleId: 1,
      filterPeriodStart: "2026-09-01",
      filterPeriodEnd: "2026-09-30",
    },
    selectedVehicleLabel: "34ABC123",
  });

  assert.match(selection.label, /34ABC123/);
  assert.match(selection.label, /01\.09\.2026.*30\.09\.2026/);
  assert.equal(selection.facts.ledgerVehicleId, 1);
  assert.equal(selection.facts.ledgerVehicleLabel, "34ABC123");
  assert.equal(selection.facts.ledgerPeriodLabel, "01.09.2026 – 30.09.2026");
  assert.doesNotMatch(selection.label, /Otomatik hizmet filtresi yok/);
});

test("all-period ledger context does not invent an epoch period", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "overview",
    roomCostFocus: { filterVehicleId: 1 },
    selectedVehicleLabel: "34ABC123",
  });

  assert.match(selection.label, /34ABC123/);
  assert.match(selection.label, /Dönem belirtilmedi/);
  assert.doesNotMatch(selection.label, /1970/);
  assert.equal(selection.facts.ledgerPeriodLabel, null);
});

test("finance copilot selection preserves the focused URL period when ledger rows have no period", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "vehicle-comparison",
    roomCostFocus: {
      vehicleId: 1,
      shiftId: 318,
      agreementId: 202,
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
    },
    preview: {
      snapshot: { companyName: "DemoCompany", shiftId: 318, agreementId: 202, routeDistanceKm: 12.4, passengerCount: 4 },
      serviceCostScope: { grossAmountMinor: 410000, provenDistributedAmountMinor: 410000, sourceEntryCount: 1, allocationStatus: "READY" },
      serviceCostSourceEntries: [{ entryId: 286, amountMinor: 410000 }],
    },
  });

  assert.equal(selection.facts.periodStart, "2026-12-01");
  assert.equal(selection.facts.periodEnd, "2026-12-31");
});

test("finance copilot reuses the saved ROOM quote draft for the selected contractless service", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "profitability",
    roomCostFocus: { shiftId: 19, vehicleId: 1 },
    preview: {
      snapshot: {
        companyName: "Temiz Demo COMPANY",
        shiftId: 19,
        vehicleId: 1,
        routeDistanceKm: 2.72,
        routeDurationMin: 4.9,
        passengerCount: 3,
        vehicleCapacity: 29,
      },
      serviceCostScope: { allocationStatus: "MISSING", sourceEntryCount: 0 },
      operationalCostModel: { baselineOperationalCostMinor: 5741 },
      quoteFloorDraft: {
        current: {
          id: 2,
          quoteFloorMinor: 7537,
          targetContributionBps: 2000,
          riskReserveBps: 500,
          inputSnapshot: {
            computed: {
              planningInputs: {
                fuelType: "DIESEL",
                fuelConsumptionLitersPer100Km: "21",
                fuelUnitPriceMinor: "10050",
                vehicleLeaseMonthlyMinor: "600000",
              },
            },
          },
        },
      },
    },
  });

  assert.equal(selection.facts.selectedShiftId, 19);
  assert.equal(selection.facts.selectedVehicleId, 1);
  assert.equal(selection.facts.targetContributionBps, 2000);
  assert.equal(selection.facts.riskReserveBps, 500);
  assert.equal(selection.facts.quoteFloorMinor, 7537);
  assert.equal(selection.facts.planningInputs.fuelType, "DIESEL");
  assert.equal(selection.facts.planningInputs.vehicleLeaseMonthlyMinor, "600000");
});

test("finance copilot reuses a direct ROOM quote draft returned by the focused preview", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "quote-profitability",
    roomCostFocus: { shiftId: 19, vehicleId: 1, periodStart: "2026-11-02", periodEnd: "2026-11-02" },
    preview: {
      snapshot: { companyName: "DemoCompany", routeDistanceKm: 2.72, passengerCount: 3, vehicleCapacity: 29 },
      serviceCostScope: { allocationStatus: "PENDING" },
      quoteFloorDraft: {
        id: 2,
        targetContributionBps: 2000,
        riskReserveBps: 500,
        quoteFloorMinor: 7537,
        inputSnapshot: {
          serviceContext: { shiftId: 19, vehicleId: 1 },
          computed: { planningInputs: { fuelType: "DIESEL", fuelConsumptionLitersPer100Km: 21 } },
        },
      },
    },
  });

  assert.equal(selection.facts.targetContributionBps, 2000);
  assert.equal(selection.facts.riskReserveBps, 500);
  assert.deepEqual(selection.facts.planningInputs, {
    fuelType: "DIESEL",
    fuelConsumptionLitersPer100Km: 21,
  });
});

test("finance copilot does not send an incomplete draft's stale baseline over the live canonical preview", () => {
  const selection = buildFinancialCopilotSelection({
    financeView: "profitability",
    roomCostFocus: { shiftId: 19, vehicleId: 1 },
    preview: {
      snapshot: { companyName: "DemoCompany", shiftId: 19, vehicleId: 1, routeDistanceKm: 2.72, passengerCount: 3 },
      serviceCostScope: { allocationStatus: "MISSING", sourceEntryCount: 0 },
      operationalCostModel: { baselineOperationalCostMinor: 25741 },
      quoteFloor: { baselineOperationalCostMinor: 25741, baselineSource: "complete" },
      quoteFloorDraft: {
        current: {
          baselineSource: "incomplete",
          manualBaselineOperationalCostMinor: null,
          inputSnapshot: { computed: { baselineOperationalCostMinor: 5741 } },
        },
      },
    },
  });

  assert.equal(selection.facts.manualBaselineOperationalCostMinor, null);
  assert.equal(selection.facts.plannedCostMinor, 25741);
});
