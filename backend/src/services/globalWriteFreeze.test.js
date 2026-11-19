import test from "node:test";
import assert from "node:assert/strict";

import { createWriteFreezeController } from "./globalWriteFreeze.js";

class FakeRedis {
  constructor() {
    this.hashes = new Map();
    this.available = true;
  }

  async send(command, ...args) {
    if (!this.available) throw new Error("redis unavailable");
    const cmd = String(command).toUpperCase();
    if (cmd === "HGETALL") {
      return Object.entries(this.hashes.get(String(args[0])) || {}).flat();
    }
    if (cmd === "HSET") {
      const key = String(args[0]);
      const hash = this.hashes.get(key) || {};
      for (let i = 1; i < args.length; i += 2) hash[String(args[i])] = String(args[i + 1]);
      this.hashes.set(key, hash);
      return 1;
    }
    if (cmd === "EVAL") {
      const key = String(args[2]);
      const nextState = String(args[3]);
      const expectedState = String(args[4]);
      const hash = this.hashes.get(key) || {};
      if (expectedState !== "*" && hash.state && hash.state !== expectedState) {
        const error = new Error("WRITE_FREEZE_INVALID_STATE");
        error.code = "WRITE_FREEZE_INVALID_STATE";
        throw error;
      }
      const token = Number(hash.token || 0) + 1;
      this.hashes.set(key, {
        ...hash,
        state: nextState,
        token: String(token),
        owner: String(args[5]),
        reason: String(args[6]),
        changedAt: String(args[7]),
        changeControlId: String(args[8]),
      });
      return token;
    }
    throw new Error(`unexpected command ${cmd}`);
  }
}

test("OPEN durumunda yazma assertion'ı geçer ve fence token üretir", async () => {
  const redis = new FakeRedis();
  const controller = createWriteFreezeController({ redis, namespace: "test:freeze" });

  await controller.markOpen({ owner: "test-owner", changeControlId: "cc-open" });
  const fence = await controller.captureFence();
  const state = await controller.assertWritable({ operation: "TEST_WRITE", fenceToken: fence.token });

  assert.equal(state.state, "OPEN");
  assert.equal(state.token, fence.token);
});

test("FROZEN durumunda yazma reddedilir ve stale fence token bypass edemez", async () => {
  const redis = new FakeRedis();
  const controller = createWriteFreezeController({ redis, namespace: "test:freeze" });

  await controller.markOpen({ owner: "test-owner", changeControlId: "cc-open" });
  const oldFence = await controller.captureFence();
  await controller.beginFencing({ owner: "test-owner", reason: "fixture", changeControlId: "cc-freeze" });
  await controller.markFrozen({ owner: "test-owner", reason: "fixture", changeControlId: "cc-freeze" });

  await assert.rejects(
    controller.assertWritable({ operation: "TEST_WRITE", fenceToken: oldFence.token }),
    (error) => error?.code === "GLOBAL_WRITE_FROZEN"
  );
});

test("Redis okunamadığında yazma fail-closed reddedilir", async () => {
  const redis = new FakeRedis();
  const controller = createWriteFreezeController({ redis, namespace: "test:freeze" });
  redis.available = false;

  await assert.rejects(
    controller.assertWritable({ operation: "TEST_WRITE" }),
    (error) => error?.code === "WRITE_FREEZE_STATE_UNAVAILABLE"
  );
});

test("Redis freeze anahtarı kaybolduğunda yazma fail-closed reddedilir", async () => {
  const redis = new FakeRedis();
  const controller = createWriteFreezeController({ redis, namespace: "test:missing-freeze" });

  await assert.rejects(
    controller.assertWritable({ operation: "TEST_WRITE" }),
    (error) => error?.code === "WRITE_FREEZE_STATE_UNAVAILABLE"
  );
});

test("yetkisiz freeze veya unfreeze kontrolü reddedilir", async () => {
  const redis = new FakeRedis();
  const controller = createWriteFreezeController({
    redis,
    namespace: "test:freeze",
    authorizeControl: ({ owner, changeControlId }) => owner === "authorized" && changeControlId === "cc-1",
  });

  await assert.rejects(
    controller.markFrozen({ owner: "attacker", reason: "bad", changeControlId: "cc-1" }),
    (error) => error?.code === "WRITE_FREEZE_CONTROL_UNAUTHORIZED"
  );
});
