import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gpsSourceLabelFromKey } from "../src/gps/sourceLabel.js";

const fixtureSource = fs.readFileSync(new URL("./m18DemoTelemetryFixture.js", import.meta.url), "utf8");

test("canonical DEMO telemetry fixture keeps explicit guard and canonical DB scope", () => {
  assert.match(fixtureSource, /LOCAL_MAINTENANCE_MODE !== "1"/);
  assert.match(fixtureSource, /LOCAL_MAINTENANCE_SCOPE !== "DEMO_FIXTURE_ONLY"/);
  assert.match(fixtureSource, /CANONICAL_DATABASE_PATH = "\/seferpakt_clean_demo"/);
  assert.match(fixtureSource, /TELEMATICS_ENABLED !== true/);
  assert.doesNotMatch(fixtureSource, /parsed\.pathname !== "\/servisdb"/);
});

test("canonical DEMO telemetry fixture is traceable, repeatable and rollback-scoped", () => {
  assert.match(fixtureSource, /TELEMETRY_SOURCE = "SIMULATED_DEMO"/);
  assert.match(fixtureSource, /repeatKey:/);
  assert.match(fixtureSource, /rollbackM18RoomVehicle3TelemetryFixture/);
  assert.match(fixtureSource, /M18_DEMO_TELEMETRY_DEVICE_READY/);
  assert.match(fixtureSource, /M18_DEMO_TELEMETRY_ROLLBACK/);
  assert.match(fixtureSource, /ingestTelematicsPosition/);
});

test("SIMULATED_DEMO is visible as demo telemetry, not physical GPS", () => {
  assert.equal(gpsSourceLabelFromKey("SIMULATED_DEMO"), "DEMO simüle telemetrisi");
});
