import test from "node:test";
import assert from "node:assert/strict";
import { isPersonelShiftAccessible } from "./helpers.js";

test("PERSONEL kendi açık veya kabul edilmiş pickup isteği olan vardiyanın detayını okuyabilir", () => {
  assert.equal(
    isPersonelShiftAccessible(
      { pickupRequests: [{ personelId: 5, status: "OPEN" }] },
      5,
    ),
    true,
  );
  assert.equal(
    isPersonelShiftAccessible(
      { pickupRequests: [{ personelId: 5, status: "ACCEPTED" }] },
      5,
    ),
    true,
  );
});

test("PERSONEL yabancı veya kapanmış pickup isteği olan vardiyanın detayını okuyamaz", () => {
  assert.equal(
    isPersonelShiftAccessible(
      { pickupRequests: [{ personelId: 7, status: "ACCEPTED" }] },
      5,
    ),
    false,
  );
  assert.equal(
    isPersonelShiftAccessible(
      { pickupRequests: [{ personelId: 5, status: "CLOSED" }] },
      5,
    ),
    false,
  );
});
