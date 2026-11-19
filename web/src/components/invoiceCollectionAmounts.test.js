import assert from "node:assert/strict";
import test from "node:test";

import { displayCollectionAmount } from "./invoiceCollectionAmounts.js";

test("missing collection amount falls back while a real zero stays zero", () => {
  assert.equal(displayCollectionAmount(null, 10_000_000), 10_000_000);
  assert.equal(displayCollectionAmount(undefined, 10_000_000), 10_000_000);
  assert.equal(displayCollectionAmount(0, 10_000_000), 0);
});
