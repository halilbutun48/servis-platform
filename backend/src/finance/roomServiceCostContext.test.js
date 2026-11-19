import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOperationalCoverageSummary,
  buildVehicleMonthDecisionSummary,
  filterServiceCostEntriesForContext,
  operationalFilterFromQuery,
  operationalFilterScopeViolation,
  resolveServiceCostContext,
  selectedRoomMarketOffer,
  requiresExplicitServiceSelection,
  roomFocusShiftWhere,
  serviceCostSelectionFromQuery,
  serviceCostSelectionFromPayload,
  serviceCostShiftWhere,
} from "./roomServiceCostContext.js";

test("operational coverage keeps verified usage separate from unknown monthly scope", () => {
  const coverage = buildOperationalCoverageSummary({
    subjectKind: "VEHICLE",
    subjectId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    shifts: [
      {
        id: 350,
        roomId: 1,
        vehicleId: 1,
        status: "DONE",
        startAt: "2026-12-10T08:00:00.000Z",
        endAt: "2026-12-10T10:00:00.000Z",
      },
      {
        id: 318,
        roomId: 1,
        vehicleId: 1,
        status: "APPROVED",
        startAt: "2026-12-11T08:00:00.000Z",
        endAt: "2026-12-11T16:00:00.000Z",
      },
    ],
  });

  assert.equal(coverage.status, "UNKNOWN");
  assert.equal(coverage.verifiedUsageMinutes, 120);
  assert.deepEqual(coverage.verifiedUsageShiftIds, [350]);
  assert.equal(coverage.verifiedIdleMinutes, null);
  assert.equal(coverage.unknownScope, true);
  assert.equal(coverage.coverageComplete, false);
});

test("normal service-cost context only considers shifts with positive validated route evidence", () => {
  assert.deepEqual(serviceCostShiftWhere(1, {}), {
    roomId: 1,
    status: { in: ["APPROVED", "ACTIVE", "SPLIT"] },
    routeSnapshotValidatedAt: { not: null },
    routeSnapshotDistanceM: { gt: 0 },
    routeSnapshotDurationSec: { gt: 0 },
  });
});

test("explicit shift focus remains exact and market shifts require the ROOM offer", () => {
  const expected = {
    id: 257,
    status: { not: "DRAFT" },
    OR: [
      { roomId: 1 },
      {
        roomId: null,
        offers: {
          some: {
            roomId: 1,
            status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] },
          },
        },
      },
    ],
  };
  assert.deepEqual(serviceCostShiftWhere(1, { shiftId: 257 }), expected);
  assert.deepEqual(roomFocusShiftWhere({ roomId: 1, focusShiftId: 257 }), expected);
});

test("driver and vehicle filters remain tenant-scoped and can be combined", () => {
  assert.deepEqual(serviceCostSelectionFromQuery({
    focusVehicleId: "1",
    focusDriverId: "2",
    focusPeriodStart: "2026-09-01",
    focusPeriodEnd: "2026-09-30",
  }), {
    offerId: null,
    vehicleId: 1,
    driverId: 2,
    shiftId: null,
    agreementId: null,
  });

  assert.deepEqual(serviceCostShiftWhere(1, { driverId: 2 }), {
    roomId: 1,
    driverId: 2,
    status: { in: ["APPROVED", "ACTIVE", "SPLIT"] },
    routeSnapshotValidatedAt: { not: null },
    routeSnapshotDistanceM: { gt: 0 },
    routeSnapshotDurationSec: { gt: 0 },
  });

  assert.deepEqual(serviceCostShiftWhere(1, { vehicleId: 1, driverId: 2 }), {
    roomId: 1,
    vehicleId: 1,
    driverId: 2,
    status: { in: ["APPROVED", "ACTIVE", "SPLIT"] },
  });
});

test("teklif odaklı finans kapsamı teklif kimliğini API seçiminde korur", () => {
  assert.deepEqual(serviceCostSelectionFromQuery({
    focusOfferId: "13",
    focusShiftId: "16",
  }), {
    offerId: 13,
    vehicleId: null,
    driverId: null,
    shiftId: 16,
    agreementId: null,
  });
  assert.deepEqual(serviceCostSelectionFromPayload({
    serviceContext: { offerId: "13", shiftId: "16" },
  }), {
    offerId: 13,
    vehicleId: null,
    driverId: null,
    shiftId: 16,
    agreementId: null,
  });
});

test("service-cost context requirement blocks an implicit latest service", () => {
  const selection = serviceCostSelectionFromQuery({ serviceCostContextRequired: "true" });
  assert.equal(selection.contextRequired, true);
  assert.equal(requiresExplicitServiceSelection(selection), true);
  assert.equal(requiresExplicitServiceSelection({ contextRequired: true, shiftId: 257 }), false);
  assert.equal(requiresExplicitServiceSelection({ contextRequired: true, offerId: 13 }), false);
});

test("missing service context does not dereference an absent market shift", () => {
  assert.equal(selectedRoomMarketOffer(null, 1), null);
  assert.deepEqual(selectedRoomMarketOffer({
    roomId: null,
    agreementId: null,
    offers: [{ roomId: 1, status: "OPEN" }],
  }, 1), { roomId: 1, status: "OPEN" });
  assert.equal(selectedRoomMarketOffer({
    roomId: 1,
    agreementId: null,
    offers: [{ roomId: 1, status: "OPEN" }],
  }, 1), null);
});

test("operational filters fail closed when the selected owner is outside the ROOM tenant", () => {
  assert.deepEqual(operationalFilterScopeViolation({
    selection: { vehicleId: 6, driverId: null },
    vehicle: null,
    driver: null,
  }), {
    code: "ROOM_OPERATIONAL_FILTER_SCOPE_FORBIDDEN",
    field: "vehicle",
  });

  assert.equal(operationalFilterScopeViolation({
    selection: { vehicleId: 1, driverId: 1 },
    vehicle: { id: 1, roomId: 1 },
    driver: { id: 1, roomId: 1 },
  }), null);
});

test("realized operational filter excludes approved planning shifts", () => {
  assert.deepEqual(operationalFilterFromQuery({
    filterVehicleId: "1",
    filterDriverId: "2",
    filterPeriodStart: "2026-09-01",
    filterPeriodEnd: "2026-09-30",
  }), {
    vehicleId: 1,
    driverId: 2,
  });

  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    driverId: 2,
    realizedOnly: true,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    shifts: [
      { id: 710, roomId: 1, vehicleId: 1, driverId: 2, agreementId: 195, status: "DONE", startAt: "2026-09-10T08:00:00.000Z", endAt: "2026-09-10T10:00:00.000Z" },
      { id: 711, roomId: 1, vehicleId: 1, driverId: 2, agreementId: 195, status: "APPROVED", startAt: "2026-09-11T08:00:00.000Z", endAt: "2026-09-11T10:00:00.000Z" },
    ],
    incomeLines: [],
    costEntries: [],
  });

  assert.deepEqual(summary.shiftIds, [710]);
  assert.equal(summary.realizedShiftCount, 1);
  assert.equal(summary.verifiedUsageMinutes, 120);
});

test("realized operational filter excludes future DONE shifts from the as-of day", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    driverId: 1,
    realizedOnly: true,
    asOfDate: "2026-10-31",
    periodStart: "2026-10-01",
    periodEnd: "2026-11-30",
    shifts: [
      {
        id: 310,
        roomId: 1,
        vehicleId: 1,
        driverId: 1,
        agreementId: 195,
        status: "DONE",
        startAt: "2026-10-30T08:00:00.000Z",
        endAt: "2026-10-30T10:00:00.000Z",
      },
      {
        id: 342,
        roomId: 1,
        vehicleId: 1,
        driverId: 1,
        agreementId: 197,
        status: "DONE",
        startAt: "2026-11-01T08:00:00.000Z",
        endAt: "2026-11-01T10:00:00.000Z",
      },
    ],
    incomeLines: [],
    costEntries: [],
  });

  assert.deepEqual(summary.shiftIds, [310]);
  assert.equal(summary.realizedShiftCount, 1);
  assert.equal(summary.verifiedUsageMinutes, 120);
  assert.deepEqual(summary.operationalCoverage.vehicle.verifiedUsageShiftIds, [310]);
});

test("planning summary does not relate future DONE work to realized income", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    driverId: 1,
    realizedOnly: false,
    asOfDate: "2026-10-31",
    periodStart: "2026-10-01",
    periodEnd: "2026-11-30",
    shifts: [{
      id: 342,
      roomId: 1,
      vehicleId: 1,
      driverId: 1,
      agreementId: 197,
      status: "DONE",
      startAt: "2026-11-01T08:00:00.000Z",
      endAt: "2026-11-01T10:00:00.000Z",
    }],
    incomeLines: [{
      agreementId: 197,
      amountMinor: 4_000_000,
      currencyCode: "TRY",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
    }],
    costEntries: [],
  });

  assert.equal(summary.earnedIncomeMinor, null);
  assert.equal(summary.incomeEvidence[0].counted, false);
});

test("selected shift cost scope excludes agreement costs allocated to another shift", () => {
  const entries = [
    {
      id: 274,
      agreementId: 196,
      shiftId: 258,
      allocation: "DIRECT",
      amountMinor: 260000,
      allocationLines: [{ agreementId: 196, shiftId: 258, allocatedAmountMinor: 260000 }],
    },
    {
      id: 275,
      agreementId: null,
      shiftId: null,
      allocation: "COUNT_IN_ROLLUP",
      amountMinor: 500000,
      allocationLines: [{ agreementId: 196, shiftId: 258, allocatedAmountMinor: 500000 }],
    },
    {
      id: 276,
      agreementId: 198,
      shiftId: 276,
      allocation: "DIRECT",
      amountMinor: 320000,
      allocationLines: [{ agreementId: 198, shiftId: 276, allocatedAmountMinor: 320000 }],
    },
  ];

  assert.deepEqual(
    filterServiceCostEntriesForContext(
      entries,
      { agreementId: 196, shiftId: 301 },
      { includePending: true, targetShift: { id: 301, agreementId: 196, roomId: 1 } },
    ).map((entry) => entry.id),
    [],
  );
  assert.deepEqual(
    filterServiceCostEntriesForContext(entries, { agreementId: 198, shiftId: 276 }).map((entry) => entry.id),
    [276],
  );
});

test("selected service keeps a shared agreement allocation without a fabricated shift", () => {
  const entries = [
    {
      id: 277,
      agreementId: null,
      shiftId: null,
      allocation: "COUNT_IN_ROLLUP",
      amountMinor: 600000,
      allocationLines: [{ agreementId: 196, shiftId: null, allocatedAmountMinor: 600000 }],
    },
    {
      id: 278,
      agreementId: null,
      shiftId: null,
      allocation: "COUNT_IN_ROLLUP",
      amountMinor: 400000,
      allocationLines: [{ agreementId: 196, shiftId: 302, allocatedAmountMinor: 400000 }],
    },
  ];

  assert.deepEqual(
    filterServiceCostEntriesForContext(entries, { agreementId: 196, shiftId: 301 }).map((entry) => entry.id),
    [277],
  );
});

test("pending agreement-owned rollup remains visible until shift allocation exists", () => {
  const entries = [{
    id: 279,
    agreementId: 196,
    shiftId: null,
    allocation: "COUNT_IN_ROLLUP",
    amountMinor: 500000,
    allocationLines: [],
  }];

  assert.deepEqual(
    filterServiceCostEntriesForContext(
      entries,
      { agreementId: 196, shiftId: 301 },
      { includePending: true },
    ).map((entry) => entry.id),
    [279],
  );
});

test("selected shift cost scope excludes an HGS entry owned by another agreement", () => {
  const entries = [{
    id: 13,
    agreementId: 2,
    shiftId: 3,
    vehicleId: 1,
    categoryKey: "HGS_TOLL",
    allocation: "DIRECT",
    amountMinor: 80000,
    allocationLines: [],
  }];

  assert.deepEqual(
    filterServiceCostEntriesForContext(
      entries,
      { agreementId: 1, shiftId: 3 },
      { targetShift: { id: 3, agreementId: 1, roomId: 1, vehicleId: 1 } },
    ).map((entry) => entry.id),
    [],
  );
});

test("pending periodic owner cost remains visible for a selected shift inside an agreement", () => {
  const entries = [
    {
      id: 321,
      roomId: 1,
      vehicleId: 1,
      driverId: 1,
      agreementId: null,
      shiftId: null,
      allocation: "COUNT_IN_ROLLUP",
      occurrenceKind: "PERIODIC",
      amountMinor: 3000000,
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      allocationLines: [],
    },
  ];

  assert.deepEqual(
    filterServiceCostEntriesForContext(
      entries,
      { agreementId: 195, shiftId: 257 },
      {
        includePending: true,
        targetShift: {
          id: 257,
          agreementId: 195,
          roomId: 1,
          vehicleId: 1,
          driverId: 1,
          startAt: "2026-09-15T08:00:00.000Z",
          endAt: "2026-09-15T16:00:00.000Z",
        },
      },
    ).map((entry) => entry.id),
    [321],
  );
});

test("same-day periodic owner cost remains visible for a shift later that day", () => {
  const entries = [
    {
      id: 330,
      roomId: 1,
      vehicleId: 3,
      driverId: null,
      agreementId: null,
      shiftId: null,
      allocation: "COUNT_IN_ROLLUP",
      occurrenceKind: "PERIODIC",
      amountMinor: 120000,
      periodStart: "2027-01-15",
      periodEnd: "2027-01-15",
      allocationLines: [],
    },
  ];

  assert.deepEqual(
    filterServiceCostEntriesForContext(
      entries,
      { agreementId: 203, shiftId: 324 },
      {
        includePending: true,
        targetShift: {
          id: 324,
          agreementId: 203,
          roomId: 1,
          vehicleId: 3,
          driverId: 2,
          startAt: "2027-01-15T04:00:00.000Z",
          endAt: "2027-01-15T06:00:00.000Z",
        },
      },
    ).map((entry) => entry.id),
    [330],
  );
});

test("same-day periodic owner cost from database dates remains visible for a later shift", () => {
  const entries = [
    {
      id: 330,
      roomId: 1,
      vehicleId: 3,
      driverId: null,
      agreementId: null,
      shiftId: null,
      allocation: "COUNT_IN_ROLLUP",
      occurrenceKind: "PERIODIC",
      amountMinor: 120000,
      periodStart: new Date("2027-01-15T00:00:00.000Z"),
      periodEnd: new Date("2027-01-15T00:00:00.000Z"),
      allocationLines: [],
    },
  ];

  assert.deepEqual(
    filterServiceCostEntriesForContext(
      entries,
      { agreementId: 203, shiftId: 324 },
      {
        includePending: true,
        targetShift: {
          id: 324,
          agreementId: 203,
          roomId: 1,
          vehicleId: 3,
          driverId: 2,
          startAt: new Date("2027-01-15T04:00:00.000Z"),
          endAt: new Date("2027-01-15T06:00:00.000Z"),
        },
      },
    ).map((entry) => entry.id),
    [330],
  );
});

test("tek seferlik araç gideri seçili başka bir vardiyaya dönemsel bekleyen gider olarak taşınmaz", () => {
  const entries = [
    {
      id: 348,
      roomId: 1,
      vehicleId: 1,
      driverId: null,
      agreementId: null,
      shiftId: null,
      allocation: "COUNT_IN_ROLLUP",
      occurrenceKind: "ONE_OFF",
      amountMinor: 850000,
      occurredAt: "2026-09-18",
      periodStart: null,
      periodEnd: null,
      allocationLines: [],
    },
  ];

  assert.deepEqual(
    filterServiceCostEntriesForContext(
      entries,
      { agreementId: 195, shiftId: 257 },
      {
        includePending: true,
        targetShift: {
          id: 257,
          agreementId: 195,
          roomId: 1,
          vehicleId: 1,
          driverId: 1,
          startAt: "2026-09-15T08:00:00.000Z",
          endAt: "2026-09-15T16:00:00.000Z",
        },
      },
    ).map((entry) => entry.id),
    [],
  );
});

test("operational reassignment keeps service context coherent when agreement vehicle is only the planned vehicle", () => {
  const result = resolveServiceCostContext({
    agreement: { id: 203, roomId: 1, vehicleId: 3 },
    shift: {
      id: 324,
      roomId: 1,
      agreementId: 203,
      vehicleId: 5,
      driverId: 4,
    },
    requestedVehicleId: 5,
  });

  assert.equal(result.coherent, true);
  assert.equal(result.reason, null);
  assert.equal(result.shift.vehicleId, 5);
  assert.equal(result.agreement.vehicleId, 3);
});

test("vehicle month summary keeps realized income and actual cost components distinct without double counting", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    shifts: [
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-10T08:00:00.000Z", endAt: "2026-12-10T16:00:00.000Z" },
    ],
    incomeLines: [
      { amountMinor: 16000000, currencyCode: "TRY", agreementId: 202, shiftId: 318, hakedisId: 190, invoiceId: 191, periodStart: "2026-12-01", periodEnd: "2026-12-31" },
    ],
    costEntries: [
      {
        id: 328,
        categoryKey: "FUEL",
        amountMinor: 210000,
        currencyCode: "TRY",
        lifecycle: "CONFIRMED",
        recordKind: "ACTUAL",
        allocation: "COUNT_IN_ROLLUP",
        vehicleId: 1,
        driverId: 1,
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        sourceRef: "M18-DECISION-F-REASSIGN-001",
        allocationLines: [{ id: 256, vehicleId: 1, driverId: 1, shiftId: 318, agreementId: 202, allocatedAmountMinor: 210000 }],
      },
      {
        id: 329,
        categoryKey: "BASE_SALARY",
        amountMinor: 500000,
        currencyCode: "TRY",
        lifecycle: "CONFIRMED",
        recordKind: "ACTUAL",
        allocation: "COUNT_IN_ROLLUP",
        driverId: 1,
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        sourceRef: "DECEMBER-DRIVER-COST-001",
        allocationLines: [],
      },
      {
        id: 330,
        categoryKey: "OPERATIONS_OVERHEAD",
        amountMinor: 900000,
        currencyCode: "TRY",
        lifecycle: "CONFIRMED",
        recordKind: "ACTUAL",
        allocation: "COUNT_IN_ROLLUP",
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        sourceRef: "DECEMBER-OVERHEAD-001",
        allocationLines: [],
      },
    ],
  });

  assert.equal(summary.status, "PROVISIONAL_ACTIVITY_RESULT");
  assert.equal(summary.earnedIncomeMinor, 16000000);
  assert.equal(summary.grossActualCostMinor, 710000);
  assert.equal(summary.activityResultMinor, 15290000);
  assert.equal(summary.confirmedNetProfitMinor, null);
  assert.equal(summary.costComponents.find((item) => item.categoryKey === "FUEL")?.amountMinor, 210000);
  assert.equal(summary.costComponents.find((item) => item.categoryKey === "BASE_SALARY")?.amountMinor, 500000);
  assert.equal(summary.costComponents.some((item) => item.categoryKey === "OPERATIONS_OVERHEAD"), false);
  assert.deepEqual(summary.unallocatedCostEntries.map((item) => item.entryId), [330]);
  assert.equal(summary.lineage.filter((item) => item.entryId === 328).length, 1);
  assert.ok(summary.blockers.includes("VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"));
});

test("month decision can be scoped to a driver and optional vehicle without counting other work", () => {
  const summary = buildVehicleMonthDecisionSummary({
    driverId: 2,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    shifts: [
      { id: 601, roomId: 1, vehicleId: 1, driverId: 2, agreementId: 195, status: "DONE", startAt: "2026-09-10T08:00:00.000Z", endAt: "2026-09-10T10:00:00.000Z" },
      { id: 602, roomId: 1, vehicleId: 3, driverId: 2, agreementId: 198, status: "DONE", startAt: "2026-09-11T08:00:00.000Z", endAt: "2026-09-11T11:00:00.000Z" },
      { id: 603, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 199, status: "DONE", startAt: "2026-09-12T08:00:00.000Z", endAt: "2026-09-12T12:00:00.000Z" },
    ],
    incomeLines: [
      { amountMinor: 100000, currencyCode: "TRY", agreementId: 195, hakedisId: 601, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      { amountMinor: 200000, currencyCode: "TRY", agreementId: 198, hakedisId: 602, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
    ],
    costEntries: [
      {
        id: 701,
        categoryKey: "EMPLOYER_MONTHLY_COST",
        amountMinor: 300000,
        currencyCode: "TRY",
        lifecycle: "CONFIRMED",
        recordKind: "ACTUAL",
        allocation: "COUNT_IN_ROLLUP",
        driverId: 2,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        allocationLines: [],
      },
      {
        id: 702,
        categoryKey: "FUEL",
        amountMinor: 90000,
        currencyCode: "TRY",
        lifecycle: "CONFIRMED",
        recordKind: "ACTUAL",
        allocation: "COUNT_IN_ROLLUP",
        vehicleId: 1,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        allocationLines: [{ vehicleId: 1, driverId: 2, shiftId: 601, agreementId: 195, allocatedAmountMinor: 90000 }],
      },
      {
        id: 703,
        categoryKey: "FUEL",
        amountMinor: 70000,
        currencyCode: "TRY",
        lifecycle: "CONFIRMED",
        recordKind: "ACTUAL",
        allocation: "COUNT_IN_ROLLUP",
        vehicleId: 3,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        allocationLines: [{ vehicleId: 3, driverId: 2, shiftId: 602, agreementId: 198, allocatedAmountMinor: 70000 }],
      },
      {
        id: 704,
        categoryKey: "FUEL",
        amountMinor: 80000,
        currencyCode: "TRY",
        lifecycle: "CONFIRMED",
        recordKind: "ACTUAL",
        allocation: "COUNT_IN_ROLLUP",
        vehicleId: 1,
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        allocationLines: [{ vehicleId: 1, driverId: 1, shiftId: 603, agreementId: 199, allocatedAmountMinor: 80000 }],
      },
    ],
  });

  assert.equal(summary.driverId, 2);
  assert.equal(summary.vehicleId, null);
  assert.deepEqual(summary.shiftIds, [601, 602]);
  assert.deepEqual(summary.agreementIds, [195, 198]);
  assert.equal(summary.earnedIncomeMinor, 300000);
  assert.equal(summary.grossActualCostMinor, 460000);
  assert.equal(summary.costComponents.find((item) => item.categoryKey === "FUEL")?.amountMinor, 160000);
  assert.equal(summary.lineage.some((item) => item.entryId === 704), false);

  const combined = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    driverId: 2,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    shifts: [
      { id: 601, roomId: 1, vehicleId: 1, driverId: 2, agreementId: 195, status: "DONE", startAt: "2026-09-10T08:00:00.000Z", endAt: "2026-09-10T10:00:00.000Z" },
      { id: 602, roomId: 1, vehicleId: 3, driverId: 2, agreementId: 198, status: "DONE", startAt: "2026-09-11T08:00:00.000Z", endAt: "2026-09-11T11:00:00.000Z" },
    ],
    incomeLines: [],
    costEntries: [],
  });
  assert.deepEqual(combined.shiftIds, [601]);
});

test("periodic owner costs keep monthly coverage unknown without inventing idle capacity", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    accountingPeriodClosed: true,
    shifts: [
      { id: 350, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 206, status: "DONE", startAt: "2026-12-10T08:00:00.000Z", endAt: "2026-12-10T10:00:00.000Z" },
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-11T08:00:00.000Z", endAt: "2026-12-11T16:00:00.000Z" },
    ],
    incomeLines: [
      { amountMinor: 16000000, currencyCode: "TRY", agreementId: 206, shiftId: 350, hakedisId: 190, invoiceId: 191, periodStart: "2026-12-01", periodEnd: "2026-12-31" },
    ],
    costEntries: [{
      id: 351,
      categoryKey: "BASE_SALARY",
      amountMinor: 2900000,
      currencyCode: "TRY",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      driverId: 1,
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
      allocationLines: [{ shiftId: 350, driverId: 1, allocatedAmountMinor: 2900000 }],
      vatMode: "NOT_APPLICABLE",
      vatClassification: "OUT_OF_SCOPE",
      vatEvidenceRef: "VAT-NOT-APPLICABLE-351",
      vatClassificationReason: "Yetkili değerlendirme.",
    }],
  });

  assert.equal(summary.operationalCoverage.vehicle.verifiedUsageMinutes, 120);
  assert.equal(summary.operationalCoverage.vehicle.verifiedIdleMinutes, null);
  assert.equal(summary.operationalCoverage.vehicle.unknownScope, true);
  assert.equal(summary.operationalCoverage.drivers[0].verifiedUsageMinutes, 120);
  assert.ok(summary.blockers.includes("OPERATIONAL_COVERAGE_NOT_PROVEN"));
  assert.equal(summary.confirmedNetProfitMinor, null);
  assert.equal(summary.grossActualCostMinor, 2900000);
});

test("driver monthly coverage aggregates verified work across vehicles without proving the full month", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    driverId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    accountingPeriodClosed: true,
    shifts: [
      { id: 350, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 206, status: "DONE", startAt: "2026-12-15T18:00:00.000Z", endAt: "2026-12-15T20:00:00.000Z" },
      { id: 348, roomId: 1, vehicleId: 5, driverId: 1, agreementId: 205, status: "DONE", startAt: "2026-12-16T12:00:00.000Z", endAt: "2026-12-16T16:00:00.000Z" },
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-17T06:30:00.000Z", endAt: "2026-12-17T08:30:00.000Z" },
    ],
    incomeLines: [],
    costEntries: [{
      id: 351,
      categoryKey: "BASE_SALARY",
      amountMinor: 2900000,
      currencyCode: "TRY",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      occurrenceKind: "PERIODIC",
      allocation: "COUNT_IN_ROLLUP",
      driverId: 1,
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
      allocationLines: [
        { shiftId: 350, driverId: 1, vehicleId: 1, allocatedAmountMinor: 966666 },
        { shiftId: 348, driverId: 1, vehicleId: 5, allocatedAmountMinor: 1933334 },
      ],
      vatMode: "NOT_APPLICABLE",
      vatClassification: "OUT_OF_SCOPE",
      vatEvidenceRef: "VAT-NOT-APPLICABLE-351",
      vatClassificationReason: "Yetkili değerlendirme.",
    }],
  });

  const driverCoverage = summary.operationalCoverage.drivers.find((item) => item.subjectId === 1);
  assert.equal(driverCoverage.verifiedUsageMinutes, 360);
  assert.deepEqual(driverCoverage.verifiedUsageShiftIds, [350, 348]);
  assert.equal(driverCoverage.coverageComplete, false);
  assert.equal(driverCoverage.unknownScope, true);
  assert.ok(summary.blockers.includes("OPERATIONAL_COVERAGE_NOT_PROVEN"));
  assert.equal(summary.confirmedNetProfitMinor, null);
  assert.equal(summary.grossActualCostMinor, 966666);
  assert.equal(summary.distributedActualCostMinor, 966666);
  assert.equal(summary.lineage.filter((item) => item.entryId === 351).length, 1);
});

test("driver coverage can use the tenant-period read set without widening selected vehicle economics", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    driverId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    shifts: [
      { id: 350, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 206, status: "DONE", startAt: "2026-12-15T18:00:00.000Z", endAt: "2026-12-15T20:00:00.000Z" },
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-17T06:30:00.000Z", endAt: "2026-12-17T08:30:00.000Z" },
    ],
    coverageShifts: [
      { id: 350, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 206, status: "DONE", startAt: "2026-12-15T18:00:00.000Z", endAt: "2026-12-15T20:00:00.000Z" },
      { id: 348, roomId: 1, vehicleId: 5, driverId: 1, agreementId: 205, status: "DONE", startAt: "2026-12-16T12:00:00.000Z", endAt: "2026-12-16T16:00:00.000Z" },
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-17T06:30:00.000Z", endAt: "2026-12-17T08:30:00.000Z" },
    ],
    incomeLines: [],
    costEntries: [],
  });

  assert.equal(summary.operationalCoverage.vehicle.verifiedUsageMinutes, 120);
  assert.equal(summary.operationalCoverage.drivers[0].verifiedUsageMinutes, 360);
  assert.deepEqual(summary.shiftIds, [350, 318]);
});

test("vehicle month summary treats an exact shift-owned direct cost as distributed", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    shifts: [
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-10T08:00:00.000Z", endAt: "2026-12-10T16:00:00.000Z" },
    ],
    incomeLines: [
      { amountMinor: 16000000, currencyCode: "TRY", agreementId: 202, shiftId: 318, hakedisId: 190, invoiceId: 191, periodStart: "2026-12-01", periodEnd: "2026-12-31" },
    ],
    costEntries: [{
      id: 401,
      categoryKey: "HGS_TOLL",
      amountMinor: 80000,
      currencyCode: "TRY",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      allocation: "DIRECT",
      vehicleId: 1,
      shiftId: 318,
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
      vatMode: "NOT_APPLICABLE",
      allocationLines: [],
    }],
  });

  assert.equal(summary.grossActualCostMinor, 80000);
  assert.equal(summary.distributedActualCostMinor, 80000);
  assert.equal(summary.pendingAllocationAmountMinor, 0);
  assert.deepEqual(summary.pendingAllocationEntryIds, []);
  assert.equal(summary.lineage.find((item) => item.entryId === 401)?.distributedAmountMinor, 80000);
});

test("vehicle month summary never treats a contract offer as earned vehicle income", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    shifts: [
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-10T08:00:00.000Z", endAt: "2026-12-10T16:00:00.000Z" },
    ],
    incomeLines: [],
    costEntries: [{
      id: 328,
      categoryKey: "FUEL",
      amountMinor: 210000,
      currencyCode: "TRY",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      allocation: "COUNT_IN_ROLLUP",
      vehicleId: 1,
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
      allocationLines: [{ vehicleId: 1, shiftId: 318, allocatedAmountMinor: 210000 }],
    }],
  });

  assert.equal(summary.earnedIncomeMinor, null);
  assert.equal(summary.activityResultMinor, null);
  assert.equal(summary.confirmedNetProfitMinor, null);
  assert.equal(summary.status, "NOT_PROVEN");
  assert.ok(summary.missing.includes("earnedIncomeEvidence"));
});

test("vehicle month summary keeps missing actual cost evidence unknown instead of zero", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    shifts: [
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-10T08:00:00.000Z", endAt: "2026-12-10T16:00:00.000Z" },
    ],
    incomeLines: [],
    costEntries: [],
  });

  assert.equal(summary.grossActualCostMinor, null);
  assert.equal(summary.distributedActualCostMinor, null);
  assert.equal(summary.activityResultMinor, null);
  assert.ok(summary.missing.includes("actualCostEvidence"));
});

test("vehicle month summary refuses to allocate agreement income across multiple vehicles without evidence", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    shifts: [
      { id: 318, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 202, status: "APPROVED", startAt: "2026-12-10T08:00:00.000Z", endAt: "2026-12-10T16:00:00.000Z" },
      { id: 319, roomId: 1, vehicleId: 2, driverId: 2, agreementId: 202, status: "APPROVED", startAt: "2026-12-11T08:00:00.000Z", endAt: "2026-12-11T16:00:00.000Z" },
    ],
    incomeLines: [{ amountMinor: 16000000, currencyCode: "TRY", agreementId: 202, hakedisId: 190, periodStart: "2026-12-01", periodEnd: "2026-12-31" }],
    costEntries: [],
  });

  assert.equal(summary.status, "NOT_PROVEN");
  assert.equal(summary.earnedIncomeMinor, null);
  assert.ok(summary.blockers.includes("EARNED_INCOME_VEHICLE_RELATION_AMBIGUOUS"));
  assert.equal(summary.incomeEvidence[0].counted, false);
});

test("vehicle month summary refuses agreement-only income even when one related shift uses the selected vehicle", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    accountingPeriodClosed: true,
    shifts: [
      { id: 3, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 1, status: "DONE", startAt: "2026-09-15T06:00:00.000Z", endAt: "2026-09-15T14:00:00.000Z" },
    ],
    incomeLines: [{ amountMinor: 14000000, currencyCode: "TRY", agreementId: 1, hakedisId: 3, invoiceId: 3, periodStart: "2026-09-01", periodEnd: "2026-09-30" }],
    costEntries: [],
  });

  assert.equal(summary.earnedIncomeMinor, null);
  assert.equal(summary.incomeEvidence[0].counted, false);
  assert.equal(summary.incomeEvidence[0].relationStatus, "AGREEMENT_VEHICLE_RELATION_NOT_PROVEN");
  assert.ok(summary.blockers.includes("EARNED_INCOME_VEHICLE_RELATION_MISSING"));
});

test("vehicle month summary never calls a merely complete open period confirmed net profit", () => {
  const summary = buildVehicleMonthDecisionSummary({
    vehicleId: 1,
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    accountingPeriodClosed: false,
    shifts: [
      { id: 401, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 195, status: "APPROVED", startAt: "2026-10-10T08:00:00.000Z", endAt: "2026-10-10T16:00:00.000Z" },
    ],
    incomeLines: [
      { amountMinor: 14000000, currencyCode: "TRY", agreementId: 195, shiftId: 401, hakedisId: 191, invoiceId: 176, periodStart: "2026-10-01", periodEnd: "2026-10-31" },
    ],
    costEntries: [{
      id: 501,
      categoryKey: "FUEL",
      amountMinor: 100000,
      currencyCode: "TRY",
      lifecycle: "CONFIRMED",
      recordKind: "ACTUAL",
      allocation: "DIRECT",
      vehicleId: 1,
      shiftId: 401,
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      vatMode: "NOT_APPLICABLE",
      vatClassification: "OUT_OF_SCOPE",
      vatEvidenceRef: "VAT-NOT-APPLICABLE-501",
      vatClassificationReason: "Belge ve yetkili muhasebe değerlendirmesi.",
      allocationLines: [],
    }],
  });

  assert.equal(summary.activityResultMinor, 13900000);
  assert.equal(summary.confirmedNetProfitMinor, null);
  assert.ok(summary.blockers.includes("ACCOUNTING_PERIOD_NOT_CLOSED"));
});
