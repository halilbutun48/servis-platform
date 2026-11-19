import test from "node:test";
import assert from "node:assert/strict";
import {
  financeUserFacingLabel,
  financeCostBasisLabel,
  financeComparisonStatusLabel,
  financeUserFacingText,
  financeUserFacingError,
  financeScenarioComponentStatusLabel,
} from "./financeUserFacingLabels.js";

test("teknik durumlar normal kullanıcı diline çevrilir", () => {
  assert.equal(financeUserFacingLabel("AVAILABLE"), "Mevcut");
  assert.equal(financeUserFacingLabel("NOT_REQUESTED"), "İstenmedi");
  assert.equal(financeUserFacingLabel("ACTUAL"), "Gerçekleşen");
  assert.equal(financeUserFacingLabel("PLAN"), "Planlama");
});

test("gider defteri kaynak kodu kullanıcıya ekonomik kanıt olarak sunulur", () => {
  assert.equal(financeCostBasisLabel("ROOM_COST_LEDGER_ACTUAL"), "Gerçekleşen gider defteri");
  assert.equal(financeCostBasisLabel("INTERNAL_DATA_PLANNING_ESTIMATE"), "İç veriye dayalı planlama tahmini");
  assert.equal(financeCostBasisLabel("DEMO_PLANNING_ASSUMPTION"), "DEMO planlama varsayımı");
});

test("karşılaştırma durumu teknik enum göstermeden anlaşılır kalır", () => {
  assert.equal(financeComparisonStatusLabel("NOT_REQUESTED"), "İstenmedi");
  assert.equal(financeComparisonStatusLabel("AVAILABLE"), "Mevcut");
});

test("finans alanları ve durumları kullanıcı diline çevrilir", () => {
  assert.equal(financeUserFacingText("estimatedAfterTaxNetProfitMinor"), "Vergi sonrası tahmini kâr");
  assert.equal(financeUserFacingText("NOT_PROVEN"), "Henüz doğrulanmadı");
  assert.equal(financeUserFacingText("vehicleId"), "Araç");
  assert.equal(financeUserFacingText("Sözleşme ID 184"), "Sözleşme No 184");
  assert.equal(financeUserFacingText("TOTP provider hazır değil"), "Ek güvenlik doğrulaması doğrulama hizmeti hazır değil");
  assert.equal(financeUserFacingText("canonical kaynak kaydı mevcut"), "doğrulanmış kaynak kaydı mevcut");
  assert.equal(financeUserFacingText("vehicleType totalDistanceKm routeDurationMinutes"), "Araç tipi Toplam mesafe Rota süresi");
});

test("teknik hata ve ham veri kullanıcıya sızmaz", () => {
  assert.equal(financeUserFacingError({ message: "ROOM_COST_FORBIDDEN" }), "Bu finans kaydını görme veya değiştirme yetkiniz yok.");
  assert.equal(financeUserFacingError({ message: '{"code":"ROOM_COST_FORBIDDEN"}' }, "İşlem tamamlanamadı."), "İşlem tamamlanamadı.");
});

test("kanıtsız maliyet bileşeni kullanıcıya sıfır TL diye gösterilmez", () => {
  assert.equal(financeScenarioComponentStatusLabel({ includedInBaseline: false, amountMinor: 0, status: "incomplete", missingFields: ["routeFeeMinor"] }), "Kanıt eksik");
  assert.equal(financeScenarioComponentStatusLabel({ includedInBaseline: false, amountMinor: 0, status: "excluded", missingFields: [] }), "Kapsam dışında");
  assert.equal(financeScenarioComponentStatusLabel({ includedInBaseline: true, amountMinor: 500 }), null);
});
