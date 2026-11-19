import test from "node:test";
import assert from "node:assert/strict";

import { shouldPublishSocketRelay } from "./socketRelay.js";

test("frozen relay Redis publish yan etkisini bastırır", async () => {
  const controller = {
    assertWritable: async () => {
      const error = new Error("frozen");
      error.code = "GLOBAL_WRITE_FROZEN";
      throw error;
    },
  };

  assert.equal(await shouldPublishSocketRelay(controller), false);
});

test("açık relay publish için ortak assertion geçer", async () => {
  let called = 0;
  const controller = { assertWritable: async () => { called += 1; } };

  assert.equal(await shouldPublishSocketRelay(controller), true);
  assert.equal(called, 1);
});
