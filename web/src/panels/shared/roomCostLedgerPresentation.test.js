import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExpenseRowPresentation,
  buildExpenseSummaryNotes,
  expenseMatchesOwner,
} from "./roomCostLedgerPresentation.js";

test("vardiyaya tahsisli sürücü gideri araç filtresinde aynı aracın kaydı olarak kalır", () => {
  assert.equal(expenseMatchesOwner({
    driverId: 1,
    allocationLines: [{ shiftId: 3, driverId: 1 }],
  }, {
    vehicleId: 1,
    shifts: [{ id: 3, vehicleId: 1, driverId: 1 }],
  }), true);
});

test("başka araca ait vardiya tahsisi araç filtresini geçemez", () => {
  assert.equal(expenseMatchesOwner({
    driverId: 1,
    allocationLines: [{ shiftId: 3, driverId: 1 }],
  }, {
    vehicleId: 2,
    shifts: [{ id: 3, vehicleId: 1, driverId: 1 }],
  }), false);
});

test("KDV bilgisi olmayan geçerli gider zorunlu kanıt uyarısı gibi sunulmaz", () => {
  const presentation = buildExpenseRowPresentation({
    vatClassification: "UNKNOWN",
    evidenceRef: "",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
  });

  assert.equal(presentation.rowTone, "default");
  assert.equal(presentation.sourceLabel, "Belge bilgisi eklenmedi");
  assert.deepEqual(presentation.vatStatus, {
    label: "KDV ayrıca belirtilmedi",
    tone: "neutral",
  });
});

test("gerçek servis bağlantısı eksikliği KDV bilgisinden ayrı görünür", () => {
  const presentation = buildExpenseRowPresentation({
    vatClassification: "UNKNOWN",
    evidenceRef: "",
    lifecycle: "CONFIRMED",
    recordKind: "ACTUAL",
  }, { serviceEvidenceMissing: true });

  assert.equal(presentation.rowTone, "default");
  assert.equal(presentation.serviceEvidenceMissing, true);
  assert.equal(presentation.vatStatus.tone, "neutral");
});

test("özet notu KDV bilgisini göreve değil kısa açıklamaya çevirir", () => {
  assert.deepEqual(buildExpenseSummaryNotes({ unknownVatCount: 2, pendingShiftCount: 0 }), [
    "KDV bilgisi ayrıca belirtilmeyen 2 gider var; giderler brüt tutarıyla işlendi ve KDV ayrıştırılmadı.",
  ]);
  assert.deepEqual(buildExpenseSummaryNotes({ unknownVatCount: 2, pendingShiftCount: 1 }), [
    "1 giderde servis payı ayrıca doğrulanmadı; bu bilgi yalnız ilgili giderin servis maliyetini etkiler.",
    "KDV bilgisi ayrıca belirtilmeyen 2 gider var; giderler brüt tutarıyla işlendi ve KDV ayrıştırılmadı.",
  ]);
});
