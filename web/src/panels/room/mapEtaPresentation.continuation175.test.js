import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { getEtaDisplay } from "../../utils/etaSanity.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "MapPanel.jsx"), "utf8");

test("room map ETA uses timestamp-aware selected vehicle status", () => {
  const start = source.indexOf("function etaDisplayText");
  const end = source.indexOf("\n}\n\nfunction derivedLastReachedOrder", start);
  assert.ok(start >= 0 && end > start, "etaDisplayText helper must remain present");
  const block = source.slice(start, end);
  assert.match(block, /gpsStatus:\s*uiStatusFromVehicle\(vehicle\)/);
  assert.doesNotMatch(block, /gpsState\?\.lastUiStatus/);
});

test("offline and stale telemetry never expose a numeric ETA", () => {
  assert.equal(getEtaDisplay({ etaMinutes: 6, gpsStatus: "OFFLINE" }), "hesaplanamıyor");
  assert.equal(getEtaDisplay({ etaMinutes: 6, gpsStatus: "STALE" }), "güncel değil");
});
