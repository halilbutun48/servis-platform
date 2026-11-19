import assert from "node:assert/strict";
import test from "node:test";

import * as allocation from "./roomCostAllocation.js";
import * as ledger from "./roomCostLedger.js";
import {
  autoAllocateCostByCanonicalUsage,
  automaticallyAllocatePeriodicFuelAfterConfirmation,
  automaticallyAllocatePeriodicVehicleCostAfterConfirmation,
  correctConfirmedCostInTransaction,
  inferDefaultAllocation,
  invalidateAutomaticAllocationsForShiftReassignment,
  upsertAllocationLine,
} from "./roomCostLedger.js";

function periodicCost(overrides = {}) {
  return {
    id: 225,
    roomId: 1,
    categoryKey: "MAINTENANCE",
    amountMinor: 180_000,
    currencyCode: "TRY",
    vatMode: "UNKNOWN",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    lifecycle: "CONFIRMED",
    periodStart: "2026-09-01T00:00:00.000Z",
    periodEnd: "2026-09-30T00:00:00.000Z",
    occurredAt: "2026-09-30T00:00:00.000Z",
    vehicleId: 1,
    agreementId: 191,
    allocationLines: [],
    sourceRef: "DEMO-MAINTENANCE-SEP",
    ...overrides,
  };
}

function makeAllocationFixture({ allocation = "COUNT_IN_ROLLUP", recordKind = "ACTUAL" } = {}) {
  const entry = {
    id: 225,
    roomId: 1,
    categoryId: 1,
    amountMinor: 180_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind,
    allocation,
    category: { id: 1, roomId: 1, key: "MAINTENANCE" },
    vehicleId: 1,
    driverId: null,
    agreementId: 191,
    sourceRef: "DEMO-MAINTENANCE-SEP",
    allocationLines: [],
  };
  const lines = [];
  const transactionCalls = [];
  let nextId = 1;
  const relations = {
    vehicle: { id: 1, roomId: 1, plate: "34ABC123" },
    driver: { id: 1, roomId: 1, fullName: "Driver One" },
    agreement: { id: 191, roomId: 1 },
    shift216: { id: 216, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 191 },
    shift217: { id: 217, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 191 },
    shiftDifferentVehicle: { id: 218, roomId: 1, vehicleId: 2, driverId: 1, agreementId: 191 },
    shift219: { id: 219, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 192 },
  };
  const client = {
    $transaction: async (callback, options) => {
      transactionCalls.push(options || null);
      return callback(client);
    },
    roomCostEntry: {
      findFirst: async ({ where }) => (where.roomId === 1 && where.id === 225 ? { ...entry, allocationLines: [...lines] } : null),
    },
    roomCostCategory: {
      findFirst: async ({ where }) => (where.roomId === 1 && (where.id === 1 || where.key === "MAINTENANCE") ? entry.category : null),
    },
    vehicle: { findFirst: async ({ where }) => where.roomId !== 1 ? null : (where.id === 1 ? relations.vehicle : null) },
    driver: { findFirst: async ({ where }) => where.roomId !== 1 ? null : (where.id === 1 ? relations.driver : null) },
    agreement: { findFirst: async ({ where }) => where.roomId !== 1 ? null : (where.id === 191 ? relations.agreement : null) },
    shift: {
      findFirst: async ({ where }) => {
        if (where.roomId !== 1) return null;
        return relations[`shift${where.id}`] || (where.id === 218 ? relations.shiftDifferentVehicle : null) || null;
      },
    },
    roomCostAllocationLine: {
      findUnique: async ({ where }) => {
        const key = where.roomId_entryId_lineageKey;
        return lines.find((line) => line.roomId === key.roomId && line.entryId === key.entryId && line.lineageKey === key.lineageKey) || null;
      },
      upsert: async ({ where, create, update }) => {
        const key = where.roomId_entryId_lineageKey;
        const current = lines.find((line) => line.roomId === key.roomId && line.entryId === key.entryId && line.lineageKey === key.lineageKey);
        if (current) {
          Object.assign(current, update);
          return current;
        }
        const created = { id: nextId++, ...create };
        lines.push(created);
        return created;
      },
    },
  };
  return { client, lines, relations, transactionCalls };
}

test("allocation bütçesi aynı kaynak giderin toplam payını aşmasını reddeder", () => {
  assert.equal(typeof allocation.validateAllocationLineBudget, "function");

  assert.throws(
    () => allocation.validateAllocationLineBudget({
      sourceAmountMinor: 180_000,
      existingLines: [{ id: 1, lineageKind: "REFERENCE", allocatedAmountMinor: 120_000 }],
      nextLineId: null,
      nextAmountMinor: 70_000,
      lineageKind: "REFERENCE",
    }),
    (error) => error.code === "ALLOCATION_TOTAL_EXCEEDS_SOURCE",
  );
});

test("sahipli dönemsel gerçekleşmiş gider varsayılan olarak vardiya kullanım havuzuna girer", () => {
  assert.equal(inferDefaultAllocation({ recordKind: "ACTUAL", vehicleId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30" }), "COUNT_IN_ROLLUP");
  assert.equal(inferDefaultAllocation({ recordKind: "ACTUAL", driverId: 1, shiftId: null }), "COUNT_IN_ROLLUP");
  assert.equal(inferDefaultAllocation({ recordKind: "ACTUAL", vehicleId: 1, shiftId: 257 }), "DIRECT");
  assert.equal(inferDefaultAllocation({ recordKind: "BUDGET", vehicleId: 1 }), "DIRECT");
  assert.equal(inferDefaultAllocation({ recordKind: "ACTUAL", vehicleId: 1, allocation: "DIRECT" }), "DIRECT");
});

test("canonical vardiya saatleriyle ortak dönemsel gideri ağırlıklı ve tam dağıtır", () => {
  assert.equal(typeof allocation.buildWeightedUsageAllocationPlan, "function");

  const result = allocation.buildWeightedUsageAllocationPlan({
    sourceAmountMinor: 3_000_000,
    usageRows: [
      { shiftId: 257, agreementId: 195, quantity: "8", unit: "HOUR" },
      { shiftId: 276, agreementId: 198, quantity: "8", unit: "HOUR" },
      { shiftId: 278, agreementId: 199, quantity: "8", unit: "HOUR" },
    ],
  });

  assert.equal(result.status, "READY");
  assert.equal(result.totalUsageQuantity, "24");
  assert.deepEqual(result.shares.map((share) => share.allocatedAmountMinor), [1_000_000, 1_000_000, 1_000_000]);
  assert.equal(result.allocatedAmountMinor, 3_000_000);
  assert.equal(result.unallocatedAmountMinor, 0);
});

test("canonical kullanım kanıtı yoksa dönemsel gideri vardiyalara zorla dağıtmaz", () => {
  const result = allocation.buildWeightedUsageAllocationPlan({
    sourceAmountMinor: 3_000_000,
    usageRows: [],
  });

  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.allocatedAmountMinor, 0);
  assert.equal(result.unallocatedAmountMinor, 3_000_000);
  assert.ok(result.missing.includes("canonical vardiya kullanım kanıtı"));
});

test("yakıt dağıtımı doğrulanmış rota ve varsa kanıtlı boş kilometreyi kullanır", () => {
  assert.equal(typeof allocation.buildCanonicalFuelUsageRow, "function");

  const result = allocation.buildCanonicalFuelUsageRow({
    entryId: 450,
    periodStart: "2026-09-01T00:00:00.000Z",
    periodEnd: "2026-09-30T00:00:00.000Z",
    shift: {
      id: 257,
      vehicleId: 1,
      driverId: 1,
      agreementId: 195,
      routeSnapshotDistanceM: 12_500,
      routeSnapshotValidatedAt: new Date("2026-09-15T00:00:00.000Z"),
      emptyDistanceKm: 2.5,
      emptyDistanceEvidenceRef: "EMPTY-KM-257",
      emptyDistanceReason: "Depo dönüşü doğrulanmış kayıt",
    },
  });

  assert.equal(result.status, "READY");
  assert.equal(result.row.unit, "KM");
  assert.equal(result.row.quantity, 15);
  assert.match(result.row.evidenceRef, /ROUTE_KM/);
  assert.match(result.row.evidenceRef, /EMPTY-KM-257/);
});

test("yakıt dağıtımı doğrulanmış rota kilometresi yoksa güvenli biçimde bekler", () => {
  const result = allocation.buildCanonicalFuelUsageRow({
    entryId: 451,
    shift: {
      id: 276,
      vehicleId: 1,
      driverId: 1,
      agreementId: 198,
      routeSnapshotDistanceM: null,
    },
  });

  assert.equal(result.status, "INCOMPLETE");
  assert.deepEqual(result.missing, ["doğrulanmış rota kilometresi"]);
});

test("sürücü maliyeti vardiyanın gerçek çalışma süresini saat olarak kanıtlar", () => {
  assert.equal(typeof allocation.buildCanonicalDriverUsageRow, "function");

  const result = allocation.buildCanonicalDriverUsageRow({
    entryId: 452,
    periodStart: "2026-09-01T00:00:00.000Z",
    periodEnd: "2026-09-30T00:00:00.000Z",
    shift: {
      id: 701,
      roomId: 1,
      vehicleId: 3,
      driverId: 7,
      agreementId: 205,
      status: "DONE",
      startAt: new Date("2026-09-10T06:00:00.000Z"),
      endAt: new Date("2026-09-10T08:00:00.000Z"),
    },
  });

  assert.equal(result.status, "READY");
  assert.equal(result.row.unit, "HOUR");
  assert.equal(result.row.quantity, 2);
  assert.equal(result.row.vehicleId, 3);
  assert.equal(result.row.driverId, 7);
  assert.match(result.row.evidenceRef, /SHIFT_DURATION:452:701/);
});

test("sürücü maliyeti farklı araç ve COMPANY vardiyalarına doğrulanmış süreyle paylaştırılır", async () => {
  const created = [];
  const audits = [];
  const entry = {
    id: 452,
    roomId: 1,
    amountMinor: 2_900_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "EMPLOYER_MONTHLY_COST" },
    vehicleId: null,
    driverId: 7,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "AUTO-DRIVER-HOUR-452",
    allocationLines: [],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        { id: 701, roomId: 1, vehicleId: 3, driverId: 7, agreementId: 205, status: "DONE", startAt: new Date("2026-09-10T06:00:00.000Z"), endAt: new Date("2026-09-10T08:00:00.000Z") },
        { id: 702, roomId: 1, vehicleId: 5, driverId: 7, agreementId: 206, status: "DONE", startAt: new Date("2026-09-11T06:00:00.000Z"), endAt: new Date("2026-09-11T14:00:00.000Z") },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  const result = await autoAllocateCostByCanonicalUsage({ actor: { id: 3, role: "ROOM", roomId: 1 }, roomId: 1, entryId: 452, prisma });
  assert.equal(result.plan.status, "READY");
  assert.equal(result.plan.totalUsageQuantity, "10");
  assert.deepEqual(created.map((line) => line.unit), ["HOUR", "HOUR"]);
  assert.deepEqual(created.map((line) => line.quantity), ["2", "8"]);
  assert.deepEqual(created.map((line) => line.allocatedAmountMinor), [580_000, 2_320_000]);
  assert.deepEqual(created.map((line) => [line.vehicleId, line.driverId, line.agreementId]), [[3, 7, 205], [5, 7, 206]]);
  assert.equal(audits[0].meta.usageUnit, "HOUR");
  assert.equal(result.plan.unallocatedAmountMinor, 0);
});

test("sürücü aylık maliyeti onaylanınca yalnız gerçekleşmiş vardiyalara otomatik dağılır", async () => {
  const created = [];
  const audits = [];
  const entry = {
    id: 454,
    roomId: 1,
    amountMinor: 2_900_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "EMPLOYER_MONTHLY_COST" },
    vehicleId: null,
    driverId: 7,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "AUTO-DRIVER-CONFIRM-454",
    allocationLines: [],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        { id: 704, roomId: 1, vehicleId: 3, driverId: 7, agreementId: 205, status: "DONE", startAt: new Date("2026-09-10T06:00:00.000Z"), endAt: new Date("2026-09-10T08:00:00.000Z") },
        { id: 705, roomId: 1, vehicleId: 5, driverId: 7, agreementId: 206, status: "ACTIVE", startAt: new Date("2026-09-11T06:00:00.000Z"), endAt: new Date("2026-09-11T14:00:00.000Z") },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  assert.equal(typeof ledger.automaticallyAllocatePeriodicDriverAfterConfirmation, "function");
  const result = await ledger.automaticallyAllocatePeriodicDriverAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 454,
    prisma,
  });
  assert.equal(result.status, "READY");
  assert.deepEqual(created.map((line) => line.shiftId), [704]);
  assert.equal(created[0].allocatedAmountMinor, 2_900_000);
  assert.equal(audits[0].action, "ROOM_COST_ALLOCATION_AUTO_REBUILT");
});

test("sürücü vardiyasının gerçek çalışma süresi kanıtlanmıyorsa pay uydurmaz", () => {
  const result = allocation.buildCanonicalDriverUsageRow({
    entryId: 453,
    periodStart: "2026-09-01T00:00:00.000Z",
    periodEnd: "2026-09-30T00:00:00.000Z",
    shift: {
      id: 703,
      roomId: 1,
      vehicleId: 3,
      driverId: 7,
      agreementId: 205,
      status: "APPROVED",
      startAt: new Date("2026-09-12T06:00:00.000Z"),
      endAt: new Date("2026-09-12T08:00:00.000Z"),
    },
  });

  assert.equal(result.status, "INCOMPLETE");
  assert.ok(result.missing.includes("tamamlanmış çalışma süresi"));
});

test("sözleşme bağlantısı eksik tamamlanmış sürücü vardiyası aylık maliyeti güvenle bekletir", async () => {
  let requestedWhere = null;
  let deletedWhere = null;
  const audits = [];
  const entry = {
    id: 455,
    roomId: 1,
    amountMinor: 2_900_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "EMPLOYER_MONTHLY_COST" },
    vehicleId: null,
    driverId: 7,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "AUTO-DRIVER-INCOMPLETE-455",
    allocationLines: [{
      id: 990,
      lineageKey: "AUTO_USAGE:455:SHIFT:706",
      shiftId: 706,
      vehicleId: 3,
      driverId: 7,
      allocatedAmountMinor: 2_900_000,
    }],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async ({ where }) => {
        requestedWhere = where;
        return [
          { id: 706, roomId: 1, vehicleId: 3, driverId: 7, agreementId: 205, status: "DONE", startAt: new Date("2026-09-10T06:00:00.000Z"), endAt: new Date("2026-09-10T08:00:00.000Z") },
          { id: 707, roomId: 1, vehicleId: 5, driverId: 7, agreementId: null, status: "DONE", startAt: new Date("2026-09-11T06:00:00.000Z"), endAt: new Date("2026-09-11T14:00:00.000Z") },
        ];
      },
    },
    roomCostAllocationLine: {
      deleteMany: async ({ where }) => {
        deletedWhere = where;
        return { count: 1 };
      },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  const result = await ledger.automaticallyAllocatePeriodicDriverAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 455,
    prisma,
  });

  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.unallocatedAmountMinor, 2_900_000);
  assert.equal(requestedWhere.agreementId, undefined, "driver usage must inspect DONE shifts before requiring a service agreement");
  assert.ok(result.missing.includes("müşteri/sözleşme bağlantısı"));
  assert.deepEqual(deletedWhere, {
    roomId: 1,
    entryId: 455,
    lineageKey: { startsWith: "AUTO_USAGE:455:" },
  });
  assert.equal(audits[0].action, "ROOM_COST_ALLOCATION_AUTO_INVALIDATED_INCOMPLETE_USAGE");
  assert.deepEqual(audits[0].meta.invalidatedAutomaticLineIds, [990]);
});

test("otomatik canonical kullanım dağıtımı vardiya satırlarını tek kaynaktan yeniden kurar", async () => {
  const created = [];
  const audits = [];
  const entry = {
    id: 400,
    roomId: 1,
    amountMinor: 3_000_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "MAINTENANCE" },
    vehicleId: 1,
    driverId: 1,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "AUTO-ALLOCATION-400",
    allocationLines: [],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        { id: 257, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 195, startAt: new Date("2026-09-15T06:00:00.000Z"), endAt: new Date("2026-09-15T14:00:00.000Z") },
        { id: 276, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 198, startAt: new Date("2026-09-17T06:00:00.000Z"), endAt: new Date("2026-09-17T14:00:00.000Z") },
        { id: 278, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 199, startAt: new Date("2026-09-18T06:00:00.000Z"), endAt: new Date("2026-09-18T14:00:00.000Z") },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  const result = await autoAllocateCostByCanonicalUsage({ actor: { id: 3, role: "ROOM", roomId: 1 }, roomId: 1, entryId: 400, prisma });
  assert.equal(result.plan.status, "READY");
  assert.deepEqual(created.map((line) => line.allocatedAmountMinor), [1_000_000, 1_000_000, 1_000_000]);
  assert.equal(created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), 3_000_000);
  assert.deepEqual(created.map((line) => line.shiftId), [257, 276, 278]);
  assert.equal(audits[0].action, "ROOM_COST_ALLOCATION_AUTO_REBUILT");
});

test("periyodik yakıt gideri rota kilometresiyle COMPANY vardiyalarına paylaştırılır", async () => {
  const created = [];
  const audits = [];
  const entry = {
    id: 450,
    roomId: 1,
    amountMinor: 1_000_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "FUEL" },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "AUTO-FUEL-KM-450",
    allocationLines: [],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        { id: 501, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 195, startAt: new Date("2026-09-15T06:00:00.000Z"), endAt: new Date("2026-09-15T14:00:00.000Z"), routeSnapshotDistanceM: 10_000, routeSnapshotValidatedAt: new Date("2026-09-15T00:00:00.000Z"), emptyDistanceKm: 0, emptyDistanceEvidenceRef: null, emptyDistanceReason: null },
        { id: 502, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 198, startAt: new Date("2026-09-17T06:00:00.000Z"), endAt: new Date("2026-09-17T14:00:00.000Z"), routeSnapshotDistanceM: 30_000, routeSnapshotValidatedAt: new Date("2026-09-17T00:00:00.000Z"), emptyDistanceKm: 0, emptyDistanceEvidenceRef: null, emptyDistanceReason: null },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  const result = await autoAllocateCostByCanonicalUsage({ actor: { id: 3, role: "ROOM", roomId: 1 }, roomId: 1, entryId: 450, prisma });
  assert.equal(result.plan.status, "READY");
  assert.equal(result.plan.totalUsageQuantity, "40");
  assert.deepEqual(created.map((line) => line.unit), ["KM", "KM"]);
  assert.deepEqual(created.map((line) => line.quantity), ["10", "30"]);
  assert.deepEqual(created.map((line) => line.allocatedAmountMinor), [250_000, 750_000]);
  assert.equal(created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), entry.amountMinor);
  assert.equal(audits[0].meta.usageUnit, "KM");
});

function vehicleKilometerCostFixture(categoryKey, amountMinor, entryId) {
  const created = [];
  const audits = [];
  const entry = {
    id: entryId,
    roomId: 1,
    amountMinor,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: categoryKey },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: `AUTO-${categoryKey}-${entryId}`,
    allocationLines: [],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        { id: 701, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 195, status: "DONE", startAt: new Date("2026-09-15T06:00:00.000Z"), endAt: new Date("2026-09-15T14:00:00.000Z"), routeSnapshotDistanceM: 10_000, routeSnapshotValidatedAt: new Date("2026-09-15T00:00:00.000Z"), emptyDistanceKm: null, emptyDistanceEvidenceRef: null, emptyDistanceReason: null },
        { id: 702, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 198, status: "DONE", startAt: new Date("2026-09-17T06:00:00.000Z"), endAt: new Date("2026-09-17T14:00:00.000Z"), routeSnapshotDistanceM: 30_000, routeSnapshotValidatedAt: new Date("2026-09-17T00:00:00.000Z"), emptyDistanceKm: null, emptyDistanceEvidenceRef: null, emptyDistanceReason: null },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };
  return { created, audits, entry, prisma };
}

function vehicleFixedCostFixture(categoryKey, amountMinor, entryId) {
  const created = [];
  const audits = [];
  const entry = {
    id: entryId,
    roomId: 1,
    amountMinor,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: categoryKey },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: `AUTO-${categoryKey}-HOUR-${entryId}`,
    allocationLines: [],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        { id: 801, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 195, status: "DONE", startAt: new Date("2026-09-15T06:00:00.000Z"), endAt: new Date("2026-09-15T14:00:00.000Z") },
        { id: 802, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 198, status: "DONE", startAt: new Date("2026-09-17T06:00:00.000Z"), endAt: new Date("2026-09-17T10:00:00.000Z") },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };
  return { created, audits, entry, prisma };
}

test("araç kirası onaylandığında doğrulanmış çalışma saatleriyle otomatik paylaştırılır", async () => {
  const fixture = vehicleFixedCostFixture("RENT", 2_400_00, 463);
  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 463,
    prisma: fixture.prisma,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.plan.totalUsageQuantity, "12");
  assert.deepEqual(fixture.created.map((line) => line.unit), ["HOUR", "HOUR"]);
  assert.deepEqual(fixture.created.map((line) => line.quantity), ["8", "4"]);
  assert.deepEqual(fixture.created.map((line) => line.allocatedAmountMinor), [1_600_00, 800_00]);
  assert.equal(fixture.created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), fixture.entry.amountMinor);
  assert.equal(fixture.audits[0].meta.usageUnit, "HOUR");
});

test("trafik sigortası aynı sabit araç kullanım yolunu kullanır", async () => {
  const fixture = vehicleFixedCostFixture("TRAFFIC_INSURANCE", 3_600_00, 464);
  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 464,
    prisma: fixture.prisma,
  });

  assert.equal(result.status, "READY");
  assert.deepEqual(fixture.created.map((line) => line.allocatedAmountMinor), [2_400_00, 1_200_00]);
  assert.equal(fixture.created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), fixture.entry.amountMinor);
});

test("kasko aynı sabit araç kullanım yoluyla dönem maliyetini otomatik dağıtır", async () => {
  const fixture = vehicleFixedCostFixture("CASCO", 4_800_00, 468);
  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 468,
    prisma: fixture.prisma,
  });

  assert.equal(result.status, "READY");
  assert.deepEqual(fixture.created.map((line) => line.unit), ["HOUR", "HOUR"]);
  assert.deepEqual(fixture.created.map((line) => line.allocatedAmountMinor), [3_200_00, 1_600_00]);
  assert.equal(fixture.created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), fixture.entry.amountMinor);
});

test("muayene dönemli gerçek gideri aynı sabit araç kullanım yoluyla dağıtır", async () => {
  const fixture = vehicleFixedCostFixture("INSPECTION", 1_200_00, 469);
  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 469,
    prisma: fixture.prisma,
  });

  assert.equal(result.status, "READY");
  assert.deepEqual(fixture.created.map((line) => line.allocatedAmountMinor), [800_00, 400_00]);
  assert.equal(fixture.created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), fixture.entry.amountMinor);
});

test("tek müşterili dönem aracı kendiliğinden özel tahsis sayılmaz; sabit gider vardiya kanıtına bağlı kalır", async () => {
  const fixture = vehicleFixedCostFixture("RENT", 2_000_00, 466);
  fixture.prisma.shift.findMany = async () => [{
    id: 804,
    roomId: 1,
    vehicleId: 1,
    driverId: 1,
    agreementId: 195,
    status: "DONE",
    startAt: new Date("2026-10-10T06:00:00.000Z"),
    endAt: new Date("2026-10-10T14:00:00.000Z"),
  }];

  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 466,
    prisma: fixture.prisma,
  });

  assert.equal(result.status, "READY");
  assert.equal(fixture.created.length, 1);
  assert.equal(fixture.created[0].targetKind, "SHIFT");
  assert.equal(fixture.created[0].vehicleId, 1);
  assert.equal(fixture.created[0].agreementId, 195);
  assert.equal(fixture.created[0].allocatedAmountMinor, fixture.entry.amountMinor);
  assert.equal(Object.prototype.hasOwnProperty.call(fixture.created[0], "specialAssignment"), false);
  assert.equal(fixture.audits[0].meta.usageUnit, "HOUR");
});

test("sabit araç giderinde çalışma süresi kanıtı eksikse kaynak gider güvenle bekler", async () => {
  const fixture = vehicleFixedCostFixture("RENT", 2_000_00, 465);
  fixture.prisma.shift.findMany = async () => [{
    id: 803,
    roomId: 1,
    vehicleId: 1,
    driverId: 1,
    agreementId: 195,
    status: "DONE",
    startAt: new Date("2026-09-19T06:00:00.000Z"),
    endAt: null,
  }];

  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 465,
    prisma: fixture.prisma,
  });

  assert.equal(result.status, "INCOMPLETE");
  assert.ok(result.missing.includes("tamamlanmış çalışma süresi"));
  assert.equal(result.unallocatedAmountMinor, fixture.entry.amountMinor);
  assert.equal(fixture.created.length, 0);
});

test("bakım gideri onaylandığında doğrulanmış kilometrelerle otomatik paylaştırılır", async () => {
  const fixture = vehicleKilometerCostFixture("MAINTENANCE", 1_000_000, 460);
  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 460,
    prisma: fixture.prisma,
  });
  assert.equal(result.status, "READY");
  assert.equal(result.plan.totalUsageQuantity, "40");
  assert.deepEqual(fixture.created.map((line) => line.unit), ["KM", "KM"]);
  assert.deepEqual(fixture.created.map((line) => line.allocatedAmountMinor), [250_000, 750_000]);
  assert.equal(fixture.created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), fixture.entry.amountMinor);
  assert.equal(fixture.audits[0].meta.usageUnit, "KM");
});

test("15.000 TL bakım gideri yalnız sahibi aracın kanıtlı iki servisine dağılır ve diğer aracı etkilemez", async () => {
  const created = [];
  const audits = [];
  const entry = {
    id: 467,
    roomId: 1,
    amountMinor: 1_500_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "MAINTENANCE" },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "ISOLATED-MAINTENANCE-15000-467",
    allocationLines: [],
  };
  const shifts = [
    { id: 901, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 191, status: "DONE", startAt: new Date("2026-09-10T06:00:00.000Z"), endAt: new Date("2026-09-10T14:00:00.000Z"), routeSnapshotDistanceM: 10_000, routeSnapshotValidatedAt: new Date("2026-09-10T00:00:00.000Z") },
    { id: 902, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 192, status: "DONE", startAt: new Date("2026-09-12T06:00:00.000Z"), endAt: new Date("2026-09-12T14:00:00.000Z"), routeSnapshotDistanceM: 30_000, routeSnapshotValidatedAt: new Date("2026-09-12T00:00:00.000Z") },
    { id: 903, roomId: 1, vehicleId: 2, driverId: 2, agreementId: 193, status: "DONE", startAt: new Date("2026-09-13T06:00:00.000Z"), endAt: new Date("2026-09-13T14:00:00.000Z"), routeSnapshotDistanceM: 100_000, routeSnapshotValidatedAt: new Date("2026-09-13T00:00:00.000Z") },
  ];
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async ({ where }) => {
        assert.equal(where.roomId, 1);
        assert.equal(where.vehicleId, 1, "dağıtım kaynağının sahibi araç filtresi korunmalı");
        return shifts.filter((shift) => shift.vehicleId === where.vehicleId);
      },
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: entry.id,
    prisma,
  });

  assert.equal(result.status, "READY");
  assert.deepEqual(
    created.map((line) => [line.vehicleId, line.agreementId, line.allocatedAmountMinor]),
    [[1, 191, 375_000], [1, 192, 1_125_000]],
  );
  assert.equal(created.some((line) => line.vehicleId === 2), false);
  assert.equal(created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), entry.amountMinor);
  assert.equal(audits[0].meta.allocatedAmountMinor, entry.amountMinor);

  const source = {
    ...entry,
    categoryKey: "MAINTENANCE",
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "UNKNOWN",
    allocationLines: created,
  };
  const service191 = allocation.buildCostAllocationProjection([source], {
    requireServiceAllocationEvidence: true,
    targetAgreementId: 191,
  });
  const service192 = allocation.buildCostAllocationProjection([source], {
    requireServiceAllocationEvidence: true,
    targetAgreementId: 192,
  });
  assert.equal(service191.grossAmountMinor, 375_000);
  assert.equal(service192.grossAmountMinor, 1_125_000);
  assert.equal(service191.grossAmountMinor + service192.grossAmountMinor, entry.amountMinor);
});

test("gider taslağı onayı canonical kaydı doğrular, otomatik dağıtır ve yeniden okunan servis payını korur", async () => {
  const entry = {
    id: 468,
    roomId: 1,
    categoryId: 1,
    amountMinor: 1_500_000,
    currencyCode: "TRY",
    lifecycle: "DRAFT",
    version: 1,
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { id: 1, roomId: 1, key: "MAINTENANCE", label: "Bakım" },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    shiftId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    occurredAt: new Date("2026-09-30T00:00:00.000Z"),
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "UNKNOWN",
    vatAmountMinor: null,
    vatEvidenceRef: "ISOLATED-VAT-EVIDENCE-468",
    vatClassificationReason: "İzole fixture belge kanıtı",
    allocationQuantity: null,
    allocationUnit: null,
    allocationUnitRateMinor: null,
    evidenceRef: "ISOLATED-MAINTENANCE-EVIDENCE-468",
    sourceRef: "ISOLATED-MAINTENANCE-15000-468",
    sourceType: "ISOLATED_FIXTURE",
    description: "İzole bakım gideri",
    isReversal: false,
    allocationLines: [],
  };
  const shifts = [
    { id: 911, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 191, status: "DONE", startAt: new Date("2026-09-10T06:00:00.000Z"), endAt: new Date("2026-09-10T14:00:00.000Z"), routeSnapshotDistanceM: 10_000, routeSnapshotValidatedAt: new Date("2026-09-10T00:00:00.000Z") },
    { id: 912, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 192, status: "DONE", startAt: new Date("2026-09-12T06:00:00.000Z"), endAt: new Date("2026-09-12T14:00:00.000Z"), routeSnapshotDistanceM: 30_000, routeSnapshotValidatedAt: new Date("2026-09-12T00:00:00.000Z") },
  ];
  const allocationLines = [];
  const auditRows = [];
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: {
      findFirst: async () => entry,
      findMany: async () => [entry],
      update: async ({ data }) => Object.assign(entry, data),
    },
    roomCostCategory: { findFirst: async () => entry.category },
    vehicle: { findFirst: async ({ where }) => where.roomId === 1 && where.id === 1 ? { id: 1, roomId: 1, plate: "34 ABC 123" } : null },
    driver: { findFirst: async ({ where }) => where.roomId === 1 && where.id === 1 ? { id: 1, roomId: 1, fullName: "Demo Sürücü" } : null },
    agreement: { findFirst: async ({ where }) => where.roomId === 1 && [191, 192].includes(where.id) ? { id: where.id, roomId: 1 } : null },
    shift: {
      findFirst: async ({ where }) => shifts.find((shift) => shift.roomId === where.roomId && shift.id === where.id) || null,
      findMany: async () => shifts,
    },
    roomCostAllocationLine: {
      deleteMany: async () => { allocationLines.splice(0); entry.allocationLines = allocationLines; return { count: 0 }; },
      createMany: async ({ data }) => { allocationLines.push(...data.map((line, index) => ({ id: index + 1, ...line }))); entry.allocationLines = allocationLines; return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { auditRows.push(data); return data; } },
  };

  const result = await ledger.confirmCostDraft({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    draftId: entry.id,
    version: 1,
    confirmation: { confirmed: true, token: "ISOLATED-FIXTURE-CONFIRM" },
    prisma,
    audit: async () => {},
  });

  assert.equal(entry.lifecycle, "CONFIRMED");
  assert.equal(result.automaticAllocation.status, "READY");
  assert.equal(allocationLines.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), entry.amountMinor);
  assert.equal(auditRows.some((row) => row.action === "ROOM_COST_ALLOCATION_AUTO_REBUILT"), true);

  const rereadForService = {
    ...entry,
    categoryKey: "MAINTENANCE",
    allocationLines,
  };
  const reread = allocation.buildCostAllocationProjection([rereadForService], {
    requireServiceAllocationEvidence: true,
    targetAgreementId: 192,
  });
  assert.equal(reread.grossAmountMinor, 1_125_000);
  assert.equal(reread.pendingAmountMinor, 375_000);
  assert.equal(reread.unallocatedAmountMinor, 0);
  assert.equal(reread.grossAmountMinor + reread.pendingAmountMinor, entry.amountMinor);
});

test("lastik gideri onaylandığında aynı kanonik kilometre motorunu kullanır", async () => {
  const fixture = vehicleKilometerCostFixture("TIRE_RIM", 700_000, 461);
  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 461,
    prisma: fixture.prisma,
  });
  assert.equal(result.status, "READY");
  assert.deepEqual(fixture.created.map((line) => line.allocatedAmountMinor), [175_000, 525_000]);
  assert.equal(fixture.created.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), fixture.entry.amountMinor);
  assert.equal(fixture.audits[0].meta.usageUnit, "KM");
});

test("kilometresi eksik bakım gideri güvenli biçimde araçta bekler", async () => {
  const fixture = vehicleKilometerCostFixture("MAINTENANCE", 600_000, 462);
  fixture.prisma.shift.findMany = async () => [{
    id: 703,
    roomId: 1,
    vehicleId: 1,
    driverId: 1,
    agreementId: 195,
    status: "DONE",
    startAt: new Date("2026-09-19T06:00:00.000Z"),
    endAt: new Date("2026-09-19T14:00:00.000Z"),
    routeSnapshotDistanceM: null,
  }];
  const result = await automaticallyAllocatePeriodicVehicleCostAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 462,
    prisma: fixture.prisma,
  });
  assert.equal(result.status, "INCOMPLETE");
  assert.deepEqual(result.missing, ["doğrulanmış rota kilometresi"]);
  assert.equal(result.unallocatedAmountMinor, fixture.entry.amountMinor);
  assert.equal(fixture.created.length, 0);
});

test("yakıt gideri onaylandığında ayrı dağıtım düğmesi olmadan otomatik dağıtım başlar", async () => {
  const created = [];
  const audits = [];
  const entry = {
    id: 451,
    roomId: 1,
    amountMinor: 600_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "FUEL" },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    shiftId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "AUTO-FUEL-CONFIRM-451",
    allocationLines: [],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        { id: 601, roomId: 1, vehicleId: 1, driverId: 1, agreementId: 195, startAt: new Date("2026-09-15T06:00:00.000Z"), endAt: new Date("2026-09-15T14:00:00.000Z"), routeSnapshotDistanceM: 20_000, routeSnapshotValidatedAt: new Date("2026-09-15T00:00:00.000Z"), emptyDistanceKm: null, emptyDistanceEvidenceRef: null, emptyDistanceReason: null },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  const result = await automaticallyAllocatePeriodicFuelAfterConfirmation({
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 451,
    prisma,
  });
  assert.equal(result.status, "READY");
  assert.equal(created.length, 1);
  assert.equal(created[0].unit, "KM");
  assert.equal(created[0].allocatedAmountMinor, 600_000);
  assert.equal(audits[0].action, "ROOM_COST_ALLOCATION_AUTO_REBUILT");
});

test("reassignment sonrası otomatik yeniden kurma eski vardiya paylarını audit lineage olarak korur", async () => {
  const created = [];
  const audits = [];
  const entry = {
    id: 401,
    roomId: 1,
    amountMinor: 2_000_000,
    currencyCode: "TRY",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
    allocation: "COUNT_IN_ROLLUP",
    category: { key: "MAINTENANCE" },
    vehicleId: 3,
    driverId: 3,
    agreementId: null,
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    sourceRef: "AUTO-ALLOCATION-401-REASSIGN",
    allocationLines: [
      {
        id: 901,
        lineageKey: "AUTO_USAGE:401:SHIFT:700",
        shiftId: 700,
        vehicleId: 1,
        driverId: 1,
        allocatedAmountMinor: 2_000_000,
      },
    ],
  };
  const prisma = {
    $transaction: async (callback) => callback(prisma),
    roomCostEntry: { findFirst: async () => entry },
    shift: {
      findMany: async () => [
        {
          id: 700,
          roomId: 1,
          vehicleId: 3,
          driverId: 3,
          agreementId: 205,
          startAt: new Date("2026-09-20T06:00:00.000Z"),
          endAt: new Date("2026-09-20T14:00:00.000Z"),
        },
      ],
    },
    roomCostAllocationLine: {
      deleteMany: async () => ({ count: 1 }),
      createMany: async ({ data }) => { created.push(...data); return { count: data.length }; },
    },
    auditLog: { create: async ({ data }) => { audits.push(data); return data; } },
  };

  const result = await autoAllocateCostByCanonicalUsage({ actor: { id: 3, role: "ROOM", roomId: 1 }, roomId: 1, entryId: 401, prisma });

  assert.equal(result.plan.status, "READY");
  assert.deepEqual(created.map((line) => line.shiftId), [700]);
  assert.deepEqual(created.map((line) => [line.vehicleId, line.driverId]), [[3, 3]]);
  assert.equal(audits[0].action, "ROOM_COST_ALLOCATION_AUTO_REBUILT");
  assert.deepEqual(audits[0].meta.previousAutomaticShiftIds, [700]);
  assert.deepEqual(audits[0].meta.previousAutomaticOwners, [{ vehicleId: 1, driverId: 1 }]);
});

test("vardiya yeniden atamasında eski otomatik payları etkisizleştirir ve audit lineage bırakır", async () => {
  const deleted = [];
  const audits = [];
  const tx = {
    roomCostAllocationLine: {
      findMany: async () => [
        {
          id: 257,
          entryId: 330,
          shiftId: 324,
          vehicleId: 3,
          driverId: 2,
          allocatedAmountMinor: 120_000,
          lineageKey: "AUTO_USAGE:330:SHIFT:324",
          sourceRef: "ALLOCATION_F_PERIODIC_FUEL_324_20270115",
        },
      ],
      deleteMany: async (args) => {
        deleted.push(args);
        return { count: 1 };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        audits.push(data);
        return data;
      },
    },
  };

  const result = await invalidateAutomaticAllocationsForShiftReassignment({
    tx,
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    shiftId: 324,
    from: { vehicleId: 3, driverId: 2 },
    to: { vehicleId: 5, driverId: 4 },
  });

  assert.equal(result.invalidatedCount, 1);
  assert.deepEqual(deleted, [{
    where: {
      roomId: 1,
      shiftId: 324,
      lineageKey: { startsWith: "AUTO_USAGE:" },
    },
  }]);
  assert.equal(audits[0].action, "ROOM_COST_ALLOCATION_INVALIDATED_BY_SHIFT_REASSIGN");
  assert.deepEqual(audits[0].meta.invalidatedLines, [{
    id: 257,
    entryId: 330,
    vehicleId: 3,
    driverId: 2,
    allocatedAmountMinor: 120_000,
    lineageKey: "AUTO_USAGE:330:SHIFT:324",
    sourceRef: "ALLOCATION_F_PERIODIC_FUEL_324_20270115",
  }]);
  assert.deepEqual(audits[0].meta.from, { vehicleId: 3, driverId: 2 });
  assert.deepEqual(audits[0].meta.to, { vehicleId: 5, driverId: 4 });
});

test("onaylı gider sahibi düzeltmesi eski otomatik payı yeni kayda kopyalamaz", async () => {
  const copiedLines = [];
  const source = {
    id: 402,
    roomId: 1,
    categoryId: 1,
    category: { id: 1, roomId: 1, key: "FUEL" },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    shiftId: null,
    occurredAt: new Date("2026-12-15T00:00:00.000Z"),
    periodStart: new Date("2026-12-01T00:00:00.000Z"),
    periodEnd: new Date("2026-12-31T00:00:00.000Z"),
    amountMinor: 200_000,
    currencyCode: "TRY",
    vatMode: "UNKNOWN",
    vatAmountMinor: null,
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    allocationQuantity: null,
    allocationUnit: null,
    allocationUnitRateMinor: null,
    evidenceRef: "M18-DECISION-F-402-EVIDENCE",
    sourceRef: "M18-DECISION-F-402",
    sourceType: "DEMO_ACCEPTANCE",
    description: "Dönemsel yakıt gideri",
    lifecycle: "CONFIRMED",
    version: 2,
    isReversal: false,
    allocationLines: [{
      id: 990,
      lineageKind: "REFERENCE",
      targetKind: "SHIFT",
      lineageKey: "AUTO_USAGE:402:SHIFT:318",
      vehicleId: 1,
      driverId: 1,
      agreementId: 202,
      shiftId: 318,
      periodStart: new Date("2026-12-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T00:00:00.000Z"),
      quantity: "2",
      unit: "HOUR",
      unitRateMinor: 100_000,
      allocatedAmountMinor: 200_000,
      currencyCode: "TRY",
      sourceRef: "M18-DECISION-F-402",
      evidenceRef: "CANONICAL_SHIFT_USAGE:402:318",
    }],
  };
  const auditRows = [];
  let createdCount = 0;
  const tx = {
    roomCostEntry: {
      findFirst: async () => source,
      findMany: async () => [],
      updateMany: async () => ({ count: 1 }),
      create: async ({ data }) => ({
        ...data,
        id: ++createdCount === 1 ? 403 : 404,
        category: source.category,
        allocationLines: [],
      }),
    },
    roomCostCategory: { findFirst: async () => source.category },
    vehicle: { findFirst: async ({ where }) => (where.id === 3 && where.roomId === 1 ? { id: 3, roomId: 1, plate: "34 ABC 124" } : null) },
    driver: { findFirst: async ({ where }) => (where.id === 2 && where.roomId === 1 ? { id: 2, roomId: 1, fullName: "AHMET ISKA" } : null) },
    agreement: { findFirst: async () => null },
    shift: { findFirst: async () => null },
    roomCostAllocationLine: {
      createMany: async ({ data }) => { copiedLines.push(...data); return { count: data.length }; },
      findMany: async () => [],
    },
    auditLog: {
      findMany: async () => [],
      create: async ({ data }) => { auditRows.push(data); return data; },
    },
  };

  const result = await correctConfirmedCostInTransaction({
    tx,
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 402,
    version: 2,
    input: { vehicleId: 3, driverId: 2 },
    correctionRef: "M18-DECISION-F-402-OWNER-CHANGE",
  });

  assert.equal(result.replacement.id, 404);
  assert.equal(copiedLines.length, 0, "otomatik satır yeniden allocation için kopyalanmamalıdır");
  assert.equal(auditRows[0].action, "ROOM_COST_CORRECTION_APPLIED");
});

test("önceki KDV düzeltme zinciri yeni auditli düzeltmeyi mükerrer kaynak sanmaz", async () => {
  const source = {
    id: 404,
    roomId: 1,
    categoryId: 1,
    category: { id: 1, roomId: 1, key: "OTHER_OPERATION" },
    vehicleId: null,
    driverId: null,
    agreementId: null,
    shiftId: null,
    occurredAt: new Date("2026-10-25T00:00:00.000Z"),
    periodStart: null,
    periodEnd: null,
    amountMinor: 125_000,
    currencyCode: "TRY",
    vatMode: "INCLUDED",
    vatAmountMinor: null,
    vatClassification: "DOCUMENTED_VAT",
    vatEvidenceRef: "KDV-001",
    vatClassificationReason: "Belge ve gerekçe doğrulandı.",
    recordKind: "ACTUAL",
    occurrenceKind: "ONE_OFF",
    allocation: "DIRECT",
    allocationQuantity: null,
    allocationUnit: null,
    allocationUnitRateMinor: null,
    evidenceRef: "EVIDENCE-001",
    sourceRef: "ROOM-ACCOUNTING-PART1-001",
    sourceType: null,
    description: "KDV düzeltme zinciri",
    lifecycle: "CONFIRMED",
    version: 1,
    isReversal: false,
    allocationLines: [],
  };
  const audits = [{
    entityId: 401,
    meta: {
      originalEntryId: 401,
      reversalEntryId: 403,
      replacementEntryId: 404,
      correctionRef: "ROOM-ACCOUNTING-PART1-001-REV1",
    },
  }];
  const auditRows = [];
  let createdId = 404;
  const tx = {
    roomCostEntry: {
      findFirst: async () => source,
      findMany: async ({ select } = {}) => select ? [{ id: 401 }, { id: 403 }, { id: 404 }] : [
        { id: 401, sourceRef: source.sourceRef },
        { id: 403, sourceRef: source.sourceRef },
        { id: 404, sourceRef: source.sourceRef },
      ],
      updateMany: async () => ({ count: 1 }),
      create: async ({ data }) => ({ ...data, id: ++createdId, category: source.category, allocationLines: [] }),
    },
    roomCostCategory: { findFirst: async () => source.category },
    vehicle: { findFirst: async () => null },
    driver: { findFirst: async () => null },
    agreement: { findFirst: async () => null },
    shift: { findFirst: async () => null },
    roomCostAllocationLine: { createMany: async () => ({ count: 0 }), findMany: async () => [] },
    auditLog: {
      findMany: async ({ where } = {}) => where?.entityId?.in ? audits : [],
      create: async ({ data }) => { auditRows.push(data); return data; },
    },
  };

  const result = await correctConfirmedCostInTransaction({
    tx,
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 404,
    version: 1,
    input: {
      vatEvidenceRef: "KDV-001-REV2",
      vatClassificationReason: "Belge referansı ikinci kez doğrulandı.",
    },
    correctionRef: "ROOM-ACCOUNTING-PART1-001-REV2",
  });

  assert.equal(result.replacement.id, 406);
  assert.equal(result.replacement.vatEvidenceRef, "KDV-001-REV2");
  assert.equal(auditRows[0].action, "ROOM_COST_CORRECTION_APPLIED");
});

test("rollup düzeltmesi kendi ters kayıt zincirini yeni kaynak dönemi sanmaz", async () => {
  const source = {
    id: 503,
    roomId: 1,
    categoryId: 1,
    category: { id: 1, roomId: 1, key: "FUEL" },
    vehicleId: 1,
    driverId: null,
    agreementId: null,
    shiftId: null,
    occurredAt: new Date("2026-09-18T00:00:00.000Z"),
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T00:00:00.000Z"),
    amountMinor: 850000,
    currencyCode: "TRY",
    vatMode: "UNKNOWN",
    vatAmountMinor: null,
    vatClassification: "UNKNOWN",
    vatDeductibility: "UNKNOWN",
    vatEvidenceRef: null,
    vatClassificationReason: null,
    recordKind: "ACTUAL",
    occurrenceKind: "PERIODIC",
    allocation: "COUNT_IN_ROLLUP",
    allocationQuantity: null,
    allocationUnit: null,
    allocationUnitRateMinor: null,
    evidenceRef: null,
    sourceRef: "ROOM-UI-ENTRY-4def5e04-1384-4c0d-820a-854adfa6472d",
    sourceType: null,
    description: null,
    lifecycle: "CONFIRMED",
    version: 1,
    isReversal: false,
    allocationLines: [],
  };
  const audits = [{
    entityId: 501,
    meta: { originalEntryId: 501, reversalEntryId: 502, replacementEntryId: 503, correctionRef: "ROOM-UI-ENTRY-REV1" },
  }];
  const auditRows = [];
  let createdId = 503;
  const tx = {
    roomCostEntry: {
      findFirst: async ({ where }) => where?.id === source.id ? source : null,
      findMany: async ({ where, select } = {}) => {
        if (select) return [{ id: 501 }, { id: 502 }, { id: 503 }];
        if (where?.sourceRef) return [
          { id: 501, sourceRef: source.sourceRef },
          { id: 502, sourceRef: source.sourceRef },
          { id: 503, sourceRef: source.sourceRef },
        ];
        return [];
      },
      updateMany: async () => ({ count: 1 }),
      create: async ({ data }) => ({ ...data, id: ++createdId, category: source.category, allocationLines: [] }),
    },
    roomCostCategory: { findFirst: async () => source.category },
    vehicle: { findFirst: async ({ where }) => where?.roomId === 1 && where?.id === 1 ? { id: 1, roomId: 1, plate: "34ABC123" } : null },
    driver: { findFirst: async () => null },
    agreement: { findFirst: async () => null },
    shift: { findFirst: async () => null },
    roomCostAllocationLine: { createMany: async () => ({ count: 0 }), findMany: async () => [] },
    auditLog: {
      findMany: async ({ where } = {}) => where?.entityId?.in ? audits : [],
      create: async ({ data }) => { auditRows.push(data); return data; },
    },
  };

  const result = await correctConfirmedCostInTransaction({
    tx,
    actor: { id: 3, role: "ROOM", roomId: 1 },
    roomId: 1,
    entryId: 503,
    version: 1,
    input: { vatClassificationReason: "KDV bilgisi daha sonra tamamlanacak." },
    correctionRef: "ROOM-UI-ENTRY-REV2",
  });

  assert.equal(result.replacement.id, 505);
  assert.equal(result.reversal.id, 504);
  assert.equal(auditRows[0].action, "ROOM_COST_CORRECTION_APPLIED");
});

test("allocation bütçesi aynı lineage satırını güncellerken kendi eski payını ikinci kez saymaz", () => {
  assert.equal(typeof allocation.validateAllocationLineBudget, "function");

  const result = allocation.validateAllocationLineBudget({
    sourceAmountMinor: 180_000,
    existingLines: [{ id: 1, lineageKind: "REFERENCE", allocatedAmountMinor: 120_000 }],
    nextLineId: 1,
    nextAmountMinor: 160_000,
    lineageKind: "REFERENCE",
  });

  assert.equal(result.totalAllocatedMinor, 160_000);
  assert.equal(result.remainingMinor, 20_000);
});

test("kanıtlı kullanım payı seçili vardiyaya düşer, başka vardiya payı dağıtım bekleyen sayılmaz", () => {
  const result = allocation.buildCostAllocationProjection([
    periodicCost({
      allocationLines: [
        { id: 1, roomId: 1, entryId: 225, lineageKind: "REFERENCE", targetKind: "SHIFT", shiftId: 216, agreementId: 191, allocatedAmountMinor: 100_000 },
        { id: 2, roomId: 1, entryId: 225, lineageKind: "REFERENCE", targetKind: "SHIFT", shiftId: 217, agreementId: 191, allocatedAmountMinor: 80_000 },
      ],
    }),
  ], {
    requireServiceAllocationEvidence: true,
    targetAgreementId: 191,
    targetShiftId: 216,
  });

  assert.equal(result.grossAmountMinor, 100_000);
  assert.equal(result.sourceScopeAmountMinor, 180_000);
  assert.equal(result.pendingAmountMinor, 80_000);
  assert.equal(result.unallocatedAmountMinor, 0);
  assert.equal(result.lines[0].serviceAllocationLines.length, 1);
  assert.equal(result.lines[0].serviceAllocationLines[0].shiftId, 216);
});

test("kullanım kanıtı yoksa dönemsel gider sıfırlanmaz ve dağıtım beklemede kalır", () => {
  const result = allocation.buildCostAllocationProjection([periodicCost()], {
    requireServiceAllocationEvidence: true,
    targetAgreementId: 191,
    targetShiftId: 216,
  });

  assert.equal(result.grossAmountMinor, null);
  assert.equal(result.sourceScopeAmountMinor, 180_000);
  assert.equal(result.pendingAmountMinor, 180_000);
  assert.equal(result.unallocatedAmountMinor, 180_000);
  assert.ok(result.missing.includes("selected shift allocationLines"));
});

test("şirket-genel tek seferlik gerçekleşmiş gider geçerli occurredAt ile maliyet toplamına dahil edilir", () => {
  const result = allocation.buildCostAllocationProjection([{
    id: 288,
    roomId: 1,
    categoryKey: "OPERATIONS_OVERHEAD",
    amountMinor: 400_000,
    currencyCode: "TRY",
    vatMode: "UNKNOWN",
    recordKind: "ACTUAL",
    occurrenceKind: "ONE_OFF",
    allocation: "COUNT_IN_ROLLUP",
    lifecycle: "CONFIRMED",
    occurredAt: "2026-10-25T00:00:00.000Z",
    periodStart: null,
    periodEnd: null,
    allocationLines: [],
    sourceRef: "QA-ROOM-PART2-OPERATIONS-OVERHEAD-001",
  }]);

  assert.equal(result.grossAmountMinor, 400_000);
  assert.equal(result.pendingAmountMinor, 0);
  assert.equal(result.lines[0].included, true);
  assert.deepEqual(result.lines[0].missing, []);
});

test("canonical allocation write keeps reference shares within the source and rejects a mismatched shift", async () => {
  const fixture = makeAllocationFixture();
  const actor = { id: 42, role: "ROOM", roomId: 1 };
  const baseInput = {
    lineageKind: "REFERENCE",
    targetKind: "SHIFT",
    vehicleId: 1,
    driverId: 1,
    agreementId: 191,
    shiftId: 216,
    quantity: "100",
    unit: "KM",
    unitRateMinor: "1000",
    allocatedAmountMinor: "100000",
    sourceRef: "DEMO-MAINTENANCE-SEP",
    evidenceRef: "ISOLATED-USAGE-216",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  };

  await upsertAllocationLine({ actor, roomId: 1, entryId: 225, input: { ...baseInput, lineageKey: "SHIFT:216" }, prisma: fixture.client, audit: async () => {} });
  await upsertAllocationLine({
    actor,
    roomId: 1,
    entryId: 225,
    input: { ...baseInput, lineageKey: "SHIFT:217", shiftId: 217, quantity: "80", allocatedAmountMinor: 80_000, evidenceRef: "ISOLATED-USAGE-217" },
    prisma: fixture.client,
    audit: async () => {},
  });
  await upsertAllocationLine({
    actor,
    roomId: 1,
    entryId: 225,
    input: { ...baseInput, lineageKey: "SHIFT:216", evidenceRef: "ISOLATED-USAGE-216-RETRY" },
    prisma: fixture.client,
    audit: async () => {},
  });
  assert.equal(fixture.lines.length, 2, "repeating the same lineage key must update one canonical line");
  assert.equal(fixture.lines.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), 180_000);
  assert.equal(fixture.transactionCalls.at(-1)?.isolationLevel, "Serializable");

  await assert.rejects(
    () => upsertAllocationLine({
      actor,
      roomId: 1,
      entryId: 225,
      input: { ...baseInput, lineageKey: "SHIFT:218", shiftId: 218, quantity: "1", allocatedAmountMinor: 1_000, evidenceRef: "ISOLATED-USAGE-218" },
      prisma: fixture.client,
      audit: async () => {},
    }),
    (error) => error.code === "ALLOCATION_TARGET_MISMATCH" || error.code === "ALLOCATION_TOTAL_EXCEEDS_SOURCE",
  );
});

test("confirmed forecast accepts only reference planning shares and remains idempotent", async () => {
  const fixture = makeAllocationFixture({ allocation: "DIRECT", recordKind: "FORECAST" });
  const actor = { id: 42, role: "ROOM", roomId: 1 };
  const baseInput = {
    lineageKind: "REFERENCE",
    targetKind: "SHIFT",
    vehicleId: 1,
    driverId: 1,
    agreementId: 191,
    shiftId: 216,
    quantity: "100",
    unit: "KM",
    unitRateMinor: "1000",
    allocatedAmountMinor: "100000",
    sourceRef: "DEMO-MAINTENANCE-SEP",
    evidenceRef: "FORECAST-USAGE-216",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  };

  await upsertAllocationLine({ actor, roomId: 1, entryId: 225, input: { ...baseInput, lineageKey: "SHIFT:216" }, prisma: fixture.client, audit: async () => {} });
  await upsertAllocationLine({
    actor,
    roomId: 1,
    entryId: 225,
    input: { ...baseInput, lineageKey: "SHIFT:217", shiftId: 217, quantity: "80", allocatedAmountMinor: 80_000, evidenceRef: "FORECAST-USAGE-217" },
    prisma: fixture.client,
    audit: async () => {},
  });
  await upsertAllocationLine({
    actor,
    roomId: 1,
    entryId: 225,
    input: { ...baseInput, lineageKey: "SHIFT:216", evidenceRef: "FORECAST-USAGE-216-RETRY" },
    prisma: fixture.client,
    audit: async () => {},
  });

  assert.equal(fixture.lines.length, 2);
  assert.equal(fixture.lines.reduce((sum, line) => sum + line.allocatedAmountMinor, 0), 180_000);
  await assert.rejects(
    () => upsertAllocationLine({
      actor,
      roomId: 1,
      entryId: 225,
      input: { ...baseInput, lineageKind: "COMPONENT", lineageKey: "COMPONENT:FORECAST", allocatedAmountMinor: 180_000 },
      prisma: fixture.client,
      audit: async () => {},
    }),
    (error) => error.code === "PLANNING_REFERENCE_REQUIRED",
  );
});

test("canonical allocation write rejects an actor or target outside the authenticated ROOM tenant", async () => {
  const fixture = makeAllocationFixture();
  await assert.rejects(
    () => upsertAllocationLine({
      actor: { id: 99, role: "ROOM", roomId: 2 },
      roomId: 1,
      entryId: 225,
      input: {
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        lineageKey: "SHIFT:216",
        shiftId: 216,
        agreementId: 191,
        allocatedAmountMinor: 1_000,
        sourceRef: "DEMO-MAINTENANCE-SEP",
        evidenceRef: "ISOLATED-TENANT-NEGATIVE",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
      },
      prisma: fixture.client,
      audit: async () => {},
    }),
    (error) => error.code === "ROOM_ACCESS_DENIED",
  );
  assert.equal(fixture.lines.length, 0);
});

test("usage evidence requires a measured share, canonical source and a bounded source period", () => {
  assert.throws(
    () => allocation.validateAllocationUsageEvidence({
      input: {
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        allocatedAmountMinor: 100_000,
        sourceRef: "DEMO-MAINTENANCE-SEP",
        evidenceRef: "ISOLATED-USAGE-216",
        periodStart: "2026-09-30",
        periodEnd: "2026-09-01",
        quantity: "",
        unit: "KM",
        unitRateMinor: null,
      },
      entry: {
        allocation: "COUNT_IN_ROLLUP",
        sourceRef: "DEMO-MAINTENANCE-SEP",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
      },
    }),
    (error) => error.code === "ALLOCATION_QUANTITY_REQUIRED",
  );

  assert.throws(
    () => allocation.validateAllocationUsageEvidence({
      input: {
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        allocatedAmountMinor: 100_000,
        sourceRef: "OTHER-SOURCE",
        evidenceRef: "ISOLATED-USAGE-216",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        quantity: "100",
        unit: "KM",
        unitRateMinor: 1000,
      },
      entry: {
        allocation: "COUNT_IN_ROLLUP",
        sourceRef: "DEMO-MAINTENANCE-SEP",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
      },
    }),
    (error) => error.code === "ALLOCATION_SOURCE_REF_MISMATCH",
  );

  assert.throws(
    () => allocation.validateAllocationUsageEvidence({
      input: {
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        allocatedAmountMinor: 100_000,
        sourceRef: "DEMO-MAINTENANCE-SEP",
        evidenceRef: "ISOLATED-USAGE-216",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        quantity: "100",
        unit: "KM",
        unitRateMinor: 1000,
      },
      entry: {
        allocation: "DIRECT",
        sourceRef: "DEMO-MAINTENANCE-SEP",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
      },
    }),
    (error) => error.code === "ALLOCATION_DIRECT_SOURCE_NOT_REQUIRED",
  );

  assert.throws(
    () => allocation.validateAllocationUsageEvidence({
      input: {
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        allocatedAmountMinor: 100_000,
        sourceRef: "DEMO-MAINTENANCE-SEP",
        evidenceRef: "ISOLATED-USAGE-216",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-31",
        quantity: "100",
        unit: "KM",
        unitRateMinor: 1000,
      },
      entry: { allocation: "COUNT_IN_ROLLUP", sourceRef: "DEMO-MAINTENANCE-SEP" },
    }),
    (error) => error.code === "ALLOCATION_PERIOD_INVALID",
  );

  const normalized = allocation.validateAllocationUsageEvidence({
    input: {
      lineageKind: "REFERENCE",
      targetKind: "SHIFT",
      allocatedAmountMinor: "100000",
      sourceRef: "DEMO-MAINTENANCE-SEP",
      evidenceRef: "ISOLATED-USAGE-216",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      quantity: "100",
      unit: "KM",
      unitRateMinor: "1000",
    },
    entry: {
      allocation: "COUNT_IN_ROLLUP",
      sourceRef: "DEMO-MAINTENANCE-SEP",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
    },
  });
  assert.equal(normalized.unitRateMinor, 1000);
  assert.equal(normalized.amountMinor, 100_000);
});

test("usage evidence cannot infer a shift's vehicle, driver or agreement from shiftId alone", async () => {
  const fixture = makeAllocationFixture();
  await assert.rejects(
    () => upsertAllocationLine({
      actor: { id: 42, role: "ROOM", roomId: 1 },
      roomId: 1,
      entryId: 225,
      input: {
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        lineageKey: "SHIFT:219",
        shiftId: 219,
        allocatedAmountMinor: 100_000,
        sourceRef: "DEMO-MAINTENANCE-SEP",
        evidenceRef: "ISOLATED-USAGE-219",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        quantity: "100",
        unit: "KM",
        unitRateMinor: 1000,
      },
      prisma: fixture.client,
      audit: async () => {},
    }),
    (error) => error.code === "ALLOCATION_TARGET_RELATIONS_REQUIRED" || error.code === "ALLOCATION_TARGET_MISMATCH",
  );
});

test("direct gider kaynakları kullanım payı endpoint'iyle yeniden dağıtılamaz", async () => {
  const fixture = makeAllocationFixture({ allocation: "DIRECT" });
  await assert.rejects(
    () => upsertAllocationLine({
      actor: { id: 42, role: "ROOM", roomId: 1 },
      roomId: 1,
      entryId: 225,
      input: {
        lineageKind: "REFERENCE",
        targetKind: "SHIFT",
        lineageKey: "SHIFT:216",
        vehicleId: 1,
        driverId: 1,
        agreementId: 191,
        shiftId: 216,
        allocatedAmountMinor: 100_000,
        sourceRef: "DEMO-MAINTENANCE-SEP",
        evidenceRef: "ISOLATED-DIRECT-NEGATIVE",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        quantity: "100",
        unit: "KM",
        unitRateMinor: 1000,
      },
      prisma: fixture.client,
      audit: async () => {},
    }),
    (error) => error.code === "ALLOCATION_DIRECT_SOURCE_NOT_REQUIRED",
  );
  assert.equal(fixture.lines.length, 0);
});
