import test from "node:test";
import assert from "node:assert/strict";

import { isCommercialPackageShift } from "./shiftPackage.js";

test("commercial package excludes non-requested draft shifts", () => {
  assert.equal(isCommercialPackageShift("DRAFT"), false);
  assert.equal(isCommercialPackageShift("REQUESTED"), true);
  assert.equal(isCommercialPackageShift("APPROVED"), true);
});
