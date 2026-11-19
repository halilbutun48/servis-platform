import assert from "node:assert/strict";
import test from "node:test";

import { isParentCrossChildQuestion } from "./service.js";

test("PARENT başka çocuk iyelik sorusunu kapsam dışı olarak tanır", () => {
  assert.equal(isParentCrossChildQuestion("Başka çocuğun servisi nerede?"), true);
  assert.equal(isParentCrossChildQuestion("Diğer öğrencinin konumu nedir?"), true);
  assert.equal(isParentCrossChildQuestion("Çocuğumun servisi nerede?"), false);
});
