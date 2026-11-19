import assert from "node:assert/strict";
import test from "node:test";

import { hasValidCoordinatePair } from "./geoCoordinatePair.js";

test("coordinate display does not treat null as zero", () => {
  assert.equal(hasValidCoordinatePair(null, 28.822), false);
  assert.equal(hasValidCoordinatePair(undefined, 28.822), false);
  assert.equal(hasValidCoordinatePair("", 28.822), false);
});

test("coordinate display rejects invalid or zero values", () => {
  assert.equal(hasValidCoordinatePair(95, 28.822), false);
  assert.equal(hasValidCoordinatePair(41.042, 181), false);
  assert.equal(hasValidCoordinatePair(0, 28.822), false);
  assert.equal(hasValidCoordinatePair(41.042, 28.822), true);
});
