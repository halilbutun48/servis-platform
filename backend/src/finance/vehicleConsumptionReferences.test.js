import assert from "node:assert/strict";
import test from "node:test";

import * as references from "./vehicleConsumptionReferences.js";

test("tanınan araç sınıfı ROOM yakıt profilini teknik referansın yakıt türüyle tamamlar", () => {
  assert.equal(typeof references.canonicalFuelTypeForVehicle, "function");
  assert.equal(references.canonicalFuelTypeForVehicle("MIDIBUS"), "DIESEL");
  assert.equal(references.canonicalFuelTypeForVehicle("unknown"), null);
});

test("yalnız rota tipinden boş kilometre çıkarılmaz", () => {
  assert.equal(typeof references.canonicalEmptyDistanceForRoute, "function");
  assert.equal(references.canonicalEmptyDistanceForRoute({ pattern: "LOOP", routeSnapshotDistanceM: 6250 }), null);
  assert.equal(references.canonicalEmptyDistanceForRoute({ pattern: "ONE_WAY", routeSnapshotDistanceM: 6250 }), null);
});

test("açık canonical boş kilometre kanıtı varsa değer korunur", () => {
  assert.equal(references.canonicalEmptyDistanceForRoute({
    pattern: "LOOP",
    routeSnapshotDistanceM: 6250,
    emptyDistanceKm: 0,
    emptyDistanceEvidence: true,
  }), 0);
});
