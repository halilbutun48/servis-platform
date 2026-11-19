import test from "node:test";
import assert from "node:assert/strict";

import * as prismaModule from "./prisma.js";

class FakePrismaClient {
  constructor(options) {
    this.options = options;
  }

  $extends() {
    return this;
  }
}

test("worker bağlantısı startup'ta bounded olarak doğrulanır ve takılı bağlantı açık hata verir", async () => {
  assert.equal(typeof prismaModule.ensureWorkerDatabaseReady, "function");
  const workerClient = {
    $connect: () => new Promise(() => {}),
  };

  await assert.rejects(
    prismaModule.ensureWorkerDatabaseReady({ workerClient, timeoutMs: 25 }),
    (error) => error?.code === "WORKER_DATABASE_CONNECT_TIMEOUT",
  );
});

test("worker bağlantısı yoksa startup fail-closed hata verir", async () => {
  await assert.rejects(
    prismaModule.ensureWorkerDatabaseReady({ workerClient: null, timeoutMs: 25 }),
    (error) => error?.code === "WORKER_DATABASE_URL_REQUIRED",
  );
});

test("worker URL bağlantı kurulumu için açık connect_timeout taşır", () => {
  const constructions = [];
  class RecordingPrismaClient extends FakePrismaClient {
    constructor(options) {
      super(options);
      constructions.push(options);
    }
  }

  prismaModule.createWorkerRuntimePrismaClient({
    workerDatabaseUrl: "postgresql://worker:pw@fixture/worker",
    databaseUrl: "postgresql://app:pw@fixture/app",
    freezeController: { assertWritable: async () => {} },
    PrismaClientClass: RecordingPrismaClient,
  });

  assert.match(constructions[0].datasources.db.url, /connect_timeout=5/);
});
