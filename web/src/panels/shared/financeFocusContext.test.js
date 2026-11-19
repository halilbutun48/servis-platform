import test from "node:test";
import assert from "node:assert/strict";
import {
  clearRoomFinanceContextParams,
  clearRoomFinanceContextParamsPreservingOperationalFilters,
  clearRoomFinanceServiceContextParams,
  financeViewUsesFocusedContext,
  roomServiceContextRequiredForView,
  isExpenseEntryContext,
  markRoomExpenseEntryContext,
  mergeRoomServiceContextWithoutOverwritingOperationalFilters,
  operationalFilterValuesFromUrl,
  operationalPeriodMonthValue,
  financePeriodPresetRange,
  financePeriodPresetValue,
  roomExpenseLedgerFocusFromContext,
  roomExpenseLedgerFocusForView,
  shouldClearRoomServiceContextForOperationalPeriodChange,
  shouldClearRoomServiceContextForOperationalFilterChange,
  shouldClearRoomServiceContextForOperationalVehicleChange,
  vehicleFitLabel,
} from "./financeFocusContext.js";

test("focused finance context is used by all selected-service surfaces", () => {
  assert.equal(financeViewUsesFocusedContext("service-cost"), true);
  assert.equal(financeViewUsesFocusedContext("vehicle-comparison"), true);
  assert.equal(financeViewUsesFocusedContext("quote-profitability"), true);
  assert.equal(financeViewUsesFocusedContext("overview"), false);
  assert.equal(vehicleFitLabel({ passengerCount: 20, vehicleCapacity: 29 }), "Uygun kapasite");
  assert.equal(vehicleFitLabel({ passengerCount: 30, vehicleCapacity: 29 }), "Kapasite yetersiz");
  assert.equal(vehicleFitLabel({ passengerCount: 0, vehicleCapacity: 29 }), null);
});

test("focused finance views require an explicit service when an operational scope has no match yet", () => {
  assert.equal(roomServiceContextRequiredForView({
    view: "quote-profitability",
    filterVehicleId: 2,
    filterPeriodStart: "2026-09-01",
    filterPeriodEnd: "2026-09-30",
  }), true);
  assert.equal(roomServiceContextRequiredForView({
    view: "vehicle-comparison",
    filterDriverId: 2,
  }), true);
  assert.equal(roomServiceContextRequiredForView({
    view: "quote-profitability",
    hasExplicitServiceSelection: true,
    filterVehicleId: 2,
  }), false);
  assert.equal(roomServiceContextRequiredForView({
    view: "overview",
    filterVehicleId: 2,
  }), false);
});

test("expense context can be cleared without losing the target finance view", () => {
  const params = new URLSearchParams(
    "view=expenses&focusVehicleId=1&focusDriverId=1&focusShiftId=301&focusAgreementId=196&focusEntryId=265&focusCostCategory=FUEL&focusField=amount&focusPeriodStart=2026-09-01&focusPeriodEnd=2026-09-30&contextSource=service-cost",
  );

  const cleared = clearRoomFinanceContextParams(params);

  assert.equal(cleared.get("view"), "expenses");
  assert.equal(cleared.toString(), "view=expenses");
});

test("finance tab navigation preserves the selected vehicle and period filters", () => {
  const preserved = clearRoomFinanceContextParamsPreservingOperationalFilters(
    new URLSearchParams(
      "view=overview&filterVehicleId=1&filterPeriodStart=2026-09-01&filterPeriodEnd=2026-09-30&operationalScope=realized&focusShiftId=301&focusAgreementId=196",
    ),
  );

  assert.equal(preserved.get("view"), "overview");
  assert.equal(preserved.get("filterVehicleId"), "1");
  assert.equal(preserved.get("filterPeriodStart"), "2026-09-01");
  assert.equal(preserved.get("filterPeriodEnd"), "2026-09-30");
  assert.equal(preserved.get("operationalScope"), "realized");
  assert.equal(preserved.has("focusShiftId"), false);
  assert.equal(preserved.has("focusAgreementId"), false);
});

test("vehicle changes retain the already selected operational period from the URL", () => {
  assert.deepEqual(operationalFilterValuesFromUrl(
    "view=service-cost&filterVehicleId=1&filterPeriodStart=2026-09-01&filterPeriodEnd=2026-09-30",
    { filterVehicleId: null, filterPeriodStart: null, filterPeriodEnd: null },
  ), {
    filterVehicleId: "1",
    filterDriverId: null,
    filterPeriodStart: "2026-09-01",
    filterPeriodEnd: "2026-09-30",
  });
});

test("Giderlerim hızlı dönem göstergesi URL kapsamındaki tek ayı kullanır", () => {
  assert.equal(operationalPeriodMonthValue("2026-09-01", "2026-09-30"), "2026-09");
  assert.equal(operationalPeriodMonthValue("2026-09-18", "2026-10-03"), "");
  assert.equal(operationalPeriodMonthValue("", "2026-09-30"), "");
});

test("finans kapsamı dönem kısayolları tek canonical tarih aralığı üretir", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");
  assert.deepEqual(financePeriodPresetRange("current-month", now), {
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
  assert.deepEqual(financePeriodPresetRange("previous-month", now), {
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
  });
  assert.deepEqual(financePeriodPresetRange("all", now), {
    periodStart: null,
    periodEnd: null,
  });
  assert.equal(financePeriodPresetValue("2026-11-01", "2026-11-30", now), "current-month");
  assert.equal(financePeriodPresetValue("2026-10-01", "2026-10-31", now), "previous-month");
  assert.equal(financePeriodPresetValue("2026-09-01", "2026-09-30", now), "custom");
  assert.equal(financePeriodPresetValue("", "", now), "all");
});

test("stale service focus cannot overwrite URL operational vehicle and period filters", () => {
  assert.deepEqual(mergeRoomServiceContextWithoutOverwritingOperationalFilters(
    {
      filterVehicleId: 1,
      filterPeriodStart: "2026-09-01",
      filterPeriodEnd: "2026-09-30",
      vehicleId: null,
      shiftId: null,
    },
    {
      filterVehicleId: null,
      filterPeriodStart: null,
      filterPeriodEnd: null,
      vehicleId: 1,
      driverId: 1,
      shiftId: 3,
      agreementId: 1,
      periodStart: "2026-09-15",
      periodEnd: "2026-09-15",
    },
  ), {
    filterVehicleId: 1,
    filterPeriodStart: "2026-09-01",
    filterPeriodEnd: "2026-09-30",
    vehicleId: 1,
    driverId: 1,
    shiftId: 3,
    agreementId: 1,
    periodStart: "2026-09-15",
    periodEnd: "2026-09-15",
  });
  assert.deepEqual(mergeRoomServiceContextWithoutOverwritingOperationalFilters(
    { filterVehicleId: 1 },
    { vehicleId: 1, shiftId: 3 },
    { blocked: true },
  ), { filterVehicleId: 1 });
});

test("Giderlerim seçili araç ve dönem bağlamını Genel Durum ile paylaşır", () => {
  assert.deepEqual(roomExpenseLedgerFocusFromContext({
    filterVehicleId: 1,
    filterDriverId: 7,
    filterPeriodStart: "2026-09-01",
    filterPeriodEnd: "2026-09-30",
  }), {
    vehicleId: 1,
    driverId: 7,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  });

  assert.deepEqual(roomExpenseLedgerFocusFromContext({
    vehicleId: 9,
    periodStart: "2026-10-01",
    filterVehicleId: 1,
    filterPeriodStart: "2026-09-01",
  }), {
    vehicleId: 9,
    driverId: null,
    periodStart: "2026-10-01",
    periodEnd: null,
  });
});

test("normal Giderlerim navigation does not inherit the selected service driver", () => {
  assert.deepEqual(roomExpenseLedgerFocusForView({
    vehicleId: 1,
    driverId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    filterVehicleId: 1,
    filterPeriodStart: "2026-09-01",
    filterPeriodEnd: "2026-09-30",
  }), {
    vehicleId: 1,
    driverId: null,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  });

  assert.deepEqual(roomExpenseLedgerFocusForView({
    vehicleId: 1,
    driverId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  }, { preserveExpenseEntryContext: true }), {
    vehicleId: 1,
    driverId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  });
});

test("source-entry navigation removes service context but keeps the focused expense hint", () => {
  const params = clearRoomFinanceServiceContextParams(
    "view=service-cost&serviceCostContextRequired=true&focusVehicleId=1&focusShiftId=301&focusAgreementId=196&focusEntryId=265&focusPeriodStart=2026-09-01",
  );

  assert.equal(params.get("focusEntryId"), "265");
  assert.equal(params.get("focusPeriodStart"), "2026-09-01");
  assert.equal(params.has("focusVehicleId"), false);
  assert.equal(params.has("focusShiftId"), false);
  assert.equal(params.has("focusAgreementId"), false);
  assert.equal(params.has("serviceCostContextRequired"), false);
});

test("expense-entry actions keep form hints without creating a service-ledger filter", () => {
  assert.equal(isExpenseEntryContext(new URLSearchParams("view=expenses&focusCostCategory=FUEL&prefillVehicleId=1&contextSource=expense-entry")), true);
  assert.equal(isExpenseEntryContext(new URLSearchParams("view=expenses&focusCostCategory=FUEL&contextSource=service-cost")), false);
});

test("missing-cost navigation preserves the expense-entry context", () => {
  const params = markRoomExpenseEntryContext(new URLSearchParams(
    "view=expenses&action=add&prefillVehicleId=1&prefillDriverId=1&focusShiftId=413&focusCostCategory=ADBLUE&focusRecordKind=FORECAST&focusPeriodStart=2026-11-17&focusPeriodEnd=2026-11-20",
  ));

  assert.equal(params.get("action"), "add");
  assert.equal(params.get("prefillVehicleId"), "1");
  assert.equal(params.get("prefillDriverId"), "1");
  assert.equal(params.get("focusShiftId"), "413");
  assert.equal(params.get("focusCostCategory"), "ADBLUE");
  assert.equal(params.get("focusRecordKind"), "FORECAST");
  assert.equal(params.get("focusPeriodStart"), "2026-11-17");
  assert.equal(params.get("focusPeriodEnd"), "2026-11-20");
  assert.equal(isExpenseEntryContext(params), true);
});

test("period changes clear an explicit service context when it is outside the service period", () => {
  assert.equal(shouldClearRoomServiceContextForOperationalPeriodChange({
    hasExplicitServiceSelection: true,
    currentPeriodStart: "2026-09-01",
    currentPeriodEnd: "2026-09-30",
    nextPeriodStart: "2026-12-01",
    nextPeriodEnd: "2026-12-31",
  }), true);
  assert.equal(shouldClearRoomServiceContextForOperationalPeriodChange({
    hasExplicitServiceSelection: true,
    currentPeriodStart: "2026-09-01",
    currentPeriodEnd: "2026-09-30",
    nextPeriodStart: "2026-09-01",
    nextPeriodEnd: "2026-09-30",
  }), false);
  assert.equal(shouldClearRoomServiceContextForOperationalPeriodChange({
    hasExplicitServiceSelection: true,
    currentPeriodStart: "2026-09-18",
    currentPeriodEnd: "2026-10-31",
    nextPeriodStart: "2026-09-01",
    nextPeriodEnd: "2026-09-30",
  }), true);
  assert.equal(shouldClearRoomServiceContextForOperationalPeriodChange({
    hasExplicitServiceSelection: false,
    currentPeriodStart: "2026-09-01",
    currentPeriodEnd: "2026-09-30",
    nextPeriodStart: "2026-12-01",
    nextPeriodEnd: "2026-12-31",
  }), false);
  assert.equal(shouldClearRoomServiceContextForOperationalPeriodChange({
    hasExplicitServiceSelection: true,
    nextPeriodStart: "2026-12-01",
    nextPeriodEnd: "2026-12-31",
  }), true);
});

test("vehicle changes clear an explicit service context before a new service is resolved", () => {
  assert.equal(shouldClearRoomServiceContextForOperationalVehicleChange({
    hasExplicitServiceSelection: true,
    currentVehicleId: 1,
    nextVehicleId: 2,
  }), true);
  assert.equal(shouldClearRoomServiceContextForOperationalVehicleChange({
    hasExplicitServiceSelection: true,
    currentVehicleId: 1,
    nextVehicleId: 1,
  }), false);
  assert.equal(shouldClearRoomServiceContextForOperationalVehicleChange({
    hasExplicitServiceSelection: false,
    currentVehicleId: 1,
    nextVehicleId: 2,
  }), false);
});

test("operational filter changes clear stale service context from every finance tab", () => {
  assert.equal(shouldClearRoomServiceContextForOperationalFilterChange({
    hasExplicitServiceSelection: true,
    currentVehicleId: 1,
    nextVehicleId: 2,
  }), true);
  assert.equal(shouldClearRoomServiceContextForOperationalFilterChange({
    hasExplicitServiceSelection: true,
    currentPeriodStart: "2026-09-01",
    currentPeriodEnd: "2026-09-30",
    nextPeriodStart: "2026-12-01",
    nextPeriodEnd: "2026-12-31",
  }), true);
  assert.equal(shouldClearRoomServiceContextForOperationalFilterChange({
    hasExplicitServiceSelection: true,
    currentVehicleId: 1,
    nextVehicleId: 1,
    currentPeriodStart: "2026-09-01",
    currentPeriodEnd: "2026-09-30",
    nextPeriodStart: "2026-09-01",
    nextPeriodEnd: "2026-09-30",
  }), false);
});
