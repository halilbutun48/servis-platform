import test from "node:test";
import assert from "node:assert/strict";
import { getEffectiveRouteMetrics, formatKm } from "./routePreviewSummary.js";

test("bilinen DEMO 1m/1s placeholder gerçek 0 km gibi gösterilmez", () => {
  const result = getEffectiveRouteMetrics({
    routeSnapshotDistanceM: 1,
    routeSnapshotDurationSec: 1,
    routeSnapshotInputHash: "ROUTE_SNAPSHOT_DEMO_PLANNING:PARTNER_ORGANIZATION",
  }, "SNAPSHOT");

  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.distanceKm, null);
  assert.equal(result.durationMin, null);
  assert.equal(result.label, "henüz hesaplanmadı");
});

test("kanıtlı gerçek küçük mesafe korunur", () => {
  const result = getEffectiveRouteMetrics({
    routeSnapshotDistanceM: 1,
    routeSnapshotDurationSec: 1,
    routeSnapshotInputHash: "OSRM:verified-route-1",
  }, "SNAPSHOT");

  assert.equal(result.status, "MEASURED");
  assert.equal(result.distanceKm, 0.001);
  assert.equal(result.durationMin, 1 / 60);
  assert.equal(formatKm(1), "1 m");
});

test("ölçüm eksikse kilometre veya süre sıfıra dönüştürülmez", () => {
  const result = getEffectiveRouteMetrics({ routeSnapshotDistanceM: null, routeSnapshotDurationSec: null }, "SNAPSHOT");
  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.distanceKm, null);
  assert.equal(result.durationMin, null);
});
