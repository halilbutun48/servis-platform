import test from "node:test";
import assert from "node:assert/strict";
import { userFacingStatusLabel } from "./terminology.js";

test("check-in credential türleri kullanıcıya tanımlı etiket olarak gösterilir", () => {
  assert.equal(userFacingStatusLabel("QR"), "QR erişim kodu");
  assert.equal(userFacingStatusLabel("NFC"), "NFC erişim kodu");
});
