import test from "node:test";
import assert from "node:assert/strict";
import {
  ROOM_FINANCE_SECTIONS,
  normalizeRoomFinanceView,
  roomFinanceViewPath,
} from "./financialOperationsSections.js";

test("ROOM Finans dört görünür sekmede teklif değerlendirmeyi tek teklif yüzeyi olarak sunar", () => {
  assert.deepEqual(ROOM_FINANCE_SECTIONS.map((section) => section.key), [
    "overview",
    "expenses",
    "service-cost",
    "quote-profitability",
  ]);
  assert.equal(ROOM_FINANCE_SECTIONS.length, 4);
  assert.equal(ROOM_FINANCE_SECTIONS[3].label, "Teklif Değerlendir");
  assert.equal(normalizeRoomFinanceView("vehicle-comparison"), "quote-profitability");
  assert.equal(roomFinanceViewPath("vehicle-comparison"), "/room/financial-operations?view=quote-profitability");
});
