import test from "node:test";
import assert from "node:assert/strict";
import { describeServiceCostDistributionStatus, hasPendingServiceAllocation, hasServiceAllocationEvidence } from "./serviceCostPresentation.js";

test("KDV nedeniyle dışlanan kayıtlar dağıtım bekleyen kayıt gibi gösterilmez", () => {
  assert.equal(hasPendingServiceAllocation({ excludedCount: 2, pendingAmountMinor: 0 }), false);
  assert.equal(hasPendingServiceAllocation({ excludedCount: 2, pendingAmountMinor: null }), false);
});

test("kanıtlanmamış servis payı varsa dağıtım uyarısı gösterilir", () => {
  assert.equal(hasPendingServiceAllocation({ excludedCount: 0, pendingAmountMinor: 125000 }), true);
});

test("allocationLines içindeki kanıtlı vardiya payı dağıtım bekliyor gösterilmez", () => {
  assert.equal(hasServiceAllocationEvidence({
    allocation: "COUNT_IN_ROLLUP",
    allocationLines: [{ allocatedAmountMinor: 210000, shiftId: 318 }],
  }), true);
  assert.equal(hasServiceAllocationEvidence({
    allocation: "COUNT_IN_ROLLUP",
    allocationLines: [],
  }), false);
});

test("kaynak giderin tamamı vardiya paylarına ayrıldıysa kalan pay bekliyor gösterilmez", () => {
  assert.deepEqual(describeServiceCostDistributionStatus({
    allocation: "COUNT_IN_ROLLUP",
    amountMinor: 1200000,
    serviceAllocatedAmountMinor: 76041,
    allocationLines: [
      { allocatedAmountMinor: 76041, shiftId: 257 },
      { allocatedAmountMinor: 92295, shiftId: 276 },
      { allocatedAmountMinor: 1031664, shiftId: 278 },
    ],
  }), {
    label: "Servise dağıtıldı",
    detail: "Giderin tamamı doğrulanmış sefer paylarına ayrıldı; seçili servisin payı yukarıda gösterilir.",
    tone: "good",
  });
});
