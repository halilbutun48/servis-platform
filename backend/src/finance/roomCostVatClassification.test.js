import test from "node:test";
import assert from "node:assert/strict";

import { validateCostInput } from "./roomCostPolicy.js";

const baseInput = (overrides = {}) => ({
  categoryKey: "FUEL",
  amountMinor: 125000,
  currencyCode: "TRY",
  vatMode: "UNKNOWN",
  recordKind: "ACTUAL",
  occurrenceKind: "ONE_OFF",
  occurredAt: "2026-10-25",
  evidenceRef: "FIS-ACCOUNTING-001",
  sourceRef: "ROOM-COST-VAT-PART1-001",
  ...overrides,
});

test("KDV sınıflandırması verilmemiş eski kayıtlar UNKNOWN ve brüt görünür kalır", () => {
  const result = validateCostInput(baseInput({ vatMode: undefined }));

  assert.equal(result.ok, true);
  assert.equal(result.normalized.vatClassification, "UNKNOWN");
  assert.equal(result.normalized.netRollupEligible, false);
  assert.equal(result.normalized.grossVisible, true);
  assert.deepEqual(result.normalized.vatEvidenceRef, null);
});

test("doğrulanmış KDV sınıflandırması kanıt referansı ve gerekçe olmadan yükseltilemez", () => {
  const result = validateCostInput(baseInput({
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatEvidenceRef: "",
    vatClassificationReason: "",
  }));

  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes("VAT_CLASSIFICATION_EVIDENCE_REQUIRED"));
  assert.equal(result.normalized.netRollupEligible, false);
});

test("belgeli KDV sınıflandırması açık kanıt ve gerekçeyle net toplam için aday olabilir", () => {
  const result = validateCostInput(baseInput({
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatAmountMinor: 25000,
    vatDeductibility: "DEDUCTIBLE",
    vatEvidenceRef: "FATURA-2026-001",
    vatClassificationReason: "Belgede KDV satırı ve işlem türü doğrulandı.",
  }));

  assert.equal(result.ok, true);
  assert.equal(result.normalized.vatClassification, "DOCUMENTED_VAT");
  assert.equal(result.normalized.netRollupEligible, true);
  assert.equal(result.normalized.grossVisible, false);
});

test("belgeli KDV'nin indirilebilirlik kararı ayrı tutulur ve UNKNOWN varsayılanı korunur", () => {
  const deductible = validateCostInput(baseInput({
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "DEDUCTIBLE",
    vatEvidenceRef: "FATURA-2026-003",
    vatClassificationReason: "Belge ve indirilebilirlik dayanağı doğrulandı.",
  }));
  const unknown = validateCostInput(baseInput({
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatEvidenceRef: "FATURA-2026-004",
    vatClassificationReason: "Belge var, indirilebilirlik kararı bekliyor.",
  }));

  assert.equal(deductible.ok, true);
  assert.equal(deductible.normalized.vatDeductibility, "DEDUCTIBLE");
  assert.equal(unknown.ok, true);
  assert.equal(unknown.normalized.vatDeductibility, "UNKNOWN");
});

test("UNKNOWN ile kanıt referansı birlikte verilse bile doğrulanmış statüye dönüşmez", () => {
  const result = validateCostInput(baseInput({
    vatClassification: "UNKNOWN",
    vatEvidenceRef: "FATURA-2026-002",
    vatClassificationReason: "Belge bekleniyor.",
  }));

  assert.equal(result.ok, true);
  assert.equal(result.normalized.vatClassification, "UNKNOWN");
  assert.equal(result.normalized.netRollupEligible, false);
  assert.equal(result.normalized.grossVisible, true);
});

test("istisna, kapsam dışı ve doğrulanmış sıfır oranı da aynı kanıt kapısından geçer", () => {
  for (const vatClassification of ["OUT_OF_SCOPE", "DOCUMENTED_EXEMPT", "VERIFIED_ZERO_RATE"]) {
    const result = validateCostInput(baseInput({
      vatMode: vatClassification === "OUT_OF_SCOPE" || vatClassification === "DOCUMENTED_EXEMPT" ? "NOT_APPLICABLE" : "EXCLUDED",
      vatClassification,
      vatEvidenceRef: "MUHASEBE-DEGERLENDIRME-001",
      vatClassificationReason: "Yetkili muhasebe değerlendirmesi ve kaynak kaydı mevcut.",
    }));

    assert.equal(result.ok, true, vatClassification);
    assert.equal(result.normalized.vatClassification, vatClassification);
    assert.equal(result.normalized.netRollupEligible, true);
  }
});

test("belgeli KDV tutarı veya maliyet etkisi eksikse kayıt net toplama uygun sayılmaz", () => {
  const missingAmount = validateCostInput(baseInput({
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "DEDUCTIBLE",
    vatAmountMinor: null,
    vatEvidenceRef: "FATURA-2026-005",
    vatClassificationReason: "Belge mevcut; KDV tutarı henüz doğrulanmadı.",
  }));
  const missingDeductibility = validateCostInput(baseInput({
    vatMode: "INCLUDED",
    vatClassification: "DOCUMENTED_VAT",
    vatDeductibility: "UNKNOWN",
    vatAmountMinor: 25000,
    vatEvidenceRef: "FATURA-2026-006",
    vatClassificationReason: "Belgede KDV tutarı mevcut; maliyet etkisi kararı bekliyor.",
  }));

  assert.equal(missingAmount.ok, true);
  assert.equal(missingAmount.normalized.netRollupEligible, false);
  assert.equal(missingAmount.normalized.grossVisible, true);
  assert.equal(missingDeductibility.ok, true);
  assert.equal(missingDeductibility.normalized.netRollupEligible, false);
  assert.equal(missingDeductibility.normalized.grossVisible, true);
});
