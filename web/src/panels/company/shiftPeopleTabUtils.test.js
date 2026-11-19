import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStopSummary,
  computeGeoMeta,
  computeGeoStatus,
  mapPersistedStopsForDisplay,
  normalizeCoord,
} from "./shiftPeopleTabUtils.js";

test("blank guided coordinates stay missing instead of becoming zero", () => {
  assert.equal(normalizeCoord("", "lat"), null);
  assert.equal(normalizeCoord("", "lng"), null);
  assert.deepEqual(
    computeGeoMeta({ address: "", lat: null, lng: null }),
    { geoStatus: "FAILED", geoReason: "MISSING_ADDRESS", geoReasonText: "Adres ve koordinat yok" },
  );
});

test("guided people require a real coordinate pair for coordinate-ready status", () => {
  assert.deepEqual(
    computeGeoMeta({ address: "", lat: normalizeCoord("0", "lat"), lng: normalizeCoord("0", "lng") }),
    { geoStatus: "FAILED", geoReason: "MISSING_ADDRESS", geoReasonText: "Adres ve koordinat yok" },
  );
  assert.equal(computeGeoMeta({ address: "", lat: 41.028, lng: 28.995 }).geoStatus, "OK");
});

test("persisted guided stops keep assignment counts after a resume", () => {
  const stops = mapPersistedStopsForDisplay(
    [{ id: 112, name: "Pickup 1", lat: 41.021, lng: 28.986, assignmentCount: 1 }],
    { hubLat: 41.028, hubLng: 28.995, direction: "INBOUND" },
  );
  const summary = buildStopSummary({
    base: { source: "PERSISTED_SHIFT" },
    stopsInput: stops,
    peopleInput: [{ lat: 41.021, lng: 28.986, geoStatus: "OK" }],
    computeGeoStatus,
  });

  assert.equal(summary.coveredCount, 1);
  assert.equal(summary.skippedCount, 0);
  assert.equal(summary.stopLoads[0].count, 1);
});
