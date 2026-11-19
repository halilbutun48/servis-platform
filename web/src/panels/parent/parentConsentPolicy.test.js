import test from "node:test";
import assert from "node:assert/strict";
import { isParentConsentBlocked } from "./parentConsentPolicy.js";

test("veli KVKK belgeleri eksikken çocuk ve canlı servis verisi yüklenmez", () => {
  assert.equal(isParentConsentBlocked({ role: "PARENT", kvkk: { requiredCount: 2 } }), true);
  assert.equal(isParentConsentBlocked({ role: "PARENT", kvkk: { requiredCount: 2, acceptedCount: 2, blocking: false } }), false);
  assert.equal(isParentConsentBlocked({ role: "PARENT", kvkk: { requiredCount: 2, acceptedCount: 1, blocking: true } }), true);
  assert.equal(isParentConsentBlocked({ role: "PARENT", kvkk: { requiredCount: 0 } }), false);
  assert.equal(isParentConsentBlocked({ role: "COMPANY", kvkk: { requiredCount: 2 } }), false);
});
