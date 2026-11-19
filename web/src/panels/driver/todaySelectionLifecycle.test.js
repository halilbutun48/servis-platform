import assert from "node:assert/strict";
import test from "node:test";

import { shouldClearDriverTodaySelection } from "./todaySelectionLifecycle.js";

const shift = (id) => ({
  scopeKey: "/driver/today",
  entityType: "shift",
  entityId: id,
  label: `Vardiya #${id}`,
});

test("driver today refresh keeps the copilot transcript for the same shift", () => {
  assert.equal(shouldClearDriverTodaySelection(shift(27), shift(27)), false);
});

test("driver today clears context when the selected shift changes or disappears", () => {
  assert.equal(shouldClearDriverTodaySelection(shift(27), shift(28)), true);
  assert.equal(shouldClearDriverTodaySelection(shift(27), null), true);
});
