import test from "node:test";
import assert from "node:assert/strict";
import { getDriverMapGpsReliabilityLabel } from "./etaSanity.js";

test("driver map treats a selected vehicle without telemetry as waiting", () => {
  assert.equal(
    getDriverMapGpsReliabilityLabel({ id: 2, gpsLast: null, gpsState: null }),
    "Bekleniyor",
  );
});

test("driver map preserves explicit live and offline telemetry states", () => {
  assert.equal(
    getDriverMapGpsReliabilityLabel({ gpsState: { lastUiStatus: "LIVE" } }),
    "Canlı",
  );
  assert.equal(
    getDriverMapGpsReliabilityLabel({ gpsState: { lastUiStatus: "OFFLINE" } }),
    "Çevrim dışı",
  );
});
