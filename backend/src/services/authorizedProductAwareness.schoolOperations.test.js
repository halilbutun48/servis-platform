import test from "node:test";
import assert from "node:assert/strict";
import { buildSchoolOperationsStatusReply } from "./authorizedProductAwareness.js";

test("SCHOOL operations status uses a truthful current zero-state", () => {
  const reply = buildSchoolOperationsStatusReply({ request: true, operationsFacts: [] });
  assert.match(reply, /Güncel yetkili okul operasyon kaydı görünmüyor/iu);
  assert.match(reply, /geçmiş bir vardiyayı bugünkü aktif servis olarak kullanmıyorum/iu);
});
