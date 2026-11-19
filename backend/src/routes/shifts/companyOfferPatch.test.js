import test from "node:test";
import assert from "node:assert/strict";
import { buildCompanyOfferUpdateData } from "./companyOfferPatch.js";

test("partial company-offer update preserves omitted fields", () => {
  assert.deepEqual(
    buildCompanyOfferUpdateData({ companyOfferNote: "DEMO devam" }),
    { companyOfferNote: "DEMO devam" },
  );
});

test("explicit null remains an intentional field clear", () => {
  assert.deepEqual(
    buildCompanyOfferUpdateData({ companyOfferAmount: null }),
    { companyOfferAmount: null },
  );
});

test("unknown fields never enter the update payload", () => {
  assert.deepEqual(
    buildCompanyOfferUpdateData({ companyOfferAmount: 900000, status: "DONE" }),
    { companyOfferAmount: 900000 },
  );
});
