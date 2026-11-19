import test from "node:test";
import assert from "node:assert/strict";
import { isCommercialLifecycleRestricted } from "./companyShiftsCommercialPolicy.js";

test("school keeps the restricted lifecycle while organization can continue to contract", () => {
  assert.equal(isCommercialLifecycleRestricted("SCHOOL"), true);
  assert.equal(isCommercialLifecycleRestricted("ORGANIZATION"), false);
  assert.equal(isCommercialLifecycleRestricted("COMPANY"), false);
});
