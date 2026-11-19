import test from "node:test";
import assert from "node:assert/strict";

import { createRuntimePrismaClient, resolveWorkerDatabaseUrl, createWorkerRuntimePrismaClient } from "./prisma.js";
import { assertDatabaseTarget, databaseTargetFromUrl, ensureCanonicalDatabaseReady, CANONICAL_DEMO_DATABASE_NAME } from "./databaseTarget.js";

class FakePrismaClient {
  constructor() {
    this.extension = null;
  }

  $extends(extension) {
    this.extension = extension;
    return this;
  }
}

test("runtime Prisma model write operasyonlarında ortak freeze assertion çağrılır", async () => {
  const operations = [];
  const controller = {
    assertWritable: async ({ operation }) => operations.push(operation),
  };
  const client = createRuntimePrismaClient({
    PrismaClientClass: FakePrismaClient,
    freezeController: controller,
  });
  const handler = client.extension.query.$allModels.$allOperations;

  await handler({ operation: "findMany", args: {}, query: async () => "read" });
  await handler({ operation: "create", args: {}, query: async () => "write" });

  assert.deepEqual(operations, ["create"]);
});

test("worker bağlantısı yoksa API DATABASE_URL'ine fallback yapmaz", () => {
  assert.equal(
    resolveWorkerDatabaseUrl({
      workerDatabaseUrl: "",
      databaseUrl: "postgresql://app:pw@fixture/app",
    }),
    null,
  );
});

test("worker bağlantısı geçersiz veya API ile aynıysa fail-closed kalır", () => {
  assert.equal(resolveWorkerDatabaseUrl({ workerDatabaseUrl: "not-a-url", databaseUrl: "postgresql://app@fixture/app" }), null);
  assert.equal(
    resolveWorkerDatabaseUrl({
      workerDatabaseUrl: "postgresql://app@fixture/app",
      databaseUrl: "postgresql://app@fixture/app",
    }),
    null,
  );
});

test("worker Prisma istemcisi ayrı URL ve ortak freeze controller ile oluşturulur", () => {
  const constructions = [];
  const freezeController = { assertWritable: async () => {} };
  class FakeWorkerPrismaClient extends FakePrismaClient {
    constructor(options) {
      super();
      constructions.push(options);
    }
  }

  const client = createWorkerRuntimePrismaClient({
    workerDatabaseUrl: "postgresql://worker:pw@fixture/worker",
    databaseUrl: "postgresql://app:pw@fixture/app",
    freezeController,
    PrismaClientClass: FakeWorkerPrismaClient,
  });

  assert.ok(client);
  assert.match(constructions[0].datasources.db.url, /^postgresql:\/\/worker:pw@fixture\/worker\?/);
  assert.match(constructions[0].datasources.db.url, /connection_limit=1/);
  assert.match(constructions[0].datasources.db.url, /pool_timeout=5/);
  assert.equal(client.extension.query.$allModels.$allOperations != null, true);
});

test("canonical DEMO hedefi veritabanı adını ve schema'yı fail-closed doğrular", () => {
  const target = assertDatabaseTarget({
    url: "postgresql://app:pw@db:5432/seferpakt_clean_demo?schema=public",
    mode: "canonical_demo",
  });
  assert.equal(target.databaseName, CANONICAL_DEMO_DATABASE_NAME);
  assert.equal(databaseTargetFromUrl("postgresql://app:pw@db:5432/servisdb?schema=public").databaseName, "servisdb");
  assert.throws(
    () => assertDatabaseTarget({
      url: "postgresql://app:pw@db:5432/servisdb?schema=public",
      mode: "canonical_demo",
    }),
    (error) => error?.code === "CANONICAL_DEMO_DATABASE_REQUIRED",
  );
});

test("canonical runtime kimliği ve migration sayısı bağlantıdan doğrulanır", async () => {
  const calls = [];
  const client = {
    $connect: async () => calls.push("connect"),
    $queryRawUnsafe: async (sql) => {
      calls.push(sql);
      return sql.includes("current_database")
        ? [{ database_name: "seferpakt_clean_demo", schema_name: "public", current_user: "app", server_version_num: "160000" }]
        : [{ migration_count: 68 }];
    },
  };
  const identity = await ensureCanonicalDatabaseReady({
    client,
    url: "postgresql://app:pw@db:5432/seferpakt_clean_demo?schema=public",
  });
  assert.equal(identity.databaseName, "seferpakt_clean_demo");
  assert.equal(identity.migrationCount, 68);
  assert.equal(calls.length, 3);
});
