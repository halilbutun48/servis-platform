import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyServiceCostBlocker,
  buildExpenseFocusTarget,
  expenseMissingFieldLabel,
  expenseMissingFieldActionLabel,
  unallocatedServiceCostAmountMinor,
} from "./roomServiceCostMissingInfo.js";

test("KDV ve net sonuç doğrulaması işlem değil bilgi notudur", () => {
  assert.deepEqual(classifyServiceCostBlocker("NET_ROLLUP_BLOCKED"), {
    kind: "INFORMATION",
    action: null,
  });
  assert.deepEqual(classifyServiceCostBlocker("VAT_UNKNOWN_NET_ROLLUP"), {
    kind: "INFORMATION",
    action: null,
  });
  assert.deepEqual(classifyServiceCostBlocker("VERIFIED_TAX_BASIS_MISSING"), {
    kind: "INFORMATION",
    action: null,
  });
});

test("dağıtım kanıtı işlemine gider düzeltme hedefi karışmaz", () => {
  assert.deepEqual(classifyServiceCostBlocker("ALLOCATION_EVIDENCE_INCOMPLETE"), {
    kind: "USER_ACTION",
    action: "allocation",
  });
});

test("gider düzeltme hedefi yalnız açık eksik alan kanıtı varsa üretilir", () => {
  assert.equal(buildExpenseFocusTarget({ entryId: 342, vehicleId: 1, periodStart: "2026-09-01" }), null);
  assert.deepEqual(buildExpenseFocusTarget({
    entryId: 348,
    vehicleId: 1,
    periodStart: "2026-09-18",
    missingFields: ["vat"],
  }, { returnTo: "/room/financial-operations?view=service-cost" }), {
    focusEntryId: 348,
    field: "vat",
    periodStart: "2026-09-18",
    periodEnd: null,
    returnTo: "/room/financial-operations?view=service-cost",
  });
});

test("eksik gider satırı kullanıcıya tek ve somut işlem adı verir", () => {
  assert.equal(expenseMissingFieldLabel("vehicle"), "Araç");
  assert.equal(expenseMissingFieldActionLabel("vehicle"), "İlgili aracı seç");
  assert.equal(expenseMissingFieldLabel("period"), "Dönem");
  assert.equal(expenseMissingFieldActionLabel("period"), "Eksik dönemi gir");
  assert.equal(expenseMissingFieldActionLabel("unknown"), null);
});

test("tamamı başka vardiyalara dağıtılmış kaynak gider için boşta kalan pay sıfırdır", () => {
  assert.equal(unallocatedServiceCostAmountMinor({
    allocation: "COUNT_IN_ROLLUP",
    amountMinor: 3_000_000,
    allocationLines: [
      { allocatedAmountMinor: 1_000_000, shiftId: 257 },
      { allocatedAmountMinor: 1_000_000, shiftId: 276 },
      { allocatedAmountMinor: 1_000_000, shiftId: 278 },
    ],
  }), 0);
  assert.equal(unallocatedServiceCostAmountMinor({
    allocation: "COUNT_IN_ROLLUP",
    amountMinor: 900_000,
    allocationLines: [{ allocatedAmountMinor: 125_000, shiftId: 257 }],
  }), 775_000);
});
