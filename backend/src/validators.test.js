import test from "node:test";
import assert from "node:assert/strict";
import { createVehicleSchema } from "./validators.js";

test("araç HGS sınıfını bir kez girilen doğrulanmış teknik bilgi olarak taşır", () => {
  const parsed = createVehicleSchema.safeParse({
    plate: "34 TEST 999",
    capacity: 16,
    hgsClass: 2,
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.hgsClass, 2);
});

test("araç HGS sınıfı 1-6 dışında kabul edilmez", () => {
  const parsed = createVehicleSchema.safeParse({
    plate: "34 TEST 998",
    capacity: 16,
    hgsClass: 7,
  });

  assert.equal(parsed.success, false);
});
