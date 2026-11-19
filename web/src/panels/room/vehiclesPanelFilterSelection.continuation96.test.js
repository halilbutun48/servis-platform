import assert from "node:assert/strict";
import test from "node:test";

import { matchesVehicleStatusFilter } from "./vehicleStatusFilter.js";

const offlineVehicle = { id: 3, plate: "34 ABC 125", gpsLast: { at: "2026-11-12T20:00:00.000Z" } };

test("status filtering excludes a selected vehicle when query or status does not match", () => {
  const resolveStatus = () => "OFFLINE";
  assert.equal(matchesVehicleStatusFilter(offlineVehicle, { query: "34 ABC 125", statusFilter: "OFFLINE", resolveStatus }), true);
  assert.equal(matchesVehicleStatusFilter(offlineVehicle, { query: "NO-SUCH-VEHICLE", statusFilter: "OFFLINE", resolveStatus }), false);
  assert.equal(matchesVehicleStatusFilter(offlineVehicle, { query: "34 ABC 125", statusFilter: "STALE", resolveStatus }), false);
});

test("status filtering keeps the selected record visible after clearing filters", () => {
  assert.equal(matchesVehicleStatusFilter(offlineVehicle, { query: "", statusFilter: "ALL", resolveStatus: () => "OFFLINE" }), true);
});
