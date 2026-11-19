import test from "node:test";
import assert from "node:assert/strict";
import { alignGuidedPlanResetBaseline } from "./guidedPlanModalHydration.js";

test("guided modal hydration baseline reuses the live initial idempotency key", () => {
  const liveKey = "guided-live-key";
  const baseline = alignGuidedPlanResetBaseline({ hubLoaded: false, guidedBatchIdempotencyKey: "reset-key" }, liveKey);

  assert.equal(baseline.guidedBatchIdempotencyKey, liveKey);
  assert.equal(baseline.hubLoaded, false);
});
