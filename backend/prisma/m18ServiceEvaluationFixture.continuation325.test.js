import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("service-evaluation fixture has a canonical DEMO-only guard and two buyer-role scenarios", () => {
  const source = fs.readFileSync(new URL("./m18DemoFixtureFoundation.js", import.meta.url), "utf8");

  assert.match(source, /M18_DEMO_SERVICE_EVALUATION_CANONICAL_V1/);
  assert.match(source, /SEFERPAKT_DATABASE_MODE !== "canonical_demo"/);
  assert.match(source, /kind: "SCHOOL"/);
  assert.match(source, /kind: "ORGANIZATION"/);
  assert.match(source, /TEST_SIMULATED_SERVICE_EVALUATION_FIXTURE_PREPARED/);
});
