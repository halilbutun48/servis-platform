import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVehicleMonthDecisionSummary,
  filterServiceCostEntriesForContext,
} from "./roomServiceCostContext.js";

const PERIOD = Object.freeze({
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
});

function financeFixture() {
  const shifts = [
    {
      id: 101,
      roomId: 1,
      vehicleId: 1,
      driverId: 11,
      agreementId: 201,
      status: "DONE",
      startAt: "2026-09-10T06:00:00.000Z",
      endAt: "2026-09-10T14:00:00.000Z",
    },
    {
      id: 102,
      roomId: 1,
      vehicleId: 2,
      driverId: 12,
      agreementId: 202,
      status: "DONE",
      startAt: "2026-09-11T06:00:00.000Z",
      endAt: "2026-09-11T14:00:00.000Z",
    },
  ];

  const costEntries = [
    {
      id: 1,
      roomId: 1,
      vehicleId: 1,
      driverId: 11,
      agreementId: 201,
      shiftId: 101,
      categoryKey: "FUEL",
      amountMinor: 500_000,
      currencyCode: "TRY",
      recordKind: "ACTUAL",
      occurrenceKind: "PER_SHIFT",
      allocation: "DIRECT",
      lifecycle: "CONFIRMED",
      ...PERIOD,
      allocationLines: [{ vehicleId: 1, driverId: 11, agreementId: 201, shiftId: 101, allocatedAmountMinor: 500_000 }],
    },
    {
      id: 2,
      roomId: 1,
      vehicleId: 1,
      driverId: 11,
      agreementId: null,
      shiftId: null,
      categoryKey: "EMPLOYER_MONTHLY_COST",
      amountMinor: 200_000,
      currencyCode: "TRY",
      recordKind: "ACTUAL",
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      lifecycle: "CONFIRMED",
      ...PERIOD,
      allocationLines: [],
    },
    {
      id: 3,
      roomId: 1,
      vehicleId: 1,
      driverId: 11,
      agreementId: 202,
      shiftId: 101,
      categoryKey: "HGS_TOLL",
      amountMinor: 300_000,
      currencyCode: "TRY",
      recordKind: "ACTUAL",
      occurrenceKind: "ONE_OFF",
      allocation: "DIRECT",
      lifecycle: "CONFIRMED",
      ...PERIOD,
      allocationLines: [],
    },
    {
      id: 4,
      roomId: 1,
      vehicleId: 2,
      driverId: 12,
      agreementId: 202,
      shiftId: 102,
      categoryKey: "FUEL",
      amountMinor: 600_000,
      currencyCode: "TRY",
      recordKind: "ACTUAL",
      occurrenceKind: "PER_SHIFT",
      allocation: "DIRECT",
      lifecycle: "CONFIRMED",
      ...PERIOD,
      allocationLines: [{ vehicleId: 2, driverId: 12, agreementId: 202, shiftId: 102, allocatedAmountMinor: 600_000 }],
    },
  ];

  const incomeLines = [
    {
      hakedisId: 2010,
      invoiceId: 3010,
      agreementId: 201,
      shiftId: 101,
      amountMinor: 10_000_000,
      currencyCode: "TRY",
      ...PERIOD,
    },
    {
      hakedisId: 2020,
      invoiceId: 3020,
      agreementId: 202,
      shiftId: 102,
      amountMinor: 12_000_000,
      currencyCode: "TRY",
      ...PERIOD,
    },
  ];

  return Object.freeze({ shifts, costEntries, incomeLines });
}

test("isolated two-service fixture keeps income, cost ownership and contradictory cost separate", () => {
  const fixture = financeFixture();
  const firstServiceEntries = filterServiceCostEntriesForContext(
    fixture.costEntries,
    { agreementId: 201, shiftId: 101 },
    { includePending: true, targetShift: fixture.shifts[0] },
  );
  const secondServiceEntries = filterServiceCostEntriesForContext(
    fixture.costEntries,
    { agreementId: 202, shiftId: 102 },
    { includePending: true, targetShift: fixture.shifts[1] },
  );

  assert.deepEqual(firstServiceEntries.map((entry) => entry.id), [1, 2]);
  assert.deepEqual(secondServiceEntries.map((entry) => entry.id), [4]);
  assert.equal(firstServiceEntries.some((entry) => entry.id === 3), false);

  const first = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    ...PERIOD,
    shifts: fixture.shifts,
    incomeLines: fixture.incomeLines,
    costEntries: firstServiceEntries,
  });
  const second = buildVehicleMonthDecisionSummary({
    vehicleId: 2,
    ...PERIOD,
    shifts: fixture.shifts,
    incomeLines: fixture.incomeLines,
    costEntries: secondServiceEntries,
  });

  assert.equal(first.earnedIncomeMinor, 10_000_000);
  assert.equal(first.grossActualCostMinor, 700_000);
  assert.equal(first.activityResultMinor, 9_300_000);
  assert.equal(first.confirmedNetProfitMinor, null);
  assert.deepEqual(
    first.lineage.filter((item) => item.kind === "ACTUAL_COST").map((item) => item.entryId),
    [1, 2],
  );

  assert.equal(second.earnedIncomeMinor, 12_000_000);
  assert.equal(second.grossActualCostMinor, 600_000);
  assert.equal(second.activityResultMinor, 11_400_000);
  assert.equal(second.confirmedNetProfitMinor, null);
  assert.deepEqual(
    second.lineage.filter((item) => item.kind === "ACTUAL_COST").map((item) => item.entryId),
    [4],
  );
});

test("agreement-only income remains uncounted for a vehicle without direct income attribution", () => {
  const fixture = financeFixture();
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    ...PERIOD,
    shifts: fixture.shifts,
    incomeLines: [{
      hakedisId: 2011,
      invoiceId: 3011,
      agreementId: 201,
      amountMinor: 10_000_000,
      currencyCode: "TRY",
      ...PERIOD,
    }],
    costEntries: [],
  });

  assert.equal(summary.earnedIncomeMinor, null);
  assert.equal(summary.incomeEvidence[0].counted, false);
  assert.equal(summary.incomeEvidence[0].relationStatus, "AGREEMENT_VEHICLE_RELATION_NOT_PROVEN");
  assert.ok(summary.blockers.includes("EARNED_INCOME_VEHICLE_RELATION_MISSING"));
});
