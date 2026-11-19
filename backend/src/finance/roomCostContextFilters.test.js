import test from "node:test";
import assert from "node:assert/strict";
import { buildRoomCostEntryWhere, classifyFutureActualEntries } from "./roomCostLedger.js";

test("room cost read scope keeps shift and agreement as source context, not ledger filters", () => {
  const where = buildRoomCostEntryWhere(1, {
    vehicleId: "1",
    shiftId: "301",
    agreementId: "196",
    includeSalary: true,
  }, { includeSalary: true });

  assert.equal(where.roomId, 1);
  assert.deepEqual(where.AND, [
    {
      OR: [
        { vehicleId: 1 },
        { allocationLines: { some: { OR: [{ vehicleId: 1 }, { shift: { vehicleId: 1 } }] } } },
      ],
    },
  ]);
  assert.equal(Object.hasOwn(where, "shiftId"), false);
  assert.equal(Object.hasOwn(where, "agreementId"), false);
  assert.deepEqual(where.lifecycle, { not: "CANCELLED" });
});

test("vehicle scope includes driver-owned cost allocated to a shift of that vehicle", () => {
  const where = buildRoomCostEntryWhere(1, {
    vehicleId: "1",
    includeSalary: true,
  }, { includeSalary: true });

  const scope = where.AND?.[0];
  assert.deepEqual(scope?.OR, [
    { vehicleId: 1 },
    { allocationLines: { some: { OR: [{ vehicleId: 1 }, { shift: { vehicleId: 1 } }] } } },
  ]);
});

test("room cost period scope includes one-off occurredAt rows alongside overlapping periodic rows", () => {
  const where = buildRoomCostEntryWhere(1, {
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    recordKind: "ACTUAL",
    includeSalary: true,
  }, { includeSalary: true });

  assert.ok(Array.isArray(where.OR));
  assert.ok(where.OR.some((candidate) => candidate.occurredAt?.gte && candidate.occurredAt?.lte));
  assert.ok(where.OR.some((candidate) => candidate.periodStart?.lte && candidate.periodEnd?.gte));
});

test("future confirmed actual entries are classified as planning without changing their amount", () => {
  const [entry] = classifyFutureActualEntries([
    {
      id: 365,
      recordKind: "ACTUAL",
      lifecycle: "CONFIRMED",
      amountMinor: 120000,
      periodStart: new Date("2026-11-03T00:00:00.000Z"),
      periodEnd: new Date("2026-11-09T00:00:00.000Z"),
    },
  ], { asOfDate: new Date("2026-10-31T00:00:00.000Z") });

  assert.equal(entry.recordKind, "FORECAST");
  assert.equal(entry.originalRecordKind, "ACTUAL");
  assert.equal(entry.amountMinor, 120000);
});
