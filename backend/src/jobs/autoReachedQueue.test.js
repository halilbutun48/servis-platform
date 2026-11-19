import test from "node:test";
import assert from "node:assert/strict";

import { buildWorkerDatabaseUrl, canWriteQueue, processAutoReachedTask } from "./autoReachedQueue.js";

test("queue yazısı frozen durumda false döner", async () => {
  const controller = {
    assertWritable: async () => {
      throw new Error("frozen");
    },
  };

  assert.equal(await canWriteQueue(controller, "TEST_QUEUE_WRITE"), false);
});

test("queue yazısı açık durumda true döner", async () => {
  let operation = null;
  const controller = { assertWritable: async ({ operation: value }) => { operation = value; } };

  assert.equal(await canWriteQueue(controller, "TEST_QUEUE_WRITE"), true);
  assert.equal(operation, "TEST_QUEUE_WRITE");
});

test("GPS fallback doğrudan worker işlemine geçerek freeze'i aşamaz", async () => {
  const controller = {
    assertWritable: async () => {
      const error = new Error("frozen");
      error.code = "GLOBAL_WRITE_FROZEN";
      throw error;
    },
  };

  await assert.rejects(
    processAutoReachedTask({}, {}, { writeFreezeController: controller }),
    (error) => error?.code === "GLOBAL_WRITE_FROZEN"
  );
});

test("worker ayrı DATABASE_URL verildiğinde onu pool ayarlarıyla kullanır", () => {
  const url = buildWorkerDatabaseUrl({
    workerDatabaseUrl: "postgresql://worker:pw@fixture/db",
    databaseUrl: "postgresql://app:pw@fixture/db",
  });

  assert.match(url, /^postgresql:\/\/worker:pw@fixture\/db\?/);
  assert.match(url, /connection_limit=1/);
  assert.match(url, /pool_timeout=5/);
});

test("WORKER_DATABASE_URL yoksa uygulama DATABASE_URL'ine fallback yapmaz", () => {
  assert.equal(
    buildWorkerDatabaseUrl({
      workerDatabaseUrl: "",
      databaseUrl: "postgresql://app:pw@fixture/db",
    }),
    null,
  );
});

test("geçersiz WORKER_DATABASE_URL fail-closed olur", () => {
  assert.equal(
    buildWorkerDatabaseUrl({
      workerDatabaseUrl: "not-a-url",
      databaseUrl: "postgresql://app:pw@fixture/db",
    }),
    null,
  );
});
