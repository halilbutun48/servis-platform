import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./ShiftPeopleTab.jsx", import.meta.url), "utf8");
const actionContext = source.match(/buildShiftPeopleTabActions\(\{([\s\S]*?)\}\);/u)?.[1] || "";

test("shift people actions receive persisted-stop mapping helpers", () => {
  assert.match(actionContext, /\bmapPersistedStopsForDisplay,\s/);
  assert.match(actionContext, /\bstripHubStop,\s/);
});
