import test from "node:test";
import assert from "node:assert/strict";

import { canStartWriteMonitors, schedulerActivationDecision } from "./index.js";

test("scheduler açıkça etkinleştirilmedikçe güvenli kapalı kalır", () => {
  assert.deepEqual(schedulerActivationDecision({}), {
    requested: false,
    enabled: false,
    reason: "DEFAULT_SAFE_CLOSED",
  });
});

test("scheduler yalnız açık etkinleştirme ile çalıştırılabilir", () => {
  assert.deepEqual(schedulerActivationDecision({ SCHEDULER_ENABLED: "1" }), {
    requested: true,
    enabled: true,
    reason: "EXPLICIT_SCHEDULER_ENABLE",
  });
});

test("freeze açıkken worker/scheduler başlatma kararı false döner", async () => {
  const controller = {
    assertWritable: async () => {
      throw new Error("frozen");
    },
  };

  assert.equal(await canStartWriteMonitors(controller, {}), false);
});

test("OPEN durumda worker/scheduler başlatma kararı true döner", async () => {
  const controller = { assertWritable: async () => {} };

  assert.equal(await canStartWriteMonitors(controller, {}), true);
});

test("worker Prisma bağlantısı yoksa scheduler fail-closed kalır", async () => {
  const controller = { assertWritable: async () => {} };

  assert.equal(await canStartWriteMonitors(controller, null), false);
});
