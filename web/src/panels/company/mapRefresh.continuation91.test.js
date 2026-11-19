import assert from "node:assert/strict";
import test from "node:test";

import { invokeMapRefresh } from "./mapRefresh.js";

test("map refresh does not forward the click event as an AbortSignal", async () => {
  const calls = [];
  const loadAll = async (...args) => {
    calls.push(args);
    return "refreshed";
  };

  const result = await invokeMapRefresh(loadAll);

  assert.equal(result, "refreshed");
  assert.deepEqual(calls, [[]]);
});
