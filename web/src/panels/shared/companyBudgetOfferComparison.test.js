import test from "node:test";
import assert from "node:assert/strict";
import { buildOfferBudgetComparisonPresentation } from "./companyBudgetOfferComparisonPresentation.js";

test("COMPANY teklif karşılaştırması kullanıcı dilinde tutar, kapsam ve ekonomik ayrımı gösterir", () => {
  const presentation = buildOfferBudgetComparisonPresentation({
    comparison: {
      status: "scope_unproven",
      summaryText: "Teklif tutarı görülebiliyor; hizmet kapsamı tam dönemle eşleşmediği için kesin bütçe farkı hesaplanmadı.",
      candidates: [{
        offerId: 271,
        shiftId: 356,
        status: "ACCEPTED",
        providerName: "DemoRoom",
        amountMinor: 15000,
        periodStart: "2026-11-03",
        periodEnd: "2026-11-03",
        scopeStatus: "shift_only",
        possibleRemainingBudgetMinor: null,
        isCommitment: false,
        isActualSpend: false,
      }],
    },
    currencyCode: "TRY",
  });

  assert.equal(presentation.visible, true);
  assert.equal(presentation.title, "Teklif ve bütçe karşılaştırması");
  assert.equal(presentation.candidates[0].amountLabel, "150 ₺");
  assert.equal(presentation.candidates[0].statusLabel, "Kabul edilmiş teklif");
  assert.match(presentation.candidates[0].scopeLabel, /Tek vardiya/);
  assert.match(presentation.candidates[0].economicNote, /kesin sözleşme taahhüdü/);
  assert.equal(presentation.candidates[0].isCommitment, false);
  assert.equal(presentation.candidates[0].isActualSpend, false);
});

test("ROOM teklifi ve güvenli hizmet koşulları COMPANY ekranına taşınır", () => {
  const presentation = buildOfferBudgetComparisonPresentation({
    comparison: {
      status: "ready",
      summaryText: "Hazır.",
      candidates: [{
        offerId: 501,
        providerName: "Demo Room 21",
        status: "COUNTERED",
        amountMinor: 3_500_000,
        amountSourceLabel: "Taşımacılık firması teklifi",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        scopeStatus: "full_period",
        serviceConditions: { passengerCount: 40, stopCount: 2, distanceKm: 8.3, durationMinutes: 14 },
        possibleRemainingBudgetMinor: 1_500_000,
      }],
    },
    currencyCode: "TRY",
  });

  assert.equal(presentation.candidates[0].amountLabel, "Taşımacılık firması teklifi: 35.000 ₺");
  assert.match(presentation.candidates[0].serviceConditionsLabel, /40 kişi/);
  assert.match(presentation.candidates[0].serviceConditionsLabel, /8,3 km/);
});

test("kapsamı belirsiz teklif için olası bütçe farkı uydurulmaz", () => {
  const presentation = buildOfferBudgetComparisonPresentation({
    comparison: { status: "no_comparable_offer", summaryText: "Karşılaştırılamadı.", candidates: [] },
    currencyCode: "TRY",
  });

  assert.equal(presentation.visible, true);
  assert.match(presentation.summaryText, /Karşılaştırılamadı/);
  assert.deepEqual(presentation.candidates, []);
});
