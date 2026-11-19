import test from "node:test";
import assert from "node:assert/strict";

import { createWriteFreezeMiddleware } from "./globalWriteFreeze.js";

function responseHarness() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
  };
}

test("safe read yöntemleri freeze middleware'inden geçer", async () => {
  let calls = 0;
  const controller = { assertWritable: async () => { calls += 1; } };
  const middleware = createWriteFreezeMiddleware({ controller });
  const req = { method: "GET", path: "/api/company/overview" };
  const res = responseHarness();
  let nextCalls = 0;

  await middleware(req, res, () => { nextCalls += 1; });

  assert.equal(nextCalls, 1);
  assert.equal(calls, 0);
  assert.equal(res.statusCode, 200);
});

test("mutating request frozen durumda sade Türkçe hata ile durur", async () => {
  const controller = {
    assertWritable: async () => {
      const error = new Error("frozen");
      error.code = "GLOBAL_WRITE_FROZEN";
      error.status = 423;
      throw error;
    },
  };
  const middleware = createWriteFreezeMiddleware({ controller });
  const req = { method: "POST", path: "/api/company/invoice-payment" };
  const res = responseHarness();
  let nextCalls = 0;

  await middleware(req, res, () => { nextCalls += 1; });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 423);
  assert.equal(res.body?.message, "Sistem geçiş nedeniyle geçici olarak yazmaya kapalı.");
  assert.equal(res.body?.code, undefined);
});

test("Redis durumu okunamadığında mutating request fail-closed olur", async () => {
  const controller = {
    assertWritable: async () => {
      const error = new Error("redis down");
      error.code = "WRITE_FREEZE_STATE_UNAVAILABLE";
      error.status = 503;
      throw error;
    },
  };
  const middleware = createWriteFreezeMiddleware({ controller });
  const req = { method: "PATCH", path: "/api/shifts/1" };
  const res = responseHarness();

  await middleware(req, res, () => {});

  assert.equal(res.statusCode, 503);
  assert.equal(res.body?.message, "Yazma güvenlik durumu doğrulanamadığı için işlem gerçekleştirilemedi.");
  assert.equal(res.body?.code, undefined);
});

test("salt-okunur cost scenario preview, global yazma durumu yokken exact path ile ilerler", async () => {
  const controller = {
    assertWritable: async () => {
      const error = new Error("redis state missing");
      error.code = "WRITE_FREEZE_STATE_UNAVAILABLE";
      error.status = 503;
      throw error;
    },
  };
  const middleware = createWriteFreezeMiddleware({
    controller,
    readOnlyPostPaths: ["/api/cost-scenarios/preview"],
  });
  const req = { method: "POST", originalUrl: "/api/cost-scenarios/preview?scope=ROOM", path: "/api/cost-scenarios/preview" };
  const res = responseHarness();
  let nextCalls = 0;

  await middleware(req, res, () => { nextCalls += 1; });

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, 200);
});

test("salt-okunur preview istisnası benzer veya başka POST yollarına yayılmaz", async () => {
  const controller = {
    assertWritable: async () => {
      const error = new Error("redis state missing");
      error.code = "WRITE_FREEZE_STATE_UNAVAILABLE";
      error.status = 503;
      throw error;
    },
  };
  const middleware = createWriteFreezeMiddleware({
    controller,
    readOnlyPostPaths: ["/api/cost-scenarios/preview"],
  });
  const requests = [
    { method: "POST", originalUrl: "/api/cost-scenarios/preview/other", path: "/api/cost-scenarios/preview/other" },
    { method: "POST", originalUrl: "/api/company/invoice-payment", path: "/api/company/invoice-payment" },
  ];

  for (const req of requests) {
    const res = responseHarness();
    let nextCalls = 0;
    await middleware(req, res, () => { nextCalls += 1; });
    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 503);
  }
});
