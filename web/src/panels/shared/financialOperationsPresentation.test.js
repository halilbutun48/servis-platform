import test from "node:test";
import assert from "node:assert/strict";

import { budgetLifecycleFeedbackLabel, buildDecisionComponentKey, fuelCalculationStatusLabel, normalizeFinanceVisibleText } from "./financialOperationsPresentation.js";

test("yakıt senaryosu durumu kullanıcı dilinde açıkça gösterilir", () => {
  assert.equal(fuelCalculationStatusLabel("SCENARIO_INPUT_ESTIMATE"), "Senaryo fiyatıyla tahmin");
  assert.equal(fuelCalculationStatusLabel("AUTO_REFERENCE_ESTIMATE"), "Kaynaklı otomatik tahmin");
});

test("decision component keys remain unique for repeated category and amount rows", () => {
  const first = buildDecisionComponentKey({ label: "Diğer operasyon gideri", amountMinor: 5000 }, 0);
  const second = buildDecisionComponentKey({ label: "Diğer operasyon gideri", amountMinor: 5000 }, 1);
  assert.notEqual(first, second);
});

test("planlama notları teknik rota snapshot ekini kullanıcı dilinde temizler", () => {
  assert.equal(
    normalizeFinanceVisibleText("4 bağlı vardiyanın aynı rota snapshot'ı kalan planlı günler için kullanıldı."),
    "4 bağlı vardiyanın aynı rota kaydı kalan planlı günler için kullanıldı.",
  );
});

test("bütçe yaşam döngüsü geri bildirimi onay durumunu aktiflikten ayırır", () => {
  assert.equal(budgetLifecycleFeedbackLabel({ status: "DRAFT", budgetApprovalState: "submitted" }), "Gönderildi");
  assert.equal(budgetLifecycleFeedbackLabel({ status: "DRAFT", budgetApprovalState: "approved" }), "Onaylandı");
  assert.equal(budgetLifecycleFeedbackLabel({ status: "ACTIVE", budgetApprovalState: "approved" }), "Aktif");
});
