import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSimpleCorrectionConfirmation,
  correctionHasChanges,
  defaultExpenseComposerMode,
  formPatchForFocusedCategory,
  formFromDraftItem,
  freshSingleExpenseComposerState,
  mergeLoadedExpenseForm,
  validateRoomCostDraft,
} from "./roomCostFormState.js";

test("Gider Ekle yeni girişte tek formu açar; mevcut toplu taslakta devam eder", () => {
  assert.equal(defaultExpenseComposerMode({ resumeBatch: false }), "single");
  assert.equal(defaultExpenseComposerMode({ resumeBatch: true }), "batch");
});

test("yeni tek gider açılırken önceki onaylı taslak durumu taşınmaz", () => {
  assert.deepEqual(freshSingleExpenseComposerState(), {
    draftItem: null,
    editingDraft: false,
    confirmationText: "",
  });
});

test("basit düzeltme açık onayı kullanıcıdan DÜZELT yazmasını istemeden üretir", () => {
  assert.deepEqual(buildSimpleCorrectionConfirmation({ hasChanges: true }), {
    canConfirm: true,
    confirmed: true,
    confirmationToken: "ROOM_USER_CONFIRMED",
    message: "",
  });
});

test("basit düzeltmede değişiklik yoksa yeni kayıt oluşturulmaz", () => {
  assert.deepEqual(buildSimpleCorrectionConfirmation({ hasChanges: false }), {
    canConfirm: false,
    confirmed: false,
    confirmationToken: "",
    message: "Henüz bir değişiklik yapmadınız.",
  });
});

test("belgeli KDV tutarı formda taşınır ve düzeltme değişikliği olarak izlenir", () => {
  const form = formFromDraftItem({
    amountMinor: 125000,
    vatAmountMinor: 25000,
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "DEDUCTIBLE",
    vatEvidenceRef: "KDV-DEMO-20261025-001",
    vatClassificationReason: "Belge tutarı doğrulandı.",
  });

  assert.equal(form.vatAmountMajor, "250");
  assert.equal(correctionHasChanges({ ...form, vatAmountMajor: "275" }, form), true);
});

test("HGS gideri için araç tek başına sahiplik kanıtı değildir; sefer seçimi gerekir", () => {
  const result = validateRoomCostDraft({
    form: { categoryKey: "HGS_TOLL", occurrenceKind: "ONE_OFF" },
    payload: {
      categoryKey: "HGS_TOLL",
      amountMinor: 45000,
      currencyCode: "TRY",
      occurredAt: "2026-10-15T00:00:00.000Z",
      vehicleId: 3,
    },
    selectedDomain: "OPERATION",
    requiresShift: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.field, "shift");
  assert.match(result.message, /sefer/i);
});

test("taslak kaydı sefer ilişkisini formdan korur", () => {
  const form = formFromDraftItem({
    categoryKey: "HGS_TOLL",
    amountMinor: 45000,
    shiftId: 324,
  });

  assert.equal(form.shiftId, "324");
});

test("gider verisi yenilenirken mevcut düzeltme kaydının sahibi boşaltılmaz", () => {
  const focusedCorrection = formFromDraftItem({
    categoryKey: "FUEL",
    amountMinor: 850000,
    occurredAt: "2026-09-18T00:00:00.000Z",
    vehicleId: 1,
  });

  const loaded = mergeLoadedExpenseForm(focusedCorrection, {
    defaultCategoryKey: "FUEL",
    focusShiftId: null,
  });

  assert.equal(loaded.vehicleId, "1");
  assert.equal(loaded.occurredAt, "2026-09-18");
  assert.equal(loaded.amountMajor, "8500");
});

test("birden fazla uygun sefer varsa yalnız tek bir Türkçe seçim sorusu üretilir", async () => {
  const state = await import("./roomCostFormState.js");
  assert.equal(typeof state.buildExpenseContext, "function");
  const result = state.buildExpenseContext({
    categoryKey: "HGS_TOLL",
    candidates: [
      { id: 324, status: "DONE", startAt: "2026-10-15T07:00:00.000Z", endAt: "2026-10-15T09:00:00.000Z", vehicle: { plate: "34 ABC 123" } },
      { id: 325, status: "APPROVED", startAt: "2026-10-15T10:00:00.000Z", endAt: "2026-10-15T12:00:00.000Z", vehicle: { plate: "34 ABC 124" } },
    ],
  });

  assert.equal(result.shiftId, null);
  assert.equal(result.question, "Bu gider hangi sefere ait?");
  assert.equal(result.candidates.length, 2);
  assert.match(result.candidates[0].label, /34 ABC 123/);
});

test("gider türü sefer kapsamından çıkınca eski sefer bağlamı temizlenir", async () => {
  const state = await import("./roomCostFormState.js");
  assert.equal(typeof state.clearStaleExpenseContext, "function");
  assert.deepEqual(
    state.clearStaleExpenseContext({ shiftId: "324", agreementId: "185", vehicleId: "3" }, "FUEL"),
    { shiftId: "", agreementId: "", vehicleId: "3" },
  );
});

test("sabit araç giderleri basit formda dönemli kayıt olarak açılır", () => {
  assert.equal(formPatchForFocusedCategory("RENT", {}).occurrenceKind, "PERIODIC");
  assert.equal(formPatchForFocusedCategory("TRAFFIC_INSURANCE", {}).occurrenceKind, "PERIODIC");
  assert.equal(formPatchForFocusedCategory("CASCO", {}).occurrenceKind, "PERIODIC");
});

test("teklif kapsamı yalnız tahmini kayıt ve gerçek iş bağlantısıyla kabul edilir", () => {
  const missing = validateRoomCostDraft({
    form: { categoryKey: "MAINTENANCE", occurrenceKind: "ONE_OFF", recordKind: "ACTUAL" },
    payload: { categoryKey: "MAINTENANCE", amountMinor: 10000, currencyCode: "TRY", occurredAt: "2026-11-07T00:00:00.000Z", recordKind: "ACTUAL" },
    selectedDomain: "VEHICLE",
    scopeKind: "OFFER",
    focusOfferId: 16,
  });
  assert.equal(missing.ok, false);
  assert.match(missing.message, /tahmini maliyet/i);

  const ready = validateRoomCostDraft({
    form: { categoryKey: "MAINTENANCE", occurrenceKind: "ONE_OFF", recordKind: "FORECAST" },
    payload: { categoryKey: "MAINTENANCE", amountMinor: 10000, currencyCode: "TRY", occurredAt: "2026-11-07T00:00:00.000Z", recordKind: "FORECAST", shiftId: 21, vehicleId: 2 },
    selectedDomain: "VEHICLE",
    requiresShift: true,
    scopeKind: "OFFER",
    focusOfferId: 16,
  });
  assert.equal(ready.ok, true);
});

test("teklif tahmini kaydı kaynak referansından tekrar teklif kapsamı olarak açılır", () => {
  const form = formFromDraftItem({
    categoryKey: "MAINTENANCE",
    amountMinor: 10000,
    sourceRef: "ROOM-QUOTE-FORECAST-OFFER-16-MAINTENANCE",
    shiftId: 21,
    agreementId: 9,
  });
  assert.equal(form.scopeKind, "OFFER");
  assert.equal(form.agreementId, "9");
});

test("açık kapsam seçimi kategori varsayılanından bağımsız olarak doğru sahibi ister", () => {
  const driverScopedFuel = validateRoomCostDraft({
    form: { categoryKey: "FUEL", occurrenceKind: "ONE_OFF" },
    payload: { categoryKey: "FUEL", amountMinor: 10000, currencyCode: "TRY", occurredAt: "2026-11-07T00:00:00.000Z" },
    selectedDomain: "VEHICLE",
    scopeKind: "DRIVER",
  });
  assert.equal(driverScopedFuel.ok, false);
  assert.equal(driverScopedFuel.field, "scope");
  assert.match(driverScopedFuel.message, /sürücü/i);

  const companyScopedFuel = validateRoomCostDraft({
    form: { categoryKey: "FUEL", occurrenceKind: "ONE_OFF" },
    payload: { categoryKey: "FUEL", amountMinor: 10000, currencyCode: "TRY", occurredAt: "2026-11-07T00:00:00.000Z" },
    selectedDomain: "VEHICLE",
    scopeKind: "COMPANY",
  });
  assert.equal(companyScopedFuel.ok, true);
});
