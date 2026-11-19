import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("parent-live fixture is explicitly canonical DEMO-only and preserves field/finance boundaries", () => {
  const source = fs.readFileSync(new URL("./m18DemoFixtureFoundation.js", import.meta.url), "utf8");

  assert.match(source, /M18_DEMO_PARENT_LIVE_CANONICAL_V1/);
  assert.match(source, /LOCAL_M18_PARENT_LIVE_FIXTURE !== "1"/);
  assert.match(source, /M18_CANONICAL_FIXTURE_CONFIRM !== "PARENT_LIVE_ONLY"/);
  assert.match(source, /TEST_SIMULATED_PARENT_LIVE_FIXTURE_PREPARED/);
  assert.match(source, /noGpsEventCreated: true/);
  assert.match(source, /noFinanceRecordsCreated: true/);
  assert.match(source, /fieldValidation: "OPEN"/);
  assert.match(source, /stopAssignment\.upsert/);
});
