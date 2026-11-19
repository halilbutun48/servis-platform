import assert from "node:assert/strict";
import test from "node:test";
import {
  listComputableRoomServiceCandidates,
  selectDefaultComputableRoomService,
} from "./roomFinanceDefaultContext.js";

test("normal ROOM finance opening selects the latest agreement's computable DONE service", () => {
  const context = selectDefaultComputableRoomService({
    referenceDate: "2026-10-30",
    agreements: [
      {
        id: 201,
        status: "APPROVED",
        startDate: "2026-10-26T00:00:00.000Z",
        endDate: "2026-10-31T23:59:59.000Z",
      },
      {
        id: 200,
        status: "APPROVED",
        startDate: "2026-11-01T00:00:00.000Z",
        endDate: "2026-11-30T23:59:59.000Z",
      },
    ],
    shifts: [
      {
        id: 311,
        agreementId: 201,
        status: "DONE",
        vehicleId: 6,
        driverId: 3,
        startAt: "2026-10-27T06:00:00.000Z",
        routeSnapshotDistanceM: 8200,
        routeSnapshotDurationSec: 900,
      },
      {
        id: 345,
        agreementId: 200,
        status: "APPROVED",
        vehicleId: 6,
        driverId: 3,
        startAt: "2026-11-02T06:00:00.000Z",
        routeSnapshotDistanceM: 8200,
        routeSnapshotDurationSec: 900,
      },
      {
        id: 343,
        agreementId: 200,
        status: "DONE",
        vehicleId: 6,
        driverId: 3,
        startAt: "2026-11-01T06:00:00.000Z",
        routeSnapshotDistanceM: 8200,
        routeSnapshotDurationSec: 900,
      },
    ],
  });

  assert.deepEqual(context, {
    agreementId: 200,
    shiftId: 343,
    vehicleId: 6,
    driverId: 3,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
  });
});

test("normal ROOM finance opening prefers the nearest upcoming period over a later future period", () => {
  const context = selectDefaultComputableRoomService({
    referenceDate: "2026-10-30",
    agreements: [
      { id: 204, status: "APPROVED", startDate: "2026-11-01", endDate: "2026-11-30" },
      { id: 205, status: "APPROVED", startDate: "2026-12-01", endDate: "2026-12-31" },
    ],
    shifts: [
      { id: 401, agreementId: 204, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-11-03", routeSnapshotDistanceM: 2000, routeSnapshotDurationSec: 300 },
      { id: 402, agreementId: 205, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-12-03", routeSnapshotDistanceM: 2000, routeSnapshotDurationSec: 300 },
    ],
  });

  assert.equal(context.agreementId, 204);
  assert.equal(context.shiftId, 401);
  assert.equal(context.periodStart, "2026-11-01");
  assert.equal(context.periodEnd, "2026-11-30");
});

test("normal ROOM finance opening does not keep a period that ends before the next month when a computable next period exists", () => {
  const context = selectDefaultComputableRoomService({
    referenceDate: "2026-10-30",
    agreements: [
      { id: 199, status: "ACTIVE", startDate: "2026-09-01", endDate: "2026-10-31" },
      { id: 207, status: "APPROVED", startDate: "2026-11-03", endDate: "2026-11-09" },
    ],
    shifts: [
      { id: 399, agreementId: 199, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-10-30", routeSnapshotDistanceM: 2000, routeSnapshotDurationSec: 300 },
      { id: 400, agreementId: 207, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-11-03", routeSnapshotDistanceM: 2000, routeSnapshotDurationSec: 300 },
    ],
  });

  assert.equal(context.agreementId, 207);
  assert.equal(context.shiftId, 400);
});

test("normal ROOM finance opening stays empty when no computable service exists", () => {
  assert.deepEqual(selectDefaultComputableRoomService({
    agreements: [{ id: 204, status: "REQUESTED", startDate: "2026-11-01", endDate: "2026-11-30" }],
    shifts: [{ id: 400, agreementId: 204, status: "APPROVED", vehicleId: null, driverId: null }],
  }), null);
});

test("normal ROOM finance opening prefers a completed historical service when future DONE rows are planning data", () => {
  const context = selectDefaultComputableRoomService({
    preferHistorical: true,
    referenceDate: "2026-10-30",
    agreements: [
      { id: 195, status: "COMPLETED", startDate: "2026-09-01", endDate: "2026-09-30" },
      { id: 207, status: "APPROVED", startDate: "2026-11-03", endDate: "2026-11-09" },
    ],
    shifts: [
      { id: 257, agreementId: 195, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-09-15", routeSnapshotDistanceM: 6250, routeSnapshotDurationSec: 707 },
      { id: 365, agreementId: 207, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-11-03", routeSnapshotDistanceM: 66323, routeSnapshotDurationSec: 3617 },
    ],
  });

  assert.equal(context.agreementId, 195);
  assert.equal(context.shiftId, 257);
  assert.equal(context.periodStart, "2026-09-01");
  assert.equal(context.periodEnd, "2026-09-30");
});

test("operational vehicle and period filters choose the matching completed service instead of an unrelated default", () => {
  const context = selectDefaultComputableRoomService({
    referenceDate: "2026-11-01",
    preferredVehicleId: 1,
    preferredPeriodStart: "2026-09-01",
    preferredPeriodEnd: "2026-09-30",
    agreements: [
      { id: 195, status: "COMPLETED", startDate: "2026-09-01", endDate: "2026-09-30" },
      { id: 206, status: "APPROVED", startDate: "2026-12-01", endDate: "2026-12-31" },
    ],
    shifts: [
      { id: 257, agreementId: 195, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-09-15", routeSnapshotDistanceM: 6250, routeSnapshotDurationSec: 707 },
      { id: 350, agreementId: 206, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-12-15", routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 700 },
    ],
  });

  assert.equal(context.agreementId, 195);
  assert.equal(context.shiftId, 257);
  assert.equal(context.periodStart, "2026-09-01");
  assert.equal(context.periodEnd, "2026-09-30");
});

test("operational filters do not fall back to a different service when no matching service exists", () => {
  assert.equal(selectDefaultComputableRoomService({
    preferredVehicleId: 1,
    preferredPeriodStart: "2026-09-01",
    preferredPeriodEnd: "2026-09-30",
    agreements: [{ id: 206, status: "APPROVED", startDate: "2026-12-01", endDate: "2026-12-31" }],
    shifts: [{ id: 350, agreementId: 206, status: "DONE", vehicleId: 1, driverId: 1, startAt: "2026-12-15", routeSnapshotDistanceM: 2576, routeSnapshotDurationSec: 700 }],
  }), null);
});

test("service picker candidates stay within the selected vehicle and period", () => {
  const candidates = listComputableRoomServiceCandidates({
    preferredVehicleId: 1,
    preferredPeriodStart: "2026-09-01",
    preferredPeriodEnd: "2026-09-30",
    agreements: [
      { id: 195, status: "COMPLETED", startDate: "2026-09-01", endDate: "2026-09-30" },
      { id: 196, status: "COMPLETED", startDate: "2026-09-01", endDate: "2026-09-30" },
      { id: 197, status: "COMPLETED", startDate: "2026-10-01", endDate: "2026-10-31" },
    ],
    shifts: [
      { id: 257, agreementId: 195, status: "DONE", vehicleId: 1, driverId: 3, startAt: "2026-09-15", routeSnapshotDistanceM: 6250, routeSnapshotDurationSec: 707 },
      { id: 258, agreementId: 196, status: "DONE", vehicleId: 2, driverId: 4, startAt: "2026-09-16", routeSnapshotDistanceM: 6250, routeSnapshotDurationSec: 707 },
      { id: 259, agreementId: 197, status: "DONE", vehicleId: 1, driverId: 3, startAt: "2026-10-15", routeSnapshotDistanceM: 6250, routeSnapshotDurationSec: 707 },
    ],
  });

  assert.deepEqual(candidates.map(({ agreementId, shiftId }) => ({ agreementId, shiftId })), [
    { agreementId: 195, shiftId: 257 },
  ]);
});
